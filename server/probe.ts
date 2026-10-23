// 화면 없이 지금 판정을 콘솔에 찍는다: npm run probe (계속 보려면 -- --watch)
import { Office } from './office.ts';

const office = new Office('probe');
const NAMES: Record<string, string> = {
  code: '코딩 중', read: '탐색 중', search: '자료 검색', run: '실행 중', think: '생각 중', git: 'GitHub 작업',
  test: '시험 중', spawn: '하위 작업', wait: '확인 필요', idle: '휴식',
};

function print(): void {
  const s = office.snapshot();
  console.log(`— ${new Date(s.at).toLocaleTimeString()} · ${s.agents.length}명 · 터미널 ${s.terminals.length}`);
  for (const a of s.agents) {
    const indent = a.parentId ? '    └ ' : '  ';
    console.log(`${indent}[${a.kind}] ${a.name} (${a.project}) [${a.room}] → ${NAMES[a.activity]}${a.guessed ? '?' : ''} · ${a.label}`);
  }
  for (const t of s.terminals) console.log(`  tmux ${t.name} 창 ${t.windows} 붙음 ${t.attached}${t.claude ? ' · claude' : ''}`);
}

print();
if (process.argv.includes('--watch')) setInterval(print, 2000);
