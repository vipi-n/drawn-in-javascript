// Original score + sound design for the frog film.  node js/music.js out.wav [--stems]
// 100 BPM, F major (D minor for danger / metamorphosis). The "frog theme" hops in fourths and sixths and answers itself;
// it changes costume with the story: a lone handpan at night, a clarinet over the "pond band" groove (udu bloops,
// guiro "rib-bits", shaker, staccato bass clarinet, vibraphone skank), kalimba clockwork for every cell division,
// vibes + clarinet for the hatchlings, low tremolo + creeping bass for the nymph, a choir/brass/drums climax for the
// metamorphosis, a rain dance for the froglets, glass + slow heartbeat under the ice, and the full tutti at the end.
// Real CC0 recordings (Joseph Sardin, BigSoundBank): frog calls, frog chorus, pond field, rain. Everything else is
// synthesized here.
const fs = require('fs'), path = require('path');
const { spawnSync } = require('child_process');
const { DURATION } = require('./core');
const { SHOT, EV, CHAPTERS, CLOCK } = require('./cues');

const SR = 48000, N = Math.ceil((DURATION + 1.5) * SR), TAU = Math.PI * 2;
const BEAT = .6, BAR = 2.4, B = (bar, beat = 0) => bar * BAR + beat * BEAT;
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
let seed = 20261016;
const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
const R = (a = 0, b = 1) => a + (b - a) * rnd();
const clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
const lerp = (a, b, t) => a + (b - a) * t;
const ss = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const S0 = (t) => Math.round(t * SR);
let ns = 99;
const white = () => { ns ^= ns << 13; ns ^= ns >>> 17; ns ^= ns << 5; return ((ns >>> 0) / 4294967296) * 2 - 1; };

// ---------------------------------------------------------------- buses
const BUS = {};
['mus', 'sfx', 'amb'].forEach((k) => { BUS[k] = { L: new Float32Array(N), R: new Float32Array(N) }; });
const revL = new Float32Array(N), revR = new Float32Array(N), dlyL = new Float32Array(N), dlyR = new Float32Array(N);
function out(pan, gain, rev = .2, dly = 0, bus = 'mus') {
  const a = (clamp(pan, -1, 1) + 1) * Math.PI / 4, gl = Math.cos(a) * gain * 1.414, gr = Math.sin(a) * gain * 1.414, b = BUS[bus];
  return (i, l, r = l) => {
    if (i < 0 || i >= N) return;
    const L = l * gl, Rr = r * gr;
    b.L[i] += L; b.R[i] += Rr; revL[i] += L * rev; revR[i] += Rr * rev;
    if (dly) { dlyL[i] += L * dly; dlyR[i] += Rr * dly; }
  };
}

// ---------------------------------------------------------------- DSP blocks
class SVF {
  constructor(fc = 1000, q = .7) { this.a = 0; this.b = 0; this.set(fc, q); }
  set(fc, q = this.q) { this.q = q; fc = Math.min(Math.max(fc, 15), SR * .45); const g = Math.tan(Math.PI * fc / SR), k = 1 / q; this.a1 = 1 / (1 + g * (g + k)); this.a2 = g * this.a1; this.a3 = g * this.a2; this.k = k; }
  tick(x) {
    const v3 = x - this.b, v1 = this.a1 * this.a + this.a2 * v3, v2 = this.b + this.a2 * this.a + this.a3 * v3;
    this.a = 2 * v1 - this.a; this.b = 2 * v2 - this.b; this.lp = v2; this.bp = v1; this.hp = x - this.k * v1 - v2; return v2;
  }
}
function blep(t, dt) { if (t < dt) { t /= dt; return t + t - t * t - 1; } if (t > 1 - dt) { t = (t - 1) / dt; return t * t + t + t + 1; } return 0; }
class Osc {
  constructor(ph = rnd()) { this.p = ph; }
  saw(f) { const dt = f / SR; let p = this.p + dt; if (p >= 1) p -= 1; this.p = p; return 2 * p - 1 - blep(p, dt); }
  sq(f, pw = .5) { const dt = f / SR; let p = this.p + dt; if (p >= 1) p -= 1; this.p = p; let v = p < pw ? 1 : -1; v += blep(p, dt); let q = p - pw; if (q < 0) q += 1; v -= blep(q, dt); return v; }
  sin(f) { this.p += f / SR; if (this.p >= 1) this.p -= 1; return Math.sin(TAU * this.p); }
}
// modal voice: partials [ratio, amp, decay(s)], with optional per-partial detune
function modal(m, t0, vel, parts, o = {}) {
  const f = typeof m === 'number' && m < 200 ? mtof(m) : m, len = Math.ceil((o.len ?? Math.max(...parts.map((p) => p[2])) * 4) * SR), s0 = S0(t0);
  const put = out(o.pan ?? 0, (o.gain ?? .3) * vel, o.rev ?? .3, o.dly ?? 0, o.bus ?? 'mus');
  const ph = parts.map(() => rnd() * TAU), w = parts.map((p) => TAU * f * p[0] * (1 + (p[3] ?? 0)) / SR), dec = parts.map((p) => Math.exp(-1 / (p[2] * SR)));
  const amp = parts.map((p) => p[1]);
  const atk = (o.atk ?? .002) * SR, bend = o.bend ?? 0, bendT = (o.bendT ?? .03) * SR;
  const trem = o.trem ?? 0, tf = o.tremF ?? 5.5;
  const cut = o.cut ? new SVF(o.cut, .7) : null;
  for (let i = 0; i < len; i++) {
    let v = 0;
    const pb = bend ? 1 + bend * Math.exp(-i / bendT) : 1;
    for (let k = 0; k < parts.length; k++) { ph[k] += w[k] * pb; v += Math.sin(ph[k]) * amp[k]; amp[k] *= dec[k]; }
    const e = Math.min(1, i / atk) * (trem ? 1 - trem * (.5 + .5 * Math.sin(TAU * tf * i / SR)) : 1) * Math.min(1, (len - i) / (SR * .02));
    if (o.stop && i > (o.stop - t0) * SR) { const q = (i - (o.stop - t0) * SR) / (SR * .08); if (q > 1) break; v *= 1 - q; }
    put(s0 + i, (cut ? cut.tick(v) : v) * e);
  }
}
const handpan = (m, t0, vel = 1, o = {}) => {
  modal(m, t0, vel, [[1, 1, 2.6], [2, .55, 1.9, .0009], [3, .22, 1.2, -.0006], [4.07, .06, .35], [.5, .05, 1.4]], { gain: .26, rev: .55, dly: .12, atk: .004, bend: .012, len: 5, pan: o.pan ?? R(-.35, .35), cut: 5200, ...o });
  // the soft thumb thump
  const s0 = S0(t0), put = out(o.pan ?? 0, .05 * vel, .2), f = new SVF(320, 1.2);
  for (let i = 0; i < SR * .05; i++) put(s0 + i, f.tick(white()) * Math.exp(-i / (SR * .008)) * 3);
};
const kalimba = (m, t0, vel = 1, o = {}) => modal(m, t0, vel, [[1, 1, 1.1], [5.92, .32, .09], [13.1, .1, .03], [2, .06, .5]], { gain: .2, rev: .42, dly: .18, atk: .001, bend: -.004, len: 3, pan: o.pan ?? R(-.5, .5), ...o });
const vibes = (m, t0, vel = 1, o = {}) => modal(m, t0, vel, [[1, 1, 2.8], [3.98, .32, .8], [9.8, .06, .15]], { gain: .18, rev: .45, dly: .1, atk: .003, trem: o.trem ?? .22, tremF: 5.2, len: o.len ?? 4, pan: o.pan ?? R(-.3, .3), ...o });
const glassH = (m, t0, dur, vel = 1, o = {}) => {
  const f = mtof(m), len = Math.ceil((dur + 1.5) * SR), s0 = S0(t0), put = out(o.pan ?? R(-.4, .4), .07 * vel, .75, .2);
  let p1 = rnd(), p2 = rnd();
  for (let i = 0; i < len; i++) {
    const t = i / SR, e = ss(0, .5, t) * (t > dur ? Math.exp(-(t - dur) / .5) : 1);
    p1 += f * (1 + .002 * Math.sin(TAU * 4.5 * t)) / SR; p2 += f * 2.003 / SR;
    put(s0 + i, (Math.sin(TAU * p1) + .25 * Math.sin(TAU * p2)) * e);
  }
};

