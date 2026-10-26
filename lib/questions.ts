// lib/questions.ts
// 우리집 레코드 — 12주 과정. 매주 질문 1개. 9주차만 두 번: 말 + 노래(자장가).
// 자녀 답장 4번(3·5·7·11주 뒤)은 부모님 다음 링크에 먼저 도착한다. (부모 12 : 자녀 4)
//
// 말투 규칙
//  - 질문·장면(lead/ask/encore) = 자녀 1인칭: "저를", "제가"
//  - 도착 알림·문자 = 부모님이 부르는 이름: "재빈이가"
//  - 안내(hint) = 서비스 목소리
//
// 템플릿은 lib/korean.ts render() 로 치환된다.
//  {parent:은/는} 엄마는 / {age@childBirth:살} 스물여섯 살 / {childAge+10:살} 마흔여덟 살
//  {favoriteFood} 김치찌개

import { render, type FamilyVars } from './korean';

/* ───────── 온보딩: vf_storytellers.profile 에 저장되는 키 ───────── */

export const PROFILE_KEYS = {
  parentBorn: '태어난 해',          // 기존 키 그대로
  childBorn: '내가 태어난 해',
  hometown: '고향',                 // 기존 키 그대로
  food: '최애 음식',
  catchphrase: '말버릇',
  unsaid: '못 한 말',               // 자녀만 봄, 11주 답장 때 다시 꺼냄
} as const;

export type CourseInput = {
  childName: string;                 // 부모님이 부르는 이름 (예: 재빈이)
  label: string;                     // 엄마 / 아빠
  profile: Record<string, any>;
  thisYear?: number;
};

export function buildVars(i: CourseInput): FamilyVars & { flags: Record<string, boolean> } {
  const p = i.profile || {};
  const get = (k: string) => String(p[k] ?? '').trim();
  const food = get(PROFILE_KEYS.food);
  const label = i.label.trim() || '엄마';
  const parentBirthYear = parseInt(get(PROFILE_KEYS.parentBorn), 10) || 0;
  const childBirthYear = parseInt(get(PROFILE_KEYS.childBorn), 10) || 0;

  return {
    childGiven: i.childName.trim(),
    childIsNickname: true, // 이미 부르는 형태로 입력받음 (재빈이, 우리 아들)
    parentTitle: label,
    parentBirthYear,
    childBirthYear,
    thisYear: i.thisYear,
    hometown: get(PROFILE_KEYS.hometown) || '어릴 적 살던 동네',
    catchphrase: get(PROFILE_KEYS.catchphrase),
    unsaidWords: get(PROFILE_KEYS.unsaid),
    favoriteFood: food,
    flags: {
      noYears: !parentBirthYear || !childBirthYear || childBirthYear <= parentBirthYear,
      noChildYear: !childBirthYear,
      noCatchphrase: !get(PROFILE_KEYS.catchphrase),
      noUnsaid: !get(PROFILE_KEYS.unsaid),
      noFood: !food,
    },
  };
}

/* ───────── 12주 ───────── */

type Text = { lead?: string; ask: string };
export type Week = Text & {
  week: number;
  format: 'audio' | 'video';
  chapter: string;
  hint?: string;
  skipIf?: string;          // flags 키가 true 면 alt
  alt?: Text;
  encore?: string;          // 대답이 끝나면 한 번 더 남기는 것 (노래 등). 이 주는 녹음이 두 번
  reply?: Text;             // 이 주 대답을 들은 뒤 자녀가 남기는 답장 (자녀 화면)
  replyIf?: string;         // flags 키가 true 면 답장 없음
  free?: boolean;           // 무료 체험 회차
  preview?: boolean;        // 무료 체험 때 미리보기로 보여줄 회차
};

