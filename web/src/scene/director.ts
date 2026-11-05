// Snapshot → 캐릭터마다 갈 자리와 자세. 장소는 활동에서 정해진다:
//   책상은 방에서 받는다 — 프로젝트 세션은 그 프로젝트 사무실(차면 공용실), 프로젝트가 없거나 고객센터 세션(다른 세션의 지령)이면 공용실.
//   고객센터의 상담 책상 하나는 상담원 것 — 상담원은 쉴 때도 고객센터 소파에 머문다(가끔 화장실만)
//   code·read·run·think·spawn → 자기 책상(앉음)   wait → 책상 옆(서서 빨간 링)
//   git → 코어 보관대   test → 현미경 책상   search → 자료실   idle → 휴게실 (소파·카페 의자에 앉거나 커피 머신 앞)
//   휴게실 사람은 낮은 확률로 화장실(생김새의 성별대로)에 잠깐 다녀온다 — 시간 창마다 정해져 다시 그려도 같다
//   끼니(아침 7–8·점심 12–14·저녁 18–20)에는 쉬는 사람이 제비로 아래층 식당가에 간다 — 카운터·키오스크에서 주문 → 자리에서 먹기 → 돌아오기 (meals.ts).
//   먹다가 바빠지면 일하러 가고, 그 끼니엔 다시 오지 않는다(불평 말풍선은 cast.ts)
//   하위 에이전트 → 부모 책상 곁   다른 계정 → 바쁘면 화이트보드 앞, 아니면 휴게실
//   tmux 사람 → 명령이 돌면 공용실 책상(차 있으면 서는 자리), 아니면 휴게실
// 책상과 휴게실 자리는 한 번 받으면 떠날 때까지 그대로 — 남이 일어나도 자리를 옮기지 않는다.
import type { Agent } from '../types.ts';
import { PALETTE, FOREIGN_COLOR } from './layout.ts';
import { SEAT_LIFT } from './modules.ts';
import { seatOf, waitSpotOf, type World } from './world.ts';
import { isFemale } from './appearance.ts';
import { mealPlan, type Food, type Shop } from './meals.ts';
import { clerksAt, guestsAt, type ClerkPhase, type Post } from './staff.ts';

const TRIP_WINDOW = 90;   // 초 — 이 창마다 한 번 제비뽑기
const TRIP_ODDS = 8;      // 8 분의 1
// 시간 창마다 제비뽑기 — 창(초)·확률(1/odds)·머무는 시간(초)·salt 로 볼일마다 따로 뽑는다
function trip(id: string, now: number, window: number, odds: number, stay: [number, number], salt: number): boolean {
  const slot = Math.floor(now / 1000 / window);
  let h = slot * 7919 + salt;
  for (let i = 0; i < id.length; i++) h = (Math.imul(h, 31) + id.charCodeAt(i)) | 0;
  h = Math.abs(h ^ (h >>> 13));
  if (h % odds) return false;
  const len = stay[0] + (h % (stay[1] - stay[0] + 1));
  const start = 5 + ((h >>> 4) % Math.max(1, window - len - 10));
  const t = now / 1000 - slot * window;
  return t >= start && t < start + len;
}
const FEED_WINDOW = 120, FEED_ODDS = 6;   // 2분 창마다 6분의 1, 25~40초 — 공룡 먹이 주기
const AQUA_WINDOW = 150, AQUA_ODDS = 5;   // 2분 반 창마다 5분의 1, 30~50초 — 수족관 구경
const BREEZE_WINDOW = 100, BREEZE_ODDS = 6;   // 100초 창마다 6분의 1, 20~40초 — 테라스 난간에서 바람 쐬기
function restroomTrip(id: string, now: number): boolean {
  const slot = Math.floor(now / 1000 / TRIP_WINDOW);
  let h = slot;
  for (let i = 0; i < id.length; i++) h = (Math.imul(h, 31) + id.charCodeAt(i)) | 0;
  h = Math.abs(h ^ (h >>> 13));
  if (h % TRIP_ODDS) return false;
  const stay = 15 + (h % 11);                               // 15~25 초
  const start = 10 + ((h >>> 4) % (TRIP_WINDOW - 40));      // 창 안의 어느 때
  const t = now / 1000 - slot * TRIP_WINDOW;
  return t >= start && t < start + stay;
}

