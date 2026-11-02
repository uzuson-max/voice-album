"use client";
import { useEffect, useRef, useState } from "react";
import { browserClient } from "@/lib/supabaseBrowser";
import { Baby, Envelope, LP, Mic, MomOnSofa } from "@/components/Illust";
import { duckAmbient, startAmbient, stopAmbient, toggleMute } from "@/lib/ambient";
import { koDate } from "@/lib/time";
import { josa } from "@/lib/korean";
import { mmss, useRecorder, type Kind } from "@/lib/useRecorder";
import SelfieMission from "@/components/SelfieMission";
import SampleStory from "@/components/SampleStory";
import HostSquirrel from "@/components/HostSquirrel";
import { useHost } from "@/lib/useHost";

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
  next?: { day: string; lead: string | null } | null;
  firstEver?: boolean;
  hasCover?: boolean;
  coverName?: string | null;
  steps?: string[] | null; // 3단계(장면 → 사람 → 마음)
  encore?: string | null;
  demo?: boolean;
};
type Phase = "loading" | "error" | "wrong" | "welcome" | "intro" | "ask" | "review" | "sending" | "thinking" | "host" | "done" | "later";

const MAX_TURNS = 2;

// 배경 음악: public/ambient/bgm.mp3 (Pixabay 잔잔한 피아노). false로 바꾸면 음악 없이 시작
const MUSIC = true;

// 장면은 한 문장씩, 이 간격(초)으로 천천히 떠오른다
const BEAT = 2.8;

// 한 글자짜리 낱말(해 질 녘, 다 버거운…)은 뒤 낱말과 붙여서 그 사이에서 줄이 바뀌지 않게
function glue(t: string) {
  const w = t.split(" ");
  return w.reduce((acc, cur, i) => (i === 0 ? cur : acc + (w[i - 1].length === 1 ? "\u00a0" : " ") + cur), "");
}

function splitLead(lead: string) {
  return lead.replace(/([.?!요])\s+/g, "$1\n").split("\n").map((x) => x.trim().replace(/\.$/, "")).filter(Boolean).map(glue);
} // 첫 대답 뒤 이어 말하기 최대 2번

