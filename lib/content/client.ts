// ============================================================
// ÆONIS – Content Provider (CMS Abstraction Layer)
// Currently uses local fallback data. Replace getRituals()
// with a CMS fetch (e.g. Sanity.io) when ready.
// ============================================================

import { Ritual } from '@/lib/ritual/types';
import {
  getLocalRituals,
  getLocalRitualById,
  RITUAL_ELEMENT_TAGS,
  RITUAL_PLANET_TAGS,
  RITUAL_XP_REWARDS,
  RITUAL_INSTRUCTIONS_MD,
} from './local-fallback';

export interface RitualWithMeta extends Ritual {
  elementTags: Array<'earth' | 'air' | 'fire' | 'water' | 'spirit'>;
  planetTags: string[];
  xpReward: number;
  instructionsMd?: string;
}

/**
 * ContentProvider abstracts data fetching so the app can switch
 * from local JSON to a headless CMS without changing UI code.
 */
export class ContentProvider {
  private static instance: ContentProvider;

  static getInstance(): ContentProvider {
    if (!ContentProvider.instance) {
      ContentProvider.instance = new ContentProvider();
    }
    return ContentProvider.instance;
  }

  /**
   * Fetch all rituals. Simulates 100ms network delay for
   * CMS-like async behavior.
   */
  async getRituals(): Promise<RitualWithMeta[]> {
    // Simulate network delay (remove when connecting real CMS)
    await new Promise(resolve => setTimeout(resolve, 100));

    const rituals = getLocalRituals();
    return rituals.map(r => this.enrichRitual(r));
  }

  /**
   * Fetch a single ritual by ID.
   */
  async getRitualById(id: string): Promise<RitualWithMeta | null> {
    await new Promise(resolve => setTimeout(resolve, 50));

    const ritual = getLocalRitualById(id);
    if (!ritual) return null;
    return this.enrichRitual(ritual);
  }

  /**
   * Get markdown instructions for a ritual.
   */
  async getRitualInstructions(id: string): Promise<string | null> {
    await new Promise(resolve => setTimeout(resolve, 50));
    return RITUAL_INSTRUCTIONS_MD[id] ?? null;
  }

  /**
   * Enrich a base ritual with metadata (elements, planets, XP, markdown).
   */
  private enrichRitual(ritual: Ritual): RitualWithMeta {
    return {
      ...ritual,
      elementTags: RITUAL_ELEMENT_TAGS[ritual.id] ?? ['spirit'],
      planetTags: RITUAL_PLANET_TAGS[ritual.id] ?? [],
      xpReward: RITUAL_XP_REWARDS[ritual.id] ?? 25,
      instructionsMd: RITUAL_INSTRUCTIONS_MD[ritual.id],
    };
  }
}

/** Singleton instance for easy import */
export const contentProvider = ContentProvider.getInstance();