// legato reed: clarinet (odd harmonics, breath, delayed vibrato) for a line [[t, midi, dur, vel]]
function clarinet(line, o = {}) {
  if (!line.length) return;
  const put = out(o.pan ?? .12, .085 * (o.gain ?? 1), o.rev ?? .35, o.dly ?? .1, o.bus ?? 'mus');
  const tA = line[0][0] - .02, last = line[line.length - 1], tB = last[0] + last[2] + .5;
  const lp = new SVF(2200, .8), br = new SVF(1800, 1.5), osc = new Osc(), glide = 1 - Math.exp(-1 / (SR * .025)), oct = o.oct ?? 0;
  let k = 0, f = mtof(line[0][1] + oct);
  for (let i = S0(tA); i < S0(tB); i++) {
    const t = i / SR;
    while (k + 1 < line.length && t >= line[k + 1][0]) k++;
    const [nt, m, dur, v = 1] = line[k], age = t - nt;
    if (age < 0) continue;
    f += (mtof(m + oct) - f) * glide;
    const vib = 1 + .005 * Math.sin(TAU * 5.3 * t) * ss(.18, .5, age);
    const env = Math.min(1, age / (o.atk ?? .025)) * (age > dur ? Math.exp(-(age - dur) / (o.rel ?? .06)) : 1) * v;
    if (env < 1e-4) continue;
    if ((i & 15) === 0) lp.set(lerp(1400, o.bright ?? 4200, Math.min(1, env * 1.2)) * (1 + .5 * Math.exp(-age / .05)), .8);
    const x = osc.sq(f * vib, .5) * .7 + Math.sin(TAU * osc.p * 3) * .08;
    br.tick(white());
    put(i, lp.tick(x + br.bp * .18 * (.4 + Math.exp(-age / .04))) * env);
  }
}
// staccato bass clarinet note
function bassNote(m, t0, dur, vel = 1, o = {}) {
  clarinet([[t0, m, dur, vel]], { gain: (o.gain ?? 1.5), pan: -.15, rev: .18, dly: 0, bright: 1500, atk: .012, rel: .05, oct: 0, ...o });
}

// formant choir pad: notes[] sustained from t0 for dur, vowel a ('ah') -> o ('oo') by o.vowel
const VOW = { a: [[730, 1.0, 80], [1090, .5, 90], [2440, .25, 120]], o: [[430, 1.0, 70], [820, .35, 80], [2400, .12, 120]] };
function choir(notes, t0, dur, vel = 1, o = {}) {
  const v = o.vowel ?? 'a', F = VOW[v], len = Math.ceil((dur + (o.rel ?? 1.2)) * SR), s0 = S0(t0);
  for (const m of notes) for (let d = 0; d < 3; d++) {
    const put = out(R(-.6, .6), .022 * vel * (o.gain ?? 1), o.rev ?? .7, .08);
    const fl = F.map(([fc, , bw]) => new SVF(fc, fc / bw * 1.4)), osc = new Osc(), det = 1 + (d - 1) * .0035, vph = R(0, TAU);
    for (let i = 0; i < len; i++) {
      const t = i / SR, e = ss(0, o.atk ?? .6, t) * (t > dur ? Math.exp(-(t - dur) / (o.rel ?? 1.2) * 2) : 1);
      if (e < 1e-4 && t > dur) break;
      const x = osc.saw(mtof(m) * det * (1 + .006 * Math.sin(TAU * 5.1 * t + vph) + .002 * Math.sin(TAU * .7 * t)));
      let y = 0; for (let k = 0; k < 3; k++) { fl[k].tick(x); y += fl[k].bp * F[k][1]; }
      put(s0 + i, y * e);
    }
  }
}
// string ensemble pad: detuned saws, slow attack, warm lowpass
function strings(notes, t0, dur, vel = 1, o = {}) {
  const len = Math.ceil((dur + (o.rel ?? .9)) * SR), s0 = S0(t0);
  for (const m of notes) for (let d = 0; d < 3; d++) {
    const put = out(R(-.7, .7), .03 * vel * (o.gain ?? 1), o.rev ?? .5, .06), osc = new Osc(), lp = new SVF(o.cut ?? 3800, .6), det = 1 + (d - 1) * .004, vph = R(0, TAU);
    for (let i = 0; i < len; i++) {
      const t = i / SR, e = ss(0, o.atk ?? .35, t) * (t > dur ? Math.exp(-(t - dur) / (o.rel ?? .9) * 2.5) : 1);
      if (e < 1e-4 && t > dur) break;
      const tr = o.trem ? .55 + .45 * Math.sin(TAU * (o.trem) * t) : 1;
      put(s0 + i, lp.tick(osc.saw(mtof(m) * det * (1 + .004 * Math.sin(TAU * 5.4 * t + vph)))) * e * tr);
    }
  }
}
// horn swell: brightness follows loudness
function horn(m, t0, dur, vel = 1, o = {}) {
  const len = Math.ceil((dur + .6) * SR), s0 = S0(t0), put = out(o.pan ?? R(-.3, .3), .05 * vel * (o.gain ?? 1), o.rev ?? .55, .06), osc = new Osc(), osc2 = new Osc(), lp = new SVF(600, .8);
  for (let i = 0; i < len; i++) {
    const t = i / SR, sw = o.swell ? ss(0, dur * .7, t) : ss(0, .12, t), e = sw * (t > dur ? Math.exp(-(t - dur) / .2) : 1);
    if ((i & 15) === 0) lp.set(300 + 2400 * e, .9);
    put(s0 + i, lp.tick(osc.saw(mtof(m) * (1 + .003 * Math.sin(TAU * 5 * t))) * .6 + osc2.saw(mtof(m) * 1.003) * .4) * e);
  }
}
function pad(notes, t0, dur, vel = 1, o = {}) { strings(notes, t0, dur, vel * .8, { cut: o.cut ? o.cut * 1.6 : 2000, atk: o.atk ?? 1.2, rel: o.rel ?? 2, rev: .7, ...o, cut: o.cut ? o.cut * 1.6 : 2000 }); }
// underwater room tone: slow-breathing lowpassed noise
function roomTone(t0, t1, vel = 1, o = {}) {
  const s0 = S0(t0), s1 = S0(t1), put = out(0, .05 * vel, .3, 0, 'amb'), lpA = new SVF(o.cut ?? 260, .7), lpB = new SVF((o.cut ?? 260) * 1.3, .7);
  for (let i = s0; i < s1; i++) { const t = i / SR, e = ss(t0, t0 + 1, t) * (1 - ss(t1 - 1, t1, t)) * (.7 + .3 * Math.sin(t * .7)); put(i, lpA.tick(white()) * e * 3, lpB.tick(white()) * e * 3); }
}

