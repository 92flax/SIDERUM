// ============================================================
// ÆONIS – Astral Journal Component
// Post-ritual capture, journal list, statistics, manual entry
// ============================================================

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Text, View, StyleSheet, FlatList, Pressable, TextInput,
  ScrollView, Modal, Platform, Alert, Dimensions,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import {
  useJournalStore,
  type JournalEntry,
  type ExperienceIntensity,
  type DailyCondition,
} from '@/lib/journal/store';
import { calculatePlanetaryHours, calculateMoonPhase } from '@/lib/astro/planetary-hours';
import { useAstroStore } from '@/lib/astro/store';
import { calculateAspects } from '@/lib/astro/aspects';
import { PLANET_SYMBOLS } from '@/lib/astro/types';

const { width: SW } = Dimensions.get('window');

// ─── Sub-views ──────────────────────────────────────────────
type JournalView = 'list' | 'stats' | 'detail' | 'newEntry';

// ─── Intensity Labels ───────────────────────────────────────
const INTENSITY_LABELS: Record<ExperienceIntensity, string> = {
  1: 'Faint',
  2: 'Mild',
  3: 'Moderate',
  4: 'Strong',
  5: 'Profound',
};

const CONDITION_LABELS: Record<DailyCondition, { label: string; symbol: string }> = {
  excellent: { label: 'Excellent', symbol: '◆' },
  good: { label: 'Good', symbol: '◇' },
  neutral: { label: 'Neutral', symbol: '○' },
  tired: { label: 'Tired', symbol: '◌' },
  poor: { label: 'Poor', symbol: '·' },
};

const PLANET_SYMBOL_MAP: Record<string, string> = {
  Sun: '☉', Moon: '☽', Mars: '♂', Mercury: '☿',
  Jupiter: '♃', Venus: '♀', Saturn: '♄',
};

