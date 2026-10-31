// Score, part 3 (bars 42-56): the froglet in the rain, growing up, under the ice, spring + finale; UI sounds.
const M = require('./motifs');
const { O, X, B, BEAT, THEME_A, THEME_B, LYRIC, pads, band, ostinato, sing, sparkle } = M;
const { EV, SHOT, CHAPTERS, CLOCK, CALLS } = require('./cues');
const { R, rnd } = O;
const ss = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

function froglet() {
  const T0 = SHOT.froglet;
  X.bed(X.F.COUNTRY, 12, T0 - .3, EV.rain + 1, (t) => .3 * (1 - ss(EV.rain - .4, EV.rain + 1, t)), { muffle: .6 });
  X.play(X.F.RAIN, 6, 14, EV.rain - .8, .85, { bus: 'amb', fi: 1.4, fo: 1, env: (t) => 1 - ss(109.6, 110.6, t) });
  X.play(X.F.STORM, 28.6, 33, EV.rain + .2, .3, { bus: 'amb', fi: .5, fo: 1.5 });
  band(42, ['F', 'Dm', 'Bb', 'C'], { k: .74, marRun: true });
  sing('clarSus', THEME_A, B(42), { k: .66 });
  sing('fluteSus', THEME_B, B(44), { k: .6 }); sing('vlnPizz', THEME_B.filter((n) => n[2] >= 1), B(44), { tr: -12, k: .4 });
  [72, 77, 81, 84].forEach((m, i) => O.mallet('marimba', m, EV.climb + i * .09, .45, { dur: .5 })); X.splashS(EV.climb + .4, 3, .45, { pan: -.1 });
  // rain on the pond: plucked droplets in F pentatonic
  for (let i = 0; i < 46; i++) { const t = EV.rain + .3 + R(0, 5.6), m = [77, 79, 81, 84, 86][Math.floor(rnd() * 5)]; O.pizz(m, t, R(.18, .34), { key: 'vlnPizz', pan: R(-.8, .8) }); }
  sparkle('glock', [89, 91, 93, 96], EV.rain + .5, 5, 7, .14);
  // first tongue strike
  X.tongue(EV.tongue1, 1); X.gulp(EV.tongue1 + .45, .6);
  [72, 77, 81, 84, 89].forEach((m, i) => O.mallet('xylo', m, EV.tongue1 - .02 + i * .025, .4, { dur: .4 }));
  O.pizz(53, EV.tongue1 + .12, .7); O.pizz(65, EV.tongue1 + .12, .6);
  X.whoosh(SHOT.grow - .5, 1, .7, { f0: 600, f1: 2400 }); O.gliss(SHOT.grow - .4, .5, 77, 96, .35);
}

