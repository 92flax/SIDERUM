// ============================================================
// ÆONIS – Stasis Mode v5 "Menu Redesign"
// 1) Dropdown for breathing pattern selection
// 2) Toggle slider for ritual priming (hidden when off)
// 3) Breathing circle: grows on Inhale, holds on Hold, shrinks
//    on Exhale – never overlaps controls
// 4) SVG progress ring fills fluidly per phase (linear, not ticking)
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
const RING_SIZE = Math.min(SW * 0.75, 300);
const RING_CENTER = RING_SIZE / 2;
const RING_STROKE = 4;
const RING_RADIUS = RING_SIZE / 2 - RING_STROKE * 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;


const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// ─── Scale constraints (subtle) ─────────────────────────────
const SCALE_BASE = 1.0;
const SCALE_INHALE = 1.1;
const SCALE_EXHALE = 0.93;

// Default breathing patterns
const DEFAULT_RHYTHMS: Array<{
  id: string; name: string; inhale: number; holdIn: number;
  exhale: number; holdOut: number; colorHex: string;
}> = [
  { id: 'box', name: 'Box Breathing', inhale: 4, holdIn: 4, exhale: 4, holdOut: 4, colorHex: '#9CA3AF' },
  { id: 'calm', name: '4-7-8 Calm', inhale: 4, holdIn: 7, exhale: 8, holdOut: 0, colorHex: '#3B82F6' },
  { id: 'power', name: 'Power Breath', inhale: 6, holdIn: 2, exhale: 6, holdOut: 2, colorHex: '#EF4444' },
  { id: 'deep', name: 'Deep Resonance', inhale: 5, holdIn: 5, exhale: 5, holdOut: 5, colorHex: '#D4AF37' },
];

const RITUAL_COLORS: Record<string, string> = {
  lbrp: '#3B82F6',
  mp: '#D4AF37',
  sirp: '#8B5CF6',
  star_ruby: '#EF4444',
  hammer_rite: '#F59E0B',
};

const TIER_BLUE = 5 * 60;
const TIER_GOLD = 15 * 60;

interface StasisModeProps {
  onComplete?: (result: { xpAwarded: number; buffActive: boolean }) => void;
  onClose: () => void;
}

type BreathPhase = 'Inhale' | 'Hold' | 'Exhale' | 'Void';

function getTierInfo(totalSeconds: number) {
  if (totalSeconds >= TIER_GOLD) {
    return { color: '#FFD700', gradStart: '#D4AF37', gradEnd: '#FFD700', label: 'XP BOOST' };
  }
  if (totalSeconds >= TIER_BLUE) {
    return { color: '#3B82F6', gradStart: '#1E40AF', gradEnd: '#60A5FA', label: 'BUFF ACTIVE' };
  }
  return { color: '#9CA3AF', gradStart: '#6B7280', gradEnd: '#D1D5DB', label: 'WARMING UP' };
}

// ─────────────────────────────────────────────────────────────
// Custom Toggle Switch
// ─────────────────────────────────────────────────────────────
function ToggleSwitch({ value, onToggle }: { value: boolean; onToggle: (v: boolean) => void }) {
  return (
    <Pressable
      onPress={() => {
        onToggle(!value);
        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }}
      style={[
        toggleStyles.track,
        value && toggleStyles.trackActive,
      ]}
    >
      <View style={[
        toggleStyles.thumb,
        value && toggleStyles.thumbActive,
      ]} />
    </Pressable>
  );
}

const toggleStyles = StyleSheet.create({
  track: {
    width: 44,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#333',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  trackActive: {
    backgroundColor: '#D4AF3720',
    borderColor: '#D4AF37',
  },
  thumb: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#555',
  },
  thumbActive: {
    backgroundColor: '#D4AF37',
    alignSelf: 'flex-end',
  },
});

