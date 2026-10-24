// 원천(~/.claude 와 /proc, tmux)에서 화면에 보낼 Snapshot 을 만든다.
// 상태는 원천에만 있다 — 여기는 매번 다시 읽어 파생한다 (Claw3D ARCHITECTURE.md 의 경계 원칙).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { SESSIONS_DIR, JOBS_DIR, PROJECTS_DIR } from './paths.ts';
import { Transcript } from './transcript.ts';
import { resolve, type Busy } from './latches.ts';
import { alive, tmuxSessions, foreignClaudes } from './system.ts';
import { execFileSync } from 'node:child_process';
import { readLimits } from './limits.ts';
import { desk, DESK_DIR } from './desk.ts';
import type { Agent, Office as OfficeRoom, Snapshot, Terminal } from './model.ts';

// 사무실 크기 — 커밋 수로 (2026-10-23: ForGIA 13 · Cropobite 19 · rash-company 333 · DiaRUGA 736 · GSM 1561)
const SMALL_COMMITS = 100;
const LARGE_COMMITS = 1000;
const COMMITS_TTL_MS = 10 * 60_000;
const commits = new Map<string, { n: number; at: number }>();
function commitCount(project: string, now: number): number {
  const c = commits.get(project);
  if (c && now - c.at < COMMITS_TTL_MS) return c.n;
  let n = 0;
  try {
    n = Number(execFileSync('git', ['-C', path.join(os.homedir(), 'projects', project), 'rev-list', '--count', 'HEAD'],
      { encoding: 'utf8', timeout: 3000, stdio: ['ignore', 'pipe', 'ignore'] }).trim()) || 0;
  } catch { /* git 저장소가 아니면 0 — 작은 사무실 */ }
  commits.set(project, { n, at: now });
  return n;
}

const SUBAGENT_FRESH_MS = 60_000;
const SHELLS = new Set(['bash', 'zsh', 'sh', 'fish', 'dash', '']);   // 이것이면 프롬프트에서 쉬는 것   // 하위 에이전트 기록이 이만큼 조용하면 끝난 것으로 본다

interface Registry {
  pid: number;
  sessionId: string;
  cwd: string;
  startedAt: number;
  procStart?: string;
  kind?: string;          // interactive | bg
  name?: string;
  status?: string;        // busy | idle
  jobId?: string;
  spare?: boolean;        // 미리 띄워 둔 예비 프로세스 — 사람이 쓰는 세션이 아니다
  tmux?: string;
  parkedJobId?: string;   // 대화를 백그라운드 job 으로 넘긴 터미널 — 대화는 job 쪽에서 이어진다
}

// 방: 다른 세션의 지령을 받아 처리하면 고객센터, 아니면 그 프로젝트의 사무실, 프로젝트를 모르면 공용실.
// 프로젝트 = ~/projects 아래 첫 폴더 이름에서 worktree 꼬리(-wt-…)를 뗀 것 (GSM-wt-pan → GSM)
const HOME = os.homedir();
export function projectOf(cwd: string): string | null {
  const rel = path.relative(path.join(HOME, 'projects'), cwd);
  if (!rel || rel.startsWith('..') || path.isAbsolute(rel)) return null;
  return rel.split(path.sep)[0].replace(/-wt-.*$/, '') || null;
}
function roomOf(cwd: string, t: Transcript | null): Agent['room'] {
  if (t?.room() === 'center') return 'center';
  return projectOf(cwd) ?? 'general';
}

function readJson<T>(file: string): T | null {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')) as T; } catch { return null; }
}

function listDir(dir: string): string[] {
  try { return fs.readdirSync(dir); } catch { return []; }
}

export class Office {
  private transcripts = new Map<string, Transcript>();   // 파일 경로 → 꼬리
  private fileOf = new Map<string, string>();            // sessionId → 기록 파일
  private changed = new Map<string, { activity: string; at: number }>();
  private tmuxSeen = new Map<string, number>();
  private bornAt = Date.now();          // tmux 세션 이름 → 처음 본 때
  readonly version: string;

  constructor(version: string) {
    this.version = version;
  }

  private transcript(file: string): Transcript {
    let t = this.transcripts.get(file);
    if (!t) { t = new Transcript(file); this.transcripts.set(file, t); }
    t.poll();
    return t;
  }

