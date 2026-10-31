// Score, part 1 (bars 0-7): the nuptial flight at dusk + title, the queen lands, breaks off her wings, digs and seals.
const T = require('./theme');
const { O, X, B, BEAT, BAR, THEME, DIG, bars, sing, prog, harm, broken, ss, dip, groove } = T;
const { EV } = require('../cues');
const { R, rnd } = O;

function flight() {
  const TT = EV.title;
  // dusk meadow: countryside + wind; the alates' hum rises from the nest and swells as they take off
  X.bed(X.F.COUNTRY, 20, 0, B(4, 2), (t) => .2 * ss(-.2, .5, t) * (1 - .5 * ss(B(3), B(4, 2), t)), { cut: 9000, hp: 160, fi: .3 });
  X.bed(X.F.WIND, 30, 0, B(4), (t) => .08 * ss(0, 1, t), { cut: 5000, hp: 200 });
  X.hum(.4, B(3, 3), (t) => .15 + .85 * ss(B(1, 1), B(2, 2), t) * (1 - .55 * ss(B(3), B(3, 3), t)), { n: 12, gain: 1 });
  EV.takeoff.forEach((t, i) => { X.whoosh(t - .2, .9, .5 + .1 * i, { f0: 400, f1: 2400, sweep: i % 2 ? .8 : -.8, rev: .35 }); X.flaps(t - .05, i, .18, { cut: 5000, pan: i % 2 ? .5 : -.5 }); });

  // from nothing: a high, open E (violins, violas) and a harp ripple, cellos + bass + timpani rolling into the title
  const cresc = (u) => .05 + .95 * Math.pow(u, 1.8);
  O.strings([64, 71, 76, 78], .15, TT - .15, .42, { atk: .8, dyn: cresc, rel: .25 });
  O.play('cbSus', 28, .3, TT - .3, .7, { atk: .5, dyn: cresc, rel: .25 }); O.play('vcSus', 40, .4, TT - .4, .66, { atk: .5, dyn: cresc, rel: .25 });
  O.horns([52, 59], .9, TT - .9, .6, { atk: .6, dyn: cresc, rel: .25 });
  O.roll(40, .9, TT - .9, .72, { dyn: (u) => .06 + .94 * Math.pow(u, 1.7), rel: .15, atk: .3 });
  O.swell('swellMed', TT, .58, { tail: .1, rel: .3 });
  [0, .5, 1, 1.5].forEach((b, i) => O.harp([64, 71, 76, 78][i] + 12, .3 + b * BEAT, .22, { dur: 3 }));
  O.gliss(TT - .55, .53, 40, 88, .48, { scale: 'Em', cresc: true, curve: 1.2 });

  // the title: an E-minor tutti hit
  O.timp(40, TT, .96); O.timp(52, TT + .012, .6);
  O.hit('bdrum', TT, .88, { dur: 3, rel: 1.2 }); O.hit('cymHit', TT, .55, { dur: 5, rel: 1.6 }); O.hit('gong', TT + .02, .28, { dur: 6, rel: 2.2 });
  O.play('piano', 28, TT, 3.5, .85, { rel: 1.2 }); O.play('piano', 40, TT, 3.5, .72, { rel: 1.2 });
  O.strings([28, 40, 47, 52, 59, 64, 67, 71, 76], TT, 1.1, .88, { atk: .045, rel: 1 });
  O.horns([52, 59, 64, 67], TT, 1.2, .86, { atk: .05, rel: .9 });
  [40, 47, 52, 59, 64, 71].forEach((m) => O.harp(m, TT + .005, .72, { dur: 3 }));

  // flight: harp 8ths shimmer, light pizz pulse; the flute sings the theme's head as they rise
  prog([[TT + .9, 'Emadd9', B(2) - TT - .9], [B(2), 'Em', BAR], [B(3), 'D', BAR / 2], [B(3, 2), 'Cmaj7', BEAT]], { lo: 59, hi: 81, n: 4, vel: .3, atk: .6, rel: .9, bassLo: 40, bassK: .7 });
  broken('harp', 'Emadd9', B(1, 1), BAR * 1.75, BEAT / 2, .26, { lo: 59, hi: 83, n: 4 });
  broken('harp', 'D', B(3), BAR / 2, BEAT / 2, .24, { lo: 62, hi: 86, n: 4 });
  broken('harp', 'Cmaj7', B(3, 2), BAR / 2, BEAT / 2, .22, { lo: 60, hi: 84, n: 4 });
  for (let b = 0; b < 8; b++) O.pizz([40, 47][b % 2], B(2) + b * BEAT / 2 * 2, .34, { key: b % 2 ? 'vcPizz' : 'cbPizz' });
  sing('fluteSus', bars(THEME, 0, 2), B(2), { oct: 1, k: .6, atk: .06, rel: .5 });
  sing('glock', bars(THEME, 0, 1).filter((n) => n[2] >= 1), B(2), { oct: 1, k: .18, maxD: 2 });
  // each takeoff: a quick flute flutter
  EV.takeoff.forEach((t, i) => [0, 1, 2].forEach((k) => O.play('fluteStac', [83, 86, 88][k] + (i % 2 ? 2 : 0), t + k * .07, .12, .22, { rel: .08 })));
  // mating in mid-air: a cymbal swell, then the male falls (harp falls, celli sigh down)
  O.swell('swellShort', B(3), .35);
  O.gliss(B(3, 1.6), .9, 88, 59, .3, { scale: 'Em', dim: true });
  X.whoosh(B(3, 1.5), 1.2, .5, { f0: 2400, f1: 300, sweep: -.6 });
  O.play('vcSus', 52, B(3, 2), .9, .3, { atk: .2, rel: .5 }); O.play('vcSus', 50, B(3, 3), 1.2, .28, { atk: .1, rel: .7 });
  O.strings([59, 66, 71], B(3, 3), BEAT + .3, .22, { atk: .3, rel: .6 });
}

