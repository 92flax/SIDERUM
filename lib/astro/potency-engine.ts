// ============================================================
// ÆONIS – Astral Potency Engine v2
// Base 60% Unyielding Will + Additive Buffs (max 100%)
//
// Buffs:
//   +15  Planetary Hour matches user intent
//   +5   Day Ruler matches user intent
//   +10  Active Cosmic Event supports user intent
//   +10  Recent Gnosis/Stasis session (last 6h)
// ============================================================

import { Planet, PLANET_COLORS } from './types';
import { PlanetaryHourInfo } from './planetary-hours';
import { DAY_RULERS } from './ruler-of-day';
import { SanityCosmicEvent } from '@/lib/cms/sanity';

// ─── Types ──────────────────────────────────────────────────

export interface PotencyBuff {
  id: string;
  label: string;
  value: number;       // e.g. 60, 15, 5, 10
  isBase: boolean;     // true only for the base 60%
  active: boolean;     // whether this buff is currently active
  color: string;       // UI color for the buff tag
}

export interface AstralPotencyReport {
  /** Total potency score (60-100) */
  potencyScore: number;
  /** All buffs (active and inactive base always shown) */
  buffs: PotencyBuff[];
  /** Current hour planet */
  hourPlanet: Planet;
  /** Planet color for UI theming */
  planetColor: string;
  /** Short headline */
  headline: string;
  /** Recommendation text */
  recommendation: string;
  /** Suggested ritual ID */
  suggestedRitualId: string | null;
  /** Active cosmic event (if any) */
  activeCosmicEvent: SanityCosmicEvent | null;
}

// ─── Intent Mapping ─────────────────────────────────────────
// Maps planets to the intents they empower

const PLANET_INTENTS: Record<string, string[]> = {
  Sun:     ['INVOKE', 'SOLAR', 'EMPOWERMENT', 'SELF'],
  Moon:    ['INVOKE', 'LUNAR', 'DIVINATION', 'DREAMS'],
  Mars:    ['BANISH', 'PROTECTION', 'FIRE', 'MARTIAL'],
  Mercury: ['INVOKE', 'COMMUNICATION', 'AIR', 'STUDY'],
  Jupiter: ['INVOKE', 'PROSPERITY', 'EXPANSION', 'WISDOM'],
  Venus:   ['INVOKE', 'LOVE', 'BEAUTY', 'EARTH'],
  Saturn:  ['BANISH', 'DISCIPLINE', 'RESTRICTION', 'ENDINGS'],
};

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

// ─── Engine ─────────────────────────────────────────────────

/**
 * Check if a planet "matches" a user intent.
 * The intent can be 'BANISH', 'INVOKE', or a specific keyword.
 */
function planetMatchesIntent(planet: string, userIntent: string | null): boolean {
  if (!userIntent) return false;
  const intents = PLANET_INTENTS[planet] ?? [];
  return intents.some(i => i === userIntent.toUpperCase());
}

/**
 * Calculate the Astral Potency Report v2.
 *
 * @param hourInfo - Current planetary hour data
 * @param userIntent - The user's current ritual intent (BANISH/INVOKE/null)
 * @param lastSessionTimestamp - Timestamp of last Gnosis or Stasis session (or null)
 * @param cosmicEvents - Currently active cosmic events from CMS
 */
export function calculateAstralPotency(
  hourInfo: PlanetaryHourInfo,
  userIntent: string | null,
  lastSessionTimestamp: number | null,
  cosmicEvents: SanityCosmicEvent[],
): AstralPotencyReport {
  const hourPlanet = hourInfo.currentHour.planet;
  const planetColor = PLANET_COLORS[hourPlanet] ?? '#D4AF37';
  const dayRuler = hourInfo.dayRuler;

  // ===== Base: 60% Unyielding Will =====
  let potency = 60;
  const buffs: PotencyBuff[] = [];

  buffs.push({
    id: 'base',
    label: 'UNYIELDING WILL',
    value: 60,
    isBase: true,
    active: true,
    color: '#A3A3A3', // Ash Grey
  });

  // ===== +15 if Planetary Hour matches intent =====
  const hourMatch = planetMatchesIntent(hourPlanet, userIntent);
  if (hourMatch) potency += 15;
  buffs.push({
    id: 'hour',
    label: 'PLANETARY RESONANCE',
    value: 15,
    isBase: false,
    active: hourMatch,
    color: '#3B82F6', // Occult Blue
  });

  // ===== +5 if Day Ruler matches intent =====
  const dayMatch = planetMatchesIntent(dayRuler, userIntent);
  if (dayMatch) potency += 5;
  buffs.push({
    id: 'day',
    label: 'SOLAR DOMINION',
    value: 5,
    isBase: false,
    active: dayMatch,
    color: '#D4AF37', // Gold
  });

  // ===== +10 if Active Cosmic Event supports intent =====
  let matchedEvent: SanityCosmicEvent | null = null;
  for (const evt of cosmicEvents) {
    if (evt.supportedIntents && userIntent) {
      const supported = evt.supportedIntents.map((s: string) => s.toUpperCase());
      if (supported.includes(userIntent.toUpperCase())) {
        matchedEvent = evt;
        potency += 10;
        break;
      }
    }
  }
  buffs.push({
    id: 'cosmic',
    label: 'COSMIC CONJUNCTION',
    value: 10,
    isBase: false,
    active: !!matchedEvent,
    color: '#D4AF37', // Gold
  });

  // ===== +10 if Recent Gnosis/Stasis (last 6 hours) =====
  const SIX_HOURS_MS = 6 * 60 * 60 * 1000;
  const hasRecentSession = lastSessionTimestamp != null && (Date.now() - lastSessionTimestamp) < SIX_HOURS_MS;
  if (hasRecentSession) potency += 10;
  buffs.push({
    id: 'momentum',
    label: 'ASTRAL MOMENTUM',
    value: 10,
    isBase: false,
    active: hasRecentSession,
    color: '#D4AF37', // Gold
  });

  // Cap at 100
  potency = Math.min(100, potency);

  // ===== Recommendation =====
  const rec = HOUR_RECOMMENDATIONS[hourPlanet] ?? HOUR_RECOMMENDATIONS.Sun;

  // ===== Headline =====
  let headline: string;
  if (matchedEvent) {
    headline = `COSMIC EVENT: ${matchedEvent.title}`;
  } else if (potency >= 85) {
    headline = 'SUPREME ALIGNMENT';
  } else if (potency >= 75) {
    headline = 'STRONG RESONANCE';
  } else {
    headline = `Hour of ${hourPlanet}`;
  }

  return {
    potencyScore: potency,
    buffs,
    hourPlanet,
    planetColor,
    headline,
    recommendation: rec.text,
    suggestedRitualId: rec.ritualId,
    activeCosmicEvent: matchedEvent,
  };
}
