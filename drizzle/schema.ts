import { int, json, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extended with Digital Grimoire fields for the initiatic system.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),

  // Digital Grimoire fields
  magicName: varchar("magicName", { length: 128 }),
  levelRank: int("levelRank").default(0).notNull(),
  xpTotal: int("xpTotal").default(0).notNull(),
  stasisStreak: int("stasisStreak").default(0).notNull(),
  natalData: json("natalData"),
  activeRuneId: varchar("activeRuneId", { length: 128 }),
});

/**
 * Leaderboard cache for optimized read-heavy access on the "Path" screen.
 */
export const leaderboardCache = mysqlTable("leaderboard_cache", {
  id: int("id").autoincrement().primaryKey(),
  rank: int("rank").notNull(),
  magicName: varchar("magicName", { length: 128 }).notNull(),
  xpTotal: int("xpTotal").default(0).notNull(),
  levelRank: int("levelRank").default(0).notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/**
 * User analytics table — "The Mirror of the Soul"
 * Tracks elemental XP, stasis minutes, ritual count, and daily activity for heatmap.
 */
export const userAnalytics = mysqlTable("user_analytics", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  elementEarthXp: int("elementEarthXp").default(0).notNull(),
  elementAirXp: int("elementAirXp").default(0).notNull(),
  elementFireXp: int("elementFireXp").default(0).notNull(),
  elementWaterXp: int("elementWaterXp").default(0).notNull(),
  elementSpiritXp: int("elementSpiritXp").default(0).notNull(),
  totalStasisMinutes: int("totalStasisMinutes").default(0).notNull(),
  ritualsPerformedCount: int("ritualsPerformedCount").default(0).notNull(),
  /** Format: {"2026-02-15": 50} — stores daily XP for the heatmap */
  last365DaysActivity: json("last365DaysActivity"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type LeaderboardEntry = typeof leaderboardCache.$inferSelect;
export type InsertLeaderboardEntry = typeof leaderboardCache.$inferInsert;
export type UserAnalyticsRow = typeof userAnalytics.$inferSelect;
export type InsertUserAnalytics = typeof userAnalytics.$inferInsert;
