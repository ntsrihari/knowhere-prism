import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
export const CONTRACTS = join(ROOT, 'contracts');
export const GOLDEN = join(ROOT, 'testdata', 'golden');

export interface Fixture {
  name: string;
  path: string;
  bytes: Uint8Array;
  /** Expected error code for invalid fixtures ("<code>--<desc>.json"). */
  code?: string;
}

export function fixtures(contract: 'theme' | 'themepack', kind: 'valid' | 'invalid'): Fixture[] {
  const dir = join(CONTRACTS, 'testdata', contract, kind);
  return readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .sort()
    .map((name) => {
      const path = join(dir, name);
      const f: Fixture = { name, path, bytes: new Uint8Array(readFileSync(path)) };
      if (kind === 'invalid') f.code = name.split('--')[0] ?? '';
      return f;
    });
}

export function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, 'utf8'));
}