// ---------------------------------------------------------------- percussion
function udu(t0, vel = 1, pitch = 0, o = {}) {
  const s0 = S0(t0), len = SR * .45, put = out(o.pan ?? -.1, .32 * vel, o.rev ?? .25, 0, o.bus ?? 'mus');
  const f0 = 92 * Math.pow(2, pitch / 12);
  let ph = 0;
  for (let i = 0; i < len; i++) {
    const t = i / SR, f = f0 * (1 + .7 * (1 - Math.exp(-t / .05)));
    ph += TAU * f / SR;
    put(s0 + i, Math.sin(ph) * Math.exp(-t / .16) * Math.min(1, t / .003) + (i < SR * .01 ? white() * .3 * (1 - i / (SR * .01)) : 0));
  }
}
function frame(t0, vel = 1, o = {}) {
  const s0 = S0(t0), len = SR * .6, put = out(o.pan ?? .1, .3 * vel, o.rev ?? .3, 0, o.bus ?? 'mus'), bp = new SVF(o.slap ?? 900, 1.2);
  let ph = 0;
  for (let i = 0; i < len; i++) {
    const t = i / SR, f = (o.f ?? 68) * (1 + 1.2 * Math.exp(-t / .02));
    ph += TAU * f / SR;
    put(s0 + i, Math.sin(ph) * Math.exp(-t / (o.dec ?? .28)) + bp.tick(white()) * Math.exp(-t / .03) * (o.skin ?? .7));
  }
}
function guiro(t0, dur, vel = 1, o = {}) {
  const s0 = S0(t0), put = out(o.pan ?? .35, .1 * vel, .25, 0), bp = new SVF(3200, 2), rate = o.rate ?? 42;
  for (let i = 0; i < dur * SR; i++) {
    const t = i / SR, ph = (t * rate) % 1, click = Math.exp(-ph * 30);
    put(s0 + i, bp.tick(white()) * click * (.5 + .5 * Math.sin(Math.PI * t / dur)));
  }
}
function shaker(t0, vel = 1, o = {}) {
  const s0 = S0(t0), put = out(o.pan ?? .45, .055 * vel, .15, 0), hp = new SVF(7800, .7);
  for (let i = 0; i < SR * .09; i++) { const t = i / SR; hp.tick(white()); put(s0 + i, hp.hp * Math.min(1, t / .012) * Math.exp(-t / .03)); }
}
function boom(t0, vel = 1, o = {}) {
  const s0 = S0(t0), put = out(0, .55 * vel, .25, 0, o.bus ?? 'mus');
  let ph = 0;
  for (let i = 0; i < SR * 2; i++) { const t = i / SR; ph += TAU * (o.f ?? 44) * (1 + .8 * Math.exp(-t / .04)) / SR; put(s0 + i, Math.sin(ph) * Math.exp(-t / (o.dec ?? .7)) * Math.min(1, t / .002)); }
}
function noiseHit(t0, vel = 1, o = {}) {   // a soft crash / splash cymbal substitute
  const s0 = S0(t0), len = (o.dur ?? 2.2) * SR, put = out(o.pan ?? 0, .09 * vel, .5, .1, o.bus ?? 'mus'), hp = new SVF(o.hp ?? 4500, .6), bp = new SVF(7000, 1.2);
  for (let i = 0; i < len; i++) { const t = i / SR; const x = white(); hp.tick(x); bp.tick(x); put(s0 + i, (hp.hp * .6 + bp.bp * .5) * Math.exp(-t / (o.dec ?? .7)) * Math.min(1, t / .004)); }
}
function riser(t0, t1, vel = 1, o = {}) {
  const s0 = S0(t0), len = S0(t1) - s0, put = out(0, .07 * vel, .45, .1, o.bus ?? 'mus'), bp = new SVF(400, 2.5);
  let ph = 0;
  for (let i = 0; i < len; i++) { const u = i / len; if ((i & 31) === 0) bp.set(300 * Math.pow(30, u), 2.5); ph += TAU * (110 * Math.pow(4, u)) / SR; put(s0 + i, (bp.tick(white()) * 1.4 + Math.sin(ph) * .15 * u) * u * u); }
}
function whoosh(t0, dur, vel = 1, o = {}) {
  const s0 = S0(t0), len = dur * SR, put = out(o.pan ?? 0, .16 * vel, .35, 0, 'sfx'), bp = new SVF(500, 1.8);
  const pan2 = o.sweep ?? 0;
  for (let i = 0; i < len; i++) {
    const u = i / len; if ((i & 31) === 0) bp.set((o.f0 ?? 300) * Math.pow((o.f1 ?? 2500) / (o.f0 ?? 300), Math.sin(Math.PI * u * .5)), 1.8);
    const e = Math.sin(Math.PI * u) ** 2, v = bp.tick(white()) * e;
    const p = clamp(.5 + pan2 * (u - .5), 0, 1);
    put(s0 + i, v * (1 - p) * 1.4, v * p * 1.4);
  }
}

// ---------------------------------------------------------------- water + creature sfx (synthesized)
// Minnaert bubble: a sine whose pitch rises as it decays
function bubble(t0, r = 2, vel = 1, o = {}) {
  const f0 = 3260 / r, tau = .012 * r + .01, s0 = S0(t0), len = Math.ceil(tau * 6 * SR), put = out(o.pan ?? R(-.5, .5), .07 * vel, o.rev ?? .3, 0, 'sfx');
  let ph = 0;
  for (let i = 0; i < len; i++) { const t = i / SR; ph += TAU * f0 * (1 + .9 * t / tau * .35) / SR; put(s0 + i, Math.sin(ph) * Math.exp(-t / tau) * Math.min(1, t / .0015)); }
}
function bubbles(t0, dur, rate, rMin = 1, rMax = 4, vel = 1, o = {}) { let t = t0; while (t < t0 + dur) { bubble(t, R(rMin, rMax), vel * R(.4, 1), o); t += -Math.log(1 - rnd()) / rate; } }
function plink(t0, f = 1800, vel = 1, o = {}) { // water drop
  const s0 = S0(t0), tau = .045, put = out(o.pan ?? R(-.5, .5), .08 * vel, o.rev ?? .5, .2, 'sfx');
  let ph = 0;
  for (let i = 0; i < SR * .3; i++) { const t = i / SR; ph += TAU * f * (1 + 1.6 * t / .3) / SR; put(s0 + i, Math.sin(ph) * Math.exp(-t / tau) * Math.min(1, t / .001)); }
}
function splash(t0, vel = 1, o = {}) {
  const s0 = S0(t0), put = out(o.pan ?? 0, .22 * vel, .3, 0, 'sfx'), bp = new SVF(1600, .8), lp = new SVF(o.cut ?? 9000, .7);
  for (let i = 0; i < SR * .5; i++) { const t = i / SR; bp.tick(white()); put(s0 + i, lp.tick(bp.bp) * Math.exp(-t / .09) * Math.min(1, t / .004) * 1.5); }
  bubbles(t0 + .02, .45, 40, 1.2, 4.5, .7 * vel, { pan: o.pan });
}
function swish(t0, dur = .35, vel = 1, o = {}) { whoosh(t0, dur, vel * .6, { f0: 200, f1: 900, ...o }); }
function heartbeat(t0, vel = 1) { boom(t0, .55 * vel, { f: 52, dec: .12, bus: 'sfx' }); boom(t0 + .17, .38 * vel, { f: 46, dec: .14, bus: 'sfx' }); }
function cellPop(t0, m, vel = 1) {
  bubble(t0, 1.6, vel * 1.2, { pan: R(-.3, .3), rev: .5 });
  kalimba(m, t0 + .01, .9 * vel, { pan: R(-.3, .3) });
}
function shimmer(t0, dur, vel = 1, o = {}) {
  const notes = o.notes ?? [89, 93, 96, 100, 101, 105];
  for (let i = 0; i < dur * 14; i++) { const t = t0 + R(0, dur); modal(notes[Math.floor(R(0, notes.length))], t, vel * R(.15, .4), [[1, 1, .6], [2.01, .3, .3]], { gain: .1, rev: .8, dly: .3, pan: R(-.8, .8), bus: 'sfx' }); }
}
function tongue(t0, vel = 1) {
  const s0 = S0(t0), put = out(.2, .2 * vel, .15, 0, 'sfx'), bp = new SVF(1000, 3);
  for (let i = 0; i < SR * .16; i++) { const u = i / (SR * .16); if ((i & 15) === 0) bp.set(600 + 4000 * Math.sin(Math.PI * u), 3); put(s0 + i, bp.tick(white()) * Math.sin(Math.PI * u) * 1.6); }
  udu(t0 + .14, .5 * vel, 9, { pan: .2, bus: 'sfx' });
}
function gulp(t0, vel = 1) { const s0 = S0(t0), put = out(0, .3 * vel, .12, 0, 'sfx'); let ph = 0; for (let i = 0; i < SR * .18; i++) { const t = i / SR; ph += TAU * (160 - 260 * t) / SR; put(s0 + i, Math.sin(ph) * Math.sin(Math.PI * t / .18)); } }
function snap(t0, vel = 1) {
  const s0 = S0(t0), put = out(.25, .35 * vel, .2, 0, 'sfx'), hp = new SVF(2500, .8);
  for (let i = 0; i < SR * .05; i++) { hp.tick(white()); put(s0 + i, hp.hp * Math.exp(-i / (SR * .006)) * 2); }
}
// singing ice: dispersive downward chirps + crackle
function iceCrack(t0, vel = 1) {
  for (let k = 0; k < 5; k++) {
    const s0 = S0(t0 + k * R(.03, .12)), put = out(R(-.7, .7), .1 * vel, .6, .25, 'sfx');
    let ph = 0;
    const f0 = R(4000, 7000), f1 = R(300, 700);
    for (let i = 0; i < SR * .5; i++) { const u = i / (SR * .5); ph += TAU * (f1 + (f0 - f1) * Math.exp(-u * 6)) / SR; put(s0 + i, Math.sin(ph) * Math.exp(-u * 5)); }
  }
  for (let k = 0; k < 40; k++) snap(t0 + R(0, .6), vel * R(.1, .5));
}
function creak(t0, vel = 1) { const s0 = S0(t0), put = out(R(-.5, .5), .05 * vel, .6, 0, 'sfx'), bp = new SVF(260, 6); for (let i = 0; i < SR * .7; i++) { const t = i / SR, ph = (t * (30 + 20 * Math.sin(t * 3))) % 1; put(s0 + i, bp.tick(Math.exp(-ph * 20) * white()) * 4 * Math.sin(Math.PI * t / .7)); } }
function breath(t0, dur, vel = 1) { const s0 = S0(t0), put = out(0, .09 * vel, .4, 0, 'sfx'), bp = new SVF(700, 1); for (let i = 0; i < dur * SR; i++) { const u = i / (dur * SR); if ((i & 31) === 0) bp.set(500 + 1500 * u, 1); put(s0 + i, bp.tick(white()) * Math.sin(Math.PI * u)); } }

