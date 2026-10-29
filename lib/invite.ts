// lib/invite.ts
// 부모님께 첫 문자가 가기 전, 자녀가 자기 말로 먼저 보내는 카톡.
// 원칙: "기록"이 아니라 "궁금해서". 마지막·남기다·후회 같은 말은 쓰지 않는다.
// 자녀가 부르는 호칭(엄마/아빠)으로 쓴다. 고쳐서 보내는 게 기본이다.

import { josa } from "./korean";
import { APP_NAME } from "./brand";
import { SEND_DAYS_LABEL } from "./time";

export type InviteKind = "basic" | "shy" | "occasion";

export const INVITE_KINDS: { kind: InviteKind; label: string; desc: string }[] = [
  { kind: "basic", label: "기본", desc: "평소처럼 다정하게" },
  { kind: "shy", label: "무뚝뚝하게", desc: "서로 말이 많지 않은 사이" },
  { kind: "occasion", label: "기념일 선물", desc: "칠순·생신·퇴직·어버이날" },
];

// 같은 말이 금지어로 다시 들어가지 않게 — 화면에서 고친 문장을 검사할 때도 쓴다
export const AVOID_WORDS = ["마지막", "남기", "떠나", "사라지", "후회", "돌아가시", "기록", "미션", "과제", "숙제", "인터뷰"];

export function avoidHits(text: string): string[] {
  return AVOID_WORDS.filter((w) => text.includes(w));
}

export function inviteText(kind: InviteKind, label: string, occasion = "생신"): string {
  const p = (label || "엄마").trim();
  const heads = `곧 '${APP_NAME}'라는 번호로 문자가 갈 거야. 그 번호 저장해두면 링크가 바로 눌려.`;
  switch (kind) {
    case "shy":
      return (
        `${p}, 생각해보니 ${josa(p, "이/가")} 내 나이 때 뭐 했는지 하나도 모르더라.\n` +
        `그래서 질문을 몇 개 준비했어. ${SEND_DAYS_LABEL}에 링크가 가면 누르고 말로만 하면 돼. 글 안 써도 돼.\n` +
        `시간 날 때 해줘.\n\n${heads}`
      );
    case "occasion":
      return (
        `${p}, ${occasion} 선물로 이거 준비했어.\n` +
        `앞으로 ${SEND_DAYS_LABEL}에 내가 궁금했던 걸 하나씩 물어볼게. 링크 누르고 편하게 말해주면 돼.\n` +
        `다 모이면 ${p} 이야기로 책을 만들어서 보내줄게.\n\n${heads}`
      );
    default:
      return (
        `${p}, 나 요즘 ${p} 어릴 때 얘기가 너무 궁금해졌어.\n` +
        `그래서 질문을 준비해뒀는데, ${SEND_DAYS_LABEL}에 링크가 가면 편할 때 10분만 얘기해줘. 목소리로 하면 돼.\n` +
        `${p} 얘기 모아서 나중에 책으로 만들어줄게.\n\n${heads}`
      );
  }
}
