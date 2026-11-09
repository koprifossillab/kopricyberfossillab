// 2.5D 화면 — 구운 그림(sprites/)을 Canvas 2D 로 붙인다. three 를 싣지 않는다.
// 그리는 차례: 모든 모듈의 바닥 층 → 모든 모듈의 물건 층(뒤에서부터) → 벽 tmux 모니터·책상 모니터 빛
//            → [캐릭터 + 그 앞을 가리는 가구] 깊이 차례 → 이름표·말풍선(HTML)
import { useEffect, useMemo, useRef } from 'react';
import type { Agent, Office } from '../types.ts';
import { bodyKey, headLayers, dinoKey, fishKey, scorpionKey, cactusKey, parrotKey, foodKey, loadAtlas, type SpriteRect } from './atlas.ts';
import { appearanceOf, liftOf, shapeOf } from '../scene/appearance.ts';
import { FishTank } from './fish.ts';
import { daylight, hourNow } from './daylight.ts';
import { drawBackdrop } from './backdrop.ts';
import { DinoPen } from './dinos.ts';
import { Desert } from './desert.ts';
import { Garden } from './garden.ts';
import { Aviary } from './parrots.ts';
import { SCORPION_STARTLE, CACTUS_STARTLE, DINO_NEAR, DINO_FERN, PARROT_SWOOP, PARROT_TALK, PARROT_REPLY } from './lines.ts';
import { MODULES } from '../scene/modules.ts';
import type { Rect } from '../scene/layout.ts';
import { Cast, sitting, dirOf, type Actor } from './cast.ts';
import { SCREEN, PHOSPHOR, STATE_TEXT, HEAD_Y, SIT_LIFT, screenQuad } from '../scene/layout.ts';
import { buildWorld, heightAt, themeOf, type World, type WorldItem } from '../scene/world.ts';
import { mealOf, SHOP_NAME } from '../scene/meals.ts';
import { Chatter, draw as drawLine, fill } from './chatter.ts';
import { personName, roomName } from '../scene/names.ts';

const RM = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
type V3 = [number, number, number];

const hex = (c: number) => '#' + c.toString(16).padStart(6, '0');
const PLAQUE_W = 76, PLAQUE_FS = 9;   // 명판 폭·글자 (styles.css .plaque 와 같게) — 그린 뒤 문틀 폭에 맞춰 scale
const DOOR_SPAN = 1.4;                 // 명판에 span 이 없을 때 (가게·고객센터…) 문틀 가로폭
// 말풍선 위 이름 — 점원·바깥 손님(세션이 아니다)은 「버거집 점원」·「손님」 (wetherilli 026)
const nameOf = (a: Actor) => a.npc ? (a.npc.role === 'clerk' ? `${SHOP_NAME[a.npc.shop].split(' ')[0]} 점원` : '손님') : personName(a.agent);

// 등각 차례 — 바닥 범위가 겹치지 않는 두 상자에서, A 가 B 의 완전히 왼쪽(x)이나 완전히 뒤(z)에 있으면 A 를 먼저 그린다.
// 카메라가 +x·+z 쪽에서 내려다보므로 x+z 하나로는 긴 상자(칸막이·벽)끼리 틀린다 — 그래서 쌍으로 비교해 위상 정렬한다
const behind = (a: Rect, b: Rect) => a[2] <= b[0] + 1e-6 || a[3] <= b[1] + 1e-6;
function isoOrder<T>(list: T[], rect: (t: T) => Rect): T[] {
  const n = list.length, rs = list.map(rect);
  const indeg = new Array(n).fill(0), next: number[][] = rs.map(() => []);
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    if (i !== j && behind(rs[i], rs[j]) && !behind(rs[j], rs[i])) { next[i].push(j); indeg[j]++; }
  }
  const key = (i: number) => rs[i][0] + rs[i][1];
  const ready = [...Array(n).keys()].filter((i) => !indeg[i]);
  const out: T[] = [];
  const done = new Set<number>();
  while (ready.length) {
    ready.sort((a, b) => key(b) - key(a));          // 뒤(작은 x+z)부터
    const i = ready.pop()!;
    out.push(list[i]); done.add(i);
    for (const j of next[i]) if (!--indeg[j]) ready.push(j);
  }
  for (let i = 0; i < n; i++) if (!done.has(i)) out.push(list[i]);   // 고리가 생기면 남은 것은 뒤에
  return out;
}
// 모듈의 바닥 범위 (벽 모듈은 두께만큼)
function moduleRect(m: World['modules'][number]): Rect {
  const [w, d] = MODULES[m.type].size;
  const [x, z] = m.at;
  return [x - (w ? 0 : 0.25), z - (d ? 0 : 0.25), x + (w || 0), z + (d || 0)];
}

