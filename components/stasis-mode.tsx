// ============================================================
// ÆONIS – Stasis Mode (Minimalist Breathing Timer)
// 4-4-4-4 Box Breathing with XP tracking
// ============================================================

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Text, View, StyleSheet, Pressable, Platform, Dimensions, Animated, Easing,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useKeepAwake } from 'expo-keep-awake';
import { handleStasisCompletion } from '@/lib/ritual/completion-handler';

const { width: SW } = Dimensions.get('window');
const CIRCLE_SIZE = Math.min(SW * 0.65, 280);

const PHASES = ['Inhale', 'Hold', 'Exhale', 'Hold'] as const;
const PHASE_DURATION = 4; // seconds per phase

interface StasisModeProps {
  onComplete?: (result: { xpAwarded: number; buffActive: boolean }) => void;
  onClose: () => void;
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

  const breathAnim = useRef(new Animated.Value(0.6)).current;
  const glowAnim = useRef(new Animated.Value(0.3)).current;
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const currentPhase = PHASES[phaseIndex];
  const totalMinutes = Math.floor(totalSeconds / 60);

  // Breathing animation
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
        toValue: 0.8,
        duration: PHASE_DURATION * 1000,
        useNativeDriver: true,
      }).start();
    } else if (isShrink) {
      Animated.timing(breathAnim, {
        toValue: 0.6,
        duration: PHASE_DURATION * 1000,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }).start();
      Animated.timing(glowAnim, {
        toValue: 0.3,
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
          // Move to next phase
          setPhaseIndex(pi => {
            const next = (pi + 1) % 4;
            if (next === 0) setCycleCount(c => c + 1);

            // Haptic on phase change
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

  const handleStart = useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    setIsActive(true);
    setPhaseIndex(0);
    setCountdown(PHASE_DURATION);
    setTotalSeconds(0);
    setCycleCount(0);
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

  if (showResult && result) {
    return (
      <View style={styles.container}>
        <View style={styles.resultCard}>
          <Text style={styles.resultTitle}>Stasis Complete</Text>
          <Text style={styles.resultDuration}>{totalMinutes} min · {cycleCount} cycles</Text>
          <View style={styles.resultDivider} />
          <Text style={styles.resultXp}>+{result.xpAwarded} Spirit XP</Text>
          {result.buffActive && (
            <View style={styles.buffBadge}>
              <Text style={styles.buffText}>STASIS BUFF ACTIVE</Text>
              <Text style={styles.buffDesc}>×1.15 XP for 60 minutes</Text>
            </View>
          )}
          <Pressable
            onPress={onClose}
            style={({ pressed }) => [styles.closeBtn, pressed && { opacity: 0.8 }]}
          >
            <Text style={styles.closeBtnText}>Return</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Timer display */}
      <Text style={styles.timerLabel}>
        {String(Math.floor(totalSeconds / 60)).padStart(2, '0')}:{String(totalSeconds % 60).padStart(2, '0')}
      </Text>
      <Text style={styles.cycleLabel}>{cycleCount} cycles</Text>

      {/* Breathing circle */}
      <View style={styles.circleContainer}>
        <Animated.View
          style={[
            styles.glowCircle,
            {
              opacity: glowAnim,
              transform: [{ scale: breathAnim }],
            },
          ]}
        />
        <Animated.View
          style={[
            styles.breathCircle,
            {
              transform: [{ scale: breathAnim }],
            },
          ]}
        >
          <Text style={styles.phaseText}>{isActive ? currentPhase : 'Ready'}</Text>
          <Text style={styles.countdownText}>
            {isActive ? countdown : '4-4-4-4'}
          </Text>
        </Animated.View>
      </View>

      {/* Phase indicator dots */}
      {isActive && (
        <View style={styles.phaseRow}>
          {PHASES.map((p, i) => (
            <View
              key={p + i}
              style={[
                styles.phaseDot,
                i === phaseIndex && styles.phaseDotActive,
              ]}
            >
              <Text style={[
                styles.phaseLabel,
                i === phaseIndex && styles.phaseLabelActive,
              ]}>
                {p}
              </Text>
            </View>
          ))}
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
            style={({ pressed }) => [styles.stopBtn, pressed && { opacity: 0.8 }]}
          >
            <Text style={styles.stopBtnText}>End Session</Text>
          </Pressable>
        )}

        <Pressable
          onPress={onClose}
          style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.7 }]}
        >
          <Text style={styles.backBtnText}>Back</Text>
        </Pressable>
      </View>

      {/* Buff reminder */}
      {totalSeconds >= 300 && isActive && (
        <View style={styles.buffReminder}>
          <Text style={styles.buffReminderText}>Stasis Buff threshold reached (5 min)</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1, backgroundColor: '#050505', alignItems: 'center',
    justifyContent: 'center', padding: 24,
  },
  timerLabel: {
    fontFamily: 'JetBrainsMono', fontSize: 36, color: '#D4AF37',
    letterSpacing: 4,
  },
  cycleLabel: {
    fontFamily: 'JetBrainsMono', fontSize: 12, color: '#6B6B6B',
    marginTop: 4,
  },
  circleContainer: {
    width: CIRCLE_SIZE + 40, height: CIRCLE_SIZE + 40,
    alignItems: 'center', justifyContent: 'center', marginTop: 32,
  },
  glowCircle: {
    position: 'absolute', width: CIRCLE_SIZE + 30, height: CIRCLE_SIZE + 30,
    borderRadius: (CIRCLE_SIZE + 30) / 2, backgroundColor: '#D4AF3715',
  },
  breathCircle: {
    width: CIRCLE_SIZE, height: CIRCLE_SIZE, borderRadius: CIRCLE_SIZE / 2,
    borderWidth: 2, borderColor: '#D4AF3740', backgroundColor: '#0D0D0D',
    alignItems: 'center', justifyContent: 'center',
  },
  phaseText: {
    fontFamily: 'Cinzel', fontSize: 22, color: '#D4AF37', letterSpacing: 4,
  },
  countdownText: {
    fontFamily: 'JetBrainsMono', fontSize: 48, color: '#E0E0E0', marginTop: 8,
  },
  phaseRow: {
    flexDirection: 'row', gap: 16, marginTop: 24,
  },
  phaseDot: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16,
    borderWidth: 1, borderColor: '#1A1A1A',
  },
  phaseDotActive: {
    borderColor: '#D4AF37', backgroundColor: '#D4AF3710',
  },
  phaseLabel: {
    fontFamily: 'JetBrainsMono', fontSize: 10, color: '#6B6B6B',
    letterSpacing: 1,
  },
  phaseLabelActive: { color: '#D4AF37' },
  controls: {
    marginTop: 32, alignItems: 'center', gap: 12,
  },
  startBtn: {
    backgroundColor: '#D4AF37', paddingHorizontal: 40, paddingVertical: 16,
    borderRadius: 30,
  },
  startBtnText: {
    color: '#050505', fontSize: 16, fontWeight: '700', letterSpacing: 2,
  },
  stopBtn: {
    borderWidth: 1, borderColor: '#EF4444', paddingHorizontal: 40,
    paddingVertical: 16, borderRadius: 30,
  },
  stopBtnText: {
    color: '#EF4444', fontSize: 16, fontWeight: '700', letterSpacing: 2,
  },
  backBtn: {
    paddingHorizontal: 24, paddingVertical: 10,
  },
  backBtnText: {
    fontSize: 13, color: '#6B6B6B',
  },
  buffReminder: {
    position: 'absolute', bottom: 40, backgroundColor: '#22C55E15',
    borderWidth: 1, borderColor: '#22C55E30', borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 8,
  },
  buffReminderText: {
    fontFamily: 'JetBrainsMono', fontSize: 10, color: '#22C55E',
    letterSpacing: 1,
  },
  // Result screen
  resultCard: {
    backgroundColor: '#0D0D0D', borderWidth: 1, borderColor: '#D4AF3730',
    borderRadius: 20, padding: 32, alignItems: 'center', maxWidth: 320,
    width: '100%',
  },
  resultTitle: {
    fontFamily: 'Cinzel', fontSize: 24, color: '#D4AF37', letterSpacing: 3,
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
    marginTop: 16, backgroundColor: '#D4AF3710', borderWidth: 1,
    borderColor: '#D4AF3730', borderRadius: 12, paddingHorizontal: 16,
    paddingVertical: 10, alignItems: 'center',
  },
  buffText: {
    fontFamily: 'JetBrainsMono', fontSize: 11, color: '#D4AF37',
    letterSpacing: 2, fontWeight: '700',
  },
  buffDesc: {
    fontSize: 11, color: '#6B6B6B', marginTop: 4,
  },
  closeBtn: {
    marginTop: 24, backgroundColor: '#D4AF37', paddingHorizontal: 32,
    paddingVertical: 14, borderRadius: 24,
  },
  closeBtnText: {
    color: '#050505', fontSize: 14, fontWeight: '700', letterSpacing: 1,
  },
});
