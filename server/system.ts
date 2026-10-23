// 이 서버의 프로세스와 tmux. 다른 계정의 것은 ps 로 있다는 것과 CPU 만 본다.
import fs from 'node:fs';
import os from 'node:os';
import { execFileSync } from 'node:child_process';

const ME = os.userInfo().username;
const HZ = 100;   // /proc/<pid>/stat 의 틱 (리눅스 USER_HZ)

// pid 가 살아 있고, 기록된 procStart(부팅 뒤 틱)와 같은 프로세스인가 — pid 재사용을 거른다
export function alive(pid: number, procStart?: string): boolean {
  try {
    const stat = fs.readFileSync(`/proc/${pid}/stat`, 'utf8');
    if (!procStart) return true;
    const fields = stat.slice(stat.lastIndexOf(')') + 2).split(' ');
    return fields[19] === procStart;   // 22번째 필드 starttime (comm 뒤로 3번째부터 셈)
  } catch {
    return false;
  }
}

function cpuTicks(pid: number): number {
  try {
    const stat = fs.readFileSync(`/proc/${pid}/stat`, 'utf8');
    const f = stat.slice(stat.lastIndexOf(')') + 2).split(' ');
    return Number(f[11]) + Number(f[12]);   // utime + stime
  } catch {
    return -1;
  }
}

export interface TmuxSession { name: string; attached: number; windows: number; command: string; self: boolean }

// 이 화면 서버의 조상 프로세스들 — tmux 칸의 프로세스가 여기에 있으면 그 tmux 가 이 서버를 돌리는 것이다
let ancestors: Set<number> | null = null;
function selfAncestors(): Set<number> {
  if (ancestors) return ancestors;
  ancestors = new Set();
  let pid = process.pid;
  for (let i = 0; i < 64 && pid > 1; i++) {
    ancestors.add(pid);
    try {
      const stat = fs.readFileSync(`/proc/${pid}/stat`, 'utf8');
      pid = Number(stat.slice(stat.lastIndexOf(')') + 2).split(' ')[1]);   // ppid
    } catch { break; }
  }
  return ancestors;
}

export function tmuxSessions(): TmuxSession[] {
  try {
    const out = execFileSync('tmux', ['list-sessions', '-F', '#{session_name}\t#{session_attached}\t#{session_windows}'],
      { encoding: 'utf8', timeout: 2000, stdio: ['ignore', 'pipe', 'ignore'] });
    // 세션마다 보이는 창(활성 창의 활성 칸)에서 지금 도는 명령
    const panes = execFileSync('tmux', ['list-panes', '-a', '-F', '#{session_name}\t#{window_active}\t#{pane_active}\t#{pane_current_command}\t#{pane_pid}'],
      { encoding: 'utf8', timeout: 2000, stdio: ['ignore', 'pipe', 'ignore'] });
    const command = new Map<string, string>();
    const self = new Set<string>();
    const mine = selfAncestors();
    for (const l of panes.trim().split('\n')) {
      const [s, wa, pa, cmd, ppid] = l.split('\t');
      if (wa === '1' && pa === '1') command.set(s, cmd ?? '');
      if (mine.has(Number(ppid))) self.add(s);
    }
    return out.trim().split('\n').filter(Boolean).map((l) => {
      const [name, a, w] = l.split('\t');
      return { name, attached: Number(a), windows: Number(w), command: command.get(name) ?? '', self: self.has(name) };
    });
  } catch {
    return [];   // tmux 서버가 없다
  }
}

export interface ForeignClaude { user: string; pid: number; startedAt: number; busy: boolean }

const prevTicks = new Map<number, { ticks: number; at: number }>();

// 다른 계정의 claude 본체 (daemon·pty 호스트·예비 프로세스는 뺀다)
export function foreignClaudes(now: number): ForeignClaude[] {
  let out = '';
  try {
    out = execFileSync('ps', ['-eo', 'user:32=,pid=,etimes=,args='], { encoding: 'utf8', timeout: 2000 });
  } catch {
    return [];
  }
  const found: ForeignClaude[] = [];
  const seen = new Set<number>();
  for (const line of out.split('\n')) {
    const m = line.trim().match(/^(\S+)\s+(\d+)\s+(\d+)\s+(.*)$/);
    if (!m) continue;
    const [, user, pidS, et, args] = m;
    if (user === ME) continue;
    const argv0 = args.split(' ')[0];
    if (!/(^|\/)claude$/.test(argv0) && !/\/claude\/versions\//.test(argv0)) continue;
    if (/\b(daemon|bg-pty-host|bg-spare)\b/.test(args)) continue;
    const pid = Number(pidS);
    seen.add(pid);
    const ticks = cpuTicks(pid);
    const prev = prevTicks.get(pid);
    prevTicks.set(pid, { ticks, at: now });
    // 지난 폴링 뒤 CPU 를 5% 넘게 썼으면 바쁜 것으로 본다
    const busy = !!prev && ticks >= 0 && (ticks - prev.ticks) / HZ / ((now - prev.at) / 1000) > 0.05;
    found.push({ user, pid, startedAt: now - Number(et) * 1000, busy });
  }
  for (const pid of prevTicks.keys()) if (!seen.has(pid)) prevTicks.delete(pid);
  return found;
}
