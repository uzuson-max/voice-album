import { NextResponse } from "next/server";
import { admin } from "@/lib/supabaseAdmin";
import { bad, unauthorized, userIdFrom } from "@/lib/auth";

export const dynamic = "force-dynamic";

// 형제 초대 링크로 들어온 사람을 가족에 넣는다
export async function POST(req: Request) {
  const uid = await userIdFrom(req);
  if (!uid) return unauthorized();
  const b = await req.json().catch(() => ({}));
  const code = String(b.code || "").trim();
  if (!code) return bad("초대 링크가 올바르지 않아요");

  const db = admin();
  const { data: family } = await db.from("vf_families").select("id, owner_id").eq("invite_code", code).maybeSingle();
  if (!family) return bad("초대 링크가 만료됐거나 올바르지 않아요", 404);
  if (family.owner_id === uid) return NextResponse.json({ ok: true, already: true });

  const { data: own } = await db.from("vf_families").select("id").eq("owner_id", uid).maybeSingle();
  if (own) return bad("이미 직접 시작한 가족이 있어요. 다른 카카오 계정으로 들어와 주세요.");

  const { error } = await db
    .from("vf_members")
    .upsert({ family_id: family.id, user_id: uid }, { onConflict: "family_id,user_id" });
  if (error) return bad("가족에 들어가지 못했어요", 500);
  return NextResponse.json({ ok: true });
}
