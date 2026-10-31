// Score, part 2 (bars 7-16): the first eggs in the sealed chamber (music box, wonder inside the egg, the sex choice),
// then the larva (playful nursery groove, feeding, moults, the X-ray, the caste fork).
const T = require('./theme');
const { O, X, B, BEAT, BAR, THEME, BROOD, bars, sing, prog, broken, sparkle, ss, groove } = T;
const { EV } = require('../cues');
const { R } = O;

function egg() {
  const T0 = B(7), T1 = B(11), SCAN = B(7) + 4.3, SPLIT = EV.sexSplit;
  // the sealed chamber: earth rumble, very quiet
  X.rumble(T0 - .3, B(16), (t) => .03, { cut: 100 });
  // music box: the brood cell on glock + harp in quarters, a still string pad
  prog([[T0, 'Em', BAR], [B(8), 'Cmaj7', BAR], [B(9), 'Am9', BAR], [B(10), 'B7sus', BAR / 2], [B(10, 2), 'B7', BAR / 2]], { lo: 59, hi: 81, n: 4, vel: .2, atk: .9, rel: 1, bassLo: 40, bassK: .7 });
  for (let k = 0; k < 16; k++) {
    const t = B(7, 1) + k * BEAT; if (t > B(10) - .1) break;
    O.mallet('glock', BROOD[k % 6] + 12, t, .16, { dur: 2 }); O.harp(BROOD[k % 6], t + .01, .2, { dur: 2 });
  }
  // each egg laid: a soft marimba drop + pop
  EV.eggLays.forEach((t, i) => { O.mallet('marimba', [64, 67, 71][i], t, .36, { dur: 1 }); X.pop(t + .01, .5, { f: 700, tau: .02 }); });
  // zoom into the pile, then the X-ray scan reveals the embryo
  X.whoosh(T0 + 2.6, 1.2, .35, { f0: 300, f1: 1800 });
  X.riser(SCAN, 1.4, .4, { f0: 600, f1: 6000 });
  X.shimmer(SCAN - .2, 2.6, .7); O.hit('bellTree', SCAN - .1, .3, { dur: 3, rel: 1.2 }); O.hit('triangle', SCAN, .22, { dur: 4, rel: 2 });
  // inside: cells dividing (a cascade of plucked harmonics), then the theme small and far on the flute
  for (let k = 0; k < 14; k++) { const t = SCAN + .6 + k * .2 * Math.pow(.93, k); O.harp([76, 83, 79, 88, 86, 91][k % 6], t, .16 + .01 * k, { dur: 1.5 }); }
  sing('fluteSus', bars(THEME, 0, 1), B(9), { oct: 1, k: .45, atk: .1, rel: .6 });
  // the queen chooses: fertilised (female) answered high, unfertilised (male) answered low
  [[0, 79], [.5, 83], [1, 86]].forEach(([b, m]) => O.pizz(m, SPLIT + .4 + b * BEAT, .38, { key: 'vlnPizz' }));
  [[0, 47], [.5, 43], [1, 40]].forEach(([b, m]) => O.pizz(m, SPLIT + 1.6 + b * BEAT, .45, { key: 'vcPizz' }));
  O.mallet('glock', 91, SPLIT + .4, .18); O.play('bsnStac', 40, SPLIT + 2.3, .3, .4, { rel: .1 });
  O.gliss(B(10, 3), BEAT * .9, 59, 88, .26, { scale: 'Em', cresc: true });
}

