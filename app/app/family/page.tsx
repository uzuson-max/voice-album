"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, browserClient } from "@/lib/supabaseBrowser";
import { render, josa, isNickname } from "@/lib/korean";
import { buildCourse, CHOICES, PROFILE_KEYS as K } from "@/lib/questions";
import HonorificSheet from "@/components/HonorificSheet";
import CourseControls from "@/components/CourseControls";
import { LIMIT } from "@/lib/course";

const empty = {
  childName: "", label: "엄마", honorific: "어머니", phone: "", childPhone: "",
  sendWeekday: 2, sendHour: 9, unsealAt: "",
  born: "", hometown: "", job: "",
  childBorn: "", food: "", catchphrase: "", unsaid: "", coverName: "",
  me: "", order: "", teenPlace: "", at20: "", whenKid: "", leftHome: "", talk: "", avoid: "",
};
type F = typeof empty;

const HONORIFIC: Record<string, string> = { 엄마: "어머니", 아빠: "아버지" };
const HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];

// base: 예전에 받던 항목(학교·즐겨 하는 것 등)은 지우지 않고 그대로 둔다
function profileOf(f: F, base: Record<string, any> = {}) {
  return {
    ...base,
    [K.parentBorn]: f.born, [K.hometown]: f.hometown, [K.job]: f.job,
    [K.childBorn]: f.childBorn, [K.food]: f.food, [K.catchphrase]: f.catchphrase, [K.unsaid]: f.unsaid,
    "표지 이름": f.coverName,
    [K.me]: f.me, [K.order]: f.order, [K.teenPlace]: f.teenPlace, [K.at20]: f.at20,
    [K.whenKid]: f.whenKid, [K.leftHome]: f.leftHome, [K.talk]: f.talk, [K.avoid]: f.avoid,
  };
}

function fromProfile(p: Record<string, any>) {
  const g = (k: string) => String(p[k] ?? "");
  return {
    born: g(K.parentBorn), hometown: g(K.hometown), job: g(K.job) || g("했던 일"),
    childBorn: g(K.childBorn), food: g(K.food), catchphrase: g(K.catchphrase), unsaid: g(K.unsaid), coverName: g("표지 이름"),
    me: g(K.me), order: g(K.order), teenPlace: g(K.teenPlace), at20: g(K.at20),
    whenKid: g(K.whenKid), leftHome: g(K.leftHome), talk: g(K.talk), avoid: g(K.avoid),
  };
}

// 아들·딸 + 몇째 → 부모님이 실제로 부를 법한 이름 후보
function nameIdeas(me: string, order: string) {
  if (!me) return [];
  const big = me === "딸" ? "큰딸" : "큰아들";
  const ours = me === "딸" ? "우리 딸" : "우리 아들";
  if (order === "첫째") return [big, ours];
  if (order === "막내") return ["막내", ours];
  if (order === "중간") return ["둘째", ours];
  return [ours];
}

function varsOf(f: F) {
  const name = f.childName.trim() || "재빈";
  return {
    childGiven: name, childIsNickname: isNickname(name), parentTitle: f.label.trim() || "엄마",
    parentBirthYear: parseInt(f.born, 10) || 0, childBirthYear: parseInt(f.childBorn, 10) || 0,
  };
}

