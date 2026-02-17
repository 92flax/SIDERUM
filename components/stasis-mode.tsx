// ============================================================
// ÆONIS – Stasis Mode "Deepening"
// Circular Phase Ring: Silver (0-5m), Blue (5-15m), Gold (15m+)
// 4-4-4-4 Box Breathing with XP tracking
// On exit: calls trpc.leaderboard.refresh() if authenticated
// ============================================================

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Text, View, StyleSheet, Pressable, Platform, Dimensions, Animated, Easing,
} from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop, G, Text as SvgText } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { useKeepAwake } from 'expo-keep-awake';
import { handleStasisCompletion } from '@/lib/ritual/completion-handler';

const { width: SW } = Dimensions.get('window');
const RING_SIZE = Math.min(SW * 0.72, 300);
const RING_CENTER = RING_SIZE / 2;
const RING_RADIUS = RING_SIZE / 2 - 16;
const RING_STROKE = 8;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

const PHASES = ['Inhale', 'Hold', 'Exhale', 'Hold'] as const;
const PHASE_DURATION = 4; // seconds per phase
const CYCLE_DURATION = PHASE_DURATION * 4; // 16 seconds per cycle

// Phase tier thresholds (in seconds)
const TIER_BLUE = 5 * 60;   // 5 minutes
const TIER_GOLD = 15 * 60;  // 15 minutes

interface StasisModeProps {
  onComplete?: (result: { xpAwarded: number; buffActive: boolean }) => void;
  onClose: () => void;
}

function getTierInfo(totalSeconds: number): { color: string; gradStart: string; gradEnd: string; label: string; glowColor: string } {
  if (totalSeconds >= TIER_GOLD) {
    return { color: '#FFD700', gradStart: '#D4AF37', gradEnd: '#FFD700', label: 'XP BOOST', glowColor: '#FFD70030' };
  }
  if (totalSeconds >= TIER_BLUE) {
    return { color: '#3B82F6', gradStart: '#1E40AF', gradEnd: '#60A5FA', label: 'BUFF ACTIVE', glowColor: '#3B82F620' };
  }
  return { color: '#9CA3AF', gradStart: '#6B7280', gradEnd: '#D1D5DB', label: 'WARMING UP', glowColor: '#9CA3AF10' };
}

