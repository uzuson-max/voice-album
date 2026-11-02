"use client";
// 가족 탭 맨 아래: 잠시 쉬기 · 그만두기 · 탈퇴
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, browserClient } from "@/lib/supabaseBrowser";
import { LIMIT, won } from "@/lib/course";

type C = { role: "owner" | "member"; state: string; sent: number; pausedUntil: string | null; pauseLeft: number; paid: boolean; refund: number };

const md = (d: string) => `${Number(d.slice(5, 7))}월 ${Number(d.slice(8, 10))}일`;

export default function CourseControls({ label }: { label: string }) {
  const router = useRouter();
  const [c, setC] = useState<C | null>(null);
  const [weeks, setWeeks] = useState(2);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const load = () => api("/api/me/course").then(setC).catch(() => {});
  useEffect(() => { load(); }, []);

  async function act(body: any, after?: () => void) {
    setBusy(true); setMsg("");
    try {
      await api("/api/me/course", { method: "POST", body: JSON.stringify(body) });
      after ? after() : load();
    } catch (e: any) { setMsg(e.message); }
    setBusy(false);
  }

  async function withdraw() {
    const word = c?.role === "member" ? "나가기" : "탈퇴";
    const warn = c?.role === "member"
      ? `${label} 이야기 함께 보기에서 나갈까요?\n처음 시작한 가족의 기록은 그대로 남아요.`
      : `정말 탈퇴할까요?\n\n${label}의 녹음·영상·사진·기사가 모두 지워지고 되돌릴 수 없어요.\n먼저 이야기 탭 맨 아래에서 원본을 내려받아 두세요.`;
    if (!confirm(warn)) return;
    if (prompt(`확인을 위해 '${word}'라고 적어주세요`)?.trim() !== word) return;
    await act({ action: "withdraw" }, async () => {
      await browserClient().auth.signOut();
      router.replace("/");
    });
  }

  if (!c) return null;

  if (c.role === "member")
    return (
      <div className="stack" style={{ gap: 4, marginTop: 8 }}>
        <button type="button" className="link" disabled={busy} onClick={withdraw}>함께 보기에서 나가기</button>
        {msg && <p className="err">{msg}</p>}
      </div>
    );

  const stopped = c.state === "stopped" || c.state === "wrong_number";

  return (
    <div className="stack" style={{ gap: 12, marginTop: 8 }}>
      {!stopped && (
        <div className="card stack" style={{ gap: 10 }}>
          <div style={{ fontWeight: 700 }}>잠시 쉬기</div>
          {c.pausedUntil ? (
            <>
              <div className="small muted" style={{ lineHeight: 1.7 }}>{md(c.pausedUntil)}까지 쉬고 있어요. 그동안 질문과 알림이 가지 않아요.</div>
              <button type="button" className="btn sm soft" disabled={busy} onClick={() => act({ action: "resume" })}>지금 다시 시작하기</button>
            </>
          ) : c.pauseLeft > 0 ? (
            <>
              <div className="small muted" style={{ lineHeight: 1.7 }}>
                입원·여행·명절처럼 {label}께서 이야기하기 어려운 때가 있으면 쉬어가세요. 남은 이야기는 그다음부터 이어져요.
                <br />한 번에 {LIMIT.pauseWeeks}주까지, {LIMIT.pauseTimes}번 쓸 수 있어요 (남은 {c.pauseLeft}번)
              </div>
              <div className="row" style={{ gap: 8 }}>
                <select className="input" style={{ flex: 1 }} value={weeks} onChange={(e) => setWeeks(Number(e.target.value))}>
                  {Array.from({ length: LIMIT.pauseWeeks }, (_, i) => i + 1).map((w) => <option key={w} value={w}>{w}주</option>)}
                </select>
                <button type="button" className="btn sm" disabled={busy} onClick={() => { if (confirm(`${weeks}주 동안 쉴까요?`)) act({ action: "pause", weeks }); }}>쉬기</button>
              </div>
            </>
          ) : (
            <div className="small muted">일시정지는 {LIMIT.pauseTimes}번 모두 썼어요.</div>
          )}
        </div>
      )}

      <div className="stack" style={{ gap: 2 }}>
        {!stopped && (
          <button
            type="button" className="link" disabled={busy}
            onClick={() => {
              const r = c.paid ? `\n\n지금 그만두면 환불 예상 금액은 ${won(c.refund)}이에요. (보낸 이야기 ${c.sent} / 12)` : "";
              if (confirm(`과정을 그만둘까요?\n더는 ${label}께 질문이 가지 않아요. 지금까지 담긴 이야기는 계속 볼 수 있어요.${r}`)) act({ action: "stop" });
            }}
          >
            과정 그만두기
          </button>
        )}
        <a href="/refund" className="link" style={{ textAlign: "center", lineHeight: "44px" }}>환불 정책</a>
        <button type="button" className="link" disabled={busy} onClick={withdraw}>탈퇴하기</button>
      </div>
      {msg && <p className="err">{msg}</p>}
    </div>
  );
}
