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

// 이야기 화면 보는 방식 — 자녀가 고르고, 이 기기에 기억된다
const THEMES: { key: string; name: string; dot: string; vars: Record<string, string> | null }[] = [
  { key: "paper", name: "와인", dot: "#5E2A33", vars: null },
  { key: "film", name: "에스프레소", dot: "#2B1E1A", vars: {
    "--ground": "#2E211C", "--card": "#433029", "--card2": "#382821", "--ink": "#FBF6EF", "--muted": "#DCCABD",
    "--line": "rgba(216,184,126,.2)", "--accent": "#F0C978", "--primary": "#ECC470", "--on-primary": "#2E211C", "--gold-hi": "#F8DFA4", "--gold-lo": "#CF9D48", "--box": "#17100E", "--box-ink": "var(--ink)", "--box-muted": "var(--muted)", "--box-accent": "var(--accent)" } },
  { key: "garden", name: "정원", dot: "#3d5a40", vars: {
    "--ground": "#34503a", "--card": "#41613f", "--card2": "#4a6b4d", "--ink": "#f3f1e6", "--muted": "#c9d6c0",
    "--line": "rgba(243,241,230,.2)", "--accent": "#D3A65E", "--primary": "#D3A65E", "--on-primary": "#16291F", "--gold-hi": "#E2BE80", "--gold-lo": "#B88B45", "--box": "#24372a", "--box-ink": "var(--ink)", "--box-muted": "var(--muted)", "--box-accent": "var(--accent)" } },
  { key: "classic", name: "클래식", dot: "#1c2433", vars: {
    "--ground": "#1c2433", "--card": "#263046", "--card2": "#2e3a54", "--ink": "#f1ede4", "--muted": "#a9b1c2",
    "--line": "rgba(241,237,228,.18)", "--accent": "#D4B37A", "--primary": "#D4B37A", "--on-primary": "#141C30", "--gold-hi": "#E8D0A2", "--gold-lo": "#B8955A", "--box": "#131a26", "--box-ink": "var(--ink)", "--box-muted": "var(--muted)", "--box-accent": "var(--accent)" } },
];

export default function Stories() {
  const [d, setD] = useState<any>(null);
  const [theme, setTheme] = useState("paper");
  useEffect(() => { try { const t = localStorage.getItem("vf_story_theme"); if (t) setTheme(t); } catch {} }, []);
  const pickTheme = (k: string) => { setTheme(k); try { localStorage.setItem("vf_story_theme", k); } catch {} };
  const th = THEMES.find((x) => x.key === theme) || THEMES[0];
  const load = () =>
    api("/api/me/stories")
      .then((r) => { remember("stories", r); setD(r); })
      .catch(() => setD((v: any) => v || { articles: [], sealed: [] }));
  useEffect(() => {
    const c = cached("stories"); if (c) setD(c); load();
    // 앱을 오래 켜뒀다 다시 보면 영상 주소가 만료돼 있으니 새로 받아온다
    let last = Date.now();
    const onShow = () => { if (document.visibilityState === "visible" && Date.now() - last > 10 * 60 * 1000) { last = Date.now(); load(); } };
    document.addEventListener("visibilitychange", onShow);
    return () => document.removeEventListener("visibilitychange", onShow);
  }, []);
  // 영상·음성이 안 열리면(주소 만료) 한 번만 새 주소로 다시 받는다
  const [retried, setRetried] = useState(false);
  const onMediaError = () => { if (!retried) { setRetried(true); load(); } };
  if (!d) return <Loader label="이야기를 펼치는 중" />;
  const label = d.storyteller?.label || "부모님";
  const total = d.articles.length;

  return (
    <main
      className="screen with-tabs"
      data-story-theme={th.vars ? th.key : undefined}
      style={th.vars ? ({ ...th.vars, background: "var(--ground)", color: "var(--ink)", minHeight: "100vh", transition: "background .4s" } as any) : undefined}
    >
      {th.vars && (
        <style>{`[data-story-theme] .card{background:linear-gradient(180deg,var(--card2) 0%,var(--card) 100%);box-shadow:inset 0 1px 0 rgba(255,255,255,.1),0 2px 0 rgba(0,0,0,.25),0 12px 22px -10px rgba(0,0,0,.55)}`}</style>
      )}
      <div className="stack">
        <header className="masthead">
          <div className="tiny muted">우리집 신문</div>
          <h1 className="serif" style={{ margin: "4px 0 0", fontSize: 28 }}>{label}의 이야기</h1>
          {total > 0 && <div className="tiny muted" style={{ marginTop: 6 }}>지금까지 {total}편</div>}
        </header>

        {total > 0 && (
          <div className="row" style={{ gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <span className="tiny muted" style={{ marginRight: 2 }}>보는 방식</span>
            {THEMES.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => pickTheme(t.key)}
                className="row tiny"
                style={{
                  gap: 6, alignItems: "center", padding: "6px 12px", borderRadius: 999, cursor: "pointer", color: "inherit", font: "inherit",
                  background: "transparent", border: theme === t.key ? "1.5px solid var(--accent)" : "1px solid var(--line)",
                  fontWeight: theme === t.key ? 700 : 400,
                }}
              >
                <span style={{ width: 12, height: 12, borderRadius: 6, background: t.dot, border: "1px solid rgba(255,255,255,.4)" }} />
                {t.name}
              </button>
            ))}
          </div>
        )}

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

        <div className="issues">
          {d.articles.map((a: Article, i: number) => (
            <ArticleCard key={a.promptId} a={a} no={total - i} label={label} onSaved={load} onMediaError={onMediaError} />
          ))}
        </div>
        {total > 0 && (
          <a href="/app/export" className="link" style={{ textAlign: "center" }}>목소리·영상 원본 전체 내려받기</a>
        )}
      </div>
    </main>
  );
}

