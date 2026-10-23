// 로우폴리 모형 — 굽기(web/bake/)에서만 쓴다. 시제품 agent-office-3d.html 의 bx() 꼴을 그대로 옮겼다.
// 화면은 three 를 싣지 않는다 — 여기서 구운 그림(web/public/sprites/)만 붙인다.
import * as THREE from 'three';
import {
  W, D, DESKS, SOFAS, TABLES, COFFEE, CORE_RACK, BENCH, PLANTS, DOOR, SCREEN_OFF, FLOORS, PARTITION_H, ORDER_BOARD, type Item,
} from './layout.ts';

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
  bx(g, 0.6, 0.08, 0.6, 0x5f5e5a, x, 0.48, z + 0.85);
  bx(g, 0.6, 0.55, 0.08, 0x5f5e5a, x, 0.75, z + 1.15);
  bx(g, 0.08, 0.44, 0.08, 0x444441, x, 0.22, z + 0.85);
  return g;
}

function sofa(x: number, z: number): THREE.Group {
  const g = new THREE.Group();
  const parts: [number, number, number, number, number, number][] = [
    [1.8, 0.35, 0.8, 0, 0.2, 0], [1.8, 0.5, 0.2, 0, 0.5, 0.32], [0.2, 0.45, 0.8, -0.9, 0.35, 0], [0.2, 0.45, 0.8, 0.9, 0.35, 0],
  ];
  parts.forEach(([w, h, d, a, b, c], i) => bx(g, w, h, d, i === 0 ? 0xed93b1 : 0xd4537e, a, b, c));
  g.position.set(x, 0, z);
  g.rotation.y = Math.PI;
  return g;
}

function table(x: number, z: number, i: number): THREE.Group {
  const g = new THREE.Group();
  bx(g, 1.2, 0.35, 0.7, 0xb07a48, x, 0.18, z);
  if (i === 0) bx(g, 0.5, 0.12, 0.04, 0xfac775, x + 0.1, 0.4, z - 0.1, false);   // 시제품의 책
  return g;
}

function coffee(): THREE.Group {
  const g = new THREE.Group();
  const [x, z] = COFFEE;
  bx(g, 0.9, 1.1, 0.6, 0x888780, x, 0.55, z);
  bx(g, 0.5, 0.3, 0.15, 0x2c2c2a, x, 1.0, z - 0.3);
  bx(g, 0.2, 0.12, 0.2, 0xffffff, x, 0.72, z - 0.35);
  return g;
}

function plant(x: number, z: number, h: number): THREE.Group {
  const g = new THREE.Group();
  bx(g, 0.6, 0.5, 0.6, 0xd85a30, x, 0.25, z);
  mesh(g, new THREE.ConeGeometry(0.5, h, 6), 0x639922, x, 0.5 + h / 2, z);
  mesh(g, new THREE.ConeGeometry(0.38, h * 0.7, 6), 0x3b6d11, x, 0.5 + h * 0.75, z);
  return g;
}

function shelf(): THREE.Group {
  const g = new THREE.Group();
  bx(g, 0.9, 2.6, 0.6, 0x7f77dd, 0.6, 1.3, 0.45);
  [0xd85a30, 0x378add, 0x1d9e75, 0xef9f27].forEach((c, i) => bx(g, 0.7, 0.22, 0.4, c, 0.6, 0.5 + i * 0.6, 0.55, false));
  return g;
}

