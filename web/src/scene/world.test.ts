// 길이 벽을 넘지 않는가 — 건물을 지어 주요 자리 모든 쌍의 길을 찾고, 길을 0.05 간격으로 따라가며 칸막이·벽 안에 들어가는지 본다.
// (사용자가 「사람들이 벽을 넘어다닌다」 고 했다 — 원인은 길이 없을 때 곧장 가던 것과 칸막이 틈)
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildWorld } from './world.ts';
import { Nav } from './nav.ts';
import { seatOf, waitSpotOf, heightAt } from './world.ts';
import type { Rect } from './layout.ts';

// 이름이 GSM 이면 4인실, 나머지는 2인실 — 크기(size)는 화면이 쓰지 않는다
const OFFICES = [
  { name: 'DiaRUGA', size: 'm' as const }, { name: 'ForGIA', size: 's' as const }, { name: 'GSM', size: 'l' as const },
  { name: 'rash-company', size: 'm' as const }, { name: 'Cropobite', size: 's' as const }, { name: 'confoinfo', size: 's' as const },
  { name: 'shkim/phyloserver', size: 's' as const },   // 사막 방
  { name: 'paleoadmin/WegenersDream', size: 's' as const },   // 잔디 방
  { name: '@jschoi', size: 's' as const },   // 흙바닥 앵무새 방
];

function wallsOf(w: ReturnType<typeof buildWorld>): Rect[] {
  return w.items.filter((it) => it.kind === 'partition' || it.kind === 'rashwall' || it.kind === 'oldwall').map((it) => it.box);
}

function crosses(path: [number, number][], from: [number, number], walls: Rect[]): Rect | null {
  let p = from;
  for (const q of path) {
    const n = Math.max(1, Math.ceil(Math.hypot(q[0] - p[0], q[1] - p[1]) / 0.05));
    for (let k = 0; k <= n; k++) {
      const x = p[0] + ((q[0] - p[0]) * k) / n, z = p[1] + ((q[1] - p[1]) * k) / n;
      for (const r of walls) if (x > r[0] && x < r[2] && z > r[1] && z < r[3]) return r;
    }
    p = q;
  }
  return null;
}

for (const offices of [OFFICES.slice(0, 2), OFFICES]) {
  test(`사무실 ${offices.length}개 — 주요 자리 사이의 길이 벽을 넘지 않고, 길이 없는 곳이 없다`, () => {
    const w = buildWorld(offices);
    const nav = new Nav(w.w, w.d, w.blocks);
    const walls = wallsOf(w);
    const spots: [string, [number, number]][] = [
      ['문', w.door],
      ...w.desks.map((d, i) => [`책상${i}(${d.room})`, seatOf(d.at)] as [string, [number, number]]),
      ...w.desks.map((d, i) => [`대기${i}`, waitSpotOf(d.at)] as [string, [number, number]]),
      ...w.lounge.map((s, i) => [`휴게${i}`, s.at] as [string, [number, number]]),
      ...w.deskRest.map((s, i) => [`상담원 소파${i}`, s.at] as [string, [number, number]]),
      ...w.core.map((p, i) => [`코어${i}`, p] as [string, [number, number]]),
      ...w.bench.map((p, i) => [`현미경${i}`, p] as [string, [number, number]]),
      ...w.search.map((s, i) => [`자료실${i}`, s.at] as [string, [number, number]]),
      ...w.restroom.male.map((p, i) => [`남${i}`, p] as [string, [number, number]]),
      ...w.restroom.female.map((p, i) => [`여${i}`, p] as [string, [number, number]]),
      ...w.stand.map((p, i) => [`서기${i}`, p] as [string, [number, number]]),
      ...(w.pen?.feed ?? []).map((f, i) => [`먹이${i}`, f.at] as [string, [number, number]]),
      ...(w.aqua?.view ?? []).map((v, i) => [`수족관${i}`, v.at] as [string, [number, number]]),
      ...w.dining.flatMap((dn) => dn.order.map((p, i) => [`${dn.shop} 주문${i}`, p.at] as [string, [number, number]])),
      ...w.dining.flatMap((dn) => dn.seats.map((p, i) => [`${dn.shop} 자리${i}`, p.at] as [string, [number, number]])),
      // 점원·바깥 손님 (wetherilli 026) — 엘리베이터, 카운터 안·조리대 앞·마감 때 닦는 자리
      ['식당가 엘리베이터', w.lift!],
      ...w.dining.flatMap((dn) => dn.staff ? [
        [`${dn.shop} 카운터 안`, dn.staff.counter.at] as [string, [number, number]],
        ...dn.staff.stations.map((p, i) => [`${dn.shop} 조리대${i}`, p.at] as [string, [number, number]]),
        ...dn.staff.wipe.map((p, i) => [`${dn.shop} 닦기${i}`, p.at] as [string, [number, number]]),
      ] : []),
    ];
    const bad: string[] = [];
    // 문에서 모든 자리로, 모든 자리에서 문으로, 그리고 휴게실 첫 자리와 서로
    const pairs: [number, number][] = [];
    for (let i = 1; i < spots.length; i++) pairs.push([0, i], [i, 0]);
    const lounge0 = spots.findIndex(([n]) => n === '휴게0');
    for (let i = 1; i < spots.length; i++) if (i !== lounge0) pairs.push([lounge0, i]);
    for (const [a, b] of pairs) {
      const [na, pa] = spots[a], [nb, pb] = spots[b];
      const path = nav.findPath(pa, pb);
      if (!path.length) { bad.push(`${na} → ${nb}: 길 없음`); continue; }
      const r = crosses(path, pa, walls);
      if (r) bad.push(`${na} → ${nb}: 벽 [${r.map((v) => v.toFixed(2)).join(', ')}] 을 넘는다`);
    }
    assert.deepEqual(bad.slice(0, 15), [], `${bad.length}건`);
  });
}

