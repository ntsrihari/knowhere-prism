import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { main } from '../src/cli.js';
import { CONTRACTS } from './helpers.js';

function run(...args: string[]) {
  let out = '';
  let err = '';
  const code = main(args, { out: (s) => void (out += s), err: (s) => void (err += s), readFile: (p) => new Uint8Array(readFileSync(p)) });
  return { code, out, err };
}
const fx = (p: string) => join(CONTRACTS, 'testdata', p);

describe('prism CLI', () => {
  it('validates a theme', () => {
    const r = run('validate', fx('theme/valid/default.json'));
    expect(r.code).toBe(0);
    expect(r.out).toContain('ok: knowhere.theme 0.1.0, strict');
  });
  it('validates a pack', () => {
    const r = run('validate', fx('themepack/valid/two-themes-wallpapers.json'));
    expect(r.code).toBe(0);
    expect(r.out).toContain('"knowhere-core" (2 themes)');
  });
  it('reports errors with exit 1 and JSON output', () => {
    const r = run('validate', fx('theme/invalid/schema_violation--bad-density.json'));
    expect(r.code).toBe(1);
    expect(r.err).toContain('schema_violation: /density');
    const j = run('validate', '--json', fx('themepack/invalid/invalid_value--duplicate-theme-name.json'));
    expect(JSON.parse(j.out)).toMatchObject({ ok: false, code: 'invalid_value' });
  });
  it('prints CSS for a theme and for a named pack theme', () => {
    const r = run('css', fx('theme/valid/default.json'), '--mode', 'light', '--selector', 'html');
    expect(r.code).toBe(0);
    expect(r.out).toMatch(/^html \{\n {2}color-scheme: light;/);
    const p = run('css', fx('themepack/valid/two-themes-wallpapers.json'), '--theme', 'Knowhere Light');
    expect(p.out).toContain('color-scheme: light');
    expect(run('css', fx('themepack/valid/minimal.json'), '--theme', 'nope').code).toBe(2);
  });
  it('rejects bad usage', () => {
    expect(run().code).toBe(2);
    expect(run('frobnicate', 'x').code).toBe(2);
    expect(run('css', fx('theme/valid/default.json'), '--mode', 'sepia').code).toBe(2);
    expect(run('validate', '/nonexistent.json').code).toBe(2);
  });
});
