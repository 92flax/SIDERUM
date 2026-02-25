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

// ─── Bindrune SVG Renderer ─────────────────────────────────
const STROKE_COLOR = '#D4AF37';
const STROKE_WIDTH = 2.5;
const SPINE_WIDTH = 3.5;

function BindruneSVG({ data, size, glowColor }: { data: BindruneRenderData; size: number; glowColor: string }) {
  const scale = size / data.width;
  const h = data.height * scale;

  return (
    <Svg width={size} height={h} viewBox={`0 0 ${data.width} ${data.height}`}>
      <Rect width={data.width} height={data.height} fill="transparent" />
      {/* Glow layer */}
      <G opacity={0.35}>
        <Line
          x1={data.cx} y1={data.staveTop} x2={data.cx} y2={data.staveBottom}
          stroke={glowColor} strokeWidth={SPINE_WIDTH + 8} strokeLinecap="square"
        />
        {data.lines.map((l) => (
          <Line key={`g-${l.key}`} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2}
            stroke={glowColor} strokeWidth={STROKE_WIDTH + 6} strokeLinecap="round" />
        ))}
        {data.paths.map((p) => (
          <Path key={`g-${p.key}`} d={p.d} stroke={glowColor} strokeWidth={STROKE_WIDTH + 6}
            fill="none" strokeLinecap="round" />
        ))}
      </G>
      {/* Mid glow */}
      <G opacity={0.6}>
        <Line
          x1={data.cx} y1={data.staveTop} x2={data.cx} y2={data.staveBottom}
          stroke={glowColor} strokeWidth={SPINE_WIDTH + 3} strokeLinecap="square"
        />
        {data.lines.map((l) => (
          <Line key={`m-${l.key}`} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2}
            stroke={glowColor} strokeWidth={STROKE_WIDTH + 3} strokeLinecap="round" />
        ))}
        {data.paths.map((p) => (
          <Path key={`m-${p.key}`} d={p.d} stroke={glowColor} strokeWidth={STROKE_WIDTH + 3}
            fill="none" strokeLinecap="round" />
        ))}
      </G>
      {/* Crisp layer */}
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
      {/* Core highlight */}
      <G opacity={0.5}>
        <Line
          x1={data.cx} y1={data.staveTop} x2={data.cx} y2={data.staveBottom}
          stroke="#FFFFFF" strokeWidth={1.5} strokeLinecap="round"
        />
        {data.lines.map((l) => (
          <Line key={`c-${l.key}`} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2}
            stroke="#FFFFFF" strokeWidth={1} strokeLinecap="round" />
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

  // ─── Reanimated pulsing (4s in, 4s out) ─────────────────
  const pulseScale = useSharedValue(1);
  const pulseOpacity = useSharedValue(0.8);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
    opacity: pulseOpacity.value,
  }));

  const startPulse = useCallback(() => {
    pulseScale.value = withRepeat(
      withSequence(
        withTiming(1.06, { duration: 4000, easing: Easing.inOut(Easing.ease) }),
        withTiming(1.0, { duration: 4000, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
    pulseOpacity.value = withRepeat(
      withSequence(
        withTiming(1.0, { duration: 4000, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.7, { duration: 4000, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
  }, []);

  const stopPulse = useCallback(() => {
    cancelAnimation(pulseScale);
    cancelAnimation(pulseOpacity);
    pulseScale.value = withTiming(1, { duration: 300 });
    pulseOpacity.value = withTiming(1, { duration: 300 });
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
      // Use a placeholder URL – in production, replace with actual frequency audio files
      // For now, we create a silent player that represents the frequency
      // The actual audio files would be hosted and referenced here
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
    // Use a default location for planetary hour calculation
    const defaultLoc = { latitude: 51.5074, longitude: -0.1278 }; // London fallback
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
  // Placeholder: In production, host actual binaural beat files
  // and return their URLs here based on frequency ID
  function getFrequencyAudioUrl(freqId: string): string | null {
    // These would be real hosted audio URLs in production
    // For now, return null to gracefully skip audio
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
            <Text style={s.subtitle}>Psychoacoustic Frequency Meditation</Text>
          </View>

          {/* Active Bindrune Display */}
          <View style={s.runeSection}>
            <Text style={s.sectionLabel}>ACTIVE BINDRUNE</Text>
            {bindruneData && activeRune ? (
              <View style={s.runePreview}>
                <View style={[s.runeGlow, { shadowColor: selectedFreq.color }]}>
                  <BindruneSVG data={bindruneData} size={160} glowColor={selectedFreq.color} />
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
    return (
      <View style={s.container}>
        <View style={s.tranceContainer}>
          {/* Nebula Glow Background */}
          <Animated.View
            style={[
              s.nebulaGlow,
              { backgroundColor: selectedFreq.color },
              pulseStyle,
            ]}
          />

          {/* Pulsing Bindrune */}
          <Animated.View style={[s.tranceRuneContainer, pulseStyle]}>
            {bindruneData ? (
              <BindruneSVG data={bindruneData} size={SW * 0.55} glowColor={selectedFreq.color} />
            ) : (
              <View style={s.trancePlaceholder}>
                <Text style={[s.trancePlaceholderText, { color: selectedFreq.color }]}>✦</Text>
              </View>
            )}
          </Animated.View>

          {/* Frequency Label */}
          <Text style={[s.tranceFreqLabel, { color: selectedFreq.color + '99' }]}>
            {selectedFreq.name} · {selectedFreq.frequency}
          </Text>

          {/* Timer */}
          <View style={s.timerContainer}>
            <Text style={s.timerText}>{formatTime(remainingSec)}</Text>
          </View>

          {/* Exit Button */}
          <Pressable
            onPress={() => {
              handleExit();
            }}
            style={({ pressed }) => [s.exitBtn, pressed && { opacity: 0.6 }]}
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
    fontSize: 11,
    color: '#555',
    letterSpacing: 1,
    marginTop: 6,
    textAlign: 'center',
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
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 30,
    elevation: 10,
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
  },
  nebulaGlow: {
    position: 'absolute',
    width: SW * 0.8,
    height: SW * 0.8,
    borderRadius: SW * 0.4,
    opacity: 0.08,
  },
  tranceRuneContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  trancePlaceholder: {
    width: SW * 0.5,
    height: SW * 0.7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trancePlaceholderText: {
    fontSize: 80,
  },
  tranceFreqLabel: {
    fontFamily: 'JetBrainsMono',
    fontSize: 11,
    letterSpacing: 2,
    marginTop: 30,
  },
  timerContainer: {
    position: 'absolute',
    bottom: 100,
    alignItems: 'center',
  },
  timerText: {
    fontFamily: 'JetBrainsMono',
    fontSize: 32,
    color: '#FFFFFF',
    letterSpacing: 4,
    opacity: 0.6,
  },
  exitBtn: {
    position: 'absolute',
    bottom: 50,
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 8,
  },
  exitBtnText: {
    fontFamily: 'JetBrainsMono',
    fontSize: 11,
    color: '#555',
    letterSpacing: 2,
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
