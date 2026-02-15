import { useState, useEffect, useCallback } from 'react';
import { Text, View, StyleSheet, Dimensions, Platform, Pressable } from 'react-native';
import { Magnetometer } from 'expo-sensors';
import Svg, { Circle, Line, Text as SvgText, G, Rect } from 'react-native-svg';
import { ScreenContainer } from '@/components/screen-container';
import { useAstroStore } from '@/lib/astro/store';
import { calculateHeading } from '@/lib/compass/sensor-fusion';
import { PLANET_SYMBOLS, PLANET_COLORS, PlanetPosition, Planet } from '@/lib/astro/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const RADAR_SIZE = SCREEN_WIDTH - 64;
const RADAR_CENTER = RADAR_SIZE / 2;
const RADAR_RADIUS = RADAR_SIZE / 2 - 30;

type ViewMode = 'radar' | 'ar';

// Anti-collision: resolve overlapping planet positions
interface ResolvedPosition {
  planet: PlanetPosition;
  px: number;
  py: number;
  labelX: number;
  labelY: number;
  color: string;
}

function resolveCollisions(positions: ResolvedPosition[], minDist: number = 24): ResolvedPosition[] {
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

export default function CompassScreen() {
  const [viewMode, setViewMode] = useState<ViewMode>('radar');
  const [heading, setHeading] = useState(0);
  const [sensorAvailable, setSensorAvailable] = useState(true);
  const [focusedPlanet, setFocusedPlanet] = useState<Planet | null>(null);
  const chartData = useAstroStore((s) => s.chartData);
  const recalculate = useAstroStore((s) => s.recalculate);

  useEffect(() => {
    recalculate();
  }, []);

  useEffect(() => {
    if (Platform.OS === ('web' as string)) {
      setSensorAvailable(false);
      return;
    }

    let magSub: any;

    const subscribe = async () => {
      try {
        const available = await Magnetometer.isAvailableAsync();
        if (!available) {
          setSensorAvailable(false);
          return;
        }

        Magnetometer.setUpdateInterval(100);
        magSub = Magnetometer.addListener((data) => {
          const h = calculateHeading(data.x, data.y);
          setHeading(h);
        });
      } catch {
        setSensorAvailable(false);
      }
    };

    subscribe();
    return () => { magSub?.remove(); };
  }, []);

  const planets = chartData?.planets.filter(p =>
    ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn'].includes(p.planet)
  ) ?? [];

  const handlePlanetTap = (planet: Planet) => {
    if (Platform.OS !== ('web' as string)) {
      import('expo-haptics').then(H => H.impactAsync(H.ImpactFeedbackStyle.Light));
    }
    setFocusedPlanet(prev => prev === planet ? null : planet);
  };

  // Altitude ring labels
  const altitudeRings = [
    { scale: 1.0, label: 'Horizon 0°' },
    { scale: 0.75, label: '30°' },
    { scale: 0.5, label: '60°' },
    { scale: 0.25, label: 'Zenith 90°' },
  ];

  const renderRadarView = useCallback(() => {
    const directions = [
      { label: 'N', angle: 0 },
      { label: 'E', angle: 90 },
      { label: 'S', angle: 180 },
      { label: 'W', angle: 270 },
    ];

    // Calculate initial positions
    const rawPositions: ResolvedPosition[] = planets
      .filter(p => p.azimuth !== undefined)
      .map(planet => {
        const relativeAz = ((planet.azimuth! - heading + 360) % 360);
        const rad = (relativeAz * Math.PI) / 180;
        const altFactor = planet.altitude !== undefined
          ? Math.max(0.1, 1 - Math.abs(planet.altitude) / 90)
          : 0.7;
        const dist = RADAR_RADIUS * altFactor;
        const px = RADAR_CENTER + dist * Math.sin(rad);
        const py = RADAR_CENTER - dist * Math.cos(rad);
        return {
          planet,
          px,
          py,
          labelX: px,
          labelY: py - 16,
          color: PLANET_COLORS[planet.planet],
        };
      });

    // Resolve collisions for labels
    const positions = resolveCollisions(rawPositions, 28);

    return (
      <View style={styles.radarContainer}>
        <Svg width={RADAR_SIZE} height={RADAR_SIZE} viewBox={`0 0 ${RADAR_SIZE} ${RADAR_SIZE}`}>
          {/* Altitude rings with labels */}
          {altitudeRings.map(({ scale, label }) => (
            <G key={label}>
              <Circle
                cx={RADAR_CENTER}
                cy={RADAR_CENTER}
                r={RADAR_RADIUS * scale}
                stroke="#1A1A1A"
                strokeWidth={1}
                fill="none"
              />
              <SvgText
                x={RADAR_CENTER + RADAR_RADIUS * scale * 0.71}
                y={RADAR_CENTER - RADAR_RADIUS * scale * 0.71}
                fill="#333"
                fontSize={7}
                textAnchor="start"
              >
                {label}
              </SvgText>
            </G>
          ))}

          {/* Cardinal direction lines */}
          {directions.map((dir) => {
            const rad = ((dir.angle - heading) * Math.PI) / 180;
            const x2 = RADAR_CENTER + RADAR_RADIUS * Math.sin(rad);
            const y2 = RADAR_CENTER - RADAR_RADIUS * Math.cos(rad);
            const labelX = RADAR_CENTER + (RADAR_RADIUS + 15) * Math.sin(rad);
            const labelY = RADAR_CENTER - (RADAR_RADIUS + 15) * Math.cos(rad);
            return (
              <G key={dir.label}>
                <Line
                  x1={RADAR_CENTER}
                  y1={RADAR_CENTER}
                  x2={x2}
                  y2={y2}
                  stroke="#1A1A1A"
                  strokeWidth={0.5}
                  strokeDasharray="4,4"
                />
                <SvgText
                  x={labelX}
                  y={labelY}
                  fill={dir.label === 'N' ? '#D4AF37' : '#6B6B6B'}
                  fontSize={12}
                  fontWeight="bold"
                  textAnchor="middle"
                  alignmentBaseline="central"
                >
                  {dir.label}
                </SvgText>
              </G>
            );
          })}

          {/* Center dot */}
          <Circle cx={RADAR_CENTER} cy={RADAR_CENTER} r={4} fill="#D4AF37" />

          {/* Planet positions */}
          {positions.map(({ planet, px, py, labelX, labelY, color }) => {
            const dignity = chartData?.dignities[planet.planet];
            const isStrong = dignity && dignity.score > 0;
            const isFocused = focusedPlanet === null || focusedPlanet === planet.planet;
            const opacity = isFocused ? 1 : 0.3;

            return (
              <G key={planet.planet} opacity={opacity}>
                {/* Connector line from center */}
                <Line
                  x1={RADAR_CENTER}
                  y1={RADAR_CENTER}
                  x2={px}
                  y2={py}
                  stroke={color + '40'}
                  strokeWidth={1}
                />
                {/* Glow for strong planets */}
                {isStrong && (
                  <Circle cx={px} cy={py} r={14} fill={color + '20'} />
                )}
                {/* Anchor dot (always on true azimuth) */}
                <Circle cx={px} cy={py} r={6} fill={color} />
                {/* Symbol label (anti-collision offset) */}
                <SvgText
                  x={labelX}
                  y={labelY}
                  fill={color}
                  fontSize={16}
                  textAnchor="middle"
                >
                  {PLANET_SYMBOLS[planet.planet]}
                </SvgText>
                {/* Degree label */}
                <SvgText
                  x={labelX}
                  y={labelY + 26}
                  fill="#6B6B6B"
                  fontSize={8}
                  textAnchor="middle"
                >
                  {planet.azimuth!.toFixed(0)}° / {(planet.altitude ?? 0).toFixed(0)}°
                </SvgText>
                {/* Invisible tap target */}
                <Rect
                  x={px - 18}
                  y={py - 18}
                  width={36}
                  height={36}
                  fill="transparent"
                  onPress={() => handlePlanetTap(planet.planet)}
                />
              </G>
            );
          })}
        </Svg>
      </View>
    );
  }, [heading, planets, chartData, focusedPlanet]);

  const renderARView = useCallback(() => {
    return (
      <View style={styles.arContainer}>
        <View style={styles.arBackground}>
          <View style={styles.arHorizon} />

          {planets.map((planet) => {
            if (planet.azimuth === undefined) return null;
            let relAz = planet.azimuth - heading;
            if (relAz > 180) relAz -= 360;
            if (relAz < -180) relAz += 360;
            if (Math.abs(relAz) > 60) return null;

            const screenX = (SCREEN_WIDTH / 2) + (relAz / 60) * (SCREEN_WIDTH / 2);
            const alt = planet.altitude ?? 0;
            const screenY = 200 - (alt / 90) * 180;
            const color = PLANET_COLORS[planet.planet];
            const dignity = chartData?.dignities[planet.planet];
            const isStrong = dignity && dignity.score > 0;
            const isFocused = focusedPlanet === null || focusedPlanet === planet.planet;

            return (
              <Pressable
                key={planet.planet}
                onPress={() => handlePlanetTap(planet.planet)}
                style={[
                  styles.arPlanet,
                  {
                    left: screenX - 20,
                    top: screenY - 20,
                    opacity: isFocused ? 1 : 0.3,
                  },
                ]}
              >
                {isStrong && (
                  <View style={[styles.arGlow, { backgroundColor: color + '30' }]} />
                )}
                <Text style={[styles.arSymbol, { color }]}>
                  {PLANET_SYMBOLS[planet.planet]}
                </Text>
                <Text style={[styles.arLabel, { color }]}>{planet.planet}</Text>
                <Text style={styles.arDegree}>
                  {planet.azimuth.toFixed(0)}° / {alt.toFixed(0)}°
                </Text>
              </Pressable>
            );
          })}

          {/* Crosshair */}
          <View style={styles.crosshairH} />
          <View style={styles.crosshairV} />
        </View>
      </View>
    );
  }, [heading, planets, chartData, focusedPlanet]);

  return (
    <ScreenContainer>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Ritual Compass</Text>
          <Text style={styles.headingText}>
            {heading.toFixed(0)}° {getCardinalDirection(heading)}
          </Text>
        </View>

        {/* View Mode Toggle */}
        <View style={styles.toggleRow}>
          <Pressable
            onPress={() => setViewMode('radar')}
            style={({ pressed }) => [
              styles.toggleBtn,
              viewMode === 'radar' && styles.toggleActive,
              pressed && { opacity: 0.7 },
            ]}
          >
            <Text style={[styles.toggleText, viewMode === 'radar' && styles.toggleTextActive]}>
              Radar
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setViewMode('ar')}
            style={({ pressed }) => [
              styles.toggleBtn,
              viewMode === 'ar' && styles.toggleActive,
              pressed && { opacity: 0.7 },
            ]}
          >
            <Text style={[styles.toggleText, viewMode === 'ar' && styles.toggleTextActive]}>
              AR View
            </Text>
          </Pressable>
        </View>

        {!sensorAvailable && (
          <View style={styles.warningBox}>
            <Text style={styles.warningText}>
              Compass sensors not available on this device. Using simulated heading.
            </Text>
          </View>
        )}

        {/* Focus Mode Indicator */}
        {focusedPlanet && (
          <Pressable
            onPress={() => setFocusedPlanet(null)}
            style={({ pressed }) => [styles.focusBadge, pressed && { opacity: 0.7 }]}
          >
            <Text style={[styles.focusText, { color: PLANET_COLORS[focusedPlanet] }]}>
              {PLANET_SYMBOLS[focusedPlanet]} {focusedPlanet} focused
            </Text>
            <Text style={styles.focusDismiss}>Tap to clear</Text>
          </Pressable>
        )}

        {/* Main View */}
        {viewMode === 'radar' ? renderRadarView() : renderARView()}

        {/* Planet Legend */}
        <View style={styles.legend}>
          {planets.map((p) => {
            const isFocused = focusedPlanet === null || focusedPlanet === p.planet;
            return (
              <Pressable
                key={p.planet}
                onPress={() => handlePlanetTap(p.planet)}
                style={[styles.legendItem, { opacity: isFocused ? 1 : 0.4 }]}
              >
                <View style={[styles.legendDot, { backgroundColor: PLANET_COLORS[p.planet] }]} />
                <Text style={styles.legendText}>{PLANET_SYMBOLS[p.planet]}</Text>
                <Text style={styles.legendAz}>{p.azimuth?.toFixed(0)}°</Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </ScreenContainer>
  );
}

function getCardinalDirection(heading: number): string {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const index = Math.round(heading / 45) % 8;
  return dirs[index];
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
  },
  header: {
    alignItems: 'center',
    paddingTop: 8,
  },
  title: {
    fontFamily: 'Cinzel',
    fontSize: 20,
    color: '#D4AF37',
    letterSpacing: 3,
  },
  headingText: {
    fontFamily: 'JetBrainsMono',
    fontSize: 32,
    color: '#E0E0E0',
    marginTop: 4,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
  },
  toggleBtn: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#1A1A1A',
    backgroundColor: '#0D0D0D',
  },
  toggleActive: {
    borderColor: '#D4AF37',
    backgroundColor: '#D4AF3710',
  },
  toggleText: {
    fontSize: 13,
    color: '#6B6B6B',
    fontWeight: '600',
  },
  toggleTextActive: {
    color: '#D4AF37',
  },
  warningBox: {
    backgroundColor: '#F59E0B15',
    borderWidth: 1,
    borderColor: '#F59E0B30',
    borderRadius: 8,
    padding: 10,
    marginTop: 8,
  },
  warningText: {
    fontSize: 11,
    color: '#F59E0B',
    textAlign: 'center',
  },
  focusBadge: {
    alignSelf: 'center',
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#1A1A1A',
    backgroundColor: '#0D0D0D',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  focusText: {
    fontSize: 13,
    fontWeight: '600',
  },
  focusDismiss: {
    fontSize: 10,
    color: '#6B6B6B',
  },
  radarContainer: {
    alignItems: 'center',
    marginTop: 12,
  },
  arContainer: {
    flex: 1,
    marginTop: 12,
  },
  arBackground: {
    flex: 1,
    backgroundColor: '#080808',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1A1A1A',
    overflow: 'hidden',
    position: 'relative',
    minHeight: 300,
  },
  arHorizon: {
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: '#1A1A1A',
  },
  arPlanet: {
    position: 'absolute',
    alignItems: 'center',
    width: 40,
  },
  arGlow: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    top: 0,
  },
  arSymbol: {
    fontSize: 22,
    textAlign: 'center',
  },
  arLabel: {
    fontSize: 9,
    fontWeight: '600',
    textAlign: 'center',
  },
  arDegree: {
    fontFamily: 'JetBrainsMono',
    fontSize: 8,
    color: '#6B6B6B',
    textAlign: 'center',
  },
  crosshairH: {
    position: 'absolute',
    top: '50%',
    left: '45%',
    right: '45%',
    height: 1,
    backgroundColor: '#D4AF3740',
  },
  crosshairV: {
    position: 'absolute',
    left: '50%',
    top: '45%',
    bottom: '45%',
    width: 1,
    backgroundColor: '#D4AF3740',
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  legendText: {
    fontSize: 14,
    color: '#E0E0E0',
  },
  legendAz: {
    fontFamily: 'JetBrainsMono',
    fontSize: 10,
    color: '#6B6B6B',
  },
});
