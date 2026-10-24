// 서비스 이름은 정해지면 여기만 바꾸면 된다.
export const APP_NAME = "우리집 레코드";

// 문자 속 링크 주소.
// 1순위: 지금 요청이 들어온 실제 주소(앱을 쓰고 있는 그 주소라 항상 열린다)
// 2순위: 환경변수 NEXT_PUBLIC_APP_URL → Vercel 실제 배포 주소 → 기본 주소
let fromRequest = "";
export function setOriginFrom(req: Request) {
  try {
    const h = req.headers;
    const host = h.get("x-forwarded-host") || h.get("host") || new URL(req.url).host;
    if (host && !host.startsWith("localhost")) fromRequest = `https://${host}`;
  } catch {}
}

export const appUrl = () => {
  if (fromRequest) return fromRequest;
  const fromEnv = (process.env.NEXT_PUBLIC_APP_URL || "").trim().replace(/\/$/, "");
  if (fromEnv.startsWith("http")) return fromEnv;
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercel) return `https://${vercel}`;
  return "https://voice-album-9uvm.vercel.app";
};
