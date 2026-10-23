// 도구 호출 하나 → 활동 + 화면에 띄울 한 줄.
// 한 줄에는 파일 이름·명령 설명만 담는다. 명령 전체·대화 본문은 화면으로 보내지 않는다.
import path from 'node:path';
import type { Activity } from './model.ts';

const CODE = new Set(['Edit', 'Write', 'NotebookEdit', 'MultiEdit']);
const READ = new Set(['Read', 'Grep', 'Glob', 'ToolSearch', 'LS']);
const SEARCH = new Set(['WebSearch', 'WebFetch']);   // 바깥 자료 검색 — 자료실에 다녀온다
const SPAWN = new Set(['Agent', 'Task', 'Workflow']);
const ASK = new Set(['AskUserQuestion', 'ExitPlanMode']);

const GIT = /^(?:cd\s+\S+\s*(?:&&|;)\s*)?(?:git|gh)\b/;
const TEST = /\b(?:pytest|npm (?:run )?test|node --test|vitest|jest|manage\.py test|go test|cargo test|playwright)\b/;

type Input = Record<string, unknown> | undefined;

function str(v: unknown): string {
  return typeof v === 'string' ? v : '';
}

function clip(s: string, n = 48): string {
  const one = s.replace(/\s+/g, ' ').trim();
  return one.length > n ? one.slice(0, n - 1) + '…' : one;
}

export function classifyTool(name: string, input: Input): { activity: Activity; label: string } {
  if (CODE.has(name)) {
    return { activity: 'code', label: `${name} · ${path.basename(str(input?.file_path) || str(input?.notebook_path))}` };
  }
  if (SEARCH.has(name)) {
    if (name === 'WebFetch') {
      let host = '';
      try { host = new URL(str(input?.url)).host; } catch { /* 주소가 아니면 이름만 */ }
      return { activity: 'search', label: `WebFetch · ${host}` };
    }
    return { activity: 'search', label: `WebSearch · ${clip(str(input?.query), 32)}` };
  }
  if (READ.has(name)) {
    const target = str(input?.file_path) ? path.basename(str(input?.file_path))
      : str(input?.pattern) || str(input?.query);
    return { activity: 'read', label: `${name} · ${clip(target, 32)}` };
  }
  if (SPAWN.has(name)) {
    return { activity: 'spawn', label: `${name} · ${clip(str(input?.description) || str(input?.subagent_type))}` };
  }
  if (ASK.has(name)) {
    return { activity: 'wait', label: `${name}` };
  }
  if (name === 'Bash') {
    const cmd = str(input?.command).trim();
    // 설명(description)이 있으면 그것을, 없으면 명령의 앞 두 낱말만
    const label = `Bash · ${clip(str(input?.description) || cmd.split(/\s+/).slice(0, 2).join(' '))}`;
    if (TEST.test(cmd)) return { activity: 'test', label };
    if (GIT.test(cmd)) return { activity: 'git', label };
    return { activity: 'run', label };
  }
  return { activity: 'run', label: name.startsWith('mcp__') ? name.split('__').slice(1).join(' · ') : name };
}
