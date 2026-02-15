// ============================================================
// SIDERUM – Pro Subscription Store
// Manages Neophyte (Free) vs Adeptus (Pro) tier gating
// In production, this would integrate with RevenueCat
// ============================================================

import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type SubscriptionTier = 'neophyte' | 'adeptus';

export interface ProFeature {
  id: string;
  name: string;
  description: string;
  tier: SubscriptionTier;
}

// Define which features are gated
export const PRO_FEATURES: ProFeature[] = [
  { id: 'event_horizon', name: 'Event Horizon', description: 'Search upcoming eclipses, retrogrades & conjunctions for the next 5 years', tier: 'adeptus' },
  { id: 'advanced_rituals', name: 'Advanced Rituals', description: 'Access Hexagram, Rose Cross, Star Ruby and more', tier: 'adeptus' },
  { id: 'unlimited_bindrunes', name: 'Unlimited Bindrunes', description: 'Generate unlimited Bindrune combinations', tier: 'adeptus' },
  { id: 'aspectarian', name: 'Aspectarian', description: 'Deep aspect analysis with orb calculations', tier: 'adeptus' },
  { id: 'full_event_search', name: 'Event Search', description: 'Search for any future astronomical event', tier: 'adeptus' },
];

// Free tier limits
export const FREE_BINDRUNE_LIMIT = 3; // Max 3 runes per bindrune for free tier

interface ProState {
  tier: SubscriptionTier;
  bindruneCount: number; // Track bindrune generations in free tier

  // Actions
  loadSubscription: () => Promise<void>;
  upgradeToPro: () => Promise<void>;
  downgradeToFree: () => Promise<void>;
  isFeatureUnlocked: (featureId: string) => boolean;
  incrementBindruneCount: () => void;
  canGenerateBindrune: () => boolean;
}

const STORAGE_KEY = '@siderum_subscription';

export const useProStore = create<ProState>((set, get) => ({
  tier: 'neophyte',
  bindruneCount: 0,

  loadSubscription: async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        set({ tier: data.tier || 'neophyte', bindruneCount: data.bindruneCount || 0 });
      }
    } catch (e) {
      // Default to free
    }
  },

  upgradeToPro: async () => {
    // In production: RevenueCat purchase flow
    set({ tier: 'adeptus' });
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ tier: 'adeptus', bindruneCount: 0 }));
    } catch (e) {}
  },

  downgradeToFree: async () => {
    set({ tier: 'neophyte', bindruneCount: 0 });
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ tier: 'neophyte', bindruneCount: 0 }));
    } catch (e) {}
  },

  isFeatureUnlocked: (featureId: string) => {
    const { tier } = get();
    if (tier === 'adeptus') return true;
    const feature = PRO_FEATURES.find(f => f.id === featureId);
    if (!feature) return true; // Unknown features are unlocked
    return feature.tier === 'neophyte';
  },

  incrementBindruneCount: () => {
    set((s) => ({ bindruneCount: s.bindruneCount + 1 }));
  },

  canGenerateBindrune: () => {
    const { tier, bindruneCount } = get();
    if (tier === 'adeptus') return true;
    return bindruneCount < FREE_BINDRUNE_LIMIT;
  },
}));
