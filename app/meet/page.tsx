'use client';
// /talk — 가입 전 짧은 대화 (대본형 채팅, 버튼 고르기 중심, 로그인 전 진행)
// 끝나면 템플릿으로 채운 첫 질문을 보여주고 부모님 화면 미리보기로 이동
// 다음 단계 경로: 아래 PREVIEW_HREF 한 줄만 바꾸면 됨
const PREVIEW_HREF = '/preview';

import { useEffect, useRef, useState } from 'react';
import {
  Intake, Parent, Child, Absence, Motive,
  pickFirstQuestion, saveIntake, loadIntake,
} from '../../lib/questionTemplates';

const C = { bg: '#2E2925', text: '#F3EEE7', sub: '#B9AFA4', ochre: '#C9823F', bubble: '#3C3530', mine: '#C99A93', line: '#4A423C' };

type Msg = { from: 'q' | 'me'; text: string };
type Opt<T> = { label: string; v: T };

const PARENT: Opt<Parent>[] = [{ label: '엄마', v: 'mom' }, { label: '아빠', v: 'dad' }];
const CHILD: Opt<Child>[] = [{ label: '아들이에요', v: 'son' }, { label: '딸이에요', v: 'daughter' }];
const ABSENCE: Opt<Absence>[] = [
  { label: '멀리 떨어져 일하셨어요', v: 'far' },
  { label: '가게·장사를 하셨어요', v: 'shop' },
  { label: '늦게까지 일하셨어요', v: 'late' },
  { label: '거의 늘 집에 계셨어요', v: 'home' },
];
const MOTIVE: Opt<Motive>[] = [
  { label: '요즘 부쩍 나이 드신 게 보여서', v: 'aging' },
  { label: '한 분을 먼저 보내드려서', v: 'lost' },
  { label: '어릴 땐 몰랐던 게 이제 보여서', v: 'understood' },
  { label: '부모가 되어 보니 궁금해져서', v: 'parenthood' },
  { label: '특별한 날을 앞두고 있어서', v: 'occasion' },
];

type Step = 'parent' | 'child' | 'absence' | 'place' | 'motive' | 'done';

const who = (p?: Parent) => (p === 'dad' ? '아빠' : '엄마');

