"use client";
import { useCallback, useEffect, useState } from "react";
import { api, cached, remember } from "@/lib/supabaseBrowser";
import Loader from "@/components/Loader";

type R = { qkey: string; known: boolean; note: string | null; learned_at: string | null; q: string; ask: string };

export default function Know() {
  const [d, setD] = useState<{ label: string; records: R[]; total: number } | null>(null);
  const [edit, setEdit] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    try { const r: any = await api("/api/me/quiz"); remember("quiz", r); setD(r); } catch {}
  }, []);
  useEffect(() => { const c = cached("quiz"); if (c) setD(c); load(); }, [load]);

  async function save(key: string) {
    await api("/api/me/quiz", { method: "POST", body: JSON.stringify({ key, note: draft }) });
    setEdit(null); load();
  }
  async function ask(r: R) {
    await api("/api/me/prompts", { method: "POST", body: JSON.stringify({ items: [{ text: r.ask, format: "audio", source: "custom" }] }) });
    setMsg("질문함에 넣었어요.");
  }

  if (!d) return <Loader label="기록을 여는 중" />;
  const L = d.label;
  const unknown = d.records.filter((r) => !r.known && !r.learned_at);
  const learned = d.records.filter((r) => !r.known && r.learned_at);
  const known = d.records.filter((r) => r.known);

  const Item = (r: R) => (
    <div key={r.qkey} className="card stack" style={{ gap: 8 }}>
      <div style={{ fontSize: 16, fontWeight: 700, lineHeight: 1.5 }}>{r.q}</div>
      {edit === r.qkey ? (
        <>
          <textarea className="input" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="알아낸 답" />
          <div className="row">
            <div className="grow" />
            <button className="textbtn" onClick={() => setEdit(null)} style={{ color: "var(--muted)" }}>취소</button>
            <button className="btn sm" onClick={() => save(r.qkey)}>저장</button>
          </div>
        </>
      ) : (
        <>
          {r.note && <div className="small" style={{ lineHeight: 1.6 }}>{r.note}</div>}
          <div className="row tiny" style={{ gap: 14 }}>
            <button className="textbtn" onClick={() => { setEdit(r.qkey); setDraft(r.note || ""); }}>{r.note ? "수정" : "답 적기"}</button>
            {!r.known && !r.learned_at && <button className="textbtn" style={{ color: "var(--accent)" }} onClick={() => ask(r)}>{L}에게 질문으로 보내기</button>}
          </div>
        </>
      )}
    </div>
  );

  return (
    <main className="screen with-tabs">
      <div className="stack">
        <h1 className="h1" style={{ margin: "0 4px" }}>{L}에 대해</h1>
        <div className="card row" style={{ justifyContent: "space-around", textAlign: "center" }}>
          <Stat n={unknown.length} t="아직 몰라요" color="var(--accent)" />
          <Stat n={learned.length} t="이제 알아요" color="var(--primary)" />
          <Stat n={known.length} t="원래 알았어요" color="var(--ink)" />
        </div>
        <p className="tiny muted" style={{ margin: "0 4px" }}>앱을 켤 때마다 한 장씩 늘어나요. ({d.records.length}/{d.total})</p>
        {msg && <p className="small" style={{ margin: "0 4px" }}>{msg}</p>}
        {d.records.length === 0 && <p className="muted small" style={{ margin: "0 4px" }}>아직 기록이 없어요. 다음에 앱을 열면 첫 카드가 떠요.</p>}
        {unknown.length > 0 && <div className="section">아직 몰라요</div>}
        {unknown.map(Item)}
        {learned.length > 0 && <div className="section">이제 알아요</div>}
        {learned.map(Item)}
        {known.length > 0 && <div className="section">원래 알았어요</div>}
        {known.map(Item)}
      </div>
    </main>
  );
}

function Stat({ n, t, color }: { n: number; t: string; color: string }) {
  return (
    <div className="stack" style={{ gap: 2 }}>
      <span style={{ fontSize: 28, fontWeight: 800, color }}>{n}</span>
      <span className="tiny muted">{t}</span>
    </div>
  );
}
