// Score, part 4 (bars 25-34): the colony grows (a driving spiccato + hand-drum groove under the theme in the violins,
// a tick for every population jump) and the cycle closes (the grand theme, ending in G major on the end card).
const T = require('./theme');
const { O, X, B, BEAT, BAR, THEME, THEME_G, bars, sing, prog, broken, sparkle, ss, groove } = T;
const { EV } = require('../cues');
const { R } = O;

function colony() {
  const T0 = B(25), END = B(30), TRAIL = B(25) + 5.3;
  // underground hum of the nest + the evening outside
  X.bed(X.F.COUNTRY, 60, T0, END + .5, (t) => .08, { cut: 7000, hp: 200, fi: 1 });
  // harmony: Em | Em | D | Em | Cmaj7 E7
  const H = [[T0, 'Em', BAR], [B(26), 'Em', BAR], [B(27), 'D', BAR], [B(28), 'Em', BAR], [B(29), 'Cmaj7', BEAT * 2], [B(29, 2), 'E7', BEAT * 2]];
  prog(H, { lo: 55, hi: 76, n: 4, vel: (t) => .22 + .12 * ss(T0, END, t), atk: .3, rel: .6, bassLo: 28, bassK: .8, cb: false });
  const chord = (t) => { let c = 'Em'; for (const [tt, cc] of H) if (t >= tt - 1e-3) c = cc; return c; };
  const root = (t) => ({ Em: 40, D: 38, Cmaj7: 36, E7: 40 }[chord(t)]), third = (t) => (chord(t) === 'Em' ? 15 : 16);
  // spiccato ostinato in 8ths (celli + violas), pizz bass on the beats
  const PAT = [0, 0, 7, 0, 12, 0, 7, 10];
  for (let k = 0; k < 40; k++) {
    const t = T0 + k * BEAT / 2; if (t >= END - .02) break;
    const r = root(t), up = PAT[k % 8] === 10 ? (r === 38 ? 9 : r === 36 ? 11 : 10) : PAT[k % 8];
    O.spic(r + 12 + up, t, (k % 2 ? .3 : .44) * (.8 + .2 * ss(T0, END, t)), { key: 'vcSpic' });
    if (k >= 8) O.spic(r + 24 + [7, 12, 7, third(t)][k % 4] - (r === 40 ? 12 : 0), t, .2, { key: 'vlaSpic' });
    if (k % 2 === 0) O.pizz(r - 12 < 28 ? r : r - 12, t, .4, { key: 'cbPizz' });
  }
  groove('conga', 'x..o..x.o.x...o.', T0 + BAR / 2, END, .4);
  groove('tumba', '....x.......x.o.', B(26), END, .4);
  groove('shaker', 'oxoooxoooxoooxoo', B(26), END, .28);
  groove('bdrum', 'x.......x.......', B(27), END, .3, { dur: 1.5, rel: .4 });
  // the theme in the violins (bars 1-4), horns join for the second half
  sing('vlnSus', bars(THEME, 0, 4), B(26), { k: .5, atk: .06, rel: .5 });
  sing('fluteSus', bars(THEME, 2, 4), B(28), { oct: 1, k: .38, atk: .06, rel: .5 });
  O.horns([52, 59, 64], B(28), BAR, .38, { atk: .3, rel: .6 }); O.horns([52, 60, 64], B(29), BEAT * 2, .4, { atk: .2 }); O.horns([52, 59, 62, 68], B(29, 2), BEAT * 2, .44, { atk: .15 });
  // every population jump: a bright glock + claves "ding", and a little xylophone run upward
  EV.pop.forEach((t, i) => { O.mallet('glock', [88, 91, 95, 98, 100][i], t, .26, { dur: 2 }); O.hit('claves', t, .4, { dur: .3 }); [0, 1, 2].forEach((k) => O.mallet('xylo', [79, 83, 88][k] + i, t + .06 + k * .06, .14, { dur: .4 })); });
  // the pheromone trail: a shimmering flute line racing along it
  for (let k = 0; k < 12; k++) O.play('fluteStac', [76, 79, 83, 86, 88, 91][k % 6] + (k >= 6 ? 0 : 0), TRAIL + k * BEAT / 4, .1, .2 + .01 * k, { rel: .08 });
  X.shimmer(TRAIL, 1.6, .5);
  // roles: three woody taps (nurse, builder, forager)
  [8.8, 9.2, 9.6].forEach((d, i) => { O.hit('logHi', T0 + d + .2, .4, { dur: .3 }); O.mallet('marimba', [64, 67, 71][i], T0 + d + .2, .32, { dur: .8 }); });
  // into the finale
  O.roll(40, B(29, 2), BEAT * 2, .6, { dyn: (u) => .1 + .9 * u * u, rel: .15 });
  O.swell('swellShort', END, .4);
  O.gliss(B(29, 3), BEAT * .95, 52, 88, .32, { scale: 'Emh', cresc: true });
}

