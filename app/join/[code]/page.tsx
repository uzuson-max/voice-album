"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, browserClient } from "@/lib/supabaseBrowser";
import { LP } from "@/components/Illust";
import { APP_NAME } from "@/lib/brand";

// 형제가 받은 초대 링크. 로그인돼 있으면 바로 들어가고, 아니면 코드를 기억해 두고 카카오 로그인으로.
export default function Join({ params }: { params: { code: string } }) {
  const router = useRouter();
  const [state, setState] = useState<"check" | "ask" | "err">("check");
  const [err, setErr] = useState("");

  useEffect(() => {
    try { localStorage.setItem("vf-join", params.code); } catch {}
    browserClient().auth.getSession().then(async ({ data }) => {
      if (!data.session) return setState("ask");
      try {
        await api("/api/join", { method: "POST", body: JSON.stringify({ code: params.code }) });
        try { localStorage.removeItem("vf-join"); } catch {}
        router.replace("/app/stories");
      } catch (e: any) {
        setErr(e.message);
        setState("err");
      }
    });
  }, [params.code, router]);

  if (state === "check") return <main className="screen center"><p className="muted">잠시만요…</p></main>;
  return (
    <main className="screen center boxed" style={{ paddingTop: 96 }}>
      <LP size={92} />
      <p className="tiny muted" style={{ margin: "28px 0 0", letterSpacing: "0.12em" }}>{APP_NAME}</p>
      <h1 className="serif" style={{ margin: "14px 0 0", fontSize: 26, lineHeight: 1.5 }}>
        우리 가족 이야기에
        <br />
        초대받았어요
      </h1>
      <p className="muted" style={{ margin: "18px 0 0", fontSize: 16, lineHeight: 1.7 }}>
        부모님이 들려주시는 이야기를 함께 듣고,
        <br />
        답장도 같이 남길 수 있어요.
      </p>
      <div className="grow" />
      {state === "err" && <p className="err">{err}</p>}
      <button className="btn" onClick={() => router.push("/login")}>카카오로 함께하기</button>
    </main>
  );
}
