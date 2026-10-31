// Sound design for the score: real CC0 recordings (BigSoundBank / Joseph Sardin, public domain) sliced, shaped and
// placed; looping ambience beds with gain + filter automation; cicada calls built from the steady single-buzz
// recordings (sliced, re-pitched into the Magicicada rise-hold-fall phrase, tymbal tremolo); the massed chorus from
// the natural chorus recording plus pitched/offset layers; and a few synthesized one-shots (whooshes, risers, sub
// hits, digging scrapes, soft pops, clicks, the ovipositor rasp, the exoskeleton crack).
const fs = require('fs'), path = require('path');
const { spawnSync } = require('child_process');
const { SR, N, TAU, S0, clamp, ss, R, rnd, white, bus, HALL, out, SVF, biquad } = require('./mix');

const DIR = path.join(__dirname, '..', '..', 'assets', 'sfx');
const REC = {};
function rec(name) {
  if (REC[name]) return REC[name];
  const f = path.join(DIR, name);
  if (!fs.existsSync(f)) throw new Error('missing recording ' + name);
  const r = spawnSync('ffmpeg', ['-v', 'error', '-i', f, '-ac', '2', '-ar', String(SR), '-f', 'f32le', '-'], { maxBuffer: 1 << 30 });
  const x = new Float32Array(r.stdout.buffer, r.stdout.byteOffset, r.stdout.length >> 2);
  const L = new Float32Array(x.length / 2), Rr = new Float32Array(x.length / 2);
  let e = 0;
  for (let i = 0; i < L.length; i++) { L[i] = x[2 * i]; Rr[i] = x[2 * i + 1]; e += L[i] * L[i] + Rr[i] * Rr[i]; }
  return (REC[name] = { L, R: Rr, n: L.length, dur: L.length / SR, rms: Math.sqrt(e / (2 * L.length)) });
}
const F = {
  CHORUS: '3002-cicadas.mp3', BUZZ1: '2397-cicada-1-long.mp3', BUZZ2: '2399-cicada-2-long.mp3', FAR1: '2246-cicada-1.mp3', FAR2: '2247-cicada-2.mp3',
  CRICKET: '1020-field-cricket.mp3', NIGHTBUG: '0424-song-of-nocturnal-insect-1.mp3', NIGHT: '1470-nocturnal-insects-4.mp3',
  CAMP1: '0110-campaign-at-night-1.mp3', CAMP3: '1469-campaign-at-night-3.mp3', FOREST: '0100-forest.mp3', FOREST2: '1348-forest-2.mp3', FOREST3: '2715-forest-3.mp3',
  WIND: '0904-forest-wind-in-the-trees.mp3', RAINNIGHT: '0555-forest-at-night-after-rain.mp3', LEAVES: '0137-feet-in-leaves.mp3', TWIGS: '1299-broken-twigs-1.mp3',
  STEPS: '1301-steps-on-the-twigs.mp3', HEART1: '0243-heartbeat-1.mp3', HEART: '0218-heart-beat.mp3', FLAP1: '2891-flight-bird-1.mp3', FLAP3: '2893-flight-bird-3.mp3',
  ROBIN: '1667-robin.mp3', BLACKBIRD: '3503-blackbird.mp3', DAWN: '1906-birds-waking.mp3', COUNTRY: '0097-countryside.mp3', BEE: '1000-bumblebee-1.mp3',
  SQUEAK: '1051-wind-and-tree-squeaks.mp3', DROPS1: '1384-drops-1.mp3', DROPS2: '1385-drops-2.mp3', BUBBLES: '0150-water-bubbles.mp3',
};

// biquad pair helper for stereo processing
const pair = (type, f, g, q) => [biquad(type, f, g, q), biquad(type, f, g, q)];

