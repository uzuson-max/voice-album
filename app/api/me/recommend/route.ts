import { NextResponse } from "next/server";
import { loadFamily, unauthorized, userIdFrom, bad } from "@/lib/auth";
import { buildCourse } from "@/lib/questions";

export const dynamic = "force-dynamic";

// 가족 정보로 문장이 다 채워진 12주 과정 (저장은 하지 않음)
export async function POST(req: Request) {
  const uid = await userIdFrom(req);
  if (!uid) return unauthorized();
  const { family, storyteller } = await loadFamily(uid);
  if (!family || !storyteller) return bad("먼저 부모님을 등록해주세요");

  const course = buildCourse({
    childName: family.child_name,
    label: storyteller.label,
    profile: storyteller.profile || {},
  });
  return NextResponse.json({ course, label: storyteller.label });
}
