// Score, part 4 (bars 40-54): the sunrise bloom into the chorus (the main theme in full), the return, the epilogue.
const T = require('./theme');
const { O, X, B, BEAT, BAR, THEME, EGG, bars, sing, prog, ss } = T;
const { EV, DURATION } = require('../cues');
const { R, rnd } = O;

// joyful groove for the forest chorus: bass drum on 1 + 3, tambourine on 2 + 4, shaker, tumba/conga syncopation
function groove(bar, k = 1, root = 38) {
  const t = (b) => B(bar, b);
  [[0, .75], [2, .65], [2.5, .4]].forEach(([b, v]) => O.hit('bdrum', t(b), v * k, { dur: 2, rel: .5 }));
  [1, 3].forEach((b) => O.hit('tambHit', t(b), .55 * k, { dur: .6, rel: .2 }));
  for (let s = 0; s < 8; s++) O.hit('shaker', t(s / 2), (s % 2 ? .5 : .32) * k, { dur: .3, rel: .05 });
  [[.5, .45], [1.5, .5], [1.75, .35], [3.5, .5]].forEach(([b, v]) => O.hit('conga', t(b), v * k, { dur: .6, rel: .15 }));
  [[0, .55], [2.75, .45]].forEach(([b, v]) => O.hit('tumba', t(b), v * k, { dur: .6, rel: .15 }));
  O.timp(root, t(0), .55 * k, { dur: 1.5 });
}

