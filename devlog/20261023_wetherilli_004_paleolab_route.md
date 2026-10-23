# 004 — paleolab 에 길: /kopricyberfossillab/, 첫 화면 「Coding work」

2026-10-23 · `work/20261023-wetherilli` · wetherilli

사용자: 「http://paleolab/ 에 Taxonomy Reference databases 칸이 굉장히 크니까, 아래 빈 공간을 나눠서 Coding work 로 몰아줘」,
「그 자리에 병렬적으로 길을 내주면 좋겠어」. — 사내망에 내기로 사용자가 정했다(HANDOFF §0 의 첫 갈림길).

## 한 것

- **nginx 길** — `deploy/host/install.sh`(Cropobite 의 install.sh 에서 nginx 부분만 옮김). 조각을 `/etc/nginx/snippets/` 에 깔고,
  `sites-enabled/phyloserver` 의 Cropobite include 바로 아래에 한 줄. `nginx -t` 가 깨지면 사본으로 되돌린다.
  **sudo 가 비밀번호를 물어서 이 세션은 못 돌렸다** — 사람이 `sudo bash deploy/host/install.sh` 한 번.
- **첫 화면** — `/srv/paleolab/index.html` 의 세 번째 칸을 `.col`(위아래 묶음)로 감싸 Taxonomy 아래에 「Coding work」 묶음,
  항목은 「Cyber Fossil Lab」 → `/kopricyberfossillab/`. 바닥 칸이 남는 만큼 아래 묶음이 늘어난다(`flex: 1`).
- **카드 바탕** — `cards.js` 의 약속(「그 앱의 실제 자료로 그린다」)대로 `/kopricyberfossillab/api/snapshot` 을 받아 책상 여덟에
  일하는 세션을 점으로, 쉬는 세션은 아래 줄에. 확인 대기는 빨간 점. 묶음 색 `code` 는 초록. 길이 없으면 카드는 원래 모습이다
  (시험: 브라우저에서 요청을 127.0.0.1:8098 로 돌려 그림이 나오는 것을 봤다).
- 두 파일의 사본은 `~/backup/paleolab/*.bak-20261023_154324` — `/srv/paleolab/` 은 디렉터리에 쓰기 권한이 없어(파일만 그룹 쓰기)
  그 곁에 사본을 둘 수 없었다. 파일은 같은 inode 에 덮어썼다.

## 버린 것

- **SSE 를 카드에서 받기** — 첫 화면은 카드가 열 개 남짓이다. 처음 한 번 받은 것으로 그리면 충분하다.
- **첫 화면 파일을 이 저장소에 넣기** — `/srv/paleolab` 은 여러 저장소가 함께 고치는 paleoadmin 의 자리다. 바꾼 것은 이 글에 적는다.
