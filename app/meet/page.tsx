"use client";
// 결제 전 공개 페이지 /meet
// 흐름: 입력(엄마·아빠/나이/만나는 횟수) → 비교 장면 4개(딱딱딱) → 부모님 숫자가 화면을 덮음
//       → 반전(횟수를 바꾸면 숫자가 올라간다) → 콜투액션
// 비교용 주소: /meet (숫자는 "일", 하루 만나면 1일) · /meet?v=time (숫자는 "번", 부모님 장면에서 시간으로 한 번 더 환산)
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type React from "react";

/* ---------- 상수 ---------- */
const FREQ: [number, string][] = [[24, "한 달 2번"], [12, "한 달 1번"], [6, "두 달 1번"], [4, "세 달 1번"], [2, "명절에만"]];
const FREQ_SENT: Record<number, string> = { 24: "한 달에 두 번", 12: "한 달에 한 번", 6: "두 달에 한 번", 4: "세 달에 한 번", 2: "명절에만" };
const MEDIAN_VISITS = 12;   // 한국복지패널(한국보건사회연구원): 따로 사는 부모와 1년 왕래 횟수 중위값 — 원문 확인 후 게시할 것
const HOURS_PER_VISIT = 4;  // ?v=time 일 때만 쓴다
type Stage = "intro" | "peers" | "shock" | "turn";

// 남은 해 수. 공식 연령별 기대여명(생명표) 표를 확인하면 여기만 바꾸면 된다.
function remainingYears(age: number, _who: string) {
  return Math.max(5, (age < 80 ? 80 : 90) - age);
}

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
    beat: (i: number) => tone(520 + i * 90, 0.09, 0.07, "triangle"),
    swell: () => { tone(98, 2.4, 0.16); tone(147, 2.4, 0.08); },
    bell: () => { tone(523, 2.2, 0.12); tone(784, 2.6, 0.08, "sine", 0.02); tone(1046, 2.0, 0.04, "sine", 0.04); },
    up: () => { tone(392, 0.5, 0.08); tone(587, 0.9, 0.08, "sine", 0.12); },
  };
}