// sunrise (bar 40) through the chorus (to bar 46): one continuous statement of the theme -
// bars 1-2 at the sunrise, bar 4's lift as the forest starts to roar, the climax (bar 5) on the chorus peak, home at 46
function glory() {
  const SUN = EV.sunrise, FF = EV.firstFlight, CS = EV.chorusStart, PK = EV.chorusPeak, END = B(46);
  // melody: violins (8va) + horns; glock doubles the long notes
  const mel = [...bars(THEME, 0, 2), ...bars(THEME, 3, 8).map(([b, ...r]) => [b + 8, ...r])];
  sing('vlnSus', mel, SUN, { oct: 1, k: .8, gain: 2.5, atk: .07, rel: .9 });
  sing('horn', mel, SUN, { k: .78, atk: .07, rel: .9 });
  sing('fluteSus', mel.filter(([b]) => b >= 8), SUN, { oct: 1, k: .5, atk: .06 });
  sing('glock', mel.filter((n) => n[2] >= 1.5), SUN, { oct: 2, k: .22, maxD: 2.5 });
  // harmony (grand form): D | Gmaj7 | A7 | Gmaj9 | Cmaj7 | D/A A7sus | D
  const HG = [[SUN, 'D', BAR], [FF, 'Gmaj7', BAR], [CS, 'A7', BAR], [PK, 'Gmaj9', BAR], [B(44), 'Cmaj7', BAR], [B(45), 'D/A', BEAT * 2], [B(45, 2), 'A7sus', BEAT * 2]];
  prog(HG, { lo: 50, hi: 65, n: 4, vel: (t) => .5 + .08 * ss(FF, PK, t) - .06 * ss(PK + 1, END, t), atk: .12, rel: .7, bassLo: 26, cb: true, bassK: .9 });
  O.strings([78, 81, 86], SUN, BAR - .1, .42, { atk: .1, rel: .4 });
  // celli: a singing counter-line under the climax
  O.line('vcSus', O.phrase([[0, 64, 2, .7], [2, 61, 2, .66], [4, 62, 2, .72], [6, 59, 2, .66], [8, 64, 2, .7], [10, 67, 2, .72], [12, 66, 2, .7], [14, 64, 2, .66]], CS), { vel: 1, atk: .12, rel: .6 });
  // the bloom: timpani, cymbal, harp sweep, glock bells, triangle; the dawn birds rise (molt bed)
  O.timp(38, SUN, .8, { dur: 3 }); O.hit('cymHit', SUN, .5, { dur: 5, rel: 1.6 }); O.hit('triangle', SUN + .02, .3, { dur: 4, rel: 2 });
  O.gliss(SUN, .6, 50, 93, .48, { cresc: true }); [86, 90, 93].forEach((m, i) => O.mallet('glock', m, SUN + .1 + i * .12, .34, { dur: 3 }));
  O.hit('bellTree', SUN - .2, .4, { dur: 4, rel: 1.5 });
  // harden: harp arpeggios settle the bloom
  [50, 57, 62, 66, 69, 74].forEach((m, i) => O.harp(m, SUN + BEAT * 2 + i * BEAT / 2, .3, { dur: 2 }));
  // first flight: real wing flaps, a lift of air, harp upward
  X.flaps(FF, 0, .55, { pan: -.2, cut: 8000 }); X.flaps(FF + .7, 1, .4, { pan: .3, cut: 8000 });
  X.whoosh(FF - .2, 1.3, .55, { f0: 400, f1: 3200, sweep: .6 });
  O.gliss(FF + BEAT * 2, BEAT * 1.6, 55, 90, .34, { cresc: true });
  [[FF, 43], [FF + BEAT * 2, 50]].forEach(([t, m]) => O.pizz(m, t, .5));
  // the forest roars: the real massed chorus + pitched layers, triumphant (ducks slightly under the climax)
  X.chorus(FF + BEAT * 2, B(47, 2), (t) => ss(FF + BEAT * 2, CS + .2, t) * (.95 + .1 * ss(CS, PK, t)) * (1 - .25 * ss(PK - .2, PK + .3, t) * (1 - ss(PK + 1.5, PK + 3, t))) * (1 - .45 * ss(B(45), END, t)) * (1 - ss(END, B(47, 2), t)), { layers: 7, buzz: .46, from: 18, mass: 1.12 });
  X.bed(X.F.FOREST3, 60, FF, B(47), (t) => .4 * ss(FF, CS, t), { cut: 9000, fo: 1.5 });
  // the groove (bars 42-45), pizz bass bouncing, violas off-beat chords, crash on the peak
  const roots = [[42, 33, 'A7'], [43, 31, 'Gmaj9'], [44, 36, 'Cmaj7'], [45, 33, 'A7sus']];
  roots.forEach(([bar, r, c], j) => {
    groove(bar, .8 + .1 * (j === 1) - .1 * (j === 3), r < 41 ? r + 12 : r);
    [[0, r], [1, r + 12], [1.5, r + 7], [2, r + 12], [3, r + 7], [3.5, r + 12]].forEach(([b, m]) => O.pizz(m, B(bar, b), .6, { key: m < 41 ? 'cbPizz' : 'vcPizz' }));
    const v = O.voice(c, 57, 69, 3);
    [.5, 1.5, 2.5, 3.5].forEach((b) => v.forEach((m) => O.spic(m, B(bar, b), .42, { key: 'vlaSpic' })));
    [0, 1, 2, 3].forEach((b) => O.mallet('marimba', v[2] + 12, B(bar, b + .5), .3, { dur: .4 }));
  });
  O.hit('crash', PK, .8, { dur: 6, rel: 2 }); O.timp(43, PK, .9, { dur: 3 }); O.hit('bdrum', PK, .95, { dur: 3 });
  O.gliss(PK - BEAT, BEAT, 62, 93, .45, { cresc: true, scale: 'Glyd' });
  [91, 93, 95, 98].forEach((m, i) => O.mallet('xylo', m, PK + i * .06, .36, { dur: .6 }));
  O.swell('swellShort', PK, .4, { tail: .1 });
}

