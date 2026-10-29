import { NextResponse } from "next/server";
import { admin, BUCKET } from "@/lib/supabaseAdmin";
import { ensureLead } from "@/lib/lead";
import { kstParts, SEND_DAYS, WEEKDAYS } from "@/lib/time";

export const dynamic = "force-dynamic";

async function signed(path?: string | null) {
  if (!path) return null;
  const { data } = await admin().storage.from(BUCKET).createSignedUrl(path, 60 * 60 * 3);
  return data?.signedUrl || null;
}

// 자녀가 결제 전에 "부모님이 받는 화면"을 직접 체험하는 데모 (DB를 건드리지 않음)
// /s/demo?c=재빈이&h=어머니
function demo(req: Request) {
  const q = new URL(req.url).searchParams;
  const childName = (q.get("c") || "지은이").slice(0, 12);
  const honorific = (q.get("h") || "어머니").slice(0, 8);
  return NextResponse.json({
    demo: true,
    firstEver: true,
    next: { day: "토요일", lead: "스무 살의 그 사람이 거울 앞에 서 있어요." },
    text: "그 소식을 들은 순간, 제일 먼저 든 마음이 뭐였어요? 기뻤는지, 겁났는지, 솔직하게요.",
    lead: "아직 누구의 부모도 아니던 때가 있어요. 그리고 어느 날, 제가 생겼다는 걸 알게 됐어요.",
    hint: null,
    format: "audio",
    answered: false,
    honorific,
    childName,
    unsealAt: null,
    childAudioUrl: null,
    photoUrl: null,
    reactions: [],
  });
}

// 부모님 링크 — 토큰으로 질문 하나를 연다 (로그인 없음)
export async function GET(req: Request, { params }: { params: { token: string } }) {
  if (params.token === "demo") return demo(req);
  const db = admin();
  const { data: p } = await db
    .from("vf_prompts")
    .select("id, storyteller_id, text, format, status, sent_at, unseal_at, child_audio_path, photo_path, hint, vf_storytellers(honorific, unseal_at, vf_families(child_name))")
    .eq("token", params.token)
    .maybeSingle();
  if (!p) return NextResponse.json({ error: "링크를 찾을 수 없어요" }, { status: 404 });
  const st: any = (p as any).vf_storytellers;
  const t = await ensureLead(p.id);

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

  // 다음 질문 예고: 다음 발송 요일 + 다음 질문의 장면(질문 자체는 그날 공개)
  const { data: nx } = await db
    .from("vf_prompts")
    .select("lead, text")
    .eq("storyteller_id", p.storyteller_id)
    .eq("status", "queued")
    .order("created_at")
    .limit(1)
    .maybeSingle();
  let next: { day: string; lead: string | null } | null = null;
  if (nx) {
    const today = kstParts().weekday;
    let d = 1;
    while (d < 8 && !SEND_DAYS.includes((today + d) % 7)) d++;
    next = { day: `${WEEKDAYS[(today + d) % 7]}요일`, lead: nx.lead || null };
  }

  // 이 부모님께 간 첫 질문이면, 질문 전에 "초대" 화면부터 보여준다
  const { count: earlier } = await db
    .from("vf_prompts")
    .select("id", { count: "exact", head: true })
    .eq("storyteller_id", p.storyteller_id)
    .neq("id", p.id)
    .not("sent_at", "is", null)
    .lt("sent_at", (p as any).sent_at || new Date().toISOString());

  return NextResponse.json({
    firstEver: !earlier,
    next,
    text: t.ask || p.text,
    lead: t.lead,
    hint: (p as any).hint || null,
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
