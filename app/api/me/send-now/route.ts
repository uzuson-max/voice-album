import { NextResponse } from "next/server";
import { bad, loadFamily, unauthorized, userIdFrom } from "@/lib/auth";
import { sendNextPrompt } from "@/lib/dispatch";

export const dynamic = "force-dynamic";

// "지금 바로 보내기" — 다음 질문을 즉시 문자로 (첫 질문, 테스트용)
export async function POST(req: Request) {
  const uid = await userIdFrom(req);
  if (!uid) return unauthorized();
  const { family, storyteller } = await loadFamily(uid);
  if (!family || !storyteller) return bad("먼저 부모님을 등록해주세요");
  try {
    const r = await sendNextPrompt(storyteller, family.child_name);
    if (!r.sent) return bad(r.reason || "보낼 질문이 없어요");
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return bad(e?.message || "문자 발송 실패", 500);
  }
}
