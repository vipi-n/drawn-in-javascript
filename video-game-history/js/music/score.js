// The score, scene by scene. A real orchestra (VSCO-2 CE samples) carries the emotion; synthesized 8-bit voices
// carry the memory. The theme is heard three times: shyly on piano as the first dot bounces (bars 3-10), on chip
// voices in the arcade (13-16), soaring on strings as the world comes online (29-36), and in full at the climax
// (39-42), before a solo piano walks it home to D.
const O = require('./orch');
const X = require('./chip');
const TH = require('./theme');
const { EV, B, BEAT, BAR } = require('../cues');
const { THEME, CADENCE, KORO, bars, chord, track, sing, prog, broken, sparkle, dia } = TH;
const { voice, bassOf, R } = O;
const bt = (beat) => beat * BEAT;

// ---------------------------------------------------------------- 8-bit band
function chipLead(P, t0, o = {}) {
  const L = O.phrase(P, t0, (o.tr ?? 0) + (o.oct ?? 0) * 12, o.k ?? .7, o.sc ?? 1).filter(([t]) => t < (o.until ?? 1e9));
  L.forEach(([t, m, d, v]) => X.tone(t, m, Math.max(.06, d * (o.leg ?? .9)), v, { duty: o.duty ?? .25, atk: .004, dec: o.dec ?? .35, sus: o.sus ?? .62, rel: o.rel ?? .08, vib: o.vib ?? .14, vibD: .22, lp: o.lp ?? 7000, echo: o.echo ?? .22, gain: o.gain, pan: o.pan ?? .12, rev: o.rev ?? .2, hp: o.hp }));
  return L;
}
function chipBass(t0, t1, o = {}) {
  const step = BEAT / (o.div ?? 2), n = Math.round((t1 - t0) / step), pat = o.pat ?? [0, 12];
  for (let s = 0; s < n; s++) {
    const t = t0 + s * step, r = bassOf(chord(t + .01), o.lo ?? 40), v = (typeof o.v === 'function' ? o.v(t) : (o.v ?? .7)) * (s % 2 ? .82 : 1);
    X.tone(t, r + pat[s % pat.length], step * (o.leg ?? .8), v, { wave: 'tri', atk: .002, dec: .25, sus: .75, rel: .02, gain: o.gain, rev: .08 });
  }
}
function chipArp(t0, t1, o = {}) {
  const step = BEAT / (o.div ?? 4), n = Math.round((t1 - t0) / step);
  for (let s = 0; s < n; s++) {
    const t = t0 + s * step, v = voice(chord(t + .01), o.lo ?? 62, o.hi ?? 86, o.n ?? 4), seq = o.down ? [...v].reverse() : v;
    const vv = (typeof o.v === 'function' ? o.v(t) : (o.v ?? .3)) * (s % 4 ? .8 : 1);
    X.tone(t, seq[s % seq.length], step * .7, vv, { duty: o.duty ?? .125, dec: .08, sus: .35, rel: .02, lp: o.lp ?? 6500, echo: o.echo ?? .3, pan: o.pan ?? -.28, gain: o.gain, rev: .18 });
  }
}
// 8-bit drums: kick 1 & 3, snare 2 & 4, hats in 8ths (or 16ths); o.k = level
function groove(t0, t1, o = {}) {
  const k = o.k ?? 1, beats = Math.round((t1 - t0) / BEAT);
  for (let b = 0; b < beats; b++) {
    const t = t0 + bt(b);
    if (b % 2 === 0) X.kick(t, .8 * k); else X.snare(t, .62 * k);
    if (o.push && b % 4 === 3) X.kick(t + bt(.5), .55 * k);
    const hd = o.hats ?? 2;
    for (let h = 0; h < hd; h++) X.hat(t + h * BEAT / hd, (h % 2 ? .22 : .32) * k, { open: o.open && h === hd - 1 && b % 2 === 1 });
  }
}
const fill = (t0, n, step, k = 1) => { for (let i = 0; i < n; i++) X.snare(t0 + i * step, (.35 + .45 * i / n) * k); };

