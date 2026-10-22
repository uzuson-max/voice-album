// OpenAI 호출 (gpt-4o-mini, whisper-1). SDK 없이 fetch만 쓴다.
const KEY = () => process.env.OPENAI_API_KEY!;

async function chatJSON(system: string, user: string): Promise<any> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${KEY()}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: 0.7,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });
  if (!res.ok) throw new Error("AI 실패: " + (await res.text()));
  const j = await res.json();
  return JSON.parse(j.choices[0].message.content);
}

const TONE = `너는 자녀가 부모님께 보내는 인생 질문을 쓰는 사람이다.
규칙:
- 존댓말, 말 걸듯 자연스러운 한 문장. 40자 안팎.
- 답하기 쉬운 구체적인 질문 하나. 여러 개 묻지 않는다.
- 유언·죽음·이별을 떠올리게 하는 표현 금지. 미래의 자녀를 위한 말로 표현한다.
- "녹음", "기록" 같은 단어 금지.`;

export type Q = { text: string; format: "audio" | "video" };

// 자녀가 적은 부모님 정보로 맞춤 질문 10개
export async function recommendQuestions(input: {
  honorific: string;
  childName: string;
  profile: Record<string, string>;
}): Promise<Q[]> {
  const profile = Object.entries(input.profile)
    .filter(([, v]) => v?.trim())
    .map(([k, v]) => `${k}: ${v}`)
    .join("\n");
  const out = await chatJSON(
    TONE +
      `\n- 앞쪽은 가벼운 사실 질문(audio), 뒤로 갈수록 마음이 뭉클해지는 질문. 뭉클한 질문 3개는 format을 video로.
- JSON: {"questions":[{"text":"...","format":"audio"|"video"}]} 정확히 10개.`,
    `부모님 호칭: ${input.honorific}\n자녀 이름: ${input.childName}\n부모님 정보:\n${profile || "(없음)"}`
  );
  return (out.questions || []).slice(0, 10).map((q: any) => ({
    text: String(q.text).trim(),
    format: q.format === "video" ? "video" : "audio",
  }));
}

// 대답 하나 → 제목, 한 줄 요약, 이어서 물을 질문
export async function digestAnswer(input: {
  honorific: string;
  question: string;
  transcript: string;
}): Promise<{ title: string; summary: string; followup: string | null }> {
  const out = await chatJSON(
    TONE +
      `\n대답을 읽고 JSON으로 답해라:
{"title":"대답의 핵심을 담은 12자 이내 제목","summary":"대답을 30자 안팎 한 문장으로","followup":"대답 속 구체적인 사람·장소·물건 하나를 이어 묻는 질문 (없으면 null)"}
대답에 없는 내용을 지어내지 않는다.`,
    `부모님 호칭: ${input.honorific}\n질문: ${input.question}\n대답: ${input.transcript.slice(0, 6000)}`
  );
  return {
    title: String(out.title || "").slice(0, 30),
    summary: String(out.summary || "").slice(0, 120),
    followup: out.followup ? String(out.followup) : null,
  };
}

export async function transcribe(buf: ArrayBuffer, mime: string): Promise<string> {
  const ext = mime.includes("mp4") ? "mp4" : mime.includes("ogg") ? "ogg" : "webm";
  const form = new FormData();
  form.append("file", new Blob([buf], { type: mime }), `audio.${ext}`);
  form.append("model", "whisper-1");
  form.append("language", "ko");
  const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${KEY()}` },
    body: form,
  });
  if (!res.ok) throw new Error("STT 실패: " + (await res.text()));
  return (await res.json()).text as string;
}
