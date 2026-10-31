// Score, part 2 (bars 12-30): the drop and the ant, seventeen years underground, the awakening.
const T = require('./theme');
const { O, X, B, BEAT, BAR, THEME, bars, sing, prog, harm, ss, dip } = T;
const { EV, yearTime, moltTime } = require('../cues');
const { R, rnd, PC } = O;

function drop() {
  const T0 = EV.dropStart, LG = EV.letGo, LD = EV.land, ANT = EV.ant, DIG = EV.dig, T1 = EV.undergroundStart;
  const FS = LG + BEAT * .7; // the fall begins after the held breath
  X.bed(X.F.FOREST, 22, T0 - .6, T1 + .4, (t) => .55 * ss(T0 - .6, T0 + .3, t) * (1 - ss(DIG + 1.2, T1, t)), { cut: 8000 });
  X.bed(X.F.FOREST2, 260, T0 - .6, T1, (t) => .18 * (1 - ss(DIG, T1, t)), { cut: 5000, hp: 200 });
  // the held breath: the A9sus thins to a high A + E, a flute holds A, an intake of air
  O.strings([45, 57, 64, 69], T0, LG - T0 + .5, .26, { atk: .1, rel: .7, dyn: (u) => 1 - .45 * u });
  O.play('vlnSus', 81, T0 - .3, FS - T0 + .9, .22, { atk: .5, rel: .7, hp: 800 });
  O.play('vlnSus', 88, T0, FS - T0 + .7, .18, { atk: .6, rel: .7, hp: 900 });
  O.play('fluteSus', 81, LG - .35, FS - LG + .65, .32, { atk: .3, rel: .4, dyn: (u) => .75 + .25 * u });
  X.breath(LG - .55, 1, .65); X.click(LG, .3, { f: 3400, pan: .1 });
  // the fall: harp gliss and a clarinet run down through D minor, violins tumbling in tremolo, falling air
  O.gliss(FS, LD - FS - .08, 93, 50, .4, { scale: 'Dmh', dim: true, curve: .85 });
  const run = [81, 79, 77, 76, 74, 73, 70, 69, 67, 65, 64, 62];
  run.forEach((m, i) => O.play('clarStac', m, FS + i * BEAT / 4, .14, .42 - .015 * i, { rel: .08 }));
  [81, 77, 74, 69, 65, 62].forEach((m, i) => O.play('vlnTrem', m, FS + i * BEAT / 2, BEAT / 2 + .05, .3 - .025 * i, { atk: .03, rel: .15 }));
  X.whoosh(FS - .1, LD - FS + .35, .6, { f0: 3000, f1: 260, skew: .55, sweep: -.4 });
  // landing: a soft thud in the leaf litter
  X.sub(LD, .45, { f: 55, dec: .2 }); X.leaves(LD - .02, .45, .5, { from: 30.2, cut: 3500 });
  O.pizz(38, LD, .62, { key: 'cbPizz' }); O.timp(50, LD, .3); O.harp(38, LD, .4, { dur: 3 });
  // suspense: low cello tremolo; something is coming (tiny legs)
  O.trem([38, 45], LD + .1, ANT - LD - .05, .3, { atk: .6, dyn: (u) => .55 + .45 * u, rel: .25 });
  O.play('vlnSus', 88, LD + .2, ANT - LD + .1, .14, { atk: .8, rel: .4, hp: 900 });
  for (let t = ANT - 1.1; t < DIG + 1.6; t += R(.055, .085)) X.click(t, .12 + .1 * ss(ANT - 1.1, ANT, t), { f: R(5000, 7000), dec: .0018, pan: .5 - .5 * ss(ANT - 1.1, DIG, t) });
  // the ant: timpani, muted-horn stab (D-Eb-Ab), low strings dig in, bassoon creeps chromatically
  O.timp(38, ANT, .82); O.hit('bdrum', ANT, .45, { dur: 2 });
  O.horns([50, 51, 56], ANT, 1.6, .78, { key: 'hornMute', atk: .02, rel: .5, dyn: (u) => (u < .12 ? 1 : .5) });
  O.play('cbSus', 26, ANT, T1 - ANT + .4, .5, { atk: .05, rel: .6, dyn: (u) => .7 + .3 * u });
  O.trem([38, 44], ANT, T1 - ANT, .5, { atk: .05, dyn: (u) => .6 + .4 * u, rel: .4 });
  [38, 39, 38, 41, 40, 39, 43, 42, 41, 44, 43, 46].forEach((m, i) => O.play('bsnStac', m, ANT + BEAT / 2 + i * BEAT / 2, .2, .48 + .02 * i, { rel: .08 }));
  // they dig in: frantic spiccato scurry (D harmonic minor), xylophone flecks, scraping soil
  const sc = [[74, 76, 77, 76], [74, 73, 74, 69], [77, 79, 81, 79], [77, 74, 70, 65]];
  sc.forEach((g, j) => g.forEach((m, q) => {
    const t = DIG + (j * 4 + q) * BEAT / 4, v = (.5 + .25 * ss(DIG, DIG + 1.9, t)) * (j === 3 ? 1 - .12 * q : 1);
    O.spic(m, t, v * (q ? .82 : 1)); O.spic(T.dia(m, -2, 'Dmh'), t, v * .7, { key: 'vlaSpic' });
  }));
  for (let s = 0; s < 8; s++) O.spic(s % 2 ? 45 : 38, DIG + s * BEAT / 2, .62 + .03 * s, { key: 'vcSpic' });
  [[DIG + BEAT * 1.5, [81, 85, 86]], [DIG + BEAT * 2.5, [86, 89, 93]]].forEach(([t, ns]) => ns.forEach((m, i) => O.mallet('xylo', m, t + i * .05, .3, { dur: .4 })));
  for (let k = 0; k < 9; k++) X.scrape(DIG + k * .26 + R(0, .05), .22, .55 + .3 * (k / 9), { cut: 1400 + 300 * (k % 3) });
  X.leaves(DIG, T1 - DIG + .2, .5, { from: 41, rate: 1.25, cut: 3200, env: (t) => .5 + .5 * ss(DIG, T1 - .3, t) });
  // ...and down into the earth: chords slide, a falling whoosh, a muffled boom - the music continues below
  O.strings([62, 65, 70, 74], DIG + BEAT * 2, BEAT, .4, { atk: .05, rel: .3 });
  O.strings([61, 64, 67, 70], DIG + BEAT * 3, BEAT + .1, .42, { atk: .05, rel: .4 });
  O.roll(50, DIG + BEAT * 2, BEAT * 2, .5, { dyn: (u) => .4 + .6 * u, rel: .2 });
  X.whoosh(T1 - 1.3, 1.6, .85, { f0: 3800, f1: 140, curve: .7, skew: .45 });
  X.sub(T1, .7, { f: 40, dec: .45 }); O.timp(38, T1, .55); O.hit('bdRub', T1 - .5, .3, { dur: 2, rel: 1 });
}

