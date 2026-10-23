// 상담원 대화창 — 고객센터 상담원(도구 없는 claude)에게 간단한 것을 묻는다. 본인만: 처음 한 번 열쇠를 넣는다.
// 대화는 이 브라우저에만 남는다(localStorage). 화면의 상담원 캐릭터에는 「답하는 중…」 만 보인다.
import { useEffect, useRef, useState } from 'react';

const KEY_TOKEN = 'kopricyberfossillab.askToken';
const KEY_LOG = 'kopricyberfossillab.askLog';
const MAX = 500;

interface Msg { who: 'me' | 'desk' | 'err'; text: string; at: number }

const load = <T,>(k: string, d: T): T => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) as T : d; } catch { return d; } };
const save = (k: string, v: unknown) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* 저장이 막힌 브라우저 — 그래도 쓴다 */ } };

export function Desk() {
  const [token, setToken] = useState<string>(() => load(KEY_TOKEN, ''));
  const [ok, setOk] = useState<boolean | null>(null);
  const [draft, setDraft] = useState('');
  const [log, setLog] = useState<Msg[]>(() => load(KEY_LOG, []));
  const [busy, setBusy] = useState(false);
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => { save(KEY_LOG, log.slice(-40)); end.current?.scrollIntoView({ block: 'end' }); }, [log]);
  useEffect(() => {
    if (!token) { setOk(false); return; }
    fetch('api/ask/check', { headers: { 'x-fl-token': token } }).then((r) => setOk(r.ok)).catch(() => setOk(null));
  }, [token]);

  if (ok === false) {
    return (
      <form className="desk-key" onSubmit={(e) => { e.preventDefault(); const v = new FormData(e.currentTarget).get('k'); save(KEY_TOKEN, String(v ?? '').trim()); setToken(String(v ?? '').trim()); }}>
        <p className="note">상담원은 본인만 쓴다. 서버의 <code>~/.config/kopricyberfossillab/ask-token</code> 에 있는 열쇠를 한 번 넣으면 이 브라우저에서 계속 쓴다.{token && ' (넣은 열쇠가 맞지 않다)'}</p>
        <input name="k" type="password" placeholder="열쇠" autoComplete="off" />
        <button>넣기</button>
      </form>
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

  return (
    <div className="desk">
      <div className="desk-log">
        {!log.length && <p className="note">이 서버의 세션 상황 같은 간단한 것을 물어보세요. 상담원은 도구가 없어 코드를 짜거나 파일을 만지지 못합니다.</p>}
        {log.map((m, i) => <div key={i} className={`msg ${m.who}`}>{m.text}</div>)}
        {busy && <div className="msg desk wait">답하는 중…</div>}
        <div ref={end} />
      </div>
      <form className="desk-in" onSubmit={(e) => { e.preventDefault(); send(); }}>
        <textarea value={draft} maxLength={MAX} rows={2} placeholder="상담원에게 묻기 (Enter 보내기, Shift+Enter 줄바꿈)"
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); send(); } }} />
        <div className="desk-bar">
          <span>{draft.length}/{MAX}</span>
          {log.length > 0 && <button type="button" className="link" onClick={() => setLog([])}>지우기</button>}
          <button disabled={busy || !draft.trim()}>보내기</button>
        </div>
      </form>
    </div>
  );
}
