// 로우폴리 모형 — 굽기(web/bake/)에서만 쓴다. 시제품 agent-office-3d.html 의 bx() 꼴을 그대로 옮겼다.
// 화면은 three 를 싣지 않는다 — 여기서 구운 그림(web/public/sprites/)만 붙인다.
import * as THREE from 'three';
import {
  SCREEN_OFF, CAP, HEAD_Y, SIT_LIFT, HAIR_COLOR, PARTITION_H, RASH_WALL_H, type BodyShape, type Look, type Rect,
} from './layout.ts';
import { MODULES, DOOR_TOP, type Item, type ModuleType } from './modules.ts';
import { PROPS } from './props.ts';

const mats = new Map<number, THREE.MeshLambertMaterial>();
function mat(c: number): THREE.MeshLambertMaterial {
  let m = mats.get(c);
  if (!m) { m = new THREE.MeshLambertMaterial({ color: c, flatShading: true }); mats.set(c, m); }
  return m;
}

function bx(g: THREE.Object3D, w: number, h: number, d: number, c: number, x: number, y: number, z: number, cast = true): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(c));
  m.position.set(x, y, z);
  m.castShadow = cast;
  m.receiveShadow = true;
  g.add(m);
  return m;
}

function mesh(g: THREE.Object3D, geo: THREE.BufferGeometry, c: number, x: number, y: number, z: number): THREE.Mesh {
  const m = new THREE.Mesh(geo, mat(c));
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  g.add(m);
  return m;
}

// call: 고객센터 상담 책상 — 상판 색이 다르고 전화기가 있다
function desk(x: number, z: number, call = false): THREE.Group {
  const g = new THREE.Group();
  bx(g, 2, 0.1, 0.9, call ? 0x9ccfb8 : 0xd4a373, x, 0.78, z);
  if (call) {
    bx(g, 0.34, 0.08, 0.24, 0x2c2c2a, x + 0.6, 0.87, z + 0.1);          // 전화기
    bx(g, 0.36, 0.06, 0.08, 0xd85a30, x + 0.6, 0.94, z + 0.1);          // 수화기
  }
  bx(g, 0.1, 0.74, 0.8, 0xb07a48, x - 0.92, 0.37, z);
  bx(g, 0.1, 0.74, 0.8, 0xb07a48, x + 0.92, 0.37, z);
  bx(g, 0.08, 0.3, 0.08, 0x444441, x, 0.98, z - 0.25);
  bx(g, 0.8, 0.5, 0.06, 0x2c2c2a, x, 1.35, z - 0.25);
  const s = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.4), new THREE.MeshBasicMaterial({ color: SCREEN_OFF }));
  s.position.set(x, 1.35, z - 0.215);
  g.add(s);
  return g;
}

// 사무 의자 — 원점이 의자 가운데 바닥. 방석 위 0.52, 등받이는 +z 쪽
function chair(x: number, z: number): THREE.Group {
  const g = new THREE.Group();
  bx(g, 0.6, 0.08, 0.6, 0x5f5e5a, x, 0.48, z);
  bx(g, 0.6, 0.55, 0.08, 0x5f5e5a, x, 0.75, z + 0.3);
  bx(g, 0.08, 0.44, 0.08, 0x444441, x, 0.22, z);
  return g;
}

// 접이식 철제 의자 (rash 방)
function rashChair(x: number, z: number): THREE.Group {
  const g = new THREE.Group();
  bx(g, 0.5, 0.05, 0.5, 0x5a5953, x, 0.47, z);
  bx(g, 0.5, 0.42, 0.05, 0x5a5953, x, 0.72, z + 0.25);
  for (const dx of [-0.22, 0.22]) bx(g, 0.04, 0.46, 0.04, 0x44433f, x + dx, 0.23, z);
  return g;
}

function sofa(x: number, z: number, rot: number): THREE.Group {
  const g = new THREE.Group();
  const parts: [number, number, number, number, number, number][] = [
    [1.8, 0.35, 0.8, 0, 0.2, 0], [1.8, 0.5, 0.2, 0, 0.5, 0.32], [0.2, 0.45, 0.8, -0.9, 0.35, 0], [0.2, 0.45, 0.8, 0.9, 0.35, 0],
  ];
  parts.forEach(([w, h, d, a, b, c], i) => bx(g, w, h, d, i === 0 ? 0xed93b1 : 0xd4537e, a, b, c));
  g.position.set(x, 0, z);
  g.rotation.y = rot;
  return g;
}

