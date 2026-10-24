// 휴게실 가운데의 공룡 골격 — 받침대 위 티라노사우루스(사람 키 1.6 에 맞춰 줄인 것)와 앞 안내판.
// models.ts 와 같은 꼴(로우폴리, flatShading)이고 굽기에서만 쓴다. 뼈는 두 점을 잇는 원기둥(bone), 척추는 곡선을 따라 마디를 놓는다.
// 지역 좌표: 받침대 가운데가 원점, 긴 쪽이 x(머리가 +x), 발은 받침대 위.
import * as THREE from 'three';
import type { Item, ItemKind } from './modules.ts';

export const SKELETON_KINDS = ['skeleton', 'skelsign'] as const;
export type SkeletonKind = typeof SKELETON_KINDS[number];
export const SKELETON_SIZE: [number, number] = [5.6, 1.8];   // 받침대 바닥 범위
const K = 1.2;   // 골격 크기 — 모형은 길이 4.7 로 짓고 키운다 (사용자: 「커다란 공룡 골격」)

const mats = new Map<number, THREE.MeshLambertMaterial>();
function mat(c: number): THREE.MeshLambertMaterial {
  let m = mats.get(c);
  if (!m) { m = new THREE.MeshLambertMaterial({ color: c, flatShading: true }); mats.set(c, m); }
  return m;
}
function add(g: THREE.Object3D, geo: THREE.BufferGeometry, c: number, x: number, y: number, z: number, cast = true): THREE.Mesh {
  const m = new THREE.Mesh(geo, mat(c));
  m.position.set(x, y, z);
  m.castShadow = cast;
  m.receiveShadow = true;
  g.add(m);
  return m;
}
const bx = (g: THREE.Object3D, w: number, h: number, d: number, c: number, x: number, y: number, z: number, cast = true) =>
  add(g, new THREE.BoxGeometry(w, h, d), c, x, y, z, cast);

type P = [number, number, number];
const UP = new THREE.Vector3(0, 1, 0);
// 두 점을 잇는 뼈 — 가운데가 조금 가는 원기둥
function bone(g: THREE.Object3D, a: P, b: P, r: number, c = BONE, r2 = r): THREE.Mesh {
  const va = new THREE.Vector3(...a), vb = new THREE.Vector3(...b);
  const len = va.distanceTo(vb);
  const m = add(g, new THREE.CylinderGeometry(r2, r, len, 6), c, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2);
  m.quaternion.setFromUnitVectors(UP, vb.sub(va).normalize());
  return m;
}
// 관절 — 뼈 끝의 둥근 마디
const knob = (g: THREE.Object3D, p: P, r: number, c = BONE) => add(g, new THREE.IcosahedronGeometry(r, 0), c, ...p);

const BONE = 0xe8dcc0, BONE_D = 0xcbb894, BONE_DD = 0xa8936c, TOOTH = 0xfaf6ea, EYE = 0x3a3228;
const STONE = 0x5f5e5a, STONE_L = 0x888780, STEEL = 0x2c2c2a, BRASS = 0xc9a46a, PAPER = 0xf4efe6;

// 척추 곡선 — 꼬리 끝(−x, 낮게) → 엉덩이(가장 높은 곳 가까이) → 등 → 목(위로 휜다). 받침대 윗면이 y=0.25
const SPINE: P[] = [
  [-2.35, 0.75, 0], [-1.9, 0.95, 0], [-1.4, 1.25, 0], [-0.9, 1.55, 0], [-0.4, 1.78, 0],
  [0.1, 1.86, 0], [0.6, 1.84, 0], [1.05, 1.78, 0], [1.4, 1.86, 0], [1.62, 2.05, 0],
];
function along(t: number): P {   // t: 0..1 곡선 위 점 (점 사이는 곧게)
  const f = t * (SPINE.length - 1);
  const i = Math.min(SPINE.length - 2, Math.floor(f));
  const k = f - i, a = SPINE[i], b = SPINE[i + 1];
  return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, 0];
}

