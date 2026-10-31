// Fully synthesized orchestral-trailer score. Run: node js/music.js out.wav
const fs = require('fs');
const { BAR, BEAT, DURATION, rng } = require('./core');
const Q = require('./cues');

const SR = 48000;
const N = Math.ceil((DURATION + 1) * SR);
const TAU = Math.PI * 2;
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
const B = (b) => b * BAR;            // bar -> seconds
const rnd = rng(42);
const R = (a = 0, b = 1) => a + (b - a) * rnd();

const dryL = new Float32Array(N), dryR = new Float32Array(N);
const wetL = new Float32Array(N), wetR = new Float32Array(N);

// write mono/stereo sample into mix with constant-power pan + reverb send
function mixer(pan, gain, send) {
  const a = (pan + 1) * Math.PI / 4;
  const gl = Math.cos(a) * gain, gr = Math.sin(a) * gain;
  return (i, l, r = l) => {
    if (i < 0 || i >= N) return;
    const L = l * gl, Rr = r * gr;
    dryL[i] += L; dryR[i] += Rr; wetL[i] += L * send; wetR[i] += Rr * send;
  };
}

// ---------- DSP building blocks ----------
function blep(t, dt) {
  if (t < dt) { t /= dt; return t + t - t * t - 1; }
  if (t > 1 - dt) { t = (t - 1) / dt; return t * t + t + t + 1; }
  return 0;
}
class Saw {
  constructor(f, ph = rnd()) { this.p = ph; this.f = f; }
  tick(fm = 1) { const dt = this.f * fm / SR; let p = this.p + dt; if (p >= 1) p -= 1; this.p = p; return 2 * p - 1 - blep(p, dt); }
}
class SVF { // TPT state variable filter
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
let noiseState = 1;
const white = () => { noiseState ^= noiseState << 13; noiseState ^= noiseState >>> 17; noiseState ^= noiseState << 5; return ((noiseState >>> 0) / 4294967296) * 2 - 1; };

// ---------- instruments ----------
// lush string section (detuned saw ensemble)
function strings(m, t0, dur, vel = 1, o = {}) {
  const atk = o.atk ?? .5, rel = o.rel ?? 1.4, n = o.voices ?? 6, cut = o.cut ?? 2200, vib = o.vib ?? .0025;
  const f = mtof(m), saws = [];
  for (let k = 0; k < n; k++) saws.push(new Saw(f * Math.pow(2, (R(-1, 1) * (o.det ?? 11)) / 1200)));
  const fl = new SVF(), fr = new SVF();
  const len = Math.ceil((dur + rel) * SR), s0 = Math.round(t0 * SR);
  const out = mixer(o.pan ?? 0, .05 * vel * (o.gain ?? 1) / Math.sqrt(n), o.send ?? .4);
  const vr = 4.6 + R(0, .8), vp = R(0, 6);
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    if ((i & 31) === 0) {
      const c = cut * (0.55 + .45 * Math.min(1, t / (atk * 1.5))) * (o.swell ? 1 + o.swell * Math.min(1, t / dur) : 1);
      fl.set(c, .6); fr.set(c * 1.05, .6);
    }
    const fm = 1 + vib * Math.min(1, t / .6) * Math.sin(TAU * vr * t + vp);
    let l = 0, r = 0;
    for (let k = 0; k < n; k++) { const v = saws[k].tick(fm); if (k & 1) r += v; else l += v; }
    const e = adsr(t, dur, atk, .3, .9, rel) * (o.env ? o.env(t) : 1);
    out(s0 + i, fl.tick(l) * e, fr.tick(r) * e);
  }
}
// short bowed spiccato note
function spicc(m, t0, vel = 1, o = {}) {
  const f = mtof(m), s = [new Saw(f * 1.003), new Saw(f * .997), new Saw(f * 2.002, .3)];
  const fl = new SVF(), len = Math.ceil(.35 * SR), s0 = Math.round(t0 * SR);
  const out = mixer(o.pan ?? 0, .06 * vel, o.send ?? .3);
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    if ((i & 15) === 0) fl.set(500 + 3500 * vel * Math.exp(-t / .06), .8);
    const e = Math.min(1, t / .004) * Math.exp(-t / (o.dec ?? .11));
    out(s0 + i, fl.tick(s[0].tick() + s[1].tick() + .3 * s[2].tick()) * e);
  }
}
// french horns / trombones
function brass(m, t0, dur, vel = 1, o = {}) {
  const f = mtof(m), saws = [new Saw(f), new Saw(f * 1.004), new Saw(f * .996), new Saw(f * 1.5 * 1.001)];
  const fl = new SVF(), len = Math.ceil((dur + .8) * SR), s0 = Math.round(t0 * SR);
  const out = mixer(o.pan ?? 0, .07 * vel * (o.gain ?? 1), o.send ?? .4);
  const atk = o.atk ?? .12;
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    if ((i & 31) === 0) fl.set(300 + (o.cut ?? 1600) * vel * (Math.min(1, t / atk) * .8 + .2 * Math.exp(-t / .3)) * (o.blare ? 1.6 : 1), .9);
    const scoop = 1 - .01 * Math.exp(-t / .05);
    const x = saws[0].tick(scoop) + saws[1].tick(scoop) + saws[2].tick(scoop) + .15 * saws[3].tick(scoop);
    const e = adsr(t, dur, atk, .4, .8, o.rel ?? .6);
    out(s0 + i, Math.tanh(fl.tick(x) * 1.6) * e);
  }
}
// "aah" choir via formant filters
function choir(m, t0, dur, vel = 1, o = {}) {
  const f = mtof(m), n = 5, saws = [];
  for (let k = 0; k < n; k++) saws.push(new Saw(f * Math.pow(2, R(-14, 14) / 1200)));
  const vow = o.vowel === 'oo' ? [[400, 5, 1], [800, 8, .35], [2600, 12, .1]] : [[760, 5, 1], [1180, 7, .55], [2700, 10, .25]];
  const fs1 = vow.map(([fc, q]) => { const s = new SVF(); s.set(fc, q); return s; });
  const fs2 = vow.map(([fc, q]) => { const s = new SVF(); s.set(fc * 1.04, q); return s; });
  const len = Math.ceil((dur + 1.6) * SR), s0 = Math.round(t0 * SR);
  const out = mixer(o.pan ?? 0, .09 * vel * (o.gain ?? 1), o.send ?? .6);
  const vr = 5 + R(0, 1), vp = R(0, 6);
  for (let i = 0; i < len; i++) {
    const t = i / SR, fm = 1 + .004 * Math.sin(TAU * vr * t + vp);
    let l = 0, r = 0;
    for (let k = 0; k < n; k++) { const v = saws[k].tick(fm); if (k & 1) r += v; else l += v; }
    l += white() * .15; r += white() * .15;
    let ol = 0, or = 0;
    for (let j = 0; j < 3; j++) { fs1[j].tick(l); fs2[j].tick(r); ol += fs1[j].bp * vow[j][2]; or += fs2[j].bp * vow[j][2]; }
    const e = adsr(t, dur, o.atk ?? .7, .3, .95, 1.6);
    out(s0 + i, ol * e, or * e);
  }
}
// additive piano with inharmonic, double-strung partials
function piano(m, t0, dur = 3, vel = .8, o = {}) {
  const f = mtof(m), np = 12, Bi = .00035, s0 = Math.round(t0 * SR);
  const len = Math.ceil(Math.min(dur + .5, 9) * SR);
  const tau1 = 2.2 + 4 * Math.max(0, (72 - m) / 36);
  const parts = [];
  for (let n = 1; n <= np; n++) {
    const fn = f * n * Math.sqrt(1 + Bi * n * n);
    if (fn > 16000) break;
    const amp = Math.pow(n, -1.1) * Math.exp(-(n - 1) * (1.1 - vel * .6) * .35);
    parts.push({ w1: TAU * fn / SR, w2: TAU * fn * 1.0007 / SR, a: amp, tau: tau1 / (1 + .45 * (n - 1)), ph: rnd() * TAU });
  }
  const P = parts.length, re = new Float64Array(2 * P), im = new Float64Array(2 * P), cr = new Float64Array(2 * P), ci = new Float64Array(2 * P), g = new Float64Array(P);
  parts.forEach((p, k) => {
    re[2 * k] = Math.cos(p.ph); im[2 * k] = Math.sin(p.ph); re[2 * k + 1] = 1; im[2 * k + 1] = 0;
    cr[2 * k] = Math.cos(p.w1); ci[2 * k] = Math.sin(p.w1); cr[2 * k + 1] = Math.cos(p.w2); ci[2 * k + 1] = Math.sin(p.w2);
  });
  const out = mixer(o.pan ?? (m - 64) / 40, .16 * vel * (o.gain ?? 1), o.send ?? .5);
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    if ((i & 31) === 0) for (let k = 0; k < P; k++) { const p = parts[k]; g[k] = p.a * (.55 * Math.exp(-t / (p.tau * .18)) + .45 * Math.exp(-t / p.tau)); }
    let v = 0;
    for (let k = 0; k < P; k++) {
      let j = 2 * k, r2 = re[j] * cr[j] - im[j] * ci[j]; im[j] = re[j] * ci[j] + im[j] * cr[j]; re[j] = r2;
      const s1 = im[j]; j++;
      r2 = re[j] * cr[j] - im[j] * ci[j]; im[j] = re[j] * ci[j] + im[j] * cr[j]; re[j] = r2;
      v += g[k] * (s1 + im[j]);
    }
    let e = Math.min(1, t / .002);
    if (t > dur) e *= Math.exp(-(t - dur) / .15);
    if (i < 300) v += white() * .3 * (1 - i / 300) * vel;
    out(s0 + i, v * e * .5);
  }
}
// bansuri: breathy flute phrase with meend (glides) and delayed vibrato
function bansuri(t0, notes, o = {}) {
  const tot = notes.reduce((s, n) => s + n[1], 0) * BEAT;
  const len = Math.ceil((tot + 1.2) * SR), s0 = Math.round(t0 * SR);
  const out = mixer(o.pan ?? .1, .2 * (o.gain ?? 1), o.send ?? .55);
  const starts = []; let acc = 0;
  for (const n of notes) { starts.push(acc); acc += n[1] * BEAT; }
  const bp = new SVF(), lp = new SVF(); lp.set(5000, .6);
  let ph = 0, ni = 0, prevF = mtof(notes.find((n) => n[0])[0]), cur = prevF, noteT = 0, amp = 0;
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    while (ni < notes.length - 1 && t >= starts[ni + 1]) { ni++; prevF = cur; noteT = 0; }
    const [m, d] = notes[ni];
    const on = m > 0 && t < starts[ni] + d * BEAT * .97 && t < tot;
    const target = m > 0 ? mtof(m) : cur;
    const gl = Math.min(1, noteT / .07);
    const g2 = gl * gl * (3 - 2 * gl);
    cur = prevF * Math.pow(target / prevF, g2);
    const vib = 1 + .0045 * Math.min(1, Math.max(0, noteT - .22) / .35) * Math.sin(TAU * 5.3 * t);
    const tongue = 1 - .35 * Math.exp(-noteT / .03) * (noteT < .1 ? 1 : 0);
    amp += ((on ? 1 : 0) * tongue - amp) * (on ? .0012 : .0006);
    ph += TAU * cur * vib / SR;
    if ((i & 31) === 0) bp.set(cur * 2, 2.5);
    const tone = Math.sin(ph) + .22 * Math.sin(2 * ph + .4) + .07 * Math.sin(3 * ph + 1) + .03 * Math.sin(4 * ph);
    const breath = bp.tick(white()) * (.35 + 1.4 * Math.exp(-noteT / .05));
    out(s0 + i, lp.tick(tone * .9 + breath * .5) * amp);
    noteT += 1 / SR;
  }
}
// tanpura pluck: harmonic band sweeping upward (jawari buzz)
function tanpura(m, t0, vel = 1, o = {}) {
  const f = mtof(m), len = Math.ceil(5.5 * SR), s0 = Math.round(t0 * SR), H = 28;
  const out = mixer(o.pan ?? 0, .035 * vel, .5);
  let nh = 0;
  while (nh < H && f * (nh + 1) < 12000) nh++;
  const re = new Float64Array(nh), im = new Float64Array(nh), cr = new Float64Array(nh), ci = new Float64Array(nh), g = new Float64Array(nh);
  for (let k = 0; k < nh; k++) {
    const n = k + 1, w = TAU * f * n * (1 + .0002 * n) / SR, p = rnd() * TAU;
    re[k] = Math.cos(p); im[k] = Math.sin(p); cr[k] = Math.cos(w); ci[k] = Math.sin(w);
  }
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    if ((i & 63) === 0) {
      const c = 3 + 13 * (1 - Math.exp(-t / 1.4)) + 1.5 * Math.sin(t * 3.1);
      for (let k = 0; k < nh; k++) { const n = k + 1; g[k] = (Math.exp(-((n - c) * (n - c)) / 18) * .8 + .25 / n) / Math.sqrt(n); }
    }
    let v = 0;
    for (let k = 0; k < nh; k++) {
      const r2 = re[k] * cr[k] - im[k] * ci[k]; im[k] = re[k] * ci[k] + im[k] * cr[k]; re[k] = r2;
      v += g[k] * im[k];
    }
    out(s0 + i, v * Math.min(1, t / .01) * Math.exp(-t / 2.4));
  }
}
// ---------- percussion & sound design ----------
function taiko(t0, vel = 1, o = {}) {
  const p = o.pitch ?? 1, len = Math.ceil(1.6 * SR), s0 = Math.round((t0 + R(-.004, .004)) * SR);
  const out = mixer(o.pan ?? R(-.2, .2), .55 * vel, o.send ?? .25), lp = new SVF();
  lp.set(900 * p, .7);
  let ph = 0;
  for (let i = 0; i < len; i++) {
    const t = i / SR, f = (52 + 95 * Math.exp(-t / .035)) * p;
    ph += TAU * f / SR;
    const body = Math.sin(ph) * Math.exp(-t / (.42 * (o.decay ?? 1)));
    const skin = lp.tick(white()) * Math.exp(-t / .025) * .8;
    out(s0 + i, Math.tanh((body + skin) * 1.4));
  }
}
function snare(t0, vel = 1, o = {}) {
  const len = Math.ceil(.5 * SR), s0 = Math.round(t0 * SR), bp = new SVF();
  bp.set(2200, 1.2);
  const out = mixer(o.pan ?? .15, .22 * vel, o.send ?? .3);
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    out(s0 + i, bp.tick(white()) * 2 * Math.exp(-t / .12) + Math.sin(TAU * 185 * t) * Math.exp(-t / .04) * .5);
  }
}
function boom(t0, vel = 1) { // massive trailer impact
  const len = Math.ceil(5 * SR), s0 = Math.round(t0 * SR), lp = new SVF(), lp2 = new SVF();
  const out = mixer(0, .9 * vel, .35);
  let ph = 0;
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    if ((i & 31) === 0) lp.set(120 + 2500 * Math.exp(-t / .15), .7);
    lp2.set(4000, .5);
    ph += TAU * (34 + 70 * Math.exp(-t / .09)) / SR;
    const sub = Math.sin(ph) * Math.exp(-t / 1.6);
    const crunch = lp.tick(white()) * Math.exp(-t / .5) * 1.2;
    out(s0 + i, Math.tanh((sub * 1.3 + crunch) * 1.5));
  }
  taiko(t0, vel, { pitch: .8, decay: 1.6, pan: 0 });
  crash(t0, vel * .9);
}
function crash(t0, vel = 1, o = {}) {
  const len = Math.ceil((o.len ?? 3.5) * SR), s0 = Math.round(t0 * SR), hp = new SVF(), hp2 = new SVF();
  hp.set(5000, .7); hp2.set(5200, .7);
  const out = mixer(o.pan ?? -.3, .18 * vel, .4);
  const fr = [205.3, 304.4, 369.6, 522.7, 540, 800].map((f) => f * 3.2), ph = fr.map(() => 0);
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    let m = 0;
    for (let k = 0; k < 6; k++) { ph[k] += fr[k] / SR; m += (ph[k] % 1) < .5 ? 1 : -1; }
    const x = white() + m * .12;
    hp.tick(x); hp2.tick(white() + m * .1);
    const e = Math.exp(-t / ((o.len ?? 3.5) * .3)) * Math.min(1, t / .002);
    out(s0 + i, hp.hp * e, hp2.hp * e);
  }
}
function revCymbal(tEnd, dur = 2.5, vel = 1) {
  const len = Math.ceil(dur * SR), s0 = Math.round((tEnd - dur) * SR), hp = new SVF(), hp2 = new SVF();
  hp.set(3500, .7); hp2.set(3700, .7);
  const out = mixer(0, .2 * vel, .5);
  for (let i = 0; i < len; i++) {
    const e = Math.pow(i / len, 3);
    hp.tick(white()); hp2.tick(white());
    out(s0 + i, hp.hp * e, hp2.hp * e);
  }
}
function riser(t0, t1, vel = 1, o = {}) {
  const len = Math.ceil((t1 - t0) * SR), s0 = Math.round(t0 * SR), bp = new SVF(), bp2 = new SVF();
  const out = mixer(0, .25 * vel, .5);
  const L = 7, ph = new Float64Array(L);
  for (let i = 0; i < len; i++) {
    const u = i / len;
    if ((i & 31) === 0) { const fc = 250 * Math.pow(30, u); bp.set(fc, 3); bp2.set(fc * 1.07, 3); }
    // Shepard glissando: octave-spaced sines climbing with gaussian amplitude window
    let sh = 0;
    for (let k = 0; k < L; k++) {
      const pos = (k + u * (o.oct ?? 1.5)) % L, f = 55 * Math.pow(2, pos);
      ph[k] += TAU * f / SR;
      sh += Math.sin(ph[k]) * Math.exp(-Math.pow((pos - L / 2) / 1.3, 2));
    }
    const e = Math.pow(u, 2.2);
    out(s0 + i, (bp.tick(white()) * 1.3 + sh * .25 * (o.tone ?? 1)) * e, (bp2.tick(white()) * 1.3 + sh * .25 * (o.tone ?? 1)) * e);
  }
}
function braam(t0, root = 26, vel = 1, dur = 3) {
  const notes = [root, root + 12, root + 19, root + 24];
  for (const m of notes) {
    const f = mtof(m), s = [new Saw(f), new Saw(f * 1.006), new Saw(f * .994)], lp = new SVF();
    const len = Math.ceil((dur + 1) * SR), s0 = Math.round(t0 * SR);
    const out = mixer(R(-.3, .3), .09 * vel, .4);
    for (let i = 0; i < len; i++) {
      const t = i / SR;
      if ((i & 31) === 0) lp.set(150 + 1400 * Math.exp(-t / .5) * Math.min(1, t / .05), 1.2);
      const e = Math.min(1, t / .03) * (t < dur ? 1 : Math.exp(-(t - dur) / .3)) * Math.exp(-t / 2.5);
      out(s0 + i, Math.tanh(lp.tick(s[0].tick() + s[1].tick() + s[2].tick()) * 3) * e);
    }
  }
}
function heartbeat(t0, vel = 1) {
  for (const [dt, a] of [[0, 1], [.24, .7]]) {
    const len = Math.ceil(.4 * SR), s0 = Math.round((t0 + dt) * SR), out = mixer(0, .5 * vel * a, .15);
    let ph = 0;
    for (let i = 0; i < len; i++) { const t = i / SR; ph += TAU * (48 + 40 * Math.exp(-t / .03)) / SR; out(s0 + i, Math.sin(ph) * Math.exp(-t / .09) * Math.min(1, t / .004)); }
  }
}
function beep(t0, f = 1250, vel = 1, dur = .07) {
  const len = Math.ceil(dur * SR), s0 = Math.round(t0 * SR), out = mixer(.35, .05 * vel, .35);
  for (let i = 0; i < len; i++) { const t = i / SR; out(s0 + i, Math.sin(TAU * f * t) * Math.min(1, t / .003, (dur - t) / .01)); }
}
function tick(t0, vel = 1, pan = 0) {
  const len = Math.ceil(.06 * SR), s0 = Math.round(t0 * SR), bp = new SVF(), out = mixer(pan, .12 * vel, .25);
  bp.set(3800, 6);
  for (let i = 0; i < len; i++) { const t = i / SR; out(s0 + i, (bp.tick(white()) * 2 + Math.sin(TAU * 2400 * t) * .4) * Math.exp(-t / .012)); }
}
function noiseBed(t0, t1, kind) { // ambience: ocean / wind / static / rocket roar
  const len = Math.ceil((t1 - t0) * SR), s0 = Math.round(t0 * SR);
  const f1 = new SVF(), f2 = new SVF();
  const out = mixer(0, 1, kind === 'rocket' ? .25 : .3);
  let br = 0, br2 = 0;
  for (let i = 0; i < len; i++) {
    const t = i / SR, u = i / len;
    let l = 0, r = 0;
    if (kind === 'ocean') {
      const wave = Math.pow(.5 + .5 * Math.sin(TAU * t / 5.5 - 1.2), 3) * .8 + .2;
      if ((i & 63) === 0) { f1.set(300 + 1800 * wave, .5); f2.set(320 + 1700 * Math.pow(.5 + .5 * Math.sin(TAU * t / 6.3), 3), .5); }
      l = f1.tick(white()) * wave * .1; r = f2.tick(white()) * wave * .1;
      const env = Math.min(1, t / 2, (t1 - t0 - t) / 2);
      l *= env; r *= env;
    } else if (kind === 'wind') {
      if ((i & 63) === 0) { f1.set(400 + 300 * Math.sin(t * .7), 2); f2.set(500 + 300 * Math.sin(t * .53 + 1), 2); }
      const env = Math.min(1, t / 3, (t1 - t0 - t) / 3) * (.6 + .4 * Math.sin(t * .4));
      l = f1.tick(white()) * .05 * env; r = f2.tick(white()) * .05 * env;
    } else if (kind === 'static') {
      if ((i & 15) === 0) f1.set(2500 + 2000 * Math.sin(t * 40), .8);
      const chop = Math.sin(t * 90) > -.2 ? 1 : .3;
      l = r = f1.tick(white()) * .14 * chop * Math.min(1, t / .01) * (1 - u);
    } else if (kind === 'rocket') {
      // ignition swell -> sustained roar -> recedes (lowpass closes)
      const e = Math.min(1, t / 1.4) * Math.pow(1 - u, .7);
      if ((i & 31) === 0) { f1.set(90 + 900 * Math.pow(1 - u, 2), .6); f2.set(380 * (1 - u * .6), 1); }
      br = br * .995 + white() * .1; br2 = br2 * .995 + white() * .1;
      const crackle = rnd() < .002 * (1 - u) ? (rnd() * 2 - 1) * 4 : 0;
      l = (f1.tick(br) * 1.6 + f2.tick(white()) * .25 + crackle * .3) * e;
      r = (f1.lp * 1.4 + br2 * .7 * f1.lp + f2.bp * .25 - crackle * .2) * e;
      l = Math.tanh(l * 1.5) * .3; r = Math.tanh(r * 1.5) * .3;
    }
    out(s0 + i, l, r);
  }
}

