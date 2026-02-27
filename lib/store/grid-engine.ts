// ============================================================
// ÆONIS – Grid Engine Store
// Tracks Egregore grid charge, RSVP state, and decay logic
// ============================================================

import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

const GRID_KEY = '@aeonis_grid_engine';

// ─── Types ──────────────────────────────────────────────────

interface GridState {
  gridCharge: number; // 0-100
  lastChargeUpdate: number; // timestamp
  rsvpEventId: string | null; // Sanity _id of pledged event
  isLoaded: boolean;

  // Actions
  loadGrid: () => Promise<void>;
  addCharge: (amount: number) => Promise<void>;
  setChargeMax: () => Promise<void>;
  pledgeEnergy: (eventId: string) => Promise<void>;
  unpledge: () => Promise<void>;
  applyDecay: () => Promise<void>;
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

export const useGridEngine = create<GridState>((set, get) => ({
  gridCharge: 60,
  lastChargeUpdate: Date.now(),
  rsvpEventId: null,
  isLoaded: false,

  loadGrid: async () => {
    if (get().isLoaded) return;
    try {
      const raw = await AsyncStorage.getItem(GRID_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        set({
          gridCharge: parsed.gridCharge ?? 60,
          lastChargeUpdate: parsed.lastChargeUpdate ?? Date.now(),
          rsvpEventId: parsed.rsvpEventId ?? null,
          isLoaded: true,
        });
        // Apply decay on load
        get().applyDecay();
      } else {
        set({ isLoaded: true });
      }
    } catch {
      set({ isLoaded: true });
    }
  },

  addCharge: async (amount: number) => {
    const { gridCharge } = get();
    const newCharge = clamp(gridCharge + amount, 0, 100);
    set({ gridCharge: newCharge, lastChargeUpdate: Date.now() });
    await persist(get());
  },

  setChargeMax: async () => {
    set({ gridCharge: 100, lastChargeUpdate: Date.now() });
    await persist(get());
  },

  pledgeEnergy: async (eventId: string) => {
    set({ rsvpEventId: eventId });
    await persist(get());
  },

  unpledge: async () => {
    set({ rsvpEventId: null });
    await persist(get());
  },

  applyDecay: async () => {
    const { gridCharge, lastChargeUpdate } = get();
    const hoursSince = (Date.now() - lastChargeUpdate) / (1000 * 60 * 60);
    // -10% per 24h of inactivity
    const decayPeriods = Math.floor(hoursSince / 24);
    if (decayPeriods > 0) {
      const decayAmount = decayPeriods * 10;
      const newCharge = clamp(gridCharge - decayAmount, 0, 100);
      set({ gridCharge: newCharge, lastChargeUpdate: Date.now() });
      await persist(get());
    }
  },
}));

async function persist(state: GridState): Promise<void> {
  try {
    await AsyncStorage.setItem(GRID_KEY, JSON.stringify({
      gridCharge: state.gridCharge,
      lastChargeUpdate: state.lastChargeUpdate,
      rsvpEventId: state.rsvpEventId,
    }));
  } catch (e) {
    console.warn('[GridEngine] Failed to persist:', e);
  }
}
