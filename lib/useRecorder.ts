"use client";
import { useEffect, useRef, useState } from "react";

export type Kind = "audio" | "video";

function pickMime(kind: Kind) {
  const list =
    kind === "video"
      ? ["video/mp4", "video/webm;codecs=vp8,opus", "video/webm"]
      : ["audio/mp4", "audio/webm;codecs=opus", "audio/webm"];
  if (typeof MediaRecorder === "undefined") return "";
  return list.find((m) => MediaRecorder.isTypeSupported(m)) || "";
}

export const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

// 녹음·녹화 공용 훅. limit초가 되면 자동으로 멈춘다.
export function useRecorder() {
  const [recording, setRecording] = useState(false);
  const [sec, setSec] = useState(0);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [failed, setFailed] = useState(false);
  const rec = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const timer = useRef<any>(null);
  const startedAt = useRef(0);
  const s = useRef<MediaStream | null>(null);

  function release() {
    clearInterval(timer.current);
    s.current?.getTracks().forEach((t) => t.stop());
    s.current = null;
    setStream(null);
  }
  useEffect(() => release, []);

  async function start(kind: Kind, limit: number) {
    const st = await navigator.mediaDevices.getUserMedia(
      kind === "video"
        ? { audio: true, video: { facingMode: "user", width: { ideal: 720 }, height: { ideal: 960 } } }
        : { audio: true }
    );
    s.current = st;
    setStream(st);
    const mime = pickMime(kind);
    const r = new MediaRecorder(st, {
      ...(mime ? { mimeType: mime } : {}),
      ...(kind === "video" ? { videoBitsPerSecond: 1_500_000 } : { audioBitsPerSecond: 48_000 }),
    });
    chunks.current = [];
    setFailed(false);
    r.ondataavailable = (e) => e.data.size && chunks.current.push(e.data);
    // 녹음 중 오류(전화·알림·화면 꺼짐 등): 그때까지 담긴 것만이라도 살린다
    r.onerror = () => { setFailed(true); stop(); };
    st.getTracks().forEach((t) => t.addEventListener("ended", () => { setFailed(true); stop(); }));
    r.onstop = () => {
      const b = new Blob(chunks.current, { type: r.mimeType || mime || (kind === "video" ? "video/webm" : "audio/webm") });
      if (!b.size) setFailed(true);
      setBlob(b.size ? b : null);
      setRecording(false);
      release();
    };
    rec.current = r;
    // 아이폰 사파리는 1초 단위로 쪼개 저장하면 오디오(mp4)가 비거나 끊기는 경우가 있어 통째로 받는다
    const ios = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.userAgent.includes("Mac") && "ontouchend" in document);
    if (ios) r.start(); else r.start(1000);
    startedAt.current = Date.now();
    setSec(0);
    setBlob(null);
    setRecording(true);
    timer.current = setInterval(() => {
      const n = Math.floor((Date.now() - startedAt.current) / 1000);
      setSec(n);
      if (n >= limit) stop();
    }, 500);
  }

  function stop() {
    clearInterval(timer.current);
    if (rec.current && rec.current.state !== "inactive") rec.current.stop();
  }

  function reset() {
    setBlob(null);
    setSec(0);
    setFailed(false);
  }

  return { recording, sec, blob, stream, failed, start, stop, reset };
}
