import { NextResponse } from "next/server";
import { admin } from "@/lib/supabaseAdmin";
import { sendText } from "@/lib/sms";
import { APP_NAME, appUrl } from "@/lib/brand";

export const dynamic = "force-dynamic";

// 첫 초대장에서 부모님 확인
// { wrong: false } "네, 맞아요" → 확인됨, 다음 이야기부터 정상 발송
// { wrong: true }  "제가 아니에요" → 이 번호로는 더 보내지 않고, 자녀에게 번호 확인을 부탁한다
export async function POST(req: Request, { params }: { params: { token: string } }) {
  if (params.token === "demo") return NextResponse.json({ ok: true });
  const b = await req.json().catch(() => ({}));
  const db = admin();
  const { data: p } = await db
    .from("vf_prompts")
    .select("storyteller_id, vf_storytellers(id, label, confirmed_at, vf_families(child_phone))")
    .eq("token", params.token)
    .maybeSingle();
  if (!p) return NextResponse.json({ error: "링크를 찾을 수 없어요" }, { status: 404 });
  const st: any = (p as any).vf_storytellers;

  if (!b.wrong) {
    if (!st.confirmed_at) await db.from("vf_storytellers").update({ confirmed_at: new Date().toISOString() }).eq("id", st.id);
    return NextResponse.json({ ok: true });
  }

  // 이미 확인된 분이 실수로 누른 경우는 무시
  if (st.confirmed_at) return NextResponse.json({ ok: true });
  await db
    .from("vf_storytellers")
    .update({ active: false, stopped_at: new Date().toISOString(), stop_reason: "wrong_number" })
    .eq("id", st.id);
  const to = st?.vf_families?.child_phone;
  if (to) {
    await sendText(
      to,
      `[${APP_NAME}] 질문을 받은 분이 "제가 아니에요"를 누르셨어요.\n${st.label || "부모님"} 번호를 한 번 확인해 주세요. 확인 전까지는 문자가 가지 않아요.\n${appUrl()}/app/family`,
      "번호 확인"
    ).catch(() => {});
  }
  return NextResponse.json({ ok: true });
}
