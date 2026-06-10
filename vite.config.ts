import { defineConfig } from 'vite';

export default defineConfig({
  // Relative base so the built site works from any static host subfolder
  // (GitHub Pages, itch.io, a plain file server, etc.)
  base: './',
});
