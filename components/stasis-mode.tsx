// ============================================================
// ÆONIS – Stasis Mode "Deepening" v2
// Fluid 60fps reanimated animations, CMS breathing rhythms,
// Ritual Priming, Circular Phase Ring, Haptics
// ============================================================

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Text, View, StyleSheet, Pressable, Platform, Dimensions, ScrollView,
} from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop, G, RadialGradient } from 'react-native-svg';
import Animated, {
  useSharedValue, useAnimatedStyle, useAnimatedProps,
  withTiming, withRepeat, withSequence, Easing, runOnJS,
  cancelAnimation, useDerivedValue, interpolate,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useKeepAwake } from 'expo-keep-awake';
import { handleStasisCompletion } from '@/lib/ritual/completion-handler';
import { getBreathingRhythms, type SanityBreathingRhythm } from '@/lib/cms/sanity';
import { useRitualStore } from '@/lib/ritual/store';

const { width: SW } = Dimensions.get('window');
const RING_SIZE = Math.min(SW * 0.72, 300);
const RING_CENTER = RING_SIZE / 2;
const RING_RADIUS = RING_SIZE / 2 - 16;
const RING_STROKE = 8;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

// Animated SVG components
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// Default breathing patterns (fallback if CMS is empty)
const DEFAULT_RHYTHMS: Array<{ id: string; name: string; inhale: number; holdIn: number; exhale: number; holdOut: number; colorHex: string }> = [
  { id: 'box', name: 'Box Breathing', inhale: 4, holdIn: 4, exhale: 4, holdOut: 4, colorHex: '#9CA3AF' },
  { id: 'calm', name: '4-7-8 Calm', inhale: 4, holdIn: 7, exhale: 8, holdOut: 0, colorHex: '#3B82F6' },
  { id: 'power', name: 'Power Breath', inhale: 6, holdIn: 2, exhale: 6, holdOut: 2, colorHex: '#EF4444' },
  { id: 'deep', name: 'Deep Resonance', inhale: 5, holdIn: 5, exhale: 5, holdOut: 5, colorHex: '#D4AF37' },
];

// Ritual color map for priming
const RITUAL_COLORS: Record<string, string> = {
  lbrp: '#3B82F6',
  mp: '#D4AF37',
  sirp: '#8B5CF6',
  star_ruby: '#EF4444',
  hammer_rite: '#F59E0B',
};

// Phase tier thresholds (in seconds)
const TIER_BLUE = 5 * 60;
const TIER_GOLD = 15 * 60;

interface StasisModeProps {
  onComplete?: (result: { xpAwarded: number; buffActive: boolean }) => void;
  onClose: () => void;
}

type BreathPhase = 'Inhale' | 'Hold' | 'Exhale' | 'Void';

function getTierInfo(totalSeconds: number): { color: string; gradStart: string; gradEnd: string; label: string } {
  if (totalSeconds >= TIER_GOLD) {
    return { color: '#FFD700', gradStart: '#D4AF37', gradEnd: '#FFD700', label: 'XP BOOST' };
  }
  if (totalSeconds >= TIER_BLUE) {
    return { color: '#3B82F6', gradStart: '#1E40AF', gradEnd: '#60A5FA', label: 'BUFF ACTIVE' };
  }
  return { color: '#9CA3AF', gradStart: '#6B7280', gradEnd: '#D1D5DB', label: 'WARMING UP' };
}

