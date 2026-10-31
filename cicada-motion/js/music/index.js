// CICADA — the life cycle: original score + sound design.   node js/music/index.js [out.wav] [--stems DIR] [--report]
// 96 BPM, D minor -> D major. Real CC0 orchestra (VSCO-2 CE samples: strings sustain/tremolo/pizzicato/spiccato,
// harp, flute, oboe, clarinet, bassoon, horns open + muted, glockenspiel, marimba, xylophone, piano, timpani,
// cymbals, gong, bass drum, hand drums) plays an original main theme and its variants; real CC0 cicada, forest,
// insect, bird, heartbeat and leaf recordings (BigSoundBank) carry the sound design. Everything is mixed through
// a convolution hall, ridden along the film's loudness arc, glued, normalised to -15 LUFS and true-peak limited.
// Timeline: ../cues.js (shared with the picture). Output is exactly cues.DURATION seconds, 48 kHz 16-bit stereo.
const path = require('path'), fs = require('fs');
const MX = require('./mix');
const O = require('./orch');
const P1 = require('./part1'), P2 = require('./part2'), P3 = require('./part3'), P4 = require('./part4');
const { DURATION, SCENES } = require('../cues');
const { SR, N, OUTN, BUS, HALL } = MX;

// the film's loudness arc (short-term LUFS targets) the rider steers toward
const ARC = [
  [0, -15], [1.5, -14.5], [2.5, -12.5], [4, -13.5], [6.5, -16], [7.5, -17.5],
  [8.5, -17.5], [12, -18], [15, -17.8], [19.5, -18.5],
  [20.5, -19], [29.5, -18.6],
  [30.3, -19.8], [31.2, -20.4], [33, -19.5], [34.4, -17.6], [36.5, -17], [37.5, -18.2],
  [38.6, -20], [44, -19.8], [50, -19], [56, -18], [60, -17.2], [63.75, -16.4], [66.25, -15.4], [67.5, -16.4],
  [68.2, -16.8], [71, -15.4], [74.6, -12.4],
  [75.3, -11.6], [85.5, -11.6], [86.5, -14], [87.5, -18.5],
  [88.5, -20.5], [90.3, -21], [92.5, -20.5], [95, -19.5], [98, -17], [99.6, -14.5], [100.6, -13], [102.5, -12.8],
  [103.5, -12.4], [105, -12], [107.5, -11.5], [112, -12], [114.5, -14],
  [115.6, -16.6], [117.2, -18.8], [120, -19.2], [123.7, -18.2], [125, -18.8],
  [126.2, -19], [130, -19.4], [133, -20.4], [135, -22],
];
const arc = (t) => { if (t <= ARC[0][0]) return ARC[0][1]; for (let i = 1; i < ARC.length; i++) if (t <= ARC[i][0]) { const [a, va] = ARC[i - 1], [b, vb] = ARC[i]; return va + (vb - va) * (t - a) / (b - a); } return ARC[ARC.length - 1][1]; };

