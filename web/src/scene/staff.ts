// 식당가 점원과 바깥 손님 (wetherilli 026) — 세션이 아닌 사람들. 언제 누가 있나만 정한다(자리는 director.ts).
// 날짜·끼니·번호로 정해 다시 그려도 같다. 시각은 화면의 지역 시각(hourNow).
//
// 점원 — 가게마다 한 명(점심 버거집은 둘 — 카운터·주방). 끼니 한 시간 전 출근해 음식 준비(prep) → 끼니 동안 카운터에서 주문 받기(serve)
//        → 끼니 끝 30분 동안 마감(close, 식탁 닦기) → 퇴근. 아침 6–8:30 · 점심 11–14:30 · 저녁 17–20:30 (사용자 2026-11-05)
// 바깥 손님 — 점심·저녁에만. 엘리베이터로 와서 주문(15~25초) → 먹기(2~4분) → 셋에 하나는 테라스 수족관·공룡 구경(30~60초) → 엘리베이터로 나간다.
//        한 번에 4~6명쯤 (사용자: 「더 붐비게」). 혼자나 둘이 온다
import { MEALS, type Meal, type Shop, type Food } from './meals.ts';

export type ClerkPhase = 'prep' | 'serve' | 'close';
export type Post = 'counter' | 'kitchen';
export interface Shift { id: string; shop: Shop; post: Post; phase: ClerkPhase; meal: Meal; seed: number }

export const PREP_H = 1, CLOSE_H = 0.5;   // 끼니 한 시간 전 출근, 끝나고 30분 뒤 퇴근
// 점원 몫 — 점심 버거집만 둘 (사용자: 「점심에는 버거집 점원 2명, 한 명은 카운터, 한 명은 주방」)
export const POSTS = (shop: Shop, meal: Meal): Post[] => (shop === 'burger' && meal === 'lunch' ? ['counter', 'kitchen'] : ['counter']);

// 바깥 손님 — 끼니마다 무리 수(혼자나 둘). 무리마다 머무는 때 ≈ 걷기 + 주문 + 먹기 + (구경) ≈ 4분 → 점심 5명·저녁 4.5명 남짓
export const GUEST_PARTIES: Partial<Record<Meal, number>> = { lunch: 120, dinner: 105 };
export const GUEST_ORDER_S: [number, number] = [15, 25];
export const GUEST_EAT_S: [number, number] = [2 * 60, 4 * 60];
export const GUEST_VISIT_S: [number, number] = [30, 60];
export const WALK_IN_S = 10;      // 엘리베이터에서 카운터까지 — 주문 시간에 더한다
export const WALK_UP_S = 25;      // 식당에서 테라스까지 오르내리기 — 구경 시간에 더한다
export const VISIT_ODDS = 1 / 3;  // 다 먹고 테라스 구경 (사용자: 「대략 3명 중 1명」)
export const PAIR_ODDS = 0.3;

function mix(s: string, salt: number): number {
  let h = salt | 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(h, 31) + s.charCodeAt(i)) | 0;
  h ^= h >>> 15; h = Math.imul(h, 0x2c1b3c6d); h ^= h >>> 12; h = Math.imul(h, 0x297a2d39); h ^= h >>> 15;
  return (h >>> 0) / 4294967296;
}
const dayOf = (now: number) => { const d = new Date(now); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; };
const dayNo = (now: number) => { const d = new Date(now); return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400_000); };

// 화면 확인용(?meal) — 끼니가 아니어도 점심 두 시간을 진짜 시각으로 되풀이한다
export const forcedHour = (now: number) => 12 + ((now / 1000) % 7200) / 3600;