function cup(g: THREE.Object3D, x: number, y: number, z: number): void {
  mesh(g, new THREE.CylinderGeometry(0.07, 0.06, 0.13, 10), 0xffffff, x, y + 0.065, z);
  mesh(g, new THREE.CylinderGeometry(0.055, 0.055, 0.01, 10), 0x6b3f22, x, y + 0.125, z);   // 커피
}

// 소파 사이 낮은 탁자 — 시제품의 책과 커피 두 잔
function table(x: number, z: number): THREE.Group {
  const g = new THREE.Group();
  bx(g, 1.6, 0.35, 0.7, 0xb07a48, x, 0.18, z);
  bx(g, 0.5, 0.12, 0.04, 0xfac775, x + 0.3, 0.4, z - 0.1, false);
  cup(g, x - 0.45, 0.35, z - 0.12);
  cup(g, x - 0.2, 0.35, z + 0.15);
  return g;
}

// 카페 둥근 탁자 — 잔 둘
function cafe(x: number, z: number, i: number): THREE.Group {
  const g = new THREE.Group();
  mesh(g, new THREE.CylinderGeometry(0.5, 0.5, 0.06, 16), 0xf4efe6, x, 0.74, z);
  mesh(g, new THREE.CylinderGeometry(0.05, 0.05, 0.7, 8), 0x444441, x, 0.37, z);
  mesh(g, new THREE.CylinderGeometry(0.25, 0.28, 0.04, 12), 0x444441, x, 0.02, z);
  cup(g, x + (i % 2 ? 0.18 : -0.18), 0.77, z - 0.1);
  cup(g, x + (i % 2 ? -0.15 : 0.2), 0.77, z + 0.16);
  return g;
}

// 카페 의자 (등받이 없는 둥근 의자)
function stool(x: number, z: number): THREE.Group {
  const g = new THREE.Group();
  mesh(g, new THREE.CylinderGeometry(0.2, 0.2, 0.07, 12), 0xd85a30, x, 0.46, z);
  mesh(g, new THREE.CylinderGeometry(0.04, 0.04, 0.42, 6), 0x444441, x, 0.21, z);
  mesh(g, new THREE.CylinderGeometry(0.16, 0.18, 0.03, 10), 0x444441, x, 0.015, z);
  return g;
}

// 커피 머신 — 칸막이에 등을 대고 +z 를 본다
function coffee(x: number, z: number): THREE.Group {
  const g = new THREE.Group();
  bx(g, 0.9, 1.1, 0.6, 0x888780, x, 0.55, z);
  bx(g, 0.5, 0.3, 0.15, 0x2c2c2a, x, 1.0, z + 0.3);
  bx(g, 0.2, 0.12, 0.2, 0xffffff, x, 0.72, z + 0.35);
  return g;
}

function plant(x: number, z: number, h: number): THREE.Group {
  const g = new THREE.Group();
  bx(g, 0.6, 0.5, 0.6, 0xd85a30, x, 0.25, z);
  mesh(g, new THREE.ConeGeometry(0.5, h, 6), 0x639922, x, 0.5 + h / 2, z);
  mesh(g, new THREE.ConeGeometry(0.38, h * 0.7, 6), 0x3b6d11, x, 0.5 + h * 0.75, z);
  return g;
}

function shelf(x: number, z: number): THREE.Group {
  const g = new THREE.Group();
  bx(g, 0.9, 2.6, 0.6, 0x7f77dd, x, 1.3, z);
  [0xd85a30, 0x378add, 0x1d9e75, 0xef9f27].forEach((c, i) => bx(g, 0.7, 0.22, 0.4, c, x, 0.5 + i * 0.6, z + 0.1, false));
  return g;
}

// 코어 보관대 — 선반 다섯 단에 시추 코어(원기둥)를 눕혀 둔다
function coreRack(x: number, z: number, len: number): THREE.Group {
  const g = new THREE.Group();
  for (let s = 0; s < 5; s++) bx(g, 0.8, 0.06, len, 0x7f77dd, x, 0.18 + s * 0.55, z);
  bx(g, 0.8, 2.4, 0.08, 0x534ab7, x, 1.2, z - len / 2);
  bx(g, 0.8, 2.4, 0.08, 0x534ab7, x, 1.2, z + len / 2);
  const colors = [0x8a7a62, 0x6e6a5e, 0xa69272, 0x5c5446, 0xb8a888];
  for (let s = 0; s < 4; s++) for (let k = 0; k < 3; k++) {
    const m = mesh(g, new THREE.CylinderGeometry(0.12, 0.12, 0.85, 8), colors[(s * 3 + k) % colors.length],
      x, 0.55 + s * 0.55, z - len / 2 + 0.55 + k * 1.05);
    m.rotation.x = Math.PI / 2;
  }
  return g;
}

