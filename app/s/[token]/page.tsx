"use client";
import { useEffect, useRef, useState } from "react";
import { browserClient } from "@/lib/supabaseBrowser";
import { Baby, Envelope, Mic, MomOnSofa } from "@/components/Illust";
import { koDate } from "@/lib/time";

type Info = { text: string; format: "audio" | "video"; answered: boolean; honorific: string; childName: string; unsealAt: string | null };
type Phase = "loading" | "error" | "ask" | "recording" | "review" | "sending" | "done" | "later";

const LIMIT = { audio: 15 * 60, video: 3 * 60 };

function pickMime(kind: "audio" | "video") {
  const list =
    kind === "video"
      ? ["video/mp4", "video/webm;codecs=vp8,opus", "video/webm"]
      : ["audio/mp4", "audio/webm;codecs=opus", "audio/webm"];
  if (typeof MediaRecorder === "undefined") return "";
  return list.find((m) => MediaRecorder.isTypeSupported(m)) || "";
}

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

export default function ParentPage({ params }: { params: { token: string } }) {
  const [info, setInfo] = useState<Info | null>(null);
  const [phase, setPhase] = useState<Phase>("loading");
  const [err, setErr] = useState("");
  const [sec, setSec] = useState(0);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [unsealAt, setUnsealAt] = useState<string | null>(null);
  const rec = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const chunks = useRef<Blob[]>([]);
  const timer = useRef<any>(null);
  const live = useRef<HTMLVideoElement | null>(null);
  const startedAt = useRef(0);

  useEffect(() => {
    fetch(`/api/s/${params.token}`)
      .then((r) => r.json().then((j) => ({ ok: r.ok, j })))
      .then(({ ok, j }) => {
        if (!ok) throw new Error(j.error);
        setInfo(j);
        setUnsealAt(j.unsealAt);
        setPhase(j.answered ? "done" : "ask");
      })
      .catch((e) => {
        setErr(e.message || "링크를 열 수 없어요");
        setPhase("error");
      });
    return () => stopAll();
  }, [params.token]);

  function stopAll() {
    clearInterval(timer.current);
    stream.current?.getTracks().forEach((t) => t.stop());
  }

  async function start() {
    if (!info) return;
    setErr("");
    try {
      const s = await navigator.mediaDevices.getUserMedia(
        info.format === "video"
          ? { audio: true, video: { facingMode: "user", width: { ideal: 720 }, height: { ideal: 960 } } }
          : { audio: true }
      );
      stream.current = s;
      const mime = pickMime(info.format);
      const r = new MediaRecorder(s, {
        ...(mime ? { mimeType: mime } : {}),
        ...(info.format === "video" ? { videoBitsPerSecond: 1_500_000 } : { audioBitsPerSecond: 48_000 }),
      });
      chunks.current = [];
      r.ondataavailable = (e) => e.data.size && chunks.current.push(e.data);
      r.onstop = () => {
        const b = new Blob(chunks.current, { type: r.mimeType || mime || (info.format === "video" ? "video/webm" : "audio/webm") });
        setBlob(b);
        stopAll();
        setPhase("review");
      };
      rec.current = r;
      r.start(1000);
      startedAt.current = Date.now();
      setSec(0);
      setPhase("recording");
      timer.current = setInterval(() => {
        const n = Math.floor((Date.now() - startedAt.current) / 1000);
        setSec(n);
        if (n >= LIMIT[info.format]) stop();
      }, 500);
      setTimeout(() => {
        if (live.current && info.format === "video") {
          live.current.srcObject = s;
          live.current.play().catch(() => {});
        }
      }, 50);
    } catch {
      setErr("마이크(카메라) 사용을 허용해 주셔야 해요. 화면 위쪽 알림에서 '허용'을 눌러주세요.");
    }
  }

  function stop() {
    clearInterval(timer.current);
    if (rec.current && rec.current.state !== "inactive") rec.current.stop();
  }

  async function send() {
    if (!blob) return;
    setPhase("sending");
    setErr("");
    try {
      const u = await fetch(`/api/s/${params.token}/upload-url`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mime: blob.type }),
      }).then((r) => r.json());
      if (!u.path) throw new Error(u.error);
      const { error } = await browserClient()
        .storage.from("vf-media")
        .uploadToSignedUrl(u.path, u.uploadToken, blob, { contentType: blob.type });
      if (error) throw error;
      const c = await fetch(`/api/s/${params.token}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: u.path, mime: blob.type, duration: sec }),
      }).then((r) => r.json());
      if (!c.ok) throw new Error(c.error);
      setUnsealAt(c.unsealAt);
      setPhase("done");
    } catch {
      setErr("보내지 못했어요. 인터넷 연결을 확인하고 다시 눌러주세요.");
      setPhase("review");
    }
  }

  async function later() {
    await fetch(`/api/s/${params.token}/later`, { method: "POST" }).catch(() => {});
    setPhase("later");
  }

  if (phase === "loading") return <main className="screen center"><p className="muted">잠시만요…</p></main>;
  if (phase === "error" || !info)
    return (
      <main className="screen center">
        <div className="grow" />
        <p className="serif q">{err || "링크를 열 수 없어요"}</p>
        <div className="grow" />
      </main>
    );

  const isVideo = info.format === "video";
  const toChild = unsealAt ? `${koDate(unsealAt)}에 ${info.childName}에게 전해져요` : `${info.childName}에게 바로 전해져요`;

  if (phase === "done")
    return (
      <main className="screen center" style={{ paddingTop: 110 }}>
        <Envelope />
        <h1 className="serif" style={{ margin: "40px 0 0", fontSize: 28 }}>잘 담았어요.</h1>
        <p className="muted" style={{ margin: "14px 0 0", fontSize: 17, lineHeight: 1.7 }}>
          {info.honorific}의 이야기는 소중히 봉해두었다가
          <br />
          {toChild}.
        </p>
        <div className="grow" />
        <p className="small muted">다음 질문은 다음 주에 문자로 보내드려요</p>
      </main>
    );

  if (phase === "later")
    return (
      <main className="screen center" style={{ paddingTop: 110 }}>
        <MomOnSofa />
        <h1 className="serif" style={{ margin: "32px 0 0", fontSize: 26 }}>괜찮아요.</h1>
        <p className="muted" style={{ fontSize: 17, lineHeight: 1.7 }}>
          편하실 때 같은 링크를 다시 눌러주세요.
          <br />
          이따가 한 번 더 알려드릴게요.
        </p>
      </main>
    );

  return (
    <main className="screen center">
      {isVideo ? (
        <span className="pill">조금 특별한 질문이에요</span>
      ) : (
        <p className="small muted" style={{ margin: 0, fontWeight: 500 }}>{info.childName}가 보낸 이번 주 질문</p>
      )}

      {phase === "recording" && isVideo ? (
        <video ref={live} className="preview" muted playsInline style={{ marginTop: 24 }} />
      ) : phase === "review" && blob ? (
        <div style={{ marginTop: 28, width: "100%" }}>
          {isVideo ? (
            <video src={URL.createObjectURL(blob)} controls playsInline style={{ aspectRatio: "3/4", background: "#16271d" }} />
          ) : (
            <audio src={URL.createObjectURL(blob)} controls />
          )}
        </div>
      ) : (
        <div style={{ marginTop: isVideo ? 20 : 32 }}>{isVideo ? <Baby /> : <MomOnSofa />}</div>
      )}

      <h1 className="serif q" style={{ marginTop: 28 }}>{info.text}</h1>
      {phase === "ask" && (
        <p className="muted" style={{ margin: "12px 0 0", fontSize: 16, lineHeight: 1.6 }}>
          {isVideo ? "이번엔 얼굴을 보며 들려주세요. 가족만 볼 수 있어요." : "생각나는 대로, 편하게 말씀해 주세요."}
        </p>
      )}

      <div className="grow" style={{ minHeight: 28 }} />
      {err && <p className="err">{err}</p>}

      {phase === "ask" && (
        <>
          <button className="btn" onClick={start}>
            {isVideo ? <span className="rec-dot" /> : <Mic />}
            {isVideo ? "눌러서 녹화하기" : "눌러서 말하기"}
          </button>
          <p className="small muted" style={{ marginTop: 12 }}>
            {isVideo ? "영상 · 최대 3분" : "음성 · 최대 15분"} · {toChild}
          </p>
          <button className="link" onClick={later}>지금은 어려워요</button>
        </>
      )}

      {phase === "recording" && (
        <>
          <p className="row" style={{ justifyContent: "center", fontSize: 20, fontWeight: 700, margin: "0 0 16px" }}>
            <span className="rec-dot pulse" /> {mmss(sec)}
            <span className="small muted" style={{ fontWeight: 400 }}>/ {mmss(LIMIT[info.format])}</span>
          </p>
          <button className="btn" onClick={stop}>다 말했어요</button>
        </>
      )}

      {(phase === "review" || phase === "sending") && (
        <>
          <button className="btn" onClick={send} disabled={phase === "sending"}>
            {phase === "sending" ? "보내는 중이에요…" : `${info.childName}에게 보내기`}
          </button>
          <button className="link" onClick={() => { setBlob(null); setPhase("ask"); }} disabled={phase === "sending"}>
            다시 하기
          </button>
        </>
      )}
    </main>
  );
}
