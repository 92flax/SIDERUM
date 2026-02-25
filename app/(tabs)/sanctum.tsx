// ============================================================
// ÆONIS – Sanctum Hub (Digital Grimoire)
// Tile-Hub layout: [Stasis], [Rituals], [Library], [Events]
// Library fetches scriptures from Sanity CMS with level-gating
// ============================================================

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Text, View, StyleSheet, FlatList, Platform, Pressable, ScrollView, Dimensions, Alert, Modal, ActivityIndicator } from 'react-native';
import { Magnetometer, Accelerometer } from 'expo-sensors';
import * as Haptics from 'expo-haptics';
import Markdown from 'react-native-markdown-display';
import { ScreenContainer } from '@/components/screen-container';
import { HoloPad } from '@/components/holo-pad';
import { StasisMode } from '@/components/stasis-mode';
import { GnosisTerminal } from '@/components/gnosis-terminal';
import { useRitualStore } from '@/lib/ritual/store';
import { calculateHeading, isAlignedToDirection, detectTracingMotion } from '@/lib/compass/sensor-fusion';
import { Ritual, RitualStep, RitualIntention, RitualTradition } from '@/lib/ritual/types';
import { useAstroStore } from '@/lib/astro/store';
import { ELDER_FUTHARK, generateBindruneData } from '@/lib/runes/futhark';
import { useRuneWalletStore } from '@/lib/store/rune-wallet';
import { handleRitualCompletion, loadLocalAnalytics, LEVEL_TITLES } from '@/lib/ritual/completion-handler';
import { RITUAL_INSTRUCTIONS_MD } from '@/lib/content/local-fallback';
import { getScriptures, type SanityScripture } from '@/lib/cms/sanity';
import { ELEMENTS, PLANETS, getSelectionColor, type ElementName, type PlanetName } from '@/lib/ritual/geometry';
import { useRouter } from 'expo-router';
import { PostRitualCapture, AstralJournal } from '@/components/astral-journal';
import { useJournalStore } from '@/lib/journal/store';
import { calculatePlanetaryHours, calculateMoonPhase } from '@/lib/astro/planetary-hours';
import { getMajorAspects } from '@/lib/astro/aspects';
import { PLANET_SYMBOLS } from '@/lib/astro/types';

const { width: SW, height: SH } = Dimensions.get('window');

type HubView = 'hub' | 'stasis' | 'catalog' | 'library' | 'player' | 'arsenal' | 'journal' | 'gnosis';

// ─── Sanity Block Content → Markdown Converter ──────────────
function blockContentToMarkdown(content: SanityScripture['content']): string {
  if (!content || !Array.isArray(content)) return '';
  return content
    .map((block) => {
      if (block._type === 'block' && block.children) {
        return block.children.map((c) => c.text ?? '').join('');
      }
      return '';
    })
    .join('\n\n');
}