// ---------------------------------------------------------------- 0 - 8 s: a CRT wakes in the dark
function intro() {
  X.powerOn(EV.power);
  X.hum(.3, B(3) + .4, .03);
  prog(track(.9, B(2, 2)), { vel: .2, lo: 62, hi: 81, n: 4, atk: 1.8, rel: 1.4, bassLo: 38, bassK: .7, lp: 5200, over: .15 });
  // the music box: the theme's first phrase, high and fragile
  sing('glock', bars(THEME, 0, 2), B(0, 2), { oct: 1, k: .38, maxD: 2.2, rel: 1.2 });
  O.gliss(EV.title - .55, .5, 62, 86, .42, { scale: 'D', cresc: true, dur: 2.4 });
  [50, 57, 61, 64, 69].forEach((m, i) => O.play('piano', m, EV.title + i * .07, 3.2, .4 - i * .03, { rel: 1.4 }));
  O.play('piano', 38, EV.title, 4, .42, { rel: 1.6 });
  O.swell('swellShort', EV.title, .22);
  // PRESS START, then the little start jingle
  X.select(EV.press);
  [74, 78, 81, 86].forEach((m, i) => X.tone(EV.press + .3 + i * .075, m, .07, .4, { duty: .25, dec: .05, sus: .5, rel: .03, echo: .35, pan: .1 }));
  prog(track(B(2, 2), B(3)), { vel: .24, lo: 62, hi: 79, n: 4, atk: .6, rel: 1, lp: 5500 });
  [45, 57, 62, 64, 67].forEach((m, i) => O.play('piano', m, B(2, 2) + .4 + i * .06, 1.8, .3, { rel: 1 }));
  X.whoosh(B(3) - .9, .9, .16);
}

// ---------------------------------------------------------------- 8 - 21 s: the first dot, the first starships
function tennis() {
  const t0 = B(3), t1 = B(6);
  sing('piano', bars(THEME, 0, 3), t0, { k: .66, maxD: 2.4, rel: .9 });
  broken('piano', t0, t1, BEAT, .26, { lo: 43, hi: 62, n: 3, pattern: [0, 1, 2, 1], dur: 1.6 });
  prog(track(t0, t1), { vel: .2, lo: 57, hi: 72, n: 3, atk: 1.2, rel: 1.2, bass: false, lp: 4500 });
  // the ball: a hit every two beats, a bounce on the beat between (soft, tuned to the chord)
  for (let k = 0; k < 6; k++) {
    const th = EV.rally0 + bt(2 * k), c = chord(th + .01), r = bassOf(c, 74);
    X.blip(th, r + 12 > 88 ? r : r + 12, .32, { pan: k % 2 ? .3 : -.3, lp: 3200, echo: .2 });
    X.blip(th + BEAT, bassOf(c, 62) + 7, .19, { pan: k % 2 ? -.15 : .15, lp: 2600, dur: .05 });
  }
}
function spacewar() {
  const t0 = B(6), t1 = B(8);
  sing('vlnSus', bars(THEME, 3, 5), t0, { k: .42, atk: .25, rel: .8 });
  sing('piano', bars(THEME, 3, 5), t0, { k: .32, oct: -1, maxD: 2 });
  broken('piano', t0, t1, BEAT / 2, .2, { lo: 50, hi: 74, n: 4, dur: 1.2 });
  prog(track(t0, t1), { vel: .3, lo: 50, hi: 69, n: 3, atk: .9, rel: 1.1, cb: true, bassLo: 38 });
  O.gliss(t0 - .5, .45, 55, 79, .32, { scale: 'D', cresc: true });
  EV.torp.forEach((t, i) => { X.tone(t, 88 - (i % 2) * 5, .14, .22, { duty: .125, bend: -14, dec: .08, sus: .2, rel: .03, bus: 'sfx', pan: i % 2 ? .4 : -.4, echo: .35, lp: 5000 }); });
}
function pong() {
  const t0 = B(8), t1 = B(11);
  // the chip band arrives: the theme's last phrase on a pulse lead, a triangle bass
  chipLead(bars(THEME, 5, 8), t0, { k: .5, duty: .5, lp: 5000, until: B(10, 3) });
  sing('fluteSus', bars(THEME, 5, 8), t0, { k: .36, atk: .1 });
  chipBass(t0, B(10, 2), { v: (t) => .32 + .2 * TH.ss(t0, t0 + BAR, t) });
  prog(track(t0, t1), { vel: .26, lo: 55, hi: 72, n: 3, atk: .8, rel: 1, bassLo: 38, bassK: .6, lp: 5500 });
  broken('harp', t0, t1, BEAT, .24, { lo: 50, hi: 74, n: 4 });
  // paddle every two beats, wall on the beat between
  for (let k = 0; k < 6; k++) {
    const th = EV.pong0 + bt(2 * k), c = chord(th + .01);
    X.blip(th, bassOf(c, 76), .3, { pan: k % 2 ? .35 : -.35, duty: .5, lp: 4200 });
    X.blip(th + BEAT, bassOf(c, 64), .2, { pan: 0, duty: .5, lp: 3600, dur: .05 });
  }
  X.whoosh(EV.overlay - .25, .4, .1, .2);
  // bar 10: A7sus, a 16th-note pickup into the Atari
  chipArp(B(10, 2), t1, { v: .26, lo: 64, hi: 81 });
  O.roll(45, B(10, 1), BAR * .75, .3, { atk: 1.4 });
}

