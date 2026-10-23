// 소품 미리보기 — scene/props.ts 의 모형을 굽기와 같은 시점(정사영, 같은 조명)으로 하나씩 그린다.
// tools/props-gallery.ts 가 chromium 으로 이 페이지를 열고 window.__shoot() 의 결과를 docs/props/ 에 쓴다.
// swiftshader 는 렌더마다 그림자 빛을 새로 만들면 CONTEXT_LOST 가 난다 — 씬·빛·렌더러는 하나, 물체만 넣었다 뺀다.
import * as THREE from 'three';
import { PROPS } from '../src/scene/props.ts';

const SCALE = 96;                                      // bake/main.ts 와 같은 밀도 — 소품끼리 크기를 견줄 수 있다
const VIEW = new THREE.Vector3(18, 16.5, 18);          // bake/main.ts 의 VIEW
const PAD = 6;

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

// 빛은 bake/main.ts 의 lights() 와 같은 세기·방향 (방 가운데 대신 원점 기준)
const scene = new THREE.Scene();
scene.add(new THREE.HemisphereLight(0xffffff, 0xb4b2a9, 0.75 * Math.PI));
const sun = new THREE.DirectionalLight(0xffffff, 0.7 * Math.PI);
sun.position.set(10, 18, 6);
sun.target.position.set(0, 0, 0);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.bias = -0.0008;
Object.assign(sun.shadow.camera, { left: -4, right: 4, top: 4, bottom: -4, near: 1, far: 50 });
scene.add(sun, sun.target);

// 바닥 — 그림자를 받고, 바닥 범위(size)를 옅게 보인다
const floor = new THREE.Mesh(new THREE.PlaneGeometry(12, 12), new THREE.MeshLambertMaterial({ color: 0xe8e6df }));
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);
const foot = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ color: 0xd3d1c7 }));
foot.rotation.x = -Math.PI / 2;
foot.position.y = 0.002;
scene.add(foot);

function shoot(obj: THREE.Object3D, size: [number, number]): HTMLCanvasElement {
  foot.scale.set(size[0], size[1], 1);
  scene.add(obj);
  obj.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(obj).union(new THREE.Box3(
    new THREE.Vector3(-size[0] / 2, 0, -size[1] / 2), new THREE.Vector3(size[0] / 2, 0, size[1] / 2)));
  let u0 = Infinity, u1 = -Infinity, v0 = Infinity, v1 = -Infinity;
  for (let i = 0; i < 8; i++) {
    const p = new THREE.Vector3(i & 1 ? box.max.x : box.min.x, i & 2 ? box.max.y : box.min.y, i & 4 ? box.max.z : box.min.z);
    const u = p.dot(right) * SCALE, v = -p.dot(up) * SCALE;
    u0 = Math.min(u0, u); u1 = Math.max(u1, u); v0 = Math.min(v0, v); v1 = Math.max(v1, v);
  }
  u0 = Math.floor(u0) - PAD; v0 = Math.floor(v0) - PAD; u1 = Math.ceil(u1) + PAD; v1 = Math.ceil(v1) + PAD;
  const w = u1 - u0, h = v1 - v0;
  renderer.setSize(w, h, false);
  cam.position.copy(VIEW);
  cam.lookAt(0, 0, 0);
  Object.assign(cam, { left: u0 / SCALE, right: u1 / SCALE, top: -v0 / SCALE, bottom: -v1 / SCALE });
  cam.updateProjectionMatrix();
  renderer.render(scene, cam);
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  c.getContext('2d')!.drawImage(renderer.domElement, 0, 0);
  scene.remove(obj);
  obj.traverse((o) => { if (o instanceof THREE.Mesh) o.geometry.dispose(); });
  return c;
}

// 한 장 모음 — 같은 크기 칸에 바닥을 맞춰 놓고 아래에 이름
function gallery(shots: [string, HTMLCanvasElement][]): HTMLCanvasElement {
  const COLS = 5, LABEL = 44;
  const cw = Math.max(220, ...shots.map(([, c]) => c.width)) + 16;
  const ch = Math.max(...shots.map(([, c]) => c.height)) + LABEL + 8;
  const rows = Math.ceil(shots.length / COLS);
  const out = document.createElement('canvas');
  out.width = cw * COLS; out.height = ch * rows;
  const ctx = out.getContext('2d')!;
  ctx.fillStyle = '#f1efe8';
  ctx.fillRect(0, 0, out.width, out.height);
  shots.forEach(([name, c], i) => {
    const x = (i % COLS) * cw, y = Math.floor(i / COLS) * ch;
    ctx.strokeStyle = '#d3d1c7';
    ctx.strokeRect(x + 0.5, y + 0.5, cw - 1, ch - 1);
    ctx.drawImage(c, x + (cw - c.width) / 2, y + ch - LABEL - c.height);
    const p = PROPS[name];
    ctx.fillStyle = '#2c2c2a';
    ctx.textAlign = 'center';
    ctx.font = 'bold 16px "Noto Sans CJK KR", "Noto Serif CJK KR", sans-serif';
    ctx.fillText(p.label, x + cw / 2, y + ch - LABEL + 18);
    ctx.font = '13px monospace';
    ctx.fillStyle = '#5f5e5a';
    ctx.fillText(`${name}  ${p.size[0]}×${p.size[1]}`, x + cw / 2, y + ch - LABEL + 36);
  });
  return out;
}

async function shootAll() {
  const shots: [string, HTMLCanvasElement][] = [];
  for (const [name, p] of Object.entries(PROPS)) shots.push([name, shoot(p.build(0, 0), p.size)]);
  const files: Record<string, string> = {};
  for (const [name, c] of shots) files[`${name}.png`] = c.toDataURL('image/png');
  files['gallery.png'] = gallery(shots).toDataURL('image/png');
  return { files, lost: renderer.getContext().isContextLost() };
}

(window as any).__shoot = shootAll;
(window as any).__ready = true;
