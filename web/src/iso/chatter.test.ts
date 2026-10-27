// 잡담 — 대사 묶음이 비지 않았는지, 자리표가 아는 것뿐인지, 주머니가 다 쓰기 전에 되풀이하지 않는지, 무리마다 말이 나오는지
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as L from './lines.ts';
import { Chatter, draw, fill, when } from './chatter.ts';

function* all(v: unknown): Generator<string> {
  if (typeof v === 'string') yield v;
  else if (Array.isArray(v)) for (const x of v) yield* all(x);
  else if (v && typeof v === 'object') for (const x of Object.values(v)) yield* all(x);
}

test('대사 — 빈 줄이 없고 자리표는 {상대}·{방} 뿐', () => {
  for (const s of all(L)) {
    assert.ok(s.trim().length > 0);
    for (const m of s.match(/\{[^}]*\}/g) ?? []) assert.ok(m === '{상대}' || m === '{방}', `${m} in ${s}`);
  }
  // 혼잣말에는 {상대} 를 쓰지 않는다 — 말 건넬 사람이 없다
  for (const s of all([L.SOLO, L.SOLO_SEQS, L.WORK_SOLO, L.TIME_SOLO, L.DAY_SOLO, L.SEASON_SOLO, L.COFFEE, L.FEED, L.AQUA, L.SKEL, L.BREEZE, L.CENTER_SOLO]))
    assert.ok(!s.includes('{상대}'), s);
});

test('주머니 — 한 바퀴 안에선 되풀이하지 않고, 바퀴 사이에도 바로 같은 것이 오지 않는다', () => {
  const list = ['a', 'b', 'c', 'd', 'e'];
  let prev = '';
  for (let round = 0; round < 20; round++) {
    const seen = new Set<string>();
    for (let i = 0; i < list.length; i++) {
      const x = draw(list);
      assert.ok(!seen.has(x)); assert.notEqual(x, prev);
      seen.add(x); prev = x;
    }
  }
});

test('자리표 채우기 — 지어 준 이름은 성을 빼고 「님」', () => {
  assert.equal(fill('{상대}, 커피?', undefined, { act: 'idle', room: '공용실', name: '김민준' }), '민준 님, 커피?');
  assert.equal(fill('{방} 일이요', { act: 'idle', room: '고객센터', name: '이서연' }, undefined), '고객센터 일이요');
  assert.equal(fill('{상대} {방}', undefined, undefined), '저기요 우리 방');
});

test('시간대 — 밤·아침·점심·오후·저녁, 요일, 계절', () => {
  assert.deepEqual(when(new Date(2026, 9, 27, 3, 0)), { time: 'night', day: null, season: 'autumn' });
  assert.equal(when(new Date(2026, 9, 26, 9, 0)).day, 'mon');
  assert.equal(when(new Date(2026, 9, 30, 12, 0)).time, 'lunch');
  assert.equal(when(new Date(2026, 9, 31, 15, 0)).day, 'weekend');
  assert.equal(when(new Date(2026, 0, 1, 19, 0)).season, 'winter');
});

test('무리마다 말이 나온다 — 자리표는 다 채워진다', () => {
  const groups = ['sofa', 'coffee', 'aqua', 'skel', 'breeze', 'desk', 'feed0', 'work:general', 'work:center', 'work:test', 'work:read'];
  for (const g of groups) for (const n of [1, 2, 3]) {
    const c = new Chatter();
    const ids = ['a', 'b', 'c'].slice(0, n);
    const info = (who: string) => ({ act: g === 'work:read' ? 'read' : 'code', room: '공용실', name: `김${who}준` });
    let said = 0;
    for (let t = 0; t < 2000; t += 0.5) {
      const s = c.step(g, ids, t, info);
      if (!s) continue;
      said++;
      assert.ok(ids.includes(s.who));
      assert.ok(!/\{/.test(s.text), s.text);
    }
    assert.ok(said > 0, `${g} ${n}`);
  }
});
