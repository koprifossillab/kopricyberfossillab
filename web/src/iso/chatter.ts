// 휴게실 잡담 — 무리(카페 탁자·소파)에 둘 이상 있으면 대화 하나를 골라 돌아가며 말하고, 혼자면 가끔 혼잣말.
// 일하는 중에도 — 무리 이름이 「work:」 로 시작하면(같은 사무실 책상·같은 일자리) 일 얘기 위주로, 휴게실보다 뜸하게.
// 줄마다 보이는 시간은 글 길이로, 줄 사이·대화 사이의 쉼은 들쭉날쭉하게 — 같은 말이 같은 박자로 되풀이되지 않게.
// 아래층 식당에선 계산대 앞(order:)·식탁(meal:) 무리 — 메뉴 고민·주문·맛·끼니 얘기, 머무는 때가 짧아 자주.
// 대사는 lines.ts — 장소 것이 먼저, 가끔 지금 시각·요일·계절 것이 섞인다. 한 묶음은 다 쓸 때까지 같은 말을 다시 꺼내지 않는다.
import * as L from './lines.ts';

const rand = (a: number, b: number) => a + Math.random() * (b - a);

// 섞은 주머니 — 묶음마다 차례를 섞어 두고 하나씩 꺼낸다. 다 꺼내면 다시 섞는다(방금 것이 바로 또 나오지 않게)
const bags = new WeakMap<object, { order: number[]; last: number }>();
export function draw<T>(list: T[]): T {
  let b = bags.get(list);
  if (!b) { b = { order: [], last: -1 }; bags.set(list, b); }
  if (b.order.length === 0) {
    const o = list.map((_, i) => i);
    for (let i = o.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [o[i], o[j]] = [o[j], o[i]]; }
    if (o.length > 1 && o[o.length - 1] === b.last) [o[0], o[o.length - 1]] = [o[o.length - 1], o[0]];
    b.order = o;
  }
  b.last = b.order.pop()!;
  return list[b.last];
}

// 묶음 고르기 — [무게, 묶음] 가운데 빈 것은 빼고 무게대로
function choose<T>(opts: [number, T[] | undefined][]): T {
  const ok = opts.filter((o): o is [number, T[]] => !!o[1] && o[1].length > 0);
  let r = Math.random() * ok.reduce((s, o) => s + o[0], 0);
  for (const [w, list] of ok) if ((r -= w) <= 0) return draw(list);
  return draw(ok[ok.length - 1][1]);
}

// 지금 — 시간대·요일·계절 (벽시계로)
export function when(d = new Date()): { time: string; day: string | null; season: string } {
  const h = d.getHours() + d.getMinutes() / 60, wd = d.getDay(), m = d.getMonth() + 1;
  const time = h < 6 || h >= 22 ? 'night' : h < 11 ? 'morning' : h < 13.5 ? 'lunch' : h < 18 ? 'afternoon' : 'evening';
  const day = wd === 0 || wd === 6 ? 'weekend' : wd === 1 ? 'mon' : wd === 5 ? 'fri' : null;
  const season = m >= 3 && m <= 5 ? 'spring' : m <= 8 && m >= 6 ? 'summer' : m >= 9 && m <= 11 ? 'autumn' : 'winter';
  return { time, day, season };
}