  // 기록 파일은 세션이 시작한 cwd 의 프로젝트 폴더에 있다. cwd 가 바뀌어도 찾게 전부 훑는다.
  private findTranscript(sessionId: string): string | null {
    const known = this.fileOf.get(sessionId);
    if (known && fs.existsSync(known)) return known;
    for (const dir of listDir(PROJECTS_DIR)) {
      const f = path.join(PROJECTS_DIR, dir, `${sessionId}.jsonl`);
      if (fs.existsSync(f)) { this.fileOf.set(sessionId, f); return f; }
    }
    return null;
  }

  private sessions(now: number): Agent[] {
    const agents: Agent[] = [];
    for (const f of listDir(SESSIONS_DIR)) {
      if (!f.endsWith('.json')) continue;
      const r = readJson<Registry>(path.join(SESSIONS_DIR, f));
      if (!r || r.spare || !alive(r.pid, r.procStart)) continue;
      if (r.cwd.startsWith(DESK_DIR)) continue;   // 상담원이 부른 claude -p — 상담원 캐릭터가 대신 보인다
      const isJob = r.kind === 'bg';
      let busy: Busy = r.status === 'busy' ? 'busy' : 'idle';
      if (isJob && r.jobId) {
        const job = readJson<{ state?: string }>(path.join(JOBS_DIR, r.jobId, 'state.json'));
        if (job?.state === 'blocked') busy = 'blocked';
        else if (job?.state === 'working') busy = 'busy';
        else if (job?.state) busy = 'idle';
      }
      const file = this.findTranscript(r.sessionId);
      const t = file ? this.transcript(file) : null;
      // 넘긴 터미널의 status 는 넘길 때의 값(busy)에 멈춰 있다 — 기록도 job 쪽이 쓴다
      const st = r.parkedJobId
        ? { activity: 'idle' as const, label: `백그라운드로 넘김 · job ${r.parkedJobId}` }
        : resolve(busy, t, now);
      const id = r.sessionId;
      agents.push({
        id,
        kind: isJob ? 'job' : 'session',
        name: r.name || t?.title || id.slice(0, 8),
        project: path.basename(r.cwd) || r.cwd,
        ...st,
        room: roomOf(r.cwd, t),
        ...(t?.boss() || /^(pan|판)\b/i.test(r.name ?? '') || r.tmux?.startsWith('pan:') ? { role: 'boss' as const } : {}),
        tmux: r.tmux?.split(':')[0],
        startedAt: r.startedAt,
        changedAt: now,
      });
      if (file) agents.push(...this.subagents(file, id, roomOf(r.cwd, t), now));
    }
    return agents;
  }

  // <프로젝트>/<세션>/subagents/agent-*.jsonl (+ .meta.json)
  private subagents(sessionFile: string, parentId: string, room: Agent['room'], now: number): Agent[] {
    const dir = path.join(sessionFile.replace(/\.jsonl$/, ''), 'subagents');
    const out: Agent[] = [];
    for (const f of listDir(dir)) {
      if (!f.endsWith('.jsonl')) continue;
      const file = path.join(dir, f);
      let mtime = 0;
      try { mtime = fs.statSync(file).mtimeMs; } catch { continue; }
      if (now - mtime > SUBAGENT_FRESH_MS) continue;
      const t = this.transcript(file);
      if (t.ended) continue;
      const meta = readJson<{ agentType?: string; description?: string }>(file.replace(/\.jsonl$/, '.meta.json'));
      const st = resolve(now - mtime < 3000 ? 'busy' : 'idle', t, now);
      out.push({
        id: `${parentId}/${f.slice(0, -6)}`,
        kind: 'subagent',
        name: meta?.agentType || 'agent',
        project: meta?.description || '',
        ...st,
        room,
        parentId,
        startedAt: mtime,
        changedAt: now,
      });
    }
    return out;
  }

  private foreign(now: number): Agent[] {
    return foreignClaudes(now).map((c) => ({
      id: `foreign/${c.user}/${c.pid}`,
      kind: 'foreign' as const,
      name: `${c.user} · ${c.pid}`,
      project: '',
      activity: c.busy ? 'think' as const : 'idle' as const,
      label: '다른 계정 — 기록은 읽지 않는다',
      room: `@${c.user}`,   // 계정마다 제 부서(사무실) — 사용자: 「다른 계정의 업무들은 다른 부서로 분리해서」
      user: c.user,
      startedAt: c.startedAt,
      changedAt: now,
    }));
  }

