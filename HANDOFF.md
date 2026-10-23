# HANDOFF

**2026-10-23** · **v0.1.0** — 첫 판이 섰다 ([wetherilli 001](devlog/20261023_wetherilli_001_initial_build.md)).
paleo-server 의 sclee 계정에서 `npm start` 가 tmux 세션 `fl` 에 떠 있다 — `http://127.0.0.1:8098/`.
사용자 PC 에서는 SSH 터널(`ssh -L 8098:127.0.0.1:8098 sclee@paleo-server`)로만 본다 — 사내망에는 아직 안 냈다.
계획은 [P01](devlog/20261023_wetherilli_P01_initial_build.md), 시작 문서·시제품은 `docs/`.
이어서 할 사람은 여기부터.

## 0. 사람이 정할 것

- **사내망에 낼지** — 내면 세션 이름·프로젝트·도구 한 줄(파일 이름·명령 설명)이 `http://paleolab/kopricyberfossillab/` 로 보인다. 정하면 admin 이 `deploy/nginx/` 조각을 깐다(sudo)
- **라이선스** — `LICENSE` 가 없다(`.guides/branding.md` §3). Claw3D·pixel-agents 는 MIT 이고 코드는 옮기지 않았다
- **화면 제목** — 지금 `KOPRI Cyber Fossil Lab`

## 1. 지금 있는 것

| | 지금 |
|---|---|
| 서버 | `server/` — 1초 폴링, SSE. 읽는 것: 세션 등록·job state·JSONL·하위 에이전트·tmux·ps. 의존성 없음 |
| 화면 | 연구실 16×14, 책상 여덟(시제품 넷 + 한 줄 더), 코어 보관대(git)·현미경 책상(시험)·라운지·화이트보드(다른 계정·책상 없는 세션)·문, 왼쪽 벽 tmux 모니터 넷 |
| 시험 | 5개 (`npm test`) — 도구 가르기, 래치, 확인 대기 추정 |
| 못 하는 것 | 터미널 세션의 권한 대기는 auto 모드에서 안 보인다(묻지 않으니 맞다) · 다른 계정은 바쁨/쉼만(CPU) · 청소부·스탠드업 없음 |

## 2. 다음

`TODOs.md`.
