import { useEffect, useMemo } from 'react';
import { Text, View, ScrollView, StyleSheet, Platform, Pressable, Dimensions } from 'react-native';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '@/components/screen-container';
import { useAstroStore } from '@/lib/astro/store';
import { calculatePlanetaryHours, calculateMoonPhase } from '@/lib/astro/planetary-hours';
import { PLANET_SYMBOLS, PLANET_COLORS, ZODIAC_SYMBOLS, Planet } from '@/lib/astro/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function HomeScreen() {
  const chartData = useAstroStore((s) => s.chartData);
  const isCalculating = useAstroStore((s) => s.isCalculating);
  const location = useAstroStore((s) => s.location);
  const setLocation = useAstroStore((s) => s.setLocation);
  const recalculate = useAstroStore((s) => s.recalculate);
  const date = useAstroStore((s) => s.date);
  const setDate = useAstroStore((s) => s.setDate);
  const router = useRouter();

  useEffect(() => {
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
        // Fallback
      }
      recalculate();
    })();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setDate(new Date());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // Calculate planetary hour and moon phase
  const planetaryHour = useMemo(() => {
    return calculatePlanetaryHours(date, location);
  }, [date, location]);

  const moonPhase = useMemo(() => {
    return calculateMoonPhase(date);
  }, [date]);

  // Sky Verdict: strongest and weakest influence
  const skyVerdict = useMemo(() => {
    if (!chartData) return null;
    const classicalPlanets: Planet[] = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn'];
    const entries = classicalPlanets.map(p => ({
      planet: p,
      dignity: chartData.dignities[p],
      position: chartData.planets.find(pp => pp.planet === p)!,
    }));

    const sorted = [...entries].sort((a, b) => b.dignity.score - a.dignity.score);
    return {
      strongest: sorted[0],
      weakest: sorted[sorted.length - 1],
    };
  }, [chartData]);

  const handleQuickAction = (tab: string) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.push(`/(tabs)/${tab}` as any);
  };

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

  const hourPlanet = planetaryHour.currentHour.planet;
  const hourColor = PLANET_COLORS[hourPlanet];
  const sectColor = chartData.sect === 'Day' ? '#D4AF37' : '#0055A4';
  const sectLabel = chartData.sect === 'Day' ? '☉ Day Sect' : '☽ Night Sect';

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Title & Date */}
        <Text style={styles.title}>SIDERUM</Text>
        <Text style={styles.subtitle}>
          {date.toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
          {'  '}
          {date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
        </Text>
        <View style={[styles.sectBadge, { backgroundColor: sectColor + '20', borderColor: sectColor }]}>
          <Text style={[styles.sectText, { color: sectColor }]}>{sectLabel}</Text>
        </View>

        {/* Hero Card: Planetary Hour + Moon Phase */}
        <View style={styles.heroRow}>
          {/* Planetary Hour Card */}
          <View style={[styles.heroCard, { borderColor: hourColor + '40' }]}>
            <Text style={styles.heroLabel}>Planetary Hour</Text>
            <Text style={[styles.heroSymbol, { color: hourColor }]}>
              {PLANET_SYMBOLS[hourPlanet]}
            </Text>
            <Text style={[styles.heroTitle, { color: hourColor }]}>{hourPlanet}</Text>
            <Text style={styles.heroMeta}>
              Hour {planetaryHour.currentHour.hourNumber} of 24
            </Text>
            <Text style={styles.heroMeta}>
              {planetaryHour.currentHour.isDayHour ? 'Day' : 'Night'} Hour
            </Text>
            <Text style={styles.heroTime}>
              {planetaryHour.currentHour.startTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
              {' – '}
              {planetaryHour.currentHour.endTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>

          {/* Moon Phase Card */}
          <View style={[styles.heroCard, { borderColor: '#C0C0C040' }]}>
            <Text style={styles.heroLabel}>Moon Phase</Text>
            <Text style={styles.moonEmoji}>{moonPhase.emoji}</Text>
            <Text style={[styles.heroTitle, { color: '#C0C0C0' }]}>{moonPhase.phaseName}</Text>
            <Text style={styles.heroMeta}>
              {moonPhase.illumination.toFixed(0)}% illuminated
            </Text>
            {chartData.planets.find(p => p.planet === 'Moon') && (
              <>
                <Text style={styles.heroMeta}>
                  {ZODIAC_SYMBOLS[chartData.planets.find(p => p.planet === 'Moon')!.sign]}{' '}
                  {chartData.planets.find(p => p.planet === 'Moon')!.sign}
                </Text>
                <Text style={styles.heroTime}>
                  {chartData.planets.find(p => p.planet === 'Moon')!.signDegree}°
                  {chartData.planets.find(p => p.planet === 'Moon')!.signMinute.toString().padStart(2, '0')}'
                </Text>
              </>
            )}
          </View>
        </View>

        {/* Sky Verdict */}
        {skyVerdict && (
          <>
            <Text style={styles.sectionTitle}>Sky Verdict</Text>
            <View style={styles.verdictRow}>
              {/* Strongest Influence */}
              <View style={[styles.verdictCard, { borderColor: '#22C55E30' }]}>
                <Text style={styles.verdictLabel}>Strongest Influence</Text>
                <View style={styles.verdictPlanetRow}>
                  <Text style={[styles.verdictSymbol, { color: PLANET_COLORS[skyVerdict.strongest.planet] }]}>
                    {PLANET_SYMBOLS[skyVerdict.strongest.planet]}
                  </Text>
                  <View style={styles.verdictInfo}>
                    <Text style={styles.verdictName}>{skyVerdict.strongest.planet}</Text>
                    <Text style={styles.verdictSign}>
                      {ZODIAC_SYMBOLS[skyVerdict.strongest.position.sign]} {skyVerdict.strongest.position.sign}
                    </Text>
                  </View>
                  <Text style={[styles.verdictScore, { color: '#22C55E' }]}>
                    +{skyVerdict.strongest.dignity.score}
                  </Text>
                </View>
                <Text style={styles.verdictInterpretation}>
                  {getScoreVerdict(skyVerdict.strongest.dignity.score)}
                </Text>
              </View>

              {/* Current Challenge */}
              <View style={[styles.verdictCard, { borderColor: '#EF444430' }]}>
                <Text style={styles.verdictLabel}>Current Challenge</Text>
                <View style={styles.verdictPlanetRow}>
                  <Text style={[styles.verdictSymbol, { color: PLANET_COLORS[skyVerdict.weakest.planet] }]}>
                    {PLANET_SYMBOLS[skyVerdict.weakest.planet]}
                  </Text>
                  <View style={styles.verdictInfo}>
                    <Text style={styles.verdictName}>{skyVerdict.weakest.planet}</Text>
                    <Text style={styles.verdictSign}>
                      {ZODIAC_SYMBOLS[skyVerdict.weakest.position.sign]} {skyVerdict.weakest.position.sign}
                    </Text>
                  </View>
                  <Text style={[styles.verdictScore, { color: skyVerdict.weakest.dignity.score < 0 ? '#EF4444' : '#6B6B6B' }]}>
                    {skyVerdict.weakest.dignity.score > 0 ? '+' : ''}{skyVerdict.weakest.dignity.score}
                  </Text>
                </View>
                <Text style={styles.verdictInterpretation}>
                  {getScoreVerdict(skyVerdict.weakest.dignity.score)}
                </Text>
              </View>
            </View>
          </>
        )}

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

        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickGrid}>
          <Pressable
            onPress={() => handleQuickAction('sanctum')}
            style={({ pressed }) => [styles.quickCard, pressed && { opacity: 0.7, transform: [{ scale: 0.97 }] }]}
          >
            <Text style={styles.quickIcon}>📖</Text>
            <Text style={styles.quickLabel}>Ritual Mode</Text>
          </Pressable>
          <Pressable
            onPress={() => handleQuickAction('compass')}
            style={({ pressed }) => [styles.quickCard, pressed && { opacity: 0.7, transform: [{ scale: 0.97 }] }]}
          >
            <Text style={styles.quickIcon}>🧭</Text>
            <Text style={styles.quickLabel}>Compass</Text>
          </Pressable>
          <Pressable
            onPress={() => handleQuickAction('runes')}
            style={({ pressed }) => [styles.quickCard, pressed && { opacity: 0.7, transform: [{ scale: 0.97 }] }]}
          >
            <Text style={styles.quickIcon}>ᚠ</Text>
            <Text style={styles.quickLabel}>Runes</Text>
          </Pressable>
          <Pressable
            onPress={() => handleQuickAction('chart')}
            style={({ pressed }) => [styles.quickCard, pressed && { opacity: 0.7, transform: [{ scale: 0.97 }] }]}
          >
            <Text style={styles.quickIcon}>☉</Text>
            <Text style={styles.quickLabel}>Full Chart</Text>
          </Pressable>
        </View>

        {/* Day Ruler */}
        <View style={styles.dayRulerCard}>
          <Text style={styles.dayRulerLabel}>Day Ruler</Text>
          <View style={styles.dayRulerRow}>
            <Text style={[styles.dayRulerSymbol, { color: PLANET_COLORS[planetaryHour.dayRuler] }]}>
              {PLANET_SYMBOLS[planetaryHour.dayRuler]}
            </Text>
            <Text style={styles.dayRulerName}>{planetaryHour.dayRuler}</Text>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

function getScoreVerdict(score: number): string {
  if (score >= 7) return 'Exceptional power. Ideal for rituals.';
  if (score >= 4) return 'Strong dignity. Favorable conditions.';
  if (score >= 1) return 'Moderate strength. Proceed with care.';
  if (score === 0) return 'Peregrine. Neutral influence.';
  if (score >= -4) return 'Weakened. Consider timing alternatives.';
  if (score >= -7) return 'Debilitated. Exercise caution.';
  return 'Extreme debility. Avoid if possible.';
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 100,
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
    marginTop: 10,
    paddingHorizontal: 16,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  sectText: {
    fontFamily: 'JetBrainsMono',
    fontSize: 12,
    fontWeight: '600',
  },
  heroRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  heroCard: {
    flex: 1,
    backgroundColor: '#0D0D0D',
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
  },
  heroLabel: {
    fontSize: 10,
    color: '#6B6B6B',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  heroSymbol: {
    fontSize: 36,
  },
  moonEmoji: {
    fontSize: 36,
  },
  heroTitle: {
    fontFamily: 'Cinzel',
    fontSize: 14,
    marginTop: 4,
    letterSpacing: 1,
  },
  heroMeta: {
    fontFamily: 'JetBrainsMono',
    fontSize: 10,
    color: '#6B6B6B',
    marginTop: 2,
  },
  heroTime: {
    fontFamily: 'JetBrainsMono',
    fontSize: 9,
    color: '#4A4A4A',
    marginTop: 4,
  },
  sectionTitle: {
    fontFamily: 'Cinzel',
    fontSize: 14,
    color: '#E0E0E0',
    marginTop: 20,
    marginBottom: 8,
    letterSpacing: 2,
  },
  verdictRow: {
    gap: 10,
  },
  verdictCard: {
    backgroundColor: '#0D0D0D',
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
  },
  verdictLabel: {
    fontSize: 10,
    color: '#6B6B6B',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  verdictPlanetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  verdictSymbol: {
    fontSize: 28,
    width: 36,
    textAlign: 'center',
  },
  verdictInfo: {
    flex: 1,
  },
  verdictName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#E0E0E0',
  },
  verdictSign: {
    fontFamily: 'JetBrainsMono',
    fontSize: 12,
    color: '#6B6B6B',
    marginTop: 1,
  },
  verdictScore: {
    fontFamily: 'JetBrainsMono',
    fontSize: 22,
    fontWeight: '700',
  },
  verdictInterpretation: {
    fontSize: 11,
    color: '#6B6B6B',
    marginTop: 8,
    fontStyle: 'italic',
    lineHeight: 16,
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
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  quickCard: {
    width: (SCREEN_WIDTH - 42) / 2,
    backgroundColor: '#0D0D0D',
    borderWidth: 1,
    borderColor: '#1A1A1A',
    borderRadius: 12,
    paddingVertical: 18,
    alignItems: 'center',
    gap: 6,
  },
  quickIcon: {
    fontSize: 28,
  },
  quickLabel: {
    fontSize: 12,
    color: '#E0E0E0',
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  dayRulerCard: {
    backgroundColor: '#0D0D0D',
    borderWidth: 1,
    borderColor: '#1A1A1A',
    borderRadius: 12,
    padding: 14,
    marginTop: 16,
    alignItems: 'center',
  },
  dayRulerLabel: {
    fontSize: 10,
    color: '#6B6B6B',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  dayRulerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dayRulerSymbol: {
    fontSize: 24,
  },
  dayRulerName: {
    fontFamily: 'Cinzel',
    fontSize: 16,
    color: '#E0E0E0',
    letterSpacing: 2,
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
