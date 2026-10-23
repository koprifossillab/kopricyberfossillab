// 설정 — 우측 상단 톱니바퀴. 판 이력(CHANGELOG), 화면 테마, 상담원 열쇠
import { useEffect, useState } from 'react';

const KEY_THEME = 'kopricyberfossillab.theme';
type Theme = 'auto' | 'light' | 'dark';

export function applyTheme(t: Theme): void {
  if (t === 'auto') delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = t;
}
export function savedTheme(): Theme {
  try { return (localStorage.getItem(KEY_THEME) as Theme) || 'auto'; } catch { return 'auto'; }
}

interface Release { version: string; date: string; items: string[] }

// CHANGELOG.md 의 「## 0.4.4 — 2026-10-23」 와 그 아래 「- …」 줄
function parse(md: string): Release[] {
  const out: Release[] = [];
  for (const line of md.split('\n')) {
    const h = line.match(/^##\s+(\S+)\s*[—-]\s*(.+)$/);
    if (h) { out.push({ version: h[1], date: h[2].trim(), items: [] }); continue; }
    const li = line.match(/^-\s+(.*)$/);
    if (li && out.length) out[out.length - 1].items.push(li[1]);
    else if (/^\s{2,}\S/.test(line) && out.length && out[out.length - 1].items.length) {
      const it = out[out.length - 1].items; it[it.length - 1] += ' ' + line.trim();
    }
  }
  return out;
}

// `코드` 만 살린다 — 나머지는 글 그대로
function Inline({ text }: { text: string }) {
  return <>{text.split(/(`[^`]+`)/).map((p, i) => p.startsWith('`') ? <code key={i}>{p.slice(1, -1)}</code> : p)}</>;
}

export function Settings({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<'releases' | 'view' | 'desk'>('releases');
  const [rel, setRel] = useState<Release[] | null>(null);
  const [theme, setTheme] = useState<Theme>(savedTheme());
  const [keyGone, setKeyGone] = useState(false);

  useEffect(() => {
    fetch('api/changelog').then((r) => (r.ok ? r.text() : Promise.reject())).then((t) => setRel(parse(t))).catch(() => setRel([]));
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [onClose]);

  const pickTheme = (t: Theme) => {
    setTheme(t); applyTheme(t);
    try { localStorage.setItem(KEY_THEME, t); } catch { /* 저장이 막혀도 지금 화면엔 적용 */ }
  };

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" role="dialog" aria-modal="true" aria-label="설정" onClick={(e) => e.stopPropagation()}>
        <header>
          <h2>설정</h2>
          <nav>
            <button className={tab === 'releases' ? 'on' : ''} onClick={() => setTab('releases')}>판 이력</button>
            <button className={tab === 'view' ? 'on' : ''} onClick={() => setTab('view')}>화면</button>
            <button className={tab === 'desk' ? 'on' : ''} onClick={() => setTab('desk')}>상담원</button>
          </nav>
          <button className="x" onClick={onClose} aria-label="닫기">×</button>
        </header>
        <div className="modal-body">
          {tab === 'releases' && (
            rel === null ? <p className="note">불러오는 중…</p>
              : !rel.length ? <p className="note">판 이력을 불러오지 못했다.</p>
                : rel.map((r, i) => (
                  <section key={r.version} className="rel">
                    <h3>v{r.version}{i === 0 && <span className="now">지금</span>}<small>{r.date}</small></h3>
                    <ul>{r.items.map((it, k) => <li key={k}><Inline text={it} /></li>)}</ul>
                  </section>
                ))
          )}
          {tab === 'view' && (
            <div className="opts">
              <p className="note">테마 — 짙은 남색 바탕. 밝게는 같은 남색을 조금 밝게.</p>
              {(['auto', 'dark', 'light'] as Theme[]).map((t) => (
                <label key={t}><input type="radio" name="theme" checked={theme === t} onChange={() => pickTheme(t)} />{{ auto: '시스템 따라', dark: '어둡게', light: '밝게' }[t]}</label>
              ))}
            </div>
          )}
          {tab === 'desk' && (
            <div className="opts">
              <p className="note">상담원은 도구 없이 이 화면의 상태 요약만 보고 답한다. 질문 500자, 한 번에 하나, 1분에 4번. 열쇠는 서버의 <code>~/.config/kopricyberfossillab/ask-token</code>.</p>
              <button onClick={() => { try { localStorage.removeItem('kopricyberfossillab.askToken'); localStorage.removeItem('kopricyberfossillab.askLog'); } catch { /* */ } setKeyGone(true); }}>
                이 브라우저의 열쇠와 대화 지우기
              </button>
              {keyGone && <p className="note">지웠다 — 새로고침하면 열쇠를 다시 묻는다.</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
