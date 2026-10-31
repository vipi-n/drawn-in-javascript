// Sound design: real CC0 recordings (BigSoundBank / Joseph Sardin) sliced and placed, ambience beds that muffle when
// the camera is underwater, plus a few synthesized one-shots (Minnaert bubbles, whooshes, tongue, ice).
const path = require('path');
const { spawnSync } = require('child_process');
const { SR, N, TAU, S0, clamp, R, rnd, white, BUS, HALL, out, SVF } = require('./mix');

const DIRS = [path.join(__dirname, '..', 'assets', 'sfx'), path.join(__dirname, '..', 'assets', 'sfx2')];
const REC = {};
function rec(name) {
  if (REC[name]) return REC[name];
  const dir = DIRS.find((d) => require('fs').existsSync(path.join(d, name)));
  const r = spawnSync('ffmpeg', ['-v', 'error', '-i', path.join(dir, name), '-ac', '2', '-ar', String(SR), '-f', 'f32le', '-'], { maxBuffer: 1 << 30 });
  const x = new Float32Array(r.stdout.buffer, r.stdout.byteOffset, r.stdout.length >> 2);
  const L = new Float32Array(x.length / 2), Rr = new Float32Array(x.length / 2);
  for (let i = 0; i < L.length; i++) { L[i] = x[2 * i]; Rr[i] = x[2 * i + 1]; }
  return (REC[name] = { L, R: Rr, n: L.length });
}
const ss = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;

// play [a,b) seconds of a recording at t0. o: {fi, fo, pan, rev, cut (lowpass), hp, rate, env(t), bus, width}
function play(name, a, b, t0, gain = 1, o = {}) {
  const r = rec(name), i0 = S0(a), i1 = Math.min(r.n, S0(b)), s0 = S0(t0), fi = Math.max(1, (o.fi ?? .01) * SR), fo = Math.max(1, (o.fo ?? .05) * SR), bus = BUS[o.bus ?? 'sfx'];
  const lp = o.cut ? [new SVF(o.cut, .7), new SVF(o.cut, .7)] : null, hp = o.hp ? [new SVF(o.hp, .7), new SVF(o.hp, .7)] : null, rate = o.rate ?? 1;
  const pl = o.pan !== undefined ? Math.cos((o.pan + 1) * Math.PI / 4) * 1.414 : 1, pr = o.pan !== undefined ? Math.sin((o.pan + 1) * Math.PI / 4) * 1.414 : 1, wd = o.width ?? 1;
  const n = Math.floor((i1 - i0) / rate), rv = o.rev ?? .06;
  for (let k = 0; k < n; k++) {
    const i = s0 + k; if (i < 0 || i >= N) continue;
    const src = i0 + k * rate, j = Math.floor(src), fr = src - j; if (j + 1 >= r.n) break;
    let l = r.L[j] * (1 - fr) + r.L[j + 1] * fr, rr = r.R[j] * (1 - fr) + r.R[j + 1] * fr;
    if (wd !== 1) { const m = (l + rr) / 2, sd = (l - rr) / 2 * wd; l = m + sd; rr = m - sd; }
    const e = Math.min(1, k / fi, (n - k) / fo) * gain * (o.env ? o.env(i / SR) : 1);
    if (lp) { l = lp[0].tick(l); rr = lp[1].tick(rr); }
    if (hp) { hp[0].tick(l); hp[1].tick(rr); l = hp[0].hp; rr = hp[1].hp; }
    bus.L[i] += l * e * pl; bus.R[i] += rr * e * pr;
    HALL.L[i] += l * e * pl * rv; HALL.R[i] += rr * e * pr * rv;
  }
}

// underwater-ness of the camera (0 above, 1 below) through the film, for muffling the beds
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
// a long ambience bed (looped) with gain automation g(t); the lowpass follows underAt
function bed(name, from, t0, t1, g, o = {}) {
  const r = rec(name), s0 = S0(t0), s1 = Math.min(N, S0(t1)), lpL = new SVF(14000, .7), lpR = new SVF(14000, .7), bus = BUS[o.bus ?? 'amb'], f0 = S0(from), xf = S0(o.xfade ?? 1.5);
  for (let i = s0; i < s1; i++) {
    const k = i - s0, t = i / SR;
    if ((i & 63) === 0) { const u = underAt(t) * (o.muffle ?? 1); const fc = 14000 * Math.pow((o.floor ?? 420) / 14000, u); lpL.set(fc, .7); lpR.set(fc, .7); }
    const gg = g(t) * Math.min(1, k / (SR * (o.fi ?? .8)), (s1 - i) / (SR * (o.fo ?? .8)));
    const P = Math.max(1, r.n - f0 - xf), q = k % P, j = f0 + q;
    let l = r.L[j], rr = r.R[j];
    if (k >= P && q < xf) { const u = q / xf, ja = f0 + P + q; l = r.L[ja] * (1 - u) + l * u; rr = r.R[ja] * (1 - u) + rr * u; }
    if (gg <= 0) { lpL.tick(0); lpR.tick(0); continue; }
    bus.L[i] += lpL.tick(l) * gg; bus.R[i] += lpR.tick(rr) * gg;
  }
}

