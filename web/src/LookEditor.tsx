// 생김새 고치기 — 목록·고른 에이전트의 얼굴을 두 번 누르면 열린다. 누르는 대로 바로 서버로 가서 모두의 화면이 같이 바뀐다(people.ts)
import { useEffect, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import type { Agent } from './types.ts';
import { Avatar } from './Panel.tsx';
import {
  appearanceOf, customOf, HAIRS, HAIR_COLORS, ACCENTS, FACE_ACC, HEAD_ACC, NECK_ACC, ACC_GROUPS, ACCENT_ACC, OUTFITS, BUILD_LIST,
  type Acc, type Custom, type Hair, type Outfit, type Build,
} from './scene/appearance.ts';
import { SKINS } from './scene/layout.ts';
import { personName, subtitle } from './scene/names.ts';
import { editPerson, subscribePeople, peopleVersion } from './scene/people.ts';
import { colorOf } from './scene/director.ts';

const HAIR_NAME: Record<Hair, string> = {
  short: '짧은 머리', buzz: '짧게 깎음', side: '옆 가르마', curly: '곱슬', bald: '대머리', pixie: '숏컷', bob: '단발', long: '긴 머리', ponytail: '묶은 머리', bun: '올림머리',
};
const ACC_NAME: Record<Acc, string> = {
  glasses: '안경', round: '동그란 안경', beard: '턱수염', mustache: '콧수염', headphones: '헤드폰', headband: '머리띠', beanie: '비니',
  tie: '넥타이', bowtie: '나비넥타이', lanyard: '사원증', scarf: '목도리', necklace: '목걸이',
};
const OUTFIT_NAME: Record<Outfit, string> = { suit: '정장', dress: '원피스', pants: '셔츠·바지', skirt: '치마', coat: '실험 가운', stripe: '줄무늬 니트' };
const BUILD_NAME: Record<Build, string> = { m: '보통', t: '키 크고 마른', s: '작은', w: '큰 몸집' };
const hex = (c: number) => '#' + c.toString(16).padStart(6, '0');

export function LookEditor({ a, all, onClose }: { a: Agent; all: Agent[]; onClose: () => void }) {
  useSyncExternalStore(subscribePeople, peopleVersion);
  const L = appearanceOf(a);
  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [onClose]);

  // 고친 칸만 서버에 둔다 — 지금 값과 합쳐 보낸다
  const set = (c: Custom) => void editPerson(a.id, { look: { ...customOf(a.id), ...c } });
  // 성별을 바꾸면 그 성별의 기본 머리·옷으로 — 고친 머리 모양·옷은 풀어 준다
  const setFemale = (female: boolean) => {
    const { hair: _h, hc: _c, acc: _a, outfit: _o, build: _b, accent: _x, ...rest } = customOf(a.id);
    void editPerson(a.id, { look: { ...rest, female } });
  };
  const toggleAcc = (x: Acc) => {
    const has = L.acc.includes(x);
    const group = ACC_GROUPS.find((g) => g.includes(x)) ?? [x];
    set({ acc: has ? L.acc.filter((y) => y !== x) : [...L.acc.filter((y) => !group.includes(y)), x] });
  };
  const accentUsed = L.acc.some((x) => ACCENT_ACC.has(x));

  const chips = <T extends string>(list: readonly T[], cur: T, name: Record<T, string>, pick: (v: T) => void) => (
    <div className="lk-chips">{list.map((v) => <button key={v} type="button" className={v === cur ? 'on' : ''} aria-pressed={v === cur} onClick={() => pick(v)}>{name[v]}</button>)}</div>
  );
  const swatches = (list: readonly number[], cur: number, label: string, pick: (v: number) => void) => (
    <div className="lk-sw" role="radiogroup" aria-label={label}>
      {list.map((c) => <button key={c} type="button" role="radio" aria-checked={c === cur} className={c === cur ? 'on' : ''} style={{ background: hex(c) }} onClick={() => pick(c)} />)}
    </div>
  );
  const accRow = (list: readonly Acc[]) => (
    <div className="lk-chips">{list.map((x) => <button key={x} type="button" className={L.acc.includes(x) ? 'on' : ''} aria-pressed={L.acc.includes(x)} onClick={() => toggleAcc(x)}>{ACC_NAME[x]}</button>)}</div>
  );

  // body 에 띄운다 — 목록 줄(role=button) 안에 두면 누르기가 줄의 고르기로 번진다
  return createPortal(
    <div className="modal-bg" onClick={onClose}>
      <div className="modal lk" role="dialog" aria-modal="true" aria-label="생김새 고치기" onClick={(e) => e.stopPropagation()}>
        <header>
          <h2>생김새</h2>
          <span className="lk-who">{personName(a)}<small>{subtitle(a)}</small></span>
          <button className="x" onClick={onClose} aria-label="닫기">×</button>
        </header>
        <div className="modal-body lk-body">
          <div className="lk-face"><Avatar a={a} color={colorOf(a, all)} small={false} /></div>
          <dl className="lk-form">
            <dt>성별</dt><dd>{chips(['m', 'f'] as const, L.female ? 'f' : 'm', { m: '남자', f: '여자' }, (v) => setFemale(v === 'f'))}</dd>
            <dt>머리 모양</dt><dd>{chips(HAIRS, L.hair, HAIR_NAME, (hair) => set({ hair }))}</dd>
            <dt>머리 색</dt><dd>{swatches(HAIR_COLORS, L.hc, '머리 색', (hc) => set({ hc }))}</dd>
            <dt>피부</dt><dd>{swatches(SKINS, L.skin, '피부', (skin) => set({ skin }))}</dd>
            <dt>옷</dt><dd>{chips(OUTFITS, L.outfit, OUTFIT_NAME, (outfit) => set({ outfit }))}<small className="lk-note">옷 색은 부서 색이라 고르지 않는다</small></dd>
            <dt>몸집</dt><dd>{chips(BUILD_LIST, L.build, BUILD_NAME, (build) => set({ build }))}</dd>
            <dt>얼굴</dt><dd>{accRow(FACE_ACC)}</dd>
            <dt>머리에</dt><dd>{accRow(HEAD_ACC)}</dd>
            <dt>목에</dt><dd>{accRow(NECK_ACC)}</dd>
            <dt>치장 색</dt><dd>{swatches(ACCENTS, L.accent, '치장 색', (accent) => set({ accent }))}{!accentUsed && <small className="lk-note">헤드폰·머리띠·비니·넥타이·사원증·목도리에 쓴다</small>}</dd>
          </dl>
          <p className="lk-foot">
            <span>고친 것은 서버에 남아 이 화면을 보는 모두에게 같이 보입니다.</span>
            <button type="button" onClick={() => void editPerson(a.id, { look: null })}>처음대로</button>
          </p>
        </div>
      </div>
    </div>,
    document.body,
  );
}
