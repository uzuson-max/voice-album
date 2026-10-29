"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/supabaseBrowser";
import { josa } from "@/lib/korean";
import { PRICE, perPerson } from "@/lib/brand";
import BizFooter from "@/components/BizFooter";

// 결제 전 화면 — 무료 체험 대신, 받는 것·환불·보관을 한 화면에서 분명하게
export default function Plan() {
  const router = useRouter();
  const [course, setCourse] = useState<any[] | null>(null);
  const [label, setLabel] = useState("부모님");
  const [honorific, setHonorific] = useState("어머니");
  const [child, setChild] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "done">("idle");

  useEffect(() => {
    api("/api/me/recommend", { method: "POST" })
      .then((r) => { setCourse(r.course); setLabel(r.label || "부모님"); })
      .catch(() => router.replace("/app"));
    api("/api/me/family")
      .then(({ family, storyteller }) => {
        if (storyteller?.honorific) setHonorific(storyteller.honorific);
        if (family?.child_name) setChild(family.child_name);
      })
      .catch(() => {});
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
  const replies = course.filter((w) => w.replyAsk).length;
  const songs = course.filter((w) => w.encore).length;
  const demo = `/s/demo?c=${encodeURIComponent(child)}&h=${encodeURIComponent(honorific)}`;

  return (
    <main className="screen">
      <div className="stack">
        <h1 className="h1">{josa(label, "과/와")} 함께할 12번의 이야기</h1>
        <p className="muted small" style={{ margin: 0, lineHeight: 1.7 }}>
          화요일과 토요일, 질문이 하나씩 가요. 다 모이면 {label} 목소리가 담긴 양장본 한 권이 집으로 가요.
        </p>

        <div className="card box stack" style={{ gap: 6 }}>
          <div style={{ fontSize: 22, fontWeight: 700 }}>{PRICE.label}</div>
          <div className="small muted">{PRICE.note}</div>
          <div className="tiny muted" style={{ lineHeight: 1.6 }}>
            형제와 나누면 2명 {perPerson(2)} · 3명 {perPerson(3)} · 4명 {perPerson(4)}
          </div>
        </div>

        <div className="card stack" style={{ gap: 10 }}>
          <Row k="질문" v={`12번 — 그중 ${songs}번은 노래·목소리를 하나 더 남겨요`} />
          <Row k="부모님 참여" v="문자 링크 하나. 앱 설치·로그인 없이 말로만" />
          <Row k="매번 받는 것" v="목소리·영상 원본 + 우리집 신문 한 편" />
          <Row k="내가 보내는 답장" v={`${replies}번 — ${label}의 다음 링크에 먼저 도착`} />
          <Row k="12번이 끝나면" v="양장본 1권 · 장마다 QR로 목소리 다시 듣기" />
          <Row k="보관" v={`끝난 뒤 ${PRICE.keepYears}년 동안 열람·원본 전체 내려받기`} />
          {PRICE.extraCopy && <Row k="형제용 추가 부수" v={PRICE.extraCopy} />}
        </div>

        <a href={demo} className="btn soft" target="_blank" rel="noreferrer">{josa(label, "이/가")} 받는 화면 직접 체험해보기</a>

        <div className="card stack" style={{ gap: 8 }}>
          <div style={{ fontWeight: 700 }}>첫 두 이야기를 받아보고 아니다 싶으면 전액 돌려드려요.</div>
          <div className="small muted" style={{ lineHeight: 1.6 }}>
            그 뒤에는 남은 회차만큼 돌려드려요. 사유는 묻지 않아요. <a href="/refund">환불 정책</a>
          </div>
        </div>

        <div className="card stack" style={{ gap: 8 }}>
          <div className="small" style={{ lineHeight: 1.7 }}>
            {label} 목소리와 영상은 가족 외에는 누구도 볼 수 없어요. 보관 기간이 끝나기 30일 전에 원본 전체 내려받기를 안내해 드려요.
          </div>
          <div className="small muted" style={{ lineHeight: 1.7 }}>
            {josa(label, "이/가")} 편찮으셔서 일정을 바꿔야 하면 바로 말씀해 주세요. 더 자주 보내거나, 그때까지 남은 이야기로 먼저 책을 만들어 드려요.
          </div>
        </div>

        {state === "done" ? (
          <div className="card stack" style={{ gap: 6 }}>
            <div style={{ fontWeight: 700 }}>신청을 받았어요.</div>
            <div className="small muted" style={{ lineHeight: 1.6 }}>결제 안내를 따로 드릴게요. 확인되면 첫 질문부터 바로 시작해요.</div>
          </div>
        ) : (
          <button className="btn" onClick={request} disabled={state === "busy"}>
            {state === "busy" ? "신청 중…" : `${PRICE.label}으로 시작하기`}
          </button>
        )}
        <button className="link" onClick={() => router.replace("/app/pick")}>12번 질문 전체 다시 보기</button>
        <BizFooter />
      </div>
    </main>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="row" style={{ alignItems: "flex-start", gap: 12 }}>
      <span className="small muted" style={{ width: 104, flexShrink: 0 }}>{k}</span>
      <span className="small" style={{ lineHeight: 1.6 }}>{v}</span>
    </div>
  );
}
