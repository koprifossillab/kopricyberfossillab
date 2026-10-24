// 오른쪽 목록 — 에이전트(하위 에이전트는 부모 아래로)와 터미널
import { useEffect, useRef, useState, useSyncExternalStore, type CSSProperties } from 'react';
import type { Agent, Snapshot } from './types.ts';
import { loadAtlas, headKey, bodyKey } from './iso/atlas.ts';
import { appearanceOf, liftOf, PERSONAS } from './scene/appearance.ts';
import { personName, subtitle, setPersonName, subscribeNames, namesVersion } from './scene/names.ts';
import { STATE_TEXT, PALETTE, FOREIGN_COLOR, HEAD_Y } from './scene/layout.ts';
import { colorOf } from './scene/director.ts';
import type { Link } from './useOffice.ts';
import { Desk } from './Desk.tsx';
import './agentlist.css';

const KIND: Record<Agent['kind'], string> = { session: '터미널', job: '백그라운드', subagent: '하위', foreign: '다른 계정', terminal: 'tmux', desk: '상담원' };
const WORK = new Set(['code', 'read', 'search', 'run', 'think', 'spawn', 'git', 'test']);
const ROOM = (r: string) => (r === 'center' ? '고객센터' : r === 'general' ? '공용실' : r.startsWith('@') ? `${r.slice(1)} 계정` : r);
const FACE_DIR = 1;   // 머리 조각의 방향 — 카메라 쪽(+x+z)을 본다

// 목록의 얼굴 — 그 캐릭터의 머리·몸 조각을 그대로 (둥근 바탕은 몸 색)
export function Avatar({ a, color, small }: { a: Agent; color: number; small: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const L = appearanceOf(a);
  const key = `${color}-${L.look}-${L.skin}-${L.shape}-${L.cap}`;
  useEffect(() => {
    let alive = true;
    loadAtlas().then(({ atlas, sheets }) => {
      const c = ref.current;
      if (!alive || !c) return;
      const head = atlas.heads[headKey(L.skin, L.look, L.cap, FACE_DIR)];
      const body = atlas.bodies[bodyKey(color, L.shape, false)];
      const ctx = c.getContext('2d')!;
      ctx.clearRect(0, 0, c.width, c.height);
      if (!head) return;
      // 머리(지름 약 0.5)가 원의 3/4 쯤, 머리 가운데를 원 가운데보다 조금 위에. 몸집 따라 머리가 조각 안에서 오르내린 만큼(lift) 함께 내린다
      const px = atlas.scale * atlas.up[1];
      const s = (c.width * 0.75) / (0.5 * atlas.scale);
      const cx = c.width / 2, cy = c.height * 0.44 + liftOf(PERSONAS[L.look].build) * px * s;
      if (body) ctx.drawImage(sheets[body.sheet], body.sx, body.sy, body.w, body.h, cx + body.ox * s, cy + HEAD_Y * px * s + body.oy * s, body.w * s, body.h * s);
      ctx.drawImage(sheets[head.sheet], head.sx, head.sy, head.w, head.h, cx + head.ox * s, cy + head.oy * s, head.w * s, head.h * s);
    }).catch(() => {});
    return () => { alive = false; };
  }, [key]);   // eslint-disable-line react-hooks/exhaustive-deps
  const hexc = '#' + color.toString(16).padStart(6, '0');
  return <canvas ref={ref} className={'av' + (small ? ' sm' : '')} width={64} height={64} style={{ background: hexc + '33', borderColor: hexc }} />;
}
const LINK: Record<Link, string> = { connecting: '연결 중', live: '실시간', lost: '연결 끊김 — 다시 붙는 중', demo: '예시 데이터' };

function since(ms: number): string {
  const s = Math.max(0, Math.round((Date.now() - ms) / 1000));
  if (s < 60) return `${s}초`;
  if (s < 3600) return `${Math.floor(s / 60)}분`;
  return `${Math.floor(s / 3600)}시간`;
}

// 이름 — 두 번 눌러 그 자리에서 고친다. Enter·바깥 누르기로 정하고 Esc 로 그만, 비우면 지어 준 이름으로
function NameEdit({ a, onDone }: { a: Agent; onDone: () => void }) {
  const [v, setV] = useState(personName(a));
  const done = useRef(false);
  const finish = (keep: boolean) => {
    if (done.current) return;
    done.current = true;
    if (keep) setPersonName(a.id, v);
    onDone();
  };
  return (
    <input className="name-edit" value={v} autoFocus maxLength={20} aria-label="이름 고치기"
      onFocus={(e) => e.currentTarget.select()}
      onChange={(e) => setV(e.target.value)}
      onClick={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === 'Enter' && !e.nativeEvent.isComposing) finish(true);
        else if (e.key === 'Escape') finish(false);
      }}
      onBlur={() => finish(true)} />
  );
}