// 현미경 책상
function bench(x: number, z: number, len: number): THREE.Group {
  const g = new THREE.Group();
  bx(g, 0.8, 0.1, len, 0xe8e6df, x, 0.8, z);
  const legs = Math.max(2, Math.round(len / 1.8) + 1);
  for (let k = 0; k < legs; k++) bx(g, 0.7, 0.75, 0.08, 0x888780, x, 0.38, z - len / 2 + 0.1 + (k * (len - 0.2)) / (legs - 1));
  // 현미경 — 1.1 마다 한 대
  const n = Math.max(2, Math.round(len / 1.1));
  for (let k = 0; k < n; k++) {
    const mz = z - len / 2 + (len * (k + 0.5)) / n;
    bx(g, 0.3, 0.06, 0.3, 0x2c2c2a, x, 0.88, mz);
    bx(g, 0.07, 0.4, 0.07, 0x2c2c2a, x + 0.08, 1.1, mz);
    const tube = mesh(g, new THREE.CylinderGeometry(0.05, 0.06, 0.3, 8), 0x444441, x - 0.02, 1.28, mz);
    tube.rotation.z = 0.6;
    bx(g, 0.18, 0.02, 0.18, 0x9fe1cb, x - 0.05, 0.98, mz, false);
  }
  return g;
}

// 낮은 칸막이 — 뒤의 사람이 보이게 무릎 높이, 위에 밝은 테
function partition([x0, z0, x1, z1]: Item['box']): THREE.Group {
  const g = new THREE.Group();
  const w = x1 - x0, d = z1 - z0, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
  bx(g, w, PARTITION_H, d, 0xbab6d6, cx, PARTITION_H / 2, cz);
  bx(g, w + 0.02, 0.05, d + 0.02, 0xf0eefa, cx, PARTITION_H + 0.025, cz, false);
  return g;
}

// ---- rash 방 — 칙칙하고 투박하게: 철제 책상, 배불뚝이 모니터, 판자벽, 서류함, 상자, 시든 화분
function rashDesk(x: number, z: number): THREE.Group {
  const g = new THREE.Group();
  bx(g, 2, 0.08, 0.9, 0x7d7b74, x, 0.78, z);                        // 철판 상판
  bx(g, 0.5, 0.72, 0.85, 0x6b6a64, x - 0.72, 0.37, z);             // 서랍 덩어리
  bx(g, 0.06, 0.72, 0.06, 0x55544f, x + 0.95, 0.37, z - 0.4);
  bx(g, 0.06, 0.72, 0.06, 0x55544f, x + 0.95, 0.37, z + 0.4);
  bx(g, 0.62, 0.52, 0.55, 0xbdb6a0, x, 1.1, z - 0.12);             // 배불뚝이 모니터 (누렇게 바랜)
  bx(g, 0.3, 0.06, 0.3, 0xbdb6a0, x, 0.85, z - 0.12);
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.46, 0.36), new THREE.MeshBasicMaterial({ color: SCREEN_OFF }));
  scr.position.set(x, 1.12, z + 0.155);
  g.add(scr);
  bx(g, 0.5, 0.04, 0.18, 0xa8a18c, x + 0.05, 0.84, z + 0.3, false);  // 자판
  bx(g, 0.12, 0.02, 0.09, 0x3f3e3a, x + 0.6, 0.83, z + 0.2, false);   // 재떨이
  return g;
}

function rashWall([x0, z0, x1, z1]: Item['box']): THREE.Group {
  const g = new THREE.Group();
  const w = x1 - x0, d = z1 - z0, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
  bx(g, w, RASH_WALL_H, d, 0x6f685c, cx, RASH_WALL_H / 2, cz);
  bx(g, w + 0.02, 0.06, d + 0.02, 0x4f4a42, cx, RASH_WALL_H + 0.03, cz, false);
  return g;
}

function cabinet(x: number, z: number): THREE.Group {
  const g = new THREE.Group();
  bx(g, 0.6, 1.4, 0.6, 0x6e7468, x, 0.7, z);
  for (let k = 0; k < 4; k++) bx(g, 0.5, 0.26, 0.03, 0x7f857a, x - 0.31, 0.25 + k * 0.33, z, false);
  return g;
}

