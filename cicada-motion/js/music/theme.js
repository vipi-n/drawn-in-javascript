// Shared musical material for the CICADA score (all original):
//  - MAIN THEME "Seventeen" (D major, 8 bars): a falling 5-3-2-1 opening that lifts to the sixth, sequenced a step
//    higher, then a lydian climax on D and a folk-like 3-2-1-2-1 close. Harmonised D | Gmaj7 | Em7 | A7 | G | Em7 (or
//    C, bVII, in the grand statements) | D/A A7sus | D.
//  - its HEROIC MINOR form (D minor, bars 1-4) for the emergence: A F E D | E F Bb | Bb G F E | F G C# over Dm Bb Gm A7.
//  - the EGG cell: A D E F# A E, a 6-note figure that runs in 8ths against the 4/4 bar (6 against 8 = clockwork).
//  - the EARTH motif: the theme head inverted and in minor (D E F A), the piano's line in the dark.
const O = require('./orch');
const X = require('./sfx');
const { B, BEAT, BAR, PC, voice, bassOf, R, rnd } = O;

// [beat, midi, durBeats, vel]
const THEME = [
  [0, 69, 1.5, .95], [1.5, 66, .5, .72], [2, 64, 1, .8], [3, 62, 1, .8],          // A . F# E D
  [4, 64, 1, .8], [5, 66, 1, .86], [6, 71, 2, 1],                                // E F# B --
  [8, 71, 1.5, .92], [9.5, 67, .5, .74], [10, 66, 1, .82], [11, 64, 1, .8],      // B . G F# E
  [12, 66, 1, .82], [13, 67, 1, .88], [14, 73, 2, 1],                            // F# G C# --
  [16, 74, 2, 1], [18, 73, .5, .8], [18.5, 71, .5, .8], [19, 69, 1, .86],        // D -- C# B A
  [20, 67, 1.5, .88], [21.5, 66, .5, .74], [22, 64, 2, .85],                     // G . F# E --
  [24, 66, 1.5, .86], [25.5, 64, .5, .74], [26, 62, 1, .8], [27, 64, 1, .8],     // F# . E D E
  [28, 62, 4, .9],                                                               // D ----
];
const THEME_H = [[0, 'D'], [4, 'Gmaj7'], [8, 'Em7'], [12, 'A7'], [16, 'Gmaj7'], [20, 'Em7'], [24, 'D/A'], [26, 'A7sus'], [28, 'D']];
const THEME_HG = [[0, 'D'], [4, 'Gmaj7'], [8, 'Em7'], [12, 'A7'], [16, 'Gmaj9'], [20, 'Cmaj7'], [24, 'D/A'], [26, 'A7sus'], [28, 'D']]; // grand: bVII
// heroic minor head (emergence)
const THEME_M = [
  [0, 69, 1.5, 1], [1.5, 65, .5, .8], [2, 64, 1, .85], [3, 62, 1, .85],
  [4, 64, 1, .85], [5, 65, 1, .9], [6, 70, 2, 1],
  [8, 70, 1.5, .95], [9.5, 67, .5, .8], [10, 65, 1, .85], [11, 64, 1, .85],
  [12, 65, 1, .88], [13, 67, 1, .92], [14, 73, 2, 1],
];
const THEME_MH = [[0, 'Dm'], [4, 'Bb'], [8, 'Gm'], [12, 'A7']];
// excerpt theme bars [b0, b1) re-based to beat 0
const bars = (P, b0, b1) => P.filter((n) => n[0] >= b0 * 4 && n[0] < b1 * 4).map(([b, ...r]) => [b - b0 * 4, ...r]);
const EGG = [69, 74, 76, 78, 81, 76];

// melody on an instrument: plucked/struck keys play notes, sustained keys play a legato line.
// o: {tr, sc (time scale), k (velocity), gain, until, oct, atk, rel, dyn, hp, lp, maxD, pan}
const PLUCK = new Set(['harp', 'piano', 'glock', 'marimba', 'xylo', 'vlnPizz', 'vlaPizz', 'vcPizz', 'cbPizz', 'fluteStac', 'clarStac', 'bsnStac', 'vlnSpic', 'vlaSpic', 'vcSpic']);
function sing(key, P, t0, o = {}) {
  const L = O.phrase(P, t0, (o.tr ?? 0) + (o.oct ?? 0) * 12, o.k ?? .7, o.sc ?? 1).filter(([t]) => t < (o.until ?? 1e9));
  if (PLUCK.has(key)) L.forEach(([t, m, d, v]) => O.play(key, m, t, Math.min(d, o.maxD ?? 2.5), v, { rel: o.rel ?? .5, gain: o.gain, pan: o.pan, jit: .005, lp: o.lp }));
  else if (key === 'horn' || key === 'hornMute') O.hornLine(L, { key, gain: o.gain, atk: o.atk ?? .08, rel: o.rel, dyn: o.dyn, solo: o.solo, vel: 1 });
  else O.line(key, L, { vel: 1, gain: o.gain, atk: o.atk, rel: o.rel, dyn: o.dyn, hp: o.hp, lp: o.lp, pan: o.pan });
  return L;
}