function underground() {
  const T0 = EV.undergroundStart, T1 = EV.awakening, W = EV.warm, W18 = EV.warm18;
  // the earth: a low breathing rumble, the forest heard through soil, root creaks, soft drips
  X.rumble(T0 - .4, T1 + 1.5, (t) => .085 + .04 * ss(W, W18, t), { cut: 115 });
  X.bed(X.F.FOREST2, 300, T0 - .4, T1 + .6, () => .32, { cut: 240, fi: .5 });
  [39.6, 45.9, 52.8, 58.4, 63.1].forEach((t, i) => X.creak(t, R(.6, 1), .8 + .2 * (i % 2), { f: R(180, 300) }));
  X.play(X.F.SQUEAK, 20.5, 23.5, 48.6, .1, { cut: 600, fi: .4, fo: .8, rev: .2 });
  [38.9, 42.2, 46.6, 49.4, 53.6, 57.3, 61.1, 64.9].forEach((t, i) => X.drip(t, i * 3, .17, { cut: 2600, pan: R(-.6, .6), rev: .5 }));
  // seasons passing above, filtered as if through soil: spring birds, summer song, autumn wind, rain
  X.bed(X.F.DAWN, 150, yearTime(2), yearTime(5), (t) => .5 * Math.sin(Math.PI * ss(yearTime(2), yearTime(5), t)), { cut: 850, fi: .8, fo: .8 });
  X.bed(X.F.CHORUS, 20, yearTime(5), yearTime(8), (t) => .32 * Math.sin(Math.PI * ss(yearTime(5), yearTime(8), t)), { cut: 700, fi: .8, fo: .8 });
  X.bed(X.F.WIND, 25, yearTime(8), yearTime(12), (t) => .9 * Math.sin(Math.PI * ss(yearTime(8), yearTime(12), t)), { cut: 450, fi: .8, fo: .8 });
  X.bed(X.F.RAINNIGHT, 3, yearTime(12), yearTime(16), (t) => .7 * Math.sin(Math.PI * ss(yearTime(12), yearTime(16), t)), { cut: 900, fi: .8, fo: .8 });

  // ---- years in the dark (bars 15-19, D minor): low strings, the piano's earth line (the theme head inverted)
  const V = [[B(15), [26, 38, 45, 50, 53, 64]], [B(16), [34, 46, 53, 57, 62, 64]], [B(17), [31, 43, 50, 58, 65, 69]], [B(18), [29, 41, 48, 57, 64, 69]], [B(19), [33, 45, 52, 55, 67]]];
  V.forEach(([t, ns], j) => O.strings(ns, t - (j ? 0 : .3), BAR + .12 + (j ? 0 : .3), .3 + .03 * j, { atk: j ? .6 : .25, rel: .55 }));
  O.play('vlaSus', 62, B(19), BEAT * 2 + .1, .38, { atk: .6, rel: .25 }); O.play('vlaSus', 61, B(19, 2), BEAT * 2 + .03, .38, { atk: .12, rel: .3, start: .05 }); // sus4 -> 3: the dominant turns major
  O.play('vlnSus', 81, B(18), BAR * 2 + .3, .18, { atk: 1.5, rel: .9, hp: 600 }); O.play('vlnSus', 76, B(19), BAR + .3, .16, { atk: 1, rel: .9 });
  const P = [[0, 62, 1.5], [1.5, 64, .5], [2, 65, 1], [3, 69, 1], [4, 69, 2], [6, 67, 1], [7, 65, 1], [8, 65, 1.5], [9.5, 67, .5], [10, 69, 1], [11, 74, 1], [12, 72, 2], [14, 69, 1], [15, 67, 1], [16, 64, 1.5], [17.5, 62, .5], [18, 61, 2]];
  P.forEach(([b, m, d]) => O.play('piano', m, B(15) + b * BEAT, d * BEAT + .4, .5 + .1 * (b / 20), { rel: .9, jit: .012 }));
  [[B(15), 38], [B(16), 46], [B(17), 43], [B(18), 41], [B(19), 45]].forEach(([t, m]) => { O.play('piano', m, t, 2.6, .36, { rel: 1 }); O.play('piano', m + 12, t + .015, 2.6, .26, { rel: 1 }); });
  // the root is found: sap - a warm harp arpeggio over Bbmaj7
  [46, 53, 57, 62, 65, 69, 72].forEach((m, i) => O.harp(m, EV.rootFind + i * .11, .32 - .01 * i, { dur: 2.6 }));
  O.hit('triangle', EV.rootFind + .4, .16, { dur: 3, rel: 2 });
  [[B(17), 'Gm9'], [B(18), 'Fmaj7'], [B(19), 'A7sus']].forEach(([t, c]) => { const ns = O.voice(c, 50, 69, 4); [0, 2, 1, 3].forEach((q, s) => O.harp(ns[q], t + s * BEAT, .2, { dur: 1.8 })); });

  // ---- years 6-10 (bars 20-22, D major): the MAIN THEME on the cellos (solo line), harp flowing in 8ths
  sing('vcSus', bars(THEME, 0, 2), B(20), { k: .72, atk: .12, rel: .7 });
  O.strings([74, 78, 81], B(20), BAR + .1, .26, { atk: .8, rel: .5 }); O.strings([74, 78, 83], B(21), BAR + .1, .26, { atk: .5, rel: .7 });
  O.play('cbSus', 38, B(20), BAR + .3, .3, { atk: .6, rel: .9 }); O.play('cbSus', 31, B(21), BAR + .3, .3, { atk: .6, rel: .9 });
  // ---- years 10-17 (bars 22-27): violins (8va) and horns take it higher; celli turn to a counter-line
  const hi = bars(THEME, 2, 7);
  sing('vlnSus', hi, B(22), { oct: 1, k: .64, gain: 1.5, atk: .1, rel: .7, dyn: (u) => .9 + .1 * u });
  sing('horn', hi, B(22), { k: .44, gain: 1, atk: .12, rel: .7 });
  const cello = [[0, 52, 2], [2, 50, 2], [4, 49, 2], [6, 52, 2], [8, 50, 2], [10, 54, 2], [12, 52, 2], [14, 55, 2], [16, 54, 2], [18, 52, 2]];
  O.line('vcSus', O.phrase(cello.map(([b, m, d]) => [b, m, d, .6]), B(22)), { vel: 1, atk: .2, rel: .6 });
  const vg = (t) => .3 + .14 * ss(B(22), W18, t);
  [[B(22), [59, 62], 28], [B(23), [57, 61], 33], [B(24), [59, 62], 31], [B(25), [60, 64], 36], [B(26), [57, 62], 33]].forEach(([t, ns, bs]) => {
    ns.forEach((m) => O.play('vlaSus', m, t, BAR + .1, vg(t), { atk: .6, rel: .5 }));
    O.play('cbSus', bs, t, BAR + .1, vg(t) * .95, { atk: .5, rel: .6 });
  });
  // the harp flows in 8ths under it all (years 6-17)
  const HC = [['D', B(20)], ['Gmaj7', B(21)], ['Em7', B(22)], ['A7', B(23)], ['Gmaj9', B(24)], ['Cmaj7', B(25)], ['A7sus', B(26)]];
  HC.forEach(([c, t]) => { const ns = O.voice(c, 50, 74, 4), seq = [ns[0], ns[2], ns[1], ns[3], ns[2] + 12, ns[3], ns[1], ns[2]]; seq.forEach((m, s) => O.harp(m, t + s * BEAT / 2, (s ? .2 : .26) + .06 * ss(B(20), W18, t), { dur: 1.4 })); });
  [[B(20), 'D'], [B(21), 'Gmaj7'], [B(22), 'Em7'], [B(23), 'A7'], [B(24), 'Gmaj9'], [B(25), 'Cmaj7']].forEach(([t, c]) => O.voice(c, 55, 72, 4).forEach((m, i) => O.play('piano', m, t + i * .03, 2.4, .34, { rel: 1 })));

  // ---- one glock tick (harp an octave below) for every year: a slow line climbing D5 -> B7, a chord tone or a
  //      gentle colour tone on each half bar (Gm9 Fmaj7 Fmaj7 A7sus A7 | D D Gmaj7 Gmaj7 Em7 Em7 A7 A7 Gmaj9 Gmaj9 Cmaj7 Cmaj7)
  const TICK = [74, 76, 77, 79, 81, 83, 85, 86, 88, 90, 91, 93, 95, 98, 100, 103, 107];
  TICK.forEach((m, i) => {
    const t = yearTime(i + 1), u = i / 16;
    O.mallet('glock', m, t, .24 + .1 * u, { dur: 2.5, rel: 1.2 });
    O.harp(m - 12, t + .005, .2 + .07 * u, { dur: 2 });
  });
  for (const y of EV.molts) {
    const mt = moltTime(y);
    X.shimmer(mt - .55, 1.7, .35); X.whoosh(mt - .5, 1.1, .16, { f0: 700, f1: 4200, rev: .5 });
    O.hit('bellTree', mt - .12, .34, { dur: 4, rel: 1.5 }); O.swell('swellShort', mt + .3, .12, { tail: .5 });
    [0, 1, 2].forEach((q) => O.harp([81, 85, 88, 90][(q + y) % 4] + 12, mt + .05 + q * .09, .18, { dur: 2 }));
    O.play('vlnSus', 88, mt - .3, 1.3, .14, { atk: .5, rel: .8, hp: 1200 });
  }
  // ---- year 17: the soil warms - a long rising swell to 18 C, then a held breath on the dominant
  O.swell('swellMed', W18, .4, { tail: .6 });
  O.roll(45, W, W18 - W + .4, .36, { dyn: (u) => .2 + .8 * u * u, rel: .5 });
  O.gliss(W18 - BEAT * 1.4, BEAT * 1.4, 57, 93, .3, { cresc: true });
  O.horns([57, 62, 64], W, B(27) - W + .2, .5, { atk: .8, dyn: (u) => .55 + .45 * Math.sin(Math.PI * Math.min(1, u * 1.25)), rel: .8 });
  O.trem([76, 81], W, B(27) - W + .3, .3, { atk: .9, dyn: (u) => .4 + .6 * Math.sin(Math.PI * Math.min(1, u * 1.2)) });
  // the theme's last note resolves home just as the heartbeat begins
  O.play('vlnSus', 74, B(27), 1.6, .4, { atk: .1, rel: 1 }); O.play('horn', 62, B(27), 1.4, .38, { atk: .1, rel: .9 });
}

