// Score, part 3 (bars 30-40): the emergence (driving, heroic), the night moult (held breath, wings unfolding).
const T = require('./theme');
const { O, X, B, BEAT, BAR, THEME, THEME_M, THEME_MH, bars, sing, prog, harm, ss } = T;
const { EV } = require('../cues');
const { R, rnd } = O;

// taiko-like kit: bass drum, low log drum, tumba, timpani on the roots (beats within a bar: [beat, vel])
function drums(bar, k = 1, o = {}) {
  const t = (b) => B(bar, b);
  [[0, 1], [1.5, .55], [2.5, .85], [3.5, .62]].forEach(([b, v]) => O.hit('bdrum', t(b), v * k, { dur: 2, rel: .6 }));
  [[.5, .5], [1, .7], [2, .55], [3, .75], [3.25, .45], [3.75, .6]].forEach(([b, v]) => O.hit('tumba', t(b), v * k, { dur: .8, rel: .2 }));
  [[1, .6], [3, .7]].forEach(([b, v]) => O.hit('logLo', t(b), v * k, { dur: .8, rel: .2 }));
  [[0, o.root ?? 50, 1], [2.5, (o.root ?? 50) - 5, .7]].forEach(([b, m, v]) => O.timp(m, t(b), .75 * v * k, { dur: 1.5 }));
  if (o.fill) [3, 3.25, 3.5, 3.75].forEach((b, i) => O.hit('tumba', t(b), (.55 + .12 * i) * k, { dur: .6, rel: .15 }));
}

