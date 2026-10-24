// 입구 바깥의 엘리베이터와 아래층으로 내려가는 계단 — 이 연구실은 3층 건물의 맨 위층이다(backdrop.ts).
// 새 세션은 여기로 올라오고(엘리베이터 앞에서 나타난다), 닫힌 세션은 여기로 내려간다 (사용자: 「입구 바깥쪽으로 아래로 내려가는 계단이나 엘리베이터」).
// 계단은 바닥보다 낮게 그리지만 굽기에서 바닥과 따로 그려지므로 깊이 다툼은 없다 — 너무 깊으면 앞 바닥을 덮으니 몇 단만 보인다.
import * as THREE from 'three';
import type { Item, ItemKind } from './modules.ts';

export const STAIR_KINDS = ['elevator', 'stairs'] as const;
export type StairKind = typeof STAIR_KINDS[number];

const mats = new Map<string, THREE.Material>();
function mat(c: number, basic = false): THREE.Material {
  const k = `${basic ? 'b' : 'l'}${c}`;
  let m = mats.get(k);
  if (!m) { m = basic ? new THREE.MeshBasicMaterial({ color: c }) : new THREE.MeshLambertMaterial({ color: c, flatShading: true }); mats.set(k, m); }
  return m;
}
function bx(g: THREE.Object3D, w: number, h: number, d: number, c: number, x: number, y: number, z: number, opt: { cast?: boolean; glow?: boolean } = {}): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(c, opt.glow));
  m.position.set(x, y, z);
  m.castShadow = opt.cast ?? true;
  m.receiveShadow = true;
  g.add(m);
  return m;
}

const WALL = 0xd3d1c7, WALL_D = 0xb4b2a9, STEEL = 0x9aa3a8, STEEL_D = 0x6b7378, DARK = 0x2c2c2a;
const STEP = 0xa9adb0, STEP_D = 0x7d8285, PIT = 0x3a3f45, RAIL = 0x5f6b73, AMBER = 0xfac775, GREEN = 0x9fe1cb;

// 엘리베이터 — box 는 바닥 범위(뒤가 -z 벽). 벽 판 하나에 문 둘(가운데 틈), 위에 층 표시, 옆에 부르는 단추
function elevator([x0, z0, x1, z1]: Item['box']): THREE.Group {
  const g = new THREE.Group();
  const w = x1 - x0, d = z1 - z0, cx = (x0 + x1) / 2;
  const H = 2.5;
  bx(g, w, H, d * 0.7, WALL, cx, H / 2, z0 + d * 0.35);                                   // 승강로 벽
  bx(g, w + 0.04, 0.08, d * 0.75, WALL_D, cx, H + 0.04, z0 + d * 0.37);                     // 위 테두리
  const fz = z0 + d * 0.7;
  bx(g, 1.0, 2.0, 0.04, STEEL_D, cx, 1.0, fz + 0.01);                                       // 문틀
  for (const s of [-1, 1]) bx(g, 0.47, 1.94, 0.03, STEEL, cx + s * 0.245, 0.99, fz + 0.035);  // 문 두 짝
  bx(g, 0.01, 1.94, 0.032, DARK, cx, 0.99, fz + 0.04, { cast: false });                      // 가운데 틈
  bx(g, 0.5, 0.16, 0.02, DARK, cx, 2.18, fz + 0.02, { cast: false });                        // 층 표시판
  bx(g, 0.12, 0.08, 0.01, AMBER, cx - 0.1, 2.18, fz + 0.035, { cast: false, glow: true });   // 「3」
  bx(g, 0.06, 0.06, 0.01, GREEN, cx + 0.12, 2.18, fz + 0.035, { cast: false, glow: true });  // ▲▼
  bx(g, 0.1, 0.22, 0.02, STEEL_D, cx + 0.68, 1.1, fz + 0.02, { cast: false });              // 부르는 단추 판
  for (const y of [1.15, 1.05]) bx(g, 0.04, 0.04, 0.01, AMBER, cx + 0.68, y, fz + 0.035, { cast: false, glow: true });
  return g;
}

// 내려가는 계단 — box 는 구멍 범위, +x 쪽으로 내려간다. 들어가는 쪽(-x)만 열고 나머지 세 변에 난간
function stairs([x0, z0, x1, z1]: Item['box']): THREE.Group {
  const g = new THREE.Group();
  const w = x1 - x0, d = z1 - z0, cz = (z0 + z1) / 2;
  const N = 6, run = w / N, rise = 0.09;
  bx(g, w, 0.02, d, PIT, (x0 + x1) / 2, -rise * N - 0.01, cz, { cast: false });   // 구멍 바닥(어둠)
  for (let i = 0; i < N; i++) {
    const top = -rise * (i + 1);
    const h = rise * N - rise * i;
    bx(g, run, h, d - 0.06, i % 2 ? STEP : STEP_D, x0 + run * (i + 0.5), top - h / 2 + rise, cz, { cast: false });
    bx(g, run, 0.012, d - 0.06, 0xd8d0b0, x0 + run * (i + 0.15), top + rise + 0.006, cz, { cast: false });   // 미끄럼 방지 띠
  }
  // 난간 — 기둥과 손잡이. 뒤(z0)·앞(z1)·끝(x1)
  const post = (x: number, z: number) => bx(g, 0.04, 0.95, 0.04, RAIL, x, 0.475, z);
  const bar = (ax: number, az: number, bx_: number, bz: number) => {
    const len = Math.hypot(bx_ - ax, bz - az);
    const m = bx(g, len, 0.05, 0.05, RAIL, (ax + bx_) / 2, 0.95, (az + bz) / 2);
    m.rotation.y = -Math.atan2(bz - az, bx_ - ax);
    const m2 = bx(g, len, 0.02, 0.02, RAIL, (ax + bx_) / 2, 0.5, (az + bz) / 2, { cast: false });
    m2.rotation.y = m.rotation.y;
  };
  for (const z of [z0, z1]) {
    for (let k = 0; k <= 3; k++) post(x0 + (w * k) / 3, z);
    bar(x0, z, x1, z);
  }
  post(x1, cz);
  bar(x1, z0, x1, z1);
  // 「↓ 아래층」 안내판 — 들어가는 쪽 기둥에
  bx(g, 0.04, 0.3, 0.26, 0x378add, x0 - 0.02, 1.18, z0 + 0.15);
  bx(g, 0.045, 0.14, 0.04, 0xfafafa, x0 - 0.02, 1.2, z0 + 0.15, { cast: false });
  return g;
}

export function buildStairItem(it: Item): THREE.Group | null {
  switch (it.kind as ItemKind | StairKind) {
    case 'elevator': return elevator(it.box);
    case 'stairs': return stairs(it.box);
    default: return null;
  }
}
