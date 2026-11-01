"use client";
// 이야기(잡지) 화면 부품 — 실제 이야기 탭과 체험 끝 '예시 잡지'가 같은 디자인을 쓴다
import { useRef, useState } from "react";
import { api, browserClient } from "@/lib/supabaseBrowser";
import { VoiceButton } from "@/components/ChildMedia";
import { josa } from "@/lib/korean";

export type Turn = { id: string; asked: string; mediaType: "audio" | "video"; duration: number | null; transcript: string | null; url: string | null };
export type Point = { head: string; text: string };
export type Fact = { num: string; unit: string; text: string };
export type Article = {
  promptId: string; question: string; lead: string | null; week: number | null; title: string; article: string | null;
  quote: string | null; replyLead: string | null; replyAsk: string | null; summary: string | null;
  photoUrl: string | null; selfieUrl: string | null; points: Point[] | null; facts: Fact[] | null;
  reactionText: string | null; reactionAudioUrl: string | null; createdAt: string; turns: Turn[];
};
export type Mag = { coverUrl: string | null; custom: boolean; name: string | null; born: string | null; hometown: string | null };

// 포인트 색 — 숫자·태그·표지 없는 호의 바탕. 본문 종이는 같다. 이 기기에 기억된다
export const THEMES = [
  { key: "paper", name: "와인", c: "#6A2232" },
  { key: "film", name: "에스프레소", c: "#4A3328" },
  { key: "garden", name: "정원", c: "#2F5238" },
  { key: "classic", name: "클래식", c: "#1F2A44" },
];

export const num2 = (n: number) => String(n).padStart(2, "0");
export const ymd = (s: string) => (s ? s.slice(0, 10).replace(/-/g, ".") : "");
export const issueNo = (a: Article, i: number, total: number) => a.week || total - i;

// 잡지 표지: 첫 호 셀피(또는 자녀가 고른 사진) 위에 제호·큰 이름·최근 기사 제목
export function Cover({ mag, label, arts, onSaved, sample }: { mag: Mag; label: string; arts: Article[]; onSaved: () => void; sample?: boolean }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const name = mag.name || label;
  const total = arts.length;
  const latest = arts[0];
  const big = name.length <= 3 ? 76 : name.length <= 5 ? 58 : 42;
  const sub = [mag.born ? `${mag.born}년생` : "", mag.hometown || ""].filter(Boolean).join(" · ");
  const lines = arts.slice(0, 2);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    setBusy(true); setErr("");
    try {
      const blob = await crop34(f);
      const u = await api("/api/me/cover", { method: "POST", body: "{}" });
      const { error } = await browserClient().storage.from("vf-media").uploadToSignedUrl(u.path, u.uploadToken, blob, { contentType: "image/jpeg" });
      if (error) throw error;
      await api("/api/me/cover", { method: "PUT", body: JSON.stringify({ path: u.path }) });
      onSaved();
    } catch {
      setErr("표지를 바꾸지 못했어요. 잠시 뒤 다시 해주세요.");
    }
    setBusy(false);
  }
  async function reset() {
    setBusy(true);
    try { await api("/api/me/cover", { method: "DELETE" }); onSaved(); } catch {}
    setBusy(false);
  }

  return (
    <>
      <section className={`mz-cover${mag.coverUrl ? "" : " plain"}`}>
        {mag.coverUrl && <img src={mag.coverUrl} alt="" />}
        <div className="shade" />
        <div className="mast"><b>우리집 레코드</b><span>OUR HOUSE RECORD</span></div>
        <h1 className="name" style={{ fontSize: big }}>{name}</h1>
        <div className="sub"><b>{label}의 레코드</b>{sub && <>{sub}<br /></>}열두 번의 이야기</div>
        <span className="tag">{total <= 1 ? "창간호" : `${total}호까지`}</span>
        <div className="lines">
          {lines.map((a, k) => (
            <p key={a.promptId}><small>NO.{num2(issueNo(a, k, total))}</small>{a.title}</p>
          ))}
        </div>
        <div className="issue"><div className="n">{num2(latest ? issueNo(latest, 0, total) : 1)}</div><div className="t">{ymd(latest?.createdAt || "").slice(0, 7).replace(".", " · ")}</div></div>
      </section>
      {!sample && <div className="mz-cover-act">
        <button type="button" onClick={() => input.current?.click()} disabled={busy}>{busy ? "바꾸는 중…" : "표지 사진 바꾸기"}</button>
        {mag.custom && <button type="button" onClick={reset} disabled={busy}>첫 호 셀피로 되돌리기</button>}
        {err && <span className="err">{err}</span>}
        <input ref={input} type="file" accept="image/*" hidden onChange={onPick} />
      </div>}
    </>
  );
}