// ---------------------------------------------------------------- 29 - 35 s: a cartridge clicks in
function atari() {
  const t0 = B(11), t1 = B(13);
  prog(track(t0, t1), { vel: (t) => .22 + .2 * TH.ss(EV.power2600, t1, t), lo: 57, hi: 76, n: 4, atk: .6, rel: .8, cb: true, bassLo: 38 });
  O.play('piano', 38, t0, 3, .4, { rel: 1.4 });
  X.clunk(EV.cart);
  X.select(EV.power2600 - .02, .4);
  O.gliss(EV.power2600, .55, 62, 90, .36, { scale: 'D', cresc: true });
  chipBass(EV.power2600, t1, { v: .6 });
  chipArp(EV.power2600, t1, { v: (t) => .2 + .14 * TH.ss(EV.power2600, t1, t) });
  for (let b = 0; b < 4; b++) X.hat(B(12) + bt(b), .25);
  for (let b = 0; b < 8; b++) X.hat(B(12) + bt(b / 2 + .25), .15);
  fill(B(12, 2), 8, BEAT / 4, .8);
  O.horns(voice('A7sus', 52, 66, 3), B(12), BAR, .3, { atk: .8, dyn: (u) => .45 + .55 * u });
  O.roll(45, B(12), BAR, .42, { atk: 2 });
  O.swell('swellMed', t1, .4);
  X.riser(B(12), t1, .16);
}

// ---------------------------------------------------------------- 35 - 45 s: the golden age of the arcade
function arcade() {
  const t0 = B(13), t1 = EV.crash;
  chipLead(bars(THEME, 0, 4), t0, { k: .7, duty: .25, echo: .2 });
  chipLead(bars(THEME, 0, 4).map(([b, m, d, v]) => [b, dia(m, -2), d, v]), t0, { k: .36, duty: .5, echo: 0, pan: -.2, lp: 4500 });
  chipBass(t0, t1 - .02, { v: .72, pat: [0, 12, 7, 12] });
  chipArp(t0, t1 - .02, { v: .16, lo: 74, hi: 91, div: 4, pan: .3 });
  groove(t0, B(16), { k: .9, push: true });
  groove(B(16), B(16, 2), { k: 1, hats: 4 });
  fill(B(16, 2), 8, BEAT / 4, 1.05);
  O.hit('cymHit', t0, .45);
  O.hit('bdrum', t0, .5);
  // the orchestra under the chips: pizzicato on the beat, sustained strings, horns at the turn
  for (let b = 0; b < 16; b++) { const t = t0 + bt(b), c = chord(t + .01); O.pizz(bassOf(c, 38), t, .55); if (b % 2) voice(c, 57, 72, 3).forEach((m) => O.pizz(m, t, .3)); }
  prog(track(t0, t1), { vel: .2, lo: 62, hi: 79, n: 3, atk: .4, rel: .3, bass: false });
  O.horns(voice('G', 52, 67, 3), B(16), BEAT * 2, .5, { atk: .15 });
  O.horns(voice('A', 52, 67, 3), B(16, 2), BEAT * 2 - .05, .58, { atk: .1 });
  // Space Invaders: the four-note march, then a laser for every shot and a pop for every hit
  const march = [62, 61, 59, 57];
  for (let b = 0; b < 6; b++) X.tone(EV.invaders + bt(b), march[b % 4] - 12, .14, .5, { wave: 'tri', dec: .08, sus: .3, rel: .02, bus: 'sfx', rev: .1 });
  [[1, 4], [2.5, 6], [3.5, 2], [4.5, 5], [5.5, 3]].forEach(([b, col], i) => { const t = EV.invaders + bt(b); X.laser(t, .3, -.3 + col * .1); X.boom(t + .22, .26, -.3 + col * .1); });
  // Pac-Man: waka-waka along the maze, the power pellet
  X.waka(EV.pac - .3, 18, .28);
  X.tone(EV.pellet, 79, .5, .3, { duty: .5, vib: .8, vibD: 0, vibR: 9, dec: .3, sus: .6, rel: .1, bus: 'sfx', pan: -.1 });
  // Donkey Kong: a stomp
  O.timp(50, EV.dk, .6); X.boom(EV.dk + .02, .35);
  for (let i = 0; i < 4; i++) X.jump(EV.dk + .9 + i * bt(1), .22, .25);
}

