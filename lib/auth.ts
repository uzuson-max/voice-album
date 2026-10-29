import { NextResponse } from "next/server";
import { admin } from "./supabaseAdmin";

export async function userIdFrom(req: Request): Promise<string | null> {
  const h = req.headers.get("authorization");
  if (!h?.startsWith("Bearer ")) return null;
  const { data, error } = await admin().auth.getUser(h.slice(7));
  if (error || !data.user) return null;
  return data.user.id;
}

export const unauthorized = () => NextResponse.json({ error: "로그인이 필요해요" }, { status: 401 });
export const bad = (msg: string, status = 400) => NextResponse.json({ error: msg }, { status });

// 로그인한 자녀의 가족 + 부모님(1명) 한 번에.
// 처음 만든 사람(owner) 또는 초대받은 형제(member) 모두 같은 가족을 본다.
export async function loadFamily(userId: string): Promise<{ family: any; storyteller: any; role: "owner" | "member" | null }> {
  const db = admin();
  let role: "owner" | "member" = "owner";
  let { data: family } = await db.from("vf_families").select("*").eq("owner_id", userId).maybeSingle();
  if (!family) {
    const { data: m } = await db.from("vf_members").select("family_id").eq("user_id", userId).limit(1).maybeSingle();
    if (m) {
      role = "member";
      ({ data: family } = await db.from("vf_families").select("*").eq("id", m.family_id).maybeSingle());
    }
  }
  if (!family) return { family: null, storyteller: null, role: null };
  const { data: storyteller } = await db
    .from("vf_storytellers")
    .select("*")
    .eq("family_id", family.id)
    .order("created_at")
    .limit(1)
    .maybeSingle();
  return { family, storyteller, role };
}