// play [a,b) seconds of a recording at t0.
// o: {fi, fo, pan, rev, cut (lowpass), hp, peak:[f,dB,q], rate, env(t), bus, width, mono}
function play(name, a, b, t0, gain = 1, o = {}) {
  const r = rec(name), rate = o.rate ?? 1, i0 = S0(a), i1 = Math.min(r.n - 2, S0(b)), s0 = S0(t0);
  const fi = Math.max(1, (o.fi ?? .01) * SR), fo = Math.max(1, (o.fo ?? .05) * SR), B = bus(o.bus ?? 'sfx');
  const lp = o.cut ? [new SVF(o.cut, .7), new SVF(o.cut, .7)] : null, hp = o.hp ? [new SVF(o.hp, .7), new SVF(o.hp, .7)] : null;
  const pk = o.peak ? pair('peak', ...o.peak) : null;
  const pl = o.pan !== undefined ? Math.cos((o.pan + 1) * Math.PI / 4) * 1.414 : 1, pr = o.pan !== undefined ? Math.sin((o.pan + 1) * Math.PI / 4) * 1.414 : 1, wd = o.width ?? 1;
  const n = Math.floor((i1 - i0) / rate), rv = o.rev ?? .06;
  for (let k = 0; k < n; k++) {
    const i = s0 + k; if (i >= N) break;
    const src = i0 + k * rate, j = Math.floor(src), fr = src - j; if (j + 1 >= r.n) break;
    let l = r.L[j] * (1 - fr) + r.L[j + 1] * fr, rr = r.R[j] * (1 - fr) + r.R[j + 1] * fr;
    if (o.mono) { l = rr = (l + rr) / 2; }
    if (wd !== 1) { const m = (l + rr) / 2, sd = (l - rr) / 2 * wd; l = m + sd; rr = m - sd; }
    if (lp) { l = lp[0].tick(l); rr = lp[1].tick(rr); }
    if (hp) { hp[0].tick(l); hp[1].tick(rr); l = hp[0].hp; rr = hp[1].hp; }
    if (pk) { l = pk[0](l); rr = pk[1](rr); }
    if (i < 0) continue;
    const e = Math.min(1, k / fi, (n - k) / fo) * gain * (o.env ? o.env(i / SR) : 1);
    B.L[i] += l * e * pl; B.R[i] += rr * e * pr;
    HALL.L[i] += l * e * pl * rv; HALL.R[i] += rr * e * pr * rv;
  }
}

// a long ambience bed (looped with a crossfade) from t0 to t1, gain automation g(t);
// o: {cut: number | (t)=>Hz lowpass, hp, fi, fo, xfade, bus, width, rev, rate, peak}
function bed(name, from, t0, t1, g, o = {}) {
  const r = rec(name), s0 = Math.max(0, S0(t0)), s1 = Math.min(N, S0(t1)), B = bus(o.bus ?? 'amb'), f0 = S0(from), xf = S0(o.xfade ?? 1.5), rate = o.rate ?? 1;
  const cutF = typeof o.cut === 'function' ? o.cut : null, lp = [new SVF(cutF ? cutF(t0) : (o.cut ?? 18000), .7), new SVF(cutF ? cutF(t0) : (o.cut ?? 18000), .7)];
  const hp = o.hp ? [new SVF(o.hp, .7), new SVF(o.hp, .7)] : null, pk = o.peak ? pair('peak', ...o.peak) : null, wd = o.width ?? 1, rv = o.rev ?? 0;
  const P = Math.max(SR, r.n - f0 - xf - 2);
  for (let i = s0; i < s1; i++) {
    const k = i - s0, t = i / SR;
    if (cutF && (i & 63) === 0) { const fc = cutF(t); lp[0].set(fc, .7); lp[1].set(fc, .7); }
    const gg = g(t) * Math.min(1, k / (SR * (o.fi ?? .8)), (s1 - i) / (SR * (o.fo ?? .8)));
    const pos = k * rate, q = pos % P, j = Math.floor(f0 + q), fr = f0 + q - j;
    let l = r.L[j] * (1 - fr) + r.L[j + 1] * fr, rr = r.R[j] * (1 - fr) + r.R[j + 1] * fr;
    if (pos >= P && q < xf) { const u = q / xf, ja = j + P; if (ja + 1 < r.n) { l = r.L[ja] * (1 - u) + l * u; rr = r.R[ja] * (1 - u) + rr * u; } }
    if (wd !== 1) { const m = (l + rr) / 2, sd = (l - rr) / 2 * wd; l = m + sd; rr = m - sd; }
    l = lp[0].tick(l); rr = lp[1].tick(rr);
    if (hp) { hp[0].tick(l); hp[1].tick(rr); l = hp[0].hp; rr = hp[1].hp; }
    if (pk) { l = pk[0](l); rr = pk[1](rr); }
    if (gg <= 0) continue;
    B.L[i] += l * gg; B.R[i] += rr * gg;
    if (rv) { HALL.L[i] += l * gg * rv; HALL.R[i] += rr * gg * rv; }
  }
}

