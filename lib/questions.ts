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

import { render, isNickname, type FamilyVars } from './korean';

/* ───────── 온보딩: vf_storytellers.profile 에 저장되는 키 ───────── */

export const PROFILE_KEYS = {
  parentBorn: '태어난 해',          // 기존 키 그대로
  childBorn: '내가 태어난 해',
  hometown: '고향',                 // 기존 키 그대로
  food: '최애 음식',
  catchphrase: '말버릇',
  unsaid: '못 한 말',               // 자녀만 봄, 11주 답장 때 다시 꺼냄
  // 2026-11 온보딩 개편: 쓰기 대신 고르기. 값은 아래 보기 문구 그대로 저장
  me: '나',                         // 아들 | 딸
  order: '몇째',                    // 외동 | 첫째 | 중간 | 막내
  teenPlace: '10대 때 살던 곳',      // 시골 마을 | 작은 도시 | 큰 도시
  at20: '스무 살 무렵',              // 학교 다니는 중 | 일하는 중 | 결혼·살림 | 군대
  job: '결혼 전 했던 일',            // 기존 키 그대로 (보기 + 직접 쓰기)
  whenKid: '내가 어릴 때',           // 밖에서 일하셨어요 | 집에서 살림하셨어요 | 둘 다 하셨어요
  leftHome: '처음 집을 떠난 때',      // 수학여행·캠프 | 대학·기숙사 | 군대 | 취업·독립 | 결혼
  talk: '말수',                     // 이야기를 길게 하는 편 | 물어보면 하는 편 | 짧게 끝내는 편
  avoid: '조심할 이야기',            // 여러 개, '·'로 이어 저장
  dadThing: '아빠 기억',             // 아빠 전용: 아빠가 해주던 것 (7주 영상 회차에 들어감)
} as const;

/* 고르기 보기 — 온보딩 화면과 질문 문장이 같은 값을 쓴다 */
export const CHOICES = {
  me: ['아들', '딸'],
  order: ['외동', '첫째', '중간', '막내'],
  teenPlace: ['시골 마을', '작은 도시', '큰 도시'],
  at20: ['학교 다니는 중', '일하는 중', '결혼·살림', '군대'],
  job: ['회사·사무실', '공장', '가게·장사', '선생님·공무원', '집안일 돕기'],
  whenKid: ['밖에서 일하셨어요', '집에서 살림하셨어요', '둘 다 하셨어요'],
  leftHome: ['수학여행·캠프', '대학·기숙사', '군대', '취업·독립', '결혼'],
  talk: ['이야기를 길게 하는 편', '물어보면 하는 편', '짧게 끝내는 편'],
  avoid: ['돌아가신 가족', '이혼·재혼', '건강', '돈·사업'],
  food: ['김치찌개', '된장찌개', '갈비찜', '잡채', '김밥', '미역국'],
  catchphrase: ['밥은 먹고 다니냐', '차 조심해라', '일찍 다녀라', '아이고 내 새끼'],
  // 아빠 전용
  jobDad: ['회사·사무실', '공장·현장', '가게·장사', '선생님·공무원', '운전·운송', '농사·어업'],
  dadThing: ['전구·수도 고치기', '자전거 타는 법', '캐치볼', '된장찌개', '운전', '낚시'],
} as const;

// 2주차: 10대 때 살던 곳에 따라 노래가 흘러나오던 장면만 바꾼다
const TEEN_SCENE: Record<string, string> = {
  '시골 마을': '시골 마을에서 학교 다니던 시절, 라디오에서 매일 흘러나오던 노래가 있었죠.',
  '작은 도시': '동네 길로 학교 다니던 시절, 라디오에서, 가게 앞에서 매일 흘러나오던 노래가 있었죠.',
  '큰 도시': '버스 타고 학교 다니던 시절, 레코드 가게 앞에서 매일 흘러나오던 노래가 있었죠.',
};
const TEEN_DEFAULT = '라디오에서, 거리에서 매일 흘러나오던 노래가 있었죠.';

// 6주차: 내가 처음 집을 비운 계기
const LEFT_SCENE: Record<string, string> = {
  '수학여행·캠프': '제가 수학여행 간다고 처음 며칠 집을 비우던 날이 있었어요.',
  '대학·기숙사': '제가 대학 때문에 처음 집을 떠나던 날이 있었어요.',
  '군대': '제가 군대에 들어가던 날이 있었어요.',
  '취업·독립': '제가 일 때문에 처음 집을 나가 살게 된 날이 있었어요.',
  '결혼': '제가 결혼해서 집을 떠나던 날이 있었어요.',
};
const LEFT_DEFAULT = '제가 처음으로 며칠씩 집을 비우던 때가 있었어요. 수학여행이든, 군대든, 대학이든요.';

