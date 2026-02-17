// ============================================================
// ÆONIS – Radar Screen (Digital Grimoire)
// Merged: compass.tsx (AR/Radar) + chart.tsx (PlanetCard list)
// Top: AR/Radar toggle view
// Bottom: Glassmorphism ScrollView with PlanetCards + Aspectarian
// ============================================================

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Text, View, StyleSheet, Dimensions, Platform, Pressable, Modal, ScrollView } from 'react-native';
import { Magnetometer, DeviceMotion } from 'expo-sensors';
import Svg, { Circle, Line, Text as SvgText, G, Rect } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { ScreenContainer } from '@/components/screen-container';
import { PaywallModal, ProBadge } from '@/components/paywall-modal';
import { useAstroStore } from '@/lib/astro/store';
import { useProStore } from '@/lib/store/pro-store';
import { calculateHeading } from '@/lib/compass/sensor-fusion';
import { getMajorAspects, Aspect } from '@/lib/astro/aspects';
import {
  PLANET_SYMBOLS, ZODIAC_SYMBOLS, PLANET_COLORS, Planet,
  PlanetPosition, EssentialDignity, PlanetCondition,
} from '@/lib/astro/types';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const RADAR_SIZE = Math.min(SCREEN_WIDTH - 64, 320);
const RADAR_CENTER = RADAR_SIZE / 2;
const RADAR_RADIUS = RADAR_SIZE / 2 - 30;

type ViewMode = 'radar' | 'ar';

const PLANET_NAMES: Record<string, string> = {
  Sun: 'Sun', Moon: 'Moon', Mercury: 'Mercury', Venus: 'Venus',
  Mars: 'Mars', Jupiter: 'Jupiter', Saturn: 'Saturn',
};

const PLANET_INFO: Record<string, { element: string; principle: string; description: string }> = {
  Sun:     { element: 'Fire', principle: 'Vitality & Will', description: 'The Sun represents the core self, ego, vitality, and creative force.' },
  Moon:    { element: 'Water', principle: 'Emotion & Intuition', description: 'The Moon governs emotions, instincts, the subconscious, and cycles of change.' },
  Mercury: { element: 'Air', principle: 'Communication & Intellect', description: 'Mercury rules thought, speech, writing, and commerce.' },
  Venus:   { element: 'Earth/Water', principle: 'Love & Harmony', description: 'Venus governs love, beauty, art, pleasure, and social bonds.' },
  Mars:    { element: 'Fire', principle: 'Action & Conflict', description: 'Mars rules energy, aggression, courage, and physical drive.' },
  Jupiter: { element: 'Fire/Air', principle: 'Expansion & Wisdom', description: 'Jupiter governs growth, abundance, philosophy, and higher learning.' },
  Saturn:  { element: 'Earth', principle: 'Structure & Limitation', description: 'Saturn rules discipline, time, boundaries, and karma.' },
};

const MAIN_PLANETS: Planet[] = [
  'Sun', 'Moon', 'Mercury', 'Venus', 'Mars',
  'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto',
  'NorthNode', 'SouthNode', 'Lilith',
];

const ASPECT_EXPLANATIONS: Record<string, { meaning: string; nature: string; keywords: string }> = {
  Conjunction: { meaning: 'Two planets merge their energies into a single, intensified force.', nature: 'Variable', keywords: 'Fusion, intensity, new beginnings' },
  Opposition: { meaning: 'Two planets face off across the sky, creating tension that demands balance.', nature: 'Challenging', keywords: 'Tension, awareness, balance' },
  Trine: { meaning: 'Two planets flow harmoniously in the same element.', nature: 'Harmonious', keywords: 'Harmony, talent, ease' },
  Square: { meaning: 'Two planets clash at 90°, driving growth through friction.', nature: 'Challenging', keywords: 'Friction, challenge, growth' },
  Sextile: { meaning: 'Two planets cooperate gently — an opportunity aspect.', nature: 'Supportive', keywords: 'Opportunity, cooperation, skill' },
};

const DIGNITY_EXPLANATIONS: Record<string, string> = {
  Domicile: 'The planet is in its home sign, where it has full authority.',
  Exaltation: 'The planet is honored and elevated, expressing its highest qualities.',
  Triplicity: 'The planet rules the element of the sign it occupies.',
  Term: 'The planet rules a specific degree range within the sign.',
  Face: 'The planet rules a 10° decan of the sign.',
  Detriment: 'The planet is in the sign opposite its domicile.',
  Fall: 'The planet is in the sign opposite its exaltation.',
  Peregrine: 'The planet has no essential dignity — a wanderer without support.',
  Retrograde: 'The planet appears to move backward, turning energy inward.',
  Cazimi: 'Within 17\' of the Sun — extremely powerful and purified.',
  Combust: 'Within 8° of the Sun, overwhelmed by solar energy.',
  'Under Beams': 'Within 17° of the Sun, partially obscured.',
};

const MOCK_POSITIONS: Record<string, { azimuth: number; altitude: number }> = {
  Sun: { azimuth: 180, altitude: 35 }, Moon: { azimuth: 245, altitude: 22 },
  Mercury: { azimuth: 165, altitude: 30 }, Venus: { azimuth: 210, altitude: 40 },
  Mars: { azimuth: 90, altitude: 15 }, Jupiter: { azimuth: 320, altitude: 50 },
  Saturn: { azimuth: 45, altitude: 10 },
};

interface ResolvedPosition {
  planet: PlanetPosition;
  px: number; py: number;
  labelX: number; labelY: number;
  color: string;
}

function safeNum(val: number | undefined, fallback: number): number {
  if (val === undefined || val === null || !isFinite(val) || isNaN(val)) return fallback;
  return val;
}

