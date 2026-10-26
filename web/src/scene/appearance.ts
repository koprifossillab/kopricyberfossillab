import type { Agent } from '../types.ts';
import { SKINS } from './layout.ts';
import { personOf, peopleVersion } from './people.ts';

// 생김새 — 기본은 id 로 정해 늘 같다. 여자·남자 반반, 짜 둔 사람(머리 모양·머리 색·치장품·몸집)·피부·옷. tmux 사람은 모자를 쓴다.
// 머리는 층으로 굽는다 — 얼굴(피부)·머리카락(모양×색)·치장품(하나씩)·모자를 따로 굽고 화면이 겹친다. 그래서 하나하나 따로 고를 수 있다:
// 목록에서 얼굴을 두 번 누르면 고치는 창(이 브라우저에만 남는다, id 마다 — 이름 고치기와 같은 방식).
// 몸은 방향 없이 한 번만 굽는 원기둥이라(화면이 방향을 주지 않는다) 옷은 돌려도 같은 꼴만 — 앞에 붙는 것(넥타이·목걸이)은 머리 쪽 층에.
export type Hair = 'short' | 'buzz' | 'curly' | 'side' | 'bald' | 'long' | 'bob' | 'ponytail' | 'bun' | 'pixie';
export type Acc =
  | 'glasses' | 'round' | 'beard' | 'mustache' | 'headphones' | 'headband' | 'beanie'   // 머리
  | 'tie' | 'bowtie' | 'lanyard' | 'scarf' | 'necklace';                                // 목 — 머리 조각에 함께 굽는다
export type Build = 'm' | 't' | 's' | 'w';   // 보통 · 키 크고 마른 · 키 작은 · 몸집 큰
export type Outfit = 'suit' | 'dress' | 'pants' | 'skirt' | 'coat' | 'stripe';
export interface Persona { hair: Hair; hc: number; acc: Acc[]; build: Build; accent: number }

// k: 몸 높이 배, r: 몸 굵기 배. 머리는 몸 꼭대기를 따라 lift 만큼 오르내린다
export const BUILDS: Record<Build, { k: number; r: number }> = { m: { k: 1, r: 1 }, t: { k: 1.1, r: 0.94 }, s: { k: 0.9, r: 1 }, w: { k: 1, r: 1.16 } };
export const BODY_H = 0.75, BODY_Y0 = 0.045;
export const liftOf = (b: Build) => BODY_H * (BUILDS[b].k - 1);

export const HAIRS: Hair[] = ['short', 'buzz', 'side', 'curly', 'bald', 'pixie', 'bob', 'long', 'ponytail', 'bun'];
const BLACK = 0x1f1a17, DKBR = 0x3b2314, BROWN = 0x6b3f22, AUBURN = 0x8a4a2a, GREY = 0x9a9690, ASH = 0xb89a6a, DYED = 0x7f77dd;
export const HAIR_COLORS = [BLACK, DKBR, BROWN, AUBURN, GREY, ASH, DYED];
export const ACCENTS = [0xd85a30, 0x378add, 0x1d9e75, 0xef9f27, 0xd4537e, 0x26215c];
const P = (hair: Hair, hc: number, acc: Acc[], build: Build, i: number): Persona => ({ hair, hc, acc, build, accent: ACCENTS[i % ACCENTS.length] });

export const MALE: Persona[] = [
  P('short', BLACK, [], 'm', 0),
  P('short', BROWN, ['glasses', 'tie'], 't', 5),
  P('buzz', BLACK, ['beard'], 'w', 2),
  P('curly', BLACK, ['round'], 'm', 3),
  P('bald', GREY, ['glasses', 'mustache'], 'w', 0),
  P('side', DKBR, ['tie'], 't', 0),
  P('buzz', DKBR, ['headphones'], 'm', 1),
  P('curly', AUBURN, ['beard', 'lanyard'], 't', 1),
  P('side', BLACK, ['glasses'], 's', 4),
  P('short', DKBR, ['beanie'], 'm', 2),
  P('short', GREY, ['round', 'bowtie'], 's', 0),
  P('side', ASH, ['lanyard'], 'm', 3),
];
export const FEMALE: Persona[] = [
  P('long', BLACK, [], 'm', 0),
  P('bob', BROWN, ['glasses'], 's', 1),
  P('ponytail', AUBURN, ['headband'], 't', 2),
  P('bun', BLACK, ['round', 'necklace'], 'm', 3),
  P('long', DKBR, ['headphones'], 'm', 4),
  P('bob', BLACK, ['scarf'], 't', 0),
  P('ponytail', BLACK, ['lanyard'], 's', 1),
  P('bun', GREY, ['glasses', 'necklace'], 's', 3),
  P('long', AUBURN, [], 't', 2),
  P('bob', DYED, [], 'm', 5),
  P('pixie', DKBR, ['round'], 'm', 4),
  P('ponytail', ASH, ['glasses', 'lanyard'], 'w', 2),
];
// tmux 사람(모자)의 기본은 머리카락이 모자를 뚫고 나오지 않는 몇 사람에서만 (고칠 때는 아무것이나)
export const CAP_MALE = [0, 2, 4, 5], CAP_FEMALE = [0, 1, 3, 6];

