// 잔디 방의 작은 공룡 — 화면만의 연출 (wetherilli 027). 그림은 공룡 울타리의 콤프소그나투스를 그대로 쓴다(dinos.webp).
// 잔디 위를 종종걸음으로 다니다 멈춰 두리번거리고, 고사리 앞에 가서 잎을 뜯고, 가끔 사람 발치로 가서 올려다본다.
import { DINO_COLORS, DINO_FRAMES, type DinoPose } from '../scene/dino.ts';
import type { Rect } from '../scene/layout.ts';

export interface Critter {
  color: number;
  x: number; z: number; rot: number;
  tx: number; tz: number;
  pose: DinoPose; frame: number; t: number; wait: number;
  doing: 'roam' | 'nibble' | 'visit';   // 지금 가는 까닭 — 닿으면 할 일
  face: number | null;                  // 닿으면 볼 쪽 (고사리·사람)
}

const SPEED = 0.85;
const rand = (a: number, b: number) => a + Math.random() * (b - a);

export class Garden {
  dino: Critter;
  readonly room: string;
  private roam: Rect;
  private nibble: { at: [number, number]; fern: [number, number] }[];

  constructor(roam: Rect, nibble: { at: [number, number]; fern: [number, number] }[], room: string) {
    this.roam = roam; this.nibble = nibble; this.room = room;
    const [x, z] = this.spot();
    this.dino = { color: DINO_COLORS[2], x, z, rot: Math.random() * 6.28, tx: x, tz: z, pose: 'look', frame: 0, t: 0, wait: rand(1, 3), doing: 'roam', face: null };
  }

  private spot(): [number, number] {
    const [x0, z0, x1, z1] = this.roam;
    return [rand(x0, x1), rand(z0, z1)];
  }
  private clamp(x: number, z: number): [number, number] {
    const [x0, z0, x1, z1] = this.roam;
    return [Math.min(x1, Math.max(x0, x)), Math.min(z1, Math.max(z0, z))];
  }

  get walking(): boolean { return this.dino.pose === 'walk'; }
  get eating(): boolean { return this.dino.doing === 'nibble' && this.dino.pose === 'eat'; }

  // people: 이 방 근처에 서거나 앉은 사람 자리 — 공룡이 가끔 그 발치로 간다
  step(dt: number, people: [number, number][]): void {
    const d = this.dino;
    const dx = d.tx - d.x, dz = d.tz - d.z, dist = Math.hypot(dx, dz);
    if (dist > 0.03) {
      const sp = SPEED * dt;
      if (dist <= sp) { d.x = d.tx; d.z = d.tz; } else { d.x += (dx / dist) * sp; d.z += (dz / dist) * sp; }
      d.rot = Math.atan2(dx, dz);
      d.pose = 'walk';
      d.t += dt;
      d.frame = Math.floor(d.t * 8) % DINO_FRAMES;
      return;
    }
    if (d.pose === 'walk') {
      // 닿았다 — 고사리면 뜯고, 사람이면 올려다보고, 아니면 두리번
      if (d.face !== null) d.rot = d.face;
      d.pose = d.doing === 'nibble' ? 'eat' : 'look';
      d.wait = d.doing === 'nibble' ? rand(4, 9) : d.doing === 'visit' ? rand(2.5, 5) : rand(0.8, 3);
      return;
    }
    d.t += dt;
    if (d.doing === 'nibble') d.pose = Math.floor(d.t * 0.9) % 4 === 0 ? 'look' : 'eat';   // 뜯다가 가끔 고개를 든다
    d.wait -= dt;
    if (d.wait > 0) return;
    // 다음 — 고사리 35%, 사람 발치 20%, 아니면 가까운 어딘가
    const r = Math.random();
    d.face = null;
    if (r < 0.35 && this.nibble.length) {
      const n = this.nibble[Math.floor(Math.random() * this.nibble.length)];
      [d.tx, d.tz] = n.at;
      d.face = Math.atan2(n.fern[0] - n.at[0], n.fern[1] - n.at[1]);
      d.doing = 'nibble';
    } else if (r < 0.55 && people.length) {
      const p = people[Math.floor(Math.random() * people.length)];
      [d.tx, d.tz] = this.clamp(p[0] + rand(-0.4, 0.4), p[1] + rand(0.4, 0.8));
      d.face = Math.atan2(p[0] - d.tx, p[1] - d.tz);
      d.doing = 'visit';
    } else {
      [d.tx, d.tz] = this.clamp(d.x + rand(-1.8, 1.8), d.z + rand(-1.3, 1.3));
      d.doing = 'roam';
    }
    if (Math.hypot(d.tx - d.x, d.tz - d.z) <= 0.03) { d.pose = 'look'; d.wait = rand(1, 2); }
  }
}