function found() {
  const L = EV.landing, D = EV.digStart, SEAL = EV.seal;
  // ground level: grass + insects, muffled once she is underground
  X.bed(X.F.FOREST3, 40, B(4) - .5, SEAL + .4, (t) => .14 * ss(B(4) - .5, B(4), t) * (1 - .9 * ss(D + .6, SEAL, t)), { cut: (t) => 9000 - 8000 * ss(D, SEAL, t), hp: 150 });
  X.leaves(L - .03, .5, .45, { from: 20, cut: 5000, pan: .05 });
  X.sub(L, .35, { f: 60, dec: .18 });
  O.harp(40, L, .5, { dur: 3 }); O.pizz(28, L, .6, { key: 'cbPizz' });

  // earthy groove: log drums + cello pizz "dig" ostinato over Em | C | Am B7
  const H = [[B(4), 'Em', BAR], [B(5), 'C', BAR], [B(6), 'Am', BEAT * 3], [B(6, 3), 'B7', BEAT]];
  prog(H, { lo: 55, hi: 74, n: 3, vel: .22, atk: .5, rel: .8, bassLo: 36, bassK: .8 });
  const bass = { Em: 40, C: 36, Am: 45, B7: 35 };
  for (let k = 0; k < 24; k++) {
    const t = B(4, 1) + k * BEAT / 2; if (t >= SEAL) break;
    const c = t < B(5) ? 'Em' : t < B(6) ? 'C' : t < B(6, 3) ? 'Am' : 'B7', m = bass[c] + (DIG[k % 6] - 40);
    O.pizz(m + 12, t, k % 6 === 0 ? .5 : .36, { key: 'vcPizz' });
  }
  groove('logLo', 'x..o..x...o.x...', B(4, 1), SEAL, .42);
  groove('logHi', '..o...o...o..oo.', B(4, 1), SEAL, .3);
  O.mallet('marimba', 52, B(4, 1), .3, { dur: 1 }); O.mallet('marimba', 48, B(5), .3, { dur: 1 });

  // the spermatheca X-ray: a cool glass shimmer + glock motif (a lifetime of sperm, stored)
  X.riser(EV.sperm - .9, .9, .35, { f0: 1500, f1: 7000 });
  X.shimmer(EV.sperm - .9, 2.4, .7);
  [88, 95, 91, 98].forEach((m, i) => O.mallet('glock', m, EV.sperm - .9 + i * .18, .22, { dur: 2.2 }));
  O.hit('bellTree', EV.sperm - 1.0, .32, { dur: 3, rel: 1 });
  O.play('vlnSus', 83, EV.sperm - .8, 2.2, .18, { atk: .5, rel: .8, hp: 1200 });

  // she snaps off her wings: four dry breaks, each a pizz stab
  EV.wingSnap.forEach((t, i) => {
    X.twig(t, i, .32, { pan: i % 2 ? .2 : -.1 });
    X.click(t, .35, { f: 3200, dec: .004 });
    O.strings([52, 59, 64, 71], t, .14, .3 - .03 * i, { atk: .005, rel: .12 });
    O.pizz([71, 74, 76, 79][i], t + .005, .5, { key: 'vlnPizz' });
  });

  // digging: soil scraped and pushed, tumbas underneath; then the seal: a deep thump and everything closes in
  for (let k = 0; k < 6; k++) X.scrape(D + k * BEAT * .55, .45, .9, { cut: 1100, pan: R(-.3, .3) });
  groove('tumba', 'x...x.o.x...x.oo', D, SEAL, .4);
  O.play('bsnStac', 40, D, .3, .45, { rel: .1 }); O.play('bsnStac', 43, D + BEAT, .3, .42, { rel: .1 }); O.play('bsnStac', 45, D + 2 * BEAT, .3, .42, { rel: .1 });
  [0, .5, 1, 1.5, 2, 2.5].forEach((b) => X.click(SEAL - 1.1 + b * .18, .4, { f: 900, dec: .008 }));
  X.sub(SEAL, 1, { f: 42, dec: .5 }); O.timp(47, SEAL, .7); O.play('piano', 23 + 12, SEAL, 3, .6, { rel: 1 });
  O.hit('bdRub', SEAL, .45, { dur: 3, rel: 1 });
  O.play('cbSus', 35, SEAL, BEAT * 1.3, .4, { atk: .02, rel: .6 });
}

module.exports = { flight, found };
