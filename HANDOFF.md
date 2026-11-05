# HANDOFF

**2026-11-05** · **v0.16.1** — 명판을 문틀 가로폭에 맞춤(판·글자 비율 같은 한 꼴을 문틀 폭으로 scale, 화면만). v0.16.0 — 식당가 점원(끼니 한 시간 전 출근·조리·응대·마감·퇴근)과 바깥 손님(점심·저녁 4~6명, 테라스 구경), 식당가 엘리베이터([026](devlog/20261105_wetherilli_026_diner_staff_guests.md), 화면만 — 빌드로 끝, 확인은 `?demo&hour=11.5`·`12.7`·`14.2`). v0.15.0 — 아래층 식당가: 테라스 앞 반 층 낮은 날개와 계단, 「티렉스 버거」·「장보고 국밥·국수」, 끼니(아침·점심·저녁)에 제비로 먹으러 가기·먹다 불려 가면 불평([025](devlog/20261105_wetherilli_025_downstairs_diner.md), 화면만 — 빌드로 끝, 확인은 `?demo&meal&hour=12.5`). v0.14.0 — shkim 「선호와 함께 춤을」 사막 방·전갈·걷는 선인장·낡은 벽지·거미줄·기운 명판([024](devlog/20261027_wetherilli_024_desert_room.md), 화면만). v0.12.0 — 직원들 대사를 훨씬 다양하게([023](devlog/20261027_wetherilli_023_more_chatter.md), 화면만 — 빌드로 끝). v0.11.0 — 부서 이름도 두 번 눌러 고치기([022](devlog/20261026_wetherilli_022_rename_departments.md)). v0.10.0 — 2인실·GSM 4인실·고객센터 1인실([021](devlog/20261026_wetherilli_021_small_offices_one_desk_center.md)). v0.9.0 — 얼굴을 두 번 눌러 생김새 고치기·고친 것을 모두와 같이([020](devlog/20261026_wetherilli_020_look_editor_shared_people.md)). v0.8.0 — 다른 계정도 본인이 켜면 보인다([koprifossillab P01](devlog/20261026_koprifossillab_P01_opt_in_other_accounts.md) → [wetherilli 019](devlog/20261026_wetherilli_019_opt_in_other_accounts.md)).
**깔기는 끝났다**(2026-10-26 17:23, v0.8.0 유닛·스킬) — 지금 도는 판은 v0.10.0(v0.11.0 은 재시작을 기다린다). 표지를 켠 계정은 paleoadmin 하나, 나머지는 「다른 계정」(바쁨/쉼만).
사내망 `http://paleolab/kopricyberfossillab/`, 서버는 systemd `kopricyberfossillab.service`(User=sclee, 127.0.0.1:8098) — 운영은 paleoadmin.
이어서 할 사람은 여기부터.

## 0. 운영 계정(paleoadmin)

**깔린 것** (2026-10-26) — systemd `kopricyberfossillab.service`(enabled, `CAP_DAC_READ_SEARCH` 만), 스킬 `fl-visible`
(`/usr/local/share/kopricyberfossillab/skills/fl-visible` ← 각 계정 `~/.claude/skills/fl-visible`, `/etc/skel`). 남은 것은 각 계정 주인에게
「자기 Claude Code 세션에서 『fl 에서 보이게 해줘』」라고 알리는 일.

**판을 올릴 때** — 화면(`web/`)만 고쳤으면 sclee 의 `npm run build` 로 끝(web/dist 는 요청마다 읽는다). 서버(`server/`)를 고쳤으면 그 뒤
sclee 가 `npm run restart` — `install-service.sh` 가 깐 `/etc/sudoers.d/kopricyberfossillab`(이 서비스의 restart 하나만 비밀번호 없이)를 쓴다.
**아직 안 깔렸다** — paleoadmin 이 `git pull` 하고 `sudo bash deploy/host/install-service.sh` 를 한 번 다시 돌려야 한다. 그 전에는 예전처럼 paleoadmin 이 `sudo systemctl restart kopricyberfossillab`.
`deploy/host/` 의 유닛·스킬이 바뀌었으면 paleoadmin 클론(`~paleoadmin/projects/kopricyberfossillab`)에서 `git pull` 하고
`sudo bash deploy/host/install-service.sh`·`install-skill.sh` 를 다시(몇 번 돌려도 같다). sudo 는 비밀번호를 물으니 `!` 말고 터미널에서.
nginx 조각을 고치면 `sudo bash deploy/host/install.sh`. 502 면 `systemctl status kopricyberfossillab`·`journalctl -u kopricyberfossillab`.

