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

type ArchiveTab = 'chronicle' | 'chronos';

// ─── Devotion Matrix Helpers ────────────────────────────────
const WEEKS_TO_SHOW = 18; // ~4.5 months
const DAYS_IN_WEEK = 7;
const CELL_SIZE = Math.floor((SW - 72) / WEEKS_TO_SHOW); // Responsive cell size
const CELL_GAP = 2;
const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function getDateKey(date: Date): string {
  return date.toISOString().slice(0, 10); // YYYY-MM-DD
}

function generateMatrixDates(): string[][] {
  const weeks: string[][] = [];
  const today = new Date();
  const totalDays = WEEKS_TO_SHOW * DAYS_IN_WEEK;
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - totalDays + 1);
  // Align to Sunday
  startDate.setDate(startDate.getDate() - startDate.getDay());

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

  useEffect(() => { loadEntries(); }, []);

  const handleTabSwitch = useCallback((tab: ArchiveTab) => {
    if (Platform.OS !== ('web' as string)) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveTab(tab);
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
        <ChronicleTab entries={entries} />
      ) : (
        <ChronosEngineTab
          entries={entries}
          isPro={isPro}
          onShowPaywall={() => setShowPaywall(true)}
        />
      )}

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

function ChronicleTab({ entries }: { entries: JournalEntry[] }) {
  const sorted = useMemo(() =>
    [...entries].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [entries]
  );

  const renderEntry = useCallback(({ item }: { item: JournalEntry }) => (
    <View style={s.chronicleCard}>
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
    </View>
  ), []);

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
}: {
  entries: JournalEntry[];
  isPro: boolean;
  onShowPaywall: () => void;
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

  // Build date→entries map
  const dateMap = useMemo(() => {
    const map: Record<string, JournalEntry[]> = {};
    for (const e of entries) {
      const key = getDateKey(new Date(e.createdAt));
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
      result = result.filter(e => getDateKey(new Date(e.createdAt)) === selectedDate);
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
        <Text style={s.matrixTitle}>DEVOTION MATRIX</Text>

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
                    const today = getDateKey(new Date());
                    const isFuture = dateKey > today;
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

        {/* Selected date indicator */}
        {selectedDate && (
          <View style={s.selectedDateBadge}>
            <Text style={s.selectedDateText}>
              {new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', {
                weekday: 'short', month: 'short', day: 'numeric',
              })}
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
            <View key={item.id} style={s.queryCard}>
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
            </View>
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
        <View style={s.filterDropdown}>
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
        </View>
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
  matrixTitle: {
    fontFamily: 'JetBrainsMono', fontSize: 10, color: TEXT_DIM,
    letterSpacing: 2, marginBottom: 10,
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

  // Selected Date Badge
  selectedDateBadge: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, marginTop: 8,
    backgroundColor: '#D4AF3710', borderWidth: 1, borderColor: '#D4AF3730',
    borderRadius: 8, paddingVertical: 6, paddingHorizontal: 14,
    alignSelf: 'center',
  },
  selectedDateText: { fontFamily: 'JetBrainsMono', fontSize: 11, color: GOLD, letterSpacing: 0.5 },
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
