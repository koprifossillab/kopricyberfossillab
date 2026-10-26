// 굽기 — 로우폴리 3D 모형(scene/models.ts)을 고정 시점 정사영으로 그려 그림 조각과 atlas.json 을 만든다.
// tools/bake.ts 가 chromium 으로 이 페이지를 열고 window.__bake() 의 결과를 파일로 쓴다.
//
// 모듈(scene/modules.ts)마다 두 층을 굽는다 — 화면은 모든 모듈의 바닥 층을 먼저, 그다음 물건 층을 뒤에서부터 붙인다
// (바닥과 물건을 한 장으로 구우면 앞 모듈의 바닥이 뒤 모듈의 높은 물건을 덮는다).
//   floor   바닥·격자·깔개 + 가구의 그림자 (가구는 그림자만 드리우고 그려지지 않게)
//   objects 가구와 벽
// 가구(items)는 따로도 굽는다 — 캐릭터 앞에 다시 그려 가린다. 기준점은 모두 모듈 원점.
import * as THREE from 'three';
import { buildBody, buildFace, buildHair, buildAcc, buildCap, buildItem, buildFloor, buildTall } from '../src/scene/models.ts';
import { PALETTE, FOREIGN_COLOR, DIRS, SKINS, HEAD_Y } from '../src/scene/layout.ts';
import { OUTFITS, BUILD_LIST, BUILDS, BODY_H, BODY_Y0, shapeKey, HAIRS, HAIR_COLORS, ACCENTS, ACCS, ACCENT_ACC, HAIR_ACC, WIDE_ACC } from '../src/scene/appearance.ts';
import { MODULES, type ModuleType } from '../src/scene/modules.ts';
import { buildDino, DINO_COLORS, DINO_FRAMES, type DinoPose } from '../src/scene/dino.ts';
import { buildFish, FISH_KINDS } from '../src/scene/aquarium.ts';
import { bodyKey, faceKey, hairKey, accKey, capKey, dinoKey, fishKey, type Atlas, type SpriteRect, type ModuleSprites } from '../src/iso/atlas.ts';

const SCALE = 96;                                      // 세계 1 = 96 구운 픽셀 (화면 2배 밀도에서 또렷하게)
const VIEW = new THREE.Vector3(18, 16.5, 18);          // 시제품 카메라 방향 (CX+18, 17, CZ+18) → (CX, 0.5, CZ)
const SUN = new THREE.Vector3(10, 18, 6);              // 시제품 해 방향
const PAD = 3;

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.setClearColor(0x000000, 0);

const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 400);
cam.position.copy(VIEW);
cam.lookAt(0, 0, 0);
cam.updateMatrixWorld();
const right = new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 0);
const up = new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 1);

// 씬·조명은 하나만 — 렌더마다 새 그림자 맵을 만들면 swiftshader 가 CONTEXT_LOST 로 멈춘다
const scene = new THREE.Scene();
scene.add(new THREE.HemisphereLight(0xffffff, 0xb4b2a9, 0.75 * Math.PI));
const sun = new THREE.DirectionalLight(0xffffff, 0.7 * Math.PI);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.bias = -0.0008;
Object.assign(sun.shadow.camera, { left: -20, right: 20, top: 20, bottom: -20, near: 1, far: 90 });
scene.add(sun, sun.target);
const HIDDEN = new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false });   // 그림자만 드리운다
const OCCLUDE = new THREE.MeshBasicMaterial({ colorWrite: false });                      // 보이지 않고 뒤의 것만 가린다

function dispose(o: THREE.Object3D): void {
  o.traverse((m) => { if ((m as THREE.Mesh).geometry) (m as THREE.Mesh).geometry.dispose(); });
}

