// ============================================================
// ÆONIS – Astrological Core Types
// ============================================================

export type ZodiacSign =
  | 'Aries' | 'Taurus' | 'Gemini' | 'Cancer'
  | 'Leo' | 'Virgo' | 'Libra' | 'Scorpio'
  | 'Sagittarius' | 'Capricorn' | 'Aquarius' | 'Pisces';

export type Planet =
  | 'Sun' | 'Moon' | 'Mercury' | 'Venus' | 'Mars'
  | 'Jupiter' | 'Saturn' | 'Uranus' | 'Neptune' | 'Pluto'
  | 'NorthNode' | 'SouthNode' | 'Lilith';

export type Sect = 'Day' | 'Night';

export type DignityType =
  | 'Domicile' | 'Exaltation' | 'Triplicity'
  | 'Term' | 'Face' | 'Detriment' | 'Fall' | 'Peregrine';

export interface PlanetPosition {
  planet: Planet;
  longitude: number;        // 0-360 ecliptic longitude
  latitude: number;         // ecliptic latitude
  sign: ZodiacSign;
  signDegree: number;       // degree within sign (0-30)
  signMinute: number;       // minute within degree
  signSecond: number;       // second within minute
  isRetrograde: boolean;
  speed: number;            // daily speed in degrees
  // Horizontal coordinates (for compass)
  azimuth?: number;         // 0-360
  altitude?: number;        // -90 to +90
}

export interface EssentialDignity {
  domicile: boolean;
  exaltation: boolean;
  triplicity: boolean;
  term: boolean;
  face: boolean;
  detriment: boolean;
  fall: boolean;
  peregrine: boolean;
  score: number;            // dignity score
}

export interface PlanetCondition {
  isRetrograde: boolean;
  isCombust: boolean;       // within 8° of Sun
  isCazimi: boolean;        // within 17' of Sun
  isUnderBeams: boolean;    // within 17° of Sun
}

export interface ArabicPart {
  name: string;
  longitude: number;
  sign: ZodiacSign;
  signDegree: number;
}

export interface ChartData {
  timestamp: Date;
  latitude: number;
  longitude: number;
  timezone: string;
  sect: Sect;
  planets: PlanetPosition[];
  dignities: Record<Planet, EssentialDignity>;
  conditions: Record<Planet, PlanetCondition>;
  arabicParts: ArabicPart[];
  julianDay: number;
  localSiderealTime: number;
}

export interface LocationInput {
  latitude: number;
  longitude: number;
}

export const ZODIAC_SIGNS: ZodiacSign[] = [
  'Aries', 'Taurus', 'Gemini', 'Cancer',
  'Leo', 'Virgo', 'Libra', 'Scorpio',
  'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
];

export const ZODIAC_SYMBOLS: Record<ZodiacSign, string> = {
  Aries: '♈', Taurus: '♉', Gemini: '♊', Cancer: '♋',
  Leo: '♌', Virgo: '♍', Libra: '♎', Scorpio: '♏',
  Sagittarius: '♐', Capricorn: '♑', Aquarius: '♒', Pisces: '♓',
};

export const PLANET_SYMBOLS: Record<Planet, string> = {
  Sun: '☉', Moon: '☽', Mercury: '☿', Venus: '♀', Mars: '♂',
  Jupiter: '♃', Saturn: '♄', Uranus: '♅', Neptune: '♆', Pluto: '♇',
  NorthNode: '☊', SouthNode: '☋', Lilith: '⚸',
};

export const PLANET_COLORS: Record<Planet, string> = {
  Sun: '#D4AF37',
  Moon: '#C0C0C0',
  Mercury: '#A0A0A0',
  Venus: '#22C55E',
  Mars: '#EF4444',
  Jupiter: '#3B82F6',
  Saturn: '#6B7280',
  Uranus: '#06B6D4',
  Neptune: '#8B5CF6',
  Pluto: '#1F2937',
  NorthNode: '#D4AF37',
  SouthNode: '#6B6B6B',
  Lilith: '#4B0082',
};
