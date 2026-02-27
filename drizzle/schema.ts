import { decimal, index, int, mysqlEnum, mysqlTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/mysql-core";

// ── Users ──────────────────────────────────────────────────────────────
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  repCode: varchar("repCode", { length: 32 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ── Invoices (faturamento CSV) ─────────────────────────────────────────
export const invoices = mysqlTable("invoices", {
  id: int("id").autoincrement().primaryKey(),
  orderCode: varchar("orderCode", { length: 64 }).notNull(),
  orderItem: varchar("orderItem", { length: 32 }).notNull(),
  invoiceDate: timestamp("invoiceDate").notNull(),
  yearMonth: varchar("yearMonth", { length: 10 }),
  repCode: varchar("repCode", { length: 32 }).notNull(),
  repName: varchar("repName", { length: 256 }).notNull(),
  clientCodeSAP: varchar("clientCodeSAP", { length: 32 }),
  clientName: varchar("clientName", { length: 256 }).notNull(),
  salesChannel: varchar("salesChannel", { length: 128 }),
  productName: varchar("productName", { length: 256 }).notNull(),
  kgInvoiced: decimal("kgInvoiced", { precision: 14, scale: 2 }).notNull(),
  revenueNoTax: decimal("revenueNoTax", { precision: 14, scale: 2 }),
}, (table) => [
  index("idx_inv_order").on(table.orderCode, table.orderItem),
  index("idx_inv_rep").on(table.repCode),
  index("idx_inv_client").on(table.clientCodeSAP),
  index("idx_inv_date").on(table.invoiceDate),
  index("idx_inv_ym").on(table.yearMonth),
]);

export type Invoice = typeof invoices.$inferSelect;

// ── Rep Aliases ────────────────────────────────────────────────────────
export const repAliases = mysqlTable("rep_aliases", {
  id: int("id").autoincrement().primaryKey(),
  repCode: varchar("repCode", { length: 32 }).notNull().unique(),
  repName: varchar("repName", { length: 256 }).notNull(),
  alias: varchar("alias", { length: 128 }).notNull(),
  parentRepCode: varchar("parentRepCode", { length: 32 }),
  neCode: varchar("neCode", { length: 32 }),
});

export type RepAlias = typeof repAliases.$inferSelect;

// ── Client Actions (status overrides) ──────────────────────────────────
export const clientActions = mysqlTable("client_actions", {
  id: int("id").autoincrement().primaryKey(),
  clientCodeSAP: varchar("clientCodeSAP", { length: 32 }).notNull(),
  repCode: varchar("repCode", { length: 32 }).notNull(),
  userId: int("userId").notNull(),
  actionType: mysqlEnum("actionType", ["em_acao", "pedido_na_tela", "excluido", "reset"]).notNull(),
  note: text("note"),
  previousStatus: varchar("previousStatus", { length: 32 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [
  index("idx_ca_client").on(table.clientCodeSAP, table.repCode),
]);

export type ClientAction = typeof clientActions.$inferSelect;

// ── Sales Goals ────────────────────────────────────────────────────────
export const salesGoals = mysqlTable("sales_goals", {
  id: int("id").autoincrement().primaryKey(),
  repCode: varchar("repCode", { length: 32 }).notNull(),
  yearMonth: varchar("yearMonth", { length: 7 }).notNull(),
  goalKg: decimal("goalKg", { precision: 14, scale: 2 }).notNull(),
}, (table) => [
  uniqueIndex("uq_goal").on(table.repCode, table.yearMonth),
]);

export type SalesGoal = typeof salesGoals.$inferSelect;

// ── RC Invites ─────────────────────────────────────────────────────────
export const rcInvites = mysqlTable("rc_invites", {
  id: int("id").autoincrement().primaryKey(),
  repCode: varchar("repCode", { length: 32 }).notNull(),
  token: varchar("token", { length: 64 }).notNull().unique(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  usedAt: timestamp("usedAt"),
  usedByUserId: int("usedByUserId"),
}, (table) => [
  index("idx_invite_token").on(table.token),
  index("idx_invite_rep").on(table.repCode),
]);

export type RcInvite = typeof rcInvites.$inferSelect;