export function StasisMode({ onComplete, onClose }: StasisModeProps) {
  useKeepAwake();

  // ─── State ─────────────────────────────────────────────────
  const [isActive, setIsActive] = useState(false);
  const [totalSeconds, setTotalSeconds] = useState(0);
  const [cycleCount, setCycleCount] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [result, setResult] = useState<{ xpAwarded: number; buffActive: boolean } | null>(null);
  const [currentPhase, setCurrentPhase] = useState<BreathPhase>('Inhale');

  // CMS rhythms
  const [cmsRhythms, setCmsRhythms] = useState<SanityBreathingRhythm[]>([]);
  const [selectedRhythmIndex, setSelectedRhythmIndex] = useState(0);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Ritual priming
  const rituals = useRitualStore((s) => s.rituals);
  const [primedRitualId, setPrimedRitualId] = useState<string | null>(null);
  const [primingEnabled, setPrimingEnabled] = useState(false);

  // Setup state
  const [showSetup, setShowSetup] = useState(true);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ─── Reanimated shared values ──────────────────────────────
  const breathScale = useSharedValue(SCALE_BASE);
  const nebulaOpacity = useSharedValue(0.08);
  const phaseTextOpacity = useSharedValue(1);
  const ringProgress = useSharedValue(0);

  // ─── Computed ──────────────────────────────────────────────
  const allRhythms = useMemo(() => {
    const mapped = cmsRhythms.map((r) => ({
      id: r._id, name: r.name, inhale: r.inhale, holdIn: r.holdIn,
      exhale: r.exhale, holdOut: r.holdOut, colorHex: r.colorHex ?? '#9CA3AF',
    }));
    return mapped.length > 0 ? mapped : DEFAULT_RHYTHMS;
  }, [cmsRhythms]);

  const rhythm = allRhythms[selectedRhythmIndex] ?? allRhythms[0];
  const cycleDuration = rhythm.inhale + rhythm.holdIn + rhythm.exhale + rhythm.holdOut;
  const totalMinutes = Math.floor(totalSeconds / 60);
  const tier = getTierInfo(totalSeconds);

  const glowColor = (primingEnabled && primedRitualId)
    ? (RITUAL_COLORS[primedRitualId] ?? rhythm.colorHex)
    : rhythm.colorHex;

  // ─── Fetch CMS rhythms ────────────────────────────────────
  useEffect(() => {
    getBreathingRhythms()
      .then((data) => { if (data.length > 0) setCmsRhythms(data); })
      .catch(() => {});
  }, []);

  // ─── Ring animation helper ────────────────────────────────
  const animateRingForPhase = useCallback((durationSec: number) => {
    ringProgress.value = 0;
    ringProgress.value = withTiming(1, {
      duration: durationSec * 1000,
      easing: Easing.linear,
    });
  }, [ringProgress]);

  // ─── Breathing cycle ──────────────────────────────────────
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

    // INHALE
    breathScale.value = withTiming(SCALE_INHALE, {
      duration: inhale * 1000,
      easing: Easing.inOut(Easing.ease),
    });
    nebulaOpacity.value = withTiming(0.3, {
      duration: inhale * 1000,
      easing: Easing.inOut(Easing.ease),
    });
    fadePhaseText();
    animateRingForPhase(inhale);

    const t1 = inhale * 1000;
    const t2 = t1 + holdIn * 1000;
    const t3 = t2 + exhale * 1000;
    const t4 = t3 + holdOut * 1000;

    // HOLD
    const timer1 = setTimeout(() => {
      runOnJS(setCurrentPhase)('Hold');
      runOnJS(triggerHaptic)();
      fadePhaseText();
      if (holdIn > 0) animateRingForPhase(holdIn);
    }, t1);

    // EXHALE
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

    // VOID
    const timer3 = setTimeout(() => {
      if (holdOut > 0) {
        runOnJS(setCurrentPhase)('Void');
        runOnJS(triggerHaptic)();
        fadePhaseText();
        animateRingForPhase(holdOut);
      }
    }, t3);

    // Next cycle
    const timer4 = setTimeout(() => {
      runOnJS(setCurrentPhase)('Inhale');
      runOnJS(triggerHaptic)();
      runOnJS(setCycleCount)((c: number) => c + 1);
    }, t4);

    return [timer1, timer2, timer3, timer4];
  }, [rhythm, breathScale, nebulaOpacity, phaseTextOpacity, animateRingForPhase]);

  // ─── Main loop ────────────────────────────────────────────
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

  // ─── Timer counter ────────────────────────────────────────
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
  const breathCircleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: breathScale.value }],
  }));

  const nebulaGlowStyle = useAnimatedStyle(() => ({
    opacity: nebulaOpacity.value,
  }));

  const phaseTextStyle = useAnimatedStyle(() => ({
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
    if (!primingEnabled) setPrimedRitualId(null);
    setShowSetup(false);
    setIsActive(true);
    setTotalSeconds(0);
    setCycleCount(0);
    setCurrentPhase('Inhale');
    breathScale.value = SCALE_BASE;
    nebulaOpacity.value = 0.08;
    ringProgress.value = 0;
  }, [primingEnabled]);

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
      <View style={s.container}>
        <View style={[s.resultCard, { borderColor: resTier.color + '30' }]}>
          <Text style={[s.resultTitle, { color: resTier.color }]}>Stasis Complete</Text>
          <Text style={s.resultDuration}>{totalMinutes} min · {cycleCount} cycles</Text>
          <View style={s.resultDivider} />
          <Text style={s.resultXp}>+{result.xpAwarded} Spirit XP</Text>
          {result.buffActive && (
            <View style={[s.buffBadge, { borderColor: '#3B82F630' }]}>
              <Text style={[s.buffText, { color: '#3B82F6' }]}>STASIS BUFF ACTIVE</Text>
              <Text style={s.buffDesc}>×1.15 XP for 60 minutes</Text>
            </View>
          )}
          {totalSeconds >= TIER_GOLD && (
            <View style={[s.buffBadge, { borderColor: '#FFD70030' }]}>
              <Text style={[s.buffText, { color: '#FFD700' }]}>GOLD SESSION</Text>
              <Text style={s.buffDesc}>Deep meditation achieved</Text>
            </View>
          )}
          {primedRitualId && (
            <View style={[s.buffBadge, { borderColor: (RITUAL_COLORS[primedRitualId] ?? '#D4AF37') + '30' }]}>
              <Text style={[s.buffText, { color: RITUAL_COLORS[primedRitualId] ?? '#D4AF37' }]}>PRIMED</Text>
              <Text style={s.buffDesc}>
                Attuned for {rituals.find((r) => r.id === primedRitualId)?.name ?? 'ritual'}
              </Text>
            </View>
          )}
          <Pressable
            onPress={onClose}
            style={({ pressed }) => [
              s.closeBtn, { backgroundColor: resTier.color },
              pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] },
            ]}
          >
            <Text style={s.closeBtnText}>Return</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // ==========================================
  // SETUP SCREEN
  // ==========================================
  if (showSetup && !isActive) {
    return (
      <View style={s.container}>
        <ScrollView
          contentContainerStyle={s.setupScroll}
          showsVerticalScrollIndicator={false}
        >
          <Text style={s.setupTitle}>STASIS</Text>
          <Text style={s.setupSubtitle}>Attune your breath and intent</Text>

          {/* ── Breathing Pattern Dropdown ──────────────────── */}
          <Text style={s.sectionLabel}>BREATHING PATTERN</Text>

          {/* Selected item / trigger */}
          <Pressable
            onPress={() => {
              setDropdownOpen(!dropdownOpen);
              if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
            style={[s.dropdownTrigger]}
          >
            <View style={s.dropdownTriggerLeft}>
              <Text style={s.dropdownSelectedName}>{rhythm.name}</Text>
              <Text style={s.dropdownSelectedPattern}>
                {rhythm.inhale}-{rhythm.holdIn}-{rhythm.exhale}-{rhythm.holdOut}
              </Text>
            </View>
            <Text style={s.dropdownChevron}>{dropdownOpen ? '▲' : '▼'}</Text>
          </Pressable>

          {/* Dropdown options */}
          {dropdownOpen && (
            <View style={s.dropdownList}>
              {allRhythms.map((r, i) => {
                const isSelected = i === selectedRhythmIndex;
                return (
                  <Pressable
                    key={r.id}
                    onPress={() => {
                      setSelectedRhythmIndex(i);
                      setDropdownOpen(false);
                      if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                    style={[
                      s.dropdownItem,
                      isSelected && s.dropdownItemSelected,
                      i === allRhythms.length - 1 && { borderBottomWidth: 0 },
                    ]}
                  >
                    <View style={s.dropdownItemLeft}>
                      <Text style={[
                        s.dropdownItemName,
                        isSelected && s.dropdownItemNameSelected,
                      ]}>{r.name}</Text>
                      <Text style={[
                        s.dropdownItemPattern,
                        isSelected && s.dropdownItemPatternSelected,
                      ]}>
                        {r.inhale}-{r.holdIn}-{r.exhale}-{r.holdOut}
                      </Text>
                    </View>
                    {isSelected && <Text style={s.dropdownCheck}>✦</Text>}
                  </Pressable>
                );
              })}
            </View>
          )}

          {/* ── Ritual Priming Toggle ──────────────────────── */}
          <View style={s.toggleRow}>
            <Text style={s.sectionLabel2}>PRIME FOR RITUAL</Text>
            <ToggleSwitch
              value={primingEnabled}
              onToggle={(v) => {
                setPrimingEnabled(v);
                if (!v) setPrimedRitualId(null);
              }}
            />
          </View>

          {/* Ritual list (only visible when toggle is ON) */}
          {primingEnabled && (
            <View style={s.ritualList}>
              {rituals.length === 0 && (
                <Text style={s.ritualEmpty}>No rituals unlocked yet</Text>
              )}
              {rituals.map((r) => {
                const isSelected = primedRitualId === r.id;
                const color = RITUAL_COLORS[r.id] ?? '#D4AF37';
                return (
                  <Pressable
                    key={r.id}
                    onPress={() => {
                      setPrimedRitualId(isSelected ? null : r.id);
                      if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                    style={[
                      s.ritualItem,
                      isSelected && { borderColor: color, backgroundColor: color + '10' },
                    ]}
                  >
                    <View style={[s.ritualDot, { backgroundColor: color }]} />
                    <Text style={[
                      s.ritualName,
                      isSelected && { color },
                    ]}>{r.name}</Text>
                    {isSelected && <Text style={[s.ritualCheck, { color }]}>✦</Text>}
                  </Pressable>
                );
              })}
            </View>
          )}

          {/* ── Start Button ───────────────────────────────── */}
          <Pressable
            onPress={handleStart}
            style={({ pressed }) => [
              s.startBtn,
              pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] },
            ]}
          >
            <Text style={s.startBtnText}>Begin Stasis</Text>
          </Pressable>

          <Pressable
            onPress={onClose}
            style={({ pressed }) => [s.backBtn, pressed && { opacity: 0.7 }]}
          >
            <Text style={s.backBtnText}>Back</Text>
          </Pressable>
        </ScrollView>
      </View>
    );
  }

  // ==========================================
  // ACTIVE SESSION SCREEN
  // ==========================================
  return (
    <View style={s.container}>
      {/* Timer */}
      <Text style={[s.timerLabel, { color: tier.color }]}>
        {String(Math.floor(totalSeconds / 60)).padStart(2, '0')}:
        {String(totalSeconds % 60).padStart(2, '0')}
      </Text>
      <View style={s.tierRow}>
        <View style={[s.tierDot, { backgroundColor: tier.color }]} />
        <Text style={[s.tierText, { color: tier.color }]}>{tier.label}</Text>
      </View>
      <Text style={s.cycleLabel}>{cycleCount} cycles · {rhythm.name}</Text>

      {/* ── Breathing Circle + SVG Ring ─────────────────────── */}
      <View style={s.ringArea}>
        {/* Nebula glow (does not scale) */}
        <Animated.View style={[s.nebulaGlow, { backgroundColor: glowColor }, nebulaGlowStyle]} />

        {/* Scaled container: SVG ring + inner circle + phase text */}
        <Animated.View style={breathCircleStyle}>
          {/* SVG Progress Ring (outer) */}
          <Svg width={RING_SIZE} height={RING_SIZE}>
            <Defs>
              <LinearGradient id="phaseGrad" x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0" stopColor={tier.gradStart} />
                <Stop offset="1" stopColor={tier.gradEnd} />
              </LinearGradient>
            </Defs>

            {/* Track ring (background) */}
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

          {/* Phase text centered */}
          <View style={s.centerText}>
            <Animated.Text style={[s.phaseText, { color: glowColor }, phaseTextStyle]}>
              {currentPhase}
            </Animated.Text>
          </View>
        </Animated.View>
      </View>

      {/* Phase indicator pills */}
      <View style={s.phaseRow}>
        {(['Inhale', 'Hold', 'Exhale', 'Void'] as BreathPhase[]).map((p) => (
          <View
            key={p}
            style={[
              s.phasePill,
              currentPhase === p && { borderColor: glowColor + '50', backgroundColor: glowColor + '0A' },
            ]}
          >
            <Text style={[
              s.phasePillText,
              currentPhase === p && { color: glowColor },
            ]}>{p}</Text>
          </View>
        ))}
      </View>

      {/* Tier progress */}
      <View style={s.tierProgress}>
        <View style={s.tierStep}>
          <View style={[s.tierStepDot, { backgroundColor: '#9CA3AF' }]} />
          <Text style={[s.tierStepLabel, totalSeconds < TIER_BLUE && { color: '#555' }]}>Silver</Text>
        </View>
        <View style={[s.tierLine, totalSeconds >= TIER_BLUE && { backgroundColor: '#3B82F630' }]} />
        <View style={s.tierStep}>
          <View style={[s.tierStepDot, { backgroundColor: totalSeconds >= TIER_BLUE ? '#3B82F6' : '#222' }]} />
          <Text style={[s.tierStepLabel, totalSeconds >= TIER_BLUE && { color: '#3B82F6' }]}>Blue 5m</Text>
        </View>
        <View style={[s.tierLine, totalSeconds >= TIER_GOLD && { backgroundColor: '#FFD70030' }]} />
        <View style={s.tierStep}>
          <View style={[s.tierStepDot, { backgroundColor: totalSeconds >= TIER_GOLD ? '#FFD700' : '#222' }]} />
          <Text style={[s.tierStepLabel, totalSeconds >= TIER_GOLD && { color: '#FFD700' }]}>Gold 15m</Text>
        </View>
      </View>

      {/* Controls */}
      <View style={s.controls}>
        <Pressable
          onPress={handleStop}
          style={({ pressed }) => [
            s.stopBtn, { borderColor: tier.color + '50' },
            pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] },
          ]}
        >
          <Text style={[s.stopBtnText, { color: tier.color }]}>End Session</Text>
        </Pressable>

        <Pressable
          onPress={() => {
            setIsActive(false);
            cancelAnimation(breathScale);
            cancelAnimation(nebulaOpacity);
            cancelAnimation(ringProgress);
            onClose();
          }}
          style={({ pressed }) => [s.backBtn, pressed && { opacity: 0.7 }]}
        >
          <Text style={s.backBtnText}>Back</Text>
        </Pressable>
      </View>
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────────
const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050505',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },

  // ── Setup ─────────────────────────────────────────────────
  setupScroll: {
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 40,
    width: '100%',
  },
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
  sectionLabel2: {
    fontFamily: 'JetBrainsMono',
    fontSize: 9,
    color: '#555',
    letterSpacing: 3,
  },

  // ── Dropdown ──────────────────────────────────────────────
  dropdownTrigger: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0D0D0D',
    borderWidth: 1,
    borderColor: '#D4AF37',
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  dropdownTriggerLeft: {
    flex: 1,
  },
  dropdownSelectedName: {
    fontFamily: 'Cinzel',
    fontSize: 14,
    color: '#D4AF37',
    fontWeight: '700',
    letterSpacing: 1,
  },
  dropdownSelectedPattern: {
    fontFamily: 'JetBrainsMono',
    fontSize: 10,
    color: '#D4AF3780',
    marginTop: 2,
    letterSpacing: 1,
  },
  dropdownChevron: {
    fontSize: 10,
    color: '#D4AF37',
    marginLeft: 12,
  },
  dropdownList: {
    width: '100%',
    backgroundColor: '#0A0A0A',
    borderWidth: 1,
    borderColor: '#222',
    borderRadius: 14,
    marginTop: 4,
    overflow: 'hidden',
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#151515',
  },
  dropdownItemSelected: {
    backgroundColor: '#D4AF3708',
  },
  dropdownItemLeft: {
    flex: 1,
  },
  dropdownItemName: {
    fontFamily: 'JetBrainsMono',
    fontSize: 12,
    color: '#6B6B6B',
    letterSpacing: 0.5,
  },
  dropdownItemNameSelected: {
    fontFamily: 'Cinzel',
    color: '#D4AF37',
    fontWeight: '700',
  },
  dropdownItemPattern: {
    fontFamily: 'JetBrainsMono',
    fontSize: 9,
    color: '#444',
    marginTop: 2,
    letterSpacing: 1,
  },
  dropdownItemPatternSelected: {
    color: '#D4AF3760',
  },
  dropdownCheck: {
    fontSize: 12,
    color: '#D4AF37',
    marginLeft: 12,
  },

  // ── Toggle Row ────────────────────────────────────────────
  toggleRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 32,
    marginBottom: 10,
  },

  // ── Ritual List ───────────────────────────────────────────
  ritualList: {
    width: '100%',
    gap: 6,
  },
  ritualEmpty: {
    fontFamily: 'JetBrainsMono',
    fontSize: 10,
    color: '#444',
    textAlign: 'center',
    paddingVertical: 12,
  },
  ritualItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0D0D0D',
    borderWidth: 1,
    borderColor: '#222',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  ritualDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 12,
  },
  ritualName: {
    fontFamily: 'JetBrainsMono',
    fontSize: 12,
    color: '#6B6B6B',
    flex: 1,
    letterSpacing: 0.5,
  },
  ritualCheck: {
    fontSize: 12,
    marginLeft: 8,
  },

  // ── Timer ─────────────────────────────────────────────────
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

  // ── Ring Area ─────────────────────────────────────────────
  ringArea: {
    width: RING_SIZE + 40,
    height: RING_SIZE + 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    marginBottom: 4,
  },
  nebulaGlow: {
    position: 'absolute',
    width: RING_SIZE + 20,
    height: RING_SIZE + 20,
    borderRadius: (RING_SIZE + 20) / 2,
  },
  centerText: {
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
    fontSize: 24,
    letterSpacing: 6,
  },

  // ── Phase Pills ───────────────────────────────────────────
  phaseRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
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
    marginTop: 20,
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

  // ── Result ────────────────────────────────────────────────
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
