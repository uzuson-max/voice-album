"use client";
import { useEffect, useRef, useState } from "react";
import { api, cached, remember } from "@/lib/supabaseBrowser";
import Loader from "@/components/Loader";
import { GiftBox } from "@/components/Illust";
import { koDate } from "@/lib/time";
import { josa } from "@/lib/korean";

import { Article, Mag, THEMES, num2, issueNo, Cover, Issue, CSS } from "@/components/Magazine";

export default function Stories() {
  const [d, setD] = useState<any>(null);
  const [theme, setTheme] = useState("paper");
  const [cur, setCur] = useState<string | null>(null);
  const artRef = useRef<HTMLDivElement>(null);
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
  const [retried, setRetried] = useState(false);
  const onMediaError = () => { if (!retried) { setRetried(true); load(); } };
  if (!d) return <Loader label="이야기를 펼치는 중" />;

  const label = d.storyteller?.label || "부모님";
  const arts: Article[] = d.articles || [];
  const total = arts.length;
  const mag: Mag = d.magazine || { coverUrl: null, custom: false, name: null, born: null, hometown: null };
  const open = arts.find((a) => a.promptId === cur) || arts[0];
  const openIdx = open ? arts.indexOf(open) : -1;
  const go = (id: string) => { setCur(id); setTimeout(() => artRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 30); };

  return (
    <main className="screen with-tabs mzl" style={{ "--mz": th.c } as any}>
      <style>{CSS}</style>

      {total === 0 && d.sealed.length === 0 ? (
        <div className="stack">
          <h1 className="serif" style={{ margin: "4px 0 0", fontSize: 26 }}>{label}의 이야기</h1>
          <div className="card big">
            <GiftBox />
            <div style={{ fontSize: 18, fontWeight: 700 }}>아직 도착한 이야기가 없어요</div>
            <div className="muted small">{josa(label, "이/가")} 첫 이야기를 마치면 잡지 창간호가 만들어져요</div>
          </div>
        </div>
      ) : (
        <div className="mz-wrap">
          <Cover mag={mag} label={label} arts={arts} onSaved={load} />

          {/* 목차 */}
          <section className="mz-toc">
            <div className="mz-hrow"><span className="mz-latin">CONTENTS</span><small>{total} / 12호 도착</small></div>
            <ul>
              {[...arts].reverse().map((a) => {
                const i = arts.indexOf(a);
                const n = issueNo(a, i, total);
                const sec = a.turns.reduce((s, t) => s + (t.duration || 0), 0);
                const vid = a.turns.some((t) => t.mediaType === "video");
                const thumb = a.selfieUrl || a.photoUrl;
                return (
                  <li key={a.promptId} className={open?.promptId === a.promptId ? "on" : ""} onClick={() => go(a.promptId)}>
                    <span className="no">{num2(n)}</span>
                    <span className="tt">{a.title}<small>{koDate(a.createdAt.slice(0, 10))}{sec >= 60 ? ` · ${vid ? "영상" : "녹음"} ${Math.round(sec / 60)}분` : ""}</small></span>
                    {thumb ? <img className="th" src={thumb} alt="" /> : <span className="th none" />}
                  </li>
                );
              })}
              {d.sealed.map((s: any) => (
                <li key={s.unsealAt} className="wait">
                  <span className="no">◇</span>
                  <span className="tt">{koDate(s.unsealAt)}에 열려요<small>봉해둔 이야기 {s.count}개{s.video ? ` · 영상 ${s.video}개` : ""}</small></span>
                  <span className="th none" />
                </li>
              ))}
              {total < 12 && (
                <li className="wait">
                  <span className="no">{num2(total + 1)}</span>
                  <span className="tt">다음 호 준비 중<small>{josa(label, "이/가")} 이야기를 마치면 실려요</small></span>
                  <span className="th none" />
                </li>
              )}
            </ul>
          </section>

          <div className="mz-themes">
            <span>포인트 색</span>
            {THEMES.map((t) => (
              <button key={t.key} type="button" onClick={() => pickTheme(t.key)} className={theme === t.key ? "on" : ""}>
                <i style={{ background: t.c }} />{t.name}
              </button>
            ))}
          </div>

          <div ref={artRef} style={{ scrollMarginTop: 12 }}>
            {open && (
              <Issue
                key={open.promptId} a={open} n={issueNo(open, openIdx, total)} label={label} name={mag.name}
                onSaved={load} onMediaError={onMediaError}
              />
            )}
          </div>

          {total > 1 && (
            <div className="mz-pager">
              {openIdx < total - 1 ? <button onClick={() => go(arts[openIdx + 1].promptId)}>← 지난 호</button> : <span />}
              {openIdx > 0 ? <button onClick={() => go(arts[openIdx - 1].promptId)}>다음 호 →</button> : <span />}
            </div>
          )}
          <a href="/app/export" className="mz-export">목소리·영상 원본 전체 내려받기</a>
        </div>
      )}
    </main>
  );
}

