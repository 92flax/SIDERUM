import { useCallback, useMemo, useState } from 'react';
import { Text, View, StyleSheet, FlatList, Pressable, Modal, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { ScreenContainer } from '@/components/screen-container';
import { PaywallModal, ProBadge } from '@/components/paywall-modal';
import { useAstroStore } from '@/lib/astro/store';
import { useProStore } from '@/lib/store/pro-store';
import { getMajorAspects, Aspect } from '@/lib/astro/aspects';
import {
  PLANET_SYMBOLS, ZODIAC_SYMBOLS, PLANET_COLORS, Planet,
  PlanetPosition, EssentialDignity, PlanetCondition,
} from '@/lib/astro/types';

const MAIN_PLANETS: Planet[] = [
  'Sun', 'Moon', 'Mercury', 'Venus', 'Mars',
  'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto',
  'NorthNode', 'SouthNode', 'Lilith',
];

// ===== Pedagogy: Aspect Explanations =====
const ASPECT_EXPLANATIONS: Record<string, { meaning: string; nature: string; keywords: string }> = {
  Conjunction: {
    meaning: 'Two planets occupy the same degree, merging their energies into a single, intensified force. The nature depends on the planets involved.',
    nature: 'Variable (depends on planets)',
    keywords: 'Fusion, intensity, new beginnings, amplification',
  },
  Opposition: {
    meaning: 'Two planets face each other across the zodiac (180°), creating tension that demands integration. This aspect reveals polarities that must be balanced.',
    nature: 'Challenging / Dynamic',
    keywords: 'Tension, awareness, projection, balance',
  },
  Trine: {
    meaning: 'Two planets are 120° apart, flowing harmoniously in the same element. Energy moves easily between them, creating natural talent and ease.',
    nature: 'Harmonious / Flowing',
    keywords: 'Harmony, talent, ease, grace',
  },
  Square: {
    meaning: 'Two planets are 90° apart, creating friction and internal conflict. This aspect drives action through challenge and forces growth.',
    nature: 'Challenging / Dynamic',
    keywords: 'Friction, challenge, growth, action',
  },
  Sextile: {
    meaning: 'Two planets are 60° apart, offering opportunities that require conscious effort to activate. A gentle, cooperative aspect.',
    nature: 'Harmonious / Supportive',
    keywords: 'Opportunity, cooperation, skill, communication',
  },
};

// ===== Pedagogy: Dignity Explanations =====
const DIGNITY_EXPLANATIONS: Record<string, string> = {
  Domicile: 'The planet is in its home sign, where it has full authority and expresses its nature most purely.',
  Exaltation: 'The planet is honored and elevated, expressing its highest and most refined qualities.',
  Triplicity: 'The planet rules the element (Fire/Earth/Air/Water) of the sign it occupies, giving moderate strength.',
  Term: 'The planet rules a specific degree range within the sign, providing minor essential dignity.',
  Face: 'The planet rules a 10° decan of the sign. The weakest essential dignity, but still provides some strength.',
  Detriment: 'The planet is in the sign opposite its domicile, forced to act against its nature.',
  Fall: 'The planet is in the sign opposite its exaltation, at its weakest and most challenged expression.',
  Peregrine: 'The planet has no essential dignity in its current position — a wanderer without support.',
  Retrograde: 'The planet appears to move backward through the zodiac, turning its energy inward and causing delays or revision.',
  Cazimi: 'The planet is within 17\' of the Sun\'s center — "in the heart of the Sun." Extremely powerful and purified.',
  Combust: 'The planet is within 8° of the Sun and overwhelmed by solar energy, weakening its expression.',
  'Under Beams': 'The planet is within 17° of the Sun, partially obscured. Its influence is diminished but not destroyed.',
};

function getScoreVerdict(score: number): { text: string; color: string } {
  if (score >= 7) return { text: 'Exceptional power. Ideal for rituals and invocations.', color: '#22C55E' };
  if (score >= 4) return { text: 'Strong dignity. Favorable for magical workings.', color: '#22C55E' };
  if (score >= 1) return { text: 'Moderate strength. Proceed with awareness.', color: '#4ADE80' };
  if (score === 0) return { text: 'Peregrine. Neutral influence, no essential dignity.', color: '#6B6B6B' };
  if (score >= -4) return { text: 'Weakened state. Consider timing alternatives.', color: '#F59E0B' };
  if (score >= -7) return { text: 'Debilitated. Exercise significant caution.', color: '#EF4444' };
  return { text: 'Extreme debility. Avoid ritual work if possible.', color: '#EF4444' };
}

function getAspectColor(type: string): string {
  switch (type) {
    case 'Conjunction': return '#D4AF37';
    case 'Trine': return '#22C55E';
    case 'Sextile': return '#3B82F6';
    case 'Square': return '#EF4444';
    case 'Opposition': return '#F59E0B';
    default: return '#6B6B6B';
  }
}

export default function ChartScreen() {
  const chartData = useAstroStore((s) => s.chartData);
  const isFeatureUnlocked = useProStore((s) => s.isFeatureUnlocked);
  const [showAspectarian, setShowAspectarian] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [selectedAspect, setSelectedAspect] = useState<Aspect | null>(null);
  const [selectedDignity, setSelectedDignity] = useState<string | null>(null);

  const aspects = useMemo(() => {
    if (!chartData) return [];
    return getMajorAspects(chartData.planets, 3);
  }, [chartData]);

  if (!chartData) {
    return (
      <ScreenContainer>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>No chart data available</Text>
          <Text style={styles.loadingSubtext}>Return to Home to calculate</Text>
        </View>
      </ScreenContainer>
    );
  }

  const handleAspectarianToggle = () => {
    if (!isFeatureUnlocked('aspectarian')) {
      setShowPaywall(true);
      return;
    }
    setShowAspectarian(!showAspectarian);
  };

  const handleAspectTap = (asp: Aspect) => {
    if (Platform.OS !== ('web' as string)) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setSelectedAspect(asp);
  };

  const handleDignityTap = (label: string) => {
    if (Platform.OS !== ('web' as string)) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setSelectedDignity(label);
  };

  const renderPlanetDetail = ({ item }: { item: PlanetPosition }) => {
    const dignity = chartData.dignities[item.planet];
    const condition = chartData.conditions[item.planet];
    const color = PLANET_COLORS[item.planet];
    const verdict = getScoreVerdict(dignity.score);

    const activeDignities: Array<{ label: string; positive: boolean }> = [];
    if (dignity.domicile) activeDignities.push({ label: 'Domicile', positive: true });
    if (dignity.exaltation) activeDignities.push({ label: 'Exaltation', positive: true });
    if (dignity.triplicity) activeDignities.push({ label: 'Triplicity', positive: true });
    if (dignity.term) activeDignities.push({ label: 'Term', positive: true });
    if (dignity.face) activeDignities.push({ label: 'Face', positive: true });
    if (dignity.detriment) activeDignities.push({ label: 'Detriment', positive: false });
    if (dignity.fall) activeDignities.push({ label: 'Fall', positive: false });
    if (dignity.peregrine) activeDignities.push({ label: 'Peregrine', positive: false });

    const activeConditions: Array<{ label: string; icon: string; positive: boolean }> = [];
    if (condition.isRetrograde) activeConditions.push({ label: 'Retrograde', icon: '℞', positive: false });
    if (item.planet !== 'Sun') {
      if (condition.isCazimi) activeConditions.push({ label: 'Cazimi', icon: '☉', positive: true });
      if (condition.isCombust) activeConditions.push({ label: 'Combust', icon: '🔥', positive: false });
      if (condition.isUnderBeams) activeConditions.push({ label: 'Under Beams', icon: '☀', positive: false });
    }

    const hasAnyTag = activeDignities.length > 0 || activeConditions.length > 0;

    return (
      <View style={styles.detailCard}>
        <View style={styles.detailHeader}>
          <Text style={[styles.planetSymbol, { color }]}>{PLANET_SYMBOLS[item.planet]}</Text>
          <View style={styles.headerInfo}>
            <Text style={styles.planetName}>{item.planet}</Text>
            <Text style={styles.positionText}>
              {ZODIAC_SYMBOLS[item.sign]} {item.sign} {item.signDegree}°{item.signMinute.toString().padStart(2, '0')}'{item.signSecond.toString().padStart(2, '0')}"
            </Text>
          </View>
          <Text style={[styles.scoreText, dignity.score > 0 ? styles.scorePositive : dignity.score < 0 ? styles.scoreNegative : styles.scoreNeutral]}>
            {dignity.score > 0 ? '+' : ''}{dignity.score}
          </Text>
        </View>

        <View style={[styles.verdictBox, { borderLeftColor: verdict.color }]}>
          <Text style={[styles.verdictText, { color: verdict.color }]}>{verdict.text}</Text>
        </View>

        {/* Tappable Dignity Tags */}
        {hasAnyTag && (
          <View style={styles.tagGrid}>
            {activeDignities.map(({ label, positive }) => (
              <Pressable
                key={label}
                onPress={() => handleDignityTap(label)}
                style={({ pressed }) => [
                  styles.tag,
                  {
                    borderColor: positive ? '#22C55E40' : '#EF444440',
                    backgroundColor: positive ? '#22C55E10' : '#EF444410',
                  },
                  pressed && { opacity: 0.6 },
                ]}
              >
                <Text style={[styles.tagText, { color: positive ? '#22C55E' : '#EF4444' }]}>
                  {label} ⓘ
                </Text>
              </Pressable>
            ))}
            {activeConditions.map(({ label, icon, positive }) => {
              const condColor = positive ? '#22C55E' : '#F59E0B';
              return (
                <Pressable
                  key={label}
                  onPress={() => handleDignityTap(label)}
                  style={({ pressed }) => [
                    styles.tag,
                    { borderColor: condColor + '40', backgroundColor: condColor + '10' },
                    pressed && { opacity: 0.6 },
                  ]}
                >
                  <Text style={[styles.tagText, { color: condColor }]}>{icon} {label} ⓘ</Text>
                </Pressable>
              );
            })}
          </View>
        )}

        <View style={styles.techRow}>
          <View style={styles.techItem}>
            <Text style={styles.techLabel}>Longitude</Text>
            <Text style={styles.techValue}>{item.longitude.toFixed(4)}°</Text>
          </View>
          <View style={styles.techItem}>
            <Text style={styles.techLabel}>Speed</Text>
            <Text style={[styles.techValue, item.speed < 0 && { color: '#F59E0B' }]}>
              {item.speed >= 0 ? '+' : ''}{item.speed.toFixed(4)}°/d
            </Text>
          </View>
          {item.azimuth !== undefined && (
            <>
              <View style={styles.techItem}>
                <Text style={styles.techLabel}>Azimuth</Text>
                <Text style={styles.techValue}>{item.azimuth.toFixed(1)}°</Text>
              </View>
              <View style={styles.techItem}>
                <Text style={styles.techLabel}>Altitude</Text>
                <Text style={styles.techValue}>{item.altitude?.toFixed(1)}°</Text>
              </View>
            </>
          )}
        </View>
      </View>
    );
  };

  const planets = chartData.planets.filter(p => MAIN_PLANETS.includes(p.planet));

  return (
    <ScreenContainer>
      <FlatList
        data={planets}
        keyExtractor={(item) => item.planet}
        renderItem={renderPlanetDetail}
        ListHeaderComponent={
          <View>
            <View style={styles.header}>
              <Text style={styles.title}>Chart Detail</Text>
              <Text style={styles.subtitle}>Essential Dignities & Conditions</Text>
              <Text style={styles.subtitleHint}>Tap any tag for explanation</Text>
              <View style={styles.metaRow}>
                <Text style={styles.metaText}>JD {chartData.julianDay.toFixed(4)}</Text>
                <Text style={styles.metaText}>LST {chartData.localSiderealTime.toFixed(4)}h</Text>
              </View>
            </View>

            {/* ===== Aspectarian (Collapsible, tappable rows) ===== */}
            <View style={styles.aspectarianSection}>
              <Pressable
                onPress={handleAspectarianToggle}
                style={({ pressed }) => [styles.aspectarianHeader, pressed && { opacity: 0.8 }]}
              >
                <View style={styles.aspectarianTitleRow}>
                  <Text style={styles.aspectarianTitle}>Aspectarian</Text>
                  {!isFeatureUnlocked('aspectarian') && (
                    <ProBadge onPress={() => setShowPaywall(true)} />
                  )}
                </View>
                <Text style={styles.aspectarianToggle}>
                  {showAspectarian ? '▼' : '▶'} {aspects.length} aspects (tap for details)
                </Text>
              </Pressable>

              {showAspectarian && isFeatureUnlocked('aspectarian') && (
                <View style={styles.aspectarianBody}>
                  {aspects.length === 0 ? (
                    <Text style={styles.noAspects}>No major aspects within 3° orb</Text>
                  ) : (
                    aspects.map((asp, i) => {
                      const aspColor = getAspectColor(asp.type);
                      return (
                        <Pressable
                          key={i}
                          onPress={() => handleAspectTap(asp)}
                          style={({ pressed }) => [
                            styles.aspectRow,
                            asp.isExact && styles.aspectRowExact,
                            pressed && { backgroundColor: '#1A1A1A' },
                          ]}
                        >
                          <View style={styles.aspectPlanets}>
                            <Text style={[styles.aspectPlanetSymbol, { color: PLANET_COLORS[asp.planet1] }]}>
                              {PLANET_SYMBOLS[asp.planet1]}
                            </Text>
                            <Text style={[styles.aspectSymbol, { color: aspColor }]}>{asp.symbol}</Text>
                            <Text style={[styles.aspectPlanetSymbol, { color: PLANET_COLORS[asp.planet2] }]}>
                              {PLANET_SYMBOLS[asp.planet2]}
                            </Text>
                          </View>
                          <View style={styles.aspectDetail}>
                            <Text style={[styles.aspectTypeName, { color: aspColor }]}>{asp.type}</Text>
                            <Text style={styles.aspectPairName}>
                              {asp.planet1} – {asp.planet2}
                            </Text>
                          </View>
                          <View style={styles.aspectOrbCol}>
                            <Text style={[styles.aspectOrbValue, asp.isExact && { color: '#D4AF37' }]}>
                              {asp.orb.toFixed(1)}°
                            </Text>
                            {asp.isExact && (
                              <Text style={styles.exactLabel}>EXACT</Text>
                            )}
                          </View>
                        </Pressable>
                      );
                    })
                  )}
                </View>
              )}
            </View>
          </View>
        }
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      />

      {/* ===== Aspect Explanation Modal ===== */}
      <Modal
        visible={!!selectedAspect}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedAspect(null)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setSelectedAspect(null)}>
          <View style={styles.modalContent}>
            {selectedAspect && (() => {
              const aspColor = getAspectColor(selectedAspect.type);
              const explanation = ASPECT_EXPLANATIONS[selectedAspect.type];
              return (
                <>
                  <View style={styles.modalHeader}>
                    <Text style={[styles.modalAspectSymbol, { color: aspColor }]}>
                      {selectedAspect.symbol}
                    </Text>
                    <Text style={[styles.modalAspectType, { color: aspColor }]}>
                      {selectedAspect.type}
                    </Text>
                  </View>

                  <View style={styles.modalPlanetsRow}>
                    <Text style={[styles.modalPlanet, { color: PLANET_COLORS[selectedAspect.planet1] }]}>
                      {PLANET_SYMBOLS[selectedAspect.planet1]} {selectedAspect.planet1}
                    </Text>
                    <Text style={[styles.modalAspectMid, { color: aspColor }]}>{selectedAspect.symbol}</Text>
                    <Text style={[styles.modalPlanet, { color: PLANET_COLORS[selectedAspect.planet2] }]}>
                      {PLANET_SYMBOLS[selectedAspect.planet2]} {selectedAspect.planet2}
                    </Text>
                  </View>

                  <View style={styles.modalOrbRow}>
                    <Text style={styles.modalOrbLabel}>Orb:</Text>
                    <Text style={[styles.modalOrbValue, selectedAspect.isExact && { color: '#D4AF37' }]}>
                      {selectedAspect.orb.toFixed(2)}° {selectedAspect.isExact ? '(EXACT)' : ''}
                    </Text>
                  </View>

                  {explanation && (
                    <>
                      <View style={styles.modalDivider} />
                      <View style={[styles.modalNatureTag, { borderColor: aspColor + '40' }]}>
                        <Text style={[styles.modalNatureText, { color: aspColor }]}>
                          {explanation.nature}
                        </Text>
                      </View>
                      <Text style={styles.modalMeaning}>{explanation.meaning}</Text>
                      <Text style={styles.modalKeywordsLabel}>Keywords</Text>
                      <Text style={styles.modalKeywords}>{explanation.keywords}</Text>
                    </>
                  )}

                  <Pressable
                    onPress={() => setSelectedAspect(null)}
                    style={({ pressed }) => [styles.modalCloseBtn, pressed && { opacity: 0.7 }]}
                  >
                    <Text style={styles.modalCloseBtnText}>Close</Text>
                  </Pressable>
                </>
              );
            })()}
          </View>
        </Pressable>
      </Modal>

      {/* ===== Dignity Explanation Modal ===== */}
      <Modal
        visible={!!selectedDignity}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedDignity(null)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setSelectedDignity(null)}>
          <View style={styles.modalContent}>
            {selectedDignity && (
              <>
                <Text style={styles.modalDignityTitle}>{selectedDignity}</Text>
                <View style={styles.modalDivider} />
                <Text style={styles.modalDignityDesc}>
                  {DIGNITY_EXPLANATIONS[selectedDignity] ?? 'No explanation available.'}
                </Text>
                <Pressable
                  onPress={() => setSelectedDignity(null)}
                  style={({ pressed }) => [styles.modalCloseBtn, pressed && { opacity: 0.7 }]}
                >
                  <Text style={styles.modalCloseBtnText}>Close</Text>
                </Pressable>
              </>
            )}
          </View>
        </Pressable>
      </Modal>

      <PaywallModal
        visible={showPaywall}
        onClose={() => setShowPaywall(false)}
        featureId="aspectarian"
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12 },
  title: { fontFamily: 'Cinzel', fontSize: 24, color: '#D4AF37', textAlign: 'center', letterSpacing: 3 },
  subtitle: { fontSize: 13, color: '#6B6B6B', textAlign: 'center', marginTop: 4 },
  subtitleHint: { fontSize: 10, color: '#6B6B6B60', textAlign: 'center', marginTop: 2, fontStyle: 'italic' },
  metaRow: { flexDirection: 'row', justifyContent: 'center', gap: 16, marginTop: 8 },
  metaText: { fontFamily: 'JetBrainsMono', fontSize: 10, color: '#6B6B6B' },
  list: { paddingBottom: 100 },

  // Aspectarian
  aspectarianSection: { marginHorizontal: 16, marginBottom: 8 },
  aspectarianHeader: {
    backgroundColor: '#0D0D0D', borderWidth: 1, borderColor: '#1A1A1A',
    borderRadius: 12, padding: 14,
  },
  aspectarianTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  aspectarianTitle: { fontFamily: 'Cinzel', fontSize: 16, color: '#E0E0E0', letterSpacing: 2 },
  aspectarianToggle: { fontFamily: 'JetBrainsMono', fontSize: 11, color: '#6B6B6B', marginTop: 4 },
  aspectarianBody: {
    backgroundColor: '#0A0A0A', borderWidth: 1, borderColor: '#1A1A1A',
    borderTopWidth: 0, borderBottomLeftRadius: 12, borderBottomRightRadius: 12, padding: 8,
  },
  noAspects: { fontSize: 12, color: '#6B6B6B', textAlign: 'center', padding: 16 },
  aspectRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 8,
    paddingHorizontal: 8, borderRadius: 8, marginBottom: 2,
  },
  aspectRowExact: { backgroundColor: '#D4AF3708', borderWidth: 1, borderColor: '#D4AF3720' },
  aspectPlanets: { flexDirection: 'row', alignItems: 'center', gap: 4, width: 70 },
  aspectPlanetSymbol: { fontSize: 16 },
  aspectSymbol: { fontSize: 14 },
  aspectDetail: { flex: 1, marginLeft: 8 },
  aspectTypeName: { fontSize: 12, fontWeight: '700' },
  aspectPairName: { fontSize: 10, color: '#6B6B6B', marginTop: 1 },
  aspectOrbCol: { alignItems: 'flex-end' },
  aspectOrbValue: { fontFamily: 'JetBrainsMono', fontSize: 12, color: '#E0E0E0' },
  exactLabel: { fontFamily: 'JetBrainsMono', fontSize: 8, color: '#D4AF37', letterSpacing: 1, marginTop: 1 },

  // Planet detail cards
  detailCard: {
    backgroundColor: '#0D0D0D', borderWidth: 1, borderColor: '#1A1A1A',
    borderRadius: 12, padding: 14, marginHorizontal: 16, marginVertical: 4,
  },
  detailHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  planetSymbol: { fontSize: 28, width: 36, textAlign: 'center' },
  headerInfo: { flex: 1 },
  planetName: { fontSize: 16, fontWeight: '600', color: '#E0E0E0' },
  positionText: { fontFamily: 'JetBrainsMono', fontSize: 12, color: '#6B6B6B', marginTop: 2 },
  scoreText: { fontFamily: 'JetBrainsMono', fontSize: 18, fontWeight: '700' },
  scorePositive: { color: '#22C55E' },
  scoreNegative: { color: '#EF4444' },
  scoreNeutral: { color: '#6B6B6B' },
  verdictBox: { marginTop: 10, paddingLeft: 10, borderLeftWidth: 3 },
  verdictText: { fontSize: 12, fontStyle: 'italic', lineHeight: 18 },
  tagGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  tag: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  tagText: { fontSize: 10, fontWeight: '700' },
  techRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 10, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#1A1A1A' },
  techItem: {},
  techLabel: { fontSize: 9, color: '#6B6B6B' },
  techValue: { fontFamily: 'JetBrainsMono', fontSize: 11, color: '#E0E0E0' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { fontSize: 16, color: '#E0E0E0' },
  loadingSubtext: { fontSize: 13, color: '#6B6B6B', marginTop: 8 },

  // Modals (shared)
  modalOverlay: {
    flex: 1, backgroundColor: '#00000090', justifyContent: 'center',
    alignItems: 'center', padding: 32,
  },
  modalContent: {
    backgroundColor: '#0D0D0D', borderWidth: 1, borderColor: '#1A1A1A',
    borderRadius: 16, padding: 24, width: '100%', maxWidth: 340, alignItems: 'center',
  },
  modalDivider: { width: '100%', height: 1, backgroundColor: '#1A1A1A', marginVertical: 16 },
  modalCloseBtn: {
    marginTop: 20, paddingHorizontal: 24, paddingVertical: 10,
    borderRadius: 20, borderWidth: 1, borderColor: '#1A1A1A',
  },
  modalCloseBtnText: { fontSize: 13, color: '#6B6B6B' },

  // Aspect Modal
  modalHeader: { alignItems: 'center' },
  modalAspectSymbol: { fontSize: 36 },
  modalAspectType: { fontFamily: 'Cinzel', fontSize: 20, letterSpacing: 2, marginTop: 4 },
  modalPlanetsRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 16 },
  modalPlanet: { fontSize: 16, fontWeight: '600' },
  modalAspectMid: { fontSize: 18 },
  modalOrbRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
  modalOrbLabel: { fontSize: 12, color: '#6B6B6B' },
  modalOrbValue: { fontFamily: 'JetBrainsMono', fontSize: 14, color: '#E0E0E0' },
  modalNatureTag: {
    borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 4, marginBottom: 12,
  },
  modalNatureText: { fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  modalMeaning: { fontSize: 13, color: '#E0E0E0', lineHeight: 20, textAlign: 'center' },
  modalKeywordsLabel: { fontSize: 10, color: '#6B6B6B', marginTop: 12, letterSpacing: 1 },
  modalKeywords: { fontSize: 12, color: '#D4AF37', textAlign: 'center', marginTop: 4 },

  // Dignity Modal
  modalDignityTitle: { fontFamily: 'Cinzel', fontSize: 20, color: '#D4AF37', letterSpacing: 2 },
  modalDignityDesc: { fontSize: 13, color: '#E0E0E0', lineHeight: 20, textAlign: 'center' },
});