// 치장품 — 층 하나씩. 색: 포인트 색(accent)을 따르는 것 · 머리 색을 따르는 것(수염) · 정해진 것(안경·목걸이)
export const FACE_ACC: Acc[] = ['glasses', 'round', 'beard', 'mustache'];
export const HEAD_ACC: Acc[] = ['headphones', 'headband', 'beanie'];
export const NECK_ACC: Acc[] = ['tie', 'bowtie', 'lanyard', 'scarf', 'necklace'];
export const ACCS: Acc[] = [...FACE_ACC, ...HEAD_ACC, ...NECK_ACC];
export const ACCENT_ACC = new Set<Acc>(['headphones', 'headband', 'beanie', 'tie', 'bowtie', 'lanyard', 'scarf']);
export const HAIR_ACC = new Set<Acc>(['beard', 'mustache']);
export const WIDE_ACC = new Set<Acc>(NECK_ACC);   // 목의 것은 몸 굵기를 따른다 — 몸집 큰(w) 사람 것을 따로 굽는다
// 함께 못 하는 것 — 하나를 고르면 같은 무리의 나머지는 뺀다
export const ACC_GROUPS: Acc[][] = [['glasses', 'round'], ['headphones', 'headband', 'beanie'], ['tie', 'bowtie']];
export const accColor = (acc: Acc, L: Pick<Appearance, 'accent' | 'hc'>) => ACCENT_ACC.has(acc) ? L.accent : HAIR_ACC.has(acc) ? L.hc : 0;

// 옷 — 같은 것이 여럿이면 그만큼 자주
const MALE_OUTFITS: Outfit[] = ['suit', 'suit', 'pants', 'pants', 'coat', 'stripe'];
const FEMALE_OUTFITS: Outfit[] = ['dress', 'dress', 'skirt', 'pants', 'coat', 'stripe'];
export const OUTFITS: Outfit[] = ['suit', 'dress', 'pants', 'skirt', 'coat', 'stripe'];
export const BUILD_LIST = Object.keys(BUILDS) as Build[];
export const shapeKey = (o: Outfit, b: Build) => `${o}-${b}`;

// 화면이 쓰는 생김새 전부. cap 은 tmux 사람이면 늘 — 고르는 것이 아니다
export interface Appearance {
  female: boolean; hair: Hair; hc: number; acc: Acc[]; accent: number;
  skin: number; outfit: Outfit; build: Build; cap: boolean;
}
export type Custom = Partial<Omit<Appearance, 'cap'>>;
export const shapeOf = (L: Pick<Appearance, 'outfit' | 'build'>) => shapeKey(L.outfit, L.build);

function hash(s: string, salt: number): number {
  let h = salt;
  for (let i = 0; i < s.length; i++) h = (Math.imul(h, 31) + s.charCodeAt(i)) | 0;
  h ^= h >>> 15; h = Math.imul(h, 0x2c1b3c6d); h ^= h >>> 12;
  return Math.abs(h);
}
const bornFemale = (id: string) => hash(id, 1) % 2 === 0;

// 사람이 고친 생김새 — 서버가 모두에게 보낸다(people.ts). 고친 칸만 덮는다
const lookOf = (id: string) => personOf(id)?.look as Custom | undefined;
const memo = new Map<string, Appearance>();
let memoAt = -1;

export const isFemale = (id: string) => lookOf(id)?.female ?? bornFemale(id);
export const customOf = (id: string): Custom => ({ ...lookOf(id) });

// 기본값 — 성별을 바꾸면 그 성별의 짜 둔 사람·옷에서 다시 고른다(고친 칸은 그대로)
export function defaultLook(id: string, female: boolean, cap: boolean): Omit<Appearance, 'female' | 'cap'> {
  const pool = cap ? (female ? CAP_FEMALE : CAP_MALE) : (female ? FEMALE : MALE).map((_, i) => i);
  const P = (female ? FEMALE : MALE)[pool[hash(id, 2) % pool.length]];
  const outfits = female ? FEMALE_OUTFITS : MALE_OUTFITS;
  return { hair: P.hair, hc: P.hc, acc: P.acc, accent: P.accent, skin: SKINS[hash(id, 3) % SKINS.length], outfit: outfits[hash(id, 4) % outfits.length], build: P.build };
}

export function appearanceOf(a: Pick<Agent, 'id' | 'kind'>): Appearance {
  const cap = a.kind === 'terminal';
  if (memoAt !== peopleVersion()) { memo.clear(); memoAt = peopleVersion(); }
  const key = `${a.id}\0${cap}`;
  let L = memo.get(key);
  if (!L) {
    const c = lookOf(a.id) ?? {};
    const female = c.female ?? bornFemale(a.id);
    L = { ...defaultLook(a.id, female, cap), ...c, female, cap };
    memo.set(key, L);
  }
  return L;
}

