// 서비스 이름은 정해지면 여기만 바꾸면 된다.
export const APP_NAME = "우리집 레코드";

// 문자 속 링크 주소: Vercel이 관리하는 실제 운영 주소만 쓴다 (짧고, 항상 최신 배포로 열림).
// 예전 환경변수 NEXT_PUBLIC_APP_URL은 잘못된 주소가 들어 있어 404가 났으므로 쓰지 않는다.
export function setOriginFrom(_req: Request) {}

export const appUrl = () => {
  const prod = (process.env.VERCEL_PROJECT_PRODUCTION_URL || "").trim().replace(/\/$/, "");
  if (prod) return prod.startsWith("http") ? prod : `https://${prod}`;
  return "https://voice-album-9uvm.vercel.app";
};

// 가격 표시는 여기 한 곳에서 바꾼다 — 단일 상품, 양장본 포함, 무료 체험 없음
export const PRICE = {
  won: 500000,
  label: "50만 원",
  note: "12번의 이야기 + 매번 우리집 신문 + 양장본 1권",
  extraCopy: "", // 형제용 추가 부수 1권 가격 — 확정되면 "권당 4만 원"처럼 적는다
  keepYears: 1,   // 과정이 끝난 뒤 열람·원본 내려받기 기간(년)
};

// 형제가 나눠 낼 때 1인당 금액 — 3명이면 "약 16만 7천 원"
export function perPerson(n: number) {
  const v = Math.round(PRICE.won / n / 1000) * 1000;
  const man = Math.floor(v / 10000);
  const cheon = Math.round((v % 10000) / 1000);
  return `약 ${man}만${cheon ? ` ${cheon}천` : ""} 원`;
}

// 사업자 정보 — 결제사 심사·법적 고지용 (화면 하단, 약관에 그대로 쓰인다)
export const BIZ = {
  name: "광주렌탈스튜디오 합",
  owner: "조재빈",
  regNo: "202-12-51715",
  mailOrderNo: "제 2026-광주서구-0430 호",
  address: "광주광역시 서구 구성로 5-1, 3층 (양동)",
  phone: "010-5673-9810",
};
