// ============================================================
// ÆONIS – Event Horizon Engine
// Calculates upcoming astronomical events for 5 years
// Types: Eclipses, Planetary Stations, Great Conjunctions
// ============================================================

import * as Astronomy from 'astronomy-engine';
import { Planet, LocationInput, PLANET_SYMBOLS } from './types';

export interface AstroEvent {
  id: string;
  type: 'solar_eclipse' | 'lunar_eclipse' | 'retrograde_start' | 'retrograde_end' | 'conjunction' | 'opposition';
  title: string;
  description: string;
  date: Date;
  planet?: Planet;
  planet2?: Planet;
  magnitude?: number;
  visibility?: string;
}

const OUTER_PLANETS: Array<{ planet: Planet; body: Astronomy.Body }> = [
  { planet: 'Mercury', body: Astronomy.Body.Mercury },
  { planet: 'Venus', body: Astronomy.Body.Venus },
  { planet: 'Mars', body: Astronomy.Body.Mars },
  { planet: 'Jupiter', body: Astronomy.Body.Jupiter },
  { planet: 'Saturn', body: Astronomy.Body.Saturn },
];

const CONJUNCTION_PAIRS: Array<{ p1: Planet; b1: Astronomy.Body; p2: Planet; b2: Astronomy.Body }> = [
  { p1: 'Jupiter', b1: Astronomy.Body.Jupiter, p2: 'Saturn', b2: Astronomy.Body.Saturn },
  { p1: 'Mars', b1: Astronomy.Body.Mars, p2: 'Jupiter', b2: Astronomy.Body.Jupiter },
  { p1: 'Venus', b1: Astronomy.Body.Venus, p2: 'Jupiter', b2: Astronomy.Body.Jupiter },
  { p1: 'Venus', b1: Astronomy.Body.Venus, p2: 'Mars', b2: Astronomy.Body.Mars },
  { p1: 'Mercury', b1: Astronomy.Body.Mercury, p2: 'Venus', b2: Astronomy.Body.Venus },
];

/**
 * Find solar eclipses in a date range
 */
function findSolarEclipses(startDate: Date, years: number): AstroEvent[] {
  const events: AstroEvent[] = [];
  const startTime = Astronomy.MakeTime(startDate);
  let searchTime = startTime;

  for (let i = 0; i < years * 3; i++) {
    try {
      const eclipse = Astronomy.SearchGlobalSolarEclipse(searchTime);
      if (!eclipse) break;

      const eclDate = new Date(eclipse.peak.date);
      const endDate = new Date(startDate.getTime() + years * 365.25 * 86400000);
      if (eclDate > endDate) break;

      let eclType = 'Solar Eclipse';
      if (eclipse.kind === 'total') eclType = 'Total Solar Eclipse';
      else if (eclipse.kind === 'annular') eclType = 'Annular Solar Eclipse';
      else if (eclipse.kind === 'partial') eclType = 'Partial Solar Eclipse';

      events.push({
        id: `solar_ecl_${eclDate.getTime()}`,
        type: 'solar_eclipse',
        title: eclType,
        description: `${eclType} on ${eclDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}. Obscuration: ${((eclipse.obscuration ?? 0) * 100).toFixed(0)}%`,
        date: eclDate,
        magnitude: eclipse.obscuration ?? 0,
      });

      // Search for next eclipse after this one
      searchTime = Astronomy.MakeTime(new Date(eclDate.getTime() + 30 * 86400000));
    } catch {
      break;
    }
  }

  return events;
}

/**
 * Find lunar eclipses in a date range
 */
function findLunarEclipses(startDate: Date, years: number): AstroEvent[] {
  const events: AstroEvent[] = [];
  const startTime = Astronomy.MakeTime(startDate);
  let searchTime = startTime;

  for (let i = 0; i < years * 3; i++) {
    try {
      const eclipse = Astronomy.SearchLunarEclipse(searchTime);
      if (!eclipse) break;

      const eclDate = new Date(eclipse.peak.date);
      const endDate = new Date(startDate.getTime() + years * 365.25 * 86400000);
      if (eclDate > endDate) break;

      let eclType = 'Lunar Eclipse';
      if (eclipse.kind === 'total') eclType = 'Total Lunar Eclipse';
      else if (eclipse.kind === 'partial') eclType = 'Partial Lunar Eclipse';
      else if (eclipse.kind === 'penumbral') eclType = 'Penumbral Lunar Eclipse';

      events.push({
        id: `lunar_ecl_${eclDate.getTime()}`,
        type: 'lunar_eclipse',
        title: eclType,
        description: `${eclType} on ${eclDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}. Magnitude: ${(eclipse.obscuration ?? 0).toFixed(2)}`,
        date: eclDate,
        magnitude: eclipse.obscuration ?? 0,
      });

      searchTime = Astronomy.MakeTime(new Date(eclDate.getTime() + 30 * 86400000));
    } catch {
      break;
    }
  }

  return events;
}

/**
 * Find planetary stations (retrograde start/end) in a date range
 */
