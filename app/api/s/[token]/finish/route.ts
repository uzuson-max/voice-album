import { NextResponse } from "next/server";
import { waitUntil } from "@vercel/functions";
import { admin } from "@/lib/supabaseAdmin";
import { finishPrompt } from "@/lib/process";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// "오늘은 여기까지" — 우리집 신문 기사로 엮고 다음 주 질문 준비
export async function POST(_req: Request, { params }: { params: { token: string } }) {
  const { data: p } = await admin().from("vf_prompts").select("id").eq("token", params.token).maybeSingle();
  if (!p) return NextResponse.json({ error: "링크를 찾을 수 없어요" }, { status: 404 });
  const job = (async () => {
    // 마지막 대답의 받아쓰기가 끝날 시간을 잠깐 준다
    await new Promise((r) => setTimeout(r, 15000));
    await finishPrompt(p.id);
  })().catch((e) => console.error("[finish]", e?.message));
  try {
    waitUntil(job);
  } catch {}
  return NextResponse.json({ ok: true });
}
