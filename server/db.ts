import { and, desc, eq, gte, inArray, lte, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  clientActions,
  invoices,
  rcInvites,
  repAliases,
  salesGoals,
  users,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ── User helpers ───────────────────────────────────────────────────────
export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};

  const textFields = ["name", "email", "loginMethod"] as const;
  type TextField = (typeof textFields)[number];
  const assignNullable = (field: TextField) => {
    const value = user[field];
    if (value === undefined) return;
    const normalized = value ?? null;
    values[field] = normalized;
    updateSet[field] = normalized;
  };
  textFields.forEach(assignNullable);

  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }
  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0)
    updateSet.lastSignedIn = new Date();

  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ── Rep Code resolution ────────────────────────────────────────────────
export async function resolveParentRepCode(repCode: string): Promise<string> {
  const db = await getDb();
  if (!db) return repCode;
  const alias = await db
    .select()
    .from(repAliases)
    .where(eq(repAliases.repCode, repCode))
    .limit(1);
  if (alias[0]?.parentRepCode) return alias[0].parentRepCode;
  return repCode;
}

export async function getUserRepCode(user: { role: string; repCode: string | null }): Promise<string | undefined> {
  if (user.role === "admin") return undefined;
  const raw = user.repCode || "__UNLINKED__";
  if (raw === "__UNLINKED__") return raw;
  return resolveParentRepCode(raw);
}

// ── Invoice helpers ────────────────────────────────────────────────────
export async function insertInvoices(rows: Array<typeof invoices.$inferInsert>) {
  const db = await getDb();
  if (!db || rows.length === 0) return;
  for (let i = 0; i < rows.length; i += 500) {
    await db.insert(invoices).values(rows.slice(i, i + 500));
  }
}

export async function deleteInvoicesByMonths(months: string[]) {
  const db = await getDb();
  if (!db || months.length === 0) return;
  await db.delete(invoices).where(inArray(invoices.yearMonth, months));
}

export async function getDashboardMetrics(repCode?: string) {
  const db = await getDb();
  if (!db) return null;

  const conditions = repCode ? [eq(invoices.repCode, repCode)] : [];

  const [totals] = await db
    .select({
      totalKg: sql<string>`COALESCE(SUM(${invoices.kgInvoiced}), 0)`,
      totalRevenue: sql<string>`COALESCE(SUM(${invoices.revenueNoTax}), 0)`,
      totalOrders: sql<string>`COUNT(DISTINCT ${invoices.orderCode})`,
      totalClients: sql<string>`COUNT(DISTINCT ${invoices.clientCodeSAP})`,
    })
    .from(invoices)
    .where(conditions.length ? and(...conditions) : undefined);

  return totals;
}

export async function getMonthlyEvolution(repCode?: string, months = 12) {
  const db = await getDb();
  if (!db) return [];

  const conditions = repCode ? [eq(invoices.repCode, repCode)] : [];

  const rows = await db
    .select({
      yearMonth: invoices.yearMonth,
      totalKg: sql<string>`COALESCE(SUM(${invoices.kgInvoiced}), 0)`,
      totalRevenue: sql<string>`COALESCE(SUM(${invoices.revenueNoTax}), 0)`,
      clientCount: sql<string>`COUNT(DISTINCT ${invoices.clientCodeSAP})`,
    })
    .from(invoices)
    .where(conditions.length ? and(...conditions) : undefined)
    .groupBy(invoices.yearMonth)
    .orderBy(desc(invoices.yearMonth))
    .limit(months);

  return rows.reverse();
}

export async function getClientsList(repCode?: string) {
  const db = await getDb();
  if (!db) return [];

  const conditions = repCode ? [eq(invoices.repCode, repCode)] : [];

  const rows = await db
    .select({
      clientCodeSAP: invoices.clientCodeSAP,
      clientName: invoices.clientName,
      repCode: invoices.repCode,
      repName: invoices.repName,
      totalKg: sql<string>`SUM(${invoices.kgInvoiced})`,
      totalRevenue: sql<string>`SUM(${invoices.revenueNoTax})`,
      orderCount: sql<string>`COUNT(DISTINCT ${invoices.orderCode})`,
      lastPurchase: sql<string>`MAX(${invoices.invoiceDate})`,
      firstPurchase: sql<string>`MIN(${invoices.invoiceDate})`,
    })
    .from(invoices)
    .where(conditions.length ? and(...conditions) : undefined)
    .groupBy(invoices.clientCodeSAP, invoices.clientName, invoices.repCode, invoices.repName);

  return rows;
}

export async function getClientOrders(clientCodeSAP: string, repCode?: string) {
  const db = await getDb();
  if (!db) return [];

  const conditions = [eq(invoices.clientCodeSAP, clientCodeSAP)];
  if (repCode) conditions.push(eq(invoices.repCode, repCode));

  const rows = await db
    .select({
      orderCode: invoices.orderCode,
      invoiceDate: invoices.invoiceDate,
      totalKg: sql<string>`SUM(${invoices.kgInvoiced})`,
      totalRevenue: sql<string>`SUM(${invoices.revenueNoTax})`,
    })
    .from(invoices)
    .where(and(...conditions))
    .groupBy(invoices.orderCode, invoices.invoiceDate)
    .orderBy(desc(invoices.invoiceDate))
    .limit(10);

  return rows;
}