function boxes(x: number, z: number, i: number): THREE.Group {
  const g = new THREE.Group();
  bx(g, 0.55, 0.4, 0.45, 0xa98b62, x, 0.2, z);
  bx(g, 0.45, 0.32, 0.4, 0x9a7d55, x + (i % 2 ? 0.04 : -0.05), 0.56, z + 0.02);
  if (i === 0) bx(g, 0.35, 0.25, 0.3, 0xb3966b, x - 0.02, 0.845, z - 0.03);
  return g;
}

function deadPlant(x: number, z: number): THREE.Group {
  const g = new THREE.Group();
  bx(g, 0.4, 0.36, 0.4, 0x7a5a44, x, 0.18, z);
  mesh(g, new THREE.ConeGeometry(0.3, 0.6, 5), 0x8a7a4a, x, 0.66, z);
  return g;
}

// 회사 입구 문틀 — 기둥 둘과 위 가로대, 간판
function doorFrame(x: number, z: number, span: number): THREE.Group {
  const g = new THREE.Group();
  for (const dz of [-span / 2, span / 2]) bx(g, 0.18, 2.4, 0.18, 0x534ab7, x, 1.2, z + dz);
  bx(g, 0.2, 0.22, span + 0.18, 0x534ab7, x, 2.4, z);
  bx(g, 0.06, 0.32, 1.4, 0xf4efe6, x + 0.1, 2.75, z);    // 간판 판
  bx(g, 0.07, 0.08, 1.1, 0x534ab7, x + 0.11, 2.75, z, false);
  return g;
}

// ---- 지도 (GSM 사무실)
// 지질도 무늬 — 색 띠가 굽이치는 판. seed 로 무늬를 바꾼다
const GEO = [0xe8c39e, 0xd9a066, 0x9fc58a, 0x7fb3c9, 0xc98b8b, 0xe6d27a, 0xb39ddb, 0x8fbf9f];
function geoPatches(g: THREE.Object3D, x0: number, y0: number, w: number, h: number, z: number, seed: number, vertical = true): void {
  const n = 6;
  for (let i = 0; i < n; i++) {
    const c = GEO[(i * 3 + seed) % GEO.length];
    const bw = w / n;
    const off = Math.sin(i * 1.7 + seed) * 0.08;
    if (vertical) bx(g, bw + 0.01, h * (0.55 + 0.4 * Math.abs(Math.sin(i + seed))), 0.012, c, x0 + bw * (i + 0.5), y0 + h / 2 + off, z, false);
    else bx(g, bw + 0.01, 0.012, h * (0.55 + 0.4 * Math.abs(Math.sin(i + seed))), c, x0 + bw * (i + 0.5), y0, z + off, false);
  }
}

// 이젤에 건 지질도
function mapBoard(x: number, z: number, seed: number): THREE.Group {
  const g = new THREE.Group();
  for (const dx of [-0.45, 0.45]) { const l = bx(g, 0.05, 1.5, 0.05, 0x8a6a4a, x + dx, 0.75, z + 0.05); l.rotation.x = -0.12; }
  bx(g, 1.15, 0.85, 0.04, 0xf4efe6, x, 1.3, z, true);                       // 판
  geoPatches(g, x - 0.52, 0.95, 1.04, 0.7, z + 0.025, seed);
  bx(g, 1.15, 0.05, 0.06, 0x5f5e5a, x, 0.86, z + 0.03, false);             // 받침
  return g;
}

// 지도를 펼친 큰 탁자
function mapTable(x: number, z: number): THREE.Group {
  const g = new THREE.Group();
  bx(g, 1.4, 0.08, 0.7, 0xb07a48, x, 0.78, z);
  for (const [dx, dz] of [[-0.62, -0.28], [0.62, -0.28], [-0.62, 0.28], [0.62, 0.28]]) bx(g, 0.07, 0.74, 0.07, 0x8a6a4a, x + dx, 0.37, z + dz);
  bx(g, 1.2, 0.01, 0.56, 0xf4efe6, x, 0.825, z, false);
  geoPatches(g, x - 0.56, 0.835, 1.12, 0.5, z, 3, false);
  mesh(g, new THREE.CylinderGeometry(0.06, 0.06, 0.1, 8), 0x6e6a5e, x + 0.4, 0.88, z - 0.15);   // 누름돌
  return g;
}