function render(file, o = {}) {
  const t0 = Date.now(), lap = (k) => console.log(k.padEnd(12), ((Date.now() - t0) / 1000).toFixed(1) + 's');
  const parts = [['prologue', P1.prologue], ['song', P1.song], ['eggs', P1.eggs], ['drop', P2.drop], ['underground', P2.underground], ['awakening', P2.awakening], ['emergence', P3.emergence], ['molt', P3.molt], ['glory', P4.glory], ['return', P4.ret], ['epilogue', P4.epilogue]];
  for (const [k, f] of parts) { f(); lap(k); }
  if (o.lint) { const L1 = O.lint(); console.log(`lint: ${L1.length} sustained m2/m9 clashes\n  ` + L1.join('\n  ')); }

  // cicada bus: tame the piercing 5.5 kHz band, keep it a texture; ducks gently when the orchestra swells
  MX.eq(BUS.cic.L, BUS.cic.R, [['highpass', 380, 0, .7], ['peak', 5400, -4.5, .9], ['peak', 7600, -2, 1], ['highshelf', 10500, -3, .7], ['lowshelf', 900, 1.5, .7]]);
  MX.eq(BUS.amb.L, BUS.amb.R, [['highpass', 30, 0, .7], ['highshelf', 9000, -1.5, .7]]);
  {
    const hop = Math.round(.02 * SR), H = Math.ceil(N / hop), env = new Float64Array(H);
    for (let h = 0; h < H; h++) { let q = 0; for (let i = h * hop; i < Math.min(N, (h + 1) * hop); i++) q += BUS.mus.L[i] ** 2 + BUS.mus.R[i] ** 2; env[h] = 10 * Math.log10(q / hop + 1e-12); }
    const sorted = Array.from(env).filter((x) => x > -80).sort((a, b) => a - b), ref = sorted[Math.floor(sorted.length * .75)];
    let sm = 0; const g = new Float32Array(H);
    for (let h = 0; h < H; h++) { const want = Math.max(0, Math.min(4, (env[h] - ref) * .5)); sm += (want - sm) * (want > sm ? .25 : .03); g[h] = Math.pow(10, -sm / 20); }
    for (let i = 0; i < N; i++) { const gg = g[Math.floor(i / hop)]; BUS.cic.L[i] *= gg; BUS.cic.R[i] *= gg; }
  }
  for (const k in BUS) console.log('bus', k.padEnd(4), MX.lufs(BUS[k].L, BUS[k].R, 0, OUTN).toFixed(1), 'LUFS (pre-gain)');

  // hall
  const [hl, hr] = MX.makeIR(2.8, { rt: [2.6, 2.0, 1.0], pre: .022 });
  const [rl, rr] = MX.convolve(HALL.L, HALL.R, hl, hr);
  lap('hall');
  const GAIN = { mus: 1, sfx: .9, amb: .8, cic: .85 }, RET = .8;
  if (o.stems) { fs.mkdirSync(o.stems, { recursive: true }); for (const k in BUS) MX.writeWav(path.join(o.stems, `stem-${k}.wav`), BUS[k].L.map((x) => x * GAIN[k] * .5), BUS[k].R.map((x) => x * GAIN[k] * .5), OUTN); MX.writeWav(path.join(o.stems, 'stem-hall.wav'), rl.map((x) => x * RET * .5), rr.map((x) => x * RET * .5), OUTN); }
  const L = new Float32Array(N), R = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    let l = rl[i] * RET, r = rr[i] * RET;
    for (const k in BUS) { l += BUS[k].L[i] * (GAIN[k] ?? 1); r += BUS[k].R[i] * (GAIN[k] ?? 1); }
    L[i] = l; R[i] = r;
  }
  // level to the arc's mean, ride the arc, glue, tone, normalise to -15 LUFS, true-peak limit, end fade
  const gain = (dB) => { const g = Math.pow(10, dB / 20); for (let i = 0; i < N; i++) { L[i] *= g; R[i] *= g; } };
  gain(-16 - MX.lufs(L, R, 0, OUTN));
  let env = 0; const att = Math.exp(-1 / (.03 * SR)), rel = Math.exp(-1 / (.35 * SR)), th = -19, ratio = 1.5;
  for (let i = 0; i < N; i++) {
    const x = (L[i] * L[i] + R[i] * R[i]) / 2;
    env = x > env ? att * env + (1 - att) * x : rel * env + (1 - rel) * x;
    const over = Math.max(0, 10 * Math.log10(env + 1e-12) - th), gr = Math.pow(10, -over * (1 - 1 / ratio) / 20);
    L[i] *= gr; R[i] *= gr;
  }
  MX.eq(L, R, [['highpass', 28, 0, .7], ['lowshelf', 140, -1.5, .7], ['peak', 5600, -1.2, .9], ['peak', 2800, .6, .8], ['highshelf', 11000, 1, .7]]);
  // the arc is offset so that its own integrated loudness is -15 (then the final normalisation barely moves it)
  const arcE = []; for (let t = 0; t < DURATION; t += .1) arcE.push(Math.pow(10, arc(t) / 10));
  const arcI = 10 * Math.log10(arcE.reduce((p, c) => p + c, 0) / arcE.length), off = -15 - arcI;
  console.log('arc integrated', arcI.toFixed(2), 'offset', off.toFixed(2));
  for (let pass = 0; pass < 2; pass++) { MX.ride(L, R, (t) => arc(t) + off, { k: pass ? .6 : .85, cut: 8, boost: 8, tc: .6, win: 3 }); gain(-15 - MX.lufs(L, R, 0, OUTN)); }
  const fadeA = Math.round((DURATION - 1.5) * SR);
  const fade = () => { for (let i = fadeA; i < N; i++) { const k = i >= OUTN ? 0 : Math.max(0, (OUTN - i) / (OUTN - fadeA)); const g = k * k * (3 - 2 * k); L[i] *= g; R[i] *= g; } };
  fade();
  let mn = 1;
  for (let pass = 0; pass < 3; pass++) {
    const cur = MX.lufs(L, R, 0, OUTN);
    if (pass && Math.abs(cur + 15) < .08) break;
    gain(-15 - cur + (pass ? .02 : 0));
    mn = Math.min(mn, MX.limit(L, R, -1.6, .006, .18));
  }
  let nan = 0; for (let i = 0; i < OUTN; i++) { if (!Number.isFinite(L[i])) { L[i] = 0; nan++; } if (!Number.isFinite(R[i])) { R[i] = 0; nan++; } }
  const tp = MX.maxTruePeak(L, R, OUTN);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  MX.writeWav(file, L, R, OUTN);
  if (o.report) console.log(O.report());
  console.log('scenes:', SCENES.map(([id, a, b]) => `${id} ${MX.lufs(L, R, Math.round(a * SR), Math.round(b * SR)).toFixed(1)}`).join(' | '));
  console.log('wrote', file, (OUTN / SR).toFixed(3) + 's', 'LUFS', MX.lufs(L, R, 0, OUTN).toFixed(2), 'true peak', tp.toFixed(2), 'dBTP', 'limiter max', (20 * Math.log10(mn)).toFixed(1), 'dB', 'NaN', nan, ((Date.now() - t0) / 1000).toFixed(1) + 's');
}

const args = process.argv.slice(2), opt = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : undefined; };
const outFile = args[0] && !args[0].startsWith('--') ? path.resolve(args[0]) : path.join(__dirname, '..', '..', 'build', 'score.wav');
render(outFile, { stems: opt('--stems'), report: args.includes('--report'), lint: args.includes('--lint') });
