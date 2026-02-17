// ============================================================
// ÆONIS – Sanctum Hub (Digital Grimoire)
// Tile-Hub layout: [Stasis], [Rituals], [Library], [Events]
// Includes ritual player and catalog sub-views
// ============================================================

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Text, View, StyleSheet, FlatList, Platform, Pressable, ScrollView, Dimensions, Alert, Modal } from 'react-native';
import { Magnetometer, Accelerometer } from 'expo-sensors';
import * as Haptics from 'expo-haptics';
import { ScreenContainer } from '@/components/screen-container';
import { HoloPad } from '@/components/holo-pad';
import { StasisMode } from '@/components/stasis-mode';
import { useRitualStore } from '@/lib/ritual/store';
import { calculateHeading, isAlignedToDirection, detectTracingMotion } from '@/lib/compass/sensor-fusion';
import { Ritual, RitualStep, RitualIntention, RitualTradition } from '@/lib/ritual/types';
import { useAstroStore } from '@/lib/astro/store';
import { ELDER_FUTHARK, generateBindruneData } from '@/lib/runes/futhark';
import { useRuneWalletStore } from '@/lib/store/rune-wallet';
import { handleRitualCompletion } from '@/lib/ritual/completion-handler';
import { RITUAL_INSTRUCTIONS_MD } from '@/lib/content/local-fallback';
import { useRouter } from 'expo-router';

const { width: SW, height: SH } = Dimensions.get('window');

type HubView = 'hub' | 'stasis' | 'catalog' | 'library' | 'player';

