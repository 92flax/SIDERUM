// ============================================================
// ÆONIS – Astral Archives
// Unified journal: Chronicle (Free) + Chronos Engine (Pro)
// Interactive Devotion Matrix heatmap, Filter Terminal
// ============================================================

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Text, View, StyleSheet, FlatList, Pressable, ScrollView,
  Dimensions, Platform, Modal,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';
import {
  useJournalStore,
  type JournalEntry,
  type ExperienceIntensity,
} from '@/lib/journal/store';
import { useProStore } from '@/lib/store/pro-store';

const { width: SW } = Dimensions.get('window');

// ─── Constants ──────────────────────────────────────────────
const GOLD = '#D4AF37';
const NEON_BLUE = '#3B82F6';
const VANTA = '#050505';
const SURFACE = '#0D0D0D';
const BORDER_DIM = '#1A1A1A';
const TEXT_PRIMARY = '#E0E0E0';
const TEXT_MUTED = '#6B6B6B';
const TEXT_DIM = '#4A4A4A';

const PLANET_SYMBOL_MAP: Record<string, string> = {
  Sun: '☉', Moon: '☽', Mars: '♂', Mercury: '☿',
  Jupiter: '♃', Venus: '♀', Saturn: '♄',
};

const INTENSITY_LABELS: Record<ExperienceIntensity, string> = {
  1: 'Faint', 2: 'Mild', 3: 'Moderate', 4: 'Strong', 5: 'Profound',
};

const CONDITION_LABELS: Record<string, string> = {
  excellent: 'Excellent', good: 'Good', neutral: 'Neutral', tired: 'Tired', poor: 'Poor',
};

type ArchiveTab = 'chronicle' | 'chronos';

// ─── Devotion Matrix Helpers ────────────────────────────────
const WEEKS_TO_SHOW = 18; // ~4.5 months
const DAYS_IN_WEEK = 7;
const CELL_SIZE = Math.floor((SW - 72) / WEEKS_TO_SHOW); // Responsive cell size
const CELL_GAP = 2;
const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

/** Get local YYYY-MM-DD key from a Date (avoids UTC offset issues) */
function getDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Get local YYYY-MM-DD key from an ISO string without creating a UTC-shifted Date */
function getEntryDateKey(isoString: string): string {
  // createdAt is stored as new Date().toISOString() which is UTC
  // We parse it back and use local date
  const date = new Date(isoString);
  return getDateKey(date);
}

function generateMatrixDates(): string[][] {
  const weeks: string[][] = [];
  const today = new Date();
  // End on Saturday of current week so today is always included
  const endOfWeek = new Date(today);
  endOfWeek.setDate(endOfWeek.getDate() + (6 - endOfWeek.getDay()));
  // Go back WEEKS_TO_SHOW weeks from end to get start (always a Sunday)
  const startDate = new Date(endOfWeek);
  startDate.setDate(startDate.getDate() - WEEKS_TO_SHOW * DAYS_IN_WEEK + 1);

  for (let w = 0; w < WEEKS_TO_SHOW; w++) {
    const week: string[] = [];
    for (let d = 0; d < DAYS_IN_WEEK; d++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + w * 7 + d);
      week.push(getDateKey(date));
    }
    weeks.push(week);
  }
  return weeks;
}

// ─── Filter Types ───────────────────────────────────────────
interface Filters {
  ritualName: string | null;
  planetaryHour: string | null;
  moonPhase: string | null;
  intent: 'BANISH' | 'INVOKE' | null;
}

const EMPTY_FILTERS: Filters = {
  ritualName: null,
  planetaryHour: null,
  moonPhase: null,
  intent: null,
};

function hasActiveFilters(f: Filters): boolean {
  return !!(f.ritualName || f.planetaryHour || f.moonPhase || f.intent);
}

function entryMatchesFilters(entry: JournalEntry, filters: Filters): boolean {
  if (filters.ritualName && entry.ritualName !== filters.ritualName) return false;
  if (filters.planetaryHour && entry.rulerOfHour !== filters.planetaryHour) return false;
  if (filters.moonPhase && entry.moonPhase !== filters.moonPhase) return false;
  if (filters.intent && entry.intent !== filters.intent) return false;
  return true;
}

// ============================================================
// ENTRY DETAIL MODAL
// ============================================================

