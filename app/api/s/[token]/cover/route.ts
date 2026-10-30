import { NextResponse } from "next/server";
import { admin, BUCKET } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

async function promptOf(token: string) {
  const { data } = await admin()
    .from("vf_prompts")
    .select("id, storyteller_id")
    .eq("token", token)
    .maybeSingle();
  return data;
}

// 오늘 이야기의 표지 셀피 — 1) 업로드 주소 받기
export async function POST(_req: Request, { params }: { params: { token: string } }) {
  const p = await promptOf(params.token);
  if (!p) return NextResponse.json({ error: "링크를 찾을 수 없어요" }, { status: 404 });
  const path = `${p.storyteller_id}/${p.id}/cover-${Date.now()}.jpg`;
  const { data, error } = await admin().storage.from(BUCKET).createSignedUploadUrl(path);
  if (error || !data) return NextResponse.json({ error: "업로드 준비 실패" }, { status: 500 });
  return NextResponse.json({ path, uploadToken: data.token });
}

// 2) 올린 사진을 이 호의 표지로 저장
export async function PUT(req: Request, { params }: { params: { token: string } }) {
  const p = await promptOf(params.token);
  if (!p) return NextResponse.json({ error: "링크를 찾을 수 없어요" }, { status: 404 });
  const { path } = await req.json().catch(() => ({}));
  if (typeof path !== "string" || !path.startsWith(`${p.storyteller_id}/${p.id}/cover-`)) {
    return NextResponse.json({ error: "잘못된 사진이에요" }, { status: 400 });
  }
  const { error } = await admin().from("vf_prompts").update({ cover_path: path }).eq("id", p.id);
  if (error) return NextResponse.json({ error: "저장 실패" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
