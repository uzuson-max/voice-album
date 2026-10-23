import { admin, BUCKET } from "./supabaseAdmin";
import { digestAnswer, transcribe } from "./ai";
import { isOpen } from "./time";

// 대답이 들어온 뒤 뒤에서: 받아쓰기 → 제목·요약 → 이어서 물을 질문 추가
export async function processAnswer(answerId: string) {
  const db = admin();
  const { data: a } = await db
    .from("vf_answers")
    .select("*, vf_prompts(text), vf_storytellers(honorific)")
    .eq("id", answerId)
    .single();
  if (!a) return;
  const question = (a as any).vf_prompts?.text || "";
  const honorific = (a as any).vf_storytellers?.honorific || "부모님";

  let transcript: string | null = null;
  try {
    const { data: file } = await db.storage.from(BUCKET).download(a.media_path);
    // Whisper 한도 25MB — 대부분의 음성은 들어가고, 긴 영상은 건너뛴다
    if (file && file.size < 24 * 1024 * 1024) {
      transcript = await transcribe(await file.arrayBuffer(), a.mime || "audio/webm");
    }
  } catch (e: any) {
    console.error("[process] STT 실패", e?.message);
  }

  let title = question.slice(0, 24);
  let summary: string | null = null;
  let followup: string | null = null;
  if (transcript && transcript.trim().length > 10) {
    try {
      const d = await digestAnswer({ honorific, question, transcript });
      title = d.title || title;
      summary = d.summary || null;
      followup = d.followup;
    } catch (e: any) {
      console.error("[process] 요약 실패", e?.message);
    }
  }
  await db.from("vf_answers").update({ transcript, title, summary }).eq("id", answerId);

  // 이어지는 질문은 다음 차례로 끼워 넣는다 (자녀가 질문함에서 고치거나 지울 수 있다)
  if (followup) {
    const { data: first } = await db
      .from("vf_prompts")
      .select("position")
      .eq("storyteller_id", a.storyteller_id)
      .eq("status", "queued")
      .order("position")
      .limit(1)
      .maybeSingle();
    await db.from("vf_prompts").insert({
      storyteller_id: a.storyteller_id,
      text: followup,
      format: "audio",
      source: "followup",
      position: (first?.position ?? 0) - 1,
      from_answer_id: a.id,
      // 봉인된 대답에서 나온 질문은 자녀에게 내용을 숨긴다 (열리는 날의 설렘을 지키기 위해)
      masked: !isOpen(a.unseal_at),
    });
  }
}
