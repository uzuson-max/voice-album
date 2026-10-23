import { NextResponse } from "next/server";
import { bad, loadFamily, unauthorized, userIdFrom } from "@/lib/auth";
import { polishQuestion } from "@/lib/ai";

export const dynamic = "force-dynamic";
export const maxDuration = 20;

export async function POST(req: Request) {
  const uid = await userIdFrom(req);
  if (!uid) return unauthorized();
  const { family, storyteller } = await loadFamily(uid);
  if (!family || !storyteller) return bad("먼저 부모님을 등록해주세요");
  const { text } = await req.json().catch(() => ({}));
  if (!String(text || "").trim()) return bad("질문을 적어주세요");
  try {
    return NextResponse.json({
      text: await polishQuestion({ honorific: storyteller.honorific, childName: family.child_name, text: String(text) }),
    });
  } catch {
    return bad("다듬지 못했어요", 500);
  }
}
