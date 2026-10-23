// 연구실 배치 — 시제품 agent-office-3d.html 의 좌표·색을 그대로 쓰고, 책상 줄을 하나 늘렸다.
// 바닥은 x 0..W, z 0..D. 뒤 벽 z=0, 왼쪽 벽 x=0. 문은 오른쪽 앞 모서리.
import type { Activity } from '../types.ts';

export const W = 16;
export const D = 14;

// 책상: 시제품의 x 좌표, 줄은 z=3(시제품) 과 z=7.2
export const DESK_X = [2.5, 6, 9.5, 13];
export const DESK_Z = [3, 7.2];
export const DESKS: [number, number][] = DESK_Z.flatMap((z) => DESK_X.map((x) => [x, z] as [number, number]));
export const seatOf = (d: [number, number]): [number, number] => [d[0], d[1] + 1.45];
export const waitSpotOf = (d: [number, number]): [number, number] => [d[0] + 0.75, d[1] + 1.65];

// 라운지 (시제품보다 z 를 4 뒤로) — 휴식
export const LOUNGE: [number, number][] = [
  [4.4, 12], [5.6, 12], [9.9, 12], [11.1, 12], [14.4, 10.4], [7.8, 10.9], [2.2, 11.2], [13.2, 12.6],
];
export const SOFAS: [number, number][] = [[5, 12.9], [10.5, 12.9]];
export const TABLES: [number, number][] = [[5, 11.5], [10.5, 11.5]];
export const COFFEE: [number, number] = [15.2, 10.4];

// 코어 보관대 — git·gh 작업 (Claw3D 의 server_room 자리)
export const CORE_RACK = { x: 0.45, z: 7.6, len: 3.2 };
export const CORE_SPOTS: [number, number][] = [[1.5, 6.6], [1.5, 7.6], [1.5, 8.6]];
// 현미경 책상 — 시험 (Claw3D 의 qa_lab 자리)
export const BENCH = { x: 15.3, z: 4.6, len: 1.8 };
export const BENCH_SPOTS: [number, number][] = [[14.55, 4.1], [14.55, 5.1]];
// 화이트보드 앞 — 다른 계정의 세션이 바쁠 때
export const BOARD_SPOTS: [number, number][] = [[6.6, 1.2], [8, 1.2], [9.4, 1.2]];
export const DOOR: [number, number] = [15.5, 13.5];

export const PLANTS: [number, number, number][] = [[15.3, 0.7, 1.6], [0.8, 13.2, 1.3], [15.3, 8.4, 1.1]];

// 걸음을 막는 직사각형 [x0, z0, x1, z1]
export const BLOCKS: [number, number, number, number][] = [
  ...DESKS.map(([x, z]) => [x - 1.05, z - 0.5, x + 1.05, z + 0.5] as [number, number, number, number]),
  ...SOFAS.map(([x, z]) => [x - 1, z - 0.45, x + 1, z + 0.45] as [number, number, number, number]),
  ...TABLES.map(([x, z]) => [x - 0.65, z - 0.4, x + 0.65, z + 0.4] as [number, number, number, number]),
  [0, 0, 1.1, 0.8],                                                           // 책장
  [0, CORE_RACK.z - CORE_RACK.len / 2, 0.9, CORE_RACK.z + CORE_RACK.len / 2], // 코어 보관대
  [BENCH.x - 0.45, BENCH.z - BENCH.len / 2, W, BENCH.z + BENCH.len / 2],      // 현미경 책상
  [COFFEE[0] - 0.5, COFFEE[1] - 0.35, W, COFFEE[1] + 0.35],
  ...PLANTS.map(([x, z]) => [x - 0.35, z - 0.35, x + 0.35, z + 0.35] as [number, number, number, number]),
];

