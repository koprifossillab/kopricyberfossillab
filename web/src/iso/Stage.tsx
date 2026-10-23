// 2.5D 화면 — 구운 그림(sprites/)을 Canvas 2D 로 붙인다. three 를 싣지 않는다.
// 그리는 차례: 모든 모듈의 바닥 층 → 모든 모듈의 물건 층(뒤에서부터) → 벽 tmux 모니터·책상 모니터 빛
//            → [캐릭터 + 그 앞을 가리는 가구] 깊이 차례 → 이름표·말풍선(HTML)
import { useEffect, useMemo, useRef } from 'react';
import type { Agent, Office, Terminal } from '../types.ts';
import { bodyKey, headKey, loadAtlas, type SpriteRect } from './atlas.ts';
import { Cast, sitting, dirOf, type Actor } from './cast.ts';
import { SCREEN, PHOSPHOR, STATE_TEXT, HEAD_Y, SIT_LIFT, screenQuad } from '../scene/layout.ts';
import { buildWorld, type World, type WorldItem } from '../scene/world.ts';
import { Chatter } from './chatter.ts';

const RM = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
type V3 = [number, number, number];

const hex = (c: number) => '#' + c.toString(16).padStart(6, '0');

export function Stage({ agents, terminals, offices, selected, onSelect }: {
  agents: Agent[]; terminals: Terminal[]; offices: Office[]; selected: string | null; onSelect: (id: string | null) => void;
}) {
  const box = useRef<HTMLDivElement>(null!);
  const canvas = useRef<HTMLCanvasElement>(null!);
  const labels = useRef<HTMLDivElement>(null!);
  const cast = useRef(new Cast());
  const key = offices.map((o) => `${o.name}:${o.size}`).join('\n');
  const world = useMemo(() => buildWorld(offices), [key]);   // eslint-disable-line react-hooks/exhaustive-deps
  const props = useRef({ terminals, selected, onSelect, world });
  props.current = { terminals, selected, onSelect, world };

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
      let k = 1, offX = 0, offY = 0, dpr = 1;   // 구운 픽셀 → 캔버스 픽셀
      let fitted: World | null = null;
      let bounds = { x0: 0, y0: 0, x1: 1, y1: 1 };

      // 건물 전체가 들어가는 구운 픽셀 범위
      const measure = (w: World) => {
        let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
        for (const m of w.modules) {
          const ms = atlas.modules[m.type];
          const [ax, ay] = proj([m.at[0], 0, m.at[1]]);
          for (const r of [ms?.floor, ms?.objects]) {
            if (!r) continue;
            x0 = Math.min(x0, ax + r.ox); y0 = Math.min(y0, ay + r.oy);
            x1 = Math.max(x1, ax + r.ox + r.w); y1 = Math.max(y1, ay + r.oy + r.h);
          }
        }
        bounds = { x0, y0, x1, y1 };
      };
      const fit = () => {
        dpr = Math.min(2, window.devicePixelRatio || 1);
        const w = box.current.clientWidth, h = box.current.clientHeight;
        canvas.current.width = Math.round(w * dpr);
        canvas.current.height = Math.round(h * dpr);
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
      const moduleAt = (w: World, i: number) => proj([w.modules[i].at[0], 0, w.modules[i].at[1]]);

      const deskScreen = (w: World, d: number, act: Agent['activity'] | undefined, T: number) => {
        if (!act) return;
        const desk = w.desks[d];
        const q = screenQuad(desk.at[0], desk.at[1], desk.kind);
        const [cx, cy, cz] = q.c;
        const flick = act === 'code' && !RM && Math.sin(T * 14 + d) > 0.6;
        poly([[cx - q.w / 2, cy + q.h / 2, cz], [cx + q.w / 2, cy + q.h / 2, cz], [cx + q.w / 2, cy - q.h / 2, cz], [cx - q.w / 2, cy - q.h / 2, cz]],
          hex(desk.kind === 'rashdesk' ? PHOSPHOR : SCREEN[act]), flick ? 0.85 : 1);
      };

      // 캐릭터가 가구 앞인가 — 카메라가 +x·+z 쪽에서 보므로 앞면 너머에 있으면 앞이다. 앉은 가구(소파·카페 의자)는 가리지 않는다
      const inFront = (a: Actor, it: WorldItem) => a.x > it.box[2] || a.z > it.box[3] || (sitting(a) && a.place.on === it.key);

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
        const { terminals: terms, selected: sel, world: w } = props.current;
        if (fitted !== w) { fitted = w; measure(w); fit(); }
        const c = cast.current;
        c.step(dt);

        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.current.width, canvas.current.height);
        ctx.setTransform(k, 0, 0, k, offX, offY);
        ctx.imageSmoothingQuality = 'high';
        // 바닥 층 전부, 그다음 물건 층 (모듈 차례 = 뒤에서부터)
        w.modules.forEach((m, i) => { const r = atlas.modules[m.type]?.floor; if (r) { const [ax, ay] = moduleAt(w, i); blit(r, ax, ay); } });
        w.modules.forEach((m, i) => { const r = atlas.modules[m.type]?.objects; if (r) { const [ax, ay] = moduleAt(w, i); blit(r, ax, ay); } });

        // 왼쪽 벽 tmux 모니터 — 붙어 있으면 초록, claude 가 돌면 보라 테두리
        terms.slice(0, w.terminals.length).forEach((t, i) => {
          const { x, y, z } = w.terminals[i];
          poly([[x, y + 0.33, z - 0.4], [x, y + 0.33, z + 0.4], [x, y - 0.33, z + 0.4], [x, y - 0.33, z - 0.4]], t.claude ? '#7f77dd' : '#2c2c2a');
          poly([[x, y + 0.27, z - 0.34], [x, y + 0.27, z + 0.34], [x, y - 0.27, z + 0.34], [x, y - 0.27, z - 0.34]], t.attached ? '#9fe1cb' : '#2a3a52');
        });

        const actors = [...c.actors.values()].sort((a, b) => (a.x + a.z) - (b.x + b.z));
        const seated = new Map<number, Agent['activity']>();
        for (const a of actors) if (sitting(a) && a.place.desk !== null) seated.set(a.place.desk, a.agent.activity);
        seated.forEach((act, d) => deskScreen(w, d, act, T));

        // 캐릭터의 그림 자리 (구운 픽셀) — 몸 위에 머리를 겹친다
        type Draw = { a: Actor; body: SpriteRect; head: SpriteRect; bx: number; by: number; hx: number; hy: number; s: number; x0: number; y0: number; x1: number; y1: number };
        const draws: Draw[] = [];
        for (const a of actors) {
          const sit = sitting(a);
          const L = a.look;
          const body = atlas.bodies[bodyKey(a.color, L.shape, sit)];
          const head = atlas.heads[headKey(L.skin, L.look, L.cap, dirOf(a.rot))];
          if (!body || !head) continue;
          const bob = a.moving && !RM ? Math.abs(Math.sin(a.t * 10)) * 0.08 : 0;
          const lift = sit ? (a.place.lift ?? 0) : 0;
          const s = a.agent.kind === 'subagent' ? 0.72 : 1;
          const [bx, by] = proj([a.x, bob + lift, a.z]);
          const [hx, hy] = proj([a.x, bob + lift + (HEAD_Y + (sit ? SIT_LIFT : 0)) * s, a.z]);
          const x0 = Math.min(bx + body.ox * s, hx + head.ox * s), y0 = Math.min(by + body.oy * s, hy + head.oy * s);
          const x1 = Math.max(bx + (body.ox + body.w) * s, hx + (head.ox + head.w) * s), y1 = Math.max(by + (body.oy + body.h) * s, hy + (head.oy + head.h) * s);
          draws.push({ a, body, head, bx, by, hx, hy, s, x0, y0, x1, y1 });
        }
        // 차례: 캐릭터(x+z) 사이에, 그 캐릭터를 가리는 가구를 끼운다
        const seq: { at: number; fn: () => void }[] = draws.map((d, i) => ({ at: i, fn: () => {
          const { a } = d;
          if (!sitting(a)) poly(circle(a.x, a.z, 0.3 * d.s), '#000', 0.12);   // 발 그림자
          const waiting = a.agent.activity === 'wait' && !a.moving && !a.leaving;
          if (waiting) ring(a.x, a.z, 0.42, 0.5, '#e24b4a', RM ? 0.8 : 0.5 + 0.4 * Math.sin(T * 5));
          else if (sel === a.agent.id) ring(a.x, a.z, 0.42, 0.5, '#534ab7', 0.45);
          blit(d.body, d.bx, d.by, d.s);
          blit(d.head, d.hx, d.hy, d.s);
        } }));
        for (const it of w.items) {
          const r = atlas.modules[w.modules[it.module].type]?.items[it.id];
          if (!r) continue;
          const [ax, ay] = moduleAt(w, it.module);
          let after = -1;
          draws.forEach((d, i) => {
            if (inFront(d.a, it)) return;
            if (d.x1 < ax + r.ox || d.x0 > ax + r.ox + r.w || d.y1 < ay + r.oy || d.y0 > ay + r.oy + r.h) return;   // 겹치지 않는다
            after = Math.max(after, i);
          });
          if (after < 0) continue;
          const desk = w.desks.findIndex((dk) => dk.item === it.key);
          seq.push({ at: after + 0.5, fn: () => { blit(r, ax, ay); if (desk >= 0) deskScreen(w, desk, seated.get(desk), T); } });
        }
        seq.sort((a, b) => a.at - b.at).forEach((s) => s.fn());

        // 이름표 (HTML) — 하위 에이전트는 이름표 없이
        const live = new Set<string>();
        hits = [];
        for (const d of draws) {
          const { a } = d;
          hits.push({ id: a.agent.id, x0: d.x0 * k + offX, y0: d.y0 * k + offY, x1: d.x1 * k + offX, y1: d.y1 * k + offY });
          if (a.agent.kind === 'subagent' || a.leaving) continue;
          // 휴게실에 앉은 사람은 이름표를 숨긴다 (겹친다) — 말할 때 말풍선에 이름이 붙고, 고르면 보인다
          const resting = a.agent.activity === 'idle' && !!a.place.group && !a.moving;
          if (resting && sel !== a.agent.id) continue;
          live.add(a.agent.id);
          const wait = a.agent.activity === 'wait';
          const top = (sitting(a) ? 1.45 + SIT_LIFT : 1.6) + (sitting(a) ? (a.place.lift ?? 0) : 0);
          label(a.agent.id, 'lbl' + (wait ? ' wait' : '') + (sel === a.agent.id ? ' sel' : ''),
            `<i style="background:${hex(a.color)}"></i>${esc(a.agent.name)}${wait ? ` · ${STATE_TEXT.wait}${a.agent.guessed ? '?' : ''}` : ''}`,
            [a.x, top, a.z], 'translate(-50%, -100%)');
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
        chatter.keep(new Set(groups.keys()));
        if (!RM) groups.forEach((members, name) => {
          members.sort((p, q) => (p.agent.id < q.agent.id ? -1 : 1));
          const said = chatter.step(name, members.map((m) => m.agent.id), T);
          if (!said) return;
          const a = members.find((m) => m.agent.id === said.who);
          if (!a) return;
          const id = `bubble:${a.agent.id}`;
          live.add(id);
          labelEls.get(a.agent.id)?.remove(); labelEls.delete(a.agent.id);   // 이름표 대신 말풍선
          label(id, 'bubble', `<small style="color:${hex(a.color)}">${esc(a.agent.name)}</small>${esc(said.text)}`,
            [a.x, 1.75 + SIT_LIFT + (a.place.lift ?? 0), a.z], 'translate(-50%, -100%)');
        });
        // 방 이름표 — 바닥 앞 모서리에, 프로젝트 사무실은 굵게
        for (const r of w.labels) {
          const id = `room:${r.name}:${r.at.join(',')}`;
          live.add(id);
          label(id, r.project ? 'rlbl proj' : 'rlbl', esc(r.name), [r.at[0], 0, r.at[1]], 'translate(0, -50%)');
        }
        // 터미널 이름표
        terms.slice(0, w.terminals.length).forEach((t, i) => {
          const id = `tmux:${t.name}`;
          live.add(id);
          const { x, z } = w.terminals[i];
          label(id, 'tlbl', esc(t.name), [x, 1.42, z], 'translate(-50%, 0)');
        });
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
      <canvas ref={canvas} />
      <div ref={labels} className="labels" />
    </div>
  );
}

function esc(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
}
