// ============================================================
// SIDERUM – Essential Dignities (Ptolemaic System)
// ============================================================

import { Planet, ZodiacSign, EssentialDignity, Sect } from './types';

// Domicile rulers
const DOMICILE: Record<ZodiacSign, Planet[]> = {
  Aries: ['Mars'], Taurus: ['Venus'], Gemini: ['Mercury'], Cancer: ['Moon'],
  Leo: ['Sun'], Virgo: ['Mercury'], Libra: ['Venus'], Scorpio: ['Mars'],
  Sagittarius: ['Jupiter'], Capricorn: ['Saturn'], Aquarius: ['Saturn'], Pisces: ['Jupiter'],
};

// Exaltation
const EXALTATION: Partial<Record<ZodiacSign, Planet>> = {
  Aries: 'Sun', Taurus: 'Moon', Gemini: undefined, Cancer: 'Jupiter',
  Leo: undefined, Virgo: 'Mercury', Libra: 'Saturn', Scorpio: undefined,
  Sagittarius: undefined, Capricorn: 'Mars', Aquarius: undefined, Pisces: 'Venus',
};

// Detriment (opposite of domicile)
const DETRIMENT: Record<ZodiacSign, Planet[]> = {
  Aries: ['Venus'], Taurus: ['Mars'], Gemini: ['Jupiter'], Cancer: ['Saturn'],
  Leo: ['Saturn'], Virgo: ['Jupiter'], Libra: ['Mars'], Scorpio: ['Venus'],
  Sagittarius: ['Mercury'], Capricorn: ['Moon'], Aquarius: ['Sun'], Pisces: ['Mercury'],
};

// Fall (opposite of exaltation)
const FALL: Partial<Record<ZodiacSign, Planet>> = {
  Aries: 'Saturn', Taurus: undefined, Gemini: undefined, Cancer: 'Mars',
  Leo: undefined, Virgo: 'Venus', Libra: 'Sun', Scorpio: 'Moon',
  Sagittarius: undefined, Capricorn: 'Jupiter', Aquarius: undefined, Pisces: 'Mercury',
};

// Triplicity rulers (Dorothean system)
type TriplicityElement = 'Fire' | 'Earth' | 'Air' | 'Water';
const SIGN_ELEMENT: Record<ZodiacSign, TriplicityElement> = {
  Aries: 'Fire', Taurus: 'Earth', Gemini: 'Air', Cancer: 'Water',
  Leo: 'Fire', Virgo: 'Earth', Libra: 'Air', Scorpio: 'Water',
  Sagittarius: 'Fire', Capricorn: 'Earth', Aquarius: 'Air', Pisces: 'Water',
};

const TRIPLICITY_RULERS: Record<TriplicityElement, { day: Planet; night: Planet }> = {
  Fire: { day: 'Sun', night: 'Jupiter' },
  Earth: { day: 'Venus', night: 'Moon' },
  Air: { day: 'Saturn', night: 'Mercury' },
  Water: { day: 'Venus', night: 'Mars' },
};

