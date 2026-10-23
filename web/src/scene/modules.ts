// 건물 조각(모듈) — 좌표는 모듈 안의 것(왼쪽 뒤 바닥 모서리가 원점). 굽기는 모듈마다 한 번, 화면은 world.ts 가 늘어놓은 대로 붙인다.
// 사무실은 프로젝트마다 하나(office / office-rash), 앞쪽에 공용 블록(front: 공용실·고객센터·휴게실), 사이에 복도·통로, 바깥 벽.
import type { Rect } from './layout.ts';
import { PROPS } from './props.ts';
import { aquariumModule, AQUA_VIEW, TANKS, type AquaKind } from './aquarium.ts';

export type ItemKind =
  | 'desk' | 'call' | 'rashdesk' | 'chair' | 'rashchair' | 'partition' | 'rashwall'
  | 'sofa' | 'table' | 'cafe' | 'stool' | 'coffee' | 'core' | 'bench' | 'plant' | 'shelf'
  | 'cabinet' | 'boxes' | 'deadplant' | 'doorframe'
  | 'stall' | 'sink' | 'sign-m' | 'sign-f' | 'rack' | 'bucket' | 'ladder'
  | 'mapboard' | 'maptable'
  | 'door'   // 출입구 문틀 — 기둥 둘과 가로대. 명판은 가로대에 건다 (h = 출입구 폭, rot 0 이면 x 로 뻗는다)
  | 'fence' | 'feeder' | 'fern' | 'rock' | 'nest' | 'dinosign'
  | AquaKind   // 수족관 (aquarium.ts, wetherilli 011)
  | 'prop';   // props.ts 의 소품 (prop 에 이름)

export interface Item { id: string; kind: ItemKind; at: [number, number]; box: Rect; h?: number; rot?: number; prop?: string }

export type DeskKind = 'desk' | 'call' | 'rashdesk';
export type Slot = 'project' | 'center' | 'general';   // 책상이 어느 방의 것인가 (project 는 모듈을 놓을 때 정해진다)

export interface Plaque { name: string; at: [number, number]; y: number; axis: 'x' | 'z'; style?: 'rash' | 'project' | 'small' }

export interface Seat { at: [number, number]; pose: 'sit' | 'stand'; face: number; on?: string; group: string; lift: number }

export interface ModuleDef {
  size: [number, number];
  floors: { rect: Rect; color: number }[];
  items: Item[];
  blocks: Rect[];                                   // 걸음을 막는 곳 (items 의 box 와 따로 — 의자는 걸음을 막지 않는다)
  desks: { at: [number, number]; kind: DeskKind; slot: Slot; item: string }[];
  lounge?: Seat[];
  core?: [number, number][];
  bench?: [number, number][];
  stand?: [number, number][];                       // 갈 곳이 없을 때 서는 곳
  restroom?: { male: [number, number][]; female: [number, number][] };   // 휴게실에서 가끔 들르는 곳
  search?: { at: [number, number]; pose: 'sit' | 'stand'; face: number; on?: string; lift?: number }[];   // 자료 검색할 때 가는 곳
  aqua?: { view: typeof AQUA_VIEW; tanks: typeof TANKS };   // 수족관 관람 자리와 수조(물고기가 다니는 곳)
  pen?: { rect: Rect; feed: { at: [number, number]; face: number; dino: [number, number] }[]; feeder: [number, number] };   // 공룡 울타리
  // 방 이름 명판 — 벽에 붙인다. at 은 벽 위의 바닥 자리, y 는 높이, axis 는 벽이 뻗은 방향(x: +z 를 보는 벽, z: +x 를 보는 벽)
  labels?: Plaque[];
  flats?: string[];                                 // 바닥 층에 굽는 납작한 것(깔개 등) — models.ts 가 그린다
  tall?: string[];                                  // 그 밖에 굽는 것(벽 등) — models.ts 가 그린다
}

const T = 0.12;                    // 칸막이 두께
// 책상 앞 의자 — 따로 그린다(앉은 사람의 등을 의자 등받이가 가린다). 앉는 자리는 의자 위
export const CHAIR_DZ = 0.85;
export const SEAT_LIFT: Record<DeskKind, number> = { desk: 0.29, call: 0.29, rashdesk: 0.26 };   // 의자 방석 높이에 맞춘다
const deskItems = (list: [number, number][], prefix: string, kind: DeskKind): Item[] => list.flatMap(([x, z], i) => [
  { id: `${prefix}${i}`, kind, at: [x, z] as [number, number], box: [x - 1.05, z - 0.5, x + 1.05, z + 0.5] as Rect },
  { id: `${prefix}chair${i}`, kind: kind === 'rashdesk' ? 'rashchair' as const : 'chair' as const, at: [x, z + CHAIR_DZ] as [number, number],
    box: [x - 0.32, z + CHAIR_DZ - 0.32, x + 0.32, z + CHAIR_DZ + 0.35] as Rect },
]);
export const OFFICE_W = 7;
export const OFFICE_D = 7;
export const CORRIDOR = 2;
export const ROW_D = OFFICE_D + CORRIDOR;
export const PER_ROW = 4;
export const HALL_W = 3;
export const FRONT_D = 8;
export const BUILDING_W = PER_ROW * OFFICE_W + HALL_W;   // 31