export type Pose = 'sit' | 'stand';

export interface Placement {
  target: [number, number];
  pose: Pose;
  face: number;          // 도착하면 바라볼 방향 (y 회전)
  desk: number | null;   // 모니터를 켤 책상 (world.desks 의 번호)
  on?: string;           // 앉는 가구 (WorldItem.key — 그 가구가 캐릭터를 가리지 않는다)
  lift?: number;         // 앉은 그림을 더 올리는 만큼
  group?: string;        // 휴게실에서 함께 이야기하는 무리 (식당: order:<가게> · meal:<가게>:<탁자>)
  food?: Food;           // 식당에서 시킨 것 — 먹는 동안 dish 자리에 그 그림을 놓는다
  dish?: { at: [number, number]; y: number; rot: number };
  cook?: [number, number, number];   // 점원이 조리 중 — 이 자리(세계 좌표, 높이 포함)에 김·지글거림
}

// 세션이 아닌 사람 — 식당가 점원과 바깥 손님 (wetherilli 026, staff.ts). 자리는 같은 Map 에 id 로 들어간다.
// crowd: 그 가게가 붐비나(busy)·한산하나(quiet) — 점원 대사가 고른다
export type Crowd = 'busy' | 'quiet' | 'normal';
export interface Extra {
  id: string; role: 'clerk' | 'guest'; shop: Shop; crowd: Crowd;
  post?: Post; phase?: ClerkPhase | 'order' | 'eat' | 'visit';
}

// 책상·휴게실 자리 번호는 건물마다 다르다 — 건물이 바뀌면 처음부터 다시 받는다
const deskOf = new Map<string, number>();
const seatAt = new Map<string, number>();   // 휴게실 자리
let builtFor: World | null = null;
const mealSeen = new Map<string, string>();      // 식당에 보낸 사람 → 그 끼니 (바빠졌는지 보려고)
const mealBroken = new Map<string, string>();    // 먹다 불려 간 사람 → 그 끼니 (다시 보내지 않는다)
// 바깥 손님 — 처음 볼 때 자리가 넉넉해야 온다(오지 않기로 하면 그 끼니엔 끝), 앉은 자리·구경 자리는 될 수 있으면 그대로
const guestCame = new Map<string, boolean>();
const guestSeat = new Map<string, string>();
const guestSpot = new Map<string, string>();
export const GUEST_MIN_FREE = 3;   // 가게에 빈자리가 이만큼은 있어야 손님이 온다 — 세션 사람 자리를 남긴다

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function colorOf(a: Agent, all: Agent[]): number {
  if (a.kind === 'foreign') return FOREIGN_COLOR;
  if (a.parentId) {
    const p = all.find((x) => x.id === a.parentId);
    if (p) return colorOf(p, all);
  }
  return PALETTE[hash(a.id) % PALETTE.length];
}

const resting = (a: Agent) => a.activity === 'idle' && a.kind !== 'subagent';

