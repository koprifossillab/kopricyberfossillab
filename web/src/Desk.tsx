// 상담원 대화창 — 고객센터 상담원(도구 없는 claude)에게 간단한 것을 묻는다. 본인만: 처음 한 번 열쇠를 넣는다.
// 대화는 이 브라우저에만 남는다(localStorage). 화면의 상담원 캐릭터에는 「답하는 중…」 만 보인다.
// 꼴은 메신저 — 머리(얼굴·이름·온라인), 말풍선(상담원 왼쪽·나 오른쪽, 아래 시각), 날짜 줄, 입력 중 「···」, 알약 입력란.
import { useEffect, useRef, useState } from 'react';
import type { Agent } from './types.ts';
import { Avatar } from './Panel.tsx';
import { personName } from './scene/names.ts';
import { colorOf } from './scene/director.ts';
import './desk.css';

const KEY_TOKEN = 'kopricyberfossillab.askToken';
const KEY_LOG = 'kopricyberfossillab.askLog';
const MAX = 500;

interface Msg { who: 'me' | 'desk' | 'err'; text: string; at: number }

// 화면의 상담원 캐릭터와 같은 사람 — 얼굴·이름·색은 id 로 정해진다(server/office.ts 의 desk/상담원)
const DESK: Agent = {
  id: 'desk/상담원', kind: 'desk', name: '상담원', project: '고객센터', room: 'center',
  activity: 'idle', label: '', startedAt: 0, changedAt: 0,
};
const DESK_NAME = personName(DESK);
const DESK_COLOR = colorOf(DESK, [DESK]);

const load = <T,>(k: string, d: T): T => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) as T : d; } catch { return d; } };
const save = (k: string, v: unknown) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* 저장이 막힌 브라우저 — 그래도 쓴다 */ } };

const time = (ms: number) => new Date(ms).toLocaleTimeString('ko-KR', { hour: 'numeric', minute: '2-digit' });
const day = (ms: number) => new Date(ms).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' });
const sameDay = (a: number, b: number) => new Date(a).toDateString() === new Date(b).toDateString();
const sameMinute = (a: number, b: number) => Math.floor(a / 60_000) === Math.floor(b / 60_000);

function Head({ status, onClear }: { status: string; onClear?: () => void }) {
  return (
    <div className="dk-head">
      <Avatar a={DESK} color={DESK_COLOR} small={false} />
      <div className="dk-who">
        <b>{DESK_NAME}</b>
        <span className={status === '온라인' ? 'on' : status === '답하는 중…' ? 'typing' : ''}>{status}</span>
      </div>
      {onClear && <button type="button" className="dk-clear" onClick={onClear} title="대화 지우기">지우기</button>}
    </div>
  );
}

function SendIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path d="M3.4 20.4 21 12 3.4 3.6l.02 6.53L15 12 3.42 13.87z" fill="currentColor" />
    </svg>
  );
}

