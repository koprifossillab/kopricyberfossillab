# 에이전트 디오라마 오피스 — 작업 인계 문서

작성: 2026-10-23 (claude.ai 대화에서 정리, 연구소 터미널의 Claude Code로 이어서 작업)

## 1. 목표

내 PC에서 돌아가는 **Claude Code 세션들을 3D 미니어처 사무실 속 캐릭터로 실시간 시각화**하는 웹페이지를 만든다.
에이전트가 무엇을 하는지(코딩, 탐색, 사용자 확인 대기, 휴식)를 캐릭터의 위치와 동작으로 한눈에 보는 것이 핵심.

## 2. 지금까지 정해진 것

| 항목 | 결정 | 비고 |
|---|---|---|
| 데이터 소스 | 실제 Claude Code 세션 | 가짜 시뮬레이션이 아님 |
| 비주얼 구도 | 로우폴리 아이소메트릭 디오라마 (스타일 비교안 6번) | 바닥 슬래브에 두께, 뒤·왼쪽 벽 두 면, 정사영(Orthographic) 카메라로 비스듬히 내려다봄 |
| 참고 프로젝트 | **Claw3D** (기믹과 코드 구조) | 아래 3절 |
| 데이터 수집 방식 참고 | **pixel-agents** | Claude Code JSONL 기록을 감시하는 관찰형 |

함께 넘기는 파일:
- `agent-office-3d.html` — 구도 확정용 시제품. three.js r128을 CDN으로 불러오는 단일 HTML. 예시 에이전트 4명이 상태에 따라 책상, 라운지, 대기 위치를 오감. 드래그 회전, 휠 확대 가능.
  - 브라우저에서 바로 열면 됨. 레이아웃 좌표(책상 x = 2.5, 6, 9.5, 13 / 통로 z = 5.6 / 라운지 좌석 목록)와 색 팔레트를 본 구현에서 그대로 재사용할 것.

## 3. Claw3D 분석 (직접 소스 확인)

- 저장소: https://github.com/iamlukethedev/Claw3D
- 확인한 커밋: `0565b78` (2026-08-21)
- 라이선스: **MIT** → 코드를 가져다 쓸 경우 저작권 고지(LICENSE 문구)를 함께 유지할 것
- 스택 (package.json 기준): Next.js 16, `three` 0.183, `@react-three/fiber` 9, `@react-three/drei` 10, 배치 편집기용 Phaser 3.90
- **에이전트 연결: OpenClaw Gateway 전용.** 브라우저 → Studio 서버(`/api/gateway/ws`) → 업스트림 OpenClaw 게이트웨이로 WebSocket을 중계하는 구조. Claude Code를 직접 읽지 않으므로 데이터 계층은 우리가 새로 만들어야 함.

### 3-1. 참고할 파일

| 경로 | 내용 | 가져올 것 |
|---|---|---|
| `ARCHITECTURE.md` | 전체 구조 설명 | "런타임 상태는 원천(게이트웨이)에만 두고, 화면은 거기서 파생"이라는 경계 원칙 |
| `src/lib/office/eventTriggers.ts` | 이벤트 → 애니메이션 상태 변환 | **2단계 방식**: ① 새 이벤트가 오면 짧은 "래치"를 건다 ② 현재 상태로 지속 "홀드"를 재구성한다. 3D 씬은 최종 결과만 소비 |
| `src/lib/office/places.ts` | 장소 레지스트리 | 장소 ID ↔ 상호작용 대상 ↔ 홀드 키 매핑 구조 |
| `src/lib/office/deskDirectives.ts` | 대화 문장에서 의도 감지 | standup, gym, qa 등 키워드/정규식 기반 연출 트리거 |
| `src/lib/office/janitorReset.ts` | 세션 리셋 감지 | 세션 epoch 값이 올라가면 청소부 연출 큐 생성 (60줄로 짧음) |
| `src/lib/office/pathfinding.ts` | 2D 격자 A* | 가구·벽을 막힌 칸으로 만든 내비게이션 그리드 + A* 경로 |
| `src/features/retro-office/objects/agents.tsx` | 캐릭터 렌더링 (약 1,250줄) | 캐릭터 모델링·걷기 연출 참고 |
| `src/features/retro-office/systems/cameraLighting.tsx` | 카메라·조명 | 디오라마 조명 세팅 참고 |
| `src/features/retro-office/RetroOffice3D.tsx` | 메인 씬 (약 7,250줄 단일 파일) | 통째로 가져오지 말고 필요한 부분만 발췌 |

### 3-2. Claw3D의 기믹 (소스에서 확인한 것)

- **장소 기반 연출**: desk, server_room(GitHub 작업 시), meeting_room(스탠드업), gym, jukebox, qa_lab, phone/sms booth
- **래치 타이머**: 작업 중 표시 5초, 스트리밍 활동 6초, 생각 중 6초 유지 → 이벤트가 잠깐 끊겨도 캐릭터가 깜빡이지 않음
- **스탠드업**: "standup meeting", "let's have a standup" 같은 문장을 감지하면 회의실로 모임 (트리거 유효 30초)
- **청소부 리셋**: 세션이 초기화되면 청소부 캐릭터가 등장해 자리를 정리
- **A* 경로 탐색**: 가구를 피해서 걸음

