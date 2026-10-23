// 오른쪽 목록 — 에이전트(하위 에이전트는 부모 아래로)와 터미널
import type { Agent, Snapshot } from './types.ts';
import { STATE_TEXT } from './scene/layout.ts';
import { colorOf } from './scene/director.ts';
import type { Link } from './useOffice.ts';

const KIND: Record<Agent['kind'], string> = { session: '터미널', job: '백그라운드', subagent: '하위', foreign: '다른 계정' };
const WORK = new Set(['code', 'read', 'run', 'think', 'spawn', 'git', 'test']);
const LINK: Record<Link, string> = { connecting: '연결 중', live: '실시간', lost: '연결 끊김 — 다시 붙는 중', demo: '예시 데이터' };

function since(ms: number): string {
  const s = Math.max(0, Math.round((Date.now() - ms) / 1000));
  if (s < 60) return `${s}초`;
  if (s < 3600) return `${Math.floor(s / 60)}분`;
  return `${Math.floor(s / 3600)}시간`;
}

function Row({ a, all, selected, onSelect }: { a: Agent; all: Agent[]; selected: boolean; onSelect: (id: string) => void }) {
  const hex = '#' + colorOf(a, all).toString(16).padStart(6, '0');
  const pill = a.activity === 'wait' ? 'pill wait' : WORK.has(a.activity) ? 'pill work' : 'pill';
  return (
    <button className={'row' + (a.parentId ? ' sub' : '') + (selected ? ' sel' : '')} onClick={() => onSelect(a.id)}>
      <div className="av" style={{ background: hex }}>{a.name.slice(0, 1).toUpperCase()}</div>
      <div className="txt">
        <div className="who">
          <b title={a.name}>{a.name}</b>
          <span className={pill}>{STATE_TEXT[a.activity]}{a.guessed ? '?' : ''}</span>
        </div>
        <div className="tool" title={a.label}>{a.label}</div>
        <div className="meta">{KIND[a.kind]}{a.project ? ` · ${a.project}` : ''}{a.tmux ? ` · tmux ${a.tmux}` : ''} · {since(a.changedAt)}째</div>
      </div>
    </button>
  );
}

export function Panel({ snap, link, selected, onSelect }: {
  snap: Snapshot | null; link: Link; selected: string | null; onSelect: (id: string) => void;
}) {
  const agents = snap?.agents ?? [];
  const top = agents.filter((a) => !a.parentId);
  const kids = (id: string) => agents.filter((a) => a.parentId === id);
  const waiting = agents.filter((a) => a.activity === 'wait').length;
  return (
    <aside>
      <h2>에이전트 {agents.length}<span className={link === 'lost' ? 'bad' : ''}>{LINK[link]}</span></h2>
      {waiting > 0 && <p className="alert">확인을 기다리는 세션 {waiting}</p>}
      <div className="list">
        {top.map((a) => (
          <div key={a.id}>
            <Row a={a} all={agents} selected={selected === a.id} onSelect={onSelect} />
            {kids(a.id).map((k) => <Row key={k.id} a={k} all={agents} selected={selected === k.id} onSelect={onSelect} />)}
          </div>
        ))}
        {!agents.length && <p className="note">돌고 있는 세션이 없다.</p>}
      </div>
      <h2>터미널 {snap?.terminals.length ?? 0}<span>tmux</span></h2>
      <div className="terms">
        {(snap?.terminals ?? []).map((t) => (
          <div key={t.name} className="term">
            <i className={t.attached ? 'on' : ''} />
            <b>{t.name}</b>
            <span>창 {t.windows}{t.attached ? ` · 붙음 ${t.attached}` : ''}{t.claude ? ' · claude' : ''}</span>
          </div>
        ))}
        {snap && !snap.terminals.length && <p className="note">tmux 세션이 없다.</p>}
      </div>
      <p className="note">책상 = 일하는 중 · 책상 옆 빨간 링 = 확인 필요 · 왼쪽 코어 보관대 = git·gh · 오른쪽 현미경 = 시험 · 라운지 = 휴식</p>
    </aside>
  );
}
