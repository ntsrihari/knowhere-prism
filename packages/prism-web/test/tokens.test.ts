import { describe, expect, it } from 'vitest';
import { COLOR_ROLES, applyTheme, cssFontFamily, kebab, parseTheme, shapeScale, toCss, toCssVariables, generateTokens, hexFromArgb } from '../src/index.js';

const theme = parseTheme({
  schema: 'knowhere.theme',
  schemaVersion: '0.1.0',
  seedColor: '#00658F',
  colorScheme: 'light',
  cornerRadius: 12,
  font: 'roboto-flex',
  density: 'compact',
});

describe('tokens', () => {
  it('derives the M3 default shape scale from 12', () => {
    expect(shapeScale(12)).toEqual({ none: 0, extraSmall: 4, small: 8, medium: 12, large: 16, extraLarge: 28, full: 9999 });
    expect(shapeScale(0).extraLarge).toBe(0);
    expect(shapeScale(1)).toMatchObject({ extraSmall: 0, small: 1, large: 1, extraLarge: 2 });
  });
  it('emits every role as an opaque hex colour', () => {
    const t = generateTokens(theme);
    expect(Object.keys(t.color)).toEqual([...COLOR_ROLES]);
    for (const v of Object.values(t.color)) expect(v).toMatch(/^#[0-9a-f]{6}$/);
    expect(t.colorScheme).toBe('light');
    expect(generateTokens(theme, 'dark').color.surface).not.toBe(t.color.surface);
  });
  it('formats alpha only when not opaque', () => {
    expect(hexFromArgb(0xff123456)).toBe('#123456');
    expect(hexFromArgb(0x80123456)).toBe('#12345680');
  });
});

describe('css', () => {
  it('names variables --md-<role> and --prism-<role>', () => {
    expect(kebab('surfaceContainerLowest')).toBe('surface-container-lowest');
    const vars = toCssVariables(generateTokens(theme));
    expect(vars['--md-on-primary-fixed-variant']).toMatch(/^#/);
    expect(vars['--prism-on-primary-fixed-variant']).toBe(vars['--md-on-primary-fixed-variant']);
    expect(vars['--prism-shape-corner-extra-large']).toBe('28px');
    expect(vars['--prism-space-md']).toBe('8px');
    expect(vars['--prism-control-height']).toBe('32px');
    expect(vars['--radius-l']).toBe('18px');
    expect(vars['--space']).toBe('0.75rem');
    expect(vars['--prism-font-family']).toBe('"Roboto Flex", system-ui, -apple-system, "Segoe UI", "Roboto", "Helvetica Neue", "Arial", sans-serif');
  });
  it('quotes non-generic families', () => {
    expect(cssFontFamily(['JetBrains Mono', 'ui-monospace', 'monospace'])).toBe('"JetBrains Mono", ui-monospace, monospace');
  });
  it('renders a stylesheet block', () => {
    const css = toCss(generateTokens(theme, 'dark'), '.app');
    expect(css.startsWith('.app {\n  color-scheme: dark;\n')).toBe(true);
    expect(css).toContain('--md-primary: #');
  });
  it('applyTheme sets properties through the CSSOM', () => {
    const set = new Map<string, string>();
    const attrs = new Map<string, string>();
    const el = { style: { setProperty: (k: string, v: string) => void set.set(k, v) }, setAttribute: (k: string, v: string) => void attrs.set(k, v) };
    const tokens = applyTheme(el, theme, 'dark');
    expect(set.get('color-scheme')).toBe('dark');
    expect(set.get('--md-primary')).toBe(tokens.color.primary);
    expect(attrs.get('data-prism-scheme')).toBe('dark');
  });
});
