// 서비스 이름은 정해지면 여기만 바꾸면 된다.
export const APP_NAME = "우리집 레코드";
export const appUrl = () => (process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "");