function Row({ a, all, selected, onSelect }: { a: Agent; all: Agent[]; selected: boolean; onSelect: (id: string) => void }) {
  const pill = a.activity === 'wait' ? 'pill wait' : WORK.has(a.activity) ? 'pill work' : 'pill';
  const [editing, setEditing] = useState(false);
  useSyncExternalStore(subscribeNames, namesVersion);
  // 줄 안에 입력란을 두려고 <button> 대신 role=button — 입력란은 button 안에 둘 수 없다
  return (
    <div role="button" tabIndex={0} className={'row' + (a.parentId ? ' sub' : '') + (selected ? ' sel' : '')} onClick={() => onSelect(a.id)}
      onKeyDown={(e) => { if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onSelect(a.id); } }}>
      <Avatar a={a} color={colorOf(a, all)} small={!!a.parentId} />
      <div className="txt">
        <div className="who">
          {editing ? <NameEdit a={a} onDone={() => setEditing(false)} />
            : <b title={`${subtitle(a)} — 두 번 눌러 이름 고치기`} onDoubleClick={(e) => { e.stopPropagation(); setEditing(true); }}>{personName(a)}<small>{subtitle(a)}</small></b>}
          <span className={pill}>{STATE_TEXT[a.activity]}{a.guessed ? '?' : ''}</span>
        </div>
        <div className="tool" title={a.label}>{a.label}</div>
        <div className="meta">{a.kind !== 'foreign' && !a.parentId ? `${ROOM(a.room)} · ` : ''}{KIND[a.kind]}{a.project ? ` · ${a.project}` : ''}{a.tmux ? ` · tmux ${a.tmux}` : ''} · {since(a.changedAt)}째</div>
      </div>
    </div>
  );
}

function clock(ms: number): string {
  return new Date(ms).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
}

// 왼쪽 칸 — 에이전트 목록 (하위 에이전트는 부모 아래로)
// 부서 상자 — 묶는 열쇠: 프로젝트 이름(그 부서), center(고객센터 + 상담원), general(공용실 + tmux 사람), foreign(다른 계정)
// 하위 에이전트는 부모의 상자 안, 부모 아래. 차례는 프로젝트 부서(이름 차례) → 고객센터 → 공용실 → 다른 계정
const KEY_COLLAPSED = 'kopricyberfossillab.groupsCollapsed';
const groupOf = (a: Agent): string => a.kind === 'foreign' ? (a.room.startsWith('@') ? a.room : 'foreign') : a.kind === 'desk' ? 'center' : a.kind === 'terminal' ? 'general' : a.room;
const GROUP_NAME = (g: string) => g === 'center' ? '고객센터' : g === 'general' ? '공용실' : g === 'foreign' ? '다른 계정' : g.startsWith('@') ? `${g.slice(1)} 계정 부서` : `${g} 부서`;
const GROUP_RANK = (g: string) => g === 'center' ? 1 : g === 'general' ? 2 : g === 'foreign' || g.startsWith('@') ? 3 : 0;
function nameHash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}
// 띠 색 — 프로젝트는 이름으로 PALETTE 에서, 나머지 셋은 정해 둔 것
const hex = (c: number) => '#' + c.toString(16).padStart(6, '0');
const GROUP_COLOR = (g: string) => g === 'center' ? 'var(--accent)' : g === 'general' ? 'var(--muted)' : g === 'foreign' || g.startsWith('@') ? hex(FOREIGN_COLOR) : hex(PALETTE[nameHash(g) % PALETTE.length]);

function loadCollapsed(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(KEY_COLLAPSED) ?? '[]') as string[]); } catch { return new Set(); }
}

export function AgentList({ snap, link, selected, onSelect }: {
  snap: Snapshot | null; link: Link; selected: string | null; onSelect: (id: string) => void;
}) {
  const agents = snap?.agents ?? [];
  const top = agents.filter((a) => !a.parentId || !agents.some((p) => p.id === a.parentId));
  const kids = (id: string) => agents.filter((a) => a.parentId === id);
  const waiting = agents.filter((a) => a.activity === 'wait').length;
  const [collapsed, setCollapsed] = useState<Set<string>>(loadCollapsed);
  const toggle = (g: string) => setCollapsed((c) => {
    const n = new Set(c);
    if (n.has(g)) n.delete(g); else n.add(g);
    try { localStorage.setItem(KEY_COLLAPSED, JSON.stringify([...n])); } catch { /* 저장이 막힌 브라우저 — 이번만 */ }
    return n;
  });
  const groups = new Map<string, Agent[]>();
  for (const a of top) {
    const g = groupOf(a);
    if (!groups.has(g)) groups.set(g, []);
    groups.get(g)!.push(a);
  }
  const order = [...groups.keys()].sort((x, y) => GROUP_RANK(x) - GROUP_RANK(y) || x.localeCompare(y));
  return (
    <aside className="side left">
      <h2>에이전트 {agents.length}<span className={link === 'lost' ? 'bad' : ''}>{LINK[link]}</span></h2>
      {waiting > 0 && <p className="alert">확인을 기다리는 세션 {waiting}</p>}
      <div className="list groups">
        {order.map((g) => {
          const heads = groups.get(g)!;
          const members = heads.flatMap((a) => [a, ...kids(a.id)]);
          const work = members.filter((a) => WORK.has(a.activity)).length;
          const wait = members.filter((a) => a.activity === 'wait').length;
          const shut = collapsed.has(g);
          return (
            <section key={g} className={`grp${wait ? ' has-wait' : ''}${shut ? ' shut' : ''}`} style={{ '--grp': GROUP_COLOR(g) } as CSSProperties}>
              <button type="button" className="grp-head" aria-expanded={!shut} onClick={() => toggle(g)}>
                <span className="grp-caret" aria-hidden="true">▾</span>
                <b>{GROUP_NAME(g)}</b>
                <span className="grp-n">{members.length}명</span>
                <span className="grp-sum">
                  {work > 0 && <span>일하는 중 {work}</span>}
                  {wait > 0 && <span className="w">확인 필요 {wait}</span>}
                  {!work && !wait && <span>쉬는 중</span>}
                </span>
              </button>
              {!shut && (
                <div className="grp-body">
                  {heads.map((a) => (
                    <div key={a.id}>
                      <Row a={a} all={agents} selected={selected === a.id} onSelect={onSelect} />
                      {kids(a.id).map((k) => <Row key={k.id} a={k} all={agents} selected={selected === k.id} onSelect={onSelect} />)}
                    </div>
                  ))}
                </div>
              )}
            </section>
          );
        })}
        {!agents.length && <p className="note">돌고 있는 세션이 없다.</p>}
      </div>
    </aside>
  );
}

