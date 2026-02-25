// ============================================================
// ÆONIS – Gnosis Terminal
// Psychoacoustic frequency meditation with active Bindrune focus
// ============================================================

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Text,
  View,
  StyleSheet,
  Pressable,
  ScrollView,
  Dimensions,
  Platform,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
  cancelAnimation,
  runOnJS,
} from 'react-native-reanimated';
import Svg, { Line, Path, Rect, G } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { activateKeepAwake, deactivateKeepAwake, isAvailableAsync } from 'expo-keep-awake';
import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { useRuneWalletStore, type SavedRune } from '@/lib/store/rune-wallet';
import { generateBindruneData, ELDER_FUTHARK, type BindruneRenderData } from '@/lib/runes/futhark';
import { useJournalStore, type PendingJournalData } from '@/lib/journal/store';
import { calculatePlanetaryHours, calculateMoonPhase } from '@/lib/astro/planetary-hours';
import { getMajorAspects } from '@/lib/astro/aspects';
import { useAstroStore } from '@/lib/astro/store';
import { PLANET_SYMBOLS } from '@/lib/astro/types';

const { width: SW, height: SH } = Dimensions.get('window');

// ─── Frequency Options ─────────────────────────────────────
interface FrequencyOption {
  id: string;
  name: string;
  frequency: string;
  description: string;
  color: string;
}

const FREQUENCIES: FrequencyOption[] = [
  { id: 'void', name: 'The Void', frequency: '432Hz', description: 'Universal Harmony', color: '#8B5CF6' },
  { id: 'solar', name: 'Solar Core', frequency: '126.22Hz', description: 'Sun Frequency', color: '#D4AF37' },
  { id: 'mars', name: 'Martian Drive', frequency: '144.72Hz', description: 'Mars Frequency', color: '#EF4444' },
];

// ─── Duration Presets (minutes) ────────────────────────────
const DURATION_PRESETS = [5, 10, 15, 20, 30, 45, 60];

// ─── Enhanced Bindrune SVG Renderer (Bloom Glow) ───────────
const STROKE_COLOR = '#D4AF37';
const STROKE_WIDTH = 5;
const SPINE_WIDTH = 6;

