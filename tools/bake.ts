// 그림 굽기: npm run bake
// vite 개발 서버로 web/bake.html 을 띄우고 chromium(playwright 1.49.1, 이 서버의 ~/.cache/ms-playwright)으로 열어
// web/public/sprites/ 에 그림과 atlas.json 을 쓴다. 그림(models.ts·layout.ts)을 고쳤을 때만 돌리고, 결과를 커밋한다.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import { chromium } from 'playwright';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'web', 'public', 'sprites');

const server = await createServer({ configFile: path.join(ROOT, 'web', 'vite.config.ts'), server: { port: 8059, strictPort: false } });
await server.listen();
const url = server.resolvedUrls!.local[0] + 'bake.html';
// 화면 없는 서버라 WebGL 은 소프트웨어(swiftshader)로 그린다
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
try {
  const page = await browser.newPage();
  page.on('pageerror', (e) => console.error('pageerror', e.message));
  await page.goto(url);
  await page.waitForFunction(() => (window as any).__ready === true, null, { timeout: 60_000 });
  const t0 = Date.now();
  const res = await page.evaluate(() => (window as any).__bake());
  fs.mkdirSync(OUT, { recursive: true });
  for (const [name, data] of Object.entries(res.files as Record<string, string>)) {
    const buf = Buffer.from(data.split(',')[1], 'base64');
    fs.writeFileSync(path.join(OUT, name), buf);
    console.log(`${name}  ${(buf.length / 1024).toFixed(0)} KB`);
  }
  fs.writeFileSync(path.join(OUT, 'atlas.json'), JSON.stringify(res.atlas, null, 1) + '\n');
  console.log(`atlas.json — 가구 ${Object.keys(res.atlas.items).length}, 캐릭터 ${Object.keys(res.atlas.characters).length} (${((Date.now() - t0) / 1000).toFixed(1)}초)`);
} finally {
  await browser.close();
  await server.close();
}
