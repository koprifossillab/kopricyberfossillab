// 연구실 배치 — 시제품 agent-office-3d.html 의 좌표·색을 그대로 쓰고, 방을 셋으로 나눴다.
//   사무실   x 0..16, z 0..10.1   — 사람이 직접 시킨 일(코드)을 하는 세션
//   휴게실   x 0..16, z 10.1..14  — 쉬는 세션 (방과 상관없이)
//   고객센터 x 16.1..24, z 0..14  — 다른 세션이 보낸 지령을 받아 처리하는 세션
// 뒤 벽 z=0, 왼쪽 벽 x=0. 방 사이는 낮은 칸막이(뒤가 보이게)와 출입구. 들어오는 문은 고객센터 오른쪽 앞.
import type { Activity, Room } from '../types.ts';

export const W = 24;
export const D = 14;
export const SPLIT_X = 16.1;   // 사무실·휴게실 | 고객센터
export const SPLIT_Z = 10.1;   // 사무실 | 휴게실
const T = 0.12;                // 칸막이 두께
export const PARTITION_H = 0.7;

export type Rect = [number, number, number, number];   // [x0, z0, x1, z1]

// 바닥 — 방마다 색
export const FLOORS: { room: string; rect: Rect; color: number }[] = [
  { room: '사무실', rect: [0, 0, SPLIT_X, SPLIT_Z], color: 0xd3d1c7 },
  { room: '휴게실', rect: [0, SPLIT_Z, SPLIT_X, D], color: 0xe4d9c6 },
  { room: '고객센터', rect: [SPLIT_X, 0, W, D], color: 0xcbdcd2 },
];
// 방 이름표 자리 (바닥 앞 모서리)
export const ROOM_LABELS: { name: string; at: [number, number] }[] = [
  { name: '사무실', at: [1.6, 9.7] },
  { name: '휴게실', at: [1.6, 13.7] },
  { name: '고객센터', at: [20, 13.7] },
];

// 칸막이 — 출입구를 비워 두고 토막으로
export const PARTITIONS: Rect[] = [
  [0, SPLIT_Z - T / 2, 7.2, SPLIT_Z + T / 2],                 // 사무실 | 휴게실, 출입구 x 7.2..8.8
  [8.8, SPLIT_Z - T / 2, SPLIT_X, SPLIT_Z + T / 2],
  [SPLIT_X - T / 2, 0, SPLIT_X + T / 2, 7.6],                // 사무실 | 고객센터, 출입구 z 7.6..9.4
  [SPLIT_X - T / 2, 9.4, SPLIT_X + T / 2, 11.6],             // 휴게실 | 고객센터, 출입구 z 11.6..13
  [SPLIT_X - T / 2, 13, SPLIT_X + T / 2, D],
];

// 책상: 사무실 여덟(시제품의 x 좌표, 줄 z=3 과 7.2) + 고객센터 여섯. 번호는 사무실이 먼저
const OFFICE_DESKS: [number, number][] = [3, 7.2].flatMap((z) => [2.5, 6, 9.5, 13].map((x) => [x, z] as [number, number]));
const CENTER_DESKS: [number, number][] = [2.4, 6, 9.6].flatMap((z) => [18.4, 21.8].map((x) => [x, z] as [number, number]));
export const DESKS: [number, number][] = [...OFFICE_DESKS, ...CENTER_DESKS];
export const DESK_ROOM: Room[] = [...OFFICE_DESKS.map(() => 'office' as const), ...CENTER_DESKS.map(() => 'center' as const)];
export const seatOf = (d: [number, number]): [number, number] => [d[0], d[1] + 1.45];
export const waitSpotOf = (d: [number, number]): [number, number] => [d[0] + 0.75, d[1] + 1.65];

// 휴게실 — 쉬는 세션
export const LOUNGE: [number, number][] = [
  [4.4, 12], [5.6, 12], [9.9, 12], [11.1, 12], [14.3, 11.0], [2.2, 11.4],
  [13.0, 12.5], [7.8, 12.6], [2.0, 12.9], [12.4, 10.9], [7.6, 11.0], [14.6, 13.4],
];
export const SOFAS: [number, number][] = [[5, 12.9], [10.5, 12.9]];
export const TABLES: [number, number][] = [[5, 11.5], [10.5, 11.5]];
export const COFFEE: [number, number] = [15.3, 10.95];