// ---------- harmony ----------
const CH = {
  Dm: { b: 38, v: [50, 57, 62, 65, 69] }, Bb: { b: 34, v: [53, 58, 62, 65, 70] }, F: { b: 41, v: [53, 57, 60, 65, 69] },
  C: { b: 36, v: [52, 55, 60, 64, 67] }, Gm: { b: 43, v: [50, 55, 58, 62, 67] }, A: { b: 45, v: [52, 57, 61, 64, 69] },
  D: { b: 38, v: [50, 57, 62, 66, 69] }, Bm: { b: 35, v: [50, 54, 59, 62, 66] }, G: { b: 43, v: [50, 55, 59, 62, 67] },
  Asus: { b: 45, v: [52, 57, 62, 64, 69] }, Bbmaj7: { b: 34, v: [53, 57, 58, 62, 65] }, Dsus: { b: 38, v: [50, 57, 62, 67, 69] },
};
const prog = [];
const P = (start, names) => names.forEach((n, i) => { prog[start + i] = n; });
P(0, ['Dm', 'Dm', 'Bb', 'Dm']);
P(4, ['Dm', 'Bb', 'F', 'C', 'Dm', 'Bb', 'F', 'C', 'Dm', 'Bb', 'Gm', 'A']);
P(16, ['Dm', 'Bb', 'F', 'C', 'Dm', 'Bb', 'F', 'C', 'Dm', 'Bb', 'F', 'C', 'Gm', 'Bb', 'C', 'A']);
P(32, ['Dm', 'Bb', 'F', 'C', 'Dm', 'Bb', 'Gm', 'A']);
P(40, ['Dm', 'Bbmaj7', 'Gm', 'Asus', 'Asus', 'Bb', 'F', 'C']);
P(48, ['Dm', 'Bb', 'F', 'C', 'Dm', 'Bb', 'F', 'C', 'Gm', 'Bb', 'C', 'A']);
P(60, ['D', 'Bm', 'G', 'A', 'D', 'Bm', 'G', 'A', 'Bb', 'C', 'D', 'D', 'D', 'D']);

