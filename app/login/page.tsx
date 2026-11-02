"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { browserClient } from "@/lib/supabaseBrowser";

// 로그인 — 그림 대신 잡지 제호처럼 글자만으로. 이야기 탭(잡지)과 같은 결
export default function Login() {
  const router = useRouter();
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    browserClient().auth.getSession().then(({ data }) => data.session && router.replace("/app"));
  }, [router]);

  async function kakao() {
    setBusy(true);
    setErr("");
    const { error } = await browserClient().auth.signInWithOAuth({
      provider: "kakao",
      options: { redirectTo: `${window.location.origin}/app` },
    });
    if (error) {
      setErr("카카오 로그인을 시작하지 못했어요. 잠시 후 다시 시도해 주세요.");
      setBusy(false);
    }
  }

  const ink = "var(--charcoal)";
  return (
    <main className="screen" style={{ paddingTop: "calc(24px + env(safe-area-inset-top))" }}>
      <div className="row between" style={{ alignItems: "baseline", borderBottom: `1px solid ${ink}`, paddingBottom: 10 }}>
        <span style={{ fontSize: 12, letterSpacing: ".22em", color: "var(--muted)" }}>부모님 이야기 잡지</span>
        <span style={{ fontSize: 12, letterSpacing: ".22em", color: "var(--muted)" }}>창간 준비호</span>
      </div>

      <div style={{ marginTop: "clamp(56px, 16vh, 140px)" }}>
        <h1 style={{ fontFamily: "var(--serif)", fontWeight: 700, fontSize: 54, lineHeight: 1.12, letterSpacing: "-.02em", margin: 0, color: ink }}>
          우리집<br />레코드
        </h1>
        <div style={{ width: 44, height: 3, background: "var(--ochre)", margin: "26px 0 22px" }} />
        <p style={{ fontSize: 17, lineHeight: 1.75, color: "var(--text)", margin: 0, wordBreak: "keep-all" }}>
          엄마·아빠의 목소리와 모습을<br />한 권으로 남겨요
        </p>
      </div>

      <div className="grow" style={{ minHeight: 40 }} />
      {err && <p className="err">{err}</p>}
      <button
        className="btn"
        onClick={kakao}
        disabled={busy}
        style={{ background: "#FEE500", color: "#191600" }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
          <path fill="#191600" d="M12 3C6.48 3 2 6.58 2 11c0 2.83 1.84 5.32 4.62 6.74l-.96 3.53c-.08.31.27.56.54.38l4.2-2.78c.52.07 1.05.11 1.6.11 5.52 0 10-3.58 10-8S17.52 3 12 3z" />
        </svg>
        {busy ? "카카오로 이동 중…" : "카카오로 시작하기"}
      </button>
      <p className="muted" style={{ fontSize: 13, textAlign: "center", margin: "12px 0 0" }}>가입과 로그인 모두 카카오로 한 번에</p>
    </main>
  );
}
