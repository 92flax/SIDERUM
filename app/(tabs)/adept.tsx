// ============================================================
// ÆONIS – Adept Analytics (Grimoire Analytics)
// Elemental Radar, Consistency Heatmap, Planetary Affinity
// ============================================================

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Text, View, StyleSheet, ScrollView, Pressable, Platform, Dimensions,
} from 'react-native';
import Svg, { Circle, Line, Polygon, Text as SvgText, G, Rect } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { ScreenContainer } from '@/components/screen-container';
import { useNatalStore } from '@/lib/store/natal-store';
import { useRuneWalletStore } from '@/lib/store/rune-wallet';
import {
  loadLocalAnalytics, LocalAnalytics, LEVEL_TITLES,
  xpForNextLevel, xpForCurrentLevel,
} from '@/lib/ritual/completion-handler';
import { useRouter } from 'expo-router';

const { width: SW } = Dimensions.get('window');
const RADAR_SIZE = Math.min(SW - 80, 260);
const RADAR_CENTER = RADAR_SIZE / 2;
const RADAR_RADIUS = RADAR_SIZE / 2 - 20;

const ELEMENTS = [
  { key: 'elementFireXp', label: 'Fire', color: '#EF4444', angle: -90 },
  { key: 'elementAirXp', label: 'Air', color: '#3B82F6', angle: -18 },
  { key: 'elementWaterXp', label: 'Water', color: '#06B6D4', angle: 54 },
  { key: 'elementEarthXp', label: 'Earth', color: '#22C55E', angle: 126 },
  { key: 'elementSpiritXp', label: 'Spirit', color: '#D4AF37', angle: 198 },
] as const;

// Heatmap: last 90 days
const HEATMAP_DAYS = 91; // 13 weeks
const HEATMAP_COLS = 13;
const HEATMAP_ROWS = 7;