function EntryDetailModal({
  entry,
  visible,
  onClose,
}: {
  entry: JournalEntry | null;
  visible: boolean;
  onClose: () => void;
}) {
  if (!entry) return null;

  const dateStr = new Date(entry.createdAt).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });
  const timeStr = new Date(entry.createdAt).toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit',
  });

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={ds.overlay}>
        <View style={ds.content}>
          <View style={ds.handle} />

          {/* Close button */}
          <Pressable
            onPress={onClose}
            style={({ pressed }) => [ds.closeBtn, pressed && { opacity: 0.6 }]}
          >
            <Text style={ds.closeBtnText}>✕</Text>
          </Pressable>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={ds.scrollContent}>
            {/* Header */}
            <Text style={ds.title}>
              {entry.isManualEntry ? '✧ MANUAL ENTRY' : entry.ritualName?.toUpperCase() ?? 'UNKNOWN RITUAL'}
            </Text>
            <Text style={ds.dateText}>{dateStr} · {timeStr}</Text>

            {/* Intent Badge */}
            {entry.intent && (
              <View style={[ds.intentBadge, {
                backgroundColor: entry.intent === 'BANISH' ? '#00CCCC10' : '#D4AF3710',
                borderColor: entry.intent === 'BANISH' ? '#00CCCC30' : '#D4AF3730',
              }]}>
                <Text style={[ds.intentText, {
                  color: entry.intent === 'BANISH' ? '#00CCCC' : GOLD,
                }]}>
                  {entry.intent === 'BANISH' ? '↑ BANISH' : '↓ INVOKE'}
                </Text>
              </View>
            )}

            {/* Dynamic Selection / Variant */}
            {entry.dynamicSelection && (
              <View style={ds.fieldRow}>
                <Text style={ds.fieldLabel}>VARIANT</Text>
                <Text style={ds.fieldValue}>{entry.dynamicSelection}</Text>
              </View>
            )}

            {/* Steps */}
            {entry.totalSteps > 0 && (
              <View style={ds.fieldRow}>
                <Text style={ds.fieldLabel}>STEPS</Text>
                <Text style={ds.fieldValue}>{entry.stepsCompleted} / {entry.totalSteps}</Text>
              </View>
            )}

            {/* XP */}
            {entry.xpAwarded > 0 && (
              <View style={ds.fieldRow}>
                <Text style={ds.fieldLabel}>XP AWARDED</Text>
                <Text style={[ds.fieldValue, { color: GOLD }]}>+{entry.xpAwarded}</Text>
              </View>
            )}

            {/* Divider */}
            <View style={ds.divider} />

            {/* Planetary Data */}
            <Text style={ds.sectionTitle}>COSMIC ALIGNMENT</Text>

            <View style={ds.fieldRow}>
              <Text style={ds.fieldLabel}>RULER OF DAY</Text>
              <Text style={ds.fieldValue}>
                {PLANET_SYMBOL_MAP[entry.rulerOfDay] ?? ''} {entry.rulerOfDay}
              </Text>
            </View>

            <View style={ds.fieldRow}>
              <Text style={ds.fieldLabel}>PLANETARY HOUR</Text>
              <Text style={ds.fieldValue}>
                {PLANET_SYMBOL_MAP[entry.rulerOfHour] ?? ''} {entry.rulerOfHour}
              </Text>
            </View>

            <View style={ds.fieldRow}>
              <Text style={ds.fieldLabel}>MOON PHASE</Text>
              <Text style={ds.fieldValue}>{entry.moonPhase}</Text>
            </View>

            {/* Active Aspects */}
            {entry.activeAspects && entry.activeAspects.length > 0 && (
              <View style={ds.aspectsSection}>
                <Text style={ds.fieldLabel}>ACTIVE ASPECTS</Text>
                {entry.activeAspects.map((aspect, i) => (
                  <Text key={i} style={ds.aspectText}>{aspect}</Text>
                ))}
              </View>
            )}

            {/* Divider */}
            <View style={ds.divider} />

            {/* User Input */}
            <Text style={ds.sectionTitle}>PRACTITIONER NOTES</Text>

            {/* Resonance */}
            {entry.experienceIntensity && (
              <View style={ds.fieldRow}>
                <Text style={ds.fieldLabel}>RESONANCE</Text>
                <View style={ds.resonanceRow}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Text key={star} style={{
                      fontSize: 16,
                      color: star <= entry.experienceIntensity! ? GOLD : '#2A2A2A',
                    }}>✦</Text>
                  ))}
                  <Text style={ds.resonanceLabel}>
                    {INTENSITY_LABELS[entry.experienceIntensity]}
                  </Text>
                </View>
              </View>
            )}

            {/* Condition */}
            {entry.dailyCondition && (
              <View style={ds.fieldRow}>
                <Text style={ds.fieldLabel}>CONDITION</Text>
                <Text style={ds.fieldValue}>{CONDITION_LABELS[entry.dailyCondition] ?? entry.dailyCondition}</Text>
              </View>
            )}

            {/* Feeling */}
            {entry.feeling && (
              <View style={ds.fieldRow}>
                <Text style={ds.fieldLabel}>FEELING</Text>
                <Text style={ds.fieldValue}>{entry.feeling}</Text>
              </View>
            )}

            {/* Notes */}
            {entry.notes ? (
              <View style={ds.notesSection}>
                <Text style={ds.fieldLabel}>NOTES</Text>
                <Text style={ds.notesText}>{entry.notes}</Text>
              </View>
            ) : (
              <View style={ds.fieldRow}>
                <Text style={ds.fieldLabel}>NOTES</Text>
                <Text style={[ds.fieldValue, { color: TEXT_DIM }]}>No notes recorded</Text>
              </View>
            )}

            {/* Meta */}
            <View style={ds.metaRow}>
              {entry.isAutoOnly && <Text style={ds.metaTag}>AUTO-CAPTURED</Text>}
              {entry.isManualEntry && <Text style={ds.metaTag}>MANUAL ENTRY</Text>}
              <Text style={ds.metaId}>ID: {entry.id.slice(0, 12)}</Text>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ============================================================
// MAIN COMPONENT
// ============================================================

interface AstralArchivesProps {
  onBack: () => void;
}

export function AstralArchives({ onBack }: AstralArchivesProps) {
  const entries = useJournalStore((s) => s.entries);
  const loadEntries = useJournalStore((s) => s.loadEntries);
  const tier = useProStore((s) => s.tier);
  const isPro = tier === 'adeptus';

  const [activeTab, setActiveTab] = useState<ArchiveTab>('chronicle');
  const [showPaywall, setShowPaywall] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);

  useEffect(() => { loadEntries(); }, []);

  const handleTabSwitch = useCallback((tab: ArchiveTab) => {
    if (Platform.OS !== ('web' as string)) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveTab(tab);
  }, []);

  const handleEntryPress = useCallback((entry: JournalEntry) => {
    if (Platform.OS !== ('web' as string)) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedEntry(entry);
  }, []);

  return (
    <View style={s.root}>
      {/* Header */}
      <View style={s.header}>
        <Pressable onPress={onBack} style={({ pressed }) => [pressed && { opacity: 0.7 }]}>
          <Text style={s.backBtn}>← Arsenal</Text>
        </Pressable>
        <Text style={s.headerTitle}>ASTRAL ARCHIVES</Text>
        <View style={{ width: 60 }} />
      </View>

      {/* Segmented Control */}
      <View style={s.segmentedControl}>
        <Pressable
          onPress={() => handleTabSwitch('chronicle')}
          style={({ pressed }) => [
            s.segmentTab,
            activeTab === 'chronicle' && s.segmentTabActive,
            pressed && { opacity: 0.8 },
          ]}
        >
          <Text style={[s.segmentText, activeTab === 'chronicle' && s.segmentTextActive]}>
            CHRONICLE
          </Text>
        </Pressable>
        <Pressable
          onPress={() => handleTabSwitch('chronos')}
          style={({ pressed }) => [
            s.segmentTab,
            activeTab === 'chronos' && s.segmentTabActive,
            pressed && { opacity: 0.8 },
          ]}
        >
          <Text style={[s.segmentText, activeTab === 'chronos' && s.segmentTextActive]}>
            CHRONOS ENGINE
          </Text>
          {!isPro && <View style={s.proDot} />}
        </Pressable>
      </View>

      {/* Tab Content */}
      {activeTab === 'chronicle' ? (
        <ChronicleTab entries={entries} onEntryPress={handleEntryPress} />
      ) : (
        <ChronosEngineTab
          entries={entries}
          isPro={isPro}
          onShowPaywall={() => setShowPaywall(true)}
          onEntryPress={handleEntryPress}
        />
      )}

      {/* Entry Detail Modal */}
      <EntryDetailModal
        entry={selectedEntry}
        visible={!!selectedEntry}
        onClose={() => setSelectedEntry(null)}
      />

      {/* Paywall Modal */}
      <ChronosPaywallModal
        visible={showPaywall}
        onClose={() => setShowPaywall(false)}
      />
    </View>
  );
}

