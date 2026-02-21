// ============================================================
// ÆONIS – Sanity CMS Integration
// Fetches levels, rituals, scriptures, and events from Sanity
// ============================================================

import { createClient, type SanityClient } from '@sanity/client';

// ─── Sanity Client Configuration ─────────────────────────────

const client: SanityClient = createClient({
  projectId: 'cq6s3aun',
  dataset: 'production',
  useCdn: true,
  apiVersion: '2024-02-19',
});

// ─── TypeScript Types ────────────────────────────────────────

/** Level configuration from CMS */
export interface SanityLevelConfig {
  _id: string;
  _type: 'levelConfig';
  title: string;
  rank: number;
  xpThreshold: number;
  description?: string;
  reward?: string;
  rewardIcon?: string;
  color?: string;
}

/** Breathing rhythm from CMS */
export interface SanityBreathingRhythm {
  _id: string;
  _type: 'breathingRhythm';
  name: string;
  inhale: number;
  holdIn: number;
  exhale: number;
  holdOut: number;
  colorHex?: string;
}

/** Ritual from CMS */
export interface SanityRitual {
  _id: string;
  _type: 'ritual';
  title: string;
  slug?: { current: string };
  description?: string;
  duration_minutes?: number;
  element?: 'fire' | 'water' | 'air' | 'earth' | 'spirit';
  level_required?: number;
  xp_reward?: number;
  instructions?: string[];
  planetary_association?: string;
  tags?: string[];
  audio_url?: string;
  supportsIntent?: boolean;
  image?: {
    asset: { _ref: string; url?: string };
  };
}

/** Scripture / Library entry from CMS */
export interface SanityScripture {
  _id: string;
  _type: 'scripture';
  title: string;
  slug?: { current: string };
  author?: string;
  description?: string;
  content?: Array<{
    _type: string;
    children?: Array<{ text: string }>;
  }>;
  level_required?: number;
  category?: string;
  tags?: string[];
  image?: {
    asset: { _ref: string; url?: string };
  };
}

/** Global event from CMS */
export interface SanityEvent {
  _id: string;
  _type: 'globalEvent';
  title: string;
  description?: string;
  start_date?: string;
  end_date?: string;
  event_type?: 'ritual' | 'challenge' | 'celestial' | 'community';
  xp_multiplier?: number;
  requirements?: string;
  image?: {
    asset: { _ref: string; url?: string };
  };
  is_active?: boolean;
}

// ─── GROQ Fetch Functions ────────────────────────────────────

/**
 * Fetch all level configurations, ordered by XP threshold ascending.
 * Used to determine user rank titles and progression thresholds.
 */
export async function getLevels(): Promise<SanityLevelConfig[]> {
  const query = `*[_type == "levelConfig"] | order(xpThreshold asc) {
    _id,
    _type,
    title,
    rank,
    xpThreshold,
    description,
    reward,
    rewardIcon,
    color
  }`;

  try {
    const results = await client.fetch<SanityLevelConfig[]>(query);
    return results;
  } catch (error) {
    console.warn('[Sanity] Failed to fetch levels:', error);
    return [];
  }
}

/**
 * Fetch all rituals, ordered by level_required ascending.
 * Used to populate the Sanctum ritual catalog.
 */
export async function getRituals(): Promise<SanityRitual[]> {
  const query = `*[_type == "ritual"] | order(level_required asc) {
    _id,
    _type,
    title,
    slug,
    description,
    duration_minutes,
    element,
    level_required,
    xp_reward,
    instructions,
    planetary_association,
    tags,
    audio_url,
    supportsIntent,
    "image": image { asset-> { _ref, url } }
  }`;

  try {
    const results = await client.fetch<SanityRitual[]>(query);
    return results;
  } catch (error) {
    console.warn('[Sanity] Failed to fetch rituals:', error);
    return [];
  }
}

/**
 * Fetch all scriptures, ordered by level_required ascending.
 * Used to populate the Library section in Sanctum.
 */
export async function getScriptures(): Promise<SanityScripture[]> {
  const query = `*[_type == "scripture"] | order(level_required asc) {
    _id,
    _type,
    title,
    slug,
    author,
    description,
    content,
    level_required,
    category,
    tags,
    "image": image { asset-> { _ref, url } }
  }`;

  try {
    const results = await client.fetch<SanityScripture[]>(query);
    return results;
  } catch (error) {
    console.warn('[Sanity] Failed to fetch scriptures:', error);
    return [];
  }
}

/**
 * Fetch all global events.
 * Used to populate the Events tile in Sanctum and show active events on Dashboard.
 */
export async function getEvents(): Promise<SanityEvent[]> {
  const query = `*[_type == "globalEvent"] {
    _id,
    _type,
    title,
    description,
    start_date,
    end_date,
    event_type,
    xp_multiplier,
    requirements,
    "image": image { asset-> { _ref, url } },
    is_active
  }`;

  try {
    const results = await client.fetch<SanityEvent[]>(query);
    return results;
  } catch (error) {
    console.warn('[Sanity] Failed to fetch events:', error);
    return [];
  }
}

/**
 * Fetch only currently active events.
 */
export async function getActiveEvents(): Promise<SanityEvent[]> {
  const query = `*[_type == "globalEvent" && is_active == true] {
    _id,
    _type,
    title,
    description,
    start_date,
    end_date,
    event_type,
    xp_multiplier,
    requirements,
    "image": image { asset-> { _ref, url } },
    is_active
  }`;

  try {
    const results = await client.fetch<SanityEvent[]>(query);
    return results;
  } catch (error) {
    console.warn('[Sanity] Failed to fetch active events:', error);
    return [];
  }
}

/**
 * Fetch all breathing rhythms from CMS.
 * Used to populate the Stasis breathing pattern picker.
 */
export async function getBreathingRhythms(): Promise<SanityBreathingRhythm[]> {
  const query = `*[_type == "breathingRhythm"] | order(name asc) {
    _id,
    _type,
    name,
    inhale,
    holdIn,
    exhale,
    holdOut,
    colorHex
  }`;

  try {
    const results = await client.fetch<SanityBreathingRhythm[]>(query);
    return results;
  } catch (error) {
    console.warn('[Sanity] Failed to fetch breathing rhythms:', error);
    return [];
  }
}

// ─── Sanity Client Export ────────────────────────────────────

/** Direct access to the Sanity client for custom queries */
export { client as sanityClient };