// ---------------------------------------------------------------- 45 - 51 s: the crash
function crash() {
  const t0 = EV.crash, t1 = B(19);
  X.powerDown(t0, .42);
  O.hit('cymHit', t0 - .02, .3, { lp: 3000 });
  // a lone piano in B minor, falling
  const M = [[0, 78, 2, .7], [2, 76, 1, .58], [3, 74, 1, .6], [4, 74, 1.5, .62], [5.5, 73, .5, .52], [6, 71, 1, .55], [7, 70, 1, .58]];
  sing('piano', M, t0 + .45, { k: .8, maxD: 2.4, rel: 1.2 });
  [[0, [35, 42, 50]], [4, [31, 38, 47]], [6, [30, 37, 46]]].forEach(([b, ns]) => ns.forEach((m, i) => O.play('piano', m, t0 + .45 + bt(b) + i * .05, 2.6, .34, { rel: 1.4 })));
  sing('vcSus', [[0, 62, 4, .6], [4, 59, 1.6, .55], [6, 58, 1.4, .6]], t0 + .3, { k: .55, atk: .8, rel: 1.2 });
  prog(track(t0 + .2, t1), { vel: .15, lo: 54, hi: 69, n: 3, atk: 1.6, rel: 1.4, bassLo: 30, lp: 2500, bassK: .8 });
  X.noise(t0 + .6, 3.6, .05, { rate: 40000, atk: 1.6, dec: 3, sus: .6, rel: 1.2, bp: [600, 1.2], sweep: 300, bus: 'sfx', rev: .4 }); // desert wind
  X.tone(B(18), 74, .5, .14, { duty: .5, dec: .3, sus: .2, rel: .3, echo: .7, lp: 3000, bus: 'chip', pan: -.3 });  // a last, far-away blip
}

// ---------------------------------------------------------------- 51 - 61 s: Tetris, Mario, the Game Boy
function revival() {
  // Tetris: Korobeiniki (trad.) on a pulse, pizzicato doubling, a triangle bass
  const t0 = B(19);
  chipLead(KORO, t0, { k: .66, duty: .5, lp: 5200, echo: .18, leg: .85 });
  sing('vlnPizz', KORO, t0, { k: .42 });
  chipBass(t0, EV.mario, { v: .58, pat: [0, 7] });
  for (let b = 0; b < 6; b++) { X.hat(t0 + bt(b), .2); if (b % 2) X.snare(t0 + bt(b), .25); }
  prog(track(t0, EV.mario), { vel: .18, lo: 59, hi: 74, n: 3, atk: .4, rel: .6, bassLo: 35, bassK: .5 });
  X.clearChime(EV.clear, [71, 74, 78, 83, 86, 90, 95], .26);
  O.play('glock', 95, EV.clear + .32, 1.5, .3, { rel: 1 });
  // Mario: the theme's opening, double-time and bouncing
  const m0 = EV.mario;
  chipLead(bars(THEME, 0, 2), m0, { sc: .5, k: .72, duty: .5, echo: .15, leg: .75 });
  chipLead([[0, 74, .5, .7], [.5, 78, .5, .75], [1, 81, .5, .85]], m0 + bt(4), { duty: .5, leg: .7 });
  sing('glock', bars(THEME, 0, 2), m0, { sc: .5, oct: 1, k: .28, maxD: .8 });
  chipBass(m0, EV.gameboy, { v: .66, pat: [0, 7, 12, 7], leg: .55 });
  groove(m0, B(21, 2), { k: .7 }); X.snare(B(21, 2), .3);
  for (let b = 0; b < 5; b++) { const t = m0 + bt(b); voice(chord(t + .01), 59, 74, 3).forEach((m) => O.pizz(m, t + bt(.5), .28)); O.pizz(bassOf(chord(t + .01), 38), t, .45); }
  EV.bump.forEach((t) => { X.jump(t - .26, .3); X.coin(t, .32); });
  // the Game Boy: a "ding", and a tender four-note phrase on a little two-voice speaker
  X.ding(EV.gameboy, 81, .4);
  const gb = { duty: .5, lp: 3800, hp: 280, echo: .3, k: .55, pan: .05 };
  chipLead([[0, 74, 1, .8], [1, 79, 1, .85], [2, 76, 1.5, .9], [3.5, 74, .5, .75]], B(22), gb);
  chipLead([[0, 71, 1, .6], [1, 74, 1, .6], [2, 73, 1.5, .62], [3.5, 71, .5, .55]], B(22), { ...gb, k: .32, duty: .25, echo: 0, pan: -.15 });
  prog(track(EV.gameboy, B(23)), { vel: (t) => .2 + .18 * TH.ss(B(22), B(23), t), lo: 57, hi: 76, n: 4, atk: .9, rel: .5, cb: true, bassLo: 38 });
  broken('harp', B(21, 3) + bt(.5), B(23), BEAT / 2, .25, { lo: 55, hi: 79 });
  fill(B(22, 2), 8, BEAT / 4, .75);
  O.swell('swellShort', B(23), .35);
}

