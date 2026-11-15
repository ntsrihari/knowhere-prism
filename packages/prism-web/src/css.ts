import type { ColorSchemeName, Theme } from './theme.js';
import { COLOR_ROLES, SHAPE_ROLES, SPACING_ROLES, generateTokens, type PrismTokens } from './tokens.js';

export const CSS_PREFIX = '--prism-';

/** camelCase -> kebab-case ("surfaceContainerLowest" -> "surface-container-lowest"). */
export function kebab(name: string): string {
  return name.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
}

const GENERIC_FAMILIES = new Set(['serif', 'sans-serif', 'monospace', 'cursive', 'fantasy', 'system-ui', 'ui-serif', 'ui-sans-serif', 'ui-monospace', 'ui-rounded', '-apple-system']);

/** CSS font-family value; names other than generic keywords are double-quoted. */
export function cssFontFamily(stack: readonly string[]): string {
  return stack.map((f) => (GENERIC_FAMILIES.has(f) ? f : `"${f.replace(/["\\]/g, '')}"`)).join(', ');
}

/** Custom properties for a token set, in canonical order (TOKENS.md). */
export function toCssVariables(tokens: PrismTokens): Record<string, string> {
  const vars: Record<string, string> = {};
  for (const role of COLOR_ROLES) vars[`${CSS_PREFIX}${kebab(role)}`] = tokens.color[role];
  for (const s of SHAPE_ROLES) vars[`${CSS_PREFIX}shape-corner-${kebab(s)}`] = `${tokens.shape[s]}px`;
  for (const s of SPACING_ROLES) vars[`${CSS_PREFIX}space-${s}`] = `${tokens.density.spacing[s]}px`;
  vars[`${CSS_PREFIX}control-height`] = `${tokens.density.controlHeight}px`;
  vars[`${CSS_PREFIX}density-scale`] = String(tokens.density.scale);
  vars[`${CSS_PREFIX}font-family`] = cssFontFamily(tokens.typography.fontFamily);
  vars[`${CSS_PREFIX}font-family-mono`] = cssFontFamily(tokens.typography.monoFontFamily);
  return vars;
}

/** A stylesheet block for a selector (default ":root"), including color-scheme. */
export function toCss(tokens: PrismTokens, selector = ':root'): string {
  const lines = Object.entries(toCssVariables(tokens)).map(([k, v]) => `  ${k}: ${v};`);
  return `${selector} {\n  color-scheme: ${tokens.colorScheme};\n${lines.join('\n')}\n}\n`;
}

/** The subset of HTMLElement used by applyTheme (CSSOM only: allowed under a strict CSP). */
export interface StyleTarget {
  style: { setProperty(name: string, value: string): void };
  setAttribute?(name: string, value: string): void;
}

/**
 * Sets every Prism custom property on element.style (and color-scheme) and
 * data-prism-scheme. Uses CSSOM, so it works with CSP style-src 'self'.
 */
export function applyTheme(element: StyleTarget, theme: Theme, mode: ColorSchemeName = theme.colorScheme): PrismTokens {
  const tokens = generateTokens(theme, mode);
  element.style.setProperty('color-scheme', tokens.colorScheme);
  for (const [k, v] of Object.entries(toCssVariables(tokens))) element.style.setProperty(k, v);
  element.setAttribute?.('data-prism-scheme', tokens.colorScheme);
  return tokens;
}
