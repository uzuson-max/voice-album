import { NextResponse } from "next/server";
import { admin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

// 부모님 링크 — 토큰으로 질문 하나를 연다 (로그인 없음)
export async function GET(_req: Request, { params }: { params: { token: string } }) {
  const db = admin();
  const { data: p } = await db
    .from("vf_prompts")
    .select("id, text, format, status, unseal_at, vf_storytellers(honorific, unseal_at, vf_families(child_name))")
    .eq("token", params.token)
    .maybeSingle();
  if (!p) return NextResponse.json({ error: "링크를 찾을 수 없어요" }, { status: 404 });
  const st: any = (p as any).vf_storytellers;
  return NextResponse.json({
    text: p.text,
    format: p.format,
    answered: p.status === "answered",
    honorific: st?.honorific,
    childName: st?.vf_families?.child_name,
    unsealAt: p.unseal_at || st?.unseal_at || null,
  });
}