// 물체를 구운 픽셀로 꼭 맞게 그린다. bounds 가 있으면 그 물체의 경계로 창을 잡는다. ox, oy 는 기준점에서 그림 왼쪽 위까지
function shoot(obj: THREE.Object3D, anchor: THREE.Vector3, bounds: THREE.Object3D = obj): { canvas: HTMLCanvasElement; ox: number; oy: number } | null {
  scene.add(obj);
  obj.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(bounds);
  if (box.isEmpty()) { scene.remove(obj); dispose(obj); return null; }
  const mid = box.getCenter(new THREE.Vector3());
  sun.position.copy(mid).add(SUN);
  sun.target.position.copy(mid);
  sun.target.updateMatrixWorld();
  let u0 = Infinity, u1 = -Infinity, v0 = Infinity, v1 = -Infinity;
  for (let i = 0; i < 8; i++) {
    const p = new THREE.Vector3(i & 1 ? box.max.x : box.min.x, i & 2 ? box.max.y : box.min.y, i & 4 ? box.max.z : box.min.z).sub(anchor);
    const u = p.dot(right) * SCALE, v = -p.dot(up) * SCALE;
    u0 = Math.min(u0, u); u1 = Math.max(u1, u); v0 = Math.min(v0, v); v1 = Math.max(v1, v);
  }
  u0 = Math.floor(u0) - PAD; v0 = Math.floor(v0) - PAD; u1 = Math.ceil(u1) + PAD; v1 = Math.ceil(v1) + PAD;
  const w = u1 - u0, h = v1 - v0;
  if (!(w > 0 && h > 0) || !Number.isFinite(w + h)) { console.warn('빈 그림', obj.name || obj.type, box.min.toArray(), box.max.toArray()); scene.remove(obj); dispose(obj); return null; }
  renderer.setSize(w, h, false);
  cam.position.copy(anchor).add(VIEW);
  cam.lookAt(anchor);
  Object.assign(cam, { left: u0 / SCALE, right: u1 / SCALE, top: -v0 / SCALE, bottom: -v1 / SCALE });
  cam.updateProjectionMatrix();
  renderer.render(scene, cam);
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  c.getContext('2d')!.drawImage(renderer.domElement, 0, 0);
  scene.remove(obj);
  dispose(obj);
  return { canvas: c, ox: u0, oy: v0 };
}

type Shot = NonNullable<ReturnType<typeof shoot>>;

