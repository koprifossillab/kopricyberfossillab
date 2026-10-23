// 수족관 방 (10×6) — 쉬는 사람이 들러 구경하는 장식용 방. 뒤 벽(z=0)에 큰 수조 셋, 가운데 원통 수조, 관람 벤치 둘, 안내판.
// 출입구는 왼쪽 벽(x=0)의 z 2.0~3.4, 오른쪽·앞은 열어 둔다(카메라 쪽). 좌표는 모듈 안의 것(왼쪽 뒤 바닥 모서리가 원점).
// 물고기는 원천에 없는 화면만의 연출 — 모형은 buildFish, 움직임은 iso/fish.ts, 다니는 곳은 TANKS.
// 모형은 굽기에서만 쓴다(models.ts 의 buildItem 이 새 갈래를 buildAquaItem 에 넘긴다). models.ts 를 부르지 않는다 — 서로 부르면 MODULES 가 돌기 전에 읽힌다.
import * as THREE from 'three';
import type { Rect } from './layout.ts';
import type { Item, ItemKind, ModuleDef } from './modules.ts';

export const AQUA_KINDS = ['tank', 'tube', 'coral', 'weed', 'aquarock', 'shell', 'viewbench', 'aquasign'] as const;
export type AquaKind = typeof AQUA_KINDS[number];
// modules.ts 의 ItemKind 에 AquaKind 가 더해지기 전까지 쓰는 꼴
type AquaItem = Omit<Item, 'kind'> & { kind: ItemKind | AquaKind };

export const AQUA_W = 10;
export const AQUA_D = 6;
const T = 0.12;                    // 칸막이 두께 (modules.ts 와 같다)
const DOOR: [number, number] = [2.0, 3.4];

// 수조 — 받침 위에 유리 상자. 물 높이·모래 두께는 TANKS(물고기 상자)와 모형이 같이 쓴다
const STAND_H = 0.5;               // 받침 윗면
const TANK_H = 0.95;               // 유리 높이
const SAND_H = 0.08;
const BACK: Rect[] = [[0.6, 0.14, 3.2, 1.04], [3.7, 0.14, 6.3, 1.04], [6.8, 0.14, 9.4, 1.04]];
const TUBE = { at: [5.0, 3.3] as [number, number], r: 0.55, base: 0.3, h: 1.6 };
const BENCHES: { at: [number, number]; len: number }[] = [{ at: [2.2, 4.75], len: 1.6 }, { at: [7.8, 4.75], len: 1.6 }];
const BENCH_SEAT = 0.46;           // 방석 윗면 — 앉는 높이는 SEAT_LIFT 와 같은 생각으로 이것에 맞춘다(의자 0.52 → 0.29)
const SIGN: [number, number] = [9.2, 2.7];

const box = (x: number, z: number, hw: number, hd: number): Rect => [x - hw, z - hd, x + hw, z + hd];
const pad = ([x0, z0, x1, z1]: Rect, p = 0.1): Rect => [x0 - p, z0 - p, x1 + p, z1 + p];
const mid = (r: Rect): [number, number] => [(r[0] + r[2]) / 2, (r[1] + r[3]) / 2];

// 물고기가 다니는 상자 (모듈 안 좌표). 유리·모래·물 위에서 조금씩 떨어진다. 원통은 안에 든 네모
export const TANKS: { box: Rect; y0: number; y1: number }[] = [
  ...BACK.map(([x0, z0, x1, z1]) => ({
    box: [x0 + 0.22, z0 + 0.18, x1 - 0.22, z1 - 0.18] as Rect,
    y0: STAND_H + SAND_H + 0.14, y1: STAND_H + TANK_H - 0.16,
  })),
  {
    box: box(TUBE.at[0], TUBE.at[1], TUBE.r * 0.6, TUBE.r * 0.6),
    y0: TUBE.base + SAND_H + 0.16, y1: TUBE.base + TUBE.h - 0.2,
  },
];

