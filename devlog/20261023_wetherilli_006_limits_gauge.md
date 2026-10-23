# 006 — 상단바에 Claude 사용 한도 게이지 (5시간·주간)

2026-10-23 · `work/20261023-wetherilli-limits` · wetherilli

사용자 요청을 fl-agent-office-3d 세션이 받아 이 세션에 나눠 맡겼다. 그 세션이 같은 클론에서 일하는 중이라
main 에서 worktree(`~/projects/kopricyberfossillab-wt-limits`)를 따로 파서 했다.

## 한 것

- **원천** — 공식 문서(code.claude.com/docs/en/statusline)에서 한도가 실리는 곳은 statusLine 명령의 stdin JSON 하나뿐이다:
  `rate_limits.five_hour|seven_day.{used_percentage, resets_at(epoch 초)}`. Pro/Max 만, 세션의 첫 응답 뒤에만, 창마다 없을 수도 있다.
- **`deploy/statusline-tee.sh`** — statusLine 자리에 두면 stdin 을 `~/.cache/claude-status/latest.json` 에 tmp→mv 로 남기고
  같은 바이트를 지금의 statusLine(`npx -y ccusage statusline --no-offline`)에 넘긴다. 남기기가 실패해도 상태줄은 나온다.
  `~/.claude/settings.json` 은 사용자 전역 설정이라 여기서 바꾸지 않았다 — 합칠 때 사람에게 알리고 바꾼다.
- **`server/limits.ts`** — 그 파일(`FL_LIMITS_FILE`)을 1초마다 읽어 `Snapshot.limits`. 파일 없음·깨짐·키 없음은 undefined,
  `resets_at` 이 지난 창은 뺀다(창이 넘어갔으면 남은 퍼센트는 옛값이다). `seenAt` 은 파일 mtime.
- **`web/src/Limits.tsx`** — 게이지 둘, 70%↑ 노랑·90%↑ 빨강, 리셋까지 남은 시간. 값은 어느 세션이든 응답할 때만 새로 쓰이니
  10분 넘게 낡으면 흐리게 하고 「n분 전 값」. 자료가 없으면 「한도 정보 없음」.

## 왜 · 버린 것

- **JSONL·API 로 직접 읽기** — 공식 문서에 다른 읽는 길이 없다. 비공식 엔드포인트를 두드리면 이 앱의 「읽기만 한다」 선을 넘는다.
- **세션마다 파일을 따로** — 한도는 계정 하나에 걸린 값이라 마지막으로 받은 것 하나면 된다. 덮어쓰기라 파일도 하나로 끝난다.
- **낡은 값을 숨기기** — 쉬는 동안에도 마지막 값은 쓸모가 있다. 숨기지 않고 흐리게 + 몇 분 전인지.
- **Snapshot 모양** — 다른 세션이 같은 interface 의 다른 줄을 고치는 중이라 `limits?` 한 줄을 끝에 더하고, 새 타입은 파일 끝에 두었다.

## 시험

`npm test`(지은 JSON 으로 limits.test.ts 다섯) · `npm run typecheck` · `npm run build` 통과.
`?demo` 에 가짜 limits(73%·41%)를 넣어 1280·390 폭에서 화면 사진으로 게이지를 봤다 — 사진은 실제 값이 아니어도 싣지 않는다.
