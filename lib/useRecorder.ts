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
    session("playback"); // 녹음이 끝나면 다시 '듣기' 모드로 — 아이폰에서 다음 질문 목소리가 작아지지 않게
  }
  useEffect(() => release, []);

  async function start(kind: Kind, limit: number) {
    session("play-and-record");
    // 에코 제거를 켜면 휴대폰·PC가 '통화 모드'로 바뀌어, 녹음이 끝난 뒤에도 다람쥐 목소리·음악이 작게 나온다 → 끈다
    const mic = { echoCancellation: false, noiseSuppression: true, autoGainControl: true };
    const st = await navigator.mediaDevices.getUserMedia(
      kind === "video"
        ? { audio: mic, video: { facingMode: "user", width: { ideal: 720 }, height: { ideal: 960 } } }
        : { audio: mic }
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

// 아이폰(사파리 16.4+): 소리 모드 전환. 지원 안 하면 아무 일 없음
// 모드가 바뀌는 1초 남짓 동안 휴대폰이 소리 길을 바꾸느라 음량이 확 줄었다가 돌아온다
// → 바뀐 시각을 기억해 두고, 다람쥐 목소리는 그 시간이 지난 뒤에 읽기 시작한다 (audioSettled)
let lastSwitch = 0;
const SETTLE_MS = 1200;
function session(type: "playback" | "play-and-record") {
  try {
    const a = (navigator as any).audioSession;
    if (a && a.type !== type) { a.type = type; lastSwitch = Date.now(); }
  } catch {}
  // 마이크를 켜고 끄는 것 자체도 소리 길을 바꾼다 (audioSession을 지원하지 않는 폰 포함)
  lastSwitch = Math.max(lastSwitch, Date.now());
}

/** 소리 모드 전환이 끝날 때까지 기다린다 (바로 전에 녹음이 끝났을 때만 잠깐 기다림) */
export function audioSettled(): Promise<void> {
  const wait = lastSwitch + SETTLE_MS - Date.now();
  return wait > 0 ? new Promise((r) => setTimeout(r, wait)) : Promise.resolve();
}
