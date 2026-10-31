"use client";
// 다람쥐 진행자 — 그림 2장(말하기/듣기) + TTS 목소리
//   talk:   질문을 읽는 중 (오물오물 들썩임)
//   listen: 귀 기울여 듣는 중 (천천히 끄덕임)
// 목소리는 /api/s/{token}/tts 에서 받아온다. 실패하면 조용히 글자만 보여준다.
import { useRef, useState } from "react";

export type HostMode = "off" | "load" | "talk" | "listen";

// 아주 짧은 무음 — 첫 누름 안에서 재생해 휴대폰 소리 재생을 미리 허락받는다 (아이폰)
const SILENT = "/host/silent.mp3";

export function useHost(token: string) {
  const el = useRef<HTMLAudioElement | null>(null);
  const seq = useRef(0); // 말하는 도중 다른 동작이 오면 앞의 것은 버린다
  const [mode, setMode] = useState<HostMode>("off");

  // "이야기 시작하기" 누름 안에서 부를 것
  function unlock() {
    if (!el.current) {
      const a = new Audio();
      a.preload = "auto";
      el.current = a;
    }
    el.current.src = SILENT;
    el.current.play().catch(() => {});
    setMode("load");
  }

  // 문장을 읽고, 다 읽으면(또는 실패하면) 듣기 자세로 바꾼 뒤 onDone
  async function say(text: string, onDone?: () => void) {
    const my = ++seq.current;
    const a = el.current;
    const done = () => {
      if (my !== seq.current) return;
      setMode("listen");
      onDone?.();
    };
    if (!a || !text.trim()) return done();
    setMode("load");
    try {
      const j = await fetch(`/api/s/${token}/tts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      }).then((r) => r.json());
      if (my !== seq.current) return;
      if (!j.url) throw new Error();
      a.onended = done;
      a.onerror = done;
      a.src = j.url;
      await a.play();
      if (my === seq.current) setMode("talk");
    } catch {
      done();
    }
  }

  // 바로 듣기로 (읽던 건 멈춤)
  function listen() {
    seq.current++;
    el.current?.pause();
    if (el.current) setMode("listen");
  }

  function stop() {
    seq.current++;
    el.current?.pause();
    setMode("off");
  }

  return { mode, on: mode !== "off", unlock, say, listen, stop };
}
