#!/usr/bin/env node
import { readFileSync, realpathSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { formatError, type PrismError } from './errors.js';
import { toCss } from './css.js';
import { parseStrictJson, isJsonObject } from './json.js';
import { THEMEPACK_SCHEMA, validateThemePack, type ThemePack } from './themepack.js';
import { validateTheme, type ColorSchemeName, type Theme } from './theme.js';
import { generateTokens } from './tokens.js';

const USAGE = `usage:
  prism validate <file> [--json]
  prism css <file> [--mode light|dark] [--selector <css-selector>] [--theme <name>]

<file> is a knowhere.theme or knowhere.themepack JSON document ("-" reads stdin).
Exit status: 0 ok, 1 invalid document, 2 usage or I/O error.`;

interface Io {
  out: (s: string) => void;
  err: (s: string) => void;
  readFile: (path: string) => Uint8Array;
}

const defaultIo: Io = {
  out: (s) => process.stdout.write(s),
  err: (s) => process.stderr.write(s),
  readFile: (p) => readFileSync(p === '-' ? 0 : p),
};

type Doc = { kind: 'theme'; theme: Theme; mode: string } | { kind: 'pack'; pack: ThemePack; mode: string };

function load(bytes: Uint8Array): { ok: true; doc: Doc } | { ok: false; error: PrismError } {
  // Detect the contract from the "schema" field; anything else validates as a theme.
  let isPack = false;
  try {
    const v = parseStrictJson(new TextDecoder().decode(bytes));
    isPack = isJsonObject(v) && v['schema'] === THEMEPACK_SCHEMA;
  } catch {
    isPack = false;
  }
  if (isPack) {
    const r = validateThemePack(bytes);
    return r.ok ? { ok: true, doc: { kind: 'pack', pack: r.value, mode: r.mode } } : r;
  }
  const r = validateTheme(bytes);
  return r.ok ? { ok: true, doc: { kind: 'theme', theme: r.value, mode: r.mode } } : r;
}

function flag(args: string[], name: string): string | undefined {
  const i = args.indexOf(name);
  if (i < 0) return undefined;
  const v = args[i + 1];
  args.splice(i, 2);
  return v ?? '';
}

export function main(argv: string[], io: Io = defaultIo): number {
  const args = [...argv];
  const cmd = args.shift();
  if (cmd === undefined || cmd === '-h' || cmd === '--help' || cmd === 'help') {
    io.out(`${USAGE}\n`);
    return cmd === undefined ? 2 : 0;
  }
  const json = args.includes('--json');
  if (json) args.splice(args.indexOf('--json'), 1);
  const mode = flag(args, '--mode');
  const selector = flag(args, '--selector') ?? ':root';
  const themeName = flag(args, '--theme');
  if ((cmd !== 'validate' && cmd !== 'css') || args.length !== 1 || (mode !== undefined && mode !== 'light' && mode !== 'dark')) {
    io.err(`${USAGE}\n`);
    return 2;
  }
  const file = args[0] as string;
  let bytes: Uint8Array;
  try {
    bytes = io.readFile(file);
  } catch (e) {
    io.err(`prism: cannot read ${file}: ${(e as Error).message}\n`);
    return 2;
  }
  const r = load(bytes);
  if (!r.ok) {
    if (json) io.out(`${JSON.stringify({ ok: false, code: r.error.code, problems: r.error.problems })}\n`);
    else io.err(`${file}: ${formatError(r.error)}\n`);
    return 1;
  }
  const doc = r.doc;
  if (cmd === 'validate') {
    const what =
      doc.kind === 'pack'
        ? `knowhere.themepack ${doc.pack.schemaVersion} "${doc.pack.id}" (${doc.pack.themes.length} themes)`
        : `knowhere.theme ${doc.theme.schemaVersion}`;
    if (json) io.out(`${JSON.stringify({ ok: true, kind: doc.kind, mode: doc.mode })}\n`);
    else io.out(`${file}: ok: ${what}, ${doc.mode}\n`);
    return 0;
  }
  let theme: Theme;
  if (doc.kind === 'pack') {
    const found = themeName === undefined ? doc.pack.themes[0] : doc.pack.themes.find((t) => t.name === themeName);
    if (!found) {
      io.err(`prism: no theme named "${themeName ?? ''}" in pack\n`);
      return 2;
    }
    theme = found;
  } else theme = doc.theme;
  io.out(toCss(generateTokens(theme, (mode as ColorSchemeName | undefined) ?? theme.colorScheme), selector));
  return 0;
}

function isEntry(): boolean {
  const script = process.argv[1];
  if (script === undefined) return false;
  try {
    return import.meta.url === pathToFileURL(realpathSync(script)).href;
  } catch {
    return false;
  }
}
if (isEntry()) process.exitCode = main(process.argv.slice(2));
