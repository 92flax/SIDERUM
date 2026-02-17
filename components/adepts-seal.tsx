// ============================================================
// ÆONIS – Adept's Seal Onboarding (Digital Grimoire)
// Step 1: Identity — magic_name + Birth Data
// Step 2: Intention — Multi-select tags
// Step 3: The Forge — Generate Master Rune
// Step 4: Activation — Tap & Hold to Infuse
// ============================================================

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Text, View, StyleSheet, Pressable, TextInput, Dimensions,
  Platform, Animated, Easing, ScrollView, KeyboardAvoidingView,
} from 'react-native';
import Svg, { Line, Path, Circle } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ELDER_FUTHARK, generateBindruneData } from '@/lib/runes/futhark';
import { useRuneWalletStore } from '@/lib/store/rune-wallet';
import { useNatalStore, UserNatalData } from '@/lib/store/natal-store';
import { LEVEL_TITLES } from '@/lib/ritual/completion-handler';

const { width: SW } = Dimensions.get('window');
const RUNE_SIZE = Math.min(SW * 0.6, 260);

const ALL_INTENTIONS = [
  { key: 'protection', label: 'Protection', icon: '🛡' },
  { key: 'wisdom', label: 'Wisdom', icon: '📖' },
  { key: 'power', label: 'Power', icon: '⚡' },
  { key: 'healing', label: 'Healing', icon: '✦' },
  { key: 'wealth', label: 'Wealth', icon: '◆' },
  { key: 'love', label: 'Love', icon: '♡' },
  { key: 'transformation', label: 'Transformation', icon: '⟐' },
  { key: 'divination', label: 'Divination', icon: '☽' },
];

const INTENTION_KEYWORDS: Record<string, string[]> = {
  protection: ['protection', 'defense', 'shield', 'safety', 'warding'],
  wealth: ['wealth', 'prosperity', 'abundance', 'success', 'fortune'],
  wisdom: ['wisdom', 'knowledge', 'insight', 'divination', 'mystery'],
  love: ['love', 'partnership', 'joy', 'harmony', 'fertility'],
  power: ['power', 'strength', 'courage', 'victory', 'force'],
  healing: ['healing', 'health', 'wholeness', 'renewal', 'growth'],
  transformation: ['transformation', 'change', 'journey', 'evolution', 'rebirth'],
  divination: ['divination', 'insight', 'mystery', 'knowledge', 'wisdom'],
};