const box = (x: number, z: number, hw: number, hd: number): Rect => [x - hw, z - hd, x + hw, z + hd];
const pad = ([x0, z0, x1, z1]: Rect, p = 0.1): Rect => [x0 - p, z0 - p, x1 + p, z1 + p];
const faceTo = (from: [number, number], to: [number, number]) => Math.atan2(to[0] - from[0], to[1] - from[1]);

// 소품 하나 — props.ts 의 이름. rot 이 ±90° 면 바닥 범위의 가로·세로가 바뀐다
function prop(id: string, name: keyof typeof PROPS, x: number, z: number, rot = 0): { item: Item; block: Rect } {
  const [sw, sd] = PROPS[name].size;
  const turned = Math.abs(Math.sin(rot)) > 0.5;
  const [hw, hd] = turned ? [sd / 2, sw / 2] : [sw / 2, sd / 2];
  return { item: { id, kind: 'prop', prop: name, at: [x, z], rot, box: [x - hw, z - hd, x + hw, z + hd] }, block: [x - hw - 0.05, z - hd - 0.05, x + hw + 0.05, z + hd + 0.05] };
}
// 출입구 문틀 — 가운데 (x, z), 폭 span, axis 는 문틀이 뻗은 방향. 기둥은 칸막이 끝에 서므로 걸음을 따로 막지 않는다
export const DOOR_TOP = 1.9;
function door(id: string, x: number, z: number, span: number, axis: 'x' | 'z'): Item {
  const box: Rect = axis === 'x' ? [x - span / 2 - 0.06, z - 0.07, x + span / 2 + 0.06, z + 0.07] : [x - 0.07, z - span / 2 - 0.06, x + 0.07, z + span / 2 + 0.06];
  return { id, kind: 'door', at: [x, z], box, h: span, rot: axis === 'x' ? 0 : Math.PI / 2 };
}
function addProps(items: Item[], blocks: Rect[], list: ReturnType<typeof prop>[]): void {
  for (const p of list) { items.push(p.item); blocks.push(p.block); }
}

