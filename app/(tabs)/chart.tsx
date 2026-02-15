import { useCallback } from 'react';
import { Text, View, StyleSheet, FlatList } from 'react-native';
import { ScreenContainer } from '@/components/screen-container';
import { useAstroStore } from '@/lib/astro/store';
import {
  PLANET_SYMBOLS, ZODIAC_SYMBOLS, PLANET_COLORS, Planet,
  PlanetPosition, EssentialDignity, PlanetCondition,
} from '@/lib/astro/types';

const MAIN_PLANETS: Planet[] = [
  'Sun', 'Moon', 'Mercury', 'Venus', 'Mars',
  'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto',
  'NorthNode', 'SouthNode', 'Lilith',
];

function getScoreVerdict(score: number): { text: string; color: string } {
  if (score >= 7) return { text: 'Exceptional power. Ideal for rituals and invocations.', color: '#22C55E' };
  if (score >= 4) return { text: 'Strong dignity. Favorable for magical workings.', color: '#22C55E' };
  if (score >= 1) return { text: 'Moderate strength. Proceed with awareness.', color: '#4ADE80' };
  if (score === 0) return { text: 'Peregrine. Neutral influence, no essential dignity.', color: '#6B6B6B' };
  if (score >= -4) return { text: 'Weakened state. Consider timing alternatives.', color: '#F59E0B' };
  if (score >= -7) return { text: 'Debilitated. Exercise significant caution.', color: '#EF4444' };
  return { text: 'Extreme debility. Avoid ritual work if possible.', color: '#EF4444' };
}

export default function ChartScreen() {
  const chartData = useAstroStore((s) => s.chartData);

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

  const renderPlanetDetail = useCallback(({ item }: { item: PlanetPosition }) => {
    const dignity = chartData.dignities[item.planet];
    const condition = chartData.conditions[item.planet];
    const color = PLANET_COLORS[item.planet];
    const verdict = getScoreVerdict(dignity.score);

    // Collect only ACTIVE dignity tags
    const activeDignities: Array<{ label: string; positive: boolean }> = [];
    if (dignity.domicile) activeDignities.push({ label: 'Domicile', positive: true });
    if (dignity.exaltation) activeDignities.push({ label: 'Exaltation', positive: true });
    if (dignity.triplicity) activeDignities.push({ label: 'Triplicity', positive: true });
    if (dignity.term) activeDignities.push({ label: 'Term', positive: true });
    if (dignity.face) activeDignities.push({ label: 'Face', positive: true });
    if (dignity.detriment) activeDignities.push({ label: 'Detriment', positive: false });
    if (dignity.fall) activeDignities.push({ label: 'Fall', positive: false });
    if (dignity.peregrine) activeDignities.push({ label: 'Peregrine', positive: false });

    // Collect only ACTIVE conditions
    // BUG FIX: Combust/Under Beams/Cazimi never appear for the Sun itself
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
        {/* Header */}
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

        {/* Verdict Text */}
        <View style={[styles.verdictBox, { borderLeftColor: verdict.color }]}>
          <Text style={[styles.verdictText, { color: verdict.color }]}>{verdict.text}</Text>
        </View>

        {/* Active Dignity Tags (only show active ones) */}
        {hasAnyTag && (
          <View style={styles.tagGrid}>
            {activeDignities.map(({ label, positive }) => (
              <View
                key={label}
                style={[
                  styles.tag,
                  {
                    borderColor: positive ? '#22C55E40' : '#EF444440',
                    backgroundColor: positive ? '#22C55E10' : '#EF444410',
                  },
                ]}
              >
                <Text style={[styles.tagText, { color: positive ? '#22C55E' : '#EF4444' }]}>
                  {label}
                </Text>
              </View>
            ))}
            {activeConditions.map(({ label, icon, positive }) => {
              const condColor = positive ? '#22C55E' : '#F59E0B';
              return (
                <View
                  key={label}
                  style={[
                    styles.tag,
                    { borderColor: condColor + '40', backgroundColor: condColor + '10' },
                  ]}
                >
                  <Text style={[styles.tagText, { color: condColor }]}>{icon} {label}</Text>
                </View>
              );
            })}
          </View>
        )}

        {/* Technical Data */}
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
  }, [chartData]);

  const planets = chartData.planets.filter(p => MAIN_PLANETS.includes(p.planet));

  return (
    <ScreenContainer>
      <FlatList
        data={planets}
        keyExtractor={(item) => item.planet}
        renderItem={renderPlanetDetail}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.title}>Chart Detail</Text>
            <Text style={styles.subtitle}>
              Essential Dignities & Conditions
            </Text>
            <View style={styles.metaRow}>
              <Text style={styles.metaText}>
                JD {chartData.julianDay.toFixed(4)}
              </Text>
              <Text style={styles.metaText}>
                LST {chartData.localSiderealTime.toFixed(4)}h
              </Text>
            </View>
          </View>
        }
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  title: {
    fontFamily: 'Cinzel',
    fontSize: 24,
    color: '#D4AF37',
    textAlign: 'center',
    letterSpacing: 3,
  },
  subtitle: {
    fontSize: 13,
    color: '#6B6B6B',
    textAlign: 'center',
    marginTop: 4,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginTop: 8,
  },
  metaText: {
    fontFamily: 'JetBrainsMono',
    fontSize: 10,
    color: '#6B6B6B',
  },
  list: {
    paddingBottom: 100,
  },
  detailCard: {
    backgroundColor: '#0D0D0D',
    borderWidth: 1,
    borderColor: '#1A1A1A',
    borderRadius: 12,
    padding: 14,
    marginHorizontal: 16,
    marginVertical: 4,
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  planetSymbol: {
    fontSize: 28,
    width: 36,
    textAlign: 'center',
  },
  headerInfo: {
    flex: 1,
  },
  planetName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#E0E0E0',
  },
  positionText: {
    fontFamily: 'JetBrainsMono',
    fontSize: 12,
    color: '#6B6B6B',
    marginTop: 2,
  },
  scoreText: {
    fontFamily: 'JetBrainsMono',
    fontSize: 18,
    fontWeight: '700',
  },
  scorePositive: { color: '#22C55E' },
  scoreNegative: { color: '#EF4444' },
  scoreNeutral: { color: '#6B6B6B' },
  verdictBox: {
    marginTop: 10,
    paddingLeft: 10,
    borderLeftWidth: 3,
  },
  verdictText: {
    fontSize: 12,
    fontStyle: 'italic',
    lineHeight: 18,
  },
  tagGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
  },
  tag: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  tagText: {
    fontSize: 10,
    fontWeight: '700',
  },
  techRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#1A1A1A',
  },
  techItem: {},
  techLabel: {
    fontSize: 9,
    color: '#6B6B6B',
  },
  techValue: {
    fontFamily: 'JetBrainsMono',
    fontSize: 11,
    color: '#E0E0E0',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#E0E0E0',
  },
  loadingSubtext: {
    fontSize: 13,
    color: '#6B6B6B',
    marginTop: 8,
  },
});
