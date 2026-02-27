// ============================================================
// ÆONIS – Egregore Console
// Section 1: The Mirror (Avatar, Level, XP)
// Section 2: P2P Constellation (Grid Charge Visualization)
// Section 3: Global Sync Operations (CMS Event + RSVP)
// Section 4: Astral Chronicles (Vertical Timeline)
// Section 5: The Firmament (Leaderboard)
// ============================================================

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Text, View, StyleSheet, ScrollView, Pressable, Platform,
  Dimensions, Animated, Easing, Modal,
} from 'react-native';
import Svg, {
  Circle, Line, Polygon, Text as SvgText, G, Defs,
  LinearGradient, Stop,
} from 'react-native-svg';
import ReAnimated, {
  useSharedValue, useAnimatedStyle, withRepeat, withTiming,
  withSequence, Easing as REasing,
} from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { ScreenContainer } from '@/components/screen-container';
import { useNatalStore } from '@/lib/store/natal-store';
import { useRuneWalletStore } from '@/lib/store/rune-wallet';
import { useGridEngine } from '@/lib/store/grid-engine';
import { useJournalStore, type JournalEntry } from '@/lib/journal/store';
import {
  loadLocalAnalytics, LocalAnalytics, LEVEL_TITLES,
  xpForNextLevel, xpForCurrentLevel,
} from '@/lib/ritual/completion-handler';
import { getNextSyncEvent, type SanityGlobalSyncEvent } from '@/lib/cms/sanity';
import { useRouter } from 'expo-router';

const { width: SW } = Dimensions.get('window');
const CONSTELLATION_SIZE = Math.min(SW - 48, 280);
const CONSTELLATION_CENTER = CONSTELLATION_SIZE / 2;
const LEVEL_CIRCLE_SIZE = 70;

// ===== Simulated leaderboard =====
const SIMULATED_ADEPTS = [
  { magicName: 'Frater Lux', xpTotal: 8500, levelRank: 9 },
  { magicName: 'Soror Nox', xpTotal: 7200, levelRank: 8 },
  { magicName: 'Frater Ignis', xpTotal: 5800, levelRank: 7 },
  { magicName: 'Soror Aqua', xpTotal: 4200, levelRank: 6 },
  { magicName: 'Frater Terra', xpTotal: 3100, levelRank: 5 },
];

// ===== Outer node positions (8 nodes in a ring) =====
const OUTER_NODES = Array.from({ length: 8 }, (_, i) => {
  const angle = (i * 360 / 8 - 90) * (Math.PI / 180);
  const radius = CONSTELLATION_SIZE / 2 - 28;
  return {
    x: CONSTELLATION_CENTER + radius * Math.cos(angle),
    y: CONSTELLATION_CENTER + radius * Math.sin(angle),
    id: `0x${(0x4F0 + i * 17).toString(16).toUpperCase()}`,
  };
});