// ---------------------------------------------------------------- recordings
const SFXDIR = path.join(__dirname, '..', 'assets', 'sfx');
const REC = {};
function rec(name) {
  if (REC[name]) return REC[name];
  const r = spawnSync('ffmpeg', ['-v', 'error', '-i', path.join(SFXDIR, name), '-ac', '2', '-ar', String(SR), '-f', 'f32le', '-'], { maxBuffer: 1 << 30 });
  const x = new Float32Array(r.stdout.buffer, r.stdout.byteOffset, r.stdout.length >> 2);
  const L = new Float32Array(x.length / 2), Rr = new Float32Array(x.length / 2);
  for (let i = 0; i < L.length; i++) { L[i] = x[2 * i]; Rr[i] = x[2 * i + 1]; }
  return (REC[name] = { L, R: Rr, n: L.length });
}
// play [a,b) seconds of a recording at t0 with fades, gain, pan, optional lowpass
function play(name, a, b, t0, gain = 1, o = {}) {
  const r = rec(name), i0 = S0(a), i1 = Math.min(r.n, S0(b)), s0 = S0(t0), fi = (o.fi ?? .01) * SR, fo = (o.fo ?? .05) * SR, bus = BUS[o.bus ?? 'sfx'];
  const lpL = o.cut ? new SVF(o.cut, .7) : null, lpR = o.cut ? new SVF(o.cut, .7) : null, rate = o.rate ?? 1;
  const pl = o.pan !== undefined ? Math.cos((o.pan + 1) * Math.PI / 4) * 1.414 : 1, pr = o.pan !== undefined ? Math.sin((o.pan + 1) * Math.PI / 4) * 1.414 : 1;
  const n = Math.floor((i1 - i0) / rate);
  for (let k = 0; k < n; k++) {
    const i = s0 + k; if (i < 0 || i >= N) continue;
    const src = i0 + k * rate, j = Math.floor(src), fr = src - j; if (j + 1 >= r.n) break;
    let l = r.L[j] * (1 - fr) + r.L[j + 1] * fr, rr = r.R[j] * (1 - fr) + r.R[j + 1] * fr;
    const e = Math.min(1, k / fi, (n - k) / fo) * gain * (o.env ? o.env((i) / SR) : 1);
    if (lpL) { l = lpL.tick(l); rr = lpR.tick(rr); }
    bus.L[i] += l * e * pl; bus.R[i] += rr * e * pr;
    revL[i] += l * e * (o.rev ?? .05); revR[i] += rr * e * (o.rev ?? .05);
  }
}
const ONE = '0819-one-frog.mp3', CHORUS1 = '0997-frogs-1.mp3', CHORUS2 = '0998-frogs-2.mp3', FIELD = '0691-pond-in-a-field.mp3', RAIN = '1290-rain-on-puddle.mp3', STORM = '0124-rain-and-thunder-1.mp3';
const CROAKS = [2.71, 5.68, 7.28, 9.44, 13.53, 14.23];
function croak(t0, k = 0, gain = 1, o = {}) { const a = CROAKS[k % CROAKS.length]; play(ONE, a, a + .4, t0 - .06, gain * 3.2, { fo: .08, rev: .12, ...o }); }

// underwater-ness of the camera through the film (0 above, 1 below), for the ambience filter
function underAt(t) {
  if (t < 11.4) return 0;
  if (t < 12.6) return ss(11.4, 12.6, t) * .5;
  if (t < 18) return .5;
  if (t < 100.2) return lerp(.5, 1, ss(17.5, 18.5, t));
  if (t < 101.4) return lerp(1, .5, ss(100.2, 101.4, t));
  if (t < 110.4) return .5;
  if (t < 117) return 0;
  if (t < 124.6) return ss(117, 118.2, t);
  return lerp(1, .5, ss(124.6, 125.6, t));
}
// a long ambience bed with gain automation g(t) and a cutoff that follows underAt
function bed(name, from, t0, t1, g, o = {}) {
  const r = rec(name), s0 = S0(t0), s1 = S0(t1), lpL = new SVF(12000, .7), lpR = new SVF(12000, .7), bus = BUS.amb;
  for (let i = s0; i < s1; i++) {
    const k = i - s0, j = (S0(from) + k) % r.n, t = i / SR;
    if ((i & 63) === 0) { const u = underAt(t); const fc = 12000 * Math.pow(500 / 12000, u * (o.muffle ?? 1)); lpL.set(fc, .7); lpR.set(fc, .7); }
    const gg = g(t) * Math.min(1, k / (SR * .5), (s1 - i) / (SR * .5));
    if (gg <= 0) { lpL.tick(0); lpR.tick(0); continue; }
    bus.L[i] += lpL.tick(r.L[j]) * gg; bus.R[i] += lpR.tick(r.R[j]) * gg;
  }
}

// ---------------------------------------------------------------- the frog theme + harmony
// theme phrases in beats: [beat, midi, durBeats, vel]
const THEME_A = [[0, 72, .5], [.5, 77, .5], [1, 81, 1], [2, 79, .5], [2.5, 77, .5], [3, 74, 1], [4, 72, .5], [4.5, 74, .5], [5, 77, .5], [5.5, 79, .5], [6, 81, 1.6]];
const THEME_B = [[0, 82, .5], [.5, 81, .5], [1, 79, 1], [2, 77, .5], [2.5, 74, .5], [3, 72, 1], [4, 74, .5], [4.5, 77, .5], [5, 79, .5], [5.5, 81, .5], [6, 77, 2]];
const phrase = (P, t0, tr = 0, v = 1) => P.map(([b, m, d, vv = 1]) => [t0 + b * BEAT, m + tr, d * BEAT, v * vv]);
const CH = { F: [53, 57, 60, 65], Dm: [50, 57, 62, 65], Bb: [46, 58, 62, 65], C: [48, 55, 60, 64], Gm: [43, 58, 62, 67], Am: [45, 57, 60, 64], A: [45, 57, 61, 64], Eb: [51, 58, 63, 67], Fmaj7: [53, 57, 64, 69] };
const ROOT = { F: 41, Dm: 38, Bb: 34, C: 36, Gm: 43, Am: 45, A: 45, Eb: 39, Fmaj7: 41 };

// the "pond band": udu, frame drum, guiro rib-bits, shaker, bass clarinet, vibes skank. chords: one per bar
function band(bar0, chords, o = {}) {
  const k = o.k ?? 1, muff = o.muff ?? 0;
  chords.forEach((c, j) => {
    const b = bar0 + j, root = ROOT[c];
    udu(B(b, 0), .9 * k, 0); udu(B(b, 1.5), .55 * k, 7); udu(B(b, 2.5), .75 * k, 0); udu(B(b, 3.75), .4 * k, 5);
    if (!o.noFrame) { frame(B(b, 1), .45 * k, { dec: .18 }); frame(B(b, 3), .5 * k, { dec: .18 }); }
    if (!o.noGuiro) { guiro(B(b, 1), .12, .9 * k); guiro(B(b, 1.25), .1, .7 * k); guiro(B(b, 3), .12, .9 * k); guiro(B(b, 3.25), .1, .7 * k); }
    if (!o.noShaker) for (let s = 0; s < 8; s++) shaker(B(b, s * .5), (s % 2 ? .9 : .45) * k * (1 - muff * .6));
    if (!o.noBass) { bassNote(root, B(b, 0), .32, .95 * k); bassNote(root + 7, B(b, 1.5), .22, .7 * k); bassNote(root + 12, B(b, 2), .3, .8 * k); bassNote(root + 7, B(b, 3), .22, .7 * k); bassNote(root + (j % 2 ? 4 : 2), B(b, 3.5), .2, .6 * k); }
    if (!o.noVibes) { const ch = CH[c]; for (const m of ch.slice(1)) { vibes(m + 12, B(b, 1.5), .35 * k, { trem: 0, len: .5, stop: B(b, 1.5) + .28 }); vibes(m + 12, B(b, 3.5), .3 * k, { trem: 0, len: .5, stop: B(b, 3.5) + .28 }); } }
  });
}

