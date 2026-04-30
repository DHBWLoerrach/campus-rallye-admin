import { configDefaults, defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    environment: 'jsdom',
    exclude: [...configDefaults.exclude, '.next/**'],
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
  },
});
