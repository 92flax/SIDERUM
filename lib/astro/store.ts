// ============================================================
// ÆONIS – Global Astro State (Zustand)
// ============================================================

import { create } from 'zustand';
import { ChartData, LocationInput } from './types';
import { calculateChart } from './engine';

interface AstroState {
  chartData: ChartData | null;
  location: LocationInput;
  date: Date;
  isCalculating: boolean;
  error: string | null;
  setLocation: (loc: LocationInput) => void;
  setDate: (date: Date) => void;
  recalculate: () => void;
}

// Default: Berlin, Germany
const DEFAULT_LOCATION: LocationInput = { latitude: 52.52, longitude: 13.405 };

export const useAstroStore = create<AstroState>((set, get) => ({
  chartData: null,
  location: DEFAULT_LOCATION,
  date: new Date(),
  isCalculating: false,
  error: null,

  setLocation: (loc: LocationInput) => {
    set({ location: loc });
    get().recalculate();
  },

  setDate: (date: Date) => {
    set({ date });
    get().recalculate();
  },

  recalculate: () => {
    const { date, location } = get();
    set({ isCalculating: true, error: null });
    try {
      const chartData = calculateChart(date, location);
      set({ chartData, isCalculating: false });
    } catch (err: any) {
      set({ error: err.message || 'Calculation error', isCalculating: false });
    }
  },
}));
