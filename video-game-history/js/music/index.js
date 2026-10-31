// HISTORY OF VIDEO GAMES: original score + sound design.   node js/music/index.js [out.wav] [--stems DIR] [--report] [--lint]
// 90 BPM, D major (a B-minor shadow for the crash, D minor for Doom). A real CC0 orchestra (VSCO-2 CE samples:
// strings sustain/tremolo/pizzicato/spiccato, harp, flute, clarinet, horns, glockenspiel, marimba, xylophone, piano,
// timpani, cymbals, bass drum) plays an original theme; synthesized 8-bit voices (pulse, triangle, LFSR noise) play
// alongside it and make every on-screen sound. Mixed through a convolution hall, ridden along the film's loudness
// arc, glued, normalised to -15 LUFS and true-peak limited. Timeline: ../cues.js (shared with the picture).
const path = require('path'), fs = require('fs');
const MX = require('./mix');
const O = require('./orch');
const { PARTS } = require('./score');
const { DURATION, SCENES, BEAT } = require('../cues');
const { SR, N, OUTN, BUS, HALL } = MX;

// the film's loudness arc (short-term LUFS targets) the rider steers toward
const ARC = [
  [0, -26], [1, -22], [2.7, -19.5], [6.7, -19.5], [8, -19], [16, -18.2], [21.3, -17.2], [29.3, -16.8], [31.3, -16],
  [34.7, -14.2], [45, -13.6], [45.6, -16.5], [46.6, -19.5], [50.4, -19.5], [50.8, -17], [54.7, -15.8], [58, -16.2],
  [61.3, -14.2], [66.7, -13.6], [70.7, -15.2], [74, -14.6], [77.3, -13.8], [87.6, -14], [88.6, -16.6], [98.4, -16],
  [103.6, -12.8], [104.2, -11.8], [111.6, -12.4], [113, -14.6], [118.5, -17.5], [122.7, -18.2], [126, -20], [128, -23],
];
const arc = (t) => { if (t <= ARC[0][0]) return ARC[0][1]; for (let i = 1; i < ARC.length; i++) if (t <= ARC[i][0]) { const [a, va] = ARC[i - 1], [b, vb] = ARC[i]; return va + (vb - va) * (t - a) / (b - a); } return ARC[ARC.length - 1][1]; };
const GAIN = { mus: 1, chip: .32, sfx: .5, amb: 1, cic: 1, echo: .32 }, RET = .75;

// ping-pong echo for the 8-bit voices: dotted-eighth delay, darkening repeats
function echo(src, time, fb, lpHz) {
  const d = Math.round(time * SR), L = new Float32Array(N), R = new Float32Array(N);
  const a = Math.exp(-2 * Math.PI * lpHz / SR);
  let zl = 0, zr = 0;
  for (let i = 0; i < N; i++) {
    const inL = src.L[i] + src.R[i];
    const dl = i >= d ? R[i - d] : 0, dr = i >= d ? L[i - d] : 0;   // cross-feed = ping-pong
    zl = (1 - a) * (inL * .5 + dl * fb) + a * zl;
    zr = (1 - a) * (dr * fb) + a * zr;
    L[i] = zl; R[i] = zr;
  }
  return { L, R };
}

function render(file, o = {}) {
  const t0 = Date.now(), lap = (k) => console.log(k.padEnd(12), ((Date.now() - t0) / 1000).toFixed(1) + 's');
  for (const [k, f] of PARTS) { f(); lap(k); }
  if (o.lint) { const L1 = O.lint(); console.log(`lint: ${L1.length} sustained m2/m9 clashes\n  ` + L1.join('\n  ')); }

  MX.bus('chip'); MX.bus('echo');
  const E = echo(BUS.echo, BEAT * .75, .42, 3200);
  for (let i = 0; i < N; i++) { BUS.echo.L[i] = E.L[i]; BUS.echo.R[i] = E.R[i]; HALL.L[i] += E.L[i] * .15; HALL.R[i] += E.R[i] * .15; }
  // 8-bit voices: no sub rumble, a softer top so the pulses sit inside the orchestra instead of on top of it
  MX.eq(BUS.chip.L, BUS.chip.R, [['highpass', 70, 0, .7], ['peak', 3200, -1.5, .9], ['highshelf', 8000, -3, .7]]);
  MX.eq(BUS.echo.L, BUS.echo.R, [['highpass', 220, 0, .7]]);
  MX.eq(BUS.sfx.L, BUS.sfx.R, [['highpass', 32, 0, .7], ['highshelf', 9000, -2, .7]]);
  for (const k of ['mus', 'chip', 'sfx', 'echo']) console.log('bus', k.padEnd(4), MX.lufs(BUS[k].L, BUS[k].R, 0, OUTN).toFixed(1).padStart(6), '|', SCENES.map(([id, a, b]) => `${id} ${(MX.lufs(BUS[k].L, BUS[k].R, Math.round(a * SR), Math.round(b * SR)) + 20 * Math.log10(GAIN[k])).toFixed(0)}`).join(' '));

  // hall
  const [hl, hr] = MX.makeIR(2.6, { rt: [2.4, 1.9, 1.0], pre: .02 });
  const [rl, rr] = MX.convolve(HALL.L, HALL.R, hl, hr);
  lap('hall');
  if (o.stems) { fs.mkdirSync(o.stems, { recursive: true }); for (const k in BUS) MX.writeWav(path.join(o.stems, `stem-${k}.wav`), BUS[k].L.map((x) => x * GAIN[k] * .5), BUS[k].R.map((x) => x * GAIN[k] * .5), OUTN); MX.writeWav(path.join(o.stems, 'stem-hall.wav'), rl.map((x) => x * RET * .5), rr.map((x) => x * RET * .5), OUTN); }
  const L = new Float32Array(N), R = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    let l = rl[i] * RET, r = rr[i] * RET;
    for (const k in BUS) { l += BUS[k].L[i] * (GAIN[k] ?? 1); r += BUS[k].R[i] * (GAIN[k] ?? 1); }
    L[i] = l; R[i] = r;
  }
  const gain = (dB) => { const g = Math.pow(10, dB / 20); for (let i = 0; i < N; i++) { L[i] *= g; R[i] *= g; } };
  gain(-16 - MX.lufs(L, R, 0, OUTN));
  let env = 0; const att = Math.exp(-1 / (.03 * SR)), rel = Math.exp(-1 / (.35 * SR)), th = -19, ratio = 1.5;
  for (let i = 0; i < N; i++) {
    const x = (L[i] * L[i] + R[i] * R[i]) / 2;
    env = x > env ? att * env + (1 - att) * x : rel * env + (1 - rel) * x;
    const over = Math.max(0, 10 * Math.log10(env + 1e-12) - th), gr = Math.pow(10, -over * (1 - 1 / ratio) / 20);
    L[i] *= gr; R[i] *= gr;
  }
  MX.eq(L, R, [['highpass', 28, 0, .7], ['lowshelf', 140, -1, .7], ['peak', 5600, -1, .9], ['peak', 2800, .5, .8], ['highshelf', 11000, 1, .7]]);
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
