import { describe, it, expect } from 'vitest';
import { calculatePlanetaryHours, calculateMoonPhase } from '../lib/astro/planetary-hours';
import { ELDER_FUTHARK, generateBindruneSVG, findRunesByKeyword } from '../lib/runes/futhark';
import { calculateChart } from '../lib/astro/engine';

describe('Planetary Hours (V2)', () => {
  it('calculates 24 planetary hours', () => {
    const date = new Date(2025, 2, 21, 12, 0, 0); // Spring Equinox noon
    const location = { latitude: 52.52, longitude: 13.405 };
    const result = calculatePlanetaryHours(date, location);

    expect(result.allHours).toHaveLength(24);
    expect(result.currentHour).toBeDefined();
    expect(result.dayRuler).toBeDefined();
  });

  it('assigns correct day ruler for Friday (Venus)', () => {
    // Friday = Venus
    const friday = new Date(2025, 2, 21, 12, 0, 0); // March 21, 2025 is a Friday
    const location = { latitude: 52.52, longitude: 13.405 };
    const result = calculatePlanetaryHours(friday, location);
    expect(result.dayRuler).toBe('Venus');
  });

  it('has 12 day hours and 12 night hours', () => {
    const date = new Date(2025, 2, 21, 12, 0, 0);
    const location = { latitude: 52.52, longitude: 13.405 };
    const result = calculatePlanetaryHours(date, location);

    const dayHours = result.allHours.filter(h => h.isDayHour);
    const nightHours = result.allHours.filter(h => !h.isDayHour);
    expect(dayHours).toHaveLength(12);
    expect(nightHours).toHaveLength(12);
  });

  it('planetary hour has valid planet assignment', () => {
    const date = new Date(2025, 5, 15, 14, 0, 0);
    const location = { latitude: 48.8566, longitude: 2.3522 }; // Paris
    const result = calculatePlanetaryHours(date, location);

    const validPlanets = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn'];
    result.allHours.forEach(hour => {
      expect(validPlanets).toContain(hour.planet);
    });
  });
});

describe('Moon Phase (V2)', () => {
  it('calculates moon phase with all fields', () => {
    const date = new Date(2025, 2, 21, 12, 0, 0);
    const result = calculateMoonPhase(date);

    expect(result.phase).toBeGreaterThanOrEqual(0);
    expect(result.phase).toBeLessThanOrEqual(1);
    expect(result.illumination).toBeGreaterThanOrEqual(0);
    expect(result.illumination).toBeLessThanOrEqual(100);
    expect(result.phaseName).toBeTruthy();
    expect(result.emoji).toBeTruthy();
  });
});

describe('Stemless Runes (V2)', () => {
  it('Gebo is marked as stemless', () => {
    const gebo = ELDER_FUTHARK.find(r => r.name === 'Gebo');
    expect(gebo).toBeDefined();
    expect(gebo!.isStemless).toBe(true);
    expect(gebo!.svgPath).toBeTruthy();
    expect(gebo!.branches).toHaveLength(0);
  });

  it('Ingwaz is marked as stemless', () => {
    const ingwaz = ELDER_FUTHARK.find(r => r.name === 'Ingwaz');
    expect(ingwaz).toBeDefined();
    expect(ingwaz!.isStemless).toBe(true);
    expect(ingwaz!.svgPath).toBeTruthy();
  });

  it('Jera is marked as stemless', () => {
    const jera = ELDER_FUTHARK.find(r => r.name === 'Jera');
    expect(jera).toBeDefined();
    expect(jera!.isStemless).toBe(true);
    expect(jera!.svgPath).toBeTruthy();
  });

  it('Dagaz is marked as stemless', () => {
    const dagaz = ELDER_FUTHARK.find(r => r.name === 'Dagaz');
    expect(dagaz).toBeDefined();
    expect(dagaz!.isStemless).toBe(true);
    expect(dagaz!.svgPath).toBeTruthy();
  });

  it('Fehu is NOT stemless', () => {
    const fehu = ELDER_FUTHARK.find(r => r.name === 'Fehu');
    expect(fehu).toBeDefined();
    expect(fehu!.isStemless).toBeUndefined();
    expect(fehu!.branches.length).toBeGreaterThan(0);
  });

  it('generates bindrune SVG with Fehu + Gebo + Uruz (stemless X must be visible)', () => {
    const fehu = ELDER_FUTHARK.find(r => r.name === 'Fehu')!;
    const gebo = ELDER_FUTHARK.find(r => r.name === 'Gebo')!;
    const uruz = ELDER_FUTHARK.find(r => r.name === 'Uruz')!;

    const svg = generateBindruneSVG([fehu, gebo, uruz]);

    // Must contain the central stave
    expect(svg).toContain('<line');
    // Must contain a <path> for Gebo's stemless X shape
    expect(svg).toContain('<path');
    // Must be valid SVG
    expect(svg).toContain('<svg');
    expect(svg).toContain('</svg>');
  });

  it('generates bindrune SVG with only stemless runes', () => {
    const gebo = ELDER_FUTHARK.find(r => r.name === 'Gebo')!;
    const ingwaz = ELDER_FUTHARK.find(r => r.name === 'Ingwaz')!;

    const svg = generateBindruneSVG([gebo, ingwaz]);

    // Should still have central stave
    expect(svg).toContain('<line');
    // Should have paths for both stemless runes
    const pathCount = (svg.match(/<path/g) || []).length;
    expect(pathCount).toBe(2);
  });
});

describe('Combust Bug Fix (V2)', () => {
  it('Sun should never have combust/under beams conditions in chart logic', () => {
    // This tests the rendering logic: the Sun cannot be combust to itself
    // The fix is in chart.tsx which filters out combust/under beams/cazimi for Sun
    // We verify the data model allows it but the UI should filter it
    const chart = calculateChart(new Date(2025, 2, 21, 12, 0, 0), { latitude: 52.52, longitude: 13.405 });

    // Sun's conditions should exist but combust should be false
    const sunCondition = chart.conditions['Sun'];
    expect(sunCondition).toBeDefined();
    // The engine itself should not mark Sun as combust
    expect(sunCondition.isCombust).toBe(false);
    expect(sunCondition.isCazimi).toBe(false);
    expect(sunCondition.isUnderBeams).toBe(false);
  });
});
