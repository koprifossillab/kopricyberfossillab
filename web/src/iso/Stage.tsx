// 2.5D 화면 — 구운 그림(sprites/)을 Canvas 2D 로 붙인다. three 를 싣지 않는다.
// 그리는 차례: 배경(가구 포함) → 벽 모니터·책상 모니터 빛 → [캐릭터 + 그 앞을 가리는 가구] 깊이 차례
import { useEffect, useRef } from 'react';
import type { Agent, Terminal } from '../types.ts';
import type { Atlas, SpriteRect } from './atlas.ts';
import { charKey } from './atlas.ts';
import { Cast, sitting, dirOf, type Actor } from './cast.ts';
import { DESKS, ITEMS, SCREEN, STATE_TEXT, screenQuad, type Item } from '../scene/layout.ts';

const RM = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
type V3 = [number, number, number];

interface Loaded { atlas: Atlas; sheets: Record<string, HTMLImageElement> }

async function load(): Promise<Loaded> {
  const atlas: Atlas = await (await fetch('sprites/atlas.json')).json();
  const names = new Set([atlas.background.sheet, ...Object.values(atlas.items).map((r) => r.sheet), ...Object.values(atlas.characters).map((r) => r.sheet)]);
  const sheets: Record<string, HTMLImageElement> = {};
  await Promise.all([...names].map((n) => new Promise<void>((ok, bad) => {
    const img = new Image();
    img.onload = () => ok();
    img.onerror = () => bad(new Error(`sprites/${n}`));
    img.src = `sprites/${n}`;
    sheets[n] = img;
  })));
  return { atlas, sheets };
}

const hex = (c: number) => '#' + c.toString(16).padStart(6, '0');