const T_MIN = [[69, 1], [74, 1], [76, .5], [77, 1.5], [77, .5], [79, .5], [77, .5], [76, .5], [74, 2], [72, 1], [77, 1], [81, 1.5], [79, .5], [79, 1.5], [77, .5], [76, 2]];
const T_MIN2 = [[69, 1], [74, 1], [76, .5], [77, 1.5], [79, .5], [81, .5], [82, 1], [81, 1], [79, 1], [77, 1], [76, .5], [74, .5], [76, 2], [76, 1], [73, 1], [69, 2]];
const T_MAJ = [[69, 1], [74, 1], [76, .5], [78, 1.5], [78, .5], [79, .5], [78, .5], [76, .5], [74, 2], [71, 1], [74, 1], [79, 1.5], [78, .5], [78, 1.5], [76, .5], [76, 2]];
const T_MAJ2 = [[69, 1], [74, 1], [76, .5], [78, 1.5], [78, .5], [79, .5], [81, 1], [83, 1], [81, 1], [79, 1], [78, .5], [76, .5], [78, 2], [76, 2], [73, 1], [76, 1]];
const T_END = [[74, 1], [77, 1], [82, 2], [79, 1], [81, 1], [84, 2], [86, 8]];

function melody(start, notes, play, tr = 0) {
  let t = start;
  for (const [m, d] of notes) { if (m) play(m + tr, t, d * BEAT); t += d * BEAT; }
}