// ---------------------------------------------------------------- 61 - 67 s: 16 bits
function bits16() {
  const t0 = B(23), t1 = B(25);
  // a brighter, FM-ish lead: saw + detuned pulse, the theme at double speed
  const P = [...bars(THEME, 0, 2).map(([b, ...r]) => [b * .5, ...r]), ...bars(THEME, 2, 4).map(([b, ...r]) => [4 + b * .5, ...r])];
  P.forEach(([b, m, d, v]) => {
    const t = t0 + bt(b), dd = Math.max(.08, bt(d) * .88);
    X.tone(t, m, dd, v * .5, { wave: 'saw', atk: .004, dec: .18, sus: .55, rel: .06, lp: 4200, vib: .1, echo: .18, pan: .1 });
    X.tone(t, m + .08, dd, v * .4, { duty: .25, atk: .004, dec: .18, sus: .55, rel: .06, lp: 6000, pan: -.1 });
  });
  chipBass(t0, t1, { v: .72, div: 4, pat: [0, 0, 12, 0, 7, 0, 12, 7], leg: .6 });
  groove(t0, B(24, 2), { k: 1, hats: 4, push: true });
  fill(B(24, 2), 8, BEAT / 4, 1.1);
  O.hit('cymHit', t0, .5); O.hit('bdrum', t0, .6); O.hit('bdrum', B(24), .5);
  for (let s = 0; s < 32; s++) { const t = t0 + s * BEAT / 4, v = voice(chord(t + .01), 50, 69, 3); O.spic(v[s % 3], t, .42 + (s % 4 ? 0 : .12)); }
  track(t0, t1).forEach(([t, c]) => O.horns(voice(c, 53, 69, 3), t, BEAT * .9, .5, { atk: .04, rel: .3 }));
  prog(track(t0, t1), { vel: .25, lo: 64, hi: 81, n: 3, atk: .3, rel: .5, bass: false });
  O.roll(50, B(24, 2), BEAT * 2, .5, { atk: 1 });
  X.riser(B(24), t1, .2);
}

