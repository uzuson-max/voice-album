import { NextResponse } from "next/server";
import { admin, BUCKET } from "@/lib/supabaseAdmin";
import { loadFamily, unauthorized, userIdFrom } from "@/lib/auth";
import { isOpen } from "@/lib/time";

export const dynamic = "force-dynamic";

// 우리집 신문: 열린 이야기는 질문 하나 = 기사 하나 (이어 말하기 포함), 봉인된 이야기는 개수와 열리는 날만
export async function GET(req: Request) {
  const uid = await userIdFrom(req);
  if (!uid) return unauthorized();
  const { family, storyteller } = await loadFamily(uid);
  if (!storyteller) return NextResponse.json({ articles: [], sealed: [], family, storyteller });

  const db = admin();
  const sign = async (path?: string | null) =>
    path ? (await db.storage.from(BUCKET).createSignedUrl(path, 60 * 60)).data?.signedUrl || null : null;

  const { data } = await db
    .from("vf_answers")
    .select(
      "id, prompt_id, turn, asked, media_path, media_type, duration_sec, title, summary, transcript, unseal_at, created_at, " +
        "vf_prompts(text, article_title, article, photo_path, reaction_text, reaction_audio_path)"
    )
    .eq("storyteller_id", storyteller.id)
    .order("created_at", { ascending: true });

  const byPrompt: Record<string, any> = {};
  const sealedMap: Record<string, { unsealAt: string; count: number; video: number }> = {};
  for (const a of (data || []) as any[]) {
    if (!isOpen(a.unseal_at)) {
      if (a.turn) continue;
      const k = a.unseal_at as string;
      sealedMap[k] = sealedMap[k] || { unsealAt: k, count: 0, video: 0 };
      sealedMap[k].count++;
      if (a.media_type === "video") sealedMap[k].video++;
      continue;
    }
    const p = a.vf_prompts || {};
    if (!byPrompt[a.prompt_id]) {
      byPrompt[a.prompt_id] = {
        promptId: a.prompt_id,
        question: p.text,
        title: p.article_title || a.title || p.text,
        article: p.article,
        summary: a.summary,
        photoUrl: await sign(p.photo_path),
        reactionText: p.reaction_text,
        reactionAudioUrl: await sign(p.reaction_audio_path),
        createdAt: a.created_at,
        turns: [],
      };
    }
    byPrompt[a.prompt_id].turns.push({
      id: a.id,
      asked: a.turn === 0 ? p.text : a.asked,
      mediaType: a.media_type,
      duration: a.duration_sec,
      transcript: a.transcript,
      url: await sign(a.media_path),
    });
  }
  const articles = Object.values(byPrompt).sort((x: any, y: any) => String(y.createdAt).localeCompare(String(x.createdAt)));
  const sealed = Object.values(sealedMap).sort((a, b) => a.unsealAt.localeCompare(b.unsealAt));
  return NextResponse.json({ articles, sealed, family, storyteller });
}
