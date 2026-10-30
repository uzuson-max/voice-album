"use client";
import { useEffect, useRef, useState } from "react";
import { browserClient } from "@/lib/supabaseBrowser";

// 녹음·녹화가 끝난 직후 — "오늘 이야기의 표지" 셀피 한 장 (건너뛰어도 된다)
// 앞 카메라로 미리 보여주고, 누르면 3초 세고 찍는다. 찍은 사진은 이 호의 표지와 양장본 표지 후보가 된다.
type Props = {
  token: string;
  honorific: string;
  childName: string;
  no?: number | null;
  demo?: boolean;
  onDone: () => void;
};

export default function CoverSelfie({ token, honorific, childName, no, demo, onDone }: Props) {
  const video = useRef<HTMLVideoElement | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const [state, setState] = useState<"ask" | "live" | "count" | "shot" | "saving">("ask");
  const [count, setCount] = useState(3);
  const [shot, setShot] = useState<{ url: string; blob: Blob } | null>(null);
  const [err, setErr] = useState("");

  const stop = () => {
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
  };
  useEffect(() => stop, []);
  // 미리보기 화면이 그려진 뒤에 카메라를 붙인다
  useEffect(() => {
    const v = video.current;
    if ((state === "live" || state === "count") && v && stream.current && v.srcObject !== stream.current) {
      v.srcObject = stream.current;
      v.play().catch(() => {});
    }
  }, [state]);

  async function open() {
    setErr("");
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1080 }, height: { ideal: 1350 } },
        audio: false,
      });
      stream.current = s;
      setState("live");
    } catch {
      setErr("카메라를 쓸 수 있게 허용해 주셔야 해요. 어려우시면 건너뛰셔도 괜찮아요.");
    }
  }

  function countdown() {
    setState("count");
    let n = 3;
    setCount(n);
    const t = setInterval(() => {
      n -= 1;
      if (n > 0) setCount(n);
      else {
        clearInterval(t);
        capture();
      }
    }, 1000);
  }

  function capture() {
    const v = video.current;
    if (!v || !v.videoWidth) return setState("live");
    // 4:5 세로로 가운데를 잘라 담는다. 화면에서 본 그대로(거울) 저장
    const W = 1080, H = 1350;
    const vr = v.videoWidth / v.videoHeight, tr = W / H;
    let sw = v.videoWidth, sh = v.videoHeight, sx = 0, sy = 0;
    if (vr > tr) { sw = sh * tr; sx = (v.videoWidth - sw) / 2; } else { sh = sw / tr; sy = (v.videoHeight - sh) / 2; }
    const c = document.createElement("canvas");
    c.width = W; c.height = H;
    const g = c.getContext("2d")!;
    g.translate(W, 0); g.scale(-1, 1);
    g.drawImage(v, sx, sy, sw, sh, 0, 0, W, H);
    c.toBlob((b) => {
      if (!b) return setState("live");
      setShot({ url: URL.createObjectURL(b), blob: b });
      setState("shot");
      stop();
    }, "image/jpeg", 0.88);
  }

  async function save() {
    if (!shot) return;
    if (demo) return finish();
    setState("saving");
    try {
      const u = await fetch(`/api/s/${token}/cover`, { method: "POST" }).then((x) => x.json());
      if (!u.path) throw new Error();
      const { error } = await browserClient().storage.from("vf-media").uploadToSignedUrl(u.path, u.uploadToken, shot.blob, { contentType: "image/jpeg" });
      if (error) throw error;
      await fetch(`/api/s/${token}/cover`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: u.path }),
      });
      finish();
    } catch {
      setErr("사진을 보내지 못했어요. 한 번만 다시 눌러주세요.");
      setState("shot");
    }
  }

  function finish() {
    stop();
    onDone();
  }

  async function retake() {
    if (shot) URL.revokeObjectURL(shot.url);
    setShot(null);
    await open();
  }

  const label = no ? `NO. ${String(no).padStart(2, "0")}` : "오늘의 이야기";

  return (
    <main className="screen center foil" style={{ paddingTop: 54 }}>
      <span style={{ fontSize: 13, fontWeight: 600, letterSpacing: "0.16em", color: "var(--accent)" }}>{label} · 표지</span>
      <h1 className="serif" style={{ margin: "14px 0 0", fontSize: 27, lineHeight: 1.5, whiteSpace: "pre-line" }}>
        {state === "shot" || state === "saving" ? "이 사진으로 할까요?" : "오늘 이야기의 표지를\n한 장 남겨주세요"}
      </h1>
      {(state === "ask" || state === "live") && (
        <p className="muted" style={{ margin: "12px 0 0", fontSize: 17, lineHeight: 1.7 }}>
          {childName}에게 이야기와 함께 전해져요.
          <br />
          지금 모습 그대로가 제일 좋아요.
        </p>
      )}

      <div
        style={{
          position: "relative", marginTop: 24, width: "100%", maxWidth: 300, aspectRatio: "4 / 5", borderRadius: 18, overflow: "hidden",
          background: "#2A0F14", border: "1px solid var(--foil)", boxShadow: "0 24px 40px -18px rgba(0,0,0,.7)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}
      >
        {state === "ask" && (
          <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M4 8h3l2-3h6l2 3h3v11H4z" />
            <circle cx="12" cy="13" r="4" />
          </svg>
        )}
        {(state === "live" || state === "count") && (
          <video ref={video} muted playsInline style={{ width: "100%", height: "100%", objectFit: "cover", transform: "scaleX(-1)", borderRadius: 0 }} />
        )}
        {state === "count" && (
          <span style={{ position: "absolute", fontFamily: "var(--serif)", fontSize: 96, fontWeight: 600, color: "#FBF6EF", textShadow: "0 4px 18px rgba(0,0,0,.6)" }}>{count}</span>
        )}
        {(state === "shot" || state === "saving") && shot && (
          <img src={shot.url} alt="찍은 표지 사진" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        )}
        <span aria-hidden="true" style={{ position: "absolute", left: 12, right: 12, bottom: 10, display: "flex", justifyContent: "space-between", fontSize: 11, letterSpacing: "0.14em", color: "rgba(251,246,239,.85)" }}>
          <span>우리집 레코드</span>
          <span>{honorific}</span>
        </span>
      </div>

      <div className="grow" style={{ minHeight: 24 }} />
      {err && <p className="err" style={{ fontSize: 16 }}>{err}</p>}

      {state === "ask" && (
        <button className="btn" onClick={open}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="4" /></svg>
          사진 찍기
        </button>
      )}
      {state === "live" && <button className="btn" onClick={countdown}>찰칵 (3초 뒤에 찍혀요)</button>}
      {state === "count" && <button className="btn" disabled>웃어주세요</button>}
      {(state === "shot" || state === "saving") && (
        <>
          <button className="btn" onClick={save} disabled={state === "saving"}>{state === "saving" ? "보내는 중이에요…" : "이걸로 할게요"}</button>
          <button className="link" onClick={retake} disabled={state === "saving"}>다시 찍기</button>
        </>
      )}
      {state !== "shot" && state !== "saving" && (
        <button className="link" style={{ marginTop: 6 }} onClick={finish}>오늘은 건너뛸게요</button>
      )}
    </main>
  );
}