// 관람 자리 — 벤치에 앉는 넷, 수조 앞에 서는 여섯. face 는 바라보는 쪽(atan2(dx, dz), π 면 뒤 벽 쪽)
export const AQUA_VIEW: { at: [number, number]; face: number; pose: 'sit' | 'stand'; on?: string; lift?: number }[] = [
  ...BENCHES.flatMap(({ at: [x, z] }, i) => [-0.4, 0.4].map((dx) => ({
    at: [x + dx, z] as [number, number], face: Math.PI, pose: 'sit' as const, on: `bench${i}`, lift: BENCH_SEAT - 0.23,
  }))),
  ...BACK.map((r) => ({ at: [mid(r)[0], 1.7] as [number, number], face: Math.PI, pose: 'stand' as const })),
  { at: [TUBE.at[0], TUBE.at[1] + 1.05], face: Math.PI, pose: 'stand' },
  { at: [TUBE.at[0] - 1.05, TUBE.at[1]], face: Math.PI / 2, pose: 'stand' },
  { at: [TUBE.at[0] + 1.05, TUBE.at[1]], face: -Math.PI / 2, pose: 'stand' },
];

export function aquariumModule(): ModuleDef {
  const W = AQUA_W, D = AQUA_D;
  const walls: Rect[] = [
    [0, -T / 2, W, T / 2],                                  // 뒤
    [-T / 2, T / 2, T / 2, DOOR[0]], [-T / 2, DOOR[1], T / 2, D],   // 왼쪽, 출입구
  ];
  const items: AquaItem[] = [
    ...walls.map((r, i) => ({ id: `wall${i}`, kind: 'partition' as const, at: mid(r), box: r })),
    ...BACK.map((r, i) => ({ id: `tank${i}`, kind: 'tank' as const, at: mid(r), box: r, h: STAND_H + TANK_H })),
    { id: 'tube', kind: 'tube', at: TUBE.at, box: box(TUBE.at[0], TUBE.at[1], TUBE.r, TUBE.r), h: TUBE.base + TUBE.h },
    ...BENCHES.map(({ at, len }, i) => ({ id: `bench${i}`, kind: 'viewbench' as const, at, box: box(at[0], at[1], len / 2, 0.22) })),
    { id: 'sign', kind: 'aquasign', at: SIGN, box: box(SIGN[0], SIGN[1], 0.32, 0.1) },   // 앞(+z, 카메라 쪽)을 본다
    // 바닥 장식 — 방 구석의 산호 돌무더기와 해초 화분
    { id: 'coral0', kind: 'coral', at: [9.5, 5.5], box: box(9.5, 5.5, 0.3, 0.3) },
    { id: 'weed0', kind: 'weed', at: [0.45, 5.5], box: box(0.45, 5.5, 0.25, 0.25) },
    { id: 'aquarock0', kind: 'aquarock', at: [0.45, 1.5], box: box(0.45, 1.5, 0.25, 0.22) },
    { id: 'shell0', kind: 'shell', at: [9.55, 4.6], box: box(9.55, 4.6, 0.18, 0.15) },
  ];
  const blocks: Rect[] = [
    ...walls.map((r) => pad(r)),
    ...BACK.map((r) => pad(r, 0.12)),
    box(TUBE.at[0], TUBE.at[1], TUBE.r + 0.12, TUBE.r + 0.12),
    ...BENCHES.map(({ at, len }) => box(at[0], at[1], len / 2 + 0.05, 0.27)),
    box(SIGN[0], SIGN[1], 0.37, 0.15),
    box(9.5, 5.5, 0.35, 0.35), box(0.45, 5.5, 0.3, 0.3), box(0.45, 1.5, 0.3, 0.27), box(9.55, 4.6, 0.22, 0.2),
  ];
  return {
    size: [W, D],
    floors: [
      { rect: [0, 0, W, D], color: 0xc9d6dc },                // 푸르스름한 타일
      { rect: [0.4, 1.35, 9.6, 2.05], color: 0x9fb8c4 },      // 수조 앞 관람 띠
    ],
    // ModuleDef.items 는 Item[] — modules.ts 의 ItemKind 에 AquaKind 를 더하면 이 단언은 필요 없다
    items: items as Item[],
    blocks,
    desks: [],
    labels: [{ name: '수족관', at: [0, (DOOR[0] + DOOR[1]) / 2], y: 1.45, axis: 'z' }],   // 출입구 위
  };
}

