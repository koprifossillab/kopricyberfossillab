// 아래층 식당가 소품 — 패스트푸드점(티렉스 버거)과 한식집(장보고 국밥). 굽기에서만 쓴다(three).
// props.ts 와 같은 꼴: 바닥 가운데 (x, z), 발은 y=0, 앞(손님 쪽)은 +z, size 는 바닥 범위 [가로, 세로].
// 벽에 거는 것(메뉴판)은 뒷면이 z = -size[1]/2 에 닿는다. 상표·실제 상호는 쓰지 않는다 — 이름도 그림도 지어낸 것.
// 먹는 음식(buildFood)은 식탁에 붙박이로 굽지 않고 따로 — 먹는 사람이 앉았을 때만 화면이 그 앞에 놓는다.
import * as THREE from 'three';

const mats = new Map<string, THREE.Material>();
function mat(c: number, basic = false): THREE.Material {
  const k = `${basic ? 'b' : 'l'}${c}`;
  let m = mats.get(k);
  if (!m) { m = basic ? new THREE.MeshBasicMaterial({ color: c }) : new THREE.MeshLambertMaterial({ color: c, flatShading: true }); mats.set(k, m); }
  return m;
}
function bx(g: THREE.Object3D, w: number, h: number, d: number, c: number, x: number, y: number, z: number, cast = true, glow = false): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(c, glow));
  m.position.set(x, y, z);
  m.castShadow = cast;
  m.receiveShadow = true;
  g.add(m);
  return m;
}
function cy(g: THREE.Object3D, rt: number, rb: number, h: number, c: number, x: number, y: number, z: number, n = 10, cast = true): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, n), mat(c));
  m.position.set(x, y, z);
  m.castShadow = cast;
  m.receiveShadow = true;
  g.add(m);
  return m;
}
const GLASS = new THREE.MeshLambertMaterial({ color: 0xcfe8f0, transparent: true, opacity: 0.35, depthWrite: false });

type Prop = { label: string; size: [number, number]; build: (x: number, z: number, rot?: number) => THREE.Group };
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

// 색 — 버거집은 초록·귤색(공룡 버거집이라), 한식집은 나무·먹색
const GREEN = 0x2f8f5b, GREEN_D = 0x22684a, ORANGE = 0xef8a2b, CREAM = 0xf6ecd6;
const STEEL = 0xb9c0c4, STEEL_D = 0x7d868b, DARK = 0x2c2c2a, WHITE = 0xfafafa, RED = 0xd8442c;
const WOOD = 0xb5814f, WOOD_D = 0x8a5a32, WOOD_L = 0xd4a373, INK = 0x3a3330, CLAY = 0x5a3a2a;
const BUN = 0xd9a24e, PATTY = 0x6b3b22, LETTUCE = 0x7cb342, CHEESE = 0xf3c13a, FRIES = 0xf2cf5b;

