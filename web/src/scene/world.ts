// 프로젝트 목록 → 건물. 프로젝트 사무실을 한 줄에 넷씩(이름 차례로) 뒤에서부터 늘어놓고, 줄마다 앞에 복도,
// 오른쪽 끝에 세로 통로, 맨 앞에 공용 블록(공용실·고객센터·휴게실). 줄 수는 프로젝트 수로 정해진다.
//
//   z=0  ┌ office office office office ┬ hall ┐   ← 뒤 벽
//        │ corridor ─────────────────────┤      │
//        │ office …                      │ hall │
//        │ corridor ─────────────────────┤      │
//        └ front (공용실 | 고객센터 | 휴게실)    ┘
import type { Rect } from './layout.ts';
import type { Office } from '../types.ts';
import {
  MODULES, DINO_D, OFFICE_WIDTH, CHAIR_DZ, ENTRANCE_W, CORRIDOR, OFFICE_W, OFFICE_D, ROW_D, PER_ROW, BUILDING_W, FRONT_D,
  type DeskKind, type ModuleType, type Plaque, type Seat, type Item,
} from './modules.ts';

export const MAX_ROWS = 3;   // 사무실 줄이 셋을 넘으면 남는 프로젝트는 공용실로
const ROW_W = PER_ROW * OFFICE_W;

// 프로젝트 → 사무실 모듈. 크기는 커밋 수(서버), 꾸밈은 프로젝트마다 (GSM 은 지도, rash-company 는 칙칙하게)
function officeModule(o: Office): ModuleType {
  if (o.name === 'GSM') return 'office-gsm';
  if (isRash(o.name) && o.size !== 's') return 'office-rash';
  return o.size === 's' ? 'office-s' : o.size === 'l' ? 'office-l' : 'office';
}
const BACKWALL: Record<string, ModuleType> = {
  'office-s': 'backwall-s', office: 'backwall', 'office-l': 'backwall-l', 'office-gsm': 'backwall-l', 'office-rash': 'backwall-rash',
};

export interface Placed { type: ModuleType; at: [number, number]; label?: string }
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
  core: [number, number][];
  bench: [number, number][];
  term: [number, number][];
  terminals: { x: number; y: number; z: number }[];
  stand: [number, number][];
  restroom: { male: [number, number][]; female: [number, number][] };
  search: { at: [number, number]; pose: 'sit' | 'stand'; face: number; on?: string; lift?: number }[];
  pen: { rect: Rect; feed: { at: [number, number]; face: number; dino: [number, number] }[]; feeder: [number, number] } | null;
  labels: Plaque[];
  door: [number, number];
}

export const isRash = (project: string) => /^rash-company/.test(project);

