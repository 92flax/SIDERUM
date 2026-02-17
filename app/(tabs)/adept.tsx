// ============================================================
// ÆONIS – Ascension Hub
// Section 1: The Mirror (Avatar, Level, Soul Radar, Heatmap)
// Section 2: The Veil (Locked Feature Teaser)
// Section 3: The Firmament (Social Ladder)
// ============================================================

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Text, View, StyleSheet, ScrollView, Pressable, Platform,
  Dimensions, Animated, Easing,
} from 'react-native';
import Svg, {
  Circle, Line, Polygon, Text as SvgText, G, Rect, Defs,
  LinearGradient, Stop,
} from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
const RADAR_SIZE = Math.min(SW - 80, 240);
const RADAR_CENTER = RADAR_SIZE / 2;
const RADAR_RADIUS = RADAR_SIZE / 2 - 24;
const LEVEL_CIRCLE_SIZE = 80;

// ===== Elements for Soul Radar =====
const ELEMENTS = [
  { key: 'elementFireXp', label: 'Fire', color: '#EF4444', angle: -90 },
  { key: 'elementAirXp', label: 'Air', color: '#3B82F6', angle: -18 },
  { key: 'elementWaterXp', label: 'Water', color: '#06B6D4', angle: 54 },
  { key: 'elementEarthXp', label: 'Earth', color: '#22C55E', angle: 126 },
  { key: 'elementSpiritXp', label: 'Spirit', color: '#D4AF37', angle: 198 },
] as const;

// ===== Heatmap: 30 days =====
const HEATMAP_DAYS = 30;
const HEATMAP_COLS = 6; // ~5 weeks
const HEATMAP_ROWS = 7;

// ===== Level Rewards (locked features) =====
const LEVEL_REWARDS: Record<number, { name: string; icon: string; description: string }> = {
  1: { name: 'Ritual Journal', icon: '📖', description: 'Record insights after each ritual' },
  2: { name: 'Custom Rune Forge', icon: '⟐', description: 'Create personalized bindrunes' },
  3: { name: 'Planetary Alerts', icon: '🔔', description: 'Get notified of powerful transits' },
  4: { name: 'Elemental Mastery', icon: '✦', description: 'Unlock advanced element tracking' },
  5: { name: 'Inner Order Access', icon: '🏛', description: 'Join the Inner Order leaderboard' },
  6: { name: 'Astral Projection', icon: '🌌', description: 'Advanced meditation techniques' },
  7: { name: 'Grimoire Export', icon: '📜', description: 'Export your complete grimoire' },
  8: { name: 'Mentor Status', icon: '👁', description: 'Guide other initiates' },
  9: { name: 'Secret Chiefs', icon: '⚜', description: 'Access the Secret Chiefs council' },
  10: { name: 'Ipsissimus', icon: '☉', description: 'You have achieved ultimate mastery' },
};

// ===== Simulated leaderboard =====
const SIMULATED_ADEPTS = [
  { magicName: 'Frater Lux', xpTotal: 8500, levelRank: 9 },
  { magicName: 'Soror Nox', xpTotal: 7200, levelRank: 8 },
  { magicName: 'Frater Ignis', xpTotal: 5800, levelRank: 7 },
  { magicName: 'Soror Aqua', xpTotal: 4200, levelRank: 6 },
  { magicName: 'Frater Terra', xpTotal: 3100, levelRank: 5 },
  { magicName: 'Soror Aether', xpTotal: 2200, levelRank: 4 },
  { magicName: 'Frater Ventus', xpTotal: 1500, levelRank: 3 },
  { magicName: 'Soror Luna', xpTotal: 900, levelRank: 2 },
  { magicName: 'Frater Sol', xpTotal: 500, levelRank: 1 },
  { magicName: 'Neophyte Stellae', xpTotal: 80, levelRank: 0 },
];

