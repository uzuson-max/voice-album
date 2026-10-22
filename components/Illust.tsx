// 시안의 선 일러스트. 출시 전 정식 일러스트로 교체할 자리.
const S = { fill: "none", stroke: "#1f2b22", strokeWidth: 3, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
const INK = "#1f2b22", G = "#dde6d4", C = "#ebf0e5", A = "#f29b7c";

export function MomOnSofa() {
  return (
    <svg width="240" height="200" viewBox="0 0 240 200" {...S} role="img" aria-label="소파에 앉아 휴대폰에 이야기하는 어머니">
      <path d="M30 182 H210" />
      <rect x="52" y="78" width="136" height="88" rx="30" fill={C} />
      <path d="M58 144 H182" /><path d="M76 166 V180" /><path d="M164 166 V180" />
      <path d="M98 144 Q96 96 120 90 Q144 96 142 144" fill={G} />
      <path d="M104 104 Q98 124 112 132" /><path d="M136 104 Q152 106 147 84" />
      <rect x="141" y="66" width="11" height="18" rx="2.5" fill={INK} />
      <path d="M160 68 Q166 75 160 82" strokeWidth={2.5} /><path d="M168 63 Q177 75 168 87" strokeWidth={2.5} />
      <circle cx="120" cy="64" r="20" fill={G} />
      <path d="M100 62 Q100 40 120 41 Q140 40 140 62 Q133 50 120 51 Q107 50 100 62Z" fill={INK} />
      <circle cx="120" cy="36" r="7" fill={INK} />
      <circle cx="113" cy="66" r="1.8" fill={INK} stroke="none" /><circle cx="127" cy="66" r="1.8" fill={INK} stroke="none" />
      <path d="M115 73 Q120 77 125 73" strokeWidth={2.5} />
    </svg>
  );
}

export function Baby() {
  return (
    <svg width="120" height="110" viewBox="0 0 120 110" {...S} role="img" aria-label="아기를 안은 모습">
      <path d="M20 104 Q20 66 60 62 Q100 66 100 104" />
      <circle cx="60" cy="34" r="18" fill={C} />
      <path d="M42 32 Q42 14 60 15 Q78 14 78 32 Q71 22 60 23 Q49 22 42 32Z" fill={INK} />
      <path d="M53 40 Q60 45 67 40" strokeWidth={2.5} />
      <path d="M36 86 Q60 100 84 86 Q78 72 60 74 Q42 72 36 86Z" fill="#f7f9f3" />
      <circle cx="70" cy="80" r="7" fill="#f7f9f3" />
    </svg>
  );
}

export function Envelope() {
  return (
    <svg width="200" height="150" viewBox="0 0 200 150" {...S} role="img" aria-label="도장이 찍힌 봉투">
      <path d="M30 22 L18 14" strokeWidth={2.5} /><path d="M100 10 V0" strokeWidth={2.5} /><path d="M170 22 L182 14" strokeWidth={2.5} />
      <rect x="30" y="34" width="140" height="96" rx="8" fill={C} />
      <path d="M32 38 L100 92 L168 38" />
      <circle cx="100" cy="92" r="20" fill={A} />
      <path d="M91 92 L97 98 L109 86" />
    </svg>
  );
}

export function GiftBox() {
  return (
    <svg width="150" height="110" viewBox="0 0 150 110" {...S} role="img" aria-label="리본을 묶은 선물 상자">
      <path d="M20 104 H130" />
      <rect x="35" y="50" width="80" height="54" rx="4" fill={G} />
      <rect x="29" y="38" width="92" height="16" rx="3" fill={C} />
      <path d="M75 38 V104" />
      <path d="M75 38 Q58 16 52 30 Q50 40 75 38 Q100 40 98 30 Q92 16 75 38Z" fill={A} />
    </svg>
  );
}

export function RecordTea() {
  return (
    <svg width="190" height="100" viewBox="0 0 190 100" {...S} role="img" aria-label="LP 레코드와 찻잔">
      <path d="M10 94 H180" />
      <circle cx="62" cy="50" r="42" fill={INK} />
      <circle cx="62" cy="50" r="28" stroke="#4d5c50" strokeWidth={1.5} />
      <circle cx="62" cy="50" r="12" fill={A} />
      <path d="M120 62 H164 Q164 92 142 92 Q120 92 120 62Z" fill={C} />
      <path d="M164 68 Q176 68 174 78 Q172 86 162 84" />
      <path d="M134 50 Q130 42 136 36" strokeWidth={2.5} /><path d="M148 50 Q144 42 150 36" strokeWidth={2.5} />
    </svg>
  );
}

export const Mic = ({ color = "#f7f9f3", size = 22 }: { color?: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0" /><path d="M12 18v3" />
  </svg>
);
