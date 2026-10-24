// 수족관의 물고기 — 화면만의 연출. 수조 상자(scene/aquarium.ts 의 TANKS) 안을 천천히 헤엄친다:
// 목표점을 하나 잡아 몸을 조금씩 돌리며 가고, 닿거나 가끔 마음이 바뀌면 새 목표. 위아래로는 살짝 출렁인다.
// 물고기 말고 손님(GUESTS — 흰 가재·버제스 셰일 고생물)도 같은 길로 움직인다. 다만 crawl 은 모래 위(floor)에 붙어 기고
// 목표에 닿으면 잠깐 쉬며, low 는 바닥 가까이(y0 ~ y0+LOW)에서만 헤엄친다.
// 좌표는 모듈 안의 것 — 세계 좌표로 옮기는 것은 부르는 쪽(Stage)이 한다.
import { SWIM_KINDS, GUESTS, type CritterHow } from '../scene/aquarium.ts';
import type { Rect } from '../scene/layout.ts';

export interface Fish {
  kind: number;
  tank: number;         // 든 수조 (tanks 의 차례) — Stage 가 그 수조 그림과 겹쳐 그릴 때 쓴다
  x: number; y: number; z: number;
  rot: number;          // 머리가 보는 쪽 (atan2(dx, dz))
  frame: 0 | 1;         // 꼬리(다리·날개) 자세
}

type Tank = { box: Rect; y0: number; y1: number; floor?: number };
interface Swim { tank: number; how: CritterHow; tx: number; ty: number; tz: number; speed: number; t: number; bob: number; change: number; rest: number }

const rand = (a: number, b: number) => a + Math.random() * (b - a);
const TURN = 1.6;       // 초당 도는 각(라디안)
const MARGIN = 0.04;    // 상자 벽에서 이만큼 안쪽에 목표를 잡는다
const LOW = 0.12;       // low 가 다니는 높이 폭 (y0 위로)
// 모래 윗면 — TANKS 에 floor 가 없으면 y0 에서 짐작 (TANKS 는 y0 = 모래 + 0.14~0.16)
const floorOf = (t: Tank) => t.floor ?? t.y0 - 0.14;

export class FishTank {
  fish: Fish[];
  private tanks: Tank[];
  private swim: Swim[];

  // 수조마다 바닥 넓이에 맞춰 둘~여섯 마리, 종류는 섞어서. 손님이 든 수조는 그만큼 물고기를 줄인다(둘은 남긴다)
  constructor(tanks: Tank[]) {
    this.tanks = tanks;
    this.fish = [];
    this.swim = [];
    let k = Math.floor(Math.random() * SWIM_KINDS);
    tanks.forEach((tk, i) => {
      const [x0, z0, x1, z1] = tk.box;
      const guests = GUESTS.filter((g) => g.tank === i);
      const n = Math.max(2, Math.min(6, Math.round((x1 - x0) * (z1 - z0) * 4)) - guests.length);
      for (let j = 0; j < n; j++) this.add(i, k++ % SWIM_KINDS, 'swim', [0.1, 0.22]);
      for (const g of guests) this.add(i, g.kind, g.how, g.speed);
    });
  }

  private add(tank: number, kind: number, how: CritterHow, [s0, s1]: [number, number]): void {
    const s: Swim = { tank, how, tx: 0, ty: 0, tz: 0, speed: rand(s0, s1), t: rand(0, 10), bob: rand(0, 6.28), change: 0, rest: 0 };
    const [x, y, z] = this.spot(s);
    this.fish.push({ kind, tank, x, y, z, rot: rand(-Math.PI, Math.PI), frame: 0 });
    this.retarget(s);
    this.swim.push(s);
  }

  private spot(s: Swim): [number, number, number] {
    const t = this.tanks[s.tank], { box: [x0, z0, x1, z1], y0, y1 } = t;
    const y = s.how === 'crawl' ? floorOf(t) : s.how === 'low' ? rand(y0, Math.min(y1, y0 + LOW)) : rand(y0, y1);
    return [rand(x0 + MARGIN, x1 - MARGIN), y, rand(z0 + MARGIN, z1 - MARGIN)];
  }

  private retarget(s: Swim): void {
    [s.tx, s.ty, s.tz] = this.spot(s);
    s.change = rand(3, 9);
  }

  step(dt: number): void {
    this.fish.forEach((f, i) => {
      const s = this.swim[i];
      const t = this.tanks[s.tank], { box: [x0, z0, x1, z1], y0, y1 } = t;
      const crawl = s.how === 'crawl';
      if (s.rest > 0) { s.rest -= dt; return; }          // 기는 것은 목표에 닿으면 잠깐 멈춘다 (다리도 멈춤)
      s.t += dt;
      s.change -= dt;
      const dx = s.tx - f.x, dz = s.tz - f.z, dist = Math.hypot(dx, dz);
      if (dist < 0.05 || s.change <= 0) {
        if (crawl && dist < 0.05) s.rest = rand(1.5, 5);
        this.retarget(s);
      }
      // 몸을 목표 쪽으로 조금씩 돌리고, 머리가 보는 쪽으로 간다 — 돌면서 가니 곡선을 그린다
      let da = Math.atan2(dx, dz) - f.rot;
      da = Math.atan2(Math.sin(da), Math.cos(da));
      f.rot += Math.max(-TURN * dt, Math.min(TURN * dt, da));
      const ahead = Math.max(0.3, Math.cos(da));          // 등 뒤에 목표가 있으면 천천히
      const sp = s.speed * ahead * dt;
      f.x += Math.sin(f.rot) * sp;
      f.z += Math.cos(f.rot) * sp;
      if (crawl) f.y = floorOf(t);
      else f.y += (s.ty - f.y) * Math.min(1, dt * 0.6) + Math.sin(s.t * 1.3 + s.bob) * 0.02 * dt;
      // 상자 밖으로는 안 나간다 — 벽에 닿으면 멈추고 다음 목표로 돈다
      const cx = Math.min(x1, Math.max(x0, f.x)), cz = Math.min(z1, Math.max(z0, f.z));
      if (cx !== f.x || cz !== f.z) { f.x = cx; f.z = cz; this.retarget(s); }
      if (!crawl) f.y = Math.min(s.how === 'low' ? Math.min(y1, y0 + LOW) : y1, Math.max(y0, f.y));
      f.frame = Math.floor(s.t * (crawl ? 4 : 2 + s.speed * 10)) % 2 as 0 | 1;
    });
  }
}
