"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { browserClient } from "@/lib/supabaseBrowser";

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    browserClient().auth.getSession().then(({ data }) => data.session && router.replace("/app"));
  }, [router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    const { error } = await browserClient().auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/app` },
    });
    setBusy(false);
    if (error) setErr("메일을 보내지 못했어요. 잠시 후 다시 시도해 주세요.");
    else setSent(true);
  }

  return (
    <main className="screen">
      <h1 className="h1">시작하기</h1>
      {sent ? (
        <p className="muted" style={{ fontSize: 17, lineHeight: 1.7, marginTop: 20 }}>
          <b style={{ color: "var(--ink)" }}>{email}</b> 으로 로그인 링크를 보냈어요.
          <br />
          메일함에서 링크를 눌러주세요.
        </p>
      ) : (
        <form onSubmit={submit} className="stack" style={{ marginTop: 24 }}>
          <div className="field">
            <label htmlFor="email">이메일</label>
            <input id="email" className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" />
          </div>
          {err && <p className="err">{err}</p>}
          <button className="btn" disabled={busy}>{busy ? "보내는 중…" : "로그인 링크 받기"}</button>
        </form>
      )}
    </main>
  );
}