export default function Family() {
  const router = useRouter();
  const [f, setF] = useState<F>(empty);
  const [isNew, setIsNew] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [saved, setSaved] = useState(false);
  const [agree, setAgree] = useState(false);
  const [step, setStep] = useState(0);
  const [role, setRole] = useState<"owner" | "member" | null>(null);
  const [sheet, setSheet] = useState(false);
  const [changes, setChanges] = useState(0); // 호칭 바꾼 횟수
  const [base, setBase] = useState<Record<string, any>>({}); // 저장돼 있던 profile 원본

  useEffect(() => {
    api("/api/me/family").then(({ family, storyteller, role }) => {
      setRole(role);
      if (family && storyteller) {
        setIsNew(false);
        setChanges(storyteller.honorific_changes || 0);
        const p = storyteller.profile || {};
        setBase(p);
        setF({
          childName: family.child_name, label: storyteller.label, honorific: storyteller.honorific, phone: storyteller.phone, childPhone: family.child_phone || "",
          sendWeekday: storyteller.send_weekday, sendHour: storyteller.send_hour, unsealAt: storyteller.unseal_at || "",
          ...fromProfile(p),
        });
      }
    }).finally(() => setLoaded(true));
  }, []);

  const set = (k: keyof F) => (e: any) => setF({ ...f, [k]: e.target.value });
  const pick = (k: keyof F) => (val: string) => setF({ ...f, [k]: val });
  const p = f.label.trim() || "엄마";

  async function save(nf: F = f) {
    setBusy(true); setErr(""); setSaved(false);
    try {
      const r: any = await api("/api/me/family", {
        method: "POST",
        body: JSON.stringify({
          ...nf, sendWeekday: Number(nf.sendWeekday), sendHour: Number(nf.sendHour), unsealAt: null, agree,
          profile: profileOf(nf, base),
        }),
      });
      if (r?.storyteller) setChanges(r.storyteller.honorific_changes || 0);
      if (isNew) router.replace("/app/pick");
      else setSaved(true);
    } catch (e: any) {
      setErr(e.message);
    }
    setBusy(false);
  }

  if (!loaded) return <main className="screen" />;

  /* ───────── 초대받은 형제: 설정은 보기만 ───────── */
  if (!isNew && role === "member") {
    return (
      <main className="screen with-tabs">
        <div className="stack">
          <h1 className="h1">가족</h1>
          <div className="card stack" style={{ gap: 8 }}>
            <div style={{ fontWeight: 700 }}>{josa(p, "과/와")} 함께하는 우리 가족 이야기에 들어와 있어요</div>
            <div className="small muted" style={{ lineHeight: 1.7 }}>
              질문과 발송 설정은 처음 시작한 가족이 관리해요. 이야기는 함께 듣고, 답장도 같이 남길 수 있어요.
            </div>
          </div>
          <SiblingInvite label={p} />
          <button type="button" className="link" onClick={async () => { await browserClient().auth.signOut(); router.replace("/"); }}>로그아웃</button>
          <CourseControls label={p} />
        </div>
      </main>
    );
  }

  /* ───────── 기존 가족: 한 화면에서 고치기 ───────── */
  if (!isNew) {
    return (
      <main className="screen with-tabs">
        <form onSubmit={(e) => { e.preventDefault(); save(); }} className="stack">
          <h1 className="h1">가족</h1>
          <Field label={`${josa(p, "이/가")} 나를 부르는 이름`}><input className="input" required value={f.childName} onChange={set("childName")} /></Field>
          <NamePreview v={varsOf(f)} label={p} />
          <Field label="호칭" hint={changes >= LIMIT.honorificChanges ? "호칭은 이미 한 번 바꿨어요" : "누르면 어디에 어떻게 들어가는지 볼 수 있어요. 한 번만 바꿀 수 있어요."}>
            <button type="button" className="input" style={{ textAlign: "left" }} onClick={() => setSheet(true)}>{f.label} · 문자에는 {f.honorific}</button>
          </Field>
          <Field label="부모님 휴대폰 번호" hint="아직 담긴 이야기가 없을 때 번호를 고치면, 첫 초대장부터 다시 가요">
            <input className="input" required inputMode="tel" value={f.phone} onChange={set("phone")} />
          </Field>
          <Field label="내 휴대폰 번호 (선택)" hint="이야기가 도착하면 이 번호로 알려드려요. 다른 알림은 보내지 않아요.">
            <input className="input" inputMode="tel" value={f.childPhone} onChange={set("childPhone")} placeholder="010-0000-0000" />
          </Field>
          <Field label="질문이 가는 시간" hint="화요일과 토요일, 이 시간에 가요">
            <select className="input" value={f.sendHour} onChange={set("sendHour")}>
              {HOURS.map((h) => <option key={h} value={h}>{h}시</option>)}
            </select>
          </Field>
          <div className="row">
            <Field label="부모님이 태어난 해"><input className="input" inputMode="numeric" value={f.born} onChange={set("born")} /></Field>
            <Field label="내가 태어난 해"><input className="input" inputMode="numeric" value={f.childBorn} onChange={set("childBorn")} /></Field>
          </div>
          <Field label="잡지 표지에 들어갈 부모님 이름" hint="이야기 잡지 표지에 크게 들어가요. 비워두면 호칭으로 나와요.">
            <input className="input" value={f.coverName} onChange={set("coverName")} placeholder="김정숙" />
          </Field>
          <Field label={`${p} 음식 중 내 최애`}><input className="input" value={f.food} onChange={set("food")} /></Field>
          <Field label={`${p} 말버릇`}><input className="input" value={f.catchphrase} onChange={set("catchphrase")} /></Field>
          <Field label="나는"><Chips options={CHOICES.me} value={f.me} onChange={pick("me")} /><Chips options={CHOICES.order} value={f.order} onChange={pick("order")} /></Field>
          <Field label="10대 때 살던 곳"><Chips options={CHOICES.teenPlace} value={f.teenPlace} onChange={pick("teenPlace")} /></Field>
          <Field label="고향 (아는 경우만)"><input className="input" value={f.hometown} onChange={set("hometown")} /></Field>
          <Field label="스무 살 무렵"><Chips options={CHOICES.at20} value={f.at20} onChange={pick("at20")} /></Field>
          <Field label="결혼 전 했던 일"><Chips options={CHOICES.job} value={f.job} onChange={pick("job")} /><input className="input" value={f.job} onChange={set("job")} placeholder="직접 쓰기" /></Field>
          <Field label="내가 어릴 때"><Chips options={CHOICES.whenKid} value={f.whenKid} onChange={pick("whenKid")} /></Field>
          <Field label="내가 처음 집을 떠난 건"><Chips options={CHOICES.leftHome} value={f.leftHome} onChange={pick("leftHome")} /></Field>
          <Field label="말씀하실 때"><Chips options={CHOICES.talk} value={f.talk} onChange={pick("talk")} /></Field>
          <Field label="질문에서 비켜갈 이야기"><Chips multi options={CHOICES.avoid} value={f.avoid} onChange={pick("avoid")} /></Field>
          {err && <p className="err">{err}</p>}
          {saved && <p className="small" style={{ color: "var(--primary)" }}>저장했어요.</p>}
          <button className="btn" disabled={busy}>{busy ? "저장 중…" : "저장"}</button>
          <SiblingInvite label={p} />
          <button type="button" className="link" onClick={() => router.push("/app/pick")}>12번의 이야기 새로 설계하기</button>
          <CourseControls label={p} />
          <button type="button" className="link" onClick={async () => { await browserClient().auth.signOut(); router.replace("/"); }}>로그아웃</button>
        </form>
        <HonorificSheet
          open={sheet} label={f.label} honorific={f.honorific} childName={f.childName}
          locked={changes >= LIMIT.honorificChanges}
          onClose={() => setSheet(false)}
          onSave={(label, honorific) => {
            setSheet(false);
            if (label === f.label && honorific === f.honorific) return;
            if (!confirm(`호칭을 '${label} · ${honorific}'(으)로 바꿀까요?\n바꾸고 나면 더는 바꿀 수 없어요.`)) return;
            const nf = { ...f, label, honorific };
            setF(nf); save(nf);
          }}
        />
      </main>
    );
  }

  /* ───────── 처음 오신 분: 상담처럼 하나씩 ───────── */
  const v = varsOf(f);
  const years = v.parentBirthYear > 1900 && v.childBirthYear > v.parentBirthYear;
  const course = buildCourse({ childName: v.childGiven, label: p, profile: profileOf(f, base) });

  const steps: { title: string; why?: string; body: React.ReactNode; ok?: boolean; optional?: boolean }[] = [
    {
      title: "몇 가지만 여쭤볼게요",
      body: (
        <div className="stack" style={{ gap: 14 }}>
          <p className="serif" style={{ margin: 0, fontSize: 19, lineHeight: 1.65 }}>
            같은 질문도 누구에게 묻느냐에 따라 전혀 다른 이야기가 나와요.
          </p>
          <p className="small" style={{ margin: 0, lineHeight: 1.75 }}>
            여기 적어주시는 연도, 호칭, 음식, 말버릇이 그대로 질문 속 장면이 돼요.
            그래서 많이 알려주실수록 부모님이 받는 질문이 정확해지고, 대답과 기사도 깊어져요.
          </p>
          <p className="tiny muted" style={{ margin: 0 }}>3분 정도 걸려요. 모르는 건 넘어가도 문장이 어색해지지 않게 설계돼 있어요.</p>
        </div>
      ),
    },
    {
      title: "누구의 이야기를 남길까요?",
      why: "질문과 문자 속 호칭이 돼요.",
      ok: !!f.label.trim(),
      body: (
        <div className="stack" style={{ gap: 12 }}>
          <div className="row" style={{ gap: 8 }}>
            {["엄마", "아빠"].map((l) => (
              <button key={l} type="button" className="btn" style={f.label === l ? undefined : { background: "transparent", color: "inherit", border: "1px solid currentColor", boxShadow: "none" }} onClick={() => setF({ ...f, label: l, honorific: HONORIFIC[l] })}>
                {l}
              </button>
            ))}
          </div>
          <Field label="다르게 부르면 적어주세요" hint="누르면 어디에 어떻게 들어가는지 볼 수 있어요. 호칭은 시작한 뒤 한 번만 바꿀 수 있어요.">
            <input className="input" readOnly value={`${f.label} · 문자에는 ${f.honorific}`} onClick={() => setSheet(true)} onFocus={(e) => { e.currentTarget.blur(); setSheet(true); }} />
          </Field>
          <HonorificSheet
            open={sheet} isNew label={f.label} honorific={f.honorific} childName={f.childName}
            onClose={() => setSheet(false)}
            onSave={(label, honorific) => { setF({ ...f, label, honorific }); setSheet(false); }}
          />
        </div>
      ),
    },
    {
      title: `${josa(p, "이/가")} 나를 뭐라고 불러요?`,
      why: `${p}에게 가는 문자와 화면에 이 이름이 들어가요. 성은 빼고, 평소 부르는 그대로요.`,
      ok: !!f.childName.trim(),
      body: (
        <div className="stack" style={{ gap: 12 }}>
          <div className="stack" style={{ gap: 6 }}>
            <Chips options={CHOICES.me} value={f.me} onChange={pick("me")} />
            <Chips options={CHOICES.order} value={f.order} onChange={pick("order")} />
          </div>
          <input className="input" value={f.childName} onChange={set("childName")} placeholder="예: 재빈, 큰딸, 막내" />
          {nameIdeas(f.me, f.order).length > 0 && (
            <Chips options={nameIdeas(f.me, f.order)} value={f.childName} onChange={pick("childName")} />
          )}
          {f.childName.trim() && <NamePreview v={v} label={p} />}
        </div>
      ),
    },
    {
      title: "태어난 해를 알려주세요",
      why: `첫 질문이 "그해 ${josa(p, "은/는")} 몇 살이었는지"에서 시작해요. 연도가 정확할수록 ${josa(p, "이/가")} 그 시절로 바로 돌아가요.`,
      optional: true,
      body: (
        <div className="stack" style={{ gap: 12 }}>
          <Field label={`잡지 표지에 들어갈 ${p} 이름`} hint="표지에 크게 들어가요. 비워두면 호칭으로 나와요.">
            <input className="input" value={f.coverName} onChange={set("coverName")} placeholder="김정숙" />
          </Field>
          <div className="row">
            <Field label={`${josa(p, "이/가")} 태어난 해`}><input className="input" inputMode="numeric" value={f.born} onChange={set("born")} placeholder="1967" /></Field>
            <Field label="내가 태어난 해"><input className="input" inputMode="numeric" value={f.childBorn} onChange={set("childBorn")} placeholder="1997" /></Field>
          </div>
          {years && (
            <Preview label="이런 장면이 만들어져요" text={render("{childBirthYear}년, {parent:은/는} {age@childBirth:살}이었어요.", v)} />
          )}
        </div>
      ),
    },
    {
      title: `${p} 음식 중에 제일 좋아하는 건요?`,
      why: `${josa(p, "이/가")} 그 음식을 처음부터 영상으로 알려주는 회차가 돼요. 언젠가 다시 못 먹게 될 맛을 남기는 시간이에요.`,
      optional: true,
      body: (
        <div className="stack" style={{ gap: 10 }}>
          <Chips options={CHOICES.food} value={f.food} onChange={pick("food")} />
          <input className="input" value={f.food} onChange={set("food")} placeholder="없으면 직접 써주세요" />
        </div>
      ),
    },
    {
      title: `${josa(p, "이/가")} 맨날 하던 말이 있어요?`,
      why: "그 말을 왜 그렇게 자주 했는지, 그리고 지금 한 번만 해달라고 묻는 회차가 돼요.",
      optional: true,
      body: (
        <div className="stack" style={{ gap: 10 }}>
          <Chips options={CHOICES.catchphrase} value={f.catchphrase} onChange={pick("catchphrase")} />
          <input className="input" value={f.catchphrase} onChange={set("catchphrase")} placeholder={`${p} 말투 그대로 써주세요`} />
          {f.catchphrase.trim() && <Preview label="10번째 이야기가 이렇게 시작해요" text={render(`"${f.catchphrase.trim()}" {parent:이/가} 맨날 하던 그 말이요.`, v)} />}
        </div>
      ),
    },
    {
      title: `나를 낳기 전, ${p}의 시절`,
      why: `그 시절 장면을 그리는 데 써요. 확실하지 않으면 비워두세요. 비워둔 칸은 누구에게나 맞는 장면으로 가요.`,
      optional: true,
      body: (
        <div className="stack" style={{ gap: 16 }}>
          <Field label="10대 때 살던 곳"><Chips options={CHOICES.teenPlace} value={f.teenPlace} onChange={pick("teenPlace")} /></Field>
          {f.teenPlace && course[1].lead && <Preview label="2번째 이야기가 이렇게 시작해요" text={course[1].lead} />}
          <Field label="스무 살 무렵"><Chips options={CHOICES.at20} value={f.at20} onChange={pick("at20")} /></Field>
          <Field label="결혼 전에 했던 일" hint="가게 이름이나 회사 이름을 알면 직접 써주세요. 질문에 그대로 들어가요.">
            <Chips options={CHOICES.job} value={f.job} onChange={pick("job")} />
            <input className="input" value={f.job} onChange={set("job")} placeholder="예: 섬유공장, 동네 미용실" />
          </Field>
          <Field label="고향 (아는 경우만)"><input className="input" value={f.hometown} onChange={set("hometown")} placeholder="예: 전남 순천" /></Field>
        </div>
      ),
    },
    {
      title: `나를 키우던 시절의 ${p}`,
      why: "내가 기억하는 장면에서 질문이 출발해요. 그래야 둘 다 아는 그날로 같이 돌아가요.",
      optional: true,
      body: (
        <div className="stack" style={{ gap: 16 }}>
          <Field label={`내가 초등학생일 때 ${josa(p, "은/는")}`}><Chips options={CHOICES.whenKid} value={f.whenKid} onChange={pick("whenKid")} /></Field>
          <Field label="내가 처음 며칠 이상 집을 떠난 건"><Chips options={CHOICES.leftHome} value={f.leftHome} onChange={pick("leftHome")} /></Field>
          {f.leftHome && course[5].lead && <Preview label="6번째 이야기가 이렇게 시작해요" text={course[5].lead} />}
        </div>
      ),
    },
    {
      title: `${josa(p, "은/는")} 어떤 분이에요?`,
      why: "질문의 길이와 결을 맞추는 데 써요. 여기 적은 건 부모님께 보이지 않아요.",
      optional: true,
      body: (
        <div className="stack" style={{ gap: 16 }}>
          <Field label="이야기할 때"><Chips options={CHOICES.talk} value={f.talk} onChange={pick("talk")} /></Field>
          <Field label="질문에서 비켜갈 이야기" hint="여러 개 골라도 돼요. 이 주제는 꺼내지 않아요.">
            <Chips multi options={CHOICES.avoid} value={f.avoid} onChange={pick("avoid")} />
          </Field>
        </div>
      ),
    },
    {
      title: "질문을 어디로 보낼까요?",
      why: `화요일과 토요일, 정한 시간에 ${p} 휴대폰으로 문자가 가요.`,
      ok: f.phone.replace(/\D/g, "").length >= 10 && agree,
      body: (
        <div className="stack" style={{ gap: 12 }}>
          <Field label={`${p} 휴대폰 번호`} hint="첫 문자가 오면 이 번호를 '우리집 레코드'로 저장해 주세요. 그래야 링크가 바로 눌려요.">
            <input className="input" inputMode="tel" value={f.phone} onChange={set("phone")} placeholder="010-0000-0000" />
          </Field>
          <Field label="내 휴대폰 번호 (선택)" hint={`${josa(p, "이/가")} 이야기를 들려주면 이 번호로 알려드려요. 다른 알림은 보내지 않아요.`}>
            <input className="input" inputMode="tel" value={f.childPhone} onChange={set("childPhone")} placeholder="010-0000-0000" />
          </Field>
          <Field label="받으시기 편한 시간">
            <select className="input" value={f.sendHour} onChange={set("sendHour")}>
              {HOURS.map((h) => <option key={h} value={h}>{h}시</option>)}
            </select>
          </Field>
          <label className="row small" style={{ alignItems: "flex-start", gap: 10, lineHeight: 1.6 }}>
            <input type="checkbox" className="check" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
            <span>
              <a href="/terms" target="_blank">이용약관</a>과 <a href="/privacy" target="_blank">개인정보처리방침</a>에 동의하고,
              {" "}{p}에게 서비스를 알리고 동의를 받았어요. 서비스 개선을 위해 운영자가 녹음과 글을 볼 수 있다는 점도 확인했어요. (필수)
            </span>
          </label>
        </div>
      ),
    },
    {
      title: `${p}만을 위한 12번의 이야기가 설계됐어요`,
      why: "첫 두 질문은 이렇게 가요. 다음 화면에서 12번 전체를 볼 수 있어요.",
      body: (
        <div className="stack" style={{ gap: 12 }}>
          {course.slice(0, 2).map((w) => (
            <div key={w.week} className="card stack" style={{ gap: 8 }}>
              <span className="chip">{w.week}회차 · {w.format === "video" ? "영상" : "음성"}</span>
              {w.lead && <p className="small muted" style={{ margin: 0 }}>{w.lead}</p>}
              <p className="serif" style={{ margin: 0, fontSize: 17, lineHeight: 1.6 }}>{w.ask}</p>
            </div>
          ))}
          {err && <p className="err">{err}</p>}
        </div>
      ),
    },
  ];

  const s = steps[step];
  const last = step === steps.length - 1;
  const canNext = s.ok !== false;

  return (
    <main className="screen">
      <div className="stack" style={{ gap: 20, minHeight: "80vh" }}>
        <div style={{ height: 3, background: "rgba(127,127,127,.2)", borderRadius: 2 }}>
          <div style={{ height: 3, width: `${((step + 1) / steps.length) * 100}%`, background: "var(--primary)", borderRadius: 2, transition: "width .3s" }} />
        </div>
        <div className="stack" style={{ gap: 8 }}>
          <span className="tiny muted">{step === 0 ? "상담" : `${step} / ${steps.length - 1}`}</span>
          <h1 className="h1" style={{ margin: 0 }}>{s.title}</h1>
          {s.why && <p className="small muted" style={{ margin: 0, lineHeight: 1.7 }}>{s.why}</p>}
        </div>
        <div>{s.body}</div>
        <div className="grow" />
        <div className="stack" style={{ gap: 8, position: "sticky", bottom: 16 }}>
          {last ? (
            <button className="btn" disabled={busy} onClick={() => save()}>{busy ? "준비 중…" : "12번 전체 보기"}</button>
          ) : (
            <button className="btn" disabled={!canNext} onClick={() => setStep(step + 1)}>{step === 0 ? "시작할게요" : "다음"}</button>
          )}
          <div className="row" style={{ justifyContent: "space-between" }}>
            {step > 0 ? <button type="button" className="link" onClick={() => setStep(step - 1)}>이전</button> : <span />}
            {s.optional && <button type="button" className="link" onClick={() => setStep(step + 1)}>잘 모르겠어요, 넘어갈게요</button>}
          </div>
        </div>
      </div>
    </main>
  );
}

