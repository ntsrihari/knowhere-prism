// Golden outputs shared with the Kotlin library (testdata/golden/). Regenerate
// with `npm run golden` and review the diff.
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  BUNDLED_FONTS,
  COLOR_ROLES,
  SCHEME_CONTRAST_LEVEL,
  SCHEME_SPEC_VERSION,
  SCHEME_VARIANT,
  densityTokens,
  generateTokens,
  nexusCompatTokens,
  parseTheme,
  schemeFromSeed,
  shapeScale,
  toCssVariables,
  typographyTokens,
} from '../src/index.js';
import { CONTRACTS, GOLDEN } from './helpers.js';

export const GOLDEN_SEEDS = ['#6750A4', '#00658F', '#B3261E', '#386A20', '#FFDE3F', '#7D5260', '#0B57D0', '#F4511E', '#000000', '#FFFFFF', '#808080', '#00FF00'];

function goldenFiles(): Record<string, unknown> {
  const theme = parseTheme(readFileSync(join(CONTRACTS, 'testdata/theme/valid/default.json')));
  const light = generateTokens(theme, 'light');
  const dark = generateTokens(theme, 'dark');
  return {
    'default-theme.tokens.json': { theme, light, dark },
    'default-theme.css-variables.json': { light: toCssVariables(light), dark: toCssVariables(dark) },
    'seeds.colors.json': {
      variant: SCHEME_VARIANT,
      specVersion: SCHEME_SPEC_VERSION,
      contrastLevel: SCHEME_CONTRAST_LEVEL,
      roles: COLOR_ROLES,
      cases: GOLDEN_SEEDS.map((seed) => ({ seed, light: schemeFromSeed(seed, 'light'), dark: schemeFromSeed(seed, 'dark') })),
    },
    'scales.json': {
      shape: Object.fromEntries(Array.from({ length: 33 }, (_, r) => [String(r), shapeScale(r)])),
      nexus: Object.fromEntries(Array.from({ length: 33 }, (_, r) => [String(r), nexusCompatTokens(r, r % 2 ? 'compact' : 'comfortable')])),
      density: { comfortable: densityTokens('comfortable'), compact: densityTokens('compact') },
      typography: Object.fromEntries(BUNDLED_FONTS.map((f) => [f, typographyTokens(f)])),
    },
  };
}

describe('golden outputs', () => {
  const files = goldenFiles();
  for (const [name, value] of Object.entries(files)) {
    it(name, () => {
      const path = join(GOLDEN, name);
      const text = `${JSON.stringify(value, null, 2)}\n`;
      if (process.env['UPDATE_GOLDEN'] === '1') writeFileSync(path, text);
      expect(readFileSync(path, 'utf8')).toBe(text);
    });
  }
  it('matches the known Material baseline for #6750A4', () => {
    const light = schemeFromSeed('#6750A4', 'light');
    expect(light.primary).toBe('#65558f');
    expect(light.surface).toBe('#fdf7ff');
    expect(schemeFromSeed('#6750A4', 'dark').primary).toBe('#cfbdfe');
  });
});
