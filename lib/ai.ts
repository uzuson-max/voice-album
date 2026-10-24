// OpenAI 호출 (gpt-4o-mini, whisper-1). SDK 없이 fetch만 쓴다.
const KEY = () => process.env.OPENAI_API_KEY!;

async function chatJSON(system: string, user: string, temperature = 0.7): Promise<any> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${KEY()}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature,
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
- 추상적으로 묻지 말고 감각(노래, 음식, 장소, 물건, 냄새)이나 장면 하나에서 출발한다.
- 유언·죽음·이별을 떠올리게 하는 표현 금지. 미래의 자녀를 위한 말로 표현한다.
- "녹음", "기록", "인터뷰" 같은 단어 금지.`;

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
- 무거운 주제(힘들었던 때)는 6번째 이후에만.
- JSON: {"questions":[{"text":"...","format":"audio"|"video"}]} 정확히 10개.`,
    `부모님 호칭: ${input.honorific}\n자녀 이름: ${input.childName}\n부모님 정보:\n${profile || "(없음)"}`
  );
  return (out.questions || []).slice(0, 10).map((q: any) => ({
    text: String(q.text).trim(),
    format: q.format === "video" ? "video" : "audio",
  }));
}

// 대답 하나 → 제목, 한 줄 요약
export async function digestAnswer(input: {
  honorific: string;
  question: string;
  transcript: string;
}): Promise<{ title: string; summary: string }> {
  const out = await chatJSON(
    `대답을 읽고 JSON으로 답해라:
{"title":"대답의 핵심을 담은 12자 이내 제목","summary":"대답을 30자 안팎 한 문장으로"}
대답에 없는 내용을 지어내지 않는다.`,
    `부모님 호칭: ${input.honorific}\n질문: ${input.question}\n대답: ${input.transcript.slice(0, 6000)}`,
    0.4
  );
  return {
    title: String(out.title || "").slice(0, 30),
    summary: String(out.summary || "").slice(0, 120),
  };
}

// 이야기 진행자: 방금 대답에 짧게 맞장구 + 이어서 물을 질문 하나 (또는 그만)
export async function hostTurn(input: {
  honorific: string;
  childName: string;
  question: string;
  transcript: string;
  turn: number; // 방금 끝난 대답의 순번 (0부터)
  videoDone: boolean;
}): Promise<{ react: string; followup: string | null; video: boolean }> {
  const out = await chatJSON(
    `너는 ${input.childName}가 ${input.honorific}께 마련한 이야기 시간의 진행자다. 라디오 DJ처럼 다정하게 듣는다.
방금 ${input.honorific}가 한 대답을 읽고 JSON으로 답해라:
{"react":"대답 속 구체적인 단어 하나를 짚는 짧은 맞장구 (25자 이내, 존댓말)",
 "followup":"대답 속 사람·장소·물건·그때 기분 중 하나만 이어 묻는 질문 (40자 이내) 또는 null",
 "moving": true|false}
규칙:
- 맞장구는 재진술하지 않는다. 대답에 없는 감정을 지어내지 않는다. 과장된 감탄 금지.
- 대답이 아주 짧으면 고르기 쉬운 선택지를 넣어 묻는다. 예: "친구랑이었어요, 혼자였어요?"
- 대답에 울컥하거나 무거운 기색(돌아가신 분, 힘들었던 일)이 있으면 react는 "천천히 하셔도 돼요" 같은 말로 하고, followup은 가볍게 하거나 null.
- 이야기가 충분히 마무리됐거나 더 묻는 게 실례 같으면 followup은 null.
- moving: 대답이 자녀에게 꼭 얼굴로 남기고 싶을 만큼 마음이 담긴 내용이면 true.
- "녹음", "기록", "AI" 같은 단어 금지.`,
    `처음 질문: ${input.question}\n대답: ${input.transcript.slice(0, 4000)}`
  );
  const react = String(out.react || "").slice(0, 60) || "말씀 잘 들었어요.";
  let followup = out.followup ? String(out.followup).slice(0, 80) : null;
  const video = !!out.moving && !input.videoDone && input.turn < 2;
  if (input.turn >= 2) followup = null;
  if (video) followup = `방금 그 이야기, ${input.childName}가 얼굴 보면서 한 번 더 듣고 싶을 것 같아요. 1분만 들려주실래요?`;
  return { react, followup, video };
}

// 한 질문의 대답들(이어 말하기 포함) → 우리집 신문 기사 + 다음 주에 이어 물을 질문
export async function writeArticle(input: {
  honorific: string;
  childName: string;
  question: string;
  turns: { asked: string; transcript: string }[];
}): Promise<{ title: string; body: string; nextQuestion: string | null }> {
  const talk = input.turns.map((t) => `Q. ${t.asked}\nA. ${t.transcript}`).join("\n\n").slice(0, 9000);
  const out = await chatJSON(
    `${input.honorific}가 ${input.childName}에게 들려준 이야기를 신문 기사처럼 엮어라. JSON:
{"title":"이야기 속 구체적인 장면을 담은 제목 (16자 이내)",
 "body":"${input.honorific}의 1인칭 글. 말한 그대로에 가깝게, 사투리·말버릇·어미를 살린다. 감탄사·반복만 정리. 문단 2~5개, 문단 사이 빈 줄.",
 "next":"다음 주에 이어서 물으면 좋을 질문 하나 (존댓말, 40자 안팎) 또는 null"}
규칙: 대답에 없는 사실·감정을 지어내지 않는다. 미화하지 않는다.`,
    `처음 질문: ${input.question}\n\n${talk}`,
    0.4
  );
  return {
    title: String(out.title || "").slice(0, 30),
    body: String(out.body || "").slice(0, 6000),
    nextQuestion: out.next ? String(out.next).slice(0, 120) : null,
  };
}

// 자녀가 직접 쓴 질문을 부모님께 보내기 좋은 말투로
export async function polishQuestion(input: { honorific: string; childName: string; text: string }): Promise<string> {
  const out = await chatJSON(
    TONE +
      `\n자녀가 쓴 질문의 뜻은 그대로 두고, 부모님이 받았을 때 편하게 답할 수 있는 한 문장으로 다듬어라.
부모님은 "${input.honorific}", 자녀는 "${input.childName}"라고 부른다.
JSON: {"text":"다듬은 질문"}`,
    input.text.slice(0, 300)
  );
  return String(out.text || input.text).trim();
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
