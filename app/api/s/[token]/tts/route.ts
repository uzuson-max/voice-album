import { NextResponse } from "next/server";
import { createHash } from "crypto";
import { admin, BUCKET } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

// 다람쥐 진행자 목소리: 문장 → OpenAI TTS → mp3 (한 번 만든 건 저장해 두고 다시 씀)
// 목소리 바꾸기: Vercel 환경변수 TTS_VOICE (기본 coral)
const VOICE = () => process.env.TTS_VOICE || "coral";
const HOW =
  "따뜻하고 차분한 한국어 라디오 진행자처럼. 60~70대 어르신께 말하듯 또박또박, 조금 천천히. 문장 사이에 여유 있게 쉬어 주세요. 과장된 감정은 빼고 다정하게.";

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

  const name = createHash("sha1").update(VOICE() + "|" + input).digest("hex") + ".mp3";
  const path = `tts/${name}`;
  const signed = async () => (await db.storage.from(BUCKET).createSignedUrl(path, 60 * 60 * 6)).data?.signedUrl || null;

  const { data: found } = await db.storage.from(BUCKET).list("tts", { search: name, limit: 1 });
  if (found?.some((f) => f.name === name)) return NextResponse.json({ url: await signed() });

  const res = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "gpt-4o-mini-tts", voice: VOICE(), input, instructions: HOW, response_format: "mp3" }),
  });
  if (!res.ok) return NextResponse.json({ error: "TTS 실패" }, { status: 502 });
  const buf = Buffer.from(await res.arrayBuffer());
  const { error } = await db.storage.from(BUCKET).upload(path, buf, { contentType: "audio/mpeg", upsert: true });
  if (error) return NextResponse.json({ error: "저장 실패" }, { status: 500 });
  return NextResponse.json({ url: await signed() });
}