// ---------- arrangement ----------
console.time('synth');
const ch = (b) => CH[prog[b]];

// Ambience
noiseBed(0, B(4.5), 'wind');
noiseBed(B(3), B(12.5), 'ocean');
noiseBed(B(Q.NIKE), B(Q.NIKE) + 7, 'rocket');
noiseBed(B(Q.PSLV), B(Q.PSLV) + 9, 'rocket');
noiseBed(B(Q.LVM3), B(Q.LVM3) + 11, 'rocket');
noiseBed(B(Q.LVM3) + .02, B(Q.LVM3) + 11, 'rocket');

// Drone & tanpura (Indian heartbeat of the score)
strings(26, 0, B(4), .9, { atk: 4, rel: 3, cut: 500, voices: 5 });
strings(38, B(1), B(3), .8, { atk: 3, rel: 3, cut: 700, voices: 5 });
const tanpuraBars = (a, b, v) => { for (let k = a; k < b; k++) [[45, 0], [50, 1], [50, 2], [38, 3]].forEach(([m, bt], j) => tanpura(m, B(k) + bt * BEAT, v, { pan: [-.4, .2, .4, -.1][j] })); };
tanpuraBars(1, 16, 1);
tanpuraBars(40, 48, .7);
tanpuraBars(70, 73, .9);

