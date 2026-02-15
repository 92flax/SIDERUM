import { useState, useMemo, useCallback } from 'react';
import { Text, View, StyleSheet, TextInput, ScrollView, Platform, Pressable, Alert } from 'react-native';
import Svg, { Line, Rect, Path, Defs, Filter, FeGaussianBlur, FeFlood, FeComposite, FeMerge, FeMergeNode, G } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { ScreenContainer } from '@/components/screen-container';
import { ELDER_FUTHARK, Rune, findRunesByKeyword, generateBindruneData } from '@/lib/runes/futhark';
import { useAstroStore } from '@/lib/astro/store';
import { PLANET_SYMBOLS } from '@/lib/astro/types';

// Neon glow color options
const GLOW_GOLD = '#FFD700';
const GLOW_CYAN = '#00FFFF';
const STROKE_COLOR = '#D4AF37';
const STROKE_WIDTH_MAIN = 5;    // Thick strokes for power
const STROKE_WIDTH_SPINE = 6;   // Even thicker spine
const GLOW_RADIUS = 12;

export default function RunicForgeScreen() {
  const [keywords, setKeywords] = useState<string[]>([]);
  const [inputText, setInputText] = useState('');
  const [selectedRunes, setSelectedRunes] = useState<Rune[]>([]);
  const [glowColor, setGlowColor] = useState(GLOW_GOLD);
  const chartData = useAstroStore((s) => s.chartData);

  const addKeyword = useCallback(() => {
    const trimmed = inputText.trim().toLowerCase();
    if (!trimmed || keywords.includes(trimmed)) return;

    if (Platform.OS !== ('web' as string)) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    const newKeywords = [...keywords, trimmed];
    setKeywords(newKeywords);
    setInputText('');

    const matchedRunes = findRunesByKeyword(trimmed);
    if (matchedRunes.length > 0) {
      const newRune = matchedRunes[0];
      if (!selectedRunes.find(r => r.name === newRune.name)) {
        const updatedRunes = [...selectedRunes, newRune];
        setSelectedRunes(updatedRunes);
        checkAstroWarning(newRune);
      }
    }
  }, [inputText, keywords, selectedRunes, chartData]);

  const removeKeyword = useCallback((keyword: string) => {
    if (Platform.OS !== ('web' as string)) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setKeywords(prev => prev.filter(k => k !== keyword));
    const matchedRunes = findRunesByKeyword(keyword);
    if (matchedRunes.length > 0) {
      setSelectedRunes(prev => prev.filter(r => r.name !== matchedRunes[0].name));
    }
  }, []);

  const checkAstroWarning = useCallback((rune: Rune) => {
    if (!rune.planet || !chartData) return;
    const condition = chartData.conditions[rune.planet];
    const dignity = chartData.dignities[rune.planet];
    const warnings: string[] = [];
    if (condition?.isRetrograde) warnings.push('Retrograde');
    if (condition?.isCombust) warnings.push('Combust');
    if (dignity?.detriment) warnings.push('in Detriment');
    if (dignity?.fall) warnings.push('in Fall');

    if (warnings.length > 0) {
      const msg = `${PLANET_SYMBOLS[rune.planet]} ${rune.planet} is ${warnings.join(', ')}. The rune ${rune.name} (${rune.symbol}) may be weakened.`;
      if (Platform.OS !== ('web' as string)) {
        Alert.alert('Astro Warning', msg);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      }
    }
  }, [chartData]);

  // Generate bindrune using Absolute Stacking
  const bindruneData = useMemo(() => {
    if (selectedRunes.length === 0) return null;
    return generateBindruneData(selectedRunes, 240, 340);
  }, [selectedRunes]);

  // Astro warnings
  const astroWarnings = useMemo(() => {
    if (!chartData) return [];
    return selectedRunes
      .filter(r => r.planet)
      .map(rune => {
        const condition = chartData.conditions[rune.planet!];
        const dignity = chartData.dignities[rune.planet!];
        const issues: string[] = [];
        if (condition?.isRetrograde) issues.push('Rx');
        if (condition?.isCombust) issues.push('Combust');
        if (dignity?.detriment) issues.push('Detriment');
        if (dignity?.fall) issues.push('Fall');
        return { rune, issues };
      })
      .filter(w => w.issues.length > 0);
  }, [selectedRunes, chartData]);

  const toggleGlowColor = useCallback(() => {
    if (Platform.OS !== ('web' as string)) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    setGlowColor(prev => prev === GLOW_GOLD ? GLOW_CYAN : GLOW_GOLD);
  }, []);

  return (
    <ScreenContainer>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.title}>Runic Forge</Text>
        <Text style={styles.subtitle}>Bindrune Generator</Text>

        {/* Keyword Input */}
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Enter intention (e.g., wealth, protection)"
            placeholderTextColor="#6B6B6B"
            returnKeyType="done"
            onSubmitEditing={addKeyword}
          />
          <Pressable
            onPress={addKeyword}
            style={({ pressed }) => [styles.addBtn, pressed && { opacity: 0.7 }]}
          >
            <Text style={styles.addBtnText}>+</Text>
          </Pressable>
        </View>

        {/* Keyword Chips */}
        {keywords.length > 0 && (
          <View style={styles.chipRow}>
            {keywords.map((kw) => (
              <Pressable
                key={kw}
                onPress={() => removeKeyword(kw)}
                style={({ pressed }) => [styles.chip, pressed && { opacity: 0.7 }]}
              >
                <Text style={styles.chipText}>{kw} ×</Text>
              </Pressable>
            ))}
          </View>
        )}

        {/* Selected Runes */}
        {selectedRunes.length > 0 && (
          <View style={styles.runeRow}>
            {selectedRunes.map((rune) => {
              const hasWarning = astroWarnings.some(w => w.rune.name === rune.name);
              return (
                <View key={rune.name} style={[styles.runeBadge, hasWarning && styles.runeBadgeWarn]}>
                  <Text style={styles.runeSymbol}>{rune.symbol}</Text>
                  <Text style={styles.runeName}>{rune.name}</Text>
                  {rune.planet && (
                    <Text style={styles.runePlanet}>{PLANET_SYMBOLS[rune.planet]}</Text>
                  )}
                </View>
              );
            })}
          </View>
        )}

        {/* Astro Warnings */}
        {astroWarnings.length > 0 && (
          <View style={styles.warningBox}>
            {astroWarnings.map((w) => (
              <Text key={w.rune.name} style={styles.warningText}>
                ⚠ {w.rune.name} ({w.rune.symbol}) — {PLANET_SYMBOLS[w.rune.planet!]} {w.rune.planet} is {w.issues.join(', ')}
              </Text>
            ))}
          </View>
        )}

        {/* Bindrune SVG Preview – Neon & Stone Aesthetics */}
        {bindruneData ? (
          <View style={styles.svgContainer}>
            {/* Glow color toggle */}
            <Pressable
              onPress={toggleGlowColor}
              style={({ pressed }) => [styles.glowToggle, pressed && { opacity: 0.7 }]}
            >
              <View style={[styles.glowDot, { backgroundColor: glowColor }]} />
              <Text style={styles.glowToggleText}>
                {glowColor === GLOW_GOLD ? 'Gold Aura' : 'Cyan Aura'}
              </Text>
            </Pressable>

            {/* The Bindrune with Neon Glow */}
            <View style={[
              styles.bindruneGlowWrapper,
              {
                shadowColor: glowColor,
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 1.0,
                shadowRadius: GLOW_RADIUS,
                elevation: 20,
              },
            ]}>
              <Svg
                width={bindruneData.width}
                height={bindruneData.height}
                viewBox={`0 0 ${bindruneData.width} ${bindruneData.height}`}
              >
                <Rect width={bindruneData.width} height={bindruneData.height} fill="transparent" />

                {/* Glow layer (drawn first, thicker, semi-transparent) */}
                <G opacity={0.4}>
                  <Line
                    x1={bindruneData.cx}
                    y1={bindruneData.staveTop}
                    x2={bindruneData.cx}
                    y2={bindruneData.staveBottom}
                    stroke={glowColor}
                    strokeWidth={STROKE_WIDTH_SPINE + 8}
                    strokeLinecap="round"
                  />
                  {bindruneData.lines.map((line) => (
                    <Line
                      key={`glow-${line.key}`}
                      x1={line.x1}
                      y1={line.y1}
                      x2={line.x2}
                      y2={line.y2}
                      stroke={glowColor}
                      strokeWidth={STROKE_WIDTH_MAIN + 8}
                      strokeLinecap="round"
                    />
                  ))}
                  {bindruneData.paths.map((p) => (
                    <Path
                      key={`glow-${p.key}`}
                      d={p.d}
                      stroke={glowColor}
                      strokeWidth={STROKE_WIDTH_MAIN + 8}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      fill="none"
                    />
                  ))}
                </G>

                {/* Secondary glow layer (medium) */}
                <G opacity={0.6}>
                  <Line
                    x1={bindruneData.cx}
                    y1={bindruneData.staveTop}
                    x2={bindruneData.cx}
                    y2={bindruneData.staveBottom}
                    stroke={glowColor}
                    strokeWidth={STROKE_WIDTH_SPINE + 3}
                    strokeLinecap="round"
                  />
                  {bindruneData.lines.map((line) => (
                    <Line
                      key={`glow2-${line.key}`}
                      x1={line.x1}
                      y1={line.y1}
                      x2={line.x2}
                      y2={line.y2}
                      stroke={glowColor}
                      strokeWidth={STROKE_WIDTH_MAIN + 3}
                      strokeLinecap="round"
                    />
                  ))}
                  {bindruneData.paths.map((p) => (
                    <Path
                      key={`glow2-${p.key}`}
                      d={p.d}
                      stroke={glowColor}
                      strokeWidth={STROKE_WIDTH_MAIN + 3}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      fill="none"
                    />
                  ))}
                </G>

                {/* Core layer (sharp, bright) */}
                <Line
                  x1={bindruneData.cx}
                  y1={bindruneData.staveTop}
                  x2={bindruneData.cx}
                  y2={bindruneData.staveBottom}
                  stroke={STROKE_COLOR}
                  strokeWidth={STROKE_WIDTH_SPINE}
                  strokeLinecap="round"
                />
                {bindruneData.lines.map((line) => (
                  <Line
                    key={line.key}
                    x1={line.x1}
                    y1={line.y1}
                    x2={line.x2}
                    y2={line.y2}
                    stroke={STROKE_COLOR}
                    strokeWidth={STROKE_WIDTH_MAIN}
                    strokeLinecap="round"
                  />
                ))}
                {bindruneData.paths.map((p) => (
                  <Path
                    key={p.key}
                    d={p.d}
                    stroke={STROKE_COLOR}
                    strokeWidth={STROKE_WIDTH_MAIN}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                  />
                ))}

                {/* Inner bright core (white highlight) */}
                <G opacity={0.3}>
                  <Line
                    x1={bindruneData.cx}
                    y1={bindruneData.staveTop}
                    x2={bindruneData.cx}
                    y2={bindruneData.staveBottom}
                    stroke="#FFFFFF"
                    strokeWidth={2}
                    strokeLinecap="round"
                  />
                  {bindruneData.lines.map((line) => (
                    <Line
                      key={`core-${line.key}`}
                      x1={line.x1}
                      y1={line.y1}
                      x2={line.x2}
                      y2={line.y2}
                      stroke="#FFFFFF"
                      strokeWidth={1.5}
                      strokeLinecap="round"
                    />
                  ))}
                </G>
              </Svg>
            </View>

            {/* Rune composition label */}
            <Text style={styles.compositionLabel}>
              {selectedRunes.map(r => r.symbol).join(' + ')}
            </Text>
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptySymbol}>ᛟ</Text>
            <Text style={styles.emptyText}>
              Enter intentions above to forge your Bindrune
            </Text>
          </View>
        )}

        {/* Quick Rune Browser */}
        <Text style={styles.sectionTitle}>Elder Futhark</Text>
        <View style={styles.runeGrid}>
          {ELDER_FUTHARK.map((rune) => {
            const isSelected = selectedRunes.some(r => r.name === rune.name);
            return (
              <Pressable
                key={rune.name}
                onPress={() => {
                  if (Platform.OS !== ('web' as string)) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  if (isSelected) {
                    setSelectedRunes(prev => prev.filter(r => r.name !== rune.name));
                  } else {
                    setSelectedRunes(prev => [...prev, rune]);
                    checkAstroWarning(rune);
                  }
                }}
                style={({ pressed }) => [
                  styles.runeGridItem,
                  isSelected && styles.runeGridItemSelected,
                  pressed && { opacity: 0.7 },
                ]}
              >
                <Text style={[styles.runeGridSymbol, isSelected && styles.runeGridSymbolSelected]}>
                  {rune.symbol}
                </Text>
                <Text style={styles.runeGridName}>{rune.name}</Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 100 },
  title: { fontFamily: 'Cinzel', fontSize: 28, color: '#D4AF37', textAlign: 'center', letterSpacing: 4 },
  subtitle: { fontSize: 13, color: '#6B6B6B', textAlign: 'center', marginTop: 4 },
  inputRow: { flexDirection: 'row', marginTop: 20, gap: 8 },
  input: {
    flex: 1, backgroundColor: '#0D0D0D', borderWidth: 1, borderColor: '#1A1A1A',
    borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, color: '#E0E0E0', fontSize: 14,
  },
  addBtn: { backgroundColor: '#D4AF37', borderRadius: 12, width: 48, justifyContent: 'center', alignItems: 'center' },
  addBtnText: { fontSize: 24, color: '#050505', fontWeight: '700' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  chip: { backgroundColor: '#D4AF3720', borderWidth: 1, borderColor: '#D4AF3740', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6 },
  chipText: { fontSize: 13, color: '#D4AF37' },
  runeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  runeBadge: {
    backgroundColor: '#0D0D0D', borderWidth: 1, borderColor: '#1A1A1A', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 6, flexDirection: 'row', alignItems: 'center', gap: 6,
  },
  runeBadgeWarn: { borderColor: '#F59E0B40' },
  runeSymbol: { fontSize: 18, color: '#D4AF37' },
  runeName: { fontSize: 12, color: '#E0E0E0' },
  runePlanet: { fontSize: 14, color: '#6B6B6B' },
  warningBox: { backgroundColor: '#F59E0B10', borderWidth: 1, borderColor: '#F59E0B30', borderRadius: 8, padding: 10, marginTop: 12 },
  warningText: { fontSize: 12, color: '#F59E0B', lineHeight: 20 },
  svgContainer: {
    alignItems: 'center', marginTop: 24, backgroundColor: '#080808',
    borderWidth: 1, borderColor: '#1A1A1A', borderRadius: 16, padding: 24,
  },
  glowToggle: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    alignSelf: 'flex-end', marginBottom: 12,
    paddingHorizontal: 12, paddingVertical: 4,
    borderRadius: 12, borderWidth: 1, borderColor: '#1A1A1A',
    backgroundColor: '#0D0D0D',
  },
  glowDot: { width: 8, height: 8, borderRadius: 4 },
  glowToggleText: { fontSize: 10, color: '#6B6B6B', fontFamily: 'JetBrainsMono' },
  bindruneGlowWrapper: {
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  compositionLabel: {
    fontFamily: 'JetBrainsMono', fontSize: 16, color: '#D4AF3780',
    marginTop: 16, letterSpacing: 4, textAlign: 'center',
  },
  emptyState: { alignItems: 'center', marginTop: 40, paddingVertical: 40 },
  emptySymbol: { fontSize: 48, color: '#1A1A1A' },
  emptyText: { fontSize: 14, color: '#6B6B6B', marginTop: 12, textAlign: 'center' },
  sectionTitle: { fontFamily: 'Cinzel', fontSize: 16, color: '#E0E0E0', marginTop: 24, marginBottom: 8, letterSpacing: 2 },
  runeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  runeGridItem: {
    backgroundColor: '#0D0D0D', borderWidth: 1, borderColor: '#1A1A1A', borderRadius: 10,
    width: 70, height: 70, justifyContent: 'center', alignItems: 'center',
  },
  runeGridItemSelected: { borderColor: '#D4AF37', backgroundColor: '#D4AF3710' },
  runeGridSymbol: { fontSize: 24, color: '#6B6B6B' },
  runeGridSymbolSelected: { color: '#D4AF37' },
  runeGridName: { fontSize: 8, color: '#6B6B6B', marginTop: 2 },
});
