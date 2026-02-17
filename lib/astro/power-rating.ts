// ============================================================
// ÆONIS – Magical Power Rating (Digital Grimoire)
// Formula: 40% Transits + 40% Natal Dignity + 20% Active Rune
// Stasis Buff: x1.15 if meditation session within last 60 mins
// ============================================================

import { ChartData, Planet } from './types';

// Major aspect orbs and scores
const ASPECTS = [
  { name: 'Conjunction', angle: 0, orb: 8, score: 15 },
  { name: 'Trine', angle: 120, orb: 6, score: 12 },
  { name: 'Sextile', angle: 60, orb: 5, score: 8 },
  { name: 'Square', angle: 90, orb: 6, score: -5 },
  { name: 'Opposition', angle: 180, orb: 8, score: -3 },
];

const BENEFIC_PLANETS: Planet[] = ['Jupiter', 'Venus'];
const MALEFIC_PLANETS: Planet[] = ['Saturn', 'Mars'];

interface PowerBreakdown {
  totalScore: number;          // 0-100
  transitScore: number;        // contribution from transits (40%)
  dignityScore: number;        // contribution from natal dignities (40%)
  runeModifier: number;        // contribution from active rune (20%)
  moonPhaseBonus: number;      // sub-component of transit
  planetaryHourBonus: number;  // sub-component of transit
  stasisMultiplier: number;    // 1.0 or 1.15
  details: string[];           // human-readable breakdown
}

export function calculatePowerRating(
  currentChart: ChartData,
  natalChart: ChartData | null,
  activeRuneDignityScore: number = 0,
  currentPlanetaryHourPlanet: string = '',
  stasisBuffActive: boolean = false,
): PowerBreakdown {
  const details: string[] = [];

  // ===== 1. Transit Score (raw 0-100) =====
  let transitRaw = 50; // Base

  if (natalChart) {
    const transitPlanets = currentChart.planets.filter(p =>
      ['Jupiter', 'Venus', 'Mars', 'Saturn', 'Sun', 'Moon'].includes(p.planet)
    );
    const natalPlanets = natalChart.planets.filter(p =>
      ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn'].includes(p.planet)
    );

    for (const transit of transitPlanets) {
      for (const natal of natalPlanets) {
        let diff = Math.abs(transit.longitude - natal.longitude);
        if (diff > 180) diff = 360 - diff;

        for (const aspect of ASPECTS) {
          const orbDiff = Math.abs(diff - aspect.angle);
          if (orbDiff <= aspect.orb) {
            const strength = 1 - (orbDiff / aspect.orb);
            const points = Math.round(aspect.score * strength);
            transitRaw += points;

            if (Math.abs(points) >= 5) {
              const direction = points > 0 ? '↑' : '↓';
              details.push(
                `${direction} ${transit.planet} ${aspect.name} natal ${natal.planet} (${points > 0 ? '+' : ''}${points})`
              );
            }
          }
        }
      }
    }
  }

  // Moon phase bonus (part of transit)
  let moonPhaseBonus = 0;
  const moonPos = currentChart.planets.find(p => p.planet === 'Moon');
  const sunPos = currentChart.planets.find(p => p.planet === 'Sun');
  if (moonPos && sunPos) {
    let moonAngle = moonPos.longitude - sunPos.longitude;
    if (moonAngle < 0) moonAngle += 360;
    if (moonAngle > 0 && moonAngle < 180) {
      moonPhaseBonus = Math.round((moonAngle / 180) * 8);
      if (moonAngle > 90 && moonAngle < 135) {
        moonPhaseBonus += 3;
        details.push('↑ Waxing Gibbous Moon (+3)');
      }
    }
    if (Math.abs(moonAngle - 180) < 12) {
      moonPhaseBonus = 10;
      details.push('↑ Full Moon power (+10)');
    }
  }
  transitRaw += moonPhaseBonus;

  // Planetary hour bonus (part of transit)
  let planetaryHourBonus = 0;
  if (currentPlanetaryHourPlanet) {
    if (BENEFIC_PLANETS.includes(currentPlanetaryHourPlanet as Planet)) {
      planetaryHourBonus = 5;
      details.push(`↑ Hour of ${currentPlanetaryHourPlanet} (+5)`);
    } else if (currentPlanetaryHourPlanet === 'Sun') {
      planetaryHourBonus = 4;
      details.push('↑ Hour of the Sun (+4)');
    } else if (currentPlanetaryHourPlanet === 'Moon') {
      planetaryHourBonus = 3;
      details.push('↑ Hour of the Moon (+3)');
    }
  }
  transitRaw += planetaryHourBonus;

  const transitScore = Math.max(0, Math.min(100, transitRaw));

  // ===== 2. Natal Dignity Score (raw 0-100) =====
  let dignityRaw = 50;
  const beneficDignity = BENEFIC_PLANETS.reduce((sum, p) => {
    const d = currentChart.dignities[p];
    return sum + (d ? d.score : 0);
  }, 0);
  const maleficDignity = MALEFIC_PLANETS.reduce((sum, p) => {
    const d = currentChart.dignities[p];
    return sum + (d ? d.score : 0);
  }, 0);

  dignityRaw += Math.round(beneficDignity * 1.5 - maleficDignity * 0.5);

  if (beneficDignity > 3) {
    details.push(`↑ Benefics well-dignified (+${Math.round(beneficDignity * 1.5)})`);
  }
  if (maleficDignity < -3) {
    details.push(`↑ Malefics weakened (+${Math.round(-maleficDignity * 0.5)})`);
  }

  const dignityScore = Math.max(0, Math.min(100, dignityRaw));

  // ===== 3. Active Rune Modifier (raw 0-100) =====
  const runeRaw = 50 + Math.round(activeRuneDignityScore * 5);
  const runeModifier = Math.max(0, Math.min(100, runeRaw));
  if (activeRuneDignityScore > 0) {
    details.push(`↑ Active Talisman resonance (+${Math.round(activeRuneDignityScore * 5)})`);
  }

  // ===== Weighted Total: 40% Transit + 40% Natal + 20% Rune =====
  let rawTotal = Math.round(transitScore * 0.4 + dignityScore * 0.4 + runeModifier * 0.2);

  // ===== Stasis Buff: x1.15 =====
  const stasisMultiplier = stasisBuffActive ? 1.15 : 1.0;
  if (stasisBuffActive) {
    details.push('↑ Stasis Buff active (×1.15)');
  }
  rawTotal = Math.round(rawTotal * stasisMultiplier);

  const totalScore = Math.max(0, Math.min(100, rawTotal));

  return {
    totalScore,
    transitScore,
    dignityScore,
    runeModifier,
    moonPhaseBonus,
    planetaryHourBonus,
    stasisMultiplier,
    details: details.slice(0, 6),
  };
}

export function getPowerLabel(score: number): { label: string; color: string } {
  if (score >= 80) return { label: 'Transcendent', color: '#FFD700' };
  if (score >= 65) return { label: 'Empowered', color: '#22C55E' };
  if (score >= 50) return { label: 'Balanced', color: '#3B82F6' };
  if (score >= 35) return { label: 'Challenged', color: '#F59E0B' };
  return { label: 'Dormant', color: '#EF4444' };
}