function resolveCollisions(positions: ResolvedPosition[], minDist: number = 28): ResolvedPosition[] {
  const resolved = [...positions];
  for (let iter = 0; iter < 5; iter++) {
    for (let i = 0; i < resolved.length; i++) {
      for (let j = i + 1; j < resolved.length; j++) {
        const dx = resolved[j].labelX - resolved[i].labelX;
        const dy = resolved[j].labelY - resolved[i].labelY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < minDist && dist > 0) {
          const overlap = (minDist - dist) / 2;
          const nx = dx / dist;
          const ny = dy / dist;
          resolved[i].labelX -= nx * overlap;
          resolved[i].labelY -= ny * overlap;
          resolved[j].labelX += nx * overlap;
          resolved[j].labelY += ny * overlap;
        }
      }
    }
  }
  return resolved;
}

function getScoreVerdict(score: number): { text: string; color: string } {
  if (score >= 7) return { text: 'Exceptional power. Ideal for rituals.', color: '#22C55E' };
  if (score >= 4) return { text: 'Strong dignity. Favorable conditions.', color: '#22C55E' };
  if (score >= 1) return { text: 'Moderate strength. Proceed with care.', color: '#4ADE80' };
  if (score === 0) return { text: 'Peregrine. Neutral influence.', color: '#6B6B6B' };
  if (score >= -4) return { text: 'Weakened. Consider alternatives.', color: '#F59E0B' };
  if (score >= -7) return { text: 'Debilitated. Exercise caution.', color: '#EF4444' };
  return { text: 'Extreme debility. Avoid if possible.', color: '#EF4444' };
}

function getAspectColor(type: string): string {
  switch (type) {
    case 'Conjunction': return '#D4AF37';
    case 'Trine': return '#22C55E';
    case 'Sextile': return '#3B82F6';
    case 'Square': return '#EF4444';
    case 'Opposition': return '#F59E0B';
    default: return '#6B6B6B';
  }
}

function getCardinalDirection(heading: number): string {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return dirs[Math.round(heading / 45) % 8];
}