export async function getClientOrderProducts(orderCode: string) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select({
      productName: invoices.productName,
      kgInvoiced: invoices.kgInvoiced,
      revenueNoTax: invoices.revenueNoTax,
    })
    .from(invoices)
    .where(eq(invoices.orderCode, orderCode));
}

export async function getClientPurchaseDates(clientCodeSAP: string, repCode?: string) {
  const db = await getDb();
  if (!db) return [];

  const conditions = [eq(invoices.clientCodeSAP, clientCodeSAP)];
  if (repCode) conditions.push(eq(invoices.repCode, repCode));

  const rows = await db
    .select({
      orderCode: invoices.orderCode,
      invoiceDate: sql<string>`MIN(${invoices.invoiceDate})`,
    })
    .from(invoices)
    .where(and(...conditions))
    .groupBy(invoices.orderCode)
    .orderBy(sql`MIN(${invoices.invoiceDate})`);

  return rows;
}

// ── Client Actions ─────────────────────────────────────────────────────
export async function getLatestClientAction(clientCodeSAP: string, repCode: string) {
  const db = await getDb();
  if (!db) return null;

  const rows = await db
    .select()
    .from(clientActions)
    .where(and(eq(clientActions.clientCodeSAP, clientCodeSAP), eq(clientActions.repCode, repCode)))
    .orderBy(desc(clientActions.createdAt))
    .limit(1);

  return rows[0] || null;
}

export async function getAllLatestClientActions(repCode?: string) {
  const db = await getDb();
  if (!db) return [];

  const conditions = repCode ? [eq(clientActions.repCode, repCode)] : [];

  const subquery = db
    .select({
      maxId: sql<number>`MAX(${clientActions.id})`.as("maxId"),
    })
    .from(clientActions)
    .where(conditions.length ? and(...conditions) : undefined)
    .groupBy(clientActions.clientCodeSAP, clientActions.repCode)
    .as("latest");

  const rows = await db
    .select()
    .from(clientActions)
    .innerJoin(subquery, eq(clientActions.id, subquery.maxId));

  return rows.map((r) => r.client_actions);
}

export async function insertClientAction(action: typeof clientActions.$inferInsert) {
  const db = await getDb();
  if (!db) return;
  await db.insert(clientActions).values(action);
}

// ── History / Products ─────────────────────────────────────────────────
export async function getTopClients(repCode?: string, limit = 10) {
  const db = await getDb();
  if (!db) return [];

  const conditions = repCode ? [eq(invoices.repCode, repCode)] : [];

  return db
    .select({
      clientCodeSAP: invoices.clientCodeSAP,
      clientName: invoices.clientName,
      totalKg: sql<string>`SUM(${invoices.kgInvoiced})`,
      totalRevenue: sql<string>`SUM(${invoices.revenueNoTax})`,
    })
    .from(invoices)
    .where(conditions.length ? and(...conditions) : undefined)
    .groupBy(invoices.clientCodeSAP, invoices.clientName)
    .orderBy(sql`SUM(${invoices.kgInvoiced}) DESC`)
    .limit(limit);
}

export async function getTopProducts(repCode?: string, limit = 10) {
  const db = await getDb();
  if (!db) return [];

  const conditions = repCode ? [eq(invoices.repCode, repCode)] : [];

  return db
    .select({
      productName: invoices.productName,
      totalKg: sql<string>`SUM(${invoices.kgInvoiced})`,
      totalRevenue: sql<string>`SUM(${invoices.revenueNoTax})`,
      clientCount: sql<string>`COUNT(DISTINCT ${invoices.clientCodeSAP})`,
    })
    .from(invoices)
    .where(conditions.length ? and(...conditions) : undefined)
    .groupBy(invoices.productName)
    .orderBy(sql`SUM(${invoices.kgInvoiced}) DESC`)
    .limit(limit);
}

export async function getProductEvolution(productName: string, repCode?: string) {
  const db = await getDb();
  if (!db) return [];

  const conditions = [eq(invoices.productName, productName)];
  if (repCode) conditions.push(eq(invoices.repCode, repCode));

  return db
    .select({
      yearMonth: invoices.yearMonth,
      totalKg: sql<string>`SUM(${invoices.kgInvoiced})`,
      totalRevenue: sql<string>`SUM(${invoices.revenueNoTax})`,
    })
    .from(invoices)
    .where(and(...conditions))
    .groupBy(invoices.yearMonth)
    .orderBy(invoices.yearMonth);
}

