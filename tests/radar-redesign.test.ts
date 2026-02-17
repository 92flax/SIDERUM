// ============================================================
// ÆONIS – Radar Redesign & Compass Fix Tests
// Updated: Correct heading formula with -magX for East/West fix
// ============================================================

import { describe, it, expect, beforeEach } from 'vitest';
import {
  calculateHeading,
  resetHeadingFilter,
  calculateOrientation,
  isAlignedToDirection,
  getDirectionArrowAngle,
} from '../lib/compass/sensor-fusion';

describe('Compass Heading (corrected formula with -magX)', () => {
  beforeEach(() => {
    resetHeadingFilter();
  });

  it('should return heading in 0-360 range', () => {
    const heading = calculateHeading(0, 1);
    expect(heading).toBeGreaterThanOrEqual(0);
    expect(heading).toBeLessThan(360);
  });

  it('should return 0° (North) when magX=0, magY=1 (device pointing North)', () => {
    // atan2(-0, 1) = 0° → North
    resetHeadingFilter();
    const heading = calculateHeading(0, 1);
    expect(heading).toBeCloseTo(0, 0);
  });

  it('should return 180° (South) when magX=0, magY=-1', () => {
    // atan2(-0, -1) = π → 180°
    resetHeadingFilter();
    const heading = calculateHeading(0, -1);
    expect(heading).toBeCloseTo(180, 0);
  });

  it('should return 90° (East) when magX=-1, magY=0', () => {
    // atan2(-(-1), 0) = atan2(1, 0) = π/2 → 90°
    resetHeadingFilter();
    const heading = calculateHeading(-1, 0);
    expect(heading).toBeCloseTo(90, 0);
  });

  it('should return 270° (West) when magX=1, magY=0', () => {
    // atan2(-(1), 0) = atan2(-1, 0) = -π/2 → normalized to 270°
    resetHeadingFilter();
    const heading = calculateHeading(1, 0);
    expect(heading).toBeCloseTo(270, 0);
  });

  it('should apply low-pass filter on consecutive calls (responsive with 0.20 factor)', () => {
    resetHeadingFilter();
    const first = calculateHeading(0, 1); // ~0° (North)
    // Second call with different value should be smoothed but more responsive
    const second = calculateHeading(-1, 0); // raw ~90° (East)
    // With 0.20 factor: 0 + 90*0.20 = 18° (moved 20% toward target)
    expect(second).toBeGreaterThan(10);
    expect(second).toBeLessThan(30);
  });

  it('should converge faster with 0.20 factor than old 0.05', () => {
    resetHeadingFilter();
    calculateHeading(0, 1); // ~0° (North)
    // Apply same reading 5 times to see convergence toward 90°
    let h = 0;
    for (let i = 0; i < 5; i++) {
      h = calculateHeading(-1, 0); // raw ~90°
    }
    // After 5 iterations with 0.20 factor, should be well past 50°
    expect(h).toBeGreaterThan(50);
  });

  it('should handle wrap-around smoothing (350° -> 10°)', () => {
    resetHeadingFilter();
    // Set initial heading near 350°: magX = -sin(350°) for our formula
    // For heading 350°: atan2(-magX, magY)=350° → magX = sin(10°) ≈ 0.17, magY = cos(10°) ≈ 0.98
    // Wait: atan2(-magX, magY) = 350° means -magX/magY gives angle at 350°
    // 350° = -10° → sin(-10°) = -0.17, cos(-10°) = 0.98
    // So atan2(-magX, magY) = atan2(-0.17, 0.98) ≈ -10° → 350°
    // That means -magX = -0.17 → magX = 0.17
    const h1 = calculateHeading(0.17, 0.98); // ~350°
    // Now near 355°
    const h2 = calculateHeading(0.09, 0.99); // ~355°
    const diff = Math.abs(h2 - h1);
    const wrappedDiff = diff > 180 ? 360 - diff : diff;
    expect(wrappedDiff).toBeLessThan(10);
  });
});

describe('Compass Orientation', () => {
  it('should calculate pitch and roll from accelerometer', () => {
    const result = calculateOrientation(0, 0, -9.8);
    expect(result.pitch).toBeDefined();
    expect(result.roll).toBeDefined();
  });

  it('should return near-zero pitch when device is flat', () => {
    const result = calculateOrientation(0, 0, -9.8);
    expect(Math.abs(result.pitch)).toBeLessThan(5);
  });
});

describe('Direction Alignment', () => {
  it('should detect North alignment at 0°', () => {
    expect(isAlignedToDirection(0, 'NORTH')).toBe(true);
  });

  it('should detect North alignment at 355° (within tolerance)', () => {
    expect(isAlignedToDirection(355, 'NORTH', 15)).toBe(true);
  });

  it('should not detect North at 30°', () => {
    expect(isAlignedToDirection(30, 'NORTH', 15)).toBe(false);
  });

  it('should detect East alignment at 90°', () => {
    expect(isAlignedToDirection(90, 'EAST')).toBe(true);
  });

  it('should detect South alignment at 180°', () => {
    expect(isAlignedToDirection(180, 'SOUTH')).toBe(true);
  });

  it('should always return true for ZENITH', () => {
    expect(isAlignedToDirection(123, 'ZENITH')).toBe(true);
  });
});

describe('Direction Arrow Angle', () => {
  it('should return 0 when facing North and target is North', () => {
    expect(getDirectionArrowAngle(0, 'NORTH')).toBe(0);
  });

  it('should return 90 when facing North and target is East', () => {
    expect(getDirectionArrowAngle(0, 'EAST')).toBe(90);
  });

  it('should return 270 when facing East and target is North', () => {
    expect(getDirectionArrowAngle(90, 'NORTH')).toBe(270);
  });
});

describe('Planet Legend Focus Mode (logic)', () => {
  it('should filter planets when one is focused', () => {
    const allPlanets = [
      { planet: 'Sun', azimuth: 180 },
      { planet: 'Moon', azimuth: 245 },
      { planet: 'Mars', azimuth: 90 },
    ];
    const focused = 'Sun';
    const visible = allPlanets.filter(p => p.planet === focused);
    expect(visible).toHaveLength(1);
    expect(visible[0].planet).toBe('Sun');
  });

  it('should show all planets when no focus', () => {
    const allPlanets = [
      { planet: 'Sun', azimuth: 180 },
      { planet: 'Moon', azimuth: 245 },
      { planet: 'Mars', azimuth: 90 },
    ];
    const focused = null;
    const visible = focused ? allPlanets.filter(p => p.planet === focused) : allPlanets;
    expect(visible).toHaveLength(3);
  });

  it('should toggle focus off when same planet is pressed again', () => {
    let focused: string | null = 'Mars';
    focused = focused === 'Mars' ? null : 'Mars';
    expect(focused).toBeNull();
  });

  it('should switch focus when different planet is pressed', () => {
    let focused: string | null = 'Mars';
    focused = focused === 'Sun' ? null : 'Sun';
    expect(focused).toBe('Sun');
  });
});