function ret() {
  const T0 = B(46), FA = EV.fall, [N0, N1] = EV.nutrients, T1 = EV.epilogue;
  // home: the theme lands on D; the tutti decays into soft strings
  O.strings([38, 50, 57, 62, 66, 69, 74], T0, 1.8, .48, { atk: .06, rel: 1.4, dyn: (u) => 1 - .5 * u });
  O.horns([57, 66], T0, 1.6, .45, { atk: .06, rel: 1.2, gain: -2, dyn: (u) => 1 - .5 * u });
  O.hit('cymHit', T0, .25, { dur: 4, rel: 2 }); O.timp(38, T0, .45, { dur: 3 });
  // afternoon, weeks later: the forest, a few far cicadas
  X.bed(X.F.FOREST2, 340, T0 - .5, T1 + 1, (t) => .3 * ss(T0 - .5, T0 + 2, t), { cut: 7000, hp: 280 });
  [[B(47, 3), .6], [B(49), -.65]].forEach(([t, pan], i) => X.call(t, 1.6, { st: -5 - i, fall: 4, gain: .2, pan, rev: .4, dist: 3000, from: 25 + 7 * i }));
  // a body falls, gently: a descending harp, a soft landing in the leaves
  [81, 78, 74, 69, 66].forEach((m, i) => O.harp(m, FA - .5 + i * .16, .3 - .03 * i, { dur: 2 }));
  X.leaves(FA + .35, .4, .3, { from: 47.6, cut: 3000, pan: .2 }); X.sub(FA + .38, .2, { f: 70, dec: .12 });
  // the theme, slowed and tender: celli (solo line) with piano, soft strings beneath
  sing('vcSus', bars(THEME, 0, 2), FA, { sc: 1.5, k: .62, atk: .16, rel: .9 });
  const RH = [[FA, 'D', B(47, 2.5) - FA], [B(47, 2.5), 'Bm7', B(48) - B(47, 2.5)], [B(48), 'Gmaj7', B(49, 2) - B(48)], [B(49, 2), 'A7sus', T1 - B(49, 2)]];
  const RV = { D: [74, 78, 81], Bm7: [74, 78, 81], Gmaj7: [71, 74, 78], A7sus: [74, 76, 81] };
  RH.forEach(([t, c, d]) => { O.strings(RV[c], t, d + .1, .2, { atk: .9, rel: .6 }); O.play('cbSus', O.bassOf(c, 28), t, d + .1, .2, { atk: .9, rel: .6 }); });
  RH.forEach(([t, c, d]) => { const v = O.voice(c, 50, 71, 4); v.forEach((m, i) => O.play('piano', m, t + i * .09, d + .5, .32, { rel: 1 })); O.play('piano', O.bassOf(c, 38), t, d + .5, .3, { rel: 1 }); });
  // the bodies feed the soil and the tree: a warm rising glow - harp climbing, glock, soft horns, triangle
  const glow = [[N0, 'Bm7'], [B(48), 'Gmaj7'], [B(48, 2), 'Gmaj7'], [B(49), 'A7sus']];
  glow.forEach(([t, c], j) => { const v = O.voice(c, 57 + 5 * j, 81 + 5 * j, 4); [...v, v[1] + 12].forEach((m, i) => O.harp(m, t + i * BEAT / 2, .22 + .04 * j, { dur: 2 })); });
  [[N0 + .3, 86], [B(48, .5), 90], [B(48, 2.5), 93], [B(49, .5), 95], [N1, 98]].forEach(([t, m]) => O.mallet('glock', m, t, .2, { dur: 3 }));
  O.horns([59, 62, 66], N0, B(48) - N0 + .2, .34, { atk: .8, rel: .6, gain: -2.5, dyn: (u) => .6 + .4 * u });
  O.horns([55, 59, 62], B(48), B(49, 2) - B(48) + .2, .42, { atk: .4, rel: .6, gain: -2.5, dyn: (u) => .8 + .2 * u });
  O.horns([57, 62, 64], B(49, 2), T1 - B(49, 2) + .3, .38, { atk: .3, rel: .9, gain: -2.5, dyn: (u) => 1 - .3 * u });
  O.trem([83, 86], B(48), N1 - B(48) + .4, .22, { atk: 1, dyn: (u) => .5 + .5 * u, rel: .8 });
  O.hit('triangle', N1, .26, { dur: 4, rel: 2 }); O.swell('swellShort', N1, .2, { tail: .3 });
  X.shimmer(N1 - 1.2, 2.2, .7);
}

