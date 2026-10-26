import Link from "next/link";
import { APP_NAME, BIZ } from "@/lib/brand";

// 화면 하단 사업자 정보 (전자상거래법 표시 의무)
export default function BizFooter() {
  return (
    <footer className="biz">
      <nav className="row" style={{ gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
        <Link href="/terms">이용약관</Link>
        <Link href="/privacy"><b>개인정보처리방침</b></Link>
        <Link href="/refund">환불 정책</Link>
      </nav>
      <p>
        <span className="nw">{APP_NAME}</span> · <span className="nw">운영 {BIZ.name}</span> · <span className="nw">대표 {BIZ.owner}</span>
        <br />
        <span className="nw">사업자등록번호 {BIZ.regNo}</span> · <span className="nw">통신판매업 신고 {BIZ.mailOrderNo}</span>
        <br />
        <span className="nw">{BIZ.address}</span> · <span className="nw">문의 {BIZ.phone}</span>
      </p>
    </footer>
  );
}
