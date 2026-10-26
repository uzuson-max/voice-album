// lib/questions.ts
// 우리집 레코드 — 12주 24회차 질문 (부모 19 : 자녀 5)
// 문구는 lib/korean.ts 의 render() 로 치환됩니다.
// 말투 규칙: 질문·장면 = 자녀 1인칭(저/제가) / 도착 알림 = 부모님이 부르는 이름(재빈이가) / 안내 힌트 = 서비스 목소리
//   {child:이/가} → 재빈이가   {child:아/야} → 재빈아   {parent:은/는} → 엄마는
//   {age@childBirth:살} → 스물여섯 살   {childAge+10:살} → 마흔여덟 살
//   {favoriteFood:을/를} → 김치찌개를   {grandma:이/가} → 외할머니가

import { render, type FamilyVars } from './korean';

/* ───────── 온보딩 입력 ───────── */

export type OnboardingField = {
  key: string;
  label: string;          // 자녀에게 보이는 질문
  placeholder?: string;
  required: boolean;
  private?: boolean;      // 부모님께 바로 보이지 않음
};

export const ONBOARDING_FIELDS: OnboardingField[] = [
  { key: 'parentTitle', label: '부모님을 뭐라고 불러요?', placeholder: '엄마 / 아빠 / 어머니 / 아버지', required: true },
  { key: 'childGiven', label: '엄마(아빠)가 나를 부르는 이름은요?', placeholder: '예: 재빈 (성은 빼고)', required: true },
  { key: 'childIsNickname', label: '이름 말고 별명으로 불러요? (막내, 빈이 등)', required: false },
  { key: 'parentBirthYear', label: '부모님이 태어난 해', placeholder: '1962', required: true },
  { key: 'childBirthYear', label: '내가 태어난 해', placeholder: '1988', required: true },
  { key: 'hometown', label: '부모님이 어린 시절을 보낸 동네', placeholder: '예: 전남 화순', required: false },
  { key: 'favoriteFood', label: '부모님이 해준 음식 중 내 최애', placeholder: '예: 김치찌개', required: true },
  { key: 'catchphrase', label: '부모님이 맨날 하던 말버릇', placeholder: '예: 밥은 먹고 다니냐', required: false },
  { key: 'unsaidWords', label: '부모님께 아직 못 한 말 한 줄 (11주차에 다시 꺼내드려요)', required: false, private: true },
  // 민감 체크 — 해당되면 질문이 자동으로 바뀌거나 빠집니다
  { key: 'grandmaPassed', label: '엄마(아빠)의 어머니가 돌아가셨나요?', required: false },
  { key: 'hardTimes', label: '집안이 어려웠던 시기 이야기는 피하고 싶어요', required: false },
];

/** 입력값 → render 에 넣을 변수 (호칭 따라 할머니 표기 자동) */
export function buildVars(input: Record<string, any>): FamilyVars {
  const isMom = ['엄마', '어머니'].includes(String(input.parentTitle));
  return {
    ...input,
    childGiven: String(input.childGiven ?? '').trim(),
    parentTitle: String(input.parentTitle ?? '엄마').trim(),
    parentBirthYear: Number(input.parentBirthYear),
    childBirthYear: Number(input.childBirthYear),
    grandma: isMom ? '외할머니' : '할머니',
    hometown: input.hometown || '어릴 적 살던 동네',
  } as FamilyVars;
}

/* ───────── 회차 ───────── */

export type Session = {
  no: number;                 // 1~24
  week: number;               // 1~12
  who: 'parent' | 'child';
  mode: 'voice' | 'video';
  chapter: string;
  lead?: string;              // 질문 전에 깔아주는 장면 (시간여행 빌드업)
  ask: string;                // 본 질문
  hint?: string;              // 촬영·녹음 팁 (작게)
  arrival?: string;           // 자녀 회차: 부모님 링크에 먼저 뜨는 문구
  replyTo?: number;           // 이 질문이 답장으로 이어지는 회차
  skipIf?: string;            // 이 온보딩 키가 true 면 alt 사용 (alt 없으면 건너뜀)
  alt?: { lead?: string; ask: string };
  free?: boolean;             // 무료 체험 회차
  preview?: boolean;          // 무료 체험 때 미리보기만 노출
};

