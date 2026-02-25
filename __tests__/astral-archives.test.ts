// ============================================================
// ÆONIS – Astral Archives Tests
// Tests for filter logic, date helpers, and matrix generation
// ============================================================

import { describe, it, expect } from 'vitest';

// ─── Inline helpers (mirroring component logic) ─────────────

function getDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

type Filters = {
  ritualName: string | null;
  planetaryHour: string | null;
  moonPhase: string | null;
  intent: 'BANISH' | 'INVOKE' | null;
};

const EMPTY_FILTERS: Filters = {
  ritualName: null,
  planetaryHour: null,
  moonPhase: null,
  intent: null,
};

function hasActiveFilters(f: Filters): boolean {
  return !!(f.ritualName || f.planetaryHour || f.moonPhase || f.intent);
}

interface MockEntry {
  id: string;
  createdAt: string;
  ritualName: string | null;
  rulerOfHour: string;
  moonPhase: string;
  intent: 'BANISH' | 'INVOKE' | null;
}

function entryMatchesFilters(entry: MockEntry, filters: Filters): boolean {
  if (filters.ritualName && entry.ritualName !== filters.ritualName) return false;
  if (filters.planetaryHour && entry.rulerOfHour !== filters.planetaryHour) return false;
  if (filters.moonPhase && entry.moonPhase !== filters.moonPhase) return false;
  if (filters.intent && entry.intent !== filters.intent) return false;
  return true;
}

const WEEKS_TO_SHOW = 18;
const DAYS_IN_WEEK = 7;

function generateMatrixDates(): string[][] {
  const weeks: string[][] = [];
  const today = new Date();
  const totalDays = WEEKS_TO_SHOW * DAYS_IN_WEEK;
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - totalDays + 1);
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

// ─── Test Data ──────────────────────────────────────────────

const testEntries: MockEntry[] = [
  {
    id: '1',
    createdAt: '2026-02-20T14:00:00.000Z',
    ritualName: 'LBRP',
    rulerOfHour: 'Mars',
    moonPhase: 'Waxing Gibbous',
    intent: 'BANISH',
  },
  {
    id: '2',
    createdAt: '2026-02-20T18:00:00.000Z',
    ritualName: 'Middle Pillar',
    rulerOfHour: 'Jupiter',
    moonPhase: 'Waxing Gibbous',
    intent: 'INVOKE',
  },
  {
    id: '3',
    createdAt: '2026-02-21T10:00:00.000Z',
    ritualName: 'LBRP',
    rulerOfHour: 'Sun',
    moonPhase: 'Full Moon',
    intent: 'BANISH',
  },
  {
    id: '4',
    createdAt: '2026-02-22T08:00:00.000Z',
    ritualName: 'Star Ruby',
    rulerOfHour: 'Mars',
    moonPhase: 'Full Moon',
    intent: 'INVOKE',
  },
];

// ─── Tests ──────────────────────────────────────────────────

describe('Astral Archives – Date Helpers', () => {
  it('getDateKey returns YYYY-MM-DD format', () => {
    const date = new Date('2026-02-20T14:30:00.000Z');
    expect(getDateKey(date)).toBe('2026-02-20');
  });

  it('getDateKey handles midnight correctly', () => {
    const date = new Date('2026-01-01T00:00:00.000Z');
    expect(getDateKey(date)).toBe('2026-01-01');
  });
});