// 줄 쌓기 — 키 큰 것부터 한 줄씩
function pack(shots: Map<string, Shot>, sheet: string, width: number) {
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

const single = (s: Shot, sheet: string): SpriteRect => ({ sheet, sx: 0, sy: 0, w: s.canvas.width, h: s.canvas.height, ox: s.ox, oy: s.oy });

async function bake() {
  const origin = new THREE.Vector3(0, 0, 0);
  const files: Record<string, string> = {};
  const modules: Record<string, ModuleSprites> = {};
  const items = new Map<string, Shot>();

  for (const type of Object.keys(MODULES) as ModuleType[]) {
    const def = MODULES[type];
    const ms: ModuleSprites = { items: {} };
    // 바닥 층 — 가구는 그림자만
    if (def.floors.length) {
      const floor = buildFloor(type);
      const g = new THREE.Group();
      g.add(floor);
      const casters = new THREE.Group();
      for (const it of def.items) casters.add(buildItem(it));
      casters.add(buildTall(type));
      casters.traverse((m) => { if ((m as THREE.Mesh).isMesh) { (m as THREE.Mesh).material = HIDDEN; m.castShadow = true; } });
      g.add(casters);
      const s = shoot(g, origin, floor);
      if (s) { const name = `m-${type}-floor.webp`; files[name] = s.canvas.toDataURL('image/webp', 0.92); ms.floor = single(s, name); }
    }
    // 물건 층 — 가구와 벽
    const objs = new THREE.Group();
    for (const it of def.items) objs.add(buildItem(it));
    objs.add(buildTall(type));
    const so = shoot(objs, origin);
    if (so) { const name = `m-${type}-objects.webp`; files[name] = so.canvas.toDataURL('image/webp', 0.92); ms.objects = single(so, name); }
    // 가구 조각 — 캐릭터 앞에 다시 그릴 것
    for (const it of def.items) {
      const g0 = buildItem(it); g0.name = `${type}:${it.id}:${it.kind}`;
      const s = shoot(g0, origin);
      if (s) items.set(`${type}:${it.id}`, s);
    }
    modules[type] = ms;
  }

  // 캐릭터 조각 — 몸(색 × 옷 × 몸집 × 자세, 원기둥이라 방향 하나)과 머리(피부 × 사람 × 모자 × 방향). 기준점: 발 / 머리 가운데
  const chars = new Map<string, Shot>();
  const foot = new THREE.Vector3(0, 0, 0);
  for (const color of [...PALETTE, FOREIGN_COLOR]) for (const o of OUTFITS) for (const b of BUILD_LIST) for (const sit of [false, true]) {
    const s = shoot(buildBody(color, shapeKey(o, b), sit), foot);
    if (s) chars.set('b:' + bodyKey(color, shapeKey(o, b), sit), s);
  }
  // 머리 층 — 얼굴(피부) · 머리카락(모양 × 색) · 치장품(하나씩, 색 × 목의 것은 몸 굵기) · 모자, 모두 × 방향.
  // 보이지 않는 얼굴·몸을 함께 두어, 그 뒤로 돌아간 머리카락·넥타이·안경다리는 지운다. 그림 창은 그 층으로만 잡는다
  const headAt = new THREE.Vector3(0, HEAD_Y, 0);
  const layer = (key: string, part: THREE.Group, wide = false, face = true) => {
    const r = wide ? BUILDS.w.r : 1;
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.2 * r, 0.26 * r, BODY_H, 8), OCCLUDE);
    body.position.y = BODY_Y0 + BODY_H / 2;
    g.add(part, body);
    if (face) { const f = new THREE.Mesh(new THREE.SphereGeometry(0.238, 12, 10), OCCLUDE); f.position.y = HEAD_Y; g.add(f); }
    const s = shoot(g, headAt, part);
    if (s) chars.set('h:' + key, s);
  };
  for (let d = 0; d < DIRS; d++) {
    const rot = (d * 2 * Math.PI) / DIRS;
    for (const skin of SKINS) layer(faceKey(skin, d), buildFace(skin, rot), false, false);
    for (const hair of HAIRS) for (const hc of HAIR_COLORS) layer(hairKey(hair, hc, d), buildHair(hair, hc, rot));
    for (const acc of ACCS) {
      const colors = ACCENT_ACC.has(acc) ? ACCENTS : HAIR_ACC.has(acc) ? HAIR_COLORS : [0];
      for (const c of colors) for (const wide of WIDE_ACC.has(acc) ? [false, true] : [false]) layer(accKey(acc, c, wide, d), buildAcc(acc, c, wide, rot), wide);
    }
    layer(capKey(d), buildCap(rot));
  }

  // 공룡 조각 — 색 × (걷기 frame 셋 · 먹기 · 두리번) × 방향
  const dinos = new Map<string, Shot>();
  for (const color of DINO_COLORS) for (const [pose, frames] of [['walk', DINO_FRAMES], ['eat', 1], ['look', 1]] as [DinoPose, number][]) {
    for (let f = 0; f < frames; f++) for (let d = 0; d < DIRS; d++) {
      const s = shoot(buildDino({ rot: (d * 2 * Math.PI) / DIRS, frame: f, pose, color }), foot);
      if (s) dinos.set(dinoKey(color, pose, f, d), s);
    }
  }
  // 물고기·손님 — 물고기 6종과 손님(흰 가재·버제스 셰일) × 자세 둘 × 방향 (기준점은 원점 — 물고기는 몸 가운데, 기는 것은 발)
  for (let kind = 0; kind < FISH_KINDS; kind++) for (const frame of [0, 1] as const) for (let d = 0; d < DIRS; d++) {
    const s = shoot(buildFish({ kind, rot: (d * 2 * Math.PI) / DIRS, frame }), foot);
    if (s) dinos.set('fish:' + fishKey(kind, frame, d), s);
  }
  const dinoSheet = pack(dinos, 'dinos.webp', 1024);
  files['dinos.webp'] = dinoSheet.data;

  const itemSheet = pack(items, 'items.webp', 2048);
  const charSheet = pack(chars, 'characters.webp', 2048);
  for (const [k, r] of Object.entries(itemSheet.rects)) {
    const [type, id] = k.split(':');
    modules[type].items[id] = r;
  }
  files['items.webp'] = itemSheet.data;
  files['characters.webp'] = charSheet.data;
  const atlas: Atlas = {
    version: 2,
    scale: SCALE,
    right: right.toArray() as Atlas['right'],
    up: up.toArray() as Atlas['up'],
    modules,
    bodies: Object.fromEntries(Object.entries(charSheet.rects).filter(([k]) => k.startsWith('b:')).map(([k, v]) => [k.slice(2), v])),
    dinos: Object.fromEntries(Object.entries(dinoSheet.rects).filter(([k]) => !k.startsWith('fish:'))),
    fish: Object.fromEntries(Object.entries(dinoSheet.rects).filter(([k]) => k.startsWith('fish:')).map(([k, v]) => [k.slice(5), v])),
    heads: Object.fromEntries(Object.entries(charSheet.rects).filter(([k]) => k.startsWith('h:')).map(([k, v]) => [k.slice(2), v])),
  };
  return { atlas, files, lost: renderer.getContext().isContextLost() };
}

(window as any).__bake = bake;
(window as any).__ready = true;
