import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

export default defineConfig({
  // Relative base so the built site works from any static host subfolder
  // (GitHub Pages, itch.io, a plain file server, etc.)
  base: './',
  build: {
    rollupOptions: {
      // Two games, one repo: V1 (colony defence) at /, V2 (Aurora Down) at /v2/.
      input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        v2: fileURLToPath(new URL('./v2/index.html', import.meta.url)),
      },
    },
  },
});