// 5주차: 그 시절 부모님 하루
const KID_SCENE: Record<string, string> = {
  '밖에서 일하셨어요': '제가 초등학교에 들어가던 해예요. 일 나가랴 저 챙기랴, 아침이 제일 바빴던 시절이요.',
  '둘 다 하셨어요': '제가 초등학교에 들어가던 해예요. 일 나가랴 저 챙기랴, 아침이 제일 바빴던 시절이요.',
};
const KID_DEFAULT = '제가 초등학교에 들어가던 해예요. 아침마다 저를 학교에 보내던 그 시절이요.';

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
    childIsNickname: isNickname(i.childName), // '재빈'·'재빈이' → 재빈이가 / '큰딸' → 큰딸이
    parentTitle: label,
    parentBirthYear,
    childBirthYear,
    thisYear: i.thisYear,
    hometown: get(PROFILE_KEYS.hometown) || '어릴 적 살던 동네',
    catchphrase: get(PROFILE_KEYS.catchphrase),
    unsaidWords: get(PROFILE_KEYS.unsaid),
    favoriteFood: food,
    dadThing: get(PROFILE_KEYS.dadThing),
    teenYear: parentBirthYear ? parentBirthYear + 14 : 0, // 중학생(열네 살) 무렵
    teenScene: TEEN_SCENE[get(PROFILE_KEYS.teenPlace)] || TEEN_DEFAULT,
    leftScene: LEFT_SCENE[get(PROFILE_KEYS.leftHome)] || LEFT_DEFAULT,
    kidScene: KID_SCENE[get(PROFILE_KEYS.whenKid)] || KID_DEFAULT,
    flags: {
      notFirst: ['중간', '막내'].includes(get(PROFILE_KEYS.order)),
      notFirstAge: ['중간', '막내'].includes(get(PROFILE_KEYS.order)) && !!parentBirthYear && childBirthYear > parentBirthYear,
      avoidMoney: get(PROFILE_KEYS.avoid).includes('돈'),
      noYears: !parentBirthYear || !childBirthYear || childBirthYear <= parentBirthYear,
      noParentYear: !parentBirthYear,
      noChildYear: !childBirthYear,
      noCatchphrase: !get(PROFILE_KEYS.catchphrase),
      noUnsaid: !get(PROFILE_KEYS.unsaid),
      noFood: !food,
      noDadThing: !get(PROFILE_KEYS.dadThing),
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
  steps?: string[];         // 3단계(장면 → 사람 → 마음). 있으면 ask 대신 하나씩 나눠 묻고, 단계마다 따로 녹음
  encore?: string;          // 대답이 끝나면 한 번 더 남기는 것. 이 주는 녹음이 두 번
  encoreDad?: string;       // 아빠일 때 encore
  reply?: Text;             // 이 주 대답을 들은 뒤 자녀가 남기는 답장 (자녀 화면)
  replyIf?: string;         // flags 키가 true 면 답장 없음
  free?: boolean;           // 무료 체험 회차
  preview?: boolean;        // 무료 체험 때 미리보기로 보여줄 회차
  when?: { flag: string; lead?: string; ask?: string }[]; // 온보딩 고르기에 따라 문장 일부만 바꿈
};