// 무리 이름 → 그 자리의 대화·혼잣말 묶음. 시각·요일·계절 것은 가끔 섞는다
function dialogFor(group: string, act: string | null, theme?: string, me?: Who): string[] {
  const w = when();
  if (group.startsWith('order:') || group.startsWith('meal:')) return mealDialog(group, me);
  if (theme === 'desert' && Math.random() < (group.startsWith('work:') ? 0.45 : 0.1)) return draw(L.DESERT_DIALOGS);
  const extra: [number, string[][] | undefined][] = [[0.12, L.TIME_DIALOGS[w.time]], [0.06, w.day ? L.DAY_DIALOGS[w.day] : undefined], [0.05, L.SEASON_DIALOGS[w.season]]];
  if (group === 'work:center') return choose([[0.5, L.CENTER_WORK_DIALOGS], [0.35, L.WORK_DIALOGS], [0.15, L.DIALOGS]]);
  if (group.startsWith('work:')) {
    const own = L.WORK_ACT_DIALOGS[group.slice(5)] ?? (act ? L.WORK_ACT_DIALOGS[act] : undefined);
    return choose([[0.4, own], [0.45, L.WORK_DIALOGS], [0.15, L.DIALOGS], ...extra.map(([p, l]) => [p / 2, l] as [number, string[][] | undefined])]);
  }
  const place: Record<string, string[][]> = { aqua: L.AQUA_DIALOGS, skel: L.SKEL_DIALOGS, coffee: L.COFFEE_DIALOGS, breeze: L.BREEZE_DIALOGS, desk: L.CENTER_DIALOGS, sofa: L.SOFA_DIALOGS };
  const own = group.startsWith('feed') ? L.FEED_DIALOGS : place[group];
  return choose([[own && group !== 'sofa' ? 0.55 : 0.12, own], [0.45, L.DIALOGS], ...extra]);
}
function soloFor(group: string, act: string | null, theme?: string, me?: Who): string[] {
  const w = when();
  if (group.startsWith('order:') || group.startsWith('meal:')) return mealSolo(group, me);
  if (theme === 'desert' && Math.random() < (group.startsWith('work:') ? 0.35 : 0.1)) return [draw(L.DESERT_SOLO)];
  const extra: [number, string[] | undefined][] = [[0.1, L.TIME_SOLO[w.time]], [0.05, w.day ? L.DAY_SOLO[w.day] : undefined], [0.05, L.SEASON_SOLO[w.season]]];
  if (group.startsWith('work:')) {
    if (act && Math.random() < 0.75) return [draw(L.WORK_SOLO[act] ?? L.WORK_SOLO.think)];
    return Math.random() < 0.15 ? draw(L.SOLO_SEQS) : [choose([[0.6, L.SOLO], ...extra])];
  }
  const place: Record<string, string[]> = { aqua: L.AQUA, skel: L.SKEL, coffee: L.COFFEE, breeze: L.BREEZE, desk: L.CENTER_SOLO };
  const own = group.startsWith('feed') ? L.FEED : place[group];
  if (own && Math.random() < 0.7) return [draw(own)];
  return Math.random() < 0.2 ? draw(L.SOLO_SEQS) : [choose([[0.6, L.SOLO], ...extra])];
}

// 아래층 식당 — 무리 이름 'order:<가게>'(계산대 앞, 20~40초) · 'meal:<가게>:<탁자>'(먹는 중). 가게는 burger·gukbap.
// 무엇을 시켰는지(food: burger·gukbap·noodle)와 끼니(meal)는 Stage 가 Who 로 넘긴다 — 없으면 가게로, 끼니 말은 뺀다
const shopOf = (group: string) => (group.split(':')[1] === 'burger' ? 'burger' : 'gukbap');
const foodOf = (group: string, me?: Who) => me?.food ?? (shopOf(group) === 'burger' ? 'burger' : 'gukbap');
function mealDialog(group: string, me?: Who): string[] {
  const burger = shopOf(group) === 'burger', meal = me?.meal ? L.MEAL_DIALOGS[me.meal] : undefined;
  if (group.startsWith('order:'))
    return choose([[0.35, burger ? L.BURGER_QUEUE_DIALOGS : L.GUKBAP_QUEUE_DIALOGS], [0.25, L.QUEUE_DIALOGS], [0.3, L.MENU_DIALOGS], [0.1, meal]]);
  return choose([[0.38, burger ? L.BURGER_EAT_DIALOGS : L.GUKBAP_EAT_DIALOGS], [0.32, L.EAT_DIALOGS], [0.18, meal], [0.12, L.DIALOGS]]);
}
function mealSolo(group: string, me?: Who): string[] {
  const food = foodOf(group, me), meal = me?.meal ? L.MEAL_SOLO[me.meal] : undefined;
  if (group.startsWith('order:')) {
    const order = food === 'burger' ? L.BURGER_QUEUE : food === 'noodle' ? L.NOODLE_QUEUE : L.GUKBAP_QUEUE;
    return [choose([[0.4, order], [0.3, L.MENU_SOLO], [0.18, L.QUEUE_SOLO], [0.12, meal]])];
  }
  const eat = food === 'burger' ? L.BURGER_EAT : food === 'noodle' ? L.NOODLE_EAT : L.GUKBAP_EAT;
  return [choose([[0.5, eat], [0.25, L.TASTE], [0.18, meal], [0.07, L.SOLO]])];
}

