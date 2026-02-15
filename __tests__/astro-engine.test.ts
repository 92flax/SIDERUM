import { describe, it, expect } from 'vitest';
import { calculateChart } from '../lib/astro/engine';
import { calculateDignities } from '../lib/astro/dignities';
import { ZODIAC_SIGNS } from '../lib/astro/types';

describe('Astrological Core Engine', () => {
  const testDate = new Date('2025-03-21T12:00:00Z'); // Spring Equinox
  const testLocation = { latitude: 52.52, longitude: 13.405 }; // Berlin

  it('should calculate a chart with all required planets', () => {
    const chart = calculateChart(testDate, testLocation);

    expect(chart).toBeDefined();
    expect(chart.planets).toHaveLength(13); // 10 planets + NorthNode + SouthNode + Lilith

    const planetNames = chart.planets.map(p => p.planet);
    expect(planetNames).toContain('Sun');
    expect(planetNames).toContain('Moon');
    expect(planetNames).toContain('Mercury');
    expect(planetNames).toContain('Venus');
    expect(planetNames).toContain('Mars');
    expect(planetNames).toContain('Jupiter');
    expect(planetNames).toContain('Saturn');
    expect(planetNames).toContain('Uranus');
    expect(planetNames).toContain('Neptune');
    expect(planetNames).toContain('Pluto');
    expect(planetNames).toContain('NorthNode');
    expect(planetNames).toContain('SouthNode');
    expect(planetNames).toContain('Lilith');
  });

  it('should have valid longitude values (0-360)', () => {
    const chart = calculateChart(testDate, testLocation);

    for (const planet of chart.planets) {
      expect(planet.longitude).toBeGreaterThanOrEqual(0);
      expect(planet.longitude).toBeLessThan(360);
    }
  });

  it('should assign valid zodiac signs', () => {
    const chart = calculateChart(testDate, testLocation);

    for (const planet of chart.planets) {
      expect(ZODIAC_SIGNS).toContain(planet.sign);
      expect(planet.signDegree).toBeGreaterThanOrEqual(0);
      expect(planet.signDegree).toBeLessThan(30);
    }
  });

  it('should determine sect (Day or Night)', () => {
    const chart = calculateChart(testDate, testLocation);
    expect(['Day', 'Night']).toContain(chart.sect);
  });

  it('should calculate Arabic Parts', () => {
    const chart = calculateChart(testDate, testLocation);
    expect(chart.arabicParts).toHaveLength(2);
    expect(chart.arabicParts[0].name).toBe('Part of Fortune');
    expect(chart.arabicParts[1].name).toBe('Part of Spirit');
  });

  it('should calculate dignities for all planets', () => {
    const chart = calculateChart(testDate, testLocation);

    for (const planet of chart.planets) {
      const dignity = chart.dignities[planet.planet];
      expect(dignity).toBeDefined();
      expect(typeof dignity.domicile).toBe('boolean');
      expect(typeof dignity.exaltation).toBe('boolean');
      expect(typeof dignity.triplicity).toBe('boolean');
      expect(typeof dignity.term).toBe('boolean');
      expect(typeof dignity.face).toBe('boolean');
      expect(typeof dignity.detriment).toBe('boolean');
      expect(typeof dignity.fall).toBe('boolean');
    }
  });

  it('should calculate conditions for all planets', () => {
    const chart = calculateChart(testDate, testLocation);

    for (const planet of chart.planets) {
      const condition = chart.conditions[planet.planet];
      expect(condition).toBeDefined();
      expect(typeof condition.isRetrograde).toBe('boolean');
      expect(typeof condition.isCombust).toBe('boolean');
      expect(typeof condition.isCazimi).toBe('boolean');
      expect(typeof condition.isUnderBeams).toBe('boolean');
    }
  });

  it('should have azimuth and altitude for main planets', () => {
    const chart = calculateChart(testDate, testLocation);
    const mainPlanets = chart.planets.filter(p =>
      ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn'].includes(p.planet)
    );

    for (const planet of mainPlanets) {
      expect(planet.azimuth).toBeDefined();
      expect(planet.azimuth).toBeGreaterThanOrEqual(0);
      expect(planet.azimuth).toBeLessThan(360);
      expect(planet.altitude).toBeDefined();
    }
  });

  it('Sun should never be retrograde', () => {
    const chart = calculateChart(testDate, testLocation);
    const sunCondition = chart.conditions['Sun'];
    expect(sunCondition.isRetrograde).toBe(false);
  });
});

describe('Essential Dignities', () => {
  it('Sun should be in domicile in Leo', () => {
    const dignity = calculateDignities('Sun', 'Leo', 15, 'Day');
    expect(dignity.domicile).toBe(true);
    expect(dignity.score).toBeGreaterThan(0);
  });

  it('Sun should be in detriment in Aquarius', () => {
    const dignity = calculateDignities('Sun', 'Aquarius', 15, 'Day');
    expect(dignity.detriment).toBe(true);
    expect(dignity.score).toBeLessThan(0);
  });

  it('Sun should be exalted in Aries', () => {
    const dignity = calculateDignities('Sun', 'Aries', 15, 'Day');
    expect(dignity.exaltation).toBe(true);
  });

  it('Moon should be in domicile in Cancer', () => {
    const dignity = calculateDignities('Moon', 'Cancer', 15, 'Night');
    expect(dignity.domicile).toBe(true);
  });

  it('Mars should be in fall in Cancer', () => {
    const dignity = calculateDignities('Mars', 'Cancer', 15, 'Day');
    expect(dignity.fall).toBe(true);
  });

  it('Nodes should be peregrine', () => {
    const dignity = calculateDignities('NorthNode', 'Aries', 15, 'Day');
    expect(dignity.peregrine).toBe(true);
    expect(dignity.score).toBe(0);
  });
});