// ---------------------------------------------------------------- 67 - 77 s: into the third dimension
function threed() {
  const t0 = B(25);
  // DOOM: D minor, low brass, timpani and a gritty pulse riff
  O.hit('bdrum', t0, .8); O.hit('cymHit', t0, .4, { lp: 4000 });
  O.horns([50, 57], t0, BAR + .2, .62, { atk: .1 }); O.horns([46, 53], B(26), BEAT * 2, .66, { atk: .1 });
  O.play('cbSus', 26, t0, BAR, .55, { atk: .1 }); O.play('cbSus', 34, B(26), BEAT * 2, .55, { atk: .1 });
  [[0, 50], [1.5, 50], [2, 45], [3, 50], [3.5, 50], [4, 46], [5, 53]].forEach(([b, m]) => O.timp(m, t0 + bt(b), .62));
  const riff = [38, 38, 50, 38, 41, 38, 43, 44];
  for (let s = 0; s < 12; s++) { const t = t0 + s * BEAT / 2, m = riff[s % 8] + (s >= 8 ? -4 : 0); X.tone(t, m + 12, BEAT * .42, .5, { duty: .125, dec: .1, sus: .6, rel: .02, lp: 2400, gain: 1, pan: -.1 }); X.tone(t, m, BEAT * .42, .45, { wave: 'tri', dec: .1, sus: .8, rel: .02 }); }
  for (let b = 0; b < 6; b++) { X.kick(t0 + bt(b), .8); if (b % 2) X.snare(t0 + bt(b), .6); X.hat(t0 + bt(b + .5), .25); }
  for (let s = 0; s < 12; s++) O.spic(s % 2 ? 50 : 38 + (s >= 8 ? -4 : 0), t0 + s * BEAT / 2, .5);
  // PLAYSTATION: the shimmer
  const p = EV.ps1;
  O.swell('swellMed', p, .5);
  O.gliss(p, .7, 62, 98, .42, { scale: 'D', cresc: true, dur: 3 });
  [81, 85, 88, 93].forEach((m, i) => O.mallet('glock', m + 12 > 108 ? m : m + 12, p + .5 + i * .16, .35, { dur: 3, rel: 2 }));
  prog([[p, 'Dmaj9', EV.n64 - p + .3]], { vel: .4, lo: 62, hi: 86, n: 5, atk: .8, rel: 1.2, cb: true, bassLo: 38 });
  [62, 69, 73, 76, 81].forEach((m, i) => O.play('piano', m, p + .3 + i * .09, 3, .34, { rel: 1.6 }));
  sparkle('glock', [81, 85, 88, 90, 93], p + 1, 2.8, 8, .2);
  // NINTENDO 64: a horn call rising into the online era
  const n = EV.n64;
  O.hornLine([[n, 57, BEAT * .5, .7], [n + bt(.5), 62, BEAT * .5, .75], [n + bt(1), 67, bt(2), .85], [n + bt(3), 69, bt(2), .9]], { atk: .06 });
  prog(track(B(28), B(29)), { vel: (t) => .38 + .14 * TH.ss(B(28), B(29), t), lo: 59, hi: 81, n: 4, atk: .5, rel: .5, cb: true, bassLo: 38 });
  O.roll(45, B(28), BAR, .45, { atk: 1.6 });
  O.swell('swellMed', B(29), .5);
  broken('harp', n + bt(1), B(29), BEAT / 2, .3, { lo: 55, hi: 81 });
}

// ---------------------------------------------------------------- 77 - 88 s: a planet comes online
function online() {
  const t0 = B(29), t1 = B(33);
  sing('vlnSus', bars(THEME, 0, 4), t0, { k: .62, atk: .12, rel: .8 });
  sing('fluteSus', bars(THEME, 0, 4), t0, { k: .34, oct: 1, atk: .08 });
  sing('vlaSus', bars(THEME, 0, 4).map(([b, m, d, v]) => [b, dia(m, -2), d, v]), t0, { k: .4, atk: .15 });
  prog(track(t0, t1), { vel: .4, lo: 50, hi: 67, n: 3, atk: .4, rel: .8, cb: true, bassLo: 38 });
  broken('piano', t0, t1, BEAT / 2, .3, { lo: 50, hi: 74, n: 4, dur: 1.1 });
  track(t0, t1).forEach(([t, c, d]) => O.horns(voice(c, 50, 64, 3), t, d + .1, .3, { atk: .6, rel: .8 }));
  for (let b = 0; b < 4; b++) O.timp(bassOf(chord(B(29 + b) + .01), 43) + (bassOf(chord(B(29 + b) + .01), 43) > 54 ? -12 : 0), B(29 + b), .42);
  chipArp(t0, t1, { v: .12, lo: 74, hi: 93, echo: .4, pan: .35 });
  O.hit('cymHit', t0, .4);
  X.whoosh(EV.net - .45, .6, .22);
  sparkle('glock', [81, 86, 90, 93], EV.net, 2.5, 7, .22);
  O.swell('swellShort', EV.wow, .35);
  O.gliss(EV.wow, .5, 62, 93, .34, { scale: 'D', cresc: true });
}