// ================================================================= THE SCORE
function score() {
  // ---------- ambience beds
  bed(CHORUS2, 8, 0, 12.8, (t) => .95 * ss(0, 1.2, t) * (1 - ss(10.8, 12.4, t) * .7));
  roomTone(17.4, 100.6, 1); roomTone(117.2, 125.4, 1.1, { cut: 200 });
  // ---------- bars 0-4: night pond + title
  pad([53, 60, 64, 67], 0.2, 11.6, .9, { cut: 900, atk: 3 });
  for (let i = 0; i < 9; i++) plink(R(.8, 11), R(1400, 2600), R(.2, .5));
  bubble(EV.eyes - .1, 3, 1.2); bubbles(EV.eyes, .5, 18, 1.5, 3.5, .7); udu(EV.eyes, .4, -5, { bus: 'sfx' });
  handpan(60, EV.eyes + .3, .5);
  croak(EV.croak0[0], 2, 1); croak(EV.croak0[1], 3, 1.05);
  handpan(65, EV.croak0[0] + .6, .55); handpan(69, EV.croak0[0] + .9, .45);
  handpan(67, EV.croak0[1] + .6, .55); handpan(72, EV.croak0[1] + .9, .5);
  // title: the theme rises out of the water with the letters
  riser(EV.title - 1.6, EV.title, .4);
  boom(EV.title, .4, { dec: 1.4 });
  shimmer(EV.title, 1.2, .6);
  phrase(THEME_A, EV.title).forEach(([t, m, d, v]) => handpan(m - 12, t, .7 * v));
  phrase(THEME_B, EV.title + B(2)).forEach(([t, m, d, v]) => { handpan(m - 12, t, .62 * v); kalimba(m + 12, t, .3 * v); });
  pad([46, 58, 62, 65], EV.title + B(2), 2.4, .55, { cut: 1000, atk: .8 }); pad([48, 55, 60, 64], EV.title + B(3), 2.4, .55, { cut: 1000, atk: .8 });
  pad([53, 57, 60, 65], EV.title, 2.4, .6, { cut: 1100, atk: .5 }); pad([50, 57, 62, 65], EV.title + B(1), 2.4, .6, { cut: 1100, atk: .5 });
  // letter drips (as drawn by the title)
  for (let i = 0; i < 4; i++) for (let k = 0; k < 3; k++) { const h = ((i * 7 + k) * 2654435761 >>> 0) / 4294967296; plink(EV.title + i * .11 + .55 + k * .23 + h * .2 + .16, 1500 + i * 220 + k * 90, .55); }
  whoosh(EV.dive - .3, 1.3, .6, { f0: 2500, f1: 300 }); splash(EV.dive + .3, .45, { cut: 2500 }); bubbles(EV.dive + .3, 1, 30, 1.5, 5, .55);

  // ---------- bars 5-9: the call (groove) + amplexus
  band(5, ['F', 'Dm', 'Bb', 'C'], { k: .58 });
  band(9, ['F'], { k: .42, muff: 1, noGuiro: true, noShaker: true });
  EV.calls.forEach((c, i) => croak(c, i, .45, { pan: .1 }));
  play(CHORUS1, 20, 32, SHOT.call, .26, { bus: 'amb', fi: .8, fo: 1, cut: 3500 });
  clarinet([...phrase(THEME_A, B(6)), ...phrase(THEME_B, B(8)).filter(([t]) => t < EV.grab - .1)], { gain: .75 });
  // the lunge
  clarinet([[EV.grab - .2, 72, .1, .8], [EV.grab - .1, 77, .1, .9], [EV.grab, 84, .3, 1]], { gain: 1.1 }); udu(EV.grab, 1, 12); splash(EV.grab, 1);
  whoosh(SHOT.amplex - .5, 1, .7, { f0: 2000, f1: 300 }); bubbles(SHOT.amplex - .2, .8, 25, 1.5, 5, .6);
  // underwater, romantic: vibes + strings
  strings([53, 57, 60, 65], SHOT.amplex, 2.4, .7, { cut: 1800 }); strings([50, 57, 62, 65], B(8.5), 2.4, .7, { cut: 1800 }); strings([46, 58, 62, 65], B(9) + .6, 2.4, .7, { cut: 1800 });
  [[0, 81, 1], [1, 79, .5], [1.5, 77, .5], [2, 76, 1.5], [3.5, 77, .5], [4, 74, 2], [6, 72, .5], [6.5, 74, .5], [7, 77, 1.5], [8.5, 81, .5], [9, 82, 1], [10, 81, 2]]
    .forEach(([b, m, d]) => vibes(m, SHOT.amplex + b * BEAT, .6, { len: d * BEAT + 1.5 }));
  for (let i = 0; i < 40; i++) bubble(EV.eggs + i * (3 / 40) + R(0, .05), R(1, 1.8), .35, { rev: .5 });
  shimmer(EV.fert, 2, .6, { notes: [84, 88, 91, 96, 100] });
  play(ONE, 12.8, 14.5, B(8.2), .9, { cut: 900, bus: 'sfx', fi: .2, fo: .4 });

  // ---------- bars 10-13: frogspawn swelling + rising
  bubbles(SHOT.spawn - .6, 1.2, 50, 1, 5, .9);
  const arp = (bar, ch, n = 16, v = .5, o = {}) => { for (let s = 0; s < n; s++) { const notes = CH[ch].slice(1).map((m) => m + 12); kalimba(notes[s % notes.length] + (s % 6 === 5 ? 12 : 0), B(bar, s * 4 / n), v * (s % 4 === 0 ? 1 : .7), o); } };
  arp(10, 'F'); arp(11, 'Fmaj7'); arp(12, 'Bb'); arp(13, 'C', 16, .55);
  [[10, 41], [11, 41], [12, 46], [13, 48]].forEach(([b, m]) => vibes(m, B(b), .8, { trem: .3, len: 3 }));
  for (let i = 0; i < 5; i++) { const t = EV.swell + i * .9; udu(t, .5, 12 + i, { bus: 'sfx', rev: .5 }); bubble(t + .05, 2.5, .6); }
  strings([53, 60, 65, 69], B(12), 4.6, .8, { cut: 2600, atk: 1.2 });
  [79, 81, 84, 86, 89].forEach((m, i) => vibes(m, EV.rise + i * .3, .6, { len: 2 }));
  riser(B(12.5), EV.zoom + .6, .9);
  noiseHit(SHOT.embryo, .5, { dur: 2.4, dec: 1 }); boom(SHOT.embryo, .6, { dec: .9 }); whoosh(EV.zoom - .1, 1.4, .8, { f0: 300, f1: 4000 });

  // ---------- bars 14-21: the embryo clockwork
  pad([53, 60, 64, 69], SHOT.embryo, 7.2, .8, { cut: 1500, atk: 1.5 });
  handpan(53, SHOT.embryo + .2, .7); handpan(60, SHOT.embryo + 1.4, .4);
  glassH(89, SHOT.embryo + 1.2, 1.4, .6); glassH(84, 35.2, 1.4, .5);
  const divNotes = [65, 69, 72, 77, 81, 84, 89];
  EV.divisions.forEach((t, i) => { cellPop(t, divNotes[i], 1); if (i >= 1) kalimba(divNotes[i - 1] + 12, t + .3, .35); });
  for (let s = 0; s < 8; s++) kalimba([89, 93, 96, 101][s % 4], 39.6 + s * .075, .5 - s * .03);
  // gastrulation: mysterious turn
  pad([50, 57, 62, 64], B(17), 4.8, .9, { cut: 1300, atk: 1 });
  clarinet([[B(17), 62, 1.1, .7], [B(17, 2), 64, .5, .6], [B(17, 3), 65, 1.6, .7], [B(18), 62, 1.1, .65], [B(18, 2), 60, .6, .6], [B(18, 3), 58, 1.8, .7]], { gain: .8, bright: 2200 });
  for (let s = 0; s < 16; s++) vibes([74, 77, 81, 76][s % 4] + (s >= 8 ? -2 : 0), B(17, s * .5), .35, { trem: .3, len: 1.5 });
  // neural tube zipping shut: rising line resolving to F
  pad([46, 53, 62, 65], B(19), 2.4, .9, { cut: 1600, atk: .6 });
  [74, 76, 77, 79, 81, 82, 84, 86].forEach((m, i) => vibes(m, B(19, i * .5), .5, { len: 1.6 }));
  strings([53, 60, 65, 69, 72], B(19, 3), 2.6, .8, { cut: 2400, atk: .8 });
  // tailbud + heartbeat
  for (let t = EV.heart; t < EV.hatchOut; t += BEAT) heartbeat(t, .9);
  bassNote(41, B(20), 2.2, .7, { gain: 1.2, rel: .3 }); bassNote(36, B(21), 1.1, .7, { gain: 1.2 }); bassNote(38, B(21, 2), 1.1, .7, { gain: 1.2 });
  strings([65, 69, 72], B(20), 4.8, .7, { trem: 9, cut: 3000, atk: .5 });
  for (let s = 0; s < 16; s++) kalimba(72 + [0, 4, 7, 12][s % 4] + Math.floor(s / 4) * 2, B(21, s * .25), .3 + s * .02);
  riser(B(20.5), EV.hatchOut, .7);
  // hatch!
  bubble(EV.hatchOut, 3, 1.4); udu(EV.hatchOut, .8, 12, { bus: 'sfx' }); swish(EV.hatchOut + .1, .4, 1); shimmer(EV.hatchOut, .8, .7);
  whoosh(SHOT.hatch - .5, 1, .7, { f0: 3000, f1: 400 });
  handpan(65, SHOT.hatch, .7); handpan(69, SHOT.hatch + .3, .6); handpan(72, SHOT.hatch + .6, .6);

  // ---------- bars 22-25: hatchlings (curious duet, then time-lapse)
  pad([53, 57, 60, 65], B(22), 4.8, .6, { cut: 1400, atk: .8 });
  const duet = [[0, 77, .5], [.5, 79, .5], [1, 81, 1.5], [3, 77, 1], [4, 76, .5], [4.5, 77, .5], [5, 79, 2], [7, 72, 1]];
  clarinet(phrase(duet, B(22)), { gain: .75, bright: 2600 });
  phrase(duet, B(22, .25)).forEach(([t, m, d]) => vibes(m - 12, t + .3, .3, { len: 1 }));
  for (let s = 0; s < 8; s++) shaker(B(22, s), .5);
  swish(EV.wriggle, .4, .8); bubbles(EV.wriggle, .4, 20, 1, 2.5, .6);
  // time-lapse ostinato as the operculum grows
  for (let s = 0; s < 32; s++) kalimba([77, 81, 84, 81][s % 4] + (s >= 16 ? 2 : 0) - (s >= 24 ? 4 : 0), B(24, s * .25), .32);
  [[24, 'F'], [25, 'Gm']].forEach(([b, c]) => { pad(CH[c].map((m) => m + 12), B(b), 2.4, .6, { cut: 1600, atk: .4 }); bassNote(ROOT[c], B(b), .5, .7); bassNote(ROOT[c], B(b, 2), .5, .6); });
  vibes(89, 59.6, .5, { len: 2 }); vibes(93, 59.9, .4, { len: 2 });
  swish(EV.swimOff, .5, 1); whoosh(SHOT.tadpole - .5, 1, 1, { sweep: 1.6, f0: 300, f1: 1800 });

  // ---------- bars 26-29: tadpole dance
  band(26, ['F', 'Dm', 'Bb', 'C'], { k: .82 });
  play(FIELD, 64, 70, SHOT.tadpole, .0, { bus: 'amb' });
  vibes(77, B(26), .6); clarinet([...phrase(THEME_A, B(26, 0)), ...phrase(THEME_B, B(28, 0)).slice(0, 8)], { gain: 1 });
  phrase(THEME_A, B(26, 0)).forEach(([t, m]) => vibes(m, t, .35, { len: .6, trem: 0 }));
  for (let t = EV.graze; t < EV.graze + 2.4; t += .15) { const s0 = t + R(-.02, .02); snap(s0, .12); }
  bubble(EV.gulp, 4.5, 1.4); gulp(EV.gulp + .1, .8); bubbles(EV.gulp + .2, .4, 16, 2, 4, .7);

  // ---------- bars 29-32: danger (D minor)
  pad([38, 45, 50, 53], B(29), 7.2, 1, { cut: 700, atk: 1.2 });
  strings([50, 51], B(29, 2), 6.6, .7, { trem: 11, cut: 1600, atk: 1 });
  [[0, 38], [1.5, 39], [3, 38], [4, 37], [5.5, 38], [7, 41], [8, 40]].forEach(([b, m]) => bassNote(m, B(29, b), .45, .8, { gain: 1.4 }));
  for (let b = 0; b < 8; b++) frame(B(29, b), .35 + b * .03, { f: 50, dec: .3, skin: .2 });
  horn(38, EV.nymph, 1.6, .9, { swell: 1 }); horn(44, EV.nymph, 1.6, .7, { swell: 1 });
  for (let t = EV.nymph + .6; t < EV.strike; t += .3) guiro(t, .08, .6);
  riser(EV.nymph + .4, EV.strike, .8);
  // STRIKE
  snap(EV.strike, 1.4); boom(EV.strike, 1, { dec: .6 }); noiseHit(EV.strike, .7, { dur: 1.6 }); whoosh(EV.strike - .05, .25, 1.1, { f0: 800, f1: 5000 });
  choir([50, 57, 62, 63], EV.strike, .5, 1.1, { atk: .01, rel: .5, vowel: 'a' });
  // scatter
  for (let s = 0; s < 24; s++) vibes([74, 77, 81, 86, 81, 77][s % 6] - (s > 12 ? 2 : 0), EV.strike + .35 + s * .09, .35, { len: .5, trem: 0, pan: R(-.8, .8) });
  for (let i = 0; i < 6; i++) swish(EV.strike + .3 + i * .22, .3, .6, { pan: R(-.7, .7) });
  frame(EV.strike + .4, .7); frame(EV.strike + .7, .6); frame(EV.strike + .85, .5);
  // calm returns
  pad([53, 57, 60, 65], EV.calm, 2.6, .8, { cut: 1600, atk: .8 });
  handpan(65, EV.calm + .1, .6); handpan(72, EV.calm + .7, .5); handpan(69, EV.calm + 1.3, .5);
  bubbles(SHOT.legs - .6, 1.2, 45, 1, 5, .85);

  // ---------- bars 32-36: legs (hopeful build)
  ['F', 'Dm', 'Bb', 'C'].forEach((c, j) => {
    const b = 32 + j, ch = CH[c];
    for (let s = 0; s < 8; s++) vibes(ch[1 + (s % 3)] + 12 + (s === 7 ? 7 : 0), B(b, s * .5), .4 + (s % 2 ? 0 : .1), { trem: 0, len: 1.2 });
    bassNote(ROOT[c], B(b), 2, .7, { gain: 1.1, rel: .2 });
    udu(B(b, 0), .55); udu(B(b, 2), .45, 7);
    if (j >= 2) { for (let s = 0; s < 8; s++) shaker(B(b, s * .5), .5); }
    strings(ch.map((m) => m + 12), B(b), 2.4, .5 + j * .1, { cut: 2000 + j * 300 });
  });
  clarinet(phrase(THEME_A.map(([b, m, d, v]) => [b * 2, m - 12, d * 2, v]), B(32)), { gain: .9, bright: 2600 });
  [EV.bud, 79.8, EV.toes].forEach((t, i) => { vibes(84 + i * 3, t, .6, { len: 2.5 }); plink(t, 2000 + i * 300, .5); });
  swish(EV.kick, .3, .9); udu(EV.kick, .7, 12, { bus: 'sfx' }); handpan(77, EV.kick + .05, .5);
  riser(B(35), B(36), .5);

  // ---------- bars 36-42: METAMORPHOSIS
  pad([38, 45, 50, 57], B(36), 2.4, 1, { cut: 900, atk: .8 });
  choir([62, 65, 69], B(36), 2.4, .7, { vowel: 'o', atk: 1.2 });
  for (let t = B(36); t < EV.pop; t += BEAT) heartbeat(t, .6);
  shimmer(EV.thyroid, 1.6, .8, { notes: [86, 89, 93, 98] }); glassH(86, EV.thyroid, 1.5, .7);
  riser(EV.thyroid + .4, EV.pop, .8);
  // POP: the left arm bursts out of the spiracle
  boom(EV.pop, 1.1, { dec: .9 }); noiseHit(EV.pop, .8, { dur: 2 }); udu(EV.pop, 1, 14, { bus: 'sfx' }); choir([62, 65, 69, 74], EV.pop, .7, 1, { atk: .02, rel: .6 });
  // driving build: Dm Bb F C | Dm Bb Gm A
  const prog = ['Dm', 'Bb', 'F', 'C', 'Dm', 'Bb', 'Gm', 'A'];
  prog.forEach((c, j) => {
    const t = EV.pop + j * 1.2, ch = CH[c], k = (.6 + j * .07) * 1.55;
    for (let s = 0; s < 8; s++) frame(t + s * .15, (s % 4 === 0 ? 1 : .45) * k, { f: s % 4 === 0 ? 58 : 75, dec: s % 4 === 0 ? .35 : .12 });
    for (let s = 0; s < 8; s++) udu(t + s * .15 + .075, .25 * k, s % 2 ? 7 : 0);
    strings(ch.map((m) => m + 12), t, 1.2, .8 * k, { cut: 2600 + j * 200, atk: .08, rel: .3 });
    for (let s = 0; s < 8; s++) kalimba(ch[1 + (s % 3)] + 24, t + s * .15, .25 * k);
    bassNote(ROOT[c], t, .3, .9); bassNote(ROOT[c], t + .6, .3, .8);
    choir(ch.slice(1).map((m) => m + 12), t, 1.2, .55 * k, { vowel: j < 4 ? 'o' : 'a', atk: .3, rel: .5 });
  });
  horn(57, EV.tail, 2.4, 1.2, { swell: 1 }); horn(62, EV.mouthW, 2.4, 1.2, { swell: 1 }); horn(65, EV.lungs, 2.4, 1.3, { swell: 1 });
  breath(EV.lungs + .1, 1.1, 1);
  clarinet(phrase(THEME_A.map(([b, m, d, v]) => [b, m - 12, d, v]), EV.tail + .6), { gain: 1.1, bright: 3600 });
  // final build into the reveal
  for (let s = 0; s < 16; s++) frame(96.0 + s * .15, .4 + s * .055, { f: 80, dec: .1 });
  riser(95.4, EV.reveal, 1.3); choir([57, 62, 65, 69], 96.0, 2.4, 1.2, { vowel: 'a', atk: 1.5 });
  // REVEAL: full theme, tutti in F
  boom(EV.reveal, 1.3, { dec: 1.2 }); noiseHit(EV.reveal, 1.1, { dur: 3, dec: 1.2 }); shimmer(EV.reveal, 1.4, .9);
  strings([53, 60, 65, 69, 72], EV.reveal, 2.4, 1.4, { cut: 4800, atk: .05 });
  choir([65, 69, 72, 77], EV.reveal, 2.4, 1.4, { vowel: 'a', atk: .1 });
  horn(53, EV.reveal, 2.2, 1.3); horn(60, EV.reveal, 2.2, 1.2); horn(65, EV.reveal, 2.2, 1.1);
  phrase(THEME_A, EV.reveal).filter(([t]) => t < 100.4).forEach(([t, m, d, v]) => { handpan(m - 12, t, 1 * v); kalimba(m + 12, t, .4); });
  whoosh(SHOT.froglet - .6, 1.2, 1, { f0: 300, f1: 3000 }); splash(SHOT.froglet + .2, .9);

  // ---------- bars 42-46: froglet (joy) -> rain dance
  band(42, ['F', 'Dm', 'Bb', 'C'], { k: .8 });
  clarinet([...phrase(THEME_A, B(42)), ...phrase(THEME_B, B(44))], { gain: 1.05 });
  phrase(THEME_A, B(42)).forEach(([t, m]) => handpan(m - 12, t, .45));
  [72, 74, 77, 81].forEach((m, i) => kalimba(m + 12, EV.climb + i * .1, .5)); splash(EV.climb + .4, .5);
  play(RAIN, 6, 14, EV.rain - .8, .9, { bus: 'amb', fi: 1.4, fo: 1, env: (t) => 1 - ss(109.6, 110.6, t) });
  play(STORM, 28.6, 33, EV.rain + .2, .35, { bus: 'amb', fi: .5, fo: 1.5 });
  for (let s = 0; s < 64; s++) if (rnd() < .7) kalimba([77, 81, 84, 88, 89, 93][Math.floor(R(0, 6))], EV.rain + s * .1, .18, { pan: R(-.9, .9) });
  tongue(EV.tongue1, 1); gulp(EV.tongue1 + .45, .7); clarinet([[EV.tongue1 + .2, 84, .1, .8], [EV.tongue1 + .3, 81, .1, .8], [EV.tongue1 + .4, 77, .25, .9]], { gain: .9 });
  whoosh(SHOT.grow - .5, 1, .8, { f0: 600, f1: 2400 }); shimmer(SHOT.grow - .2, .6, .5);

  // ---------- bars 46-49: summer -> autumn
  play(FIELD, 96, 104, SHOT.grow, .8, { bus: 'amb', fi: .8, fo: 1.2 });
  band(46, ['F', 'Bb'], { k: .6, noShaker: true, noGuiro: false });
  [[0, 77, 1.5], [1.5, 76, .5], [2, 77, .5], [2.5, 79, .5], [3, 81, 1], [4, 82, 1], [5, 81, .5], [5.5, 79, .5], [6, 77, 2]].forEach(([b, m, d]) => vibes(m, B(46, b), .55, { len: d * BEAT + 1, trem: .25 }));
  tongue(EV.tongue2, 1); gulp(EV.tongue2 + .42, .9);
  whoosh(113.4, 1.3, .7, { f0: 400, f1: 3000 }); for (let s = 0; s < 16; s++) kalimba([77, 81, 84, 89][s % 4] + (s >= 8 ? 2 : 0), 113.4 + s * .075, .3);
  // autumn: wistful theme on clarinet, warm strings
  strings([50, 57, 62, 65], EV.autumn, 2.4, .7, { cut: 1800, atk: .6 }); strings([46, 58, 62, 65], EV.autumn + 2.4, 1.2, .7, { cut: 1800, atk: .4 });
  clarinet(phrase([[0, 74, 1], [1, 72, .5], [1.5, 70, .5], [2, 69, 1.5], [3.5, 67, .5], [4, 65, 1]], EV.autumn), { gain: .85, bright: 2400 });
  for (let i = 0; i < 6; i++) kalimba(84 - i * 2, EV.autumn + .3 + i * .4, .25);
  splash(116.7, 1); whoosh(SHOT.winter - .6, 1.2, .8, { f0: 2400, f1: 250 }); bubbles(SHOT.winter - .3, 1, 30, 1.5, 5, .7);

  // ---------- bars 49-51: winter, under the ice
  glassH(74, SHOT.winter + .2, 4.4, .7); glassH(81, SHOT.winter + .9, 3.6, .55); glassH(77, SHOT.winter + 1.8, 2.8, .5);
  pad([38, 50, 57, 64], SHOT.winter, 4.8, .45, { cut: 700, atk: 1.5 });
  for (let t = 118.2; t < 122.2; t += 1.8) heartbeat(t, .55);
  creak(118.0, .9); creak(119.6, .7); creak(121.1, .8);
  handpan(50, SHOT.winter + .3, .4); handpan(57, 120.0, .35);
  riser(121.0, SHOT.spring, .7);

  // ---------- bars 51-56: spring, the cycle, finale
  iceCrack(SHOT.spring - .1, 1.2); noiseHit(SHOT.spring, .8, { dur: 2.4 }); boom(SHOT.spring, .8);
  strings([53, 60, 65, 69, 72], SHOT.spring, 2.4, .9, { cut: 3200, atk: .1 });
  for (let s = 0; s < 16; s++) kalimba([77, 81, 84, 89][s % 4] + (s >= 8 ? 4 : 0), SHOT.spring + .1 + s * .15, .35);
  handpan(65, SHOT.spring + .2, .6); handpan(72, SHOT.spring + .8, .5);
  swish(123.2, .5, .7); swish(124.0, .5, .7);
  whoosh(EV.swimUp - .4, 1, .9, { f0: 400, f1: 3000 }); splash(EV.swimUp + .5, .8);
  play(CHORUS2, 40, 52, 125.0, .55, { bus: 'amb', fi: 1.2, fo: 1.5, env: (t) => 1 - ss(131, 133, t) * .7 });
  [...EV.croak1].forEach((c, i) => croak(c, 4 + i, 1.1));
  band(52, ['F', 'Dm', 'Bb'], { k: .9 });
  clarinet(phrase(THEME_A, B(52)), { gain: 1.05 });
  phrase(THEME_A, B(52)).forEach(([t, m]) => vibes(m, t, .3, { len: .6, trem: 0 }));
  shimmer(EV.spawn2, 1.4, .8); [77, 81, 84, 89, 93].forEach((m, i) => kalimba(m, EV.spawn2 + i * .12, .5));
  // pull back: the cycle in the full ensemble
  riser(EV.pull - 1.0, EV.pull, .6); boom(EV.pull, .7, { dec: 1 });
  strings([46, 58, 62, 65, 70], EV.pull, 1.8, 1, { cut: 3600, atk: .2 });
  choir([62, 65, 70], EV.pull, 1.8, .9, { vowel: 'a', atk: .3 });
  phrase(THEME_B, EV.pull).filter(([t]) => t < EV.endTitle).forEach(([t, m, d, v]) => { horn(m - 12, t, d * .95, .8 * v); handpan(m - 12, t, .5 * v); });
  // end title: final cadence C -> F, everything rings out
  strings([48, 55, 60, 64, 67], EV.endTitle - 1.2, 1.2, .9, { cut: 3200, atk: .2 });
  boom(EV.endTitle, 1, { dec: 1.6 }); noiseHit(EV.endTitle, .9, { dur: 3.5, dec: 1.6 }); shimmer(EV.endTitle, 1.8, .9);
  strings([41, 53, 60, 65, 69, 72], EV.endTitle, 2.2, 1.1, { cut: 3800, atk: .05, rel: 1.6 });
  choir([65, 69, 72, 77], EV.endTitle, 2.2, 1, { vowel: 'a', atk: .1, rel: 1.6 });
  horn(53, EV.endTitle, 2.2, 1); horn(60, EV.endTitle, 2.2, .9); horn(65, EV.endTitle, 2.2, .9);
  handpan(53, EV.endTitle, .9); handpan(65, EV.endTitle + .3, .7); kalimba(89, EV.endTitle + .6, .5); kalimba(93, EV.endTitle + .9, .45);
  croak(EV.lastCroak, 2, 1.25, { rev: .25 });
  handpan(65, EV.lastCroak + .5, .7, { len: 3 });
  // UI water drops: chapter numerals landing, clock bubbles popping
  for (const [a] of CHAPTERS) plink(a + .38, 1300, .45, { pan: -.6 });
  for (let i = 1; i < CLOCK.length; i++) if (CLOCK[i - 1][2]) { bubble(CLOCK[i][0], 1.3, .6, { pan: .7 }); }
}