function matchRunesForIntentions(intentions: string[]): typeof ELDER_FUTHARK[number][] {
  const allKeywords: string[] = [];
  for (const intent of intentions) {
    const kws = INTENTION_KEYWORDS[intent] || [];
    allKeywords.push(...kws);
  }
  if (allKeywords.length === 0) allKeywords.push('protection', 'strength', 'wisdom');

  const scored = ELDER_FUTHARK.map(rune => {
    let score = 0;
    for (const kw of rune.keywords) {
      if (allKeywords.some(bk => kw.includes(bk) || bk.includes(kw))) score += 3;
    }
    const hash = (intentions.length * rune.name.charCodeAt(0)) % 10;
    score += hash * 0.1;
    return { rune, score };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, 3).map(s => s.rune);
}

type SealPhase = 'identity' | 'intentions' | 'generating' | 'reveal' | 'infuse' | 'complete';

export function AdeptsSeal({ onComplete }: { onComplete: () => void }) {
  const [phase, setPhase] = useState<SealPhase>('identity');
  const [magicName, setMagicName] = useState('');
  const [selectedIntentions, setSelectedIntentions] = useState<string[]>([]);
  const [selectedRunes, setSelectedRunes] = useState<typeof ELDER_FUTHARK[number][]>([]);
  const [infuseProgress, setInfuseProgress] = useState(0);
  const infuseTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Birth data
  const [birthDate, setBirthDate] = useState('');
  const [birthTime, setBirthTime] = useState('');
  const [birthPlace, setBirthPlace] = useState('');
  const [birthLat, setBirthLat] = useState('');
  const [birthLon, setBirthLon] = useState('');
  const [isGeocoding, setIsGeocoding] = useState(false);

  const setMasterRune = useRuneWalletStore((s) => s.setMasterRune);
  const completeSeal = useRuneWalletStore((s) => s.completeSeal);
  const setNatalData = useNatalStore((s) => s.setNatalData);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.5)).current;
  const glowAnim = useRef(new Animated.Value(0.3)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    fadeAnim.setValue(0);
    Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }).start();
  }, [phase]);

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

  useEffect(() => {
    if (phase === 'generating') {
      Animated.loop(
        Animated.timing(rotateAnim, { toValue: 1, duration: 3000, easing: Easing.linear, useNativeDriver: true })
      ).start();
      const timer = setTimeout(() => {
        setPhase('reveal');
        fadeAnim.setValue(0);
        Animated.spring(scaleAnim, { toValue: 1, damping: 12, useNativeDriver: true }).start();
        Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
        if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [phase]);

  const toggleIntention = useCallback((key: string) => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedIntentions(prev => {
      if (prev.includes(key)) return prev.filter(k => k !== key);
      if (prev.length >= 4) return prev;
      return [...prev, key];
    });
  }, []);

  const handleGeocodePlace = useCallback(async () => {
    if (!birthPlace.trim()) return;
    setIsGeocoding(true);
    try {
      const resp = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(birthPlace)}&limit=1`,
        { headers: { 'User-Agent': 'AEONIS-App/1.0' } }
      );
      const data = await resp.json();
      if (data.length > 0) {
        setBirthLat(parseFloat(data[0].lat).toFixed(4));
        setBirthLon(parseFloat(data[0].lon).toFixed(4));
      }
    } catch {}
    setIsGeocoding(false);
  }, [birthPlace]);

  const handleIdentityNext = useCallback(() => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    // Save birth data if provided
    if (birthDate && birthLat && birthLon) {
      const natalData: UserNatalData = {
        dateOfBirth: birthDate,
        timeOfBirth: birthTime || '12:00',
        placeOfBirth: birthPlace || 'Unknown',
        latitude: parseFloat(birthLat) || 0,
        longitude: parseFloat(birthLon) || 0,
      };
      setNatalData(natalData);
    }
    setPhase('intentions');
  }, [birthDate, birthTime, birthPlace, birthLat, birthLon]);

  const handleForge = useCallback(() => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const runes = matchRunesForIntentions(
      selectedIntentions.length > 0 ? selectedIntentions : ['protection']
    );
    setSelectedRunes(runes);
    setPhase('generating');
    scaleAnim.setValue(0.5);
  }, [selectedIntentions]);

  const handleSkip = useCallback(async () => {
    if (birthDate && birthLat && birthLon) {
      const natalData: UserNatalData = {
        dateOfBirth: birthDate,
        timeOfBirth: birthTime || '12:00',
        placeOfBirth: birthPlace || 'Unknown',
        latitude: parseFloat(birthLat) || 0,
        longitude: parseFloat(birthLon) || 0,
      };
      await setNatalData(natalData);
    }
    await completeSeal();
    onComplete();
  }, [birthDate, birthTime, birthPlace, birthLat, birthLon, onComplete]);

  const handleInfuseStart = useCallback(() => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setPhase('infuse');
    setInfuseProgress(0);
    let progress = 0;
    infuseTimerRef.current = setInterval(() => {
      progress += 2;
      setInfuseProgress(progress);
      if (progress % 20 === 0 && Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      if (progress >= 100) {
        if (infuseTimerRef.current) clearInterval(infuseTimerRef.current);
        if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setPhase('complete');
      }
    }, 60);
  }, []);

  const handleInfuseEnd = useCallback(() => {
    if (infuseTimerRef.current) { clearInterval(infuseTimerRef.current); infuseTimerRef.current = null; }
    if (infuseProgress < 100) { setInfuseProgress(0); setPhase('reveal'); }
  }, [infuseProgress]);

  const handleComplete = useCallback(async () => {
    if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const intentionLabel = selectedIntentions
      .map(k => ALL_INTENTIONS.find(i => i.key === k)?.label || k)
      .join(' & ');

    // Save magic name to AsyncStorage
    if (magicName.trim()) {
      await AsyncStorage.setItem('@aeonis_magic_name', magicName.trim());
    }
    await setMasterRune({
      name: `Seal of ${intentionLabel || 'Protection'}`,
      runeNames: selectedRunes.map(r => r.name),
      keywords: selectedRunes.flatMap(r => r.keywords).slice(0, 6),
      intention: intentionLabel || 'Protection',
    });
    await completeSeal();
    onComplete();
  }, [selectedIntentions, selectedRunes, onComplete]);

  const bindrune = selectedRunes.length > 0
    ? generateBindruneData(selectedRunes, RUNE_SIZE, RUNE_SIZE * 1.4)
    : null;

  const rotateInterp = rotateAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  // Step indicator
  const stepNum = phase === 'identity' ? 1 : phase === 'intentions' ? 2 : phase === 'generating' ? 3 : 4;
  const totalSteps = 4;

  // ========== STEP 1: IDENTITY ==========
  if (phase === 'identity') {
    return (
      <View style={styles.container}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, width: '100%' }}>
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
              {/* Skip */}
              <Pressable onPress={handleSkip} style={({ pressed }) => [styles.skipBtn, pressed && { opacity: 0.5 }]}>
                <Text style={styles.skipBtnText}>Skip</Text>
              </Pressable>

              {/* Step indicator */}
              <View style={styles.stepIndicator}>
                {[1, 2, 3, 4].map(s => (
                  <View key={s} style={[styles.stepDot, s === stepNum && styles.stepDotActive, s < stepNum && styles.stepDotDone]} />
                ))}
              </View>

              <Text style={styles.sealSymbol}>✦</Text>
              <Text style={styles.sealTitle}>Your Identity</Text>
              <Text style={styles.sealSubtitle}>
                Choose a magical name and enter your birth data{'\n'}for personalized transit calculations.
              </Text>

              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>MAGICAL NAME</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="e.g. Frater Lux, Soror Nox"
                  placeholderTextColor="#4A4A4A"
                  value={magicName}
                  onChangeText={setMagicName}
                  returnKeyType="next"
                  maxLength={64}
                  autoCapitalize="words"
                />
                <Text style={styles.inputHint}>This name appears on the leaderboard</Text>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>DATE OF BIRTH</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#4A4A4A"
                  value={birthDate}
                  onChangeText={setBirthDate}
                  keyboardType="numbers-and-punctuation"
                  returnKeyType="next"
                  maxLength={10}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>TIME OF BIRTH</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="HH:MM (24h format)"
                  placeholderTextColor="#4A4A4A"
                  value={birthTime}
                  onChangeText={setBirthTime}
                  keyboardType="numbers-and-punctuation"
                  returnKeyType="next"
                  maxLength={5}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>PLACE OF BIRTH</Text>
                <View style={styles.placeRow}>
                  <TextInput
                    style={[styles.formInput, { flex: 1 }]}
                    placeholder="e.g. Berlin, Germany"
                    placeholderTextColor="#4A4A4A"
                    value={birthPlace}
                    onChangeText={setBirthPlace}
                    returnKeyType="search"
                    onSubmitEditing={handleGeocodePlace}
                  />
                  <Pressable
                    onPress={handleGeocodePlace}
                    style={({ pressed }) => [styles.geocodeBtn, pressed && { opacity: 0.7 }]}
                  >
                    <Text style={styles.geocodeBtnText}>{isGeocoding ? '...' : '📍'}</Text>
                  </Pressable>
                </View>
                {birthLat && birthLon ? (
                  <Text style={styles.coordsText}>{birthLat}°N, {birthLon}°E</Text>
                ) : null}
              </View>

              <Pressable
                onPress={handleIdentityNext}
                style={({ pressed }) => [styles.forgeBtn, pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] }]}
              >
                <Text style={styles.forgeBtnText}>Continue</Text>
              </Pressable>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    );
  }

  // ========== STEP 2: INTENTIONS ==========
  if (phase === 'intentions') {
    return (
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
            <Pressable onPress={handleSkip} style={({ pressed }) => [styles.skipBtn, pressed && { opacity: 0.5 }]}>
              <Text style={styles.skipBtnText}>Skip</Text>
            </Pressable>

            <View style={styles.stepIndicator}>
              {[1, 2, 3, 4].map(s => (
                <View key={s} style={[styles.stepDot, s === 2 && styles.stepDotActive, s < 2 && styles.stepDotDone]} />
              ))}
            </View>

            <Text style={styles.sealSymbol}>⟐</Text>
            <Text style={styles.sealTitle}>Your Intentions</Text>
            <Text style={styles.sealSubtitle}>
              Choose up to 4 paths to forge your Master Rune.
            </Text>

            <View style={styles.intentionGrid}>
              {ALL_INTENTIONS.map(intent => {
                const isSelected = selectedIntentions.includes(intent.key);
                return (
                  <Pressable
                    key={intent.key}
                    onPress={() => toggleIntention(intent.key)}
                    style={({ pressed }) => [
                      styles.intentionCard,
                      isSelected && styles.intentionCardActive,
                      pressed && { opacity: 0.7, transform: [{ scale: 0.97 }] },
                    ]}
                  >
                    <Text style={styles.intentionIcon}>{intent.icon}</Text>
                    <Text style={[styles.intentionLabel, isSelected && styles.intentionLabelActive]}>
                      {intent.label}
                    </Text>
                    {isSelected && <View style={styles.checkMark}><Text style={styles.checkMarkText}>✓</Text></View>}
                  </Pressable>
                );
              })}
            </View>

            <Pressable
              onPress={handleForge}
              style={({ pressed }) => [styles.forgeBtn, pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] }]}
            >
              <Text style={styles.forgeBtnText}>
                {selectedIntentions.length > 0 ? `Forge Rune (${selectedIntentions.length} selected)` : 'Forge Rune'}
              </Text>
            </Pressable>

            <Pressable onPress={handleSkip} style={({ pressed }) => [styles.skipRuneBtn, pressed && { opacity: 0.5 }]}>
              <Text style={styles.skipRuneBtnText}>Skip Rune Creation</Text>
            </Pressable>
          </Animated.View>
        </ScrollView>
      </View>
    );
  }

  // ========== STEP 3: GENERATING ==========
  if (phase === 'generating') {
    return (
      <View style={styles.container}>
        <View style={styles.stepIndicator}>
          {[1, 2, 3, 4].map(s => (
            <View key={s} style={[styles.stepDot, s === 3 && styles.stepDotActive, s < 3 && styles.stepDotDone]} />
          ))}
        </View>
        <Animated.View style={[styles.content, { transform: [{ rotate: rotateInterp }] }]}>
          <Text style={styles.generatingSymbol}>⟐</Text>
        </Animated.View>
        <Text style={styles.generatingText}>Forging your seal...</Text>
        <Text style={styles.generatingRunes}>{selectedRunes.map(r => r.symbol).join('  ')}</Text>
      </View>
    );
  }

  // ========== STEP 4: REVEAL / INFUSE / COMPLETE ==========
  const intentionLabel = selectedIntentions
    .map(k => ALL_INTENTIONS.find(i => i.key === k)?.label || k)
    .join(' & ') || 'Protection';

  return (
    <View style={styles.container}>
      <View style={styles.stepIndicator}>
        {[1, 2, 3, 4].map(s => (
          <View key={s} style={[styles.stepDot, s === 4 && styles.stepDotActive, s < 4 && styles.stepDotDone]} />
        ))}
      </View>

      <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
        {phase === 'complete' && <Text style={styles.completeTitle}>Seal Activated</Text>}
        {phase !== 'complete' && <Text style={styles.revealTitle}>Your Master Rune</Text>}

        <Text style={styles.revealIntention}>"{intentionLabel}"</Text>

        {magicName.trim() !== '' && (
          <Text style={styles.magicNameDisplay}>{magicName}</Text>
        )}

        <Animated.View style={[styles.runeContainer, { opacity: glowAnim }]}>
          <View style={[styles.runeGlow, phase === 'complete' && styles.runeGlowComplete]} />
        </Animated.View>
        <View style={styles.runeOverlay}>
          {bindrune && (
            <Svg width={RUNE_SIZE} height={RUNE_SIZE * 1.4} viewBox={`0 0 ${RUNE_SIZE} ${RUNE_SIZE * 1.4}`}>
              {bindrune.lines.map((line, i) => (
                <Line
                  key={`l${i}`}
                  x1={line.x1} y1={line.y1} x2={line.x2} y2={line.y2}
                  stroke={phase === 'complete' ? '#FFD700' : '#E0E0E0'}
                  strokeWidth={5} strokeLinecap="square"
                />
              ))}
              {bindrune.paths.map((p, i) => (
                <Path
                  key={`p${i}`}
                  d={p.d}
                  stroke={phase === 'complete' ? '#FFD700' : '#E0E0E0'}
                  strokeWidth={5} strokeLinecap="square" strokeLinejoin="miter" fill="none" opacity={0.9}
                />
              ))}
              <Circle cx={RUNE_SIZE / 2} cy={RUNE_SIZE * 0.7} r={4} fill={phase === 'complete' ? '#FFD700' : '#D4AF37'} opacity={0.6} />
            </Svg>
          )}
        </View>

        <View style={styles.runeNameRow}>
          {selectedRunes.map(r => (
            <View key={r.name} style={styles.runeNameBadge}>
              <Text style={styles.runeNameSymbol}>{r.symbol}</Text>
              <Text style={styles.runeNameText}>{r.name}</Text>
            </View>
          ))}
        </View>

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
          <Pressable onPressOut={handleInfuseEnd} style={styles.infuseBtn}>
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
    paddingHorizontal: 24,
  },
  scrollContent: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60 },
  content: { alignItems: 'center', width: '100%' },

  // Step indicator
  stepIndicator: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  stepDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#333' },
  stepDotActive: { backgroundColor: '#D4AF37', width: 24 },
  stepDotDone: { backgroundColor: '#D4AF3760' },

  // Skip
  skipBtn: { position: 'absolute', top: -40, right: 0, paddingHorizontal: 16, paddingVertical: 8 },
  skipBtnText: { fontSize: 14, color: '#6B6B6B', letterSpacing: 1 },

  // Seal
  sealSymbol: { fontSize: 48, color: '#D4AF37', marginBottom: 16 },
  sealTitle: { fontFamily: 'Cinzel', fontSize: 24, color: '#D4AF37', letterSpacing: 4, textAlign: 'center' },
  sealSubtitle: { fontSize: 13, color: '#9B9B9B', textAlign: 'center', marginTop: 12, lineHeight: 22, paddingHorizontal: 8 },

  // Form
  formGroup: { width: '100%', marginTop: 16 },
  inputLabel: { fontFamily: 'JetBrainsMono', fontSize: 10, color: '#9B9B9B', letterSpacing: 2, marginBottom: 6 },
  inputHint: { fontSize: 11, color: '#6B6B6B', marginTop: 4, fontStyle: 'italic' },
  formInput: {
    backgroundColor: '#0D0D0D', borderWidth: 1, borderColor: '#333',
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: '#E0E0E0',
  },
  placeRow: { flexDirection: 'row', gap: 8 },
  geocodeBtn: {
    backgroundColor: '#0D0D0D', borderWidth: 1, borderColor: '#333',
    borderRadius: 10, width: 48, justifyContent: 'center', alignItems: 'center',
  },
  geocodeBtnText: { fontSize: 20 },
  coordsText: { fontFamily: 'JetBrainsMono', fontSize: 11, color: '#D4AF37', marginTop: 6 },

  // Intentions
  intentionGrid: {
    flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center',
    gap: 10, marginTop: 24, width: '100%',
  },
  intentionCard: {
    width: (SW - 78) / 2, backgroundColor: '#0D0D0D',
    borderWidth: 1, borderColor: '#1A1A1A', borderRadius: 14,
    paddingVertical: 16, paddingHorizontal: 12, alignItems: 'center', gap: 6,
  },
  intentionCardActive: { borderColor: '#D4AF3780', backgroundColor: '#D4AF3712' },
  intentionIcon: { fontSize: 24 },
  intentionLabel: { fontSize: 13, color: '#C0C0C0', fontWeight: '600' },
  intentionLabelActive: { color: '#D4AF37' },
  checkMark: {
    position: 'absolute', top: 6, right: 8,
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: '#D4AF37', justifyContent: 'center', alignItems: 'center',
  },
  checkMarkText: { fontSize: 12, color: '#050505', fontWeight: '700' },

  // Forge button
  forgeBtn: {
    backgroundColor: '#D4AF37', borderRadius: 24, paddingVertical: 14,
    paddingHorizontal: 40, marginTop: 28, width: '100%', alignItems: 'center',
  },
  forgeBtnText: { color: '#050505', fontSize: 15, fontWeight: '700', letterSpacing: 1 },

  // Skip rune
  skipRuneBtn: { marginTop: 16, paddingVertical: 8 },
  skipRuneBtnText: { fontSize: 13, color: '#6B6B6B', textDecorationLine: 'underline' },

  // Generating
  generatingSymbol: { fontSize: 64, color: '#D4AF37' },
  generatingText: { fontSize: 16, color: '#E0E0E0', marginTop: 24, fontStyle: 'italic' },
  generatingRunes: { fontSize: 28, color: '#D4AF37', marginTop: 12, letterSpacing: 12 },

  // Reveal
  revealTitle: { fontFamily: 'Cinzel', fontSize: 18, color: '#E0E0E0', letterSpacing: 3, marginBottom: 4 },
  completeTitle: { fontFamily: 'Cinzel', fontSize: 22, color: '#FFD700', letterSpacing: 4, marginBottom: 4 },
  revealIntention: { fontSize: 14, color: '#D4AF37', fontStyle: 'italic', marginBottom: 8 },
  magicNameDisplay: {
    fontFamily: 'Cinzel', fontSize: 14, color: '#E0E0E080', letterSpacing: 2, marginBottom: 12,
  },

  runeContainer: {
    width: RUNE_SIZE + 40, height: RUNE_SIZE * 1.4 + 40,
    justifyContent: 'center', alignItems: 'center', position: 'absolute', top: 80,
  },
  runeGlow: {
    width: RUNE_SIZE + 30, height: RUNE_SIZE * 1.4 + 30,
    borderRadius: 20, backgroundColor: '#D4AF3708', borderWidth: 1, borderColor: '#D4AF3720',
  },
  runeGlowComplete: { backgroundColor: '#FFD70015', borderColor: '#FFD70040' },
  runeOverlay: { width: RUNE_SIZE, height: RUNE_SIZE * 1.4, justifyContent: 'center', alignItems: 'center' },

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
    width: '100%', height: 4, backgroundColor: '#1A1A1A', borderRadius: 2, overflow: 'hidden', marginBottom: 8,
  },
  infuseProgressFill: { height: '100%', backgroundColor: '#D4AF37', borderRadius: 2 },
  infuseProgressText: { fontFamily: 'JetBrainsMono', fontSize: 12, color: '#D4AF37' },

  // Complete
  activateBtn: {
    backgroundColor: '#D4AF37', borderRadius: 24, paddingVertical: 14, paddingHorizontal: 40, marginTop: 28,
  },
  activateBtnText: { color: '#050505', fontSize: 16, fontWeight: '700', letterSpacing: 2 },
});
