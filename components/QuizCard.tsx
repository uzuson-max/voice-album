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
// 하루에 한 질문: 답하거나 닫으면 오늘은 다시 안 뜬다 (이 기기 기준, 자정에 초기화)
const DAY_KEY = "wr-quiz-day";
const today = () => new Date().toLocaleDateString("sv-SE");
const doneToday = () => { try { return localStorage.getItem(DAY_KEY) === today(); } catch { return false; } };
const markToday = () => { try { localStorage.setItem(DAY_KEY, today()); } catch {} };

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
  background: rgba(47,43,40,0.82); -webkit-backdrop-filter: blur(20px) saturate(1.4); backdrop-filter: blur(20px) saturate(1.4);
  border: 1px solid rgba(181,101,58,0.3);
  color: #E8E1D6; --ink: #E8E1D6; --muted: rgba(244,246,245,0.7);
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
    if (doneToday()) return;
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
    const close = () => { markToday(); setD(null); };

    async function answer(known: boolean) {
      markToday();
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

    const ink = "#2F2B28", gray = "#77706A", wine = "#9A4E2A", rule = "#D6CDBF";
    const d8 = new Date();
    const date = `${d8.getMonth() + 1}.${String(d8.getDate()).padStart(2, "0")}`;
    const btnFill: React.CSSProperties = { minHeight: 56, borderRadius: 2, border: `1.5px solid ${ink}`, background: ink, color: "#fff", fontSize: 17, fontWeight: 700, cursor: "pointer" };
    const btnLine: React.CSSProperties = { ...btnFill, background: "transparent", color: ink };

    // 이야기 탭과 같은 잡지 지면: 밝은 종이, 검은 글씨, 와인은 작은 강조에만
    return (
      <div role="dialog" aria-modal="true" className="wr-in" style={{
        position: "fixed", inset: 0, zIndex: 50, background: "#E8E1D6", color: ink, overflowY: "auto",
        display: "flex", flexDirection: "column", padding: "calc(18px + env(safe-area-inset-top)) 22px calc(22px + env(safe-area-inset-bottom))",
        maxWidth: 480, margin: "0 auto",
      }}>
        {/* 상단: 제호 한 줄 + 닫기만. 영어 라벨·뱃지 줄은 걷어냄 */}
        <div className="row between" style={{ alignItems: "center", borderBottom: `1px solid ${ink}`, paddingBottom: 12 }}>
          <span style={{ fontFamily: "var(--serif)", fontSize: 15, letterSpacing: ".2em", fontWeight: 600 }}>우리집 레코드</span>
          <button className="textbtn" onClick={close} style={{ color: gray, fontSize: 15 }}>닫기</button>
        </div>

        {/* 질문은 화면 위쪽 1/3 지점에서 시작 (가운데 정렬하면 답을 고른 뒤 아래로 처짐) */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 20, padding: "clamp(40px, 11vh, 96px) 0 28px" }}>
          <div style={{ fontSize: 14, color: wine, fontWeight: 700, letterSpacing: ".04em" }}>
            오늘의 한 장 <span style={{ color: gray, fontWeight: 400, marginLeft: 6 }}>{date}</span>
          </div>
          <h1 className="wr-up" style={{ fontFamily: "var(--serif)", fontSize: 30, lineHeight: 1.45, fontWeight: 700, margin: 0, wordBreak: "keep-all", textWrap: "balance" as any, animationDelay: ".1s" }}>
            {n.q}
          </h1>

          {step === "known" && (
            <div className="wr-up" style={{ background: "#fff", borderTop: `3px solid ${ink}`, padding: "12px 16px 16px" }}>
              <div style={{ fontSize: 11, letterSpacing: ".2em", color: wine, fontWeight: 700, marginBottom: 8 }}>내가 아는 답</div>
              <textarea
                className="input" value={note} onChange={(e) => setNote(e.target.value)}
                placeholder={`적어두면 나중에 ${L} 대답이랑 맞춰볼 수 있어요`}
                style={{ width: "100%", minHeight: 80, background: "#fff", color: ink, border: `1px solid ${rule}` }}
              />
            </div>
          )}
          {step === "unknown" && (
            <div className="wr-up" style={{ borderTop: `2px solid ${ink}`, borderBottom: `1px solid ${rule}`, padding: "16px 0" }}>
              {pct !== null ? (
                <div className="row" style={{ gap: 14, alignItems: "center" }}>
                  <span style={{ fontFamily: "Georgia,serif", fontSize: 46, lineHeight: 1, color: wine }}>{pct}<small style={{ fontSize: 18, color: ink }}>%</small></span>
                  <span style={{ fontSize: 15, lineHeight: 1.6, color: "#4A443F", wordBreak: "keep-all" }}>우리집 레코드를 쓰는 분들 중<br />이만큼이 몰랐어요</span>
                </div>
              ) : (
                <p style={{ margin: 0, fontFamily: "var(--serif)", fontSize: 19, fontWeight: 600 }}>몰라도 괜찮아요.</p>
              )}
              <p style={{ margin: "14px 0 0", fontSize: 16, lineHeight: 1.75, color: "#4A443F", wordBreak: "keep-all" }}>
                {(UNKNOWN_NOTE[n.key] || "다음 통화 때 물어보세요.").replaceAll("{L}", L)}
              </p>
            </div>
          )}
        </div>

        <div className="stack wr-up" style={{ gap: 10, animationDelay: ".3s" }} key={step}>
          {step === "ask" && (
            <>
              <button style={btnFill} onClick={() => answer(false)}>몰라요</button>
              <button style={btnLine} onClick={() => answer(true)}>알아요</button>
            </>
          )}
          {step === "known" && <button style={btnFill} onClick={saveNote}>저장</button>}
          {step === "unknown" && <button style={btnLine} onClick={close}>둘러보기</button>}
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
