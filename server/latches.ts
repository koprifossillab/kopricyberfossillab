// Claw3D(src/lib/office/eventTriggers.ts)의 2단계 생각을 옮긴 것 — 코드는 옮기지 않았다.
// ① 새 이벤트는 짧은 래치를 건다 ② 지금 상태로 홀드를 다시 만든다. 화면은 결과만 받는다.
// 래치가 있어서 이벤트가 잠깐 끊겨도 캐릭터가 자리를 오가며 깜빡이지 않는다.
import type { Activity } from './model.ts';
import type { Transcript } from './transcript.ts';

export const LATCH_TOOL_MS = 5000;     // 도구 호출 뒤 그 활동을 붙잡아 두는 시간 (Claw3D: 작업 중 5초)
export const LATCH_TEXT_MS = 6000;     // 글을 낸 뒤 think 를 붙잡아 두는 시간 (Claw3D: 스트리밍 6초)
export const PERMISSION_GUESS_MS = 7000; // 열린 호출이 이만큼 조용하면 확인 대기로 추정 (pixel-agents 와 같은 값)

// 확인을 묻지 않는 모드 — 여기서는 시간으로 wait 를 추정하지 않는다
const NO_ASK = new Set(['bypassPermissions', 'auto', 'dontAsk']);
// 오래 걸려도 확인 대기가 아닌 도구
const NO_GUESS = new Set(['Agent', 'Task', 'Workflow', 'Monitor', 'ScheduleWakeup']);

export type Busy = 'busy' | 'idle' | 'blocked';

export function resolve(busy: Busy, t: Transcript | null, now: number):
  { activity: Activity; label: string; guessed?: boolean } {
  if (busy === 'blocked') return { activity: 'wait', label: t?.last?.label ?? '사용자에게 묻는 중' };
  const open = t?.open() ?? null;
  if (open) {
    if (open.activity === 'wait') return { activity: 'wait', label: open.label };
    const quiet = now - Math.max(open.at, t!.lastLineAt);
    if (quiet > PERMISSION_GUESS_MS && !NO_ASK.has(t!.permissionMode) && !NO_GUESS.has(open.name)) {
      return { activity: 'wait', label: `권한 요청? · ${open.label}`, guessed: true };
    }
    return { activity: open.activity, label: open.label };
  }
  if (t?.last && now - t.last.at < LATCH_TOOL_MS) return { activity: t.last.activity, label: t.last.label };
  if (busy === 'busy') return { activity: 'think', label: '생각 중' };
  if (t && now - t.lastTextAt < LATCH_TEXT_MS && !t.ended) return { activity: 'think', label: '글 쓰는 중' };
  return { activity: 'idle', label: '응답 완료 · 다음 지시 대기' };
}
