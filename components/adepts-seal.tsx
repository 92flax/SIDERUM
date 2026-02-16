// ============================================================
// ÆONIS – Adept's Seal Onboarding
// First-launch: Intention input → Master Rune generation → Infuse (tap & hold)
// ============================================================

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Text, View, StyleSheet, Pressable, TextInput, Dimensions,
  Platform, Animated, Easing,
} from 'react-native';
import Svg, { Line, Path, Circle } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { ELDER_FUTHARK, generateBindruneData } from '@/lib/runes/futhark';
import { useRuneWalletStore } from '@/lib/store/rune-wallet';

const { width: SW, height: SH } = Dimensions.get('window');
const RUNE_SIZE = Math.min(SW * 0.65, 280);

// Intention → Rune keyword mapping
const INTENTION_KEYWORDS: Record<string, string[]> = {
  protection: ['protection', 'defense', 'shield', 'safety', 'warding'],
  wealth: ['wealth', 'prosperity', 'abundance', 'success', 'fortune'],
  wisdom: ['wisdom', 'knowledge', 'insight', 'divination', 'mystery'],
  love: ['love', 'partnership', 'joy', 'harmony', 'fertility'],
  power: ['power', 'strength', 'courage', 'victory', 'force'],
  healing: ['healing', 'health', 'wholeness', 'renewal', 'growth'],
  transformation: ['transformation', 'change', 'journey', 'evolution', 'rebirth'],
};

function matchRunesForIntention(intention: string): typeof ELDER_FUTHARK[number][] {
  const lower = intention.toLowerCase().trim();

  // Find matching keyword category
  let bestKeywords: string[] = [];
  for (const [category, keywords] of Object.entries(INTENTION_KEYWORDS)) {
    if (lower.includes(category) || keywords.some(k => lower.includes(k))) {
      bestKeywords = keywords;
      break;
    }
  }

  // If no category match, use the raw words
  if (bestKeywords.length === 0) {
    bestKeywords = lower.split(/\s+/).filter(w => w.length > 2);
  }

  // Score each rune by keyword overlap
  const scored = ELDER_FUTHARK.map(rune => {
    let score = 0;
    for (const kw of rune.keywords) {
      if (bestKeywords.some(bk => kw.includes(bk) || bk.includes(kw))) {
        score += 3;
      }
    }
    // Add a small deterministic hash based on intention + rune name for variety
    const hash = (intention.length * rune.name.charCodeAt(0)) % 10;
    score += hash * 0.1;
    return { rune, score };
  });

  scored.sort((a, b) => b.score - a.score);

  // Pick top 3 unique runes
  return scored.slice(0, 3).map(s => s.rune);
}

type SealPhase = 'intention' | 'generating' | 'reveal' | 'infuse' | 'complete';

