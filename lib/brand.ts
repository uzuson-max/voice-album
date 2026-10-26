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

// 가격 표시는 여기 한 곳에서 바꾼다 (확정 전)
export const PRICE = {
  digital: "30만 원대",
  digitalNote: "12주 질문 + 매주 우리집 신문 + 디지털 완성판",
};

// 사업자 정보 — 결제사 심사·법적 고지용 (화면 하단, 약관에 그대로 쓰인다)
export const BIZ = {
  name: "광주렌탈스튜디오 합",
  owner: "조재빈",
  regNo: "202-12-51715",
  mailOrderNo: "제 2026-광주서구-0430 호",
  address: "광주광역시 서구 구성로 5-1, 3층 (양동)",
  phone: "010-5673-9810",
};
