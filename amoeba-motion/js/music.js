// Original synthesized score + sound design for the amoeba film. Run: node js/music.js out.wav
// 96 BPM, D major with a modal drift to E minor / C lydian for the drought, all instruments synthesized here.
const fs = require('fs');
const { BAR, BEAT, DURATION, rng } = require('./core');

const SR = 48000;
const N = Math.ceil((DURATION + 1) * SR);
const TAU = Math.PI * 2;
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
const B = (b) => b * BAR;
const rnd = rng(1234);
const R = (a = 0, b = 1) => a + (b - a) * rnd();

const dryL = new Float32Array(N), dryR = new Float32Array(N);
const wetL = new Float32Array(N), wetR = new Float32Array(N);
function mixer(pan, gain, send) {
  const a = (pan + 1) * Math.PI / 4, gl = Math.cos(a) * gain, gr = Math.sin(a) * gain;
  return (i, l, r = l) => {
    if (i < 0 || i >= N) return;
    const L = l * gl, Rr = r * gr;
    dryL[i] += L; dryR[i] += Rr; wetL[i] += L * send; wetR[i] += Rr * send;
  };
}

// ---------- DSP blocks ----------
function blep(t, dt) {
  if (t < dt) { t /= dt; return t + t - t * t - 1; }
  if (t > 1 - dt) { t = (t - 1) / dt; return t * t + t + t + 1; }
  return 0;
}
class Saw { constructor(f, ph = rnd()) { this.p = ph; this.f = f; } tick(fm = 1) { const dt = this.f * fm / SR; let p = this.p + dt; if (p >= 1) p -= 1; this.p = p; return 2 * p - 1 - blep(p, dt); } }
class SVF {
  constructor() { this.a = 0; this.b = 0; this.set(1000, .7); }
  set(fc, q) { fc = Math.min(fc, SR * .45); const g = Math.tan(Math.PI * fc / SR), k = 1 / q; this.a1 = 1 / (1 + g * (g + k)); this.a2 = g * this.a1; this.a3 = g * this.a2; this.k = k; }
  tick(x) {
    const v3 = x - this.b, v1 = this.a1 * this.a + this.a2 * v3, v2 = this.b + this.a2 * this.a + this.a3 * v3;
    this.a = 2 * v1 - this.a; this.b = 2 * v2 - this.b; this.lp = v2; this.bp = v1; this.hp = x - this.k * v1 - v2; return v2;
  }
}
function adsr(t, dur, a, d, s, r) {
  if (t < 0) return 0;
  let v = t < a ? t / a : t < a + d ? 1 - (1 - s) * (t - a) / d : s;
  if (t > dur) v *= Math.max(0, 1 - (t - dur) / r);
  return v;
}
let ns = 1;
const white = () => { ns ^= ns << 13; ns ^= ns >>> 17; ns ^= ns << 5; return ((ns >>> 0) / 4294967296) * 2 - 1; };