// ---------------------------------------------------------------- cicadas
// The single-buzz recordings sing in ~4 Hz echemes (0.2 s buzz, 50 ms gap). For the continuous Magicicada buzz the
// "on" stretches are found (10 ms RMS), trimmed of their ramps and spliced end to end with equal-power crossfades.
const BUZZ = {};
function buzz(name) {
  if (BUZZ[name]) return BUZZ[name];
  const r = rec(name), x = r.L, hop = 480, E = [];
  for (let s = 0; s + hop <= r.n; s += hop) { let e = 0; for (let i = s; i < s + hop; i++) e += x[i] * x[i]; E.push(e / hop); }
  const med = E.slice().sort((a, b) => a - b)[Math.floor(E.length * .6)], th = med * .3, segs = [];
  for (let k = 0; k < E.length;) {
    if (E[k] < th) { k++; continue; }
    let j = k; while (j < E.length && E[j] >= th) j++;
    if (j - k >= 9) segs.push([(k + 2) * hop, (j - 2) * hop]);
    k = j;
  }
  const xf = 360, out = new Float32Array(r.n);
  let w = 0;
  for (const [a, b] of segs) {
    let i = a;
    if (w >= xf) { w -= xf; for (let k = 0; k < xf; k++, i++, w++) { const u = (k + .5) / xf; out[w] = out[w] * Math.cos(u * Math.PI / 2) + x[i] * Math.sin(u * Math.PI / 2); } }
    for (; i < b; i++) out[w++] = x[i];
  }
  const L = out.subarray(0, w);
  let e = 0; for (let i = 0; i < w; i++) e += L[i] * L[i];
  return (BUZZ[name] = { L, n: w, dur: w / SR, rms: Math.sqrt(e / w) });
}
// one male call built from the steady single-buzz recording: Magicicada "rise-hold-fall" phrase.
// The slice is resampled (st semitones), swells in with a small upward glide, holds, then falls in pitch + level;
// an amplitude tremolo adds the tymbal pulse. Level is normalised so gain 1 ~ -20 dBFS RMS.
// o: {src, from, st, fall, fallDur, rise, trem, depth, pan, rev, gain, cut, bus, dist}
function call(t0, dur, o = {}) {
  const r = buzz(o.src ?? F.BUZZ2), st = o.st ?? -3, fall = o.fall ?? 3.5, fd = o.fallDur ?? Math.min(.55, dur * .32), rise = o.rise ?? Math.min(.4, dur * .25);
  const from = o.from ?? R(3, r.dur - dur * 1.3 - 3);
  let pos = from * SR;
  const n = S0(dur + .08), s0 = S0(t0), norm = .1 / r.rms;
  const put = out(o.pan ?? 0, (o.gain ?? 1) * norm, o.rev ?? .1, o.bus ?? 'cic');
  const res = 5400 * Math.pow(2, st / 12);
  const hp = biquad('highpass', o.hp ?? 700, 0, .7), pk = biquad('peak', res, o.resCut ?? -5, 1.1), lp = biquad('lowpass', o.cut ?? Math.min(12000, res * 2.1), 0, .7);
  const lp2 = o.dist ? biquad('lowpass', o.dist, 0, .7) : null;
  const tr = o.trem ?? 34, dp = o.depth ?? .32, ph0 = rnd();
  for (let k = 0; k < n; k++) {
    const t = k / SR;
    const p = st - 1.3 * (1 - ss(0, rise, t)) - fall * Math.pow(ss(dur - fd, dur, t), 1.3);
    const env = ss(0, rise * 1.25, t) * (.82 + .18 * ss(rise, dur - fd, t)) * (1 - ss(dur - fd * .85, dur + .05, t));
    const j = Math.floor(pos), f = pos - j; if (j + 1 >= r.n) break;
    let x = r.L[j] * (1 - f) + r.L[j + 1] * f;
    x *= 1 - dp * (.5 + .5 * Math.sin(TAU * (tr * t + ph0)));
    x = lp(pk(hp(x)));
    if (lp2) x = lp2(x);
    put(s0 + k, x * env);
    pos += Math.pow(2, p / 12);
  }
}
// the massed chorus: the natural chorus recording (wide) + pitched/offset copies of the long buzzes, each layer
// breathing in slow waves like neighbouring trees; g(t) shapes the whole thing. o: {layers, mass, buzz, cut, seed}
function chorus(t0, t1, g, o = {}) {
  bed(F.CHORUS, o.from ?? 4, t0, t1, (t) => g(t) * (o.mass ?? 1), { bus: 'cic', width: o.width ?? 1.35, fi: o.fi ?? .4, fo: o.fo ?? .8, cut: o.cut ?? 11000, hp: 300, rev: .04 });
  const K = o.layers ?? 5;
  for (let k = 0; k < K; k++) {
    const src = buzz(k % 2 ? F.BUZZ1 : F.BUZZ2), st = [-2, 1, -4, -1, 2, -3, 0, -5][k % 8] + R(-.3, .3), rate = Math.pow(2, st / 12);
    const pan = [-.85, .8, -.4, .45, -.7, .65, 0, -.2][k % 8], s0 = S0(t0), s1 = Math.min(N, S0(t1)), norm = .1 / src.rms * (o.buzz ?? .35);
    const fw = R(.04, .14), ph = rnd() * TAU, from = R(2, Math.max(3, src.dur - (t1 - t0) * rate - 2));
    const put = out(pan, norm, .14, 'cic');
    const res = 5400 * rate, hp = biquad('highpass', 800, 0, .7), pk = biquad('peak', res, -5, 1), lp = biquad('lowpass', Math.min(11000, res * 1.9), 0, .7);
    const fiS = SR * (o.fi ?? .4), foS = SR * (o.fo ?? .8);
    let pos = from * SR;
    for (let i = s0; i < s1; i++) {
      const t = i / SR, j = Math.floor(pos), f = pos - j; if (j + 1 >= src.n) break;
      const wave = .55 + .45 * Math.sin(TAU * fw * (t - t0) + ph);
      const e = g(t) * wave * Math.min(1, (i - s0) / fiS, (s1 - i) / foS);
      const x = lp(pk(hp(src.L[j] * (1 - f) + src.L[j + 1] * f)));
      if (e > 0) put(i, x * e);
      pos += rate;
    }
  }
}

