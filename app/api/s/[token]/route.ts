import { NextResponse } from "next/server";
import { admin, BUCKET } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

async function signed(path?: string | null) {
  if (!path) return null;
  const { data } = await admin().storage.from(BUCKET).createSignedUrl(path, 60 * 60 * 3);
  return data?.signedUrl || null;
}

// 부모님 링크 — 토큰으로 질문 하나를 연다 (로그인 없음)
export async function GET(_req: Request, { params }: { params: { token: string } }) {
  const db = admin();
  const { data: p } = await db
    .from("vf_prompts")
    .select("id, storyteller_id, text, format, status, unseal_at, child_audio_path, photo_path, vf_storytellers(honorific, unseal_at, vf_families(child_name))")
    .eq("token", params.token)
    .maybeSingle();
  if (!p) return NextResponse.json({ error: "링크를 찾을 수 없어요" }, { status: 404 });
  const st: any = (p as any).vf_storytellers;

  // 지난 이야기에 자녀가 남긴 반응 (이 링크에서 처음 보여준 것만, 다시 열어도 같은 것)
  const { data: fresh } = await db
    .from("vf_prompts")
    .select("id")
    .eq("storyteller_id", p.storyteller_id)
    .not("reaction_at", "is", null)
    .is("reaction_shown_on", null);
  if (fresh?.length) {
    await db.from("vf_prompts").update({ reaction_shown_on: p.id }).in("id", fresh.map((r) => r.id));
  }
  const { data: reacts } = await db
    .from("vf_prompts")
    .select("id, text, article_title, reaction_text, reaction_audio_path")
    .eq("reaction_shown_on", p.id)
    .order("reaction_at", { ascending: false })
    .limit(3);

  const reactions = await Promise.all(
    (reacts || []).map(async (r) => ({
      about: r.article_title || r.text,
      text: r.reaction_text,
      audioUrl: await signed(r.reaction_audio_path),
    }))
  );

  return NextResponse.json({
    text: p.text,
    format: p.format,
    answered: p.status === "answered",
    honorific: st?.honorific,
    childName: st?.vf_families?.child_name,
    unsealAt: p.unseal_at || st?.unseal_at || null,
    childAudioUrl: await signed(p.child_audio_path),
    photoUrl: await signed(p.photo_path),
    reactions,
  });
}
