// Cross-checks the hand-written structural validators against the JSON Schemas
// in contracts/ (the source of truth) on every fixture plus mutations.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Ajv2020 } from 'ajv/dist/2020.js';
import { describe, expect, it } from 'vitest';
import { Problems, checkThemeStructure, checkThemePackStructure, type JsonValue } from '../src/index.js';
import { CONTRACTS, fixtures } from './helpers.js';

const ajv = new Ajv2020({ allErrors: true, strict: true });
const themeSchema = JSON.parse(readFileSync(join(CONTRACTS, 'knowhere.theme-0.1.schema.json'), 'utf8'));
const packSchema = JSON.parse(readFileSync(join(CONTRACTS, 'knowhere.themepack-0.1.schema.json'), 'utf8'));
ajv.addSchema(themeSchema, 'knowhere.theme-0.1.schema.json');
const ajvTheme = ajv.compile(themeSchema);
const ajvPack = ajv.compile(packSchema);

function parsed(bytes: Uint8Array): JsonValue | undefined {
  try {
    return JSON.parse(new TextDecoder().decode(bytes)) as JsonValue;
  } catch {
    return undefined;
  }
}

function agree(kind: 'theme' | 'themepack', v: JsonValue): void {
  const p = new Problems();
  (kind === 'theme' ? checkThemeStructure : checkThemePackStructure)(v, '', p);
  const schemaOk = (kind === 'theme' ? ajvTheme : ajvPack)(v);
  expect(p.empty, `hand=${p.list.join('; ')} ajv=${JSON.stringify((kind === 'theme' ? ajvTheme : ajvPack).errors)}`).toBe(schemaOk);
}

describe('hand validators agree with the JSON Schemas', () => {
  for (const kind of ['theme', 'themepack'] as const) {
    for (const f of [...fixtures(kind, 'valid'), ...fixtures(kind, 'invalid')]) {
      const v = parsed(f.bytes);
      if (v === undefined) continue;
      it(`${kind}/${f.name}`, () => agree(kind, v));
    }
  }
  const base = JSON.parse(readFileSync(join(CONTRACTS, 'testdata/theme/valid/default.json'), 'utf8')) as Record<string, JsonValue>;
  const mutations: Record<string, JsonValue>[] = [
    { name: 'x'.repeat(40) },
    { name: 'x'.repeat(41) },
    { name: '😀'.repeat(40) },
    { cornerRadius: 12.0 },
    { cornerRadius: true },
    { font: 'Inter' },
    { font: 'a'.repeat(41) },
    { wallpaper: { ref: 'builtin:a', extra: 1 } },
    { wallpaper: [] },
    { extensions: { 'Bad-NS': {} } },
    { extensions: { milano: [] } },
    { extensions: { milano: null } },
    { extensions: Object.fromEntries(Array.from({ length: 17 }, (_, i) => [`n${i}`, {}])) },
    { schemaVersion: '0.01.0' },
    { seedColor: '#6750a4' },
    { seedColor: '#6750A4 ' },
  ];
  mutations.forEach((m, i) => it(`theme mutation ${i}`, () => agree('theme', { ...base, ...m })));
});