/* ---------- 숫자가 올라가는 효과 (부모님 숫자에만) ---------- */
function useCount(target: number, run: boolean, ms: number, delay: number) {
  const [n, setN] = useState(0);
  const [done, setDone] = useState(false);
  useEffect(() => {
    if (!run) { setN(0); setDone(false); return; }
    let raf = 0, t0 = 0, dead = false;
    const to = setTimeout(() => {
      const step = (t: number) => {
        if (dead) return;
        if (!t0) t0 = t;
        const p = Math.min(1, (t - t0) / (ms || 1));
        setN(Math.round(target * (1 - Math.pow(1 - p, 3))));
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
  const [beat, setBeat] = useState(0);
  const [who, setWho] = useState<"" | "엄마" | "아빠">("");
  const [ageText, setAgeText] = useState("");
  const [freq, setFreq] = useState(0);        // 처음엔 아무것도 눌려 있지 않다 (직접 고르게)
  const [turnFreq, setTurnFreq] = useState(0);
  const [soundOn, setSoundOn] = useState(true);
  const [timeMode, setTimeMode] = useState(false);
  const [ready, setReady] = useState(false);   // 부모님 장면의 문장이 다 나온 뒤에야 눌러서 넘어갈 수 있다
  const lastTap = useRef(0);

  useEffect(() => {
    try { setTimeMode(new URLSearchParams(window.location.search).get("v") === "time"); } catch {}
  }, []);

  const age = parseInt(ageText, 10) || 0;
  const ageOk = age >= 30 && age <= 99;
  const years = remainingYears(age, who);
  const unit = timeMode ? "번" : "일";
  const parentCount = freq * years;                        // 일 모드: 하루 = 1일, 번 모드: 방문 횟수
  const timeDays = Math.max(1, Math.round((parentCount * HOURS_PER_VISIT) / 24));
  const spanLabel = (n: number) =>
    n < 365 ? `달력으로 치면 약 ${(Math.round(n / 3) / 10).toFixed(1)}개월` : `달력으로 치면 약 ${(Math.round(n / 36.5) / 10).toFixed(1)}년`;

  const BEATS = [
    { label: "지하철에서 스친 사람", formula: "스치듯 한 번", n: 1, cap: "이 사람과는" },
    { label: "단골 미용실 원장님", formula: "한 달에 한 번 × 10년", n: 12 * 10, cap: "원장님과는" },
    { label: "같은 팀 직장 동료", formula: "평일마다 × 3년 (1년 약 240일)", n: 240 * 3, cap: "직장 동료와는" },
    { label: "가장 친한 친구", formula: "한 달에 두 번 × 10년", n: 24 * 10, cap: "친구와는" },
  ];

  const shockNum = useCount(parentCount, stage === "shock", 2600, 1500);

  /* 장면 자동 진행 */
  useEffect(() => {
    if (stage === "peers") {
      snd.beat(beat);   // 장면은 자동으로 넘어가지 않고, 화면을 누르면 넘어간다
      return;
    }
    if (stage === "shock") {
      snd.swell();
      const a = setTimeout(() => snd.bell(), 1500);
      setReady(false);
      const b = setTimeout(() => setReady(true), timeMode ? 8200 : 6200);
      return () => { clearTimeout(a); clearTimeout(b); };
    }
    if (stage === "turn") {
      setTurnFreq(freq);
      const t = setTimeout(() => {
        const up = [2, 4, 6, 12, 24].find((v) => v > freq) ?? freq;
        setTurnFreq(up);
        snd.up();
      }, 2800);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, beat]);

  /* 마지막 장면에서는 페이지 바탕 전체를 오커색으로 */
  useEffect(() => {
    if (stage !== "shock" && stage !== "turn") return;
    const b = document.body.style.background;
    const h = document.documentElement.style.background;
    document.body.style.background = "#9A4E2A";
    document.documentElement.style.background = "#9A4E2A";
    return () => { document.body.style.background = b; document.documentElement.style.background = h; };
  }, [stage]);

  const start = () => {
    if (!ageOk || !who || !freq) return;
    snd.init();
    snd.setOn(soundOn);
    setBeat(0);
    setStage("peers");
  };
  // 화면 왼쪽을 누르면 앞 장면, 오른쪽을 누르면 다음 장면 (스토리처럼)
  const go = (dir: 1 | -1) => {
    const now = Date.now();
    if (now - lastTap.current < 500) return;   // 실수로 두 번 눌러 건너뛰는 것 방지
    if (stage === "peers") {
      lastTap.current = now;
      if (dir === 1) { if (beat < BEATS.length - 1) setBeat(beat + 1); else setStage("shock"); }
      else if (beat > 0) setBeat(beat - 1);
    } else if (stage === "shock") {
      if (dir === 1 && ready) { lastTap.current = now; setStage("turn"); }
      else if (dir === -1) { lastTap.current = now; setBeat(BEATS.length - 1); setStage("peers"); }
    } else if (stage === "turn" && dir === -1) {
      lastTap.current = now;
      setStage("shock");
    }
  };
  const onTap = (e: React.MouseEvent<HTMLElement>) => {
    if (stage === "intro") return;
    const r = e.currentTarget.getBoundingClientRect();
    go(e.clientX - r.left < r.width * 0.35 ? -1 : 1);
  };
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  });
  const toggleSound = () => { const v = !soundOn; setSoundOn(v); snd.setOn(v); };

  const turnCount = turnFreq * years;
  const b = BEATS[beat];

  return (
    <main className={`meet st-${stage}`} onClick={onTap}>
      <style>{CSS}</style>

      {stage !== "intro" && (
        <button className="snd" onClick={(e) => { e.stopPropagation(); toggleSound(); }}>
          {soundOn ? "소리 끄기" : "소리 켜기"}
        </button>
      )}

      {/* 1. 입력 */}
      {stage === "intro" && (
        <section className="center in">
          <h1 className="h1">부모님과 만날 수 있는 날,<br />세어 본 적 있나요</h1>
          <p className="sub">소리를 켜고 보시면 더 좋아요</p>

          <div className="field">
            <div className="ask">누구의 이야기인가요</div>
            <div className="whobtns" role="group" aria-label="대상">
              {(["엄마", "아빠"] as const).map((w) => (
                <button key={w} className="chip" aria-pressed={who === w} onClick={() => setWho(w)}>{w}</button>
              ))}
            </div>
          </div>

          <div className="field">
            <div className="ask">올해 몇 세이신가요</div>
            <label className="agebox">
              <input
                className="ageinput"
                type="number"
                inputMode="numeric"
                min={30}
                max={99}
                value={ageText}
                onChange={(e) => setAgeText(e.target.value.slice(0, 2))}
                aria-label="부모님 나이"
              />
              <span className="ageunit">세</span>
            </label>
          </div>

          <div className="field">
            <div className="ask">부모님을 얼마나 자주 만나세요</div>
            <div className="chips" role="group" aria-label="만나는 횟수">
              {FREQ.map(([v, l]) => (
                <button key={v} className="chip" aria-pressed={freq === v} onClick={() => setFreq(v)}>{l}</button>
              ))}
            </div>
          </div>

          <button className="cta dark" onClick={start} disabled={!ageOk || !who || !freq}>시작</button>
        </section>
      )}

      {/* 2. 비교 장면 (딱딱딱) */}
      {stage === "peers" && (
        <section className="center scene peers" key={beat}>
          <div className="who">{b.label}</div>
          <div className="formula">{b.formula}</div>
          <div className="num">{b.n.toLocaleString()}<small>{unit}</small></div>
          <div className="cap">{b.cap} {b.n.toLocaleString()}{unit}</div>
          <div className="tap">왼쪽은 이전 · 오른쪽은 다음</div>
        </section>
      )}

      {/* 3·4. 부모님 숫자가 화면을 덮고, 반전 */}
      {(stage === "shock" || stage === "turn") && (
        <div className="cover">
          {stage === "shock" && (
            <section className="center parentScene">
              <div className="who p">{who}와 함께할 수 있는 시간이 겨우</div>
              <div className="num p glow">{shockNum.toLocaleString()}<small>{unit}</small></div>
              <div className="lead p">믿어지시나요?</div>
              <div className="cap p">
                앞으로 {years}년 동안, {FREQ_SENT[freq]} 하루씩 찾아뵌다면<br />
                {timeMode ? "" : spanLabel(parentCount)}
              </div>
              <div className="reason">{FREQ_SENT[freq]} 찾아뵙기 때문이에요</div>
              {timeMode && (
                <div className="timeconv">
                  한 번에 {HOURS_PER_VISIT}시간씩이면, 모두 합쳐 <b>약 {timeDays}일</b>
                </div>
              )}
              {ready && <div className="tap on-cover">왼쪽은 이전 · 오른쪽은 다음</div>}
            </section>
          )}

          {stage === "turn" && (
            <section className="center parentScene turn">
              <div className="stat">
                부모님과 따로 사는 사람은<br />1년에 {MEDIAN_VISITS}번쯤 만난다고 해요
                <small>한국복지패널(한국보건사회연구원), 중위값</small>
              </div>
              <div className="who p2">{FREQ_SENT[turnFreq]} 찾아뵌다면</div>
              <div className="num p glow keyed" key={turnFreq}>
                {turnCount.toLocaleString()}<small>{unit}</small>
              </div>
              <div className="lead p3">남은 날은 정해진 숫자가 아니에요<br />찾아뵙는 만큼 달라져요</div>

              <div className="below">
                <div className="callout">사랑하는 우리 {who},<br />조금이라도 기억하고 싶다면</div>
                <Link href="/login" className="cta light" onClick={(e) => e.stopPropagation()}>더 늦기 전에 {who} 이야기 담기</Link>
                <button className="replay" onClick={(e) => { e.stopPropagation(); setStage("intro"); }}>처음부터 다시 보기</button>
              </div>
            </section>
          )}
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
.st-shock .snd,.st-turn .snd{color:#F5F0E8;z-index:6}
.center{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:14px}
.h1{margin:0;font-size:28px;line-height:1.45;font-weight:800}
.sub{margin:0;font-size:14px;color:var(--text-muted)}
.ask{margin:0;font-size:16px;font-weight:600}
.field{display:flex;flex-direction:column;align-items:center;gap:8px;width:100%}
.whobtns{display:flex;gap:10px}
.whobtns .chip{width:112px;min-height:52px;font-size:18px}
.in{gap:16px}
.chips{display:flex;flex-wrap:wrap;justify-content:center;gap:8px;max-width:360px}
.chip{min-height:48px;min-width:64px;padding:0 14px;border-radius:8px;font-size:15px;border:1px solid var(--border);background:var(--offwhite);color:var(--charcoal);font-weight:500;cursor:pointer;text-shadow:none}
.chip[aria-pressed=true]{border:2px solid var(--ochre-ink);background:var(--ochre-ink);color:#fff;font-weight:700}
.chip.on-dark{background:transparent;border:1px solid rgba(245,240,232,.6);color:#F5F0E8}
.chip.on-dark[aria-pressed=true]{background:#F5F0E8;border-color:#F5F0E8;color:var(--ochre-ink)}
.agebox{display:flex;align-items:center;gap:10px}
.ageinput{width:120px;height:64px;box-sizing:border-box;text-align:center;font-size:32px;font-weight:700;border:2px solid var(--ochre-ink);border-radius:8px;background:#fff;text-shadow:none;color:var(--charcoal);font-family:inherit;-moz-appearance:textfield}
.ageinput::-webkit-outer-spin-button,.ageinput::-webkit-inner-spin-button{-webkit-appearance:none;margin:0}
.ageunit{font-size:24px;font-weight:700}
.cta{margin-top:22px;display:flex;align-items:center;justify-content:center;width:100%;max-width:360px;height:58px;border-radius:8px;border:0;font-size:18px;font-weight:700;text-decoration:none;cursor:pointer}
.cta.dark{background:var(--ochre-ink);color:#FFF8EE;text-shadow:0 2px 3px rgba(0,0,0,.35);box-shadow:0 6px 16px rgba(154,78,42,.35)}
.cta:disabled{opacity:.35;cursor:default}
.cta.light{background:#F5F0E8;color:var(--ochre-ink);text-shadow:none;box-shadow:0 8px 20px rgba(0,0,0,.25)}
/* 비교 장면 */
.who{font-size:22px;font-weight:700}
.formula{font-size:13px;color:var(--text-muted);letter-spacing:.02em}
.num{font-weight:900;line-height:1;font-size:96px;letter-spacing:-0.03em;font-variant-numeric:tabular-nums}
.num small{font-size:30px;font-weight:700;margin-left:6px;color:var(--ochre-ink)}
.cap{font-size:16px;color:var(--text-muted)}
.peers{gap:10px}
.peers .who{animation:fadein .35s ease both}
.peers .formula{animation:fadein .35s ease .1s both}
.peers .num{font-size:88px;text-shadow:0 3px 0 rgba(255,255,255,.7),0 12px 26px rgba(47,43,40,.28);animation:rise .5s cubic-bezier(.2,.8,.2,1) .2s both}
.peers .cap{font-size:20px;font-weight:600;color:var(--charcoal);animation:fadein .4s ease .9s both}
/* 부모님 덮개 */
.cover{position:fixed;top:0;left:0;width:100%;height:100vh;height:100dvh;overflow-y:auto;z-index:4;background:var(--ochre-ink);color:#F5F0E8;display:flex;flex-direction:column;
  text-shadow:0 2px 6px rgba(0,0,0,.4);
  padding:max(24px,env(safe-area-inset-top)) 20px max(24px,env(safe-area-inset-bottom));
  animation:cover 1.1s cubic-bezier(.7,0,.2,1) both}
.parentScene{width:100%;max-width:440px;margin:0 auto;flex:1 0 auto;justify-content:center;gap:10px;padding-top:12vh}
.who.p{font-size:22px;font-weight:600;animation:fadein 1s ease .9s both}
.num.p{font-size:min(34vw,150px);animation:pop 1.4s ease 1.4s both}
.num.glow{color:#1F1B19;text-shadow:0 0 34px rgba(255,215,160,.7),0 3px 0 rgba(255,236,210,.55),0 16px 36px rgba(0,0,0,.35)}
.num.p small{color:#1F1B19;font-size:44px}
.lead.p{font-size:26px;font-weight:700;animation:fadein 1s ease 2.9s both}
.cap.p{color:rgba(245,240,232,.85);font-size:14px;line-height:1.7;animation:fadein 1s ease 3.4s both}
.reason{font-size:17px;font-weight:600;animation:fadein 1s ease 5s both}
.timeconv{font-size:20px;line-height:1.5;animation:fadein 1s ease 6.6s both}
.timeconv b{font-size:26px;color:#1F1B19;text-shadow:0 0 18px rgba(255,215,160,.7)}
/* 반전 */
.turn .stat{font-size:17px;line-height:1.55;font-weight:600;animation:fadein .9s ease .2s both}
.turn .stat small{display:block;margin-top:4px;font-size:12px;font-weight:400;color:rgba(245,240,232,.75)}
.turn .who.p2{font-size:20px;font-weight:600;margin-top:18px;animation:fadein .8s ease 1.2s both}
.turn .num.p{font-size:min(30vw,128px);animation:none}
.turn .num.keyed{animation:pop .9s ease both}
.turn .lead.p3{font-size:20px;line-height:1.55;font-weight:700;animation:fadein 1s ease 4.2s both}
.tap{position:fixed;left:0;right:0;bottom:max(28px,env(safe-area-inset-bottom));text-align:center;font-size:13px;color:var(--text-muted);animation:fadein 1s ease 1.4s both,blink 2s ease-in-out 2.6s infinite}
.tap.on-cover{color:rgba(245,240,232,.8);animation:fadein .6s ease both,blink 2s ease-in-out .8s infinite;z-index:5}
@keyframes blink{0%,100%{opacity:1}50%{opacity:.35}}
.below{width:100%;display:flex;flex-direction:column;align-items:center;gap:12px;margin-top:20px;animation:fadein 1s ease 5.4s both}
.p4{display:flex;flex-wrap:wrap;justify-content:center;gap:6px;width:100%;max-width:360px}
.p4 .chip{min-height:36px;min-width:0;font-size:13px;padding:0 12px}
.callout{font-size:20px;line-height:1.55;font-weight:700;text-align:center;margin-top:10px}
.replay{background:transparent;border:0;color:rgba(245,240,232,.75);font-size:13px;height:44px;cursor:pointer}
@keyframes fadein{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
@keyframes rise{from{opacity:0;transform:translateY(40px)}to{opacity:1;transform:none}}
@keyframes cover{from{clip-path:circle(0% at 50% 50%)}to{clip-path:circle(150% at 50% 50%)}}
@keyframes pop{0%{opacity:0;transform:scale(.7)}60%{opacity:1;transform:scale(1.04)}100%{opacity:1;transform:none}}
.in{animation:fadein .8s ease both}
@media (prefers-reduced-motion:reduce){.meet *{animation:none!important;opacity:1!important;transform:none!important}}
`;
