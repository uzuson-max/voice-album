"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/supabaseBrowser";
import { josa } from "@/lib/korean";
import { INVITE_KINDS, avoidHits, inviteText, type InviteKind } from "@/lib/invite";

// 첫 문자가 가기 전에, 자녀가 자기 말로 먼저 보내는 카톡.
// 서비스가 보내는 첫 문자보다 이 한 통이 먼저 도착해야 부모님이 "이게 뭐지?" 하지 않는다.
export default function Invite() {
  const router = useRouter();
  const [label, setLabel] = useState("엄마");
  const [kind, setKind] = useState<InviteKind>("basic");
  const [occasion, setOccasion] = useState("생신");
  const [text, setText] = useState("");
  const [touched, setTouched] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    api("/api/me/family")
      .then(({ storyteller }) => storyteller?.label && setLabel(storyteller.label))
      .catch(() => router.replace("/app/family"));
  }, [router]);

  // 손대기 전에는 고른 문안을 그대로 보여주고, 고친 뒤에는 고친 문장을 지키기
  useEffect(() => {
    if (!touched) setText(inviteText(kind, label, occasion));
  }, [kind, label, occasion, touched]);

  const hits = avoidHits(text);

  async function share() {
    setMsg("");
    try {
      if (navigator.share) {
        await navigator.share({ text });
        setMsg("보냈어요. 이제 첫 질문이 문자로 가요.");
        return;
      }
    } catch {
      return; // 공유 창을 닫은 경우
    }
    await copy();
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setMsg(`복사했어요. 카톡에서 ${label}에게 붙여넣어 보내주세요.`);
    } catch {
      setMsg("복사가 안 됐어요. 글을 길게 눌러 직접 복사해 주세요.");
    }
  }

  return (
    <main className="screen">
      <div className="stack">
        <span className="tiny muted">시작하기 전에 한 가지</span>
        <h1 className="h1" style={{ margin: 0 }}>{label}에게 먼저 한마디 보내주세요</h1>
        <p className="small muted" style={{ margin: 0, lineHeight: 1.7 }}>
          모르는 번호로 문자가 먼저 가면 {josa(label, "은/는")} 낯설어하세요. 내 카톡이 먼저 도착하면, 첫 질문을 기다리게 돼요.
        </p>

        <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
          {INVITE_KINDS.map((k) => (
            <button
              key={k.kind}
              type="button"
              className="textbtn"
              onClick={() => { setKind(k.kind); setTouched(false); }}
              style={{ padding: "0 14px", borderRadius: 999, background: kind === k.kind ? "var(--tab)" : "transparent", color: "var(--ink)" }}
            >
              {k.label}
            </button>
          ))}
        </div>
        <p className="tiny muted" style={{ margin: "-4px 4px 0" }}>{INVITE_KINDS.find((k) => k.kind === kind)?.desc}</p>

        {kind === "occasion" && (
          <div className="field">
            <label>어떤 날의 선물이에요?</label>
            <input className="input" value={occasion} onChange={(e) => { setOccasion(e.target.value); setTouched(false); }} placeholder="예: 칠순, 퇴직, 어버이날" />
          </div>
        )}

        <div className="field">
          <label>내 말투로 고쳐서 보내도 돼요</label>
          <textarea
            className="input"
            style={{ minHeight: 220, lineHeight: 1.7 }}
            value={text}
            onChange={(e) => { setText(e.target.value); setTouched(true); }}
          />
          {hits.length > 0 && (
            <span className="tiny" style={{ color: "var(--accent)", lineHeight: 1.6 }}>
              &lsquo;{hits.join("’, ‘")}&rsquo; 같은 말은 빼는 게 좋아요. 부모님이 무겁게 받아들이실 수 있어요.
            </span>
          )}
        </div>

        <button className="btn" onClick={share}>카톡으로 보내기</button>
        <button className="btn soft" onClick={copy}>글만 복사하기</button>
        {msg && <p className="small" style={{ margin: 0, textAlign: "center" }}>{msg}</p>}
        <button className="link" onClick={() => router.replace("/app")}>보냈어요, 질문함으로 갈게요</button>
      </div>
    </main>
  );
}