// ---------------------------------------------------------------- reverb (Freeverb-style) + delay + master
function reverb(L, Rr, room = .86, damp = .28) {
  const sc = SR / 44100, combs = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617], aps = [556, 441, 341, 225];
  const mk = (n) => ({ b: new Float32Array(Math.round(n * sc)), i: 0, f: 0 });
  const CL = combs.map(mk), CR = combs.map((n) => mk(n + 23)), AL = aps.map(mk), AR = aps.map((n) => mk(n + 23));
  const oL = new Float32Array(N), oR = new Float32Array(N);
  const pre = Math.round(.018 * SR);
  for (let i = 0; i < N; i++) {
    const xl = (i >= pre ? L[i - pre] : 0) * .015, xr = (i >= pre ? Rr[i - pre] : 0) * .015;
    let yl = 0, yr = 0;
    for (let k = 0; k < 8; k++) {
      const c = CL[k], o = c.b[c.i]; c.f = o * (1 - damp) + c.f * damp; c.b[c.i] = xl + c.f * room; if (++c.i >= c.b.length) c.i = 0; yl += o;
      const d = CR[k], p = d.b[d.i]; d.f = p * (1 - damp) + d.f * damp; d.b[d.i] = xr + d.f * room; if (++d.i >= d.b.length) d.i = 0; yr += p;
    }
    for (let k = 0; k < 4; k++) {
      const a = AL[k], bo = a.b[a.i]; a.b[a.i] = yl + bo * .5; if (++a.i >= a.b.length) a.i = 0; yl = bo - yl;
      const b = AR[k], co = b.b[b.i]; b.b[b.i] = yr + co * .5; if (++b.i >= b.b.length) b.i = 0; yr = co - yr;
    }
    oL[i] = yl; oR[i] = yr;
  }
  return [oL, oR];
}
function delay(L, Rr) {
  const d = Math.round(BEAT * .75 * SR), oL = new Float32Array(N), oR = new Float32Array(N), lpL = new SVF(3000, .7), lpR = new SVF(3000, .7);
  for (let i = 0; i < N; i++) {
    const a = i >= d ? oR[i - d] : 0, b = i >= d ? oL[i - d] : 0;
    oL[i] = lpL.tick(L[i] + a * .38); oR[i] = lpR.tick(Rr[i] + b * .38);
  }
  return [oL, oR];
}

