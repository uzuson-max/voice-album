// lib/korean.ts
// 우리집 레코드 — 한국어 이름·조사·나이 자연스럽게 만들기
// 목표: "재빈가 보낸 질문" 같은 문장이 절대 나오지 않게.

/* ───────── 받침 판별 ───────── */

const DIGIT_BATCHIM: Record<string, boolean> = {
  '0': true, '1': true, '2': false, '3': true, '4': false,
  '5': false, '6': true, '7': true, '8': true, '9': false,
};

function lastChar(word: string): string {
  const w = word.trim().replace(/[\s.,!?~"'’)\]]+$/, '');
  return w.charAt(w.length - 1);
}

/** 마지막 글자에 받침이 있는지 */
export function hasBatchim(word: string): boolean {
  const c = lastChar(word);
  const code = c.charCodeAt(0);
  if (code >= 0xac00 && code <= 0xd7a3) return (code - 0xac00) % 28 !== 0;
  if (c in DIGIT_BATCHIM) return DIGIT_BATCHIM[c];
  return false; // 영문 등은 받침 없음으로 처리
}

/** 마지막 받침이 ㄹ인지 ((으)로 판별용) */
function isRieul(word: string): boolean {
  const c = lastChar(word);
  const code = c.charCodeAt(0);
  if (code >= 0xac00 && code <= 0xd7a3) return (code - 0xac00) % 28 === 8;
  return c === '1' || c === '7' || c === '8';
}

/* ───────── 조사 ───────── */

export type Josa =
  | '이/가' | '은/는' | '을/를' | '과/와' | '으로/로'
  | '아/야' | '이에요/예요' | '이랑/랑' | '이나/나' | '이라고/라고';

/** 단어 + 알맞은 조사.  josa('재빈이','이/가') → '재빈이가' */
export function josa(word: string, type: Josa): string {
  const b = hasBatchim(word);
  switch (type) {
    case '이/가': return word + (b ? '이' : '가');
    case '은/는': return word + (b ? '은' : '는');
    case '을/를': return word + (b ? '을' : '를');
    case '과/와': return word + (b ? '과' : '와');
    case '으로/로': return word + (b && !isRieul(word) ? '으로' : '로');
    case '아/야': return word + (b ? '아' : '야');
    case '이에요/예요': return word + (b ? '이에요' : '예요');
    case '이랑/랑': return word + (b ? '이랑' : '랑');
    case '이나/나': return word + (b ? '이나' : '나');
    case '이라고/라고': return word + (b ? '이라고' : '라고');
  }
}

/* ───────── 부모님이 자녀를 부르는 이름 ───────── */

/**
 * 부모님 입에서 나오는 형태.
 *  '재빈' → '재빈이' (받침 O → '이' 붙임)
 *  '민지' → '민지'
 * 이미 별명('막내', '빈이' 등)으로 입력했다면 nickname=true 로 그대로 사용.
 */
export function callName(given: string, nickname = false): string {
  const n = given.trim();
  if (nickname) return n;
  return hasBatchim(n) ? n + '이' : n;
}

/** 부르는 말: '재빈' → '재빈아', '민지' → '민지야' */
export function vocative(given: string, nickname = false): string {
  const n = given.trim();
  if (nickname) return josa(n, '아/야');
  return josa(n, '아/야');
}

/* ───────── 나이 (고유어) ───────── */

const TENS = ['', '열', '스물', '서른', '마흔', '쉰', '예순', '일흔', '여든', '아흔'];
const ONES = ['', '하나', '둘', '셋', '넷', '다섯', '여섯', '일곱', '여덟', '아홉'];
const ONES_ADN = ['', '한', '두', '세', '네', '다섯', '여섯', '일곱', '여덟', '아홉'];

/**
 * 26 → '스물여섯'  /  20 → '스물'
 * withSal=true 면 '스물여섯 살', '스무 살', '스물한 살'
 */
export function ageWord(n: number, withSal = false): string {
  if (n < 1 || n > 99) return `${n}${withSal ? '살' : ''}`;
  const t = Math.floor(n / 10), o = n % 10;
  if (!withSal) return TENS[t] + ONES[o];
  if (o === 0) return (t === 2 ? '스무' : TENS[t]) + ' 살';
  return TENS[t] + ONES_ADN[o] + ' 살';
}

/* ───────── 템플릿 렌더 ───────── */

export type FamilyVars = {
  childGiven: string;        // 부모님이 부르는 이름 ('재빈')
  childIsNickname?: boolean; // '막내', '빈이' 처럼 별명으로 입력했으면 true
  parentTitle: string;       // '엄마' | '아빠' | '어머니' | '아버지'
  parentBirthYear: number;
  childBirthYear: number;
  thisYear?: number;
  [key: string]: unknown;    // favoriteFood, hometown, catchphrase ...
};

/**
 * 템플릿 문법
 *  {child}            → 재빈이
 *  {child:이/가}       → 재빈이가
 *  {child:아/야}       → 재빈아        (부르는 말)
 *  {parent:이/가}      → 엄마가
 *  {favoriteFood:을/를}→ 김치찌개를
 *  {age@childBirth}    → 스물여섯      (자녀 태어난 해 부모 나이)
 *  {age@childBirth:살} → 스물여섯 살
 *  {childAge+10:살}    → 마흔여덟 살 같은 식 (+N 지원)
 *  {childBirthYear}    → 1988
 */
export function render(tpl: string, v: FamilyVars): string {
  const thisYear = v.thisYear ?? new Date().getFullYear();
  const childCall = callName(v.childGiven, v.childIsNickname);

  return tpl.replace(/\{([^}:]+)(?::([^}]+))?\}/g, (_m, rawKey: string, mod?: string) => {
    const key = rawKey.trim();

    // 나이 계열
    const ageMatch = key.match(/^(age@childBirth|parentAge|childAge)([+-]\d+)?$/);
    if (ageMatch) {
      const base =
        ageMatch[1] === 'age@childBirth' ? v.childBirthYear - v.parentBirthYear // 연도 차이 기준 (1988-1962 = 스물여섯)
        : ageMatch[1] === 'parentAge' ? thisYear - v.parentBirthYear
        : thisYear - v.childBirthYear;
      const n = base + (ageMatch[2] ? parseInt(ageMatch[2], 10) : 0);
      return mod === '살' ? ageWord(n, true) : ageWord(n);
    }

    // 이름 계열
    if (key === 'child') {
      if (mod === '아/야') return vocative(v.childGiven, v.childIsNickname);
      return mod ? josa(childCall, mod as Josa) : childCall;
    }
    if (key === 'parent') {
      return mod ? josa(v.parentTitle, mod as Josa) : v.parentTitle;
    }

    // 그 외 자유 변수
    const val = v[key];
    if (val === undefined || val === null || val === '') return '';
    const s = String(val);
    return mod ? josa(s, mod as Josa) : s;
  });
}

/* ───────── 온보딩 미리보기용 ───────── */

/** 자녀가 입력 직후 "엄마가 실제로 보게 될 문장"을 확인하게 하는 예시 3줄 */
export function previewLines(v: FamilyVars): string[] {
  return [
    render('{child:이/가} {parent}에게 보낸 질문이 도착했어요.', v),
    render('{child:아/야}, {parent:이/가} 답장 보냈어.', v),
    render('{childBirthYear}년, {parent:은/는} {age@childBirth}이었어요.', v),
  ];
}

/*
사용 예
render('{child:이/가} 끓인 {favoriteFood}, 뭐가 빠졌는지 말해주세요.',
  { childGiven:'재빈', parentTitle:'엄마', parentBirthYear:1962, childBirthYear:1988, favoriteFood:'김치찌개' })
→ '재빈이가 끓인 김치찌개, 뭐가 빠졌는지 말해주세요.'
*/
