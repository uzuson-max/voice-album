import { NextResponse } from "next/server";
import { admin } from "@/lib/supabaseAdmin";
import { waitTranscript } from "@/lib/process";
import { hostTurn } from "@/lib/ai";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// 방금 대답에 대한 진행자 한마디 + 이어서 물을 질문 (없으면 마무리)
export async function POST(req: Request, { params }: { params: { token: string } }) {
  const { answerId } = await req.json().catch(() => ({}));
  const db = admin();
  const { data: p } = await db
    .from("vf_prompts")
    .select("id, text, vf_storytellers(honorific, vf_families(child_name))")
    .eq("token", params.token)
    .maybeSingle();
  if (!p) return NextResponse.json({ error: "링크를 찾을 수 없어요" }, { status: 404 });
  const st: any = (p as any).vf_storytellers;

  const a = await waitTranscript(String(answerId || ""));
  if (!a || a.prompt_id !== p.id) return NextResponse.json({ react: "말씀 잘 들었어요.", followup: null });
  if (a.react) return NextResponse.json({ react: a.react, followup: a.followup, video: false });
  if (!a.transcript || a.transcript.trim().length < 4) {
    return NextResponse.json({ react: "말씀 잘 들었어요.", followup: null });
  }

  const { count: videos } = await db
    .from("vf_answers")
    .select("id", { count: "exact", head: true })
    .eq("prompt_id", p.id)
    .eq("media_type", "video");

  try {
    const r = await hostTurn({
      honorific: st?.honorific || "부모님",
      childName: st?.vf_families?.child_name || "",
      question: a.turn === 0 ? p.text : a.asked || p.text,
      transcript: a.transcript,
      turn: a.turn,
      videoDone: (videos || 0) > 0,
    });
    await db.from("vf_answers").update({ react: r.react, followup: r.followup }).eq("id", a.id);
    return NextResponse.json(r);
  } catch {
    return NextResponse.json({ react: "말씀 잘 들었어요.", followup: null });
  }
}