// ============================================================
// TAB 1: CHRONICLE (Free Tier)
// ============================================================

function ChronicleTab({
  entries,
  onEntryPress,
}: {
  entries: JournalEntry[];
  onEntryPress: (entry: JournalEntry) => void;
}) {
  const sorted = useMemo(() =>
    [...entries].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [entries]
  );

  const renderEntry = useCallback(({ item }: { item: JournalEntry }) => (
    <Pressable
      onPress={() => onEntryPress(item)}
      style={({ pressed }) => [s.chronicleCard, pressed && { opacity: 0.7, transform: [{ scale: 0.98 }] }]}
    >
      {/* Date Row */}
      <View style={s.chronicleDateRow}>
        <Text style={s.chronicleDate}>
          {new Date(item.createdAt).toLocaleDateString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric',
          })}
        </Text>
        <Text style={s.chronicleTime}>
          {new Date(item.createdAt).toLocaleTimeString('en-US', {
            hour: '2-digit', minute: '2-digit',
          })}
        </Text>
      </View>

      {/* Ritual Name */}
      <Text style={s.chronicleRitual}>
        {item.isManualEntry ? '✧ Manual Entry' : item.ritualName ?? 'Unknown Ritual'}
      </Text>

      {/* Variant / Dynamic Selection */}
      {item.dynamicSelection && (
        <Text style={s.chronicleVariant}>{item.dynamicSelection}</Text>
      )}

      {/* Intent */}
      {item.intent && (
        <View style={s.chronicleIntentRow}>
          <View style={[s.chronicleIntentBadge, {
            backgroundColor: item.intent === 'BANISH' ? '#00CCCC10' : '#D4AF3710',
            borderColor: item.intent === 'BANISH' ? '#00CCCC30' : '#D4AF3730',
          }]}>
            <Text style={[s.chronicleIntentText, {
              color: item.intent === 'BANISH' ? '#00CCCC' : GOLD,
            }]}>
              {item.intent === 'BANISH' ? '↑ BANISH' : '↓ INVOKE'}
            </Text>
          </View>
        </View>
      )}

      {/* Resonance Stars */}
      {item.experienceIntensity && (
        <View style={s.chronicleResonanceRow}>
          <Text style={s.chronicleResonanceLabel}>Resonance</Text>
          <View style={s.starsRow}>
            {[1, 2, 3, 4, 5].map((star) => (
              <Text key={star} style={[
                s.starGlyph,
                { color: star <= item.experienceIntensity! ? GOLD : '#2A2A2A' },
              ]}>
                ✦
              </Text>
            ))}
          </View>
          <Text style={s.resonanceIntensityLabel}>
            {INTENSITY_LABELS[item.experienceIntensity]}
          </Text>
        </View>
      )}

      {/* Notes */}
      {item.notes ? (
        <Text style={s.chronicleNotes} numberOfLines={3}>{item.notes}</Text>
      ) : item.isAutoOnly ? (
        <Text style={s.chronicleAutoTag}>Auto-captured</Text>
      ) : null}

      {/* Tap indicator */}
      <Text style={s.tapHint}>Tap to view details →</Text>
    </Pressable>
  ), [onEntryPress]);

  return (
    <FlatList
      data={sorted}
      keyExtractor={(item) => item.id}
      renderItem={renderEntry}
      contentContainerStyle={s.chronicleList}
      showsVerticalScrollIndicator={false}
      ListEmptyComponent={
        <View style={s.emptyState}>
          <Text style={s.emptySymbol}>☽</Text>
          <Text style={s.emptyText}>No records in the Archives</Text>
          <Text style={s.emptyHint}>Complete a ritual to begin your chronicle</Text>
        </View>
      }
    />
  );
}

// ============================================================
// TAB 2: CHRONOS ENGINE (Pro Tier)
// ============================================================

