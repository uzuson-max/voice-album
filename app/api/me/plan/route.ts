import { NextResponse } from "next/server";
import { admin } from "@/lib/supabaseAdmin";
import { bad, loadFamily, unauthorized, userIdFrom } from "@/lib/auth";
import { sendText } from "@/lib/sms";
import { APP_NAME } from "@/lib/brand";

export const dynamic = "force-dynamic";

// 정식 과정(50만 원, 양장본 포함) 신청.
// 결제 연동 전까지는 신청만 받고, 운영자가 확인 후 vf_families.plan 을 'paid' 로 바꾼다.
export async function POST(req: Request) {
  const uid = await userIdFrom(req);
  if (!uid) return unauthorized();
  const { family, storyteller } = await loadFamily(uid);
  if (!family || !storyteller) return bad("먼저 부모님을 등록해주세요");
  if (family.plan === "paid") return NextResponse.json({ ok: true, plan: "paid" });

  await admin().from("vf_families").update({ plan_requested_at: new Date().toISOString() }).eq("id", family.id);

  // 운영자 알림 (ADMIN_PHONE 이 있을 때만)
  const to = process.env.ADMIN_PHONE;
  if (to) {
    await sendText(
      to,
      `[${APP_NAME}] 정식 과정 신청\n${family.child_name} → ${storyteller.label}\n가족 ID: ${family.id}`,
      "정식 과정 신청"
    ).catch(() => {});
  }
  return NextResponse.json({ ok: true, plan: "trial", requested: true });
}
