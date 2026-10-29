"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/supabaseBrowser";
import { josa } from "@/lib/korean";
import { PRICE } from "@/lib/brand";
import Loader from "@/components/Loader";

type F = { name: string; type: string; url: string | null; date: string };

// 원본 전체 내려받기 — 보관 기간이 끝나도 가족 손에 남도록
export default function Export() {
  const [d, setD] = useState<{ label: string; files: F[]; text: string } | null>(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    api("/api/me/export").then(setD).catch((e) => setErr(e.message));
  }, []);

  function saveText() {
    if (!d) return;
    const blob = new Blob([d.text], { type: "text/plain;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${d.label}_이야기_모음.txt`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }

  if (err) return <main className="screen center"><p className="err">{err}</p></main>;
  if (!d) return <Loader label="원본을 모으는 중" />;

  return (
    <main className="screen with-tabs">
      <div className="stack">
        <h1 className="h1">원본 전체 내려받기</h1>
        <p className="small muted" style={{ margin: 0, lineHeight: 1.7 }}>
          {josa(d.label, "이/가")} 남긴 목소리와 영상을 그대로 내려받아요. 과정이 끝난 뒤 {PRICE.keepYears}년 동안 여기서 언제든 다시 받을 수 있어요.
        </p>

        {d.files.length === 0 && <p className="muted small">아직 내려받을 이야기가 없어요.</p>}

        {d.text && (
          <button className="btn soft" onClick={saveText}>이야기 글 모음 저장 (.txt)</button>
        )}

        {d.files.length > 0 && (
          <div className="card" style={{ padding: "4px 18px" }}>
            {d.files.map((f, i) => (
              <div key={f.name} className="row between" style={{ minHeight: 52, padding: "8px 0", gap: 12, borderTop: i ? "1px solid var(--ground)" : "none" }}>
                <span className="small" style={{ lineHeight: 1.5, wordBreak: "keep-all" }}>
                  {f.type === "video" ? "영상" : "음성"} · {f.name.replace(/\.[^.]+$/, "").replace(/_/g, " ")}
                </span>
                {f.url ? (
                  <a className="textbtn" href={f.url} download={f.name} style={{ flexShrink: 0 }}>내려받기</a>
                ) : (
                  <span className="tiny muted" style={{ flexShrink: 0 }}>준비 중</span>
                )}
              </div>
            ))}
          </div>
        )}
        <p className="tiny muted" style={{ margin: 0, lineHeight: 1.6 }}>
          휴대폰에서는 파일마다 하나씩 받아져요. 한 번에 받으려면 컴퓨터에서 여는 게 편해요.
        </p>
      </div>
    </main>
  );
}
