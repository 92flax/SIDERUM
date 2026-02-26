// ============================================================
// ÆONIS – Event Matcher
// Robust keyword-based matching between AstroEvent (API) and
// SanityCosmicEvent (CMS). Never relies on exact title strings.
// ============================================================

import type { AstroEvent } from './events';
import type { SanityCosmicEvent } from '../cms/sanity';

/**
 * Normalize a string for keyword matching:
 * lowercase, strip parenthetical flavor text, collapse whitespace.
 */
function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/\([^)]*\)/g, '') // strip "(Shadow Purge)" etc.
    .replace(/[^a-z0-9\s]/g, ' ') // remove special chars
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Check if a normalized string contains ALL of the given keywords.
 */
function containsAll(text: string, keywords: string[]): boolean {
  return keywords.every((kw) => text.includes(kw));
}

/**
 * Extract event-type keywords from an AstroEvent type field.
 * Maps the API's event type enum to keywords we expect in CMS text.
 */
const EVENT_TYPE_KEYWORDS: Record<AstroEvent['type'], string[][]> = {
  conjunction: [['conjunction'], ['conjunct']],
  opposition: [['opposition'], ['oppose']],
  retrograde_start: [['retrograde']],
  retrograde_end: [['direct'], ['retrograde', 'end'], ['stations direct']],
  solar_eclipse: [['solar', 'eclipse'], ['eclipse', 'sun']],
  lunar_eclipse: [['lunar', 'eclipse'], ['eclipse', 'moon']],
};

/**
 * Planet name synonyms for matching.
 * CMS docs may use "lunar" instead of "moon", "solar" instead of "sun", etc.
 */
const PLANET_SYNONYMS: Record<string, string[]> = {
  moon: ['moon', 'lunar'],
  sun: ['sun', 'solar'],
  mercury: ['mercury'],
  venus: ['venus'],
  mars: ['mars'],
  jupiter: ['jupiter'],
  saturn: ['saturn'],
};

/**
 * Derive the "implied planet" for eclipse types so we can match
 * CMS docs that use "sun"/"solar" or "moon"/"lunar" as their primary planet.
 */
function getImpliedPlanets(evt: AstroEvent): string[] {
  const planets: string[] = [];
  if (evt.planet) planets.push(evt.planet.toLowerCase());
  if (evt.planet2) planets.push(evt.planet2.toLowerCase());

  // For eclipses, the API might not set planet fields explicitly
  if (evt.type === 'solar_eclipse' && !planets.includes('sun')) {
    planets.push('sun');
  }
  if (evt.type === 'lunar_eclipse' && !planets.includes('moon')) {
    planets.push('moon');
  }
  return planets;
}

/**
 * Check if text contains at least one synonym for the given planet.
 */
function textHasPlanet(text: string, planet: string): boolean {
  const synonyms = PLANET_SYNONYMS[planet] ?? [planet];
  return synonyms.some((syn) => text.includes(syn));
}

/**
 * Score how well a SanityCosmicEvent matches an AstroEvent.
 * Returns 0 for no match, higher = better match.
 *
 * Matching strategy (in priority order):
 * 1. Structured field match: event type keywords + planet names in CMS text
 * 2. Title keyword overlap: CMS title (stripped of flavor) shares key terms with API title
 * 3. aspectKey match: CMS aspectKey contains planet names + type keywords
 */
function scoreMatch(evt: AstroEvent, ce: SanityCosmicEvent): number {
  let score = 0;
  const planets = getImpliedPlanets(evt);
  const typeKeywordSets = EVENT_TYPE_KEYWORDS[evt.type] ?? [];

  // ── Strategy 1: Match against CMS title (normalized) ──
  const cmsTitle = normalize(ce.title);

  // Check if CMS title contains event type keywords
  const titleHasType = typeKeywordSets.some((kwSet) => containsAll(cmsTitle, kwSet));
  // Check if CMS title contains planet names (using synonyms)
  const titleHasPlanets = planets.length > 0 && planets.every((p) => textHasPlanet(cmsTitle, p));

  if (titleHasType && titleHasPlanets) {
    score += 100; // Strong structured match
  } else if (titleHasType && planets.length === 0) {
    // Type-only match (e.g. generic eclipse with no planet field)
    score += 50;
  } else if (titleHasType) {
    // Type matches but planets don't explicitly appear in CMS title
    // For eclipses, the type keywords already encode the planet ("lunar eclipse" = moon)
    const isEclipseType = evt.type === 'solar_eclipse' || evt.type === 'lunar_eclipse';
    if (isEclipseType) {
      score += 80; // Eclipse type keywords are sufficient
    }
    // For non-eclipse types (conjunction, opposition, retrograde), planets MUST match
    // so we don't add score here — wrong planets = no match
  } else if (titleHasPlanets) {
    score += 30; // Planet match without type (weak)
  }

  // ── Strategy 2: Match against CMS aspectKey ──
  if (ce.aspectKey) {
    const aspectNorm = normalize(ce.aspectKey);
    const aspectHasType = typeKeywordSets.some((kwSet) => containsAll(aspectNorm, kwSet));
    const aspectHasPlanets = planets.length > 0 && planets.every((p) => textHasPlanet(aspectNorm, p));

    if (aspectHasType && aspectHasPlanets) {
      score += 80;
    } else if (aspectHasType && planets.length === 0) {
      score += 40;
    } else if (aspectHasType) {
      const isEclipseType = evt.type === 'solar_eclipse' || evt.type === 'lunar_eclipse';
      if (isEclipseType) {
        score += 60;
      }
      // Non-eclipse: type alone without planet match is not sufficient
    } else if (aspectHasPlanets) {
      score += 25;
    }
  }

  // ── Strategy 3: Fuzzy title overlap ──
  // Tokenize both titles and count shared meaningful words
  const apiTokens = normalize(evt.title).split(' ').filter((t) => t.length > 2);
  const cmsTokens = cmsTitle.split(' ').filter((t) => t.length > 2);
  const shared = apiTokens.filter((t) => cmsTokens.includes(t));
  if (shared.length >= 2) {
    score += shared.length * 5;
  }

  return score;
}

/**
 * Match a single AstroEvent to the best-matching SanityCosmicEvent.
 * Returns the matched CMS document or null if no match scores above threshold.
 */
export function matchEventWithCMS(
  evt: AstroEvent,
  cosmicEvents: SanityCosmicEvent[],
): SanityCosmicEvent | null {
  if (cosmicEvents.length === 0) return null;

  let bestMatch: SanityCosmicEvent | null = null;
  let bestScore = 0;

  for (const ce of cosmicEvents) {
    const s = scoreMatch(evt, ce);
    if (s > bestScore) {
      bestScore = s;
      bestMatch = ce;
    }
  }

  // Minimum threshold: at least a partial type or planet match
  return bestScore >= 25 ? bestMatch : null;
}

/**
 * Build a complete lookup map from AstroEvent IDs to matched SanityCosmicEvents.
 * This is the main entry point used by the Home screen.
 */
export function buildCosmicEventMap(
  events: AstroEvent[],
  cosmicEvents: SanityCosmicEvent[],
): Map<string, SanityCosmicEvent> {
  const map = new Map<string, SanityCosmicEvent>();
  if (cosmicEvents.length === 0 || events.length === 0) return map;

  for (const evt of events) {
    const matched = matchEventWithCMS(evt, cosmicEvents);
    if (matched) {
      map.set(evt.id, matched);
    }
  }

  return map;
}
