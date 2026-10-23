// 사무실 소품 — 로우폴리 모형 모음. models.ts 와 같은 꼴(상자·원기둥·뿔, flatShading)로 굽기에서만 쓴다.
// 모두 바닥 가운데 (x, z), 발은 y=0, 앞은 +z. size 는 바닥 범위 [가로, 세로] — 걸음 막기에 쓴다.
// rot 은 y 축 둘레(라디안). 벽에 거는 것(벽시계·게시판)은 뒷면이 z = -size[1]/2 에 닿는다.
import * as THREE from 'three';

const mats = new Map<string, THREE.Material>();
function mat(c: number): THREE.MeshLambertMaterial {
  const k = `l${c}`;
  let m = mats.get(k) as THREE.MeshLambertMaterial | undefined;
  if (!m) { m = new THREE.MeshLambertMaterial({ color: c, flatShading: true }); mats.set(k, m); }
  return m;
}
// 불빛·화면 — 빛을 받지 않는 색
function glow(c: number): THREE.MeshBasicMaterial {
  const k = `b${c}`;
  let m = mats.get(k) as THREE.MeshBasicMaterial | undefined;
  if (!m) { m = new THREE.MeshBasicMaterial({ color: c }); mats.set(k, m); }
  return m;
}
const GLASS = new THREE.MeshLambertMaterial({ color: 0xcfe8f0, transparent: true, opacity: 0.28, depthWrite: false });

function bx(g: THREE.Object3D, w: number, h: number, d: number, c: number, x: number, y: number, z: number, cast = true): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(c));
  m.position.set(x, y, z);
  m.castShadow = cast;
  m.receiveShadow = true;
  g.add(m);
  return m;
}

function mesh(g: THREE.Object3D, geo: THREE.BufferGeometry, c: number | THREE.Material, x: number, y: number, z: number): THREE.Mesh {
  const m = new THREE.Mesh(geo, typeof c === 'number' ? mat(c) : c);
  m.position.set(x, y, z);
  m.castShadow = typeof c === 'number';
  m.receiveShadow = true;
  g.add(m);
  return m;
}

const cyl = (rt: number, rb: number, h: number, n = 8) => new THREE.CylinderGeometry(rt, rb, h, n);

// 색 — 시제품 팔레트 계열
const WOOD = 0xd4a373, WOOD_D = 0xb07a48, WOOD_DD = 0x8a5a32;
const DARK = 0x2c2c2a, GREY_D = 0x444441, GREY = 0x5f5e5a, GREY_L = 0x888780, PAPER = 0xe8e6df, WHITE = 0xfafafa;
const PURPLE = 0x7f77dd, PURPLE_D = 0x534ab7, LEAF = 0x639922, LEAF_D = 0x3b6d11, POT = 0xd85a30;
const BOOKS = [0xd85a30, 0x378add, 0x1d9e75, 0x7f77dd, 0xef9f27, 0xd4537e, 0x639922, 0x993c1d, 0xfac775, 0x9fe1cb];
const ROCKS = [0x8a7a62, 0x6e6a5e, 0xa69272, 0x5c5446, 0xb8a888];
const RUST = 0x8c5a3c, OLD_GREEN = 0x6f7a62, OLD_GREEN_D = 0x59634f;

type Prop = { label: string; size: [number, number]; build: (x: number, z: number, rot?: number) => THREE.Group };

// 지역 좌표로 그리고 마지막에 자리·방향을 준다
function prop(label: string, size: [number, number], draw: (g: THREE.Group) => void): Prop {
  return {
    label, size,
    build(x, z, rot = 0) {
      const g = new THREE.Group();
      draw(g);
      g.position.set(x, 0, z);
      g.rotation.y = rot;
      return g;
    },
  };
}

function pot(g: THREE.Group, r: number, h: number, c = POT, x = 0, z = 0): void {
  mesh(g, cyl(r, r * 0.78, h), c, x, h / 2, z);
  mesh(g, cyl(r * 0.92, r * 0.92, 0.02), 0x5c4433, x, h, z);   // 흙
}

// 삼엽충 — 머리(반원)·몸통 마디·꼬리, 세 갈래(가운데 축이 볼록)
function trilobite(g: THREE.Group, x: number, y: number, z: number, s: number, c = 0x5c5446): void {
  const t = new THREE.Group();
  const head = mesh(t, new THREE.CylinderGeometry(0.11, 0.11, 0.025, 10, 1, false, Math.PI / 2, Math.PI), c, 0, 0, -0.1);
  head.rotation.y = 0;
  for (let i = 0; i < 6; i++) {
    const w = 0.2 - i * 0.012;
    bx(t, w, 0.025, 0.026, c, 0, 0, -0.085 + i * 0.032, false);
    bx(t, 0.06, 0.04, 0.026, 0x6e6a5e, 0, 0.01, -0.085 + i * 0.032, false);   // 가운데 축
  }
  mesh(t, new THREE.ConeGeometry(0.07, 0.1, 6), c, 0, 0, 0.14).rotation.x = Math.PI / 2;
  bx(t, 0.06, 0.05, 0.08, 0x6e6a5e, 0, 0.015, -0.12, false);                    // 미간
  t.scale.setScalar(s);
  t.position.set(x, y + 0.08 * s, z);
  t.rotation.x = 1.0;                                                             // 받침에 기대 앞을 보게
  g.add(t);
}

