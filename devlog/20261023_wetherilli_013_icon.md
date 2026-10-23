# 013 — 아이콘: 등각 연구실 한 칸 + 빛나는 삼엽충

2026-10-23 · `work/20261023-wetherilli-icon` · wetherilli

사용자: 「kopri-devdocs 참고해서 아이콘 하나 만들어줘, 적절한 곳에 붙이도록」. fl-agent-office-3d 세션이 나눠 맡겼다 —
이 글은 파일만(빌드 스크립트와 결과), 붙이기(web/index.html 파비콘·paleolab 첫 화면 카드)는 그 세션이 한다.

## 한 것

- **`tools/icon/build.py`** — `kopri-devdocs/guides/logo-animation` 의 순서대로, 형제 클론(`../kopri-devdocs`)의 `logokit` 을 sys.path 로 불러
  `icon_set(..., pwa=True)` 로 세트를 만든다. venv 는 `~/venv/kopricyberfossillab`(README 의 requirements, 저장소 밖).
- **그림** — 등각 방 한 칸(바닥·벽 둘)을 화면과 같은 투영(30°)으로. 왼쪽 벽에 삼엽충 화석, 오른쪽 벽에 회로선 — 둘 다 포인트 색 `#38bdf8`.
  그 앞에 책상·모니터(화면이 같은 포인트 색), 등을 보이고 앉은 사람. 나머지는 바탕 `#0f172a` 에서 이어지는 slate 명암 단계.
- **결과** `web/public/icons/` — `kopricyberfossillab-icon.svg`(원본)·`-icon-square.svg`·`-icon-512.png`·`favicon.ico`(16·32·48)·`favicon-16/32.png`·
  `icon-192.png`·`icon-512-maskable.png`·`apple-touch-icon.png`(180, 모서리 없음). paleolab 카드(1.4rem ≈ 22px, 고해상도 44px)를 위해 `icon-48.png`·`icon-96.png` 를 더했다.
- `--check` 를 붙이면 512·64·32·16 을 나란히 놓은 점검 시트를 저장소 밖(TMPDIR)에 쓴다.

## 왜 · 버린 것

- **모티프** — README 의 「한 아이콘에 아이디어 하나」: 이 앱은 결국 「연구실 미니어처」라 방 한 칸을 틀로 삼고, 「Fossil」 은 벽의 화석 하나, 「Cyber」 는 회로선과 화면 빛으로만.
  삼엽충만 크게 그리는 안은 Cropobite(삼엽충)와 겹쳐 버렸다.
- **첫 시안의 삼엽충** — 선으로만 그렸더니 벽의 기울기와 겹쳐 생선뼈처럼 읽혔다. 채운 모양(두부·마디 다섯·미부)에 벽 색으로 축엽 선만 긋도록 바꿨다.
  회로선도 셋 → 둘, 굵게. 사람·책상·모니터를 키우고 방을 캔버스에 더 채웠다(K 236 → 252).
- **16px** — 방 꼴과 파란 빛 두 점(화석·화면) 정도만 남는다. 16px 전용으로 단순화한 그림을 따로 두는 안도 있었지만, icon_set 은 그림 하나로 세트를 만들고
  32px 이상에서는 알아볼 수 있어 그대로 두었다.
- **색** — 포인트 `#38bdf8` 은 DiaRUGA 의 하늘색(`#7dd3fc`)과 같은 계열이고, 바탕 남색은 confoinfo(`#0b2239`)와 가깝다. 이 앱 화면의 색이라 그대로 썼다 — README 의 「도구끼리 색을 겹치지 않게」와는 어긋나니,
  나란히 놓았을 때 헷갈리면 포인트만 바꾸면 된다(`P["acc"]`).
- **빌드 GIF·가로형 로고** — 맡은 일이 아이콘이라 만들지 않았다. 그림 함수(`scene()`)가 하나라 나중에 GIF 를 더해도 같은 함수를 쓴다.