// ---------------------------------------------------------------- slices of real recordings
const HEART_LUB = [.05, .97, 1.82, 2.73, 3.69, 4.53, 5.44, 6.4, 7.27];
// one heartbeat (lub-dub) from the real recordings; lub lands on t0
function heart(t0, vel = 1, o = {}) {
  if (o.long) { const a = HEART_LUB[o.k % 8]; play(F.HEART, a - .04, a + .6, t0 - .04, vel, { fo: .15, cut: o.cut ?? 1400, rev: .05, mono: true, ...o }); }
  else play(F.HEART1, 0, .8, t0 - .05, vel * .9, { fo: .2, cut: o.cut ?? 1400, rev: .05, mono: true, rate: o.rate ?? 1, ...o });
}
const DROP_AT = [.11, 1.58, 2.97, 4.4, 5.83, 7.22, 8.6, 10.14, 11.63, 13.02, 14.48, 15.92, 17.38, 18.82];
function drip(t0, k = 0, gain = 1, o = {}) { const a = DROP_AT[k % DROP_AT.length]; play(k % 2 ? F.DROPS2 : F.DROPS1, a - .02, a + .55, t0, gain, { fo: .2, rev: .3, mono: true, ...o }); }
const FLAP = [[F.FLAP1, .25, 1.75], [F.FLAP3, .15, 1.2]];
function flaps(t0, k = 0, gain = 1, o = {}) { const [f, a, b] = FLAP[k % 2]; play(f, a, b, t0 - .1, gain, { fo: .25, rev: .12, mono: true, ...o }); }
function leaves(t0, dur, gain = 1, o = {}) { const from = o.from ?? R(1, 55); play(F.LEAVES, from, from + dur * (o.rate ?? 1), t0, gain, { fi: .15, fo: .3, mono: true, rev: .08, ...o }); }
function twig(t0, k = 0, gain = 1, o = {}) { const at = [1.13, 3.74, .25, 1.92][k % 4]; play(F.TWIGS, at - .03, at + .45, t0, gain, { fo: .15, rev: .1, mono: true, ...o }); }