// ---------- instruments ----------
// warm pad: detuned saws through a slowly breathing low-pass
function pad(notes, t0, dur, vel = 1, o = {}) {
  const len = Math.ceil((dur + (o.rel ?? 1.6)) * SR), s0 = Math.round(t0 * SR);
  for (const m of notes) {
    const f = mtof(m), saws = [new Saw(f * 1.004), new Saw(f * .996), new Saw(f * 1.0015)], fl = new SVF();
    const out = mixer(R(-.5, .5), .028 * vel * (o.gain ?? 1), o.send ?? .7);
    for (let i = 0; i < len; i++) {
      const t = i / SR;
      if ((i & 31) === 0) fl.set((o.cut ?? 1400) * (1 + .25 * Math.sin(TAU * .15 * (t0 + t))) * (o.cutEnv ? o.cutEnv(t0 + t) : 1), .7);
      const e = adsr(t, dur, o.atk ?? .9, .5, .85, o.rel ?? 1.6);
      out(s0 + i, fl.tick(saws[0].tick() + saws[1].tick() + saws[2].tick() * .6) * e);
    }
  }
}
// tine instrument: kalimba
function kalimba(m, t0, vel = 1, o = {}) {
  const f = mtof(m), len = Math.ceil(1.6 * SR), s0 = Math.round((t0 + R(-.004, .004)) * SR);
  const out = mixer(o.pan ?? R(-.4, .4), .16 * vel * (o.gain ?? 1), o.send ?? .4);
  let p1 = 0, p2 = 0, p3 = 0;
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    p1 += TAU * f / SR; p2 += TAU * f * 5.4 / SR; p3 += TAU * f * 2.01 / SR;
    const v = Math.sin(p1) * Math.exp(-t / .55) + .35 * Math.sin(p2) * Math.exp(-t / .04) + .12 * Math.sin(p3) * Math.exp(-t / .2);
    out(s0 + i, v * Math.min(1, t / .002));
  }
}
// soft-mallet marimba: bars tuned 1 : 4 : 10
function marimba(m, t0, vel = 1, o = {}) {
  const f = mtof(m), len = Math.ceil(1.4 * SR), s0 = Math.round((t0 + R(-.003, .003)) * SR);
  const out = mixer(o.pan ?? .15, .2 * vel * (o.gain ?? 1), o.send ?? .45);
  let p1 = 0, p2 = 0, p3 = 0;
  const d1 = .35 + 40 / f;
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    p1 += TAU * f / SR; p2 += TAU * f * 3.93 / SR; p3 += TAU * f * 9.8 / SR;
    const v = Math.sin(p1) * Math.exp(-t / d1) + .3 * vel * Math.sin(p2) * Math.exp(-t / .05) + .08 * vel * Math.sin(p3) * Math.exp(-t / .012);
    out(s0 + i, Math.tanh(v * 1.2) * Math.min(1, t / .003));
  }
}
// glassy celesta / bell
function bell(m, t0, vel = 1, o = {}) {
  const f = mtof(m), len = Math.ceil((o.len ?? 3) * SR), s0 = Math.round(t0 * SR);
  const out = mixer(o.pan ?? R(-.5, .5), .1 * vel * (o.gain ?? 1), o.send ?? .7);
  const parts = [[1, 1, 1.6], [2.0, .35, .7], [3.01, .12, .35], [4.17, .18, .25], [5.43, .06, .12]];
  const ph = parts.map(() => 0);
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    let v = 0;
    for (let k = 0; k < parts.length; k++) { ph[k] += TAU * f * parts[k][0] / SR; v += Math.sin(ph[k]) * parts[k][1] * Math.exp(-t / (parts[k][2] * (o.decay ?? 1))); }
    out(s0 + i, v * Math.min(1, t / .002));
  }
}
// plucked string (Karplus-Strong): pizzicato and bass
function pluck(m, t0, vel = 1, o = {}) {
  const f = mtof(m), L = Math.max(2, Math.round(SR / f)), buf = new Float32Array(L), len = Math.ceil((o.len ?? 1.2) * SR), s0 = Math.round(t0 * SR);
  const lp = new SVF(); lp.set(o.bright ?? 2400, .6);
  for (let i = 0; i < L; i++) buf[i] = lp.tick(white());
  const out = mixer(o.pan ?? 0, .5 * vel * (o.gain ?? 1), o.send ?? .25);
  const damp = o.damp ?? .996;
  let idx = 0, prev = 0;
  for (let i = 0; i < len; i++) {
    const cur = buf[idx], nxt = (cur + prev) * .5 * damp;
    prev = cur; buf[idx] = nxt; idx = (idx + 1) % L;
    out(s0 + i, cur * Math.min(1, (len - i) / (SR * .05)));
  }
}
function bass(m, t0, dur, vel = 1) {
  const f = mtof(m), len = Math.ceil((dur + .3) * SR), s0 = Math.round(t0 * SR), out = mixer(0, .34 * vel, .08);
  let p = 0;
  for (let i = 0; i < len; i++) {
    const t = i / SR; p += TAU * f / SR;
    const e = Math.min(1, t / .01) * Math.exp(-t / (dur * .9)) * (t > dur ? Math.exp(-(t - dur) / .08) : 1);
    out(s0 + i, Math.tanh((Math.sin(p) + .25 * Math.sin(2 * p)) * 1.3) * e);
  }
}
// ---------- percussion ----------
function shaker(t0, vel = 1, o = {}) {
  const len = Math.ceil(.12 * SR), s0 = Math.round(t0 * SR), bp = new SVF(); bp.set(6500, 1.4);
  const out = mixer(o.pan ?? .35, .08 * vel, .15);
  for (let i = 0; i < len; i++) { const t = i / SR; bp.tick(white()); out(s0 + i, bp.bp * Math.min(1, t / .012) * Math.exp(-t / .03)); }
}
function kick(t0, vel = 1) {
  const len = Math.ceil(.5 * SR), s0 = Math.round(t0 * SR), out = mixer(0, .5 * vel, .05);
  let p = 0;
  for (let i = 0; i < len; i++) { const t = i / SR; p += TAU * (48 + 90 * Math.exp(-t / .03)) / SR; out(s0 + i, Math.sin(p) * Math.exp(-t / .22)); }
}
function snap(t0, vel = 1) {
  const len = Math.ceil(.2 * SR), s0 = Math.round(t0 * SR), bp = new SVF(); bp.set(1800, 1.8);
  const out = mixer(-.2, .22 * vel, .35);
  for (let i = 0; i < len; i++) { const t = i / SR; bp.tick(white()); out(s0 + i, bp.bp * 2 * (Math.exp(-t / .02) + .4 * Math.exp(-(t - .012) * (t - .012) / .00002))); }
}
function wood(t0, vel = 1, pitch = 1) {
  const len = Math.ceil(.15 * SR), s0 = Math.round(t0 * SR), out = mixer(R(-.3, .3), .2 * vel, .3);
  let p = 0, p2 = 0;
  for (let i = 0; i < len; i++) { const t = i / SR; p += TAU * 1250 * pitch / SR; p2 += TAU * 2750 * pitch / SR; out(s0 + i, (Math.sin(p) + .4 * Math.sin(p2)) * Math.exp(-t / .025)); }
}
// ---------- sound design ----------
function bloop(t0, vel = 1, f0 = 320, f1 = 980) { // contractile vacuole squirt / bubbles
  const len = Math.ceil(.22 * SR), s0 = Math.round(t0 * SR), out = mixer(R(-.4, .4), .16 * vel, .4);
  let p = 0;
  for (let i = 0; i < len; i++) { const t = i / SR, u = t / .22; p += TAU * (f0 * Math.pow(f1 / f0, Math.pow(u, .6))) / SR; out(s0 + i, Math.sin(p) * Math.sin(Math.PI * Math.min(1, u * 1.3)) * Math.exp(-u * 2)); }
}
function gulp(t0, vel = 1) {
  const len = Math.ceil(.6 * SR), s0 = Math.round(t0 * SR), out = mixer(0, .35 * vel, .3), lp = new SVF();
  let p = 0;
  for (let i = 0; i < len; i++) {
    const t = i / SR; p += TAU * (420 * Math.exp(-t / .12) + 90) / SR;
    if ((i & 15) === 0) lp.set(300 + 1500 * Math.exp(-t / .1), 2);
    out(s0 + i, (Math.sin(p) * .9 + lp.tick(white()) * .4) * Math.min(1, t / .01) * Math.exp(-t / .16));
  }
}
function pop(t0, vel = 1, pitch = 1) { // a cell parting
  const len = Math.ceil(.35 * SR), s0 = Math.round(t0 * SR), out = mixer(R(-.3, .3), .3 * vel, .45), bp = new SVF(); bp.set(2200 * pitch, 1.5);
  let p = 0;
  for (let i = 0; i < len; i++) {
    const t = i / SR; p += TAU * (900 * pitch * Math.exp(-t / .03) + 260 * pitch) / SR;
    bp.tick(white());
    out(s0 + i, Math.sin(p) * Math.exp(-t / .07) * .8 + bp.bp * Math.exp(-t / .015) * .6);
  }
}
function sparkle(t0, dur, vel = 1, base = 84) { // pen tip shimmer while geometry is drawn
  const n = Math.floor(dur * 14);
  const scale = [0, 2, 4, 7, 9, 12, 14, 16, 19];
  for (let k = 0; k < n; k++) bell(base + scale[Math.floor(R(0, scale.length))], t0 + k / 14 + R(0, .03), .18 * vel * R(.5, 1), { len: 1.2, decay: .5, send: .85 });
}
function noiseSweep(t0, t1, f0, f1, vel = 1, o = {}) { // whooshes, wind, rain beds
  const len = Math.ceil((t1 - t0) * SR), s0 = Math.round(t0 * SR), bp = new SVF(), bp2 = new SVF();
  const out = mixer(0, .2 * vel, o.send ?? .5);
  for (let i = 0; i < len; i++) {
    const u = i / len;
    if ((i & 31) === 0) { const fc = f0 * Math.pow(f1 / f0, u) * (1 + (o.wob ?? 0) * Math.sin(TAU * .3 * u * (t1 - t0))); bp.set(fc, o.q ?? 1.2); bp2.set(fc * 1.06, o.q ?? 1.2); }
    const env = o.env ? o.env(u) : Math.sin(Math.PI * u);
    bp.tick(white()); bp2.tick(white());
    out(s0 + i, bp.bp * env, bp2.bp * env);
  }
}
function crickets(t0, t1, vel = 1) {
  for (let c = 0; c < 3; c++) {
    const f = 4200 + c * 500, pan = c - 1, out = mixer(pan * .6, .03 * vel, .5);
    for (let tc = t0 + c * .21; tc < t1; tc += .62 + c * .07) {
      const len = Math.ceil(.18 * SR), s0 = Math.round(tc * SR);
      let p = 0;
      for (let i = 0; i < len; i++) { const t = i / SR; p += TAU * f / SR; out(s0 + i, Math.sin(p) * (Math.sin(TAU * 32 * t) > 0 ? 1 : 0) * Math.sin(Math.PI * t / .18)); }
    }
  }
}
function crackle(t0, t1, density, vel = 1) {
  for (let t = t0; t < t1; t += R(.5, 1.5) / density) {
    const len = Math.ceil(.02 * SR), s0 = Math.round(t * SR), hp = new SVF(); hp.set(R(2000, 5000), 1);
    const out = mixer(R(-.7, .7), .12 * vel * R(.3, 1), .2);
    for (let i = 0; i < len; i++) { hp.tick(white()); out(s0 + i, hp.hp * Math.exp(-i / SR / .004)); }
  }
}
function sub(m, t0, dur, vel = 1) {
  const f = mtof(m), len = Math.ceil((dur + 1) * SR), s0 = Math.round(t0 * SR), out = mixer(0, .16 * vel, .2);
  let p = 0;
  for (let i = 0; i < len; i++) { const t = i / SR; p += TAU * f / SR; out(s0 + i, Math.sin(p) * adsr(t, dur, dur * .6, .1, 1, 1)); }
}