export function Stage({ agents, offices, selected, onSelect }: {
  agents: Agent[]; offices: Office[]; selected: string | null; onSelect: (id: string | null) => void;
}) {
  const box = useRef<HTMLDivElement>(null!);
  const canvas = useRef<HTMLCanvasElement>(null!);
  const back = useRef<HTMLCanvasElement>(null!);   // 바깥 배경(하늘·먼 도시·아래 두 층) — 밤 덮개가 닿지 않게 따로
  const labels = useRef<HTMLDivElement>(null!);
  const cast = useRef(new Cast());
  const key = offices.map((o) => `${o.name}:${o.size}`).join('\n');
  const world = useMemo(() => buildWorld(offices), [key]);   // eslint-disable-line react-hooks/exhaustive-deps
  const props = useRef({ selected, onSelect, world });
  props.current = { selected, onSelect, world };

  useEffect(() => {
    cast.current.update(world, agents);
    // 자료가 그대로여도 2초마다 다시 정한다 — 화장실 다녀오기처럼 시간으로 바뀌는 자리
    const h = setInterval(() => cast.current.update(world, agents), 2000);
    return () => clearInterval(h);
  }, [world, agents]);

  useEffect(() => {
    let stop = false;
    let raf = 0;
    const view = { zoom: 1, panX: 0, panY: 0 };
    let hits: { id: string; x0: number; y0: number; x1: number; y1: number }[] = [];
    const labelEls = new Map<string, HTMLDivElement>();
    const chatter = new Chatter();
    let cleanup = () => {};

    loadAtlas().then(({ atlas, sheets }) => {
      if (stop) return;
      const S = atlas.scale, R = atlas.right, U = atlas.up;
      const proj = (p: V3): [number, number] => [
        (p[0] * R[0] + p[1] * R[1] + p[2] * R[2]) * S,
        -(p[0] * U[0] + p[1] * U[1] + p[2] * U[2]) * S,
      ];
      const ctx = canvas.current.getContext('2d')!;
      const bctx = back.current.getContext('2d')!;
      let k = 1, offX = 0, offY = 0, dpr = 1;   // 구운 픽셀 → 캔버스 픽셀
      let fitted: World | null = null;
      let orderFor: World | null = null;
      let order: number[] = [];
      let pen: DinoPen | null = null;
      let deserts: Desert[] = [];
      let gardens: Garden[] = [];
      let aviaries: Aviary[] = [];
      const parrotSays = new Map<string, { text: string; until: number; at: V3 }>();   // 앵무새 말풍선 — 열쇠 「방:차례」
      const startled = new Map<string, { text: string; until: number; calm: number }>();   // 전갈·선인장에 놀란 사람 — 말과 다시 놀랄 수 있는 때
      let tank: FishTank | null = null;
      let tankItem: (string | undefined)[] = [];   // 수조 차례 → 그 수조 가구의 WorldItem.key (물고기를 그 그림 안에 그릴 때)
      let day = 1, lastSky = -1;
      let lamps: [number, number, number][] = [];   // 천장 조명 웅덩이 [x, 바닥 높이, z]
      let bounds = { x0: 0, y0: 0, x1: 1, y1: 1 };

      // 건물 전체가 들어가는 구운 픽셀 범위
      const measure = (w: World) => {
        let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
        for (const m of w.modules) {
          const ms = atlas.modules[m.type];
          const [ax, ay] = proj([m.at[0], m.y ?? 0, m.at[1]]);
          for (const r of [ms?.floor, ms?.objects]) {
            if (!r) continue;
            x0 = Math.min(x0, ax + r.ox); y0 = Math.min(y0, ay + r.oy);
            x1 = Math.max(x1, ax + r.ox + r.w); y1 = Math.max(y1, ay + r.oy + r.h);
          }
        }
        // 아래 두 층(배경이 그린다)의 앞 모서리까지 들어오게
        for (const p of [[0, -6.9, w.d], [w.w, -6.9, w.d], [w.w, -6.9, 0]] as V3[]) {
          const [u, v] = proj(p);
          x0 = Math.min(x0, u); x1 = Math.max(x1, u); y1 = Math.max(y1, v);
        }
        bounds = { x0, y0, x1, y1 };
      };
      const fit = () => {
        dpr = Math.min(2, window.devicePixelRatio || 1);
        const w = box.current.clientWidth, h = box.current.clientHeight;
        canvas.current.width = back.current.width = Math.round(w * dpr);
        canvas.current.height = back.current.height = Math.round(h * dpr);
        const bw = bounds.x1 - bounds.x0, bh = bounds.y1 - bounds.y0;
        const base = Math.min(w / bw, h / bh) * 0.98;
        k = base * view.zoom * dpr;
        offX = (w * dpr - bw * k) / 2 - bounds.x0 * k + view.panX * dpr;
        offY = (h * dpr - bh * k) / 2 - bounds.y0 * k + view.panY * dpr;
      };
      const ro = new ResizeObserver(fit);
      ro.observe(box.current);

      const blit = (r: SpriteRect, ax: number, ay: number, scale = 1) => {
        ctx.drawImage(sheets[r.sheet], r.sx, r.sy, r.w, r.h, ax + r.ox * scale, ay + r.oy * scale, r.w * scale, r.h * scale);
      };
      // 불 꺼진 방(공실)의 조각 — 한 번 어둡게 칠해 두고 다시 쓴다. ctx.filter 는 안 쓴다(사파리)
      const darkCache = new Map<SpriteRect, HTMLCanvasElement>();
      const blitDark = (r: SpriteRect, ax: number, ay: number) => {
        let c = darkCache.get(r);
        if (!c) {
          c = document.createElement('canvas');
          c.width = r.w; c.height = r.h;
          const g = c.getContext('2d')!;
          g.drawImage(sheets[r.sheet], r.sx, r.sy, r.w, r.h, 0, 0, r.w, r.h);
          g.globalCompositeOperation = 'source-atop';
          g.fillStyle = 'rgba(18, 20, 30, 0.32)';   // 0.5 는 너무 어두웠다 (사용자)
          g.fillRect(0, 0, r.w, r.h);
          darkCache.set(r, c);
        }
        ctx.drawImage(c, ax + r.ox, ay + r.oy);
      };
      const dim = (t: string) => t.startsWith('vacant');   // 공실 — 창고처럼 쓰고 불은 꺼져 있다 (wetherilli 028)
      const path = (pts: V3[]) => {
        ctx.beginPath();
        pts.forEach((p, i) => { const [u, v] = proj(p); i ? ctx.lineTo(u, v) : ctx.moveTo(u, v); });
        ctx.closePath();
      };
      const poly = (pts: V3[], fill: string, alpha = 1) => {
        ctx.globalAlpha = alpha;
        ctx.fillStyle = fill;
        path(pts);
        ctx.fill();
        ctx.globalAlpha = 1;
      };
      const circle = (x: number, z: number, r: number, y = 0.02): V3[] =>
        Array.from({ length: 24 }, (_, i) => [x + r * Math.cos((i / 24) * Math.PI * 2), y, z + r * Math.sin((i / 24) * Math.PI * 2)] as V3);
      const ring = (x: number, z: number, r0: number, r1: number, color: string, alpha: number, y = 0.02) => {
        ctx.globalAlpha = alpha;
        ctx.fillStyle = color;
        ctx.beginPath();
        circle(x, z, r1, y).forEach((p, i) => { const [u, v] = proj(p); i ? ctx.lineTo(u, v) : ctx.moveTo(u, v); });
        ctx.closePath();
        circle(x, z, r0, y).reverse().forEach((p, i) => { const [u, v] = proj(p); i ? ctx.lineTo(u, v) : ctx.moveTo(u, v); });
        ctx.closePath();
        ctx.fill('evenodd');
        ctx.globalAlpha = 1;
      };
      const moduleAt = (w: World, i: number) => proj([w.modules[i].at[0], w.modules[i].y ?? 0, w.modules[i].at[1]]);   // 아래층은 바닥이 낮다
      // 벽면의 기울기 — x 축(+z 를 보는 벽)과 z 축(+x 를 보는 벽)이 화면에서 기운 각도
      const slope = (p: V3) => { const [u, v] = proj(p); return (Math.atan2(v, u) * 180) / Math.PI; };
      const skewX = slope([1, 0, 0]), skewZ = slope([0, 0, 1]) + 180;

      const deskScreen = (w: World, d: number, act: Agent['activity'] | undefined, T: number) => {
        if (!act) return;
        const desk = w.desks[d];
        const q = screenQuad(desk.at[0], desk.at[1], desk.kind);
        const [cx, cy, cz] = q.c;
        const flick = act === 'code' && !RM && Math.sin(T * 14 + d) > 0.6;
        poly([[cx - q.w / 2, cy + q.h / 2, cz], [cx + q.w / 2, cy + q.h / 2, cz], [cx + q.w / 2, cy - q.h / 2, cz], [cx - q.w / 2, cy - q.h / 2, cz]],
          hex(desk.kind === 'rashdesk' ? PHOSPHOR : SCREEN[act]), flick ? 0.85 : 1);
      };


      const label = (id: string, cls: string, html: string, at: V3, anchor: string) => {
        let el = labelEls.get(id);
        if (!el) { el = document.createElement('div'); labels.current.appendChild(el); labelEls.set(id, el); }
        if (el.className !== cls) el.className = cls;
        if (el.dataset.h !== html) { el.innerHTML = html; el.dataset.h = html; }
        const [lx, ly] = proj(at);
        el.style.transform = `translate(${(lx * k + offX) / dpr}px, ${(ly * k + offY) / dpr}px) ${anchor}`;
      };

      let last = performance.now(), T = 0;
      const frame = (now: number) => {
        if (stop) return;
        const dt = (now - last) / 1000; last = now; T += dt;
        const { selected: sel, world: w } = props.current;
        if (fitted !== w) { fitted = w; measure(w); fit(); }
        const c = cast.current;
        c.step(dt);

        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.current.width, canvas.current.height);
        ctx.setTransform(k, 0, 0, k, offX, offY);
        if (Math.floor(T * 2) !== lastSky) { lastSky = Math.floor(T * 2); day = daylight(hourNow()); }   // 낮밤은 0.5초마다
        // 바깥 배경 (backdrop.ts, wetherilli 016) — 뒤 캔버스에, 지금 보이는 구운 픽셀 범위를 채운다
        bctx.setTransform(1, 0, 0, 1, 0, 0);
        bctx.clearRect(0, 0, back.current.width, back.current.height);
        bctx.setTransform(k, 0, 0, k, offX, offY);
        drawBackdrop(bctx, proj, { w: w.w, d: w.top, wing: w.lower ? { w: MODULES.downstairs.size[0], d: w.d - w.top, y: w.lower.y } : undefined },
          { x0: -offX / k, y0: -offY / k, x1: (back.current.width - offX) / k, y1: (back.current.height - offY) / k }, RM ? 0 : T, day);
        ctx.imageSmoothingQuality = 'high';
        // 바닥 층 전부, 그다음 물건 층 (등각 차례)
        if (orderFor !== w) {
          // 천장 조명 자리 — 바닥이 있는 모듈마다 3.5 간격 (테라스는 빼고)
          lamps = [];
          for (const m of w.modules) {
            const [mw, md] = MODULES[m.type].size;
            if (!MODULES[m.type].floors.length || m.type === 'terrace' || dim(m.type)) continue;   // 공실은 불이 꺼져 있다
            for (let lx = 1.75; lx < mw; lx += 3.5) for (let lz = 1.75; lz < md; lz += 3.5) lamps.push([m.at[0] + lx, m.y ?? 0, m.at[1] + lz]);
          }
        }
        if (orderFor !== w) { orderFor = w; order = isoOrder([...w.modules.keys()], (i) => moduleRect(w.modules[i])); pen = w.pen ? new DinoPen(w.pen.rect, w.pen.feeder) : null; deserts = w.desert.map((d) => new Desert(d.roam, d.home, d.room)); gardens = w.garden.map((g) => new Garden(g.roam, g.nibble, g.room)); aviaries = w.aviary.map((a) => new Aviary(a.perches, a.ground, a.fly, a.room)); parrotSays.clear(); tank = w.aqua ? new FishTank(w.aqua.tanks) : null;
          tankItem = (w.aqua?.tanks ?? []).map(({ box: [x0, z0, x1, z1] }) => {
            const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
            return w.items.find((it) => (it.kind === 'tank' || it.kind === 'tube') && cx > it.box[0] && cx < it.box[2] && cz > it.box[1] && cz < it.box[3])?.key;
          });
        }
        w.modules.forEach((m, i) => { const r = atlas.modules[m.type]?.floor; if (r) { const [ax, ay] = moduleAt(w, i); (dim(m.type) ? blitDark : blit)(r, ax, ay); } });
        for (const i of order) { const r = atlas.modules[w.modules[i].type]?.objects; if (r) { const [ax, ay] = moduleAt(w, i); (dim(w.modules[i].type) ? blitDark : blit)(r, ax, ay); } }

        const actors = [...c.actors.values()].sort((a, b) => (a.x + a.z) - (b.x + b.z));
        const seated = new Map<number, Agent['activity']>();
        for (const a of actors) if (sitting(a) && a.place.desk !== null) seated.set(a.place.desk, a.agent.activity);
        seated.forEach((act, d) => deskScreen(w, d, act, T));

        // 캐릭터의 그림 자리 (구운 픽셀) — 몸 위에 머리 층들을 겹친다
        type Draw = { a: Actor; fy: number; body: SpriteRect; head: SpriteRect[]; bx: number; by: number; hx: number; hy: number; s: number; x0: number; y0: number; x1: number; y1: number };
        const draws: Draw[] = [];
        for (const a of actors) {
          const sit = sitting(a);
          const L = a.look ?? appearanceOf(a.agent);   // 화면에서 고치면 바로 — 서버가 모두에게 보낸다 (점원·손님은 고칠 수 없다)
          const body = atlas.bodies[bodyKey(a.color, shapeOf(L), sit)];
          const head = headLayers(atlas, L, dirOf(a.rot));
          if (!body || !head.length) continue;
          const cooking = !!a.place.cook && !a.moving && !a.leaving;   // 점원이 조리대 앞 — 손을 놀리듯 잘게 들썩인다
          const bob = RM ? 0 : a.moving ? Math.abs(Math.sin(a.t * 10)) * 0.08 : cooking ? Math.abs(Math.sin(a.t * 7)) * 0.025 : 0;
          const lift = sit ? (a.place.lift ?? 0) : 0;
          const s = 1;   // 하위 에이전트도 사람 크기 (전에는 0.72 — 사용자: 「에이전트도 사람같이」)
          const fy = heightAt(w, a.x, a.z);   // 아래층·계단
          const [bx, by] = proj([a.x, fy + bob + lift, a.z]);
          const [hx, hy] = proj([a.x, fy + bob + lift + (HEAD_Y + liftOf(L.build) + (sit ? SIT_LIFT : 0)) * s, a.z]);   // 머리 층은 보통 몸집으로 구웠다
          let x0 = bx + body.ox * s, y0 = by + body.oy * s, x1 = bx + (body.ox + body.w) * s, y1 = by + (body.oy + body.h) * s;
          for (const h of head) {
            x0 = Math.min(x0, hx + h.ox * s); y0 = Math.min(y0, hy + h.oy * s);
            x1 = Math.max(x1, hx + (h.ox + h.w) * s); y1 = Math.max(y1, hy + (h.oy + h.h) * s);
          }
          draws.push({ a, fy, body, head, bx, by, hx, hy, s, x0, y0, x1, y1 });
        }
        // 공룡 — 먹이 주는 사람(울타리 앞에 도착한 사람)이 있으면 그 앞으로 온다
        if (pen && w.pen) {
          const feeders: { id: string; dino: [number, number] }[] = [];
          for (const a of actors) {
            const g = a.place.group;
            if (!g?.startsWith('feed') || a.moving || a.leaving) continue;
            const f = w.pen.feed[Number(g.slice(4))];
            if (f) feeders.push({ id: a.agent.id, dino: f.dino });
          }
          pen.step(Math.min(0.05, dt), feeders);
        }
        // 그릴 것 — 캐릭터와 공룡을 x+z 차례로, 사이사이에 그들을 가리는 가구를 끼운다
        // inside — 그 가구(수조) 속에 든 것. 그 가구는 이 그림을 덮지 않고 옅게만 비친다(아래 covers)
        type Figure = { x: number; z: number; sit: boolean; on?: string; inside?: string; top?: string; x0: number; y0: number; x1: number; y1: number; draw: () => void };
        const figs: Figure[] = draws.map((d) => ({
          x: d.a.x, z: d.a.z, sit: sitting(d.a), on: d.a.place.on, x0: d.x0, y0: d.y0, x1: d.x1, y1: d.y1,
          draw: () => {
            const { a } = d;
            if (!sitting(a)) poly(circle(a.x, a.z, 0.3 * d.s, d.fy + 0.02), '#000', 0.12);   // 발 그림자
            const waiting = a.agent.activity === 'wait' && !a.moving && !a.leaving;
            if (waiting) ring(a.x, a.z, 0.42, 0.5, '#e24b4a', RM ? 0.8 : 0.5 + 0.4 * Math.sin(T * 5), d.fy + 0.02);
            else if (sel === a.agent.id) ring(a.x, a.z, 0.42, 0.5, '#534ab7', 0.45, d.fy + 0.02);
            blit(d.body, d.bx, d.by, d.s);
            for (const h of d.head) blit(h, d.hx, d.hy, d.s);
          },
        }));
        for (const dn of pen?.dinos ?? []) {
          const r = atlas.dinos?.[dinoKey(dn.color, dn.pose, dn.pose === 'walk' ? dn.frame : 0, dirOf(dn.rot))];
          if (!r) continue;
          const [ax, ay] = proj([dn.x, 0, dn.z]);
          figs.push({
            x: dn.x, z: dn.z, sit: false, x0: ax + r.ox, y0: ay + r.oy, x1: ax + r.ox + r.w, y1: ay + r.oy + r.h,
            draw: () => {
              poly(circle(dn.x, dn.z, 0.18), '#000', 0.12);
              if (dn.feedBy && dn.pose === 'eat') poly(circle(dn.x + Math.sin(dn.rot) * 0.24, dn.z + Math.cos(dn.rot) * 0.24, 0.07, 0.04), '#9c3f2c');   // 고깃덩이
              blit(r, ax, ay);
            },
          });
        }
        // 사막 방 — 전갈이 기고 선인장이 가끔 걷는다 (desert.ts). 가까이 온 사람은 놀라서 한마디(말풍선은 아래 잡담 뒤에)
        for (const ds of deserts) {
          const roam = w.desert.find((d) => d.room === ds.room)?.roam;
          const near = roam ? actors.filter((a) => !a.leaving && a.x > roam[0] - 1 && a.x < roam[2] + 1 && a.z > roam[1] - 1.5 && a.z < roam[3] + 1) : [];
          ds.step(Math.min(0.05, dt), near.filter((a) => !a.moving).map((a) => [a.x, a.z] as [number, number]));
          for (const a of near) {
            const st = startled.get(a.agent.id);
            if (st && T < st.calm) continue;
            const scorp = ds.scorpions.some((s) => Math.hypot(s.x - a.x, s.z - a.z) < 1.15);   // 책상 의자(z 2.25)와 전갈 길(z 3.2~) 사이도 닿게
            const cac = ds.cactusAbout && Math.hypot(ds.cactus.x - a.x, ds.cactus.z - a.z) < 1.6;
            if (!scorp && !cac) continue;
            const text = drawLine(scorp ? SCORPION_STARTLE : CACTUS_STARTLE);
            startled.set(a.agent.id, { text, until: T + Math.max(2.2, 1.6 + text.length * 0.12), calm: T + 30 + Math.random() * 40 });
          }
          for (const s of ds.scorpions) {
            const r = atlas.critters?.[scorpionKey(s.moving ? s.frame : 0, dirOf(s.rot))];
            if (!r) continue;
            const [ax, ay] = proj([s.x, 0, s.z]);
            figs.push({ x: s.x, z: s.z, sit: false, x0: ax + r.ox, y0: ay + r.oy, x1: ax + r.ox + r.w, y1: ay + r.oy + r.h,
              draw: () => { poly(circle(s.x, s.z, 0.13), '#000', 0.12); blit(r, ax, ay); } });
          }
          const c = ds.cactus;
          const r = atlas.critters?.[cactusKey(c.pose, c.pose === 'walk' ? c.frame : 0, dirOf(c.rot))];
          if (r) {
            const [ax, ay] = proj([c.x, 0, c.z]);
            figs.push({ x: c.x, z: c.z, sit: false, x0: ax + r.ox, y0: ay + r.oy, x1: ax + r.ox + r.w, y1: ay + r.oy + r.h,
              draw: () => { poly(circle(c.x, c.z, 0.22), '#000', 0.14); blit(r, ax, ay); } });
          }
        }
        // 잔디 방 — 작은 공룡 하나가 다니고 고사리를 뜯는다 (garden.ts). 발치에 오면 그 사람이 한마디 (놀람과 같은 말풍선 자리)
        for (const gd of gardens) {
          const roam = w.garden.find((g) => g.room === gd.room)?.roam;
          const near = roam ? actors.filter((a) => !a.leaving && a.x > roam[0] - 1 && a.x < roam[2] + 1 && a.z > roam[1] - 1.5 && a.z < roam[3] + 1) : [];
          gd.step(Math.min(0.05, dt), near.filter((a) => !a.moving).map((a) => [a.x, a.z] as [number, number]));
          const dn = gd.dino;
          for (const a of near) {
            const st = startled.get(a.agent.id);
            if (st && T < st.calm) continue;
            const dd = Math.hypot(dn.x - a.x, dn.z - a.z);
            const fern = gd.eating && dd < 2.2 && Math.random() < dt * 0.25;   // 고사리 뜯는 걸 보면 가끔 (4초에 한 번꼴)
            if (dd >= 1.1 && !fern) continue;
            const text = drawLine(fern ? DINO_FERN : DINO_NEAR);
            startled.set(a.agent.id, { text, until: T + Math.max(2.2, 1.6 + text.length * 0.12), calm: T + 40 + Math.random() * 50 });
          }
          const r = atlas.dinos?.[dinoKey(dn.color, dn.pose, dn.pose === 'walk' ? dn.frame : 0, dirOf(dn.rot))];
          if (r) {
            const [ax, ay] = proj([dn.x, 0, dn.z]);
            figs.push({ x: dn.x, z: dn.z, sit: false, x0: ax + r.ox, y0: ay + r.oy, x1: ax + r.ox + r.w, y1: ay + r.oy + r.h,
              draw: () => { poly(circle(dn.x, dn.z, 0.18), '#000', 0.12); blit(r, ax, ay); } });
          }
        }
        // 흙바닥 방 — 앵무새가 날고 앉고 쫀다 (parrots.ts). 머리 위를 스치면 그 사람이 한마디, 앉은 앵무새는 가끔 사람 말을 흉내 내고
        // 그 방 사람이 받아친다. 앵무새는 높이(y)가 있어 그림자는 땅에, 그림은 그 높이에
        for (const av of aviaries) {
          const fly = w.aviary.find((a) => a.room === av.room)?.fly;
          const near = fly ? actors.filter((a) => !a.leaving && !a.npc && a.x > fly[0] - 0.8 && a.x < fly[2] + 0.8 && a.z > fly[1] - 0.8 && a.z < fly[3] + 1) : [];
          av.step(Math.min(0.05, dt));
          for (const a of near) {
            const st = startled.get(a.agent.id);
            if (st && T < st.calm) continue;
            if (!av.swoops(a.x, a.z)) continue;
            const text = drawLine(PARROT_SWOOP);
            startled.set(a.agent.id, { text, until: T + Math.max(2.2, 1.6 + text.length * 0.12), calm: T + 35 + Math.random() * 45 });
          }
          for (const p of av.talkers()) {
            av.talked(p);
            const who = near.length ? personName(near[Math.floor(Math.random() * near.length)].agent) : '';
            const text = drawLine(PARROT_TALK).replace(/\{상대\}/g, who ? (who.length === 3 ? who.slice(1) : who) : '안녕');
            parrotSays.set(`${av.room}:${av.parrots.indexOf(p)}`, { text, until: T + Math.max(2.4, 1.6 + text.length * 0.12), at: [p.x, p.y, p.z] });
            // 그 방 사람 하나가 받아친다 (반쯤)
            const r = near.find((a) => { const st = startled.get(a.agent.id); return !st || T >= st.calm; });
            if (r && Math.random() < 0.5) {
              const reply = drawLine(PARROT_REPLY);
              startled.set(r.agent.id, { text: reply, until: T + 2.2 + Math.max(2.2, 1.6 + reply.length * 0.12), calm: T + 30 + Math.random() * 30 });
            }
          }
          av.parrots.forEach((p, i) => {
            const said = parrotSays.get(`${av.room}:${i}`);
            if (said && T < said.until) said.at = [p.x, p.y, p.z];
            const r = atlas.critters?.[parrotKey(p.kind, p.pose, p.pose === 'fly' ? p.frame : 0, dirOf(p.rot))];
            if (!r) return;
            const [ax, ay] = proj([p.x, p.y, p.z]);
            const sh = Math.max(0.05, 0.14 - p.y * 0.03);
            // 횃대·책장 위에 앉았거나 그 위를 날면 그 가구가 앵무새를 덮지 않는다 (top)
            const under = p.y > 0.3 ? w.items.find((it) => it.kind !== 'partition' && p.x >= it.box[0] && p.x <= it.box[2] && p.z >= it.box[1] && p.z <= it.box[3])?.key : undefined;
            figs.push({ x: p.x, z: p.z, sit: false, top: under, x0: ax + r.ox, y0: ay + r.oy, x1: ax + r.ox + r.w, y1: ay + r.oy + r.h,
              draw: () => { poly(circle(p.x, p.z, sh), '#000', p.state === 'fly' || p.state === 'circle' ? 0.07 : 0.12); blit(r, ax, ay); } });
          });
        }
        // 물고기·손님 — 수조 안을 헤엄치거나 모래 위를 긴다 (fish.ts). 수조 그림(뒤판·물·유리가 한 조각)은
        // 물건 층에 먼저 깔리고, 물고기는 그 위에 — 그 수조가 다시 덮으면 짙은 뒤판까지 물고기 위에 칠해져 안 보인다(wetherilli 017 전까지의 탈).
        // 그래서 든 수조는 옅게(VEIL)만 다시 칠해 물·유리 너머로 보이게 한다
        tank?.step(Math.min(0.05, dt));
        for (const f of tank?.fish ?? []) {
          const r = atlas.fish?.[fishKey(f.kind, f.frame, dirOf(f.rot))];
          if (!r) continue;
          const [ax, ay] = proj([f.x, f.y, f.z]);
          figs.push({ x: f.x, z: f.z, sit: false, inside: tankItem[f.tank], x0: ax + r.ox, y0: ay + r.oy, x1: ax + r.ox + r.w, y1: ay + r.oy + r.h, draw: () => blit(r, ax, ay) });
        }
        // 식탁 위 음식 — 먹는 자리에 앉은 사람 앞에만. 뚝배기·국수엔 김이 오른다
        for (const a of actors) {
          const dish = a.place.dish, food = a.place.food;
          if (!dish || !food || !sitting(a)) continue;
          const r = atlas.critters?.[foodKey(food, dirOf(dish.rot))];
          if (!r) continue;
          const [ax, ay] = proj([dish.at[0], dish.y, dish.at[1]]);
          const table = w.items.find((it) => it.module === w.modules.findIndex((m) => m.type === 'downstairs') && dish.at[0] > it.box[0] && dish.at[0] < it.box[2] && dish.at[1] > it.box[1] && dish.at[1] < it.box[3] && it.prop?.endsWith('_table'))?.key;
          figs.push({ x: dish.at[0], z: dish.at[1], sit: false, top: table, x0: ax + r.ox, y0: ay + r.oy - 40, x1: ax + r.ox + r.w, y1: ay + r.oy + r.h,
            draw: () => {
              blit(r, ax, ay);
              if (food === 'burger' || RM) return;
              for (let k = 0; k < 3; k++) {   // 김 — 위로 오르며 옅어진다
                const ph = (T * 0.6 + k / 3 + (dish.at[0] % 1)) % 1;
                const [u, v] = proj([dish.at[0] + Math.sin(ph * 6 + k) * 0.03, dish.y + 0.14 + ph * 0.32, dish.at[1]]);
                ctx.globalAlpha = 0.35 * (1 - ph);
                ctx.fillStyle = '#ffffff';
                ctx.beginPath(); ctx.ellipse(u, v, 0.035 * S * (1 + ph), 0.05 * S * (1 + ph), 0, 0, Math.PI * 2); ctx.fill();
              }
              ctx.globalAlpha = 1;
            } });
        }
        // 조리 — 점원이 선 조리대 위에 김(솥)·연기(그릴·튀김기)가 오른다 (wetherilli 026)
        if (!RM) for (const a of actors) {
          const ck = a.place.cook;
          if (!ck || a.moving || a.leaving) continue;
          const [cx, cy, cz] = ck;
          const [ax, ay] = proj([cx, cy, cz]);
          figs.push({ x: cx, z: cz + 0.6, sit: false, x0: ax - 30, y0: ay - 60, x1: ax + 30, y1: ay,
            draw: () => {
              for (let k = 0; k < 4; k++) {
                const ph = (T * 0.5 + k / 4 + (cx % 1)) % 1;
                const [u, v] = proj([cx + Math.sin(ph * 5 + k * 1.7) * 0.12, cy + 0.05 + ph * 0.55, cz + Math.cos(k * 2.1) * 0.1]);
                ctx.globalAlpha = 0.4 * (1 - ph);
                ctx.fillStyle = '#ffffff';
                ctx.beginPath(); ctx.ellipse(u, v, 0.05 * S * (1 + ph), 0.065 * S * (1 + ph), 0, 0, Math.PI * 2); ctx.fill();
              }
              ctx.globalAlpha = 1;
            } });
        }
        figs.sort((p, q) => (p.x + p.z) - (q.x + q.z));
        // 가구가 그림 앞인가 — 카메라가 +x·+z 쪽에서 보므로 앞면 너머에 있으면 앞이다. 앉은 가구(소파·카페 의자)는 가리지 않는다
        // top — 그 가구 위에 놓인 것(식탁 위 음식): 그 가구가 덮지 않는다. 계단(flight) 위를 걷는 사람도 계단이 덮지 않는다 — 더 낮은 단은 앞에 있어도 발밑이다
        const onFlight = (f: Figure, it: WorldItem) => it.kind === 'flight' && f.x >= it.box[0] && f.x <= it.box[2] && f.z >= it.box[1] && f.z <= it.box[3];
        const frontOf = (f: Figure, it: WorldItem) => f.x > it.box[2] || f.z > it.box[3] || (f.sit && f.on === it.key) || f.top === it.key || onFlight(f, it);
        type Cover = { at: number; box: Rect; clip: Figure[]; alpha: number; fn: () => void };
        const VEIL = 0.3;   // 수조 속 물고기 위에 그 수조를 다시 칠하는 진하기 — 물빛이 살짝 돈다
        const covers: Cover[] = [];
        for (const it of w.items) {
          const r = atlas.modules[w.modules[it.module].type]?.items[it.id];
          if (!r) continue;
          const [ax, ay] = moduleAt(w, it.module);
          let after = -1, afterIn = -1;
          const clip: Figure[] = [], veil: Figure[] = [];
          figs.forEach((f, i) => {
            if (f.inside !== it.key && frontOf(f, it)) return;
            if (f.x1 < ax + r.ox || f.x0 > ax + r.ox + r.w || f.y1 < ay + r.oy || f.y0 > ay + r.oy + r.h) return;   // 겹치지 않는다
            if (f.inside === it.key) { afterIn = Math.max(afterIn, i); veil.push(f); return; }
            after = Math.max(after, i);
            clip.push(f);
          });
          const desk = w.desks.findIndex((dk) => dk.item === it.key);
          const dark = dim(w.modules[it.module].type);
          const fn = () => { (dark ? blitDark : blit)(r, ax, ay); if (desk >= 0) deskScreen(w, desk, seated.get(desk), T); };
          if (after >= 0) covers.push({ at: after + 0.5, box: it.box, clip, alpha: 1, fn });
          if (afterIn >= 0) covers.push({ at: afterIn + 0.5, box: it.box, clip: veil, alpha: VEIL, fn });
        }
        // 같은 자리에 끼는 가구끼리도 등각 차례로
        const rank = new Map(isoOrder(covers, (cv) => cv.box).map((cv, i) => [cv, i]));
        const seq = [
          ...figs.map((f, i) => ({ at: i, r: 0, fn: f.draw })),
          ...covers.map((cv) => ({
            at: cv.at, r: rank.get(cv)!,
            // 가린 그림의 자리만 다시 칠한다 — 가구 전체를 다시 그리면 그 앞의 다른 소품까지 덮는다
            fn: () => {
              ctx.save();
              ctx.beginPath();
              for (const f of cv.clip) ctx.rect(f.x0, f.y0, f.x1 - f.x0, f.y1 - f.y0);
              ctx.clip();
              ctx.globalAlpha = cv.alpha;
              cv.fn();
              ctx.restore();
            },
          })),
        ];
        seq.sort((a, b) => a.at - b.at || a.r - b.r).forEach((s) => s.fn());

        // 낮밤 — 밤이면 그린 것 위에만(source-atop) 남색을 덮고, 그 위에 천장 조명 웅덩이와 켜진 모니터 빛을 더한다(lighter).
        // 낮에는 아주 조금 밝게. 바탕(하늘)은 .view 의 배경이 시각에 맞춰 바뀐다
        const night = 1 - day;
        if (night > 0.02) {
          ctx.save();
          ctx.globalCompositeOperation = 'source-atop';
          ctx.fillStyle = `rgba(8, 14, 38, ${0.55 * night})`;
          ctx.fillRect(bounds.x0 - 50, bounds.y0 - 50, bounds.x1 - bounds.x0 + 100, bounds.y1 - bounds.y0 + 100);
          ctx.globalCompositeOperation = 'lighter';
          for (const [lx, ly, lz] of lamps) {
            const [u, v] = proj([lx, ly, lz]);
            const r = 2.4 * S;
            const g = ctx.createRadialGradient(u, v, 0, u, v, r);
            g.addColorStop(0, `rgba(255, 214, 150, ${0.22 * night})`);
            g.addColorStop(1, 'rgba(255, 214, 150, 0)');
            ctx.fillStyle = g;
            ctx.beginPath(); ctx.ellipse(u, v, r, r * 0.58, 0, 0, Math.PI * 2); ctx.fill();
          }
          seated.forEach((act, d) => {   // 켜진 모니터 앞에 푸른 빛
            const [dx, dz] = w.desks[d].at;
            const [u, v] = proj([dx, 0.9, dz + 0.3]);
            const g = ctx.createRadialGradient(u, v, 0, u, v, 0.9 * S);
            g.addColorStop(0, `rgba(120, 180, 255, ${0.22 * night})`);
            g.addColorStop(1, 'rgba(120, 180, 255, 0)');
            ctx.fillStyle = g;
            ctx.beginPath(); ctx.arc(u, v, 0.9 * S, 0, Math.PI * 2); ctx.fill();
            void act;
          });
          ctx.restore();
        } else if (day > 0.6) {
          ctx.save();
          ctx.globalCompositeOperation = 'source-atop';
          ctx.fillStyle = `rgba(255, 250, 235, ${0.05 * (day - 0.6) / 0.4})`;
          ctx.fillRect(bounds.x0 - 50, bounds.y0 - 50, bounds.x1 - bounds.x0 + 100, bounds.y1 - bounds.y0 + 100);
          ctx.restore();
        }

        // 이름표 (HTML) — 하위 에이전트도 단다
        const live = new Set<string>();
        hits = [];
        for (const d of draws) {
          const { a } = d;
          if (a.npc) continue;   // 점원·손님은 누를 수 없고 이름표도 없다
          hits.push({ id: a.agent.id, x0: d.x0 * k + offX, y0: d.y0 * k + offY, x1: d.x1 * k + offX, y1: d.y1 * k + offY });
          if (a.leaving) continue;
          // 휴게실에 앉은 사람은 이름표를 숨긴다 (겹친다) — 말할 때 말풍선에 이름이 붙고, 고르면 보인다
          const resting = a.agent.activity === 'idle' && !!a.place.group && !a.moving;
          if (resting && sel !== a.agent.id) continue;
          live.add(a.agent.id);
          const wait = a.agent.activity === 'wait';
          const top = (sitting(a) ? 1.45 + SIT_LIFT : 1.6) + (sitting(a) ? (a.place.lift ?? 0) : 0);
          label(a.agent.id, 'lbl' + (wait ? ' wait' : '') + (sel === a.agent.id ? ' sel' : ''),
            `<i style="background:${hex(a.color)}"></i>${esc(personName(a.agent))}${wait ? ` · ${STATE_TEXT.wait}${a.agent.guessed ? '?' : ''}` : ''}`,
            [a.x, top + d.fy, a.z], 'translate(-50%, -100%)');
        }
        // 상담원이 답하는 중이면 「답하는 중…」 (질문·답은 대화창에만)
        for (const d of draws) {
          const { a } = d;
          if (a.agent.kind !== 'desk' || a.agent.activity !== 'think') continue;
          const id = `bubble:${a.agent.id}`;
          live.add(id);
          labelEls.get(a.agent.id)?.remove(); labelEls.delete(a.agent.id);
          label(id, 'bubble', `<small style="color:${hex(a.color)}">${esc(personName(a.agent))}</small>답하는 중…`,
            [a.x, d.fy + 1.75 + (sitting(a) ? SIT_LIFT + (a.place.lift ?? 0) : 0), a.z], 'translate(-50%, -100%)');
        }
        // 휴게실 잡담 — 같은 무리(카페 탁자·소파)에 둘 이상 있으면 대화를 돌아가며, 혼자면 드문드문 혼잣말 (chatter.ts)
        const groups = new Map<string, Actor[]>();
        for (const d of draws) {
          const { a } = d;
          if (a.moving || a.leaving || a.agent.activity !== 'idle' || !a.place.group) continue;
          const g = groups.get(a.place.group) ?? [];
          g.push(a);
          groups.set(a.place.group, g);
        }
        // 일하면서도 — 책상에 앉은 사람은 같은 사무실끼리, 그 밖(코어 보관대·실험대·자료실)은 같은 일끼리.
        // 확인 대기(빨간 링·이름표)와 상담원은 빼고, 말하는 동안은 이름표 대신 말풍선
        for (const d of draws) {
          const { a } = d;
          const act = a.agent.activity;
          if (a.moving || a.leaving || act === 'idle' || act === 'wait' || a.agent.kind === 'desk') continue;
          const key = a.place.desk !== null ? `work:${a.agent.room}` : `work:${act}`;
          const g = groups.get(key) ?? [];
          g.push(a);
          groups.set(key, g);
        }
        chatter.keep(new Set(groups.keys()));
        if (!RM) groups.forEach((members, name) => {
          members.sort((p, q) => (p.agent.id < q.agent.id ? -1 : 1));
          const said = chatter.step(name, members.map((m) => m.agent.id), T, (who) => {
            const m = members.find((p) => p.agent.id === who);
            if (m?.npc) return { act: 'idle', room: '', name: '', meal: mealOf(hourNow()) ?? undefined, food: m.place.food,
              role: m.npc.role, crowd: m.npc.crowd, phase: m.npc.phase, shop: m.npc.shop };
            return { act: m?.agent.activity ?? 'think', room: m ? roomName(m.agent.room) : '', name: m ? personName(m.agent) : '', theme: m ? themeOf(m.agent.room) : undefined,
              meal: mealOf(hourNow()) ?? undefined, food: m?.place.food };
          });
          if (!said) return;
          const a = members.find((m) => m.agent.id === said.who);
          if (!a) return;
          const id = `bubble:${a.agent.id}`;
          live.add(id);
          labelEls.get(a.agent.id)?.remove(); labelEls.delete(a.agent.id);   // 이름표 대신 말풍선
          label(id, 'bubble', `<small style="color:${hex(a.color)}">${esc(nameOf(a))}</small>${esc(said.text)}`,
            [a.x, heightAt(w, a.x, a.z) + 1.75 + (sitting(a) ? SIT_LIFT + (a.place.lift ?? 0) : -0.1), a.z], 'translate(-50%, -100%)');
        });
        // 전갈·선인장에 놀란 말 — 잡담 위에 덮는다
        parrotSays.forEach((ps, key) => {
          if (T >= ps.until) return;
          const bid = `bubble:parrot:${key}`;
          live.add(bid);
          label(bid, 'bubble', `<small style="color:#2a5bd7">앵무새</small>${esc(ps.text)}`, [ps.at[0], ps.at[1] + 0.55, ps.at[2]], 'translate(-50%, -100%)');
        });
        startled.forEach((st, id) => {
          if (T >= st.until) return;
          const d = draws.find((dr) => dr.a.agent.id === id);
          if (!d || d.a.leaving) return;
          const { a } = d;
          const bid = `bubble:${id}`;
          live.add(bid);
          labelEls.get(id)?.remove(); labelEls.delete(id);
          label(bid, 'bubble', `<small style="color:${hex(a.color)}">${esc(personName(a.agent))}</small>${esc(st.text)}`,
            [a.x, d.fy + 1.75 + (sitting(a) ? SIT_LIFT + (a.place.lift ?? 0) : -0.1), a.z], 'translate(-50%, -100%)');
        });
        // 혼자 하는 한마디 — 먹다가 불려 갈 때 불평, 다 먹고 일어날 때 (cast.ts). 걸으면서도 보인다 — 잡담·놀람 위에 덮는다
        const clock = performance.now() / 1000;
        for (const d of draws) {
          const { a } = d;
          if (!a.say || clock >= a.say.until || (a.leaving && !a.npc)) continue;   // 점원 퇴근 인사·손님 한마디는 나가면서
          const bid = `bubble:${a.agent.id}`;
          live.add(bid);
          labelEls.get(a.agent.id)?.remove(); labelEls.delete(a.agent.id);
          const text = fill(a.say.text, { act: a.agent.activity, room: roomName(a.agent.room), name: personName(a.agent) }, undefined);
          label(bid, 'bubble', `<small style="color:${hex(a.color)}">${esc(nameOf(a))}</small>${esc(text)}`,
            [a.x, d.fy + 1.75 + (sitting(a) ? SIT_LIFT + (a.place.lift ?? 0) : -0.1), a.z], 'translate(-50%, -100%)');
        }
        // 방 이름 명판 — 벽에 붙여, 벽면이 기운 만큼 비스듬히 (정사영이라 벽의 세로 모서리는 곧다 → skewY).
        // 모든 명판(사무실·가게·부장실…)은 한 꼴 — 폭 PLAQUE_W·글자 PLAQUE_FS(styles.css .plaque)로 지어 문틀 가로폭(span, 없으면 DOOR_SPAN)에 맞게 통째로 scale.
        // 그래서 확대하면 문틀과 같이 커지고, 판과 글자의 비율은 어디서나 같다. 이름이 길면 글자를 줄이지 않고 가운데에 가까운 띄어쓰기에서 두 줄로
        // (사용자 2026-11-05 — 한때 화면 px 고정이었는데 「너무 크다」, 「문틀 가로폭에 맞춘다」)
        for (const r of w.labels) {
          const id = `room:${r.name}:${r.at.join(',')}`;
          const name = r.room ? roomName(r.room) : r.name;   // 사람이 고친 부서 이름
          live.add(id);
          const ems = (t: string) => [...t].reduce((n, ch) => n + (/[가-힣·]/.test(ch) ? 1 : 0.62), 0);
          let html = esc(name);
          const cut = [...name.matchAll(/ /g)].map((m) => m.index!).sort((a, b) => Math.abs(a - name.length / 2) - Math.abs(b - name.length / 2))[0];
          if (ems(name) * PLAQUE_FS > PLAQUE_W - 10 && cut !== undefined) html = `${esc(name.slice(0, cut))}<br>${esc(name.slice(cut + 1))}`;
          const [u0] = proj([0, 0, 0]);
          const [u1] = proj(r.axis === 'x' ? [r.span ?? DOOR_SPAN, 0, 0] : [0, 0, r.span ?? DOOR_SPAN]);
          const fit = (Math.abs(u1 - u0) * k / dpr) / PLAQUE_W;
          label(id, 'plaque' + (r.style ? ` ${r.style}` : ''), html, [r.at[0], r.y, r.at[1]], `translate(-50%, -50%) skewY(${r.axis === 'x' ? skewX : skewZ}deg)${r.tilt ? ` rotate(${r.tilt}deg)` : ''} scale(${fit.toFixed(3)})`);
        }
        for (const [id, el] of labelEls) if (!live.has(id)) { el.remove(); labelEls.delete(id); }

        raf = requestAnimationFrame(frame);
      };
      raf = requestAnimationFrame(frame);

      // 휠 확대(커서 기준) · 끌어 옮기기 · 누르기
      const el = canvas.current;
      const onWheel = (e: WheelEvent) => {
        e.preventDefault();
        const z0 = view.zoom;
        view.zoom = Math.min(5, Math.max(0.6, z0 * Math.exp(-e.deltaY * 0.0015)));
        const rect = el.getBoundingClientRect();
        const mx = e.clientX - rect.left - rect.width / 2, my = e.clientY - rect.top - rect.height / 2;
        view.panX = mx - (mx - view.panX) * (view.zoom / z0);
        view.panY = my - (my - view.panY) * (view.zoom / z0);
        fit();
      };
      let drag: { x: number; y: number; px: number; py: number; moved: boolean } | null = null;
      const onDown = (e: PointerEvent) => { drag = { x: e.clientX, y: e.clientY, px: view.panX, py: view.panY, moved: false }; el.setPointerCapture(e.pointerId); };
      const onMove = (e: PointerEvent) => {
        if (!drag) return;
        const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
        if (Math.hypot(dx, dy) > 4) drag.moved = true;
        if (drag.moved) { view.panX = drag.px + dx; view.panY = drag.py + dy; fit(); }
      };
      const onUp = (e: PointerEvent) => {
        if (drag && !drag.moved) {
          const rect = el.getBoundingClientRect();
          const x = (e.clientX - rect.left) * dpr, y = (e.clientY - rect.top) * dpr;
          const hit = [...hits].reverse().find((h) => x >= h.x0 && x <= h.x1 && y >= h.y0 && y <= h.y1);
          props.current.onSelect(hit ? hit.id : null);
        }
        drag = null;
      };
      const onDbl = () => { view.zoom = 1; view.panX = 0; view.panY = 0; fit(); };
      el.addEventListener('wheel', onWheel, { passive: false });
      el.addEventListener('pointerdown', onDown);
      el.addEventListener('pointermove', onMove);
      el.addEventListener('pointerup', onUp);
      el.addEventListener('dblclick', onDbl);
      cleanup = () => {
        ro.disconnect();
        el.removeEventListener('wheel', onWheel);
        el.removeEventListener('pointerdown', onDown);
        el.removeEventListener('pointermove', onMove);
        el.removeEventListener('pointerup', onUp);
        el.removeEventListener('dblclick', onDbl);
      };
    }).catch((e) => {
      labels.current.innerHTML = `<p class="err">그림을 불러오지 못했다 — ${esc(String(e.message ?? e))}. npm run bake 를 돌렸나?</p>`;
    });

    return () => { stop = true; cancelAnimationFrame(raf); cleanup(); labelEls.forEach((el) => el.remove()); };
  }, []);

  return (
    <div ref={box} className="stage">
      <canvas ref={back} className="back" aria-hidden="true" />
      <canvas ref={canvas} />
      <div ref={labels} className="labels" />
    </div>
  );
}

function esc(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
}