## 4. Claude Code용 매핑 (제안 — 구현하며 검증 필요)

Claude Code 세션 기록은 `~/.claude/projects/<프로젝트>/<세션>.jsonl`에 쌓인다(pixel-agents가 이 파일을 감시함).
아래 표는 Claw3D의 장소 개념을 Claude Code 도구 호출에 대응시킨 **제 제안**이며, 실제 JSONL 필드 구조는 연구소 PC에서 파일을 열어 확인한 뒤 확정할 것.

| JSONL에서 보이는 것 | 상태 | 장소/연출 |
|---|---|---|
| `Edit`, `Write`, `NotebookEdit` 도구 호출 | 코딩 중 | 자기 책상, 모니터 파랗게 켜짐 |
| `Read`, `Grep`, `Glob`, `WebSearch`, `WebFetch` | 탐색 중 | 자기 책상 또는 책장 앞 |
| `Bash`로 `git`/`gh` 실행 | GitHub 작업 | 서버룸 (Claw3D의 github 장소) |
| `Bash`로 테스트 실행 (`npm test`, `pytest` 등) | 테스트 중 | QA 실험대 |
| 서브에이전트(`Task`/`Agent`) 생성 | 하위 작업 | 문에서 새 캐릭터 등장, 부모 옆으로 이동, 끝나면 퇴장 |
| 권한 요청 대기 | 확인 필요 | 책상 옆에 서서 빨간 링 깜빡임 (가장 눈에 띄게) |
| 응답 완료 후 입력 없음 | 휴식 | 라운지 소파 |
| `/clear` 또는 새 세션 시작 | 리셋 | 청소부 연출 (Claw3D janitor 차용) |

연구실 테마 아이디어(선택): 서버룸 대신 시추 코어 보관대, QA 실험대 대신 현미경 책상.

권한 대기는 JSONL만으로 판별이 애매할 수 있음. pixel-agents는 `~/.claude/` 아래에 훅 설정을 추가해 감지하므로, 그 방식도 확인할 것.

## 5. 제안 구조

```
agent-office/
├─ server/            # Node: JSONL 감시 → 상태 판정 → WebSocket 송신
│  ├─ watcher.ts      #   ~/.claude/projects/**/*.jsonl 꼬리 읽기 (chokidar)
│  ├─ classify.ts     #   도구 호출 → 상태/장소 (4절 표)
│  └─ latches.ts      #   Claw3D식 래치/홀드
└─ web/               # Vite + React + React Three Fiber
   ├─ scene/          #   바닥, 벽, 가구 (시제품 좌표 재사용)
   ├─ agents/         #   캐릭터, 걷기, 상태 라벨
   └─ nav/            #   격자 A* (Claw3D pathfinding.ts 참고)
```

Next.js 대신 Vite를 제안하는 이유: 로컬 전용 도구라 서버 렌더링이 필요 없고, 설정이 가볍다.
보안: 서버는 기본적으로 `127.0.0.1`에만 열 것 (세션 기록에 코드와 대화가 담겨 있음).

## 6. 작업 순서

- [ ] 1. 연구소 PC에서 실제 JSONL 한 개를 열어 도구 호출·권한 요청이 어떤 필드로 기록되는지 확인
- [ ] 2. `server/watcher.ts` + `classify.ts`: 콘솔에 "세션 X → 코딩 중" 식으로 찍히는 것까지
- [ ] 3. `web/`: 시제품 HTML을 R3F로 옮기기 (가짜 데이터로 먼저)
- [ ] 4. WebSocket 연결해서 실제 세션으로 움직이게
- [ ] 5. 래치 타이머 적용 (깜빡임 방지)
- [ ] 6. 서브에이전트 등장/퇴장, 권한 대기 강조
- [ ] 7. 기믹 추가: 서버룸, QA 실험대, 청소부 리셋, 스탠드업
- [ ] 8. 격자 A* 경로 탐색으로 교체

## 7. 연구소 터미널에서 시작하기

```bash
mkdir agent-office && cd agent-office
# 이 문서와 agent-office-3d.html을 이 폴더에 둔다
git clone --depth 1 https://github.com/iamlukethedev/Claw3D.git ref/Claw3D
git clone --depth 1 https://github.com/pablodelucca/pixel-agents.git ref/pixel-agents
claude
```

Claude Code에 처음 줄 지시 예시:

> agent-office-plan.md를 읽고 6절 1~2단계부터 진행해줘. ref/ 폴더의 Claw3D와 pixel-agents는 참고용이니 수정하지 말고, Claw3D 코드를 가져올 땐 MIT 저작권 고지를 남겨줘.

## 참고 자료

- Claw3D: https://github.com/iamlukethedev/Claw3D
- pixel-agents: https://github.com/pablodelucca/pixel-agents
- OpenClaw 가상 오피스 저장소 정리 글: https://university.tenten.co/t/most-popular-openclaw-virtual-office-github-repo/2186
