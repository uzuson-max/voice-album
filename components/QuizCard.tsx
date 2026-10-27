"use client";
import React, { useEffect, useState } from "react";
import { api } from "@/lib/supabaseBrowser";
import { UNKNOWN_NOTE } from "@/lib/quiz";

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
@keyframes wrDown { from { opacity: 0; transform: translateY(-120%); } to { opacity: 1; transform: none; } }
.wr-down { animation: wrDown .55s cubic-bezier(.2,.8,.2,1) both; }
.wr-noti {
  position: fixed; left: 10px; right: 10px; top: calc(10px + env(safe-area-inset-top)); z-index: 60;
  max-width: 460px; margin: 0 auto; padding: 12px 14px 12px; border-radius: 22px;
  background: rgba(14, 26, 22, 0.78); -webkit-backdrop-filter: blur(20px) saturate(1.4); backdrop-filter: blur(20px) saturate(1.4);
  border: 1px solid rgba(255, 255, 255, 0.09);
  color: #f3ede2; --ink: #f3ede2; --muted: rgba(243, 237, 226, 0.62);
  box-shadow: 0 14px 34px -10px rgba(0, 0, 0, 0.7);
  touch-action: pan-x; transition: transform .25s ease, opacity .25s ease;
}
.wr-noti .ic { width: 20px; height: 20px; border-radius: 6px; background: var(--primary); display: grid; place-items: center; flex-shrink: 0; }
.wr-noti .ic i { width: 7px; height: 7px; border-radius: 50%; background: var(--on-primary); display: block; }
.wr-noti .act { min-height: 36px; padding: 0 14px; border-radius: 999px; border: none; font-size: 14px; font-weight: 700; cursor: pointer; text-decoration: none; display: inline-flex; align-items: center; }
.wr-noti .act.main { background: var(--primary); color: var(--on-primary); }
.wr-noti .act.sub { background: rgba(255, 255, 255, 0.08); color: var(--ink); }
@media (prefers-reduced-motion: reduce) { .wr-in, .wr-up, .wr-down { animation: none; opacity: 1; } }
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
                {pct !== null ? <>우리집 레코드를 쓰는 분들 중 <b style={{ color: "var(--accent)" }}>{pct}%</b>도 몰랐어요.</> : <>몰라도 괜찮아요.</>}
              </p>
              <p className="wr-up muted" style={{ margin: 0, fontSize: 16, lineHeight: 1.7, wordBreak: "keep-all", animationDelay: ".6s" }}>
                {(UNKNOWN_NOTE[n.key] || "다음 통화 때 물어보세요.").replaceAll("{L}", L)}
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

  // 위로 밀어 닫기
  let y0 = 0;
  const onStart = (e: React.TouchEvent) => { y0 = e.touches[0].clientY; };
  const onMove = (e: React.TouchEvent) => {
    const dy = Math.min(0, e.touches[0].clientY - y0);
    (e.currentTarget as HTMLElement).style.transform = `translateY(${dy}px)`;
  };
  const onEnd = (e: React.TouchEvent) => {
    const el = e.currentTarget as HTMLElement;
    const dy = e.changedTouches[0].clientY - y0;
    if (dy < -40) { el.style.transform = "translateY(-140%)"; el.style.opacity = "0"; setTimeout(() => setM(null), 220); }
    else el.style.transform = "";
  };

  return (
    <div className="wr-noti wr-down" role="status" onTouchStart={onStart} onTouchMove={onMove} onTouchEnd={onEnd}>
      <div className="row" style={{ gap: 8 }}>
        <span className="ic"><i /></span>
        <span className="tiny" style={{ fontWeight: 700 }}>우리집 레코드</span>
        <span className="tiny muted">· 아까 그 질문</span>
        <div className="grow" />
        <button className="textbtn" aria-label="닫기" style={{ minHeight: 28, padding: "0 2px", color: "var(--muted)", fontSize: 18 }} onClick={() => setM(null)}>×</button>
      </div>
      <div style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.5, margin: "4px 0 10px 28px", wordBreak: "keep-all" }}>{m.q}</div>
      {sent ? (
        <p className="small muted" style={{ margin: "0 0 2px 28px" }}>질문함에 넣었어요. {m.label} 목소리로 답이 올 거예요.</p>
      ) : (
        <div className="row" style={{ gap: 6, marginLeft: 28, flexWrap: "wrap" }}>
          {m.phone && <a className="act main" href={`tel:${m.phone}`} onClick={() => setM(null)}>{m.label}에게 전화</a>}
          <button className="act sub" onClick={send}>질문으로 보내기</button>
        </div>
      )}
    </div>
  );
}
