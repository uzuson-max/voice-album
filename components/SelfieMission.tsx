"use client";
import { useRef, useState } from "react";
import { browserClient } from "@/lib/supabaseBrowser";

// 이야기를 마친 부모님께: 지금 얼굴 한 장 → 이번 호 잡지 표지
// 숙제가 되지 않게 한 번 권하고, 넘어가도 아무 일 없다
export default function SelfieMission({ token, isDemo, childName }: { token: string; isDemo: boolean; childName: string }) {
  const input = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [state, setState] = useState<"idle" | "saving" | "done" | "skip" | "error">("idle");

  if (state === "skip") return null;

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    setState("saving");
    try {
      const blob = await shrink(f, 1600);
      setPreview(URL.createObjectURL(blob));
      if (isDemo) { setState("done"); return; }
      const u = await fetch(`/api/s/${token}/upload-url`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mime: "image/jpeg" }),
      }).then((x) => x.json());
      if (!u.path) throw new Error(u.error);
      const { error } = await browserClient().storage.from("vf-media").uploadToSignedUrl(u.path, u.uploadToken, blob, { contentType: "image/jpeg" });
      if (error) throw error;
      const s = await fetch(`/api/s/${token}/selfie`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: u.path }),
      }).then((x) => x.json());
      if (!s.ok) throw new Error(s.error);
      setState("done");
    } catch {
      setState("error");
    }
  }

  return (
    <div className="card stack" style={{ gap: 14, textAlign: "left", width: "100%", marginTop: 28, padding: "24px 22px", border: "2px solid var(--accent)" }}>
      <span style={{ fontSize: 15, fontWeight: 700, color: "var(--accent)", letterSpacing: "0.04em" }}>마지막으로, 표지 한 장</span>
      {preview ? (
        <img src={preview} alt="" style={{ width: "100%", aspectRatio: "3/4", objectFit: "cover", borderRadius: 4 }} />
      ) : (
        <p className="serif" style={{ margin: 0, fontSize: 22, lineHeight: 1.6, wordBreak: "keep-all" }}>
          지금 얼굴을 한 장 찍어주세요.
          <br />
          오늘 이야기의 표지가 돼요.
        </p>
      )}
      {state === "done" ? (
        <p style={{ margin: 0, fontSize: 18 }}>표지로 실었어요. {childName}에게 같이 전해져요.</p>
      ) : (
        <>
          {state === "error" && <p style={{ margin: 0, fontSize: 16, color: "var(--accent)" }}>사진을 올리지 못했어요. 한 번만 다시 눌러주세요.</p>}
          <button className="btn" style={{ fontSize: 19, padding: "16px 0" }} onClick={() => input.current?.click()} disabled={state === "saving"}>
            {state === "saving" ? "올리는 중이에요…" : preview ? "다시 찍기" : "사진 찍기"}
          </button>
          {state !== "saving" && !preview && (
            <button className="link" style={{ fontSize: 17 }} onClick={() => setState("skip")}>오늘은 사진 없이 할게요</button>
          )}
        </>
      )}
      <input ref={input} type="file" accept="image/*" capture="user" hidden onChange={onPick} />
    </div>
  );
}

// 큰 사진은 긴 변 기준으로 줄여 jpg로 (휴대폰 사진 10MB → 수백 KB)
async function shrink(file: File, max: number): Promise<Blob> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = url; });
    const k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement("canvas");
    c.width = Math.round(img.naturalWidth * k);
    c.height = Math.round(img.naturalHeight * k);
    c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
    return await new Promise<Blob>((ok, no) => c.toBlob((b) => (b ? ok(b) : no(new Error("변환 실패"))), "image/jpeg", 0.86));
  } catch {
    return file;
  } finally {
    URL.revokeObjectURL(url);
  }
}