export default function SanctumScreen() {
  const rituals = useRitualStore((s) => s.rituals);
  const currentRitual = useRitualStore((s) => s.currentRitual);
  const currentStepIndex = useRitualStore((s) => s.currentStepIndex);
  const playerState = useRitualStore((s) => s.playerState);
  const isDirectionLocked = useRitualStore((s) => s.isDirectionLocked);
  const intent = useRitualStore((s) => s.intent);
  const loadRituals = useRitualStore((s) => s.loadRituals);
  const selectRitual = useRitualStore((s) => s.selectRitual);
  const setIntent = useRitualStore((s) => s.setIntent);
  const startRitual = useRitualStore((s) => s.startRitual);
  const nextStep = useRitualStore((s) => s.nextStep);
  const prevStep = useRitualStore((s) => s.prevStep);
  const resetRitual = useRitualStore((s) => s.resetRitual);
  const setDirectionLocked = useRitualStore((s) => s.setDirectionLocked);
  const setTracingDetected = useRitualStore((s) => s.setTracingDetected);
  const router = useRouter();

  const [hubView, setHubView] = useState<HubView>('hub');
  const [heading, setHeading] = useState(0);
  const accHistoryRef = useRef<Array<{ x: number; y: number; z: number; timestamp: number }>>([]);
  const alignedRef = useRef(false);

  // Catalog filters
  const [filterIntention, setFilterIntention] = useState<RitualIntention | 'All'>('All');
  const [filterTradition, setFilterTradition] = useState<RitualTradition | 'All'>('All');
  const [selectedLibraryRitual, setSelectedLibraryRitual] = useState<string | null>(null);
  const [completionResult, setCompletionResult] = useState<{ xpAwarded: number; leveledUp: boolean } | null>(null);
  const chartData = useAstroStore((s) => s.chartData);

  const filteredRituals = useMemo(() => {
    return rituals.filter(r => {
      if (filterIntention !== 'All' && (r as any).intention !== filterIntention) return false;
      if (filterTradition !== 'All' && (r as any).traditionTag !== filterTradition) return false;
      return true;
    });
  }, [rituals, filterIntention, filterTradition]);

  const INTENTIONS: Array<RitualIntention | 'All'> = ['All', 'Protection', 'Wealth', 'Healing', 'Wisdom', 'Power', 'Purification'];
  const TRADITIONS: Array<RitualTradition | 'All'> = ['All', 'Golden Dawn', 'Thelema', 'Norse', 'Hermetic'];

  useEffect(() => { loadRituals(); }, []);

  // Auto-switch to player when ritual starts
  useEffect(() => {
    if (currentRitual && playerState !== 'idle' && playerState !== 'completed') {
      setHubView('player');
    }
  }, [currentRitual, playerState]);

  // Sensor subscriptions for compass lock and tracing
  useEffect(() => {
    if (Platform.OS === ('web' as string)) return;
    if (playerState !== 'compass_lock' && playerState !== 'tracing') return;

    let magSub: any;
    let accSub: any;

    Magnetometer.setUpdateInterval(100);
    magSub = Magnetometer.addListener((data) => {
      const h = calculateHeading(data.x, data.y);
      setHeading(h);
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
    if (Platform.OS !== ('web' as string)) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    alignedRef.current = false;
    nextStep();
  }, [nextStep]);

  const handlePrevStep = useCallback(() => {
    if (Platform.OS !== ('web' as string)) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    alignedRef.current = false;
    prevStep();
  }, [prevStep]);

  const handleRitualComplete = useCallback(async () => {
    if (!currentRitual) return;
    try {
      const result = await handleRitualCompletion(currentRitual.id);
      setCompletionResult({ xpAwarded: result.xpAwarded, leveledUp: result.leveledUp });
    } catch {}
  }, [currentRitual]);

  const isLBRP = currentRitual?.id === 'lbrp' || currentRitual?.name?.toLowerCase().includes('lesser banishing');
  const activeRune = useRuneWalletStore((s) => s.getActiveRune());

  const sigilData = useMemo(() => {
    if (activeRune) {
      const runeObjs = activeRune.runeNames
        .map(n => ELDER_FUTHARK.find(r => r.name === n))
        .filter(Boolean);
      if (runeObjs.length > 0) {
        return generateBindruneData(runeObjs as any, 200, 300);
      }
    }
    const protectionRunes = ELDER_FUTHARK.filter(r =>
      r.keywords.some(k => ['protection', 'strength', 'power'].includes(k))
    ).slice(0, 3);
    if (protectionRunes.length === 0) return null;
    return generateBindruneData(protectionRunes, 200, 300);
  }, [activeRune]);

  const handleTilePress = useCallback((view: HubView) => {
    if (Platform.OS !== ('web' as string)) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setHubView(view);
  }, []);

  // ==========================================
  // STASIS MODE
  // ==========================================
  if (hubView === 'stasis') {
    return (
      <StasisMode
        onComplete={(result) => {
          // Result handled by StasisMode internally
        }}
        onClose={() => setHubView('hub')}
      />
    );
  }

  // ==========================================
  // LIBRARY VIEW
  // ==========================================
  if (hubView === 'library') {
    return (
      <ScreenContainer>
        <View style={styles.container}>
          <Pressable
            onPress={() => setHubView('hub')}
            style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.7 }]}
          >
            <Text style={styles.backBtnText}>‹ Sanctum</Text>
          </Pressable>
          <Text style={styles.title}>Library</Text>
          <Text style={styles.subtitle}>Ritual Knowledge Base</Text>

          <FlatList
            data={rituals}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => {
                  if (Platform.OS !== ('web' as string)) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setSelectedLibraryRitual(item.id);
                }}
                style={({ pressed }) => [styles.libraryCard, pressed && { opacity: 0.7 }]}
              >
                <Text style={styles.libraryCardName}>{item.name}</Text>
                <Text style={styles.libraryCardDesc}>{item.description}</Text>
                <Text style={styles.libraryCardMeta}>{item.tradition} · {item.steps.length} steps</Text>
              </Pressable>
            )}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />

          {/* Library Detail Modal */}
          <Modal visible={!!selectedLibraryRitual} transparent animationType="slide" onRequestClose={() => setSelectedLibraryRitual(null)}>
            <Pressable style={styles.modalOverlay} onPress={() => setSelectedLibraryRitual(null)}>
              <Pressable style={styles.modalContent} onPress={() => {}}>
                <View style={styles.modalHandle} />
                <ScrollView showsVerticalScrollIndicator={false}>
                  <Text style={styles.modalTitle}>
                    {rituals.find(r => r.id === selectedLibraryRitual)?.name ?? 'Ritual'}
                  </Text>
                  <Text style={styles.libraryMd}>
                    {RITUAL_INSTRUCTIONS_MD[selectedLibraryRitual ?? ''] ?? 'No extended instructions available for this ritual.'}
                  </Text>
                </ScrollView>
                <Pressable
                  onPress={() => setSelectedLibraryRitual(null)}
                  style={({ pressed }) => [styles.modalCloseBtn, pressed && { opacity: 0.8 }]}
                >
                  <Text style={styles.modalCloseBtnText}>Close</Text>
                </Pressable>
              </Pressable>
            </Pressable>
          </Modal>
        </View>
      </ScreenContainer>
    );
  }

  // ==========================================
  // RITUAL CATALOG
  // ==========================================
  if (hubView === 'catalog') {
    return (
      <ScreenContainer>
        <View style={styles.container}>
          <Pressable
            onPress={() => {
              if (currentRitual) resetRitual();
              setHubView('hub');
            }}
            style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.7 }]}
          >
            <Text style={styles.backBtnText}>‹ Sanctum</Text>
          </Pressable>
          <Text style={styles.title}>Rituals</Text>
          <Text style={styles.subtitle}>Select & Perform</Text>

          {/* Selected Ritual with Intent Toggle */}
          {currentRitual && playerState === 'idle' && (
            <View style={styles.selectedRitual}>
              <Text style={styles.ritualName}>{currentRitual.name}</Text>
              <Text style={styles.ritualDesc}>{currentRitual.description}</Text>
              <Text style={styles.ritualMeta}>
                {currentRitual.tradition} · {currentRitual.steps.length} steps
              </Text>

              {/* Intent Toggle */}
              <View style={styles.intentSection}>
                <Text style={styles.intentLabel}>RITUAL INTENT</Text>
                <View style={styles.intentToggle}>
                  <Pressable
                    onPress={() => {
                      if (Platform.OS !== ('web' as string)) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      setIntent('BANISH');
                    }}
                    style={({ pressed }) => [
                      styles.intentBtn,
                      intent === 'BANISH' && styles.intentBtnActiveBanish,
                      pressed && { opacity: 0.8 },
                    ]}
                  >
                    <Text style={[styles.intentBtnText, intent === 'BANISH' && styles.intentBtnTextActive]}>
                      ↑ BANISH
                    </Text>
                    <Text style={[styles.intentBtnSub, intent === 'BANISH' && { color: '#00CCCC' }]}>
                      Earth → Spirit
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => {
                      if (Platform.OS !== ('web' as string)) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      setIntent('INVOKE');
                    }}
                    style={({ pressed }) => [
                      styles.intentBtn,
                      intent === 'INVOKE' && styles.intentBtnActiveInvoke,
                      pressed && { opacity: 0.8 },
                    ]}
                  >
                    <Text style={[styles.intentBtnText, intent === 'INVOKE' && styles.intentBtnTextActive]}>
                      ↓ INVOKE
                    </Text>
                    <Text style={[styles.intentBtnSub, intent === 'INVOKE' && { color: '#CC8800' }]}>
                      Spirit → Earth
                    </Text>
                  </Pressable>
                </View>
                <Text style={styles.intentHint}>
                  {intent === 'BANISH'
                    ? 'Banishing: Clears unwanted energies. Start from Lower-Left (Earth) vertex.'
                    : 'Invoking: Draws energy inward. Start from Top (Spirit) vertex.'}
                </Text>
              </View>

              <Pressable
                onPress={() => {
                  if (Platform.OS !== ('web' as string)) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  startRitual();
                }}
                style={({ pressed }) => [styles.startBtn, pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] }]}
              >
                <Text style={styles.startBtnText}>Begin Ritual</Text>
              </Pressable>
            </View>
          )}

          {/* Catalog Filters */}
          <Text style={styles.sectionTitle}>Catalog</Text>

          <Text style={styles.filterLabel}>INTENTION</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
            {INTENTIONS.map((i) => (
              <Pressable
                key={i}
                onPress={() => {
                  if (Platform.OS !== ('web' as string)) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setFilterIntention(i);
                }}
                style={({ pressed }) => [
                  styles.filterChip,
                  filterIntention === i && styles.filterChipActive,
                  pressed && { opacity: 0.7 },
                ]}
              >
                <Text style={[styles.filterChipText, filterIntention === i && styles.filterChipTextActive]}>{i}</Text>
              </Pressable>
            ))}
          </ScrollView>

          <Text style={styles.filterLabel}>TRADITION</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
            {TRADITIONS.map((t) => (
              <Pressable
                key={t}
                onPress={() => {
                  if (Platform.OS !== ('web' as string)) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setFilterTradition(t);
                }}
                style={({ pressed }) => [
                  styles.filterChip,
                  filterTradition === t && styles.filterChipActive,
                  pressed && { opacity: 0.7 },
                ]}
              >
                <Text style={[styles.filterChipText, filterTradition === t && styles.filterChipTextActive]}>{t}</Text>
              </Pressable>
            ))}
          </ScrollView>

          <Text style={styles.sectionTitle}>Available ({filteredRituals.length})</Text>
          <FlatList
            data={filteredRituals}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => {
              const intention = (item as any).intention || 'General';
              const tradition = (item as any).traditionTag || item.tradition;
              return (
                <Pressable
                  onPress={() => {
                    if (Platform.OS !== ('web' as string)) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    selectRitual(item.id);
                  }}
                  style={({ pressed }) => [styles.ritualCard, pressed && { opacity: 0.7 }]}
                >
                  <Text style={styles.ritualCardName}>{item.name}</Text>
                  <Text style={styles.ritualCardDesc}>{item.description}</Text>
                  <View style={styles.ritualTagRow}>
                    <View style={styles.ritualTag}>
                      <Text style={styles.ritualTagText}>{intention}</Text>
                    </View>
                    <View style={[styles.ritualTag, styles.ritualTagTradition]}>
                      <Text style={styles.ritualTagText}>{tradition}</Text>
                    </View>
                    <Text style={styles.ritualCardMeta}>{item.steps.length} steps</Text>
                  </View>
                </Pressable>
              );
            }}
            contentContainerStyle={styles.listContent}
          />
        </View>
      </ScreenContainer>
    );
  }

  // ==========================================
  // RITUAL COMPLETED
  // ==========================================
  if (hubView === 'player' && playerState === 'completed') {
    return (
      <ScreenContainer>
        <View style={styles.completedContainer}>
          <Text style={styles.completedSymbol}>✦</Text>
          <Text style={styles.completedTitle}>Ritual Complete</Text>
          <Text style={styles.completedName}>{currentRitual?.name}</Text>
          <Text style={styles.completedIntent}>
            Intent: {intent === 'BANISH' ? '↑ Banishing' : '↓ Invoking'}
          </Text>
          <Text style={styles.completedText}>
            All {currentRitual?.steps.length} steps have been performed.
          </Text>
          {completionResult && (
            <View style={styles.xpReward}>
              <Text style={styles.xpRewardText}>+{completionResult.xpAwarded} XP</Text>
              {completionResult.leveledUp && (
                <Text style={styles.levelUpText}>LEVEL UP!</Text>
              )}
            </View>
          )}
          <Pressable
            onPress={() => {
              if (Platform.OS !== ('web' as string)) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              resetRitual();
              setCompletionResult(null);
              setHubView('hub');
            }}
            style={({ pressed }) => [styles.startBtn, pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] }]}
          >
            <Text style={styles.startBtnText}>Return to Sanctum</Text>
          </Pressable>
        </View>
      </ScreenContainer>
    );
  }

  // ==========================================
  // ACTIVE RITUAL PLAYER
  // ==========================================
  if (hubView === 'player' && currentRitual && playerState !== 'idle') {
    const currentStep = currentRitual.steps[currentStepIndex];
    const progress = ((currentStepIndex + 1) / currentRitual.steps.length) * 100;
    const needsCompass = !!currentStep?.compass_direction;
    const hasTracingShape = !!currentStep?.ar_element;
    const isTracingStep = currentStep?.action_type === 'TRACE';
    const isTracingDetected = useRitualStore.getState().isTracingDetected;
    const nextStepData = currentRitual.steps[currentStepIndex + 1];
    const nextIsTrace = nextStepData?.action_type === 'TRACE';
    const showHoloPad = hasTracingShape || isTracingStep || nextIsTrace;
    const shapeData = currentStep?.ar_element || nextStepData?.ar_element;

    const actionTypeColors: Record<string, string> = {
      MOVEMENT: '#3B82F6', VIBRATION: '#D4AF37', VISUALIZATION: '#8B5CF6',
      GESTURE: '#22C55E', TRACE: '#EF4444',
    };
    const actionColor = actionTypeColors[currentStep?.action_type ?? 'MOVEMENT'] ?? '#6B6B6B';
    const isStepIncomplete = (
      (playerState === 'compass_lock' && !isDirectionLocked) ||
      (playerState === 'tracing' && !isTracingDetected)
    );

    // Trigger completion handler when reaching completed state
    if (currentStepIndex === currentRitual.steps.length - 1 && !completionResult) {
      handleRitualComplete();
    }

    return (
      <ScreenContainer>
        <View style={styles.playerContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>

          <View style={styles.intentIndicator}>
            <Text style={[styles.intentIndicatorText, { color: intent === 'BANISH' ? '#00FFFF' : '#D4AF37' }]}>
              {intent === 'BANISH' ? '↑ BANISH' : '↓ INVOKE'}
            </Text>
            <Text style={styles.stepCounter}>
              Step {currentStepIndex + 1} / {currentRitual.steps.length}
            </Text>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.playerContent}>
            {/* Instruction Section */}
            <View style={styles.instructionSection}>
              {needsCompass && (
                <View style={styles.compassLock}>
                  <Text style={[styles.compassDirection, isDirectionLocked && styles.compassAligned]}>
                    {isDirectionLocked ? '✓' : '⟳'} Face {currentStep.compass_direction}
                  </Text>
                  {!isDirectionLocked && (
                    <Text style={styles.compassHint}>
                      {Platform.OS === ('web' as string)
                        ? 'Tap to simulate alignment'
                        : `Heading: ${heading.toFixed(0)}° — Align to ${currentStep.compass_direction}`}
                    </Text>
                  )}
                  {Platform.OS === ('web' as string) && !isDirectionLocked && (
                    <Pressable
                      onPress={() => setDirectionLocked(true)}
                      style={({ pressed }) => [styles.simBtn, pressed && { opacity: 0.7 }]}
                    >
                      <Text style={styles.simBtnText}>Simulate Alignment</Text>
                    </Pressable>
                  )}
                </View>
              )}

              <View style={[styles.actionBadge, { borderColor: actionColor }]}>
                <Text style={[styles.actionType, { color: actionColor }]}>
                  {currentStep?.action_type}
                </Text>
              </View>

              <View style={styles.instructionBox}>
                <Text style={styles.instructionText}>
                  {currentStep?.instruction_text}
                </Text>
              </View>

              {currentStep?.audio_vibration && (
                <View style={styles.vibrationBox}>
                  <Text style={styles.vibrationWord}>{currentStep.audio_vibration.word}</Text>
                  <Text style={styles.vibrationPhonetic}>{currentStep.audio_vibration.phonetic}</Text>
                </View>
              )}
            </View>

            {/* Holo-Pad */}
            {showHoloPad && shapeData && (
              <View style={styles.holoPadSection}>
                <View style={styles.holoPadHeader}>
                  <Text style={styles.holoPadLabel}>Holo-Pad</Text>
                  {activeRune && (
                    <View style={styles.activeTalismanBadge}>
                      <Text style={styles.activeTalismanText}>⟡ {activeRune.name}</Text>
                    </View>
                  )}
                </View>
                <HoloPad
                  shape={shapeData.shape}
                  colorHex={shapeData.color_hex}
                  isTraced={isTracingStep ? isTracingDetected : false}
                  onSimulateTrace={isTracingStep ? () => setTracingDetected(true) : undefined}
                  intent={intent}
                  isLBRP={isLBRP}
                  sigilLines={sigilData?.lines}
                  sigilPaths={sigilData?.paths}
                  sigilWidth={sigilData?.width}
                  sigilHeight={sigilData?.height}
                />
              </View>
            )}
          </ScrollView>

          {/* Navigation */}
          <View style={styles.navRow}>
            <Pressable
              onPress={handlePrevStep}
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
              onPress={() => {
                if (isStepIncomplete) {
                  if (Platform.OS !== ('web' as string)) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                  Alert.alert('Step Incomplete', 'You may proceed, but the current step is not fully completed.', [
                    { text: 'Stay', style: 'cancel' },
                    { text: 'Proceed Anyway', onPress: handleNextStep },
                  ]);
                } else {
                  handleNextStep();
                }
              }}
              style={({ pressed }) => [
                styles.navBtn, styles.navBtnNext,
                isStepIncomplete && { opacity: 0.6 },
                pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] },
              ]}
            >
              <Text style={styles.navBtnNextText}>
                {currentStepIndex === currentRitual.steps.length - 1 ? 'Complete' : 'Next ›'}
              </Text>
            </Pressable>
          </View>

          <Pressable
            onPress={() => {
              resetRitual();
              setCompletionResult(null);
              setHubView('catalog');
            }}
            style={({ pressed }) => [styles.exitBtn, pressed && { opacity: 0.7 }]}
          >
            <Text style={styles.exitBtnText}>Exit Ritual</Text>
          </Pressable>
        </View>
      </ScreenContainer>
    );
  }

  // ==========================================
  // HUB VIEW (Tile Layout)
  // ==========================================
  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.hubContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Sanctum</Text>
        <Text style={styles.subtitle}>Your Sacred Space</Text>

        {/* Hub Tiles */}
        <View style={styles.tileGrid}>
          {/* Stasis Tile */}
          <Pressable
            onPress={() => handleTilePress('stasis')}
            style={({ pressed }) => [styles.tile, styles.tileStasis, pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] }]}
          >
            <Text style={styles.tileIcon}>◎</Text>
            <Text style={styles.tileTitle}>Stasis</Text>
            <Text style={styles.tileDesc}>Meditation & Breathing</Text>
            <Text style={styles.tileMeta}>4-4-4-4 Box Breathing</Text>
          </Pressable>

          {/* Rituals Tile */}
          <Pressable
            onPress={() => handleTilePress('catalog')}
            style={({ pressed }) => [styles.tile, styles.tileRituals, pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] }]}
          >
            <Text style={styles.tileIcon}>⟐</Text>
            <Text style={styles.tileTitle}>Rituals</Text>
            <Text style={styles.tileDesc}>Perform & Practice</Text>
            <Text style={styles.tileMeta}>{rituals.length} available</Text>
          </Pressable>

          {/* Library Tile */}
          <Pressable
            onPress={() => handleTilePress('library')}
            style={({ pressed }) => [styles.tile, styles.tileLibrary, pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] }]}
          >
            <Text style={styles.tileIcon}>📖</Text>
            <Text style={styles.tileTitle}>Library</Text>
            <Text style={styles.tileDesc}>Knowledge Base</Text>
            <Text style={styles.tileMeta}>Study ritual texts</Text>
          </Pressable>

          {/* Forge/Runes Tile */}
          <Pressable
            onPress={() => {
              if (Platform.OS !== ('web' as string)) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              router.push('/(tabs)/runes');
            }}
            style={({ pressed }) => [styles.tile, styles.tileForge, pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] }]}
          >
            <Text style={styles.tileIcon}>✦</Text>
            <Text style={styles.tileTitle}>Forge</Text>
            <Text style={styles.tileDesc}>Create Bindrunes</Text>
            <Text style={styles.tileMeta}>Rune Workshop</Text>
          </Pressable>
        </View>

        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickRow}>
          <Pressable
            onPress={() => {
              if (Platform.OS !== ('web' as string)) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push('/(tabs)/wallet');
            }}
            style={({ pressed }) => [styles.quickBtn, pressed && { opacity: 0.7 }]}
          >
            <Text style={styles.quickBtnIcon}>⟡</Text>
            <Text style={styles.quickBtnText}>Wallet</Text>
          </Pressable>
          <Pressable
            onPress={() => {
              if (Platform.OS !== ('web' as string)) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push('/(tabs)/settings');
            }}
            style={({ pressed }) => [styles.quickBtn, pressed && { opacity: 0.7 }]}
          >
            <Text style={styles.quickBtnIcon}>⚙</Text>
            <Text style={styles.quickBtnText}>Settings</Text>
          </Pressable>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16, paddingTop: 8 },
  hubContent: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 100 },
  title: { fontFamily: 'Cinzel', fontSize: 28, color: '#D4AF37', textAlign: 'center', letterSpacing: 4 },
  subtitle: { fontSize: 13, color: '#6B6B6B', textAlign: 'center', marginTop: 4 },
  sectionTitle: { fontFamily: 'Cinzel', fontSize: 14, color: '#E0E0E0', marginTop: 24, marginBottom: 8, letterSpacing: 2 },

  // Back button
  backBtn: { paddingVertical: 8, paddingRight: 16, alignSelf: 'flex-start' },
  backBtnText: { fontSize: 15, color: '#D4AF37', letterSpacing: 1 },

  // Hub Tiles
  tileGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 20 },
  tile: {
    width: (SW - 42) / 2, backgroundColor: '#0D0D0D', borderWidth: 1,
    borderRadius: 16, padding: 16, minHeight: 130,
  },
  tileStasis: { borderColor: '#22C55E30' },
  tileRituals: { borderColor: '#D4AF3730' },
  tileLibrary: { borderColor: '#3B82F630' },
  tileForge: { borderColor: '#8B5CF630' },
  tileIcon: { fontSize: 28, color: '#D4AF37', marginBottom: 8 },
  tileTitle: { fontFamily: 'Cinzel', fontSize: 16, color: '#E0E0E0', letterSpacing: 2 },
  tileDesc: { fontSize: 12, color: '#6B6B6B', marginTop: 4 },
  tileMeta: { fontFamily: 'JetBrainsMono', fontSize: 9, color: '#4A4A4A', marginTop: 8, letterSpacing: 1 },

  // Quick Actions
  quickRow: { flexDirection: 'row', gap: 10 },
  quickBtn: {
    flex: 1, backgroundColor: '#0D0D0D', borderWidth: 1, borderColor: '#1A1A1A',
    borderRadius: 12, paddingVertical: 14, alignItems: 'center', flexDirection: 'row',
    justifyContent: 'center', gap: 8,
  },
  quickBtnIcon: { fontSize: 16, color: '#D4AF37' },
  quickBtnText: { fontSize: 13, color: '#E0E0E0' },

  // Selected Ritual
  selectedRitual: {
    backgroundColor: '#0D0D0D', borderWidth: 1, borderColor: '#D4AF3740',
    borderRadius: 12, padding: 16, marginTop: 16,
  },
  ritualName: { fontFamily: 'Cinzel', fontSize: 16, color: '#D4AF37' },
  ritualDesc: { fontSize: 13, color: '#E0E0E0', marginTop: 8, lineHeight: 20 },
  ritualMeta: { fontFamily: 'JetBrainsMono', fontSize: 11, color: '#6B6B6B', marginTop: 8 },

  // Intent Toggle
  intentSection: { marginTop: 16 },
  intentLabel: {
    fontFamily: 'JetBrainsMono', fontSize: 10, color: '#6B6B6B',
    letterSpacing: 2, textAlign: 'center', marginBottom: 8,
  },
  intentToggle: { flexDirection: 'row', gap: 8 },
  intentBtn: {
    flex: 1, borderWidth: 1, borderColor: '#1A1A1A', borderRadius: 12,
    paddingVertical: 12, alignItems: 'center', backgroundColor: '#080808',
  },
  intentBtnActiveBanish: { borderColor: '#00FFFF60', backgroundColor: '#00FFFF08' },
  intentBtnActiveInvoke: { borderColor: '#D4AF3760', backgroundColor: '#D4AF3708' },
  intentBtnText: { fontSize: 14, fontWeight: '700', color: '#6B6B6B', letterSpacing: 1 },
  intentBtnTextActive: { color: '#E0E0E0' },
  intentBtnSub: { fontSize: 10, color: '#6B6B6B', marginTop: 2 },
  intentHint: {
    fontSize: 11, color: '#6B6B6B', textAlign: 'center', marginTop: 8,
    fontStyle: 'italic', lineHeight: 16,
  },

  startBtn: {
    backgroundColor: '#D4AF37', borderRadius: 24, paddingVertical: 12,
    alignItems: 'center', marginTop: 16,
  },
  startBtnText: { color: '#050505', fontSize: 15, fontWeight: '700', letterSpacing: 1 },

  // Catalog
  filterLabel: {
    fontFamily: 'JetBrainsMono', fontSize: 10, color: '#6B6B6B',
    letterSpacing: 2, marginTop: 12, marginBottom: 4,
  },
  filterRow: { flexDirection: 'row', marginBottom: 4 },
  filterChip: {
    borderWidth: 1, borderColor: '#333333', borderRadius: 16,
    paddingHorizontal: 12, paddingVertical: 6, marginRight: 6, backgroundColor: '#0D0D0D',
  },
  filterChipActive: { borderColor: '#D4AF3760', backgroundColor: '#D4AF3715' },
  filterChipText: { fontSize: 11, color: '#C0C0C0', fontWeight: '500' },
  filterChipTextActive: { color: '#D4AF37', fontWeight: '700' },

  listContent: { paddingBottom: 100 },
  ritualCard: {
    backgroundColor: '#0D0D0D', borderWidth: 1, borderColor: '#1A1A1A',
    borderRadius: 12, padding: 14, marginBottom: 8,
  },
  ritualCardName: { fontSize: 15, fontWeight: '600', color: '#E0E0E0' },
  ritualCardDesc: { fontSize: 12, color: '#6B6B6B', marginTop: 4, lineHeight: 18 },
  ritualCardMeta: { fontFamily: 'JetBrainsMono', fontSize: 10, color: '#6B6B6B' },
  ritualTagRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  ritualTag: {
    backgroundColor: '#D4AF3715', borderWidth: 1, borderColor: '#D4AF3730',
    borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2,
  },
  ritualTagTradition: { backgroundColor: '#00FFFF10', borderColor: '#00FFFF30' },
  ritualTagText: { fontFamily: 'JetBrainsMono', fontSize: 9, color: '#D4AF37', letterSpacing: 0.5 },

  // Library
  libraryCard: {
    backgroundColor: '#0D0D0D', borderWidth: 1, borderColor: '#1A1A1A',
    borderRadius: 12, padding: 14, marginBottom: 8,
  },
  libraryCardName: { fontFamily: 'Cinzel', fontSize: 15, color: '#D4AF37', letterSpacing: 1 },
  libraryCardDesc: { fontSize: 12, color: '#6B6B6B', marginTop: 4, lineHeight: 18 },
  libraryCardMeta: { fontFamily: 'JetBrainsMono', fontSize: 10, color: '#4A4A4A', marginTop: 6 },
  libraryMd: { fontSize: 13, color: '#E0E0E0', lineHeight: 22, marginTop: 12 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: '#0D0D0D', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 40, maxHeight: '80%',
  },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#333', alignSelf: 'center', marginBottom: 20 },
  modalTitle: { fontFamily: 'Cinzel', fontSize: 20, color: '#D4AF37', textAlign: 'center', letterSpacing: 2 },
  modalCloseBtn: { backgroundColor: '#D4AF37', borderRadius: 20, paddingVertical: 14, alignItems: 'center', marginTop: 20 },
  modalCloseBtnText: { color: '#050505', fontSize: 14, fontWeight: '700', letterSpacing: 1 },

  // Player
  playerContainer: { flex: 1, paddingHorizontal: 16, paddingTop: 8 },
  playerContent: { paddingBottom: 16 },
  progressBar: { height: 3, backgroundColor: '#1A1A1A', borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#D4AF37', borderRadius: 2 },
  intentIndicator: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginTop: 8, paddingHorizontal: 4,
  },
  intentIndicatorText: { fontFamily: 'JetBrainsMono', fontSize: 12, fontWeight: '700', letterSpacing: 1 },
  stepCounter: { fontFamily: 'JetBrainsMono', fontSize: 12, color: '#6B6B6B' },

  instructionSection: { marginTop: 8 },
  compassLock: {
    backgroundColor: '#0055A415', borderWidth: 1, borderColor: '#0055A440',
    borderRadius: 12, padding: 14, alignItems: 'center',
  },
  compassDirection: { fontFamily: 'Cinzel', fontSize: 18, color: '#0055A4' },
  compassAligned: { color: '#22C55E' },
  compassHint: { fontFamily: 'JetBrainsMono', fontSize: 11, color: '#6B6B6B', marginTop: 4 },
  simBtn: { backgroundColor: '#1A1A1A', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 8, marginTop: 8 },
  simBtnText: { fontSize: 12, color: '#E0E0E0' },
  actionBadge: {
    alignSelf: 'center', borderWidth: 1, borderRadius: 6,
    paddingHorizontal: 12, paddingVertical: 4, marginTop: 12,
  },
  actionType: { fontFamily: 'JetBrainsMono', fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  instructionBox: {
    backgroundColor: '#0D0D0D', borderWidth: 1, borderColor: '#1A1A1A',
    borderRadius: 12, padding: 16, marginTop: 12, minHeight: 80, justifyContent: 'center',
  },
  instructionText: { fontSize: 15, color: '#E0E0E0', lineHeight: 24, textAlign: 'center' },
  vibrationBox: {
    backgroundColor: '#D4AF3710', borderWidth: 1, borderColor: '#D4AF3730',
    borderRadius: 12, padding: 14, marginTop: 10, alignItems: 'center',
  },
  vibrationWord: { fontFamily: 'Cinzel', fontSize: 22, color: '#D4AF37', letterSpacing: 2 },
  vibrationPhonetic: { fontFamily: 'JetBrainsMono', fontSize: 12, color: '#6B6B6B', marginTop: 4 },

  holoPadSection: { marginTop: 16, alignItems: 'center' },
  holoPadLabel: {
    fontFamily: 'JetBrainsMono', fontSize: 10, color: '#6B6B6B',
    letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8,
  },
  holoPadHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  activeTalismanBadge: {
    backgroundColor: '#D4AF3720', borderWidth: 1, borderColor: '#D4AF3740',
    borderRadius: 12, paddingHorizontal: 10, paddingVertical: 3,
  },
  activeTalismanText: { fontFamily: 'JetBrainsMono', fontSize: 10, color: '#D4AF37', letterSpacing: 1 },

  navRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, gap: 12 },
  navBtn: {
    flex: 1, borderWidth: 1, borderColor: '#1A1A1A', borderRadius: 12,
    paddingVertical: 14, alignItems: 'center',
  },
  navBtnDisabled: { opacity: 0.3 },
  navBtnText: { fontSize: 14, color: '#E0E0E0' },
  navBtnTextDisabled: { color: '#6B6B6B' },
  navBtnNext: { backgroundColor: '#D4AF37', borderColor: '#D4AF37' },
  navBtnNextText: { fontSize: 14, fontWeight: '700', color: '#050505' },
  exitBtn: { alignSelf: 'center', marginTop: 12, paddingVertical: 8 },
  exitBtnText: { fontSize: 13, color: '#6B6B6B' },

  // Completed
  completedContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  completedSymbol: { fontSize: 48, color: '#D4AF37' },
  completedTitle: { fontFamily: 'Cinzel', fontSize: 24, color: '#D4AF37', marginTop: 16, letterSpacing: 3 },
  completedName: { fontSize: 15, color: '#E0E0E0', marginTop: 8, textAlign: 'center' },
  completedIntent: { fontFamily: 'JetBrainsMono', fontSize: 12, color: '#6B6B6B', marginTop: 4 },
  completedText: { fontSize: 13, color: '#6B6B6B', marginTop: 8, textAlign: 'center' },
  xpReward: { marginTop: 16, alignItems: 'center' },
  xpRewardText: { fontFamily: 'JetBrainsMono', fontSize: 20, color: '#22C55E', fontWeight: '700' },
  levelUpText: { fontFamily: 'Cinzel', fontSize: 16, color: '#FFD700', marginTop: 4, letterSpacing: 3 },
});
