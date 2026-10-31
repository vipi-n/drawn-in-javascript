// An original score for the fable, synthesized sample by sample. 96 BPM, 4/4, so one bar is 2.5 s
// and the big story beats (the start at 15 s, the finish at 50 s) land on bar lines.
const Music = (() => {
  const SR = 44100, N = SR * DURATION, TAU = Math.PI * 2, BAR = 2.5, BEAT = BAR / 4;
  let L, R, S; let rng = 0x7a1e5;
  const rnd = () => { rng = (Math.imul(rng, 1664525) + 1013904223) >>> 0; return rng / 4294967296; };
  const midi = n => 440 * Math.pow(2, (n - 69) / 12);
  const jobs = [];
  const add = (start, len, pan, send, fn) => jobs.push(() => {
    const i0 = Math.max(0, Math.floor(start * SR)), end = Math.min(N, Math.floor((start + len) * SR));
    const l = Math.cos((pan + 1) * Math.PI / 4), r = Math.sin((pan + 1) * Math.PI / 4);
    for (let i = i0; i < end; i++) { const v = fn((i - i0) / SR, i); L[i] += v * l; R[i] += v * r; S[i] += v * send; }
  });

  // ---- instruments ----
  function pluck(t, n, v = .15, pan = 0) {
    const f = midi(n);
    add(t, 1.1, pan, .3, u => v * Math.min(1, u / .003) * Math.exp(-u * 5.5) * (Math.sin(TAU * f * u) + .3 * Math.sin(TAU * 2 * f * u) * Math.exp(-u * 8) + .12 * Math.sin(TAU * 3 * f * u) * Math.exp(-u * 14)));
  }
  function marimba(t, n, v = .12, pan = 0) {
    const f = midi(n);
    add(t, .8, pan, .3, u => v * Math.min(1, u / .002) * Math.exp(-u * 8) * (Math.sin(TAU * f * u) + .45 * Math.sin(TAU * 4 * f * u) * Math.exp(-u * 24)));
  }
  function bell(t, n, v = .1, pan = 0) {
    const f = midi(n), p = rnd() * TAU;
    add(t, 2.4, pan, .55, u => v * Math.min(1, u / .004) * Math.exp(-u * 2.2) * (Math.sin(TAU * f * u + p) + .3 * Math.sin(TAU * f * 2.71 * u) + .12 * Math.sin(TAU * f * 5.31 * u)));
  }
  function box(t, n, v = .07, pan = 0) {
    const f = midi(n);
    add(t, 2, pan, .6, u => v * Math.min(1, u / .002) * Math.exp(-u * 2.6) * (Math.sin(TAU * f * u) + .45 * Math.sin(TAU * 4.01 * f * u) * Math.exp(-u * 5) + .2 * Math.sin(TAU * 6.9 * f * u) * Math.exp(-u * 9)));
  }
  function bass(t, n, d, v = .14) {
    const f = midi(n);
    add(t, d + .3, -.05, .12, u => v * Math.min(1, u / .01) * (u < d ? Math.exp(-u * 2.2) : Math.exp(-2.2 * d - (u - d) * 12)) * (Math.sin(TAU * f * u) + .32 * Math.sin(TAU * 2 * f * u) + .1 * Math.sin(TAU * 3 * f * u)));
  }
  function reed(t, n, d, v = .1, pan = 0) {
    const f = midi(n), ph = rnd() * TAU;
    add(t, d + .5, pan, .35, u => {
      const e = Math.min(1, u / .12) * (u < d ? 1 : Math.exp(-(u - d) * 8)), vb = 1 + .003 * Math.sin(TAU * 5.2 * u);
      return v * e * (Math.sin(TAU * f * u * vb + ph) + .3 * Math.sin(TAU * 2 * f * u) + .12 * Math.sin(TAU * 3 * f * u));
    });
  }
  function pad(t, d, notes, v = .03) {
    for (const n of notes) {
      const f = midi(n), ph = rnd() * TAU;
      add(t, d + .8, 0, .5, u => {
        const e = Math.min(1, u / .5) * (u < d ? 1 : Math.exp(-(u - d) * 5));
        return v * e * (Math.sin(TAU * f * u + ph) + .35 * Math.sin(TAU * f * 1.004 * u) + .12 * Math.sin(TAU * 2 * f * u));
      });
    }
  }
  function brass(t, n, d, v = .09, pan = 0) {
    const f = midi(n);
    add(t, d + .3, pan, .3, u => {
      const e = Math.min(1, u / .05) * (u < d ? 1 : Math.exp(-(u - d) * 10)), w = TAU * f * u * (1 + .002 * Math.sin(TAU * 5 * u));
      let s = 0; for (let k = 1; k <= 6; k++) s += Math.sin(w * k) / Math.pow(k, 1.1);
      return v * e * s * .55;
    });
  }
  function comic(t, n, v = .1, pan = 0) {
    const f = midi(n);
    add(t, .3, pan, .15, u => v * Math.min(1, u / .006) * Math.exp(-u * 12) * (Math.sin(TAU * f * u) + .55 * Math.sin(TAU * 2 * f * u) + .35 * Math.sin(TAU * 3 * f * u)));
  }
  function gliss(t0, t1, n0, n1, v = .09, pan = 0) {
    let ph = 0;
    add(t0, t1 - t0 + .3, pan, .3, u => {
      const k = Math.min(1, u / (t1 - t0)); ph += TAU * midi(lerp(n0, n1, k * k * (3 - 2 * k))) / SR;
      const e = Math.min(1, u / .05) * (u < t1 - t0 ? 1 : Math.exp(-(u - (t1 - t0)) * 12));
      return v * e * (Math.sin(ph) + .3 * Math.sin(ph * 2) + .1 * Math.sin(ph * 3));
    });
  }
  function kick(t, v = .12) { let ph = 0; add(t, .4, 0, .08, u => { ph += TAU * (52 + 60 * Math.exp(-u * 26)) / SR; return v * Math.exp(-u * 11) * Math.sin(ph); }); }
  function thump(t, v = .08) { let ph = 0; add(t, .25, -.1, .1, u => { ph += TAU * (70 + 40 * Math.exp(-u * 30)) / SR; return v * Math.exp(-u * 18) * Math.sin(ph); }); }
  function shaker(t, v = .03, pan = .3) { let lo = 0; add(t, .12, pan, .2, u => { const q = rnd() * 2 - 1; lo += (q - lo) * .35; return v * (q - lo) * Math.exp(-u * 36); }); }
  function snare(t, v = .07) { add(t, .22, 0, .3, u => { const q = rnd() * 2 - 1; return v * Math.exp(-u * 22) * (.7 * q + .5 * Math.sin(TAU * 190 * u)); }); }
  function crash(t, v = .06) { let lo = 0; add(t, 2.2, 0, .5, u => { const q = rnd() * 2 - 1; lo += (q - lo) * .5; return v * (q - lo) * Math.exp(-u * 2.6); }); }
  function whoosh(t0, t1, v = .03) {
    let lo = 0; add(t0, t1 - t0, .1, .2, u => {
      const k = u / (t1 - t0), q = rnd() * 2 - 1; lo += (q - lo) * (.03 + .35 * Math.sin(Math.PI * k));
      return v * Math.sin(Math.PI * k) * lo * 2;
    });
  }
  function breath(t, d = .9, v = .02) { let lo = 0; add(t, d, 0, .2, u => { const q = rnd() * 2 - 1; lo += (q - lo) * .03; return v * Math.pow(Math.sin(Math.PI * u / d), 2) * lo * 3; }); }
  function cheer(t0, t1, v = .03) {
    let a = 0, b = 0; add(t0, t1 - t0, 0, .35, u => {
      const q = rnd() * 2 - 1; a += (q - a) * .12; b += (a - b) * .12;
      const k = u / (t1 - t0);
      return v * Math.min(1, u / .3) * (1 - Math.pow(k, 3)) * (a - b) * 4 * (.7 + .3 * Math.sin(TAU * 7.3 * u));
    });
  }

  // ---- harmony ----
  const CH = { C: [48, [60, 64, 67]], Am: [45, [57, 60, 64]], F: [41, [53, 57, 60]], G: [43, [55, 59, 62]] };
  const prog = ['C', 'Am', 'F', 'G', 'C', 'Am', 'F', 'G', 'F', 'G', 'C', 'G', 'F', 'C', 'G', 'Am', 'F', 'C', 'G', 'G', 'C', 'F', 'G', 'C'];
  const T1 = { C: [64, 67, 64, 60], Am: [64, 69, 67, 64], F: [65, 69, 72, 69], G: [67, 71, 74, 71] };
  const T2 = { C: [72, 67, 64, 67], Am: [69, 72, 69, 64], F: [72, 69, 65, 69], G: [71, 67, 62, 67] };
  const T3 = { C: [76, 79, 76, 72], Am: [76, 81, 79, 76], F: [77, 81, 84, 81], G: [79, 83, 86, 83] };

  for (let b = 0; b < 24; b++) {
    const t = b * BAR, name = prog[b], [root, tones] = CH[name];
    // bass: steady, patient, like the tortoise
    const dashBar = b >= 6 && b <= 8, sprint = b === 19;
    for (const k of dashBar || sprint ? [0, 1, 2, 3] : [0, 2]) {
      bass(t + k * BEAT, root + (k === 2 ? 7 : 0), BEAT * .8, dashBar || sprint ? .13 : (b >= 12 && b <= 18 ? .09 : .13));
    }
    if (b < 12 || b >= 20) pad(t, BAR, tones.map(n => n + 12), b < 2 ? .012 : .02);
  }
  // opening: the tortoise's dignified theme
  for (let k = 0; k < 4; k++) { marimba(0.3 + k * BEAT, T1.C[k], .1, -.2); marimba(BAR + .3 + k * BEAT, T1.Am[k], .1, -.2); }
  bell(4.4, 84, .05, .3);
  // the hare bounds in and laughs
  [4.65, 5.35, 6.05].forEach((t, i) => pluck(t, [72, 76, 79][i], .12, .3));
  [67, 67, 72, 67, 64, 64, 71, 64, 67, 67, 72, 67].forEach((n, i) => comic(6.7 + i * .25, n, .1, .2));
  for (let t = 6.7; t < 9.7; t += BEAT / 2) shaker(t, .018);
  // the challenge: the theme answers, steady and warm
  for (let k = 0; k < 4; k++) { reed(10 + k * BEAT, T2.C[k], BEAT * .9, .09, -.15); reed(12.5 + k * BEAT, T2.Am[k], BEAT * .9, .09, -.15); }
  bell(11.1, 91, .04, .3); bell(11.9, 88, .04, -.3);
  for (let t = 12.5; t < 14.3; t += BEAT / 2) shaker(t, .02 + (t - 12.5) * .012);
  for (let j = 0; j < 8; j++) snare(14.2 + j * .1, .02 + j * .011);
  kick(14.4, .1); kick(14.7, .12);
  // GO!
  brass(15, 60, .7, .09, -.2); brass(15, 64, .7, .07); brass(15, 67, .7, .07, .2); crash(15, .06);
  // the hare dashes: quick plucked arpeggios
  for (let b = 6; b <= 8; b++) {
    const t = b * BAR, tones = CH[prog[b]][1];
    for (let k = 0; k < 4; k++) {
      kick(t + k * BEAT, .11);
      if (k % 2) snare(t + k * BEAT, .06);
      for (let j = 0; j < 4; j++) marimba(t + k * BEAT + j * BEAT / 4, tones[[0, 1, 2, 1][j]] + (b === 8 && j > 1 ? 24 : 12), .075, (j % 2 ? .25 : -.25));
      shaker(t + k * BEAT + BEAT / 2, .028);
    }
    brass(t, tones[0], .35, .06);
  }
  whoosh(15.1, 21, .03);
  // he stops and chuckles
  gliss(21.1, 21.7, 72, 60, .06);
  [76, 76, 76, 79, 76, 76, 76].forEach((n, i) => comic(22.6 + i * .3, n, .07, .2));
  // strolling to the tree
  for (let k = 0; k < 8; k++) pluck(25 + k * BEAT / 2 * 1.0 + .0, [64, 67, 64, 69, 64, 67, 62, 64][k], .07, .15);
  // the yawn
  gliss(27.7, 29.4, 79, 58, .08, .1);
  // lullaby: music box over a drifting pad, with slow breaths
  for (let b = 12; b <= 17; b++) {
    const t = b * BAR, [root, tones] = CH[prog[b]], mel = T3[prog[b]];
    pad(t, BAR, [...tones, tones[0] + 12], .026);
    for (let k = 0; k < 4; k++) {
      box(t + k * BEAT, tones[k % 3] + 12 + (k === 3 ? 0 : 0), .045, k % 2 ? .3 : -.3);
      if (k % 2 === 0) box(t + k * BEAT + BEAT / 2, mel[k], .06, .1);
    }
  }
  for (let t = 32.4; t < 46.8; t += 2.6) breath(t, 1.1, .02);
  // the tortoise plods past: soft, even footfalls that never speed up or stop
  for (let t = 32.5; t < 47; t += BEAT) thump(t, .07 + (t - 32.5) * .002);
  // tension gathers as the finish line nears
  reed(40, 67, 4.6, .03, 0); reed(45, 71, 2.1, .045, 0); reed(45, 74, 2.1, .03, .2);
  for (let j = 0; j < 12; j++) snare(44.6 + j * .2, .012 + j * .004);
  // the hare wakes
  crash(47.1, .075); gliss(47.15, 47.5, 60, 88, .09, -.2);
  brass(47.1, 61, .5, .08, -.3); brass(47.1, 64, .5, .07); brass(47.1, 70, .5, .07, .3);
  // the sprint to the line, and the fanfare as the tortoise breaks the tape
  for (let b = 19; b <= 19; b++) {
    const t = b * BAR + .05;
    for (let k = 0; k < 4; k++) {
      kick(t + k * BEAT, .1);
      for (let j = 0; j < 4; j++) marimba(t + k * BEAT + j * BEAT / 4, CH.G[1][[0, 1, 2, 1][j]] + 12 + (k > 1 ? 12 : 0), .07, j % 2 ? .25 : -.25);
    }
    for (let j = 0; j < 16; j++) snare(t + j * BEAT / 4, .02 + j * .003);
  }
  [60, 64, 67, 72].forEach((n, i) => brass(50, n, 1.5, .09, (i - 1.5) * .25));
  crash(50, .09); cheer(50, 54, .05);
  [72, 76, 79, 84, 88, 91].forEach((n, i) => bell(50.05 + i * .11, n, .08, (i % 2 ? .3 : -.3)));
  // celebration: the theme, brighter now
  for (let b = 20; b <= 22; b++) {
    const t = b * BAR, mel = T3[prog[b]], tones = CH[prog[b]][1];
    for (let k = 0; k < 4; k++) {
      reed(t + k * BEAT + (b === 20 ? .2 : 0), mel[k] - (b === 22 ? 12 : 0), BEAT * .9, .09, .05);
      bell(t + k * BEAT + (b === 20 ? .2 : 0), mel[k] + 12, .05, (k % 2 ? .3 : -.3));
      if (b < 22 && k % 2 === 0) kick(t + k * BEAT, .08);
      if (b < 22) shaker(t + k * BEAT + BEAT / 2, .025);
    }
  }
  // the hare's small sad trombone
  [70, 69, 68, 67].forEach((n, i) => gliss(52.7 + i * .42, 52.7 + i * .42 + .38, n + .2, n - .6, .045, -.4));
  // resolution
  pad(57.5, 2.5, [48, 60, 64, 67, 72], .04); reed(57.5, 72, 2.2, .07, 0); bass(57.5, 36, 2.2, .14);
  bell(57.6, 79, .06, .2); bell(58.3, 76, .05, -.2); bell(59.1, 84, .035, 0);

  function build(progress = () => { }) {
    return new Promise(resolve => {
      L = new Float32Array(N); R = new Float32Array(N); S = new Float32Array(N);
      let i = 0;
      const tick = () => {
        const end = Math.min(jobs.length, i + 40);
        while (i < end) jobs[i++]();
        progress(i / jobs.length * .86);
        if (i < jobs.length) { setTimeout(tick, 0); return; }
        // a few soft delay taps give the dry instruments a little room
        for (const [sec, g, p] of [[.11, .16, .08], [.19, .12, -.07], [.33, .09, .05], [.47, .055, -.04]]) {
          const sh = Math.floor(sec * SR);
          for (let j = sh; j < N; j++) { L[j] += S[j - sh] * g * (1 - p); R[j] += S[j - sh] * g * (1 + p); }
        }
        for (let j = 0; j < N; j++) {
          const fade = Math.min(1, j / (SR * .3), (N - j) / (SR * .9));
          L[j] = Math.tanh(L[j] * 2.1) * .85 * fade; R[j] = Math.tanh(R[j] * 2.1) * .85 * fade;
        }
        progress(1); resolve({ L, R, SR });
      };
      setTimeout(tick, 0);
    });
  }
  return { build };
})();
