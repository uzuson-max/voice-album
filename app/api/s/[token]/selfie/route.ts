import { NextResponse } from "next/server";
import { admin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

// 이야기를 마치고 찍은 셀피 → 이번 호 표지 (다시 찍으면 바뀐다)
export async function POST(req: Request, { params }: { params: { token: string } }) {
  const { path } = await req.json().catch(() => ({}));
  const db = admin();
  const { data: p } = await db.from("vf_prompts").select("id, storyteller_id").eq("token", params.token).maybeSingle();
  if (!p) return NextResponse.json({ error: "링크를 찾을 수 없어요" }, { status: 404 });
  // 이 질문의 폴더에 올린 사진만 받는다
  if (typeof path !== "string" || !path.startsWith(`${p.storyteller_id}/${p.id}/`) || !/\.(jpg|png)$/.test(path))
    return NextResponse.json({ error: "사진 경로가 맞지 않아요" }, { status: 400 });
  const { error } = await db.from("vf_prompts").update({ selfie_path: path }).eq("id", p.id);
  if (error) return NextResponse.json({ error: "저장 실패" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
