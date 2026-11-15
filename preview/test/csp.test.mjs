// The built preview must work under CSP default-src 'self': no inline scripts,
// inline styles, style attributes, event-handler attributes, eval or remote URLs.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const dist = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const html = readFileSync(join(dist, 'index.html'), 'utf8');
const js = readFileSync(join(dist, 'app.js'), 'utf8');

test('declares the CSP and only same-origin resources', () => {
  assert.match(html, /http-equiv="Content-Security-Policy" content="default-src 'self'"/);
  for (const m of html.matchAll(/(?:src|href)="([^"]+)"/g)) assert.doesNotMatch(m[1], /^(?:https?:)?\/\//, m[1]);
  assert.ok(existsSync(join(dist, 'app.js')) && existsSync(join(dist, 'style.css')));
});

test('has no inline script, style element or style/on* attributes', () => {
  for (const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)) {
    assert.match(m[1], /\bsrc="/, 'script without src');
    assert.equal(m[2].trim(), '', 'inline script body');
  }
  assert.doesNotMatch(html, /<style\b/);
  assert.doesNotMatch(html, /\sstyle="/);
  assert.doesNotMatch(html, /\son[a-z]+="/);
});

test('bundle avoids eval-like constructs and innerHTML', () => {
  assert.doesNotMatch(js, /\beval\(/);
  assert.doesNotMatch(js, /new Function\(/);
  assert.doesNotMatch(js, /\.innerHTML\s*=/);
  assert.doesNotMatch(js, /setAttribute\(\s*["']style["']/);
});

test('ships sample themes and the validator', () => {
  assert.ok(existsSync(join(dist, 'themes', 'default.json')));
  assert.match(js, /knowhere\.themepack/);
  assert.match(js, /--md-/);
});
