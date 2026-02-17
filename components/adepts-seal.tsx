// ============================================================
// ÆONIS – Adept's Seal Onboarding (Simplified 3-Step)
// Step 1: Identity — magic_name + Birth Data
// Step 2: The Forge — Generate & Preview Master Rune
// Step 3: Save — Confirm and enter the app
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

const { width: SW } = Dimensions.get('window');
const RUNE_SIZE = Math.min(SW * 0.6, 260);

// Match runes based on birth date numerology (deterministic)
function matchRunesFromBirthDate(birthDate: string): typeof ELDER_FUTHARK[number][] {
  // Use date digits to deterministically pick 3 runes
  const digits = birthDate.replace(/\D/g, '');
  if (digits.length < 4) {
    // Fallback: first 3 runes
    return ELDER_FUTHARK.slice(0, 3);
  }
  const seed = digits.split('').reduce((acc, d) => acc + parseInt(d, 10), 0);
  const indices = [
    seed % ELDER_FUTHARK.length,
    (seed * 7 + 3) % ELDER_FUTHARK.length,
    (seed * 13 + 11) % ELDER_FUTHARK.length,
  ];
  // Ensure unique
  const unique = [...new Set(indices)];
  while (unique.length < 3) {
    unique.push((unique[unique.length - 1] + 1) % ELDER_FUTHARK.length);
  }
  return unique.slice(0, 3).map(i => ELDER_FUTHARK[i]);
}

type SealPhase = 'identity' | 'forge' | 'save';

