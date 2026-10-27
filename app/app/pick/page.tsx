"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/supabaseBrowser";
import { josa } from "@/lib/korean";

type Row = {
  week: number; format: "audio" | "video"; chapter: string; why: string;
  lead: string | null; ask: string; encore: string | null; hint: string | null;
  replyLead: string | null; replyAsk: string | null; free: boolean; preview: boolean;
};

// 12주 과정 미리보기 → 질문함에 넣기 (아직 안 보낸 질문은 이 과정으로 바뀜)
export default function Pick() {
  const router = useRouter();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [label, setLabel] = useState("부모님");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api("/api/me/recommend", { method: "POST" })
      .then((r) => { setRows(r.course); setLabel(r.label || "부모님"); })
      .catch(() => router.replace("/app/family"));
  }, [router]);

  async function save() {
    if (!rows) return;
    setBusy(true);
    const items = rows.map((r) => ({ ...r, half: r.encore, text: r.ask, source: "library" }));
    await api("/api/me/prompts", { method: "POST", body: JSON.stringify({ items, replaceQueued: true }) });
    router.replace("/app");
  }

  if (!rows)
    return (
      <main className="screen center">
        <div className="grow" />
        <p className="serif" style={{ fontSize: 20 }}>12주 과정을 준비하고 있어요…</p>
        <div className="grow" />
      </main>
    );

  let chapter = "";
  return (
    <main className="screen">
      <div className="stack">
        <h1 className="h1">{josa(label, "과/와")} 함께할 12번의 이야기</h1>
        <p className="muted small" style={{ margin: 0 }}>
          화요일과 토요일, 일주일에 두 번 가요. 6주 동안 세 번은 하나를 더 남기고(첫 번째는 노래), 중간중간 내가 먼저 답장을 남겨요.
        </p>
        {rows.map((r) => {
          const head = r.chapter !== chapter ? (chapter = r.chapter) : null;
          return (
            <div key={r.week} className="stack" style={{ gap: 8 }}>
              {head && <div className="section" style={{ marginTop: 14 }}>{head}</div>}
              <div className="card stack" style={{ gap: 8 }}>
                <span className="chip">
                  {r.week}회차 · {r.format === "video" ? "영상" : "음성"}{r.free ? " · 무료 체험" : ""}
                </span>
                {r.lead && <p className="small muted" style={{ margin: 0, whiteSpace: "pre-line" }}>{r.lead}</p>}
                <p className="serif" style={{ margin: 0, fontSize: 17, lineHeight: 1.55 }}>{r.ask}</p>
                {r.encore && <p className="tiny muted" style={{ margin: 0 }}>그리고 · {r.encore}</p>}
                {r.why && (
                  <p className="tiny" style={{ margin: 0, paddingTop: 8, borderTop: "1px solid currentColor", opacity: 0.75 }}>
                    왜 이 질문일까요 · {r.why}
                  </p>
                )}
              </div>
              {r.replyAsk && (
                <div className="card stack" style={{ gap: 6, borderStyle: "dashed" }}>
                  <span className="chip">{r.week}회차 뒤 · 내가 보내는 답장</span>
                  <p style={{ margin: 0, fontSize: 15, lineHeight: 1.55 }}>{r.replyAsk}</p>
                </div>
              )}
            </div>
          );
        })}
        <div style={{ position: "sticky", bottom: 16 }}>
          <button className="btn" onClick={save} disabled={busy}>{busy ? "넣는 중…" : "12번의 이야기 시작하기"}</button>
        </div>
      </div>
    </main>
  );
}
