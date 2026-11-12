// 우리집 레코드 — 빈칸 템플릿 질문 시스템
// 원칙: 문장 뼈대는 사람이 미리 써두고 검증한 것만 쓴다. 엔진은 빈칸만 채운다.
// 빈칸 재료가 없으면 빈칸 없는 기본 문장(fallback)으로 자동 전환.
// 부모님 화면 문장은 마침표 없이 끝낸다.

export type Parent = 'mom' | 'dad';
export type Child = 'son' | 'daughter';
export type Absence = 'far' | 'shop' | 'late' | 'home';
export type Motive = 'aging' | 'lost' | 'understood' | 'parenthood' | 'occasion';

export type Intake = {
  parent?: Parent;
  child?: Child;
  absence?: Absence;
  place?: string; // 예: 울산
  motive?: Motive;
  meetPerMonth?: number;
};

// ── 조사 자동 처리 ─────────────────────────────
function hasBatchim(word: string): boolean {
  const c = word.trim().charCodeAt(word.trim().length - 1);
  if (c < 0xac00 || c > 0xd7a3) return false;
  return (c - 0xac00) % 28 !== 0;
}
function isRieulBatchim(word: string): boolean {
  const c = word.trim().charCodeAt(word.trim().length - 1);
  return c >= 0xac00 && c <= 0xd7a3 && (c - 0xac00) % 28 === 8;
}
// pair: '이/가' '을/를' '은/는' '과/와' '이에요/예요' '으로/로'
export function josa(word: string, pair: string): string {
  const [a, b] = pair.split('/');
  if (pair === '으로/로') return word + (hasBatchim(word) && !isRieulBatchim(word) ? a : b);
  return word + (hasBatchim(word) ? a : b);
}

// 사용자가 입력한 장소 정리: "울산에서" → "울산"
export function cleanPlace(raw?: string): string | undefined {
  if (!raw) return undefined;
  const t = raw.trim().replace(/(에서|에|으로|로)$/, '').slice(0, 12);
  return t.length ? t : undefined;
}

// ── 템플릿 ───────────────────────────────────
type Template = {
  id: string;
  parent: Parent | 'any';
  absence: Absence;
  text: (i: Intake) => string | null; // null이면 재료 부족 → fallback
  fallback: string;
};

const T: Template[] = [
  {
    id: 'far-dinner',
    parent: 'any',
    absence: 'far',
    text: (i) => (i.place ? `${i.place}에서 혼자 저녁 드시던 날, 무슨 생각을 하셨어요` : null),
    fallback: '집 떠나 혼자 저녁 드시던 날, 무슨 생각을 하셨어요',
  },
  {
    id: 'shop-night',
    parent: 'any',
    absence: 'shop',
    text: () => null,
    fallback: '가게 문 닫고 혼자 정리하던 밤, 제일 먼저 무슨 생각이 났어요',
  },
  {
    id: 'late-road',
    parent: 'any',
    absence: 'late',
    text: () => null,
    fallback: '늦게 퇴근하던 길, 집 앞에 거의 다 와서 무슨 생각을 하셨어요',
  },
  {
    id: 'home-mom',
    parent: 'mom',
    absence: 'home',
    text: () => null,
    fallback: '엄마가 되기 전, 스무 살의 나는 어떤 사람이 되고 싶었어요',
  },
  {
    id: 'home-dad',
    parent: 'dad',
    absence: 'home',
    text: () => null,
    fallback: '아이들이 다 잠든 밤, 혼자 남으면 무슨 생각을 하셨어요',
  },
];

// 질문 위에 깔리는 짧은 빌드업 한 줄 (자녀용 미리보기에서만 사용)
const LEAD: Record<Motive, string> = {
  aging: '요즘 들어 더 궁금해진 그 시절',
  lost: '이번엔 늦기 전에 먼저',
  understood: '그땐 몰랐던 시간',
  parenthood: '나도 부모가 되어 보니',
  occasion: '특별한 날을 앞두고, 처음 듣는 이야기',
};

export function pickFirstQuestion(i: Intake): { id: string; lead: string; question: string } {
  const absence = i.absence ?? 'home';
  const parent = i.parent ?? 'mom';
  const tpl =
    T.find((t) => t.absence === absence && t.parent === parent) ??
    T.find((t) => t.absence === absence && t.parent === 'any') ??
    T[0];
  const q = tpl.text({ ...i, place: cleanPlace(i.place) }) ?? tpl.fallback;
  return { id: tpl.id, lead: i.motive ? LEAD[i.motive] : '', question: q };
}

// ── 남은 만남 계산 ─────────────────────────────
export function remainingMeetings(parentAge: number, perMonth: number, until = 80): number {
  const years = Math.max(0, until - parentAge);
  return Math.round(years * 12 * perMonth);
}

// ── 저장 (로그인 전 임시 보관 → 로그인 후 계정에 붙이기) ──
const KEY = 'wr_intake';
export function saveIntake(i: Intake) {
  try { localStorage.setItem(KEY, JSON.stringify(i)); } catch {}
}
export function loadIntake(): Intake {
  try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { return {}; }
}
