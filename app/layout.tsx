import "./globals.css";
import type { Metadata, Viewport } from "next";
import { APP_NAME } from "@/lib/brand";
import Splash from "@/components/Splash";

export const metadata: Metadata = {
  title: APP_NAME,
  description: "부모님의 목소리를, 지금부터 모아두세요.",
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#12231f" };

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
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700&family=Noto+Serif+KR:wght@600&family=Nanum+Pen+Script&display=swap"
        />
      </head>
      <body>
        <Splash />
        {children}
      </body>
    </html>
  );
}