// ---- 프로젝트 사무실 — 크기 셋: s(3.5×7, 책상 둘) · m(7×7, 넷) · l(14×7, 여덟). 앞 칸막이 가운데에 출입구, 오른쪽 칸막이
export const OFFICE_WIDTH = { s: OFFICE_W / 2, m: OFFICE_W, l: OFFICE_W * 2 } as const;
// theme 'gsm': 지도 프로젝트(GSM) — 암석 표본·시추 코어·지구본·지질도 판·지도 탁자로 꾸민다
function office(rash: boolean, size: 's' | 'm' | 'l' = 'm', theme?: 'gsm'): ModuleDef {
  const OFFICE_W = OFFICE_WIDTH[size];
  const cols = size === 's' ? [1.75] : size === 'm' ? [1.9, 5.1] : [1.9, 5.1, 8.9, 12.1];
  const deskAt: [number, number][] = [1.4, 4.2].flatMap((z) => cols.map((x) => [x, z] as [number, number]));
  const door_: [number, number] = [OFFICE_W / 2 - 0.7, OFFICE_W / 2 + 0.7];
  const deskKind: DeskKind = rash ? 'rashdesk' : 'desk';
  const wallKind: ItemKind = rash ? 'rashwall' : 'partition';
  const walls: Rect[] = [
    [0, OFFICE_D - T / 2, door_[0], OFFICE_D + T / 2],        // 앞, 가운데에 출입구
    [door_[1], OFFICE_D - T / 2, OFFICE_W, OFFICE_D + T / 2],
    [OFFICE_W - T / 2, 0, OFFICE_W + T / 2, OFFICE_D - T / 2], // 오른쪽
  ];
  const items: Item[] = [
    ...deskItems(deskAt, 'desk', deskKind),
    ...walls.map((r, i) => ({ id: `wall${i}`, kind: wallKind, at: [(r[0] + r[2]) / 2, (r[1] + r[3]) / 2] as [number, number], box: r })),
    door('door', OFFICE_W / 2, OFFICE_D, door_[1] - door_[0], 'x'),
  ];
  const blocks: Rect[] = [...deskAt.map(([x, z]) => box(x, z, 1.05, 0.5)), ...walls.map((r) => pad(r))];
  const R = OFFICE_W;   // 오른쪽 끝 — 소품 자리를 크기에 맞춘다
  if (size === 's') {
    addProps(items, blocks, [prop('bin', 'trash_bin', R - 0.35, 3.0), prop('succ', 'plant_succulent', R - 0.4, 6.4), prop('lamp', 'floor_lamp', 0.35, 6.4)]);
  } else if (rash) {
    addProps(items, blocks, [prop('pile', 'paper_pile', 3.5, 0.4), prop('fan', 'old_fan', 0.4, 3.1), prop('oldcab', 'old_cabinet', 6.45, 3.0, -Math.PI / 2)]);
    items.push(
      { id: 'cabinet', kind: 'cabinet', at: [6.45, 0.45], box: box(6.45, 0.45, 0.35, 0.35) },
      { id: 'boxes0', kind: 'boxes', at: [0.5, 6.35], box: box(0.5, 6.35, 0.3, 0.3) },
      { id: 'boxes1', kind: 'boxes', at: [1.2, 6.45], box: box(1.2, 6.45, 0.3, 0.3) },
      { id: 'deadplant', kind: 'deadplant', at: [6.4, 6.35], box: box(6.4, 6.35, 0.25, 0.25) },
    );
    blocks.push(box(6.45, 0.45, 0.4, 0.4), box(0.85, 6.4, 0.75, 0.4), box(6.4, 6.35, 0.3, 0.3));
  } else {
    items.push({ id: 'plant', kind: 'plant', at: [R - 0.55, 0.5], box: box(R - 0.55, 0.5, 0.3, 0.3), h: 1.4 });
    blocks.push(box(R - 0.55, 0.5, 0.35, 0.35));
    addProps(items, blocks, [
      prop('shelf', 'bookshelf', 3.5, 0.3), prop('lamp', 'floor_lamp', 0.4, 0.45), prop('coat', 'coat_rack', 0.4, 3.0),
      prop('bin', 'trash_bin', R - 0.4, 3.0), prop('cooler', 'water_cooler', 0.45, 6.35), prop('succ', 'plant_succulent', R - 0.45, 6.4),
    ]);
    if (theme === 'gsm') {
      addProps(items, blocks, [
        prop('rocks1', 'rock_shelf', 10.5, 0.3), prop('rocks2', 'rock_shelf', 7.0, 0.3), prop('core1', 'core_box', 7.0, 3.3),
        prop('globe', 'globe', 3.5, 6.4), prop('core2', 'core_box', R - 0.6, 3.6, -Math.PI / 2),
      ]);
      items.push(
        { id: 'map0', kind: 'mapboard', at: [5.5, 6.45], box: [4.9, 6.25, 6.1, 6.65] },
        { id: 'map1', kind: 'mapboard', at: [9.0, 6.45], box: [8.4, 6.25, 9.6, 6.65] },
        { id: 'maptable', kind: 'maptable', at: [11.6, 6.2], box: [10.9, 5.85, 12.3, 6.55] },
      );
      blocks.push([4.85, 6.2, 6.15, 6.7], [8.35, 6.2, 9.65, 6.7], [10.85, 5.8, 12.35, 6.6]);
    } else if (size === 'l') addProps(items, blocks, [
      // 큰 사무실 — 가운데 통로에 서버 랙과 화이트보드, 책장 하나 더, 복사기
      prop('shelf2', 'bookshelf', 10.5, 0.3), prop('server', 'server_rack', 7.0, 0.5), prop('easel', 'whiteboard_easel', 7.0, 6.4),
      prop('copier', 'copier', 10.5, 6.4), prop('globe', 'globe', 3.5, 6.4), prop('cork', 'cork_board', 12.6, 6.6),
    ]);
  }
  return {
    size: [OFFICE_W, OFFICE_D],
    floors: [{ rect: [0, 0, OFFICE_W, OFFICE_D], color: rash ? 0x8a857b : 0xd3d1c7 }],
    items, blocks,
    desks: deskAt.map((at, i) => ({ at, kind: deskKind, slot: 'project' as const, item: `desk${i}` })),
    stand: [[OFFICE_W / 2, 6.2], [OFFICE_W / 2 - 0.6, 6.2], [OFFICE_W / 2 + 0.6, 6.2]],
    tall: rash ? ['bulb'] : [],
  };
}

