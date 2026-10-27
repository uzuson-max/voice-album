import { NextResponse } from "next/server";
import { admin, BUCKET } from "@/lib/supabaseAdmin";
import { loadFamily, unauthorized, userIdFrom } from "@/lib/auth";
import { isOpen } from "@/lib/time";
import { waitUntil } from "@vercel/functions";
import { processAnswer, finishPrompt } from "@/lib/process";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// 우리집 신문: 열린 이야기는 질문 하나 = 기사 하나 (이어 말하기 포함), 봉인된 이야기는 개수와 열리는 날만
export async function GET(req: Request) {
  const uid = await userIdFrom(req);
  if (!uid) return unauthorized();
  const { family, storyteller } = await loadFamily(uid);
  if (!storyteller) return NextResponse.json({ articles: [], sealed: [], family, storyteller });

  const db = admin();
  const sign = async (path?: string | null) =>
    path ? (await db.storage.from(BUCKET).createSignedUrl(path, 60 * 60 * 12)).data?.signedUrl || null : null;

  const { data } = await db
    .from("vf_answers")
    .select(
      "id, prompt_id, turn, asked, media_path, media_type, duration_sec, title, summary, transcript, process_error, unseal_at, created_at, " +
        "vf_prompts!vf_answers_prompt_id_fkey(text, ask, lead, week, finished_at, article_title, article, article_quote, photo_path, reaction_text, reaction_audio_path, reply_lead, reply_ask)"
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
        question: p.ask || p.text,
        lead: p.lead,
        week: p.week,
        title: p.article_title || a.title || p.ask || p.text,
        article: p.article,
        quote: p.article_quote,
        replyLead: p.reply_lead,
        replyAsk: p.reply_ask,
        summary: a.summary,
        photoUrl: await sign(p.photo_path),
        reactionText: p.reaction_text,
        reactionAudioUrl: await sign(p.reaction_audio_path),
        createdAt: a.created_at,
        finished: !!p.finished_at,
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
  // 받아쓰기·기사가 빠진 이야기는 열어볼 때 뒤에서 다시 돌린다 (다음에 열면 채워져 있게)
  const twoMin = Date.now() - 2 * 60 * 1000;
  const retryable = (a: any) => a.transcript === null || /^(stt|download|read):/.test(a.process_error || "");
  const stuck = ((data || []) as any[]).filter((a) => retryable(a) && new Date(a.created_at).getTime() < twoMin);
  const noArticle = Object.values(byPrompt).filter(
    (x: any) => !x.article && x.turns.some((t: any) => t.transcript) && x.finished
  );
  if (stuck.length || noArticle.length) {
    const job = (async () => {
      for (const a of stuck.slice(0, 4)) await processAnswer(a.id).catch(() => {});
      for (const x of noArticle.slice(0, 3) as any[]) {
        await db.from("vf_prompts").update({ finished_at: null }).eq("id", x.promptId);
        await finishPrompt(x.promptId).catch(() => {});
      }
      // 방금 받아쓰기가 끝난 이야기도 기사로 엮는다
      if (stuck.length) {
        const ids = Array.from(new Set(stuck.map((a) => a.prompt_id)));
        for (const id of ids.slice(0, 3)) {
          await db.from("vf_prompts").update({ finished_at: null }).eq("id", id).is("article", null);
          await finishPrompt(id).catch(() => {});
        }
      }
    })();
    try { waitUntil(job); } catch {}
  }

  const articles = Object.values(byPrompt).sort((x: any, y: any) => String(y.createdAt).localeCompare(String(x.createdAt)));
  const sealed = Object.values(sealedMap).sort((a, b) => a.unsealAt.localeCompare(b.unsealAt));
  return NextResponse.json({ articles, sealed, family, storyteller });
}
