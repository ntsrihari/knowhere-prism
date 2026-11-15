import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    environment: 'node',
    // material-color-utilities 0.4.0 uses extensionless ESM imports; let Vite resolve them.
    server: { deps: { inline: ['@material/material-color-utilities'] } },
  },
});
