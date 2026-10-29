// lib/check.ts
// 기사·요약이 저장되기 전 1차 검수 — 이름·호칭·인칭이 어긋나면 감정이 깨진다.
// 고칠 수 있는 건 바로 고치고, 사람이 봐야 할 건 flags로 남긴다 (1기는 재빈이 확인).

import { hasBatchim, josa, type Josa } from "./korean";

const PAIRS: [string, string, Josa][] = [
  ["가", "이", "이/가"],
  ["는", "은", "은/는"],
  ["를", "을", "을/를"],
  ["와", "과", "과/와"],
  ["랑", "이랑", "이랑/랑"],
];

function esc(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function checkText(
  text: string,
  v: { childName: string; honorific: string }
): { text: string; flags: string[] } {
  let t = text || "";
  const flags: string[] = [];
  const child = (v.childName || "").trim();
  const h = (v.honorific || "").trim();

  // 1) "재빈이" → AI가 "재빈가", "재빈는"처럼 '이'를 빼먹은 경우
  if (child.length >= 2 && child.endsWith("이") && hasBatchim(child.slice(0, -1))) {
    const base = child.slice(0, -1);
    for (const [wrong, , type] of PAIRS) {
      const re = new RegExp(`${esc(base)}${wrong}(?=[\\s.,!?…"”']|$)`, "g");
      if (re.test(t)) {
        t = t.replace(re, josa(child, type));
        flags.push(`이름 조사 고침: ${base}${wrong} → ${josa(child, type)}`);
      }
    }
  }

  // 2) 이름 바로 뒤 조사가 받침과 안 맞는 경우 ("재빈이는" OK, "민지은" 같은 것)
  if (child) {
    for (const [noB, withB, type] of PAIRS) {
      const wrong = hasBatchim(child) ? noB : withB;
      const re = new RegExp(`${esc(child)}${wrong}(?=[\\s.,!?…"”']|$)`, "g");
      if (re.test(t)) {
        t = t.replace(re, josa(child, type));
        flags.push(`이름 조사 고침: ${child}${wrong}`);
      }
    }
  }

  // 3) 3인칭 대명사 — 부모님을 "그녀/그"로 부르면 남의 이야기처럼 읽힌다
  if (h) {
    const fixes: [RegExp, string][] = [
      [/그녀의/g, `${h}의`],
      [/그녀는/g, josa(h, "은/는")],
      [/그녀가/g, josa(h, "이/가")],
      [/그녀를/g, josa(h, "을/를")],
      [/그녀/g, h],
    ];
    for (const [re, to] of fixes) {
      if (re.test(t)) {
        t = t.replace(re, to);
        if (!flags.includes("3인칭(그녀) 고침")) flags.push("3인칭(그녀) 고침");
      }
    }
    if (/(^|[\s"“])그(는|가|의|를)\s/.test(t)) flags.push("3인칭 '그'가 남아 있음 — 확인 필요");
  }

  // 4) 서비스 금지어 — 부재를 못박는 말
  for (const w of ["돌아가신", "세상을 떠", "유언", "마지막 인사"]) {
    if (t.includes(w)) flags.push(`무거운 표현: '${w}' — 확인 필요`);
  }

  return { text: t, flags };
}
