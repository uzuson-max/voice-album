"use client";
import { josa } from "@/lib/korean";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, cached, remember } from "@/lib/supabaseBrowser";
import Loader from "@/components/Loader";
import { PhotoButton, VoiceButton } from "@/components/ChildMedia";

type P = { id: string; text: string; week?: number | null; format: "audio" | "video"; source: string; status: string; reminder_count: number; masked?: boolean; hasVoice?: boolean; hasPhoto?: boolean };

const SRC: Record<string, string> = { followup: "지난 대답에서 이어진 질문", ai: "맞춤 질문", library: "", custom: "직접 쓴 질문" };

export default function Questions() {
  const router = useRouter();
  const [d, setD] = useState<{ queued: P[]; sent: P[]; storyteller: any; family?: any; insight: any } | null>(null);
  const [polishing, setPolishing] = useState(false);
  const [edit, setEdit] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [adding, setAdding] = useState(false);
  const [newText, setNewText] = useState("");
  const [newFmt, setNewFmt] = useState<"audio" | "video">("audio");
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    try {
      const r: any = await api("/api/me/prompts");
      remember("prompts", r);
      setD(r);
    } catch {
      router.replace("/app/family");
    }
  }, [router]);
  useEffect(() => { const c = cached("prompts"); if (c) setD(c); load(); }, [load]);

  async function act(body: any) {
    await api("/api/me/prompts", { method: "PATCH", body: JSON.stringify(body) });
    setEdit(null);
    load();
  }
  async function remove(id: string) {
    if (!confirm("이 질문을 지울까요?")) return;
    await api(`/api/me/prompts?id=${id}`, { method: "DELETE" });
    load();
  }
  async function add() {
    if (!newText.trim()) return;
    await api("/api/me/prompts", { method: "POST", body: JSON.stringify({ items: [{ text: newText, format: newFmt, source: "custom" }] }) });
    setNewText(""); setAdding(false); load();
  }
  async function polish(text: string, set: (t: string) => void) {
    if (!text.trim()) return;
    setPolishing(true);
    try {
      const r = await api("/api/me/polish", { method: "POST", body: JSON.stringify({ text }) });
      set(r.text);
    } catch {}
    setPolishing(false);
  }
  async function sendNow() {
    if (!confirm(`다음 질문을 지금 ${d?.storyteller.label}에게 문자로 보낼까요?`)) return;
    setMsg("");
    try {
      await api("/api/me/send-now", { method: "POST" });
      setMsg("보냈어요.");
      load();
    } catch (e: any) {
      setMsg(e.message);
    }
  }

  if (!d) return <Loader label="질문함을 여는 중" />;
  const st = d.storyteller;

  return (
    <main className="screen with-tabs">
      <div className="stack">
        <h1 className="h1" style={{ margin: "0 4px" }}>질문함</h1>
        {d.family?.plan === "trial" && d.sent.length > 0 && (
          <a href="/app/plan" className="card stack" style={{ gap: 6, textDecoration: "none", color: "inherit" }}>
            <span className="chip" style={{ color: "var(--accent)" }}>정식 과정</span>
            <div style={{ fontSize: 16, fontWeight: 700 }}>12번의 이야기와 양장본까지</div>
            <div className="small muted">구성과 가격을 확인하려면 여기를 눌러주세요 →</div>
          </a>
        )}
        {d.insight && (
          <div className="card insight stack" style={{ gap: 6 }}>
            <span className="chip" style={{ color: "var(--accent)" }}>AI 한 줄</span>
            {d.insight.kind === "open" ? (
              <>
                <div style={{ fontSize: 16, fontWeight: 700 }}>{josa(st.label, "이/가")} &lsquo;{d.insight.title}&rsquo; 이야기를 들려주셨어요</div>
                <div className="small muted" style={{ lineHeight: 1.6 }}>{d.insight.summary}</div>
                {!d.queued[0]?.week && <div className="tiny muted">이어서 물어볼 질문을 다음 차례에 넣어뒀어요.</div>}
              </>
            ) : (
              <>
                <div style={{ fontSize: 16, fontWeight: 700 }}>{josa(st.label, "이/가")} 새 이야기를 봉해두셨어요</div>
                <div className="small muted">내용은 열리는 날까지 비밀. 대신 이어지는 질문은 미리 준비해뒀어요.</div>
              </>
            )}
          </div>
        )}
        {d.sent.length === 0 && (
          <Link href="/app/invite" className="card stack" style={{ gap: 6, textDecoration: "none", color: "inherit" }}>
            <span className="chip" style={{ color: "var(--accent)" }}>첫 문자가 가기 전에</span>
            <div style={{ fontSize: 16, fontWeight: 700 }}>{st.label}에게 먼저 카톡 한마디 보내기</div>
            <div className="small muted">모르는 번호보다 내 말이 먼저 가면, {josa(st.label, "이/가")} 첫 질문을 기다려요 →</div>
          </Link>
        )}
        <div className="card">
          <p style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>
            매주 화·토 {st.send_hour}시에 {st.label}에게 보내요
          </p>
          <p className="small muted" style={{ margin: "6px 0 12px" }}>바로 못 하셔도 괜찮아요. 다음 날 저녁 한 번만 살며시 다시 알려드리고, 못 한 이야기는 마지막에 한 번 더 열어드려요.</p>
          <button className="btn sm" onClick={sendNow}>지금 바로 하나 보내기</button>
          {msg && <p className="small" style={{ margin: "10px 0 0" }}>{msg}</p>}
        </div>

        <div className="row between section">
          <span>다음에 보낼 질문 {d.queued.length}</span>
          <button className="textbtn" onClick={() => setAdding((v) => !v)}>+ 직접 쓰기</button>
        </div>

        {adding && (
          <div className="card stack">
            <textarea className="input" value={newText} onChange={(e) => setNewText(e.target.value)} placeholder={`${st.honorific}께 묻고 싶은 것`} />
            <div className="row">
              <FormatToggle value={newFmt} onChange={setNewFmt} />
              <div className="grow" />
              <button className="textbtn" style={{ color: "var(--accent)" }} disabled={polishing} onClick={() => polish(newText, setNewText)}>
                {polishing ? "다듬는 중…" : "AI로 다듬기"}
              </button>
              <button className="btn sm" onClick={add}>추가</button>
            </div>
          </div>
        )}

        {d.queued.length > 0 && (
          <p className="tiny muted" style={{ margin: "-6px 4px 0", lineHeight: 1.6 }}>
            질문을 내 목소리로 남겨두면 {josa(st.label, "이/가")} 링크를 열 때 {d.family?.child_name || "내"} 목소리로 먼저 들어요. 사진은 있을 때만요.
          </p>
        )}

        {d.queued.length === 0 && <p className="muted small" style={{ margin: "0 4px" }}>보낼 질문이 없어요. 아래에서 추천받아 보세요.</p>}

        {d.queued.map((p, i) => (
          <div key={p.id} className="card stack" style={{ gap: 8 }}>
            <span className="chip">{[SRC[p.source], p.format === "video" ? "영상" : "음성"].filter(Boolean).join(" · ")}</span>
            {edit === p.id ? (
              <>
                <textarea className="input" value={draft} onChange={(e) => setDraft(e.target.value)} />
                <div className="row">
                  <FormatToggle value={p.format} onChange={(f) => act({ id: p.id, format: f })} />
                  <div className="grow" />
                  <button className="textbtn" style={{ color: "var(--accent)" }} disabled={polishing} onClick={() => polish(draft, setDraft)}>
                    {polishing ? "다듬는 중…" : "AI로 다듬기"}
                  </button>
                  <button className="textbtn" onClick={() => setEdit(null)} style={{ color: "var(--muted)" }}>취소</button>
                  <button className="btn sm" onClick={() => act({ id: p.id, text: draft })}>저장</button>
                </div>
              </>
            ) : (
              <>
                <div style={{ fontSize: 16, lineHeight: 1.55, ...(p.masked ? { color: "var(--muted)", fontStyle: "italic" } : {}) }}>{p.text}</div>
                {!p.masked && (
                  <div className="row" style={{ gap: 14, flexWrap: "wrap" }}>
                    <VoiceButton promptId={p.id} target="question" has={!!p.hasVoice} label="내 목소리로 묻기" />
                    <PhotoButton promptId={p.id} has={!!p.hasPhoto} />
                  </div>
                )}
                <div className="row tiny muted">
                  {i === 0 && <span style={{ color: "var(--primary)", fontWeight: 700 }}>다음 차례</span>}
                  <div className="grow" />
                  <button className="textbtn" aria-label="위로" onClick={() => act({ id: p.id, move: "up" })}>↑</button>
                  <button className="textbtn" aria-label="아래로" onClick={() => act({ id: p.id, move: "down" })}>↓</button>
                  {!p.masked && <button className="textbtn" onClick={() => { setEdit(p.id); setDraft(p.text); }}>수정</button>}
                  <button className="textbtn" style={{ color: "var(--muted)" }} onClick={() => remove(p.id)}>삭제</button>
                </div>
              </>
            )}
          </div>
        ))}

        <Link href="/app/pick" className="btn soft">{st.honorific}께 맞는 질문 추천받기</Link>

        {d.sent.length > 0 && (
          <>
            <div className="section">보낸 질문</div>
            <div className="card" style={{ padding: "4px 18px" }}>
              {d.sent.map((p, i) => (
                <div key={p.id} className="row between" style={{ minHeight: 52, padding: "8px 0", borderTop: i ? "1px solid var(--ground)" : "none" }}>
                  <span style={{ fontSize: 15 }}>{p.text}</span>
                  <span className="tiny" style={{ flexShrink: 0, fontWeight: 700, color: p.status === "answered" ? "var(--primary)" : "var(--muted)" }}>
                    {p.status === "answered" ? "이야기 도착" : "준비 중"}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </main>
  );
}

function FormatToggle({ value, onChange }: { value: "audio" | "video"; onChange: (v: "audio" | "video") => void }) {
  return (
    <div className="row" style={{ gap: 4 }}>
      {(["audio", "video"] as const).map((f) => (
        <button
          key={f}
          onClick={() => onChange(f)}
          className="textbtn"
          style={{ padding: "0 12px", borderRadius: 999, background: value === f ? "var(--tab)" : "transparent", color: "var(--ink)" }}
        >
          {f === "audio" ? "음성" : "영상"}
        </button>
      ))}
    </div>
  );
}