test('먹이 주는 사람이 서면 공룡 하나가 그 앞으로 와서 먹는다', async () => {
  const { DinoPen } = await import('../iso/dinos.ts');
  const w = buildWorld(OFFICES.slice(0, 2));
  assert.ok(w.pen, '공룡 방이 있다');
  const pen = new DinoPen(w.pen!.rect, w.pen!.feeder);
  const f = w.pen!.feed[0];
  for (let i = 0; i < 600; i++) pen.step(0.05, [{ id: 'a', dino: f.dino }]);   // 30초
  const d = pen.dinos.find((x) => x.feedBy === 'a');
  assert.ok(d, '맡은 공룡이 있다');
  assert.ok(Math.hypot(d!.x - f.dino[0], d!.z - f.dino[1]) < 0.05, '울타리 앞에 왔다');
  assert.notEqual(d!.pose, 'walk');
  for (let i = 0; i < 20; i++) pen.step(0.05, []);
  assert.equal(pen.dinos.filter((x) => x.feedBy).length, 0, '사람이 가면 놓아준다');
  // 공룡은 울타리 밖으로 나가지 않는다
  const [x0, z0, x1, z1] = w.pen!.rect;
  for (let i = 0; i < 2000; i++) pen.step(0.05, []);
  for (const x of pen.dinos) assert.ok(x.x > x0 && x.x < x1 && x.z > z0 && x.z < z1);
});

test('사람 이름 — 늘 같고, 생김새 성별대로, 유명인 이름은 피한다', async () => {
  const { makeName, personName, FAMOUS_NAMES } = await import('./names.ts');
  const { isFemale } = await import('./appearance.ts');
  assert.equal(personName({ id: 'x/1' }), personName({ id: 'x/1' }));
  const seen = new Set<string>();
  for (let i = 0; i < 3000; i++) {
    const id = `session-${i}-${i * 7919}`;
    const n = makeName(id, isFemale(id));
    assert.match(n, /^[가-힣]{3}$/);
    assert.ok(!FAMOUS_NAMES.has(n), n);
    seen.add(n);
  }
  assert.ok(seen.size > 1500, `이름이 고루 나온다 (${seen.size})`);
  // 걸리는 이름이 실제로 걸러지는지 — 목록의 이름을 만드는 id 를 찾아 그 id 로 다시 지으면 다른 이름이 나와야 한다
  assert.ok(FAMOUS_NAMES.has('김수현'));
});

