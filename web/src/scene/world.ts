// 프로젝트 목록 → 건물. 프로젝트 사무실을 한 줄에 넷씩(이름 차례로) 뒤에서부터 늘어놓고, 줄마다 앞에 복도,
// 오른쪽 끝에 세로 통로, 맨 앞에 공용 블록(공용실·고객센터·휴게실). 줄 수는 프로젝트 수로 정해진다.
//
//   z=0  ┌ office office office office ┬ hall ┐   ← 뒤 벽
//        │ corridor ─────────────────────┤      │
//        │ office …                      │ hall │
//        │ corridor ─────────────────────┤      │
//        └ front (공용실 | 고객센터 | 휴게실)    ┘
import { defaultRoomName } from './names.ts';
import type { Rect } from './layout.ts';
import type { Office } from '../types.ts';
import {
  MODULES, TERRACE_D, DOOR_TOP, OFFICE_WIDTH, CHAIR_DZ, ENTRANCE_W, ENTRANCE_DOOR, CORRIDOR, OFFICE_W, OFFICE_D, ROW_D, PER_ROW, BUILDING_W, FRONT_D,
  DOWN_D, DOWN_DROP, VACANT_KINDS,
  type DeskKind, type ModuleType, type Plaque, type Seat, type Item, type Dining,
} from './modules.ts';

export const MAX_ROWS = 3;   // 사무실 줄이 셋을 넘으면 남는 프로젝트는 공용실로
const ROW_W = PER_ROW * OFFICE_W;

// 프로젝트 → 사무실 모듈. GSM 만 4인실(지도), 나머지는 모두 2인실 — 책상이 모자라면 공용실로 (사용자, 2026-10-26).
// 서버가 보내는 크기(커밋 수)는 이제 쓰지 않는다. rash-company 는 칙칙한 2인실
// 사막 방 — 방 열쇠(프로젝트 이름)로 정한다. 부서 이름은 사람이 고치므로 열쇠로 (shkim 「선호와 함께 춤을」, 사용자 2026-10-27)
// 햄부기(shkim/houdini)도 같은 꾸밈 — 사용자: 「햄부기 부서도 선호와함께춤을 부서의 특징들 그대로」(2026-11-09)
export const DESERT = new Set(['shkim/phyloserver', 'shkim/houdini']);
// 잔디 방 — 고사리와 작은 공룡 (paleoadmin 「고지리생태학 연구실」, 사용자 2026-11-09, wetherilli 027)
export const GARDEN = new Set(['paleoadmin/WegenersDream']);
export const themeOf = (room: string): 'desert' | 'fern' | undefined => DESERT.has(room) ? 'desert' : GARDEN.has(room) ? 'fern' : undefined;
function officeModule(o: Office): ModuleType {
  if (o.name === 'GSM') return 'office-gsm';
  if (DESERT.has(o.name)) return 'office-desert';
  if (GARDEN.has(o.name)) return 'office-fern';
  if (isRash(o.name)) return 'office-rash';
  return 'office-s';
}
const BACKWALL: Record<string, ModuleType> = {
  boss: 'backwall-boss', hq: 'backwall',
  'office-s': 'backwall', 'office-desert': 'backwall-desert', 'office-fern': 'backwall', 'vacant-0': 'backwall', 'vacant-1': 'backwall', 'vacant-2': 'backwall', 'vacant-3': 'backwall', office: 'backwall', 'office-gsm': 'backwall', 'office-rash': 'backwall-rash',
};

export interface Placed { type: ModuleType; at: [number, number]; label?: string; y?: number }   // y: 바닥 높이 (아래층은 −DOWN_DROP)
export interface WorldDesk { at: [number, number]; kind: DeskKind; room: string; module: number; item: string }
export interface WorldItem extends Item { module: number; key: string }   // key = `${module}:${id}`

