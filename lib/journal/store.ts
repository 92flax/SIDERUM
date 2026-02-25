// ============================================================
// ÆONIS – Astral Journal Store
// Ritual diary with auto-capture, manual entries, statistics
// ============================================================

import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

const JOURNAL_KEY = '@aeonis_astral_journal';

// ─── Types ──────────────────────────────────────────────────

export type ExperienceIntensity = 1 | 2 | 3 | 4 | 5;
export type DailyCondition = 'excellent' | 'good' | 'neutral' | 'tired' | 'poor';

export type RitualFeeling = 'Heat' | 'Cold' | 'Tingling' | 'Pressure' | 'Lightness' | 'Heaviness' | 'Vibration' | 'Calm' | 'Anxiety' | 'Euphoria' | 'None';

export const RITUAL_FEELINGS: RitualFeeling[] = [
  'Heat', 'Cold', 'Tingling', 'Pressure', 'Lightness',
  'Heaviness', 'Vibration', 'Calm', 'Anxiety', 'Euphoria', 'None',
];

export interface JournalEntry {
  id: string;
  createdAt: string; // ISO date string
  // Auto-captured data
  ritualName: string | null;
  ritualId: string | null;
  intent: 'BANISH' | 'INVOKE' | null;
  dynamicSelection: string | null; // element or planet chosen
  stepsCompleted: number;
  totalSteps: number;
  xpAwarded: number;
  // Planetary data at time of ritual
  rulerOfDay: string;
  rulerOfHour: string;
  moonPhase: string;
  activeAspects: string[]; // e.g. ["Sun ☌ Mercury", "Mars □ Jupiter"]
  // User input (optional)
  notes: string;
  experienceIntensity: ExperienceIntensity | null;
  dailyCondition: DailyCondition | null;
  feeling: RitualFeeling | null;
  // Meta
  isAutoOnly: boolean; // true if user skipped manual input
  isManualEntry: boolean; // true if created manually (not after ritual)
}

export interface JournalStats {
  totalEntries: number;
  ritualFrequency: Record<string, number>; // ritualName -> count
  avgIntensityByDay: Record<string, number>; // dayRuler -> avg intensity
  avgIntensityByHour: Record<string, number>; // hourRuler -> avg intensity
  conditionDistribution: Record<DailyCondition, number>;
  entriesByMonth: Record<string, number>; // YYYY-MM -> count
}

// ─── Pending Entry (for post-ritual capture) ────────────────

export interface PendingJournalData {
  ritualName: string;
  ritualId: string;
  intent: 'BANISH' | 'INVOKE';
  dynamicSelection: string | null;
  stepsCompleted: number;
  totalSteps: number;
  xpAwarded: number;
  rulerOfDay: string;
  rulerOfHour: string;
  moonPhase: string;
  activeAspects: string[];
}

// ─── Store ──────────────────────────────────────────────────

interface JournalState {
  entries: JournalEntry[];
  isLoaded: boolean;
  pendingData: PendingJournalData | null;
  showPostRitualCapture: boolean;

  // Actions
  loadEntries: () => Promise<void>;
  setPendingData: (data: PendingJournalData) => void;
  openPostRitualCapture: () => void;
  closePostRitualCapture: () => void;

  // Save entry with user input
  saveFullEntry: (
    notes: string,
    intensity: ExperienceIntensity | null,
    condition: DailyCondition | null,
    feeling?: RitualFeeling | null,
  ) => Promise<void>;

  // Save auto-only entry (user skipped)
  saveAutoEntry: () => Promise<void>;

  // Create manual entry
  createManualEntry: (
    notes: string,
    intensity: ExperienceIntensity | null,
    condition: DailyCondition | null,
    rulerOfDay: string,
    rulerOfHour: string,
    moonPhase: string,
  ) => Promise<void>;

  // Delete entry
  deleteEntry: (id: string) => Promise<void>;

  // Statistics
  getStats: () => JournalStats;
}

