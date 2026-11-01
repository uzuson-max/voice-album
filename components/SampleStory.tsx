"use client";
// 체험 끝: 방금 남긴 목소리 → 창간호 표지 → 목차 → 기사 → 양장본까지 한 번에 내려보는 안내
// 녹음·셀피는 이 화면 안에서만 쓰고 어디에도 올리지 않는다
import { Article, Mag, Cover, Issue, CSS, num2, FilmThumb, type SampleFilm } from "@/components/Magazine";
import { josa } from "@/lib/korean";

type Clip = { url: string; video: boolean };
type Props = { clips: Clip[]; childName: string; steps: string[] | null };

// 예시 사진: public/sample/ (가상의 부모님, AI 생성)
const IMG = "/sample/";
const MOM_FILMS: SampleFilm[] = [
  { img: IMG + "kimchi.jpg", cap: "김치 담그면서", dur: "12:40", title: "엄마 김치, 처음부터 끝까지", note: "제일 좋아하는 엄마 음식을 엄마가 직접 만들며 알려줘요. 언젠가 혼자 만들어볼 날이 오겠죠" },
  { img: IMG + "lullaby.jpg", cap: "자장가", dur: "3:12", title: "어릴 때 매일 밤 듣던 자장가", note: "엄마가 직접 불러주는 자장가를 남겨요. 유난히 마음이 무거운 날, 이 목소리가 나를 달래줄 거예요" },
];
const DAD_FILMS: SampleFilm[] = [
  { img: IMG + "bike.jpg", cap: "자전거 고치면서", dur: "6:05", title: "체인 빠졌을 때 거는 법", note: "뭐든 뚝딱 고쳐주던 아빠의 손을 그대로 남겨요. 우리가 기억하는 든든한 아빠예요" },
  { img: IMG + "bathroom.jpg", cap: "화장실 고치면서", dur: "8:20", title: "세면대 물 샐 땐 이렇게", note: "전구 갈기, 수도 고치기. 이제는 내가 해야 할 때, 아빠 목소리를 따라 해봐요" },
];

const WINE = "#6A2232";

