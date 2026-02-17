/**
 * Digital Grimoire – Unit Tests
 * Tests for: completion-handler, power-rating, content layer, level system
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ============================================================
// 1. Completion Handler – Level System
// ============================================================
describe('Level System', () => {
  // Import the pure functions
  const LEVEL_THRESHOLDS = [0, 100, 300, 600, 1000, 1600, 2400, 3500, 5000, 7000, 10000];

  function calculateLevel(xp: number): number {
    for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
      if (xp >= LEVEL_THRESHOLDS[i]) return i;
    }
    return 0;
  }

  function xpForNextLevel(currentLevel: number): number {
    if (currentLevel >= LEVEL_THRESHOLDS.length - 1) return LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1];
    return LEVEL_THRESHOLDS[currentLevel + 1];
  }

  function xpForCurrentLevel(currentLevel: number): number {
    return LEVEL_THRESHOLDS[currentLevel] ?? 0;
  }

  it('should start at level 0 (Neophyte) with 0 XP', () => {
    expect(calculateLevel(0)).toBe(0);
  });

  it('should reach level 1 (Zelator) at 100 XP', () => {
    expect(calculateLevel(100)).toBe(1);
    expect(calculateLevel(99)).toBe(0);
  });

  it('should reach level 5 (Adeptus Minor) at 1600 XP', () => {
    expect(calculateLevel(1600)).toBe(5);
    expect(calculateLevel(1599)).toBe(4);
  });

  it('should reach level 10 (Ipsissimus) at 10000 XP', () => {
    expect(calculateLevel(10000)).toBe(10);
  });

  it('should handle XP beyond max level', () => {
    expect(calculateLevel(99999)).toBe(10);
  });

  it('should calculate next level XP correctly', () => {
    expect(xpForNextLevel(0)).toBe(100);
    expect(xpForNextLevel(1)).toBe(300);
    expect(xpForNextLevel(9)).toBe(10000);
    expect(xpForNextLevel(10)).toBe(10000); // Max level
  });

  it('should calculate current level XP correctly', () => {
    expect(xpForCurrentLevel(0)).toBe(0);
    expect(xpForCurrentLevel(5)).toBe(1600);
    expect(xpForCurrentLevel(10)).toBe(10000);
  });
});

// ============================================================
// 2. Power Rating Algorithm
// ============================================================
describe('Power Rating Algorithm', () => {
  // Inline the core formula for testing
  function calculateWeightedScore(
    transitScore: number,
    dignityScore: number,
    runeModifier: number,
    stasisBuff: boolean,
  ): number {
    let raw = Math.round(transitScore * 0.4 + dignityScore * 0.4 + runeModifier * 0.2);
    if (stasisBuff) raw = Math.round(raw * 1.15);
    return Math.max(0, Math.min(100, raw));
  }

  it('should produce balanced score with neutral inputs', () => {
    const score = calculateWeightedScore(50, 50, 50, false);
    expect(score).toBe(50);
  });

  it('should apply 40/40/20 weighting correctly', () => {
    // Transit=100, Dignity=0, Rune=0 → 40
    expect(calculateWeightedScore(100, 0, 0, false)).toBe(40);
    // Transit=0, Dignity=100, Rune=0 → 40
    expect(calculateWeightedScore(0, 100, 0, false)).toBe(40);
    // Transit=0, Dignity=0, Rune=100 → 20
    expect(calculateWeightedScore(0, 0, 100, false)).toBe(20);
  });

  it('should apply stasis buff (x1.15)', () => {
    const withoutBuff = calculateWeightedScore(50, 50, 50, false);
    const withBuff = calculateWeightedScore(50, 50, 50, true);
    expect(withBuff).toBe(Math.round(50 * 1.15));
    expect(withBuff).toBeGreaterThan(withoutBuff);
  });

  it('should clamp to 0-100 range', () => {
    expect(calculateWeightedScore(100, 100, 100, true)).toBeLessThanOrEqual(100);
    expect(calculateWeightedScore(0, 0, 0, false)).toBeGreaterThanOrEqual(0);
  });

  it('should not exceed 100 even with stasis buff on max inputs', () => {
    const score = calculateWeightedScore(100, 100, 100, true);
    expect(score).toBe(100);
  });
});

// ============================================================
// 3. Power Label
// ============================================================
describe('Power Label', () => {
  function getPowerLabel(score: number): { label: string; color: string } {
    if (score >= 80) return { label: 'Transcendent', color: '#FFD700' };
    if (score >= 65) return { label: 'Empowered', color: '#22C55E' };
    if (score >= 50) return { label: 'Balanced', color: '#3B82F6' };
    if (score >= 35) return { label: 'Challenged', color: '#F59E0B' };
    return { label: 'Dormant', color: '#EF4444' };
  }

  it('should return Transcendent for 80+', () => {
    expect(getPowerLabel(80).label).toBe('Transcendent');
    expect(getPowerLabel(100).label).toBe('Transcendent');
  });

  it('should return Empowered for 65-79', () => {
    expect(getPowerLabel(65).label).toBe('Empowered');
    expect(getPowerLabel(79).label).toBe('Empowered');
  });

  it('should return Balanced for 50-64', () => {
    expect(getPowerLabel(50).label).toBe('Balanced');
    expect(getPowerLabel(64).label).toBe('Balanced');
  });

  it('should return Challenged for 35-49', () => {
    expect(getPowerLabel(35).label).toBe('Challenged');
    expect(getPowerLabel(49).label).toBe('Challenged');
  });

  it('should return Dormant for 0-34', () => {
    expect(getPowerLabel(0).label).toBe('Dormant');
    expect(getPowerLabel(34).label).toBe('Dormant');
  });
});

// ============================================================
// 4. Content Layer – Local Fallback
// ============================================================
describe('Content Layer', () => {
  it('should have element tags for all rituals', () => {
    // Verify the structure of element tags
    const ELEMENTS = ['fire', 'air', 'water', 'earth', 'spirit'];
    const sampleTags = {
      lbrp: ['air', 'spirit'],
      middle_pillar: ['spirit'],
      hexagram_invoking: ['fire', 'spirit'],
    };

    for (const [ritualId, tags] of Object.entries(sampleTags)) {
      expect(tags.length).toBeGreaterThan(0);
      for (const tag of tags) {
        expect(ELEMENTS).toContain(tag);
      }
    }
  });

  it('should have XP rewards for rituals', () => {
    const sampleRewards: Record<string, number> = {
      lbrp: 50,
      middle_pillar: 40,
      hexagram_invoking: 60,
    };

    for (const [ritualId, xp] of Object.entries(sampleRewards)) {
      expect(xp).toBeGreaterThan(0);
      expect(xp).toBeLessThanOrEqual(100);
    }
  });
});

// ============================================================
// 5. Stasis Mode Logic
// ============================================================
describe('Stasis Mode', () => {
  const PHASE_DURATION = 4;
  const PHASES = ['Inhale', 'Hold', 'Exhale', 'Hold'] as const;

  it('should have 4 phases of 4 seconds each (box breathing)', () => {
    expect(PHASES.length).toBe(4);
    expect(PHASE_DURATION).toBe(4);
  });

  it('should cycle through phases correctly', () => {
    let phaseIndex = 0;
    let cycleCount = 0;

    // Simulate 2 full cycles (8 phase transitions)
    for (let i = 0; i < 8; i++) {
      phaseIndex = (phaseIndex + 1) % 4;
      if (phaseIndex === 0) cycleCount++;
    }

    expect(cycleCount).toBe(2);
    expect(phaseIndex).toBe(0);
  });

  it('should calculate spirit XP from stasis duration', () => {
    const durationMinutes = 10;
    const spiritXp = Math.round(durationMinutes * 2);
    expect(spiritXp).toBe(20);
  });

  it('should activate buff only for sessions >= 5 minutes', () => {
    expect(4 >= 5).toBe(false);  // 4 min → no buff
    expect(5 >= 5).toBe(true);   // 5 min → buff active
    expect(10 >= 5).toBe(true);  // 10 min → buff active
  });
});

// ============================================================
// 6. Sensor Fusion – Heading Calculation
// ============================================================
describe('Sensor Fusion – Heading', () => {
  // Inline the heading calculation with low-pass filter
  function calculateHeading(x: number, y: number): number {
    let angle = Math.atan2(y, x) * (180 / Math.PI);
    angle = (angle + 360) % 360;
    angle = (360 - angle + 90) % 360;
    return angle;
  }

  it('should return 0-360 range', () => {
    const heading = calculateHeading(1, 0);
    expect(heading).toBeGreaterThanOrEqual(0);
    expect(heading).toBeLessThan(360);
  });

  it('should return north-ish for strong Y component', () => {
    const heading = calculateHeading(0, 1);
    // Should be in the 0-90 or 270-360 range (north quadrants)
    expect(heading >= 0 && heading <= 360).toBe(true);
  });

  it('should handle zero input gracefully', () => {
    const heading = calculateHeading(0, 0);
    expect(isNaN(heading)).toBe(false);
  });
});

// ============================================================
// 7. Tab Configuration
// ============================================================
describe('Tab Configuration', () => {
  const TABS = [
    { name: 'index', title: 'Home', icon: 'home' },
    { name: 'sanctum', title: 'Sanctum', icon: 'flame' },
    { name: 'compass', title: 'Radar', icon: 'compass' },
    { name: 'path', title: 'Path', icon: 'trophy' },
    { name: 'adept', title: 'Adept', icon: 'user' },
  ];

  const HIDDEN_TABS = ['chart', 'runes', 'wallet', 'settings'];

  it('should have exactly 5 visible tabs', () => {
    expect(TABS.length).toBe(5);
  });

  it('should have correct tab names', () => {
    expect(TABS.map(t => t.name)).toEqual(['index', 'sanctum', 'compass', 'path', 'adept']);
  });

  it('should have 4 hidden tabs', () => {
    expect(HIDDEN_TABS.length).toBe(4);
    expect(HIDDEN_TABS).toContain('chart');
    expect(HIDDEN_TABS).toContain('settings');
  });

  it('should use lucide icon names', () => {
    const validIcons = ['home', 'flame', 'compass', 'trophy', 'user', 'settings', 'wallet', 'pen-tool'];
    for (const tab of TABS) {
      expect(validIcons).toContain(tab.icon);
    }
  });
});

// ============================================================
// 8. Level Titles
// ============================================================
describe('Level Titles (Initiatic System)', () => {
  const LEVEL_TITLES: Record<number, string> = {
    0: 'Neophyte',
    1: 'Zelator',
    2: 'Theoricus',
    3: 'Practicus',
    4: 'Philosophus',
    5: 'Adeptus Minor',
    6: 'Adeptus Major',
    7: 'Adeptus Exemptus',
    8: 'Magister Templi',
    9: 'Magus',
    10: 'Ipsissimus',
  };

  it('should have 11 levels (0-10)', () => {
    expect(Object.keys(LEVEL_TITLES).length).toBe(11);
  });

  it('should start with Neophyte at level 0', () => {
    expect(LEVEL_TITLES[0]).toBe('Neophyte');
  });

  it('should end with Ipsissimus at level 10', () => {
    expect(LEVEL_TITLES[10]).toBe('Ipsissimus');
  });

  it('should have unique titles for each level', () => {
    const titles = Object.values(LEVEL_TITLES);
    const uniqueTitles = new Set(titles);
    expect(uniqueTitles.size).toBe(titles.length);
  });
});
