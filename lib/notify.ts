// lib/notify.ts
// 자녀 알림 원칙: 좋은 소식만 보낸다. "이번 주 녹음이 없어요" 같은 알림은 만들지 않는다.

import { admin } from "./supabaseAdmin";
import { sendText } from "./sms";
import { APP_NAME, appUrl } from "./brand";
import { josa } from "./korean";

// 기사가 처음 완성됐을 때 한 번만: "엄마 이야기가 도착했어요"
export async function notifyArrival(promptId: string) {
  const db = admin();
  const { data: p } = await db
    .from("vf_prompts")
    .select("id, article_title, notified_at, vf_storytellers(label, vf_families(child_phone))")
    .eq("id", promptId)
    .maybeSingle();
  if (!p || (p as any).notified_at) return;
  const st: any = (p as any).vf_storytellers;
  const to = st?.vf_families?.child_phone;
  if (!to) return;

  // 먼저 표시해서 두 번 가지 않게
  const { data: lock } = await db
    .from("vf_prompts")
    .update({ notified_at: new Date().toISOString() })
    .eq("id", promptId)
    .is("notified_at", null)
    .select("id");
  if (!lock?.length) return;

  const label = st?.label || "부모님";
  const title = p.article_title ? `\n\n‘${p.article_title}’` : "";
  await sendText(
    to,
    `[${APP_NAME}] ${josa(label, "이/가")} 들려준 이야기가 도착했어요.${title}\n\n${appUrl()}/app/stories`,
    "이야기 도착"
  );
}