export default function EgregoreConsole() {
  const [analytics, setAnalytics] = useState<LocalAnalytics | null>(null);
  const [magicName, setMagicName] = useState<string>('Initiate');
  const [syncEvent, setSyncEvent] = useState<SanityGlobalSyncEvent | null>(null);
  const [showChamber, setShowChamber] = useState(false);
  const natalData = useNatalStore((s) => s.natalData);
  const router = useRouter();

  // Grid Engine
  const gridCharge = useGridEngine((s) => s.gridCharge);
  const rsvpEventId = useGridEngine((s) => s.rsvpEventId);
  const loadGrid = useGridEngine((s) => s.loadGrid);
  const pledgeEnergy = useGridEngine((s) => s.pledgeEnergy);

  // Journal for Astral Chronicles
  const journalEntries = useJournalStore((s) => s.entries);
  const loadEntries = useJournalStore((s) => s.loadEntries);

  // Animations
  const slideAnim = useRef(new Animated.Value(60)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Reanimated pulse for center node
  const pulseScale = useSharedValue(1);
  const pulseOpacity = useSharedValue(0.6);

  useEffect(() => {
    loadLocalAnalytics().then(setAnalytics);
    AsyncStorage.getItem('@aeonis_magic_name').then(name => {
      if (name) setMagicName(name);
    });
    loadGrid();
    loadEntries();
    getNextSyncEvent().then(setSyncEvent);
  }, []);

  // Pulse animation for center node
  useEffect(() => {
    pulseScale.value = withRepeat(
      withSequence(
        withTiming(1.15, { duration: 2000, easing: REasing.inOut(REasing.ease) }),
        withTiming(1, { duration: 2000, easing: REasing.inOut(REasing.ease) }),
      ),
      -1,
      false,
    );
    pulseOpacity.value = withRepeat(
      withSequence(
        withTiming(0.9, { duration: 2000, easing: REasing.inOut(REasing.ease) }),
        withTiming(0.5, { duration: 2000, easing: REasing.inOut(REasing.ease) }),
      ),
      -1,
      false,
    );
  }, []);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
    opacity: pulseOpacity.value,
  }));

  // Animate user card on load
  useEffect(() => {
    if (analytics) {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0, duration: 600, delay: 300,
          easing: Easing.out(Easing.back(1.2)), useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1, duration: 500, delay: 300, useNativeDriver: true,
        }),
      ]).start();
    }
  }, [analytics]);

  // Simulated global stability (fluctuates around gridCharge)
  const [globalStability, setGlobalStability] = useState(92);
  useEffect(() => {
    const interval = setInterval(() => {
      setGlobalStability(prev => {
        const delta = (Math.random() - 0.5) * 3;
        return Math.round(Math.max(60, Math.min(99, prev + delta)));
      });
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Simulated node count
  const simulatedNodes = useMemo(() => {
    const base = syncEvent?.baseNodeCount ?? 847;
    return base + Math.floor(Math.random() * 30);
  }, [syncEvent]);

  // Leaderboard
  const leaderboardData = useMemo(() => {
    if (!analytics) return { top3: [], userRank: 0 };
    const all = SIMULATED_ADEPTS.map((a, i) => ({
      ...a, rank: i + 1, isCurrentUser: false,
    }));
    const userEntry = {
      magicName, xpTotal: analytics.xpTotal, levelRank: analytics.levelRank,
      rank: 0, isCurrentUser: true,
    };
    const insertIdx = all.findIndex(e => e.xpTotal < userEntry.xpTotal);
    if (insertIdx >= 0) all.splice(insertIdx, 0, userEntry);
    else all.push(userEntry);
    all.forEach((e, i) => { e.rank = i + 1; });
    return { top3: all.slice(0, 5), userRank: all.findIndex(e => e.isCurrentUser) + 1 };
  }, [analytics, magicName]);

  // Check if uplink available (15 min before targetDate)
  const uplinkAvailable = useMemo(() => {
    if (!syncEvent?.targetDate) return false;
    const target = new Date(syncEvent.targetDate).getTime();
    const now = Date.now();
    return now >= target - 15 * 60 * 1000;
  }, [syncEvent]);

  // Charge color
  const chargeColor = gridCharge > 80 ? '#D4AF37' : gridCharge > 40 ? '#3B82F6' : '#A3A3A3';
  const tetherStyle = gridCharge > 80 ? 'solid' : gridCharge > 40 ? 'normal' : 'broken';

  const getRankColor = (level: number): string => {
    if (level >= 9) return '#FFD700';
    if (level >= 7) return '#D4AF37';
    if (level >= 5) return '#8B5CF6';
    if (level >= 3) return '#3B82F6';
    return '#6B6B6B';
  };

  const handlePledge = async () => {
    if (!syncEvent) return;
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    await pledgeEnergy(syncEvent._id);
  };

  // Recent journal entries for Astral Chronicles (last 10)
  const recentEntries = useMemo(() => journalEntries.slice(0, 10), [journalEntries]);

  if (!analytics) {
    return (
      <ScreenContainer>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Initializing Console...</Text>
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
  const isPledged = rsvpEventId === syncEvent?._id;

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* ============================================================ */}
        {/* HEADER                                                        */}
        {/* ============================================================ */}
        <Text style={styles.screenTitle}>EGREGORE CONSOLE</Text>

        {/* ============================================================ */}
        {/* SECTION 1: THE MIRROR (Compact)                              */}
        {/* ============================================================ */}
        <View style={styles.mirrorHeader}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>
              {magicName.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.mirrorInfo}>
            <Text style={styles.magicNameText} numberOfLines={1}>{magicName}</Text>
            <Text style={styles.levelTitleText}>
              {LEVEL_TITLES[currentLevel] ?? 'Neophyte'}
            </Text>
          </View>
          {/* Level Circle */}
          <View style={{ width: LEVEL_CIRCLE_SIZE, height: LEVEL_CIRCLE_SIZE }}>
            <Svg width={LEVEL_CIRCLE_SIZE} height={LEVEL_CIRCLE_SIZE}>
              <Defs>
                <LinearGradient id="levelGrad" x1="0" y1="0" x2="1" y2="1">
                  <Stop offset="0" stopColor="#D4AF37" />
                  <Stop offset="1" stopColor="#FFD700" />
                </LinearGradient>
              </Defs>
              <Circle
                cx={LEVEL_CIRCLE_SIZE / 2} cy={LEVEL_CIRCLE_SIZE / 2}
                r={LEVEL_CIRCLE_SIZE / 2 - 4} stroke="#1A1A1A" strokeWidth={3} fill="none"
              />
              <Circle
                cx={LEVEL_CIRCLE_SIZE / 2} cy={LEVEL_CIRCLE_SIZE / 2}
                r={LEVEL_CIRCLE_SIZE / 2 - 4} stroke="url(#levelGrad)" strokeWidth={3} fill="none"
                strokeDasharray={`${2 * Math.PI * (LEVEL_CIRCLE_SIZE / 2 - 4)}`}
                strokeDashoffset={`${2 * Math.PI * (LEVEL_CIRCLE_SIZE / 2 - 4) * (1 - progressPercent / 100)}`}
                strokeLinecap="round"
                transform={`rotate(-90 ${LEVEL_CIRCLE_SIZE / 2} ${LEVEL_CIRCLE_SIZE / 2})`}
              />
              <SvgText
                x={LEVEL_CIRCLE_SIZE / 2} y={LEVEL_CIRCLE_SIZE / 2 - 4}
                fill="#D4AF37" fontSize={20} fontWeight="bold"
                textAnchor="middle" alignmentBaseline="central"
              >{currentLevel}</SvgText>
              <SvgText
                x={LEVEL_CIRCLE_SIZE / 2} y={LEVEL_CIRCLE_SIZE / 2 + 12}
                fill="#6B6B6B" fontSize={7} textAnchor="middle"
              >LEVEL</SvgText>
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
            <Text style={styles.statLabel}>RITUALS</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{analytics.totalStasisMinutes}</Text>
            <Text style={styles.statLabel}>STASIS MIN</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>
              {Object.keys(analytics.last365DaysActivity).length}
            </Text>
            <Text style={styles.statLabel}>ACTIVE DAYS</Text>
          </View>
        </View>

        {/* ============================================================ */}
        {/* SECTION 2: P2P CONSTELLATION                                 */}
        {/* ============================================================ */}
        <Text style={styles.sectionLabel}>P2P NETWORK</Text>

        <View style={styles.constellationCard}>
          <View style={{ width: CONSTELLATION_SIZE, height: CONSTELLATION_SIZE, alignSelf: 'center' }}>
            {/* Animated center glow */}
            <ReAnimated.View
              style={[
                {
                  position: 'absolute',
                  left: CONSTELLATION_CENTER - 30,
                  top: CONSTELLATION_CENTER - 30,
                  width: 60,
                  height: 60,
                  borderRadius: 30,
                  backgroundColor: chargeColor,
                },
                pulseStyle,
              ]}
            />

            <Svg width={CONSTELLATION_SIZE} height={CONSTELLATION_SIZE}>
              {/* Tethers from center to outer nodes */}
              {OUTER_NODES.map((node, i) => {
                const isBroken = tetherStyle === 'broken' && i % 2 === 0;
                return (
                  <Line
                    key={node.id}
                    x1={CONSTELLATION_CENTER} y1={CONSTELLATION_CENTER}
                    x2={node.x} y2={node.y}
                    stroke={isBroken ? '#1A1A1A' : chargeColor}
                    strokeWidth={isBroken ? 0.5 : 1.2}
                    strokeDasharray={isBroken ? '4,6' : tetherStyle === 'normal' ? '2,3' : 'none'}
                    opacity={isBroken ? 0.3 : 0.7}
                  />
                );
              })}

              {/* Outer nodes */}
              {OUTER_NODES.map(node => (
                <G key={node.id}>
                  <Circle
                    cx={node.x} cy={node.y} r={6}
                    fill={gridCharge > 40 ? chargeColor : '#1A1A1A'}
                    opacity={gridCharge > 40 ? 0.8 : 0.4}
                  />
                  <SvgText
                    x={node.x} y={node.y + 16}
                    fill="#6B6B6B" fontSize={6} textAnchor="middle"
                  >{node.id}</SvgText>
                </G>
              ))}

              {/* Center node */}
              <Circle
                cx={CONSTELLATION_CENTER} cy={CONSTELLATION_CENTER} r={14}
                fill={chargeColor} opacity={0.9}
              />
              <Circle
                cx={CONSTELLATION_CENTER} cy={CONSTELLATION_CENTER} r={8}
                fill="#050505"
              />
              <Circle
                cx={CONSTELLATION_CENTER} cy={CONSTELLATION_CENTER} r={5}
                fill={chargeColor}
              />
            </Svg>
          </View>

          {/* Charge readout */}
          <View style={styles.chargeReadout}>
            <Text style={[styles.chargeText, { color: chargeColor }]}>
              LOCAL NODE CHARGE: {gridCharge}%{' '}
              <Text style={styles.chargeTag}>[ ANCHOR ]</Text>
            </Text>
            <Text style={styles.stabilityText}>
              GLOBAL EGREGORE STABILITY: {globalStability}%
            </Text>
          </View>
        </View>

        {/* ============================================================ */}
        {/* SECTION 3: GLOBAL SYNC OPERATIONS                            */}
        {/* ============================================================ */}
        <Text style={styles.sectionLabel}>GLOBAL SYNC OPERATIONS</Text>

        <View style={styles.syncCard}>
          {syncEvent ? (
            <>
              <Text style={styles.syncTitle}>{syncEvent.title}</Text>
              <Text style={styles.syncDate}>
                TARGET: {new Date(syncEvent.targetDate).toLocaleDateString('en-US', {
                  weekday: 'short', month: 'short', day: 'numeric',
                  hour: '2-digit', minute: '2-digit',
                })}
              </Text>
              {syncEvent.directive && (
                <View style={styles.directivePreview}>
                  <Text style={styles.directiveText} numberOfLines={3}>
                    {syncEvent.directive}
                  </Text>
                </View>
              )}

              {isPledged ? (
                <View style={styles.pledgedContainer}>
                  <View style={styles.pledgedBadge}>
                    <Text style={styles.pledgedText}>✦ NODE ALIGNED</Text>
                  </View>
                  <Text style={styles.nodeCountText}>
                    {simulatedNodes} Nodes standing by
                  </Text>
                  {uplinkAvailable && (
                    <Pressable
                      onPress={() => setShowChamber(true)}
                      style={({ pressed }) => [
                        styles.uplinkBtn,
                        pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] },
                      ]}
                    >
                      <Text style={styles.uplinkBtnText}>⟐ ENTER UPLINK</Text>
                    </Pressable>
                  )}
                </View>
              ) : (
                <Pressable
                  onPress={handlePledge}
                  style={({ pressed }) => [
                    styles.pledgeBtn,
                    pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] },
                  ]}
                >
                  <Text style={styles.pledgeBtnText}>⚡ PLEDGE ENERGY</Text>
                </Pressable>
              )}
            </>
          ) : (
            <View style={styles.noEventContainer}>
              <Text style={styles.noEventText}>NO ACTIVE SYNC OPERATIONS</Text>
              <Text style={styles.noEventSub}>
                Awaiting next global ceremony from High Command...
              </Text>
            </View>
          )}
        </View>

        {/* ============================================================ */}
        {/* SECTION 4: ASTRAL CHRONICLES (Timeline)                      */}
        {/* ============================================================ */}
        <Text style={styles.sectionLabel}>ASTRAL CHRONICLES</Text>

        <View style={styles.timelineContainer}>
          {recentEntries.length === 0 ? (
            <Text style={styles.noChroniclesText}>
              No records yet. Complete rituals to build your chronicle.
            </Text>
          ) : (
            recentEntries.map((entry, idx) => (
              <View key={entry.id} style={styles.timelineItem}>
                {/* Gold vertical line */}
                <View style={styles.timelineLine}>
                  <View style={[
                    styles.timelineDot,
                    { backgroundColor: entry.xpAwarded > 0 ? '#D4AF37' : '#3B82F6' },
                  ]} />
                  {idx < recentEntries.length - 1 && (
                    <View style={styles.timelineConnector} />
                  )}
                </View>
                {/* Content */}
                <View style={styles.timelineContent}>
                  <Text style={styles.timelineDate}>
                    {new Date(entry.createdAt).toLocaleDateString('en-US', {
                      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                    })}
                  </Text>
                  <Text style={styles.timelineName}>
                    {entry.ritualName ?? (entry.isManualEntry ? 'Manual Entry' : 'Stasis Session')}
                  </Text>
                  {entry.intent && (
                    <Text style={styles.timelineIntent}>
                      {entry.intent} · {entry.dynamicSelection ?? ''}
                    </Text>
                  )}
                  <Text style={styles.timelineXp}>+{entry.xpAwarded} XP</Text>
                </View>
              </View>
            ))
          )}
        </View>

        {/* ============================================================ */}
        {/* SECTION 5: THE FIRMAMENT (Compact)                           */}
        {/* ============================================================ */}
        <Text style={styles.sectionLabel}>THE FIRMAMENT</Text>

        <View style={styles.firmamentCard}>
          {leaderboardData.top3.map((entry, i) => {
            const medals = ['🥇', '🥈', '🥉', '④', '⑤'];
            const rankColor = getRankColor(entry.levelRank);
            return (
              <View key={`${entry.magicName}-${entry.rank}`} style={[
                styles.firmamentRow,
                entry.isCurrentUser && styles.firmamentRowSelf,
              ]}>
                <Text style={[styles.firmamentMedal, i >= 3 && { fontSize: 12, color: '#6B6B6B' }]}>
                  {medals[i] ?? `#${entry.rank}`}
                </Text>
                <View style={[styles.firmamentAvatar, { borderColor: entry.isCurrentUser ? '#D4AF37' : rankColor }]}>
                  <Text style={[styles.firmamentAvatarText, { color: entry.isCurrentUser ? '#D4AF37' : rankColor }]}>
                    {(entry.isCurrentUser ? magicName : entry.magicName).charAt(0)}
                  </Text>
                </View>
                <View style={styles.firmamentInfo}>
                  <Text style={[styles.firmamentName, entry.isCurrentUser && { color: '#D4AF37' }]}>
                    {entry.isCurrentUser ? magicName : entry.magicName}
                  </Text>
                  <Text style={[styles.firmamentTitle, { color: rankColor }]}>
                    {LEVEL_TITLES[entry.levelRank] ?? 'Neophyte'}
                  </Text>
                </View>
                <Text style={styles.firmamentXp}>
                  {entry.xpTotal.toLocaleString()} XP
                </Text>
              </View>
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

      {/* Egregore Chamber Modal */}
      {showChamber && syncEvent && (
        <EgregoreChamber
          event={syncEvent}
          onClose={() => setShowChamber(false)}
        />
      )}
    </ScreenContainer>
  );
}

// ============================================================
// EGREGORE CHAMBER (Inline component for the live event)
// ============================================================

interface ChamberProps {
  event: SanityGlobalSyncEvent;
  onClose: () => void;
}

function EgregoreChamber({ event, onClose }: ChamberProps) {
  const [phase, setPhase] = useState<'standby' | 'ignition' | 'channeling' | 'disconnect'>('standby');
  const [countdown, setCountdown] = useState('');
  const [countUp, setCountUp] = useState(0);
  const [terminalLogs, setTerminalLogs] = useState<string[]>([]);
  const [simulatedNodes, setSimulatedNodes] = useState(event.baseNodeCount ?? 847);
  const [flashGold, setFlashGold] = useState(false);
  const setChargeMax = useGridEngine((s) => s.setChargeMax);
  const addCharge = useGridEngine((s) => s.addCharge);
  const countUpRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const logRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const nodeRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Core breathing animation
  const coreScale = useSharedValue(1);
  useEffect(() => {
    coreScale.value = withRepeat(
      withSequence(
        withTiming(1.2, { duration: 3000, easing: REasing.inOut(REasing.ease) }),
        withTiming(0.9, { duration: 3000, easing: REasing.inOut(REasing.ease) }),
      ),
      -1, false,
    );
  }, []);

  const coreStyle = useAnimatedStyle(() => ({
    transform: [{ scale: coreScale.value }],
  }));

  // Countdown to targetDate
  useEffect(() => {
    if (phase !== 'standby') return;
    const target = new Date(event.targetDate).getTime();
    const interval = setInterval(() => {
      const diff = target - Date.now();
      if (diff <= 0) {
        clearInterval(interval);
        // Ignition!
        setPhase('ignition');
        return;
      }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setCountdown(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
    }, 1000);

    // Simulate nodes joining
    nodeRef.current = setInterval(() => {
      setSimulatedNodes(prev => prev + Math.floor(Math.random() * 3));
    }, 2000);

    return () => {
      clearInterval(interval);
      if (nodeRef.current) clearInterval(nodeRef.current);
    };
  }, [phase, event.targetDate]);

  // Ignition flash → Channeling
  useEffect(() => {
    if (phase !== 'ignition') return;
    setFlashGold(true);
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    setTimeout(() => {
      setFlashGold(false);
      setPhase('channeling');
    }, 100);
  }, [phase]);

  // Channeling: count-up timer + terminal logs
  useEffect(() => {
    if (phase !== 'channeling') return;

    countUpRef.current = setInterval(() => {
      setCountUp(prev => prev + 1);
    }, 1000);

    const SIMULATED_LOGS = [
      'Grid Resonance at {pct}%...',
      'Node 0x{hex} ({city}) channel locked.',
      'Kinetic charge received from Node 0x{hex}.',
      'Egregore mass increasing... +{n} units.',
      'Frequency alignment confirmed at {hz}Hz.',
      'Node 0x{hex} contributing astral charge.',
      'Collective intent vector stabilizing...',
      'Harmonic convergence at {pct}%.',
      'Node 0x{hex} ({city}) uplink established.',
      'Data stream integrity: {pct}%.',
    ];
    const CITIES = ['Berlin', 'Tokyo', 'Cairo', 'London', 'NYC', 'Mumbai', 'São Paulo', 'Sydney', 'Oslo', 'Kyoto'];

    logRef.current = setInterval(() => {
      const template = SIMULATED_LOGS[Math.floor(Math.random() * SIMULATED_LOGS.length)];
      const log = template
        .replace('{pct}', (90 + Math.random() * 9.9).toFixed(1))
        .replace('{hex}', (0x100 + Math.floor(Math.random() * 0xEFF)).toString(16).toUpperCase())
        .replace('{city}', CITIES[Math.floor(Math.random() * CITIES.length)])
        .replace('{n}', String(Math.floor(Math.random() * 50 + 10)))
        .replace('{hz}', event.frequencyHz ?? '432');
      setTerminalLogs(prev => [...prev.slice(-20), `> ${log}`]);
    }, 1000 + Math.random() * 3000);

    return () => {
      if (countUpRef.current) clearInterval(countUpRef.current);
      if (logRef.current) clearInterval(logRef.current);
    };
  }, [phase]);

  const handleDisconnect = async () => {
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    if (countUpRef.current) clearInterval(countUpRef.current);
    if (logRef.current) clearInterval(logRef.current);
    await setChargeMax();
    setPhase('disconnect');
  };

  const formatCountUp = (seconds: number): string => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <Modal visible animationType="fade" statusBarTranslucent>
      <View style={[
        chamberStyles.container,
        flashGold && { backgroundColor: '#D4AF37' },
      ]}>
        {/* STANDBY */}
        {phase === 'standby' && (
          <View style={chamberStyles.centerContent}>
            <Text style={chamberStyles.phaseLabel}>STANDBY</Text>
            <Text style={chamberStyles.countdown}>
              T-MINUS {countdown || '00:00:00'}
            </Text>
            <Text style={chamberStyles.countdownSub}>UNTIL UPLINK</Text>
            <Text style={chamberStyles.nodeCounter}>
              {simulatedNodes.toLocaleString()} Nodes in Standby...
            </Text>
            <Pressable
              onPress={onClose}
              style={({ pressed }) => [
                chamberStyles.ghostBtn,
                pressed && { opacity: 0.7 },
              ]}
            >
              <Text style={chamberStyles.ghostBtnText}>ABORT</Text>
            </Pressable>
          </View>
        )}

        {/* CHANNELING */}
        {phase === 'channeling' && (
          <View style={chamberStyles.channelingContainer}>
            {/* Count-up timer */}
            <Text style={chamberStyles.syncTimer}>
              TIME IN SYNC: {formatCountUp(countUp)}
            </Text>

            {/* Breathing Core */}
            <View style={chamberStyles.coreContainer}>
              <ReAnimated.View style={[chamberStyles.coreGlow, coreStyle]} />
              <ReAnimated.View style={[chamberStyles.coreInner, coreStyle]} />
              {/* Particle lines flowing in */}
              <Svg width={200} height={200} style={chamberStyles.particleSvg}>
                {Array.from({ length: 12 }, (_, i) => {
                  const angle = (i * 30) * (Math.PI / 180);
                  const outerR = 95;
                  const innerR = 25;
                  return (
                    <Line
                      key={i}
                      x1={100 + outerR * Math.cos(angle)}
                      y1={100 + outerR * Math.sin(angle)}
                      x2={100 + innerR * Math.cos(angle)}
                      y2={100 + innerR * Math.sin(angle)}
                      stroke="#D4AF37"
                      strokeWidth={1}
                      opacity={0.3 + Math.random() * 0.4}
                    />
                  );
                })}
              </Svg>
            </View>

            {/* Directive */}
            {event.directive && (
              <Text style={chamberStyles.directive} numberOfLines={3}>
                {event.directive}
              </Text>
            )}

            {/* Terminal Feed */}
            <View style={chamberStyles.terminalFeed}>
              <ScrollView
                contentContainerStyle={chamberStyles.terminalScroll}
                showsVerticalScrollIndicator={false}
              >
                {terminalLogs.map((log, i) => (
                  <Text key={i} style={chamberStyles.terminalLine}>{log}</Text>
                ))}
              </ScrollView>
            </View>

            {/* Sever Uplink */}
            <Pressable
              onPress={handleDisconnect}
              style={({ pressed }) => [
                chamberStyles.severBtn,
                pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] },
              ]}
            >
              <Text style={chamberStyles.severBtnText}>⟐ SEVER UPLINK</Text>
            </Pressable>
          </View>
        )}

        {/* DISCONNECT */}
        {phase === 'disconnect' && (
          <View style={chamberStyles.centerContent}>
            <Text style={chamberStyles.disconnectTitle}>UPLINK SEVERED</Text>
            <Text style={chamberStyles.disconnectMsg}>
              DATA TRANSMITTED.{'\n'}THE EGREGORE GROWS STRONGER.
            </Text>
            <Text style={chamberStyles.disconnectXp}>
              +{Math.round(countUp * 2)} XP AWARDED
            </Text>
            <Text style={chamberStyles.disconnectCharge}>
              GRID CHARGE → 100% [ ANCHOR ]
            </Text>
            <Pressable
              onPress={onClose}
              style={({ pressed }) => [
                chamberStyles.ghostBtn,
                { marginTop: 40 },
                pressed && { opacity: 0.7 },
              ]}
            >
              <Text style={chamberStyles.ghostBtnText}>RETURN TO CONSOLE</Text>
            </Pressable>
          </View>
        )}
      </View>
    </Modal>
  );
}

// ============================================================
// STYLES
// ============================================================

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 120 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { fontSize: 16, color: '#6B6B6B' },

  screenTitle: {
    fontFamily: 'Cinzel',
    fontSize: 14,
    color: '#D4AF3780',
    letterSpacing: 8,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 16,
  },

  // Section labels
  sectionLabel: {
    fontFamily: 'Cinzel',
    fontSize: 11,
    color: '#D4AF3760',
    letterSpacing: 6,
    textAlign: 'center',
    marginTop: 28,
    marginBottom: 14,
  },

  // ===== THE MIRROR =====
  mirrorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0A0A0A',
    borderWidth: 1,
    borderColor: '#D4AF3720',
    borderRadius: 14,
    padding: 14,
    gap: 12,
  },
  avatarCircle: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: '#D4AF3715',
    borderWidth: 1.5, borderColor: '#D4AF3740',
    justifyContent: 'center', alignItems: 'center',
  },
  avatarText: {
    fontFamily: 'Cinzel', fontSize: 20, color: '#D4AF37', fontWeight: '700',
  },
  mirrorInfo: { flex: 1 },
  magicNameText: {
    fontFamily: 'Cinzel', fontSize: 17, color: '#E0E0E0', letterSpacing: 1,
  },
  levelTitleText: {
    fontFamily: 'JetBrainsMono', fontSize: 10, color: '#D4AF37',
    letterSpacing: 1, marginTop: 2,
  },

  // XP
  xpSection: { marginTop: 10 },
  xpBarTrack: {
    height: 4, backgroundColor: '#111', borderRadius: 2, overflow: 'hidden',
  },
  xpBarFill: { height: '100%', backgroundColor: '#D4AF37', borderRadius: 2 },
  xpRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  xpText: { fontFamily: 'JetBrainsMono', fontSize: 11, color: '#E0E0E0' },
  xpNext: { fontFamily: 'JetBrainsMono', fontSize: 10, color: '#6B6B6B' },

  // Stats
  statsRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  statCard: {
    flex: 1, backgroundColor: '#0A0A0A', borderWidth: 1, borderColor: '#1A1A1A',
    borderRadius: 10, padding: 10, alignItems: 'center',
  },
  statValue: {
    fontFamily: 'JetBrainsMono', fontSize: 16, color: '#E0E0E0', fontWeight: '700',
  },
  statLabel: {
    fontFamily: 'JetBrainsMono', fontSize: 7, color: '#6B6B6B',
    letterSpacing: 1, marginTop: 3,
  },

  // ===== P2P CONSTELLATION =====
  constellationCard: {
    backgroundColor: '#0A0A0A',
    borderWidth: 1, borderColor: '#1A1A1A',
    borderRadius: 14, padding: 16,
  },
  chargeReadout: { marginTop: 12, alignItems: 'center', gap: 4 },
  chargeText: {
    fontFamily: 'JetBrainsMono', fontSize: 12, letterSpacing: 1,
  },
  chargeTag: {
    fontFamily: 'JetBrainsMono', fontSize: 10, color: '#6B6B6B',
  },
  stabilityText: {
    fontFamily: 'JetBrainsMono', fontSize: 10, color: '#A3A3A3', letterSpacing: 1,
  },

  // ===== GLOBAL SYNC OPERATIONS =====
  syncCard: {
    backgroundColor: '#0A0A0A',
    borderWidth: 1, borderColor: '#D4AF3720',
    borderRadius: 14, padding: 18,
  },
  syncTitle: {
    fontFamily: 'Cinzel', fontSize: 16, color: '#E0E0E0', letterSpacing: 1,
  },
  syncDate: {
    fontFamily: 'JetBrainsMono', fontSize: 10, color: '#D4AF37',
    letterSpacing: 1, marginTop: 6,
  },
  directivePreview: {
    marginTop: 10, borderLeftWidth: 2, borderLeftColor: '#D4AF37', paddingLeft: 10,
  },
  directiveText: {
    fontFamily: 'JetBrainsMono', fontSize: 11, color: '#A3A3A3', lineHeight: 18,
  },
  pledgeBtn: {
    marginTop: 16, backgroundColor: '#D4AF3715',
    borderWidth: 1, borderColor: '#D4AF37',
    borderRadius: 10, paddingVertical: 12, alignItems: 'center',
  },
  pledgeBtnText: {
    fontFamily: 'JetBrainsMono', fontSize: 13, color: '#D4AF37',
    letterSpacing: 2, fontWeight: '700',
  },
  pledgedContainer: { marginTop: 14, alignItems: 'center', gap: 8 },
  pledgedBadge: {
    backgroundColor: '#D4AF3720', borderRadius: 8,
    paddingHorizontal: 14, paddingVertical: 6,
  },
  pledgedText: {
    fontFamily: 'JetBrainsMono', fontSize: 12, color: '#D4AF37',
    letterSpacing: 2, fontWeight: '700',
  },
  nodeCountText: {
    fontFamily: 'JetBrainsMono', fontSize: 10, color: '#A3A3A3', letterSpacing: 1,
  },
  uplinkBtn: {
    marginTop: 8, backgroundColor: '#D4AF37',
    borderRadius: 10, paddingVertical: 12, paddingHorizontal: 24,
  },
  uplinkBtnText: {
    fontFamily: 'Cinzel', fontSize: 14, color: '#050505',
    letterSpacing: 2, fontWeight: '700',
  },
  noEventContainer: { alignItems: 'center', paddingVertical: 20 },
  noEventText: {
    fontFamily: 'JetBrainsMono', fontSize: 12, color: '#6B6B6B', letterSpacing: 2,
  },
  noEventSub: {
    fontFamily: 'JetBrainsMono', fontSize: 10, color: '#3A3A3A',
    marginTop: 6, textAlign: 'center',
  },

  // ===== ASTRAL CHRONICLES =====
  timelineContainer: { paddingLeft: 8 },
  noChroniclesText: {
    fontFamily: 'JetBrainsMono', fontSize: 11, color: '#6B6B6B',
    textAlign: 'center', paddingVertical: 20,
  },
  timelineItem: { flexDirection: 'row', minHeight: 60 },
  timelineLine: { width: 24, alignItems: 'center' },
  timelineDot: {
    width: 10, height: 10, borderRadius: 5, marginTop: 4,
  },
  timelineConnector: {
    width: 2, flex: 1, backgroundColor: '#D4AF3740', marginVertical: 2,
  },
  timelineContent: {
    flex: 1, paddingLeft: 12, paddingBottom: 16,
    borderBottomWidth: 0.5, borderBottomColor: '#1A1A1A',
  },
  timelineDate: {
    fontFamily: 'JetBrainsMono', fontSize: 9, color: '#6B6B6B', letterSpacing: 1,
  },
  timelineName: {
    fontFamily: 'Cinzel', fontSize: 13, color: '#E0E0E0', marginTop: 2,
  },
  timelineIntent: {
    fontFamily: 'JetBrainsMono', fontSize: 9, color: '#D4AF37',
    letterSpacing: 1, marginTop: 2,
  },
  timelineXp: {
    fontFamily: 'JetBrainsMono', fontSize: 10, color: '#A3A3A3', marginTop: 3,
  },

  // ===== THE FIRMAMENT =====
  firmamentCard: { gap: 6 },
  firmamentRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#0A0A0A', borderWidth: 1, borderColor: '#1A1A1A',
    borderRadius: 12, padding: 12, gap: 10,
  },
  firmamentRowSelf: {
    borderColor: '#D4AF3740', backgroundColor: '#D4AF3708',
  },
  firmamentMedal: { fontSize: 18, width: 28, textAlign: 'center' },
  firmamentAvatar: {
    width: 34, height: 34, borderRadius: 17, borderWidth: 1.5,
    justifyContent: 'center', alignItems: 'center', backgroundColor: '#0D0D0D',
  },
  firmamentAvatarText: {
    fontFamily: 'Cinzel', fontSize: 14, fontWeight: '700',
  },
  firmamentInfo: { flex: 1 },
  firmamentName: { fontSize: 13, fontWeight: '600', color: '#E0E0E0' },
  firmamentTitle: {
    fontFamily: 'JetBrainsMono', fontSize: 9, letterSpacing: 1, marginTop: 1,
  },
  firmamentXp: { fontFamily: 'JetBrainsMono', fontSize: 11, color: '#6B6B6B' },

  // Settings
  settingsBtn: {
    marginTop: 28, alignSelf: 'center',
    paddingHorizontal: 24, paddingVertical: 10,
    borderWidth: 1, borderColor: '#1A1A1A', borderRadius: 20,
  },
  settingsBtnText: { fontSize: 13, color: '#6B6B6B' },
});

