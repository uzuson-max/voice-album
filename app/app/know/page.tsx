"use client";
import KnowSection from "@/components/KnowSection";

// 질문함 오른쪽 위 '아직 모르는 엄마' 버튼으로 들어오는 곳 — 오늘의 질문에서 '몰라요'를 누른 것들
export default function Know() {
  return (
    <main className="screen with-tabs">
      <a href="/app" className="link" style={{ alignSelf: "flex-start", margin: "0 0 10px" }}>← 질문함</a>
      <div style={{ background: "#F4F6F5", color: "#232B32", margin: "0 -22px", paddingBottom: 24, minHeight: "70vh" }}>
        <KnowSection />
      </div>
    </main>
  );
}
