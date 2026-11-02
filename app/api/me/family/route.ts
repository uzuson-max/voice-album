import { NextResponse } from "next/server";
import { admin } from "@/lib/supabaseAdmin";
import { bad, loadFamily, unauthorized, userIdFrom } from "@/lib/auth";
import { normalizePhone } from "@/lib/sms";
import { LIMIT } from "@/lib/course";

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
  // 자녀 번호는 선택 — "이야기 도착" 문자만 보낸다
  const childPhone = b.childPhone ? normalizePhone(String(b.childPhone)) : "";
  if (childPhone && !/^01\d{8,9}$/.test(childPhone)) return bad("내 휴대폰 번호를 확인해주세요");

  const db = admin();
  let { family, storyteller, role } = await loadFamily(uid);
  if (role === "member") return bad("가족 설정은 처음 시작한 사람만 바꿀 수 있어요");
  if (family) {
    await db.from("vf_families").update({ child_name: childName, child_phone: childPhone || null }).eq("id", family.id);
  } else {
    if (!b.agree) return bad("약관과 개인정보처리방침에 동의해 주세요");
    const r = await db
      .from("vf_families")
      .insert({ owner_id: uid, child_name: childName, child_phone: childPhone || null, agreed_at: new Date().toISOString() })
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
    const extra: Record<string, any> = {};
    // 호칭은 처음 정한 뒤 한 번만 바꿀 수 있다 (한 분의 이야기로 쭉 가야 잡지가 섞이지 않는다)
    if (label !== storyteller.label || honorific !== storyteller.honorific) {
      if ((storyteller.honorific_changes || 0) >= LIMIT.honorificChanges) return bad("호칭은 이미 한 번 바꿨어요. 다른 분 이야기는 새 과정으로 신청해 주세요");
      extra.honorific_changes = (storyteller.honorific_changes || 0) + 1;
    }
    // 번호를 고쳤을 때: 아직 이야기가 없거나 "제가 아니에요"였다면 첫 초대장부터 다시
    if (phone !== storyteller.phone) {
      const { count } = await db.from("vf_answers").select("id", { count: "exact", head: true }).eq("storyteller_id", storyteller.id);
      if (!count || storyteller.stop_reason === "wrong_number") {
        Object.assign(extra, { confirmed_at: null });
        if (storyteller.stop_reason === "wrong_number") Object.assign(extra, { active: true, stopped_at: null, stop_reason: null });
        await db
          .from("vf_prompts")
          .update({ status: "queued", token: null, sent_at: null, reminder_count: 0, last_reminded_at: null, snooze_until: null })
          .eq("storyteller_id", storyteller.id)
          .eq("status", "sent");
      }
    }
    await db.from("vf_storytellers").update({ ...row, ...extra }).eq("id", storyteller.id);
  } else {
    const r = await db.from("vf_storytellers").insert(row).select().single();
    if (r.error) return bad("저장 실패", 500);
  }
  return NextResponse.json(await loadFamily(uid));
}