// 자리표 채우기 — {상대} 는 말 건네는 사람(다음에 말할 사람)의 이름, {방} 은 말하는 사람의 부서
// theme: 그 사람 방의 꾸밈 (desert) · meal: 지금 끼니(scene/meals.ts mealOf) · food: 식당에서 시킨 것
export interface Who { act: string; room: string; name: string; theme?: string; meal?: 'breakfast' | 'lunch' | 'dinner'; food?: 'burger' | 'gukbap' | 'noodle' }
const call = (name: string) => `${name.length === 3 ? name.slice(1) : name} 님`;   // 지어 준 이름(성 + 두 글자)은 이름만
export function fill(s: string, me: Who | undefined, them: Who | undefined): string {
  return s.replace(/\{상대\}/g, them?.name ? call(them.name) : '저기요').replace(/\{방\}/g, me?.room || '우리 방');
}

// 글이 길면 오래 보인다 — 짧은 말도 2초는 남겨 읽을 틈을 준다 (사용자: 「1초씩은 메시지가 유지되도록」)
const lineTime = (s: string) => Math.min(5.5, Math.max(2, 1.6 + s.length * 0.12));

interface Talk { lines: string[]; i: number; speakers: string[]; text: string; who: string | null; until: number; next: number; solo: boolean }

// 무리마다 대화 상태 — 무리 구성이 바뀌면 새로 시작한다
export class Chatter {
  private talks = new Map<string, Talk>();

  // members: 그 무리에 앉아(서) 있는 사람 id. 돌려주는 것: 지금 말하는 사람과 말 (없으면 null)
  // info: 사람마다 하는 일·부서 이름·이름 — 혼잣말을 하는 일에 맞추고 자리표를 채운다
  step(group: string, members: string[], now: number, info?: (who: string) => Who): { who: string; text: string } | null {
    const work = group.startsWith('work:');
    const order = group.startsWith('order:'), eating = group.startsWith('meal:');   // 식당 — 머무는 때가 짧아 더 자주
    let t = this.talks.get(group);
    if (t && t.speakers.slice().sort().join(',') !== members.slice().sort().join(',')) {
      // 사람이 바뀌었다 — 대화는 새로 하되, 하던 말은 끝까지 보인다 (끊기면 읽을 틈이 없다)
      const keep = t.who && members.includes(t.who) && now < t.until ? { who: t.who, text: t.text, until: t.until } : null;
      t = { lines: [], i: 0, speakers: members, text: keep?.text ?? '', who: keep?.who ?? null, until: keep?.until ?? 0,
        next: (keep?.until ?? now) + rand(1.5, 5), solo: members.length < 2 };
      this.talks.set(group, t);
    }
    if (!t) {
      // 처음엔 조금 뜸을 들인다 — 앉자마자 말하지 않게
      t = { lines: [], i: 0, speakers: members, text: '', who: null, until: 0, next: now + (order ? rand(1, 4) : rand(2, 8)), solo: members.length < 2 };
      this.talks.set(group, t);
    }
    if (t.who && now < t.until) return { who: t.who, text: t.text };
    t.who = null;
    if (now < t.next) return null;
    if (t.i >= t.lines.length) {
      // 새 말 — 혼자면 혼잣말(한 줄, 가끔 두세 줄 잇기), 여럿이면 대화 하나와 말을 꺼내는 사람
      if (t.solo) {
        const me = info?.(members[0]);
        t.lines = soloFor(group, me?.act ?? null, me?.theme, me);
        t.speakers = [members[0]];
      } else {
        const me = info?.(members[0]);
        t.lines = dialogFor(group, me?.act ?? null, me?.theme, me);
        const start = Math.floor(Math.random() * members.length);
        t.speakers = [...members.slice(start), ...members.slice(0, start)];
      }
      t.i = 0;
    }
    const who = t.speakers[t.i % t.speakers.length];
    const them = t.speakers.length > 1 ? t.speakers[(t.i + 1) % t.speakers.length] : undefined;
    t.text = fill(t.lines[t.i], info?.(who), them ? info?.(them) : undefined);
    t.who = who;
    t.i++;
    t.until = now + lineTime(t.text);
    // 줄 사이는 짧게, 다 하면 한참 조용히 — 혼자면 더 드문드문, 공룡 먹이 줄 땐 자주
    const more = t.i < t.lines.length;
    t.next = t.until + (more ? rand(1.0, 2.2)
      : t.solo ? (group.startsWith('feed') ? rand(3, 8) : order ? rand(5, 12) : eating ? rand(10, 25) : work ? rand(25, 60) : rand(12, 35))
      : order ? rand(4, 10) : eating ? rand(6, 16) : work ? rand(20, 45) : rand(8, 22));
    return { who: t.who, text: t.text };
  }

  // 사라진 무리는 잊는다
  keep(groups: Set<string>): void {
    for (const g of this.talks.keys()) if (!groups.has(g)) this.talks.delete(g);
  }
}
