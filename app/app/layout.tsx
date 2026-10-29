"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { api, browserClient } from "@/lib/supabaseBrowser";
import QuizCard from "@/components/QuizCard";

const TABS = [
  { href: "/app", label: "질문함" },
  { href: "/app/stories", label: "이야기" },
  { href: "/app/know", label: "알아요?" },
  { href: "/app/family", label: "가족" },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const path = usePathname();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const sb = browserClient();
    // 메일 링크로 들어오면 주소의 토큰을 세션으로 바꾸는 데 잠깐 걸린다
    // 형제 초대 링크로 로그인하고 돌아온 경우: 기억해 둔 코드로 가족에 넣고 이야기 화면으로
    const join = async () => {
      let code: string | null = null;
      try { code = localStorage.getItem("vf-join"); } catch {}
      if (!code) return;
      try { localStorage.removeItem("vf-join"); } catch {}
      try {
        await api("/api/join", { method: "POST", body: JSON.stringify({ code }) });
        router.replace("/app/stories");
      } catch {}
    };
    // 가족에 먼저 넣고 화면을 연다 — 순서가 바뀌면 초대받은 형제가 부모님 등록 화면으로 간다
    let opened = false;
    const open = () => { if (opened) return; opened = true; join().finally(() => setReady(true)); };
    const { data: sub } = sb.auth.onAuthStateChange((_e, s) => s && open());
    sb.auth.getSession().then(({ data }) => {
      if (data.session) open();
      else setTimeout(async () => {
        const again = await sb.auth.getSession();
        if (again.data.session) open();
        else {
          // 만료된 로그인 흔적을 지워야 / ↔ /app 사이를 맴돌지 않는다
          try { localStorage.removeItem("vf-auth"); } catch {}
          router.replace("/login");
        }
      }, 1200);
    });
    return () => sub.subscription.unsubscribe();
  }, [router]);

  if (!ready) return <main className="screen" />;
  const hideTabs = path === "/app/pick" || path === "/app/invite";
  return (
    <>
      {children}
      {!hideTabs && <QuizCard />}
      {!hideTabs && (
        <nav className="tabbar" aria-label="주 메뉴">
          {TABS.map((t) => (
            <Link key={t.href} href={t.href} className={path === t.href ? "on" : ""} aria-current={path === t.href ? "page" : undefined}>
              {t.label}
            </Link>
          ))}
        </nav>
      )}
    </>
  );
}
