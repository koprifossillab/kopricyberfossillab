# P01 — 첫 판 계획

2026-10-23 · `work/20261023-wetherilli` · wetherilli

시작 문서는 `docs/agent-office-plan.md`(claude.ai 대화에서 정리, 사용자가 NAS 로 넘김)와 구도 시제품 `docs/agent-office-3d.html`.
그 문서는 「내 PC 의 세션」을 전제로 했지만, 사용자 요청은 **paleo-server 에서 도는 세션·터미널·에이전트**다. 그래서 고친 것:

## 시작 문서에서 고친 것

| 시작 문서 | 이 계획 | 까닭 |
|---|---|---|
| JSONL 만 감시(chokidar) | **세션 등록 `~/.claude/sessions/<pid>.json` 이 중심**, JSONL 은 활동만 | 등록 파일에 살아 있는 세션·이름·busy/idle·tmux 자리·job id 가 이미 있다. JSONL 만으로는 끝난 세션과 쉬는 세션을 못 가른다 |
| 권한 대기는 훅으로 | job 은 `state.json` 의 `blocked`, 터미널 세션은 7초 추정 | 백그라운드 세션은 사람에게 물을 때 `blocked` 가 된다(timeline 1,915줄 중 73). 훅은 남의 설정을 고치는 일이라 다음으로 |
| WebSocket | **SSE** | 보내는 쪽이 하나뿐이다. 의존성 없이 되고 nginx 뒤에서도 `proxy_buffering off` 한 줄 |
| 감시(chokidar) | 1초 폴링 | 세션이 열 개 남짓이다. 늘어난 바이트만 읽는다 |
| 내 PC 하나 | 터미널(tmux)·다른 계정(ps) 도 | 요청에 「터미널」 이 있고, 같은 서버에 paleoadmin 의 claude 도 돈다 |

## 순서

시작 문서 §6 의 1~8 중 1~6 과 8(A*)을 첫 판에, 7(청소부·스탠드업)은 TODOs 로.
