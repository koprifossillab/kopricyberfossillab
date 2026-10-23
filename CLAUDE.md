# CLAUDE.md

**kopricyberfossillab** — paleo-server 에서 도는 Claude Code 세션·하위 에이전트·터미널(tmux)을 3D 미니어처 연구실 속
캐릭터로 실시간으로 보이는 화면. 원천은 `~/.claude/`(세션 등록·job 상태·JSONL 기록)와 `/proc`·`tmux`·`ps` 이고,
**읽기만 한다** — 세션에 말을 걸거나 파일을 고치지 않는다.
문서는 한국어로 쓴다 — 커밋 메시지, devlog, 주석 모두. 화면 글도 한국어.

## 공통 규약

작업 체제·운영 규약은 `.guides/` 에 있다 — **이 저장소는 그것을 따른다.**

- 작업 체제(브랜치·devlog·말): `.guides/workflow.md`
- 웹 앱(배포·운영): `.guides/web/README.md` — DB 가 없는 앱이라 배포 분리·nginx·health·포트만 해당한다
- 소속·라이선스·출처: `.guides/branding.md`

없으면 kopri-devdocs 클론이 안 걸린 것 — `../kopri-devdocs` 를 형제로 두고
`ln -s ../kopri-devdocs/guides .guides`. **이 저장소에는 커밋하지 않는다**(kopri-devdocs 는 private, 이 저장소는 public).

## 이름

표기는 **`kopricyberfossillab`** 하나(저장소·경로·URL 서브경로·`package.json`), 약자 **`fl`**(`workon fl`, 환경변수 `FL_*`).
화면 제목은 `KOPRI Cyber Fossil Lab` — 사람이 다르게 정하면 여기와 `web/index.html`·`App.tsx` 를 같이.

**말**: 세션(Claude Code 대화 하나 — 터미널 `session`·백그라운드 `job`) · 하위 에이전트(`subagent`, 세션이 Agent 도구로 띄운 것) ·
다른 계정(`foreign`, 기록을 못 읽는 다른 Linux 계정의 claude) · 터미널(tmux 세션) · 활동(`Activity` — code·read·run·think·git·test·spawn·wait·idle) ·
장소(책상·코어 보관대·현미경 책상·라운지·화이트보드·문). 「상태」 는 원천의 값(busy·idle·blocked)에만 쓴다.

## 구조

```
server/   Node(tsx 로 TS 를 바로) — 원천을 1초마다 읽어 Snapshot 을 만들고 SSE 로 보낸다. 의존성 없음(node: 내장만)
  model.ts       Snapshot 모양 (web/src/types.ts 가 사본 — 고치면 둘 다)
  office.ts      원천 → Snapshot (세션 등록 ~/.claude/sessions/<pid>.json, job ~/.claude/jobs/<id>/state.json, 하위 에이전트)
  transcript.ts  JSONL 꼬리 읽기 — 열린 도구 호출, 마지막 호출, 권한 모드
  classify.ts    도구 호출 → 활동 + 한 줄 (대화 본문·명령 전체는 싣지 않는다)
  latches.ts     래치·홀드 (Claw3D eventTriggers 의 생각), 확인 대기 추정
  system.ts      /proc 생존 확인, tmux, 다른 계정의 claude(ps)
  index.ts       http — /api/events(SSE) /api/snapshot /healthz + web/dist
web/      Vite + React + React Three Fiber
  src/scene/layout.ts    배치 좌표·색 (시제품 docs/agent-office-3d.html 에서)
  src/scene/director.ts  Snapshot → 캐릭터마다 갈 자리
  src/scene/nav.ts       격자 A*
docs/     시작 계획(agent-office-plan.md)과 구도 시제품(agent-office-3d.html) — 받은 그대로 둔다
ref/      Claw3D·pixel-agents 얕은 클론 (gitignore) — 읽기만. 코드를 옮기면 MIT 고지를 남긴다
```

## 작업 방식

- **브랜치: 하루치 브랜치** `work/<YYYYMMDD>-<계정>` → 로컬 `merge --ff-only` 로 main (`.guides/workflow.md` §2).
  문서만 고치는 커밋은 main 에 바로.
- 작업 전 `git pull --rebase`. **`git add -A`·`.`·`commit -a` 금지** — 고친 파일만
  `git commit -F <메시지 파일> -- <파일…>`. 커밋 메시지는 한국어, 끝에 devlog 번호 `(wetherilli 001)`.
- 원격은 HTTPS(`https://wetherilli@github.com/koprifossillab/kopricyberfossillab.git`) — 이 서버의 SSH 키는 `jikhanjung` 계정이다.
- **public 저장소다** — 세션 기록·스냅샷 JSON·화면 사진에 실제 대화나 경로가 담기면 커밋하지 않는다. 시험 자료는 손으로 지어 쓴다.

## devlog

`devlog/YYYYMMDD_{계정}_{nnn}_{title}.md`, 계획은 `_P{nn}_`, 제목은 영어 snake_case, **번호는 글쓴이마다**.
머리줄 아래 `날짜 · \`브랜치\` · 글쓴이`. 새 파일은 `devlog/README.md` 색인에 한 줄.
**무엇을 했는지보다 왜 그렇게 했고 무엇을 버렸는지**를 쓴다. **HANDOFF 는 지금만** 말한다.

## 환경

```bash
workon fl                  # ~/projects/kopricyberfossillab (venv 없음 — Node)
npm install
npm test                   # 판정 시험 (server/*.test.ts) — 고치고 나면 이것부터
npm run typecheck
npm run probe              # 화면 없이 지금 판정을 콘솔에 (-- --watch 로 계속)
npm run build && npm start # http://127.0.0.1:8098/  (?demo 를 붙이면 예시 데이터)
npm run dev                # 화면 개발 — http://127.0.0.1:8058/ (/api 는 8098 로 넘긴다)
```

- **포트**: 8098(돌리는 것) · 8058(vite 개발). 8090~8097·8099 는 형제 앱 자리.
- **127.0.0.1 에만 묶는다**(`FL_HOST`). 사내망에 내는 것은 nginx 서브경로(`deploy/nginx/`)로만, 사람이 정한 뒤에.
- 이 서버의 node 는 Debian 판이라 TS 를 스스로 못 벗긴다(`ERR_NO_TYPESCRIPT`) — 그래서 `tsx`.
- 화면 확인은 `~/tools/pw`(Playwright, 저장소 밖)의 chromium 으로 사진을 찍어 본다 — WebGL 은 swiftshader 로 뜬다.
- 원천의 모양(세션 등록 JSON·job state·JSONL 필드)은 Claude Code 판에 따라 바뀔 수 있다 — 깨지면 `npm run probe` 로 먼저 본다.
  2026-10-23 에 본 판은 2.1.309.
