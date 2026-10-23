// 수족관의 물고기 — 화면만의 연출. 수조 상자(scene/aquarium.ts 의 TANKS) 안을 천천히 헤엄친다:
// 목표점을 하나 잡아 몸을 조금씩 돌리며 가고, 닿거나 가끔 마음이 바뀌면 새 목표. 위아래로는 살짝 출렁인다.
// 좌표는 모듈 안의 것 — 세계 좌표로 옮기는 것은 부르는 쪽(Stage)이 한다.
import { FISH_KINDS } from '../scene/aquarium.ts';
import type { Rect } from '../scene/layout.ts';

export interface Fish {
  kind: number;
  x: number; y: number; z: number;
  rot: number;          // 머리가 보는 쪽 (atan2(dx, dz))
  frame: 0 | 1;         // 꼬리 자세
}

interface Swim { tank: number; tx: number; ty: number; tz: number; speed: number; t: number; bob: number; change: number }

const rand = (a: number, b: number) => a + Math.random() * (b - a);
const TURN = 1.6;       // 초당 도는 각(라디안)
const MARGIN = 0.04;    // 상자 벽에서 이만큼 안쪽에 목표를 잡는다

export class FishTank {
  fish: Fish[];
  private tanks: { box: Rect; y0: number; y1: number }[];
  private swim: Swim[];

  // 수조마다 바닥 넓이에 맞춰 둘~여섯 마리, 종류는 섞어서
  constructor(tanks: { box: Rect; y0: number; y1: number }[]) {
    this.tanks = tanks;
    this.fish = [];
    this.swim = [];
    let k = Math.floor(Math.random() * FISH_KINDS);
    tanks.forEach((tk, i) => {
      const [x0, z0, x1, z1] = tk.box;
      const n = Math.max(2, Math.min(6, Math.round((x1 - x0) * (z1 - z0) * 4)));
      for (let j = 0; j < n; j++) {
        const [x, y, z] = this.spot(i);
        this.fish.push({ kind: k++ % FISH_KINDS, x, y, z, rot: rand(-Math.PI, Math.PI), frame: 0 });
        const s: Swim = { tank: i, tx: x, ty: y, tz: z, speed: rand(0.1, 0.22), t: rand(0, 10), bob: rand(0, 6.28), change: 0 };
        this.retarget(s);
        this.swim.push(s);
      }
    });
  }

  private spot(i: number): [number, number, number] {
    const { box: [x0, z0, x1, z1], y0, y1 } = this.tanks[i];
    return [rand(x0 + MARGIN, x1 - MARGIN), rand(y0, y1), rand(z0 + MARGIN, z1 - MARGIN)];
  }

  private retarget(s: Swim): void {
    [s.tx, s.ty, s.tz] = this.spot(s.tank);
    s.change = rand(3, 9);
  }

  step(dt: number): void {
    this.fish.forEach((f, i) => {
      const s = this.swim[i];
      const { box: [x0, z0, x1, z1], y0, y1 } = this.tanks[s.tank];
      s.t += dt;
      s.change -= dt;
      const dx = s.tx - f.x, dz = s.tz - f.z, dist = Math.hypot(dx, dz);
      if (dist < 0.05 || s.change <= 0) this.retarget(s);
      // 몸을 목표 쪽으로 조금씩 돌리고, 머리가 보는 쪽으로 간다 — 돌면서 가니 곡선을 그린다
      let da = Math.atan2(dx, dz) - f.rot;
      da = Math.atan2(Math.sin(da), Math.cos(da));
      f.rot += Math.max(-TURN * dt, Math.min(TURN * dt, da));
      const ahead = Math.max(0.3, Math.cos(da));          // 등 뒤에 목표가 있으면 천천히
      const sp = s.speed * ahead * dt;
      f.x += Math.sin(f.rot) * sp;
      f.z += Math.cos(f.rot) * sp;
      f.y += (s.ty - f.y) * Math.min(1, dt * 0.6) + Math.sin(s.t * 1.3 + s.bob) * 0.02 * dt;
      // 상자 밖으로는 안 나간다 — 벽에 닿으면 멈추고 다음 목표로 돈다
      const cx = Math.min(x1, Math.max(x0, f.x)), cz = Math.min(z1, Math.max(z0, f.z));
      if (cx !== f.x || cz !== f.z) { f.x = cx; f.z = cz; this.retarget(s); }
      f.y = Math.min(y1, Math.max(y0, f.y));
      f.frame = Math.floor(s.t * (2 + s.speed * 10)) % 2 as 0 | 1;
    });
  }
}
