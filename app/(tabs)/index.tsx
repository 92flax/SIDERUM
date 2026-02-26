// ============================================================
// ÆONIS – Dashboard (Digital Grimoire)
// XP Bar Header, Magic Name, Stasis Buff, Power Rating
// ============================================================

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Text, View, ScrollView, StyleSheet, Platform, Pressable, Dimensions, TextInput, Modal } from 'react-native';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';

import { ScreenContainer } from '@/components/screen-container';
import { PaywallModal, ProBadge } from '@/components/paywall-modal';
import { useAstroStore } from '@/lib/astro/store';
import { useProStore } from '@/lib/store/pro-store';
import { calculatePlanetaryHours, calculateMoonPhase } from '@/lib/astro/planetary-hours';
import { getRulerRecommendation, getRulerOfDay } from '@/lib/astro/ruler-of-day';
import { calculateEventHorizon, getNextMajorEvent, searchEvents, AstroEvent } from '@/lib/astro/events';
import { getExactAspects } from '@/lib/astro/aspects';
import { PLANET_SYMBOLS, PLANET_COLORS, ZODIAC_SYMBOLS, Planet } from '@/lib/astro/types';
import { calculatePowerRating, getPowerLabel } from '@/lib/astro/power-rating';
import { calculateAstralPotency, AstralPotencyReport } from '@/lib/astro/potency-engine';
import { getActiveEvents, SanityEvent, getCosmicEvents, SanityCosmicEvent } from '@/lib/cms/sanity';
import { BuffHud } from '@/components/buff-hud';
import { MoonIntelModal, MoonIntelData } from '@/components/moon-intel-modal';
import { useRouter } from 'expo-router';
import { useNatalStore } from '@/lib/store/natal-store';
import { useRuneWalletStore } from '@/lib/store/rune-wallet';
import {
  loadLocalAnalytics, LocalAnalytics, LEVEL_TITLES as LOCAL_LEVEL_TITLES,
  xpForNextLevel, xpForCurrentLevel,
} from '@/lib/ritual/completion-handler';
import { getLevels, type SanityLevelConfig } from '@/lib/cms/sanity';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing } from 'react-native-reanimated';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const MAGIC_NAME_KEY = '@aeonis_magic_name';

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

  // Digital Grimoire state
  const [analytics, setAnalytics] = useState<LocalAnalytics | null>(null);
  const [magicName, setMagicName] = useState<string>('');
  const [cmsLevelTitles, setCmsLevelTitles] = useState<Record<number, string>>({});
  const [stasisBuffActive, setStasisBuffActive] = useState(false);
  const [activeEvents, setActiveEvents] = useState<SanityEvent[]>([]);
  const [cosmicEvents, setCosmicEvents] = useState<SanityCosmicEvent[]>([]);
  const [showMoonModal, setShowMoonModal] = useState(false);
  const router = useRouter();

  // Load analytics, magic name, CMS levels, and active events
  useEffect(() => {
    loadLocalAnalytics().then(setAnalytics);
    AsyncStorage.getItem(MAGIC_NAME_KEY).then(name => {
      if (name) setMagicName(name);
    });
    getActiveEvents().then(setActiveEvents).catch(() => {});
    getCosmicEvents().then(setCosmicEvents).catch(() => {});
    // Load CMS level titles (fall back to local)
    getLevels().then((levels) => {
      if (levels.length > 0) {
        const map: Record<number, string> = {};
        // Sort by xpThreshold and assign rank index
        const sorted = [...levels].sort((a, b) => a.xpThreshold - b.xpThreshold);
        sorted.forEach((lvl, idx) => {
          map[lvl.rank ?? idx] = lvl.title;
        });
        setCmsLevelTitles(map);
      }
    }).catch(() => {});
  }, []);

  // Check stasis buff
  useEffect(() => {
    if (analytics?.lastStasisTimestamp) {
      const minutesSince = (Date.now() - analytics.lastStasisTimestamp) / 60000;
      setStasisBuffActive(minutesSince <= 60);
    }
  }, [analytics]);

  // Stasis Buff Aura animation
  const auraOpacity = useSharedValue(0.3);
  useEffect(() => {
    if (stasisBuffActive) {
      auraOpacity.value = withRepeat(
        withTiming(0.8, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
        -1, true,
      );
    } else {
      auraOpacity.value = withTiming(0, { duration: 300 });
    }
  }, [stasisBuffActive]);
  const auraAnimStyle = useAnimatedStyle(() => ({ opacity: auraOpacity.value }));

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
      } catch {}
      recalculate();
    })();
  }, []);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setDate(new Date());
      setNow(Date.now());
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const planetaryHour = useMemo(() => calculatePlanetaryHours(date, location), [date, location]);
  const moonPhase = useMemo(() => calculateMoonPhase(date), [date]);
  const rulerOfDay = useMemo(() => getRulerRecommendation(date), [date]);
  const dayRulerFull = useMemo(() => getRulerOfDay(date), [date]);

  const hourCountdown = useMemo(() => {
    const endMs = planetaryHour.currentHour.endTime.getTime();
    const remaining = Math.max(0, endMs - now);
    const mins = Math.floor(remaining / 60000);
    const secs = Math.floor((remaining % 60000) / 1000);
    return { mins, secs, remaining };
  }, [planetaryHour, now]);

  const eventHorizon = useMemo(() => {
    try {
      const events = calculateEventHorizon(date, location, 2);
      const nextEvent = getNextMajorEvent(events, date);
      return { events, nextEvent };
    } catch {
      return { events: [], nextEvent: null };
    }
  }, [date, location]);

  const filteredEvents = useMemo(() => {
    if (!eventSearch.trim()) return eventHorizon.events.slice(0, 10);
    return searchEvents(eventHorizon.events, eventSearch).slice(0, 20);
  }, [eventHorizon.events, eventSearch]);

  const exactAspects = useMemo(() => {
    if (!chartData) return [];
    return getExactAspects(chartData.planets);
  }, [chartData]);

  const skyVerdict = useMemo(() => {
    if (!chartData) return null;
    const classicalPlanets: Planet[] = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn'];
    const entries = classicalPlanets.map(p => ({
      planet: p,
      dignity: chartData.dignities[p],
      position: chartData.planets.find(pp => pp.planet === p)!,
    }));
    const sorted = [...entries].sort((a, b) => b.dignity.score - a.dignity.score);
    return { strongest: sorted[0], weakest: sorted[sorted.length - 1] };
  }, [chartData]);

  const isRitualHourHighlighted = useMemo(() => {
    const hp = planetaryHour.currentHour.planet;
    return hp === 'Mars' || hp === 'Saturn' || hp === 'Jupiter';
  }, [planetaryHour]);

  // Power Rating with stasis buff
  const powerRating = useMemo(() => {
    if (!chartData) return null;
    const activeRune = getActiveRune();
    const runeDignity = activeRune?.dignityScore ?? 0;
    return calculatePowerRating(
      chartData, natalChart, runeDignity,
      planetaryHour.currentHour.planet, stasisBuffActive,
    );
  }, [chartData, natalChart, activeRuneId, planetaryHour, stasisBuffActive]);

  const powerLabel = useMemo(() => {
    if (!powerRating) return { label: 'Unknown', color: '#6B6B6B' };
    return getPowerLabel(powerRating.totalScore);
  }, [powerRating]);

  // Astral Potency Engine v2
  const potencyReport = useMemo<AstralPotencyReport | null>(() => {
    if (!chartData) return null;
    // Determine user intent from the current planetary hour
    const hourPlanetLocal = planetaryHour.currentHour.planet;
    const intentMap: Record<string, string> = {
      Mars: 'BANISH', Saturn: 'BANISH',
      Sun: 'INVOKE', Moon: 'INVOKE', Mercury: 'INVOKE', Jupiter: 'INVOKE', Venus: 'INVOKE',
    };
    const userIntent = intentMap[hourPlanetLocal] ?? null;
    // Last session timestamp (Gnosis or Stasis)
    const lastSession = analytics?.lastStasisTimestamp ?? null;
    return calculateAstralPotency(
      planetaryHour, userIntent, lastSession, cosmicEvents,
    );
  }, [chartData, planetaryHour, analytics, stasisBuffActive, cosmicEvents]);

  // Moon intel data for modal
  const moonIntelData = useMemo<MoonIntelData | null>(() => {
    if (!chartData) return null;
    const moonPos = chartData.planets.find(p => p.planet === 'Moon');
    return {
      phaseName: moonPhase.phaseName,
      illumination: moonPhase.illumination,
      emoji: moonPhase.emoji,
      zodiacSign: moonPos?.sign,
      zodiacSymbol: moonPos ? ZODIAC_SYMBOLS[moonPos.sign] : undefined,
      zodiacDegree: moonPos ? `${moonPos.signDegree}°${moonPos.signMinute.toString().padStart(2, '0')}'` : undefined,
    };
  }, [chartData, moonPhase]);

  // Build a lookup: match AstroEvent → SanityCosmicEvent by aspectKey, type, and planet names
  const cosmicEventMap = useMemo(() => {
    const map = new Map<string, SanityCosmicEvent>();
    if (cosmicEvents.length === 0) return map;
    for (const evt of eventHorizon.events) {
      // Try matching by aspectKey (e.g. "Mercury conjunct Venus" matches title "Mercury-Venus Conjunction")
      const matched = cosmicEvents.find(ce => {
        if (!ce.aspectKey) return false;
        const key = ce.aspectKey.toLowerCase();
        const title = evt.title.toLowerCase();
        // Direct title match
        if (title.includes(key) || key.includes(title)) return true;
        // Match by planet names in both
        const planets = [evt.planet, evt.planet2].filter(Boolean).map(p => p!.toLowerCase());
        const keyHasPlanets = planets.length > 0 && planets.every(p => key.includes(p));
        // Also match event type keywords
        const typeKeywords: Record<string, string[]> = {
          conjunction: ['conjunct', 'conjunction'],
          opposition: ['opposition', 'oppose'],
          retrograde_start: ['retrograde', 'stations retrograde'],
          retrograde_end: ['direct', 'stations direct'],
          solar_eclipse: ['solar eclipse'],
          lunar_eclipse: ['lunar eclipse'],
        };
        const typeMatch = (typeKeywords[evt.type] ?? []).some(kw => key.includes(kw));
        return keyHasPlanets && typeMatch;
      });
      if (matched) map.set(evt.id, matched);
    }
    return map;
  }, [eventHorizon.events, cosmicEvents]);

  const handleProFeature = (featureId: string) => {
    if (!isFeatureUnlocked(featureId)) {
      setPaywallFeature(featureId);
      setShowPaywall(true);
      return false;
    }
    return true;
  };

  const handleEventTap = useCallback((evt: AstroEvent) => {
    if (Platform.OS !== ('web' as string)) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedEvent(evt);
  }, []);

  // XP bar calculations
  const currentLevel = analytics?.levelRank ?? 0;
  const currentLevelXp = xpForCurrentLevel(currentLevel);
  const nextLevelXp = xpForNextLevel(currentLevel);
  const xpProgress = (analytics?.xpTotal ?? 0) - currentLevelXp;
  const xpNeeded = nextLevelXp - currentLevelXp;
  const xpPercent = xpNeeded > 0 ? Math.min(100, Math.round((xpProgress / xpNeeded) * 100)) : 100;

  // Resolve level title: CMS first, then local fallback
  const resolvedLevelTitle = cmsLevelTitles[currentLevel] || LOCAL_LEVEL_TITLES[currentLevel] || 'Neophyte';

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
  const daysUntilEvent = eventHorizon.nextEvent
    ? Math.ceil((eventHorizon.nextEvent.date.getTime() - date.getTime()) / 86400000)
    : null;
  const hourCorrespondence = PLANET_CORRESPONDENCES[hourPlanet];

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* ===== XP BAR HEADER with Stasis Aura ===== */}
        <View style={styles.xpHeaderWrapper}>
          {stasisBuffActive && (
            <Animated.View style={[styles.auraContainer, auraAnimStyle]}>
              <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
                <Defs>
                  <RadialGradient id="auraGrad" cx="50%" cy="50%" rx="50%" ry="50%">
                    <Stop offset="0%" stopColor="#00FFFF" stopOpacity="0.4" />
                    <Stop offset="60%" stopColor="#0088AA" stopOpacity="0.15" />
                    <Stop offset="100%" stopColor="#000000" stopOpacity="0" />
                  </RadialGradient>
                </Defs>
                <Circle cx="50%" cy="50%" r="50%" fill="url(#auraGrad)" />
              </Svg>
            </Animated.View>
          )}
          <View style={styles.xpHeader}>
          <View style={styles.xpHeaderTop}>
            <View style={styles.xpNameRow}>
              <Text style={styles.xpBrandLabel}>ÆONIS</Text>
              {magicName ? (
                <Text style={styles.xpBrandLabel}> · {magicName}</Text>
              ) : null}
              <Text style={styles.xpBrandLabel}> · {resolvedLevelTitle}</Text>
            </View>
            <View style={styles.xpRankRow}>
              <Text style={styles.xpLevelTitle}>
                Lv.{currentLevel}
              </Text>
              <View style={styles.xpBadge}>
                <Text style={styles.xpBadgeText}>
                  {(analytics?.xpTotal ?? 0).toLocaleString()} XP
                </Text>
              </View>
            </View>
          </View>
          <View style={styles.xpBarTrack}>
            <View style={[styles.xpBarFill, { width: `${xpPercent}%` }]} />
          </View>
          <View style={styles.xpBarLabels}>
            <Text style={styles.xpBarLabel}>{xpProgress}/{xpNeeded}</Text>
            {stasisBuffActive && (
              <View style={styles.stasisBuff}>
                <Text style={styles.stasisBuffText}>STASIS ×1.15</Text>
              </View>
            )}
          </View>
          </View>
        </View>

        {/* Date & Sect */}
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

        {/* ===== RPG Buff HUD (Potency Engine v2) ===== */}
        {potencyReport && <BuffHud report={potencyReport} />}

        {/* ===== Event Horizon Warning ===== */}
        {eventHorizon.nextEvent && daysUntilEvent !== null && daysUntilEvent <= 30 && (
          <Pressable
            onPress={() => {
              if (handleProFeature('event_horizon')) handleEventTap(eventHorizon.nextEvent!);
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
          <Pressable
            onPress={() => {
              if (Platform.OS !== ('web' as string)) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
            style={({ pressed }) => [
              styles.heroCard, { borderColor: hourColor + '40' },
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
            <Text style={[styles.heroSymbol, { color: hourColor }]}>{PLANET_SYMBOLS[hourPlanet]}</Text>
            <Text style={[styles.heroTitle, { color: hourColor }]}>{hourPlanet}</Text>
            <Text style={styles.heroMeta}>Hour {planetaryHour.currentHour.hourNumber} of 24</Text>
            <Text style={styles.heroMeta}>{planetaryHour.currentHour.isDayHour ? 'Day' : 'Night'} Hour</Text>
            <View style={styles.countdownBox}>
              <Text style={[styles.countdownText, { color: hourColor }]}>
                {hourCountdown.mins}:{hourCountdown.secs.toString().padStart(2, '0')}
              </Text>
              <Text style={styles.countdownLabel}>remaining</Text>
            </View>
          </Pressable>

          <Pressable
            onPress={() => {
              if (Platform.OS !== ('web' as string)) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowMoonModal(true);
            }}
            style={({ pressed }) => [
              styles.heroCard,
              { borderColor: '#C0C0C040' },
              pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] },
            ]}
          >
            <Text style={styles.heroLabel}>Moon Phase</Text>
            <Text style={styles.moonEmoji}>{moonPhase.emoji}</Text>
            <Text style={[styles.heroTitle, { color: '#C0C0C0' }]}>{moonPhase.phaseName}</Text>
            <Text style={styles.heroMeta}>{moonPhase.illumination.toFixed(0)}% illuminated</Text>
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
          </Pressable>
        </View>

        {/* Current Influence Card */}
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

        {/* Ruler of the Day */}
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

        {/* Exact Aspects */}
        {exactAspects.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Exact Aspects</Text>
            {exactAspects.slice(0, 3).map((asp, i) => (
              <Pressable
                key={i}
                onPress={() => {
                  if (Platform.OS !== ('web' as string)) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  const explanations: Record<string, string> = {
                    Conjunction: `${asp.planet1} and ${asp.planet2} merge their energies into a single, intensified force.`,
                    Opposition: `${asp.planet1} and ${asp.planet2} face off across the sky, creating tension that demands balance.`,
                    Trine: `${asp.planet1} and ${asp.planet2} flow harmoniously — a gift aspect of natural ease.`,
                    Square: `${asp.planet1} and ${asp.planet2} clash at 90°, driving growth through friction.`,
                    Sextile: `${asp.planet1} and ${asp.planet2} cooperate gently — an opportunity aspect.`,
                  };
                  setSelectedAspectExplain(explanations[asp.type] || `${asp.type}: ${asp.planet1} and ${asp.planet2}`);
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

        {/* Event Horizon */}
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
                const matchedCms = cosmicEventMap.get(evt.id);
                return (
                  <Pressable
                    key={evt.id}
                    onPress={() => handleEventTap(evt)}
                    style={({ pressed }) => [styles.eventCard, matchedCms ? styles.eventCardWithIntel : undefined, pressed && { opacity: 0.7 }]}
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
                      <View style={styles.intelPreview}>
                        <Text style={styles.intelPreviewText} numberOfLines={2}>
                          {matchedCms?.magickalDirective
                            ? matchedCms.magickalDirective
                            : '> Awaiting cosmic intel...'}
                        </Text>
                      </View>
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

        {/* Arabic Parts */}
        <View style={styles.partsRow}>
          {chartData.arabicParts.map((part) => (
            <Pressable
              key={part.name}
              onPress={() => {
                if (Platform.OS !== ('web' as string)) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                const explanations: Record<string, string> = {
                  'Pars Fortunae': 'The Part of Fortune indicates where material luck and worldly success flow most naturally.',
                  'Pars Spiritus': 'The Part of Spirit reveals your soul\'s purpose and spiritual calling.',
                };
                setTooltipText(explanations[part.name] || `${part.name} at ${part.signDegree}° ${part.sign}`);
              }}
              style={({ pressed }) => [styles.partBadge, pressed && { opacity: 0.7, borderColor: '#D4AF37' }]}
            >
              <Text style={styles.partName}>{part.name}</Text>
              <Text style={styles.partValue}>{ZODIAC_SYMBOLS[part.sign]} {part.signDegree}°</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      {/* Event Deep Dive Modal */}
      <Modal visible={!!selectedEvent} transparent animationType="slide" onRequestClose={() => setSelectedEvent(null)}>
        <Pressable style={styles.modalOverlay} onPress={() => setSelectedEvent(null)}>
          <Pressable style={styles.modalContent} onPress={() => {}}>
            {selectedEvent && (
              <>
                <View style={styles.modalHandle} />
                <Text style={styles.modalTitle}>{selectedEvent.title}</Text>
                <Text style={styles.modalDate}>
                  {selectedEvent.date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </Text>
                <View style={styles.modalCountdown}>
                  <Text style={styles.modalCountdownNumber}>
                    {Math.max(0, Math.ceil((selectedEvent.date.getTime() - date.getTime()) / 86400000))}
                  </Text>
                  <Text style={styles.modalCountdownLabel}>days away</Text>
                </View>
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
                {/* Magickal Directive from CMS (replaces dry API notes) */}
                {(() => {
                  const matchedCosmic = cosmicEventMap.get(selectedEvent.id)
                    ?? cosmicEvents.find(ce =>
                      ce.aspectKey && selectedEvent.title.toLowerCase().includes(ce.aspectKey.toLowerCase())
                    );
                  return (
                    <View style={styles.directiveSection}>
                      <Text style={styles.directiveHeader}>[ MAGICKAL DIRECTIVE ]</Text>
                      {matchedCosmic?.magickalDirective ? (
                        <Text style={styles.directiveText}>{matchedCosmic.magickalDirective}</Text>
                      ) : (
                        <Text style={styles.directiveFallback}>&gt; Awaiting cosmic intel from the Sanctum...</Text>
                      )}
                      {matchedCosmic?.warning && (
                        <>
                          <Text style={styles.directiveWarningHeader}>[ WARNING ]</Text>
                          <Text style={styles.directiveWarning}>{matchedCosmic.warning}</Text>
                        </>
                      )}
                      {matchedCosmic?.supportedIntents && matchedCosmic.supportedIntents.length > 0 && (
                        <>
                          <Text style={styles.directiveSupportedHeader}>[ SUPPORTED INTENTS ]</Text>
                          <Text style={styles.directiveSupportedText}>
                            {matchedCosmic.supportedIntents.join(' · ')}
                          </Text>
                        </>
                      )}
                    </View>
                  );
                })()}
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
      <Modal visible={!!tooltipText} transparent animationType="fade" onRequestClose={() => setTooltipText(null)}>
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
      <Modal visible={!!selectedAspectExplain} transparent animationType="fade" onRequestClose={() => setSelectedAspectExplain(null)}>
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

      {/* Moon Intel Modal */}
      <MoonIntelModal
        visible={showMoonModal}
        onClose={() => setShowMoonModal(false)}
        data={moonIntelData}
      />

      <PaywallModal visible={showPaywall} onClose={() => setShowPaywall(false)} featureId={paywallFeature} />
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

  // XP Header
  xpHeaderWrapper: {
    position: 'relative' as const, marginBottom: 8,
  },
  auraContainer: {
    ...StyleSheet.absoluteFillObject,
    top: -20, bottom: -20, left: -20, right: -20,
    zIndex: 0,
  },
  xpHeader: {
    backgroundColor: '#0D0D0D', borderWidth: 1, borderColor: '#D4AF3730',
    borderRadius: 14, padding: 14, zIndex: 1,
  },
  xpHeaderTop: {
    gap: 4,
  },
  xpNameRow: {
    flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap',
  },
  xpBrandLabel: {
    fontFamily: 'Cinzel', fontSize: 18, color: '#D4AF37', letterSpacing: 2,
  },
  xpRankRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 2,
  },
  xpLevelTitle: {
    fontFamily: 'JetBrainsMono', fontSize: 10, color: '#6B6B6B', letterSpacing: 1,
  },
  xpBadge: {
    backgroundColor: '#D4AF3710', borderWidth: 1, borderColor: '#D4AF3730',
    borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4,
  },
  xpBadgeText: {
    fontFamily: 'JetBrainsMono', fontSize: 12, color: '#D4AF37', fontWeight: '700',
  },
  xpBarTrack: {
    height: 4, backgroundColor: '#1A1A1A', borderRadius: 2, marginTop: 10, overflow: 'hidden',
  },
  xpBarFill: {
    height: '100%', backgroundColor: '#D4AF37', borderRadius: 2,
  },
  xpBarLabels: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4,
  },
  xpBarLabel: {
    fontFamily: 'JetBrainsMono', fontSize: 9, color: '#4A4A4A',
  },
  stasisBuff: {
    backgroundColor: '#22C55E15', borderWidth: 1, borderColor: '#22C55E30',
    borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2,
  },
  stasisBuffText: {
    fontFamily: 'JetBrainsMono', fontSize: 8, color: '#22C55E', fontWeight: '700', letterSpacing: 1,
  },

  subtitle: { fontFamily: 'JetBrainsMono', fontSize: 12, color: '#6B6B6B', textAlign: 'center', marginTop: 4 },
  sectBadge: { alignSelf: 'center', marginTop: 10, paddingHorizontal: 16, paddingVertical: 5, borderRadius: 20, borderWidth: 1 },
  sectText: { fontFamily: 'JetBrainsMono', fontSize: 12, fontWeight: '600' },

  liveIndicator: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 8 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#22C55E' },
  liveText: { fontFamily: 'JetBrainsMono', fontSize: 9, color: '#4A4A4A', letterSpacing: 1 },

  eventWarning: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#EF444410',
    borderWidth: 1, borderColor: '#EF444430', borderRadius: 12, padding: 12, marginTop: 12, gap: 10,
  },
  eventWarningIcon: { fontSize: 24 },
  eventWarningContent: { flex: 1 },
  eventWarningTitle: { fontSize: 13, fontWeight: '600', color: '#EF4444' },
  eventWarningDate: { fontFamily: 'JetBrainsMono', fontSize: 11, color: '#6B6B6B', marginTop: 2 },

  heroRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  heroCard: { flex: 1, backgroundColor: '#0D0D0D', borderWidth: 1, borderRadius: 14, padding: 14, alignItems: 'center' },
  heroLabel: { fontSize: 10, color: '#6B6B6B', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 },
  heroSymbol: { fontSize: 36 },
  moonEmoji: { fontSize: 36 },
  heroTitle: { fontFamily: 'Cinzel', fontSize: 14, marginTop: 4, letterSpacing: 1 },
  heroMeta: { fontFamily: 'JetBrainsMono', fontSize: 10, color: '#6B6B6B', marginTop: 2 },
  heroTime: { fontFamily: 'JetBrainsMono', fontSize: 9, color: '#4A4A4A', marginTop: 4 },

  ritualHourBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2, marginBottom: 4 },
  ritualHourText: { fontFamily: 'JetBrainsMono', fontSize: 8, fontWeight: '700', letterSpacing: 2 },

  countdownBox: { marginTop: 8, alignItems: 'center' },
  countdownText: { fontFamily: 'JetBrainsMono', fontSize: 18, fontWeight: '700' },
  countdownLabel: { fontFamily: 'JetBrainsMono', fontSize: 8, color: '#4A4A4A', marginTop: 1 },

  influenceCard: { backgroundColor: '#0D0D0D', borderWidth: 1, borderRadius: 12, padding: 14, marginTop: 12 },
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

  rulerCard: { backgroundColor: '#0D0D0D', borderWidth: 1, borderRadius: 12, padding: 14, marginTop: 12 },
  rulerHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rulerSymbol: { fontSize: 28 },
  rulerInfo: { flex: 1 },
  rulerLabel: { fontSize: 10, color: '#6B6B6B', letterSpacing: 1, textTransform: 'uppercase' },
  rulerName: { fontFamily: 'Cinzel', fontSize: 16, letterSpacing: 2, marginTop: 2 },
  rulerRecommendation: { fontSize: 12, color: '#E0E0E0', lineHeight: 18, marginTop: 10, fontStyle: 'italic' },
  rulerCorrespondences: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#1A1A1A' },
  rulerCorr: { fontFamily: 'JetBrainsMono', fontSize: 10, color: '#6B6B6B' },

  aspectHighlight: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#D4AF3708',
    borderWidth: 1, borderColor: '#D4AF3720', borderRadius: 10, padding: 12, marginBottom: 6, gap: 12,
  },
  aspectSymbols: { fontSize: 18, color: '#D4AF37', width: 70, textAlign: 'center' },
  aspectInfo: { flex: 1 },
  aspectType: { fontSize: 13, fontWeight: '600', color: '#E0E0E0' },
  aspectOrb: { fontFamily: 'JetBrainsMono', fontSize: 11, color: '#6B6B6B', marginTop: 2 },

  sectionTitle: { fontFamily: 'Cinzel', fontSize: 14, color: '#E0E0E0', marginTop: 20, marginBottom: 8, letterSpacing: 2 },

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

  lockedCard: {
    backgroundColor: '#0D0D0D', borderWidth: 1, borderColor: '#D4AF3720',
    borderRadius: 12, padding: 20, alignItems: 'center', gap: 8,
  },
  lockedIcon: { fontSize: 28 },
  lockedText: { fontSize: 12, color: '#6B6B6B', textAlign: 'center', lineHeight: 18 },

  partsRow: { flexDirection: 'row', justifyContent: 'center', gap: 12, marginTop: 16 },
  partBadge: { backgroundColor: '#0D0D0D', borderWidth: 1, borderColor: '#1A1A1A', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, alignItems: 'center' },
  partName: { fontSize: 10, color: '#6B6B6B', marginBottom: 2 },
  partValue: { fontFamily: 'JetBrainsMono', fontSize: 13, color: '#E0E0E0' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: '#0D0D0D', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 40, maxHeight: '80%',
  },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#333', alignSelf: 'center', marginBottom: 20 },
  modalTitle: { fontFamily: 'Cinzel', fontSize: 20, color: '#D4AF37', textAlign: 'center', letterSpacing: 2 },
  modalDate: { fontFamily: 'JetBrainsMono', fontSize: 12, color: '#6B6B6B', textAlign: 'center', marginTop: 6 },
  modalCountdown: { alignItems: 'center', marginTop: 20 },
  modalCountdownNumber: { fontFamily: 'Cinzel', fontSize: 48, color: '#D4AF37' },
  modalCountdownLabel: { fontFamily: 'JetBrainsMono', fontSize: 11, color: '#6B6B6B', marginTop: 2 },
  modalDetails: { marginTop: 20, backgroundColor: '#111', borderRadius: 12, padding: 16 },
  modalDetailRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#1A1A1A',
  },
  modalDetailLabel: { fontFamily: 'JetBrainsMono', fontSize: 11, color: '#6B6B6B', letterSpacing: 1 },
  modalDetailValue: { fontSize: 13, color: '#E0E0E0', fontWeight: '600', textAlign: 'right', flex: 1, marginLeft: 12 },
  modalCloseBtn: { backgroundColor: '#D4AF37', borderRadius: 20, paddingVertical: 14, alignItems: 'center', marginTop: 20 },
  modalCloseBtnText: { color: '#050505', fontSize: 14, fontWeight: '700', letterSpacing: 1 },

  tooltipOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: 32 },
  tooltipBox: {
    backgroundColor: '#0D0D0D', borderWidth: 1, borderColor: '#D4AF3730',
    borderRadius: 16, padding: 24, maxWidth: 340, width: '100%',
  },
  tooltipTitle: { fontFamily: 'Cinzel', fontSize: 16, color: '#D4AF37', textAlign: 'center', letterSpacing: 2, marginBottom: 12 },
  tooltipContent: { fontSize: 13, color: '#E0E0E0', lineHeight: 20, textAlign: 'center' },
  tooltipClose: { backgroundColor: '#D4AF37', borderRadius: 20, paddingVertical: 10, alignItems: 'center', marginTop: 16 },
  tooltipCloseText: { color: '#050505', fontSize: 13, fontWeight: '700' },

  // Astral Potency Card
  potencyCard: {
    backgroundColor: '#0D0D0D', borderWidth: 1, borderRadius: 16, padding: 18, marginTop: 12,
    overflow: 'hidden', position: 'relative',
  },
  potencyGlow: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 16,
  },
  potencyBadge: {
    alignSelf: 'flex-start', borderWidth: 1, borderRadius: 6,
    paddingHorizontal: 10, paddingVertical: 3, marginBottom: 10,
  },
  potencyBadgeText: {
    fontFamily: 'JetBrainsMono', fontSize: 9, fontWeight: '700', letterSpacing: 2,
  },
  potencyHeadline: {
    fontFamily: 'Cinzel', fontSize: 18, letterSpacing: 2, marginBottom: 8,
  },
  potencyMessage: {
    fontSize: 13, color: '#B0B0B0', lineHeight: 20, marginBottom: 14,
  },
  potencyGaugeRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  potencyGaugeTrack: { flex: 1, height: 6, backgroundColor: '#1A1A1A', borderRadius: 3, overflow: 'hidden' },
  potencyGaugeFill: { height: '100%', borderRadius: 3 },
  potencyPercent: { fontFamily: 'JetBrainsMono', fontSize: 16, fontWeight: '700', width: 46, textAlign: 'right' },
  potencyPills: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12,
  },
  potencyPill: {
    backgroundColor: '#111', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5,
    flexDirection: 'row', alignItems: 'center', gap: 6,
  },
  potencyPillLabel: {
    fontFamily: 'JetBrainsMono', fontSize: 9, color: '#4A4A4A', letterSpacing: 1,
  },
  potencyPillValue: {
    fontFamily: 'JetBrainsMono', fontSize: 11, fontWeight: '700',
  },
  potencyAction: {
    borderWidth: 1, borderRadius: 10, paddingVertical: 12, alignItems: 'center',
    backgroundColor: '#0A0A0A',
  },
  potencyActionText: {
    fontFamily: 'Cinzel', fontSize: 13, fontWeight: '700', letterSpacing: 2,
  },

  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { fontSize: 16, color: '#E0E0E0' },
  loadingSubtext: { fontSize: 24, color: '#D4AF37', marginTop: 12, letterSpacing: 8 },

  // Magickal Directive (Event Modal)
  directiveSection: {
    backgroundColor: '#111',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#D4AF3730',
  },
  directiveHeader: {
    fontFamily: 'JetBrainsMono',
    fontSize: 11,
    color: '#D4AF37',
    letterSpacing: 2,
    marginBottom: 8,
  },
  directiveText: {
    fontSize: 13,
    color: '#E0E0E0',
    lineHeight: 20,
    fontStyle: 'italic',
  },
  directiveWarningHeader: {
    fontFamily: 'JetBrainsMono',
    fontSize: 11,
    color: '#EF4444',
    letterSpacing: 2,
    marginTop: 14,
    marginBottom: 8,
  },
  directiveWarning: {
    fontSize: 13,
    color: '#F87171',
    lineHeight: 20,
  },
  directiveFallback: {
    fontFamily: 'JetBrainsMono',
    fontSize: 12,
    color: '#4A4A4A',
    fontStyle: 'italic' as const,
    lineHeight: 18,
  },
  directiveSupportedHeader: {
    fontFamily: 'JetBrainsMono',
    fontSize: 11,
    color: '#3B82F6',
    letterSpacing: 2,
    marginTop: 14,
    marginBottom: 6,
  },
  directiveSupportedText: {
    fontFamily: 'JetBrainsMono',
    fontSize: 12,
    color: '#A3A3A3',
    letterSpacing: 1,
  },

  // Event Card Intel Preview
  eventCardWithIntel: {
    borderColor: '#D4AF3725',
  },
  intelPreview: {
    marginTop: 6,
    borderLeftWidth: 2,
    borderLeftColor: '#D4AF37',
    paddingLeft: 8,
  },
  intelPreviewText: {
    fontFamily: 'JetBrainsMono',
    fontSize: 11,
    color: '#A3A3A3',
    lineHeight: 16,
  },
});
