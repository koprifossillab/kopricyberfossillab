// 읽을 계정들의 ~/.claude — 나(이 서버를 돌리는 계정)와, 표지 ~/.claude/fl-visible 을 스스로 켠 다른 계정 (koprifossillab P01).
// 다른 계정의 집을 읽는 힘은 서비스 유닛의 CAP_DAC_READ_SEARCH 에서 온다 — 그 힘은 모든 파일에 닿으므로
// 무엇을 여는지는 코드가 지킨다: sessions/*.json · jobs/*/state.json · projects/**/*.jsonl 꼬리만. .key·settings·credentials 는 열지 않는다.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export const CLAUDE_HOME = process.env.FL_CLAUDE_HOME ?? path.join(os.homedir(), '.claude');

export const MARKER = 'fl-visible';
const PASSWD = process.env.FL_PASSWD ?? '/etc/passwd';   // 시험은 손으로 지은 passwd 로 집 뿌리를 바꾼다
const ME = os.userInfo().username;

export interface Account {
  user: string;
  home: string;       // 프로젝트 이름(~/projects/<p>)과 커밋 수를 여기서
  me: boolean;
  sessions: string;
  jobs: string;
  projects: string;
}

function account(user: string, home: string, claude: string, me: boolean): Account {
  return { user, home, me, sessions: path.join(claude, 'sessions'), jobs: path.join(claude, 'jobs'), projects: path.join(claude, 'projects') };
}

interface PasswdEntry { user: string; uid: number; home: string }
function passwd(): PasswdEntry[] {
  let text = '';
  try { text = fs.readFileSync(PASSWD, 'utf8'); } catch { return []; }
  const out: PasswdEntry[] = [];
  for (const l of text.split('\n')) {
    const f = l.split(':');
    if (f.length < 7) continue;
    const uid = Number(f[2]);
    if (!(uid >= 1000) || uid === 65534) continue;   // 시스템 계정·nobody 는 사람이 아니다
    out.push({ user: f[0], uid, home: f[5] });
  }
  return out;
}

// 표지는 그 집 주인이 만든 보통 파일이어야 한다 — 심볼릭 링크나 남이 넣은 표지는 동의가 아니다.
// 표지가 있어도 sessions 를 못 읽으면(읽기 권한이 아직 없으면) 켜지 않은 것으로 — 그 계정은 foreign 으로 남는다.
export function optedIn(e: PasswdEntry): boolean {
  const claude = path.join(e.home, '.claude');
  try {
    const st = fs.lstatSync(path.join(claude, MARKER));
    if (!st.isFile() || st.uid !== e.uid) return false;
    fs.readdirSync(path.join(claude, 'sessions'));
    return true;
  } catch {
    return false;
  }
}

// 매 폴링마다 다시 본다 — 표지를 지우면 다음 폴링에 빠진다
export function accounts(): Account[] {
  const list = [account(ME, os.homedir(), CLAUDE_HOME, true)];
  for (const e of passwd()) {
    if (e.user === ME || !optedIn(e)) continue;
    list.push(account(e.user, e.home, path.join(e.home, '.claude'), false));
  }
  return list;
}
