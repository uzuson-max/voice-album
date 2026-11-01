"use client";
// 체험 끝: 방금 남긴 목소리 → 창간호 표지 → 목차 → 기사 → 양장본까지 한 번에 내려보는 안내
// 녹음·셀피는 이 화면 안에서만 쓰고 어디에도 올리지 않는다
import { Article, Mag, Cover, Issue, CSS, num2 } from "@/components/Magazine";
import { josa } from "@/lib/korean";

type Clip = { url: string; video: boolean };
type Props = { clips: Clip[]; selfie: string | null; honorific: string; childName: string; steps: string[] | null };

const WINE = "#6A2232";

export default function SampleStory({ clips, selfie, honorific, childName, steps }: Props) {
  const label = honorific || "엄마";
  const now = new Date().toISOString();

  const article: Article = {
    promptId: "sample-1",
    question: steps?.[0] || "",
    lead: null,
    week: 1,
    title: `${josa(label, "이/가")} 처음 ${josa(label, "이/가")} 된 날`,
    article: [
      `스물여섯, ${josa(label, "은/는")} 그해 봄 결혼해 단칸 셋방에서 막 살림을 시작한 참이었다. 아침마다 속이 울렁거려 체한 줄로만 알았다. 장 보러 나간 길에 동네 산부인과 간판이 눈에 들어와, 혼자 문을 열고 들어갔다.`,
      `"축하드려요" 소리가 무슨 말인지 한참 걸려서야 알아들었다. 병원 앞 공중전화로 외할머니께 전화를 걸었는데, 수화기 너머로 외할머니가 먼저 우셨다고 한다. 아빠한테는 저녁상을 차려놓고 밥 먹다가 말했다. 아빠는 숟가락을 내려놓고 한참 아무 말도 못 했다.`,
      `그날 밤 ${josa(label, "은/는")} 잠을 못 잤다. 나도 아직 애 같은데, 이 작은 게 나만 믿고 오는구나. 그 마음이 무섭기도 하고 든든하기도 했다고. 그렇게 ${josa(label, "은/는")}, 나를 만나기도 전에 ${josa(label, "이/가")} 되기 시작했다.`,
    ].join("\n\n"),
    quote: "병원 문 나서는데 다리가 막 후들거리더라. 좋은 건지 무서운 건지, 그것도 모르겠고",
    replyLead: null,
    replyAsk: null,
    summary: null,
    photoUrl: null,
    selfieUrl: selfie,
    points: [
      { head: "혼자 찾아간 동네 병원", text: "의사 선생님 말이 한 번에 안 들어와서 두 번을 되물었다." },
      { head: "제일 먼저 건 전화", text: "병원 앞 공중전화로 외할머니께. 아빠한테는 저녁상 앞에서 말했다." },
      { head: "그날 밤의 마음", text: "기쁨보다 겁이 먼저 났다. 내가 누굴 키울 수 있을까, 한참 잠을 못 잤다." },
    ],
    facts: [
      { num: "26", unit: "살", text: `${josa(label, "이/가")} 된 나이` },
      { num: "2", unit: "번", text: "의사 선생님께 되물은 횟수" },
      { num: "1", unit: "통", text: "제일 먼저 건 공중전화" },
    ],
    reactionText: null,
    reactionAudioUrl: null,
    createdAt: now,
    turns: clips.map((c, i) => ({
      id: `demo${i}`,
      asked: steps?.[i] || "",
      mediaType: c.video ? "video" : "audio",
      duration: null,
      transcript: null,
      url: c.url,
    })),
  };
  const mag: Mag = { coverUrl: selfie, custom: false, name: `우리 ${label}`, born: null, hometown: null };
  const noop = () => {};

  return (
    <div className="mz-wrap tour" style={{ "--mz": WINE } as any}>
      <style>{CSS + TOUR}</style>

      <div className="tour-top">
        <p className="k">체험은 여기까지예요</p>
        <h2>이 목소리가 {childName}에게<br />이렇게 도착해요</h2>
        <p>천천히 내려보세요</p>
        <span className="arrow">↓</span>
      </div>

      <Step n={1} title="방금 남긴 목소리예요" desc="이 화면을 닫으면 사라지고, 어디에도 저장되지 않아요" />
      {clips.length > 0 ? (
        <div className="tour-clips">
          {clips.map((c, i) => (
            <div key={i}>
              {steps?.[i] && <p className="asked">{["장면", "사람", "마음"][i] || `이야기 ${i + 1}`}</p>}
              {c.video ? <video src={c.url} controls playsInline /> : <audio src={c.url} controls />}
            </div>
          ))}
        </div>
      ) : (
        <p className="tour-empty">녹음을 남기면 여기서 바로 다시 들을 수 있어요</p>
      )}

      <Step
        n={2}
        title="첫 이야기를 마치면, 창간호 표지가 만들어져요"
        desc={selfie ? "방금 찍은 사진이 표지가 됐어요" : `녹음을 마치고 ${josa(label, "이/가")} 찍은 셀피가 표지가 돼요`}
      />
      <Cover mag={mag} label={label} arts={[article]} onSaved={noop} sample />

      <Step n={3} title="화요일·토요일마다 한 호씩 쌓여요" desc="12번이 모이면 한 권의 잡지가 돼요" />
      <section className="mz-toc" style={{ paddingTop: 8 }}>
        <ul>
          <li className="on"><span className="no">01</span><span className="tt">{article.title}<small>오늘 도착</small></span><span className="th none" /></li>
          {[2, 3].map((n) => (
            <li key={n} className="wait"><span className="no">{num2(n)}</span><span className="tt">다음 호 준비 중<small>{josa(label, "이/가")} 이야기를 마치면 실려요</small></span><span className="th none" /></li>
          ))}
          <li className="wait"><span className="no">…</span><span className="tt">12호까지</span><span className="th none" /></li>
        </ul>
      </section>

      <Step n={4} title="10분 남짓한 녹음이, 한 편의 기사가 돼요" desc={`${label}의 말 · 핵심 정리 · 글 · 숫자로 엮어요. 목소리는 기사 안에서 바로 다시 들을 수 있어요`} />
      <p className="tour-note">아래 글은 예시로 꾸민 기사예요. 실제로는 {josa(label, "이/가")} 하신 말씀으로 채워져요</p>
      <Issue a={article} n={1} label={label} name={mag.name} onSaved={noop} onMediaError={noop} sample />

      <Step n={5} title="12호가 모이면, 양장본이 집으로 가요" desc="손에 잡히는 한 권으로 평생 남겨요" />
      <div className="tour-book">
        <div className="book">
          <div className="spine" />
          <div className="face">
            {selfie && <img src={selfie} alt="" />}
            <div className="mast">우리집 레코드</div>
            <div className="nm">우리 {label}</div>
            <div className="vol">VOL. 01–12</div>
          </div>
        </div>
      </div>
      <ul className="tour-list">
        <li>장마다 QR이 있어 {label} 목소리를 다시 들을 수 있어요</li>
        <li>형제자매 몫으로 한 권씩 더 만들 수 있어요</li>
        <li>목소리·영상 원본은 언제든 내려받을 수 있어요</li>
      </ul>

      <div className="tour-cta">
        <a href="/app/plan" className="btn">구성과 가격 보기</a>
      </div>
    </div>
  );
}

