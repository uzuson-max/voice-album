"use client";
// 결제 전 공개 페이지 /meet
// 흐름: 부모님 나이 고르기 → 직장 동료 숫자 → 친한 친구 숫자 → 부모님 숫자가 화면 전체를 덮는다
// 화면을 누르면 바로 마지막 장면으로 넘어간다. 소리는 '시작'을 누른 뒤부터 난다(브라우저 정책).
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

const FREQ: [number, string][] = [[24, "한 달 2번"], [12, "한 달 1번"], [6, "두 달 1번"], [4, "세 달 1번"], [2, "명절에만"]];
const WORK_PER_YEAR = 240;   // 주 5일
const FRIEND_PER_YEAR = 24;  // 한 달 2번
type Stage = "intro" | "work" | "friend" | "parent";

/* ---------- 소리: 파일 없이 브라우저에서 만든다 (아주 작게) ---------- */
function useSound() {
  const ctx = useRef<AudioContext | null>(null);
  const on = useRef(true);
  const init = () => {
    try {
      const C = window.AudioContext || (window as any).webkitAudioContext;
      if (!C) return;
      ctx.current = ctx.current ?? new C();
      void ctx.current.resume();
    } catch {}
  };
  const tone = (freq: number, dur: number, gain: number, type: OscillatorType = "sine", delay = 0) => {
    try {
      const c = ctx.current;
      if (!c || !on.current) return;
      const t = c.currentTime + delay;
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = type;
      o.frequency.setValueAtTime(freq, t);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(gain, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(c.destination);
      o.start(t);
      o.stop(t + dur + 0.05);
    } catch {}
  };
  return {
    init,
    setOn: (v: boolean) => { on.current = v; },
    tickWork: () => tone(900, 0.04, 0.05, "triangle"),
    tickFriend: () => tone(620, 0.06, 0.07, "triangle"),
    swell: () => { tone(98, 2.4, 0.16, "sine"); tone(147, 2.4, 0.08, "sine"); },
    bell: () => { tone(523, 2.2, 0.12, "sine"); tone(784, 2.6, 0.08, "sine", 0.02); tone(1046, 2.0, 0.04, "sine", 0.04); },
  };
}

/* ---------- 숫자가 올라가는 효과 ---------- */
function useCount(target: number, run: boolean, ms: number, delay: number, onTick?: () => void) {
  const [n, setN] = useState(0);
  const [done, setDone] = useState(false);
  const tick = useRef(onTick);
  tick.current = onTick;
  useEffect(() => {
    if (!run) { setN(0); setDone(false); return; }
    let raf = 0, t0 = 0, last = 0, dead = false;
    const to = setTimeout(() => {
      const step = (t: number) => {
        if (dead) return;
        if (!t0) t0 = t;
        const p = Math.min(1, (t - t0) / (ms || 1));
        setN(Math.round(target * (1 - Math.pow(1 - p, 3))));
        if (t - last > 70 && p < 1) { last = t; tick.current?.(); }
        if (p < 1) raf = requestAnimationFrame(step); else setDone(true);
      };
      raf = requestAnimationFrame(step);
    }, delay);
    return () => { dead = true; clearTimeout(to); cancelAnimationFrame(raf); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run]);
  return done ? target : n;
}

export default function MeetPage() {
  const snd = useSound();
  const [stage, setStage] = useState<Stage>("intro");
  const [ageText, setAgeText] = useState("");
  const [freq, setFreq] = useState(6); // 처음엔 두 달에 한 번으로 보여준다
  const [leaving, setLeaving] = useState(false);
  const [skipped, setSkipped] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const [run, setRun] = useState(0);

  const age = parseInt(ageText, 10) || 0;
  const ageOk = age >= 30 && age <= 99;
  const years = (age < 80 ? 80 : 90) - age; // 여든까지, 이미 넘으셨으면 아흔까지
  const workTimes = WORK_PER_YEAR * years;
  const friendTimes = FRIEND_PER_YEAR * years;
  const parentTimes = freq * years;
  const freqLabel = FREQ.find(([v]) => v === freq)?.[1] ?? "";

  // 직장 동료·친구 숫자는 돌아가지 않고, 숫자가 생기면서 올라온다
  const work = workTimes;
  const friend = friendTimes;
  // 만나러 가는 날 = 1일. 번과 일이 같은 숫자라, 모든 단위를 "일"로 통일한다
  const parentDays = Math.max(1, parentTimes);
  const spanLabel = parentDays < 365
    ? `달력으로 치면 약 ${(Math.round(parentDays / 3) / 10).toFixed(1)}개월`
    : `달력으로 치면 약 ${(Math.round(parentDays / 36.5) / 10).toFixed(1)}년`;
  const parent = useCount(parentDays, stage === "parent", skipped ? 0 : 2600, skipped ? 0 : 1500);

  // 장면 자동 전환
  useEffect(() => {
    setLeaving(false);
    if (stage === "work" || stage === "friend") {
      const t1 = setTimeout(() => (stage === "work" ? snd.tickWork() : snd.tickFriend()), 350);
      const a = setTimeout(() => setLeaving(true), 3600);
      const b = setTimeout(() => setStage(stage === "work" ? "friend" : "parent"), 4200);
      return () => { clearTimeout(t1); clearTimeout(a); clearTimeout(b); };
    }
    if (stage === "parent" && !skipped) {
      snd.swell();
      const c = setTimeout(() => snd.bell(), 1500);
      return () => clearTimeout(c);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, run]);

  useEffect(() => {
    // 움직임 줄이기 설정이면 바로 마지막 장면
    if (stage === "intro" && typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      setSkipped(true);
    }
  }, [stage]);

  useEffect(() => {
    if (stage !== "parent") return;
    const b = document.body.style.background;
    const h = document.documentElement.style.background;
    document.body.style.background = "#9A4E2A";
    document.documentElement.style.background = "#9A4E2A";
    return () => { document.body.style.background = b; document.documentElement.style.background = h; };
  }, [stage]);

  const start = () => {
    if (!ageOk) return;
    snd.init();
    snd.setOn(soundOn);
    setSkipped(false);
    setStage("work");
    setRun((x) => x + 1);
  };
  const skip = () => {
    if (stage === "work" || stage === "friend") { setSkipped(true); setStage("parent"); }
  };
  const toggleSound = () => { const v = !soundOn; setSoundOn(v); snd.setOn(v); };

  return (
    <main className={`meet st-${stage}${skipped ? " skipped" : ""}`} onClick={skip}>
      <style>{CSS}</style>

      {stage !== "intro" && (
        <button className="snd" onClick={(e) => { e.stopPropagation(); toggleSound(); }}>
          {soundOn ? "소리 끄기" : "소리 켜기"}
        </button>
      )}

      {stage === "intro" && (
        <section className="center in">
          <h1 className="h1">부모님과 앞으로<br />몇 번 만날 수 있을까요</h1>
          <p className="sub">소리를 켜고 보시면 더 좋아요</p>
          <p className="ask">부모님은 올해 몇 세이신가요</p>
          <label className="agebox">
            <input
              className="ageinput"
              type="number"
              inputMode="numeric"
              min={30}
              max={99}
              value={ageText}
              onChange={(e) => setAgeText(e.target.value.slice(0, 2))}
              onKeyDown={(e) => { if (e.key === "Enter") start(); }}
              aria-label="부모님 나이"
            />
            <span className="ageunit">세</span>
          </label>
          <button className="cta dark" onClick={start} disabled={!ageOk}>시작</button>
        </section>
      )}

      {stage === "work" && (
        <section className={`center scene${leaving ? " out" : ""}`}>
          <div className="who">직장 동료</div>
          <div className="num">{work.toLocaleString()}<small>일</small></div>
          <div className="cap">주 5일 만나면, 앞으로 {years}년 동안</div>
        </section>
      )}

      {stage === "friend" && (
        <section className={`center scene${leaving ? " out" : ""}`}>
          <div className="who">가장 친한 친구</div>
          <div className="num">{friend.toLocaleString()}<small>일</small></div>
          <div className="cap">한 달에 두 번 만나면, 앞으로 {years}년 동안</div>
        </section>
      )}

      {stage === "parent" && (
        <div className="cover">
          <section className="center parentScene" onClick={(e) => e.stopPropagation()}>
            <div className="who p">부모님과 함께할 수 있는 시간이 겨우</div>
            <div className="num p glow">{parent.toLocaleString()}<small>일</small></div>
            <div className="lead p">믿어지시나요?</div>
            <div className="cap p">
              앞으로 {years}년 동안 {freqLabel} 하루씩 만난다면<br />
              {spanLabel}
            </div>
            <div className="below">
              <div className="ask p">부모님 얼마나 자주 만나세요?</div>
              <div className="chips p4">
                {FREQ.map(([v, l]) => (
                  <button key={v} className="chip on-dark" aria-pressed={freq === v} onClick={() => setFreq(v)}>{l}</button>
                ))}
              </div>
              <Link href="/login" className="cta light">부모님 이야기 시작하기</Link>
              <button className="replay" onClick={() => { setSkipped(false); setStage("intro"); }}>처음부터 다시 보기</button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

const CSS = `
.meet{position:relative;max-width:440px;margin:0 auto;min-height:100vh;min-height:100dvh;box-sizing:border-box;overflow:hidden;
  background:var(--ochre-tint);color:var(--charcoal);
  text-shadow:0 1px 0 rgba(255,255,255,.75),0 2px 8px rgba(47,43,40,.2);
  padding:max(24px,env(safe-area-inset-top)) max(20px,env(safe-area-inset-right)) max(24px,env(safe-area-inset-bottom)) max(20px,env(safe-area-inset-left));
  display:flex;flex-direction:column}
.meet button,.meet input{text-shadow:inherit}
.snd{position:absolute;top:10px;right:12px;z-index:5;height:44px;padding:0 10px;border:0;background:transparent;color:var(--text-muted);font-size:13px;cursor:pointer}
.st-parent .snd{color:#F5F0E8}
.center{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:14px}
.h1{margin:0;font-size:28px;line-height:1.45;font-weight:800}
.sub{margin:0;font-size:14px;color:var(--text-muted)}
.ask{margin:22px 0 0;font-size:17px;font-weight:600}
.chips{display:flex;flex-wrap:wrap;justify-content:center;gap:8px;max-width:360px}
.chip{min-height:48px;min-width:64px;padding:0 14px;border-radius:8px;font-size:15px;border:1px solid var(--border);background:var(--offwhite);color:var(--charcoal);font-weight:500;cursor:pointer}
.chip[aria-pressed=true]{border:2px solid var(--ochre-ink);background:var(--ochre-ink);color:#fff;font-weight:700}
.chip{text-shadow:none}
.chip.on-dark{background:transparent;border:1px solid rgba(245,240,232,.6);color:#F5F0E8}
.chip.on-dark[aria-pressed=true]{background:#F5F0E8;border-color:#F5F0E8;color:var(--ochre-ink)}
.cta{margin-top:22px;display:flex;align-items:center;justify-content:center;width:100%;max-width:360px;height:58px;border-radius:8px;border:0;font-size:18px;font-weight:700;text-decoration:none;cursor:pointer}
.cta.dark{background:var(--ochre-ink);color:#FFF8EE;text-shadow:0 2px 3px rgba(0,0,0,.35);box-shadow:0 6px 16px rgba(154,78,42,.35)}
.cta:disabled{opacity:.35;cursor:default}
.agebox{display:flex;align-items:center;gap:10px}
.ageinput{width:120px;height:64px;box-sizing:border-box;text-align:center;font-size:32px;font-weight:700;border:2px solid var(--ochre-ink);border-radius:8px;background:#fff;text-shadow:none;color:var(--charcoal);font-family:inherit;-moz-appearance:textfield}
.ageinput::-webkit-outer-spin-button,.ageinput::-webkit-inner-spin-button{-webkit-appearance:none;margin:0}
.ageunit{font-size:24px;font-weight:700}
.cta.light{background:#F5F0E8;color:var(--ochre-ink);text-shadow:none;box-shadow:0 8px 20px rgba(0,0,0,.25)}
.who{font-size:22px;font-weight:700}
.num{font-weight:900;line-height:1;font-size:96px;letter-spacing:-0.03em;font-variant-numeric:tabular-nums}
.num small{font-size:30px;font-weight:700;margin-left:6px;color:var(--ochre-ink)}
.cap{font-size:15px;color:var(--text-muted)}
.scene{animation:fadein .8s ease both}
.scene .num{text-shadow:0 3px 0 rgba(255,255,255,.7),0 12px 26px rgba(47,43,40,.28);font-size:72px;animation:rise 1s cubic-bezier(.2,.8,.2,1) .3s both}
.scene .num small{font-size:26px}
.scene .who{animation:fadein .8s ease both}
.scene .cap{animation:fadein .8s ease 1s both}
.scene.out{animation:fadeout .6s ease both}
.in{animation:fadein .8s ease both}
.cover{text-shadow:0 2px 6px rgba(0,0,0,.4);position:fixed;top:0;left:0;width:100%;height:100vh;height:100dvh;overflow-y:auto;z-index:4;background:var(--ochre-ink);color:#F5F0E8;display:flex;flex-direction:column;
  padding:max(24px,env(safe-area-inset-top)) 20px max(24px,env(safe-area-inset-bottom));
  animation:cover 1.1s cubic-bezier(.7,0,.2,1) both}
.skipped .cover{animation:none}
.parentScene{width:100%;max-width:440px;margin:0 auto;flex:1 0 auto;justify-content:center;gap:10px;padding-top:18vh}
.st-parent{background:var(--ochre-ink)}
.who.p{font-size:22px;font-weight:600;animation:fadein 1s ease .9s both}
.lead.p{font-size:26px;font-weight:700;animation:fadein 1s ease 2.9s both}
.num.p{font-size:min(34vw,150px);animation:pop 1.4s ease 1.4s both}
.num.p small{color:#1F1B19;font-size:44px}
.cap.p{color:rgba(245,240,232,.8);font-size:14px;line-height:1.7;animation:fadein 1s ease 3.4s both}
.num.glow{color:#1F1B19;text-shadow:0 0 34px rgba(255,215,160,.7),0 3px 0 rgba(255,236,210,.55),0 16px 36px rgba(0,0,0,.35)}
.below{width:100%;display:flex;flex-direction:column;align-items:center;gap:10px;margin-top:56px;animation:fadein 1s ease 3.8s both}
.below .ask{margin:0;font-size:15px;font-weight:500}
.p4{display:flex;flex-wrap:wrap;justify-content:center;gap:6px;width:100%;max-width:360px}
.p4 .chip{min-height:36px;min-width:0;font-size:13px;padding:0 12px}
.replay{background:transparent;border:0;color:rgba(245,240,232,.75);font-size:13px;height:44px;cursor:pointer}
.skipped .who.p,.skipped .num.p,.skipped .lead.p,.skipped .cap.p,.skipped .below{animation:none;opacity:1}
@keyframes fadein{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
@keyframes rise{from{opacity:0;transform:translateY(40px)}to{opacity:1;transform:none}}
@keyframes fadeout{from{opacity:1}to{opacity:0}}
@keyframes cover{from{clip-path:circle(0% at 50% 50%)}to{clip-path:circle(150% at 50% 50%)}}
@keyframes pop{0%{opacity:0;transform:scale(.7)}60%{opacity:1;transform:scale(1.04)}100%{opacity:1;transform:none}}
@media (prefers-reduced-motion:reduce){.meet *{animation:none!important;opacity:1!important;transform:none!important}}
`;
