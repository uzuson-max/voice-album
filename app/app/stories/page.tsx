"use client";
import { useEffect, useState } from "react";
import { api, cached, remember } from "@/lib/supabaseBrowser";
import Loader from "@/components/Loader";
import { GiftBox } from "@/components/Illust";
import { VoiceButton } from "@/components/ChildMedia";
import { koDate } from "@/lib/time";
import { josa } from "@/lib/korean";

type Turn = { id: string; asked: string; mediaType: "audio" | "video"; duration: number | null; transcript: string | null; url: string | null };
type Article = {
  promptId: string; question: string; lead: string | null; week: number | null; title: string; article: string | null;
  quote: string | null; replyLead: string | null; replyAsk: string | null; summary: string | null;
  photoUrl: string | null; reactionText: string | null; reactionAudioUrl: string | null; createdAt: string; turns: Turn[];
};

export default function Stories() {
  const [d, setD] = useState<any>(null);
  const load = () =>
    api("/api/me/stories")
      .then((r) => { remember("stories", r); setD(r); })
      .catch(() => setD((v: any) => v || { articles: [], sealed: [] }));
  useEffect(() => { const c = cached("stories"); if (c) setD(c); load(); }, []);
  if (!d) return <Loader label="이야기를 펼치는 중" />;
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
              {josa(label, "이/가")} 이야기 {s.count}개를 봉해두었어요{s.video ? ` · 영상 ${s.video}개` : ""}
            </div>
          </div>
        ))}

        {d.sealed.length === 0 && total === 0 && (
          <div className="card big">
            <GiftBox />
            <div style={{ fontSize: 18, fontWeight: 700 }}>아직 도착한 이야기가 없어요</div>
            <div className="muted small">{josa(label, "이/가")} 대답하면 여기에 한 편씩 실려요</div>
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
        <span>제{a.week || no}호</span><span>·</span><span>{date}</span>
      </div>
      <h2 className="serif" style={{ margin: 0, fontSize: 22, lineHeight: 1.4 }}>{a.title}</h2>
      {a.lead && <p className="small muted" style={{ margin: 0, lineHeight: 1.6 }}>{a.lead}</p>}
      <p className="small muted" style={{ margin: 0 }}>Q. {a.question}</p>

      {a.quote && (
        <blockquote className="pullquote">
          <span aria-hidden="true">“</span>
          <p>{a.quote}</p>
        </blockquote>
      )}

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
          {t.url && (t.mediaType === "video" ? <Film src={t.url} /> : <audio src={t.url} controls />)}
        </div>
      ))}

      {a.replyAsk ? (
        <div className="reply stack" style={{ gap: 8 }}>
          <div className="tiny" style={{ color: "var(--accent)", fontWeight: 700 }}>내 답장 차례 · {label}의 다음 링크에 먼저 도착해요</div>
          {a.replyLead && <p className="small muted" style={{ margin: 0, whiteSpace: "pre-line" }}>{a.replyLead}</p>}
          <p className="serif" style={{ margin: 0, fontSize: 17, lineHeight: 1.55 }}>{a.replyAsk}</p>
          <div className="row">
            <VoiceButton promptId={a.promptId} target="reaction" has={!!a.reactionAudioUrl} label="목소리로 답장하기" limit={120} onDone={onSaved} />
          </div>
        </div>
      ) : (
        <div className="reply stack" style={{ gap: 8 }}>
          <div className="tiny muted" style={{ fontWeight: 700 }}>엮은이의 한 줄 · 선택</div>
          <textarea
            className="input"
            value={pen}
            onChange={(e) => { setPen(e.target.value); setSaved(false); }}
            placeholder={`예) ${josa(label, "이/가")} 그때 그런 꿈이 있었는지 처음 알았다.`}
            style={{ minHeight: 60 }}
          />
          <div className="row">
            <div className="grow" />
            <button className="btn sm" onClick={savePen} disabled={saving || saved || !pen.trim()}>
              {saving ? "저장 중…" : saved ? "남겼어요" : "남기기"}
            </button>
          </div>
        </div>
      )}
    </article>
  );
}

// 기사 속 영상: 재생하면 신문 칸에서 화면 폭으로 펼쳐지고, 멈추면 다시 칸으로
function Film({ src }: { src: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`film${open ? " open" : ""}`}>
      <video src={src} controls playsInline onPlay={() => setOpen(true)} onPause={() => setOpen(false)} onEnded={() => setOpen(false)} />
    </div>
  );
}
