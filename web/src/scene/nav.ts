// 격자 A* — 가구(layout.BLOCKS)를 막힌 칸으로 보고 길을 찾는다.
// Claw3D src/lib/office/pathfinding.ts 와 같은 생각(2D 격자 + A*)으로 새로 짰다.
import { W, D, BLOCKS } from './layout.ts';

const CELL = 0.25;
const NX = Math.round(W / CELL);
const NZ = Math.round(D / CELL);
const blocked = new Uint8Array(NX * NZ);
for (const [x0, z0, x1, z1] of BLOCKS) {
  for (let i = Math.max(0, Math.floor(x0 / CELL)); i < Math.min(NX, Math.ceil(x1 / CELL)); i++) {
    for (let j = Math.max(0, Math.floor(z0 / CELL)); j < Math.min(NZ, Math.ceil(z1 / CELL)); j++) blocked[j * NX + i] = 1;
  }
}

const cellOf = (x: number, z: number): [number, number] =>
  [Math.min(NX - 1, Math.max(0, Math.floor(x / CELL))), Math.min(NZ - 1, Math.max(0, Math.floor(z / CELL)))];
const centre = (i: number, j: number): [number, number] => [(i + 0.5) * CELL, (j + 0.5) * CELL];

// 막힌 칸 안에서 출발하면(의자에 앉아 있다가 일어날 때) 가장 가까운 빈칸까지 그냥 나간다
function nearestFree(i: number, j: number): [number, number] {
  if (!blocked[j * NX + i]) return [i, j];
  for (let r = 1; r < 12; r++) {
    for (let di = -r; di <= r; di++) for (let dj = -r; dj <= r; dj++) {
      const a = i + di, b = j + dj;
      if (a >= 0 && b >= 0 && a < NX && b < NZ && !blocked[b * NX + a]) return [a, b];
    }
  }
  return [i, j];
}

export function findPath(from: [number, number], to: [number, number]): [number, number][] {
  const [si, sj] = nearestFree(...cellOf(...from));
  const [ti, tj] = nearestFree(...cellOf(...to));
  const start = sj * NX + si, goal = tj * NX + ti;
  const g = new Float32Array(NX * NZ).fill(Infinity);
  const prev = new Int32Array(NX * NZ).fill(-1);
  const open: number[] = [start];
  const f = new Float32Array(NX * NZ).fill(Infinity);
  const h = (k: number) => {
    const dx = Math.abs((k % NX) - ti), dz = Math.abs(Math.floor(k / NX) - tj);
    return Math.max(dx, dz) + 0.414 * Math.min(dx, dz);
  };
  g[start] = 0; f[start] = h(start);
  const closed = new Uint8Array(NX * NZ);
  while (open.length) {
    let bi = 0;
    for (let n = 1; n < open.length; n++) if (f[open[n]] < f[open[bi]]) bi = n;
    const k = open[bi];
    open[bi] = open[open.length - 1]; open.pop();
    if (k === goal) break;
    if (closed[k]) continue;
    closed[k] = 1;
    const ci = k % NX, cj = Math.floor(k / NX);
    for (let di = -1; di <= 1; di++) for (let dj = -1; dj <= 1; dj++) {
      if (!di && !dj) continue;
      const a = ci + di, b = cj + dj;
      if (a < 0 || b < 0 || a >= NX || b >= NZ) continue;
      const n = b * NX + a;
      if (blocked[n] && n !== goal) continue;
      if (di && dj && (blocked[cj * NX + a] || blocked[b * NX + ci])) continue;   // 모서리를 질러가지 않는다
      const ng = g[k] + (di && dj ? 1.414 : 1);
      if (ng < g[n]) { g[n] = ng; f[n] = ng + h(n); prev[n] = k; open.push(n); }
    }
  }
  if (prev[goal] < 0 && goal !== start) return [to];   // 길이 없다 — 곧장 간다
  const cells: number[] = [];
  for (let k = goal; k !== -1; k = prev[k]) cells.push(k);
  cells.reverse();
  // 방향이 바뀌는 칸만 남긴다
  const pts: [number, number][] = [];
  for (let n = 1; n < cells.length - 1; n++) {
    const a = cells[n - 1], b = cells[n], c = cells[n + 1];
    if (b - a !== c - b) pts.push(centre(b % NX, Math.floor(b / NX)));
  }
  pts.push(to);
  return pts;
}
