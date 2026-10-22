// 서비스 이름은 정해지면 여기만 바꾸면 된다.
export const APP_NAME = "우리집 레코드";

// 문자 속 링크 주소. 환경변수가 비어 있어도 Vercel 실제 배포 주소를 자동으로 쓴다.
export const appUrl = () => {
  const fromEnv = (process.env.NEXT_PUBLIC_APP_URL || "").trim().replace(/\/$/, "");
  if (fromEnv.startsWith("http")) return fromEnv;
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercel) return `https://${vercel}`;
  return "https://voice-album-9uvm.vercel.app";
};
