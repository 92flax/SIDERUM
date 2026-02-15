import { useCallback } from 'react';
import { Text, View, StyleSheet, FlatList, ScrollView } from 'react-native';
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

export default function ChartScreen() {
  const chartData = useAstroStore((s) => s.chartData);
  const recalculate = useAstroStore((s) => s.recalculate);

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

        {/* Essential Dignities */}
        <View style={styles.dignityGrid}>
          <DignityBadge label="Domicile" active={dignity.domicile} positive />
          <DignityBadge label="Exaltation" active={dignity.exaltation} positive />
          <DignityBadge label="Triplicity" active={dignity.triplicity} positive />
          <DignityBadge label="Term" active={dignity.term} positive />
          <DignityBadge label="Face" active={dignity.face} positive />
          <DignityBadge label="Detriment" active={dignity.detriment} positive={false} />
          <DignityBadge label="Fall" active={dignity.fall} positive={false} />
          <DignityBadge label="Peregrine" active={dignity.peregrine} positive={false} />
        </View>

        {/* Conditions */}
        <View style={styles.conditionGrid}>
          <ConditionBadge label="Retrograde" active={condition.isRetrograde} icon="℞" />
          <ConditionBadge label="Combust" active={condition.isCombust} icon="🔥" />
          <ConditionBadge label="Cazimi" active={condition.isCazimi} icon="☉" positive />
          <ConditionBadge label="Under Beams" active={condition.isUnderBeams} icon="☀" />
        </View>

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

function DignityBadge({ label, active, positive }: { label: string; active: boolean; positive: boolean }) {
  if (!active) {
    return (
      <View style={styles.dignityBadge}>
        <Text style={styles.dignityInactive}>{label}</Text>
      </View>
    );
  }
  return (
    <View style={[styles.dignityBadge, { borderColor: positive ? '#22C55E40' : '#EF444440', backgroundColor: positive ? '#22C55E10' : '#EF444410' }]}>
      <Text style={[styles.dignityActive, { color: positive ? '#22C55E' : '#EF4444' }]}>{label}</Text>
    </View>
  );
}

function ConditionBadge({ label, active, icon, positive }: { label: string; active: boolean; icon: string; positive?: boolean }) {
  if (!active) {
    return (
      <View style={styles.conditionBadge}>
        <Text style={styles.conditionInactive}>{icon} {label}</Text>
      </View>
    );
  }
  const color = positive ? '#22C55E' : '#F59E0B';
  return (
    <View style={[styles.conditionBadge, { borderColor: color + '40', backgroundColor: color + '10' }]}>
      <Text style={[styles.conditionActive, { color }]}>{icon} {label}</Text>
    </View>
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
  dignityGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
  },
  dignityBadge: {
    borderWidth: 1,
    borderColor: '#1A1A1A',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  dignityInactive: {
    fontSize: 10,
    color: '#333',
  },
  dignityActive: {
    fontSize: 10,
    fontWeight: '700',
  },
  conditionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  conditionBadge: {
    borderWidth: 1,
    borderColor: '#1A1A1A',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  conditionInactive: {
    fontSize: 10,
    color: '#333',
  },
  conditionActive: {
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
