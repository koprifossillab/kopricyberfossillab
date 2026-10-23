// 공용 상수 — 색·생김새·말. 자리(좌표)는 modules.ts(모듈 안)와 world.ts(건물)가 정한다.
import type { Activity } from '../types.ts';

export type Rect = [number, number, number, number];   // [x0, z0, x1, z1]
export const PARTITION_H = 0.7;
export const RASH_WALL_H = 1.0;

// 모니터 화면 (책상 앞, +z 를 본다) — 화면이 활동 색으로 칠한다
export const screenQuad = (x: number, z: number, kind: 'desk' | 'call' | 'rashdesk' | 'bossdesk') => kind === 'rashdesk'
  ? { c: [x, 1.12, z + 0.16] as [number, number, number], w: 0.46, h: 0.36 }     // 배불뚝이 모니터
  : { c: [x, 1.35, z - 0.215] as [number, number, number], w: 0.7, h: 0.4 };
export const PHOSPHOR = 0x8fd18f;   // rash 방 모니터는 활동과 상관없이 초록 형광

// 캐릭터 조각의 갈래 — 굽기와 화면이 같은 목록을 쓴다. 몸과 머리를 따로 굽는다.
export type BodyShape = 'suit' | 'dress';
export type Look = 'short' | 'buzz' | 'curly' | 'long' | 'bob' | 'ponytail' | 'bun';
export const MALE_LOOKS: Look[] = ['short', 'buzz', 'curly'];
export const FEMALE_LOOKS: Look[] = ['long', 'bob', 'ponytail', 'bun'];
export const LOOKS: Look[] = [...MALE_LOOKS, ...FEMALE_LOOKS];
export const HAIR_COLOR: Record<Look, number> = {
  short: 0x4a1b0c, buzz: 0x1f1a17, curly: 0x2c2c2a, long: 0x2c1a10, bob: 0x6b3f22, ponytail: 0x8a4a2a, bun: 0x2c2c2a,
};
export const SKINS = [0xf5c4b3, 0xe0a882, 0x9c6b4e];
export const CAP = 0xef9f27;   // tmux 사람의 모자
export const HEAD_Y = 1.03;    // 머리 가운데 높이 (선 자세)
export const SIT_LIFT = 0.12;  // 앉은 몸을 올리는 만큼 (시제품 값)
export const DIRS = 8;   // 방향 수 (rotation.y = k·2π/DIRS)

// 활동별 모니터 색 (앉아 있을 때)
export const SCREEN: Record<Activity, number> = {
  code: 0x85b7eb, read: 0x9fe1cb, search: 0x9fe1cb, run: 0xfac775, think: 0xcecbf6, spawn: 0xafa9ec,
  git: 0x2a3a52, test: 0x2a3a52, wait: 0x2a3a52, idle: 0x2a3a52,
};
export const SCREEN_OFF = 0x2a3a52;

export const PALETTE = [0xd85a30, 0x378add, 0x1d9e75, 0x7f77dd, 0xef9f27, 0xd4537e, 0x639922, 0x993c1d];
export const FOREIGN_COLOR = 0x888780;

export const STATE_TEXT: Record<Activity, string> = {
  code: '코딩 중', read: '탐색 중', search: '자료 검색', run: '실행 중', think: '생각 중', git: 'GitHub 작업',
  test: '시험 중', spawn: '하위 작업', wait: '확인 필요', idle: '휴식',
};