// Intro piano: sparse bell tones, then broken chords
[[1, 0, 74], [1.75, 0, 69], [2, 2, 77], [2.5, 0, 76], [3, 0, 74], [3.5, 0, 72]].forEach(([b, bt, m]) => piano(m, B(b) + bt * BEAT, 4, .55));
for (let b = 4; b < 12; b++) {
  const c = ch(b), arp = [c.b + 12, c.v[1], c.v[2], c.v[3], c.v[4], c.v[3], c.v[2], c.v[1]];
  arp.forEach((m, k) => piano(m, B(b) + k * BEAT / 2, 1.2, (k === 0 ? .7 : .45) * (b < 8 ? 1 : .8)));
  piano(c.b, B(b), 3, .5);
}
// pads under the intro
for (let b = 4; b < 16; b++) { const c = ch(b); c.v.slice(0, 4).forEach((m, k) => strings(m, B(b), BAR, .55 + .25 * (b >= 12), { atk: .9, cut: 1400 + 120 * (b - 4), pan: (k - 1.5) / 2 })); strings(c.b, B(b), BAR, .9, { atk: .6, cut: 600 }); }
// bansuri theme, first statement
bansuri(B(8), T_MIN, { gain: 1 });
// tension to the first launch
for (let b = 12; b < 16; b++) for (let k = 0; k < 8; k++) taiko(B(b) + k * BEAT / 2, .08 + .25 * ((b - 12) * 8 + k) / 32, { pitch: 1.3, decay: .5 });
riser(B(14), B(16), .8);
revCymbal(B(16), 2.6);
melody(B(12), [[74, 2], [76, 2], [77, 2], [74, 2], [79, 4], [76, 2], [73, 2]], (m, t, d) => strings(m, t, d, .7, { atk: .25, voices: 4, cut: 3000, vib: .004, pan: .2 }));

// 1969-1984 : pulse
boom(B(Q.HIT1), 1); braam(B(Q.HIT1), 26, 1, 2.6);
for (let b = 16; b < 32; b++) {
  const c = ch(b), dense = b >= 24;
  // spiccato ostinato
  const root = c.b + 12 + (c.b < 36 ? 12 : 0), pat = [0, 12, 7, 12];
  const steps = dense ? 16 : 8, step = BAR / steps;
  for (let k = 0; k < steps; k++) spicc(root + pat[k % 4], B(b) + k * step, (k % 4 === 0 ? 1 : .7) * (dense ? .9 : .75), { pan: (k % 2 ? .35 : -.35) });
  // pads + bass
  c.v.forEach((m, k) => strings(m, B(b), BAR, .7 + .3 * dense, { atk: .4, cut: 1800 + 900 * dense, pan: (k - 2) / 3 }));
  strings(c.b, B(b), BAR, 1.2, { atk: .1, cut: 500, voices: 4 });
  strings(c.b - 12 < 24 ? c.b : c.b - 12, B(b), BAR, .9, { atk: .1, cut: 220, voices: 3 });
  // drums
  const hits = dense ? [[0, 1], [.75, .5], [1.5, .8], [2, .7], [3, .9], [3.5, .6]] : [[0, .9], [1.5, .55], [2, .6]];
  hits.forEach(([bt, v]) => taiko(B(b) + bt * BEAT, v * (b >= 20 ? 1 : .8)));
  if (dense) { snare(B(b) + BEAT, .5); snare(B(b) + 3 * BEAT, .6); }
  if (b >= 20) [0, 1, 2, 3].forEach((k) => tick(B(b) + k * BEAT + BEAT / 2, .5, .4));
  // brass from 24
  if (dense) {
    [c.b + 12, c.v[1] - 12 > c.b + 12 ? c.v[1] - 12 : c.v[1], c.v[2]].forEach((m, k) => brass(m, B(b), BAR * .95, .8, { pan: (k - 1) * .3 }));
    if (b % 2 === 1) [0, .5, .75].forEach((bt) => brass(c.b + 24, B(b) + (3 + bt) * BEAT, .18, .9, { atk: .02, rel: .2 }));
  }
}
revCymbal(B(24), 2);
crash(B(24), .8);
crash(B(20), .5);
// 1984 "Saare Jahan Se Achha": bansuri answers over the pulse
bansuri(B(23), [[74, 1], [76, 1], [77, 1], [79, 1], [81, 3], [79, .5], [77, .5], [76, 4]], { gain: .8 });
// snare roll + riser into the epic section
for (let k = 0; k < 32; k++) snare(B(31) + k * BAR / 32, .25 + .7 * k / 32);
riser(B(29.5), B(32), 1.1);
revCymbal(B(32), 3);

