import "./globals.css";
import type { Metadata, Viewport } from "next";
import { APP_NAME } from "@/lib/brand";
import Splash from "@/components/Splash";

export const metadata: Metadata = {
  title: APP_NAME,
  description: "부모님의 목소리를, 지금부터 모아두세요.",
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#2E1418" };

const BOOT = `(function(){try{
var p=location.pathname,d=document.documentElement;
if((p==="/"||p==="/login")&&localStorage.getItem("vf-auth")&&!location.hash){d.style.visibility="hidden";location.replace("/app");return;}
if(sessionStorage.getItem("wr-splash")==="1")d.classList.add("no-splash");else sessionStorage.setItem("wr-splash","1");
}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        {/* 첫 화면이 그려지기 전에 실행: 로그인돼 있으면 바로 /app으로, 스플래시는 세션당 한 번 */}
        <script dangerouslySetInnerHTML={{ __html: BOOT }} />
        {/* 본문 Pretendard(쓰는 글자만 받는 버전), 명조 마루 부리는 /public/fonts 에서 */}
        <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard-dynamic-subset.min.css"
        />
        <link rel="preload" href="/fonts/MaruBuri-SemiBold.woff2" as="font" type="font/woff2" crossOrigin="" />
      </head>
      <body>
        <Splash />
        {children}
      </body>
    </html>
  );
}