// =====================================================================
// HARMONY
// =====================================================================
const CH = {
  D: { root: 38, pad: [62, 66, 69, 73, 76], tones: [62, 66, 69, 74] },
  GD: { root: 38, pad: [62, 67, 71, 74, 78], tones: [62, 67, 71, 74] },
  Bm7: { root: 35, pad: [62, 66, 69, 71, 74], tones: [59, 62, 66, 69] },
  Gmaj7: { root: 31, pad: [59, 62, 66, 67, 71], tones: [55, 59, 62, 66] },
  A: { root: 33, pad: [61, 64, 69, 71, 76], tones: [57, 61, 64, 69] },
  Asus: { root: 33, pad: [62, 64, 69, 71, 76], tones: [57, 62, 64, 69] },
  Em9: { root: 28, pad: [59, 62, 66, 67, 71], tones: [52, 55, 59, 62] },
  Fsm7: { root: 30, pad: [61, 64, 66, 69, 73], tones: [54, 57, 61, 64] },
  Bm9: { root: 35, pad: [61, 62, 66, 69, 73], tones: [59, 62, 66, 69] },
  Cmaj7: { root: 36, pad: [59, 64, 66, 67, 71], tones: [60, 64, 67, 71] },
  Em: { root: 28, pad: [59, 64, 67, 71], tones: [52, 55, 59, 64] },
  G: { root: 31, pad: [59, 62, 67, 71], tones: [55, 59, 62, 67] },
};
const PROG = [
  [0, 'D'], [1, 'GD'], [2, 'D'], [3, 'Gmaj7'], [4, 'D'], [5, 'Bm7'], [6, 'Gmaj7'], [7, 'Asus'],
  [8, 'D'], [9, 'Bm7'], [10, 'Gmaj7'], [11, 'A'], [12, 'Fsm7'], [13, 'Bm9'], [14, 'Gmaj7'], [15, 'Em9'], [15.5, 'Asus'],
  [16, 'D'], [16.5, 'Em'], [17, 'Fsm7'], [17.5, 'G'],
  [18, 'Em9'], [19, 'Cmaj7'], [20, 'Em9'], [21, 'Cmaj7'], [22, 'Asus'], [22.5, 'D'], [23.5, 'Bm7'], [24.5, 'Gmaj7'], [25.5, 'A'], [26.5, 'D'], [27, 'D'],
];
const chordAt = (b) => { let c = PROG[0]; for (const p of PROG) if (p[0] <= b + 1e-9) c = p; return CH[c[1]]; };
const segs = PROG.slice(0, -1).map((p, i) => ({ a: p[0], b: PROG[i + 1][0], c: CH[p[1]] }));