// 출입구 문틀 — 칸막이 끝에 기둥 둘, 위에 가로대 (명판을 건다). rot 0 이면 x 로 뻗는다
function doorway(x: number, z: number, span: number, rot: number): THREE.Group {
  const g = new THREE.Group();
  const top = DOOR_TOP;
  for (const d of [-span / 2, span / 2]) bx(g, 0.1, top, 0.12, 0x6f6a8a, d, top / 2, 0);
  bx(g, span + 0.1, 0.14, 0.14, 0x6f6a8a, 0, top + 0.05, 0);
  g.position.set(x, 0, z);
  g.rotation.y = rot;
  return g;
}

// ---- 공룡 방
// 나무 울타리 — 기둥을 0.9 마다, 가로대 둘
function fence([x0, z0, x1, z1]: Item['box']): THREE.Group {
  const g = new THREE.Group();
  const along = x1 - x0 > z1 - z0, len = along ? x1 - x0 : z1 - z0, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
  const n = Math.max(1, Math.round(len / 0.9));
  for (let i = 0; i <= n; i++) {
    const t = -len / 2 + (len * i) / n;
    bx(g, 0.07, 0.62, 0.07, 0x8a6a4a, along ? cx + t : cx, 0.31, along ? cz : cz + t);
  }
  for (const y of [0.25, 0.5]) bx(g, along ? len : 0.04, 0.05, along ? 0.04 : len, 0xb07a48, cx, y, cz);
  return g;
}

function feeder(x: number, z: number): THREE.Group {
  const g = new THREE.Group();
  bx(g, 0.7, 0.18, 0.36, 0x8a6a4a, x, 0.09, z);
  bx(g, 0.62, 0.04, 0.28, 0x9c3f2c, x, 0.19, z);   // 고깃덩이들
  return g;
}

function fern(x: number, z: number, seed: number): THREE.Group {
  const g = new THREE.Group();
  for (let k = 0; k < 7; k++) {
    const a = (k / 7) * Math.PI * 2 + seed;
    const leaf = mesh(g, new THREE.ConeGeometry(0.06, 0.55, 4), k % 2 ? 0x3b6d11 : 0x639922, x + Math.sin(a) * 0.12, 0.2, z + Math.cos(a) * 0.12);
    leaf.rotation.set(Math.cos(a) * 0.7, 0, -Math.sin(a) * 0.7);
  }
  return g;
}

function rock(x: number, z: number, seed: number): THREE.Group {
  const g = new THREE.Group();
  const r = mesh(g, new THREE.DodecahedronGeometry(0.28, 0), seed ? 0x8f8a80 : 0x7d786e, x, 0.14, z);
  r.scale.set(1.1, 0.6, 0.9);
  r.rotation.y = seed;
  return g;
}

function nest(x: number, z: number): THREE.Group {
  const g = new THREE.Group();
  const n = mesh(g, new THREE.TorusGeometry(0.2, 0.07, 5, 10), 0xa98b62, x, 0.06, z);
  n.rotation.x = Math.PI / 2;
  for (const [dx, dz] of [[-0.06, 0], [0.06, 0.03], [0, -0.07]]) {
    const e = mesh(g, new THREE.SphereGeometry(0.055, 8, 6), 0xf4efe6, x + dx, 0.08, z + dz);
    e.scale.y = 1.3;
  }
  return g;
}

function dinoSign(x: number, z: number): THREE.Group {
  const g = new THREE.Group();
  bx(g, 0.05, 0.9, 0.05, 0x8a6a4a, x, 0.45, z);
  bx(g, 0.56, 0.32, 0.04, 0xf4efe6, x, 0.95, z + 0.03);
  bx(g, 0.44, 0.05, 0.01, 0x6f8a3a, x, 1.0, z + 0.055, false);   // 글씨 자리
  bx(g, 0.3, 0.04, 0.01, 0x8a6a3a, x, 0.9, z + 0.055, false);
  return g;
}

