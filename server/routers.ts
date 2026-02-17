import { z } from "zod";
import { COOKIE_NAME } from "../shared/const.js";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import * as db from "./db";

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

  // ============================================================
  // GRIMOIRE: User Profile & XP
  // ============================================================
  grimoire: router({
    /** Set or update magic name */
    setMagicName: protectedProcedure
      .input(z.object({ magicName: z.string().min(2).max(64) }))
      .mutation(async ({ ctx, input }) => {
        const ok = await db.updateMagicName(ctx.user.id, input.magicName);
        return { success: ok };
      }),

    /** Add XP and recalculate level */
    addXp: protectedProcedure
      .input(z.object({ amount: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        return db.addXp(ctx.user.id, input.amount);
      }),

    /** Update active rune ID */
    setActiveRune: protectedProcedure
      .input(z.object({ runeId: z.string().nullable() }))
      .mutation(async ({ ctx, input }) => {
        await db.updateActiveRune(ctx.user.id, input.runeId);
        return { success: true };
      }),

    /** Store natal data */
    setNatalData: protectedProcedure
      .input(z.object({
        dateOfBirth: z.string(),
        timeOfBirth: z.string(),
        placeOfBirth: z.string(),
        latitude: z.number(),
        longitude: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        await db.updateNatalData(ctx.user.id, input);
        return { success: true };
      }),

    /** Get user profile with grimoire data */
    getProfile: protectedProcedure.query(async ({ ctx }) => {
      const user = await db.getUserByOpenId(ctx.user.openId);
      if (!user) return null;
      return {
        magicName: user.magicName,
        levelRank: user.levelRank,
        xpTotal: user.xpTotal,
        stasisStreak: user.stasisStreak,
        activeRuneId: user.activeRuneId,
        natalData: user.natalData,
      };
    }),
  }),

  // ============================================================
  // LEADERBOARD
  // ============================================================
  leaderboard: router({
    /** Get top 50 users */
    getTop: publicProcedure.query(async () => {
      return db.getLeaderboard(50);
    }),

    /** Refresh leaderboard cache (admin or periodic) */
    refresh: protectedProcedure.mutation(async () => {
      await db.refreshLeaderboard();
      return { success: true };
    }),
  }),

  // ============================================================
  // ANALYTICS
  // ============================================================
  analytics: router({
    /** Get user analytics */
    get: protectedProcedure.query(async ({ ctx }) => {
      return db.getOrCreateAnalytics(ctx.user.id);
    }),

    /** Record ritual completion with element XP */
    recordRitual: protectedProcedure
      .input(z.object({
        elements: z.array(z.enum(['earth', 'air', 'fire', 'water', 'spirit'])),
        xpAmount: z.number().int().positive().default(25),
      }))
      .mutation(async ({ ctx, input }) => {
        // Increment ritual count
        await db.incrementRitualCount(ctx.user.id);

        // Add element XP
        for (const element of input.elements) {
          await db.incrementElementXp(ctx.user.id, element, input.xpAmount);
        }

        // Add to user XP total
        const result = await db.addXp(ctx.user.id, input.xpAmount);

        // Update daily activity
        await db.updateDailyActivity(ctx.user.id, input.xpAmount);

        return result;
      }),

    /** Record stasis session */
    recordStasis: protectedProcedure
      .input(z.object({ minutes: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        await db.addStasisMinutes(ctx.user.id, input.minutes);

        // Stasis gives spirit XP
        const spiritXp = Math.round(input.minutes * 2);
        await db.incrementElementXp(ctx.user.id, 'spirit', spiritXp);

        // Add to user XP total
        const result = await db.addXp(ctx.user.id, spiritXp);

        // Update daily activity
        await db.updateDailyActivity(ctx.user.id, spiritXp);

        return result;
      }),
  }),
});

export type AppRouter = typeof appRouter;