// ---------------------------------------------------------------- 88 - 99 s: everyone plays
function everyone() {
  const t0 = B(33), t1 = B(37);
  sing('piano', bars(THEME, 4, 8), t0, { k: .62, maxD: 2.6, rel: 1 });
  sing('fluteSus', bars(THEME, 4, 8), t0, { k: .36, atk: .12 });
  sing('clarSus', bars(THEME, 4, 8).map(([b, m, d, v]) => [b, dia(m, -2), d, v]), t0, { k: .3, atk: .15 });
  broken('harp', t0, t1, BEAT / 2, .28, { lo: 50, hi: 74 });
  prog(track(t0, t1), { vel: .24, lo: 55, hi: 69, n: 3, atk: .8, rel: 1, bass: false });
  for (let b = 0; b < 16; b++) { const t = t0 + bt(b); if (b % 2 === 0) O.pizz(bassOf(chord(t + .01), 38), t, .45); }
  // Wii bowling: a swing, a roll, a strike
  const strike = EV.wii + 2.35;
  X.whoosh(strike - 2.05, .8, .2, .3);
  X.noise(strike - 1.25, 1.25, .16, { rate: 6000, atk: .3, dec: 2, sus: .8, rel: .05, lp: 380, bus: 'sfx', rev: .2 });
  X.pins(strike, .55);
  [74, 78, 81, 86].forEach((m, i) => O.mallet('marimba', m, strike + .25 + i * .09, .4));
  // the App Store: icons pop, a tap, a match
  for (let i = 0; i < 16; i++) O.mallet('xylo', [74, 76, 78, 81, 83][i % 5] + 12 * Math.floor(i / 8), EV.phone + i * .04, .16, { dur: .5 });
  X.tock(EV.phone + .75, .25);
  X.clearChime(EV.phone + 2.0, [74, 78, 81, 86, 90], .26);
  sparkle('glock', [86, 90, 93], EV.phone + 2.05, .6, 4, .2);
  // Minecraft: every block placed is a soft wooden tap
  for (let i = 0; i < 22; i++) X.tock(EV.mine - .4 + i * BEAT * .25, .18 + .06 * (i % 4 === 0), R(-.3, .3));
  for (let b = 0; b < 4; b++) O.mallet('marimba', voice(chord(EV.mine + bt(b) + .01), 62, 74, 3)[b % 3], EV.mine + bt(b), .3);
  O.roll(45, B(36), BAR, .3, { atk: 2 });
}

// ---------------------------------------------------------------- 99 - 112 s: a world at play (the climax)
function today() {
  const a0 = B(37), c0 = EV.today, c1 = B(42);
  // the arena build
  groove(a0, B(38, 2), { k: .8, hats: 2 });
  groove(B(38, 2), c0, { k: .9, hats: 4 });
  fill(B(38, 2), 8, BEAT / 4, 1.1);
  chipArp(a0, c0, { v: (t) => .14 + .12 * TH.ss(a0, c0, t), lo: 69, hi: 90 });
  chipBass(a0, c0, { v: .6, div: 2 });
  for (let s = 0; s < 24; s++) { const t = s < 8 ? a0 + s * BEAT / 2 : B(38) + (s - 8) * BEAT / 4, v = voice(chord(t + .01), 50, 69, 3); O.spic(v[s % 3], t, .4 + .2 * s / 24); }
  O.trem(voice('Bm7', 59, 76, 4), a0, BAR, .3, { atk: 1.2 });
  O.trem(voice('G', 59, 76, 4), B(38), BEAT * 2, .4, { atk: .5 });
  O.trem(voice('A', 61, 76, 4), B(38, 2), BEAT * 2, .5, { atk: .5 });
  track(a0, c0).forEach(([t, c]) => O.horns(voice(c, 50, 65, 3), t, BEAT * .8, .5, { atk: .05, rel: .3 }));
  O.roll(45, B(38), BAR, .55, { atk: 1.8 });
  O.swell('swellLong', c0, .6);
  X.riser(B(38), c0, .22);
  // the climax: horns on the theme, violins above, flute and an 8-bit echo on top, the full orchestra beneath
  O.hit('cymHit', c0, .7); O.hit('crash', c0, .45); O.hit('bdrum', c0, .9); O.timp(50, c0, .85);
  sing('horn', bars(THEME, 0, 4), c0, { oct: -1, k: .8, atk: .07 });
  sing('vlnSus', bars(THEME, 0, 4), c0, { k: .72, atk: .1, rel: .9 });
  sing('fluteSus', bars(THEME, 0, 4), c0, { k: .36, oct: 1, atk: .08 });
  sing('vlaSus', bars(THEME, 0, 4).map(([b, m, d, v]) => [b, dia(m, -2), d, v]), c0, { k: .5, atk: .12 });
  chipLead(bars(THEME, 0, 3), c0, { oct: 1, k: .3, duty: .25, echo: .35, lp: 6000, pan: .3 });
  prog(track(c0, c1), { vel: .55, lo: 50, hi: 67, n: 3, atk: .3, rel: .9, cb: true, bassLo: 38 });
  broken('harp', c0, c1, BEAT / 2, .34, { lo: 50, hi: 81 });
  broken('piano', c0, c1, BEAT / 2, .26, { lo: 45, hi: 69, n: 4 });
  for (let b = 0; b < 3; b++) { const t = B(39 + b), r = bassOf(chord(t + .01), 43); O.timp(r > 54 ? r - 12 : r, t, .6); if (b) O.hit('cymHit', t, .32); O.gliss(t - .45, .4, 62, 86, .26, { scale: 'D', cresc: true }); }
  O.roll(50, B(41, 2), BEAT * 2, .4, { atk: .8 });
}

