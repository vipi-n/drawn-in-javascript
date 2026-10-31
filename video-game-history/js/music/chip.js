// 8-bit voices for the score, synthesized: band-limited pulse (polyBLEP, 12.5/25/50% duty), the NES-style 4-bit
// stepped triangle, LFSR noise (long + short "metallic" mode), plus the period sound effects built from them:
// CRT power-on/off, menu select, paddle blips, laser, explosion, cartridge clunk, coin, jump, waka, line-clear,
// the handheld "ding", block taps, pin clatter and a filtered-noise riser. Notes write to the 'chip' bus (sfx to
// 'sfx') with an optional send to the 'echo' bus (a ping-pong delay applied at mixdown).
const { SR, N, TAU, S0, clamp, R, white, out, SVF } = require('./mix');

const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);
const blep = (t, dt) => { if (t < dt) { t /= dt; return t + t - t * t - 1; } if (t > 1 - dt) { t = (t - 1) / dt; return t * t + t + t + 1; } return 0; };

// one oscillator note. o: {wave: pulse|tri|sine|saw, duty, atk, dec, sus, rel, vib, vibD, vibR, bend (semitones over
// the note), slide: [fromSemis, time], arp: [semis...], arpR (Hz), pan, gain, rev, lp, hp, bus, echo, jit, duty2 (sweep)}
function tone(t, midi, dur, vel = .6, o = {}) {
  t = Math.max(0, t + (o.jit ? R(-o.jit, o.jit) : 0));
  const wave = o.wave ?? 'pulse', atk = o.atk ?? .004, dec = o.dec ?? .12, sus = o.sus ?? .7, rel = o.rel ?? .06;
  const vib = o.vib ?? 0, vibD = o.vibD ?? .25, vibR = o.vibR ?? 5.6, bend = o.bend ?? 0, arp = o.arp, arpR = o.arpR ?? 30;
  const put = out(o.pan ?? 0, vel * (o.gain ?? 1) * .22, o.rev ?? .16, o.bus ?? 'chip');
  const echo = o.echo ? out(-(o.pan ?? 0), vel * (o.gain ?? 1) * .22 * o.echo, 0, 'echo') : null;
  const lp = o.lp ? new SVF(o.lp, .6) : null, hpF = o.hp ? new SVF(o.hp, .7) : null;
  const i0 = S0(t), n = S0(dur + rel), nd = S0(dur);
  let ph = R(0, 1), d0 = o.duty ?? .5;
  for (let j = 0; j < n; j++) {
    const i = i0 + j; if (i >= N) break;
    const tt = j / SR;
    let semi = midi + bend * Math.min(1, tt / Math.max(.001, dur));
    if (o.slide) semi += o.slide[0] * Math.max(0, 1 - tt / o.slide[1]);
    if (vib && tt > vibD) semi += vib * Math.sin(TAU * vibR * (tt - vibD)) * Math.min(1, (tt - vibD) / .25);
    if (arp) semi += arp[Math.floor(tt * arpR) % arp.length];
    const f = hz(semi), dt = f / SR;
    ph += dt; if (ph >= 1) ph -= 1;
    let v;
    if (wave === 'pulse') {
      const duty = o.duty2 ? d0 + (o.duty2 - d0) * Math.min(1, tt / dur) : d0;
      v = (ph < duty ? 1 : -1) + blep(ph, dt) - blep((ph - duty + 1) % 1, dt) - (2 * duty - 1);
      v *= .8;
    } else if (wave === 'tri') {
      const x = ph < .5 ? 4 * ph - 1 : 3 - 4 * ph;
      v = Math.round(x * 7.5) / 7.5;
    } else if (wave === 'saw') v = (2 * ph - 1) - blep(ph, dt);
    else v = Math.sin(TAU * ph);
    // envelope
    let e = tt < atk ? tt / atk : sus + (1 - sus) * Math.exp(-(tt - atk) / dec);
    if (j > nd) e *= Math.max(0, 1 - (j - nd) / S0(rel));
    v *= e;
    if (lp) v = lp.tick(v);
    if (hpF) { hpF.tick(v); v = hpF.hp; }
    put(i, v, v);
    if (echo) echo(i, v, v);
  }
}

