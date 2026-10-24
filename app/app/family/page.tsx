"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, browserClient } from "@/lib/supabaseBrowser";
import { WEEKDAYS } from "@/lib/time";

const empty = {
  childName: "", label: "엄마", honorific: "어머니", phone: "",
  sendWeekday: 3, sendHour: 9, unsealAt: "",
  born: "", school: "", hometown: "", job: "", likes: "",
};

export default function Family() {
  const router = useRouter();
  const [f, setF] = useState(empty);
  const [isNew, setIsNew] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api("/api/me/family").then(({ family, storyteller }) => {
      if (!family || !storyteller) return;
      setIsNew(false);
      setF({
        childName: family.child_name, label: storyteller.label, honorific: storyteller.honorific, phone: storyteller.phone,
        sendWeekday: storyteller.send_weekday, sendHour: storyteller.send_hour, unsealAt: storyteller.unseal_at || "",
        born: storyteller.profile?.["태어난 해"] || "", school: storyteller.profile?.["학교·전공"] || "", hometown: storyteller.profile?.고향 || "", job: storyteller.profile?.["했던 일"] || "", likes: storyteller.profile?.["좋아하는 것"] || "",
      });
    });
  }, []);

  const set = (k: keyof typeof empty) => (e: any) => setF({ ...f, [k]: e.target.value });

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr(""); setSaved(false);
    try {
      await api("/api/me/family", {
        method: "POST",
        body: JSON.stringify({
          ...f,
          sendWeekday: Number(f.sendWeekday), sendHour: Number(f.sendHour), unsealAt: f.unsealAt || null,
          profile: { "태어난 해": f.born, "학교·전공": f.school, 고향: f.hometown, "했던 일": f.job, "좋아하는 것": f.likes },
        }),
      });
      if (isNew) router.replace("/app/pick");
      else setSaved(true);
    } catch (e: any) {
      setErr(e.message);
    }
    setBusy(false);
  }

  return (
    <main className="screen with-tabs">
      <form onSubmit={save} className="stack">
        <h1 className="h1">{isNew ? "부모님 등록" : "가족"}</h1>
        {isNew && <p className="muted small" style={{ margin: 0 }}>한 번만 적어두면, 매주 질문이 자동으로 가요.</p>}

        <Field label="부모님이 나를 부르는 이름" hint="예: 지은이, 우리 아들">
          <input className="input" required value={f.childName} onChange={set("childName")} placeholder="지은이" />
        </Field>
        <div className="row">
          <Field label="내가 부르는 호칭"><input className="input" required value={f.label} onChange={set("label")} /></Field>
          <Field label="질문 속 호칭"><input className="input" required value={f.honorific} onChange={set("honorific")} /></Field>
        </div>
        <Field label="부모님 휴대폰 번호" hint="첫 문자가 오면 그 번호를 부모님 폰에 '우리집 레코드'로 저장해 주세요. 그래야 링크가 바로 눌려요.">

          <input className="input" required inputMode="tel" value={f.phone} onChange={set("phone")} placeholder="010-0000-0000" />
        </Field>
        <div className="row">
          <Field label="보내는 요일">
            <select className="input" value={f.sendWeekday} onChange={set("sendWeekday")}>
              {WEEKDAYS.map((w, i) => <option key={i} value={i}>{w}요일</option>)}
            </select>
          </Field>
          <Field label="시간">
            <select className="input" value={f.sendHour} onChange={set("sendHour")}>
              {[8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20].map((h) => <option key={h} value={h}>{h}시</option>)}
            </select>
          </Field>
        </div>
        <Field label="이야기가 열리는 날" hint="그날까지 대답은 봉해둬요. 비워두면 바로 볼 수 있어요. (생신, 명절 추천)">
          <input className="input" type="date" value={f.unsealAt} onChange={set("unsealAt")} />
        </Field>

        <div className="section" style={{ marginTop: 18 }}>부모님에 대해 조금만 (맞춤 질문에 써요)</div>
        <Field label="태어난 해" hint="질문 속 '그때'를 정확히 짚는 데 써요"><input className="input" inputMode="numeric" value={f.born} onChange={set("born")} placeholder="예: 1962" /></Field>
        <Field label="다니신 학교·전공 (아시면)"><input className="input" value={f.school} onChange={set("school")} placeholder="예: 순천여고, 경희대 국문과" /></Field>
        <Field label="고향"><input className="input" value={f.hometown} onChange={set("hometown")} placeholder="예: 전남 순천" /></Field>
        <Field label="젊을 때 하셨던 일"><input className="input" value={f.job} onChange={set("job")} placeholder="예: 섬유공장, 미용실" /></Field>
        <Field label="좋아하시는 것"><input className="input" value={f.likes} onChange={set("likes")} placeholder="예: 트로트, 등산, 화초" /></Field>

        {err && <p className="err">{err}</p>}
        {saved && <p className="small" style={{ color: "var(--primary)" }}>저장했어요.</p>}
        <button className="btn" disabled={busy}>{busy ? "저장 중…" : isNew ? "다음: 질문 고르기" : "저장"}</button>
        {!isNew && (
          <button type="button" className="link" onClick={async () => { await browserClient().auth.signOut(); router.replace("/"); }}>
            로그아웃
          </button>
        )}
      </form>
    </main>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="field" style={{ flex: 1 }}>
      <label>{label}</label>
      {children}
      {hint && <span className="tiny muted">{hint}</span>}
    </div>
  );
}