// ---- 모형 (굽기에서만) — models.ts 와 같은 꼴: flatShading Lambert, 같은 색은 재료 하나
const mats = new Map<string, THREE.MeshLambertMaterial>();
function mat(c: number, opacity = 1): THREE.MeshLambertMaterial {
  const key = `${c}/${opacity}`;
  let m = mats.get(key);
  if (!m) {
    m = new THREE.MeshLambertMaterial({ color: c, flatShading: true, transparent: opacity < 1, opacity, depthWrite: opacity >= 1 });
    mats.set(key, m);
  }
  return m;
}
function mesh(g: THREE.Object3D, geo: THREE.BufferGeometry, c: number, x: number, y: number, z: number, opacity = 1): THREE.Mesh {
  const m = new THREE.Mesh(geo, mat(c, opacity));
  m.position.set(x, y, z);
  m.castShadow = opacity >= 1;
  m.receiveShadow = true;
  g.add(m);
  return m;
}
const bx = (g: THREE.Object3D, w: number, h: number, d: number, c: number, x: number, y: number, z: number, opacity = 1) =>
  mesh(g, new THREE.BoxGeometry(w, h, d), c, x, y, z, opacity);

// 고정된 난수 — 같은 수조는 굽을 때마다 같은 모습
function rng(seed: number): () => number {
  let s = (seed * 2654435761) >>> 0 || 1;
  return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
}

const GLASS = 0xbfe6f0, WATER = 0x4fa3c7, SAND = 0xe6d3a3, FRAME = 0x3d4a52;
const CORALS = [0xe8735a, 0xf2a2b8, 0xf4c25b, 0xb06ac9];

function coralAt(g: THREE.Object3D, x: number, y: number, z: number, c: number, s = 1): void {
  // 가지 산호 — 기울인 원기둥 몇 개와 끝의 공
  for (let k = 0; k < 4; k++) {
    const a = k * 1.7, h = (0.16 + (k % 2) * 0.07) * s;
    const br = mesh(g, new THREE.CylinderGeometry(0.018 * s, 0.03 * s, h, 5), c, x + Math.sin(a) * 0.04 * s, y + h / 2, z + Math.cos(a) * 0.04 * s);
    br.rotation.set(Math.cos(a) * 0.45, 0, -Math.sin(a) * 0.45);
    mesh(g, new THREE.SphereGeometry(0.03 * s, 5, 4), c, x + Math.sin(a) * 0.1 * s, y + h * 0.95, z + Math.cos(a) * 0.1 * s);
  }
}
function weedAt(g: THREE.Object3D, x: number, y: number, z: number, h: number, seed: number): void {
  // 해초 — 가늘고 긴 잎이 위로 갈수록 조금씩 휜다
  for (let k = 0; k < 3; k++) {
    let px = x + (k - 1) * 0.04, py = y;
    for (let s = 0; s < 3; s++) {
      const seg = h / 3;
      const leaf = mesh(g, new THREE.BoxGeometry(0.03, seg, 0.012), k % 2 ? 0x3f8f4a : 0x5aa85a, px, py + seg / 2, z);
      const bend = Math.sin(seed + k * 2 + s) * 0.25;
      leaf.rotation.z = bend;
      px -= Math.sin(bend) * seg;
      py += Math.cos(bend) * seg;
    }
  }
}
function rockAt(g: THREE.Object3D, x: number, y: number, z: number, r: number, seed: number): void {
  const m = mesh(g, new THREE.DodecahedronGeometry(r, 0), seed % 2 ? 0x8f8a80 : 0x6f6b64, x, y + r * 0.5, z);
  m.scale.set(1.2, 0.65, 0.9);
  m.rotation.y = seed;
}
function shellAt(g: THREE.Object3D, x: number, y: number, z: number, s = 1): void {
  const m = mesh(g, new THREE.ConeGeometry(0.05 * s, 0.07 * s, 7), 0xf4e2d0, x, y + 0.02 * s, z);
  m.rotation.z = Math.PI / 2.4;
  mesh(g, new THREE.SphereGeometry(0.03 * s, 6, 4), 0xe9b9a0, x - 0.03 * s, y + 0.02 * s, z);
}

// 수조 속 꾸밈 — 모래 위에 산호·해초·바위·조개를 흩는다 (상자 안, 바닥 높이 y)
function scatter(g: THREE.Object3D, [x0, z0, x1, z1]: Rect, y: number, seed: number, n: number): void {
  const r = rng(seed);
  const at = (): [number, number] => [x0 + 0.15 + r() * (x1 - x0 - 0.3), z0 + 0.12 + r() * (z1 - z0 - 0.3)];
  for (let i = 0; i < n; i++) {
    const [x, z] = at(), k = i % 4;
    if (k === 0) coralAt(g, x, y, z, CORALS[Math.floor(r() * CORALS.length)], 0.9 + r() * 0.5);
    else if (k === 1) weedAt(g, x, y, Math.min(z, z0 + 0.3), 0.35 + r() * 0.3, seed + i);   // 해초는 뒤쪽에
    else if (k === 2) rockAt(g, x, y, z, 0.07 + r() * 0.06, seed + i);
    else shellAt(g, x, y, z, 0.8 + r() * 0.4);
  }
}