function assignDesks(w: World, agents: Agent[]): void {
  const taken = new Set(deskOf.values());
  const room = (i: number) => w.desks[i].room;
  // 하위 에이전트도 사람처럼 책상에 앉는다 — 부모가 앉은 방의 빈 책상, 없으면 부모 곁에 선다 (사용자: 「에이전트도 사람같이」)
  // 부모가 먼저 책상을 받아야 그 방을 안다 — 하위 에이전트는 뒤에
  const order = [...agents.filter((a) => a.kind !== 'subagent'), ...agents.filter((a) => a.kind === 'subagent')];
  for (const a of order) {
    if (a.kind === 'subagent') {
      const pd = a.parentId ? deskOf.get(a.parentId) : undefined;
      const want = pd !== undefined ? room(pd) : null;
      const has = deskOf.get(a.id);
      if (want === null) { if (has !== undefined) { deskOf.delete(a.id); taken.delete(has); } continue; }
      if (has !== undefined && room(has) === want) continue;
      const free = w.desks.findIndex((_, i) => !taken.has(i) && room(i) === want);
      if (has !== undefined) { deskOf.delete(a.id); taken.delete(has); }
      if (free >= 0) { deskOf.set(a.id, free); taken.add(free); }
      continue;
    }
    if (a.kind !== 'session' && a.kind !== 'job' && a.kind !== 'terminal' && a.kind !== 'desk' && a.kind !== 'foreign') continue;
    if (a.kind === 'terminal' && a.activity === 'idle') { deskOf.delete(a.id); continue; }   // tmux 는 명령이 돌 때만 책상에
    // 부장은 그 프로젝트의 부장실, 없으면 본부장실, 그것도 차면 제 방
    const want = a.role === 'boss'
      ? [`boss:${a.room}`, 'boss:hq', a.room].find((r) => w.desks.some((d, i) => d.room === r && (!taken.has(i) || deskOf.get(a.id) === i))) ?? a.room
      : a.room === 'center' && a.kind !== 'desk' ? 'general' : a.room;   // 상담 책상은 상담원 것
    const has = deskOf.get(a.id);
    if (has !== undefined && room(has) === want) continue;
    // 방이 바뀌었으면 그 방에 빈 책상이 있을 때만 옮긴다 (없으면 있던 책상에 그대로)
    const free = w.desks.findIndex((_, i) => !taken.has(i) && room(i) === want);
    if (free < 0) {
      if (has === undefined) {
        // 그 방이 꽉 찼거나 없으면 공용실로 (고객센터 책상은 상담원만)
        const any = (a.kind === 'desk' ? ['center', 'general'] : ['general']).map((r) => w.desks.findIndex((_, i) => !taken.has(i) && room(i) === r)).find((i) => i >= 0);
        if (any !== undefined) { deskOf.set(a.id, any); taken.add(any); }
      }
      continue;
    }
    if (has !== undefined) taken.delete(has);
    deskOf.set(a.id, free);
    taken.add(free);
  }
}

// 휴게실 자리 — 한곳에 몰리지 않게. 새로 온 사람은 열에 넷은 사람이 있는 무리에 끼어(이야기하러), 나머지는 빈 무리
// (빈 카페 탁자·소파·커피 머신)를 골라 앉는다. 고르기는 id 로 정해 다시 그려도 같은 자리, 받은 자리는 떠날 때까지 그대로
function seatHash(id: string, salt: number): number {
  let h = salt;
  for (let i = 0; i < id.length; i++) h = (Math.imul(h, 31) + id.charCodeAt(i)) | 0;
  h ^= h >>> 15; h = Math.imul(h, 0x2c1b3c6d); h ^= h >>> 12;
  return Math.abs(h);
}
function assignSeats(w: World, agents: Agent[]): void {
  const want = new Set(agents.filter((a) => resting(a) && !(a.kind === 'desk' && w.deskRest.length)).map((a) => a.id));
  for (const id of seatAt.keys()) if (!want.has(id)) seatAt.delete(id);
  const taken = new Set(seatAt.values());
  for (const a of agents) {
    if (!want.has(a.id) || seatAt.has(a.id)) continue;
    const free = w.lounge.map((_, i) => i).filter((i) => !taken.has(i));
    if (!free.length) continue;
    const used = new Set([...taken].map((i) => w.lounge[i].group));
    const join = seatHash(a.id, 1) % 10 < 4;
    // 앉는 자리를 먼저 — 서는 자리(커피 머신 앞·통로)는 앉을 데가 없을 때
    const sitFirst = (list: number[]) => { const sit = list.filter((i) => w.lounge[i].pose === 'sit'); return sit.length ? sit : list; };
    let pool = sitFirst(free.filter((i) => (join ? used.has(w.lounge[i].group) : !used.has(w.lounge[i].group))));
    if (!pool.length) pool = sitFirst(free);
    // 무리를 먼저 고르고(무리마다 같은 몫), 그 안에서 자리
    const groups = [...new Set(pool.map((i) => w.lounge[i].group))];
    const g = groups[seatHash(a.id, 2) % groups.length];
    const inG = pool.filter((i) => w.lounge[i].group === g);
    const pick = inG[seatHash(a.id, 3) % inG.length];
    seatAt.set(a.id, pick);
    taken.add(pick);
  }
}

