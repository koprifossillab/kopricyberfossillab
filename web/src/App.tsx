import { useState } from 'react';
import { Stage } from './iso/Stage.tsx';
import { AgentList, SidePanel } from './Panel.tsx';
import { Limits } from './Limits.tsx';
import { useOffice } from './useOffice.ts';
import { Settings, applyTheme, savedTheme } from './Settings.tsx';

applyTheme(savedTheme());

// 화면 폭을 다 쓴다 — 위 한 줄(제목·한도), 가운데 연구실, 왼쪽 에이전트 목록, 오른쪽 고른 에이전트·터미널·보는 법
export function App() {
  const { snap, link } = useOffice();
  const [selected, setSelected] = useState<string | null>(null);
  const [settings, setSettings] = useState(false);
  return (
    <div className="app">
      <header className="top">
        <h1><img src="./icons/icon-96.png" alt="" width="28" height="28" />KOPRI Cyber Fossil Lab</h1>
        <span className="host">{snap?.host ?? 'paleo-server'} · v{__VERSION__}</span>
        <Limits limits={snap?.limits} />
        <button className="gear" onClick={() => setSettings(true)} aria-label="설정" title="설정 · 판 이력">⚙</button>
      </header>
      <div className="cols">
        <AgentList snap={snap} link={link} selected={selected} onSelect={setSelected} />
        <main className="view">
          <Stage agents={snap?.agents ?? []} offices={snap?.offices ?? []} selected={selected} onSelect={setSelected} />
        </main>
        <SidePanel snap={snap} selected={selected} onSelect={setSelected} />
      </div>
      {settings && <Settings onClose={() => setSettings(false)} />}
    </div>
  );
}
