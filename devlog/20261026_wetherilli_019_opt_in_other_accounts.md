# 019 — 다른 계정도 보이게 (P01 구현)

2026-10-26 · `work/20261026-wetherilli` · wetherilli

[koprifossillab P01](20261026_koprifossillab_P01_opt_in_other_accounts.md) 을 그대로 따랐다 — 읽기 권한은 `CAP_DAC_READ_SEARCH`, 보이는 것은 표지
`~/.claude/fl-visible` 을 스스로 켠 계정만, 켜고 끄기는 스킬 `fl-visible`. 여기는 계획에 없던 것, 계획과 다르게 한 것만 적는다.

## 서버

- `paths.ts` 의 `accounts()` 가 매 폴링마다 `/etc/passwd`(uid 1000 이상, nobody 빼고)를 훑어 표지를 본다. 1초에 계정 열 남짓 `lstat` 이라 캐시를 두지 않았다 —
  캐시가 있으면 「끄면 1초 안에」가 깨진다. 표지는 `lstat` 으로 **보통 파일이고 주인 uid 가 passwd 의 그 계정 uid** 일 때만.
- **표지가 있어도 `sessions/` 를 못 읽으면 켜지 않은 것으로** — 계획에 없던 조건. 유닛에 권한을 주기 전에 누가 먼저 켜면, 읽지도 못하면서 `foreign` 에서 빠져
  화면에서 사라진다. 그래서 읽을 수 있을 때만 넘긴다. (`access(2)` 는 실제 uid 로 보고 능력(capability)을 안 쳐 주므로 쓰지 않고, `readdir` 를 실제로 해 본다.)
- **내 id 는 그대로, 다른 계정만 `<계정>/…`** — 계획은 「id 에 계정」. 생김새(`appearance.ts`)와 목록에서 고친 이름(017, localStorage)이 id 에 묶여 있어
  내 것까지 바꾸면 모두의 얼굴과 이름이 한 번에 바뀐다. `Agent.user` 도 다른 계정에만 — 「없으면 나」.
- 방: 다른 계정은 `<계정>/<프로젝트>`, **프로젝트 밖이면 `@계정`**(018 에서 만든 그 계정 부서). 공용실로 보내면 내 공용실 책상을 남이 차지하고, 누구 것인지도 흐려진다.
  `@계정` 부서 크기는 그 방의 사람 수(foreign 과 세션을 같이 센다) — 전에는 foreign 만 셌는데, 이제 한 계정의 세션 일부는 `@계정`, 일부는 `계정/프로젝트` 에 있을 수 있다.
- 커밋 수: 남의 저장소는 git 이 「dubious ownership」으로 거절한다. `-c safe.directory=<그 폴더>` 로 그 하나만 믿게 했다(명령 줄 설정은 git 이 받아 준다).
  캐시 열쇠는 프로젝트 이름에서 방 이름으로, 지금 없는 방의 것은 바로 지운다(10분 남기지 않는다 — 계획의 「캐시에 남지 않게」).
- `fileOf`(기록 파일 기억)는 sessionId 가 아니라 에이전트 id 로 — 두 계정이 같은 sessionId 를 가질 일은 없지만, 정리 단계가 에이전트 id 로 찾고 있어 열쇠를 맞췄다. 사라진 id 의 것은 지운다.
- tmux: 계획대로 내 것만. 다른 계정 세션의 `tmux` 이름은 「claude 가 있는 tmux」 셈에서 뺀다 — 이름이 우연히 같으면 내 터미널 사람이 사라진다.

## 시험 (`server/accounts.test.ts`)

`FL_PASSWD` 로 손으로 지은 passwd 를 읽힌다(집 뿌리는 tmp). 표지 있음·없음·남의 uid·심볼릭 링크·`sessions/` 없음, 표지를 지우면 빠지는지, 방 이름.
그리고 `Office.snapshot()` 동안 `fs.readFileSync`·`openSync` 를 가로채, 켠 계정의 `.claude` 아래에서 연 파일이 `sessions/*.json`·`jobs/*/state.json`·
`projects/**/*.jsonl`(+ 하위 에이전트 `.meta.json`)뿐인지 본다 — `.key`·`settings.json`·`.credentials.json` 을 일부러 놓아 두었다.
`.meta.json` 은 계획의 「셋」에 없지만 같은 기록 폴더 안의 것이고 전부터 읽던 것이라 넣었다(SKILL.md 의 안내도 「projects 아래 대화 기록」).

## 배포

- 유닛: `AmbientCapabilities`·`CapabilityBoundingSet` 를 `CAP_DAC_READ_SEARCH` 하나로, `NoNewPrivileges=yes` 를 더했다. 서버가 부르는 자식(`git`·`tmux`·`ps`, 상담원의 `claude -p`)도
  이 능력을 물려받는다 — 상담원 claude 는 도구가 없어 파일을 열 길이 없다.
- **스킬은 저장소로 링크하지 않고 공용 자리에 복사** — 계획은 「저장소 `deploy/skill/fl-visible` 로 링크」. 그런데 `/home/sclee` 가 0750 이라
  다른 계정은 링크를 따라오지 못한다. `install-skill.sh` 가 `/usr/local/share/kopricyberfossillab/skills/fl-visible` 에 복사하고, 각 계정의
  `~/.claude/skills/fl-visible` 은 그곳을 가리키는 링크(주인은 그 계정). 스킬을 고치면 스크립트를 다시 돌리면 된다. `~/.claude` 가 없는 계정은 건드리지 않는다.
- SKILL.md 에는 계획대로 「약속은 커널이 아니라 코드가 지킨다」를 그대로 적었다.

## 버린 것

- 권한을 확인하는 데 `access(2)` — 위에 적은 대로 능력을 안 쳐 준다.
- 표지 목록 캐시 — 1초 폴링에 견줘 얻는 것이 없다.
- 다른 계정의 `@계정` 방을 공용실로 — 위.