// 식당 자리 — 주문 자리는 차례로(넘치면 뒤에 줄), 먹는 자리는 사람마다 정해 둔 자리부터 빈 곳. 반쯤은 이미 누가 앉은 탁자에 낀다(같이 먹으며 이야기)
function mealPlace(w: World, a: Agent, plan: NonNullable<ReturnType<typeof mealPlan>>, used: { order: Map<string, number>; seats: Set<string>; tables: Set<string> }): Placement | null {
  const dn = w.dining.find((d) => d.shop === plan.shop);
  if (!dn || !dn.order.length || !dn.seats.length) return null;
  if (plan.phase === 'order') {
    const n = used.order.get(dn.shop) ?? 0;
    used.order.set(dn.shop, n + 1);
    const o = dn.order[(n + plan.seed) % dn.order.length];
    const lap = Math.floor(n / dn.order.length);
    return { target: [o.at[0], o.at[1] + lap * 0.55], pose: 'stand', face: o.face, desk: null, group: `order:${dn.shop}` };
  }
  const free = dn.seats.map((_, i) => i).filter((i) => !used.seats.has(dn.seats[i].key));
  if (!free.length) return null;
  const join = free.filter((i) => used.tables.has(`${dn.shop}:${dn.seats[i].table}`));
  const pool = join.length && plan.seed % 2 ? join : free;
  const st = dn.seats[pool[(plan.seed >>> 3) % pool.length]];
  used.seats.add(st.key); used.tables.add(`${dn.shop}:${st.table}`);
  return {
    target: st.at, pose: 'sit', face: st.face, desk: null, on: st.key, lift: st.lift, group: `meal:${dn.shop}:${st.table}`,
    food: plan.food, dish: { at: st.dish, y: st.dishY, rot: st.face + Math.PI },
  };
}

