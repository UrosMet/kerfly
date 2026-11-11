import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: './', // relative asset paths: the build works from any folder or address
  plugins: [react()],
  test: { environment: 'node', setupFiles: ['tests/setup.ts'], include: ['src/**/*.test.{ts,tsx}', 'tests/**/*.test.{ts,tsx}'] },
});
