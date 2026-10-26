# HANDOFF

**2026-10-26** · **v0.8.0** — 다른 계정도 본인이 켜면 보인다([koprifossillab P01](devlog/20261026_koprifossillab_P01_opt_in_other_accounts.md) → [wetherilli 019](devlog/20261026_wetherilli_019_opt_in_other_accounts.md)).
**코드는 main 에 있고, 깔기(§0)는 아직** — 깔기 전에는 예전처럼 다른 계정은 「다른 계정」(바쁨/쉼만)으로 보인다.
사내망 `http://paleolab/kopricyberfossillab/`, 서버는 systemd `kopricyberfossillab.service`(User=sclee, 127.0.0.1:8098) — 운영은 paleoadmin.
이어서 할 사람은 여기부터.

## 0. 운영 계정(paleoadmin)

**할 것 (v0.8.0)** — sclee 가 `npm run build` 한 뒤, paleoadmin 클론(`~paleoadmin/projects/kopricyberfossillab`)에서:
```bash
git pull
sudo bash deploy/host/install-service.sh    # 새 유닛 — CAP_DAC_READ_SEARCH
sudo bash deploy/host/install-skill.sh      # 각 계정 ~/.claude/skills/fl-visible (+ /etc/skel)
```
그 뒤 각 계정 주인에게 「자기 Claude Code 세션에서 『fl 에서 보이게 해줘』」. 판을 올릴 때마다 sclee 의 `npm run build` + `sudo systemctl restart kopricyberfossillab`.
nginx 조각을 고치면 `sudo bash deploy/host/install.sh`. 502 면 `systemctl status kopricyberfossillab`·`journalctl -u kopricyberfossillab`.

## 0-1. 사람이 정할 것

- **라이선스** — `LICENSE` 가 없다(`.guides/branding.md` §3). Claw3D·pixel-agents 는 MIT 이고 코드는 옮기지 않았다
- **화면 제목** — 지금 `KOPRI Cyber Fossil Lab`

## 1. 지금 있는 것

| | 지금 |
|---|---|
| 서버 | `server/` — 1초 폴링, SSE. 계정 목록(`paths.ts`) · 세션 등록·job state·JSONL·하위 에이전트·tmux·ps·한도 파일. room(프로젝트·center·general)·offices(크기는 커밋 수, 10분 캐시) |
| 화면 | 모듈 18가지를 프로젝트 목록대로 놓는다(`world.ts`). 그림은 `npm run bake`(7초) — 모듈마다 floor·objects 층, 가구 조각, 몸 36·머리 336 |
| 시험 | 27개 (`npm test`) — 판정·래치·방·한도·다른 계정(표지·여는 파일) + **벽 넘기**(주요 자리 모든 쌍) · 공룡 먹이 |
| 한도 게이지 | sclee 의 statusLine 이 tee 를 거친다. 값은 **대화형 세션이 응답할 때만** 새로 쓰인다 — 아무도 안 쓰면 「n분 전 값」 |
| 다른 계정 | 표지 `~/.claude/fl-visible` 을 켠 계정만 기록까지(방 「계정/프로젝트」·「@계정」), 나머지는 ps 로 바쁨/쉼만. 남의 tmux 는 안 본다 |
| 못 하는 것 | 터미널 세션의 권한 대기는 auto 모드에서 안 보인다 |

## 2. 다음

`TODOs.md`.