export async function getProductClients(productName: string, repCode?: string) {
  const db = await getDb();
  if (!db) return [];

  const conditions = [eq(invoices.productName, productName)];
  if (repCode) conditions.push(eq(invoices.repCode, repCode));

  return db
    .select({
      clientCodeSAP: invoices.clientCodeSAP,
      clientName: invoices.clientName,
      totalKg: sql<string>`SUM(${invoices.kgInvoiced})`,
      totalRevenue: sql<string>`SUM(${invoices.revenueNoTax})`,
    })
    .from(invoices)
    .where(and(...conditions))
    .groupBy(invoices.clientCodeSAP, invoices.clientName)
    .orderBy(sql`SUM(${invoices.kgInvoiced}) DESC`);
}

// ── RC ranking ─────────────────────────────────────────────────────────
export async function getRcRanking() {
  const db = await getDb();
  if (!db) return [];

  return db
    .select({
      repCode: invoices.repCode,
      repName: invoices.repName,
      totalKg: sql<string>`SUM(${invoices.kgInvoiced})`,
      totalRevenue: sql<string>`SUM(${invoices.revenueNoTax})`,
      clientCount: sql<string>`COUNT(DISTINCT ${invoices.clientCodeSAP})`,
    })
    .from(invoices)
    .groupBy(invoices.repCode, invoices.repName)
    .orderBy(sql`SUM(${invoices.kgInvoiced}) DESC`);
}

// ── Rep Aliases ────────────────────────────────────────────────────────
export async function getAllRepAliases() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(repAliases);
}

export async function upsertRepAlias(data: typeof repAliases.$inferInsert) {
  const db = await getDb();
  if (!db) return;
  await db
    .insert(repAliases)
    .values(data)
    .onDuplicateKeyUpdate({
      set: {
        repName: data.repName,
        alias: data.alias,
        parentRepCode: data.parentRepCode,
        neCode: data.neCode,
      },
    });
}

export async function deleteRepAlias(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(repAliases).where(eq(repAliases.id, id));
}

// ── Sales Goals ────────────────────────────────────────────────────────
export async function getAllSalesGoals(yearMonth?: string) {
  const db = await getDb();
  if (!db) return [];
  const conditions = yearMonth ? [eq(salesGoals.yearMonth, yearMonth)] : [];
  return db
    .select()
    .from(salesGoals)
    .where(conditions.length ? and(...conditions) : undefined);
}

export async function upsertSalesGoal(data: typeof salesGoals.$inferInsert) {
  const db = await getDb();
  if (!db) return;
  await db
    .insert(salesGoals)
    .values(data)
    .onDuplicateKeyUpdate({ set: { goalKg: data.goalKg } });
}

// ── RC Invites ─────────────────────────────────────────────────────────
export async function createInvite(repCode: string, token: string) {
  const db = await getDb();
  if (!db) return;
  await db.insert(rcInvites).values({ repCode, token });
}

export async function getInviteByToken(token: string) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(rcInvites).where(eq(rcInvites.token, token)).limit(1);
  return rows[0] || null;
}

export async function acceptInvite(inviteId: number, userId: number) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(rcInvites)
    .set({ usedAt: new Date(), usedByUserId: userId })
    .where(eq(rcInvites.id, inviteId));
}

export async function updateUserRepCode(userId: number, repCode: string | null, role?: "admin" | "user") {
  const db = await getDb();
  if (!db) return;
  const set: Record<string, unknown> = { repCode };
  if (role) set.role = role;
  await db.update(users).set(set).where(eq(users.id, userId));
}

export async function getAllInvites() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(rcInvites).orderBy(desc(rcInvites.createdAt));
}

// ── Distinct rep codes from invoices ───────────────────────────────────
export async function getDistinctRepCodes() {
  const db = await getDb();
  if (!db) return [];
  return db
    .selectDistinct({ repCode: invoices.repCode, repName: invoices.repName })
    .from(invoices)
    .orderBy(invoices.repName);
}

// ── Acceleration: clients at risk ──────────────────────────────────────
export async function getAccelerationData(repCode?: string, startYearMonth?: string, endYearMonth?: string) {
  const db = await getDb();
  if (!db) return [];

  const conditions: any[] = [];
  if (repCode) conditions.push(eq(invoices.repCode, repCode));
  if (startYearMonth) conditions.push(gte(invoices.yearMonth, startYearMonth));
  if (endYearMonth) conditions.push(lte(invoices.yearMonth, endYearMonth));

  return db
    .select({
      clientCodeSAP: invoices.clientCodeSAP,
      clientName: invoices.clientName,
      repCode: invoices.repCode,
      repName: invoices.repName,
      yearMonth: invoices.yearMonth,
      totalKg: sql<string>`SUM(${invoices.kgInvoiced})`,
      totalRevenue: sql<string>`SUM(${invoices.revenueNoTax})`,
    })
    .from(invoices)
    .where(conditions.length ? and(...conditions) : undefined)
    .groupBy(
      invoices.clientCodeSAP,
      invoices.clientName,
      invoices.repCode,
      invoices.repName,
      invoices.yearMonth
    )
    .orderBy(invoices.yearMonth);
}