export const SESSIONS: Session[] = [
  /* ── 1~3주 · 나를 모르던 시절 ── */
  {
    no: 1, week: 1, who: 'parent', mode: 'voice', chapter: '나를 모르던 시절', free: true,
    lead: '{childBirthYear}년, {parent:은/는} {age@childBirth:살}이었어요. 아직 저를 만나기 전이요.',
    ask: '그해 {parent:이/가} 제일 갖고 싶었던 건 뭐였어요?',
  },
  {
    no: 2, week: 1, who: 'parent', mode: 'voice', chapter: '나를 모르던 시절',
    lead: '{hometown}, {parent:이/가} 열두 살이던 여름방학. 하루 종일 놀다가 해 질 녘에 집 대문을 열어요.',
    ask: '그때 제일 먼저 나던 냄새가 뭐였어요? 누가 부엌에 있었어요?',
  },
  {
    no: 3, week: 2, who: 'parent', mode: 'video', chapter: '나를 모르던 시절',
    lead: '중학교 교실이에요. 창문 쪽인지 복도 쪽인지, {parent} 자리부터 떠올려봐요.',
    ask: '몇 번째 줄에 앉았어요? 그 반에서 {parent:이/가} 제일 잘하던 건 뭐였어요?',
    hint: '오늘부터는 영상이에요. 평소 앉는 자리에서, 화장 안 해도 괜찮아요.',
  },
  {
    no: 4, week: 2, who: 'parent', mode: 'video', chapter: '나를 모르던 시절',
    lead: '스무 살의 {parent:이/가} 거울 앞에 서 있어요. "나는 이렇게 살 거야" 하고 생각하면서요.',
    ask: '그때 꿈꾼 모습 중에, 이룬 거 하나랑 못 이룬 거 하나만 알려주세요.',
  },
  {
    no: 5, week: 3, who: 'child', mode: 'video', chapter: '답장', replyTo: 4,
    lead: '{parent}의 스무 살 이야기, 끝까지 들어봤어요?',
    ask: '그 이야기에서 처음 알게 된 것 하나, 그리고 스무 살의 {parent}에게 지금의 내가 해주고 싶은 말을 남겨주세요.',
    hint: '1분이면 충분해요. 잘 말하려고 하지 않아도 돼요.',
    arrival: '{child:이/가} {parent}의 스무 살 이야기를 듣고 영상을 보냈어요.',
  },
  {
    no: 6, week: 3, who: 'parent', mode: 'video', chapter: '나를 키우던 시절',
    lead: '{childBirthYear}년, {parent:은/는} 처음으로 저를 품에 안았어요.',
    ask: '그날 밤, 무슨 생각을 하면서 잠들었어요?',
  },

  /* ── 4~6주 · 나를 키우던 시절 ── */
  {
    no: 7, week: 4, who: 'parent', mode: 'video', chapter: '나를 키우던 시절',
    lead: '제가 일곱 살쯤이에요. 유치원 가방 메고 아무것도 모르던 때요.',
    ask: '그 무렵, 저 모르게 {parent} 혼자 울었던 날이 있었어요?',
  },
  {
    no: 8, week: 4, who: 'parent', mode: 'video', chapter: '나를 키우던 시절',
    ask: '{parent} 지갑이 제일 얇았던 해는 언제였어요? 그때 저한테 티 안 내려고 했던 게 뭐예요?',
    skipIf: 'hardTimes',
    alt: { ask: '제가 어릴 때, {parent:이/가} 제일 무리해서 사줬던 건 뭐였어요?' },
  },
  {
    no: 9, week: 5, who: 'parent', mode: 'video', chapter: '나를 키우던 시절',
    lead: '제가 중학생, 방문을 쾅 닫던 시절이에요.',
    ask: '그때 제가 했던 말 중에, 아직도 가슴에 남아 있는 말 있어요? 솔직하게 말해줘도 괜찮아요.',
  },
  {
    no: 10, week: 5, who: 'parent', mode: 'video', chapter: '나를 키우던 시절',
    ask: '저 몰래, {parent:이/가} 다른 사람한테 제 자랑을 했던 순간 하나만 알려주세요.',
  },
  {
    no: 11, week: 6, who: 'child', mode: 'video', chapter: '답장', replyTo: 9,
    lead: '{parent:이/가} 몰래 울었던 날, 그리고 가슴에 남아 있다던 그 말. 들었어요?',
    ask: '그때는 몰랐지만 지금은 아는 것, 그리고 그 말에 대해 이제야 하는 말을 남겨주세요.',
    arrival: '{child:이/가} 그때 그 말에 대해 할 말이 있대요.',
  },
  {
    no: 12, week: 6, who: 'parent', mode: 'video', chapter: '물려줄 것',
    lead: '{parent:이/가} 어릴 때, {grandma:이/가} 부엌에서 뭔가 끓이고 있어요.',
    ask: '{grandma:이/가} 해준 음식 중에, 지금도 그 맛이 안 나는 게 있어요?',
    skipIf: 'grandmaPassed',
    alt: {
      lead: '{parent:이/가} 어릴 때, {grandma:이/가} 부엌에서 뭔가 끓이고 있어요.',
      ask: '{grandma:이/가} 해주던 음식 중에, 지금 제일 다시 먹고 싶은 건 뭐예요?',
    },
  },

  /* ── 7~9주 · 물려줄 것 ── */
  {
    no: 13, week: 7, who: 'parent', mode: 'video', chapter: '물려줄 것', preview: true,
    ask: '{favoriteFood}, 제가 나중에 혼자 만들 수 있게 처음부터 알려주세요.',
    hint: '부엌에서 폰을 세워두고 평소처럼 만들어주세요. "대충 이 정도"도 그대로 남겨요.',
  },
  {
    no: 14, week: 7, who: 'parent', mode: 'voice', chapter: '물려줄 것',
    ask: '우리 집에서 {parent}만 아는 살림 노하우 하나만 알려주세요. 제가 언젠가 헤매지 않게요.',
  },
  {
    no: 15, week: 8, who: 'child', mode: 'video', chapter: '답장', replyTo: 13,
    lead: '{parent:이/가} 알려준 {favoriteFood}, 이제 직접 만들어볼 차례예요.',
    ask: '{parent} 영상 보면서 직접 만들어보고, 맛본 표정까지 남겨주세요.',
    hint: '망해도 괜찮아요. 오히려 그게 더 좋아요.',
    arrival: '{child:이/가} {parent:이/가} 알려준 {favoriteFood:을/를} 직접 만들어봤대요.',
  },
  {
    no: 16, week: 8, who: 'parent', mode: 'video', chapter: '물려줄 것', replyTo: 15,
    ask: '제가 만든 {favoriteFood}, 뭐가 빠졌는지 말해주세요.',
  },
  {
    no: 17, week: 9, who: 'parent', mode: 'video', chapter: '물려줄 것',
    lead: '제가 {childAge+10:살}이 됐다고 생각해주세요. 일도 사람도 다 버거운 어느 밤이에요.',
    ask: '그날 제가 꺼내봤으면 하는 말을, 지금 해주세요.',
  },
  {
    no: 18, week: 9, who: 'parent', mode: 'voice', chapter: '물려줄 것',
    ask: '살면서 {parent:이/가} 제일 잘한 선택 하나, 제일 후회하는 선택 하나만요.',
  },

  /* ── 10~12주 · 남기는 말 ── */
  {
    no: 19, week: 10, who: 'parent', mode: 'voice', chapter: '남기는 말',
    lead: '"{catchphrase}" — {parent:이/가} 맨날 하던 그 말이요.',
    ask: '그 말, 왜 그렇게 자주 했어요? 그리고 지금 저한테 한 번만 해주세요.',
    skipIf: 'noCatchphrase',
    alt: { ask: '제가 집 나설 때마다 {parent:이/가} 속으로 하던 말이 있다면, 지금 해주세요.' },
  },
  {
    no: 20, week: 10, who: 'parent', mode: 'video', chapter: '남기는 말',
    ask: '10년 뒤 오늘 {parent:이/가} 곁에 없다면, 제가 꼭 기억했으면 하는 {parent} 모습은 뭐예요?',
  },
  {
    no: 21, week: 11, who: 'child', mode: 'video', chapter: '답장', replyTo: 20,
    lead: '처음 시작할 때 적어둔 말, 기억나요?\n"{unsaidWords}"',
    ask: '이제 그 말을 {parent}에게 직접 해주세요.',
    hint: '적어둔 문장 그대로 읽어도, 전혀 다른 말을 해도 괜찮아요.',
    skipIf: 'noUnsaidWords',
    alt: { ask: '{parent}에게 한 번도 제대로 못 한 말 하나를, 지금 해주세요.' },
    arrival: '{child:이/가} 오래 하고 싶었던 말이 있대요.',
  },
  {
    no: 22, week: 11, who: 'parent', mode: 'video', chapter: '남기는 말', replyTo: 21,
    ask: '아직 한 번도 안 해본 것 중에, 저랑 같이 해보고 싶은 거 있어요?',
  },
  {
    no: 23, week: 12, who: 'parent', mode: 'video', chapter: '남기는 말', replyTo: 4,
    lead: '12주 전, 스무 살의 {parent} 이야기로 시작했어요.',
    ask: '이제 지금의 {parent:이/가} 스무 살의 {parent}에게 한마디 해주세요.',
  },
  {
    no: 24, week: 12, who: 'child', mode: 'video', chapter: '답장',
    lead: '12주 동안 {parent:이/가} 남긴 이야기, 다 모였어요.',
    ask: '이 기록을 다 보고 난 지금, 내가 알게 된 {parent:을/를} 이야기해주세요.',
    arrival: '{child:이/가} 12주를 마무리하는 영상을 보냈어요.',
  },
];

