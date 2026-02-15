import { useState, useEffect, useRef, useCallback } from 'react';
import { Text, View, StyleSheet, Dimensions, Platform, Pressable } from 'react-native';
import { Magnetometer, Accelerometer } from 'expo-sensors';
import Svg, { Circle, Line, Text as SvgText, G } from 'react-native-svg';
import { ScreenContainer } from '@/components/screen-container';
import { useAstroStore } from '@/lib/astro/store';
import { calculateHeading } from '@/lib/compass/sensor-fusion';
import { PLANET_SYMBOLS, PLANET_COLORS, PlanetPosition } from '@/lib/astro/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const RADAR_SIZE = SCREEN_WIDTH - 64;
const RADAR_CENTER = RADAR_SIZE / 2;
const RADAR_RADIUS = RADAR_SIZE / 2 - 30;

type ViewMode = 'radar' | 'ar';

export default function CompassScreen() {
  const [viewMode, setViewMode] = useState<ViewMode>('radar');
  const [heading, setHeading] = useState(0);
  const [magData, setMagData] = useState({ x: 0, y: 0, z: 0 });
  const [sensorAvailable, setSensorAvailable] = useState(true);
  const chartData = useAstroStore((s) => s.chartData);
  const recalculate = useAstroStore((s) => s.recalculate);

  useEffect(() => {
    recalculate();
  }, []);

  useEffect(() => {
    if (Platform.OS === 'web') {
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
          setMagData(data);
          const h = calculateHeading(data.x, data.y);
          setHeading(h);
        });
      } catch {
        setSensorAvailable(false);
      }
    };

    subscribe();

    return () => {
      magSub?.remove();
    };
  }, []);

  const planets = chartData?.planets.filter(p =>
    ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn'].includes(p.planet)
  ) ?? [];

  const renderRadarView = useCallback(() => {
    const directions = [
      { label: 'N', angle: 0 },
      { label: 'E', angle: 90 },
      { label: 'S', angle: 180 },
      { label: 'W', angle: 270 },
    ];

    return (
      <View style={styles.radarContainer}>
        <Svg width={RADAR_SIZE} height={RADAR_SIZE} viewBox={`0 0 ${RADAR_SIZE} ${RADAR_SIZE}`}>
          {/* Radar circles */}
          {[0.25, 0.5, 0.75, 1].map((scale) => (
            <Circle
              key={scale}
              cx={RADAR_CENTER}
              cy={RADAR_CENTER}
              r={RADAR_RADIUS * scale}
              stroke="#1A1A1A"
              strokeWidth={1}
              fill="none"
            />
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

          {/* Center dot (user) */}
          <Circle cx={RADAR_CENTER} cy={RADAR_CENTER} r={4} fill="#D4AF37" />

          {/* Planet positions */}
          {planets.map((planet) => {
            if (planet.azimuth === undefined) return null;
            // Convert azimuth to radar position (relative to heading)
            const relativeAz = ((planet.azimuth - heading + 360) % 360);
            const rad = (relativeAz * Math.PI) / 180;
            // Use altitude to determine distance from center (higher = closer to center)
            const altFactor = planet.altitude !== undefined
              ? Math.max(0.2, 1 - Math.abs(planet.altitude) / 90)
              : 0.7;
            const dist = RADAR_RADIUS * altFactor;
            const px = RADAR_CENTER + dist * Math.sin(rad);
            const py = RADAR_CENTER - dist * Math.cos(rad);
            const color = PLANET_COLORS[planet.planet];
            const dignity = chartData?.dignities[planet.planet];
            const isStrong = dignity && dignity.score > 0;

            return (
              <G key={planet.planet}>
                <Line
                  x1={RADAR_CENTER}
                  y1={RADAR_CENTER}
                  x2={px}
                  y2={py}
                  stroke={color + '40'}
                  strokeWidth={1}
                />
                {isStrong && (
                  <Circle cx={px} cy={py} r={14} fill={color + '20'} />
                )}
                <Circle cx={px} cy={py} r={6} fill={color} />
                <SvgText
                  x={px}
                  y={py - 14}
                  fill={color}
                  fontSize={16}
                  textAnchor="middle"
                >
                  {PLANET_SYMBOLS[planet.planet]}
                </SvgText>
                <SvgText
                  x={px}
                  y={py + 18}
                  fill="#6B6B6B"
                  fontSize={8}
                  textAnchor="middle"
                >
                  {planet.azimuth.toFixed(0)}°
                </SvgText>
              </G>
            );
          })}
        </Svg>
      </View>
    );
  }, [heading, planets, chartData]);

  const renderARView = useCallback(() => {
    return (
      <View style={styles.arContainer}>
        <View style={styles.arBackground}>
          {/* Simulated AR view - shows planet positions relative to heading */}
          <View style={styles.arHorizon} />

          {planets.map((planet) => {
            if (planet.azimuth === undefined) return null;
            // Calculate relative position on screen
            let relAz = planet.azimuth - heading;
            if (relAz > 180) relAz -= 360;
            if (relAz < -180) relAz += 360;

            // Only show planets within ~90° field of view
            if (Math.abs(relAz) > 60) return null;

            const screenX = (SCREEN_WIDTH / 2) + (relAz / 60) * (SCREEN_WIDTH / 2);
            const alt = planet.altitude ?? 0;
            const screenY = 200 - (alt / 90) * 180;
            const color = PLANET_COLORS[planet.planet];
            const dignity = chartData?.dignities[planet.planet];
            const isStrong = dignity && dignity.score > 0;

            return (
              <View
                key={planet.planet}
                style={[
                  styles.arPlanet,
                  {
                    left: screenX - 20,
                    top: screenY - 20,
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
              </View>
            );
          })}

          {/* Crosshair */}
          <View style={styles.crosshairH} />
          <View style={styles.crosshairV} />
        </View>
      </View>
    );
  }, [heading, planets, chartData]);

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

        {/* Main View */}
        {viewMode === 'radar' ? renderRadarView() : renderARView()}

        {/* Planet Legend */}
        <View style={styles.legend}>
          {planets.map((p) => (
            <View key={p.planet} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: PLANET_COLORS[p.planet] }]} />
              <Text style={styles.legendText}>{PLANET_SYMBOLS[p.planet]}</Text>
              <Text style={styles.legendAz}>{p.azimuth?.toFixed(0)}°</Text>
            </View>
          ))}
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
  radarContainer: {
    alignItems: 'center',
    marginTop: 16,
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
