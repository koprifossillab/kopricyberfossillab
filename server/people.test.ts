// 화면에서 고친 이름·생김새 — 받는 것을 좁게 거르는지
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'fl-people-'));
process.env.FL_PEOPLE_FILE = path.join(root, 'people.json');
const { editPerson, peopleFor, cleanLook, cleanName } = await import('./people.ts');
test.after(() => fs.rmSync(root, { recursive: true, force: true }));

const live = new Set(['s1', 's2']);

test('목록에 없는 값은 버리고, 같은 무리의 치장품은 하나만', () => {
  assert.deepEqual(cleanLook({ hair: 'long', hc: 0x1f1a17, outfit: 'cape', build: 'x', skin: 1, acc: ['glasses', 'round', 'tie', 'bowtie', 'tie', 'rocket'] }),
    { hair: 'long', hc: 0x1f1a17, acc: ['glasses', 'tie'] });
  assert.equal(cleanLook({ hair: 'mohawk' }), null);
  assert.equal(cleanLook('long'), null);
});

test('이름은 제어 문자를 빼고 20자까지', () => {
  assert.equal(cleanName('  김\u0000민‮준  '), '김민준');
  assert.equal(cleanName('가'.repeat(30)), '가'.repeat(20));
  assert.equal(cleanName(3), null);
});

test('지금 화면에 있는 에이전트만, 고친 것은 파일에 남는다', () => {
  assert.equal(editPerson({ id: 'gone', name: '유령' }, live).ok, false);
  assert.deepEqual(editPerson({ id: 's1', name: '김연구', look: { hair: 'bun' } }, live), { ok: true });
  assert.deepEqual(peopleFor(['s1', 's2']), { s1: { name: '김연구', look: { hair: 'bun' } } });
  const saved = JSON.parse(fs.readFileSync(process.env.FL_PEOPLE_FILE!, 'utf8'));
  assert.equal(saved.s1.name, '김연구');
  // 빈 이름·null 생김새는 지운다 — 둘 다 없으면 사람째
  editPerson({ id: 's1', name: '' }, live);
  assert.deepEqual(peopleFor(['s1']), { s1: { look: { hair: 'bun' } } });
  editPerson({ id: 's1', look: null }, live);
  assert.equal(peopleFor(['s1']), undefined);
});

test('1분에 너무 자주 고치면 거절', () => {
  const t = Date.now() + 120_000;   // 앞 시험과 다른 창
  let last;
  for (let i = 0; i < 200; i++) last = editPerson({ id: 's2', name: `이름${i}` }, live, t);
  assert.equal(last && !last.ok && last.status, 429);
});
