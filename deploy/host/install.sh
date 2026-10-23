#!/bin/bash
# kopricyberfossillab 을 http://paleolab/kopricyberfossillab/ 에 얹는다. **sudo 로 한 번** 돌린다 (몇 번 돌려도 같다).
# Cropobite deploy/host/install.sh 의 nginx 부분을 옮겼다 — 형제 조각들 곁에 include 한 줄, 깨지면 되돌린다.
#
#   sudo bash deploy/host/install.sh
#
# 서버(npm start, 127.0.0.1:8098)는 sclee 가 띄운다 — ~/.claude 를 읽어야 해서 그 계정으로 돈다 (CLAUDE.md).
# 사본은 /etc/nginx/sites-enabled/ 에 두지 않는다 — 거기 둔 파일은 nginx 가 전부 읽는다.
set -euo pipefail

[ "$(id -u)" = 0 ] || { echo "sudo 로 돌릴 것: sudo bash $0" >&2; exit 1; }
REPO="$(cd "$(dirname "$0")/../.." && pwd)"
SITE=/etc/nginx/sites-enabled/phyloserver
SNIP=/etc/nginx/snippets/kopricyberfossillab-subpath.conf
STAMP=$(date +%Y%m%d_%H%M%S)
BAK="/etc/nginx/phyloserver.bak-kopricyberfossillab-$STAMP"

echo "== nginx"
install -m 644 "$REPO/deploy/nginx/kopricyberfossillab-subpath.conf" "$SNIP"
if ! grep -q "snippets/kopricyberfossillab-subpath.conf" "$SITE"; then
    cp -p "$SITE" "$BAK"
    # 형제 조각들 바로 아래, `location /` 보다 앞에 넣는다
    python3 - "$SITE" <<'PY'
import sys
p = sys.argv[1]; s = open(p).read()
anchor = "    include snippets/Cropobite-subpath.conf;\n"
line = "    # kopricyberfossillab — Claude Code 세션 화면 (/kopricyberfossillab/). 실체는 그 저장소의 deploy/nginx/kopricyberfossillab-subpath.conf\n" \
       "    include snippets/kopricyberfossillab-subpath.conf;\n"
if anchor in s:
    s = s.replace(anchor, anchor + line, 1)
else:
    i = s.index("    location / {")
    s = s[:i] + line + "\n" + s[i:]
open(p, "w").write(s)
PY
    echo "   include 한 줄을 넣었다 (사본 $BAK)"
fi
if ! nginx -t 2>&1; then
    echo "!! nginx -t 실패 — 되돌린다" >&2
    [ -f "$BAK" ] && cp -p "$BAK" "$SITE"
    rm -f "$SNIP"
    exit 1
fi
systemctl reload nginx
echo "   다시 읽혔다 — http://paleolab/kopricyberfossillab/"
curl -s -o /dev/null -w "   /kopricyberfossillab/healthz → %{http_code}\n" http://127.0.0.1/kopricyberfossillab/healthz -H 'Host: paleolab' || true
