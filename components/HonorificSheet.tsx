"use client";
// 호칭 입력 팝업: 실제로 어디에 어떻게 들어가는지 예시를 보여주고, 한 번만 바꿀 수 있다는 걸 함께 알린다
import { useEffect, useState } from "react";
import { josa } from "@/lib/korean";

const HONORIFIC: Record<string, string> = { 엄마: "어머니", 아빠: "아버지" };

export default function HonorificSheet({
  open, label, honorific, childName, locked, isNew, onSave, onClose,
}: {
  open: boolean;
  label: string;
  honorific: string;
  childName: string;
  locked?: boolean; // 이미 한 번 바꿨으면 보기만
  isNew?: boolean;  // 처음 가입 중이면 "한 번만" 안내 문구가 조금 다르다
  onSave: (label: string, honorific: string) => void;
  onClose: () => void;
}) {
  const [l, setL] = useState(label);
  const [h, setH] = useState(honorific);
  useEffect(() => { if (open) { setL(label); setH(honorific); } }, [open, label, honorific]);
  if (!open) return null;

  const c = childName.trim() || "재빈이";
  const L = l.trim() || "엄마";
  const H = h.trim() || L;
  const ok = !!l.trim() && !!h.trim();

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 60, background: "rgba(20,18,16,.45)", display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
      <div onClick={(e) => e.stopPropagation()} className="stack" style={{ width: "100%", maxWidth: 480, background: "var(--ground)", borderRadius: "18px 18px 0 0", padding: "22px 22px 28px", gap: 14, maxHeight: "88vh", overflowY: "auto" }}>
        <div style={{ fontSize: 19, fontWeight: 700 }}>호칭 정하기</div>

        {!locked && (
          <>
            <div className="row" style={{ gap: 8 }}>
              {["엄마", "아빠"].map((x) => (
                <button key={x} type="button" className={`btn sm${l === x ? "" : " soft"}`} style={{ flex: 1 }} onClick={() => { setL(x); setH(HONORIFIC[x]); }}>{x}</button>
              ))}
            </div>
            <div className="row" style={{ gap: 10 }}>
              <div className="field" style={{ flex: 1 }}>
                <label>내가 부르는 호칭</label>
                <input className="input" value={l} onChange={(e) => { setL(e.target.value); if (HONORIFIC[e.target.value]) setH(HONORIFIC[e.target.value]); }} placeholder="엄마" />
              </div>
              <div className="field" style={{ flex: 1 }}>
                <label>문자 속 호칭</label>
                <input className="input" value={h} onChange={(e) => setH(e.target.value)} placeholder="어머니" />
              </div>
            </div>
          </>
        )}

        <div className="card stack" style={{ gap: 10 }}>
          <span className="tiny muted">이렇게 들어가요</span>
          <Ex where="앱 · 잡지" text={`${L}의 이야기`} />
          <Ex where="부모님 문자" text={`${c} ${H} 이야기가 궁금해서 질문을 준비했어요`} />
          <Ex where="첫 초대장" text={`${c} ${H} 맞으시죠?`} />
          <Ex where="질문 속" text={`그해 ${josa(L, "은/는")} 몇 살이었어요?`} />
        </div>

        <p className="small" style={{ margin: 0, lineHeight: 1.7, color: "var(--accent)" }}>
          {locked
            ? "호칭은 이미 한 번 바꿔서 더는 바꿀 수 없어요."
            : isNew
            ? "호칭은 시작한 뒤 딱 한 번만 바꿀 수 있어요."
            : "호칭은 딱 한 번만 바꿀 수 있어요. 지금 바꾸면 다음부터는 바꿀 수 없어요."}
          <br />
          <span className="muted">한 분의 이야기로 12호가 이어져요. 다른 분 이야기는 새 과정으로 신청해 주세요.</span>
        </p>

        {locked ? (
          <button type="button" className="btn" onClick={onClose}>닫기</button>
        ) : (
          <button type="button" className="btn" disabled={!ok} onClick={() => onSave(l.trim(), h.trim())}>이 호칭으로 할게요</button>
        )}
      </div>
    </div>
  );
}

function Ex({ where, text }: { where: string; text: string }) {
  return (
    <div className="row" style={{ gap: 10, alignItems: "baseline" }}>
      <span className="tiny muted" style={{ minWidth: 64 }}>{where}</span>
      <span className="serif" style={{ fontSize: 16, lineHeight: 1.5 }}>{text}</span>
    </div>
  );
}