// ── 버거 조각 (식탁 위 음식·계산대 모형이 같이 쓴다)
function burger(g: THREE.Object3D, x: number, y: number, z: number, s = 1): void {
  cy(g, 0.075 * s, 0.07 * s, 0.03 * s, BUN, x, y + 0.015 * s, z, 10, false);
  cy(g, 0.08 * s, 0.08 * s, 0.022 * s, PATTY, x, y + 0.04 * s, z, 10, false);
  bx(g, 0.15 * s, 0.006 * s, 0.15 * s, CHEESE, x, y + 0.054 * s, z, false).rotation.y = 0.5;
  cy(g, 0.085 * s, 0.085 * s, 0.008 * s, LETTUCE, x, y + 0.06 * s, z, 8, false);
  const top = new THREE.Mesh(new THREE.SphereGeometry(0.078 * s, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), mat(BUN));
  top.position.set(x, y + 0.064 * s, z);
  g.add(top);
}
function fries(g: THREE.Object3D, x: number, y: number, z: number): void {
  bx(g, 0.07, 0.08, 0.04, RED, x, y + 0.04, z, false);
  for (let i = 0; i < 6; i++) bx(g, 0.01, 0.07, 0.01, FRIES, x - 0.025 + (i % 3) * 0.025, y + 0.1 + (i % 2) * 0.01, z - 0.01 + Math.floor(i / 3) * 0.02, false);
}
function cola(g: THREE.Object3D, x: number, y: number, z: number): void {
  cy(g, 0.04, 0.032, 0.13, WHITE, x, y + 0.065, z, 10, false);
  cy(g, 0.012, 0.03, 0.006, GREEN, x, y + 0.08, z + 0.035, 6, false);   // 컵 무늬(이름 없는 잎)
  cy(g, 0.042, 0.042, 0.012, 0xdedede, x, y + 0.135, z, 10, false);
  bx(g, 0.006, 0.09, 0.006, RED, x + 0.01, y + 0.18, z, false);       // 빨대
}
function bowl(g: THREE.Object3D, x: number, y: number, z: number, r: number, c: number, inside: number, h = 0.07): void {
  cy(g, r, r * 0.65, h, c, x, y + h / 2, z, 12, false);
  cy(g, r * 0.9, r * 0.9, 0.006, inside, x, y + h - 0.006, z, 12, false);
}
function spoonSet(g: THREE.Object3D, x: number, y: number, z: number): void {
  bx(g, 0.012, 0.004, 0.2, STEEL, x, y + 0.004, z, false);            // 젓가락
  bx(g, 0.012, 0.004, 0.2, STEEL, x + 0.02, y + 0.004, z, false);
  bx(g, 0.016, 0.004, 0.16, STEEL, x + 0.05, y + 0.004, z + 0.02, false);   // 숟가락 자루
  cy(g, 0.022, 0.022, 0.006, STEEL, x + 0.05, y + 0.005, z - 0.07, 8, false);
}

