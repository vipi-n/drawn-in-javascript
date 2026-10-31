// Original score + sound design for the monarch film. Run: node js/music.js out.wav [--levels]
// 96 BPM, D major. One leitmotif (the "monarch theme") changes costume with the story: celesta + strings at dawn,
// a music box for the egg, a bouncy marimba/bassoon band while the caterpillar eats, a jay attack in D minor tremolo,
// nylon guitar at golden hour, a night lullaby with real crickets, a pulsing synth "transformation" in the chrysalis,
// slow swelling strings as the wings pump up, the full orchestra on the first flight, a sunny flute + guitar summer,
// a driving B-minor ostinato for the migration, marimba/guitar/choir in the Mexican forest with an orchestral climax
// when millions take off, and the theme once more round the life-cycle ring.
// Ambiences are real CC0 recordings (Joseph Sardin, BigSoundBank); everything else is synthesized here.
const fs = require('fs'), path = require('path');
const { DURATION, rng } = require('./core');
const { EV } = require('./cues');

const SR = 48000, N = Math.ceil((DURATION + 2) * SR), TAU = Math.PI * 2;
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
const rnd = rng(1957);
const R = (a = 0, b = 1) => a + (b - a) * rnd();
const clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
const lerp = (a, b, t) => a + (b - a) * t;
const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };

// ---------------------------------------------------------------- buses
const dryL = new Float32Array(N), dryR = new Float32Array(N), revL = new Float32Array(N), revR = new Float32Array(N);
const dlyL = new Float32Array(N), dlyR = new Float32Array(N);
const SECS = Math.ceil(N / SR), LEVEL = { mus: new Float64Array(SECS), sfx: new Float64Array(SECS) };
function mixer(pan, gain, rev = .25, dly = 0, bus = 'mus') {
  const a = (clamp(pan, -1, 1) + 1) * Math.PI / 4, gl = Math.cos(a) * gain, gr = Math.sin(a) * gain, E = LEVEL[bus];
  return (i, l, r = l) => {
    if (i < 0 || i >= N) return;
    const L = l * gl, Rr = r * gr;
    dryL[i] += L; dryR[i] += Rr; revL[i] += L * rev; revR[i] += Rr * rev;
    if (dly) { dlyL[i] += L * dly; dlyR[i] += Rr * dly; }
    E[(i / SR) | 0] += L * L + Rr * Rr;
  };
}

// ---------------------------------------------------------------- DSP blocks
function blep(t, dt) {
  if (t < dt) { t /= dt; return t + t - t * t - 1; }
  if (t > 1 - dt) { t = (t - 1) / dt; return t * t + t + t + 1; }
  return 0;
}
class Osc {
  constructor(ph = rnd()) { this.p = ph; }
  saw(f) { const dt = f / SR; let p = this.p + dt; if (p >= 1) p -= 1; this.p = p; return 2 * p - 1 - blep(p, dt); }
  sin(f) { this.p += f / SR; if (this.p >= 1) this.p -= 1; return Math.sin(TAU * this.p); }
}
class SVF {
  constructor(fc = 1000, q = .7) { this.a = 0; this.b = 0; this.set(fc, q); }
  set(fc, q) { fc = Math.min(Math.max(fc, 10), SR * .45); const g = Math.tan(Math.PI * fc / SR), k = 1 / q; this.a1 = 1 / (1 + g * (g + k)); this.a2 = g * this.a1; this.a3 = g * this.a2; this.k = k; }
  tick(x) {
    const v3 = x - this.b, v1 = this.a1 * this.a + this.a2 * v3, v2 = this.b + this.a2 * this.a + this.a3 * v3;
    this.a = 2 * v1 - this.a; this.b = 2 * v2 - this.b; this.lp = v2; this.bp = v1; this.hp = x - this.k * v1 - v2; return v2;
  }
}
let ns = 7;
const white = () => { ns ^= ns << 13; ns ^= ns >>> 17; ns ^= ns << 5; return ((ns >>> 0) / 4294967296) * 2 - 1; };
const S0 = (t) => Math.round(t * SR);

// ---------------------------------------------------------------- plucked strings (Karplus-Strong)
function ks(m, t0, vel, o = {}) {
  const damp = o.damp ?? .995, w = o.blend ?? .5;
  const Dl = SR / mtof(m) - (1 - w), L = Math.max(2, Math.floor(Dl - .1)), frac = Dl - L, C = (1 - frac) / (1 + frac), buf = new Float32Array(L);
  const len = Math.ceil((o.len ?? 1) * SR), s0 = S0(t0 + (o.hum ? R(-.004, .004) : 0));
  const lp = new SVF(o.bright ?? 3000, .6);
  for (let i = 0; i < L; i++) buf[i] = lp.tick(white());
  const out = mixer(o.pan ?? 0, (o.gain ?? .4) * vel, o.rev ?? .2, o.dly ?? 0, o.bus ?? 'mus');
  const res = o.res ? new SVF(o.res, o.resQ ?? 2.5) : null;
  let idx = 0, prev = 0, ax = 0, ay = 0;
  for (let i = 0; i < len; i++) {
    const cur = buf[idx], ap = C * cur + ax - C * ay;
    ax = cur; ay = ap;
    buf[idx] = (ap * w + prev * (1 - w)) * damp; prev = ap;
    if (++idx >= L) idx = 0;
    let y = cur;
    if (res) { res.tick(cur); y = cur * .6 + res.bp * (o.resMix ?? 1.2); }
    out(s0 + i, y * Math.min(1, (len - i) / (SR * .03)));
  }
}
const pizz = (m, t0, vel = 1, o = {}) => ks(m, t0, vel, { bright: 1900, damp: .986, len: .5, gain: .42, rev: .32, pan: -.25, hum: 1, ...o });
const harp = (m, t0, vel = 1, o = {}) => ks(m, t0, vel, { bright: 5200, damp: .9982, blend: .55, len: 2.4, gain: .24, rev: .55, dly: .1, pan: o.pan ?? R(-.45, .45), ...o });
const nylon = (m, t0, vel = 1, o = {}) => ks(m, t0, vel, { bright: 2600, damp: .9965, blend: .5, len: 1.5, gain: .3, rev: .3, pan: -.2, hum: 1, ...o });
const chopNote = (m, t0, vel, o = {}) => ks(m, t0, vel, { bright: 2800, damp: .935, len: .16, gain: .2, rev: .08, pan: .3, ...o });

// one bowed voice playing a legato line ([t, midi, dur, vel]); det detunes, used three-deep for a string section
function fiddle(line, o = {}) {
  if (!line.length) return;
  const out = mixer(o.pan ?? -.12, .16 * (o.gain ?? 1), o.rev ?? .32, o.dly ?? .1);
  const f1 = new SVF(480, 1.6), f2 = new SVF(1300, 2), f3 = new SVF(2900, 2.4), lp = new SVF(o.bright ?? 5200, .7), hp = new SVF(3000, .7);
  const os = new Osc(), os2 = new Osc(), det = o.det ?? 1, vph = o.vph ?? 0, atk = o.atk ?? .03;
  const tA = line[0][0] - .02, last = line[line.length - 1], tB = last[0] + last[2] + (o.rel ?? .35);
  const glide = 1 - Math.exp(-1 / (SR * .018));
  let k = 0, f = mtof(line[0][1] + (o.oct ?? 0));
  for (let i = S0(tA); i < S0(tB); i++) {
    const t = i / SR;
    while (k + 1 < line.length && t >= line[k + 1][0]) k++;
    const [nt, m, dur, v = 1] = line[k], age = t - nt;
    if (age < 0) continue;
    f += (mtof(m + (o.oct ?? 0)) - f) * glide;
    const vib = 1 + .0055 * Math.sin(TAU * 5.4 * t + vph) * sstep(.12, .35, age);
    const bow = 1 - .3 * Math.exp(-age / .025);
    const env = Math.min(1, age / atk) * bow * (age > dur ? Math.exp(-(age - dur) / (o.tail ?? .07)) : 1) * v;
    if (env < 1e-4) continue;
    const x = os.saw(f * vib * det) * .7 + os2.saw(f * vib * det * 1.003) * .3;
    hp.tick(white());
    const s = x + hp.hp * .06;
    f1.tick(s); f2.tick(s); f3.tick(s);
    out(i, lp.tick(f1.bp * 1.1 + f2.bp * .9 + f3.bp * .55 + s * .12) * env);
  }
}
function strings(line, o = {}) { // a soft section: three detuned bowed voices, slower attack, lots of room
  [[-.35, .998, 0], [0, 1, 1.7], [.35, 1.0025, 3.1]].forEach(([pan, det, vph]) => fiddle(line, { pan, det, vph, gain: (o.gain ?? 1) * .55, rev: o.rev ?? .6, atk: o.atk ?? .12, tail: o.tail ?? .25, bright: o.bright ?? 4200, oct: o.oct, dly: .06 }));
}
// flute: sine + a little 2nd harmonic, breath noise, vibrato blooming after each attack, glides between notes
function flute(line, o = {}) {
  if (!line.length) return;
  const out = mixer(o.pan ?? .15, .11 * (o.gain ?? 1), o.rev ?? .45, o.dly ?? .14), bp = new SVF(2500, 1.2);
  const tA = line[0][0] - .02, last = line[line.length - 1], tB = last[0] + last[2] + .4;
  const glide = 1 - Math.exp(-1 / (SR * .03));
  let k = 0, f = mtof(line[0][1] + (o.oct ?? 0)), ph = 0;
  for (let i = S0(tA); i < S0(tB); i++) {
    const t = i / SR;
    while (k + 1 < line.length && t >= line[k + 1][0]) k++;
    const [nt, m, dur, v = 1] = line[k], age = t - nt;
    if (age < 0) continue;
    f += (mtof(m + (o.oct ?? 0)) - f) * glide;
    const vib = 1 + .006 * Math.sin(TAU * 5.1 * t) * sstep(.15, .45, age);
    ph += TAU * f * vib / SR;
    const env = Math.min(1, age / .05) * (age > dur ? Math.exp(-(age - dur) / .09) : 1) * v;
    if (env < 1e-4) continue;
    bp.tick(white());
    out(i, (Math.sin(ph) + .18 * Math.sin(2 * ph) + .05 * Math.sin(3 * ph) + bp.bp * (.12 + .25 * Math.exp(-age / .06))) * env);
  }
}
// reedy staccato (a cartoon bassoon) for the hungry caterpillar
function reed(m, t0, dur, vel = 1, o = {}) {
  const f = mtof(m), len = Math.ceil((dur + .12) * SR), s0 = S0(t0), out = mixer(o.pan ?? -.1, .09 * vel, .22, .05), fl = new SVF(900, 1.4), A = new Osc();
  for (let i = 0; i < len; i++) {
    const t = i / SR, sq = A.p < .42 ? 1 : -1; A.saw(f * (1 + .004 * Math.sin(TAU * 5 * t)));
    if ((i & 31) === 0) fl.set(600 + 1600 * Math.exp(-t / .08), 1.4);
    const e = Math.min(1, t / .012) * (t > dur ? Math.exp(-(t - dur) / .04) : 1);
    out(s0 + i, fl.tick(sq) * e);
  }
}
// short bowed notes for driving ostinatos
function spic(m, t0, vel = 1, o = {}) {
  const f = mtof(m), len = Math.ceil(.22 * SR), s0 = S0(t0), out = mixer(o.pan ?? R(-.4, .4), .07 * vel, .3, 0), fl = new SVF(2400, .9), A = new Osc(), B2 = new Osc();
  for (let i = 0; i < len; i++) { const t = i / SR, e = Math.min(1, t / .006) * Math.exp(-t / .07); out(s0 + i, fl.tick(A.saw(f) + B2.saw(f * 1.004)) * e); }
}

