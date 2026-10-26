import { admin } from "./supabaseAdmin";
import { timeTravel } from "./ai";

// 부모님이 듣는 버전(빌드업 + 그때를 짚은 질문)이 없으면 만들어 저장한다. 실패해도 원래 질문으로 진행.
export async function ensureLead(promptId: string): Promise<{ lead: string | null; ask: string | null }> {
  const db = admin();
  const { data: p } = await db
    .from("vf_prompts")
    .select("id, text, lead, ask, week, vf_storytellers(honorific, profile, vf_families(child_name))")
    .eq("id", promptId)
    .maybeSingle();
  if (!p) return { lead: null, ask: null };
  // 12주 과정 질문은 장면이 일부러 없는 주도 있다 — AI가 지어내지 않게 그대로 쓴다
  if (p.lead || p.week) return { lead: p.lead, ask: p.ask };
  const st: any = (p as any).vf_storytellers;
  try {
    const t = await timeTravel({
      honorific: st?.honorific || "부모님",
      childName: st?.vf_families?.child_name || "",
      profile: st?.profile || {},
      question: p.text,
    });
    // 질문 문장은 자녀가 고른 그대로 둔다. AI가 다시 쓰면 "그때의 경험 중 어떤 교훈이…"처럼
    // 주어가 빠지고 모호해져서, AI는 앞에 깔아주는 장면(lead)만 만든다.
    await db.from("vf_prompts").update({ lead: t.lead || null, ask: p.text }).eq("id", p.id);
    return { lead: t.lead || null, ask: p.text };
  } catch (e: any) {
    console.error("[lead]", e?.message);
    return { lead: null, ask: null };
  }
}