export const COURSE: Week[] = [
  {
    week: 1, format: 'audio', chapter: '나를 모르던 시절', free: true,
    lead: '{childBirthYear}년, {parent:은/는} {age@childBirth:살}이었어요. 아직 저를 만나기 전이요.',
    ask: '그해 {parent:이/가} 제일 갖고 싶었던 건 뭐였어요?',
    skipIf: 'noYears',
    alt: {
      lead: '제가 태어나기 바로 전 해예요. {parent:은/는} 아직 저를 만나기 전이었어요.',
      ask: '그해 {parent:이/가} 제일 갖고 싶었던 건 뭐였어요?',
    },
  },
  {
    week: 2, format: 'audio', chapter: '나를 모르던 시절',
    lead: '{hometown}, {parent:이/가} 열두 살이던 여름방학. 하루 종일 놀다가 해 질 녘에 집 대문을 열어요.',
    ask: '그때 제일 먼저 나던 냄새가 뭐였어요? 누가 부엌에 있었어요?',
  },
  {
    week: 3, format: 'video', chapter: '나를 모르던 시절',
    lead: '스무 살의 {parent:이/가} 거울 앞에 서 있어요. "나는 이렇게 살 거야" 하고 생각하면서요.',
    ask: '그때 꿈꾼 모습 중에, 이룬 거 하나랑 못 이룬 거 하나만 알려주세요.',
    hint: '오늘부터는 얼굴도 함께 남겨요. 평소 앉는 자리에서, 화장 안 해도 괜찮아요.',
    reply: {
      lead: '{parent}의 스무 살 이야기, 끝까지 들어봤어요?',
      ask: '처음 알게 된 것 하나, 그리고 스무 살의 {parent}에게 지금의 내가 해주고 싶은 말을 남겨주세요.',
    },
  },
  {
    week: 4, format: 'video', chapter: '나를 키우던 시절',
    lead: '{childBirthYear}년, {parent:은/는} 처음으로 저를 품에 안았어요.',
    ask: '그날 밤, 무슨 생각을 하면서 잠들었어요?',
    skipIf: 'noChildYear',
    alt: {
      lead: '{parent:이/가} 처음으로 저를 품에 안은 날이에요.',
      ask: '그날 밤, 무슨 생각을 하면서 잠들었어요?',
    },
  },
  {
    week: 5, format: 'video', chapter: '나를 키우던 시절',
    lead: '제가 중학생, 방문을 쾅 닫던 시절이에요.',
    ask: '그때 제가 했던 말 중에, 아직도 가슴에 남아 있는 말 있어요? 솔직하게 말해줘도 괜찮아요.',
    reply: {
      lead: '{parent} 가슴에 남아 있다던 그 말, 들었어요?',
      ask: '그때는 몰랐지만 지금은 아는 것, 그리고 그 말에 대해 이제야 하는 말을 남겨주세요.',
    },
  },
  {
    week: 6, format: 'video', chapter: '나를 키우던 시절',
    ask: '저 몰래, {parent:이/가} 다른 사람한테 제 자랑을 했던 순간 하나만 알려주세요.',
  },
  {
    week: 7, format: 'video', chapter: '물려줄 것', preview: true,
    ask: '{favoriteFood}, 제가 나중에 혼자 만들 수 있게 처음부터 알려주세요.',
    hint: '부엌에서 폰을 세워두고 평소처럼 해주세요. "대충 이 정도"도 그대로 남겨요.',
    skipIf: 'noFood',
    alt: {
      lead: '언젠가 {parent:이/가} 곁에 없는 날, 제가 혼자 해내야 하는 일이 생길 거예요.',
      ask: '그때를 위해 이건 꼭 알려주고 싶다 싶은 거 하나, 처음부터 알려주세요.',
    },
    reply: {
      lead: '{parent:이/가} 알려준 {favoriteFood}, 이제 직접 해볼 차례예요.',
      ask: '{parent} 영상 보면서 직접 만들어보고, 맛본 소감까지 남겨주세요. 망해도 괜찮아요.',
    },
    replyIf: 'noFood',
  },
  {
    week: 8, format: 'video', chapter: '물려줄 것',
    lead: '제가 혼자 결정해야 하는 날이 올 거예요. 사람 때문에, 돈 때문에 마음이 흔들리는 날이요.',
    ask: '그런 날을 생각하면 {parent:이/가} 제일 걱정되는 거 하나만, 미리 말해주세요.',
    hint: '잔소리처럼 들려도 괜찮아요. 평소에 하고 싶었던 그 걱정, 그대로요.',
  },
  {
    week: 9, format: 'video', chapter: '물려줄 것',
    lead: '제가 {childAge+10:살}이 됐다고 생각해주세요. 일도 사람도 다 버거운 어느 밤이에요.',
    ask: '그날 제가 꺼내봤으면 하는 말을, 지금 해주세요.',
    encore: '그런 밤에 틀어놓고 잘 수 있게, 저 어릴 때 불러주던 자장가 한 소절만 불러주세요. 기억이 안 나면 좋아하는 노래도 좋아요.',
    skipIf: 'noChildYear',
    alt: {
      lead: '제가 지금보다 열 살 더 먹었다고 생각해주세요. 일도 사람도 다 버거운 어느 밤이에요.',
      ask: '그날 제가 꺼내봤으면 하는 말을, 지금 해주세요.',
    },
  },
  {
    week: 10, format: 'audio', chapter: '남기는 말',
    lead: '"{catchphrase}" — {parent:이/가} 맨날 하던 그 말이요.',
    ask: '그 말, 왜 그렇게 자주 했어요? 그리고 지금 저한테 한 번만 해주세요.',
    skipIf: 'noCatchphrase',
    alt: {
      ask: '제가 집 나설 때마다 {parent:이/가} 속으로 하던 말이 있다면, 지금 해주세요.',
    },
  },
  {
    week: 11, format: 'video', chapter: '남기는 말',
    ask: '10년 뒤 오늘 {parent:이/가} 곁에 없다면, 제가 꼭 기억했으면 하는 {parent} 모습은 뭐예요?',
    reply: {
      lead: '처음 시작할 때 적어둔 말이에요.\n"{unsaidWords}"',
      ask: '이제 그 말을 {parent}에게 직접 해주세요.',
    },
  },
  {
    week: 12, format: 'video', chapter: '남기는 말',
    lead: '세 번째 주에 스무 살의 {parent} 이야기를 들었어요.',
    ask: '이제 지금의 {parent:이/가} 스무 살의 {parent}에게 한마디 해주세요.',
  },
];

