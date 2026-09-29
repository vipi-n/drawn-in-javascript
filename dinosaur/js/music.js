// Original score + sound design, synthesized sample-by-sample and timed to the film.
const Music = (() => {
  const SR = 44100;
  const N = Math.ceil(SR * DURATION);
  let L, R, S;
  let rs = 1234567;
  const rnd = () => { rs = (Math.imul(rs, 1664525) + 1013904223) >>> 0; return rs / 4294967296; };
  const noise = () => rnd() * 2 - 1;
  const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
  const W2 = 2 * Math.PI;
  const jobs = [];
  const job = f => jobs.push(f);

  // write a generator into the mix; tails past the end wrap to the start so the loop is seamless
  function write(t0, len, pan, send, gen) {
    const i0 = Math.floor(t0 * SR), n = Math.floor(len * SR);
    const gl = Math.cos((pan + 1) * Math.PI / 4), gr = Math.sin((pan + 1) * Math.PI / 4);
    for (let k = 0; k < n; k++) {
      let i = i0 + k; if (i < 0) continue; if (i >= N) i -= N; if (i >= N) break;
      const v = gen(k / SR);
      L[i] += v * gl; R[i] += v * gr; S[i] += v * send;
    }
  }
  function svf() { // Chamberlin state-variable filter
    let low = 0, band = 0;
    return (x, fc, q = .7) => { const f = 2 * Math.sin(Math.PI * Math.min(fc, SR / 6) / SR); low += f * band; const high = x - low - q * band; band += f * high; return { low, band, high }; };
  }
  function onePole() { let y = 0; return (x, fc) => { const a = 1 - Math.exp(-W2 * fc / SR); y += a * (x - y); return y; }; }

  // ---------------- instruments ----------------
  const marimba = (t, m, v = .3, pan = 0, send = .25) => job(() => {
    const w = W2 * mtof(m);
    write(t, 1.4, pan, send, tt => v * Math.min(1, tt / .002) * (Math.sin(w * tt) * Math.exp(-tt * 5.5) + .35 * Math.sin(3.93 * w * tt) * Math.exp(-tt * 24) + .08 * Math.sin(10.1 * w * tt) * Math.exp(-tt * 80)));
  });
  const glock = (t, m, v = .18, pan = 0, send = .45) => job(() => {
    const w = W2 * mtof(m);
    write(t, 2.6, pan, send, tt => v * Math.min(1, tt / .001) * (Math.sin(w * tt) * Math.exp(-tt * 2.4) + .45 * Math.sin(2.756 * w * tt) * Math.exp(-tt * 6) + .2 * Math.sin(5.404 * w * tt) * Math.exp(-tt * 12)));
  });
  const pluck = (t, m, v = .22, pan = 0, send = .2, len = 1.1) => job(() => {
    const P = Math.max(2, Math.round(SR / mtof(m))), buf = new Float32Array(P);
    let lp = 0; for (let k = 0; k < P; k++) { lp += .55 * (noise() - lp); buf[k] = lp; }
    let idx = 0;
    write(t, len, pan, send, tt => {
      const y = buf[idx], nx = (idx + 1) % P; buf[idx] = .996 * .5 * (buf[idx] + buf[nx]); idx = nx;
      return v * y * Math.min(1, (len - tt) / .05);
    });
  });
  const bass = (t, m, dur, v = .3, send = .04) => job(() => {
    const w = W2 * mtof(m);
    write(t, dur + .3, 0, send, tt => {
      const e = Math.min(1, tt / .012) * (tt < dur ? Math.exp(-tt * 1.6) : Math.exp(-dur * 1.6) * Math.exp(-(tt - dur) * 14));
      const s = Math.sin(w * tt) + .35 * Math.sin(2 * w * tt) + .1 * Math.sin(3 * w * tt);
      return v * e * Math.tanh(1.4 * s) / 1.1;
    });
  });
  const pad = (t, ms, dur, v = .06, send = .6, bright = 5) => job(() => {
    const att = Math.min(.6, dur / 3), rel = .9;
    ms.forEach((m, j) => {
      const f = mtof(m), pan = (j / Math.max(1, ms.length - 1)) * 1.2 - .6;
      write(t, dur + rel, pan, send, tt => {
        const e = tt < att ? tt / att : tt < dur ? 1 : Math.max(0, 1 - (tt - dur) / rel);
        let s = 0;
        for (let h = 1; h <= bright; h++) s += (Math.sin(W2 * f * h * 1.004 * tt) + Math.sin(W2 * f * h * .996 * tt + h)) / (h * h * .8 + .2);
        return v * e * e * s * .5;
      });
    });
  });
  const piano = (t, m, v = .2, pan = 0, send = .45) => job(() => {
    const f = mtof(m);
    write(t, 3.2, pan, send, tt => {
      let s = 0;
      for (let h = 1; h <= 6; h++) s += Math.sin(W2 * f * h * Math.sqrt(1 + .0004 * h * h) * tt) * Math.exp(-tt * (1 + h * .7)) / Math.pow(h, 1.3);
      return v * Math.min(1, tt / .003) * s + (tt < .006 ? noise() * v * .2 : 0);
    });
  });
  const kick = (t, v = .5) => job(() => {
    let ph = 0;
    write(t, .5, 0, .02, tt => { ph += W2 * (45 + 80 * Math.exp(-tt * 28)) / SR; return v * Math.sin(ph) * Math.exp(-tt * 7); });
  });
  const timp = (t, m, v = .45) => job(() => {
    let ph = 0; const f = mtof(m), lp = onePole();
    write(t, 1.6, 0, .15, tt => { ph += W2 * f * (1 + .15 * Math.exp(-tt * 20)) / SR; return v * (Math.sin(ph) * Math.exp(-tt * 3.2) + lp(noise(), 600) * 1.2 * Math.exp(-tt * 30)); });
  });
  const clap = (t, v = .2, pan = 0) => job(() => {
    const f = svf();
    write(t, .35, pan, .25, tt => { const b = tt < .01 ? 1 : tt < .02 ? .5 : 1; return v * b * f(noise(), 1400, .6).band * 2.2 * Math.exp(-tt * 18); });
  });
  const shaker = (t, v = .06, pan = .3) => job(() => {
    const lp = onePole();
    write(t, .1, pan, .1, tt => { const x = noise(); return v * (x - lp(x, 5000)) * Math.min(1, tt / .004) * Math.exp(-tt * 50); });
  });
  const tick = (t, v = .2, f = 1700, pan = 0) => job(() => {
    write(t, .12, pan, .2, tt => v * (Math.sin(W2 * f * tt) * Math.exp(-tt * 70) + noise() * .3 * Math.exp(-tt * 200)));
  });

  // ---------------- sound effects ----------------
  const crack = (t, v = .3) => job(() => {
    const lp = onePole();
    write(t, .22, .1, .15, tt => { let e = 0; for (const o of [0, .045, .1]) if (tt >= o) e += Math.exp(-(tt - o) * 140); const x = noise(); return v * e * (x - lp(x, 1800)); });
  });
  const whoosh = (t, dur, v = .2, f0 = 400, f1 = 2400, pan = 0) => job(() => {
    const f = svf();
    write(t, dur, pan, .3, tt => { const u = tt / dur; return v * Math.pow(Math.sin(Math.PI * u), 2) * f(noise(), f0 * Math.pow(f1 / f0, u), .5).band; });
  });
  const buzz = (t0, t1, v = .03, pan = .2) => job(() => {
    const lp = onePole(); let ph = 0; const d = t1 - t0;
    write(t0, d, pan, .15, tt => {
      ph += (180 + 25 * Math.sin(tt * 9)) / SR; const saw = 2 * (ph % 1) - 1;
      const e = Math.min(1, tt / .15, (d - tt) / .2) * (.6 + .4 * Math.sin(W2 * 34 * tt));
      return v * e * lp(saw, 1400);
    });
  });
  const roar = (t, dur, v = .35, pitch = 78, cut = 900) => job(() => {
    const f = svf(), g = svf(); let ph = 0;
    write(t, dur + .2, .1, .35, tt => {
      const e = Math.min(1, tt / .07) * (tt < dur ? 1 - .3 * tt / dur : Math.max(0, 1 - (tt - dur) / .2));
      ph += pitch * (1 + .1 * Math.sin(W2 * 6.5 * tt) + .15 * (1 - tt / dur)) / SR;
      const saw = 2 * (ph % 1) - 1, n = noise();
      const x = f(saw * .9 + n * .8, cut * (1 - .4 * tt / dur), .35).low + g(n, 380, .4).band * .9;
      return v * e * Math.tanh(x * 3.2) * .8;
    });
  });
  const whistle = (t0, t1, v = .12) => job(() => {
    const d = t1 - t0, f = svf(); let ph = 0;
    write(t0, d, -.3, .4, tt => {
      const u = tt / d, fr = 2600 * Math.pow(230 / 2600, u);
      ph += W2 * fr * (1 + .012 * Math.sin(W2 * 6 * tt)) / SR;
      return v * Math.pow(u, 1.3) * (Math.sin(ph) + f(noise(), fr, .3).band * .8);
    });
  });
  const boom = (t, v = .9) => job(() => {
    const lp = onePole(), lp2 = onePole(); let ph = 0;
    write(t, 4.2, 0, .45, tt => {
      ph += W2 * (48 * Math.exp(-tt * .5) + 20) / SR;
      const n = lp2(lp(noise(), 3500 * Math.exp(-tt * 3) + 70), 3500 * Math.exp(-tt * 2) + 90);
      const crackle = rnd() < .002 * Math.exp(-tt) ? noise() * 2 : 0;
      const e = Math.min(1, tt / .004);
      return v * e * Math.tanh(2.4 * (n * 3 * Math.exp(-tt * .9) + Math.sin(ph) * 1.1 * Math.exp(-tt * 1.1) + crackle));
    });
  });
  const rumble = (t0, t1, v = .15) => job(() => {
    const d = t1 - t0, lp = onePole(); let b = 0;
    write(t0, d, 0, .3, tt => { b = b * .995 + noise() * .06; return v * Math.min(1, tt / .8, (d - tt) / 1.2) * lp(b, 220) * 3; });
  });
  const wind = (t0, t1, v = .06) => job(() => {
    const d = t1 - t0, f = svf();
    write(t0, d, -.2, .5, tt => {
      const c = 420 + 260 * Math.sin(tt * .7) + 120 * Math.sin(tt * 1.9);
      return v * Math.min(1, tt / 1.5, (d - tt) / 1.5) * (.55 + .45 * Math.sin(tt * .9 + 1)) * f(noise(), c, .25).band * 2;
    });
  });
  const chirp = (t, v = .1, pan = .2, n = 2) => job(() => {
    let ph = 0;
    write(t, n * .13, pan, .35, tt => {
      const k = Math.floor(tt / .13), u = (tt - k * .13) / .09;
      if (u > 1) return 0;
      ph += W2 * (3000 + 1700 * Math.sin(Math.PI * u)) / SR;
      return v * Math.sin(Math.PI * u) * Math.sin(ph);
    });
  });
  const boing = (t, v = .14) => job(() => {
    let ph = 0;
    write(t, .35, .3, .3, tt => { ph += W2 * (300 + 700 * Math.min(1, tt / .12)) * (1 + .06 * Math.sin(W2 * 18 * tt)) / SR; return v * Math.sin(ph) * Math.exp(-tt * 7); });
  });
  const pfft = (t, v = .18) => job(() => {
    const lp = onePole(); let ph = 0;
    write(t, .32, -.2, .1, tt => { ph += W2 * (95 + 30 * Math.sin(W2 * 23 * tt)) / SR; return v * Math.min(1, tt / .01) * Math.exp(-tt * 9) * (lp(noise(), 500) * 2 + Math.sin(ph) * .5); });
  });
  const trumpet = (t, v = .14) => job(() => {
    const f = svf(); let ph = 0;
    write(t, .9, .3, .4, tt => {
      const fr = tt < .25 ? lerp(240, 420, tt / .25) : 420 - 30 * (tt - .25);
      ph += fr * (1 + .02 * Math.sin(W2 * 7 * tt)) / SR; const saw = 2 * (ph % 1) - 1;
      return v * Math.min(1, tt / .04, (.9 - tt) / .2) * Math.tanh(2 * f(saw, 2200, .5).low);
    });
  });
  const flutter = (t0, t1, v = .07) => job(() => {
    const d = t1 - t0, f = svf();
    write(t0, d, .3, .2, tt => v * Math.max(0, Math.sin(W2 * 14 * tt)) * f(noise(), 1300, .5).band * 2 * Math.min(1, (d - tt) / .1));
  });
  const poof = (t, v = .2) => job(() => {
    const f = svf();
    write(t, .4, 0, .3, tt => v * f(noise(), 900, .5).band * 2 * Math.min(1, tt / .01) * Math.exp(-tt * 9));
  });
  const heart = (t, v = .45) => { kick(t, v); kick(t + .22, v * .7); };
  const sparkle = (t, notes, step = .07, v = .12) => notes.forEach((m, k) => glock(t + k * step, m, v, (k % 2 ? .4 : -.4)));

  // ---------------- the score ----------------
  const chords = { C: [48, 60, 64, 67], Am: [45, 57, 60, 64], F: [41, 57, 60, 65], G: [43, 55, 59, 62], Dm: [50, 57, 62, 65], E: [40, 56, 59, 64], Em: [40, 55, 59, 64] };
  const BEAT = .6;
  function groove(t0, prog, opts = {}) {
    prog.forEach((name, b) => {
      const ch = chords[name], bt = t0 + b * 4 * BEAT;
      bass(bt, ch[0] - 12 + 12, BEAT * 1.5, opts.bass ?? .26);
      bass(bt + 2 * BEAT, ch[0] - 12 + 12 + (opts.fifth ? 7 : 0), BEAT * 1.5, (opts.bass ?? .26) * .85);
      for (let k = 0; k < 4; k++) {
        const tt = bt + k * BEAT + BEAT / 2;
        if (opts.pluck !== false) { const pv = opts.pluckV ?? .16; pluck(tt, ch[1], pv, -.3); pluck(tt + .012, ch[2], pv, .1); pluck(tt + .024, ch[3], pv, .35); }
        if (opts.timp && k % 2 === 0) timp(bt + k * BEAT, ch[0] - 12, opts.timp);
        if (opts.kick && k % 2 === 0) kick(bt + k * BEAT, opts.kick);
        if (opts.clap && k % 2 === 1) clap(bt + k * BEAT, opts.clap);
        if (opts.shaker) for (let e = 0; e < 2; e++) shaker(bt + k * BEAT + e * BEAT / 2, opts.shaker * (e ? 1 : .6));
      }
    });
  }
  function melody(t0, notes, inst = marimba, v = .26, oct = 0, pan = 0) {
    for (const [b, m] of notes) inst(t0 + b * BEAT, m + oct, v, pan);
  }
  const themeA = [[0, 76], [.5, 79], [1, 81], [1.5, 79], [2, 76], [3, 72], [3.5, 74],
    [4, 76], [4.5, 76], [5, 74], [5.5, 72], [6, 69], [7, 72],
    [8, 77], [8.5, 81], [9, 84], [9.5, 81], [10, 79], [10.5, 77], [11, 76], [11.5, 74]];
  const themeB = [[0, 72], [1, 76], [1.5, 79], [2, 84], [3.5, 83], [4, 81], [5, 79], [5.5, 76], [6, 72], [7, 76]];

  function score() {
    // --- egg (0 - 1.2)
    glock(.02, 84, .1); glock(.35, 79, .08, .3);
    tick(.3, .18, 1500); tick(.42, .14, 1300); crack(.5, .25);
    tick(.82, .18, 1600); tick(.95, .16, 1400); tick(1.07, .14, 1500); crack(1.1, .35);
    whoosh(1.2, .6, .18, 600, 2400); glock(1.2, 91, .12);

    // --- Triassic hop (1.2 - 8.4)
    const A = 1.2;
    groove(A, ['C', 'Am', 'F'], { pluckV: .13, shaker: 0 });
    for (let k = 0; k < 12; k++) if (A + k * BEAT > 4.2) for (let e = 0; e < 2; e++) shaker(A + k * BEAT + e * BEAT / 2, e ? .05 : .03);
    melody(A, themeA, marimba, .25);
    buzz(2.0, 3.4, .025, -.2); buzz(4.3, 7.6, .018, .3);
    tick(3.3, .2, 900); whoosh(3.45, .5, .14, 300, 1200); kick(3.95, .3); boing(4.0, .08);
    kick(5.95, .35); poof(5.96, .12); sparkle(6.0, [96, 91, 96], .09, .06); whoosh(6.45, .3, .12, 500, 2000);

    // --- Jurassic stomp (8.4 - 13.2)
    const B = 8.4;
    groove(B, ['C', 'Am'], { pluckV: .12, timp: .42, bass: .3, shaker: .035 });
    melody(B, themeB, marimba, .22, -12); melody(B, themeB, glock, .08);
    const up = [60, 64, 67, 72, 76, 79, 84, 88, 91, 96];
    groove(13.2 - 4 * BEAT, ['F'], { pluckV: .12, timp: .42, bass: .3, shaker: .04 });
    for (let k = 0; k < up.length; k++) glock(13.2 + k * .13, up[k], .07 + k * .01, k % 2 ? .4 : -.4);
    pad(13.2, [60, 65, 69, 72], 1.4, .045, .7);
    whoosh(13.3, 1.3, .22, 200, 3000);
    whoosh(14.1, .45, .2, 2500, 400, -.5);

    // --- the eye (14.6 - 16.3)
    pad(14.6, [45, 52, 57, 60], 1.9, .06, .6, 4); heart(14.6, .5); heart(15.45, .45);
    glock(15.1, 88, .09); glock(15.3, 83, .06);
    whoosh(15.5, .8, .15, 3000, 300);
    // --- roar (16.35)
    roar(16.35, .9, .42, 74, 950); kick(16.35, .45);
    whoosh(16.4, 1.0, .12, 800, 3000, .5);

    // --- Cretaceous (17.4 - 22.4)
    const Cc = 17.4;
    groove(Cc, ['Am', 'F'], { pluckV: .12, kick: .38, clap: .14, bass: .3, shaker: .03, fifth: true });
    melody(Cc, [[0, 69], [1, 72], [1.5, 71], [2, 69], [3, 64], [4, 65], [5, 69], [5.5, 72], [6, 74], [7, 72]], marimba, .22);
    timp(18.35, 36, .6); kick(18.35, .5); poof(18.4, .15); whoosh(18.0, .35, .15, 2500, 500);
    buzz(18.9, 20.6, .03, .4);
    tick(19.55, .3, 700); tick(19.62, .2, 900);
    for (let k = 0; k < 4; k++) whoosh(20.2 + k * .2, .35, .16, 900, 3500, .6 - k * .4);
    for (let k = 0; k < 16; k++) tick(20.2 + k * .075, .05, 1100 + (k % 3) * 200, .2);
    const Cd = Cc + 8 * BEAT;
    groove(Cd, ['Dm'], { pluckV: .12, kick: .38, clap: .14, bass: .3, fifth: true });
    roar(21.25, 1.05, .42, 70, 1000);
    timp(21.95, 38, .45); timp(22.1, 41, .45); timp(22.25, 43, .5);
    pad(21.2, [52, 56, 59, 64], 1.2, .04);
    // flash + flee
    whoosh(22.4, .35, .2, 3000, 600); glock(22.45, 96, .1);
    for (let k = 0; k < 10; k++) marimba(22.55 + k * .08, 84 - k * 2, .18, .3 - k * .06);
    for (let k = 0; k < 10; k++) tick(22.55 + k * .085, .06, 800, -.3);

    // --- sunset (23.4 - 26.45)
    pad(23.4, [53, 60, 65, 69], 1.25, .06, .7); pad(24.65, [52, 60, 64, 67], 1.3, .055, .7); pad(25.95, [50, 57, 62, 65], .5, .04, .7);
    bass(23.4, 41, 1.2, .2); bass(24.65, 40, 1.2, .18);
    melody(23.4, [[0, 81], [.5, 84], [1, 77], [2, 79], [2.5, 76], [3, 72]], glock, .12);
    glock(24.05, 79, .1); glock(24.25, 86, .1, .3);
    glock(24.2, 100, .05, -.5); glock(24.85, 97, .07, -.5); glock(25.05, 97, .06, -.5);
    whistle(25.25, 26.45, .12);
    glock(26.3, 76, .08);

    // --- impact & dust (26.45 - 30)
    boom(26.45, .95); whoosh(27.0, .8, .25, 200, 1500); rumble(27.2, 30.4, .14);

    // --- darkness (30 - 38.3)
    wind(29.6, 38.6, .035);
    pad(30.0, [33, 40, 45], 8.0, .022, .5, 3);
    piano(30.6, 57, .08); piano(30.6, 64, .06);
    const sad = [[31.8, 76], [33.0, 74], [34.2, 72], [35.4, 71], [36.0, 69]];
    for (const [tt, m] of sad) piano(tt, m, .085, .2);
    piano(34.2, 53, .05); piano(34.2, 60, .04);
    piano(35.4, 52, .05); piano(35.4, 56, .04);
    glock(36.0, 88, .035, -.5); glock(36.3, 91, .03, -.5);
    piano(36.6, 45, .07); piano(36.6, 52, .05); piano(36.9, 57, .05); piano(37.2, 60, .045);
    poof(37.7, .18); sparkle(37.75, [84, 88], .1, .06);
    // --- sun returns (38.3)
    sparkle(38.35, [72, 76, 79, 84, 88, 91, 96], .08, .1);
    pad(38.3, [48, 55, 60, 64], 1.2, .05, .7);
    for (let k = 0; k < 6; k++) marimba(38.5 + k * .1, 60 + k * 2, .12);

    // --- life returns (39.2 - 45.2)
    const Dd = 39.2;
    groove(Dd, ['C', 'Am', 'F'], { pluckV: .12, shaker: .03, bass: .26 });
    melody(Dd, themeA.slice(0, 13), marimba, .24); melody(Dd, themeA.slice(0, 13), glock, .07);
    for (let k = 0; k < 10; k++) tick(39.6 + k * .12, .04, 2500, .4);
    chirp(40.4, .04, -.3, 1); pfft(40.95, .2); tick(41.1, .08, 3000);
    trumpet(41.5, .13);
    for (let k = 0; k < 3; k++) timp(41.3 + k * .6, 36, .25);
    flutter(42.5, 43.25, .07); tick(43.25, .12, 900);
    chirp(43.5, .09, .2, 2); chirp(44.0, .07, .2, 1);
    // rex gag
    poof(44.25, .2);
    pad(44.35, [45, 52, 57], .6, .05, .4, 4); kick(44.35, .35);
    roar(44.5, .42, .28, 170, 2000);
    boing(44.62, .14);
    whoosh(45.0, .3, .16, 700, 3000);
    // "still here."
    const Ee = 45.2;
    pad(Ee, [48, 55, 64, 67, 72], 1.7, .055, .7);
    bass(Ee, 36, 1.6, .25);
    glock(Ee, 88, .13); glock(Ee + .3, 91, .12); glock(Ee + .6, 96, .13);
    chirp(45.35, .1, .3, 2); chirp(45.7, .08, .3, 2);
    marimba(Ee, 72, .2); marimba(Ee + .6, 76, .18); marimba(Ee + 1.2, 79, .16);
    // nest -> egg
    whoosh(45.9, .45, .18, 2400, 300);
    tick(46.3, .1, 1200);
    whoosh(46.75, .3, .12, 1500, 400); tick(47.05, .2, 1400); tick(47.25, .12, 1600); tick(47.37, .1, 1500);
    pluck(46.3, 72, .1); pluck(46.9, 76, .09); glock(47.3, 79, .06);
  }

  // ---------------- reverb (freeverb-ish) ----------------
  function reverb() {
    const combs = [1116, 1188, 1277, 1356, 1422, 1491], aps = [556, 441, 341];
    const outL = new Float32Array(N), outR = new Float32Array(N);
    for (const [out, spread] of [[outL, 0], [outR, 23]]) {
      for (const d0 of combs) {
        const d = d0 + spread, buf = new Float32Array(d); let idx = 0, filt = 0;
        for (let i = 0; i < N; i++) {
          const y = buf[idx]; filt = y * .7 + filt * .3; buf[idx] = S[i] * .015 + filt * .84; idx = (idx + 1) % d; out[i] += y;
        }
      }
      for (const d0 of aps) {
        const d = d0 + spread, buf = new Float32Array(d); let idx = 0;
        for (let i = 0; i < N; i++) { const b = buf[idx], x = out[i]; out[i] = -x + b; buf[idx] = x + b * .5; idx = (idx + 1) % d; }
      }
    }
    return [outL, outR];
  }

  async function build(onProgress) {
    L = new Float32Array(N); R = new Float32Array(N); S = new Float32Array(N);
    jobs.length = 0; rs = 1234567;
    score();
    for (let k = 0; k < jobs.length; k++) {
      jobs[k]();
      if (k % 40 === 0) { onProgress && onProgress(k / jobs.length * .85); await new Promise(r => setTimeout(r, 0)); }
    }
    const [rl, rrr] = reverb();
    onProgress && onProgress(.95);
    let peak = 0;
    for (let i = 0; i < N; i++) { L[i] = Math.tanh((L[i] + rl[i] * .9) * 1.1); R[i] = Math.tanh((R[i] + rrr[i] * .9) * 1.1); peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i])); }
    const g = .92 / (peak || 1);
    for (let i = 0; i < N; i++) { L[i] *= g; R[i] *= g; }
    onProgress && onProgress(1);
    return { SR, L, R };
  }
  return { build, SR };
})();
