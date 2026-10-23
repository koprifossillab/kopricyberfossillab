# KOPRI Cyber Fossil Lab

paleo-server 에서 도는 **Claude Code 세션·하위 에이전트·터미널**을 2.5D 미니어처 연구실 속 캐릭터로 실시간으로 보인다.
방은 셋이다 — **사무실**(사람이 시킨 일), **고객센터**(다른 세션이 보낸 지령을 받아 처리), **휴게실**(쉬는 세션).
누가 코드를 고치고(책상, 파란 모니터), 무엇을 찾고(초록 모니터), git 을 만지고(코어 보관대), 시험을 돌리고(현미경 책상),
사람의 확인을 기다리고(책상 옆에 서서 빨간 링), 쉬는지(휴게실)를 한눈에 본다.


## 돌리기

```bash
npm install
npm run build        # 그림은 web/public/sprites/ 에 구워 둔 것을 쓴다 (다시 굽기: npm run bake)
npm start            # http://127.0.0.1:8098/   — 예시 데이터: http://127.0.0.1:8098/?demo
```

자기 PC 에서 보려면 SSH 터널: `ssh -L 8098:127.0.0.1:8098 <계정>@paleo-server` 뒤 http://localhost:8098/

## 무엇을 읽나

| 원천 | 얻는 것 |
|---|---|
| `~/.claude/sessions/<pid>.json` | 살아 있는 세션, 이름, cwd, busy/idle, tmux 자리 |
| `~/.claude/jobs/<id>/state.json` | 백그라운드 세션의 working/blocked/done |
| `~/.claude/projects/*/<세션>.jsonl` | 지금 열린 도구 호출 → 활동 |
| `…/<세션>/subagents/agent-*.jsonl` | 하위 에이전트 |
| `tmux list-sessions`, `ps`, `/proc` | 터미널, 다른 계정의 claude, 프로세스 생존 |

**읽기만 한다.** 화면으로 나가는 것은 세션 이름·프로젝트 이름·도구 한 줄(파일 이름, 명령 설명 또는 앞 두 낱말)뿐이고,
서버는 기본으로 `127.0.0.1` 에만 묶는다.

## 그리는 방식

로우폴리 3D 모형(`web/src/scene/models.ts`)을 고정 시점 정사영으로 **미리 구워**(`npm run bake`) 그림 조각으로 두고,
화면은 Canvas 2D 로 조각을 붙인다. 브라우저는 3D 엔진 없이 그림 세 장(약 490 KB)과 238 KB 의 스크립트만 받고,
그 뒤로는 바뀐 상태(JSON)만 받는다.

## 참고

- [Claw3D](https://github.com/iamlukethedev/Claw3D) (MIT) — 래치·홀드, 장소 연출, 격자 A* 의 생각. 코드는 옮기지 않았다
- [pixel-agents](https://github.com/pablodelucca/pixel-agents) (MIT) — JSONL 을 감시하는 관찰형 방식, 확인 대기 7초 추정
- 시작 계획과 구도 시제품: [`docs/`](docs/)
