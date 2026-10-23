// 캐릭터의 움직임 — 갈 자리(director)를 받아 A* 길(nav)로 걷는다. 그리기와 떨어져 있다.
import type { Agent } from '../types.ts';
import { Nav } from '../scene/nav.ts';
import { direct, colorOf, type Placement } from '../scene/director.ts';
import type { World } from '../scene/world.ts';
import { DIRS } from '../scene/layout.ts';
import { appearanceOf, type Appearance } from '../scene/appearance.ts';

const SPEED = 2.2;

export interface Actor {
  agent: Agent;
  place: Placement;
  color: number;
  look: Appearance;
  x: number; z: number; rot: number;
  path: [number, number][];
  moving: boolean;
  leaving: boolean;          // 사라진 에이전트 — 문까지 걸어간 뒤 지운다
  t: number;                 // 걸음 흔들림 위상
}

export class Cast {
  actors = new Map<string, Actor>();
  private first = true;
  private world: World | null = null;
  private nav: Nav | null = null;

  private path(from: [number, number], to: [number, number]): [number, number][] {
    return this.nav ? this.nav.findPath(from, to) : [];
  }

  // 새 Snapshot — 새로 온 이는 회사 입구 밖에서 걸어 들어오고(처음 한 번은 제자리에서), 떠난 이는 입구로 걸어 나간다
  update(world: World, agents: Agent[]): void {
    if (world !== this.world) {
      this.world = world;
      this.nav = new Nav(world.w, world.d, world.blocks);
      for (const a of this.actors.values()) a.path = [];   // 건물이 바뀌었다 — 길을 새로 찾는다
    }
    const doorSpot = (): [number, number] => [...world.door];
    const places = direct(world, agents);
    const live = new Set<string>();
    for (const a of agents) {
      live.add(a.id);
      const place = places.get(a.id)!;
      let actor = this.actors.get(a.id);
      if (!actor || actor.leaving) {
        const [x, z] = this.first ? place.target : doorSpot();
        actor = { agent: a, place, color: 0, look: appearanceOf(a), x, z, rot: Math.PI, path: [], moving: false, leaving: false, t: Math.random() * 10 };
        this.actors.set(a.id, actor);
      }
      const moved = actor.place.target[0] !== place.target[0] || actor.place.target[1] !== place.target[1];
      actor.agent = a;
      actor.place = place;
      actor.color = colorOf(a, agents);
      if (moved || (!actor.path.length && Math.hypot(actor.x - place.target[0], actor.z - place.target[1]) > 0.01)) {
        actor.path = this.path([actor.x, actor.z], place.target);
      }
    }
    for (const actor of this.actors.values()) {
      if (live.has(actor.agent.id) || actor.leaving) continue;
      actor.leaving = true;
      actor.place = { ...actor.place, target: doorSpot(), pose: 'stand', desk: null };
      actor.path = this.path([actor.x, actor.z], actor.place.target);
    }
    this.first = false;
  }

  step(dtRaw: number): void {
    const dt = Math.min(0.05, dtRaw);
    for (const [id, a] of this.actors) {
      a.t += dt;
      a.moving = false;
      if (a.path.length) {
        const [px, pz] = a.path[0];
        const dx = px - a.x, dz = pz - a.z, d = Math.hypot(dx, dz), sp = SPEED * dt;
        // 꺾이는 점에 닿은 프레임도 아직 갈 길이 남았으면 걷는 중이다 — 이 한 프레임을 멈춤으로 치면 이름표가 숨었다 나오고
        // 책상으로 가는 사람은 앉은 그림으로 바뀌어 깜빡였다 (사용자: 「돌아다닐 때 계속 이름표가 깜빡거린다」)
        if (d <= sp) { a.x = px; a.z = pz; a.path.shift(); a.moving = a.path.length > 0; }
        else { a.x += (dx / d) * sp; a.z += (dz / d) * sp; a.moving = true; a.rot = Math.atan2(dx, dz); }
        if (!a.path.length && a.leaving) this.actors.delete(id);
      } else {
        let diff = a.place.face - a.rot;
        diff = Math.atan2(Math.sin(diff), Math.cos(diff));
        a.rot += diff * Math.min(1, dt * 6);
      }
    }
  }
}

export const sitting = (a: Actor) => !a.moving && !a.leaving && a.place.pose === 'sit';
export const dirOf = (rot: number) => ((Math.round(rot / (2 * Math.PI / DIRS)) % DIRS) + DIRS) % DIRS;
