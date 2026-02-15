import { describe, it, expect } from 'vitest';
import { ELDER_FUTHARK, findRunesByKeyword, generateBindruneSVG } from '../lib/runes/futhark';

describe('Elder Futhark Dictionary', () => {
  it('should have 24 runes', () => {
    expect(ELDER_FUTHARK).toHaveLength(24);
  });

  it('each rune should have required properties', () => {
    for (const rune of ELDER_FUTHARK) {
      expect(rune.name).toBeTruthy();
      expect(rune.symbol).toBeTruthy();
      expect(rune.meaning).toBeTruthy();
      expect(rune.keywords.length).toBeGreaterThan(0);
      expect(Array.isArray(rune.branches)).toBe(true);
    }
  });

  it('should find runes by keyword "wealth"', () => {
    const runes = findRunesByKeyword('wealth');
    expect(runes.length).toBeGreaterThan(0);
    expect(runes[0].name).toBe('Fehu');
  });

  it('should find runes by keyword "protection"', () => {
    const runes = findRunesByKeyword('protection');
    expect(runes.length).toBeGreaterThan(0);
    const names = runes.map(r => r.name);
    expect(names).toContain('Thurisaz');
  });

  it('should return empty array for unknown keyword', () => {
    const runes = findRunesByKeyword('xyznonexistent');
    expect(runes).toHaveLength(0);
  });
});

describe('Bindrune SVG Generator', () => {
  it('should generate valid SVG for selected runes', () => {
    const fehu = ELDER_FUTHARK.find(r => r.name === 'Fehu')!;
    const tiwaz = ELDER_FUTHARK.find(r => r.name === 'Tiwaz')!;

    const svg = generateBindruneSVG([fehu, tiwaz]);
    expect(svg).toContain('<svg');
    expect(svg).toContain('</svg>');
    expect(svg).toContain('<line'); // Should have stave and branches
    expect(svg).toContain('stroke="#D4AF37"'); // Gold color
  });

  it('should generate SVG with central stave only for Isa (no branches)', () => {
    const isa = ELDER_FUTHARK.find(r => r.name === 'Isa')!;
    const svg = generateBindruneSVG([isa]);
    expect(svg).toContain('<svg');
    // Should have at least the central stave line
    expect(svg).toContain('<line');
  });

  it('should handle empty rune selection', () => {
    const svg = generateBindruneSVG([]);
    expect(svg).toContain('<svg');
  });
});
