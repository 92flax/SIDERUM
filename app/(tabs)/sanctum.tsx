import { useEffect, useState, useRef, useCallback } from 'react';
import { Text, View, StyleSheet, FlatList, Platform, Pressable } from 'react-native';
import { Magnetometer, Accelerometer } from 'expo-sensors';
import * as Haptics from 'expo-haptics';
import { ScreenContainer } from '@/components/screen-container';
import { useRitualStore } from '@/lib/ritual/store';
import { calculateHeading, isAlignedToDirection, detectTracingMotion } from '@/lib/compass/sensor-fusion';
import { Ritual, RitualStep } from '@/lib/ritual/types';

export default function SanctumScreen() {
  const rituals = useRitualStore((s) => s.rituals);
  const currentRitual = useRitualStore((s) => s.currentRitual);
  const currentStepIndex = useRitualStore((s) => s.currentStepIndex);
  const playerState = useRitualStore((s) => s.playerState);
  const isDirectionLocked = useRitualStore((s) => s.isDirectionLocked);
  const loadRituals = useRitualStore((s) => s.loadRituals);
  const selectRitual = useRitualStore((s) => s.selectRitual);
  const startRitual = useRitualStore((s) => s.startRitual);
  const nextStep = useRitualStore((s) => s.nextStep);
  const prevStep = useRitualStore((s) => s.prevStep);
  const resetRitual = useRitualStore((s) => s.resetRitual);
  const setDirectionLocked = useRitualStore((s) => s.setDirectionLocked);
  const setTracingDetected = useRitualStore((s) => s.setTracingDetected);

  const [heading, setHeading] = useState(0);
  const accHistoryRef = useRef<Array<{ x: number; y: number; z: number; timestamp: number }>>([]);
  const alignedRef = useRef(false);

  useEffect(() => {
    loadRituals();
  }, []);

  // Sensor subscriptions for compass lock and tracing
  useEffect(() => {
    if (Platform.OS === 'web') return;
    if (playerState !== 'compass_lock' && playerState !== 'tracing') return;

    let magSub: any;
    let accSub: any;

    Magnetometer.setUpdateInterval(100);
    magSub = Magnetometer.addListener((data) => {
      const h = calculateHeading(data.x, data.y);
      setHeading(h);

      // Check compass alignment
      const step = useRitualStore.getState().getCurrentStep();
      if (step?.compass_direction && !alignedRef.current) {
        const aligned = isAlignedToDirection(h, step.compass_direction);
        if (aligned) {
          alignedRef.current = true;
          setDirectionLocked(true);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      }
    });

    if (playerState === 'tracing') {
      Accelerometer.setUpdateInterval(50);
      accSub = Accelerometer.addListener((data) => {
        accHistoryRef.current.push({ ...data, timestamp: Date.now() });
        if (accHistoryRef.current.length > 30) {
          accHistoryRef.current = accHistoryRef.current.slice(-30);
        }
        if (detectTracingMotion(accHistoryRef.current)) {
          setTracingDetected(true);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          accHistoryRef.current = [];
        }
      });
    }

    return () => {
      magSub?.remove();
      accSub?.remove();
      alignedRef.current = false;
    };
  }, [playerState, currentStepIndex]);

  const handleNextStep = useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    alignedRef.current = false;
    nextStep();
  }, [nextStep]);

  const handlePrevStep = useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    alignedRef.current = false;
    prevStep();
  }, [prevStep]);

  // Ritual Selection Screen
  if (!currentRitual || playerState === 'idle') {
    return (
      <ScreenContainer>
        <View style={styles.container}>
          <Text style={styles.title}>Sanctum</Text>
          <Text style={styles.subtitle}>Ritual Engine</Text>

          {currentRitual && playerState === 'idle' && (
            <View style={styles.selectedRitual}>
              <Text style={styles.ritualName}>{currentRitual.name}</Text>
              <Text style={styles.ritualDesc}>{currentRitual.description}</Text>
              <Text style={styles.ritualMeta}>
                {currentRitual.tradition} · {currentRitual.steps.length} steps
              </Text>
              <Pressable
                onPress={() => {
                  if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  startRitual();
                }}
                style={({ pressed }) => [styles.startBtn, pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] }]}
              >
                <Text style={styles.startBtnText}>Begin Ritual</Text>
              </Pressable>
            </View>
          )}

          <Text style={styles.sectionTitle}>Available Rituals</Text>
          <FlatList
            data={rituals}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => {
                  if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  selectRitual(item.id);
                }}
                style={({ pressed }) => [styles.ritualCard, pressed && { opacity: 0.7 }]}
              >
                <Text style={styles.ritualCardName}>{item.name}</Text>
                <Text style={styles.ritualCardDesc}>{item.description}</Text>
                <Text style={styles.ritualCardMeta}>
                  {item.tradition} · {item.steps.length} steps
                </Text>
              </Pressable>
            )}
            contentContainerStyle={styles.ritualList}
          />
        </View>
      </ScreenContainer>
    );
  }

  // Ritual Completed Screen
  if (playerState === 'completed') {
    return (
      <ScreenContainer>
        <View style={styles.completedContainer}>
          <Text style={styles.completedSymbol}>✦</Text>
          <Text style={styles.completedTitle}>Ritual Complete</Text>
          <Text style={styles.completedName}>{currentRitual.name}</Text>
          <Text style={styles.completedText}>
            All {currentRitual.steps.length} steps have been performed.
          </Text>
          <Pressable
            onPress={() => {
              if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              resetRitual();
            }}
            style={({ pressed }) => [styles.startBtn, pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] }]}
          >
            <Text style={styles.startBtnText}>Return to Sanctum</Text>
          </Pressable>
        </View>
      </ScreenContainer>
    );
  }

  // Active Ritual Player
  const currentStep = currentRitual.steps[currentStepIndex];
  const progress = ((currentStepIndex + 1) / currentRitual.steps.length) * 100;
  const needsCompass = !!currentStep?.compass_direction;
  const needsTracing = currentStep?.action_type === 'TRACE';

  const actionTypeColors: Record<string, string> = {
    MOVEMENT: '#3B82F6',
    VIBRATION: '#D4AF37',
    VISUALIZATION: '#8B5CF6',
    GESTURE: '#22C55E',
    TRACE: '#EF4444',
  };

  const actionColor = actionTypeColors[currentStep?.action_type ?? 'MOVEMENT'] ?? '#6B6B6B';

  return (
    <ScreenContainer>
      <View style={styles.playerContainer}>
        {/* Progress bar */}
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>

        {/* Step counter */}
        <Text style={styles.stepCounter}>
          Step {currentStepIndex + 1} of {currentRitual.steps.length}
        </Text>

        {/* Compass direction indicator */}
        {needsCompass && (
          <View style={styles.compassLock}>
            <Text style={[styles.compassDirection, isDirectionLocked && styles.compassAligned]}>
              {isDirectionLocked ? '✓' : '⟳'} Face {currentStep.compass_direction}
            </Text>
            {!isDirectionLocked && (
              <Text style={styles.compassHint}>
                {Platform.OS === 'web'
                  ? 'Tap to simulate alignment'
                  : `Heading: ${heading.toFixed(0)}° — Align to ${currentStep.compass_direction}`}
              </Text>
            )}
            {Platform.OS === 'web' && !isDirectionLocked && (
              <Pressable
                onPress={() => setDirectionLocked(true)}
                style={({ pressed }) => [styles.simBtn, pressed && { opacity: 0.7 }]}
              >
                <Text style={styles.simBtnText}>Simulate Alignment</Text>
              </Pressable>
            )}
          </View>
        )}

        {/* Tracing indicator */}
        {needsTracing && isDirectionLocked && (
          <View style={styles.tracingBox}>
            <Text style={styles.tracingText}>
              {Platform.OS === 'web' ? 'Tap to simulate trace' : 'Trace the shape with your device'}
            </Text>
            {Platform.OS === 'web' && (
              <Pressable
                onPress={() => setTracingDetected(true)}
                style={({ pressed }) => [styles.simBtn, pressed && { opacity: 0.7 }]}
              >
                <Text style={styles.simBtnText}>Simulate Trace</Text>
              </Pressable>
            )}
          </View>
        )}

        {/* Action type badge */}
        <View style={[styles.actionBadge, { borderColor: actionColor }]}>
          <Text style={[styles.actionType, { color: actionColor }]}>
            {currentStep?.action_type}
          </Text>
        </View>

        {/* Main instruction */}
        <View style={styles.instructionBox}>
          <Text style={styles.instructionText}>
            {currentStep?.instruction_text}
          </Text>
        </View>

        {/* Vibration word */}
        {currentStep?.audio_vibration && (
          <View style={styles.vibrationBox}>
            <Text style={styles.vibrationWord}>
              {currentStep.audio_vibration.word}
            </Text>
            <Text style={styles.vibrationPhonetic}>
              {currentStep.audio_vibration.phonetic}
            </Text>
          </View>
        )}

        {/* AR Element indicator */}
        {currentStep?.ar_element && (
          <View style={[styles.arBadge, { borderColor: currentStep.ar_element.color_hex }]}>
            <Text style={[styles.arText, { color: currentStep.ar_element.color_hex }]}>
              ◇ {currentStep.ar_element.shape}
            </Text>
          </View>
        )}

        {/* Navigation buttons */}
        <View style={styles.navRow}>
          <Pressable
            onPress={handlePrevStep}
            disabled={currentStepIndex === 0}
            style={({ pressed }) => [
              styles.navBtn,
              currentStepIndex === 0 && styles.navBtnDisabled,
              pressed && { opacity: 0.7 },
            ]}
          >
            <Text style={[styles.navBtnText, currentStepIndex === 0 && styles.navBtnTextDisabled]}>
              ‹ Previous
            </Text>
          </Pressable>

          <Pressable
            onPress={handleNextStep}
            disabled={
              (playerState === 'compass_lock' && !isDirectionLocked) ||
              (playerState === 'tracing' && !useRitualStore.getState().isTracingDetected)
            }
            style={({ pressed }) => [
              styles.navBtn,
              styles.navBtnNext,
              ((playerState === 'compass_lock' && !isDirectionLocked) ||
                (playerState === 'tracing' && !useRitualStore.getState().isTracingDetected)) && styles.navBtnDisabled,
              pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] },
            ]}
          >
            <Text style={styles.navBtnNextText}>
              {currentStepIndex === currentRitual.steps.length - 1 ? 'Complete' : 'Next ›'}
            </Text>
          </Pressable>
        </View>

        {/* Exit button */}
        <Pressable
          onPress={() => {
            resetRitual();
          }}
          style={({ pressed }) => [styles.exitBtn, pressed && { opacity: 0.7 }]}
        >
          <Text style={styles.exitBtnText}>Exit Ritual</Text>
        </Pressable>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  title: {
    fontFamily: 'Cinzel',
    fontSize: 28,
    color: '#D4AF37',
    textAlign: 'center',
    letterSpacing: 4,
  },
  subtitle: {
    fontSize: 13,
    color: '#6B6B6B',
    textAlign: 'center',
    marginTop: 4,
  },
  sectionTitle: {
    fontFamily: 'Cinzel',
    fontSize: 16,
    color: '#E0E0E0',
    marginTop: 24,
    marginBottom: 8,
    letterSpacing: 2,
  },
  selectedRitual: {
    backgroundColor: '#0D0D0D',
    borderWidth: 1,
    borderColor: '#D4AF3740',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
  },
  ritualName: {
    fontFamily: 'Cinzel',
    fontSize: 16,
    color: '#D4AF37',
  },
  ritualDesc: {
    fontSize: 13,
    color: '#E0E0E0',
    marginTop: 8,
    lineHeight: 20,
  },
  ritualMeta: {
    fontFamily: 'JetBrainsMono',
    fontSize: 11,
    color: '#6B6B6B',
    marginTop: 8,
  },
  startBtn: {
    backgroundColor: '#D4AF37',
    borderRadius: 24,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  startBtnText: {
    color: '#050505',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 1,
  },
  ritualList: {
    paddingBottom: 100,
  },
  ritualCard: {
    backgroundColor: '#0D0D0D',
    borderWidth: 1,
    borderColor: '#1A1A1A',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
  },
  ritualCardName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#E0E0E0',
  },
  ritualCardDesc: {
    fontSize: 12,
    color: '#6B6B6B',
    marginTop: 4,
    lineHeight: 18,
  },
  ritualCardMeta: {
    fontFamily: 'JetBrainsMono',
    fontSize: 10,
    color: '#6B6B6B',
    marginTop: 6,
  },
  // Player styles
  playerContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  progressBar: {
    height: 3,
    backgroundColor: '#1A1A1A',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#D4AF37',
    borderRadius: 2,
  },
  stepCounter: {
    fontFamily: 'JetBrainsMono',
    fontSize: 12,
    color: '#6B6B6B',
    textAlign: 'center',
    marginTop: 8,
  },
  compassLock: {
    backgroundColor: '#0055A415',
    borderWidth: 1,
    borderColor: '#0055A440',
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
    alignItems: 'center',
  },
  compassDirection: {
    fontFamily: 'Cinzel',
    fontSize: 20,
    color: '#0055A4',
  },
  compassAligned: {
    color: '#22C55E',
  },
  compassHint: {
    fontFamily: 'JetBrainsMono',
    fontSize: 11,
    color: '#6B6B6B',
    marginTop: 4,
  },
  simBtn: {
    backgroundColor: '#1A1A1A',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginTop: 8,
  },
  simBtnText: {
    fontSize: 12,
    color: '#E0E0E0',
  },
  tracingBox: {
    backgroundColor: '#EF444415',
    borderWidth: 1,
    borderColor: '#EF444440',
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
    alignItems: 'center',
  },
  tracingText: {
    fontSize: 13,
    color: '#EF4444',
  },
  actionBadge: {
    alignSelf: 'center',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginTop: 16,
  },
  actionType: {
    fontFamily: 'JetBrainsMono',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },
  instructionBox: {
    backgroundColor: '#0D0D0D',
    borderWidth: 1,
    borderColor: '#1A1A1A',
    borderRadius: 12,
    padding: 20,
    marginTop: 16,
    minHeight: 100,
    justifyContent: 'center',
  },
  instructionText: {
    fontSize: 16,
    color: '#E0E0E0',
    lineHeight: 26,
    textAlign: 'center',
  },
  vibrationBox: {
    backgroundColor: '#D4AF3710',
    borderWidth: 1,
    borderColor: '#D4AF3730',
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
    alignItems: 'center',
  },
  vibrationWord: {
    fontFamily: 'Cinzel',
    fontSize: 24,
    color: '#D4AF37',
    letterSpacing: 2,
  },
  vibrationPhonetic: {
    fontFamily: 'JetBrainsMono',
    fontSize: 13,
    color: '#6B6B6B',
    marginTop: 4,
  },
  arBadge: {
    alignSelf: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 6,
    marginTop: 12,
  },
  arText: {
    fontSize: 13,
    fontWeight: '600',
  },
  navRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
    gap: 12,
  },
  navBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#1A1A1A',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  navBtnDisabled: {
    opacity: 0.3,
  },
  navBtnText: {
    fontSize: 14,
    color: '#E0E0E0',
  },
  navBtnTextDisabled: {
    color: '#6B6B6B',
  },
  navBtnNext: {
    backgroundColor: '#D4AF37',
    borderColor: '#D4AF37',
  },
  navBtnNextText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#050505',
  },
  exitBtn: {
    alignSelf: 'center',
    marginTop: 16,
    paddingVertical: 8,
  },
  exitBtnText: {
    fontSize: 13,
    color: '#6B6B6B',
  },
  // Completed
  completedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  completedSymbol: {
    fontSize: 48,
    color: '#D4AF37',
  },
  completedTitle: {
    fontFamily: 'Cinzel',
    fontSize: 24,
    color: '#D4AF37',
    marginTop: 16,
    letterSpacing: 3,
  },
  completedName: {
    fontSize: 15,
    color: '#E0E0E0',
    marginTop: 8,
    textAlign: 'center',
  },
  completedText: {
    fontSize: 13,
    color: '#6B6B6B',
    marginTop: 8,
    textAlign: 'center',
  },
});
