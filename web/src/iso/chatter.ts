// 휴게실 잡담 — 무리(카페 탁자·소파)에 둘 이상 있으면 대화 하나를 골라 돌아가며 말하고, 혼자면 가끔 혼잣말.
// 줄마다 보이는 시간은 글 길이로, 줄 사이·대화 사이의 쉼은 들쭉날쭉하게 — 같은 말이 같은 박자로 되풀이되지 않게.

// 대화 — 한 줄씩 다른 사람이 말한다 (사람이 줄보다 적으면 돌아가며)
export const DIALOGS: string[][] = [
  ['커피 몇 잔째예요?', '세 잔… 아니 네 잔', '저도 오늘은 무리예요'],
  ['PR 올렸어요?', '방금 올렸어요', 'CI 초록불이면 좋겠다'],
  ['빌드 깨졌대요', '또요?', '제 거 아니에요 ㅎㅎ'],
  ['점심 뭐 먹지', '송도 국밥?', '어제도 국밥이었잖아요', '그럼 김밥…'],
  ['남극 코어 새로 왔대요', '깊이 몇 미터래요?', '이번엔 꽤 길대요'],
  ['규조 사진 몇 장 남았어요?', '한 이천 장?', '오늘 안에 끝나겠네요'],
  ['GSM 지도 새 판 봤어요?', '극지 배경지도 붙었던데요', '그거 예쁘더라'],
  ['토큰 아껴 써요', '컨텍스트 꽉 찼어요', '/compact 한 번 해요'],
  ['오늘 배포해요?', '판 세션이 한대요', '그럼 기다려야죠'],
  ['시험 다 통과!', '오 진짜요?', '흔들리는 시험 하나 빼고요…'],
  ['삼엽충 표본 정리 끝났어요?', '반쯤요', '눈 모양 사진이 어렵더라고요'],
  ['밖에 비 와요', '우산 안 가져왔는데', '우산꽂이에 하나 있어요'],
  ['커피 머신 또 물 비었어요', '제가 채울게요', '천사다'],
  ['리뷰 봐주실 수 있어요?', '십 분만요', '감사해요!'],
  ['머지 충돌 났어요', 'HANDOFF 파일이죠?', '어떻게 알았어요'],
  ['devlog 번호 몇 번이에요?', '005요', '그럼 저는 006'],
  ['이 화면 누가 만들었대요?', '판 세션이요', '우리 다 보이네 ㅋㅋ'],
  ['공룡 방 생긴대요', '진짜요? 콤프소그나투스?', '먹이 줘도 된대요'],
  ['서버 재부팅한대요', '언제요?', '퇴근하고요, 아마'],
  ['권한 물어보는 거 귀찮다', 'auto 모드 쓰세요', '그래도 rm 은 물어봐야죠'],
  ['요즘 바빠요?', '판이 세 개 걸려 있어요', '힘내요'],
  ['간식 있어요?', '냉장고에 요거트', '제 거 아니면 드세요'],
  ['노두 사진 봤어요?', '태백 거요?', '단면 진짜 깨끗하더라'],
  ['회의 몇 시예요?', '세 시요', '그 전에 하나 끝내야지'],
  ['이거 누가 짠 코드예요?', '…제가요', '아 좋네요 ㅎㅎ'],
  ['파이썬 버전 올라갔대요', 'venv 다시 만들어야겠네', '아 그래서 깨졌구나'],
  ['오늘 날씨 좋다', '산책 갈래요?', '커피 다 마시고요'],
  ['문서는 한국어로 쓰는 거죠?', '네, 커밋도요', '알겠습니다'],
  ['지금 몇 시예요?', '네 시 반', '벌써?'],
  ['어제 그 버그 잡았어요?', '네, 오타였어요', '역시 오타'],
  ['남극 가 보고 싶다', '세종기지?', '장보고기지도요'],
  ['이번 판 이름 정했어요?', '0.4.0이요', '무난하네요'],
  ['화장실 어디예요?', '입구 옆이요', '감사합니다'],
  ['코드 리뷰 코멘트 많던데', '대부분 띄어쓰기예요', '그럼 다행'],
  ['키보드 소리 좋다', '기계식이에요', '부럽다'],
  ['저 이따 백그라운드로 넘어가요', '다시 와요', '네 결과 들고 올게요'],
];

// 혼잣말 — 무리에 혼자 있을 때 (커피 머신 앞이면 커피 쪽)
export const SOLO: string[] = [
  '음~', '…', '흠', '오늘도 힘내자', '조금만 쉬자', '다음 할 일이 뭐더라', '하암', '눈이 침침하다',
  '컨텍스트 정리 좀 할까', '메일 확인해야지', '아 맞다 그거', '좋아 좋아', '이따 커밋해야지',
];
export const COFFEE: string[] = ['☕', '커피 향 좋다', '샷 추가할까', '아 뜨거', '디카페인은 없나', '한 잔 더?', '설탕 어디 있지'];

const rand = (a: number, b: number) => a + Math.random() * (b - a);
const pick = <T,>(list: T[]) => list[Math.floor(Math.random() * list.length)];
const lineTime = (s: string) => Math.min(5, 1.4 + s.length * 0.11);   // 글이 길면 오래 보인다

interface Talk { lines: string[]; i: number; speakers: string[]; text: string; who: string | null; until: number; next: number; solo: boolean }

// 무리마다 대화 상태 — 무리 구성이 바뀌면 새로 시작한다
export class Chatter {
  private talks = new Map<string, Talk>();

  // members: 그 무리에 앉아(서) 있는 사람 id. 돌려주는 것: 지금 말하는 사람과 말 (없으면 null)
  step(group: string, members: string[], now: number): { who: string; text: string } | null {
    let t = this.talks.get(group);
    if (t && t.speakers.join(',') !== members.join(',')) t = undefined;   // 사람이 바뀌었다
    if (!t) {
      // 처음엔 조금 뜸을 들인다 — 앉자마자 말하지 않게
      t = { lines: [], i: 0, speakers: members, text: '', who: null, until: 0, next: now + rand(2, 8), solo: members.length < 2 };
      this.talks.set(group, t);
    }
    if (t.who && now < t.until) return { who: t.who, text: t.text };
    t.who = null;
    if (now < t.next) return null;
    if (t.solo) {
      // 혼자면 드문드문
      t.text = group === 'coffee' ? pick(COFFEE) : pick(SOLO);
      t.who = members[0];
      t.until = now + lineTime(t.text);
      t.next = t.until + rand(12, 35);
      return { who: t.who, text: t.text };
    }
    if (t.i >= t.lines.length) {
      // 새 대화 — 말을 꺼내는 사람도 고른다
      t.lines = pick(DIALOGS);
      t.i = 0;
      const start = Math.floor(Math.random() * members.length);
      t.speakers = [...members.slice(start), ...members.slice(0, start)];
    }
    t.text = t.lines[t.i];
    t.who = t.speakers[t.i % t.speakers.length];
    t.i++;
    t.until = now + lineTime(t.text);
    // 줄 사이는 짧게, 대화가 끝나면 한참 조용히
    t.next = t.until + (t.i < t.lines.length ? rand(0.3, 1.6) : rand(7, 22));
    return { who: t.who, text: t.text };
  }

  // 사라진 무리는 잊는다
  keep(groups: Set<string>): void {
    for (const g of this.talks.keys()) if (!groups.has(g)) this.talks.delete(g);
  }
}