// ---- 화장실·창고
// 칸막이 한 칸 — 옆판·앞판(문)과 안의 변기
function stall([x0, z0, x1, z1]: Item['box']): THREE.Group {
  const g = new THREE.Group();
  const h = 1.5, c = 0x9ab3c4;
  bx(g, 0.05, h, z1 - z0, c, x0, h / 2 + 0.1, (z0 + z1) / 2);                        // 옆판
  bx(g, x1 - x0, h, 0.05, c, (x0 + x1) / 2, h / 2 + 0.1, z1);                        // 앞판(문)
  bx(g, 0.05, 0.06, 0.12, 0x5f5e5a, x0 + 0.15, 0.95, z1 + 0.03, false);               // 손잡이
  mesh(g, new THREE.CylinderGeometry(0.2, 0.17, 0.38, 10), 0xffffff, (x0 + x1) / 2 + 0.1, 0.19, (z0 + z1) / 2 - 0.1);
  bx(g, 0.38, 0.32, 0.16, 0xffffff, (x0 + x1) / 2 + 0.1, 0.55, z0 + 0.1);             // 물탱크
  return g;
}

function sink(x: number, z: number): THREE.Group {
  const g = new THREE.Group();
  bx(g, 0.55, 0.12, 0.4, 0xffffff, x, 0.82, z);
  bx(g, 0.12, 0.7, 0.12, 0xe8e6df, x, 0.38, z - 0.05);
  bx(g, 0.05, 0.12, 0.05, 0x888780, x, 0.94, z - 0.14, false);                         // 수도꼭지
  bx(g, 0.5, 0.6, 0.03, 0xcfe8f0, x, 1.45, z - 0.2, false);                            // 거울
  return g;
}

// 화장실 표지 — 벽 위에 판, 사람 꼴 (여자는 치마 꼴의 뿔)
function sign(x: number, z: number, color: number, female: boolean): THREE.Group {
  const g = new THREE.Group();
  bx(g, 0.04, 0.42, 0.34, 0xffffff, x + 0.08, 1.05, z, false);
  mesh(g, new THREE.SphereGeometry(0.045, 8, 6), color, x + 0.11, 1.18, z);
  if (female) mesh(g, new THREE.ConeGeometry(0.08, 0.18, 8), color, x + 0.11, 1.03, z);
  else bx(g, 0.03, 0.18, 0.1, color, x + 0.11, 1.03, z, false);
  return g;
}

// 창고 철제 선반 — 단 셋에 상자
function rack([x0, z0, x1, z1]: Item['box']): THREE.Group {
  const g = new THREE.Group();
  const w = x1 - x0, d = z1 - z0, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
  for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) bx(g, 0.05, 1.8, 0.05, 0x6b6a64, cx + dx * (w / 2 - 0.03), 0.9, cz + dz * (d / 2 - 0.03));
  const cols = [0xa98b62, 0x9a7d55, 0xb3966b, 0x8a7a62];
  for (let s = 0; s < 3; s++) {
    bx(g, w, 0.04, d, 0x7d7b74, cx, 0.3 + s * 0.6, cz);
    for (let k = 0; k < 3; k++) if ((s + k) % 4 !== 3) bx(g, 0.5, 0.32, d - 0.08, cols[(s * 3 + k) % 4], x0 + 0.45 + k * 0.75, 0.48 + s * 0.6, cz);
  }
  return g;
}

function bucket(x: number, z: number): THREE.Group {
  const g = new THREE.Group();
  mesh(g, new THREE.CylinderGeometry(0.18, 0.15, 0.3, 10), 0xef9f27, x, 0.15, z);
  const stick = mesh(g, new THREE.CylinderGeometry(0.02, 0.02, 1.3, 6), 0xb07a48, x + 0.08, 0.75, z);
  stick.rotation.z = -0.15;
  return g;
}

function ladder(x: number, z: number): THREE.Group {
  const g = new THREE.Group();
  for (const dz of [-0.25, 0.25]) { const r = bx(g, 0.05, 1.9, 0.05, 0xbdbbb2, x, 0.95, z + dz); r.rotation.z = 0.12; }
  for (let k = 0; k < 6; k++) bx(g, 0.04, 0.04, 0.5, 0xbdbbb2, x - 0.02 - k * 0.035, 0.25 + k * 0.3, z);
  return g;
}