// 2008-2014 : epic
boom(B(Q.EPIC), 1.1); braam(B(Q.EPIC), 26, 1.1, 3);
for (let b = 32; b < 40; b++) {
  const c = ch(b);
  const root = c.b + 12 + (c.b < 36 ? 12 : 0), pat = [0, 12, 7, 12];
  for (let k = 0; k < 16; k++) spicc(root + pat[k % 4], B(b) + k * BAR / 16, k % 4 === 0 ? 1 : .75, { pan: (k % 2 ? .4 : -.4) });
  c.v.forEach((m, k) => { strings(m, B(b), BAR, 1, { atk: .3, cut: 3200, pan: (k - 2) / 3 }); choir(m, B(b), BAR, .8, { pan: (k - 2) / 4 }); });
  strings(c.b, B(b), BAR, 1.4, { atk: .08, cut: 600, voices: 4 });
  strings(c.b - 12 < 22 ? c.b : c.b - 12, B(b), BAR, 1, { atk: .08, cut: 240, voices: 3 });
  [c.b + 12, c.v[1], c.v[2]].forEach((m, k) => brass(m, B(b), BAR * .95, 1, { pan: (k - 1) * .3, blare: b % 4 === 0 }));
  [[0, 1], [.5, .5], [.75, .7], [1.5, .9], [2, .8], [2.5, .5], [3, 1], [3.25, .6], [3.5, .8], [3.75, .7]].forEach(([bt, v]) => taiko(B(b) + bt * BEAT, v));
  [1, 3].forEach((bt) => snare(B(b) + bt * BEAT, .8));
  for (let k = 0; k < 8; k++) tick(B(b) + k * BEAT / 2, .4, k % 2 ? .5 : -.5);
  if (b % 2 === 0) crash(B(b), .7);
}
boom(B(36), .8);
melody(B(32), T_MIN, (m, t, d) => { strings(m, t, d, 1.1, { atk: .08, voices: 5, cut: 5000, vib: .005, pan: .15, rel: .6 }); strings(m - 12, t, d, .9, { atk: .08, voices: 4, cut: 3000, vib: .005, pan: -.15, rel: .6 }); brass(m - 12, t, d, .7, { gain: .8 }); });
melody(B(36), T_MIN2, (m, t, d) => { strings(m, t, d, 1.1, { atk: .08, voices: 5, cut: 5000, vib: .005, pan: .15, rel: .6 }); strings(m - 12, t, d, .9, { atk: .08, voices: 4, cut: 3000, vib: .005, pan: -.15, rel: .6 }); brass(m - 12, t, d, .7, { gain: .8 }); });
riser(B(38), B(39.75), 1, { tone: .6 });
for (let k = 0; k < 12; k++) taiko(B(39) + 2 * BEAT + k * BEAT / 6, .5 + .5 * k / 12, { pitch: 1.2 });

// 2019 : the loss
boom(B(Q.BREAK), .45);
strings(26, B(40), B(4) - .3, .7, { atk: 1.5, rel: 1, cut: 400, voices: 4 });
const sad = [
  [40, [50, 57, 62], [[77, 0], [76, 1.5], [74, 2]]],
  [41, [46, 53, 57, 62], [[74, 0], [72, 1.5], [69, 2]]],
  [42, [43, 50, 58], [[70, 0], [69, 1.5], [67, 2]]],
  [43, [45, 52, 57, 62], [[69, 0], [67, 1], [64, 2], [61, 3]]],
];
sad.forEach(([b, chord, mel]) => {
  chord.forEach((m, k) => piano(m, B(b) + k * .03, BAR * .95, .5));
  mel.forEach(([m, bt]) => piano(m, B(b) + bt * BEAT, 2, .6));
  strings(chord[0] - 12, B(b), BAR, .6, { atk: 1, cut: 350, voices: 3 });
});
for (let b = 42; b < 44; b++) for (let k = 0; k < 4; k++) heartbeat(B(b) + k * BEAT, .5 + .3 * (b - 42));
for (let b = 41; b < 44; b++) for (let k = 0; k < 8; k++) beep(B(b) + k * BEAT / 2, k % 4 === 0 ? 1500 : 1250, .6 + .4 * (b - 41) / 2, .05);
noiseBed(B(Q.LOST), B(Q.LOST) + .9, 'static');
// signal lost: a lone flatline tone then stillness
for (let i = 0; i < 1; i++) {
  const s0 = Math.round(B(Q.LOST + .35) * SR), len = Math.round(3.8 * SR), out = mixer(0, .03, .6);
  for (let k = 0; k < len; k++) { const t = k / SR; out(s0 + k, Math.sin(TAU * 1000 * t) * Math.min(1, t / .02) * Math.exp(-t / 2)); }
}
heartbeat(B(44) + 2 * BEAT, .45);
heartbeat(B(44) + 3.5 * BEAT, .3);
// hope
for (let b = 45; b < 48; b++) { const c = ch(b); c.v.slice(0, 4).forEach((m, k) => strings(m, B(b), BAR, .55 + .15 * (b - 45), { atk: 1.2, cut: 1300, pan: (k - 1.5) / 2 })); strings(c.b, B(b), BAR, .7, { atk: 1, cut: 400 }); }
bansuri(B(45), [[74, 1], [77, 1], [79, 1], [81, 1], [79, 2], [77, 2], [76, 3], [74, .5], [76, .5]], { gain: .9 });
piano(86, B(45), 4, .35); piano(81, B(46), 4, .3); piano(84, B(47), 4, .3);