// ---- 앞 블록 (31×8): 공용실 x 0..8 · 고객센터 8..17 · 휴게실 17..31. 뒤(복도 쪽) 칸막이에 방마다 출입구
function front(): ModuleDef {
  const W = BUILDING_W, D = FRONT_D;
  const walls: Rect[] = [
    [0, -T / 2, 5.6, T / 2], [7.0, -T / 2, 11.8, T / 2], [13.1, -T / 2, 22.2, T / 2], [23.6, -T / 2, W, T / 2],   // 뒤
    [8 - T / 2, T / 2, 8 + T / 2, D], [17 - T / 2, T / 2, 17 + T / 2, D],                                       // 방 사이
  ];
  // 공용실: 일반 책상 둘, 코어 보관대(왼쪽 벽), 현미경 책상
  const gen: [number, number][] = [[4.0, 1.6], [4.0, 4.6]];
  // 고객센터: 상담 책상 넷
  const call: [number, number][] = [[10.3, 1.6], [14.6, 1.6], [10.3, 4.6], [14.6, 4.6]];
  // 휴게실: 소파 둘이 낮은 탁자를 사이에 두고 마주 보고, 카페 탁자 넷(의자 넷씩), 커피 머신
  const sofas = [{ at: [20.5, 1.35] as [number, number], rot: Math.PI }, { at: [20.5, 5.85] as [number, number], rot: 0 }];
  const low: [number, number] = [20.5, 3.6];
  const cafe: [number, number][] = [[24.6, 2.3], [27.9, 2.3], [24.6, 5.6], [27.9, 5.6]];
  const stoolOff: [number, number][] = [[-0.78, 0], [0.78, 0], [0, -0.78], [0, 0.78]];
  const stools = cafe.flatMap(([x, z], t) => stoolOff.map(([dx, dz], k) => ({ at: [x + dx, z + dz] as [number, number], t, k })));
  const coffee: [number, number] = [30.3, 0.6];
  const core = { x: 0.45, z: 5.8, len: 3.2 };
  const bench = { x: 7.35, z: 3.8, len: 5.6 };   // 시험 — 오른쪽 칸막이를 따라 길게 (시험 중인 세션이 몰려서 넓혔다)
  const plants: [number, number, number][] = [[17.6, 7.4, 1.0], [30.5, 7.4, 1.1], [0.6, 7.5, 1.2]];

  const items: Item[] = [
    ...deskItems(gen, 'gen', 'desk'),
    ...deskItems(call, 'call', 'call'),
    ...walls.map((r, i) => ({ id: `wall${i}`, kind: 'partition' as const, at: [(r[0] + r[2]) / 2, (r[1] + r[3]) / 2] as [number, number], box: r })),
    door('door0', 6.3, 0, 1.4, 'x'), door('door1', 12.45, 0, 1.3, 'x'), door('door2', 22.9, 0, 1.4, 'x'),
    { id: 'core', kind: 'core', at: [core.x, core.z], box: [0, core.z - core.len / 2, 0.85, core.z + core.len / 2] },
    { id: 'bench', kind: 'bench', at: [bench.x, bench.z], box: [bench.x - 0.4, bench.z - bench.len / 2, bench.x + 0.4, bench.z + bench.len / 2] },
    ...sofas.map(({ at, rot }, i) => ({ id: `sofa${i}`, kind: 'sofa' as const, at, rot, box: box(at[0], at[1], 1, 0.45) })),
    { id: 'table0', kind: 'table', at: low, box: box(low[0], low[1], 0.8, 0.35) },
    ...cafe.map(([x, z], i) => ({ id: `cafe${i}`, kind: 'cafe' as const, at: [x, z] as [number, number], box: box(x, z, 0.5, 0.5) })),
    ...stools.map(({ at, t, k }) => ({ id: `stool${t}_${k}`, kind: 'stool' as const, at, box: box(at[0], at[1], 0.2, 0.2) })),
    { id: 'coffee', kind: 'coffee', at: coffee, box: [coffee[0] - 0.45, coffee[1] - 0.3, coffee[0] + 0.45, coffee[1] + 0.45] },
    ...plants.map(([x, z, h], i) => ({ id: `plant${i}`, kind: 'plant' as const, at: [x, z] as [number, number], box: box(x, z, 0.3, 0.3), h })),
  ];
  const blocks: Rect[] = [
    ...walls.map((r) => pad(r)),
    ...[...gen, ...call].map(([x, z]) => box(x, z, 1.05, 0.5)),
    [0, core.z - core.len / 2, 0.9, core.z + core.len / 2],
    box(bench.x, bench.z, 0.45, bench.len / 2),
    ...sofas.map(({ at }) => box(at[0], at[1], 1, 0.45)),
    box(low[0], low[1], 0.85, 0.4),
    ...cafe.map(([x, z]) => box(x, z, 0.5, 0.5)),
    ...stools.map(({ at }) => box(at[0], at[1], 0.2, 0.2)),
    [coffee[0] - 0.5, coffee[1] - 0.35, W, coffee[1] + 0.4],
    ...plants.map(([x, z]) => box(x, z, 0.35, 0.35)),
  ];
  addProps(items, blocks, [
    // 공용실 — 연구실다운 것
    prop('fossil', 'fossil_cabinet', 2.0, 7.5), prop('corebox', 'core_box', 6.6, 7.45), prop('rocks', 'rock_shelf', 1.7, 0.35),
    prop('server', 'server_rack', 0.45, 2.5, Math.PI / 2),   // 왼쪽 벽 (tmux 모니터가 있던 자리)
    // 고객센터
    prop('cooler', 'water_cooler', 16.5, 0.5), prop('copier', 'copier', 12.45, 7.3), prop('easel', 'whiteboard_easel', 9.2, 7.3),
    prop('bin', 'trash_bin', 16.6, 3.2),
    // 휴게실
    prop('fridge', 'mini_fridge', 29.2, 0.42), prop('micro', 'microwave_table', 27.8, 0.35), prop('umbrella', 'umbrella_stand', 17.5, 0.45),
    prop('tall', 'plant_tall', 17.5, 4.0), prop('bush', 'plant_bush', 23.0, 7.4),
  ]);
  const cafeSeats = (t: number): Seat[] => stools.filter((s) => s.t === t).map((s) => ({
    at: s.at, pose: 'sit' as const, face: faceTo(s.at, cafe[t]), on: `stool${t}_${s.k}`, group: `cafe${t}`, lift: 0.26,
  }));
  const sofaSeats: Seat[] = [
    { at: [20.05, 1.45], pose: 'sit', face: 0, on: 'sofa0', group: 'sofa', lift: 0.14 },
    { at: [20.05, 5.75], pose: 'sit', face: Math.PI, on: 'sofa1', group: 'sofa', lift: 0.14 },
    { at: [20.95, 1.45], pose: 'sit', face: 0, on: 'sofa0', group: 'sofa', lift: 0.14 },
    { at: [20.95, 5.75], pose: 'sit', face: Math.PI, on: 'sofa1', group: 'sofa', lift: 0.14 },
  ];
  return {
    size: [W, D],
    floors: [
      { rect: [0, 0, 8, D], color: 0xd3d1c7 },
      { rect: [8, 0, 17, D], color: 0xcbdcd2 },
      { rect: [17, 0, W, D], color: 0xe4d9c6 },
    ],
    items, blocks,
    desks: [
      ...gen.map((at, i) => ({ at, kind: 'desk' as const, slot: 'general' as const, item: `gen${i}` })),
      ...call.map((at, i) => ({ at, kind: 'call' as const, slot: 'center' as const, item: `call${i}` })),
    ],
    lounge: [
      ...cafeSeats(0), ...sofaSeats, ...cafeSeats(1), ...cafeSeats(2), ...cafeSeats(3),
      { at: [30.3, 1.45], pose: 'stand', face: Math.PI, group: 'coffee', lift: 0 },
      { at: [29.4, 1.5], pose: 'stand', face: Math.PI * 0.8, group: 'coffee', lift: 0 },
      { at: [22.9, 3.1], pose: 'stand', face: -Math.PI / 2, group: 'sofa', lift: 0 },
      { at: [22.9, 4.1], pose: 'stand', face: -Math.PI / 2, group: 'sofa', lift: 0 },
      { at: [30.4, 3.9], pose: 'stand', face: -Math.PI / 2, group: 'cafe1', lift: 0 },
      { at: [30.4, 5.2], pose: 'stand', face: -Math.PI / 2, group: 'cafe3', lift: 0 },
    ],
    core: [[1.5, 4.8], [1.5, 5.8], [1.5, 6.8]],
    bench: [1.3, 2.3, 3.3, 4.3, 5.3, 6.3].map((z) => [6.6, z] as [number, number]),
    stand: [[3.6, 7.0], [4.4, 7.0], [5.2, 7.0], [3.6, 6.4]],
    // 복도 쪽 칸막이의 문 위에
    // 문틀 가로대에 (휴게실은 이름 없이 — 사용자)
    labels: [
      { name: '공용실', at: [6.3, 0], y: DOOR_TOP + 0.12, axis: 'x' }, { name: '고객센터', at: [12.45, 0], y: DOOR_TOP + 0.12, axis: 'x' },
    ],
    flats: ['rug'],
    tall: ['leftwall'],
  };
}

