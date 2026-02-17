// ============================================================
// ÆONIS – Sensor Fusion for Ritual Compass
// Corrected 180° heading, robust low-pass filter, frame-aware
// ============================================================

import { Platform } from 'react-native';
import { Magnetometer, Accelerometer, Gyroscope } from 'expo-sensors';

export interface CompassData {
  heading: number;      // 0-360 degrees (magnetic north)
  pitch: number;        // device tilt forward/backward
  roll: number;         // device tilt left/right
  isAvailable: boolean;
}

export interface SensorSubscriptions {
  magnetometer: any;
  accelerometer: any;
  gyroscope: any;
}

// ===== Low-Pass Filter State =====
let _prevHeading: number | null = null;
const SMOOTHING_FACTOR = 0.05; // 95% previous + 5% current

/**
 * Reset the low-pass filter (call when re-subscribing sensors).
 */
export function resetHeadingFilter(): void {
  _prevHeading = null;
}

/**
 * Calculate compass heading from magnetometer data.
 *
 * FIX: The previous formula produced a 180° inverted result.
 * Correct approach:
 *   1. atan2(-magX, magY) → raw angle from magnetic north
 *   2. Normalize to 0-360
 *   3. Add 180° to correct the inversion
 *   4. Apply low-pass filter for stabilization
 */
export function calculateHeading(magX: number, magY: number): number {
  // atan2(-magX, magY) gives angle from magnetic north (Y-axis) clockwise
  let rawHeading = Math.atan2(-magX, magY) * (180 / Math.PI);
  // Normalize to 0-360
  rawHeading = ((rawHeading % 360) + 360) % 360;

  // Apply 180° inversion fix — corrects the reversed compass direction
  rawHeading = (rawHeading + 180) % 360;

  // Low-pass filter for stabilization: smoothed = prev*0.95 + curr*0.05
  if (_prevHeading === null) {
    _prevHeading = rawHeading;
    return rawHeading;
  }

  // Handle wrap-around (e.g. 359° -> 1°) using shortest-arc interpolation
  let diff = rawHeading - _prevHeading;
  if (diff > 180) diff -= 360;
  if (diff < -180) diff += 360;

  const smoothed = ((_prevHeading + diff * SMOOTHING_FACTOR) + 360) % 360;
  _prevHeading = smoothed;
  return smoothed;
}

/**
 * Calculate pitch and roll from accelerometer.
 * Respects gravity (Y-axis) for stable horizon line.
 */
export function calculateOrientation(accX: number, accY: number, accZ: number): { pitch: number; roll: number } {
  const pitch = Math.atan2(-accX, Math.sqrt(accY * accY + accZ * accZ)) * (180 / Math.PI);
  const roll = Math.atan2(accY, accZ) * (180 / Math.PI);
  return { pitch, roll };
}

// Check if user is facing a specific compass direction (±tolerance)
export function isAlignedToDirection(
  currentHeading: number,
  targetDirection: string,
  tolerance: number = 15,
): boolean {
  const directionMap: Record<string, number> = {
    NORTH: 0, EAST: 90, SOUTH: 180, WEST: 270,
    ZENITH: -1, NADIR: -2,
  };

  const targetDeg = directionMap[targetDirection];
  if (targetDeg === undefined) return false;
  if (targetDeg < 0) return true; // Zenith/Nadir handled separately

  let diff = Math.abs(currentHeading - targetDeg);
  if (diff > 180) diff = 360 - diff;
  return diff <= tolerance;
}

// Detect tracing motion from accelerometer data
export function detectTracingMotion(
  accHistory: Array<{ x: number; y: number; z: number; timestamp: number }>,
  threshold: number = 1.5,
): boolean {
  if (accHistory.length < 10) return false;

  const recent = accHistory.slice(-10);
  let totalMotion = 0;
  for (let i = 1; i < recent.length; i++) {
    const dx = recent[i].x - recent[i - 1].x;
    const dy = recent[i].y - recent[i - 1].y;
    const dz = recent[i].z - recent[i - 1].z;
    totalMotion += Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  return totalMotion > threshold;
}

// Direction arrow angle calculation
export function getDirectionArrowAngle(currentHeading: number, targetDirection: string): number {
  const directionMap: Record<string, number> = {
    NORTH: 0, EAST: 90, SOUTH: 180, WEST: 270,
  };
  const target = directionMap[targetDirection] ?? 0;
  return ((target - currentHeading) + 360) % 360;
}