/* ───────── 꺼내 쓰기 ───────── */

export type RenderedSession = Omit<Session, 'skipIf' | 'alt'> & {
  lead?: string; ask: string; hint?: string; arrival?: string; chapter: string;
};

/** 온보딩 입력을 받아 실제 문구로 바뀐 24회차 반환 (해당 없는 회차는 alt 로 대체) */
export function buildSessions(input: Record<string, any>): RenderedSession[] {
  const v = buildVars(input);
  const flags: Record<string, boolean> = {
    ...input,
    noCatchphrase: !input.catchphrase,
    noUnsaidWords: !input.unsaidWords,
  };
  const r = (s?: string) => (s ? render(s, v) : undefined);

  return SESSIONS.flatMap((s) => {
    const useAlt = s.skipIf ? !!flags[s.skipIf] : false;
    if (useAlt && !s.alt) return [];
    const lead = useAlt ? (s.alt!.lead ?? undefined) : s.lead;
    const ask = useAlt ? s.alt!.ask : s.ask;
    const { skipIf, alt, ...rest } = s;
    return [{
      ...rest,
      chapter: render(s.chapter, v),
      lead: r(lead),
      ask: render(ask, v),
      hint: r(s.hint),
      arrival: r(s.arrival),
    }];
  });
}

/*
예) buildSessions({ parentTitle:'엄마', childGiven:'재빈', parentBirthYear:1962,
                   childBirthYear:1988, favoriteFood:'김치찌개' })[0]
→ lead: '1988년, 엄마는 스물여섯 살이었어요. 아직 재빈이를 만나기 전이요.'
  ask : '그해 엄마가 제일 갖고 싶었던 건 뭐였어요?'
*/