// ---------------------------------------------------------------- bass, keys, synths
function ubass(m, t0, dur = .42, vel = 1) {
  const f = mtof(m), len = Math.ceil((dur + .25) * SR), s0 = S0(t0), out = mixer(0, .5 * vel, .05);
  let p = 0;
  for (let i = 0; i < len; i++) {
    const t = i / SR; p += TAU * f * (1 + .05 * Math.exp(-t / .012)) / SR;
    const e = Math.min(1, t / .004) * Math.exp(-t / (dur * .75)) * (t > dur ? Math.exp(-(t - dur) / .05) : 1);
    out(s0 + i, Math.tanh((Math.sin(p) + .4 * Math.sin(2 * p) + .12 * Math.sin(3 * p)) * 1.3) * e);
  }
}
function sub(m, t0, dur, vel = 1, o = {}) {
  const f = mtof(m), len = Math.ceil((dur + .6) * SR), s0 = S0(t0), out = mixer(0, .2 * vel, .05);
  let p = 0;
  for (let i = 0; i < len; i++) { const t = i / SR; p += TAU * f / SR; out(s0 + i, Math.sin(p) * Math.min(1, t / (o.atk ?? .3)) * (t > dur ? Math.max(0, 1 - (t - dur) / .6) : 1)); }
}
function pad(notes, t0, dur, vel = 1, o = {}) {
  const rel = o.rel ?? 1.2, len = Math.ceil((dur + rel) * SR), s0 = S0(t0), atk = o.atk ?? .5;
  for (const m of notes) {
    const f = mtof(m), A = new Osc(), Bo = new Osc(), Co = new Osc(), fl = new SVF();
    const out = mixer(R(-.5, .5), .024 * vel * (o.gain ?? 1), o.rev ?? .6, 0);
    for (let i = 0; i < len; i++) {
      const t = i / SR;
      if ((i & 63) === 0) fl.set((o.cut ?? 1500) * (1 + .2 * Math.sin(TAU * .2 * (t0 + t))) * (o.cutEnv ? o.cutEnv(t0 + t) : 1), .7);
      const e = Math.min(1, t / atk) * (t > dur ? Math.max(0, 1 - (t - dur) / rel) : 1);
      out(s0 + i, fl.tick(A.saw(f * 1.004) + Bo.saw(f * .996) + Co.saw(f * 2.001) * .3) * e);
    }
  }
}
function choir(notes, t0, dur, vel = 1, o = {}) {
  const rel = o.rel ?? 1.4, len = Math.ceil((dur + rel) * SR), s0 = S0(t0);
  for (const m of notes) {
    const f = mtof(m), A = new Osc(), Bo = new Osc(), F1 = new SVF(750, 4), F2 = new SVF(1150, 5), F3 = new SVF(2500, 6);
    const out = mixer(R(-.6, .6), .05 * vel, .8, 0);
    for (let i = 0; i < len; i++) {
      const t = i / SR, v = 1 + .004 * Math.sin(TAU * 5.1 * t + m);
      const x = A.saw(f * v) + Bo.saw(f * v * 1.006);
      F1.tick(x); F2.tick(x); F3.tick(x);
      const e = Math.min(1, t / (o.atk ?? .25)) * (t > dur ? Math.max(0, 1 - (t - dur) / rel) : 1);
      out(s0 + i, (F1.bp + F2.bp * .7 + F3.bp * .35) * e);
    }
  }
}
function brass(notes, t0, dur, vel = 1, o = {}) {
  const len = Math.ceil((dur + .3) * SR), s0 = S0(t0);
  for (const m of notes) {
    const f = mtof(m), A = new Osc(), Bo = new Osc(), Co = new Osc(), fl = new SVF();
    const out = mixer(R(-.35, .35), .05 * vel * (o.gain ?? 1), o.rev ?? .35, .05);
    for (let i = 0; i < len; i++) {
      const t = i / SR, sc = 1 - .02 * Math.exp(-t / .04);
      if ((i & 31) === 0) fl.set((o.cut0 ?? 500) + (o.cut ?? 3800) * Math.exp(-t / (o.bloom ?? .12)) + 900 * Math.min(1, t / .05), .8);
      const e = Math.min(1, t / (o.atk ?? .015)) * (t > dur ? Math.max(0, 1 - (t - dur) / .25) : 1) * (1 - .25 * Math.min(1, t / .3));
      out(s0 + i, Math.tanh(fl.tick(A.saw(f * sc) + Bo.saw(f * sc * 1.006) + Co.saw(f * sc * .995)) * 1.2) * e);
    }
  }
}
function arp(m, t0, vel = 1, o = {}) {
  const f = mtof(m), len = Math.ceil((o.len ?? .3) * SR), s0 = S0(t0), A = new Osc(), Bo = new Osc(), fl = new SVF();
  const out = mixer(o.pan ?? R(-.4, .4), .085 * vel * (o.gain ?? 1), o.rev ?? .3, o.dly ?? .22);
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    if ((i & 15) === 0) fl.set((o.cut ?? 600) + (o.env ?? 3500) * Math.exp(-t / (o.dec ?? .07)), 1.6);
    const sq = A.p < .5 ? 1 : -1; A.saw(f);
    out(s0 + i, fl.tick(sq * .5 + Bo.saw(f * 1.005) * .5) * Math.min(1, t / .002) * Math.exp(-t / (o.amp ?? .16)));
  }
}
function trem(notes, t0, dur, vel = 1, o = {}) {
  const len = Math.ceil((dur + .4) * SR), s0 = S0(t0);
  for (const m of notes) {
    const f = mtof(m), A = new Osc(), Bo = new Osc(), fl = new SVF(o.cut ?? 2200, .8);
    const out = mixer(R(-.5, .5), .03 * vel, .5, 0);
    for (let i = 0; i < len; i++) {
      const t = i / SR, tr = .55 + .45 * Math.abs(Math.sin(TAU * (o.rate ?? 7) * t + m));
      const e = Math.min(1, t / (o.atk ?? .2)) * (t > dur ? Math.max(0, 1 - (t - dur) / .4) : 1) * (o.swell ? lerp(.4, 1, t / dur) : 1);
      out(s0 + i, fl.tick(A.saw(f) + Bo.saw(f * 1.004)) * tr * e);
    }
  }
}

// ---------------------------------------------------------------- mallets
function partials(m, t0, vel, P, o = {}) {
  const f = mtof(m), len = Math.ceil((o.len ?? 2) * SR), s0 = S0(t0);
  const out = mixer(o.pan ?? R(-.5, .5), (o.gain ?? .1) * vel, o.rev ?? .5, o.dly ?? 0, o.bus ?? 'mus');
  const ph = P.map(() => 0), dec = P.map((p) => Math.exp(-1 / (p[2] * SR)));
  const amp = P.map((p) => p[1]);
  for (let i = 0; i < len; i++) {
    let v = 0;
    for (let k = 0; k < P.length; k++) { ph[k] += TAU * f * P[k][0] / SR; v += Math.sin(ph[k]) * amp[k]; amp[k] *= dec[k]; }
    out(s0 + i, v * Math.min(1, i / (SR * .0015)));
  }
}
const glock = (m, t0, vel = 1, o = {}) => partials(m, t0, vel, [[1, 1, 1.4], [2.76, .3, .35], [5.4, .1, .12], [8.93, .05, .05]], { gain: .1, len: 2.2, ...o });
const celesta = (m, t0, vel = 1, o = {}) => partials(m, t0, vel, [[1, 1, 1.1], [2, .3, .45], [3, .1, .2], [4.02, .07, .1]], { gain: .1, len: 1.8, rev: .6, dly: .15, ...o });
const xylo = (m, t0, vel = 1, o = {}) => partials(m, t0, vel, [[1, 1, .2], [3.93, .35, .05], [9.2, .1, .015]], { gain: .2, len: .45, rev: .3, ...o });
const marimba = (m, t0, vel = 1, o = {}) => partials(m, t0, vel, [[1, 1, .5], [4, .25, .09], [9.9, .05, .02]], { gain: .2, len: 1.0, rev: .32, ...o });
const box = (m, t0, vel = 1, o = {}) => partials(m, t0, vel, [[1, 1, .9], [2, .25, .4], [3.01, .2, .2], [4.2, .12, .08]], { gain: .1, len: 1.6, rev: .55, ...o });
const bell = (m, t0, vel = 1, o = {}) => partials(m, t0, vel, [[1, 1, 2.2], [2.0, .4, .9], [3.0, .2, .5], [4.16, .2, .3], [5.4, .08, .15]], { gain: .09, len: 3.5, rev: .7, ...o });

