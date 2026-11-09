import { useEffect, useState } from 'react';
import { Stage } from './iso/Stage.tsx';
import { AgentList, SidePanel } from './Panel.tsx';
import { Limits } from './Limits.tsx';
import { useOffice } from './useOffice.ts';
import { Settings, applyTheme, savedTheme, savedFocus, saveFocus } from './Settings.tsx';

applyTheme(savedTheme());

// 화면 폭을 다 쓴다 — 위 한 줄(제목·한도), 가운데 연구실, 왼쪽 에이전트 목록, 오른쪽 고른 에이전트·터미널·보는 법
// 연구실만 보기(focus) — 위 줄과 양쪽 칸을 숨기고 연구실만 화면 가득. Esc 로 돌아온다 (wetherilli 030)
export function App() {
  const { snap, link } = useOffice();
  const [selected, setSelected] = useState<string | null>(null);
  const [settings, setSettings] = useState(false);
  const [focus, setFocusState] = useState(savedFocus());
  const [tip, setTip] = useState(focus);
  const setFocus = (on: boolean) => { setFocusState(on); saveFocus(on); setTip(on); };

  useEffect(() => {
    if (!focus) return;
    // 설정·생김새 창이 떠 있으면 그 창의 Esc 가 먼저 — 창이 없을 때만 돌아온다
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape' && !document.querySelector('.modal-bg')) setFocus(false); };
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [focus]);
  useEffect(() => {
    if (!tip) return;
    const t = setTimeout(() => setTip(false), 3500);
    return () => clearTimeout(t);
  }, [tip]);

  return (
    <div className={focus ? 'app focus' : 'app'}>
      {!focus && (
        <header className="top">
          <h1><img src="./icons/icon-96.png" alt="" width="28" height="28" />KOPRI Cyber Fossil Lab</h1>
          <span className="host">{snap?.host ?? 'paleo-server'} · v{__VERSION__}</span>
          <Limits limits={snap?.limits} />
          <button className="gear" onClick={() => setSettings(true)} aria-label="설정" title="설정 · 판 이력">⚙</button>
        </header>
      )}
      <div className="cols">
        {!focus && <AgentList snap={snap} link={link} selected={selected} onSelect={setSelected} />}
        <main className="view">
          <Stage agents={snap?.agents ?? []} offices={snap?.offices ?? []} selected={selected} onSelect={setSelected} />
          {focus && <p className={tip ? 'focus-tip' : 'focus-tip gone'}>Esc — 목록·위 줄로 돌아오기</p>}
        </main>
        {!focus && <SidePanel snap={snap} selected={selected} onSelect={setSelected} />}
      </div>
      {settings && <Settings onClose={() => setSettings(false)} onFocus={() => { setSettings(false); setFocus(true); }} />}
    </div>
  );
}
