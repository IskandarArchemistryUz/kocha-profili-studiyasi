import { defineConfig } from 'vite';
/* Ilova repozitoriy ildizidagi /app/ papkasiga yigʻiladi va GitHub Pages’da eski sahifalar yonida turadi. */
export default defineConfig({
  base: './',
  build: { outDir: '../app', emptyOutDir: true, sourcemap: false, chunkSizeWarningLimit: 900, rollupOptions: { input: { main: 'index.html', kochasoz: 'kochasoz.html', joyshunos: 'joyshunos.html', render: 'render.html' } } },
  test: { environment: 'node', include: ['tests/unit/**/*.test.ts'] },
} as any);