// ---------------------------------------------------------------- named recordings + clean slices
const F = {
  ONE: '0819-one-frog.mp3', CHORUS1: '0997-frogs-1.mp3', CHORUS2: '0998-frogs-2.mp3', FIELD: '0691-pond-in-a-field.mp3', RAIN: '1290-rain-on-puddle.mp3',
  STORM: '0124-rain-and-thunder-1.mp3', STORM3: '2717-rain-and-thunder-3.mp3', NIGHT: '0555-forest-at-night-after-rain.mp3',
  COUNTRY: '0097-countryside.mp3', FLIES: '0101-flies.mp3', BUBBLES: '0150-water-bubbles.mp3', SPARK: '0230-sparkling.mp3', FLY: '0759-fly.mp3', BEE: '1000-bumblebee.mp3',
  CRICKET: '1020-cricket.mp3', DROPS: '1384-drops-1.mp3', DROPS2: '1385-drops-2.mp3', DROPS4: '1387-drops-4.mp3', ROBIN: '1667-robin.mp3', DAWN: '1906-birds-waking.mp3',
  BLACKBIRD: '3503-blackbird.mp3', AIRLOCK: '3560-airlock-1.mp3',
  SPLB: ['1519-splash-big-1.mp3', '1520-splash-big-2.mp3', '1521-splash-big-3.mp3'],
  SPLS: ['1529-splash-small-1.mp3', '1530-splash-small-2.mp3', '1531-splash-small-3.mp3', '1532-splash-small-4.mp3', '1533-splash-small-5.mp3', '1534-splash-small-6.mp3'],
};
const CROAKS = [2.71, 5.68, 7.28, 9.44, 13.53, 14.23];
function croak(t0, k = 0, gain = 1, o = {}) { const a = CROAKS[k % CROAKS.length]; play(F.ONE, a, a + .42, t0 - .06, gain * 2, { fo: .08, rev: .14, ...o }); }
const DROP_AT = [.16, 1.59, 3.02, 5.88, 7.31, 8.75, 10.19, 11.63, 14.52, 15.97, 18.87];
function drop(t0, k = 0, gain = 1, o = {}) { const a = DROP_AT[k % DROP_AT.length]; play(F.DROPS, a - .01, a + .5, t0, gain, { fo: .15, rev: .2, ...o }); }
const BUB_AT = [5.46, 5.87, 11.71, 12.45, 15.73];
function blub(t0, k = 0, gain = 1, o = {}) { const a = BUB_AT[k % BUB_AT.length]; play(F.BUBBLES, a - .02, a + .45, t0, gain, { fo: .12, rev: .12, ...o }); }
function splashS(t0, k = 0, gain = 1, o = {}) { const f = F.SPLS[k % 6]; play(f, 0, 1.2, t0 - .04, gain, { fo: .3, rev: .1, ...o }); }
function splashB(t0, k = 0, gain = 1, o = {}) { const f = F.SPLB[k % 3]; play(f, .05, k % 3 === 1 ? 2.6 : 2, t0 - .1, gain, { fo: .5, rev: .12, ...o }); }

