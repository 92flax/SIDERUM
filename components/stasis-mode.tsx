// ============================================================
// ÆONIS – Stasis Mode v4 "Senior UI/UX Fix"
// 1) Elegant dark rhythm selector (#0D0D0D / #D4AF37 gold)
// 2) SVG progress ring (strokeDashoffset per phase via reanimated)
// 3) Constrained scale (base 1.0, max 1.12 inhale, min 0.92 exhale)
// 4) Centered Cinzel phase text with smooth crossfade
// ============================================================

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Text, View, StyleSheet, Pressable, Platform, Dimensions, ScrollView,
} from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import Animated, {
  useSharedValue, useAnimatedStyle, useAnimatedProps,
  withTiming, withSequence, Easing, runOnJS,
  cancelAnimation,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useKeepAwake } from 'expo-keep-awake';
import { handleStasisCompletion } from '@/lib/ritual/completion-handler';
import { getBreathingRhythms, type SanityBreathingRhythm } from '@/lib/cms/sanity';
import { useRitualStore } from '@/lib/ritual/store';

const { width: SW } = Dimensions.get('window');

// ─── SVG Ring Dimensions ────────────────────────────────────
const RING_SIZE = Math.min(SW * 0.6, 240);
const RING_CENTER = RING_SIZE / 2;
const RING_STROKE = 3;
const RING_RADIUS = RING_SIZE / 2 - RING_STROKE * 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

// Animated SVG Circle for progress ring
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// ─── Scale constraints ──────────────────────────────────────
const SCALE_BASE = 1.0;
const SCALE_INHALE = 1.12;
const SCALE_EXHALE = 0.92;

