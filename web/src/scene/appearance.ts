import type { Agent } from '../types.ts';
import { FEMALE_LOOKS, MALE_LOOKS, SKINS, type BodyShape, type Look } from './layout.ts';

// 생김새 — id 로 정해 늘 같다. 여자·남자 반반, 머리 모양·피부·옷 꼴. tmux 사람은 모자를 쓴다
export interface Appearance { look: Look; skin: number; shape: BodyShape; cap: boolean }
function hash(s: string, salt: number): number {
  let h = salt;
  for (let i = 0; i < s.length; i++) h = (Math.imul(h, 31) + s.charCodeAt(i)) | 0;
  h ^= h >>> 15; h = Math.imul(h, 0x2c1b3c6d); h ^= h >>> 12;
  return Math.abs(h);
}
export const isFemale = (id: string) => hash(id, 1) % 2 === 0;

export function appearanceOf(a: Agent): Appearance {
  const female = isFemale(a.id);
  const looks = female ? FEMALE_LOOKS : MALE_LOOKS;
  return {
    look: looks[hash(a.id, 2) % looks.length],
    skin: SKINS[hash(a.id, 3) % SKINS.length],
    shape: female && hash(a.id, 4) % 3 !== 0 ? 'dress' : 'suit',
    cap: a.kind === 'terminal',
  };
}

