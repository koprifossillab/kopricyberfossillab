// 낮밤 — 실제 시각에서 0(한밤)…1(한낮)을 이어지게. 해는 6시·18시 앞뒤 한 시간에 걸쳐 뜨고 진다(계절은 무시).
// 화면 확인용으로 주소에 ?hour=21.5 를 붙이면 그 시각으로 본다.
const smooth = (a: number, b: number, x: number) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

export function hourNow(date = new Date()): number {
  const q = typeof location !== 'undefined' ? new URLSearchParams(location.search).get('hour') : null;
  if (q !== null && !Number.isNaN(Number(q))) return ((Number(q) % 24) + 24) % 24;
  return date.getHours() + date.getMinutes() / 60 + date.getSeconds() / 3600;
}

export function daylight(hour: number): number {
  return smooth(5, 7, hour) * (1 - smooth(17, 19, hour));
}
