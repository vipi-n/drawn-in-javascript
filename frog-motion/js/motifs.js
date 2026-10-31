// Shared musical material: the frog themes, the "pond band" groove, progression pads with voice leading, ostinati.
const O = require('./orch');
const X = require('./sfxlib');
const { B, BEAT, BAR, PC, voice, bassOf, R, rnd } = O;

// themes in beats: [beat, midi, durBeats, vel]
// A "hop": C D F | A G F C | D F Bb | A   (F major, two bars)
const THEME_A = [[0, 72, .75, .9], [.75, 74, .25, .75], [1, 77, 1, 1], [2, 81, .5, .95], [2.5, 79, .5, .8], [3, 77, .5, .8], [3.5, 72, .5, .75], [4, 74, .5, .85], [4.5, 77, .5, .85], [5, 82, 1, 1], [6, 81, 1.6, .95]];
const HARM_A = ['F', 'F', 'Bb', 'F'];                      // one chord per two beats
// B "answer": C Bb A G | E F G | A G F
const THEME_B = [[0, 84, 1, 1], [1, 82, .5, .85], [1.5, 81, .5, .85], [2, 79, 1, .9], [3, 76, .5, .8], [3.5, 77, .5, .8], [4, 79, 1, .9], [5, 81, .5, .85], [5.5, 79, .5, .8], [6, 77, 2, .95]];
const HARM_B = ['C', 'C7', 'Gm7', 'F'];
// lyrical "life" theme, four bars: A . G F | E . F G . | C . Bb A | G . . F G
const LYRIC = [[0, 81, 2, .9], [2, 79, 1, .8], [3, 77, 1, .8], [4, 76, 1.5, .85], [5.5, 77, .5, .75], [6, 79, 2, .9], [8, 84, 2, 1], [10, 82, 1, .85], [11, 81, 1, .85], [12, 79, 2.5, .9], [14.5, 77, .5, .75], [15, 79, 1, .85]];
const HARM_L = ['F', 'C/E', 'Bbmaj7', 'Csus'];

// sustained progression: one chord per `step` seconds, voice-led; bass on cb/vc
function pads(prog, t0, step, o = {}) {
  let prev = null;
  const lo = o.lo ?? 57, hi = o.hi ?? 81, n = o.n ?? 4, vel = o.vel ?? .5;
  prog.forEach((c, i) => {
    const v = voice(c, lo, hi, n, prev); prev = v;
    const t = t0 + i * step, d = step + (o.over ?? .25), vv = typeof vel === 'function' ? vel(i) : vel;
    O.strings(v, t, d, vv, { atk: o.atk ?? .45, rel: o.rel ?? .8, dyn: o.dyn, gain: o.gain });
    if (o.bass !== false) { const b = bassOf(c, o.bassLo ?? 36); O.play(b < 40 ? 'cbSus' : 'vcSus', b, t, d, vv * (o.bassK ?? .9), { atk: o.atk ?? .45, rel: o.rel ?? .8, gain: o.gain }); }
    if (o.cb) O.play('cbSus', bassOf(c, 28), t, d, vv * .7, { atk: o.atk ?? .45, rel: o.rel ?? .8, gain: o.gain });
  });
  return prev;
}

