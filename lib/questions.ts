// lib/questions.ts
// 우리집 레코드 — 12주 과정. 매주 질문 1개. 한 달에 한 번(4·8·12주)은 녹음이 두 번: 대답 + 하나 더.
// 첫 번째 '하나 더'는 노래 — 엄마는 자장가, 아빠는 좋아하시던 노래.
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
    teenYear: parentBirthYear ? parentBirthYear + 14 : 0, // 중학생(열네 살) 무렵
    flags: {
      noYears: !parentBirthYear || !childBirthYear || childBirthYear <= parentBirthYear,
      noParentYear: !parentBirthYear,
      noChildYear: !childBirthYear,
      noCatchphrase: !get(PROFILE_KEYS.catchphrase),
      noUnsaid: !get(PROFILE_KEYS.unsaid),
      noFood: !food,
      isDad: ['아빠', '아버지', '아버님'].includes(label),
    },
  };
}

/* ───────── 12주 ───────── */

type Text = { lead?: string; ask: string };
export type Week = Text & {
  week: number;
  format: 'audio' | 'video';
  chapter: string;
  why: string;              // 자녀에게 보이는 '이 회차를 넣은 이유'
  hint?: string;
  skipIf?: string;          // flags 키가 true 면 alt
  alt?: Text;
  encore?: string;          // 대답이 끝나면 한 번 더 남기는 것. 이 주는 녹음이 두 번
  encoreDad?: string;       // 아빠일 때 encore
  reply?: Text;             // 이 주 대답을 들은 뒤 자녀가 남기는 답장 (자녀 화면)
  replyIf?: string;         // flags 키가 true 면 답장 없음
  free?: boolean;           // 무료 체험 회차
  preview?: boolean;        // 무료 체험 때 미리보기로 보여줄 회차
};