// ---------------------------------------------------------------- synthesized one-shots
function bubble(t0, r = 2, vel = 1, o = {}) {
  const f0 = 3260 / r, tau = .012 * r + .01, s0 = S0(t0), len = Math.ceil(tau * 6 * SR), put = out(o.pan ?? R(-.5, .5), .06 * vel, o.rev ?? .25, 'sfx');
  let ph = 0;
  for (let i = 0; i < len; i++) { const t = i / SR; ph += TAU * f0 * (1 + .9 * t / tau * .35) / SR; put(s0 + i, Math.sin(ph) * Math.exp(-t / tau) * Math.min(1, t / .0015)); }
}
function bubbles(t0, dur, rate, rMin = 1, rMax = 4, vel = 1, o = {}) { let t = t0; while (t < t0 + dur) { bubble(t, R(rMin, rMax), vel * R(.4, 1), o); t += -Math.log(1 - rnd()) / rate; } }
function whoosh(t0, dur, vel = 1, o = {}) {
  const s0 = S0(t0), len = Math.round(dur * SR), put = out(0, .14 * vel, o.rev ?? .3, 'sfx'), bp = new SVF(500, 1.6), bp2 = new SVF(500, 1.6), sweep = o.sweep ?? 0;
  for (let i = 0; i < len; i++) {
    const u = i / len; if ((i & 31) === 0) { const fc = (o.f0 ?? 300) * Math.pow((o.f1 ?? 2500) / (o.f0 ?? 300), Math.sin(Math.PI * u * .5)); bp.set(fc, 1.6); bp2.set(fc * 1.07, 1.6); }
    const e = Math.pow(Math.sin(Math.PI * Math.pow(u, o.skew ?? 1)), 2), p = clamp(.5 + sweep * (u - .5), 0, 1);
    put(s0 + i, bp.tick(white()) * e * (1 - p) * 1.4, bp2.tick(white()) * e * p * 1.4);
  }
}
function tongue(t0, vel = 1) {
  const s0 = S0(t0), put = out(.2, .18 * vel, .12, 'sfx'), bp = new SVF(1000, 3);
  for (let i = 0; i < SR * .14; i++) { const u = i / (SR * .14); if ((i & 15) === 0) bp.set(700 + 4500 * Math.sin(Math.PI * u), 3); put(s0 + i, bp.tick(white()) * Math.sin(Math.PI * u) * 1.6); }
  // the wet "thwack" on contact
  const s1 = S0(t0 + .1), p2 = out(.25, .22 * vel, .1, 'sfx'), lp = new SVF(900, 1.2);
  for (let i = 0; i < SR * .06; i++) p2(s1 + i, lp.tick(white()) * Math.exp(-i / (SR * .012)) * 2);
}
function gulp(t0, vel = 1) { const s0 = S0(t0), put = out(0, .26 * vel, .1, 'sfx'); let ph = 0; for (let i = 0; i < SR * .18; i++) { const t = i / SR; ph += TAU * (170 - 260 * t) / SR; put(s0 + i, Math.sin(ph) * Math.sin(Math.PI * t / .18)); } }
function snap(t0, vel = 1, o = {}) {
  const s0 = S0(t0), put = out(o.pan ?? .25, .3 * vel, .18, 'sfx'), hp = new SVF(2500, .8);
  for (let i = 0; i < SR * .05; i++) { hp.tick(white()); put(s0 + i, hp.hp * Math.exp(-i / (SR * .006)) * 2); }
}
// singing lake ice: dispersive downward chirps + crackle
function iceCrack(t0, vel = 1) {
  for (let k = 0; k < 6; k++) {
    const s0 = S0(t0 + k * R(.03, .14)), put = out(R(-.7, .7), .09 * vel, .5, 'sfx');
    let ph = 0; const f0 = R(4000, 7500), f1 = R(250, 650);
    for (let i = 0; i < SR * .6; i++) { const u = i / (SR * .6); ph += TAU * (f1 + (f0 - f1) * Math.exp(-u * 6)) / SR; put(s0 + i, Math.sin(ph) * Math.exp(-u * 5)); }
  }
  for (let k = 0; k < 40; k++) snap(t0 + R(0, .7), vel * R(.1, .45), { pan: R(-.8, .8) });
}
function creak(t0, vel = 1) { const s0 = S0(t0), put = out(R(-.5, .5), .045 * vel, .5, 'sfx'), bp = new SVF(260, 6); for (let i = 0; i < SR * .7; i++) { const t = i / SR, ph = (t * (30 + 20 * Math.sin(t * 3))) % 1; put(s0 + i, bp.tick(Math.exp(-ph * 20) * white()) * 4 * Math.sin(Math.PI * t / .7)); } }
function breath(t0, dur, vel = 1) { const s0 = S0(t0), put = out(0, .07 * vel, .3, 'sfx'), bp = new SVF(700, 1); for (let i = 0; i < dur * SR; i++) { const u = i / (dur * SR); if ((i & 31) === 0) bp.set(500 + 1500 * u, 1); put(s0 + i, bp.tick(white()) * Math.sin(Math.PI * u)); } }
// soft low "thump" for heartbeats and impacts (felt more than heard)
function thump(t0, vel = 1, o = {}) {
  const s0 = S0(t0), put = out(0, .4 * vel, o.rev ?? .15, o.bus ?? 'sfx');
  let ph = 0;
  for (let i = 0; i < SR * .5; i++) { const t = i / SR; ph += TAU * (o.f ?? 50) * (1 + .6 * Math.exp(-t / .03)) / SR; put(s0 + i, Math.sin(ph) * Math.exp(-t / (o.dec ?? .12)) * Math.min(1, t / .003)); }
}
function heartbeat(t0, vel = 1) { thump(t0, .6 * vel, { f: 54, dec: .1 }); thump(t0 + .17, .42 * vel, { f: 47, dec: .12 }); }
// a high glassy shimmer (bowed-glass partials) for magic moments
function glassTone(m, t0, dur, vel = 1, o = {}) {
  const f = 440 * Math.pow(2, (m - 69) / 12), len = Math.ceil((dur + 1.2) * SR), s0 = S0(t0), put = out(o.pan ?? R(-.4, .4), .045 * vel, .6, 'mus');
  let p1 = rnd(), p2 = rnd();
  for (let i = 0; i < len; i++) {
    const t = i / SR, e = ss(0, o.atk ?? .5, t) * (t > dur ? Math.exp(-(t - dur) / .45) : 1);
    p1 += f * (1 + .0018 * Math.sin(TAU * 4.6 * t)) / SR; p2 += f * 2.004 / SR;
    put(s0 + i, (Math.sin(TAU * p1) + .22 * Math.sin(TAU * p2)) * e);
  }
}

module.exports = { rec, play, bed, underAt, F, croak, drop, blub, splashS, splashB, bubble, bubbles, whoosh, tongue, gulp, snap, iceCrack, creak, breath, thump, heartbeat, glassTone, CROAKS };
