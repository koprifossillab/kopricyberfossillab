#!/bin/bash
# 판을 올린 뒤 sclee 가 돌리는 서버를 다시 띄운다 — npm run restart. 서버 코드(server/)를 고쳤을 때만 필요하다
# (화면만 고쳤으면 npm run build 로 끝 — web/dist 는 요청마다 읽는다).
# 비밀번호 없는 sudo 는 install-service.sh 가 이 명령 하나에만 걸어 둔다. 없으면 paleoadmin 에게.
set -euo pipefail
NAME=kopricyberfossillab
PORT=${FL_PORT:-8098}
sudo -n "$(command -v systemctl)" restart "$NAME" || {
    echo "!! 비밀번호 없이 다시 띄울 수 없다 — paleoadmin 이 sudo bash deploy/host/install-service.sh 를 다시 돌려야 한다" >&2; exit 1; }
for _ in $(seq 1 20); do
    if curl -fsS "http://127.0.0.1:$PORT/healthz" 2>/dev/null; then echo; exit 0; fi
    sleep 0.5
done
echo "!! 10초 안에 /healthz 가 답하지 않았다 — journalctl -u $NAME -n 50" >&2
exit 1
