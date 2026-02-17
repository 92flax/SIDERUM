// ============================================================
// ÆONIS – Path (Leaderboard) Screen
// Outer Order (Level 0-4) vs Inner Order (Level 5+)
// ============================================================

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Text, View, StyleSheet, FlatList, Pressable, Platform,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { ScreenContainer } from '@/components/screen-container';
import { loadLocalAnalytics, LEVEL_TITLES } from '@/lib/ritual/completion-handler';

type Order = 'outer' | 'inner';

interface LeaderboardEntry {
  rank: number;
  magicName: string;
  xpTotal: number;
  levelRank: number;
  isCurrentUser: boolean;
}

// Simulated leaderboard data (in production, fetched from server)
const SIMULATED_ADEPTS: Omit<LeaderboardEntry, 'rank' | 'isCurrentUser'>[] = [
  { magicName: 'Frater Lux', xpTotal: 8500, levelRank: 9 },
  { magicName: 'Soror Nox', xpTotal: 7200, levelRank: 8 },
  { magicName: 'Frater Ignis', xpTotal: 5800, levelRank: 7 },
  { magicName: 'Soror Aqua', xpTotal: 4200, levelRank: 6 },
  { magicName: 'Frater Terra', xpTotal: 3100, levelRank: 5 },
  { magicName: 'Soror Aether', xpTotal: 2200, levelRank: 4 },
  { magicName: 'Frater Ventus', xpTotal: 1500, levelRank: 3 },
  { magicName: 'Soror Luna', xpTotal: 900, levelRank: 2 },
  { magicName: 'Frater Sol', xpTotal: 500, levelRank: 1 },
  { magicName: 'Neophyte Stellae', xpTotal: 80, levelRank: 0 },
];