// 암모나이트 — 감긴 껍데기(작아지는 고리 셋)를 세워서
function ammonite(g: THREE.Group, x: number, y: number, z: number, s: number, c = 0xa69272): void {
  const a = new THREE.Group();
  mesh(a, cyl(0.15, 0.15, 0.05, 12), 0x8a7a62, 0, 0, 0).rotation.x = Math.PI / 2;
  [[0.12, 0.04, 0, 0], [0.07, 0.03, 0.03, 0.01], [0.035, 0.018, 0.045, 0.02]].forEach(([r, t, ox, oy]) => {
    mesh(a, new THREE.TorusGeometry(r, t, 5, 12), c, ox, oy, 0.02);
  });
  a.scale.setScalar(s);
  a.position.set(x, y, z);
  g.add(a);
}

function rock(g: THREE.Group, r: number, c: number, x: number, y: number, z: number, seed: number): void {
  const m = mesh(g, new THREE.DodecahedronGeometry(r, 0), c, x, y + r * 0.7, z);
  m.rotation.set(seed * 0.7, seed * 1.3, seed * 0.4);
  m.scale.set(1 + (seed % 3) * 0.15, 0.75, 1 - (seed % 2) * 0.15);
}

export const PROPS: Record<string, Prop> = {
  water_cooler: prop('정수기', [0.45, 0.45], (g) => {
    bx(g, 0.4, 1.0, 0.4, WHITE, 0, 0.5, 0);
    bx(g, 0.3, 0.12, 0.06, GREY, 0, 0.72, 0.21);                                  // 꼭지 자리
    bx(g, 0.05, 0.06, 0.05, 0xd85a30, -0.07, 0.68, 0.24);                         // 뜨거운 물
    bx(g, 0.05, 0.06, 0.05, 0x378add, 0.07, 0.68, 0.24);                          // 찬물
    bx(g, 0.3, 0.03, 0.1, GREY_L, 0, 0.5, 0.22);                                  // 받침
    mesh(g, cyl(0.17, 0.17, 0.45, 10), new THREE.MeshLambertMaterial({ color: 0x85b7eb, transparent: true, opacity: 0.75 }), 0, 1.25, 0);
    mesh(g, cyl(0.06, 0.17, 0.1, 10), 0x85b7eb, 0, 1.03, 0);
    mesh(g, cyl(0.05, 0.05, 0.04, 8), 0x378add, 0, 1.49, 0);
  }),

  copier: prop('복사기', [1.0, 0.7], (g) => {
    bx(g, 0.95, 0.75, 0.65, PAPER, 0, 0.375, 0);
    bx(g, 0.9, 0.06, 0.62, GREY_L, 0, 0.78, 0);                                   // 원고대
    bx(g, 0.9, 0.08, 0.6, 0xd3d1c7, 0, 0.85, -0.01);                              // 덮개
    bx(g, 0.3, 0.06, 0.2, GREY_D, 0.28, 0.83, 0.3);                               // 조작판
    mesh(g, new THREE.PlaneGeometry(0.12, 0.07), glow(0x9fe1cb), 0.3, 0.865, 0.3).rotation.x = -Math.PI / 2;
    for (let i = 0; i < 3; i++) {                                                 // 서랍 셋
      bx(g, 0.86, 0.14, 0.02, 0xd3d1c7, 0, 0.13 + i * 0.17, 0.33);
      bx(g, 0.2, 0.03, 0.02, GREY, 0, 0.17 + i * 0.17, 0.345);
    }
    bx(g, 0.25, 0.04, 0.35, GREY_L, 0.6, 0.6, 0);                                 // 배출 받침
    bx(g, 0.22, 0.03, 0.3, WHITE, 0.6, 0.635, 0, false);
  }),

  bookshelf: prop('책장', [1.2, 0.4], (g) => {
    const W = 1.2, H = 2.0, Dp = 0.38;
    bx(g, 0.05, H, Dp, WOOD_D, -W / 2 + 0.025, H / 2, 0);
    bx(g, 0.05, H, Dp, WOOD_D, W / 2 - 0.025, H / 2, 0);
    bx(g, W, H, 0.03, WOOD_DD, 0, H / 2, -Dp / 2 + 0.015);
    for (let s = 0; s < 5; s++) bx(g, W - 0.1, 0.04, Dp, WOOD, 0, 0.04 + s * 0.48, 0);
    bx(g, W, 0.04, Dp, WOOD, 0, H, 0);
    let k = 0;
    for (let s = 0; s < 4; s++) {
      let x = -W / 2 + 0.07;
      while (x < W / 2 - 0.15) {
        const w = 0.05 + ((k * 7) % 4) * 0.012, h = 0.28 + ((k * 5) % 5) * 0.025;
        if ((k * 3) % 11 === 5) { x += 0.12; k++; continue; }                     // 빈틈
        const b = bx(g, w, h, 0.26, BOOKS[(k * 3 + s) % BOOKS.length], x + w / 2, 0.06 + s * 0.48 + h / 2, 0.03, false);
        if (k % 13 === 7) { b.rotation.z = -0.25; b.position.x += 0.04; x += 0.06; }
        x += w + 0.005;
        k++;
      }
    }
  }),

  file_cabinet: prop('서류함', [0.5, 0.6], (g) => {
    bx(g, 0.48, 1.3, 0.58, 0xb4b2a9, 0, 0.65, 0);
    for (let i = 0; i < 4; i++) {
      bx(g, 0.42, 0.28, 0.02, 0xc8c6be, 0, 0.18 + i * 0.31, 0.3);
      bx(g, 0.14, 0.03, 0.03, GREY_D, 0, 0.26 + i * 0.31, 0.315);
      bx(g, 0.1, 0.05, 0.01, WHITE, 0, 0.21 + i * 0.31, 0.315, false);            // 이름표
    }
  }),

  trash_bin: prop('휴지통', [0.35, 0.35], (g) => {
    mesh(g, cyl(0.17, 0.13, 0.4, 8), GREY, 0, 0.2, 0);
    mesh(g, new THREE.TorusGeometry(0.17, 0.015, 4, 8), GREY_D, 0, 0.4, 0).rotation.x = Math.PI / 2;
    mesh(g, new THREE.IcosahedronGeometry(0.07, 0), WHITE, 0.03, 0.4, 0.02);     // 구긴 종이
    mesh(g, new THREE.IcosahedronGeometry(0.06, 0), 0xf1efe8, -0.05, 0.42, -0.03);
  }),

  coat_rack: prop('옷걸이', [0.5, 0.5], (g) => {
    mesh(g, cyl(0.22, 0.24, 0.05, 8), WOOD_DD, 0, 0.025, 0);
    mesh(g, cyl(0.03, 0.035, 1.75, 6), WOOD_D, 0, 0.9, 0);
    mesh(g, new THREE.SphereGeometry(0.05, 6, 4), WOOD_DD, 0, 1.8, 0);
    for (let i = 0; i < 4; i++) {
      const a = (i * Math.PI) / 2 + Math.PI / 4;
      const h = mesh(g, cyl(0.015, 0.015, 0.18, 4), WOOD_DD, Math.cos(a) * 0.08, 1.68, Math.sin(a) * 0.08);
      h.rotation.set(Math.sin(a) * 0.9, 0, -Math.cos(a) * 0.9);
    }
    bx(g, 0.34, 0.65, 0.12, 0x993c1d, 0.07, 1.3, 0.1).rotation.y = 0.4;           // 걸린 외투
    bx(g, 0.36, 0.08, 0.13, 0x7a3016, 0.07, 1.6, 0.1).rotation.y = 0.4;
    bx(g, 0.24, 0.16, 0.24, 0x378add, -0.1, 1.8, -0.05).rotation.y = 0.3;         // 모자
  }),

  wall_clock: prop('벽시계', [0.5, 0.1], (g) => {
    const y = 2.3, z = -0.03;
    const face = mesh(g, cyl(0.24, 0.24, 0.06, 16), DARK, 0, y, z);
    face.rotation.x = Math.PI / 2;
    const f = mesh(g, new THREE.CircleGeometry(0.21, 16), glow(WHITE), 0, y, z + 0.031);
    f.castShadow = false;
    for (let i = 0; i < 12; i++) {
      const a = (i * Math.PI) / 6;
      bx(g, i % 3 ? 0.015 : 0.03, 0.04, 0.005, DARK, Math.sin(a) * 0.17, y + Math.cos(a) * 0.17, z + 0.035, false).rotation.z = -a;
    }
    const hh = bx(g, 0.025, 0.11, 0.008, DARK, 0, 0, 0, false);                   // 시침 10시
    hh.geometry.translate(0, 0.055, 0); hh.position.set(0, y, z + 0.04); hh.rotation.z = Math.PI / 3;
    const mh = bx(g, 0.015, 0.16, 0.008, DARK, 0, 0, 0, false);                   // 분침 2시
    mh.geometry.translate(0, 0.08, 0); mh.position.set(0, y, z + 0.045); mh.rotation.z = -Math.PI / 3 * 1;
    bx(g, 0.03, 0.03, 0.01, 0xd85a30, 0, y, z + 0.05, false);
  }),

  floor_lamp: prop('스탠드 조명', [0.4, 0.4], (g) => {
    mesh(g, cyl(0.17, 0.19, 0.04, 8), DARK, 0, 0.02, 0);
    mesh(g, cyl(0.02, 0.02, 1.5, 6), GREY_D, 0, 0.77, 0);
    mesh(g, cyl(0.13, 0.22, 0.3, 8), 0xfaeeda, 0, 1.6, 0);
    mesh(g, cyl(0.1, 0.1, 0.02, 8), glow(0xfff3c4), 0, 1.46, 0);
  }),

  whiteboard_easel: prop('화이트보드(이젤)', [1.4, 0.6], (g) => {
    for (const s of [-1, 1]) {
      const l = mesh(g, cyl(0.025, 0.025, 1.9, 4), GREY_L, s * 0.6, 0.93, 0.05);
      l.rotation.x = 0.12;
      const b = mesh(g, cyl(0.02, 0.02, 1.7, 4), GREY_L, s * 0.6, 0.82, -0.18);
      b.rotation.x = -0.3;
    }
    const board = new THREE.Group();
    bx(board, 1.3, 0.9, 0.04, GREY_L, 0, 0, 0);
    bx(board, 1.22, 0.82, 0.01, WHITE, 0, 0, 0.025, false);
    // 낙서 — 칸반 흉내
    bx(board, 0.008, 0.7, 0.005, GREY_L, -0.2, 0, 0.032, false);
    bx(board, 0.008, 0.7, 0.005, GREY_L, 0.2, 0, 0.032, false);
    [[-0.42, 0.2, 0xfac775], [-0.42, -0.05, 0x9fe1cb], [0, 0.22, 0xf4c0d1], [0.4, 0.15, 0x9fe1cb], [0.4, -0.15, 0xfac775]]
      .forEach(([x, y, c]) => bx(board, 0.22, 0.16, 0.005, c, x, y, 0.034, false));
    bx(board, 0.5, 0.015, 0.005, 0x378add, -0.0, -0.25, 0.034, false);
    bx(board, 1.2, 0.04, 0.08, GREY_L, 0, -0.47, 0.04);                          // 펜 받침
    bx(board, 0.12, 0.025, 0.025, 0xd85a30, -0.3, -0.44, 0.06, false);
    bx(board, 0.12, 0.025, 0.025, 0x378add, -0.12, -0.44, 0.06, false);
    board.position.set(0, 1.35, 0.1);
    board.rotation.x = -0.12;
    g.add(board);
  }),

  server_rack: prop('서버 랙', [0.7, 0.8], (g) => {
    bx(g, 0.66, 2.0, 0.78, DARK, 0, 1.0, 0);
    bx(g, 0.58, 1.86, 0.02, 0x1a1a19, 0, 1.0, 0.39);
    const leds = [0x5dcaa5, 0x5dcaa5, 0xef9f27, 0x5dcaa5, 0x378add, 0xd85a30];
    for (let i = 0; i < 9; i++) {
      const y = 0.25 + i * 0.19;
      bx(g, 0.54, 0.15, 0.03, i === 4 ? 0x444441 : 0x3a3a38, 0, y, 0.4);
      for (let j = 0; j < 8; j++) bx(g, 0.035, 0.008, 0.005, 0x1a1a19, -0.05 + j * 0.04, y + 0.03, 0.418, false);  // 숨구멍
      for (let j = 0; j < 3; j++) {
        const m = mesh(g, new THREE.BoxGeometry(0.025, 0.025, 0.01), glow(leds[(i * 2 + j) % leds.length]), -0.22 + j * 0.04, y - 0.03, 0.42);
        m.castShadow = false;
      }
    }
    mesh(g, new THREE.PlaneGeometry(0.4, 0.06), glow(0x5dcaa5), 0, 0.25 + 4 * 0.19, 0.417);   // 화면 한 줄
    for (const s of [-1, 1]) bx(g, 0.04, 0.05, 0.04, GREY_D, s * 0.27, 0.025, 0.3);
  }),

  globe: prop('지구본', [0.5, 0.5], (g) => {
    mesh(g, cyl(0.18, 0.2, 0.05, 8), WOOD_DD, 0, 0.025, 0);
    mesh(g, cyl(0.03, 0.05, 0.6, 6), WOOD_D, 0, 0.35, 0);
    const tilt = new THREE.Group();
    tilt.position.set(0, 0.92, 0);
    tilt.rotation.z = 0.41;
    mesh(tilt, new THREE.IcosahedronGeometry(0.25, 1), 0x378add, 0, 0, 0);
    // 땅 — 구 위에 붙인 납작한 조각들
    ([[0.5, 0.6, 0.12], [1.9, 0.2, 0.1], [2.6, -0.3, 0.13], [-0.8, 0.9, 0.09], [3.6, 0.5, 0.1], [-1.9, -0.5, 0.08]] as const)
      .forEach(([lon, lat, r]) => {
        const p = new THREE.Vector3().setFromSphericalCoords(0.245, Math.PI / 2 - lat, lon);
        const m = mesh(tilt, new THREE.DodecahedronGeometry(r, 0), 0x639922, p.x, p.y, p.z);
        m.scale.set(1, 1, 1);
        m.lookAt(0, 0, 0);
        m.scale.z = 0.25;
      });
    const ring = mesh(tilt, new THREE.TorusGeometry(0.29, 0.015, 4, 16, Math.PI), 0xc9a24a, 0, 0, 0);
    ring.rotation.z = Math.PI / 2;
    ring.rotation.y = Math.PI / 2;
    g.add(tilt);
  }),

  cork_board: prop('코르크 게시판', [1.2, 0.1], (g) => {
    const y = 1.6, z = -0.02;
    bx(g, 1.2, 0.8, 0.04, WOOD_DD, 0, y, z);
    bx(g, 1.12, 0.72, 0.02, 0xc49a6c, 0, y, z + 0.02, false);
    ([[-0.38, 0.15, 0xffffff, 0.02], [-0.1, 0.18, 0xfac775, -0.1], [0.22, 0.12, 0x9fe1cb, 0.08], [0.42, -0.12, 0xffffff, -0.05],
      [-0.3, -0.16, 0xf4c0d1, 0.1], [0.05, -0.14, 0xffffff, 0]] as const).forEach(([x, dy, c, r], i) => {
      const p = bx(g, i % 3 === 0 ? 0.22 : 0.18, i % 3 === 0 ? 0.28 : 0.18, 0.005, c, x, y + dy, z + 0.033, false);
      p.rotation.z = r;
      bx(g, 0.025, 0.025, 0.02, BOOKS[i], x, y + dy + (i % 3 === 0 ? 0.12 : 0.07), z + 0.04, false);   // 압정
    });
  }),

  mini_fridge: prop('소형 냉장고', [0.55, 0.55], (g) => {
    bx(g, 0.52, 0.85, 0.52, WHITE, 0, 0.45, 0);
    bx(g, 0.5, 0.05, 0.5, GREY, 0, 0.025, 0);
    bx(g, 0.5, 0.005, 0.02, 0xd3d1c7, 0, 0.62, 0.265, false);                    // 냉동칸 금
    bx(g, 0.03, 0.15, 0.04, GREY_L, 0.2, 0.72, 0.28);
    bx(g, 0.03, 0.2, 0.04, GREY_L, 0.2, 0.42, 0.28);
    bx(g, 0.1, 0.1, 0.005, 0xfac775, -0.12, 0.45, 0.262, false);                  // 자석 메모
    bx(g, 0.07, 0.07, 0.005, 0xf4c0d1, -0.05, 0.3, 0.262, false);
    mesh(g, cyl(0.04, 0.04, 0.12, 8), 0xd85a30, -0.12, 0.96, 0);                   // 위에 머그
  }),

  microwave_table: prop('전자레인지 탁자', [0.9, 0.5], (g) => {
    bx(g, 0.9, 0.05, 0.5, WOOD, 0, 0.8, 0);
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) bx(g, 0.05, 0.78, 0.05, WOOD_D, sx * 0.4, 0.39, sz * 0.2);
    bx(g, 0.84, 0.03, 0.44, WOOD_D, 0, 0.25, 0);                                 // 아래 선반
    bx(g, 0.3, 0.2, 0.25, 0xd4537e, -0.18, 0.365, 0);                            // 상자
    bx(g, 0.62, 0.36, 0.42, GREY_L, -0.08, 1.005, -0.02);
    bx(g, 0.4, 0.28, 0.01, DARK, -0.17, 1.0, 0.195, false);                       // 문 유리
    bx(g, 0.14, 0.3, 0.01, GREY, 0.15, 1.0, 0.195, false);
    mesh(g, new THREE.PlaneGeometry(0.08, 0.035), glow(0x9fe1cb), 0.15, 1.1, 0.202);
    bx(g, 0.04, 0.04, 0.01, DARK, 0.13, 0.98, 0.202, false);
    bx(g, 0.04, 0.04, 0.01, DARK, 0.18, 0.98, 0.202, false);
    mesh(g, cyl(0.04, 0.035, 0.1, 8), WHITE, 0.33, 0.875, 0.1);                   // 컵
  }),

  umbrella_stand: prop('우산꽂이', [0.35, 0.35], (g) => {
    mesh(g, cyl(0.15, 0.14, 0.5, 8), 0x2f4a3f, 0, 0.25, 0);
    mesh(g, new THREE.TorusGeometry(0.15, 0.015, 4, 8), 0x1f342b, 0, 0.5, 0).rotation.x = Math.PI / 2;
    ([[0x378add, 0.05, 0.03, 0.12], [0xd85a30, -0.05, -0.02, -0.15], [DARK, 0.0, -0.06, 0.05]] as const).forEach(([c, x, z, tilt]) => {
      const u = new THREE.Group();
      mesh(u, new THREE.ConeGeometry(0.06, 0.6, 6), c, 0, 0.4, 0);
      mesh(u, cyl(0.008, 0.008, 0.25, 4), GREY_D, 0, 0.8, 0);
      const hdl = mesh(u, new THREE.TorusGeometry(0.035, 0.01, 4, 8, Math.PI), WOOD_DD, 0.035, 0.92, 0);
      hdl.rotation.z = 0;
      u.position.set(x, 0, z);
      u.rotation.z = tilt;
      g.add(u);
    });
  }),

  plant_tall: prop('화분(키 큰)', [0.6, 0.6], (g) => {
    pot(g, 0.24, 0.45, 0xb4b2a9);
    mesh(g, cyl(0.03, 0.04, 1.1, 5), 0x6e5236, 0, 1.0, 0);
    // 잎 — 줄기 둘레로 비스듬한 납작 상자
    for (let i = 0; i < 9; i++) {
      const a = i * 2.4, y = 0.9 + i * 0.12;
      const l = bx(g, 0.4, 0.03, 0.16, i % 2 ? LEAF : LEAF_D, Math.cos(a) * 0.17, y, Math.sin(a) * 0.17);
      l.rotation.set(0, -a, -0.45);
    }
    mesh(g, new THREE.ConeGeometry(0.18, 0.35, 5), LEAF, 0, 2.0, 0);
  }),

  plant_succulent: prop('다육이', [0.3, 0.3], (g) => {
    pot(g, 0.12, 0.16, POT);
    for (let i = 0; i < 7; i++) {
      const a = i * 0.9, r = i === 0 ? 0 : 0.05;
      const c = mesh(g, new THREE.ConeGeometry(0.035, 0.12 + (i % 3) * 0.03, 5), i % 2 ? 0x7fb08a : 0x5f9670, Math.cos(a) * r, 0.22, Math.sin(a) * r);
      c.rotation.set(Math.sin(a) * (i ? 0.5 : 0), 0, -Math.cos(a) * (i ? 0.5 : 0));
    }
    mesh(g, new THREE.SphereGeometry(0.025, 5, 4), 0xf4c0d1, 0, 0.3, 0);         // 꽃
  }),

  plant_bush: prop('화분(둥근)', [0.6, 0.6], (g) => {
    pot(g, 0.22, 0.35, 0x993c1d);
    bx(g, 0.5, 0.02, 0.02, 0xfaeeda, 0, 0.27, 0.205, false);                     // 화분 띠
    mesh(g, new THREE.IcosahedronGeometry(0.3, 0), LEAF, 0, 0.62, 0);
    mesh(g, new THREE.IcosahedronGeometry(0.2, 0), LEAF_D, 0.15, 0.78, 0.08);
    mesh(g, new THREE.IcosahedronGeometry(0.18, 0), 0x7aab3a, -0.14, 0.75, -0.06);
  }),

  // ── 연구실 ──
  fossil_cabinet: prop('화석 진열장', [1.2, 0.55], (g) => {
    const W = 1.15, H = 1.9, Dp = 0.5;
    bx(g, W, 0.35, Dp, WOOD_DD, 0, 0.175, 0);                                    // 아래 받침장
    bx(g, W - 0.1, 0.02, 0.01, WOOD, 0, 0.22, Dp / 2, false);
    bx(g, 0.2, 0.03, 0.02, 0xc9a24a, 0, 0.27, Dp / 2 + 0.005, false);            // 이름판
    bx(g, W, 0.05, Dp, WOOD_DD, 0, H, 0);                                         // 지붕
    bx(g, W, H - 0.35, 0.03, 0xe9dcc0, 0, (H + 0.35) / 2, -Dp / 2 + 0.015);      // 뒤판 — 밝은 천, 화석이 도드라지게
    for (const s of [-1, 1]) for (const t of [-1, 1]) bx(g, 0.04, H - 0.35, 0.04, WOOD_DD, s * (W / 2 - 0.02), (H + 0.35) / 2, t * (Dp / 2 - 0.02));
    for (let i = 0; i < 3; i++) bx(g, W - 0.08, 0.02, Dp - 0.06, 0xd3d1c7, 0, 0.36 + i * 0.5, 0);   // 선반
    // 칸마다 화석 — 받침 위 삼엽충·암모나이트
    trilobite(g, -0.27, 0.39, 0.06, 0.95, 0x6e6a5e);
    ammonite(g, 0.25, 0.55, 0.0, 1.1);
    ammonite(g, -0.27, 0.99, -0.05, 0.75, 0xb8a888);
    trilobite(g, 0.25, 0.89, 0.06, 0.85, 0x5c5446);
    bx(g, 0.18, 0.12, 0.12, 0x8a7a62, -0.03, 0.93, 0.05);                         // 덩어리 표본
    ammonite(g, 0.0, 1.55, -0.05, 1.3, 0x8a7a62);
    trilobite(g, 0.36, 1.39, 0.08, 0.7, 0x6e6a5e);
    trilobite(g, -0.36, 1.39, 0.08, 0.7, 0x5c5446);
    for (let i = 0; i < 4; i++) bx(g, 0.1, 0.03, 0.005, WHITE, -0.35 + i * 0.23, 0.39 + (i % 3) * 0.5, 0.2, false);  // 표찰
    // 유리 — 앞·옆
    mesh(g, new THREE.BoxGeometry(W - 0.06, H - 0.4, 0.01), GLASS, 0, (H + 0.35) / 2, Dp / 2 - 0.02);
    for (const s of [-1, 1]) mesh(g, new THREE.BoxGeometry(0.01, H - 0.4, Dp - 0.06), GLASS, s * (W / 2 - 0.02), (H + 0.35) / 2, 0);
  }),

  core_box: prop('시추 코어 상자', [1.0, 0.6], (g) => {
    bx(g, 1.0, 0.05, 0.6, WOOD, 0, 0.025, 0);
    for (const s of [-1, 1]) {
      bx(g, 1.0, 0.16, 0.03, WOOD_D, 0, 0.1, s * 0.285);
      bx(g, 0.03, 0.16, 0.6, WOOD_D, s * 0.485, 0.1, 0);
    }
    for (let i = 1; i < 4; i++) bx(g, 0.94, 0.12, 0.015, WOOD_D, 0, 0.09, -0.285 + i * 0.1425);   // 칸막이
    // 코어 — 칸마다 원기둥 몇 토막, 층마다 색이 다르다
    const tones = [0x8a7a62, 0x6e6a5e, 0xa69272, 0x5c5446, 0xb8a888, 0x7d8a8c];
    for (let row = 0; row < 4; row++) {
      let x = -0.45;
      for (let k = 0; k < 4 && x < 0.42; k++) {
        const len = 0.14 + ((row * 3 + k * 5) % 4) * 0.05;
        const c = mesh(g, cyl(0.055, 0.055, Math.min(len, 0.44 - x), 8), tones[(row * 2 + k) % tones.length], x + Math.min(len, 0.44 - x) / 2, 0.11, -0.214 + row * 0.1425);
        c.rotation.z = Math.PI / 2;
        x += len + 0.01;
      }
      bx(g, 0.05, 0.02, 0.01, 0xd85a30, 0.45, 0.19, -0.214 + row * 0.1425, false);   // 깊이 표시
    }
    const lid = bx(g, 1.0, 0.03, 0.6, WOOD, 0, 0.35, -0.42);                     // 열어 젖힌 뚜껑
    lid.rotation.x = -1.25;
    bx(g, 0.3, 0.1, 0.005, WHITE, 0, 0.4, -0.36, false).rotation.x = -1.25;      // 뚜껑 이름표
  }),

  rock_shelf: prop('암석 표본 선반', [1.2, 0.45], (g) => {
    const W = 1.2, H = 1.5, Dp = 0.42;
    for (const s of [-1, 1]) bx(g, 0.04, H, Dp, GREY, s * (W / 2 - 0.02), H / 2, 0);
    bx(g, W, H, 0.02, GREY_D, 0, H / 2, -Dp / 2 + 0.01);
    for (let i = 0; i < 4; i++) bx(g, W - 0.08, 0.03, Dp, GREY_L, 0, 0.05 + i * 0.47, 0);
    let seed = 1;
    for (let s = 0; s < 3; s++) for (let k = 0; k < 4; k++) {
      const x = -0.42 + k * 0.28, y = 0.065 + s * 0.47;
      bx(g, 0.18, 0.015, 0.14, WHITE, x, y + 0.008, 0.03, false);                 // 받침 종이
      rock(g, 0.06 + (seed % 3) * 0.015, ROCKS[seed % ROCKS.length], x, y + 0.01, 0.03, seed);
      bx(g, 0.08, 0.04, 0.005, 0xfac775, x, y - 0.02, Dp / 2 + 0.003, false);   // 선반 이름표
      seed = (seed * 7 + 3) % 17;
    }
  }),

  microscope_table: prop('현미경 탁자', [0.8, 0.6], (g) => {
    bx(g, 0.8, 0.05, 0.6, PAPER, 0, 0.78, 0);
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) bx(g, 0.05, 0.76, 0.05, GREY_L, sx * 0.35, 0.38, sz * 0.25);
    const m = new THREE.Group();
    bx(m, 0.24, 0.04, 0.3, DARK, 0, 0.02, 0);                                    // 발
    bx(m, 0.06, 0.36, 0.08, DARK, 0, 0.2, -0.1);                                 // 기둥(팔)
    bx(m, 0.16, 0.02, 0.14, GREY_D, 0, 0.14, 0.04);                              // 재물대
    bx(m, 0.1, 0.005, 0.04, 0xcfe8f0, 0, 0.152, 0.04, false);                    // 슬라이드
    const tube = mesh(m, cyl(0.035, 0.04, 0.2, 8), GREY_D, 0, 0.36, -0.02);
    tube.rotation.x = 0.35;
    mesh(m, cyl(0.025, 0.025, 0.08, 8), DARK, 0, 0.48, -0.06).rotation.x = 0.35;   // 접안
    mesh(m, cyl(0.02, 0.015, 0.06, 6), 0xb4b2a9, 0, 0.24, 0.03);                  // 대물
    mesh(m, cyl(0.04, 0.04, 0.03, 8), GREY, 0.05, 0.12, -0.1).rotation.z = Math.PI / 2;   // 초점 손잡이
    mesh(m, new THREE.CircleGeometry(0.025, 8), glow(0xfff3c4), 0, 0.045, 0.04).rotation.x = -Math.PI / 2;
    m.position.set(0, 0.805, -0.05);
    g.add(m);
    bx(g, 0.18, 0.04, 0.1, WOOD_D, -0.26, 0.82, 0.12);                            // 슬라이드 상자
    bx(g, 0.2, 0.01, 0.14, WHITE, 0.26, 0.81, 0.12, false);                       // 기록지
    bx(g, 0.12, 0.01, 0.015, 0x378add, 0.27, 0.82, 0.14, false).rotation.y = 0.5;
  }),

  // ── 낡은 것 (칙칙한 방) ──
  old_cabinet: prop('찌그러진 철제 캐비닛', [0.85, 0.5], (g) => {
    const c = new THREE.Group();
    bx(c, 0.8, 1.7, 0.45, OLD_GREEN, 0, 0.85, 0);
    bx(c, 0.38, 1.6, 0.02, OLD_GREEN_D, -0.2, 0.85, 0.235);                      // 왼문
    const door = bx(c, 0.38, 1.6, 0.02, OLD_GREEN_D, 0, 0.85, 0);                // 오른문 — 살짝 열림
    door.geometry.translate(-0.19, 0, 0);
    door.position.set(0.39, 0.85, 0.235);
    door.rotation.y = 0.35;
    bx(c, 0.03, 0.12, 0.03, GREY_D, -0.03, 0.95, 0.25);
    bx(c, 0.2, 0.25, 0.04, 0x5a6352, -0.2, 1.15, 0.23).rotation.z = 0.25;         // 찌그러진 자국
    bx(c, 0.1, 0.06, 0.01, RUST, 0.25, 0.08, 0.229, false);                        // 녹
    bx(c, 0.16, 0.05, 0.01, RUST, -0.25, 0.1, 0.229, false);
    bx(c, 0.06, 0.12, 0.01, RUST, -0.38, 1.6, 0.229, false);
    bx(c, 0.2, 0.15, 0.005, 0xd8d0b0, -0.2, 1.4, 0.247, false).rotation.z = -0.08;   // 바랜 쪽지
    bx(c, 0.3, 0.08, 0.3, 0xa69272, 0, 1.74, 0).rotation.y = 0.2;                 // 위에 상자
    bx(c, 0.25, 0.15, 0.22, 0x8a7a62, 0.05, 1.86, 0.02).rotation.y = -0.15;
    c.rotation.z = 0.025;                                                         // 바닥이 기울어 살짝 기운다
    c.position.x = -0.03;
    g.add(c);
  }),

  paper_pile: prop('쌓인 서류 더미', [0.8, 0.6], (g) => {
    const tones = [0xf1efe8, 0xe8e6df, 0xd8d0b0, 0xfaeeda, WHITE];
    ([[-0.18, -0.05, 9, 0.1], [0.2, 0.08, 6, -0.15], [0.05, -0.18, 3, 0.3]] as const).forEach(([x, z, n, rot], p) => {
      let y = 0;
      for (let i = 0; i < n; i++) {
        const h = 0.05 + ((i + p) % 3) * 0.02;
        const isBox = (i + p) % 4 === 1;
        const b = bx(g, isBox ? 0.32 : 0.3, h, isBox ? 0.24 : 0.22, isBox ? 0xa69272 : tones[(i + p) % tones.length], x + Math.sin(i * 1.7) * 0.02, y + h / 2, z);
        b.rotation.y = rot + Math.sin(i * 2.3) * 0.15;
        if (i % 3 === 2) bx(g, 0.04, 0.01, 0.2, BOOKS[i % BOOKS.length], x + 0.12, y + h, z, false).rotation.y = rot;  // 띠지
        y += h;
      }
    });
    const fallen = bx(g, 0.3, 0.005, 0.22, WHITE, 0.3, 0.003, 0.22, false);         // 떨어진 종이
    fallen.rotation.y = 0.6;
  }),

  old_fan: prop('낡은 선풍기', [0.5, 0.5], (g) => {
    const FAN = 0x9aa5a8;
    mesh(g, cyl(0.2, 0.22, 0.05, 8), 0x7a8487, 0, 0.025, 0);
    mesh(g, cyl(0.025, 0.025, 0.9, 6), 0x7a8487, 0, 0.5, 0);
    mesh(g, cyl(0.035, 0.035, 0.15, 6), RUST, 0, 0.6, 0);                         // 녹슨 마디
    const head = new THREE.Group();
    head.position.set(0, 1.0, 0);
    head.rotation.set(-0.35, 0.3, 0.08);                                          // 고개가 처졌다
    mesh(head, cyl(0.08, 0.09, 0.18, 8), FAN, 0, 0, -0.08).rotation.x = Math.PI / 2;  // 모터
    for (let i = 0; i < 3; i++) {
      const b = bx(head, 0.1, 0.2, 0.01, i === 1 ? 0xb4b2a9 : 0xc8c6be, 0, 0, 0.05);
      b.geometry.translate(0, 0.1, 0);
      b.rotation.z = (i * 2 * Math.PI) / 3 + 0.3;
    }
    mesh(head, cyl(0.03, 0.03, 0.04, 6), 0x7a8487, 0, 0, 0.06).rotation.x = Math.PI / 2;
    const cage = mesh(head, new THREE.TorusGeometry(0.24, 0.012, 4, 12), 0x7a8487, 0, 0, 0.05);
    cage.castShadow = true;
    for (let i = 0; i < 4; i++) {                                                 // 철망 살 넷
      const s = bx(head, 0.48, 0.01, 0.01, 0x7a8487, 0, 0, 0.08, false);
      s.rotation.z = (i * Math.PI) / 4;
    }
    bx(head, 0.06, 0.06, 0.01, RUST, 0.15, -0.12, 0.09, false);                   // 녹
    g.add(head);
    bx(g, 0.08, 0.04, 0.06, 0xd8d0b0, 0.12, 0.03, 0.12).rotation.y = 0.4;         // 스위치 상자
    bx(g, 0.2, 0.012, 0.012, DARK, 0.15, 0.01, 0.25, false).rotation.y = -0.5;    // 늘어진 줄
  }),
};
