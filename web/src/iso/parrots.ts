// 흙바닥 방의 앵무새 — 화면만의 연출 (wetherilli 029).
// 횃대·책장 위에 앉아 있다가 다른 앉을 곳으로 포물선을 그리며 날아가고, 가끔 방을 한두 바퀴 돌고, 땅에 내려앉아 흙을 쫀다.
// 앉아 있을 때 가끔 사람 말을 흉내 낸다(talk — 글은 화면이 lines.ts 에서 고른다).
import { PARROT_FRAMES, PARROT_KINDS, type ParrotPose } from '../scene/parrot.ts';
import type { Rect } from '../scene/layout.ts';

type P3 = [number, number, number];
export interface Parrot {
  kind: number;
  x: number; y: number; z: number; rot: number;
  pose: ParrotPose; frame: number; t: number;
  state: 'sit' | 'ground' | 'fly' | 'circle';
  wait: number;                 // 앉아 있을 남은 시간
  seat: number;                 // 앉은 횃대 차례 (-1 은 땅·하늘)
  from: P3; to: P3; toSeat: number; prog: number; dur: number;   // 날기
  ang: number; turns: number;   // 맴돌기
  talkIn: number;               // 다음 흉내까지
}

const rand = (a: number, b: number) => a + Math.random() * (b - a);
const SPEED = 1.7;
const CIRCLE_Y = 2.35;

export class Aviary {
  parrots: Parrot[];
  readonly room: string;
  private perches: P3[];
  private ground: Rect;
  private fly: Rect;

  constructor(perches: P3[], ground: Rect, fly: Rect, room: string, n = 3) {
    this.perches = perches; this.ground = ground; this.fly = fly; this.room = room;
    this.parrots = Array.from({ length: Math.min(n, perches.length) }, (_, i) => {
      const [x, y, z] = perches[i * 2 % perches.length];
      return {
        kind: i % PARROT_KINDS, x, y, z, rot: Math.PI / 4, pose: 'perch', frame: 0, t: 0, state: 'sit', wait: rand(2, 10), seat: i * 2 % perches.length,
        from: [x, y, z], to: [x, y, z], toSeat: -1, prog: 0, dur: 1, ang: 0, turns: 0, talkIn: rand(8, 40),
      } as Parrot;
    });
  }

  private taken(i: number, me: Parrot): boolean { return this.parrots.some((p) => p !== me && (p.seat === i || p.toSeat === i)); }
  private center(): [number, number] { const [x0, z0, x1, z1] = this.fly; return [(x0 + x1) / 2, (z0 + z1) / 2]; }

  // 날아가는 중이고 사람 머리 근처(가로 1.0 안)를 지나는가 — 화면이 그 사람에게 한마디 하게
  swoops(x: number, z: number): boolean {
    return this.parrots.some((p) => (p.state === 'fly' || p.state === 'circle') && p.y > 0.6 && Math.hypot(p.x - x, p.z - z) < 1.0);
  }
  // 흉내 낼 차례가 된 앵무새 (앉아 있을 때만) — 화면이 말풍선을 띄우고 나면 다음 차례를 잡는다
  talkers(): Parrot[] { return this.parrots.filter((p) => (p.state === 'sit' || p.state === 'ground') && p.talkIn <= 0); }
  talked(p: Parrot): void { p.talkIn = rand(30, 80); }

  private takeOff(p: Parrot, to: P3, seat: number): void {
    p.from = [p.x, p.y, p.z]; p.to = to; p.toSeat = seat; p.seat = -1;
    p.prog = 0; p.dur = Math.hypot(to[0] - p.x, to[1] - p.y, to[2] - p.z) / SPEED + 0.4;
    p.state = 'fly';
  }
  private next(p: Parrot): void {
    const r = Math.random();
    if (r < 0.2) {   // 방을 한두 바퀴
      const [cx, cz] = this.center();
      p.ang = Math.atan2(p.x - cx, p.z - cz);
      const R = this.radius();
      this.takeOff(p, [cx + Math.sin(p.ang) * R, CIRCLE_Y, cz + Math.cos(p.ang) * R], -2);
      p.turns = 1 + Math.floor(Math.random() * 2);
      return;
    }
    if (r < 0.45) {   // 땅으로
      const [x0, z0, x1, z1] = this.ground;
      this.takeOff(p, [rand(x0, x1), 0, rand(z0, z1)], -1);
      return;
    }
    const free = this.perches.map((_, i) => i).filter((i) => i !== p.seat && !this.taken(i, p));
    if (!free.length) { p.wait = rand(3, 8); return; }
    const i = free[Math.floor(Math.random() * free.length)];
    this.takeOff(p, this.perches[i], i);
  }
  private radius(): number { const [x0, z0, x1, z1] = this.fly; return Math.max(0.8, Math.min(x1 - x0, z1 - z0) / 2 - 0.7); }

  step(dt: number): void {
    for (const p of this.parrots) {
      p.t += dt;
      if (p.state === 'fly') {
        p.prog = Math.min(1, p.prog + dt / p.dur);
        const k = p.prog, e = k * k * (3 - 2 * k);
        const nx = p.from[0] + (p.to[0] - p.from[0]) * e, nz = p.from[2] + (p.to[2] - p.from[2]) * e;
        // 솟는 높이 — 멀수록 높게, 그러나 천장(3.2) 밑 2.75 를 넘지 않게
        const top = Math.max(p.from[1], p.to[1]);
        const bump = Math.sin(Math.PI * k) * Math.max(0, Math.min(0.8, 0.25 + Math.hypot(p.to[0] - p.from[0], p.to[2] - p.from[2]) * 0.12, 2.75 - top));
        const ny = p.from[1] + (p.to[1] - p.from[1]) * e + bump;
        if (Math.hypot(nx - p.x, nz - p.z) > 1e-4) p.rot = Math.atan2(nx - p.x, nz - p.z);
        p.x = nx; p.y = ny; p.z = nz;
        p.pose = 'fly'; p.frame = Math.floor(p.t * 9) % PARROT_FRAMES;
        if (k < 1) continue;
        if (p.toSeat === -2) { p.state = 'circle'; p.toSeat = -1; p.wait = 0; continue; }
        if (p.toSeat >= 0) { p.seat = p.toSeat; p.toSeat = -1; p.state = 'sit'; p.wait = rand(6, 22); }
        else { p.state = 'ground'; p.wait = rand(4, 12); }
        p.pose = 'perch'; p.rot = Math.PI / 4 + rand(-0.8, 0.8);
        continue;
      }
      if (p.state === 'circle') {
        const [cx, cz] = this.center(), R = this.radius();
        const w = SPEED / R;
        p.ang += w * dt;
        p.x = cx + Math.sin(p.ang) * R; p.z = cz + Math.cos(p.ang) * R; p.y = CIRCLE_Y + Math.sin(p.t * 2) * 0.12;
        p.rot = p.ang + Math.PI / 2;   // 진행 방향 (반시계)
        p.pose = 'fly'; p.frame = Math.floor(p.t * 9) % PARROT_FRAMES;
        p.wait -= w * dt;
        if (p.wait <= -2 * Math.PI * p.turns) { p.wait = 0; this.next(p); }
        continue;
      }
      // 앉아 있다 — 땅에선 쪼기와 두리번을 번갈아
      p.talkIn -= dt;
      if (p.state === 'ground') p.pose = Math.floor(p.t * 0.8) % 3 === 0 ? 'perch' : 'peck';
      p.wait -= dt;
      if (p.wait > 0) continue;
      p.wait = 0;
      this.next(p);
    }
  }
}
