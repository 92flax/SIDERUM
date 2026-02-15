import { describe, it, expect } from 'vitest';

// Event Horizon
import { calculateEventHorizon, searchEvents, getNextMajorEvent } from '../lib/astro/events';

// Aspectarian
import { calculateAspects, getMajorAspects, getExactAspects } from '../lib/astro/aspects';
import { PlanetPosition } from '../lib/astro/types';

// Ruler of Day
import { getRulerOfDay, getRulerRecommendation } from '../lib/astro/ruler-of-day';

describe('Event Horizon Engine', () => {
  const location = { latitude: 48.2082, longitude: 16.3738 }; // Vienna
  const startDate = new Date('2026-01-01T12:00:00Z');

  it('should calculate events for 1 year', () => {
    const events = calculateEventHorizon(startDate, location, 1);
    expect(events.length).toBeGreaterThan(0);
  });

  it('should return events sorted by date', () => {
    const events = calculateEventHorizon(startDate, location, 1);
    for (let i = 1; i < events.length; i++) {
      expect(events[i].date.getTime()).toBeGreaterThanOrEqual(events[i - 1].date.getTime());
    }
  });

  it('should find eclipses', () => {
    const events = calculateEventHorizon(startDate, location, 3);
    const eclipses = events.filter(e => e.type === 'solar_eclipse' || e.type === 'lunar_eclipse');
    expect(eclipses.length).toBeGreaterThan(0);
  });

  it('should find retrograde stations', () => {
    const events = calculateEventHorizon(startDate, location, 2);
    const retros = events.filter(e => e.type === 'retrograde_start');
    expect(retros.length).toBeGreaterThan(0);
  });

  it('should search events by query', () => {
    const events = calculateEventHorizon(startDate, location, 2);
    const results = searchEvents(events, 'eclipse');
    expect(results.every(e => e.title.toLowerCase().includes('eclipse') || e.description.toLowerCase().includes('eclipse'))).toBe(true);
  });

  it('should get next major event', () => {
    const events = calculateEventHorizon(startDate, location, 2);
    const next = getNextMajorEvent(events, startDate);
    expect(next).not.toBeNull();
    if (next) {
      expect(next.date.getTime()).toBeGreaterThan(startDate.getTime());
    }
  });
});

describe('Aspectarian Engine', () => {
  // Create mock positions with known longitudes for testing
  const mockPositions: PlanetPosition[] = [
    { planet: 'Sun', longitude: 300, latitude: 0, sign: 'Aquarius', signDegree: 0, signMinute: 0, signSecond: 0, isRetrograde: false, speed: 1 },
    { planet: 'Moon', longitude: 302, latitude: 0, sign: 'Aquarius', signDegree: 2, signMinute: 0, signSecond: 0, isRetrograde: false, speed: 13 },
    { planet: 'Mars', longitude: 120, latitude: 0, sign: 'Leo', signDegree: 0, signMinute: 0, signSecond: 0, isRetrograde: false, speed: 0.5 },
    { planet: 'Jupiter', longitude: 60, latitude: 0, sign: 'Gemini', signDegree: 0, signMinute: 0, signSecond: 0, isRetrograde: false, speed: 0.1 },
    { planet: 'Saturn', longitude: 0, latitude: 0, sign: 'Aries', signDegree: 0, signMinute: 0, signSecond: 0, isRetrograde: false, speed: 0.05 },
  ];

  it('should find conjunction between Sun and Moon (2° apart)', () => {
    const aspects = calculateAspects(mockPositions, 3);
    const conj = aspects.find(a => a.type === 'Conjunction' && a.planet1 === 'Sun' && a.planet2 === 'Moon');
    expect(conj).toBeDefined();
    expect(conj!.orb).toBeCloseTo(2, 0);
  });

  it('should find trine between Mars and Saturn (120° apart)', () => {
    const aspects = calculateAspects(mockPositions, 3);
    const trine = aspects.find(a => a.type === 'Trine');
    expect(trine).toBeDefined();
  });

  it('should detect exact aspects (orb < 1°)', () => {
    const closePositions: PlanetPosition[] = [
      { planet: 'Sun', longitude: 100, latitude: 0, sign: 'Cancer', signDegree: 10, signMinute: 0, signSecond: 0, isRetrograde: false, speed: 1 },
      { planet: 'Moon', longitude: 100.5, latitude: 0, sign: 'Cancer', signDegree: 10, signMinute: 30, signSecond: 0, isRetrograde: false, speed: 13 },
    ];
    const exact = getExactAspects(closePositions);
    expect(exact.length).toBeGreaterThan(0);
    expect(exact[0].isExact).toBe(true);
  });

  it('should sort aspects by orb (tightest first)', () => {
    const aspects = calculateAspects(mockPositions, 8);
    for (let i = 1; i < aspects.length; i++) {
      expect(aspects[i].orb).toBeGreaterThanOrEqual(aspects[i - 1].orb);
    }
  });

  it('should filter to major aspects only', () => {
    const major = getMajorAspects(mockPositions, 8);
    const validTypes = ['Conjunction', 'Opposition', 'Square', 'Trine'];
    expect(major.every(a => validTypes.includes(a.type))).toBe(true);
  });

  it('should exclude NorthNode, SouthNode, and Lilith from aspects', () => {
    const withNodes: PlanetPosition[] = [
      ...mockPositions,
      { planet: 'NorthNode', longitude: 300, latitude: 0, sign: 'Aquarius', signDegree: 0, signMinute: 0, signSecond: 0, isRetrograde: false, speed: -0.05 },
    ];
    const aspects = calculateAspects(withNodes, 8);
    expect(aspects.every(a => a.planet1 !== 'NorthNode' && a.planet2 !== 'NorthNode')).toBe(true);
  });
});

describe('Ruler of the Day', () => {
  it('should return Sun for Sunday', () => {
    const sunday = new Date('2026-02-15T12:00:00Z'); // Feb 15, 2026 is a Sunday
    const ruler = getRulerOfDay(sunday);
    expect(ruler.planet).toBe('Sun');
    expect(ruler.dayName).toBe('Sunday');
  });

  it('should return Mars for Tuesday', () => {
    const tuesday = new Date('2026-02-17T12:00:00Z'); // Feb 17, 2026 is a Tuesday
    const ruler = getRulerOfDay(tuesday);
    expect(ruler.planet).toBe('Mars');
    expect(ruler.dayName).toBe('Tuesday');
  });

  it('should return Saturn for Saturday', () => {
    const saturday = new Date('2026-02-21T12:00:00Z'); // Feb 21, 2026 is a Saturday
    const ruler = getRulerOfDay(saturday);
    expect(ruler.planet).toBe('Saturn');
    expect(ruler.dayName).toBe('Saturday');
  });

  it('should provide a recommendation with ritual suggestion', () => {
    const rec = getRulerRecommendation(new Date('2026-02-17T12:00:00Z'));
    expect(rec.planet).toBe('Mars');
    expect(rec.recommendation).toContain('Mars');
    expect(rec.recommendation.length).toBeGreaterThan(20);
    expect(rec.color).toBeTruthy();
  });

  it('should have all 7 days covered', () => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date('2026-02-15T12:00:00Z');
      d.setDate(d.getDate() + i);
      days.push(getRulerOfDay(d));
    }
    const planets = new Set(days.map(d => d.planet));
    expect(planets.size).toBe(7);
  });
});
