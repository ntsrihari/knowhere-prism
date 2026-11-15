import { describe, expect, it } from 'vitest';
import { ErrorCodes, validateTheme, validateThemePack } from '../src/index.js';
import { fixtures } from './helpers.js';

const codes = new Set<string>(Object.values(ErrorCodes));

describe('knowhere.theme fixtures', () => {
  for (const f of fixtures('theme', 'valid')) {
    it(`accepts ${f.name}`, () => {
      const r = validateTheme(f.bytes);
      expect(r.ok, JSON.stringify(r)).toBe(true);
      if (r.ok) expect(r.mode).toBe(f.name.startsWith('newer-minor') ? 'pruned' : 'strict');
    });
  }
  for (const f of fixtures('theme', 'invalid')) {
    it(`rejects ${f.name} with ${f.code}`, () => {
      expect(codes.has(f.code ?? '')).toBe(true);
      const r = validateTheme(f.bytes);
      expect(r.ok).toBe(false);
      if (!r.ok) {
        expect(r.error.code).toBe(f.code);
        expect(r.error.problems.length).toBeGreaterThan(0);
      }
    });
  }
});

describe('knowhere.themepack fixtures', () => {
  for (const f of fixtures('themepack', 'valid')) {
    it(`accepts ${f.name}`, () => {
      const r = validateThemePack(f.bytes);
      expect(r.ok, JSON.stringify(r)).toBe(true);
    });
  }
  for (const f of fixtures('themepack', 'invalid')) {
    it(`rejects ${f.name} with ${f.code}`, () => {
      expect(codes.has(f.code ?? '')).toBe(true);
      const r = validateThemePack(f.bytes);
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.error.code, JSON.stringify(r.error)).toBe(f.code);
    });
  }
});
