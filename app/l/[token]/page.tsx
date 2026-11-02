"use client";
// 잡지 QR → 이 호의 목소리·영상 (로그인 없이)
import { useEffect, useState } from "react";

type D = { label: string; name: string | null; week: number | null; title: string; turns: { url: string; video: boolean; sec: number | null }[] };

export default function Listen({ params }: { params: { token: string } }) {
  const [d, setD] = useState<D | null>(null);
  const [err, setErr] = useState("");
  useEffect(() => {
    fetch(`/api/l/${params.token}`)
      .then((r) => r.json().then((j) => ({ ok: r.ok, j })))
      .then(({ ok, j }) => (ok ? setD(j) : setErr(j.error)))
      .catch(() => setErr("열 수 없어요"));
  }, [params.token]);

  if (err) return <main className="screen center"><div className="grow" /><p className="serif q">{err}</p><div className="grow" /></main>;
  if (!d) return <main className="screen center"><div className="grow" /><p className="muted">잠시만요…</p><div className="grow" /></main>;
  return (
    <main className="screen center" style={{ gap: 0 }}>
      <p className="tiny muted" style={{ margin: "8px 0 0", letterSpacing: ".14em" }}>우리집 레코드{d.week ? ` · NO.${String(d.week).padStart(2, "0")}` : ""}</p>
      <h1 className="serif" style={{ margin: "14px 0 6px", fontSize: 26, lineHeight: 1.45, wordBreak: "keep-all" }}>{d.title}</h1>
      <p className="muted" style={{ margin: "0 0 26px", fontSize: 16 }}>{d.name || d.label}의 목소리</p>
      <div className="stack" style={{ width: "100%", gap: 16 }}>
        {d.turns.map((t, i) =>
          t.video
            ? <video key={i} src={t.url} controls playsInline style={{ width: "100%", borderRadius: 12 }} />
            : <audio key={i} src={t.url} controls style={{ width: "100%" }} />
        )}
      </div>
      <div className="grow" />
    </main>
  );
}
