// ============================================================
// SIDERUM – Astrological Calculation Engine
// Uses astronomy-engine for high-precision planetary positions
// ============================================================

import * as Astronomy from 'astronomy-engine';
import {
  Planet, PlanetPosition, ChartData, Sect, ZodiacSign, ArabicPart,
  PlanetCondition, LocationInput, ZODIAC_SIGNS,
} from './types';
import { calculateDignities } from './dignities';

// Map our Planet names to astronomy-engine Body enum
const BODY_MAP: Partial<Record<Planet, Astronomy.Body>> = {
  Sun: Astronomy.Body.Sun,
  Moon: Astronomy.Body.Moon,
  Mercury: Astronomy.Body.Mercury,
  Venus: Astronomy.Body.Venus,
  Mars: Astronomy.Body.Mars,
  Jupiter: Astronomy.Body.Jupiter,
  Saturn: Astronomy.Body.Saturn,
  Uranus: Astronomy.Body.Uranus,
  Neptune: Astronomy.Body.Neptune,
  Pluto: Astronomy.Body.Pluto,
};

const PLANETS_TO_CALC: Planet[] = [
  'Sun', 'Moon', 'Mercury', 'Venus', 'Mars',
  'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto',
];

function longitudeToSign(longitude: number): { sign: ZodiacSign; degree: number; minute: number; second: number } {
  const normalized = ((longitude % 360) + 360) % 360;
  const signIndex = Math.floor(normalized / 30);
  const degInSign = normalized - signIndex * 30;
  const degree = Math.floor(degInSign);
  const minuteFloat = (degInSign - degree) * 60;
  const minute = Math.floor(minuteFloat);
  const second = Math.floor((minuteFloat - minute) * 60);
  return { sign: ZODIAC_SIGNS[signIndex], degree, minute, second };
}

function calcPlanetPosition(body: Astronomy.Body, date: Date): { longitude: number; latitude: number; speed: number } {
  const time = Astronomy.MakeTime(date);

  // Get ecliptic coordinates
  if (body === Astronomy.Body.Moon) {
    const ecliptic = Astronomy.EclipticGeoMoon(time);
    // Calculate speed by comparing positions 1 hour apart
    const timePlus = Astronomy.MakeTime(new Date(date.getTime() + 3600000));
    const eclipticPlus = Astronomy.EclipticGeoMoon(timePlus);
    let speed = (eclipticPlus.lon - ecliptic.lon) * 24; // degrees per day
    return { longitude: ecliptic.lon, latitude: ecliptic.lat, speed };
  }

  // For other bodies, use GeoVector to get ecliptic coordinates
  const geoVec = Astronomy.GeoVector(body, time, false);
  const ecl = Astronomy.Ecliptic(geoVec);

  // Speed calculation
  const timePlus = Astronomy.MakeTime(new Date(date.getTime() + 3600000));
  const geoVecPlus = Astronomy.GeoVector(body, timePlus, false);
  const eclPlus = Astronomy.Ecliptic(geoVecPlus);
  let speed = (eclPlus.elon - ecl.elon) * 24;
  // Handle wrap-around
  if (speed > 180) speed -= 360;
  if (speed < -180) speed += 360;

  return { longitude: ecl.elon, latitude: ecl.elat, speed };
}

function calcHorizontalCoords(
  body: Astronomy.Body,
  date: Date,
  location: LocationInput,
): { azimuth: number; altitude: number } {
  const time = Astronomy.MakeTime(date);
  const observer = new Astronomy.Observer(location.latitude, location.longitude, 0);
  const equatorial = body === Astronomy.Body.Moon
    ? Astronomy.Equator(body, time, observer, true, true)
    : Astronomy.Equator(body, time, observer, false, true);
  const horizontal = Astronomy.Horizon(time, observer, equatorial.ra, equatorial.dec, 'normal');
  return { azimuth: horizontal.azimuth, altitude: horizontal.altitude };
}

