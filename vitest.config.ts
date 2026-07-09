import { configDefaults, defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    environment: 'jsdom',
    // Pin a non-Berlin timezone so planned-end handling, which must stay in a
    // fixed organizer timezone, is exercised away from the local machine's zone.
    env: { TZ: 'America/New_York' },
    exclude: [...configDefaults.exclude, '.next/**'],
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
  },
});
