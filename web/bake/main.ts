// 굽기 — 로우폴리 3D 모형(scene/models.ts)을 고정 시점 정사영으로 그려 그림 조각과 atlas.json 을 만든다.
// tools/bake.ts 가 chromium 으로 이 페이지를 열고 window.__bake() 의 결과를 파일로 쓴다.
import * as THREE from 'three';
import { buildCharacter, buildItem, buildShell } from '../src/scene/models.ts';
import { ITEMS, PALETTE, FOREIGN_COLOR, HAIR, DIRS, W, D, type Hair } from '../src/scene/layout.ts';
import { charKey, type Atlas, type SpriteRect } from '../src/iso/atlas.ts';

const SCALE = 96;                                      // 세계 1 = 96 구운 픽셀 (화면 2배 밀도에서 또렷하게)
const VIEW = new THREE.Vector3(18, 16.5, 18);          // 시제품 카메라 (CX+18, 17, CZ+18) → 목표 (CX, 0.5, CZ)
const CX = W / 2, CZ = D / 2;
const PAD = 3;

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.setClearColor(0x000000, 0);

const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 200);
cam.position.copy(VIEW);
cam.lookAt(0, 0, 0);
cam.updateMatrixWorld();
const right = new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 0);
const up = new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 1);

function lights(scene: THREE.Scene): void {
  scene.add(new THREE.HemisphereLight(0xffffff, 0xb4b2a9, 0.75 * Math.PI));
  const sun = new THREE.DirectionalLight(0xffffff, 0.7 * Math.PI);
  sun.position.set(CX + 10, 18, CZ + 6);
  sun.target.position.set(CX, 0, CZ);
  sun.castShadow = true;
  sun.shadow.mapSize.set(4096, 4096);
  sun.shadow.bias = -0.0008;
  Object.assign(sun.shadow.camera, { left: -16, right: 16, top: 16, bottom: -16, near: 1, far: 70 });
  scene.add(sun, sun.target);
}

// 물체를 구운 픽셀로 꼭 맞게 그린다. 돌려주는 ox, oy 는 기준점 anchor 에서 그림 왼쪽 위까지
function shoot(obj: THREE.Object3D, anchor: THREE.Vector3): { canvas: HTMLCanvasElement; ox: number; oy: number } {
  const scene = new THREE.Scene();
  lights(scene);
  scene.add(obj);
  obj.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(obj);
  let u0 = Infinity, u1 = -Infinity, v0 = Infinity, v1 = -Infinity;
  for (let i = 0; i < 8; i++) {
    const p = new THREE.Vector3(i & 1 ? box.max.x : box.min.x, i & 2 ? box.max.y : box.min.y, i & 4 ? box.max.z : box.min.z).sub(anchor);
    const u = p.dot(right) * SCALE, v = -p.dot(up) * SCALE;
    u0 = Math.min(u0, u); u1 = Math.max(u1, u); v0 = Math.min(v0, v); v1 = Math.max(v1, v);
  }
  u0 = Math.floor(u0) - PAD; v0 = Math.floor(v0) - PAD; u1 = Math.ceil(u1) + PAD; v1 = Math.ceil(v1) + PAD;
  const w = u1 - u0, h = v1 - v0;
  renderer.setSize(w, h, false);
  cam.position.copy(anchor).add(VIEW);
  cam.lookAt(anchor);
  Object.assign(cam, { left: u0 / SCALE, right: u1 / SCALE, top: -v0 / SCALE, bottom: -v1 / SCALE });
  cam.updateProjectionMatrix();
  renderer.render(scene, cam);
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  c.getContext('2d')!.drawImage(renderer.domElement, 0, 0);
  return { canvas: c, ox: u0, oy: v0 };
}

// 줄 쌓기 — 키 큰 것부터 한 줄씩
function pack(shots: Map<string, { canvas: HTMLCanvasElement; ox: number; oy: number }>, sheet: string, width: number) {
  const order = [...shots.entries()].sort((a, b) => b[1].canvas.height - a[1].canvas.height);
  const rects: Record<string, SpriteRect> = {};
  let x = 0, y = 0, rowH = 0;
  for (const [k, s] of order) {
    if (x + s.canvas.width > width) { x = 0; y += rowH + 1; rowH = 0; }
    rects[k] = { sheet, sx: x, sy: y, w: s.canvas.width, h: s.canvas.height, ox: s.ox, oy: s.oy };
    x += s.canvas.width + 1;
    rowH = Math.max(rowH, s.canvas.height);
  }
  const out = document.createElement('canvas');
  out.width = width; out.height = y + rowH;
  const ctx = out.getContext('2d')!;
  for (const [k, s] of order) ctx.drawImage(s.canvas, rects[k].sx, rects[k].sy);
  return { rects, data: out.toDataURL('image/webp', 0.92) };
}

async function bake() {
  const origin = new THREE.Vector3(0, 0, 0);

  // 배경 — 바닥·벽에 가구까지 모두, 그림자도 함께
  const all = new THREE.Group();
  all.add(buildShell());
  for (const it of ITEMS) all.add(buildItem(it));
  const bg = shoot(all, origin);

  // 가구 조각 — 캐릭터 앞에 다시 그릴 것
  const items = new Map<string, ReturnType<typeof shoot>>();
  for (const it of ITEMS) items.set(it.id, shoot(buildItem(it), origin));

  // 캐릭터 조각 — 발을 바닥 가운데에 두고
  const chars = new Map<string, ReturnType<typeof shoot>>();
  const foot = new THREE.Vector3(CX, 0, CZ);
  const combos: [number, Hair][] = [
    ...PALETTE.flatMap((c) => (['session', 'job'] as Hair[]).map((h) => [c, h] as [number, Hair])),
    [FOREIGN_COLOR, 'foreign'],
  ];
  for (const [color, hair] of combos) for (const sit of [false, true]) for (let d = 0; d < DIRS; d++) {
    const g = buildCharacter(color, HAIR[hair], sit, (d * 2 * Math.PI) / DIRS);
    g.position.x = foot.x; g.position.z = foot.z;
    chars.set(charKey(color, hair, sit, d), shoot(g, foot));
  }

  const itemSheet = pack(items, 'items.webp', 2048);
  const charSheet = pack(chars, 'characters.webp', 2048);
  const atlas: Atlas = {
    version: 1,
    scale: SCALE,
    right: right.toArray() as Atlas['right'],
    up: up.toArray() as Atlas['up'],
    background: { sheet: 'background.webp', sx: 0, sy: 0, w: bg.canvas.width, h: bg.canvas.height, ox: bg.ox, oy: bg.oy },
    items: itemSheet.rects,
    characters: charSheet.rects,
  };
  return {
    atlas,
    files: {
      'background.webp': bg.canvas.toDataURL('image/webp', 0.92),
      'items.webp': itemSheet.data,
      'characters.webp': charSheet.data,
    },
  };
}

(window as any).__bake = bake;
(window as any).__ready = true;
