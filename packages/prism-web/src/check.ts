/**
 * Hand-written structural checks that mirror the JSON Schemas in contracts/.
 * (A test cross-checks every fixture against the real schemas with Ajv.)
 * Kept dependency-free and eval-free so it runs under a strict CSP.
 */
import { MAX_PROBLEMS } from './errors.js';
import { hasOwn, isJsonObject, type JsonObject, type JsonValue } from './json.js';

export class Problems {
  readonly list: string[] = [];
  add(path: string, msg: string): void {
    if (this.list.length < MAX_PROBLEMS) this.list.push(`${path === '' ? '/' : path}: ${msg}`);
  }
  get empty(): boolean {
    return this.list.length === 0;
  }
}

export function ptr(path: string, key: string | number): string {
  return `${path}/${String(key).replace(/~/g, '~0').replace(/\//g, '~1')}`;
}

export function codePointLength(s: string): number {
  let n = 0;
  for (const _ of s) n++;
  return n;
}

export type FieldCheck = (v: JsonValue, path: string, p: Problems) => void;

export function checkObject(
  v: JsonValue,
  path: string,
  p: Problems,
  fields: Record<string, FieldCheck>,
  required: readonly string[],
): v is JsonObject {
  if (!isJsonObject(v)) {
    p.add(path, 'must be an object');
    return false;
  }
  for (const r of required) if (!hasOwn(v, r)) p.add(path, `missing required field "${r}"`);
  for (const k of Object.keys(v).sort()) {
    const check = hasOwn(fields, k) ? fields[k] : undefined;
    if (!check) p.add(ptr(path, k), 'unknown field');
    else check(v[k] as JsonValue, ptr(path, k), p);
  }
  return true;
}

export const constString =
  (c: string): FieldCheck =>
  (v, path, p) => {
    if (v !== c) p.add(path, `must be "${c}"`);
  };

export const patternString =
  (re: RegExp, what: string): FieldCheck =>
  (v, path, p) => {
    if (typeof v !== 'string') p.add(path, 'must be a string');
    else if (!re.test(v)) p.add(path, `must be ${what}`);
  };

export const lengthString =
  (min: number, max: number): FieldCheck =>
  (v, path, p) => {
    if (typeof v !== 'string') p.add(path, 'must be a string');
    else {
      const n = codePointLength(v);
      if (n < min || n > max) p.add(path, `length must be ${min}-${max} characters`);
    }
  };

export const enumOf =
  (values: readonly string[]): FieldCheck =>
  (v, path, p) => {
    if (typeof v !== 'string' || !values.includes(v)) p.add(path, `must be one of ${values.join(', ')}`);
  };

export const intRange =
  (min: number, max: number): FieldCheck =>
  (v, path, p) => {
    if (typeof v !== 'number' || !Number.isInteger(v)) p.add(path, 'must be an integer');
    else if (v < min || v > max) p.add(path, `must be between ${min} and ${max}`);
  };

export const arrayOf =
  (item: FieldCheck, min: number, max: number): FieldCheck =>
  (v, path, p) => {
    if (!Array.isArray(v)) {
      p.add(path, 'must be an array');
      return;
    }
    if (v.length < min || v.length > max) p.add(path, `must have ${min}-${max} items`);
    v.forEach((x, i) => item(x, ptr(path, i), p));
  };

/** Field names known by the current minor; nested sets prune nested objects / array items. */
export interface FieldSet {
  readonly fields: Readonly<Record<string, FieldSet | null>>;
  readonly items?: FieldSet;
}

/** Drops unknown keys (exact-case match only) following fs, for newer-MINOR documents. */
export function prune(v: JsonValue, fs: FieldSet | null): JsonValue {
  if (fs === null) return v;
  if (Array.isArray(v)) return fs.items ? v.map((x) => prune(x, fs.items ?? null)) : v;
  if (!isJsonObject(v)) return v;
  const out: JsonObject = {};
  for (const k of Object.keys(v)) {
    if (!hasOwn(fs.fields, k)) continue;
    Object.defineProperty(out, k, {
      value: prune(v[k] as JsonValue, fs.fields[k] ?? null),
      enumerable: true,
      writable: true,
      configurable: true,
    });
  }
  return out;
}
