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

export function normalizePhone(raw: string): string {
  return local(raw);
}
