"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { browserClient } from "@/lib/supabaseBrowser";

const TABS = [
  { href: "/app", label: "질문함" },
  { href: "/app/stories", label: "이야기" },
  { href: "/app/family", label: "가족" },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const path = usePathname();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const sb = browserClient();
    // 메일 링크로 들어오면 주소의 토큰을 세션으로 바꾸는 데 잠깐 걸린다
    const { data: sub } = sb.auth.onAuthStateChange((_e, s) => s && setReady(true));
    sb.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
      else setTimeout(async () => {
        const again = await sb.auth.getSession();
        if (again.data.session) setReady(true);
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
  const hideTabs = path === "/app/pick";
  return (
    <>
      {children}
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