export const DINER_PROPS: Record<string, Prop> = {
  // ── 티렉스 버거 ───────────────────────────────────────────────
  fryer: prop('튀김기', [1.2, 0.7], (g) => {
    bx(g, 1.2, 0.9, 0.7, STEEL, 0, 0.45, 0);
    bx(g, 1.14, 0.02, 0.62, STEEL_D, 0, 0.91, 0, false);
    for (const x of [-0.3, 0.3]) {
      bx(g, 0.46, 0.03, 0.44, 0xa5772a, x, 0.9, 0, false);              // 기름
      bx(g, 0.36, 0.12, 0.3, 0xb9b9b9, x, 1.0, 0.02);                   // 바구니
      bx(g, 0.03, 0.03, 0.3, DARK, x, 1.08, 0.3);                        // 손잡이
    }
    bx(g, 1.2, 0.3, 0.12, STEEL_D, 0, 1.2, -0.3);                        // 뒤 조작판
    for (const x of [-0.4, -0.2, 0.2, 0.4]) bx(g, 0.05, 0.05, 0.01, x < 0 ? ORANGE : GREEN, x, 1.2, -0.235, false, true);
  }),
  grill: prop('그릴', [1.4, 0.7], (g) => {
    bx(g, 1.4, 0.88, 0.7, STEEL, 0, 0.44, 0);
    bx(g, 1.34, 0.03, 0.62, DARK, 0, 0.9, 0, false);                     // 철판
    for (let i = 0; i < 6; i++) cy(g, 0.07, 0.07, 0.02, PATTY, -0.45 + (i % 3) * 0.3, 0.92, -0.12 + Math.floor(i / 3) * 0.24, 10, false);
    bx(g, 1.4, 0.5, 0.1, STEEL_D, 0, 1.15, -0.3);                        // 뒤 가림판
    bx(g, 0.2, 0.02, 0.3, STEEL_D, 0.6, 0.94, 0.15, false);              // 뒤집개
  }),
  drink_fountain: prop('음료 디스펜서', [1.0, 0.6], (g) => {
    bx(g, 1.0, 0.85, 0.6, STEEL_D, 0, 0.425, 0);                         // 받침장
    bx(g, 0.9, 0.7, 0.45, WHITE, 0, 1.2, -0.05);
    [RED, ORANGE, GREEN, 0x6b3b22].forEach((c, i) => {
      bx(g, 0.17, 0.2, 0.01, c, -0.3 + i * 0.2, 1.38, 0.18, false, true);   // 맛 표시
      bx(g, 0.04, 0.08, 0.06, DARK, -0.3 + i * 0.2, 1.0, 0.18, false);     // 꼭지
    });
    bx(g, 0.86, 0.03, 0.2, STEEL, 0, 0.87, 0.18, false);                  // 물받이
    for (let i = 0; i < 4; i++) cy(g, 0.045, 0.035, 0.12, WHITE, -0.33 + i * 0.07, 0.92 + i * 0.12, -0.25, 8, false);   // 컵 더미
  }),
  shake_machine: prop('셰이크 기계', [0.6, 0.6], (g) => {
    bx(g, 0.6, 0.85, 0.6, STEEL_D, 0, 0.425, 0);
    bx(g, 0.5, 0.65, 0.5, STEEL, 0, 1.18, 0);
    for (const x of [-0.12, 0.12]) {
      const hopper = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.2, 10), GLASS);
      hopper.position.set(x, 1.6, -0.05); g.add(hopper);
      cy(g, 0.07, 0.07, 0.1, x < 0 ? 0xf3d9e0 : 0xfff3d6, x, 1.55, -0.05, 10, false);
      bx(g, 0.05, 0.1, 0.05, DARK, x, 0.98, 0.26, false);
    }
  }),
  ff_menu: prop('메뉴판(불 켜진)', [3.6, 0.1], (g) => {
    const y = 1.78, z = -0.03;   // 아래층은 반 층이라 뒤 벽이 낮다(1.3) — 벽 위로 조금 솟게
    bx(g, 3.6, 0.85, 0.06, DARK, 0, y, z);
    // 판 셋 — 세트 사진(버거·감자·음료), 글 줄, 값 자리
    for (let p = 0; p < 3; p++) {
      const x = -1.2 + p * 1.2;
      bx(g, 1.12, 0.77, 0.01, p === 1 ? 0xfff6e3 : 0xfdf0d8, x, y, z + 0.035, false, true);
      bx(g, 1.0, 0.1, 0.005, p === 1 ? ORANGE : GREEN, x, y + 0.3, z + 0.04, false, true);   // 머리띠
      burger(g, x - 0.2, y - 0.05, z + 0.12, 2.2);                                             // 대표 그림
      bx(g, 0.12, 0.2, 0.01, RED, x + 0.12, y - 0.02, z + 0.045, false, true);                 // 감자 그림
      bx(g, 0.1, 0.24, 0.01, 0x8ec5e8, x + 0.32, y - 0.01, z + 0.045, false, true);            // 음료 그림
      for (let i = 0; i < 3; i++) bx(g, 0.75 - i * 0.12, 0.025, 0.005, 0x6f5a45, x, y - 0.22 - i * 0.05, z + 0.045, false, true);
    }
  }),
  ff_counter: prop('주문 계산대', [4.6, 0.6], (g) => {
    bx(g, 4.6, 1.0, 0.6, GREEN, 0, 0.5, 0);
    bx(g, 4.7, 0.05, 0.7, CREAM, 0, 1.025, 0);
    bx(g, 4.6, 0.12, 0.02, ORANGE, 0, 0.75, 0.31, false);               // 띠
    // 공룡 발자국 무늬 (이름·로고 대신)
    for (const x of [-1.6, 0, 1.6]) {
      cy(g, 0.07, 0.07, 0.01, CREAM, x, 0.45, 0.305, 8, false).rotation.x = Math.PI / 2;
      for (const a of [-0.5, 0, 0.5]) bx(g, 0.03, 0.09, 0.01, CREAM, x + Math.sin(a) * 0.1, 0.45 + Math.cos(a) * 0.1, 0.305, false).rotation.z = -a;
    }
    for (const x of [-1.4, 0, 1.4]) {                                      // 계산기 셋
      bx(g, 0.34, 0.08, 0.3, DARK, x, 1.09, -0.05);
      const s = bx(g, 0.3, 0.2, 0.03, DARK, x, 1.24, -0.12);
      s.rotation.x = -0.4;
      const sc = bx(g, 0.26, 0.16, 0.005, 0x9fe1cb, x, 1.245, -0.1, false, true);
      sc.rotation.x = -0.4;
    }
    for (let i = 0; i < 5; i++) bx(g, 0.4, 0.015, 0.3, i % 2 ? ORANGE : 0xd97a20, 2.0, 1.06 + i * 0.016, 0.05, false);   // 쟁반 더미
    bx(g, 0.18, 0.12, 0.1, WHITE, -2.05, 1.11, 0.05);                     // 냅킨 통
    burger(g, -0.7, 1.05, 0.1, 1);                                         // 막 나온 것
    fries(g, -0.5, 1.05, 0.12);
  }),
  kiosk: prop('주문 키오스크', [0.5, 0.4], (g) => {
    bx(g, 0.36, 0.08, 0.3, DARK, 0, 0.04, 0);
    bx(g, 0.1, 0.9, 0.1, STEEL_D, 0, 0.5, -0.04);
    bx(g, 0.46, 0.75, 0.06, WHITE, 0, 1.3, 0);
    bx(g, 0.4, 0.6, 0.005, 0x85b7eb, 0, 1.33, 0.032, false, true);
    for (let i = 0; i < 4; i++) bx(g, 0.16, 0.12, 0.004, i % 2 ? ORANGE : GREEN, -0.09 + (i % 2) * 0.18, 1.45 - Math.floor(i / 2) * 0.16, 0.036, false, true);
    bx(g, 0.3, 0.05, 0.004, ORANGE, 0, 1.1, 0.036, false, true);           // 「주문」 단추
    bx(g, 0.2, 0.04, 0.08, DARK, 0, 1.0, 0.05, false);                      // 영수증 구멍
  }),
  ff_table: prop('2인 탁자', [0.7, 0.7], (g) => {
    bx(g, 0.7, 0.04, 0.7, CREAM, 0, 0.74, 0);
    bx(g, 0.72, 0.02, 0.72, ORANGE, 0, 0.71, 0, false);
    cy(g, 0.04, 0.04, 0.7, DARK, 0, 0.36, 0, 6);
    bx(g, 0.4, 0.03, 0.4, DARK, 0, 0.015, 0);
    bx(g, 0.06, 0.08, 0.06, RED, 0.24, 0.8, -0.24, false);                 // 케첩
  }),
  ff_stool: prop('의자(버거집)', [0.42, 0.42], (g) => {
    bx(g, 0.4, 0.06, 0.4, GREEN, 0, 0.45, 0);
    bx(g, 0.4, 0.38, 0.05, GREEN_D, 0, 0.68, -0.18);
    for (const [dx, dz] of [[-0.16, -0.16], [0.16, -0.16], [-0.16, 0.16], [0.16, 0.16]]) bx(g, 0.035, 0.43, 0.035, DARK, dx, 0.215, dz);
  }),
  tray_return: prop('쟁반 반납대', [0.8, 0.5], (g) => {
    bx(g, 0.8, 1.0, 0.5, GREEN_D, 0, 0.5, 0);
    bx(g, 0.5, 0.25, 0.05, DARK, 0, 0.78, 0.23, false);                   // 쓰레기 넣는 곳
    bx(g, 0.8, 0.04, 0.5, CREAM, 0, 1.02, 0);
    for (let i = 0; i < 3; i++) bx(g, 0.42, 0.015, 0.32, ORANGE, 0, 1.05 + i * 0.02, 0, false);
  }),
  ff_trash: prop('쓰레기통(버거집)', [0.5, 0.5], (g) => {
    // 위는 쟁반 얹는 판, 앞은 젖혀지는 밀문, 아래 귤색 띠
    bx(g, 0.5, 1.0, 0.5, GREEN_D, 0, 0.5, 0);
    bx(g, 0.54, 0.04, 0.54, CREAM, 0, 1.02, 0);
    bx(g, 0.5, 0.06, 0.02, ORANGE, 0, 0.12, 0.255, false);
    bx(g, 0.36, 0.26, 0.02, 0x1e4d37, 0, 0.78, 0.255, false);              // 밀문 테
    bx(g, 0.32, 0.22, 0.02, DARK, 0, 0.78, 0.262, false).rotation.x = 0.12;  // 밀문 (조금 젖혀진)
    bx(g, 0.14, 0.14, 0.006, CREAM, 0, 0.45, 0.255, false);               // 「버리는 곳」 그림 자리
    bx(g, 0.06, 0.08, 0.004, GREEN, 0, 0.45, 0.259, false);
    bx(g, 0.34, 0.015, 0.26, ORANGE, -0.03, 1.05, 0.0, false);             // 두고 간 쟁반
    cy(g, 0.035, 0.028, 0.11, WHITE, 0.15, 1.095, 0.08, 8, false);         // 다 마신 컵
  }),
  // ── 장보고 국밥 ───────────────────────────────────────────────
  soup_cauldron: prop('육수 솥', [1.0, 0.9], (g) => {
    bx(g, 1.0, 0.55, 0.9, 0x5f5e5a, 0, 0.275, 0);                         // 화구
    bx(g, 0.2, 0.12, 0.02, 0xe24b4a, 0, 0.3, 0.46, false, true);          // 불 표시
    cy(g, 0.42, 0.38, 0.6, STEEL, 0, 0.85, 0, 16);
    cy(g, 0.4, 0.4, 0.01, 0xefe6d2, 0, 1.14, 0, 16, false);               // 뽀얀 국물
    cy(g, 0.43, 0.43, 0.03, STEEL_D, 0, 1.15, 0, 16, false);
    const lad = bx(g, 0.03, 0.03, 0.7, WOOD_D, 0.2, 1.3, 0.05, false);    // 국자
    lad.rotation.x = -0.9;
  }),
  noodle_boiler: prop('국수 삶는 솥', [1.2, 0.7], (g) => {
    bx(g, 1.2, 0.85, 0.7, STEEL, 0, 0.425, 0);
    for (const x of [-0.3, 0.3]) {
      cy(g, 0.22, 0.22, 0.04, 0xcfe0e8, x, 0.87, 0, 14, false);
      cy(g, 0.12, 0.12, 0.25, STEEL_D, x, 0.98, 0.02, 10).scale.set(1, 1, 1);   // 체망
      bx(g, 0.03, 0.03, 0.3, DARK, x, 1.08, 0.24, false);
    }
    bx(g, 1.2, 0.35, 0.08, STEEL_D, 0, 1.05, -0.31);
  }),
  kr_shelf: prop('뚝배기 선반', [1.6, 0.45], (g) => {
    for (const y of [0.05, 0.6, 1.15, 1.7]) bx(g, 1.6, 0.04, 0.45, WOOD_D, 0, y, 0);
    for (const x of [-0.78, 0.78]) bx(g, 0.04, 1.72, 0.45, WOOD_D, x, 0.86, 0);
    for (let s = 0; s < 3; s++) for (let i = 0; i < 5; i++) {
      const x = -0.6 + i * 0.3, y = 0.07 + s * 0.55;
      if (s === 2) { bowl(g, x, y, 0, 0.11, WHITE, 0xeeeeee, 0.06); bowl(g, x, y + 0.06, 0, 0.11, WHITE, 0xeeeeee, 0.06); }   // 국수 그릇
      else bowl(g, x, y, 0, 0.11, CLAY, 0x2c1e17, 0.1);                   // 뚝배기
    }
  }),
  kr_menu: prop('나무 메뉴판', [4.0, 0.1], (g) => {
    const z = -0.03;
    bx(g, 4.0, 0.12, 0.06, WOOD_D, 0, 2.18, z);                          // 위 가로대
    // 나무 판 여덟 — 세로로 걸린 이름판 (국밥·순대국·수육·국수·비빔국수·잔치국수·김밥·공깃밥 자리)
    for (let i = 0; i < 8; i++) {
      const x = -1.75 + i * 0.5;
      bx(g, 0.42, 0.72, 0.04, i % 2 ? WOOD_L : 0xe0b88a, x, 1.75, z + 0.01);
      for (let k = 0; k < 3; k++) bx(g, 0.1, 0.08, 0.005, INK, x, 1.97 - k * 0.12, z + 0.035, false);   // 붓글씨 자리
      bx(g, 0.24, 0.04, 0.005, 0x9c2a1d, x, 1.47, z + 0.035, false);     // 값 (붉은 글)
    }
  }),
  kimchi_fridge: prop('김치 냉장고', [0.9, 0.6], (g) => {
    bx(g, 0.9, 1.0, 0.6, 0xe8e4dc, 0, 0.5, 0);
    bx(g, 0.86, 0.02, 0.02, 0xb4b2a9, 0, 0.55, 0.31, false);
    for (const y of [0.3, 0.8]) bx(g, 0.3, 0.04, 0.03, STEEL_D, 0, y, 0.31, false);
    bx(g, 0.12, 0.05, 0.005, 0x9fe1cb, 0.3, 0.92, 0.305, false, true);
  }),
  kr_counter: prop('계산대(한식)', [3.0, 0.6], (g) => {
    bx(g, 3.0, 0.95, 0.6, WOOD_D, 0, 0.475, 0);
    bx(g, 3.1, 0.05, 0.7, WOOD_L, 0, 0.975, 0);
    for (let i = 0; i < 5; i++) bx(g, 0.02, 0.8, 0.01, 0x734a2a, -1.2 + i * 0.6, 0.45, 0.305, false);   // 널 무늬
    bx(g, 0.34, 0.1, 0.3, DARK, -0.8, 1.05, -0.05);                      // 계산기
    const sc = bx(g, 0.28, 0.16, 0.03, DARK, -0.8, 1.18, -0.14); sc.rotation.x = -0.4;
    bowl(g, 0.4, 1.0, 0.1, 0.1, 0xd9c7a0, 0xe24b4a, 0.05);               // 박하사탕 그릇
    cy(g, 0.03, 0.03, 0.08, WOOD_L, 0.65, 1.04, 0.08, 6);                 // 이쑤시개 통
    for (let i = 0; i < 3; i++) bowl(g, 1.0 + (i % 2) * 0.05, 1.0 + i * 0.1, -0.05, 0.11, CLAY, 0x2c1e17, 0.1);   // 쌓은 뚝배기
  }),
  self_bar: prop('셀프 코너', [1.4, 0.5], (g) => {
    bx(g, 1.4, 0.85, 0.5, WOOD, 0, 0.425, 0);
    bx(g, 1.44, 0.04, 0.54, WOOD_L, 0, 0.87, 0);
    bx(g, 0.35, 0.5, 0.35, WHITE, -0.45, 1.14, -0.02);                    // 정수기
    bx(g, 0.04, 0.05, 0.04, 0x378add, -0.45, 1.05, 0.17, false);
    for (let i = 0; i < 4; i++) cy(g, 0.03, 0.025, 0.08, STEEL, -0.05 + (i % 2) * 0.07, 0.93 + Math.floor(i / 2) * 0.08, -0.1, 8, false);   // 스테인리스 컵
    bowl(g, 0.4, 0.89, 0.0, 0.15, STEEL, 0xc8402a, 0.08);                 // 김치 통
    bowl(g, 0.4, 0.89, -0.15, 0.06, WHITE, 0xd9b343, 0.03);               // 단무지
  }),
  kr_trash: prop('잔반통', [0.45, 0.45], (g) => {
    // 낮은 나무 받침에 뚜껑 덮은 스테인리스 통, 앞에 「잔반」 표 자리
    bx(g, 0.45, 0.1, 0.45, WOOD_D, 0, 0.05, 0);
    cy(g, 0.19, 0.16, 0.55, STEEL, 0, 0.375, 0, 12);
    cy(g, 0.2, 0.2, 0.03, STEEL_D, 0, 0.665, 0, 12, false);               // 뚜껑
    bx(g, 0.12, 0.03, 0.03, DARK, 0, 0.695, 0, false);                     // 손잡이
    bx(g, 0.14, 0.07, 0.005, WHITE, 0, 0.45, 0.185, false);               // 표 자리
    bx(g, 0.08, 0.02, 0.004, 0x9c2a1d, 0, 0.45, 0.189, false);
  }),
  kr_table: prop('4인 나무 식탁', [1.3, 0.75], (g) => {
    bx(g, 1.3, 0.05, 0.75, WOOD, 0, 0.72, 0);
    for (const [dx, dz] of [[-0.58, -0.3], [0.58, -0.3], [-0.58, 0.3], [0.58, 0.3]]) bx(g, 0.05, 0.7, 0.05, WOOD_D, dx, 0.35, dz);
    // 가운데 — 수저통·물병·김치 그릇·휴지
    bx(g, 0.12, 0.12, 0.08, STEEL, -0.1, 0.805, 0);                        // 수저통
    for (let i = 0; i < 4; i++) bx(g, 0.012, 0.1, 0.012, STEEL_D, -0.13 + i * 0.02, 0.88, 0, false);
    cy(g, 0.045, 0.05, 0.2, 0xcfe8f0, 0.12, 0.845, -0.02, 8);              // 물병
    cy(g, 0.03, 0.03, 0.03, 0x378add, 0.12, 0.96, -0.02, 8, false);
    bowl(g, 0.32, 0.745, 0.02, 0.09, WHITE, 0xc8402a, 0.04);              // 김치
    bx(g, 0.12, 0.07, 0.07, WHITE, -0.34, 0.78, -0.02);                    // 휴지
  }),
  kr_stool: prop('나무 의자', [0.4, 0.4], (g) => {
    bx(g, 0.38, 0.05, 0.38, WOOD_L, 0, 0.45, 0);
    for (const [dx, dz] of [[-0.15, -0.15], [0.15, -0.15], [-0.15, 0.15], [0.15, 0.15]]) bx(g, 0.04, 0.43, 0.04, WOOD_D, dx, 0.215, dz);
  }),
  // ── 식당가 로비 ───────────────────────────────────────────────
  food_sign: prop('식당가 안내판', [0.7, 0.3], (g) => {
    bx(g, 0.5, 0.04, 0.3, DARK, 0, 0.02, 0);
    bx(g, 0.06, 1.2, 0.06, STEEL_D, 0, 0.6, 0);
    bx(g, 0.7, 0.9, 0.05, WHITE, 0, 1.55, 0);
    bx(g, 0.62, 0.12, 0.01, INK, 0, 1.88, 0.03, false);                    // 「식당가」 줄
    bx(g, 0.5, 0.18, 0.01, GREEN, 0, 1.6, 0.03, false);                    // 버거집 칸
    bx(g, 0.5, 0.18, 0.01, WOOD_D, 0, 1.36, 0.03, false);                  // 국밥집 칸
    bx(g, 0.1, 0.1, 0.012, ORANGE, 0.22, 1.6, 0.035, false);               // → 표
    bx(g, 0.1, 0.1, 0.012, ORANGE, 0.22, 1.36, 0.035, false);
  }),
  shop_pylon: prop('가게 이름 기둥', [0.9, 0.25], (g) => {
    bx(g, 0.5, 0.06, 0.25, DARK, 0, 0.03, 0);
    bx(g, 0.08, 1.7, 0.08, STEEL_D, 0, 0.85, 0);
    bx(g, 0.9, 0.46, 0.08, DARK, 0, 1.92, 0);                             // 이름판 테 — 이름은 화면이 명판으로 붙인다
    bx(g, 0.84, 0.4, 0.01, WHITE, 0, 1.92, 0.045, false, true);
  }),
  menu_stand: prop('입간판', [0.6, 0.5], (g) => {
    for (const s of [-1, 1]) {
      const b = bx(g, 0.55, 0.85, 0.03, 0x2b3a33, 0, 0.45, s * 0.12);
      b.rotation.x = s * 0.18;
      const f = bx(g, 0.6, 0.9, 0.02, WOOD_D, 0, 0.45, s * 0.125);
      f.rotation.x = s * 0.18;
      f.position.z = s * 0.1;
    }
    for (let i = 0; i < 4; i++) bx(g, 0.35 - (i % 2) * 0.1, 0.03, 0.005, WHITE, 0, 0.7 - i * 0.12, 0.16, false);   // 분필 글
  }),
};

