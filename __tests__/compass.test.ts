import { describe, it, expect } from 'vitest';
import {
  calculateHeading,
  calculateOrientation,
  isAlignedToDirection,
  detectTracingMotion,
  getDirectionArrowAngle,
} from '../lib/compass/sensor-fusion';

describe('Compass Sensor Fusion', () => {
  it('should calculate heading from magnetometer data', () => {
    const heading = calculateHeading(0, 1);
    expect(heading).toBeGreaterThanOrEqual(0);
    expect(heading).toBeLessThan(360);
  });

  it('should calculate orientation from accelerometer data', () => {
    const { pitch, roll } = calculateOrientation(0, 0, 1);
    expect(typeof pitch).toBe('number');
    expect(typeof roll).toBe('number');
  });

  it('should detect alignment to NORTH at heading 0', () => {
    expect(isAlignedToDirection(0, 'NORTH', 15)).toBe(true);
    expect(isAlignedToDirection(10, 'NORTH', 15)).toBe(true);
    expect(isAlignedToDirection(350, 'NORTH', 15)).toBe(true);
    expect(isAlignedToDirection(30, 'NORTH', 15)).toBe(false);
  });

  it('should detect alignment to EAST at heading 90', () => {
    expect(isAlignedToDirection(90, 'EAST', 15)).toBe(true);
    expect(isAlignedToDirection(80, 'EAST', 15)).toBe(true);
    expect(isAlignedToDirection(100, 'EAST', 15)).toBe(true);
    expect(isAlignedToDirection(120, 'EAST', 15)).toBe(false);
  });

  it('should detect alignment to SOUTH at heading 180', () => {
    expect(isAlignedToDirection(180, 'SOUTH', 15)).toBe(true);
    expect(isAlignedToDirection(170, 'SOUTH', 15)).toBe(true);
  });

  it('should detect alignment to WEST at heading 270', () => {
    expect(isAlignedToDirection(270, 'WEST', 15)).toBe(true);
  });

  it('ZENITH should always return true', () => {
    expect(isAlignedToDirection(0, 'ZENITH', 15)).toBe(true);
    expect(isAlignedToDirection(180, 'ZENITH', 15)).toBe(true);
  });

  it('should not detect tracing with insufficient data', () => {
    expect(detectTracingMotion([])).toBe(false);
    expect(detectTracingMotion([{ x: 0, y: 0, z: 0, timestamp: 0 }])).toBe(false);
  });

  it('should detect tracing with significant motion', () => {
    const history = Array.from({ length: 15 }, (_, i) => ({
      x: Math.sin(i * 0.5) * 2,
      y: Math.cos(i * 0.5) * 2,
      z: 0,
      timestamp: i * 50,
    }));
    const result = detectTracingMotion(history, 1.5);
    expect(result).toBe(true);
  });

  it('should calculate direction arrow angle', () => {
    // Facing North, target East -> arrow should point right (90°)
    expect(getDirectionArrowAngle(0, 'EAST')).toBe(90);
    // Facing East, target North -> arrow should point left (270°)
    expect(getDirectionArrowAngle(90, 'NORTH')).toBe(270);
    // Facing South, target South -> arrow should point forward (0°)
    expect(getDirectionArrowAngle(180, 'SOUTH')).toBe(0);
  });
});