// voice-led string progression: list of [t, chord, dur]; o: {lo, hi, n, vel (num | fn(t)), atk, rel, dyn, bass, bassLo,
// bassK, cb (add contrabass an octave down), hp, lp, gain, over}
function prog(list, o = {}) {
  let prev = o.prev ?? null;
  for (const [t, c, d] of list) {
    const v = voice(c, o.lo ?? 57, o.hi ?? 79, o.n ?? 4, prev); prev = v;
    const vv = typeof o.vel === 'function' ? o.vel(t) : (o.vel ?? .4);
    O.strings(v, t, d + (o.over ?? .2), vv, { atk: o.atk ?? .5, rel: o.rel ?? .9, dyn: o.dyn, gain: o.gain, hp: o.hp, lp: o.lp });
    if (o.bass !== false) {
      const b = bassOf(c, o.bassLo ?? 38);
      O.play(b < 40 ? 'cbSus' : 'vcSus', b, t, d + (o.over ?? .2), vv * (o.bassK ?? .9), { atk: o.atk ?? .5, rel: o.rel ?? .9, gain: o.gain, lp: o.lp });
      if (o.cb && b >= 40) O.play('cbSus', b - 12, t, d + (o.over ?? .2), vv * .75, { atk: o.atk ?? .5, rel: o.rel ?? .9, gain: o.gain, lp: o.lp });
    }
  }
  return prev;
}
// chord at a beat position from a [beat, chord] list
const chordAt = (H, beat) => { let c = H[0][1]; for (const [b, ch] of H) if (beat >= b - 1e-6) c = ch; return c; };
// harmony list in beats -> absolute [t, chord, dur] from t0 (sc = time scale), until beat `end`
const harm = (H, t0, end, sc = 1) => H.filter(([b]) => b < end).map(([b, c], i, a) => [t0 + b * BEAT * sc, c, ((a[i + 1]?.[0] ?? end) - b) * BEAT * sc]);

// broken-chord figure in even steps: chord tones in [lo, hi] played up (and optionally back down)
function broken(key, chord, t0, dur, step, vel = .4, o = {}) {
  const v = voice(chord, o.lo ?? 50, o.hi ?? 74, o.n ?? 4), seq = o.pattern ? o.pattern.map((i) => v[i % v.length] + 12 * Math.floor(i / v.length)) : [...v, ...v.slice(1, -1).reverse()];
  const n = Math.round(dur / step);
  for (let s = 0; s < n; s++) {
    const m = seq[s % seq.length], t = t0 + s * step, acc = s % (o.acc ?? 4) === 0 ? 1 : .8;
    if (key === 'harp') O.harp(m, t, vel * acc, { dur: o.dur ?? 1.6, pan: o.pan, lp: o.lp });
    else if (key === 'piano') O.play('piano', m, t, o.dur ?? 1.2, vel * acc, { rel: o.rel ?? .6, jit: .006, lp: o.lp });
    else O.mallet(key, m, t, vel * acc, { dur: o.dur ?? .6, rel: o.rel ?? .4 });
  }
}
// random sparkle of high notes from a pitch set in [t0, t0+dur)
function sparkle(key, notes, t0, dur, n, vel = .3, o = {}) {
  for (let i = 0; i < n; i++) { const t = t0 + R(0, dur); O.mallet(key, notes[Math.floor(rnd() * notes.length)], t, vel * R(.6, 1), { dur: o.dur ?? 2, rel: o.rel ?? 1, pan: R(-.7, .7) }); }
}
// diatonic transposition inside a scale (O.SCALE key): dia(74, -2, 'Dmh') = a third below D5 in D harmonic minor
const dia = (m, steps, sc = 'D') => { const S = O.SCALE[sc]; let k = m, n = Math.abs(steps); const d = Math.sign(steps); if (!S.includes(((k % 12) + 12) % 12)) k += d; while (n > 0) { k += d; if (S.includes(((k % 12) + 12) % 12)) n--; } return k; };
const ss = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
// a dip in a gain curve: 1 outside, (1 - depth) inside [a, b], smooth edges
const dip = (t, a, b, depth, ea = .15, eb = .6) => 1 - depth * ss(a - ea, a, t) * (1 - ss(b, b + eb, t));

module.exports = { O, X, B, BEAT, BAR, THEME, THEME_H, THEME_HG, THEME_M, THEME_MH, EGG, bars, sing, prog, chordAt, harm, broken, sparkle, ss, dip, dia };
