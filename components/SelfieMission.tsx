"use client";
import { useEffect, useRef, useState } from "react";
import { browserClient } from "@/lib/supabaseBrowser";

// 이야기를 마친 부모님께: 지금 얼굴 한 장 → 이야기 잡지 표지
// 찍는 화면 위에 잡지 틀(제호·큰 이름)을 얹어서 "내가 표지에 나온다"를 찍는 순간 보여준다
// 첫 이야기면 '창간호 표지'로 크게, 그다음부터는 가볍게 권한다. 넘어가도 아무 일 없다
type Props = {
  token: string; isDemo: boolean; childName: string; honorific: string;
  coverName: string | null; first: boolean; hasCover: boolean;
};

export default function SelfieMission({ token, isDemo, childName, honorific, coverName, first, hasCover }: Props) {
  const [state, setState] = useState<"idle" | "camera" | "preview" | "saving" | "done" | "skip" | "error">(hasCover ? "done" : "idle");
  const [shot, setShot] = useState<Blob | null>(null);
  const [shotUrl, setShotUrl] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const name = coverName || honorific || "우리 엄마";

  if (state === "skip") return null;

  function keepShot(b: Blob) {
    setShot(b);
    setShotUrl((old) => { if (old) URL.revokeObjectURL(old); return URL.createObjectURL(b); });
    setState("preview");
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    try { keepShot(await coverCrop(f)); } catch { setState("error"); }
  }

  async function save() {
    if (!shot) return;
    setState("saving");
    try {
      if (!isDemo) {
        const u = await fetch(`/api/s/${token}/cover`, { method: "POST" }).then((x) => x.json());
        if (!u.path) throw new Error(u.error);
        const { error } = await browserClient().storage.from("vf-media").uploadToSignedUrl(u.path, u.uploadToken, shot, { contentType: "image/jpeg" });
        if (error) throw error;
        const s = await fetch(`/api/s/${token}/cover`, {
          method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ path: u.path }),
        }).then((x) => x.json());
        if (!s.ok) throw new Error(s.error);
      }
      setState("done");
    } catch {
      setState("error");
    }
  }

  // 카메라 화면 (전체 화면)
  if (state === "camera")
    return <Camera name={name} first={first} onShot={keepShot} onFallback={() => { setState("idle"); fileInput.current?.click(); }} onClose={() => setState("idle")} />;

  return (
    <div className="card stack" style={{ gap: 16, textAlign: "left", width: "100%", marginTop: 28, padding: "24px 20px", border: "2px solid var(--accent)" }}>
      <span style={{ fontSize: 16, fontWeight: 700, color: "var(--accent)", letterSpacing: "0.04em" }}>
        {first ? "마지막으로, 창간호 표지" : "마지막으로, 오늘의 표지"}
      </span>

      {shotUrl && (state === "preview" || state === "saving" || state === "done" || state === "error") ? (
        <div style={{ position: "relative", width: "100%", aspectRatio: "3/4", overflow: "hidden", borderRadius: 4 }}>
          <img src={shotUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
          <CoverFrame name={name} first={first} />
        </div>
      ) : state !== "done" ? (
        <p className="serif" style={{ margin: 0, fontSize: 23, lineHeight: 1.6, wordBreak: "keep-all" }}>
          {first ? <>{name} 님의 이야기 잡지가 오늘 시작돼요.<br />표지에 실을 얼굴을 한 장 찍어주세요.</> : <>오늘 이야기의 표지로<br />지금 얼굴을 한 장 남겨주세요.</>}
        </p>
      ) : null}

      {state === "done" ? (
        <p style={{ margin: 0, fontSize: 19, lineHeight: 1.6 }}>
          {hasCover && !shotUrl ? "오늘 표지는 이미 실었어요." : `표지로 실었어요. ${childName}에게 잡지로 전해져요.`}
        </p>
      ) : state === "preview" || state === "saving" || (state === "error" && shot) ? (
        <>
          {state === "error" && <p style={{ margin: 0, fontSize: 17, color: "var(--accent)" }}>사진을 올리지 못했어요. 한 번만 다시 눌러주세요.</p>}
          <button className="btn" style={{ fontSize: 20, padding: "17px 0" }} onClick={save} disabled={state === "saving"}>
            {state === "saving" ? "싣는 중이에요…" : "이 사진으로 할게요"}
          </button>
          {state !== "saving" && <button className="link" style={{ fontSize: 18 }} onClick={() => setState("camera")}>다시 찍기</button>}
        </>
      ) : (
        <>
          {state === "error" && <p style={{ margin: 0, fontSize: 17, color: "var(--accent)" }}>카메라를 열지 못했어요. 다시 눌러주세요.</p>}
          <button className="btn" style={{ fontSize: 20, padding: "17px 0" }} onClick={() => setState("camera")}>표지 사진 찍기</button>
          <button className="link" style={{ fontSize: 17 }} onClick={() => setState("skip")}>오늘은 사진 없이 할게요</button>
        </>
      )}
      <input ref={fileInput} type="file" accept="image/*" capture="user" hidden onChange={onFile} />
    </div>
  );
}