const floorOnly = (w: number, d: number, color: number): ModuleDef =>
  ({ size: [w, d], floors: [{ rect: [0, 0, w, d], color }], items: [], blocks: [], desks: [] });

// 자료실 (4×7) — 자료 검색(WebSearch·WebFetch)을 하러 다녀오는 방. 통로 오른쪽, 입구 위. 통로 쪽 벽에 문
export const LIBRARY_W = 4;
function library(): ModuleDef {
  const W = LIBRARY_W, D = OFFICE_D;
  const walls: Rect[] = [[-T / 2, 0, T / 2, 4.4], [-T / 2, 5.6, T / 2, D], [0, D - T / 2, W, D + T / 2]];
  const items: Item[] = [
    ...walls.map((r, i) => ({ id: `wall${i}`, kind: 'partition' as const, at: [(r[0] + r[2]) / 2, (r[1] + r[3]) / 2] as [number, number], box: r })),
    ...deskItems([[2.0, 3.6]], 'desk', 'desk'),
    door('door', 0, 5.0, 1.2, 'z'),
  ];
  const blocks: Rect[] = [...walls.map((r) => pad(r)), box(2.0, 3.6, 1.05, 0.5)];
  addProps(items, blocks, [
    prop('shelf0', 'bookshelf', 0.75, 0.3), prop('shelf1', 'bookshelf', 2.0, 0.3), prop('shelf2', 'bookshelf', 3.25, 0.3),
    prop('globe', 'globe', 3.5, 5.6), prop('lamp', 'floor_lamp', 0.45, 6.5), prop('tall', 'plant_tall', 3.5, 6.5),
  ]);
  return {
    size: [W, D],
    floors: [{ rect: [0, 0, W, D], color: 0xd9cdb5 }],
    items, blocks, desks: [],
    search: [
      { at: [2.0, 3.6 + CHAIR_DZ], pose: 'sit', face: Math.PI, on: 'deskchair0', lift: SEAT_LIFT.desk },
      { at: [0.75, 1.0], pose: 'stand', face: Math.PI },
      { at: [2.0, 1.0], pose: 'stand', face: Math.PI },
      { at: [3.25, 1.0], pose: 'stand', face: Math.PI },
      { at: [2.8, 5.6], pose: 'stand', face: Math.PI / 2 },
      { at: [1.4, 5.6], pose: 'stand', face: Math.PI / 2 },
    ],
    labels: [{ name: '자료실', at: [0, 5.0], y: DOOR_TOP + 0.12, axis: 'z' }],   // 통로 쪽 문틀
  };
}

