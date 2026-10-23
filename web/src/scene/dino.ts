// 콤프소그나투스 — 무릎 높이(0.5)의 작은 두발 공룡. 로우폴리, 굽기에서만 쓴다. 발이 원점, 앞은 +z, rot 은 y 회전.
// frame 0·1·2 는 걷는 다리 자세(번갈아), pose 'eat' 은 머리를 바닥으로, 'look' 은 고개를 들고 옆을 본다.
import * as THREE from 'three';

export type DinoPose = 'walk' | 'eat' | 'look';
export const DINO_COLORS = [0x6f8a3a, 0x8a6a3a, 0x5a7a6a];   // 녹갈 · 갈색 · 청록 (등 줄무늬는 진하게)
export const DINO_FRAMES = 3;

const mats = new Map<number, THREE.MeshLambertMaterial>();
function mat(c: number): THREE.MeshLambertMaterial {
  let m = mats.get(c);
  if (!m) { m = new THREE.MeshLambertMaterial({ color: c, flatShading: true }); mats.set(c, m); }
  return m;
}
function part(g: THREE.Object3D, geo: THREE.BufferGeometry, c: number, x: number, y: number, z: number): THREE.Mesh {
  const m = new THREE.Mesh(geo, mat(c));
  m.position.set(x, y, z);
  m.castShadow = true;
  g.add(m);
  return m;
}
const darker = (c: number, k = 0.7) => {
  const col = new THREE.Color(c).multiplyScalar(k);
  return col.getHex();
};

export function buildDino(opts: { rot: number; frame: number; pose: DinoPose; color?: number }): THREE.Group {
  const c = opts.color ?? DINO_COLORS[0];
  const stripe = darker(c, 0.62), belly = new THREE.Color(c).lerp(new THREE.Color(0xf0e6c8), 0.55).getHex();
  const g = new THREE.Group();
  const hip = 0.3;
  // 몸통 — 앞으로 조금 숙인 달걀꼴
  const body = part(g, new THREE.SphereGeometry(0.13, 8, 6), c, 0, hip, 0.02);
  body.scale.set(0.85, 0.8, 1.45);
  body.rotation.x = 0.15;
  const bel = part(g, new THREE.SphereGeometry(0.1, 7, 5), belly, 0, hip - 0.04, 0.05);
  bel.scale.set(0.75, 0.6, 1.3);
  // 등 줄무늬
  for (let i = 0; i < 4; i++) part(g, new THREE.BoxGeometry(0.16, 0.02, 0.03), stripe, 0, hip + 0.1 - i * 0.008, -0.09 + i * 0.07);
  // 목과 머리 — 자세에 따라
  const neck = new THREE.Group();
  neck.position.set(0, hip + 0.06, 0.15);
  g.add(neck);
  const lean = opts.pose === 'eat' ? 1.25 : opts.pose === 'look' ? -0.45 : 0.15;
  neck.rotation.x = lean;
  if (opts.pose === 'look') neck.rotation.y = 0.6;
  const n = part(neck, new THREE.CylinderGeometry(0.035, 0.05, 0.2, 6), c, 0, 0.09, 0.03);
  n.rotation.x = 0.5;
  const head = new THREE.Group();
  head.position.set(0, 0.19, 0.09);
  neck.add(head);
  const skull = part(head, new THREE.BoxGeometry(0.07, 0.065, 0.13), c, 0, 0, 0.04);
  skull.rotation.x = -lean * 0.6;
  part(head, new THREE.ConeGeometry(0.03, 0.08, 5), c, 0, -0.01, 0.13).rotation.x = Math.PI / 2;   // 주둥이
  for (const ex of [-0.037, 0.037]) part(head, new THREE.SphereGeometry(0.012, 5, 4), 0x1f1a17, ex, 0.015, 0.06);
  // 꼬리 — 길고 가늘게, 걸을 때 살짝 흔든다
  const tail = part(g, new THREE.ConeGeometry(0.06, 0.55, 6), c, 0, hip + 0.02, -0.33);
  tail.rotation.x = -Math.PI / 2 + 0.12;
  tail.rotation.z = opts.pose === 'walk' ? [0.12, 0, -0.12][opts.frame % 3] : 0.05;
  part(g, new THREE.BoxGeometry(0.02, 0.02, 0.3), stripe, 0, hip + 0.06, -0.3);
  // 앞발 — 짧게
  for (const sx of [-0.06, 0.06]) {
    const arm = part(g, new THREE.CylinderGeometry(0.012, 0.01, 0.09, 4), c, sx, hip - 0.02, 0.15);
    arm.rotation.x = 0.9;
  }
  // 뒷다리 — 허벅지·정강이·발. frame 마다 앞뒤로
  const swing = opts.pose === 'walk' ? [0.45, 0, -0.45][opts.frame % 3] : 0;
  for (const [sx, sgn] of [[-0.07, 1], [0.07, -1]] as const) {
    const leg = new THREE.Group();
    leg.position.set(sx, hip - 0.03, 0);
    leg.rotation.x = swing * sgn;
    g.add(leg);
    const thigh = part(leg, new THREE.CylinderGeometry(0.04, 0.025, 0.16, 5), c, 0, -0.07, 0.02);
    thigh.rotation.x = -0.35;
    const shin = part(leg, new THREE.CylinderGeometry(0.02, 0.016, 0.16, 5), c, 0, -0.19, -0.01);
    shin.rotation.x = 0.3;
    part(leg, new THREE.BoxGeometry(0.05, 0.015, 0.08), stripe, 0, -0.265, 0.03);
  }
  g.rotation.y = opts.rot;
  return g;
}
