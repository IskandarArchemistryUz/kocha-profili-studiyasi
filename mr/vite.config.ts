import { defineConfig } from 'vite';
/* Ilova repozitoriy ildizidagi /app/ papkasiga yigʻiladi va GitHub Pages’da eski sahifalar yonida turadi. */
export default defineConfig({
  base: './',
  build: { outDir: '../app', emptyOutDir: true, sourcemap: false, chunkSizeWarningLimit: 900 },
  test: { environment: 'node', include: ['tests/unit/**/*.test.ts'] },
} as any);
