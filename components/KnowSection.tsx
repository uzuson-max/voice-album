"use client";
import { useCallback, useEffect, useState } from "react";
import { api, cached, remember } from "@/lib/supabaseBrowser";

// 이야기 탭 안의 '아직 모르는 엄마' — 오늘의 질문에서 '몰라요'를 누른 것들이 모이는 시험지
// 모르는 것 → 물어보기(질문함) / 답 적기(이제 알아요)로 닫히게 해서, 그냥 쌓이기만 하지 않게
type R = { qkey: string; known: boolean; note: string | null; learned_at: string | null; q: string; ask: string };

export default function KnowSection() {
  const [d, setD] = useState<{ label: string; records: R[]; total: number } | null>(null);
  const [edit, setEdit] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [sent, setSent] = useState<Record<string, boolean>>({});
  const [more, setMore] = useState(false);
  const [showDone, setShowDone] = useState(false);

  const load = useCallback(async () => {
    try { const r: any = await api("/api/me/quiz"); remember("quiz", r); setD(r); } catch {}
  }, []);
  useEffect(() => { const c = cached("quiz"); if (c) setD(c); load(); }, [load]);

  if (!d) return null;
  const L = d.label;
  const unknown = d.records.filter((r) => !r.known && !r.learned_at);
  const learned = d.records.filter((r) => !r.known && r.learned_at);
  const known = d.records.filter((r) => r.known);
  const done = [...learned, ...known];
  const list = more ? unknown : unknown.slice(0, 3);

  async function save(key: string) {
    await api("/api/me/quiz", { method: "POST", body: JSON.stringify({ key, note: draft }) }).catch(() => {});
    setEdit(null);
    load();
  }
  async function ask(r: R) {
    try {
      await api("/api/me/prompts", { method: "POST", body: JSON.stringify({ items: [{ text: r.ask, format: "audio", source: "custom" }] }) });
      setSent((s) => ({ ...s, [r.qkey]: true }));
    } catch {}
  }

  return (
    <section className="kq">
      <style>{CSS}</style>
      <div className="kq-hrow"><span className="kq-latin">QUIZ</span><small>{d.records.length} / {d.total}</small></div>
      <h2 className="kq-title">아직 모르는 {L}</h2>

      <div className="kq-score">
        <div><b className="w">{unknown.length}</b><span>아직 몰라요</span></div>
        <div><b>{learned.length}</b><span>이제 알아요</span></div>
        <div><b>{known.length}</b><span>원래 알았어요</span></div>
      </div>

      {d.records.length === 0 && (
        <p className="kq-empty">앱을 켤 때 뜨는 오늘의 질문에서 &lsquo;몰라요&rsquo;를 누르면 여기에 모여요.</p>
      )}
      {d.records.length > 0 && unknown.length === 0 && (
        <p className="kq-empty">모르는 게 하나도 안 남았어요. 내일 새 질문이 와요.</p>
      )}

      {list.map((r) => (
        <div key={r.qkey} className="kq-item">
          <p className="q">{r.q}</p>
          {edit === r.qkey ? (
            <div className="kq-edit">
              <textarea className="input" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={`${L}에게 들은 답`} />
              <div className="kq-acts">
                <button onClick={() => setEdit(null)}>취소</button>
                <button className="main" onClick={() => save(r.qkey)} disabled={!draft.trim()}>이제 알아요</button>
              </div>
            </div>
          ) : sent[r.qkey] ? (
            <p className="kq-sent">질문함에 넣었어요. {L} 목소리로 답이 오면 이야기에 실려요.</p>
          ) : (
            <div className="kq-acts">
              <button className="main" onClick={() => ask(r)}>{L}에게 물어보기</button>
              <button onClick={() => { setEdit(r.qkey); setDraft(""); }}>답 적기</button>
            </div>
          )}
        </div>
      ))}
      {unknown.length > 3 && (
        <button className="kq-more" onClick={() => setMore(!more)}>{more ? "접기" : `모르는 것 ${unknown.length - 3}개 더 보기`}</button>
      )}

      {done.length > 0 && (
        <>
          <button className="kq-more" onClick={() => setShowDone(!showDone)}>{showDone ? "접기" : `알게 된 것 ${done.length}개 보기`}</button>
          {showDone && done.map((r) => (
            <div key={r.qkey} className="kq-item done">
              <p className="q"><span className="badge">{r.known ? "원래 알았어요" : "이제 알아요"}</span>{r.q}</p>
              {r.note && <p className="note">{r.note}</p>}
            </div>
          ))}
        </>
      )}
    </section>
  );
}

const CSS = `
.kq{padding:34px 20px 4px}
.kq-hrow{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:2px solid #141211;padding-bottom:10px}
.kq-latin{font-family:Georgia,serif;font-size:36px;letter-spacing:.14em;line-height:1}
.kq-hrow small{font-size:12px;color:#8A827B}
.kq-title{margin:16px 0 0;font-family:var(--serif);font-weight:700;font-size:22px;line-height:1.4}
.kq-score{display:grid;grid-template-columns:repeat(3,1fr);margin-top:14px;border-top:1px solid #141211;border-bottom:1px solid #D9D3CB}
.kq-score>div{padding:12px 0 12px 10px;display:flex;flex-direction:column;gap:4px}
.kq-score>div:first-child{padding-left:0}
.kq-score>div+div{border-left:1px solid #D9D3CB}
.kq-score b{font-family:Georgia,serif;font-weight:400;font-size:30px;line-height:1;color:#141211}
.kq-score b.w{color:var(--mz,#6A2232)}
.kq-score span{font-size:12px;color:#46403C}
.kq-empty{margin:16px 0 0;font-size:14px;line-height:1.7;color:#8A827B;word-break:keep-all}
.kq-item{padding:16px 0;border-bottom:1px solid #D9D3CB}
.kq-item .q{margin:0;font-family:var(--serif);font-weight:600;font-size:16.5px;line-height:1.55;color:#141211;word-break:keep-all}
.kq-item .note{margin:6px 0 0;font-size:14px;line-height:1.7;color:#46403C;white-space:pre-line}
.kq-item .badge{display:inline-block;font-family:inherit;font-size:10.5px;font-weight:700;letter-spacing:.06em;color:var(--mz,#6A2232);border:1px solid currentColor;padding:1px 6px;margin-right:8px;vertical-align:2px}
.kq-item.done .q{font-size:15px;font-weight:500}
.kq-acts{display:flex;gap:8px;margin-top:10px;flex-wrap:wrap}
.kq-acts button{min-height:38px;padding:0 14px;border-radius:2px;border:1.5px solid #141211;background:transparent;color:#141211;font:inherit;font-size:14px;font-weight:700;cursor:pointer}
.kq-acts button.main{background:#141211;color:#fff}
.kq-acts button:disabled{opacity:.4}
.kq-edit textarea{width:100%;min-height:70px;margin-top:10px;background:#fff;color:#141211;border:1px solid #D9D3CB}
.kq-sent{margin:8px 0 0;font-size:13.5px;line-height:1.6;color:var(--mz,#6A2232);word-break:keep-all}
.kq-more{display:block;margin-top:12px;padding:0;border:0;background:none;color:#46403C;font:inherit;font-size:13.5px;font-weight:700;text-decoration:underline;text-underline-offset:3px;cursor:pointer}
`;