// the pond band: pizz bass walk, bassoon hops, marimba off-beat skank, log drums, congas, guiro "rib-bits", shaker
function band(bar0, chords, o = {}) {
  const k = o.k ?? 1;
  chords.forEach((c, j) => {
    const b = bar0 + j, r = bassOf(c, 36), ch = PC[c];
    if (!o.noBass) {
      O.pizz(r, B(b, 0), .85 * k); O.pizz(r + 7, B(b, 1.5), .55 * k); O.pizz(r + 12, B(b, 2), .7 * k); O.pizz(r + 7, B(b, 3), .5 * k);
      const app = bassOf(chords[j + 1] ?? chords[0], 36); O.pizz(app + (app > r ? -1 : 2), B(b, 3.5), .45 * k);
    }
    if (!o.noBsn) { O.play('bsnStac', r - 12 < 34 ? r : r - 12, B(b, 0), .2, .6 * k, { rel: .08 }); O.play('bsnStac', r, B(b, 2), .2, .5 * k, { rel: .08 }); }
    if (!o.noMar) {
      const v = voice(c, 65, 79, 3);
      for (const bt of [1.5, 3.5]) v.forEach((m) => O.mallet('marimba', m, B(b, bt), .42 * k, { dur: .3, rel: .12 }));
      if (o.marRun && j % 2 === 1) [0, 1, 2].forEach((q) => O.mallet('marimba', v[q] + 12, B(b, 3.75 + q * .083), .3 * k, { dur: .2, rel: .1 }));
    }
    if (!o.noDrums) {
      O.hit('logLo', B(b, 0), .55 * k); O.hit('logHi', B(b, 2.5), .45 * k); O.hit('logLo', B(b, 2.75), .3 * k);
      O.hit('conga', B(b, 1), .35 * k); O.hit('conga', B(b, 3), .4 * k); O.hit('quinto', B(b, 3.75), .25 * k);
    }
    if (!o.noGuiro) { O.hit('guiroHit', B(b, 1), .5 * k, { dur: .4 }); O.hit('guiroHit', B(b, 3), .45 * k, { dur: .4 }); }
    if (!o.noShaker) for (let s = 0; s < 8; s++) O.hit('shaker', B(b, s * .5), (s % 2 ? .55 : .35) * k * (o.shakerK ?? 1), { dur: .3, rel: .05 });
    if (o.clar) for (const bt of [.5, 2.5]) voice(c, 60, 72, 2).forEach((m) => O.play('clarStac', m, B(b, bt), .15, .35 * k, { rel: .06 }));
    if (o.ch) o.ch(b, c, ch);
  });
}
// repeating figure: pattern of chord-tone indices (or [idx, octave]) in `step` seconds
function ostinato(key, chords, t0, barDur, step, pattern, vel = .5, o = {}) {
  chords.forEach((c, j) => {
    const v = voice(c, o.lo ?? 65, o.hi ?? 84, o.n ?? 4), steps = Math.round(barDur / step);
    for (let s = 0; s < steps; s++) {
      const p = pattern[s % pattern.length]; if (p === null) continue;
      const [ix, oc] = Array.isArray(p) ? p : [p, 0];
      const m = v[ix % v.length] + 12 * oc, t = t0 + j * barDur + s * step, acc = s % (o.acc ?? 4) === 0 ? 1 : .78;
      if (key === 'harp') O.harp(m, t, vel * acc, { dur: 1.2 }); else if (key.endsWith('Spic')) O.spic(m, t, vel * acc, { key }); else if (key.endsWith('Pizz')) O.pizz(m, t, vel * acc, { key });
      else O.mallet(key, m, t, vel * acc, { dur: o.dur ?? .5, rel: o.rel ?? .3 });
    }
  });
}
// diatonic transposition inside F major (D minor shares the notes): dia(m, -2) = a third below
const SCL = []; for (let m = 20; m < 112; m++) if ([5, 7, 9, 10, 0, 2, 4].includes(m % 12)) SCL.push(m);
const dia = (m, s) => { const i = SCL.indexOf(m); return i < 0 ? m + Math.round(s * 1.75) : SCL[Math.max(0, Math.min(SCL.length - 1, i + s))]; };

// theme melody on an instrument with optional octave doubling on another
function sing(key, P, t0, o = {}) {
  const Q = o.dia ? P.map(([b, m, d, v]) => [b, dia(m, o.dia), d, v]) : P;
  const L = O.phrase(Q, t0, o.tr ?? 0, o.vel ?? 1, o.sc ?? 1).filter(([t]) => t < (o.until ?? 1e9));
  if (key.endsWith('Stac') || key === 'marimba' || key === 'xylo' || key === 'glock' || key === 'harp' || key === 'piano') L.forEach(([t, m, d, v]) => O.play(key, m, t, Math.min(d, o.maxD ?? 2), v * (o.k ?? .7), { rel: o.rel ?? .4, gain: o.gain }));
  else O.line(key, L, { vel: o.k ?? .7, gain: o.gain, atk: o.atk, rel: o.rel, dyn: o.dyn });
  return L;
}
// sparkle of high notes from a pitch set at random times in [t0, t0+dur)
function sparkle(key, notes, t0, dur, n, vel = .3, o = {}) {
  for (let i = 0; i < n; i++) { const t = t0 + R(0, dur); O.mallet(key, notes[Math.floor(rnd() * notes.length)], t, vel * R(.6, 1), { dur: o.dur ?? 2, rel: o.rel ?? 1, pan: R(-.7, .7) }); }
}

module.exports = { THEME_A, HARM_A, THEME_B, HARM_B, LYRIC, HARM_L, pads, band, ostinato, sing, sparkle, dia, O, X, B, BEAT, BAR };
