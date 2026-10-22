import { NextResponse } from "next/server";
import { admin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

// "지금은 어려워요" — 6시간 뒤 한 번 더 알려드린다 (밤이면 다음 날 아침 알림 시간에)
export async function POST(_req: Request, { params }: { params: { token: string } }) {
  const until = new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString();
  const { error } = await admin()
    .from("vf_prompts")
    .update({ snooze_until: until })
    .eq("token", params.token)
    .eq("status", "sent");
  if (error) return NextResponse.json({ error: "실패" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
