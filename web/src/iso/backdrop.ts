// 바깥 배경 — 하늘·먼 도시·이 건물의 아래 두 층(최상층에 연구실이 있는 3층 빌딩처럼)·땅. 화면만의 연출.
// Stage 가 캔버스를 지우고 setTransform(구운 픽셀 → 캔버스) 한 뒤, 모듈 바닥을 그리기 전에 부른다. 좌표는 모두 「구운 픽셀」.
// daylight(0 = 한밤, 1 = 한낮)로 하늘·도시·창 불빛을 연속으로 섞는다 — 실제 시각은 daylightAt(new Date()).
// 하늘·도시·건물 면은 캔버스 크기의 그림 하나에 그려 두고 화면 범위·변환·건물 크기·daylight(0.01 단위)가 바뀔 때만 다시 그린다. 별 반짝임만 매 프레임.
// 모양은 시드 난수로 정해 같은 화면이면 늘 같은 모양 — 도시·별·구름은 세계에 붙어 있어 옮기면 같이 움직인다.

type Proj = (p: [number, number, number]) => [number, number];
type Ctx2D = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
interface View { x0: number; y0: number; x1: number; y1: number }

const FLOOR_H = 3.2;          // 한 층 높이
const TOP = -0.5;             // 최상층 바닥 판 아래 — 그 밑으로 두 층
const GROUND = TOP - 2 * FLOOR_H;   // 땅 (−6.9)
const BAY = 1.6;              // 창 간격 (기둥 포함)

// 결정적 난수 — 정수 몇 개를 섞어 0~1
function hash(...n: number[]): number {
  let h = 0x9e3779b9;
  for (const v of n) { h = Math.imul(h ^ (v | 0), 0x85ebca6b); h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35); h ^= h >>> 16; }
  return (h >>> 0) / 4294967296;
}

const smooth = (t: number) => { const x = Math.min(1, Math.max(0, t)); return x * x * (3 - 2 * x); };

// 실제 시각(서울, UTC+9) → daylight. 계절은 무시하고 해 뜨는 것은 6시, 지는 것은 18시 — 앞뒤 1시간에 걸쳐 부드럽게
export function daylightAt(date: Date): number {
  const h = (date.getUTCHours() + 9) % 24 + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600;
  return smooth((h - 5) / 2) * (1 - smooth((h - 17) / 2));
}

// 색 섞기 — '#rrggbb' 둘을 t 로 (0 = a, 1 = b)
function mix(a: string, b: string, t: number): string {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
  const ch = (s: number) => Math.round(((pa >> s) & 255) * (1 - t) + ((pb >> s) & 255) * t);
  return `rgb(${ch(16)}, ${ch(8)}, ${ch(0)})`;
}
const hexOf = (rgb: string) => '#' + rgb.slice(4, -1).split(',').map((v) => Number(v).toString(16).padStart(2, '0')).join('');

const reduced = (() => {
  try { return matchMedia('(prefers-reduced-motion: reduce)'); } catch { return null; }
})();

let cache: { key: string; canvas: HTMLCanvasElement | OffscreenCanvas } | null = null;

