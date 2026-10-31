// Score, part 1 (bars 0-21): night pond + title, the call at dawn, amplexus, frogspawn, the embryo.
const M = require('./motifs');
const { O, X, B, BEAT, THEME_A, THEME_B, LYRIC, pads, band, ostinato, sing, sparkle } = M;
const { EV, SHOT } = require('./cues');
const { R, rnd } = O;
const ss = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

function night() {
  X.bed(X.F.CHORUS2, 8, 0, 12.6, (t) => .75 * ss(0, 1.6, t) * (1 - .8 * ss(10.4, 12.2, t)));
  X.bed(X.F.CRICKET, 3, 0, 12.4, (t) => .2 * ss(0, 2, t) * (1 - ss(10.6, 12.2, t)));
  // a still, open pad: Fadd9 -> Dm9, celli drone, violins very high and soft
  O.strings([41, 60, 69, 79], .2, 4.9, .3, { atk: 2.6, rel: 1.4 });
  O.strings([38, 60, 69, 77], 4.8, 2.6, .32, { atk: 1.2, rel: 1 });
  [[0, [41, 48, 57, 67]], [1, [41, 48, 57, 72]], [2, [38, 45, 53, 64]]].forEach(([b, ns]) => O.arp(ns, B(b), BEAT / 2, .34));
  sparkle('glock', [89, 91, 93, 96, 98], .6, 6.2, 7, .16);
  // the eyes surface: a glint, then a flute hints at the theme
  O.mallet('glock', 93, EV.eyes, .32); O.harp(81, EV.eyes + .02, .4);
  X.blub(EV.eyes - .15, 0, .35, { cut: 3000 });
  O.line('fluteSus', [[2.95, 72, .4, .5], [3.4, 74, .25, .45], [3.65, 77, 1.1, .55]], { rel: .6 });
  // two calls, each answered by the orchestra: bassoon hops, then celli pizz
  X.croak(EV.croak0[0], 2, 1); X.croak(EV.croak0[1], 3, 1.05);
  O.play('bsnStac', 41, EV.croak0[0] + .45, .2, .5, { rel: .1 }); O.play('bsnStac', 48, EV.croak0[0] + .65, .2, .55, { rel: .1 });
  O.pizz(57, EV.croak0[1] + .45, .55); O.pizz(53, EV.croak0[1] + .62, .5); O.pizz(62, EV.croak0[1] + .8, .45);
  // title: timpani roll + cymbal swell into a soft tutti bloom; the theme rises with the letters
  O.roll(41, 5.4, 1.9, .55, { dyn: (u) => .25 + .75 * u * u, rel: .25 });
  O.swell('swellMed', EV.title, .42);
  O.timp(41, EV.title, .55); O.hit('cymHit', EV.title, .4, { dur: 4 });
  O.strings([29, 41, 48, 57, 65, 72, 81], EV.title, 2.5, .5, { atk: .12, rel: 1 });
  O.strings([34, 46, 53, 62, 70, 74], EV.title + 2.4, 1.3, .42, { atk: .25, rel: .6 });
  O.strings([33, 45, 53, 60, 69, 77], EV.title + 3.6, 1.6, .4, { atk: .25, rel: 1.4, dyn: (u) => 1 - .5 * u });
  O.play('horn', 53, EV.title, 2.2, .5, { atk: .15, rel: .8 }); O.play('horn', 60, EV.title + .05, 2.2, .42, { atk: .15, rel: .8 });
  O.gliss(EV.title, .7, 53, 89, .5, { curve: .8, cresc: 1 });
  [89, 93, 96].forEach((m, i) => O.mallet('glock', m, EV.title + .4 + i * .14, .3));
  sing('fluteSus', THEME_A, EV.title, { k: .72 });
  sing('harp', THEME_A, EV.title, { tr: -12, k: .45 });
  sing('glock', THEME_A.filter((n) => n[2] >= 1), EV.title, { k: .2 });
  // drips from the letter feet (matching type.title): real water drops
  for (let i = 0; i < 4; i++) for (let k = 0; k < 3; k++) { const h = ((i * 7 + k) * 2654435761 >>> 0) / 4294967296; X.drop(EV.title + i * .11 + .55 + k * .23 + h * .2 + .2, i * 3 + k, .32, { pan: -.4 + i * .27 }); }
  // the letters sink; the camera dives
  O.gliss(10.3, .8, 84, 60, .32, { curve: 1.2 });
  X.whoosh(EV.dive - .35, 1.4, .7, { f0: 2600, f1: 280 }); X.splashB(EV.dive + .3, 0, .45, { cut: 4000 }); X.blub(EV.dive + .45, 1, .5); X.bubbles(EV.dive + .4, 1, 26, 1.5, 5, .5);
}