// 캐릭터를 가리는 가구 — 굽기(bake)가 조각으로 굽고, 화면이 캐릭터 앞에 다시 그린다.
// box 는 가림 판정에 쓰는 바닥 범위 [x0, z0, x1, z1] (의자까지 포함한 책상처럼 nav 의 BLOCKS 보다 넓을 수 있다)
export type ItemKind = 'desk' | 'sofa' | 'table' | 'coffee' | 'core' | 'bench' | 'plant' | 'shelf';
export interface Item { id: string; kind: ItemKind; at: [number, number]; box: [number, number, number, number]; h?: number }
export const ITEMS: Item[] = [
  ...DESKS.map(([x, z], i) => ({ id: `desk${i}`, kind: 'desk' as const, at: [x, z] as [number, number], box: [x - 1.05, z - 0.5, x + 1.05, z + 1.25] as Item['box'] })),
  ...SOFAS.map(([x, z], i) => ({ id: `sofa${i}`, kind: 'sofa' as const, at: [x, z] as [number, number], box: [x - 1, z - 0.45, x + 1, z + 0.45] as Item['box'] })),
  ...TABLES.map(([x, z], i) => ({ id: `table${i}`, kind: 'table' as const, at: [x, z] as [number, number], box: [x - 0.6, z - 0.35, x + 0.6, z + 0.35] as Item['box'] })),
  { id: 'coffee', kind: 'coffee', at: COFFEE, box: [COFFEE[0] - 0.45, COFFEE[1] - 0.45, COFFEE[0] + 0.45, COFFEE[1] + 0.3] },
  { id: 'core', kind: 'core', at: [CORE_RACK.x, CORE_RACK.z], box: [0, CORE_RACK.z - CORE_RACK.len / 2, 0.85, CORE_RACK.z + CORE_RACK.len / 2] },
  { id: 'bench', kind: 'bench', at: [BENCH.x, BENCH.z], box: [BENCH.x - 0.4, BENCH.z - BENCH.len / 2, BENCH.x + 0.4, BENCH.z + BENCH.len / 2] },
  { id: 'shelf', kind: 'shelf', at: [0.6, 0.45], box: [0.15, 0.15, 1.05, 0.75] },
  ...PLANTS.map(([x, z, h], i) => ({ id: `plant${i}`, kind: 'plant' as const, at: [x, z] as [number, number], box: [x - 0.3, z - 0.3, x + 0.3, z + 0.3] as Item['box'], h })),
];

// 모니터 화면 (책상 앞, +z 를 본다) — 화면이 활동 색으로 칠한다
export const screenQuad = (x: number, z: number) => ({ c: [x, 1.35, z - 0.215] as [number, number, number], w: 0.7, h: 0.4 });

// 캐릭터 조각의 갈래 — 굽기와 화면이 같은 목록을 쓴다
export const HAIR = { session: 0x4a1b0c, job: 0x2c2c2a, foreign: 0x888780 } as const;
export type Hair = keyof typeof HAIR;
export const DIRS = 8;   // 방향 수 (rotation.y = k·2π/DIRS)

// 활동별 모니터 색 (앉아 있을 때)
export const SCREEN: Record<Activity, number> = {
  code: 0x85b7eb, read: 0x9fe1cb, run: 0xfac775, think: 0xcecbf6, spawn: 0xafa9ec,
  git: 0x2a3a52, test: 0x2a3a52, wait: 0x2a3a52, idle: 0x2a3a52,
};
export const SCREEN_OFF = 0x2a3a52;

export const PALETTE = [0xd85a30, 0x378add, 0x1d9e75, 0x7f77dd, 0xef9f27, 0xd4537e, 0x639922, 0x993c1d];
export const FOREIGN_COLOR = 0x888780;

export const STATE_TEXT: Record<Activity, string> = {
  code: '코딩 중', read: '탐색 중', run: '실행 중', think: '생각 중', git: 'GitHub 작업',
  test: '시험 중', spawn: '하위 작업', wait: '확인 필요', idle: '휴식',
};
