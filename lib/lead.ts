import { admin } from "./supabaseAdmin";
import { timeTravel } from "./ai";

// 부모님이 듣는 버전(빌드업 + 그때를 짚은 질문)이 없으면 만들어 저장한다. 실패해도 원래 질문으로 진행.
export async function ensureLead(promptId: string): Promise<{ lead: string | null; ask: string | null }> {
  const db = admin();
  const { data: p } = await db
    .from("vf_prompts")
    .select("id, text, lead, ask, vf_storytellers(honorific, profile, vf_families(child_name))")
    .eq("id", promptId)
    .maybeSingle();
  if (!p) return { lead: null, ask: null };
  if (p.lead) return { lead: p.lead, ask: p.ask };
  const st: any = (p as any).vf_storytellers;
  try {
    const t = await timeTravel({
      honorific: st?.honorific || "부모님",
      childName: st?.vf_families?.child_name || "",
      profile: st?.profile || {},
      question: p.text,
    });
    await db.from("vf_prompts").update({ lead: t.lead || null, ask: t.ask || null }).eq("id", p.id);
    return { lead: t.lead || null, ask: t.ask || null };
  } catch (e: any) {
    console.error("[lead]", e?.message);
    return { lead: null, ask: null };
  }
}