function makeCanvas(w: number, h: number): HTMLCanvasElement | OffscreenCanvas {
  if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(w, h);
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

function quad(ctx: Ctx2D, proj: Proj, pts: [number, number, number][], fill: string): void {
  ctx.beginPath();
  pts.forEach((p, i) => { const [u, v] = proj(p); i ? ctx.lineTo(u, v) : ctx.moveTo(u, v); });
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
}

// 지평선 — 땅 높이의 건물 뒤 모서리. 건물 양옆으로 먼 도시가 보이고, 그 아래는 땅
const horizonOf = (proj: Proj) => proj([0, GROUND, 0])[1];

function drawStatic(ctx: Ctx2D, proj: Proj, world: { w: number; d: number }, view: View, S: number, day: number): void {
  const { x0, y0, x1, y1 } = view;
  const hv = horizonOf(proj);
  const night = 1 - day;
  const dusk = 1 - Math.abs(2 * day - 1);                 // 해 뜰 때·질 때 1, 한낮·한밤 0
  // 1. 하늘 — 밤 남색 ↔ 낮 하늘색, 지평선 쪽은 해 질 녘 주황빛
  const sky = ctx.createLinearGradient(0, Math.min(y0, hv - 2000), 0, hv);
  sky.addColorStop(0, mix('#0b1222', '#3f86d2', day));
  sky.addColorStop(0.6, mix(hexOf(mix('#141d3a', '#7ab6ea', day)), '#c78aa0', dusk * 0.35));
  sky.addColorStop(1, mix(hexOf(mix('#2e2f5e', '#d4ebf8', day)), '#f59e6b', dusk * 0.7));
  ctx.fillStyle = sky;
  ctx.fillRect(x0, y0, x1 - x0, Math.max(0, hv - y0));
  // 구름 — 세계에 붙은 칸(1400 구운 픽셀)마다 하나 이하. 낮에 하얗고 밤엔 하늘에 묻힌다
  const CL = 1400;
  ctx.globalAlpha = 0.12 + 0.5 * day;
  for (let i = Math.floor(x0 / CL) - 1; i <= Math.ceil(x1 / CL); i++) {
    for (let j = Math.floor(y0 / CL) - 1; j <= Math.floor((hv - 600) / CL); j++) {
      if (hash(21, i, j) > 0.45) continue;
      const cx = (i + hash(22, i, j)) * CL, cy = Math.min(hv - 500, (j + hash(23, i, j)) * CL);
      const r = (2.2 + hash(24, i, j) * 2.5) * S;
      ctx.fillStyle = hexOf(mix(hexOf(mix('#2a3355', '#ffffff', day)), '#f7c6a3', dusk * 0.5));
      for (let k = 0; k < 4; k++) {
        ctx.beginPath();
        ctx.ellipse(cx + (k - 1.5) * r * 0.7, cy - (k % 2) * r * 0.25, r * (0.7 + 0.3 * hash(25, i, j, k)), r * 0.35, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  ctx.globalAlpha = 1;
  // 땅 — 지평선 아래 (도시보다 먼저 — 도시 밑동이 땅에 묻힌다)
  const ground = ctx.createLinearGradient(0, hv, 0, Math.max(y1, hv + 1));
  ground.addColorStop(0, mix('#121833', '#8da38c', day));
  ground.addColorStop(1, mix('#0a0f1f', '#6c8569', day));
  ctx.fillStyle = ground;
  ctx.fillRect(x0, hv, x1 - x0, Math.max(0, y1 - hv));
  // 2. 먼 도시 — 세 겹, 먼 것일수록 낮고 옅게(낮엔 안개처럼 하늘색에 가깝게). 칸(step) 마다 빌딩 하나
  const layers = [
    { step: 1.9, hMax: 7, night: '#262c54', day: '#a9bfd6', lit: 0 },
    { step: 2.6, hMax: 10, night: '#1d2246', day: '#8ea6c1', lit: 0.05 },
    { step: 3.4, hMax: 13, night: '#151a36', day: '#71879f', lit: 0.09 },
  ];
  layers.forEach((L, li) => {
    const step = L.step * S, base = hv + li * 0.25 * S;
    const body = mix(L.night, L.day, day), lit = L.lit * (0.15 + 0.85 * night * night);
    for (let k = Math.floor(x0 / step) - 1; k <= Math.ceil(x1 / step) + 1; k++) {
      const r = hash(li, k);
      const bw = step * (0.55 + 0.4 * hash(li, k, 1));
      const bh = (L.hMax * (0.25 + 0.75 * r)) * S * 0.5;
      const bx = k * step + (step - bw) * hash(li, k, 2);
      ctx.fillStyle = body;
      ctx.fillRect(bx, base - bh, bw, bh + 1);
      if (hash(li, k, 3) < 0.25) ctx.fillRect(bx + bw * 0.4, base - bh - 0.6 * S, Math.max(2, bw * 0.06), 0.6 * S);   // 안테나
      if (!lit) continue;
      // 창 불빛 점 — 밤에 많이, 낮엔 거의 없다
      const cols = Math.max(1, Math.floor(bw / (0.45 * S))), rows = Math.max(1, Math.floor(bh / (0.6 * S)));
      for (let i = 0; i < cols; i++) for (let j = 1; j < rows; j++) {
        if (hash(li, k, i, j) > lit) continue;
        ctx.fillStyle = hash(li, k, i, j, 9) < 0.7 ? `rgba(252, 211, 77, ${0.25 + 0.5 * night})` : `rgba(186, 230, 253, ${0.2 + 0.4 * night})`;
        ctx.fillRect(bx + (i + 0.35) * (bw / cols), base - bh + j * 0.6 * S, 0.12 * S, 0.16 * S);
      }
    }
  });

  const { w, d } = world;
  // 땅 위 — 건물 둘레의 보도와 잔디 (앞면·오른쪽 면 쪽). 잔디가 바깥, 보도가 건물에 붙는다
  const grass = mix('#17321f', '#5a944f', day), walk = mix('#3a4258', '#c2c1b8', day);
  quad(ctx, proj, [[0, GROUND, d], [w + 4, GROUND, d], [w + 4, GROUND, d + 4], [0, GROUND, d + 4]], grass);
  quad(ctx, proj, [[w, GROUND, 0], [w + 4, GROUND, 0], [w + 4, GROUND, d + 4], [w, GROUND, d + 4]], grass);
  quad(ctx, proj, [[0, GROUND, d], [w + 1.6, GROUND, d], [w + 1.6, GROUND, d + 1.6], [0, GROUND, d + 1.6]], walk);
  quad(ctx, proj, [[w, GROUND, 0], [w + 1.6, GROUND, 0], [w + 1.6, GROUND, d + 1.6], [w, GROUND, d + 1.6]], walk);

  // 3. 이 건물의 아래 두 층 — 앞면(z=d)과 오른쪽 면(x=w). 오른쪽 면은 조금 어둡게
  const lamp = '#f2c14e';
  const faces = [
    { len: w, at: (s: number, y: number): [number, number, number] => [s, y, d],
      wall: mix('#2b3554', '#cdd1da', day), band: mix('#3b4669', '#e6e8ee', day), glass: hexOf(mix('#18213b', '#76a3cb', day)), shade: 1 },
    { len: d, at: (s: number, y: number): [number, number, number] => [w, y, d - s],
      wall: mix('#222b47', '#a9afbc', day), band: mix('#313b5b', '#c7ccd5', day), glass: hexOf(mix('#141c33', '#5e89b0', day)), shade: 0.88 },
  ];
  // 아래층 지붕 — 맨 위층은 ㄱ자라(테라스 오른쪽, 화장실·창고 앞은 바닥이 없다) 그 자리로 땅이 비쳐 건물이 비어 보였다
  // (사용자: 「창고 밑이 비어 보인다」). 지붕 판을 깔고 앞·오른쪽 가장자리에 낮은 난간 턱을 둔다 — 위층 바닥이 덮는 곳은 가려진다
  const roof = mix('#2a3147', '#9a9d9f', day), curb = mix('#323a55', '#b9bcc2', day);
  quad(ctx, proj, [[0, TOP, 0], [w, TOP, 0], [w, TOP, d], [0, TOP, d]], roof);
  quad(ctx, proj, [[0, TOP + 0.3, d], [w, TOP + 0.3, d], [w, TOP, d], [0, TOP, d]], curb);
  quad(ctx, proj, [[w, TOP + 0.3, 0], [w, TOP + 0.3, d], [w, TOP, d], [w, TOP, 0]], curb);
  faces.forEach((F, fi) => {
    quad(ctx, proj, [F.at(0, TOP), F.at(F.len, TOP), F.at(F.len, GROUND), F.at(0, GROUND)], F.wall);
    for (let fl = 0; fl < 2; fl++) {
      const yTop = TOP - fl * FLOOR_H;
      // 층 사이 띠 (층 위쪽 0.35)
      quad(ctx, proj, [F.at(0, yTop), F.at(F.len, yTop), F.at(F.len, yTop - 0.35), F.at(0, yTop - 0.35)], F.band);
      // 창 — 층마다 한 줄, 창 사이 기둥. 불 켜진 창은 밤에 많고(약 55%), 낮엔 몇 개만 흐리게
      const n = Math.floor(F.len / BAY), pad = (F.len - n * BAY) / 2;
      const wy0 = yTop - 0.85, wy1 = yTop - 2.55;
      const litShare = 0.08 + 0.47 * night * night;
      for (let i = 0; i < n; i++) {
        const s0 = pad + i * BAY + 0.22, s1 = pad + (i + 1) * BAY - 0.22;
        const lit = hash(7, fi, fl, i) < litShare;
        const glow = lit ? mix(F.glass, hexOf(mix('#000000', lamp, F.shade)), 0.25 + 0.75 * night) : F.glass;
        quad(ctx, proj, [F.at(s0, wy0), F.at(s1, wy0), F.at(s1, wy1), F.at(s0, wy1)], glow);
        if (lit && night > 0.3) {
          quad(ctx, proj, [F.at(s0, wy0), F.at(s1, wy0), F.at(s1, wy0 - 0.35), F.at(s0, wy0 - 0.35)], `rgba(253, 224, 140, ${0.6 * night})`);   // 위쪽 밝게
        } else {
          // 유리 반사 — 낮일수록 또렷하게
          quad(ctx, proj, [F.at(s0, wy0), F.at(s0 + (s1 - s0) * 0.35, wy0), F.at(s0 + (s1 - s0) * 0.15, wy1), F.at(s0, wy1)], `rgba(255, 255, 255, ${0.06 + 0.3 * day})`);
        }
      }
    }
    // 바닥 줄 — 땅과 닿는 곳
    quad(ctx, proj, [F.at(0, GROUND + 0.25), F.at(F.len, GROUND + 0.25), F.at(F.len, GROUND), F.at(0, GROUND)], mix('#1a2038', '#8b909b', day));
  });
  // 1층 입구 — 앞면 가운데쯤 유리문과 차양. 밤엔 불빛, 낮엔 유리
  const ex = Math.min(w - 2, Math.max(2, w * 0.62));
  quad(ctx, proj, [[ex - 1.2, GROUND + 2.4, d], [ex + 1.2, GROUND + 2.4, d], [ex + 1.2, GROUND, d], [ex - 1.2, GROUND, d]], mix('#7fa9cf', lamp, 0.3 + 0.7 * night));
  quad(ctx, proj, [[ex - 1.5, GROUND + 2.75, d], [ex + 1.5, GROUND + 2.75, d], [ex + 1.5, GROUND + 2.75, d + 0.9], [ex - 1.5, GROUND + 2.75, d + 0.9]], mix('#475073', '#5d6b8f', day));

  // 가로수 — 보도 바깥 잔디에, 뒤(위쪽 화면)에서 앞으로 그린다
  const trees: [number, number][] = [];
  for (let x = 2; x < w + 2; x += 4.2) trees.push([x, d + 2.6]);
  for (let z = 2; z < d; z += 4.2) trees.push([w + 2.6, z]);
  trees.sort((a, b) => (a[0] + a[1]) - (b[0] + b[1]));
  const trunk = mix('#2a1f1a', '#6b4f3a', day), leaf = mix('#163a26', '#3f7d43', day), leafHi = mix('#1f4d33', '#62a35a', day);
  for (const [x, z] of trees) {
    if (Math.abs(x - ex) < 2.2 && z > d) continue;   // 입구 앞은 비운다
    const [bx, by] = proj([x, GROUND, z]);
    const [cx, cy] = proj([x, GROUND + 2.2, z]);
    ctx.fillStyle = trunk;
    ctx.fillRect(bx - 0.08 * S, cy, 0.16 * S, by - cy);
    const r = (0.8 + 0.25 * hash(3, x * 10, z * 10)) * S;
    ctx.fillStyle = leaf;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = leafHi;
    ctx.beginPath(); ctx.arc(cx - r * 0.25, cy - r * 0.3, r * 0.6, 0, Math.PI * 2); ctx.fill();
  }
}

// 별 — 세계에 붙은 칸(260 구운 픽셀)마다 하나 이하, 지평선 위에만. t 로 아주 천천히 반짝, 낮이 될수록 사라진다
function drawStars(ctx: CanvasRenderingContext2D, proj: Proj, view: View, t: number, day: number): void {
  const fade = (1 - smooth(day / 0.6));
  if (fade <= 0.01) return;
  const hv = horizonOf(proj) - 120;
  const C = 260, still = !!reduced?.matches;
  for (let i = Math.floor(view.x0 / C); i <= Math.floor(view.x1 / C); i++) {
    for (let j = Math.floor(view.y0 / C); j <= Math.floor(Math.min(view.y1, hv) / C); j++) {
      if (hash(11, i, j) > 0.55) continue;
      const x = (i + hash(12, i, j)) * C, y = (j + hash(13, i, j)) * C;
      if (y > hv) continue;
      const tw = still ? 0.75 : 0.55 + 0.45 * Math.sin(t * (0.25 + hash(14, i, j) * 0.5) + hash(15, i, j) * 6.28);
      const r = 1.6 + hash(16, i, j) * 2.4;
      ctx.globalAlpha = fade * tw * (0.5 + 0.5 * Math.min(1, (hv - y) / 1200));
      ctx.fillStyle = hash(17, i, j) < 0.8 ? '#e2e8f0' : '#bae6fd';
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
}

export function drawBackdrop(ctx: CanvasRenderingContext2D, proj: (p: [number, number, number]) => [number, number],
  world: { w: number; d: number }, view: { x0: number; y0: number; x1: number; y1: number }, t: number, daylight: number): void {
  const day = Math.min(1, Math.max(0, daylight));
  const m = ctx.getTransform();
  const cw = ctx.canvas.width, ch = ctx.canvas.height;
  // 세계 1 의 구운 픽셀 길이 — proj 로 잰다: (1,0,0) 과 (0,0,1) 은 화면에서 가로로 √2·S 떨어진다
  const [ax, ay] = proj([0, 0, 0]), [bx, by] = proj([1, 0, 0]), [cx, cy] = proj([0, 0, 1]);
  const S = Math.hypot(bx - cx, by - cy) / Math.SQRT2 || 96;
  const key = [m.a, m.b, m.c, m.d, Math.round(m.e), Math.round(m.f), cw, ch, world.w, world.d, ax, ay,
    Math.round(view.x0), Math.round(view.y0), Math.round(view.x1), Math.round(view.y1), Math.round(day * 100)].join(',');
  if (!cache || cache.key !== key) {
    const canvas = cache && cache.canvas.width === cw && cache.canvas.height === ch ? cache.canvas : makeCanvas(cw, ch);
    const c = canvas.getContext('2d') as Ctx2D;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, cw, ch);
    c.setTransform(m);
    drawStatic(c, proj, world, view, S, Math.round(day * 100) / 100);
    cache = { key, canvas };
  }
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.drawImage(cache.canvas as CanvasImageSource, 0, 0);
  ctx.restore();
  drawStars(ctx, proj, view, t, day);
}