export default function PathScreen() {
  const [order, setOrder] = useState<Order>('outer');
  const [userEntry, setUserEntry] = useState<LeaderboardEntry | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadLocalAnalytics().then(analytics => {
      setUserEntry({
        rank: 0,
        magicName: 'You',
        xpTotal: analytics.xpTotal,
        levelRank: analytics.levelRank,
        isCurrentUser: true,
      });
      setIsLoading(false);
    });
  }, []);

  const entries = useMemo(() => {
    const all: LeaderboardEntry[] = SIMULATED_ADEPTS.map((a, i) => ({
      ...a,
      rank: i + 1,
      isCurrentUser: false,
    }));

    if (userEntry) {
      // Insert user at correct position
      const insertIdx = all.findIndex(e => e.xpTotal < userEntry.xpTotal);
      const userWithRank = {
        ...userEntry,
        rank: insertIdx >= 0 ? insertIdx + 1 : all.length + 1,
      };
      if (insertIdx >= 0) {
        all.splice(insertIdx, 0, userWithRank);
      } else {
        all.push(userWithRank);
      }
      // Re-rank
      all.forEach((e, i) => { e.rank = i + 1; });
    }

    // Filter by order
    if (order === 'outer') {
      return all.filter(e => e.levelRank <= 4);
    } else {
      return all.filter(e => e.levelRank >= 5);
    }
  }, [order, userEntry]);

  const handleToggle = useCallback((o: Order) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setOrder(o);
  }, []);

  const getRankColor = (level: number): string => {
    if (level >= 9) return '#FFD700';
    if (level >= 7) return '#D4AF37';
    if (level >= 5) return '#8B5CF6';
    if (level >= 3) return '#3B82F6';
    return '#6B6B6B';
  };

  const renderEntry = useCallback(({ item }: { item: LeaderboardEntry }) => {
    const rankColor = getRankColor(item.levelRank);
    const title = LEVEL_TITLES[item.levelRank] ?? 'Unknown';

    return (
      <View style={[
        styles.entryRow,
        item.isCurrentUser && styles.entryRowSelf,
      ]}>
        <Text style={[styles.entryRank, { color: rankColor }]}>
          #{item.rank}
        </Text>
        <View style={styles.entryInfo}>
          <Text style={[
            styles.entryName,
            item.isCurrentUser && { color: '#D4AF37' },
          ]}>
            {item.magicName}
          </Text>
          <Text style={[styles.entryTitle, { color: rankColor }]}>
            {title}
          </Text>
        </View>
        <View style={styles.entryStats}>
          <Text style={styles.entryXp}>
            {item.xpTotal.toLocaleString()} XP
          </Text>
          <View style={[styles.levelBadge, { borderColor: rankColor + '40' }]}>
            <Text style={[styles.levelText, { color: rankColor }]}>
              Lv.{item.levelRank}
            </Text>
          </View>
        </View>
      </View>
    );
  }, []);

  return (
    <ScreenContainer>
      <View style={styles.container}>
        <Text style={styles.title}>The Path</Text>
        <Text style={styles.subtitle}>Initiatic Leaderboard</Text>

        {/* Order Toggle */}
        <View style={styles.toggleRow}>
          <Pressable
            onPress={() => handleToggle('outer')}
            style={({ pressed }) => [
              styles.toggleBtn,
              order === 'outer' && styles.toggleActive,
              pressed && { opacity: 0.7 },
            ]}
          >
            <Text style={[styles.toggleText, order === 'outer' && styles.toggleTextActive]}>
              Outer Order
            </Text>
            <Text style={styles.toggleHint}>Level 0-4</Text>
          </Pressable>
          <Pressable
            onPress={() => handleToggle('inner')}
            style={({ pressed }) => [
              styles.toggleBtn,
              order === 'inner' && styles.toggleActive,
              pressed && { opacity: 0.7 },
            ]}
          >
            <Text style={[styles.toggleText, order === 'inner' && styles.toggleTextActive]}>
              Inner Order
            </Text>
            <Text style={styles.toggleHint}>Level 5+</Text>
          </Pressable>
        </View>

        {/* User's current position */}
        {userEntry && (
          <View style={styles.userCard}>
            <Text style={styles.userLabel}>YOUR POSITION</Text>
            <View style={styles.userRow}>
              <Text style={styles.userLevel}>
                Lv.{userEntry.levelRank}
              </Text>
              <View style={styles.userInfo}>
                <Text style={styles.userTitle}>
                  {LEVEL_TITLES[userEntry.levelRank] ?? 'Neophyte'}
                </Text>
                <Text style={styles.userXp}>
                  {userEntry.xpTotal.toLocaleString()} XP
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Leaderboard list */}
        <FlatList
          data={entries}
          keyExtractor={(item) => `${item.magicName}-${item.rank}`}
          renderItem={renderEntry}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>
                {order === 'inner'
                  ? 'No adepts have reached the Inner Order yet.'
                  : 'No initiates in the Outer Order.'}
              </Text>
            </View>
          }
        />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16, paddingTop: 8 },
  title: {
    fontFamily: 'Cinzel', fontSize: 28, color: '#D4AF37',
    textAlign: 'center', letterSpacing: 4,
  },
  subtitle: {
    fontSize: 13, color: '#6B6B6B', textAlign: 'center', marginTop: 4,
  },

  // Toggle
  toggleRow: {
    flexDirection: 'row', gap: 10, marginTop: 16, marginBottom: 12,
  },
  toggleBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 12, borderWidth: 1,
    borderColor: '#1A1A1A', backgroundColor: '#0D0D0D', alignItems: 'center',
  },
  toggleActive: {
    borderColor: '#D4AF37', backgroundColor: '#D4AF3710',
  },
  toggleText: {
    fontSize: 14, fontWeight: '600', color: '#6B6B6B',
  },
  toggleTextActive: { color: '#D4AF37' },
  toggleHint: {
    fontFamily: 'JetBrainsMono', fontSize: 9, color: '#4A4A4A', marginTop: 2,
  },

  // User card
  userCard: {
    backgroundColor: '#D4AF3708', borderWidth: 1, borderColor: '#D4AF3730',
    borderRadius: 12, padding: 14, marginBottom: 12,
  },
  userLabel: {
    fontFamily: 'JetBrainsMono', fontSize: 9, color: '#D4AF37',
    letterSpacing: 2, marginBottom: 8,
  },
  userRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  userLevel: {
    fontFamily: 'JetBrainsMono', fontSize: 24, color: '#D4AF37', fontWeight: '700',
  },
  userInfo: { flex: 1 },
  userTitle: {
    fontFamily: 'Cinzel', fontSize: 16, color: '#E0E0E0', letterSpacing: 1,
  },
  userXp: {
    fontFamily: 'JetBrainsMono', fontSize: 12, color: '#6B6B6B', marginTop: 2,
  },

  // List
  listContent: { paddingBottom: 100 },
  entryRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#0D0D0D',
    borderWidth: 1, borderColor: '#1A1A1A', borderRadius: 10,
    padding: 12, marginBottom: 6, gap: 10,
  },
  entryRowSelf: {
    borderColor: '#D4AF3740', backgroundColor: '#D4AF3708',
  },
  entryRank: {
    fontFamily: 'JetBrainsMono', fontSize: 16, fontWeight: '700', width: 40,
    textAlign: 'center',
  },
  entryInfo: { flex: 1 },
  entryName: {
    fontSize: 14, fontWeight: '600', color: '#E0E0E0',
  },
  entryTitle: {
    fontFamily: 'JetBrainsMono', fontSize: 10, marginTop: 2, letterSpacing: 1,
  },
  entryStats: { alignItems: 'flex-end' },
  entryXp: {
    fontFamily: 'JetBrainsMono', fontSize: 12, color: '#6B6B6B',
  },
  levelBadge: {
    borderWidth: 1, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2,
    marginTop: 4,
  },
  levelText: {
    fontFamily: 'JetBrainsMono', fontSize: 10, fontWeight: '700',
  },

  // Empty
  emptyState: {
    paddingVertical: 40, alignItems: 'center',
  },
  emptyText: {
    fontSize: 13, color: '#6B6B6B', textAlign: 'center',
  },
});
