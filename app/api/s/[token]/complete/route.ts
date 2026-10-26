import { NextResponse } from "next/server";
import { waitUntil } from "@vercel/functions";
import { admin, BUCKET } from "@/lib/supabaseAdmin";
import { processAnswer } from "@/lib/process";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// 대답 저장. turn 0 = 첫 대답, 1~2 = 이어 말하기 (asked = 그 직전에 들은 질문)
export async function POST(req: Request, { params }: { params: { token: string } }) {
  const { path, mime, duration, turn, asked, kind } = await req.json().catch(() => ({}));
  const db = admin();
  const { data: p } = await db
    .from("vf_prompts")
    .select("id, storyteller_id, format, unseal_at, vf_storytellers(unseal_at)")
    .eq("token", params.token)
    .maybeSingle();
  if (!p) return NextResponse.json({ error: "링크를 찾을 수 없어요" }, { status: 404 });
  if (typeof path !== "string" || !path.startsWith(`${p.storyteller_id}/${p.id}/`)) {
    return NextResponse.json({ error: "잘못된 파일" }, { status: 400 });
  }
  // 빈 파일이면 저장하지 않고 다시 녹음하게 한다 ("잘 담았어요"가 거짓말이 되지 않게)
  const dir = path.slice(0, path.lastIndexOf("/"));
  const name = path.slice(path.lastIndexOf("/") + 1);
  const { data: listed } = await db.storage.from(BUCKET).list(dir, { search: name, limit: 1 });
  const size = Number((listed?.[0] as any)?.metadata?.size ?? -1);
  if (size === 0) {
    await db.storage.from(BUCKET).remove([path]).catch(() => {});
    return NextResponse.json({ ok: false, empty: true, error: "녹음이 비어 있어요" });
  }

  const t = Number.isInteger(turn) ? Math.max(0, Math.min(3, turn)) : 0;
  const mediaType = t === 0 ? p.format : kind === "video" ? "video" : "audio";
  const unsealAt = p.unseal_at || (p as any).vf_storytellers?.unseal_at || null;

  const { data: answer, error } = await db
    .from("vf_answers")
    .insert({
      prompt_id: p.id,
      storyteller_id: p.storyteller_id,
      media_path: path,
      media_type: mediaType,
      mime: mime || null,
      duration_sec: Number.isFinite(duration) ? Math.round(duration) : null,
      unseal_at: unsealAt,
      turn: t,
      asked: t > 0 && typeof asked === "string" ? asked.slice(0, 200) : null,
    })
    .select("id")
    .single();
  if (error || !answer) return NextResponse.json({ error: "저장 실패" }, { status: 500 });

  if (t === 0) await db.from("vf_prompts").update({ status: "answered", snooze_until: null }).eq("id", p.id);

  const job = processAnswer(answer.id).catch((e) => console.error("[complete] 처리 실패", e?.message));
  try {
    waitUntil(job);
  } catch {}

  return NextResponse.json({ ok: true, unsealAt, answerId: answer.id });
}