// hour — 화면의 지역 시각(시, 소수). forceMeal — 화면 확인용(?meal): 끼니와 상관없이 쉬는 사람이 다 식당을 오간다
// extras — 주면 점원·바깥 손님을 채워 넣는다(자리는 돌려주는 Map 에 같이)
export function direct(w: World, agents: Agent[], now = Date.now(), opts: { hour?: number; forceMeal?: boolean; extras?: Extra[] } = {}): Map<string, Placement> {
  if (builtFor !== w) { deskOf.clear(); seatAt.clear(); builtFor = w; }
  const hour = opts.hour ?? (() => { const d = new Date(now); return d.getHours() + d.getMinutes() / 60 + d.getSeconds() / 3600; })();
  const meals = { order: new Map<string, number>(), seats: new Set<string>(), tables: new Set<string>() };
  const live = new Set(agents.map((a) => a.id));
  for (const id of deskOf.keys()) if (!live.has(id)) deskOf.delete(id);
  assignDesks(w, agents);
  assignSeats(w, agents);

  const out = new Map<string, Placement>();
  const testTaken = new Set<number>();
  const queue = { core: 0, bench: 0, board: 0, extra: 0, search: 0, male: 0, female: 0, feed: 0, aqua: 0, breeze: 0 };
  const CORE_SPOTS = w.core, BENCH_SPOTS = w.bench, BOARD_SPOTS = w.stand;
  const children = new Map<string, number>();
  const spot = (list: [number, number][], key: keyof typeof queue): [number, number] => {
    const n = queue[key]++;
    const base = list[n % list.length];
    const lap = Math.floor(n / list.length);   // 자리가 모자라면 조금씩 비켜 선다
    return [base[0] + lap * 0.45, base[1] + lap * 0.35];
  };
  const lounge = (a: Agent): Placement => {
    const i = seatAt.get(a.id);
    if (i === undefined) return { target: spot(BOARD_SPOTS, 'extra'), pose: 'stand', face: Math.PI, desk: null };
    const s = w.lounge[i];
    return { target: s.at, pose: s.pose, face: s.face, desk: null, on: s.on, lift: s.lift, group: s.group };
  };

  for (const a of agents) {
    const desk = deskOf.get(a.id) ?? null;
    // 끼니 — 쉬는 사람(하위 에이전트 빼고, 상담원 포함)은 제비에 뽑히면 식당에. 먹다 바빠진 사람은 그 끼니엔 다시 안 온다
    if (a.kind !== 'subagent' && w.dining.length) {
      const plan = mealPlan(a.id, now, hour, opts.forceMeal);
      const seen = mealSeen.get(a.id);
      if (seen && (!plan || plan.key !== seen)) mealSeen.delete(a.id);
      if (plan && seen === plan.key && !resting(a)) { mealBroken.set(a.id, plan.key); mealSeen.delete(a.id); }
      if (mealBroken.has(a.id) && mealBroken.get(a.id) !== plan?.key) mealBroken.delete(a.id);
      if (plan && resting(a) && mealBroken.get(a.id) !== plan.key) {
        const p = mealPlace(w, a, plan, meals);
        if (p) { mealSeen.set(a.id, plan.key); out.set(a.id, p); continue; }
      }
    }
    if (a.kind === 'subagent' && desk === null) {   // 책상을 못 받은 하위 에이전트는 부모 곁에 선다
      const pd = a.parentId ? deskOf.get(a.parentId) : undefined;
      const n = children.get(a.parentId ?? '') ?? 0;
      children.set(a.parentId ?? '', n + 1);
      if (pd !== undefined) {
        const [x, z] = w.desks[pd].at;
        out.set(a.id, { target: [x - 0.75 - (n % 3) * 0.5, z + 1.3 + Math.floor(n / 3) * 0.5], pose: 'stand', face: Math.PI * 0.75, desk: null });
      } else {
        out.set(a.id, { target: spot(BOARD_SPOTS, 'board'), pose: 'stand', face: Math.PI, desk: null });
      }
      continue;
    }
    if (resting(a) && a.kind === 'desk' && w.deskRest.length) {
      // 상담원 — 고객센터 소파에서 쉰다. 다른 볼일(공룡·수족관·테라스)은 없고 화장실만 가끔
      if (restroomTrip(a.id, now)) {
        const side = isFemale(a.id) ? 'female' : 'male';
        const list = w.restroom[side];
        if (list.length) { out.set(a.id, { target: list[queue[side]++ % list.length], pose: 'stand', face: Math.PI, desk: null }); continue; }
      }
      const s = w.deskRest[0];
      out.set(a.id, { target: s.at, pose: s.pose, face: s.face, desk: null, on: s.on, lift: s.lift, group: s.group });
      continue;
    }
    if (resting(a)) {
      if (restroomTrip(a.id, now)) {
        const side = isFemale(a.id) ? 'female' : 'male';
        const list = w.restroom[side];
        if (list.length) { out.set(a.id, { target: list[queue[side]++ % list.length], pose: 'stand', face: Math.PI, desk: null }); continue; }
      }
      if (w.pen && queue.feed < w.pen.feed.length && trip(a.id, now, FEED_WINDOW, FEED_ODDS, [25, 40], 101)) {
        const i = queue.feed++;
        const f = w.pen.feed[i];
        out.set(a.id, { target: f.at, pose: 'stand', face: f.face, desk: null, group: `feed${i}` });
        continue;
      }
      if (w.aqua && queue.aqua < w.aqua.view.length && trip(a.id, now, AQUA_WINDOW, AQUA_ODDS, [30, 50], 303)) {
        const v = w.aqua.view[queue.aqua++];
        out.set(a.id, { target: v.at, pose: v.pose, face: v.face, desk: null, on: v.on, lift: v.lift, group: 'aqua' });
        continue;
      }
      if (queue.breeze < w.breeze.length && trip(a.id, now, BREEZE_WINDOW, BREEZE_ODDS, [20, 40], 404)) {
        const b = w.breeze[queue.breeze++];
        out.set(a.id, { target: b.at, pose: 'stand', face: b.face, desk: null, group: 'breeze' });
        continue;
      }
      out.set(a.id, lounge(a));
      continue;
    }
    if (a.kind === 'foreign' && desk === null) {   // 제 부서 책상이 없을 때만 (예전 서버는 room 이 general 이었다)
      out.set(a.id, { target: spot(BOARD_SPOTS, 'board'), pose: 'stand', face: Math.PI, desk: null });
      continue;
    }
    switch (a.activity) {
      case 'search': {
        const sp = w.search[queue.search++ % Math.max(1, w.search.length)];
        out.set(a.id, sp
          ? { target: sp.at, pose: sp.pose, face: sp.face, desk: null, on: sp.on, lift: sp.lift }
          : { target: spot(BOARD_SPOTS, 'board'), pose: 'stand', face: Math.PI, desk: null });
        break;
      }
      case 'git':
        out.set(a.id, { target: spot(CORE_SPOTS, 'core'), pose: 'stand', face: -Math.PI / 2, desk: null });
        break;
      case 'test': {
        // 시험 자리를 옮겨 다닌다 — 사람마다 10초 남짓(9~13초)마다 다음 자리, 남이 선 자리는 건너뛴다
        const n = BENCH_SPOTS.length;
        const period = 9 + (seatHash(a.id, 5) % 5);
        let i = (seatHash(a.id, 6) + Math.floor(now / 1000 / period)) % n;
        for (let k = 0; k < n && testTaken.has(i); k++) i = (i + 1) % n;
        testTaken.add(i);
        const [tx, tz] = BENCH_SPOTS[i];
        // 현미경 앞이면 칸막이 쪽(+x), 테이블 뒤쪽 줄은 +z, 앞쪽 줄은 −z 를 본다 (모듈 안 좌표가 아니라 세계 좌표라 줄은 테이블 z 로 가른다)
        const tableZ = (BENCH_SPOTS[3][1] + BENCH_SPOTS[6][1]) / 2;
        out.set(a.id, { target: [tx, tz], pose: 'stand', face: i < 3 ? Math.PI / 2 : (tz < tableZ ? 0 : Math.PI), desk: null });
        break;
      }
      case 'wait':
        out.set(a.id, desk !== null
          ? { target: waitSpotOf(w.desks[desk].at), pose: 'stand', face: Math.PI * 0.75, desk: null }
          : { target: spot(BOARD_SPOTS, 'board'), pose: 'stand', face: Math.PI, desk: null });
        break;
      default:
        out.set(a.id, desk !== null
          ? { target: seatOf(w.desks[desk].at), pose: 'sit', face: Math.PI, desk, on: w.desks[desk].item, lift: SEAT_LIFT[w.desks[desk].kind] }
          : { target: spot(BOARD_SPOTS, 'board'), pose: 'stand', face: Math.PI, desk: null });   // 책상이 모자라면 화이트보드 앞
    }
  }
  if (opts.extras && w.dining.length) placeExtras(w, now, hour, !!opts.forceMeal, meals, queue, out, opts.extras);
  return out;
}

