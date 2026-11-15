import { ErrorCodes, PrismValidationError, prismError } from './errors.js';
import {
  Problems,
  arrayOf,
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
import { isJsonObject, utf8Length, type JsonObject, type JsonValue } from './json.js';
import {
  BUNDLED_FONTS,
  THEME_FIELDS,
  THEME_MAX_BYTES,
  THEME_SCHEMA,
  THEME_SUPPORT,
  checkThemeStructure,
  checkThemeValues,
  decodeInput,
  gate,
  type Theme,
  type ValidateOptions,
  type ValidationResult,
} from './theme.js';
import type { Support } from './version.js';

export const THEMEPACK_SCHEMA = 'knowhere.themepack';
export const THEMEPACK_SUPPORT: Support = { major: 0, minor: 1 };
export const THEMEPACK_MAX_BYTES = 256 * 1024;

export type WallpaperMediaType = 'image/webp' | 'image/png' | 'image/jpeg' | 'image/avif';

export interface WallpaperMeta {
  key: string;
  name: string;
  mediaType: WallpaperMediaType;
  width: number;
  height: number;
  sha256: string;
  dominantColor?: string;
}

/** A validated knowhere.themepack 0.1 document. */
export interface ThemePack {
  schema: typeof THEMEPACK_SCHEMA;
  schemaVersion: string;
  id: string;
  name: string;
  version: string;
  themes: Theme[];
  wallpapers?: WallpaperMeta[];
}

const WALLPAPER_FIELDS: FieldSet = {
  fields: { key: null, name: null, mediaType: null, width: null, height: null, sha256: null, dominantColor: null },
};

/** Pack-level fields; themes[] is pruned per theme by each theme's own version. */
export const THEMEPACK_FIELDS: FieldSet = {
  fields: { schema: null, schemaVersion: null, id: null, name: null, version: null, themes: null, wallpapers: { fields: {}, items: WALLPAPER_FIELDS } },
};

const wallpaperMetaCheck: FieldCheck = (v, path, p) => {
  checkObject(
    v,
    path,
    p,
    {
      key: patternString(/^[a-z0-9][a-z0-9-]{0,39}$/, 'a wallpaper key'),
      name: lengthString(1, 40),
      mediaType: enumOf(['image/webp', 'image/png', 'image/jpeg', 'image/avif']),
      width: intRange(1, 16384),
      height: intRange(1, 16384),
      sha256: patternString(/^[0-9a-f]{64}$/, '64 lowercase hex digits'),
      dominantColor: patternString(/^#[0-9A-Fa-f]{6}$/, 'a #RRGGBB colour'),
    },
    ['key', 'name', 'mediaType', 'width', 'height', 'sha256'],
  );
};

const PACK_CHECKS: Record<string, FieldCheck> = {
  schema: constString(THEMEPACK_SCHEMA),
  schemaVersion: patternString(/^0\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$/, 'a 0.MINOR.PATCH version'),
  id: patternString(/^[a-z][a-z0-9-]{1,39}$/, 'a pack id (^[a-z][a-z0-9-]{1,39}$)'),
  name: lengthString(1, 40),
  version: patternString(/^(0|[1-9][0-9]{0,5})\.(0|[1-9][0-9]{0,5})\.(0|[1-9][0-9]{0,5})$/, 'MAJOR.MINOR.PATCH'),
  themes: arrayOf(checkThemeStructure, 1, 64),
  wallpapers: arrayOf(wallpaperMetaCheck, 0, 64),
};

const PACK_REQUIRED = ['schema', 'schemaVersion', 'id', 'name', 'version', 'themes'] as const;

/**
 * Validates a knowhere.themepack document (R-17 applied to the pack and,
 * independently, to every embedded theme).
 */
export function validateThemePack(input: unknown, opts: ValidateOptions = {}): ValidationResult<ThemePack> {
  const dec = decodeInput(input, THEMEPACK_MAX_BYTES, 'theme pack');
  if (!dec.ok) return dec;
  const g = gate(dec.value, THEMEPACK_SCHEMA, THEMEPACK_SUPPORT, '');
  if (!g.ok) return g;
  let value = g.mode === 'pruned' ? prune(dec.value, THEMEPACK_FIELDS) : dec.value;

  // Per-theme gate: schema name, version and size; prune newer-minor themes.
  const pack = value as JsonObject;
  const themes = pack['themes'];
  if (Array.isArray(themes)) {
    const out: JsonValue[] = [];
    for (let i = 0; i < themes.length; i++) {
      const t = themes[i] as JsonValue;
      const path = ptr('/themes', i);
      if (!isJsonObject(t)) {
        out.push(t);
        continue;
      }
      if (utf8Length(JSON.stringify(t)) > THEME_MAX_BYTES)
        return { ok: false, error: prismError(ErrorCodes.tooLarge, `${path}: theme exceeds ${THEME_MAX_BYTES} bytes`) };
      const tg = gate(t, THEME_SCHEMA, THEME_SUPPORT, path);
      if (!tg.ok) return tg;
      out.push(tg.mode === 'pruned' ? prune(t, THEME_FIELDS) : t);
    }
    value = { ...pack, themes: out };
  }

  const p = new Problems();
  checkObject(value, '', p, PACK_CHECKS, PACK_REQUIRED);
  if (!p.empty) return { ok: false, error: prismError(ErrorCodes.schemaViolation, ...p.list) };

  const result = value as unknown as ThemePack;
  const wallpaperKeys = new Set<string>();
  (result.wallpapers ?? []).forEach((w, i) => {
    if (wallpaperKeys.has(w.key)) p.add(ptr(ptr('/wallpapers', i), 'key'), `duplicate wallpaper key "${w.key}"`);
    wallpaperKeys.add(w.key);
  });
  const known = [...(opts.wallpapers ?? []), ...wallpaperKeys];
  const names = new Set<string>();
  result.themes.forEach((t, i) => {
    const path = ptr('/themes', i);
    if (t.name === undefined) p.add(path, 'a theme in a pack must have a name');
    else {
      const folded = t.name.toLowerCase();
      if (names.has(folded)) p.add(ptr(path, 'name'), `duplicate theme name "${t.name}"`);
      names.add(folded);
    }
    checkThemeValues(t, path, p, opts.fonts ?? BUNDLED_FONTS, known);
  });
  if (!p.empty) return { ok: false, error: prismError(ErrorCodes.invalidValue, ...p.list) };
  return { ok: true, value: result, mode: g.mode };
}

export function parseThemePack(input: unknown, opts: ValidateOptions = {}): ThemePack {
  const r = validateThemePack(input, opts);
  if (!r.ok) throw new PrismValidationError(r.error);
  return r.value;
}

/** Structural check equivalent to contracts/knowhere.themepack-0.1.schema.json (no version gate, no pruning). */
export const checkThemePackStructure: FieldCheck = (v, path, p) => {
  checkObject(v, path, p, PACK_CHECKS, PACK_REQUIRED);
};
