# P02 — 2.5D: 3D 를 구워 Canvas 2D 로

2026-10-23 · `work/20261023-wetherilli` · wetherilli

사용자: 「시점을 고정한다면 꼭 3D 일 필요는 없지 않나, 2.5D 수준에서 해결될 텐데」. 상의 끝에 정한 것:
**로우폴리 모양은 그대로, 그리는 방식만 바꾼다(갈래 A)** — 3D 장면은 굽는 도구로만 남긴다.

## 모양

```
npm run bake   (그림이 바뀔 때만, 이 서버에서)
  tools/bake.ts → vite + chromium(playwright 1.49.1) → web/bake.html 이 three.js 로 장면을 그려
  web/public/sprites/{background.png, furniture.png, characters.png, atlas.json} — 저장소에 넣는다
화면
  배경 한 장 + 가구 조각 + 캐릭터 조각을 Canvas 2D 로 붙인다. 모니터 빛·빨간 링·그림자는 2D 다각형
```

- **투영은 atlas.json 이 말한다** — 카메라의 오른쪽·위 벡터와 축척. 화면은 같은 식으로 바닥 좌표 (x, z) 를 픽셀로 바꾼다.
- **가림** — 배경에는 가구가 다 들어 있다. 캐릭터 앞에 오는 가구만 조각으로 한 번 더 그린다.
  캐릭터가 상자 앞이면(x > 상자 x1 이거나 z > 상자 z1) 상자 뒤에 그린다. 캐릭터끼리는 x+z.
- **캐릭터 조각** — 몸 색 9(팔레트 8 + 다른 계정 회색) × 머리 꼴 × 방향 8 × 앉음/섬. 하위 에이전트는 줄여 그린다.
- 서버·`director.ts`·`nav.ts` 는 그대로 — 바닥 좌표로만 일한다.

## 버리는 것

- 드래그 회전 — 시점 고정이 출발점. 휠 확대·끌어 옮기기는 2D 로 둔다.
- `@react-three/fiber`·`drei` — 화면 묶음에서 three 가 빠진다(three 는 굽기에만, devDependency).
- 서버가 화면을 그려 보내는 것 — 서버 CPU·네트워크가 더 든다. 브라우저가 조각을 붙이는 쪽이 가볍다.
