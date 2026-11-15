// Bundles the library and CLI with esbuild. @material/material-color-utilities
// 0.4.0 ships extensionless ESM imports that Node cannot load directly, so it is
// inlined (Apache-2.0 notices kept via legalComments).
import { build } from 'esbuild';

const common = { bundle: true, format: 'esm', platform: 'neutral', target: 'es2022', sourcemap: true, legalComments: 'inline', logLevel: 'warning' };
await build({ ...common, entryPoints: ['src/index.ts'], outfile: 'dist/index.js' });
await build({ ...common, platform: 'node', entryPoints: ['src/cli.ts'], outfile: 'dist/cli.js', external: ['node:*'] });
