"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/supabaseBrowser";

// 앱을 켤 때(탭 세션당 1번) 화면 가득 뜨는 "알아요?" 카드
type Next = { key: string; q: string; ask: string };

export default function QuizCard() {
  const [d, setD] = useState<{ label: string; phone: string; next: Next | null } | null>(null);
  const [step, setStep] = useState<"ask" | "known" | "unknown" | "sent">("ask");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    try { if (sessionStorage.getItem("wr-quiz-shown")) return; } catch {}
    api("/api/me/quiz").then((r: any) => {
      if (r.next) setD(r);
      try { sessionStorage.setItem("wr-quiz-shown", "1"); } catch {}
    }).catch(() => {});
  }, []);

  if (!d?.next) return null;
  const n = d.next;
  const close = () => setD(null);

  async function answer(known: boolean) {
    setStep(known ? "known" : "unknown");
    await api("/api/me/quiz", { method: "POST", body: JSON.stringify({ key: n.key, known }) }).catch(() => {});
  }
  async function saveNote() {
    if (note.trim()) await api("/api/me/quiz", { method: "POST", body: JSON.stringify({ key: n.key, note }) }).catch(() => {});
    close();
  }
  async function sendToParent() {
    setBusy(true);
    try {
      await api("/api/me/prompts", { method: "POST", body: JSON.stringify({ items: [{ text: n.ask, format: "audio", source: "custom" }] }) });
      setStep("sent");
    } catch {}
    setBusy(false);
  }

  return (
    <div role="dialog" aria-modal="true" style={{
      position: "fixed", inset: 0, zIndex: 50, background: "var(--ground)",
      display: "flex", flexDirection: "column", padding: "28px 24px calc(28px + env(safe-area-inset-bottom))",
    }}>
      <div className="row between">
        <span className="chip" style={{ color: "var(--accent)" }}>오늘의 한 장</span>
        <button className="textbtn" onClick={close} style={{ color: "var(--muted)" }}>닫기</button>
      </div>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: 18 }}>
        <h1 style={{ fontSize: 34, lineHeight: 1.35, fontWeight: 800, margin: 0, wordBreak: "keep-all" }}>{n.q}</h1>

        {step === "known" && (
          <>
            <p className="muted" style={{ margin: 0 }}>적어두면 나중에 {d.label} 대답이랑 맞춰볼 수 있어요.</p>
            <textarea className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="내가 아는 답" />
          </>
        )}
        {step === "unknown" && (
          <p style={{ margin: 0, fontSize: 18, lineHeight: 1.6 }}>
            괜찮아요. 대부분 몰라요.<br />오늘 {d.label}에게 전화해서 물어보는 건 어때요?
          </p>
        )}
        {step === "sent" && (
          <p style={{ margin: 0, fontSize: 18, lineHeight: 1.6 }}>질문함에 넣었어요. {d.label} 목소리로 답이 올 거예요.</p>
        )}
      </div>

      <div className="stack" style={{ gap: 10 }}>
        {step === "ask" && (
          <>
            <button className="btn" onClick={() => answer(false)}>몰라요</button>
            <button className="btn soft" onClick={() => answer(true)}>알아요</button>
          </>
        )}
        {step === "known" && <button className="btn" onClick={saveNote}>저장</button>}
        {step === "unknown" && (
          <>
            {d.phone && <a className="btn" href={`tel:${d.phone}`} onClick={close}>{d.label}에게 전화하기</a>}
            <button className="btn soft" disabled={busy} onClick={sendToParent}>{busy ? "넣는 중…" : `${d.label}에게 질문으로 보내기`}</button>
            <button className="textbtn" onClick={close} style={{ color: "var(--muted)" }}>나중에</button>
          </>
        )}
        {step === "sent" && <button className="btn" onClick={close}>확인</button>}
      </div>
    </div>
  );
}
