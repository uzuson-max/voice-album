import type { Q } from "./ai";

// 기본 질문 묶음 — 어린 시절부터 시간 순서로 떠나는 여행. 질문마다 '그때'를 짚는다. {h}=부모님 호칭, {c}=자녀 이름
// (부모님께 보낼 때 그 시절로 데려가는 빌드업이 자동으로 앞에 붙는다)
export const LIBRARY: Q[] = [
  { text: "{h}가 초등학생 때, 학교 끝나고 집에 가는 길에 제일 좋아했던 곳은 어디였어요?", format: "audio" },
  { text: "중학교 1학년 여름방학, {h}는 주로 누구랑 뭘 하면서 지냈어요?", format: "audio" },
  { text: "고등학생 때 {h}가 라디오나 카세트로 닳도록 듣던 노래는 뭐였어요? 그 노래 들으면 어디가 떠올라요?", format: "audio" },
  { text: "고등학교 3학년 때, {h}는 커서 뭐가 되고 싶었어요?", format: "audio" },
  { text: "스무 살 무렵 {h}가 처음 내 힘으로 돈을 벌었을 때, 그 돈으로 뭘 했어요?", format: "audio" },
  { text: "{h}가 젊었을 때 스스로 '나 이거 참 잘한다' 싶었던 건 뭐였어요?", format: "audio" },
  { text: "아빠(엄마)를 처음 만난 날, 그날 {h}는 어디서 뭘 입고 있었어요?", format: "audio" },
  { text: "{c}가 태어난 날, 처음 품에 안았을 때 {h}는 어떤 마음이었어요?", format: "video" },
  { text: "스무 살의 {h}가 지금의 {h}를 본다면, 뭐라고 말해줄 것 같아요?", format: "video" },
  { text: "{c}가 나중에 힘들 때 꺼내 볼 말 한마디만 들려주세요.", format: "video" },
];

export function fill(text: string, honorific: string, childName: string) {
  return text.split("{h}").join(honorific).split("{c}").join(childName);
}