export default function AdeptScreen() {
  const [analytics, setAnalytics] = useState<LocalAnalytics | null>(null);
  const natalData = useNatalStore((s) => s.natalData);
  const masterRune = useRuneWalletStore((s) => s.masterRune);
  const router = useRouter();

  useEffect(() => {
    loadLocalAnalytics().then(setAnalytics);
  }, []);

  // ===== Elemental Radar Data =====
  const radarData = useMemo(() => {
    if (!analytics) return null;
    const values = ELEMENTS.map(e => (analytics as any)[e.key] as number);
    const maxVal = Math.max(...values, 1);
    return ELEMENTS.map((e, i) => ({
      ...e,
      value: values[i],
      normalized: values[i] / maxVal, // 0-1
    }));
  }, [analytics]);

  // ===== Heatmap Data =====
  const heatmapData = useMemo(() => {
    if (!analytics) return [];
    const activity = analytics.last365DaysActivity;
    const today = new Date();
    const cells: Array<{ date: string; xp: number; dayOfWeek: number; weekIndex: number }> = [];

    for (let i = HEATMAP_DAYS - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayOfWeek = d.getDay(); // 0=Sun
      const weekIndex = HEATMAP_COLS - 1 - Math.floor(i / 7);
      cells.push({
        date: dateStr,
        xp: activity[dateStr] ?? 0,
        dayOfWeek,
        weekIndex,
      });
    }
    return cells;
  }, [analytics]);

  const maxHeatmapXp = useMemo(() => {
    return Math.max(...heatmapData.map(c => c.xp), 1);
  }, [heatmapData]);

  // ===== Planetary Affinity (top 3 from ritual planet tags) =====
  const planetaryAffinity = useMemo(() => {
    if (!analytics) return [];
    // Derive from element distribution as proxy
    const affinities = [
      { planet: 'Mars', xp: analytics.elementFireXp, color: '#EF4444', symbol: '♂' },
      { planet: 'Mercury', xp: analytics.elementAirXp, color: '#F59E0B', symbol: '☿' },
      { planet: 'Moon', xp: analytics.elementWaterXp, color: '#C0C0C0', symbol: '☽' },
      { planet: 'Venus', xp: analytics.elementEarthXp, color: '#22C55E', symbol: '♀' },
      { planet: 'Sun', xp: analytics.elementSpiritXp, color: '#D4AF37', symbol: '☉' },
    ];
    const total = affinities.reduce((s, a) => s + a.xp, 0) || 1;
    return affinities
      .map(a => ({ ...a, percent: Math.round((a.xp / total) * 100) }))
      .sort((a, b) => b.xp - a.xp)
      .slice(0, 3);
  }, [analytics]);

  const getHeatmapColor = useCallback((xp: number): string => {
    if (xp === 0) return '#1A1A1A';
    const ratio = xp / maxHeatmapXp;
    if (ratio < 0.25) return '#1E3A5F'; // Low: dark blue
    if (ratio < 0.5) return '#2563EB';  // Medium: blue
    if (ratio < 0.75) return '#D4AF37'; // High: gold
    return '#FFD700'; // Max: bright gold
  }, [maxHeatmapXp]);

  if (!analytics) {
    return (
      <ScreenContainer>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading analytics...</Text>
        </View>
      </ScreenContainer>
    );
  }

  const currentLevel = analytics.levelRank;
  const currentLevelXp = xpForCurrentLevel(currentLevel);
  const nextLevelXp = xpForNextLevel(currentLevel);
  const xpProgress = analytics.xpTotal - currentLevelXp;
  const xpNeeded = nextLevelXp - currentLevelXp;
  const progressPercent = xpNeeded > 0 ? Math.min(100, Math.round((xpProgress / xpNeeded) * 100)) : 100;

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Adept</Text>
        <Text style={styles.subtitle}>Grimoire Analytics</Text>

        {/* Level & XP Card */}
        <View style={styles.levelCard}>
          <View style={styles.levelHeader}>
            <View>
              <Text style={styles.levelLabel}>RANK</Text>
              <Text style={styles.levelTitle}>
                {LEVEL_TITLES[currentLevel] ?? 'Neophyte'}
              </Text>
            </View>
            <Text style={styles.levelNumber}>Lv.{currentLevel}</Text>
          </View>
          <View style={styles.xpBarTrack}>
            <View style={[styles.xpBarFill, { width: `${progressPercent}%` }]} />
          </View>
          <View style={styles.xpRow}>
            <Text style={styles.xpText}>{analytics.xpTotal.toLocaleString()} XP</Text>
            <Text style={styles.xpNext}>
              {xpNeeded > 0 ? `${xpProgress}/${xpNeeded} to next` : 'MAX'}
            </Text>
          </View>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{analytics.ritualsPerformedCount}</Text>
            <Text style={styles.statLabel}>Rituals</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{analytics.totalStasisMinutes}</Text>
            <Text style={styles.statLabel}>Stasis Min</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>
              {Object.keys(analytics.last365DaysActivity).length}
            </Text>
            <Text style={styles.statLabel}>Active Days</Text>
          </View>
        </View>

        {/* ===== Elemental Radar ===== */}
        <Text style={styles.sectionTitle}>Elemental Balance</Text>
        {radarData && (
          <View style={styles.radarCard}>
            <Svg width={RADAR_SIZE} height={RADAR_SIZE} viewBox={`0 0 ${RADAR_SIZE} ${RADAR_SIZE}`}>
              {/* Background rings */}
              {[0.25, 0.5, 0.75, 1.0].map(scale => (
                <Circle
                  key={scale}
                  cx={RADAR_CENTER}
                  cy={RADAR_CENTER}
                  r={RADAR_RADIUS * scale}
                  stroke="#1A1A1A"
                  strokeWidth={0.8}
                  fill="none"
                />
              ))}

              {/* Axis lines */}
              {radarData.map(e => {
                const rad = (e.angle * Math.PI) / 180;
                const x2 = RADAR_CENTER + RADAR_RADIUS * Math.cos(rad);
                const y2 = RADAR_CENTER + RADAR_RADIUS * Math.sin(rad);
                return (
                  <Line
                    key={e.key}
                    x1={RADAR_CENTER} y1={RADAR_CENTER}
                    x2={x2} y2={y2}
                    stroke="#1A1A1A" strokeWidth={0.5}
                  />
                );
              })}

              {/* Data polygon */}
              <Polygon
                points={radarData.map(e => {
                  const rad = (e.angle * Math.PI) / 180;
                  const dist = RADAR_RADIUS * Math.max(0.05, e.normalized);
                  const x = RADAR_CENTER + dist * Math.cos(rad);
                  const y = RADAR_CENTER + dist * Math.sin(rad);
                  return `${x},${y}`;
                }).join(' ')}
                fill="#D4AF3720"
                stroke="#D4AF37"
                strokeWidth={2}
              />

              {/* Data points and labels */}
              {radarData.map(e => {
                const rad = (e.angle * Math.PI) / 180;
                const dist = RADAR_RADIUS * Math.max(0.05, e.normalized);
                const px = RADAR_CENTER + dist * Math.cos(rad);
                const py = RADAR_CENTER + dist * Math.sin(rad);
                const labelDist = RADAR_RADIUS + 14;
                const lx = RADAR_CENTER + labelDist * Math.cos(rad);
                const ly = RADAR_CENTER + labelDist * Math.sin(rad);
                return (
                  <G key={e.key}>
                    <Circle cx={px} cy={py} r={4} fill={e.color} />
                    <SvgText
                      x={lx} y={ly}
                      fill={e.color}
                      fontSize={10}
                      fontWeight="bold"
                      textAnchor="middle"
                      alignmentBaseline="central"
                    >
                      {e.label}
                    </SvgText>
                  </G>
                );
              })}
            </Svg>

            {/* Element XP breakdown */}
            <View style={styles.elementList}>
              {radarData.map(e => (
                <View key={e.key} style={styles.elementRow}>
                  <View style={[styles.elementDot, { backgroundColor: e.color }]} />
                  <Text style={styles.elementName}>{e.label}</Text>
                  <Text style={styles.elementXp}>{e.value} XP</Text>
                  <Text style={styles.elementPercent}>
                    {Math.round(e.normalized * 100)}%
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ===== Consistency Heatmap ===== */}
        <Text style={styles.sectionTitle}>Consistency (90 Days)</Text>
        <View style={styles.heatmapCard}>
          <View style={styles.heatmapGrid}>
            {Array.from({ length: HEATMAP_ROWS }).map((_, row) => (
              <View key={row} style={styles.heatmapRow}>
                {Array.from({ length: HEATMAP_COLS }).map((_, col) => {
                  const cell = heatmapData.find(
                    c => c.dayOfWeek === row && c.weekIndex === col
                  );
                  const xp = cell?.xp ?? 0;
                  return (
                    <View
                      key={`${row}-${col}`}
                      style={[
                        styles.heatmapCell,
                        { backgroundColor: getHeatmapColor(xp) },
                      ]}
                    />
                  );
                })}
              </View>
            ))}
          </View>
          <View style={styles.heatmapLegend}>
            <Text style={styles.heatmapLegendText}>Less</Text>
            {['#1A1A1A', '#1E3A5F', '#2563EB', '#D4AF37', '#FFD700'].map(c => (
              <View key={c} style={[styles.heatmapLegendDot, { backgroundColor: c }]} />
            ))}
            <Text style={styles.heatmapLegendText}>More</Text>
          </View>
        </View>

        {/* ===== Planetary Affinity ===== */}
        <Text style={styles.sectionTitle}>Planetary Affinity</Text>
        <View style={styles.affinityCard}>
          {planetaryAffinity.map((p, i) => (
            <View key={p.planet} style={styles.affinityRow}>
              <Text style={[styles.affinityRank, { color: p.color }]}>#{i + 1}</Text>
              <Text style={[styles.affinitySymbol, { color: p.color }]}>{p.symbol}</Text>
              <View style={styles.affinityInfo}>
                <Text style={styles.affinityName}>{p.planet}</Text>
                <View style={styles.affinityBarTrack}>
                  <View
                    style={[
                      styles.affinityBarFill,
                      { width: `${p.percent}%`, backgroundColor: p.color },
                    ]}
                  />
                </View>
              </View>
              <Text style={[styles.affinityPercent, { color: p.color }]}>
                {p.percent}%
              </Text>
            </View>
          ))}
        </View>

        {/* Settings link */}
        <Pressable
          onPress={() => router.push('/(tabs)/settings')}
          style={({ pressed }) => [styles.settingsBtn, pressed && { opacity: 0.7 }]}
        >
          <Text style={styles.settingsBtnText}>Settings</Text>
        </Pressable>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 100 },
  title: {
    fontFamily: 'Cinzel', fontSize: 28, color: '#D4AF37',
    textAlign: 'center', letterSpacing: 4,
  },
  subtitle: {
    fontSize: 13, color: '#6B6B6B', textAlign: 'center', marginTop: 4,
  },
  sectionTitle: {
    fontFamily: 'Cinzel', fontSize: 14, color: '#E0E0E0',
    marginTop: 24, marginBottom: 10, letterSpacing: 2,
  },

  // Level card
  levelCard: {
    backgroundColor: '#0D0D0D', borderWidth: 1, borderColor: '#D4AF3730',
    borderRadius: 14, padding: 16, marginTop: 16,
  },
  levelHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  levelLabel: {
    fontFamily: 'JetBrainsMono', fontSize: 9, color: '#6B6B6B', letterSpacing: 2,
  },
  levelTitle: {
    fontFamily: 'Cinzel', fontSize: 18, color: '#D4AF37', letterSpacing: 2, marginTop: 2,
  },
  levelNumber: {
    fontFamily: 'JetBrainsMono', fontSize: 28, color: '#D4AF37', fontWeight: '700',
  },
  xpBarTrack: {
    height: 6, backgroundColor: '#1A1A1A', borderRadius: 3, marginTop: 12,
    overflow: 'hidden',
  },
  xpBarFill: {
    height: '100%', backgroundColor: '#D4AF37', borderRadius: 3,
  },
  xpRow: {
    flexDirection: 'row', justifyContent: 'space-between', marginTop: 6,
  },
  xpText: {
    fontFamily: 'JetBrainsMono', fontSize: 12, color: '#E0E0E0',
  },
  xpNext: {
    fontFamily: 'JetBrainsMono', fontSize: 10, color: '#6B6B6B',
  },

  // Stats
  statsRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  statCard: {
    flex: 1, backgroundColor: '#0D0D0D', borderWidth: 1, borderColor: '#1A1A1A',
    borderRadius: 10, padding: 12, alignItems: 'center',
  },
  statValue: {
    fontFamily: 'JetBrainsMono', fontSize: 20, color: '#E0E0E0', fontWeight: '700',
  },
  statLabel: {
    fontFamily: 'JetBrainsMono', fontSize: 9, color: '#6B6B6B',
    letterSpacing: 1, marginTop: 4,
  },

  // Radar
  radarCard: {
    backgroundColor: '#0D0D0D', borderWidth: 1, borderColor: '#1A1A1A',
    borderRadius: 14, padding: 16, alignItems: 'center',
  },
  elementList: { width: '100%', marginTop: 12, gap: 6 },
  elementRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
  },
  elementDot: { width: 8, height: 8, borderRadius: 4 },
  elementName: { fontSize: 12, color: '#E0E0E0', width: 50 },
  elementXp: {
    fontFamily: 'JetBrainsMono', fontSize: 11, color: '#6B6B6B', flex: 1,
  },
  elementPercent: {
    fontFamily: 'JetBrainsMono', fontSize: 11, color: '#D4AF37', fontWeight: '700',
  },

  // Heatmap
  heatmapCard: {
    backgroundColor: '#0D0D0D', borderWidth: 1, borderColor: '#1A1A1A',
    borderRadius: 14, padding: 16,
  },
  heatmapGrid: { gap: 3 },
  heatmapRow: { flexDirection: 'row', gap: 3, justifyContent: 'center' },
  heatmapCell: {
    width: (SW - 80) / HEATMAP_COLS - 3,
    height: (SW - 80) / HEATMAP_COLS - 3,
    borderRadius: 2,
  },
  heatmapLegend: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 4, marginTop: 10,
  },
  heatmapLegendText: {
    fontFamily: 'JetBrainsMono', fontSize: 9, color: '#6B6B6B',
  },
  heatmapLegendDot: { width: 10, height: 10, borderRadius: 2 },

  // Affinity
  affinityCard: {
    backgroundColor: '#0D0D0D', borderWidth: 1, borderColor: '#1A1A1A',
    borderRadius: 14, padding: 16, gap: 12,
  },
  affinityRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  affinityRank: {
    fontFamily: 'JetBrainsMono', fontSize: 14, fontWeight: '700', width: 24,
  },
  affinitySymbol: { fontSize: 22, width: 28, textAlign: 'center' },
  affinityInfo: { flex: 1 },
  affinityName: { fontSize: 13, color: '#E0E0E0', fontWeight: '600' },
  affinityBarTrack: {
    height: 4, backgroundColor: '#1A1A1A', borderRadius: 2, marginTop: 4,
    overflow: 'hidden',
  },
  affinityBarFill: { height: '100%', borderRadius: 2 },
  affinityPercent: {
    fontFamily: 'JetBrainsMono', fontSize: 14, fontWeight: '700', width: 40,
    textAlign: 'right',
  },

  // Settings
  settingsBtn: {
    marginTop: 24, alignSelf: 'center', paddingHorizontal: 24, paddingVertical: 10,
    borderWidth: 1, borderColor: '#1A1A1A', borderRadius: 20,
  },
  settingsBtnText: { fontSize: 13, color: '#6B6B6B' },

  // Loading
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { fontSize: 16, color: '#6B6B6B' },
});