export function buildWorld(offices: Office[]): World {
  // 이름 차례로 한 줄(폭 ROW_W)에 채우고, 넘치면 다음 줄. 줄 끝 남는 자리는 빈 사무실
  const sorted = [...offices].sort((a, b) => a.name.localeCompare(b.name));
  const rowsOf: { type: ModuleType; x: number; label?: string }[][] = [[]];
  let x = 0;
  for (const o of sorted) {
    const type = officeModule(o);
    const w = MODULES[type].size[0];
    if (x + w > ROW_W + 1e-6) {
      if (rowsOf.length >= MAX_ROWS) continue;   // 자리가 없다 — 그 프로젝트는 공용실 책상으로
      rowsOf.push([]); x = 0;
    }
    rowsOf[rowsOf.length - 1].push({ type, x, label: o.name });
    x += w;
  }
  for (const row of rowsOf) {
    let end = row.reduce((m, r) => Math.max(m, r.x + MODULES[r.type].size[0]), 0);
    while (ROW_W - end >= OFFICE_WIDTH.m - 1e-6) { row.push({ type: 'office', x: end }); end += OFFICE_WIDTH.m; }
    while (ROW_W - end >= OFFICE_WIDTH.s - 1e-6) { row.push({ type: 'office-s', x: end }); end += OFFICE_WIDTH.s; }
  }
  const rows = rowsOf.length;
  const rooms = rowsOf.flat().filter((r) => r.label).map((r) => r.label!);
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
    modules.push({ type: 'corridor', at: [0, z0 + OFFICE_D] });
  });
  const frontZ = rows * ROW_D;
  modules.push({ type: 'front', at: [0, frontZ] });
  const entZ = frontZ - CORRIDOR;   // 마지막 복도 높이에서 통로 오른쪽으로
  modules.push({ type: 'entrance', at: [BUILDING_W, entZ] });
  modules.push({ type: 'service', at: [BUILDING_W, frontZ] });
  modules.push({ type: 'library', at: [BUILDING_W, 0] });
  const DINO_X = 17;                                     // 휴게실(앞 블록 x 17..31) 앞
  modules.push({ type: 'dino', at: [DINO_X, frontZ + FRONT_D] });

  const w: World = {
    w: BUILDING_W + ENTRANCE_W, d: frontZ + FRONT_D + DINO_D, modules, rooms,
    desks: [], items: [], blocks: [], lounge: [], core: [], bench: [], term: [], terminals: [], stand: [], labels: [],
    restroom: { male: [], female: [] }, search: [], pen: null,
    door: [BUILDING_W + ENTRANCE_W - 0.4, entZ + CORRIDOR / 2],
  };
  // 건물 밖은 입구 길만 걷는다
  if (entZ > OFFICE_D) w.blocks.push([BUILDING_W, OFFICE_D, w.w, entZ]);   // 자료실 아래 빈 곳
  // 공룡 방 양옆의 빈 곳 (앞 블록의 앞은 공룡 방 말고는 바닥이 없다) — 앞 블록 앞 가장자리에 걸음 막기
  const fz = frontZ + FRONT_D;
  w.blocks.push([0, fz - 0.06, DINO_X, w.d], [DINO_X + 14, fz - 0.06, w.w, w.d], [DINO_X, fz - 0.06, DINO_X + 1.0, fz + 0.06], [DINO_X + 2.4, fz - 0.06, DINO_X + 14, fz + 0.06]);
  const mv = (p: [number, number], o: [number, number]): [number, number] => [p[0] + o[0], p[1] + o[1]];
  const mr = (r: Rect, o: [number, number]): Rect => [r[0] + o[0], r[1] + o[1], r[2] + o[0], r[3] + o[1]];
  modules.forEach((m, i) => {
    const def = MODULES[m.type];
    const o = m.at;
    for (const it of def.items) w.items.push({ ...it, at: mv(it.at, o), box: mr(it.box, o), module: i, key: `${i}:${it.id}` });
    for (const b of def.blocks) w.blocks.push(mr(b, o));
    for (const d of def.desks) {
      if (d.slot === 'project' && !m.label) continue;   // 빈 사무실의 책상은 쓰지 않는다
      w.desks.push({ at: mv(d.at, o), kind: d.kind, room: d.slot === 'project' ? m.label! : d.slot, module: i, item: `${i}:${d.item}` });
    }
    for (const s of def.lounge ?? []) w.lounge.push({ ...s, at: mv(s.at, o), on: s.on ? `${i}:${s.on}` : undefined });
    w.core.push(...(def.core ?? []).map((p) => mv(p, o)));
    w.bench.push(...(def.bench ?? []).map((p) => mv(p, o)));
    w.term.push(...(def.term ?? []).map((p) => mv(p, o)));
    w.terminals.push(...(def.terminals ?? []).map((t) => ({ x: o[0] + 0.03, y: t.y, z: o[1] + t.z })));
    if (m.type === 'front') w.stand.push(...(def.stand ?? []).map((p) => mv(p, o)));
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
    for (const l of def.labels ?? []) w.labels.push({ ...l, at: mv(l.at, o) });
    // 사무실 명판 — 앞 칸막이 출입구 위 (빈 사무실은 이름 없이)
    if (m.type.startsWith('office') && m.label) {
      w.labels.push({ name: m.label, at: [o[0] + MODULES[m.type].size[0] / 2, o[1] + OFFICE_D], y: 1.55, axis: 'x', style: m.type === 'office-rash' ? 'rash' : 'project' });
    }
  });
  return w;
}

export const seatOf = (d: [number, number]): [number, number] => [d[0], d[1] + CHAIR_DZ];
export const waitSpotOf = (d: [number, number]): [number, number] => [d[0] + 0.75, d[1] + 1.65];
