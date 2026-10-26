#!/bin/bash
# 「fl 에서 보이게 해줘」 스킬(fl-visible)을 이 서버의 사람 계정마다 건다. **sudo 로** 돌린다 (몇 번 돌려도 같다).
#
#   sudo bash deploy/host/install-skill.sh
#
# sclee 의 집(/home/sclee)은 0750 이라 다른 계정은 클론 안으로 링크를 따라오지 못한다. 그래서 스킬은
# root 의 공용 자리(SHARE)에 복사하고, 각 계정의 ~/.claude/skills/fl-visible 은 그 자리를 가리키는 링크로 둔다(주인은 그 계정).
# 스킬을 고치면 이것을 다시 돌리면 된다 — 링크는 그대로, 공용 자리의 내용만 바뀐다.
# ~/.claude 가 없는 계정(Claude Code 를 안 쓰는 사람)은 건드리지 않는다. 새 계정은 /etc/skel 로.
set -euo pipefail

[ "$(id -u)" = 0 ] || { echo "sudo 로 돌릴 것: sudo bash $0" >&2; exit 1; }
REPO="$(cd "$(dirname "$0")/../.." && pwd)"
SRC="$REPO/deploy/skill/fl-visible"
SHARE=/usr/local/share/kopricyberfossillab/skills/fl-visible
SERVICE_USER=sclee     # 화면 서버의 계정 — 늘 보이므로 표지가 필요 없다

[ -f "$SRC/SKILL.md" ] || { echo "!! $SRC/SKILL.md 가 없다" >&2; exit 1; }

echo "== $SHARE"
install -d -m 755 "$SHARE"
install -m 644 "$SRC/SKILL.md" "$SHARE/SKILL.md"

# 링크 하나 걸기 — 이미 다른 것이 있으면 손대지 않는다
link() {   # <skills 디렉터리> <주인>
    local dir="$1" owner="$2" dst="$1/fl-visible"
    if [ -e "$dst" ] || [ -L "$dst" ]; then
        if [ "$(readlink "$dst" || true)" = "$SHARE" ]; then echo "   그대로  $dst"; return; fi
        echo "   !! $dst 에 다른 것이 있다 — 건너뜀"; return
    fi
    install -d -m 755 -o "$owner" -g "$(id -gn "$owner")" "$dir"
    ln -s "$SHARE" "$dst"
    chown -h "$owner:$(id -gn "$owner")" "$dst"
    echo "   걸었다  $dst"
}

echo "== 계정마다"
while IFS=: read -r user _ uid _ _ home _; do
    [ "$uid" -ge 1000 ] && [ "$uid" != 65534 ] || continue
    [ "$user" = "$SERVICE_USER" ] && continue
    [ -d "$home/.claude" ] || { echo "   ~/.claude 없음  $user"; continue; }
    link "$home/.claude/skills" "$user"
done < /etc/passwd

echo "== /etc/skel"
install -d -m 755 /etc/skel/.claude/skills
if [ "$(readlink /etc/skel/.claude/skills/fl-visible || true)" != "$SHARE" ]; then
    ln -sfn "$SHARE" /etc/skel/.claude/skills/fl-visible
fi
echo "   /etc/skel/.claude/skills/fl-visible -> $SHARE"

echo "== 끝 — 각 계정 주인에게: 자기 Claude Code 세션에서 「fl 에서 보이게 해줘」"
