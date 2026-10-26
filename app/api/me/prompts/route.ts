import { NextResponse } from "next/server";
import { admin } from "@/lib/supabaseAdmin";
import { bad, loadFamily, unauthorized, userIdFrom } from "@/lib/auth";
import { isOpen } from "@/lib/time";

export const dynamic = "force-dynamic";

async function mine(req: Request) {
  const uid = await userIdFrom(req);
  if (!uid) return null;
  const { family, storyteller } = await loadFamily(uid);
  return storyteller ? { family, storyteller } : null;
}

export async function GET(req: Request) {
  const m = await mine(req);
  if (!m) return unauthorized();
  const db = admin();
  const [{ data }, { data: recent }] = await Promise.all([
    db
    .from("vf_prompts")
    .select("id, text, ask, week, format, source, status, position, sent_at, reminder_count, unseal_at, masked, child_audio_path, photo_path")
    .eq("storyteller_id", m.storyteller.id)
    .order("position")
    .order("created_at"),
    db
    .from("vf_answers")
    .select("title, summary, unseal_at, created_at")
    .eq("storyteller_id", m.storyteller.id)
    .not("summary", "is", null)
    .order("created_at", { ascending: false })
    .limit(5),
  ]);
  // 봉인된 대답에서 나온 질문은 문장을 숨긴다
  const all = (data || []).map(({ child_audio_path, photo_path, ...p }) => ({
    ...p,
    hasVoice: !!child_audio_path,
    hasPhoto: !!photo_path,
    ...(p.masked ? { text: "봉인된 이야기에서 이어진 질문이에요. 열리는 날 함께 공개돼요." } : {}),
  }));

  // AI 한 줄: 가장 최근에 열린 이야기 요약
  const opened = (recent || []).find((r) => isOpen(r.unseal_at));
  const sealedCount = (recent || []).filter((r) => !isOpen(r.unseal_at)).length;
  const insight = opened
    ? { kind: "open", title: opened.title, summary: opened.summary }
    : sealedCount
    ? { kind: "sealed" }
    : null;

  return NextResponse.json({
    insight,
    queued: all.filter((p) => p.status === "queued"),
    sent: all
      .filter((p) => p.status !== "queued")
      .sort((a, b) => String(b.sent_at).localeCompare(String(a.sent_at))),
    storyteller: m.storyteller,
    family: m.family,
  });
}

// 질문 여러 개를 맨 뒤에 추가
export async function POST(req: Request) {
  const m = await mine(req);
  if (!m) return unauthorized();
  const { items, replaceQueued } = await req.json().catch(() => ({}));
  if (!Array.isArray(items) || !items.length) return bad("질문이 없어요");
  const db = admin();
  // 12주 과정으로 새로 채울 때: 아직 안 보낸 질문은 비운다
  if (replaceQueued) await db.from("vf_prompts").delete().eq("storyteller_id", m.storyteller.id).eq("status", "queued");
  const { data: last } = await db
    .from("vf_prompts")
    .select("position")
    .eq("storyteller_id", m.storyteller.id)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();
  let pos = (last?.position ?? 0) + 1;
  const str = (v: any, n: number) => (typeof v === "string" && v.trim() ? v.trim().slice(0, n) : null);
  const rows = items
    .filter((q: any) => String(q.text || q.ask || "").trim())
    .slice(0, 60)
    .map((q: any) => ({
      storyteller_id: m.storyteller.id,
      text: String(q.text || q.ask).trim().slice(0, 200),
      format: q.format === "video" ? "video" : "audio",
      source: ["library", "ai", "custom"].includes(q.source) ? q.source : "custom",
      unseal_at: q.unsealAt || null,
      position: pos++,
      // 12주 과정 질문: 장면·질문이 이미 완성돼 있어서 AI 빌드업을 건너뛴다
      week: Number.isInteger(q.week) ? q.week : null,
      lead: str(q.lead, 300),
      ask: str(q.ask, 200),
      half: str(q.half, 200),
      hint: str(q.hint, 200),
      reply_lead: str(q.replyLead, 300),
      reply_ask: str(q.replyAsk, 200),
    }));
  const { error } = await db.from("vf_prompts").insert(rows);
  if (error) return bad("저장 실패", 500);
  return NextResponse.json({ ok: true });
}

// 수정 / 순서 이동 (보내기 전 질문만)
export async function PATCH(req: Request) {
  const m = await mine(req);
  if (!m) return unauthorized();
  const b = await req.json().catch(() => ({}));
  const db = admin();
  const { data: p } = await db
    .from("vf_prompts")
    .select("*")
    .eq("id", b.id)
    .eq("storyteller_id", m.storyteller.id)
    .eq("status", "queued")
    .maybeSingle();
  if (!p) return bad("질문을 찾을 수 없어요", 404);

  if (b.move === "up" || b.move === "down") {
    const { data: q } = await db
      .from("vf_prompts")
      .select("id, position")
      .eq("storyteller_id", m.storyteller.id)
      .eq("status", "queued")
      .order("position");
    const list = q || [];
    const i = list.findIndex((x) => x.id === p.id);
    const j = b.move === "up" ? i - 1 : i + 1;
    if (i >= 0 && j >= 0 && j < list.length) {
      [list[i], list[j]] = [list[j], list[i]];
      await Promise.all(list.map((x, k) => db.from("vf_prompts").update({ position: k }).eq("id", x.id)));
    }
  } else {
    const patch: any = {};
    if (typeof b.text === "string" && b.text.trim() && !p.masked) patch.text = b.text.trim().slice(0, 200);
    if (b.format === "audio" || b.format === "video") patch.format = b.format;
    await db.from("vf_prompts").update(patch).eq("id", p.id);
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const m = await mine(req);
  if (!m) return unauthorized();
  const id = new URL(req.url).searchParams.get("id");
  await admin().from("vf_prompts").delete().eq("id", id).eq("storyteller_id", m.storyteller.id).eq("status", "queued");
  return NextResponse.json({ ok: true });
}