export function Stage({ agents, terminals, selected, onSelect }: {
  agents: Agent[]; terminals: Terminal[]; selected: string | null; onSelect: (id: string | null) => void;
}) {
  const box = useRef<HTMLDivElement>(null!);
  const canvas = useRef<HTMLCanvasElement>(null!);
  const labels = useRef<HTMLDivElement>(null!);
  const cast = useRef(new Cast());
  const props = useRef({ terminals, selected, onSelect });
  props.current = { terminals, selected, onSelect };

  useEffect(() => { cast.current.update(agents); }, [agents]);

  useEffect(() => {
    let stop = false;
    let raf = 0;
    const view = { zoom: 1, panX: 0, panY: 0 };
    let hits: { id: string; x0: number; y0: number; x1: number; y1: number }[] = [];
    const labelEls = new Map<string, HTMLDivElement>();

    load().then(({ atlas, sheets }) => {
      if (stop) return;
      const S = atlas.scale, R = atlas.right, U = atlas.up;
      const proj = (p: V3): [number, number] => [
        (p[0] * R[0] + p[1] * R[1] + p[2] * R[2]) * S,
        -(p[0] * U[0] + p[1] * U[1] + p[2] * U[2]) * S,
      ];
      const ctx = canvas.current.getContext('2d')!;
      const bg = atlas.background;
      let k = 1, offX = 0, offY = 0, dpr = 1;   // 구운 픽셀 → 캔버스 픽셀

      const fit = () => {
        dpr = Math.min(2, window.devicePixelRatio || 1);
        const w = box.current.clientWidth, h = box.current.clientHeight;
        canvas.current.width = Math.round(w * dpr);
        canvas.current.height = Math.round(h * dpr);
        const base = Math.min(w / bg.w, h / bg.h) * 0.98;
        k = base * view.zoom * dpr;
        offX = (w * dpr - bg.w * k) / 2 - bg.ox * k + view.panX * dpr;
        offY = (h * dpr - bg.h * k) / 2 - bg.oy * k + view.panY * dpr;
      };
      const ro = new ResizeObserver(fit);
      ro.observe(box.current);
      fit();

      const blit = (r: SpriteRect, ax: number, ay: number, scale = 1) => {
        ctx.drawImage(sheets[r.sheet], r.sx, r.sy, r.w, r.h, ax + r.ox * scale, ay + r.oy * scale, r.w * scale, r.h * scale);
      };
      const poly = (pts: V3[], fill: string, alpha = 1) => {
        ctx.globalAlpha = alpha;
        ctx.fillStyle = fill;
        ctx.beginPath();
        pts.forEach((p, i) => { const [u, v] = proj(p); i ? ctx.lineTo(u, v) : ctx.moveTo(u, v); });
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = 1;
      };
      const circle = (x: number, z: number, r: number): V3[] =>
        Array.from({ length: 24 }, (_, i) => [x + r * Math.cos((i / 24) * Math.PI * 2), 0.02, z + r * Math.sin((i / 24) * Math.PI * 2)] as V3);
      const ring = (x: number, z: number, r0: number, r1: number, color: string, alpha: number) => {
        ctx.globalAlpha = alpha;
        ctx.fillStyle = color;
        ctx.beginPath();
        circle(x, z, r1).forEach((p, i) => { const [u, v] = proj(p); i ? ctx.lineTo(u, v) : ctx.moveTo(u, v); });
        ctx.closePath();
        circle(x, z, r0).reverse().forEach((p, i) => { const [u, v] = proj(p); i ? ctx.lineTo(u, v) : ctx.moveTo(u, v); });
        ctx.closePath();
        ctx.fill('evenodd');
        ctx.globalAlpha = 1;
      };

      const deskScreen = (d: number, act: Agent['activity'] | undefined, T: number) => {
        if (!act) return;
        const [x, z] = DESKS[d];
        const q = screenQuad(x, z);
        const [cx, cy, cz] = q.c;
        const flick = act === 'code' && !RM && Math.sin(T * 14 + d) > 0.6;
        poly([[cx - q.w / 2, cy + q.h / 2, cz], [cx + q.w / 2, cy + q.h / 2, cz], [cx + q.w / 2, cy - q.h / 2, cz], [cx - q.w / 2, cy - q.h / 2, cz]],
          hex(SCREEN[act]), flick ? 0.85 : 1);
      };

      // 캐릭터가 상자 앞인가 — 카메라가 +x·+z 쪽에서 보므로 앞면 너머에 있으면 앞이다
      const inFront = (a: Actor, it: Item) => a.x > it.box[2] || a.z > it.box[3];

      let last = performance.now(), T = 0;
      const frame = (now: number) => {
        if (stop) return;
        const dt = (now - last) / 1000; last = now; T += dt;
        const c = cast.current;
        c.step(dt);
        const { terminals: terms, selected: sel } = props.current;

        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.current.width, canvas.current.height);
        ctx.setTransform(k, 0, 0, k, offX, offY);
        ctx.imageSmoothingQuality = 'high';
        blit(bg, 0, 0);

        // 왼쪽 벽 tmux 모니터 — 붙어 있으면 초록, claude 가 돌면 보라 테두리
        terms.slice(0, 4).forEach((t, i) => {
          const z = 1.7 + i * 1.15, y = 1.85, x = 0.03;
          poly([[x, y + 0.33, z - 0.49], [x, y + 0.33, z + 0.49], [x, y - 0.33, z + 0.49], [x, y - 0.33, z - 0.49]], t.claude ? '#7f77dd' : '#2c2c2a');
          poly([[x, y + 0.27, z - 0.43], [x, y + 0.27, z + 0.43], [x, y - 0.27, z + 0.43], [x, y - 0.27, z - 0.43]], t.attached ? '#9fe1cb' : '#2a3a52');
        });

        const actors = [...c.actors.values()].sort((a, b) => (a.x + a.z) - (b.x + b.z));
        const seated = new Map<number, Agent['activity']>();
        for (const a of actors) if (sitting(a) && a.place.desk !== null) seated.set(a.place.desk, a.agent.activity);
        seated.forEach((act, d) => deskScreen(d, act, T));

        // 캐릭터의 그림 자리 (구운 픽셀)
        type Draw = { a: Actor; r: SpriteRect; ax: number; ay: number; s: number; x0: number; y0: number; x1: number; y1: number };
        const draws: Draw[] = [];
        for (const a of actors) {
          const sit = sitting(a);
          const r = atlas.characters[charKey(a.color, a.hair, sit, dirOf(a.rot))];
          if (!r) continue;
          const bob = a.moving && !RM ? Math.abs(Math.sin(a.t * 10)) * 0.08 : 0;
          const [ax, ay] = proj([a.x, bob, a.z]);
          const s = a.agent.kind === 'subagent' ? 0.72 : 1;
          draws.push({ a, r, ax, ay, s, x0: ax + r.ox * s, y0: ay + r.oy * s, x1: ax + (r.ox + r.w) * s, y1: ay + (r.oy + r.h) * s });
        }
        // 차례: 캐릭터(x+z) 사이에, 그 캐릭터를 가리는 가구를 끼운다
        const seq: { at: number; fn: () => void }[] = draws.map((d, i) => ({ at: i, fn: () => {
          const { a } = d;
          poly(circle(a.x, a.z, 0.3 * d.s), '#000', 0.12);   // 발 그림자
          const waiting = a.agent.activity === 'wait' && !a.moving && !a.leaving;
          if (waiting) ring(a.x, a.z, 0.42, 0.5, '#e24b4a', RM ? 0.8 : 0.5 + 0.4 * Math.sin(T * 5));
          else if (sel === a.agent.id) ring(a.x, a.z, 0.42, 0.5, '#534ab7', 0.45);
          blit(d.r, d.ax, d.ay, d.s);
        } }));
        for (const it of ITEMS) {
          const r = atlas.items[it.id];
          if (!r) continue;
          let after = -1;
          draws.forEach((d, i) => {
            if (inFront(d.a, it)) return;
            if (d.x1 < r.ox || d.x0 > r.ox + r.w || d.y1 < r.oy || d.y0 > r.oy + r.h) return;   // 겹치지 않는다
            after = Math.max(after, i);
          });
          if (after < 0) continue;
          const desk = it.kind === 'desk' ? Number(it.id.slice(4)) : -1;
          seq.push({ at: after + 0.5, fn: () => { blit(r, 0, 0); if (desk >= 0) deskScreen(desk, seated.get(desk), T); } });
        }
        seq.sort((a, b) => a.at - b.at).forEach((s) => s.fn());

        // 이름표 (HTML) — 하위 에이전트는 이름표 없이
        const live = new Set<string>();
        hits = [];
        for (const d of draws) {
          const { a } = d;
          hits.push({ id: a.agent.id, x0: d.x0 * k + offX, y0: d.y0 * k + offY, x1: d.x1 * k + offX, y1: d.y1 * k + offY });
          if (a.agent.kind === 'subagent' || a.leaving) continue;
          live.add(a.agent.id);
          let el = labelEls.get(a.agent.id);
          if (!el) { el = document.createElement('div'); labels.current.appendChild(el); labelEls.set(a.agent.id, el); }
          const wait = a.agent.activity === 'wait';
          const cls = 'lbl' + (wait ? ' wait' : '') + (sel === a.agent.id ? ' sel' : '');
          const html = `<i style="background:${hex(a.color)}"></i>${esc(a.agent.name)}${wait ? ` · ${STATE_TEXT.wait}${a.agent.guessed ? '?' : ''}` : ''}`;
          if (el.className !== cls) el.className = cls;
          if (el.dataset.h !== html) { el.innerHTML = html; el.dataset.h = html; }
          const [lx, ly] = proj([a.x, (sitting(a) ? 1.45 : 1.6), a.z]);
          el.style.transform = `translate(${(lx * k + offX) / dpr}px, ${(ly * k + offY) / dpr}px) translate(-50%, -100%)`;
        }
        for (const [id, el] of labelEls) if (!live.has(id)) { el.remove(); labelEls.delete(id); }
        // 터미널 이름표
        terms.slice(0, 4).forEach((t, i) => {
          const id = `tmux:${t.name}`;
          live.add(id);
          let el = labelEls.get(id);
          if (!el) { el = document.createElement('div'); el.className = 'tlbl'; labels.current.appendChild(el); labelEls.set(id, el); }
          el.textContent = t.name;
          const [lx, ly] = proj([0.03, 1.4, 1.7 + i * 1.15]);
          el.style.transform = `translate(${(lx * k + offX) / dpr}px, ${(ly * k + offY) / dpr}px) translate(-50%, 0)`;
        });

        raf = requestAnimationFrame(frame);
      };
      raf = requestAnimationFrame(frame);

      // 휠 확대(커서 기준) · 끌어 옮기기 · 누르기
      const el = canvas.current;
      const onWheel = (e: WheelEvent) => {
        e.preventDefault();
        const z0 = view.zoom;
        view.zoom = Math.min(4, Math.max(0.6, z0 * Math.exp(-e.deltaY * 0.0015)));
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

    let cleanup = () => {};
    return () => { stop = true; cancelAnimationFrame(raf); cleanup(); labelEls.forEach((el) => el.remove()); };
  }, []);

  return (
    <div ref={box} className="stage">
      <canvas ref={canvas} />
      <div ref={labels} className="labels" />
    </div>
  );
}

function esc(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
}