// 2023 : rebuild -> launch -> descent
for (let b = 48; b < 60; b++) {
  const c = ch(b), lvl = (b - 48) / 11;
  const root = c.b + 12 + (c.b < 36 ? 12 : 0), pat = [0, 12, 7, 12], steps = b < 50 ? 8 : 16;
  for (let k = 0; k < steps; k++) {
    const t = B(b) + k * BAR / steps;
    if (b === 59 && t >= B(Q.HUSH)) break;
    spicc(root + pat[k % 4] + (b >= 56 ? 12 : 0), t, (k % 4 === 0 ? 1 : .7) * (.6 + .4 * lvl), { pan: k % 2 ? .4 : -.4 });
  }
  const dur = b === 59 ? BAR / 2 : BAR;
  c.v.forEach((m, k) => strings(m + (b >= 56 && k > 2 ? 12 : 0), B(b), dur, .6 + .5 * lvl, { atk: .4, cut: 1500 + 2500 * lvl, pan: (k - 2) / 3, rel: b === 59 ? .2 : 1.4 }));
  strings(c.b, B(b), dur, 1.1, { atk: .1, cut: 500, voices: 4, rel: b === 59 ? .15 : 1.2 });
  if (b >= 52) {
    c.v.slice(0, 3).forEach((m, k) => brass(m - (m > 60 ? 12 : 0), B(b), dur * .95, .7 + .3 * lvl, { pan: (k - 1) * .3, rel: b === 59 ? .1 : .6 }));
    c.v.forEach((m, k) => choir(m, B(b), dur, .5 + .4 * lvl, { pan: (k - 2) / 4, vowel: b < 56 ? 'oo' : 'ah' }));
  }
  if (b < 52) for (let k = 0; k < 16; k++) tick(B(b) + k * BAR / 16, .25 + .3 * (k % 4 === 0), k % 2 ? .5 : -.5);
  const hits = b < 50 ? [[0, .6], [2, .5]] : b < 56 ? [[0, 1], [.75, .5], [1.5, .8], [2, .7], [3, .9], [3.5, .6]]
    : [[0, 1], [.5, .6], [1, .8], [1.5, .6], [2, 1], [2.5, .6], [3, .9], [3.25, .7], [3.5, .8], [3.75, .9]];
  hits.forEach(([bt, v]) => { const t = B(b) + bt * BEAT; if (b === 59 && t >= B(Q.HUSH)) return; taiko(t, v * (.7 + .3 * lvl)); });
  if (b >= 52 && b < 59) [1, 3].forEach((bt) => snare(B(b) + bt * BEAT, .7));
  if (b % 4 === 0 && b > 48) crash(B(b), .6);
}
boom(B(Q.LVM3), .9); braam(B(Q.LVM3), 26, .8, 2.5);
melody(B(52), T_MIN, (m, t, d) => { strings(m, t, d, .9, { atk: .1, voices: 5, cut: 4200, vib: .005, pan: .15, rel: .6 }); });
for (let k = 0; k < 24; k++) snare(B(58) + k * BAR / 16, .2 + .7 * k / 24);
riser(B(57), B(Q.HUSH), 1.2, { oct: 2 });
// the hush: one beat of near-silence, one heartbeat
heartbeat(B(Q.HUSH) + .55, .7);
tick(B(Q.HUSH) + 1.1, .6);

// 18:04 IST : touchdown -> triumph in D major
boom(B(Q.TOUCH), 1.3); braam(B(Q.TOUCH), 26, 1.3, 3.5); crash(B(Q.TOUCH), 1, { len: 5 });
for (let b = 60; b < 70; b++) {
  const c = ch(b), big = b >= 64;
  const root = c.b + 12 + (c.b < 36 ? 12 : 0), pat = [0, 12, 7, 12];
  for (let k = 0; k < 16; k++) spicc(root + pat[k % 4], B(b) + k * BAR / 16, (k % 4 === 0 ? 1 : .75) * (b < 62 ? .6 : 1), { pan: k % 2 ? .4 : -.4 });
  c.v.forEach((m, k) => { strings(m, B(b), BAR, 1.1, { atk: .25, cut: 3800, pan: (k - 2) / 3 }); choir(m, B(b), BAR, big ? 1 : .8, { pan: (k - 2) / 4 }); choir(m + 12, B(b), BAR, big ? .5 : .3, { pan: -(k - 2) / 4 }); });
  strings(c.b, B(b), BAR, 1.4, { atk: .08, cut: 650, voices: 4 });
  strings(c.b - 12 < 22 ? c.b : c.b - 12, B(b), BAR, 1.1, { atk: .08, cut: 260, voices: 3 });
  [c.b + 12, c.v[1], c.v[2], c.v[3]].forEach((m, k) => brass(m, B(b), BAR * .95, b < 62 ? .8 : 1.05, { pan: (k - 1.5) * .25, blare: big }));
  const hits = b < 62 ? [[0, 1], [2, .7], [3, .6]] : [[0, 1], [.5, .5], [.75, .7], [1.5, .9], [2, .8], [2.5, .5], [3, 1], [3.25, .6], [3.5, .8], [3.75, .7]];
  hits.forEach(([bt, v]) => taiko(B(b) + bt * BEAT, v));
  if (b >= 62) { [1, 3].forEach((bt) => snare(B(b) + bt * BEAT, .75)); for (let k = 0; k < 8; k++) tick(B(b) + k * BEAT / 2, .35, k % 2 ? .5 : -.5); }
  if (b % 2 === 0) crash(B(b), .8);
}
const lead = (m, t, d) => {
  strings(m, t, d, 1.15, { atk: .08, voices: 5, cut: 5200, vib: .005, pan: .15, rel: .7 });
  strings(m + 12, t, d, .45, { atk: .1, voices: 4, cut: 8000, vib: .005, pan: .3, rel: .7 });
  strings(m - 12, t, d, 1, { atk: .08, voices: 4, cut: 3200, vib: .005, pan: -.15, rel: .7 });
  brass(m - 12, t, d, .8, { gain: .9 });
};
melody(B(60), T_MAJ, lead);
melody(B(64), T_MAJ2, lead);
bansuri(B(64), T_MAJ2.map(([m, d]) => [m + 12, d]), { gain: .45, send: .4 });
melody(B(68), T_END, lead);
boom(B(64), .9);
for (let k = 0; k < 16; k++) taiko(B(69) + 2 * BEAT + k * BEAT / 8, .5 + .5 * k / 16, { pitch: 1.15 });
riser(B(68), B(70), 1, { tone: .5 });
revCymbal(B(70), 3, 1.2);

