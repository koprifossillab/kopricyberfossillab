// 굽기(web/bake/)가 쓰고 화면(iso/)이 읽는 atlas.json 의 모양.
// 좌표는 「구운 픽셀」 — 세계의 원점이 (0, 0) 이고, 점 p 는 (p·right·scale, −p·up·scale) 로 간다.

export interface SpriteRect {
  sheet: string;        // 그림 파일 (sprites/ 안)
  sx: number; sy: number; w: number; h: number;   // 그림 파일 안의 자리
  ox: number; oy: number;                         // 기준점(anchor)에서 그림 왼쪽 위까지 (구운 픽셀)
}

export interface Atlas {
  version: number;
  scale: number;                                  // 세계 1 = 구운 픽셀 scale
  right: [number, number, number];
  up: [number, number, number];
  background: SpriteRect;                         // 기준점 = 세계 원점
  items: Record<string, SpriteRect>;              // layout.ITEMS 의 id, 기준점 = 세계 원점
  characters: Record<string, SpriteRect>;         // charKey(), 기준점 = 발
}

export const charKey = (color: number, hair: string, sit: boolean, dir: number) =>
  `${color.toString(16).padStart(6, '0')}-${hair}-${sit ? 'sit' : 'stand'}-${dir}`;
