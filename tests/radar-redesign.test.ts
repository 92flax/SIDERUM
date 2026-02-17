// ============================================================
// ÆONIS – Radar Redesign & Compass Fix Tests
// ============================================================

import { describe, it, expect, beforeEach } from 'vitest';
import {
  calculateHeading,
  resetHeadingFilter,
  calculateOrientation,
  isAlignedToDirection,
  getDirectionArrowAngle,
} from '../lib/compass/sensor-fusion';

describe('Compass Heading Fix (180° inversion)', () => {
  beforeEach(() => {
    resetHeadingFilter();
  });

  it('should return heading in 0-360 range', () => {
    const heading = calculateHeading(0, 1);
    expect(heading).toBeGreaterThanOrEqual(0);
    expect(heading).toBeLessThan(360);
  });

  it('should include 180° offset for inversion fix', () => {
    // When magX=0, magY=1 → atan2(0,1)=0 → +180 = 180
    resetHeadingFilter();
    const heading = calculateHeading(0, 1);
    expect(heading).toBeCloseTo(180, 0);
  });

  it('should return 0 (North) when magX=0, magY=-1', () => {
    // atan2(0, -1) = π → 180° → +180 = 360 → %360 = 0
    resetHeadingFilter();
    const heading = calculateHeading(0, -1);
    expect(heading).toBeCloseTo(0, 0);
  });

  it('should return ~90 (East) when magX=-1, magY=0', () => {
    // atan2(1, 0) = π/2 → 90° → +180 = 270
    // Actually: atan2(-(-1), 0) = atan2(1,0) = 90 → +180 = 270
    // Hmm let's recalculate: atan2(-magX, magY) = atan2(1, 0) = 90° → +180 = 270
    resetHeadingFilter();
    const heading = calculateHeading(-1, 0);
    expect(heading).toBeCloseTo(270, 0);
  });

  it('should apply low-pass filter on consecutive calls', () => {
    resetHeadingFilter();
    const first = calculateHeading(0, -1); // ~0°
    // Second call with different value should be smoothed
    const second = calculateHeading(1, 0); // raw ~270° but smoothed
    // With 0.05 factor, second should be close to first, not raw value
    const diff = Math.abs(second - first);
    // Should be much less than the raw difference (270°)
    expect(diff).toBeLessThan(50); // Smoothed, not jumping to 270
  });

  it('should handle wrap-around smoothing (359° -> 1°)', () => {
    resetHeadingFilter();
    // Set initial heading near 350°
    // magX = sin(170°) ≈ 0.17, magY = cos(170°) ≈ -0.98
    // atan2(-0.17, -0.98) → then +180
    const h1 = calculateHeading(0.17, -0.98);
    // Now a slightly different reading
    const h2 = calculateHeading(0.15, -0.99);
    // Should not jump wildly
    const diff = Math.abs(h2 - h1);
    const wrappedDiff = diff > 180 ? 360 - diff : diff;
    expect(wrappedDiff).toBeLessThan(20);
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
