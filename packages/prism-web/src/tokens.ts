import { type DynamicScheme, Hct, SchemeTonalSpot, argbFromHex } from '@material/material-color-utilities';
import type { ColorSchemeName, Density, Theme } from './theme.js';

/**
 * Material 3 colour roles emitted by Prism, in canonical order (TOKENS.md).
 * Each name is also the DynamicScheme getter in material-color-utilities.
 */
export const COLOR_ROLES = [
  'primary',
  'onPrimary',
  'primaryContainer',
  'onPrimaryContainer',
  'inversePrimary',
  'primaryFixed',
  'primaryFixedDim',
  'onPrimaryFixed',
  'onPrimaryFixedVariant',
  'secondary',
  'onSecondary',
  'secondaryContainer',
  'onSecondaryContainer',
  'secondaryFixed',
  'secondaryFixedDim',
  'onSecondaryFixed',
  'onSecondaryFixedVariant',
  'tertiary',
  'onTertiary',
  'tertiaryContainer',
  'onTertiaryContainer',
  'tertiaryFixed',
  'tertiaryFixedDim',
  'onTertiaryFixed',
  'onTertiaryFixedVariant',
  'error',
  'onError',
  'errorContainer',
  'onErrorContainer',
  'background',
  'onBackground',
  'surface',
  'onSurface',
  'surfaceVariant',
  'onSurfaceVariant',
  'surfaceDim',
  'surfaceBright',
  'surfaceContainerLowest',
  'surfaceContainerLow',
  'surfaceContainer',
  'surfaceContainerHigh',
  'surfaceContainerHighest',
  'surfaceTint',
  'inverseSurface',
  'inverseOnSurface',
  'outline',
  'outlineVariant',
  'scrim',
  'shadow',
] as const;

export type ColorRole = (typeof COLOR_ROLES)[number];
export type ColorScheme = Record<ColorRole, string>;

/** Generation parameters; fixed for token parity across platforms. */
export const SCHEME_VARIANT = 'tonalSpot';
export const SCHEME_SPEC_VERSION = '2021';
export const SCHEME_CONTRAST_LEVEL = 0;

/** "#rrggbb" (lowercase), or "#rrggbbaa" when not opaque. */
export function hexFromArgb(argb: number): string {
  const rgb = (argb >>> 0) & 0xffffff;
  const alpha = (argb >>> 24) & 0xff;
  const hex = `#${rgb.toString(16).padStart(6, '0')}`;
  return alpha === 0xff ? hex : `${hex}${alpha.toString(16).padStart(2, '0')}`;
}

/** Material 3 SchemeTonalSpot (spec 2021, contrast 0) colours for a seed. */
export function schemeFromSeed(seedColor: string, mode: ColorSchemeName): ColorScheme {
  // material-color-utilities 0.3.0 implements the 2021 spec only (DECISIONS.md D-03).
  const scheme: DynamicScheme = new SchemeTonalSpot(Hct.fromInt(argbFromHex(seedColor)), mode === 'dark', SCHEME_CONTRAST_LEVEL);
  const out = {} as ColorScheme;
  for (const role of COLOR_ROLES) out[role] = hexFromArgb(scheme[role]);
  return out;
}

/** Colour roles for a theme; mode defaults to the theme's colorScheme. */
export function generateScheme(theme: Pick<Theme, 'seedColor' | 'colorScheme'>, mode: ColorSchemeName = theme.colorScheme): ColorScheme {
  return schemeFromSeed(theme.seedColor, mode);
}

export const SHAPE_ROLES = ['none', 'extraSmall', 'small', 'medium', 'large', 'extraLarge', 'full'] as const;
export type ShapeRole = (typeof SHAPE_ROLES)[number];
export type ShapeScale = Record<ShapeRole, number>;
export const SHAPE_FULL = 9999;

/** round(k * r / 3) with halves rounded up, in integers (identical on every platform). */
const third = (k: number, r: number): number => Math.floor((2 * k * r + 3) / 6);

/** Corner radius scale in px; cornerRadius is the "medium" step (M3 default 12 gives 0/4/8/12/16/28). */
export function shapeScale(cornerRadius: number): ShapeScale {
  return {
    none: 0,
    extraSmall: third(1, cornerRadius),
    small: third(2, cornerRadius),
    medium: cornerRadius,
    large: third(4, cornerRadius),
    extraLarge: third(7, cornerRadius),
    full: SHAPE_FULL,
  };
}

export const SPACING_ROLES = ['none', 'xs', 'sm', 'md', 'lg', 'xl', 'xxl'] as const;
export type SpacingRole = (typeof SPACING_ROLES)[number];

export interface DensityTokens {
  density: Density;
  /** Material density scale (0 comfortable, -2 compact). */
  scale: number;
  /** Minimum interactive control height, px. */
  controlHeight: number;
  spacing: Record<SpacingRole, number>;
}

export function densityTokens(density: Density): DensityTokens {
  return density === 'compact'
    ? { density, scale: -2, controlHeight: 32, spacing: { none: 0, xs: 2, sm: 4, md: 8, lg: 12, xl: 16, xxl: 24 } }
    : { density, scale: 0, controlHeight: 40, spacing: { none: 0, xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } };
}

const SANS_FALLBACK = ['system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'];
const MONO_FALLBACK = ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'Liberation Mono', 'monospace'];

/** Font family stacks per bundled font key (first entry is the bundled family). */
export const FONT_STACKS: Readonly<Record<string, readonly string[]>> = {
  inter: ['Inter', ...SANS_FALLBACK],
  roboto: ['Roboto', ...SANS_FALLBACK.filter((f) => f !== 'Roboto')],
  'roboto-flex': ['Roboto Flex', ...SANS_FALLBACK],
  'jetbrains-mono': ['JetBrains Mono', ...MONO_FALLBACK],
};
export const MONO_STACK: readonly string[] = ['JetBrains Mono', ...MONO_FALLBACK];

export interface TypographyTokens {
  font: string;
  fontFamily: string[];
  monoFontFamily: string[];
}

export function typographyTokens(font: string): TypographyTokens {
  const stack = FONT_STACKS[font] ?? (['system-ui', ...SANS_FALLBACK.slice(1)] as readonly string[]);
  return { font, fontFamily: [...stack], monoFontFamily: [...MONO_STACK] };
}

/** Everything Prism derives from a theme for one light/dark mode. */
export interface PrismTokens {
  colorScheme: ColorSchemeName;
  color: ColorScheme;
  shape: ShapeScale;
  density: DensityTokens;
  typography: TypographyTokens;
}

export function generateTokens(theme: Theme, mode: ColorSchemeName = theme.colorScheme): PrismTokens {
  return {
    colorScheme: mode,
    color: generateScheme(theme, mode),
    shape: shapeScale(theme.cornerRadius),
    density: densityTokens(theme.density),
    typography: typographyTokens(theme.font),
  };
}
