// Score, part 2 (bars 22-41): hatchlings, tadpole life + the dragonfly-nymph ambush, legs, the metamorphosis.
const M = require('./motifs');
const { O, X, B, BEAT, THEME_A, THEME_B, LYRIC, pads, band, ostinato, sing, sparkle } = M;
const { EV, SHOT } = require('./cues');
const { R, rnd } = O;
const ss = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

function hatchling() {
  // curious duet: clarinet asks, flute answers, over pizz and a light marimba
  const T0 = SHOT.hatch;
  X.bed(X.F.FIELD, 50, T0 - .4, SHOT.tadpole + .4, () => .42, { muffle: 1 });
  O.harp(65, T0, .55); O.harp(69, T0 + .3, .5); O.harp(72, T0 + .6, .5);
  pads(['F', 'Gm7', 'C7', 'F'], T0, 2.4, { vel: .26, lo: 60, hi: 76, atk: .6 });
  const ask = [[0, 77, .5, .8], [.5, 79, .5, .8], [1, 81, 1.5, .9], [3, 77, 1, .75]], answer = [[0, 82, .5, .8], [.5, 81, .5, .8], [1, 79, 1.5, .85], [3, 76, .5, .7], [3.5, 77, .5, .7]];
  sing('clarSus', ask, B(22), { tr: -12, k: .6 }); sing('fluteSus', answer, B(23), { k: .6 });
  [[22, 41], [23, 43], [24, 36], [25, 41]].forEach(([b, r]) => { O.pizz(r, B(b), .6); O.pizz(r + 7, B(b, 2), .45); O.pizz(r + 12, B(b, 3), .4); });
  for (let s = 0; s < 8; s++) O.hit('shaker', B(22, s), .3, { dur: .3 });
  X.whoosh(EV.wriggle - .05, .4, .5, { f0: 500, f1: 1600 }); X.bubbles(EV.wriggle, .4, 18, 1, 2.5, .5);
  O.mallet('marimba', 84, EV.wriggle, .3); O.mallet('marimba', 81, EV.wriggle + .12, .26);
  // time-lapse as the operculum grows: busy marimba + spiccato violins, chords climbing
  ostinato('marimba', ['C7', 'F'], B(24), 2.4, BEAT / 4, [0, 1, 2, 3, [0, 1], 3, 2, 1], .3, { lo: 67, hi: 86 });
  ostinato('vlnSpic', ['C7', 'F'], B(24), 2.4, BEAT / 2, [0, 2, 1, 3], .32, { lo: 64, hi: 79 });
  O.mallet('glock', 89, EV.oper + 2, .3); O.mallet('glock', 93, EV.oper + 2.3, .25);
  O.line('fluteSus', [[EV.swimOff - .3, 77, .1, .5], [EV.swimOff - .2, 81, .1, .5], [EV.swimOff - .1, 84, .1, .55], [EV.swimOff, 89, .5, .6]], { rel: .3 });
  X.whoosh(SHOT.tadpole - .55, 1, .85, { sweep: 1.6, f0: 300, f1: 1800 }); X.blub(SHOT.tadpole - .2, 2, .35);
}