function ArticleCard({ a, no, label, onSaved, onMediaError }: { a: Article; no: number; label: string; onSaved: () => void; onMediaError: () => void }) {
  const [pen, setPen] = useState(a.reactionText || "");
  const [saved, setSaved] = useState(!!a.reactionText);
  const [saving, setSaving] = useState(false);
  const full = a.turns.map((t) => t.transcript).filter(Boolean).join("\n\n");
  const body = a.article || full;
  const [showFull, setShowFull] = useState(false);
  const date = a.createdAt ? koDate(a.createdAt.slice(0, 10)) : "";

  async function savePen() {
    setSaving(true);
    try {
      await api("/api/me/media", { method: "PUT", body: JSON.stringify({ target: "text", promptId: a.promptId, text: pen }) });
      setSaved(!!pen.trim());
    } catch {}
    setSaving(false);
  }

  // 한 호는 짧게: 목소리·영상 → 인용 한 줄 → 첫 문단. 나머지는 "이어서 읽기"로 접어둔다
  const paras = body ? body.split(/\n{2,}/).filter((x) => x.trim()) : [];
  const [open, setOpen] = useState(false);
  const [penOpen, setPenOpen] = useState(!!a.reactionText);

  return (
    <article className="card issue">
      <div className="issue-no">
        <span>NO. {String(a.week || no).padStart(2, "0")}</span>
        <span className="date">{date}</span>
      </div>
      <h2>{a.title}</h2>

      {a.turns.map((t, k) => (
        <div key={t.id} className="stack" style={{ gap: 6 }}>
          {k > 0 && <span className="tiny muted">이어서 · {t.asked}</span>}
          {t.url && (t.mediaType === "video" ? <Film src={t.url} onError={onMediaError} /> : <audio src={t.url} controls preload="metadata" onError={onMediaError} />)}
        </div>
      ))}

      {a.quote && (
        <blockquote className="pullquote">
          <span aria-hidden="true">“</span>
          <p>{a.quote}</p>
        </blockquote>
      )}

      {a.photoUrl && <img src={a.photoUrl} alt="" className="photo" />}

      {paras.length ? (
        <div className="article">
          {(open ? paras : paras.slice(0, 1)).map((para, k) => <p key={k}>{para}</p>)}
        </div>
      ) : (
        <p className="small muted" style={{ margin: 0 }}>글로 옮기는 중이에요. 먼저 목소리로 들어보세요.</p>
      )}

      {open && (
        <div className="stack" style={{ gap: 10 }}>
          <p className="small muted" style={{ margin: 0, lineHeight: 1.7 }}>Q. {a.question}</p>
          {a.article && full && (
            <>
              <button type="button" className="link" style={{ alignSelf: "flex-start", paddingLeft: 0 }} onClick={() => setShowFull(!showFull)}>
                {showFull ? "말씀 전체 접기" : `${label}의 말씀 그대로 보기`}
              </button>
              {showFull && <div className="small" style={{ lineHeight: 1.9, opacity: 0.9, whiteSpace: "pre-line" }}>{full}</div>}
            </>
          )}
        </div>
      )}
      {(paras.length > 1 || (a.article && full)) && (
        <button type="button" className="more" onClick={() => setOpen(!open)}>{open ? "접기" : "이어서 읽기"}</button>
      )}

      {a.replyAsk ? (
        <div className="reply stack" style={{ gap: 10 }}>
          <div className="tiny" style={{ color: "var(--accent)", fontWeight: 700 }}>내 답장 차례 · {label}의 다음 링크에 먼저 도착해요</div>
          <p className="serif" style={{ margin: 0, fontSize: 18, lineHeight: 1.6 }}>{a.replyAsk}</p>
          <div className="row">
            <VoiceButton promptId={a.promptId} target="reaction" has={!!a.reactionAudioUrl} label="목소리로 답장하기" limit={120} onDone={onSaved} />
          </div>
        </div>
      ) : penOpen ? (
        <div className="reply stack" style={{ gap: 10 }}>
          <div className="tiny muted" style={{ fontWeight: 700 }}>엮은이의 한 줄</div>
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
      ) : (
        <button type="button" className="link" style={{ alignSelf: "flex-start", paddingLeft: 0 }} onClick={() => setPenOpen(true)}>한 줄 남기기</button>
      )}
    </article>
  );
}

// 기사 속 영상: 재생하면 신문 칸에서 화면 폭으로 펼쳐지고, 멈추면 다시 칸으로
function Film({ src, onError }: { src: string; onError: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`film${open ? " open" : ""}`}>
      <video src={src} controls playsInline preload="metadata" onError={onError} onPlay={() => setOpen(true)} onPause={() => setOpen(false)} onEnded={() => setOpen(false)} />
    </div>
  );
}