function tank(r: Rect, seed: number): THREE.Group {
  const g = new THREE.Group();
  const [x0, z0, x1, z1] = r, w = x1 - x0, d = z1 - z0, [cx, cz] = mid(r);
  bx(g, w, STAND_H, d, 0x4a5560, cx, STAND_H / 2, cz);                              // 받침장
  bx(g, w - 0.1, 0.03, 0.01, 0x6c7a86, cx, STAND_H * 0.55, z1 + 0.005);               // 받침 문 틈
  bx(g, w - 0.04, SAND_H, d - 0.04, SAND, cx, STAND_H + SAND_H / 2, cz);              // 모래
  scatter(g, [x0 + 0.03, z0 + 0.03, x1 - 0.03, z1 - 0.03], STAND_H + SAND_H, seed * 7 + 3, 9);
  // 물과 유리 — 반투명. 물은 유리보다 조금 낮게, 뒤판은 짙게(배경)
  const wH = TANK_H - 0.08;
  bx(g, w - 0.04, wH - SAND_H, d - 0.04, WATER, cx, STAND_H + SAND_H + (wH - SAND_H) / 2, cz, 0.28);
  bx(g, w - 0.04, TANK_H - 0.02, 0.02, 0x2f6f8f, cx, STAND_H + TANK_H / 2, z0 + 0.02);  // 뒤판
  bx(g, w, TANK_H, 0.015, GLASS, cx, STAND_H + TANK_H / 2, z1 - 0.008, 0.18);         // 앞 유리
  for (const x of [x0 + 0.008, x1 - 0.008]) bx(g, 0.015, TANK_H, d, GLASS, x, STAND_H + TANK_H / 2, cz, 0.18);
  // 테두리와 뚜껑 조명
  for (const [fx, fz, fw, fd] of [[cx, z1, w, 0.04], [cx, z0, w, 0.04], [x0, cz, 0.04, d], [x1, cz, 0.04, d]] as const) {
    bx(g, fw, 0.05, fd, FRAME, fx, STAND_H + TANK_H, fz);
    bx(g, fw, 0.04, fd, FRAME, fx, STAND_H + 0.02, fz);
  }
  for (const x of [x0, x1]) for (const z of [z0, z1]) bx(g, 0.04, TANK_H, 0.04, FRAME, x, STAND_H + TANK_H / 2, z);
  bx(g, w * 0.8, 0.04, 0.1, 0xeaf6fa, cx, STAND_H + TANK_H + 0.04, cz - d * 0.2);    // 조명 막대
  return g;
}

function tube(x: number, z: number): THREE.Group {
  const g = new THREE.Group();
  const { r, base, h } = TUBE;
  mesh(g, new THREE.CylinderGeometry(r + 0.06, r + 0.1, base, 16), 0x4a5560, x, base / 2, z);
  mesh(g, new THREE.CylinderGeometry(r - 0.02, r - 0.02, SAND_H, 16), SAND, x, base + SAND_H / 2, z);
  const rr = rng(41);
  coralAt(g, x - 0.18, base + SAND_H, z + 0.08, CORALS[0], 1.3);
  coralAt(g, x + 0.2, base + SAND_H, z - 0.1, CORALS[3], 1.0);
  weedAt(g, x + 0.05, base + SAND_H, z - 0.25, 0.9, 5);
  weedAt(g, x - 0.25, base + SAND_H, z - 0.15, 0.7, 9);
  rockAt(g, x + 0.12, base + SAND_H, z + 0.2, 0.1, 2);
  shellAt(g, x - 0.05, base + SAND_H, z + 0.28, 1 + rr() * 0.3);
  mesh(g, new THREE.CylinderGeometry(r - 0.02, r - 0.02, h - 0.12 - SAND_H, 18, 1, true), WATER, x, base + SAND_H + (h - 0.12 - SAND_H) / 2, z, 0.28);
  mesh(g, new THREE.CylinderGeometry(r, r, h, 18, 1, true), GLASS, x, base + h / 2, z, 0.2);
  const rim = mesh(g, new THREE.TorusGeometry(r + 0.01, 0.03, 4, 18), FRAME, x, base + h, z);   // 테만 — 뚜껑을 덮으면 위에서 속이 안 보인다
  rim.rotation.x = Math.PI / 2;
  // 공기 방울 — 가운데로 올라가는 줄
  for (let k = 0; k < 6; k++) mesh(g, new THREE.SphereGeometry(0.018 + (k % 3) * 0.006, 5, 4), 0xeaf6fa, x + Math.sin(k) * 0.03, base + 0.25 + k * 0.2, z + 0.05, 0.7);
  return g;
}