function tadpole() {
  const T0 = SHOT.tadpole;
  X.bed(X.F.FIELD, 64, T0, SHOT.legs + .4, (t) => .45 * (1 - .4 * ss(69.6, 71, t)), { muffle: 1 });
  X.bed(X.F.AIRLOCK, 10, T0, 69.8, () => .07, { muffle: 1, floor: 900 });
  // the pond band, full: theme A (clarinet) then theme B (flute + clarinet)
  band(26, ['F', 'Dm', 'Bb', 'C'], { k: .78, marRun: true, clar: true });
  sing('clarSus', THEME_A, B(26), { k: .68 });
  sing('xylo', THEME_A.filter((n) => n[3] >= .9), B(26), { k: .26, maxD: .5 });
  sing('fluteSus', THEME_B.slice(0, 7), B(28), { k: .62 }); sing('clarSus', THEME_B.slice(0, 7), B(28), { dia: -2, k: .4 });
  O.strings([57, 65, 72], B(26), 4.8, .22, { atk: .6 }); O.strings([58, 65, 70], B(28), 2.4, .22, { atk: .5 });
  // grazing: tiny scrapes; a gulp of air at the surface
  for (let t = EV.graze; t < EV.graze + 2.2; t += .15) O.hit('guiroHit', t + R(-.02, .02), .12, { dur: .2, rel: .05, gain: -6 });
  X.blub(EV.gulp, 0, .5); X.gulp(EV.gulp + .1, .7); X.bubbles(EV.gulp + .2, .4, 16, 2, 4, .55);
  // danger: D minor, low tremolo, creeping bassoon, muted horns, the drum quickens
  const D0 = B(29);
  O.strings([38, 50, 57], D0, 7.2, .46, { atk: 1, dyn: (u) => .55 + .45 * u });
  O.trem([50, 51], B(29, 2), 5.4, .42, { atk: .8, dyn: (u) => .4 + .6 * u });
  O.trem([62, 63], EV.nymph, 1.9, .3, { atk: .5, dyn: (u) => .3 + .7 * u });
  [[0, 38], [1.5, 39], [3, 38], [4, 37], [5.5, 38], [6, 41], [7, 40]].forEach(([b, m]) => O.play('bsnStac', m + 12, B(29, b), .25, .6, { rel: .08 }));
  [[0, 38], [1.5, 39], [3, 38], [4, 37], [5.5, 38], [6, 41], [7, 40]].forEach(([b, m]) => O.pizz(m, B(29, b), .6));
  for (let b = 0; b < 7; b++) O.timp(45, B(29, b), .22 + b * .05, { dur: 1 });
  O.play('hornMute', 50, EV.nymph, 1.5, .55, { atk: .3, dyn: (u) => .4 + .6 * u }); O.play('hornMute', 56, EV.nymph, 1.5, .5, { atk: .3, dyn: (u) => .4 + .6 * u });
  O.roll(50, EV.nymph + .3, EV.strike - EV.nymph - .3, .5, { dyn: (u) => .2 + .8 * u * u, rel: .1 });
  O.swell('swellShort', EV.strike, .45);
  // STRIKE: an orchestral hit
  O.timp(50, EV.strike, .95); O.timp(45, EV.strike + .02, .55); O.hit('bdrum', EV.strike, .65); O.hit('crash', EV.strike, .5, { dur: 3 });
  [38, 50, 53, 57, 62, 65, 69, 74].forEach((m) => O.spic(m, EV.strike, .8, { dur: .4 }));
  O.play('horn', 50, EV.strike, .7, .85, { atk: .01, rel: .3 }); O.play('horn', 57, EV.strike, .7, .8, { atk: .01, rel: .3 });
  X.snap(EV.strike, .42); X.thump(EV.strike + .01, .55, { f: 42, dec: .35 }); X.whoosh(EV.strike - .06, .25, .7, { f0: 800, f1: 4200 });
  // scatter: scurrying xylophone + flute staccato, pizz flicks, whooshes
  for (let s = 0; s < 22; s++) { const m = [74, 77, 81, 86, 81, 77][s % 6] - (s > 11 ? 2 : 0), t = EV.strike + .3 + s * .09; O.mallet('xylo', m, t, .32, { dur: .4, pan: R(-.7, .7) }); if (s % 2) O.play('fluteStac', m, t + .045, .1, .4, { rel: .06 }); }
  for (let i = 0; i < 6; i++) { X.whoosh(EV.strike + .3 + i * .22, .3, .45, { f0: 400, f1: 1400 }); O.pizz(62 + i * 3, EV.strike + .35 + i * .22, .4); }
  // calm returns
  pads(['F', 'Bb'], EV.calm, 1.2, { vel: .3, lo: 60, hi: 77, atk: .5 });
  O.harp(65, EV.calm + .1, .5); O.harp(72, EV.calm + .5, .45); O.harp(69, EV.calm + .9, .45); O.harp(77, EV.calm + 1.3, .4);
  X.bubbles(SHOT.legs - .6, 1.1, 46, 1, 5, .75); X.blub(SHOT.legs - .25, 1, .45); X.whoosh(SHOT.legs - .5, 1, .4, { f0: 300, f1: 2000 });
}

