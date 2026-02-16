import { useEffect, useMemo, useState, useCallback } from 'react';
import { Text, View, ScrollView, StyleSheet, Platform, Pressable, Dimensions, TextInput, Modal } from 'react-native';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';

import { ScreenContainer } from '@/components/screen-container';
import { PaywallModal, ProBadge } from '@/components/paywall-modal';
import { useAstroStore } from '@/lib/astro/store';
import { useProStore } from '@/lib/store/pro-store';
import { calculatePlanetaryHours, calculateMoonPhase, PlanetaryHour } from '@/lib/astro/planetary-hours';
import { getRulerRecommendation, getRulerOfDay, DAY_RULERS } from '@/lib/astro/ruler-of-day';
import { calculateEventHorizon, getNextMajorEvent, searchEvents, AstroEvent } from '@/lib/astro/events';
import { getExactAspects, Aspect } from '@/lib/astro/aspects';
import { PLANET_SYMBOLS, PLANET_COLORS, ZODIAC_SYMBOLS, Planet } from '@/lib/astro/types';
import { calculatePowerRating, getPowerLabel } from '@/lib/astro/power-rating';
import { useNatalStore } from '@/lib/store/natal-store';
import { useRuneWalletStore } from '@/lib/store/rune-wallet';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Planet correspondences for Deep Dive overlay
const PLANET_CORRESPONDENCES: Record<string, { element: string; metal: string; color: string; keywords: string }> = {
  Sun: { element: 'Fire', metal: 'Gold', color: '#D4AF37', keywords: 'Vitality, Authority, Success' },
  Moon: { element: 'Water', metal: 'Silver', color: '#C0C0C0', keywords: 'Intuition, Dreams, Emotions' },
  Mars: { element: 'Fire', metal: 'Iron', color: '#EF4444', keywords: 'Courage, Strength, Will' },
  Mercury: { element: 'Air', metal: 'Quicksilver', color: '#F59E0B', keywords: 'Communication, Intelligence' },
  Jupiter: { element: 'Fire', metal: 'Tin', color: '#3B82F6', keywords: 'Expansion, Abundance, Wisdom' },
  Venus: { element: 'Earth', metal: 'Copper', color: '#22C55E', keywords: 'Love, Beauty, Harmony' },
  Saturn: { element: 'Earth', metal: 'Lead', color: '#6B7280', keywords: 'Discipline, Structure, Endings' },
};