// 한 호 = 질문 하나. 사진·세로 제목 → 엄마의 말 → 핵심 → 글 → 사진 → 영상 → 숫자 → 목소리
export type SampleFilm = { img: string; cap: string; dur: string };

export function Issue({ a, n, label, name, onSaved, onMediaError, sample, films }: { a: Article; n: number; label: string; name: string | null; onSaved: () => void; onMediaError: () => void; sample?: boolean; films?: SampleFilm[] }) {
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
  const hero = a.selfieUrl || a.photoUrl;
  const inner = a.selfieUrl ? a.photoUrl : null; // 표지가 셀피면, 그 시절 사진은 안쪽에
  const sec = a.turns.reduce((s, t) => s + (t.duration || 0), 0);
  const tSize = a.title.length <= 8 ? 24 : a.title.length <= 12 ? 21 : 18;

  async function savePen() {
    setSaving(true);
    try {
      await api("/api/me/media", { method: "PUT", body: JSON.stringify({ target: "text", promptId: a.promptId, text: pen }) });
      setSaved(!!pen.trim());
    } catch {}
    setSaving(false);
  }

  return (
    <article className="mz-art">
      <div className="mz-ahead"><span className="mz-latin">RECORD</span><span className="no">NO.{num2(n)}<small>{ymd(a.createdAt)}</small></span></div>
      <div className="mz-bar" />

      {hero ? (
        <div className="mz-hero">
          <img src={hero} alt="" />
          <div className="side"><h2 style={{ fontSize: tSize }}>{a.title}<small>{name || label}</small></h2></div>
        </div>
      ) : (
        <h2 className="mz-htitle">{a.title}</h2>
      )}

      {(a.quote || audios[0]) && (
        <section>
          <span className="mz-tag">{label}의 말</span>
          {a.quote && <p className="mz-lead">“{a.quote}”</p>}
          {audios[0] && <Voice t={audios[0]} text={`${label} 목소리로 듣기`} onError={onMediaError} />}
        </section>
      )}

      {points.length > 0 && (
        <div className="mz-box">
          <h3>이번 호의 이야기</h3>
          {points.map((p, k) => (
            <div key={k} className="pt"><span className="n">{num2(k + 1)}</span><div><h4>{p.head}</h4><p>{p.text}</p></div></div>
          ))}
        </div>
      )}

      {paras.length ? (
        <div className="mz-body">{paras.map((para, k) => <p key={k}>{para}</p>)}</div>
      ) : (
        <p className="mz-body mz-wait">글로 옮기는 중이에요. 먼저 목소리로 들어보세요.</p>
      )}

      {inner && (
        <figure className="mz-photo"><img src={inner} alt="" /><figcaption>그 시절 한 장</figcaption></figure>
      )}

      {videos.length > 0 && (
        <section className="mz-sec">
          <div className="mz-kicker">영상으로 남긴 장면</div>
          <div className="stack" style={{ gap: 14 }}>
            {videos.map((t) => (
              <div key={t.id} className="stack" style={{ gap: 6 }}>
                <Film src={t.url!} onError={onMediaError} />
                {a.turns[0]?.id !== t.id && t.asked && <span className="mz-cap">{t.asked}</span>}
              </div>
            ))}
          </div>
        </section>
      )}

      {films && films.length > 0 && (
        <section className="mz-sec">
          <div className="mz-kicker">영상으로 남긴 장면</div>
          <div className="stack" style={{ gap: 18 }}>
            {films.map((f) => <FilmThumb key={f.img} f={f} />)}
          </div>
        </section>
      )}

      {facts.length > 0 && (
        <div className="mz-facts" style={{ gridTemplateColumns: `repeat(${facts.length},1fr)` }}>
          {facts.map((f, k) => (
            <div key={k}><div className="k">{f.num}<small>{f.unit}</small></div><div className="v">{f.text}</div></div>
          ))}
        </div>
      )}

      {(audios.length > 1 || (a.article && full)) && (
        <section className="mz-sec">
          <div className="mz-full">
            <div><b>이어서 들은 이야기</b><br /><span>{sec >= 60 ? `전체 ${Math.floor(sec / 60)}분 ${sec % 60}초` : "목소리 원본"}</span></div>
            {a.article && full && <button type="button" onClick={() => setShowFull(!showFull)}>{showFull ? "접기" : "말씀 그대로 →"}</button>}
          </div>
          {audios.slice(1).map((t) => (
            <div key={t.id} style={{ marginTop: 14 }}>
              <p className="mz-asked">{t.asked}</p>
              <Voice t={t} text="듣기" onError={onMediaError} />
            </div>
          ))}
          {showFull && <div className="mz-transcript">{full}</div>}
        </section>
      )}

      {sample ? null : a.replyAsk ? (
        <div className="mz-note">
          <b>내 답장 차례 · {label}의 다음 링크에 먼저 도착해요</b>
          <p className="q">{a.replyAsk}</p>
          <div className="row">
            <VoiceButton promptId={a.promptId} target="reaction" has={!!a.reactionAudioUrl} label="목소리로 답장하기" limit={120} onDone={onSaved} />
          </div>
        </div>
      ) : penOpen ? (
        <div className="mz-note">
          <b>엮은이의 한 줄</b>
          <textarea
            className="input" value={pen}
            onChange={(e) => { setPen(e.target.value); setSaved(false); }}
            placeholder={`예) ${josa(label, "이/가")} 그때 그런 꿈이 있었는지 처음 알았다.`}
            style={{ minHeight: 60, width: "100%", background: "#fff", color: "#141211" }}
          />
          <div className="row" style={{ marginTop: 8 }}>
            <div className="grow" />
            <button className="btn sm" onClick={savePen} disabled={saving || saved || !pen.trim()}>{saving ? "저장 중…" : saved ? "남겼어요" : "남기기"}</button>
          </div>
        </div>
      ) : (
        <button type="button" className="mz-link" onClick={() => setPenOpen(true)}>엮은이의 한 줄 남기기</button>
      )}

      <footer className="mz-folio"><span>OUR HOUSE RECORD</span><span>{num2(n)}{a.week ? " / 12" : ""}</span></footer>
    </article>
  );
}

