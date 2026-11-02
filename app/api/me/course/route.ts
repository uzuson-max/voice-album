import { NextResponse } from "next/server";
import { admin, BUCKET } from "@/lib/supabaseAdmin";
import { bad, loadFamily, unauthorized, userIdFrom } from "@/lib/auth";
import { courseState, isPaused, LIMIT, refundEstimate } from "@/lib/course";
import { sendText } from "@/lib/sms";
import { APP_NAME } from "@/lib/brand";

export const dynamic = "force-dynamic";

async function sentCount(stId: string) {
  const { count } = await admin()
    .from("vf_prompts")
    .select("id", { count: "exact", head: true })
    .eq("storyteller_id", stId)
    .not("sent_at", "is", null)
    .not("week", "is", null);
  return count || 0;
}

// 과정 상태: 쉬는 중인지, 남은 일시정지 횟수, 지금 그만두면 환불 예상액
export async function GET(req: Request) {
  const uid = await userIdFrom(req);
  if (!uid) return unauthorized();
  const { family, storyteller: st, role } = await loadFamily(uid);
  if (!family || !st) return bad("먼저 부모님을 등록해주세요");
  const sent = await sentCount(st.id);
  return NextResponse.json({
    role,
    state: courseState(st, sent > 0),
    sent,
    pausedUntil: isPaused(st) ? st.paused_until : null,
    pauseLeft: Math.max(0, LIMIT.pauseTimes - (st.pause_count || 0)),
    honorificLeft: Math.max(0, LIMIT.honorificChanges - (st.honorific_changes || 0)),
    paid: family.plan === "paid",
    refund: refundEstimate(sent),
  });
}

// { action: "pause", weeks } | { action: "resume" } | { action: "stop" } | { action: "withdraw" }
export async function POST(req: Request) {
  const uid = await userIdFrom(req);
  if (!uid) return unauthorized();
  const b = await req.json().catch(() => ({}));
  const db = admin();
  const { family, storyteller: st, role } = await loadFamily(uid);

  // 탈퇴: 형제는 함께 보기에서만 빠지고, 처음 시작한 사람은 가족 기록 전체를 지운다
  if (b.action === "withdraw") {
    if (!family) return NextResponse.json({ ok: true });
    if (role === "member") {
      await db.from("vf_members").delete().eq("user_id", uid);
      return NextResponse.json({ ok: true });
    }
    const { data: sts } = await db.from("vf_storytellers").select("id").eq("family_id", family.id);
    for (const s of sts || []) await removeFolder(s.id);
    await db.from("vf_quiz").delete().eq("family_id", family.id);
    await db.from("vf_members").delete().eq("family_id", family.id);
    await db.from("vf_families").delete().eq("id", family.id); // 부모님·질문·녹음 기록은 함께 지워진다
    return NextResponse.json({ ok: true });
  }

  if (!family || !st) return bad("먼저 부모님을 등록해주세요");
  if (role === "member") return bad("과정 설정은 처음 시작한 가족만 바꿀 수 있어요");

  if (b.action === "pause") {
    if (isPaused(st)) return bad("이미 쉬는 중이에요");
    if ((st.pause_count || 0) >= LIMIT.pauseTimes) return bad(`일시정지는 ${LIMIT.pauseTimes}번까지 쓸 수 있어요`);
    const weeks = Math.min(LIMIT.pauseWeeks, Math.max(1, Number(b.weeks) || 1));
    const until = new Date(Date.now() + 9 * 3600 * 1000 + weeks * 7 * 86400 * 1000).toISOString().slice(0, 10);
    await db.from("vf_storytellers").update({ paused_until: until, pause_count: (st.pause_count || 0) + 1 }).eq("id", st.id);
    return NextResponse.json({ ok: true, pausedUntil: until });
  }

  if (b.action === "resume") {
    if (isPaused(st)) await db.from("vf_storytellers").update({ paused_until: null }).eq("id", st.id);
    return NextResponse.json({ ok: true });
  }

  if (b.action === "stop") {
    if (st.stopped_at) return NextResponse.json({ ok: true });
    const sent = await sentCount(st.id);
    await db.from("vf_storytellers").update({ active: false, stopped_at: new Date().toISOString(), stop_reason: "user" }).eq("id", st.id);
    const to = process.env.ADMIN_PHONE;
    if (to) {
      await sendText(
        to,
        `[${APP_NAME}] 그만두기 신청\n${family.child_name} → ${st.label}\n보낸 회차 ${sent} / 12 · 결제 ${family.plan === "paid" ? "완료" : "전"}\n환불 예상 ${refundEstimate(sent).toLocaleString()}원\n가족 ID: ${family.id}`,
        "그만두기 신청"
      ).catch(() => {});
    }
    return NextResponse.json({ ok: true });
  }

  return bad("알 수 없는 요청이에요");
}

// 저장소에서 이 부모님 폴더 통째로 (녹음·영상·사진·표지)
async function removeFolder(prefix: string) {
  const store = admin().storage.from(BUCKET);
  const walk = async (dir: string): Promise<string[]> => {
    const { data } = await store.list(dir, { limit: 1000 });
    const out: string[] = [];
    for (const f of data || []) {
      const path = `${dir}/${f.name}`;
      if (f.id) out.push(path);
      else out.push(...(await walk(path)));
    }
    return out;
  };
  try {
    const files = await walk(prefix);
    for (let i = 0; i < files.length; i += 100) await store.remove(files.slice(i, i + 100));
  } catch {}
}
