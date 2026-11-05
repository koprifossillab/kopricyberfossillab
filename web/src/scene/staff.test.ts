// 식당가 점원·바깥 손님 (wetherilli 026) — 언제 있나(staff.ts), 어디 서나·앉나(director.ts)
import test from 'node:test';
import assert from 'node:assert/strict';
import { clerksAt, guestsAt, GUEST_EAT_S, GUEST_ORDER_S, WALK_IN_S, VISIT_ODDS } from './staff.ts';
import { buildWorld } from './world.ts';
import { direct, GUEST_MIN_FREE, type Extra } from './director.ts';
import type { Agent } from '../types.ts';

const DAY = new Date(2026, 10, 5, 0, 0).getTime();
const at = (h: number) => DAY + h * 3600_000;
const shifts = (h: number) => clerksAt(at(h), h).map((c) => `${c.shop}/${c.post}/${c.phase}`).sort().join(' ');

test('점원 — 끼니 한 시간 전 출근(준비), 끼니 동안 주문 받기, 끝나고 30분 마감, 그 뒤 퇴근', () => {
  for (const h of [3, 5.9, 8.6, 10, 10.9, 14.6, 16.9, 20.6, 23]) assert.equal(shifts(h), '', String(h));
  assert.equal(shifts(6.1), 'burger/counter/prep gukbap/counter/prep');
  assert.equal(shifts(7.5), 'burger/counter/serve gukbap/counter/serve');
  assert.equal(shifts(8.25), 'burger/counter/close gukbap/counter/close');
  // 점심 버거집만 둘 — 카운터와 주방
  assert.equal(shifts(11.5), 'burger/counter/prep burger/kitchen/prep gukbap/counter/prep');
  assert.equal(shifts(13), 'burger/counter/serve burger/kitchen/serve gukbap/counter/serve');
  assert.equal(shifts(14.3), 'burger/counter/close burger/kitchen/close gukbap/counter/close');
  assert.equal(shifts(17.5), 'burger/counter/prep gukbap/counter/prep');
  assert.equal(shifts(20.25), 'burger/counter/close gukbap/counter/close');
  // 한 끼니 동안은 같은 사람
  const ids = new Set<string>();
  for (let h = 11.1; h < 14.5; h += 0.1) for (const c of clerksAt(at(h), h)) if (c.shop === 'gukbap') ids.add(c.id);
  assert.equal(ids.size, 1);
});

test('바깥 손님 — 점심·저녁에만, 한 번에 4~6명쯤, 주문 → 먹기 → (셋에 하나) 구경', () => {
  for (const h of [7.5, 10, 11.9, 14.01, 16, 21]) assert.equal(guestsAt(at(h), h).length, 0, String(h));
  for (const [from, to] of [[12, 14], [18, 20]]) {
    let sum = 0, n = 0;
    const seen = new Map<string, string>();
    for (let s = (from + 0.25) * 3600; s < (to - 0.25) * 3600; s += 5) {
      const g = guestsAt(at(s / 3600), s / 3600);
      sum += g.length; n++;
      for (const x of g) { const p = seen.get(x.id) ?? ''; if (!p.endsWith(x.phase)) seen.set(x.id, p + (p ? '>' : '') + x.phase); }
    }
    const avg = sum / n;
    assert.ok(avg >= 3.6 && avg <= 6.2, `${from}시 평균 ${avg.toFixed(2)}명`);
    const runs = [...seen.values()];
    // 차례는 늘 주문 → 먹기 → 구경 (보는 창의 끝에 걸린 사람은 앞이나 뒤가 잘린다)
    for (const r of runs) assert.ok(['order', 'order>eat', 'order>eat>visit', 'eat', 'eat>visit', 'visit'].includes(r), r);
    const full = runs.filter((r) => r.startsWith('order>eat'));
    const visit = full.filter((r) => r.endsWith('visit')).length / full.length;
    assert.ok(Math.abs(visit - VISIT_ODDS) < 0.12, `구경 몫 ${visit.toFixed(2)}`);
  }
  // 한 사람이 머무는 길이 — 주문(걷기 포함)+먹기 범위 안
  const g = guestsAt(at(12.6), 12.6)[0];
  let first = -1, last = -1;
  for (let s = 12 * 3600; s < 14 * 3600; s += 2) if (guestsAt(at(s / 3600), s / 3600).some((x) => x.id === g.id && x.phase !== 'visit')) { if (first < 0) first = s; last = s; }
  const len = last - first + 2;
  assert.ok(len >= WALK_IN_S + GUEST_ORDER_S[0] + GUEST_EAT_S[0] - 4 && len <= WALK_IN_S + GUEST_ORDER_S[1] + GUEST_EAT_S[1] + 4, `${len}초`);
});

const idle = (id: string): Agent => ({ id, kind: 'session', name: id, project: 'GSM', activity: 'idle', label: '', room: 'GSM', startedAt: 0, changedAt: 0 });