// Calculate Lunar Node (Mean North Node approximation)
function calcLunarNodes(date: Date): { northNode: number; southNode: number } {
  // Mean Lunar Node calculation
  const jd = Astronomy.MakeTime(date).ut + 2451545.0;
  const T = (jd - 2451545.0) / 36525.0;
  // Mean longitude of ascending node
  let omega = 125.04452 - 1934.136261 * T + 0.0020708 * T * T + T * T * T / 450000;
  omega = ((omega % 360) + 360) % 360;
  return { northNode: omega, southNode: (omega + 180) % 360 };
}

// Calculate Mean Black Moon Lilith
function calcLilith(date: Date): number {
  const jd = Astronomy.MakeTime(date).ut + 2451545.0;
  const T = (jd - 2451545.0) / 36525.0;
  // Mean apogee of Moon (Black Moon Lilith)
  let lilith = 83.3532465 + 4069.0137287 * T - 0.0103200 * T * T - T * T * T / 80053;
  lilith = ((lilith % 360) + 360) % 360;
  return lilith;
}

function determineSect(sunAltitude: number): Sect {
  return sunAltitude >= 0 ? 'Day' : 'Night';
}

function calcConditions(
  planet: Planet,
  planetLong: number,
  sunLong: number,
  speed: number,
): PlanetCondition {
  if (planet === 'Sun') {
    return { isRetrograde: false, isCombust: false, isCazimi: false, isUnderBeams: false };
  }

  const isRetrograde = speed < 0;

  // Angular distance from Sun
  let diff = Math.abs(planetLong - sunLong);
  if (diff > 180) diff = 360 - diff;

  const isCazimi = diff <= 17 / 60; // within 17 arcminutes
  const isCombust = !isCazimi && diff <= 8; // within 8 degrees
  const isUnderBeams = !isCombust && !isCazimi && diff <= 17; // within 17 degrees

  return { isRetrograde, isCombust, isCazimi, isUnderBeams };
}

function calcArabicParts(
  sunLong: number,
  moonLong: number,
  ascendant: number,
  sect: Sect,
): ArabicPart[] {
  // Part of Fortune: Day = Asc + Moon - Sun, Night = Asc + Sun - Moon
  let fortuneLong: number;
  if (sect === 'Day') {
    fortuneLong = ascendant + moonLong - sunLong;
  } else {
    fortuneLong = ascendant + sunLong - moonLong;
  }
  fortuneLong = ((fortuneLong % 360) + 360) % 360;

  // Part of Spirit: Day = Asc + Sun - Moon, Night = Asc + Moon - Sun
  let spiritLong: number;
  if (sect === 'Day') {
    spiritLong = ascendant + sunLong - moonLong;
  } else {
    spiritLong = ascendant + moonLong - sunLong;
  }
  spiritLong = ((spiritLong % 360) + 360) % 360;

  const fortuneSign = longitudeToSign(fortuneLong);
  const spiritSign = longitudeToSign(spiritLong);

  return [
    { name: 'Part of Fortune', longitude: fortuneLong, sign: fortuneSign.sign, signDegree: fortuneSign.degree },
    { name: 'Part of Spirit', longitude: spiritLong, sign: spiritSign.sign, signDegree: spiritSign.degree },
  ];
}

// Approximate Ascendant calculation
function calcAscendant(date: Date, location: LocationInput): number {
  const time = Astronomy.MakeTime(date);
  const observer = new Astronomy.Observer(location.latitude, location.longitude, 0);
  // Local Sidereal Time
  const gmst = Astronomy.SiderealTime(time);
  const lst = (gmst + location.longitude / 15) * 15; // convert to degrees

  // Obliquity of ecliptic
  const T = (time.ut) / 36525.0;
  const obliquity = 23.439291 - 0.0130042 * T;
  const oblRad = obliquity * Math.PI / 180;
  const lstRad = (((lst % 360) + 360) % 360) * Math.PI / 180;
  const latRad = location.latitude * Math.PI / 180;

  // Ascendant formula
  const y = -Math.cos(lstRad);
  const x = Math.sin(oblRad) * Math.tan(latRad) + Math.cos(oblRad) * Math.sin(lstRad);
  let asc = Math.atan2(y, x) * 180 / Math.PI;
  asc = ((asc % 360) + 360) % 360;

  return asc;
}