function skull(g: THREE.Group): void {
  const s = new THREE.Group();
  s.position.set(1.72, 2.05, 0.04);
  s.rotation.set(0, -0.25, -0.12);   // 고개를 조금 숙이고 앞(+z, 보는 사람) 쪽으로 돌린다
  bx(s, 0.34, 0.3, 0.26, BONE, 0.12, 0.02, 0);                        // 뒷머리
  const snout = bx(s, 0.42, 0.2, 0.2, BONE, 0.48, -0.02, 0);          // 주둥이
  snout.scale.set(1, 1, 0.85);
  bx(s, 0.2, 0.12, 0.17, BONE_D, 0.74, -0.05, 0);                     // 코끝
  for (const z of [-0.131, 0.131]) {
    bx(s, 0.1, 0.09, 0.01, EYE, 0.12, 0.07, z, false);                 // 눈구멍
    bx(s, 0.16, 0.07, 0.01, BONE_DD, 0.36, 0.0, z, false);             // 앞 구멍(전안와창)
  }
  // 아래턱 — 조금 벌렸다
  const jaw = new THREE.Group();
  jaw.position.set(0.02, -0.12, 0);
  jaw.rotation.z = -0.22;
  bx(jaw, 0.78, 0.09, 0.2, BONE_D, 0.38, -0.04, 0);
  s.add(jaw);
  // 이빨 — 위턱 아래로, 아래턱 위로
  const tooth = new THREE.ConeGeometry(0.018, 0.07, 4);
  for (let i = 0; i < 7; i++) {
    for (const z of [-0.08, 0.08]) {
      const t = add(s, tooth, TOOTH, 0.3 + i * 0.07, -0.15, z, false);
      t.rotation.x = Math.PI;
      const b = add(jaw, tooth, TOOTH, 0.2 + i * 0.07, 0.03, z, false);
      b.scale.y = 0.8;
    }
  }
  g.add(s);
}

function leg(g: THREE.Group, z: number, step: number): void {
  // 엉덩이 → 무릎(앞으로) → 발목(뒤로) → 발등(앞으로) → 발가락. step 만큼 앞뒤로 벌린다
  const hip: P = [-0.25, 1.62, z];
  const knee: P = [0.12 + step, 1.02, z * 1.15];
  const ankle: P = [-0.18 + step, 0.5, z * 1.2];
  const foot: P = [0.08 + step, 0.3, z * 1.2];
  bone(g, hip, knee, 0.075, BONE, 0.06);
  knob(g, knee, 0.085);
  bone(g, knee, ankle, 0.06, BONE, 0.045);
  knob(g, ankle, 0.06, BONE_D);
  bone(g, ankle, foot, 0.04);
  for (const dz of [-0.07, 0, 0.07]) bone(g, foot, [foot[0] + 0.2, 0.27, foot[2] + dz * 1.4], 0.025, BONE_D, 0.015);
  bone(g, ankle, [ankle[0] - 0.12, 0.33, ankle[2]], 0.02, BONE_D, 0.012);   // 뒷발가락
}

function rex(): THREE.Group {
  const g = new THREE.Group();
  // 척추 — 마디마다 몸통(centrum)과 위로 솟은 가시(neural spine). 꼬리 끝으로 갈수록 작다
  const N = 34;
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const p = along(t);
    const size = t < 0.45 ? 0.035 + t * 0.13 : t < 0.85 ? 0.095 : 0.085 - (t - 0.85) * 0.2;
    knob(g, p, size, i % 2 ? BONE : BONE_D);
    if (t > 0.15 && t < 0.9) {
      const h = t < 0.5 ? 0.06 + t * 0.3 : 0.2 - (t - 0.5) * 0.25;
      bx(g, 0.04, h, 0.03, BONE_D, p[0], p[1] + size + h / 2, 0, false);
    }
    if (t < 0.4) bx(g, 0.03, 0.06 + t * 0.2, 0.025, BONE_D, p[0], p[1] - size - (0.03 + t * 0.1), 0, false);   // 꼬리 아래 갈고리뼈
  }
  bone(g, SPINE[0], along(0.0), 0.02);
  // 갈비뼈 — 등에서 아래·바깥으로 휘어 내려간다 (두 마디로)
  for (let i = 0; i < 9; i++) {
    const x = -0.15 + i * 0.13;
    const top = along((x - SPINE[0][0]) / (SPINE[SPINE.length - 1][0] - SPINE[0][0]));
    const len = 0.62 - Math.abs(i - 3.5) * 0.07;
    for (const s of [-1, 1]) {
      const mid: P = [x + 0.04, top[1] - len * 0.45, s * 0.3];
      const end: P = [x + 0.1, top[1] - len, s * 0.2];
      bone(g, [x, top[1] - 0.03, s * 0.05], mid, 0.018, BONE, 0.016);
      bone(g, mid, end, 0.016, BONE_D, 0.012);
    }
  }
  // 배 쪽 뼈(복늑) — 갈비 끝을 잇는 가는 줄
  for (let i = 0; i < 6; i++) bone(g, [0.05 + i * 0.13, 1.08 + Math.abs(i - 2.5) * 0.03, -0.18], [0.05 + i * 0.13, 1.08 + Math.abs(i - 2.5) * 0.03, 0.18], 0.012, BONE_D);
  // 골반 — 엉덩뼈 판, 앞아래로 뻗은 두덩뼈(끝이 장화처럼), 뒤로 궁둥뼈
  for (const z of [-0.14, 0.14]) {
    const il = bx(g, 0.62, 0.22, 0.04, BONE, -0.3, 1.72, z);
    il.rotation.z = 0.05;
    bone(g, [-0.15, 1.6, z], [0.15, 0.98, z * 0.6], 0.04, BONE_D, 0.03);
    bone(g, [-0.45, 1.6, z], [-0.75, 1.15, z * 0.6], 0.035, BONE_D, 0.02);
  }
  bx(g, 0.22, 0.07, 0.24, BONE_D, 0.18, 0.96, 0);   // 두덩뼈 장화
  leg(g, -0.24, 0.3);
  leg(g, 0.24, -0.15);
  // 작은 앞팔 — 가슴 앞에 두 마디, 손가락 둘
  for (const z of [-0.2, 0.2]) {
    const sh: P = [1.0, 1.5, z], el: P = [1.12, 1.3, z * 1.2], wr: P = [1.24, 1.32, z * 1.2];
    bone(g, sh, el, 0.025);
    bone(g, el, wr, 0.02);
    for (const d of [-0.02, 0.02]) bone(g, wr, [1.31, 1.27, wr[2] + d], 0.01, BONE_D);
  }
  // 어깨뼈
  for (const z of [-0.2, 0.2]) bone(g, [0.85, 1.85, z * 0.8], [1.02, 1.45, z], 0.035, BONE_D, 0.02);
  skull(g);
  return g;
}