function BindruneSVG({ data, size, glowColor }: { data: BindruneRenderData; size: number; glowColor: string }) {
  // Add padding around the viewBox so glow/bloom layers can dissipate without clipping
  const PAD = 30;
  const vbW = data.width + PAD * 2;
  const vbH = data.height + PAD * 2;
  const scale = size / data.width;
  const svgW = vbW * scale;
  const svgH = vbH * scale;

  return (
    <Svg
      width={svgW}
      height={svgH}
      viewBox={`${-PAD} ${-PAD} ${vbW} ${vbH}`}
      style={{ backgroundColor: 'transparent', overflow: 'visible' } as any}
    >
      {/* Outer bloom layer – very diffused */}
      <G opacity={0.15}>
        <Line
          x1={data.cx} y1={data.staveTop} x2={data.cx} y2={data.staveBottom}
          stroke={glowColor} strokeWidth={SPINE_WIDTH + 18} strokeLinecap="round"
        />
        {data.lines.map((l) => (
          <Line key={`b1-${l.key}`} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2}
            stroke={glowColor} strokeWidth={STROKE_WIDTH + 16} strokeLinecap="round" />
        ))}
        {data.paths.map((p) => (
          <Path key={`b1-${p.key}`} d={p.d} stroke={glowColor} strokeWidth={STROKE_WIDTH + 16}
            fill="none" strokeLinecap="round" />
        ))}
      </G>
      {/* Mid bloom layer */}
      <G opacity={0.25}>
        <Line
          x1={data.cx} y1={data.staveTop} x2={data.cx} y2={data.staveBottom}
          stroke={glowColor} strokeWidth={SPINE_WIDTH + 12} strokeLinecap="round"
        />
        {data.lines.map((l) => (
          <Line key={`b2-${l.key}`} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2}
            stroke={glowColor} strokeWidth={STROKE_WIDTH + 10} strokeLinecap="round" />
        ))}
        {data.paths.map((p) => (
          <Path key={`b2-${p.key}`} d={p.d} stroke={glowColor} strokeWidth={STROKE_WIDTH + 10}
            fill="none" strokeLinecap="round" />
        ))}
      </G>
      {/* Inner glow layer */}
      <G opacity={0.5}>
        <Line
          x1={data.cx} y1={data.staveTop} x2={data.cx} y2={data.staveBottom}
          stroke={glowColor} strokeWidth={SPINE_WIDTH + 5} strokeLinecap="round"
        />
        {data.lines.map((l) => (
          <Line key={`g-${l.key}`} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2}
            stroke={glowColor} strokeWidth={STROKE_WIDTH + 4} strokeLinecap="round" />
        ))}
        {data.paths.map((p) => (
          <Path key={`g-${p.key}`} d={p.d} stroke={glowColor} strokeWidth={STROKE_WIDTH + 4}
            fill="none" strokeLinecap="round" />
        ))}
      </G>
      {/* Crisp core layer – the actual rune */}
      <Line
        x1={data.cx} y1={data.staveTop} x2={data.cx} y2={data.staveBottom}
        stroke={STROKE_COLOR} strokeWidth={SPINE_WIDTH} strokeLinecap="square"
      />
      {data.lines.map((l) => (
        <Line key={l.key} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2}
          stroke={STROKE_COLOR} strokeWidth={STROKE_WIDTH} strokeLinecap="round" />
      ))}
      {data.paths.map((p) => (
        <Path key={p.key} d={p.d} stroke={STROKE_COLOR} strokeWidth={STROKE_WIDTH}
          fill="none" strokeLinecap="round" />
      ))}
      {/* Hot white core highlight */}
      <G opacity={0.4}>
        <Line
          x1={data.cx} y1={data.staveTop} x2={data.cx} y2={data.staveBottom}
          stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round"
        />
        {data.lines.map((l) => (
          <Line key={`c-${l.key}`} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2}
            stroke="#FFFFFF" strokeWidth={1.5} strokeLinecap="round" />
        ))}
      </G>
    </Svg>
  );
}

// ─── Props ──────────────────────────────────────────────────
interface GnosisTerminalProps {
  onBack: () => void;
}

