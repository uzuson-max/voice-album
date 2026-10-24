import crypto from "crypto";
import { admin } from "./supabaseAdmin";
import { sendText } from "./sms";
import { kstParts, WEEKDAYS } from "./time";
import { APP_NAME, appUrl } from "./brand";
import { finishPrompt } from "./process";

const DAY = 24 * 60 * 60 * 1000;

function link(token: string) {
  return `${appUrl()}/s/${token}`;
}

// 다음 질문 하나를 부모님께 문자로 보낸다
export async function sendNextPrompt(storyteller: any, childName: string) {
  const db = admin();
  const { data: next } = await db
    .from("vf_prompts")
    .select("*")
    .eq("storyteller_id", storyteller.id)
    .eq("status", "queued")
    .order("position")
    .order("created_at")
    .limit(1)
    .maybeSingle();
  if (!next) return { sent: false, reason: "보낼 질문이 없어요" };

  // 처음 보내는 질문인지, 아직 못 전한 자녀 반응이 있는지
  const { count: sentBefore } = await db
    .from("vf_prompts")
    .select("id", { count: "exact", head: true })
    .eq("storyteller_id", storyteller.id)
    .neq("status", "queued");
  const { count: reactions } = await db
    .from("vf_prompts")
    .select("id", { count: "exact", head: true })
    .eq("storyteller_id", storyteller.id)
    .not("reaction_at", "is", null)
    .is("reaction_shown_on", null);

  const token = crypto.randomBytes(16).toString("base64url");
  const h = storyteller.honorific || "";
  let text: string;
  if (!sentBefore) {
    text =
      `[${APP_NAME}] ${childName}가 ${h} 이야기를 오래 간직하고 싶어서 준비했어요.\n\n` +
      `앞으로 매주 ${WEEKDAYS[storyteller.send_weekday]}요일에 ${childName}의 질문이 하나씩 와요. ` +
      `생각나는 만큼만 편하게 들려주시면 돼요.\n\n` +
      `첫 번째 질문이에요.\n"${next.text}"\n\n${link(token)}`;
  } else {
    text =
      `[${APP_NAME}] ${childName}가 이번 주 질문을 보냈어요.\n` +
      (reactions ? `지난번 이야기에 ${childName}가 남긴 말도 함께 있어요.\n` : "") +
      `\n"${next.text}"\n\n` +
      `아래 링크를 누르고 편하게 말씀해 주세요.\n${link(token)}`;
  }
  await sendText(storyteller.phone, text, `${childName}가 보낸 질문`);
  await db
    .from("vf_prompts")
    .update({ status: "sent", token, sent_at: new Date().toISOString() })
    .eq("id", next.id);
  return { sent: true, promptId: next.id };
}

async function remind(prompt: any, storyteller: any) {
  const text =
    `[${APP_NAME}] 지난번 질문, 편하실 때 들려주세요.\n\n"${prompt.text}"\n${link(prompt.token)}`;
  await sendText(storyteller.phone, text, "지난번 질문");
  await admin()
    .from("vf_prompts")
    .update({
      reminder_count: (prompt.reminder_count || 0) + 1,
      last_reminded_at: new Date().toISOString(),
      snooze_until: null,
    })
    .eq("id", prompt.id);
}

// 매시간 호출: 정해진 요일·시간이면 새 질문, 대답 없으면 다정한 알림 (최대 2번 + "지금은 어려워요" 후 1번)
export async function runDispatch(now = new Date()) {
  const db = admin();
  const { weekday, hour } = kstParts(now);
  const log: any[] = [];

  // 0) 이어 말하기 도중 창을 닫은 이야기는 30분 뒤 기사로 마무리
  const { data: open } = await db
    .from("vf_prompts")
    .select("id")
    .eq("status", "answered")
    .is("finished_at", null)
    .limit(20);
  for (const p of open || []) {
    const { data: last } = await db
      .from("vf_answers")
      .select("created_at")
      .eq("prompt_id", p.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (last && now.getTime() - new Date(last.created_at).getTime() > 30 * 60 * 1000) {
      await finishPrompt(p.id).catch(() => {});
      log.push({ finished: p.id });
    }
  }

  const { data: tellers } = await db
    .from("vf_storytellers")
    .select("*, vf_families(child_name)")
    .eq("active", true);

  for (const st of tellers || []) {
    const childName = (st as any).vf_families?.child_name || "";
    try {
      // 1) 새 질문
      if (weekday === st.send_weekday && hour >= st.send_hour) {
        const since = new Date(now.getTime() - 6 * DAY).toISOString();
        const { count } = await db
          .from("vf_prompts")
          .select("id", { count: "exact", head: true })
          .eq("storyteller_id", st.id)
          .gte("sent_at", since);
        if (!count) log.push({ st: st.id, ...(await sendNextPrompt(st, childName)) });
      }

      // 2) 알림 (밤에는 보내지 않음)
      if (hour < 9 || hour > 20) continue;
      const { data: waiting } = await db
        .from("vf_prompts")
        .select("*")
        .eq("storyteller_id", st.id)
        .eq("status", "sent");
      for (const p of waiting || []) {
        const sentAgo = now.getTime() - new Date(p.sent_at).getTime();
        const snoozeDue = p.snooze_until && new Date(p.snooze_until) <= now;
        const due =
          snoozeDue ||
          (p.reminder_count === 0 && sentAgo >= 2 * DAY) ||
          (p.reminder_count === 1 && sentAgo >= 5 * DAY);
        if (due && p.reminder_count < 3) {
          await remind(p, st);
          log.push({ st: st.id, reminded: p.id });
        }
      }
    } catch (e: any) {
      log.push({ st: st.id, error: e?.message });
    }
  }
  return log;
}