function findPlanetaryStations(startDate: Date, years: number): AstroEvent[] {
  const events: AstroEvent[] = [];
  const endDate = new Date(startDate.getTime() + years * 365.25 * 86400000);

  for (const { planet, body } of OUTER_PLANETS) {
    // Search for elongation events to approximate stations
    // We'll check speed changes by sampling positions
    const stepDays = planet === 'Mercury' || planet === 'Venus' ? 5 : 10;
    let prevSpeed = 0;
    let wasRetro = false;

    for (let d = 0; d < years * 365; d += stepDays) {
      const checkDate = new Date(startDate.getTime() + d * 86400000);
      if (checkDate > endDate) break;

      const time = Astronomy.MakeTime(checkDate);
      const timePlus = Astronomy.MakeTime(new Date(checkDate.getTime() + 86400000));

      try {
        const geoVec = Astronomy.GeoVector(body, time, false);
        const ecl = Astronomy.Ecliptic(geoVec);
        const geoVecPlus = Astronomy.GeoVector(body, timePlus, false);
        const eclPlus = Astronomy.Ecliptic(geoVecPlus);

        let speed = eclPlus.elon - ecl.elon;
        if (speed > 180) speed -= 360;
        if (speed < -180) speed += 360;

        const isRetro = speed < 0;

        if (d > 0) {
          if (isRetro && !wasRetro) {
            events.push({
              id: `retro_start_${planet}_${checkDate.getTime()}`,
              type: 'retrograde_start',
              title: `${PLANET_SYMBOLS[planet]} ${planet} Retrograde`,
              description: `${planet} stations retrograde. Apparent backward motion begins.`,
              date: checkDate,
              planet,
            });
          } else if (!isRetro && wasRetro) {
            events.push({
              id: `retro_end_${planet}_${checkDate.getTime()}`,
              type: 'retrograde_end',
              title: `${PLANET_SYMBOLS[planet]} ${planet} Direct`,
              description: `${planet} stations direct. Forward motion resumes.`,
              date: checkDate,
              planet,
            });
          }
        }

        wasRetro = isRetro;
        prevSpeed = speed;
      } catch {
        continue;
      }
    }
  }

  return events;
}

/**
 * Find close conjunctions between planet pairs
 */
function findConjunctions(startDate: Date, years: number): AstroEvent[] {
  const events: AstroEvent[] = [];
  const endDate = new Date(startDate.getTime() + years * 365.25 * 86400000);
  const stepDays = 7;

  for (const { p1, b1, p2, b2 } of CONJUNCTION_PAIRS) {
    let prevSep = 999;

    for (let d = 0; d < years * 365; d += stepDays) {
      const checkDate = new Date(startDate.getTime() + d * 86400000);
      if (checkDate > endDate) break;

      try {
        const time = Astronomy.MakeTime(checkDate);
        const g1 = Astronomy.GeoVector(b1, time, false);
        const e1 = Astronomy.Ecliptic(g1);
        const g2 = Astronomy.GeoVector(b2, time, false);
        const e2 = Astronomy.Ecliptic(g2);

        let sep = Math.abs(e1.elon - e2.elon);
        if (sep > 180) sep = 360 - sep;

        // Detect conjunction (separation < 5° and was decreasing)
        if (sep < 5 && prevSep > sep) {
          // Check if this is a local minimum
          const nextDate = new Date(checkDate.getTime() + stepDays * 86400000);
          const nextTime = Astronomy.MakeTime(nextDate);
          const ng1 = Astronomy.GeoVector(b1, nextTime, false);
          const ne1 = Astronomy.Ecliptic(ng1);
          const ng2 = Astronomy.GeoVector(b2, nextTime, false);
          const ne2 = Astronomy.Ecliptic(ng2);
          let nextSep = Math.abs(ne1.elon - ne2.elon);
          if (nextSep > 180) nextSep = 360 - nextSep;

          if (nextSep > sep) {
            events.push({
              id: `conj_${p1}_${p2}_${checkDate.getTime()}`,
              type: 'conjunction',
              title: `${PLANET_SYMBOLS[p1]}${PLANET_SYMBOLS[p2]} ${p1}–${p2} Conjunction`,
              description: `${p1} and ${p2} in conjunction (${sep.toFixed(1)}° separation).`,
              date: checkDate,
              planet: p1,
              planet2: p2,
              magnitude: sep,
            });
          }
        }

        prevSep = sep;
      } catch {
        continue;
      }
    }
  }

  return events;
}

/**
 * Calculate all events for the next N years
 */
export function calculateEventHorizon(
  startDate: Date,
  location: LocationInput,
  years: number = 5,
): AstroEvent[] {
  const allEvents: AstroEvent[] = [
    ...findSolarEclipses(startDate, years),
    ...findLunarEclipses(startDate, years),
    ...findPlanetaryStations(startDate, years),
    ...findConjunctions(startDate, years),
  ];

  // Sort by date
  allEvents.sort((a, b) => a.date.getTime() - b.date.getTime());

  return allEvents;
}

/**
 * Search events by query string
 */
export function searchEvents(events: AstroEvent[], query: string): AstroEvent[] {
  const lower = query.toLowerCase().trim();
  if (!lower) return events;

  return events.filter(e =>
    e.title.toLowerCase().includes(lower) ||
    e.description.toLowerCase().includes(lower) ||
    (e.planet && e.planet.toLowerCase().includes(lower)) ||
    e.type.replace(/_/g, ' ').includes(lower)
  );
}

/**
 * Get the next immediate major event
 */
export function getNextMajorEvent(events: AstroEvent[], fromDate: Date = new Date()): AstroEvent | null {
  return events.find(e => e.date > fromDate) || null;
}