export function buildItem(it: Item): THREE.Group {
  const [x, z] = it.at;
  const len = Math.max(it.box[2] - it.box[0], it.box[3] - it.box[1]);
  switch (it.kind) {
    case 'desk': return desk(x, z);
    case 'call': return desk(x, z, true);
    case 'rashdesk': return rashDesk(x, z);
    case 'chair': return chair(x, z);
    case 'rashchair': return rashChair(x, z);
    case 'partition': return partition(it.box);
    case 'rashwall': return rashWall(it.box);
    case 'sofa': return sofa(x, z, it.rot ?? Math.PI);
    case 'table': return table(x, z);
    case 'cafe': return cafe(x, z, Number(it.id.slice(4)));
    case 'stool': return stool(x, z);
    case 'coffee': return coffee(x, z);
    case 'core': return coreRack(x, z, len);
    case 'bench': return bench(x, z, len);
    case 'shelf': return shelf(x, z);
    case 'plant': return plant(x, z, it.h ?? 1.3);
    case 'cabinet': return cabinet(x, z);
    case 'boxes': return boxes(x, z, Number(it.id.slice(5)));
    case 'deadplant': return deadPlant(x, z);
    case 'doorframe': return doorFrame(x, z, it.box[3] - it.box[1] - 0.2);
    case 'prop': return PROPS[it.prop as keyof typeof PROPS].build(x, z, it.rot ?? 0);
    case 'mapboard': return mapBoard(x, z, Number(it.id.slice(3)));
    case 'door': return doorway(x, z, it.h ?? 1.4, it.rot ?? 0);
    case 'fence': return fence(it.box);
    case 'feeder': return feeder(x, z);
    case 'fern': return fern(x, z, Number(it.id.slice(4)));
    case 'rock': return rock(x, z, Number(it.id.slice(4)));
    case 'nest': return nest(x, z);
    case 'dinosign': return dinoSign(x, z);
    case 'maptable': return mapTable(x, z);
    case 'stall': return stall(it.box);
    case 'sink': return sink(x, z);
    case 'sign-m': return sign(x, z, 0x378add, false);
    case 'sign-f': return sign(x, z, 0xd85a30, true);
    case 'rack': return rack(it.box);
    case 'bucket': return bucket(x, z);
    case 'ladder': return ladder(x, z);
  }
}

// 모듈의 바닥 층 — 바닥 판, 격자, 깔개. 그림자는 굽기가 가구를 보이지 않게 두고 받는다
export function buildFloor(type: ModuleType): THREE.Group {
  const g = new THREE.Group();
  const def = MODULES[type];
  const pts: number[] = [];
  for (const f of def.floors) {
    const [x0, z0, x1, z1] = f.rect;
    bx(g, x1 - x0, 0.5, z1 - z0, f.color, (x0 + x1) / 2, -0.25, (z0 + z1) / 2, false);
    for (let x = Math.ceil(x0); x <= x1; x++) pts.push(x, 0.005, z0, x, 0.005, z1);
    for (let z = Math.ceil(z0); z <= z1; z++) pts.push(x0, 0.005, z, x1, 0.005, z);
  }
  if (pts.length) {
    g.add(new THREE.LineSegments(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(pts, 3)),
      new THREE.LineBasicMaterial({ color: 0xb4b2a9, transparent: true, opacity: 0.45 })));
  }
  if (def.flats?.includes('rug')) bx(g, 4.6, 0.04, 5.8, 0xfaeeda, 20.5, 0.02, 3.6, false);   // 휴게실 소파 깔개
  if (def.flats?.includes('mat')) bx(g, 1.2, 0.03, 1.4, 0x5f5e5a, 0.7, 0.015, 1, false);    // 입구 깔개
  return g;
}

// 모듈의 큰 것 — 바깥 벽, rash 방 맨 전구. 가구(items)는 따로
export function buildTall(type: ModuleType): THREE.Group {
  const g = new THREE.Group();
  const def = MODULES[type];
  const [w, d] = def.size;
  for (const t of def.tall ?? []) {
    if (t === 'leftwall') bx(g, 0.25, 3.2, d, 0xafa9ec, -0.125, 1.6, d / 2);
    if (t === 'backwall') bx(g, w, 3.2, 0.25, 0xcecbf6, w / 2, 1.6, -0.125);
    if (t === 'backwall-rash') {
      bx(g, w, 3.2, 0.25, 0x8e877b, w / 2, 1.6, -0.125);                // 때 묻은 회갈색
      bx(g, 1.2, 0.8, 0.03, 0xa59a7e, w * 0.3, 1.9, 0.02, false);        // 누렇게 바랜 달력
      bx(g, 0.9, 0.5, 0.03, 0x7a705e, w * 0.75, 2.2, 0.02, false);       // 얼룩
    }
    if (t === 'bulb') {                                                   // 천장에서 늘어진 맨 전구
      bx(g, 0.02, 0.7, 0.02, 0x2c2c2a, w / 2, 2.85, d / 2, false);
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), new THREE.MeshBasicMaterial({ color: 0xf6d98a }));
      b.position.set(w / 2, 2.45, d / 2);
      g.add(b);
    }
  }
  return g;
}