export interface World {
  w: number;
  d: number;
  modules: Placed[];
  rooms: string[];                 // 사무실이 있는 프로젝트
  desks: WorldDesk[];
  items: WorldItem[];
  blocks: Rect[];
  lounge: Seat[];                  // on 은 WorldItem.key
  deskRest: Seat[];                // 상담원이 쉬는 자리
  core: [number, number][];
  bench: [number, number][];
  stand: [number, number][];
  restroom: { male: [number, number][]; female: [number, number][] };
  search: { at: [number, number]; pose: 'sit' | 'stand'; face: number; on?: string; lift?: number }[];
  breeze: { at: [number, number]; face: number }[];
  aqua: { view: { at: [number, number]; face: number; pose: 'sit' | 'stand'; on?: string; lift?: number }[]; tanks: { box: Rect; y0: number; y1: number }[] } | null;
  pen: { rect: Rect; feed: { at: [number, number]; face: number; dino: [number, number] }[]; feeder: [number, number] } | null;
  desert: { roam: Rect; home: [number, number]; room: string }[];   // 사막 방마다 — 전갈·선인장이 다니는 곳
  garden: { roam: Rect; nibble: { at: [number, number]; fern: [number, number] }[]; room: string }[];   // 잔디 방마다 — 작은 공룡이 다니는 곳
  labels: Plaque[];
  door: [number, number];
  // 아래층 식당가 (wetherilli 025) — 자리는 세계 좌표, on 은 WorldItem.key. dishY 는 세계 높이(바닥 높이를 더했다)
  dining: (Omit<Dining, 'seats'> & { seats: (Dining['seats'][number] & { key: string })[] })[];
  // 높이 — z ≥ z0 이면 아래층(y), 계단(landing·steps)은 위에서 아래로 이어진다. 아래층이 없으면 null
  lower: { z0: number; y: number; landing: Rect; steps: Rect } | null;
  lift: [number, number] | null;   // 식당가 엘리베이터 앞 — 점원·바깥 손님이 드나드는 곳 (wetherilli 026)
  top: number;                     // 위층 건물의 깊이 (배경이 아래 두 층 벽을 여기에 세운다) — d 는 아래층까지
}

export const isRash = (project: string) => /^rash-company/.test(project);