function call() {
  X.bed(X.F.DAWN, 40, 11.8, 18.4, (t) => .5 * ss(11.8, 12.8, t) * (1 - ss(17.4, 18.3, t)), { muffle: .55 });
  X.play(X.F.CHORUS1, 20, 27, SHOT.call, .2, { bus: 'amb', fi: .8, fo: 1, cut: 3800 });
  band(5, ['F', 'Dm'], { k: .7, clar: false, marRun: true });
  O.pizz(46, B(7), .8); O.play('bsnStac', 34, B(7), .2, .55, { rel: .08 }); O.hit('logLo', B(7), .5); O.hit('shaker', B(7, .5), .4, { dur: .3 });
  EV.calls.forEach((c, i) => X.croak(c, i, .5, { pan: i % 2 ? .18 : -.04 }));
  sing('clarSus', THEME_A, B(5), { k: .62 });
  O.strings([57, 65, 72], B(5), 2.45, .26, { atk: .5 }); O.strings([57, 62, 69], B(6), 2.45, .26, { atk: .4 });
  // the female swims in: a flute flourish over a harp ripple
  O.line('fluteSus', [[EV.female, 81, .14, .5], [EV.female + .14, 84, .14, .5], [EV.female + .28, 86, .6, .55]], { rel: .3 });
  O.gliss(EV.female - .1, .5, 65, 84, .3);
  // the lunge
  [72, 77, 81, 84].forEach((m, i) => O.mallet('xylo', m, EV.grab - .3 + i * .08, .5, { dur: .6 }));
  O.mallet('xylo', 89, EV.grab, .6, { dur: 1 }); O.timp(41, EV.grab, .7);
  [53, 60, 65, 69, 72, 77].forEach((m) => O.spic(m, EV.grab, .75));
  X.splashS(EV.grab + .05, 1, .7, { pan: .15 });
  X.whoosh(SHOT.amplex - .5, 1, .6, { f0: 2000, f1: 300 }); X.blub(SHOT.amplex - .1, 2, .45); X.bubbles(SHOT.amplex - .2, .8, 22, 1.5, 5, .5);
}

function amplexus() {
  // underwater: muffled pond, a romantic cello song over soft strings and a flowing harp
  X.bed(X.F.FIELD, 30, 17.6, 33.8, (t) => .45, { muffle: 1 });
  pads(['F', 'C/E', 'Bbmaj7'], SHOT.amplex, 2.4, { vel: .3, lo: 60, hi: 79, atk: .9, bassLo: 36, bassK: .7 });
  O.line('vcSus', O.phrase(LYRIC.slice(0, 6), SHOT.amplex, -24), { vel: .72, atk: .12 });
  O.line('vlnSus', O.phrase(LYRIC.slice(6, 9), SHOT.amplex, -12), { vel: .5, atk: .2 });
  const fl = { F: [41, 48, 57, 60, 65, 60, 57, 48], 'C/E': [40, 48, 55, 60, 64, 60, 55, 48], Bbmaj7: [34, 46, 53, 57, 62, 57, 53, 46] };
  ['F', 'C/E', 'Bbmaj7'].forEach((c, j) => fl[c].forEach((m, i) => O.harp(m + 12, SHOT.amplex + j * 2.4 + i * .3, i ? .26 : .34, { dur: 1.6 })));
  O.play('horn', 65, EV.pads, 1.8, .32, { atk: .4, rel: .8 });
  X.play(X.F.ONE, 12.8, 14.5, EV.pads + .5, .7, { cut: 800, fi: .2, fo: .4 });
  // eggs stream out: glassy glock drops and bubbles; fertilisation shimmers
  sparkle('glock', [84, 86, 89, 91, 93], EV.eggs, 3, 9, .14);
  for (let i = 0; i < 26; i++) X.bubble(EV.eggs + i * (3 / 26) + R(0, .05), R(1, 1.8), .4, { rev: .45 });
  [EV.eggs + .1, EV.eggs + 1.1, EV.eggs + 2.2].forEach((t, i) => X.blub(t, i + 2, .3));
  O.trem([81, 84], EV.fert, 2.4, .32, { atk: .8, dyn: (u) => Math.sin(Math.PI * Math.min(1, u * 1.1)) });
  O.hit('triangle', EV.fert, .35, { dur: 3 }); O.hit('bellTree', EV.fert + .05, .35, { dur: 3 });
  X.bubbles(SHOT.spawn - .6, 1.1, 46, 1, 5, .8); X.blub(SHOT.spawn - .3, 3, .5); X.whoosh(SHOT.spawn - .55, 1.1, .5, { f0: 300, f1: 2200 });
}

