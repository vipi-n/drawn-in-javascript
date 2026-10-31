// Shared musical material for the score (all original except the public-domain folk tune Korobeiniki, 1861):
//  - MAIN THEME "Player One" (D major, 8 bars): a rising A-D-F# opening that falls back to E, sequenced a third
//    higher, then a gentle descent home. Harmonised Dmaj7 | A/C# | Bm7 | G | Em7 | D/F# | Gmaj7 | A7sus.
//  - its CADENCE ending (bar 8 -> 9): E . C# | D ----, used only at the very end.
//  - KOROBEINIKI, the Russian folk song Tetris made famous, quoted for two bars in B minor.
//  - CH: the film's whole chord track in beats, so every part (strings, chip arps, bass) agrees on the harmony.
const O = require('./orch');
const { B, BEAT, BAR, PC, voice, bassOf, R, rnd } = O;

// [beat, midi, durBeats, vel]
const THEME = [
  [0, 69, 1, .82], [1, 74, 1, .88], [2, 78, 1.5, .96], [3.5, 76, .5, .78],       // A D F# . E
  [4, 76, 2, .9], [6, 73, 1, .8], [7, 69, 1, .78],                               // E -- C# A
  [8, 74, 1, .84], [9, 78, 1, .9], [10, 81, 1.5, 1], [11.5, 78, .5, .8],         // D F# A . F#
  [12, 79, 1.5, .92], [13.5, 78, .5, .8], [14, 76, 2, .88],                      // G . F# E --
  [16, 71, 1, .8], [17, 76, 1, .86], [18, 79, 1.5, .95], [19.5, 78, .5, .8],     // B E G . F#
  [20, 78, 1.5, .9], [21.5, 76, .5, .78], [22, 74, 2, .86],                      // F# . E D --
  [24, 71, 1, .8], [25, 74, 1, .84], [26, 79, 1, .92], [27, 78, 1, .86],         // B D G F#
  [28, 76, 4, .9],                                                               // E ----
];
const THEME_H = [[0, 'Dmaj7'], [4, 'A/C#'], [8, 'Bm7'], [12, 'G'], [16, 'Em7'], [20, 'D/F#'], [24, 'Gmaj7'], [28, 'A7sus']];
// the last bar as a cadence: E . C# | D
const CADENCE = [[28, 76, 2, .85], [30, 73, 2, .8], [32, 74, 6, .85]];
// Korobeiniki (trad.), first two bars, in B minor
const KORO = [
  [0, 78, 1, .95], [1, 73, .5, .8], [1.5, 74, .5, .82], [2, 76, 1, .9], [3, 74, .5, .82], [3.5, 73, .5, .8],
  [4, 71, 1, .9], [5, 71, .5, .82], [5.5, 74, .5, .86],
];
// excerpt theme bars [b0, b1) re-based to beat 0
const bars = (P, b0, b1) => P.filter((n) => n[0] >= b0 * 4 && n[0] < b1 * 4).map(([b, ...r]) => [b - b0 * 4, ...r]);

// the film's chord track: [beat, chord] (bar * 4 + beat)
const T1 = THEME_H.map(([b, c]) => [b + 12, c]);                       // statement 1: bars 3-10
const CH = [
  [0, 'Dmaj9'], [8, 'Gmaj9'], [10, 'A7sus'],                            // intro
  ...T1,                                                                // tennis, spacewar, pong
  [44, 'D'], [48, 'G'], [50, 'A7sus'],                                  // atari
  [52, 'D'], [56, 'A/C#'], [60, 'Bm'], [64, 'G'], [66, 'A'],            // arcade (theme bars 1-4)
  [68, 'Bm'], [72, 'Gmaj7'], [74, 'F#'],                                // crash
  [76, 'Bm'], [78, 'F#7'], [80, 'Bm'], [82, 'D'], [84, 'G'], [86, 'A'],  // tetris, mario
  [88, 'Gmaj7'], [90, 'A7sus'],                                         // game boy
  [92, 'D'], [94, 'Bm'], [96, 'G'], [98, 'A'],                          // 16-bit
  [100, 'Dm'], [104, 'Bb'], [106, 'Dmaj9'], [110, 'Dmaj9'], [112, 'Gmaj9'], [114, 'A7sus'], // doom, ps1, n64
  ...THEME_H.map(([b, c]) => [b + 116, c]),                             // online + everyone: bars 29-36
  [148, 'Bm7'], [152, 'G'], [154, 'A'],                                 // arena
  [156, 'D'], [160, 'A/C#'], [164, 'Bm7'],                              // the climax (theme bars 1-3)
  [168, 'G'], [172, 'Em7'], [176, 'D/F#'], [180, 'Gmaj7'], [184, 'A7sus'], [186, 'A7'], [188, 'Dadd9'], // epilogue
];
const chordAt = (H, beat) => { let c = H[0][1]; for (const [b, ch] of H) if (beat >= b - 1e-6) c = ch; return c; };
const chord = (t) => chordAt(CH, t / BEAT + 1e-4);
// chord-track slice between two times -> [[t, chord, dur]]
function track(t0, t1) {
  const b0 = t0 / BEAT, b1 = t1 / BEAT, outL = [];
  CH.forEach(([b, c], i) => {
    const e = CH[i + 1]?.[0] ?? 1e9, a = Math.max(b, b0), z = Math.min(e, b1);
    if (z - a > 1e-6) outL.push([a * BEAT, c, (z - a) * BEAT]);
  });
  return outL;
}

