// ============================================================
// SIDERUM – Elder Futhark Rune Dictionary & Bindrune Generator
// ============================================================

import { Planet } from '../astro/types';

export interface Rune {
  name: string;
  symbol: string;
  meaning: string;
  keywords: string[];
  planet?: Planet;
  element?: string;
  // SVG path segments for the rune's distinctive strokes (relative to central stave)
  branches: RuneBranch[];
}

export interface RuneBranch {
  // Start and end points relative to stave (0=top, 1=bottom)
  startY: number;
  endY: number;
  // Direction: -1 = left, 1 = right
  direction: number;
  // Angle in degrees from vertical
  angle: number;
  // Length relative to stave height
  length: number;
}

export const ELDER_FUTHARK: Rune[] = [
  {
    name: 'Fehu',
    symbol: 'ᚠ',
    meaning: 'Wealth, Cattle',
    keywords: ['wealth', 'abundance', 'prosperity', 'money', 'success'],
    planet: 'Venus',
    branches: [
      { startY: 0.0, endY: 0.0, direction: 1, angle: 30, length: 0.3 },
      { startY: 0.15, endY: 0.15, direction: 1, angle: 30, length: 0.25 },
    ],
  },
  {
    name: 'Uruz',
    symbol: 'ᚢ',
    meaning: 'Strength, Aurochs',
    keywords: ['strength', 'health', 'vitality', 'power', 'endurance'],
    planet: 'Mars',
    branches: [
      { startY: 0.0, endY: 0.4, direction: 1, angle: 15, length: 0.4 },
      { startY: 0.4, endY: 0.4, direction: 0, angle: 0, length: 0.0 },
    ],
  },
  {
    name: 'Thurisaz',
    symbol: 'ᚦ',
    meaning: 'Thorn, Giant',
    keywords: ['protection', 'defense', 'conflict', 'thorn', 'force'],
    planet: 'Mars',
    branches: [
      { startY: 0.2, endY: 0.2, direction: 1, angle: 45, length: 0.2 },
      { startY: 0.2, endY: 0.4, direction: 1, angle: -45, length: 0.2 },
    ],
  },
  {
    name: 'Ansuz',
    symbol: 'ᚨ',
    meaning: 'God, Mouth',
    keywords: ['wisdom', 'communication', 'knowledge', 'divine', 'inspiration'],
    planet: 'Mercury',
    branches: [
      { startY: 0.0, endY: 0.0, direction: 1, angle: 45, length: 0.25 },
      { startY: 0.25, endY: 0.25, direction: 1, angle: 45, length: 0.25 },
    ],
  },
  {
    name: 'Raidho',
    symbol: 'ᚱ',
    meaning: 'Journey, Ride',
    keywords: ['travel', 'journey', 'movement', 'rhythm', 'order'],
    planet: 'Mercury',
    branches: [
      { startY: 0.0, endY: 0.0, direction: 1, angle: 45, length: 0.2 },
      { startY: 0.0, endY: 0.3, direction: 1, angle: -30, length: 0.35 },
    ],
  },
  {
    name: 'Kenaz',
    symbol: 'ᚲ',
    meaning: 'Torch, Knowledge',
    keywords: ['creativity', 'knowledge', 'craft', 'light', 'vision'],
    planet: 'Venus',
    branches: [
      { startY: 0.2, endY: 0.2, direction: 1, angle: 45, length: 0.25 },
      { startY: 0.2, endY: 0.2, direction: 1, angle: -45, length: 0.25 },
    ],
  },
  {
    name: 'Gebo',
    symbol: 'ᚷ',
    meaning: 'Gift, Partnership',
    keywords: ['gift', 'partnership', 'love', 'balance', 'exchange'],
    planet: 'Venus',
    branches: [
      { startY: 0.15, endY: 0.15, direction: 1, angle: 45, length: 0.35 },
      { startY: 0.15, endY: 0.15, direction: -1, angle: 45, length: 0.35 },
      { startY: 0.5, endY: 0.5, direction: 1, angle: -45, length: 0.35 },
      { startY: 0.5, endY: 0.5, direction: -1, angle: -45, length: 0.35 },
    ],
  },
  {
    name: 'Wunjo',
    symbol: 'ᚹ',
    meaning: 'Joy, Bliss',
    keywords: ['joy', 'happiness', 'harmony', 'bliss', 'pleasure'],
    planet: 'Venus',
    branches: [
      { startY: 0.0, endY: 0.0, direction: 1, angle: 45, length: 0.2 },
      { startY: 0.0, endY: 0.2, direction: 1, angle: 0, length: 0.2 },
    ],
  },
  {
    name: 'Hagalaz',
    symbol: 'ᚺ',
    meaning: 'Hail, Disruption',
    keywords: ['disruption', 'change', 'destruction', 'transformation'],
    planet: 'Saturn',
    branches: [
      { startY: 0.3, endY: 0.3, direction: 1, angle: 30, length: 0.3 },
      { startY: 0.3, endY: 0.3, direction: -1, angle: -30, length: 0.3 },
    ],
  },
  {
    name: 'Nauthiz',
    symbol: 'ᚾ',
    meaning: 'Need, Constraint',
    keywords: ['need', 'constraint', 'resistance', 'survival', 'patience'],
    planet: 'Saturn',
    branches: [
      { startY: 0.3, endY: 0.3, direction: 1, angle: 45, length: 0.25 },
      { startY: 0.3, endY: 0.3, direction: -1, angle: -45, length: 0.25 },
    ],
  },
  {
    name: 'Isa',
    symbol: 'ᛁ',
    meaning: 'Ice, Stillness',
    keywords: ['stillness', 'ice', 'focus', 'concentration', 'clarity'],
    planet: 'Saturn',
    branches: [], // Just the stave itself
  },
  {
    name: 'Jera',
    symbol: 'ᛃ',
    meaning: 'Year, Harvest',
    keywords: ['harvest', 'reward', 'cycle', 'season', 'patience'],
    planet: 'Jupiter',
    branches: [
      { startY: 0.15, endY: 0.15, direction: 1, angle: 45, length: 0.2 },
      { startY: 0.15, endY: 0.35, direction: 1, angle: -45, length: 0.2 },
      { startY: 0.5, endY: 0.5, direction: -1, angle: 45, length: 0.2 },
      { startY: 0.5, endY: 0.7, direction: -1, angle: -45, length: 0.2 },
    ],
  },
  {
    name: 'Eihwaz',
    symbol: 'ᛇ',
    meaning: 'Yew, Endurance',
    keywords: ['endurance', 'death', 'rebirth', 'protection', 'stability'],
    planet: 'Saturn',
    branches: [
      { startY: 0.25, endY: 0.25, direction: 1, angle: 45, length: 0.2 },
      { startY: 0.6, endY: 0.6, direction: -1, angle: 45, length: 0.2 },
    ],
  },
  {
    name: 'Perthro',
    symbol: 'ᛈ',
    meaning: 'Fate, Mystery',
    keywords: ['fate', 'mystery', 'divination', 'luck', 'secret'],
    planet: 'Moon',
    branches: [
      { startY: 0.1, endY: 0.1, direction: 1, angle: 45, length: 0.2 },
      { startY: 0.1, endY: 0.35, direction: 1, angle: 0, length: 0.25 },
      { startY: 0.35, endY: 0.35, direction: -1, angle: -45, length: 0.2 },
    ],
  },
  {
    name: 'Algiz',
    symbol: 'ᛉ',
    meaning: 'Elk, Protection',
    keywords: ['protection', 'shield', 'guardian', 'sanctuary', 'defense'],
    planet: 'Jupiter',
    branches: [
      { startY: 0.35, endY: 0.35, direction: 1, angle: -45, length: 0.35 },
      { startY: 0.35, endY: 0.35, direction: -1, angle: -45, length: 0.35 },
    ],
  },
  {
    name: 'Sowilo',
    symbol: 'ᛊ',
    meaning: 'Sun, Victory',
    keywords: ['sun', 'victory', 'success', 'honor', 'energy'],
    planet: 'Sun',
    branches: [
      { startY: 0.1, endY: 0.1, direction: 1, angle: 45, length: 0.25 },
      { startY: 0.35, endY: 0.35, direction: -1, angle: 45, length: 0.25 },
    ],
  },
  {
    name: 'Tiwaz',
    symbol: 'ᛏ',
    meaning: 'Tyr, Justice',
    keywords: ['justice', 'honor', 'leadership', 'courage', 'law'],
    planet: 'Mars',
    branches: [
      { startY: 0.0, endY: 0.0, direction: 1, angle: 45, length: 0.25 },
      { startY: 0.0, endY: 0.0, direction: -1, angle: 45, length: 0.25 },
    ],
  },
  {
    name: 'Berkano',
    symbol: 'ᛒ',
    meaning: 'Birch, Growth',
    keywords: ['growth', 'fertility', 'birth', 'renewal', 'healing'],
    planet: 'Moon',
    branches: [
      { startY: 0.0, endY: 0.0, direction: 1, angle: 45, length: 0.2 },
      { startY: 0.0, endY: 0.25, direction: 1, angle: -45, length: 0.2 },
      { startY: 0.25, endY: 0.25, direction: 1, angle: 45, length: 0.2 },
      { startY: 0.25, endY: 0.5, direction: 1, angle: -45, length: 0.2 },
    ],
  },
  {
    name: 'Ehwaz',
    symbol: 'ᛖ',
    meaning: 'Horse, Movement',
    keywords: ['movement', 'progress', 'trust', 'loyalty', 'partnership'],
    planet: 'Mercury',
    branches: [
      { startY: 0.2, endY: 0.2, direction: 1, angle: 30, length: 0.2 },
      { startY: 0.2, endY: 0.4, direction: 1, angle: -30, length: 0.2 },
    ],
  },
  {
    name: 'Mannaz',
    symbol: 'ᛗ',
    meaning: 'Man, Humanity',
    keywords: ['humanity', 'self', 'intelligence', 'community', 'cooperation'],
    planet: 'Jupiter',
    branches: [
      { startY: 0.0, endY: 0.0, direction: 1, angle: 45, length: 0.25 },
      { startY: 0.0, endY: 0.0, direction: -1, angle: 45, length: 0.25 },
      { startY: 0.25, endY: 0.25, direction: 1, angle: -45, length: 0.25 },
      { startY: 0.25, endY: 0.25, direction: -1, angle: -45, length: 0.25 },
    ],
  },
  {
    name: 'Laguz',
    symbol: 'ᛚ',
    meaning: 'Water, Flow',
    keywords: ['water', 'intuition', 'flow', 'emotion', 'dreams'],
    planet: 'Moon',
    branches: [
      { startY: 0.0, endY: 0.0, direction: 1, angle: 45, length: 0.25 },
    ],
  },
  {
    name: 'Ingwaz',
    symbol: 'ᛝ',
    meaning: 'Ing, Fertility',
    keywords: ['fertility', 'potential', 'gestation', 'internal', 'seed'],
    planet: 'Venus',
    branches: [
      { startY: 0.15, endY: 0.15, direction: 1, angle: 45, length: 0.2 },
      { startY: 0.15, endY: 0.15, direction: -1, angle: 45, length: 0.2 },
      { startY: 0.5, endY: 0.5, direction: 1, angle: -45, length: 0.2 },
      { startY: 0.5, endY: 0.5, direction: -1, angle: -45, length: 0.2 },
    ],
  },
  {
    name: 'Dagaz',
    symbol: 'ᛞ',
    meaning: 'Day, Breakthrough',
    keywords: ['breakthrough', 'awakening', 'dawn', 'clarity', 'transformation'],
    planet: 'Sun',
    branches: [
      { startY: 0.15, endY: 0.15, direction: 1, angle: 45, length: 0.35 },
      { startY: 0.15, endY: 0.15, direction: -1, angle: -45, length: 0.35 },
      { startY: 0.5, endY: 0.5, direction: 1, angle: -45, length: 0.35 },
      { startY: 0.5, endY: 0.5, direction: -1, angle: 45, length: 0.35 },
    ],
  },
  {
    name: 'Othala',
    symbol: 'ᛟ',
    meaning: 'Heritage, Home',
    keywords: ['heritage', 'home', 'ancestry', 'legacy', 'tradition'],
    planet: 'Saturn',
    branches: [
      { startY: 0.0, endY: 0.0, direction: 1, angle: 45, length: 0.2 },
      { startY: 0.0, endY: 0.0, direction: -1, angle: 45, length: 0.2 },
      { startY: 0.25, endY: 0.25, direction: 1, angle: -45, length: 0.2 },
      { startY: 0.25, endY: 0.25, direction: -1, angle: -45, length: 0.2 },
      { startY: 0.5, endY: 0.5, direction: 1, angle: 20, length: 0.15 },
      { startY: 0.5, endY: 0.5, direction: -1, angle: 20, length: 0.15 },
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

// Generate SVG path for a bindrune from selected runes
export function generateBindruneSVG(
  selectedRunes: Rune[],
  width: number = 200,
  height: number = 300,
): string {
  const cx = width / 2;
  const staveTop = height * 0.05;
  const staveBottom = height * 0.95;
  const staveHeight = staveBottom - staveTop;
  const branchScale = staveHeight * 0.5;

  let paths = '';

  // Central stave
  paths += `<line x1="${cx}" y1="${staveTop}" x2="${cx}" y2="${staveBottom}" stroke="#D4AF37" stroke-width="2" stroke-linecap="round"/>`;

  // Collect all branches from selected runes, offset slightly for each rune
  const allBranches: Array<{ branch: RuneBranch; runeIndex: number }> = [];
  selectedRunes.forEach((rune, idx) => {
    rune.branches.forEach(branch => {
      allBranches.push({ branch, runeIndex: idx });
    });
  });

  // Distribute branches along the stave
  const usedPositions = new Set<string>();

  allBranches.forEach(({ branch, runeIndex }) => {
    // Offset position slightly per rune to avoid exact overlap
    const offset = runeIndex * 0.05;
    const startYPos = staveTop + (branch.startY + offset) * staveHeight;

    const angleRad = (branch.angle * Math.PI) / 180;
    const len = branch.length * branchScale;
    const dir = branch.direction || 1;

    const endX = cx + dir * len * Math.sin(angleRad);
    const endY = startYPos - len * Math.cos(angleRad);

    // Create unique key to avoid exact duplicates
    const key = `${Math.round(startYPos)}-${Math.round(endX)}-${Math.round(endY)}`;
    if (!usedPositions.has(key)) {
      usedPositions.add(key);
      paths += `\n  <line x1="${cx}" y1="${startYPos.toFixed(1)}" x2="${endX.toFixed(1)}" y2="${endY.toFixed(1)}" stroke="#D4AF37" stroke-width="1.5" stroke-linecap="round"/>`;
    }
  });

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  <rect width="${width}" height="${height}" fill="transparent"/>
  ${paths}
</svg>`;
}