export function AdeptsSeal({ onComplete }: { onComplete: () => void }) {
  const [phase, setPhase] = useState<SealPhase>('identity');
  const [magicName, setMagicName] = useState('');
  const [selectedRunes, setSelectedRunes] = useState<typeof ELDER_FUTHARK[number][]>([]);

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

  useEffect(() => {
    fadeAnim.setValue(0);
    Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }).start();
  }, [phase]);

  useEffect(() => {
    if (phase === 'forge' || phase === 'save') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, { toValue: 1, duration: 1500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(glowAnim, { toValue: 0.3, duration: 1500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ])
      ).start();
    }
  }, [phase]);

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
    if (magicName.trim()) {
      await AsyncStorage.setItem('@aeonis_magic_name', magicName.trim());
    }
    await completeSeal();
    onComplete();
  }, [birthDate, birthTime, birthPlace, birthLat, birthLon, magicName, onComplete]);

  // ===== STEP 1 → STEP 2: Identity → Forge =====
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
    // Generate runes from birth date
    const runes = matchRunesFromBirthDate(birthDate || '2000-01-01');
    setSelectedRunes(runes);
    scaleAnim.setValue(0.5);
    // Animate rune reveal
    Animated.spring(scaleAnim, { toValue: 1, damping: 12, useNativeDriver: true }).start();
    setPhase('forge');
  }, [birthDate, birthTime, birthPlace, birthLat, birthLon]);

  // ===== STEP 2 → STEP 3: Forge → Save =====
  const handleForgeNext = useCallback(() => {
    if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setPhase('save');
  }, []);

  // ===== STEP 3: Save & Complete =====
  const handleSave = useCallback(async () => {
    if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    // Save magic name
    if (magicName.trim()) {
      await AsyncStorage.setItem('@aeonis_magic_name', magicName.trim());
    }

    // Save master rune
    const intentionLabel = selectedRunes.map(r => r.name).join(' & ');
    await setMasterRune({
      name: `Seal of ${intentionLabel || 'the Initiate'}`,
      runeNames: selectedRunes.map(r => r.name),
      keywords: selectedRunes.flatMap(r => r.keywords).slice(0, 6),
      intention: intentionLabel || 'Protection',
    });

    await completeSeal();
    onComplete();
  }, [magicName, selectedRunes, onComplete]);

  const bindrune = selectedRunes.length > 0
    ? generateBindruneData(selectedRunes, RUNE_SIZE, RUNE_SIZE * 1.4)
    : null;

  // Step indicator
  const stepNum = phase === 'identity' ? 1 : phase === 'forge' ? 2 : 3;

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
                {[1, 2, 3].map(s => (
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
                style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] }]}
              >
                <Text style={styles.primaryBtnText}>Continue</Text>
              </Pressable>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    );
  }

  // ========== STEP 2: THE FORGE ==========
  if (phase === 'forge') {
    return (
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
            <Pressable onPress={handleSkip} style={({ pressed }) => [styles.skipBtn, pressed && { opacity: 0.5 }]}>
              <Text style={styles.skipBtnText}>Skip</Text>
            </Pressable>

            <View style={styles.stepIndicator}>
              {[1, 2, 3].map(s => (
                <View key={s} style={[styles.stepDot, s === 2 && styles.stepDotActive, s < 2 && styles.stepDotDone]} />
              ))}
            </View>

            <Text style={styles.sealTitle}>Your Signature Rune</Text>
            <Text style={styles.sealSubtitle}>
              Forged from your birth data. This rune is uniquely yours.
            </Text>

            {magicName.trim() !== '' && (
              <Text style={styles.magicNameDisplay}>{magicName}</Text>
            )}

            {/* Rune display */}
            <Animated.View style={[styles.runeWrapper, { transform: [{ scale: scaleAnim }] }]}>
              <Animated.View style={[styles.runeGlowBg, { opacity: glowAnim }]} />
              <View style={styles.runeOverlay}>
                {bindrune && (
                  <Svg width={RUNE_SIZE} height={RUNE_SIZE * 1.4} viewBox={`0 0 ${RUNE_SIZE} ${RUNE_SIZE * 1.4}`}>
                    {bindrune.lines.map((line, i) => (
                      <Line
                        key={`l${i}`}
                        x1={line.x1} y1={line.y1} x2={line.x2} y2={line.y2}
                        stroke="#E0E0E0" strokeWidth={5} strokeLinecap="square"
                      />
                    ))}
                    {bindrune.paths.map((p, i) => (
                      <Path
                        key={`p${i}`}
                        d={p.d}
                        stroke="#E0E0E0" strokeWidth={5} strokeLinecap="square"
                        strokeLinejoin="miter" fill="none" opacity={0.9}
                      />
                    ))}
                    <Circle cx={RUNE_SIZE / 2} cy={RUNE_SIZE * 0.7} r={4} fill="#D4AF37" opacity={0.6} />
                  </Svg>
                )}
              </View>
            </Animated.View>

            {/* Rune names */}
            <View style={styles.runeNameRow}>
              {selectedRunes.map(r => (
                <View key={r.name} style={styles.runeNameBadge}>
                  <Text style={styles.runeNameSymbol}>{r.symbol}</Text>
                  <Text style={styles.runeNameText}>{r.name}</Text>
                </View>
              ))}
            </View>

            <Pressable
              onPress={handleForgeNext}
              style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] }]}
            >
              <Text style={styles.primaryBtnText}>Accept Rune</Text>
            </Pressable>

            <Pressable onPress={handleSkip} style={({ pressed }) => [styles.skipRuneBtn, pressed && { opacity: 0.5 }]}>
              <Text style={styles.skipRuneBtnText}>Skip Rune Creation</Text>
            </Pressable>
          </Animated.View>
        </ScrollView>
      </View>
    );
  }

  // ========== STEP 3: SAVE ==========
  const intentionLabel = selectedRunes.map(r => r.name).join(' & ') || 'the Initiate';

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
          <View style={styles.stepIndicator}>
            {[1, 2, 3].map(s => (
              <View key={s} style={[styles.stepDot, s === 3 && styles.stepDotActive, s < 3 && styles.stepDotDone]} />
            ))}
          </View>

          <Text style={styles.sealSymbol}>⚜</Text>
          <Text style={styles.saveTitle}>Seal Confirmed</Text>
          <Text style={styles.sealSubtitle}>
            Your identity has been inscribed.{'\n'}Welcome, {magicName || 'Initiate'}.
          </Text>

          {/* Summary card */}
          <View style={styles.summaryCard}>
            {magicName.trim() !== '' && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>NAME</Text>
                <Text style={styles.summaryValue}>{magicName}</Text>
              </View>
            )}
            {birthDate !== '' && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>BIRTH</Text>
                <Text style={styles.summaryValue}>{birthDate}</Text>
              </View>
            )}
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>RUNE</Text>
              <Text style={styles.summaryValue}>
                {selectedRunes.map(r => r.symbol).join(' ')} — {intentionLabel}
              </Text>
            </View>
          </View>

          <Pressable
            onPress={handleSave}
            style={({ pressed }) => [styles.enterBtn, pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] }]}
          >
            <Text style={styles.enterBtnText}>Enter ÆONIS</Text>
          </Pressable>
        </Animated.View>
      </ScrollView>
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

  // Primary button
  primaryBtn: {
    backgroundColor: '#D4AF37', borderRadius: 24, paddingVertical: 14,
    paddingHorizontal: 40, marginTop: 28, width: '100%', alignItems: 'center',
  },
  primaryBtnText: { color: '#050505', fontSize: 15, fontWeight: '700', letterSpacing: 1 },

  // Skip rune
  skipRuneBtn: { marginTop: 16, paddingVertical: 8 },
  skipRuneBtnText: { fontSize: 13, color: '#6B6B6B', textDecorationLine: 'underline' },

  // Forge
  magicNameDisplay: {
    fontFamily: 'Cinzel', fontSize: 14, color: '#E0E0E080', letterSpacing: 2, marginTop: 12,
  },
  runeWrapper: {
    alignItems: 'center', justifyContent: 'center', marginTop: 16,
    width: RUNE_SIZE + 40, height: RUNE_SIZE * 1.4 + 40,
  },
  runeGlowBg: {
    position: 'absolute',
    width: RUNE_SIZE + 30, height: RUNE_SIZE * 1.4 + 30,
    borderRadius: 20, backgroundColor: '#D4AF3708', borderWidth: 1, borderColor: '#D4AF3720',
  },
  runeOverlay: { width: RUNE_SIZE, height: RUNE_SIZE * 1.4, justifyContent: 'center', alignItems: 'center' },

  runeNameRow: { flexDirection: 'row', gap: 12, marginTop: 20 },
  runeNameBadge: {
    backgroundColor: '#0D0D0D', borderWidth: 1, borderColor: '#D4AF3730',
    borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, alignItems: 'center',
  },
  runeNameSymbol: { fontSize: 18, color: '#D4AF37' },
  runeNameText: { fontSize: 10, color: '#6B6B6B', marginTop: 2 },

  // Save step
  saveTitle: { fontFamily: 'Cinzel', fontSize: 22, color: '#FFD700', letterSpacing: 4, marginBottom: 4 },
  summaryCard: {
    width: '100%', backgroundColor: '#0D0D0D', borderWidth: 1, borderColor: '#D4AF3720',
    borderRadius: 14, padding: 20, marginTop: 24, gap: 14,
  },
  summaryRow: { gap: 2 },
  summaryLabel: {
    fontFamily: 'JetBrainsMono', fontSize: 9, color: '#6B6B6B', letterSpacing: 2,
  },
  summaryValue: {
    fontSize: 15, color: '#E0E0E0',
  },

  // Enter button
  enterBtn: {
    backgroundColor: '#D4AF37', borderRadius: 24, paddingVertical: 14, paddingHorizontal: 40, marginTop: 28,
  },
  enterBtnText: { color: '#050505', fontSize: 16, fontWeight: '700', letterSpacing: 2 },
});