function grow() {
  const T0 = SHOT.grow;
  X.bed(X.F.COUNTRY, 40, T0 - .2, 116.9, (t) => .42 * (1 - ss(116.2, 116.9, t)), { muffle: 0 });
  X.play(X.F.FLY, 4, 6.2, T0 + .3, .28, { fi: .3, fo: .05, pan: .35, env: (t) => (t < EV.tongue2 + .05 ? 1 : 0) });
  X.play(X.F.BEE, 2, 5.5, 113.2, .22, { fi: .6, fo: 1, pan: -.4 });
  // summer pastoral: harp + flute sing the life theme over pizz
  sing('fluteSus', LYRIC.slice(0, 6), T0, { k: .6 });
  ostinato('harp', ['F', 'C/E'], T0, 2.4, BEAT / 2, [0, 2, 1, 3], .3, { lo: 53, hi: 74 });
  pads(['F', 'C/E'], T0, 2.4, { vel: .24, lo: 60, hi: 74, atk: .6 });
  [[46, 41], [47, 40]].forEach(([b, r]) => { O.pizz(r, B(b), .55); O.pizz(r + 7, B(b, 2), .42); });
  X.tongue(EV.tongue2, 1); X.gulp(EV.tongue2 + .42, .8);
  O.line('clarSus', [[EV.tongue2 + .2, 84, .1, .6], [EV.tongue2 + .3, 81, .1, .6], [EV.tongue2 + .4, 77, .3, .65]], { rel: .2 });
  // time-lapse: the seasons turn
  X.whoosh(113.4, 1.3, .6, { f0: 400, f1: 3000 });
  for (let s = 0; s < 16; s++) O.mallet('glock', [77, 81, 84, 89][s % 4] + (s >= 8 ? 2 : 0), 113.4 + s * .075, .2);
  O.trem([65, 69, 72], 113.4, 1.2, .26, { atk: .4, dyn: (u) => .5 + .5 * u });
  // autumn: a wistful oboe in D minor over warm strings
  pads(['Dm', 'Bbmaj7'], EV.autumn, 1.5, { vel: .32, lo: 57, hi: 74, atk: .6 });
  O.line('oboe', O.phrase([[0, 74, 1, .8], [1, 72, .5, .7], [1.5, 70, .5, .7], [2, 69, 1.5, .8], [3.5, 67, .5, .65], [4, 65, 1, .7]], EV.autumn), { vel: .75 });
  for (let i = 0; i < 5; i++) O.harp(84 - i * 3, EV.autumn + .3 + i * .45, .25);
  X.splashB(116.7, 2, .65); O.gliss(116.6, .7, 84, 53, .35);
  X.whoosh(SHOT.winter - .6, 1.2, .7, { f0: 2400, f1: 250 }); X.bubbles(SHOT.winter - .3, 1, 28, 1.5, 5, .6); X.blub(SHOT.winter, 0, .4);
}

function winter() {
  const T0 = SHOT.winter;
  X.bed(X.F.NIGHT, 5, T0 - .2, SHOT.spring + .2, () => .22, { muffle: 1, floor: 300 });
  X.glassTone(74, T0 + .2, 4.4, .65); X.glassTone(81, T0 + .9, 3.6, .5); X.glassTone(77, T0 + 1.8, 2.8, .45);
  O.strings([38, 57, 62], T0, 4.8, .22, { atk: 1.4, rel: 1 });
  O.line('clarSus', [[T0 + .6, 62, 2, .4], [T0 + 2.8, 60, 1.6, .38]], { rel: 1 });
  O.harp(38, T0 + .3, .4, { dur: 4 }); O.harp(45, 120.0, .32, { dur: 3 }); O.harp(57, 121.0, .26, { dur: 3 });
  for (let t = 118.2; t < 122.2; t += 1.8) { X.heartbeat(t, .45); O.timp(50, t, .16, { dur: 1 }); }
  X.creak(118.0, .9); X.creak(119.6, .7); X.creak(121.1, .8);
  O.trem([69, 74], 120.6, 1.8, .3, { atk: .8, dyn: (u) => .3 + .7 * u * u });
  O.swell('swellMed', SHOT.spring, .5);
}