// title hit and long resolution
boom(B(Q.FINAL), 1.4); braam(B(Q.FINAL), 26, 1.4, 4); crash(B(Q.FINAL), 1, { len: 6 });
CH.D.v.forEach((m, k) => { strings(m, B(70), B(3.2), 1.1, { atk: .05, rel: 4, cut: 3000, pan: (k - 2) / 3, env: (t) => Math.exp(-t / 5) }); choir(m, B(70), B(2.5), .9, { pan: (k - 2) / 4 }); choir(m + 12, B(70), B(2), .5); brass(m, B(70), B(1.5), .9, { rel: 3 }); });
strings(38, B(70), B(3.6), 1.4, { atk: .05, rel: 4, cut: 600, voices: 4 });
strings(26, B(70), B(3.6), 1.2, { atk: .05, rel: 4, cut: 250, voices: 3 });
bansuri(B(71), [[69, 1], [74, 1], [76, .5], [78, 1.5], [76, 1], [74, 5]], { gain: .9 });
piano(86, B(72) + 2 * BEAT, 6, .4); piano(81, B(72) + 2.5 * BEAT, 6, .3); piano(74, B(72) + 3 * BEAT, 6, .3);
console.timeEnd('synth');

// ---------- reverb (8-line FDN hall) ----------
console.time('reverb');
function fdn(inL, inR, rt = 3.4) {
  const lens = [1557, 1617, 1491, 1422, 1277, 1356, 1188, 1116].map((l) => Math.round(l * 2.1));
  const pre = Math.round(.03 * SR);
  const bufs = lens.map((l) => new Float32Array(l)), idx = lens.map(() => 0), lp = lens.map(() => 0);
  const g = lens.map((l) => Math.pow(10, -3 * l / (rt * SR)));
  const oL = new Float32Array(N), oR = new Float32Array(N), x = new Float64Array(8);
  for (let i = 0; i < N; i++) {
    const j = i - pre, il = j >= 0 ? inL[j] : 0, ir = j >= 0 ? inR[j] : 0;
    for (let k = 0; k < 8; k++) x[k] = bufs[k][idx[k]];
    // Hadamard mix
    for (let h = 1; h < 8; h <<= 1) for (let a = 0; a < 8; a += h << 1) for (let b = a; b < a + h; b++) { const u = x[b], v = x[b + h]; x[b] = u + v; x[b + h] = u - v; }
    let l = 0, r = 0;
    for (let k = 0; k < 8; k++) {
      const y = x[k] * .35355339;
      lp[k] += (y - lp[k]) * .42;
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
console.timeEnd('reverb');

// ---------- master: glue compression + soft limiter ----------
const L = new Float32Array(N), Rr = new Float32Array(N);
for (let i = 0; i < N; i++) { L[i] = dryL[i] + rvL[i] * .55; Rr[i] = dryR[i] + rvR[i] * .55; }
// DC/rumble cut ~25 Hz
{ let pl = 0, pr = 0, yl = 0, yr = 0; const a = Math.exp(-TAU * 25 / SR);
  for (let i = 0; i < N; i++) { const xl = L[i], xr = Rr[i]; yl = a * (yl + xl - pl); yr = a * (yr + xr - pr); pl = xl; pr = xr; L[i] = yl; Rr[i] = yr; } }
// tilt EQ: tame the sub, open the top
function shelf(x, f0, gainDb, high) {
  const A = Math.pow(10, gainDb / 40), w = TAU * f0 / SR, cs = Math.cos(w), al = Math.sin(w) / 2 * Math.SQRT2, sA = 2 * Math.sqrt(A) * al;
  let b0, b1, b2, a0, a1, a2;
  if (high) { b0 = A * ((A + 1) + (A - 1) * cs + sA); b1 = -2 * A * ((A - 1) + (A + 1) * cs); b2 = A * ((A + 1) + (A - 1) * cs - sA); a0 = (A + 1) - (A - 1) * cs + sA; a1 = 2 * ((A - 1) - (A + 1) * cs); a2 = (A + 1) - (A - 1) * cs - sA; }
  else { b0 = A * ((A + 1) - (A - 1) * cs + sA); b1 = 2 * A * ((A - 1) - (A + 1) * cs); b2 = A * ((A + 1) - (A - 1) * cs - sA); a0 = (A + 1) + (A - 1) * cs + sA; a1 = -2 * ((A - 1) + (A + 1) * cs); a2 = (A + 1) + (A - 1) * cs - sA; }
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < x.length; i++) { const v = x[i], y = (b0 * v + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2) / a0; x2 = x1; x1 = v; y2 = y1; y1 = y; x[i] = y; }
}
for (const ch2 of [L, Rr]) { shelf(ch2, 90, -5, false); shelf(ch2, 3500, 5, true); }
let peak = 0;
for (let i = 0; i < N; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(Rr[i]));
const pre = 1.9 / peak;
let env = 0, gr = 1;
const thr = .35, ratio = 3, atk = Math.exp(-1 / (.01 * SR)), relc = Math.exp(-1 / (.25 * SR));
for (let i = 0; i < N; i++) {
  const l = L[i] * pre, r = Rr[i] * pre, lvl = Math.max(Math.abs(l), Math.abs(r));
  env = lvl > env ? atk * env + (1 - atk) * lvl : relc * env + (1 - relc) * lvl;
  const target = env > thr ? Math.pow(env / thr, 1 / ratio - 1) : 1;
  gr = target < gr ? .995 * gr + .005 * target : .9995 * gr + .0005 * target;
  L[i] = Math.tanh(l * gr * 1.1) * .93; Rr[i] = Math.tanh(r * gr * 1.1) * .93;
}
// fade the very end
const endS = Math.round(DURATION * SR);
for (let i = 0; i < N; i++) { const t = i / SR; const f = t > DURATION - 2.5 ? Math.max(0, (DURATION - t) / 2.5) : 1; L[i] *= f; Rr[i] *= f; if (i >= endS) L[i] = Rr[i] = 0; }

// ---------- write 24-bit WAV ----------
const out = process.argv[2] || 'score.wav', ns = endS;
const buf = Buffer.alloc(44 + ns * 6);
buf.write('RIFF', 0); buf.writeUInt32LE(36 + ns * 6, 4); buf.write('WAVE', 8); buf.write('fmt ', 12);
buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22); buf.writeUInt32LE(SR, 24);
buf.writeUInt32LE(SR * 6, 28); buf.writeUInt16LE(6, 32); buf.writeUInt16LE(24, 34); buf.write('data', 36); buf.writeUInt32LE(ns * 6, 40);
for (let i = 0; i < ns; i++) {
  buf.writeIntLE(Math.round(Math.max(-1, Math.min(1, L[i])) * 8388607), 44 + i * 6, 3);
  buf.writeIntLE(Math.round(Math.max(-1, Math.min(1, Rr[i])) * 8388607), 47 + i * 6, 3);
}
fs.writeFileSync(out, buf);
console.log('wrote', out, (ns / SR).toFixed(2) + 's');
