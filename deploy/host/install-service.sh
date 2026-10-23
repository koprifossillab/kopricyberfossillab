#!/bin/bash
# kopricyberfossillab 화면 서버를 systemd 에 올린다 — 재부팅해도 저절로 뜬다. **sudo 로 한 번** 돌린다 (몇 번 돌려도 같다).
#
#   sudo bash deploy/host/install-service.sh
#
# 유닛은 sclee 의 클론(/home/sclee/projects/kopricyberfossillab)을 돌린다 — 이 스크립트를 어느 클론에서 부르든 같다.
# tmux `fl` 에서 npm start 로 띄운 서버가 있으면 포트(8098)가 겹친다. 그 tmux 는 sclee 의 것이라 여기서 죽이지 않고 멈춘다.
set -euo pipefail

[ "$(id -u)" = 0 ] || { echo "sudo 로 돌릴 것: sudo bash $0" >&2; exit 1; }
REPO="$(cd "$(dirname "$0")/../.." && pwd)"
NAME=kopricyberfossillab
UNIT=/etc/systemd/system/$NAME.service
APP=/home/sclee/projects/kopricyberfossillab
PORT=8098

echo "== 확인"
[ -x "$APP/node_modules/.bin/tsx" ] || { echo "!! $APP/node_modules/.bin/tsx 가 없다 — sclee 로 그 자리에서 npm install" >&2; exit 1; }
[ -f "$APP/web/dist/index.html" ] || echo "   web/dist 가 없다 — 서버는 뜨지만 화면은 503. sclee 로 npm run build"
if ! systemctl is-active --quiet "$NAME" && ss -ltnH "sport = :$PORT" | grep -q .; then
    echo "!! 127.0.0.1:$PORT 가 이미 열려 있다 — tmux fl 의 npm start 일 것. sclee 가 그것을 먼저 닫고 다시 돌릴 것:" >&2
    echo "     tmux send-keys -t fl C-c    (또는 tmux kill-session -t fl)" >&2
    exit 1
fi

echo "== $UNIT"
install -m 644 "$REPO/deploy/host/$NAME.service" "$UNIT"
systemctl daemon-reload
systemctl enable "$NAME"
systemctl restart "$NAME"     # 처음이면 띄우고, 이미 돌면 새 유닛·새 코드로 다시

echo "== healthz"
for _ in $(seq 1 20); do
    if curl -fsS "http://127.0.0.1:$PORT/healthz" 2>/dev/null; then echo; echo "   떴다 — systemctl status $NAME"; exit 0; fi
    sleep 0.5
done
echo "!! 10초 안에 /healthz 가 답하지 않았다 — journalctl -u $NAME -n 50" >&2
exit 1
