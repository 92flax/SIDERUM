// ============================================================
// ÆONIS – Magical AR Astrolabe (Radar Screen)
// Rotating Compass Ring, Planet Legend with Focus Mode,
// Glassmorphism HUD, merged PlanetCard bottom sheet
// ============================================================

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Text, View, StyleSheet, Dimensions, Platform, Pressable,
  Modal, ScrollView, FlatList,
} from 'react-native';
import { Magnetometer, DeviceMotion } from 'expo-sensors';
import Svg, {
  Circle, Line, Text as SvgText, G, Path, Defs,
  RadialGradient, Stop, Rect,
} from 'react-native-svg';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { ScreenContainer } from '@/components/screen-container';
import { PaywallModal, ProBadge } from '@/components/paywall-modal';
import { useAstroStore } from '@/lib/astro/store';
import { useProStore } from '@/lib/store/pro-store';
import { calculateHeading, resetHeadingFilter } from '@/lib/compass/sensor-fusion';
import { getMajorAspects, Aspect } from '@/lib/astro/aspects';
import { calculatePlanetaryHours } from '@/lib/astro/planetary-hours';
import {
  PLANET_SYMBOLS, ZODIAC_SYMBOLS, PLANET_COLORS, Planet,
  PlanetPosition, EssentialDignity, PlanetCondition,
} from '@/lib/astro/types';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const RING_SIZE = Math.min(SCREEN_WIDTH - 32, 360);
const RING_CENTER = RING_SIZE / 2;
const RING_OUTER_R = RING_SIZE / 2 - 8;
const RING_INNER_R = RING_OUTER_R - 36;

