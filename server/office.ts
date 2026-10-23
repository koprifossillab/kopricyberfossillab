// 원천(~/.claude 와 /proc, tmux)에서 화면에 보낼 Snapshot 을 만든다.
// 상태는 원천에만 있다 — 여기는 매번 다시 읽어 파생한다 (Claw3D ARCHITECTURE.md 의 경계 원칙).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { SESSIONS_DIR, JOBS_DIR, PROJECTS_DIR } from './paths.ts';
import { Transcript } from './transcript.ts';
import { resolve, type Busy } from './latches.ts';
import { alive, tmuxSessions, foreignClaudes } from './system.ts';
import { readLimits } from './limits.ts';
import type { Agent, Snapshot, Terminal } from './model.ts';

const SUBAGENT_FRESH_MS = 60_000;   // 하위 에이전트 기록이 이만큼 조용하면 끝난 것으로 본다

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
        room: t?.room() ?? 'office',
        tmux: r.tmux?.split(':')[0],
        startedAt: r.startedAt,
        changedAt: now,
      });
      if (file) agents.push(...this.subagents(file, id, t?.room() ?? 'office', now));
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
      room: 'office' as const,
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
    for (const id of this.changed.keys()) if (!live.has(id)) this.changed.delete(id);
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
    const terminals: Terminal[] = tmuxSessions().map((s) => ({ ...s, claude: claudeTmux.has(s.name) }));
    return { version: this.version, host: os.hostname(), at: now, agents, terminals, limits: readLimits(now) };
  }
}
