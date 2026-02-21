// ============================================================
// ÆONIS – Stasis Mode v3 "Breathing Circle Restoration"
// Prominent 250px breathing ring, fluid 60fps reanimated scale
// animation (1.3x inhale, 0.8x exhale), nebula glow, CMS
// breathing rhythms, ritual priming, haptics
// ============================================================

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Text, View, StyleSheet, Pressable, Platform, Dimensions, ScrollView,
} from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle,
  withTiming, withSequence, Easing, runOnJS,
  cancelAnimation,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useKeepAwake } from 'expo-keep-awake';
import { handleStasisCompletion } from '@/lib/ritual/completion-handler';
import { getBreathingRhythms, type SanityBreathingRhythm } from '@/lib/cms/sanity';
import { useRitualStore } from '@/lib/ritual/store';

const { width: SW } = Dimensions.get('window');

// ─── Central Breathing Circle Dimensions ────────────────────
const CIRCLE_SIZE = 250;
const CIRCLE_BORDER = 2;

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
  // Breathing circle scale: 1.3 on inhale, 0.8 on exhale
  const breathScale = useSharedValue(0.8);
  // Nebula glow opacity: synced with breath (bright on inhale, dim on exhale)
  const nebulaOpacity = useSharedValue(0.1);
  // Phase text fade
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
  const glowColor = primedRitualId
    ? (RITUAL_COLORS[primedRitualId] ?? rhythm.colorHex)
    : rhythm.colorHex;

  // ─── Fetch CMS rhythms ────────────────────────────────────
  useEffect(() => {
    getBreathingRhythms()
      .then((data) => { if (data.length > 0) setCmsRhythms(data); })
      .catch(() => { /* use defaults */ });
  }, []);

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
        withTiming(0, { duration: 120 }),
        withTiming(1, { duration: 250 }),
      );
    };

    // Phase 1: INHALE → scale up to 1.3, nebula brightens
    breathScale.value = withTiming(1.3, {
      duration: inhale * 1000,
      easing: Easing.inOut(Easing.ease),
    });
    nebulaOpacity.value = withTiming(0.55, {
      duration: inhale * 1000,
      easing: Easing.inOut(Easing.ease),
    });
    fadePhaseText();

    // Schedule phase transitions via setTimeout (JS thread)
    const t1 = inhale * 1000;
    const t2 = t1 + holdIn * 1000;
    const t3 = t2 + exhale * 1000;
    const t4 = t3 + holdOut * 1000;

    // Phase 2: HOLD IN
    const timer1 = setTimeout(() => {
      runOnJS(setCurrentPhase)('Hold');
      runOnJS(triggerHaptic)();
      fadePhaseText();
    }, t1);

    // Phase 3: EXHALE → scale down to 0.8, nebula dims
    const timer2 = setTimeout(() => {
      runOnJS(setCurrentPhase)('Exhale');
      runOnJS(triggerHaptic)();
      breathScale.value = withTiming(0.8, {
        duration: exhale * 1000,
        easing: Easing.inOut(Easing.ease),
      });
      nebulaOpacity.value = withTiming(0.1, {
        duration: exhale * 1000,
        easing: Easing.inOut(Easing.ease),
      });
      fadePhaseText();
    }, t2);

    // Phase 4: VOID (hold out)
    const timer3 = setTimeout(() => {
      if (holdOut > 0) {
        runOnJS(setCurrentPhase)('Void');
        runOnJS(triggerHaptic)();
        fadePhaseText();
      }
    }, t3);

    // Next cycle start
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

  // ─── Animated styles ──────────────────────────────────────

  // Central breathing circle: fluid scale 0.8 → 1.3
  const breathCircleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: breathScale.value }],
  }));

  // Nebula glow: opacity synced with breath, also scales with breath
  const nebulaGlowStyle = useAnimatedStyle(() => ({
    opacity: nebulaOpacity.value,
    transform: [{ scale: breathScale.value }],
  }));

  // Phase text fade
  const phaseTextStyle = useAnimatedStyle(() => ({
    opacity: phaseTextOpacity.value,
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
    breathScale.value = 0.8;
    nebulaOpacity.value = 0.1;
  }, []);

  const handleStop = useCallback(async () => {
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    setIsActive(false);
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

        {/* Breathing Rhythm Picker */}
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
                  styles.rhythmCard,
                  isSelected && { borderColor: r.colorHex + '60', backgroundColor: r.colorHex + '08' },
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
        <Text style={[styles.sectionLabel, { marginTop: 24 }]}>PRIME FOR RITUAL</Text>
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
              styles.primeCard,
              !primedRitualId && { borderColor: '#6B6B6B40', backgroundColor: '#6B6B6B08' },
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
                  isSelected && { borderColor: color + '60', backgroundColor: color + '08' },
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
  const phaseLabel =
    currentPhase === 'Inhale' ? 'Inhale' :
    currentPhase === 'Hold' ? 'Hold' :
    currentPhase === 'Exhale' ? 'Exhale' : 'Void';

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

      {/* ─── Central Breathing Circle Area ─────────────────── */}
      <View style={styles.breathArea}>
        {/* Layer 1: Nebula Glow (behind everything) */}
        <Animated.View style={[styles.nebulaOuter, { backgroundColor: glowColor }, nebulaGlowStyle]} />
        <Animated.View style={[styles.nebulaMiddle, { backgroundColor: glowColor }, nebulaGlowStyle]} />
        <Animated.View style={[styles.nebulaInner, { backgroundColor: glowColor }, nebulaGlowStyle]} />

        {/* Layer 2: The Breathing Ring (250px, thin border, scales 0.8→1.3) */}
        <Animated.View style={[styles.breathRing, { borderColor: glowColor + '80' }, breathCircleStyle]}>
          {/* Inner subtle fill for depth */}
          <View style={[styles.breathRingInnerFill, { backgroundColor: glowColor + '06' }]} />

          {/* Phase text centered inside ring */}
          <Animated.Text style={[styles.phaseText, { color: glowColor }, phaseTextStyle]}>
            {phaseLabel}
          </Animated.Text>
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
            { borderColor: tier.color + '60' },
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
  rhythmRow: {
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 4,
  },
  rhythmCard: {
    borderWidth: 1,
    borderColor: '#1A1A1A',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#0A0A0A',
    minWidth: 100,
  },
  rhythmDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginBottom: 6,
  },
  rhythmName: {
    fontFamily: 'Cinzel',
    fontSize: 10,
    color: '#555',
    letterSpacing: 1,
  },
  rhythmPattern: {
    fontFamily: 'JetBrainsMono',
    fontSize: 9,
    color: '#333',
    marginTop: 3,
  },
  primeCard: {
    borderWidth: 1,
    borderColor: '#1A1A1A',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: '#0A0A0A',
    minWidth: 80,
  },
  primeName: {
    fontFamily: 'JetBrainsMono',
    fontSize: 10,
    color: '#555',
    letterSpacing: 1,
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

  // ── Central Breathing Circle ──────────────────────────────
  breathArea: {
    width: CIRCLE_SIZE + 80,
    height: CIRCLE_SIZE + 80,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 28,
    marginBottom: 8,
  },

  // Nebula glow layers (concentric circles behind the ring)
  nebulaOuter: {
    position: 'absolute',
    width: CIRCLE_SIZE + 70,
    height: CIRCLE_SIZE + 70,
    borderRadius: (CIRCLE_SIZE + 70) / 2,
  },
  nebulaMiddle: {
    position: 'absolute',
    width: CIRCLE_SIZE + 40,
    height: CIRCLE_SIZE + 40,
    borderRadius: (CIRCLE_SIZE + 40) / 2,
  },
  nebulaInner: {
    position: 'absolute',
    width: CIRCLE_SIZE + 15,
    height: CIRCLE_SIZE + 15,
    borderRadius: (CIRCLE_SIZE + 15) / 2,
  },

  // The breathing ring itself: 250px, thin border, NO solid background
  breathRing: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    borderWidth: CIRCLE_BORDER,
    alignItems: 'center',
    justifyContent: 'center',
    // No backgroundColor – just the ring border
  },
  breathRingInnerFill: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: CIRCLE_SIZE / 2,
  },

  // Phase text inside the ring
  phaseText: {
    fontFamily: 'Cinzel',
    fontSize: 22,
    letterSpacing: 5,
    textTransform: 'uppercase',
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
    borderColor: '#151515',
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
    backgroundColor: '#151515',
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