export function StasisMode({ onComplete, onClose }: StasisModeProps) {
  useKeepAwake();

  const [isActive, setIsActive] = useState(false);
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [countdown, setCountdown] = useState(PHASE_DURATION);
  const [totalSeconds, setTotalSeconds] = useState(0);
  const [cycleCount, setCycleCount] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [result, setResult] = useState<{ xpAwarded: number; buffActive: boolean } | null>(null);

  const breathAnim = useRef(new Animated.Value(0.65)).current;
  const glowAnim = useRef(new Animated.Value(0.2)).current;
  const ringProgress = useRef(new Animated.Value(0)).current;
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const currentPhase = PHASES[phaseIndex];
  const totalMinutes = Math.floor(totalSeconds / 60);
  const tier = getTierInfo(totalSeconds);

  // Breathing animation per phase
  useEffect(() => {
    if (!isActive) return;

    const isExpand = phaseIndex === 0; // Inhale
    const isShrink = phaseIndex === 2; // Exhale

    if (isExpand) {
      Animated.timing(breathAnim, {
        toValue: 1.0,
        duration: PHASE_DURATION * 1000,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }).start();
      Animated.timing(glowAnim, {
        toValue: 0.7,
        duration: PHASE_DURATION * 1000,
        useNativeDriver: true,
      }).start();
    } else if (isShrink) {
      Animated.timing(breathAnim, {
        toValue: 0.65,
        duration: PHASE_DURATION * 1000,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }).start();
      Animated.timing(glowAnim, {
        toValue: 0.2,
        duration: PHASE_DURATION * 1000,
        useNativeDriver: true,
      }).start();
    }
  }, [phaseIndex, isActive]);

  // Timer logic
  useEffect(() => {
    if (!isActive) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    intervalRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          setPhaseIndex(pi => {
            const next = (pi + 1) % 4;
            if (next === 0) setCycleCount(c => c + 1);
            if (Platform.OS !== 'web') {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }
            return next;
          });
          return PHASE_DURATION;
        }
        return prev - 1;
      });
      setTotalSeconds(s => s + 1);
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isActive]);

  // Animate ring progress within each cycle (0→1 per 16-second cycle)
  useEffect(() => {
    if (!isActive) return;
    // Progress within current cycle: phaseIndex * 4 + (4 - countdown)
    const cycleProgress = (phaseIndex * PHASE_DURATION + (PHASE_DURATION - countdown)) / CYCLE_DURATION;
    Animated.timing(ringProgress, {
      toValue: cycleProgress,
      duration: 200,
      useNativeDriver: false,
      easing: Easing.linear,
    }).start();
  }, [countdown, phaseIndex, isActive]);

  const handleStart = useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    setIsActive(true);
    setPhaseIndex(0);
    setCountdown(PHASE_DURATION);
    setTotalSeconds(0);
    setCycleCount(0);
    ringProgress.setValue(0);
  }, []);

  const handleStop = useCallback(async () => {
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    setIsActive(false);

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

  // ===== RESULT SCREEN =====
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

  // ===== MAIN TIMER SCREEN =====
  // Compute ring dash offset (animated)
  const ringDashOffset = ringProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [RING_CIRCUMFERENCE, 0],
  });

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
      <Text style={styles.cycleLabel}>{cycleCount} cycles</Text>

      {/* Circular Phase Ring */}
      <View style={styles.ringContainer}>
        {/* Glow behind ring */}
        <Animated.View
          style={[
            styles.ringGlow,
            {
              backgroundColor: tier.glowColor,
              opacity: glowAnim,
              transform: [{ scale: breathAnim }],
            },
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

          {/* Progress ring (animated) */}
          <AnimatedCircle
            cx={RING_CENTER}
            cy={RING_CENTER}
            r={RING_RADIUS}
            stroke="url(#ringGrad)"
            strokeWidth={RING_STROKE}
            fill="none"
            strokeDasharray={`${RING_CIRCUMFERENCE}`}
            strokeDashoffset={ringDashOffset}
            strokeLinecap="round"
            transform={`rotate(-90 ${RING_CENTER} ${RING_CENTER})`}
          />

          {/* Phase markers at 4 positions */}
          {[0, 0.25, 0.5, 0.75].map((frac, i) => {
            const angle = frac * 2 * Math.PI - Math.PI / 2;
            const mx = RING_CENTER + RING_RADIUS * Math.cos(angle);
            const my = RING_CENTER + RING_RADIUS * Math.sin(angle);
            const isCurrentPhase = i === phaseIndex && isActive;
            return (
              <G key={i}>
                <Circle
                  cx={mx}
                  cy={my}
                  r={isCurrentPhase ? 6 : 4}
                  fill={isCurrentPhase ? tier.color : '#333'}
                />
              </G>
            );
          })}
        </Svg>

        {/* Center content (breathing) */}
        <Animated.View
          style={[
            styles.centerContent,
            { transform: [{ scale: breathAnim }] },
          ]}
        >
          <Text style={[styles.phaseText, { color: tier.color }]}>
            {isActive ? currentPhase : 'Ready'}
          </Text>
          <Text style={styles.countdownText}>
            {isActive ? countdown : '4-4-4-4'}
          </Text>
        </Animated.View>
      </View>

      {/* Phase indicator pills */}
      {isActive && (
        <View style={styles.phaseRow}>
          {PHASES.map((p, i) => (
            <View
              key={p + i}
              style={[
                styles.phasePill,
                i === phaseIndex && { borderColor: tier.color, backgroundColor: tier.color + '10' },
              ]}
            >
              <Text style={[
                styles.phaseLabel,
                i === phaseIndex && { color: tier.color },
              ]}>
                {p}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Tier progress indicators */}
      {isActive && (
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
      )}

      {/* Controls */}
      <View style={styles.controls}>
        {!isActive ? (
          <Pressable
            onPress={handleStart}
            style={({ pressed }) => [styles.startBtn, pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] }]}
          >
            <Text style={styles.startBtnText}>Begin Stasis</Text>
          </Pressable>
        ) : (
          <Pressable
            onPress={handleStop}
            style={({ pressed }) => [styles.stopBtn, { borderColor: tier.color }, pressed && { opacity: 0.8 }]}
          >
            <Text style={[styles.stopBtnText, { color: tier.color }]}>End Session</Text>
          </Pressable>
        )}

        <Pressable
          onPress={onClose}
          style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.7 }]}
        >
          <Text style={styles.backBtnText}>Back</Text>
        </Pressable>
      </View>
    </View>
  );
}

// Animated SVG Circle
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const styles = StyleSheet.create({
  container: {
    flex: 1, backgroundColor: '#050505', alignItems: 'center',
    justifyContent: 'center', padding: 24,
  },
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
    width: RING_SIZE + 40, height: RING_SIZE + 40,
    alignItems: 'center', justifyContent: 'center', marginTop: 24,
  },
  ringGlow: {
    position: 'absolute',
    width: RING_SIZE + 30,
    height: RING_SIZE + 30,
    borderRadius: (RING_SIZE + 30) / 2,
  },
  centerContent: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  phaseText: {
    fontFamily: 'Cinzel', fontSize: 20, letterSpacing: 4,
  },
  countdownText: {
    fontFamily: 'JetBrainsMono', fontSize: 44, color: '#E0E0E0', marginTop: 6,
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
    borderRadius: 30,
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
