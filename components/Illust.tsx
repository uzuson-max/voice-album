// 우리집 레코드 — 그림은 캐릭터 대신 "레코드" 하나로 통일한다 (와인 가죽 + 금박).
// 예전 이름(MomOnSofa, Baby, Envelope, GiftBox, RecordTea)은 화면 코드가 그대로 쓰도록 남겨둔다.
const DISC = "#170809";
const GROOVE = "#5A3238";
const GOLD = "#D8B87E";
const GOLD_HI = "#EBD3A6";
const SLEEVE = "#4B2329";

// LP 로고 (웰컴·첫 화면·로딩)
export function LP({ className, size = 132 }: { className?: string; size?: number }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 100 100" aria-hidden="true">
      <defs>
        <radialGradient id="lpLabel" cx="50%" cy="35%" r="70%">
          <stop offset="0%" stopColor={GOLD_HI} />
          <stop offset="100%" stopColor={GOLD} />
        </radialGradient>
      </defs>
      <circle cx="50" cy="50" r="48" fill={DISC} />
      <circle cx="50" cy="50" r="40" fill="none" stroke={GROOVE} strokeWidth="0.8" />
      <circle cx="50" cy="50" r="33" fill="none" stroke={GROOVE} strokeWidth="0.8" />
      <circle cx="50" cy="50" r="26" fill="none" stroke={GROOVE} strokeWidth="0.8" />
      <path d="M22 30 A34 34 0 0 1 40 17" fill="none" stroke="rgba(235,211,166,0.35)" strokeWidth="2" strokeLinecap="round" />
      <circle cx="50" cy="50" r="16" fill="url(#lpLabel)" />
      <circle cx="50" cy="50" r="2.5" fill={DISC} />
    </svg>
  );
}

// 레코드가 반쯤 빠져나온 슬리브 — "봉해둔 이야기", "잘 담았어요" 자리
function Sleeve({ label }: { label: string }) {
  return (
    <svg width="168" height="128" viewBox="0 0 168 128" role="img" aria-label={label}>
      <circle cx="104" cy="64" r="54" fill={DISC} />
      <circle cx="104" cy="64" r="44" fill="none" stroke={GROOVE} strokeWidth="0.8" />
      <circle cx="104" cy="64" r="34" fill="none" stroke={GROOVE} strokeWidth="0.8" />
      <circle cx="104" cy="64" r="18" fill={GOLD} />
      <circle cx="104" cy="64" r="2.5" fill={DISC} />
      <rect x="10" y="10" width="108" height="108" rx="6" fill={SLEEVE} />
      <rect x="18" y="18" width="92" height="92" rx="3" fill="none" stroke="rgba(216,184,126,0.45)" strokeWidth="1" />
      <circle cx="64" cy="64" r="10" fill="none" stroke={GOLD} strokeWidth="1.2" />
      <circle cx="64" cy="64" r="2.5" fill={GOLD} />
    </svg>
  );
}

export function Envelope() {
  return <Sleeve label="잘 담아둔 레코드" />;
}

export function GiftBox() {
  return <Sleeve label="봉해둔 레코드" />;
}

// 부모님 질문 화면의 작은 표식 — 큰 그림 대신 레코드 하나 (영상 회차는 녹화 점)
export function MomOnSofa() {
  return <LP size={84} />;
}

export function Baby() {
  return (
    <svg width="84" height="84" viewBox="0 0 100 100" role="img" aria-label="영상으로 남기는 회차">
      <circle cx="50" cy="50" r="48" fill={DISC} />
      <circle cx="50" cy="50" r="38" fill="none" stroke={GROOVE} strokeWidth="0.8" />
      <circle cx="50" cy="50" r="16" fill="none" stroke={GOLD} strokeWidth="2" />
      <circle cx="50" cy="50" r="8" fill="#E0604A" />
    </svg>
  );
}

export function RecordTea() {
  return <LP size={100} />;
}

export const Mic = ({ color = "currentColor", size = 22 }: { color?: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0" /><path d="M12 18v3" />
  </svg>
);
