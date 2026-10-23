import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyTool } from './classify.ts';
import { Transcript } from './transcript.ts';
import { resolve, LATCH_TOOL_MS, PERMISSION_GUESS_MS } from './latches.ts';

test('도구 이름으로 활동을 가른다', () => {
  assert.equal(classifyTool('Edit', { file_path: '/a/b/viewer.ts' }).label, 'Edit · viewer.ts');
  assert.equal(classifyTool('Edit', { file_path: '/a/b/viewer.ts' }).activity, 'code');
  assert.equal(classifyTool('Grep', { pattern: 'Thalassiosira' }).activity, 'read');
  assert.equal(classifyTool('WebFetch', { url: 'https://example.org/x?y' }).label, 'WebFetch · example.org');
  assert.equal(classifyTool('Agent', { description: 'Review UI' }).activity, 'spawn');
  assert.equal(classifyTool('AskUserQuestion', {}).activity, 'wait');
});

test('Bash 는 git·시험·그 밖으로', () => {
  assert.equal(classifyTool('Bash', { command: 'git status -sb' }).activity, 'git');
  assert.equal(classifyTool('Bash', { command: 'cd ~/p && gh pr list' }).activity, 'git');
  assert.equal(classifyTool('Bash', { command: 'python web/manage.py test core' }).activity, 'test');
  assert.equal(classifyTool('Bash', { command: 'npm test' }).activity, 'test');
  assert.equal(classifyTool('Bash', { command: 'ls -la' }).activity, 'run');
});

test('Bash 한 줄에는 명령 전체를 싣지 않는다', () => {
  const { label } = classifyTool('Bash', { command: 'curl -H "Authorization: Bearer SECRET" https://x' });
  assert.equal(label, 'Bash · curl -H');
  assert.equal(classifyTool('Bash', { command: 'x', description: 'Show status' }).label, 'Bash · Show status');
});

function line(o: object): string {
  return JSON.stringify(o);
}

test('열린 호출 → 결과 → 래치 → 휴식', () => {
  const t = new Transcript('/없음');
  const t0 = Date.parse('2026-10-23T00:00:00Z');
  t.feed(line({ type: 'permission-mode', permissionMode: 'default' }));
  t.feed(line({ type: 'assistant', timestamp: new Date(t0).toISOString(),
    message: { content: [{ type: 'tool_use', id: 'u1', name: 'Edit', input: { file_path: '/x/a.ts' } }] } }));
  assert.equal(resolve('busy', t, t0 + 1000).activity, 'code');
  // 확인을 묻는 모드에서 오래 조용하면 확인 대기로 추정
  const w = resolve('busy', t, t0 + PERMISSION_GUESS_MS + 1);
  assert.equal(w.activity, 'wait');
  assert.equal(w.guessed, true);
  t.feed(line({ type: 'user', timestamp: new Date(t0 + 2000).toISOString(),
    message: { content: [{ type: 'tool_result', tool_use_id: 'u1' }] } }));
  assert.equal(resolve('idle', t, t0 + 3000).activity, 'code');          // 래치
  assert.equal(resolve('idle', t, t0 + LATCH_TOOL_MS + 7000).activity, 'idle');
  assert.equal(resolve('blocked', t, t0 + 9000).activity, 'wait');
});

test('auto 모드에서는 시간으로 확인 대기를 추정하지 않는다', () => {
  const t = new Transcript('/없음');
  const t0 = Date.parse('2026-10-23T00:00:00Z');
  t.feed(line({ type: 'permission-mode', permissionMode: 'auto' }));
  t.feed(line({ type: 'assistant', timestamp: new Date(t0).toISOString(),
    message: { content: [{ type: 'tool_use', id: 'u1', name: 'Bash', input: { command: 'sleep 60' } }] } }));
  assert.equal(resolve('busy', t, t0 + 60_000).activity, 'run');
});

test('다른 세션의 지령이 절반을 넘으면 고객센터', () => {
  const t = new Transcript('/없음');
  const say = (kind: string) => t.feed(line({ type: 'user', origin: { kind }, message: { content: 'x' } }));
  assert.equal(t.room(), 'office');
  say('human'); say('human'); say('peer');
  assert.equal(t.room(), 'office');
  say('peer');
  assert.equal(t.room(), 'center');                     // 2 : 2
  t.feed(line({ type: 'user', origin: { kind: 'task-notification' }, message: { content: 'x' } }));
  assert.equal(t.origins.length, 4);                    // 알림은 세지 않는다
  for (let i = 0; i < 8; i++) say('human');
  assert.equal(t.room(), 'office');                     // 창은 최근 8 개
});
