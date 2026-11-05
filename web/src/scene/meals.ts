// 끼니 — 아래층 식당가(wetherilli 025)에 가는 시간. director(누가 언제 가나)와 chatter(끼니 대사)가 같이 쓴다. three 없음.
// 시각은 화면의 지역 시각(hourNow — ?hour= 로 바꿔 볼 수 있다).
export type Meal = 'breakfast' | 'lunch' | 'dinner';
export type Shop = 'burger' | 'gukbap';            // 티렉스 버거 · 장보고 국밥·국수
export type Food = 'burger' | 'gukbap' | 'noodle'; // 국밥집에서는 국밥이나 국수

// 끼니마다 사람마다 한 번 제비 — odds 는 가는 몫 (사용자 2026-11-05: 아침 40%·점심 85%·저녁 60%)
export const MEALS: { meal: Meal; from: number; to: number; odds: number; burger: number }[] = [
  { meal: 'breakfast', from: 7, to: 8, odds: 0.4, burger: 0.45 },
  { meal: 'lunch', from: 12, to: 14, odds: 0.85, burger: 0.5 },
  { meal: 'dinner', from: 18, to: 20, odds: 0.6, burger: 0.4 },
];
export const ORDER_S: [number, number] = [20, 40];      // 주문(카운터·키오스크 앞에 서 있기)
export const EAT_S: [number, number] = [5 * 60, 8 * 60]; // 먹기 (사용자: 5~8분)

export function mealOf(hour: number): Meal | null {
  return MEALS.find((m) => hour >= m.from && hour < m.to)?.meal ?? null;
}

export const SHOP_NAME: Record<Shop, string> = { burger: '티렉스 버거', gukbap: '장보고 국밥·국수' };

function mix(s: string, salt: number): number {
  let h = salt | 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(h, 31) + s.charCodeAt(i)) | 0;
  h ^= h >>> 15; h = Math.imul(h, 0x2c1b3c6d); h ^= h >>> 12; h = Math.imul(h, 0x297a2d39); h ^= h >>> 15;
  return (h >>> 0) / 4294967296;
}

export interface MealPlan { meal: Meal; key: string; shop: Shop; food: Food; phase: 'order' | 'eat'; seed: number }

// 이 사람이 지금 식당에 있어야 하나 — 날짜·끼니·id 로 정해 다시 그려도 같다. 출발 시각은 끼니 시간 안에 흩는다.
// force(화면 확인용 ?meal): 끼니와 상관없이 누구나, 진짜 시각으로 주문 → 먹기 → 90초 쉼을 되풀이
export function mealPlan(id: string, now: number, hour: number, force = false): MealPlan | null {
  const date = new Date(now);
  const day = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
  const m = MEALS.find((x) => hour >= x.from && hour < x.to) ?? (force ? MEALS[1] : undefined);
  if (!m) return null;
  const key = `${day}:${m.meal}`;
  const r = (k: number) => mix(id + '|' + key, k);
  if (!force && r(1) >= m.odds) return null;
  const order = ORDER_S[0] + r(3) * (ORDER_S[1] - ORDER_S[0]);
  const eat = EAT_S[0] + r(4) * (EAT_S[1] - EAT_S[0]);
  let t: number;
  if (force) t = (now / 1000 + r(2) * 1000) % (order + eat + 90);
  else {
    const span = (m.to - m.from) * 3600 - order - eat - 60;   // 끝나기 1분 전에는 다 먹는다
    const start = m.from * 3600 + r(2) * Math.max(0, span);
    t = hour * 3600 - start;
  }
  if (t < 0 || t >= order + eat) return null;
  const shop: Shop = r(5) < m.burger ? 'burger' : 'gukbap';
  const food: Food = shop === 'burger' ? 'burger' : r(6) < (m.meal === 'breakfast' ? 0.3 : 0.45) ? 'noodle' : 'gukbap';
  return { meal: m.meal, key, shop, food, phase: t < order ? 'order' : 'eat', seed: Math.floor(r(7) * 1e9) };
}
