import { NextResponse } from "next/server";
import { admin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

// 부모님 링크 화면 단계 기록 (어디서 멈추는지 보려고). 실패해도 화면엔 영향 없음.
const KINDS = new Set(["open", "begin", "begin_silent", "ready", "rec_start", "rec_stop", "rec_fail", "retry", "send", "sent", "later", "followup", "finish", "leave"]);

export async function POST(req: Request, { params }: { params: { token: string } }) {
  const b = await req.json().catch(() => ({}));
  const kind = String(b.kind || "");
  if (!KINDS.has(kind)) return NextResponse.json({ ok: false });
  const db = admin();
  const { data: p } = await db.from("vf_prompts").select("id, storyteller_id").eq("token", params.token).maybeSingle();
  if (!p) return NextResponse.json({ ok: false });
  const detail = b.detail && typeof b.detail === "object" ? b.detail : null;
  await db.from("vf_events").insert({
    prompt_id: p.id,
    storyteller_id: p.storyteller_id,
    kind,
    detail,
    ua: (req.headers.get("user-agent") || "").slice(0, 200),
  });
  return NextResponse.json({ ok: true });
}
