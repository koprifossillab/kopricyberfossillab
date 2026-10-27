// 사막 방의 연출 — 화면만의 것. 전갈 둘은 모래 위를 후다닥 기다 멈추고, 가끔 사람 발치로 간다.
// 선인장 하나는 제자리에서 눈을 감고 서 있다가, 가끔 눈을 뜨고 방 앞쪽을 몇 군데 걸어 본 뒤 돌아와 다시 잠든다.
import type { Rect } from '../scene/layout.ts';
import { SCORPION_FRAMES, CACTUS_FRAMES, type CactusPose } from '../scene/desert.ts';

export interface Scorpion { x: number; z: number; rot: number; tx: number; tz: number; wait: number; frame: number; t: number; moving: boolean }
export interface Cactus { x: number; z: number; rot: number; tx: number; tz: number; pose: CactusPose; frame: number; t: number; wait: number; trips: number }

const rand = (a: number, b: number) => a + Math.random() * (b - a);
const FACE_CAMERA = Math.PI / 4;   // 카메라는 +x·+z 쪽 — 자는 선인장은 얼굴을 이리로

export class Desert {
  scorpions: Scorpion[];
  cactus: Cactus;
  readonly room: string;
  private roam: Rect;
  private home: [number, number];

  constructor(roam: Rect, home: [number, number], room: string, n = 2) {
    this.roam = roam; this.home = home; this.room = room;
    this.scorpions = Array.from({ length: n }, () => {
      const [x, z] = this.spot();
      return { x, z, rot: Math.random() * 6.28, tx: x, tz: z, wait: rand(1, 4), frame: 0, t: 0, moving: false };
    });
    this.cactus = { x: home[0], z: home[1], rot: FACE_CAMERA, tx: home[0], tz: home[1], pose: 'sleep', frame: 0, t: 0, wait: rand(20, 60), trips: 0 };
  }

  private spot(): [number, number] {
    const [x0, z0, x1, z1] = this.roam;
    return [rand(x0, x1), rand(z0, z1)];
  }
  private clamp(x: number, z: number): [number, number] {
    const [x0, z0, x1, z1] = this.roam;
    return [Math.min(x1, Math.max(x0, x)), Math.min(z1, Math.max(z0, z))];
  }

  // 선인장이 깨어 돌아다니는 중인가 (자리에서 눈만 뜬 것은 아니다)
  get cactusAbout(): boolean { return this.cactus.pose !== 'sleep' && Math.hypot(this.cactus.x - this.home[0], this.cactus.z - this.home[1]) > 0.3; }

  // people: 이 방 근처의 사람 자리 — 전갈이 가끔 그 발치로 간다
  step(dt: number, people: [number, number][]): void {
    for (const s of this.scorpions) {
      const dx = s.tx - s.x, dz = s.tz - s.z, dist = Math.hypot(dx, dz);
      if (dist > 0.02) {
        const sp = 0.9 * dt;
        if (dist <= sp) { s.x = s.tx; s.z = s.tz; } else { s.x += (dx / dist) * sp; s.z += (dz / dist) * sp; }
        s.rot = Math.atan2(dx, dz);
        s.t += dt;
        s.frame = Math.floor(s.t * 14) % SCORPION_FRAMES;
        s.moving = true;
        continue;
      }
      s.moving = false;
      s.wait -= dt;
      if (s.wait > 0) continue;
      // 다음 — 사람 발치 25%, 아니면 짧게 어딘가로 (멀리 가지 않는다 — 후다닥, 멈칫)
      const p = people.length && Math.random() < 0.25 ? people[Math.floor(Math.random() * people.length)] : null;
      [s.tx, s.tz] = p ? this.clamp(p[0] + rand(-0.5, 0.5), p[1] + rand(0.2, 0.7))
        : this.clamp(s.x + rand(-1.6, 1.6), s.z + rand(-1.2, 1.2));
      s.wait = rand(1, 5);
    }

    const c = this.cactus;
    c.t += dt;
    const dx = c.tx - c.x, dz = c.tz - c.z, dist = Math.hypot(dx, dz);
    if (c.pose === 'walk') {
      if (dist > 0.03) {
        const sp = 0.4 * dt;
        if (dist <= sp) { c.x = c.tx; c.z = c.tz; } else { c.x += (dx / dist) * sp; c.z += (dz / dist) * sp; }
        c.rot = Math.atan2(dx, dz);
        c.frame = Math.floor(c.t * 5) % CACTUS_FRAMES;
        return;
      }
      // 닿았다 — 멈춰 두리번
      c.pose = 'awake';
      c.wait = rand(1, 3);
      if (Math.hypot(c.x - this.home[0], c.z - this.home[1]) < 0.05) c.rot = FACE_CAMERA;   // 집에 왔다 — 앞을 보고 곧 잠든다
      return;
    }
    c.wait -= dt;
    if (c.wait > 0) return;
    if (c.pose === 'sleep') { c.pose = 'awake'; c.wait = rand(1.5, 2.5); c.trips = 1 + Math.floor(Math.random() * 3); return; }   // 눈을 뜬다
    // 깨어 있다 — 더 갈 곳이 있으면 가고, 다 갔으면 집으로, 집이면 잔다
    const atHome = Math.hypot(c.x - this.home[0], c.z - this.home[1]) < 0.05;
    if (c.trips > 0) { c.trips--; [c.tx, c.tz] = this.spot(); c.pose = 'walk'; return; }
    if (!atHome) { [c.tx, c.tz] = this.home; c.pose = 'walk'; return; }
    c.pose = 'sleep'; c.rot = FACE_CAMERA; c.wait = rand(45, 150);
  }
}
