import crypto from "crypto";
import { NextResponse } from "next/server";
import { admin } from "@/lib/supabaseAdmin";
import { bad, loadFamily, unauthorized, userIdFrom } from "@/lib/auth";
import { appUrl } from "@/lib/brand";

export const dynamic = "force-dynamic";

// 형제 초대 링크 — 받은 형제는 카카오 로그인만 하면 같은 이야기칸을 본다
export async function POST(req: Request) {
  const uid = await userIdFrom(req);
  if (!uid) return unauthorized();
  const { family } = await loadFamily(uid);
  if (!family) return bad("먼저 부모님을 등록해주세요");

  let code: string | null = family.invite_code || null;
  if (!code) {
    code = crypto.randomBytes(9).toString("base64url");
    const { error } = await admin().from("vf_families").update({ invite_code: code }).eq("id", family.id);
    if (error) return bad("초대 링크를 만들지 못했어요", 500);
  }
  const { count } = await admin()
    .from("vf_members")
    .select("user_id", { count: "exact", head: true })
    .eq("family_id", family.id);
  return NextResponse.json({ url: `${appUrl()}/join/${code}`, members: count || 0 });
}
