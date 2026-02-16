// ============================================================
// ÆONIS – Elder Futhark Rune Dictionary & Bindrune Generator
// Beta: Absolute Stacking strategy – full rune SVGs layered
// ============================================================

import { Planet } from '../astro/types';

export interface Rune {
  name: string;
  symbol: string;
  meaning: string;
  keywords: string[];
  planet?: Planet;
  element?: string;
  // Full SVG path for the rune (drawn in a normalized coordinate system)
  // Coordinate system: x=0 is center, y ranges from 0 (top) to 1 (bottom)
  // Stemmed runes include their vertical stem; stemless do not
  svgPaths: string[];
  // If true, the rune has no vertical stem (Gebo, Ingwaz, Jera, Othala, Dagaz)
  // These are centered geometrically on the spine
  isStemless?: boolean;
}

export const ELDER_FUTHARK: Rune[] = [
  {
    name: 'Fehu',
    symbol: 'ᚠ',
    meaning: 'Wealth, Cattle',
    keywords: ['wealth', 'abundance', 'prosperity', 'money', 'success'],
    planet: 'Venus',
    // Vertical stem + two diagonal branches going right-up from top
    svgPaths: [
      'M 0 0 L 0 1',                  // stem
      'M 0 0 L 0.35 0.2',             // upper branch
      'M 0 0.15 L 0.3 0.35',          // lower branch
    ],
  },
  {
    name: 'Uruz',
    symbol: 'ᚢ',
    meaning: 'Strength, Aurochs',
    keywords: ['strength', 'health', 'vitality', 'power', 'endurance'],
    planet: 'Mars',
    svgPaths: [
      'M 0 0 L 0 1',                  // left stem
      'M 0 0 L 0.3 0.4',             // diagonal down-right
      'M 0.3 0.4 L 0.3 1',           // right partial stem
    ],
  },
  {
    name: 'Thurisaz',
    symbol: 'ᚦ',
    meaning: 'Thorn, Giant',
    keywords: ['protection', 'defense', 'conflict', 'thorn', 'force'],
    planet: 'Mars',
    svgPaths: [
      'M 0 0 L 0 1',                  // stem
      'M 0 0.25 L 0.3 0.4',          // upper thorn
      'M 0.3 0.4 L 0 0.55',          // lower thorn
    ],
  },
  {
    name: 'Ansuz',
    symbol: 'ᚨ',
    meaning: 'God, Mouth',
    keywords: ['wisdom', 'communication', 'knowledge', 'divine', 'inspiration'],
    planet: 'Mercury',
    svgPaths: [
      'M 0 0 L 0 1',                  // stem
      'M 0 0.15 L 0.3 0',            // upper branch (up-right)
      'M 0 0.4 L 0.3 0.25',          // lower branch (up-right)
    ],
  },
  {
    name: 'Raidho',
    symbol: 'ᚱ',
    meaning: 'Journey, Ride',
    keywords: ['travel', 'journey', 'movement', 'rhythm', 'order'],
    planet: 'Mercury',
    svgPaths: [
      'M 0 0 L 0 1',                  // stem
      'M 0 0.1 L 0.25 0.1',          // top horizontal
      'M 0.25 0.1 L 0.25 0.35',      // right vertical
      'M 0.25 0.35 L 0 0.35',        // middle horizontal
      'M 0 0.35 L 0.3 0.65',         // diagonal leg
    ],
  },
  {
    name: 'Kenaz',
    symbol: 'ᚲ',
    meaning: 'Torch, Knowledge',
    keywords: ['creativity', 'knowledge', 'craft', 'light', 'vision'],
    planet: 'Venus',
    svgPaths: [
      'M 0 0 L 0 1',                  // stem
      'M 0 0.25 L 0.3 0.4',          // upper V
      'M 0.3 0.4 L 0 0.55',          // lower V
    ],
  },
  {
    name: 'Gebo',
    symbol: 'ᚷ',
    meaning: 'Gift, Partnership',
    keywords: ['gift', 'partnership', 'love', 'balance', 'exchange'],
    planet: 'Venus',
    isStemless: true,
    // X shape
    svgPaths: [
      'M -0.3 0.15 L 0.3 0.85',      // diagonal \
      'M 0.3 0.15 L -0.3 0.85',      // diagonal /
    ],
  },
  {
    name: 'Wunjo',
    symbol: 'ᚹ',
    meaning: 'Joy, Bliss',
    keywords: ['joy', 'happiness', 'harmony', 'bliss', 'pleasure'],
    planet: 'Venus',
    svgPaths: [
      'M 0 0 L 0 1',                  // stem
      'M 0 0 L 0.3 0.15',            // flag top
      'M 0.3 0.15 L 0.3 0.4',        // flag right
      'M 0.3 0.4 L 0 0.25',          // flag bottom
    ],
  },
  {
    name: 'Hagalaz',
    symbol: 'ᚺ',
    meaning: 'Hail, Disruption',
    keywords: ['disruption', 'change', 'destruction', 'transformation'],
    planet: 'Saturn',
    svgPaths: [
      'M 0 0 L 0 1',                  // left stem
      'M 0.35 0 L 0.35 1',           // right stem
      'M 0 0.6 L 0.35 0.4',          // cross bar (diagonal)
    ],
  },
  {
    name: 'Nauthiz',
    symbol: 'ᚾ',
    meaning: 'Need, Constraint',
    keywords: ['need', 'constraint', 'resistance', 'survival', 'patience'],
    planet: 'Saturn',
    svgPaths: [
      'M 0 0 L 0 1',                  // stem
      'M -0.2 0.35 L 0.2 0.55',      // cross bar (diagonal)
    ],
  },
  {
    name: 'Isa',
    symbol: 'ᛁ',
    meaning: 'Ice, Stillness',
    keywords: ['stillness', 'ice', 'focus', 'concentration', 'clarity'],
    planet: 'Saturn',
    svgPaths: [
      'M 0 0 L 0 1',                  // just the stem
    ],
  },
  {
    name: 'Jera',
    symbol: 'ᛃ',
    meaning: 'Year, Harvest',
    keywords: ['harvest', 'reward', 'cycle', 'season', 'patience'],
    planet: 'Jupiter',
    isStemless: true,
    // Two interlocking angular shapes
    svgPaths: [
      'M 0.15 0.15 L 0.3 0.35 L 0.15 0.5',   // right chevron
      'M -0.15 0.5 L -0.3 0.35 L -0.15 0.15', // left chevron (mirrored)
    ],
  },
  {
    name: 'Eihwaz',
    symbol: 'ᛇ',
    meaning: 'Yew, Endurance',
    keywords: ['endurance', 'death', 'rebirth', 'protection', 'stability'],
    planet: 'Saturn',
    svgPaths: [
      'M 0 0 L 0 1',                  // stem
      'M 0 0.3 L 0.25 0.15',         // upper right branch
      'M 0 0.7 L -0.25 0.85',        // lower left branch
    ],
  },
  {
    name: 'Perthro',
    symbol: 'ᛈ',
    meaning: 'Fate, Mystery',
    keywords: ['fate', 'mystery', 'divination', 'luck', 'secret'],
    planet: 'Moon',
    svgPaths: [
      'M 0 0 L 0 1',                  // stem
      'M 0 0.2 L 0.25 0.3',          // upper cup
      'M 0.25 0.3 L 0.25 0.55',      // cup side
      'M 0.25 0.55 L 0 0.65',        // lower cup
    ],
  },
  {
    name: 'Algiz',
    symbol: 'ᛉ',
    meaning: 'Elk, Protection',
    keywords: ['protection', 'shield', 'guardian', 'sanctuary', 'defense'],
    planet: 'Jupiter',
    svgPaths: [
      'M 0 0.3 L 0 1',               // stem (lower)
      'M 0 0.3 L -0.3 0',            // left antler
      'M 0 0.3 L 0.3 0',             // right antler
    ],
  },
  {
    name: 'Sowilo',
    symbol: 'ᛊ',
    meaning: 'Sun, Victory',
    keywords: ['sun', 'victory', 'success', 'honor', 'energy'],
    planet: 'Sun',
    isStemless: true,
    // Lightning bolt / S-shape
    svgPaths: [
      'M -0.15 0.15 L 0.15 0.35',    // upper diagonal
      'M 0.15 0.35 L -0.15 0.55',    // middle diagonal
      'M -0.15 0.55 L 0.15 0.75',    // lower diagonal
    ],
  },
  {
    name: 'Tiwaz',
    symbol: 'ᛏ',
    meaning: 'Tyr, Justice',
    keywords: ['justice', 'honor', 'leadership', 'courage', 'law'],
    planet: 'Mars',
    svgPaths: [
      'M 0 0.2 L 0 1',               // stem
      'M -0.3 0.2 L 0 0',            // left arrow
      'M 0.3 0.2 L 0 0',             // right arrow
    ],
  },
  {
    name: 'Berkano',
    symbol: 'ᛒ',
    meaning: 'Birch, Growth',
    keywords: ['growth', 'fertility', 'birth', 'renewal', 'healing'],
    planet: 'Moon',
    svgPaths: [
      'M 0 0 L 0 1',                  // stem
      'M 0 0.1 L 0.25 0.2',          // upper bump out
      'M 0.25 0.2 L 0 0.35',         // upper bump in
      'M 0 0.35 L 0.25 0.5',         // lower bump out
      'M 0.25 0.5 L 0 0.65',         // lower bump in
    ],
  },
  {
    name: 'Ehwaz',
    symbol: 'ᛖ',
    meaning: 'Horse, Movement',
    keywords: ['movement', 'progress', 'trust', 'loyalty', 'partnership'],
    planet: 'Mercury',
    svgPaths: [
      'M 0 0 L 0 1',                  // left stem
      'M 0.3 0 L 0.3 1',             // right stem
      'M 0 0.35 L 0.3 0.5',          // cross bar
      'M 0 0.5 L 0.3 0.35',          // cross bar (X pattern)
    ],
  },
  {
    name: 'Mannaz',
    symbol: 'ᛗ',
    meaning: 'Man, Humanity',
    keywords: ['humanity', 'self', 'intelligence', 'community', 'cooperation'],
    planet: 'Jupiter',
    svgPaths: [
      'M 0 0 L 0 1',                  // left stem
      'M 0.35 0 L 0.35 1',           // right stem
      'M 0 0 L 0.175 0.2',           // left-to-center diagonal
      'M 0.35 0 L 0.175 0.2',        // right-to-center diagonal
    ],
  },
  {
    name: 'Laguz',
    symbol: 'ᛚ',
    meaning: 'Water, Flow',
    keywords: ['water', 'intuition', 'flow', 'emotion', 'dreams'],
    planet: 'Moon',
    svgPaths: [
      'M 0 0 L 0 1',                  // stem
      'M 0 0 L 0.3 0.25',            // diagonal branch
    ],
  },
  {
    name: 'Ingwaz',
    symbol: 'ᛝ',
    meaning: 'Ing, Fertility',
    keywords: ['fertility', 'potential', 'gestation', 'internal', 'seed'],
    planet: 'Venus',
    isStemless: true,
    // Diamond shape
    svgPaths: [
      'M 0 0.15 L 0.25 0.5 L 0 0.85 L -0.25 0.5 Z',
    ],
  },
  {
    name: 'Dagaz',
    symbol: 'ᛞ',
    meaning: 'Day, Breakthrough',
    keywords: ['breakthrough', 'awakening', 'dawn', 'clarity', 'transformation'],
    planet: 'Sun',
    isStemless: true,
    // Hourglass/butterfly shape
    svgPaths: [
      'M -0.25 0.15 L 0.25 0.15',    // top bar
      'M 0.25 0.15 L -0.25 0.85',    // diagonal \
      'M -0.25 0.85 L 0.25 0.85',    // bottom bar
      'M 0.25 0.85 L -0.25 0.15',    // diagonal /
    ],
  },
  {
    name: 'Othala',
    symbol: 'ᛟ',
    meaning: 'Heritage, Home',
    keywords: ['heritage', 'home', 'ancestry', 'legacy', 'tradition'],
    planet: 'Saturn',
    isStemless: true,
    // Diamond on top + two legs at bottom
    svgPaths: [
      'M 0 0.1 L 0.25 0.35',         // diamond top-right
      'M 0.25 0.35 L 0 0.6',         // diamond bottom-right
      'M 0 0.6 L -0.25 0.35',        // diamond bottom-left
      'M -0.25 0.35 L 0 0.1',        // diamond top-left
      'M -0.25 0.35 L -0.2 0.85',    // left leg
      'M 0.25 0.35 L 0.2 0.85',      // right leg
    ],
  },
];

