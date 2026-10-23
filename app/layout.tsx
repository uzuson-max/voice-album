import "./globals.css";
import type { Metadata, Viewport } from "next";
import { APP_NAME } from "@/lib/brand";
import Splash from "@/components/Splash";

export const metadata: Metadata = {
  title: APP_NAME,
  description: "부모님의 목소리를, 지금부터 모아두세요.",
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#12231f" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700&family=Noto+Serif+KR:wght@600&display=swap"
        />
      </head>
      <body>
        <Splash />
        {children}
      </body>
    </html>
  );
}
