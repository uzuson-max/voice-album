import { admin, BUCKET } from "./supabaseAdmin";
import { digestAnswer, transcribe, writeArticle } from "./ai";
import { isOpen } from "./time";

// 대답이 들어온 뒤 뒤에서: 받아쓰기 → (첫 대답이면) 제목·요약
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

  // 받아쓰기는 바로 저장 — 진행자 한마디(/next)가 요약을 기다리지 않게
  await db.from("vf_answers").update({ transcript: transcript ?? "" }).eq("id", answerId);

  const patch: any = {};
  if (a.turn === 0) {
    patch.title = question.slice(0, 24);
    if (transcript && transcript.trim().length > 10) {
      try {
        const d = await digestAnswer({ honorific, question, transcript });
        patch.title = d.title || patch.title;
        patch.summary = d.summary || null;
      } catch (e: any) {
        console.error("[process] 요약 실패", e?.message);
      }
    }
  }
  if (Object.keys(patch).length) await db.from("vf_answers").update(patch).eq("id", answerId);
}

// 받아쓰기가 끝날 때까지 기다린다 (최대 ms)
export async function waitTranscript(answerId: string, ms = 45000): Promise<any | null> {
  const db = admin();
  const until = Date.now() + ms;
  while (Date.now() < until) {
    const { data } = await db.from("vf_answers").select("*").eq("id", answerId).maybeSingle();
    if (data && data.transcript !== null) return data;
    await new Promise((r) => setTimeout(r, 700));
  }
  return null;
}

// 한 질문의 이야기 시간이 끝나면: 우리집 신문 기사 + 다음 주 이어지는 질문 (한 번만)
export async function finishPrompt(promptId: string) {
  const db = admin();
  const { data: p } = await db
    .from("vf_prompts")
    .select("*, vf_storytellers(id, honorific, unseal_at, vf_families(child_name))")
    .eq("id", promptId)
    .maybeSingle();
  if (!p || p.finished_at) return;
  // 먼저 표시해서 두 번 돌지 않게
  const { data: lock } = await db
    .from("vf_prompts")
    .update({ finished_at: new Date().toISOString() })
    .eq("id", promptId)
    .is("finished_at", null)
    .select("id");
  if (!lock?.length) return;

  const st: any = (p as any).vf_storytellers;
  const { data: answers } = await db
    .from("vf_answers")
    .select("id, turn, asked, transcript, unseal_at")
    .eq("prompt_id", promptId)
    .order("turn")
    .order("created_at");
  // 한 달에 한 번 '하나 더'(노래·이름 부르기·가족에게)는 기사에 섞지 않고 목소리 카드로 따로 둔다
  const encoreWeek = !!(p.week && p.half);
  const turns = (answers || [])
    .filter((a) => !(encoreWeek && a.turn > 0))
    .filter((a) => a.transcript && a.transcript.trim().length > 5)
    .map((a) => ({ asked: a.turn === 0 ? p.ask || p.text : a.asked || "", transcript: a.transcript as string }));
  if (!turns.length) return;

  try {
    const art = await writeArticle({
      honorific: st?.honorific || "부모님",
      childName: st?.vf_families?.child_name || "",
      question: p.ask || p.text,
      turns,
    });
    await db
      .from("vf_prompts")
      .update({ article_title: art.title || null, article: art.body || null, article_quote: art.quote || null })
      .eq("id", promptId);

    // 12주 과정 질문은 순서가 정해져 있어서 AI 이어지는 질문을 끼워 넣지 않는다
    if (art.nextQuestion && !p.week) {
      const { data: first } = await db
        .from("vf_prompts")
        .select("position")
        .eq("storyteller_id", p.storyteller_id)
        .eq("status", "queued")
        .order("position")
        .limit(1)
        .maybeSingle();
      const unseal = answers?.[0]?.unseal_at ?? null;
      await db.from("vf_prompts").insert({
        storyteller_id: p.storyteller_id,
        text: art.nextQuestion,
        format: "audio",
        source: "followup",
        position: (first?.position ?? 0) - 1,
        from_answer_id: answers?.[0]?.id ?? null,
        // 봉인된 대답에서 나온 질문은 자녀에게 내용을 숨긴다 (열리는 날의 설렘을 지키기 위해)
        masked: !isOpen(unseal),
      });
    }
  } catch (e: any) {
    console.error("[finish] 기사 실패", e?.message);
    await db.from("vf_prompts").update({ finished_at: null }).eq("id", promptId);
  }
}

// 놓친 처리 되살리기 (매시간): 받아쓰기가 안 된 대답, 기사가 안 나온 이야기
export async function healPending(limit = 4) {
  const db = admin();
  const log: any[] = [];
  const tenMin = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const { data: stuck } = await db
    .from("vf_answers")
    .select("id")
    .is("transcript", null)
    .lt("created_at", tenMin)
    .order("created_at", { ascending: false })
    .limit(limit);
  for (const a of stuck || []) {
    await processAnswer(a.id).catch(() => {});
    log.push({ healedAnswer: a.id });
  }
  // 끝났는데 기사가 없는 이야기 → 다시 엮기 (받아쓰기가 있는 것만)
  const { data: noArticle } = await db
    .from("vf_prompts")
    .select("id, vf_answers!inner(transcript)")
    .not("finished_at", "is", null)
    .is("article", null)
    .not("vf_answers.transcript", "is", null)
    .neq("vf_answers.transcript", "")
    .limit(limit);
  for (const p of noArticle || []) {
    await db.from("vf_prompts").update({ finished_at: null }).eq("id", p.id);
    await finishPrompt(p.id).catch(() => {});
    log.push({ healedArticle: p.id });
  }
  return log;
}