// 관람 벤치 — 등받이 없는 나무 의자, 길이 방향은 x
function viewBench([x0, z0, x1, z1]: Rect): THREE.Group {
  const g = new THREE.Group();
  const w = x1 - x0, d = z1 - z0, [cx, cz] = mid([x0, z0, x1, z1]);
  bx(g, w, 0.07, d, 0xb07a48, cx, BENCH_SEAT - 0.035, cz);
  for (const x of [x0 + 0.12, x1 - 0.12]) bx(g, 0.07, BENCH_SEAT - 0.07, d - 0.06, 0x3d4a52, x, (BENCH_SEAT - 0.07) / 2, cz);
  return g;
}

// 안내판 — 물고기 그림 몇 개 (글씨 대신 색 띠). rot 은 판이 보는 쪽
function aquaSign(x: number, z: number, rot: number): THREE.Group {
  const g = new THREE.Group();
  const s = new THREE.Group();
  bx(s, 0.06, 0.95, 0.06, FRAME, 0, 0.475, 0);
  bx(s, 0.62, 0.42, 0.04, 0xf4efe6, 0, 1.05, 0.03);
  bx(s, 0.5, 0.05, 0.01, 0x2f6f8f, 0, 1.19, 0.055);
  FISH.slice(0, 4).forEach((f, i) => bx(s, 0.09, 0.05, 0.01, f.body, -0.18 + i * 0.12, 1.04, 0.055));
  bx(s, 0.42, 0.03, 0.01, 0x8a8680, 0, 0.93, 0.055);
  s.rotation.y = rot;
  s.position.set(x, 0, z);
  g.add(s);
  return g;
}

function corner(kind: 'coral' | 'weed' | 'aquarock' | 'shell', x: number, z: number): THREE.Group {
  const g = new THREE.Group();
  if (kind === 'coral') { rockAt(g, x, 0, z, 0.2, 3); coralAt(g, x, 0.14, z, CORALS[1], 2.2); coralAt(g, x + 0.12, 0.1, z + 0.08, CORALS[2], 1.5); }
  if (kind === 'weed') {
    mesh(g, new THREE.CylinderGeometry(0.2, 0.16, 0.3, 8), 0x8a6a4a, x, 0.15, z);
    weedAt(g, x, 0.3, z, 0.9, 1);
  }
  if (kind === 'aquarock') { rockAt(g, x, 0, z, 0.2, 1); rockAt(g, x + 0.1, 0.08, z + 0.05, 0.12, 4); }
  if (kind === 'shell') shellAt(g, x, 0, z, 2.6);
  return g;
}

// models.ts 의 buildItem 이 부른다 — 수족관의 새 갈래만 그리고, 나머지(partition 등)는 null
export function buildAquaItem(it: Item): THREE.Group | null {
  const [x, z] = it.at;
  switch (it.kind as ItemKind | AquaKind) {
    case 'tank': return tank(it.box, Number(it.id.slice(4)));
    case 'tube': return tube(x, z);
    case 'viewbench': return viewBench(it.box);
    case 'aquasign': return aquaSign(x, z, it.rot ?? 0);
    case 'coral': case 'weed': case 'aquarock': case 'shell': return corner(it.kind as 'coral', x, z);
    default: return null;
  }
}