test('식당 — 손님·점원은 세션 사람 자리를 뺏지 않고, 자리가 모자라면 손님이 오지 않는다', () => {
  const w = buildWorld([{ name: 'GSM', size: 'l' }]);
  const seats = w.dining.flatMap((d) => d.seats.map((s) => s.key));
  for (const crowd of [0, 12, 60]) {
    const agents = Array.from({ length: crowd }, (_, i) => idle(`a${i}`));
    let guestsSeen = 0;
    for (let s = 12.2 * 3600; s < 13.8 * 3600; s += 20) {
      const h = s / 3600;
      const extras: Extra[] = [];
      const out = direct(w, agents, at(h), { hour: h, forceMeal: crowd > 0, extras });
      const taken = new Map<string, string>();
      for (const [id, p] of out) if (p.on && seats.includes(p.on)) {
        assert.ok(!taken.has(p.on), `${p.on} 에 ${taken.get(p.on)} 와 ${id}`);
        taken.set(p.on, id);
      }
      // 세션 사람만 있을 때와 같은 자리 — 손님이 끼어도 세션 사람 자리는 그대로
      const alone = direct(w, agents, at(h), { hour: h, forceMeal: crowd > 0 });
      for (const a of agents) assert.deepEqual(out.get(a.id)!.target, alone.get(a.id)!.target);
      guestsSeen += extras.filter((e) => e.role === 'guest').length;
      for (const e of extras) assert.ok(out.has(e.id));
    }
    if (crowd === 0) assert.ok(guestsSeen > 50, `빈 식당엔 손님이 온다 (${guestsSeen})`);
    if (crowd === 60) assert.equal(guestsSeen, 0, '세션 사람으로 가득 차면 손님이 오지 않는다');
  }
  assert.ok(GUEST_MIN_FREE >= 2);
});

test('점원 — 준비 땐 조리대(김), 주문하는 사람이 있으면 카운터에서 받고, 마감엔 식탁을 닦는다', () => {
  const w = buildWorld([{ name: 'GSM', size: 'l' }]);
  const place = (h: number, agents: Agent[] = [], force = false) => {
    const extras: Extra[] = [];
    const out = direct(w, agents, at(h), { hour: h, forceMeal: force, extras });
    return extras.filter((e) => e.role === 'clerk').map((e) => ({ e, p: out.get(e.id)! }));
  };
  const burger = w.dining.find((d) => d.shop === 'burger')!.staff!;
  for (const { e, p } of place(11.4)) {
    assert.equal(e.phase, 'prep');
    const st = w.dining.find((d) => d.shop === e.shop)!.staff!;
    assert.ok(st.stations.some((s) => s.at === p.target), `${e.id} 조리대 앞`);
  }
  // 점심 준비 — 버거집 둘은 서로 다른 조리대
  const two = place(11.4).filter(({ e }) => e.shop === 'burger');
  assert.equal(two.length, 2);
  assert.notDeepEqual(two[0].p.target, two[1].p.target);
  assert.ok(place(11.4).some(({ p }) => p.cook), '조리하는 사람이 있다');
  // 주문하는 세션 사람이 있으면 카운터 안에서 받는다
  let served = 0;
  for (let s = 0; s < 400; s += 10) {
    const out = direct(w, [idle('x1'), idle('x2'), idle('x3')], DAY + 12.5 * 3600_000 + s * 1000, { hour: 12.5, forceMeal: true, extras: [] });
    const ordering = [...out.values()].some((p) => p.group === 'order:burger');
    const extras: Extra[] = [];
    const out2 = direct(w, [idle('x1'), idle('x2'), idle('x3')], DAY + 12.5 * 3600_000 + s * 1000, { hour: 12.5, forceMeal: true, extras });
    const counter = extras.find((e) => e.role === 'clerk' && e.shop === 'burger' && e.post === 'counter')!;
    if (ordering) { assert.deepEqual(out2.get(counter.id)!.target, burger.counter.at); assert.equal(out2.get(counter.id)!.group, 'order:burger'); served++; }
  }
  assert.ok(served > 0);
  for (const { e, p } of place(14.2)) {
    assert.equal(e.phase, 'close');
    assert.ok(w.dining.find((d) => d.shop === e.shop)!.staff!.wipe.some((s) => s.at === p.target), `${e.id} 식탁 닦기`);
  }
});

test('바깥 손님 구경 — 테라스 수족관·공룡 자리 가운데 세션 사람이 안 쓴 곳만, 같은 자리에 둘이 서지 않는다', () => {
  const w = buildWorld([{ name: 'GSM', size: 'l' }]);
  const views = new Set([...(w.aqua?.view ?? []).map((v) => v.at), ...(w.pen?.feed ?? []).map((f) => f.at)]);
  let visits = 0;
  for (let s = 12.1 * 3600; s < 13.9 * 3600; s += 15) {
    const h = s / 3600;
    const extras: Extra[] = [];
    const out = direct(w, [], at(h), { hour: h, extras });
    const used = new Set<[number, number]>();
    for (const e of extras.filter((x) => x.phase === 'visit')) {
      const t = out.get(e.id)!.target;
      assert.ok(views.has(t), '구경 자리');
      assert.ok(!used.has(t), '한 자리에 둘');
      used.add(t); visits++;
    }
  }
  assert.ok(visits > 10, String(visits));
});
