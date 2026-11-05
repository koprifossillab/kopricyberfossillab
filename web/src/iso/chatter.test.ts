// 잡담 — 대사 묶음이 비지 않았는지, 자리표가 아는 것뿐인지, 주머니가 다 쓰기 전에 되풀이하지 않는지, 무리마다 말이 나오는지
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as L from './lines.ts';
import { Chatter, draw, fill, when, type Who } from './chatter.ts';

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
  for (const s of all([L.SOLO, L.SOLO_SEQS, L.WORK_SOLO, L.TIME_SOLO, L.DAY_SOLO, L.SEASON_SOLO, L.COFFEE, L.FEED, L.AQUA, L.SKEL, L.BREEZE, L.CENTER_SOLO,
    L.MENU_SOLO, L.MEAL_SOLO, L.QUEUE_SOLO, L.BURGER_QUEUE, L.GUKBAP_QUEUE, L.NOODLE_QUEUE, L.BURGER_EAT, L.GUKBAP_EAT, L.NOODLE_EAT,
    L.TASTE, L.MEAL_GRUMBLE, L.MEAL_DONE]))
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
  const groups = ['sofa', 'coffee', 'aqua', 'skel', 'breeze', 'desk', 'feed0', 'work:general', 'work:center', 'work:test', 'work:read',
    'order:burger', 'order:gukbap', 'meal:burger:t0', 'meal:gukbap:t0'];
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

test('식당 대사 — 끼니마다·가게마다 넉넉히, 「매일 먹어도 안 질린다」 류', () => {
  for (const m of ['breakfast', 'lunch', 'dinner']) {
    assert.ok(L.MEAL_SOLO[m].length >= 6, m);
    assert.ok(L.MEAL_DIALOGS[m].length >= 4, m);
  }
  for (const l of [L.BURGER_EAT, L.GUKBAP_EAT, L.NOODLE_EAT, L.MENU_SOLO, L.TASTE]) assert.ok(l.length >= 10);
  assert.ok(L.MEAL_GRUMBLE.length >= 15 && L.MEAL_DONE.length >= 10);
  assert.ok([...all(L)].filter((s) => s.includes('매일 먹어도 안 질린다')).length >= 4);
  // 대화는 둘 이상이 주고받는 것 — 한 줄짜리 대화 묶음이 없다
  for (const d of [...L.MENU_DIALOGS, ...L.QUEUE_DIALOGS, ...L.BURGER_QUEUE_DIALOGS, ...L.GUKBAP_QUEUE_DIALOGS,
    ...L.BURGER_EAT_DIALOGS, ...L.GUKBAP_EAT_DIALOGS, ...L.EAT_DIALOGS, ...Object.values(L.MEAL_DIALOGS).flat()]) assert.ok(d.length >= 2, d.join('/'));
});

// 혼자 있는 사람이 꺼내는 말을 모은다
function soloSaid(group: string, who: Partial<Who>, secs = 20000): Set<string> {
  const c = new Chatter(), out = new Set<string>();
  const info = () => ({ act: 'idle', room: '공용실', name: '김민준', ...who });
  for (let t = 0; t < secs; t += 0.5) { const s = c.step(group, ['a'], t, info); if (s) out.add(s.text); }
  return out;
}

test('식당 혼잣말 — 시킨 것에 맞는다 (버거집에서 국물 얘기, 국수 줄에서 버거 주문이 안 나온다)', () => {
  const pool = (...ls: string[][]) => new Set(ls.flat());
  const eatBurger = soloSaid('meal:burger:t0', { food: 'burger', meal: 'lunch' });
  const okB = pool(L.BURGER_EAT, L.TASTE, L.MEAL_SOLO.lunch, L.SOLO);
  for (const s of eatBurger) assert.ok(okB.has(s), s);
  assert.ok([...eatBurger].some((s) => L.BURGER_EAT.includes(s)));
  const orderNoodle = soloSaid('order:gukbap', { food: 'noodle', meal: 'dinner' });
  const okN = pool(L.NOODLE_QUEUE, L.MENU_SOLO, L.QUEUE_SOLO, L.MEAL_SOLO.dinner);
  for (const s of orderNoodle) assert.ok(okN.has(s), s);
  assert.ok([...orderNoodle].some((s) => L.NOODLE_QUEUE.includes(s)));
  // 시킨 것을 모르면 가게로 — 국밥집이면 국밥
  for (const s of soloSaid('meal:gukbap:t3', {})) assert.ok(pool(L.GUKBAP_EAT, L.TASTE, L.SOLO).has(s), s);
  // 끼니 말은 그 끼니 것만
  const breakfast = soloSaid('meal:gukbap:t1', { food: 'gukbap', meal: 'breakfast' });
  for (const s of breakfast) assert.ok(!L.MEAL_SOLO.dinner.includes(s) || L.MEAL_SOLO.breakfast.includes(s), s);
  assert.ok([...breakfast].some((s) => L.MEAL_SOLO.breakfast.includes(s)));
});

test('식당 대화 — 계산대 앞은 주문·메뉴 얘기, 식탁은 먹는 얘기', () => {
  const said = (group: string) => {
    const c = new Chatter(), out = new Set<string>();
    const info = (w: string) => ({ act: 'idle', room: '공용실', name: `김${w}준`, food: 'burger' as const, meal: 'lunch' as const });
    for (let t = 0; t < 20000; t += 0.5) { const s = c.step(group, ['a', 'b'], t, info); if (s) out.add(s.text.replace(/[a-z]준 님/g, '{상대}').replace(/공용실/g, '{방}')); }
    return out;
  };
  const lines = (...ds: string[][][]) => new Set(ds.flat(2));
  const order = said('order:burger');
  const okO = lines(L.BURGER_QUEUE_DIALOGS, L.QUEUE_DIALOGS, L.MENU_DIALOGS, L.MEAL_DIALOGS.lunch);
  for (const s of order) assert.ok(okO.has(s), s);
  const eat = said('meal:burger:t0');
  assert.ok([...eat].some((s) => L.BURGER_EAT_DIALOGS.flat().includes(s)));
  assert.ok(![...eat].some((s) => L.GUKBAP_EAT_DIALOGS.flat().includes(s) && !L.BURGER_EAT_DIALOGS.flat().includes(s)));
});
