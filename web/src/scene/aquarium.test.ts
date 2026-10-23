// 수족관 방 — 물고기는 수조 상자 안에만, 관람 자리는 막힌 곳에 갇히지 않고 출입구에서 걸어갈 수 있다.
import test from 'node:test';
import assert from 'node:assert/strict';
import { aquariumModule, AQUA_VIEW, TANKS, FISH_KINDS, AQUA_W, AQUA_D } from './aquarium.ts';
import { FishTank } from '../iso/fish.ts';
import { Nav } from './nav.ts';
import type { Rect } from './layout.ts';

const inside = ([x0, z0, x1, z1]: Rect, x: number, z: number) => x > x0 && x < x1 && z > z0 && z < z1;
const overlaps = (a: Rect, b: Rect) => a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3];

test('물고기는 600초 헤엄쳐도 수조 상자 밖으로 안 나간다', () => {
  const tank = new FishTank(TANKS);
  assert.ok(tank.fish.length >= TANKS.length * 2);
  const home = tank.fish.map((f) => TANKS.findIndex((t) => f.x >= t.box[0] && f.x <= t.box[2] && f.z >= t.box[1] && f.z <= t.box[3]));
  let moved = 0;
  const start = tank.fish.map((f) => [f.x, f.z]);
  for (let s = 0; s < 600 * 30; s++) {
    tank.step(1 / 30);
    tank.fish.forEach((f, i) => {
      const t = TANKS[home[i]];
      assert.ok(f.x >= t.box[0] && f.x <= t.box[2] && f.z >= t.box[1] && f.z <= t.box[3] && f.y >= t.y0 && f.y <= t.y1,
        `물고기 ${i} 가 수조 ${home[i]} 밖 (${f.x.toFixed(2)}, ${f.y.toFixed(2)}, ${f.z.toFixed(2)})`);
      assert.ok(Number.isFinite(f.rot) && (f.frame === 0 || f.frame === 1));
    });
  }
  tank.fish.forEach((f, i) => { if (Math.hypot(f.x - start[i][0], f.z - start[i][1]) > 0.05) moved++; });
  assert.ok(moved > tank.fish.length / 2, '물고기가 거의 움직이지 않았다');
  assert.ok(tank.fish.every((f) => f.kind >= 0 && f.kind < FISH_KINDS));
});

test('관람 자리는 막힌 곳에 갇히지 않는다 — 벤치 자리는 그 벤치 안에만', () => {
  const m = aquariumModule();
  const byId = new Map(m.items.map((it) => [it.id, it]));
  assert.ok(AQUA_VIEW.filter((v) => v.pose === 'sit').length >= 2);
  assert.ok(AQUA_VIEW.filter((v) => v.pose === 'stand').length >= 4);
  for (const v of AQUA_VIEW) {
    const [x, z] = v.at;
    assert.ok(x > 0 && x < AQUA_W && z > 0 && z < AQUA_D, `${v.at} 가 방 밖`);
    const hit = m.blocks.filter((r) => inside(r, x, z));
    if (v.on) {
      const on = byId.get(v.on);
      assert.ok(on, `${v.on} 가구가 없다`);
      assert.ok(inside(on!.box, x, z), `${v.at} 가 ${v.on} 위가 아니다`);
      for (const r of hit) assert.ok(overlaps(r, on!.box), `${v.at} 가 ${v.on} 말고 다른 것에 막혔다`);
    } else {
      assert.equal(hit.length, 0, `${v.at} 가 막힌 곳 안`);
    }
  }
});

test('출입구(왼쪽 벽)에서 관람 자리까지 길이 있다', () => {
  const m = aquariumModule();
  const nav = new Nav(AQUA_W, AQUA_D, m.blocks);
  const door: [number, number] = [0.2, 2.7];
  assert.ok(!nav.isBlocked(...door), '출입구가 막혔다');
  for (const v of AQUA_VIEW) {
    if (!v.on) assert.ok(!nav.isBlocked(...v.at), `${v.at} 칸이 막혔다`);
    const path = nav.findPath(door, v.at);
    assert.ok(path.length > 0, `${v.at} 까지 길이 없다`);
    const end = path[path.length - 1];
    assert.ok(Math.hypot(end[0] - v.at[0], end[1] - v.at[1]) < 0.3, `${v.at} 까지 못 간다 (${end})`);
  }
});

test('출입구는 왼쪽 벽 z 2.0~3.4, 오른쪽·앞은 열려 있다', () => {
  const m = aquariumModule();
  const walls = m.items.filter((it) => it.kind === 'partition').map((it) => it.box);
  for (let z = 2.05; z < 3.4; z += 0.05) assert.ok(!walls.some((r) => inside(r, 0, z)), `출입구 z=${z.toFixed(2)} 에 벽`);
  assert.ok(walls.some((r) => inside(r, 0, 1.0)) && walls.some((r) => inside(r, 0, 4.5)), '왼쪽 벽이 없다');
  for (let t = 0.2; t < AQUA_D; t += 0.1) assert.ok(!walls.some((r) => inside(r, AQUA_W - 0.03, t)), `오른쪽 z=${t.toFixed(1)} 에 벽`);
  for (let t = 0.2; t < AQUA_W; t += 0.1) assert.ok(!walls.some((r) => inside(r, t, AQUA_D - 0.03)), `앞 x=${t.toFixed(1)} 에 벽`);
});