// 코어 보관대 — 선반 다섯 단에 시추 코어(원기둥)를 눕혀 둔다
function coreRack(): THREE.Group {
  const g = new THREE.Group();
  const { x, z, len } = CORE_RACK;
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
function bench(): THREE.Group {
  const g = new THREE.Group();
  const { x, z, len } = BENCH;
  bx(g, 0.8, 0.1, len, 0xe8e6df, x, 0.8, z);
  bx(g, 0.7, 0.75, 0.08, 0x888780, x, 0.38, z - len / 2 + 0.1);
  bx(g, 0.7, 0.75, 0.08, 0x888780, x, 0.38, z + len / 2 - 0.1);
  for (const mz of [z - 0.4, z + 0.45]) {
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

export function buildItem(it: Item): THREE.Group {
  const [x, z] = it.at;
  switch (it.kind) {
    case 'desk': return desk(x, z);
    case 'call': return desk(x, z, true);
    case 'partition': return partition(it.box);
    case 'sofa': return sofa(x, z);
    case 'table': return table(x, z, TABLES.findIndex(([tx]) => tx === x));
    case 'coffee': return coffee();
    case 'core': return coreRack();
    case 'bench': return bench();
    case 'shelf': return shelf();
    case 'plant': return plant(x, z, it.h ?? 1.3);
  }
}

// 바닥·벽·깔개처럼 캐릭터를 가리지 않는 것 — 배경에만 들어간다
export function buildShell(): THREE.Group {
  const g = new THREE.Group();
  for (const f of FLOORS) {
    const [x0, z0, x1, z1] = f.rect;
    bx(g, x1 - x0, 0.5, z1 - z0, f.color, (x0 + x1) / 2, -0.25, (z0 + z1) / 2, false);
  }
  const grid = new THREE.GridHelper(W, W, 0xb4b2a9, 0xb4b2a9);
  grid.scale.set(1, 1, D / W);
  grid.position.set(W / 2, 0.005, D / 2);
  (grid.material as THREE.Material).transparent = true;
  (grid.material as THREE.Material).opacity = 0.45;
  g.add(grid);
  bx(g, W, 3.2, 0.25, 0xcecbf6, W / 2, 1.6, -0.125);
  bx(g, 0.25, 3.2, D, 0xafa9ec, -0.125, 1.6, D / 2);
  bx(g, 5, 1.6, 0.06, 0xfafafa, 8, 1.7, 0.04);                          // 화이트보드 (사무실)
  bx(g, 5.2, 0.08, 0.12, 0x888780, 8, 0.88, 0.08);
  // 지령판 (고객센터) — 받은 지령 쪽지들
  bx(g, ORDER_BOARD.w, 1.5, 0.06, 0x2f4a3f, ORDER_BOARD.x, 1.75, 0.04);
  for (let i = 0; i < 9; i++) {
    const c = [0xfac775, 0x9fe1cb, 0xf4c0d1, 0xffffff][i % 4];
    bx(g, 0.5, 0.36, 0.03, c, ORDER_BOARD.x - 1.6 + (i % 5) * 0.8, 2.15 - Math.floor(i / 5) * 0.6 - (i % 2) * 0.08, 0.09, false);
  }
  ([[6.4, 1.4, 0xfac775], [7.6, 2.0, 0x9fe1cb], [8.6, 1.6, 0xf4c0d1]] as const).forEach(([x, y, c]) => bx(g, 0.7, 0.5, 0.03, c, x, y, 0.09, false));
  bx(g, 9, 0.04, 3.2, 0xfaeeda, 8, 0.02, 12.1, false);                // 라운지 깔개
  bx(g, 1.2, 0.03, 0.8, 0x5f5e5a, DOOR[0] - 0.1, 0.015, DOOR[1], false); // 문 앞 깔개
  return g;
}

// 캐릭터 — 원기둥 몸·구 머리·반구 머리카락. 발이 원점에 온다
export function buildCharacter(color: number, hair: number, sit: boolean, rot: number): THREE.Group {
  const g = new THREE.Group();
  const body = mesh(g, new THREE.CylinderGeometry(0.26, 0.32, 0.75, 8), color, 0, 0.42, 0);
  if (sit) body.scale.y = 0.82;
  mesh(g, new THREE.SphereGeometry(0.24, 10, 8), 0xf5c4b3, 0, 1.03, 0);
  const h = mesh(g, new THREE.SphereGeometry(0.25, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2.2), hair, 0, 1.06, 0);
  h.rotation.x = -0.25;
  g.rotation.y = rot;
  if (sit) g.position.y = 0.12;
  return g;
}

export { DESKS, SOFAS, PLANTS };
