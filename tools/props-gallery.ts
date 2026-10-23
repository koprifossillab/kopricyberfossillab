// 소품 미리보기: npm run props
// tools/bake.ts 와 같은 방식 — vite 개발 서버로 web/props.html 을 띄우고 chromium(playwright 1.49.1)으로 열어
// docs/props/<이름>.png 와 한 장 모음 docs/props/gallery.png 를 쓴다. 소품(scene/props.ts)을 고쳤을 때 돌려 본다.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import { chromium } from 'playwright';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'docs', 'props');

const server = await createServer({ configFile: path.join(ROOT, 'web', 'vite.config.ts'), server: { port: 8059, strictPort: false } });
await server.listen();
const url = server.resolvedUrls!.local[0] + 'props.html';
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
  console.log(`docs/props/ — 소품 ${Object.keys(res.files).length - 1} + gallery.png (${((Date.now() - t0) / 1000).toFixed(1)}초)`);
} finally {
  await browser.close();
  await server.close();
}
