import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { parseLimits, readLimits } from './limits.ts';

// 지은 값 — 실제 statusline 파일은 싣지 않는다
const now = Date.parse('2026-10-23T12:00:00Z');
const sec = (ms: number) => Math.floor(ms / 1000);
const sample = {
  model: { display_name: 'Opus' },
  rate_limits: {
    five_hour: { used_percentage: 42.5, resets_at: sec(now + 2 * 3600_000) },
    seven_day: { used_percentage: 81, resets_at: sec(now + 3 * 86400_000) },
  },
};

test('두 창을 읽는다', () => {
  const l = parseLimits(JSON.stringify(sample), now - 1000, now);
  assert.equal(l?.fiveHour?.usedPct, 42.5);
  assert.equal(l?.fiveHour?.resetsAt, sec(now + 2 * 3600_000) * 1000);
  assert.equal(l?.sevenDay?.usedPct, 81);
  assert.equal(l?.seenAt, now - 1000);
});

test('리셋이 지난 창은 뺀다', () => {
  const j = structuredClone(sample);
  j.rate_limits.five_hour.resets_at = sec(now - 60_000);
  const l = parseLimits(JSON.stringify(j), now, now);
  assert.equal(l?.fiveHour, undefined);
  assert.equal(l?.sevenDay?.usedPct, 81);
});

test('깨진 것·키 없는 것은 undefined', () => {
  assert.equal(parseLimits('{', now, now), undefined);
  assert.equal(parseLimits('{"model":{}}', now, now), undefined);
  assert.equal(parseLimits('{"rate_limits":{"five_hour":{"used_percentage":"x"}}}', now, now), undefined);
  assert.equal(parseLimits('null', now, now), undefined);
});

test('창 하나만 있어도 된다', () => {
  const l = parseLimits(JSON.stringify({ rate_limits: { seven_day: sample.rate_limits.seven_day } }), now, now);
  assert.equal(l?.fiveHour, undefined);
  assert.equal(l?.sevenDay?.usedPct, 81);
});

test('파일이 없으면 undefined, 있으면 mtime 을 seenAt 으로', () => {
  assert.equal(readLimits(now, '/없는/곳/latest.json'), undefined);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fl-limits-'));
  const f = path.join(dir, 'latest.json');
  fs.writeFileSync(f, JSON.stringify(sample));
  const l = readLimits(now, f);
  assert.equal(l?.seenAt, fs.statSync(f).mtimeMs);
  fs.rmSync(dir, { recursive: true });
});
