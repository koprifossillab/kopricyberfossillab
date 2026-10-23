// 세션 기록(JSONL) 하나를 꼬리부터 읽어, 지금 열려 있는 도구 호출과 마지막 활동을 갖고 있는다.
// 매 폴링마다 늘어난 바이트만 읽는다. 처음 열 때는 끝의 TAIL_BYTES 만 본다.
import fs from 'node:fs';
import { classifyTool } from './classify.ts';
import type { Activity } from './model.ts';

const TAIL_BYTES = 512 * 1024;

export interface ToolCall {
  name: string;
  activity: Activity;
  label: string;
  at: number;
}

export class Transcript {
  readonly file: string;
  private offset = -1;
  private rest = '';
  pending = new Map<string, ToolCall>();   // tool_use id → 아직 결과가 없는 호출
  last: ToolCall | null = null;            // 마지막 도구 호출 (결과가 와도 남는다 — 래치가 쓴다)
  lastTextAt = 0;                          // 마지막으로 글(text·thinking)을 낸 때
  lastLineAt = 0;                          // 마지막 줄의 시각
  ended = false;                           // 마지막 assistant 가 end_turn 으로 끝났고 열린 호출이 없다
  permissionMode = '';
  title = '';
  mtime = 0;

  constructor(file: string) {
    this.file = file;
  }

  // 늘어난 만큼 읽는다. 파일이 사라졌으면 false.
  poll(): boolean {
    let st: fs.Stats;
    try { st = fs.statSync(this.file); } catch { return false; }
    this.mtime = st.mtimeMs;
    if (this.offset < 0) this.offset = Math.max(0, st.size - TAIL_BYTES);
    if (st.size < this.offset) { this.offset = 0; this.rest = ''; }   // 잘렸다 — 처음부터
    if (st.size === this.offset) return true;
    const fd = fs.openSync(this.file, 'r');
    try {
      const buf = Buffer.alloc(st.size - this.offset);
      fs.readSync(fd, buf, 0, buf.length, this.offset);
      const first = this.offset > 0 && this.rest === '' && this.lastLineAt === 0;
      this.offset = st.size;
      let text = this.rest + buf.toString('utf8');
      if (first) text = text.slice(text.indexOf('\n') + 1);   // 중간부터 읽었으면 잘린 첫 줄을 버린다
      const lines = text.split('\n');
      this.rest = lines.pop() ?? '';
      for (const line of lines) if (line) this.feed(line);
    } finally {
      fs.closeSync(fd);
    }
    return true;
  }

  feed(line: string): void {
    let d: any;
    try { d = JSON.parse(line); } catch { return; }
    const at = d.timestamp ? Date.parse(d.timestamp) : 0;
    if (at) this.lastLineAt = at;
    switch (d.type) {
      case 'permission-mode': this.permissionMode = d.permissionMode ?? ''; return;
      case 'ai-title': this.title = d.aiTitle ?? this.title; return;
      case 'agent-name': this.title = d.agentName ?? this.title; return;
      case 'assistant': this.onAssistant(d.message, at); return;
      case 'user': this.onUser(d.message); return;
    }
  }

  private onAssistant(m: any, at: number): void {
    const blocks = Array.isArray(m?.content) ? m.content : [];
    for (const b of blocks) {
      if (b?.type === 'tool_use') {
        const c = classifyTool(String(b.name), b.input);
        const call = { name: String(b.name), ...c, at };
        this.pending.set(String(b.id), call);
        this.last = call;
      } else if (b?.type === 'text' || b?.type === 'thinking') {
        this.lastTextAt = at;
      }
    }
    this.ended = m?.stop_reason === 'end_turn' && this.pending.size === 0;
  }

  private onUser(m: any): void {
    const blocks = Array.isArray(m?.content) ? m.content : [];
    let result = false;
    for (const b of blocks) {
      if (b?.type === 'tool_result') { this.pending.delete(String(b.tool_use_id)); result = true; }
    }
    if (!result) this.pending.clear();   // 사람이 새로 말했다 — 앞의 열린 호출은 끊긴 것
    this.ended = false;
  }

  // 가장 최근에 열린 호출
  open(): ToolCall | null {
    let best: ToolCall | null = null;
    for (const c of this.pending.values()) if (!best || c.at >= best.at) best = c;
    return best;
  }
}
