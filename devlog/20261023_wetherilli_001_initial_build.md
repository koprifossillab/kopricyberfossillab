# 001 — 첫 판

2026-10-23 · `work/20261023-wetherilli` · wetherilli

빈 저장소(`koprifossillab/kopricyberfossillab`, public)에 작업 환경과 첫 판(v0.1.0)을 세웠다. 기준은 kopri-devdocs `guides/`
와 Cropobite 의 문서 꼴, 내용은 [P01](20261023_wetherilli_P01_initial_build.md).

## 한 것

- **원천 다섯** — 세션 등록(`~/.claude/sessions`), job state, JSONL 꼬리, 하위 에이전트(`<세션>/subagents/`), tmux·ps·/proc.
  pid 재사용은 등록 파일의 `procStart` 를 `/proc/<pid>/stat` 의 starttime 과 비교해 거른다. 예비 프로세스(`spare`)는 뺀다.
- **넘긴 터미널** — `parkedJobId` 가 있는 터미널 세션은 등록의 status 가 넘길 때 값(busy)에 멈춰 있다. 휴식으로 보이고 「백그라운드로 넘김」.
- **래치·홀드** — Claw3D 의 생각(도구 5초·글 6초). 코드는 옮기지 않았다.
- **화면** — 시제품의 좌표·색·캐릭터 꼴을 R3F 로. 책상 줄을 하나 늘려 여덟(오늘 이 서버에 살아 있는 세션이 일곱이었다).
  Claw3D 의 server_room·qa_lab 은 연구실답게 **코어 보관대**·**현미경 책상**으로.
- **시험 5개**, `npm run probe`, `?demo`.
- `workon fl`, `.guides` 링크, `ref/`(Claw3D·pixel-agents 얕은 클론, gitignore).

## 정한 것

- **포트 8098** — 8090~8097·8099 가 형제 앱. vite 개발은 8058(개발 대역 8051~8059).
- **127.0.0.1 에만** — 사내망에 내는 것은 사람이 정한다(HANDOFF §0). nginx 조각만 만들어 두었다.
- **화면에 나가는 것** — 이름·프로젝트·도구 한 줄. Bash 는 `description` 이 있으면 그것, 없으면 명령 앞 두 낱말 — 명령에 키가 들어 있어도 안 나가게.
- **auto·bypass 모드에서는 시간으로 확인 대기를 추정하지 않는다** — 묻지 않는 모드라 오래 걸리는 Bash 가 빨간 링으로 보이는 거짓만 생긴다.

## 버린 것

- **Node 내장 TS 벗기기** — 이 서버의 node 22.22 는 Debian 판이라 `ERR_NO_TYPESCRIPT`. `tsx` 를 쓴다.
- **훅으로 권한 대기 받기** — `~/.claude/settings.json` 을 고치는 일이고, 다른 세션들이 모두 그 설정을 쓴다. 다음 판에 사람과 정한다.
- **Next.js(Claw3D 의 스택)** — 서버 렌더링이 필요 없다. 시작 문서대로 Vite.

## 열어 둔 것

- 사용자: 「시점을 고정한다면 꼭 3D 일 필요는 없지 않나, 2.5D 수준에서 해결될 텐데」 — 기초를 마친 뒤 상의하기로 했다.
  → 같은 날 상의해 2.5D 로 바꿨다([P02](20261023_wetherilli_P02_isometric_sprites.md), wetherilli 002).