// 점원·바깥 손님 — 세션 사람 자리를 다 정한 뒤에 남은 곳으로. 손님 먼저(점원은 주문하는 사람이 있는지 보고 카운터에 선다)
function placeExtras(
  w: World, now: number, hour: number, force: boolean,
  used: { order: Map<string, number>; seats: Set<string>; tables: Set<string> },
  queue: { aqua: number; feed: number }, out: Map<string, Placement>, extras: Extra[],
): void {
  const sessionTables = new Set(used.tables);
  const guests = guestsAt(now, hour, force);
  const live = new Set(guests.map((g) => g.id));
  for (const m of [guestCame, guestSeat, guestSpot]) for (const id of m.keys()) if (!live.has(id)) m.delete(id);
  const freeSeats = (shop: Shop) => w.dining.find((d) => d.shop === shop)!.seats.filter((st) => !used.seats.has(st.key)).length;
  const partyTable = new Map<string, string>();
  const takenSpot = new Set<string>();
  for (const g of guests) {
    const dn = w.dining.find((d) => d.shop === g.shop);
    if (!dn) continue;
    if (!guestCame.has(g.id)) guestCame.set(g.id, freeSeats(g.shop) >= GUEST_MIN_FREE);
    if (!guestCame.get(g.id)) continue;
    let p: Placement | null = null;
    if (g.phase === 'order') {
      const n = used.order.get(dn.shop) ?? 0;
      used.order.set(dn.shop, n + 1);
      const o = dn.order[(n + g.seed) % dn.order.length];
      const lap = Math.floor(n / dn.order.length);
      p = { target: [o.at[0], o.at[1] + lap * 0.55], pose: 'stand', face: o.face, desk: null, group: `order:${dn.shop}` };
    } else if (g.phase === 'eat') {
      let st = dn.seats.find((x) => x.key === guestSeat.get(g.id) && !used.seats.has(x.key));
      if (!st) {
        const free = dn.seats.filter((x) => !used.seats.has(x.key));
        const mate = partyTable.get(g.party);
        // 같이 온 사람 곁 → 아무도 없는 탁자 → 세션 사람이 없는 탁자 → 아무 데나
        const pools = [
          free.filter((x) => x.table === mate),
          free.filter((x) => !used.tables.has(`${dn.shop}:${x.table}`)),
          free.filter((x) => !sessionTables.has(`${dn.shop}:${x.table}`)),
          free,
        ];
        const pool = pools.find((l) => l.length);
        if (pool) st = pool[g.seed % pool.length];
      }
      if (!st) { guestCame.set(g.id, false); continue; }   // 자리가 없다 — 그냥 나간다
      guestSeat.set(g.id, st.key);
      used.seats.add(st.key); used.tables.add(`${dn.shop}:${st.table}`);
      partyTable.set(g.party, st.table);
      p = {
        target: st.at, pose: 'sit', face: st.face, desk: null, on: st.key, lift: st.lift, group: `meal:${dn.shop}:${st.table}`,
        food: g.food, dish: { at: st.dish, y: st.dishY, rot: st.face + Math.PI },
      };
    } else {
      // 테라스 구경 — 수족관 관람 자리나 공룡 먹이 주는 자리 가운데 세션 사람이 안 쓴 곳. 없으면 구경 없이 나간다
      const opts: { k: string; at: [number, number]; face: number; pose: 'sit' | 'stand'; on?: string; lift?: number; group: string }[] = [];
      (w.aqua?.view ?? []).forEach((v, i) => { if (i >= queue.aqua) opts.push({ k: `aqua${i}`, at: v.at, face: v.face, pose: v.pose, on: v.on, lift: v.lift, group: 'aqua' }); });
      (w.pen?.feed ?? []).forEach((f, i) => { if (i >= queue.feed) opts.push({ k: `feed${i}`, at: f.at, face: f.face, pose: 'stand', group: `feed${i}` }); });
      const free = opts.filter((o) => !takenSpot.has(o.k));
      let o = free.find((x) => x.k === guestSpot.get(g.id));
      if (!o && !guestSpot.has(g.id) && free.length) {
        // 같이 온 사람과 같은 곳(수족관끼리·공룡끼리)
        const mate = [...guestSpot.entries()].find(([id]) => id !== g.id && id.startsWith(g.party))?.[1];
        const same = mate ? free.filter((x) => x.k.slice(0, 4) === mate.slice(0, 4)) : [];
        const pool = same.length ? same : free;
        o = pool[(g.seed >>> 5) % pool.length];
      }
      if (!o) { guestSpot.set(g.id, ''); continue; }
      guestSpot.set(g.id, o.k);
      takenSpot.add(o.k);
      p = { target: o.at, pose: o.pose, face: o.face, desk: null, on: o.on, lift: o.lift, group: o.group };
    }
    out.set(g.id, p);
    extras.push({ id: g.id, role: 'guest', shop: g.shop, crowd: 'normal', phase: g.phase });
  }

  // 가게마다 붐비나 — 주문하는 사람 + 앉은 사람(세션·손님). 넷 이상이거나 빈자리가 둘 이하면 붐빈다, 하나 이하면 한산하다
  const crowd = (shop: Shop): Crowd => {
    const dn = w.dining.find((d) => d.shop === shop)!;
    const n = (used.order.get(shop) ?? 0) + dn.seats.filter((st) => used.seats.has(st.key)).length;
    return n >= 4 || freeSeats(shop) <= 2 ? 'busy' : n <= 1 ? 'quiet' : 'normal';
  };
  for (const e of extras) e.crowd = crowd(e.shop);

  for (const c of clerksAt(now, hour, force)) {
    const st = w.dining.find((d) => d.shop === c.shop)?.staff;
    if (!st) continue;
    const slot = (sec: number, salt = 0) => Math.floor(now / 1000 / sec) + salt;
    const station = (k: number) => { const s = st.stations[((k % st.stations.length) + st.stations.length) % st.stations.length]; return { target: s.at, pose: 'stand' as const, face: s.face, desk: null, cook: s.cook, group: 'staff' }; };
    let p: Placement;
    const customers = (used.order.get(c.shop) ?? 0) > 0;
    if (c.phase === 'close') {
      // 마감 — 식탁을 차례로 닦는다 (둘이면 반대쪽부터)
      const k = slot(20) + c.seed + (c.post === 'kitchen' ? Math.floor(st.wipe.length / 2) : 0);
      const s = st.wipe[k % st.wipe.length];
      p = { target: s.at, pose: 'stand', face: s.face, desk: null, group: 'staff' };
    } else if (c.post === 'kitchen' || c.phase === 'prep') {
      // 준비 — 조리대를 40초마다 옮겨 다닌다. 둘이면 서로 다른 조리대
      p = station(slot(40) + c.seed + (c.post === 'kitchen' ? 1 : 0));
    } else if (customers) {
      p = { target: st.counter.at, pose: 'stand', face: st.counter.face, desk: null, group: `order:${c.shop}` };   // 주문 받기
    } else {
      // 손님이 없으면 카운터와 조리대를 오간다 (30초 창마다, 열에 여섯은 카운터)
      const k = slot(30);
      p = mix01(c.id, k) < 0.6 ? { target: st.counter.at, pose: 'stand', face: st.counter.face, desk: null, group: 'staff' } : station(k + c.seed);
    }
    out.set(c.id, p);
    extras.push({ id: c.id, role: 'clerk', shop: c.shop, crowd: crowd(c.shop), post: c.post, phase: c.phase });
  }
}
const mix01 = (id: string, k: number) => (seatHash(id, k) % 1000) / 1000;


