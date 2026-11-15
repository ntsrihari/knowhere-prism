import { ErrorCodes, PrismValidationError, prismError, type PrismError } from './errors.js';
import {
  Problems,
  checkObject,
  constString,
  enumOf,
  intRange,
  lengthString,
  patternString,
  prune,
  ptr,
  type FieldCheck,
  type FieldSet,
} from './check.js';
import { JsonParseError, isJsonObject, parseStrictJson, utf8Length, type JsonValue } from './json.js';
import { modeFor, parseVersion, versionString, type Support, type ValidationMode } from './version.js';

export const THEME_SCHEMA = 'knowhere.theme';
/** Newest knowhere.theme version Prism fully knows. */
export const THEME_SUPPORT: Support = { major: 0, minor: 1 };
export const THEME_MAX_BYTES = 4 * 1024;

/** Bundled font allowlist (knowhere-nexus DefaultFonts, open question Q-06). */
export const BUNDLED_FONTS = ['inter', 'roboto', 'roboto-flex', 'jetbrains-mono'] as const;
export type FontKey = (typeof BUNDLED_FONTS)[number];

export type ColorSchemeName = 'light' | 'dark';
export type Density = 'comfortable' | 'compact';

export interface Wallpaper {
  ref: string;
}

/** A validated knowhere.theme 0.1 document (unknown newer-minor fields removed). */
export interface Theme {
  schema: typeof THEME_SCHEMA;
  schemaVersion: string;
  name?: string;
  seedColor: string;
  colorScheme: ColorSchemeName;
  cornerRadius: number;
  font: string;
  density: Density;
  wallpaper?: Wallpaper | null;
  extensions?: Record<string, Record<string, unknown>>;
}

export interface ValidateOptions {
  /** Bundled font keys; defaults to BUNDLED_FONTS. */
  fonts?: readonly string[];
  /** Built-in wallpaper keys (without "builtin:"); defaults to none, as in Nexus M1. */
  wallpapers?: readonly string[];
}

export type ValidationResult<T> =
  | { ok: true; value: T; mode: ValidationMode }
  | { ok: false; error: PrismError };

export const THEME_FIELDS: FieldSet = {
  fields: {
    schema: null,
    schemaVersion: null,
    name: null,
    seedColor: null,
    colorScheme: null,
    cornerRadius: null,
    font: null,
    density: null,
    wallpaper: { fields: { ref: null } },
    extensions: null,
  },
};

export const THEME_REQUIRED = ['schema', 'schemaVersion', 'seedColor', 'colorScheme', 'cornerRadius', 'font', 'density'] as const;

const wallpaperCheck: FieldCheck = (v, path, p) => {
  if (v === null) return;
  if (!isJsonObject(v)) {
    p.add(path, 'must be null or an object');
    return;
  }
  checkObject(v, path, p, { ref: patternString(/^builtin:[a-z0-9][a-z0-9-]{0,39}$/, 'a "builtin:<key>" reference') }, ['ref']);
};

const extensionsCheck: FieldCheck = (v, path, p) => {
  if (!isJsonObject(v)) {
    p.add(path, 'must be an object');
    return;
  }
  const keys = Object.keys(v);
  if (keys.length > 16) p.add(path, 'must have at most 16 namespaces');
  for (const k of keys.sort()) {
    if (!/^[a-z][a-z0-9-]{0,31}$/.test(k)) p.add(ptr(path, k), 'namespace must match ^[a-z][a-z0-9-]{0,31}$');
    if (!isJsonObject(v[k] as JsonValue)) p.add(ptr(path, k), 'must be an object');
  }
};