function ChronosEngineTab({
  entries,
  isPro,
  onShowPaywall,
  onEntryPress,
}: {
  entries: JournalEntry[];
  isPro: boolean;
  onShowPaywall: () => void;
  onEntryPress: (entry: JournalEntry) => void;
}) {
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [expandedFilter, setExpandedFilter] = useState<keyof Filters | null>(null);

  // Build unique values for filter options
  const filterOptions = useMemo(() => {
    const ritualNames = new Set<string>();
    const hours = new Set<string>();
    const phases = new Set<string>();
    for (const e of entries) {
      if (e.ritualName) ritualNames.add(e.ritualName);
      if (e.rulerOfHour) hours.add(e.rulerOfHour);
      if (e.moonPhase) phases.add(e.moonPhase);
    }
    return {
      ritualNames: Array.from(ritualNames).sort(),
      hours: Array.from(hours).sort(),
      phases: Array.from(phases).sort(),
    };
  }, [entries]);

  // Build date→entries map using LOCAL date keys
  const dateMap = useMemo(() => {
    const map: Record<string, JournalEntry[]> = {};
    for (const e of entries) {
      const key = getEntryDateKey(e.createdAt);
      if (!map[key]) map[key] = [];
      map[key].push(e);
    }
    return map;
  }, [entries]);

  // Matrix dates
  const matrixWeeks = useMemo(() => generateMatrixDates(), []);

  // Filtered entries for the query results
  const queryResults = useMemo(() => {
    let result = [...entries];

    // Apply date filter from matrix tap
    if (selectedDate) {
      result = result.filter(e => getEntryDateKey(e.createdAt) === selectedDate);
    }

    // Apply filter terminal filters
    if (hasActiveFilters(filters)) {
      result = result.filter(e => entryMatchesFilters(e, filters));
    }

    return result.sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [entries, filters, selectedDate]);

  // Check if a date has entries matching current filters
  const dateMatchesFilters = useCallback((dateKey: string): 'match' | 'has_entries' | 'empty' => {
    const dayEntries = dateMap[dateKey];
    if (!dayEntries || dayEntries.length === 0) return 'empty';
    if (!hasActiveFilters(filters)) return 'has_entries';
    const matching = dayEntries.some(e => entryMatchesFilters(e, filters));
    return matching ? 'match' : 'has_entries';
  }, [dateMap, filters]);

  const handleCellTap = useCallback((dateKey: string) => {
    if (Platform.OS !== ('web' as string)) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedDate(prev => prev === dateKey ? null : dateKey);
  }, []);

  const handleFilterSelect = useCallback((key: keyof Filters, value: string | null) => {
    if (Platform.OS !== ('web' as string)) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFilters(prev => ({ ...prev, [key]: prev[key] === value ? null : value }));
    setSelectedDate(null); // Reset date selection when filters change
    setExpandedFilter(null);
  }, []);

  const clearAllFilters = useCallback(() => {
    if (Platform.OS !== ('web' as string)) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setFilters(EMPTY_FILTERS);
    setSelectedDate(null);
    setExpandedFilter(null);
  }, []);

  const toggleFilterExpand = useCallback((key: keyof Filters) => {
    if (Platform.OS !== ('web' as string)) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setExpandedFilter(prev => prev === key ? null : key);
  }, []);

  // ─── Pro Gate ─────────────────────────────────────────────
  if (!isPro) {
    return (
      <View style={s.chronosContainer}>
        {/* Teaser content behind blur */}
        <View style={s.chronosTeaserBg}>
          <View style={s.teaserMatrixPlaceholder}>
            {[0, 1, 2, 3, 4].map(row => (
              <View key={row} style={s.teaserMatrixRow}>
                {Array.from({ length: WEEKS_TO_SHOW }).map((_, col) => (
                  <View
                    key={col}
                    style={[
                      s.teaserCell,
                      Math.random() > 0.7 && { backgroundColor: '#D4AF3730' },
                    ]}
                  />
                ))}
              </View>
            ))}
          </View>
          <View style={s.teaserFilterBlock}>
            <View style={s.teaserFilterRow} />
            <View style={s.teaserFilterRow} />
          </View>
        </View>

        {/* Blur overlay */}
        <BlurView
          intensity={Platform.OS === 'web' ? 0 : 40}
          tint="dark"
          experimentalBlurMethod="dimezisBlurView"
          style={[StyleSheet.absoluteFill, s.blurOverlay]}
        >
          <View style={s.paywallContent}>
            <Text style={s.paywallIcon}>⟐</Text>
            <Text style={s.paywallTitle}>CHRONOS ENGINE</Text>
            <Text style={s.paywallSubtitle}>
              Ascend to Adept to unlock the Chronos Engine, interactive Devotion Matrix, and cosmic correlations.
            </Text>
            <Pressable
              onPress={() => {
                if (Platform.OS !== ('web' as string)) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                onShowPaywall();
              }}
              style={({ pressed }) => [s.paywallBtn, pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] }]}
            >
              <Text style={s.paywallBtnText}>Ascend to Adept</Text>
            </Pressable>
          </View>
        </BlurView>
      </View>
    );
  }

  // ─── Full Pro Content ─────────────────────────────────────
  const todayKey = getDateKey(new Date());

  return (
    <ScrollView
      style={s.chronosContainer}
      contentContainerStyle={s.chronosContent}
      showsVerticalScrollIndicator={false}
    >
      {/* ── FILTER TERMINAL ────────────────────────────────── */}
      <View style={s.filterTerminal}>
        <View style={s.filterTerminalHeader}>
          <Text style={s.filterTerminalTitle}>{'>'} FILTER TERMINAL</Text>
          {hasActiveFilters(filters) && (
            <Pressable
              onPress={clearAllFilters}
              style={({ pressed }) => [s.clearFiltersBtn, pressed && { opacity: 0.7 }]}
            >
              <Text style={s.clearFiltersBtnText}>CLEAR ALL</Text>
            </Pressable>
          )}
        </View>

        {/* Ritual Name Filter */}
        <FilterRow
          label="RITUAL"
          value={filters.ritualName}
          isExpanded={expandedFilter === 'ritualName'}
          onToggle={() => toggleFilterExpand('ritualName')}
          options={filterOptions.ritualNames}
          onSelect={(v) => handleFilterSelect('ritualName', v)}
        />

        {/* Planetary Hour Filter */}
        <FilterRow
          label="PLANETARY HOUR"
          value={filters.planetaryHour ? `${PLANET_SYMBOL_MAP[filters.planetaryHour] ?? ''} ${filters.planetaryHour}` : null}
          isExpanded={expandedFilter === 'planetaryHour'}
          onToggle={() => toggleFilterExpand('planetaryHour')}
          options={filterOptions.hours}
          renderOption={(h) => `${PLANET_SYMBOL_MAP[h] ?? ''} ${h}`}
          onSelect={(v) => handleFilterSelect('planetaryHour', v)}
        />

        {/* Moon Phase Filter */}
        <FilterRow
          label="MOON PHASE"
          value={filters.moonPhase}
          isExpanded={expandedFilter === 'moonPhase'}
          onToggle={() => toggleFilterExpand('moonPhase')}
          options={filterOptions.phases}
          onSelect={(v) => handleFilterSelect('moonPhase', v)}
        />

        {/* Intent Filter */}
        <FilterRow
          label="INTENT"
          value={filters.intent}
          isExpanded={expandedFilter === 'intent'}
          onToggle={() => toggleFilterExpand('intent')}
          options={['BANISH', 'INVOKE']}
          renderOption={(v) => v === 'BANISH' ? '↑ BANISH' : '↓ INVOKE'}
          onSelect={(v) => handleFilterSelect('intent', v)}
        />
      </View>

      {/* ── DEVOTION MATRIX ────────────────────────────────── */}
      <View style={s.matrixSection}>
        <View style={s.matrixHeaderRow}>
          <Text style={s.matrixTitle}>DEVOTION MATRIX</Text>
          <Text style={s.matrixEntryCount}>
            {entries.length} total {entries.length === 1 ? 'entry' : 'entries'}
          </Text>
        </View>

        {/* Day labels */}
        <View style={s.matrixContainer}>
          <View style={s.dayLabelsCol}>
            {DAY_LABELS.map((label, i) => (
              <View key={i} style={[s.dayLabelCell, { height: CELL_SIZE, marginBottom: CELL_GAP }]}>
                {(i === 0 || i === 2 || i === 4 || i === 6) && (
                  <Text style={s.dayLabelText}>{label}</Text>
                )}
              </View>
            ))}
          </View>

          {/* Matrix grid */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={s.matrixGrid}>
              {matrixWeeks.map((week, wi) => (
                <View key={wi} style={s.matrixColumn}>
                  {week.map((dateKey, di) => {
                    const status = dateMatchesFilters(dateKey);
                    const isSelected = selectedDate === dateKey;
                    const isFuture = dateKey > todayKey;
                    const entryCount = dateMap[dateKey]?.length ?? 0;

                    let cellColor = '#111111'; // empty
                    if (isFuture) {
                      cellColor = '#0A0A0A';
                    } else if (hasActiveFilters(filters)) {
                      if (status === 'match') {
                        cellColor = entryCount >= 3 ? GOLD : entryCount >= 2 ? '#B8941F' : NEON_BLUE;
                      } else if (status === 'has_entries') {
                        cellColor = BORDER_DIM; // faded
                      }
                    } else {
                      if (entryCount >= 3) cellColor = GOLD;
                      else if (entryCount >= 2) cellColor = '#B8941F';
                      else if (entryCount >= 1) cellColor = '#6B5B1F';
                    }

                    return (
                      <Pressable
                        key={dateKey}
                        onPress={() => !isFuture && entryCount > 0 && handleCellTap(dateKey)}
                        style={({ pressed }) => [
                          s.matrixCell,
                          {
                            width: CELL_SIZE,
                            height: CELL_SIZE,
                            backgroundColor: cellColor,
                            borderRadius: 2,
                            marginBottom: CELL_GAP,
                          },
                          isSelected && s.matrixCellSelected,
                          pressed && entryCount > 0 && { opacity: 0.7 },
                        ]}
                      />
                    );
                  })}
                </View>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Legend */}
        <View style={s.matrixLegend}>
          <Text style={s.legendLabel}>Less</Text>
          <View style={[s.legendCell, { backgroundColor: '#111111' }]} />
          <View style={[s.legendCell, { backgroundColor: '#6B5B1F' }]} />
          <View style={[s.legendCell, { backgroundColor: '#B8941F' }]} />
          <View style={[s.legendCell, { backgroundColor: GOLD }]} />
          <Text style={s.legendLabel}>More</Text>
        </View>

        {/* Selected date indicator */}
        {selectedDate && (
          <View style={s.selectedDateBadge}>
            <Text style={s.selectedDateText}>
              {new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', {
                weekday: 'short', month: 'short', day: 'numeric',
              })}
            </Text>
            <Text style={s.selectedDateCount}>
              {dateMap[selectedDate]?.length ?? 0} {(dateMap[selectedDate]?.length ?? 0) === 1 ? 'entry' : 'entries'}
            </Text>
            <Pressable
              onPress={() => { setSelectedDate(null); if (Platform.OS !== ('web' as string)) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
              style={({ pressed }) => [pressed && { opacity: 0.7 }]}
            >
              <Text style={s.selectedDateClear}>✕</Text>
            </Pressable>
          </View>
        )}
      </View>

      {/* ── QUERY RESULTS ──────────────────────────────────── */}
      <View style={s.querySection}>
        <Text style={s.queryHeader}>
          {'>'} [{queryResults.length}] RECORDS FOUND
        </Text>

        {queryResults.length === 0 ? (
          <View style={s.queryEmpty}>
            <Text style={s.queryEmptyText}>No matching records.</Text>
            <Text style={s.queryEmptyHint}>Adjust filters or select a different date.</Text>
          </View>
        ) : (
          queryResults.map((item) => (
            <Pressable
              key={item.id}
              onPress={() => onEntryPress(item)}
              style={({ pressed }) => [s.queryCard, pressed && { opacity: 0.7, transform: [{ scale: 0.98 }] }]}
            >
              <View style={s.queryCardHeader}>
                <Text style={s.queryCardDate}>
                  {new Date(item.createdAt).toLocaleDateString('en-US', {
                    month: 'short', day: 'numeric',
                  })}
                </Text>
                <Text style={s.queryCardTime}>
                  {new Date(item.createdAt).toLocaleTimeString('en-US', {
                    hour: '2-digit', minute: '2-digit',
                  })}
                </Text>
                {item.intent && (
                  <Text style={[s.queryCardIntent, {
                    color: item.intent === 'BANISH' ? '#00CCCC' : GOLD,
                  }]}>
                    {item.intent === 'BANISH' ? '↑' : '↓'} {item.intent}
                  </Text>
                )}
              </View>
              <Text style={s.queryCardRitual}>
                {item.isManualEntry ? '✧ Manual' : item.ritualName ?? 'Unknown'}
              </Text>
              <View style={s.queryCardMeta}>
                <Text style={s.queryCardMetaText}>
                  {PLANET_SYMBOL_MAP[item.rulerOfHour] ?? ''} {item.rulerOfHour} Hr
                </Text>
                <Text style={s.queryCardMetaDot}>·</Text>
                <Text style={s.queryCardMetaText}>{item.moonPhase}</Text>
                {item.experienceIntensity && (
                  <>
                    <Text style={s.queryCardMetaDot}>·</Text>
                    <View style={s.miniStars}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Text key={star} style={{
                          fontSize: 8,
                          color: star <= item.experienceIntensity! ? GOLD : '#2A2A2A',
                        }}>✦</Text>
                      ))}
                    </View>
                  </>
                )}
              </View>
              {item.notes ? (
                <Text style={s.queryCardNotes} numberOfLines={2}>{item.notes}</Text>
              ) : null}
              <Text style={s.tapHintSmall}>Tap to view →</Text>
            </Pressable>
          ))
        )}
      </View>
    </ScrollView>
  );
}

