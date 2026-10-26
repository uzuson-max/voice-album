import Link from "next/link";
import BizFooter from "./BizFooter";

export default function LegalPage({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  return (
    <main className="screen legal">
      <Link href="/" className="tiny muted">← 처음으로</Link>
      <h1 className="h1" style={{ marginTop: 18 }}>{title}</h1>
      <p className="tiny muted">시행일 {updated}</p>
      <div className="legal-body">{children}</div>
      <BizFooter />
    </main>
  );
}
