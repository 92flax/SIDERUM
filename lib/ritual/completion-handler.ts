// ============================================================
// ÆONIS – Ritual Completion Handler
// Handles XP awards, element tracking, and analytics updates
// when a ritual is completed.
// ============================================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import { RITUAL_ELEMENT_TAGS, RITUAL_XP_REWARDS, RITUAL_PLANET_TAGS } from '@/lib/content/local-fallback';

const ANALYTICS_KEY = '@aeonis_local_analytics';
const STASIS_BUFF_KEY = '@aeonis_stasis_buff';

export interface LocalAnalytics {
  elementEarthXp: number;
  elementAirXp: number;
  elementFireXp: number;
  elementWaterXp: number;
  elementSpiritXp: number;
  totalStasisMinutes: number;
  ritualsPerformedCount: number;
  xpTotal: number;
  levelRank: number;
  last365DaysActivity: Record<string, number>;
  lastStasisTimestamp: number | null;
}

const DEFAULT_ANALYTICS: LocalAnalytics = {
  elementEarthXp: 0,
  elementAirXp: 0,
  elementFireXp: 0,
  elementWaterXp: 0,
  elementSpiritXp: 0,
  totalStasisMinutes: 0,
  ritualsPerformedCount: 0,
  xpTotal: 0,
  levelRank: 0,
  last365DaysActivity: {},
  lastStasisTimestamp: null,
};

/** 10-level initiatic system thresholds */
const LEVEL_THRESHOLDS = [0, 100, 300, 600, 1000, 1600, 2400, 3500, 5000, 7000, 10000];

/** Level titles for the initiatic system */
export const LEVEL_TITLES: Record<number, string> = {
  0: 'Neophyte',
  1: 'Zelator',
  2: 'Theoricus',
  3: 'Practicus',
  4: 'Philosophus',
  5: 'Adeptus Minor',
  6: 'Adeptus Major',
  7: 'Adeptus Exemptus',
  8: 'Magister Templi',
  9: 'Magus',
  10: 'Ipsissimus',
};

function calculateLevel(xp: number): number {
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (xp >= LEVEL_THRESHOLDS[i]) return i;
  }
  return 0;
}

/** XP needed for the next level */
export function xpForNextLevel(currentLevel: number): number {
  if (currentLevel >= LEVEL_THRESHOLDS.length - 1) return LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1];
  return LEVEL_THRESHOLDS[currentLevel + 1];
}

/** XP threshold for the current level */
export function xpForCurrentLevel(currentLevel: number): number {
  return LEVEL_THRESHOLDS[currentLevel] ?? 0;
}

// ============================================================
// LOCAL ANALYTICS (offline-first, AsyncStorage)
// ============================================================

export async function loadLocalAnalytics(): Promise<LocalAnalytics> {
  try {
    const str = await AsyncStorage.getItem(ANALYTICS_KEY);
    if (str) {
      return { ...DEFAULT_ANALYTICS, ...JSON.parse(str) };
    }
  } catch {}
  return { ...DEFAULT_ANALYTICS };
}

export async function saveLocalAnalytics(analytics: LocalAnalytics): Promise<void> {
  try {
    await AsyncStorage.setItem(ANALYTICS_KEY, JSON.stringify(analytics));
  } catch {}
}

/**
 * Handle ritual completion: award XP, track elements, update activity.
 */
export async function handleRitualCompletion(ritualId: string): Promise<{
  xpAwarded: number;
  newXpTotal: number;
  newLevel: number;
  leveledUp: boolean;
  elements: string[];
}> {
  const analytics = await loadLocalAnalytics();
  const oldLevel = analytics.levelRank;

  // Get ritual metadata
  const elements = RITUAL_ELEMENT_TAGS[ritualId] ?? ['spirit'];
  const xpReward = RITUAL_XP_REWARDS[ritualId] ?? 25;

  // Check stasis buff (x1.15 multiplier)
  let xpAwarded = xpReward;
  if (analytics.lastStasisTimestamp) {
    const minutesSinceStasis = (Date.now() - analytics.lastStasisTimestamp) / 60000;
    if (minutesSinceStasis <= 60) {
      xpAwarded = Math.round(xpReward * 1.15);
    }
  }

  // Update analytics
  analytics.ritualsPerformedCount += 1;
  analytics.xpTotal += xpAwarded;
  analytics.levelRank = calculateLevel(analytics.xpTotal);

  // Increment element XP
  for (const element of elements) {
    const key = `element${element.charAt(0).toUpperCase() + element.slice(1)}Xp` as keyof LocalAnalytics;
    if (typeof analytics[key] === 'number') {
      (analytics as any)[key] += xpAwarded;
    }
  }

  // Update daily activity
  const today = new Date().toISOString().split('T')[0];
  analytics.last365DaysActivity[today] = (analytics.last365DaysActivity[today] ?? 0) + xpAwarded;

  await saveLocalAnalytics(analytics);

  return {
    xpAwarded,
    newXpTotal: analytics.xpTotal,
    newLevel: analytics.levelRank,
    leveledUp: analytics.levelRank > oldLevel,
    elements,
  };
}

/**
 * Handle stasis (meditation) session completion.
 */
export async function handleStasisCompletion(durationMinutes: number): Promise<{
  xpAwarded: number;
  newXpTotal: number;
  buffActive: boolean;
}> {
  const analytics = await loadLocalAnalytics();

  // Spirit XP from stasis
  const spiritXp = Math.round(durationMinutes * 2);
  analytics.elementSpiritXp += spiritXp;
  analytics.totalStasisMinutes += durationMinutes;
  analytics.xpTotal += spiritXp;
  analytics.levelRank = calculateLevel(analytics.xpTotal);

  // Set stasis buff if session > 5 minutes
  const buffActive = durationMinutes >= 5;
  if (buffActive) {
    analytics.lastStasisTimestamp = Date.now();
  }

  // Update daily activity
  const today = new Date().toISOString().split('T')[0];
  analytics.last365DaysActivity[today] = (analytics.last365DaysActivity[today] ?? 0) + spiritXp;

  await saveLocalAnalytics(analytics);

  return {
    xpAwarded: spiritXp,
    newXpTotal: analytics.xpTotal,
    buffActive,
  };
}