/* ───────── 꺼내 쓰기 ───────── */

export type CourseRow = {
  week: number;
  format: 'audio' | 'video';
  chapter: string;
  lead: string | null;
  ask: string;
  encore: string | null;   // 대답 뒤 한 번 더 (노래)
  hint: string | null;
  replyLead: string | null;
  replyAsk: string | null;
  free: boolean;
  preview: boolean;
};

/** 가족 정보 → 문장이 다 채워진 12주 */
export function buildCourse(input: CourseInput): CourseRow[] {
  const v = buildVars(input);
  const r = (s?: string) => (s ? render(s, v).trim() : null);

  return COURSE.map((w) => {
    const t: Text = w.skipIf && v.flags[w.skipIf] && w.alt ? w.alt : w;
    let reply = w.reply && !(w.replyIf && v.flags[w.replyIf]) ? w.reply : null;
    // 11주 답장: 못 한 말을 안 적어뒀으면 일반 문장으로
    if (reply && w.week === 11 && v.flags.noUnsaid) {
      reply = { ask: '{parent}에게 한 번도 제대로 못 한 말 하나를, 지금 해주세요.' };
    }
    return {
      week: w.week,
      format: w.format,
      chapter: w.chapter,
      lead: r(t.lead),
      ask: r(t.ask) as string,
      encore: r(w.encore),
      hint: r(w.hint),
      replyLead: reply ? r(reply.lead) : null,
      replyAsk: reply ? r(reply.ask) : null,
      free: !!w.free,
      preview: !!w.preview,
    };
  });
}
