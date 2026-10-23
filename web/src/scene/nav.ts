// 격자 A* — 건물(world.ts)의 막힌 곳(칸막이·벽·가구)을 막힌 칸으로 보고 길을 찾는다.
// Claw3D src/lib/office/pathfinding.ts 와 같은 생각(2D 격자 + A*)으로 새로 짰다. 건물이 바뀌면 새로 만든다.
//
// 벽을 넘지 않게 지키는 것:
//  - 길이 없으면 곧장 가지 않는다 — 제자리에 선다 (예전에는 [to] 를 돌려 벽을 뚫고 걸었다)
//  - 막힌 칸에 있는 목적지(의자 위)는 가장 가까운 빈칸까지 걷고 마지막 한 걸음만 들어간다
//  - 대각선은 양옆 두 칸이 다 비어야 간다
import type { Rect } from './layout.ts';

const CELL = 0.25;

export class Nav {
  readonly nx: number;
  readonly nz: number;
  private blocked: Uint8Array;

  constructor(w: number, d: number, blocks: Rect[]) {
    this.nx = Math.ceil(w / CELL);
    this.nz = Math.ceil(d / CELL);
    this.blocked = new Uint8Array(this.nx * this.nz);
    for (const [x0, z0, x1, z1] of blocks) {
      for (let i = Math.max(0, Math.floor(x0 / CELL)); i < Math.min(this.nx, Math.ceil(x1 / CELL)); i++) {
        for (let j = Math.max(0, Math.floor(z0 / CELL)); j < Math.min(this.nz, Math.ceil(z1 / CELL)); j++) this.blocked[j * this.nx + i] = 1;
      }
    }
  }

  isBlocked(x: number, z: number): boolean {
    const [i, j] = this.cellOf(x, z);
    return !!this.blocked[j * this.nx + i];
  }

  private cellOf(x: number, z: number): [number, number] {
    return [Math.min(this.nx - 1, Math.max(0, Math.floor(x / CELL))), Math.min(this.nz - 1, Math.max(0, Math.floor(z / CELL)))];
  }

  private centre(i: number, j: number): [number, number] {
    return [(i + 0.5) * CELL, (j + 0.5) * CELL];
  }

  // 막힌 칸이면 가장 가까운 빈칸 (의자 위에서 일어날 때, 의자 위로 갈 때)
  private nearestFree(i: number, j: number): [number, number] {
    if (!this.blocked[j * this.nx + i]) return [i, j];
    for (let r = 1; r < 16; r++) {
      let best: [number, number] | null = null, bd = Infinity;
      for (let di = -r; di <= r; di++) for (let dj = -r; dj <= r; dj++) {
        const a = i + di, b = j + dj;
        if (a < 0 || b < 0 || a >= this.nx || b >= this.nz || this.blocked[b * this.nx + a]) continue;
        const dd = di * di + dj * dj;
        if (dd < bd) { bd = dd; best = [a, b]; }
      }
      if (best) return best;
    }
    return [i, j];
  }

  // 길(꺾이는 점들, 끝은 to). 길이 없으면 빈 배열 — 부르는 쪽은 제자리에 선다
  findPath(from: [number, number], to: [number, number]): [number, number][] {
    const { nx, nz, blocked } = this;
    const [si, sj] = this.nearestFree(...this.cellOf(...from));
    const [ti, tj] = this.nearestFree(...this.cellOf(...to));
    const start = sj * nx + si, goal = tj * nx + ti;
    const pts: [number, number][] = [];
    const s0 = this.cellOf(...from);
    if (s0[0] !== si || s0[1] !== sj) pts.push(this.centre(si, sj));   // 막힌 칸에서 빈칸으로 먼저 나온다
    if (start !== goal) {
      const g = new Float32Array(nx * nz).fill(Infinity);
      const f = new Float32Array(nx * nz).fill(Infinity);
      const prev = new Int32Array(nx * nz).fill(-1);
      const closed = new Uint8Array(nx * nz);
      const open: number[] = [start];
      const h = (k: number) => {
        const dx = Math.abs((k % nx) - ti), dz = Math.abs(Math.floor(k / nx) - tj);
        return Math.max(dx, dz) + 0.414 * Math.min(dx, dz);
      };
      g[start] = 0; f[start] = h(start);
      let found = false;
      while (open.length) {
        let bi = 0;
        for (let n = 1; n < open.length; n++) if (f[open[n]] < f[open[bi]]) bi = n;
        const k = open[bi];
        open[bi] = open[open.length - 1]; open.pop();
        if (k === goal) { found = true; break; }
        if (closed[k]) continue;
        closed[k] = 1;
        const ci = k % nx, cj = Math.floor(k / nx);
        for (let di = -1; di <= 1; di++) for (let dj = -1; dj <= 1; dj++) {
          if (!di && !dj) continue;
          const a = ci + di, b = cj + dj;
          if (a < 0 || b < 0 || a >= nx || b >= nz) continue;
          const n = b * nx + a;
          if (blocked[n]) continue;
          if (di && dj && (blocked[cj * nx + a] || blocked[b * nx + ci])) continue;   // 모서리를 질러가지 않는다
          const ng = g[k] + (di && dj ? 1.414 : 1);
          if (ng < g[n]) { g[n] = ng; f[n] = ng + h(n); prev[n] = k; open.push(n); }
        }
      }
      if (!found) return [];
      const cells: number[] = [];
      for (let k = goal; k !== -1; k = prev[k]) cells.push(k);
      cells.reverse();
      // 방향이 바뀌는 칸만 남긴다
      for (let n = 1; n < cells.length - 1; n++) {
        const a = cells[n - 1], b = cells[n], c = cells[n + 1];
        if (b - a !== c - b) pts.push(this.centre(b % nx, Math.floor(b / nx)));
      }
      pts.push(this.centre(ti, tj));
    }
    pts.push(to);   // 마지막 한 걸음 (의자 위 같은 막힌 칸이면 이 한 걸음만 들어간다)
    return pts;
  }
}
