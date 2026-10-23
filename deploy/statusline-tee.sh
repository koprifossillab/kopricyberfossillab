#!/usr/bin/env bash
# Claude Code statusLine 명령 자리에 둔다 — 받은 JSON 을 ~/.cache/claude-status/latest.json 에 남기고(서버의 limits.ts 가 읽는다)
# 같은 바이트를 원래 statusLine(ccusage)에 넘긴다. 한도(rate_limits)는 이 stdin 에만 실려 온다.
# 쓰기는 tmp → mv 로 원자적이라 서버가 반쯤 쓴 파일을 읽지 않는다. 남기기가 실패해도 상태줄은 그대로 나온다.
set -u
dir="${FL_LIMITS_DIR:-$HOME/.cache/claude-status}"
input="$(cat)"
if mkdir -p "$dir" 2>/dev/null; then
  tmp="$(mktemp "$dir/.latest.XXXXXX" 2>/dev/null)" && {
    printf '%s' "$input" > "$tmp" && mv -f "$tmp" "$dir/latest.json" || rm -f "$tmp"
  }
fi
printf '%s' "$input" | npx -y ccusage statusline --no-offline