export function StasisMode({ onComplete, onClose }: StasisModeProps) {
  useKeepAwake();

  // ─── State ─────────────────────────────────────────────────
  const [isActive, setIsActive] = useState(false);
  const [totalSeconds, setTotalSeconds] = useState(0);
  const [cycleCount, setCycleCount] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [result, setResult] = useState<{ xpAwarded: number; buffActive: boolean } | null>(null);
  const [currentPhase, setCurrentPhase] = useState<BreathPhase>('Inhale');

  // CMS breathing rhythms
  const [cmsRhythms, setCmsRhythms] = useState<SanityBreathingRhythm[]>([]);
  const [selectedRhythmIndex, setSelectedRhythmIndex] = useState(0);

  // Ritual priming
  const rituals = useRitualStore((s) => s.rituals);
  const [primedRitualId, setPrimedRitualId] = useState<string | null>(null);

  // Setup state
  const [showSetup, setShowSetup] = useState(true);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const phaseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ─── Reanimated shared values ──────────────────────────────
  const breathScale = useSharedValue(0.65);
  const nebulaOpacity = useSharedValue(0.15);
  const ringProgress = useSharedValue(0);
  const phaseTextOpacity = useSharedValue(1);

  // ─── Computed values ───────────────────────────────────────
  const allRhythms = useMemo(() => {
    const mapped = cmsRhythms.map((r) => ({
      id: r._id,
      name: r.name,
      inhale: r.inhale,
      holdIn: r.holdIn,
      exhale: r.exhale,
      holdOut: r.holdOut,
      colorHex: r.colorHex ?? '#9CA3AF',
    }));
    return mapped.length > 0 ? mapped : DEFAULT_RHYTHMS;
  }, [cmsRhythms]);

  const rhythm = allRhythms[selectedRhythmIndex] ?? allRhythms[0];
  const cycleDuration = rhythm.inhale + rhythm.holdIn + rhythm.exhale + rhythm.holdOut;
  const totalMinutes = Math.floor(totalSeconds / 60);
  const tier = getTierInfo(totalSeconds);

  // Override glow color if ritual is primed
  const glowColor = primedRitualId ? (RITUAL_COLORS[primedRitualId] ?? tier.color) : tier.color;

  // ─── Fetch CMS rhythms ────────────────────────────────────
  useEffect(() => {
    getBreathingRhythms()
      .then((data) => { if (data.length > 0) setCmsRhythms(data); })
      .catch(() => { /* use defaults */ });
  }, []);

  // ─── Breathing animation cycle (reanimated, 60fps) ────────
  const startBreathCycle = useCallback(() => {
    const { inhale, holdIn, exhale, holdOut } = rhythm;

    // Phase 1: Inhale (expand)
    breathScale.value = withTiming(1.0, {
      duration: inhale * 1000,
      easing: Easing.inOut(Easing.sin),
    });
    nebulaOpacity.value = withTiming(0.6, {
      duration: inhale * 1000,
      easing: Easing.inOut(Easing.sin),
    });

    // Phase text fade
    phaseTextOpacity.value = withSequence(
      withTiming(0, { duration: 150 }),
      withTiming(1, { duration: 300 }),
    );

    const triggerHaptic = () => {
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    };

    // Schedule phase transitions
    const t1 = inhale * 1000;
    const t2 = t1 + holdIn * 1000;
    const t3 = t2 + exhale * 1000;
    const t4 = t3 + holdOut * 1000;

    // Hold In
    const timer1 = setTimeout(() => {
      runOnJS(setCurrentPhase)('Hold');
      runOnJS(triggerHaptic)();
      phaseTextOpacity.value = withSequence(
        withTiming(0, { duration: 150 }),
        withTiming(1, { duration: 300 }),
      );
    }, t1);

    // Exhale (contract)
    const timer2 = setTimeout(() => {
      runOnJS(setCurrentPhase)('Exhale');
      runOnJS(triggerHaptic)();
      breathScale.value = withTiming(0.65, {
        duration: exhale * 1000,
        easing: Easing.inOut(Easing.sin),
      });
      nebulaOpacity.value = withTiming(0.15, {
        duration: exhale * 1000,
        easing: Easing.inOut(Easing.sin),
      });
      phaseTextOpacity.value = withSequence(
        withTiming(0, { duration: 150 }),
        withTiming(1, { duration: 300 }),
      );
    }, t2);

    // Void (hold out)
    const timer3 = setTimeout(() => {
      if (holdOut > 0) {
        runOnJS(setCurrentPhase)('Void');
        runOnJS(triggerHaptic)();
        phaseTextOpacity.value = withSequence(
          withTiming(0, { duration: 150 }),
          withTiming(1, { duration: 300 }),
        );
      }
    }, t3);

    // Next cycle
    const timer4 = setTimeout(() => {
      runOnJS(setCurrentPhase)('Inhale');
      runOnJS(triggerHaptic)();
      runOnJS(setCycleCount)((c: number) => c + 1);
    }, t4);

    return [timer1, timer2, timer3, timer4];
  }, [rhythm, breathScale, nebulaOpacity, phaseTextOpacity]);

  // ─── Main breathing loop ──────────────────────────────────
  useEffect(() => {
    if (!isActive) return;

    let timers: ReturnType<typeof setTimeout>[] = [];
    let cycleInterval: ReturnType<typeof setInterval> | null = null;

    // Start first cycle
    setCurrentPhase('Inhale');
    timers = startBreathCycle();

    // Repeat every cycleDuration
    cycleInterval = setInterval(() => {
      timers.forEach(clearTimeout);
      timers = startBreathCycle();
    }, cycleDuration * 1000);

    return () => {
      timers.forEach(clearTimeout);
      if (cycleInterval) clearInterval(cycleInterval);
    };
  }, [isActive, startBreathCycle, cycleDuration]);

  // ─── Total seconds counter ────────────────────────────────
  useEffect(() => {
    if (!isActive) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    intervalRef.current = setInterval(() => {
      setTotalSeconds((s) => s + 1);
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isActive]);

  // ─── Ring progress animation (smooth per cycle) ───────────
  useEffect(() => {
    if (!isActive) return;

    // Animate ring from 0→1 over each cycle, repeating
    ringProgress.value = 0;
    ringProgress.value = withRepeat(
      withTiming(1, {
        duration: cycleDuration * 1000,
        easing: Easing.linear,
      }),
      -1, // infinite
      false,
    );

    return () => {
      cancelAnimation(ringProgress);
    };
  }, [isActive, cycleDuration]);

  // ─── Animated styles ──────────────────────────────────────
  const breathAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: breathScale.value }],
  }));

  const nebulaAnimStyle = useAnimatedStyle(() => ({
    opacity: nebulaOpacity.value,
    transform: [{ scale: breathScale.value }],
  }));

  const phaseTextAnimStyle = useAnimatedStyle(() => ({
    opacity: phaseTextOpacity.value,
  }));

  const ringAnimProps = useAnimatedProps(() => ({
    strokeDashoffset: RING_CIRCUMFERENCE * (1 - ringProgress.value),
  }));

  // ─── Handlers ─────────────────────────────────────────────
  const handleStart = useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    setShowSetup(false);
    setIsActive(true);
    setTotalSeconds(0);
    setCycleCount(0);
    setCurrentPhase('Inhale');
    breathScale.value = 0.65;
    nebulaOpacity.value = 0.15;
    ringProgress.value = 0;
  }, []);

  const handleStop = useCallback(async () => {
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    setIsActive(false);
    cancelAnimation(ringProgress);
    cancelAnimation(breathScale);
    cancelAnimation(nebulaOpacity);

    const durationMinutes = Math.round(totalSeconds / 60);
    if (durationMinutes >= 1) {
      try {
        const res = await handleStasisCompletion(durationMinutes);
        setResult(res);
        setShowResult(true);
        onComplete?.(res);
      } catch {
        // Silently fail
      }
    }
  }, [totalSeconds, onComplete]);

  // ==========================================
  // RESULT SCREEN
  // ==========================================
  if (showResult && result) {
    const resTier = getTierInfo(totalSeconds);
    return (
      <View style={styles.container}>
        <View style={[styles.resultCard, { borderColor: resTier.color + '40' }]}>
          <Text style={[styles.resultTitle, { color: resTier.color }]}>Stasis Complete</Text>
          <Text style={styles.resultDuration}>{totalMinutes} min · {cycleCount} cycles</Text>
          <View style={styles.resultDivider} />
          <Text style={styles.resultXp}>+{result.xpAwarded} Spirit XP</Text>
          {result.buffActive && (
            <View style={[styles.buffBadge, { borderColor: '#3B82F640' }]}>
              <Text style={[styles.buffText, { color: '#3B82F6' }]}>STASIS BUFF ACTIVE</Text>
              <Text style={styles.buffDesc}>×1.15 XP for 60 minutes</Text>
            </View>
          )}
          {totalSeconds >= TIER_GOLD && (
            <View style={[styles.buffBadge, { borderColor: '#FFD70040' }]}>
              <Text style={[styles.buffText, { color: '#FFD700' }]}>GOLD SESSION</Text>
              <Text style={styles.buffDesc}>Deep meditation achieved</Text>
            </View>
          )}
          {primedRitualId && (
            <View style={[styles.buffBadge, { borderColor: (RITUAL_COLORS[primedRitualId] ?? '#D4AF37') + '40' }]}>
              <Text style={[styles.buffText, { color: RITUAL_COLORS[primedRitualId] ?? '#D4AF37' }]}>PRIMED</Text>
              <Text style={styles.buffDesc}>Attuned for {rituals.find((r) => r.id === primedRitualId)?.name ?? 'ritual'}</Text>
            </View>
          )}
          <Pressable
            onPress={onClose}
            style={({ pressed }) => [styles.closeBtn, { backgroundColor: resTier.color }, pressed && { opacity: 0.8 }]}
          >
            <Text style={styles.closeBtnText}>Return</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // ==========================================
  // SETUP SCREEN (Rhythm + Priming selection)
  // ==========================================
  if (showSetup && !isActive) {
    return (
      <View style={styles.container}>
        <Text style={styles.setupTitle}>Stasis Configuration</Text>
        <Text style={styles.setupSubtitle}>Attune your breath and intent</Text>

        {/* Breathing Rhythm Picker */}
        <Text style={styles.sectionLabel}>BREATHING PATTERN</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rhythmRow}>
          {allRhythms.map((r, i) => {
            const isSelected = i === selectedRhythmIndex;
            return (
              <Pressable
                key={r.id}
                onPress={() => {
                  setSelectedRhythmIndex(i);
                  if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
                style={[
                  styles.rhythmCard,
                  isSelected && { borderColor: r.colorHex + '80', backgroundColor: r.colorHex + '10' },
                ]}
              >
                <View style={[styles.rhythmDot, { backgroundColor: r.colorHex }]} />
                <Text style={[styles.rhythmName, isSelected && { color: '#E0E0E0' }]}>{r.name}</Text>
                <Text style={styles.rhythmPattern}>
                  {r.inhale}-{r.holdIn}-{r.exhale}-{r.holdOut}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Ritual Priming Selector */}
        <Text style={[styles.sectionLabel, { marginTop: 24 }]}>PRIME FOR RITUAL (optional)</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rhythmRow}>
          <Pressable
            onPress={() => {
              setPrimedRitualId(null);
              if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
            style={[
              styles.primeCard,
              !primedRitualId && { borderColor: '#6B6B6B80', backgroundColor: '#6B6B6B10' },
            ]}
          >
            <Text style={[styles.primeName, !primedRitualId && { color: '#E0E0E0' }]}>None</Text>
          </Pressable>
          {rituals.map((r) => {
            const isSelected = primedRitualId === r.id;
            const color = RITUAL_COLORS[r.id] ?? '#D4AF37';
            return (
              <Pressable
                key={r.id}
                onPress={() => {
                  setPrimedRitualId(r.id);
                  if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
                style={[
                  styles.primeCard,
                  isSelected && { borderColor: color + '80', backgroundColor: color + '10' },
                ]}
              >
                <View style={[styles.rhythmDot, { backgroundColor: color }]} />
                <Text style={[styles.primeName, isSelected && { color: '#E0E0E0' }]}>{r.name}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Start Button */}
        <Pressable
          onPress={handleStart}
          style={({ pressed }) => [styles.startBtn, pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] }]}
        >
          <Text style={styles.startBtnText}>Begin Stasis</Text>
        </Pressable>

        <Pressable
          onPress={onClose}
          style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.7 }]}
        >
          <Text style={styles.backBtnText}>Back</Text>
        </Pressable>
      </View>
    );
  }

  // ==========================================
  // MAIN TIMER SCREEN (Active Session)
  // ==========================================
  return (
    <View style={styles.container}>
      {/* Timer display */}
      <Text style={[styles.timerLabel, { color: tier.color }]}>
        {String(Math.floor(totalSeconds / 60)).padStart(2, '0')}:{String(totalSeconds % 60).padStart(2, '0')}
      </Text>
      <View style={styles.tierRow}>
        <View style={[styles.tierDot, { backgroundColor: tier.color }]} />
        <Text style={[styles.tierLabel, { color: tier.color }]}>{tier.label}</Text>
      </View>
      <Text style={styles.cycleLabel}>{cycleCount} cycles · {rhythm.name}</Text>

      {/* Circular Phase Ring with Nebula Glow */}
      <View style={styles.ringContainer}>
        {/* Nebula glow (radial gradient effect) */}
        <Animated.View
          style={[
            styles.nebulaGlow,
            { backgroundColor: glowColor + '20' },
            nebulaAnimStyle,
          ]}
        />
        <Animated.View
          style={[
            styles.nebulaInner,
            { backgroundColor: glowColor + '10' },
            nebulaAnimStyle,
          ]}
        />

        <Svg width={RING_SIZE} height={RING_SIZE}>
          <Defs>
            <LinearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor={tier.gradStart} />
              <Stop offset="1" stopColor={tier.gradEnd} />
            </LinearGradient>
          </Defs>

          {/* Background ring */}
          <Circle
            cx={RING_CENTER}
            cy={RING_CENTER}
            r={RING_RADIUS}
            stroke="#1A1A1A"
            strokeWidth={RING_STROKE}
            fill="none"
          />

          {/* Progress ring (smooth animated) */}
          <AnimatedCircle
            cx={RING_CENTER}
            cy={RING_CENTER}
            r={RING_RADIUS}
            stroke="url(#ringGrad)"
            strokeWidth={RING_STROKE}
            fill="none"
            strokeDasharray={`${RING_CIRCUMFERENCE}`}
            animatedProps={ringAnimProps}
            strokeLinecap="round"
            transform={`rotate(-90 ${RING_CENTER} ${RING_CENTER})`}
          />

          {/* Phase markers */}
          {(() => {
            const phases = [
              { frac: 0, label: 'IN' },
              { frac: rhythm.inhale / cycleDuration, label: 'H' },
              { frac: (rhythm.inhale + rhythm.holdIn) / cycleDuration, label: 'EX' },
              { frac: (rhythm.inhale + rhythm.holdIn + rhythm.exhale) / cycleDuration, label: 'V' },
            ];
            return phases.map((p, i) => {
              const angle = p.frac * 2 * Math.PI - Math.PI / 2;
              const mx = RING_CENTER + RING_RADIUS * Math.cos(angle);
              const my = RING_CENTER + RING_RADIUS * Math.sin(angle);
              const isCurrentPhaseMarker =
                (i === 0 && currentPhase === 'Inhale') ||
                (i === 1 && currentPhase === 'Hold') ||
                (i === 2 && currentPhase === 'Exhale') ||
                (i === 3 && currentPhase === 'Void');
              return (
                <Circle
                  key={i}
                  cx={mx}
                  cy={my}
                  r={isCurrentPhaseMarker ? 6 : 4}
                  fill={isCurrentPhaseMarker ? tier.color : '#333'}
                />
              );
            });
          })()}
        </Svg>

        {/* Center content (breathing circle + phase text) */}
        <Animated.View style={[styles.centerContent, breathAnimStyle]}>
          <View style={[styles.breathCircle, { borderColor: glowColor + '40' }]}>
            <Animated.Text style={[styles.phaseText, { color: glowColor }, phaseTextAnimStyle]}>
              {currentPhase === 'Inhale' ? 'Inhale...' :
               currentPhase === 'Hold' ? 'Hold...' :
               currentPhase === 'Exhale' ? 'Exhale...' : 'Void...'}
            </Animated.Text>
          </View>
        </Animated.View>
      </View>

      {/* Phase indicator pills */}
      <View style={styles.phaseRow}>
        {(['Inhale', 'Hold', 'Exhale', 'Void'] as BreathPhase[]).map((p) => (
          <View
            key={p}
            style={[
              styles.phasePill,
              currentPhase === p && { borderColor: tier.color, backgroundColor: tier.color + '10' },
            ]}
          >
            <Text style={[
              styles.phaseLabel,
              currentPhase === p && { color: tier.color },
            ]}>
              {p}
            </Text>
          </View>
        ))}
      </View>

      {/* Tier progress indicators */}
      <View style={styles.tierProgress}>
        <View style={styles.tierStep}>
          <View style={[styles.tierStepDot, { backgroundColor: '#9CA3AF' }]} />
          <Text style={[styles.tierStepLabel, totalSeconds < TIER_BLUE && { color: '#9CA3AF' }]}>Silver</Text>
        </View>
        <View style={[styles.tierLine, totalSeconds >= TIER_BLUE && { backgroundColor: '#3B82F640' }]} />
        <View style={styles.tierStep}>
          <View style={[styles.tierStepDot, { backgroundColor: totalSeconds >= TIER_BLUE ? '#3B82F6' : '#333' }]} />
          <Text style={[styles.tierStepLabel, totalSeconds >= TIER_BLUE && { color: '#3B82F6' }]}>Blue 5m</Text>
        </View>
        <View style={[styles.tierLine, totalSeconds >= TIER_GOLD && { backgroundColor: '#FFD70040' }]} />
        <View style={styles.tierStep}>
          <View style={[styles.tierStepDot, { backgroundColor: totalSeconds >= TIER_GOLD ? '#FFD700' : '#333' }]} />
          <Text style={[styles.tierStepLabel, totalSeconds >= TIER_GOLD && { color: '#FFD700' }]}>Gold 15m</Text>
        </View>
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        <Pressable
          onPress={handleStop}
          style={({ pressed }) => [styles.stopBtn, { borderColor: tier.color }, pressed && { opacity: 0.8 }]}
        >
          <Text style={[styles.stopBtnText, { color: tier.color }]}>End Session</Text>
        </Pressable>

        <Pressable
          onPress={() => {
            setIsActive(false);
            cancelAnimation(ringProgress);
            cancelAnimation(breathScale);
            cancelAnimation(nebulaOpacity);
            onClose();
          }}
          style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.7 }]}
        >
          <Text style={styles.backBtnText}>Back</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1, backgroundColor: '#050505', alignItems: 'center',
    justifyContent: 'center', padding: 24,
  },

  // Setup screen
  setupTitle: {
    fontFamily: 'Cinzel', fontSize: 24, color: '#D4AF37', letterSpacing: 3,
  },
  setupSubtitle: {
    fontFamily: 'JetBrainsMono', fontSize: 12, color: '#6B6B6B', marginTop: 6, letterSpacing: 1,
  },
  sectionLabel: {
    fontFamily: 'JetBrainsMono', fontSize: 9, color: '#6B6B6B',
    letterSpacing: 3, marginTop: 28, marginBottom: 10, alignSelf: 'flex-start',
  },
  rhythmRow: {
    flexDirection: 'row', gap: 10, paddingVertical: 4,
  },
  rhythmCard: {
    borderWidth: 1, borderColor: '#1A1A1A', borderRadius: 14,
    paddingHorizontal: 16, paddingVertical: 12, alignItems: 'center',
    backgroundColor: '#0A0A0A', minWidth: 100,
  },
  rhythmDot: { width: 8, height: 8, borderRadius: 4, marginBottom: 6 },
  rhythmName: {
    fontFamily: 'Cinzel', fontSize: 11, color: '#6B6B6B', letterSpacing: 1,
  },
  rhythmPattern: {
    fontFamily: 'JetBrainsMono', fontSize: 10, color: '#444', marginTop: 3,
  },
  primeCard: {
    borderWidth: 1, borderColor: '#1A1A1A', borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 10, alignItems: 'center',
    backgroundColor: '#0A0A0A', minWidth: 80,
  },
  primeName: {
    fontFamily: 'JetBrainsMono', fontSize: 10, color: '#6B6B6B', letterSpacing: 1,
  },

  // Timer
  timerLabel: {
    fontFamily: 'JetBrainsMono', fontSize: 36, letterSpacing: 4,
  },
  tierRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6,
  },
  tierDot: { width: 6, height: 6, borderRadius: 3 },
  tierLabel: {
    fontFamily: 'JetBrainsMono', fontSize: 9, letterSpacing: 3,
  },
  cycleLabel: {
    fontFamily: 'JetBrainsMono', fontSize: 11, color: '#6B6B6B', marginTop: 2,
  },

  // Ring
  ringContainer: {
    width: RING_SIZE + 60, height: RING_SIZE + 60,
    alignItems: 'center', justifyContent: 'center', marginTop: 24,
  },
  nebulaGlow: {
    position: 'absolute',
    width: RING_SIZE + 50,
    height: RING_SIZE + 50,
    borderRadius: (RING_SIZE + 50) / 2,
  },
  nebulaInner: {
    position: 'absolute',
    width: RING_SIZE + 20,
    height: RING_SIZE + 20,
    borderRadius: (RING_SIZE + 20) / 2,
  },
  centerContent: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  breathCircle: {
    width: RING_SIZE * 0.55,
    height: RING_SIZE * 0.55,
    borderRadius: RING_SIZE * 0.275,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0A0A0A80',
  },
  phaseText: {
    fontFamily: 'Cinzel', fontSize: 16, letterSpacing: 3,
  },

  // Phase pills
  phaseRow: {
    flexDirection: 'row', gap: 10, marginTop: 20,
  },
  phasePill: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16,
    borderWidth: 1, borderColor: '#1A1A1A',
  },
  phaseLabel: {
    fontFamily: 'JetBrainsMono', fontSize: 9, color: '#6B6B6B', letterSpacing: 1,
  },

  // Tier progress
  tierProgress: {
    flexDirection: 'row', alignItems: 'center', marginTop: 16, gap: 4,
  },
  tierStep: { alignItems: 'center', gap: 3 },
  tierStepDot: { width: 8, height: 8, borderRadius: 4 },
  tierStepLabel: {
    fontFamily: 'JetBrainsMono', fontSize: 8, color: '#333', letterSpacing: 1,
  },
  tierLine: {
    width: 32, height: 1, backgroundColor: '#1A1A1A',
  },

  // Controls
  controls: {
    marginTop: 28, alignItems: 'center', gap: 12,
  },
  startBtn: {
    backgroundColor: '#D4AF37', paddingHorizontal: 40, paddingVertical: 16,
    borderRadius: 30, marginTop: 32,
  },
  startBtnText: {
    color: '#050505', fontSize: 16, fontWeight: '700', letterSpacing: 2,
  },
  stopBtn: {
    borderWidth: 1, paddingHorizontal: 40,
    paddingVertical: 16, borderRadius: 30,
  },
  stopBtnText: {
    fontSize: 16, fontWeight: '700', letterSpacing: 2,
  },
  backBtn: {
    paddingHorizontal: 24, paddingVertical: 10,
  },
  backBtnText: {
    fontSize: 13, color: '#6B6B6B',
  },

  // Result screen
  resultCard: {
    backgroundColor: '#0D0D0D', borderWidth: 1,
    borderRadius: 20, padding: 32, alignItems: 'center', maxWidth: 320,
    width: '100%',
  },
  resultTitle: {
    fontFamily: 'Cinzel', fontSize: 24, letterSpacing: 3,
  },
  resultDuration: {
    fontFamily: 'JetBrainsMono', fontSize: 14, color: '#6B6B6B', marginTop: 8,
  },
  resultDivider: {
    width: '100%', height: 1, backgroundColor: '#1A1A1A', marginVertical: 20,
  },
  resultXp: {
    fontFamily: 'JetBrainsMono', fontSize: 20, color: '#22C55E', fontWeight: '700',
  },
  buffBadge: {
    marginTop: 12, borderWidth: 1,
    borderRadius: 12, paddingHorizontal: 16,
    paddingVertical: 10, alignItems: 'center',
  },
  buffText: {
    fontFamily: 'JetBrainsMono', fontSize: 11,
    letterSpacing: 2, fontWeight: '700',
  },
  buffDesc: {
    fontSize: 11, color: '#6B6B6B', marginTop: 4,
  },
  closeBtn: {
    marginTop: 24, paddingHorizontal: 32,
    paddingVertical: 14, borderRadius: 24,
  },
  closeBtnText: {
    color: '#050505', fontSize: 14, fontWeight: '700', letterSpacing: 1,
  },
});
