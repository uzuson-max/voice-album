import { NextResponse } from "next/server";
import { admin } from "@/lib/supabaseAdmin";
import { bad, loadFamily, unauthorized, userIdFrom } from "@/lib/auth";
import { QUIZ, fill } from "@/lib/quiz";

export const dynamic = "force-dynamic";

async function mine(req: Request) {
  const uid = await userIdFrom(req);
  if (!uid) return null;
  const { family, storyteller } = await loadFamily(uid);
  if (!family || !storyteller) return null;
  return { family, storyteller };
}

// 다음 카드 1장 + 지금까지 기록
export async function GET(req: Request) {
  const m = await mine(req);
  if (!m) return unauthorized();
  const { label, honorific, phone } = m.storyteller;
  const { data: rows } = await admin()
    .from("vf_quiz")
    .select("qkey, known, note, learned_at, created_at")
    .eq("family_id", m.family.id)
    .order("created_at", { ascending: false });
  const done = new Set((rows || []).map((r) => r.qkey));
  const next = QUIZ.find((q) => !done.has(q.key));
  const byKey = Object.fromEntries(QUIZ.map((q) => [q.key, q]));
  const records = (rows || [])
    .filter((r) => byKey[r.qkey])
    .map((r) => ({ ...r, q: fill(byKey[r.qkey].q, label, honorific), ask: fill(byKey[r.qkey].ask, label, honorific) }));
  return NextResponse.json({
    label, honorific, phone,
    next: next ? { key: next.key, q: fill(next.q, label, honorific), ask: fill(next.ask, label, honorific) } : null,
    records,
    total: QUIZ.length,
  });
}

// { key, known } 첫 응답 / { key, note } 답 적기 (적으면 "이제 알아요")
export async function POST(req: Request) {
  const m = await mine(req);
  if (!m) return unauthorized();
  const b = await req.json().catch(() => ({}));
  const key = String(b.key || "");
  if (!QUIZ.some((q) => q.key === key)) return bad("없는 질문이에요");
  const db = admin();
  const note = typeof b.note === "string" ? b.note.trim().slice(0, 300) : undefined;

  if (typeof b.known === "boolean") {
    const { error } = await db.from("vf_quiz").upsert(
      { family_id: m.family.id, qkey: key, known: b.known, ...(note ? { note } : {}) },
      { onConflict: "family_id,qkey" },
    );
    if (error) return bad("저장 실패", 500);
    // 다른 사용자들은 얼마나 몰랐는지 (10명 이상 쌓였을 때만 숫자로)
    const all = await db.from("vf_quiz").select("id", { count: "exact", head: true }).eq("qkey", key);
    const miss = await db.from("vf_quiz").select("id", { count: "exact", head: true }).eq("qkey", key).eq("known", false);
    const n = all.count || 0;
    return NextResponse.json({ ok: true, n, pct: n >= 10 ? Math.round(((miss.count || 0) / n) * 100) : null });
  } else if (note !== undefined) {
    const { data: cur } = await db.from("vf_quiz").select("known, learned_at").eq("family_id", m.family.id).eq("qkey", key).maybeSingle();
    if (!cur) return bad("먼저 카드에 답해주세요");
    const patch: any = { note: note || null };
    if (!cur.known && note && !cur.learned_at) patch.learned_at = new Date().toISOString();
    await db.from("vf_quiz").update(patch).eq("family_id", m.family.id).eq("qkey", key);
  } else return bad("내용이 없어요");
  return NextResponse.json({ ok: true });
}
