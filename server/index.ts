// 127.0.0.1 에서만 듣는다 — 세션 기록에는 코드와 대화가 담겨 있다(보내는 것은 도구 한 줄뿐이어도).
//   GET /api/snapshot   지금 상태 한 번
//   GET /api/events     SSE — 바뀔 때마다 Snapshot
//   GET /healthz        ok + 판
//   그 밖               web/dist 의 정적 파일
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Office } from './office.ts';
import { ask, askToken, checkToken, ASK_MAX, type Turn } from './desk.ts';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'web', 'dist');
const VERSION: string = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')).version;
const HOST = process.env.FL_HOST ?? '127.0.0.1';
const PORT = Number(process.env.FL_PORT ?? 8098);
const POLL_MS = Number(process.env.FL_POLL_MS ?? 1000);

const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json', '.woff2': 'font/woff2',
};

const office = new Office(VERSION);
let current = office.snapshot();
let body = JSON.stringify(current);
const clients = new Set<http.ServerResponse>();

setInterval(() => {
  const next = office.snapshot();
  const { at: _a, ...a } = next;
  const { at: _b, ...b } = current;
  current = next;
  if (JSON.stringify(a) === JSON.stringify(b)) return;
  body = JSON.stringify(next);
  for (const res of clients) res.write(`data: ${body}\n\n`);
}, POLL_MS);

// 프록시가 조용한 연결을 끊지 않게
setInterval(() => { for (const res of clients) res.write(': ping\n\n'); }, 20_000);

function serveStatic(url: string, res: http.ServerResponse): void {
  const rel = decodeURIComponent(url.split('?')[0]).replace(/^\/+/, '') || 'index.html';
  const file = path.resolve(DIST, rel);
  if (!file.startsWith(DIST + path.sep)) { res.writeHead(403).end(); return; }
  fs.readFile(file, (err, data) => {
    if (err) {
      if (rel === 'index.html') { res.writeHead(503, { 'content-type': 'text/plain; charset=utf-8' }).end('web/dist 가 없다 — npm run build'); return; }
      res.writeHead(404).end();
      return;
    }
    const cache = rel.startsWith('assets/') ? 'public, max-age=31536000, immutable' : 'no-cache';
    res.writeHead(200, { 'content-type': TYPES[path.extname(file)] ?? 'application/octet-stream', 'cache-control': cache }).end(data);
  });
}

function readBody(req: http.IncomingMessage, limit: number): Promise<string> {
  return new Promise((resolve, reject) => {
    let n = 0; const parts: Buffer[] = [];
    req.on('data', (b: Buffer) => { n += b.length; if (n > limit) { reject(new Error('too large')); req.destroy(); } else parts.push(b); });
    req.on('end', () => resolve(Buffer.concat(parts).toString('utf8')));
    req.on('error', reject);
  });
}

const json = (res: http.ServerResponse, status: number, data: unknown) =>
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }).end(JSON.stringify(data));

// 상담원 — 열쇠(x-fl-token)가 맞을 때만. 본인만 쓴다 (desk.ts 머리 주석)
async function handleAsk(req: http.IncomingMessage, res: http.ServerResponse, url: string): Promise<void> {
  const tok = req.headers['x-fl-token'];
  if (!checkToken(Array.isArray(tok) ? tok[0] : tok)) { json(res, 401, { error: '열쇠가 맞지 않다' }); return; }
  if (url.startsWith('/api/ask/check')) { json(res, 200, { ok: true, max: ASK_MAX }); return; }
  if (req.method !== 'POST') { json(res, 405, { error: 'POST 만' }); return; }
  let body: { question?: unknown; history?: unknown };
  try { body = JSON.parse(await readBody(req, 16 * 1024)); } catch { json(res, 400, { error: '본문을 읽지 못했다' }); return; }
  const history: Turn[] = Array.isArray(body.history)
    ? body.history.filter((t): t is Turn => !!t && typeof t.q === 'string' && typeof t.a === 'string').slice(-3) : [];
  const r = await ask(String(body.question ?? ''), history, current);
  if (r.ok) json(res, 200, { answer: r.answer }); else json(res, r.status, { error: r.error });
}

const server = http.createServer((req, res) => {
  // nginx 서브경로(/kopricyberfossillab/) 뒤에 서도 되게 앞부분을 떼고 본다
  const url = (req.url ?? '/').replace(/^\/kopricyberfossillab(?=\/|$)/, '') || '/';
  if (url === '/healthz' || url === '/healthz/') {
    res.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify({ ok: true, version: VERSION }));
  } else if (url.startsWith('/api/ask')) {
    handleAsk(req, res, url).catch(() => json(res, 500, { error: '서버 오류' }));
  } else if (url.startsWith('/api/changelog')) {
    // 판 이력 — 설정 화면이 읽는다
    fs.readFile(path.join(ROOT, 'CHANGELOG.md'), 'utf8', (err, text) =>
      err ? res.writeHead(404).end() : res.writeHead(200, { 'content-type': 'text/markdown; charset=utf-8', 'cache-control': 'no-cache' }).end(text));
  } else if (url.startsWith('/api/snapshot')) {
    res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' }).end(body);
  } else if (url.startsWith('/api/events')) {
    res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-store', 'x-accel-buffering': 'no' });
    res.write(`data: ${body}\n\n`);
    clients.add(res);
    req.on('close', () => clients.delete(res));
  } else {
    serveStatic(url, res);
  }
});

server.listen(PORT, HOST, () => {
  console.log(`kopricyberfossillab ${VERSION} — http://${HOST}:${PORT}/`);
  askToken();   // 상담원 열쇠를 미리 만들어 둔다 (~/.config/kopricyberfossillab/ask-token)
});
