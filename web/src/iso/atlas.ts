// 굽기(web/bake/)가 쓰고 화면(iso/)이 읽는 atlas.json 의 모양.
// 좌표는 「구운 픽셀」 — 기준점이 (0, 0) 이고, 점 p 는 (p·right·scale, −p·up·scale) 로 간다.
import { DIRS } from '../scene/layout.ts';
import { FACE_ACC, HEAD_ACC, NECK_ACC, WIDE_ACC, accColor, type Acc, type Appearance } from '../scene/appearance.ts';

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
  heads: Record<string, SpriteRect>;              // 머리 층 — faceKey·hairKey·accKey·capKey, 기준점 = 머리 가운데 (0, HEAD_Y, 0), 보통 몸집
  dinos: Record<string, SpriteRect>;              // dinoKey(), 기준점 = 발
  fish?: Record<string, SpriteRect>;              // fishKey(), 기준점 = 몸 가운데
}

export const fishKey = (kind: number, frame: number, dir: number) => `${kind}-${frame}-${dir}`;

export const dinoKey = (color: number, pose: string, frame: number, dir: number) =>
  `${color.toString(16).padStart(6, '0')}-${pose}-${frame}-${dir}`;

export const bodyKey = (color: number, shape: string, sit: boolean) =>
  `${color.toString(16).padStart(6, '0')}-${shape}-${sit ? 'sit' : 'stand'}`;
const hex6 = (c: number) => c.toString(16).padStart(6, '0');
export const faceKey = (skin: number, dir: number) => `face-${hex6(skin)}-${dir}`;
export const hairKey = (hair: string, hc: number, dir: number) => `hair-${hair}-${hex6(hc)}-${dir}`;
export const accKey = (acc: string, color: number, wide: boolean, dir: number) => `acc-${acc}-${hex6(color)}${wide ? '-w' : ''}-${dir}`;
export const capKey = (dir: number) => `cap-${dir}`;

// 머리 층을 겹칠 차례. 얼굴 → (앞을 보면) 머리카락 → 얼굴·목의 것 / (등을 보이면) 얼굴·목의 것 → 머리카락 → 쓰는 것 → 모자.
// 층마다 얼굴·몸에 가린 곳은 굽기에서 이미 지웠다 — 층끼리 가리는 것만 차례로 맞춘다(등 뒤에서는 긴 머리가 안경다리·목도리를 덮는다).
export function headLayers(atlas: Atlas, L: Appearance, dir: number): SpriteRect[] {
  const front = Math.sin((dir * 2 * Math.PI) / DIRS) + Math.cos((dir * 2 * Math.PI) / DIRS) > -1e-6;   // 얼굴이 카메라(+x+z) 쪽
  const wide = L.build === 'w';
  const acc = (list: readonly Acc[]) => L.acc.filter((a) => list.includes(a)).map((a) => atlas.heads[accKey(a, accColor(a, L), wide && WIDE_ACC.has(a), dir)]);
  const hair = atlas.heads[hairKey(L.hair, L.hc, dir)];
  const near = [...acc(FACE_ACC), ...acc(NECK_ACC)];
  return [
    atlas.heads[faceKey(L.skin, dir)],
    ...(front ? [hair, ...near] : [...near, hair]),
    ...acc(HEAD_ACC),
    ...(L.cap ? [atlas.heads[capKey(dir)]] : []),
  ].filter((r): r is SpriteRect => !!r);
}

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
    for (const r of [...Object.values(atlas.bodies), ...Object.values(atlas.heads), ...Object.values(atlas.dinos ?? {}), ...Object.values(atlas.fish ?? {})]) names.add(r.sheet);
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