export function Desk() {
  const [token, setToken] = useState<string>(() => load(KEY_TOKEN, ''));
  const [ok, setOk] = useState<boolean | null>(null);
  const [draft, setDraft] = useState('');
  const [log, setLog] = useState<Msg[]>(() => load(KEY_LOG, []));
  const [busy, setBusy] = useState(false);
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => { save(KEY_LOG, log.slice(-40)); end.current?.scrollIntoView({ block: 'end' }); }, [log, busy]);
  useEffect(() => {
    if (!token) { setOk(false); return; }
    fetch('api/ask/check', { headers: { 'x-fl-token': token } }).then((r) => setOk(r.ok)).catch(() => setOk(null));
  }, [token]);

  if (ok === false) {
    return (
      <div className="desk dk">
        <Head status="로그인 필요" />
        <form className="dk-login" onSubmit={(e) => { e.preventDefault(); const v = String(new FormData(e.currentTarget).get('k') ?? '').trim(); save(KEY_TOKEN, v); setToken(v); }}>
          <p>상담원과 대화하려면 열쇠가 필요합니다. 본인만 쓸 수 있어요.</p>
          <p className="dk-hint">서버의 <code>~/.config/kopricyberfossillab/ask-token</code> 에 있는 열쇠를 한 번 넣으면 이 브라우저에서 계속 씁니다.</p>
          {token && <p className="dk-bad">넣은 열쇠가 맞지 않습니다.</p>}
          <div className="dk-pill">
            <input name="k" type="password" placeholder="열쇠" autoComplete="off" aria-label="열쇠" />
            <button className="dk-send" aria-label="로그인"><SendIcon /></button>
          </div>
        </form>
      </div>
    );
  }

  const send = async () => {
    const q = draft.trim();
    if (!q || busy) return;
    const history = [];
    for (let i = 0; i < log.length - 1; i++) if (log[i].who === 'me' && log[i + 1].who === 'desk') history.push({ q: log[i].text, a: log[i + 1].text });
    setLog((l) => [...l, { who: 'me', text: q, at: Date.now() }]);
    setDraft('');
    setBusy(true);
    try {
      const r = await fetch('api/ask', {
        method: 'POST', headers: { 'content-type': 'application/json', 'x-fl-token': token },
        body: JSON.stringify({ question: q, history: history.slice(-3) }),
      });
      const d = await r.json().catch(() => ({ error: `응답 ${r.status}` }));
      if (r.status === 401) { setOk(false); return; }
      setLog((l) => [...l, r.ok ? { who: 'desk', text: d.answer, at: Date.now() } : { who: 'err', text: d.error ?? `응답 ${r.status}`, at: Date.now() }]);
    } catch {
      setLog((l) => [...l, { who: 'err', text: '서버에 닿지 못했다', at: Date.now() }]);
    } finally {
      setBusy(false);
    }
  };

  const status = ok === null ? '연결 확인 중…' : busy ? '답하는 중…' : '온라인';
  return (
    <div className="desk dk">
      <Head status={status} onClear={log.length ? () => setLog([]) : undefined} />
      <div className="dk-log" aria-live="polite">
        {!log.length && <p className="dk-sys">이 서버의 세션 상황 같은 간단한 것을 물어보세요. 상담원은 도구가 없어 코드를 짜거나 파일을 만지지 못합니다.</p>}
        {log.map((m, i) => {
          const prev = log[i - 1], next = log[i + 1];
          const dateLine = !prev || !sameDay(prev.at, m.at);
          if (m.who === 'err') {
            return <div key={i}>{dateLine && <div className="dk-date"><span>{day(m.at)}</span></div>}<p className="dk-err">{m.text}</p></div>;
          }
          // 줄 클래스는 by-* — styles.css 의 .desk(세로 쌓기)에 걸리지 않게
          // 같은 사람이 이어 말하면 얼굴은 첫 것에만, 시각은 같은 분의 마지막 것에만
          const first = dateLine || !prev || prev.who !== m.who;
          const last = !next || next.who !== m.who || !sameMinute(next.at, m.at) || !sameDay(next.at, m.at);
          return (
            <div key={i}>
              {dateLine && <div className="dk-date"><span>{day(m.at)}</span></div>}
              <div className={`dk-row by-${m.who}${first ? ' first' : ''}`}>
                {m.who === 'desk' && (first ? <Avatar a={DESK} color={DESK_COLOR} small /> : <span className="dk-gap" />)}
                <div className="dk-col">
                  {m.who === 'desk' && first && <span className="dk-name">{DESK_NAME}</span>}
                  <div className="dk-bubble">{m.text}</div>
                  {last && <time className="dk-time" dateTime={new Date(m.at).toISOString()}>{time(m.at)}</time>}
                </div>
              </div>
            </div>
          );
        })}
        {busy && (
          <div className={`dk-row by-desk${log[log.length - 1]?.who === 'desk' ? '' : ' first'}`}>
            <Avatar a={DESK} color={DESK_COLOR} small />
            <div className="dk-col"><div className="dk-bubble dk-typing" aria-label="답하는 중"><i /><i /><i /></div></div>
          </div>
        )}
        <div ref={end} />
      </div>
      <form className="dk-in" onSubmit={(e) => { e.preventDefault(); send(); }}>
        <div className="dk-pill">
          <textarea value={draft} maxLength={MAX} rows={1} placeholder="메시지 보내기" aria-label="상담원에게 묻기 (Enter 보내기, Shift+Enter 줄바꿈)"
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); send(); } }} />
          <button className="dk-send" disabled={busy || !draft.trim()} aria-label="보내기"><SendIcon /></button>
        </div>
        <span className="dk-count" title="Enter 보내기 · Shift+Enter 줄바꿈">{draft.length}/{MAX}</span>
      </form>
    </div>
  );
}
