// 바깥 배경 미리보기 — atlas.json 의 right·up·scale 로 화면(Stage)과 같은 proj 를 만들어 drawBackdrop 을 부르고,
// 그 위에 최상층 바닥 판(세계 0..w × 0..d, y −0.5..0)과 실제 구운 앞 블록 바닥을 얹어 등각 각도가 맞는지 본다.
// ?day=0.3(없으면 지금 서울 시각), ?zoom=2, ?live(별 반짝임). window.__ready 가 서면 다 그린 것.
import { drawBackdrop, daylightAt } from '../src/iso/backdrop.ts';
import type { Atlas } from '../src/iso/atlas.ts';

type V3 = [number, number, number];
const world = { w: 35, d: 32 };
const q = new URLSearchParams(location.search);

(async () => {
  const atlas: Atlas = await (await fetch('sprites/atlas.json')).json();
  const S = atlas.scale, R = atlas.right, U = atlas.up;
  const proj = (p: V3): [number, number] => [
    (p[0] * R[0] + p[1] * R[1] + p[2] * R[2]) * S,
    -(p[0] * U[0] + p[1] * U[1] + p[2] * U[2]) * S,
  ];
  const canvas = document.getElementById('c') as HTMLCanvasElement;
  const ctx = canvas.getContext('2d')!;
  // 건물(최상층 판 + 아래 두 층 + 땅 둘레)이 다 들어오고 위로 하늘이 남게 맞춘다
  const pts: V3[] = [];
  for (const x of [0, world.w + 4]) for (const z of [0, world.d + 4]) for (const y of [0, -6.9]) pts.push([x, y, z]);
  const us = pts.map((p) => proj(p)[0]), vs = pts.map((p) => proj(p)[1]);
  const zoom = Number(q.get('zoom') ?? 1);
  const k = zoom * Math.min(canvas.width / (Math.max(...us) - Math.min(...us)), canvas.height / (Math.max(...vs) - Math.min(...vs) + 1500));
  const cxu = (Math.max(...us) + Math.min(...us)) / 2, cyv = (Math.max(...vs) + Math.min(...vs)) / 2 - 500 / zoom;
  const offX = canvas.width / 2 - cxu * k, offY = canvas.height / 2 - cyv * k;
  const view = { x0: -offX / k, y0: -offY / k, x1: (canvas.width - offX) / k, y1: (canvas.height - offY) / k };

  const front = atlas.modules.front?.floor;
  const img = new Image();
  if (front) { img.src = `sprites/${front.sheet}`; await new Promise((ok) => { img.onload = ok; img.onerror = ok; }); }
  const slider = document.getElementById('day') as HTMLInputElement, dv = document.getElementById('dv')!;
  slider.value = String(q.has('day') ? Number(q.get('day')) : daylightAt(new Date()));
  const poly = (ps: V3[], fill: string) => { ctx.beginPath(); ps.forEach((p, i) => { const [u, v] = proj(p); i ? ctx.lineTo(u, v) : ctx.moveTo(u, v); }); ctx.closePath(); ctx.fillStyle = fill; ctx.fill(); };
  const frame = (t: number) => {
    const day = Number(slider.value);
    dv.textContent = day.toFixed(2);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(k, 0, 0, k, offX, offY);
    drawBackdrop(ctx, proj, world, view, t / 1000, day);
    // 최상층 바닥 판 — 윗면과 앞·오른쪽 옆면(두께 0.5)
    const { w, d } = world;
    poly([[0, 0, d], [w, 0, d], [w, -0.5, d], [0, -0.5, d]], '#8f8c84');
    poly([[w, 0, 0], [w, 0, d], [w, -0.5, d], [w, -0.5, 0]], '#77746d');
    poly([[0, 0, 0], [w, 0, 0], [w, 0, d], [0, 0, d]], '#c9c6bb');
    // 실제 구운 앞 블록 바닥을 건물 앞쪽(z = d − 8)에 — 판의 모서리와 같은 각도로 놓이는지
    if (front && img.naturalWidth) {
      const [ax, ay] = proj([0, 0, d - 8]);
      ctx.drawImage(img, front.sx, front.sy, front.w, front.h, ax + front.ox, ay + front.oy, front.w, front.h);
    }
  };
  slider.oninput = () => frame(performance.now());
  frame(0);
  (window as any).__ready = true;
  if (q.has('live')) { const loop = (t: number) => { frame(t); requestAnimationFrame(loop); }; requestAnimationFrame(loop); }
})().catch((e) => { console.error('backdrop preview', e); (window as any).__ready = 'error'; });