// ---------------------------------------------------------------- piano: stretched (inharmonic) partials on two slightly
// detuned strings, a quick prompt decay over a long aftersound, a felt hammer thump; o.soft = felt piano, o.dur = damper
function piano(m, t0, vel = 1, o = {}) {
  const f = mtof(m), len = Math.ceil((o.len ?? Math.min(4, 2.2 + 30 / f * 8)) * SR), s0 = S0(t0 + (o.hum ? R(-.006, .006) : 0));
  const out = mixer(o.pan ?? clamp((m - 64) / 36, -.45, .45), (o.gain ?? .1) * vel, o.rev ?? .45, o.dly ?? .03, o.bus ?? 'mus');
  const Bk = .00035 * Math.pow(2, (m - 60) / 18), np = Math.max(3, Math.min(9, Math.floor(4200 / f))), br = (o.soft ? .42 : .62) + .3 * Math.min(1, vel);
  const os = [];
  for (let n = 1; n <= np; n++) {
    const fn = f * n * Math.sqrt(1 + Bk * n * n), a = Math.pow(br, n - 1) / Math.sqrt(n), d1 = (o.sus ?? 1.1) * Math.pow(262 / f, .4) / (1 + .6 * (n - 1)), d2 = d1 * 4;
    for (const det of [-1, 1]) { const w = TAU * fn * (1 + det * .00045 * n) / SR, ph = rnd() * TAU; os.push({ c: Math.cos(ph), s: Math.sin(ph), cw: Math.cos(w), sw: Math.sin(w), a1: a * .36, a2: a * .14, k1: Math.exp(-1 / (d1 * SR)), k2: Math.exp(-1 / (d2 * SR)) }); }
  }
  const lp = new SVF(o.soft ? 1600 : 5200, .6), ham = new SVF(o.soft ? 900 : 2400, 1.2), damp = o.dur ? S0(o.dur) : len;
  for (let i = 0; i < len; i++) {
    let v = 0;
    for (const q of os) { const c = q.c * q.cw - q.s * q.sw; q.s = q.s * q.cw + q.c * q.sw; q.c = c; v += q.s * (q.a1 + q.a2); q.a1 *= q.k1; q.a2 *= q.k2; }
    const t = i / SR; ham.tick(white());
    const x = lp.tick(v + ham.bp * .5 * Math.exp(-t / .006) * br) * Math.min(1, i / (SR * .0015)) * (i > damp ? Math.exp(-(i - damp) / (SR * .09)) : 1);
    out(s0 + i, x);
  }
}
const pianoChord = (notes, t0, vel = 1, o = {}) => notes.forEach((m, k) => piano(m, t0 + k * (o.roll ?? .012), vel * (k ? .8 : 1), o));
// big drums for danger and for the migration
function taiko(t0, vel = 1, o = {}) {
  const len = Math.ceil(1.4 * SR), s0 = S0(t0), out = mixer(o.pan ?? 0, .55 * vel, o.rev ?? .45, 0), lp = new SVF(1400, .8), f0 = o.f ?? 58;
  let p = 0, p2 = 0;
  for (let i = 0; i < len; i++) {
    const t = i / SR, f = f0 * (1 + .8 * Math.exp(-t / .03)); p += TAU * f / SR; p2 += TAU * f * 1.61 / SR;
    out(s0 + i, Math.tanh((Math.sin(p) * Math.exp(-t / (o.dec ?? .42)) + .4 * Math.sin(p2) * Math.exp(-t / .16)) * 1.4 + lp.tick(white()) * Math.exp(-t / .025) * .9));
  }
}
// french horns: dark, round brass with a slow bloom
const horn = (notes, t0, dur, vel = 1, o = {}) => brass(notes, t0, dur, vel, { cut0: 320, cut: 1300, bloom: .45, atk: .13, rev: .6, gain: 1.25, ...o });
// a bumblebee passing: a buzzing saw through a nasal band, wobbling pitch, panned along its path
function buzz(t0, dur, vel = 1, o = {}) {
  const len = Math.ceil(dur * SR), s0 = S0(t0), out = mixer(0, .05 * vel, .25, 0, 'sfx'), A = new Osc(), Bo = new Osc(), f1 = new SVF(700, 3), f2 = new SVF(1900, 4);
  for (let i = 0; i < len; i++) {
    const t = i / SR, u = i / len, f = (o.f ?? 196) * (1 + .025 * Math.sin(TAU * 5.3 * t) + .05 * Math.sin(TAU * .9 * t + 1));
    const x = A.saw(f) + Bo.saw(f * 2.003) * .4; f1.tick(x); f2.tick(x);
    const near = o.near ? o.near(u) : .6 + .4 * Math.sin(TAU * .7 * t), pan = o.pan ? o.pan(u) : 0, e = Math.min(1, u * 8) * Math.min(1, (1 - u) * 8) * near;
    const y = (f1.bp + f2.bp * .6) * e;
    out(s0 + i, y * (1 - pan) * 1.3, y * (1 + pan) * 1.3);
  }
}
// a distant goose: a nasal two-step "ah-honk"
function honk(t0, vel = 1, o = {}) {
  const len = Math.ceil(.3 * SR), s0 = S0(t0), out = mixer(o.pan ?? 0, .07 * vel, .5, 0, 'sfx'), A = new Osc(), f1 = new SVF(950, 3), f2 = new SVF(1700, 4), lp = new SVF(o.muff ?? 2400, .7);
  for (let i = 0; i < len; i++) {
    const t = i / SR, u = i / len, f = (o.f ?? 300) * (t < .06 ? .8 + 3.3 * t : 1) * (1 - .12 * u);
    const sq = A.p < .3 ? 1 : -1; A.saw(f); f1.tick(sq); f2.tick(sq);
    out(s0 + i, lp.tick(f1.bp + f2.bp * .8) * Math.pow(Math.sin(Math.PI * u), .5));
  }
}
// a monarch inches from the lens: two deep wing beats and the air they push
function wingPass(t0, vel = 1, dir = 1) {
  for (const [d, a] of [[-.22, .7], [0, 1]]) {
    const len = Math.ceil(.32 * SR), s0 = S0(t0 + d), out = mixer(dir * (d < 0 ? -.5 : .4), .55 * vel * a, .3, 0, 'sfx'), lp = new SVF(260, .9);
    for (let i = 0; i < len; i++) { const t = i / SR; out(s0 + i, lp.tick(white()) * Math.min(1, t / .03) * Math.exp(-t / .08) * 3); }
  }
  noiseSweep(t0 - .35, t0 + .45, 300, 3200, .7 * vel, { pan: dir * .3, env: (u) => Math.sin(Math.PI * Math.pow(u, .9)) ** 2, q: .7 });
}

// ---------------------------------------------------------------- drums
function kick(t0, vel = 1) {
  const len = Math.ceil(.45 * SR), s0 = S0(t0), out = mixer(0, .55 * vel, .04);
  let p = 0;
  for (let i = 0; i < len; i++) { const t = i / SR; p += TAU * (46 + 120 * Math.exp(-t / .028)) / SR; out(s0 + i, Math.sin(p) * Math.exp(-t / .22) + white() * .25 * Math.exp(-t / .0025)); }
}
function snare(t0, vel = 1, o = {}) {
  const len = Math.ceil(.3 * SR), s0 = S0(t0), out = mixer(o.pan ?? -.05, .26 * vel, .25), bp = new SVF(3400, .8);
  let p = 0;
  for (let i = 0; i < len; i++) { const t = i / SR; p += TAU * 190 / SR; bp.tick(white()); out(s0 + i, Math.sin(p) * Math.exp(-t / .05) * .6 + bp.bp * 1.6 * Math.exp(-t / (o.dec ?? .11))); }
}
function clap(t0, vel = 1) {
  const len = Math.ceil(.3 * SR), s0 = S0(t0), out = mixer(.1, .3 * vel, .35), bp = new SVF(1300, 1.4);
  for (let i = 0; i < len; i++) {
    const t = i / SR; bp.tick(white());
    let e = Math.exp(-t / .09) * .5;
    for (const d of [0, .011, .023]) if (t >= d) e += Math.exp(-(t - d) / .006);
    out(s0 + i, bp.bp * 2 * e);
  }
}
function hat(t0, vel = 1, open = false) {
  const len = Math.ceil((open ? .35 : .08) * SR), s0 = S0(t0), out = mixer(.35, .1 * vel, .15), hp = new SVF(7500, .7);
  for (let i = 0; i < len; i++) { const t = i / SR; hp.tick(white()); out(s0 + i, hp.hp * Math.exp(-t / (open ? .16 : .028))); }
}
function shaker(t0, vel = 1) {
  const len = Math.ceil(.1 * SR), s0 = S0(t0), out = mixer(.45, .07 * vel, .15), bp = new SVF(7000, 1.3);
  for (let i = 0; i < len; i++) { const t = i / SR; bp.tick(white()); out(s0 + i, bp.bp * Math.min(1, t / .01) * Math.exp(-t / .028)); }
}
function brush(t0, vel = 1) {
  const len = Math.ceil(.18 * SR), s0 = S0(t0), out = mixer(-.3, .16 * vel, .2), bp = new SVF(4200, .6);
  for (let i = 0; i < len; i++) { const t = i / SR; bp.tick(white()); out(s0 + i, bp.bp * Math.min(1, t / .012) * Math.exp(-t / .055)); }
}
function crash(t0, vel = 1, o = {}) {
  const len = Math.ceil((o.len ?? 2.4) * SR), s0 = S0(t0), out = mixer(o.pan ?? .2, .17 * vel, .4), hp = new SVF(4200, .6), bp = new SVF(7800, 1.2);
  for (let i = 0; i < len; i++) { const t = i / SR, w = white(); hp.tick(w); bp.tick(w); out(s0 + i, (hp.hp * .7 + bp.bp) * (Math.exp(-t / (o.dec ?? .9)) * .8 + Math.exp(-t / .03) * .6) * (o.swell ? Math.min(1, t / o.swell) : 1)); }
}
function swellCym(t0, t1, vel = 1) { // reverse cymbal into a downbeat
  const len = Math.ceil((t1 - t0) * SR), s0 = S0(t0), out = mixer(.2, .14 * vel, .5), hp = new SVF(5000, .6);
  for (let i = 0; i < len; i++) { const u = i / len; hp.tick(white()); out(s0 + i, hp.hp * u * u * u); }
}
function tom(t0, vel = 1, f = 120) {
  const len = Math.ceil(.4 * SR), s0 = S0(t0), out = mixer(R(-.4, .4), .35 * vel, .25);
  let p = 0;
  for (let i = 0; i < len; i++) { const t = i / SR; p += TAU * f * (1 + .6 * Math.exp(-t / .03)) / SR; out(s0 + i, Math.sin(p) * Math.exp(-t / .2) + white() * .1 * Math.exp(-t / .01)); }
}
function timp(m, t0, vel = 1, o = {}) {
  const f = mtof(m), len = Math.ceil((o.len ?? 2) * SR), s0 = S0(t0), out = mixer(-.1, .4 * vel, .45), lp = new SVF(900, .7);
  let p = 0, p2 = 0;
  for (let i = 0; i < len; i++) {
    const t = i / SR, fm = 1 + .03 * Math.exp(-t / .05);
    p += TAU * f * fm / SR; p2 += TAU * f * 1.5 * fm / SR;
    out(s0 + i, (Math.sin(p) + .35 * Math.sin(p2) * Math.exp(-t / .4)) * Math.exp(-t / (o.dec ?? .9)) + lp.tick(white()) * .5 * Math.exp(-t / .02));
  }
}
function roll(t0, t1, v0, v1) { for (let t = t0; t < t1 - 1e-6; t += 1 / 16) snare(t, lerp(v0, v1, (t - t0) / (t1 - t0)) * (.85 + R(0, .3)), { dec: .07 }); }
function timpRoll(m, t0, t1, v0, v1) { for (let t = t0; t < t1 - 1e-6; t += .07) timp(m, t, lerp(v0, v1, (t - t0) / (t1 - t0)) * .45, { dec: .25, len: .5 }); }

