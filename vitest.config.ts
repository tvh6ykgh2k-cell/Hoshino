import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  root: '.',
  test: {
    include: ['tests/renderer/**/*.{test,spec}.?(c|m)[jt]s?(x)'],
  },
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, 'src/shared'),
    },
  },
});
