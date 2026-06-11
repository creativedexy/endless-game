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
      // Five games, one repo: V1 at /, then /v2/ ... /v5/.
      input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        v2: fileURLToPath(new URL('./v2/index.html', import.meta.url)),
        v3: fileURLToPath(new URL('./v3/index.html', import.meta.url)),
        v4: fileURLToPath(new URL('./v4/index.html', import.meta.url)),
        v5: fileURLToPath(new URL('./v5/index.html', import.meta.url)),
      },
    },
  },
});
