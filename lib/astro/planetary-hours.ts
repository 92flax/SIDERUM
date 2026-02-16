// ============================================================
// ÆONIS – Planetary Hours Calculator (Chaldean Order)
// ============================================================

import * as Astronomy from 'astronomy-engine';
import { Planet, LocationInput } from './types';

// Chaldean order of planets (for planetary hours)
const CHALDEAN_ORDER: Planet[] = [
  'Saturn', 'Jupiter', 'Mars', 'Sun', 'Venus', 'Mercury', 'Moon',
];

// Day rulers (Sunday=Sun, Monday=Moon, etc.)
const DAY_RULERS: Planet[] = [
  'Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn',
];

export interface PlanetaryHour {
  planet: Planet;
  startTime: Date;
  endTime: Date;
  hourNumber: number; // 1-24
  isDayHour: boolean;
}

export interface PlanetaryHourInfo {
  currentHour: PlanetaryHour;
  dayRuler: Planet;
  allHours: PlanetaryHour[];
}

function getSunTimes(date: Date, location: LocationInput): { sunrise: Date; sunset: Date } {
  const observer = new Astronomy.Observer(location.latitude, location.longitude, 0);
  const time = Astronomy.MakeTime(date);

  // Search for sunrise and sunset around the given date
  const noon = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0);
  const noonTime = Astronomy.MakeTime(noon);

  try {
    const sunrise = Astronomy.SearchRiseSet(Astronomy.Body.Sun, observer, +1, noonTime, -12);
    const sunset = Astronomy.SearchRiseSet(Astronomy.Body.Sun, observer, -1, noonTime, 12);

    if (sunrise && sunset) {
      return { sunrise: sunrise.date, sunset: sunset.date };
    }
  } catch {
    // Fallback for polar regions
  }

  // Fallback: assume 6am sunrise, 6pm sunset
  const fallbackSunrise = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 6, 0, 0);
  const fallbackSunset = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 18, 0, 0);
  return { sunrise: fallbackSunrise, sunset: fallbackSunset };
}

export function calculatePlanetaryHours(date: Date, location: LocationInput): PlanetaryHourInfo {
  const dayOfWeek = date.getDay(); // 0=Sunday
  const dayRuler = DAY_RULERS[dayOfWeek];

  // Find the starting index in Chaldean order for this day's ruler
  const rulerIndex = CHALDEAN_ORDER.indexOf(dayRuler);

  // Get sunrise/sunset for today and tomorrow
  const { sunrise, sunset } = getSunTimes(date, location);
  const tomorrow = new Date(date.getTime() + 86400000);
  const { sunrise: nextSunrise } = getSunTimes(tomorrow, location);

  // Calculate day and night hour durations
  const dayDuration = sunset.getTime() - sunrise.getTime();
  const nightDuration = nextSunrise.getTime() - sunset.getTime();
  const dayHourMs = dayDuration / 12;
  const nightHourMs = nightDuration / 12;

  const allHours: PlanetaryHour[] = [];

  // 12 day hours + 12 night hours
  for (let i = 0; i < 24; i++) {
    const isDayHour = i < 12;
    const hourInPeriod = i < 12 ? i : i - 12;
    const hourMs = isDayHour ? dayHourMs : nightHourMs;
    const periodStart = isDayHour ? sunrise : sunset;

    const startTime = new Date(periodStart.getTime() + hourInPeriod * hourMs);
    const endTime = new Date(startTime.getTime() + hourMs);

    // Planet for this hour: cycle through Chaldean order starting from day ruler
    const planetIndex = (rulerIndex + i) % 7;
    const planet = CHALDEAN_ORDER[planetIndex];

    allHours.push({
      planet,
      startTime,
      endTime,
      hourNumber: i + 1,
      isDayHour,
    });
  }

  // Find current hour
  const now = date.getTime();
  let currentHour = allHours[0];
  for (const hour of allHours) {
    if (now >= hour.startTime.getTime() && now < hour.endTime.getTime()) {
      currentHour = hour;
      break;
    }
  }

  return { currentHour, dayRuler, allHours };
}

// Moon phase calculation
export interface MoonPhaseInfo {
  phase: number; // 0-1 (0=new, 0.25=first quarter, 0.5=full, 0.75=last quarter)
  phaseName: string;
  illumination: number; // 0-100%
  emoji: string;
}

export function calculateMoonPhase(date: Date): MoonPhaseInfo {
  const time = Astronomy.MakeTime(date);
  const phase = Astronomy.MoonPhase(time);
  const illumination = Astronomy.Illumination(Astronomy.Body.Moon, time);

  // Phase angle is 0-360
  const phaseNorm = phase / 360;
  const illumPct = illumination.phase_fraction * 100;

  let phaseName: string;
  let emoji: string;

  if (phase < 22.5) {
    phaseName = 'New Moon';
    emoji = '🌑';
  } else if (phase < 67.5) {
    phaseName = 'Waxing Crescent';
    emoji = '🌒';
  } else if (phase < 112.5) {
    phaseName = 'First Quarter';
    emoji = '🌓';
  } else if (phase < 157.5) {
    phaseName = 'Waxing Gibbous';
    emoji = '🌔';
  } else if (phase < 202.5) {
    phaseName = 'Full Moon';
    emoji = '🌕';
  } else if (phase < 247.5) {
    phaseName = 'Waning Gibbous';
    emoji = '🌖';
  } else if (phase < 292.5) {
    phaseName = 'Last Quarter';
    emoji = '🌗';
  } else if (phase < 337.5) {
    phaseName = 'Waning Crescent';
    emoji = '🌘';
  } else {
    phaseName = 'New Moon';
    emoji = '🌑';
  }

  return { phase: phaseNorm, phaseName, illumination: illumPct, emoji };
}