// 오른쪽 칸 — 고른 에이전트, 터미널, 범례
export function SidePanel({ snap, selected, onSelect }: {
  snap: Snapshot | null; selected: string | null; onSelect: (id: string | null) => void;
}) {
  const agents = snap?.agents ?? [];
  const a = agents.find((x) => x.id === selected);
  const kids = a ? agents.filter((x) => x.parentId === a.id) : [];
  useSyncExternalStore(subscribeNames, namesVersion);
  return (
    <aside className="side right">
      <section className="sel-box">
        <h2>고른 에이전트{a && <button className="x" onClick={() => onSelect(null)} aria-label="고르기 풀기">×</button>}</h2>
        {a ? (
          <div className="detail">
            <div className="dhead">
              <Avatar a={a} color={colorOf(a, agents)} small={false} />
              <div><b>{personName(a)}</b><small className="sub">{subtitle(a)}</small><span className={a.activity === 'wait' ? 'pill wait' : WORK.has(a.activity) ? 'pill work' : 'pill'}>{STATE_TEXT[a.activity]}{a.guessed ? '?' : ''}</span></div>
            </div>
            <dl>
              <dt>지금</dt><dd className="mono">{a.label}</dd>
              <dt>종류</dt><dd>{KIND[a.kind]}{a.user ? ` · ${a.user}` : ''}</dd>
              {a.kind !== 'foreign' && <><dt>방</dt><dd>{ROOM(a.room)}</dd></>}
              {a.project && <><dt>{a.parentId ? '맡은 일' : '프로젝트'}</dt><dd>{a.project}</dd></>}
              {a.tmux && <><dt>tmux</dt><dd className="mono">{a.tmux}</dd></>}
              <dt>시작</dt><dd>{clock(a.startedAt)} · {since(a.startedAt)} 전</dd>
              <dt>이 활동</dt><dd>{since(a.changedAt)}째</dd>
              {kids.length > 0 && <><dt>하위</dt><dd>{kids.map((k) => `${personName(k)}(${k.name})`).join(', ')}</dd></>}
            </dl>
          </div>
        ) : <p className="empty">선택한 에이전트가 없습니다.</p>}
      </section>
      <section className="desk-box">
        <h2>상담원에게 묻기<span>고객센터</span></h2>
        <Desk />
      </section>
      <details className="more">
        <summary>터미널 {snap?.terminals.length ?? 0} · 보는 법</summary>
        <div className="terms">
          {(snap?.terminals ?? []).map((t) => (
            <div key={t.name} className="term">
              <i className={t.attached ? 'on' : ''} />
              <b>{t.name}</b>
              <span>{t.command && t.command !== 'bash' ? `$ ${t.command} · ` : ''}창 {t.windows}{t.attached ? ` · 붙음 ${t.attached}` : ''}{t.claude ? ' · claude' : ''}</span>
            </div>
          ))}
          {snap && !snap.terminals.length && <p className="note">tmux 세션이 없다.</p>}
        </div>
        <ul className="legend">
          <li><b>사무실</b> 프로젝트마다 — 크기는 커밋 수</li>
          <li><b>고객센터</b> 다른 세션이 보낸 지령(최근 말 8개 중 절반 이상) · 상담원</li>
          <li><b>공용실</b> 프로젝트를 모를 때 · 코어 보관대 = git · 현미경 = 시험</li>
          <li><b>자료실</b> 웹 검색</li>
          <li><b>휴게실</b> 쉬는 세션 — 잡담, 가끔 화장실·공룡 먹이</li>
          <li><b>빨간 링</b> 확인을 기다린다 · <b>주황 모자</b> tmux</li>
        </ul>
        <p className="hint2">휠 확대 · 끌어 옮기기 · 두 번 눌러 처음대로</p>
      </details>
    </aside>
  );
}
