import { COOKIE_NAME } from "@shared/const";
import { TRPCError } from "@trpc/server";
import crypto from "crypto";
import { z } from "zod";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { adminProcedure, protectedProcedure, publicProcedure, router } from "./_core/trpc";
import * as db from "./db";

// ── Helpers ────────────────────────────────────────────────────────────
function parseKg(value: string): number {
  if (!value || value.trim() === "" || value === "-") return 0;
  // Handle Brazilian format: 1.234,56 → 1234.56
  return parseFloat(value.replace(/\./g, "").replace(",", ".")) || 0;
}

function parseDate(value: string): Date | null {
  if (!value) return null;
  // Try multiple formats
  // DD/MM/YYYY
  const brMatch = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (brMatch) {
    return new Date(parseInt(brMatch[3]), parseInt(brMatch[2]) - 1, parseInt(brMatch[1]));
  }
  // YYYY-MM-DD
  const isoMatch = value.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (isoMatch) {
    return new Date(parseInt(isoMatch[1]), parseInt(isoMatch[2]) - 1, parseInt(isoMatch[3]));
  }
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

function formatYearMonth(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${y}.${m}`;
}

function calculateCycleStatus(daysSinceLastPurchase: number, avgCycleDays: number) {
  if (daysSinceLastPurchase >= 180) return "inativo";
  if (daysSinceLastPurchase >= 150) return "pre_inativacao";
  if (avgCycleDays > 0 && daysSinceLastPurchase >= avgCycleDays) return "alerta";
  if (avgCycleDays > 0 && daysSinceLastPurchase >= avgCycleDays * 0.8) return "em_ciclo";
  return "ativo";
}

// ── Router ─────────────────────────────────────────────────────────────
export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ── Upload CSV ─────────────────────────────────────────────────────
  upload: router({
    invoices: adminProcedure
      .input(
        z.object({
          rows: z.array(
            z.object({
              orderCode: z.string(),
              orderItem: z.string(),
              invoiceDate: z.string(),
              repCode: z.string(),
              repName: z.string(),
              clientCodeSAP: z.string().optional(),
              clientName: z.string(),
              salesChannel: z.string().optional(),
              productName: z.string(),
              kgInvoiced: z.string(),
              revenueNoTax: z.string().optional(),
            })
          ),
          columnMapping: z.record(z.string(), z.string()).optional(),
        })
      )
      .mutation(async ({ input }) => {
        const parsed = input.rows
          .map((row) => {
            const date = parseDate(row.invoiceDate);
            if (!date) return null;
            return {
              orderCode: row.orderCode.trim(),
              orderItem: row.orderItem.trim(),
              invoiceDate: date,
              yearMonth: formatYearMonth(date),
              repCode: row.repCode.trim(),
              repName: row.repName.trim(),
              clientCodeSAP: row.clientCodeSAP?.trim() || null,
              clientName: row.clientName.trim(),
              salesChannel: row.salesChannel?.trim() || null,
              productName: row.productName.trim(),
              kgInvoiced: String(parseKg(row.kgInvoiced)),
              revenueNoTax: row.revenueNoTax ? String(parseKg(row.revenueNoTax)) : null,
            };
          })
          .filter((x): x is NonNullable<typeof x> => x !== null);

        if (parsed.length === 0) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Nenhuma linha válida encontrada no CSV" });
        }

        // Deduplication: delete existing months then insert fresh
        const monthSet = new Set(parsed.map((r) => r.yearMonth));
        const months = Array.from(monthSet);
        await db.deleteInvoicesByMonths(months);
        await db.insertInvoices(parsed as any);

        return { inserted: parsed.length, months };
      }),
  }),

  // ── Dashboard ──────────────────────────────────────────────────────
  dashboard: router({
    metrics: protectedProcedure
      .input(z.object({ selectedRepCode: z.string().optional() }).optional())
      .query(async ({ ctx, input }) => {
        const repCode = await db.getUserRepCode(ctx.user);
        const effectiveRepCode = repCode || input?.selectedRepCode;
        return db.getDashboardMetrics(effectiveRepCode);
      }),

    monthlyEvolution: protectedProcedure
      .input(z.object({ selectedRepCode: z.string().optional(), months: z.number().optional() }).optional())
      .query(async ({ ctx, input }) => {
        const repCode = await db.getUserRepCode(ctx.user);
        const effectiveRepCode = repCode || input?.selectedRepCode;
        return db.getMonthlyEvolution(effectiveRepCode, input?.months || 12);
      }),

    rcRanking: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      return db.getRcRanking();
    }),
  }),

  // ── Clients ────────────────────────────────────────────────────────
  clients: router({
    list: protectedProcedure
      .input(z.object({ selectedRepCode: z.string().optional() }).optional())
      .query(async ({ ctx, input }) => {
        const repCode = await db.getUserRepCode(ctx.user);
        const effectiveRepCode = repCode || input?.selectedRepCode;
        const clients = await db.getClientsList(effectiveRepCode);
        const actions = await db.getAllLatestClientActions(effectiveRepCode);

        const actionMap = new Map(actions.map((a) => [`${a.clientCodeSAP}__${a.repCode}`, a]));

        const now = new Date();
        return clients.map((c) => {
          const key = `${c.clientCodeSAP}__${c.repCode}`;
          const action = actionMap.get(key);
          const lastPurchaseDate = c.lastPurchase ? new Date(c.lastPurchase) : null;
          const firstPurchaseDate = c.firstPurchase ? new Date(c.firstPurchase) : null;
          const daysSinceLastPurchase = lastPurchaseDate
            ? Math.floor((now.getTime() - lastPurchaseDate.getTime()) / (1000 * 60 * 60 * 24))
            : 999;

          // Calculate average cycle
          const orderCount = parseInt(String(c.orderCount)) || 1;
          let avgCycleDays = 0;
          if (firstPurchaseDate && lastPurchaseDate && orderCount > 1) {
            const totalDays = Math.floor(
              (lastPurchaseDate.getTime() - firstPurchaseDate.getTime()) / (1000 * 60 * 60 * 24)
            );
            avgCycleDays = Math.max(30, Math.floor(totalDays / (orderCount - 1)));
          }

          let cycleStatus = calculateCycleStatus(daysSinceLastPurchase, avgCycleDays);

          // Apply manual action override
          let manualStatus: string | null = null;
          let actionNote: string | null = null;
          if (action && action.actionType !== "reset") {
            manualStatus = action.actionType;
            actionNote = action.note;
          }

          return {
            ...c,
            totalKg: parseFloat(String(c.totalKg)) || 0,
            totalRevenue: parseFloat(String(c.totalRevenue)) || 0,
            orderCount: parseInt(String(c.orderCount)) || 0,
            daysSinceLastPurchase,
            avgCycleDays,
            cycleStatus,
            manualStatus,
            actionNote,
            effectiveStatus: manualStatus || cycleStatus,
          };
        });
      }),

    orders: protectedProcedure
      .input(z.object({ clientCodeSAP: z.string(), repCode: z.string().optional() }))
      .query(async ({ ctx, input }) => {
        const userRepCode = await db.getUserRepCode(ctx.user);
        return db.getClientOrders(input.clientCodeSAP, userRepCode || input.repCode);
      }),

    orderProducts: protectedProcedure
      .input(z.object({ orderCode: z.string() }))
      .query(async ({ input }) => {
        return db.getClientOrderProducts(input.orderCode);
      }),

    setAction: protectedProcedure
      .input(
        z.object({
          clientCodeSAP: z.string(),
          repCode: z.string(),
          actionType: z.enum(["em_acao", "pedido_na_tela", "excluido", "reset"]),
          note: z.string().optional(),
          previousStatus: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await db.insertClientAction({
          clientCodeSAP: input.clientCodeSAP,
          repCode: input.repCode,
          userId: ctx.user.id,
          actionType: input.actionType,
          note: input.note || null,
          previousStatus: input.previousStatus || null,
        });
        return { success: true };
      }),
  }),

  // ── History ────────────────────────────────────────────────────────
  history: router({
    evolution: protectedProcedure
      .input(z.object({ selectedRepCode: z.string().optional(), months: z.number().optional() }).optional())
      .query(async ({ ctx, input }) => {
        const repCode = await db.getUserRepCode(ctx.user);
        const effectiveRepCode = repCode || input?.selectedRepCode;
        return db.getMonthlyEvolution(effectiveRepCode, input?.months || 12);
      }),

    topClients: protectedProcedure
      .input(z.object({ selectedRepCode: z.string().optional() }).optional())
      .query(async ({ ctx, input }) => {
        const repCode = await db.getUserRepCode(ctx.user);
        const effectiveRepCode = repCode || input?.selectedRepCode;
        return db.getTopClients(effectiveRepCode);
      }),

    topProducts: protectedProcedure
      .input(z.object({ selectedRepCode: z.string().optional() }).optional())
      .query(async ({ ctx, input }) => {
        const repCode = await db.getUserRepCode(ctx.user);
        const effectiveRepCode = repCode || input?.selectedRepCode;
        return db.getTopProducts(effectiveRepCode);
      }),

    rcRanking: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      return db.getRcRanking();
    }),
  }),

  // ── Acceleration ───────────────────────────────────────────────────
  acceleration: router({
    data: protectedProcedure
      .input(
        z.object({
          selectedRepCode: z.string().optional(),
          startYearMonth: z.string().optional(),
          endYearMonth: z.string().optional(),
        }).optional()
      )
      .query(async ({ ctx, input }) => {
        const repCode = await db.getUserRepCode(ctx.user);
        const effectiveRepCode = repCode || input?.selectedRepCode;
        return db.getAccelerationData(effectiveRepCode, input?.startYearMonth, input?.endYearMonth);
      }),
  }),

  // ── Products ───────────────────────────────────────────────────────
  products: router({
    list: protectedProcedure
      .input(z.object({ selectedRepCode: z.string().optional() }).optional())
      .query(async ({ ctx, input }) => {
        const repCode = await db.getUserRepCode(ctx.user);
        const effectiveRepCode = repCode || input?.selectedRepCode;
        return db.getTopProducts(effectiveRepCode, 100);
      }),

    evolution: protectedProcedure
      .input(z.object({ productName: z.string(), selectedRepCode: z.string().optional() }))
      .query(async ({ ctx, input }) => {
        const repCode = await db.getUserRepCode(ctx.user);
        const effectiveRepCode = repCode || input.selectedRepCode;
        return db.getProductEvolution(input.productName, effectiveRepCode);
      }),

    clients: protectedProcedure
      .input(z.object({ productName: z.string(), selectedRepCode: z.string().optional() }))
      .query(async ({ ctx, input }) => {
        const repCode = await db.getUserRepCode(ctx.user);
        const effectiveRepCode = repCode || input.selectedRepCode;
        return db.getProductClients(input.productName, effectiveRepCode);
      }),
  }),

  // ── Rep Aliases ────────────────────────────────────────────────────
  repAliases: router({
    list: protectedProcedure.query(async () => {
      return db.getAllRepAliases();
    }),

    upsert: adminProcedure
      .input(
        z.object({
          repCode: z.string(),
          repName: z.string(),
          alias: z.string(),
          parentRepCode: z.string().optional(),
          neCode: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        await db.upsertRepAlias({
          repCode: input.repCode,
          repName: input.repName,
          alias: input.alias,
          parentRepCode: input.parentRepCode || null,
          neCode: input.neCode || null,
        });
        return { success: true };
      }),

    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteRepAlias(input.id);
        return { success: true };
      }),
  }),

  // ── Sales Goals ────────────────────────────────────────────────────
  salesGoals: router({
    list: protectedProcedure
      .input(z.object({ yearMonth: z.string().optional() }).optional())
      .query(async ({ input }) => {
        return db.getAllSalesGoals(input?.yearMonth);
      }),

    upsert: adminProcedure
      .input(
        z.object({
          repCode: z.string(),
          yearMonth: z.string(),
          goalKg: z.string(),
        })
      )
      .mutation(async ({ input }) => {
        await db.upsertSalesGoal({
          repCode: input.repCode,
          yearMonth: input.yearMonth,
          goalKg: input.goalKg,
        });
        return { success: true };
      }),
  }),

  // ── Invites ────────────────────────────────────────────────────────
  invites: router({
    generate: adminProcedure
      .input(z.object({ repCode: z.string() }))
      .mutation(async ({ input }) => {
        const token = crypto.randomUUID().replace(/-/g, "");
        await db.createInvite(input.repCode, token);
        return { token };
      }),

    getByToken: publicProcedure
      .input(z.object({ token: z.string() }))
      .query(async ({ input }) => {
        const invite = await db.getInviteByToken(input.token);
        if (!invite) return null;
        const aliases = await db.getAllRepAliases();
        const alias = aliases.find((a) => a.repCode === invite.repCode);
        return {
          ...invite,
          alias: alias?.alias || invite.repCode,
          used: !!invite.usedAt,
          isGestor: invite.repCode === "__GESTOR__",
        };
      }),

    accept: protectedProcedure
      .input(z.object({ token: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const invite = await db.getInviteByToken(input.token);
        if (!invite) throw new TRPCError({ code: "NOT_FOUND", message: "Convite não encontrado" });
        if (invite.usedAt) throw new TRPCError({ code: "CONFLICT", message: "Convite já utilizado" });

        const isGestor = invite.repCode === "__GESTOR__";
        await db.updateUserRepCode(
          ctx.user.id,
          isGestor ? null : invite.repCode,
          isGestor ? "admin" : "user"
        );
        await db.acceptInvite(invite.id, ctx.user.id);
        return { repCode: invite.repCode, isGestor };
      }),

    list: adminProcedure.query(async () => {
      return db.getAllInvites();
    }),
  }),

  // ── Distinct Rep Codes ─────────────────────────────────────────────
  repCodes: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") return [];
      return db.getDistinctRepCodes();
    }),
  }),
});

export type AppRouter = typeof appRouter;
