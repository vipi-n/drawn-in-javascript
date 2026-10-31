// Score, part 1 (bars 0-12): the dusk prologue + title, the morning song and courtship, the eggs in the twig.
const T = require('./theme');
const { O, X, B, BEAT, BAR, THEME, EGG, bars, sing, prog, ss, dip } = T;
const { EV } = require('../cues');
const { R, rnd } = O;

function prologue() {
  const TT = EV.title, [cf0, cf1] = EV.chorusFade;
  // dusk: the forest roars with the massed chorus (real recording + pitched layers), ducks under the title hit,
  // then thins out into the morning
  X.chorus(0, cf1 + 1.4, (t) => 1.5 * ss(-.2, .25, t) * dip(t, TT - .04, TT + .7, .5, .1, 1.4) * (1 - .93 * ss(cf0, cf1 + .6, t)), { layers: 6, buzz: .42, from: 6 });
  X.bed(X.F.FOREST, 5, 0, B(4), (t) => .7 * ss(-.2, .4, t) * (1 - .6 * ss(B(3), B(4), t)), { cut: 9000, hp: 220, fi: .2 });

  // from nothing: contrabass, celli, violas and horns on an open D-A fifth, swelling into the title
  const cresc = (u) => .05 + .95 * Math.pow(u, 1.7);
  O.play('cbSus', 26, .1, TT - .1, .8, { atk: .4, dyn: cresc, rel: .25 });
  O.play('cbSus', 38, .15, TT - .15, .75, { atk: .4, dyn: cresc, rel: .25 });
  O.play('vcSus', 50, .3, TT - .3, .72, { atk: .5, dyn: cresc, rel: .25 });
  O.play('vlaSus', 57, .5, TT - .5, .62, { atk: .6, dyn: cresc, rel: .25 });
  O.horns([50, 57], .7, TT - .7, .66, { atk: .6, dyn: cresc, rel: .25 });
  O.play('bsnSus', 38, .6, TT - .6, .5, { atk: .6, dyn: cresc, rel: .2 });
  O.roll(38, .8, TT - .8, .78, { dyn: (u) => .06 + .94 * Math.pow(u, 1.6), rel: .15, atk: .3 });
  O.swell('swellMed', TT, .62, { tail: .1, rel: .3 });
  O.swell('bdRub', TT + .05, .45, { tail: .3 });
  O.gliss(TT - .6, .58, 38, 86, .5, { scale: 'Dm', cresc: true, curve: 1.25 });

  // the title: a full D-minor tutti hit (timpani, bass drum, cymbal, gong, low piano for the floor)
  O.timp(38, TT, .98); O.timp(50, TT + .012, .62);
  O.hit('bdrum', TT, .92, { dur: 3, rel: 1.2 });
  O.hit('cymHit', TT, .62, { dur: 5, rel: 1.6 }); O.hit('gong', TT + .02, .32, { dur: 7, rel: 2.4 });
  O.play('piano', 38, TT, 3.5, .9, { rel: 1.2 }); O.play('piano', 50, TT, 3.5, .75, { rel: 1.2 });
  O.strings([26, 38, 50, 57, 62, 65, 69, 74, 77], TT, 1.1, .9, { atk: .045, rel: 1 });
  O.horns([50, 57, 62, 65], TT, 1.2, .9, { atk: .05, rel: .9 });
  O.play('bsnSus', 38, TT, 1.3, .7, { atk: .05, rel: .7 });
  [38, 45, 50, 57, 62].forEach((m) => O.harp(m, TT + .005, .75, { dur: 3 }));

  // the hit settles into a dark held D minor; the horns intone the theme head, minor, in long notes;
  // the chord slides to Bbmaj7(#11) and opens onto a bare Dsus2 that carries the scene change
  O.strings([38, 50, 57, 65, 69], TT + .9, B(2) - TT - .9, .44, { atk: .5, rel: .9 });
  O.play('cbSus', 26, TT + .9, B(2) - TT - .9, .36, { atk: .5, rel: .9 });
  O.hornLine(O.phrase([[0, 57, 3, .62], [3, 53, 1, .55], [4, 52, 2, .58], [6, 50, 5, .56]], B(1, 2)), { atk: .25, rel: 1, dyn: (u) => 1 - .25 * u });
  O.strings([34, 46, 57, 62, 69, 72], B(2), B(3) - B(2), .4, { atk: .45, rel: .8 });
  O.play('cbSus', 34, B(2), 2.5, .3, { atk: .5, rel: .8 });
  O.harp(46, B(2), .32, { dur: 3 }); O.harp(57, B(2, .5), .26, { dur: 3 }); O.harp(64, B(2, 1), .24, { dur: 3 });
  // Dsus2: held across the cut into the morning (no gap)
  O.strings([38, 50, 57, 64, 69, 76], B(3) - .1, B(4) - B(3) + .25, .34, { atk: .7, rel: 1.1, dyn: (u) => 1 - .3 * u });
  O.harp(50, B(3), .3, { dur: 3 }); O.harp(57, B(3, .5), .26, { dur: 3 }); O.harp(64, B(3, 1), .26, { dur: 3 }); O.harp(69, B(3, 1.5), .24, { dur: 3 });
}

