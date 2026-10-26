"use client";
import { useEffect, useRef, useState } from "react";
import { browserClient } from "@/lib/supabaseBrowser";
import { Baby, Envelope, Mic, MomOnSofa } from "@/components/Illust";
import { koDate } from "@/lib/time";
import { josa } from "@/lib/korean";
import { mmss, useRecorder, type Kind } from "@/lib/useRecorder";

type Reaction = { about: string; text: string | null; audioUrl: string | null };
type Info = {
  text: string;
  lead: string | null;
  hint: string | null;
  format: Kind;
  answered: boolean;
  honorific: string;
  childName: string;
  unsealAt: string | null;
  childAudioUrl: string | null;
  photoUrl: string | null;
  reactions: Reaction[];
};
type Phase = "loading" | "error" | "ask" | "review" | "sending" | "thinking" | "host" | "done" | "later";

const MAX_TURNS = 2;

function splitLead(lead: string) {
  return lead.replace(/([.?!요])\s+/g, "$1\n").split("\n").map((x) => x.trim()).filter(Boolean);
} // 첫 대답 뒤 이어 말하기 최대 2번

export default function ParentPage({ params }: { params: { token: string } }) {
  const [info, setInfo] = useState<Info | null>(null);
  const [phase, setPhase] = useState<Phase>("loading");
  const [err, setErr] = useState("");
  const [unsealAt, setUnsealAt] = useState<string | null>(null);
  const [turn, setTurn] = useState(0);
  const [kind, setKind] = useState<Kind>("audio");
  const [asked, setAsked] = useState("");
  const [host, setHost] = useState<{ react: string; followup: string | null; video?: boolean; song?: boolean } | null>(null);
  const [ready, setReady] = useState(false);
  const r = useRecorder();
  const live = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    fetch(`/api/s/${params.token}`)
      .then((res) => res.json().then((j) => ({ ok: res.ok, j })))
      .then(({ ok, j }) => {
        if (!ok) throw new Error(j.error);
        setInfo(j);
        setUnsealAt(j.unsealAt);
        setKind(j.format);
        setAsked(j.text);
        setPhase(j.answered ? "done" : "ask");
        // 빌드업을 한 줄씩 천천히 보여준 뒤 질문과 버튼이 나온다 (시간여행)
        const n = j.lead ? splitLead(j.lead).length : 0;
        setTimeout(() => setReady(true), n ? n * 1700 + 1400 : 0);
      })
      .catch((e) => {
        setErr(e.message || "링크를 열 수 없어요");
        setPhase("error");
      });
  }, [params.token]);

  useEffect(() => {
    if (live.current && r.stream && kind === "video") {
      live.current.srcObject = r.stream;
      live.current.play().catch(() => {});
    }
  }, [r.stream, kind]);

  useEffect(() => {
    if (r.blob && !r.recording) setPhase("review");
  }, [r.blob, r.recording]);

  const limit = turn === 0 ? (kind === "video" ? 180 : 900) : kind === "video" ? 90 : 300;

  async function start() {
    setErr("");
    try {
      await r.start(kind, limit);
    } catch {
      setErr("마이크(카메라) 사용을 허용해 주셔야 해요. 화면 위쪽 알림에서 '허용'을 눌러주세요.");
    }
  }

  async function send() {
    if (!r.blob) return;
    const blob = r.blob;
    setPhase("sending");
    setErr("");
    try {
      const u = await fetch(`/api/s/${params.token}/upload-url`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mime: blob.type }),
      }).then((x) => x.json());
      if (!u.path) throw new Error(u.error);
      const { error } = await browserClient()
        .storage.from("vf-media")
        .uploadToSignedUrl(u.path, u.uploadToken, blob, { contentType: blob.type });
      if (error) throw error;
      const c = await fetch(`/api/s/${params.token}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: u.path, mime: blob.type, duration: r.sec, turn, asked, kind }),
      }).then((x) => x.json());
      if (!c.ok) throw new Error(c.error);
      setUnsealAt(c.unsealAt);
      r.reset();

      // 진행자 한마디 + 이어지는 질문
      setPhase("thinking");
      const h = await fetch(`/api/s/${params.token}/next`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answerId: c.answerId }),
      })
        .then((x) => x.json())
        .catch(() => ({ react: "말씀 잘 들었어요.", followup: null }));
      if (h.followup && turn < MAX_TURNS) {
        setHost(h);
        setPhase("host");
      } else {
        setHost(h);
        finish();
      }
    } catch {
      setErr("보내지 못했어요. 인터넷 연결을 확인하고 다시 눌러주세요.");
      setPhase("review");
    }
  }

  function continueTalk() {
    setReady(true);
    if (!host?.followup) return;
    setAsked(host.followup);
    setKind(host.video ? "video" : "audio");
    setTurn((t) => t + 1);
    setPhase("ask");
  }

  function finish() {
    fetch(`/api/s/${params.token}/finish`, { method: "POST" }).catch(() => {});
    setPhase("done");
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

  const c = info.childName;
  const isVideo = kind === "video";
  const toChild = unsealAt ? `${koDate(unsealAt)}에 ${c}에게 전해져요` : `${c}에게 바로 전해져요`;

  if (phase === "done")
    return (
      <main className="screen center" style={{ paddingTop: 100 }}>
        <Envelope />
        {host?.react && <p className="muted" style={{ margin: "32px 0 0", fontSize: 17 }}>{host.react}</p>}
        <h1 className="serif" style={{ margin: "14px 0 0", fontSize: 28 }}>오늘 이야기, 잘 담았어요.</h1>
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

  if (phase === "thinking")
    return (
      <main className="screen center" style={{ paddingTop: 140 }}>
        <span className="rec-dot pulse" />
        <p className="serif" style={{ margin: "28px 0 0", fontSize: 22, lineHeight: 1.6 }}>
          {info.honorific}의 이야기를
          <br />
          귀 기울여 듣고 있어요
        </p>
        <p className="small muted" style={{ marginTop: 14 }}>잠깐이면 돼요</p>
      </main>
    );

  if (phase === "host" && host)
    return (
      <main className="screen center" style={{ paddingTop: 90 }}>
        <p className="muted" style={{ margin: 0, fontSize: 18, lineHeight: 1.6 }}>{host.react}</p>
        <h1 className="serif q" style={{ marginTop: 26 }}>{host.followup}</h1>
        <div className="grow" style={{ minHeight: 28 }} />
        <button className="btn" onClick={continueTalk}>
          {host.video ? <span className="rec-dot" /> : <Mic />}
          {host.video ? "얼굴 보며 들려주기" : host.song ? "불러주기" : "하나 더 남기기"}
        </button>
        <button className="link" style={{ marginTop: 6 }} onClick={finish}>오늘은 여기까지 할게요</button>
      </main>
    );

  const first = turn === 0;
  return (
    <main className="screen center">
      {first && info.reactions.length > 0 && (
        <div className="card redpen" style={{ width: "100%", textAlign: "left", marginBottom: 22 }}>
          <div className="tiny" style={{ color: "var(--accent)", fontWeight: 700 }}>
            {josa(c, "이/가")} 보낸 답장 · &lsquo;{info.reactions[0].about}&rsquo; 이야기를 듣고
          </div>
          {info.reactions.map((x, i) => (
            <div key={i} style={{ marginTop: 8 }}>
              {x.text && <p className="hand" style={{ margin: 0 }}>{x.text}</p>}
              {x.audioUrl && <audio src={x.audioUrl} controls style={{ marginTop: 8 }} />}
            </div>
          ))}
        </div>
      )}

      {first ? (
        isVideo ? (
          <span className="pill">조금 특별한 질문이에요</span>
        ) : (
          <p className="small muted" style={{ margin: 0, fontWeight: 500 }}>{josa(c, "이/가")} 보낸 이번 주 질문</p>
        )
      ) : (
        <p className="small muted" style={{ margin: 0, fontWeight: 500 }}>조금만 더 들려주세요</p>
      )}

      {r.recording && isVideo ? (
        <video ref={live} className="preview" muted playsInline style={{ marginTop: 24 }} />
      ) : phase === "review" && r.blob ? (
        <div style={{ marginTop: 28, width: "100%" }}>
          {isVideo ? (
            <video src={URL.createObjectURL(r.blob)} controls playsInline style={{ aspectRatio: "3/4", background: "#0b1714" }} />
          ) : (
            <audio src={URL.createObjectURL(r.blob)} controls />
          )}
        </div>
      ) : first && info.photoUrl ? (
        <img src={info.photoUrl} alt="" className="photo" style={{ marginTop: 24 }} />
      ) : (
        <div style={{ marginTop: isVideo ? 20 : 32 }}>{isVideo ? <Baby /> : <MomOnSofa />}</div>
      )}

      {first && info.lead && phase === "ask" && !r.recording && (
        <div className="lead" style={{ marginTop: 26 }}>
          {splitLead(info.lead).map((line, i) => (
            <p key={i} style={{ animationDelay: `${0.3 + i * 1.7}s` }}>{line}</p>
          ))}
        </div>
      )}

      <h1
        className={`serif q${first && info.lead && phase === "ask" && !r.recording ? " reveal" : ""}`}
        style={{ marginTop: 22, animationDelay: info.lead ? `${0.3 + splitLead(info.lead).length * 1.7}s` : "0s" }}
      >
        {asked}
      </h1>

      {first && ready && info.childAudioUrl && phase === "ask" && !r.recording && (
        <div style={{ width: "100%", marginTop: 16 }}>
          <p className="small muted" style={{ margin: "0 0 6px" }}>{josa(c, "이/가")} 직접 물어봤어요</p>
          <audio src={info.childAudioUrl} controls />
        </div>
      )}

      {first && info.hint && phase === "ask" && ready && !r.recording && (
        <p className="small muted" style={{ margin: "12px 0 0", lineHeight: 1.6 }}>{info.hint}</p>
      )}

      {phase === "ask" && ready && !r.recording && !(first && (info.lead || info.hint)) && (
        <p className="muted" style={{ margin: "12px 0 0", fontSize: 16, lineHeight: 1.6 }}>
          {isVideo ? "얼굴을 보며 들려주세요. 가족만 볼 수 있어요." : "생각나는 대로, 편하게 말씀해 주세요."}
        </p>
      )}

      <div className="grow" style={{ minHeight: 28 }} />
      {err && <p className="err">{err}</p>}

      {phase === "ask" && !r.recording && !ready && (
        <button className="link" onClick={() => setReady(true)}>바로 대답할게요</button>
      )}

      {phase === "ask" && ready && !r.recording && (
        <>
          <button className="btn" onClick={start}>
            {isVideo ? <span className="rec-dot" /> : <Mic />}
            {isVideo ? "눌러서 녹화하기" : "눌러서 말하기"}
          </button>
          <p className="small muted" style={{ marginTop: 12 }}>
            {isVideo ? "영상" : "음성"} · 최대 {Math.round(limit / 60) || 1}분 · {toChild}
          </p>
          {first ? (
            <button className="link" onClick={later}>지금은 어려워요</button>
          ) : (
            <button className="link" onClick={finish}>오늘은 여기까지 할게요</button>
          )}
        </>
      )}

      {r.recording && (
        <>
          <p className="row" style={{ justifyContent: "center", fontSize: 20, fontWeight: 700, margin: "0 0 16px" }}>
            <span className="rec-dot pulse" /> {mmss(r.sec)}
            <span className="small muted" style={{ fontWeight: 400 }}>/ {mmss(limit)}</span>
          </p>
          <button className="btn" onClick={r.stop}>다 말했어요</button>
        </>
      )}

      {(phase === "review" || phase === "sending") && (
        <>
          <button className="btn" onClick={send} disabled={phase === "sending"}>
            {phase === "sending" ? "보내는 중이에요…" : `${c}에게 보내기`}
          </button>
          <button className="link" onClick={() => { r.reset(); setPhase("ask"); }} disabled={phase === "sending"}>
            다시 하기
          </button>
        </>
      )}
    </main>
  );
}