function larva() {
  const T0 = B(11), SCAN = EV.scanLarva, CASTE = B(11) + 10.9, END = B(16);
  // hatch
  X.crack(EV.hatch + .1, .35); X.pop(EV.hatch + .3, .6, { f: 900 });
  O.harp(64, EV.hatch + .3, .4, { dur: 2 }); O.mallet('glock', 88, EV.hatch + .32, .22);
  // the nursery groove: marimba brood cell in 8ths, bassoon staccato bass, light shaker + conga
  const H = [[T0, 'Em'], [B(12), 'C'], [B(13), 'Am'], [B(13, 2), 'D'], [B(14), 'Em'], [B(15), 'Cmaj7'], [B(15, 2), 'B7']];
  const bassOf = { Em: 40, C: 36, Am: 45, D: 38, Cmaj7: 36, B7: 35 };
  const chord = (t) => { let c = 'Em'; for (const [tt, cc] of H) if (t >= tt - 1e-3) c = cc; return c; };
  const CELL = { Em: [64, 59, 55, 59, 57, 55], C: [64, 60, 55, 60, 59, 55], Cmaj7: [64, 60, 55, 60, 59, 55], Am: [64, 60, 57, 60, 59, 57], D: [66, 62, 57, 62, 61, 57], B7: [66, 63, 59, 63, 61, 59] };
  for (let k = 0; k < 64; k++) {
    const t = T0 + BEAT + k * BEAT / 2; if (t >= SCAN - .05) break;
    const c = chord(t), m = CELL[c][k % 6];
    O.mallet('marimba', m, t, k % 6 === 0 ? .42 : .3, { dur: .5, rel: .3, pan: -.2 });
  }
  for (let k = 0; k < 24; k++) {
    const t = T0 + BEAT + k * BEAT; if (t >= SCAN - .05) break;
    const c = chord(t); O.play('bsnStac', bassOf[c] + (k % 2 ? 7 : 0), t, .25, .42, { rel: .1 });
  }
  groove('shaker', '.o.oxo.o.o.oxo.o', T0 + BEAT, SCAN, .3);
  groove('conga', 'x.....o...x.o...', T0 + BEAT, SCAN, .32);
  prog(H.filter(([t]) => t < SCAN).map(([t, c], i, a) => [t, c, (a[i + 1]?.[0] ?? SCAN) - t]), { lo: 62, hi: 79, n: 3, vel: .16, atk: .4, rel: .6, bass: false });
  // clarinet staccato: a cheeky answer phrase from the theme head
  [[B(12), 0], [B(13), 2]].forEach(([t0, tr]) => [[0, 76], [.5, 78], [1, 79], [1.5, 83], [2, 81]].forEach(([b, m]) => O.play('clarStac', m - 12 + tr, t0 + BEAT * 2 + b * BEAT, .2, .38, { rel: .1 })));
  // feeding: two droplets passed mouth to mouth
  EV.feed.forEach((t, i) => { X.drip(t + .4, i, .4, { cut: 4000 }); O.mallet('glock', [91, 95][i], t + .42, .22, { dur: 2 }); O.play('fluteStac', [83, 86][i], t + .5, .15, .25, { rel: .1 }); });
  // moults: harp gliss up, each a step higher, and a soft dry crack
  EV.molts.forEach((t, i) => { O.gliss(t - .35, .35, 64 + 2 * i, 81 + 3 * i, .3, { scale: 'Em', cresc: true }); X.crack(t, .2 + .03 * i, { pan: R(-.2, .2) }); });
  // X-ray of the larva: groove drops out; glassy strings + shimmer, glock pings at each organ tag
  X.riser(SCAN, 1.2, .35, { f0: 800, f1: 6500 }); X.shimmer(SCAN - .2, 3, .7);
  O.strings([64, 71, 76, 83], SCAN, B(15) - SCAN + .3, .2, { atk: .6, rel: .8, hp: 600 });
  O.play('cbSus', 28, SCAN, B(15) - SCAN + .3, .26, { atk: .6, rel: .8 });
  [0, .5, 1, 1.5].forEach((d, i) => O.mallet('glock', [83, 88, 91, 95][i], SCAN + .9 + d, .2, { dur: 2 }));
  broken('harp', 'Emadd9', SCAN + .2, BAR - .2, BEAT / 2, .18, { lo: 64, hi: 88 });
  // the caste fork: food decides. worker: low pizz; queen: a royal horn swell with timpani
  O.pizz(40, CASTE + .5, .5, { key: 'vcPizz' }); O.pizz(47, CASTE + .7, .4, { key: 'vcPizz' });
  O.horns([59, 63, 66, 69], B(15, 2), 1.4, .42, { atk: .35, rel: .8 });
  O.timp(47, B(15, 2), .45);
  prog([[B(15), 'Cmaj7', BEAT * 2], [B(15, 2), 'B7', BEAT * 2]], { lo: 59, hi: 79, n: 4, vel: .28, atk: .4, rel: .8, bassLo: 35 });
  O.roll(47, B(15, 2), BEAT * 2, .5, { dyn: (u) => .1 + .9 * u * u, rel: .2 });
  O.swell('swellShort', END, .3);
}

module.exports = { egg, larva };