export default function ParentPage({ params }: { params: { token: string } }) {
  const isDemo = params.token === "demo";
  const log = (kind: string, detail?: any) => {
    if (isDemo) return;
    try {
      const body = JSON.stringify({ kind, detail });
      if (kind === "leave" && navigator.sendBeacon) navigator.sendBeacon(`/api/s/${params.token}/event`, new Blob([body], { type: "application/json" }));
      else fetch(`/api/s/${params.token}/event`, { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true }).catch(() => {});
    } catch {}
  };
  const [info, setInfo] = useState<Info | null>(null);
  const [phase, setPhase] = useState<Phase>("loading");
  const [err, setErr] = useState("");
  const [unsealAt, setUnsealAt] = useState<string | null>(null);
  const [turn, setTurn] = useState(0);
  const [kind, setKind] = useState<Kind>("audio");
  const [asked, setAsked] = useState("");
  const [host, setHost] = useState<{ react: string; followup: string | null; video?: boolean; song?: boolean } | null>(null);
  const [ready, setReady] = useState(false);
  const [demoClips, setDemoClips] = useState<{ url: string; video: boolean }[]>([]); // 체험 녹음: 이 화면 안에서만 다시 듣고 저장하지 않음
  const r = useRecorder();
  const mc = useHost(params.token); // 다람쥐 진행자
  const live = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    fetch(`/api/s/${params.token}${isDemo ? window.location.search : ""}`)
      .then((res) => res.json().then((j) => ({ ok: res.ok, j })))
      .then(({ ok, j }) => {
        if (!ok) throw new Error(j.error);
        setInfo(j);
        setUnsealAt(j.unsealAt);
        setKind(j.format);
        setAsked(j.steps?.length > 1 ? j.steps[0] : j.text);
        setPhase(j.answered ? "done" : j.firstEver ? "welcome" : "intro");
        log("open", { answered: !!j.answered });
        // 빌드업을 한 줄씩 천천히 보여준 뒤 질문과 버튼이 나온다 (시간여행)

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

  // '다 말했어요' 한 번이면 끝: 다시 듣기·보내기 누름 없이 바로 보낸다 (60~70대, 누르는 건 최소로)
  const sentBlob = useRef<Blob | null>(null);
  useEffect(() => {
    if (r.blob && !r.recording && sentBlob.current !== r.blob) {
      sentBlob.current = r.blob;
      send();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [r.blob, r.recording]);

  // 녹음이 끊겼는데 담긴 게 없으면: 보내기 대신 다시 녹음하도록
  useEffect(() => {
    if (r.failed && !r.recording && !r.blob) {
      setErr("녹음이 중간에 끊겨서 저장되지 않았어요. 한 번만 다시 눌러주세요.");
      setPhase("ask");
    } else if (r.failed && r.blob) {
      setErr("녹음이 중간에 끊겼어요. 여기까지 담긴 걸 보내거나, 다시 녹음할 수 있어요.");
    }
  }, [r.failed, r.recording, r.blob]);

  // 녹음하는 동안은 음악을 완전히 내려 목소리에 섞이지 않게
  // 녹음 시작·끝·실패 기록
  const recRef = useRef(false);
  useEffect(() => {
    if (r.recording && !recRef.current) log("rec_start", { turn, kind });
    if (!r.recording && recRef.current) log("rec_stop", { turn, sec: r.sec });
    recRef.current = r.recording;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [r.recording]);
  useEffect(() => {
    if (r.failed) log("rec_fail", { turn, sec: r.sec, hasBlob: !!r.blob });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [r.failed]);
  // 창을 닫거나 다른 앱으로 갈 때 마지막 단계
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  useEffect(() => {
    const onHide = () => { if (document.visibilityState === "hidden") log("leave", { phase: phaseRef.current }); };
    document.addEventListener("visibilitychange", onHide);
    return () => document.removeEventListener("visibilitychange", onHide);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 녹음하는 동안에도 음악은 끄지 않고 목소리 밑으로 작게 깔아둔다 (bgm)
  useEffect(() => {
    if (r.recording) duckAmbient();
  }, [r.recording]);

  const [soundOff, setSoundOff] = useState(false);
  // 첫 초대장: 휴대폰은 한 번 눌러야 소리를 허락해서, '초대장 열어보기'를 누르는 순간 음악을 켜고 멘트가 떠오른다
  const [opened, setOpened] = useState(false);
  // 녹음을 마치면: ① 표지 사진(잡지 틀) → ② '오늘 이야기, 잘 담았어요' + 다음 이야기 → (체험만) ③ 버튼을 눌러야 예시 잡지
  const [coverDone, setCoverDone] = useState(false);
  const [tour, setTour] = useState(false);
  const tourRef = useRef<HTMLDivElement | null>(null);
  // 첫 초대장 확인: "네, 맞아요" / "제가 아니에요"
  function confirmMe(wrong: boolean) {
    if (isDemo) return;
    fetch(`/api/s/${params.token}/confirm`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ wrong }), keepalive: true }).catch(() => {});
  }
  function openInvite() {
    if (MUSIC) startAmbient();
    mc.unlock();
    log("invite_open");
    setOpened(true);
  }

  // "이야기 시작하기": 이 누름이 있어야 휴대폰이 소리를 허락한다
  function begin(withSound: boolean) {
    if (MUSIC && withSound) startAmbient(); // 초대장에서 이미 켜졌으면 그대로 이어서 흐른다
    if (!withSound) stopAmbient(1.5); // 초대장에서 켜진 음악도 끈다
    mc.unlock(); // 이 누름 안에서 소리 재생 허락
    log(withSound ? "begin" : "begin_silent");
    setPhase("ask");
    // 음악이 몇 초 흐르며 장면이 떠오르고 → 음악이 잦아들면 다람쥐가 장면과 질문을 읽고 → 마이크를 넘기면 녹음 버튼
    const q = steps ? steps[0] : info?.steps?.[0] || info?.text;
    // 다 읽고 나면 버튼 없이 바로 녹음이 시작된다 — 다람쥐가 먼저 말로 알려준다
    const cue = kind === "video" ? "지금부터 녹화할게요. 편하게 말씀해 주세요" : "지금부터 녹음할게요. 편하게 말씀해 주세요";
    const line = [info?.lead, q, cue].filter(Boolean).join("\n");
    mc.prepare(line); // 음악이 흐르는 동안 목소리를 미리 받아둔다
    const go = () => mc.say(line, (spoken) => { setReady(true); if (spoken) start(); }); // 목소리가 안 나왔으면 버튼으로
    if (!MUSIC) setTimeout(go, 1500); // 장면 첫 줄이 떠오를 시간만 주고 바로 읽는다
    else if (withSound) {
      // 피아노가 3초 먼저 흐르고, 다람쥐 목소리 밑에 작게 그대로 깔린다
      setTimeout(go, 3000);
    } else go();
  }

  // 자녀 체험(demo)은 '어떻게 오는지' 느끼면 충분 — 3단계 대신 첫 이야기 하나만, 30초면 저절로 끝난다
  const DEMO_SEC = 30;
  const DEMO_VIDEO_SEC = 20; // 체험 2번째: 짧은 영상 한마디
  const demoSec = kind === "video" ? DEMO_VIDEO_SEC : DEMO_SEC;
  const steps = !isDemo && info?.steps && info.steps.length > 1 ? info.steps : null;
  const inStep = !!steps && turn < steps.length; // 3단계 중
  const lastStep = !!steps && turn === steps.length - 1;
  const GUIDE = 120; // 단계마다 권장 2분 (끊지는 않는다)
  const limit = isDemo ? demoSec : inStep ? (kind === "video" ? 180 : 600) : turn === 0 ? (kind === "video" ? 180 : 900) : kind === "video" ? 90 : 300;

  async function start(k?: Kind) {
    setErr("");
    duckAmbient(); // 녹음하는 동안은 작게
    mc.listen();
    const kk = k || kind;
    try {
      await r.start(kk, isDemo ? (kk === "video" ? DEMO_VIDEO_SEC : DEMO_SEC) : limit);
    } catch {
      setErr("마이크(카메라) 사용을 허용해 주셔야 해요. 화면 위쪽 알림에서 '허용'을 눌러주세요.");
    }
  }

  async function send() {
    if (!r.blob || !r.blob.size) {
      setErr("녹음이 비어 있어요. 다시 녹음해 주세요.");
      setPhase("ask");
      return;
    }
    const blob = r.blob;
    if (isDemo) {
      setDemoClips((xs) => [...xs, { url: URL.createObjectURL(blob), video: kind === "video" }]);
      r.reset();
      // 체험: 목소리 다음엔 짧은 영상 한마디 — 영상으로도 남는다는 걸 직접 느끼게
      if (!steps && kind === "audio" && demoClips.length === 0) {
        const vq = "이번엔 영상으로 남겨볼게요\n카메라를 보며 짧게 한마디 해주세요";
        setKind("video");
        setAsked(vq);
        setTurn(1);
        setReady(false);
        setPhase("ask");
        mc.say(`${vq}\n지금부터 녹화할게요`, (spoken) => { setReady(true); if (spoken) start("video"); });
        return;
      }
      // 체험도 3단계를 그대로 이어서 보여준다
      if (steps && turn < steps.length - 1) {
        const nq = steps[turn + 1];
        setAsked(nq);
        setTurn((t) => t + 1);
        setReady(false);
        setPhase("ask");
        mc.say(`네, 잘 들었어요.\n${nq}`, (spoken) => { setReady(true); if (spoken) start(); });
        return;
      }
      mc.stop();
      setHost({ react: "말씀 잘 들었어요.", followup: null });
      setPhase("done");
      return;
    }
    log("send", { turn, sec: r.sec, bytes: blob.size });
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
      if (c.empty) {
        setErr("녹음이 제대로 올라가지 않았어요. 한 번만 다시 녹음해 주세요.");
        r.reset();
        setPhase("ask");
        return;
      }
      if (!c.ok) throw new Error(c.error);
      setUnsealAt(c.unsealAt);
      log("sent", { turn });
      r.reset();

      // 3단계: AI 한마디(최대 9초 기다림) 뒤 다음 단계 질문을 다람쥐가 읽는다
      if (steps && turn < steps.length) {
        setPhase("thinking");
        const fallback = { react: "네, 잘 들었어요." };
        const h: any = await Promise.race([
          fetch(`/api/s/${params.token}/next`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ answerId: c.answerId }),
          }).then((x) => x.json()).catch(() => fallback),
          new Promise((res) => setTimeout(() => res(fallback), 9000)),
        ]);
        const react = h?.react || fallback.react;
        if (turn < steps.length - 1) {
          const nq = steps[turn + 1];
          setAsked(nq);
          setTurn((t) => t + 1);
          setReady(false);
          setPhase("ask");
          mc.say(`${react}\n${nq}`, (spoken) => { setReady(true); if (spoken) start(); }); // 읽고 나면 녹음이 저절로 시작
        } else if (info?.encore) {
          setHost({ react, followup: info.encore, song: /노래|자장가/.test(info.encore) });
          setPhase("host");
          mc.say(`${react}\n${info.encore}`);
        } else {
          setHost({ react, followup: null });
          finish();
        }
        return;
      }

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
        mc.say(`${h.react || ""} ${h.followup}`);
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
    mc.listen();
    if (!host?.followup) return;
    setAsked(host.followup);
    setKind(host.video ? "video" : "audio");
    setTurn((t) => t + 1);
    setPhase("ask");
  }

  function finish() {
    mc.stop();
    stopAmbient(5);
    log("finish", { turn });
    if (!isDemo) fetch(`/api/s/${params.token}/finish`, { method: "POST" }).catch(() => {});
    setPhase("done");
  }

  async function later() {
    log("later");
    mc.stop();
    if (!isDemo) await fetch(`/api/s/${params.token}/later`, { method: "POST" }).catch(() => {});
    setPhase("later");
  }

  if (phase === "loading") return <main className="screen center foil"><p className="muted">잠시만요…</p></main>;
  if (phase === "error" || !info)
    return (
      <main className="screen center foil">
        <div className="grow" />
        <p className="serif q">{err || "링크를 열 수 없어요"}</p>
        <div className="grow" />
      </main>
    );

  const c = info.childName;
  const isVideo = kind === "video";
  const toChild = `${c}에게 바로 전해져요`; // 이야기 열리는 날 기능은 뺐음

  if (phase === "welcome") {
    const lines = [
      `${josa(c, "이/가")} 보낸 초대장이에요`,
      `앞으로 12번, ${info.honorific}의 이야기를\n듣고 싶대요`,
      "한 번에 10분, 말로만 하시면 돼요",
      "오늘부터 남기는 이야기는\n자녀들과 평생 나눌 소중한 기억이 될 거예요",
      `${c} ${info.honorific} 맞으시죠?`,
    ];
    return (
      <main className="screen center foil boxed" style={{ paddingTop: opened ? 96 : 40 }}>
        {opened && <LP size={92} className="intro-lp" />}
        {opened && <p className="tiny muted" style={{ margin: "28px 0 0", letterSpacing: "0.12em" }}>우리집 레코드</p>}
        {!opened ? (
          <>
            <div className="grow" />
            {/* 봉인된 초대장 카드: 금박 이중 테두리 + 위에 걸친 LP 봉인 */}
            <div
              style={{
                position: "relative",
                width: "100%",
                maxWidth: 330,
                margin: "0 auto",
                padding: "62px 26px 34px",
                borderRadius: 18,
                background: "linear-gradient(160deg, #F5F0E8 0%, #F5F0E8 55%, #F5F0E8 100%)",
                border: "1px solid rgba(181,101,58,0.55)",
                boxShadow: "inset 0 0 0 6px #F5F0E8, inset 0 0 0 7px rgba(181,101,58,0.35), 0 18px 40px -16px rgba(47,43,40,0.22), inset 0 1px 0 rgba(255,255,255,0)",
                animation: "rise 1.2s ease forwards",
              }}
            >
              <div style={{ position: "absolute", top: -40, left: "50%", transform: "translateX(-50%)", filter: "drop-shadow(0 6px 10px rgba(47,43,40,0.2))" }}>
                <LP size={80} className="intro-lp" />
              </div>
              <p style={{ margin: 0, fontSize: 12, letterSpacing: "0.32em", color: "var(--gold-hi)" }}>INVITATION</p>
              <p className="serif" style={{ margin: "18px 0 0", fontSize: 25, lineHeight: 1.55 }}>
                {josa(c, "이/가")} 보낸
                <br />
                초대장이 도착했어요
              </p>
              <div style={{ width: 44, height: 1, margin: "22px auto", background: "linear-gradient(90deg, transparent, var(--gold-hi), transparent)" }} />
              <p className="muted" style={{ margin: 0, fontSize: 16, lineHeight: 1.7 }}>
                소리를 켜고 열어주세요
              </p>
            </div>
            <button className="btn" style={{ marginTop: 30 }} onClick={openInvite}>초대장 열어보기</button>
            <p className="tiny muted" style={{ margin: "14px 0 0", letterSpacing: "0.12em" }}>우리집 레코드</p>
            <div className="grow" />
          </>
        ) : (
        <>
        <div className="lead" style={{ marginTop: 26 }}>
          {lines.map((line, i) => (
            <p key={i} className="serif" style={{ fontSize: i === 0 || i === lines.length - 1 ? 24 : 19, whiteSpace: "pre-line", animation: `rise 1.6s ease ${0.4 + i * 1.6}s forwards` }}>
              {line}
            </p>
          ))}
        </div>
        <div className="grow" />
        <button
          className="btn"
          style={{ opacity: 0, animation: `rise 1.2s ease ${0.4 + lines.length * 1.6}s forwards` }}
          onClick={() => { log("welcome"); confirmMe(false); begin(true); }} // 첫 링크는 안내 화면을 한 번 더 거치지 않고 바로 질문으로
        >
          네, 맞아요 · 시작할게요
        </button>
        <button
          className="link"
          style={{ marginTop: 6, opacity: 0, animation: `rise 1.2s ease ${0.4 + lines.length * 1.6}s forwards` }}
          onClick={() => { if (confirm(`${c} ${josa(info.honorific, "이/가")} 아니신가요?\n누르시면 이 번호로는 더 문자가 가지 않아요`)) { confirmMe(true); stopAmbient(1); setPhase("wrong"); } }}
        >
          제가 아니에요
        </button>
        </>
        )}
      </main>
    );
  }

  if (phase === "wrong")
    return (
      <main className="screen center foil">
        <div className="grow" />
        <p className="serif q">알려주셔서 고마워요<br />이 번호로는 더 문자가 가지 않아요</p>
        <div className="grow" />
      </main>
    );

  if (phase === "intro")
    return (
      <main className="screen center foil boxed" style={{ paddingTop: 120 }}>
        <LP size={92} className="intro-lp" />
        <p className="tiny muted" style={{ margin: "28px 0 0", letterSpacing: "0.12em" }}>우리집 레코드</p>
        <h1 className="serif" style={{ margin: "14px 0 0", fontSize: 26, lineHeight: 1.5 }}>
          {josa(info.childName, "이/가")} 보낸
          <br />
          이번 주 질문이 도착했어요
        </h1>
        <p className="muted" style={{ margin: "18px 0 0", fontSize: 16, lineHeight: 1.7 }}>
          조용한 곳에서 소리를 켜고 들어주세요
          <br />
          {MUSIC ? "잔잔한 음악과 함께 천천히 시작해요" : "질문은 읽어드려요, 천천히 들어주세요"}
        </p>
        <div style={{ height: 56 }} />
        <button className="btn" onClick={() => begin(true)}>이야기 시작하기</button>
        {MUSIC && <button className="link" style={{ marginTop: 6 }} onClick={() => begin(false)}>음악 없이 시작할게요</button>}
        <p className="tiny muted" style={{ margin: "10px 0 0", lineHeight: 1.6 }}>
          남겨주신 이야기는 가족에게만 전해져요 · <a href="/privacy">개인정보처리방침</a>
        </p>
        <div className="grow" />
      </main>
    );

  if (phase === "done") {
    const needCover = !coverDone && !info.hasCover && !info.answered;
    if (needCover)
      return (
        <main className="screen center foil" style={{ paddingTop: 56 }}>
          {host?.react && <p className="muted" style={{ margin: 0, fontSize: 17 }}>{host.react}</p>}
          <h1 className="serif" style={{ margin: "10px 0 0", fontSize: 26 }}>녹음을 마쳤어요</h1>
          {isDemo && demoClips.length > 0 && (
            <div style={{ width: "100%", marginTop: 20, textAlign: "left" }}>
              <p className="small muted" style={{ margin: "0 0 8px" }}>방금 남긴 목소리, 들어보세요</p>
              {demoClips[demoClips.length - 1].video
                ? <video src={demoClips[demoClips.length - 1].url} controls playsInline style={{ width: "100%", borderRadius: 12 }} />
                : <audio src={demoClips[demoClips.length - 1].url} controls style={{ width: "100%" }} />}
            </div>
          )}
          <SelfieMission
            token={params.token} isDemo={isDemo} childName={info.childName} honorific={info.honorific}
            coverName={info.coverName || null} first={!!info.firstEver} hasCover={!!info.hasCover}
            onDone={() => setCoverDone(true)}
          />
          <div className="grow" />
        </main>
      );
    return (
      <main className="screen center foil" style={{ paddingTop: 48 }}>
        {!tour && <div className="grow" />}
        <div style={{ transform: "scale(.72)", transformOrigin: "center top", marginBottom: -40 }}>
          <Envelope />
        </div>
        <h1 className="serif" style={{ margin: "10px 0 0", fontSize: 28 }}>오늘 이야기, 잘 담았어요</h1>
        <p className="muted" style={{ margin: "10px 0 0", fontSize: 18, lineHeight: 1.6 }}>
          {info.honorific}의 이야기는 {toChild}
        </p>
        {info.next ? (
          <div
            className="card stack"
            style={{ gap: 14, textAlign: "left", width: "100%", marginTop: 36, padding: "26px 22px", border: "2px solid var(--accent)" }}
          >
            <div className="row" style={{ gap: 10, alignItems: "baseline", flexWrap: "wrap" }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: "var(--accent)", letterSpacing: "0.04em" }}>다음 이야기</span>
              <span style={{ fontSize: 22, fontWeight: 800 }}>{info.next.day}</span>
              <span style={{ fontSize: 17 }}>에 문자로 와요</span>
            </div>
            {info.next.lead ? (
              <p className="serif" style={{ margin: 0, fontSize: 22, lineHeight: 1.6, whiteSpace: "pre-line", wordBreak: "keep-all" }}>
                {info.next.lead}
              </p>
            ) : (
              <p style={{ margin: 0, fontSize: 20, lineHeight: 1.6 }}>{info.childName}의 다음 질문이 준비돼 있어요.</p>
            )}
            <p style={{ margin: 0, fontSize: 17, lineHeight: 1.6, opacity: 0.8 }}>그날까지 천천히 떠올려 두세요.</p>
          </div>
        ) : (
          <p style={{ marginTop: 32, fontSize: 18 }}>{info.childName}에게 이야기가 잘 전해졌어요</p>
        )}
        {isDemo && !tour && (
          <div className="stack" style={{ marginTop: 56, alignItems: "center", gap: 10, width: "100%" }}>
            <p className="tiny muted" style={{ margin: 0, letterSpacing: "0.08em" }}>여기까지가 부모님이 보시는 화면이에요</p>
            <button
              className="btn"
              onClick={() => {
                setTour(true);
                setTimeout(() => tourRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
              }}
            >
              이 이야기가 어떻게 도착하는지 보기 ↓
            </button>
          </div>
        )}
        {isDemo && tour && (
          <div ref={tourRef} style={{ alignSelf: "stretch" }}>
            <SampleStory clips={demoClips} childName={info.childName} steps={steps} />
          </div>
        )}
        <div className="grow" />
      </main>
    );
  }

  if (phase === "later")
    return (
      <main className="screen center foil" style={{ paddingTop: 110 }}>
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
      <main className="screen center foil" style={{ paddingTop: 140 }}>
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
      <main className="screen center foil" style={{ paddingTop: mc.on ? 24 : 90 }}>
        {mc.on && <div style={{ marginBottom: 22, width: "100%" }}><HostSquirrel mode={mc.mode} /></div>}
        <p className="muted" style={{ margin: 0, fontSize: 18, lineHeight: 1.6 }}>{host.react}</p>
        <h1 className="serif q" style={{ marginTop: 26 }}>{splitLead(host.followup || "").map((line, i) => <span key={i} className="qline">{line}</span>)}</h1>
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
    <main className="screen center foil">
      {MUSIC && (
        <button
          className="sound-toggle"
          aria-label={soundOff ? "음악 켜기" : "음악 끄기"}
          onClick={() => setSoundOff(toggleMute())}
        >
          {soundOff ? "음악 켜기" : "음악 끄기"}
        </button>
      )}
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

      {inStep ? (
        <div className="row" style={{ gap: 14, justifyContent: "center" }}>
          {["장면", "사람", "마음"].slice(0, steps!.length).map((l, i) => (
            <span key={i} style={{ fontSize: 15, fontWeight: i === turn ? 700 : 400, color: i === turn ? "var(--accent)" : "var(--muted)", opacity: i > turn ? 0.6 : 1 }}>
              {i < turn ? "✓" : i + 1} {l}
            </span>
          ))}
        </div>
      ) : first ? (
        isVideo ? (
          <span className="pill">조금 특별한 질문이에요</span>
        ) : (
          <p className="small muted" style={{ margin: 0, fontWeight: 500 }}>{josa(c, "이/가")} 보낸 이번 주 질문</p>
        )
      ) : (
        <p className="small muted" style={{ margin: 0, fontWeight: 500 }}>조금만 더 들려주세요</p>
      )}

      {mc.on && phase !== "review" && phase !== "sending" && (
        <HostSquirrel mode={mc.mode} small={(r.recording && isVideo) || (first && !!info.photoUrl)} />
      )}

      {r.recording && isVideo ? (
        <video ref={live} className="preview" muted playsInline style={{ marginTop: 24 }} />
      ) : phase === "review" && r.blob ? (
        <div style={{ marginTop: 28, width: "100%" }}>
          {isVideo ? (
            <video src={URL.createObjectURL(r.blob)} controls playsInline style={{ aspectRatio: "3/4", background: "#2F2B28" }} />
          ) : (
            <audio src={URL.createObjectURL(r.blob)} controls />
          )}
        </div>
      ) : first && info.photoUrl ? (
        <img src={info.photoUrl} alt="" className="photo" style={{ marginTop: 24 }} />
      ) : mc.on ? null : (
        <div style={{ marginTop: isVideo ? 20 : 32 }}>{isVideo ? <Baby /> : <MomOnSofa />}</div>
      )}

      {first && info.lead && phase === "ask" && !r.recording && mc.mode !== "load" && (
        <div className="lead" style={{ marginTop: 26 }}>
          {splitLead(info.lead).map((line, i, arr) => (
            <p
              key={i}
              style={{
                ...(mc.on ? { fontSize: 17, marginBottom: 12 } : {}),
                animation:
                  `rise 1.6s ease ${0.6 + i * BEAT}s forwards` +
                  (i < arr.length - 1 ? `, dim 1.4s ease ${0.6 + (i + 1) * BEAT}s forwards` : ""),
              }}
            >
              {line}
            </p>
          ))}
        </div>
      )}

      {!(mc.mode === "load" && phase === "ask") && <h1
        className={`serif q${first && info.lead && phase === "ask" && !r.recording && !ready ? " reveal" : ""}`}
        style={{ marginTop: mc.on ? 14 : 22, ...(mc.on ? { fontSize: 22 } : {}), animationDelay: info.lead && !ready ? `${0.6 + splitLead(info.lead).length * BEAT + 0.2}s` : "0s" }}
      >
        {splitLead(asked).map((line, i) => (
          <span key={i} className="qline">{line}</span>
        ))}
      </h1>}

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
        <button className="link" onClick={() => { setReady(true); mc.listen(); }}>바로 대답할게요</button>
      )}

      {phase === "ask" && ready && !r.recording && (
        <>
          <button className="btn" onClick={() => start()}>
            {isVideo ? <span className="rec-dot" /> : <Mic />}
            {isVideo ? "눌러서 녹화하기" : "눌러서 말하기"}
          </button>
          <p className="small muted" style={{ marginTop: 12 }}>
            {isDemo ? "체험 녹음은 저장되지 않아요" : <>{isVideo ? "영상" : "음성"} · 최대 {Math.round(limit / 60) || 1}분 · {toChild}</>}
          </p>
          {first ? (
            <button className="link" onClick={later}>지금은 어려워요</button>
          ) : (
            <button className="link" onClick={finish}>오늘은 여기까지 할게요</button>
          )}
        </>
      )}

      {r.recording && inStep && (
        <div style={{ width: "100%", margin: "0 0 14px" }}>
          <div style={{ height: 6, borderRadius: 3, background: "#D6CDBF", overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${Math.min(100, (r.sec / GUIDE) * 100)}%`, background: "var(--sage)", transition: "width 1s linear" }} />
          </div>
          <p className="small muted" style={{ margin: "8px 0 0", lineHeight: 1.5 }}>
            {r.sec < GUIDE
              ? lastStep ? "천천히 하셔도 돼요 · 마지막 이야기예요" : `천천히 하셔도 돼요 · 이야기 ${steps!.length - turn - 1}개가 더 남았어요`
              : lastStep ? "충분히 들었어요. 다 하셨으면 '다 말했어요'를 눌러주세요" : "충분히 들었어요. 다 하셨으면 '다 말했어요'를 눌러 다음 이야기로 가요"}
          </p>
        </div>
      )}

      {r.recording && isDemo && (
        <div style={{ width: "100%", margin: "0 0 14px" }}>
          <div style={{ height: 6, borderRadius: 3, background: "#D6CDBF", overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${Math.min(100, (r.sec / demoSec) * 100)}%`, background: "var(--sage)", transition: "width 1s linear" }} />
          </div>
          <p className="small muted" style={{ margin: "8px 0 0", lineHeight: 1.5 }}>{`체험은 ${demoSec}초면 저절로 끝나요 · 실제로는 부모님이 편하게 10분 남짓 이야기하세요`}</p>
        </div>
      )}

      {r.recording && (
        <>
          <p className="row" style={{ justifyContent: "center", fontSize: 20, fontWeight: 700, margin: "0 0 16px" }}>
            <span className="rec-dot pulse" /> 녹음 중이에요 · {mmss(r.sec)}
            <span className="small muted" style={{ fontWeight: 400 }}>/ {mmss(limit)}</span>
          </p>
          <button className="btn" onClick={r.stop}>다 말했어요</button>
        </>
      )}

      {(phase === "review" || phase === "sending") && (
        <>
          <button className="btn" onClick={send} disabled={phase === "sending"}>
            {phase === "sending" ? "보내는 중이에요…" : inStep && !lastStep ? "보내고 다음 이야기로" : `${c}에게 보내기`}
          </button>
          <button className="link" onClick={() => { r.reset(); setPhase("ask"); }} disabled={phase === "sending"}>
            다시 하기
          </button>
        </>
      )}
    </main>
  );
}
