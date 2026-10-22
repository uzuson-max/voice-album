import Link from "next/link";
import { Envelope } from "@/components/Illust";
import { APP_NAME } from "@/lib/brand";

export default function Landing() {
  return (
    <main className="screen center" style={{ paddingTop: 80 }}>
      <p className="small muted" style={{ fontWeight: 700, margin: 0 }}>{APP_NAME}</p>
      <div style={{ marginTop: 40 }}><Envelope /></div>
      <h1 className="serif" style={{ fontSize: 28, lineHeight: 1.5, margin: "36px 0 0" }}>
        부모님의 목소리,
        <br />
        지금부터 모아두세요.
      </h1>
      <p className="muted" style={{ fontSize: 16, lineHeight: 1.7, marginTop: 16 }}>
        매주 한 번, 부모님께 질문이 문자로 가요.
        <br />
        링크를 누르고 말씀만 하시면 끝.
        <br />
        이야기는 봉해두었다가 정한 날에 열려요.
      </p>
      <div className="grow" style={{ minHeight: 32 }} />
      <Link href="/login" className="btn">시작하기</Link>
    </main>
  );
}