// LFSR noise. o: {rate (clock Hz), rate1 (clock at end), short (93-step metallic mode), atk, dec, sus, rel, lp, hp, bp, pan, gain, rev, bus}
function noise(t, dur, vel = .5, o = {}) {
  const put = out(o.pan ?? 0, vel * (o.gain ?? 1) * .2, o.rev ?? .14, o.bus ?? 'chip');
  const atk = o.atk ?? .001, dec = o.dec ?? .06, sus = o.sus ?? 0, rel = o.rel ?? .03;
  const lp = o.lp ? new SVF(o.lp, .7) : null, hpF = o.hp ? new SVF(o.hp, .7) : null, bp = o.bp ? new SVF(o.bp[0], o.bp[1] ?? 2) : null;
  const i0 = S0(t), n = S0(dur + rel), nd = S0(dur);
  let reg = 1, acc = 0, v = 1;
  for (let j = 0; j < n; j++) {
    const i = i0 + j; if (i >= N) break;
    const tt = j / SR, u = Math.min(1, tt / dur);
    const rate = o.rate1 ? (o.rate ?? 12000) * Math.pow(o.rate1 / (o.rate ?? 12000), u) : (o.rate ?? 12000);
    acc += rate / SR;
    while (acc >= 1) { acc -= 1; const b = (reg ^ (reg >> (o.short ? 6 : 1))) & 1; reg = (reg >> 1) | (b << 14); v = reg & 1 ? 1 : -1; }
    let e = tt < atk ? tt / atk : sus + (1 - sus) * Math.exp(-(tt - atk) / dec);
    if (j > nd) e *= Math.max(0, 1 - (j - nd) / S0(rel));
    let x = v * e;
    if (o.sweep && bp) bp.set(o.bp[0] * Math.pow(o.sweep / o.bp[0], u), o.bp[1] ?? 2);
    if (lp) { if (o.lp1) lp.set(o.lp * Math.pow(o.lp1 / o.lp, u)); x = lp.tick(x); }
    if (hpF) { hpF.tick(x); x = hpF.hp; }
    if (bp) { bp.tick(x); x = bp.bp; }
    put(i, x, x);
  }
}

// ---------------------------------------------------------------- drum kit (chip)
const kick = (t, v = .8, o = {}) => { tone(t, 40, .12, v * 1.6, { wave: 'tri', slide: [26, .07], atk: .001, dec: .07, sus: 0, rel: .04, gain: o.gain, rev: .08 }); noise(t, .015, v * .5, { rate: 8000, lp: 2500, rev: .05, gain: o.gain }); };
const snare = (t, v = .7, o = {}) => { noise(t, .16, v, { rate: 14000, dec: .075, hp: 900, lp: 9000, rev: .2, gain: o.gain, pan: .05 }); tone(t, 55, .05, v * .7, { wave: 'tri', slide: [7, .04], dec: .04, sus: 0, gain: o.gain }); };
const hat = (t, v = .4, o = {}) => noise(t, .03, v, { rate: 30000, short: o.open ? 0 : 1, dec: o.open ? .09 : .02, hp: 6000, lp: 13000, rev: .1, pan: .25, gain: o.gain });