// 캐릭터는 몸과 머리를 따로 굽고 화면이 겹친다 — 생김새(머리 모양·피부·옷 꼴)를 늘려도 조각 수가 곱해지지 않게.
// 몸: 발이 원점. 머리: 머리 가운데가 (0, HEAD_Y, 0). 앞(얼굴)은 +z, rot 으로 돌린다.
export function buildBody(color: number, shape: BodyShape, sit: boolean): THREE.Group {
  const g = new THREE.Group();
  const [rt, rb] = shape === 'dress' ? [0.21, 0.38] : [0.26, 0.32];
  const body = mesh(g, new THREE.CylinderGeometry(rt, rb, 0.75, shape === 'dress' ? 10 : 8), color, 0, 0.42, 0);
  if (sit) { body.scale.y = 0.82; g.position.y = SIT_LIFT; }
  return g;
}

export function buildHead(skin: number, look: Look, cap: boolean, rot: number): THREE.Group {
  const g = new THREE.Group();
  const y = HEAD_Y;
  mesh(g, new THREE.SphereGeometry(0.24, 12, 10), skin, 0, y, 0);
  for (const ex of [-0.08, 0.08]) mesh(g, new THREE.SphereGeometry(0.028, 6, 4), 0x2c2c2a, ex, y + 0.01, 0.225);   // 눈
  const hc = HAIR_COLOR[look];
  const cap0 = (r: number, theta: number, tilt: number, sy = 1) => {
    const h = mesh(g, new THREE.SphereGeometry(r, 12, 6, 0, Math.PI * 2, 0, theta), hc, 0, y + 0.03, 0);
    h.rotation.x = tilt; h.scale.y = sy;
    return h;
  };
  switch (look) {
    case 'short': cap0(0.25, Math.PI / 2.2, -0.25); break;
    case 'buzz': cap0(0.246, Math.PI / 2.6, -0.3, 0.9); break;
    case 'curly':
      cap0(0.25, Math.PI / 2.3, -0.2);
      for (let k = 0; k < 9; k++) {
        const a = (k / 9) * Math.PI * 2;
        mesh(g, new THREE.IcosahedronGeometry(0.09, 0), hc, Math.sin(a) * 0.19, y + 0.17 + (k % 2) * 0.04, Math.cos(a) * 0.19 - 0.03);
      }
      break;
    case 'long': {
      cap0(0.255, Math.PI / 2.1, -0.15);
      const back = mesh(g, new THREE.BoxGeometry(0.46, 0.5, 0.12), hc, 0, y - 0.12, -0.17);
      back.rotation.x = 0.08;
      for (const sx of [-0.21, 0.21]) mesh(g, new THREE.BoxGeometry(0.07, 0.38, 0.22), hc, sx, y - 0.08, -0.04);
      break;
    }
    case 'bob': {
      // 뒤·옆을 감싸는 반구 (얼굴 쪽은 연다)
      const h = mesh(g, new THREE.SphereGeometry(0.275, 14, 8, Math.PI * 0.62, Math.PI * 1.76, 0, Math.PI * 0.68), hc, 0, y + 0.02, 0);
      h.rotation.y = 0;
      cap0(0.258, Math.PI / 2.2, -0.2);
      break;
    }
    case 'ponytail': {
      cap0(0.255, Math.PI / 2.1, -0.2);
      mesh(g, new THREE.SphereGeometry(0.075, 8, 6), hc, 0, y + 0.08, -0.26);
      const tail = mesh(g, new THREE.CylinderGeometry(0.06, 0.03, 0.34, 6), hc, 0, y - 0.1, -0.3);
      tail.rotation.x = 0.35;
      break;
    }
    case 'bun':
      cap0(0.255, Math.PI / 2.1, -0.2);
      mesh(g, new THREE.SphereGeometry(0.11, 10, 8), hc, 0, y + 0.24, -0.1);
      break;
  }
  if (cap) {
    mesh(g, new THREE.CylinderGeometry(0.255, 0.265, 0.14, 12), CAP, 0, y + 0.17, 0);
    const brim = mesh(g, new THREE.BoxGeometry(0.34, 0.03, 0.2), CAP, 0, y + 0.11, 0.25);
    brim.rotation.x = 0.15;
  }
  g.rotation.y = rot;
  return g;
}