## 0-1. 사람이 정할 것

- **라이선스** — `LICENSE` 가 없다(`.guides/branding.md` §3). Claw3D·pixel-agents 는 MIT 이고 코드는 옮기지 않았다
- **화면 제목** — 지금 `KOPRI Cyber Fossil Lab`

## 1. 지금 있는 것

| | 지금 |
|---|---|
| 서버 | `server/` — 1초 폴링, SSE. 계정 목록(`paths.ts`) · 세션 등록·job state·JSONL·하위 에이전트·tmux·ps·한도 파일. room(프로젝트·center·general)·offices(크기는 커밋 수, 10분 캐시 — 화면은 이제 안 쓴다: GSM 4인실, 나머지 2인실) |
| 화면 | 모듈 22가지를 프로젝트 목록대로 놓는다(`world.ts`) — 테라스 앞에 반 층 낮은 식당가(`downstairs`, 높이는 `heightAt`). 그림은 `npm run bake`(17초) — 모듈마다 floor·objects 층, 가구 조각(4096 폭 — 높이 8192 를 넘기지 않는다), 몸 432·머리 층 1264, 음식 |
| 시험 | 54개 (`npm test`) — 판정·래치·방·한도·다른 계정(표지·여는 파일)·고친 것 거르기 + **벽 넘기**(주요 자리 모든 쌍, 식당 자리·점원 자리·엘리베이터까지) · 계단으로만 오르내리기 · 끼니 제비 · 점원 시간표·손님 수·자리 뺏지 않기 · 공룡 먹이 · 잡담 |
| 한도 게이지 | sclee 의 statusLine 이 tee 를 거친다. 값은 **대화형 세션이 응답할 때만** 새로 쓰인다 — 아무도 안 쓰면 「n분 전 값」 |
| 고친 이름·생김새·부서 이름 | `~/.local/share/kopricyberfossillab/people.json`·`rooms.json`(서버가 씀, `PUT /api/people` — 누구나, 좁게 거름) → `Snapshot.people`·`Snapshot.rooms`. 화면 줄임말은 `names.ts alias()` |
| 다른 계정 | 표지 `~/.claude/fl-visible` 을 켠 계정만 기록까지(방 「계정/프로젝트」·「@계정」), 나머지는 ps 로 바쁨/쉼만. 남의 tmux 는 안 본다 |
| 끼니 | 아침 7–8·점심 12–14·저녁 18–20, 쉬는 사람마다 한 번 제비(40·85·60%), 주문 20~40초 + 먹기 5~8분(`meals.ts`). 시각은 보는 사람의 지역 시각(`?hour=` 는 그 시각부터 흐른다) |
| 점원·손님 | 세션이 아닌 사람 — `staff.ts`(언제)·`director.ts placeExtras`(어디)·`Cast` 의 `Actor.npc`. 점원 6–8:30·11–14:30·17–20:30(점심 버거집 둘), 손님 점심·저녁 4~6명, 세션 사람 자리 먼저, 로비 왼쪽 엘리베이터로 드나든다 |
| 명판 | 모두 한 꼴(폭 76·글자 9, `Stage` `PLAQUE_W`·`styles.css .plaque`)을 문틀 가로폭(`span`, 없으면 1.4)에 맞춰 scale — 확대와 같이 커진다. 건물 전체를 보면 작아 읽기 어렵다 |
| 못 하는 것 | 터미널 세션의 권한 대기는 auto 모드에서 안 보인다 |

## 2. 다음

`TODOs.md`.