// =====================================================================
// ARRANGEMENT
// =====================================================================
console.time('synth');
// --- pads all the way through, brightness following the story
for (const s of segs) {
  const b = s.a;
  let vel = 1, cut = 1500;
  if (b < 2) { vel = .9; cut = 900 + b * 300; }
  else if (b >= 6 && b < 7.6) { cut = 700; vel = 1.1; }
  else if (b >= 13 && b < 16) { cut = 650; vel = 1.15; }
  else if (b >= 18 && b < 21.5) { cut = 520; vel = 1.05; }
  else if (b >= 22.5) { cut = 2000; }
  pad(s.c.pad, B(s.a), B(s.b - s.a) + .1, vel, { cut, atk: b < 1 ? 2.2 : .6, rel: 1.4 });
}
sub(38, B(.9), B(1.1), .6);

// --- intro: pen-tip shimmer while the reticle is drawn, title bell chord
sparkle(.25, 1.2, .9, 86);
sparkle(1.3, 1.0, .7, 81);
for (let i = 0; i < 4; i++) bell([74, 78, 81, 85][i], 2.5 + i * .08, .6, { len: 4 });
bell(62, 2.5, .5, { len: 5, decay: 1.6 });
noiseSweep(2.8, 4.6, 400, 2400, .25, { env: (u) => Math.sin(Math.PI * u) * .6 });

