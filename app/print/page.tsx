"use client";
// 인쇄용 잡지: 이야기 탭의 내용을 220×290mm 지면으로 펼친다 → 브라우저 인쇄에서 'PDF로 저장'
// 표지 · 여는 편지 · 차례 · 연표 · 12호 기사 · 사진첩 · 알게 된/아직 모르는 · 가족의 말 · 맺음
import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import { api } from "@/lib/supabaseBrowser";
import { josa } from "@/lib/korean";
import { KOREA_YEARS } from "@/lib/eras";

type Art = {
  promptId: string; question: string; week: number | null; title: string; article: string | null; quote: string | null;
  photoUrl: string | null; selfieUrl: string | null; points: { head: string; text: string }[] | null;
  createdAt: string; token: string | null; turns: { transcript: string | null; mediaType: string; duration: number | null }[];
};
type Page =
  | { k: "cover" } | { k: "letter" } | { k: "toc" } | { k: "time"; half: 0 | 1 }
  | { k: "visual"; a: Art; no: number } | { k: "text"; a: Art; no: number; chunk: string; first: boolean; last: boolean }
  | { k: "album"; urls: string[] } | { k: "know" } | { k: "family"; n: number } | { k: "memo" } | { k: "end" };

const PER_TEXT_PAGE = 1650; // 본문 한 쪽 분량 (두 단, 10pt)
const n2 = (n: number) => String(n).padStart(2, "0");
const ym = (s: string) => (s ? `${s.slice(0, 4)}. ${Number(s.slice(5, 7))}` : "");

function chunks(text: string): string[] {
  const paras = text.split(/\n+/).map((p) => p.trim()).filter(Boolean);
  const out: string[] = [];
  let cur = "";
  for (const p of paras) {
    if (cur && (cur + p).length > PER_TEXT_PAGE) { out.push(cur); cur = ""; }
    if (p.length > PER_TEXT_PAGE) {
      // 아주 긴 문단은 문장 단위로 자른다
      for (const s of p.split(/(?<=[.?!요다])\s+/)) {
        if (cur && (cur + s).length > PER_TEXT_PAGE) { out.push(cur); cur = ""; }
        cur += (cur ? " " : "") + s;
      }
      cur += "\n";
    } else cur += p + "\n";
  }
  if (cur.trim()) out.push(cur);
  return out.length ? out.slice(0, 3) : [""]; // 한 호는 본문 최대 3쪽
}