export function calculateChart(date: Date, location: LocationInput): ChartData {
  const positions: PlanetPosition[] = [];
  let sunLong = 0;
  let moonLong = 0;

  // Calculate main planets
  for (const planet of PLANETS_TO_CALC) {
    const body = BODY_MAP[planet]!;
    const pos = calcPlanetPosition(body, date);
    const horizontal = calcHorizontalCoords(body, date, location);
    const signInfo = longitudeToSign(pos.longitude);

    if (planet === 'Sun') sunLong = pos.longitude;
    if (planet === 'Moon') moonLong = pos.longitude;

    positions.push({
      planet,
      longitude: pos.longitude,
      latitude: pos.latitude,
      sign: signInfo.sign,
      signDegree: signInfo.degree,
      signMinute: signInfo.minute,
      signSecond: signInfo.second,
      isRetrograde: pos.speed < 0,
      speed: pos.speed,
      azimuth: horizontal.azimuth,
      altitude: horizontal.altitude,
    });
  }

  // Lunar Nodes
  const nodes = calcLunarNodes(date);
  const nnSign = longitudeToSign(nodes.northNode);
  const snSign = longitudeToSign(nodes.southNode);
  positions.push({
    planet: 'NorthNode', longitude: nodes.northNode, latitude: 0,
    sign: nnSign.sign, signDegree: nnSign.degree, signMinute: nnSign.minute, signSecond: nnSign.second,
    isRetrograde: true, speed: -0.053,
  });
  positions.push({
    planet: 'SouthNode', longitude: nodes.southNode, latitude: 0,
    sign: snSign.sign, signDegree: snSign.degree, signMinute: snSign.minute, signSecond: snSign.second,
    isRetrograde: true, speed: -0.053,
  });

  // Black Moon Lilith
  const lilithLong = calcLilith(date);
  const lilithSign = longitudeToSign(lilithLong);
  positions.push({
    planet: 'Lilith', longitude: lilithLong, latitude: 0,
    sign: lilithSign.sign, signDegree: lilithSign.degree, signMinute: lilithSign.minute, signSecond: lilithSign.second,
    isRetrograde: false, speed: 0.11,
  });

  // Determine sect from Sun's altitude
  const sunPos = positions.find(p => p.planet === 'Sun')!;
  const sect = determineSect(sunPos.altitude ?? 0);

  // Calculate dignities for all planets
  const dignities: Record<string, any> = {};
  for (const pos of positions) {
    dignities[pos.planet] = calculateDignities(pos.planet, pos.sign, pos.signDegree, sect);
  }

  // Calculate conditions
  const conditions: Record<string, any> = {};
  for (const pos of positions) {
    conditions[pos.planet] = calcConditions(pos.planet, pos.longitude, sunLong, pos.speed);
  }

  // Arabic Parts
  const ascendant = calcAscendant(date, location);
  const arabicParts = calcArabicParts(sunLong, moonLong, ascendant, sect);

  // Julian Day and LST
  const time = Astronomy.MakeTime(date);
  const gmst = Astronomy.SiderealTime(time);
  const lst = gmst + location.longitude / 15;

  return {
    timestamp: date,
    latitude: location.latitude,
    longitude: location.longitude,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    sect,
    planets: positions,
    dignities: dignities as any,
    conditions: conditions as any,
    arabicParts,
    julianDay: time.ut + 2451545.0,
    localSiderealTime: lst,
  };
}