// 지금 일하는 점원들
export function clerksAt(now: number, hour: number, force = false): Shift[] {
  const out: Shift[] = [];
  const pick = (h: number) => {
    for (const m of MEALS) {
      for (const shop of ['burger', 'gukbap'] as Shop[]) {
        POSTS(shop, m.meal).forEach((post) => {
          const key = `${dayOf(now)}:${m.meal}:${shop}:${post}`;
          const on = (m.from - PREP_H) * 3600 + mix(key, 1) * 180;   // 0~3분 늦게 오기도
          const off = (m.to + CLOSE_H) * 3600 + mix(key, 2) * 60;
          const s = h * 3600;
          if (s < on || s >= off) return;
          // 사람은 가게·자리마다 셋이 돌아가며 — 날짜와 끼니로 정한다
          const who = (dayNo(now) + MEALS.indexOf(m)) % 3;
          out.push({
            id: `npc:clerk:${shop}:${post}:${who}`, shop, post, meal: m.meal, seed: Math.floor(mix(key, 3) * 1e9),
            phase: s < m.from * 3600 ? 'prep' : s < m.to * 3600 ? 'serve' : 'close',
          });
        });
      }
    }
  };
  pick(hour);
  if (force && !out.length) pick(forcedHour(now));
  return out;
}

export interface GuestPlan {
  id: string; party: string; meal: Meal; shop: Shop; food: Food;
  phase: 'order' | 'eat' | 'visit'; visit: boolean; seed: number;
}

// 지금 식당가에 있어야 하는 바깥 손님들 (엘리베이터까지 걸어 나가는 것은 cast.ts — 목록에서 빠지면 나간다)
export function guestsAt(now: number, hour: number, force = false): GuestPlan[] {
  let h = hour;
  let m = MEALS.find((x) => h >= x.from && h < x.to && GUEST_PARTIES[x.meal]);
  if (!m && force) { h = forcedHour(now); m = MEALS.find((x) => x.meal === 'lunch')!; }
  if (!m) return [];
  const P = GUEST_PARTIES[m.meal]!;
  const key = `${dayOf(now)}:${m.meal}`;
  const s = h * 3600;
  const longest = WALK_IN_S + GUEST_ORDER_S[1] + GUEST_EAT_S[1] + GUEST_VISIT_S[1] + WALK_UP_S;
  const span = (m.to - m.from) * 3600 - longest;   // 끼니가 끝나기 전에 다 나간다
  const gap = span / P;
  const out: GuestPlan[] = [];
  // 지금 머물 수 있는 무리만 본다 — 도착이 [s − longest, s] 안
  const k0 = Math.max(0, Math.floor((s - m.from * 3600 - longest) / gap) - 1), k1 = Math.min(P - 1, Math.ceil((s - m.from * 3600) / gap));
  for (let k = k0; k <= k1; k++) {
    const pk = `${key}:g${k}`;
    const r = (salt: number) => mix(pk, salt);
    const arrive = m.from * 3600 + (k + r(1) * 0.9) * gap;
    const order = WALK_IN_S + GUEST_ORDER_S[0] + r(2) * (GUEST_ORDER_S[1] - GUEST_ORDER_S[0]);
    const eat = GUEST_EAT_S[0] + r(3) * (GUEST_EAT_S[1] - GUEST_EAT_S[0]);
    const visit = r(4) < VISIT_ODDS;
    const look = visit ? WALK_UP_S + GUEST_VISIT_S[0] + r(5) * (GUEST_VISIT_S[1] - GUEST_VISIT_S[0]) : 0;
    const t = s - arrive;
    if (t < 0 || t >= order + eat + look) continue;
    const shop: Shop = r(6) < 0.5 ? 'burger' : 'gukbap';
    const n = r(7) < PAIR_ODDS ? 2 : 1;
    for (let j = 0; j < n; j++) {
      const food: Food = shop === 'burger' ? 'burger' : mix(pk, 10 + j) < 0.45 ? 'noodle' : 'gukbap';
      out.push({
        id: `npc:guest:${pk}:${j}`, party: pk, meal: m.meal, shop, food, visit,
        phase: t < order ? 'order' : t < order + eat ? 'eat' : 'visit', seed: Math.floor(mix(pk, 20 + j) * 1e9),
      });
    }
  }
  return out;
}