// RBJ biquad shelves for the master tilt
function biquad(type, f, dB, q) {
  const A = Math.pow(10, dB / 40), w = TAU * f / SR, c = Math.cos(w), s = Math.sin(w), al = s / (2 * q), sq = 2 * Math.sqrt(A) * al;
  let b0, b1, b2, a0, a1, a2;
  if (type === 'lowshelf') { b0 = A * ((A + 1) - (A - 1) * c + sq); b1 = 2 * A * ((A - 1) - (A + 1) * c); b2 = A * ((A + 1) - (A - 1) * c - sq); a0 = (A + 1) + (A - 1) * c + sq; a1 = -2 * ((A - 1) + (A + 1) * c); a2 = (A + 1) + (A - 1) * c - sq; }
  else { b0 = A * ((A + 1) + (A - 1) * c + sq); b1 = -2 * A * ((A - 1) + (A + 1) * c); b2 = A * ((A + 1) + (A - 1) * c - sq); a0 = (A + 1) - (A - 1) * c + sq; a1 = 2 * ((A - 1) - (A + 1) * c); a2 = (A + 1) - (A - 1) * c - sq; }
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  return (x) => { const y = (b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2) / a0; x2 = x1; x1 = x; y2 = y1; y1 = y; return y; };
}

function render(file) {
  const t0 = Date.now();
  score();
  console.log('voices', ((Date.now() - t0) / 1000).toFixed(1), 's');
  const [rl, rr] = reverb(revL, revR), [dl, dr] = delay(dlyL, dlyR);
  const GAIN = { mus: 1.0, sfx: 1.0, amb: .8 };
  const L = new Float32Array(N), Rr = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    let l = 0, r = 0;
    for (const k in BUS) { l += BUS[k].L[i] * GAIN[k]; r += BUS[k].R[i] * GAIN[k]; }
    L[i] = l + rl[i] * .9 + dl[i] * .5; Rr[i] = r + rr[i] * .9 + dr[i] * .5;
  }
  // gentle bus glue (RMS compressor) + lookahead peak limiter
  let env = 0; const att = Math.exp(-1 / (.015 * SR)), rel = Math.exp(-1 / (.3 * SR));
  for (let i = 0; i < N; i++) {
    const x = Math.max(Math.abs(L[i]), Math.abs(Rr[i]));
    env = x > env ? att * env + (1 - att) * x : rel * env + (1 - rel) * x;
    const over = Math.max(0, 20 * Math.log10(env + 1e-9) + 9), gr = Math.pow(10, -over * (1 - 1 / 1.7) / 20);
    L[i] *= gr; Rr[i] *= gr;
  }
  // master tilt: a touch less low-mid, more air
  for (const ch of [L, Rr]) {
    const lo = biquad('lowshelf', 220, -1.5, .7), hi = biquad('highshelf', 5200, 4.5, .7);
    for (let i = 0; i < N; i++) ch[i] = hi(lo(ch[i]));
  }
  // normalise to ~-15.5 LUFS-ish via RMS, then limit peaks to -1 dBFS
  let s = 0; for (let i = 0; i < N; i++) s += L[i] * L[i] + Rr[i] * Rr[i];
  const rms = Math.sqrt(s / (2 * N)), g = Math.pow(10, -17.5 / 20) / rms;
  const look = Math.round(.004 * SR), ceil = Math.pow(10, -1 / 20), gEnv = new Float32Array(N);
  let cur = 1;
  for (let i = N - 1; i >= 0; i--) { const pk = Math.max(Math.abs(L[i]), Math.abs(Rr[i])) * g; const need = pk > ceil ? ceil / pk : 1; cur = Math.min(need, cur + (1 - cur) * .0006); gEnv[i] = cur; }
  const buf = Buffer.alloc(44 + N * 4), D = buf;
  D.write('RIFF', 0); D.writeUInt32LE(36 + N * 4, 4); D.write('WAVE', 8); D.write('fmt ', 12); D.writeUInt32LE(16, 16); D.writeUInt16LE(1, 20); D.writeUInt16LE(2, 22);
  D.writeUInt32LE(SR, 24); D.writeUInt32LE(SR * 4, 28); D.writeUInt16LE(4, 32); D.writeUInt16LE(16, 34); D.write('data', 36); D.writeUInt32LE(N * 4, 40);
  let mn = 1;
  for (let i = 0; i < N; i++) {
    let m = 1; for (let k = Math.max(0, i - look); k <= i; k++) if (gEnv[k] < m) m = gEnv[k];
    mn = Math.min(mn, m);
    const fadeOut = clamp((S0(DURATION - .05) - i) / (SR * 1.3));
    const l = Math.tanh(L[i] * g * m * 1.05) * fadeOut, r = Math.tanh(Rr[i] * g * m * 1.05) * fadeOut;
    D.writeInt16LE(Math.max(-32767, Math.min(32767, Math.round(l * 32767 + (rnd() - .5)))), 44 + i * 4);
    D.writeInt16LE(Math.max(-32767, Math.min(32767, Math.round(r * 32767 + (rnd() - .5)))), 46 + i * 4);
  }
  fs.writeFileSync(file, buf);
  console.log('wrote', file, 'gain', g.toFixed(2), 'min limiter', mn.toFixed(2), ((Date.now() - t0) / 1000).toFixed(1), 's');
}

render(process.argv[2] || path.join(__dirname, '..', 'build', 'score.wav'));