// 예시 영상 칸: 실제 영상 대신 장면 사진 + 재생 표시. 누르면 '실제로는 재생돼요'
export function FilmThumb({ f }: { f: SampleFilm }) {
  const [hit, setHit] = useState(false);
  const [gone, setGone] = useState(false);
  if (gone) return null;
  return (
    <div className="stack" style={{ gap: 6 }}>
      <div className="mz-fthumb" onClick={() => setHit(true)} role="button">
        <img src={f.img} alt="" onError={() => setGone(true)} />
        <span className="play" />
        <span className="dur">{f.dur}</span>
        {hit && <span className="hit">실제로는 이 자리에서 영상이 재생돼요</span>}
      </div>
      <span className="mz-cap">{f.cap}</span>
    </div>
  );
}

// 목소리 칩: 누르면 재생, 막대가 지나간 만큼 찬다
export function Voice({ t, text, onError }: { t: Turn; text: string; onError: () => void }) {
  const el = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [pos, setPos] = useState(0);
  const dur = t.duration || 0;
  const bars = useRef(Array.from({ length: 20 }, (_, i) => 4 + Math.round(Math.abs(Math.sin(i * 1.7 + (t.id.charCodeAt(0) || 1))) * 12))).current;
  const left = Math.max(0, Math.round(dur - pos));
  const toggle = () => { const x = el.current; if (!x) return; if (x.paused) x.play().catch(() => {}); else x.pause(); };
  return (
    <div className="mz-voice" onClick={toggle} role="button">
      <span className={`p${playing ? " on" : ""}`} />
      <span className="w">{bars.map((h, i) => <i key={i} style={{ height: h, opacity: dur && i / bars.length < pos / dur ? 1 : 0.45 }} />)}</span>
      <span className="t">{dur ? `${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")} ` : ""}{text}</span>
      <audio
        ref={el} src={t.url!} preload="metadata" onError={onError}
        onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)}
        onEnded={() => { setPlaying(false); setPos(0); }}
        onTimeUpdate={(e) => setPos((e.target as HTMLAudioElement).currentTime)}
      />
    </div>
  );
}

// 기사 속 영상: 재생하면 화면 폭으로 펼쳐지고, 멈추면 다시 칸으로
export function Film({ src, onError }: { src: string; onError: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`film${open ? " open" : ""}`}>
      <video src={src} controls playsInline preload="metadata" onError={onError} onPlay={() => setOpen(true)} onPause={() => setOpen(false)} onEnded={() => setOpen(false)} />
    </div>
  );
}

