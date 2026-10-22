"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/supabaseBrowser";

type Item = { text: string; format: "audio" | "video"; source: string; on: boolean };

export default function Pick() {
  const router = useRouter();
  const [items, setItems] = useState<Item[] | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api("/api/me/recommend", { method: "POST" })
      .then((r) => {
        const ai = r.ai.map((q: any) => ({ ...q, on: true }));
        const lib = r.library.map((q: any) => ({ ...q, on: ai.length === 0 }));
        setItems([...ai, ...lib]);
      })
      .catch(() => router.replace("/app/family"));
  }, [router]);

  async function save() {
    if (!items) return;
    setBusy(true);
    const chosen = items.filter((i) => i.on);
    if (chosen.length) await api("/api/me/prompts", { method: "POST", body: JSON.stringify({ items: chosen }) });
    router.replace("/app");
  }

  if (!items)
    return (
      <main className="screen center">
        <div className="grow" />
        <p className="serif" style={{ fontSize: 20 }}>부모님께 맞는 질문을 고르고 있어요…</p>
        <div className="grow" />
      </main>
    );

  const n = items.filter((i) => i.on).length;
  return (
    <main className="screen">
      <div className="stack">
        <h1 className="h1">보낼 질문 고르기</h1>
        <p className="muted small" style={{ margin: 0 }}>위에서부터 한 주에 하나씩 보내요. 순서와 문장은 나중에 바꿀 수 있어요.</p>
        {items.map((q, i) => (
          <label key={i} className="card row" style={{ alignItems: "flex-start", gap: 12, cursor: "pointer" }}>
            <input type="checkbox" className="check" checked={q.on} onChange={() => setItems(items.map((x, j) => (j === i ? { ...x, on: !x.on } : x)))} />
            <span className="stack" style={{ gap: 4 }}>
              <span className="chip">{q.source === "ai" ? "맞춤 질문" : "기본 질문"} · {q.format === "video" ? "영상" : "음성"}</span>
              <span style={{ fontSize: 16, lineHeight: 1.55 }}>{q.text}</span>
            </span>
          </label>
        ))}
        <div style={{ position: "sticky", bottom: 16 }}>
          <button className="btn" onClick={save} disabled={busy}>{n}개 질문함에 넣기</button>
        </div>
      </div>
    </main>
  );
}
