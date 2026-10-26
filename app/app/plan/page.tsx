"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/supabaseBrowser";
import { josa } from "@/lib/korean";
import { PRICE } from "@/lib/brand";

// 무료 체험이 끝난 뒤: 남은 11주를 미리 보여주고 이어가기 신청
export default function Plan() {
  const router = useRouter();
  const [course, setCourse] = useState<any[] | null>(null);
  const [label, setLabel] = useState("부모님");
  const [state, setState] = useState<"idle" | "busy" | "done">("idle");

  useEffect(() => {
    api("/api/me/recommend", { method: "POST" })
      .then((r) => { setCourse(r.course); setLabel(r.label || "부모님"); })
      .catch(() => router.replace("/app"));
  }, [router]);

  async function request() {
    setState("busy");
    try {
      await api("/api/me/plan", { method: "POST" });
      setState("done");
    } catch {
      setState("idle");
    }
  }

  if (!course) return <main className="screen center"><p className="muted">잠시만요…</p></main>;
  const preview = course.find((w) => w.preview);
  const replies = course.filter((w) => w.replyAsk).length;

  return (
    <main className="screen">
      <div className="stack">
        <h1 className="h1">{josa(label, "과/와")} 남은 11주</h1>
        <p className="muted small" style={{ margin: 0, lineHeight: 1.7 }}>
          첫 번째 이야기는 여기까지 무료로 담았어요. 이어가면 매주 한 질문씩, 우리집 신문이 한 호씩 쌓여요.
        </p>

        {preview && (
          <div className="card stack" style={{ gap: 8 }}>
            <span className="chip">{preview.week}주차엔 이런 질문이 가요</span>
            <p className="serif" style={{ margin: 0, fontSize: 18, lineHeight: 1.55 }}>{preview.ask}</p>
            {preview.hint && <p className="tiny muted" style={{ margin: 0 }}>{preview.hint}</p>}
          </div>
        )}

        <div className="card stack" style={{ gap: 10 }}>
          <Row k="매주 질문" v="11개 (질문마다 이어 묻는 짧은 질문 포함)" />
          <Row k="내가 보내는 답장" v={`${replies}번 — ${label}의 다음 링크에 먼저 도착`} />
          <Row k="우리집 신문" v="매주 한 호, 목소리·영상·글로" />
          <Row k="완성판" v="12주가 끝나면 한 권으로 묶은 디지털판" />
        </div>

        <div className="card stack" style={{ gap: 6 }}>
          <div style={{ fontSize: 20, fontWeight: 700 }}>{PRICE.digital}</div>
          <div className="small muted">{PRICE.digitalNote}</div>
        </div>

        {state === "done" ? (
          <div className="card stack" style={{ gap: 6 }}>
            <div style={{ fontWeight: 700 }}>신청을 받았어요.</div>
            <div className="small muted" style={{ lineHeight: 1.6 }}>결제 안내를 따로 드릴게요. 확인되면 다음 주 질문부터 바로 이어서 가요.</div>
          </div>
        ) : (
          <button className="btn" onClick={request} disabled={state === "busy"}>
            {state === "busy" ? "신청 중…" : "12주 이어가기 신청"}
          </button>
        )}
        <button className="link" onClick={() => router.replace("/app/stories")}>첫 번째 이야기 다시 보기</button>
      </div>
    </main>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="row" style={{ alignItems: "flex-start", gap: 12 }}>
      <span className="small muted" style={{ width: 96, flexShrink: 0 }}>{k}</span>
      <span className="small" style={{ lineHeight: 1.6 }}>{v}</span>
    </div>
  );
}
