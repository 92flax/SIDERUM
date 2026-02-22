// ============================================================
// ÆONIS – Dynamic Geometry Engine
// Golden Dawn Pentagram & Hexagram logic for the Holo-Pad
// ============================================================

export type RitualIntent = 'BANISH' | 'INVOKE';

export type ElementName = 'Earth' | 'Air' | 'Water' | 'Fire' | 'Spirit';
export type PlanetName = 'Sun' | 'Moon' | 'Mercury' | 'Venus' | 'Mars' | 'Jupiter' | 'Saturn';
export type DynamicSelection = ElementName | PlanetName;

export interface GeometryResult {
  /** Ordered array of path segments. Each sub-array is a continuous stroke. */
  paths: Array<Array<{ x: number; y: number }>>;
  /** The color hex for this element/planet */
  colorHex: string;
}

// ─── Element Colors (Golden Dawn Attribution) ───────────────

const ELEMENT_COLORS: Record<ElementName, string> = {
  Earth: '#22C55E',   // Green
  Air: '#FBBF24',     // Yellow
  Water: '#3B82F6',   // Blue
  Fire: '#EF4444',    // Red
  Spirit: '#FFFFFF',  // White / Akasha
};

// ─── Planet Colors (Traditional) ────────────────────────────

const PLANET_COLORS: Record<PlanetName, string> = {
  Sun: '#FFD700',      // Gold
  Moon: '#C0C0C0',     // Silver
  Mercury: '#FFA500',  // Orange
  Venus: '#22C55E',    // Green
  Mars: '#EF4444',     // Red
  Jupiter: '#3B82F6',  // Blue
  Saturn: '#1E1E1E',   // Black (rendered as dark grey for visibility)
};

// ─── Pentagram Vertex Layout ────────────────────────────────
// Standard Golden Dawn vertex numbering (clockwise from top):
//   0 = Spirit (top)
//   1 = Water  (upper-right)
//   2 = Fire   (lower-right)
//   3 = Earth  (lower-left)
//   4 = Air    (upper-left)

/**
 * Golden Dawn Elemental Pentagram Drawing Orders
 *
 * Each element has a specific starting vertex. The pentagram is always
 * drawn as a continuous 5-pointed star. For BANISHING, you start at
 * the element's vertex and draw AWAY from it. For INVOKING, you start
 * at the vertex and draw TOWARD it (i.e., reverse direction).
 *
 * Starting vertices per element:
 *   Earth  → vertex 3 (Lower-Left)
 *   Air    → vertex 4 (Upper-Left)
 *   Water  → vertex 1 (Upper-Right)
 *   Fire   → vertex 2 (Lower-Right)
 *   Spirit → vertex 0 (Top)
 *     Spirit Banishing Active: 0 → 3 → 1 → 4 → 2 → 0
 *     Spirit Invoking Active:  0 → 2 → 4 → 1 → 3 → 0
 */

// Banishing order: start at element vertex, draw away (clockwise star stroke)
const PENTAGRAM_BANISH_ORDERS: Record<ElementName, number[]> = {
  Earth:  [3, 0, 2, 4, 1, 3],  // Earth → Spirit → Fire → Air → Water → Earth
  Air:    [4, 1, 3, 0, 2, 4],  // Air → Water → Earth → Spirit → Fire → Air
  Water:  [1, 4, 2, 0, 3, 1],  // Water → Air → Fire → Spirit → Earth → Water
  Fire:   [2, 4, 0, 3, 1, 2],  // Fire → Air → Spirit → Earth → Water → Fire
  Spirit: [0, 3, 1, 4, 2, 0],  // Spirit Active Banishing
};

// Invoking order: reverse of banishing (draw toward the element vertex)
const PENTAGRAM_INVOKE_ORDERS: Record<ElementName, number[]> = {
  Earth:  [0, 3, 1, 4, 2, 0],  // Spirit → Earth → Water → Air → Fire → Spirit
  Air:    [1, 4, 2, 0, 3, 1],  // Water → Air → Fire → Spirit → Earth → Water
  Water:  [4, 1, 3, 0, 2, 4],  // Air → Water → Earth → Spirit → Fire → Air
  Fire:   [4, 2, 0, 3, 1, 4],  // Air → Fire → Spirit → Earth → Water → Air
  Spirit: [0, 2, 4, 1, 3, 0],  // Spirit Active Invoking
};