// --- kalimba ostinato (pond, crawling, feeding, colony, rebirth, ring)
const KPAT = [0, 2, 1, 2, 3, 2, 1, 2];
function ostinato(b0, b1, vel = 1, o = {}) {
  for (let b = b0; b < b1 - 1e-6; b += .125) {
    const c = chordAt(b), i = Math.round((b - Math.floor(b)) * 8) % 8;
    const m = c.tones[KPAT[i]] + 12 + (o.oct ?? 0);
    kalimba(m, B(b), vel * (i % 2 ? .7 : 1) * (o.accent && i === 0 ? 1.2 : 1), { pan: i % 2 ? .35 : -.35 });
  }
}
ostinato(2, 6, .9);
ostinato(7.5, 13, .85);
ostinato(16, 18, 1.0);
ostinato(22.5, 26.5, 1.0);

// --- bass: plucked roots
function bassline(b0, b1, vel = 1, walk = false) {
  for (let b = b0; b < b1 - 1e-6; b += .5) {
    const c = chordAt(b), half = Math.round((b % 1) * 2);
    pluck(c.root + 12 + (half && walk ? 7 : 0), B(b), .9 * vel, { len: 1.1, bright: 1100, damp: .995, gain: 1.2 });
    bass(c.root + (half && walk ? 7 : 0), B(b), BEAT * 1.6, .7 * vel);
  }
}
bassline(2, 6, .9);
bassline(8, 13, 1, true);
bassline(16, 18, 1.1, true);
bassline(22.5, 26.5, 1, true);

