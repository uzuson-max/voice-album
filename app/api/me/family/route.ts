import { NextResponse } from "next/server";
import { admin } from "@/lib/supabaseAdmin";
import { bad, loadFamily, unauthorized, userIdFrom } from "@/lib/auth";
import { normalizePhone } from "@/lib/sms";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const uid = await userIdFrom(req);
  if (!uid) return unauthorized();
  return NextResponse.json(await loadFamily(uid));
}

// 처음 설정 & 수정 (부모님 1명)
export async function POST(req: Request) {
  const uid = await userIdFrom(req);
  if (!uid) return unauthorized();
  const b = await req.json().catch(() => ({}));
  const childName = String(b.childName || "").trim();
  const label = String(b.label || "").trim();
  const honorific = String(b.honorific || "").trim();
  const phone = normalizePhone(String(b.phone || ""));
  if (!childName || !label || !honorific) return bad("이름과 호칭을 적어주세요");
  if (!/^01\d{8,9}$/.test(phone)) return bad("전화번호를 확인해주세요");

  const db = admin();
  let { family, storyteller } = await loadFamily(uid);
  if (family) {
    await db.from("vf_families").update({ child_name: childName }).eq("id", family.id);
  } else {
    if (!b.agree) return bad("약관과 개인정보처리방침에 동의해 주세요");
    const r = await db
      .from("vf_families")
      .insert({ owner_id: uid, child_name: childName, agreed_at: new Date().toISOString() })
      .select()
      .single();
    if (r.error) return bad("저장 실패", 500);
    family = r.data;
  }
  const row = {
    family_id: family.id,
    label,
    honorific,
    phone,
    send_weekday: Math.min(6, Math.max(0, Number(b.sendWeekday ?? 3))),
    send_hour: Math.min(20, Math.max(8, Number(b.sendHour ?? 9))),
    unseal_at: b.unsealAt || null,
    profile: b.profile && typeof b.profile === "object" ? b.profile : {},
  };
  if (storyteller) {
    await db.from("vf_storytellers").update(row).eq("id", storyteller.id);
  } else {
    const r = await db.from("vf_storytellers").insert(row).select().single();
    if (r.error) return bad("저장 실패", 500);
  }
  return NextResponse.json(await loadFamily(uid));
}