function getPentagramVerticesNorm(): Array<{ x: number; y: number }> {
  const points: Array<{ x: number; y: number }> = [];
  for (let i = 0; i < 5; i++) {
    const angle = -Math.PI / 2 + (i * 2 * Math.PI / 5);
    points.push({
      x: 0.5 + 0.45 * Math.cos(angle),
      y: 0.5 + 0.45 * Math.sin(angle),
    });
  }
  return points;
}

function getPentagramPath(
  intent: RitualIntent,
  element: ElementName,
): Array<{ x: number; y: number }> {
  const vertices = getPentagramVerticesNorm();
  const order = intent === 'BANISH'
    ? PENTAGRAM_BANISH_ORDERS[element]
    : PENTAGRAM_INVOKE_ORDERS[element];
  return order.map((idx) => vertices[idx]);
}

// ─── Hexagram Logic (Golden Dawn Planetary) ─────────────────
//
// The Greater Ritual of the Hexagram assigns each planet to a
// specific triangle configuration. Each hexagram is drawn as
// two separate triangles (upright △ and inverted ▽).
//
// Planet → Triangle assignments:
//   Saturn  → Upright starts top, Inverted starts bottom
//   Jupiter → Upright starts lower-right, Inverted starts upper-left
//   Mars    → Upright starts lower-left, Inverted starts upper-right
//   Sun     → Both triangles (standard hexagram), Upright then Inverted
//   Venus   → Inverted starts upper-right, Upright starts lower-left
//   Mercury → Inverted starts upper-left, Upright starts lower-right
//   Moon    → Inverted starts bottom, Upright starts top

// Upright triangle vertices (equilateral, normalized 0-1):
//   0 = Top center
//   1 = Bottom-right
//   2 = Bottom-left
function getUprightTriangleNorm(): Array<{ x: number; y: number }> {
  const r = 0.4;
  return [
    { x: 0.5, y: 0.5 - r },                                          // Top
    { x: 0.5 + r * Math.cos(Math.PI / 6), y: 0.5 + r * Math.sin(Math.PI / 6) }, // Bottom-right
    { x: 0.5 - r * Math.cos(Math.PI / 6), y: 0.5 + r * Math.sin(Math.PI / 6) }, // Bottom-left
  ];
}

// Inverted triangle vertices:
//   0 = Bottom center
//   1 = Top-left
//   2 = Top-right
function getInvertedTriangleNorm(): Array<{ x: number; y: number }> {
  const r = 0.4;
  return [
    { x: 0.5, y: 0.5 + r },                                          // Bottom
    { x: 0.5 - r * Math.cos(Math.PI / 6), y: 0.5 - r * Math.sin(Math.PI / 6) }, // Top-left
    { x: 0.5 + r * Math.cos(Math.PI / 6), y: 0.5 - r * Math.sin(Math.PI / 6) }, // Top-right
  ];
}

/**
 * Golden Dawn Hexagram drawing for each planet.
 * Returns two paths (two triangles), each as a closed loop of 4 points.
 *
 * For BANISHING: draw away from the planet's attributed point.
 * For INVOKING: draw toward the planet's attributed point.
 *
 * The starting vertex rotates based on the planet.
 */
function rotateTriangle(
  tri: Array<{ x: number; y: number }>,
  startIdx: number,
): Array<{ x: number; y: number }> {
  const result: Array<{ x: number; y: number }> = [];
  for (let i = 0; i < 3; i++) {
    result.push(tri[(startIdx + i) % 3]);
  }
  // Close the triangle
  result.push(tri[startIdx]);
  return result;
}

// Planet → starting vertex index for upright and inverted triangles
// For banishing: start at planet vertex, draw clockwise
// For invoking: start at planet vertex, draw counter-clockwise
interface HexagramConfig {
  uprightStart: number;   // Starting vertex index for upright triangle
  invertedStart: number;  // Starting vertex index for inverted triangle
}

const PLANET_HEXAGRAM_CONFIG: Record<PlanetName, HexagramConfig> = {
  Saturn:  { uprightStart: 0, invertedStart: 0 },  // Top / Bottom
  Jupiter: { uprightStart: 1, invertedStart: 1 },  // Bottom-right / Top-left
  Mars:    { uprightStart: 2, invertedStart: 2 },  // Bottom-left / Top-right
  Sun:     { uprightStart: 0, invertedStart: 0 },  // Standard (both from apex)
  Venus:   { uprightStart: 2, invertedStart: 2 },  // Mirror of Mars
  Mercury: { uprightStart: 1, invertedStart: 1 },  // Mirror of Jupiter
  Moon:    { uprightStart: 0, invertedStart: 0 },  // Mirror of Saturn
};

