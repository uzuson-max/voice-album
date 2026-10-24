import { NextResponse } from "next/server";
import { admin, BUCKET } from "@/lib/supabaseAdmin";
import { bad, loadFamily, unauthorized, userIdFrom } from "@/lib/auth";

export const dynamic = "force-dynamic";

// 자녀가 질문에 붙이는 것들: 내 목소리 질문(question) / 사진(photo) / 빨간펜 음성 반응(reaction)
const COL: Record<string, string> = {
  question: "child_audio_path",
  photo: "photo_path",
  reaction: "reaction_audio_path",
};

async function myPrompt(req: Request, promptId: string) {
  const uid = await userIdFrom(req);
  if (!uid) return null;
  const { storyteller } = await loadFamily(uid);
  if (!storyteller) return null;
  const { data: p } = await admin()
    .from("vf_prompts")
    .select("id, storyteller_id, status")
    .eq("id", promptId)
    .eq("storyteller_id", storyteller.id)
    .maybeSingle();
  return p;
}

// 업로드 주소 발급: { target, promptId, mime }
export async function POST(req: Request) {
  const b = await req.json().catch(() => ({}));
  if (!COL[b.target]) return bad("잘못된 요청");
  const p = await myPrompt(req, String(b.promptId || ""));
  if (!p) return unauthorized();
  const m = String(b.mime || "");
  const ext = m.includes("jpeg") || m.includes("jpg") ? "jpg" : m.includes("png") ? "png" : m.includes("webp") ? "webp"
    : m.includes("mp4") ? "mp4" : m.includes("ogg") ? "ogg" : "webm";
  const path = `${p.storyteller_id}/child/${p.id}/${b.target}-${Date.now()}.${ext}`;
  const { data, error } = await admin().storage.from(BUCKET).createSignedUploadUrl(path);
  if (error || !data) return bad("업로드 준비 실패", 500);
  return NextResponse.json({ path, uploadToken: data.token });
}

// 저장: { target, promptId, path } / 빨간펜 글: { target: "text", promptId, text }
export async function PUT(req: Request) {
  const b = await req.json().catch(() => ({}));
  const p = await myPrompt(req, String(b.promptId || ""));
  if (!p) return unauthorized();
  const db = admin();
  if (b.target === "text") {
    const text = String(b.text || "").trim().slice(0, 500);
    await db
      .from("vf_prompts")
      .update(text ? { reaction_text: text, reaction_at: new Date().toISOString(), reaction_shown_on: null } : { reaction_text: null })
      .eq("id", p.id);
    return NextResponse.json({ ok: true });
  }
  const col = COL[b.target];
  if (!col) return bad("잘못된 요청");
  if (typeof b.path !== "string" || !b.path.startsWith(`${p.storyteller_id}/child/${p.id}/`)) return bad("잘못된 파일");
  const patch: any = { [col]: b.path };
  if (b.target === "reaction") Object.assign(patch, { reaction_at: new Date().toISOString(), reaction_shown_on: null });
  await db.from("vf_prompts").update(patch).eq("id", p.id);
  return NextResponse.json({ ok: true });
}

// 지우기: ?target=question|photo|reaction&promptId=
export async function DELETE(req: Request) {
  const u = new URL(req.url);
  const target = u.searchParams.get("target") || "";
  const p = await myPrompt(req, u.searchParams.get("promptId") || "");
  if (!p) return unauthorized();
  if (!COL[target]) return bad("잘못된 요청");
  await admin().from("vf_prompts").update({ [COL[target]]: null }).eq("id", p.id);
  return NextResponse.json({ ok: true });
}
