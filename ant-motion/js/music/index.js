// ANT — the life cycle: original score + sound design.   node js/music/index.js [out.wav] [--stems DIR] [--report] [--lint]
// 90 BPM, E minor -> G major. Real CC0 orchestra (VSCO-2 CE samples: strings sustain/tremolo/pizzicato/spiccato,
// harp, flute, clarinet, bassoon, horns, glockenspiel, marimba, xylophone, piano, timpani, cymbals, gong, bass drum,
// hand drums, log drums) plays an original main theme ("Colony") and its variants; one musical world per scene:
//   flight  airy harp + flute, title tutti        found   log drums, pizz dig ostinato, wing snaps, the seal
//   egg     music box (glock + harp), wonder       larva   marimba nursery groove, bassoon, moult glisses
//   pupa    tremolo mystery, cell soup, rising     adult   heroic horns, spiccato anatomy pulse, glass X-ray
//   colony  driving spiccato + hand drums          cycle   grand theme ending in G major
// Real CC0 recordings (BigSoundBank) for ambience/foley + synthesized hum, whooshes, risers, pops and cracks.
// Mixed through a convolution hall, ridden along the film's loudness arc, normalised to -15 LUFS, true-peak limited.
const path = require('path'), fs = require('fs');
const MX = require('./mix');
const O = require('./orch');
const P1 = require('./part1'), P2 = require('./part2'), P3 = require('./part3'), P4 = require('./part4');
const { DURATION, SCENES } = require('../cues');
const { SR, N, OUTN, BUS, HALL } = MX;

const ARC = [
  [0, -24], [2.3, -16.5], [2.8, -12.8], [4.2, -15], [8, -15.8], [10.4, -18],
  [10.8, -18], [12.6, -18.4], [14.6, -16.8], [16.2, -16.6], [18.05, -15.4], [18.8, -20],
  [19.2, -21], [23, -20], [26.6, -19.4], [29.1, -19],
  [29.5, -17.8], [37, -17], [37.6, -19], [40.2, -18.4], [42.5, -16.6],
  [43, -20], [48, -20.6], [52, -18.6], [55.8, -15],
  [56.2, -15.4], [57.5, -12.8], [60, -15.4], [63.3, -17.4], [66.3, -16],
  [66.8, -15], [72, -14], [79.6, -12.6],
  [80.1, -12], [85, -13], [87.8, -14], [88.2, -12.6], [90.7, -17],
];
const arc = (t) => { if (t <= ARC[0][0]) return ARC[0][1]; for (let i = 1; i < ARC.length; i++) if (t <= ARC[i][0]) { const [a, va] = ARC[i - 1], [b, vb] = ARC[i]; return va + (vb - va) * (t - a) / (b - a); } return ARC[ARC.length - 1][1]; };

function render(file, o = {}) {
  const t0 = Date.now(), lap = (k) => console.log(k.padEnd(12), ((Date.now() - t0) / 1000).toFixed(1) + 's');
  const parts = [['flight', P1.flight], ['found', P1.found], ['egg', P2.egg], ['larva', P2.larva], ['pupa', P3.pupa], ['adult', P3.adult], ['colony', P4.colony], ['cycle', P4.cycle]];
  for (const [k, f] of parts) { f(); lap(k); }
  if (o.lint) { const L1 = O.lint(); console.log(`lint: ${L1.length} sustained m2/m9 clashes\n  ` + L1.join('\n  ')); }

  MX.bus('sfx'); MX.bus('amb');
  MX.eq(BUS.amb.L, BUS.amb.R, [['highpass', 30, 0, .7], ['highshelf', 9000, -1.5, .7]]);
  for (const k in BUS) console.log('bus', k.padEnd(4), MX.lufs(BUS[k].L, BUS[k].R, 0, OUTN).toFixed(1), 'LUFS (pre-gain)');

  const [hl, hr] = MX.makeIR(2.6, { rt: [2.4, 1.9, 1.0], pre: .02 });
  const [rl, rr] = MX.convolve(HALL.L, HALL.R, hl, hr);
  lap('hall');
  const GAIN = { mus: 1, sfx: .9, amb: .75 }, RET = .8;
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
  MX.eq(L, R, [['highpass', 28, 0, .7], ['lowshelf', 140, -1, .7], ['peak', 5600, -1, .9], ['peak', 2800, .6, .8], ['highshelf', 11000, 1, .7]]);
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