function song() {
  const [[c1a, c1b], [c2a, c2b]] = EV.maleCall;
  // morning forest: birds in the distance, a few far cicadas; the male sings upfront and clear
  X.bed(X.F.FOREST2, 130, B(2, 2), B(8, 2), (t) => .22 * ss(B(2, 2), B(3, 2), t) * (1 - .7 * ss(B(7, 2), B(8, 2), t)), { cut: 7500, hp: 280 });
  X.bed(X.F.DAWN, 95, B(3), B(8), (t) => .12 * ss(B(3), B(4), t), { cut: 6000, hp: 300, fi: 1.5 });
  X.bed(X.F.CHORUS, 30, B(3), B(8), (t) => .1 * ss(B(3), B(4), t) * (1 - .5 * ss(B(7), B(8), t)), { cut: 4200, hp: 1500, bus: 'cic', width: .5, fi: 1.5, rev: .1 });
  [[B(6, 1), -.7], [B(7, 1.5), .75]].forEach(([t, pan], i) => X.call(t, 1.7, { st: -6 + i, fall: 4, gain: .22, pan, rev: .35, dist: 3500, from: 12 + 9 * i }));
  X.call(c1a, c1b - c1a, { st: -4, fall: 4, gain: 1.5, pan: .14, rev: .09, from: 20 });
  X.call(c2a, c2b - c2a, { st: -4.3, fall: 4.3, gain: 1.45, pan: .1, rev: .09, from: 8 });

  // morning light enters the held Dsus2 (F# in the violins), then a gentle progression to the courtship
  O.play('vlnSus', 78, B(3, 2), 2.2, .24, { atk: 1.1, rel: .8 });
  prog([[B(4), 'G/D', 1.25], [B(4, 2), 'Dadd9', 1.25], [B(5), 'Bm7', 1.25], [B(5, 2), 'A7sus', 1.25]], { lo: 57, hi: 76, n: 4, vel: .27, atk: .55, rel: 1, bassLo: 38, bassK: .8 });
  // the orchestra answers the first call: a light pizz + harp lift
  [[0, 74], [.5, 76], [1, 78], [1.5, 81]].forEach(([b, m]) => { O.pizz(m, B(4, 1) + b * BEAT / 2, .4, { key: 'vlnPizz' }); O.harp(m, B(4, 1) + b * BEAT / 2 + .01, .3, { dur: 1.6 }); });
  O.mallet('glock', 93, B(4, 2), .18, { dur: 2 });
  // ...and the second (the female lands): harp touch, cello pizz, a soft click
  O.harp(69, EV.femaleLand, .36, { dur: 2.5 }); O.harp(76, EV.femaleLand + .07, .3, { dur: 2.5 }); O.pizz(47, EV.femaleLand, .5);
  X.click(EV.femaleLand, .5, { f: 2200, dec: .006, pan: -.2 }); X.leaves(EV.femaleLand - .02, .25, .25, { from: 12.3, cut: 4000, pan: -.2 });
  // her two wing flicks, answered by a flute chirp and a glock bell
  EV.flick.forEach((t, i) => X.click(t, .55, { f: 4800, dec: .004, pan: -.25 }));
  O.play('fluteStac', 90, EV.flick[0] + BEAT * .25, .12, .36, { rel: .08 }); O.play('fluteStac', 93, EV.flick[0] + BEAT * .5, .14, .38, { rel: .1 });
  O.mallet('glock', 88, EV.flick[1] + BEAT * .25, .24, { dur: 2 });
  // he walks to her: light pizz steps rising into the theme
  const [w0] = EV.walk;
  [62, 64, 66, 67].forEach((m, i) => { O.pizz(m, w0 + i * BEAT / 2, .42 + .03 * i, { key: 'vcPizz' }); X.click(w0 + i * BEAT / 2 + .01, .18, { f: 1500, dec: .005, pan: .15 - i * .08 }); });

  // courtship: the MAIN THEME, first statement - celli and violas in unison, warm, over soft high violins and harp
  sing('vcSus', bars(THEME, 0, 2), EV.pair, { k: .74, atk: .14, rel: .6 });
  sing('vlaSus', bars(THEME, 0, 2), EV.pair, { k: .52, atk: .16, rel: .6 });
  O.strings([74, 78, 81], B(6), BAR + .1, .22, { atk: .8, rel: .5 }); O.strings([74, 78, 83], B(7), BAR + .1, .22, { atk: .5, rel: 1 });
  O.play('cbSus', 38, B(6), 2.6, .34, { atk: .5, rel: .8 }); O.play('cbSus', 31, B(7), 2.7, .34, { atk: .5, rel: 1 });
  const fl = [[B(6), [50, 57, 62, 66, 69, 66, 62, 57]], [B(7), [43, 50, 55, 59, 66, 59, 55, 50]]];
  fl.forEach(([t0, ns]) => ns.forEach((m, i) => O.harp(m, t0 + i * BEAT / 2, i ? .22 : .3, { dur: 1.8 })));
  // she saws a slit in the twig; every egg drops with a soft marimba pluck, the clockwork assembling itself
  X.rasp(EV.cutStart + .05, 1.15, .75, { pan: -.12 });
  EV.eggLay.forEach((t, i) => {
    if (i) X.rasp(t - .42, .34, .5, { pan: -.12, rate: 4 });
    O.mallet('marimba', EGG[i], t, .34 + .03 * i, { dur: .9, rel: .5 });
    O.harp(EGG[i] + 12, t + .004, .16, { dur: 1.4 });
    X.pop(t + .01, .45, { f: 650, tau: .02, pan: -.12 });
  });
  O.gliss(B(7, 3), BEAT * .9, 62, 81, .26, { cresc: true });
}

