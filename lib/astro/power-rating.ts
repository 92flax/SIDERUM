// ============================================================
// ÆONIS – Magical Power Rating
// Calculates a 0-100% "Astral Potency" score based on
// transits to natal chart + active rune power
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
  transitScore: number;        // contribution from transits
  dignityScore: number;        // contribution from current dignities
  runeModifier: number;        // contribution from active rune
  moonPhaseBonus: number;      // contribution from moon phase
  planetaryHourBonus: number;  // contribution from current planetary hour
  details: string[];           // human-readable breakdown
}

export function calculatePowerRating(
  currentChart: ChartData,
  natalChart: ChartData | null,
  activeRuneDignityScore: number = 0,
  currentPlanetaryHourPlanet: string = '',
): PowerBreakdown {
  let transitScore = 50; // Base score
  let dignityScore = 0;
  const details: string[] = [];

  // ===== 1. Transit-to-Natal Aspects =====
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
            // Closer to exact = stronger effect
            const strength = 1 - (orbDiff / aspect.orb);
            const points = Math.round(aspect.score * strength);
            transitScore += points;

            if (Math.abs(points) >= 5) {
              const transitName = transit.planet;
              const natalName = natal.planet;
              const direction = points > 0 ? '↑' : '↓';
              details.push(
                `${direction} ${transitName} ${aspect.name} natal ${natalName} (${points > 0 ? '+' : ''}${points})`
              );
            }
          }
        }
      }
    }
  }

  // ===== 2. Current Dignity Scores =====
  const beneficDignity = BENEFIC_PLANETS.reduce((sum, p) => {
    const d = currentChart.dignities[p];
    return sum + (d ? d.score : 0);
  }, 0);

  const maleficDignity = MALEFIC_PLANETS.reduce((sum, p) => {
    const d = currentChart.dignities[p];
    return sum + (d ? d.score : 0);
  }, 0);

  // Benefics in good dignity = positive, malefics in bad dignity = also positive (they're weakened)
  dignityScore = Math.round(beneficDignity * 1.5 - maleficDignity * 0.5);

  if (beneficDignity > 3) {
    details.push(`↑ Benefics well-dignified (+${Math.round(beneficDignity * 1.5)})`);
  }
  if (maleficDignity < -3) {
    details.push(`↑ Malefics weakened (+${Math.round(-maleficDignity * 0.5)})`);
  }

  // ===== 3. Moon Phase Bonus =====
  const moonPos = currentChart.planets.find(p => p.planet === 'Moon');
  const sunPos = currentChart.planets.find(p => p.planet === 'Sun');
  let moonPhaseBonus = 0;
  if (moonPos && sunPos) {
    let moonAngle = moonPos.longitude - sunPos.longitude;
    if (moonAngle < 0) moonAngle += 360;
    // Waxing moon (0-180) is generally positive for magical work
    if (moonAngle > 0 && moonAngle < 180) {
      moonPhaseBonus = Math.round((moonAngle / 180) * 8); // 0-8 points
      if (moonAngle > 90 && moonAngle < 135) {
        moonPhaseBonus += 3; // Near full moon bonus
        details.push('↑ Waxing Gibbous Moon (+3)');
      }
    }
    // Full moon (within 12°)
    if (Math.abs(moonAngle - 180) < 12) {
      moonPhaseBonus = 10;
      details.push('↑ Full Moon power (+10)');
    }
  }

  // ===== 4. Planetary Hour Bonus =====
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

  // ===== 5. Active Rune Modifier =====
  const runeModifier = Math.round(activeRuneDignityScore * 2);
  if (runeModifier > 0) {
    details.push(`↑ Active Talisman resonance (+${runeModifier})`);
  }

  // ===== Calculate Total =====
  const rawTotal = transitScore + dignityScore + moonPhaseBonus + planetaryHourBonus + runeModifier;
  const totalScore = Math.max(0, Math.min(100, rawTotal));

  return {
    totalScore,
    transitScore: Math.max(0, Math.min(100, transitScore)),
    dignityScore,
    runeModifier,
    moonPhaseBonus,
    planetaryHourBonus,
    details: details.slice(0, 6), // Max 6 details
  };
}

export function getPowerLabel(score: number): { label: string; color: string } {
  if (score >= 80) return { label: 'Transcendent', color: '#FFD700' };
  if (score >= 65) return { label: 'Empowered', color: '#22C55E' };
  if (score >= 50) return { label: 'Balanced', color: '#3B82F6' };
  if (score >= 35) return { label: 'Challenged', color: '#F59E0B' };
  return { label: 'Dormant', color: '#EF4444' };
}