// ---------------------------------------------------------------- sound design
function noiseSweep(t0, t1, f0, f1, vel = 1, o = {}) {
  const len = Math.ceil((t1 - t0) * SR), s0 = S0(t0), a = new SVF(), b = new SVF();
  const out = mixer(o.pan ?? 0, .22 * vel, o.rev ?? .4, 0, 'sfx');
  for (let i = 0; i < len; i++) {
    const u = i / len;
    if ((i & 31) === 0) { const fc = f0 * Math.pow(f1 / f0, u); a.set(fc, o.q ?? 1.1); b.set(fc * 1.07, o.q ?? 1.1); }
    const env = o.env ? o.env(u) : Math.sin(Math.PI * u);
    a.tick(white()); b.tick(white());
    out(s0 + i, a.bp * env, b.bp * env);
  }
}
const whoosh = (t, d = .45, vel = 1, up = true) => noiseSweep(t, t + d, up ? 500 : 5000, up ? 5000 : 500, vel, { env: (u) => Math.sin(Math.PI * Math.pow(u, up ? 1.4 : .7)) });
const riser = (t0, t1, vel = 1) => noiseSweep(t0, t1, 250, 6500, vel, { env: (u) => u * u * u, q: .9 });
function impact(t0, vel = 1) { kick(t0, .9 * vel); crash(t0, .7 * vel, { dec: .7 }); sub(26, t0, .4, 1.2 * vel, { atk: .005 }); }
function glide(t0, dur, f0, f1, vel = 1, o = {}) {
  const len = Math.ceil(dur * SR), s0 = S0(t0), out = mixer(o.pan ?? 0, .12 * vel, o.rev ?? .35, 0, 'sfx');
  let p = 0;
  for (let i = 0; i < len; i++) { const u = i / len; p += TAU * f0 * Math.pow(f1 / f0, u) / SR; out(s0 + i, Math.sin(p) * Math.sin(Math.PI * Math.min(1, u * 1.15)) * (o.tri ? Math.abs(Math.sin(p * .5)) : 1) * (o.vib ? 1 + .3 * Math.sin(TAU * o.vib * u * dur) : 1)); }
}
function pop(t0, vel = 1, pitch = 1) {
  const len = Math.ceil(.12 * SR), s0 = S0(t0), out = mixer(R(-.3, .3), .2 * vel, .25, 0, 'sfx');
  let p = 0;
  for (let i = 0; i < len; i++) { const t = i / SR; p += TAU * (700 * pitch + 1300 * pitch * Math.exp(-t / .012)) / SR; out(s0 + i, Math.sin(p) * Math.exp(-t / .03)); }
}
function tick(t0, vel = 1, pitch = 1) {
  const len = Math.ceil(.05 * SR), s0 = S0(t0), out = mixer(.3, .16 * vel, .15, 0, 'sfx');
  let p = 0, q = 0;
  for (let i = 0; i < len; i++) { const t = i / SR; p += TAU * 2400 * pitch / SR; q += TAU * 5300 * pitch / SR; out(s0 + i, (Math.sin(p) + .5 * Math.sin(q)) * Math.exp(-t / .008)); }
}
function sparkle(t0, dur, vel = 1, base = 81) {
  const sc = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21];
  for (let t = t0; t < t0 + dur; t += R(.035, .075)) glock(base + sc[Math.floor(R(0, sc.length))], t, .22 * vel * R(.5, 1), { len: 1.2, rev: .75, bus: 'sfx' });
}
function crackle(t0, vel = 1, size = 1, o = {}) { // micro-clicks over a dull knock (shell, chrysalis, leaf)
  const n = Math.round(4 + 10 * size), spread = .03 + .07 * size;
  for (let k = 0; k < n; k++) {
    const t = t0 + spread * Math.pow(R(), 1.5), len = Math.ceil(.012 * SR), s0 = S0(t), hp = new SVF(R(o.lo ?? 2500, o.hi ?? 7000), 1.2);
    const out = mixer(R(-.4, .4), .3 * vel * R(.4, 1), .2, 0, 'sfx');
    for (let i = 0; i < len; i++) { hp.tick(white()); out(s0 + i, hp.hp * Math.exp(-i / SR / .0025)); }
  }
  const len = Math.ceil(.08 * SR), s0 = S0(t0), out = mixer(0, .26 * vel * size, .15, 0, 'sfx');
  let p = 0;
  for (let i = 0; i < len; i++) { const t = i / SR; p += TAU * ((o.knock ?? 420) + 300 * Math.exp(-t / .01)) / SR; out(s0 + i, Math.sin(p) * Math.exp(-t / .018)); }
}
function munch(t0, vel = 1) { // a juicy leaf bite: wet crunch + soft chew thump
  crackle(t0, .55 * vel, .5, { lo: 1200, hi: 4200, knock: 180 });
  const len = Math.ceil(.09 * SR), s0 = S0(t0 + .01), out = mixer(R(-.2, .2), .22 * vel, .12, 0, 'sfx'), bp = new SVF(900, 1.5);
  for (let i = 0; i < len; i++) { const t = i / SR; bp.tick(white()); out(s0 + i, bp.bp * Math.exp(-t / .03) * (Math.sin(TAU * 60 * t) > 0 ? 1 : .3)); }
}
function rustle(t0, dur = .25, vel = 1) {
  const s0 = S0(t0), len = Math.ceil(dur * SR), bp = new SVF(3200, .9), out = mixer(R(-.4, .4), .12 * vel, .15, 0, 'sfx');
  for (let i = 0; i < len; i++) { const u = i / len; bp.tick(white()); out(s0 + i, bp.bp * (rnd() < .2 ? 2.2 : .5) * Math.sin(Math.PI * u)); }
}
function flap(t0, vel = 1, bright = 1400) { // one soft wing beat
  const len = Math.ceil(.1 * SR), s0 = S0(t0), out = mixer(R(-.3, .3), .22 * vel, .2, 0, 'sfx'), lp = new SVF(bright, .8);
  for (let i = 0; i < len; i++) { const t = i / SR; out(s0 + i, lp.tick(white()) * Math.min(1, t / .012) * Math.exp(-t / .03)); }
}
function flutter(t0, dur, vel = 1, rate = 9) { for (let t = t0; t < t0 + dur; t += 1 / rate) flap(t, vel * R(.6, 1), 1100 + R(0, 600)); }
function swarm(t0, t1, vel = 1) { // thousands of wings: a soft papery roar that breathes
  const len = Math.ceil((t1 - t0) * SR), s0 = S0(t0), out = mixer(0, .2 * vel, .45, 0, 'sfx'), a = new SVF(1800, .7), b = new SVF(3800, .9);
  let am = 0;
  for (let i = 0; i < len; i++) {
    const u = i / len, w = white();
    if ((i & 255) === 0) am = .6 + .4 * rnd();
    a.tick(w); b.tick(w);
    const flick = .55 + .45 * Math.abs(Math.sin(TAU * (11 + 3 * Math.sin(u * 7)) * i / SR));
    out(s0 + i, (a.bp + b.bp * .6) * flick * am * Math.sin(Math.PI * Math.min(1, u * 1.3)) * (1 - .4 * u), (a.bp * .6 + b.bp) * flick * am * Math.sin(Math.PI * Math.min(1, u * 1.3)) * (1 - .4 * u));
  }
}
function zipper(t0, dur, vel = 1) { // the proboscis halves locking together
  for (let k = 0, t = t0; t < t0 + dur; k++, t += .028 * (1 - .4 * (t - t0) / dur)) { tick(t, .35 * vel, .5 + .6 * (t - t0) / dur); }
}
function wriggle(t0, vel = 1) { glide(t0, .28, 140, 260, .9 * vel, { vib: 22, rev: .2 }); rustle(t0, .25, .8 * vel); }
function thud(t0, vel = 1) {
  const len = Math.ceil(.2 * SR), s0 = S0(t0), out = mixer(0, .45 * vel, .12, 0, 'sfx');
  let p = 0;
  for (let i = 0; i < len; i++) { const t = i / SR; p += TAU * (65 + 90 * Math.exp(-t / .025)) / SR; out(s0 + i, Math.sin(p) * Math.exp(-t / .06)); }
  rustle(t0, .18, .7 * vel);
}
function drip(t0, vel = 1) { glide(t0, .09, 700, 1900, .7 * vel, { rev: .35 }); }
function boing(t0, vel = 1) { glide(t0, .5, 180, 120, .9 * vel, { vib: 14 }); }
function shimmer(t0, dur, vel = 1) { // spinning silk: a fine high glitter
  sparkle(t0, dur, .5 * vel, 93);
  const len = Math.ceil(dur * SR), s0 = S0(t0), out = mixer(.2, .06 * vel, .5, .2, 'sfx'), bp = new SVF(9000, 4);
  for (let i = 0; i < len; i++) { const u = i / len; bp.tick(white()); out(s0 + i, bp.bp * (.5 + .5 * Math.sin(TAU * 18 * i / SR)) * Math.sin(Math.PI * u)); }
}
function heart(t0, vel = 1, muff = 1) {
  for (const [d, f, a] of [[0, 58, 1], [.12, 70, .55]]) {
    const len = Math.ceil(.16 * SR), s0 = S0(t0 + d), out = mixer(0, .5 * vel * a, .1, 0, 'sfx'), lp = new SVF(240 * muff, .7);
    let p = 0;
    for (let i = 0; i < len; i++) { const t = i / SR; p += TAU * f * (1 + .7 * Math.exp(-t / .015)) / SR; out(s0 + i, lp.tick(Math.sin(p) * Math.exp(-t / .045) + white() * .2 * Math.exp(-t / .01))); }
  }
}
function scan(t0, t1) {
  const len = Math.ceil((t1 - t0) * SR), s0 = S0(t0), out = mixer(0, .1, .4, .2, 'sfx'), bp = new SVF();
  let p = 0;
  for (let i = 0; i < len; i++) {
    const u = i / len; p += TAU * (300 + 900 * u) / SR;
    if ((i & 31) === 0) bp.set(1200 + 5000 * u, 3);
    bp.tick(white());
    out(s0 + i, (Math.sin(p) * (.5 + .5 * Math.sin(TAU * 18 * u * (t1 - t0))) * .5 + bp.bp * .8) * Math.sin(Math.PI * u));
  }
}

// ---------------------------------------------------------------- real recordings (CC0, Joseph Sardin / BigSoundBank)
const { decode } = require('../tools/calls');
const REC = {};
function rec(file, a = 0, b = null) { const k = `${file}|${a}|${b}`; return REC[k] || (REC[k] = decode(path.join(__dirname, '..', 'assets', 'sfx', file), a, b)); }
function playRec(x, a, b, t0, vel = 1, o = {}) {
  const rate = o.rate ?? 1, ia = Math.max(0, Math.round(a * SR)), n = Math.round((Math.min(b, x.length / SR) - a) * SR / rate);
  let g = vel;
  if (o.norm) { let pk = 1e-6; for (let i = ia; i < Math.min(x.length, ia + n * rate); i++) pk = Math.max(pk, Math.abs(x[i])); g *= .9 / pk; }
  if (o.rms) { let e = 0, c = 0; for (let i = ia; i < Math.min(x.length, ia + n * rate); i += 4) { e += x[i] * x[i]; c++; } g *= o.rms / Math.sqrt(e / Math.max(1, c) + 1e-12); }
  const out = mixer(o.pan ?? 0, g, o.rev ?? .22, o.dly ?? 0, 'sfx'), lp = o.muff ? new SVF(o.muff, .7) : null;
  const fi = (o.fin ?? .006) * SR, fo = (o.fout ?? .03) * SR, s0 = S0(t0);
  for (let i = 0; i < n; i++) {
    const p = ia + i * rate, k = Math.floor(p), fr = p - k;
    if (k + 1 >= x.length) break;
    let v = (x[k] * (1 - fr) + x[k + 1] * fr) * Math.min(1, i / fi) * Math.min(1, (n - i) / fo);
    if (lp) v = lp.tick(v);
    out(s0 + i, v);
  }
}
// ambience bed: slice [a, a+dur] of a file placed at t0, levelled by RMS, with long fades
function amb(file, a, t0, dur, level = .05, o = {}) { const x = rec(file, a, a + dur + .2); playRec(x, 0, dur, t0, 1, { rms: level, fin: o.fin ?? 1, fout: o.fout ?? 1.2, rev: o.rev ?? .15, pan: o.pan ?? 0, muff: o.muff }); }
function jay(t0, which = 0, vel = 1, o = {}) { const f = ['3453-eurasian-jay-1.mp3', '3454-eurasian-jay-2.mp3'][which]; playRec(rec(f), 0, 1.1, t0, .7 * vel, { norm: true, rate: o.rate ?? 1, pan: o.pan ?? -.2, rev: .25, muff: o.muff, fout: .05 }); }

