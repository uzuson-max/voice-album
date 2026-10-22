// 모든 일정은 한국 시간 기준
const KST = 9 * 60 * 60 * 1000;

export function kstParts(d = new Date()) {
  const k = new Date(d.getTime() + KST);
  return { weekday: k.getUTCDay(), hour: k.getUTCHours(), date: k.toISOString().slice(0, 10) };
}

export function todayKST(): string {
  return kstParts().date;
}

// "2026-12-24" → "12월 24일"
export function koDate(date?: string | null): string {
  if (!date) return "";
  const [, m, d] = date.split("-").map(Number);
  return `${m}월 ${d}일`;
}

export const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

export function isOpen(unsealAt?: string | null): boolean {
  return !unsealAt || unsealAt <= todayKST();
}