export function AdeptsSeal({ onComplete }: { onComplete: () => void }) {
  const [phase, setPhase] = useState<SealPhase>('intention');
  const [intention, setIntention] = useState('');
  const [selectedRunes, setSelectedRunes] = useState<typeof ELDER_FUTHARK[number][]>([]);
  const [infuseProgress, setInfuseProgress] = useState(0);
  const infuseTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const setMasterRune = useRuneWalletStore((s) => s.setMasterRune);
  const completeSeal = useRuneWalletStore((s) => s.completeSeal);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.5)).current;
  const glowAnim = useRef(new Animated.Value(0.3)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, [phase]);

  // Glow pulse animation for reveal/infuse
  useEffect(() => {
    if (phase === 'reveal' || phase === 'infuse') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, { toValue: 1, duration: 1500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(glowAnim, { toValue: 0.3, duration: 1500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ])
      ).start();
    }
  }, [phase]);

  // Generation animation
  useEffect(() => {
    if (phase === 'generating') {
      Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 3000,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      ).start();

      // After 2.5s, reveal the rune
      const timer = setTimeout(() => {
        setPhase('reveal');
        fadeAnim.setValue(0);
        Animated.spring(scaleAnim, { toValue: 1, damping: 12, useNativeDriver: true }).start();
        Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
        if (Platform.OS !== 'web') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [phase]);

  const handleGenerateRune = useCallback(() => {
    if (!intention.trim()) return;
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    const runes = matchRunesForIntention(intention);
    setSelectedRunes(runes);
    setPhase('generating');
    fadeAnim.setValue(0);
    scaleAnim.setValue(0.5);
  }, [intention]);

  const handleInfuseStart = useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }
    setPhase('infuse');
    setInfuseProgress(0);

    let progress = 0;
    infuseTimerRef.current = setInterval(() => {
      progress += 2;
      setInfuseProgress(progress);

      if (progress % 20 === 0 && Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }

      if (progress >= 100) {
        if (infuseTimerRef.current) clearInterval(infuseTimerRef.current);
        if (Platform.OS !== 'web') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        setPhase('complete');
      }
    }, 60); // ~3 seconds total
  }, []);

  const handleInfuseEnd = useCallback(() => {
    if (infuseTimerRef.current) {
      clearInterval(infuseTimerRef.current);
      infuseTimerRef.current = null;
    }
    if (infuseProgress < 100) {
      setInfuseProgress(0);
      setPhase('reveal');
    }
  }, [infuseProgress]);

  const handleComplete = useCallback(async () => {
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    // Save Master Rune to wallet
    await setMasterRune({
      name: `Seal of ${intention.trim()}`,
      runeNames: selectedRunes.map(r => r.name),
      keywords: selectedRunes.flatMap(r => r.keywords).slice(0, 6),
      intention: intention.trim(),
    });
    await completeSeal();
    onComplete();
  }, [intention, selectedRunes, onComplete]);

  // Generate bindrune SVG data
  const bindrune = selectedRunes.length > 0
    ? generateBindruneData(selectedRunes, RUNE_SIZE, RUNE_SIZE * 1.4)
    : null;

  const rotateInterp = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  // ========== INTENTION PHASE ==========
  if (phase === 'intention') {
    return (
      <View style={styles.container}>
        <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
          <Text style={styles.sealSymbol}>✦</Text>
          <Text style={styles.sealTitle}>The Adept's Seal</Text>
          <Text style={styles.sealSubtitle}>
            Speak your primary intention to forge your Master Rune.
          </Text>

          <View style={styles.intentionInputContainer}>
            <Text style={styles.inputLabel}>YOUR INTENTION</Text>
            <TextInput
              style={styles.intentionInput}
              placeholder="e.g. Protection, Wisdom, Transformation..."
              placeholderTextColor="#4A4A4A"
              value={intention}
              onChangeText={setIntention}
              returnKeyType="done"
              onSubmitEditing={handleGenerateRune}
              autoCapitalize="words"
              maxLength={50}
            />
          </View>

          <View style={styles.intentionSuggestions}>
            {['Protection', 'Wisdom', 'Power', 'Healing', 'Wealth', 'Love'].map(s => (
              <Pressable
                key={s}
                onPress={() => {
                  setIntention(s);
                  if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
                style={({ pressed }) => [
                  styles.suggestionChip,
                  intention === s && styles.suggestionChipActive,
                  pressed && { opacity: 0.7 },
                ]}
              >
                <Text style={[styles.suggestionText, intention === s && styles.suggestionTextActive]}>{s}</Text>
              </Pressable>
            ))}
          </View>

          <Pressable
            onPress={handleGenerateRune}
            disabled={!intention.trim()}
            style={({ pressed }) => [
              styles.forgeBtn,
              !intention.trim() && styles.forgeBtnDisabled,
              pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] },
            ]}
          >
            <Text style={[styles.forgeBtnText, !intention.trim() && { color: '#6B6B6B' }]}>
              Forge Master Rune
            </Text>
          </Pressable>
        </Animated.View>
      </View>
    );
  }

  // ========== GENERATING PHASE ==========
  if (phase === 'generating') {
    return (
      <View style={styles.container}>
        <Animated.View style={[styles.content, { transform: [{ rotate: rotateInterp }] }]}>
          <Text style={styles.generatingSymbol}>⟐</Text>
        </Animated.View>
        <Text style={styles.generatingText}>Forging your seal...</Text>
        <Text style={styles.generatingRunes}>
          {selectedRunes.map(r => r.symbol).join('  ')}
        </Text>
      </View>
    );
  }

  // ========== REVEAL / INFUSE / COMPLETE PHASE ==========
  return (
    <View style={styles.container}>
      <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
        {phase === 'complete' && <Text style={styles.completeTitle}>Seal Activated</Text>}
        {phase !== 'complete' && <Text style={styles.revealTitle}>Your Master Rune</Text>}

        <Text style={styles.revealIntention}>"{intention}"</Text>

        {/* Bindrune SVG */}
        <Animated.View style={[styles.runeContainer, { opacity: glowAnim }]}>
          <View style={[styles.runeGlow, phase === 'complete' && styles.runeGlowComplete]} />
        </Animated.View>
        <View style={styles.runeOverlay}>
          {bindrune && (
            <Svg width={RUNE_SIZE} height={RUNE_SIZE * 1.4} viewBox={`0 0 ${RUNE_SIZE} ${RUNE_SIZE * 1.4}`}>
              {/* Spine */}
              {bindrune.lines.map((line, i) => (
                <Line
                  key={`l${i}`}
                  x1={line.x1} y1={line.y1} x2={line.x2} y2={line.y2}
                  stroke={phase === 'complete' ? '#FFD700' : '#E0E0E0'}
                  strokeWidth={5}
                  strokeLinecap="square"
                />
              ))}
              {/* Rune paths */}
              {bindrune.paths.map((p, i) => (
                <Path
                  key={`p${i}`}
                  d={p.d}
                  stroke={phase === 'complete' ? '#FFD700' : '#E0E0E0'}
                  strokeWidth={5}
                  strokeLinecap="square"
                  strokeLinejoin="miter"
                  fill="none"
                  opacity={0.9}
                />
              ))}
              {/* Center dot */}
              <Circle
                cx={RUNE_SIZE / 2}
                cy={RUNE_SIZE * 0.7}
                r={4}
                fill={phase === 'complete' ? '#FFD700' : '#D4AF37'}
                opacity={0.6}
              />
            </Svg>
          )}
        </View>

        {/* Rune names */}
        <View style={styles.runeNameRow}>
          {selectedRunes.map(r => (
            <View key={r.name} style={styles.runeNameBadge}>
              <Text style={styles.runeNameSymbol}>{r.symbol}</Text>
              <Text style={styles.runeNameText}>{r.name}</Text>
            </View>
          ))}
        </View>

        {/* Infuse button / progress */}
        {phase === 'reveal' && (
          <Pressable
            onPressIn={handleInfuseStart}
            onPressOut={handleInfuseEnd}
            style={({ pressed }) => [styles.infuseBtn, pressed && { opacity: 0.9 }]}
          >
            <Text style={styles.infuseBtnText}>Hold to Infuse</Text>
            <Text style={styles.infuseHint}>Press and hold to activate your seal</Text>
          </Pressable>
        )}

        {phase === 'infuse' && (
          <Pressable
            onPressOut={handleInfuseEnd}
            style={styles.infuseBtn}
          >
            <View style={styles.infuseProgressBar}>
              <View style={[styles.infuseProgressFill, { width: `${infuseProgress}%` }]} />
            </View>
            <Text style={styles.infuseProgressText}>Infusing... {infuseProgress}%</Text>
          </Pressable>
        )}

        {phase === 'complete' && (
          <Pressable
            onPress={handleComplete}
            style={({ pressed }) => [styles.activateBtn, pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] }]}
          >
            <Text style={styles.activateBtnText}>Enter ÆONIS</Text>
          </Pressable>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1, backgroundColor: '#050505', justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 32,
  },
  content: { alignItems: 'center', width: '100%' },

  // Intention phase
  sealSymbol: { fontSize: 48, color: '#D4AF37', marginBottom: 16 },
  sealTitle: { fontFamily: 'Cinzel', fontSize: 26, color: '#D4AF37', letterSpacing: 4, textAlign: 'center' },
  sealSubtitle: { fontSize: 14, color: '#6B6B6B', textAlign: 'center', marginTop: 12, lineHeight: 22, paddingHorizontal: 16 },

  intentionInputContainer: { width: '100%', marginTop: 32 },
  inputLabel: { fontFamily: 'JetBrainsMono', fontSize: 10, color: '#6B6B6B', letterSpacing: 2, marginBottom: 8 },
  intentionInput: {
    backgroundColor: '#0D0D0D', borderWidth: 1, borderColor: '#D4AF3740',
    borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 16, color: '#E0E0E0', textAlign: 'center',
  },

  intentionSuggestions: {
    flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center',
    gap: 8, marginTop: 16,
  },
  suggestionChip: {
    borderWidth: 1, borderColor: '#1A1A1A', borderRadius: 16,
    paddingHorizontal: 14, paddingVertical: 6, backgroundColor: '#080808',
  },
  suggestionChipActive: { borderColor: '#D4AF3760', backgroundColor: '#D4AF3715' },
  suggestionText: { fontSize: 12, color: '#6B6B6B' },
  suggestionTextActive: { color: '#D4AF37' },

  forgeBtn: {
    backgroundColor: '#D4AF37', borderRadius: 24, paddingVertical: 14,
    paddingHorizontal: 40, marginTop: 32,
  },
  forgeBtnDisabled: { backgroundColor: '#1A1A1A' },
  forgeBtnText: { color: '#050505', fontSize: 15, fontWeight: '700', letterSpacing: 1 },

  // Generating phase
  generatingSymbol: { fontSize: 64, color: '#D4AF37' },
  generatingText: { fontSize: 16, color: '#E0E0E0', marginTop: 24, fontStyle: 'italic' },
  generatingRunes: { fontSize: 28, color: '#D4AF37', marginTop: 12, letterSpacing: 12 },

  // Reveal phase
  revealTitle: { fontFamily: 'Cinzel', fontSize: 18, color: '#E0E0E0', letterSpacing: 3, marginBottom: 4 },
  completeTitle: { fontFamily: 'Cinzel', fontSize: 22, color: '#FFD700', letterSpacing: 4, marginBottom: 4 },
  revealIntention: { fontSize: 14, color: '#D4AF37', fontStyle: 'italic', marginBottom: 20 },

  runeContainer: {
    width: RUNE_SIZE + 40, height: RUNE_SIZE * 1.4 + 40,
    justifyContent: 'center', alignItems: 'center',
    position: 'absolute', top: 60,
  },
  runeGlow: {
    width: RUNE_SIZE + 30, height: RUNE_SIZE * 1.4 + 30,
    borderRadius: 20, backgroundColor: '#D4AF3708',
    borderWidth: 1, borderColor: '#D4AF3720',
  },
  runeGlowComplete: {
    backgroundColor: '#FFD70015', borderColor: '#FFD70040',
  },
  runeOverlay: {
    width: RUNE_SIZE, height: RUNE_SIZE * 1.4,
    justifyContent: 'center', alignItems: 'center',
    marginTop: 0,
  },

  runeNameRow: { flexDirection: 'row', gap: 12, marginTop: 20 },
  runeNameBadge: {
    backgroundColor: '#0D0D0D', borderWidth: 1, borderColor: '#D4AF3730',
    borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, alignItems: 'center',
  },
  runeNameSymbol: { fontSize: 18, color: '#D4AF37' },
  runeNameText: { fontSize: 10, color: '#6B6B6B', marginTop: 2 },

  // Infuse
  infuseBtn: {
    backgroundColor: '#0D0D0D', borderWidth: 2, borderColor: '#D4AF3760',
    borderRadius: 24, paddingVertical: 16, paddingHorizontal: 40,
    marginTop: 28, alignItems: 'center', width: '100%',
  },
  infuseBtnText: { fontFamily: 'Cinzel', fontSize: 16, color: '#D4AF37', letterSpacing: 2 },
  infuseHint: { fontSize: 11, color: '#6B6B6B', marginTop: 4 },

  infuseProgressBar: {
    width: '100%', height: 4, backgroundColor: '#1A1A1A',
    borderRadius: 2, overflow: 'hidden', marginBottom: 8,
  },
  infuseProgressFill: { height: '100%', backgroundColor: '#D4AF37', borderRadius: 2 },
  infuseProgressText: { fontFamily: 'JetBrainsMono', fontSize: 12, color: '#D4AF37' },

  // Complete
  activateBtn: {
    backgroundColor: '#D4AF37', borderRadius: 24, paddingVertical: 14,
    paddingHorizontal: 40, marginTop: 28,
  },
  activateBtnText: { color: '#050505', fontSize: 16, fontWeight: '700', letterSpacing: 2 },
});
