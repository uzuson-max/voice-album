"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/supabaseBrowser";

// 앱을 켤 때(탭 세션당 1번) 천천히 떠오르는 "알아요?" 카드.
// 몰랐던 질문은 바로 행동을 요구하지 않고, 둘러보다가 잠시 뒤(또는 앱에 다시 돌아왔을 때) 아래에서 한 번 더 살며시 보여준다.
type Next = { key: string; q: string; ask: string };
type Missed = Next & { label: string; phone: string };

const MISSED = "wr-quiz-missed";
const REMIND_AFTER_MS = 45_000;

const CSS = `
@keyframes wrUp { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; } }
@keyframes wrIn { from { opacity: 0; } to { opacity: 1; } }
.wr-in { opacity: 0; animation: wrIn .7s ease forwards; }
.wr-up { opacity: 0; animation: wrUp .9s cubic-bezier(.2,.7,.2,1) forwards; }
@media (prefers-reduced-motion: reduce) { .wr-in, .wr-up { animation: none; opacity: 1; } }
`;

export default function QuizCard() {
  const [d, setD] = useState<{ label: string; phone: string; next: Next | null } | null>(null);
  const [step, setStep] = useState<"ask" | "known" | "unknown">("ask");
  const [note, setNote] = useState("");
  const [pct, setPct] = useState<number | null>(null);

  useEffect(() => {
    try { if (sessionStorage.getItem("wr-quiz-shown")) return; } catch {}
    api("/api/me/quiz").then((r: any) => {
      if (r.next) setD(r);
      try { sessionStorage.setItem("wr-quiz-shown", "1"); } catch {}
    }).catch(() => {});
  }, []);

  return (
    <>
      <style>{CSS}</style>
      {d?.next && Card()}
      <Reminder />
    </>
  );

  function Card() {
    const n = d!.next!;
    const L = d!.label;
    const close = () => setD(null);

    async function answer(known: boolean) {
      setStep(known ? "known" : "unknown");
      if (!known) {
        try { sessionStorage.setItem(MISSED, JSON.stringify({ ...n, label: L, phone: d!.phone })); } catch {}
      }
      try {
        const r: any = await api("/api/me/quiz", { method: "POST", body: JSON.stringify({ key: n.key, known }) });
        setPct(r.pct ?? null);
      } catch {}
    }
    async function saveNote() {
      if (note.trim()) await api("/api/me/quiz", { method: "POST", body: JSON.stringify({ key: n.key, note }) }).catch(() => {});
      close();
    }

    return (
      <div role="dialog" aria-modal="true" className="wr-in" style={{
        position: "fixed", inset: 0, zIndex: 50, background: "var(--ground)",
        display: "flex", flexDirection: "column", padding: "28px 24px calc(28px + env(safe-area-inset-bottom))",
      }}>
        <div className="row between wr-in" style={{ animationDelay: ".3s" }}>
          <span className="chip" style={{ color: "var(--accent)" }}>오늘의 한 장</span>
          <button className="textbtn" onClick={close} style={{ color: "var(--muted)" }}>닫기</button>
        </div>

        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: 20 }}>
          <h1 className="wr-up" style={{ fontSize: 32, lineHeight: 1.4, fontWeight: 800, margin: 0, wordBreak: "keep-all", animationDelay: ".5s" }}>{n.q}</h1>

          {step === "known" && (
            <div className="wr-up stack" style={{ gap: 10 }}>
              <p className="muted" style={{ margin: 0 }}>적어두면 나중에 {L} 대답이랑 맞춰볼 수 있어요.</p>
              <textarea className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="내가 아는 답" />
            </div>
          )}
          {step === "unknown" && (
            <div className="stack" style={{ gap: 12 }}>
              <p className="wr-up" style={{ margin: 0, fontSize: 18, lineHeight: 1.7, wordBreak: "keep-all" }}>
                {pct !== null ? <>우리집 레코드를 쓰는 분들 중 <b style={{ color: "var(--accent)" }}>{pct}%</b>도 몰랐어요.</> : <>처음엔 다들 잘 몰라요.</>}
              </p>
              <p className="wr-up muted" style={{ margin: 0, fontSize: 16, lineHeight: 1.7, wordBreak: "keep-all", animationDelay: ".6s" }}>
                {L}도 그 시절엔 하고 싶은 게 많던 학생이었을 거예요.<br />언젠가 통화할 때 슬쩍 물어봐도 좋아요.
              </p>
            </div>
          )}
        </div>

        <div className="stack wr-up" style={{ gap: 10, animationDelay: step === "ask" ? "1.3s" : "1s" }} key={step}>
          {step === "ask" && (
            <>
              <button className="btn" onClick={() => answer(false)}>몰라요</button>
              <button className="btn soft" onClick={() => answer(true)}>알아요</button>
            </>
          )}
          {step === "known" && <button className="btn" onClick={saveNote}>저장</button>}
          {step === "unknown" && <button className="btn soft" onClick={close}>둘러보기</button>}
        </div>
      </div>
    );
  }
}

// 몰랐던 질문을 둘러본 뒤에 한 번 더 — 세션당 1번
function Reminder() {
  const [m, setM] = useState<Missed | null>(null);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    const show = () => {
      try {
        if (sessionStorage.getItem("wr-quiz-reminded")) return;
        const v = sessionStorage.getItem(MISSED);
        if (!v) return;
        sessionStorage.setItem("wr-quiz-reminded", "1");
        setM(JSON.parse(v));
      } catch {}
    };
    const t = setInterval(() => {
      try {
        const v = sessionStorage.getItem(MISSED);
        if (v && !sessionStorage.getItem("wr-missed-at")) sessionStorage.setItem("wr-missed-at", String(Date.now()));
        const at = Number(sessionStorage.getItem("wr-missed-at") || 0);
        if (at && Date.now() - at > REMIND_AFTER_MS) show();
      } catch {}
    }, 5000);
    // 다른 앱에 갔다가 돌아왔을 때도
    const onVis = () => { if (document.visibilityState === "visible") show(); };
    document.addEventListener("visibilitychange", onVis);
    return () => { clearInterval(t); document.removeEventListener("visibilitychange", onVis); };
  }, []);

  if (!m) return null;
  async function send() {
    try {
      await api("/api/me/prompts", { method: "POST", body: JSON.stringify({ items: [{ text: m!.ask, format: "audio", source: "custom" }] }) });
      setSent(true);
    } catch {}
  }

  return (
    <div className="wr-up card stack" style={{
      position: "fixed", left: 12, right: 12, bottom: "calc(90px + env(safe-area-inset-bottom))", zIndex: 40,
      maxWidth: 460, margin: "0 auto", gap: 10, boxShadow: "0 10px 30px rgba(0,0,0,.35)",
    }}>
      <span className="tiny muted">아까 그 질문, 기억나요?</span>
      <div style={{ fontSize: 17, fontWeight: 700, lineHeight: 1.5, wordBreak: "keep-all" }}>{m.q}</div>
      {sent ? (
        <p className="small" style={{ margin: 0 }}>질문함에 넣었어요. {m.label} 목소리로 답이 올 거예요.</p>
      ) : (
        <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
          {m.phone && <a className="btn sm" href={`tel:${m.phone}`} onClick={() => setM(null)}>{m.label}에게 전화하기</a>}
          <button className="btn sm soft" onClick={send}>질문으로 보내기</button>
        </div>
      )}
      <button className="textbtn" style={{ alignSelf: "flex-end", color: "var(--muted)" }} onClick={() => setM(null)}>{sent ? "닫기" : "다음에"}</button>
    </div>
  );
}
