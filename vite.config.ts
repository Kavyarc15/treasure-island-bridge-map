import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// The single-file plugin inlines JS and CSS so dist/index.html also opens by
// double-click (file://), which is handy for a demo without a dev server.
export default defineConfig({
  plugins: [viteSingleFile()],
  test: {
    include: ['tests/**/*.test.ts'],
  },
});
