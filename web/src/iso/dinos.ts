// 공룡 방의 콤프소그나투스 — 화면만의 연출. 울타리 안을 거닐다 멈추고, 두리번거리고, 먹이통에서 먹는다.
// 먹이 주는 사람이 울타리 앞에 서 있으면 가장 가까운 공룡이 그 앞으로 와서 받아먹는다.
import { DINO_COLORS, DINO_FRAMES, type DinoPose } from '../scene/dino.ts';
import type { Rect } from '../scene/layout.ts';

export interface Dino {
  color: number;
  x: number; z: number; rot: number;
  tx: number; tz: number;
  pose: DinoPose;
  frame: number;
  t: number;            // 걸음 위상
  wait: number;         // 이만큼 더 그 자세로
  feedBy: string | null;   // 먹이를 주는 사람 (그 앞에 간다)
}

const SPEED = 0.75;
const rand = (a: number, b: number) => a + Math.random() * (b - a);

export class DinoPen {
  dinos: Dino[];
  private rect: Rect;
  private feeder: [number, number];

  constructor(rect: Rect, feeder: [number, number], n = 3) {
    this.rect = rect;
    this.feeder = feeder;
    this.dinos = Array.from({ length: n }, (_, i) => {
      const [x, z] = this.randomSpot();
      return { color: DINO_COLORS[i % DINO_COLORS.length], x, z, rot: Math.random() * 6.28, tx: x, tz: z, pose: 'look', frame: 0, t: 0, wait: rand(0.5, 3), feedBy: null };
    });
  }

  private randomSpot(): [number, number] {
    const [x0, z0, x1, z1] = this.rect;
    return [rand(x0 + 0.4, x1 - 0.4), rand(z0 + 0.4, z1 - 0.4)];
  }

  // feeders: 지금 울타리 앞에 서서 먹이를 주는 사람과, 공룡이 와야 할 자리
  step(dt: number, feeders: { id: string; dino: [number, number] }[]): void {
    const want = new Map(feeders.map((f) => [f.id, f.dino]));
    for (const d of this.dinos) if (d.feedBy && !want.has(d.feedBy)) { d.feedBy = null; d.wait = 0; }
    for (const f of feeders) {
      if (this.dinos.some((d) => d.feedBy === f.id)) continue;
      // 놀고 있는 공룡 가운데 가장 가까운 놈이 간다
      const free = this.dinos.filter((d) => !d.feedBy).sort((a, b) =>
        Math.hypot(a.x - f.dino[0], a.z - f.dino[1]) - Math.hypot(b.x - f.dino[0], b.z - f.dino[1]));
      if (free[0]) { free[0].feedBy = f.id; free[0].tx = f.dino[0]; free[0].tz = f.dino[1]; free[0].wait = 0; }
    }
    for (const d of this.dinos) {
      const dx = d.tx - d.x, dz = d.tz - d.z, dist = Math.hypot(dx, dz);
      if (dist > 0.03) {
        const sp = SPEED * dt;
        if (dist <= sp) { d.x = d.tx; d.z = d.tz; } else { d.x += (dx / dist) * sp; d.z += (dz / dist) * sp; }
        d.rot = Math.atan2(dx, dz);
        d.pose = 'walk';
        d.t += dt;
        d.frame = Math.floor(d.t * 7) % DINO_FRAMES;
        continue;
      }
      if (d.feedBy) {
        // 사람 쪽을 보고 받아먹는다
        d.pose = Math.floor(d.t * 0.8) % 3 === 0 ? 'look' : 'eat';
        d.t += dt;
        continue;
      }
      d.wait -= dt;
      if (d.wait > 0) continue;
      // 다음 할 일 — 먹이통 20%, 두리번 30%, 아니면 어딘가로
      const r = Math.random();
      if (r < 0.2) { [d.tx, d.tz] = [this.feeder[0] + rand(-0.3, 0.3), this.feeder[1] + rand(-0.05, 0.1)]; d.wait = rand(3, 6); d.pose = 'eat'; }
      else if (r < 0.5) { d.pose = 'look'; d.wait = rand(1.5, 4); }
      else { [d.tx, d.tz] = this.randomSpot(); d.wait = rand(0.5, 2.5); }
      if (d.pose !== 'look' && Math.hypot(d.tx - d.x, d.tz - d.z) < 0.05) d.pose = 'eat';
    }
  }
}
