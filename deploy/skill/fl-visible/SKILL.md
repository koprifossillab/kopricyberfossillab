---
name: fl-visible
description: 이 계정의 Claude Code 작업을 paleo-server 의 연구실 화면(KOPRI Cyber Fossil Lab, kopricyberfossillab — 줄여 fl)에 보이게 하거나 숨긴다. "fl 에서 보이게 해줘", "연구실 화면에 내 작업 보이게", "fl 에서 숨겨줘", "fl 에 보이고 있어?" 같은 요청에 쓴다.
---

# fl 화면에 보이기·숨기기

KOPRI Cyber Fossil Lab(fl)은 이 서버에서 도는 Claude Code 세션을 미니어처 연구실 속 사람으로 보여 주는 사내 화면이다
(paleolab 첫 화면 → `/kopricyberfossillab/`). 화면 서버는 sclee 계정으로 돌고, 다른 계정은 **본인이 표지를 켰을 때만** 기록까지 읽는다.
표지가 없으면 지금처럼 「다른 계정」 사람으로 있다는 것과 바쁜지만 보인다.

표지는 파일 하나다: `~/.claude/fl-visible`. 서버가 1초마다 보므로 켜고 끄면 곧 화면에 반영된다.

## 켜기 — 「fl 에서 보이게 해줘」

켜기 전에 아래 「보이는 것과 안 보이는 것」을 사용자에게 짧게 알린다(켜 달라고 했으니 다시 묻지는 않는다). 그다음:

```bash
date '+%F %T' > ~/.claude/fl-visible && ls -l ~/.claude/fl-visible
```

- 이 계정이 만든 **보통 파일**이어야 한다. 심볼릭 링크나 남이 만든 파일은 서버가 무시한다.
- 켰는데도 화면에 안 나오면, 화면 서버에 읽기 권한이 아직 없는 것이다 — 운영 계정(paleoadmin)에 알리라고 안내한다.

## 끄기 — 「fl 에서 숨겨줘」

```bash
rm -f ~/.claude/fl-visible
```

다음 폴링(1초)에 기록 읽기를 멈추고 「다른 계정」으로 돌아간다. 서버는 이 계정의 것을 캐시에 남기지 않는다.

## 지금 상태 — 「fl 에 보이고 있어?」

```bash
ls -l ~/.claude/fl-visible 2>/dev/null || echo "꺼져 있음"
```

## 보이는 것과 안 보이는 것 (사용자에게 그대로 알린다)

화면에 실리는 것:
- 세션 이름(없으면 대화 제목), 작업 폴더의 마지막 이름, `~/projects/<프로젝트>` 이면 그 프로젝트의 사무실(「<계정>/<프로젝트>」)과 커밋 수로 정한 사무실 크기
- 지금 하는 일의 종류(코드·읽기·검색·실행·생각·git·시험·확인 대기·휴식)와 한 줄 — 파일 이름, 명령의 설명, 검색어 정도
- 하위 에이전트의 종류와 설명, 백그라운드 job 의 상태

싣지 않는 것: 대화 본문, 명령 전체, 파일 내용.

서버가 읽는 것: `~/.claude/sessions/*.json`, `~/.claude/jobs/*/state.json`, `~/.claude/projects/**` 의 대화 기록(JSONL) 끝부분.
`sessions/*.key`·`settings.json`·`.credentials.json` 은 열지 않는다.

**솔직히 알릴 것**: 다른 계정의 집을 읽기 위해 화면 서버는 리눅스 읽기 권한(`CAP_DAC_READ_SEARCH`)을 가지고 있다.
그 권한은 표지와 상관없이 모든 파일에 닿는다. 위의 약속(표지를 켠 계정만, 위의 파일만, 싣는 것은 한 줄까지)은 커널이 아니라
**서버 코드가 지킨다** — 코드는 공개 저장소 `koprifossillab/kopricyberfossillab` 의 `server/paths.ts`·`server/office.ts` 에서 볼 수 있다.
