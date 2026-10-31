"use client";
// 진행자(사회자) 영상 — 미리 만든 영상 3종을 한 <video>에서 바꿔 튼다
//   /host/w{주차}.mp4  진행자가 그 주 질문을 읽어줌 (소리 O)
//   /host/pass.mp4     "이야기 들려주세요" 하며 마이크를 넘김 (소리 O, 몇 초)
//   /host/listen.mp4   고개 끄덕이며 듣는 장면 (소리 X, 반복)
// 그 주 영상이 없으면 진행자 없이 기존 화면 그대로 나온다.
// 한 영상 요소만 쓰는 이유: 첫 누름에서 소리 재생이 허락되면 같은 요소는 계속 소리를 낼 수 있음 (아이폰)
import { useCallback, useRef, useState } from "react";

export type HostMode = "off" | "ask" | "pass" | "listen";

export function useHost() {
  const el = useRef<HTMLVideoElement | null>(null);
  const [mode, setMode] = useState<HostMode>("off");

  function video() {
    if (!el.current) {
      const v = document.createElement("video");
      v.playsInline = true;
      v.setAttribute("playsinline", "");
      v.preload = "auto";
      Object.assign(v.style, { width: "100%", height: "100%", objectFit: "cover", borderRadius: "inherit", display: "block" });
      el.current = v;
    }
    return el.current;
  }

  function play(src: string, m: HostMode, o: { loop?: boolean; muted?: boolean; onEnd?: () => void }) {
    const v = video();
    v.onended = null;
    v.loop = !!o.loop;
    v.muted = !!o.muted;
    v.src = src;
    setMode(m);
    return v
      .play()
      .then(() => {
        if (o.onEnd) v.onended = o.onEnd;
        return true;
      })
      .catch(() => false);
  }

  // 듣는 장면 (소리 없이 반복). 녹음 중에도 이걸 튼다.
  function listen() {
    if (!el.current) return;
    play("/host/listen.mp4", "listen", { loop: true, muted: true });
  }

  // 마이크 넘기기 → 듣기. onHand: 마이크를 넘기는 순간(녹음 버튼 보여줄 때)
  function handOver(onHand?: () => void) {
    if (!el.current) return onHand?.();
    play("/host/pass.mp4", "pass", { onEnd: listen }).then((ok) => {
      if (!ok) listen();
    });
    onHand?.();
  }

  // 반드시 버튼 누름 안에서 부를 것. 그 주 영상이 없으면 false
  async function open(week: number, onHand: () => void) {
    const ok = await play(`/host/w${week}.mp4`, "ask", { onEnd: () => handOver(onHand) });
    if (!ok) stop();
    return ok;
  }

  function stop() {
    el.current?.pause();
    setMode("off");
  }

  // 영상이 들어갈 자리. 화면이 바뀌어도 같은 영상 요소를 옮겨 붙인다
  const mount = useCallback((d: HTMLDivElement | null) => {
    if (d && el.current && el.current.parentNode !== d) d.appendChild(el.current);
  }, []);

  return { mode, on: mode !== "off", open, handOver, listen, stop, mount };
}