// 고르기 버튼 — 다시 누르면 해제. multi 면 '·'로 이어 저장
function Chips({ options, value, onChange, multi }: { options: readonly string[]; value: string; onChange: (v: string) => void; multi?: boolean }) {
  const sel = multi ? value.split("·").filter(Boolean) : [value];
  return (
    <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
      {options.map((o) => {
        const on = sel.includes(o);
        return (
          <button
            key={o} type="button" className={`btn sm${on ? "" : " soft"}`} style={{ flex: "0 0 auto", width: "auto" }}
            onClick={() => {
              if (!multi) return onChange(on ? "" : o);
              onChange((on ? sel.filter((x) => x !== o) : [...sel, o]).join("·"));
            }}
          >
            {o}
          </button>
        );
      })}
    </div>
  );
}

// 이름이 실제로 어떻게 들어가는지 — 호칭 팝업처럼 자리별로 보여준다
function NamePreview({ v, label }: { v: any; label: string }) {
  return (
    <div className="card stack" style={{ gap: 10 }}>
      <span className="tiny muted">{label}에게 이렇게 가요</span>
      <Ex where="문자" text={render("{child:이/가} 보낸 질문이 도착했어요", v)} />
      <Ex where="듣는 화면" text={render("{child:이/가} 꼭 듣고 싶어 했던 이야기예요", v)} />
      <Ex where={`${label} 목소리`} text={render("{child:아/야}", v)} />
      <span className="tiny muted">어색하면 고쳐 써보세요. 재빈, 재빈이 어느 쪽으로 써도 {label} 말투로 맞춰져요.</span>
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

function Preview({ label, text }: { label: string; text: string }) {
  return (
    <div className="card stack" style={{ gap: 6 }}>
      <span className="tiny muted">{label}</span>
      <p className="serif" style={{ margin: 0, fontSize: 17, lineHeight: 1.6 }}>{text}</p>
    </div>
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

// 형제 초대: 링크 하나로 같은 이야기칸을 함께 본다. 비용은 결제 화면의 "1인당" 안내로.
function SiblingInvite({ label }: { label: string }) {
  const [url, setUrl] = useState("");
  const [members, setMembers] = useState(0);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function make() {
    setBusy(true); setMsg("");
    try {
      const r = await api("/api/me/invite-sibling", { method: "POST" });
      setUrl(r.url); setMembers(r.members);
      return r.url as string;
    } catch (e: any) {
      setMsg(e.message);
      return "";
    } finally {
      setBusy(false);
    }
  }

  async function share() {
    const link = url || (await make());
    if (!link) return;
    const text = `${label} 이야기, 같이 듣자. 아래 링크 누르고 카카오로 들어오면 돼.\n${link}`;
    try {
      if (navigator.share) { await navigator.share({ text }); return; }
    } catch { return; }
    try { await navigator.clipboard.writeText(text); setMsg("복사했어요. 카톡에 붙여넣어 보내주세요."); }
    catch { setMsg(link); }
  }

  return (
    <div className="card stack" style={{ gap: 8 }}>
      <div style={{ fontWeight: 700 }}>형제와 함께 듣기</div>
      <div className="small muted" style={{ lineHeight: 1.7 }}>
        링크를 받은 형제는 카카오로 들어오기만 하면 {label} 이야기를 같이 보고, 답장도 남길 수 있어요.
        {members > 0 && ` 지금 ${members}명이 함께하고 있어요.`}
      </div>
      <button type="button" className="btn sm" disabled={busy} onClick={share}>{busy ? "링크 만드는 중…" : "형제에게 초대 링크 보내기"}</button>
      {msg && <p className="small" style={{ margin: 0, wordBreak: "break-all" }}>{msg}</p>}
    </div>
  );
}
