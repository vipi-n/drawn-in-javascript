// Original score + sound design, v2 (sampled orchestra).  node js/music.js [out.wav] [--stems]
// 100 BPM, F major (D minor for danger + metamorphosis). Real CC0 instruments (VSCO-2 CE: strings, winds, horns,
// harp, mallets, timpani, percussion) play the frog themes; real CC0 frog / pond / rain / bird recordings and water
// one-shots carry the sound design. Mixed through a convolution hall, glued, tilted, normalised to -15 LUFS, limited.
const path = require('path');
const MX = require('./mix');
const O = require('./orch');
const S1 = require('./score1'), S2 = require('./score2'), S3 = require('./score3');
const { DURATION } = require('./core');
const { SR, N, BUS, HALL } = MX;

function render(file) {
  const t0 = Date.now();
  const parts = { ...S1, ...S2, ...S3 };
  for (const k of ['night', 'call', 'amplexus', 'frogspawn', 'embryo', 'hatchling', 'tadpole', 'legsMeta', 'froglet', 'grow', 'winter', 'spring', 'ui']) {
    const t = Date.now(); parts[k](); console.log(k.padEnd(10), ((Date.now() - t) / 1000).toFixed(1) + 's');
  }
  const [hl, hr] = MX.makeIR(2.6, { rt: [2.4, 1.9, .9], pre: .02 });
  const [rl, rr] = MX.convolve(HALL.L, HALL.R, hl, hr);
  console.log('hall', ((Date.now() - t0) / 1000).toFixed(1) + 's');
  const GAIN = { mus: 1, sfx: .95, amb: .8 }, RET = .85;
  for (const k in BUS) console.log('bus', k, MX.lufs(BUS[k].L, BUS[k].R).toFixed(1), 'LUFS (pre-gain)');
  const L = new Float32Array(N), R = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    let l = rl[i] * RET, r = rr[i] * RET;
    for (const k in BUS) { l += BUS[k].L[i] * GAIN[k]; r += BUS[k].R[i] * GAIN[k]; }
    L[i] = l; R[i] = r;
  }
  if (process.argv.includes('--stems')) for (const k in BUS) MX.writeWav(file.replace(/\.wav$/, `-${k}.wav`), BUS[k].L.map((x) => x * .5), BUS[k].R.map((x) => x * .5));
  // pre-gain to -20 LUFS, gentle RMS glue compression, rumble cut + tilt
  let g = Math.pow(10, (-20 - MX.lufs(L, R)) / 20);
  for (let i = 0; i < N; i++) { L[i] *= g; R[i] *= g; }
  MX.level(L, R, -20, { k: .5, cut: 2.5, boost: 4 });
  let env = 0; const att = Math.exp(-1 / (.025 * SR)), rel = Math.exp(-1 / (.3 * SR)), th = -17, ratio = 1.6;
  for (let i = 0; i < N; i++) {
    const x = (L[i] * L[i] + R[i] * R[i]) / 2;
    env = x > env ? att * env + (1 - att) * x : rel * env + (1 - rel) * x;
    const over = Math.max(0, 10 * Math.log10(env + 1e-12) - th), gr = Math.pow(10, -over * (1 - 1 / ratio) / 20);
    L[i] *= gr; R[i] *= gr;
  }
  for (const ch of [L, R]) {
    const hp = MX.biquad('highpass', 28, 0, .7), lo = MX.biquad('lowshelf', 180, -1, .7), mid = MX.biquad('peak', 3200, 1.2, .8), hi = MX.biquad('highshelf', 7000, 2.5, .7);
    for (let i = 0; i < N; i++) ch[i] = hi(mid(lo(hp(ch[i]))));
  }
  g = Math.pow(10, (-15 - MX.lufs(L, R)) / 20);
  for (let i = 0; i < N; i++) { L[i] *= g; R[i] *= g; }
  const mn = MX.limit(L, R, -2.0);
  const fadeA = Math.round((DURATION - .85) * SR), fadeB = Math.round((DURATION - .05) * SR);
  for (let i = fadeA; i < N; i++) { const k = Math.max(0, (fadeB - i) / (fadeB - fadeA)); L[i] *= k * k; R[i] *= k * k; }
  let pk = 0; for (let i = 0; i < N; i++) pk = Math.max(pk, Math.abs(L[i]), Math.abs(R[i]));
  MX.writeWav(file, L, R);
  console.log(O.report());
  console.log('wrote', file, 'LUFS', MX.lufs(L, R).toFixed(1), 'peak', (20 * Math.log10(pk)).toFixed(1), 'dBFS', 'limiter', (20 * Math.log10(mn)).toFixed(1), 'dB', ((Date.now() - t0) / 1000).toFixed(1) + 's');
}

render(process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : path.join(__dirname, '..', 'build', 'score.wav'));