// 공룡 방 (14×6) — 휴게실 앞에 붙은 장식용 방. 울타리 안 잔디에 콤프소그나투스가 걸어 다니고,
// 쉬는 사람이 가끔 울타리 앞에 와서 먹이를 준다(feed: 사람이 서는 곳과 공룡이 다가오는 곳). 휴게실 쪽 벽에 문
export const DINO_W = 14;
export const DINO_D = 6;
function dinoRoom(): ModuleDef {
  const W = DINO_W, D = DINO_D;
  const pen: Rect = [4, 0.8, 13.4, 5.3];
  const walls: Rect[] = [[0, -T / 2, 1.0, T / 2], [2.4, -T / 2, W, T / 2], [W - T / 2, T / 2, W + T / 2, D]];
  const F = 0.06;
  const fences: Rect[] = [
    [pen[0], pen[1] - F, pen[2], pen[1] + F],              // 뒤
    [pen[0] - F, pen[1], pen[0] + F, pen[3]],              // 왼쪽 (사람 쪽)
    [pen[2] - F, pen[1], pen[2] + F, pen[3]],              // 오른쪽
    [pen[0], pen[3] - F, pen[2], pen[3] + F],              // 앞
  ];
  const items: Item[] = [
    ...walls.map((r, i) => ({ id: `wall${i}`, kind: 'partition' as const, at: [(r[0] + r[2]) / 2, (r[1] + r[3]) / 2] as [number, number], box: r })),
    ...fences.map((r, i) => ({ id: `fence${i}`, kind: 'fence' as const, at: [(r[0] + r[2]) / 2, (r[1] + r[3]) / 2] as [number, number], box: r })),
    { id: 'feeder', kind: 'feeder', at: [11.6, 1.5], box: box(11.6, 1.5, 0.35, 0.2) },
    { id: 'fern0', kind: 'fern', at: [5.0, 1.5], box: box(5.0, 1.5, 0.3, 0.3) },
    { id: 'fern1', kind: 'fern', at: [12.6, 4.5], box: box(12.6, 4.5, 0.3, 0.3) },
    { id: 'fern2', kind: 'fern', at: [8.4, 1.3], box: box(8.4, 1.3, 0.3, 0.3) },
    { id: 'rock0', kind: 'rock', at: [6.9, 3.9], box: box(6.9, 3.9, 0.3, 0.25) },
    { id: 'rock1', kind: 'rock', at: [10.2, 2.6], box: box(10.2, 2.6, 0.3, 0.25) },
    { id: 'nest', kind: 'nest', at: [12.5, 1.4], box: box(12.5, 1.4, 0.3, 0.3) },
    { id: 'sign', kind: 'dinosign', at: [2.6, 0.45], box: box(2.6, 0.45, 0.3, 0.1) },
    door('door', 1.7, 0, 1.4, 'x'),
  ];
  addProps(items, [], [prop('bench0', 'plant_bush', 0.5, 5.4), prop('bin', 'trash_bin', 0.4, 0.5)]);
  return {
    size: [W, D],
    floors: [
      { rect: [0, 0, W, D], color: 0xd8d2c4 },
      { rect: pen, color: 0x9cbf6e },                      // 잔디 (울타리 안)
    ],
    items,
    blocks: [
      ...walls.map((r) => pad(r)), [pen[0] - 0.15, pen[1] - 0.15, pen[2] + 0.15, pen[3] + 0.15],   // 울타리 안에는 사람이 못 들어간다
      box(2.6, 0.45, 0.35, 0.15), box(0.5, 5.4, 0.35, 0.35), box(0.4, 0.5, 0.25, 0.25),
    ],
    desks: [],
    pen: {
      rect: pen,
      feeder: [11.6, 1.95],
      feed: [
        { at: [3.55, 2.0], face: Math.PI / 2, dino: [4.45, 2.0] },
        { at: [3.55, 3.6], face: Math.PI / 2, dino: [4.45, 3.6] },
        { at: [6.5, 5.75], face: Math.PI, dino: [6.5, 4.85] },
        { at: [9.4, 5.75], face: Math.PI, dino: [9.4, 4.85] },
        { at: [12.0, 5.75], face: Math.PI, dino: [12.0, 4.85] },
      ],
    },
    labels: [{ name: '공룡 방', at: [1.7, 0], y: DOOR_TOP + 0.12, axis: 'x' }],   // 휴게실 쪽 문틀
  };
}