// 표지용: 3:4로 가운데 자르고 1200×1600 jpg
async function crop34(file: File): Promise<Blob> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = url; });
    const w = img.naturalWidth, h = img.naturalHeight, r = 3 / 4;
    let sw = w, sh = h;
    if (w / h > r) sw = h * r; else sh = w / r;
    const c = document.createElement("canvas");
    c.width = 1200; c.height = 1600;
    c.getContext("2d")!.drawImage(img, (w - sw) / 2, (h - sh) / 2, sw, sh, 0, 0, 1200, 1600);
    return await new Promise<Blob>((ok, no) => c.toBlob((b) => (b ? ok(b) : no(new Error("변환 실패"))), "image/jpeg", 0.88));
  } finally {
    URL.revokeObjectURL(url);
  }
}

export const CSS = `
.mzl{background:#F5F3EF;color:#141211}
.mz-wrap{background:#F5F3EF;color:#141211;margin:-52px -22px 0;padding-bottom:24px}
.mz-latin{font-family:Georgia,'Times New Roman',serif;font-size:36px;letter-spacing:.14em;line-height:1}

.mz-cover{position:relative;aspect-ratio:3/4.2;overflow:hidden;color:#fff;background:var(--mz)}
.mz-cover>img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.mz-cover .shade{position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,.38) 0%,rgba(0,0,0,0) 30%,rgba(0,0,0,0) 60%,rgba(0,0,0,.58) 100%)}
.mz-cover.plain .shade{display:none}
.mz-cover>*:not(img):not(.shade){position:absolute;z-index:1;text-shadow:0 1px 8px rgba(0,0,0,.4)}
.mz-cover .mast{top:16px;left:18px;right:18px;display:flex;justify-content:space-between;align-items:baseline;border-bottom:1px solid rgba(255,255,255,.65);padding-bottom:8px}
.mz-cover .mast b{font-family:var(--serif);font-size:15px;letter-spacing:.2em}
.mz-cover .mast span{font-family:Georgia,serif;font-size:12px;letter-spacing:.14em}
.mz-cover .name{top:60px;right:14px;margin:0;writing-mode:vertical-rl;font-family:var(--serif);font-weight:700;line-height:1;letter-spacing:.04em}
.mz-cover .sub{top:64px;left:18px;font-size:13px;line-height:1.7}
.mz-cover .sub b{display:block;font-family:var(--serif);font-size:20px;font-weight:600}
.mz-cover .tag{left:18px;top:170px;background:var(--mz);font-size:11px;font-weight:700;letter-spacing:.14em;padding:5px 9px;text-shadow:none!important;box-shadow:0 0 0 1px rgba(255,255,255,.35)}
.mz-cover .lines{left:18px;bottom:18px;right:110px}
.mz-cover .lines p{margin:10px 0 0;font-family:var(--serif);font-weight:600;font-size:15.5px;line-height:1.45;word-break:keep-all}
.mz-cover .lines small{display:block;font-family:inherit;font-weight:500;font-size:10.5px;letter-spacing:.14em;opacity:.85}
.mz-cover .issue{right:18px;bottom:18px;text-align:right}
.mz-cover .issue .n{font-family:Georgia,serif;font-size:56px;line-height:.85}
.mz-cover .issue .t{font-size:11px;letter-spacing:.14em}
.mz-cover-act{display:flex;gap:14px;flex-wrap:wrap;padding:10px 20px 0;font-size:13px}
.mz-cover-act button{border:0;background:none;padding:0;color:#8A827B;font:inherit;text-decoration:underline;text-underline-offset:3px;cursor:pointer}
.mz-cover-act .err{color:#A0303A}

.mz-toc{padding:30px 20px 6px}
.mz-hrow{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:2px solid #141211;padding-bottom:10px}
.mz-hrow small{font-size:12px;color:#8A827B}
.mz-toc ul{list-style:none;margin:0;padding:0}
.mz-toc li{display:grid;grid-template-columns:42px 1fr 46px;gap:10px;align-items:center;padding:14px 0;border-bottom:1px solid #D9D3CB;cursor:pointer}
.mz-toc li.on .tt{text-decoration:underline;text-decoration-color:var(--mz);text-underline-offset:5px}
.mz-toc .no{font-family:Georgia,serif;font-size:23px;color:var(--mz)}
.mz-toc .tt{font-family:var(--serif);font-weight:600;font-size:16px;line-height:1.45;word-break:keep-all}
.mz-toc .tt small{display:block;font-family:var(--sans,inherit);font-weight:400;font-size:12px;color:#8A827B;margin-top:2px}
.mz-toc .th{width:46px;height:46px;object-fit:cover;display:block}
.mz-toc .th.none{background:#E6E1DA}
.mz-toc li.wait{cursor:default}
.mz-toc li.wait .no,.mz-toc li.wait .tt{color:#B3AAA0}

.mz-themes{display:flex;gap:8px;flex-wrap:wrap;align-items:center;padding:16px 20px 0;font-size:12px;color:#8A827B}
.mz-themes button{display:inline-flex;gap:6px;align-items:center;padding:5px 11px;border-radius:999px;border:1px solid #D9D3CB;background:transparent;color:#46403C;font:inherit;cursor:pointer}
.mz-themes button.on{border-color:var(--mz);font-weight:700}
.mz-themes i{width:11px;height:11px;border-radius:6px;display:inline-block}

.mz-art{margin-top:30px;border-top:8px solid #E6E1DA}
.mz-ahead{display:flex;justify-content:space-between;align-items:flex-end;padding:26px 20px 0}
.mz-ahead .mz-latin{font-size:32px}
.mz-ahead .no{font-family:Georgia,serif;font-size:21px;letter-spacing:.06em;text-align:right}
.mz-ahead .no small{display:block;font-family:inherit;font-size:10.5px;letter-spacing:.14em;color:#8A827B}
.mz-bar{height:2px;background:#141211;margin:10px 20px 0}
.mz-hero{display:grid;grid-template-columns:1fr 100px;margin-top:16px}
.mz-hero img{width:100%;aspect-ratio:4/5;object-fit:cover;display:block}
.mz-hero .side{background:#fff;border-left:1px solid #D9D3CB;padding:16px 0;display:flex;justify-content:center}
.mz-hero h2{writing-mode:vertical-rl;margin:0;font-family:var(--serif);font-weight:700;line-height:1.35;letter-spacing:.06em;max-height:100%}
.mz-hero h2 small{display:block;font-family:inherit;font-weight:500;font-size:11px;letter-spacing:.2em;color:var(--mz);margin-left:8px}
.mz-htitle{margin:22px 20px 0;font-family:var(--serif);font-weight:700;font-size:28px;line-height:1.4;word-break:keep-all;text-wrap:balance}
.mz-tag{display:inline-block;margin:22px 20px 0;background:var(--mz);color:#fff;font-size:10.5px;font-weight:700;letter-spacing:.14em;padding:5px 9px}
.mz-lead{margin:12px 20px 0;font-family:var(--serif);font-weight:700;font-size:22px;line-height:1.6;word-break:keep-all;text-wrap:pretty}
.mz-voice{display:inline-flex;align-items:center;gap:12px;margin:16px 20px 0;padding:9px 16px 9px 9px;border-radius:999px;background:#141211;color:#fff;cursor:pointer;user-select:none}
.mz-voice .p{width:28px;height:28px;border-radius:50%;background:#fff;display:grid;place-items:center;flex:none}
.mz-voice .p::before{content:"";border-left:9px solid #141211;border-top:6px solid transparent;border-bottom:6px solid transparent;margin-left:2px}
.mz-voice .p.on::before{border:0;width:9px;height:11px;margin:0;background:linear-gradient(90deg,#141211 0 3px,transparent 3px 6px,#141211 6px)}
.mz-voice .w{display:flex;gap:2px;align-items:center;height:16px}
.mz-voice .w i{width:2px;background:#fff;border-radius:2px;transition:opacity .2s}
.mz-voice .t{font-size:12.5px;white-space:nowrap}
.mz-box{margin:30px 20px 0;background:#fff;border-top:3px solid #141211;padding:4px 16px 2px}
.mz-box h3{margin:0;font-size:11px;letter-spacing:.2em;color:var(--mz);padding:12px 0 4px}
.mz-box .pt{display:grid;grid-template-columns:30px 1fr;gap:6px;padding:12px 0;border-top:1px solid #D9D3CB}
.mz-box h3+.pt{border-top:0}
.mz-box .n{font-family:Georgia,serif;font-size:19px;color:var(--mz);line-height:1.15}
.mz-box h4{margin:0;font-family:var(--serif);font-weight:700;font-size:16px;line-height:1.45;word-break:keep-all}
.mz-box p{margin:4px 0 0;font-size:14.5px;line-height:1.8;color:#46403C;word-break:keep-all}
.mz-body{padding:28px 20px 0}
.mz-body p{margin:0 0 16px;font-size:16px;line-height:1.95;color:#3A3431;word-break:keep-all;white-space:pre-wrap}
.mz-wait{font-size:15px;color:#8A827B}
.mz-photo{margin:14px 0 0}
.mz-photo img{width:100%;max-height:540px;object-fit:cover;display:block}
.mz-photo figcaption{padding:8px 20px 0;font-size:12px;color:#8A827B}
.mz-sec{padding:30px 20px 0}
.mz-kicker{font-size:11px;letter-spacing:.2em;font-weight:700;color:var(--mz);border-bottom:1px solid #D9D3CB;padding-bottom:8px;margin-bottom:14px}
.mz-fthumb{position:relative;aspect-ratio:3/4;overflow:hidden;background:#141211;cursor:pointer}
.mz-fthumb img{width:100%;height:100%;object-fit:cover;display:block}
.mz-fthumb .play{position:absolute;left:50%;top:50%;width:64px;height:64px;margin:-32px 0 0 -32px;border-radius:50%;background:rgba(20,18,17,.55);border:2px solid rgba(255,255,255,.85);backdrop-filter:blur(2px)}
.mz-fthumb .play::before{content:"";position:absolute;left:25px;top:19px;border-left:20px solid #fff;border-top:13px solid transparent;border-bottom:13px solid transparent}
.mz-fthumb .dur{position:absolute;right:10px;bottom:10px;padding:3px 8px;border-radius:4px;background:rgba(0,0,0,.6);color:#fff;font-size:12px;font-variant-numeric:tabular-nums}
.mz-fthumb .hit{position:absolute;left:10px;right:10px;top:10px;padding:8px 10px;background:rgba(0,0,0,.7);color:#fff;font-size:13px;text-align:center;border-radius:6px}
.mz-cap{font-size:12.5px;color:#8A827B}
.mz-facts{margin:30px 20px 0;display:grid;border-top:2px solid #141211;border-bottom:1px solid #D9D3CB}
.mz-facts>div{padding:14px 8px 14px 0}
.mz-facts>div+div{border-left:1px solid #D9D3CB;padding-left:10px}
.mz-facts .k{font-family:Georgia,serif;font-size:32px;line-height:1;color:var(--mz)}
.mz-facts .k small{font-family:inherit;font-size:12px;color:#141211;margin-left:2px}
.mz-facts .v{font-size:12.5px;line-height:1.6;color:#46403C;margin-top:6px;word-break:keep-all}
.mz-full{display:flex;justify-content:space-between;align-items:center;border-top:1px solid #141211;border-bottom:1px solid #D9D3CB;padding:14px 0;font-size:13px;color:#46403C;line-height:1.6}
.mz-full b{font-family:var(--serif);font-size:15px;color:#141211;font-weight:600}
.mz-full button{border:0;background:none;color:var(--mz);font:inherit;font-weight:700;font-size:13px;cursor:pointer}
.mz-asked{margin:0;font-size:14px;line-height:1.7;color:#46403C;word-break:keep-all}
.mz-asked+.mz-voice{margin-left:0}
.mz-sec .mz-voice{margin-left:0}
.mz-transcript{margin-top:16px;font-size:14.5px;line-height:1.95;color:#46403C;white-space:pre-line;word-break:keep-all}
.mz-note{margin:32px 20px 0;padding:18px;background:#fff;font-size:14px;line-height:1.75;color:#46403C}
.mz-note>b{display:block;font-size:11px;letter-spacing:.16em;color:var(--mz);margin-bottom:8px}
.mz-note .q{margin:0 0 12px;font-family:var(--serif);font-size:18px;line-height:1.6;color:#141211;word-break:keep-all}
.mz-link{display:block;margin:28px 20px 0;padding:0;border:0;background:none;color:var(--mz);font:inherit;font-size:14px;font-weight:700;cursor:pointer}
.mz-folio{display:flex;justify-content:space-between;padding:32px 20px 8px;font-family:Georgia,serif;font-size:12px;letter-spacing:.14em;color:#8A827B}
.mz-pager{display:flex;justify-content:space-between;padding:18px 20px 0;border-top:1px solid #D9D3CB;margin:16px 20px 0}
.mz-pager button{border:0;background:none;padding:0;font:inherit;font-size:14px;font-weight:700;color:#141211;cursor:pointer}
.mz-export{display:block;text-align:center;margin-top:26px;font-size:13px;color:#8A827B}
`;