function generateId(): string {
  return `j_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

async function persistEntries(entries: JournalEntry[]): Promise<void> {
  try {
    await AsyncStorage.setItem(JOURNAL_KEY, JSON.stringify(entries));
  } catch (e) {
    console.warn('[Journal] Failed to persist:', e);
  }
}

export const useJournalStore = create<JournalState>((set, get) => ({
  entries: [],
  isLoaded: false,
  pendingData: null,
  showPostRitualCapture: false,

  loadEntries: async () => {
    if (get().isLoaded) return;
    try {
      const raw = await AsyncStorage.getItem(JOURNAL_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as JournalEntry[];
        // Sort newest first
        parsed.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        set({ entries: parsed, isLoaded: true });
      } else {
        set({ isLoaded: true });
      }
    } catch {
      set({ isLoaded: true });
    }
  },

  setPendingData: (data: PendingJournalData) => {
    set({ pendingData: data });
  },

  openPostRitualCapture: () => {
    set({ showPostRitualCapture: true });
  },

  closePostRitualCapture: () => {
    set({ showPostRitualCapture: false, pendingData: null });
  },

  saveFullEntry: async (notes, intensity, condition, feeling) => {
    const { pendingData, entries } = get();
    if (!pendingData) return;

    const entry: JournalEntry = {
      id: generateId(),
      createdAt: new Date().toISOString(),
      ritualName: pendingData.ritualName,
      ritualId: pendingData.ritualId,
      intent: pendingData.intent,
      dynamicSelection: pendingData.dynamicSelection,
      stepsCompleted: pendingData.stepsCompleted,
      totalSteps: pendingData.totalSteps,
      xpAwarded: pendingData.xpAwarded,
      rulerOfDay: pendingData.rulerOfDay,
      rulerOfHour: pendingData.rulerOfHour,
      moonPhase: pendingData.moonPhase,
      activeAspects: pendingData.activeAspects,
      notes,
      experienceIntensity: intensity,
      dailyCondition: condition,
      feeling: feeling ?? null,
      isAutoOnly: false,
      isManualEntry: false,
    };

    const updated = [entry, ...entries];
    set({ entries: updated, pendingData: null, showPostRitualCapture: false });
    await persistEntries(updated);
  },

  saveAutoEntry: async () => {
    const { pendingData, entries } = get();
    if (!pendingData) return;

    const entry: JournalEntry = {
      id: generateId(),
      createdAt: new Date().toISOString(),
      ritualName: pendingData.ritualName,
      ritualId: pendingData.ritualId,
      intent: pendingData.intent,
      dynamicSelection: pendingData.dynamicSelection,
      stepsCompleted: pendingData.stepsCompleted,
      totalSteps: pendingData.totalSteps,
      xpAwarded: pendingData.xpAwarded,
      rulerOfDay: pendingData.rulerOfDay,
      rulerOfHour: pendingData.rulerOfHour,
      moonPhase: pendingData.moonPhase,
      activeAspects: pendingData.activeAspects,
      notes: '',
      experienceIntensity: null,
      dailyCondition: null,
      feeling: null,
      isAutoOnly: true,
      isManualEntry: false,
    };

    const updated = [entry, ...entries];
    set({ entries: updated, pendingData: null, showPostRitualCapture: false });
    await persistEntries(updated);
  },

  createManualEntry: async (notes, intensity, condition, rulerOfDay, rulerOfHour, moonPhase) => {
    const { entries } = get();

    const entry: JournalEntry = {
      id: generateId(),
      createdAt: new Date().toISOString(),
      ritualName: null,
      ritualId: null,
      intent: null,
      dynamicSelection: null,
      stepsCompleted: 0,
      totalSteps: 0,
      xpAwarded: 0,
      rulerOfDay,
      rulerOfHour,
      moonPhase,
      activeAspects: [],
      notes,
      experienceIntensity: intensity,
      dailyCondition: condition,
      feeling: null,
      isAutoOnly: false,
      isManualEntry: true,
    };

    const updated = [entry, ...entries];
    set({ entries: updated });
    await persistEntries(updated);
  },

  deleteEntry: async (id: string) => {
    const { entries } = get();
    const updated = entries.filter(e => e.id !== id);
    set({ entries: updated });
    await persistEntries(updated);
  },

  getStats: () => {
    const { entries } = get();
    const stats: JournalStats = {
      totalEntries: entries.length,
      ritualFrequency: {},
      avgIntensityByDay: {},
      avgIntensityByHour: {},
      conditionDistribution: { excellent: 0, good: 0, neutral: 0, tired: 0, poor: 0 },
      entriesByMonth: {},
    };

    const dayIntensitySums: Record<string, { sum: number; count: number }> = {};
    const hourIntensitySums: Record<string, { sum: number; count: number }> = {};

    for (const entry of entries) {
      // Ritual frequency
      if (entry.ritualName) {
        stats.ritualFrequency[entry.ritualName] = (stats.ritualFrequency[entry.ritualName] ?? 0) + 1;
      }

      // Condition distribution
      if (entry.dailyCondition) {
        stats.conditionDistribution[entry.dailyCondition] += 1;
      }

      // Monthly count
      const month = entry.createdAt.slice(0, 7); // YYYY-MM
      stats.entriesByMonth[month] = (stats.entriesByMonth[month] ?? 0) + 1;

      // Intensity by planetary day/hour
      if (entry.experienceIntensity) {
        const day = entry.rulerOfDay;
        if (!dayIntensitySums[day]) dayIntensitySums[day] = { sum: 0, count: 0 };
        dayIntensitySums[day].sum += entry.experienceIntensity;
        dayIntensitySums[day].count += 1;

        const hour = entry.rulerOfHour;
        if (!hourIntensitySums[hour]) hourIntensitySums[hour] = { sum: 0, count: 0 };
        hourIntensitySums[hour].sum += entry.experienceIntensity;
        hourIntensitySums[hour].count += 1;
      }
    }

    // Calculate averages
    for (const [day, data] of Object.entries(dayIntensitySums)) {
      stats.avgIntensityByDay[day] = Math.round((data.sum / data.count) * 10) / 10;
    }
    for (const [hour, data] of Object.entries(hourIntensitySums)) {
      stats.avgIntensityByHour[hour] = Math.round((data.sum / data.count) * 10) / 10;
    }

    return stats;
  },
}));
