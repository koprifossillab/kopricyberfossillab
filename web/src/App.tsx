import { useState } from 'react';
import { Stage } from './iso/Stage.tsx';
import { AgentList, SidePanel } from './Panel.tsx';
import { Limits } from './Limits.tsx';
import { useOffice } from './useOffice.ts';

// 화면 폭을 다 쓴다 — 위 한 줄(제목·한도), 가운데 연구실, 왼쪽 에이전트 목록, 오른쪽 고른 에이전트·터미널·보는 법
export function App() {
  const { snap, link } = useOffice();
  const [selected, setSelected] = useState<string | null>(null);
  return (
    <div className="app">
      <header className="top">
        <h1>KOPRI Cyber Fossil Lab</h1>
        <span className="host">{snap?.host ?? 'paleo-server'} · v{__VERSION__}</span>
        <Limits limits={snap?.limits} />
      </header>
      <div className="cols">
        <AgentList snap={snap} link={link} selected={selected} onSelect={setSelected} />
        <main className="view">
          <Stage agents={snap?.agents ?? []} terminals={snap?.terminals ?? []} offices={snap?.offices ?? []} selected={selected} onSelect={setSelected} />
        </main>
        <SidePanel snap={snap} selected={selected} onSelect={setSelected} />
      </div>
    </div>
  );
}
