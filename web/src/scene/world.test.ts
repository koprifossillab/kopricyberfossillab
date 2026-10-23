// 길이 벽을 넘지 않는가 — 건물을 지어 주요 자리 모든 쌍의 길을 찾고, 길을 0.05 간격으로 따라가며 칸막이·벽 안에 들어가는지 본다.
// (사용자가 「사람들이 벽을 넘어다닌다」 고 했다 — 원인은 길이 없을 때 곧장 가던 것과 칸막이 틈)
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildWorld } from './world.ts';
import { Nav } from './nav.ts';
import { seatOf, waitSpotOf } from './world.ts';
import type { Rect } from './layout.ts';

const OFFICES = [
  { name: 'DiaRUGA', size: 'm' as const }, { name: 'ForGIA', size: 's' as const }, { name: 'GSM', size: 'l' as const },
  { name: 'rash-company', size: 'm' as const }, { name: 'Cropobite', size: 's' as const }, { name: 'confoinfo', size: 's' as const },
];

function wallsOf(w: ReturnType<typeof buildWorld>): Rect[] {
  return w.items.filter((it) => it.kind === 'partition' || it.kind === 'rashwall').map((it) => it.box);
}

function crosses(path: [number, number][], from: [number, number], walls: Rect[]): Rect | null {
  let p = from;
  for (const q of path) {
    const n = Math.max(1, Math.ceil(Math.hypot(q[0] - p[0], q[1] - p[1]) / 0.05));
    for (let k = 0; k <= n; k++) {
      const x = p[0] + ((q[0] - p[0]) * k) / n, z = p[1] + ((q[1] - p[1]) * k) / n;
      for (const r of walls) if (x > r[0] && x < r[2] && z > r[1] && z < r[3]) return r;
    }
    p = q;
  }
  return null;
}

for (const offices of [OFFICES.slice(0, 2), OFFICES]) {
  test(`사무실 ${offices.length}개 — 주요 자리 사이의 길이 벽을 넘지 않고, 길이 없는 곳이 없다`, () => {
    const w = buildWorld(offices);
    const nav = new Nav(w.w, w.d, w.blocks);
    const walls = wallsOf(w);
    const spots: [string, [number, number]][] = [
      ['문', w.door],
      ...w.desks.map((d, i) => [`책상${i}(${d.room})`, seatOf(d.at)] as [string, [number, number]]),
      ...w.desks.map((d, i) => [`대기${i}`, waitSpotOf(d.at)] as [string, [number, number]]),
      ...w.lounge.map((s, i) => [`휴게${i}`, s.at] as [string, [number, number]]),
      ...w.core.map((p, i) => [`코어${i}`, p] as [string, [number, number]]),
      ...w.bench.map((p, i) => [`현미경${i}`, p] as [string, [number, number]]),
      ...w.term.map((p, i) => [`tmux${i}`, p] as [string, [number, number]]),
      ...w.search.map((s, i) => [`자료실${i}`, s.at] as [string, [number, number]]),
      ...w.restroom.male.map((p, i) => [`남${i}`, p] as [string, [number, number]]),
      ...w.restroom.female.map((p, i) => [`여${i}`, p] as [string, [number, number]]),
      ...w.stand.map((p, i) => [`서기${i}`, p] as [string, [number, number]]),
    ];
    const bad: string[] = [];
    // 문에서 모든 자리로, 모든 자리에서 문으로, 그리고 휴게실 첫 자리와 서로
    const pairs: [number, number][] = [];
    for (let i = 1; i < spots.length; i++) pairs.push([0, i], [i, 0]);
    const lounge0 = spots.findIndex(([n]) => n === '휴게0');
    for (let i = 1; i < spots.length; i++) if (i !== lounge0) pairs.push([lounge0, i]);
    for (const [a, b] of pairs) {
      const [na, pa] = spots[a], [nb, pb] = spots[b];
      const path = nav.findPath(pa, pb);
      if (!path.length) { bad.push(`${na} → ${nb}: 길 없음`); continue; }
      const r = crosses(path, pa, walls);
      if (r) bad.push(`${na} → ${nb}: 벽 [${r.map((v) => v.toFixed(2)).join(', ')}] 을 넘는다`);
    }
    assert.deepEqual(bad.slice(0, 15), [], `${bad.length}건`);
  });
}
