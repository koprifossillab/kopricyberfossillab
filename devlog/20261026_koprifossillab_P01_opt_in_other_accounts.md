# P01 — 다른 계정도 보이게: 본인이 켜는 표지 + 읽기 권한

2026-10-26 · `main` · koprifossillab (운영, paleoadmin 세션)

사용자: 「서버 내 다른 계정의 작업도 보이게」, 이어서 「사용자가 자기 세션에서 fl 에서 보이게 해줘라고 하면 보이게 — 스킬로」.
지금은 sclee 의 `~/.claude` 하나만 읽고, 다른 계정은 `foreign`(ps 로 있다·바쁘다만, 방 `@계정`)이다.
구현은 sclee 클론에서 한다(서비스가 그 클론을 돌린다). 이 문서는 그 세션에 넘기는 계획이다.

## 같은 날 운영 쪽에서 한 것

- 재부팅으로 tmux `fl` 이 꺼져 502 — `deploy/host/install-service.sh` 로 systemd 에 올렸다(enabled, 16:49). 이제 운영은 paleoadmin 이 맡는다.
- 화면이 0.6.5 로 보인 것은 서버가 아니라 `web/dist` 가 옛 빌드라서다(`/healthz` 는 0.7.0). 판을 올리면 sclee 가 `npm run build`, paleoadmin 이 `sudo systemctl restart kopricyberfossillab`.

## 정한 것

1. **읽기 권한은 `CAP_DAC_READ_SEARCH`** — 유닛에 `AmbientCapabilities=CAP_DAC_READ_SEARCH`. 서비스는 그대로 `User=sclee`, 얻는 것은 읽기·디렉터리 훑기뿐(쓰기·root 아님).
2. **보이는 것은 본인이 켠 계정만** — 표지 `~/.claude/fl-visible`. 있으면 sclee 처럼 읽고, 없으면 지금처럼 `foreign`.
3. **켜고 끄기는 스킬** — 「fl 에서 보이게 해줘」·「fl 에서 숨겨줘」. 원본은 저장소 `deploy/skill/fl-visible/SKILL.md`,
   paleoadmin 이 sudo 로 각 계정 `~/.claude/skills/fl-visible` 에 링크를 건다(남의 집에 파일을 넣는다 — 사용자가 괜찮다고 했다). 새 계정은 `/etc/skel` 에도.

## 버린 것

- **ACL(setfacl)** — Claude Code 는 JSONL·`jobs/*/state.json` 을 **0600** 으로 새로 만든다. 기본 ACL 의 마스크가 만들 때의 그룹 비트(0)로 깎여
  이름 붙인 사용자 항목이 힘을 잃는다 — 폴더에 걸어 두어도 새 대화는 못 읽는다. 주기적으로 다시 거는 것은 늦고 지저분하다.
- **서비스를 root 로** — 웹을 내보내는 데몬이 root 가 된다. 필요한 것은 읽기뿐이다.
- **ps·/proc 만 더 짜내기** — 남의 프로세스는 cwd 도 못 읽는다(ptrace 권한). 지금보다 나아질 것이 없다.
- **sudo 로 도는 좁은 읽기 도우미** — 더 좁지만 코드·sudoers 가 늘고, 표지로 동의를 받으니 이득이 작다.

## 지킬 것

- **표지의 주인 uid 가 그 집 주인일 때만** 인정한다(`fs.stat` 의 uid 와 `/etc/passwd` 의 집 주인 비교). 심볼릭 링크 표지는 무시.
- **읽는 것은 지금과 같은 셋만**: `sessions/*.json`, `jobs/*/state.json`, `projects/**/*.jsonl` 꼬리. `sessions/*.key`·`settings.json`·`.credentials.json` 등은 **열지 않는다**.
  화면에 싣는 것도 지금처럼 활동·한 줄까지 — 대화 본문·명령 전체는 싣지 않는다.
- 이 약속은 커널이 아니라 **코드가 지킨다** — 프로세스는 모든 파일을 읽을 수 있다. 스킬의 안내문에 이 사실을 그대로 쓴다.
- 표지를 지우면 다음 폴링(1초)에 `foreign` 으로 돌아간다. 캐시(커밋 수 10분 등)에 그 계정 것이 남지 않게.

## 코드 (sclee 세션이 할 일)

- `server/paths.ts` — `CLAUDE_HOME` 하나를 **계정 목록**으로: 나(sclee) + `/home/*/.claude/fl-visible` 이 있는 계정. `FL_CLAUDE_HOME` 은 시험용으로 남긴다.
- `server/office.ts` — 세션·job·하위 에이전트 읽기를 계정마다. 에이전트 id 에 계정(`<user>/…`), Agent 에 `user`.
  `HOME` 으로 프로젝트 이름을 뽑는 곳(54행 근처)·커밋 수(`~/projects/<p>`, 25행 근처)를 그 계정의 집으로.
- **방 이름** — sclee 는 지금 그대로, 다른 계정은 `<user>/<project>`(같은 이름 프로젝트와 섞이지 않게). 사무실 명판도 그렇게.
- `server/system.ts` `foreignClaudes` — 켠 계정의 claude 는 세션 등록으로 이미 보이므로 `foreign` 에서 뺀다(두 번 세지 않게).
- tmux — 남의 tmux 소켓(`/tmp/tmux-<uid>`)은 이번에 하지 않는다. 터미널은 sclee 것만.
- `server/model.ts` 를 고치면 `web/src/types.ts` 도.
- 시험: 손으로 지은 두 집(`FL_` 환경변수로 뿌리를 바꿔) — 표지 있음/없음/남이 만든 표지/심볼릭 링크, `.key` 를 열지 않는지.
- `deploy/host/kopricyberfossillab.service` 에 `AmbientCapabilities=CAP_DAC_READ_SEARCH`(필요하면 `CapabilityBoundingSet` 도 같은 하나로).
- `deploy/skill/fl-visible/SKILL.md` — 켜기: `~/.claude/fl-visible` 에 시각 한 줄, 끄기: 지우기. 무엇이 보이고 무엇은 안 보이는지 안내.
- `deploy/host/install-skill.sh` — sudo 로 `/home/*/.claude/skills/fl-visible` 링크(주인을 그 계정으로), `/etc/skel` 에도. 몇 번 돌려도 같게.

## 운영 (paleoadmin 이 할 일, 구현이 main 에 오면)

```bash
git pull
sudo bash deploy/host/install-service.sh    # 새 유닛(읽기 권한)으로 다시
sudo bash deploy/host/install-skill.sh
```
그 뒤 각 계정 주인에게 「자기 세션에서 『fl 에서 보이게 해줘』」라고 알린다.
