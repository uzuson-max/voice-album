"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/supabaseBrowser";
import { GiftBox } from "@/components/Illust";
import { VoiceButton } from "@/components/ChildMedia";
import { koDate } from "@/lib/time";

type Turn = { id: string; asked: string; mediaType: "audio" | "video"; duration: number | null; transcript: string | null; url: string | null };
type Article = {
  promptId: string; question: string; title: string; article: string | null; summary: string | null;
  photoUrl: string | null; reactionText: string | null; reactionAudioUrl: string | null; createdAt: string; turns: Turn[];
};

export default function Stories() {
  const [d, setD] = useState<any>(null);
  const load = () => api("/api/me/stories").then(setD).catch(() => setD({ articles: [], sealed: [] }));
  useEffect(() => { load(); }, []);
  if (!d) return <main className="screen center"><p className="muted">잠시만요…</p></main>;
  const label = d.storyteller?.label || "부모님";
  const total = d.articles.length;

  return (
    <main className="screen with-tabs">
      <div className="stack">
        <header className="masthead">
          <div className="tiny muted">우리집 신문</div>
          <h1 className="serif" style={{ margin: "4px 0 0", fontSize: 28 }}>{label}의 이야기</h1>
          {total > 0 && <div className="tiny muted" style={{ marginTop: 6 }}>지금까지 {total}편</div>}
        </header>

        {d.sealed.map((s: any) => (
          <div key={s.unsealAt} className="card big">
            <GiftBox />
            <div style={{ fontSize: 20, fontWeight: 700 }}>{koDate(s.unsealAt)}에 열려요</div>
            <div className="muted" style={{ fontSize: 15 }}>
              {label}가 이야기 {s.count}개를 봉해두었어요{s.video ? ` · 영상 ${s.video}개` : ""}
            </div>
          </div>
        ))}

        {d.sealed.length === 0 && total === 0 && (
          <div className="card big">
            <GiftBox />
            <div style={{ fontSize: 18, fontWeight: 700 }}>아직 도착한 이야기가 없어요</div>
            <div className="muted small">{label}가 대답하면 여기에 한 편씩 실려요</div>
          </div>
        )}

        {d.articles.map((a: Article, i: number) => (
          <ArticleCard key={a.promptId} a={a} no={total - i} label={label} onSaved={load} />
        ))}
      </div>
    </main>
  );
}

function ArticleCard({ a, no, label, onSaved }: { a: Article; no: number; label: string; onSaved: () => void }) {
  const [pen, setPen] = useState(a.reactionText || "");
  const [saved, setSaved] = useState(!!a.reactionText);
  const [saving, setSaving] = useState(false);
  const body = a.article || a.turns.map((t) => t.transcript).filter(Boolean).join("\n\n");
  const date = a.createdAt ? koDate(a.createdAt.slice(0, 10)) : "";

  async function savePen() {
    setSaving(true);
    try {
      await api("/api/me/media", { method: "PUT", body: JSON.stringify({ target: "text", promptId: a.promptId, text: pen }) });
      setSaved(!!pen.trim());
    } catch {}
    setSaving(false);
  }

  return (
    <article className="card stack" style={{ gap: 12, padding: "20px 18px" }}>
      <div className="row tiny muted" style={{ gap: 8 }}>
        <span>제{no}호</span><span>·</span><span>{date}</span>
      </div>
      <h2 className="serif" style={{ margin: 0, fontSize: 22, lineHeight: 1.4 }}>{a.title}</h2>
      <p className="small muted" style={{ margin: 0 }}>Q. {a.question}</p>

      {a.photoUrl && <img src={a.photoUrl} alt="" className="photo" />}

      {body ? (
        <div className="article">
          {body.split(/\n{2,}/).map((para, k) => <p key={k}>{para}</p>)}
        </div>
      ) : (
        <p className="small muted" style={{ margin: 0 }}>글로 옮기는 중이에요. 먼저 목소리로 들어보세요.</p>
      )}

      {a.turns.map((t, k) => (
        <div key={t.id} className="stack" style={{ gap: 6 }}>
          {k > 0 && <span className="tiny muted">이어서 · {t.asked}</span>}
          {t.url && (t.mediaType === "video" ? <video src={t.url} controls playsInline /> : <audio src={t.url} controls />)}
        </div>
      ))}

      <div className="redpen stack" style={{ gap: 8 }}>
        <div className="tiny" style={{ color: "var(--accent)", fontWeight: 700 }}>빨간펜 · {label}께 다음 질문과 함께 전해져요</div>
        <textarea
          className="input hand"
          value={pen}
          onChange={(e) => { setPen(e.target.value); setSaved(false); }}
          placeholder={`예) 이거 처음 알았어. ${label} 그때 진짜 멋있었네`}
          style={{ minHeight: 70 }}
        />
        <div className="row" style={{ flexWrap: "wrap" }}>
          <VoiceButton promptId={a.promptId} target="reaction" has={!!a.reactionAudioUrl} label="목소리로 한마디" limit={60} onDone={onSaved} />
          <div className="grow" />
          <button className="btn sm" onClick={savePen} disabled={saving || saved || !pen.trim()}>
            {saving ? "저장 중…" : saved ? "남겼어요" : "남기기"}
          </button>
        </div>
      </div>
    </article>
  );
}