function emergence() {
  const T0 = EV.soilBreak, BE = EV.birdEat, CL = EV.climbStart, T1 = B(35), HUSH = B(34, 1.6);
  // the break: crash, gong, timpani, bass drum, a sub boom and soil bursting open
  O.hit('crash', T0, .95, { dur: 7, rel: 2.2 }); O.hit('gong', T0 + .01, .42, { dur: 7, rel: 2.5 });
  O.timp(38, T0, 1); O.hit('bdrum', T0, 1, { dur: 3, rel: 1 }); X.sub(T0, 1, { f: 38, dec: .6 });
  X.leaves(T0 - .04, 1.6, 1, { from: 5.2, cut: 6000 }); X.scrape(T0, .6, 1.1, { cut: 2600, pan: -.2 }); X.scrape(T0 + .1, .6, 1, { cut: 2200, pan: .3 });
  O.strings([26, 38, 50, 57, 62, 65, 69, 74, 77, 81], T0, .7, .95, { atk: .03, rel: .45 });
  // millions of nymphs crawling: layered leaf-litter recordings across the stereo field; twigs underfoot
  [-.85, -.45, -.1, .25, .6, .9].forEach((pan, k) => X.leaves(T0 + .2 + k * .17, HUSH - T0 + .5 - k * .17, .2, { from: 3 + k * 8.7, pan, rate: R(.92, 1.15), cut: 5200, fo: 1.3, env: (t) => .7 + .3 * ss(T0, B(33), t) }));
  X.play(X.F.STEPS, 0, 14, T0 + .5, .3, { cut: 4000, fo: 1, mono: true, pan: .3, env: (t) => 1 - ss(HUSH - .5, HUSH + .5, t) });
  X.bed(X.F.FOREST3, 20, T0 - .5, T1, (t) => .35 * (1 - ss(HUSH - .4, T1, t)), { cut: 7000 });

  // drums: four full bars, then the D-major arrival and a fill that stops at ~86 s
  for (let b = 30; b < 34; b++) drums(b, .85 + .05 * (b - 30), { fill: b === 33, root: [50, 46, 43, 45][b - 30] });
  O.hit('bdrum', B(34), 1, { dur: 3, rel: 1 }); O.timp(38, B(34), .95, { dur: 3 }); O.hit('crash', B(34), .7, { dur: 6, rel: 2 });
  [.5, .75, 1, 1.25, 1.5].forEach((b, i) => O.hit('tumba', B(34, b), .55 + .08 * i, { dur: .6 }));
  O.hit('bdrum', HUSH, .7, { dur: 3, rel: 1.4 }); O.timp(38, HUSH, .6, { dur: 3 });

  // spiccato ostinati: violas (16ths, octave cell) + violins on top, celli/basses in 8ths (3+3+2 accents)
  const cell = { Dm: [62, 69, 65, 69], Bb: [62, 70, 65, 70], Gm: [62, 70, 67, 70], A7: [61, 69, 64, 67], D: [62, 69, 66, 69] };
  const H = [['Dm', 30], ['Bb', 31], ['Gm', 32], ['A7', 33]];
  H.forEach(([c, bar]) => {
    for (let s = 0; s < 16; s++) {
      const t = B(bar, s / 4), m = cell[c][s % 4], acc = s % 4 === 0 ? 1 : .78;
      O.spic(m, t, .62 * acc, { key: 'vlaSpic' });
      if (bar >= 31) O.spic(m + 12, t, .5 * acc, { key: 'vlnSpic' });
    }
    const r = O.bassOf(c, 38);
    for (let s = 0; s < 8; s++) { const acc = [0, 3, 6].includes(s) ? 1 : .7; O.spic(s % 2 ? r + 12 : r, B(bar, s / 2), .72 * acc, { key: 'vcSpic' }); if (acc === 1) O.pizz(r - 12 >= 28 ? r - 12 : r, B(bar, s / 2), .7, { key: 'cbPizz' }); }
  });
  // the MAIN THEME, heroic, in D minor: horns (doubled in octaves), violas + bassoon underneath, then violins
  const M = THEME_M;
  sing('horn', M, T0, { k: .9, atk: .05 });
  sing('horn', M, T0, { tr: -12, k: .78, atk: .05 });
  sing('vcSus', M, T0, { tr: -12, k: .62, atk: .06 });
  sing('vlnSus', bars(M, 2, 4), B(32), { oct: 1, k: .66, atk: .06 });
  [[T0, 26], [B(31), 34], [B(32), 31], [B(33), 33]].forEach(([t, m]) => { O.play('cbSus', m, t, BAR + .05, .55, { atk: .06, rel: .3 }); O.play('cbSus', m + 12, t, BAR + .05, .45, { atk: .06, rel: .3 }); });
  // brass-like weight on the downbeats: low horns + bassoon stabs
  [[30, 50], [31, 46], [32, 43], [33, 45]].forEach(([bar, m]) => { O.play('bsnStac', m, B(bar), .25, .7, { rel: .1 }); O.play('bsnStac', m, B(bar, 2.5), .25, .6, { rel: .1 }); });
  // the bird strikes: real blackbird alarm + wing flaps, an orchestral stab, xylophone scatter
  X.play(X.F.BLACKBIRD, .55, 1.5, BE - .08, .45, { pan: -.35, rev: .12, fo: .2, mono: true });
  X.flaps(BE - .3, 0, .6, { pan: -.5, cut: 4500 }); X.play(X.F.ROBIN, .9, 2.2, BE + 1.3, .35, { pan: .45, rev: .15, mono: true, fo: .3 });
  O.strings([43, 55, 62, 67, 70, 74, 79], BE, .35, .8, { atk: .02, rel: .25 }); O.horns([55, 62, 67], BE, .4, .82, { atk: .02, rel: .3 });
  O.hit('cymHit', BE, .45, { dur: 3, rel: 1 });
  [86, 89, 91, 94, 98].forEach((m, i) => O.mallet('xylo', m, BE + .06 + i * .045, .5 - .05 * i, { dur: .5 }));
  // the climb: harp runs upward
  O.gliss(CL, BEAT * 1.5, 45, 81, .38, { scale: 'Dmh', cresc: true }); O.gliss(B(33, 2), BEAT * 1.5, 57, 93, .4, { scale: 'Dmh', cresc: true });
  // D-major arrival: the whole orchestra blazes, then pulls back to a hush entering the night
  const AR = B(34);
  O.strings([26, 38, 50, 57, 62, 66, 69, 74, 78, 81], AR, 2.6, .9, { atk: .04, rel: 1.1, dyn: (u) => (u < .35 ? 1 : 1 - .82 * ss(.35, 1, u)) });
  O.horns([62, 66, 69, 74], AR, 1.9, .95, { atk: .05, rel: .9, dyn: (u) => 1 - .7 * ss(.4, 1, u) });
  O.horns([50, 57], AR, 1.9, .85, { atk: .05, rel: .9, dyn: (u) => 1 - .7 * ss(.4, 1, u) });
  O.gliss(AR, .5, 50, 93, .5, { cresc: true }); [86, 90, 93, 98].forEach((m, i) => O.mallet('glock', m, AR + .05 + i * .07, .4, { dur: 3 }));
  for (let s = 0; s < 6; s++) { O.spic([74, 78, 81, 78, 74, 69][s], AR + s * BEAT / 4, .7, { key: 'vlnSpic' }); O.spic([62, 66, 69, 66, 62, 57][s], AR + s * BEAT / 4, .62, { key: 'vlaSpic' }); }
  // the hush: soft strings hold D major, high and quiet, across the cut into the night
  O.strings([50, 57, 62, 66, 69, 74], AR + 1.2, T1 - AR + .6, .3, { atk: .9, rel: 1.4, dyn: (u) => 1 - .5 * u });
  O.play('cbSus', 38, AR + 1.2, T1 - AR + .4, .28, { atk: .8, rel: 1.2, dyn: (u) => 1 - .5 * u });
  O.roll(38, HUSH, T1 - HUSH + .3, .32, { dyn: (u) => 1 - .8 * u, rel: .6 });
}

