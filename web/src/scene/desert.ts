// 사막 방의 것 — 기어다니는 전갈과, 가끔 눈을 뜨고 걸어다니는 선인장. 로우폴리, 굽기에서만 쓴다.
// 발이 원점, 앞은 +z, rot 은 y 회전. 전갈 frame 0·1 은 다리를 번갈아, 선인장 pose 'sleep'(눈 감음)·'awake'(눈 뜸)·'walk'(frame 0·1·2).
import * as THREE from 'three';

export const SCORPION_FRAMES = 2;
export const CACTUS_FRAMES = 3;
export type CactusPose = 'sleep' | 'awake' | 'walk';

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

// 전갈 — 몸 길이 0.35 쯤. 마디진 꼬리를 등 위로 말아 올리고 끝에 독침, 앞에 집게 둘, 다리 넷씩
export function buildScorpion(opts: { rot: number; frame: number }): THREE.Group {
  const C = 0x4a3426, C_D = 0x2e2018, STING = 0xb8862f;
  const g = new THREE.Group();
  const y = 0.05;
  const body = part(g, new THREE.SphereGeometry(0.07, 7, 5), C, 0, y, 0);
  body.scale.set(0.95, 0.45, 1.5);
  part(g, new THREE.BoxGeometry(0.09, 0.035, 0.07), C_D, 0, y + 0.01, 0.1);   // 머리
  // 꼬리 — 뒤에서 위로 휘어 앞을 향한다
  let tx = 0, ty = y + 0.01, tz = -0.09, a = 0.15;
  for (let i = 0; i < 5; i++) {
    const len = 0.055;
    a += 0.42;
    const nx = tz - Math.cos(a) * len, ny = ty + Math.sin(a) * len;
    const seg = part(g, new THREE.SphereGeometry(0.024 - i * 0.002, 6, 4), i % 2 ? C : C_D, tx, (ty + ny) / 2, (tz + nx) / 2);
    seg.scale.set(1, 1, 1.6);
    seg.rotation.x = -a;
    ty = ny; tz = nx;
  }
  const sting = part(g, new THREE.ConeGeometry(0.018, 0.06, 5), STING, tx, ty + 0.01, tz + 0.025);
  sting.rotation.x = 2.2;
  // 집게 — 팔과 집게발
  for (const s of [-1, 1]) {
    const arm = part(g, new THREE.CylinderGeometry(0.01, 0.012, 0.1, 4), C, s * 0.06, y, 0.16);
    arm.rotation.set(Math.PI / 2, 0, s * 0.6);
    const claw = part(g, new THREE.SphereGeometry(0.028, 6, 4), C_D, s * 0.09, y + 0.005, 0.22);
    claw.scale.set(0.8, 0.6, 1.4);
    const pin = part(g, new THREE.ConeGeometry(0.01, 0.04, 4), C_D, s * 0.08, y + 0.005, 0.26);
    pin.rotation.x = Math.PI / 2;
  }
  // 다리 — 네 쌍, frame 마다 앞뒤로 번갈아
  for (let i = 0; i < 4; i++) for (const s of [-1, 1]) {
    const swing = (opts.frame % 2 === (i % 2) ? 0.35 : -0.35) * s;
    const leg = part(g, new THREE.CylinderGeometry(0.006, 0.008, 0.11, 4), C_D, s * 0.075, y - 0.015, 0.06 - i * 0.04);
    leg.rotation.set(swing, 0, s * 1.1);
  }
  g.scale.setScalar(1.3);   // 실물 크기면 화면에서 점 — 조금 크게
  g.rotation.y = opts.rot;
  return g;
}

