import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  // GitHub Pages serves the project site under /rigbench/. Local dev stays at /.
  base: process.env.VITE_BASE || '/',
  plugins: [react()],
  test: {
    // The copied upstream tests rely on describe/test/expect globals.
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
