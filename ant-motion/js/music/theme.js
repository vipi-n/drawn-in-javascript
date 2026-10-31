// Shared musical material for the ANT score (all original):
//  - MAIN THEME "Colony" (E minor, 8 bars): a climbing 1-2-3-5 head that falls back stepwise, sequenced up to the
//    seventh, reaching to the high E in bar 5, closing 5-2-1. Harmonised Em | D | Em | C | Am | G/B | C D | Em;
//    the GRAND form ends in G major (bar 8: B A G over G), the cycle opening into hope.
//  - the BROOD cell: E B G B A G — a rocking 6-note figure in 8ths (the nursery's lullaby / clockwork).
//  - the DIG motif: E E G E D E (low, rhythmic, earthy) for the founding queen.
const O = require('./orch');
const X = require('./sfx');
const { B, BEAT, BAR, PC, voice, bassOf, R, rnd } = O;

// [beat, midi, durBeats, vel]
const THEME = [
  [0, 64, 1, .86], [1, 66, .5, .74], [1.5, 67, .5, .8], [2, 71, 2, 1],                 // E F#G B --
  [4, 69, 1, .86], [5, 67, .5, .76], [5.5, 66, .5, .76], [6, 64, 1, .8], [7, 62, 1, .78], // A G F# E D
  [8, 64, 1, .86], [9, 66, .5, .76], [9.5, 67, .5, .8], [10, 71, 1, .9], [11, 74, 1, .94], // E F#G B D
  [12, 72, 2, 1], [14, 71, 2, .88],                                                    // C -- B --
  [16, 69, 1, .88], [17, 71, .5, .8], [17.5, 72, .5, .84], [18, 76, 2, 1],             // A B C E --
  [20, 74, 1.5, .92], [21.5, 72, .5, .78], [22, 71, 2, .86],                           // D . C B --
  [24, 69, 1, .84], [25, 67, .5, .74], [25.5, 66, .5, .74], [26, 67, 1, .8], [27, 69, 1, .84], // A G F# G A
  [28, 71, 1, .9], [29, 66, 1, .8], [30, 64, 2, .86],                                  // B F# E --
];
const THEME_H = [[0, 'Em'], [4, 'D'], [8, 'Em'], [12, 'Cmaj7'], [16, 'Am'], [20, 'G/B'], [24, 'C'], [26, 'D'], [28, 'Em']];
// grand ending: bar 8 resolves to G major
const GRAND_END = [[28, 71, 1, .95], [29, 69, 1, .9], [30, 67, 2, 1]];
const THEME_G = THEME.filter((n) => n[0] < 28).concat(GRAND_END);
const THEME_HG = [[0, 'Em'], [4, 'D'], [8, 'Em'], [12, 'Cmaj7'], [16, 'Am'], [20, 'G/B'], [24, 'C'], [26, 'D'], [28, 'G']];
const bars = (P, b0, b1) => P.filter((n) => n[0] >= b0 * 4 && n[0] < b1 * 4).map(([b, ...r]) => [b - b0 * 4, ...r]);
const BROOD = [76, 71, 67, 71, 69, 67];
const DIG = [40, 40, 43, 40, 38, 40];

