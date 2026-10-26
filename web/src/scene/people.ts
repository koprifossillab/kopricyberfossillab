// 사람이 고친 이름·생김새 — 서버(server/people.ts)가 파일에 두고 Snapshot.people 로 모두에게 보낸다. 누가 고치든 모두의 화면이 같이 바뀐다.
// 여기는 그 사본: 화면은 Snapshot 이 올 때마다 setPeople, 고칠 때는 editPerson(바로 내 화면에 반영하고 서버로 보낸다).
// 서버도 이 모듈을 읽는다 — 상담원의 상태 요약이 화면과 같은 이름을 쓰게(desk.ts → names.ts).
import type { Person } from '../types.ts';

let people = new Map<string, Person>();
let raw = '{}';
let version = 0;
const listeners = new Set<() => void>();

function changed(): void {
  version++;
  for (const f of listeners) f();
}

export const personOf = (id: string): Person | undefined => people.get(id);

// Snapshot 이 가져온 것으로 바꾼다 (같으면 그대로 — 다시 그리지 않게)
export function setPeople(rec: Record<string, Person> | undefined): void {
  const next = JSON.stringify(rec ?? {});
  if (next === raw) return;
  raw = next;
  people = new Map(Object.entries(rec ?? {}));
  changed();
}

// 고치기 — name 이 빈 글이면 지어 준 이름으로, look 이 null 이면 처음 생김새로. 서버가 거절하면 다음 Snapshot 이 되돌린다
export async function editPerson(id: string, patch: { name?: string; look?: Person['look'] | null }): Promise<boolean> {
  const cur = { ...people.get(id) };
  if (patch.name !== undefined) { if (patch.name.trim()) cur.name = patch.name.trim(); else delete cur.name; }
  if (patch.look !== undefined) { if (patch.look && Object.keys(patch.look).length) cur.look = patch.look; else delete cur.look; }
  if (cur.name || cur.look) people.set(id, cur); else people.delete(id);
  changed();
  try {
    const r = await fetch('api/people', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id, ...patch }) });
    return r.ok;
  } catch {
    return false;
  }
}

// 바뀌면 다시 그리게 — useSyncExternalStore(subscribePeople, peopleVersion)
export const subscribePeople = (f: () => void) => { listeners.add(f); return () => { listeners.delete(f); }; };
export const peopleVersion = () => version;
