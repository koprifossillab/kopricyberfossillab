# HANDOFF

**2026-10-23** · **v0.4.2** — 공룡 방·벽 명판·그리는 차례 고침([010](devlog/20261023_wetherilli_010_dino_room_plaques.md)). 건물이 프로젝트 목록에서 지어진다 ([wetherilli 005](devlog/20261023_wetherilli_005_modular_building.md)):
프로젝트마다 사무실(크기는 커밋 수, GSM 은 지도, rash-company 는 칙칙하게) · 공용실·고객센터·휴게실·자료실·화장실·창고·입구.
상단바에 사용 한도 게이지([006](devlog/20261023_wetherilli_006_limits_gauge.md)), 소품 25가지([007](devlog/20261023_wetherilli_007_office_props.md)),
재부팅 뒤 자동 시작 유닛([008](devlog/20261023_wetherilli_008_autostart_service.md) — **설치는 아직**, §0).
사내망 `http://paleolab/kopricyberfossillab/`, 서버는 sclee 의 tmux `fl`(`npm start`, 127.0.0.1:8098).
이번 판들은 세 세션이 나눠 했다 — 판 세션이 005·009·010, 다른 둘이 006·008 과 007. worktree 는 합친 뒤 지웠다(`-wt-props` 는 모형 세션이 끝나 남은 것 — 지워도 된다).
이어서 할 사람은 여기부터.

## 0. 운영 계정(paleoadmin)

**끝났다**(2026-10-23) — nginx 길(`sudo bash deploy/host/install.sh`)과 `workon fl`(`deploy/host/add-workon.sh`).
**남은 것: 자동 시작** — sclee 가 tmux `fl` 을 먼저 닫고(`tmux kill-session -t fl`), paleoadmin 이 `git pull && sudo bash deploy/host/install-service.sh`.
그 뒤로 서버는 systemd `kopricyberfossillab.service`(User=sclee)로 돈다 — 판을 올리면 `sudo systemctl restart kopricyberfossillab` 이 필요하다(sclee 는 못 함).
클론은 `~paleoadmin/projects/kopricyberfossillab`. 조각을 고치면 paleoadmin 이 `git pull && sudo bash deploy/host/install.sh` 를 다시 한다.
`/kopricyberfossillab/` 가 502 면 sclee 의 서버(tmux `fl`)가 내려간 것 — sclee 가 `workon fl && npm start`.

## 0-1. 사람이 정할 것

- **라이선스** — `LICENSE` 가 없다(`.guides/branding.md` §3). Claw3D·pixel-agents 는 MIT 이고 코드는 옮기지 않았다
- **화면 제목** — 지금 `KOPRI Cyber Fossil Lab`

## 1. 지금 있는 것

| | 지금 |
|---|---|
| 서버 | `server/` — 1초 폴링, SSE. 세션 등록·job state·JSONL·하위 에이전트·tmux·ps·한도 파일. room(프로젝트·center·general)·offices(크기는 커밋 수, 10분 캐시) |
| 화면 | 모듈 18가지를 프로젝트 목록대로 놓는다(`world.ts`). 그림은 `npm run bake`(7초) — 모듈마다 floor·objects 층, 가구 조각, 몸 36·머리 336 |
| 시험 | 15개 (`npm test`) — 판정·래치·방·한도 + **벽 넘기**(주요 자리 모든 쌍) · 공룡 먹이 |
| 한도 게이지 | sclee 의 statusLine 이 tee 를 거친다. 값은 **대화형 세션이 응답할 때만** 새로 쓰인다 — 아무도 안 쓰면 「n분 전 값」 |
| 못 하는 것 | 터미널 세션의 권한 대기는 auto 모드에서 안 보인다 · 다른 계정은 바쁨/쉼만 |

## 2. 다음

`TODOs.md`.
