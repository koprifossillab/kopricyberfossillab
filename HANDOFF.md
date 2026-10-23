# HANDOFF

**2026-10-23** · **v0.3.0** — 방이 셋이다 ([wetherilli 003](devlog/20261023_wetherilli_003_three_rooms.md)): 사무실(사람이 시킨 일) ·
고객센터(다른 세션이 보낸 지령) · 휴게실(쉬는 세션). 화면은 2.5D — 로우폴리 3D 를 미리 구워 Canvas 2D 로 붙인다 ([wetherilli 002](devlog/20261023_wetherilli_002_isometric_sprites.md)). 첫 판은 [wetherilli 001](devlog/20261023_wetherilli_001_initial_build.md).
paleo-server 의 sclee 계정에서 `npm start` 가 tmux 세션 `fl` 에 떠 있다 — `http://127.0.0.1:8098/`.
**사내망 주소 `http://paleolab/kopricyberfossillab/`** — 첫 화면 「Coding work」 칸에 길을 냈다([wetherilli 004](devlog/20261023_wetherilli_004_paleolab_route.md)).
**nginx 는 아직** — 사람이 `sudo bash deploy/host/install.sh` 한 번(sudo 가 비밀번호를 물어 세션이 못 돌렸다). 그 전에는 SSH 터널로만.
계획은 [P02](devlog/20261023_wetherilli_P02_isometric_sprites.md)·[P01](devlog/20261023_wetherilli_P01_initial_build.md), 시작 문서·시제품은 `docs/`.
이어서 할 사람은 여기부터.

## 0. 사람이 정할 것

- **`sudo bash deploy/host/install.sh`** — nginx 길. 사내망에 내기로 2026-10-23 사용자가 정했다
- **라이선스** — `LICENSE` 가 없다(`.guides/branding.md` §3). Claw3D·pixel-agents 는 MIT 이고 코드는 옮기지 않았다
- **화면 제목** — 지금 `KOPRI Cyber Fossil Lab`

## 1. 지금 있는 것

| | 지금 |
|---|---|
| 서버 | `server/` — 1초 폴링, SSE. 읽는 것: 세션 등록·job state·JSONL·하위 에이전트·tmux·ps. 의존성 없음 |
| 그리기 | `npm run bake` 로 구운 `web/public/sprites/`(배경·가구 19·캐릭터 272) 를 Canvas 2D 로. 가구를 고치면 다시 굽는다 |
| 화면 | 24×14 — 사무실 16×10(책상 여덟, 코어 보관대·현미경 책상·화이트보드, 왼쪽 벽 tmux 모니터 넷) · 휴게실 16×4 · 고객센터 8×14(상담 책상 여섯·지령판·문) |
| 방 가르기 | 최근 받은 말 8개 중 `origin.kind=peer` 가 절반 이상이면 고객센터. 지금은 다른 세션의 메시지만 「외부 지령」 으로 본다 |
| 시험 | 5개 (`npm test`) — 도구 가르기, 래치, 확인 대기 추정 |
| 못 하는 것 | 터미널 세션의 권한 대기는 auto 모드에서 안 보인다(묻지 않으니 맞다) · 다른 계정은 바쁨/쉼만(CPU) · 청소부·스탠드업 없음 |

## 2. 다음

`TODOs.md`.
