// ============================================================
// ÆONIS – Rune Wallet Store
// Manages saved bindrunes, active talisman, and Master Rune
// ============================================================

import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface SavedRune {
  id: string;
  name: string;
  runeNames: string[];   // e.g. ['Fehu', 'Ansuz', 'Gebo']
  keywords: string[];
  createdAt: number;      // timestamp
  isMasterRune: boolean;
  intention?: string;     // user's primary intention (for Master Rune)
  dignityScore?: number;  // linked planetary dignity at creation
}

interface RuneWalletState {
  savedRunes: SavedRune[];
  activeRuneId: string | null;
  masterRune: SavedRune | null;
  hasCompletedSeal: boolean;

  // Actions
  loadWallet: () => Promise<void>;
  saveRune: (rune: Omit<SavedRune, 'id' | 'createdAt'>) => Promise<void>;
  removeRune: (id: string) => Promise<void>;
  setActiveRune: (id: string | null) => Promise<void>;
  setMasterRune: (rune: Omit<SavedRune, 'id' | 'createdAt' | 'isMasterRune'>) => Promise<void>;
  completeSeal: () => Promise<void>;
  getActiveRune: () => SavedRune | null;
}

const WALLET_KEY = '@aeonis_rune_wallet';
const ACTIVE_KEY = '@aeonis_active_rune';
const SEAL_KEY = '@aeonis_seal_complete';

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export const useRuneWalletStore = create<RuneWalletState>((set, get) => ({
  savedRunes: [],
  activeRuneId: null,
  masterRune: null,
  hasCompletedSeal: false,

  loadWallet: async () => {
    try {
      const [walletStr, activeStr, sealStr] = await Promise.all([
        AsyncStorage.getItem(WALLET_KEY),
        AsyncStorage.getItem(ACTIVE_KEY),
        AsyncStorage.getItem(SEAL_KEY),
      ]);

      const savedRunes: SavedRune[] = walletStr ? JSON.parse(walletStr) : [];
      const activeRuneId = activeStr || null;
      const hasCompletedSeal = sealStr === 'true';
      const masterRune = savedRunes.find(r => r.isMasterRune) || null;

      set({ savedRunes, activeRuneId, masterRune, hasCompletedSeal });
    } catch {
      // Default empty state
    }
  },

  saveRune: async (runeData) => {
    const newRune: SavedRune = {
      ...runeData,
      id: generateId(),
      createdAt: Date.now(),
    };
    const updated = [...get().savedRunes, newRune];
    set({ savedRunes: updated });
    try {
      await AsyncStorage.setItem(WALLET_KEY, JSON.stringify(updated));
    } catch {}
  },

  removeRune: async (id) => {
    const updated = get().savedRunes.filter(r => r.id !== id);
    const activeId = get().activeRuneId === id ? null : get().activeRuneId;
    set({ savedRunes: updated, activeRuneId: activeId });
    try {
      await AsyncStorage.setItem(WALLET_KEY, JSON.stringify(updated));
      if (activeId !== get().activeRuneId) {
        await AsyncStorage.removeItem(ACTIVE_KEY);
      }
    } catch {}
  },

  setActiveRune: async (id) => {
    set({ activeRuneId: id });
    try {
      if (id) {
        await AsyncStorage.setItem(ACTIVE_KEY, id);
      } else {
        await AsyncStorage.removeItem(ACTIVE_KEY);
      }
    } catch {}
  },

  setMasterRune: async (runeData) => {
    const masterRune: SavedRune = {
      ...runeData,
      id: 'master_' + generateId(),
      createdAt: Date.now(),
      isMasterRune: true,
    };

    // Remove any existing master rune
    const filtered = get().savedRunes.filter(r => !r.isMasterRune);
    const updated = [masterRune, ...filtered];

    set({
      savedRunes: updated,
      masterRune,
      activeRuneId: masterRune.id,
    });

    try {
      await AsyncStorage.setItem(WALLET_KEY, JSON.stringify(updated));
      await AsyncStorage.setItem(ACTIVE_KEY, masterRune.id);
    } catch {}
  },

  completeSeal: async () => {
    set({ hasCompletedSeal: true });
    try {
      await AsyncStorage.setItem(SEAL_KEY, 'true');
    } catch {}
  },

  getActiveRune: () => {
    const { savedRunes, activeRuneId } = get();
    if (!activeRuneId) return null;
    return savedRunes.find(r => r.id === activeRuneId) || null;
  },
}));