// ============================================================
// POST-RITUAL CAPTURE MODAL
// ============================================================
export function PostRitualCapture() {
  const pendingData = useJournalStore((s) => s.pendingData);
  const showCapture = useJournalStore((s) => s.showPostRitualCapture);
  const saveFullEntry = useJournalStore((s) => s.saveFullEntry);
  const saveAutoEntry = useJournalStore((s) => s.saveAutoEntry);
  const closeCapture = useJournalStore((s) => s.closePostRitualCapture);

  const [notes, setNotes] = useState('');
  const [intensity, setIntensity] = useState<ExperienceIntensity | null>(null);
  const [condition, setCondition] = useState<DailyCondition | null>(null);

  // Reset on open
  useEffect(() => {
    if (showCapture) {
      setNotes('');
      setIntensity(null);
      setCondition(null);
    }
  }, [showCapture]);

  if (!showCapture || !pendingData) return null;

  const handleSave = () => {
    if (Platform.OS !== ('web' as string)) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    saveFullEntry(notes, intensity, condition);
  };

  const handleSkip = () => {
    if (Platform.OS !== ('web' as string)) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    saveAutoEntry();
  };

  return (
    <Modal visible={showCapture} animationType="slide" transparent={false}>
      <View style={s.captureRoot}>
        <ScrollView contentContainerStyle={s.captureScroll} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <Text style={s.captureTitle}>Astral Journal</Text>
          <Text style={s.captureSubtitle}>Record your experience</Text>

          {/* Auto-captured data (read-only) */}
          <View style={s.autoSection}>
            <Text style={s.autoLabel}>RITUAL</Text>
            <Text style={s.autoValue}>{pendingData.ritualName}</Text>

            <View style={s.autoRow}>
              <View style={s.autoCol}>
                <Text style={s.autoLabel}>INTENT</Text>
                <Text style={[s.autoValue, { color: pendingData.intent === 'BANISH' ? '#00CCCC' : '#D4AF37' }]}>
                  {pendingData.intent === 'BANISH' ? '↑ Banish' : '↓ Invoke'}
                </Text>
              </View>
              <View style={s.autoCol}>
                <Text style={s.autoLabel}>XP</Text>
                <Text style={[s.autoValue, { color: '#D4AF37' }]}>+{pendingData.xpAwarded}</Text>
              </View>
            </View>

            {pendingData.dynamicSelection && (
              <View style={s.autoCol}>
                <Text style={s.autoLabel}>SELECTION</Text>
                <Text style={s.autoValue}>{pendingData.dynamicSelection}</Text>
              </View>
            )}

            <View style={s.autoRow}>
              <View style={s.autoCol}>
                <Text style={s.autoLabel}>DAY OF</Text>
                <Text style={s.autoValue}>
                  {PLANET_SYMBOL_MAP[pendingData.rulerOfDay] ?? ''} {pendingData.rulerOfDay}
                </Text>
              </View>
              <View style={s.autoCol}>
                <Text style={s.autoLabel}>HOUR OF</Text>
                <Text style={s.autoValue}>
                  {PLANET_SYMBOL_MAP[pendingData.rulerOfHour] ?? ''} {pendingData.rulerOfHour}
                </Text>
              </View>
            </View>

            <View style={s.autoRow}>
              <View style={s.autoCol}>
                <Text style={s.autoLabel}>MOON</Text>
                <Text style={s.autoValue}>{pendingData.moonPhase}</Text>
              </View>
              <View style={s.autoCol}>
                <Text style={s.autoLabel}>STEPS</Text>
                <Text style={s.autoValue}>{pendingData.stepsCompleted}/{pendingData.totalSteps}</Text>
              </View>
            </View>

            {pendingData.activeAspects.length > 0 && (
              <View style={s.autoCol}>
                <Text style={s.autoLabel}>ACTIVE ASPECTS</Text>
                {pendingData.activeAspects.slice(0, 5).map((asp, i) => (
                  <Text key={i} style={s.aspectText}>{asp}</Text>
                ))}
              </View>
            )}
          </View>

          {/* Divider */}
          <View style={s.divider} />

          {/* Experience Intensity */}
          <Text style={s.inputLabel}>EXPERIENCE INTENSITY</Text>
          <View style={s.intensityRow}>
            {([1, 2, 3, 4, 5] as ExperienceIntensity[]).map((val) => (
              <Pressable
                key={val}
                onPress={() => {
                  setIntensity(val);
                  if (Platform.OS !== ('web' as string)) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
                style={({ pressed }) => [
                  s.intensityBtn,
                  intensity === val && s.intensityBtnActive,
                  pressed && { opacity: 0.7 },
                ]}
              >
                <Text style={[s.intensityNum, intensity === val && s.intensityNumActive]}>{val}</Text>
                <Text style={[s.intensityLabel, intensity === val && s.intensityLabelActive]}>
                  {INTENSITY_LABELS[val]}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Daily Condition */}
          <Text style={s.inputLabel}>DAILY CONDITION</Text>
          <View style={s.conditionRow}>
            {(Object.keys(CONDITION_LABELS) as DailyCondition[]).map((key) => (
              <Pressable
                key={key}
                onPress={() => {
                  setCondition(key);
                  if (Platform.OS !== ('web' as string)) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
                style={({ pressed }) => [
                  s.conditionBtn,
                  condition === key && s.conditionBtnActive,
                  pressed && { opacity: 0.7 },
                ]}
              >
                <Text style={[s.conditionSymbol, condition === key && s.conditionSymbolActive]}>
                  {CONDITION_LABELS[key].symbol}
                </Text>
                <Text style={[s.conditionLabel, condition === key && s.conditionLabelActive]}>
                  {CONDITION_LABELS[key].label}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Notes */}
          <Text style={s.inputLabel}>NOTES</Text>
          <TextInput
            style={s.notesInput}
            value={notes}
            onChangeText={setNotes}
            placeholder="Visions, sensations, insights..."
            placeholderTextColor="#4A4A4A"
            multiline
            numberOfLines={5}
            textAlignVertical="top"
            returnKeyType="default"
          />

          {/* Buttons */}
          <Pressable
            onPress={handleSave}
            style={({ pressed }) => [s.saveBtn, pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] }]}
          >
            <Text style={s.saveBtnText}>Save Entry</Text>
          </Pressable>

          <Pressable
            onPress={handleSkip}
            style={({ pressed }) => [s.skipBtn, pressed && { opacity: 0.7 }]}
          >
            <Text style={s.skipBtnText}>Skip</Text>
          </Pressable>
        </ScrollView>
      </View>
    </Modal>
  );
}

// ============================================================
// ASTRAL JOURNAL MAIN VIEW (for Arsenal)
// ============================================================
export function AstralJournal({ onBack }: { onBack: () => void }) {
  const entries = useJournalStore((s) => s.entries);
  const loadEntries = useJournalStore((s) => s.loadEntries);
  const deleteEntry = useJournalStore((s) => s.deleteEntry);
  const createManualEntry = useJournalStore((s) => s.createManualEntry);
  const getStats = useJournalStore((s) => s.getStats);
  const location = useAstroStore((s) => s.location);
  const chartData = useAstroStore((s) => s.chartData);

  const [view, setView] = useState<JournalView>('list');
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);
  const [filter, setFilter] = useState<'all' | 'rituals' | 'manual'>('all');

  // Manual entry state
  const [manualNotes, setManualNotes] = useState('');
  const [manualIntensity, setManualIntensity] = useState<ExperienceIntensity | null>(null);
  const [manualCondition, setManualCondition] = useState<DailyCondition | null>(null);

  useEffect(() => { loadEntries(); }, []);

  const stats = useMemo(() => getStats(), [entries]);

  const filteredEntries = useMemo(() => {
    if (filter === 'rituals') return entries.filter(e => !e.isManualEntry);
    if (filter === 'manual') return entries.filter(e => e.isManualEntry);
    return entries;
  }, [entries, filter]);

  const handleCreateManual = useCallback(() => {
    const now = new Date();
    const hourInfo = calculatePlanetaryHours(now, location);
    const moonInfo = calculateMoonPhase(now);
    createManualEntry(
      manualNotes,
      manualIntensity,
      manualCondition,
      hourInfo.dayRuler,
      hourInfo.currentHour.planet,
      moonInfo.phaseName,
    );
    setManualNotes('');
    setManualIntensity(null);
    setManualCondition(null);
    setView('list');
    if (Platform.OS !== ('web' as string)) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [manualNotes, manualIntensity, manualCondition, location]);

  const handleDeleteEntry = useCallback((id: string) => {
    if (Platform.OS === ('web' as string)) {
      deleteEntry(id);
      setSelectedEntry(null);
      setView('list');
    } else {
      Alert.alert('Delete Entry', 'Remove this journal entry?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive',
          onPress: () => { deleteEntry(id); setSelectedEntry(null); setView('list'); },
        },
      ]);
    }
  }, []);

  // ─── LIST VIEW ────────────────────────────────────────────
  if (view === 'list') {
    return (
      <View style={s.root}>
        {/* Header */}
        <View style={s.header}>
          <Pressable onPress={onBack} style={({ pressed }) => [pressed && { opacity: 0.7 }]}>
            <Text style={s.backBtn}>← Back</Text>
          </Pressable>
          <Text style={s.headerTitle}>Astral Journal</Text>
          <Pressable
            onPress={() => setView('stats')}
            style={({ pressed }) => [pressed && { opacity: 0.7 }]}
          >
            <Text style={s.statsBtn}>Stats</Text>
          </Pressable>
        </View>

        {/* Filter tabs */}
        <View style={s.filterRow}>
          {(['all', 'rituals', 'manual'] as const).map((f) => (
            <Pressable
              key={f}
              onPress={() => setFilter(f)}
              style={({ pressed }) => [s.filterTab, filter === f && s.filterTabActive, pressed && { opacity: 0.7 }]}
            >
              <Text style={[s.filterTabText, filter === f && s.filterTabTextActive]}>
                {f === 'all' ? 'All' : f === 'rituals' ? 'Rituals' : 'Manual'}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Entry count */}
        <Text style={s.entryCount}>{filteredEntries.length} entries</Text>

        {/* New Entry button */}
        <Pressable
          onPress={() => { setView('newEntry'); if (Platform.OS !== ('web' as string)) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); }}
          style={({ pressed }) => [s.newEntryBtn, pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] }]}
        >
          <Text style={s.newEntryBtnText}>+ New Entry</Text>
        </Pressable>

        {/* Entry list */}
        <FlatList
          data={filteredEntries}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => { setSelectedEntry(item); setView('detail'); }}
              style={({ pressed }) => [s.entryCard, pressed && { opacity: 0.7 }]}
            >
              <View style={s.entryCardHeader}>
                <Text style={s.entryDate}>
                  {new Date(item.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </Text>
                <Text style={s.entryTime}>
                  {new Date(item.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
              <Text style={s.entryRitual}>
                {item.isManualEntry ? '✧ Manual Entry' : item.ritualName ?? 'Unknown Ritual'}
              </Text>
              {!item.isManualEntry && item.intent && (
                <Text style={[s.entryIntent, { color: item.intent === 'BANISH' ? '#00CCCC' : '#D4AF37' }]}>
                  {item.intent === 'BANISH' ? '↑ Banish' : '↓ Invoke'}
                </Text>
              )}
              <View style={s.entryMeta}>
                <Text style={s.entryMetaText}>
                  {PLANET_SYMBOL_MAP[item.rulerOfDay] ?? ''} {item.rulerOfDay}
                </Text>
                <Text style={s.entryMetaDot}>·</Text>
                <Text style={s.entryMetaText}>
                  {PLANET_SYMBOL_MAP[item.rulerOfHour] ?? ''} Hr
                </Text>
                {item.experienceIntensity && (
                  <>
                    <Text style={s.entryMetaDot}>·</Text>
                    <Text style={[s.entryMetaText, { color: '#D4AF37' }]}>
                      {INTENSITY_LABELS[item.experienceIntensity]}
                    </Text>
                  </>
                )}
              </View>
              {item.notes ? (
                <Text style={s.entryNotes} numberOfLines={2}>{item.notes}</Text>
              ) : item.isAutoOnly ? (
                <Text style={s.entryAutoTag}>Auto-captured</Text>
              ) : null}
            </Pressable>
          )}
          contentContainerStyle={s.listContent}
          ListEmptyComponent={
            <View style={s.emptyState}>
              <Text style={s.emptySymbol}>☽</Text>
              <Text style={s.emptyText}>No journal entries yet</Text>
              <Text style={s.emptyHint}>Complete a ritual or create a manual entry</Text>
            </View>
          }
        />
      </View>
    );
  }

  // ─── DETAIL VIEW ──────────────────────────────────────────
  if (view === 'detail' && selectedEntry) {
    const e = selectedEntry;
    return (
      <View style={s.root}>
        <View style={s.header}>
          <Pressable onPress={() => { setView('list'); setSelectedEntry(null); }} style={({ pressed }) => [pressed && { opacity: 0.7 }]}>
            <Text style={s.backBtn}>← Back</Text>
          </Pressable>
          <Text style={s.headerTitle}>Entry</Text>
          <Pressable onPress={() => handleDeleteEntry(e.id)} style={({ pressed }) => [pressed && { opacity: 0.7 }]}>
            <Text style={[s.statsBtn, { color: '#EF4444' }]}>Delete</Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={s.detailScroll} showsVerticalScrollIndicator={false}>
          <Text style={s.detailDate}>
            {new Date(e.createdAt).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
          </Text>
          <Text style={s.detailTime}>
            {new Date(e.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
          </Text>

          {e.ritualName && (
            <View style={s.detailSection}>
              <Text style={s.detailLabel}>RITUAL</Text>
              <Text style={s.detailValue}>{e.ritualName}</Text>
            </View>
          )}

          {e.intent && (
            <View style={s.detailRow}>
              <View style={s.detailCol}>
                <Text style={s.detailLabel}>INTENT</Text>
                <Text style={[s.detailValue, { color: e.intent === 'BANISH' ? '#00CCCC' : '#D4AF37' }]}>
                  {e.intent === 'BANISH' ? '↑ Banish' : '↓ Invoke'}
                </Text>
              </View>
              {e.xpAwarded > 0 && (
                <View style={s.detailCol}>
                  <Text style={s.detailLabel}>XP</Text>
                  <Text style={[s.detailValue, { color: '#D4AF37' }]}>+{e.xpAwarded}</Text>
                </View>
              )}
            </View>
          )}

          {e.dynamicSelection && (
            <View style={s.detailSection}>
              <Text style={s.detailLabel}>ELEMENT / PLANET</Text>
              <Text style={s.detailValue}>{e.dynamicSelection}</Text>
            </View>
          )}

          <View style={s.detailRow}>
            <View style={s.detailCol}>
              <Text style={s.detailLabel}>DAY OF</Text>
              <Text style={s.detailValue}>{PLANET_SYMBOL_MAP[e.rulerOfDay] ?? ''} {e.rulerOfDay}</Text>
            </View>
            <View style={s.detailCol}>
              <Text style={s.detailLabel}>HOUR OF</Text>
              <Text style={s.detailValue}>{PLANET_SYMBOL_MAP[e.rulerOfHour] ?? ''} {e.rulerOfHour}</Text>
            </View>
          </View>

          <View style={s.detailSection}>
            <Text style={s.detailLabel}>MOON PHASE</Text>
            <Text style={s.detailValue}>{e.moonPhase}</Text>
          </View>

          {e.activeAspects.length > 0 && (
            <View style={s.detailSection}>
              <Text style={s.detailLabel}>ACTIVE ASPECTS</Text>
              {e.activeAspects.map((asp, i) => (
                <Text key={i} style={s.detailAspect}>{asp}</Text>
              ))}
            </View>
          )}

          {e.experienceIntensity && (
            <View style={s.detailSection}>
              <Text style={s.detailLabel}>INTENSITY</Text>
              <Text style={[s.detailValue, { color: '#D4AF37' }]}>
                {e.experienceIntensity}/5 — {INTENSITY_LABELS[e.experienceIntensity]}
              </Text>
            </View>
          )}

          {e.dailyCondition && (
            <View style={s.detailSection}>
              <Text style={s.detailLabel}>CONDITION</Text>
              <Text style={s.detailValue}>
                {CONDITION_LABELS[e.dailyCondition].symbol} {CONDITION_LABELS[e.dailyCondition].label}
              </Text>
            </View>
          )}

          {e.notes ? (
            <View style={s.detailSection}>
              <Text style={s.detailLabel}>NOTES</Text>
              <Text style={s.detailNotes}>{e.notes}</Text>
            </View>
          ) : null}
        </ScrollView>
      </View>
    );
  }

  // ─── STATS VIEW ───────────────────────────────────────────
  if (view === 'stats') {
    const sortedRituals = Object.entries(stats.ritualFrequency)
      .sort((a, b) => b[1] - a[1]);

    const dayOrder = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'];
    const sortedDays = dayOrder
      .filter(d => stats.avgIntensityByDay[d] !== undefined)
      .map(d => ({ planet: d, avg: stats.avgIntensityByDay[d] }));

    const sortedHours = dayOrder
      .filter(h => stats.avgIntensityByHour[h] !== undefined)
      .map(h => ({ planet: h, avg: stats.avgIntensityByHour[h] }));

    return (
      <View style={s.root}>
        <View style={s.header}>
          <Pressable onPress={() => setView('list')} style={({ pressed }) => [pressed && { opacity: 0.7 }]}>
            <Text style={s.backBtn}>← Back</Text>
          </Pressable>
          <Text style={s.headerTitle}>Statistics</Text>
          <View style={{ width: 50 }} />
        </View>

        <ScrollView contentContainerStyle={s.statsScroll} showsVerticalScrollIndicator={false}>
          {/* Overview */}
          <View style={s.statCard}>
            <Text style={s.statCardTitle}>Overview</Text>
            <View style={s.statRow}>
              <View style={s.statItem}>
                <Text style={s.statNumber}>{stats.totalEntries}</Text>
                <Text style={s.statLabel}>Total Entries</Text>
              </View>
              <View style={s.statItem}>
                <Text style={s.statNumber}>{Object.keys(stats.ritualFrequency).length}</Text>
                <Text style={s.statLabel}>Unique Rituals</Text>
              </View>
            </View>
          </View>

          {/* Ritual Frequency */}
          {sortedRituals.length > 0 && (
            <View style={s.statCard}>
              <Text style={s.statCardTitle}>Ritual Frequency</Text>
              {sortedRituals.map(([name, count]) => (
                <View key={name} style={s.freqRow}>
                  <Text style={s.freqName} numberOfLines={1}>{name}</Text>
                  <View style={s.freqBarContainer}>
                    <View style={[s.freqBar, { width: `${Math.min(100, (count / Math.max(...sortedRituals.map(r => r[1]))) * 100)}%` }]} />
                  </View>
                  <Text style={s.freqCount}>{count}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Intensity by Planetary Day */}
          {sortedDays.length > 0 && (
            <View style={s.statCard}>
              <Text style={s.statCardTitle}>Avg Intensity by Planetary Day</Text>
              {sortedDays.map(({ planet, avg }) => (
                <View key={planet} style={s.freqRow}>
                  <Text style={s.freqName}>{PLANET_SYMBOL_MAP[planet] ?? ''} {planet}</Text>
                  <View style={s.freqBarContainer}>
                    <View style={[s.freqBar, s.freqBarGold, { width: `${(avg / 5) * 100}%` }]} />
                  </View>
                  <Text style={s.freqCount}>{avg.toFixed(1)}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Intensity by Planetary Hour */}
          {sortedHours.length > 0 && (
            <View style={s.statCard}>
              <Text style={s.statCardTitle}>Avg Intensity by Planetary Hour</Text>
              {sortedHours.map(({ planet, avg }) => (
                <View key={planet} style={s.freqRow}>
                  <Text style={s.freqName}>{PLANET_SYMBOL_MAP[planet] ?? ''} {planet}</Text>
                  <View style={s.freqBarContainer}>
                    <View style={[s.freqBar, s.freqBarCyan, { width: `${(avg / 5) * 100}%` }]} />
                  </View>
                  <Text style={s.freqCount}>{avg.toFixed(1)}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Condition Distribution */}
          {Object.values(stats.conditionDistribution).some(v => v > 0) && (
            <View style={s.statCard}>
              <Text style={s.statCardTitle}>Condition Distribution</Text>
              {(Object.keys(CONDITION_LABELS) as DailyCondition[]).map((key) => {
                const count = stats.conditionDistribution[key];
                if (count === 0) return null;
                const maxCount = Math.max(...Object.values(stats.conditionDistribution));
                return (
                  <View key={key} style={s.freqRow}>
                    <Text style={s.freqName}>{CONDITION_LABELS[key].symbol} {CONDITION_LABELS[key].label}</Text>
                    <View style={s.freqBarContainer}>
                      <View style={[s.freqBar, s.freqBarPurple, { width: `${(count / maxCount) * 100}%` }]} />
                    </View>
                    <Text style={s.freqCount}>{count}</Text>
                  </View>
                );
              })}
            </View>
          )}

          {stats.totalEntries === 0 && (
            <View style={s.emptyState}>
              <Text style={s.emptySymbol}>◎</Text>
              <Text style={s.emptyText}>No data yet</Text>
              <Text style={s.emptyHint}>Complete rituals to see statistics</Text>
            </View>
          )}
        </ScrollView>
      </View>
    );
  }

  // ─── NEW MANUAL ENTRY ─────────────────────────────────────
  if (view === 'newEntry') {
    return (
      <View style={s.root}>
        <View style={s.header}>
          <Pressable onPress={() => setView('list')} style={({ pressed }) => [pressed && { opacity: 0.7 }]}>
            <Text style={s.backBtn}>← Cancel</Text>
          </Pressable>
          <Text style={s.headerTitle}>New Entry</Text>
          <View style={{ width: 50 }} />
        </View>

        <ScrollView contentContainerStyle={s.captureScroll} showsVerticalScrollIndicator={false}>
          {/* Intensity */}
          <Text style={s.inputLabel}>EXPERIENCE INTENSITY</Text>
          <View style={s.intensityRow}>
            {([1, 2, 3, 4, 5] as ExperienceIntensity[]).map((val) => (
              <Pressable
                key={val}
                onPress={() => {
                  setManualIntensity(val);
                  if (Platform.OS !== ('web' as string)) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
                style={({ pressed }) => [
                  s.intensityBtn,
                  manualIntensity === val && s.intensityBtnActive,
                  pressed && { opacity: 0.7 },
                ]}
              >
                <Text style={[s.intensityNum, manualIntensity === val && s.intensityNumActive]}>{val}</Text>
                <Text style={[s.intensityLabel, manualIntensity === val && s.intensityLabelActive]}>
                  {INTENSITY_LABELS[val]}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Condition */}
          <Text style={s.inputLabel}>DAILY CONDITION</Text>
          <View style={s.conditionRow}>
            {(Object.keys(CONDITION_LABELS) as DailyCondition[]).map((key) => (
              <Pressable
                key={key}
                onPress={() => {
                  setManualCondition(key);
                  if (Platform.OS !== ('web' as string)) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
                style={({ pressed }) => [
                  s.conditionBtn,
                  manualCondition === key && s.conditionBtnActive,
                  pressed && { opacity: 0.7 },
                ]}
              >
                <Text style={[s.conditionSymbol, manualCondition === key && s.conditionSymbolActive]}>
                  {CONDITION_LABELS[key].symbol}
                </Text>
                <Text style={[s.conditionLabel, manualCondition === key && s.conditionLabelActive]}>
                  {CONDITION_LABELS[key].label}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Notes */}
          <Text style={s.inputLabel}>NOTES</Text>
          <TextInput
            style={s.notesInput}
            value={manualNotes}
            onChangeText={setManualNotes}
            placeholder="Dreams, observations, reflections..."
            placeholderTextColor="#4A4A4A"
            multiline
            numberOfLines={6}
            textAlignVertical="top"
            returnKeyType="default"
          />

          <Pressable
            onPress={handleCreateManual}
            style={({ pressed }) => [s.saveBtn, pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] }]}
          >
            <Text style={s.saveBtnText}>Save Entry</Text>
          </Pressable>
        </ScrollView>
      </View>
    );
  }

  return null;
}

// ============================================================
// STYLES
// ============================================================
const s = StyleSheet.create({
  // ─── Root / Layout ────────────────────────────────────────
  root: { flex: 1, backgroundColor: '#0A0A0A' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: '#1A1A1A',
  },
  headerTitle: { fontFamily: 'Cinzel', fontSize: 16, color: '#D4AF37', letterSpacing: 2 },
  backBtn: { fontFamily: 'JetBrainsMono', fontSize: 12, color: '#6B6B6B', letterSpacing: 1 },
  statsBtn: { fontFamily: 'JetBrainsMono', fontSize: 11, color: '#D4AF37', letterSpacing: 1 },

  // ─── Filter ───────────────────────────────────────────────
  filterRow: { flexDirection: 'row', paddingHorizontal: 16, paddingTop: 12, gap: 8 },
  filterTab: {
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 12,
    borderWidth: 1, borderColor: '#222',
  },
  filterTabActive: { borderColor: '#D4AF37', backgroundColor: '#D4AF3715' },
  filterTabText: { fontFamily: 'JetBrainsMono', fontSize: 10, color: '#6B6B6B', letterSpacing: 1 },
  filterTabTextActive: { color: '#D4AF37' },

  entryCount: { fontFamily: 'JetBrainsMono', fontSize: 10, color: '#4A4A4A', paddingHorizontal: 16, paddingTop: 8, letterSpacing: 1 },

  // ─── New Entry Button ─────────────────────────────────────
  newEntryBtn: {
    marginHorizontal: 16, marginTop: 10, marginBottom: 4,
    paddingVertical: 10, borderRadius: 10,
    borderWidth: 1, borderColor: '#D4AF3740', backgroundColor: '#D4AF3710',
    alignItems: 'center',
  },
  newEntryBtnText: { fontFamily: 'Cinzel', fontSize: 13, color: '#D4AF37', letterSpacing: 2 },

  // ─── Entry Card ───────────────────────────────────────────
  entryCard: {
    backgroundColor: '#0D0D0D', borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: '#1A1A1A', marginBottom: 8,
  },
  entryCardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  entryDate: { fontFamily: 'JetBrainsMono', fontSize: 10, color: '#6B6B6B', letterSpacing: 1 },
  entryTime: { fontFamily: 'JetBrainsMono', fontSize: 10, color: '#4A4A4A' },
  entryRitual: { fontFamily: 'Cinzel', fontSize: 14, color: '#E0E0E0', letterSpacing: 1, marginBottom: 4 },
  entryIntent: { fontFamily: 'JetBrainsMono', fontSize: 10, letterSpacing: 1, marginBottom: 6 },
  entryMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  entryMetaText: { fontFamily: 'JetBrainsMono', fontSize: 9, color: '#6B6B6B' },
  entryMetaDot: { color: '#333', fontSize: 8 },
  entryNotes: { fontFamily: 'JetBrainsMono', fontSize: 11, color: '#8A8A8A', lineHeight: 16, marginTop: 4 },
  entryAutoTag: { fontFamily: 'JetBrainsMono', fontSize: 9, color: '#4A4A4A', fontStyle: 'italic', marginTop: 2 },
  listContent: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 100 },

  // ─── Empty State ──────────────────────────────────────────
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptySymbol: { fontSize: 36, color: '#333', marginBottom: 12 },
  emptyText: { fontFamily: 'Cinzel', fontSize: 16, color: '#6B6B6B', letterSpacing: 2 },
  emptyHint: { fontFamily: 'JetBrainsMono', fontSize: 11, color: '#4A4A4A', marginTop: 6 },

  // ─── Detail View ──────────────────────────────────────────
  detailScroll: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 100 },
  detailDate: { fontFamily: 'Cinzel', fontSize: 16, color: '#E0E0E0', letterSpacing: 2, textAlign: 'center' },
  detailTime: { fontFamily: 'JetBrainsMono', fontSize: 11, color: '#6B6B6B', textAlign: 'center', marginTop: 4, marginBottom: 20 },
  detailSection: { marginBottom: 16 },
  detailRow: { flexDirection: 'row', gap: 20, marginBottom: 16 },
  detailCol: { flex: 1 },
  detailLabel: { fontFamily: 'JetBrainsMono', fontSize: 9, color: '#6B6B6B', letterSpacing: 2, marginBottom: 4 },
  detailValue: { fontFamily: 'Cinzel', fontSize: 14, color: '#E0E0E0', letterSpacing: 1 },
  detailAspect: { fontFamily: 'JetBrainsMono', fontSize: 11, color: '#8A8A8A', marginBottom: 2 },
  detailNotes: { fontFamily: 'JetBrainsMono', fontSize: 12, color: '#C0C0C0', lineHeight: 20, marginTop: 4 },

  // ─── Stats View ───────────────────────────────────────────
  statsScroll: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 100 },
  statCard: {
    backgroundColor: '#0D0D0D', borderRadius: 12, padding: 16,
    borderWidth: 1, borderColor: '#1A1A1A', marginBottom: 12,
  },
  statCardTitle: { fontFamily: 'Cinzel', fontSize: 13, color: '#D4AF37', letterSpacing: 2, marginBottom: 12 },
  statRow: { flexDirection: 'row', gap: 20 },
  statItem: { flex: 1, alignItems: 'center' },
  statNumber: { fontFamily: 'Cinzel', fontSize: 28, color: '#E0E0E0' },
  statLabel: { fontFamily: 'JetBrainsMono', fontSize: 9, color: '#6B6B6B', letterSpacing: 1, marginTop: 4 },
  freqRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 },
  freqName: { fontFamily: 'JetBrainsMono', fontSize: 10, color: '#8A8A8A', width: 90 },
  freqBarContainer: { flex: 1, height: 6, backgroundColor: '#1A1A1A', borderRadius: 3 },
  freqBar: { height: 6, borderRadius: 3, backgroundColor: '#3B82F6' },
  freqBarGold: { backgroundColor: '#D4AF37' },
  freqBarCyan: { backgroundColor: '#00CCCC' },
  freqBarPurple: { backgroundColor: '#8B5CF6' },
  freqCount: { fontFamily: 'JetBrainsMono', fontSize: 10, color: '#6B6B6B', width: 30, textAlign: 'right' },

  // ─── Post-Ritual Capture ──────────────────────────────────
  captureRoot: { flex: 1, backgroundColor: '#0A0A0A' },
  captureScroll: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 100 },
  captureTitle: { fontFamily: 'Cinzel', fontSize: 22, color: '#D4AF37', letterSpacing: 3, textAlign: 'center' },
  captureSubtitle: { fontFamily: 'JetBrainsMono', fontSize: 11, color: '#6B6B6B', textAlign: 'center', marginTop: 4, marginBottom: 24, letterSpacing: 1 },

  autoSection: { backgroundColor: '#0D0D0D', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#1A1A1A', marginBottom: 16 },
  autoRow: { flexDirection: 'row', gap: 16, marginTop: 12 },
  autoCol: { flex: 1, marginTop: 8 },
  autoLabel: { fontFamily: 'JetBrainsMono', fontSize: 9, color: '#6B6B6B', letterSpacing: 2, marginBottom: 4 },
  autoValue: { fontFamily: 'Cinzel', fontSize: 13, color: '#E0E0E0', letterSpacing: 1 },
  aspectText: { fontFamily: 'JetBrainsMono', fontSize: 10, color: '#8A8A8A', marginTop: 2 },

  divider: { height: 1, backgroundColor: '#1A1A1A', marginVertical: 16 },

  inputLabel: { fontFamily: 'JetBrainsMono', fontSize: 9, color: '#6B6B6B', letterSpacing: 2, marginBottom: 8, marginTop: 8 },

  // ─── Intensity Selector ───────────────────────────────────
  intensityRow: { flexDirection: 'row', gap: 6, marginBottom: 16 },
  intensityBtn: {
    flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 10,
    borderWidth: 1, borderColor: '#222', backgroundColor: '#0D0D0D',
  },
  intensityBtnActive: { borderColor: '#D4AF37', backgroundColor: '#D4AF3715' },
  intensityNum: { fontFamily: 'Cinzel', fontSize: 18, color: '#4A4A4A' },
  intensityNumActive: { color: '#D4AF37' },
  intensityLabel: { fontFamily: 'JetBrainsMono', fontSize: 7, color: '#4A4A4A', letterSpacing: 0.5, marginTop: 2 },
  intensityLabelActive: { color: '#D4AF37' },

  // ─── Condition Selector ───────────────────────────────────
  conditionRow: { flexDirection: 'row', gap: 6, marginBottom: 16, flexWrap: 'wrap' },
  conditionBtn: {
    alignItems: 'center', paddingVertical: 8, paddingHorizontal: 10, borderRadius: 10,
    borderWidth: 1, borderColor: '#222', backgroundColor: '#0D0D0D', minWidth: 60,
  },
  conditionBtnActive: { borderColor: '#D4AF37', backgroundColor: '#D4AF3715' },
  conditionSymbol: { fontSize: 16, color: '#4A4A4A', marginBottom: 2 },
  conditionSymbolActive: { color: '#D4AF37' },
  conditionLabel: { fontFamily: 'JetBrainsMono', fontSize: 8, color: '#4A4A4A', letterSpacing: 0.5 },
  conditionLabelActive: { color: '#D4AF37' },

  // ─── Notes Input ──────────────────────────────────────────
  notesInput: {
    backgroundColor: '#0D0D0D', borderRadius: 12, borderWidth: 1, borderColor: '#222',
    padding: 14, fontFamily: 'JetBrainsMono', fontSize: 13, color: '#E0E0E0',
    minHeight: 120, lineHeight: 20, marginBottom: 20,
  },

  // ─── Buttons ──────────────────────────────────────────────
  saveBtn: {
    backgroundColor: '#D4AF37', borderRadius: 12, paddingVertical: 14,
    alignItems: 'center', marginBottom: 10,
  },
  saveBtnText: { fontFamily: 'Cinzel', fontSize: 15, color: '#0A0A0A', letterSpacing: 2, fontWeight: '700' },
  skipBtn: {
    borderRadius: 12, paddingVertical: 12, alignItems: 'center',
    borderWidth: 1, borderColor: '#333', marginBottom: 20,
  },
  skipBtnText: { fontFamily: 'JetBrainsMono', fontSize: 12, color: '#6B6B6B', letterSpacing: 1 },
});
