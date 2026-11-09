// 앵무새 — jschoi 의 흙바닥 방에서 날아다니는 것 (wetherilli 029). 로우폴리, 굽기에서만 쓴다.
// 발이 원점, 앞은 +z, rot 은 y 회전. pose 'perch'(날개 접고 앉음)·'peck'(땅을 쪼음)·'fly'(frame 0 날개 위, 1 아래).
// 갈래 셋: 0 금강앵무(빨강·노랑·파랑) · 1 아마존앵무(초록, 노란 얼굴, 날개에 빨강) · 2 유황앵무(흰 몸, 노란 볏)
import * as THREE from 'three';

export type ParrotPose = 'perch' | 'peck' | 'fly';
export const PARROT_KINDS = 3;
export const PARROT_FRAMES = 2;

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

const LOOKS = [
  { body: 0xd8262e, head: 0xd8262e, face: 0xf4efe6, wing: 0x2a5bd7, band: 0xf2c230, tail: 0xc4202a, tail2: 0x2a5bd7, beak: 0xe8e2d0 },
  { body: 0x3f9b3a, head: 0xe8d43a, face: 0xe8d43a, wing: 0x2f7d2c, band: 0xd8262e, tail: 0x3f9b3a, tail2: 0x9ac83a, beak: 0x3a3a38 },
  { body: 0xf2f0ea, head: 0xf2f0ea, face: 0xf2f0ea, wing: 0xe6e3da, band: 0xf2e6a0, tail: 0xebe8df, tail2: 0xf2e6a0, beak: 0x2e2e2c },
];

export function buildParrot(opts: { rot: number; frame: number; pose: ParrotPose; kind: number }): THREE.Group {
  const L = LOOKS[opts.kind % LOOKS.length];
  const g = new THREE.Group();
  const fly = opts.pose === 'fly', peck = opts.pose === 'peck';
  const bird = new THREE.Group();
  g.add(bird);
  // 앉으면 몸을 세우고(꼬리는 아래로), 날면 눕힌다(꼬리는 뒤로), 쪼면 앞으로 숙인다
  bird.rotation.x = fly ? 1.25 : peck ? 0.75 : 0.25;
  bird.position.y = fly ? 0.12 : 0.1;
  // 몸 — 달걀꼴
  const body = part(bird, new THREE.SphereGeometry(0.075, 8, 6), L.body, 0, 0.11, 0);
  body.scale.set(0.9, 1.35, 0.95);
  // 머리와 부리
  part(bird, new THREE.SphereGeometry(0.058, 8, 6), L.head, 0, 0.22, 0.02);
  for (const s of [-1, 1]) {
    part(bird, new THREE.SphereGeometry(0.026, 6, 4), L.face, s * 0.04, 0.225, 0.035).scale.set(0.5, 1, 1);
    part(bird, new THREE.SphereGeometry(0.011, 5, 4), 0x1f1a17, s * 0.047, 0.232, 0.04);
  }
  const beak = part(bird, new THREE.ConeGeometry(0.026, 0.065, 5), L.beak, 0, 0.205, 0.08);
  beak.rotation.x = Math.PI / 2 + 0.6;
  if (opts.kind === 2) for (let i = 0; i < 4; i++) {   // 유황앵무 볏
    const c = part(bird, new THREE.ConeGeometry(0.014, 0.1, 4), 0xf2d23a, 0, 0.27 + i * 0.008, -0.02 - i * 0.02);
    c.rotation.x = -0.5 - i * 0.25;
  }
  // 꼬리 — 길게
  const tail = part(bird, new THREE.BoxGeometry(0.055, 0.26, 0.018), L.tail, 0, -0.06, -0.035);
  tail.rotation.x = 0.25;
  part(bird, new THREE.BoxGeometry(0.03, 0.2, 0.02), L.tail2, 0, -0.08, -0.05).rotation.x = 0.25;
  // 날개 — 앉으면 몸에 붙이고, 날면 옆으로 펴서 위·아래
  for (const s of [-1, 1]) {
    const wing = new THREE.Group();
    wing.position.set(s * 0.06, 0.15, -0.01);
    bird.add(wing);
    if (fly) {
      wing.rotation.z = s * (opts.frame % 2 === 0 ? -0.75 : 0.55);
      const w1 = part(wing, new THREE.BoxGeometry(0.2, 0.015, 0.11), L.wing, s * 0.1, 0, 0);
      w1.rotation.y = s * 0.15;
      part(wing, new THREE.BoxGeometry(0.1, 0.017, 0.05), L.band, s * 0.06, 0.004, 0.035);
    } else {
      const w = part(wing, new THREE.BoxGeometry(0.02, 0.16, 0.1), L.wing, 0, -0.03, 0);
      w.rotation.x = -0.1;
      part(wing, new THREE.BoxGeometry(0.022, 0.05, 0.08), L.band, s * 0.002, 0.03, 0.005);
    }
  }
  // 발 — 앉거나 쫄 때만 (날 때는 접는다)
  if (!fly) for (const s of [-1, 1]) part(g, new THREE.BoxGeometry(0.02, 0.1, 0.03), 0x7a7470, s * 0.03, 0.05, 0.01);
  g.scale.setScalar(1.5);   // 실물이면 화면에서 점 — 1.25 도 작았다
  g.rotation.y = opts.rot;
  return g;
}