function awakening() {
  const T0 = EV.awakening, T1 = EV.soilBreak, TU = EV.turret;
  // heartbeat (real recordings + timpani / bass drum underneath), accelerating on the grid
  const beats = [0, 2, 4, 5.5, 7, 8, 9, 10, 10.5, 11, 11.5, 11.75];
  beats.forEach((b, i) => {
    const t = T0 + b * BEAT, u = i / (beats.length - 1), next = beats[i + 1] ?? 12, gap = (next - b) * BEAT;
    if (gap > .5) X.heart(t, .44 + .18 * u, { cut: 1200 + 800 * u, long: i < 3, k: i }); else X.play(X.F.HEART1, 0, .2, t - .05, .48 + .14 * u, { fo: .06, cut: 1500, mono: true, rev: .05 });
    O.timp(38, t + .005, .3 + .35 * u, { dur: 1.2 }); O.hit('bdrum', t, .2 + .35 * u, { dur: 1.5, rel: .5 });
  });
  // the pedal: contrabass + celli on D, swelling for three bars
  O.play('cbSus', 26, T0, T1 - T0 + .1, .45, { atk: .3, dyn: (u) => .55 + .45 * u * u, rel: .2 });
  O.play('cbSus', 38, T0, B(29, 2) - T0, .42, { atk: .3, dyn: (u) => .6 + .4 * u, rel: .2 });
  O.play('cbSus', 33, B(29, 2), T1 - B(29, 2) + .05, .62, { atk: .08, rel: .15 });
  // ostinato spiccato (3+3+2), celli + violas, violins join in 16ths for the last bar
  for (let s = 0; s < 24; s++) {
    const t = T0 + s * BEAT / 2, u = s / 24, acc = [0, 3, 6].includes(s % 8) ? 1 : .72;
    const lo = t >= B(29, 2) ? 45 : 50;
    O.spic(lo, t, (.42 + .4 * u) * acc, { key: 'vcSpic', gain: 2 }); O.spic(lo + 7, t, (.36 + .4 * u) * acc, { key: 'vlaSpic', gain: 2 });
  }
  for (let s = 0; s < 16; s++) { const t = B(29) + s * BEAT / 4, m = s < 8 ? [75, 79, 75, 82][s % 4] : [76, 79, 82, 85][s % 4]; O.spic(m, t, .45 + .35 * (s / 16), { key: 'vlnSpic' }); }
  // rising tremolo: violins climb A Bb D Eb E (-> F at the break), violas beneath
  const top = [[B(27), 69], [B(28), 70], [B(28, 2), 74], [B(29), 75], [B(29, 2), 76]], mid = [[B(27), 62], [B(27, 2), 65], [B(28), 65], [B(28, 2), 67], [B(29), 67], [B(29, 2), 73]];
  top.forEach(([t, m], i) => O.trem([m], t, (top[i + 1]?.[0] ?? T1) - t + .06, .3 + .1 * i, { atk: .08, rel: .1, gain: 2, dyn: (u) => .85 + .15 * u }));
  mid.forEach(([t, m], i) => O.trem([m], t, (mid[i + 1]?.[0] ?? T1) - t + .06, .26 + .08 * i, { atk: .08, rel: .1, dyn: (u) => .85 + .15 * u }));
  // horns swell in from the second bar: Bb/D -> Gm/D -> Eb/D -> A7(b9)
  [[B(28), [58, 62, 65]], [B(28, 2), [58, 62, 67]], [B(29), [58, 63, 67]], [B(29, 2), [57, 61, 64]]].forEach(([t, ns], i) => O.horns(ns, t, BEAT * 2 + .08, .42 + .12 * i, { atk: .15, rel: .2, gain: -2.5 }));
  O.play('bsnSus', 38, B(28), B(29, 2) - B(28), .5, { atk: .3, dyn: (u) => .6 + .4 * u, rel: .15 }); O.play('bsnSus', 45, B(29, 2), T1 - B(29, 2), .6, { atk: .05, rel: .15 });
  // the huge build: timpani roll, long cymbal swell, a riser, digging everywhere
  O.roll(38, B(29), T1 - B(29) + .05, .8, { dyn: (u) => .25 + .75 * Math.pow(u, 1.5), rel: .1 });
  O.swell('swellLong', T1, .7, { tail: .05, rel: .1 });
  X.riser(T1, 3.8, .42, { f0: 200, f1: 6000 });
  for (let k = 0; k < 22; k++) { const t = T0 + .4 + 7 * Math.pow(k / 22, .75); X.scrape(t, .2, .18 + .22 * (k / 22), { cut: 900 + 400 * (k % 3), pan: R(-.7, .7) }); }
  X.leaves(T0 + 1, T1 - T0 - .9, .28, { from: 2, cut: 1600, env: (t) => .3 + .7 * ss(T0, T1, t) });
  X.rumble(T0, T1 + .2, (t) => .08 + .1 * ss(T0, T1, t), { cut: 150 });
  // a turret pokes up through the soil
  X.leaves(TU - .05, .6, .55, { from: 22.4, cut: 2600 }); X.twig(TU, 1, .3, { cut: 3000 }); X.sub(TU, .25, { f: 60, dec: .15 });
}

module.exports = { drop, underground, awakening };
