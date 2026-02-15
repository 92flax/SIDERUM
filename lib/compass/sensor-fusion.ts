// ============================================================
// SIDERUM – Sensor Fusion for Ritual Compass
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

// Calculate compass heading from magnetometer data
export function calculateHeading(magX: number, magY: number): number {
  let heading = Math.atan2(magY, magX) * (180 / Math.PI);
  heading = ((heading % 360) + 360) % 360;
  // Convert from math angle to compass bearing
  heading = (360 - heading + 90) % 360;
  return heading;
}

// Calculate pitch and roll from accelerometer
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
    NORTH: 0,
    EAST: 90,
    SOUTH: 180,
    WEST: 270,
    ZENITH: -1, // special: check pitch
    NADIR: -2,  // special: check pitch
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