function epilogue() {
  const T0 = EV.epilogue, RING = EV.ring, FIN = B(52), END = DURATION;
  X.bed(X.F.FOREST, 30, T0 - .5, END, (t) => .55 * ss(T0 - .5, T0 + 1, t), { cut: 8000, hp: 220, fo: 2 });
  X.bed(X.F.FOREST3, 120, T0 - .5, END, (t) => .16 * ss(T0 - .5, T0 + 1.5, t), { cut: 6000, fo: 2 });
  // the egg clockwork returns, quietly, and slows to rest on D
  let t = T0, k = 0;
  while (t < B(51, 2) - .01) { O.mallet('marimba', EGG[k % 6], t, (k % 6 ? .26 : .32) * (1 - .15 * ss(T0, FIN, t)), { dur: .7, rel: .45 }); if (k % 6 === 0) O.mallet('glock', EGG[k % 6] + 12, t, .12, { dur: 1.6 }); t += BEAT / 2; k++; }
  [[B(51, 2), 69], [B(51, 2.6), 74], [B(51, 3.3), 76]].forEach(([tt, m], i) => O.mallet('marimba', m, tt, .25 - .02 * i, { dur: 1, rel: .6 }));
  const H = [[T0, 'Dmaj9', [50, 57, 61, 64], 38], [RING, 'Bm9', [47, 54, 57, 61], 35]];
  H.forEach(([tt, c, ns, bs]) => { for (let s = 0; s < 4; s++) O.harp(ns[[0, 2, 1, 3][s]] + 12, tt + s * BEAT, s ? .2 : .26, { dur: 1.8 }); O.pizz(bs, tt, .42, { key: 'cbPizz' }); O.pizz(bs + 7, tt + BEAT * 2, .32, { key: 'cbPizz' }); });
  [[B(51, 2), 43], [B(51, 3), 45]].forEach(([tt, m]) => O.pizz(m, tt, .36, { key: 'cbPizz' }));
  prog([[T0, 'Dmaj9', BAR], [RING, 'Bm9', BEAT * 2], [B(51, 2), 'Gmaj9', BEAT], [B(51, 3), 'A7sus', BEAT]], { lo: 62, hi: 81, n: 3, vel: .24, atk: .9, rel: .9, bassLo: 31, bassK: .7 });
  O.trem([69, 76], T0 - .4, BAR + .6, .2, { atk: 1.2, rel: 1 });
  // home: a warm D major, rolled in the harp, held in the strings with a soft horn, bells; a long natural tail
  O.strings([38, 50, 57, 62, 66, 69, 74, 78], FIN, END - FIN - 1.2, .36, { atk: .5, rel: 1.6, dyn: (u) => 1 - .45 * u });
  O.play('cbSus', 26, FIN, END - FIN - 1.2, .3, { atk: .6, rel: 1.6, dyn: (u) => 1 - .45 * u });
  O.horns([62, 66], FIN + .05, 2.8, .32, { atk: .5, rel: 1.4 });
  [38, 45, 50, 54, 57, 62, 66, 69, 74].forEach((m, i) => O.harp(m, FIN + i * .07, .34 - .015 * i, { dur: 4 }));
  O.mallet('glock', 86, FIN + .5, .22, { dur: 4 }); O.mallet('glock', 93, FIN + 1.1, .16, { dur: 4 }); O.mallet('marimba', 62, FIN, .3, { dur: 2 });
  O.hit('triangle', FIN + .02, .16, { dur: 5, rel: 2.5 });
  // a last single cicada, far away
  X.call(B(52, 2) + .2, 1.8, { st: -5, fall: 4.5, gain: .5, pan: -.55, rev: .45, dist: 3200, from: 30 });
}

module.exports = { glory, ret, epilogue };
