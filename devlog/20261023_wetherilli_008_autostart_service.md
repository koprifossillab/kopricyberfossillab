# 008 — 재부팅 뒤에도 화면 서버가 뜨게: systemd 유닛

2026-10-23 · `work/20261023-wetherilli-service` · wetherilli

fl-agent-office-3d 세션이 나눠 맡긴 일. 지금 화면 서버는 sclee 의 tmux `fl` 에서 `npm start` 로 돈다 —
재부팅하면 사라진다. sclee 는 sudo 비밀번호가 없어서, 파일만 준비하고 깔기는 사람이 운영 계정(paleoadmin)에서 sudo 로 한 번 한다.

## 한 것

- **`deploy/host/kopricyberfossillab.service`** — 시스템 유닛, `User=sclee`(~/.claude 는 그 계정만 읽는다),
  `ExecStart` 는 클론의 `node_modules/.bin/tsx server/index.ts` 절대경로, `FL_PORT=8098 FL_HOST=127.0.0.1`,
  `HOME`·`PATH` 를 넣었다(서버가 tmux·ps·git 을 부른다). `Restart=on-failure`, `After=network.target`.
- **`deploy/host/install-service.sh`** — 유닛을 `/etc/systemd/system/` 에 깔고 daemon-reload → enable → restart → `/healthz`.
  몇 번 돌려도 같다(이미 돌면 restart 가 새 유닛·새 코드로 다시 띄운다).
- **포트가 겹칠 때** — 유닛이 돌지 않는데 8098 이 열려 있으면 tmux `fl` 의 서버다. 그것은 sclee 의 tmux 라 스크립트가 죽이지 않고
  「먼저 닫으라」고 알리고 멈춘다.

## 왜 · 버린 것

- **tmux 가 보이는가** — tmux 는 uid 로 소켓(`/tmp/tmux-1006/default`)을 고르니 sclee 로 돌면 그대로 본다.
  그래서 `PrivateTmp` 를 켜지 않았다(켜면 /tmp 가 갈려 터미널 목록이 빈다). 서버는 `tmux list-sessions` 로 읽기만 해서 tmux 서버를 새로 띄우지 않는다.
- **`npx tsx`** — npx 는 PATH·캐시에 따라 받으러 나갈 수 있다. 재부팅 직후 망이 늦으면 실패하니 클론에 깔린 tsx 를 바로 부른다.
- **사용자 유닛(`systemctl --user`) + linger** — sudo 없이 될 것 같지만 linger 켜기에 결국 root 가 필요하고,
  유닛이 sclee 의 홈에 숨는다. 운영 계정이 한눈에 보도록 시스템 유닛으로 두었다.
- **스크립트가 tmux `fl` 을 닫기** — 남의 세션을 죽이는 일이라 사람에게 맡겼다.
- **유닛 경로를 스크립트 자리에서 정하기** — worktree 에서 부르면 엉뚱한 클론을 돌리게 된다. 유닛은 늘 `/home/sclee/projects/kopricyberfossillab`.

## 시험

`bash -n deploy/host/install-service.sh` 통과, `systemd-analyze verify` 통과(이 서버의 다른 유닛 hserver.service 에 대한 경고만).
sudo 로는 돌리지 않았다. 지금 8098 이 tmux `fl` 로 열려 있어, 지금 돌리면 포트 확인에서 멈추는 것이 맞다.
