// 흙바닥 방 — 앵무새는 나는 범위 밖으로 안 나가고, 앉고·날고·땅에 내려앉고·맴돌고, 한 횃대에 둘이 앉지 않는다 (wetherilli 029)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Aviary } from './parrots.ts';
import type { Rect } from '../scene/layout.ts';

test('앵무새는 범위 안에서 앉고·날고·땅에 내리고·맴돌며, 횃대 하나엔 하나만', () => {
  const fly: Rect = [0.5, 0.2, 6.5, 6.5], ground: Rect = [1, 3.4, 5.8, 6.1];
  const perches: [number, number, number][] = [[1.35, 1.45, 4.9], [1.75, 1.45, 4.9], [5.1, 1.45, 5.3], [5.5, 1.45, 5.3], [3.2, 2.02, 0.3], [3.8, 2.02, 0.3]];
  const av = new Aviary(perches, ground, fly, 'x');
  assert.equal(av.parrots.length, 3);
  const seen = new Set<string>();
  let talks = 0;
  for (let t = 0; t < 3000; t += 0.05) {
    av.step(0.05);
    for (const p of av.parrots) {
      seen.add(p.state);
      assert.ok(p.x >= fly[0] - 1e-6 && p.x <= fly[2] + 1e-6 && p.z >= fly[1] - 1e-6 && p.z <= fly[3] + 1e-6, `${p.x},${p.z}`);
      assert.ok(p.y >= -1e-6 && p.y < 3.1, `높이 ${p.y}`);
    }
    const seats = av.parrots.filter((p) => p.state === 'sit').map((p) => p.seat);
    assert.equal(new Set(seats).size, seats.length, '한 횃대에 둘');
    for (const p of av.talkers()) { av.talked(p); talks++; }
  }
  for (const s of ['sit', 'ground', 'fly', 'circle']) assert.ok(seen.has(s), s);
  assert.ok(talks > 10);
});
