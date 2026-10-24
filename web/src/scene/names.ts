// 사람 이름 — 세션 이름(rash-company-51, tmux 세션 상태 확인 …)은 코드 같아서, 캐릭터마다 한국 사람 이름을 지어 붙인다.
// 세션 이름은 부제목으로 작게. id 로 정해 늘 같은 이름, 성별은 생김새(appearance.ts)와 같다.
// 정치인·유명인 이름은 피한다 — 지어낸 이름이 아래 목록에 걸리면 다시 짓는다 (사용자 요청, 2026-10-23).
import type { Agent } from '../types.ts';
import { isFemale } from './appearance.ts';

const SURNAMES = ['김', '이', '박', '최', '정', '강', '조', '윤', '장', '임', '한', '오', '서', '신', '권', '황', '안', '송', '류', '전',
  '홍', '고', '문', '양', '손', '배', '백', '허', '남', '심', '노', '하', '곽', '성', '차', '주', '우', '구', '민', '진'];
const MALE_1 = ['민', '준', '서', '도', '현', '지', '우', '건', '시', '태', '승', '재', '동', '성', '하', '은', '진', '영', '상', '경', '용', '석', '호', '규', '원', '범', '정', '형', '종', '대'];
const MALE_2 = ['준', '우', '호', '현', '민', '혁', '훈', '석', '수', '원', '규', '빈', '진', '성', '찬', '율', '환', '기', '태', '윤', '결', '섭', '완', '욱'];
const FEMALE_1 = ['서', '지', '하', '수', '민', '예', '유', '채', '소', '다', '은', '윤', '가', '나', '아', '연', '혜', '미', '세', '시', '주', '보', '희', '선', '정', '효', '진', '현'];
const FEMALE_2 = ['연', '윤', '은', '아', '린', '영', '진', '희', '현', '원', '서', '율', '경', '정', '빈', '주', '나', '비', '솔', '하', '인', '름', '온', '지'];

// 피할 이름 — 전·현직 대통령·주요 정치인, 이름이 널리 알려진 연예인·운동선수. 지어낼 수 있는 꼴(성 + 두 글자)만 적는다
const FAMOUS = new Set([
  '문재인', '윤석열', '이재명', '박근혜', '이명박', '노무현', '김대중', '김영삼', '노태우', '전두환', '박정희', '이승만', '한동훈', '이준석',
  '안철수', '조국', '김건희', '김정은', '김정일', '김일성', '김여정', '이낙연', '홍준표', '오세훈', '정세균', '추미애', '김문수', '나경원',
  '유재석', '강호동', '손흥민', '김연아', '박지성', '이승기', '이민호', '송중기', '정우성', '이정재', '송강호', '박서준', '김수현', '김태희',
  '송혜교', '전지현', '한지민', '박보영', '김연경', '박찬호', '류현진', '이효리', '김혜수', '윤여정', '박보검', '차은우', '서강준', '이도현',
  '김고은', '김민재', '이강인', '황희찬', '조규성', '김유정', '한소희', '박은빈', '이지은', '김지원', '정해인', '유승호', '이종석', '최우식',
  '박신혜', '신민아', '김우빈', '이병헌', '하정우', '황정민', '마동석', '이선균', '전도연', '손예진', '김희애', '고현정', '배수지', '이영애',
  '장동건', '원빈', '김연우', '임영웅', '이찬원', '송가인', '김호중', '박명수', '정준하', '하하', '신동엽', '이수근', '서장훈', '김종국',
  '안정환', '이영표', '차범근', '박세리', '김민지', '이상화', '김동현', '추신수', '이대호', '박태환', '김자인', '최민정', '황대헌', '안세영',
]);

function hash(s: string, salt: number): number {
  let h = salt * 2654435761;
  for (let i = 0; i < s.length; i++) h = (Math.imul(h ^ s.charCodeAt(i), 0x5bd1e995) + 0x6b43a9b5) | 0;
  h ^= h >>> 13; h = Math.imul(h, 0x2c1b3c6d); h ^= h >>> 15;
  return Math.abs(h);
}

export function makeName(id: string, female: boolean): string {
  const [f1, f2] = female ? [FEMALE_1, FEMALE_2] : [MALE_1, MALE_2];
  for (let salt = 0; salt < 50; salt++) {
    const sur = SURNAMES[hash(id, 7 + salt * 3) % SURNAMES.length];
    const a = f1[hash(id, 8 + salt * 3) % f1.length];
    const b = f2[hash(id, 9 + salt * 3) % f2.length];
    if (a === b) continue;
    const name = sur + a + b;
    if (!FAMOUS.has(name)) return name;
  }
  return female ? '한서윤' : '한도윤';
}

const cache = new Map<string, string>();
// 사람이 고친 이름 — 목록에서 이름을 두 번 눌러 고친다. 이 브라우저에만 남는다(localStorage, id 마다)
const KEY_NAMES = 'kopricyberfossillab.names';
const custom: Map<string, string> = (() => {
  try { return new Map(Object.entries(JSON.parse(localStorage.getItem(KEY_NAMES) ?? '{}') as Record<string, string>)); } catch { return new Map(); }
})();
const listeners = new Set<() => void>();
let version = 0;
// 빈 이름이면 지어 준 이름으로 되돌린다
export function setPersonName(id: string, name: string): void {
  const n = name.trim().slice(0, 20);
  if (n && n !== generatedName(id)) custom.set(id, n); else custom.delete(id);
  try { localStorage.setItem(KEY_NAMES, JSON.stringify(Object.fromEntries(custom))); } catch { /* 저장이 막힌 브라우저 — 이번만 */ }
  version++;
  for (const f of listeners) f();
}
// 이름이 바뀌면 다시 그리게 — useSyncExternalStore(subscribeNames, namesVersion)
export const subscribeNames = (f: () => void) => { listeners.add(f); return () => { listeners.delete(f); }; };
export const namesVersion = () => version;

function generatedName(id: string): string {
  let n = cache.get(id);
  if (!n) { n = makeName(id, isFemale(id)); cache.set(id, n); }
  return n;
}
// 화면에 보이는 사람 이름. 상담원도 사람 이름을 갖는다 (부제목에 「상담원」)
export function personName(a: Pick<Agent, 'id'>): string {
  return custom.get(a.id) ?? generatedName(a.id);
}

// 부제목 — 세션 이름(사람이 붙인 것·자동 이름), 하위 에이전트는 종류, 다른 계정은 계정
export function subtitle(a: Agent): string {
  if (a.kind === 'desk') return '고객센터 상담원';
  if (a.kind === 'foreign') return a.user ? `${a.user} 계정` : a.name;
  if (a.kind === 'subagent') return `${a.name} 하위 에이전트`;
  if (a.kind === 'terminal') return `tmux ${a.name}`;
  return a.name;
}

export const FAMOUS_NAMES = FAMOUS;
