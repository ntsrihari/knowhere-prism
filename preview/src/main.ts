// Prism preview: no inline scripts or styles; colours are applied through the
// CSSOM (element.style.setProperty), which CSP default-src 'self' allows.
import {
  COLOR_ROLES,
  SHAPE_ROLES,
  SPACING_ROLES,
  formatError,
  generateTokens,
  isJsonObject,
  kebab,
  parseStrictJson,
  toCssVariables,
  validateTheme,
  validateThemePack,
  type ColorSchemeName,
  type Theme,
} from '@knowhere/prism-web';
import { SAMPLES } from './samples.js';

const $ = <T extends HTMLElement>(id: string): T => {
  const el = document.getElementById(id);
  if (!el) throw new Error(`missing #${id}`);
  return el as T;
};

const source = $<HTMLTextAreaElement>('source');
const status = $('status');
const problems = $<HTMLUListElement>('problems');
const packTheme = $<HTMLSelectElement>('packTheme');
let packThemes: Theme[] = [];

function el(tag: string, cls?: string, text?: string): HTMLElement {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}

function setStatus(ok: boolean, text: string, list: readonly string[] = []): void {
  status.className = ok ? 'ok' : 'error';
  status.textContent = text;
  problems.replaceChildren(...list.map((p) => el('li', undefined, p)));
}

/** Black or white label text, whichever contrasts more with the swatch. */
function readableOn(hex: string): string {
  const lin = (i: number) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  const l = 0.2126 * lin(1) + 0.7152 * lin(3) + 0.0722 * lin(5);
  return (l + 0.05) / 0.05 > 1.05 / (l + 0.05) ? '#000000' : '#ffffff';
}

function renderScheme(theme: Theme, mode: ColorSchemeName): void {
  const root = $(mode);
  const tokens = generateTokens(theme, mode);
  for (const [k, v] of Object.entries(toCssVariables(tokens))) root.style.setProperty(k, v);
  root.style.setProperty('color-scheme', mode);
  const ui = root.querySelector('.sample-ui') as HTMLElement;
  const card = el('div', 'card');
  card.append(el('strong', undefined, theme.name ?? 'Untitled theme'), el('div', undefined, `seed ${theme.seedColor} · ${theme.font} · ${theme.density}`));
  ui.replaceChildren(el('span', 'btn', 'Primary'), el('span', 'btn tonal', 'Tonal'), card);
  const grid = root.querySelector('.grid') as HTMLElement;
  grid.replaceChildren(
    ...COLOR_ROLES.map((role) => {
      const sw = el('div', 'swatch');
      sw.style.setProperty('--swatch', tokens.color[role]);
      sw.style.setProperty('--swatch-on', readableOn(tokens.color[role]));
      sw.append(el('span', undefined, role), el('code', undefined, `--md-${kebab(role)} ${tokens.color[role]}`));
      return sw;
    }),
  );
}

function renderScales(theme: Theme): void {
  const t = generateTokens(theme);
  const table = el('table');
  const row = (k: string, v: string | HTMLElement) => {
    const tr = el('tr');
    const td = el('td');
    td.append(v);
    tr.append(el('th', undefined, k), td);
    table.append(tr);
  };
  for (const s of SHAPE_ROLES) {
    const box = el('div', 'corner');
    box.style.setProperty('--corner', `${t.shape[s]}px`);
    const wrap = el('div');
    wrap.append(box, el('code', undefined, `--prism-shape-corner-${kebab(s)}: ${t.shape[s]}px`));
    row(`shape ${s}`, wrap);
  }
  for (const s of SPACING_ROLES) row(`space ${s}`, `${t.density.spacing[s]}px`);
  row('control height', `${t.density.controlHeight}px`);
  row('font-family', t.typography.fontFamily.join(', '));
  $('scales').replaceChildren(table);
}

function render(theme: Theme): void {
  renderScheme(theme, 'light');
  renderScheme(theme, 'dark');
  renderScales(theme);
}

function apply(): void {
  const text = source.value;
  let isPack = false;
  try {
    const v = parseStrictJson(text);
    isPack = isJsonObject(v) && v['schema'] === 'knowhere.themepack';
  } catch {
    isPack = false;
  }
  packThemes = [];
  packTheme.replaceChildren();
  packTheme.disabled = true;
  if (isPack) {
    const r = validateThemePack(text);
    if (!r.ok) return setStatus(false, `Invalid theme pack: ${r.error.code}`, r.error.problems);
    packThemes = r.value.themes;
    packTheme.replaceChildren(...packThemes.map((t, i) => Object.assign(document.createElement('option'), { value: String(i), textContent: t.name ?? `#${i}` })));
    packTheme.disabled = false;
    setStatus(true, `Valid knowhere.themepack ${r.value.schemaVersion} (${r.mode}), ${packThemes.length} themes`);
    render(packThemes[0] as Theme);
    return;
  }
  const r = validateTheme(text);
  if (!r.ok) return setStatus(false, `Invalid theme: ${r.error.code}`, r.error.problems);
  setStatus(true, `Valid knowhere.theme ${r.value.schemaVersion} (${r.mode})`);
  render(r.value);
}

function load(text: string): void {
  source.value = text;
  apply();
}

const sample = $<HTMLSelectElement>('sample');
sample.replaceChildren(...Object.keys(SAMPLES).map((k) => Object.assign(document.createElement('option'), { value: k, textContent: k })));
sample.addEventListener('change', () => load(SAMPLES[sample.value] ?? ''));
$('apply').addEventListener('click', apply);
packTheme.addEventListener('change', () => {
  const t = packThemes[Number(packTheme.value)];
  if (t) render(t);
});
$<HTMLInputElement>('file').addEventListener('change', async (e) => {
  const f = (e.target as HTMLInputElement).files?.[0];
  if (f) load(await f.text());
});

// ?theme=<same-origin path> loads a file next to the page (CSP connect-src 'self').
const param = new URLSearchParams(location.search).get('theme');
if (param && /^[\w./-]+\.json$/.test(param) && !param.includes('..')) {
  fetch(param)
    .then((r) => r.text())
    .then(load)
    .catch((err: unknown) => setStatus(false, `Cannot load ${param}: ${String(err)}`));
} else load(SAMPLES[Object.keys(SAMPLES)[0] ?? ''] ?? '');

export { formatError };