function cycle() {
  const T0 = B(30), RING = EV.ring, END = EV.end;
  // dusk again: the new queens and males take off
  X.bed(X.F.COUNTRY, 10, T0, B(32), (t) => .15 * (1 - ss(B(31), B(32), t)), { cut: 9000, hp: 160, fi: .4 });
  X.hum(T0, B(31, 3), (t) => ss(T0, T0 + .6, t) * (1 - ss(B(31), B(31, 3), t)), { n: 10, gain: .9 });
  [0, .9, 1.8].forEach((d, i) => X.whoosh(T0 + d, 1, .4, { sweep: i % 2 ? .8 : -.8, f0: 500, f1: 2600 }));
  // the grand theme, bars 5-8 (Am | G/B | C D | G): horns + violins + flute on the melody, full strings, timpani
  const G = bars(THEME_G, 4, 8);
  sing('horn', G, T0, { k: .82, atk: .08, rel: .8 });
  sing('vlnSus', G, T0, { oct: 1, k: .56, atk: .06, rel: .7 });
  sing('fluteSus', G, T0, { oct: 1, k: .34, atk: .06, rel: .7 });
  prog([[T0, 'Am', BAR], [B(31), 'G/B', BAR], [B(32), 'C', BAR / 2], [B(32, 2), 'Dsus4', BEAT], [B(32, 3), 'D', BEAT]], { lo: 52, hi: 79, n: 5, vel: .5, atk: .12, rel: .8, bassLo: 33, cb: true });
  O.hit('cymHit', T0, .42, { dur: 5, rel: 1.6 }); O.timp(45, T0, .7); O.hit('bdrum', T0, .5, { dur: 3, rel: 1.2 });
  [[B(31), 47], [B(32), 48], [B(32, 2), 50]].forEach(([t, m]) => O.timp(m, t, .6));
  [33, 45, 52, 57, 60, 64, 69].forEach((m, i) => O.harp(m, T0 + i * .03, .5, { dur: 3 }));
  broken('harp', 'G/B', B(31), BAR, BEAT / 2, .22, { lo: 59, hi: 86 });
  // the ring builds: a note per stage, climbing (G major pentatonic)
  [79, 83, 86, 91, 95].forEach((m, i) => { const t = RING + i * .5 + .2; O.mallet('glock', m, t, .26, { dur: 2.2 }); O.harp(m - 12, t + .01, .3, { dur: 2 }); X.pop(t, .3, { f: 1200 }); });
  // lifespans: the strings thin; a harp gliss, then the arrival on G for the end card
  O.gliss(B(32, 2), BEAT * 1.8, 55, 91, .3, { scale: 'G', cresc: true });
  O.swell('swellMed', END, .45, { tail: .2 });
  O.roll(43, B(32, 2), BEAT * 2, .45, { dyn: (u) => .1 + .9 * u * u, rel: .2 });
  // the end card: G major, wide and warm, then left to ring away
  O.timp(43, END, .7); O.hit('gong', END + .02, .25, { dur: 6, rel: 2.4 }); O.hit('cymHit', END, .35, { dur: 5, rel: 2 });
  O.strings([31, 43, 50, 55, 59, 62, 67, 71, 74, 79], END, B(34) - END + 1, .5, { atk: .06, rel: 1.6, dyn: (u) => 1 - .55 * u });
  O.horns([55, 59, 62, 67], END, 1.8, .55, { atk: .06, rel: 1.2, dyn: (u) => 1 - .5 * u });
  [43, 50, 55, 59, 62, 67, 71, 74, 79, 83].forEach((m, i) => O.harp(m, END + .05 + i * .08, .34, { dur: 3.5 }));
  [91, 95, 98].forEach((m, i) => O.mallet('glock', m, END + .9 + i * .3, .18, { dur: 3 }));
}

module.exports = { colony, cycle };