// =================================================================================================== HARMONY (D major)
const CH = {
  D: { r: 38, t: [57, 62, 66, 69], p: [62, 66, 69, 74] }, Dmaj9: { r: 38, t: [57, 61, 64, 66], p: [62, 66, 69, 73, 76] }, Dadd9: { r: 38, t: [57, 62, 64, 66], p: [62, 64, 66, 69, 74] },
  Bm: { r: 47, t: [59, 62, 66, 71], p: [59, 62, 66, 71] }, Bm7: { r: 47, t: [57, 62, 66, 69], p: [57, 62, 66, 69, 71] },
  G: { r: 43, t: [55, 59, 62, 67], p: [59, 62, 67, 71] }, Gmaj7: { r: 43, t: [54, 59, 62, 66], p: [59, 62, 66, 71] },
  A: { r: 45, t: [57, 61, 64, 69], p: [61, 64, 69, 73] }, Asus: { r: 45, t: [57, 62, 64, 69], p: [62, 64, 69, 74] },
  Em: { r: 40, t: [55, 59, 64, 67], p: [59, 64, 67, 71] }, Em9: { r: 40, t: [54, 59, 62, 66], p: [54, 59, 62, 66, 67] },
  Cmaj7: { r: 48, t: [55, 59, 64, 66], p: [59, 64, 66, 71] }, Fsm: { r: 42, t: [54, 57, 61, 66], p: [57, 61, 66, 69] },
  Dsl: { r: 41, t: [57, 62, 66, 69], p: [62, 66, 69, 74] }, // D over F#
};
const PROG = [
  [0, 'Dmaj9'], [5, 'D'], [7.5, 'Bm'],
  [10, 'Gmaj7'], [12.5, 'Dsl'], [15, 'Em9'], [17.5, 'Asus'],
  [20, 'D'], [22.5, 'G'],
  [25, 'D'], [27.5, 'Bm'], [30, 'G'], [32.5, 'A'], [35, 'D'], [36.25, 'A'],
  [37.5, 'Bm'], [40, 'D'], [41.25, 'A'],
  [42.5, 'Bm7'], [45, 'Gmaj7'], [47.5, 'D'], [48.75, 'Asus'],
  [50, 'Em9'], [52.5, 'Cmaj7'], [55, 'G'], [56.25, 'Asus'],
  [57.5, 'Bm'], [60, 'G'], [62.5, 'Em9'], [65, 'Asus'],
  [67.5, 'Asus'], [70, 'D'], [72.5, 'Bm'], [75, 'Gmaj7'], [76.25, 'A'],
  [77.5, 'D'], [80, 'Bm'],
  [82.5, 'D'], [85, 'G'], [87.5, 'Bm7'], [90, 'A'],
  [92.5, 'D'], [95, 'Bm'], [97.5, 'G'], [98.75, 'A'],
  [100, 'Bm'], [101.25, 'G'], [102.5, 'Bm'], [103.75, 'G'], [105, 'D'], [106.25, 'A'], [107.5, 'Bm'], [108.75, 'G'], [110, 'D'], [111.25, 'A'],
  [112.5, 'D'], [115, 'Bm7'], [117.5, 'Gmaj7'], [118.75, 'Asus'],
  [120, 'D'], [121.25, 'A'],
  [122.5, 'G'], [125, 'Dsl'], [126.25, 'Asus'],
  [127.5, 'D'], [130, 'Bm'], [132.5, 'G'], [133.75, 'A'], [135, 'Dadd9'], [140, 'D'],
];
const chordAt = (t) => { let c = PROG[0]; for (const p of PROG) if (p[0] <= t + 1e-6) c = p; return CH[c[1]]; };
const segsIn = (a, b) => PROG.slice(0, -1).map((p, i) => ({ a: Math.max(a, p[0]), b: Math.min(b, PROG[i + 1][0]), c: CH[p[1]] })).filter((s) => s.b > s.a);

// the monarch theme in eighth-note slots, one row per bar
const THEME = [
  [69, null, 74, null, 76, null, 78, null],
  [81, null, null, null, 78, null, 76, null],
  [74, null, 76, null, 78, null, 83, null],
  [81, null, null, null, null, null, null, null],
  [69, null, 74, null, 76, null, 78, null],
  [83, null, 81, null, 79, null, 78, null],
  [76, null, 78, null, 79, null, 76, null],
  [74, null, null, null, null, null, null, null],
];
// the same shape in B minor for the migration
const MINOR = [
  [66, null, 71, null, 73, null, 74, null],
  [78, null, null, null, 74, null, 73, null],
  [71, null, 73, null, 74, null, 79, null],
  [76, null, null, null, 73, null, null, null],
];
const E8 = .3125;
function rowsToLine(rows, t0, o = {}) {
  const line = [], sl = o.slot ?? E8;
  rows.forEach((row, r) => row.forEach((m, i) => {
    if (m === null) return;
    let n = i + 1; while (n < 8 && row[n] === null) n++;
    line.push([t0 + r * sl * 8 + i * sl, m + (o.oct ?? 0), (n - i) * sl * (o.legato ?? .95), (o.vel ?? 1) * (i % 2 ? .85 : 1)]);
  }));
  return line;
}
const playRows = (rows, t0, inst, o = {}) => rowsToLine(rows, t0, o).forEach(([t, m, d, v]) => inst(m, t, v, d));

// ---------------------------------------------------------------- patterns
function pads(t0, t1, vel = 1, o = {}) { for (const s of segsIn(t0, t1)) pad(s.c.p, s.a, s.b - s.a + .05, vel, o); }
function harpArp(t0, t1, vel = 1, o = {}) { // rolling arpeggio over the chord, up and down
  const pat = o.pat ?? [0, 1, 2, 3, 2, 1], st = o.step ?? E8 / 2;
  let k = 0;
  for (let t = t0; t < t1 - 1e-6; t += st, k++) { const c = chordAt(t); harp(c.t[pat[k % pat.length]] + (o.oct ?? 12), t, vel * (k % pat.length === 0 ? 1 : .75)); }
}
function guitarPick(t0, t1, vel = 1) { // travis-style: bass on the beat, treble in between
  for (let t = t0, k = 0; t < t1 - 1e-6; t += E8, k++) {
    const c = chordAt(t), b = k % 4 === 0 ? c.r + 12 : k % 4 === 2 ? c.r + 19 : null;
    if (b !== null) nylon(b, t, .9 * vel, { pan: -.25 });
    else nylon(c.t[1 + (k % 3)] + 12, t, .55 * vel, { pan: .1 });
  }
}
function marimbaOst(t0, t1, vel = 1) { const pat = [0, 2, 1, 3, 2, 1, 3, 2]; let k = 0; for (let t = t0; t < t1 - 1e-6; t += E8 / 2, k++) { const c = chordAt(t); marimba(c.t[pat[k % 8]] + 12, t, vel * (k % 2 ? .6 : 1) * R(.85, 1)); } }
function strOst(t0, t1, vel = 1) { const pat = [0, 0, 2, 0, 1, 0, 2, 3]; let k = 0; for (let t = t0; t < t1 - 1e-6; t += E8 / 2, k++) { const c = chordAt(t); spic(c.t[pat[k % 8]] - 12 + 12 * (k % 8 === 7 ? 1 : 0), t, vel * (k % 4 === 0 ? 1 : .7)); } }
function bassLine(t0, t1, vel = 1, o = {}) { for (let t = t0; t < t1 - 1e-6; t += o.step ?? .625) { const c = chordAt(t); ubass(c.r + (o.oct ?? 0), t, (o.step ?? .625) * .8, vel); } }
function boomChick(t0, t1, vel = 1) {
  for (let t = t0, k = 0; t < t1 - 1e-6; t += .625, k++) {
    const c = chordAt(t);
    if (k % 2 === 0) ubass(k % 4 === 0 ? c.r : c.r + 7, t, .4, vel);
    else { c.t.forEach((m, j) => chopNote(m + 12, t + j * .006, .8 * vel)); brush(t, .6 * vel); }
  }
}
function drums(t0, t1, o = {}) {
  for (let t = t0; t < t1 - 1e-6; t += E8 / 2) {
    const i = Math.round((t % 2.5) / (E8 / 2)) % 16, v = o.vel ?? 1;
    if (o.kick && (i % 8 === 0 || (o.four && i % 4 === 0) || (o.busy && (i === 10 || i === 3)))) kick(t, .85 * v);
    if (o.snare && (i === 4 || i === 12)) snare(t, .8 * v);
    if (o.clap && (i === 4 || i === 12)) clap(t, .7 * v);
    if (o.hat && i % 2 === 0) hat(t, (i % 4 ? .55 : .8) * v);
    if (o.hat16 && i % 2) hat(t, .35 * v);
    if (o.shaker) shaker(t + (i % 2 ? .02 : 0), (i % 4 === 0 ? 1 : i % 2 ? .45 : .7) * v);
    if (o.toms && (i === 14 || i === 15)) tom(t, .6 * v, i === 14 ? 140 : 110);
  }
}
function arpGroove(t0, t1, vel = 1, o = {}) {
  const pat = o.pat ?? [0, 1, 2, 3, 2, 1, 2, 3];
  for (let t = t0, k = 0; t < t1 - 1e-6; t += E8 / 2, k++) { const c = chordAt(t); arp(c.t[pat[k % 8]] + 12 + (o.oct ?? 0), t, vel * (k % 2 ? .7 : 1) * (o.ramp ? o.ramp(t) : 1), o); }
}

// =================================================================================================== ARRANGEMENT
console.time('synth');

// ---- 0-10: dawn, the stained-glass wing, the title
amb('0222-awakening-birds.mp3', 17, 0, 10.4, .07, { fin: 1.5, fout: 2 });
pad(CH.Dmaj9.p, 0, 5.1, .9, { atk: 2.2, cut: 900, cutEnv: (t) => .6 + .8 * clamp(t / 5) });
sub(38, 0, 5, .5, { atk: 2 });
[81, 85, 88, 90, 93].forEach((m, i) => celesta(m, .8 + i * .32, .4));
noiseSweep(.6, 2.2, 1500, 7000, .25, { q: 2, env: (u) => Math.sin(Math.PI * u) }); sparkle(1.1, 1.0, .5, 88);
harpArp(2.5, 5.0, .7, { step: E8, oct: 12 });
flutter(3.7, .7, .45, 10); whoosh(EV.takeoff, .5, .6, true);
impact(EV.title, .55); timp(38, EV.title, .7, { len: 2.5 }); choir([62, 66, 69, 74], EV.title, 2.4, .7);
brass([50, 57, 62, 66], EV.title, 1.1, .45, { atk: .08 });
strings(rowsToLine([THEME[0], THEME[1]], 5.0, { vel: .95 }), { gain: 1.1 });
playRows([THEME[0], THEME[1]], 5.0, (m, t, v) => glock(m + 12, t, .3 * v));
pads(5, 10, .6, { cut: 1800 }); bassLine(5, 9.9, .55, { step: 1.25 });
harpArp(5, 9.9, .45); drums(6.25, 9.9, { shaker: 1, vel: .5 });
whoosh(EV.titleOut, .5, .5, false); flutter(5.2, 4.2, .25, 6);
riser(9.0, 9.95, .9); swellCym(9.0, 10, .8);

// ---- 10-20: the egg (music box, pizzicato, ticking days)
impact(10, .45); pads(10, 19.95, .55, { cut: 1300 });
playRows([[71, null, 74, null, 78, null, 74, null], [69, null, 74, null, 76, null, 74, null], [67, null, 71, null, 74, null, 78, null], [76, null, 73, null, 69, null, null, null]], 10, (m, t, v) => box(m + 12, t, .8 * v));
for (let t = 10; t < 19.9; t += E8 * 2) { const c = chordAt(t); pizz(c.r + 12, t, .6); }
flutter(10.0, .65, .6, 11); rustle(EV.land, .2, .6);
EV.taste.forEach((t) => { glock(98, t, .25); tick(t, .5, 1.5); });
bell(86, EV.lay, .6); bell(90, EV.lay + .05, .45); sparkle(EV.lay, .6, .7, 90); pop(EV.lay, .8, 1.3);
flutter(EV.leave, .9, .55, 11); whoosh(12.9, .8, .6, false);
noiseSweep(13.0, 13.75, 3000, 400, .5); impact(EV.macro, .35); bell(74, EV.macro, .5);
amb('0097-countryside.mp3', 26, 13.8, 6.4, .03);
for (let t = 13.75; t < 19.9; t += E8) { const c = chordAt(t), k = Math.round((t - 13.75) / E8); if (k % 2 === 0) celesta(c.t[(k / 2) % 4] + 24, t, .35); }
EV.days.forEach((t, i) => { tick(t, .9, 1.3); bell([81, 83, 86, 88][i], t, .45); pop(t + .02, .4, .9); });
scan(15.2, 15.9); glide(15.25, .4, 500, 1400, .4, { tri: 1 });
for (let t = 15.6; t < 18.2; t += .625) heart(t, .25, .8);
trem([50, 57, 62, 64], EV.tremble, 1.6, .7, { swell: 1, rate: 9 }); for (let k = 0; k < 6; k++) crackle(EV.tremble + k * .14, .25, .2);
[EV.chew, EV.chew + .2, EV.chew + .45].forEach((t) => munch(t, .7));
riser(19.0, 19.95, .7);

