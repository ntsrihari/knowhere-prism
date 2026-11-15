import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  PrismValidationError,
  THEMEPACK_MAX_BYTES,
  THEME_MAX_BYTES,
  parseTheme,
  parseThemePack,
  validateTheme,
  validateThemePack,
} from '../src/index.js';
import { CONTRACTS } from './helpers.js';

const defaultTheme = JSON.parse(readFileSync(join(CONTRACTS, 'testdata/theme/valid/default.json'), 'utf8')) as Record<string, unknown>;
const pack = (themes: unknown[], extra: Record<string, unknown> = {}) => ({
  schema: 'knowhere.themepack',
  schemaVersion: '0.1.0',
  id: 'big-pack',
  name: 'Big',
  version: '1.0.0',
  themes,
  ...extra,
});

describe('size caps', () => {
  it('accepts a theme of exactly 4 KB and rejects one byte more', () => {
    const base = JSON.stringify({ ...defaultTheme, extensions: { milano: { pad: '' } } });
    const pad = 'x'.repeat(THEME_MAX_BYTES - base.length);
    const exact = base.replace('"pad":""', `"pad":"${pad}"`);
    expect(new TextEncoder().encode(exact).length).toBe(THEME_MAX_BYTES);
    expect(validateTheme(exact).ok).toBe(true);
    const over = exact.replace('"pad":"', '"pad":"x');
    const r = validateTheme(over);
    expect(r.ok ? 'ok' : r.error.code).toBe('too_large');
    const rb = validateTheme(new TextEncoder().encode(over));
    expect(rb.ok ? 'ok' : rb.error.code).toBe('too_large');
  });
  it('counts UTF-8 bytes, not characters', () => {
    const s = JSON.stringify({ ...defaultTheme, extensions: { milano: { pad: 'é'.repeat(2100) } } });
    expect(s.length).toBeLessThan(THEME_MAX_BYTES);
    const r = validateTheme(s);
    expect(r.ok ? 'ok' : r.error.code).toBe('too_large');
  });
  it('rejects a pack over 256 KB', () => {
    const big = JSON.stringify(pack([defaultTheme], { pad: 'x'.repeat(THEMEPACK_MAX_BYTES) }));
    const r = validateThemePack(big);
    expect(r.ok ? 'ok' : r.error.code).toBe('too_large');
  });
  it('rejects a theme over 4 KB inside a pack', () => {
    const t = { ...defaultTheme, extensions: { milano: { pad: 'x'.repeat(THEME_MAX_BYTES) } } };
    const r = validateThemePack(JSON.stringify(pack([t])));
    expect(r.ok ? 'ok' : r.error.code).toBe('too_large');
  });
  it('accepts a pack with 64 themes and rejects 65', () => {
    const themes = (n: number) => Array.from({ length: n }, (_, i) => ({ ...defaultTheme, name: `Theme ${i}` }));
    expect(validateThemePack(JSON.stringify(pack(themes(64)))).ok).toBe(true);
    const r = validateThemePack(JSON.stringify(pack(themes(65))));
    expect(r.ok ? 'ok' : r.error.code).toBe('schema_violation');
  });
});

describe('versioning (R-17)', () => {
  it('validates an older or equal minor strictly', () => {
    const r = validateTheme({ ...defaultTheme, schemaVersion: '0.0.3', extra: 1 });
    expect(r.ok ? 'ok' : r.error.code).toBe('schema_violation');
    const ok = validateTheme({ ...defaultTheme, schemaVersion: '0.1.7' });
    expect(ok.ok && ok.mode).toBe('strict');
  });
  it('prunes unknown fields of a newer minor, exact case only', () => {
    const r = validateTheme({ ...defaultTheme, schemaVersion: '0.9.0', future: [1], wallpaper: null });
    expect(r.ok && r.mode).toBe('pruned');
    if (r.ok) expect(Object.keys(r.value)).not.toContain('future');
    // "SeedColor" is not "seedColor": it is pruned, and the missing field is reported.
    const t = { ...defaultTheme, schemaVersion: '0.2.0', SeedColor: '#000000' } as Record<string, unknown>;
    delete t['seedColor'];
    const bad = validateTheme(t);
    expect(bad.ok ? 'ok' : bad.error.code).toBe('schema_violation');
  });
  it('prunes nested wallpaper fields of a newer minor but still checks known ones', () => {
    const r = validateTheme({ ...defaultTheme, schemaVersion: '0.2.0', wallpaper: { ref: 'builtin:aurora', blur: 3 } }, { wallpapers: ['aurora'] });
    expect(r.ok).toBe(true);
    const bad = validateTheme({ ...defaultTheme, schemaVersion: '0.2.0', cornerRadius: 99 });
    expect(bad.ok ? 'ok' : bad.error.code).toBe('schema_violation');
  });
  it('rejects other majors and malformed versions', () => {
    for (const v of ['1.0.0', '2.1.0', '0.1', 'v0.1.0', '0.1.0-rc1', '00.1.0', 0.1]) {
      const r = validateTheme({ ...defaultTheme, schemaVersion: v });
      expect(r.ok ? 'ok' : r.error.code, String(v)).toBe('unsupported_schema_version');
    }
  });
  it('checks the schema name before the version', () => {
    const r = validateTheme({ ...defaultTheme, schema: 'Knowhere.theme', schemaVersion: '9.0.0' });
    expect(r.ok ? 'ok' : r.error.code).toBe('wrong_schema');
  });
});

describe('semantic checks', () => {
  it('honours custom font and wallpaper allowlists', () => {
    const t = { ...defaultTheme, font: 'atkinson', wallpaper: { ref: 'builtin:dunes' } };
    expect(validateTheme(t).ok).toBe(false);
    expect(validateTheme(t, { fonts: ['atkinson'], wallpapers: ['dunes'] }).ok).toBe(true);
  });
  it('lets pack wallpapers satisfy theme references', () => {
    const w = { key: 'dunes', name: 'Dunes', mediaType: 'image/png', width: 10, height: 10, sha256: 'b'.repeat(64) };
    const p = pack([{ ...defaultTheme, wallpaper: { ref: 'builtin:dunes' } }], { wallpapers: [w] });
    expect(validateThemePack(p).ok).toBe(true);
  });
  it('reports names case-insensitively duplicated', () => {
    const r = validateThemePack(pack([defaultTheme, { ...defaultTheme, name: 'KNOWHERE default' }]));
    expect(r.ok ? 'ok' : r.error.code).toBe('invalid_value');
  });
});

describe('throwing helpers', () => {
  it('parseTheme returns a typed theme or throws PrismValidationError', () => {
    expect(parseTheme(JSON.stringify(defaultTheme)).seedColor).toBe('#6750A4');
    expect(() => parseTheme('{}')).toThrow(PrismValidationError);
    try {
      parseThemePack('[]');
    } catch (e) {
      expect((e as PrismValidationError).code).toBe('invalid_document');
    }
  });
  it('rejects non-UTF-8 bytes', () => {
    const r = validateTheme(new Uint8Array([0x7b, 0xff, 0x7d]));
    expect(r.ok ? 'ok' : r.error.code).toBe('invalid_document');
  });
  it('caps the number of problems', () => {
    const t: Record<string, unknown> = { schema: 'knowhere.theme', schemaVersion: '0.1.0' };
    for (let i = 0; i < 40; i++) t[`f${i}`] = i;
    const r = validateTheme(t);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.problems.length).toBe(20);
  });
});