export default function RadarScreen() {
  const [viewMode, setViewMode] = useState<ViewMode>('radar');
  const [heading, setHeading] = useState(0);
  const [pitch, setPitch] = useState(0);
  const [sensorAvailable, setSensorAvailable] = useState(true);
  const [focusedPlanet, setFocusedPlanet] = useState<Planet | null>(null);
  const [infoPlanet, setInfoPlanet] = useState<string | null>(null);
  const [showSheet, setShowSheet] = useState(true);
  const [showAspectarian, setShowAspectarian] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [selectedAspect, setSelectedAspect] = useState<Aspect | null>(null);
  const [selectedDignity, setSelectedDignity] = useState<string | null>(null);

  const chartData = useAstroStore((s) => s.chartData);
  const recalculate = useAstroStore((s) => s.recalculate);
  const isFeatureUnlocked = useProStore((s) => s.isFeatureUnlocked);

  useEffect(() => { recalculate(); }, []);

  // Magnetometer
  useEffect(() => {
    if (Platform.OS === ('web' as string)) { setSensorAvailable(false); return; }
    let magSub: any;
    const subscribe = async () => {
      try {
        const available = await Magnetometer.isAvailableAsync();
        if (!available) { setSensorAvailable(false); return; }
        Magnetometer.setUpdateInterval(100);
        magSub = Magnetometer.addListener((data) => {
          setHeading(safeNum(calculateHeading(data.x, data.y), 0));
        });
      } catch { setSensorAvailable(false); }
    };
    subscribe();
    return () => { magSub?.remove(); };
  }, []);

  // DeviceMotion for pitch
  useEffect(() => {
    if (Platform.OS === ('web' as string)) return;
    let motionSub: any;
    const subscribe = async () => {
      try {
        const available = await DeviceMotion.isAvailableAsync();
        if (!available) return;
        DeviceMotion.setUpdateInterval(100);
        motionSub = DeviceMotion.addListener((data) => {
          if (data.accelerationIncludingGravity) {
            const { y, z } = data.accelerationIncludingGravity;
            const pitchRad = Math.atan2(safeNum(z, 0), -safeNum(y, -9.8));
            setPitch(safeNum(pitchRad * (180 / Math.PI), 0));
          } else if (data.rotation) {
            setPitch(safeNum((data.rotation.beta * 180) / Math.PI, 0));
          }
        });
      } catch {}
    };
    subscribe();
    return () => { motionSub?.remove(); };
  }, []);

  const planets = useMemo(() => {
    const raw = chartData?.planets.filter(p =>
      ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn'].includes(p.planet)
    ) ?? [];
    return raw.map(p => {
      const mock = MOCK_POSITIONS[p.planet];
      return { ...p, azimuth: safeNum(p.azimuth, mock?.azimuth ?? 0), altitude: safeNum(p.altitude, mock?.altitude ?? 20) };
    });
  }, [chartData]);

  const aspects = useMemo(() => {
    if (!chartData) return [];
    return getMajorAspects(chartData.planets, 3);
  }, [chartData]);

  const allPlanets = useMemo(() => {
    if (!chartData) return [];
    return chartData.planets.filter(p => MAIN_PLANETS.includes(p.planet));
  }, [chartData]);

  const handlePlanetTap = useCallback((planet: Planet) => {
    if (Platform.OS !== ('web' as string)) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFocusedPlanet(prev => prev === planet ? null : planet);
  }, []);

  const handlePlanetInfo = useCallback((planet: string) => {
    if (Platform.OS !== ('web' as string)) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setInfoPlanet(planet);
  }, []);

  const altitudeRings = [
    { scale: 1.0, label: 'Horizon 0°' },
    { scale: 0.75, label: '30°' },
    { scale: 0.5, label: '60°' },
    { scale: 0.25, label: 'Zenith 90°' },
  ];

  // ==========================================
  // RADAR SVG VIEW
  // ==========================================
  const renderRadarView = useCallback(() => {
    const directions = [
      { label: 'N', angle: 0 }, { label: 'E', angle: 90 },
      { label: 'S', angle: 180 }, { label: 'W', angle: 270 },
    ];

    const rawPositions: ResolvedPosition[] = [];
    for (const planet of planets) {
      try {
        const relativeAz = ((safeNum(planet.azimuth, 0) - heading + 360) % 360);
        const rad = (relativeAz * Math.PI) / 180;
        const altFactor = Math.max(0.1, 1 - Math.abs(safeNum(planet.altitude, 20)) / 90);
        const dist = RADAR_RADIUS * altFactor;
        const px = safeNum(RADAR_CENTER + dist * Math.sin(rad), RADAR_CENTER);
        const py = safeNum(RADAR_CENTER - dist * Math.cos(rad), RADAR_CENTER);
        rawPositions.push({
          planet, px, py, labelX: px, labelY: py - 20,
          color: PLANET_COLORS[planet.planet] || '#E0E0E0',
        });
      } catch {}
    }

    const positions = resolveCollisions(rawPositions, 32);

    return (
      <View style={styles.radarContainer}>
        <Svg width={RADAR_SIZE} height={RADAR_SIZE} viewBox={`0 0 ${RADAR_SIZE} ${RADAR_SIZE}`}>
          {altitudeRings.map(({ scale, label }) => (
            <G key={label}>
              <Circle cx={RADAR_CENTER} cy={RADAR_CENTER} r={RADAR_RADIUS * scale}
                stroke="#1A1A1A" strokeWidth={scale === 1.0 ? 1.5 : 0.8} fill="none" />
              <SvgText x={RADAR_CENTER + RADAR_RADIUS * scale * 0.71}
                y={RADAR_CENTER - RADAR_RADIUS * scale * 0.71} fill="#333" fontSize={7} textAnchor="start">
                {label}
              </SvgText>
            </G>
          ))}

          {directions.map((dir) => {
            const rad = ((dir.angle - heading) * Math.PI) / 180;
            const x2 = RADAR_CENTER + RADAR_RADIUS * Math.sin(rad);
            const y2 = RADAR_CENTER - RADAR_RADIUS * Math.cos(rad);
            const labelDist = RADAR_RADIUS + 15;
            const labelX = RADAR_CENTER + labelDist * Math.sin(rad);
            const labelY = RADAR_CENTER - labelDist * Math.cos(rad);
            return (
              <G key={dir.label}>
                <Line x1={RADAR_CENTER} y1={RADAR_CENTER} x2={x2} y2={y2}
                  stroke={dir.label === 'N' ? '#D4AF3730' : '#1A1A1A'}
                  strokeWidth={dir.label === 'N' ? 1 : 0.5} strokeDasharray="4,4" />
                <SvgText x={labelX} y={labelY}
                  fill={dir.label === 'N' ? '#D4AF37' : '#6B6B6B'}
                  fontSize={12} fontWeight="bold" textAnchor="middle" alignmentBaseline="central">
                  {dir.label}
                </SvgText>
              </G>
            );
          })}

          <Circle cx={RADAR_CENTER} cy={RADAR_CENTER} r={3} fill="#D4AF37" opacity={0.8} />
          <Circle cx={RADAR_CENTER} cy={RADAR_CENTER} r={6} fill="none" stroke="#D4AF3740" strokeWidth={1} />

          {positions.map(({ planet, px, py, labelX, labelY, color }) => {
            const dignity = chartData?.dignities[planet.planet];
            const isStrong = dignity && dignity.score > 0;
            const isFocused = focusedPlanet === null || focusedPlanet === planet.planet;
            return (
              <G key={planet.planet} opacity={isFocused ? 1 : 0.3}>
                <Line x1={RADAR_CENTER} y1={RADAR_CENTER} x2={px} y2={py}
                  stroke={color + '30'} strokeWidth={0.8} strokeDasharray="2,3" />
                {isStrong && (
                  <>
                    <Circle cx={px} cy={py} r={18} fill={color + '08'} />
                    <Circle cx={px} cy={py} r={14} fill={color + '15'} />
                  </>
                )}
                <Circle cx={px} cy={py} r={7} fill={color} />
                <Circle cx={px} cy={py} r={7} fill="none" stroke={color} strokeWidth={1.5} opacity={0.4} />
                <SvgText x={labelX} y={labelY} fill={color} fontSize={14} fontWeight="bold" textAnchor="middle">
                  {PLANET_SYMBOLS[planet.planet]} {PLANET_NAMES[planet.planet] ?? planet.planet}
                </SvgText>
                <SvgText x={labelX} y={labelY + 22} fill="#6B6B6B" fontSize={8} textAnchor="middle">
                  Az {safeNum(planet.azimuth, 0).toFixed(0)}° Alt {safeNum(planet.altitude, 0).toFixed(0)}°
                </SvgText>
                <Rect x={px - 24} y={py - 24} width={48} height={48} fill="transparent"
                  onPress={() => handlePlanetTap(planet.planet)} />
              </G>
            );
          })}
        </Svg>
      </View>
    );
  }, [heading, planets, chartData, focusedPlanet]);

  // ==========================================
  // AR VIEW
  // ==========================================
  const renderARView = useCallback(() => {
    const viewCenterAlt = pitch;
    const AR_HEIGHT = 280;
    const ALT_RANGE = 60;

    return (
      <View style={styles.arContainer}>
        <View style={[styles.arBackground, { height: AR_HEIGHT }]}>
          {(() => {
            const horizonY = AR_HEIGHT / 2 + (viewCenterAlt / ALT_RANGE) * (AR_HEIGHT / 2);
            if (horizonY >= 0 && horizonY <= AR_HEIGHT) {
              return (
                <View style={[styles.arHorizon, { top: horizonY }]}>
                  <Text style={styles.arHorizonLabel}>— Horizon —</Text>
                </View>
              );
            }
            return null;
          })()}

          <View style={styles.pitchIndicator}>
            <Text style={styles.pitchText}>
              Tilt: {pitch.toFixed(0)}° | View Alt: {viewCenterAlt.toFixed(0)}°
            </Text>
          </View>

          {planets.map((planet) => {
            try {
              const az = safeNum(planet.azimuth, 0);
              const alt = safeNum(planet.altitude, 0);
              let relAz = az - heading;
              if (relAz > 180) relAz -= 360;
              if (relAz < -180) relAz += 360;
              if (Math.abs(relAz) > 60) return null;
              const altDiff = alt - viewCenterAlt;
              if (Math.abs(altDiff) > ALT_RANGE / 2) return null;
              const screenX = safeNum((SCREEN_WIDTH / 2) + (relAz / 60) * (SCREEN_WIDTH / 2), SCREEN_WIDTH / 2);
              const screenY = safeNum((AR_HEIGHT / 2) - (altDiff / (ALT_RANGE / 2)) * (AR_HEIGHT / 2), AR_HEIGHT / 2);
              const color = PLANET_COLORS[planet.planet] || '#E0E0E0';
              const isFocused = focusedPlanet === null || focusedPlanet === planet.planet;

              return (
                <Pressable key={planet.planet}
                  onPress={() => handlePlanetTap(planet.planet)}
                  style={[styles.arPlanet, { left: screenX - 30, top: screenY - 20, opacity: isFocused ? 1 : 0.3 }]}>
                  <Text style={[styles.arSymbol, { color }]}>{PLANET_SYMBOLS[planet.planet]}</Text>
                  <Text style={[styles.arName, { color }]}>{PLANET_NAMES[planet.planet] ?? planet.planet}</Text>
                  <Text style={styles.arDegree}>{az.toFixed(0)}° / {alt >= 0 ? '+' : ''}{alt.toFixed(0)}°</Text>
                </Pressable>
              );
            } catch { return null; }
          })}

          <View style={[styles.crosshairH, { zIndex: 1 }]} />
          <View style={[styles.crosshairV, { zIndex: 1 }]} />
        </View>
      </View>
    );
  }, [heading, pitch, planets, chartData, focusedPlanet]);

  // ==========================================
  // PLANET CARD (from chart.tsx)
  // ==========================================
  const renderPlanetCard = useCallback((item: PlanetPosition) => {
    if (!chartData) return null;
    const dignity = chartData.dignities[item.planet];
    const condition = chartData.conditions[item.planet];
    const color = PLANET_COLORS[item.planet];
    const verdict = getScoreVerdict(dignity.score);

    const activeDignities: Array<{ label: string; positive: boolean }> = [];
    if (dignity.domicile) activeDignities.push({ label: 'Domicile', positive: true });
    if (dignity.exaltation) activeDignities.push({ label: 'Exaltation', positive: true });
    if (dignity.triplicity) activeDignities.push({ label: 'Triplicity', positive: true });
    if (dignity.term) activeDignities.push({ label: 'Term', positive: true });
    if (dignity.face) activeDignities.push({ label: 'Face', positive: true });
    if (dignity.detriment) activeDignities.push({ label: 'Detriment', positive: false });
    if (dignity.fall) activeDignities.push({ label: 'Fall', positive: false });
    if (dignity.peregrine) activeDignities.push({ label: 'Peregrine', positive: false });

    const activeConditions: Array<{ label: string; icon: string; positive: boolean }> = [];
    if (condition.isRetrograde) activeConditions.push({ label: 'Retrograde', icon: '℞', positive: false });
    if (item.planet !== 'Sun') {
      if (condition.isCazimi) activeConditions.push({ label: 'Cazimi', icon: '☉', positive: true });
      if (condition.isCombust) activeConditions.push({ label: 'Combust', icon: '🔥', positive: false });
      if (condition.isUnderBeams) activeConditions.push({ label: 'Under Beams', icon: '☀', positive: false });
    }

    const hasAnyTag = activeDignities.length > 0 || activeConditions.length > 0;

    return (
      <View key={item.planet} style={styles.detailCard}>
        <View style={styles.detailHeader}>
          <Text style={[styles.planetSymbol, { color }]}>{PLANET_SYMBOLS[item.planet]}</Text>
          <View style={styles.headerInfo}>
            <Text style={styles.planetName}>{item.planet}</Text>
            <Text style={styles.positionText}>
              {ZODIAC_SYMBOLS[item.sign]} {item.sign} {item.signDegree}°{item.signMinute.toString().padStart(2, '0')}'
            </Text>
          </View>
          <Text style={[styles.scoreText, dignity.score > 0 ? styles.scorePositive : dignity.score < 0 ? styles.scoreNegative : styles.scoreNeutral]}>
            {dignity.score > 0 ? '+' : ''}{dignity.score}
          </Text>
        </View>

        <View style={[styles.verdictBox, { borderLeftColor: verdict.color }]}>
          <Text style={[styles.verdictText, { color: verdict.color }]}>{verdict.text}</Text>
        </View>

        {hasAnyTag && (
          <View style={styles.tagGrid}>
            {activeDignities.map(({ label, positive }) => (
              <Pressable key={label}
                onPress={() => {
                  if (Platform.OS !== ('web' as string)) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setSelectedDignity(label);
                }}
                style={({ pressed }) => [styles.tag,
                  { borderColor: positive ? '#22C55E40' : '#EF444440', backgroundColor: positive ? '#22C55E10' : '#EF444410' },
                  pressed && { opacity: 0.6 }]}>
                <Text style={[styles.tagText, { color: positive ? '#22C55E' : '#EF4444' }]}>{label} ⓘ</Text>
              </Pressable>
            ))}
            {activeConditions.map(({ label, icon, positive }) => {
              const condColor = positive ? '#22C55E' : '#F59E0B';
              return (
                <Pressable key={label}
                  onPress={() => {
                    if (Platform.OS !== ('web' as string)) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setSelectedDignity(label);
                  }}
                  style={({ pressed }) => [styles.tag,
                    { borderColor: condColor + '40', backgroundColor: condColor + '10' },
                    pressed && { opacity: 0.6 }]}>
                  <Text style={[styles.tagText, { color: condColor }]}>{icon} {label} ⓘ</Text>
                </Pressable>
              );
            })}
          </View>
        )}

        <View style={styles.techRow}>
          <View style={styles.techItem}>
            <Text style={styles.techLabel}>Longitude</Text>
            <Text style={styles.techValue}>{item.longitude.toFixed(4)}°</Text>
          </View>
          <View style={styles.techItem}>
            <Text style={styles.techLabel}>Speed</Text>
            <Text style={[styles.techValue, item.speed < 0 && { color: '#F59E0B' }]}>
              {item.speed >= 0 ? '+' : ''}{item.speed.toFixed(4)}°/d
            </Text>
          </View>
        </View>
      </View>
    );
  }, [chartData]);

  // ==========================================
  // MAIN RENDER
  // ==========================================
  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Astral Radar</Text>
          <Text style={styles.headingText}>
            {heading.toFixed(0)}° {getCardinalDirection(heading)}
          </Text>
        </View>

        {/* View Mode Toggle */}
        <View style={styles.toggleRow}>
          <Pressable onPress={() => setViewMode('radar')}
            style={({ pressed }) => [styles.toggleBtn, viewMode === 'radar' && styles.toggleActive, pressed && { opacity: 0.7 }]}>
            <Text style={[styles.toggleText, viewMode === 'radar' && styles.toggleTextActive]}>Radar</Text>
          </Pressable>
          <Pressable onPress={() => setViewMode('ar')}
            style={({ pressed }) => [styles.toggleBtn, viewMode === 'ar' && styles.toggleActive, pressed && { opacity: 0.7 }]}>
            <Text style={[styles.toggleText, viewMode === 'ar' && styles.toggleTextActive]}>AR View</Text>
          </Pressable>
        </View>

        {!sensorAvailable && (
          <View style={styles.warningBox}>
            <Text style={styles.warningText}>Compass sensors not available. Showing simulated positions.</Text>
          </View>
        )}

        {focusedPlanet && (
          <Pressable onPress={() => setFocusedPlanet(null)}
            style={({ pressed }) => [styles.focusBadge, pressed && { opacity: 0.7 }]}>
            <Text style={[styles.focusText, { color: PLANET_COLORS[focusedPlanet] }]}>
              {PLANET_SYMBOLS[focusedPlanet]} {focusedPlanet} focused
            </Text>
            <Text style={styles.focusDismiss}>Tap to clear</Text>
          </Pressable>
        )}

        {/* Top Layer: Radar or AR */}
        {viewMode === 'radar' ? renderRadarView() : renderARView()}

        {/* Planet Legend */}
        <View style={styles.legend}>
          {planets.map((p) => {
            const isFocused = focusedPlanet === null || focusedPlanet === p.planet;
            return (
              <View key={p.planet} style={[styles.legendItem, { opacity: isFocused ? 1 : 0.4 }]}>
                <Pressable onPress={() => handlePlanetTap(p.planet)} style={styles.legendPressable}>
                  <View style={[styles.legendDot, { backgroundColor: PLANET_COLORS[p.planet] }]} />
                  <Text style={styles.legendText}>{PLANET_SYMBOLS[p.planet]}</Text>
                  <Text style={styles.legendName}>{PLANET_NAMES[p.planet]}</Text>
                </Pressable>
                <Pressable onPress={() => handlePlanetInfo(p.planet)}
                  style={({ pressed }) => [styles.infoBtn, pressed && { opacity: 0.5 }]}>
                  <Text style={styles.infoBtnText}>i</Text>
                </Pressable>
              </View>
            );
          })}
        </View>

        {/* ===== BOTTOM SHEET: Astrolabe (PlanetCards + Aspectarian) ===== */}
        <View style={styles.sheetContainer}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>Astrolabe</Text>
          <Text style={styles.sheetSubtitle}>Essential Dignities & Conditions</Text>

          {chartData && (
            <>
              <View style={styles.sheetMeta}>
                <Text style={styles.metaText}>JD {chartData.julianDay.toFixed(4)}</Text>
                <Text style={styles.metaText}>LST {chartData.localSiderealTime.toFixed(4)}h</Text>
              </View>

              {/* Aspectarian */}
              <View style={styles.aspectarianSection}>
                <Pressable
                  onPress={() => {
                    if (!isFeatureUnlocked('aspectarian')) { setShowPaywall(true); return; }
                    setShowAspectarian(!showAspectarian);
                  }}
                  style={({ pressed }) => [styles.aspectarianHeader, pressed && { opacity: 0.8 }]}>
                  <View style={styles.aspectarianTitleRow}>
                    <Text style={styles.aspectarianTitle}>Aspectarian</Text>
                    {!isFeatureUnlocked('aspectarian') && <ProBadge onPress={() => setShowPaywall(true)} />}
                  </View>
                  <Text style={styles.aspectarianToggle}>
                    {showAspectarian ? '▼' : '▶'} {aspects.length} aspects
                  </Text>
                </Pressable>

                {showAspectarian && isFeatureUnlocked('aspectarian') && (
                  <View style={styles.aspectarianBody}>
                    {aspects.length === 0 ? (
                      <Text style={styles.noAspects}>No major aspects within 3° orb</Text>
                    ) : (
                      aspects.map((asp, i) => {
                        const aspColor = getAspectColor(asp.type);
                        return (
                          <Pressable key={i}
                            onPress={() => {
                              if (Platform.OS !== ('web' as string)) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                              setSelectedAspect(asp);
                            }}
                            style={({ pressed }) => [styles.aspectRow, asp.isExact && styles.aspectRowExact, pressed && { backgroundColor: '#1A1A1A' }]}>
                            <View style={styles.aspectPlanets}>
                              <Text style={[styles.aspectPlanetSymbol, { color: PLANET_COLORS[asp.planet1] }]}>{PLANET_SYMBOLS[asp.planet1]}</Text>
                              <Text style={[styles.aspectSymbolText, { color: aspColor }]}>{asp.symbol}</Text>
                              <Text style={[styles.aspectPlanetSymbol, { color: PLANET_COLORS[asp.planet2] }]}>{PLANET_SYMBOLS[asp.planet2]}</Text>
                            </View>
                            <View style={styles.aspectDetail}>
                              <Text style={[styles.aspectTypeName, { color: aspColor }]}>{asp.type}</Text>
                              <Text style={styles.aspectPairName}>{asp.planet1} – {asp.planet2}</Text>
                            </View>
                            <View style={styles.aspectOrbCol}>
                              <Text style={[styles.aspectOrbValue, asp.isExact && { color: '#D4AF37' }]}>{asp.orb.toFixed(1)}°</Text>
                              {asp.isExact && <Text style={styles.exactLabel}>EXACT</Text>}
                            </View>
                          </Pressable>
                        );
                      })
                    )}
                  </View>
                )}
              </View>

              {/* Planet Cards */}
              <Text style={styles.sheetSectionTitle}>Planetary Positions</Text>
              {allPlanets.map(p => renderPlanetCard(p))}
            </>
          )}
        </View>
      </ScrollView>

      {/* ===== Planet Info Modal ===== */}
      <Modal visible={!!infoPlanet} transparent animationType="fade" onRequestClose={() => setInfoPlanet(null)}>
        <Pressable style={styles.modalOverlay} onPress={() => setInfoPlanet(null)}>
          <View style={styles.modalContent}>
            {infoPlanet && PLANET_INFO[infoPlanet] && (
              <>
                <Text style={[styles.modalSymbol, { color: PLANET_COLORS[infoPlanet as Planet] }]}>
                  {PLANET_SYMBOLS[infoPlanet as Planet]}
                </Text>
                <Text style={styles.modalTitle}>{infoPlanet}</Text>
                <View style={styles.modalRow}>
                  <View style={styles.modalTag}>
                    <Text style={styles.modalTagLabel}>Element</Text>
                    <Text style={styles.modalTagValue}>{PLANET_INFO[infoPlanet].element}</Text>
                  </View>
                  <View style={styles.modalTag}>
                    <Text style={styles.modalTagLabel}>Principle</Text>
                    <Text style={styles.modalTagValue}>{PLANET_INFO[infoPlanet].principle}</Text>
                  </View>
                </View>
                <Text style={styles.modalDesc}>{PLANET_INFO[infoPlanet].description}</Text>
                <Pressable onPress={() => setInfoPlanet(null)}
                  style={({ pressed }) => [styles.modalClose, pressed && { opacity: 0.7 }]}>
                  <Text style={styles.modalCloseText}>Close</Text>
                </Pressable>
              </>
            )}
          </View>
        </Pressable>
      </Modal>

      {/* ===== Aspect Explanation Modal ===== */}
      <Modal visible={!!selectedAspect} transparent animationType="fade" onRequestClose={() => setSelectedAspect(null)}>
        <Pressable style={styles.modalOverlay} onPress={() => setSelectedAspect(null)}>
          <View style={styles.modalContent}>
            {selectedAspect && (() => {
              const aspColor = getAspectColor(selectedAspect.type);
              const explanation = ASPECT_EXPLANATIONS[selectedAspect.type];
              return (
                <>
                  <Text style={[styles.modalSymbol, { color: aspColor }]}>{selectedAspect.symbol}</Text>
                  <Text style={[styles.modalTitle, { color: aspColor }]}>{selectedAspect.type}</Text>
                  <View style={styles.modalPlanetsRow}>
                    <Text style={[styles.modalPlanet, { color: PLANET_COLORS[selectedAspect.planet1] }]}>
                      {PLANET_SYMBOLS[selectedAspect.planet1]} {selectedAspect.planet1}
                    </Text>
                    <Text style={[styles.modalAspectMid, { color: aspColor }]}>{selectedAspect.symbol}</Text>
                    <Text style={[styles.modalPlanet, { color: PLANET_COLORS[selectedAspect.planet2] }]}>
                      {PLANET_SYMBOLS[selectedAspect.planet2]} {selectedAspect.planet2}
                    </Text>
                  </View>
                  <Text style={styles.modalOrbText}>
                    Orb: {selectedAspect.orb.toFixed(2)}° {selectedAspect.isExact ? '(EXACT)' : ''}
                  </Text>
                  {explanation && (
                    <>
                      <View style={styles.modalDivider} />
                      <Text style={styles.modalMeaning}>{explanation.meaning}</Text>
                      <Text style={styles.modalKeywords}>{explanation.keywords}</Text>
                    </>
                  )}
                  <Pressable onPress={() => setSelectedAspect(null)}
                    style={({ pressed }) => [styles.modalClose, pressed && { opacity: 0.7 }]}>
                    <Text style={styles.modalCloseText}>Close</Text>
                  </Pressable>
                </>
              );
            })()}
          </View>
        </Pressable>
      </Modal>

      {/* ===== Dignity Explanation Modal ===== */}
      <Modal visible={!!selectedDignity} transparent animationType="fade" onRequestClose={() => setSelectedDignity(null)}>
        <Pressable style={styles.modalOverlay} onPress={() => setSelectedDignity(null)}>
          <View style={styles.modalContent}>
            {selectedDignity && (
              <>
                <Text style={styles.modalTitle}>{selectedDignity}</Text>
                <View style={styles.modalDivider} />
                <Text style={styles.modalDesc}>
                  {DIGNITY_EXPLANATIONS[selectedDignity] ?? 'No explanation available.'}
                </Text>
                <Pressable onPress={() => setSelectedDignity(null)}
                  style={({ pressed }) => [styles.modalClose, pressed && { opacity: 0.7 }]}>
                  <Text style={styles.modalCloseText}>Close</Text>
                </Pressable>
              </>
            )}
          </View>
        </Pressable>
      </Modal>

      <PaywallModal visible={showPaywall} onClose={() => setShowPaywall(false)} featureId="aspectarian" />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollContent: { paddingBottom: 100 },
  header: { alignItems: 'center', paddingTop: 8, paddingHorizontal: 16 },
  title: { fontFamily: 'Cinzel', fontSize: 20, color: '#D4AF37', letterSpacing: 3 },
  headingText: { fontFamily: 'JetBrainsMono', fontSize: 32, color: '#E0E0E0', marginTop: 4 },

  toggleRow: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginTop: 12 },
  toggleBtn: {
    paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20,
    borderWidth: 1, borderColor: '#1A1A1A', backgroundColor: '#0D0D0D',
  },
  toggleActive: { borderColor: '#D4AF37', backgroundColor: '#D4AF3710' },
  toggleText: { fontSize: 13, color: '#6B6B6B', fontWeight: '600' },
  toggleTextActive: { color: '#D4AF37' },

  warningBox: {
    backgroundColor: '#F59E0B15', borderWidth: 1, borderColor: '#F59E0B30',
    borderRadius: 8, padding: 10, marginTop: 8, marginHorizontal: 16,
  },
  warningText: { fontSize: 11, color: '#F59E0B', textAlign: 'center' },

  focusBadge: {
    alignSelf: 'center', marginTop: 8, paddingHorizontal: 16, paddingVertical: 6,
    borderRadius: 20, borderWidth: 1, borderColor: '#1A1A1A', backgroundColor: '#0D0D0D',
    flexDirection: 'row', alignItems: 'center', gap: 8,
  },
  focusText: { fontSize: 13, fontWeight: '600' },
  focusDismiss: { fontSize: 10, color: '#6B6B6B' },

  radarContainer: { alignItems: 'center', marginTop: 12 },

  // AR View
  arContainer: { marginTop: 12, paddingHorizontal: 16 },
  arBackground: {
    backgroundColor: '#080808', borderRadius: 12, borderWidth: 1,
    borderColor: '#1A1A1A', overflow: 'hidden', position: 'relative',
  },
  arHorizon: { position: 'absolute', left: 0, right: 0, alignItems: 'center', zIndex: 2 },
  arHorizonLabel: {
    fontFamily: 'JetBrainsMono', fontSize: 9, color: '#6B6B6B40',
    letterSpacing: 2, borderTopWidth: 1, borderTopColor: '#1A1A1A', paddingTop: 2, paddingHorizontal: 8,
  },
  pitchIndicator: { position: 'absolute', top: 8, left: 8, right: 8, zIndex: 20, alignItems: 'center' },
  pitchText: { fontFamily: 'JetBrainsMono', fontSize: 10, color: '#6B6B6B' },
  arPlanet: { position: 'absolute', alignItems: 'center', width: 60, zIndex: 10 },
  arSymbol: { fontSize: 22, textAlign: 'center' },
  arName: { fontSize: 9, fontWeight: '600', textAlign: 'center' },
  arDegree: { fontFamily: 'JetBrainsMono', fontSize: 8, color: '#6B6B6B', textAlign: 'center' },
  crosshairH: {
    position: 'absolute', top: '50%', left: '45%', right: '45%',
    height: 1, backgroundColor: '#D4AF3740',
  },
  crosshairV: {
    position: 'absolute', left: '50%', top: '45%', bottom: '45%',
    width: 1, backgroundColor: '#D4AF3740',
  },

  // Legend
  legend: {
    flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center',
    gap: 8, paddingVertical: 12, paddingHorizontal: 16,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  legendPressable: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  legendDot: { width: 6, height: 6, borderRadius: 3 },
  legendText: { fontSize: 14, color: '#E0E0E0' },
  legendName: { fontSize: 10, color: '#6B6B6B' },
  infoBtn: {
    width: 16, height: 16, borderRadius: 8, borderWidth: 1,
    borderColor: '#6B6B6B40', alignItems: 'center', justifyContent: 'center',
  },
  infoBtnText: { fontSize: 9, color: '#6B6B6B', fontWeight: '700', fontStyle: 'italic' },

  // Bottom Sheet (Glassmorphism)
  sheetContainer: {
    marginTop: 16, marginHorizontal: 16,
    backgroundColor: '#0A0A0A', borderWidth: 1, borderColor: '#1A1A1A',
    borderRadius: 20, padding: 16, paddingTop: 12,
  },
  sheetHandle: {
    width: 40, height: 4, borderRadius: 2, backgroundColor: '#333',
    alignSelf: 'center', marginBottom: 12,
  },
  sheetTitle: { fontFamily: 'Cinzel', fontSize: 18, color: '#D4AF37', textAlign: 'center', letterSpacing: 2 },
  sheetSubtitle: { fontSize: 11, color: '#6B6B6B', textAlign: 'center', marginTop: 2 },
  sheetMeta: { flexDirection: 'row', justifyContent: 'center', gap: 16, marginTop: 8 },
  metaText: { fontFamily: 'JetBrainsMono', fontSize: 10, color: '#6B6B6B' },
  sheetSectionTitle: { fontFamily: 'Cinzel', fontSize: 14, color: '#E0E0E0', marginTop: 16, marginBottom: 8, letterSpacing: 2 },

  // Aspectarian
  aspectarianSection: { marginTop: 12 },
  aspectarianHeader: {
    backgroundColor: '#0D0D0D', borderWidth: 1, borderColor: '#1A1A1A',
    borderRadius: 12, padding: 14,
  },
  aspectarianTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  aspectarianTitle: { fontFamily: 'Cinzel', fontSize: 16, color: '#E0E0E0', letterSpacing: 2 },
  aspectarianToggle: { fontFamily: 'JetBrainsMono', fontSize: 11, color: '#6B6B6B', marginTop: 4 },
  aspectarianBody: {
    backgroundColor: '#080808', borderWidth: 1, borderColor: '#1A1A1A',
    borderTopWidth: 0, borderBottomLeftRadius: 12, borderBottomRightRadius: 12, padding: 8,
  },
  noAspects: { fontSize: 12, color: '#6B6B6B', textAlign: 'center', padding: 16 },
  aspectRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 8,
    paddingHorizontal: 8, borderRadius: 8, marginBottom: 2,
  },
  aspectRowExact: { backgroundColor: '#D4AF3708', borderWidth: 1, borderColor: '#D4AF3720' },
  aspectPlanets: { flexDirection: 'row', alignItems: 'center', gap: 4, width: 70 },
  aspectPlanetSymbol: { fontSize: 16 },
  aspectSymbolText: { fontSize: 14 },
  aspectDetail: { flex: 1, marginLeft: 8 },
  aspectTypeName: { fontSize: 12, fontWeight: '700' },
  aspectPairName: { fontSize: 10, color: '#6B6B6B', marginTop: 1 },
  aspectOrbCol: { alignItems: 'flex-end' },
  aspectOrbValue: { fontFamily: 'JetBrainsMono', fontSize: 12, color: '#E0E0E0' },
  exactLabel: { fontFamily: 'JetBrainsMono', fontSize: 8, color: '#D4AF37', letterSpacing: 1, marginTop: 1 },

  // Planet Cards
  detailCard: {
    backgroundColor: '#0D0D0D', borderWidth: 1, borderColor: '#1A1A1A',
    borderRadius: 12, padding: 14, marginBottom: 8,
  },
  detailHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  planetSymbol: { fontSize: 28, width: 36, textAlign: 'center' },
  headerInfo: { flex: 1 },
  planetName: { fontSize: 16, fontWeight: '600', color: '#E0E0E0' },
  positionText: { fontFamily: 'JetBrainsMono', fontSize: 12, color: '#6B6B6B', marginTop: 2 },
  scoreText: { fontFamily: 'JetBrainsMono', fontSize: 18, fontWeight: '700' },
  scorePositive: { color: '#22C55E' },
  scoreNegative: { color: '#EF4444' },
  scoreNeutral: { color: '#6B6B6B' },
  verdictBox: { marginTop: 10, paddingLeft: 10, borderLeftWidth: 3 },
  verdictText: { fontSize: 12, fontStyle: 'italic', lineHeight: 18 },
  tagGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  tag: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  tagText: { fontSize: 10, fontWeight: '700' },
  techRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 10, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#1A1A1A' },
  techItem: {},
  techLabel: { fontSize: 9, color: '#6B6B6B' },
  techValue: { fontFamily: 'JetBrainsMono', fontSize: 11, color: '#E0E0E0' },

  // Modals
  modalOverlay: {
    flex: 1, backgroundColor: '#00000090', justifyContent: 'center',
    alignItems: 'center', padding: 32,
  },
  modalContent: {
    backgroundColor: '#0D0D0D', borderWidth: 1, borderColor: '#1A1A1A',
    borderRadius: 16, padding: 24, width: '100%', maxWidth: 340, alignItems: 'center',
  },
  modalSymbol: { fontSize: 40 },
  modalTitle: { fontFamily: 'Cinzel', fontSize: 20, color: '#E0E0E0', marginTop: 8, letterSpacing: 2 },
  modalRow: { flexDirection: 'row', gap: 12, marginTop: 16 },
  modalTag: {
    flex: 1, backgroundColor: '#080808', borderWidth: 1, borderColor: '#1A1A1A',
    borderRadius: 8, padding: 10, alignItems: 'center',
  },
  modalTagLabel: { fontFamily: 'JetBrainsMono', fontSize: 9, color: '#6B6B6B', letterSpacing: 1 },
  modalTagValue: { fontSize: 13, color: '#D4AF37', fontWeight: '600', marginTop: 4 },
  modalDesc: { fontSize: 13, color: '#E0E0E0', lineHeight: 20, marginTop: 16, textAlign: 'center' },
  modalClose: {
    marginTop: 20, paddingHorizontal: 24, paddingVertical: 10,
    borderRadius: 20, borderWidth: 1, borderColor: '#1A1A1A',
  },
  modalCloseText: { fontSize: 13, color: '#6B6B6B' },
  modalDivider: { width: '100%', height: 1, backgroundColor: '#1A1A1A', marginVertical: 16 },
  modalPlanetsRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 16 },
  modalPlanet: { fontSize: 16, fontWeight: '600' },
  modalAspectMid: { fontSize: 18 },
  modalOrbText: { fontFamily: 'JetBrainsMono', fontSize: 12, color: '#6B6B6B', marginTop: 8 },
  modalMeaning: { fontSize: 13, color: '#E0E0E0', lineHeight: 20, textAlign: 'center' },
  modalKeywords: { fontSize: 12, color: '#D4AF37', textAlign: 'center', marginTop: 8 },
});