function Step({ n, title, desc }: { n: number; title: string; desc?: string }) {
  return (
    <div className="tour-step">
      <span className="k">STEP {num2(n)}</span>
      <h3>{title}</h3>
      {desc && <p>{desc}</p>}
    </div>
  );
}

const TOUR = `
.mz-wrap.tour{margin:44px -22px 0;align-self:stretch;text-align:left;padding-bottom:36px}
.tour-top{padding:40px 20px 8px;text-align:center}
.tour-top .k{margin:0;font-size:13px;font-weight:700;letter-spacing:.14em;color:var(--mz)}
.tour-top h2{margin:12px 0 0;font-family:var(--serif);font-weight:700;font-size:27px;line-height:1.45;color:#141211;word-break:keep-all}
.tour-top p{margin:10px 0 0;font-size:15px;color:#6B625C}
.tour-top .arrow{display:block;margin-top:8px;font-size:22px;color:var(--mz);animation:tourBob 1.6s ease-in-out infinite}
@keyframes tourBob{0%,100%{transform:translateY(0)}50%{transform:translateY(6px)}}
.tour-step{margin-top:44px;padding:20px 20px 14px;border-top:2px solid #141211}
.tour-step .k{font-family:Georgia,serif;font-size:13px;letter-spacing:.16em;color:var(--mz);font-weight:700}
.tour-step h3{margin:8px 0 0;font-family:var(--serif);font-weight:700;font-size:22px;line-height:1.45;color:#141211;word-break:keep-all}
.tour-step p{margin:8px 0 0;font-size:15px;line-height:1.7;color:#6B625C;word-break:keep-all}
.tour-clips{padding:4px 20px 0;display:flex;flex-direction:column;gap:12px}
.tour-clips .asked{margin:0 0 6px;font-size:13px;font-weight:700;color:var(--mz);letter-spacing:.06em}
.tour-clips audio,.tour-clips video{width:100%}
.tour-clips video{border-radius:12px;background:#141211}
.tour-empty,.tour-note{margin:4px 20px 0;font-size:14px;line-height:1.7;color:#8A827B}
.tour-note{margin-bottom:-8px}
.tour .mz-art{margin-top:18px}
.tour-book{display:flex;justify-content:center;padding:28px 20px 10px;perspective:900px}
.tour-book .book{position:relative;width:200px;aspect-ratio:3/4.2;transform:rotateY(-22deg);transform-style:preserve-3d;box-shadow:24px 26px 34px -18px rgba(0,0,0,.55)}
.tour-book .spine{position:absolute;left:-16px;top:0;bottom:0;width:16px;background:linear-gradient(90deg,#3D1019,#5A1C27);transform:rotateY(-90deg);transform-origin:right}
.tour-book .face{position:absolute;inset:0;background:var(--mz);overflow:hidden;color:#F3E2C6;border-radius:2px 4px 4px 2px}
.tour-book .face img{position:absolute;inset:14px;width:calc(100% - 28px);height:calc(100% - 28px);object-fit:cover;opacity:.9}
.tour-book .face::after{content:"";position:absolute;inset:8px;border:1px solid rgba(243,226,198,.55)}
.tour-book .face>div{position:absolute;left:0;right:0;text-align:center;text-shadow:0 1px 6px rgba(0,0,0,.45)}
.tour-book .mast{top:24px;font-family:var(--serif);font-size:12px;letter-spacing:.24em}
.tour-book .nm{top:44%;font-family:var(--serif);font-weight:700;font-size:26px;letter-spacing:.06em}
.tour-book .vol{bottom:22px;font-family:Georgia,serif;font-size:10px;letter-spacing:.2em}
.tour-list{margin:22px 20px 0;padding:0;list-style:none}
.tour-list li{padding:12px 0 12px 22px;border-top:1px solid #D9D3CB;font-size:15px;line-height:1.6;color:#3A3431;position:relative;word-break:keep-all}
.tour-list li::before{content:"";position:absolute;left:4px;top:21px;width:7px;height:7px;border-radius:50%;background:var(--mz)}
.tour-cta{padding:30px 20px 0}
`;
