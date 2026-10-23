// 상단바 — Claude 사용 한도(5시간·주간). 값은 세션이 응답할 때만 새로 오니 낡은 값은 흐리게 보인다.
import { useEffect, useState } from 'react';
import type { LimitWindow, Limits as LimitsData } from './types.ts';

const STALE_MS = 10 * 60_000;

function left(ms: number): string {
  if (ms <= 0) return '곧 리셋';
  const m = Math.round(ms / 60_000);
  if (m < 60) return `${m}분 뒤 리셋`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 ${m % 60}분 뒤 리셋`;
  return `${Math.floor(h / 24)}일 ${h % 24}시간 뒤 리셋`;
}

function Gauge({ name, w, now }: { name: string; w?: LimitWindow; now: number }) {
  if (!w) return <div className="limits-g none"><b>{name}</b><span>—</span></div>;
  const pct = Math.round(w.usedPct);
  const level = pct >= 90 ? 'hot' : pct >= 70 ? 'warm' : 'ok';
  return (
    <div className={`limits-g ${level}`} title={`${name} 한도 ${w.usedPct}% 사용`}>
      <b>{name}</b>
      <div className="limits-bar" role="meter" aria-label={`${name} 한도`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
        <i style={{ width: `${pct}%` }} />
      </div>
      <span className="limits-pct">{pct}%</span>
      <span className="limits-reset">{left(w.resetsAt - now)}</span>
    </div>
  );
}

export function Limits({ limits }: { limits?: LimitsData }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const h = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(h);
  }, []);
  if (!limits) return <div className="limits empty">한도 정보 없음</div>;
  const age = now - limits.seenAt;
  const stale = age > STALE_MS;
  return (
    <div className={`limits${stale ? ' stale' : ''}`}>
      <Gauge name="5시간" w={limits.fiveHour} now={now} />
      <Gauge name="주간" w={limits.sevenDay} now={now} />
      {stale && <span className="limits-age">{Math.round(age / 60_000)}분 전 값</span>}
    </div>
  );
}