// ---- 20-25: hatch, the eggshell meal, the ring trench
impact(20, .4); pop(EV.emerge, .8, .8);
[62, 66, 69, 74, 78].forEach((m, i) => pizz(m, EV.emerge + .1 + i * .08, .7, { pan: .3 }));
for (let t = 20.3; t < 21.9; t += .16) tick(t, .18, .7);
EV.shell.forEach((t, i) => { munch(t, .9); pizz([62, 66, 64, 69][i], t, .6); });
marimbaOst(20, 24.9, .55); bassLine(20, 24.9, .55); drums(21.25, 24.9, { shaker: 1, vel: .55 });
whoosh(23.0, .3, .5, true);
for (let k = 0; k < 8; k++) { glock([74, 76, 78, 81, 83, 86, 88, 90][k], 23.05 + k * .18, .35); drip(23.1 + k * .18, .5); }
for (let t = 24.55; t < 24.95; t += .1) munch(t, .5);
riser(24.4, 25.0, .6);

// ---- 25-37.5: five instars: the hungry-caterpillar band, a layer more after every molt
pads(25, 37.4, .45, { cut: 2000 });
marimbaOst(25, 37.4, .6);
boomChick(25, 37.4, .8);
drums(25, 37.4, { shaker: 1, clap: 1, kick: 1, vel: .6 });
drums(30, 37.4, { hat: 1, vel: .55 });
drums(32.5, 37.4, { hat16: 1, busy: 1, kick: 1, vel: .5 });
// the theme as a bouncy bassoon, then doubled on xylophone
rowsToLine([THEME[0], THEME[1], THEME[2], THEME[3]], 25, { legato: .5 }).forEach(([t, m, d, v]) => reed(m - 12, t, d, .9 * v));
playRows([THEME[2], THEME[3]], 30, (m, t, v) => xylo(m + 12, t, .6 * v));
playRows([THEME[0], THEME[1], THEME[2], THEME[3]], 32.5, (m, t, v) => xylo(m + 12, t, .55 * v), { slot: E8 / 2 });
for (let t = 25.15; t < 36.6; t += E8) munch(t, .32 + .25 * ((t - 25) / 12));
EV.molts.forEach((t, i) => { swellCym(t - .55, t, .5); glide(t - .5, .45, 160, 520 + i * 90, .5, { vib: 18 }); pop(t, 1, .7 + i * .12); crash(t, .35, { dec: .6 }); brass([62 + i * 2, 66 + i * 2, 69 + i * 2], t, .3, .35 + i * .08); rustle(t + .1, .3, .9); });
strings(rowsToLine([[74, null, null, null, 78, null, null, null], [81, null, null, null, 83, null, null, null]], 32.5, { vel: .6 }), { gain: .7 });
for (let k = 0; k < 18; k++) { const x = Math.pow(k / 18, .6), t = EV.x2000 + 1.1 * x; tick(t, .5, 1 + k * .05); }
glock(98, EV.x2000 + 1.15, .5); crash(EV.x2000 + 1.1, .4);
brass([62, 66, 69, 74], EV.x2000 + 1.1, .4, .5);
noiseSweep(36.6, 37.45, 3000, 300, .45, { q: .7 }); // the music sucks away: something is coming

// ---- 37.5-42.5: the jay (D minor tremolo, a grab, x-ray, gag, spit, flight)
noiseSweep(EV.shadow, EV.shadow + 1.0, 200, 900, .6, { q: .5 }); sub(29, EV.shadow, 1, .9);
trem([50, 53, 56, 59], EV.shadow + .1, 1.0, .9, { rate: 11, swell: 1 }); timpRoll(38, 37.6, 38.4, .3, 1);
impact(EV.grab, .8); jay(EV.grab - .05, 0, 1.1, { pan: -.3 }); flutter(EV.grab - .5, 1.2, .8, 12);
brass([50, 53, 57], EV.grab, .35, .7); brass([49, 52, 56], EV.grab + .4, .5, .6);
scan(EV.xray, EV.xray + .7); pad([50, 53, 57, 60], EV.xray, .9, .9, { cut: 700, atk: .05 }); glide(EV.xray + .1, .6, 1600, 300, .35);
jay(EV.xray + .55, 1, .9, { rate: .8, pan: -.1 });
brass([58], EV.spit - .25, .18, .7, { gain: .9 }); brass([57], EV.spit - .05, .45, .7, { gain: .9 }); // wah-wah
pop(EV.spit, 1.2, .5); noiseSweep(EV.spit, EV.spit + .25, 1200, 400, .5, { q: 2 });
whoosh(EV.spit + .05, .45, .5, false); thud(EV.land2, 1); boing(EV.land2 + .05, .7);
flutter(EV.flyoff, 1.2, .6, 12); jay(EV.flyoff + .4, 0, .4, { muff: 2200, pan: .5 });
// the caterpillar wins: back to the band
[74, 78, 81, 86].forEach((m, i) => glock(m, 40.65 + i * .09, .45)); brass([62, 66, 69, 74], 41.0, .5, .55);
marimbaOst(40.6, 42.4, .5); boomChick(40.6, 42.4, .7); drums(40.6, 42.4, { shaker: 1, clap: 1, vel: .55 });
for (let t = 41.0; t < 42.3; t += E8) munch(t, .45);

// ---- 42.5-50: golden hour wander, the silk pad, the drop into a J, nightfall
amb('0097-countryside.mp3', 4, 42.5, 6, .025);
pads(42.5, 50, .55, { cut: 1500, atk: .8 });
guitarPick(42.5, 48.2, .75);
strings(rowsToLine([[71, null, null, null, 69, null, 66, null], [67, null, null, null, 71, null, 74, null], [74, null, null, null, 73, null, 69, null]], 42.5, { vel: .7 }), { gain: .8 });
for (let t = 42.6; t < 44.9; t += .3) tick(t, .12, .6);
shimmer(EV.silk, 1.5, .9);
whoosh(46.5, .35, .5, true);
noiseSweep(EV.drop, EV.drop + .45, 2500, 300, .5); boing(EV.drop + .3, .55); timp(38, EV.drop + .35, .5);
[86, 83, 81, 78, 74, 71, 69, 66, 62].forEach((m, i) => harp(m, EV.curl + i * .05, .5));
amb('1880-campaign-at-night-4.mp3', 12, 48.0, 10.0, .05, { fin: 1.2, fout: 1.5 });
[81, 78, 74, 76, 74, 69].forEach((m, i) => celesta(m, 48.4 + i * .3, .45));
{ let t = 48.4, dt = .3; while (t < 49.8) { tick(t, .45, .8); t += dt; dt = Math.max(.06, dt * .86); } }

// ---- 50-57.5: the chrysalis forms (night, mysterious; wriggles; gold)
pads(50, 57.4, .7, { cut: 1100, atk: 1 });
sub(40, 50, 2.5, .5); sub(36, 52.5, 2.5, .5);
for (let t = 50; t < 57.4; t += E8 * 2) { const c = chordAt(t), k = Math.round((t - 50) / (E8 * 2)); harp(c.t[k % 4] + 12, t, .35); }
crackle(EV.split, .7, .6, { lo: 1500, hi: 5000 }); glide(EV.split, .5, 900, 300, .35);
EV.wriggles.forEach((t, i) => { wriggle(t, .8); trem([40 + i, 47 + i], t, .4, .45, { rate: 14 }); });
timpRoll(38, 53.3, EV.twist, .3, .9); timp(38, EV.twist, .8); crackle(EV.twist, .6, .8);
glide(EV.skinFall, .7, 1400, 200, .5); thud(EV.skinFall + .7, .4);
choir([59, 64, 66, 71], EV.shape, 2.5, .7, { atk: .8 }); noiseSweep(EV.shape, EV.shape + 2, 400, 3000, .3, { q: .6 });
EV.gold.forEach((t, i) => { bell([86, 88, 90, 93, 95][i], t, .5); sparkle(t, .25, .5, 93); });
riser(56.6, 57.45, .6);

// ---- 57.5-67.5: metamorphosis (x-ray: dissolving, discs, building wings over ten days)
impact(EV.iris, .5); noiseSweep(EV.iris - .3, EV.iris + .6, 300, 4000, .5);
pads(57.5, 65.2, .7, { cut: 900, cutEnv: (t) => .7 + .9 * sstep(58, 65, t) });
arpGroove(58.1, 65.3, .6, { cut: 400, env: 2600, ramp: (t) => .55 + .45 * sstep(58, 64.5, t) });
for (let t = 58.1; t < 65.2; t += .625) heart(t, .35, .9);
for (let t = EV.soup; t < 61; t += R(.05, .12)) glock(R(86, 100) | 0, t, .12, { len: .4, bus: 'sfx' }); // fizzing soup
[0, 1, 2, 3, 4].forEach((i) => { const t = EV.discs + i * .15; bell([88, 91, 93, 95, 98][i], t, .45); pop(t, .5, 1.4); });
strings(rowsToLine([[66, null, null, null, null, null, null, null], [67, null, null, null, null, null, null, null], [71, null, null, null, null, null, null, null], [73, null, null, null, null, null, null, null]], 57.5, { vel: .75 }), { gain: .7, atk: .5 });
drums(61.25, 65.2, { kick: 1, hat: 1, vel: .45 });
for (let d = 1; d <= 10; d++) { const t = EV.soup + (EV.colour + .8 - EV.soup) * (d - 1) / 9; tick(t, .5, 1.2); }
riser(63.4, 64.4, .7); impact(EV.colour, .6); choir([62, 66, 69, 74, 78], EV.colour, 1.6, .9); brass([50, 57, 62, 66], EV.colour, 1.0, .55);
sparkle(EV.colour, .8, .7, 86);
noiseSweep(EV.back - .2, EV.back + .5, 4000, 500, .45);
amb('0222-awakening-birds.mp3', 62, 65.5, 12, .04, { fin: 1.5, fout: 1.5 });
harpArp(65.3, 67.4, .5, { step: E8 });

// ---- 67.5-77.5: emergence (A pedal tension, crack, wings pumped up by slow strings, the zip, drying)
pads(67.5, 69.95, .6, { cut: 900 }); trem([57, 64, 69, 71], 67.5, 1.25, .8, { swell: 1, rate: 8 });
for (let t = 67.5; t < 68.7; t += .3125) heart(t, .45, .8);
crackle(EV.crack, 1.1, 1.2, { lo: 2000, hi: 6000 }); timp(45, EV.crack, .9); impact(EV.crack, .4);
rustle(EV.out, .6, .9); crackle(EV.out + .3, .4, .4); glide(EV.out, .9, 300, 160, .3);
pads(70, 77.4, .6, { cut: 1600, atk: 1.2 });
strings(rowsToLine([THEME[0], THEME[1], THEME[2]], 70.0, { slot: E8 * 1.25, vel: .85, legato: .98 }), { gain: 1.05, atk: .2 });
harpArp(70, 77.4, .35, { step: E8 });
for (let t = EV.pump; t < EV.dry; t += .45) { rustle(t, .35, .35); glide(t, .3, 260, 380, .12, { tri: 1 }); }
zipper(EV.zip + .3, 1.6, 1); glock(93, EV.zip + 1.95, .4);
flute(rowsToLine([[78, null, null, null, 76, null, 74, null], [76, null, null, null, null, null, null, null]], 74.4, { vel: .8 }), { gain: .8 });
for (let t = 74.6; t < 77.2; t += .625) tick(t, .3, .9);
EV.opens.forEach((t) => { flutter(t, .5, .4, 6); whoosh(t, .5, .25, true); });
riser(76.6, 77.45, .9); swellCym(76.5, 77.5, .9);