export default function SampleStory({ clips, childName, steps }: Props) {
  const label = "엄마"; // 예시 잡지는 엄마 편으로 고정 (표지·영상 사진이 엄마)
  const cover = IMG + "cover.jpg";
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
    selfieUrl: cover,
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
  const mag: Mag = { coverUrl: cover, custom: false, name: `우리 ${label}`, born: null, hometown: null };
  const noop = () => {};
  // 12호가 모인 잡지 (마지막 실물 예시): 창간호와 같은 표지 틀에 12호까지의 제목이 실린다
  const TITLES = ["엄마의 자장가", "김치, 처음부터 끝까지", "스무 살, 거울 앞의 나", "아빠를 처음 만난 날"];
  const full: Article[] = Array.from({ length: 12 }, (_, i) => ({
    ...article,
    promptId: `sample-v${12 - i}`,
    week: 12 - i,
    title: TITLES[i] || article.title,
  }));

  return (
    <div className="mz-wrap tour" style={{ "--mz": WINE } as any}>
      <style>{CSS + TOUR}</style>

      {/* 첫 화면: 견본호 띠 + 베이지 종이 블록 */}
      <div className="t-band"><span>SAMPLE ISSUE</span><span>우리집 레코드 · 견본호</span></div>
      <header className="t-hero paper">
        <div className="t-hero-rule" />
        <h2>
          {label}의 목소리와 모습이
          <br />
          <em>{childName} 님</em>에게
          <br />
          이렇게 도착해요
        </h2>
        <p className="d">말로, 영상으로 남긴 이야기가 매번 한 편의 기사가 되고
          <br />열두 번이 모여 한 권의 잡지가 돼요</p>
        <ol className="t-index">
          <li><b>01</b>목소리·영상</li>
          <li><b>02</b>창간호 표지</li>
          <li><b>03</b>목차</li>
          <li><b>04</b>기사</li>
          <li><b>05</b>영상</li>
          <li><b>06</b>잡지 한 권</li>
        </ol>
        <span className="t-down">천천히 내려보세요<i>↓</i></span>
      </header>

      <section className="t-sec">
        <Step n={1} title="방금 남긴 이야기예요" desc="이 화면을 닫으면 사라지고, 어디에도 저장되지 않아요" />
        {clips.length > 0 ? (
          <div className="tour-clips">
            {clips.map((c, i) => (
              <div key={i} className="clip">
                <span className="pill">{steps?.[i] ? ["장면", "사람", "마음"][i] || `이야기 ${i + 1}` : c.video ? "영상" : "목소리"}</span>
                {c.video ? <video src={c.url} controls playsInline /> : <audio src={c.url} controls />}
              </div>
            ))}
          </div>
        ) : (
          <p className="tour-empty">녹음을 남기면 여기서 바로 다시 들을 수 있어요</p>
        )}
      </section>

      <section className="t-sec paper">
        <Step n={2} title="첫 이야기를 마치면, 창간호 표지가 만들어져요" desc={`녹음을 마친 날 찍은 ${label} 사진 한 장이, ${label}만의 잡지 표지가 돼요`} />
        <div className="t-frame"><Cover mag={mag} label={label} arts={[article]} onSaved={noop} sample /></div>
      </section>

      <section className="t-sec">
        <Step n={3} title="화요일·토요일마다 한 호씩 쌓여요" desc="12번이 모이면 한 권의 잡지가 돼요" />
        <section className="mz-toc t-toc">
          <ul>
            <li className="on"><span className="no">01</span><span className="tt">{article.title}<small>오늘 도착</small></span><span className="th none" /></li>
            {[2, 3].map((n) => (
              <li key={n} className="wait"><span className="no">{num2(n)}</span><span className="tt">다음 호 준비 중<small>{josa(label, "이/가")} 이야기를 마치면 실려요</small></span><span className="th none" /></li>
            ))}
            <li className="wait"><span className="no">…</span><span className="tt">12호까지</span><span className="th none" /></li>
          </ul>
        </section>
      </section>

      <section className="t-sec paper">
        <Step n={4} title="10분 남짓한 녹음이, 한 편의 기사가 돼요" desc={`${label}의 말 · 핵심 정리 · 글 · 숫자로 엮어요. 목소리는 기사 안에서 바로 다시 들을 수 있어요`} />
        <p className="tour-note">아래 글은 예시로 꾸민 기사예요. 실제로는 {josa(label, "이/가")} 하신 말씀으로 채워져요</p>
        <div className="t-sheet"><Issue a={article} n={1} label={label} name={mag.name} onSaved={noop} onMediaError={noop} sample films={MOM_FILMS} /></div>
      </section>

      <section className="t-sec dark">
        <Step n={5} title="인터뷰가 아니라, 평소 모습 그대로 남아요" desc="군대 이야기, 전구 가는 법, 고장 난 걸 고치던 손. 인터뷰 영상이 아니라 우리가 기억하는 그 모습 그대로예요" />
        <div className="tour-films">
          {DAD_FILMS.map((f) => <FilmThumb key={f.img} f={f} />)}
        </div>
      </section>

      <section className="t-sec paper">
        <Step n={6} title="12호가 모이면, 한 권의 잡지로 집에 도착해요" desc={`창간호부터 12호까지, ${label}만의 잡지를 손에 잡히는 책으로 엮어 보내드려요`} />
        <div className="tour-mag">
          <div className="back"><div className="in"><Cover mag={mag} label={label} arts={[article]} onSaved={noop} sample /></div></div>
          <div className="front"><div className="in"><Cover mag={mag} label={label} arts={full} onSaved={noop} sample /></div></div>
        </div>
        <ul className="tour-list">
          <li>장마다 QR이 있어 {label} 목소리를 다시 들을 수 있어요</li>
          <li>형제자매 몫으로 한 권씩 더 만들 수 있어요</li>
          <li>목소리·영상 원본은 언제든 내려받을 수 있어요</li>
        </ul>
      </section>

      <section className="tour-cta">
        <p className="k">OUR HOUSE RECORD</p>
        <h3>{label}의 열두 번의 이야기,<br />지금 시작할 수 있어요</h3>
        <a href="/app/plan" className="btn">구성과 가격 보기</a>
      </section>
    </div>
  );
}