// melody on an instrument: plucked/struck keys play notes, sustained keys play a legato line.
// o: {tr, sc (time scale), k (velocity), gain, until, oct, atk, rel, dyn, hp, lp, maxD, pan}
const PLUCK = new Set(['harp', 'piano', 'glock', 'marimba', 'xylo', 'vlnPizz', 'vlaPizz', 'vcPizz', 'cbPizz', 'fluteStac', 'clarStac', 'bsnStac', 'vlnSpic', 'vlaSpic', 'vcSpic']);
function sing(key, P, t0, o = {}) {
  const L = O.phrase(P, t0, (o.tr ?? 0) + (o.oct ?? 0) * 12, o.k ?? .7, o.sc ?? 1).filter(([t]) => t < (o.until ?? 1e9) && t >= (o.from ?? -1));
  if (PLUCK.has(key)) L.forEach(([t, m, d, v]) => O.play(key, m, t, Math.min(d, o.maxD ?? 2.5), v, { rel: o.rel ?? .5, gain: o.gain, pan: o.pan, jit: .005, lp: o.lp, rev: o.rev }));
  else if (key === 'horn' || key === 'hornMute') O.hornLine(L, { key, gain: o.gain, atk: o.atk ?? .08, rel: o.rel, dyn: o.dyn, solo: o.solo, vel: 1 });
  else O.line(key, L, { vel: 1, gain: o.gain, atk: o.atk, rel: o.rel, dyn: o.dyn, hp: o.hp, lp: o.lp, pan: o.pan });
  return L;
}
// voice-led string progression over [[t, chord, dur]]; o: {lo, hi, n, vel (num | fn(t)), atk, rel, dyn, bass, bassLo, bassK, cb, hp, lp, gain, over}
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
// broken-chord figure in even steps across [t0, t1) following the chord track
function broken(key, t0, t1, step, vel = .4, o = {}) {
  const n = Math.round((t1 - t0) / step);
  for (let s = 0; s < n; s++) {
    const t = t0 + s * step, c = o.chord ?? chord(t), v = voice(c, o.lo ?? 50, o.hi ?? 74, o.n ?? 4);
    const seq = o.pattern ? o.pattern.map((i) => v[i % v.length] + 12 * Math.floor(i / v.length)) : [...v, ...v.slice(1, -1).reverse()];
    const m = seq[s % seq.length], acc = s % (o.acc ?? 4) === 0 ? 1 : .8, vv = (typeof vel === 'function' ? vel(t) : vel) * acc;
    if (key === 'harp') O.harp(m, t, vv, { dur: o.dur ?? 1.6, pan: o.pan, lp: o.lp });
    else if (key === 'piano') O.play('piano', m, t, o.dur ?? 1.2, vv, { rel: o.rel ?? .6, jit: .006, lp: o.lp, gain: o.gain });
    else O.mallet(key, m, t, vv, { dur: o.dur ?? .6, rel: o.rel ?? .4, gain: o.gain });
  }
}
function sparkle(key, notes, t0, dur, n, vel = .3, o = {}) {
  for (let i = 0; i < n; i++) { const t = t0 + R(0, dur); O.mallet(key, notes[Math.floor(rnd() * notes.length)], t, vel * R(.6, 1), { dur: o.dur ?? 2, rel: o.rel ?? 1, pan: R(-.7, .7), gain: o.gain }); }
}
// diatonic transposition: dia(78, -2) = a third below F#5 in D major
const dia = (m, steps, sc = 'D') => { const S = O.SCALE[sc]; let k = m, n = Math.abs(steps); const d = Math.sign(steps); if (!S.includes(((k % 12) + 12) % 12)) k += d; while (n > 0) { k += d; if (S.includes(((k % 12) + 12) % 12)) n--; } return k; };
const ss = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

module.exports = { O, B, BEAT, BAR, THEME, THEME_H, CADENCE, KORO, CH, bars, chord, chordAt, track, sing, prog, broken, sparkle, dia, ss };
