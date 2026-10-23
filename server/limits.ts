// Claude 사용 한도(5시간·주간). 원천은 statusLine 명령이 stdin 으로 받는 JSON 의 rate_limits 뿐이라
// deploy/statusline-tee.sh 가 그것을 파일로 남기고 여기서 읽는다. Pro/Max 만, 세션의 첫 응답 뒤에만 실린다.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { Limits, LimitWindow } from './model.ts';

export const LIMITS_FILE = process.env.FL_LIMITS_FILE ?? path.join(os.homedir(), '.cache', 'claude-status', 'latest.json');

interface RawWindow { used_percentage?: unknown; resets_at?: unknown }

function window(raw: RawWindow | undefined, now: number): LimitWindow | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const used = Number(raw.used_percentage);
  const resets = Number(raw.resets_at);
  if (!Number.isFinite(used) || !Number.isFinite(resets)) return undefined;
  const resetsAt = resets * 1000;
  if (resetsAt <= now) return undefined;   // 창이 이미 넘어갔다 — 남은 값은 옛것
  return { usedPct: Math.min(100, Math.max(0, used)), resetsAt };
}

export function parseLimits(text: string, seenAt: number, now = Date.now()): Limits | undefined {
  let j: { rate_limits?: { five_hour?: RawWindow; seven_day?: RawWindow } };
  try { j = JSON.parse(text); } catch { return undefined; }
  const rl = j?.rate_limits;
  if (!rl || typeof rl !== 'object') return undefined;
  const fiveHour = window(rl.five_hour, now);
  const sevenDay = window(rl.seven_day, now);
  if (!fiveHour && !sevenDay) return undefined;
  return { fiveHour, sevenDay, seenAt };
}

export function readLimits(now = Date.now(), file = LIMITS_FILE): Limits | undefined {
  try {
    const st = fs.statSync(file);
    return parseLimits(fs.readFileSync(file, 'utf8'), st.mtimeMs, now);
  } catch { return undefined; }
}
