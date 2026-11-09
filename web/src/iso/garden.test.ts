// 잔디 방 — 공룡은 다니는 곳 밖으로 안 나가고, 고사리를 뜯고, 사람 발치에도 간다 (wetherilli 027)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Garden } from './garden.ts';
import type { Rect } from '../scene/layout.ts';

test('공룡은 다니는 곳 안에서 고사리를 뜯고 사람 발치에 간다', () => {
  const roam: Rect = [1, 3, 6, 6];
  const g = new Garden(roam, [{ at: [1.3, 4.5], fern: [0.5, 4.3] }, { at: [5.6, 5.8], fern: [6.5, 6.4] }], 'x');
  let ate = false, visited = false;
  for (let t = 0; t < 2000; t += 0.05) {
    g.step(0.05, [[3, 2.3]]);
    const d = g.dino;
    assert.ok(d.x >= roam[0] - 1e-6 && d.x <= roam[2] + 1e-6 && d.z >= roam[1] - 1e-6 && d.z <= roam[3] + 1e-6);
    if (g.eating) ate = true;
    if (d.doing === 'visit' && !g.walking && Math.hypot(d.x - 3, d.z - 2.3) < 1.3) visited = true;
  }
  assert.ok(ate && visited);
});
