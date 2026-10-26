"use client";
// 부모님 링크의 배경 소리 — 링크를 열고 "이야기 시작하기"를 누르면 잔잔하게 깔린다.
// 1) public/ambient/bgm.mp3 가 있으면 그 음악을 반복 재생 (저작권 문제 없는 음원만 넣을 것)
// 2) 없으면 브라우저에서 직접 만든 소리: 느린 화음 + 가끔 울리는 피아노 음 + 아주 옅은 바람(풀) 소리
// 녹음·녹화가 시작되면 소리를 완전히 내려서 목소리에 섞이지 않게 하고, 끝나면 다시 올린다.

const FILE = "/ambient/bgm.mp3";
const LEVEL = 0.16; // 전체 크기 (말소리보다 확실히 작게)

type Engine = { setLevel: (v: number, sec: number) => void; stop: () => void };

let engine: Engine | null = null;
let muted = false;
let wanted = 0;

async function fileEngine(): Promise<Engine | null> {
  try {
    const head = await fetch(FILE, { method: "HEAD" });
    if (!head.ok) return null;
  } catch {
    return null;
  }
  const el = new Audio(FILE);
  el.loop = true;
  el.volume = 0;
  await el.play();
  let raf = 0;
  return {
    setLevel(v, sec) {
      cancelAnimationFrame(raf);
      const from = el.volume, t0 = performance.now();
      const step = () => {
        const k = Math.min(1, (performance.now() - t0) / (sec * 1000 || 1));
        el.volume = Math.max(0, Math.min(1, from + (v - from) * k));
        if (k < 1) raf = requestAnimationFrame(step);
      };
      step();
    },
    stop() { el.pause(); },
  };
}

function synthEngine(): Engine {
  const Ctx: any = (window as any).AudioContext || (window as any).webkitAudioContext;
  const ctx: AudioContext = new Ctx();
  const master = ctx.createGain();
  master.gain.value = 0;
  const tone = ctx.createBiquadFilter();
  tone.type = "lowpass";
  tone.frequency.value = 1800;
  tone.connect(master);
  master.connect(ctx.destination);

  // 아주 옅은 바람·풀 소리
  const len = ctx.sampleRate * 4;
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < len; i++) { last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02; d[i] = last * 3.2; }
  const noise = ctx.createBufferSource();
  noise.buffer = buf; noise.loop = true;
  const band = ctx.createBiquadFilter(); band.type = "bandpass"; band.frequency.value = 700; band.Q.value = 0.4;
  const windGain = ctx.createGain(); windGain.gain.value = 0.18;
  const lfo = ctx.createOscillator(); lfo.frequency.value = 0.07;
  const lfoAmt = ctx.createGain(); lfoAmt.gain.value = 0.1;
  lfo.connect(lfoAmt); lfoAmt.connect(windGain.gain);
  noise.connect(band); band.connect(windGain); windGain.connect(tone);
  noise.start(); lfo.start();

  // 느린 화음 (Cmaj7 → Am7 → Fmaj7 → G6), 8초마다 겹치며 바뀜
  const CHORDS = [[261.6, 329.6, 392.0, 493.9], [220.0, 261.6, 329.6, 392.0], [174.6, 220.0, 261.6, 329.6], [196.0, 246.9, 293.7, 329.6]];
  const PENTA = [523.3, 587.3, 659.3, 784.0, 880.0];
  let ci = 0;
  const timers: any[] = [];

  function chord() {
    const now = ctx.currentTime;
    for (const f of CHORDS[ci % CHORDS.length]) {
      for (const det of [-4, 4]) {
        const o = ctx.createOscillator();
        o.type = "triangle"; o.frequency.value = f / 2; o.detune.value = det;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0, now);
        g.gain.linearRampToValueAtTime(0.035, now + 3);
        g.gain.linearRampToValueAtTime(0.0, now + 11);
        o.connect(g); g.connect(tone);
        o.start(now); o.stop(now + 11.2);
      }
    }
    ci++;
  }
  function pluck() {
    const now = ctx.currentTime;
    const o = ctx.createOscillator();
    o.type = "sine"; o.frequency.value = PENTA[Math.floor(Math.random() * PENTA.length)];
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(0.06, now + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 3.5);
    o.connect(g); g.connect(tone);
    o.start(now); o.stop(now + 3.6);
    timers.push(setTimeout(pluck, 2500 + Math.random() * 4500));
  }
  chord();
  timers.push(setInterval(chord, 8000));
  timers.push(setTimeout(pluck, 3000));

  return {
    setLevel(v, sec) {
      const now = ctx.currentTime;
      master.gain.cancelScheduledValues(now);
      master.gain.setValueAtTime(master.gain.value, now);
      master.gain.linearRampToValueAtTime(v, now + Math.max(0.05, sec));
    },
    stop() { timers.forEach((t) => { clearTimeout(t); clearInterval(t); }); ctx.close().catch(() => {}); },
  };
}

// 반드시 버튼을 누르는 순간 불러야 한다 (휴대폰은 사용자가 누르기 전엔 소리를 막는다)
export async function startAmbient() {
  if (engine) { wanted = LEVEL; engine.setLevel(muted ? 0 : LEVEL, 3); return; }
  try {
    engine = (await fileEngine()) || synthEngine();
    wanted = LEVEL;
    engine.setLevel(muted ? 0 : LEVEL, 4);
  } catch {
    engine = null;
  }
}

/** 녹음 시작: 소리를 완전히 내린다 */
export function quietAmbient(sec = 1.2) {
  wanted = 0;
  engine?.setLevel(0, sec);
}

/** 녹음 끝: 다시 잔잔하게 */
export function resumeAmbient(sec = 3) {
  wanted = LEVEL;
  if (!muted) engine?.setLevel(LEVEL, sec);
}

export function stopAmbient(sec = 4) {
  const e = engine;
  engine = null;
  if (!e) return;
  e.setLevel(0, sec);
  setTimeout(() => e.stop(), sec * 1000 + 200);
}

export function toggleMute(): boolean {
  muted = !muted;
  engine?.setLevel(muted ? 0 : wanted, 0.6);
  return muted;
}