// 회사 입구 (4×2) — 건물 오른쪽 통로 끝에 붙는 바깥 길과 문틀. 새 세션은 여기로 들어오고 닫힌 세션은 여기로 나간다
export const ENTRANCE_W = 4;
function entrance(): ModuleDef {
  return {
    size: [ENTRANCE_W, CORRIDOR],
    floors: [{ rect: [0, 0, ENTRANCE_W, CORRIDOR], color: 0xb9bfc4 }],
    items: [{ id: 'door', kind: 'doorframe', at: [0, CORRIDOR / 2], box: [-0.15, -0.1, 0.15, CORRIDOR + 0.1] }],
    blocks: [],
    desks: [],
    labels: [{ name: '입구', at: [0.1, CORRIDOR / 2], y: 2.75, axis: 'z' }],   // 문틀 간판
    flats: ['mat'],
  };
}

// 화장실(남·여)과 창고 (4×8) — 앞 블록 오른쪽, 입구 아래. 휴게실 쪽(왼쪽) 벽에 문이 셋. 창고는 그냥 있는 방
export const SERVICE_W = 4;
function service(): ModuleDef {
  const W = SERVICE_W, D = FRONT_D;
  const walls: Rect[] = [
    [0, -T / 2, W, T / 2],                                                     // 위 (입구 길과 사이)
    [-T / 2, T / 2, T / 2, 1.0], [-T / 2, 2.0, T / 2, 3.6], [-T / 2, 4.6, T / 2, 6.1], [-T / 2, 7.1, T / 2, D],   // 왼쪽, 문 셋
    [0, 2.65 - T / 2, W, 2.65 + T / 2], [0, 5.35 - T / 2, W, 5.35 + T / 2],      // 방 사이
  ];
  const items: Item[] = [
    ...walls.map((r, i) => ({ id: `wall${i}`, kind: 'partition' as const, at: [(r[0] + r[2]) / 2, (r[1] + r[3]) / 2] as [number, number], box: r })),
    { id: 'stallM', kind: 'stall', at: [3.45, 0.75], box: [2.9, 0.06, W, 1.45] },
    { id: 'sinkM', kind: 'sink', at: [1.7, 0.3], box: box(1.7, 0.3, 0.3, 0.22) },
    { id: 'stallF', kind: 'stall', at: [3.45, 3.45], box: [2.9, 2.71, W, 4.15] },
    { id: 'sinkF', kind: 'sink', at: [1.7, 3.0], box: box(1.7, 3.0, 0.3, 0.22) },
    { id: 'signM', kind: 'sign-m', at: [0, 1.5], box: [-0.1, 1.3, 0.1, 1.7] },
    { id: 'signF', kind: 'sign-f', at: [0, 4.1], box: [-0.1, 3.9, 0.1, 4.3] },
    door('doorM', 0, 1.5, 1.0, 'z'), door('doorF', 0, 4.1, 1.0, 'z'), door('doorS', 0, 6.6, 1.0, 'z'),
    { id: 'rack', kind: 'rack', at: [2.4, 5.75], box: [1.2, 5.45, 3.6, 6.05] },
    { id: 'bucket', kind: 'bucket', at: [0.8, 7.55], box: box(0.8, 7.55, 0.22, 0.22) },
    { id: 'ladder', kind: 'ladder', at: [3.55, 7.3], box: [3.3, 6.6, 3.8, 7.9] },
    { id: 'boxes0', kind: 'boxes', at: [3.4, 6.2], box: box(3.4, 6.2, 0.3, 0.3) },
  ];
  return {
    size: [W, D],
    floors: [
      { rect: [0, 0, W, 5.35], color: 0xdfe7ec },     // 화장실 타일
      { rect: [0, 5.35, W, D], color: 0xb3ada1 },     // 창고 시멘트
    ],
    items,
    blocks: [
      ...walls.map((r) => pad(r)),
      [2.9, 0, W, 1.5], [2.9, 2.65, W, 4.2],
      box(1.7, 0.3, 0.35, 0.3), box(1.7, 3.0, 0.35, 0.3),
      [1.1, 5.35, 3.7, 6.15], box(0.8, 7.55, 0.3, 0.3), [3.2, 6.5, W, D], box(3.4, 6.2, 0.35, 0.35),
    ],
    desks: [],
    restroom: { male: [[1.4, 1.2], [2.2, 1.6]], female: [[1.4, 3.9], [2.2, 4.3]] },
    // 화장실·창고는 이름 없이 (사용자) — 문 옆 남·여 표지로 안다
  };
}