function frogspawn() {
  // time-lapse clockwork: marimba + harp ostinati over pizz roots; theme B soars as the clump rises to the sun
  const prog = ['F', 'Fmaj7', 'C', 'Gm7'];
  ostinato('marimba', ['F', 'Fmaj7'], B(10), 2.4, BEAT / 4, [0, 2, 1, 3, 2, 1, 3, [0, 1]], .3, { lo: 65, hi: 84, acc: 4 });
  ostinato('marimba', ['C', 'C7'], B(12), 1.2, BEAT / 4, [0, 2, 1, 3, 2, 1, 3, [0, 1]], .36, { lo: 67, hi: 86 });
  ostinato('marimba', ['Gm7', 'F'], B(13), 1.2, BEAT / 4, [0, 2, 1, 3, 2, 1, 3, [0, 1]], .4, { lo: 67, hi: 86 });
  ostinato('harp', prog, B(10), 2.4, BEAT / 2, [0, 2, 1, 3], .28, { lo: 53, hi: 72 });
  prog.forEach((c, j) => { const r = M.O.bassOf(c, 41); O.pizz(r, B(10 + j), .7); O.pizz(r + 7, B(10 + j, 2), .55); });
  pads(prog, B(10), 2.4, { vel: (i) => .26 + i * .07, lo: 60, hi: 76, atk: .6, bassLo: 36 });
  for (let i = 0; i < 5; i++) X.blub(EV.swell + i * .9, i, .22, { cut: 2500 });
  sing('fluteSus', THEME_B, B(12), { k: .68 });
  sing('clarSus', THEME_B, B(12), { dia: -2, k: .45, until: B(13, 2) });
  O.gliss(EV.rise, 1.2, 53, 84, .38, { cresc: 1 });
  O.trem([77, 81, 84], B(13, 2), 1.4, .35, { atk: .6, dyn: (u) => .4 + .6 * u });
  O.swell('swellShort', SHOT.embryo, .5); X.whoosh(EV.zoom - .1, 1.4, .7, { f0: 300, f1: 4200 });
  O.hit('cymHit', SHOT.embryo, .35, { dur: 4 }); X.thump(SHOT.embryo, .7, { f: 46, dec: .3 });
}