// 잡지 틀: 사진 위에 제호·큰 이름·창간호 표시 (찍는 화면과 결과 미리보기에 똑같이)
function CoverFrame({ name, first, guide }: { name: string; first: boolean; guide?: boolean }) {
  const big = name.length <= 3 ? 64 : name.length <= 5 ? 50 : 38;
  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none", color: "#fff", textShadow: "0 1px 8px rgba(0,0,0,.45)" }}>
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg,rgba(0,0,0,.35) 0%,rgba(0,0,0,0) 28%,rgba(0,0,0,0) 70%,rgba(0,0,0,.4) 100%)" }} />
      <div style={{ position: "absolute", top: 14, left: 14, right: 14, display: "flex", justifyContent: "space-between", alignItems: "baseline", borderBottom: "1px solid rgba(255,255,255,.7)", paddingBottom: 7 }}>
        <b style={{ fontFamily: "var(--serif)", fontSize: 15, letterSpacing: ".2em" }}>우리집 레코드</b>
        <span style={{ fontFamily: "Georgia,serif", fontSize: 11, letterSpacing: ".14em" }}>OUR HOUSE RECORD</span>
      </div>
      <div style={{ position: "absolute", top: 54, right: 12, writingMode: "vertical-rl", fontFamily: "var(--serif)", fontWeight: 700, fontSize: big, lineHeight: 1, letterSpacing: ".04em" }}>{name}</div>
      {first && <span style={{ position: "absolute", top: 56, left: 14, background: "#6A2232", fontSize: 12, fontWeight: 700, letterSpacing: ".14em", padding: "5px 9px", textShadow: "none" }}>창간호</span>}
      {guide && (
        <div style={{ position: "absolute", left: "50%", top: "50%", width: "54%", height: "48%", transform: "translate(-58%,-42%)", border: "2px dashed rgba(255,255,255,.8)", borderRadius: "50%" }} />
      )}
      {first && <div style={{ position: "absolute", right: 14, bottom: 12, fontFamily: "Georgia,serif", fontSize: 40, lineHeight: 0.9 }}>01</div>}
    </div>
  );
}

// 전면 카메라 + 잡지 틀. 안 열리면 휴대폰 기본 카메라(파일 선택)로 넘어간다
function Camera({ name, first, onShot, onFallback, onClose }: { name: string; first: boolean; onShot: (b: Blob) => void; onFallback: () => void; onClose: () => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let dead = false;
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: { ideal: 1440 }, height: { ideal: 1920 } }, audio: false });
        if (dead) { stream.getTracks().forEach((t) => t.stop()); return; }
        if (video.current) { video.current.srcObject = stream; await video.current.play().catch(() => {}); }
        setReady(true);
      } catch {
        onFallback();
      }
    })();
    return () => { dead = true; stream?.getTracks().forEach((t) => t.stop()); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function take() {
    const v = video.current;
    if (!v || !v.videoWidth) return;
    const b = await drawCover(v, v.videoWidth, v.videoHeight, true);
    onShot(b);
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50, background: "#111", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 16, gap: 18 }}>
      <p style={{ margin: 0, color: "#fff", fontSize: 19, lineHeight: 1.5, textAlign: "center", wordBreak: "keep-all" }}>
        얼굴을 점선 안에 맞춰주세요
        <br />
        <span style={{ fontSize: 16, opacity: 0.75 }}>창가처럼 밝은 쪽을 보면 더 잘 나와요</span>
      </p>
      <div style={{ position: "relative", width: "min(100%, 62vh)", aspectRatio: "3/4", overflow: "hidden", borderRadius: 4, background: "#222" }}>
        <video ref={video} playsInline muted style={{ width: "100%", height: "100%", objectFit: "cover", transform: "scaleX(-1)", display: "block" }} />
        <CoverFrame name={name} first={first} guide />
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "min(100%, 62vh)" }}>
        <button onClick={onClose} style={{ background: "none", border: 0, color: "#fff", fontSize: 18, padding: 12, width: 80, textAlign: "left" }}>취소</button>
        <button
          onClick={take} disabled={!ready} aria-label="찍기"
          style={{ width: 78, height: 78, borderRadius: "50%", border: "5px solid #fff", background: ready ? "#fff" : "#666", boxShadow: "inset 0 0 0 4px #111" }}
        />
        <span style={{ width: 80 }} />
      </div>
    </div>
  );
}

// 3:4로 가운데를 잘라 1200×1600 jpg로. 표지답게 밝기·대비를 살짝 올린다
async function drawCover(src: CanvasImageSource, w: number, h: number, mirror: boolean): Promise<Blob> {
  const W = 1200, H = 1600;
  const r = 3 / 4;
  let sw = w, sh = h;
  if (w / h > r) sw = h * r; else sh = w / r;
  const sx = (w - sw) / 2, sy = (h - sh) / 2;
  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  const ctx = c.getContext("2d")!;
  try { (ctx as any).filter = "brightness(1.05) contrast(1.06) saturate(1.05)"; } catch {}
  if (mirror) { ctx.translate(W, 0); ctx.scale(-1, 1); }
  ctx.drawImage(src, sx, sy, sw, sh, 0, 0, W, H);
  return await new Promise<Blob>((ok, no) => c.toBlob((b) => (b ? ok(b) : no(new Error("변환 실패"))), "image/jpeg", 0.88));
}

async function coverCrop(file: File): Promise<Blob> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = url; });
    return await drawCover(img, img.naturalWidth, img.naturalHeight, false);
  } finally {
    URL.revokeObjectURL(url);
  }
}