// ============================================================
// FILTER ROW COMPONENT (Custom Dark Selector)
// ============================================================

function FilterRow({
  label,
  value,
  isExpanded,
  onToggle,
  options,
  renderOption,
  onSelect,
}: {
  label: string;
  value: string | null;
  isExpanded: boolean;
  onToggle: () => void;
  options: string[];
  renderOption?: (v: string) => string;
  onSelect: (v: string | null) => void;
}) {
  return (
    <View style={s.filterRow}>
      <Pressable
        onPress={onToggle}
        style={({ pressed }) => [s.filterRowHeader, pressed && { opacity: 0.8 }]}
      >
        <Text style={s.filterLabel}>{label}</Text>
        <View style={s.filterValueContainer}>
          <Text style={[s.filterValue, value && s.filterValueActive]}>
            {value ?? 'ALL'}
          </Text>
          <Text style={s.filterChevron}>{isExpanded ? '▴' : '▾'}</Text>
        </View>
      </Pressable>

      {isExpanded && (
        <ScrollView style={s.filterDropdown} nestedScrollEnabled showsVerticalScrollIndicator={false}>
          {/* "ALL" option */}
          <Pressable
            onPress={() => onSelect(null)}
            style={({ pressed }) => [
              s.filterOption,
              !value && s.filterOptionActive,
              pressed && { opacity: 0.7 },
            ]}
          >
            <Text style={[s.filterOptionText, !value && s.filterOptionTextActive]}>
              ALL
            </Text>
          </Pressable>

          {options.map((opt) => {
            const display = renderOption ? renderOption(opt) : opt;
            const isActive = value === opt;
            return (
              <Pressable
                key={opt}
                onPress={() => onSelect(opt)}
                style={({ pressed }) => [
                  s.filterOption,
                  isActive && s.filterOptionActive,
                  pressed && { opacity: 0.7 },
                ]}
              >
                <Text style={[s.filterOptionText, isActive && s.filterOptionTextActive]}>
                  {display}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

// ============================================================
// CHRONOS PAYWALL MODAL
// ============================================================

function ChronosPaywallModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const upgradeToPro = useProStore((s) => s.upgradeToPro);

  const handleUpgrade = async () => {
    if (Platform.OS !== ('web' as string)) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await upgradeToPro();
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={s.modalOverlay}>
        <View style={s.modalContent}>
          <View style={s.modalHandle} />

          <Text style={s.modalIcon}>⟐</Text>
          <Text style={s.modalTitle}>CHRONOS ENGINE</Text>
          <Text style={s.modalSubtitle}>Advanced Temporal Analytics</Text>

          <View style={s.modalFeatures}>
            {[
              { icon: '◈', title: 'Devotion Matrix', desc: 'Interactive heatmap of your ritual practice' },
              { icon: '⚙', title: 'Filter Terminal', desc: 'Query by ritual, planetary hour, moon phase, intent' },
              { icon: '⟡', title: 'Cosmic Correlations', desc: 'Discover patterns in your practice' },
              { icon: '☽', title: 'Temporal Insights', desc: 'Track devotion streaks and cycles' },
            ].map((f, i) => (
              <View key={i} style={s.modalFeatureRow}>
                <Text style={s.modalFeatureIcon}>{f.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={s.modalFeatureTitle}>{f.title}</Text>
                  <Text style={s.modalFeatureDesc}>{f.desc}</Text>
                </View>
              </View>
            ))}
          </View>

          <Pressable
            onPress={handleUpgrade}
            style={({ pressed }) => [s.modalUpgradeBtn, pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] }]}
          >
            <Text style={s.modalUpgradeBtnText}>Ascend to ÆONIS Adept</Text>
          </Pressable>

          <Pressable
            onPress={onClose}
            style={({ pressed }) => [s.modalCloseBtn, pressed && { opacity: 0.7 }]}
          >
            <Text style={s.modalCloseBtnText}>Not Now</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

// ============================================================
// STYLES
// ============================================================

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: VANTA },

  // Header
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 0.5, borderBottomColor: BORDER_DIM,
  },
  backBtn: { fontFamily: 'JetBrainsMono', fontSize: 12, color: TEXT_MUTED, letterSpacing: 1 },
  headerTitle: { fontFamily: 'Cinzel', fontSize: 18, color: GOLD, letterSpacing: 3 },

  // Segmented Control
  segmentedControl: {
    flexDirection: 'row', marginHorizontal: 16, marginTop: 12,
    backgroundColor: '#080808', borderWidth: 1, borderColor: '#1A1A1A',
    borderRadius: 10, padding: 3,
  },
  segmentTab: {
    flex: 1, paddingVertical: 10, alignItems: 'center',
    borderRadius: 8, position: 'relative',
  },
  segmentTabActive: {
    backgroundColor: '#151515', borderWidth: 1, borderColor: '#D4AF3730',
  },
  segmentText: {
    fontFamily: 'JetBrainsMono', fontSize: 10, color: TEXT_DIM,
    letterSpacing: 1.5, fontWeight: '600',
  },
  segmentTextActive: { color: GOLD },
  proDot: {
    position: 'absolute', top: 6, right: 10,
    width: 6, height: 6, borderRadius: 3, backgroundColor: GOLD,
  },

  // ─── CHRONICLE ────────────────────────────────────────────
  chronicleList: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 100 },
  chronicleCard: {
    backgroundColor: SURFACE, borderWidth: 1, borderColor: BORDER_DIM,
    borderRadius: 12, padding: 14, marginBottom: 10,
  },
  chronicleDateRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 8,
  },
  chronicleDate: { fontFamily: 'JetBrainsMono', fontSize: 11, color: TEXT_MUTED, letterSpacing: 0.5 },
  chronicleTime: { fontFamily: 'JetBrainsMono', fontSize: 10, color: TEXT_DIM },
  chronicleRitual: { fontFamily: 'Cinzel', fontSize: 14, color: TEXT_PRIMARY, letterSpacing: 1 },
  chronicleVariant: {
    fontFamily: 'JetBrainsMono', fontSize: 10, color: NEON_BLUE,
    marginTop: 4, letterSpacing: 0.5,
  },
  chronicleIntentRow: { marginTop: 6 },
  chronicleIntentBadge: {
    alignSelf: 'flex-start', borderWidth: 1, borderRadius: 6,
    paddingHorizontal: 8, paddingVertical: 2,
  },
  chronicleIntentText: { fontFamily: 'JetBrainsMono', fontSize: 9, fontWeight: '700', letterSpacing: 1 },
  chronicleResonanceRow: {
    flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 8,
  },
  chronicleResonanceLabel: { fontFamily: 'JetBrainsMono', fontSize: 9, color: TEXT_DIM, letterSpacing: 1 },
  starsRow: { flexDirection: 'row', gap: 2 },
  starGlyph: { fontSize: 12 },
  resonanceIntensityLabel: { fontFamily: 'JetBrainsMono', fontSize: 9, color: TEXT_MUTED },
  chronicleNotes: { fontSize: 12, color: TEXT_MUTED, marginTop: 8, lineHeight: 18, fontStyle: 'italic' },
  chronicleAutoTag: { fontFamily: 'JetBrainsMono', fontSize: 9, color: TEXT_DIM, marginTop: 6, letterSpacing: 1 },
  tapHint: {
    fontFamily: 'JetBrainsMono', fontSize: 8, color: '#333',
    letterSpacing: 1, marginTop: 8, textAlign: 'right',
  },
  tapHintSmall: {
    fontFamily: 'JetBrainsMono', fontSize: 7, color: '#333',
    letterSpacing: 1, marginTop: 6, textAlign: 'right',
  },

  // Empty State
  emptyState: { alignItems: 'center', paddingTop: 60 },
  emptySymbol: { fontSize: 48, color: '#2A2A2A' },
  emptyText: { fontFamily: 'Cinzel', fontSize: 16, color: TEXT_MUTED, marginTop: 12, letterSpacing: 2 },
  emptyHint: { fontSize: 12, color: TEXT_DIM, marginTop: 4 },

  // ─── CHRONOS ENGINE ───────────────────────────────────────
  chronosContainer: { flex: 1 },
  chronosContent: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 100 },

  // Filter Terminal
  filterTerminal: {
    backgroundColor: '#080808', borderWidth: 1, borderColor: '#1A1A1A',
    borderRadius: 12, padding: 14, marginBottom: 16,
  },
  filterTerminalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 10,
  },
  filterTerminalTitle: {
    fontFamily: 'JetBrainsMono', fontSize: 11, color: GOLD,
    letterSpacing: 1.5, fontWeight: '700',
  },
  clearFiltersBtn: {
    backgroundColor: '#D4AF3710', borderWidth: 1, borderColor: '#D4AF3730',
    borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3,
  },
  clearFiltersBtnText: { fontFamily: 'JetBrainsMono', fontSize: 8, color: GOLD, letterSpacing: 1, fontWeight: '700' },

  // Filter Rows
  filterRow: { marginBottom: 4 },
  filterRowHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 8, paddingHorizontal: 4,
    borderBottomWidth: 0.5, borderBottomColor: '#151515',
  },
  filterLabel: { fontFamily: 'JetBrainsMono', fontSize: 9, color: TEXT_DIM, letterSpacing: 2 },
  filterValueContainer: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  filterValue: { fontFamily: 'JetBrainsMono', fontSize: 10, color: TEXT_DIM },
  filterValueActive: { color: GOLD },
  filterChevron: { fontSize: 8, color: TEXT_DIM },

  // Filter Dropdown
  filterDropdown: {
    backgroundColor: '#0A0A0A', borderWidth: 1, borderColor: '#1A1A1A',
    borderRadius: 8, marginTop: 4, marginBottom: 4, padding: 4,
    maxHeight: 180,
  },
  filterOption: {
    paddingVertical: 8, paddingHorizontal: 10, borderRadius: 6,
  },
  filterOptionActive: { backgroundColor: '#D4AF3715' },
  filterOptionText: { fontFamily: 'JetBrainsMono', fontSize: 11, color: TEXT_MUTED },
  filterOptionTextActive: { color: GOLD, fontWeight: '700' },

  // Devotion Matrix
  matrixSection: { marginBottom: 16 },
  matrixHeaderRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 10,
  },
  matrixTitle: {
    fontFamily: 'JetBrainsMono', fontSize: 10, color: TEXT_DIM,
    letterSpacing: 2,
  },
  matrixEntryCount: {
    fontFamily: 'JetBrainsMono', fontSize: 9, color: TEXT_DIM,
  },
  matrixContainer: { flexDirection: 'row' },
  dayLabelsCol: { marginRight: 4 },
  dayLabelCell: { justifyContent: 'center' },
  dayLabelText: { fontFamily: 'JetBrainsMono', fontSize: 7, color: TEXT_DIM },
  matrixGrid: { flexDirection: 'row', gap: CELL_GAP },
  matrixColumn: {},
  matrixCell: {},
  matrixCellSelected: {
    borderWidth: 1.5, borderColor: GOLD,
  },

  // Matrix Legend
  matrixLegend: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end',
    gap: 4, marginTop: 8,
  },
  legendLabel: { fontFamily: 'JetBrainsMono', fontSize: 7, color: TEXT_DIM },
  legendCell: { width: 10, height: 10, borderRadius: 2 },

  // Selected Date Badge
  selectedDateBadge: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, marginTop: 8,
    backgroundColor: '#D4AF3710', borderWidth: 1, borderColor: '#D4AF3730',
    borderRadius: 8, paddingVertical: 6, paddingHorizontal: 14,
    alignSelf: 'center',
  },
  selectedDateText: { fontFamily: 'JetBrainsMono', fontSize: 11, color: GOLD, letterSpacing: 0.5 },
  selectedDateCount: { fontFamily: 'JetBrainsMono', fontSize: 9, color: TEXT_MUTED },
  selectedDateClear: { fontSize: 12, color: TEXT_MUTED },

  // Query Results
  querySection: { marginTop: 4 },
  queryHeader: {
    fontFamily: 'JetBrainsMono', fontSize: 11, color: GOLD,
    letterSpacing: 1.5, fontWeight: '700', marginBottom: 10,
  },
  queryEmpty: { alignItems: 'center', paddingVertical: 30 },
  queryEmptyText: { fontFamily: 'JetBrainsMono', fontSize: 12, color: TEXT_DIM },
  queryEmptyHint: { fontSize: 10, color: TEXT_DIM, marginTop: 4 },

  queryCard: {
    backgroundColor: SURFACE, borderWidth: 1, borderColor: BORDER_DIM,
    borderRadius: 10, padding: 12, marginBottom: 8,
  },
  queryCardHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4,
  },
  queryCardDate: { fontFamily: 'JetBrainsMono', fontSize: 10, color: TEXT_MUTED },
  queryCardTime: { fontFamily: 'JetBrainsMono', fontSize: 9, color: TEXT_DIM },
  queryCardIntent: { fontFamily: 'JetBrainsMono', fontSize: 9, fontWeight: '700', letterSpacing: 1 },
  queryCardRitual: { fontFamily: 'Cinzel', fontSize: 13, color: TEXT_PRIMARY, letterSpacing: 1 },
  queryCardMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  queryCardMetaText: { fontFamily: 'JetBrainsMono', fontSize: 9, color: TEXT_DIM },
  queryCardMetaDot: { fontSize: 8, color: '#2A2A2A' },
  miniStars: { flexDirection: 'row', gap: 1 },
  queryCardNotes: { fontSize: 11, color: TEXT_MUTED, marginTop: 6, lineHeight: 16, fontStyle: 'italic' },

  // ─── PRO GATE / PAYWALL ───────────────────────────────────
  chronosTeaserBg: { flex: 1, padding: 16, opacity: 0.4 },
  teaserMatrixPlaceholder: { gap: 3, marginBottom: 20 },
  teaserMatrixRow: { flexDirection: 'row', gap: 3 },
  teaserCell: {
    width: CELL_SIZE, height: CELL_SIZE, borderRadius: 2,
    backgroundColor: '#111111',
  },
  teaserFilterBlock: { gap: 8 },
  teaserFilterRow: {
    height: 36, backgroundColor: '#111111', borderRadius: 8,
  },

  blurOverlay: {
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: Platform.OS === 'web' ? 'rgba(5,5,5,0.92)' : 'transparent',
  },
  paywallContent: { alignItems: 'center', paddingHorizontal: 32 },
  paywallIcon: { fontSize: 48, color: GOLD, marginBottom: 12 },
  paywallTitle: {
    fontFamily: 'Cinzel', fontSize: 22, color: GOLD,
    letterSpacing: 3, textAlign: 'center',
  },
  paywallSubtitle: {
    fontSize: 13, color: TEXT_MUTED, textAlign: 'center',
    marginTop: 8, lineHeight: 20, paddingHorizontal: 16,
  },
  paywallBtn: {
    backgroundColor: GOLD, borderRadius: 24,
    paddingVertical: 14, paddingHorizontal: 40,
    marginTop: 24,
  },
  paywallBtnText: { color: VANTA, fontSize: 14, fontWeight: '700', letterSpacing: 1 },

  // ─── PAYWALL MODAL ────────────────────────────────────────
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: '#0A0A0A', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    borderWidth: 1, borderColor: '#D4AF3730', padding: 24, paddingBottom: 40,
    alignItems: 'center',
  },
  modalHandle: {
    width: 40, height: 4, borderRadius: 2, backgroundColor: '#D4AF3740',
    marginBottom: 20,
  },
  modalIcon: { fontSize: 40, color: GOLD, marginBottom: 8 },
  modalTitle: { fontFamily: 'Cinzel', fontSize: 22, color: GOLD, letterSpacing: 3 },
  modalSubtitle: { fontSize: 13, color: TEXT_MUTED, marginTop: 4 },
  modalFeatures: { width: '100%', marginTop: 24, gap: 14 },
  modalFeatureRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  modalFeatureIcon: { fontSize: 22, color: GOLD, width: 32, textAlign: 'center' },
  modalFeatureTitle: { fontSize: 14, fontWeight: '600', color: TEXT_PRIMARY },
  modalFeatureDesc: { fontSize: 11, color: TEXT_MUTED, marginTop: 1, lineHeight: 16 },
  modalUpgradeBtn: {
    backgroundColor: GOLD, borderRadius: 24,
    paddingVertical: 14, paddingHorizontal: 40,
    marginTop: 24, width: '100%', alignItems: 'center',
  },
  modalUpgradeBtnText: { color: VANTA, fontSize: 16, fontWeight: '700', letterSpacing: 1 },
  modalCloseBtn: { marginTop: 12, paddingVertical: 8 },
  modalCloseBtnText: { fontSize: 14, color: TEXT_MUTED },
});