// ---------------------------------------------------------------- sound effects (sfx bus)
const SX = { bus: 'sfx' };
function powerOn(t) {
  tone(t, 31, .5, .9, { wave: 'sine', slide: [-5, .35], atk: .002, dec: .18, sus: 0, rel: .2, bus: 'sfx', rev: .2 });       // thump
  noise(t + .01, .35, .45, { rate: 22000, dec: .12, sus: .05, lp: 7000, lp1: 1200, hp: 300, bus: 'sfx', rev: .25 });        // static crackle
  tone(t + .05, 76, 1.4, .07, { wave: 'sine', slide: [-26, .7], atk: .1, dec: .6, sus: .3, rel: .8, bus: 'sfx', rev: .3 });  // rising whine
  for (let k = 0; k < 9; k++) noise(t + .02 + R(0, .5), .01, R(.2, .5), { rate: 18000, dec: .006, hp: 1500, bus: 'sfx', pan: R(-.4, .4) });
}
function hum(t0, t1, v = .05) { // CRT mains hum, fades in and out
  const put = out(0, v, .05, 'sfx'), i0 = S0(t0), n = S0(t1 - t0);
  for (let j = 0; j < n; j++) { const tt = j / SR, e = Math.min(1, tt / .4) * Math.min(1, (t1 - t0 - tt) / 1.2); const x = (Math.sin(TAU * 60 * tt) * .6 + Math.sin(TAU * 120 * tt) * .3 + Math.sin(TAU * 180 * tt) * .1) * e; put(i0 + j, x, x); }
}
const select = (t, v = .6) => { tone(t, 81, .06, v, { duty: .25, sus: .8, rel: .02, bus: 'sfx', echo: .3 }); tone(t + .07, 86, .16, v, { duty: .25, dec: .08, sus: .3, rel: .05, bus: 'sfx', echo: .3 }); };
const blip = (t, m, v = .5, o = {}) => tone(t, m, o.dur ?? .07, v, { duty: o.duty ?? .5, atk: .001, dec: .05, sus: .6, rel: .02, lp: o.lp ?? 6000, bus: 'sfx', pan: o.pan ?? 0, rev: .2, echo: o.echo });
function laser(t, v = .5, pan = 0) { tone(t, 96, .16, v, { duty: .25, slide: [0, 1], bend: -38, dec: .1, sus: .2, rel: .03, bus: 'sfx', pan, rev: .2 }); }
function boom(t, v = .7, pan = 0) { noise(t, .7, v, { rate: 9000, rate1: 500, dec: .3, sus: 0, rel: .1, lp: 5000, bus: 'sfx', pan, rev: .3 }); }
function clunk(t, v = .8) {
  tone(t, 38, .18, v * 1.3, { wave: 'sine', slide: [8, .05], atk: .001, dec: .08, sus: 0, rel: .05, bus: 'sfx', rev: .15 });
  noise(t, .05, v * .8, { rate: 16000, dec: .025, lp: 1800, bus: 'sfx', rev: .12 });
  noise(t + .085, .02, v * .28, { rate: 24000, dec: .008, hp: 2500, bus: 'sfx', rev: .1 });   // the latch
}
function coin(t, v = .55, pan = .2) { tone(t, 83, .075, v, { duty: .5, sus: .9, rel: .01, bus: 'sfx', pan, echo: .25 }); tone(t + .075, 88, .5, v, { duty: .5, dec: .2, sus: 0, rel: .1, bus: 'sfx', pan, echo: .25 }); }
const jump = (t, v = .45, pan = .2) => tone(t, 62, .2, v, { duty: .25, bend: 14, dec: .14, sus: .3, rel: .04, bus: 'sfx', pan });
function waka(t0, n, v = .4, step = .19) { for (let k = 0; k < n; k++) tone(t0 + k * step, k % 2 ? 72 : 60, step * .9, v, { wave: 'tri', bend: k % 2 ? -12 : 12, atk: .004, dec: .1, sus: .7, rel: .02, bus: 'sfx', pan: -.15 }); }
function powerDown(t, v = .7) {
  tone(t, 76, 1.5, v, { duty: .5, bend: -46, dec: .7, sus: .4, rel: .3, lp: 5000, bus: 'sfx', rev: .35 });
  tone(t, 64, 1.5, v * .6, { wave: 'tri', bend: -40, dec: .8, sus: .3, rel: .3, bus: 'sfx', rev: .35 });
  noise(t + .02, .45, .3, { rate: 16000, rate1: 900, dec: .3, lp: 6000, bus: 'sfx', rev: .3 });
}
function clearChime(t, notes, v = .4) { notes.forEach((m, k) => tone(t + k * .045, m, .09, v * (1 - k / notes.length * .4), { duty: .125, dec: .06, sus: .4, rel: .03, bus: 'sfx', echo: .35, pan: -.3 + .6 * k / notes.length })); }
function ding(t, m = 81, v = .6) { tone(t, m, .055, v * .8, { duty: .5, sus: .9, rel: .01, bus: 'sfx', echo: .3 }); tone(t + .06, m + 12, 1.1, v, { duty: .5, dec: .35, sus: 0, rel: .2, bus: 'sfx', echo: .3, rev: .3 }); }
function tock(t, v = .4, pan = 0) { noise(t, .04, v, { rate: 9000, dec: .018, lp: 1400, bus: 'sfx', pan, rev: .15 }); tone(t, 50 + Math.floor(R(0, 4)), .05, v * .9, { wave: 'sine', dec: .03, sus: 0, rel: .02, bus: 'sfx', pan, rev: .15 }); }
function pins(t, v = .6) {
  tone(t, 33, .3, v * 1.2, { wave: 'sine', slide: [5, .06], dec: .12, sus: 0, rel: .1, bus: 'sfx', rev: .2 });
  for (let k = 0; k < 14; k++) { const tt = t + .02 + Math.pow(R(0, 1), 1.6) * .7; noise(tt, .03, v * R(.3, .8) * (1 - (tt - t) / 1.1), { rate: R(9000, 20000), dec: .015, bp: [R(1800, 4200), 3], bus: 'sfx', pan: R(-.5, .5), rev: .25 }); }
}
function riser(t0, t1, v = .4, o = {}) { noise(t0, t1 - t0, v, { rate: 40000, atk: (t1 - t0) * .9, dec: 9, sus: 1, rel: .08, bp: [o.f0 ?? 400, 1.6], sweep: o.f1 ?? 7000, bus: o.bus ?? 'sfx', rev: .4 }); }
function whoosh(t, dur = .6, v = .35, pan = 0) { noise(t, dur, v, { rate: 40000, atk: dur * .55, dec: dur * .3, sus: 0, rel: .1, bp: [500, 1.2], sweep: 3500, bus: 'sfx', pan, rev: .3 }); }

module.exports = { hz, tone, noise, kick, snare, hat, powerOn, hum, select, blip, laser, boom, clunk, coin, jump, waka, powerDown, clearChime, ding, tock, pins, riser, whoosh };
