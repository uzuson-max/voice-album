"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

// '알아요?' 탭은 이야기 탭 안의 '아직 모르는 엄마'로 옮겼다 — 예전 링크로 와도 그쪽으로
export default function Know() {
  const router = useRouter();
  useEffect(() => { router.replace("/app/stories"); }, [router]);
  return null;
}
