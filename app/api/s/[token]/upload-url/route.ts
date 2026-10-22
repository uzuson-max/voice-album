import { NextResponse } from "next/server";
import { admin, BUCKET } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

// 큰 영상은 서버를 거치지 않고 저장소로 바로 올린다 (서명된 업로드 주소 발급)
export async function POST(req: Request, { params }: { params: { token: string } }) {
  const { mime } = await req.json().catch(() => ({}));
  const db = admin();
  const { data: p } = await db
    .from("vf_prompts")
    .select("id, storyteller_id, status")
    .eq("token", params.token)
    .maybeSingle();
  if (!p) return NextResponse.json({ error: "링크를 찾을 수 없어요" }, { status: 404 });

  const m = String(mime || "audio/webm");
  const ext = m.includes("mp4") ? "mp4" : m.includes("ogg") ? "ogg" : "webm";
  const path = `${p.storyteller_id}/${p.id}/${Date.now()}.${ext}`;
  const { data, error } = await db.storage.from(BUCKET).createSignedUploadUrl(path);
  if (error || !data) return NextResponse.json({ error: "업로드 준비 실패" }, { status: 500 });
  return NextResponse.json({ path, uploadToken: data.token });
}
