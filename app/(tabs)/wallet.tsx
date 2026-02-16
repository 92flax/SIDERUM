// ============================================================
// ÆONIS – Rune Wallet (Talisman Inventory)
// Grid view with single-selection toggle and active talisman
// ============================================================

import { useEffect, useMemo, useCallback, useState } from 'react';
import {
  Text, View, StyleSheet, FlatList, Pressable, Platform,
  Dimensions, Alert,
} from 'react-native';
import Svg, { Line, Path, Circle } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { ScreenContainer } from '@/components/screen-container';
import { useRuneWalletStore, SavedRune } from '@/lib/store/rune-wallet';
import { ELDER_FUTHARK, generateBindruneData } from '@/lib/runes/futhark';
import { useAstroStore } from '@/lib/astro/store';
import { PLANET_COLORS, Planet } from '@/lib/astro/types';

const { width: SW } = Dimensions.get('window');
const CARD_SIZE = (SW - 48) / 2;
const MINI_RUNE_SIZE = CARD_SIZE - 40;

export default function WalletScreen() {
  const savedRunes = useRuneWalletStore((s) => s.savedRunes);
  const activeRuneId = useRuneWalletStore((s) => s.activeRuneId);
  const masterRune = useRuneWalletStore((s) => s.masterRune);
  const loadWallet = useRuneWalletStore((s) => s.loadWallet);
  const setActiveRune = useRuneWalletStore((s) => s.setActiveRune);
  const removeRune = useRuneWalletStore((s) => s.removeRune);

  const chartData = useAstroStore((s) => s.chartData);

  const [selectedDetail, setSelectedDetail] = useState<string | null>(null);

  useEffect(() => { loadWallet(); }, []);

  // Get dignity score for a rune's linked planet
  const getDignityGlow = useCallback((rune: SavedRune): { color: string; score: number } | null => {
    if (!chartData) return null;
    const runeObjs = rune.runeNames.map(n => ELDER_FUTHARK.find(r => r.name === n)).filter(Boolean);
    const planets = runeObjs.map(r => r?.planet).filter(Boolean) as Planet[];
    if (planets.length === 0) return null;

    // Use the highest dignity score among linked planets
    let bestScore = -999;
    let bestPlanet: Planet = 'Sun';
    for (const p of planets) {
      const d = chartData.dignities[p];
      if (d && d.score > bestScore) {
        bestScore = d.score;
        bestPlanet = p;
      }
    }
    return { color: PLANET_COLORS[bestPlanet], score: bestScore };
  }, [chartData]);

  const handleToggleActive = useCallback((id: string) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    if (activeRuneId === id) {
      setActiveRune(null);
    } else {
      setActiveRune(id);
    }
  }, [activeRuneId]);

  const handleDelete = useCallback((rune: SavedRune) => {
    if (rune.isMasterRune) return; // Can't delete master rune
    if (Platform.OS === 'web') {
      removeRune(rune.id);
    } else {
      Alert.alert(
        'Remove Talisman',
        `Remove "${rune.name}" from your wallet?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Remove', style: 'destructive', onPress: () => removeRune(rune.id) },
        ]
      );
    }
  }, []);

  const activeRune = useMemo(() => {
    if (!activeRuneId) return null;
    return savedRunes.find(r => r.id === activeRuneId) || null;
  }, [savedRunes, activeRuneId]);

  const renderRuneCard = useCallback(({ item }: { item: SavedRune }) => {
    const isActive = item.id === activeRuneId;
    const dignity = getDignityGlow(item);
    const hasGoldenAura = dignity && dignity.score >= 5;
    const runeObjs = item.runeNames.map(n => ELDER_FUTHARK.find(r => r.name === n)).filter(Boolean);
    const bindrune = runeObjs.length > 0
      ? generateBindruneData(runeObjs as any, MINI_RUNE_SIZE, MINI_RUNE_SIZE * 1.3)
      : null;

    return (
      <Pressable
        onPress={() => handleToggleActive(item.id)}
        onLongPress={() => handleDelete(item)}
        style={({ pressed }) => [
          styles.runeCard,
          isActive && styles.runeCardActive,
          hasGoldenAura && styles.runeCardGolden,
          pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] },
        ]}
      >
        {/* Master Rune badge */}
        {item.isMasterRune && (
          <View style={styles.masterBadge}>
            <Text style={styles.masterBadgeText}>✦ MASTER</Text>
          </View>
        )}

        {/* Active indicator */}
        {isActive && (
          <View style={styles.activeBadge}>
            <Text style={styles.activeBadgeText}>ACTIVE</Text>
          </View>
        )}

        {/* Mini bindrune SVG */}
        <View style={styles.miniRuneContainer}>
          {bindrune && (
            <Svg
              width={MINI_RUNE_SIZE}
              height={MINI_RUNE_SIZE * 1.3}
              viewBox={`0 0 ${MINI_RUNE_SIZE} ${MINI_RUNE_SIZE * 1.3}`}
            >
              {bindrune.lines.map((line, i) => (
                <Line
                  key={`l${i}`}
                  x1={line.x1} y1={line.y1} x2={line.x2} y2={line.y2}
                  stroke={hasGoldenAura ? '#FFD700' : isActive ? '#D4AF37' : '#E0E0E0'}
                  strokeWidth={4}
                  strokeLinecap="square"
                />
              ))}
              {bindrune.paths.map((p, i) => (
                <Path
                  key={`p${i}`}
                  d={p.d}
                  stroke={hasGoldenAura ? '#FFD700' : isActive ? '#D4AF37' : '#E0E0E0'}
                  strokeWidth={4}
                  strokeLinecap="square"
                  strokeLinejoin="miter"
                  fill="none"
                  opacity={0.9}
                />
              ))}
            </Svg>
          )}
        </View>

        {/* Rune info */}
        <Text style={[styles.runeName, isActive && { color: '#D4AF37' }]} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={styles.runeSymbols}>
          {runeObjs.map(r => r?.symbol).join(' ')}
        </Text>

        {/* Dignity score */}
        {dignity && (
          <Text style={[
            styles.dignityScore,
            { color: dignity.score >= 5 ? '#FFD700' : dignity.score >= 0 ? '#22C55E' : '#EF4444' },
          ]}>
            {dignity.score > 0 ? '+' : ''}{dignity.score}
          </Text>
        )}
      </Pressable>
    );
  }, [activeRuneId, chartData]);

  return (
    <ScreenContainer>
      <View style={styles.container}>
        <Text style={styles.title}>Rune Wallet</Text>
        <Text style={styles.subtitle}>Talisman Inventory</Text>

        {/* Active Talisman Display */}
        {activeRune && (
          <View style={styles.activeDisplay}>
            <Text style={styles.activeLabel}>ACTIVE TALISMAN</Text>
            <Text style={styles.activeName}>{activeRune.name}</Text>
            <Text style={styles.activeKeywords}>
              {activeRune.keywords.slice(0, 4).join(' · ')}
            </Text>
          </View>
        )}

        {savedRunes.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>⟐</Text>
            <Text style={styles.emptyText}>No talismans yet</Text>
            <Text style={styles.emptyHint}>
              Create Bindrunes in the Runic Forge and save them to your wallet.
            </Text>
          </View>
        ) : (
          <FlatList
            data={savedRunes}
            keyExtractor={(item) => item.id}
            renderItem={renderRuneCard}
            numColumns={2}
            columnWrapperStyle={styles.gridRow}
            contentContainerStyle={styles.gridContent}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16, paddingTop: 8 },
  title: { fontFamily: 'Cinzel', fontSize: 28, color: '#D4AF37', textAlign: 'center', letterSpacing: 4 },
  subtitle: { fontSize: 13, color: '#6B6B6B', textAlign: 'center', marginTop: 4 },

  // Active talisman display
  activeDisplay: {
    backgroundColor: '#D4AF3710', borderWidth: 1, borderColor: '#D4AF3740',
    borderRadius: 12, padding: 14, marginTop: 16, alignItems: 'center',
  },
  activeLabel: {
    fontFamily: 'JetBrainsMono', fontSize: 10, color: '#D4AF37',
    letterSpacing: 2,
  },
  activeName: { fontFamily: 'Cinzel', fontSize: 16, color: '#E0E0E0', marginTop: 4, letterSpacing: 1 },
  activeKeywords: { fontFamily: 'JetBrainsMono', fontSize: 10, color: '#6B6B6B', marginTop: 4 },

  // Grid
  gridRow: { gap: 12, marginBottom: 12 },
  gridContent: { paddingTop: 16, paddingBottom: 100 },

  // Rune card
  runeCard: {
    width: CARD_SIZE, backgroundColor: '#0D0D0D',
    borderWidth: 1, borderColor: '#1A1A1A', borderRadius: 14,
    padding: 12, alignItems: 'center',
  },
  runeCardActive: {
    borderColor: '#D4AF3760', backgroundColor: '#D4AF3708',
  },
  runeCardGolden: {
    borderColor: '#FFD70060', backgroundColor: '#FFD70008',
    shadowColor: '#FFD700', shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4, shadowRadius: 12,
  },

  masterBadge: {
    position: 'absolute', top: 6, left: 6,
    backgroundColor: '#D4AF3720', borderRadius: 4,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  masterBadgeText: { fontFamily: 'JetBrainsMono', fontSize: 8, color: '#D4AF37', letterSpacing: 1 },

  activeBadge: {
    position: 'absolute', top: 6, right: 6,
    backgroundColor: '#22C55E20', borderRadius: 4,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  activeBadgeText: { fontFamily: 'JetBrainsMono', fontSize: 8, color: '#22C55E', letterSpacing: 1 },

  miniRuneContainer: {
    width: MINI_RUNE_SIZE, height: MINI_RUNE_SIZE * 1.3,
    justifyContent: 'center', alignItems: 'center', marginTop: 8,
  },

  runeName: { fontSize: 12, fontWeight: '600', color: '#E0E0E0', marginTop: 8, textAlign: 'center' },
  runeSymbols: { fontSize: 16, color: '#6B6B6B', marginTop: 2, letterSpacing: 4 },
  dignityScore: { fontFamily: 'JetBrainsMono', fontSize: 12, fontWeight: '700', marginTop: 4 },

  // Empty state
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  emptyIcon: { fontSize: 48, color: '#1A1A1A' },
  emptyText: { fontSize: 16, color: '#6B6B6B', marginTop: 12 },
  emptyHint: { fontSize: 12, color: '#4A4A4A', textAlign: 'center', marginTop: 8, lineHeight: 18 },
});
