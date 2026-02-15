// ============================================================
// SIDERUM – Aspectarian Engine
// Calculates planetary aspects (Conjunction, Opposition, Square, Trine, Sextile)
// ============================================================

import { PlanetPosition, Planet, PLANET_SYMBOLS } from './types';

export type AspectType = 'Conjunction' | 'Sextile' | 'Square' | 'Trine' | 'Opposition';

export interface Aspect {
  planet1: Planet;
  planet2: Planet;
  type: AspectType;
  exactAngle: number;  // The ideal angle (0, 60, 90, 120, 180)
  actualAngle: number;  // The actual separation
  orb: number;          // Difference from exact
  isExact: boolean;     // Orb < 1°
  symbol: string;       // Aspect symbol
  interpretation: string;
}

const ASPECT_DEFINITIONS: Array<{
  type: AspectType;
  angle: number;
  symbol: string;
  maxOrb: number;
  nature: 'harmonious' | 'challenging' | 'neutral';
}> = [
  { type: 'Conjunction', angle: 0, symbol: '☌', maxOrb: 8, nature: 'neutral' },
  { type: 'Sextile', angle: 60, symbol: '⚹', maxOrb: 4, nature: 'harmonious' },
  { type: 'Square', angle: 90, symbol: '□', maxOrb: 6, nature: 'challenging' },
  { type: 'Trine', angle: 120, symbol: '△', maxOrb: 6, nature: 'harmonious' },
  { type: 'Opposition', angle: 180, symbol: '☍', maxOrb: 8, nature: 'challenging' },
];

const ASPECT_INTERPRETATIONS: Record<AspectType, Record<string, string>> = {
  Conjunction: {
    default: 'Energies merge and intensify. A powerful focal point.',
    exact: 'Exact conjunction: Maximum fusion of planetary energies.',
  },
  Sextile: {
    default: 'Opportunity and flow. Cooperative energies working together.',
    exact: 'Exact sextile: Peak harmonious opportunity.',
  },
  Square: {
    default: 'Tension and challenge. Dynamic friction that demands action.',
    exact: 'Exact square: Maximum tension — a critical turning point.',
  },
  Trine: {
    default: 'Harmony and ease. Natural talent and flowing energy.',
    exact: 'Exact trine: Perfect harmony between these energies.',
  },
  Opposition: {
    default: 'Polarity and awareness. Two forces seeking balance.',
    exact: 'Exact opposition: Full awareness — integration required.',
  },
};

/**
 * Calculate the angular separation between two ecliptic longitudes
 */
function angularSeparation(lon1: number, lon2: number): number {
  let diff = Math.abs(lon1 - lon2);
  if (diff > 180) diff = 360 - diff;
  return diff;
}

/**
 * Calculate all aspects between planet positions
 * @param positions Array of planet positions
 * @param maxOrb Maximum orb to consider (default: 3° for major aspects filter)
 */
export function calculateAspects(
  positions: PlanetPosition[],
  maxOrb: number = 3,
): Aspect[] {
  const aspects: Aspect[] = [];

  // Filter out non-planet bodies for aspect calculation
  const planets = positions.filter(p =>
    p.planet !== 'NorthNode' && p.planet !== 'SouthNode' && p.planet !== 'Lilith'
  );

  for (let i = 0; i < planets.length; i++) {
    for (let j = i + 1; j < planets.length; j++) {
      const p1 = planets[i];
      const p2 = planets[j];
      const separation = angularSeparation(p1.longitude, p2.longitude);

      for (const def of ASPECT_DEFINITIONS) {
        const orb = Math.abs(separation - def.angle);
        const effectiveMaxOrb = Math.min(maxOrb, def.maxOrb);

        if (orb <= effectiveMaxOrb) {
          const isExact = orb < 1;
          const interpretation = isExact
            ? ASPECT_INTERPRETATIONS[def.type].exact
            : ASPECT_INTERPRETATIONS[def.type].default;

          aspects.push({
            planet1: p1.planet,
            planet2: p2.planet,
            type: def.type,
            exactAngle: def.angle,
            actualAngle: separation,
            orb,
            isExact,
            symbol: def.symbol,
            interpretation: `${PLANET_SYMBOLS[p1.planet]} ${def.symbol} ${PLANET_SYMBOLS[p2.planet]}: ${interpretation}`,
          });
          break; // Only one aspect per pair
        }
      }
    }
  }

  // Sort by orb (tightest first)
  aspects.sort((a, b) => a.orb - b.orb);

  return aspects;
}

/**
 * Get only major aspects (Conjunction, Opposition, Square, Trine) with tight orb
 */
export function getMajorAspects(positions: PlanetPosition[], maxOrb: number = 3): Aspect[] {
  const all = calculateAspects(positions, maxOrb);
  return all.filter(a =>
    a.type === 'Conjunction' || a.type === 'Opposition' ||
    a.type === 'Square' || a.type === 'Trine'
  );
}

/**
 * Get exact aspects (orb < 1°) for dashboard highlighting
 */
export function getExactAspects(positions: PlanetPosition[]): Aspect[] {
  const all = calculateAspects(positions, 8);
  return all.filter(a => a.isExact);
}