// --- marimba theme
const THEME = [ // eighth-note grid, one row per bar (null = rest)
  [66, null, 69, null, 71, 69, 66, null],
  [64, null, 62, 64, 66, null, null, null],
  [67, null, 71, null, 74, 71, 69, null],
  [69, 67, 66, 64, 61, null, 64, null],
];
const THEME2 = [
  [74, null, 73, 71, 69, null, 66, null],
  [71, null, 69, 66, 64, null, 62, null],
  [67, 69, 71, null, 74, null, 76, 74],
  [73, null, 69, null, 64, 66, 69, null],
];
function theme(rows, b0, vel = 1, o = {}) {
  rows.forEach((row, r) => row.forEach((m, i) => { if (m) (o.inst ?? marimba)(m + (o.oct ?? 0), B(b0 + r + i / 8), vel * (o.rowVel ? o.rowVel[r] : 1) * (i % 2 ? .8 : 1)); }));
}
theme(THEME, 4, .9, { rowVel: [1, 1, .55, .65] });
theme(THEME2, 8, .8, { inst: (m, t, v) => pluck(m + 12, t, v * .45, { len: .5, bright: 4200, damp: .99, pan: .3, send: .35 }) });
theme(THEME2, 22.5, 1);
marimba(74, B(26.5), .9); marimba(62, B(26.5), .7);

// --- percussion
function groove(b0, b1, o = {}) {
  for (let b = b0; b < b1 - 1e-6; b += 1 / 16) {
    const i = Math.round((b - Math.floor(b)) * 16) % 16;
    const sw = i % 2 ? BEAT * .06 : 0;
    shaker(B(b) + sw, (i % 4 === 0 ? 1 : i % 2 ? .45 : .7) * (o.sh ?? 1));
    if (o.kick && (i === 0 || i === 8 || (o.busy && i === 11))) kick(B(b), .8);
    if (o.snap && (i === 4 || i === 12)) snap(B(b), .7);
  }
}
groove(2.5, 6, { sh: .6, kick: true });
groove(8, 11, { sh: .9, kick: true, snap: true });
groove(11, 13, { sh: 1, kick: true, snap: true, busy: true });
groove(16, 18, { sh: 1, kick: true, snap: true, busy: true });
groove(23, 26.5, { sh: .9, kick: true, snap: true });

