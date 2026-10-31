"use client";
// 다람쥐 진행자 그림. 그림 파일: public/host/talk.png, public/host/listen.png (정사각형)
import type { HostMode } from "@/lib/useHost";

export default function HostSquirrel({ mode, small }: { mode: HostMode; small?: boolean }) {
  if (mode === "off") return null;
  const listening = mode === "listen";
  return (
    <div
      style={{
        width: small ? 96 : "68%",
        maxWidth: 300,
        aspectRatio: "1 / 1",
        borderRadius: small ? "50%" : 28,
        overflow: "hidden",
        background: "#0f3a3a",
        margin: small ? 0 : "18px auto 0",
        boxShadow: "0 10px 30px rgba(0,0,0,.35)",
        position: small ? "fixed" : "relative",
        top: small ? 16 : undefined,
        right: small ? 16 : undefined,
        zIndex: small ? 20 : undefined,
      }}
    >
      <style>{`
        @keyframes sq-talk { 0%,100% { transform: translateY(0) scale(1,1) } 30% { transform: translateY(-2.5%) scale(1.015,.985) } 60% { transform: translateY(0) scale(.99,1.01) } }
        @keyframes sq-nod { 0%,100% { transform: rotate(0) translateY(0) } 40% { transform: rotate(-2deg) translateY(1.5%) } }
        @keyframes sq-breathe { 0%,100% { transform: scale(1) } 50% { transform: scale(1.012) } }
      `}</style>
      <img
        src={listening ? "/host/listen.png" : "/host/talk.png"}
        alt=""
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          display: "block",
          transformOrigin: "50% 90%",
          animation:
            mode === "talk"
              ? "sq-talk .32s ease-in-out infinite"
              : listening
              ? "sq-nod 2.6s ease-in-out infinite"
              : "sq-breathe 3s ease-in-out infinite",
        }}
      />
    </div>
  );
}
