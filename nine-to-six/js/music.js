// An original score for a very ordinary day, synthesized sample by sample. 96 BPM, 4/4: one bar is 2.5 s.
// The little sounds of the day (alarm, phone, train, keys, glass, pencil) are part of the music.
const Music = (() => {
  const SR = 44100, N = Math.floor(SR * DURATION), TAU = Math.PI * 2, BAR = 2.5, BEAT = BAR / 4;
  let L, R, S; let rng = 0x51ee7;
  const rnd = () => { rng = (Math.imul(rng, 1664525) + 1013904223) >>> 0; return rng / 4294967296; };
  const midi = n => 440 * Math.pow(2, (n - 69) / 12);
  const jobs = [];
  const add = (start, len, pan, send, fn) => jobs.push(() => {
    const i0 = Math.max(0, Math.floor(start * SR)), end = Math.min(N, Math.floor((start + len) * SR));
    const l = Math.cos((pan + 1) * Math.PI / 4), r = Math.sin((pan + 1) * Math.PI / 4);
    for (let i = i0; i < end; i++) { const v = fn((i - i0) / SR, i); L[i] += v * l; R[i] += v * r; S[i] += v * send; }
  });

  // ---- pitched instruments ----
  const pluck = (t, n, v = .12, pan = 0) => { const f = midi(n); add(t, 1.1, pan, .3, u => v * Math.min(1, u / .003) * Math.exp(-u * 5.5) * (Math.sin(TAU * f * u) + .3 * Math.sin(TAU * 2 * f * u) * Math.exp(-u * 8) + .12 * Math.sin(TAU * 3 * f * u) * Math.exp(-u * 14))); };
  const marimba = (t, n, v = .1, pan = 0) => { const f = midi(n); add(t, .8, pan, .3, u => v * Math.min(1, u / .002) * Math.exp(-u * 8) * (Math.sin(TAU * f * u) + .45 * Math.sin(TAU * 4 * f * u) * Math.exp(-u * 24))); };
  const box = (t, n, v = .06, pan = 0) => { const f = midi(n); add(t, 2.2, pan, .6, u => v * Math.min(1, u / .002) * Math.exp(-u * 2.4) * (Math.sin(TAU * f * u) + .45 * Math.sin(TAU * 4.01 * f * u) * Math.exp(-u * 5) + .2 * Math.sin(TAU * 6.9 * f * u) * Math.exp(-u * 9))); };
  const epiano = (t, n, d, v = .05, pan = 0) => { const f = midi(n); add(t, d + .6, pan, .35, u => { const e = Math.min(1, u / .008) * (u < d ? Math.exp(-u * 1.6) : Math.exp(-1.6 * d - (u - d) * 8)); return v * e * (Math.sin(TAU * f * u) + .5 * Math.sin(TAU * 2 * f * u) * Math.exp(-u * 3) + .18 * Math.sin(TAU * 7 * f * u) * Math.exp(-u * 12)); }); };
  const bass = (t, n, d, v = .13) => { const f = midi(n); add(t, d + .3, -.05, .1, u => v * Math.min(1, u / .01) * (u < d ? Math.exp(-u * 2.2) : Math.exp(-2.2 * d - (u - d) * 12)) * (Math.sin(TAU * f * u) + .32 * Math.sin(TAU * 2 * f * u) + .1 * Math.sin(TAU * 3 * f * u))); };
  const reed = (t, n, d, v = .08, pan = 0) => { const f = midi(n), ph = rnd() * TAU; add(t, d + .5, pan, .35, u => { const e = Math.min(1, u / .14) * (u < d ? 1 : Math.exp(-(u - d) * 8)), vb = 1 + .003 * Math.sin(TAU * 5.2 * u); return v * e * (Math.sin(TAU * f * u * vb + ph) + .3 * Math.sin(TAU * 2 * f * u) + .12 * Math.sin(TAU * 3 * f * u)); }); };
  const pad = (t, d, notes, v = .025) => { for (const n of notes) { const f = midi(n), ph = rnd() * TAU; add(t, d + .8, 0, .5, u => { const e = Math.min(1, u / .6) * (u < d ? 1 : Math.exp(-(u - d) * 5)); return v * e * (Math.sin(TAU * f * u + ph) + .35 * Math.sin(TAU * f * 1.004 * u) + .12 * Math.sin(TAU * 2 * f * u)); }); } };
  const brass = (t, n, d, v = .07, pan = 0) => { const f = midi(n); add(t, d + .3, pan, .3, u => { const e = Math.min(1, u / .05) * (u < d ? 1 : Math.exp(-(u - d) * 10)), w = TAU * f * u * (1 + .002 * Math.sin(TAU * 5 * u)); let s = 0; for (let k = 1; k <= 6; k++) s += Math.sin(w * k) / Math.pow(k, 1.1); return v * e * s * .55; }); };
  const gliss = (t0, t1, n0, n1, v = .07, pan = 0) => { let ph = 0; add(t0, t1 - t0 + .3, pan, .3, u => { const k = Math.min(1, u / (t1 - t0)); ph += TAU * midi(lerp(n0, n1, k * k * (3 - 2 * k))) / SR; const e = Math.min(1, u / .05) * (u < t1 - t0 ? 1 : Math.exp(-(u - (t1 - t0)) * 12)); return v * e * (Math.sin(ph) + .3 * Math.sin(ph * 2) + .1 * Math.sin(ph * 3)); }); };
  // ---- percussion and noise ----
  const kick = (t, v = .11) => { let ph = 0; add(t, .4, 0, .08, u => { ph += TAU * (52 + 60 * Math.exp(-u * 26)) / SR; return v * Math.exp(-u * 11) * Math.sin(ph); }); };
  const thump = (t, v = .07) => { let ph = 0; add(t, .25, -.1, .1, u => { ph += TAU * (70 + 40 * Math.exp(-u * 30)) / SR; return v * Math.exp(-u * 18) * Math.sin(ph); }); };
  const hat = (t, v = .025, pan = .3) => { let lo = 0; add(t, .1, pan, .2, u => { const q = rnd() * 2 - 1; lo += (q - lo) * .35; return v * (q - lo) * Math.exp(-u * 40); }); };
  const snare = (t, v = .06) => add(t, .22, 0, .3, u => { const q = rnd() * 2 - 1; return v * Math.exp(-u * 22) * (.7 * q + .5 * Math.sin(TAU * 190 * u)); });
  const crash = (t, v = .05) => { let lo = 0; add(t, 2, 0, .5, u => { const q = rnd() * 2 - 1; lo += (q - lo) * .5; return v * (q - lo) * Math.exp(-u * 2.6); }); };
  const sweep = (t0, t1, v = .04, rise = true) => { let lo = 0; add(t0, t1 - t0, 0, .2, u => { const k = u / (t1 - t0), q = rnd() * 2 - 1, kk = rise ? k : 1 - k; lo += (q - lo) * (.02 + .3 * kk * kk); return v * Math.sin(Math.PI * Math.min(1, k * 1.1)) * lo * 2.4; }); };
  const rumble = (t0, t1, v = .05) => { let a = 0, b = 0; add(t0, t1 - t0, 0, .15, u => { const k = u / (t1 - t0), q = rnd() * 2 - 1; a += (q - a) * .02; b += (a - b) * .05; return v * Math.sin(Math.PI * k) * b * 12 * (.7 + .3 * Math.sin(TAU * 13 * u)); }); };
  const breath = (t, d = .9, v = .02) => { let lo = 0; add(t, d, 0, .2, u => { const q = rnd() * 2 - 1; lo += (q - lo) * .03; return v * Math.pow(Math.sin(Math.PI * u / d), 2) * lo * 3; }); };
  // ---- sounds of the day ----
  const tick = (t, v = .03, hi = false) => add(t, .05, hi ? .3 : -.3, .1, u => v * Math.exp(-u * 90) * Math.sin(TAU * (hi ? 2400 : 1700) * u));
  const beep = (t, v = .05) => add(t, .12, 0, .1, u => v * Math.min(1, u / .004) * (u < .1 ? 1 : Math.exp(-(u - .1) * 60)) * (Math.sin(TAU * 2100 * u) + .4 * Math.sin(TAU * 4200 * u)));
  const alarm = (a, b) => { for (let t = a; t < b; t += 1) for (let k = 0; k < 4; k++) beep(t + k * .16, .05); };
  const buzzer = (t, d = .9, v = .05) => add(t, d, 0, .1, u => { const on = (u * 26) % 1 < .5 ? 1 : 0; return v * on * Math.sin(TAU * 170 * u) * (1 - u / d); });
  const ping = (t, n = 88, v = .05, pan = .3) => { const f = midi(n); add(t, .9, pan, .5, u => v * Math.exp(-u * 5) * (Math.sin(TAU * f * u) + .3 * Math.sin(TAU * f * 2.01 * u))); };
  const honk = (t, v = .05) => add(t, .5, 0, .2, u => v * Math.min(1, u / .02) * (u < .4 ? 1 : Math.exp(-(u - .4) * 30)) * (Math.sin(TAU * 420 * u) + .6 * Math.sin(TAU * 530 * u) + .3 * Math.sin(TAU * 840 * u)));
  const key = (t, v = .025, pan = 0) => add(t, .04, pan, .05, u => { const q = rnd() * 2 - 1; return v * Math.exp(-u * 120) * (q * .6 + Math.sin(TAU * 3000 * u) * .4); });
  const clack = (t, v = .03) => { let lo = 0; add(t, .12, 0, .1, u => { const q = rnd() * 2 - 1; lo += (q - lo) * .18; return v * Math.exp(-u * 45) * (lo * 1.6 + Math.sin(TAU * 120 * u) * .6); }); };
  const chime = (t, notes, v = .05) => notes.forEach((n, i) => ping(t + i * .22, n, v, 0));
  const scratch = (t0, t1, v = .02) => { let lo = 0; add(t0, t1 - t0, .1, .05, u => { const q = rnd() * 2 - 1; lo += (q - lo) * .5; return v * (q - lo) * (.5 + .5 * Math.sin(TAU * 7 * u)) * Math.min(1, u / .05, (t1 - t0 - u) / .05); }); };
  const murmur = (t0, t1, v = .02) => { let a = 0, b = 0; add(t0, t1 - t0, 0, .3, u => { const q = rnd() * 2 - 1; a += (q - a) * .06; b += (a - b) * .1; return v * Math.min(1, u / 1, (t1 - t0 - u) / 1) * b * 8 * (.6 + .4 * Math.sin(TAU * 3.7 * u)); }); };
  const glass = (t, v = .05) => { for (const [f, g] of [[2900, 1], [4300, .5], [6100, .25]]) add(t, .8, .2, .5, u => v * g * Math.exp(-u * 9) * Math.sin(TAU * f * u)); };
  const gulp = (t, v = .05) => { let ph = 0; add(t, .22, 0, .05, u => { ph += TAU * (160 - 90 * (u / .22)) / SR; return v * Math.sin(Math.PI * u / .22) * Math.sin(ph); }); };
  const pour = (t0, t1, v = .03) => { let lo = 0; add(t0, t1 - t0, 0, .2, u => { const q = rnd() * 2 - 1; lo += (q - lo) * .12; return v * (q - lo) * 3 * Math.min(1, u / .2) * (.8 + .2 * Math.sin(TAU * 31 * u)); }); };

  const wood = (t, v = .04, f = 1500) => add(t, .08, .1, .08, u => { const q = rnd() * 2 - 1; return v * Math.exp(-u * 70) * (Math.sin(TAU * f * u) * .8 + q * .25); });
  const strum = (t, notes, v = .05, pan = 0) => notes.forEach((n, i) => pluck(t + i * .014, n, v, pan + (i - 1) * .08));
  const swell = (t0, t1, notes, v) => { for (const n of notes) { const f = midi(n); add(t0, t1 - t0 + .4, 0, .5, u => { const k = u / (t1 - t0); return v * Math.pow(Math.min(1, k), 2) * (u < t1 - t0 ? 1 : Math.exp(-(u - (t1 - t0)) * 6)) * (Math.sin(TAU * f * u) + .4 * Math.sin(TAU * f * 1.005 * u) + .15 * Math.sin(TAU * 2 * f * u)); }); } };

  // ---- harmony: D major, with the relative minor for the tired parts ----
  const CH = {
    D: [38, [62, 66, 69]], A: [45, [61, 64, 69]], Bm: [47, [62, 66, 71]], G: [43, [62, 67, 71]], Em: [40, [59, 64, 67]], 'F#m': [42, [61, 66, 69]],
    Bm7: [47, [62, 66, 69]], Em7: [40, [62, 67, 71]], A7: [45, [61, 67, 71]], Dmaj7: [38, [61, 66, 69]]
  };
  const bp = []; // chord per bar
  const put = (from, to, list) => { for (let b = from; b <= to; b++) bp[b] = list[(b - from) % list.length]; };
  put(0, 1, ['D']); put(2, 4, ['D', 'A', 'Bm']); put(5, 5, ['G']); put(6, 11, ['D', 'A', 'Bm', 'G', 'D', 'A']);
  put(12, 19, ['D', 'A', 'Bm', 'G', 'D', 'A', 'G', 'A']); put(20, 22, ['Bm', 'G', 'A']); put(23, 28, ['Bm', 'G', 'D', 'A', 'Bm', 'Em']);
  put(29, 31, ['G', 'D', 'A']); put(32, 34, ['D', 'A', 'Bm']); put(35, 42, ['Bm7', 'G', 'D', 'A7']); put(43, 45, ['D', 'A', 'D']);
  put(46, 50, ['Bm', 'G', 'Em', 'A', 'Bm']); put(51, 55, ['Bm', 'G', 'Em', 'F#m', 'Bm']); put(56, 57, ['Em', 'F#m']);
  put(58, 61, ['Em7', 'A7', 'Dmaj7', 'Bm7']); put(62, 65, ['G', 'D', 'A', 'Bm']); put(66, 73, ['D', 'A', 'Bm', 'G', 'D', 'A', 'G', 'A']); put(74, 74, ['D']);
  const MEL = { D: [78, 81, 78, 74], A: [76, 73, 76, 81], Bm: [78, 74, 71, 74], G: [79, 78, 74, 71], Em: [76, 71, 67, 71], 'F#m': [73, 78, 81, 78], Bm7: [78, 74, 71, 74], Em7: [76, 71, 67, 71], A7: [76, 73, 76, 81], Dmaj7: [78, 81, 78, 74] };
  const secAt = t => t < 5 ? 'intro' : t < 12.5 ? 'wake' : t < 15 ? 'think' : t < 30.5 ? 'rush' : t < 50 ? 'street' : t < 57.4 ? 'platform' : t < 72.5 ? 'metro' : t < 80 ? 'via' : t < 87.5 ? 'arrive' : t < 107.5 ? 'office' : t < 115 ? 'lunch' : t < 127.5 ? 'afternoon' : t < 140 ? 'evening' : t < 145 ? 'walk' : t < 155 ? 'bar' : t < 165 ? 'noodles' : t < 185 ? 'home' : 'end';

  for (let b = 0; b < bp.length; b++) {
    const t = b * BAR, name = bp[b], [root, tones] = CH[name], mel = MEL[name], sec = secAt(t + .1);
    const tone = k => tones[k % 3];
    switch (sec) {
      case 'intro':
        pad(t, BAR, [50, 57, 62, 66], .014 + b * .006);
        for (let k = 0; k < 4; k++) wood(t + k * BEAT + (b ? 0 : BEAT), .035, k % 2 ? 1300 : 1600);
        if (b === 1) { box(t + .3, 86, .04, .3); box(t + 1.25, 81, .04, -.3); }
        break;
      case 'wake':
        pad(t, BAR, tones.map(n => n + 12), .02);
        for (let k = 0; k < 4; k++) { box(t + k * BEAT, mel[k] + 12, .05, k % 2 ? .3 : -.3); if (k % 2 === 0) pluck(t + k * BEAT + BEAT / 2, tone(k) + 12, .05, .15); }
        bass(t, root + 12, BEAT * 1.8, .09); bass(t + BEAT * 2, root + 19, BEAT * 1.6, .07);
        for (let k = 0; k < 8; k++) hat(t + k * BEAT / 2, .012);
        break;
      case 'think':
        swell(t, t + BAR, [50, 57, 62], .02); for (let k = 0; k < 4; k++) wood(t + k * BEAT, .03, 1400 + k * 50);
        if (b === 5) { bass(t, 43, BAR * .9, .09); sweep(t + 1, t + BAR, .03); }
        break;
      case 'rush':
        pad(t, BAR, tones.map(n => n + 12), .02);
        for (let k = 0; k < 4; k++) { kick(t + k * BEAT, k % 2 ? .02 : .075); if (k % 2) snare(t + k * BEAT, .045); }
        for (let k = 0; k < 8; k++) { marimba(t + k * BEAT / 2, [tones[0], tones[1], tones[2], tones[1], tones[2], tones[1], tones[0], tones[1]][k] + 12, .065, k % 2 ? .3 : -.3); hat(t + k * BEAT / 2, .018 + (k % 2) * .008); bass(t + k * BEAT / 2, root + (k % 4 === 2 ? 7 : 12), BEAT * .4, .075); }
        for (let k = 0; k < 4; k++) if (b % 2 === 0) box(t + k * BEAT, mel[k] + 12, .05, .1);
        break;
      case 'street':
        pad(t, BAR, tones.map(n => n + 12), .016);
        for (let k = 0; k < 4; k++) { bass(t + k * BEAT, root + (k % 2 ? 7 : 12), BEAT * .7, .085); hat(t + k * BEAT + BEAT / 2, .02); if (k % 2) strum(t + k * BEAT + BEAT / 2, tones.map(n => n + 12), .04); if (k === 0 || k === 2) kick(t + k * BEAT, .055); if (k === 1 || k === 3) snare(t + k * BEAT, .03); }
        for (let k = 0; k < 4; k++) marimba(t + k * BEAT + BEAT / 2, mel[k] + 12, .06, .2);
        break;
      case 'platform':
        pad(t, BAR, [47, 54, 59], .03); for (let k = 0; k < 4; k++) { kick(t + k * BEAT, .03 + (t - 50) * .004); }
        if (t > 53) for (let k = 0; k < 4; k++) marimba(t + k * BEAT, mel[k] + 12, .04, .2);
        break;
      case 'metro':
        pad(t, BAR, tones.map(n => n + 12), .03); pad(t, BAR, [root + 12], .03);
        for (let k = 0; k < 4; k += 2) bass(t + k * BEAT, root + 12, BEAT * 1.8, .09);
        for (let k = 0; k < 4; k++) { if (k % 2 === 0) epiano(t + k * BEAT, mel[k] + 12, BEAT * 1.8, .045, k ? .25 : -.25); hat(t + k * BEAT + BEAT / 2, .01); }
        break;
      case 'via':
        pad(t, BAR, tones.map(n => n + 12), .03); swell(t, t + BAR, [tones[0] + 12, tones[2] + 12], .012);
        for (let k = 0; k < 8; k++) box(t + k * BEAT / 2, [tones[0], tones[1], tones[2], tones[1] + 12][k % 4] + 12 + (k > 3 ? 12 : 0), .045, k % 2 ? .3 : -.3);
        for (let k = 0; k < 8; k++) tick(t + k * BEAT / 2, .012, k % 2 === 0);
        break;
      case 'arrive':
        for (let k = 0; k < 4; k++) { kick(t + k * BEAT, .06); wood(t + k * BEAT + BEAT / 2, .04); marimba(t + k * BEAT, mel[k] + 12, .07, k % 2 ? .3 : -.3); }
        bass(t, root + 12, BEAT * 1.8, .1); bass(t + BEAT * 2, root + 19, BEAT * 1.8, .08); pad(t, BAR, tones.map(n => n + 12), .02);
        break;
      case 'office': {
        for (let k = 0; k < 4; k++) {
          if (k === 0 || k === 2) { for (let j = 0; j < 3; j++) epiano(t + k * BEAT + (k ? .07 : 0) + j * .012, tones[j] + 12, BEAT * 1.6, .034, j - 1 ? .2 : -.2); }
          kick(t + k * BEAT, k % 2 ? 0 : .08); if (k % 2) snare(t + k * BEAT, .04); hat(t + k * BEAT, .012, -.3); hat(t + k * BEAT + BEAT * .66, .02);
          bass(t + k * BEAT, root + 12 + [0, 7, 12, 7][k], BEAT * .8, .1);
        }
        epiano(t + BEAT * 3 + BEAT / 2, mel[b % 4] + 12, BEAT * .6, .03, .3); break;
      }
      case 'lunch':
        for (let k = 0; k < 8; k++) { pluck(t + k * BEAT / 2, tones[k % 3] + 12, .07, k % 2 ? .3 : -.3); hat(t + k * BEAT / 2, .022); wood(t + k * BEAT / 2 + BEAT / 4, .02, 1800); }
        kick(t, .08); kick(t + BEAT * 2, .08); snare(t + BEAT, .04); snare(t + BEAT * 3, .04); bass(t, root + 12, BEAT * .7, .09); bass(t + BEAT * 2, root + 19, BEAT * .7, .08);
        break;
      case 'afternoon':
        pad(t, BAR, tones.map(n => n + 12), .028);
        if (b % 2 === 0) for (let j = 0; j < 3; j++) epiano(t + j * .012, tones[j] + 12, BAR * .9, .03, j - 1 ? .2 : -.2);
        bass(t, root + 12, BAR * .9, .09); kick(t, .05); kick(t + BEAT * 2, .04); hat(t + BEAT, .012); hat(t + BEAT * 3, .012);
        for (let k = 0; k < 4; k += 2) box(t + k * BEAT + .3, mel[k] + 12, .035, .2);
        break;
      case 'evening':
        pad(t, BAR, tones.map(n => n + 12), .03); pad(t, BAR, [root + 12], .035);
        for (let k = 0; k < 4; k += 2) { bass(t + k * BEAT, root + 12, BEAT * 1.8, .1); kick(t + k * BEAT, .05); }
        for (let k = 0; k < 4; k += 2) reed(t + k * BEAT + .05, mel[k] - 0, BEAT * 1.7, .05, .1);
        break;
      case 'walk':
        pad(t, BAR, tones.map(n => n + 12), .02);
        for (let k = 0; k < 4; k += 2) epiano(t + k * BEAT, mel[k], BEAT * 1.8, .04, -.2);
        break;
      case 'bar': {
        for (let k = 0; k < 4; k++) {
          bass(t + k * BEAT, root + 12 + [0, 4, 7, 9][k] * (name.includes('m') ? (k === 1 ? -1 : 1) : 1), BEAT * .9, .1);
          hat(t + k * BEAT + BEAT * .66, .02); hat(t + k * BEAT, .014, -.3); if (k % 2) snare(t + k * BEAT, .022);
          if (k === 0 || k === 2) for (let j = 0; j < 3; j++) epiano(t + k * BEAT + (k ? .08 : 0) + j * .01, tones[j] + 12, BEAT * 1.3, .032, j - 1 ? .2 : -.2);
        }
        epiano(t + BEAT * 3 + BEAT * .66, mel[b % 4] + 12, BEAT * .5, .04, .3); reed(t + BEAT, mel[(b + 1) % 4], BEAT * 1.2, .035, .2); break;
      }
      case 'noodles':
        pad(t, BAR, tones.map(n => n + 12), .014);
        for (let k = 0; k < 4; k++) if (k % 2 === 0 || b % 2) pluck(t + k * BEAT, tone(k) + 12, .05, k % 2 ? .25 : -.25);
        if (b % 2 === 0) bass(t, root + 12, BAR * .9, .06);
        break;
      case 'home':
        pad(t, BAR, tones.map(n => n + 12), .02 * (1 - inv(175, 184, t) * .6));
        for (let k = 0; k < 4; k++) if (t < 182) box(t + k * BEAT, mel[k] + 12 + (k % 2 ? 0 : 0), .05 * (1 - inv(172, 182, t) * .6), k % 2 ? .3 : -.3);
        if (t < 178) { bass(t, root + 12, BAR * .9, .07); if (b % 2 === 0) for (let k = 0; k < 4; k += 2) pluck(t + k * BEAT + BEAT / 2, tone(k) + 12, .035, .1); }
        break;
    }
  }
  // ---- the day's little sounds and moments ----
  alarm(4.0, 6.6);
  for (let t = 15; t < 30.5; t += BEAT) if (t < 22 || t > 26.6) { /* drums already carry the pulse */ }
  gliss(22.4, 23.3, 79, 52, .07, .2); [23.5, 24.1].forEach((t, i) => gliss(t, t + .5, 44 - i * 2, 36, .05));
  for (let j = 0; j < 8; j++) snare(26.2 + j * .09, .02 + j * .007); brass(26.95, 50, .4, .05); 
  ping(14.5, 88, .05, .3); ping(14.65, 93, .04, .2);
  sweep(30.5, 33, .02); [33.6, 34.6].forEach(t => tick(t, .04));
  for (const t of [31.5, 36.2, 40.4, 44.3, 47.2]) honk(t + 1.2, .03);
  [39.6, 40.2, 41.0].forEach(t => key(t, .04)); gliss(42.6, 43.0, 66, 54, .05); gliss(43.0, 43.6, 62, 48, .05);
  rumble(51, 55, .09); sweep(51.4, 54.4, .05, false); for (const [k, n] of [[0, 84], [1, 79], [2, 72]]) ping(54.1 + k * .25, n, .06, 0);
  murmur(50, 58, .04);
  const clatter = (a, b, v) => { for (let t = a; t < b; t += BEAT / 2) { clack(t, v); clack(t + BEAT / 4, v * .6); } };
  clatter(57.4, 72, .026); rumble(57.4, 72, .05); murmur(57.4, 72, .035);
  box(62.8, 86, .06, .2); box(63.05, 90, .06, .3); gliss(63.7, 64.6, 67, 52, .06, -.2); ping(64.6, 86, .06, .2); ping(64.75, 91, .05, .3); chime(67.2, [79, 76, 72], .045);
  clatter(72, 80, .02); sweep(72, 74, .04); sweep(78, 80.4, .04);
  for (let t = 91; t < 96; t += .09 + rnd() * .12) key(t, .02, rnd() * .6 - .3);
  buzzer(94.6, .9, .05); for (let k = 0; k < 8; k++) ping(96.5 + k * .4, 84 + (k % 3) * 2, .05, .3 - k * .06);
  for (let t = 100.2; t < 102.3; t += .05 + rnd() * .06) scratch(t, t + .05, .012);
  brass(102.4, 38, .9, .09, -.3); brass(102.4, 45, .9, .07); thump(103.3, .12); crash(103.3, .03);
  for (let t = 103.8; t < 105.8; t += .11 + rnd() * .12) key(t, .02, rnd() * .6 - .3);
  for (let t = 107; t < 112; t += .38 + rnd() * .2) glass(t, .012 + rnd() * .01);
  murmur(107, 113, .03); gliss(111.3, 112.4, 62, 44, .05); sweep(112.2, 113, .05, false);
  for (let t = 115.5; t < 126; t += .12 + rnd() * .16) key(t, .015, rnd() * .6 - .3);
  buzzer(121.2, .9, .05); brass(117.4, 38, 1.2, .08, -.3); brass(117.4, 45, 1.2, .06); thump(118.6, .1); chime(126.1, [74, 69], .05);
  clatter(128, 137, .03); rumble(128, 137, .06); murmur(128, 137, .05); clatter(137, 140, .022);
  buzzer(143.3, .9, .05); sweep(144.4, 145.4, .03);
  pour(147.4, 149.4, .035); glass(149.9, .04); gulp(151.7, .05); gulp(152.3, .05); gulp(152.9, .05); glass(153.5, .025); buzzer(154.8, .8, .05);
  murmur(145, 156, .03);
  for (let t = 160.7; t < 165.4; t += .52) thump(t, .03);
  for (let t = 172.3; t < 177; t += .55) scratch(t, t + .32 + rnd() * .2, .022);
  for (let t = 178.8; t < 184.6; t += 2.6) breath(t, 1.2, .03);
  for (let t = 168; t < 184; t += 1.25) wood(t, .02 * (1 - inv(168, 184, t) * .5), Math.round(t / 1.25) % 2 ? 1300 : 1600);
  alarm(184.2, 185.5); crash(184.2, .02);
  // the last chord: warm, hopeful, resolved
  pad(186, 1.6, [50, 57, 62, 66, 69], .05); [74, 78, 81, 86].forEach((n, i) => box(186.1 + i * .3, n, .07, (i - 1.5) * .25)); bass(186, 38, 1.5, .1);

  function build(progress = () => { }) {
    return new Promise(resolve => {
      L = new Float32Array(N); R = new Float32Array(N); S = new Float32Array(N);
      let i = 0;
      const tick2 = () => {
        const end = Math.min(jobs.length, i + 60);
        while (i < end) jobs[i++]();
        progress(i / jobs.length * .86);
        if (i < jobs.length) { setTimeout(tick2, 0); return; }
        for (const [sec, g, p] of [[.11, .16, .08], [.19, .12, -.07], [.33, .09, .05], [.47, .055, -.04]]) {
          const sh = Math.floor(sec * SR);
          for (let j = sh; j < N; j++) { L[j] += S[j - sh] * g * (1 - p); R[j] += S[j - sh] * g * (1 + p); }
        }
        for (let j = 0; j < N; j++) {
          const fade = Math.min(1, j / (SR * .3), (N - j) / (SR * .9));
          L[j] = Math.tanh(L[j] * 2.8) * .85 * fade; R[j] = Math.tanh(R[j] * 2.8) * .85 * fade;
        }
        progress(1); resolve({ L, R, SR });
      };
      setTimeout(tick2, 0);
    });
  }
  return { build };
})();
