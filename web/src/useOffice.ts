// 서버의 SSE(/api/events)를 받는다. ?demo 이면 서버 없이 예시 데이터로 움직인다.
import { useEffect, useState } from 'react';
import type { Activity, Agent, Snapshot } from './types.ts';

export type Link = 'connecting' | 'live' | 'lost' | 'demo';

const DEMO = new URLSearchParams(location.search).has('demo');

export function useOffice(): { snap: Snapshot | null; link: Link } {
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [link, setLink] = useState<Link>(DEMO ? 'demo' : 'connecting');

  useEffect(() => {
    if (DEMO) return demo(setSnap);
    const es = new EventSource('api/events');   // 상대경로 — 서브경로 뒤에서도
    es.onmessage = (e) => { setSnap(JSON.parse(e.data)); setLink('live'); };
    es.onerror = () => setLink('lost');          // EventSource 가 알아서 다시 붙는다
    return () => es.close();
  }, []);

  return { snap, link };
}

// 시제품의 예시 네 명 + 하위 에이전트 하나, 몇 초마다 활동을 바꾼다
function demo(set: (s: Snapshot) => void): () => void {
  const acts: Activity[] = ['code', 'read', 'search', 'think', 'git', 'test', 'wait', 'idle', 'idle', 'idle', 'spawn'];
  const labels: Record<Activity, string> = {
    code: 'Edit · viewer.ts', read: 'Grep · Thalassiosira', search: 'WebSearch · Compsognathus', think: '생각 중', git: 'Bash · git push',
    test: 'Bash · pytest', wait: 'AskUserQuestion', idle: '응답 완료 · 다음 지시 대기', spawn: 'Agent · Review UI', run: 'Bash · ls',
  };
  const t0 = Date.now();
  const base: Agent[] = ['Claude-A', 'Claude-B', 'gsm-pan', 'diaruga', 'pan'].map((n, i) => ({
    id: `demo-${i}`, kind: i === 2 ? 'job' : 'session', name: n, project: ['GSM', 'DiaRUGA', 'GSM', 'DiaRUGA', 'projects'][i],
    activity: acts[i], label: labels[acts[i]], room: ['GSM', 'DiaRUGA', 'center', 'rash-company', 'center'][i], startedAt: t0 + i, changedAt: t0,
  }));
  const tick = () => {
    for (const a of base) {
      if (Math.random() < 0.35) { a.activity = acts[Math.floor(Math.random() * acts.length)]; a.label = labels[a.activity]; a.changedAt = Date.now(); }
    }
    const agents: Agent[] = base.map((a) => ({ ...a }));
    if (base[0].activity === 'spawn' || base[0].activity === 'think') {
      agents.push({ id: 'demo-0/sub', kind: 'subagent', name: 'Explore', project: 'Review UI', activity: 'read',
        label: 'Glob · **/*.tif', room: 'GSM', parentId: 'demo-0', startedAt: Date.now(), changedAt: Date.now() });
    }
    agents.push({ id: 'foreign/paleoadmin/1', kind: 'foreign', name: 'paleoadmin', project: '', activity: Math.random() < 0.5 ? 'think' : 'idle',
      label: '다른 계정 — 기록은 읽지 않는다', room: 'general', user: 'paleoadmin', startedAt: t0 - 1, changedAt: Date.now() });
    agents.push({ id: 'desk/상담원', kind: 'desk', name: '상담원', project: '고객센터', activity: Math.random() < 0.4 ? 'think' : 'idle',
      label: '질문을 기다림', room: 'center', startedAt: t0 - 3, changedAt: Date.now() });
    const buildBusy = Math.random() < 0.5;
    agents.push({ id: 'tmux/build', kind: 'terminal', name: 'build', project: 'tmux', activity: buildBusy ? 'run' : 'idle',
      label: buildBusy ? '$ npm' : '프롬프트 대기', room: 'general', tmux: 'build', slot: 1, startedAt: t0 - 2, changedAt: Date.now() });
    set({ version: 'demo', host: 'demo', at: Date.now(), agents, offices: [{ name: 'DiaRUGA', size: 'm' }, { name: 'ForGIA', size: 's' }, { name: 'GSM', size: 'l' }, { name: 'rash-company', size: 'm' }],
      terminals: [{ name: 'pan', attached: 0, windows: 1, claude: true, command: 'claude' }, { name: 'build', attached: 1, windows: 2, claude: false, command: buildBusy ? 'npm' : 'bash' }],
      limits: { fiveHour: { usedPct: 73, resetsAt: t0 + 2 * 3600_000 + 14 * 60_000 }, sevenDay: { usedPct: 41, resetsAt: t0 + 3 * 86400_000 + 5 * 3600_000 }, seenAt: Date.now() - 30_000 } });
  };
  tick();
  const h = setInterval(tick, 4000);
  return () => clearInterval(h);
}