// Ptolemaic Terms (Egyptian)
interface TermRange { planet: Planet; from: number; to: number; }
const TERMS: Record<ZodiacSign, TermRange[]> = {
  Aries: [
    { planet: 'Jupiter', from: 0, to: 6 }, { planet: 'Venus', from: 6, to: 12 },
    { planet: 'Mercury', from: 12, to: 20 }, { planet: 'Mars', from: 20, to: 25 },
    { planet: 'Saturn', from: 25, to: 30 },
  ],
  Taurus: [
    { planet: 'Venus', from: 0, to: 8 }, { planet: 'Mercury', from: 8, to: 14 },
    { planet: 'Jupiter', from: 14, to: 22 }, { planet: 'Saturn', from: 22, to: 27 },
    { planet: 'Mars', from: 27, to: 30 },
  ],
  Gemini: [
    { planet: 'Mercury', from: 0, to: 6 }, { planet: 'Jupiter', from: 6, to: 12 },
    { planet: 'Venus', from: 12, to: 17 }, { planet: 'Mars', from: 17, to: 24 },
    { planet: 'Saturn', from: 24, to: 30 },
  ],
  Cancer: [
    { planet: 'Mars', from: 0, to: 7 }, { planet: 'Venus', from: 7, to: 13 },
    { planet: 'Mercury', from: 13, to: 19 }, { planet: 'Jupiter', from: 19, to: 26 },
    { planet: 'Saturn', from: 26, to: 30 },
  ],
  Leo: [
    { planet: 'Jupiter', from: 0, to: 6 }, { planet: 'Venus', from: 6, to: 11 },
    { planet: 'Saturn', from: 11, to: 18 }, { planet: 'Mercury', from: 18, to: 24 },
    { planet: 'Mars', from: 24, to: 30 },
  ],
  Virgo: [
    { planet: 'Mercury', from: 0, to: 7 }, { planet: 'Venus', from: 7, to: 17 },
    { planet: 'Jupiter', from: 17, to: 21 }, { planet: 'Mars', from: 21, to: 28 },
    { planet: 'Saturn', from: 28, to: 30 },
  ],
  Libra: [
    { planet: 'Saturn', from: 0, to: 6 }, { planet: 'Mercury', from: 6, to: 14 },
    { planet: 'Jupiter', from: 14, to: 21 }, { planet: 'Venus', from: 21, to: 28 },
    { planet: 'Mars', from: 28, to: 30 },
  ],
  Scorpio: [
    { planet: 'Mars', from: 0, to: 7 }, { planet: 'Venus', from: 7, to: 11 },
    { planet: 'Mercury', from: 11, to: 19 }, { planet: 'Jupiter', from: 19, to: 24 },
    { planet: 'Saturn', from: 24, to: 30 },
  ],
  Sagittarius: [
    { planet: 'Jupiter', from: 0, to: 12 }, { planet: 'Venus', from: 12, to: 17 },
    { planet: 'Mercury', from: 17, to: 21 }, { planet: 'Saturn', from: 21, to: 26 },
    { planet: 'Mars', from: 26, to: 30 },
  ],
  Capricorn: [
    { planet: 'Mercury', from: 0, to: 7 }, { planet: 'Jupiter', from: 7, to: 14 },
    { planet: 'Venus', from: 14, to: 22 }, { planet: 'Saturn', from: 22, to: 26 },
    { planet: 'Mars', from: 26, to: 30 },
  ],
  Aquarius: [
    { planet: 'Mercury', from: 0, to: 7 }, { planet: 'Venus', from: 7, to: 13 },
    { planet: 'Jupiter', from: 13, to: 20 }, { planet: 'Mars', from: 20, to: 25 },
    { planet: 'Saturn', from: 25, to: 30 },
  ],
  Pisces: [
    { planet: 'Venus', from: 0, to: 12 }, { planet: 'Jupiter', from: 12, to: 16 },
    { planet: 'Mercury', from: 16, to: 19 }, { planet: 'Mars', from: 19, to: 28 },
    { planet: 'Saturn', from: 28, to: 30 },
  ],
};

// Faces (Decans) – Chaldean order
const FACE_ORDER: Planet[] = ['Mars', 'Sun', 'Venus', 'Mercury', 'Moon', 'Saturn', 'Jupiter'];
function getFaceRuler(signIndex: number, decan: number): Planet {
  // signIndex 0=Aries, decan 0-2
  const totalDecan = signIndex * 3 + decan;
  return FACE_ORDER[totalDecan % 7];
}

export function calculateDignities(
  planet: Planet,
  sign: ZodiacSign,
  signDegree: number,
  sect: Sect,
): EssentialDignity {
  const signIndex = [
    'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
    'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
  ].indexOf(sign);

  // Skip nodes and Lilith for dignities
  if (['NorthNode', 'SouthNode', 'Lilith'].includes(planet)) {
    return {
      domicile: false, exaltation: false, triplicity: false,
      term: false, face: false, detriment: false, fall: false,
      peregrine: true, score: 0,
    };
  }

  const domicile = DOMICILE[sign]?.includes(planet) ?? false;
  const exaltation = EXALTATION[sign] === planet;
  const element = SIGN_ELEMENT[sign];
  const triplicityRuler = sect === 'Day' ? TRIPLICITY_RULERS[element].day : TRIPLICITY_RULERS[element].night;
  const triplicity = triplicityRuler === planet;

  const termRanges = TERMS[sign] || [];
  const term = termRanges.some(t => t.planet === planet && signDegree >= t.from && signDegree < t.to);

  const decan = Math.floor(signDegree / 10);
  const faceRuler = getFaceRuler(signIndex, Math.min(decan, 2));
  const face = faceRuler === planet;

  const detriment = DETRIMENT[sign]?.includes(planet) ?? false;
  const fall = FALL[sign] === planet;

  // Dignity scoring: +5 domicile, +4 exaltation, +3 triplicity, +2 term, +1 face, -5 detriment, -4 fall
  let score = 0;
  if (domicile) score += 5;
  if (exaltation) score += 4;
  if (triplicity) score += 3;
  if (term) score += 2;
  if (face) score += 1;
  if (detriment) score -= 5;
  if (fall) score -= 4;

  const peregrine = !domicile && !exaltation && !triplicity && !term && !face && !detriment && !fall;

  return { domicile, exaltation, triplicity, term, face, detriment, fall, peregrine, score };
}