function eggs() {
  const T0 = EV.eggsStart, T1 = EV.dropStart;
  // inside the twig: the forest heard through wood
  X.bed(X.F.FOREST2, 170, B(7, 2), T1 + 1, (t) => .13, { cut: 700, hp: 180, fi: 1.2 });
  // clockwork: the 6-note egg cell in 8ths against the 4/4 bar, tightening to 16ths before the drop
  let t = T0, k = 0;
  while (t < T1 - .01) {
    const m = EGG[k % 6], acc = k % 6 === 0 ? 1 : .8, u = (t - T0) / (T1 - T0);
    O.mallet('marimba', m, t, (.34 + .14 * u) * acc, { dur: .6, rel: .4 });
    if (k % 6 === 0) O.mallet('glock', m + 12, t, .14 + .08 * u, { dur: 1.5 });
    t += t >= B(11, 2) - .01 ? BEAT / 4 : BEAT / 2; k++;
  }
  // tick-tock: quarters, 8ths, triplets, 16ths
  [[B(8), 1], [B(9), 2], [B(10), 3], [B(11), 4]].forEach(([b0, d]) => {
    for (let s = 0; s < 4 * d; s++) O.hit(s % 2 ? 'logHi' : 'claves', b0 + s * BEAT / d, (s % 2 ? .22 : .4) * (.8 + .05 * d), { dur: .3, rel: .06, gain: s % 2 ? -6 : 0 });
  });
  // harp quarters + pizz bass under the clockwork
  const H = [['Dmaj9', [50, 57, 61, 64], 38], ['Bm9', [47, 54, 57, 61], 35], ['Gmaj9', [43, 50, 54, 57], 31], ['A9sus', [45, 52, 55, 59], 33]];
  H.forEach(([c, ns, bs], j) => {
    for (let s = 0; s < 4; s++) O.harp(ns[[0, 2, 1, 3][s]] + 12, B(8 + j, s), s ? .24 : .3, { dur: 1.6 });
    O.pizz(bs, B(8 + j), .44, { key: 'cbPizz' }); O.pizz(bs + 7, B(8 + j, 2), .3, { key: 'cbPizz' });
    O.pizz(ns[1], B(8 + j, 1.5), .26, { key: 'vcPizz' }); O.pizz(ns[2], B(8 + j, 3.5), .24, { key: 'vlaPizz' });
  });
  // soft high strings, very still (wonder)
  prog([[B(8), 'Dmaj9', 2.5], [B(9), 'Bm9', 2.5], [B(10), 'Gmaj9', 2.5], [B(11), 'A9sus', 2.6]], { lo: 66, hi: 86, n: 3, vel: .2, atk: .9, rel: 1, bass: false });
  [[B(8), 50], [B(9), 47], [B(10), 43], [B(11), 45]].forEach(([tt, m]) => O.play('vcSus', m, tt, 2.6, .2, { atk: .8, rel: .9 }));
  // the theme, small and far: flute + glock
  sing('fluteSus', bars(THEME, 0, 2), B(9), { oct: 1, k: .5, atk: .08, rel: .5 });
  sing('glock', bars(THEME, 0, 2).filter((n) => n[2] >= 1), B(9), { oct: 2, k: .24, maxD: 2 });
  // red eye-spots appear: a magical shimmer
  const E = EV.eyeSpots;
  O.hit('bellTree', E - .15, .5, { dur: 4, rel: 1.4 }); O.hit('triangle', E, .3, { dur: 4, rel: 2 });
  O.play('vlnSus', 81, E - .3, 2.2, .24, { atk: .7, rel: 1, hp: 900 }); O.play('vlnSus', 85, E - .2, 2.1, .22, { atk: .7, rel: 1, hp: 900 });
  X.shimmer(E - .6, 2.4, .8);
  [93, 97, 100].forEach((m, i) => O.mallet('glock', m, E + i * .11, .2, { dur: 2.5 }));
  // the hatch: six delicate pops, each answered by an ascending harp + glock note
  EV.hatch.forEach((h, i) => {
    X.pop(h, .7, { f: R(900, 1400), tau: .016, pan: R(-.35, .35) });
    const m = [81, 83, 86, 88, 90, 93][i];
    O.harp(m, h + .02, .34, { dur: 2 }); O.mallet('glock', m + 12, h + .02, .22, { dur: 2.2 });
  });
  // tightening into the drop: violins and violas lean in, a harp run up to the held A
  O.strings([57, 64, 69], B(11, 2), BEAT * 2, .26, { atk: .4, dyn: (u) => .7 + .3 * u, rel: .5 });
  O.gliss(B(11, 3), BEAT * .95, 69, 93, .3, { cresc: true });
  O.mallet('glock', 93, T1, .3, { dur: 3 }); O.mallet('marimba', 69, T1, .42, { dur: 1.4 }); O.mallet('marimba', 57, T1, .36, { dur: 1.4 });
  O.harp(45, T1, .38, { dur: 3 }); O.harp(57, T1, .3, { dur: 3 });
}

module.exports = { prologue, song, eggs };
