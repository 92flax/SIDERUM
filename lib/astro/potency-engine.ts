// ============================================================
// ÆONIS – Astral Potency Engine
// Synthesizes astrological data, user progress, and CMS events
// into a single actionable "Weather Report".
//
// 4 Pillars:
//   1. Adept Potency Score
//   2. Rune Synergy
//   3. Collective Boost (Global Events)
//   4. Actionable Recommendations
// ============================================================

import { Planet, PLANET_COLORS } from './types';
import { PlanetaryHourInfo } from './planetary-hours';
import { ELDER_FUTHARK, Rune } from '@/lib/runes/futhark';
import { DAY_RULERS } from './ruler-of-day';
import { SanityEvent } from '@/lib/cms/sanity';
import { SavedRune } from '@/lib/store/rune-wallet';

// ─── Types ──────────────────────────────────────────────────

export type SynergyLevel = 'HIGH' | 'MED' | 'LOW';

export interface AstralPotencyReport {
  /** Priority level: 1 = Global Event, 2 = High Synergy, 3 = Standard */
  priority: 1 | 2 | 3;
  /** Short headline for the card */
  headline: string;
  /** Full message body */
  message: string;
  /** Recommended action text */
  recommendation: string;
  /** Suggested ritual ID to link to (if applicable) */
  suggestedRitualId: string | null;
  /** Current hour planet */
  hourPlanet: Planet;
  /** Planet color for UI theming */
  planetColor: string;
  /** Composite potency score (0-100) */
  potencyScore: number;
  /** Breakdown details */
  breakdown: {
    adeptPotency: number;
    runeSynergy: SynergyLevel;
    runeSynergyMultiplier: number;
    collectiveBoost: number;
    stasisActive: boolean;
  };
}

// ─── Planetary Hour → Recommendation Mapping ────────────────

const HOUR_RECOMMENDATIONS: Record<string, { text: string; ritualId: string | null }> = {
  Sun:     { text: 'Ideal for Solar Invocation, empowerment, and self-realization.', ritualId: 'solar_invocation' },
  Moon:    { text: 'Perfect for Lunar Meditation, divination, and dream work.', ritualId: 'lunar_meditation' },
  Mars:    { text: 'Strongest for LBRP (Fire), banishing, and protection.', ritualId: 'lbrp' },
  Mercury: { text: 'Optimal for Mercurial Invocation, study, and communication.', ritualId: 'mercurial_invocation' },
  Jupiter: { text: 'Excellent for prosperity rituals and spiritual growth.', ritualId: 'middle_pillar' },
  Venus:   { text: 'Best for love rituals and artistic creation.', ritualId: null },
  Saturn:  { text: 'Suitable for Saturn Banishing, discipline, and restriction.', ritualId: 'sirp' },
};

// ─── Element mapping for planets (for Rune Synergy) ─────────

const PLANET_ELEMENTS: Record<string, string> = {
  Sun: 'fire',
  Moon: 'water',
  Mars: 'fire',
  Mercury: 'air',
  Jupiter: 'fire',
  Venus: 'earth',
  Saturn: 'earth',
};

// ─── Engine ─────────────────────────────────────────────────

/**
 * Calculate the Astral Potency Report.
 *
 * @param hourInfo - Current planetary hour data
 * @param userLevel - User's current initiation level (0-10)
 * @param stasisActive - Whether user has an active stasis buff
 * @param activeRune - The user's currently equipped rune (or null)
 * @param activeEvents - Currently active global events from CMS
 */
