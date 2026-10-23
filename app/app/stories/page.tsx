"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/supabaseBrowser";
import { GiftBox, Mic } from "@/components/Illust";
import { koDate } from "@/lib/time";

export default function Stories() {
  const [d, setD] = useState<any>(null);
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => { api("/api/me/stories").then(setD).catch(() => setD({ opened: [], sealed: [] })); }, []);
  if (!d) return <main className="screen center"><p className="muted">잠시만요…</p></main>;
  const label = d.storyteller?.label || "부모님";

  return (
    <main className="screen with-tabs">
      <div className="stack">
        <h1 className="h1" style={{ margin: "0 4px" }}>{label}의 이야기</h1>

        {d.sealed.map((s: any) => (
          <div key={s.unsealAt} className="card big">
            <GiftBox />
            <div style={{ fontSize: 20, fontWeight: 700 }}>{koDate(s.unsealAt)}에 열려요</div>
            <div className="muted" style={{ fontSize: 15 }}>
              {label}가 이야기 {s.count}개를 봉해두었어요{s.video ? ` · 영상 ${s.video}개` : ""}
            </div>
          </div>
        ))}

        {d.sealed.length === 0 && d.opened.length === 0 && (
          <div className="card big">
            <GiftBox />
            <div style={{ fontSize: 18, fontWeight: 700 }}>아직 도착한 이야기가 없어요</div>
            <div className="muted small">{label}가 대답하면 여기에 모여요</div>
          </div>
        )}

        {d.opened.length > 0 && <div className="section">열린 이야기 {d.opened.length}</div>}
        {d.opened.map((a: any) => (
          <div key={a.id} className="card stack" style={{ gap: 10 }}>
            <button
              onClick={() => setOpen(open === a.id ? null : a.id)}
              className="row"
              style={{ border: "none", background: "none", padding: 0, textAlign: "left", cursor: "pointer", gap: 14 }}
            >
              <span style={{ width: 48, height: 48, flexShrink: 0, borderRadius: 14, background: "var(--ground)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {a.mediaType === "video" ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="#f3eee3" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>
                ) : (
                  <Mic color="#f3eee3" />
                )}
              </span>
              <span className="stack" style={{ gap: 3 }}>
                <span style={{ fontSize: 16, fontWeight: 700 }}>{a.title || a.question}</span>
                <span className="small muted">
                  {a.mediaType === "video" ? "영상" : "음성"}
                  {a.duration ? ` · ${Math.max(1, Math.round(a.duration / 60))}분` : ""}
                </span>
              </span>
            </button>
            {open === a.id && (
              <>
                <p className="small muted" style={{ margin: 0 }}>Q. {a.question}</p>
                {a.mediaType === "video" ? <video src={a.url} controls playsInline /> : <audio src={a.url} controls />}
                {a.summary && <p style={{ margin: 0, fontSize: 15, lineHeight: 1.6 }}>{a.summary}</p>}
                {a.transcript && (
                  <details>
                    <summary className="small muted" style={{ cursor: "pointer" }}>받아쓴 글 보기</summary>
                    <p style={{ fontSize: 15, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{a.transcript}</p>
                  </details>
                )}
              </>
            )}
          </div>
        ))}
      </div>
    </main>
  );
}