test('모듈 안의 가구 id 는 겹치지 않는다 (겹치면 그림 조각·앉는 자리가 엇갈린다)', async () => {
  const { MODULES } = await import('./modules.ts');
  for (const [type, def] of Object.entries(MODULES)) {
    const ids = def.items.map((it) => it.id);
    const dup = ids.filter((id, i) => ids.indexOf(id) !== i);
    assert.deepEqual(dup, [], type);
  }
});

test('사막 방 — 전갈·선인장이 다니는 곳은 그 방 안이고 가구(걸음 막기)와 겹치지 않는다(선인장 잠자리는 빼고)', () => {
  const w = buildWorld(OFFICES);
  assert.equal(w.desert.length, 1);
  const { roam, home, room } = w.desert[0];
  assert.equal(room, 'shkim/phyloserver');
  const m = w.modules.find((x) => x.label === room)!;
  assert.equal(m.type, 'office-desert');
  assert.ok(roam[0] > m.at[0] && roam[2] < m.at[0] + 7 && roam[1] > m.at[1] && roam[3] < m.at[1] + 7);
  for (const b of w.blocks) {
    if (home[0] > b[0] && home[0] < b[2] && home[1] > b[1] && home[1] < b[3]) continue;   // 선인장 잠자리
    const overlap = b[0] < roam[2] && b[2] > roam[0] && b[1] < roam[3] && b[3] > roam[1];
    assert.ok(!overlap, `걸음 막기 ${b.map((v) => v.toFixed(2)).join(',')} 가 사막 길과 겹친다`);
  }
});

test('잔디 방 — 공룡이 다니는 곳은 그 방 안이고 가구와 겹치지 않으며, 고사리 뜯는 자리마다 문에서 걸어갈 수 있다', () => {
  const w = buildWorld(OFFICES);
  assert.equal(w.garden.length, 1);
  const { roam, nibble, room } = w.garden[0];
  assert.equal(room, 'paleoadmin/WegenersDream');
  const m = w.modules.find((x) => x.label === room)!;
  assert.equal(m.type, 'office-fern');
  assert.ok(roam[0] > m.at[0] && roam[2] < m.at[0] + 7 && roam[1] > m.at[1] && roam[3] < m.at[1] + 7);
  for (const b of w.blocks) {
    const overlap = b[0] < roam[2] && b[2] > roam[0] && b[1] < roam[3] && b[3] > roam[1];
    assert.ok(!overlap, `걸음 막기 ${b.map((v) => v.toFixed(2)).join(',')} 가 공룡 길과 겹친다`);
  }
  assert.ok(nibble.length >= 4);
  for (const n of nibble) {
    assert.ok(n.at[0] >= roam[0] && n.at[0] <= roam[2] && n.at[1] >= roam[1] && n.at[1] <= roam[3]);
    assert.ok(Math.hypot(n.at[0] - n.fern[0], n.at[1] - n.fern[1]) < 0.9, '고사리에 닿는 자리');
  }
});

