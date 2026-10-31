// Score, part 3 (bars 16-25): the pupa (silk spinning, the meconium, a mysterious transformation that slowly takes
// colour and rises) and the adult (cut free, the heroic theme as she emerges, the anatomy plate and its X-ray).
const T = require('./theme');
const { O, X, B, BEAT, BAR, THEME, bars, sing, prog, broken, sparkle, ss, groove } = T;
const { EV } = require('../cues');
const { R } = O;

function pupa() {
  const T0 = B(16), MEC = EV.meconium, SCAN = B(16) + 5.6, EYES = EV.eyes, COL = EV.color, END = B(21);
  // spinning the cocoon: a circling harp + violin tremolo, airy shimmer (silk)
  const spinEnd = T0 + 3.6;
  for (let k = 0; k * BEAT / 4 < spinEnd - T0 - .1; k++) {
    const t = T0 + .15 + k * BEAT / 4, ring = [64, 67, 71, 76, 79, 76, 71, 67];
    O.harp(ring[k % 8] + (k >= 16 ? 2 * 0 : 0), t, .14 + .1 * Math.sin(Math.PI * k / 22), { dur: 1.2, pan: Math.sin(k * .8) * .6 });
  }
  X.shimmer(T0, 3.6, .8);
  X.breath(T0 + .2, 3.2, .5, { f0: 1200, f1: 3000 });
  // the mystery: tremolo strings Em | Cmaj7#11 | Am9 | B7sus | B7 (rising, slowly louder)
  const H = [[T0, 'Em', BAR], [B(17), 'Cmaj7#11', BAR], [B(18), 'Am9', BAR], [B(19), 'Em', BAR], [B(20), 'B7sus', BEAT * 2], [B(20, 2), 'B7', BEAT * 2]];
  prog(H, { lo: 59, hi: 83, n: 4, trem: true, vel: (t) => .2 + .26 * ss(COL - 1, END, t), atk: .7, rel: .8, bassLo: 35, bassK: .8 });
  O.play('cbSus', 28, T0, B(18) - T0, .3, { atk: 1, rel: .8 });
  // the meconium: a low plop
  X.sub(MEC + .1, .45, { f: 70, dec: .12, drop: .4 }); X.pop(MEC + .1, .5, { f: 380, tau: .03, pan: -.2 });
  O.pizz(35, MEC + .1, .5, { key: 'cbPizz' }); O.play('bsnStac', 40, MEC + .35, .3, .4, { rel: .1 });
  // the scan, then the soup: bubbling cells (water bubbles, piano + celesta-like glock flickers)
  X.riser(SCAN, 1.3, .38, { f0: 700, f1: 6500 }); O.hit('bellTree', SCAN - .1, .32, { dur: 3, rel: 1.2 });
  X.bed(X.F.BUBBLES, 3, SCAN, SCAN + 3.6, (t) => .22 * ss(SCAN, SCAN + .6, t) * (1 - ss(SCAN + 2.6, SCAN + 3.6, t)), { cut: 2600, hp: 300, rev: .2 });
  sparkle('piano', [88, 91, 93, 95, 98, 100], SCAN + .2, 3.2, 18, .2, { dur: .8, rel: .4 });
  sparkle('glock', [91, 95, 98, 100], SCAN + 1.2, 2.4, 7, .16);
  // the body takes shape: the theme, slow and low in the celli (augmented)
  sing('vcSus', [[0, 64, 1.5], [1.5, 67, .5], [2, 71, 2]], B(19), { sc: 1.25, k: .4, atk: .3, rel: .8 });
  // eyes darken: two bells; colour spreads: rising strings and a timpani roll into the emergence
  [[0, 88], [.12, 95]].forEach(([d, m]) => O.mallet('glock', m, EYES + d, .3, { dur: 3 })); O.hit('triangle', EYES, .25, { dur: 3, rel: 1.6 });
  O.play('vlnSus', 83, EYES + .2, 1.6, .18, { atk: .5, rel: .7, hp: 900 });
  sing('vlnSus', [[0, 71, 1], [1, 74, 1], [2, 76, 1], [3, 78, 1], [4, 81, 2]], COL, { k: .32, atk: .3, rel: .5, dyn: (u) => .6 + .4 * u });
  O.roll(47, B(20), BAR, .6, { dyn: (u) => .08 + .92 * Math.pow(u, 1.6), rel: .15 });
  O.swell('swellMed', END, .45, { tail: .1 });
  X.riser(END, 2.4, .5, { f0: 300, f1: 5000 });
}