function spring() {
  const T0 = SHOT.spring;
  X.iceCrack(T0 - .1, .8); O.hit('cymHit', T0, .5, { dur: 4 }); O.timp(41, T0 + .02, .75); X.thump(T0 + .03, .5, { f: 44, dec: .3 });
  O.gliss(T0, .6, 53, 96, .5, { curve: .75 });
  O.strings([29, 41, 48, 57, 65, 72, 81], T0, 2.5, .55, { atk: .08, rel: 1 });
  O.strings([41, 53, 60, 69, 74], T0 + 2.4, 1.2, .38, { atk: .3, rel: .8 });
  for (let s = 0; s < 16; s++) O.mallet('glock', [77, 81, 84, 89][s % 4] + (s >= 8 ? 4 : 0), T0 + .1 + s * .15, .2);
  X.play(X.F.ROBIN, 0, 2.2, T0 + .8, .5, { pan: .5, rev: .2 }); X.play(X.F.BLACKBIRD, 0, 3.6, T0 + 1.9, .42, { pan: -.5, rev: .2 });
  X.bed(X.F.DAWN, 120, T0 + .5, 133.6, (t) => .32 * (1 - ss(131.5, 133.5, t)), { muffle: .5 });
  [[123.1, 89], [123.25, 91], [123.4, 89], [123.55, 91], [123.7, 93]].forEach(([t, m]) => O.play('fluteSus', m, t, .12, .35, { rel: .1 }));
  X.whoosh(EV.swimUp - .4, 1, .8, { f0: 400, f1: 3000 }); X.splashS(EV.swimUp + .5, 4, .6);
  // the call again: the band, the theme, real croaks answered by the bassoon
  X.play(X.F.CHORUS2, 40, 50, 125.0, .5, { bus: 'amb', fi: 1.2, fo: 1.5, env: (t) => 1 - ss(131, 133, t) * .7 });
  band(52, ['F', 'Dm'], { k: .8, marRun: true });
  sing('clarSus', THEME_A, B(52), { k: .66 }); sing('fluteSus', THEME_A, B(52), { tr: 12, k: .4 });
  EV.croak1.forEach((c, i) => { X.croak(c, 4 + i, 1.1); O.play('bsnStac', 41 + i * 7, c + .45, .2, .5, { rel: .08 }); O.play('bsnStac', 48 + i * 5, c + .63, .2, .55, { rel: .08 }); });
  sparkle('glock', [89, 93, 96, 101], EV.spawn2, 1.2, 7, .2); O.trem([81, 84, 89], EV.spawn2, 1.4, .26, { atk: .4 }); O.hit('bellTree', EV.spawn2, .3, { dur: 3 });
  // the pull back: the full ensemble carries theme B to the final cadence
  const P = EV.pull;
  O.swell('swellShort', P, .45); O.timp(46, P, .75);
  O.strings([34, 46, 53, 62, 70, 74], P, 1.25, .6, { atk: .08, rel: .5 });
  O.strings([36, 48, 55, 64, 70, 76], P + 1.2, .65, .58, { atk: .08, rel: .4 });
  sing('vlnSus', THEME_B.slice(0, 4), P, { k: .78 }); sing('horn', THEME_B.slice(0, 4), P, { tr: -12, k: .62 });
  O.roll(48, P + 1.2, .6, .6, { dyn: (u) => .4 + .6 * u, rel: .1 });
  // end title: F major, everything rings
  const E = EV.endTitle;
  O.timp(41, E, .9); O.hit('crash', E, .55, { dur: 5 }); O.hit('gong', E, .25, { dur: 6 }); X.thump(E, .8, { f: 43, dec: .4 });
  O.strings([29, 41, 48, 57, 65, 72, 81], E, 2.2, .66, { atk: .05, rel: 1.4, dyn: (u) => 1 - .35 * u });
  [53, 60, 69].forEach((m) => O.play('horn', m, E, 2, .7, { atk: .04, rel: 1, dyn: (u) => 1 - .3 * u }));
  O.line('fluteSus', [[E, 81, .3, .6], [E + .3, 79, .3, .55], [E + .6, 77, 1.3, .6]], { rel: .8 });
  O.gliss(E, .6, 53, 96, .45, { curve: .7 }); [89, 93, 96].forEach((m, i) => O.mallet('glock', m, E + .25 + i * .15, .3));
  X.croak(EV.lastCroak, 2, 1.25, { rev: .25 });
  O.pizz(41, EV.lastCroak + .55, .6); O.pizz(53, EV.lastCroak + .55, .55); O.harp(65, EV.lastCroak + .56, .45, { dur: 2 });
}

function ui() {
  CHAPTERS.forEach(([a], i) => X.drop(a + .38, i + 2, .32, { pan: -.6 }));
  for (let i = 1; i < CLOCK.length; i++) if (CLOCK[i - 1][2]) { X.blub(CLOCK[i][0], i, .22, { pan: .7 }); X.bubble(CLOCK[i][0] + .02, 1.3, .4, { pan: .7 }); }
  CALLS.forEach(([a], i) => X.drop(a + .05, i, .1, { pan: R(-.3, .3), cut: 5000 }));
}

module.exports = { froglet, grow, winter, spring, ui };