export default function HomeScreen() {
  const chartData = useAstroStore((s) => s.chartData);
  const isCalculating = useAstroStore((s) => s.isCalculating);
  const location = useAstroStore((s) => s.location);
  const setLocation = useAstroStore((s) => s.setLocation);
  const recalculate = useAstroStore((s) => s.recalculate);
  const date = useAstroStore((s) => s.date);
  const setDate = useAstroStore((s) => s.setDate);

  const tier = useProStore((s) => s.tier);
  const isFeatureUnlocked = useProStore((s) => s.isFeatureUnlocked);

  const natalChart = useNatalStore((s) => s.natalChart);
  const activeRuneId = useRuneWalletStore((s) => s.activeRuneId);
  const getActiveRune = useRuneWalletStore((s) => s.getActiveRune);

  const [showPaywall, setShowPaywall] = useState(false);
  const [paywallFeature, setPaywallFeature] = useState<string | undefined>();
  const [eventSearch, setEventSearch] = useState('');
  const [showEventSearch, setShowEventSearch] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<AstroEvent | null>(null);
  const [now, setNow] = useState(Date.now());
  const [tooltipText, setTooltipText] = useState<string | null>(null);
  const [selectedAspectExplain, setSelectedAspectExplain] = useState<string | null>(null);

  // GPS location on mount
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

  // Auto-refresh every 30 seconds for real-time data
  useEffect(() => {
    const interval = setInterval(() => {
      setDate(new Date());
      setNow(Date.now());
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // Calculate planetary hour and moon phase (real-time)
  const planetaryHour = useMemo(() => {
    return calculatePlanetaryHours(date, location);
  }, [date, location]);

  const moonPhase = useMemo(() => {
    return calculateMoonPhase(date);
  }, [date]);

  // Ruler of the Day
  const rulerOfDay = useMemo(() => {
    return getRulerRecommendation(date);
  }, [date]);

  // Full day ruler data for Deep Dive
  const dayRulerFull = useMemo(() => {
    return getRulerOfDay(date);
  }, [date]);

  // Countdown to next planetary hour
  const hourCountdown = useMemo(() => {
    const endMs = planetaryHour.currentHour.endTime.getTime();
    const remaining = Math.max(0, endMs - now);
    const mins = Math.floor(remaining / 60000);
    const secs = Math.floor((remaining % 60000) / 1000);
    return { mins, secs, remaining };
  }, [planetaryHour, now]);

  // Event Horizon - next major event
  const eventHorizon = useMemo(() => {
    try {
      const events = calculateEventHorizon(date, location, 2);
      const nextEvent = getNextMajorEvent(events, date);
      return { events, nextEvent };
    } catch {
      return { events: [], nextEvent: null };
    }
  }, [date, location]);

  // Filtered events for search
  const filteredEvents = useMemo(() => {
    if (!eventSearch.trim()) return eventHorizon.events.slice(0, 10);
    return searchEvents(eventHorizon.events, eventSearch).slice(0, 20);
  }, [eventHorizon.events, eventSearch]);

  // Exact aspects for dashboard highlight
  const exactAspects = useMemo(() => {
    if (!chartData) return [];
    return getExactAspects(chartData.planets);
  }, [chartData]);

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

  // Check if current planetary hour matches a ritual planet
  const isRitualHourHighlighted = useMemo(() => {
    const hp = planetaryHour.currentHour.planet;
    return hp === 'Mars' || hp === 'Saturn' || hp === 'Jupiter';
  }, [planetaryHour]);

  // Magical Power Rating
  const powerRating = useMemo(() => {
    if (!chartData) return null;
    const activeRune = getActiveRune();
    const runeDignity = activeRune?.dignityScore ?? 0;
    return calculatePowerRating(
      chartData,
      natalChart,
      runeDignity,
      planetaryHour.currentHour.planet,
    );
  }, [chartData, natalChart, activeRuneId, planetaryHour]);

  const powerLabel = useMemo(() => {
    if (!powerRating) return { label: 'Unknown', color: '#6B6B6B' };
    return getPowerLabel(powerRating.totalScore);
  }, [powerRating]);



  const handleProFeature = (featureId: string) => {
    if (!isFeatureUnlocked(featureId)) {
      setPaywallFeature(featureId);
      setShowPaywall(true);
      return false;
    }
    return true;
  };

  const handleEventTap = useCallback((evt: AstroEvent) => {
    if (Platform.OS !== ('web' as string)) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    setSelectedEvent(evt);
  }, []);

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

  // Days until next event
  const daysUntilEvent = eventHorizon.nextEvent
    ? Math.ceil((eventHorizon.nextEvent.date.getTime() - date.getTime()) / 86400000)
    : null;

  // Planet correspondence for current hour
  const hourCorrespondence = PLANET_CORRESPONDENCES[hourPlanet];

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Title & Date */}
        <Text style={styles.title}>ÆONIS</Text>
        <Text style={styles.subtitle}>
          {date.toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
          {'  '}
          {date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
        </Text>
        <View style={[styles.sectBadge, { backgroundColor: sectColor + '20', borderColor: sectColor }]}>
          <Text style={[styles.sectText, { color: sectColor }]}>{sectLabel}</Text>
        </View>

        {/* Live indicator */}
        <View style={styles.liveIndicator}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>LIVE · Auto-refresh 30s</Text>
        </View>

        {/* ===== Astral Potency Gauge ===== */}
        {powerRating && (
          <View style={[styles.powerCard, { borderColor: powerLabel.color + '40' }]}>
            <Text style={styles.powerHeader}>ASTRAL POTENCY</Text>
            <View style={styles.powerGaugeRow}>
              <View style={styles.powerGaugeTrack}>
                <View
                  style={[
                    styles.powerGaugeFill,
                    {
                      width: `${powerRating.totalScore}%`,
                      backgroundColor: powerLabel.color,
                    },
                  ]}
                />
              </View>
              <Text style={[styles.powerPercent, { color: powerLabel.color }]}>
                {powerRating.totalScore}%
              </Text>
            </View>
            <Text style={[styles.powerLabel, { color: powerLabel.color }]}>
              {powerLabel.label}
            </Text>
            {powerRating.details.length > 0 && (
              <View style={styles.powerDetails}>
                {powerRating.details.slice(0, 4).map((d, i) => (
                  <Text key={i} style={styles.powerDetail}>{d}</Text>
                ))}
              </View>
            )}
          </View>
        )}

        {/* ===== Event Horizon Warning Widget ===== */}
        {eventHorizon.nextEvent && daysUntilEvent !== null && daysUntilEvent <= 30 && (
          <Pressable
            onPress={() => {
              if (handleProFeature('event_horizon')) {
                handleEventTap(eventHorizon.nextEvent!);
              }
            }}
            style={({ pressed }) => [styles.eventWarning, pressed && { opacity: 0.8 }]}
          >
            <Text style={styles.eventWarningIcon}>⚠</Text>
            <View style={styles.eventWarningContent}>
              <Text style={styles.eventWarningTitle}>{eventHorizon.nextEvent.title}</Text>
              <Text style={styles.eventWarningDate}>
                in {daysUntilEvent} {daysUntilEvent === 1 ? 'day' : 'days'}
              </Text>
            </View>
          </Pressable>
        )}

        {/* Hero Card: Planetary Hour + Moon Phase */}
        <View style={styles.heroRow}>
          {/* Planetary Hour Card – with countdown */}
          <Pressable
            onPress={() => {
              if (Platform.OS !== ('web' as string)) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
            style={({ pressed }) => [
              styles.heroCard,
              { borderColor: hourColor + '40' },
              isRitualHourHighlighted && { borderColor: hourColor, borderWidth: 2 },
              pressed && { opacity: 0.9 },
            ]}
          >
            {isRitualHourHighlighted && (
              <View style={[styles.ritualHourBadge, { backgroundColor: hourColor + '20' }]}>
                <Text style={[styles.ritualHourText, { color: hourColor }]}>RITUAL HOUR</Text>
              </View>
            )}
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
            {/* Countdown */}
            <View style={styles.countdownBox}>
              <Text style={[styles.countdownText, { color: hourColor }]}>
                {hourCountdown.mins}:{hourCountdown.secs.toString().padStart(2, '0')}
              </Text>
              <Text style={styles.countdownLabel}>remaining</Text>
            </View>
          </Pressable>

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

        {/* ===== Current Influence Card (Deep Dive) ===== */}
        {hourCorrespondence && (
          <View style={[styles.influenceCard, { borderColor: hourCorrespondence.color + '30' }]}>
            <Text style={styles.influenceLabel}>CURRENT INFLUENCE</Text>
            <View style={styles.influenceRow}>
              <Text style={[styles.influenceSymbol, { color: hourCorrespondence.color }]}>
                {PLANET_SYMBOLS[hourPlanet]}
              </Text>
              <View style={styles.influenceInfo}>
                <Text style={[styles.influenceName, { color: hourCorrespondence.color }]}>{hourPlanet}</Text>
                <Text style={styles.influenceKeywords}>{hourCorrespondence.keywords}</Text>
              </View>
            </View>
            <View style={styles.influenceDetails}>
              <View style={styles.influenceDetail}>
                <Text style={styles.influenceDetailLabel}>Element</Text>
                <Text style={styles.influenceDetailValue}>{hourCorrespondence.element}</Text>
              </View>
              <View style={styles.influenceDetail}>
                <Text style={styles.influenceDetailLabel}>Metal</Text>
                <Text style={styles.influenceDetailValue}>{hourCorrespondence.metal}</Text>
              </View>
              <View style={styles.influenceDetail}>
                <Text style={styles.influenceDetailLabel}>Color</Text>
                <View style={[styles.colorSwatch, { backgroundColor: hourCorrespondence.color }]} />
              </View>
              <View style={styles.influenceDetail}>
                <Text style={styles.influenceDetailLabel}>Time Left</Text>
                <Text style={[styles.influenceDetailValue, { color: hourCorrespondence.color }]}>
                  {hourCountdown.mins}m {hourCountdown.secs}s
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* ===== Ruler of the Day ===== */}
        <View style={[styles.rulerCard, { borderColor: rulerOfDay.color + '40' }]}>
          <View style={styles.rulerHeader}>
            <Text style={[styles.rulerSymbol, { color: rulerOfDay.color }]}>{rulerOfDay.symbol}</Text>
            <View style={styles.rulerInfo}>
              <Text style={styles.rulerLabel}>Ruler of {rulerOfDay.dayName}</Text>
              <Text style={[styles.rulerName, { color: rulerOfDay.color }]}>{rulerOfDay.planet}</Text>
            </View>
          </View>
          <Text style={styles.rulerRecommendation}>{rulerOfDay.recommendation}</Text>
          <View style={styles.rulerCorrespondences}>
            <Text style={styles.rulerCorr}>Element: {dayRulerFull.element}</Text>
            <Text style={styles.rulerCorr}>Metal: {dayRulerFull.metal}</Text>
            <Text style={styles.rulerCorr}>Quality: {dayRulerFull.quality}</Text>
          </View>
        </View>

        {/* ===== Exact Aspects Highlight ===== */}
        {exactAspects.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Exact Aspects</Text>
            {exactAspects.slice(0, 3).map((asp, i) => (
              <Pressable
                key={i}
                onPress={() => {
                  if (Platform.OS !== ('web' as string)) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  const aspectExplanations: Record<string, string> = {
                    Conjunction: `${asp.planet1} and ${asp.planet2} merge their energies. This is a powerful fusion – their combined influence amplifies both planets' qualities.`,
                    Opposition: `${asp.planet1} and ${asp.planet2} face off across the sky. This creates tension and awareness – a push-pull dynamic requiring balance.`,
                    Trine: `${asp.planet1} and ${asp.planet2} flow harmoniously. This is a gift aspect – their energies support each other effortlessly.`,
                    Square: `${asp.planet1} and ${asp.planet2} clash at 90°. This creates friction and challenge – but also the drive for growth and transformation.`,
                    Sextile: `${asp.planet1} and ${asp.planet2} cooperate gently. This is an opportunity aspect – their energies blend well with a little effort.`,
                  };
                  setSelectedAspectExplain(aspectExplanations[asp.type] || `${asp.type}: ${asp.planet1} and ${asp.planet2}`);
                }}
                style={({ pressed }) => [styles.aspectHighlight, pressed && { opacity: 0.7 }]}
              >
                <Text style={styles.aspectSymbols}>
                  {PLANET_SYMBOLS[asp.planet1]} {asp.symbol} {PLANET_SYMBOLS[asp.planet2]}
                </Text>
                <View style={styles.aspectInfo}>
                  <Text style={styles.aspectType}>{asp.type}</Text>
                  <Text style={styles.aspectOrb}>{asp.orb.toFixed(1)}° orb</Text>
                </View>
              </Pressable>
            ))}
          </>
        )}

        {/* Sky Verdict */}
        {skyVerdict && (
          <>
            <Text style={styles.sectionTitle}>Sky Verdict</Text>
            <View style={styles.verdictRow}>
              <View style={[styles.verdictCard, { borderColor: '#22C55E30' }]}>
                <Text style={styles.verdictLabel}>Strongest Influence</Text>
                <View style={styles.verdictPlanetRow}>
                  <Text style={[styles.verdictSymbol, { color: PLANET_COLORS[skyVerdict.strongest.planet] }]}>
                    {PLANET_SYMBOLS[skyVerdict.strongest.planet]}
                  </Text>
                  <View style={styles.verdictInfoCol}>
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

              <View style={[styles.verdictCard, { borderColor: '#EF444430' }]}>
                <Text style={styles.verdictLabel}>Current Challenge</Text>
                <View style={styles.verdictPlanetRow}>
                  <Text style={[styles.verdictSymbol, { color: PLANET_COLORS[skyVerdict.weakest.planet] }]}>
                    {PLANET_SYMBOLS[skyVerdict.weakest.planet]}
                  </Text>
                  <View style={styles.verdictInfoCol}>
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



        {/* ===== Event Horizon Search (Pro) ===== */}
        <View style={styles.eventSection}>
          <View style={styles.eventHeader}>
            <Text style={styles.sectionTitle}>Event Horizon</Text>
            {!isFeatureUnlocked('event_horizon') && (
              <ProBadge onPress={() => handleProFeature('event_horizon')} />
            )}
          </View>

          {isFeatureUnlocked('event_horizon') ? (
            <>
              <View style={styles.searchBar}>
                <Text style={styles.searchIcon}>🔍</Text>
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search events (e.g. solar eclipse)"
                  placeholderTextColor="#4A4A4A"
                  value={eventSearch}
                  onChangeText={setEventSearch}
                  returnKeyType="done"
                />
              </View>
              {filteredEvents.slice(0, 5).map((evt) => {
                const daysAway = Math.ceil((evt.date.getTime() - date.getTime()) / 86400000);
                return (
                  <Pressable
                    key={evt.id}
                    onPress={() => handleEventTap(evt)}
                    style={({ pressed }) => [styles.eventCard, pressed && { opacity: 0.7 }]}
                  >
                    <Text style={styles.eventType}>
                      {evt.type === 'solar_eclipse' ? '🌑' :
                       evt.type === 'lunar_eclipse' ? '🌕' :
                       evt.type === 'retrograde_start' ? '℞' :
                       evt.type === 'retrograde_end' ? '℞D' :
                       evt.type === 'conjunction' ? '☌' : '☍'}
                    </Text>
                    <View style={styles.eventInfo}>
                      <Text style={styles.eventTitle}>{evt.title}</Text>
                      <Text style={styles.eventDate}>
                        {evt.date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                        {daysAway > 0 ? ` · in ${daysAway}d` : ' · TODAY'}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </>
          ) : (
            <Pressable
              onPress={() => handleProFeature('event_horizon')}
              style={({ pressed }) => [styles.lockedCard, pressed && { opacity: 0.7 }]}
            >
              <Text style={styles.lockedIcon}>🔒</Text>
              <Text style={styles.lockedText}>Upgrade to search eclipses, retrogrades & conjunctions</Text>
            </Pressable>
          )}
        </View>

        {/* Arabic Parts – Tappable */}
        <View style={styles.partsRow}>
          {chartData.arabicParts.map((part) => (
            <Pressable
              key={part.name}
              onPress={() => {
                if (Platform.OS !== ('web' as string)) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                const explanations: Record<string, string> = {
                  'Pars Fortunae': 'The Part of Fortune indicates where material luck and worldly success flow most naturally. It is calculated from the Ascendant, Sun, and Moon positions.',
                  'Pars Spiritus': 'The Part of Spirit reveals your soul\'s purpose and spiritual calling. It is the inverse of the Part of Fortune, emphasizing conscious will over fate.',
                };
                setTooltipText(explanations[part.name] || `${part.name} at ${part.signDegree}° ${part.sign}`);
              }}
              style={({ pressed }) => [styles.partBadge, pressed && { opacity: 0.7, borderColor: '#D4AF37' }]}
            >
              <Text style={styles.partName}>{part.name}</Text>
              <Text style={styles.partValue}>
                {ZODIAC_SYMBOLS[part.sign]} {part.signDegree}°
              </Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      {/* ===== Deep Dive Overlay Modal ===== */}
      <Modal
        visible={!!selectedEvent}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedEvent(null)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setSelectedEvent(null)}>
          <Pressable style={styles.modalContent} onPress={() => {}}>
            {selectedEvent && (
              <>
                <View style={styles.modalHandle} />
                <Text style={styles.modalTitle}>{selectedEvent.title}</Text>
                <Text style={styles.modalDate}>
                  {selectedEvent.date.toLocaleDateString('en-US', {
                    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
                  })}
                </Text>

                {/* Days countdown */}
                <View style={styles.modalCountdown}>
                  <Text style={styles.modalCountdownNumber}>
                    {Math.max(0, Math.ceil((selectedEvent.date.getTime() - date.getTime()) / 86400000))}
                  </Text>
                  <Text style={styles.modalCountdownLabel}>days away</Text>
                </View>

                {/* Event details */}
                <View style={styles.modalDetails}>
                  <View style={styles.modalDetailRow}>
                    <Text style={styles.modalDetailLabel}>Type</Text>
                    <Text style={styles.modalDetailValue}>
                      {selectedEvent.type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                    </Text>
                  </View>
                  {selectedEvent.planet && (
                    <View style={styles.modalDetailRow}>
                      <Text style={styles.modalDetailLabel}>Planet</Text>
                      <Text style={[styles.modalDetailValue, { color: PLANET_COLORS[selectedEvent.planet as Planet] || '#E0E0E0' }]}>
                        {PLANET_SYMBOLS[selectedEvent.planet as Planet] || ''} {selectedEvent.planet}
                      </Text>
                    </View>
                  )}
                  {selectedEvent.planet && PLANET_CORRESPONDENCES[selectedEvent.planet] && (
                    <>
                      <View style={styles.modalDetailRow}>
                        <Text style={styles.modalDetailLabel}>Recommended Color</Text>
                        <View style={styles.modalColorRow}>
                          <View style={[styles.modalColorSwatch, { backgroundColor: PLANET_CORRESPONDENCES[selectedEvent.planet].color }]} />
                          <Text style={styles.modalDetailValue}>
                            {PLANET_CORRESPONDENCES[selectedEvent.planet].color}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.modalDetailRow}>
                        <Text style={styles.modalDetailLabel}>Element</Text>
                        <Text style={styles.modalDetailValue}>{PLANET_CORRESPONDENCES[selectedEvent.planet].element}</Text>
                      </View>
                      <View style={styles.modalDetailRow}>
                        <Text style={styles.modalDetailLabel}>Metal</Text>
                        <Text style={styles.modalDetailValue}>{PLANET_CORRESPONDENCES[selectedEvent.planet].metal}</Text>
                      </View>
                    </>
                  )}
                  {selectedEvent.description && (
                    <View style={styles.modalDetailRow}>
                      <Text style={styles.modalDetailLabel}>Notes</Text>
                      <Text style={styles.modalDetailValue}>{selectedEvent.description}</Text>
                    </View>
                  )}
                </View>

                {/* Current planetary hour context */}
                <View style={styles.modalContext}>
                  <Text style={styles.modalContextLabel}>CURRENT CONTEXT</Text>
                  <Text style={styles.modalContextText}>
                    {PLANET_SYMBOLS[hourPlanet]} Hour of {hourPlanet} · {moonPhase.phaseName} · {chartData.sect} Sect
                  </Text>
                </View>

                <Pressable
                  onPress={() => setSelectedEvent(null)}
                  style={({ pressed }) => [styles.modalCloseBtn, pressed && { opacity: 0.8 }]}
                >
                  <Text style={styles.modalCloseBtnText}>Close</Text>
                </Pressable>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      {/* Tooltip Modal */}
      <Modal
        visible={!!tooltipText}
        transparent
        animationType="fade"
        onRequestClose={() => setTooltipText(null)}
      >
        <Pressable style={styles.tooltipOverlay} onPress={() => setTooltipText(null)}>
          <View style={styles.tooltipBox}>
            <Text style={styles.tooltipTitle}>Explanation</Text>
            <Text style={styles.tooltipContent}>{tooltipText}</Text>
            <Pressable
              onPress={() => setTooltipText(null)}
              style={({ pressed }) => [styles.tooltipClose, pressed && { opacity: 0.8 }]}
            >
              <Text style={styles.tooltipCloseText}>Got it</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      {/* Aspect Explanation Modal */}
      <Modal
        visible={!!selectedAspectExplain}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedAspectExplain(null)}
      >
        <Pressable style={styles.tooltipOverlay} onPress={() => setSelectedAspectExplain(null)}>
          <View style={styles.tooltipBox}>
            <Text style={styles.tooltipTitle}>Aspect Energy</Text>
            <Text style={styles.tooltipContent}>{selectedAspectExplain}</Text>
            <Pressable
              onPress={() => setSelectedAspectExplain(null)}
              style={({ pressed }) => [styles.tooltipClose, pressed && { opacity: 0.8 }]}
            >
              <Text style={styles.tooltipCloseText}>Got it</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      <PaywallModal
        visible={showPaywall}
        onClose={() => setShowPaywall(false)}
        featureId={paywallFeature}
      />
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
  content: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 100 },
  title: { fontFamily: 'Cinzel', fontSize: 32, color: '#D4AF37', textAlign: 'center', letterSpacing: 6 },
  subtitle: { fontFamily: 'JetBrainsMono', fontSize: 12, color: '#6B6B6B', textAlign: 'center', marginTop: 4 },
  sectBadge: { alignSelf: 'center', marginTop: 10, paddingHorizontal: 16, paddingVertical: 5, borderRadius: 20, borderWidth: 1 },
  sectText: { fontFamily: 'JetBrainsMono', fontSize: 12, fontWeight: '600' },

  // Live indicator
  liveIndicator: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 8 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#22C55E' },
  liveText: { fontFamily: 'JetBrainsMono', fontSize: 9, color: '#4A4A4A', letterSpacing: 1 },

  // Event Warning
  eventWarning: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#EF444410',
    borderWidth: 1, borderColor: '#EF444430', borderRadius: 12, padding: 12, marginTop: 12, gap: 10,
  },
  eventWarningIcon: { fontSize: 24 },
  eventWarningContent: { flex: 1 },
  eventWarningTitle: { fontSize: 13, fontWeight: '600', color: '#EF4444' },
  eventWarningDate: { fontFamily: 'JetBrainsMono', fontSize: 11, color: '#6B6B6B', marginTop: 2 },

  // Hero
  heroRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  heroCard: { flex: 1, backgroundColor: '#0D0D0D', borderWidth: 1, borderRadius: 14, padding: 14, alignItems: 'center' },
  heroLabel: { fontSize: 10, color: '#6B6B6B', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 },
  heroSymbol: { fontSize: 36 },
  moonEmoji: { fontSize: 36 },
  heroTitle: { fontFamily: 'Cinzel', fontSize: 14, marginTop: 4, letterSpacing: 1 },
  heroMeta: { fontFamily: 'JetBrainsMono', fontSize: 10, color: '#6B6B6B', marginTop: 2 },
  heroTime: { fontFamily: 'JetBrainsMono', fontSize: 9, color: '#4A4A4A', marginTop: 4 },

  // Ritual Hour badge
  ritualHourBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2, marginBottom: 4 },
  ritualHourText: { fontFamily: 'JetBrainsMono', fontSize: 8, fontWeight: '700', letterSpacing: 2 },

  // Countdown
  countdownBox: { marginTop: 8, alignItems: 'center' },
  countdownText: { fontFamily: 'JetBrainsMono', fontSize: 18, fontWeight: '700' },
  countdownLabel: { fontFamily: 'JetBrainsMono', fontSize: 8, color: '#4A4A4A', marginTop: 1 },

  // Current Influence Card
  influenceCard: {
    backgroundColor: '#0D0D0D', borderWidth: 1, borderRadius: 12, padding: 14, marginTop: 12,
  },
  influenceLabel: { fontFamily: 'JetBrainsMono', fontSize: 10, color: '#6B6B6B', letterSpacing: 2, marginBottom: 10 },
  influenceRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  influenceSymbol: { fontSize: 32 },
  influenceInfo: { flex: 1 },
  influenceName: { fontFamily: 'Cinzel', fontSize: 16, letterSpacing: 2 },
  influenceKeywords: { fontSize: 11, color: '#6B6B6B', marginTop: 2 },
  influenceDetails: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#1A1A1A' },
  influenceDetail: { alignItems: 'center', minWidth: 60 },
  influenceDetailLabel: { fontFamily: 'JetBrainsMono', fontSize: 8, color: '#4A4A4A', letterSpacing: 1, marginBottom: 4 },
  influenceDetailValue: { fontSize: 12, color: '#E0E0E0', fontWeight: '600' },
  colorSwatch: { width: 16, height: 16, borderRadius: 4 },

  // Ruler of Day
  rulerCard: {
    backgroundColor: '#0D0D0D', borderWidth: 1, borderRadius: 12, padding: 14, marginTop: 12,
  },
  rulerHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rulerSymbol: { fontSize: 28 },
  rulerInfo: { flex: 1 },
  rulerLabel: { fontSize: 10, color: '#6B6B6B', letterSpacing: 1, textTransform: 'uppercase' },
  rulerName: { fontFamily: 'Cinzel', fontSize: 16, letterSpacing: 2, marginTop: 2 },
  rulerRecommendation: { fontSize: 12, color: '#E0E0E0', lineHeight: 18, marginTop: 10, fontStyle: 'italic' },
  rulerCorrespondences: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#1A1A1A' },
  rulerCorr: { fontFamily: 'JetBrainsMono', fontSize: 10, color: '#6B6B6B' },

  // Exact Aspects
  aspectHighlight: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#D4AF3708',
    borderWidth: 1, borderColor: '#D4AF3720', borderRadius: 10, padding: 12, marginBottom: 6, gap: 12,
  },
  aspectSymbols: { fontSize: 18, color: '#D4AF37', width: 70, textAlign: 'center' },
  aspectInfo: { flex: 1 },
  aspectType: { fontSize: 13, fontWeight: '600', color: '#E0E0E0' },
  aspectOrb: { fontFamily: 'JetBrainsMono', fontSize: 11, color: '#6B6B6B', marginTop: 2 },

  sectionTitle: { fontFamily: 'Cinzel', fontSize: 14, color: '#E0E0E0', marginTop: 20, marginBottom: 8, letterSpacing: 2 },

  // Verdict
  verdictRow: { gap: 10 },
  verdictCard: { backgroundColor: '#0D0D0D', borderWidth: 1, borderRadius: 12, padding: 14 },
  verdictLabel: { fontSize: 10, color: '#6B6B6B', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 },
  verdictPlanetRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  verdictSymbol: { fontSize: 28, width: 36, textAlign: 'center' },
  verdictInfoCol: { flex: 1 },
  verdictName: { fontSize: 16, fontWeight: '600', color: '#E0E0E0' },
  verdictSign: { fontFamily: 'JetBrainsMono', fontSize: 12, color: '#6B6B6B', marginTop: 1 },
  verdictScore: { fontFamily: 'JetBrainsMono', fontSize: 22, fontWeight: '700' },
  verdictInterpretation: { fontSize: 11, color: '#6B6B6B', marginTop: 8, fontStyle: 'italic', lineHeight: 16 },



  // Event Horizon
  eventSection: { marginTop: 8 },
  eventHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#0D0D0D',
    borderWidth: 1, borderColor: '#1A1A1A', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, gap: 8,
  },
  searchIcon: { fontSize: 16 },
  searchInput: { flex: 1, fontSize: 14, color: '#E0E0E0', padding: 0 },
  eventCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#0D0D0D',
    borderWidth: 1, borderColor: '#1A1A1A', borderRadius: 10, padding: 12, marginTop: 6, gap: 10,
  },
  eventType: { fontSize: 20, width: 30, textAlign: 'center' },
  eventInfo: { flex: 1 },
  eventTitle: { fontSize: 13, fontWeight: '600', color: '#E0E0E0' },
  eventDate: { fontFamily: 'JetBrainsMono', fontSize: 11, color: '#6B6B6B', marginTop: 2 },

  // Locked feature
  lockedCard: {
    backgroundColor: '#0D0D0D', borderWidth: 1, borderColor: '#D4AF3720',
    borderRadius: 12, padding: 20, alignItems: 'center', gap: 8,
  },
  lockedIcon: { fontSize: 28 },
  lockedText: { fontSize: 12, color: '#6B6B6B', textAlign: 'center', lineHeight: 18 },

  // Arabic Parts
  partsRow: { flexDirection: 'row', justifyContent: 'center', gap: 12, marginTop: 16 },
  partBadge: { backgroundColor: '#0D0D0D', borderWidth: 1, borderColor: '#1A1A1A', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, alignItems: 'center' },
  partName: { fontSize: 10, color: '#6B6B6B', marginBottom: 2 },
  partValue: { fontFamily: 'JetBrainsMono', fontSize: 13, color: '#E0E0E0' },

  // Deep Dive Modal
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#0D0D0D', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 40, maxHeight: '80%',
  },
  modalHandle: {
    width: 40, height: 4, borderRadius: 2, backgroundColor: '#333',
    alignSelf: 'center', marginBottom: 20,
  },
  modalTitle: { fontFamily: 'Cinzel', fontSize: 20, color: '#D4AF37', textAlign: 'center', letterSpacing: 2 },
  modalDate: { fontFamily: 'JetBrainsMono', fontSize: 12, color: '#6B6B6B', textAlign: 'center', marginTop: 6 },
  modalCountdown: { alignItems: 'center', marginTop: 20 },
  modalCountdownNumber: { fontFamily: 'Cinzel', fontSize: 48, color: '#D4AF37' },
  modalCountdownLabel: { fontFamily: 'JetBrainsMono', fontSize: 11, color: '#6B6B6B', marginTop: 2 },
  modalDetails: {
    marginTop: 20, backgroundColor: '#111', borderRadius: 12, padding: 16,
  },
  modalDetailRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#1A1A1A',
  },
  modalDetailLabel: { fontFamily: 'JetBrainsMono', fontSize: 11, color: '#6B6B6B', letterSpacing: 1 },
  modalDetailValue: { fontSize: 13, color: '#E0E0E0', fontWeight: '600', textAlign: 'right', flex: 1, marginLeft: 12 },
  modalColorRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  modalColorSwatch: { width: 14, height: 14, borderRadius: 3 },
  modalContext: {
    marginTop: 16, backgroundColor: '#0A0A0A', borderRadius: 10, padding: 12,
    borderWidth: 1, borderColor: '#1A1A1A',
  },
  modalContextLabel: { fontFamily: 'JetBrainsMono', fontSize: 9, color: '#4A4A4A', letterSpacing: 2, marginBottom: 6 },
  modalContextText: { fontFamily: 'JetBrainsMono', fontSize: 12, color: '#E0E0E0' },
  modalCloseBtn: {
    backgroundColor: '#D4AF37', borderRadius: 20, paddingVertical: 14,
    alignItems: 'center', marginTop: 20,
  },
  modalCloseBtnText: { color: '#050505', fontSize: 14, fontWeight: '700', letterSpacing: 1 },

  // Tooltip
  tooltipOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center',
    alignItems: 'center', padding: 32,
  },
  tooltipBox: {
    backgroundColor: '#0D0D0D', borderWidth: 1, borderColor: '#D4AF3730',
    borderRadius: 16, padding: 24, maxWidth: 340, width: '100%',
  },
  tooltipTitle: {
    fontFamily: 'Cinzel', fontSize: 16, color: '#D4AF37',
    textAlign: 'center', letterSpacing: 2, marginBottom: 12,
  },
  tooltipContent: {
    fontSize: 13, color: '#E0E0E0', lineHeight: 20, textAlign: 'center',
  },
  tooltipClose: {
    backgroundColor: '#D4AF37', borderRadius: 20, paddingVertical: 10,
    alignItems: 'center', marginTop: 16,
  },
  tooltipCloseText: { color: '#050505', fontSize: 13, fontWeight: '700' },

  // Power Rating Gauge
  powerCard: {
    backgroundColor: '#0D0D0D', borderWidth: 1, borderRadius: 14,
    padding: 16, marginTop: 12,
  },
  powerHeader: {
    fontFamily: 'JetBrainsMono', fontSize: 10, color: '#6B6B6B',
    letterSpacing: 2, marginBottom: 10, textAlign: 'center',
  },
  powerGaugeRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  powerGaugeTrack: {
    flex: 1, height: 8, backgroundColor: '#1A1A1A', borderRadius: 4,
    overflow: 'hidden',
  },
  powerGaugeFill: {
    height: '100%', borderRadius: 4,
  },
  powerPercent: {
    fontFamily: 'JetBrainsMono', fontSize: 18, fontWeight: '700',
    width: 50, textAlign: 'right',
  },
  powerLabel: {
    fontFamily: 'Cinzel', fontSize: 14, textAlign: 'center',
    marginTop: 8, letterSpacing: 3,
  },
  powerDetails: {
    marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#1A1A1A',
    gap: 3,
  },
  powerDetail: {
    fontFamily: 'JetBrainsMono', fontSize: 10, color: '#6B6B6B', lineHeight: 16,
  },

  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { fontSize: 16, color: '#E0E0E0' },
  loadingSubtext: { fontSize: 24, color: '#D4AF37', marginTop: 12, letterSpacing: 8 },
});