// ---------------------------------------------------------------- 112 - 128 s: every memory, and home
function epilogue() {
  const t0 = B(42);
  // bar 42: the theme's fourth bar on strings and horns, letting go
  sing('vlnSus', bars(THEME, 3, 4), t0, { k: .55, atk: .1, rel: 1.2 });
  sing('horn', bars(THEME, 3, 4), t0, { oct: -1, k: .5, atk: .1 });
  prog(track(t0, B(43)), { vel: .42, lo: 47, hi: 62, n: 3, atk: .3, rel: 1.6, cb: true, bassLo: 38, over: .6 });
  O.hit('cymHit', t0, .25);
  // bars 43-45: a solo piano carries the melody; strings hush; the 8-bit dot returns with its blips
  sing('piano', bars(THEME, 4, 7), B(43), { k: .6, maxD: 2.8, rel: 1.3 });
  broken('piano', B(43), B(46), BEAT, .2, { lo: 43, hi: 62, n: 3, pattern: [0, 1, 2, 1], dur: 1.8 });
  prog(track(B(43), B(46)), { vel: (t) => .2 - .06 * TH.ss(B(43), B(46), t), lo: 57, hi: 74, n: 3, atk: 1.2, rel: 1.4, bassLo: 38, bassK: .6, lp: 4200 });
  for (let k = 0; k < 6; k++) {
    const th = EV.dot + bt(2 * k), c = chord(th + .01), r = bassOf(c, 74);
    X.blip(th, r + 12 > 88 ? r : r + 12, .24, { pan: k % 2 ? .3 : -.3, lp: 3000, echo: .4 });
    X.blip(th + BEAT, bassOf(c, 62) + 7, .14, { lp: 2400, dur: .05, echo: .3 });
  }
  // bar 46: THANK YOU FOR PLAYING: the cadence, the start jingle once more, a harp
  const th = EV.thanks;
  sing('piano', CADENCE.map(([b, ...r]) => [b - 28, ...r]), th, { k: .6, maxD: 6, rel: 2.4 });
  sing('vlnSus', CADENCE.map(([b, ...r]) => [b - 28, ...r]), th, { k: .34, atk: .3, rel: 2 });
  prog([[th, 'A7sus', bt(2)], [th + bt(2), 'A7', bt(2)], [B(47), 'Dadd9', B(48) - B(47) + 1.5]], { vel: .26, lo: 57, hi: 76, n: 4, atk: .8, rel: 2.2, bassLo: 38, bassK: .7, lp: 4500, cb: true });
  O.gliss(th - .1, .7, 57, 88, .3, { scale: 'D', cresc: true, dur: 2.5 });
  [74, 78, 81, 86].forEach((m, i) => X.tone(th + .9 + i * .075, m, .07, .3, { duty: .25, dec: .05, sus: .5, rel: .03, echo: .5, pan: .1 }));
  // bar 47: home. A low D, the music box's first three notes, the last chord
  O.play('piano', 38, B(47), 5, .4, { rel: 2 }); O.play('piano', 50, B(47) + .05, 5, .3, { rel: 2 });
  sing('glock', [[0, 81, 1, .7], [1, 86, 1, .75], [2, 90, 2, .8]], B(47) + bt(.5), { k: .3, maxD: 3, rel: 2 });
  O.swell('swellShort', B(47), .14);
}

const PARTS = [['intro', intro], ['tennis', tennis], ['spacewar', spacewar], ['pong', pong], ['atari', atari], ['arcade', arcade], ['crash', crash], ['revival', revival], ['bits16', bits16], ['threed', threed], ['online', online], ['everyone', everyone], ['today', today], ['epilogue', epilogue]];
module.exports = { PARTS };
