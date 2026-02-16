// ============================================================
// ÆONIS – Natal Data Store
// Stores user's birth data for transit calculations
// ============================================================

import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ChartData, LocationInput } from '@/lib/astro/types';
import { calculateChart } from '@/lib/astro/engine';

export interface UserNatalData {
  dateOfBirth: string;       // ISO date string YYYY-MM-DD
  timeOfBirth: string;       // HH:MM format
  placeOfBirth: string;      // City name
  latitude: number;
  longitude: number;
}

interface NatalState {
  natalData: UserNatalData | null;
  natalChart: ChartData | null;
  hasNatalData: boolean;

  setNatalData: (data: UserNatalData) => Promise<void>;
  loadNatalData: () => Promise<void>;
  calculateNatalChart: () => void;
  clearNatalData: () => Promise<void>;
}

const NATAL_KEY = '@aeonis_natal_data';

export const useNatalStore = create<NatalState>((set, get) => ({
  natalData: null,
  natalChart: null,
  hasNatalData: false,

  setNatalData: async (data: UserNatalData) => {
    set({ natalData: data, hasNatalData: true });
    try {
      await AsyncStorage.setItem(NATAL_KEY, JSON.stringify(data));
    } catch {}
    // Calculate natal chart immediately
    get().calculateNatalChart();
  },

  loadNatalData: async () => {
    try {
      const str = await AsyncStorage.getItem(NATAL_KEY);
      if (str) {
        const data: UserNatalData = JSON.parse(str);
        set({ natalData: data, hasNatalData: true });
        get().calculateNatalChart();
      }
    } catch {}
  },

  calculateNatalChart: () => {
    const { natalData } = get();
    if (!natalData) return;

    try {
      const [year, month, day] = natalData.dateOfBirth.split('-').map(Number);
      const [hour, minute] = natalData.timeOfBirth.split(':').map(Number);
      const birthDate = new Date(year, month - 1, day, hour || 12, minute || 0);
      const location: LocationInput = {
        latitude: natalData.latitude,
        longitude: natalData.longitude,
      };
      const natalChart = calculateChart(birthDate, location);
      set({ natalChart });
    } catch {
      // If calculation fails, keep null
    }
  },

  clearNatalData: async () => {
    set({ natalData: null, natalChart: null, hasNatalData: false });
    try {
      await AsyncStorage.removeItem(NATAL_KEY);
    } catch {}
  },
}));
