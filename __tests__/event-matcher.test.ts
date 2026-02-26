// ============================================================
// Tests for Event Matcher – robust keyword-based matching
// ============================================================

import { describe, it, expect } from 'vitest';
import { matchEventWithCMS, buildCosmicEventMap } from '../lib/astro/event-matcher';
import type { AstroEvent } from '../lib/astro/events';
import type { SanityCosmicEvent } from '../lib/cms/sanity';

// ─── Test Fixtures ──────────────────────────────────────────

function makeEvent(overrides: Partial<AstroEvent> & { id: string; type: AstroEvent['type']; title: string }): AstroEvent {
  return {
    description: '',
    date: new Date('2026-06-15'),
    ...overrides,
  };
}

function makeCmsEvent(overrides: Partial<SanityCosmicEvent> & { title: string }): SanityCosmicEvent {
  return {
    _id: `cms-${Math.random().toString(36).slice(2, 8)}`,
    _type: 'cosmicEvent',
    is_active: true,
    ...overrides,
  };
}

const cmsEvents: SanityCosmicEvent[] = [
  makeCmsEvent({
    title: 'Mercury-Venus Conjunction (Whispers of Desire)',
    aspectKey: 'Mercury conjunct Venus',
    magickalDirective: 'Channel the silver tongue of Hermes...',
    supportedIntents: ['INVOKE', 'LOVE'],
  }),
  makeCmsEvent({
    title: 'Total Lunar Eclipse (Shadow Purge)',
    aspectKey: 'Lunar Eclipse',
    magickalDirective: 'The blood moon demands release...',
    warning: 'Avoid initiating new ventures.',
    supportedIntents: ['BANISH'],
  }),
  makeCmsEvent({
    title: 'Jupiter Retrograde (Inward Expansion)',
    aspectKey: 'Jupiter retrograde',
    magickalDirective: 'Turn the wheel of fortune inward...',
    supportedIntents: ['INVOKE'],
  }),
  makeCmsEvent({
    title: 'Mars-Jupiter Conjunction (Warlord\'s Blessing)',
    aspectKey: 'Mars conjunct Jupiter',
    magickalDirective: 'The warrior meets the king...',
    supportedIntents: ['INVOKE', 'COURAGE'],
  }),
  makeCmsEvent({
    title: 'Solar Eclipse (Rebirth Gate)',
    aspectKey: 'Solar Eclipse',
    magickalDirective: 'The sun is devoured...',
    supportedIntents: ['BANISH', 'INVOKE'],
  }),
  makeCmsEvent({
    title: 'Saturn Direct (Chains Unbound)',
    aspectKey: 'Saturn stations direct',
    magickalDirective: 'The taskmaster releases his grip...',
    supportedIntents: ['INVOKE'],
  }),
];

// ─── Tests ──────────────────────────────────────────────────

describe('matchEventWithCMS', () => {
  it('matches Mercury-Venus Conjunction by type + planets', () => {
    const evt = makeEvent({
      id: 'conj-1',
      type: 'conjunction',
      title: 'Mercury-Venus Conjunction',
      planet: 'Mercury' as any,
      planet2: 'Venus' as any,
    });
    const result = matchEventWithCMS(evt, cmsEvents);
    expect(result).not.toBeNull();
    expect(result!.title).toContain('Mercury-Venus');
    expect(result!.magickalDirective).toContain('silver tongue');
  });

  it('matches Total Lunar Eclipse by type (no planet field)', () => {
    const evt = makeEvent({
      id: 'ecl-1',
      type: 'lunar_eclipse',
      title: 'Total Lunar Eclipse',
    });
    const result = matchEventWithCMS(evt, cmsEvents);
    expect(result).not.toBeNull();
    expect(result!.title).toContain('Lunar Eclipse');
    expect(result!.magickalDirective).toContain('blood moon');
  });

  it('matches Solar Eclipse by type', () => {
    const evt = makeEvent({
      id: 'ecl-2',
      type: 'solar_eclipse',
      title: 'Annular Solar Eclipse',
    });
    const result = matchEventWithCMS(evt, cmsEvents);
    expect(result).not.toBeNull();
    expect(result!.title).toContain('Solar Eclipse');
  });

  it('matches Jupiter Retrograde by type + planet', () => {
    const evt = makeEvent({
      id: 'ret-1',
      type: 'retrograde_start',
      title: 'Jupiter Stations Retrograde',
      planet: 'Jupiter' as any,
    });
    const result = matchEventWithCMS(evt, cmsEvents);
    expect(result).not.toBeNull();
    expect(result!.title).toContain('Jupiter Retrograde');
  });

  it('matches Saturn Direct by type + planet', () => {
    const evt = makeEvent({
      id: 'ret-2',
      type: 'retrograde_end',
      title: 'Saturn Stations Direct',
      planet: 'Saturn' as any,
    });
    const result = matchEventWithCMS(evt, cmsEvents);
    expect(result).not.toBeNull();
    expect(result!.title).toContain('Saturn Direct');
  });

  it('matches Mars-Jupiter Conjunction by type + both planets', () => {
    const evt = makeEvent({
      id: 'conj-2',
      type: 'conjunction',
      title: 'Mars-Jupiter Conjunction',
      planet: 'Mars' as any,
      planet2: 'Jupiter' as any,
    });
    const result = matchEventWithCMS(evt, cmsEvents);
    expect(result).not.toBeNull();
    expect(result!.title).toContain('Mars-Jupiter');
  });

  it('does NOT match unrelated events', () => {
    const evt = makeEvent({
      id: 'conj-3',
      type: 'conjunction',
      title: 'Venus-Saturn Conjunction',
      planet: 'Venus' as any,
      planet2: 'Saturn' as any,
    });
    const result = matchEventWithCMS(evt, cmsEvents);
    // No CMS doc for Venus-Saturn, should return null
    expect(result).toBeNull();
  });

  it('returns null for empty CMS array', () => {
    const evt = makeEvent({
      id: 'conj-4',
      type: 'conjunction',
      title: 'Mercury-Venus Conjunction',
      planet: 'Mercury' as any,
      planet2: 'Venus' as any,
    });
    const result = matchEventWithCMS(evt, []);
    expect(result).toBeNull();
  });
});

describe('buildCosmicEventMap', () => {
  it('builds a map of matched events', () => {
    const events: AstroEvent[] = [
      makeEvent({ id: 'e1', type: 'conjunction', title: 'Mercury-Venus Conjunction', planet: 'Mercury' as any, planet2: 'Venus' as any }),
      makeEvent({ id: 'e2', type: 'lunar_eclipse', title: 'Total Lunar Eclipse' }),
      makeEvent({ id: 'e3', type: 'conjunction', title: 'Venus-Saturn Conjunction', planet: 'Venus' as any, planet2: 'Saturn' as any }),
    ];
    const map = buildCosmicEventMap(events, cmsEvents);
    expect(map.size).toBe(2); // e1 and e2 match, e3 does not
    expect(map.get('e1')!.title).toContain('Mercury-Venus');
    expect(map.get('e2')!.title).toContain('Lunar Eclipse');
    expect(map.has('e3')).toBe(false);
  });

  it('returns empty map for empty inputs', () => {
    expect(buildCosmicEventMap([], cmsEvents).size).toBe(0);
    expect(buildCosmicEventMap([makeEvent({ id: 'x', type: 'conjunction', title: 'test' })], []).size).toBe(0);
  });
});
