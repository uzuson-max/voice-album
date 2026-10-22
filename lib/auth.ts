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

// 로그인한 자녀의 가족 + 부모님(1명) 한 번에
export async function loadFamily(ownerId: string) {
  const db = admin();
  const { data: family } = await db.from("vf_families").select("*").eq("owner_id", ownerId).maybeSingle();
  if (!family) return { family: null, storyteller: null };
  const { data: storyteller } = await db
    .from("vf_storytellers")
    .select("*")
    .eq("family_id", family.id)
    .order("created_at")
    .limit(1)
    .maybeSingle();
  return { family, storyteller };
}