const THEME_CHECKS: Record<string, FieldCheck> = {
  schema: constString(THEME_SCHEMA),
  schemaVersion: patternString(/^0\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$/, 'a 0.MINOR.PATCH version'),
  name: lengthString(1, 40),
  seedColor: patternString(/^#[0-9A-Fa-f]{6}$/, 'a #RRGGBB colour'),
  colorScheme: enumOf(['light', 'dark']),
  cornerRadius: intRange(0, 32),
  font: patternString(/^[a-z0-9][a-z0-9-]{0,39}$/, 'a font key'),
  density: enumOf(['comfortable', 'compact']),
  wallpaper: wallpaperCheck,
  extensions: extensionsCheck,
};

/** Structural check equivalent to contracts/knowhere.theme-0.1.schema.json. */
export const checkThemeStructure: FieldCheck = (v, path, p) => {
  checkObject(v, path, p, THEME_CHECKS, THEME_REQUIRED);
};

/** Semantic (invalid_value) checks for one structurally valid theme. */
export function checkThemeValues(t: Theme, path: string, p: Problems, fonts: readonly string[], wallpapers: readonly string[]): void {
  if (!fonts.includes(t.font)) p.add(ptr(path, 'font'), `"${t.font}" is not a bundled font`);
  if (t.wallpaper) {
    const key = t.wallpaper.ref.replace(/^builtin:/, '');
    if (!wallpapers.includes(key)) p.add(ptr(ptr(path, 'wallpaper'), 'ref'), `"${t.wallpaper.ref}" is not a built-in wallpaper`);
  }
}

/** Decodes raw input: string / bytes are size-checked and strictly parsed; other values are taken as parsed JSON. */
export function decodeInput(input: unknown, maxBytes: number, what: string): { ok: true; value: JsonValue } | { ok: false; error: PrismError } {
  let text: string;
  if (typeof input === 'string') text = input;
  else if (input instanceof Uint8Array) {
    if (input.length > maxBytes) return { ok: false, error: prismError(ErrorCodes.tooLarge, `${what} exceeds ${maxBytes} bytes`) };
    try {
      text = new TextDecoder('utf-8', { fatal: true }).decode(input);
    } catch {
      return { ok: false, error: prismError(ErrorCodes.invalidDocument, 'document is not valid UTF-8') };
    }
  } else {
    let s: string | undefined;
    try {
      s = JSON.stringify(input);
    } catch {
      s = undefined;
    }
    if (s === undefined) return { ok: false, error: prismError(ErrorCodes.invalidDocument, 'document is not JSON-serialisable') };
    text = s;
  }
  if (utf8Length(text) > maxBytes) return { ok: false, error: prismError(ErrorCodes.tooLarge, `${what} exceeds ${maxBytes} bytes`) };
  try {
    return { ok: true, value: parseStrictJson(text) };
  } catch (e) {
    return { ok: false, error: prismError(ErrorCodes.invalidDocument, e instanceof JsonParseError ? e.message : String(e)) };
  }
}

/**
 * Schema name and version gate (R-17). Returns the mode, or an error with the
 * given path prefix (empty for a top-level document).
 */
export function gate(
  v: JsonValue,
  schemaName: string,
  sup: Support,
  path: string,
): { ok: true; mode: ValidationMode } | { ok: false; error: PrismError } {
  if (!isJsonObject(v)) return { ok: false, error: prismError(ErrorCodes.invalidDocument, `${path || '/'}: document must be an object`) };
  if (v['schema'] !== schemaName) return { ok: false, error: prismError(ErrorCodes.wrongSchema, `${ptr(path, 'schema')}: schema must be "${schemaName}"`) };
  const ver = parseVersion(v['schemaVersion']);
  if (!ver) return { ok: false, error: prismError(ErrorCodes.unsupportedVersion, `${ptr(path, 'schemaVersion')}: schemaVersion must be MAJOR.MINOR.PATCH`) };
  const mode = modeFor(sup, ver);
  if (!mode)
    return {
      ok: false,
      error: prismError(
        ErrorCodes.unsupportedVersion,
        `${ptr(path, 'schemaVersion')}: schemaVersion ${versionString(ver)} is not supported (supported major version ${sup.major})`,
      ),
    };
  return { ok: true, mode };
}

/**
 * Validates a knowhere.theme document. Pass the raw text or bytes so size,
 * duplicate keys and trailing data are checked; a parsed value is also accepted.
 */
export function validateTheme(input: unknown, opts: ValidateOptions = {}): ValidationResult<Theme> {
  const dec = decodeInput(input, THEME_MAX_BYTES, 'theme');
  if (!dec.ok) return dec;
  const g = gate(dec.value, THEME_SCHEMA, THEME_SUPPORT, '');
  if (!g.ok) return g;
  const value = g.mode === 'pruned' ? prune(dec.value, THEME_FIELDS) : dec.value;
  const p = new Problems();
  checkThemeStructure(value, '', p);
  if (!p.empty) return { ok: false, error: prismError(ErrorCodes.schemaViolation, ...p.list) };
  const theme = value as unknown as Theme;
  checkThemeValues(theme, '', p, opts.fonts ?? BUNDLED_FONTS, opts.wallpapers ?? []);
  if (!p.empty) return { ok: false, error: prismError(ErrorCodes.invalidValue, ...p.list) };
  return { ok: true, value: theme, mode: g.mode };
}

/** Like validateTheme but throws PrismValidationError. */
export function parseTheme(input: unknown, opts: ValidateOptions = {}): Theme {
  const r = validateTheme(input, opts);
  if (!r.ok) throw new PrismValidationError(r.error);
  return r.value;
}