export function calculateAstralPotency(
  hourInfo: PlanetaryHourInfo,
  userLevel: number,
  stasisActive: boolean,
  activeRune: SavedRune | null,
  activeEvents: SanityEvent[],
): AstralPotencyReport {
  const hourPlanet = hourInfo.currentHour.planet;
  const dayRuler = hourInfo.dayRuler;
  const planetColor = PLANET_COLORS[hourPlanet] ?? '#D4AF37';

  // ===== Pillar 1: Adept Potency Score =====
  const adeptPotency = (1 + userLevel / 10) * (stasisActive ? 1.5 : 1.0);

  // ===== Pillar 2: Rune Synergy =====
  let runeSynergy: SynergyLevel = 'LOW';
  let runeSynergyMultiplier = 1.0;
  let matchedRuneName = '';

  if (activeRune && activeRune.runeNames.length > 0) {
    // Find the first rune in ELDER_FUTHARK that matches any of the active rune's component runes
    const runeData: Rune | undefined = activeRune.runeNames
      .map(name => ELDER_FUTHARK.find(r => r.name === name))
      .find(r => r !== undefined);

    if (runeData) {
      matchedRuneName = activeRune.name || runeData.name;

      // HIGH: Rune's planet matches current hour planet
      if (runeData.planet === hourPlanet) {
        runeSynergy = 'HIGH';
        runeSynergyMultiplier = 1.5;
      }
      // MED: Rune's element matches hour ruler's element
      else {
        const hourElement = PLANET_ELEMENTS[hourPlanet] ?? '';
        const runeElement = runeData.element?.toLowerCase() ?? '';
        if (runeElement && hourElement && runeElement === hourElement) {
          runeSynergy = 'MED';
          runeSynergyMultiplier = 1.2;
        }
      }
    }
  }

  // ===== Pillar 3: Collective Boost =====
  let collectiveBoost = 1.0;
  let activeEvent: SanityEvent | null = null;
  for (const evt of activeEvents) {
    if (evt.is_active && evt.xp_multiplier && evt.xp_multiplier > collectiveBoost) {
      collectiveBoost = evt.xp_multiplier;
      activeEvent = evt;
    }
  }

  // ===== Pillar 4: Recommendation =====
  const rec = HOUR_RECOMMENDATIONS[hourPlanet] ?? HOUR_RECOMMENDATIONS.Sun;

  // ===== Composite Potency Score (0-100) =====
  // Base: 40 + level contribution (up to +20) + synergy bonus (up to +15) + stasis (+10) + event (+15)
  let rawScore = 40;
  rawScore += Math.round(userLevel * 2); // 0-20 from level
  rawScore += runeSynergy === 'HIGH' ? 15 : runeSynergy === 'MED' ? 8 : 0;
  rawScore += stasisActive ? 10 : 0;
  rawScore += activeEvent ? Math.min(15, Math.round((collectiveBoost - 1) * 30)) : 0;
  const potencyScore = Math.max(0, Math.min(100, rawScore));

  // ===== Text Synthesis =====
  let priority: 1 | 2 | 3 = 3;
  let headline = '';
  let message = '';

  const dayRulerInfo = DAY_RULERS[new Date().getDay()];
  const dayRulerName = dayRulerInfo?.planet ?? dayRuler;
  const userStatusText = stasisActive
    ? 'Your mind is focused.'
    : 'A stasis session would optimize your potential.';

  // PRIO 1: Global Event active
  if (activeEvent && collectiveBoost > 1) {
    priority = 1;
    headline = `COSMIC EVENT: ${activeEvent.title}`;
    message = `A collective current has formed. ${rec.text} (Bonus: ${collectiveBoost}x XP)`;
  }
  // PRIO 2: High Rune Synergy
  else if (runeSynergy === 'HIGH' && matchedRuneName) {
    priority = 2;
    headline = 'Perfect Alignment!';
    message = `Your Rune ${matchedRuneName} resonates with the ${hourPlanet} hour. ${rec.text} Your potency is at ${potencyScore}%.`;
  }
  // PRIO 3: Standard
  else {
    priority = 3;
    headline = `Hour of ${hourPlanet}`;
    message = `We are currently in the ${hourPlanet} hour on the day of ${dayRulerName}. ${userStatusText} ${rec.text}`;
  }

  return {
    priority,
    headline,
    message,
    recommendation: rec.text,
    suggestedRitualId: rec.ritualId,
    hourPlanet,
    planetColor,
    potencyScore,
    breakdown: {
      adeptPotency: Math.round(adeptPotency * 100) / 100,
      runeSynergy,
      runeSynergyMultiplier,
      collectiveBoost,
      stasisActive,
    },
  };
}