// ---- 물고기 — 몸 가운데가 원점, 앞은 +z, rot 은 y 회전. frame 0·1 은 꼬리를 좌우로
interface FishLook { name: string; len: number; tall: number; body: number; fin: number; stripe?: number; stripes?: number }
const FISH: FishLook[] = [
  { name: '흰동가리', len: 0.2, tall: 0.6, body: 0xf07a1f, fin: 0xf07a1f, stripe: 0xffffff, stripes: 3 },
  { name: '블루탱', len: 0.26, tall: 0.75, body: 0x2f62d6, fin: 0xf2c23b, stripe: 0x13224a, stripes: 1 },
  { name: '노랑탱', len: 0.22, tall: 1.0, body: 0xf6d23a, fin: 0xf6d23a },
  { name: '네온테트라', len: 0.15, tall: 0.45, body: 0x9fc3d6, fin: 0xcfe0e8, stripe: 0x2fd0f0, stripes: 1 },
  { name: '엔젤피시', len: 0.24, tall: 1.35, body: 0xd8d4c8, fin: 0xd8d4c8, stripe: 0x2c2c2a, stripes: 3 },
  { name: '베타', len: 0.18, tall: 0.6, body: 0xc23a5a, fin: 0x8a2a8a },
];
export const FISH_KINDS = FISH.length;
export const FISH_NAMES = FISH.map((f) => f.name);

export function buildFish(opts: { kind: number; rot: number; frame: 0 | 1 }): THREE.Group {
  const f = FISH[((opts.kind % FISH_KINDS) + FISH_KINDS) % FISH_KINDS];
  const g = new THREE.Group();
  const L = f.len, H = L * f.tall * 0.55, Wd = L * 0.22;
  // 몸 — 옆으로 납작한 방추형
  const body = mesh(g, new THREE.SphereGeometry(0.5, 10, 7), f.body, 0, 0, 0);
  body.scale.set(Wd, H, L * 0.72);
  // 줄무늬 — 몸을 두르는 얇은 띠 (세로) 또는 옆줄 하나 (가로, 네온테트라)
  if (f.stripe && f.stripes) {
    if (f.name === '네온테트라') {
      const s = mesh(g, new THREE.BoxGeometry(Wd * 1.02, H * 0.18, L * 0.5), f.stripe, 0, H * 0.08, 0.02);
      s.scale.set(1, 1, 1);
      mesh(g, new THREE.BoxGeometry(Wd * 1.02, H * 0.2, L * 0.3), 0xe03a3a, 0, -H * 0.18, -L * 0.1);
    } else if (f.name === '블루탱') {
      const s = mesh(g, new THREE.SphereGeometry(0.5, 8, 5), f.stripe, 0, H * 0.12, -L * 0.05);
      s.scale.set(Wd * 1.04, H * 0.45, L * 0.45);
    } else {
      for (let k = 0; k < f.stripes; k++) {
        const zz = L * (0.18 - k * 0.2);
        const t = Math.sqrt(Math.max(0, 1 - (zz / (L * 0.36)) ** 2));
        mesh(g, new THREE.BoxGeometry(Wd * 0.98 * Math.max(t, 0.5), H * 0.96 * t, L * 0.05), f.stripe, 0, 0, zz);
      }
    }
  }
  // 등지느러미·배지느러미 — 엔젤피시는 길게
  const finH = f.name === '엔젤피시' ? H * 1.1 : H * 0.45;
  const dorsal = mesh(g, new THREE.ConeGeometry(L * 0.12, finH, 3), f.fin, 0, H * 0.42 + finH * 0.3, -L * 0.08);
  dorsal.scale.z = 2.2; dorsal.rotation.x = -0.5;
  const ventral = mesh(g, new THREE.ConeGeometry(L * 0.1, finH * 0.8, 3), f.fin, 0, -H * 0.42 - finH * 0.2, -L * 0.02);
  ventral.scale.z = 2; ventral.rotation.x = Math.PI + 0.5;
  // 꼬리 — 뒤(-z)에 부채꼴, frame 마다 좌우로
  const tail = new THREE.Group();
  tail.position.set(0, 0, -L * 0.34);
  tail.rotation.y = opts.frame === 0 ? 0.4 : -0.4;
  g.add(tail);
  const fin = mesh(tail, new THREE.ConeGeometry(H * (f.name === '베타' ? 1.3 : 0.8), L * (f.name === '베타' ? 0.5 : 0.32), 4), f.fin, 0, 0, -L * 0.14);
  fin.rotation.x = -Math.PI / 2;
  fin.scale.x = 0.15;
  // 눈
  for (const sx of [-1, 1]) mesh(g, new THREE.SphereGeometry(L * 0.032, 5, 4), 0x1f1a17, sx * Wd * 0.3, H * 0.12, L * 0.24);
  g.rotation.y = opts.rot;
  return g;
}
