"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { browserClient } from "@/lib/supabaseBrowser";
import { Envelope } from "@/components/Illust";

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

  return (
    <main className="screen center" style={{ paddingTop: 100 }}>
      <Envelope />
      <h1 className="serif" style={{ fontSize: 26, margin: "36px 0 0" }}>시작하기</h1>
      <p className="muted" style={{ fontSize: 16, lineHeight: 1.7, marginTop: 12 }}>
        카카오로 3초 만에 시작해요.
      </p>
      <div className="grow" style={{ minHeight: 32 }} />
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
    </main>
  );
}
