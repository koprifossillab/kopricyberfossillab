import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import fs from 'node:fs';

const pkg = JSON.parse(fs.readFileSync(path.resolve(import.meta.dirname, '../package.json'), 'utf8'));

// 정적 파일은 상대경로로 — nginx 서브경로(/kopricyberfossillab/) 뒤에서도 그대로 뜬다
export default defineConfig({
  root: path.resolve(import.meta.dirname),
  base: './',
  plugins: [react()],
  define: { __VERSION__: JSON.stringify(pkg.version) },
  build: { outDir: 'dist', emptyOutDir: true, chunkSizeWarningLimit: 1600 },
  server: {
    host: '127.0.0.1',
    port: 8058,
    proxy: { '/api': 'http://127.0.0.1:8098' },
  },
});
