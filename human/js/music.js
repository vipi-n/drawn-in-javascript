// Original score + sound design, synthesized sample-by-sample and timed to the film.
const Music = (() => {
  const SR = 44100;
  const N = Math.ceil(SR * DURATION);
  let L, R, S;
  let rs = 7654321;
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
  const whoosh = (t, dur, v = .2, f0 = 400, f1 = 2400, pan = 0) => job(() => {
    const f = svf();
    write(t, dur, pan, .3, tt => { const u = tt / dur; return v * Math.pow(Math.sin(Math.PI * u), 2) * f(noise(), f0 * Math.pow(f1 / f0, u), .5).band; });
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
  const rumble = (t0, t1, v = .15) => job(() => {
    const d = t1 - t0, lp = onePole(); let b = 0;
    write(t0, d, 0, .3, tt => { b = b * .995 + noise() * .06; return v * Math.min(1, tt / .3, (d - tt) / .4) * lp(b, 220) * 3; });
  });
  const wind = (t0, t1, v = .06, pan = -.2) => job(() => {
    const d = t1 - t0, f = svf();
    write(t0, d, pan, .5, tt => {
      const c = 420 + 260 * Math.sin(tt * .7) + 120 * Math.sin(tt * 1.9);
      return v * Math.min(1, tt / 1.2, (d - tt) / 1.2) * (.55 + .45 * Math.sin(tt * .9 + 1)) * f(noise(), c, .25).band * 2;
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
    write(t0, d, .3, .2, tt => v * Math.max(0, Math.sin(W2 * 14 * tt)) * f(noise(), 1300, .5).band * 2 * Math.min(1, tt / .1, (d - tt) / .1));
  });
  const poof = (t, v = .2) => job(() => {
    const f = svf();
    write(t, .4, 0, .3, tt => v * f(noise(), 900, .5).band * 2 * Math.min(1, tt / .01) * Math.exp(-tt * 9));
  });
  const heart = (t, v = .45) => { kick(t, v); kick(t + .22, v * .7); };
  const sparkle = (t, notes, step = .07, v = .12) => notes.forEach((m, k) => glock(t + k * step, m, v, (k % 2 ? .4 : -.4)));
  // fire: hiss plus random pops
  const crackle = (t0, t1, v = .05, pan = .1) => job(() => {
    const d = t1 - t0, hp = onePole(), bp = svf(); let env = 0;
    write(t0, d, pan, .15, tt => {
      if (rnd() < .0007) env = .4 + rnd() * .6;
      env *= .996;
      const x = noise(), h = x - hp(x, 2500);
      return v * Math.min(1, tt / .3, (d - tt) / .3) * (env * h * 2.4 + bp(x, 900, .8).band * .25);
    });
  });
  // stone on stone
  const clack = (t, v = .25, pan = 0) => job(() => {
    const f = svf(), g = svf();
    write(t, .25, pan, .3, tt => {
      const n = noise();
      return v * (f(n, 2400, .15).band * .35 * Math.exp(-tt * 45) + g(n, 1250, .2).band * .3 * Math.exp(-tt * 30) + Math.sin(W2 * 190 * tt) * Math.exp(-tt * 40) * .6);
    });
  });
  const bark = (t, v = .2) => job(() => {
    const f = svf(); let ph = 0;
    write(t, .16, .35, .2, tt => {
      ph += (560 - 1500 * tt) / SR; const saw = 2 * (ph % 1) - 1;
      return v * Math.min(1, tt / .008) * Math.exp(-tt * 20) * Math.tanh(3 * f(saw + noise() * .35, 1100, .35).band);
    });
  });
  const horn = (t, dur, v = .18) => job(() => {
    const lp = onePole(); let p1 = 0, p2 = 0;
    write(t, dur + .35, -.4, .55, tt => {
      p1 += 98 / SR; p2 += 147.3 / SR;
      const s = (2 * (p1 % 1) - 1) + .7 * (2 * (p2 % 1) - 1);
      return v * Math.min(1, tt / .12) * (tt < dur ? 1 : Math.max(0, 1 - (tt - dur) / .35)) * lp(s, 650);
    });
  });
  const beep = (t, v = .1) => job(() => {
    const lp = onePole();
    write(t, .34, .45, .15, tt => {
      const e = Math.min(1, tt / .005, Math.abs(tt - .14) / .005, Math.max(0, .32 - tt) / .01) * (tt < .12 || tt > .16 ? 1 : 0);
      return v * e * lp(Math.sign(Math.sin(W2 * 415 * tt)) + Math.sign(Math.sin(W2 * 523 * tt)), 2200) * .5;
    });
  });
  const drip = (t, v = .12, pan = 0) => job(() => {
    let ph = 0;
    write(t, .25, pan, .9, tt => { ph += W2 * (700 + 1300 * Math.min(1, tt / .04)) / SR; return v * Math.sin(ph) * Math.min(1, tt / .002) * Math.exp(-tt * 28); });
  });
  const spray = (t0, t1, v = .1) => job(() => {
    const d = t1 - t0, f = svf();
    write(t0, d, -.15, .35, tt => v * Math.pow(Math.sin(Math.PI * ((tt * 4) % 1)), 2) * f(noise(), 3200, .5).band * 2 * Math.min(1, (d - tt) / .05));
  });
  const scratch = (t0, t1, v = .06, pan = .1) => job(() => {
    const d = t1 - t0, f = svf();
    write(t0, d, pan, .3, tt => {
      const s = Math.abs(Math.sin(W2 * 3.3 * tt + Math.sin(tt * 5)));
      return v * s * s * f(noise(), 1800 + 600 * Math.sin(tt * 11), .6).band * 2 * Math.min(1, tt / .03, (d - tt) / .05);
    });
  });

  // ---------------- the score ----------------
  const chords = { C: [48, 60, 64, 67], Am: [45, 57, 60, 64], F: [41, 57, 60, 65], G: [43, 55, 59, 62], Dm: [50, 57, 62, 65], E: [40, 56, 59, 64] };
  const BEAT = .6;
  function groove(t0, prog, opts = {}) {
    prog.forEach((name, b) => {
      const ch = chords[name], bt = t0 + b * 4 * BEAT;
      bass(bt, ch[0], BEAT * 1.5, opts.bass ?? .26);
      bass(bt + 2 * BEAT, ch[0] + (opts.fifth ? 7 : 0), BEAT * 1.5, (opts.bass ?? .26) * .85);
      for (let k = 0; k < 4; k++) {
        const tt = bt + k * BEAT + BEAT / 2;
        if (opts.pluck !== false) { const pv = opts.pluckV ?? .14; pluck(tt, ch[1], pv, -.3); pluck(tt + .012, ch[2], pv, .1); pluck(tt + .024, ch[3], pv, .35); }
        if (opts.kick && k % 2 === 0) kick(bt + k * BEAT, opts.kick);
        if (opts.clap && k % 2 === 1) clap(bt + k * BEAT, opts.clap);
        if (opts.shaker) for (let e = 0; e < 2; e++) shaker(bt + k * BEAT + e * BEAT / 2, opts.shaker * (e ? 1 : .6));
      }
    });
  }
  function melody(t0, notes, inst = marimba, v = .26, oct = 0, pan = 0) {
    for (const [b, m] of notes) inst(t0 + b * BEAT, m + oct, v, pan);
  }
  // the "curious" theme: every phrase ends on a question (the 2nd), never quite home
  const themeH = [[0, 72], [.5, 74], [1, 76], [2, 79], [2.5, 76], [3, 74],
    [4, 72], [4.5, 74], [5, 76], [5.5, 79], [6, 81], [7, 79],
    [8, 77], [8.5, 76], [9, 74], [10, 76], [10.5, 72], [11, 74]];

  function score() {
    // --- jungle: hanging around (0 - 4.0)
    pad(0, [48, 55, 64], 3.6, .03, .7, 3);
    melody(.2, [[0, 72], [1, 76], [2, 79], [3, 74], [4, 72], [4.5, 74], [5, 76]], marimba, .16, 0, -.2);
    chirp(.5, .06, .5, 2); chirp(1.6, .05, -.4, 3); chirp(3.1, .05, .5, 1);
    // swing, fly, grab
    whoosh(2.3, .35, .1, 900, 400, -.3); whoosh(2.62, .4, .16, 300, 1800, .2);
    whoosh(2.95, .38, .16, 500, 2600, .4); tick(3.3, .15, 900, .4); marimba(3.3, 79, .18, .4);
    tick(3.95, .1, 1200, .4);
    // let go ... bonk
    whistle(4.0, 4.42, .11);
    kick(4.4, .45); tick(4.4, .18, 650); boing(4.42, .12);
    sparkle(4.5, [91, 96, 91, 96, 91], .1, .045);
    pluck(5.0, 43, .16); pluck(5.25, 45, .14);
    // standing up for the first time
    for (let k = 0; k < 7; k++) glock(5.5 + k * .065, [60, 64, 67, 72, 76, 79, 84][k], .05 + k * .01, k % 2 ? .3 : -.3);
    glock(5.82, 96, .1); pad(5.8, [48, 55, 60, 64, 67], .6, .04, .6);

    // --- first steps & savanna (6.1 - 11.4)
    groove(6.1, ['C'], { pluckV: .1, bass: .2 });
    groove(8.5, ['Am', 'F'], { pluckV: .12, bass: .24, shaker: .03 });
    melody(6.1, themeH.slice(0, 12), marimba, .2);
    melody(8.5 + 4 * BEAT, themeH.slice(12), marimba, .2);
    for (let k = 0; k < 6; k++) tick(6.2 + k * .28, .05, 500 + (k % 2) * 150, .1); // wobbly footsteps
    chirp(7.5, .05, .5, 2); chirp(10.2, .04, -.5, 2);
    trumpet(9.3, .06);

    // --- the first tool (11.4 - 14.8)
    pad(11.4, [45, 52, 57, 64], 1.9, .035, .6, 3);
    clack(12.1, .12, .1);
    for (const ts of [12.5, 12.9, 13.3]) { clack(ts, .28, .1); tick(ts + .01, .08, 3200, .2); }
    sparkle(13.45, [84, 88, 91, 96], .06, .08);
    pad(13.3, [43, 55, 59, 62, 67], 1.0, .045, .7);
    whoosh(13.95, .3, .12, 1200, 3000, .3);
    whoosh(14.1, .72, .22, 200, 3200);
    for (let k = 0; k < 6; k++) glock(14.2 + k * .09, 72 + k * 4, .04 + k * .012, k % 2 ? .3 : -.3);

    // --- fire (14.8 - 22.6)
    poof(14.8, .3); kick(14.8, .3); timp(14.8, 33, .3);
    crackle(14.8, 22.7, .06);
    pad(15.0, [45, 52, 57, 60], 2.4, .035, .7, 3);
    const campA = [57, 60, 64, 69, 64, 60], campF = [53, 57, 60, 65, 60, 57];
    for (let k = 0; k < 8; k++) pluck(15.0 + k * .3, campA[k % 6], .12, -.2, .35, 1.3);
    for (let k = 0; k < 8; k++) pluck(16.2 + k * .3, campF[k % 6], .11, -.2, .35, 1.3);
    glock(15.3, 88, .04, .5); glock(16.4, 91, .035, -.5);
    tick(16.35, .06, 700); tick(16.72, .06, 700);
    // eyes in the dark
    pad(17.4, [40, 47, 52, 56], 1.6, .04, .6, 3);
    heart(17.4, .42); heart(18.0, .42); tick(17.92, .05, 1800, .5);
    glock(18.05, 96, .08); tick(18.06, .1, 1500);
    pluck(18.4, 40, .18); pluck(18.6, 41, .16); pluck(18.8, 40, .18);
    // ROAR
    roar(19.0, .8, .42, 92, 1100); kick(19.0, .4); whoosh(19.0, .3, .12, 800, 3000, -.4);
    for (let k = 0; k < 8; k++) tick(19.15 + k * .075, .06, 1000 + (k % 2) * 300, -.3 + k * .06);
    timp(19.3, 40, .35);
    // the torch
    whoosh(19.85, .45, .24, 300, 2600, .3); crackle(19.9, 20.6, .08, .3); timp(19.95, 45, .45);
    boing(20.05, .08);
    roar(20.4, .3, .22, 290, 2600); whoosh(20.45, .5, .14, 1500, 400, .6);
    for (let k = 0; k < 8; k++) tick(20.45 + k * .07, .05, 900, .6);
    pad(20.5, [48, 55, 60, 64, 67], 1.3, .05, .7); timp(20.5, 36, .45); bass(20.5, 36, 1.2, .22);
    melody(20.5, [[0, 72], [.5, 76], [1, 79], [1.5, 84]], marimba, .2);
    // first snowflakes
    for (let k = 0; k < 6; k++) glock(21.8 + k * .09, 96 - k * 3, .035, k % 2 ? .4 : -.4);
    wind(21.6, 23.6, .03);
    whoosh(22.25, .4, .16, 3000, 800);

    // --- ice age (22.6 - 30.6)
    wind(22.6, 30.4, .03, .3);
    groove(22.6, ['Am'], { pluckV: .1, bass: .2, shaker: .02 });
    bass(25.0, 41, .9, .18); pluck(25.3, 57, .08); pluck(25.3, 60, .08);
    melody(22.6, [[0, 69], [1, 72], [1.5, 71], [2, 69], [3, 64], [4, 65], [4.5, 67], [5, 69]], marimba, .18);
    trumpet(23.6, .08); trumpet(24.3, .06);
    // blizzard
    wind(25.3, 29.6, .12, -.2); wind(25.8, 29.4, .07, .5);
    tick(26.4, .06, 600);
    poof(26.7, .12); crackle(26.7, 29.9, .035, .2);
    piano(26.8, 57, .06); piano(26.8, 64, .05);
    for (const [tt, m] of [[27.0, 76], [27.6, 72], [28.0, 71], [28.3, 69]]) piano(tt, m, .085, .2);
    piano(28.0, 52, .05);
    // the sun comes back
    sparkle(28.7, [72, 76, 79, 84, 88], .08, .09);
    pad(28.7, [48, 55, 60, 64], 1.3, .05, .7); bass(28.7, 36, 1.0, .18);
    marimba(29.7, 72, .14); marimba(30.0, 76, .14);
    whoosh(29.9, .65, .2, 2400, 250);

    // --- cave art (30.6 - 36.4)
    poof(30.68, .18); crackle(30.7, 36.5, .03, -.4);
    pad(30.75, [50, 57, 62, 65], 2.2, .06, .95, 4);
    for (const [tt, p] of [[30.95, .4], [31.85, -.3], [33.15, .5], [34.75, .2], [35.95, -.4]]) drip(tt, .09, p);
    const echo = [[31.2, 62], [31.8, 65], [32.4, 69], [33.0, 67], [33.6, 65], [34.2, 62], [34.8, 60], [35.1, 62]];
    for (const [tt, m] of echo) { pluck(tt, m, .14, -.2, .8, 1.4); pluck(tt + .3, m, .06, .4, .9, 1.2); }
    whoosh(31.2, .5, .08, 300, 900);
    spray(32.0, 32.6, .11);
    sparkle(32.65, [86, 89, 93], .09, .07); piano(32.7, 50, .05); piano(32.7, 57, .05);
    pluck(33.05, 45, .1); pluck(33.25, 47, .09);
    scratch(33.4, 34.6, .06); scratch(34.6, 35.0, .05, .3); scratch(35.0, 35.4, .05, .4);
    spray(34.3, 34.8, .05);
    pad(34.2, [46, 53, 58, 62], 1.2, .03, .9, 3);
    pad(35.4, [41, 53, 60, 65, 69], .9, .045, .8); glock(35.45, 84, .08); glock(35.6, 89, .06, .3);
    whoosh(35.6, .8, .2, 300, 3000);
    for (let k = 0; k < 8; k++) glock(35.7 + k * .085, 65 + k * 3, .035 + k * .008, k % 2 ? .3 : -.3);

    // --- the march of time (36.4 - 46.3)
    sparkle(36.4, [84, 88, 91, 96], .06, .09); whoosh(36.4, .5, .12, 2500, 600);
    groove(36.9, ['C'], { pluckV: .12, bass: .26, kick: .3, shaker: .03 });
    groove(39.3, ['Am'], { pluckV: .12, bass: .26, kick: .32, clap: .12, shaker: .03 });
    groove(41.7, ['F'], { pluckV: .12, bass: .26, kick: .32, clap: .13, shaker: .035 });
    melody(36.9, themeH.slice(0, 6), marimba, .22);
    melody(39.3, [[0, 76], [.5, 77], [1, 80], [1.5, 81], [2, 80], [2.5, 77], [3, 76]], marimba, .21); // egypt
    melody(41.7, themeH.slice(12), marimba, .21); melody(41.7, themeH.slice(12), glock, .06);
    // the dog joins
    for (let k = 0; k < 10; k++) tick(37.3 + k * .08, .04, 1300 + (k % 2) * 250, .4);
    bark(38.0, .2); bark(38.16, .17);
    // outfit changes behind the bush, obelisk, phone box
    for (const ts of [39.17, 41.37, 43.57]) { poof(ts, .1); glock(ts + .02, 91, .06, .3); }
    for (let k = 0; k < 4; k++) tick(39.5 + k * .5, .05, 450, -.2); // cart wheel
    horn(41.95, .85, .16);
    // modern times
    tick(43.8, .08, 2400); glock(43.82, 96, .05);
    beep(44.2, .09);
    pad(44.1, [43, 55, 59, 62], 1.2, .04, .6, 3); bass(44.1, 43, .9, .2);
    // countdown + liftoff
    for (const [ts, m] of [[44.6, 79], [44.85, 79], [45.1, 79]]) { tick(ts, .14, 1500); glock(ts, m, .08); timp(ts, 31, .25); }
    glock(45.3, 91, .1); kick(45.3, .5);
    rumble(45.2, 46.4, .32);
    whoosh(45.45, .85, .26, 150, 3200);
    for (let k = 0; k < 8; k++) glock(45.55 + k * .09, 72 + k * 3, .04 + k * .01, k % 2 ? .4 : -.4);

    // --- one small step (46.3 - 47.4)
    pad(46.3, [72, 79, 84], 1.0, .025, .95, 2);
    glock(46.32, 96, .05, -.4);
    kick(46.55, .45); poof(46.56, .12);
    whoosh(46.9, .35, .1, 600, 1800);

    // --- today (47.4 - 54.8)
    kick(47.65, .18); tick(47.66, .05, 900);
    pad(47.7, [53, 60, 65, 69], 2.4, .035, .7, 3);
    melody(47.7, [[0, 72], [.5, 74], [1, 77], [2, 76], [2.5, 74], [3, 72]], piano, .12, 0, .1);
    melody(47.7, [[0, 84], [1, 89]], glock, .04, 0, -.3);
    for (let k = 0; k < 6; k++) tick(47.95 + k * .27, .035, 600 + (k % 2) * 120, -.1);
    pad(50.1, [55, 62, 67, 71], .9, .03, .7, 3);
    pfft(49.72, .12); boing(49.74, .06);
    for (const ts of [49.85, 50.02, 50.2, 50.37]) clap(ts, .13, .4);
    sparkle(50.25, [88, 91], .12, .05);
    flutter(50.4, 52.05, .025);
    for (let k = 0; k < 4; k++) marimba(50.95 + k * .12, 67 + k * 2, .08, -.2);
    // "still curious."
    pad(51.0, [48, 55, 62, 64, 67], 2.3, .045, .75); bass(51.0, 36, 2.0, .18);
    melody(51.0, [[0, 76], [.5, 79], [1, 81]], piano, .12, 0, .1);
    glock(52.05, 88, .09); glock(52.2, 93, .06, .3);
    pad(53.3, [53, 57, 60, 65], 1.5, .035, .75);
    flutter(53.3, 54.2, .04);
    for (let k = 0; k < 6; k++) glock(53.35 + k * .1, [72, 76, 79, 84, 88, 91][k], .04 + k * .008, k % 2 ? .4 : -.4);
    piano(54.1, 74, .1, .1); piano(54.1, 62, .05);
    // slide back to the beginning
    whoosh(54.8, .8, .16, 300, 2000);
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
    jobs.length = 0; rs = 7654321;
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
