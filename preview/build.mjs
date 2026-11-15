// Builds preview/dist: index.html + style.css + app.js (one bundled ES module,
// no inline code) + themes/*.json samples loadable via ?theme=themes/<name>.json.
import { build } from 'esbuild';
import { copyFileSync, mkdirSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, 'dist');
const contracts = join(here, '..', 'contracts', 'testdata');
mkdirSync(join(out, 'themes'), { recursive: true });

const samples = {};
const pick = [
  ['theme/valid', 'default.json'], ['theme/valid', 'light-minimal.json'], ['theme/valid', 'newer-minor.json'],
  ['themepack/valid', 'two-themes-wallpapers.json'],
  ['theme/invalid', 'schema_violation--bad-density.json'], ['theme/invalid', 'invalid_value--font-not-bundled.json'],
  ['theme/invalid', 'unsupported_schema_version--major-1.json'],
];
for (const [dir, name] of pick) {
  const src = join(contracts, dir, name);
  const key = `${dir.split('/')[0]}: ${name.replace(/\.json$/, '')}`;
  samples[key] = readFileSync(src, 'utf8');
  copyFileSync(src, join(out, 'themes', name));
}
for (const f of readdirSync(join(contracts, 'theme', 'valid'))) copyFileSync(join(contracts, 'theme', 'valid', f), join(out, 'themes', f));

const samplesPlugin = {
  name: 'samples',
  setup(b) {
    b.onResolve({ filter: /\/samples\.js$/ }, () => ({ path: 'samples', namespace: 'samples' }));
    b.onLoad({ filter: /.*/, namespace: 'samples' }, () => ({ contents: `export const SAMPLES = ${JSON.stringify(samples)};`, loader: 'js' }));
  },
};

await build({
  entryPoints: [join(here, 'src', 'main.ts')],
  outfile: join(out, 'app.js'),
  bundle: true,
  format: 'esm',
  target: 'es2022',
  minify: true,
  legalComments: 'external',
  plugins: [samplesPlugin],
  logLevel: 'warning',
});
copyFileSync(join(here, 'index.html'), join(out, 'index.html'));
copyFileSync(join(here, 'style.css'), join(out, 'style.css'));
console.log(`preview built: ${out}`);