function molt() {
  const T0 = B(35), SP = EV.split, [H0, H1] = EV.hang, [W0, W1] = EV.wingsExpand, SUN = EV.sunrise, T1 = B(41);
  // night insects all through the moult, a cricket close by; the dawn chorus rises with the sun
  X.bed(X.F.NIGHT, 12, B(34, 1), SUN + 2, (t) => .65 * ss(B(34, 1), T0 + .4, t) * (1 - ss(SUN - 1, SUN + 2, t)), { fi: 1.2, fo: 1.5, cut: 12000, peak: [9500, -4, .9] });
  X.bed(X.F.CRICKET, 4, T0, SUN, (t) => .1 * ss(T0, T0 + 2, t) * (1 - ss(W0, SUN, t)), { cut: 8000, peak: [4400, -6, 1.2], width: .5 });
  X.bed(X.F.DAWN, 230, W1 - 2.5, T1 + 2.5, (t) => .6 * ss(W1 - 2.5, SUN + 1.5, t), { fi: 1, fo: 1, cut: 9000, hp: 250 });
  // near silence, never empty: high violin harmonics, a glassy sul-pont tremolo, a few harp notes, a low D
  O.play('vlnSus', 81, T0 - .4, SP - T0 + 1.4, .2, { atk: 1.2, rel: 1, hp: 1100 });
  O.play('vlnSus', 88, T0 - .2, SP - T0 + 1.2, .17, { atk: 1.4, rel: 1, hp: 1300 });
  O.play('vlnTrem', 86, T0 + .2, SP - T0 - .5, .2, { atk: 1.4, rel: .5, hp: 2200, gain: 3 });
  O.play('cbSus', 38, T0 - .3, H1 - T0 + .5, .2, { atk: 1, rel: 1.2 });
  O.play('vcSus', 57, T0, SP - T0 + .4, .16, { atk: 1.2, rel: .9 });
  [[T0 + .3, 69], [T0 + 1.25, 76], [T0 + 2.3, 74], [T0 + 3.1, 81]].forEach(([t, m]) => O.harp(m, t, .2, { dur: 2.5 }));
  X.click(EV.grip, .3, { f: 2600, pan: .1 }); X.click(EV.grip + .09, .22, { f: 3000, pan: .12 });
  // the back splits: a dry crack, a breathy swell, strings bloom softly (Bm add9)
  X.crack(SP, .9); X.breath(SP - .1, 1.8, .9, { f0: 350, f1: 1400 });
  O.strings([47, 54, 61, 66, 73], SP, H0 - SP + .05, .3, { atk: .25, rel: .5, dyn: (u) => .6 + .4 * Math.sin(Math.PI * u) });
  O.hit('triangle', SP + .05, .2, { dur: 3, rel: 2 });
  // the white adult hangs: flute + clarinet + muted horn over soft strings (Gmaj9 -> Em9), the theme head far away
  sing('fluteSus', bars(THEME, 0, 1), H0, { oct: 1, k: .5, sc: 1.5, atk: .2, rel: .6 });
  O.line('clarSus', [[H0, 71, BEAT * 3, .42], [H0 + BEAT * 3, 69, BEAT * 3, .4]], { atk: .3, rel: .6 });
  O.play('hornMute', 55, H0, BEAT * 3.2, .4, { atk: .5, rel: .7 }); O.play('hornMute', 52, H0 + BEAT * 3, BEAT * 3.2, .38, { atk: .4, rel: .8 });
  prog([[H0, 'Gmaj9', BEAT * 3], [H0 + BEAT * 3, 'Em9', BEAT * 3]], { lo: 59, hi: 76, n: 4, vel: .24, atk: .6, rel: 1, bassLo: 31, bassK: .7 });
  // wings unfold: a long rising swell - harp glissandi each half bar, strings climbing, crescendo to the dawn
  const WH = [[W0, 'Bm7', BEAT * 2], [W0 + BEAT * 2, 'Gmaj7', BEAT * 2], [W0 + BEAT * 4, 'Em7', BEAT * 2], [W0 + BEAT * 6, 'A7sus', BEAT], [W0 + BEAT * 7, 'A7', SUN - W0 - BEAT * 7]];
  const WV = { Bm7: [35, 47, 57, 62], Gmaj7: [31, 43, 50, 59], Em7: [28, 40, 55, 62], A7sus: [33, 45, 52, 62], A7: [33, 45, 55, 61] };
  WH.forEach(([t, c, d]) => O.strings(WV[c], t, d + .08, .26 + .36 * ss(W0, SUN, t), { atk: t === W0 ? .5 : .15, rel: .35 }));
  const climb = [66, 67, 69, 71, 73, 74, 76, 78];
  climb.forEach((m, i) => O.play('vlnSus', m, W0 + i * BEAT, BEAT + .12, .3 + .05 * i, { atk: i ? .08 : .3, rel: .15, start: i ? .05 : 0 }));
  O.play('vlnSus', 78, SUN - .05, 2.6, .66, { atk: .05, rel: 1 });
  [[W0, 50, 81], [W0 + BEAT * 2, 55, 86], [W0 + BEAT * 4, 59, 91], [W0 + BEAT * 6, 64, 96]].forEach(([t, a, b], i) => O.gliss(t, BEAT * 1.6, a, b, .26 + .06 * i, { cresc: true, scale: 'D' }));
  O.trem([81, 85], W0 + BEAT * 4, SUN - W0 - BEAT * 4 + .05, .3, { atk: .6, dyn: (u) => .4 + .6 * u, rel: .1 });
  O.roll(45, W0 + BEAT * 5, SUN - W0 - BEAT * 5 + .03, .6, { dyn: (u) => .2 + .8 * u * u, rel: .1 });
  O.swell('swellMed', SUN, .55, { tail: .1 });
  X.riser(SUN, 2.6, .45, { f0: 400, f1: 7000 });
  X.breath(W0, W1 - W0, .5, { f0: 300, f1: 2400 });
}

module.exports = { emergence, molt };
