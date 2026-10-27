// 사막 방 — 전갈은 다니는 곳 밖으로 안 나가고, 선인장은 깨어 돌아다니다 집에 와서 다시 잔다
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Desert } from './desert.ts';
import type { Rect } from '../scene/layout.ts';

test('전갈은 다니는 곳 안, 선인장은 깨고·걷고·돌아와 잔다', () => {
  const roam: Rect = [1, 3, 6, 6], home: [number, number] = [5.5, 5.6];
  const d = new Desert(roam, home, 'x');
  let walked = false, sleptAgain = false, wasAway = false;
  for (let t = 0; t < 3000; t += 0.05) {
    d.step(0.05, [[3, 4]]);
    for (const s of d.scorpions) assert.ok(s.x >= roam[0] - 1e-6 && s.x <= roam[2] + 1e-6 && s.z >= roam[1] - 1e-6 && s.z <= roam[3] + 1e-6);
    if (d.cactus.pose === 'walk') walked = true;
    if (d.cactusAbout) wasAway = true;
    if (wasAway && d.cactus.pose === 'sleep') {
      sleptAgain = true;
      assert.ok(Math.hypot(d.cactus.x - home[0], d.cactus.z - home[1]) < 0.05, '잠은 집에서');
    }
  }
  assert.ok(walked && sleptAgain);
});
