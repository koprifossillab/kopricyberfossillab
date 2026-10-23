// Snapshot → 캐릭터마다 갈 자리와 자세. 장소는 활동에서 정해진다:
//   책상은 방에서 받는다 — 사무실 세션은 사무실 책상, 고객센터 세션은 상담 책상
//   code·read·run·think·spawn → 자기 책상(앉음)   wait → 책상 옆(서서 빨간 링)
//   git → 코어 보관대   test → 현미경 책상   idle → 휴게실
//   하위 에이전트 → 부모 책상 곁   다른 계정 → 바쁘면 화이트보드 앞, 아니면 라운지
import type { Agent } from '../types.ts';
import {
  DESKS, DESK_ROOM, seatOf, waitSpotOf, LOUNGE, CORE_SPOTS, BENCH_SPOTS, BOARD_SPOTS, DOOR,
  PALETTE, FOREIGN_COLOR,
} from './layout.ts';

export type Pose = 'sit' | 'stand';

export interface Placement {
  target: [number, number];
  pose: Pose;
  face: number;          // 도착하면 바라볼 방향 (y 회전)
  desk: number | null;   // 모니터를 켤 책상
}

const deskOf = new Map<string, number>();   // 책상은 한 번 받으면 떠날 때까지 그대로

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function colorOf(a: Agent, all: Agent[]): number {
  if (a.kind === 'foreign') return FOREIGN_COLOR;
  if (a.parentId) {
    const p = all.find((x) => x.id === a.parentId);
    if (p) return colorOf(p, all);
  }
  return PALETTE[hash(a.id) % PALETTE.length];
}

export function direct(agents: Agent[]): Map<string, Placement> {
  const live = new Set(agents.map((a) => a.id));
  for (const id of deskOf.keys()) if (!live.has(id)) deskOf.delete(id);
  const taken = new Set(deskOf.values());
  for (const a of agents) {
    if (a.kind !== 'session' && a.kind !== 'job') continue;
    const has = deskOf.get(a.id);
    if (has !== undefined && DESK_ROOM[has] === a.room) continue;
    // 방이 바뀌었으면 그 방에 빈 책상이 있을 때만 옮긴다 (없으면 있던 책상에 그대로)
    const free = DESKS.findIndex((_, i) => !taken.has(i) && DESK_ROOM[i] === a.room);
    if (free < 0) {
      if (has === undefined) {
        const any = DESKS.findIndex((_, i) => !taken.has(i));   // 그 방이 꽉 차면 다른 방이라도
        if (any >= 0) { deskOf.set(a.id, any); taken.add(any); }
      }
      continue;
    }
    if (has !== undefined) taken.delete(has);
    deskOf.set(a.id, free);
    taken.add(free);
  }

  const out = new Map<string, Placement>();
  const queue = { lounge: 0, core: 0, bench: 0, board: 0 };
  const children = new Map<string, number>();
  const spot = (list: [number, number][], key: keyof typeof queue): [number, number] => {
    const n = queue[key]++;
    const base = list[n % list.length];
    const lap = Math.floor(n / list.length);   // 자리가 모자라면 조금씩 비켜 선다
    return [base[0] + lap * 0.45, base[1] + lap * 0.35];
  };

  for (const a of agents) {
    const desk = deskOf.get(a.id) ?? null;
    if (a.kind === 'subagent') {
      const pd = a.parentId ? deskOf.get(a.parentId) : undefined;
      const n = children.get(a.parentId ?? '') ?? 0;
      children.set(a.parentId ?? '', n + 1);
      if (pd !== undefined) {
        const [x, z] = seatOf(DESKS[pd]);
        out.set(a.id, { target: [x - 0.8 - (n % 3) * 0.55, z + 0.5 + Math.floor(n / 3) * 0.55], pose: 'stand', face: Math.PI * 0.75, desk: null });
      } else {
        out.set(a.id, { target: spot(LOUNGE, 'lounge'), pose: 'stand', face: Math.PI, desk: null });
      }
      continue;
    }
    if (a.kind === 'foreign') {
      out.set(a.id, a.activity === 'idle'
        ? { target: spot(LOUNGE, 'lounge'), pose: 'stand', face: Math.PI, desk: null }
        : { target: spot(BOARD_SPOTS, 'board'), pose: 'stand', face: Math.PI, desk: null });
      continue;
    }
    switch (a.activity) {
      case 'idle':
        out.set(a.id, { target: spot(LOUNGE, 'lounge'), pose: 'stand', face: Math.PI, desk: null });
        break;
      case 'git':
        out.set(a.id, { target: spot(CORE_SPOTS, 'core'), pose: 'stand', face: -Math.PI / 2, desk: null });
        break;
      case 'test':
        out.set(a.id, { target: spot(BENCH_SPOTS, 'bench'), pose: 'stand', face: Math.PI / 2, desk: null });
        break;
      case 'wait':
        out.set(a.id, desk !== null
          ? { target: waitSpotOf(DESKS[desk]), pose: 'stand', face: Math.PI * 0.75, desk: null }
          : { target: spot(LOUNGE, 'lounge'), pose: 'stand', face: Math.PI, desk: null });
        break;
      default:
        out.set(a.id, desk !== null
          ? { target: seatOf(DESKS[desk]), pose: 'sit', face: Math.PI, desk }
          : { target: spot(BOARD_SPOTS, 'board'), pose: 'stand', face: Math.PI, desk: null });   // 책상이 모자라면 화이트보드 앞
    }
  }
  return out;
}

export const doorSpot = (): [number, number] => [...DOOR];
