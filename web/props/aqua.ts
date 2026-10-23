// 수족관 미리보기 — scene/aquarium.ts 의 방 한 장(물고기를 띄워서)과 물고기 종류별 사진. props/main.ts 와 같은 시점·조명.
// tools/aqua-gallery.ts 가 chromium 으로 이 페이지를 열고 window.__shoot() 의 결과를 docs/props/ 에 쓴다.
import * as THREE from 'three';
import { aquariumModule, buildAquaItem, buildFish, TANKS, FISH_KINDS, FISH_NAMES, AQUA_VIEW } from '../src/scene/aquarium.ts';
import { buildItem, buildBody } from '../src/scene/models.ts';
import { FishTank } from '../src/iso/fish.ts';

const VIEW = new THREE.Vector3(18, 16.5, 18);
const PAD = 8;

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.setClearColor(0x000000, 0);

const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 200);
const scene = new THREE.Scene();
scene.add(new THREE.HemisphereLight(0xffffff, 0xb4b2a9, 0.75 * Math.PI));
const sun = new THREE.DirectionalLight(0xffffff, 0.7 * Math.PI);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.bias = -0.0008;
scene.add(sun, sun.target);

function shoot(obj: THREE.Object3D, centre: THREE.Vector3, scale: number, reach: number): HTMLCanvasElement {
  sun.position.copy(centre).add(new THREE.Vector3(10, 18, 6));
  sun.target.position.copy(centre);
  Object.assign(sun.shadow.camera, { left: -reach, right: reach, top: reach, bottom: -reach, near: 1, far: 60 });
  sun.shadow.camera.updateProjectionMatrix();
  scene.add(obj);
  obj.updateMatrixWorld(true);
  cam.position.copy(centre).add(VIEW);
  cam.lookAt(centre);
  cam.updateMatrixWorld();
  const right = new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 0);
  const up = new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 1);
  const box = new THREE.Box3().setFromObject(obj);
  let u0 = Infinity, u1 = -Infinity, v0 = Infinity, v1 = -Infinity;
  for (let i = 0; i < 8; i++) {
    const p = new THREE.Vector3(i & 1 ? box.max.x : box.min.x, i & 2 ? box.max.y : box.min.y, i & 4 ? box.max.z : box.min.z).sub(centre);
    const u = p.dot(right) * scale, v = -p.dot(up) * scale;
    u0 = Math.min(u0, u); u1 = Math.max(u1, u); v0 = Math.min(v0, v); v1 = Math.max(v1, v);
  }
  u0 = Math.floor(u0) - PAD; v0 = Math.floor(v0) - PAD; u1 = Math.ceil(u1) + PAD; v1 = Math.ceil(v1) + PAD;
  renderer.setSize(u1 - u0, v1 - v0, false);
  Object.assign(cam, { left: u0 / scale, right: u1 / scale, top: -v0 / scale, bottom: -v1 / scale });
  cam.updateProjectionMatrix();
  renderer.render(scene, cam);
  const c = document.createElement('canvas');
  c.width = u1 - u0; c.height = v1 - v0;
  c.getContext('2d')!.drawImage(renderer.domElement, 0, 0);
  scene.remove(obj);
  return c;
}

// 방 한 장 — 바닥, 가구(새 갈래는 buildAquaItem, 칸막이 등은 models.ts), 물고기(20초 헤엄친 뒤), 관람 자리에 사람 몇
function room(): THREE.Group {
  const m = aquariumModule();
  const g = new THREE.Group();
  for (const f of m.floors) {
    const [x0, z0, x1, z1] = f.rect;
    const fl = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, 0.5, z1 - z0), new THREE.MeshLambertMaterial({ color: f.color }));
    fl.position.set((x0 + x1) / 2, -0.25 + (f.rect[0] > 0 ? 0.003 : 0), (z0 + z1) / 2);
    fl.receiveShadow = true;
    g.add(fl);
  }
  for (const it of m.items) g.add(buildAquaItem(it) ?? buildItem(it));
  const tank = new FishTank(TANKS);
  for (let i = 0; i < 600; i++) tank.step(1 / 30);
  for (const f of tank.fish) {
    const fish = buildFish({ kind: f.kind, rot: f.rot, frame: f.frame });
    fish.position.set(f.x, f.y, f.z);
    g.add(fish);
  }
  [AQUA_VIEW[0], AQUA_VIEW[3], AQUA_VIEW[5], AQUA_VIEW[8]].forEach((v, i) => {
    const b = buildBody([0xd85a30, 0x378add, 0x1d9e75, 0x7f77dd][i], i % 2 ? 'dress' : 'suit', v.pose === 'sit');
    b.position.set(v.at[0], v.lift ?? 0, v.at[1]);
    b.rotation.y = v.face;
    g.add(b);
  });
  return g;
}

function label(c: HTMLCanvasElement, text: string): HTMLCanvasElement {
  const out = document.createElement('canvas');
  out.width = Math.max(c.width, 200); out.height = c.height + 34;
  const ctx = out.getContext('2d')!;
  ctx.fillStyle = '#f1efe8';
  ctx.fillRect(0, 0, out.width, out.height);
  ctx.drawImage(c, (out.width - c.width) / 2, 0);
  ctx.fillStyle = '#2c2c2a';
  ctx.textAlign = 'center';
  ctx.font = 'bold 16px "Noto Sans CJK KR", "Noto Serif CJK KR", sans-serif';
  ctx.fillText(text, out.width / 2, out.height - 12);
  return out;
}

async function shootAll() {
  const files: Record<string, string> = {};
  files['aquarium-room.png'] = shoot(room(), new THREE.Vector3(5, 0.5, 3), 96, 9).toDataURL('image/png');
  // 물고기 — 실제 크기는 0.15~0.3 이라 크게(밀도 6배), 꼬리 자세 둘을 나란히
  const fish: HTMLCanvasElement[] = [];
  for (let k = 0; k < FISH_KINDS; k++) {
    const pair = new THREE.Group();
    for (const frame of [0, 1] as const) {
      const f = buildFish({ kind: k, rot: Math.PI / 2, frame });
      f.position.set(0, 0, frame * 0.45 - 0.22);
      pair.add(f);
    }
    const c = label(shoot(pair, new THREE.Vector3(0, 0, 0), 576, 1), `${k} ${FISH_NAMES[k]}`);
    files[`aquarium-fish-${k}.png`] = c.toDataURL('image/png');
    fish.push(c);
  }
  const W = Math.max(...fish.map((c) => c.width)), H = Math.max(...fish.map((c) => c.height));
  const all = document.createElement('canvas');
  all.width = W * 3; all.height = H * Math.ceil(fish.length / 3);
  const ctx = all.getContext('2d')!;
  ctx.fillStyle = '#f1efe8';
  ctx.fillRect(0, 0, all.width, all.height);
  fish.forEach((c, i) => ctx.drawImage(c, (i % 3) * W + (W - c.width) / 2, Math.floor(i / 3) * H));
  files['aquarium-fish.png'] = all.toDataURL('image/png');
  return { files, lost: renderer.getContext().isContextLost() };
}

(window as any).__shoot = shootAll;
(window as any).__ready = true;
