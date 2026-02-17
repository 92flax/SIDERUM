import { eq, desc, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser, users,
  leaderboardCache, InsertLeaderboardEntry,
  userAnalytics, InsertUserAnalytics,
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

// ============================================================
// USER OPERATIONS
// ============================================================

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
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

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ============================================================
// MAGIC NAME & XP
// ============================================================

export async function updateMagicName(userId: number, magicName: string): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  try {
    await db.update(users).set({ magicName }).where(eq(users.id, userId));
    return true;
  } catch {
    return false;
  }
}

export async function addXp(userId: number, amount: number): Promise<{ xpTotal: number; levelRank: number }> {
  const db = await getDb();
  if (!db) return { xpTotal: 0, levelRank: 0 };

  await db.update(users).set({
    xpTotal: sql`${users.xpTotal} + ${amount}`,
  }).where(eq(users.id, userId));

  // Recalculate level
  const [user] = await db.select({ xpTotal: users.xpTotal }).from(users).where(eq(users.id, userId)).limit(1);
  const xpTotal = user?.xpTotal ?? 0;
  const levelRank = calculateLevel(xpTotal);

  await db.update(users).set({ levelRank }).where(eq(users.id, userId));
  return { xpTotal, levelRank };
}

/** 10-level initiatic system: each level requires progressively more XP */
export function calculateLevel(xpTotal: number): number {
  const thresholds = [0, 100, 300, 600, 1000, 1600, 2400, 3500, 5000, 7000, 10000];
  for (let i = thresholds.length - 1; i >= 0; i--) {
    if (xpTotal >= thresholds[i]) return i;
  }
  return 0;
}

export async function updateActiveRune(userId: number, runeId: string | null): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ activeRuneId: runeId }).where(eq(users.id, userId));
}

export async function updateNatalData(userId: number, natalData: object): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ natalData }).where(eq(users.id, userId));
}

// ============================================================
// LEADERBOARD
// ============================================================

export async function getLeaderboard(limit: number = 50) {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(leaderboardCache)
    .orderBy(leaderboardCache.rank)
    .limit(limit);
}

export async function refreshLeaderboard(): Promise<void> {
  const db = await getDb();
  if (!db) return;

  // Clear and rebuild from users table
  await db.delete(leaderboardCache);

  const topUsers = await db.select({
    magicName: users.magicName,
    xpTotal: users.xpTotal,
    levelRank: users.levelRank,
  })
    .from(users)
    .orderBy(desc(users.xpTotal))
    .limit(50);

  for (let i = 0; i < topUsers.length; i++) {
    const u = topUsers[i];
    if (!u.magicName) continue;
    await db.insert(leaderboardCache).values({
      rank: i + 1,
      magicName: u.magicName,
      xpTotal: u.xpTotal,
      levelRank: u.levelRank,
    });
  }
}

// ============================================================
// USER ANALYTICS
// ============================================================

export async function getOrCreateAnalytics(userId: number) {
  const db = await getDb();
  if (!db) return null;

  const existing = await db.select().from(userAnalytics).where(eq(userAnalytics.userId, userId)).limit(1);
  if (existing.length > 0) return existing[0];

  await db.insert(userAnalytics).values({ userId, last365DaysActivity: {} });
  const created = await db.select().from(userAnalytics).where(eq(userAnalytics.userId, userId)).limit(1);
  return created[0] ?? null;
}

export async function incrementElementXp(
  userId: number,
  element: 'earth' | 'air' | 'fire' | 'water' | 'spirit',
  amount: number,
): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const columnMap = {
    earth: userAnalytics.elementEarthXp,
    air: userAnalytics.elementAirXp,
    fire: userAnalytics.elementFireXp,
    water: userAnalytics.elementWaterXp,
    spirit: userAnalytics.elementSpiritXp,
  };

  const col = columnMap[element];
  await db.update(userAnalytics).set({
    [col.name]: sql`${col} + ${amount}`,
  }).where(eq(userAnalytics.userId, userId));
}

export async function incrementRitualCount(userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db.update(userAnalytics).set({
    ritualsPerformedCount: sql`${userAnalytics.ritualsPerformedCount} + 1`,
  }).where(eq(userAnalytics.userId, userId));
}

export async function addStasisMinutes(userId: number, minutes: number): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db.update(userAnalytics).set({
    totalStasisMinutes: sql`${userAnalytics.totalStasisMinutes} + ${minutes}`,
  }).where(eq(userAnalytics.userId, userId));
}

export async function updateDailyActivity(userId: number, xp: number): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const analytics = await getOrCreateAnalytics(userId);
  if (!analytics) return;

  const today = new Date().toISOString().split('T')[0];
  const activity = (analytics.last365DaysActivity as Record<string, number>) ?? {};
  activity[today] = (activity[today] ?? 0) + xp;

  await db.update(userAnalytics).set({
    last365DaysActivity: activity,
  }).where(eq(userAnalytics.userId, userId));
}