function adult() {
  const T0 = B(21), CUT = EV.cut, EM = EV.emerge, ANA = EV.anatomy, XR = B(21) + 7.3;
  // cut free: sisters bite through the silk (crisp tearing), then a bright hit as she slides out
  for (let k = 0; k < 5; k++) { X.click(CUT + .15 + k * .2, .55, { f: R(2400, 4000), dec: .004, pan: R(-.3, .3) }); }
  X.crack(CUT + 1.05, .45);
  O.timp(40, EM, .85); O.hit('cymHit', EM, .45, { dur: 4, rel: 1.4 }); O.hit('bdrum', EM, .6, { dur: 2.5, rel: 1 });
  X.whoosh(EM - .5, 1.1, .45, { f0: 400, f1: 3000 });
  // heroic: horns sing the theme head over full strings, Em | D, as the callow stands and darkens
  sing('horn', bars(THEME, 0, 1), EM, { k: .78, atk: .1, rel: .7 });
  sing('vlnSus', bars(THEME, 0, 1), EM, { oct: 1, k: .42, atk: .1, rel: .6 });
  prog([[EM, 'Em', ANA - EM]], { lo: 52, hi: 76, n: 4, vel: .5, atk: .1, rel: .8, bassLo: 28, cb: true });
  [40, 47, 52, 55, 59, 64].forEach((m, i) => O.harp(m, EM + i * .04, .5, { dur: 3 }));
  for (let k = 0; k < 4; k++) O.timp([40, 47][k % 2], EM + BEAT * 2 + k * BEAT, .45 - .05 * k);
  // the anatomy plate: a steady spiccato pulse in 8ths, a clarinet carrying the theme's second phrase; a tick per tag
  const PH = [[ANA, 'D', BAR], [B(23, 2), 'Em', XR - B(23, 2)]];
  prog(PH, { lo: 55, hi: 76, n: 3, vel: .24, atk: .3, rel: .6, bassLo: 35, bassK: .7 });
  for (let k = 0; k < 16; k++) { const t = ANA + k * BEAT / 2; if (t >= XR - .05) break; const r = t < B(23, 2) ? 38 : 40; O.spic(k % 4 === 3 ? r + 7 : r + 12, t, k % 2 ? .3 : .42, { key: 'vcSpic' }); O.spic((r === 38 ? [57, 62] : [59, 64])[k % 2], t, .22, { key: 'vlaSpic' }); }
  sing('clarSus', bars(THEME, 1, 2), ANA, { k: .46, atk: .1, rel: .5 });
  [4.4, 4.7, 4.9, 5.1, 5.3, 5.5, 5.7].forEach((d, i) => { X.click(T0 + d + .25, .35, { f: 2800, dec: .003, pan: i % 2 ? .3 : -.3 }); O.mallet('xylo', [83, 86, 88, 91, 88, 86, 83][i], T0 + d + .25, .14, { dur: .6 }); });
  // the X-ray: glassy, sul-pont strings + shimmer, glock per organ
  X.riser(XR + .1, 1.1, .35, { f0: 900, f1: 7000 }); X.shimmer(XR, 3, .7);
  O.strings([59, 64, 71, 76], XR, B(25) - XR + .4, .2, { atk: .5, rel: 1, hp: 700 });
  O.play('cbSus', 28, XR, B(25) - XR + .4, .25, { atk: .5, rel: .9 });
  [7.9, 8.3, 8.7, 9.1].forEach((d, i) => O.mallet('glock', [88, 91, 95, 100][i], T0 + d + .2, .22, { dur: 2.4 }));
  broken('harp', 'Emadd9', XR + .3, B(24, 2) - XR, BEAT / 2, .16, { lo: 64, hi: 88 });
  // lead-in to the colony: pizz climbs + a short roll
  [40, 43, 47, 50, 52, 55, 59, 62].forEach((m, i) => O.pizz(m, B(24, 2) + i * BEAT / 4, .3 + .03 * i));
  O.roll(40, B(24, 2), BEAT * 2, .45, { dyn: (u) => .1 + .9 * u * u, rel: .1 });
}

module.exports = { pupa, adult };