// ============================================================
// CHAMBER STYLES
// ============================================================

const chamberStyles = StyleSheet.create({
  container: {
    flex: 1, backgroundColor: '#050505',
    justifyContent: 'center', alignItems: 'center',
  },
  centerContent: {
    flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24,
  },
  phaseLabel: {
    fontFamily: 'JetBrainsMono', fontSize: 12, color: '#A3A3A3',
    letterSpacing: 4, marginBottom: 20,
  },
  countdown: {
    fontFamily: 'JetBrainsMono', fontSize: 36, color: '#EF4444',
    letterSpacing: 2,
  },
  countdownSub: {
    fontFamily: 'JetBrainsMono', fontSize: 11, color: '#A3A3A3',
    letterSpacing: 3, marginTop: 8,
  },
  nodeCounter: {
    fontFamily: 'JetBrainsMono', fontSize: 12, color: '#D4AF37',
    letterSpacing: 1, marginTop: 30,
  },
  ghostBtn: {
    marginTop: 60, borderWidth: 1, borderColor: '#3A3A3A',
    borderRadius: 10, paddingHorizontal: 24, paddingVertical: 10,
  },
  ghostBtnText: {
    fontFamily: 'JetBrainsMono', fontSize: 12, color: '#6B6B6B', letterSpacing: 2,
  },

  // Channeling
  channelingContainer: {
    flex: 1, alignItems: 'center', paddingTop: 60, paddingHorizontal: 16,
  },
  syncTimer: {
    fontFamily: 'JetBrainsMono', fontSize: 14, color: '#A3A3A3',
    letterSpacing: 3,
  },
  coreContainer: {
    width: 200, height: 200, justifyContent: 'center', alignItems: 'center',
    marginTop: 30,
  },
  coreGlow: {
    position: 'absolute', width: 120, height: 120, borderRadius: 60,
    backgroundColor: '#D4AF3730',
  },
  coreInner: {
    position: 'absolute', width: 60, height: 60, borderRadius: 30,
    backgroundColor: '#D4AF37',
    shadowColor: '#D4AF37', shadowRadius: 30, shadowOpacity: 0.8,
    shadowOffset: { width: 0, height: 0 }, elevation: 20,
  },
  particleSvg: {
    position: 'absolute',
  },
  directive: {
    fontFamily: 'Cinzel', fontSize: 14, color: '#D4AF37',
    textAlign: 'center', marginTop: 24, lineHeight: 22,
    paddingHorizontal: 20,
  },
  terminalFeed: {
    flex: 1, width: '100%', marginTop: 24,
    backgroundColor: '#0A0A0A', borderRadius: 10,
    borderWidth: 1, borderColor: '#1A1A1A',
    padding: 12, maxHeight: 180,
  },
  terminalScroll: { paddingBottom: 8 },
  terminalLine: {
    fontFamily: 'JetBrainsMono', fontSize: 10, color: '#A3A3A3',
    lineHeight: 18,
  },
  severBtn: {
    marginTop: 16, marginBottom: 40,
    borderWidth: 1, borderColor: '#EF4444',
    borderRadius: 10, paddingHorizontal: 24, paddingVertical: 12,
  },
  severBtnText: {
    fontFamily: 'JetBrainsMono', fontSize: 13, color: '#EF4444',
    letterSpacing: 2, fontWeight: '700',
  },

  // Disconnect
  disconnectTitle: {
    fontFamily: 'Cinzel', fontSize: 22, color: '#D4AF37',
    letterSpacing: 4,
  },
  disconnectMsg: {
    fontFamily: 'JetBrainsMono', fontSize: 12, color: '#A3A3A3',
    textAlign: 'center', lineHeight: 22, marginTop: 16, letterSpacing: 1,
  },
  disconnectXp: {
    fontFamily: 'JetBrainsMono', fontSize: 18, color: '#D4AF37',
    marginTop: 24, letterSpacing: 2,
  },
  disconnectCharge: {
    fontFamily: 'JetBrainsMono', fontSize: 11, color: '#A3A3A3',
    marginTop: 8, letterSpacing: 1,
  },
});
