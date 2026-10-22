import { NextResponse } from "next/server";
import { loadFamily, unauthorized, userIdFrom, bad } from "@/lib/auth";
import { recommendQuestions } from "@/lib/ai";
import { LIBRARY, fill } from "@/lib/questions";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

// 부모님 정보로 맞춤 질문 10개 + 기본 질문 (저장은 하지 않음)
export async function POST(req: Request) {
  const uid = await userIdFrom(req);
  if (!uid) return unauthorized();
  const { family, storyteller } = await loadFamily(uid);
  if (!family || !storyteller) return bad("먼저 부모님을 등록해주세요");

  const library = LIBRARY.map((q) => ({ ...q, text: fill(q.text, storyteller.honorific, family.child_name), source: "library" }));
  let ai: any[] = [];
  try {
    ai = (
      await recommendQuestions({
        honorific: storyteller.honorific,
        childName: family.child_name,
        profile: storyteller.profile || {},
      })
    ).map((q) => ({ ...q, source: "ai" }));
  } catch (e: any) {
    console.error("[recommend]", e?.message);
  }
  return NextResponse.json({ ai, library });
}