test('아래층 식당가 — 문에서 식당 자리까지 계단으로만 오르내린다(걸음마다 높이가 튀지 않는다)', () => {
  const w = buildWorld(OFFICES);
  assert.ok(w.lower, '아래층이 있다');
  assert.equal(w.dining.length, 2);
  for (const dn of w.dining) assert.ok(dn.order.length >= 2 && dn.seats.length >= 8, dn.shop);
  const nav = new Nav(w.w, w.d, w.blocks);
  const spots = w.dining.flatMap((dn) => [...dn.order.map((p) => p.at), ...dn.seats.map((p) => p.at)]);
  // 자리는 모두 아래층 바닥 높이
  for (const p of spots) assert.equal(heightAt(w, p[0], p[1]), w.lower!.y);
  const bad: string[] = [];
  // 바깥 손님 — 엘리베이터에서 계단으로 올라 테라스 구경 자리까지도 (wetherilli 026)
  const visits = [...(w.aqua?.view ?? []).map((v) => v.at), ...(w.pen?.feed ?? []).map((f) => f.at)];
  for (const v of visits) for (const [from, back] of [[w.lift!, false], [w.lift!, true]] as const) checkWalk(from, v, back);
  for (const to of spots) for (const [from, back] of [[w.door, false], [w.lounge[0].at, true]] as const) checkWalk(from, to, back);
  assert.deepEqual(bad.slice(0, 10), [], `${bad.length}건`);
  function checkWalk(from: [number, number], to: [number, number], back: boolean) {
    const [a, b] = back ? [to, from] : [from, to];
    const path = nav.findPath(a, b);
    if (!path.length) { bad.push(`${a} → ${b}: 길 없음`); return; }
    let p = a, h = heightAt(w, a[0], a[1]), stairs = false;
    for (const q of path) {
      const n = Math.max(1, Math.ceil(Math.hypot(q[0] - p[0], q[1] - p[1]) / 0.05));
      for (let k = 1; k <= n; k++) {
        const x = p[0] + ((q[0] - p[0]) * k) / n, z = p[1] + ((q[1] - p[1]) * k) / n;
        const hh = heightAt(w, x, z);
        if (Math.abs(hh - h) > 0.08) { bad.push(`${a} → ${b}: (${x.toFixed(2)}, ${z.toFixed(2)}) 에서 높이가 ${h.toFixed(2)} → ${hh.toFixed(2)}`); break; }
        if (x > w.lower!.steps[0] && x < w.lower!.steps[2] && z > w.lower!.steps[1] && z < w.lower!.steps[3]) stairs = true;
        h = hh;
      }
      p = q;
    }
    if (!stairs) bad.push(`${a} → ${b}: 계단을 지나지 않았다`);
  }
});

test('흙바닥 앵무새 방 — jschoi 계정 몫(표지 전 「@jschoi」·표지 뒤 「jschoi/…」), 앉을 곳·땅·나는 범위는 그 방 안', () => {
  const w = buildWorld(OFFICES);
  assert.equal(w.aviary.length, 1);
  const { perches, ground, fly, room } = w.aviary[0];
  assert.equal(room, '@jschoi');
  const m = w.modules.find((x) => x.label === room)!;
  assert.equal(m.type, 'office-parrot');
  const inRoom = (x: number, z: number) => x > m.at[0] && x < m.at[0] + 7 && z > m.at[1] && z < m.at[1] + 7;
  for (const [x, , z] of perches) assert.ok(inRoom(x, z));
  assert.ok(inRoom(ground[0], ground[1]) && inRoom(ground[2], ground[3]) && inRoom(fly[0], fly[1]) && inRoom(fly[2], fly[3]));
  const w2 = buildWorld([{ name: 'jschoi/somewhere', size: 's' }]);
  assert.equal(w2.aviary.length, 1);
  assert.equal(w2.modules.find((x) => x.label === 'jschoi/somewhere')!.type, 'office-parrot');
});

test('공실 — 옆 칸·앞뒤 줄로 붙은 공실은 창고 갈래가 다르다, 뒤에 줄이 있는 복도는 그 줄의 등을 막는다', () => {
  const w = buildWorld(['a', 'b', 'c', 'd', 'e'].map((name) => ({ name, size: 's' as const })));   // 둘째 줄에 공실이 나란히
  const vac = w.modules.filter((m) => m.type.startsWith('vacant'));
  assert.ok(vac.length >= 2);
  for (const a of vac) for (const b of vac) {
    if (a === b) continue;
    const side = Math.abs(a.at[1] - b.at[1]) < 1e-6 && Math.abs(Math.abs(a.at[0] - b.at[0]) - 7) < 1e-6;
    const stack = Math.abs(a.at[0] - b.at[0]) < 1e-6 && Math.abs(Math.abs(a.at[1] - b.at[1]) - 9) < 1e-6;
    if (side || stack) assert.notEqual(a.type, b.type, `${a.at} · ${b.at}`);
  }
  const corr = w.modules.filter((m) => m.type.startsWith('corridor'));
  assert.equal(corr.at(-1)!.type, 'corridor');
  for (const c of corr.slice(0, -1)) assert.equal(c.type, 'corridor-walled');
});
