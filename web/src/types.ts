// server/model.ts 의 사본 — 화면이 받는 모양. 고치면 둘 다.

// 캐릭터가 지금 하는 일. 장소는 이것에서 정해진다(web/src/scene/layout.ts).
export type Activity =
  | 'code'    // Edit·Write·NotebookEdit — 자기 책상, 모니터 파랑
  | 'read'    // Read·Grep·Glob — 자기 책상, 모니터 초록
  | 'search'  // WebSearch·WebFetch — 자료실에 다녀온다
  | 'run'     // 그 밖의 Bash·도구 — 자기 책상
  | 'think'   // 바쁜데 도구 호출이 없다(글을 쓰는 중) — 자기 책상
  | 'git'     // Bash 로 git·gh — 코어 보관대
  | 'test'    // Bash 로 시험 — 현미경 책상
  | 'spawn'   // Agent·Task 로 하위 에이전트를 띄움 — 자기 책상
  | 'wait'    // 사용자 확인을 기다림 — 책상 옆에 서서 빨간 링
  | 'idle';   // 응답을 마치고 입력을 기다림 — 라운지

// 방 — 사람이 직접 시킨 일을 하면 사무실, 다른 세션이 보낸 지령(peer)을 받아 처리하면 고객센터.
// 쉬는 세션은 방과 상관없이 휴게실로 간다(화면이 activity 로 정한다).
// 방: 'center'(고객센터) · 'general'(공용실 — 프로젝트를 모를 때) · 그 밖은 프로젝트 이름(그 프로젝트의 사무실)
export type Room = string;

export type AgentKind =
  | 'session'   // 사람이 연 대화형 세션 (터미널)
  | 'job'       // 백그라운드 세션 (claude daemon 의 job)
  | 'subagent'  // 세션이 띄운 하위 에이전트
  | 'foreign'   // 다른 Linux 계정의 claude — 기록을 못 읽으니 있다는 것만
  | 'terminal'  // claude 가 없는 tmux 세션 — 명령이 돌면 run, 프롬프트면 idle
  | 'desk';     // 고객센터 상담원 — 화면 대화창의 질문에 답한다(도구 없는 claude -p). 답할 때 think

export interface Agent {
  id: string;
  kind: AgentKind;
  name: string;
  project: string;          // cwd 의 마지막 이름
  activity: Activity;
  guessed?: boolean;        // wait 가 기록이 아니라 시간으로 추정한 것
  label: string;            // 지금 도구 한 줄 (파일 이름·명령 설명 — 대화 본문은 보내지 않는다)
  room: Room;
  role?: 'boss';            // 다른 세션에 일을 나눠 주고 거두는 세션(판 세션 등) — 부장실·본부장실에 앉는다
  parentId?: string;
  tmux?: string;            // 세션이 도는 tmux 자리 (예: pan)
  slot?: number;            // terminal 의 벽 모니터 번호 (Snapshot.terminals 의 차례)
  user?: string;            // 다른 계정 — foreign, 또는 표지(fl-visible)를 켠 계정의 세션·job·하위 에이전트 (내 것은 없다)
  startedAt: number;        // ms
  changedAt: number;        // activity 가 마지막으로 바뀐 때
}

export interface Terminal {
  name: string;             // tmux 세션 이름
  attached: number;         // 붙어 있는 클라이언트 수
  windows: number;
  claude: boolean;          // 이 tmux 안에 claude 세션이 있다
  command: string;          // 보이는 창의 지금 명령 (bash·npm·claude …)
}

// 프로젝트 사무실 — 크기는 커밋 수로: s(100 미만, 반 칸) · m(한 칸) · l(1000 이상, 두 칸)
export type OfficeSize = 's' | 'm' | 'l';
export interface Office { name: string; size: OfficeSize }

export interface Snapshot {
  version: string;
  host: string;
  at: number;
  agents: Agent[];
  terminals: Terminal[];
  offices: Office[];        // 사무실을 둘 프로젝트 (세션·job 의 room 가운데 center·general 이 아닌 것, 이름 차례)
  limits?: Limits;          // Claude 사용 한도 — statusLine 이 남긴 파일에서. 없으면 모른다
  people?: Record<string, Person>;   // 사람이 화면에서 고친 이름·생김새 (지금 있는 에이전트의 것만, id 로)
}

// 화면에서 고친 것 — 고친 칸만. 값의 목록은 web/src/scene/appearance.ts (서버 server/people.ts 가 그 목록으로 거른다)
export interface PersonLook {
  female?: boolean;
  hair?: string;            // 머리 모양
  hc?: number;              // 머리 색
  acc?: string[];           // 치장품
  accent?: number;          // 치장품의 포인트 색
  skin?: number;
  outfit?: string;          // 옷
  build?: string;           // 몸집
}
export interface Person { name?: string; look?: PersonLook }

// 한도 창 하나 (5시간·주간)
export interface LimitWindow {
  usedPct: number;          // 0–100
  resetsAt: number;         // ms
}

export interface Limits {
  fiveHour?: LimitWindow;
  sevenDay?: LimitWindow;
  seenAt: number;           // 값을 받은 때 (파일 mtime, ms) — 세션이 응답할 때만 새로 쓰인다
}
