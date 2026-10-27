import crypto from "crypto";
import { admin } from "./supabaseAdmin";
import { sendText } from "./sms";
import { kstParts, SEND_DAYS, SEND_DAYS_LABEL } from "./time";
import { APP_NAME, appUrl } from "./brand";
import { finishPrompt, healPending } from "./process";
import { ensureLead } from "./lead";
import { josa } from "./korean";

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

  // 무료 체험: 첫 질문 하나까지만 (베타 기간엔 전 회차 무료 — 정식 판매 때 false로)
  const BETA_ALL_FREE = true;
  const { count: sentAny } = await db
    .from("vf_prompts")
    .select("id", { count: "exact", head: true })
    .eq("storyteller_id", storyteller.id)
    .neq("status", "queued");
  if (sentAny && !BETA_ALL_FREE) {
    const { data: fam } = await db.from("vf_families").select("plan").eq("id", storyteller.family_id).maybeSingle();
    if ((fam?.plan || "trial") === "trial") return { sent: false, reason: "무료 체험은 첫 질문 하나까지예요" };
  }

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

  // 그 시절로 데려가는 빌드업을 미리 만들어 둔다 (문자에는 다듬은 질문만)
  const t = await ensureLead(next.id);
  const q = t.ask || next.text;
  // 문자에도 장면을 먼저 깔아서, 질문만 덩그러니 오지 않게
  const scene = t.lead ? `${t.lead.replace(/\s*\n\s*/g, " ").trim()}\n\n` : "";

  const token = crypto.randomBytes(16).toString("base64url");
  const h = storyteller.honorific || "";
  const cGa = josa(childName, "이/가");
  let text: string;
  if (!sentBefore) {
    text =
      `[${APP_NAME}] ${cGa} ${h} 이야기를 오래 간직하고 싶어서 준비했어요.\n\n` +
      `앞으로 매주 ${SEND_DAYS_LABEL}에 ${childName}의 질문이 하나씩 와요. ` +
      `생각나는 만큼만 편하게 들려주시면 돼요.\n\n` +
      `첫 번째 질문이에요.\n\n${scene}"${q}"\n\n${link(token)}`;
  } else {
    text =
      `[${APP_NAME}] ${cGa} 새 질문을 보냈어요.\n` +
      (reactions ? `지난번 이야기를 듣고 ${cGa} 보낸 답장도 함께 있어요.\n` : "") +
      `\n${scene}"${q}"\n\n` +
      `아래 링크를 누르고 편하게 말씀해 주세요.\n${link(token)}`;
  }
  await sendText(storyteller.phone, text, `${cGa} 보낸 질문`);
  await db
    .from("vf_prompts")
    .update({ status: "sent", token, sent_at: new Date().toISOString() })
    .eq("id", next.id);
  return { sent: true, promptId: next.id };
}

async function remind(prompt: any, storyteller: any) {
  const text =
    `[${APP_NAME}] 지난번 질문, 편하실 때 들려주세요.\n\n"${prompt.ask || prompt.text}"\n${link(prompt.token)}`;
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

  // 0-a) 받아쓰기·기사가 빠진 것 되살리기
  log.push(...(await healPending().catch(() => [])));

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
      if (SEND_DAYS.includes(weekday) && hour >= st.send_hour) {
        const since = new Date(now.getTime() - 2 * DAY).toISOString();
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
