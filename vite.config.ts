import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

export default defineConfig({
  // Relative base so the built site works from any static host subfolder
  // (GitHub Pages, itch.io, a plain file server, etc.)
  base: './',
  // Low-poly model files dropped into v3/src/models/ are bundled as assets.
  assetsInclude: ['**/*.glb'],
  build: {
    rollupOptions: {
      // Three games, one repo: V1 at /, V2 at /v2/, V3 at /v3/.
      input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        v2: fileURLToPath(new URL('./v2/index.html', import.meta.url)),
        v3: fileURLToPath(new URL('./v3/index.html', import.meta.url)),
      },
    },
  },
});
