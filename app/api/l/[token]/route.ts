import { NextResponse } from "next/server";
import { admin, BUCKET } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

// 잡지 QR로 여는 '목소리 듣기' — 로그인 없이, 이 호의 녹음·영상만
export async function GET(_req: Request, { params }: { params: { token: string } }) {
  const db = admin();
  const { data: p } = await db
    .from("vf_prompts")
    .select("id, text, ask, week, article_title, status, vf_storytellers(label, profile)")
    .eq("token", params.token)
    .maybeSingle();
  if (!p || p.status !== "answered") return NextResponse.json({ error: "들을 수 있는 이야기가 없어요" }, { status: 404 });
  const { data: answers } = await db
    .from("vf_answers")
    .select("media_path, media_type, duration_sec, turn, created_at")
    .eq("prompt_id", p.id)
    .order("turn")
    .order("created_at");
  const turns = await Promise.all(
    (answers || []).map(async (a) => {
      const { data } = await db.storage.from(BUCKET).createSignedUrl(a.media_path, 60 * 60 * 3);
      return { url: data?.signedUrl || null, video: a.media_type === "video", sec: a.duration_sec };
    })
  );
  const st: any = (p as any).vf_storytellers;
  return NextResponse.json({
    label: st?.label || "부모님",
    name: String(st?.profile?.["표지 이름"] || "").trim() || null,
    week: p.week,
    title: p.article_title || p.ask || p.text,
    turns: turns.filter((t) => t.url),
  });
}