// 수족관 — 5c 세션이 만든 모듈(wetherilli 011)에 문틀을 달고 관람 자리·수조를 붙인다. 입구가 왼쪽이라 그 앞에 정원 길
function aquarium(): ModuleDef {
  const def = aquariumModule();
  def.items.push(door('door', 0, 2.7, 1.4, 'z'));
  def.labels = (def.labels ?? []).map((l) => ({ ...l, y: DOOR_TOP + 0.12 }));
  def.aqua = { view: AQUA_VIEW, tanks: TANKS };
  return def;
}
// 공용실 앞 정원 길 (7×6) — 공용실에서 수족관 입구로. 화분과 벤치 하나
function garden(): ModuleDef {
  const items: Item[] = [], blocks: Rect[] = [];
  addProps(items, blocks, [
    prop('tall0', 'plant_tall', 0.5, 5.5), prop('bush0', 'plant_bush', 3.0, 5.5), prop('bush1', 'plant_bush', 6.3, 0.6),
    prop('succ0', 'plant_succulent', 0.5, 0.6), prop('lamp', 'floor_lamp', 5.0, 5.5),
  ]);
  return { size: [7, 6], floors: [{ rect: [0, 0, 7, 6], color: 0xd2d6c4 }], items, blocks, desks: [] };
}

export const MODULES = {
  aquarium: aquarium(),
  garden: garden(),
  dino: dinoRoom(),
  library: library(),
  'backwall-library': { size: [LIBRARY_W, 0], floors: [], items: [], blocks: [], desks: [], tall: ['backwall'] } as ModuleDef,
  service: service(),
  entrance: entrance(),
  office: office(false),
  'office-s': office(false, 's'),
  'office-l': office(false, 'l'),
  'office-gsm': office(false, 'l', 'gsm'),
  'office-rash': office(true),
  front: front(),
  corridor: floorOnly(PER_ROW * OFFICE_W, CORRIDOR, 0xc9c6bb),
  hall: floorOnly(HALL_W, ROW_D, 0xc9c6bb),
  // 바깥 벽 — 바닥 없이 벽만
  leftwall: { size: [0, ROW_D], floors: [], items: [], blocks: [], desks: [], tall: ['leftwall'] } as ModuleDef,
  backwall: { size: [OFFICE_W, 0], floors: [], items: [], blocks: [], desks: [], tall: ['backwall'] } as ModuleDef,
  'backwall-s': { size: [OFFICE_W / 2, 0], floors: [], items: [], blocks: [], desks: [], tall: ['backwall'] } as ModuleDef,
  'backwall-l': { size: [OFFICE_W * 2, 0], floors: [], items: [], blocks: [], desks: [], tall: ['backwall'] } as ModuleDef,
  'backwall-rash': { size: [OFFICE_W, 0], floors: [], items: [], blocks: [], desks: [], tall: ['backwall-rash'] } as ModuleDef,
  'backwall-hall': { size: [HALL_W, 0], floors: [], items: [], blocks: [], desks: [], tall: ['backwall'] } as ModuleDef,
} satisfies Record<string, ModuleDef>;

export type ModuleType = keyof typeof MODULES;
