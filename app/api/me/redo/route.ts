import crypto from "crypto";
import { NextResponse } from "next/server";
import { admin, BUCKET } from "@/lib/supabaseAdmin";
import { bad, loadFamily, unauthorized, userIdFrom } from "@/lib/auth";
import { LIMIT } from "@/lib/course";
import { sendText } from "@/lib/sms";
import { APP_NAME, appUrl } from "@/lib/brand";
import { josa } from "@/lib/korean";

export const dynamic = "force-dynamic";

// 이 호 다시 담기 (한 호에 한 번만)
// 지난 녹음·영상·기사·표지를 지우고, 같은 질문을 부모님께 새 링크로 다시 보낸다
export async function POST(req: Request) {
  const uid = await userIdFrom(req);
  if (!uid) return unauthorized();
  const { promptId } = await req.json().catch(() => ({}));
  const { family, storyteller: st, role } = await loadFamily(uid);
  if (!family || !st) return bad("먼저 부모님을 등록해주세요");
  if (role === "member") return bad("다시 담기는 처음 시작한 가족만 할 수 있어요");
  if (st.stopped_at) return bad("마친 과정이라 다시 담을 수 없어요");

  const db = admin();
  const { data: p } = await db
    .from("vf_prompts")
    .select("id, text, ask, status, redo_count, storyteller_id")
    .eq("id", promptId)
    .eq("storyteller_id", st.id)
    .maybeSingle();
  if (!p) return bad("이야기를 찾을 수 없어요", 404);
  if (p.status !== "answered") return bad("아직 담긴 이야기가 없어요");
  if ((p.redo_count || 0) >= LIMIT.redo) return bad("이 호는 이미 한 번 다시 담았어요");

  // 저장소 파일 먼저 (부모님 녹음·영상·표지 사진)
  try {
    const store = db.storage.from(BUCKET);
    const { data: files } = await store.list(`${st.id}/${p.id}`, { limit: 1000 });
    const paths = (files || []).filter((f) => f.id).map((f) => `${st.id}/${p.id}/${f.name}`);
    if (paths.length) await store.remove(paths);
  } catch {}

  await db.from("vf_answers").delete().eq("prompt_id", p.id);
  const token = crypto.randomBytes(16).toString("base64url");
  await db
    .from("vf_prompts")
    .update({
      status: "sent", token, sent_at: new Date().toISOString(), finished_at: null,
      reminder_count: 0, last_reminded_at: null, snooze_until: null, notified_at: null,
      article_title: null, article: null, article_quote: null, article_flags: null, article_points: null, article_facts: null,
      selfie_path: null, cover_path: null,
      redo_count: (p.redo_count || 0) + 1,
    })
    .eq("id", p.id);

  const cGa = josa(family.child_name, "이/가");
  await sendText(
    st.phone,
    `[${APP_NAME}] ${cGa} 이 이야기를 한 번 더 듣고 싶대요.\n\n"${p.ask || p.text}"\n\n편하실 때 다시 들려주세요.\n${appUrl()}/s/${token}`,
    "한 번 더 듣고 싶은 이야기"
  ).catch(() => {});
  return NextResponse.json({ ok: true });
}
