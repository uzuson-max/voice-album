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
    r.ondataavailable = (e) => e.data.size && chunks.current.push(e.data);
    r.onstop = () => {
      setBlob(new Blob(chunks.current, { type: r.mimeType || mime || (kind === "video" ? "video/webm" : "audio/webm") }));
      setRecording(false);
      release();
    };
    rec.current = r;
    r.start(1000);
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
  }

  return { recording, sec, blob, stream, start, stop, reset };
}