// 걸어다니는 선인장 — 키 0.9 의 기둥 선인장, 팔 둘, 꼭대기에 꽃. 자는 동안은 눈을 감은 줄 둘(화분 대신 모래에 박힌 뿌리 발),
// 깨면 동그란 눈과 입, 걸을 땐 뿌리 발 둘을 번갈아 내딛고 팔을 흔든다
export function buildCactus(opts: { rot: number; frame: number; pose: CactusPose }): THREE.Group {
  const G = 0x4f8a3c, G_D = 0x3b6d2c, SPINE = 0xf2ead2, ROOT = 0x8a6a42;
  const g = new THREE.Group();
  const walk = opts.pose === 'walk';
  const step = walk ? [0.12, 0, -0.12][opts.frame % 3] : 0;
  const bob = walk && opts.frame % 3 === 1 ? 0.03 : 0;
  // 뿌리 발
  for (const s of [-1, 1]) {
    const foot = part(g, new THREE.CylinderGeometry(0.05, 0.06, 0.08, 6), ROOT, s * 0.08, 0.04, s * step);
    foot.scale.set(1, 1, 1.4);
  }
  const body = new THREE.Group();
  body.position.y = 0.08 + bob;
  body.rotation.z = walk ? [0.06, 0, -0.06][opts.frame % 3] : 0;
  g.add(body);
  // 기둥 — 세로 골을 낸 원기둥과 둥근 머리
  part(body, new THREE.CylinderGeometry(0.15, 0.16, 0.62, 8), G, 0, 0.31, 0);
  part(body, new THREE.SphereGeometry(0.15, 8, 5, 0, Math.PI * 2, 0, Math.PI / 2), G, 0, 0.62, 0);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
    part(body, new THREE.BoxGeometry(0.025, 0.6, 0.025), G_D, Math.sin(a) * 0.15, 0.32, Math.cos(a) * 0.15);
  }
  // 가시 — 점점이
  for (let i = 0; i < 14; i++) {
    const a = i * 2.4, h = 0.12 + (i % 7) * 0.075;
    if (Math.cos(a) > 0.55 && h > 0.45 && h < 0.62) continue;   // 얼굴 자리는 비운다
    part(body, new THREE.BoxGeometry(0.012, 0.012, 0.012), SPINE, Math.sin(a) * 0.165, h, Math.cos(a) * 0.165);
  }
  // 팔 — 옆으로 나갔다가 위로 꺾인다. 걸을 땐 흔든다
  for (const s of [-1, 1]) {
    const arm = new THREE.Group();
    arm.position.set(s * 0.14, 0.34, 0);
    arm.rotation.x = walk ? s * step * 2 : 0;
    body.add(arm);
    const out = part(arm, new THREE.CylinderGeometry(0.06, 0.06, 0.14, 7), G, s * 0.07, 0, 0);
    out.rotation.z = Math.PI / 2;
    part(arm, new THREE.CylinderGeometry(0.06, 0.065, 0.2, 7), G, s * 0.14, 0.1, 0);
    part(arm, new THREE.SphereGeometry(0.06, 7, 4, 0, Math.PI * 2, 0, Math.PI / 2), G, s * 0.14, 0.2, 0);
  }
  // 꽃
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    part(body, new THREE.SphereGeometry(0.035, 5, 4), 0xe8608a, Math.sin(a) * 0.04, 0.78, Math.cos(a) * 0.04);
  }
  part(body, new THREE.SphereGeometry(0.03, 5, 4), 0xf6d34a, 0, 0.8, 0);
  // 얼굴 — 앞(+z)
  const fz = 0.155;
  if (opts.pose === 'sleep') {
    for (const s of [-1, 1]) part(body, new THREE.BoxGeometry(0.06, 0.012, 0.02), 0x1f1a17, s * 0.055, 0.54, fz);
  } else {
    for (const s of [-1, 1]) {
      part(body, new THREE.SphereGeometry(0.038, 8, 6), 0xffffff, s * 0.055, 0.54, fz - 0.01);
      part(body, new THREE.SphereGeometry(0.02, 6, 4), 0x1f1a17, s * 0.055, 0.54, fz + 0.02);
    }
    const mouth = part(body, new THREE.TorusGeometry(0.025, 0.008, 4, 8, Math.PI), 0x6a2a2a, 0, 0.47, fz + 0.005);
    mouth.rotation.z = Math.PI;
  }
  g.rotation.y = opts.rot;
  return g;
}