export function buildWorld(offices: Office[]): World {
  // 이름 차례로 한 줄(폭 ROW_W)에 채우고, 넘치면 다음 줄. 줄 끝 남는 자리는 빈 사무실
  // 다른 계정의 부서(「@계정」)는 프로젝트 사무실 뒤에
  const sorted = [...offices].sort((a, b) => Number(a.name.startsWith('@')) - Number(b.name.startsWith('@')) || a.name.localeCompare(b.name));
  const rowsOf: { type: ModuleType; x: number; label?: string }[][] = [[{ type: 'hq', x: 0 }]];   // 본부장실이 맨 앞
  let x = MODULES.hq.size[0];
  for (const o of sorted) {
    const type = officeModule(o);
    // 큰 사무실에는 부장실이 붙는다 — 한 줄에 같이 들어가야 한다
    const withBoss = type === 'office-gsm';
    const w = MODULES[type].size[0] + (withBoss ? MODULES.boss.size[0] : 0);
    if (x + w > ROW_W + 1e-6) {
      if (rowsOf.length >= MAX_ROWS) continue;   // 자리가 없다 — 그 프로젝트는 공용실 책상으로
      rowsOf.push([]); x = 0;
    }
    rowsOf[rowsOf.length - 1].push({ type, x, label: o.name });
    if (withBoss) rowsOf[rowsOf.length - 1].push({ type: 'boss', x: x + MODULES[type].size[0], label: o.name });
    x += w;
  }
  // 공실은 창고 갈래 넷 가운데 — 자리(줄·칸)로 고른다. 옆 칸·앞뒤 줄이 같은 갈래가 되지 않게 (사용자: 「붙어 있는 게 똑같이 나와 아쉽다」)
  rowsOf.forEach((row, ri) => {
    let end = row.reduce((m, r) => Math.max(m, r.x + MODULES[r.type].size[0]), 0);
    while (ROW_W - end >= OFFICE_WIDTH.m - 1e-6) {
      const col = Math.round(end / OFFICE_WIDTH.m);
      row.push({ type: `vacant-${(col + ri * 2) % VACANT_KINDS}` as ModuleType, x: end });
      end += OFFICE_WIDTH.m;
    }
  });
  const rows = rowsOf.length;
  const rooms = rowsOf.flat().filter((r) => r.label && r.type !== 'boss').map((r) => r.label!);
  const modules: Placed[] = [];
  // 벽 먼저 (그리는 차례도 이것을 따른다 — 뒤의 것부터)
  for (const r of rowsOf[0]) modules.push({ type: BACKWALL[r.type], at: [r.x, 0] });
  modules.push({ type: 'backwall-hall', at: [ROW_W, 0] });
  modules.push({ type: 'backwall-library', at: [BUILDING_W, 0] });
  for (let r = 0; r < rows; r++) modules.push({ type: 'leftwall', at: [0, r * ROW_D] });
  rowsOf.forEach((row, r) => {
    const z0 = r * ROW_D;
    for (const o of row) modules.push({ type: o.type, at: [o.x, z0], label: o.label });
    modules.push({ type: 'hall', at: [ROW_W, z0] });
    modules.push({ type: r < rows - 1 ? 'corridor-walled' : 'corridor', at: [0, z0 + OFFICE_D] });   // 뒤에 줄이 더 있으면 그 줄의 등을 막는다
  });
  const frontZ = rows * ROW_D;
  modules.push({ type: 'front', at: [0, frontZ] });
  const entZ = frontZ - CORRIDOR;   // 마지막 복도 높이에서 통로 오른쪽으로
  modules.push({ type: 'entrance', at: [BUILDING_W, entZ] });
  modules.push({ type: 'service', at: [BUILDING_W, frontZ] });
  modules.push({ type: 'library', at: [BUILDING_W, 0] });
  modules.push({ type: 'terrace', at: [0, frontZ + FRONT_D] });   // 앞 블록 앞 야외 — 수족관·공룡 울타리·파라솔
  const top = frontZ + FRONT_D + TERRACE_D;
  modules.push({ type: 'downstairs', at: [0, top], y: -DOWN_DROP });   // 테라스 앞, 반 층 아래 식당가

  const w: World = {
    w: BUILDING_W + ENTRANCE_W, d: top + DOWN_D, top, modules, rooms, dining: [], lower: null, lift: null,
    desks: [], items: [], blocks: [], lounge: [], deskRest: [], core: [], bench: [], stand: [], labels: [],
    restroom: { male: [], female: [] }, search: [], desert: [], garden: [], pen: null, aqua: null, breeze: [],
    door: [BUILDING_W + ENTRANCE_DOOR[0], entZ + ENTRANCE_DOOR[1]],   // 엘리베이터·계단 앞
  };
  // 건물 밖은 입구 길만 걷는다
  if (entZ > OFFICE_D) w.blocks.push([BUILDING_W, OFFICE_D, w.w, entZ]);   // 자료실 아래 빈 곳
  // 공룡 방 양옆의 빈 곳 (앞 블록의 앞은 공룡 방 말고는 바닥이 없다) — 앞 블록 앞 가장자리에 걸음 막기
  const fz = frontZ + FRONT_D;
  // 테라스는 건물 폭(0..31)만 — 그 오른쪽(화장실 아래)은 바닥이 없다. 건물과 테라스 사이는 테라스의 유리창과 문이 막는다
  w.blocks.push([BUILDING_W, fz, w.w, w.d]);
  const mv = (p: [number, number], o: [number, number]): [number, number] => [p[0] + o[0], p[1] + o[1]];
  const mr = (r: Rect, o: [number, number]): Rect => [r[0] + o[0], r[1] + o[1], r[2] + o[0], r[3] + o[1]];
  modules.forEach((m, i) => {
    const def = MODULES[m.type];
    const o = m.at;
    for (const it of def.items) w.items.push({ ...it, at: mv(it.at, o), box: mr(it.box, o), module: i, key: `${i}:${it.id}` });
    for (const b of def.blocks) w.blocks.push(mr(b, o));
    for (const d of def.desks) {
      if (d.slot === 'project' && !m.label) continue;   // 빈 사무실의 책상은 쓰지 않는다
      const room = d.slot === 'project' ? m.label! : d.slot === 'boss' ? `boss:${m.label ?? 'hq'}` : d.slot;
      w.desks.push({ at: mv(d.at, o), kind: d.kind, room, module: i, item: `${i}:${d.item}` });
    }
    for (const s of def.lounge ?? []) w.lounge.push({ ...s, at: mv(s.at, o), on: s.on ? `${i}:${s.on}` : undefined });
    for (const s of def.deskRest ?? []) w.deskRest.push({ ...s, at: mv(s.at, o), on: s.on ? `${i}:${s.on}` : undefined });
    w.core.push(...(def.core ?? []).map((p) => mv(p, o)));
    w.bench.push(...(def.bench ?? []).map((p) => mv(p, o)));
    if (m.type === 'front') w.stand.push(...(def.stand ?? []).map((p) => mv(p, o)));
    w.breeze.push(...(def.breeze ?? []).map((b) => ({ at: mv(b.at, o), face: b.face })));
    if (def.aqua) {
      w.aqua = {
        view: def.aqua.view.map((v) => ({ ...v, at: mv(v.at, o), on: v.on ? `${i}:${v.on}` : undefined })),
        tanks: def.aqua.tanks.map((t) => ({ ...t, box: mr(t.box, o) })),
      };
    }
    if (def.garden && m.label) w.garden.push({ roam: mr(def.garden.roam, o), nibble: def.garden.nibble.map((n) => ({ at: mv(n.at, o), fern: mv(n.fern, o) })), room: m.label });
    if (def.desert && m.label) w.desert.push({ roam: mr(def.desert.roam, o), home: mv(def.desert.home, o), room: m.label });
    if (def.pen) {
      const pn = def.pen;
      w.pen = {
        rect: mr(pn.rect, o), feeder: mv(pn.feeder, o),
        feed: pn.feed.map((f) => ({ at: mv(f.at, o), face: f.face, dino: mv(f.dino, o) })),
      };
    }
    for (const sp of def.search ?? []) w.search.push({ ...sp, at: mv(sp.at, o), on: sp.on ? `${i}:${sp.on}` : undefined });
    if (def.restroom) {
      w.restroom.male.push(...def.restroom.male.map((p) => mv(p, o)));
      w.restroom.female.push(...def.restroom.female.map((p) => mv(p, o)));
    }
    for (const l of def.labels ?? []) w.labels.push({ ...l, at: mv(l.at, o), y: l.y + (m.y ?? 0) });
    for (const dn of def.dining ?? []) {
      w.dining.push({
        shop: dn.shop,
        order: dn.order.map((p) => ({ ...p, at: mv(p.at, o) })),
        seats: dn.seats.map((st) => ({ ...st, at: mv(st.at, o), dish: mv(st.dish, o), dishY: st.dishY + (m.y ?? 0), key: `${i}:${st.on}` })),
        staff: dn.staff && {
          counter: { ...dn.staff.counter, at: mv(dn.staff.counter.at, o) },
          stations: dn.staff.stations.map((s) => ({ ...s, at: mv(s.at, o), cook: s.cook && [s.cook[0] + o[0], s.cook[1] + (m.y ?? 0), s.cook[2] + o[1]] as [number, number, number] })),
          wipe: dn.staff.wipe.map((s) => ({ ...s, at: mv(s.at, o) })),
        },
      });
    }
    if (def.lift) w.lift = mv(def.lift, o);
    if (def.flight) w.lower = { z0: o[1], y: m.y ?? 0, landing: mr(def.flight.landing, o), steps: mr(def.flight.steps, o) };
    // 사무실 명판 — 앞 칸막이 출입구 위 (빈 사무실은 이름 없이)
    if (m.type === 'boss' || m.type === 'hq') {
      w.labels.push({ name: m.type === 'hq' ? '본부장실' : `${m.label} 부장실`, at: [o[0] + MODULES[m.type].size[0] / 2, o[1] + OFFICE_D], y: DOOR_TOP + 0.12, axis: 'x', span: 1.4, style: 'boss' });
    }
    if (m.type.startsWith('office') && m.label) {
      w.labels.push({ name: defaultRoomName(m.label), room: m.label, at: [o[0] + MODULES[m.type].size[0] / 2, o[1] + OFFICE_D], y: DOOR_TOP + 0.12, axis: 'x', span: 1.4, style: m.type === 'office-rash' ? 'rash' : m.type === 'office-desert' ? 'old' : 'project',
        ...(m.type === 'office-desert' ? { tilt: -7 } : {}) });   // 사막 방 명판은 낡아 기울었다
    }
  });
  return w;
}

// 걷는 자리의 바닥 높이 — 위층 0, 아래층 lower.y, 계단 층참은 0, 단은 x 로 0 → lower.y
const inRect = (x: number, z: number, r: Rect) => x >= r[0] && x <= r[2] && z >= r[1] && z <= r[3];
export function heightAt(w: World, x: number, z: number): number {
  const L = w.lower;
  if (!L || z < L.z0) return 0;
  if (inRect(x, z, L.landing)) return 0;
  if (inRect(x, z, L.steps)) return L.y * Math.min(1, Math.max(0, (x - L.steps[0]) / (L.steps[2] - L.steps[0])));
  return L.y;
}

export const seatOf = (d: [number, number]): [number, number] => [d[0], d[1] + CHAIR_DZ];
export const waitSpotOf = (d: [number, number]): [number, number] => [d[0] + 0.75, d[1] + 1.65];