function Step({ n, title, desc }: { n: number; title: string; desc?: string }) {
  return (
    <div className="tour-step">
      <div className="no"><span>STEP</span><b>{num2(n)}</b></div>
      <div className="tx">
        <h3>{title}</h3>
        {desc && <p>{desc}</p>}
      </div>
    </div>
  );
}

const TOUR = `
.mz-wrap.tour{margin:0 -22px;align-self:stretch;text-align:left;padding-bottom:0;background:#FBF8F3}
.tour .paper{background-color:#EFE5D3;background-image:radial-gradient(rgba(120,90,50,.07) 1px,transparent 1.2px),radial-gradient(rgba(255,255,255,.5) 1px,transparent 1.2px);background-size:7px 7px,11px 11px;background-position:0 0,3px 5px}
.t-band{display:flex;justify-content:space-between;align-items:center;background:var(--mz);color:#F3E2C6;padding:9px 20px;font-family:Georgia,serif;font-size:11px;letter-spacing:.2em}
.t-band span:last-child{font-family:var(--serif);letter-spacing:.12em}
.t-hero{position:relative;padding:34px 22px 30px;text-align:left;overflow:hidden}
.t-hero::after{content:"";position:absolute;right:-70px;top:-60px;width:220px;height:220px;border-radius:50%;background:repeating-radial-gradient(circle,rgba(106,34,50,.13) 0 1px,transparent 1px 7px);pointer-events:none}
.t-hero-rule{height:5px;border-top:2px solid #141211;border-bottom:1px solid #141211;margin-bottom:22px}
.t-hero .k{margin:0;display:inline-block;background:#141211;color:#EFE5D3;font-size:12px;font-weight:700;letter-spacing:.14em;padding:5px 10px}
.t-hero h2{margin:4px 0 0;font-family:var(--serif);font-weight:700;font-size:29px;line-height:1.42;color:#141211;letter-spacing:-.01em;word-break:keep-all}
.t-hero h2 em{font-style:normal;color:var(--mz);box-shadow:inset 0 -11px 0 rgba(106,34,50,.14)}
.t-hero .d{margin:16px 0 0;font-size:15px;line-height:1.75;color:#4A423D}
.t-index{list-style:none;margin:26px 0 0;padding:0;display:grid;grid-template-columns:1fr 1fr 1fr;border-top:1px solid #141211;border-left:1px solid #141211}
.t-index li{border-right:1px solid #141211;border-bottom:1px solid #141211;padding:9px 10px 10px;font-family:var(--serif);font-size:13.5px;font-weight:600;color:#141211;background:rgba(255,255,255,.35)}
.t-index li b{display:block;font-family:Georgia,serif;font-weight:400;font-size:12px;color:var(--mz);letter-spacing:.1em;margin-bottom:2px}
.t-down{display:flex;align-items:center;gap:10px;margin-top:22px;font-size:13px;color:#6B625C;letter-spacing:.06em}
.t-down i{font-style:normal;display:inline-flex;align-items:center;justify-content:center;width:30px;height:30px;border-radius:50%;background:var(--mz);color:#F3E2C6;animation:tourBob 1.6s ease-in-out infinite}
@keyframes tourBob{0%,100%{transform:translateY(0)}50%{transform:translateY(5px)}}
.t-sec{padding:6px 0 34px;border-top:1px solid rgba(20,18,17,.12)}
.t-sec.dark{background:#2A1418;color:#F3E2C6}
.tour-step{display:grid;grid-template-columns:62px 1fr;gap:14px;align-items:start;padding:30px 20px 16px}
.tour-step .no{background:var(--mz);color:#F3E2C6;text-align:center;padding:8px 0 9px;border-radius:2px;box-shadow:3px 3px 0 #141211}
.tour-step .no span{display:block;font-family:Georgia,serif;font-size:9.5px;letter-spacing:.2em;opacity:.85}
.tour-step .no b{display:block;font-family:Georgia,serif;font-weight:400;font-size:26px;line-height:1.05}
.tour-step h3{margin:2px 0 0;font-family:var(--serif);font-weight:700;font-size:21px;line-height:1.45;color:#141211;word-break:keep-all}
.tour-step p{margin:7px 0 0;font-size:14.5px;line-height:1.7;color:#6B625C;word-break:keep-all}
.t-sec.dark .tour-step h3{color:#F8EAD2}
.t-sec.dark .tour-step p{color:#CDB9A6}
.t-sec.dark .tour-step .no{background:#EFE5D3;color:var(--mz);box-shadow:3px 3px 0 #000}
.tour-clips{margin:4px 20px 0;padding:16px;background:#EFE5D3;border:1px solid #141211;display:flex;flex-direction:column;gap:14px}
.tour-clips .pill{display:inline-block;margin-bottom:7px;background:#141211;color:#EFE5D3;font-size:11px;font-weight:700;letter-spacing:.14em;padding:3px 8px}
.tour-clips audio,.tour-clips video{width:100%}
.tour-clips video{border-radius:4px;background:#141211}
.tour-empty,.tour-note{margin:2px 20px 0;font-size:13.5px;line-height:1.7;color:#8A827B}
.tour-note{padding:9px 12px;background:rgba(255,255,255,.55);border-left:3px solid var(--mz);margin-bottom:6px}
.t-frame{margin:6px 20px 0;padding:10px;background:#fff;box-shadow:0 18px 30px -18px rgba(0,0,0,.45),0 0 0 1px rgba(20,18,17,.08)}
.t-toc{margin:0 20px;padding:6px 16px 4px!important;background:#fff;border-top:4px solid var(--mz);box-shadow:0 0 0 1px rgba(20,18,17,.08)}
.t-sheet{margin:10px 12px 0;background:#F5F3EF;box-shadow:0 0 0 1px rgba(20,18,17,.08),0 20px 30px -22px rgba(0,0,0,.5)}
.tour .mz-art{margin-top:0}
.tour-mag{position:relative;height:420px;margin:24px 20px 6px;perspective:1100px}
.tour-mag>div{position:absolute;top:10px;width:260px;height:364px;overflow:hidden;border-radius:2px 5px 5px 2px;box-shadow:0 1px 0 #fff,1px 2px 0 #E9E3DA,2px 4px 0 #fff,3px 6px 0 #E3DCD2,22px 26px 34px -16px rgba(0,0,0,.5)}
.tour-mag .back{left:calc(50% - 175px);transform:rotate(-7deg) scale(.9);opacity:.92}
.tour-mag .front{left:calc(50% - 110px);transform:rotateY(-14deg) rotate(2deg)}
.tour-mag .front::after{content:"";position:absolute;inset:0;background:linear-gradient(105deg,rgba(255,255,255,.22) 0%,rgba(255,255,255,0) 22%,rgba(0,0,0,0) 80%,rgba(0,0,0,.12) 100%);pointer-events:none}
.tour-mag .in{width:390px;transform:scale(.6667);transform-origin:top left}
.tour-mag .in .mz-cover{margin:0}
.tour-list{margin:20px 20px 0;padding:0;list-style:none;background:#FBF8F3;border:1px solid #141211}
.tour-list li{padding:13px 14px 13px 36px;border-top:1px solid #D9D3CB;font-size:14.5px;line-height:1.6;color:#3A3431;position:relative;word-break:keep-all}
.tour-list li:first-child{border-top:0}
.tour-list li::before{content:"";position:absolute;left:14px;top:20px;width:9px;height:9px;background:var(--mz);transform:rotate(45deg)}
.tour-films{display:flex;flex-direction:column;gap:18px;padding:6px 20px 0}
.t-sec.dark .mz-frow .tx b{color:#F8EAD2}
.t-sec.dark .mz-frow .tx p{color:#CDB9A6}
.tour-films .mz-cap{font-size:12px;line-height:1.5;word-break:keep-all;color:#E6D5C0}
.tour-cta{background:var(--mz);color:#F3E2C6;padding:36px 22px 40px;text-align:center}
.tour-cta .k{margin:0;font-family:Georgia,serif;font-size:11px;letter-spacing:.24em;opacity:.8}
.tour-cta h3{margin:12px 0 22px;font-family:var(--serif);font-weight:700;font-size:23px;line-height:1.5;color:#FBF1DF;word-break:keep-all}
`;
