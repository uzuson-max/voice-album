import { NextResponse } from "next/server";
import { admin, BUCKET } from "@/lib/supabaseAdmin";
import { loadFamily, unauthorized, userIdFrom } from "@/lib/auth";
import { isOpen } from "@/lib/time";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function ext(mime?: string | null, type?: string) {
  const m = String(mime || "");
  if (m.includes("mp4")) return "mp4";
  if (m.includes("mpeg")) return "mp3";
  if (m.includes("ogg")) return "ogg";
  if (m.includes("wav")) return "wav";
  if (m.includes("quicktime")) return "mov";
  return type === "video" ? "webm" : "webm";
}

function safe(s: string) {
  return s.replace(/[\\/:*?"<>|\n\r]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 40) || "이야기";
}

// 원본 전체 내려받기: 열린 이야기의 녹음·영상마다 내려받기 주소(12시간) + 글 모음
export async function GET(req: Request) {
  const uid = await userIdFrom(req);
  if (!uid) return unauthorized();
  const { storyteller } = await loadFamily(uid);
  if (!storyteller) return NextResponse.json({ files: [], text: "" });

  const db = admin();
  const { data } = await db
    .from("vf_answers")
    .select("id, turn, media_path, media_type, mime, transcript, unseal_at, created_at, vf_prompts!vf_answers_prompt_id_fkey(text, ask, article_title, article)")
    .eq("storyteller_id", storyteller.id)
    .order("created_at", { ascending: true });

  const files: { name: string; type: string; url: string | null; date: string }[] = [];
  const seen = new Set<string>();
  const parts: string[] = [];
  let n = 0;
  for (const a of (data || []) as any[]) {
    if (!isOpen(a.unseal_at)) continue;
    const p = a.vf_prompts || {};
    const date = String(a.created_at).slice(0, 10);
    if (a.turn === 0) n++;
    const title = safe(p.article_title || p.ask || p.text || "이야기");
    const name = `${String(n).padStart(2, "0")}_${date}_${title}${a.turn ? `_이어서${a.turn}` : ""}.${ext(a.mime, a.media_type)}`;
    const { data: s } = await db.storage.from(BUCKET).createSignedUrl(a.media_path, 60 * 60 * 12, { download: name });
    files.push({ name, type: a.media_type, url: s?.signedUrl || null, date });

    const key = String(n);
    if (!seen.has(key)) {
      seen.add(key);
      parts.push(`${n}. ${p.article_title || p.ask || p.text || ""} (${date})\n\n질문: ${p.ask || p.text || ""}\n\n${p.article || a.transcript || ""}`);
    }
  }
  return NextResponse.json({
    label: storyteller.label,
    files,
    text: parts.join("\n\n────────\n\n"),
  });
}