function embryo() {
  const T0 = SHOT.embryo;
  X.glassTone(89, T0 + .6, 3, .7); X.glassTone(84, T0 + 1.4, 2.4, .55);
  O.strings([41, 77, 84], T0, 2.4 * 2.6, .26, { atk: 1.4, rel: 1.2 });
  O.harp(41, T0 + .1, .5, { dur: 4 }); O.harp(48, T0 + 1.3, .35, { dur: 3 });
  // every cell division lands on the beat: a pluck that climbs with the cell count + a real bubble pop
  const ladder = [65, 69, 72, 77, 81, 84, 89];
  EV.divisions.forEach((t, i) => {
    O.harp(ladder[i], t, .55); if (ladder[i] >= 79) O.mallet('glock', ladder[i], t, .3); else O.pizz(ladder[i] + 12, t, .35);
    X.blub(t - .02, i, .28, { pan: R(-.3, .3) });
    if (i) O.mallet('marimba', ladder[i - 1] + 12, t + .3, .22, { dur: .6 });
  });
  for (let s = 0; s < 8; s++) O.mallet('glock', [89, 93, 96, 101][s % 4], EV.divisions[6] + .3 + s * .075, .32 - s * .025);
  // morula -> blastula: clockwork marimba in F
  ostinato('marimba', ['F', 'Fadd9'], B(16, 2), 1.2, BEAT / 2, [0, 2, 1, 3], .28, { lo: 65, hi: 84 });
  // gastrulation: the mood turns to D minor; low clarinet over bassoon and celli
  const T1 = B(17);
  O.line('clarSus', [[T1, 62, 1.1, .6], [B(17, 2), 64, .5, .5], [B(17, 3), 65, 1.6, .6], [B(18), 62, 1.1, .55], [B(18, 2), 60, .6, .5], [B(18, 3), 58, 1.6, .58]], { vel: .9, rel: .5 });
  O.play('bsnSus', 38, T1, 2.4, .45, { atk: .5, rel: .6 }); O.play('bsnSus', 34, B(18), 2.4, .45, { atk: .4, rel: .6 });
  pads(['Dm', 'Bb'], T1, 2.4, { vel: .3, lo: 57, hi: 74, atk: .7, bass: false });
  ostinato('marimba', ['Dm', 'Bb'], T1, 2.4, BEAT / 2, [0, 2, 1, 3, 0, 2, [1, 1], 3], .26, { lo: 62, hi: 82 });
  for (let s = 0; s < 4; s++) O.pizz([50, 45, 46, 41][s], B(17 + s * .5), .55);
  // the neural tube zips shut: a rising violin line resolving into F
  const T2 = B(19);
  O.line('vlnSus', [74, 76, 77, 79, 81, 82, 84].map((m, i) => [T2 + i * .3, m, i === 6 ? 1.2 : .3, .5 + i * .04]), { rel: .5 });
  pads(['Gm7', 'C7'], T2, 1.2, { vel: .34, lo: 55, hi: 72, atk: .3 });
  O.gliss(B(19, 3.2), .45, 60, 84, .3, { cresc: 1 });
  // tailbud + heartbeat: tremolo strings swell, timpani on every beat, glock climbing to the hatch
  const T3 = B(20);
  O.strings([29, 41, 60, 69], T3, 4.8, .34, { atk: 1, dyn: (u) => .6 + .4 * u });
  O.trem([65, 69, 72], T3, 4.8, .3, { atk: .6, dyn: (u) => .5 + .5 * u * u });
  for (let t = EV.heart; t < EV.hatchOut - .1; t += BEAT) { O.timp(41, t, .3, { dur: 1 }); X.heartbeat(t, .5); }
  O.line('bsnSus', [[T3, 41, 2.3, .4], [B(21), 36, 1.1, .42], [B(21, 2), 38, 1, .44]], { rel: .3 });
  for (let s = 0; s < 14; s++) O.mallet('glock', 84 + [0, 4, 7, 12][s % 4] + Math.floor(s / 4) * 2, B(21, s * .25), .14 + s * .015);
  O.swell('swellMed', EV.hatchOut, .45);
  // hatch!
  O.gliss(EV.hatchOut, .5, 65, 96, .5, { curve: .7 }); [53, 60, 65, 72].forEach((m) => O.pizz(m, EV.hatchOut, .7));
  O.line('fluteSus', [[EV.hatchOut + .05, 84, .12, .55], [EV.hatchOut + .17, 86, .12, .55], [EV.hatchOut + .29, 89, .7, .6]], { rel: .4 });
  O.hit('cymHit', EV.hatchOut, .3, { dur: 3 }); X.splashS(EV.hatchOut + .05, 5, .35, { cut: 3000 }); X.blub(EV.hatchOut + .1, 4, .4);
  X.whoosh(SHOT.hatch - .55, 1.1, .5, { f0: 3000, f1: 400 });
}

module.exports = { night, call, amplexus, frogspawn, embryo };
