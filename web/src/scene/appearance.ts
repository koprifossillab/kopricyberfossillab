import type { Agent } from '../types.ts';
import { SKINS } from './layout.ts';

// 생김새 — id 로 정해 늘 같다. 여자·남자 반반, 사람(머리 모양·머리 색·차림·키)·피부·옷. tmux 사람은 모자를 쓴다.
// 머리 조각은 사람(Persona)마다 굽는다 — 머리 모양·색·소품을 따로 고르면 조각 수가 곱해지므로 짜 둔 사람 목록에서 고른다.
// 몸은 방향 없이 한 번만 굽는 원기둥이라(화면이 방향을 주지 않는다) 옷은 돌려도 같은 꼴만 — 앞에 붙는 것(넥타이·목걸이)은 머리 쪽에.
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

const BLACK = 0x1f1a17, DKBR = 0x3b2314, BROWN = 0x6b3f22, AUBURN = 0x8a4a2a, GREY = 0x9a9690, ASH = 0xb89a6a, DYED = 0x7f77dd;
const ACCENTS = [0xd85a30, 0x378add, 0x1d9e75, 0xef9f27, 0xd4537e, 0x26215c];
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
// 머리 조각의 이름 — m0…m11, f0…f11
export const PERSONAS: Record<string, Persona> = Object.fromEntries([
  ...MALE.map((p, i) => [`m${i}`, p] as const), ...FEMALE.map((p, i) => [`f${i}`, p] as const),
]);
// tmux 사람(모자)은 모자와 겹치지 않는 몇 사람에서만 — 모자 쓴 머리 조각을 줄인다
export const CAP_MALE = [0, 2, 4, 5], CAP_FEMALE = [0, 1, 3, 6];
export const CAP_PERSONAS = [...CAP_MALE.map((i) => `m${i}`), ...CAP_FEMALE.map((i) => `f${i}`)];

// 옷 — 같은 것이 여럿이면 그만큼 자주
const MALE_OUTFITS: Outfit[] = ['suit', 'suit', 'pants', 'pants', 'coat', 'stripe'];
const FEMALE_OUTFITS: Outfit[] = ['dress', 'dress', 'skirt', 'pants', 'coat', 'stripe'];
export const OUTFITS: Outfit[] = ['suit', 'dress', 'pants', 'skirt', 'coat', 'stripe'];
export const BUILD_LIST = Object.keys(BUILDS) as Build[];
export const shapeKey = (o: Outfit, b: Build) => `${o}-${b}`;

// look: 머리 조각 이름(PERSONAS), shape: 몸 조각 이름(shapeKey)
export interface Appearance { look: string; skin: number; shape: string; cap: boolean }
function hash(s: string, salt: number): number {
  let h = salt;
  for (let i = 0; i < s.length; i++) h = (Math.imul(h, 31) + s.charCodeAt(i)) | 0;
  h ^= h >>> 15; h = Math.imul(h, 0x2c1b3c6d); h ^= h >>> 12;
  return Math.abs(h);
}
export const isFemale = (id: string) => hash(id, 1) % 2 === 0;

export function appearanceOf(a: Agent): Appearance {
  const female = isFemale(a.id);
  const cap = a.kind === 'terminal';
  const g = female ? 'f' : 'm';
  const pool = cap ? (female ? CAP_FEMALE : CAP_MALE) : (female ? FEMALE : MALE).map((_, i) => i);
  const look = `${g}${pool[hash(a.id, 2) % pool.length]}`;
  const outfits = female ? FEMALE_OUTFITS : MALE_OUTFITS;
  return {
    look,
    skin: SKINS[hash(a.id, 3) % SKINS.length],
    shape: shapeKey(outfits[hash(a.id, 4) % outfits.length], PERSONAS[look].build),
    cap,
  };
}
