import { SolapiMessageService } from "solapi";

function local(phone: string): string {
  const d = phone.replace(/\D/g, "");
  if (d.startsWith("82")) return "0" + d.slice(2);
  return d.startsWith("0") ? d : "0" + d;
}

// 링크가 들어가서 대부분 LMS(장문)로 나간다.
export async function sendText(to: string, text: string, subject?: string) {
  const key = process.env.SOLAPI_API_KEY;
  const secret = process.env.SOLAPI_API_SECRET;
  const from = process.env.SOLAPI_SENDER_NUMBER;
  if (!key || !secret || !from) throw new Error("Solapi 환경변수가 없습니다");
  const service = new SolapiMessageService(key, secret);
  const res: any = await service.send({
    to: local(to),
    from: local(from),
    text,
    ...(subject ? { subject } : {}),
  } as any);
  if ((res?.groupInfo?.count?.registeredFailed ?? res?.count?.registeredFailed ?? 0) > 0) {
    throw new Error("문자 접수 실패");
  }
}

// 카카오 알림톡 (자녀에게만). 채널·템플릿이 아직 없으면 문자로 보낸다.
// 템플릿 문구와 변수 이름은 docs/알림톡_템플릿.md 와 똑같아야 카카오 심사·발송이 통과한다.
// 알림톡이 실패하면 솔라피가 fallbackText를 문자로 대신 보낸다 (disableSms: false).
export type KakaoTemplate = "arrival" | "keep";
const TEMPLATE_ENV: Record<KakaoTemplate, string> = {
  arrival: "SOLAPI_KAKAO_TPL_ARRIVAL",
  keep: "SOLAPI_KAKAO_TPL_KEEP",
};

export async function sendKakao(
  to: string,
  template: KakaoTemplate,
  variables: Record<string, string>,
  fallbackText: string,
  subject?: string
) {
  const pfId = process.env.SOLAPI_KAKAO_PFID;
  const templateId = process.env[TEMPLATE_ENV[template]];
  if (!pfId || !templateId) return sendText(to, fallbackText, subject);

  const key = process.env.SOLAPI_API_KEY;
  const secret = process.env.SOLAPI_API_SECRET;
  const from = process.env.SOLAPI_SENDER_NUMBER;
  if (!key || !secret || !from) throw new Error("Solapi 환경변수가 없습니다");
  const service = new SolapiMessageService(key, secret);
  const res: any = await service.send({
    to: local(to),
    from: local(from),
    text: fallbackText,
    ...(subject ? { subject } : {}),
    kakaoOptions: { pfId, templateId, variables, disableSms: false },
  } as any);
  if ((res?.groupInfo?.count?.registeredFailed ?? res?.count?.registeredFailed ?? 0) > 0) {
    throw new Error("알림톡 접수 실패");
  }
}

export function normalizePhone(raw: string): string {
  return local(raw);
}
