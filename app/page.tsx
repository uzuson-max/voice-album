import Link from "next/link";
import { LP } from "@/components/Illust";
import { APP_NAME } from "@/lib/brand";

export default function Landing() {
  return (
    <main className="screen center boxed" style={{ paddingTop: 90 }}>
      <LP size={150} />
      <p className="serif" style={{ fontSize: 22, margin: "28px 0 0" }}>{APP_NAME}</p>
      <h1 className="serif" style={{ fontSize: 30, lineHeight: 1.45, margin: "28px 0 0" }}>
        부모님의 이야기,
        <br />
        지금부터 모아두세요.
      </h1>
      <p className="muted" style={{ fontSize: 16, lineHeight: 1.75, marginTop: 18 }}>
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