// ---------------------------------------------------------------- synthesized one-shots
// band-passed noise sweep; o: {f0, f1, skew, sweep (pan travel), rev, bus, pan}
function whoosh(t0, dur, vel = 1, o = {}) {
  const s0 = S0(t0), len = Math.round(dur * SR), put = out(o.pan ?? 0, .14 * vel, o.rev ?? .3, o.bus ?? 'sfx'), bp = new SVF(500, 1.4), bp2 = new SVF(500, 1.4), sweep = o.sweep ?? 0;
  const f0 = o.f0 ?? 300, f1 = o.f1 ?? 2500;
  for (let i = 0; i < len; i++) {
    const u = i / len; if ((i & 31) === 0) { const fc = f0 * Math.pow(f1 / f0, Math.pow(u, o.curve ?? 1)); bp.set(fc, 1.4); bp2.set(fc * 1.07, 1.4); }
    const e = Math.pow(Math.sin(Math.PI * Math.pow(u, o.skew ?? 1)), 2), p = clamp(.5 + sweep * (u - .5), 0, 1);
    put(s0 + i, bp.tick(white()) * e * (1 - p) * 1.4 * 1.414, bp2.tick(white()) * e * p * 1.4 * 1.414);
  }
}
// rising airy noise (a riser) that peaks exactly at tEnd then cuts with a short tail
function riser(tEnd, dur, vel = 1, o = {}) {
  const s0 = S0(tEnd - dur), len = S0(dur + .25), put = out(0, .1 * vel, o.rev ?? .35, o.bus ?? 'sfx'), bp = [new SVF(400, 1.2), new SVF(400, 1.2)];
  for (let i = 0; i < len; i++) {
    const t = i / SR, u = Math.min(1, t / dur);
    if ((i & 31) === 0) { const fc = (o.f0 ?? 250) * Math.pow((o.f1 ?? 5000) / (o.f0 ?? 250), u * u); bp[0].set(fc, 1.2); bp[1].set(fc * 1.05, 1.2); }
    const e = Math.pow(u, o.pow ?? 2.2) * (t > dur ? Math.exp(-(t - dur) / .06) : 1);
    put(s0 + i, bp[0].tick(white()) * e * 1.6, bp[1].tick(white()) * e * 1.6);
  }
}
// low sub hit (felt): pitched sine drop + soft click; o: {f, dec, drop, rev, bus}
function sub(t0, vel = 1, o = {}) {
  const s0 = S0(t0), put = out(0, .5 * vel, o.rev ?? .12, o.bus ?? 'sfx'), len = S0((o.dec ?? .35) * 6);
  let ph = 0;
  for (let i = 0; i < len; i++) { const t = i / SR; ph += TAU * (o.f ?? 44) * (1 + (o.drop ?? .8) * Math.exp(-t / .04)) / SR; put(s0 + i, Math.sin(ph) * Math.exp(-t / (o.dec ?? .35)) * Math.min(1, t / .004)); }
}
// soft rounded pop (an egg hatching): a damped bubble-like chirp with a tiny click
function pop(t0, vel = 1, o = {}) {
  const s0 = S0(t0), put = out(o.pan ?? R(-.3, .3), .09 * vel, o.rev ?? .3, o.bus ?? 'sfx'), f0 = o.f ?? 1100, tau = o.tau ?? .018, hp = new SVF(1500, .7);
  let ph = 0;
  for (let i = 0; i < SR * tau * 7; i++) { const t = i / SR; ph += TAU * f0 * (1 + .6 * t / tau) / SR; hp.tick(white()); put(s0 + i, (Math.sin(ph) + hp.hp * .2 * Math.exp(-t / .002)) * Math.exp(-t / tau) * Math.min(1, t / .0015)); }
}
// small dry click (wing flick / claw): band-passed noise burst
function click(t0, vel = 1, o = {}) {
  const s0 = S0(t0), put = out(o.pan ?? 0, .16 * vel, o.rev ?? .12, o.bus ?? 'sfx'), bp = new SVF(o.f ?? 3200, 2.2);
  for (let i = 0; i < SR * .03; i++) { const t = i / SR; put(s0 + i, bp.tick(white()) * Math.exp(-t / (o.dec ?? .0035)) * Math.min(1, t / .0007) * 2.5); }
}
// the ovipositor sawing into the twig: back-and-forth rasp strokes (pulsed band-passed noise + a woody resonance)
function rasp(t0, dur, vel = 1, o = {}) {
  const s0 = S0(t0), len = S0(dur), put = out(o.pan ?? .1, .1 * vel, o.rev ?? .12, o.bus ?? 'sfx'), bp = new SVF(2600, 1.6), bp2 = new SVF(900, 4), rate = o.rate ?? 3.2;
  for (let i = 0; i < len; i++) {
    const t = i / SR, ph = (t * rate) % 1, stroke = Math.sin(Math.PI * ph);                 // one push or pull
    if ((i & 31) === 0) bp.set(1900 + 1400 * stroke, 1.6);
    const teeth = 1 - .7 * Math.pow(.5 + .5 * Math.sin(TAU * (90 + 50 * stroke) * t), 3);   // serrations catching
    const x = (bp.tick(white()) * 1.2 + bp2.tick(white()) * .5) * teeth * Math.pow(stroke, 1.5);
    put(s0 + i, x * Math.min(1, t / .05, (dur - t) / .1));
  }
}
// digging: grains of soil scraped and pushed (low-passed noise grains)
function scrape(t0, dur, vel = 1, o = {}) {
  const s0 = S0(t0), len = S0(dur), put = out(o.pan ?? R(-.4, .4), .12 * vel, o.rev ?? .1, o.bus ?? 'sfx'), lp = new SVF(o.cut ?? 1200, .9), hp = new SVF(o.hp ?? 150, .7);
  let g = 0;
  for (let i = 0; i < len; i++) {
    const t = i / SR; if (rnd() < (o.dens ?? 900) / SR) g = R(.4, 1);
    g *= .9993; const e = Math.sin(Math.PI * t / dur);
    hp.tick(lp.tick(white() * g)); put(s0 + i, hp.hp * e * 2.2);
  }
}
// exoskeleton splitting: a dry crack with a short tearing tail
function crack(t0, vel = 1, o = {}) {
  for (let k = 0; k < 9; k++) click(t0 + (k ? R(0, .16) * Math.pow(k / 9, .7) : 0), vel * (k ? R(.25, .6) : 1), { f: R(1800, 4200), dec: R(.002, .006), pan: o.pan ?? R(-.15, .15), rev: .2 });
  const s0 = S0(t0), put = out(o.pan ?? 0, .06 * vel, .25, 'sfx'), bp = new SVF(2500, 1.2);
  for (let i = 0; i < SR * .35; i++) { const t = i / SR; put(s0 + i, bp.tick(white()) * Math.exp(-t / .09) * (.6 + .4 * Math.sin(TAU * 31 * t))); }
}
// breathy swell (an intake of air, a body unfolding)
function breath(t0, dur, vel = 1, o = {}) { const s0 = S0(t0), put = out(o.pan ?? 0, .06 * vel, o.rev ?? .35, o.bus ?? 'sfx'), bp = new SVF(700, 1); for (let i = 0; i < dur * SR; i++) { const u = i / (dur * SR); if ((i & 31) === 0) bp.set((o.f0 ?? 450) + (o.f1 ?? 1600) * u, 1); put(s0 + i, bp.tick(white()) * Math.pow(Math.sin(Math.PI * u), 1.5) * 1.4); } }
// high airy shimmer (band-passed noise around 6-9 kHz, gently swelling) for the moults
function shimmer(t0, dur, vel = 1, o = {}) {
  const s0 = S0(t0), len = S0(dur), put = out(0, .05 * vel, o.rev ?? .6, o.bus ?? 'sfx'), bp = [new SVF(7000, 3), new SVF(7600, 3)];
  for (let i = 0; i < len; i++) { const u = i / len; if ((i & 31) === 0) { bp[0].set(5000 + 3500 * u, 3); bp[1].set(5400 + 3600 * u, 3); } const e = Math.pow(Math.sin(Math.PI * u), 2) * (.75 + .25 * Math.sin(TAU * 7 * i / SR)); put(s0 + i, bp[0].tick(white()) * e * 1.5, bp[1].tick(white()) * e * 1.5); }
}
// root creak: slow stick-slip friction (band-passed impulse train with drifting rate)
function creak(t0, dur = .8, vel = 1, o = {}) {
  const s0 = S0(t0), put = out(o.pan ?? R(-.5, .5), .05 * vel, o.rev ?? .4, o.bus ?? 'sfx'), bp = new SVF(o.f ?? 240, 7), lp = new SVF(900, .7);
  let ph = 0;
  for (let i = 0; i < dur * SR; i++) { const t = i / SR; ph += (24 + 18 * Math.sin(t * 4.1) + 9 * Math.sin(t * 11.3)) / SR; const imp = (ph % 1) < .02 ? white() * 3 : 0; put(s0 + i, lp.tick(bp.tick(imp + white() * .05)) * 3.2 * Math.sin(Math.PI * t / dur)); }
}
// earth: a low, slowly breathing rumble bed (brown noise, low-passed) with gain g(t)
function rumble(t0, t1, g, o = {}) {
  const s0 = S0(t0), s1 = Math.min(N, S0(t1)), B = bus(o.bus ?? 'amb'), lp = [new SVF(o.cut ?? 110, .7), new SVF(o.cut ?? 110, .7)], hp = [new SVF(28, .7), new SVF(28, .7)];
  let bl = 0, br = 0;
  for (let i = s0; i < s1; i++) {
    const t = i / SR; bl = bl * .995 + white() * .1; br = br * .995 + white() * .1;
    const m = .75 + .25 * Math.sin(TAU * .13 * t) * Math.sin(TAU * .047 * t + 1);
    hp[0].tick(lp[0].tick(bl)); hp[1].tick(lp[1].tick(br));
    const e = g(t) * m * Math.min(1, (i - s0) / (SR * .8), (s1 - i) / (SR * .8)) * 2.2;
    B.L[i] += hp[0].hp * e; B.R[i] += hp[1].hp * e;
  }
}

module.exports = { rec, buzz, play, bed, F, call, chorus, heart, drip, flaps, leaves, twig, whoosh, riser, sub, pop, click, rasp, scrape, crack, breath, shimmer, creak, rumble, HEART_LUB };
