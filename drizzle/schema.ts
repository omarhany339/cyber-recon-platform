import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, json } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Scans table - stores information about each security scan
 */
export const scans = mysqlTable("scans", {
  id: varchar("id", { length: 36 }).primaryKey(),
  userId: int("userId").notNull(),
  target: varchar("target", { length: 255 }).notNull(),
  status: mysqlEnum("status", ["queued", "running", "completed", "failed"]).default("queued").notNull(),
  progress: int("progress").default(0).notNull(),
  totalSteps: int("totalSteps").default(4).notNull(),
  currentStep: varchar("currentStep", { length: 100 }),
  resultsPath: text("resultsPath"),
  reportPath: text("reportPath"),
  errorMessage: text("errorMessage"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  completedAt: timestamp("completedAt"),
});

export type Scan = typeof scans.$inferSelect;
export type InsertScan = typeof scans.$inferInsert;

/**
 * Scan results table - stores detailed findings from each scan
 */
export const scanResults = mysqlTable("scan_results", {
  id: varchar("id", { length: 36 }).primaryKey(),
  scanId: varchar("scanId", { length: 36 }).notNull(),
  toolName: varchar("toolName", { length: 100 }).notNull(),
  resultType: varchar("resultType", { length: 50 }).notNull(), // 'subdomain', 'host', 'url', 'finding'
  data: json("data").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ScanResult = typeof scanResults.$inferSelect;
export type InsertScanResult = typeof scanResults.$inferInsert;

/**
 * Scan findings table - stores processed and analyzed findings
 */
export const scanFindings = mysqlTable("scan_findings", {
  id: varchar("id", { length: 36 }).primaryKey(),
  scanId: varchar("scanId", { length: 36 }).notNull(),
  findingType: varchar("findingType", { length: 50 }).notNull(), // 'subdomain', 'ip', 'port', 'service', 'vulnerability'
  value: varchar("value", { length: 500 }).notNull(),
  severity: mysqlEnum("severity", ["info", "low", "medium", "high", "critical"]).default("info"),
  metadata: json("metadata"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ScanFinding = typeof scanFindings.$inferSelect;
export type InsertScanFinding = typeof scanFindings.$inferInsert;
