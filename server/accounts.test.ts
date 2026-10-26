// 다른 계정 보이기 (koprifossillab P01) — 손으로 지은 집들. 실제 /etc/passwd·다른 사람의 ~/.claude 는 쓰지 않는다
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'fl-accounts-'));
const uid = os.userInfo().uid;
const homes = path.join(root, 'home');
const me = path.join(root, 'me-claude');
fs.mkdirSync(path.join(me, 'sessions'), { recursive: true });

// 계정 하나 짓기 — 표지(marker)는 'file' · 'link' · 없음
function house(user: string, opts: { marker?: 'file' | 'link'; sessions?: boolean } = {}): string {
  const home = path.join(homes, user);
  const claude = path.join(home, '.claude');
  fs.mkdirSync(claude, { recursive: true });
  if (opts.sessions !== false) fs.mkdirSync(path.join(claude, 'sessions'));
  if (opts.marker === 'file') fs.writeFileSync(path.join(claude, 'fl-visible'), '2026-10-26\n');
  if (opts.marker === 'link') {
    fs.writeFileSync(path.join(root, `${user}-elsewhere`), 'x');
    fs.symlinkSync(path.join(root, `${user}-elsewhere`), path.join(claude, 'fl-visible'));
  }
  return home;
}
const on = house('on', { marker: 'file' });
house('off');
house('stranger', { marker: 'file' });          // passwd 의 uid 가 표지 주인과 다르다 — 남이 넣은 표지
house('linked', { marker: 'link' });
house('noread', { marker: 'file', sessions: false });   // 읽을 수 없는 집 (권한이 아직 없을 때)
fs.writeFileSync(path.join(root, 'passwd'), [
  `root:x:0:0:root:/root:/bin/bash`,
  `on:x:${uid}:${uid}::${on}:/bin/bash`,
  `off:x:${uid}:${uid}::${path.join(homes, 'off')}:/bin/bash`,
  `stranger:x:${uid + 1}:${uid + 1}::${path.join(homes, 'stranger')}:/bin/bash`,
  `linked:x:${uid}:${uid}::${path.join(homes, 'linked')}:/bin/bash`,
  `noread:x:${uid}:${uid}::${path.join(homes, 'noread')}:/bin/bash`,
  `nobody:x:65534:65534::${on}:/usr/sbin/nologin`,
  '',
].join('\n'));

process.env.FL_PASSWD = path.join(root, 'passwd');
process.env.FL_CLAUDE_HOME = me;
process.env.FL_LIMITS_FILE = path.join(root, 'none.json');
const { accounts } = await import('./paths.ts');
const { Office, roomOf } = await import('./office.ts');

test.after(() => fs.rmSync(root, { recursive: true, force: true }));

test('표지를 스스로 켠 계정만 — 남의 표지·심볼릭 링크·읽을 수 없는 집은 아니다', () => {
  const list = accounts();
  assert.equal(list[0].me, true);
  assert.deepEqual(list.filter((a) => !a.me).map((a) => a.user), ['on']);
  assert.equal(list[1].home, on);
});

test('표지를 지우면 다음 폴링에 빠진다', () => {
  const marker = path.join(on, '.claude', 'fl-visible');
  fs.rmSync(marker);
  try {
    assert.deepEqual(accounts().map((a) => a.user), [os.userInfo().username]);
  } finally {
    fs.writeFileSync(marker, 'x');
  }
});

test('다른 계정의 방은 「계정/프로젝트」, 프로젝트를 모르면 「@계정」', () => {
  const acct = { user: 'on', home: on, me: false };
  assert.equal(roomOf(acct, `${on}/projects/GSM-wt-pan/web`, null), 'on/GSM');
  assert.equal(roomOf(acct, '/srv/x', null), '@on');
  assert.equal(roomOf(acct, `${on}/projects/GSM`, { room: () => 'center' }), 'center');
  assert.equal(roomOf({ user: 'me', home: on, me: true }, `${on}/projects/GSM`, null), 'GSM');
  assert.equal(roomOf({ user: 'me', home: on, me: true }, '/srv/x', null), 'general');
});

test('켠 계정의 세션이 보이고, 세 가지 말고는 열지 않는다', () => {
  const claude = path.join(on, '.claude');
  const sid = 'aaaaaaaa-0000-0000-0000-000000000001';
  const cwd = path.join(on, 'projects', 'Foo');
  fs.mkdirSync(path.join(claude, 'projects', '-Foo'), { recursive: true });
  fs.writeFileSync(path.join(claude, 'sessions', `${process.pid}.json`),
    JSON.stringify({ pid: process.pid, sessionId: sid, cwd, startedAt: 1, kind: 'interactive', name: '시험', status: 'busy' }));
  fs.writeFileSync(path.join(claude, 'sessions', `${process.pid}.key`), 'secret');
  fs.writeFileSync(path.join(claude, 'settings.json'), '{}');
  fs.writeFileSync(path.join(claude, '.credentials.json'), '{}');
  fs.writeFileSync(path.join(claude, 'projects', '-Foo', `${sid}.jsonl`),
    JSON.stringify({ type: 'assistant', message: { content: [{ type: 'tool_use', id: 'u1', name: 'Read', input: { file_path: `${cwd}/a.ts` } }] } }) + '\n');

  // 연 파일을 적어 둔다
  const opened: string[] = [];
  const { readFileSync, openSync } = fs;
  (fs as any).readFileSync = (p: any, ...r: any[]) => { opened.push(String(p)); return (readFileSync as any)(p, ...r); };
  (fs as any).openSync = (p: any, ...r: any[]) => { opened.push(String(p)); return (openSync as any)(p, ...r); };
  let snap;
  try {
    snap = new Office('test').snapshot();
  } finally {
    fs.readFileSync = readFileSync;
    fs.openSync = openSync;
  }
  const a = snap.agents.find((x) => x.id === `on/${sid}`);
  assert.ok(a, '켠 계정의 세션이 있다');
  assert.equal(a.user, 'on');
  assert.equal(a.room, 'on/Foo');
  assert.match(a.label, /a\.ts/);   // 기록을 읽었다 (열린 호출이라 활동은 확인 대기로 추정될 수 있다)
  assert.ok(snap.offices.some((o) => o.name === 'on/Foo'));
  const inClaude = opened.filter((p) => p.startsWith(claude));
  assert.ok(inClaude.length > 0);
  for (const p of inClaude) {
    const rel = path.relative(claude, p);
    assert.ok(/^sessions\/[^/]+\.json$/.test(rel) || /^jobs\/[^/]+\/state\.json$/.test(rel) || /^projects\/.+\.(jsonl|meta\.json)$/.test(rel), `열면 안 되는 파일: ${rel}`);
  }
});