const PLANET_NAMES: Record<string, string> = {
  Sun: 'Sun', Moon: 'Moon', Mercury: 'Mercury', Venus: 'Venus',
  Mars: 'Mars', Jupiter: 'Jupiter', Saturn: 'Saturn',
  Uranus: 'Uranus', Neptune: 'Neptune', Pluto: 'Pluto',
  NorthNode: 'N.Node', SouthNode: 'S.Node', Lilith: 'Lilith',
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

// Planets that appear on the radar ring
const RADAR_PLANETS: Planet[] = [
  'Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn',
];

// All planets for the bottom sheet list
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

// Zodiac sign glyphs for the compass ring
const ZODIAC_RING = [
  { sign: '♈', deg: 0 }, { sign: '♉', deg: 30 }, { sign: '♊', deg: 60 },
  { sign: '♋', deg: 90 }, { sign: '♌', deg: 120 }, { sign: '♍', deg: 150 },
  { sign: '♎', deg: 180 }, { sign: '♏', deg: 210 }, { sign: '♐', deg: 240 },
  { sign: '♑', deg: 270 }, { sign: '♒', deg: 300 }, { sign: '♓', deg: 330 },
];

// Runic tick marks for the compass ring (24 Elder Futhark divisions)
const RUNE_TICKS = Array.from({ length: 24 }, (_, i) => i * 15);

function safeNum(val: number | undefined, fallback: number): number {
  if (val === undefined || val === null || !isFinite(val) || isNaN(val)) return fallback;
  return val;
}

function getCardinalDirection(heading: number): string {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return dirs[Math.round(heading / 45) % 8];
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

// ============================================================
// MAIN COMPONENT
// ============================================================
export default function RadarScreen() {
  const [heading, setHeading] = useState(0);
  const [pitch, setPitch] = useState(0);
  const [sensorAvailable, setSensorAvailable] = useState(true);
  const [infoPlanet, setInfoPlanet] = useState<string | null>(null);
  const [showPaywall, setShowPaywall] = useState(false);
  const [showAspectarian, setShowAspectarian] = useState(false);
  const [selectedAspect, setSelectedAspect] = useState<Aspect | null>(null);
  const [selectedDignity, setSelectedDignity] = useState<string | null>(null);

  // Focus mode: when a planet is selected in the legend, only that planet shows on radar
  const [focusedPlanet, setFocusedPlanet] = useState<string | null>(null);

  const chartData = useAstroStore((s) => s.chartData);
  const location = useAstroStore((s) => s.location);
  const date = useAstroStore((s) => s.date);
  const recalculate = useAstroStore((s) => s.recalculate);
  const isFeatureUnlocked = useProStore((s) => s.isFeatureUnlocked);

  useEffect(() => { recalculate(); }, []);

  // Magnetometer subscription
  useEffect(() => {
    if (Platform.OS === ('web' as string)) { setSensorAvailable(false); return; }
    let magSub: any;
    resetHeadingFilter();
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

  // Planets with mock fallback (for radar ring)
  const radarPlanets = useMemo(() => {
    const raw = chartData?.planets.filter(p =>
      RADAR_PLANETS.includes(p.planet)
    ) ?? [];
    return raw.map(p => {
      const mock = MOCK_POSITIONS[p.planet];
      return { ...p, azimuth: safeNum(p.azimuth, mock?.azimuth ?? 0), altitude: safeNum(p.altitude, mock?.altitude ?? 20) };
    });
  }, [chartData]);

  // Filtered radar planets based on focus mode
  const visibleRadarPlanets = useMemo(() => {
    if (!focusedPlanet) return radarPlanets;
    return radarPlanets.filter(p => p.planet === focusedPlanet);
  }, [radarPlanets, focusedPlanet]);

  const allPlanets = useMemo(() => {
    if (!chartData) return [];
    return chartData.planets.filter(p => MAIN_PLANETS.includes(p.planet));
  }, [chartData]);

  const aspects = useMemo(() => {
    if (!chartData) return [];
    return getMajorAspects(chartData.planets, 3);
  }, [chartData]);

  const planetaryHour = useMemo(() => calculatePlanetaryHours(date, location), [date, location]);

  const handlePlanetInfo = useCallback((planet: string) => {
    if (Platform.OS !== ('web' as string)) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setInfoPlanet(planet);
  }, []);

  // Toggle focus mode from legend
  const handleLegendPress = useCallback((planet: string) => {
    if (Platform.OS !== ('web' as string)) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFocusedPlanet(prev => prev === planet ? null : planet);
  }, []);

  // ==========================================
  // ROTATING COMPASS RING (SVG)
  // ==========================================
  const renderCompassRing = useCallback(() => {
    // The ring rotates so that North on the ring faces True North
    // When user faces North (heading=0), ring is at 0° rotation
    // When user faces East (heading=90), ring rotates -90° so N moves left
    const rotation = -heading;

    return (
      <View style={styles.ringContainer}>
        <Svg width={RING_SIZE} height={RING_SIZE} viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}>
          <Defs>
            <RadialGradient id="ringBg" cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor="#0A0A0A" stopOpacity="0.95" />
              <Stop offset="70%" stopColor="#050505" stopOpacity="0.98" />
              <Stop offset="100%" stopColor="#000000" stopOpacity="1" />
            </RadialGradient>
          </Defs>

          {/* Background circle */}
          <Circle cx={RING_CENTER} cy={RING_CENTER} r={RING_OUTER_R} fill="url(#ringBg)" />

          {/* Outer gold ring */}
          <Circle cx={RING_CENTER} cy={RING_CENTER} r={RING_OUTER_R}
            fill="none" stroke="#D4AF3740" strokeWidth={1.5} />
          <Circle cx={RING_CENTER} cy={RING_CENTER} r={RING_INNER_R}
            fill="none" stroke="#D4AF3720" strokeWidth={0.8} />

          {/* Rotating group */}
          <G rotation={rotation} origin={`${RING_CENTER}, ${RING_CENTER}`}>
            {/* Runic tick marks (every 15°) */}
            {RUNE_TICKS.map((deg) => {
              const rad = (deg * Math.PI) / 180;
              const isCardinal = deg % 90 === 0;
              const isMajor = deg % 30 === 0;
              const outerR = RING_OUTER_R - 2;
              const innerR = isCardinal ? RING_INNER_R + 4 : isMajor ? RING_INNER_R + 12 : RING_INNER_R + 18;
              const x1 = RING_CENTER + outerR * Math.sin(rad);
              const y1 = RING_CENTER - outerR * Math.cos(rad);
              const x2 = RING_CENTER + innerR * Math.sin(rad);
              const y2 = RING_CENTER - innerR * Math.cos(rad);
              return (
                <Line key={deg} x1={x1} y1={y1} x2={x2} y2={y2}
                  stroke={isCardinal ? '#D4AF37' : isMajor ? '#D4AF3760' : '#D4AF3730'}
                  strokeWidth={isCardinal ? 2 : isMajor ? 1.2 : 0.6} />
              );
            })}

            {/* Cardinal direction labels */}
            {[
              { label: 'N', deg: 0, color: '#D4AF37' },
              { label: 'E', deg: 90, color: '#E0E0E080' },
              { label: 'S', deg: 180, color: '#E0E0E080' },
              { label: 'W', deg: 270, color: '#E0E0E080' },
            ].map(({ label, deg, color }) => {
              const rad = (deg * Math.PI) / 180;
              const labelR = RING_INNER_R - 10;
              const x = RING_CENTER + labelR * Math.sin(rad);
              const y = RING_CENTER - labelR * Math.cos(rad);
              return (
                <SvgText key={label} x={x} y={y}
                  fill={color} fontSize={label === 'N' ? 18 : 14}
                  fontWeight="bold" textAnchor="middle" alignmentBaseline="central">
                  {label}
                </SvgText>
              );
            })}

            {/* Zodiac glyphs on the ring band */}
            {ZODIAC_RING.map(({ sign, deg }) => {
              const rad = (deg * Math.PI) / 180;
              const glyphR = (RING_OUTER_R + RING_INNER_R) / 2;
              const x = RING_CENTER + glyphR * Math.sin(rad);
              const y = RING_CENTER - glyphR * Math.cos(rad);
              return (
                <SvgText key={sign} x={x} y={y}
                  fill="#D4AF3750" fontSize={11}
                  textAnchor="middle" alignmentBaseline="central">
                  {sign}
                </SvgText>
              );
            })}

            {/* Planet dots on the ring (filtered by focus mode) */}
            {visibleRadarPlanets.map((p) => {
              const az = safeNum(p.azimuth, 0);
              const rad = (az * Math.PI) / 180;
              const altFactor = Math.max(0.15, 1 - Math.abs(safeNum(p.altitude, 20)) / 90);
              const dist = RING_INNER_R * 0.75 * altFactor;
              const px = RING_CENTER + dist * Math.sin(rad);
              const py = RING_CENTER - dist * Math.cos(rad);
              const color = PLANET_COLORS[p.planet] || '#E0E0E0';
              const dignity = chartData?.dignities[p.planet];
              const isStrong = dignity && dignity.score > 0;
              const isFocused = focusedPlanet === p.planet;

              return (
                <G key={p.planet}>
                  {/* Connection line */}
                  <Line x1={RING_CENTER} y1={RING_CENTER} x2={px} y2={py}
                    stroke={color + '18'} strokeWidth={0.6} strokeDasharray="2,4" />
                  {/* Glow for strong or focused planets */}
                  {(isStrong || isFocused) && (
                    <>
                      <Circle cx={px} cy={py} r={isFocused ? 22 : 16} fill={color + '08'} />
                      <Circle cx={px} cy={py} r={isFocused ? 16 : 12} fill={color + '12'} />
                    </>
                  )}
                  {/* Planet dot */}
                  <Circle cx={px} cy={py} r={isFocused ? 8 : 6} fill={color} />
                  <Circle cx={px} cy={py} r={isFocused ? 8 : 6} fill="none" stroke={color} strokeWidth={1} opacity={0.5} />
                  {/* Label */}
                  <SvgText x={px} y={py - 14} fill={color} fontSize={isFocused ? 14 : 11}
                    fontWeight="bold" textAnchor="middle">
                    {PLANET_SYMBOLS[p.planet]}
                  </SvgText>
                  <SvgText x={px} y={py + 18} fill="#9B9B9B" fontSize={isFocused ? 9 : 7} textAnchor="middle">
                    {PLANET_NAMES[p.planet]}
                  </SvgText>
                  {/* Tap target */}
                  <Rect x={px - 20} y={py - 20} width={40} height={40} fill="transparent"
                    onPress={() => handlePlanetInfo(p.planet)} />
                </G>
              );
            })}
          </G>

          {/* Fixed center dot (small, no crosshair) */}
          <Circle cx={RING_CENTER} cy={RING_CENTER} r={3} fill="#D4AF37" opacity={0.9} />
          <Circle cx={RING_CENTER} cy={RING_CENTER} r={8} fill="none" stroke="#D4AF3760" strokeWidth={0.8} />

          {/* Fixed North indicator triangle at top */}
          <Path
            d={`M${RING_CENTER - 6},12 L${RING_CENTER},2 L${RING_CENTER + 6},12 Z`}
            fill="#D4AF37" opacity={0.9}
          />
        </Svg>
      </View>
    );
  }, [heading, visibleRadarPlanets, chartData, focusedPlanet]);

  // ==========================================
  // PLANET LEGEND (below compass ring)
  // ==========================================
  const renderLegend = useCallback(() => {
    return (
      <View style={styles.legendContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.legendScroll}>
          {radarPlanets.map((p) => {
            const color = PLANET_COLORS[p.planet] || '#E0E0E0';
            const isFocused = focusedPlanet === p.planet;
            return (
              <Pressable
                key={p.planet}
                onPress={() => handleLegendPress(p.planet)}
                style={({ pressed }) => [
                  styles.legendItem,
                  isFocused && styles.legendItemFocused,
                  isFocused && { borderColor: color + '80' },
                  pressed && { opacity: 0.7 },
                ]}
              >
                <View style={[styles.legendDot, { backgroundColor: color }]} />
                <Text style={[
                  styles.legendName,
                  isFocused && { color: color, fontWeight: '700' },
                ]}>
                  {PLANET_SYMBOLS[p.planet]} {PLANET_NAMES[p.planet]}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
        {focusedPlanet && (
          <Pressable
            onPress={() => setFocusedPlanet(null)}
            style={({ pressed }) => [styles.clearFocusBtn, pressed && { opacity: 0.7 }]}
          >
            <Text style={styles.clearFocusText}>Show All</Text>
          </Pressable>
        )}
      </View>
    );
  }, [radarPlanets, focusedPlanet]);

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
      <View key={item.planet} style={styles.planetCard}>
        {/* Compact row: Icon | Name + Degree | Score */}
        <View style={styles.cardRow}>
          <Pressable onPress={() => handlePlanetInfo(item.planet)}
            style={({ pressed }) => [styles.cardIconWrap, pressed && { opacity: 0.6 }]}>
            <Text style={[styles.cardIcon, { color }]}>{PLANET_SYMBOLS[item.planet]}</Text>
          </Pressable>
          <View style={styles.cardInfo}>
            <Text style={styles.cardName}>{item.planet}</Text>
            <Text style={styles.cardDegree}>
              {ZODIAC_SYMBOLS[item.sign]} {item.sign} {item.signDegree}°{item.signMinute.toString().padStart(2, '0')}'
            </Text>
          </View>
          <Text style={[styles.cardScore,
            dignity.score > 0 ? styles.scorePos : dignity.score < 0 ? styles.scoreNeg : styles.scoreNeu]}>
            {dignity.score > 0 ? '+' : ''}{dignity.score}
          </Text>
        </View>

        {/* Verdict */}
        <View style={[styles.verdictBar, { borderLeftColor: verdict.color }]}>
          <Text style={[styles.verdictText, { color: verdict.color }]}>{verdict.text}</Text>
        </View>

        {/* Tags */}
        {hasAnyTag && (
          <View style={styles.tagRow}>
            {activeDignities.map(({ label, positive }) => (
              <Pressable key={label}
                onPress={() => {
                  if (Platform.OS !== ('web' as string)) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setSelectedDignity(label);
                }}
                style={({ pressed }) => [styles.tag,
                  { borderColor: positive ? '#22C55E40' : '#EF444440', backgroundColor: positive ? '#22C55E10' : '#EF444410' },
                  pressed && { opacity: 0.6 }]}>
                <Text style={[styles.tagLabel, { color: positive ? '#22C55E' : '#EF4444' }]}>{label} ⓘ</Text>
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
                  <Text style={[styles.tagLabel, { color: condColor }]}>{icon} {label} ⓘ</Text>
                </Pressable>
              );
            })}
          </View>
        )}

        {/* Tech row */}
        <View style={styles.techRow}>
          <View style={styles.techItem}>
            <Text style={styles.techLabel}>Longitude</Text>
            <Text style={styles.techVal}>{item.longitude.toFixed(4)}°</Text>
          </View>
          <View style={styles.techItem}>
            <Text style={styles.techLabel}>Speed</Text>
            <Text style={[styles.techVal, item.speed < 0 && { color: '#F59E0B' }]}>
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
  const hourPlanet = planetaryHour.currentHour.planet;
  const hourColor = PLANET_COLORS[hourPlanet] || '#D4AF37';

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* ===== TOP HUD BAR (Glassmorphism) ===== */}
        <View style={styles.hudContainer}>
          <BlurView intensity={20} tint="dark" style={styles.hudBlur}
            experimentalBlurMethod="dimezisBlurView">
            <View style={styles.hudInner}>
              <View style={styles.hudLeft}>
                <Text style={styles.hudAzimuth}>
                  {heading.toFixed(0)}°
                </Text>
                <Text style={styles.hudDirection}>
                  {getCardinalDirection(heading)}
                </Text>
              </View>
              <View style={styles.hudDivider} />
              <View style={styles.hudRight}>
                <Text style={styles.hudHourLabel}>Planetary Hour</Text>
                <View style={styles.hudHourRow}>
                  <Text style={[styles.hudHourSymbol, { color: hourColor }]}>
                    {PLANET_SYMBOLS[hourPlanet]}
                  </Text>
                  <Text style={[styles.hudHourName, { color: hourColor }]}>
                    {hourPlanet}
                  </Text>
                </View>
              </View>
            </View>
          </BlurView>
        </View>

        {!sensorAvailable && (
          <View style={styles.warningBox}>
            <Text style={styles.warningText}>Compass sensors not available. Showing simulated positions.</Text>
          </View>
        )}

        {/* ===== COMPASS RING ===== */}
        <View style={styles.viewfinderContainer}>
          <View style={styles.viewfinderBg}>
            {renderCompassRing()}
          </View>
        </View>

        {/* ===== PLANET LEGEND (below compass) ===== */}
        {renderLegend()}

        {/* ===== BOTTOM SHEET (Glassmorphism) ===== */}
        <View style={styles.sheetOuter}>
          <BlurView intensity={20} tint="dark" style={styles.sheetBlur}
            experimentalBlurMethod="dimezisBlurView">
            <View style={styles.sheetInner}>
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
                  <View style={styles.aspectSection}>
                    <Pressable
                      onPress={() => {
                        if (!isFeatureUnlocked('aspectarian')) { setShowPaywall(true); return; }
                        setShowAspectarian(!showAspectarian);
                      }}
                      style={({ pressed }) => [styles.aspectHeader, pressed && { opacity: 0.8 }]}>
                      <View style={styles.aspectTitleRow}>
                        <Text style={styles.aspectTitle}>Aspectarian</Text>
                        {!isFeatureUnlocked('aspectarian') && <ProBadge onPress={() => setShowPaywall(true)} />}
                      </View>
                      <Text style={styles.aspectToggle}>
                        {showAspectarian ? '▼' : '▶'} {aspects.length} aspects
                      </Text>
                    </Pressable>

                    {showAspectarian && isFeatureUnlocked('aspectarian') && (
                      <View style={styles.aspectBody}>
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
                                  <Text style={[styles.aspectPSymbol, { color: PLANET_COLORS[asp.planet1] }]}>{PLANET_SYMBOLS[asp.planet1]}</Text>
                                  <Text style={[styles.aspectSymbol, { color: aspColor }]}>{asp.symbol}</Text>
                                  <Text style={[styles.aspectPSymbol, { color: PLANET_COLORS[asp.planet2] }]}>{PLANET_SYMBOLS[asp.planet2]}</Text>
                                </View>
                                <View style={styles.aspectDetail}>
                                  <Text style={[styles.aspectType, { color: aspColor }]}>{asp.type}</Text>
                                  <Text style={styles.aspectPair}>{asp.planet1} – {asp.planet2}</Text>
                                </View>
                                <View style={styles.aspectOrbCol}>
                                  <Text style={[styles.aspectOrb, asp.isExact && { color: '#D4AF37' }]}>{asp.orb.toFixed(1)}°</Text>
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
                  <Text style={styles.sectionTitle}>Planetary Positions</Text>
                  {allPlanets.map(p => renderPlanetCard(p))}
                </>
              )}
            </View>
          </BlurView>
        </View>
      </ScrollView>

      {/* ===== Planet Info Modal ===== */}
      <Modal visible={!!infoPlanet} transparent animationType="fade" onRequestClose={() => setInfoPlanet(null)}>
        <Pressable style={styles.modalOverlay} onPress={() => setInfoPlanet(null)}>
          <BlurView intensity={40} tint="dark" style={styles.modalBlurWrap}
            experimentalBlurMethod="dimezisBlurView">
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
          </BlurView>
        </Pressable>
      </Modal>

      {/* ===== Aspect Explanation Modal ===== */}
      <Modal visible={!!selectedAspect} transparent animationType="fade" onRequestClose={() => setSelectedAspect(null)}>
        <Pressable style={styles.modalOverlay} onPress={() => setSelectedAspect(null)}>
          <BlurView intensity={40} tint="dark" style={styles.modalBlurWrap}
            experimentalBlurMethod="dimezisBlurView">
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
          </BlurView>
        </Pressable>
      </Modal>

      {/* ===== Dignity Explanation Modal ===== */}
      <Modal visible={!!selectedDignity} transparent animationType="fade" onRequestClose={() => setSelectedDignity(null)}>
        <Pressable style={styles.modalOverlay} onPress={() => setSelectedDignity(null)}>
          <BlurView intensity={40} tint="dark" style={styles.modalBlurWrap}
            experimentalBlurMethod="dimezisBlurView">
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
          </BlurView>
        </Pressable>
      </Modal>

      <PaywallModal visible={showPaywall} onClose={() => setShowPaywall(false)} featureId="aspectarian" />
    </ScreenContainer>
  );
}

// ============================================================
// STYLES
// ============================================================
const styles = StyleSheet.create({
  scrollContent: { paddingBottom: 120 },

  // ===== HUD Top Bar =====
  hudContainer: {
    marginHorizontal: 16, marginTop: 8,
    borderRadius: 16, overflow: 'hidden',
    borderWidth: 1, borderColor: '#D4AF3730',
  },
  hudBlur: { borderRadius: 16, overflow: 'hidden' },
  hudInner: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 14,
    backgroundColor: '#0A0A0A80',
  },
  hudLeft: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  hudAzimuth: {
    fontFamily: 'JetBrainsMono', fontSize: 32, color: '#E0E0E0', fontWeight: '700',
  },
  hudDirection: {
    fontFamily: 'Cinzel', fontSize: 16, color: '#D4AF37', fontWeight: '600', letterSpacing: 2,
  },
  hudDivider: {
    width: 1, height: 36, backgroundColor: '#D4AF3730', marginHorizontal: 16,
  },
  hudRight: { flex: 1 },
  hudHourLabel: {
    fontFamily: 'JetBrainsMono', fontSize: 9, color: '#6B6B6B',
    letterSpacing: 1, textTransform: 'uppercase',
  },
  hudHourRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  hudHourSymbol: { fontSize: 20 },
  hudHourName: { fontSize: 16, fontWeight: '700' },

  // ===== Warning =====
  warningBox: {
    backgroundColor: '#F59E0B15', borderWidth: 1, borderColor: '#F59E0B30',
    borderRadius: 8, padding: 10, marginTop: 8, marginHorizontal: 16,
  },
  warningText: { fontSize: 11, color: '#F59E0B', textAlign: 'center' },

  // ===== Viewfinder =====
  viewfinderContainer: {
    alignItems: 'center', marginTop: 16, marginHorizontal: 16,
  },
  viewfinderBg: {
    width: RING_SIZE + 16, height: RING_SIZE + 16,
    backgroundColor: '#050505', borderRadius: 20,
    borderWidth: 1, borderColor: '#D4AF3720',
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden', position: 'relative',
  },

  // ===== Compass Ring =====
  ringContainer: { alignItems: 'center', justifyContent: 'center' },

  // ===== Planet Legend =====
  legendContainer: {
    marginTop: 12, marginHorizontal: 16,
    alignItems: 'center',
  },
  legendScroll: {
    paddingHorizontal: 4, gap: 6,
  },
  legendItem: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8,
    backgroundColor: '#0D0D0D80',
    borderWidth: 1, borderColor: '#1A1A1A',
    borderRadius: 20,
  },
  legendItemFocused: {
    backgroundColor: '#1A1A1A',
    borderWidth: 1.5,
  },
  legendDot: {
    width: 8, height: 8, borderRadius: 4,
  },
  legendName: {
    fontSize: 12, color: '#9B9B9B', fontWeight: '500',
  },
  clearFocusBtn: {
    marginTop: 8, paddingHorizontal: 16, paddingVertical: 6,
    borderRadius: 12, borderWidth: 1, borderColor: '#D4AF3740',
    backgroundColor: '#0D0D0D80',
  },
  clearFocusText: {
    fontSize: 11, color: '#D4AF37', fontWeight: '600', letterSpacing: 1,
  },

  // ===== Bottom Sheet =====
  sheetOuter: {
    marginTop: 20, marginHorizontal: 16,
    borderRadius: 20, overflow: 'hidden',
    borderWidth: 1, borderColor: '#D4AF3730',
  },
  sheetBlur: { borderRadius: 20, overflow: 'hidden' },
  sheetInner: {
    padding: 16, paddingTop: 12,
    backgroundColor: '#0A0A0A80',
  },
  sheetHandle: {
    width: 40, height: 4, borderRadius: 2, backgroundColor: '#D4AF3740',
    alignSelf: 'center', marginBottom: 12,
  },
  sheetTitle: {
    fontFamily: 'Cinzel', fontSize: 18, color: '#D4AF37',
    textAlign: 'center', letterSpacing: 2,
  },
  sheetSubtitle: { fontSize: 11, color: '#6B6B6B', textAlign: 'center', marginTop: 2 },
  sheetMeta: { flexDirection: 'row', justifyContent: 'center', gap: 16, marginTop: 8 },
  metaText: { fontFamily: 'JetBrainsMono', fontSize: 10, color: '#6B6B6B' },
  sectionTitle: {
    fontFamily: 'Cinzel', fontSize: 14, color: '#E0E0E0',
    marginTop: 16, marginBottom: 8, letterSpacing: 2,
  },

  // ===== Aspectarian =====
  aspectSection: { marginTop: 12 },
  aspectHeader: {
    backgroundColor: '#0D0D0D80', borderWidth: 1, borderColor: '#1A1A1A',
    borderRadius: 12, padding: 14,
  },
  aspectTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  aspectTitle: { fontFamily: 'Cinzel', fontSize: 16, color: '#E0E0E0', letterSpacing: 2 },
  aspectToggle: { fontFamily: 'JetBrainsMono', fontSize: 11, color: '#6B6B6B', marginTop: 4 },
  aspectBody: {
    backgroundColor: '#08080880', borderWidth: 1, borderColor: '#1A1A1A',
    borderTopWidth: 0, borderBottomLeftRadius: 12, borderBottomRightRadius: 12, padding: 8,
  },
  noAspects: { fontSize: 12, color: '#6B6B6B', textAlign: 'center', padding: 16 },
  aspectRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 8,
    paddingHorizontal: 8, borderRadius: 8, marginBottom: 2,
  },
  aspectRowExact: { backgroundColor: '#D4AF3708', borderWidth: 1, borderColor: '#D4AF3720' },
  aspectPlanets: { flexDirection: 'row', alignItems: 'center', gap: 4, width: 70 },
  aspectPSymbol: { fontSize: 16 },
  aspectSymbol: { fontSize: 14 },
  aspectDetail: { flex: 1, marginLeft: 8 },
  aspectType: { fontSize: 12, fontWeight: '700' },
  aspectPair: { fontSize: 10, color: '#6B6B6B', marginTop: 1 },
  aspectOrbCol: { alignItems: 'flex-end' },
  aspectOrb: { fontFamily: 'JetBrainsMono', fontSize: 12, color: '#E0E0E0' },
  exactLabel: { fontFamily: 'JetBrainsMono', fontSize: 8, color: '#D4AF37', letterSpacing: 1, marginTop: 1 },

  // ===== Planet Cards =====
  planetCard: {
    backgroundColor: '#0D0D0D80', borderWidth: 1, borderColor: '#1A1A1A',
    borderRadius: 12, padding: 14, marginBottom: 8,
  },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cardIconWrap: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  cardIcon: { fontSize: 28 },
  cardInfo: { flex: 1 },
  cardName: { fontSize: 16, fontWeight: '600', color: '#E0E0E0' },
  cardDegree: { fontFamily: 'JetBrainsMono', fontSize: 12, color: '#6B6B6B', marginTop: 2 },
  cardScore: { fontFamily: 'JetBrainsMono', fontSize: 18, fontWeight: '700' },
  scorePos: { color: '#22C55E' },
  scoreNeg: { color: '#EF4444' },
  scoreNeu: { color: '#6B6B6B' },
  verdictBar: { marginTop: 10, paddingLeft: 10, borderLeftWidth: 3 },
  verdictText: { fontSize: 12, fontStyle: 'italic', lineHeight: 18 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  tag: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  tagLabel: { fontSize: 10, fontWeight: '700' },
  techRow: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 10,
    paddingTop: 8, borderTopWidth: 1, borderTopColor: '#1A1A1A',
  },
  techItem: {},
  techLabel: { fontSize: 9, color: '#6B6B6B' },
  techVal: { fontFamily: 'JetBrainsMono', fontSize: 11, color: '#E0E0E0' },

  // ===== Modals =====
  modalOverlay: {
    flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32,
  },
  modalBlurWrap: {
    width: '100%', maxWidth: 340, borderRadius: 16, overflow: 'hidden',
    borderWidth: 1, borderColor: '#D4AF3730',
  },
  modalContent: {
    backgroundColor: '#0D0D0D90', padding: 24, alignItems: 'center',
  },
  modalSymbol: { fontSize: 40 },
  modalTitle: {
    fontFamily: 'Cinzel', fontSize: 20, color: '#E0E0E0',
    marginTop: 8, letterSpacing: 2,
  },
  modalRow: { flexDirection: 'row', gap: 12, marginTop: 16 },
  modalTag: {
    flex: 1, backgroundColor: '#08080880', borderWidth: 1, borderColor: '#1A1A1A',
    borderRadius: 8, padding: 10, alignItems: 'center',
  },
  modalTagLabel: { fontFamily: 'JetBrainsMono', fontSize: 9, color: '#6B6B6B', letterSpacing: 1 },
  modalTagValue: { fontSize: 13, color: '#D4AF37', fontWeight: '600', marginTop: 4 },
  modalDesc: { fontSize: 13, color: '#E0E0E0', lineHeight: 20, marginTop: 16, textAlign: 'center' },
  modalClose: {
    marginTop: 20, paddingHorizontal: 24, paddingVertical: 10,
    borderRadius: 20, borderWidth: 1, borderColor: '#D4AF3730',
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