// ============================================================
// DETAIL MODAL STYLES
// ============================================================

const ds = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'flex-end',
  },
  content: {
    backgroundColor: '#0A0A0A',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    borderWidth: 1, borderColor: '#D4AF3730',
    maxHeight: '90%',
    paddingTop: 12,
  },
  handle: {
    width: 40, height: 4, borderRadius: 2, backgroundColor: '#D4AF3740',
    alignSelf: 'center', marginBottom: 8,
  },
  closeBtn: {
    position: 'absolute', top: 16, right: 20, zIndex: 10,
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#1A1A1A', alignItems: 'center', justifyContent: 'center',
  },
  closeBtnText: { fontSize: 14, color: TEXT_MUTED },
  scrollContent: {
    paddingHorizontal: 24, paddingTop: 8, paddingBottom: 40,
  },

  // Header
  title: {
    fontFamily: 'Cinzel', fontSize: 18, color: GOLD,
    letterSpacing: 2, marginBottom: 4, paddingRight: 40,
  },
  dateText: {
    fontFamily: 'JetBrainsMono', fontSize: 11, color: TEXT_MUTED,
    letterSpacing: 0.5, marginBottom: 12,
  },

  // Intent Badge
  intentBadge: {
    alignSelf: 'flex-start', borderWidth: 1, borderRadius: 6,
    paddingHorizontal: 10, paddingVertical: 4, marginBottom: 16,
  },
  intentText: {
    fontFamily: 'JetBrainsMono', fontSize: 10, fontWeight: '700', letterSpacing: 1.5,
  },

  // Field Rows
  fieldRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 8, borderBottomWidth: 0.5, borderBottomColor: '#151515',
  },
  fieldLabel: {
    fontFamily: 'JetBrainsMono', fontSize: 9, color: TEXT_DIM,
    letterSpacing: 2, textTransform: 'uppercase',
  },
  fieldValue: {
    fontFamily: 'JetBrainsMono', fontSize: 12, color: TEXT_PRIMARY,
    letterSpacing: 0.5, textAlign: 'right', flex: 1, marginLeft: 16,
  },

  // Sections
  divider: {
    height: 1, backgroundColor: '#1A1A1A', marginVertical: 16,
  },
  sectionTitle: {
    fontFamily: 'JetBrainsMono', fontSize: 10, color: GOLD,
    letterSpacing: 2, marginBottom: 8, fontWeight: '700',
  },

  // Aspects
  aspectsSection: {
    paddingVertical: 8,
  },
  aspectText: {
    fontFamily: 'JetBrainsMono', fontSize: 11, color: TEXT_MUTED,
    marginTop: 4, letterSpacing: 0.5,
  },

  // Resonance
  resonanceRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    flex: 1, justifyContent: 'flex-end',
  },
  resonanceLabel: {
    fontFamily: 'JetBrainsMono', fontSize: 10, color: TEXT_MUTED,
    marginLeft: 6,
  },

  // Notes
  notesSection: {
    paddingVertical: 8,
  },
  notesText: {
    fontFamily: 'JetBrainsMono', fontSize: 12, color: TEXT_PRIMARY,
    lineHeight: 20, marginTop: 8, fontStyle: 'italic',
  },

  // Meta
  metaRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginTop: 20, paddingTop: 12, borderTopWidth: 0.5, borderTopColor: '#151515',
  },
  metaTag: {
    fontFamily: 'JetBrainsMono', fontSize: 8, color: TEXT_DIM,
    letterSpacing: 1.5, backgroundColor: '#151515',
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4,
  },
  metaId: {
    fontFamily: 'JetBrainsMono', fontSize: 8, color: '#2A2A2A',
    letterSpacing: 0.5, marginLeft: 'auto',
  },
});