// 받침대(돌판) 위에 세운다 — 쇠기둥 셋이 엉덩이·가슴·꼬리를 받친다, 앞에 명판
function skeleton(x: number, z: number, rot: number): THREE.Group {
  const g = new THREE.Group();
  const [w, d] = SKELETON_SIZE;
  bx(g, w, 0.18, d, STONE, 0, 0.09, 0);
  bx(g, w - 0.12, 0.07, d - 0.12, STONE_L, 0, 0.215, 0);
  // 받침대 위 자갈·모래 — 발굴 현장처럼
  for (let i = 0; i < 14; i++) {
    const r = 0.04 + ((i * 37) % 5) * 0.012;
    const m = add(g, new THREE.DodecahedronGeometry(r, 0), [0xa69272, 0x8a7a62, 0xb8a888][i % 3], -2.5 + ((i * 1.37) % 5.0), 0.25 + r * 0.4, -0.65 + ((i * 0.71) % 1.3), false);
    m.rotation.set(i, i * 2, 0);
  }
  const lift = 0.25 - 0.27 * K;   // 발바닥(모형 y≈0.27)을 받침대 윗면에
  for (const [mx, my] of [[-0.3, 1.62], [0.75, 1.75], [-1.45, 1.18]] as [number, number][]) {
    const top = lift + my * K;
    bx(g, 0.035, top - 0.25, 0.035, STEEL, mx * K, 0.25 + (top - 0.25) / 2, 0, false);
    bx(g, 0.2, 0.02, 0.2, STEEL, mx * K, 0.26, 0, false);
  }
  bx(g, 0.7, 0.14, 0.02, BRASS, 1.9, 0.13, d / 2 + 0.01, false);   // 명판
  bx(g, 0.5, 0.025, 0.005, 0x7a5a30, 1.9, 0.15, d / 2 + 0.022, false);
  const r = rex();
  r.scale.setScalar(K);
  r.position.y = lift;
  g.add(r);
  g.position.set(x, 0, z);
  g.rotation.y = rot;
  return g;
}

// 안내판 — 기울어진 독서대 꼴, 글씨 자리(줄 몇 개)와 작은 그림
function skelSign(x: number, z: number, rot: number): THREE.Group {
  const g = new THREE.Group();
  bx(g, 0.05, 0.85, 0.05, STEEL, 0, 0.425, 0);
  bx(g, 0.3, 0.02, 0.3, STEEL, 0, 0.01, 0, false);
  const top = new THREE.Group();
  top.position.set(0, 0.88, 0.02);
  top.rotation.x = -0.6;
  bx(top, 0.56, 0.38, 0.03, 0x3a3a38, 0, 0, 0);
  bx(top, 0.5, 0.32, 0.005, PAPER, 0, 0, 0.018, false);
  bx(top, 0.16, 0.1, 0.004, BONE_DD, -0.15, 0.08, 0.022, false);   // 작은 그림
  for (let i = 0; i < 4; i++) bx(top, i ? 0.4 : 0.22, 0.02, 0.004, i ? 0x8a8780 : 0x993c1d, i ? 0 : 0.1, 0.1 - i * 0.06, 0.022, false);
  g.add(top);
  g.position.set(x, 0, z);
  g.rotation.y = rot;
  return g;
}

export function buildSkeletonItem(it: Item): THREE.Group | null {
  const [x, z] = it.at;
  switch (it.kind as ItemKind | SkeletonKind) {
    case 'skeleton': return skeleton(x, z, it.rot ?? 0);
    case 'skelsign': return skelSign(x, z, it.rot ?? 0);
    default: return null;
  }
}