function getHexagramPaths(
  intent: RitualIntent,
  planet: PlanetName,
): Array<Array<{ x: number; y: number }>> {
  const config = PLANET_HEXAGRAM_CONFIG[planet];
  const upright = getUprightTriangleNorm();
  const inverted = getInvertedTriangleNorm();

  let path1: Array<{ x: number; y: number }>;
  let path2: Array<{ x: number; y: number }>;

  if (intent === 'BANISH') {
    // Banishing: clockwise from planet vertex
    path1 = rotateTriangle(upright, config.uprightStart);
    path2 = rotateTriangle(inverted, config.invertedStart);
  } else {
    // Invoking: counter-clockwise (reverse the triangle order)
    const uprightReversed = [...upright].reverse();
    const invertedReversed = [...inverted].reverse();
    // Adjust start index for reversed array
    const revUprightStart = (3 - config.uprightStart) % 3;
    const revInvertedStart = (3 - config.invertedStart) % 3;
    path1 = rotateTriangle(uprightReversed, revUprightStart);
    path2 = rotateTriangle(invertedReversed, revInvertedStart);
  }

  return [path1, path2];
}

// ─── Public API ─────────────────────────────────────────────

const ELEMENTS: ElementName[] = ['Earth', 'Air', 'Water', 'Fire', 'Spirit'];
const PLANETS: PlanetName[] = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn'];

export function isElementName(s: string): s is ElementName {
  return ELEMENTS.includes(s as ElementName);
}

export function isPlanetName(s: string): s is PlanetName {
  return PLANETS.includes(s as PlanetName);
}

/**
 * Get the ritual geometry (paths + color) for a given shape, intent, and dynamic selection.
 *
 * @param shape - 'Pentagram' or 'Hexagram'
 * @param intent - 'BANISH' or 'INVOKE'
 * @param selection - The user's chosen element or planet name
 * @returns GeometryResult with normalized paths (0-1 coordinate space) and colorHex
 */
export function getRitualGeometry(
  shape: 'Pentagram' | 'Hexagram',
  intent: RitualIntent,
  selection: string,
): GeometryResult {
  if (shape === 'Pentagram' && isElementName(selection)) {
    const path = getPentagramPath(intent, selection);
    return {
      paths: [path],
      colorHex: ELEMENT_COLORS[selection],
    };
  }

  if (shape === 'Hexagram' && isPlanetName(selection)) {
    const paths = getHexagramPaths(intent, selection);
    return {
      paths,
      colorHex: PLANET_COLORS[selection],
    };
  }

  // Fallback: return default Earth pentagram or Sun hexagram
  if (shape === 'Pentagram') {
    const path = getPentagramPath(intent, 'Earth');
    return { paths: [path], colorHex: ELEMENT_COLORS.Earth };
  }

  const paths = getHexagramPaths(intent, 'Sun');
  return { paths, colorHex: PLANET_COLORS.Sun };
}

/**
 * Get the pentagram drawing order indices for a given element and intent.
 * Used by the Holo-Pad to override the default Earth order.
 */
export function getPentagramOrder(
  intent: RitualIntent,
  element: ElementName = 'Earth',
): number[] {
  return intent === 'BANISH'
    ? PENTAGRAM_BANISH_ORDERS[element]
    : PENTAGRAM_INVOKE_ORDERS[element];
}

/**
 * Get the hexagram triangle paths for a given planet and intent.
 * Returns normalized coordinates (0-1 space).
 */
export function getHexagramTrianglePaths(
  intent: RitualIntent,
  planet: PlanetName = 'Sun',
): Array<Array<{ x: number; y: number }>> {
  return getHexagramPaths(intent, planet);
}

/**
 * Get the color for a given element or planet.
 */
export function getSelectionColor(selection: string): string {
  if (isElementName(selection)) return ELEMENT_COLORS[selection];
  if (isPlanetName(selection)) return PLANET_COLORS[selection];
  return '#D4AF37'; // Default gold
}

export { ELEMENT_COLORS, PLANET_COLORS, ELEMENTS, PLANETS };