// ---- 77.5-82.5: first flight (the theme, full orchestra)
impact(EV.lift, .9); timp(38, EV.lift, 1, { len: 2.5 }); crash(EV.lift, .6);
strings(rowsToLine([THEME[0], THEME[1]], 77.5, { vel: 1 }), { gain: 1.4 });
strings(rowsToLine([THEME[0], THEME[1]], 77.5, { vel: .8, oct: -12 }), { gain: .9 });
brass([50, 57, 62, 66, 69], 77.5, 2.3, .6, { atk: .1 }); brass([47, 54, 59, 62, 66], 80, 2.3, .6, { atk: .1 });
choir([62, 66, 69, 74], 77.5, 2.4, .8); choir([59, 62, 66, 71], 80, 2.4, .8);
playRows([THEME[0], THEME[1]], 77.5, (m, t, v) => glock(m + 12, t, .35 * v));
harpArp(77.5, 82.4, .5); bassLine(77.5, 82.4, .7, { step: 1.25 });
drums(77.5, 82.4, { kick: 1, hat: 1, toms: 1, vel: .7 });
flutter(77.5, 1.2, .5, 12); whoosh(78.2, .8, .5, true);
amb('0908-wind-in-tall-grass.mp3', 7, 77.5, 5, .03);

// ---- 82.5-92.5: summer adult life (guitar + flute + shaker)
amb('0100-forest.mp3', 24, 82.5, 10, .03);
guitarPick(82.5, 92.4, .8); bassLine(82.5, 92.4, .45, { step: 1.25 }); drums(82.5, 92.4, { shaker: 1, vel: .55 });
drums(85, 92.4, { kick: 1, clap: 1, vel: .4 });
pads(82.5, 92.5, .4, { cut: 2000 });
flute(rowsToLine([THEME[0], THEME[1], THEME[2], THEME[3]], 82.5, { vel: .9 }), { gain: 1 });
glide(EV.sip, .4, 300, 900, .5, { tri: 1 }); for (let t = EV.sip + .4; t < 85; t += .32) drip(t, .25);
bell(81, EV.sexes + .1, .5); bell(88, EV.sexes + .35, .5); pop(EV.sexes + .7, .5, 1.1); pop(EV.sexes + .95, .5, 1.25);
for (let k = 0; k < 12; k++) harp([74, 78, 81, 86, 90, 93][k % 6] - (k > 5 ? 0 : 0), EV.court + k * .12, .4);
flutter(EV.court, 1.4, .4, 12); glide(EV.court, 1.2, 600, 1800, .2, { tri: 1 });
pad(CH.Gmaj7.p, EV.pair, 1, .5, { cut: 2400 }); bell(86, EV.pair, .35);
EV.eggs.forEach((t, i) => { pop(t, .9, 1 + i * .1); bell([86, 88, 90, 93][i], t, .4); whoosh(t - .1, .2, .25, i % 2 === 0); });
for (let k = 0; k < 14; k++) tick(EV.eggs[3] + .05 + k * .035, .3, 1.5);

// ---- 92.5-100: four generations (ticking clockwork, a bell per generation, gold for the fourth)
impact(92.5, .35); whoosh(92.3, .5, .5, false);
pads(92.5, 99.9, .5, { cut: 1800 });
for (let t = 92.5; t < 99.9; t += E8) { const c = chordAt(t), k = Math.round((t - 92.5) / E8); pizz(c.t[k % 4] + 12, t, .45); if (k % 2 === 0) tick(t, .2, .8); }
drums(92.5, 99.9, { kick: 1, shaker: 1, vel: .5 });
EV.gen.forEach((t, i) => { bell([74, 78, 81, 86][i], t, .7); glock([86, 90, 93, 98][i], t + .05, .4); whoosh(t - .5, .45, .3, true); });
choir([62, 66, 69, 74, 81], EV.gen[3], 1.8, .8); sparkle(EV.gen[3], 1.0, .8, 88);
strings(rowsToLine([[74, null, null, null, 76, null, null, null], [78, null, null, null, 81, null, null, null], [83, null, null, null, null, null, 81, null]], 92.5, { vel: .6, slot: E8 * 1.25 }), { gain: .7 });
riser(99.2, 99.95, .6);

// ---- 100-112.5: the great migration (autumn; B minor ostinato, toms, brass; the map)
amb('0908-wind-in-tall-grass.mp3', 12, 100, 12.4, .04);
pads(100, 112.4, .55, { cut: 1500 });
for (let t = 100; t < 102.4; t += E8 * 2) { const c = chordAt(t), k = Math.round((t - 100) / (E8 * 2)); nylon(c.t[k % 4] + 12, t, .6); }
for (let k = 0; k < 10; k++) celesta([86, 83, 81, 78, 74][k % 5] + 7, 100.2 + k * .22, .25); // seeds drifting
harpArp(EV.rise, EV.rise + 1.25, .5, { step: E8 / 2 }); flutter(EV.rise, .8, .5, 11);
strOst(102.5, 112.4, .9);
drums(102.5, 112.4, { kick: 1, toms: 1, vel: .7 }); drums(106.25, 112.4, { snare: 1, hat: 1, vel: .55 });
brass([47, 54, 59], 102.5, 1.1, .5); brass([43, 50, 55], 103.75, 1.1, .5); brass([50, 57, 62], 105, 1.1, .5); brass([45, 52, 57], 106.25, 1.1, .5);
strings(rowsToLine(MINOR, 102.5, { vel: 1, slot: E8 / 2 }), { gain: 1.1 });
strings(rowsToLine(MINOR, 107.5, { vel: 1, slot: E8 / 2 }), { gain: 1.2 });
strings(rowsToLine(MINOR, 107.5, { vel: .8, slot: E8 / 2, oct: -12 }), { gain: .8 });
glock(93, EV.compass, .5); glide(EV.compass, .5, 800, 1600, .3);
choir([59, 62, 66, 71], 107.5, 4.9, .6, { atk: 1 });
for (let k = 0; k < 40; k++) { const t = 106.7 + 4.4 * Math.pow(k / 40, .8); tick(t, .22, 1.2 + k * .01); }
impact(EV.arrive, .6); bell(86, EV.arrive, .6); bell(93, EV.arrive + .08, .45);
riser(111.6, 112.45, .9); swellCym(111.5, 112.5, .8);

// ---- 112.5-122.5: winter in Mexico (choir, marimba tremolo, guitar; hush; sunbreak; the burst)
impact(112.5, .45);
amb('0904-wind-in-the-trees.mp3', 15, 112.5, 10, .05, { fin: 1, fout: 1.5 });
pads(112.5, 120, .65, { cut: 1300, atk: 1 });
choir([62, 66, 69], 112.5, 2.5, .6, { atk: 1 }); choir([59, 62, 66], 115, 2.5, .55, { atk: 1 });
for (let t = 112.5; t < 118.7; t += E8) { const c = chordAt(t), k = Math.round((t - 112.5) / E8); nylon(c.t[k % 4] + 12, t, .55); }
for (let t = 112.5; t < 115.5; t += .07) marimba(chordAt(t).t[Math.floor((t - 112.5) / .7) % 4] + 12, t, .22 * R(.7, 1)); // tremolo roll
swarm(112.6, 115.5, .35);
for (let t = EV.cluster; t < EV.sunbreak; t += .625) bell([74, 78, 81, 78][Math.round((t - EV.cluster) / .625) % 4] + 12, t, .25);
pad(CH.Gmaj7.p, EV.cluster, 3.2, .5, { cut: 900, atk: .6 });
[74, 78, 81, 83, 86, 90, 93, 95].forEach((m, i) => harp(m, EV.sunbreak + i * .07, .55));
strings(rowsToLine([[69, null, null, null, 73, null, 76, null]], EV.sunbreak, { vel: .9, slot: E8 * .6 }), { gain: 1 });
choir([57, 62, 64, 69], EV.sunbreak, 1.25, .8, { atk: .5 }); timpRoll(45, EV.sunbreak, EV.burst, .2, 1); swellCym(EV.sunbreak, EV.burst, 1);
// the burst: the theme, everybody
impact(EV.burst, 1.2); crash(EV.burst, .8, { len: 3 }); timp(38, EV.burst, 1, { len: 3 });
strings(rowsToLine([THEME[0]], EV.burst, { vel: 1 }), { gain: 1.5 }); strings(rowsToLine([THEME[0]], EV.burst, { vel: .9, oct: -12 }), { gain: 1 });
brass([50, 57, 62, 66, 69, 74], EV.burst, 1.15, .75, { atk: .05 }); brass([45, 52, 57, 61, 64, 69], 121.25, 1.15, .75, { atk: .05 });
choir([62, 66, 69, 74, 78], EV.burst, 2.4, 1);
marimbaOst(EV.burst, 122.4, .6); drums(EV.burst, 122.4, { kick: 1, snare: 1, hat: 1, toms: 1, vel: .8 }); bassLine(EV.burst, 122.4, .8);
swarm(EV.burst - .1, 123.2, 1.1);

// ---- 122.5-127.5: the journey home (spring, flute, a last egg, light)
pads(122.5, 127.45, .5, { cut: 1800, atk: .6 });
amb('0222-awakening-birds.mp3', 100, 122.5, 5.2, .04);
guitarPick(122.5, 126.2, .6);
flute(rowsToLine([[74, null, 76, null, 78, null, 81, null], [83, null, null, null, 81, null, 78, null]], 122.5, { vel: .85 }), { gain: .95 });
whoosh(122.6, .8, .4, true);
for (let t = 122.6; t < 124.4; t += .2) flap(t, .15);
pop(EV.lastEgg, .8, 1.2); bell(86, EV.lastEgg, .55); sparkle(EV.lastEgg, .5, .5, 90);
flutter(EV.lastEgg + .9, 1.2, .4, 9);
choir([62, 66, 69, 74], EV.glow, 1.4, .6, { atk: .6 }); bell(90, EV.glow, .4);
riser(126.6, 127.45, .9); swellCym(126.5, 127.5, .9);

