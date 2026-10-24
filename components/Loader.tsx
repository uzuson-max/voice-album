// 탭 처음 열 때 잠깐 보이는 로딩 화면 — 돌아가는 레코드판 + 깜빡이는 점
import { LP } from "./Illust";

export default function Loader({ label = "불러오는 중" }: { label?: string }) {
  return (
    <main className="screen center loader" role="status" aria-label={label}>
      <LP className="lp" />
      <p className="muted">{label}<span className="dots"><i>.</i><i>.</i><i>.</i></span></p>
    </main>
  );
}
