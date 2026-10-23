import { useState } from 'react';
import { Stage } from './iso/Stage.tsx';
import { Panel } from './Panel.tsx';
import { useOffice } from './useOffice.ts';

export function App() {
  const { snap, link } = useOffice();
  const [selected, setSelected] = useState<string | null>(null);
  return (
    <div className="wrap">
      <header>
        <h1>KOPRI Cyber Fossil Lab</h1>
        <p className="lede">{snap?.host ?? 'paleo-server'} 에서 도는 Claude Code 세션·하위 에이전트·터미널. 사람이 시킨 일은 사무실에서, 다른 세션이 보낸 지령은 고객센터에서 처리하고, 쉬는 세션은 휴게실로 간다. 확인을 기다리는 세션은 책상 옆에 서서 빨간 링을 띄운다.</p>
      </header>
      <div className="main">
        <div className="view">
          <Stage agents={snap?.agents ?? []} terminals={snap?.terminals ?? []} selected={selected} onSelect={setSelected} />
          <div className="hint">휠 확대 · 끌어 옮기기 · 두 번 눌러 처음대로 · 캐릭터를 누르면 목록에서 짚는다</div>
        </div>
        <Panel snap={snap} link={link} selected={selected} onSelect={setSelected} />
      </div>
      <footer>kopricyberfossillab v{__VERSION__} · 극지연구소(KOPRI)</footer>
    </div>
  );
}
