"use client";
import { useEffect, useRef, useState } from "react";
import { api, cached, remember } from "@/lib/supabaseBrowser";
import Loader from "@/components/Loader";
import { GiftBox } from "@/components/Illust";
import { VoiceButton } from "@/components/ChildMedia";
import { koDate } from "@/lib/time";
import { josa } from "@/lib/korean";

type Turn = { id: string; asked: string; mediaType: "audio" | "video"; duration: number | null; transcript: string | null; url: string | null };
type Point = { head: string; text: string };
type Fact = { num: string; unit: string; text: string };
type Article = {
  promptId: string; question: string; lead: string | null; week: number | null; title: string; article: string | null;
  quote: string | null; replyLead: string | null; replyAsk: string | null; summary: string | null;
  photoUrl: string | null; selfieUrl: string | null; points: Point[] | null; facts: Fact[] | null;
  reactionText: string | null; reactionAudioUrl: string | null; createdAt: string; turns: Turn[];
};

// 이야기 화면 보는 방식 — 표지 색만 바뀌고 본문 종이는 같다. 이 기기에 기억된다
const THEMES = [
  { key: "paper", name: "와인", cover: "#5B1F2B", deep: "#3E141D", gold: "#E2C88F" },
  { key: "film", name: "에스프레소", cover: "#3A2A23", deep: "#221713", gold: "#ECC470" },
  { key: "garden", name: "정원", cover: "#34503A", deep: "#22352A", gold: "#D9B06A" },
  { key: "classic", name: "클래식", cover: "#1F2A3D", deep: "#131A26", gold: "#D4B37A" },
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
      style={{ "--mz-cover": th.cover, "--mz-deep": th.deep, "--mz-gold": th.gold, background: th.deep, color: "#F3EBDD", minHeight: "100vh", transition: "background .4s" } as any}
    >
      <style>{CSS}</style>
      <div className="stack">
        <header className="mz-shelf-head">
          <div className="mz-shelf-logo">우리집 레코드</div>
          <h1>{label}의 이야기</h1>
          {total > 0 && <div className="mz-shelf-sub">지금까지 {total}호</div>}
        </header>

        {total > 0 && (
          <div className="row" style={{ gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <span className="tiny" style={{ marginRight: 2, opacity: 0.7 }}>표지 색</span>
            {THEMES.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => pickTheme(t.key)}
                className="row tiny"
                style={{
                  gap: 6, alignItems: "center", padding: "6px 12px", borderRadius: 999, cursor: "pointer", color: "inherit", font: "inherit",
                  background: "transparent", border: theme === t.key ? `1.5px solid ${th.gold}` : "1px solid rgba(243,235,221,.22)",
                  fontWeight: theme === t.key ? 700 : 400,
                }}
              >
                <span style={{ width: 12, height: 12, borderRadius: 6, background: t.cover, border: "1px solid rgba(255,255,255,.45)" }} />
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
            <div className="muted small">{josa(label, "이/가")} 대답하면 여기에 한 호씩 실려요</div>
          </div>
        )}

        <div className="stack" style={{ gap: 22 }}>
          {d.articles.map((a: Article, i: number) => (
            <Issue key={a.promptId} a={a} no={total - i} label={label} first={i === 0} onSaved={load} onMediaError={onMediaError} />
          ))}
        </div>
        {total > 0 && (
          <a href="/app/export" className="link" style={{ textAlign: "center", color: "inherit", opacity: 0.8 }}>목소리·영상 원본 전체 내려받기</a>
        )}
      </div>
    </main>
  );
}

// 한 호 = 질문 하나. 표지 → 엄마 말 한 줄 → 핵심 → 사진·글 → 영상 → 처음 알게 된 것 → 목소리
function Issue({ a, no, label, first, onSaved, onMediaError }: { a: Article; no: number; label: string; first: boolean; onSaved: () => void; onMediaError: () => void }) {
  const [open, setOpen] = useState(first);
  const [pen, setPen] = useState(a.reactionText || "");
  const [saved, setSaved] = useState(!!a.reactionText);
  const [saving, setSaving] = useState(false);
  const [penOpen, setPenOpen] = useState(!!a.reactionText);
  const [showFull, setShowFull] = useState(false);

  const full = a.turns.map((t) => t.transcript).filter(Boolean).join("\n\n");
  const body = a.article || full;
  const paras = body ? body.split(/\n{2,}/).map((x) => x.trim()).filter(Boolean) : [];
  const points = a.points || [];
  const facts = a.facts || [];
  const audios = a.turns.filter((t) => t.mediaType === "audio" && t.url);
  const videos = a.turns.filter((t) => t.mediaType === "video" && t.url);
  const leadVoice = audios[0];
  const restVoices = audios.slice(1);

  const num = String(a.week || no).padStart(2, "0");
  const date = a.createdAt ? a.createdAt.slice(0, 10).replace(/-/g, ".") : "";
  const coverImg = a.selfieUrl || a.photoUrl;
  const innerPhoto = a.selfieUrl ? a.photoUrl : null; // 표지가 셀피면, 그 시절 사진은 안쪽에
  const sec = a.turns.reduce((s, t) => s + (t.duration || 0), 0);
  const talkMin = Math.round(sec / 60);
  const readMin = Math.max(1, Math.round((points.map((p) => p.text).join("").length + body.length) / 500));
  const titleSize = a.title.length <= 8 ? 27 : a.title.length <= 12 ? 23 : 19;

  async function savePen() {
    setSaving(true);
    try {
      await api("/api/me/media", { method: "PUT", body: JSON.stringify({ target: "text", promptId: a.promptId, text: pen }) });
      setSaved(!!pen.trim());
    } catch {}
    setSaving(false);
  }

  return (
    <article className="mz">
      {/* ── 표지 ── */}
      <header className="mz-cover" onClick={() => !open && setOpen(true)} style={{ cursor: open ? "default" : "pointer" }}>
        <div className="mz-mast"><span className="mz-logo">우리집 레코드</span><span className="mz-meta">NO.{num} · {date}</span></div>
        {coverImg ? (
          <div className="mz-cover-body">
            <div className="mz-cover-photo">
              <img src={coverImg} alt="" />
              {a.selfieUrl && <span className="mz-badge">COVER · 오늘의 {label}</span>}
            </div>
            <h2 className="mz-vtitle" style={{ fontSize: titleSize }}>{a.title}</h2>
          </div>
        ) : (
          <div className="mz-cover-type">
            <h2>{a.title}</h2>
            {a.quote && <p>“{a.quote}”</p>}
          </div>
        )}
        <div className="mz-no">
          <div className="mz-num">{num}{a.week ? <em>/12</em> : null}</div>
          <div className="mz-read">
            {talkMin >= 2 ? (<><b>{talkMin}분의 이야기를</b><br />{readMin}분 읽을거리로</>) : (<b>{label}의 이야기</b>)}
          </div>
        </div>
      </header>

      {!open ? (
        <button type="button" className="mz-open" onClick={() => setOpen(true)}>이 호 펼쳐 보기</button>
      ) : (
        <div className="mz-paper">
          {/* 엄마 말 한 줄 + 그 목소리 */}
          {(a.quote || leadVoice) && (
            <section className="mz-lead">
              {a.quote && <q>{a.quote}</q>}
              {a.quote && <p className="mz-by">— {label}</p>}
              {leadVoice && <Voice t={leadVoice} text={`${label} 목소리로 듣기`} onError={onMediaError} />}
            </section>
          )}

          {/* 이번 호의 이야기: 핵심만 */}
          {points.length > 0 ? (
            <section className="mz-sec">
              <Kicker n="01">이번 호의 이야기</Kicker>
              <ol className="mz-points">
                {points.map((p, k) => (
                  <li key={k}><span className="mz-pn">{String(k + 1).padStart(2, "0")}</span><div><h4>{p.head}</h4><p>{p.text}</p></div></li>
                ))}
              </ol>
            </section>
          ) : null}

          {innerPhoto && (
            <figure className="mz-photo">
              <img src={innerPhoto} alt="" />
              <figcaption>그 시절 한 장</figcaption>
            </figure>
          )}

          {/* 글 */}
          {paras.length ? (
            <section className="mz-sec mz-body">
              <Kicker n={points.length ? "02" : "01"}>{points.length ? "그 이야기" : "이번 호의 이야기"}</Kicker>
              {paras.map((para, k) => <p key={k}>{para}</p>)}
            </section>
          ) : (
            <section className="mz-sec"><p className="mz-wait">글로 옮기는 중이에요. 먼저 목소리로 들어보세요.</p></section>
          )}

          {/* 영상 */}
          {videos.length > 0 && (
            <section className="mz-sec">
              <Kicker n="◎">영상으로 남긴 장면</Kicker>
              <div className="stack" style={{ gap: 14 }}>
                {videos.map((t, k) => (
                  <div key={t.id} className="stack" style={{ gap: 6 }}>
                    <Film src={t.url!} onError={onMediaError} />
                    {(k > 0 || a.turns[0]?.id !== t.id) && t.asked && <span className="mz-cap">{t.asked}</span>}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* 처음 알게 된 것 */}
          {facts.length > 0 && (
            <aside className="mz-facts">
              <h3>이번 호에서 알게 된 것</h3>
              {facts.map((f, k) => (
                <div key={k} className="mz-fact"><div className="mz-fk">{f.num}<small>{f.unit}</small></div><div className="mz-fv">{f.text}</div></div>
              ))}
            </aside>
          )}

          {/* 나머지 목소리 + 말씀 그대로 */}
          {(restVoices.length > 0 || (a.article && full)) && (
            <section className="mz-sec">
              <div className="mz-full">
                <div><b>이어서 들은 이야기</b><br /><span>{sec >= 60 ? `전체 ${Math.floor(sec / 60)}분 ${sec % 60}초` : "목소리 원본"}</span></div>
                {a.article && full && (
                  <button type="button" onClick={() => setShowFull(!showFull)}>{showFull ? "접기" : "말씀 그대로 →"}</button>
                )}
              </div>
              {restVoices.map((t) => (
                <div key={t.id} style={{ marginTop: 14 }}>
                  <p className="mz-asked">{t.asked}</p>
                  <Voice t={t} text="듣기" onError={onMediaError} />
                </div>
              ))}
              {showFull && <div className="mz-transcript">{full}</div>}
            </section>
          )}

          {/* 자녀 차례 */}
          {a.replyAsk ? (
            <div className="mz-next">
              <b>내 답장 차례 · {label}의 다음 링크에 먼저 도착해요</b>
              <p className="mz-reply-q">{a.replyAsk}</p>
              <div className="row">
                <VoiceButton promptId={a.promptId} target="reaction" has={!!a.reactionAudioUrl} label="목소리로 답장하기" limit={120} onDone={onSaved} />
              </div>
            </div>
          ) : penOpen ? (
            <div className="mz-next">
              <b>엮은이의 한 줄</b>
              <textarea
                className="input"
                value={pen}
                onChange={(e) => { setPen(e.target.value); setSaved(false); }}
                placeholder={`예) ${josa(label, "이/가")} 그때 그런 꿈이 있었는지 처음 알았다.`}
                style={{ minHeight: 60, width: "100%", background: "#fff", color: "#1E1A18" }}
              />
              <div className="row" style={{ marginTop: 8 }}>
                <div className="grow" />
                <button className="btn sm" onClick={savePen} disabled={saving || saved || !pen.trim()}>
                  {saving ? "저장 중…" : saved ? "남겼어요" : "남기기"}
                </button>
              </div>
            </div>
          ) : (
            <button type="button" className="mz-link" onClick={() => setPenOpen(true)}>엮은이의 한 줄 남기기</button>
          )}

          <footer className="mz-folio"><span>OUR HOUSE RECORD</span><span>{num}{a.week ? " / 12" : ""}</span></footer>
        </div>
      )}
    </article>
  );
}

function Kicker({ n, children }: { n: string; children: React.ReactNode }) {
  return <div className="mz-kicker"><span>{n}</span>{children}</div>;
}

// 목소리 칩: 누르면 재생, 막대가 지나간 만큼 금색으로 찬다
function Voice({ t, text, onError }: { t: Turn; text: string; onError: () => void }) {
  const el = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [pos, setPos] = useState(0);
  const dur = t.duration || 0;
  const bars = useRef(Array.from({ length: 22 }, (_, i) => 4 + Math.round(Math.abs(Math.sin(i * 1.7 + (t.id.charCodeAt(0) || 1))) * 14))).current;
  const left = Math.max(0, Math.round(dur - pos));
  const toggle = () => { const a = el.current; if (!a) return; if (a.paused) a.play().catch(() => {}); else a.pause(); };
  return (
    <div className="mz-voice" onClick={toggle} role="button">
      <span className={`mz-play${playing ? " on" : ""}`} />
      <span className="mz-wave">
        {bars.map((h, i) => <i key={i} style={{ height: h, opacity: dur && i / bars.length < pos / dur ? 1 : 0.45 }} />)}
      </span>
      <span className="mz-vt">{dur ? `${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")} ` : ""}{text}</span>
      <audio
        ref={el} src={t.url!} preload="metadata" onError={onError}
        onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)}
        onEnded={() => { setPlaying(false); setPos(0); }}
        onTimeUpdate={(e) => setPos((e.target as HTMLAudioElement).currentTime)}
      />
    </div>
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

const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 .45 0 0 0 0 .4 0 0 0 0 .35 0 0 0 .16 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";
const LEATHER =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='l'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.55' numOctaves='3'/%3E%3CfeColorMatrix values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 .22 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23l)'/%3E%3C/svg%3E\")";

const CSS = `
.mz-shelf-head{padding:6px 0 2px}
.mz-shelf-logo{font-family:var(--serif);font-size:13px;letter-spacing:.2em;color:var(--mz-gold)}
.mz-shelf-head h1{font-family:var(--serif);font-weight:600;font-size:28px;margin:6px 0 0;color:#F6EEDF}
.mz-shelf-sub{font-size:13px;opacity:.7;margin-top:6px}

.mz{border-radius:3px;overflow:hidden;box-shadow:0 18px 40px -14px rgba(0,0,0,.6),0 2px 0 rgba(0,0,0,.25)}
.mz-cover{position:relative;background:var(--mz-cover);color:var(--mz-gold);padding:20px 20px 0;overflow:hidden}
.mz-cover::after{content:"";position:absolute;inset:0;pointer-events:none;opacity:.5;mix-blend-mode:overlay;background-image:${LEATHER}}
.mz-cover>*{position:relative;z-index:1}
.mz-mast{display:flex;justify-content:space-between;align-items:baseline;border-bottom:1px solid color-mix(in srgb,var(--mz-gold) 45%,transparent);padding-bottom:10px}
.mz-logo{font-family:var(--serif);font-weight:600;font-size:14px;letter-spacing:.18em}
.mz-meta{font-family:Georgia,serif;font-size:12px;letter-spacing:.1em;opacity:.85}
.mz-cover-body{display:grid;grid-template-columns:1fr auto;gap:14px;padding-top:16px}
.mz-cover-photo{position:relative;aspect-ratio:3/4;overflow:hidden;border-radius:2px;background:var(--mz-deep)}
.mz-cover-photo img{width:100%;height:100%;object-fit:cover;display:block}
.mz-badge{position:absolute;left:10px;top:10px;font-size:10px;letter-spacing:.12em;font-weight:700;color:var(--mz-cover);background:var(--mz-gold);padding:4px 8px}
.mz-vtitle{writing-mode:vertical-rl;font-family:var(--serif);font-weight:600;line-height:1.3;letter-spacing:.08em;margin:0;color:#F6E7C6;max-height:100%;text-shadow:0 1px 0 rgba(0,0,0,.25)}
.mz-cover-type{padding:34px 0 8px}
.mz-cover-type h2{font-family:var(--serif);font-weight:600;font-size:32px;line-height:1.35;margin:0;color:#F6E7C6;word-break:keep-all;text-wrap:balance}
.mz-cover-type p{font-family:var(--serif);font-size:17px;line-height:1.7;margin:18px 0 0;opacity:.9;word-break:keep-all}
.mz-no{display:flex;align-items:flex-end;justify-content:space-between;padding:16px 0 20px}
.mz-num{font-family:Georgia,serif;font-size:64px;line-height:.82;color:var(--mz-gold)}
.mz-num em{font-size:18px;margin-left:4px;opacity:.8}
.mz-read{text-align:right;font-size:12px;line-height:1.7;color:color-mix(in srgb,var(--mz-gold) 80%,#fff)}
.mz-read b{font-family:var(--serif);font-weight:600;font-size:15px;color:#F6E7C6}
.mz-open{display:block;width:100%;padding:15px 0;border:0;background:var(--mz-deep);color:var(--mz-gold);font:inherit;font-size:14px;letter-spacing:.08em;cursor:pointer;border-top:1px solid color-mix(in srgb,var(--mz-gold) 30%,transparent)}

.mz-paper{position:relative;background:#ECEAE5;color:#1E1A18;padding-bottom:4px}
.mz-paper::before{content:"";position:absolute;inset:0;pointer-events:none;opacity:.35;mix-blend-mode:multiply;background-image:${GRAIN}}
.mz-paper>*{position:relative;z-index:1}
.mz-lead{padding:36px 24px 0}
.mz-lead q{display:block;quotes:none;font-family:var(--serif);font-weight:600;font-size:23px;line-height:1.6;word-break:keep-all;text-wrap:pretty}
.mz-lead q::before{content:"“";display:block;font-family:Georgia,serif;font-size:60px;line-height:.6;color:var(--mz-cover);margin-bottom:4px}
.mz-by{margin:12px 0 0;font-size:12.5px;color:#857D76;letter-spacing:.04em}
.mz-sec{padding:40px 24px 0}
.mz-kicker{display:flex;align-items:center;gap:10px;font-size:11px;letter-spacing:.22em;font-weight:700;color:var(--mz-cover);margin-bottom:16px}
.mz-kicker span{font-family:Georgia,serif;font-size:15px;letter-spacing:0}
.mz-kicker::after{content:"";flex:1;height:1px;background:#CFC9C0}
.mz-points{list-style:none;margin:0;padding:0}
.mz-points li{display:grid;grid-template-columns:38px 1fr;gap:6px;padding:18px 0;border-bottom:1px solid #CFC9C0}
.mz-points li:first-child{border-top:1px solid #1E1A18}
.mz-pn{font-family:Georgia,serif;font-size:21px;color:var(--mz-cover);line-height:1.15}
.mz-points h4{font-family:var(--serif);font-size:17px;font-weight:600;line-height:1.5;margin:0 0 6px;word-break:keep-all}
.mz-points p{margin:0;font-size:15px;line-height:1.85;color:#4A4440;word-break:keep-all}
.mz-photo{margin:40px 0 0}
.mz-photo img{width:100%;max-height:560px;object-fit:cover;display:block}
.mz-photo figcaption{padding:10px 24px 0;font-size:12px;color:#857D76}
.mz-body p{margin:0 0 18px;font-size:16px;line-height:1.95;color:#3E3834;word-break:keep-all;white-space:pre-wrap}
.mz-body p:first-of-type::first-letter{font-family:var(--serif);font-weight:600;font-size:44px;float:left;line-height:1;margin:6px 8px 0 0;color:var(--mz-cover)}
.mz-wait{margin:0;font-size:15px;color:#857D76}
.mz-cap{font-size:12.5px;color:#857D76}
.mz-facts{margin:40px 24px 0;background:var(--mz-cover);color:#F3E3C0;padding:22px 20px 6px;box-shadow:inset 0 1px 0 rgba(255,255,255,.08)}
.mz-facts h3{font-family:var(--serif);font-size:13px;letter-spacing:.2em;color:var(--mz-gold);font-weight:600;margin:0 0 4px}
.mz-fact{display:grid;grid-template-columns:78px 1fr;gap:12px;padding:14px 0;border-bottom:1px solid color-mix(in srgb,var(--mz-gold) 25%,transparent)}
.mz-fact:last-child{border:0}
.mz-fk{font-family:Georgia,serif;font-size:26px;color:var(--mz-gold);line-height:1}
.mz-fk small{display:block;font-family:inherit;font-size:11px;margin-top:6px;letter-spacing:.06em;opacity:.8}
.mz-fv{font-size:14.5px;line-height:1.75;word-break:keep-all}
.mz-voice{display:inline-flex;align-items:center;gap:12px;margin-top:18px;padding:9px 16px 9px 9px;border-radius:999px;cursor:pointer;user-select:none;background:var(--mz-cover);color:#F3E3C0;box-shadow:inset 0 1px 0 rgba(255,255,255,.12),0 2px 6px rgba(0,0,0,.22)}
.mz-play{width:30px;height:30px;border-radius:50%;background:var(--mz-gold);display:grid;place-items:center;flex:none}
.mz-play::before{content:"";border-left:9px solid var(--mz-cover);border-top:6px solid transparent;border-bottom:6px solid transparent;margin-left:2px}
.mz-play.on::before{border:0;width:9px;height:11px;margin:0;background:linear-gradient(90deg,var(--mz-cover) 0 3px,transparent 3px 6px,var(--mz-cover) 6px)}
.mz-wave{display:flex;gap:2px;align-items:center;height:18px}
.mz-wave i{width:2px;background:var(--mz-gold);border-radius:2px;transition:opacity .2s}
.mz-vt{font-size:12.5px;letter-spacing:.02em;white-space:nowrap}
.mz-full{display:flex;justify-content:space-between;align-items:center;border-top:1px solid #1E1A18;border-bottom:1px solid #CFC9C0;padding:14px 0;font-size:13px;color:#4A4440;line-height:1.6}
.mz-full b{font-family:var(--serif);font-size:15px;color:#1E1A18;font-weight:600}
.mz-full button{border:0;background:none;color:var(--mz-cover);font:inherit;font-weight:700;font-size:13px;cursor:pointer}
.mz-asked{margin:0;font-size:14px;line-height:1.7;color:#4A4440;word-break:keep-all}
.mz-transcript{margin-top:16px;font-size:14.5px;line-height:1.95;color:#4A4440;white-space:pre-line;word-break:keep-all}
.mz-next{margin:36px 24px 0;padding:18px;background:#E1DDD5;font-size:14px;line-height:1.75;color:#4A4440}
.mz-next>b{display:block;font-size:11px;letter-spacing:.16em;color:var(--mz-cover);margin-bottom:8px}
.mz-reply-q{margin:0 0 12px;font-family:var(--serif);font-size:18px;line-height:1.6;color:#1E1A18;word-break:keep-all}
.mz-link{display:block;margin:30px 24px 0;padding:0;border:0;background:none;color:var(--mz-cover);font:inherit;font-size:14px;font-weight:700;cursor:pointer}
.mz-folio{display:flex;justify-content:space-between;padding:36px 24px 26px;font-family:Georgia,serif;font-size:12px;letter-spacing:.14em;color:#857D76}
`;