export default function PrintMagazine() {
  const [st, setSt] = useState<any>(null);
  const [fam, setFam] = useState<any>(null);
  const [quiz, setQuiz] = useState<any[]>([]);
  const [err, setErr] = useState("");
  const [qr, setQr] = useState<Record<string, string>>({});
  const [letter, setLetter] = useState("");
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    Promise.all([api("/api/me/stories"), api("/api/me/family"), api("/api/me/quiz").catch(() => ({ records: [] }))])
      .then(([s, f, q]) => { setSt(s); setFam(f); setQuiz(q.records || []); })
      .catch((e) => setErr(e.message || "불러오지 못했어요"));
    try { setLetter(localStorage.getItem("vf_print_letter") || ""); } catch {}
    const fit = () => setZoom(Math.min(1, (window.innerWidth - 24) / 832));
    fit(); window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);

  const arts: Art[] = useMemo(() => [...((st?.articles || []) as Art[])].reverse(), [st]); // 창간호부터
  const label: string = st?.storyteller?.label || "부모님";
  const mag = st?.magazine || {};
  const name: string = mag.name || label;
  const prof = fam?.storyteller?.profile || {};
  const childName: string = fam?.family?.child_name || "";
  const born = parseInt(mag.born || "", 10) || 0;
  const childBorn = parseInt(String(prof["내가 태어난 해"] || "").replace(/\D/g, ""), 10) || 0;

  // QR: 호마다 '목소리 듣기' 주소
  useEffect(() => {
    const origin = window.location.origin;
    arts.forEach((a) => {
      if (!a.token || qr[a.promptId]) return;
      QRCode.toDataURL(`${origin}/l/${a.token}`, { margin: 0, width: 300, color: { dark: "#2F2B28", light: "#00000000" } })
        .then((u) => setQr((m) => ({ ...m, [a.promptId]: u })))
        .catch(() => {});
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [arts]);

  const pages: Page[] = useMemo(() => {
    if (!st) return [];
    const p: Page[] = [{ k: "cover" }, { k: "letter" }, { k: "toc" }];
    if (born > 1900) p.push({ k: "time", half: 0 }, { k: "time", half: 1 });
    arts.forEach((a, i) => {
      const no = a.week || i + 1;
      p.push({ k: "visual", a, no });
      const body = a.article || a.turns.map((t) => t.transcript).filter(Boolean).join("\n\n");
      const cs = chunks(body);
      cs.forEach((c, j) => p.push({ k: "text", a, no, chunk: c, first: j === 0, last: j === cs.length - 1 }));
    });
    const photos = Array.from(new Set(arts.flatMap((a) => [a.selfieUrl, a.photoUrl]).filter(Boolean) as string[]));
    for (let i = 0; i < photos.length; i += 6) p.push({ k: "album", urls: photos.slice(i, i + 6) });
    if (quiz.length) p.push({ k: "know" });
    p.push({ k: "family", n: 1 }, { k: "family", n: 2 });
    while ((p.length + 1) % 4) p.push({ k: "memo" }); // 제본은 4쪽 단위
    p.push({ k: "end" });
    return p;
  }, [st, arts, born, quiz.length]);

  if (err) return <main className="screen center"><p className="err">{err}</p></main>;
  if (!st) return <main className="screen center"><p className="muted">잡지를 펼치는 중…</p></main>;
  if (!arts.length) return <main className="screen center"><div className="grow" /><p className="serif">아직 실을 이야기가 없어요</p><div className="grow" /></main>;

  const pageOf = (promptId: string) => pages.findIndex((x) => x.k === "visual" && x.a.promptId === promptId) + 1;
  const timeRows = KOREA_YEARS.filter((e) => e.y >= born)
    .map((e) => ({ y: e.y, t: e.t, me: false }))
    .concat(childBorn > born ? [{ y: childBorn, t: `${josa(childName || "내", "이/가")} 태어나다`, me: true }] : [])
    .sort((a, b) => a.y - b.y);
  const half = Math.ceil(timeRows.length / 2);
  const saveLetter = (v: string) => { setLetter(v); try { localStorage.setItem("vf_print_letter", v); } catch {} };

  return (
    <div className="pm">
      <style>{CSS}</style>
      <div className="pm-bar">
        <div>
          <b>인쇄용 잡지 · {pages.length}쪽</b>
          <span>인쇄 창에서 대상 ‘PDF로 저장’, 여백 ‘없음’, ‘배경 그래픽’을 켜주세요. 2쪽 편지는 눌러서 직접 고칠 수 있어요</span>
        </div>
        <button className="btn sm" onClick={() => window.print()}>PDF로 저장</button>
      </div>

      <div className="pm-pages" style={{ zoom } as any}>
        {pages.map((pg, i) => {
          const no = i + 1;
          const foot = (t?: string) => <div className="pm-foot"><span>{t || "우리집 레코드"}</span><span>{no}</span></div>;
          switch (pg.k) {
            case "cover":
              return (
                <section key={i} className={`pp cover${mag.coverUrl ? "" : " plain"}`}>
                  {mag.coverUrl && <img src={mag.coverUrl} alt="" />}
                  <div className="shade" />
                  <div className="mast"><b>우리집 레코드</b><span>OUR HOUSE RECORD</span></div>
                  <span className="tag">{arts.length >= 12 ? "열두 번의 이야기" : `${arts.length}호까지`}</span>
                  <div className="lines">{arts.slice(0, 3).map((a, k) => <p key={k}><small>NO.{n2(a.week || k + 1)}</small>{a.title}</p>)}</div>
                  <h1 className="name" style={{ fontSize: name.length <= 3 ? "38mm" : name.length <= 5 ? "28mm" : "20mm" }}>{name}</h1>
                  <div className="sub"><b>{label}의 레코드</b>{[born ? `${born}년생` : "", mag.hometown || ""].filter(Boolean).join(" · ")}</div>
                </section>
              );
            case "letter":
              return (
                <section key={i} className="pp letter">
                  <p className="kick">여는 글</p>
                  <h2>{label}에게</h2>
                  <div
                    className="body" contentEditable suppressContentEditableWarning
                    onBlur={(e) => saveLetter(e.currentTarget.innerText)}
                  >{letter || `${label}의 이야기를 처음부터 끝까지 들은 건 이번이 처음이었어요.\n\n(여기를 눌러 ${label}께 드리는 편지를 적어주세요)`}</div>
                  <p className="sign">{childName ? `${childName} 드림` : ""}</p>
                  {foot()}
                </section>
              );
            case "toc":
              return (
                <section key={i} className="pp toc">
                  <p className="kick">차례</p>
                  <h2>{label}의 이야기</h2>
                  <ul>
                    {arts.map((a, k) => (
                      <li key={a.promptId}><span className="no">{n2(a.week || k + 1)}</span><span className="tt">{a.title}<small>{ym(a.createdAt)}</small></span><span className="pg">{pageOf(a.promptId)}</span></li>
                    ))}
                  </ul>
                  {foot()}
                </section>
              );
            case "time":
              return (
                <section key={i} className={`pp time${pg.half ? " r" : ""}`}>
                  {pg.half === 0 && <><p className="kick">연표</p><h2>{label}의 시간,<br />대한민국의 시간</h2></>}
                  <ol>
                    {(pg.half === 0 ? timeRows.slice(0, half) : timeRows.slice(half)).map((r) => (
                      <li key={r.y + r.t} className={r.me ? "me" : ""}>
                        <span className="y">{r.y}</span>
                        <span className="t">{r.t}</span>
                        <span className="age">{label} {r.y - born}살</span>
                      </li>
                    ))}
                  </ol>
                  {foot()}
                </section>
              );
            case "visual": {
              const img = pg.a.selfieUrl || pg.a.photoUrl;
              return (
                <section key={i} className={`pp visual${img ? "" : " noimg"}`}>
                  {img && <div className="ph"><img src={img} alt="" /></div>}
                  <div className="cap">
                    <span className="no">NO.{n2(pg.no)}</span>
                    <h2>{pg.a.title}</h2>
                    {pg.a.quote && <blockquote>“{pg.a.quote}”</blockquote>}
                    {!!pg.a.points?.length && (
                      <ul className="pts">{pg.a.points.slice(0, 3).map((x, k) => <li key={k}><b>{x.head}</b>{x.text}</li>)}</ul>
                    )}
                  </div>
                  {qr[pg.a.promptId] && <div className="qr"><img src={qr[pg.a.promptId]} alt="" /><span>{label}의 목소리 듣기</span></div>}
                  {foot(`NO.${n2(pg.no)} · ${ym(pg.a.createdAt)}`)}
                </section>
              );
            }
            case "text":
              return (
                <section key={i} className="pp text">
                  {pg.first && <p className="q">{pg.a.question}</p>}
                  <div className="cols">{pg.chunk.split("\n").filter(Boolean).map((t, k) => <p key={k}>{t}</p>)}</div>
                  {foot(pg.a.title)}
                </section>
              );
            case "album":
              return (
                <section key={i} className="pp album">
                  <p className="kick">사진첩</p>
                  <div className="grid">{pg.urls.map((u) => <div key={u}><img src={u} alt="" /></div>)}</div>
                  {foot()}
                </section>
              );
            case "know": {
              const knew = quiz.filter((r) => r.note);
              const yet = quiz.filter((r) => !r.note && !r.known).slice(0, 6);
              return (
                <section key={i} className="pp know">
                  <p className="kick">우리가 몰랐던 {label}</p>
                  {knew.length > 0 && <><h3>이번에 알게 된 것</h3><ul>{knew.slice(0, 6).map((r) => <li key={r.qkey}><b>{r.q}</b>{r.note}</li>)}</ul></>}
                  {yet.length > 0 && <><h3>다음에 꼭 여쭤볼 것</h3><ul className="blank">{yet.map((r) => <li key={r.qkey}><b>{r.q}</b><i /></li>)}</ul></>}
                  {foot()}
                </section>
              );
            }
            case "family":
              return (
                <section key={i} className="pp family">
                  <p className="kick">가족이 남기는 말</p>
                  {pg.n === 1 && <h2>{label}께</h2>}
                  {[0, 1].map((b) => <div key={b} className="box"><span>이름</span><i /><i /><i /><i /><i /><i /></div>)}
                  {foot()}
                </section>
              );
            case "memo":
              return <section key={i} className="pp memo"><p className="kick">메모</p>{Array.from({ length: 16 }, (_, k) => <i key={k} />)}{foot()}</section>;
            case "end":
              return (
                <section key={i} className="pp end">
                  <div className="grow" />
                  <p className="big">어디에도 적힌 적 없던<br />{label}의 이야기가<br />여기 남았어요</p>
                  <p className="meta">{name} · {arts.length}개의 이야기 · {ym(arts[arts.length - 1].createdAt)}</p>
                  <div className="grow" />
                  <p className="brand">우리집 레코드</p>
                </section>
              );
          }
        })}
      </div>
    </div>
  );
}

const CSS = `
@page { size: 220mm 290mm; margin: 0; }
.pm { background: #CFC7BB; min-height: 100vh; padding-bottom: 40px; }
.pm-bar { position: sticky; top: 0; z-index: 5; display: flex; gap: 12px; align-items: center; justify-content: space-between; padding: 12px 16px; background: #2F2B28; color: #F5F0E8; }
.pm-bar div { display: flex; flex-direction: column; gap: 2px; font-size: 13px; line-height: 1.5; }
.pm-bar b { font-size: 15px; }
.pm-bar span { opacity: .75; }
.pm-bar .btn { background: #F5F0E8; color: #2F2B28; flex-shrink: 0; }
.pm-pages { padding: 16px 12px; display: flex; flex-direction: column; align-items: center; gap: 14px; }
.pp { width: 220mm; height: 290mm; position: relative; overflow: hidden; background: #F5F0E8; color: #2F2B28; padding: 22mm 20mm 24mm; box-sizing: border-box; box-shadow: 0 8px 24px -12px rgba(0,0,0,.35); font-family: var(--sans); -webkit-print-color-adjust: exact; print-color-adjust: exact; display: flex; flex-direction: column; }
.pp h2 { font-family: var(--serif); font-weight: 600; font-size: 13mm; line-height: 1.3; margin: 0 0 12mm; letter-spacing: -.02em; word-break: keep-all; }
.pp .kick { margin: 0 0 4mm; font-size: 3.4mm; letter-spacing: .3em; color: #9A4E2A; font-weight: 700; }
.pp .grow { flex: 1; }
.pm-foot { position: absolute; left: 20mm; right: 20mm; bottom: 11mm; display: flex; justify-content: space-between; font-size: 3mm; letter-spacing: .12em; color: #77706A; }
.pm-foot span:first-child { max-width: 80%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.cover { padding: 0; background: #2F2B28; color: #F5F0E8; }
.cover > img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
.cover .shade { position: absolute; inset: 0; background: linear-gradient(180deg, rgba(0,0,0,.45) 0%, rgba(0,0,0,0) 28%, rgba(0,0,0,0) 55%, rgba(0,0,0,.6) 100%); }
.cover.plain { background: #9A4E2A; }
.cover .mast { position: absolute; top: 14mm; left: 16mm; right: 16mm; display: flex; justify-content: space-between; align-items: baseline; border-bottom: .4mm solid rgba(255,255,255,.8); padding-bottom: 3mm; }
.cover .mast b { font-family: var(--serif); font-size: 9mm; font-weight: 600; letter-spacing: -.02em; }
.cover .mast span { font-size: 2.8mm; letter-spacing: .32em; }
.cover .tag { position: absolute; top: 33mm; left: 16mm; background: #9A4E2A; color: #fff; font-size: 3.2mm; font-weight: 700; letter-spacing: .2em; padding: 1.8mm 3mm; }
.cover .lines { position: absolute; top: 33mm; right: 16mm; width: 62mm; text-align: right; }
.cover .lines p { margin: 0 0 3mm; font-family: var(--serif); font-size: 4mm; line-height: 1.4; text-shadow: 0 1px 6px rgba(0,0,0,.5); word-break: keep-all; }
.cover .lines small { display: block; font-family: var(--sans); font-size: 2.6mm; letter-spacing: .2em; opacity: .85; }
.cover .name { position: absolute; left: 14mm; right: 14mm; bottom: 28mm; margin: 0; font-family: var(--serif); font-weight: 600; line-height: 1; letter-spacing: -.04em; text-shadow: 0 2px 18px rgba(0,0,0,.35); }
.cover .sub { position: absolute; left: 16mm; bottom: 14mm; font-size: 3.4mm; line-height: 1.6; letter-spacing: .06em; }
.cover .sub b { display: block; font-size: 4.2mm; }

.letter .body { font-family: var(--serif); font-size: 5.2mm; line-height: 2; white-space: pre-line; word-break: keep-all; outline: none; border-left: .6mm solid #9A4E2A; padding-left: 7mm; }
.letter .sign { margin-top: 10mm; text-align: right; font-family: var(--serif); font-size: 5mm; }

.toc ul { list-style: none; margin: 0; padding: 0; }
.toc li { display: flex; align-items: baseline; gap: 6mm; padding: 4mm 0; border-bottom: .3mm solid #D6CDBF; }
.toc .no { font-family: Georgia, serif; font-size: 7mm; color: #9A4E2A; width: 12mm; }
.toc .tt { flex: 1; font-family: var(--serif); font-size: 5mm; line-height: 1.4; word-break: keep-all; }
.toc .tt small { display: block; font-family: var(--sans); font-size: 3mm; color: #77706A; margin-top: 1mm; }
.toc .pg { font-size: 3.6mm; color: #77706A; }

.time { background: #EDE5D8; }
.time.r { padding-top: 34mm; }
.time ol { list-style: none; margin: 0; padding: 0 0 0 6mm; border-left: .5mm solid #9A4E2A; }
.time li { position: relative; display: grid; grid-template-columns: 18mm 1fr 24mm; gap: 3mm; align-items: baseline; padding: 3.2mm 0; }
.time li::before { content: ""; position: absolute; left: -8.3mm; top: 5mm; width: 3.4mm; height: 3.4mm; border-radius: 50%; background: #F5F0E8; border: .5mm solid #9A4E2A; }
.time .y { font-family: Georgia, serif; font-size: 5.4mm; color: #9A4E2A; }
.time .t { font-family: var(--serif); font-size: 4.4mm; line-height: 1.45; word-break: keep-all; }
.time .age { font-size: 3.3mm; color: #77706A; text-align: right; }
.time li.me::before { background: #9A4E2A; }
.time li.me .t { font-weight: 700; color: #9A4E2A; }

.visual { padding: 0; }
.visual .ph { height: 160mm; overflow: hidden; }
.visual .ph img { width: 100%; height: 100%; object-fit: cover; display: block; }
.visual .cap { padding: 10mm 20mm 0; }
.visual.noimg { background: #9A4E2A; color: #F5F0E8; }
.visual.noimg .cap { padding-top: 40mm; }
.visual .no { font-family: Georgia, serif; font-size: 5mm; letter-spacing: .2em; color: #9A4E2A; }
.visual.noimg .no { color: #F0E2D4; }
.visual h2 { font-size: 9.5mm; margin: 3mm 0 5mm; }
.visual blockquote { margin: 0 0 6mm; font-family: var(--serif); font-size: 5.2mm; line-height: 1.6; word-break: keep-all; }
.visual .pts { list-style: none; margin: 0; padding: 0; display: grid; gap: 2.5mm; max-width: 140mm; }
.visual .pts li { font-size: 3.5mm; line-height: 1.55; }
.visual .pts b { display: block; font-size: 3.6mm; color: #9A4E2A; }
.visual.noimg .pts b { color: #F0E2D4; }
.visual .qr { position: absolute; right: 18mm; bottom: 18mm; width: 24mm; text-align: center; }
.visual .qr img { width: 22mm; height: 22mm; display: block; margin: 0 auto 1.5mm; background: #F5F0E8; padding: 1.5mm; }
.visual .qr span { font-size: 2.6mm; line-height: 1.3; display: block; }
.visual .pm-foot { color: inherit; opacity: .7; }

.text .q { margin: 0 0 8mm; font-family: var(--serif); font-size: 4.6mm; line-height: 1.6; color: #9A4E2A; word-break: keep-all; border-bottom: .3mm solid #D6CDBF; padding-bottom: 6mm; }
.text .cols { column-count: 2; column-gap: 9mm; font-size: 3.65mm; line-height: 1.9; text-align: left; word-break: keep-all; flex: 1; }
.text .cols p { margin: 0 0 3.5mm; }

.album .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6mm; flex: 1; }
.album .grid div { overflow: hidden; background: #E2DACD; }
.album .grid img { width: 100%; height: 100%; object-fit: cover; display: block; }

.know h3 { font-size: 4mm; color: #9A4E2A; margin: 6mm 0 3mm; letter-spacing: .1em; }
.know ul { list-style: none; margin: 0; padding: 0; }
.know li { padding: 3mm 0; border-bottom: .3mm solid #D6CDBF; font-size: 4mm; line-height: 1.6; }
.know li b { display: block; font-family: var(--serif); font-size: 4.4mm; }
.know .blank i { display: block; height: 9mm; border-bottom: .3mm dashed #B9AE9F; }

.family .box { flex: 1; border: .3mm solid #D6CDBF; border-radius: 3mm; padding: 6mm 8mm; margin-bottom: 6mm; display: flex; flex-direction: column; justify-content: space-around; background: #FBF8F3; }
.family .box span { font-size: 3mm; color: #77706A; }
.family .box i, .memo i { display: block; border-bottom: .3mm solid #D6CDBF; height: 8mm; }
.memo i { height: 12mm; }

.end { background: #2F2B28; color: #F5F0E8; align-items: center; text-align: center; }
.end .big { font-family: var(--serif); font-size: 9mm; line-height: 1.6; margin: 0; }
.end .meta { margin-top: 10mm; font-size: 3.4mm; letter-spacing: .1em; opacity: .7; }
.end .brand { font-family: var(--serif); font-size: 5mm; letter-spacing: .1em; opacity: .85; }

@media print {
  html, body { background: #fff !important; }
  .pm { background: none; padding: 0; }
  .pm-bar, .splash { display: none !important; }
  .pm-pages { zoom: 1 !important; padding: 0; gap: 0; display: block; }
  .pp { box-shadow: none; page-break-after: always; break-after: page; }
}
`;