  snapshot(now = Date.now()): Snapshot {
    const agents = [...this.sessions(now), ...this.foreign(now)];
    // changedAt 은 activity 가 바뀐 때만 움직인다
    const live = new Set<string>();
    for (const a of agents) {
      live.add(a.id);
      const prev = this.changed.get(a.id);
      if (prev && prev.activity === a.activity) a.changedAt = prev.at;
      else this.changed.set(a.id, { activity: a.activity, at: now });
    }
    for (const id of this.changed.keys()) if (!live.has(id) && !id.startsWith('tmux/')) this.changed.delete(id);
    // 더 안 보는 기록은 닫는다. 하위 에이전트의 것은 조용해진 뒤 한참 남겨 둔다 — ended 를 기억해야 다시 안 나타난다
    const used = new Set<string>();
    for (const a of agents) {
      const f = this.fileOf.get(a.id);
      if (f) used.add(f);
    }
    for (const [f, t] of this.transcripts) {
      const sub = f.includes('/subagents/');
      if (sub ? now - t.mtime > SUBAGENT_FRESH_MS * 2 : !used.has(f)) this.transcripts.delete(f);
    }
    agents.sort((a, b) => a.startedAt - b.startedAt);
    const claudeTmux = new Set(agents.map((a) => a.tmux).filter(Boolean));
    // 이 화면 서버를 돌리는 tmux 는 빼고 — 화면에 자기 자신이 사람으로 앉아 있으면 어색하다 (사용자)
    const terminals: Terminal[] = tmuxSessions().filter((s) => !s.self)
      .map(({ self: _self, ...s }) => ({ ...s, claude: claudeTmux.has(s.name) || s.command === 'claude' }));
    // claude 가 없는 tmux 세션도 사람으로 — claude 가 있으면 그 세션이 이미 사람이다
    terminals.forEach((t, slot) => {
      if (t.claude) return;
      const busy = !SHELLS.has(t.command);
      const id = `tmux/${t.name}`;
      const prev = this.changed.get(id);
      const activity = busy ? 'run' as const : 'idle' as const;
      agents.push({
        id, kind: 'terminal', name: t.name, project: 'tmux', activity,
        label: busy ? `$ ${t.command}` : '프롬프트 대기',
        room: 'general', tmux: t.name, slot,
        startedAt: this.tmuxSeen.get(t.name) ?? (this.tmuxSeen.set(t.name, now), now),
        changedAt: prev && prev.activity === activity ? prev.at : now,
      });
      if (!prev || prev.activity !== activity) this.changed.set(id, { activity, at: now });
    });
    for (const n of this.tmuxSeen.keys()) {
      if (terminals.some((t) => t.name === n && !t.claude)) continue;
      this.tmuxSeen.delete(n);
      this.changed.delete(`tmux/${n}`);
    }
    // 고객센터 상담원 — 늘 있다. 질문에 답하는 동안 think
    agents.push({
      id: 'desk/상담원', kind: 'desk', name: '상담원', project: '고객센터', room: 'center',
      activity: desk.busy ? 'think' : 'idle', label: desk.busy ? '질문에 답하는 중' : '질문을 기다림',
      startedAt: this.bornAt, changedAt: desk.busy ? desk.since : desk.lastAt || this.bornAt,
    });
    const offices: OfficeRoom[] = [...new Set(agents.filter((a) => (a.kind === 'session' || a.kind === 'job') && a.room !== 'center' && a.room !== 'general').map((a) => a.room))]
      .sort().map((name) => {
        const n = commitCount(name, now);
        return { name, size: n < SMALL_COMMITS ? 's' as const : n >= LARGE_COMMITS ? 'l' as const : 'm' as const };
      });
    // 다른 계정의 부서 — 「@계정」. 기록을 못 읽어 커밋 수 대신 그 계정 세션 수로 크기를 정한다 (책상 s 2 · m 4 · l 8)
    const foreignN = new Map<string, number>();
    for (const a of agents) if (a.kind === 'foreign') foreignN.set(a.room, (foreignN.get(a.room) ?? 0) + 1);
    for (const [name, n] of [...foreignN].sort()) offices.push({ name, size: n <= 2 ? 's' : n <= 4 ? 'm' : 'l' });
    return { version: this.version, host: os.hostname(), at: now, agents, terminals, offices, limits: readLimits(now) };
  }
}