export default function TalkPage() {
  const [intake, setIntake] = useState<Intake>({});
  const [step, setStep] = useState<Step>('parent');
  const [msgs, setMsgs] = useState<Msg[]>([{ from: 'q', text: '누구의 이야기를 남기고 싶으세요' }]);
  const [place, setPlace] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setIntake(loadIntake()); }, []);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs, step]);

  const push = (me: string, next: Step, q?: string, patch: Partial<Intake> = {}) => {
    const n = { ...intake, ...patch };
    setIntake(n);
    saveIntake(n);
    setMsgs((m) => [...m, { from: 'me', text: me }, ...(q ? [{ from: 'q' as const, text: q }] : [])]);
    setStep(next);
  };

  const first = step === 'done' ? pickFirstQuestion(intake) : null;

  return (
    <main style={{ minHeight: '100dvh', background: C.bg, color: C.text, padding: '48px 20px 40px', boxSizing: 'border-box', fontFamily: 'Pretendard, sans-serif' }}>
      <style>{`
        @keyframes wrIn { from { opacity: 0; transform: translateY(6px) } to { opacity: 1; transform: none } }
        .wr-b { animation: wrIn .3s ease-out both; max-width: 82%; padding: 12px 15px; border-radius: 16px; font-size: 16px; line-height: 1.55; margin: 0 0 10px }
        .wr-q { background: ${C.bubble}; border-top-left-radius: 4px }
        .wr-me { background: ${C.mine}; color: #2E2925; margin-left: auto; border-top-right-radius: 4px }
        .wr-opts { display: flex; flex-direction: column; gap: 8px; margin: 14px 0 0 }
        .wr-chip { text-align: left; border: 1px solid ${C.line}; background: transparent; color: ${C.text}; padding: 13px 15px; border-radius: 12px; font-size: 16px; font-family: inherit }
        .wr-skip { background: none; border: 0; color: ${C.sub}; font-size: 14px; padding: 8px 0; text-decoration: underline }
        .wr-btn { width: 100%; padding: 16px; border: 0; border-radius: 14px; background: ${C.ochre}; color: #fff; font-size: 17px; font-family: inherit }
        @media (prefers-reduced-motion: reduce) { .wr-b { animation: none } }
      `}</style>

      <p style={{ color: C.sub, fontSize: 13, margin: '0 0 20px' }}>1분이면 돼요 · 고르기만 하면 돼요</p>

      {msgs.map((m, i) => (
        <div key={i} className={`wr-b ${m.from === 'q' ? 'wr-q' : 'wr-me'}`}>{m.text}</div>
      ))}

      {step === 'parent' && (
        <div className="wr-opts">
          {PARENT.map((o) => (
            <button key={o.v} className="wr-chip" onClick={() => push(o.label, 'child', '나는', { parent: o.v })}>{o.label}</button>
          ))}
        </div>
      )}

      {step === 'child' && (
        <div className="wr-opts">
          {CHILD.map((o) => (
            <button key={o.v} className="wr-chip"
              onClick={() => push(o.label, 'absence', `어릴 때, ${who(intake.parent)}가 집에 없던 시간이 있었나요`, { child: o.v })}>{o.label}</button>
          ))}
        </div>
      )}

      {step === 'absence' && (
        <div className="wr-opts">
          {ABSENCE.map((o) => (
            <button key={o.v} className="wr-chip"
              onClick={() => o.v === 'far'
                ? push(o.label, 'place', '어디셨어요? 지역 이름 하나면 돼요', { absence: o.v })
                : push(o.label, 'motive', '지금 이걸 남기고 싶어진 이유에 가까운 건', { absence: o.v })}>{o.label}</button>
          ))}
        </div>
      )}

      {step === 'place' && (
        <div className="wr-opts">
          <input value={place} onChange={(e) => setPlace(e.target.value)} maxLength={12} placeholder="예: 울산"
            style={{ padding: '13px 15px', borderRadius: 12, border: `1px solid ${C.line}`, background: 'transparent', color: C.text, fontSize: 16 }} />
          <button className="wr-chip" disabled={!place.trim()}
            onClick={() => push(place.trim(), 'motive', '지금 이걸 남기고 싶어진 이유에 가까운 건', { place: place.trim() })}>다음</button>
          <button className="wr-skip" onClick={() => push('건너뛸게요', 'motive', '지금 이걸 남기고 싶어진 이유에 가까운 건')}>건너뛰기</button>
        </div>
      )}

      {step === 'motive' && (
        <div className="wr-opts">
          {MOTIVE.map((o) => (
            <button key={o.v} className="wr-chip" onClick={() => push(o.label, 'done', undefined, { motive: o.v })}>{o.label}</button>
          ))}
          <button className="wr-skip" onClick={() => push('넘어갈게요', 'done')}>넘어가기</button>
        </div>
      )}

      {first && (
        <section className="wr-b" style={{ maxWidth: '100%', background: 'transparent', padding: 0, marginTop: 28 }}>
          <p style={{ color: C.sub, fontSize: 14, margin: '0 0 12px' }}>이런 결의 질문으로 시작해요</p>
          <div style={{ border: `1px solid ${C.ochre}`, borderRadius: 18, padding: '22px 20px', marginBottom: 24 }}>
            {first.lead && <p style={{ color: C.ochre, fontSize: 14, margin: '0 0 10px' }}>{first.lead}</p>}
            <p style={{ fontFamily: "'MaruBuri', serif", fontSize: 21, lineHeight: 1.6, margin: 0 }}>{first.question}</p>
          </div>
          <button className="wr-btn" onClick={() => (window.location.href = PREVIEW_HREF)}>
            {who(intake.parent)}가 받는 화면 보기
          </button>
        </section>
      )}

      <div ref={endRef} />
    </main>
  );
}
