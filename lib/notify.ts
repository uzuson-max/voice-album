// lib/notify.ts
// 자녀 알림 원칙: 좋은 소식만 보낸다. "이번 주 녹음이 없어요" 같은 알림은 만들지 않는다.

import { admin } from "./supabaseAdmin";
import { sendKakao } from "./sms";
import { APP_NAME, appUrl } from "./brand";
import { josa } from "./korean";
import { kstParts, koDate } from "./time";

// 기사가 처음 완성됐을 때 한 번만: "엄마 이야기가 도착했어요"
export async function notifyArrival(promptId: string) {
  const db = admin();
  const { data: p } = await db
    .from("vf_prompts")
    .select("id, storyteller_id, article_title, notified_at, vf_storytellers(label, vf_families(child_phone))")
    .eq("id", promptId)
    .maybeSingle();
  if (!p || (p as any).notified_at) return;
  const st: any = (p as any).vf_storytellers;
  const to = st?.vf_families?.child_phone;
  if (!to) return;

  // 먼저 표시해서 두 번 가지 않게
  const { data: lock } = await db
    .from("vf_prompts")
    .update({ notified_at: new Date().toISOString() })
    .eq("id", promptId)
    .is("notified_at", null)
    .select("id");
  if (!lock?.length) return;

  const label = st?.label || "부모님";
  const who = josa(label, "이/가");
  const title = p.article_title || "새 이야기";

  // 몇 번째 이야기인지: 이 부모님에게 지금까지 도착 알림이 나간 이야기 수 (이번 것 포함)
  const { count } = await db
    .from("vf_prompts")
    .select("id", { count: "exact", head: true })
    .eq("storyteller_id", (p as any).storyteller_id)
    .not("notified_at", "is", null);
  const nth = String(count || 1);

  // 변수 이름은 솔라피에 등록한 템플릿과 똑같아야 한다 (#{부모호칭} #{회차} #{질문제목} #{링크경로})
  await sendKakao(
    to,
    "arrival",
    {
      "#{부모호칭}": label,
      "#{회차}": nth,
      "#{질문제목}": title,
      "#{링크경로}": "app/stories",
    },
    `[${APP_NAME}] ${who} 들려준 이야기가 도착했어요.\n\n‘${title}’\n\n${appUrl()}/app/stories`,
    "이야기 도착"
  );
}

// 보관이 끝나기 30일 전 한 번: 원본 전체 내려받기 안내
const DAY = 24 * 60 * 60 * 1000;
export async function notifyKeepEnding(now = new Date(), keepYears = 1) {
  const db = admin();
  const log: any[] = [];
  const { data: fams } = await db
    .from("vf_families")
    .select("id, child_phone, keep_notified_at, vf_storytellers(id, label)")
    .not("child_phone", "is", null)
    .is("keep_notified_at", null)
    .limit(200);
  for (const f of (fams || []) as any[]) {
    const st = f.vf_storytellers?.[0];
    if (!st) continue;
    // 과정이 끝난 가족만: 보낼 질문이 남아 있지 않고
    const { count: queued } = await db
      .from("vf_prompts")
      .select("id", { count: "exact", head: true })
      .eq("storyteller_id", st.id)
      .eq("status", "queued");
    if (queued) continue;
    const { data: last } = await db
      .from("vf_answers")
      .select("created_at")
      .eq("storyteller_id", st.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!last) continue;
    const end = new Date(new Date(last.created_at).getTime() + keepYears * 365 * DAY);
    const left = end.getTime() - now.getTime();
    if (left > 30 * DAY || left < 0) continue;

    const { data: lock } = await db
      .from("vf_families")
      .update({ keep_notified_at: now.toISOString() })
      .eq("id", f.id)
      .is("keep_notified_at", null)
      .select("id");
    if (!lock?.length) continue;
    const date = koDate(kstParts(end).date);
    const label = st.label || "부모님";
    await sendKakao(
      f.child_phone,
      "keep",
      { "#{부모님}": label, "#{날짜}": date },
      `[${APP_NAME}] ${label} 이야기 보관이 ${date}에 끝나요.\n\n그 전에 목소리·영상 원본을 내려받아 두세요.\n${appUrl()}/app/export`,
      "원본 내려받기 안내"
    ).catch((e) => log.push({ keepFail: f.id, e: e?.message }));
    log.push({ keepNotified: f.id });
  }
  return log;
}
