// 오른쪽 목록 — 에이전트(하위 에이전트는 부모 아래로)와 터미널
import { useEffect, useRef } from 'react';
import type { Agent, Snapshot } from './types.ts';
import { loadAtlas, headKey, bodyKey } from './iso/atlas.ts';
import { appearanceOf } from './scene/appearance.ts';
import { STATE_TEXT } from './scene/layout.ts';
import { colorOf } from './scene/director.ts';
import type { Link } from './useOffice.ts';

const KIND: Record<Agent['kind'], string> = { session: '터미널', job: '백그라운드', subagent: '하위', foreign: '다른 계정', terminal: 'tmux' };
const WORK = new Set(['code', 'read', 'search', 'run', 'think', 'spawn', 'git', 'test']);
const ROOM = (r: string) => (r === 'center' ? '고객센터' : r === 'general' ? '공용실' : r);
const FACE_DIR = 1;   // 머리 조각의 방향 — 카메라 쪽(+x+z)을 본다

// 목록의 얼굴 — 그 캐릭터의 머리·몸 조각을 그대로 (둥근 바탕은 몸 색)
function Avatar({ a, color, small }: { a: Agent; color: number; small: boolean }) {
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
      // 머리 가운데를 원 가운데보다 조금 위에, 머리 지름이 원의 3/4 쯤
      const s = (c.width * 0.75) / Math.max(head.w, head.h);
      const cx = c.width / 2, cy = c.height * 0.44;
      if (body) {
        // 몸은 머리 기준점에서 HEAD_Y 아래 — 구운 픽셀로 머리 기준점 → 발 차이는 body.oy·head.oy 로 대신 맞춘다
        const by = cy + (head.h * 0.5 + 4) * s;
        ctx.drawImage(sheets[body.sheet], body.sx, body.sy, body.w, body.h, cx - (body.w * s) / 2, by, body.w * s, body.h * s);
      }
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

function Row({ a, all, selected, onSelect }: { a: Agent; all: Agent[]; selected: boolean; onSelect: (id: string) => void }) {
  const pill = a.activity === 'wait' ? 'pill wait' : WORK.has(a.activity) ? 'pill work' : 'pill';
  return (
    <button className={'row' + (a.parentId ? ' sub' : '') + (selected ? ' sel' : '')} onClick={() => onSelect(a.id)}>
      <Avatar a={a} color={colorOf(a, all)} small={!!a.parentId} />
      <div className="txt">
        <div className="who">
          <b title={a.name}>{a.name}</b>
          <span className={pill}>{STATE_TEXT[a.activity]}{a.guessed ? '?' : ''}</span>
        </div>
        <div className="tool" title={a.label}>{a.label}</div>
        <div className="meta">{a.kind !== 'foreign' && !a.parentId ? `${ROOM(a.room)} · ` : ''}{KIND[a.kind]}{a.project ? ` · ${a.project}` : ''}{a.tmux ? ` · tmux ${a.tmux}` : ''} · {since(a.changedAt)}째</div>
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
      <p className="note">사무실 = 프로젝트마다 · 고객센터 = 다른 세션이 보낸 지령(최근 말 8개 중 절반 이상) · 공용실 = 프로젝트를 모를 때 · 자료실 = 웹 검색 · 휴게실 = 쉬는 세션(가끔 화장실). 책상 옆 빨간 링 = 확인 필요 · 코어 보관대 = git·gh · 현미경 = 시험 · 주황 모자 = tmux</p>
    </aside>
  );
}