export const COURSE: Week[] = [
  /* ── 1장. 나를 모르던 시절 : 부모님이 '한 사람'이던 때로 시간여행 ── */
  {
    week: 1, format: 'audio', chapter: '나를 모르던 시절', free: true,
    why: '부모님이 처음 부모가 된 순간에서 시작해요. 내가 등장하는 이야기라, 첫 녹음부터 끝까지 듣게 돼요.',
    lead: '{age@childBirth:살}의 {parent:이/가} 있어요. 아직 누구의 {parent}도 아니던 때예요. 그리고 어느 날, 제가 생겼다는 걸 알게 됐어요.',
    ask: '그 소식을 들은 순간, 제일 먼저 든 마음이 뭐였어요? 기뻤는지, 겁났는지, 솔직하게요.',
    skipIf: 'noYears',
    alt: {
      lead: '아직 누구의 {parent}도 아니던 {parent:이/가} 있어요. 그리고 어느 날, 제가 생겼다는 걸 알게 됐어요.',
      ask: '그 소식을 들은 순간, 제일 먼저 든 마음이 뭐였어요? 기뻤는지, 겁났는지, 솔직하게요.',
    },
  },
  {
    week: 2, format: 'audio', chapter: '나를 모르던 시절', free: true,
    why: '그 시절 노래 한 곡이면 기억이 줄줄이 따라 나와요. {parent:이/가} {parent}이기 전, 한 사람이던 시절을 처음 들어보는 회차예요.',
    lead: '{teenYear}년, {parent:은/는} 중학생이었어요. 라디오에서, 거리에서 매일 흘러나오던 노래가 있었죠.',
    ask: '그때 {parent:은/는} 어떤 아이였어요? 제일 많이 따라 부른 노래 한 곡이랑, 그 노래를 들으면 떠오르는 사람 얘기를 해주세요.',
    skipIf: 'noParentYear',
    alt: {
      lead: '{parent:이/가} 중학생이던 시절이에요. 라디오에서, 거리에서 매일 흘러나오던 노래가 있었죠.',
      ask: '그때 {parent:은/는} 어떤 아이였어요? 제일 많이 따라 부른 노래 한 곡이랑, 그 노래를 들으면 떠오르는 사람 얘기를 해주세요.',
    },
  },
  {
    week: 3, format: 'video', chapter: '나를 모르던 시절',
    why: '첫 영상 회차예요. 스무 살의 꿈은 자녀가 거의 모르는 이야기라, 듣고 나면 대화거리가 생겨요. 처음으로 나도 답장을 남겨요.',
    lead: '스무 살의 {parent:이/가} 거울 앞에 서 있어요. "나는 이렇게 살 거야" 하고 생각하면서요.',
    ask: '그때 꿈꾼 모습 중에, 이룬 거 하나랑 못 이룬 거 하나만 알려주세요.',
    hint: '오늘부터는 얼굴도 함께 남겨요. 평소 앉는 자리에서, 화장 안 해도 괜찮아요.',
    reply: {
      lead: '{parent}의 스무 살 이야기, 끝까지 들어봤어요?',
      ask: '처음 알게 된 것 하나, 그리고 스무 살의 {parent}에게 지금의 내가 해주고 싶은 말을 남겨주세요.',
    },
  },

  /* ── 2장. 나를 키우던 시절 : 내가 몰랐던 부모님 쪽 이야기 ── */
  {
    week: 4, format: 'video', chapter: '나를 키우던 시절',
    why: '내 이름에 담긴 마음은 지금 묻지 않으면 영영 모르게 돼요. 이어서 노래 한 소절을 남겨, 힘든 날 꺼내 들을 수 있어요.',
    lead: '{childBirthYear}년, {parent:은/는} 처음으로 저를 품에 안았어요.',
    ask: '처음 제 얼굴을 봤을 때 무슨 생각이 들었어요? 그리고 제 이름엔 어떤 마음을 담았는지도 알려주세요.',
    encore: '그때 저 재우면서 불러주던 자장가, 한 소절만 불러주세요. 기억이 안 나면 흥얼거리기만 해도 좋아요.',
    encoreDad: '{parent:이/가} 좋아하던 노래 한 소절만 불러주세요. 나중에 그 노래 들으면 {parent} 생각날 것 같아요.',
    skipIf: 'noChildYear',
    alt: {
      lead: '{parent:이/가} 처음으로 저를 품에 안은 날이에요.',
      ask: '처음 제 얼굴을 봤을 때 무슨 생각이 들었어요? 그리고 제 이름엔 어떤 마음을 담았는지도 알려주세요.',
    },
  },
  {
    week: 5, format: 'video', chapter: '나를 키우던 시절',
    why: '스무 살의 꿈 이야기와 이어져요. 나를 키우느라 부모님이 내려놓은 것을, 자녀는 대부분 이때 처음 알게 돼요.',
    lead: '제가 초등학교에 들어가던 해예요. 아침마다 저를 학교에 보내던 그 시절이요.',
    ask: '그 시절 저 키우느라, {parent:이/가} 하고 싶었는데 내려놓은 게 있었어요? 그때 마음이 어땠는지도요.',
  },
  {
    week: 6, format: 'video', chapter: '나를 키우던 시절',
    why: '내가 떠난 뒤의 집은 자녀가 볼 수 없던 장면이에요. 그날 부모님 마음을 듣고, 그날의 내 마음도 답장으로 전해요.',
    lead: '제가 처음으로 며칠씩 집을 비우던 때가 있었어요. 수학여행이든, 군대든, 대학이든요. 그날 밤 집에는 제 자리만 비어 있었어요.',
    ask: '그날 빈 제 방을 보면서 무슨 생각을 했어요? 그날 저녁 이야기를 기억나는 대로 해주세요.',
    reply: {
      lead: '내가 집을 비운 그날, {parent} 이야기 들었어요?',
      ask: '그날의 나는 어땠는지, 그리고 그 얘기를 듣고 이제야 하고 싶은 말을 남겨주세요.',
    },
  },

  /* ── 3장. 물려줄 것 : 맛, 지혜, 대물림 ── */
  {
    week: 7, format: 'video', chapter: '물려줄 것', preview: true,
    why: '언젠가 그 맛을 다시 못 보는 날이 와요. 내가 좋아하는 요리를 영상으로 남기고, 나도 직접 만들어 답장해요.',
    ask: '{favoriteFood}, 제가 나중에 혼자 만들 수 있게 처음부터 알려주세요.',
    hint: '부엌에서 폰을 세워두고 평소처럼 해주세요. "대충 이 정도"도 그대로 남겨요.',
    skipIf: 'noFood',
    alt: {
      lead: '{parent:이/가} 해주던 음식 중에, 저 혼자서는 그 맛이 안 나는 게 있어요.',
      ask: '{parent:이/가} 제일 자신 있는 음식 하나, 제가 나중에 혼자 만들 수 있게 처음부터 알려주세요.',
    },
    reply: {
      lead: '{parent:이/가} 알려준 {favoriteFood}, 이제 직접 해볼 차례예요.',
      ask: '{parent} 영상 보면서 직접 만들어보고, 맛본 소감까지 남겨주세요. 망해도 괜찮아요.',
    },
    replyIf: 'noFood',
  },
  {
    week: 8, format: 'video', chapter: '물려줄 것',
    why: '잔소리 대신 부모님이 직접 겪은 이야기로 남는 지혜예요. 마지막엔 내 이름을 부르는 목소리를 하나 더 남겨요.',
    lead: '살다 보면 사람 때문에, 돈 때문에 마음이 크게 흔들리는 때가 와요. {parent}에게도 그런 때가 있었을 거예요.',
    ask: '{parent} 인생에서 제일 크게 흔들렸던 때는 언제였어요? 그때 어떻게 버텼는지, 그리고 그때 배운 걸 저한테 알려주세요.',
    hint: '말하기 어려운 부분은 빼도 괜찮아요. 그때 배운 것만 남겨도 충분해요.',
    encore: '마지막으로, 전화 받을 때처럼 제 이름 한 번만 불러주세요. 목소리 듣고 싶은 날 꺼내 들을게요.',
  },
  {
    week: 9, format: 'video', chapter: '물려줄 것',
    why: '부모님의 부모님 이야기는 가족 기록에서 가장 먼저 사라져요. 나에게까지 이어진 것을 처음 알게 되는 회차예요.',
    lead: '{parent:이/가} 지금 제 나이, {childAge:살}이었을 때예요. 그때 {parent}에게도 {parent:이/가} 있었죠.',
    ask: '그 무렵 {parent}의 {parent:은/는} 어떤 분이었어요? {parent:이/가} 그분을 닮았다고 느끼는 순간이 있다면 그 얘기도 해주세요.',
    skipIf: 'noChildYear',
    alt: {
      lead: '{parent:이/가} 지금 제 나이쯤이었을 때예요. 그때 {parent}에게도 {parent:이/가} 있었죠.',
      ask: '그 무렵 {parent}의 {parent:은/는} 어떤 분이었어요? {parent:이/가} 그분을 닮았다고 느끼는 순간이 있다면 그 얘기도 해주세요.',
    },
  },

  /* ── 4장. 남기는 말 ── */
  {
    week: 10, format: 'audio', chapter: '남기는 말',
    why: '귀에 익은 그 말버릇, 사라지면 제일 그리운 소리예요. 왜 그 말을 했는지까지 함께 남겨요.',
    lead: '"{catchphrase}" {parent:이/가} 맨날 하던 그 말이요.',
    ask: '그 말, 왜 그렇게 자주 했어요? 그리고 지금 저한테 한 번만 해주세요.',
    skipIf: 'noCatchphrase',
    alt: {
      lead: '밥은 먹었냐, 차 조심해라. 매일 듣던 말들이 있어요.',
      ask: '그 말들 중에 {parent:이/가} 제일 진심이었던 말이 뭐예요? 왜 그 말이었는지 얘기해주고, 지금 저한테 한 번만 해주세요.',
    },
  },
  {
    week: 11, format: 'video', chapter: '남기는 말',
    why: '부모님 인생의 가장 빛나던 하루를 직접 들어요. 그리고 내가 처음에 적어둔 말을 이제 전해요.',
    lead: '{parent:이/가} 살아온 날들 중에, 딱 하루로 돌아갈 수 있대요.',
    ask: '언제로 가고 싶어요? 그날 누가 곁에 있었고, 뭘 하고 있었는지 얘기해주세요.',
    reply: {
      lead: '처음 시작할 때 적어둔 말이에요.\n"{unsaidWords}"',
      ask: '이제 그 말을 {parent}에게 직접 해주세요.',
    },
  },
  {
    week: 12, format: 'video', chapter: '남기는 말',
    why: '스무 살의 자신에게 하는 말로 12번의 이야기를 닫아요. 마지막엔 가족 모두에게 남기는 인사를 담아요.',
    lead: '세 번째 이야기에서 스무 살의 {parent:을/를} 만났어요. 거울 앞에서 꿈을 꾸던 그 사람이요.',
    ask: '이제 지금의 {parent:이/가} 스무 살의 {parent}에게 한마디 해주세요.',
    encore: '마지막으로, 나중에 이 기록을 보게 될 우리 가족 모두에게 한마디만 남겨주세요.',
  },
];

/* ───────── 꺼내 쓰기 ───────── */

export type CourseRow = {
  week: number;
  format: 'audio' | 'video';
  chapter: string;
  why: string;
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
      why: r(w.why) as string,
      lead: r(t.lead),
      ask: r(t.ask) as string,
      encore: r(v.flags.isDad && w.encoreDad ? w.encoreDad : w.encore),
      hint: r(w.hint),
      replyLead: reply ? r(reply.lead) : null,
      replyAsk: reply ? r(reply.ask) : null,
      free: !!w.free,
      preview: !!w.preview,
    };
  });
}
