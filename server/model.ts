// 화면에 보내는 모양. 웹(web/src/types.ts)이 같은 모양을 읽는다 — 고치면 둘 다.

// 캐릭터가 지금 하는 일. 장소는 이것에서 정해진다(web/src/scene/layout.ts).
export type Activity =
  | 'code'    // Edit·Write·NotebookEdit — 자기 책상, 모니터 파랑
  | 'read'    // Read·Grep·Glob·Web* — 자기 책상, 모니터 초록
  | 'run'     // 그 밖의 Bash·도구 — 자기 책상
  | 'think'   // 바쁜데 도구 호출이 없다(글을 쓰는 중) — 자기 책상
  | 'git'     // Bash 로 git·gh — 코어 보관대
  | 'test'    // Bash 로 시험 — 현미경 책상
  | 'spawn'   // Agent·Task 로 하위 에이전트를 띄움 — 자기 책상
  | 'wait'    // 사용자 확인을 기다림 — 책상 옆에 서서 빨간 링
  | 'idle';   // 응답을 마치고 입력을 기다림 — 라운지

// 방 — 사람이 직접 시킨 일을 하면 사무실, 다른 세션이 보낸 지령(peer)을 받아 처리하면 고객센터.
// 쉬는 세션은 방과 상관없이 휴게실로 간다(화면이 activity 로 정한다).
export type Room = 'office' | 'center';

export type AgentKind =
  | 'session'   // 사람이 연 대화형 세션 (터미널)
  | 'job'       // 백그라운드 세션 (claude daemon 의 job)
  | 'subagent'  // 세션이 띄운 하위 에이전트
  | 'foreign';  // 다른 Linux 계정의 claude — 기록을 못 읽으니 있다는 것만

export interface Agent {
  id: string;
  kind: AgentKind;
  name: string;
  project: string;          // cwd 의 마지막 이름
  activity: Activity;
  guessed?: boolean;        // wait 가 기록이 아니라 시간으로 추정한 것
  label: string;            // 지금 도구 한 줄 (파일 이름·명령 설명 — 대화 본문은 보내지 않는다)
  room: Room;
  parentId?: string;
  tmux?: string;            // 세션이 도는 tmux 자리 (예: pan)
  user?: string;            // foreign 의 계정
  startedAt: number;        // ms
  changedAt: number;        // activity 가 마지막으로 바뀐 때
}

export interface Terminal {
  name: string;             // tmux 세션 이름
  attached: number;         // 붙어 있는 클라이언트 수
  windows: number;
  claude: boolean;          // 이 tmux 안에 claude 세션이 있다
}

export interface Snapshot {
  version: string;
  host: string;
  at: number;
  agents: Agent[];
  terminals: Terminal[];
  limits?: Limits;          // Claude 사용 한도 — statusLine 이 남긴 파일에서. 없으면 모른다
}

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