// ── 먹는 음식 — 식탁 위, 먹는 사람 앞. 기준점은 식탁 위 (0, 0, 0) — 화면이 식탁 높이에 놓는다. 앞(먹는 사람 쪽)은 +z
export const FOODS = ['burger', 'gukbap', 'noodle'] as const;
export type Food = typeof FOODS[number];
export function buildFood(kind: Food, rot: number): THREE.Group {
  const g = new THREE.Group();
  const t = new THREE.Group();
  if (kind === 'burger') {
    bx(t, 0.36, 0.015, 0.26, ORANGE, 0, 0.0075, 0);                       // 쟁반
    bx(t, 0.3, 0.004, 0.2, CREAM, 0, 0.017, 0, false);                    // 깔개 종이
    burger(t, -0.06, 0.02, 0.03);
    fries(t, 0.08, 0.02, -0.05);
    cola(t, 0.12, 0.02, 0.06);
  } else if (kind === 'gukbap') {
    bx(t, 0.4, 0.012, 0.28, WOOD_D, 0, 0.006, 0);                         // 나무 받침
    bowl(t, 0, 0.012, -0.02, 0.1, CLAY, 0xece0c6, 0.09);                  // 뚝배기 — 뽀얀 국물
    cy(t, 0.02, 0.02, 0.005, LETTUCE, -0.03, 0.1, -0.03, 6, false);       // 파
    cy(t, 0.02, 0.02, 0.005, LETTUCE, 0.03, 0.1, 0.0, 6, false);
    bowl(t, 0.14, 0.012, -0.08, 0.045, WHITE, 0xf2efe6, 0.04);           // 공깃밥
    bowl(t, -0.14, 0.012, -0.08, 0.04, WHITE, 0xc8402a, 0.025);          // 깍두기
    spoonSet(t, 0.15, 0.012, 0.06);
  } else {
    bx(t, 0.4, 0.012, 0.28, WOOD_D, 0, 0.006, 0);
    bowl(t, 0, 0.012, -0.02, 0.11, WHITE, 0xe9d9a8, 0.07);               // 국수 그릇 — 면
    for (let i = 0; i < 4; i++) bx(t, 0.11, 0.004, 0.006, 0xf3e7c0, -0.02 + (i % 2) * 0.03, 0.082, -0.06 + i * 0.025, false).rotation.y = i * 0.6;
    bx(t, 0.04, 0.006, 0.04, 0xf3c13a, 0.03, 0.084, 0.0, false);          // 지단
    bx(t, 0.03, 0.006, 0.03, LETTUCE, -0.04, 0.084, 0.02, false);         // 애호박
    bowl(t, -0.14, 0.012, -0.08, 0.04, WHITE, 0xc8402a, 0.025);          // 김치
    spoonSet(t, 0.15, 0.012, 0.06);
  }
  t.rotation.y = rot;
  g.add(t);
  return g;
}
