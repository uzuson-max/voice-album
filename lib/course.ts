// 과정 상태 한 곳에서: 부모님 확인 · 일시정지 · 그만두기 · 환불 계산
import { todayKST } from "./time";
import { PRICE } from "./brand";

export const LIMIT = {
  honorificChanges: 1, // 호칭은 처음 정한 뒤 한 번만 바꿀 수 있다
  pauseTimes: 2,       // 일시정지는 두 번까지
  pauseWeeks: 4,       // 한 번에 최대 4주
  redo: 1,             // 한 호를 다시 담는 건 한 번만
};

export type CourseState = "wrong_number" | "stopped" | "paused" | "waiting_confirm" | "active";

// sentAny: 부모님께 문자가 한 번이라도 갔는지
export function courseState(st: any, sentAny: boolean): CourseState {
  if (!st) return "active";
  if (st.stop_reason === "wrong_number") return "wrong_number";
  if (st.stopped_at || st.active === false) return "stopped";
  if (isPaused(st)) return "paused";
  if (sentAny && !st.confirmed_at) return "waiting_confirm";
  return "active";
}

export function isPaused(st: any): boolean {
  return !!st?.paused_until && st.paused_until >= todayKST();
}

// 환불 계산 (환불 정책 페이지와 같은 기준)
// - 세 번째 질문이 가기 전: 전액
// - 그 뒤: 서비스 몫 × 남은 회차/12 + 양장 몫(인쇄 전이면 전액)
export function refundEstimate(sentCount: number, bookStarted = false): number {
  if (sentCount < 3) return PRICE.won;
  const service = PRICE.won - PRICE.book;
  const left = Math.max(0, 12 - sentCount);
  const v = Math.floor((service * left) / 12 / 1000) * 1000 + (bookStarted ? 0 : PRICE.book);
  return Math.max(0, v);
}

export function won(v: number): string {
  if (v >= 10000) {
    const man = Math.floor(v / 10000);
    const rest = Math.round((v % 10000) / 1000);
    return `${man}만${rest ? ` ${rest}천` : ""} 원`;
  }
  return `${v.toLocaleString()}원`;
}