describe('Astral Archives – Filter Logic', () => {
  it('EMPTY_FILTERS has no active filters', () => {
    expect(hasActiveFilters(EMPTY_FILTERS)).toBe(false);
  });

  it('detects active filters correctly', () => {
    expect(hasActiveFilters({ ...EMPTY_FILTERS, ritualName: 'LBRP' })).toBe(true);
    expect(hasActiveFilters({ ...EMPTY_FILTERS, intent: 'BANISH' })).toBe(true);
    expect(hasActiveFilters({ ...EMPTY_FILTERS, moonPhase: 'Full Moon' })).toBe(true);
    expect(hasActiveFilters({ ...EMPTY_FILTERS, planetaryHour: 'Mars' })).toBe(true);
  });

  it('entryMatchesFilters: no filters matches all entries', () => {
    for (const entry of testEntries) {
      expect(entryMatchesFilters(entry, EMPTY_FILTERS)).toBe(true);
    }
  });

  it('entryMatchesFilters: filter by ritualName', () => {
    const filters: Filters = { ...EMPTY_FILTERS, ritualName: 'LBRP' };
    expect(entryMatchesFilters(testEntries[0], filters)).toBe(true); // LBRP
    expect(entryMatchesFilters(testEntries[1], filters)).toBe(false); // Middle Pillar
    expect(entryMatchesFilters(testEntries[2], filters)).toBe(true); // LBRP
    expect(entryMatchesFilters(testEntries[3], filters)).toBe(false); // Star Ruby
  });

  it('entryMatchesFilters: filter by planetaryHour', () => {
    const filters: Filters = { ...EMPTY_FILTERS, planetaryHour: 'Mars' };
    expect(entryMatchesFilters(testEntries[0], filters)).toBe(true); // Mars
    expect(entryMatchesFilters(testEntries[1], filters)).toBe(false); // Jupiter
    expect(entryMatchesFilters(testEntries[3], filters)).toBe(true); // Mars
  });

  it('entryMatchesFilters: filter by moonPhase', () => {
    const filters: Filters = { ...EMPTY_FILTERS, moonPhase: 'Full Moon' };
    expect(entryMatchesFilters(testEntries[0], filters)).toBe(false); // Waxing Gibbous
    expect(entryMatchesFilters(testEntries[2], filters)).toBe(true); // Full Moon
    expect(entryMatchesFilters(testEntries[3], filters)).toBe(true); // Full Moon
  });

  it('entryMatchesFilters: filter by intent', () => {
    const filters: Filters = { ...EMPTY_FILTERS, intent: 'BANISH' };
    expect(entryMatchesFilters(testEntries[0], filters)).toBe(true); // BANISH
    expect(entryMatchesFilters(testEntries[1], filters)).toBe(false); // INVOKE
    expect(entryMatchesFilters(testEntries[3], filters)).toBe(false); // INVOKE
  });

  it('entryMatchesFilters: combined filters (AND logic)', () => {
    const filters: Filters = {
      ritualName: 'LBRP',
      planetaryHour: null,
      moonPhase: 'Full Moon',
      intent: 'BANISH',
    };
    expect(entryMatchesFilters(testEntries[0], filters)).toBe(false); // LBRP + Waxing Gibbous
    expect(entryMatchesFilters(testEntries[2], filters)).toBe(true);  // LBRP + Full Moon + BANISH
    expect(entryMatchesFilters(testEntries[3], filters)).toBe(false); // Star Ruby
  });

  it('filtering entries produces correct result count', () => {
    const filters: Filters = { ...EMPTY_FILTERS, ritualName: 'LBRP' };
    const results = testEntries.filter(e => entryMatchesFilters(e, filters));
    expect(results.length).toBe(2);
    expect(results.map(r => r.id)).toEqual(['1', '3']);
  });
});

describe('Astral Archives – Devotion Matrix', () => {
  it('generateMatrixDates returns correct number of weeks', () => {
    const weeks = generateMatrixDates();
    expect(weeks.length).toBe(WEEKS_TO_SHOW);
  });

  it('each week has 7 days', () => {
    const weeks = generateMatrixDates();
    for (const week of weeks) {
      expect(week.length).toBe(7);
    }
  });

  it('all dates are in YYYY-MM-DD format', () => {
    const weeks = generateMatrixDates();
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    for (const week of weeks) {
      for (const dateKey of week) {
        expect(dateKey).toMatch(dateRegex);
      }
    }
  });

  it('dates are sequential (each day follows the previous)', () => {
    const weeks = generateMatrixDates();
    const allDates = weeks.flat();
    for (let i = 1; i < allDates.length; i++) {
      const prev = new Date(allDates[i - 1] + 'T12:00:00Z');
      const curr = new Date(allDates[i] + 'T12:00:00Z');
      const diffMs = curr.getTime() - prev.getTime();
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
      expect(diffDays).toBe(1);
    }
  });

  it('last week of matrix includes recent dates', () => {
    const weeks = generateMatrixDates();
    const lastWeek = weeks[weeks.length - 1];
    // The last week should contain dates near today
    const today = new Date();
    const lastDate = new Date(lastWeek[lastWeek.length - 1] + 'T12:00:00Z');
    const diffDays = Math.abs((today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
    // Last date should be within 7 days of today
    expect(diffDays).toBeLessThan(8);
  });

  it('first day of matrix is a Sunday', () => {
    const weeks = generateMatrixDates();
    const firstDate = new Date(weeks[0][0] + 'T12:00:00');
    expect(firstDate.getDay()).toBe(0); // Sunday
  });

  it('date→entries map correctly groups entries by date', () => {
    const dateMap: Record<string, MockEntry[]> = {};
    for (const e of testEntries) {
      const key = getDateKey(new Date(e.createdAt));
      if (!dateMap[key]) dateMap[key] = [];
      dateMap[key].push(e);
    }
    expect(dateMap['2026-02-20']?.length).toBe(2); // Two entries on Feb 20
    expect(dateMap['2026-02-21']?.length).toBe(1);
    expect(dateMap['2026-02-22']?.length).toBe(1);
    expect(dateMap['2026-02-23']).toBeUndefined(); // No entries
  });
});
