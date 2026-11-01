import { NextResponse } from "next/server";
import { createHash } from "crypto";
import { admin, BUCKET } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

// 다람쥐 진행자 목소리: 문장 → TTS → mp3 (한 번 만든 건 저장해 두고 다시 씀)
// 1순위: 구글 클라우드 TTS (매달 무료 한도 안에서 사용)
//   Vercel 환경변수: GOOGLE_TTS_KEY (필수)
//                    GOOGLE_TTS_VOICE (기본 ko-KR-Chirp3-HD-Sulafat = 따뜻한 여성)
//                    GOOGLE_TTS_RATE  (기본 0.92 = 살짝 천천히, 1이 보통)
// 2순위(구글 키가 없거나 실패하면): OpenAI TTS — TTS_VOICE (기본 nova)
const G_KEY = () => process.env.GOOGLE_TTS_KEY || "";
const G_VOICE = () => process.env.GOOGLE_TTS_VOICE || "ko-KR-Chirp3-HD-Sulafat";
const G_RATE = () => Number(process.env.GOOGLE_TTS_RATE || "0.92") || 0.92;
const OA_VOICE = () => process.env.TTS_VOICE || "nova";
const HOW =
  "따뜻하고 차분한 40대 한국 여성 아나운서처럼. 60~70대 어르신께 말하듯 또박또박, 조금 천천히. 문장 사이에 여유 있게 쉬어 주세요. 과장된 감정은 빼고 다정하게.";

async function google(input: string): Promise<Buffer | null> {
  if (!G_KEY()) return null;
  try {
    const res = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${G_KEY()}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        input: { text: input },
        voice: { languageCode: "ko-KR", name: G_VOICE() },
        audioConfig: { audioEncoding: "MP3", speakingRate: G_RATE() },
      }),
    });
    if (!res.ok) {
      console.error("구글 TTS 실패", res.status, await res.text().catch(() => ""));
      return null;
    }
    const j = await res.json();
    return j.audioContent ? Buffer.from(j.audioContent, "base64") : null;
  } catch (e) {
    console.error("구글 TTS 오류", e);
    return null;
  }
}

async function openai(input: string): Promise<Buffer | null> {
  const res = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "gpt-4o-mini-tts", voice: OA_VOICE(), input, instructions: HOW, response_format: "mp3" }),
  });
  if (!res.ok) return null;
  return Buffer.from(await res.arrayBuffer());
}

const fileFor = (voiceKey: string, input: string) =>
  `tts/${createHash("sha1").update(voiceKey + "|" + input).digest("hex")}.mp3`;

export async function POST(req: Request, { params }: { params: { token: string } }) {
  const { text } = await req.json().catch(() => ({ text: "" }));
  const input = String(text || "").trim().slice(0, 500);
  if (!input) return NextResponse.json({ error: "빈 문장" }, { status: 400 });

  const db = admin();
  // 아무나 TTS를 돌리지 못하게: 실제 부모님 링크(또는 체험)에서만
  if (params.token !== "demo") {
    const { data: p } = await db.from("vf_prompts").select("id").eq("token", params.token).maybeSingle();
    if (!p) return NextResponse.json({ error: "링크 없음" }, { status: 404 });
  }

  const signed = async (path: string) =>
    (await db.storage.from(BUCKET).createSignedUrl(path, 60 * 60 * 6)).data?.signedUrl || null;

  // 목소리 설정이 바뀌면 파일 이름도 바뀌어 새로 만들어짐
  const useGoogle = !!G_KEY();
  const gKey = `google:${G_VOICE()}:${G_RATE()}`;
  const oKey = `openai:${OA_VOICE()}`;
  const path = fileFor(useGoogle ? gKey : oKey, input);

  const name = path.slice(4);
  const { data: found } = await db.storage.from(BUCKET).list("tts", { search: name, limit: 1 });
  if (found?.some((f) => f.name === name)) return NextResponse.json({ url: await signed(path) });

  // 구글 실패 시엔 OpenAI로 대신 읽되, 구글 이름으로 저장하지 않음(다음에 다시 구글 시도)
  let buf = useGoogle ? await google(input) : null;
  let savePath = path;
  if (!buf) {
    buf = await openai(input);
    savePath = fileFor(oKey, input);
  }
  if (!buf) return NextResponse.json({ error: "TTS 실패" }, { status: 502 });

  const { error } = await db.storage.from(BUCKET).upload(savePath, buf, { contentType: "audio/mpeg", upsert: true });
  if (error) return NextResponse.json({ error: "저장 실패" }, { status: 500 });
  return NextResponse.json({ url: await signed(savePath) });
}