// --- story SFX
noiseSweep(8.3, 9.4, 600, 3000, .5);                      // callout opens
for (let i = 0; i < 7; i++) wood(9.4 + i * .08, .3, 1.6);  // scale-bar ticks
noiseSweep(10.0, 11.3, 300, 4000, .7, { env: (u) => u * u }); // iris into the drop
for (let b = 3; b < 8; b++) bloop(B(b) + BAR * .82, b === 6 ? .3 : .6); // vacuole pulses (lens + crawl)
noiseSweep(14.4, 15.4, 3000, 300, .45);                     // into x-ray
[15.75, 16.25, 16.75, 17.25].forEach((t, i) => bell([81, 83, 86, 88][i], t, .5, { len: 2.5 }));
noiseSweep(17.8, 19.1, 300, 2600, .4, { env: (u) => u * u });
gulp(22.9, 1);
for (let i = 0; i < 10; i++) bell(93 + (i % 3) * 2, 24.9 + i * .08, .14, { len: .8, decay: .4 });
sparkle(26.0, 1.4, .5, 88);
for (let b = 8; b < 11; b++) bloop(B(b) + BAR * .82, .7);
for (let i = 0; i < 17; i++) wood(27.5 + i / 3.4, .35, 1 + (i % 5) * .04);  // tally of hours
noiseSweep(30.4, 32.5, 200, 5000, .6, { env: (u) => u * u * u });            // riser into fission
sub(35, 32.5, 7.5, .6);
for (let b = 13; b < 16; b += .5) kick(B(b), .45);                           // slow heartbeat under mitosis
sparkle(33.3, 1.4, .7, 79); sparkle(36.7, 1.4, .7, 83);
for (let i = 0; i < 9; i++) wood(35.5 + i * .06, .18, 2);
// the split, then the doublings climbing
pop(40.0, 1.2, .8); bell(74, 40.0, .8, { len: 4 }); bell(78, 40.0, .6, { len: 4 }); noiseSweep(39.2, 40.05, 500, 6000, .6, { env: (u) => u * u });
[41.25, 42.5, 43.75, 44.375].forEach((t, i) => { pop(t, 1, 1 + i * .25); bell([76, 78, 81, 83][i], t, .55, { len: 2.5 }); });
// drought
noiseSweep(45, 47.6, 1800, 250, .5, { q: .8 });                               // water draining away
for (let i = 0; i < 6; i++) wood(45.4 + i * .17, .25, .8);                    // sun-arc ticks
noiseSweep(45, 53.7, 500, 900, .45, { wob: .6, q: .6, env: (u) => Math.min(1, u * 4) * (1 - u * .4) }); // wind
crackle(47.5, 51, 14, .8);
sparkle(48.5, 1.3, .5, 76);
[50.2, 50.55, 50.9].forEach((t, i) => pop(t, .5, .7 + i * .15));
crickets(51.3, 53.7, 1);
[71, 69, 66, 64, 62].forEach((m, i) => bell(m + 12, 51.4 + i * .45, .35, { len: 3 }));  // lullaby
sub(40, 45, 8.7, .45);
// rain and rebirth
noiseSweep(53.75, 56.6, 1500, 5000, .9, { q: .5, env: (u) => Math.min(1, u * 3) * (1 - Math.max(0, u - .85) / .15) });
{
  const drops = [];
  for (let t = 53.75; t < 56.3; t += 1 / (6 + 28 * Math.min(1, (t - 53.75) / 2))) drops.push(t);
  const pent = [74, 76, 78, 81, 83, 86, 88, 90];
  drops.forEach((t) => bell(pent[Math.floor(R(0, pent.length))] + 12, t, .1 * R(.4, 1), { len: .6, decay: .25 }));
}
noiseSweep(55.5, 56.3, 300, 6000, .7, { env: (u) => u * u * u });
bell(62, 56.25, .7, { len: 5, decay: 1.4 }); bell(74, 56.25, .5, { len: 4 }); bell(78, 56.25, .4, { len: 4 }); bell(81, 56.25, .4, { len: 4 });
crackle(56.9, 57.9, 30, 1);
[58.0, 58.15, 58.3, 58.45, 58.6, 58.75].forEach((t, i) => pluck(74 + [0, 2, 4, 7, 9, 12][i], t, .5, { len: .6, bright: 5000, pan: -.6 + i * .24, send: .4 }));
// the ring: a bell for each station, the gold dot's lap, then back to one point
noiseSweep(61.0, 62.3, 4000, 400, .4);
[62.55, 62.73, 62.91, 63.09, 63.27].forEach((t, i) => bell([74, 76, 78, 81, 83][i], t, .55, { len: 3.5 }));
sparkle(63.3, 2.4, .35, 86);
noiseSweep(65.6, 67.0, 3000, 200, .35);
bell(62, 66.1, .6, { len: 4, decay: 1.6 }); bell(74, 66.1, .4, { len: 4 }); sub(38, 65.9, 1.4, .6);
// motion-cut extras: splashes, whooshes for the zoom-throughs, snaps and bursts
bloop(5.42, .5, 900, 300); noiseSweep(5.35, 5.75, 2500, 6000, .25); bloop(6.32, .6, 700, 200); noiseSweep(6.25, 6.7, 3000, 7000, .3);
noiseSweep(19.85, 20.55, 5000, 600, .35, { env: (u) => Math.pow(1 - u, 2) });
noiseSweep(44.0, 45.1, 4000, 300, .45, { env: (u) => Math.sin(Math.PI * u) });
noiseSweep(47.1, 47.8, 300, 3500, .4, { env: (u) => u * u });
[48.4, 48.54, 48.68].forEach((t, i) => pop(t, .3, 1.3 + i * .15));
pop(55.8, .8, .6); noiseSweep(55.8, 56.3, 6000, 1200, .35, { env: (u) => Math.pow(1 - u, 2) });
pop(57.9, 1, .9);
noiseSweep(65.2, 66.1, 500, 3000, .3, { env: (u) => u * u });
console.timeEnd('synth');