export const COURSE: Week[] = [
  /* ── 1장. 나를 모르던 시절 : 부모님이 '한 사람'이던 때로 시간여행 ── */
  {
    week: 1, format: 'audio', chapter: '나를 모르던 시절', free: true,
    why: '부모님이 처음 부모가 된 순간에서 시작해요. 내가 등장하는 이야기라, 첫 녹음부터 끝까지 듣게 돼요.',
    lead: '아직 누군가의 {parent:이/가} 아니던 때가 있었어요. {age@childBirth:살}, 나도 아직 애 같은데 진짜 아기가 생긴 거죠.',
    ask: '그 소식을 처음 알게 된 날, 기억하시나요? 제가 생긴 걸 어디서, 어떻게 알게 됐는지 천천히 들려주세요.',
    steps: [
      '그 소식을 처음 알게 된 날, 기억하시나요? 제가 생긴 걸 어디서, 어떻게 알게 됐는지 천천히 들려주세요.',
      '그 소식, 제일 먼저 누구한테 말했어요? 그 사람 표정이랑 했던 말, 기억나는 대로 들려주세요.',
      '그때 {parent} 마음은 어땠어요? 기뻤는지, 덜컥 겁이 났는지, 그때 그대로 들려주세요.',
    ],
    skipIf: 'noYears',
    alt: {
      lead: '아직 누군가의 {parent:이/가} 아니던 때가 있었어요. 나도 아직 애 같은데 진짜 아기가 생긴 거죠.',
      ask: '그 소식을 처음 알게 된 날, 기억하시나요? 제가 생긴 걸 어디서, 어떻게 알게 됐는지 천천히 들려주세요.',
    },
    // 첫째가 아니면 '처음 부모가 된' 장면이 아니다
    when: [
      { flag: 'notFirst', lead: '{parent:은/는} 이미 한 아이를 키우고 있었어요. 그 바쁜 날들 사이에 제가 찾아왔죠.' },
      { flag: 'notFirstAge', lead: '{age@childBirth:살}, {parent:은/는} 이미 한 아이를 키우고 있었어요. 그 바쁜 날들 사이에 제가 찾아왔죠.' },
    ],
  },
  {
    week: 2, format: 'audio', chapter: '나를 모르던 시절', free: true,
    why: '그 시절 노래 한 곡이면 기억이 줄줄이 따라 나와요. {parent:이/가} {parent}이기 전, 한 사람이던 시절을 처음 들어보는 회차예요.',
    lead: '{teenYear}년, {parent:은/는} 중학생이었어요. {teenScene}',
    ask: '그때 {parent:은/는} 어떤 아이였어요? 제일 많이 따라 부른 노래 한 곡이랑, 그 노래를 들으면 떠오르는 사람 얘기를 해주세요.',
    steps: [
      '그 시절 제일 많이 따라 부른 노래가 뭐였어요? 그 노래가 흘러나오던 곳이랑, 그때 {parent} 모습을 떠올려서 얘기해주세요.',
      '그 노래를 들으면 떠오르는 사람이 있어요? 그 사람이랑 있었던 일 하나만 들려주세요.',
      '그때 {parent:은/는} 어떤 아이였어요? 그 시절의 {parent}에게 지금 한마디 해준다면요?',
    ],
    skipIf: 'noParentYear',
    alt: {
      lead: '{parent:이/가} 중학생이던 시절이에요. {teenScene}',
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
    lead: '{kidScene}',
    ask: '그 시절 저 키우느라, {parent:이/가} 하고 싶었는데 내려놓은 게 있었어요? 그때 마음이 어땠는지도요.',
  },
  {
    week: 6, format: 'video', chapter: '나를 키우던 시절',
    why: '내가 떠난 뒤의 집은 자녀가 볼 수 없던 장면이에요. 그날 부모님 마음을 듣고, 그날의 내 마음도 답장으로 전해요.',
    lead: '{leftScene} 그날 밤 집에는 제 자리만 비어 있었어요.',
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
    when: [{ flag: 'avoidMoney', lead: '살다 보면 마음이 크게 흔들리는 때가 와요. {parent}에게도 그런 때가 있었을 거예요.' }],
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

/* ───────── 아빠 편: 엄마와 영역이 다른 회차만 덮어쓴다 ─────────
   엄마 = 음식·자장가·감정을 풀어내는 이야기 / 아빠 = 일·손으로 해주던 것·가장의 무게·말로 못 한 마음
   나머지 회차(2·3·9·10·11·12)는 두 분 모두에게 맞아서 그대로 쓴다. */
const DAD: Record<number, Partial<Week>> = {
  1: {
    why: '아빠가 처음 아빠가 된 순간에서 시작해요. 내가 등장하는 이야기라, 첫 녹음부터 끝까지 듣게 돼요.',
    lead: '{age@childBirth:살}, 아직 어른이 덜 된 것 같은데 {parent}라는 이름이 생기던 때가 있었어요.',
    ask: '그 소식을 처음 알게 된 날, 어디서 뭘 하고 있었는지 기억하시나요? 천천히 들려주세요.',
    steps: [
      '그 소식을 처음 알게 된 날, 어디서 뭘 하고 있었는지 기억하시나요? 천천히 들려주세요.',
      '그 소식을 제일 먼저 누구한테 말했어요? 그 사람이 한 말이랑 표정, 기억나는 대로요.',
      '그날 이후로 달라진 게 있다면 뭐였어요? 그때 {parent} 마음은 어땠는지도 들려주세요.',
    ],
    alt: {
      lead: '{parent}라는 이름이 처음 생기던 때가 있었어요. 나도 아직 어른이 덜 된 것 같은데요.',
      ask: '그 소식을 처음 알게 된 날, 어디서 뭘 하고 있었는지 기억하시나요? 천천히 들려주세요.',
    },
    when: [
      { flag: 'notFirst', lead: '{parent:은/는} 이미 한 아이의 {parent}였어요. 그 바쁜 날들 사이에 제가 찾아왔죠.' },
      { flag: 'notFirstAge', lead: '{age@childBirth:살}, {parent:은/는} 이미 한 아이의 {parent}였어요. 그 바쁜 날들 사이에 제가 찾아왔죠.' },
    ],
  },
  4: {
    lead: '{childBirthYear}년, {parent:은/는} 제 얼굴을 처음 보았어요.',
    alt: {
      lead: '{parent:이/가} 제 얼굴을 처음 본 날이에요.',
      ask: '처음 제 얼굴을 봤을 때 무슨 생각이 들었어요? 그리고 제 이름엔 어떤 마음을 담았는지도 알려주세요.',
    },
  },
  5: {
    why: '자녀는 부모님이 일하는 모습을 거의 보지 못해요. 하루를 아침부터 따라가 보면, 내가 몰랐던 {parent}가 나와요.',
    lead: '제가 초등학교에 들어가던 해예요. 그 무렵 {parent}의 하루는 어떻게 흘러가고 있었을까요.',
    ask: '그때 {parent}의 하루를 아침부터 순서대로 들려주세요. 일하던 곳, 같이 일하던 사람, 집에 돌아오던 길 풍경까지요.',
    steps: [
      '그때 {parent}의 하루를 아침부터 순서대로 들려주세요. 일하던 곳, 같이 일하던 사람, 집에 돌아오던 길 풍경까지요.',
      '그 일을 하면서 제일 뿌듯했던 순간이랑 제일 고됐던 순간을 하나씩 들려주세요.',
      '그 시절 저 때문에 미뤄둔 게 혹시 있었어요? 있었다면 그때 마음은 어땠는지도요.',
    ],
  },
  6: {
    why: '내가 떠난 날, 아빠가 어떤 마음이었는지는 자녀가 볼 수 없던 장면이에요. 그날 이야기를 듣고, 그날의 내 마음도 답장으로 전해요.',
    lead: '{leftScene}',
    ask: '그날 저를 보내면서 하고 싶었는데 못 한 말이 있었어요? 그날 하루를 기억나는 대로 들려주세요.',
  },
  7: {
    why: '뭐든 해결해 주던 아빠의 손은 말로 듣는 것보다 영상으로 보는 게 훨씬 오래 남아요. 알려주신 걸 내가 직접 해보고 답장해요.',
    lead: '{parent:이/가} 해주던 {dadThing}, 이제 제가 해야 할 날이 와요.',
    ask: '{parent:이/가} 알려줄 수 있는 것 중에 "{dadThing}" 하나, 제가 나중에 혼자 할 수 있게 직접 하면서 처음부터 알려주세요.',
    hint: '평소 하던 대로 해주세요. "대충 이렇게"도 그대로 남겨요.',
    skipIf: 'noDadThing',
    alt: {
      lead: '{parent:이/가} 척척 해주던 게 있었어요. 이제 제가 해야 할 날이 와요.',
      ask: '{parent:이/가} 제일 자신 있게 해주던 것 하나, 제가 나중에 혼자 할 수 있게 직접 하면서 처음부터 알려주세요.',
    },
    reply: {
      lead: '{parent:이/가} 알려준 {dadThing}, 이제 직접 해볼 차례예요.',
      ask: '{parent} 영상 보면서 직접 해보고, 소감까지 남겨주세요. 서툴러도 괜찮아요.',
    },
    replyIf: 'noDadThing',
  },
  8: {
    why: '잔소리 대신 아빠가 직접 겪은 이야기로 남는 지혜예요. 마지막엔 내 이름을 부르는 목소리를 하나 더 남겨요.',
    lead: '가장이라는 말에는 무게가 있다고들 해요. {parent}에게도 그런 때가 있었을 거예요.',
    ask: '{parent} 인생에서 제일 무거운 짐을 졌다고 느낀 때는 언제였어요? 그때 어떻게 버텼는지, 그리고 그때 배운 걸 저한테 알려주세요.',
    when: [{ flag: 'avoidMoney', lead: '살다 보면 마음이 크게 흔들리는 때가 와요. {parent}에게도 그런 때가 있었을 거예요.' }],
  },
};

/* ───────── 꺼내 쓰기 ───────── */

export type CourseRow = {
  week: number;
  format: 'audio' | 'video';
  chapter: string;
  why: string;
  lead: string | null;
  ask: string;
  steps: string[] | null;  // 3단계 질문 (없으면 ask 하나)
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

  return COURSE.map((base) => {
    const w: Week = v.flags.isDad && DAD[base.week] ? { ...base, ...DAD[base.week] } : base;
    let t: Text = w.skipIf && v.flags[w.skipIf] && w.alt ? w.alt : w;
    for (const o of w.when || []) {
      if (v.flags[o.flag]) t = { lead: o.lead ?? t.lead, ask: o.ask ?? t.ask };
    }
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
      steps: w.steps ? w.steps.map((x) => r(x) as string) : null,
      encore: r(v.flags.isDad && w.encoreDad ? w.encoreDad : w.encore),
      hint: r(w.hint),
      replyLead: reply ? r(reply.lead) : null,
      replyAsk: reply ? r(reply.ask) : null,
      free: !!w.free,
      preview: !!w.preview,
    };
  });
}
