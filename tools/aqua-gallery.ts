// 수족관 미리보기: npx tsx tools/aqua-gallery.ts
// tools/props-gallery.ts 와 같은 방식 — vite 개발 서버로 web/aqua.html 을 띄우고 chromium(playwright 1.49.1)으로 열어
// docs/props/aquarium-room.png(방 한 장)·aquarium-fish.png(물고기 모음)·aquarium-fish-<kind>.png 를 쓴다.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import { chromium } from 'playwright';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'docs', 'props');

const server = await createServer({ configFile: path.join(ROOT, 'web', 'vite.config.ts'), server: { port: 8059, strictPort: false } });
await server.listen();
const url = server.resolvedUrls!.local[0] + 'aqua.html';
// 화면 없는 서버라 WebGL 은 소프트웨어(swiftshader)로 그린다
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
try {
  const page = await browser.newPage();
  page.on('pageerror', (e) => console.error('pageerror', e.message));
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.error(m.type(), m.text()); });
  await page.goto(url);
  await page.waitForFunction(() => (window as any).__ready === true, null, { timeout: 60_000 });
  const t0 = Date.now();
  const res = await page.evaluate(() => (window as any).__shoot());
  if (res.lost) throw new Error('WebGL context lost — 그림이 비었을 수 있다');
  fs.mkdirSync(OUT, { recursive: true });
  for (const [name, data] of Object.entries(res.files as Record<string, string>)) {
    fs.writeFileSync(path.join(OUT, name), Buffer.from(data.split(',')[1], 'base64'));
  }
  console.log(`docs/props/ — 수족관 ${Object.keys(res.files).length}장 (${((Date.now() - t0) / 1000).toFixed(1)}초)`);
} finally {
  await browser.close();
  await server.close();
}