const PLUCK = new Set(['harp', 'piano', 'glock', 'marimba', 'xylo', 'vlnPizz', 'vlaPizz', 'vcPizz', 'cbPizz', 'fluteStac', 'clarStac', 'bsnStac', 'vlnSpic', 'vlaSpic', 'vcSpic']);
function sing(key, P, t0, o = {}) {
  const L = O.phrase(P, t0, (o.tr ?? 0) + (o.oct ?? 0) * 12, o.k ?? .7, o.sc ?? 1).filter(([t]) => t < (o.until ?? 1e9));
  if (PLUCK.has(key)) L.forEach(([t, m, d, v]) => O.play(key, m, t, Math.min(d, o.maxD ?? 2.5), v, { rel: o.rel ?? .5, gain: o.gain, pan: o.pan, jit: .005, lp: o.lp }));
  else if (key === 'horn' || key === 'hornMute') O.hornLine(L, { key, gain: o.gain, atk: o.atk ?? .08, rel: o.rel, dyn: o.dyn, solo: o.solo, vel: 1 });
  else O.line(key, L, { vel: 1, gain: o.gain, atk: o.atk, rel: o.rel, dyn: o.dyn, hp: o.hp, lp: o.lp, pan: o.pan });
  return L;
}
// voice-led string progression: list of [t, chord, dur]
function prog(list, o = {}) {
  let prev = o.prev ?? null;
  for (const [t, c, d] of list) {
    const v = voice(c, o.lo ?? 57, o.hi ?? 79, o.n ?? 4, prev); prev = v;
    const vv = typeof o.vel === 'function' ? o.vel(t) : (o.vel ?? .4);
    if (o.trem) O.trem(v, t, d + (o.over ?? .2), vv, { atk: o.atk ?? .5, rel: o.rel ?? .9, dyn: o.dyn, gain: o.gain });
    else O.strings(v, t, d + (o.over ?? .2), vv, { atk: o.atk ?? .5, rel: o.rel ?? .9, dyn: o.dyn, gain: o.gain, hp: o.hp, lp: o.lp });
    if (o.bass !== false) {
      const b = bassOf(c, o.bassLo ?? 38);
      O.play(b < 40 ? 'cbSus' : 'vcSus', b, t, d + (o.over ?? .2), vv * (o.bassK ?? .9), { atk: o.atk ?? .5, rel: o.rel ?? .9, gain: o.gain, lp: o.lp });
      if (o.cb && b >= 40) O.play('cbSus', b - 12, t, d + (o.over ?? .2), vv * .75, { atk: o.atk ?? .5, rel: o.rel ?? .9, gain: o.gain, lp: o.lp });
    }
  }
  return prev;
}
const chordAt = (H, beat) => { let c = H[0][1]; for (const [b, ch] of H) if (beat >= b - 1e-6) c = ch; return c; };
const harm = (H, t0, end, sc = 1, from = 0) => H.filter(([b], i, a) => b < end && (a[i + 1]?.[0] ?? end) > from).map(([b, c], i, a) => { const s = Math.max(b, from), e = Math.min(a[i + 1]?.[0] ?? end, end); return [t0 + (s - from) * BEAT * sc, c, (e - s) * BEAT * sc]; });

function broken(key, chord, t0, dur, step, vel = .4, o = {}) {
  const v = voice(chord, o.lo ?? 50, o.hi ?? 74, o.n ?? 4), seq = o.pattern ? o.pattern.map((i) => v[i % v.length] + 12 * Math.floor(i / v.length)) : [...v, ...v.slice(1, -1).reverse()];
  const n = Math.round(dur / step);
  for (let s = 0; s < n; s++) {
    const m = seq[s % seq.length], t = t0 + s * step, acc = s % (o.acc ?? 4) === 0 ? 1 : .8;
    if (key === 'harp') O.harp(m, t, vel * acc, { dur: o.dur ?? 1.6, pan: o.pan, lp: o.lp });
    else if (key === 'piano') O.play('piano', m, t, o.dur ?? 1.2, vel * acc, { rel: o.rel ?? .6, jit: .006, lp: o.lp });
    else O.mallet(key, m, t, vel * acc, { dur: o.dur ?? .6, rel: o.rel ?? .4, pan: o.pan });
  }
}
function sparkle(key, notes, t0, dur, n, vel = .3, o = {}) {
  for (let i = 0; i < n; i++) { const t = t0 + R(0, dur); O.mallet(key, notes[Math.floor(rnd() * notes.length)], t, vel * R(.6, 1), { dur: o.dur ?? 2, rel: o.rel ?? 1, pan: R(-.7, .7) }); }
}
const ss = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const dip = (t, a, b, depth, ea = .15, eb = .6) => 1 - depth * ss(a - ea, a, t) * (1 - ss(b, b + eb, t));
// a simple percussion groove: pattern strings, one char per 16th ('x' accent, 'o' normal, '.' rest)
function groove(key, pat, t0, t1, vel = .5, o = {}) {
  const st = BEAT / 4;
  for (let t = t0, k = 0; t < t1 - 1e-3; t += st, k++) {
    const c = pat[k % pat.length]; if (c === '.') continue;
    O.hit(key, t + (o.swing && k % 2 ? st * o.swing : 0), vel * (c === 'x' ? 1 : .62) * (o.env ? o.env(t) : 1), { dur: o.dur ?? .5, rel: o.rel ?? .12, gain: o.gain, pan: o.pan });
  }
}

module.exports = { O, X, B, BEAT, BAR, THEME, THEME_H, THEME_G, THEME_HG, BROOD, DIG, bars, sing, prog, chordAt, harm, broken, sparkle, ss, dip, groove };
