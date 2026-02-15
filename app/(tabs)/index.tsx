import { useEffect, useCallback } from 'react';
import { Text, View, FlatList, StyleSheet, Platform } from 'react-native';
import * as Location from 'expo-location';
import { ScreenContainer } from '@/components/screen-container';
import { useAstroStore } from '@/lib/astro/store';
import { PlanetCard } from '@/components/planet-card';
import { ZODIAC_SYMBOLS, PLANET_SYMBOLS, Planet } from '@/lib/astro/types';

export default function HomeScreen() {
  const chartData = useAstroStore((s) => s.chartData);
  const isCalculating = useAstroStore((s) => s.isCalculating);
  const setLocation = useAstroStore((s) => s.setLocation);
  const recalculate = useAstroStore((s) => s.recalculate);
  const date = useAstroStore((s) => s.date);
  const setDate = useAstroStore((s) => s.setDate);

  useEffect(() => {
    // Request location and calculate chart
    (async () => {
      try {
        if (Platform.OS !== 'web') {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status === 'granted') {
            const loc = await Location.getCurrentPositionAsync({});
            setLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
            return;
          }
        }
      } catch (e) {
        // Fallback to default location
      }
      recalculate();
    })();
  }, []);

  // Update time every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setDate(new Date());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const mainPlanets: Planet[] = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'];
  const extraBodies: Planet[] = ['NorthNode', 'SouthNode', 'Lilith'];

  const renderHeader = useCallback(() => {
    if (!chartData) return null;
    const sectColor = chartData.sect === 'Day' ? '#D4AF37' : '#0055A4';
    const sectLabel = chartData.sect === 'Day' ? '☉ Day Sect' : '☽ Night Sect';

    return (
      <View style={styles.header}>
        <Text style={styles.title}>SIDERUM</Text>
        <Text style={styles.subtitle}>
          {date.toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
          {'  '}
          {date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
        </Text>
        <View style={[styles.sectBadge, { backgroundColor: sectColor + '20', borderColor: sectColor }]}>
          <Text style={[styles.sectText, { color: sectColor }]}>{sectLabel}</Text>
        </View>
        <Text style={styles.locationText}>
          {chartData.latitude.toFixed(2)}°N, {chartData.longitude.toFixed(2)}°E
        </Text>

        {/* Arabic Parts */}
        <View style={styles.partsRow}>
          {chartData.arabicParts.map((part) => (
            <View key={part.name} style={styles.partBadge}>
              <Text style={styles.partName}>{part.name}</Text>
              <Text style={styles.partValue}>
                {ZODIAC_SYMBOLS[part.sign]} {part.signDegree}°
              </Text>
            </View>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Planets</Text>
      </View>
    );
  }, [chartData, date]);

  const allPlanets = [...mainPlanets, ...extraBodies];
  const planetPositions = chartData?.planets.filter(p => allPlanets.includes(p.planet)) ?? [];

  if (isCalculating || !chartData) {
    return (
      <ScreenContainer>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Calculating celestial positions...</Text>
          <Text style={styles.loadingSubtext}>☉ ☽ ☿ ♀ ♂ ♃ ♄</Text>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <FlatList
        data={planetPositions}
        keyExtractor={(item) => item.planet}
        ListHeaderComponent={renderHeader}
        renderItem={({ item }) => (
          <PlanetCard
            position={item}
            dignity={chartData.dignities[item.planet]}
            condition={chartData.conditions[item.planet]}
            sect={chartData.sect}
          />
        )}
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
    paddingBottom: 16,
  },
  title: {
    fontFamily: 'Cinzel',
    fontSize: 32,
    color: '#D4AF37',
    textAlign: 'center',
    letterSpacing: 6,
  },
  subtitle: {
    fontFamily: 'JetBrainsMono',
    fontSize: 12,
    color: '#6B6B6B',
    textAlign: 'center',
    marginTop: 4,
  },
  sectBadge: {
    alignSelf: 'center',
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  sectText: {
    fontFamily: 'JetBrainsMono',
    fontSize: 13,
    fontWeight: '600',
  },
  locationText: {
    fontFamily: 'JetBrainsMono',
    fontSize: 11,
    color: '#6B6B6B',
    textAlign: 'center',
    marginTop: 8,
  },
  partsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginTop: 16,
  },
  partBadge: {
    backgroundColor: '#0D0D0D',
    borderWidth: 1,
    borderColor: '#1A1A1A',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignItems: 'center',
  },
  partName: {
    fontSize: 10,
    color: '#6B6B6B',
    marginBottom: 2,
  },
  partValue: {
    fontFamily: 'JetBrainsMono',
    fontSize: 13,
    color: '#E0E0E0',
  },
  sectionTitle: {
    fontFamily: 'Cinzel',
    fontSize: 16,
    color: '#E0E0E0',
    marginTop: 20,
    marginBottom: 4,
    letterSpacing: 2,
  },
  list: {
    paddingBottom: 100,
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
    fontSize: 24,
    color: '#D4AF37',
    marginTop: 12,
    letterSpacing: 8,
  },
});
