// 사람이 화면에서 고친 이름·생김새 — 이 앱의 파일 하나에 둔다(원천 ~/.claude 는 그대로 읽기만). Snapshot.people 로 모두에게 간다.
// 누구나 고친다(열쇠 없음 — 사용자: 「사람들이 브라우저에서 수정하면 다른 사람들 화면에도」). 그래서 받는 것을 좁힌다:
// 지금 화면에 있는 에이전트만, 값은 appearance.ts 의 목록 안에서만, 이름은 20자, 1분에 PUT_PER_MIN 번, 기억은 MAX_PEOPLE 명까지.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { Person, PersonLook } from './model.ts';
import { HAIRS, HAIR_COLORS, ACCS, ACC_GROUPS, ACCENTS, OUTFITS, BUILD_LIST, type Acc } from '../web/src/scene/appearance.ts';
import { SKINS } from '../web/src/scene/layout.ts';

export const PEOPLE_FILE = process.env.FL_PEOPLE_FILE ?? path.join(os.homedir(), '.local', 'share', 'kopricyberfossillab', 'people.json');
const MAX_PEOPLE = 500;         // 세션 id 는 대화마다 새로 생긴다 — 오래 안 고친 것부터 잊는다
const NAME_MAX = 20;
const PUT_PER_MIN = 60;

interface Stored extends Person { at: number }
let store = new Map<string, Stored>();
try {
  store = new Map(Object.entries(JSON.parse(fs.readFileSync(PEOPLE_FILE, 'utf8')) as Record<string, Stored>));
} catch { /* 처음이거나 깨졌다 — 빈 것으로 */ }

function save(): void {
  fs.mkdirSync(path.dirname(PEOPLE_FILE), { recursive: true });
  const tmp = `${PEOPLE_FILE}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(Object.fromEntries(store)));
  fs.renameSync(tmp, PEOPLE_FILE);   // 반쯤 쓴 파일이 남지 않게
}

// 화면에 보낼 것 — 지금 있는 에이전트의 것만
export function peopleFor(ids: Iterable<string>): Record<string, Person> | undefined {
  const out: Record<string, Person> = {};
  for (const id of ids) {
    const p = store.get(id);
    if (p) out[id] = { ...(p.name ? { name: p.name } : {}), ...(p.look ? { look: p.look } : {}) };
  }
  return Object.keys(out).length ? out : undefined;
}

const one = <T>(v: unknown, list: readonly T[]): v is T => list.includes(v as T);

// 생김새 거르기 — 목록에 없는 값은 버린다. 같은 무리의 치장품(안경 둘·모자 셋·넥타이 둘)은 앞의 하나만
export function cleanLook(raw: unknown): PersonLook | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const out: PersonLook = {};
  if (typeof r.female === 'boolean') out.female = r.female;
  if (one(r.hair, HAIRS)) out.hair = r.hair;
  if (one(r.hc, HAIR_COLORS)) out.hc = r.hc;
  if (one(r.accent, ACCENTS)) out.accent = r.accent;
  if (one(r.skin, SKINS)) out.skin = r.skin;
  if (one(r.outfit, OUTFITS)) out.outfit = r.outfit;
  if (one(r.build, BUILD_LIST)) out.build = r.build;
  if (Array.isArray(r.acc)) {
    const acc: Acc[] = [];
    for (const a of r.acc) {
      if (!one(a, ACCS) || acc.includes(a)) continue;
      if (ACC_GROUPS.some((g) => g.includes(a) && acc.some((b) => g.includes(b)))) continue;
      acc.push(a);
    }
    out.acc = acc;
  }
  return Object.keys(out).length ? out : null;
}

export function cleanName(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  // 제어 문자는 빼고, 글자(코드 포인트) 수로 자른다
  return [...raw.replace(/[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u2028-\u202e\u2066-\u2069]/g, '').trim()].slice(0, NAME_MAX).join('');
}

let window0 = 0, count = 0;
export type EditResult = { ok: true } | { ok: false; status: number; error: string };

// body: { id, name?: 문자열(빈 글이면 지운다), look?: 객체 | null(지운다) }
export function editPerson(body: unknown, live: Set<string>, now = Date.now()): EditResult {
  if (now - window0 > 60_000) { window0 = now; count = 0; }
  if (++count > PUT_PER_MIN) return { ok: false, status: 429, error: '너무 자주 고친다 — 잠시 뒤에' };
  if (!body || typeof body !== 'object') return { ok: false, status: 400, error: '본문이 없다' };
  const b = body as Record<string, unknown>;
  const id = typeof b.id === 'string' ? b.id : '';
  if (!live.has(id)) return { ok: false, status: 404, error: '지금 화면에 없는 에이전트' };
  const cur: Stored = { ...store.get(id), at: now };
  if ('name' in b) {
    const n = cleanName(b.name);
    if (n === null) return { ok: false, status: 400, error: '이름은 글이어야 한다' };
    if (n) cur.name = n; else delete cur.name;
  }
  if ('look' in b) {
    const l = b.look === null ? null : cleanLook(b.look);
    if (l) cur.look = l; else delete cur.look;
  }
  if (cur.name || cur.look) store.set(id, cur); else store.delete(id);
  if (store.size > MAX_PEOPLE) {
    const old = [...store.entries()].sort((x, y) => x[1].at - y[1].at).slice(0, store.size - MAX_PEOPLE);
    for (const [k] of old) store.delete(k);
  }
  save();
  return { ok: true };
}