export function GnosisTerminal({ onBack }: GnosisTerminalProps) {
  // ─── State ──────────────────────────────────────────────
  const [mode, setMode] = useState<'setup' | 'active' | 'complete'>('setup');
  const [selectedFreq, setSelectedFreq] = useState<FrequencyOption>(FREQUENCIES[0]);
  const [durationMin, setDurationMin] = useState(15);
  const [remainingSec, setRemainingSec] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioPlayerRef = useRef<ReturnType<typeof createAudioPlayer> | null>(null);
  const keepAwakeActiveRef = useRef(false);

  // ─── Stores ─────────────────────────────────────────────
  const activeRune = useRuneWalletStore((s) => s.getActiveRune());
  const loadWallet = useRuneWalletStore((s) => s.loadWallet);
  const chartData = useAstroStore((s) => s.chartData);
  const setPendingData = useJournalStore((s) => s.setPendingData);
  const openPostRitualCapture = useJournalStore((s) => s.openPostRitualCapture);
  const showPostRitualCapture = useJournalStore((s) => s.showPostRitualCapture);
  const closePostRitualCapture = useJournalStore((s) => s.closePostRitualCapture);

  // ─── Load wallet on mount ───────────────────────────────
  useEffect(() => {
    loadWallet();
  }, []);

  // ─── Bindrune data ──────────────────────────────────────
  const bindruneData = useMemo(() => {
    if (!activeRune) return null;
    const runes = activeRune.runeNames
      .map((name) => ELDER_FUTHARK.find((r) => r.name === name))
      .filter(Boolean) as typeof ELDER_FUTHARK;
    if (runes.length === 0) return null;
    return generateBindruneData(runes, 200, 280);
  }, [activeRune]);

  // ─── Reanimated pulsing aura (2.5s in, 2.5s out = 5s cycle) ──
  const auraScale = useSharedValue(1);
  const auraOpacity = useSharedValue(0.12);
  const runeGlowOpacity = useSharedValue(0.8);

  const auraStyle = useAnimatedStyle(() => ({
    transform: [{ scale: auraScale.value }],
    opacity: auraOpacity.value,
  }));

  const auraStyle2 = useAnimatedStyle(() => ({
    transform: [{ scale: auraScale.value * 0.75 }],
    opacity: auraOpacity.value * 1.5,
  }));

  const auraStyle3 = useAnimatedStyle(() => ({
    transform: [{ scale: auraScale.value * 0.5 }],
    opacity: auraOpacity.value * 2.2,
  }));

  const runeGlowStyle = useAnimatedStyle(() => ({
    opacity: runeGlowOpacity.value,
  }));

  const startPulse = useCallback(() => {
    // Aura breathing: 5-second cycle
    auraScale.value = withRepeat(
      withSequence(
        withTiming(1.15, { duration: 2500, easing: Easing.inOut(Easing.ease) }),
        withTiming(1.0, { duration: 2500, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
    auraOpacity.value = withRepeat(
      withSequence(
        withTiming(0.2, { duration: 2500, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.08, { duration: 2500, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
    // Rune glow subtle pulse
    runeGlowOpacity.value = withRepeat(
      withSequence(
        withTiming(1.0, { duration: 2500, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.75, { duration: 2500, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
  }, []);

  const stopPulse = useCallback(() => {
    cancelAnimation(auraScale);
    cancelAnimation(auraOpacity);
    cancelAnimation(runeGlowOpacity);
    auraScale.value = withTiming(1, { duration: 300 });
    auraOpacity.value = withTiming(0, { duration: 300 });
    runeGlowOpacity.value = withTiming(1, { duration: 300 });
  }, []);

  // ─── Timer ──────────────────────────────────────────────
  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleTimerTick = useCallback(() => {
    setRemainingSec((prev) => {
      if (prev <= 1) {
        return 0;
      }
      return prev - 1;
    });
  }, []);

  // Watch for timer reaching 0
  useEffect(() => {
    if (mode === 'active' && remainingSec === 0 && timerRef.current) {
      handleCompletion();
    }
  }, [remainingSec, mode]);

  // ─── Audio ──────────────────────────────────────────────
  const startAudio = useCallback(async () => {
    try {
      if (Platform.OS !== 'web') {
        await setAudioModeAsync({ playsInSilentMode: true });
      }
      const audioUrl = getFrequencyAudioUrl(selectedFreq.id);
      if (audioUrl) {
        const player = createAudioPlayer({ uri: audioUrl });
        player.loop = true;
        player.volume = 0.6;
        player.play();
        audioPlayerRef.current = player;
      }
    } catch (e) {
      console.warn('[Gnosis] Audio init failed:', e);
    }
  }, [selectedFreq]);

  const stopAudio = useCallback(() => {
    try {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
        audioPlayerRef.current.remove();
        audioPlayerRef.current = null;
      }
    } catch (e) {
      console.warn('[Gnosis] Audio cleanup failed:', e);
    }
  }, []);

  // ─── Start Gnosis ──────────────────────────────────────
  const handleStart = useCallback(() => {
    if (Platform.OS !== ('web' as string)) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }
    setRemainingSec(durationMin * 60);
    setMode('active');
    startPulse();
    startAudio();

    // Keep screen awake (async, guarded for web)
    (async () => {
      try {
        const available = await isAvailableAsync();
        if (available) {
          await activateKeepAwake('gnosis');
          keepAwakeActiveRef.current = true;
        }
      } catch {}
    })();

    // Start timer
    timerRef.current = setInterval(handleTimerTick, 1000);
  }, [durationMin, startPulse, startAudio, handleTimerTick]);

  // ─── Completion ─────────────────────────────────────────
  const handleCompletion = useCallback(() => {
    // Stop timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    // Stop audio & pulse
    stopAudio();
    stopPulse();

    // Release screen lock
    if (keepAwakeActiveRef.current) {
      try {
        deactivateKeepAwake('gnosis');
        keepAwakeActiveRef.current = false;
      } catch {}
    }

    // Haptic feedback
    if (Platform.OS !== ('web' as string)) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    // Prepare journal data
    const now = new Date();
    const defaultLoc = { latitude: 51.5074, longitude: -0.1278 };
    let dayRuler = 'Unknown';
    let hourRuler = 'Unknown';
    try {
      const hourInfo = calculatePlanetaryHours(now, defaultLoc);
      dayRuler = hourInfo.dayRuler;
      hourRuler = hourInfo.currentHour.planet;
    } catch {}

    const moonPhase = calculateMoonPhase(now);
    const aspects = chartData ? getMajorAspects(chartData.planets) : [];
    const aspectStrings = aspects.map((a) => {
      const p1 = PLANET_SYMBOLS[a.planet1 as keyof typeof PLANET_SYMBOLS] || a.planet1;
      const p2 = PLANET_SYMBOLS[a.planet2 as keyof typeof PLANET_SYMBOLS] || a.planet2;
      return `${a.planet1} ${p1} ${a.type} ${a.planet2} ${p2}`;
    });

    const pendingData: PendingJournalData = {
      ritualName: 'Gnosis State',
      ritualId: `gnosis_${selectedFreq.id}`,
      intent: 'INVOKE' as const,
      dynamicSelection: `${selectedFreq.name} (${selectedFreq.frequency})`,
      stepsCompleted: 1,
      totalSteps: 1,
      xpAwarded: Math.floor(durationMin * 2),
      rulerOfDay: dayRuler,
      rulerOfHour: hourRuler,
      moonPhase: moonPhase.phaseName,
      activeAspects: aspectStrings,
    };

    setPendingData(pendingData);
    setMode('complete');
    openPostRitualCapture();
  }, [selectedFreq, durationMin, chartData, stopAudio, stopPulse, setPendingData, openPostRitualCapture]);

  // ─── Early Exit ─────────────────────────────────────────
  const handleExit = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    stopAudio();
    stopPulse();
    if (keepAwakeActiveRef.current) {
      try { deactivateKeepAwake('gnosis'); keepAwakeActiveRef.current = false; } catch {}
    }
    setMode('setup');
  }, [stopAudio, stopPulse]);

  // ─── Cleanup on unmount ─────────────────────────────────
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      stopAudio();
      if (keepAwakeActiveRef.current) {
        try { deactivateKeepAwake('gnosis'); keepAwakeActiveRef.current = false; } catch {}
      }
    };
  }, []);

  // ─── Frequency audio URL helper ─────────────────────────
  function getFrequencyAudioUrl(freqId: string): string | null {
    return null;
  }

  // ═══════════════════════════════════════════════════════════
  // RENDER: SETUP SCREEN
  // ═══════════════════════════════════════════════════════════
  if (mode === 'setup') {
    return (
      <View style={s.container}>
        <ScrollView contentContainerStyle={s.setupScroll} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={s.header}>
            <Pressable onPress={onBack} style={({ pressed }) => [s.backBtn, pressed && { opacity: 0.6 }]}>
              <Text style={s.backText}>← Back</Text>
            </Pressable>
            <Text style={s.title}>GNOSIS</Text>
            <Text style={s.subtitle}>PSYCHOACOUSTIC FREQUENCY MEDITATION</Text>
          </View>

          {/* Active Bindrune Display */}
          <View style={s.runeSection}>
            <Text style={s.sectionLabel}>ACTIVE BINDRUNE</Text>
            {bindruneData && activeRune ? (
              <View style={s.runePreview}>
                <View style={s.runeGlow}>
                  <BindruneSVG data={bindruneData} size={160} glowColor="#D4AF37" />
                </View>
                <Text style={s.runeName}>{activeRune.name}</Text>
                <Text style={s.runeRunes}>{activeRune.runeNames.join(' · ')}</Text>
              </View>
            ) : (
              <View style={s.noRuneBox}>
                <Text style={s.noRuneIcon}>◇</Text>
                <Text style={s.noRuneText}>No active Bindrune</Text>
                <Text style={s.noRuneHint}>Forge one in the Arsenal to focus on during Gnosis</Text>
              </View>
            )}
          </View>

          {/* Frequency Selector */}
          <View style={s.freqSection}>
            <Text style={s.sectionLabel}>FREQUENCY</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.freqScroll}>
              {FREQUENCIES.map((freq) => {
                const isSelected = freq.id === selectedFreq.id;
                return (
                  <Pressable
                    key={freq.id}
                    onPress={() => {
                      setSelectedFreq(freq);
                      if (Platform.OS !== ('web' as string)) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                    style={({ pressed }) => [
                      s.freqCard,
                      isSelected && { borderColor: freq.color, backgroundColor: freq.color + '12' },
                      pressed && { opacity: 0.7 },
                    ]}
                  >
                    <View style={[s.freqDot, { backgroundColor: freq.color }]} />
                    <Text style={[s.freqName, isSelected && { color: freq.color }]}>{freq.name}</Text>
                    <Text style={[s.freqHz, isSelected && { color: freq.color + 'CC' }]}>{freq.frequency}</Text>
                    <Text style={s.freqDesc}>{freq.description}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          {/* Duration Picker */}
          <View style={s.durationSection}>
            <Text style={s.sectionLabel}>DURATION</Text>
            <View style={s.durationRow}>
              {DURATION_PRESETS.map((min) => {
                const isSelected = min === durationMin;
                return (
                  <Pressable
                    key={min}
                    onPress={() => {
                      setDurationMin(min);
                      if (Platform.OS !== ('web' as string)) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                    style={({ pressed }) => [
                      s.durationPill,
                      isSelected && s.durationPillActive,
                      pressed && { opacity: 0.7 },
                    ]}
                  >
                    <Text style={[s.durationText, isSelected && s.durationTextActive]}>
                      {min}m
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Start Button */}
          <Pressable
            onPress={handleStart}
            style={({ pressed }) => [s.startBtn, pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] }]}
          >
            <Text style={s.startBtnText}>ENTER GNOSIS</Text>
          </Pressable>
        </ScrollView>
      </View>
    );
  }

  // ═══════════════════════════════════════════════════════════
  // RENDER: ACTIVE TRANCE MODE
  // ═══════════════════════════════════════════════════════════
  if (mode === 'active') {
    // Determine aura color based on frequency
    const auraColor = selectedFreq.id === 'solar' ? '#D4AF37' : selectedFreq.id === 'mars' ? '#EF4444' : '#1E3A8A';

    return (
      <View style={s.container}>
        <View style={s.tranceContainer}>
          {/* Soft radial aura – outermost ring (very diffused) */}
          <Animated.View
            style={[
              s.auraRing1,
              { backgroundColor: auraColor },
              auraStyle,
            ]}
          />
          {/* Mid aura ring */}
          <Animated.View
            style={[
              s.auraRing2,
              { backgroundColor: auraColor },
              auraStyle2,
            ]}
          />
          {/* Inner aura ring */}
          <Animated.View
            style={[
              s.auraRing3,
              { backgroundColor: auraColor },
              auraStyle3,
            ]}
          />

          {/* Bindrune – glowing in the void */}
          <Animated.View style={[s.tranceRuneContainer, runeGlowStyle, { overflow: 'visible' as const }]}>
            <View style={s.tranceRuneShadow}>
              {bindruneData ? (
                <BindruneSVG data={bindruneData} size={SW * 0.55} glowColor="#D4AF37" />
              ) : (
                <View style={s.trancePlaceholder}>
                  <Text style={s.trancePlaceholderText}>✦</Text>
                </View>
              )}
            </View>
          </Animated.View>

          {/* Frequency Label – readable, elegant */}
          <Text style={s.tranceFreqLabel}>
            {selectedFreq.name.toUpperCase()} · {selectedFreq.frequency}
          </Text>

          {/* Timer – large, prominent */}
          <View style={s.timerContainer}>
            <Text style={s.timerText}>{formatTime(remainingSec)}</Text>
          </View>

          {/* Exit Button – ghost style */}
          <Pressable
            onPress={() => {
              handleExit();
            }}
            style={({ pressed }) => [s.exitBtn, pressed && { opacity: 0.4 }]}
          >
            <Text style={s.exitBtnText}>END SESSION</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // ═══════════════════════════════════════════════════════════
  // RENDER: COMPLETION (Journal capture handled by parent)
  // ═══════════════════════════════════════════════════════════
  return (
    <View style={s.container}>
      <View style={s.completeContainer}>
        <Text style={s.completeIcon}>✦</Text>
        <Text style={s.completeTitle}>GNOSIS COMPLETE</Text>
        <Text style={s.completeSubtitle}>
          {durationMin} minutes · {selectedFreq.name}
        </Text>

        {!showPostRitualCapture && (
          <Pressable
            onPress={() => {
              setMode('setup');
              onBack();
            }}
            style={({ pressed }) => [s.returnBtn, pressed && { opacity: 0.7 }]}
          >
            <Text style={s.returnBtnText}>Return to Sanctum</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════
const AURA_SIZE = SW * 1.2;

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050505',
  },

  // ─── Setup ────────────────────────────────────────────
  setupScroll: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  backBtn: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
    marginBottom: 12,
  },
  backText: {
    fontFamily: 'JetBrainsMono',
    fontSize: 13,
    color: '#6B6B6B',
    letterSpacing: 0.5,
  },
  title: {
    fontFamily: 'Cinzel',
    fontSize: 28,
    color: '#D4AF37',
    letterSpacing: 6,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: 'JetBrainsMono',
    fontSize: 10,
    color: '#A3A3A3',
    letterSpacing: 2,
    marginTop: 6,
    textAlign: 'center',
    textTransform: 'uppercase',
  },

  // ─── Section Labels ───────────────────────────────────
  sectionLabel: {
    fontFamily: 'JetBrainsMono',
    fontSize: 10,
    color: '#555',
    letterSpacing: 2,
    marginBottom: 12,
  },

  // ─── Rune Section ─────────────────────────────────────
  runeSection: {
    marginBottom: 28,
  },
  runePreview: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  runeGlow: {
    alignItems: 'center',
    shadowColor: '#D4AF37',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 25,
    elevation: 15,
  },
  runeName: {
    fontFamily: 'Cinzel',
    fontSize: 16,
    color: '#D4AF37',
    marginTop: 14,
    letterSpacing: 2,
  },
  runeRunes: {
    fontFamily: 'JetBrainsMono',
    fontSize: 11,
    color: '#6B6B6B',
    marginTop: 4,
    letterSpacing: 1,
  },
  noRuneBox: {
    alignItems: 'center',
    paddingVertical: 32,
    borderWidth: 1,
    borderColor: '#1A1A1A',
    borderRadius: 12,
    borderStyle: 'dashed',
  },
  noRuneIcon: {
    fontSize: 32,
    color: '#333',
    marginBottom: 8,
  },
  noRuneText: {
    fontFamily: 'Cinzel',
    fontSize: 14,
    color: '#555',
  },
  noRuneHint: {
    fontFamily: 'JetBrainsMono',
    fontSize: 10,
    color: '#444',
    marginTop: 4,
    textAlign: 'center',
    paddingHorizontal: 20,
  },

  // ─── Frequency Selector ───────────────────────────────
  freqSection: {
    marginBottom: 28,
  },
  freqScroll: {
    gap: 12,
    paddingRight: 20,
  },
  freqCard: {
    width: 140,
    paddingVertical: 16,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#222',
    backgroundColor: '#0A0A0A',
  },
  freqDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginBottom: 10,
  },
  freqName: {
    fontFamily: 'Cinzel',
    fontSize: 13,
    color: '#AAA',
    marginBottom: 2,
  },
  freqHz: {
    fontFamily: 'JetBrainsMono',
    fontSize: 11,
    color: '#666',
    marginBottom: 6,
  },
  freqDesc: {
    fontFamily: 'JetBrainsMono',
    fontSize: 9,
    color: '#444',
    letterSpacing: 0.5,
  },

  // ─── Duration Picker ──────────────────────────────────
  durationSection: {
    marginBottom: 32,
  },
  durationRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  durationPill: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#222',
    backgroundColor: '#0A0A0A',
  },
  durationPillActive: {
    borderColor: '#D4AF37',
    backgroundColor: '#D4AF3715',
  },
  durationText: {
    fontFamily: 'JetBrainsMono',
    fontSize: 14,
    color: '#6B6B6B',
  },
  durationTextActive: {
    color: '#D4AF37',
  },

  // ─── Start Button ─────────────────────────────────────
  startBtn: {
    backgroundColor: '#D4AF37',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  startBtnText: {
    fontFamily: 'Cinzel',
    fontSize: 16,
    color: '#050505',
    letterSpacing: 3,
    fontWeight: '700',
  },

  // ─── Trance Mode ──────────────────────────────────────
  tranceContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#050505',
  },

  // Soft radial aura layers – concentric, no hard edges
  auraRing1: {
    position: 'absolute',
    width: AURA_SIZE,
    height: AURA_SIZE,
    borderRadius: AURA_SIZE / 2,
  },
  auraRing2: {
    position: 'absolute',
    width: AURA_SIZE * 0.7,
    height: AURA_SIZE * 0.7,
    borderRadius: (AURA_SIZE * 0.7) / 2,
  },
  auraRing3: {
    position: 'absolute',
    width: AURA_SIZE * 0.45,
    height: AURA_SIZE * 0.45,
    borderRadius: (AURA_SIZE * 0.45) / 2,
  },

  tranceRuneContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    overflow: 'visible',
    // Extra padding so SVG glow layers can dissipate without clipping
    padding: 40,
  },
  tranceRuneShadow: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    overflow: 'visible',
    // Native drop shadow for bloom on iOS
    shadowColor: '#D4AF37',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 30,
    elevation: 20,
  },
  trancePlaceholder: {
    width: SW * 0.5,
    height: SW * 0.7,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  trancePlaceholderText: {
    fontSize: 80,
    color: '#D4AF37',
  },

  // Frequency label – JetBrainsMono, all caps, centered
  tranceFreqLabel: {
    fontFamily: 'JetBrainsMono',
    fontSize: 12,
    color: '#A3A3A3',
    letterSpacing: 2,
    marginTop: 32,
    textAlign: 'center',
    textTransform: 'uppercase',
  },

  // Timer – large, prominent
  timerContainer: {
    position: 'absolute',
    bottom: 110,
    alignItems: 'center',
  },
  timerText: {
    fontFamily: 'JetBrainsMono',
    fontSize: 42,
    color: '#E0E0E0',
    letterSpacing: 6,
  },

  // Exit button – ghost style (no fill, dark border)
  exitBtn: {
    position: 'absolute',
    bottom: 52,
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 8,
    backgroundColor: 'transparent',
  },
  exitBtnText: {
    fontFamily: 'JetBrainsMono',
    fontSize: 11,
    color: '#666',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },

  // ─── Completion ───────────────────────────────────────
  completeContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  completeIcon: {
    fontSize: 48,
    color: '#D4AF37',
    marginBottom: 16,
  },
  completeTitle: {
    fontFamily: 'Cinzel',
    fontSize: 22,
    color: '#D4AF37',
    letterSpacing: 4,
    marginBottom: 8,
  },
  completeSubtitle: {
    fontFamily: 'JetBrainsMono',
    fontSize: 12,
    color: '#6B6B6B',
    letterSpacing: 1,
    marginBottom: 32,
  },
  returnBtn: {
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderWidth: 1,
    borderColor: '#D4AF37',
    borderRadius: 8,
  },
  returnBtnText: {
    fontFamily: 'Cinzel',
    fontSize: 14,
    color: '#D4AF37',
    letterSpacing: 2,
  },
});
