import { NextResponse } from "next/server";
import { admin, BUCKET } from "@/lib/supabaseAdmin";
import { loadFamily, unauthorized, userIdFrom } from "@/lib/auth";
import { isOpen } from "@/lib/time";

export const dynamic = "force-dynamic";

// 열린 이야기는 재생 주소와 함께, 봉인된 이야기는 개수와 열리는 날만 (내용은 절대 내려보내지 않음)
export async function GET(req: Request) {
  const uid = await userIdFrom(req);
  if (!uid) return unauthorized();
  const { family, storyteller } = await loadFamily(uid);
  if (!storyteller) return NextResponse.json({ opened: [], sealed: [], family, storyteller });

  const db = admin();
  const { data } = await db
    .from("vf_answers")
    .select("id, media_path, media_type, duration_sec, title, summary, transcript, unseal_at, created_at, vf_prompts(text)")
    .eq("storyteller_id", storyteller.id)
    .order("created_at", { ascending: false });

  const opened: any[] = [];
  const sealedMap: Record<string, { unsealAt: string; count: number; video: number }> = {};
  for (const a of data || []) {
    if (isOpen(a.unseal_at)) {
      const { data: s } = await db.storage.from(BUCKET).createSignedUrl(a.media_path, 60 * 60);
      opened.push({
        id: a.id,
        question: (a as any).vf_prompts?.text,
        title: a.title,
        summary: a.summary,
        transcript: a.transcript,
        mediaType: a.media_type,
        duration: a.duration_sec,
        url: s?.signedUrl,
        createdAt: a.created_at,
      });
    } else {
      const k = a.unseal_at as string;
      sealedMap[k] = sealedMap[k] || { unsealAt: k, count: 0, video: 0 };
      sealedMap[k].count++;
      if (a.media_type === "video") sealedMap[k].video++;
    }
  }
  const sealed = Object.values(sealedMap).sort((a, b) => a.unsealAt.localeCompare(b.unsealAt));
  return NextResponse.json({ opened, sealed, family, storyteller });
}
