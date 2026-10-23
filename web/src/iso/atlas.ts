// 굽기(web/bake/)가 쓰고 화면(iso/)이 읽는 atlas.json 의 모양.
// 좌표는 「구운 픽셀」 — 기준점이 (0, 0) 이고, 점 p 는 (p·right·scale, −p·up·scale) 로 간다.

export interface SpriteRect {
  sheet: string;        // 그림 파일 (sprites/ 안)
  sx: number; sy: number; w: number; h: number;   // 그림 파일 안의 자리
  ox: number; oy: number;                         // 기준점(anchor)에서 그림 왼쪽 위까지 (구운 픽셀)
}

// 모듈 하나 — 기준점은 모듈 원점(왼쪽 뒤 바닥 모서리)
export interface ModuleSprites {
  floor?: SpriteRect;                             // 바닥·격자·깔개·그림자
  objects?: SpriteRect;                           // 가구·벽
  items: Record<string, SpriteRect>;              // modules.ts 의 item id — 캐릭터 앞에 다시 그린다
}

export interface Atlas {
  version: number;
  scale: number;                                  // 세계 1 = 구운 픽셀 scale
  right: [number, number, number];
  up: [number, number, number];
  modules: Record<string, ModuleSprites>;
  bodies: Record<string, SpriteRect>;             // bodyKey(), 기준점 = 발
  heads: Record<string, SpriteRect>;              // headKey(), 기준점 = 머리 가운데 (0, HEAD_Y, 0)
}

export const bodyKey = (color: number, shape: string, sit: boolean) =>
  `${color.toString(16).padStart(6, '0')}-${shape}-${sit ? 'sit' : 'stand'}`;
export const headKey = (skin: number, look: string, cap: boolean, dir: number) =>
  `${skin.toString(16).padStart(6, '0')}-${look}${cap ? '-cap' : ''}-${dir}`;

// 한 번만 받는다 — 무대(Stage)와 목록(Panel)이 같이 쓴다
export interface Loaded { atlas: Atlas; sheets: Record<string, HTMLImageElement> }
let loading: Promise<Loaded> | null = null;
export function loadAtlas(): Promise<Loaded> {
  loading ??= (async () => {
    const atlas: Atlas = await (await fetch('sprites/atlas.json')).json();
    const names = new Set<string>();
    for (const m of Object.values(atlas.modules)) {
      if (m.floor) names.add(m.floor.sheet);
      if (m.objects) names.add(m.objects.sheet);
      for (const r of Object.values(m.items)) names.add(r.sheet);
    }
    for (const r of [...Object.values(atlas.bodies), ...Object.values(atlas.heads)]) names.add(r.sheet);
    const sheets: Record<string, HTMLImageElement> = {};
    await Promise.all([...names].map((n) => new Promise<void>((ok, bad) => {
      const img = new Image();
      img.onload = () => ok();
      img.onerror = () => bad(new Error(`sprites/${n}`));
      img.src = `sprites/${n}`;
      sheets[n] = img;
    })));
    return { atlas, sheets };
  })();
  return loading;
}