// Map keywords to runes
export function findRunesByKeyword(keyword: string): Rune[] {
  const lower = keyword.toLowerCase().trim();
  return ELDER_FUTHARK.filter(r =>
    r.keywords.some(k => k.includes(lower) || lower.includes(k))
  );
}

/**
 * Absolute Stacking Bindrune Generator
 *
 * Strategy:
 * 1. Layer 0: Draw central vertical Stave (the Spine)
 * 2. Layer 1-N: Render the full SVG of each selected rune on top
 *    - Stemmed runes: align their vertical stem with the central spine
 *    - Stemless runes: center geometrically on the spine
 */
export function generateBindruneSVG(
  selectedRunes: Rune[],
  width: number = 200,
  height: number = 300,
): string {
  const cx = width / 2;
  const staveTop = height * 0.05;
  const staveBottom = height * 0.95;
  const staveH = staveBottom - staveTop;

  let svgContent = '';

  // Layer 0: Central Stave (Spine) – always present
  svgContent += `  <line x1="${cx}" y1="${staveTop}" x2="${cx}" y2="${staveBottom}" stroke="#D4AF37" stroke-width="2.5" stroke-linecap="round"/>\n`;

  // Layer 1-N: Each rune stacked on top
  selectedRunes.forEach((rune) => {
    rune.svgPaths.forEach((pathStr) => {
      // For stemmed runes, skip the pure vertical stem path (it's already the spine)
      if (!rune.isStemless && isVerticalStem(pathStr)) return;

      const rendered = renderPath(pathStr, cx, staveTop, staveH, rune.isStemless);
      svgContent += `  ${rendered}\n`;
    });
  });

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  <rect width="${width}" height="${height}" fill="transparent"/>
${svgContent}</svg>`;
}

/**
 * Check if a path string is just a vertical stem (M 0 y1 L 0 y2)
 */
function isVerticalStem(pathStr: string): boolean {
  const clean = pathStr.trim();
  const match = clean.match(/^M\s+([\d.-]+)\s+([\d.-]+)\s+L\s+([\d.-]+)\s+([\d.-]+)$/);
  if (!match) return false;
  const x1 = parseFloat(match[1]);
  const x2 = parseFloat(match[3]);
  return x1 === 0 && x2 === 0;
}

/**
 * Render a single SVG path string into absolute coordinates
 * Normalized coords: x=0 is center, y ranges 0-1
 * Scale factor for x: staveH * 0.6 (width relative to height)
 */
function renderPath(
  pathStr: string,
  cx: number,
  staveTop: number,
  staveH: number,
  isStemless?: boolean,
): string {
  const xScale = staveH * 0.55;
  const clean = pathStr.trim();

  // Check if it's a closed path (polygon)
  if (clean.includes('Z')) {
    const points = clean.replace(/Z/g, '').trim().split(/\s*[ML]\s*/).filter(Boolean);
    let d = '';
    points.forEach((pt, i) => {
      const [rx, ry] = pt.trim().split(/\s+/).map(Number);
      const absX = cx + rx * xScale;
      const absY = staveTop + ry * staveH;
      d += `${i === 0 ? 'M' : 'L'} ${absX.toFixed(1)} ${absY.toFixed(1)} `;
    });
    d += 'Z';
    return `<path d="${d.trim()}" stroke="#D4AF37" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`;
  }

  // Parse M/L commands for line segments
  const commands = clean.split(/(?=[ML])/).filter(Boolean);
  const coords: Array<{ x: number; y: number }> = [];

  for (const cmd of commands) {
    const parts = cmd.trim();
    const nums = parts.slice(1).trim().split(/\s+/).map(Number);
    if (nums.length >= 2) {
      coords.push({ x: nums[0], y: nums[1] });
    }
  }

  if (coords.length < 2) return '';

  // Render as line segments
  const lines: string[] = [];
  for (let i = 0; i < coords.length - 1; i++) {
    // Check if next command is M (move) or L (line)
    const cmdType = commands[i + 1]?.trim()[0];
    if (cmdType === 'M') continue; // Skip if next is a new move

    const x1 = cx + coords[i].x * xScale;
    const y1 = staveTop + coords[i].y * staveH;
    const x2 = cx + coords[i + 1].x * xScale;
    const y2 = staveTop + coords[i + 1].y * staveH;

    lines.push(
      `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="#D4AF37" stroke-width="1.8" stroke-linecap="round"/>`
    );
  }

  return lines.join('\n  ');
}

/**
 * Generate bindrune data for React Native SVG rendering (used by runes.tsx)
 * Returns structured data instead of raw SVG string
 */
export interface BindruneRenderData {
  width: number;
  height: number;
  cx: number;
  staveTop: number;
  staveBottom: number;
  lines: Array<{ x1: number; y1: number; x2: number; y2: number; key: string }>;
  paths: Array<{ d: string; key: string }>;
}

export function generateBindruneData(
  selectedRunes: Rune[],
  width: number = 200,
  height: number = 300,
): BindruneRenderData {
  const cx = width / 2;
  const staveTop = height * 0.05;
  const staveBottom = height * 0.95;
  const staveH = staveBottom - staveTop;
  const xScale = staveH * 0.55;

  const lines: BindruneRenderData['lines'] = [];
  const paths: BindruneRenderData['paths'] = [];
  let lineIdx = 0;
  let pathIdx = 0;

  selectedRunes.forEach((rune, runeIdx) => {
    rune.svgPaths.forEach((pathStr) => {
      // Skip vertical stems for stemmed runes (spine is already drawn)
      if (!rune.isStemless && isVerticalStem(pathStr)) return;

      const clean = pathStr.trim();

      // Handle closed paths (polygons like Ingwaz diamond)
      if (clean.includes('Z')) {
        const points = clean.replace(/Z/g, '').trim().split(/\s*[ML]\s*/).filter(Boolean);
        let d = '';
        points.forEach((pt, i) => {
          const [rx, ry] = pt.trim().split(/\s+/).map(Number);
          const absX = cx + rx * xScale;
          const absY = staveTop + ry * staveH;
          d += `${i === 0 ? 'M' : 'L'} ${absX.toFixed(1)} ${absY.toFixed(1)} `;
        });
        d += 'Z';
        paths.push({ d: d.trim(), key: `path-${runeIdx}-${pathIdx++}` });
        return;
      }

      // Parse line commands
      const commands = clean.split(/(?=[ML])/).filter(Boolean);
      const coords: Array<{ x: number; y: number; cmd: string }> = [];

      for (const cmd of commands) {
        const parts = cmd.trim();
        const cmdType = parts[0];
        const nums = parts.slice(1).trim().split(/\s+/).map(Number);
        if (nums.length >= 2) {
          coords.push({ x: nums[0], y: nums[1], cmd: cmdType });
        }
      }

      // Generate line segments (L follows previous point)
      for (let i = 0; i < coords.length - 1; i++) {
        if (coords[i + 1].cmd === 'M') continue;

        lines.push({
          x1: cx + coords[i].x * xScale,
          y1: staveTop + coords[i].y * staveH,
          x2: cx + coords[i + 1].x * xScale,
          y2: staveTop + coords[i + 1].y * staveH,
          key: `line-${runeIdx}-${lineIdx++}`,
        });
      }
    });
  });

  return { width, height, cx, staveTop, staveBottom, lines, paths };
}