// 코어 보관대 — git·gh 작업 (Claw3D 의 server_room 자리)
export const CORE_RACK = { x: 0.45, z: 7.6, len: 3.2 };
export const CORE_SPOTS: [number, number][] = [[1.5, 6.6], [1.5, 7.6], [1.5, 8.6]];
// 현미경 책상 — 시험 (Claw3D 의 qa_lab 자리)
export const BENCH = { x: 15.3, z: 4.6, len: 1.8 };
export const BENCH_SPOTS: [number, number][] = [[14.55, 4.1], [14.55, 5.1]];
// 화이트보드 앞 — 다른 계정의 세션이 바쁠 때, 책상이 모자랄 때
export const BOARD_SPOTS: [number, number][] = [[6.6, 1.2], [8, 1.2], [9.4, 1.2]];
// 고객센터 뒤 벽의 지령판
export const ORDER_BOARD = { x: 20.1, w: 4.4 };
export const DOOR: [number, number] = [23.3, 13.4];

export const PLANTS: [number, number, number][] = [[15.3, 0.7, 1.6], [0.8, 13.2, 1.3], [23.4, 0.7, 1.4], [16.9, 13.5, 1.0]];

// 걸음을 막는 직사각형 [x0, z0, x1, z1]
export const BLOCKS: Rect[] = [
  ...DESKS.map(([x, z]) => [x - 1.05, z - 0.5, x + 1.05, z + 0.5] as Rect),
  ...SOFAS.map(([x, z]) => [x - 1, z - 0.45, x + 1, z + 0.45] as Rect),
  ...TABLES.map(([x, z]) => [x - 0.65, z - 0.4, x + 0.65, z + 0.4] as Rect),
  [0, 0, 1.1, 0.8],                                                           // 책장
  [0, CORE_RACK.z - CORE_RACK.len / 2, 0.9, CORE_RACK.z + CORE_RACK.len / 2], // 코어 보관대
  [BENCH.x - 0.45, BENCH.z - BENCH.len / 2, BENCH.x + 0.45, BENCH.z + BENCH.len / 2], // 현미경 책상
  [COFFEE[0] - 0.5, COFFEE[1] - 0.35, COFFEE[0] + 0.5, COFFEE[1] + 0.35],
  ...PLANTS.map(([x, z]) => [x - 0.35, z - 0.35, x + 0.35, z + 0.35] as Rect),
  ...PARTITIONS.map(([x0, z0, x1, z1]) => [x0 - 0.1, z0 - 0.1, x1 + 0.1, z1 + 0.1] as Rect),
];

// 캐릭터를 가리는 가구 — 굽기(bake)가 조각으로 굽고, 화면이 캐릭터 앞에 다시 그린다.
// box 는 가림 판정에 쓰는 바닥 범위 (의자까지 포함한 책상처럼 nav 의 BLOCKS 보다 넓을 수 있다)
export type ItemKind = 'desk' | 'call' | 'sofa' | 'table' | 'coffee' | 'core' | 'bench' | 'plant' | 'shelf' | 'partition';
export interface Item { id: string; kind: ItemKind; at: [number, number]; box: Rect; h?: number }
export const ITEMS: Item[] = [
  ...DESKS.map(([x, z], i) => ({ id: `desk${i}`, kind: DESK_ROOM[i] === 'center' ? 'call' as const : 'desk' as const, at: [x, z] as [number, number], box: [x - 1.05, z - 0.5, x + 1.05, z + 1.25] as Rect })),
  ...SOFAS.map(([x, z], i) => ({ id: `sofa${i}`, kind: 'sofa' as const, at: [x, z] as [number, number], box: [x - 1, z - 0.45, x + 1, z + 0.45] as Rect })),
  ...TABLES.map(([x, z], i) => ({ id: `table${i}`, kind: 'table' as const, at: [x, z] as [number, number], box: [x - 0.6, z - 0.35, x + 0.6, z + 0.35] as Rect })),
  { id: 'coffee', kind: 'coffee', at: COFFEE, box: [COFFEE[0] - 0.45, COFFEE[1] - 0.45, COFFEE[0] + 0.45, COFFEE[1] + 0.3] },
  { id: 'core', kind: 'core', at: [CORE_RACK.x, CORE_RACK.z], box: [0, CORE_RACK.z - CORE_RACK.len / 2, 0.85, CORE_RACK.z + CORE_RACK.len / 2] },
  { id: 'bench', kind: 'bench', at: [BENCH.x, BENCH.z], box: [BENCH.x - 0.4, BENCH.z - BENCH.len / 2, BENCH.x + 0.4, BENCH.z + BENCH.len / 2] },
  { id: 'shelf', kind: 'shelf', at: [0.6, 0.45], box: [0.15, 0.15, 1.05, 0.75] },
  ...PLANTS.map(([x, z, h], i) => ({ id: `plant${i}`, kind: 'plant' as const, at: [x, z] as [number, number], box: [x - 0.3, z - 0.3, x + 0.3, z + 0.3] as Rect, h })),
  ...PARTITIONS.map((r, i) => ({ id: `wall${i}`, kind: 'partition' as const, at: [(r[0] + r[2]) / 2, (r[1] + r[3]) / 2] as [number, number], box: r })),
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
