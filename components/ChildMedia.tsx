"use client";
import { useEffect, useRef, useState } from "react";
import { api, browserClient } from "@/lib/supabaseBrowser";
import { mmss, useRecorder } from "@/lib/useRecorder";

type Target = "question" | "photo" | "reaction";

async function upload(target: Target, promptId: string, blob: Blob) {
  const u = await api("/api/me/media", { method: "POST", body: JSON.stringify({ target, promptId, mime: blob.type }) });
  const { error } = await browserClient().storage.from("vf-media").uploadToSignedUrl(u.path, u.uploadToken, blob, { contentType: blob.type });
  if (error) throw error;
  await api("/api/me/media", { method: "PUT", body: JSON.stringify({ target, promptId, path: u.path }) });
}

// 자녀 목소리 녹음 → 바로 저장 (질문을 내 목소리로 / 빨간펜 음성 반응)
export function VoiceButton({
  promptId, target, has, label, limit = 30, onDone,
}: { promptId: string; target: "question" | "reaction"; has: boolean; label: string; limit?: number; onDone?: () => void }) {
  const r = useRecorder();
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">(has ? "saved" : "idle");

  useEffect(() => {
    if (!r.blob || r.recording) return;
    setState("saving");
    upload(target, promptId, r.blob)
      .then(() => { setState("saved"); r.reset(); onDone?.(); })
      .catch(() => setState("error"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [r.blob, r.recording]);

  async function remove() {
    await api(`/api/me/media?target=${target}&promptId=${promptId}`, { method: "DELETE" }).catch(() => {});
    setState("idle");
    onDone?.();
  }

  if (r.recording)
    return (
      <button className="textbtn row" style={{ gap: 6 }} onClick={r.stop}>
        <span className="rec-dot pulse" /> {mmss(r.sec)} · 다 했어요
      </button>
    );
  if (state === "saving") return <span className="tiny muted">저장 중…</span>;
  if (state === "saved")
    return (
      <span className="row tiny" style={{ gap: 6 }}>
        <span style={{ color: "var(--primary)", fontWeight: 700 }}>✓ {label}</span>
        <button className="textbtn" style={{ color: "var(--muted)" }} onClick={() => r.start("audio", limit).catch(() => setState("error"))}>다시</button>
        <button className="textbtn" style={{ color: "var(--muted)" }} onClick={remove}>지우기</button>
      </span>
    );
  return (
    <button className="textbtn" onClick={() => r.start("audio", limit).catch(() => setState("error"))}>
      {state === "error" ? "마이크를 허용해 주세요" : `🎙 ${label}`}
    </button>
  );
}

// 사진 하나 붙이기 (선택)
export function PhotoButton({ promptId, has, onDone }: { promptId: string; has: boolean; onDone?: () => void }) {
  const input = useRef<HTMLInputElement | null>(null);
  const [state, setState] = useState<"idle" | "saving" | "saved">(has ? "saved" : "idle");

  async function pick(f?: File | null) {
    if (!f) return;
    setState("saving");
    try {
      await upload("photo", promptId, f);
      setState("saved");
      onDone?.();
    } catch {
      setState(has ? "saved" : "idle");
    }
  }
  async function remove() {
    await api(`/api/me/media?target=photo&promptId=${promptId}`, { method: "DELETE" }).catch(() => {});
    setState("idle");
    onDone?.();
  }

  return (
    <>
      <input ref={input} type="file" accept="image/*" hidden onChange={(e) => pick(e.target.files?.[0])} />
      {state === "saving" ? (
        <span className="tiny muted">올리는 중…</span>
      ) : state === "saved" ? (
        <span className="row tiny" style={{ gap: 6 }}>
          <span style={{ color: "var(--primary)", fontWeight: 700 }}>✓ 사진</span>
          <button className="textbtn" style={{ color: "var(--muted)" }} onClick={remove}>빼기</button>
        </span>
      ) : (
        <button className="textbtn" style={{ color: "var(--muted)" }} onClick={() => input.current?.click()}>+ 사진 (있으면)</button>
      )}
    </>
  );
}
