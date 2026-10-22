import type { Q } from "./ai";

// 기본 질문 묶음 — 가볍게 시작해서 뒤로 갈수록 깊어진다. {h}=부모님 호칭, {c}=자녀 이름
export const LIBRARY: Q[] = [
  { text: "{h}가 어릴 때 살던 동네에서 제일 좋아했던 곳은 어디예요?", format: "audio" },
  { text: "{h}가 처음 받은 월급으로 무엇을 사셨는지 궁금해요.", format: "audio" },
  { text: "중학생 때 {h}가 제일 즐겨 듣던 노래는 뭐였어요?", format: "audio" },
  { text: "지금 집에서 제일 오래된 물건 하나 들고, 그 이야기를 들려주세요.", format: "video" },
  { text: "{h}의 스무 살은 어떤 하루하루였어요?", format: "audio" },
  { text: "아빠(엄마)를 처음 만난 날, 첫인상이 어땠어요?", format: "audio" },
  { text: "{c}가 태어난 날, 처음 안았을 때 어떤 마음이셨어요?", format: "video" },
  { text: "{h} 인생에서 제일 용기 냈던 순간은 언제였어요?", format: "audio" },
  { text: "{c}가 나중에 힘들 때 꺼내 볼 말 한마디만 들려주세요.", format: "video" },
  { text: "열다섯 살의 {h}에게 지금 해주고 싶은 말이 있어요?", format: "video" },
];

export function fill(text: string, honorific: string, childName: string) {
  return text.split("{h}").join(honorific).split("{c}").join(childName);
}