// Default breathing patterns (fallback if CMS is empty)
const DEFAULT_RHYTHMS: Array<{
  id: string; name: string; inhale: number; holdIn: number;
  exhale: number; holdOut: number; colorHex: string;
}> = [
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

function getTierInfo(totalSeconds: number): {
  color: string; gradStart: string; gradEnd: string; label: string;
} {
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

  // ─── Reanimated shared values ──────────────────────────────
  const breathScale = useSharedValue(SCALE_BASE);
  const nebulaOpacity = useSharedValue(0.08);
  const phaseTextOpacity = useSharedValue(1);
  // SVG progress ring: 0 = empty, 1 = full
  const ringProgress = useSharedValue(0);

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
  const glowColor = primedRitualId
    ? (RITUAL_COLORS[primedRitualId] ?? rhythm.colorHex)
    : rhythm.colorHex;

  // ─── Fetch CMS rhythms ────────────────────────────────────
  useEffect(() => {
    getBreathingRhythms()
      .then((data) => { if (data.length > 0) setCmsRhythms(data); })
      .catch(() => { /* use defaults */ });
  }, []);

  // ─── Helper: animate ring fill for a given phase duration ─
  const animateRingForPhase = useCallback((durationSec: number) => {
    // Reset ring to 0, then fill to 1 over the phase duration
    ringProgress.value = 0;
    ringProgress.value = withTiming(1, {
      duration: durationSec * 1000,
      easing: Easing.linear,
    });
  }, [ringProgress]);

  // ─── Breathing animation cycle (reanimated, 60fps) ────────
  const startBreathCycle = useCallback(() => {
    const { inhale, holdIn, exhale, holdOut } = rhythm;

    const triggerHaptic = () => {
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    };

    const fadePhaseText = () => {
      phaseTextOpacity.value = withSequence(
        withTiming(0, { duration: 100 }),
        withTiming(1, { duration: 200 }),
      );
    };

    // Phase 1: INHALE → subtle scale up to 1.12, nebula brightens
    breathScale.value = withTiming(SCALE_INHALE, {
      duration: inhale * 1000,
      easing: Easing.inOut(Easing.ease),
    });
    nebulaOpacity.value = withTiming(0.35, {
      duration: inhale * 1000,
      easing: Easing.inOut(Easing.ease),
    });
    fadePhaseText();
    // Ring fills for inhale duration
    animateRingForPhase(inhale);

    // Schedule phase transitions
    const t1 = inhale * 1000;
    const t2 = t1 + holdIn * 1000;
    const t3 = t2 + exhale * 1000;
    const t4 = t3 + holdOut * 1000;

    // Phase 2: HOLD IN – scale stays, ring resets and fills for hold duration
    const timer1 = setTimeout(() => {
      runOnJS(setCurrentPhase)('Hold');
      runOnJS(triggerHaptic)();
      fadePhaseText();
      if (holdIn > 0) {
        animateRingForPhase(holdIn);
      }
    }, t1);

    // Phase 3: EXHALE → scale down to 0.92, nebula dims
    const timer2 = setTimeout(() => {
      runOnJS(setCurrentPhase)('Exhale');
      runOnJS(triggerHaptic)();
      breathScale.value = withTiming(SCALE_EXHALE, {
        duration: exhale * 1000,
        easing: Easing.inOut(Easing.ease),
      });
      nebulaOpacity.value = withTiming(0.08, {
        duration: exhale * 1000,
        easing: Easing.inOut(Easing.ease),
      });
      fadePhaseText();
      animateRingForPhase(exhale);
    }, t2);

    // Phase 4: VOID (hold out)
    const timer3 = setTimeout(() => {
      if (holdOut > 0) {
        runOnJS(setCurrentPhase)('Void');
        runOnJS(triggerHaptic)();
        fadePhaseText();
        animateRingForPhase(holdOut);
      }
    }, t3);

    // Next cycle start
    const timer4 = setTimeout(() => {
      runOnJS(setCurrentPhase)('Inhale');
      runOnJS(triggerHaptic)();
      runOnJS(setCycleCount)((c: number) => c + 1);
    }, t4);

    return [timer1, timer2, timer3, timer4];
  }, [rhythm, breathScale, nebulaOpacity, phaseTextOpacity, animateRingForPhase]);

  // ─── Main breathing loop ──────────────────────────────────
  useEffect(() => {
    if (!isActive) return;

    let timers: ReturnType<typeof setTimeout>[] = [];
    let cycleInterval: ReturnType<typeof setInterval> | null = null;

    setCurrentPhase('Inhale');
    timers = startBreathCycle();

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

  // ─── Animated styles ──────────────────────────────────────

  // Subtle breathing pulse (1.0 base → 1.12 max)
  const breathCircleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: breathScale.value }],
  }));

  // Nebula glow behind circle
  const nebulaGlowStyle = useAnimatedStyle(() => ({
    opacity: nebulaOpacity.value,
  }));

  // Phase text crossfade
  const phaseTextStyle = useAnimatedStyle(() => ({
    opacity: phaseTextOpacity.value,
  }));

  // SVG progress ring: strokeDashoffset animated per phase
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
    breathScale.value = SCALE_BASE;
    nebulaOpacity.value = 0.08;
    ringProgress.value = 0;
  }, []);

  const handleStop = useCallback(async () => {
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    setIsActive(false);
    cancelAnimation(breathScale);
    cancelAnimation(nebulaOpacity);
    cancelAnimation(ringProgress);

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
        <View style={[styles.resultCard, { borderColor: resTier.color + '30' }]}>
          <Text style={[styles.resultTitle, { color: resTier.color }]}>Stasis Complete</Text>
          <Text style={styles.resultDuration}>{totalMinutes} min · {cycleCount} cycles</Text>
          <View style={styles.resultDivider} />
          <Text style={styles.resultXp}>+{result.xpAwarded} Spirit XP</Text>
          {result.buffActive && (
            <View style={[styles.buffBadge, { borderColor: '#3B82F630' }]}>
              <Text style={[styles.buffText, { color: '#3B82F6' }]}>STASIS BUFF ACTIVE</Text>
              <Text style={styles.buffDesc}>×1.15 XP for 60 minutes</Text>
            </View>
          )}
          {totalSeconds >= TIER_GOLD && (
            <View style={[styles.buffBadge, { borderColor: '#FFD70030' }]}>
              <Text style={[styles.buffText, { color: '#FFD700' }]}>GOLD SESSION</Text>
              <Text style={styles.buffDesc}>Deep meditation achieved</Text>
            </View>
          )}
          {primedRitualId && (
            <View style={[styles.buffBadge, { borderColor: (RITUAL_COLORS[primedRitualId] ?? '#D4AF37') + '30' }]}>
              <Text style={[styles.buffText, { color: RITUAL_COLORS[primedRitualId] ?? '#D4AF37' }]}>PRIMED</Text>
              <Text style={styles.buffDesc}>
                Attuned for {rituals.find((r) => r.id === primedRitualId)?.name ?? 'ritual'}
              </Text>
            </View>
          )}
          <Pressable
            onPress={onClose}
            style={({ pressed }) => [
              styles.closeBtn,
              { backgroundColor: resTier.color },
              pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] },
            ]}
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
        <Text style={styles.setupTitle}>STASIS</Text>
        <Text style={styles.setupSubtitle}>Attune your breath and intent</Text>

        {/* ─── Elegant Rhythm Selector ─────────────────────── */}
        <Text style={styles.sectionLabel}>BREATHING PATTERN</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.rhythmRow}
        >
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
                  styles.rhythmPill,
                  isSelected && styles.rhythmPillSelected,
                ]}
              >
                <Text style={[
                  styles.rhythmPillName,
                  isSelected && styles.rhythmPillNameSelected,
                ]}>
                  {r.name}
                </Text>
                <Text style={[
                  styles.rhythmPillPattern,
                  isSelected && styles.rhythmPillPatternSelected,
                ]}>
                  {r.inhale}-{r.holdIn}-{r.exhale}-{r.holdOut}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* ─── Ritual Priming Selector ─────────────────────── */}
        <Text style={[styles.sectionLabel, { marginTop: 28 }]}>PRIME FOR RITUAL</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.rhythmRow}
        >
          <Pressable
            onPress={() => {
              setPrimedRitualId(null);
              if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
            style={[
              styles.primePill,
              !primedRitualId && styles.primePillSelected,
            ]}
          >
            <Text style={[
              styles.primePillText,
              !primedRitualId && styles.primePillTextSelected,
            ]}>None</Text>
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
                  styles.primePill,
                  isSelected && { borderColor: color, backgroundColor: color + '15' },
                ]}
              >
                <Text style={[
                  styles.primePillText,
                  isSelected && { color },
                ]}>{r.name}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* ─── Start Button ────────────────────────────────── */}
        <Pressable
          onPress={handleStart}
          style={({ pressed }) => [
            styles.startBtn,
            pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] },
          ]}
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
      {/* ─── Timer Display ─────────────────────────────────── */}
      <Text style={[styles.timerLabel, { color: tier.color }]}>
        {String(Math.floor(totalSeconds / 60)).padStart(2, '0')}:
        {String(totalSeconds % 60).padStart(2, '0')}
      </Text>
      <View style={styles.tierRow}>
        <View style={[styles.tierDot, { backgroundColor: tier.color }]} />
        <Text style={[styles.tierText, { color: tier.color }]}>{tier.label}</Text>
      </View>
      <Text style={styles.cycleLabel}>{cycleCount} cycles · {rhythm.name}</Text>

      {/* ─── SVG Ring + Breathing Circle ───────────────────── */}
      <View style={styles.ringArea}>
        {/* Nebula glow (does NOT scale – stays behind ring) */}
        <Animated.View style={[styles.nebulaGlow, { backgroundColor: glowColor }, nebulaGlowStyle]} />

        {/* SVG container with progress ring */}
        <Animated.View style={breathCircleStyle}>
          <Svg width={RING_SIZE} height={RING_SIZE} style={styles.svgRing}>
            <Defs>
              <LinearGradient id="phaseGrad" x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0" stopColor={tier.gradStart} />
                <Stop offset="1" stopColor={tier.gradEnd} />
              </LinearGradient>
            </Defs>

            {/* Background ring (track) */}
            <Circle
              cx={RING_CENTER}
              cy={RING_CENTER}
              r={RING_RADIUS}
              stroke="#1A1A1A"
              strokeWidth={RING_STROKE}
              fill="none"
            />

            {/* Animated progress ring (fills per phase) */}
            <AnimatedCircle
              cx={RING_CENTER}
              cy={RING_CENTER}
              r={RING_RADIUS}
              stroke="url(#phaseGrad)"
              strokeWidth={RING_STROKE}
              fill="none"
              strokeDasharray={`${RING_CIRCUMFERENCE}`}
              animatedProps={ringAnimProps}
              strokeLinecap="round"
              transform={`rotate(-90 ${RING_CENTER} ${RING_CENTER})`}
            />
          </Svg>

          {/* Phase text centered inside ring */}
          <View style={styles.centerTextContainer}>
            <Animated.Text style={[styles.phaseText, { color: glowColor }, phaseTextStyle]}>
              {currentPhase}
            </Animated.Text>
          </View>
        </Animated.View>
      </View>

      {/* ─── Phase Indicator Pills ─────────────────────────── */}
      <View style={styles.phaseRow}>
        {(['Inhale', 'Hold', 'Exhale', 'Void'] as BreathPhase[]).map((p) => (
          <View
            key={p}
            style={[
              styles.phasePill,
              currentPhase === p && { borderColor: glowColor + '50', backgroundColor: glowColor + '0A' },
            ]}
          >
            <Text style={[
              styles.phasePillText,
              currentPhase === p && { color: glowColor },
            ]}>
              {p}
            </Text>
          </View>
        ))}
      </View>

      {/* ─── Tier Progress ─────────────────────────────────── */}
      <View style={styles.tierProgress}>
        <View style={styles.tierStep}>
          <View style={[styles.tierStepDot, { backgroundColor: '#9CA3AF' }]} />
          <Text style={[styles.tierStepLabel, totalSeconds < TIER_BLUE && { color: '#555' }]}>Silver</Text>
        </View>
        <View style={[styles.tierLine, totalSeconds >= TIER_BLUE && { backgroundColor: '#3B82F630' }]} />
        <View style={styles.tierStep}>
          <View style={[styles.tierStepDot, { backgroundColor: totalSeconds >= TIER_BLUE ? '#3B82F6' : '#222' }]} />
          <Text style={[styles.tierStepLabel, totalSeconds >= TIER_BLUE && { color: '#3B82F6' }]}>Blue 5m</Text>
        </View>
        <View style={[styles.tierLine, totalSeconds >= TIER_GOLD && { backgroundColor: '#FFD70030' }]} />
        <View style={styles.tierStep}>
          <View style={[styles.tierStepDot, { backgroundColor: totalSeconds >= TIER_GOLD ? '#FFD700' : '#222' }]} />
          <Text style={[styles.tierStepLabel, totalSeconds >= TIER_GOLD && { color: '#FFD700' }]}>Gold 15m</Text>
        </View>
      </View>

      {/* ─── Controls ──────────────────────────────────────── */}
      <View style={styles.controls}>
        <Pressable
          onPress={handleStop}
          style={({ pressed }) => [
            styles.stopBtn,
            { borderColor: tier.color + '50' },
            pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] },
          ]}
        >
          <Text style={[styles.stopBtnText, { color: tier.color }]}>End Session</Text>
        </Pressable>

        <Pressable
          onPress={() => {
            setIsActive(false);
            cancelAnimation(breathScale);
            cancelAnimation(nebulaOpacity);
            cancelAnimation(ringProgress);
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

// ─── Styles ─────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050505',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },

  // ── Setup Screen ──────────────────────────────────────────
  setupTitle: {
    fontFamily: 'Cinzel',
    fontSize: 28,
    color: '#D4AF37',
    letterSpacing: 6,
  },
  setupSubtitle: {
    fontFamily: 'JetBrainsMono',
    fontSize: 11,
    color: '#555',
    marginTop: 8,
    letterSpacing: 2,
  },
  sectionLabel: {
    fontFamily: 'JetBrainsMono',
    fontSize: 9,
    color: '#555',
    letterSpacing: 3,
    marginTop: 32,
    marginBottom: 10,
    alignSelf: 'flex-start',
  },

  // ── Elegant Rhythm Selector Pills ─────────────────────────
  rhythmRow: {
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 4,
  },
  rhythmPill: {
    borderWidth: 1,
    borderColor: '#333333',
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: '#0D0D0D',
    minWidth: 110,
  },
  rhythmPillSelected: {
    borderColor: '#D4AF37',
    backgroundColor: '#D4AF3715',
  },
  rhythmPillName: {
    fontFamily: 'JetBrainsMono',
    fontSize: 11,
    color: '#6B6B6B',
    letterSpacing: 0.5,
  },
  rhythmPillNameSelected: {
    fontFamily: 'Cinzel',
    color: '#D4AF37',
    fontWeight: '700',
  },
  rhythmPillPattern: {
    fontFamily: 'JetBrainsMono',
    fontSize: 9,
    color: '#444',
    marginTop: 3,
    letterSpacing: 1,
  },
  rhythmPillPatternSelected: {
    color: '#D4AF3780',
  },

  // ── Ritual Priming Pills ──────────────────────────────────
  primePill: {
    borderWidth: 1,
    borderColor: '#333333',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignItems: 'center',
    backgroundColor: '#0D0D0D',
    minWidth: 70,
  },
  primePillSelected: {
    borderColor: '#D4AF37',
    backgroundColor: '#D4AF3715',
  },
  primePillText: {
    fontFamily: 'JetBrainsMono',
    fontSize: 10,
    color: '#6B6B6B',
    letterSpacing: 0.5,
  },
  primePillTextSelected: {
    color: '#D4AF37',
  },

  // ── Timer Display ─────────────────────────────────────────
  timerLabel: {
    fontFamily: 'JetBrainsMono',
    fontSize: 36,
    letterSpacing: 4,
  },
  tierRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  tierDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  tierText: {
    fontFamily: 'JetBrainsMono',
    fontSize: 9,
    letterSpacing: 3,
  },
  cycleLabel: {
    fontFamily: 'JetBrainsMono',
    fontSize: 11,
    color: '#555',
    marginTop: 2,
  },

  // ── SVG Ring Area ─────────────────────────────────────────
  ringArea: {
    width: RING_SIZE + 40,
    height: RING_SIZE + 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 28,
    marginBottom: 8,
  },
  nebulaGlow: {
    position: 'absolute',
    width: RING_SIZE + 30,
    height: RING_SIZE + 30,
    borderRadius: (RING_SIZE + 30) / 2,
  },
  svgRing: {
    // SVG sits exactly in the center
  },
  centerTextContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  phaseText: {
    fontFamily: 'Cinzel',
    fontSize: 20,
    letterSpacing: 4,
  },

  // ── Phase Pills ───────────────────────────────────────────
  phaseRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
  },
  phasePill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1A1A1A',
  },
  phasePillText: {
    fontFamily: 'JetBrainsMono',
    fontSize: 9,
    color: '#444',
    letterSpacing: 1,
  },

  // ── Tier Progress ─────────────────────────────────────────
  tierProgress: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    gap: 4,
  },
  tierStep: {
    alignItems: 'center',
    gap: 3,
  },
  tierStepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  tierStepLabel: {
    fontFamily: 'JetBrainsMono',
    fontSize: 8,
    color: '#333',
    letterSpacing: 1,
  },
  tierLine: {
    width: 32,
    height: 1,
    backgroundColor: '#1A1A1A',
  },

  // ── Controls ──────────────────────────────────────────────
  controls: {
    marginTop: 24,
    alignItems: 'center',
    gap: 10,
  },
  startBtn: {
    backgroundColor: '#D4AF37',
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: 30,
    marginTop: 36,
  },
  startBtnText: {
    color: '#050505',
    fontFamily: 'Cinzel',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 3,
  },
  stopBtn: {
    borderWidth: 1,
    paddingHorizontal: 36,
    paddingVertical: 14,
    borderRadius: 30,
  },
  stopBtnText: {
    fontFamily: 'Cinzel',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 2,
  },
  backBtn: {
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  backBtnText: {
    fontSize: 12,
    color: '#555',
    fontFamily: 'JetBrainsMono',
    letterSpacing: 1,
  },

  // ── Result Screen ─────────────────────────────────────────
  resultCard: {
    backgroundColor: '#0A0A0A',
    borderWidth: 1,
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    maxWidth: 320,
    width: '100%',
  },
  resultTitle: {
    fontFamily: 'Cinzel',
    fontSize: 24,
    letterSpacing: 3,
  },
  resultDuration: {
    fontFamily: 'JetBrainsMono',
    fontSize: 13,
    color: '#555',
    marginTop: 8,
  },
  resultDivider: {
    width: '100%',
    height: 1,
    backgroundColor: '#151515',
    marginVertical: 20,
  },
  resultXp: {
    fontFamily: 'JetBrainsMono',
    fontSize: 20,
    color: '#22C55E',
    fontWeight: '700',
  },
  buffBadge: {
    marginTop: 12,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: 'center',
  },
  buffText: {
    fontFamily: 'JetBrainsMono',
    fontSize: 10,
    letterSpacing: 2,
    fontWeight: '700',
  },
  buffDesc: {
    fontFamily: 'JetBrainsMono',
    fontSize: 10,
    color: '#555',
    marginTop: 4,
  },
  closeBtn: {
    marginTop: 24,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 24,
  },
  closeBtnText: {
    color: '#050505',
    fontFamily: 'Cinzel',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1,
  },
});