export default function AscensionHub() {
  const [analytics, setAnalytics] = useState<LocalAnalytics | null>(null);
  const [magicName, setMagicName] = useState<string>('Initiate');
  const natalData = useNatalStore((s) => s.natalData);
  const masterRune = useRuneWalletStore((s) => s.masterRune);
  const router = useRouter();

  // Animation for user card slide-in
  const slideAnim = useRef(new Animated.Value(60)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadLocalAnalytics().then(setAnalytics);
    AsyncStorage.getItem('@aeonis_magic_name').then(name => {
      if (name) setMagicName(name);
    });
  }, []);

  // Animate user card on load
  useEffect(() => {
    if (analytics) {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 600,
          delay: 300,
          easing: Easing.out(Easing.back(1.2)),
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 500,
          delay: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [analytics]);

  // ===== Soul Radar Data =====
  const radarData = useMemo(() => {
    if (!analytics) return null;
    const values = ELEMENTS.map(e => (analytics as any)[e.key] as number);
    const maxVal = Math.max(...values, 1);
    return ELEMENTS.map((e, i) => ({
      ...e,
      value: values[i],
      normalized: values[i] / maxVal,
    }));
  }, [analytics]);

  // ===== 30-Day Heatmap =====
  const heatmapData = useMemo(() => {
    if (!analytics) return [];
    const activity = analytics.last365DaysActivity;
    const today = new Date();
    const cells: Array<{ date: string; xp: number; dayOfWeek: number; weekIndex: number }> = [];
    for (let i = HEATMAP_DAYS - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayOfWeek = d.getDay();
      const weekIndex = HEATMAP_COLS - 1 - Math.floor(i / 7);
      cells.push({ date: dateStr, xp: activity[dateStr] ?? 0, dayOfWeek, weekIndex });
    }
    return cells;
  }, [analytics]);

  const maxHeatmapXp = useMemo(() => Math.max(...heatmapData.map(c => c.xp), 1), [heatmapData]);

  // ===== Leaderboard with Rivalry Slice =====
  const leaderboardData = useMemo(() => {
    if (!analytics) return { top3: [], rivalrySlice: [], userRank: 0 };

    const all = SIMULATED_ADEPTS.map((a, i) => ({
      ...a, rank: i + 1, isCurrentUser: false,
    }));

    // Insert user at correct position
    const userEntry = {
      magicName,
      xpTotal: analytics.xpTotal,
      levelRank: analytics.levelRank,
      rank: 0,
      isCurrentUser: true,
    };
    const insertIdx = all.findIndex(e => e.xpTotal < userEntry.xpTotal);
    if (insertIdx >= 0) {
      all.splice(insertIdx, 0, userEntry);
    } else {
      all.push(userEntry);
    }
    all.forEach((e, i) => { e.rank = i + 1; });

    const userRank = all.findIndex(e => e.isCurrentUser) + 1;
    const top3 = all.slice(0, 3);

    // Rivalry slice: user-1, user, user+1
    const userIdx = all.findIndex(e => e.isCurrentUser);
    const rivalrySlice: typeof all = [];
    if (userIdx > 0) rivalrySlice.push(all[userIdx - 1]);
    rivalrySlice.push(all[userIdx]);
    if (userIdx < all.length - 1) rivalrySlice.push(all[userIdx + 1]);

    return { top3, rivalrySlice, userRank };
  }, [analytics, magicName]);

  const getHeatmapColor = useCallback((xp: number): string => {
    if (xp === 0) return '#111';
    const ratio = xp / maxHeatmapXp;
    if (ratio < 0.25) return '#1E3A5F';
    if (ratio < 0.5) return '#2563EB';
    if (ratio < 0.75) return '#D4AF37';
    return '#FFD700';
  }, [maxHeatmapXp]);

  const getRankColor = (level: number): string => {
    if (level >= 9) return '#FFD700';
    if (level >= 7) return '#D4AF37';
    if (level >= 5) return '#8B5CF6';
    if (level >= 3) return '#3B82F6';
    return '#6B6B6B';
  };

  if (!analytics) {
    return (
      <ScreenContainer>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Ascending...</Text>
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
  const nextReward = LEVEL_REWARDS[currentLevel + 1];

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* ============================================================ */}
        {/* SECTION 1: THE MIRROR                                        */}
        {/* ============================================================ */}
        <Text style={styles.sectionLabel}>THE MIRROR</Text>

        {/* Avatar + Name + Level Circle Header */}
        <View style={styles.mirrorHeader}>
          {/* Avatar placeholder */}
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>
              {magicName.charAt(0).toUpperCase()}
            </Text>
          </View>

          <View style={styles.mirrorInfo}>
            <Text style={styles.magicNameText} numberOfLines={1}>
              {magicName}
            </Text>
            <Text style={styles.levelTitleText}>
              {LEVEL_TITLES[currentLevel] ?? 'Neophyte'}
            </Text>
          </View>

          {/* Level Circle */}
          <View style={styles.levelCircleContainer}>
            <Svg width={LEVEL_CIRCLE_SIZE} height={LEVEL_CIRCLE_SIZE}>
              <Defs>
                <LinearGradient id="levelGrad" x1="0" y1="0" x2="1" y2="1">
                  <Stop offset="0" stopColor="#D4AF37" />
                  <Stop offset="1" stopColor="#FFD700" />
                </LinearGradient>
              </Defs>
              {/* Background ring */}
              <Circle
                cx={LEVEL_CIRCLE_SIZE / 2}
                cy={LEVEL_CIRCLE_SIZE / 2}
                r={LEVEL_CIRCLE_SIZE / 2 - 4}
                stroke="#1A1A1A"
                strokeWidth={3}
                fill="none"
              />
              {/* Progress ring */}
              <Circle
                cx={LEVEL_CIRCLE_SIZE / 2}
                cy={LEVEL_CIRCLE_SIZE / 2}
                r={LEVEL_CIRCLE_SIZE / 2 - 4}
                stroke="url(#levelGrad)"
                strokeWidth={3}
                fill="none"
                strokeDasharray={`${2 * Math.PI * (LEVEL_CIRCLE_SIZE / 2 - 4)}`}
                strokeDashoffset={`${2 * Math.PI * (LEVEL_CIRCLE_SIZE / 2 - 4) * (1 - progressPercent / 100)}`}
                strokeLinecap="round"
                transform={`rotate(-90 ${LEVEL_CIRCLE_SIZE / 2} ${LEVEL_CIRCLE_SIZE / 2})`}
              />
              <SvgText
                x={LEVEL_CIRCLE_SIZE / 2}
                y={LEVEL_CIRCLE_SIZE / 2 - 6}
                fill="#D4AF37"
                fontSize={22}
                fontWeight="bold"
                textAnchor="middle"
                alignmentBaseline="central"
              >
                {currentLevel}
              </SvgText>
              <SvgText
                x={LEVEL_CIRCLE_SIZE / 2}
                y={LEVEL_CIRCLE_SIZE / 2 + 12}
                fill="#6B6B6B"
                fontSize={8}
                textAnchor="middle"
              >
                LEVEL
              </SvgText>
            </Svg>
          </View>
        </View>

        {/* XP Bar */}
        <View style={styles.xpSection}>
          <View style={styles.xpBarTrack}>
            <View style={[styles.xpBarFill, { width: `${progressPercent}%` }]} />
          </View>
          <View style={styles.xpRow}>
            <Text style={styles.xpText}>{analytics.xpTotal.toLocaleString()} XP</Text>
            <Text style={styles.xpNext}>
              {xpNeeded > 0 ? `${xpProgress}/${xpNeeded}` : 'MAX'}
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

        {/* Soul Radar */}
        <Text style={styles.subsectionTitle}>Soul Radar</Text>
        {radarData && (
          <View style={styles.radarCard}>
            <Svg width={RADAR_SIZE} height={RADAR_SIZE} viewBox={`0 0 ${RADAR_SIZE} ${RADAR_SIZE}`}>
              {/* Background pentagons */}
              {[0.25, 0.5, 0.75, 1.0].map(scale => (
                <Polygon
                  key={scale}
                  points={ELEMENTS.map(e => {
                    const rad = (e.angle * Math.PI) / 180;
                    const x = RADAR_CENTER + RADAR_RADIUS * scale * Math.cos(rad);
                    const y = RADAR_CENTER + RADAR_RADIUS * scale * Math.sin(rad);
                    return `${x},${y}`;
                  }).join(' ')}
                  stroke="#1A1A1A"
                  strokeWidth={0.8}
                  fill="none"
                />
              ))}

              {/* Axis lines */}
              {radarData.map(e => {
                const rad = (e.angle * Math.PI) / 180;
                return (
                  <Line
                    key={e.key}
                    x1={RADAR_CENTER} y1={RADAR_CENTER}
                    x2={RADAR_CENTER + RADAR_RADIUS * Math.cos(rad)}
                    y2={RADAR_CENTER + RADAR_RADIUS * Math.sin(rad)}
                    stroke="#1A1A1A" strokeWidth={0.5}
                  />
                );
              })}

              {/* Data polygon */}
              <Polygon
                points={radarData.map(e => {
                  const rad = (e.angle * Math.PI) / 180;
                  const dist = RADAR_RADIUS * Math.max(0.08, e.normalized);
                  return `${RADAR_CENTER + dist * Math.cos(rad)},${RADAR_CENTER + dist * Math.sin(rad)}`;
                }).join(' ')}
                fill="#D4AF3718"
                stroke="#D4AF37"
                strokeWidth={2}
              />

              {/* Data points and labels */}
              {radarData.map(e => {
                const rad = (e.angle * Math.PI) / 180;
                const dist = RADAR_RADIUS * Math.max(0.08, e.normalized);
                const px = RADAR_CENTER + dist * Math.cos(rad);
                const py = RADAR_CENTER + dist * Math.sin(rad);
                const lx = RADAR_CENTER + (RADAR_RADIUS + 16) * Math.cos(rad);
                const ly = RADAR_CENTER + (RADAR_RADIUS + 16) * Math.sin(rad);
                return (
                  <G key={e.key}>
                    <Circle cx={px} cy={py} r={4} fill={e.color} />
                    <SvgText
                      x={lx} y={ly}
                      fill={e.color}
                      fontSize={9}
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
          </View>
        )}

        {/* 30-Day Consistency Heatmap */}
        <Text style={styles.subsectionTitle}>Consistency (30 Days)</Text>
        <View style={styles.heatmapCard}>
          <View style={styles.heatmapGrid}>
            {Array.from({ length: HEATMAP_ROWS }).map((_, row) => (
              <View key={row} style={styles.heatmapRow}>
                {Array.from({ length: HEATMAP_COLS }).map((_, col) => {
                  const cell = heatmapData.find(
                    c => c.dayOfWeek === row && c.weekIndex === col
                  );
                  return (
                    <View
                      key={`${row}-${col}`}
                      style={[
                        styles.heatmapCell,
                        { backgroundColor: getHeatmapColor(cell?.xp ?? 0) },
                      ]}
                    />
                  );
                })}
              </View>
            ))}
          </View>
          <View style={styles.heatmapLegend}>
            <Text style={styles.legendText}>Less</Text>
            {['#111', '#1E3A5F', '#2563EB', '#D4AF37', '#FFD700'].map(c => (
              <View key={c} style={[styles.legendDot, { backgroundColor: c }]} />
            ))}
            <Text style={styles.legendText}>More</Text>
          </View>
        </View>

        {/* ============================================================ */}
        {/* SECTION 2: THE VEIL                                          */}
        {/* ============================================================ */}
        <Text style={styles.sectionLabel}>THE VEIL</Text>

        {nextReward ? (
          <View style={styles.veilCard}>
            <View style={styles.veilIconContainer}>
              <View style={styles.veilBlur}>
                <Text style={styles.veilIcon}>{nextReward.icon}</Text>
              </View>
              <View style={styles.lockOverlay}>
                <Text style={styles.lockIcon}>🔒</Text>
              </View>
            </View>
            <View style={styles.veilInfo}>
              <Text style={styles.veilTitle}>{nextReward.name}</Text>
              <Text style={styles.veilDesc}>{nextReward.description}</Text>
              <Text style={styles.veilUnlock}>
                Unlock at Level {currentLevel + 1}
              </Text>
            </View>
          </View>
        ) : (
          <View style={styles.veilCard}>
            <Text style={styles.veilMaxText}>All features unlocked</Text>
            <Text style={styles.veilMaxSub}>You have achieved mastery</Text>
          </View>
        )}

        {/* ============================================================ */}
        {/* SECTION 3: THE FIRMAMENT                                     */}
        {/* ============================================================ */}
        <Text style={styles.sectionLabel}>THE FIRMAMENT</Text>

        {/* Secret Chiefs (Top 3) */}
        <Text style={styles.subsectionTitle}>Secret Chiefs</Text>
        <View style={styles.chiefsRow}>
          {leaderboardData.top3.map((entry, i) => {
            const medals = ['🥇', '🥈', '🥉'];
            const rankColor = getRankColor(entry.levelRank);
            return (
              <View key={entry.magicName} style={[
                styles.chiefCard,
                i === 0 && styles.chiefCardFirst,
              ]}>
                <Text style={styles.chiefMedal}>{medals[i]}</Text>
                <View style={[styles.chiefAvatar, { borderColor: rankColor }]}>
                  <Text style={[styles.chiefAvatarText, { color: rankColor }]}>
                    {entry.magicName.charAt(0)}
                  </Text>
                </View>
                <Text style={styles.chiefName} numberOfLines={1}>
                  {entry.magicName}
                </Text>
                <Text style={[styles.chiefLevel, { color: rankColor }]}>
                  {LEVEL_TITLES[entry.levelRank] ?? 'Neophyte'}
                </Text>
                <Text style={styles.chiefXp}>
                  {entry.xpTotal.toLocaleString()}
                </Text>
              </View>
            );
          })}
        </View>

        {/* Rivalry Slice */}
        <Text style={styles.subsectionTitle}>Your Rivalry</Text>
        <View style={styles.rivalryContainer}>
          {leaderboardData.rivalrySlice.map((entry) => {
            const rankColor = getRankColor(entry.levelRank);
            return (
              <Animated.View
                key={`${entry.magicName}-${entry.rank}`}
                style={[
                  styles.rivalryRow,
                  entry.isCurrentUser && styles.rivalryRowSelf,
                  entry.isCurrentUser && {
                    transform: [{ translateY: slideAnim }],
                    opacity: fadeAnim,
                  },
                ]}
              >
                <Text style={[styles.rivalryRank, { color: rankColor }]}>
                  #{entry.rank}
                </Text>
                <View style={[styles.rivalryAvatar, { borderColor: entry.isCurrentUser ? '#D4AF37' : '#1A1A1A' }]}>
                  <Text style={[styles.rivalryAvatarText, { color: entry.isCurrentUser ? '#D4AF37' : '#6B6B6B' }]}>
                    {entry.magicName.charAt(0)}
                  </Text>
                </View>
                <View style={styles.rivalryInfo}>
                  <Text style={[
                    styles.rivalryName,
                    entry.isCurrentUser && { color: '#D4AF37' },
                  ]}>
                    {entry.isCurrentUser ? magicName : entry.magicName}
                  </Text>
                  <Text style={[styles.rivalryTitle, { color: rankColor }]}>
                    {LEVEL_TITLES[entry.levelRank] ?? 'Neophyte'}
                  </Text>
                </View>
                <Text style={styles.rivalryXp}>
                  {entry.xpTotal.toLocaleString()} XP
                </Text>
              </Animated.View>
            );
          })}
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

const CELL_SIZE = (SW - 80) / HEATMAP_COLS - 4;

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 120 },

  // Section labels
  sectionLabel: {
    fontFamily: 'Cinzel',
    fontSize: 11,
    color: '#D4AF3780',
    letterSpacing: 6,
    textAlign: 'center',
    marginTop: 28,
    marginBottom: 16,
  },
  subsectionTitle: {
    fontFamily: 'Cinzel',
    fontSize: 13,
    color: '#E0E0E0',
    marginTop: 20,
    marginBottom: 10,
    letterSpacing: 2,
  },

  // ===== THE MIRROR =====
  mirrorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0A0A0A',
    borderWidth: 1,
    borderColor: '#D4AF3720',
    borderRadius: 16,
    padding: 16,
    gap: 14,
  },
  avatarCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#D4AF3715',
    borderWidth: 1.5,
    borderColor: '#D4AF3740',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontFamily: 'Cinzel',
    fontSize: 22,
    color: '#D4AF37',
    fontWeight: '700',
  },
  mirrorInfo: {
    flex: 1,
  },
  magicNameText: {
    fontFamily: 'Cinzel',
    fontSize: 18,
    color: '#E0E0E0',
    letterSpacing: 1,
  },
  levelTitleText: {
    fontFamily: 'JetBrainsMono',
    fontSize: 11,
    color: '#D4AF37',
    letterSpacing: 1,
    marginTop: 2,
  },
  levelCircleContainer: {
    width: LEVEL_CIRCLE_SIZE,
    height: LEVEL_CIRCLE_SIZE,
  },

  // XP
  xpSection: { marginTop: 12 },
  xpBarTrack: {
    height: 5,
    backgroundColor: '#111',
    borderRadius: 3,
    overflow: 'hidden',
  },
  xpBarFill: {
    height: '100%',
    backgroundColor: '#D4AF37',
    borderRadius: 3,
  },
  xpRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  xpText: {
    fontFamily: 'JetBrainsMono',
    fontSize: 11,
    color: '#E0E0E0',
  },
  xpNext: {
    fontFamily: 'JetBrainsMono',
    fontSize: 10,
    color: '#6B6B6B',
  },

  // Stats
  statsRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  statCard: {
    flex: 1,
    backgroundColor: '#0A0A0A',
    borderWidth: 1,
    borderColor: '#1A1A1A',
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
  },
  statValue: {
    fontFamily: 'JetBrainsMono',
    fontSize: 18,
    color: '#E0E0E0',
    fontWeight: '700',
  },
  statLabel: {
    fontFamily: 'JetBrainsMono',
    fontSize: 8,
    color: '#6B6B6B',
    letterSpacing: 1,
    marginTop: 3,
  },

  // Radar
  radarCard: {
    backgroundColor: '#0A0A0A',
    borderWidth: 1,
    borderColor: '#1A1A1A',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
  },

  // Heatmap
  heatmapCard: {
    backgroundColor: '#0A0A0A',
    borderWidth: 1,
    borderColor: '#1A1A1A',
    borderRadius: 14,
    padding: 14,
  },
  heatmapGrid: { gap: 3 },
  heatmapRow: { flexDirection: 'row', gap: 3, justifyContent: 'center' },
  heatmapCell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    borderRadius: 3,
  },
  heatmapLegend: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: 8,
  },
  legendText: {
    fontFamily: 'JetBrainsMono',
    fontSize: 8,
    color: '#6B6B6B',
  },
  legendDot: { width: 10, height: 10, borderRadius: 2 },

  // ===== THE VEIL =====
  veilCard: {
    backgroundColor: '#0A0A0A',
    borderWidth: 1,
    borderColor: '#1A1A1A',
    borderRadius: 14,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  veilIconContainer: {
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  veilBlur: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: '#D4AF3710',
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0.4,
  },
  veilIcon: { fontSize: 28 },
  lockOverlay: {
    position: 'absolute',
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lockIcon: { fontSize: 22 },
  veilInfo: { flex: 1 },
  veilTitle: {
    fontFamily: 'Cinzel',
    fontSize: 15,
    color: '#E0E0E0',
    letterSpacing: 1,
  },
  veilDesc: {
    fontSize: 12,
    color: '#6B6B6B',
    marginTop: 4,
    lineHeight: 18,
  },
  veilUnlock: {
    fontFamily: 'JetBrainsMono',
    fontSize: 10,
    color: '#D4AF37',
    marginTop: 6,
    letterSpacing: 1,
  },
  veilMaxText: {
    fontFamily: 'Cinzel',
    fontSize: 16,
    color: '#FFD700',
    letterSpacing: 2,
  },
  veilMaxSub: {
    fontSize: 12,
    color: '#6B6B6B',
    marginTop: 4,
  },

  // ===== THE FIRMAMENT =====
  chiefsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  chiefCard: {
    flex: 1,
    backgroundColor: '#0A0A0A',
    borderWidth: 1,
    borderColor: '#1A1A1A',
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    gap: 4,
  },
  chiefCardFirst: {
    borderColor: '#D4AF3730',
    backgroundColor: '#D4AF3708',
  },
  chiefMedal: { fontSize: 20 },
  chiefAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0D0D0D',
  },
  chiefAvatarText: {
    fontFamily: 'Cinzel',
    fontSize: 16,
    fontWeight: '700',
  },
  chiefName: {
    fontSize: 11,
    color: '#E0E0E0',
    fontWeight: '600',
    textAlign: 'center',
  },
  chiefLevel: {
    fontFamily: 'JetBrainsMono',
    fontSize: 8,
    letterSpacing: 1,
  },
  chiefXp: {
    fontFamily: 'JetBrainsMono',
    fontSize: 10,
    color: '#6B6B6B',
  },

  // Rivalry
  rivalryContainer: {
    gap: 6,
  },
  rivalryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0A0A0A',
    borderWidth: 1,
    borderColor: '#1A1A1A',
    borderRadius: 12,
    padding: 12,
    gap: 10,
  },
  rivalryRowSelf: {
    borderColor: '#D4AF3740',
    backgroundColor: '#D4AF3708',
  },
  rivalryRank: {
    fontFamily: 'JetBrainsMono',
    fontSize: 14,
    fontWeight: '700',
    width: 36,
    textAlign: 'center',
  },
  rivalryAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0D0D0D',
  },
  rivalryAvatarText: {
    fontFamily: 'Cinzel',
    fontSize: 14,
    fontWeight: '700',
  },
  rivalryInfo: { flex: 1 },
  rivalryName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#E0E0E0',
  },
  rivalryTitle: {
    fontFamily: 'JetBrainsMono',
    fontSize: 9,
    letterSpacing: 1,
    marginTop: 1,
  },
  rivalryXp: {
    fontFamily: 'JetBrainsMono',
    fontSize: 11,
    color: '#6B6B6B',
  },

  // Settings
  settingsBtn: {
    marginTop: 28,
    alignSelf: 'center',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#1A1A1A',
    borderRadius: 20,
  },
  settingsBtnText: { fontSize: 13, color: '#6B6B6B' },

  // Loading
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { fontSize: 16, color: '#6B6B6B' },
});
