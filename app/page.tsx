import Link from "next/link";
import { LP } from "@/components/Illust";
import { APP_NAME } from "@/lib/brand";
import BizFooter from "@/components/BizFooter";

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
        화요일과 토요일, 부모님께 질문이 문자로 가요.
        <br />
        링크를 누르고 말씀만 하시면 끝.
        <br />
        12번이 모이면 목소리가 담긴 양장본이 집으로 가요.
      </p>
      <div className="grow" style={{ minHeight: 32 }} />
      <Link href="/login" className="btn">시작하기</Link>
      <a href="/s/demo" className="link" style={{ marginTop: 6 }}>부모님이 받는 화면 미리 보기</a>
      <BizFooter />
    </main>
  );
}
