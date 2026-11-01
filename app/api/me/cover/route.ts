import { NextResponse } from "next/server";
import { admin, BUCKET } from "@/lib/supabaseAdmin";
import { bad, loadFamily, unauthorized, userIdFrom } from "@/lib/auth";

export const dynamic = "force-dynamic";

// 잡지 전체 표지를 자녀가 직접 고른 사진으로 (비우면 첫 호 셀피가 표지)
async function me(req: Request) {
  const uid = await userIdFrom(req);
  if (!uid) return null;
  const { storyteller } = await loadFamily(uid);
  return storyteller || null;
}

// 업로드 주소
export async function POST(req: Request) {
  const st = await me(req);
  if (!st) return unauthorized();
  const path = `${st.id}/child/cover-${Date.now()}.jpg`;
  const { data, error } = await admin().storage.from(BUCKET).createSignedUploadUrl(path);
  if (error || !data) return bad("업로드 준비 실패", 500);
  return NextResponse.json({ path, uploadToken: data.token });
}

// 저장: { path }
export async function PUT(req: Request) {
  const st = await me(req);
  if (!st) return unauthorized();
  const { path } = await req.json().catch(() => ({}));
  if (typeof path !== "string" || !path.startsWith(`${st.id}/child/cover-`)) return bad("잘못된 파일");
  await admin().from("vf_storytellers").update({ cover_path: path }).eq("id", st.id);
  return NextResponse.json({ ok: true });
}

// 되돌리기 (첫 호 셀피로)
export async function DELETE(req: Request) {
  const st = await me(req);
  if (!st) return unauthorized();
  await admin().from("vf_storytellers").update({ cover_path: null }).eq("id", st.id);
  return NextResponse.json({ ok: true });
}
