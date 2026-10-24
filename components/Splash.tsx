"use client";
import { useEffect, useState } from "react";
import { LP } from "./Illust";
import { APP_NAME } from "@/lib/brand";

// 앱을 열 때 한 번(세션당) 뜨는 웰컴 화면.
// 서버에서부터 바로 그려서 다른 화면이 먼저 비치지 않게 하고,
// 이미 본 세션이면 layout의 BOOT 스크립트가 html.no-splash로 숨긴다. 2초 뒤 저절로 사라진다.
export default function Splash() {
  const [show, setShow] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setShow(false), 2100);
    return () => clearTimeout(t);
  }, []);
  if (!show) return null;
  return (
    <div className="splash" role="status" aria-label={`${APP_NAME} 시작`}>
      <LP className="lp" />
      <div className="word">{APP_NAME}</div>
      <div className="tag">우리 가족의 B면을 기록해요</div>
    </div>
  );
}