function legsMeta() {
  const T0 = SHOT.legs;
  X.bed(X.F.FIELD, 80, T0, 87, (t) => .42 * (1 - ss(85.8, 87, t)), { muffle: 1 });
  // hope: harp + spiccato ostinato under a horn singing the theme slowly
  const prog = ['F', 'Dm', 'Bb', 'C'];
  ostinato('harp', prog, B(32), 2.4, BEAT / 2, [0, 2, 1, 3, [0, 1], 3, 1, 2], .3, { lo: 53, hi: 77 });
  ostinato('vlnSpic', prog, B(32), 2.4, BEAT / 2, [0, 1, 2, 1], .26, { lo: 62, hi: 77 });
  pads(prog, B(32), 2.4, { vel: (i) => .26 + i * .05, lo: 57, hi: 72, atk: .5, bassLo: 36 });
  O.line('horn', O.phrase(THEME_A, B(32), -12, .62, 2).filter(([t]) => t < B(35, 3)), { atk: .12, rel: .4 });
  [EV.bud, 79.8, EV.toes].forEach((t, i) => { O.mallet('glock', 84 + i * 3, t, .3); X.drop(t + .02, i + 4, .22); });
  O.timp(41, EV.kick, .6); O.pizz(65, EV.kick, .6); O.pizz(72, EV.kick + .08, .55); X.whoosh(EV.kick - .05, .3, .6, { f0: 600, f1: 2200 });
  O.swell('swellShort', B(36), .35);
  // the dark stage: heartbeat timpani, low pedal, the thyroid glows
  const D0 = B(36);
  O.strings([26, 38, 45, 50], D0, 2.6, .44, { atk: .6 });
  for (let t = D0; t < EV.pop - .1; t += BEAT) { O.timp(50, t, .32 + (t - D0) * .1, { dur: 1 }); X.heartbeat(t, .45); }
  X.glassTone(86, EV.thyroid, 1.6, .6); O.trem([81, 86], EV.thyroid, 1.8, .26, { atk: .5 });
  O.hit('bellTree', EV.thyroid, .3, { dur: 3 }); sparkle('glock', [86, 89, 93, 98], EV.thyroid, 1.5, 6, .18);
  O.swell('swellShort', EV.pop, .5);
  // POP: the left arm bursts out through the spiracle
  O.timp(50, EV.pop, .95); O.hit('bdrum', EV.pop, .75); O.hit('cymHit', EV.pop, .6, { dur: 3 }); X.thump(EV.pop, .9, { f: 44, dec: .3 });
  [50, 57, 62, 65, 69, 74].forEach((m) => O.spic(m, EV.pop, .9, { dur: .35 })); X.splashS(EV.pop, 2, .3, { cut: 2500 });
  // driving build: Dm Bb F C | Dm Bb Gm A, spiccato strings, drums, horns swelling, the theme in minor
  const prog2 = ['Dm', 'Bb', 'F', 'C', 'Dm', 'Bb', 'Gm', 'A'];
  prog2.forEach((c, j) => {
    const t = EV.pop + j * 1.2, k = .62 + j * .045, v = M.O.voice(c, 62, 77, 3), r = M.O.bassOf(c, 38);
    for (let s = 0; s < 8; s++) { O.spic(v[s % 3] + (s % 4 === 3 ? 12 : 0), t + s * .15, (s % 2 ? .5 : .66) * k); }
    for (let s = 0; s < 4; s++) O.spic(r + 12 * (s % 2), t + s * .3, .6 * k, { key: 'vcSpic' });
    O.pizz(r - 12 < 28 ? r : r - 12, t, .8 * k);
    O.timp(r < 41 ? r + 12 : r, t, .55 * k, { dur: 1.2 });
    for (let s = 0; s < 8; s++) O.hit(s % 4 === 0 ? 'tumba' : s % 2 ? 'conga' : 'quinto', t + s * .15, (s % 4 === 0 ? .6 : .32) * k, { dur: .5 });
    O.strings(v, t, 1.25, .3 * k, { atk: .1, rel: .3 });
  });
  O.play('horn', 57, EV.tail, 2.4, .62, { atk: .5, dyn: (u) => .4 + .6 * u }); O.play('horn', 62, EV.mouthW, 2.4, .66, { atk: .5, dyn: (u) => .4 + .6 * u });
  O.play('horn', 65, EV.lungs, 2.4, .72, { atk: .4, dyn: (u) => .45 + .55 * u }); O.play('horn', 53, EV.lungs, 2.4, .6, { atk: .4 });
  sing('oboe', THEME_A, EV.tail + .6, { dia: -2, k: .85, gain: 4, until: EV.lungs });
  sing('fluteSus', THEME_A, EV.tail + .6, { dia: -2, k: .55, until: EV.lungs });
  X.breath(EV.lungs + .1, 1.1, 1);
  // final climb into the reveal
  O.line('vlnSus', [69, 70, 72, 74, 76, 77, 79, 81].map((m, i) => [B(40) + i * .3, m, .3, .55 + i * .04]), { rel: .3 });
  O.roll(45, B(40), 2.4, .7, { dyn: (u) => .3 + .7 * u * u, rel: .1 });
  for (let s = 0; s < 16; s++) O.hit(s % 2 ? 'conga' : 'tumba', B(40) + s * .15, .3 + s * .035, { dur: .4 });
  O.swell('swellMed', EV.reveal, .6);
  // REVEAL: tutti in F major, the theme in violins and flute
  O.timp(41, EV.reveal, 1); O.hit('crash', EV.reveal, .6, { dur: 5 }); O.hit('bdrum', EV.reveal, .7); O.hit('gong', EV.reveal, .3, { dur: 6 });
  O.strings([29, 41, 48, 57, 65, 72], EV.reveal, 2.4, .7, { atk: .06, rel: 1 });
  [53, 60, 65].forEach((m) => O.play('horn', m, EV.reveal, 2.3, .62, { atk: .04, rel: .8 }));
  O.gliss(EV.reveal, .6, 53, 96, .55, { curve: .7 });
  sing('vlnSus', THEME_A, EV.reveal, { k: .9, gain: 2, until: SHOT.froglet - .2 }); sing('fluteSus', THEME_A, EV.reveal, { tr: 12, k: .62, until: SHOT.froglet - .2 });
  [89, 93, 96, 101].forEach((m, i) => O.mallet('glock', m, EV.reveal + i * .1, .35));
  X.whoosh(SHOT.froglet - .6, 1.2, .9, { f0: 300, f1: 3200 }); X.splashB(SHOT.froglet + .15, 1, .6);
}

module.exports = { hatchling, tadpole, legsMeta };