// ─── Markdown Styles (Dark Esoteric Theme) ──────────────────
const mdStyles = StyleSheet.create({
  body: { color: '#E0E0E0', fontSize: 15, lineHeight: 26, fontFamily: 'JetBrainsMono' },
  heading1: { fontFamily: 'Cinzel', fontSize: 22, color: '#D4AF37', letterSpacing: 3, marginTop: 24, marginBottom: 12 },
  heading2: { fontFamily: 'Cinzel', fontSize: 18, color: '#D4AF37', letterSpacing: 2, marginTop: 20, marginBottom: 10 },
  heading3: { fontFamily: 'Cinzel', fontSize: 15, color: '#C0A040', letterSpacing: 1.5, marginTop: 16, marginBottom: 8 },
  paragraph: { marginBottom: 12 },
  strong: { color: '#D4AF37', fontWeight: '700' as const },
  em: { color: '#9BA1A6', fontStyle: 'italic' as const },
  blockquote: {
    backgroundColor: '#D4AF3710', borderLeftColor: '#D4AF37', borderLeftWidth: 3,
    paddingLeft: 14, paddingVertical: 8, marginVertical: 10, borderRadius: 4,
  },
  code_inline: {
    fontFamily: 'JetBrainsMono', backgroundColor: '#1A1A2E', color: '#00FFFF',
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, fontSize: 13,
  },
  code_block: {
    fontFamily: 'JetBrainsMono', backgroundColor: '#0D0D1A', color: '#00FFFF',
    padding: 14, borderRadius: 8, fontSize: 13, lineHeight: 22, marginVertical: 10,
  },
  fence: {
    fontFamily: 'JetBrainsMono', backgroundColor: '#0D0D1A', color: '#00FFFF',
    padding: 14, borderRadius: 8, fontSize: 13, lineHeight: 22, marginVertical: 10,
  },
  bullet_list: { marginVertical: 8 },
  ordered_list: { marginVertical: 8 },
  list_item: { marginBottom: 6 },
  hr: { backgroundColor: '#D4AF3730', height: 1, marginVertical: 16 },
  link: { color: '#00CCCC', textDecorationLine: 'underline' as const },
});

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
  const dynamicSelectionType = useRitualStore((s) => s.dynamicSelectionType);
  const selectedDynamicChoice = useRitualStore((s) => s.selectedDynamicChoice);
  const setDynamicChoice = useRitualStore((s) => s.setDynamicChoice);
  const isLoadingRituals = useRitualStore((s) => s.isLoadingRituals);
  const ritualsSource = useRitualStore((s) => s.ritualsSource);
  const router = useRouter();

  // Journal store
  const loadJournalEntries = useJournalStore((s) => s.loadEntries);
  const setPendingJournalData = useJournalStore((s) => s.setPendingData);
  const openPostRitualCapture = useJournalStore((s) => s.openPostRitualCapture);
  const saveAutoJournalEntry = useJournalStore((s) => s.saveAutoEntry);
  const showPostRitualCapture = useJournalStore((s) => s.showPostRitualCapture);
  const closePostRitualCapture = useJournalStore((s) => s.closePostRitualCapture);
  const location = useAstroStore((s) => s.location);

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

  // ─── Library State (Sanity CMS) ───────────────────────────
  const [scriptures, setScriptures] = useState<SanityScripture[]>([]);
  const [scripturesLoading, setScripturesLoading] = useState(false);
  const [scripturesError, setScripturesError] = useState<string | null>(null);
  const [selectedScripture, setSelectedScripture] = useState<SanityScripture | null>(null);
  const [userLevel, setUserLevel] = useState(0);

  const filteredRituals = useMemo(() => {
    return rituals.filter(r => {
      if (filterIntention !== 'All' && (r as any).intention !== filterIntention) return false;
      if (filterTradition !== 'All' && (r as any).traditionTag !== filterTradition) return false;
      return true;
    });
  }, [rituals, filterIntention, filterTradition]);

  const INTENTIONS: Array<RitualIntention | 'All'> = ['All', 'Protection', 'Wealth', 'Healing', 'Wisdom', 'Power', 'Purification'];
  const TRADITIONS: Array<RitualTradition | 'All'> = ['All', 'Golden Dawn', 'Thelema', 'Norse', 'Hermetic'];

  useEffect(() => { loadRituals(); loadJournalEntries(); }, []);

  // Load user level from local analytics
  useEffect(() => {
    loadLocalAnalytics().then((analytics) => {
      setUserLevel(analytics.levelRank);
    });
  }, [hubView]); // Refresh when returning to hub

  // Fetch scriptures from Sanity when entering library view
  useEffect(() => {
    if (hubView !== 'library') return;
    let cancelled = false;
    setScripturesLoading(true);
    setScripturesError(null);

    getScriptures()
      .then((data) => {
        if (!cancelled) {
          setScriptures(data);
          setScripturesLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setScripturesError('Failed to load scriptures. Check your connection.');
          setScripturesLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, [hubView]);

  // Group scriptures by level_required
  const groupedScriptures = useMemo(() => {
    const groups: Record<number, SanityScripture[]> = {};
    for (const s of scriptures) {
      const lvl = s.level_required ?? 0;
      if (!groups[lvl]) groups[lvl] = [];
      groups[lvl].push(s);
    }
    return Object.entries(groups)
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([level, items]) => ({
        level: Number(level),
        title: LEVEL_TITLES[Number(level)] ?? `Level ${level}`,
        items,
      }));
  }, [scriptures]);

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

      // Auto-capture journal data
      const now = new Date();
      const hourInfo = calculatePlanetaryHours(now, location);
      const moonInfo = calculateMoonPhase(now);
      const aspects = chartData?.planets ? getMajorAspects(chartData.planets, 3) : [];
      const aspectStrings = aspects.slice(0, 8).map(a =>
        `${PLANET_SYMBOLS[a.planet1] ?? a.planet1} ${a.type === 'Conjunction' ? '☌' : a.type === 'Opposition' ? '☍' : a.type === 'Square' ? '□' : a.type === 'Trine' ? '△' : '⚹'} ${PLANET_SYMBOLS[a.planet2] ?? a.planet2} (${a.orb.toFixed(1)}°)`
      );

      setPendingJournalData({
        ritualName: currentRitual.name,
        ritualId: currentRitual.id,
        intent: intent ?? 'BANISH',
        dynamicSelection: selectedDynamicChoice,
        stepsCompleted: currentRitual.steps.length,
        totalSteps: currentRitual.steps.length,
        xpAwarded: result.xpAwarded,
        rulerOfDay: hourInfo.dayRuler,
        rulerOfHour: hourInfo.currentHour.planet,
        moonPhase: moonInfo.phaseName,
        activeAspects: aspectStrings,
      });
    } catch {}
  }, [currentRitual, intent, selectedDynamicChoice, chartData, location]);

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

  const handleScriptureTap = useCallback((scripture: SanityScripture) => {
    const requiredLevel = scripture.level_required ?? 0;
    if (userLevel < requiredLevel) {
      const levelTitle = LEVEL_TITLES[requiredLevel] ?? `Level ${requiredLevel}`;
      if (Platform.OS !== ('web' as string)) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert(
        'Scripture Locked',
        `Requires ${levelTitle} (Level ${requiredLevel}).\nYour current level: ${userLevel}.`,
        [{ text: 'Understood', style: 'default' }]
      );
      return;
    }
    if (Platform.OS !== ('web' as string)) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedScripture(scripture);
  }, [userLevel]);

  // ==========================================
  // STASIS MODE
  // ==========================================
  if (hubView === 'stasis') {
    return (
      <StasisMode
        onComplete={(result) => {}}
        onClose={() => setHubView('hub')}
      />
    );
  }

  // ==========================================
  // GNOSIS VIEW
  // ==========================================
  if (hubView === 'gnosis') {
    return (
      <ScreenContainer>
        <GnosisTerminal onBack={() => setHubView('hub')} />
        {showPostRitualCapture && (
          <Modal visible animationType="slide" transparent>
            <View style={styles.modalOverlay}>
              <PostRitualCapture />
            </View>
          </Modal>
        )}
      </ScreenContainer>
    );
  }

  // ==========================================
  // LIBRARY VIEW (Sanity CMS Scriptures)
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
          <Text style={styles.subtitle}>The Grimoire of Scriptures</Text>

          {/* User Level Indicator */}
          <View style={styles.levelBadge}>
            <Text style={styles.levelBadgeText}>
              Your Level: {userLevel} — {LEVEL_TITLES[userLevel] ?? 'Neophyte'}
            </Text>
          </View>

          {/* Loading State */}
          {scripturesLoading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#D4AF37" />
              <Text style={styles.loadingText}>Consulting the Archives…</Text>
            </View>
          )}

          {/* Error State */}
          {scripturesError && !scripturesLoading && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorIcon}>⚠</Text>
              <Text style={styles.errorText}>{scripturesError}</Text>
              <Pressable
                onPress={() => {
                  setScripturesLoading(true);
                  setScripturesError(null);
                  getScriptures()
                    .then(setScriptures)
                    .catch(() => setScripturesError('Failed to load scriptures.'))
                    .finally(() => setScripturesLoading(false));
                }}
                style={({ pressed }) => [styles.retryBtn, pressed && { opacity: 0.7 }]}
              >
                <Text style={styles.retryBtnText}>Retry</Text>
              </Pressable>
            </View>
          )}

          {/* Empty State */}
          {!scripturesLoading && !scripturesError && scriptures.length === 0 && (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>📜</Text>
              <Text style={styles.emptyText}>No scriptures available yet.</Text>
              <Text style={styles.emptySubtext}>The library awaits its first volumes.</Text>
            </View>
          )}

          {/* Grouped Scripture List */}
          {!scripturesLoading && !scripturesError && scriptures.length > 0 && (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.listContent}>
              {groupedScriptures.map((group) => {
                const isGroupLocked = userLevel < group.level;
                return (
                  <View key={group.level} style={styles.levelGroup}>
                    <View style={styles.levelGroupHeader}>
                      <View style={[styles.levelDot, isGroupLocked && styles.levelDotLocked]} />
                      <Text style={[styles.levelGroupTitle, isGroupLocked && styles.levelGroupTitleLocked]}>
                        {group.title}
                      </Text>
                      <Text style={styles.levelGroupCount}>
                        {isGroupLocked ? '🔒' : `${group.items.length}`}
                      </Text>
                    </View>

                    {group.items.map((scripture) => {
                      const isLocked = userLevel < (scripture.level_required ?? 0);
                      return (
                        <Pressable
                          key={scripture._id}
                          onPress={() => handleScriptureTap(scripture)}
                          style={({ pressed }) => [
                            styles.scriptureCard,
                            isLocked && styles.scriptureCardLocked,
                            pressed && { opacity: 0.7 },
                          ]}
                        >
                          <View style={styles.scriptureHeader}>
                            <View style={styles.scriptureTitleRow}>
                              {isLocked && <Text style={styles.lockIcon}>🔒</Text>}
                              <Text
                                style={[styles.scriptureTitle, isLocked && styles.scriptureTitleLocked]}
                                numberOfLines={1}
                              >
                                {scripture.title}
                              </Text>
                            </View>
                            {scripture.category && (
                              <View style={[styles.categoryTag, isLocked && styles.categoryTagLocked]}>
                                <Text style={[styles.categoryTagText, isLocked && styles.categoryTagTextLocked]}>
                                  {scripture.category}
                                </Text>
                              </View>
                            )}
                          </View>

                          {scripture.description && (
                            <Text
                              style={[styles.scriptureDesc, isLocked && styles.scriptureDescLocked]}
                              numberOfLines={2}
                            >
                              {scripture.description}
                            </Text>
                          )}

                          <View style={styles.scriptureMeta}>
                            {scripture.author && (
                              <Text style={[styles.scriptureAuthor, isLocked && { color: '#333' }]}>
                                by {scripture.author}
                              </Text>
                            )}
                            {isLocked && (
                              <Text style={styles.requiresLevel}>
                                Requires Level {scripture.level_required}
                              </Text>
                            )}
                          </View>
                        </Pressable>
                      );
                    })}
                  </View>
                );
              })}
            </ScrollView>
          )}

          {/* Scripture Reader Modal */}
          <Modal
            visible={!!selectedScripture}
            transparent
            animationType="slide"
            onRequestClose={() => setSelectedScripture(null)}
          >
            <View style={styles.readerOverlay}>
              <View style={styles.readerContent}>
                <View style={styles.readerHandle} />

                {/* Reader Header */}
                <View style={styles.readerHeader}>
                  <Text style={styles.readerTitle} numberOfLines={2}>
                    {selectedScripture?.title}
                  </Text>
                  {selectedScripture?.author && (
                    <Text style={styles.readerAuthor}>by {selectedScripture.author}</Text>
                  )}
                  {selectedScripture?.category && (
                    <View style={styles.readerCategoryTag}>
                      <Text style={styles.readerCategoryText}>{selectedScripture.category}</Text>
                    </View>
                  )}
                </View>

                <View style={styles.readerDivider} />

                {/* Markdown Content */}
                <ScrollView
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={styles.readerBody}
                >
                  {selectedScripture?.content ? (
                    <Markdown style={mdStyles}>
                      {blockContentToMarkdown(selectedScripture.content)}
                    </Markdown>
                  ) : (
                    <View style={styles.noContentContainer}>
                      <Text style={styles.noContentIcon}>📜</Text>
                      <Text style={styles.noContentText}>
                        This scripture's content has not yet been transcribed.
                      </Text>
                    </View>
                  )}
                </ScrollView>

                {/* Close Button */}
                <Pressable
                  onPress={() => setSelectedScripture(null)}
                  style={({ pressed }) => [styles.readerCloseBtn, pressed && { opacity: 0.8 }]}
                >
                  <Text style={styles.readerCloseBtnText}>Close</Text>
                </Pressable>
              </View>
            </View>
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

              {/* Intent Toggle – only shown if ritual supports it */}
              {(currentRitual.supportsIntent !== false) && (
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
              )}

              {/* Dynamic Element/Planet Picker */}
              {dynamicSelectionType === 'element' && (
                <View style={styles.dynamicPickerSection}>
                  <Text style={styles.dynamicPickerLabel}>SELECT ELEMENT</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dynamicPickerRow}>
                    {ELEMENTS.map((el) => {
                      const isSelected = selectedDynamicChoice === el;
                      const elColor = getSelectionColor(el);
                      return (
                        <Pressable
                          key={el}
                          onPress={() => {
                            if (Platform.OS !== ('web' as string)) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            setDynamicChoice(el);
                          }}
                          style={({ pressed }) => [
                            styles.dynamicPill,
                            isSelected && { borderColor: elColor, backgroundColor: elColor + '15' },
                            pressed && { opacity: 0.7 },
                          ]}
                        >
                          <View style={[styles.dynamicPillDot, { backgroundColor: elColor }]} />
                          <Text style={[
                            styles.dynamicPillText,
                            isSelected && { color: elColor, fontFamily: 'Cinzel' },
                          ]}>
                            {el}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                </View>
              )}

              {dynamicSelectionType === 'planet' && (
                <View style={styles.dynamicPickerSection}>
                  <Text style={styles.dynamicPickerLabel}>SELECT PLANET</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dynamicPickerRow}>
                    {PLANETS.map((pl) => {
                      const isSelected = selectedDynamicChoice === pl;
                      const plColor = getSelectionColor(pl);
                      return (
                        <Pressable
                          key={pl}
                          onPress={() => {
                            if (Platform.OS !== ('web' as string)) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            setDynamicChoice(pl);
                          }}
                          style={({ pressed }) => [
                            styles.dynamicPill,
                            isSelected && { borderColor: plColor, backgroundColor: plColor + '15' },
                            pressed && { opacity: 0.7 },
                          ]}
                        >
                          <View style={[styles.dynamicPillDot, { backgroundColor: plColor }]} />
                          <Text style={[
                            styles.dynamicPillText,
                            isSelected && { color: plColor, fontFamily: 'Cinzel' },
                          ]}>
                            {pl}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                </View>
              )}

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

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={styles.sectionTitle}>Available ({filteredRituals.length})</Text>
            {ritualsSource !== 'none' && (
              <Text style={{ fontFamily: 'JetBrainsMono', fontSize: 9, color: ritualsSource === 'cms' ? '#D4AF37' : '#6B6B6B', letterSpacing: 1 }}>
                {ritualsSource === 'cms' ? '✦ CMS' : '◇ LOCAL'}
              </Text>
            )}
          </View>
          {isLoadingRituals ? (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60 }}>
              <Text style={{ fontFamily: 'Cinzel', fontSize: 14, color: '#D4AF37', marginBottom: 8 }}>Loading Rituals...</Text>
              <Text style={{ fontFamily: 'JetBrainsMono', fontSize: 10, color: '#6B6B6B' }}>Connecting to CMS</Text>
            </View>
          ) : (
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
          )}
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
              openPostRitualCapture();
              resetRitual();
              setCompletionResult(null);
              setHubView('hub');
            }}
            style={({ pressed }) => [styles.startBtn, pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] }]}
          >
            <Text style={styles.startBtnText}>Open Astral Journal</Text>
          </Pressable>
          <Pressable
            onPress={() => {
              if (Platform.OS !== ('web' as string)) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              saveAutoJournalEntry();
              resetRitual();
              setCompletionResult(null);
              setHubView('hub');
            }}
            style={({ pressed }) => [styles.skipJournalBtn, pressed && { opacity: 0.7 }]}
          >
            <Text style={styles.skipJournalBtnText}>Skip Journal</Text>
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
                  {currentStep?.instruction_text
                    ? (selectedDynamicChoice
                        ? currentStep.instruction_text.replace(/\{\{SELECTION\}\}/g, selectedDynamicChoice)
                        : currentStep.instruction_text)
                    : ''}
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
                  dynamicSelection={dynamicSelectionType}
                  dynamicChoice={selectedDynamicChoice}
                  instructionText={currentStep?.instruction_text}
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
  // ARSENAL VIEW
  // ==========================================
  if (hubView === 'arsenal') {
    return (
      <ScreenContainer>
        <View style={styles.container}>
          <View style={styles.arsenalHeader}>
            <Pressable onPress={() => setHubView('hub')} style={({ pressed }) => [pressed && { opacity: 0.7 }]}>
              <Text style={styles.arsenalBackBtn}>← Sanctum</Text>
            </Pressable>
            <Text style={styles.arsenalTitle}>Arsenal</Text>
            <View style={{ width: 60 }} />
          </View>

          <ScrollView contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
            {/* Forge Tile */}
            <Pressable
              onPress={() => {
                if (Platform.OS !== ('web' as string)) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                router.push('/(tabs)/runes');
              }}
              style={({ pressed }) => [styles.arsenalCard, pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] }]}
            >
              <Text style={styles.arsenalCardIcon}>✦</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.arsenalCardTitle}>Forge</Text>
                <Text style={styles.arsenalCardDesc}>Create Bindrunes · Rune Workshop</Text>
              </View>
              <Text style={styles.arsenalCardArrow}>›</Text>
            </Pressable>

            {/* Astral Journal Tile */}
            <Pressable
              onPress={() => {
                if (Platform.OS !== ('web' as string)) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                setHubView('journal');
              }}
              style={({ pressed }) => [styles.arsenalCard, styles.arsenalCardJournal, pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] }]}
            >
              <Text style={styles.arsenalCardIcon}>☽</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.arsenalCardTitle}>Astral Journal</Text>
                <Text style={styles.arsenalCardDesc}>Ritual diary · Statistics · Insights</Text>
              </View>
              <Text style={styles.arsenalCardArrow}>›</Text>
            </Pressable>
          </ScrollView>
        </View>
      </ScreenContainer>
    );
  }

  // ==========================================
  // ASTRAL JOURNAL VIEW
  // ==========================================
  if (hubView === 'journal') {
    return (
      <ScreenContainer>
        <AstralJournal onBack={() => setHubView('arsenal')} />
        <PostRitualCapture />
      </ScreenContainer>
    );
  }

  // ==========================================
  // HUB VIEW (Tile Layout)
  // ==========================================
  return (
    <ScreenContainer>
      <PostRitualCapture />
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
            <Text style={styles.tileDesc}>Grimoire of Scriptures</Text>
            <Text style={styles.tileMeta}>Sanity CMS · Live</Text>
          </Pressable>

          {/* Arsenal Tile */}
          <Pressable
            onPress={() => handleTilePress('arsenal')}
            style={({ pressed }) => [styles.tile, styles.tileForge, pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] }]}
          >
            <Text style={styles.tileIcon}>⚔</Text>
            <Text style={styles.tileTitle}>Arsenal</Text>
            <Text style={styles.tileDesc}>Forge & Journal</Text>
            <Text style={styles.tileMeta}>Tools & Records</Text>
          </Pressable>

          <Pressable
            onPress={() => handleTilePress('gnosis')}
            style={({ pressed }) => [styles.tile, styles.tileGnosis, pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] }]}
          >
            <Text style={styles.tileIcon}>◈</Text>
            <Text style={styles.tileTitle}>Gnosis</Text>
            <Text style={styles.tileDesc}>Frequency Trance</Text>
            <Text style={styles.tileMeta}>Psychoacoustic Focus</Text>
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
  tileGnosis: { borderColor: '#D4AF3730' },
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

  // Level Badge
  levelBadge: {
    alignSelf: 'center', backgroundColor: '#D4AF3710', borderWidth: 1, borderColor: '#D4AF3730',
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 6, marginTop: 12,
  },
  levelBadgeText: { fontFamily: 'JetBrainsMono', fontSize: 11, color: '#D4AF37', letterSpacing: 1 },

  // Loading / Error / Empty
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 60 },
  loadingText: { fontFamily: 'Cinzel', fontSize: 14, color: '#6B6B6B', marginTop: 16, letterSpacing: 2 },
  errorContainer: { alignItems: 'center', paddingTop: 40 },
  errorIcon: { fontSize: 32, color: '#EF4444' },
  errorText: { fontSize: 14, color: '#EF4444', marginTop: 8, textAlign: 'center' },
  retryBtn: {
    backgroundColor: '#D4AF37', borderRadius: 16, paddingHorizontal: 24, paddingVertical: 10, marginTop: 16,
  },
  retryBtnText: { color: '#050505', fontSize: 13, fontWeight: '700' },
  emptyContainer: { alignItems: 'center', paddingTop: 60 },
  emptyIcon: { fontSize: 48 },
  emptyText: { fontFamily: 'Cinzel', fontSize: 16, color: '#6B6B6B', marginTop: 12, letterSpacing: 2 },
  emptySubtext: { fontSize: 13, color: '#4A4A4A', marginTop: 4 },

  // Level Groups
  levelGroup: { marginTop: 20 },
  levelGroupHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  levelDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#D4AF37' },
  levelDotLocked: { backgroundColor: '#333' },
  levelGroupTitle: { fontFamily: 'Cinzel', fontSize: 14, color: '#D4AF37', letterSpacing: 2, flex: 1 },
  levelGroupTitleLocked: { color: '#555' },
  levelGroupCount: { fontFamily: 'JetBrainsMono', fontSize: 11, color: '#6B6B6B' },

  // Scripture Cards
  scriptureCard: {
    backgroundColor: '#0D0D0D', borderWidth: 1, borderColor: '#1A1A1A',
    borderRadius: 12, padding: 14, marginBottom: 8,
  },
  scriptureCardLocked: { borderColor: '#111', opacity: 0.5 },
  scriptureHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  scriptureTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
  lockIcon: { fontSize: 14 },
  scriptureTitle: { fontFamily: 'Cinzel', fontSize: 14, color: '#D4AF37', letterSpacing: 1, flex: 1 },
  scriptureTitleLocked: { color: '#555' },
  categoryTag: {
    backgroundColor: '#3B82F615', borderWidth: 1, borderColor: '#3B82F630',
    borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2, marginLeft: 8,
  },
  categoryTagLocked: { backgroundColor: '#11111180', borderColor: '#222' },
  categoryTagText: { fontFamily: 'JetBrainsMono', fontSize: 9, color: '#3B82F6', letterSpacing: 0.5 },
  categoryTagTextLocked: { color: '#444' },
  scriptureDesc: { fontSize: 12, color: '#6B6B6B', marginTop: 6, lineHeight: 18 },
  scriptureDescLocked: { color: '#333' },
  scriptureMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  scriptureAuthor: { fontFamily: 'JetBrainsMono', fontSize: 10, color: '#4A4A4A' },
  requiresLevel: { fontFamily: 'JetBrainsMono', fontSize: 10, color: '#EF4444', letterSpacing: 0.5 },

  // Scripture Reader Modal
  readerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'flex-end' },
  readerContent: {
    backgroundColor: '#0A0A0F', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 40, maxHeight: '92%',
    borderTopWidth: 1, borderColor: '#D4AF3730',
  },
  readerHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#D4AF3740', alignSelf: 'center', marginBottom: 20 },
  readerHeader: { alignItems: 'center', marginBottom: 8 },
  readerTitle: { fontFamily: 'Cinzel', fontSize: 20, color: '#D4AF37', textAlign: 'center', letterSpacing: 2 },
  readerAuthor: { fontFamily: 'JetBrainsMono', fontSize: 12, color: '#6B6B6B', marginTop: 4 },
  readerCategoryTag: {
    backgroundColor: '#3B82F615', borderWidth: 1, borderColor: '#3B82F630',
    borderRadius: 8, paddingHorizontal: 10, paddingVertical: 3, marginTop: 8,
  },
  readerCategoryText: { fontFamily: 'JetBrainsMono', fontSize: 10, color: '#3B82F6', letterSpacing: 1 },
  readerDivider: { height: 1, backgroundColor: '#D4AF3720', marginVertical: 16 },
  readerBody: { paddingBottom: 20 },
  noContentContainer: { alignItems: 'center', paddingVertical: 40 },
  noContentIcon: { fontSize: 40 },
  noContentText: { fontFamily: 'Cinzel', fontSize: 14, color: '#6B6B6B', marginTop: 12, textAlign: 'center', letterSpacing: 1 },
  readerCloseBtn: {
    backgroundColor: '#D4AF37', borderRadius: 20, paddingVertical: 14, alignItems: 'center', marginTop: 12,
  },
  readerCloseBtnText: { color: '#050505', fontSize: 14, fontWeight: '700', letterSpacing: 1 },

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

  // Modal (old library)
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

  // Dynamic Element/Planet Picker
  dynamicPickerSection: { marginTop: 16 },
  dynamicPickerLabel: {
    fontFamily: 'JetBrainsMono', fontSize: 10, color: '#6B6B6B',
    letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8,
  },
  dynamicPickerRow: { marginBottom: 4 },
  dynamicPill: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#0D0D0D', borderWidth: 1, borderColor: '#333333',
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8,
    marginRight: 8,
  },
  dynamicPillDot: {
    width: 8, height: 8, borderRadius: 4, marginRight: 8,
  },
  dynamicPillText: {
    fontFamily: 'JetBrainsMono', fontSize: 12, color: '#6B6B6B',
  },

  // Arsenal
  arsenalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: '#1A1A1A',
  },
  arsenalTitle: { fontFamily: 'Cinzel', fontSize: 18, color: '#D4AF37', letterSpacing: 3 },
  arsenalBackBtn: { fontFamily: 'JetBrainsMono', fontSize: 12, color: '#6B6B6B', letterSpacing: 1 },
  arsenalCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#0D0D0D',
    borderWidth: 1, borderColor: '#1A1A1A', borderRadius: 14, padding: 18,
    marginTop: 12, gap: 14,
  },
  arsenalCardJournal: { borderColor: '#D4AF3730' },
  arsenalCardIcon: { fontSize: 24, color: '#D4AF37', width: 32, textAlign: 'center' },
  arsenalCardTitle: { fontFamily: 'Cinzel', fontSize: 15, color: '#E0E0E0', letterSpacing: 2 },
  arsenalCardDesc: { fontFamily: 'JetBrainsMono', fontSize: 10, color: '#6B6B6B', marginTop: 3, letterSpacing: 0.5 },
  arsenalCardArrow: { fontSize: 22, color: '#333' },

  // Skip Journal button
  skipJournalBtn: {
    borderRadius: 20, paddingVertical: 10, alignItems: 'center', marginTop: 10,
    borderWidth: 1, borderColor: '#333',
  },
  skipJournalBtnText: { fontFamily: 'JetBrainsMono', fontSize: 13, color: '#6B6B6B', letterSpacing: 1 },
});
