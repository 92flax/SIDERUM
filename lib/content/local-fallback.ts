// ============================================================
// ÆONIS – Local Content Fallback
// All ritual data lives here for offline-first capability.
// This file is the single source of truth until a CMS is connected.
// ============================================================

import { Ritual } from '@/lib/ritual/types';
import ritualsData from '@/lib/ritual/rituals_db.json';

/**
 * Element tags for each ritual, used for analytics XP tracking.
 * Maps ritual ID to the elemental energies it works with.
 */
export const RITUAL_ELEMENT_TAGS: Record<string, Array<'earth' | 'air' | 'fire' | 'water' | 'spirit'>> = {
  lbrp: ['earth', 'air', 'fire', 'water'],
  mp: ['spirit', 'fire', 'water'],
  sirp: ['spirit', 'fire', 'air'],
  star_ruby: ['fire', 'spirit'],
  hammer_rite: ['fire', 'earth'],
};

/**
 * Planetary associations for each ritual.
 */
export const RITUAL_PLANET_TAGS: Record<string, string[]> = {
  lbrp: ['Sun', 'Moon', 'Venus', 'Jupiter'],
  mp: ['Sun', 'Moon', 'Mars', 'Jupiter', 'Saturn'],
  sirp: ['Sun', 'Jupiter'],
  star_ruby: ['Mars', 'Saturn'],
  hammer_rite: ['Mars', 'Jupiter'],
};

/**
 * XP reward for completing each ritual.
 */
export const RITUAL_XP_REWARDS: Record<string, number> = {
  lbrp: 25,
  mp: 30,
  sirp: 35,
  star_ruby: 40,
  hammer_rite: 30,
};

/**
 * Markdown-formatted extended instructions for rituals.
 * These can be displayed in a "Library" view for deeper study.
 */
export const RITUAL_INSTRUCTIONS_MD: Record<string, string> = {
  lbrp: `# Lesser Banishing Ritual of the Pentagram

The LBRP is the foundational practice of the Western Magical Tradition, taught by the Hermetic Order of the Golden Dawn. It serves to **purify the aura**, **banish unwanted energies**, and **establish a sacred space**.

## Structure
1. **Qabalistic Cross** — Aligns the practitioner with the Tree of Life
2. **Formulation of Pentagrams** — Traces banishing Earth pentagrams at the four quarters
3. **Invocation of Archangels** — Calls upon Raphael, Gabriel, Michael, and Auriel
4. **Qabalistic Cross** — Seals the working

## Daily Practice
Perform this ritual at least once daily, ideally at dawn and dusk. Consistency builds the astral temple.`,

  mp: `# Middle Pillar Exercise

The Middle Pillar activates the five **Sephiroth** along the central column of the Tree of Life within the practitioner's body. It is a powerful technique for **energy circulation** and **spiritual empowerment**.

## The Five Centers
1. **Kether** (Crown) — Brilliant white light
2. **Daath** (Throat) — Lavender light
3. **Tiphareth** (Heart) — Golden solar light
4. **Yesod** (Groin) — Violet lunar light
5. **Malkuth** (Feet) — Black/olive earth light

## Practice Notes
Always perform the LBRP before the Middle Pillar to ensure a clean working space.`,

  sirp: `# Supreme Invoking Ritual of the Pentagram

The SIRP is an advanced ritual that invokes all four elemental forces through their respective pentagrams. It is used for **major workings**, **initiations**, and **powerful invocations**.

## Prerequisites
- Proficiency in the LBRP
- Understanding of elemental attributions
- Knowledge of the Divine Names

## Warning
This ritual opens significant channels of force. Always close with a banishing ritual.`,

  star_ruby: `# The Star Ruby

Aleister Crowley's Thelemic reformulation of the LBRP. It replaces Hebrew divine names with Greek and employs the **Mark of the Beast** in place of the Qabalistic Cross.

## Key Differences from LBRP
- Uses Greek divine names (Therion, Nuit, Babalon, Hadit)
- Employs the NOX signs instead of Archangels
- More aggressive and martial in character

## Tradition
This ritual belongs to the A∴A∴ and Thelemic tradition as outlined in *Liber XXV*.`,

  hammer_rite: `# The Hammer Rite

A Norse-inspired ritual calling upon **Thor** and the power of **Mjölnir** to consecrate and protect the ritual space. It uses the four dwarves of Norse cosmology as directional guardians.

## Structure
1. **Invocation of Thor** — Calling the Thunderer
2. **Hammer Signs** — Tracing Thor's Hammer at the four quarters
3. **Calling the Dwarves** — Nordri, Sudri, Austri, Vestri
4. **Sealing** — Final invocation and grounding

## Element
Primarily **Fire** and **Earth** — the forge and the anvil.`,
};

/**
 * Returns all rituals from the local database.
 * This is the primary data source for offline-first operation.
 */
export function getLocalRituals(): Ritual[] {
  return ritualsData as Ritual[];
}

/**
 * Returns a specific ritual by ID.
 */
export function getLocalRitualById(id: string): Ritual | undefined {
  return (ritualsData as Ritual[]).find(r => r.id === id);
}
