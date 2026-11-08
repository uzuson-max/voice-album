"use client";
// 결제 전 공개 페이지: 직장 동료 → 친한 친구 → 부모님 순서로 "앞으로 몇 번 만날까" 를 보여준다.
// 화면을 누르면 애니메이션이 바로 끝까지 뜬다. 가입 없이 열린다.
import Link from "next/link";
import { useMemo, useState } from "react";

const AGE = 64;            // 부모님 나이 기본값 (입력받기 전 예시)
const YEARS = 80 - AGE;    // 여든까지

const ROWS = [
  { key: "w", n: 1, name: "직장 동료", opts: [[240, "주 5일"], [144, "주 3일"], [48, "주 1일"], [12, "한 달 1번"]] },
  { key: "f", n: 2, name: "가장 친한 친구", opts: [[48, "매주"], [24, "한 달 2번"], [12, "한 달 1번"], [4, "세 달 1번"]] },
  { key: "p", n: 3, name: "부모님", opts: [[24, "한 달 2번"], [12, "한 달 1번"], [6, "두 달 1번"], [4, "세 달 1번"]] },
] as const;

const ICON: Record<number, JSX.Element> = {
  1: (<svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="4" y="9" width="20" height="14" rx="2" /><path d="M10 9V6h8v3M4 15h20" /></svg>),
  2: (<svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="9" cy="9" r="3.5" /><circle cx="19" cy="9" r="3.5" /><path d="M3 23c0-4 3-7 6-7s6 3 6 7M13 23c0-4 3-7 6-7s6 3 6 7" /></svg>),
  3: (<svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="var(--ochre)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M14 24S4 17.5 4 10.5A5.5 5.5 0 0 1 14 7a5.5 5.5 0 0 1 10 3.5C24 17.5 14 24 14 24z" /></svg>),
};

export default function MeetPage() {
  const [v, setV] = useState<Record<string, number>>({ w: 240, f: 24, p: 12 });
  const [run, setRun] = useState(1);        // 다시 보기: key 가 바뀌면 애니메이션이 처음부터
  const [skip, setSkip] = useState(false);  // 화면을 누르면 바로 끝까지

  const rows = useMemo(
    () => ROWS.map((r) => {
      const times = v[r.key] * YEARS;
      return { ...r, times, pct: Math.max(1.5, (times / (240 * YEARS)) * 100) };
    }),
    [v]
  );

  return (
    <main
      key={run}
      className={`meet${skip ? " skip" : ""}`}
      onClick={() => setSkip(true)}
    >
      <style>{CSS}</style>
      <button
        className="replay"
        onClick={(e) => { e.stopPropagation(); setSkip(false); setRun((x) => x + 1); }}
        aria-label="처음부터 다시 보기"
      >
        다시 보기
      </button>

      <h1 className="title">앞으로 {YEARS}년 동안<br />이 사람들을 몇 번 만날까요</h1>

      {rows.map((r) => (
        <section key={r.key} className="row">
          <div className={`head r${r.n}`}>
            <span className="lab">{ICON[r.n]}{r.name}</span>
            <span className={`num n${r.n}${r.n === 3 ? " big" : ""}`}>
              {r.times.toLocaleString()}<small>번</small>
            </span>
          </div>
          <div className="track"><div className={`bar b${r.n}`} style={{ width: `${r.pct}%` }} /></div>
          <div className="chips" onClick={(e) => e.stopPropagation()}>
            {r.opts.map(([n, label]) => (
              <button key={n} className="chip" aria-pressed={v[r.key] === n} onClick={() => setV({ ...v, [r.key]: n })}>
                {label}
              </button>
            ))}
          </div>
        </section>
      ))}

      <p className="after msg">
        부모님과는 생각보다 적죠
        <span>우리 집은 어떤지 눌러서 바꿔 보세요</span>
      </p>

      <Link href="/login" className="cta after" onClick={(e) => e.stopPropagation()}>
        부모님 이야기 시작하기
      </Link>
    </main>
  );
}

const CSS = `
.meet{max-width:440px;margin:0 auto;min-height:100dvh;box-sizing:border-box;background:var(--offwhite);color:var(--charcoal);
  padding:max(36px,env(safe-area-inset-top)) max(20px,env(safe-area-inset-right)) max(24px,env(safe-area-inset-bottom)) max(20px,env(safe-area-inset-left));
  display:flex;flex-direction:column;gap:14px;position:relative}
.replay{position:absolute;top:8px;right:12px;height:44px;padding:0 10px;border:0;background:transparent;color:var(--text-muted);font-size:13px;cursor:pointer}
.title{margin:12px 0 0;font-size:22px;line-height:1.5;font-weight:700}
.row{display:flex;flex-direction:column;gap:8px}
.head{display:flex;justify-content:space-between;align-items:center}
.lab{display:inline-flex;align-items:center;gap:10px;font-size:17px;font-weight:700}
.num{font-weight:900;line-height:1;font-size:30px}
.num small{font-size:15px;font-weight:700;color:var(--ochre-ink)}
.num.big{font-size:44px;color:var(--ochre-ink)}
.track{height:26px;background:var(--border);border:1px solid var(--border);border-radius:3px;overflow:hidden}
.bar{height:26px;background:var(--ochre);transition:width .35s ease;transform-origin:left}
.chips{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px}
.chip{min-height:44px;border-radius:6px;font-size:13px;border:1px solid var(--border);background:var(--offwhite);color:var(--charcoal);font-weight:500;cursor:pointer}
.chip[aria-pressed=true]{border:2px solid var(--ochre-ink);background:var(--ochre-ink);color:#fff;font-weight:700}
.msg{margin:0;text-align:center;font-size:17px;line-height:1.6;font-weight:500}
.msg span{display:block;font-size:14px;color:var(--text-muted)}
.cta{margin-top:auto;display:flex;align-items:center;justify-content:center;height:56px;border-radius:6px;background:var(--charcoal);color:var(--offwhite);font-size:18px;font-weight:700;text-decoration:none}
.title,.head,.chips,.after{opacity:0}
@keyframes up{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
@keyframes draw{from{transform:scaleX(0)}to{transform:scaleX(1)}}
.title{animation:up 1s ease .2s both}
.head.r1{animation:up .8s ease 1.2s both}.head.r2{animation:up .8s ease 4s both}.head.r3{animation:up .8s ease 7s both}
.b1{animation:draw 1.6s ease-in-out 1.6s both}.b2{animation:draw 1.2s ease-in-out 4.4s both}.b3{animation:draw 1s ease-in-out 7.4s both}
.num{opacity:0}
.n1{animation:up .8s ease 3s both}.n2{animation:up .8s ease 5.6s both}.n3{animation:up 2.4s ease 9s both}
.head{opacity:1}
.head.r1 .lab,.head.r2 .lab,.head.r3 .lab{opacity:0}
.head.r1 .lab{animation:up .8s ease 1.2s both}.head.r2 .lab{animation:up .8s ease 4s both}.head.r3 .lab{animation:up .8s ease 7s both}
.after{animation:up 1s ease 11.6s both}
.chips{animation:up 1s ease 13s both}
.skip *{animation:none!important;opacity:1!important;transform:none!important}
@media (prefers-reduced-motion:reduce){.meet *{animation:none!important;opacity:1!important;transform:none!important}}
`;
