import { defineConfig } from 'vite';
import { resolve } from 'node:path';

const root = import.meta.dirname;
const web = resolve(root, 'web');

export default defineConfig({
  root: web,
  publicDir: false,
  server: {
    // Vite only reads the page code. The database and photos are never served by it.
    fs: { strict: true, allow: [web, resolve(root, 'node_modules')], deny: ['**/data/**', '**/*.db', '**/photos/**', '.env*'] },
  },
  optimizeDeps: { entries: ['*.html'] },
  build: {
    outDir: resolve(root, 'dist'),
    emptyOutDir: true,
    rollupOptions: {
      input: Object.fromEntries(['index', 'album', 'events', 'sightings', 'signin', 'my-photos', 'profile', 'admin']
        .map((n) => [n, resolve(web, `${n}.html`)])),
    },
  },
});
