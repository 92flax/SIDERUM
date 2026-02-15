// ============================================================
// SIDERUM – Ruler of the Day (Chaldean Order)
// Calculates the planetary ruler for any given day
// and suggests matching rituals
// ============================================================

import { Planet, PLANET_SYMBOLS } from './types';

// Chaldean Order: Saturn → Jupiter → Mars → Sun → Venus → Mercury → Moon
// Day rulers follow the traditional assignment:
// Sunday=Sun, Monday=Moon, Tuesday=Mars, Wednesday=Mercury,
// Thursday=Jupiter, Friday=Venus, Saturday=Saturn

interface DayRuler {
  planet: Planet;
  dayName: string;
  element: string;
  quality: string;
  ritualSuggestion: string;
  color: string;
  metal: string;
}

const DAY_RULERS: Record<number, DayRuler> = {
  0: { // Sunday
    planet: 'Sun',
    dayName: 'Sunday',
    element: 'Fire',
    quality: 'Vitality, Authority, Success',
    ritualSuggestion: 'Solar Invocation. Ideal for rituals of empowerment, healing, and self-realization.',
    color: '#D4AF37',
    metal: 'Gold',
  },
  1: { // Monday
    planet: 'Moon',
    dayName: 'Monday',
    element: 'Water',
    quality: 'Intuition, Dreams, Emotions',
    ritualSuggestion: 'Lunar Meditation. Ideal for divination, dream work, and emotional cleansing.',
    color: '#C0C0C0',
    metal: 'Silver',
  },
  2: { // Tuesday
    planet: 'Mars',
    dayName: 'Tuesday',
    element: 'Fire',
    quality: 'Courage, Strength, Will',
    ritualSuggestion: 'Invoking Ritual of the Pentagram (Fire). Ideal for banishing, protection, and martial workings.',
    color: '#EF4444',
    metal: 'Iron',
  },
  3: { // Wednesday
    planet: 'Mercury',
    dayName: 'Wednesday',
    element: 'Air',
    quality: 'Communication, Intelligence, Travel',
    ritualSuggestion: 'Mercurial Invocation. Ideal for study, communication spells, and intellectual pursuits.',
    color: '#F59E0B',
    metal: 'Mercury/Quicksilver',
  },
  4: { // Thursday
    planet: 'Jupiter',
    dayName: 'Thursday',
    element: 'Fire',
    quality: 'Expansion, Abundance, Wisdom',
    ritualSuggestion: 'Jupiter Invocation. Ideal for prosperity rituals, legal matters, and spiritual growth.',
    color: '#3B82F6',
    metal: 'Tin',
  },
  5: { // Friday
    planet: 'Venus',
    dayName: 'Friday',
    element: 'Earth',
    quality: 'Love, Beauty, Harmony',
    ritualSuggestion: 'Venus Invocation. Ideal for love rituals, artistic creation, and social harmony.',
    color: '#22C55E',
    metal: 'Copper',
  },
  6: { // Saturday
    planet: 'Saturn',
    dayName: 'Saturday',
    element: 'Earth',
    quality: 'Discipline, Structure, Endings',
    ritualSuggestion: 'Saturn Banishing. Ideal for binding, restriction, ending bad habits, and karmic work.',
    color: '#6B6B6B',
    metal: 'Lead',
  },
};

/**
 * Get the planetary ruler for a given date
 */
export function getRulerOfDay(date: Date = new Date()): DayRuler {
  const dayOfWeek = date.getDay(); // 0=Sunday, 6=Saturday
  return DAY_RULERS[dayOfWeek];
}

/**
 * Get the symbol for the ruler of the day
 */
export function getRulerSymbol(date: Date = new Date()): string {
  const ruler = getRulerOfDay(date);
  return PLANET_SYMBOLS[ruler.planet];
}

/**
 * Format the ruler recommendation for the dashboard
 */
export function getRulerRecommendation(date: Date = new Date()): {
  planet: Planet;
  symbol: string;
  dayName: string;
  recommendation: string;
  color: string;
} {
  const ruler = getRulerOfDay(date);
  return {
    planet: ruler.planet,
    symbol: PLANET_SYMBOLS[ruler.planet],
    dayName: ruler.dayName,
    recommendation: `Today is ruled by ${ruler.planet}. ${ruler.ritualSuggestion}`,
    color: ruler.color,
  };
}

export { DayRuler };