// ---------- reverb (8-line FDN hall) ----------
function fdn(inL, inR, rt = 2.6) {
  const lens = [1557, 1617, 1491, 1422, 1277, 1356, 1188, 1116].map((l) => Math.round(l * 1.7));
  const pre = Math.round(.02 * SR);
  const bufs = lens.map((l) => new Float32Array(l)), idx = lens.map(() => 0), lp = lens.map(() => 0);
  const g = lens.map((l) => Math.pow(10, -3 * l / (rt * SR)));
  const oL = new Float32Array(N), oR = new Float32Array(N), x = new Float64Array(8);
  for (let i = 0; i < N; i++) {
    const j = i - pre, il = j >= 0 ? inL[j] : 0, ir = j >= 0 ? inR[j] : 0;
    for (let k = 0; k < 8; k++) x[k] = bufs[k][idx[k]];
    for (let h = 1; h < 8; h <<= 1) for (let a = 0; a < 8; a += h << 1) for (let b = a; b < a + h; b++) { const u = x[b], v = x[b + h]; x[b] = u + v; x[b + h] = u - v; }
    let l = 0, r = 0;
    for (let k = 0; k < 8; k++) {
      const y = x[k] * .35355339;
      lp[k] += (y - lp[k]) * .5;
      const inp = (k & 1 ? ir : il) * (k < 4 ? 1 : -1);
      bufs[k][idx[k]] = lp[k] * g[k] + inp * .5;
      if (++idx[k] >= lens[k]) idx[k] = 0;
      if (k & 1) r += bufs[k][idx[k]]; else l += bufs[k][idx[k]];
    }
    oL[i] = l * .5; oR[i] = r * .5;
  }
  return [oL, oR];
}
const [rvL, rvR] = fdn(wetL, wetR);

// ---------- master ----------
const L = new Float32Array(N), Rr = new Float32Array(N);
for (let i = 0; i < N; i++) { L[i] = dryL[i] + rvL[i] * .6; Rr[i] = dryR[i] + rvR[i] * .6; }
{ let pl = 0, pr = 0, yl = 0, yr = 0; const a = Math.exp(-TAU * 28 / SR);
  for (let i = 0; i < N; i++) { const xl = L[i], xr = Rr[i]; yl = a * (yl + xl - pl); yr = a * (yr + xr - pr); pl = xl; pr = xr; L[i] = yl; Rr[i] = yr; } }
let peak = 0;
for (let i = 0; i < N; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(Rr[i]));
const pre = 1.5 / peak;
let env = 0, gr = 1;
const thr = .4, ratio = 2.5, atk = Math.exp(-1 / (.01 * SR)), relc = Math.exp(-1 / (.3 * SR));
for (let i = 0; i < N; i++) {
  const l = L[i] * pre, r = Rr[i] * pre, lvl = Math.max(Math.abs(l), Math.abs(r));
  env = lvl > env ? atk * env + (1 - atk) * lvl : relc * env + (1 - relc) * lvl;
  const target = env > thr ? Math.pow(env / thr, 1 / ratio - 1) : 1;
  gr = target < gr ? .995 * gr + .005 * target : .9995 * gr + .0005 * target;
  L[i] = Math.tanh(l * gr) * .9; Rr[i] = Math.tanh(r * gr) * .9;
}
const endS = Math.round(DURATION * SR);
for (let i = 0; i < endS; i++) { const t = i / SR, f = Math.min(1, t / .05) * (t > DURATION - 1.2 ? Math.max(0, (DURATION - t) / 1.2) : 1); L[i] *= f; Rr[i] *= f; }

const out = process.argv[2] || 'score.wav';
const buf = Buffer.alloc(44 + endS * 6);
buf.write('RIFF', 0); buf.writeUInt32LE(36 + endS * 6, 4); buf.write('WAVE', 8); buf.write('fmt ', 12);
buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22); buf.writeUInt32LE(SR, 24);
buf.writeUInt32LE(SR * 6, 28); buf.writeUInt16LE(6, 32); buf.writeUInt16LE(24, 34); buf.write('data', 36); buf.writeUInt32LE(endS * 6, 40);
for (let i = 0; i < endS; i++) {
  buf.writeIntLE(Math.round(Math.max(-1, Math.min(1, L[i])) * 8388607), 44 + i * 6, 3);
  buf.writeIntLE(Math.round(Math.max(-1, Math.min(1, Rr[i])) * 8388607), 47 + i * 6, 3);
}
fs.writeFileSync(out, buf);
console.log('wrote', out, (endS / SR).toFixed(2) + 's');