// ---- 127.5-137.5: the life-cycle ring, the title, a butterfly into the lens
impact(EV.ring, .9); crash(EV.ring, .5);
strings(rowsToLine([THEME[0], THEME[1], THEME[2], THEME[3]], 127.5, { vel: 1 }), { gain: 1.3 });
strings(rowsToLine([THEME[0], THEME[1], THEME[2], THEME[3]], 127.5, { vel: .8, oct: -12 }), { gain: .8 });
playRows([THEME[0], THEME[1], THEME[2], THEME[3]], 127.5, (m, t, v) => glock(m + 12, t, .3 * v));
pads(127.5, 135, .55, { cut: 2200 }); harpArp(127.5, 134.9, .5); bassLine(127.5, 134.9, .7, { step: 1.25 });
drums(127.5, 134.4, { kick: 1, hat: 1, shaker: 1, vel: .55 });
EV.stations.forEach((t, i) => { bell([74, 78, 81, 86][i], t, .6); pop(t, .6, 1); });
impact(EV.name, .6); choir([62, 66, 69, 74], EV.name, 2.4, .9); brass([50, 57, 62, 66], EV.name, 1.2, .5, { atk: .1 });
whoosh(EV.fly, .7, .6, true); flutter(EV.fly, .7, .7, 12); riser(EV.fly, EV.final, .8);
impact(EV.final, 1.1); timp(38, EV.final, 1, { len: 3 });
brass([38, 50, 57, 62, 64, 66, 69], EV.final, 1.6, .8, { atk: .05 }); choir([62, 66, 69, 74, 76], EV.final, 2.2, 1);
pad(CH.Dadd9.p, EV.final, 2.2, .8, { cut: 2600, atk: .02 }); ubass(38, EV.final, 1.6, 1);
[81, 86, 88, 90, 93, 98].forEach((m, i) => bell(m, EV.final + .1 + i * .07, .45));
[86, 81, 78, 74].forEach((m, i) => celesta(m, 135.9 + i * .28, .4));
amb('0222-awakening-birds.mp3', 30, 135.2, 2.3, .03, { fin: .4, fout: 1 });

// =================================================================================================== V2 LAYER
// piano, horns, taiko and new sound design laid over the score, scene by scene
// -- dawn: a felt piano greets the light before the strings take the theme
pianoChord([50, 57, 62], .3, .45, { soft: 1, len: 5 });
[[1.0, 74], [1.55, 76], [2.1, 78], [2.75, 81], [3.6, 78]].forEach(([t, m]) => piano(m, t, .42, { soft: 1, len: 3 }));
pianoChord([62, 66, 69, 74], EV.title, .45, { roll: .03 });
wingPass(10.0, .9, 1); // the giant-wing wipe into the egg
// -- the egg: warm piano under the music box; a bee working the milkweed behind her
for (const [t, ch] of [[10, 'Gmaj7'], [12.5, 'Dsl'], [15, 'Em9'], [17.5, 'Asus']]) pianoChord([CH[ch].r + 12, CH[ch].t[1], CH[ch].t[2]], t, .3, { soft: 1, roll: .06, len: 3 });
buzz(10.2, 3.4, .35, { pan: (u) => -.6 + .3 * u, near: (u) => .45 + .35 * Math.sin(u * 9) });
// -- the jay: big drums and low horns in D minor
taiko(EV.shadow, .6, { f: 46, dec: .9 });
taiko(EV.grab, 1.0); taiko(EV.grab + .3125, .55, { f: 68 }); horn([38, 45, 50, 53], EV.grab, .9, .8);
taiko(EV.xray, .7, { f: 52 }); horn([37, 44, 49, 52], EV.xray + .2, .8, .55);
// -- nightfall: the lullaby doubled on felt piano
pianoChord([50, 57, 66], 48.2, .3, { soft: 1, len: 3.5 });
[81, 78, 74, 76, 74, 69].forEach((m, i) => piano(m - 12, 48.4 + i * .3, .38, { soft: 1, len: 2.5 }));
// -- emergence: piano pulses under the swelling strings
for (let t = 70; t < 77.3; t += .625) { const c = chordAt(t), k = Math.round((t - 70) / .625); piano(c.t[[1, 2, 3, 2][k % 4]] + 12, t, .26, { soft: 1, len: 2 }); if (k % 4 === 0) piano(c.r + 12, t, .32, { soft: 1, len: 3 }); }
// -- first flight: horns and drums
horn([62, 66, 69], 77.5, 2.3, .7); horn([59, 62, 66], 80, 2.3, .7);
[77.5, 78.75, 80, 81.25].forEach((t, i) => taiko(t, i % 2 ? .5 : .75));
wingPass(82.5, .9, -1); // the giant-wing wipe into summer
// -- summer: the bumblebee next door
buzz(82.7, 2.6, .55, { pan: (u) => .25 + .2 * Math.sin(u * 7), near: (u) => .55 + .45 * Math.sin(u * 11) });
// -- four generations: a swarm wipe, then a clockwork piano
swarm(92.0, 93.1, .8); whoosh(92.15, .6, .5, true);
for (let t = 92.5; t < 99.9; t += E8 * 2) { const c = chordAt(t), k = Math.round((t - 92.5) / (E8 * 2)); piano(c.t[k % 4] + 24, t, .2, { len: 1.4 }); }
EV.gen.forEach((t, i) => piano([74, 78, 81, 86][i], t, .5));
// -- the migration: a swarm wipe, geese overhead, then taiko and horns drive south
swarm(99.5, 100.6, .8); whoosh(99.7, .6, .5, false);
[100.0, 100.35, 100.7, 101.4, 102.1, 102.8, 103.5].forEach((t, i) => honk(t, .75, { pan: lerp(.6, -.6, (t - 99.6) / 5), f: 285 + (i % 3) * 28, muff: 1900 }));
for (let t = 102.5; t < 112.3; t += 1.25) { taiko(t, .62); taiko(t + .625, .4, { f: 72 }); }
for (let t = 107.5; t < 112.3; t += 2.5) { taiko(t + 1.875, .45, { f: 84 }); taiko(t + 2.1875, .5, { f: 76 }); }
for (const s of segsIn(102.5, 112.4)) horn(s.c.t.map((m) => m - 12).slice(0, 3), s.a, s.b - s.a - .05, .42);
// -- into the mountains through cloud
noiseSweep(111.8, 113.4, 180, 900, .55, { q: .5, env: (u) => Math.sin(Math.PI * u) }); choir([62, 69, 74], 112.0, 1.6, .45, { atk: .6 });
// -- the hush of the roost: a few piano notes; then the burst with drums and horns
[[115.8, 86], [116.4, 81], [117.0, 78], [117.6, 74], [118.2, 76]].forEach(([t, m]) => piano(m, t, .32, { soft: 1, len: 3 }));
taiko(EV.burst, 1.1, { dec: .7 }); taiko(EV.burst + .625, .55); taiko(EV.burst + 1.25, .9); taiko(EV.burst + 1.875, .55);
horn([50, 57, 62, 66], EV.burst, 1.2, .7); horn([45, 52, 57, 61], EV.burst + 1.25, 1.2, .7);
// -- home: tender piano with the flute
for (let t = 122.5; t < 127.3; t += E8 * 2) { const c = chordAt(t), k = Math.round((t - 122.5) / (E8 * 2)); piano(c.t[[0, 2, 1, 3][k % 4]] + 12, t, .26, { soft: 1, len: 2.4 }); }
// -- the ring and the end
taiko(EV.ring, .7); EV.stations.forEach((t, i) => piano([74, 78, 81, 86][i], t, .45));
taiko(EV.name, .7); horn([50, 57, 62, 66], EV.name, 1.2, .55);
taiko(EV.final, 1.0, { dec: .9 }); horn([38, 50, 57, 62, 66], EV.final, 1.8, .75); pianoChord([62, 66, 69, 74, 78], EV.final, .55, { roll: .04, len: 4 });
console.timeEnd('synth');

// =================================================================================================== MIX
{ // ping-pong delay at a dotted eighth
  const Dd = Math.round(.46875 * SR), lp = [new SVF(3500, .7), new SVF(3500, .7)];
  for (let i = Dd; i < N; i++) {
    const l = dlyL[i - Dd] * .42, r = dlyR[i - Dd] * .42;
    dlyL[i] += lp[1].tick(r) * .8; dlyR[i] += lp[0].tick(l) * .8;
  }
}
function fdn(inL, inR, rt = 2.6) {
  const lens = [1557, 1617, 1491, 1422, 1277, 1356, 1188, 1116].map((l) => Math.round(l * 1.6));
  const pre = Math.round(.02 * SR), bufs = lens.map((l) => new Float32Array(l)), idx = lens.map(() => 0), lp = lens.map(() => 0);
  const g = lens.map((l) => Math.pow(10, -3 * l / (rt * SR))), oL = new Float32Array(N), oR = new Float32Array(N), x = new Float64Array(8);
  for (let i = 0; i < N; i++) {
    const j = i - pre, il = j >= 0 ? inL[j] : 0, ir = j >= 0 ? inR[j] : 0;
    for (let k = 0; k < 8; k++) x[k] = bufs[k][idx[k]];
    for (let h = 1; h < 8; h <<= 1) for (let a = 0; a < 8; a += h << 1) for (let b = a; b < a + h; b++) { const u = x[b], v = x[b + h]; x[b] = u + v; x[b + h] = u - v; }
    let l = 0, r = 0;
    for (let k = 0; k < 8; k++) {
      lp[k] += (x[k] * .35355339 - lp[k]) * .45;
      bufs[k][idx[k]] = lp[k] * g[k] + ((k & 1) ? ir : il) * (k < 4 ? 1 : -1) * .5;
      if (++idx[k] >= lens[k]) idx[k] = 0;
      if (k & 1) r += bufs[k][idx[k]]; else l += bufs[k][idx[k]];
    }
    oL[i] = l * .5; oR[i] = r * .5;
  }
  return [oL, oR];
}
const [rvL, rvR] = fdn(revL, revR);
const L = new Float32Array(N), Rr = new Float32Array(N);
for (let i = 0; i < N; i++) { L[i] = dryL[i] + dlyL[i] * .5 + rvL[i] * .55; Rr[i] = dryR[i] + dlyR[i] * .5 + rvR[i] * .55; }
{ // DC / rumble high-pass
  let pl = 0, pr = 0, yl = 0, yr = 0; const a = Math.exp(-TAU * 30 / SR);
  for (let i = 0; i < N; i++) { const xl = L[i], xr = Rr[i]; yl = a * (yl + xl - pl); yr = a * (yr + xr - pr); pl = xl; pr = xr; L[i] = yl; Rr[i] = yr; }
}
let peak = 0;
for (let i = 0; i < N; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(Rr[i]));
const pre = 1.75 / peak;
let env = 0, gr = 1;
const thr = .42, ratio = 2.6, atk = Math.exp(-1 / (.008 * SR)), relc = Math.exp(-1 / (.25 * SR));
for (let i = 0; i < N; i++) {
  const l = L[i] * pre, r = Rr[i] * pre, lvl = Math.max(Math.abs(l), Math.abs(r));
  env = lvl > env ? atk * env + (1 - atk) * lvl : relc * env + (1 - relc) * lvl;
  const target = env > thr ? Math.pow(env / thr, 1 / ratio - 1) : 1;
  gr = target < gr ? .99 * gr + .01 * target : .9995 * gr + .0005 * target;
  L[i] = Math.tanh(l * gr * 1.1) * .92; Rr[i] = Math.tanh(r * gr * 1.1) * .92;
}
const endS = Math.round(DURATION * SR);
for (let i = 0; i < endS; i++) { const t = i / SR, f = Math.min(1, t / .03) * (t > DURATION - 1.2 ? Math.max(0, (DURATION - t) / 1.2) : 1); L[i] *= f; Rr[i] *= f; }

if (process.argv.includes('--levels')) {
  const db = (e) => (e > 0 ? (10 * Math.log10(e / SR)).toFixed(0) : '-inf').padStart(5);
  let s = 'sec   mus   sfx   out\n';
  for (let k = 0; k < Math.floor(DURATION); k++) {
    let o = 0; for (let i = k * SR; i < (k + 1) * SR; i++) o += L[i] * L[i] + Rr[i] * Rr[i];
    s += `${String(k).padStart(3)} ${db(LEVEL.mus[k])} ${db(LEVEL.sfx[k])} ${db(o)}\n`;
  }
  console.log(s);
}

const out = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : 'score.wav';
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
