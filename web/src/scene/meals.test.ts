// 끼니 — 언제·얼마나 식당에 가나(meals.ts), 식당 자리 고르기와 먹다 불려 가기(director.ts)
import test from 'node:test';
import assert from 'node:assert/strict';
import { mealOf, mealPlan, MEALS, EAT_S, ORDER_S } from './meals.ts';
import { buildWorld } from './world.ts';
import { direct } from './director.ts';
import type { Agent } from '../types.ts';

const DAY = new Date(2026, 10, 5, 0, 0).getTime();
const at = (h: number) => DAY + h * 3600_000;

test('끼니 시간 — 아침 7–8 · 점심 12–14 · 저녁 18–20, 그 밖엔 아무도 안 간다', () => {
  assert.equal(mealOf(7.5), 'breakfast');
  assert.equal(mealOf(13.99), 'lunch');
  assert.equal(mealOf(19), 'dinner');
  for (const h of [6.9, 8, 10, 14, 17.5, 20, 23]) assert.equal(mealOf(h), null, String(h));
  for (let i = 0; i < 200; i++) for (const h of [3, 10.5, 15, 21]) assert.equal(mealPlan(`s${i}`, at(h), h), null);
});

test('끼니마다 한 번 — 가는 몫이 정한 만큼, 한 덩어리 시간(주문 → 먹기), 출발은 흩어진다', () => {
  for (const m of MEALS) {
    let went = 0;
    const starts: number[] = [];
    for (let i = 0; i < 600; i++) {
      const id = `session-${i}`;
      let first = -1, last = -1, runs = 0, prev = false, phases = '';
      for (let s = m.from * 3600; s < m.to * 3600; s += 5) {
        const p = mealPlan(id, at(s / 3600), s / 3600);
        if (p && !prev) runs++;
        if (p) { if (first < 0) first = s; last = s; if (!phases.endsWith(p.phase)) phases += (phases ? '>' : '') + p.phase; }
        prev = !!p;
      }
      if (first < 0) continue;
      went++;
      starts.push(first);
      assert.equal(runs, 1, `${id} 한 끼니에 한 번`);
      assert.equal(phases, 'order>eat', `${id} 주문 뒤에 먹기`);
      const len = last - first + 5;
      assert.ok(len >= ORDER_S[0] + EAT_S[0] - 10 && len <= ORDER_S[1] + EAT_S[1] + 10, `${id} ${len}초`);
    }
    const share = went / 600;
    assert.ok(Math.abs(share - m.odds) < 0.07, `${m.meal} ${share.toFixed(2)} ≈ ${m.odds}`);
    // 출발 시각이 끼니 앞쪽 반과 뒤쪽 반에 고루
    const mid = (m.from + (m.to - m.from) / 2) * 3600;
    const early = starts.filter((s) => s < mid).length / starts.length;
    assert.ok(early > 0.3 && early < 0.7, `${m.meal} 앞쪽 몫 ${early.toFixed(2)}`);
  }
});

const idle = (id: string, activity: Agent['activity'] = 'idle'): Agent => ({
  id, kind: 'session', name: id, project: 'GSM', activity, label: '', room: 'GSM', startedAt: 0, changedAt: 0,
});

test('식당 — 주문 자리에 섰다가 먹는 자리에 앉고(음식과 함께), 자리는 겹치지 않는다', () => {
  const w = buildWorld([{ name: 'GSM', size: 'l' }]);
  const agents = Array.from({ length: 40 }, (_, i) => idle(`a${i}`));
  const seen = { order: 0, eat: 0 };
  for (let s = 0; s < 600; s += 7) {
    const out = direct(w, agents, DAY + s * 1000, { hour: 12.5, forceMeal: true });
    const seats = new Set<string>();
    for (const p of out.values()) {
      if (p.group?.startsWith('order:')) { seen.order++; assert.equal(p.pose, 'stand'); }
      if (p.group?.startsWith('meal:')) {
        seen.eat++;
        assert.equal(p.pose, 'sit');
        assert.ok(p.food && p.dish && p.on, '음식·식탁 자리·의자');
        assert.ok(!seats.has(p.on!), `자리 ${p.on} 에 둘이 앉았다`);
        seats.add(p.on!);
        const shop = p.group.split(':')[1];
        assert.equal(shop === 'burger', p.food === 'burger');
      }
    }
  }
  assert.ok(seen.order > 0 && seen.eat > 0, JSON.stringify(seen));
});

test('먹다가 바빠지면 책상으로, 그 끼니엔 다시 식당에 오지 않는다', () => {
  const w = buildWorld([{ name: 'GSM', size: 'l' }]);
  // 점심 동안 먹는 때가 있는 사람을 하나 찾는다
  let id = '', t = 0;
  for (let i = 0; i < 100 && !id; i++) for (let s = 12 * 3600; s < 14 * 3600; s += 30) {
    const p = mealPlan(`p${i}`, at(s / 3600), s / 3600);
    if (p?.phase === 'eat') { id = `p${i}`; t = s; break; }
  }
  assert.ok(id);
  const h = t / 3600;
  assert.ok(direct(w, [idle(id)], at(h), { hour: h }).get(id)!.group?.startsWith('meal:'));
  assert.equal(direct(w, [idle(id, 'code')], at(h + 0.01), { hour: h + 0.01 }).get(id)!.pose, 'sit');
  assert.ok(!direct(w, [idle(id, 'code')], at(h + 0.01), { hour: h + 0.01 }).get(id)!.group, '일하러 갔다');
  const back = direct(w, [idle(id)], at(h + 0.02), { hour: h + 0.02 }).get(id)!;
  assert.ok(!back.group?.startsWith('meal:') && !back.group?.startsWith('order:'), `다시 쉬어도 식당엔 안 간다 (${back.group})`);
});
