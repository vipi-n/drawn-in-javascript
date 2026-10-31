// Per-bar loudness report for the synthesized score: node tools/analyze.js build/score.wav
const fs = require('fs');
const { BAR } = require('../js/core');
const b = fs.readFileSync(process.argv[2] || 'build/score.wav');
const SR = b.readUInt32LE(24), n = (b.length - 44) / 6;
const rows = [];
for (let bar = 0; bar * BAR * SR < n; bar++) {
  const a = Math.floor(bar * BAR * SR), e = Math.min(n, Math.floor((bar + 1) * BAR * SR));
  let s = 0, pk = 0, lo = 0, lp = 0, hi = 0, prev = 0;
  for (let i = a; i < e; i++) {
    const v = (b.readIntLE(44 + i * 6, 3) + b.readIntLE(47 + i * 6, 3)) / 2 / 8388607;
    s += v * v; pk = Math.max(pk, Math.abs(v));
    lp += (v - lp) * .02; lo += lp * lp; hi += (v - prev) * (v - prev); prev = v;
  }
  const db = (x) => (10 * Math.log10(x / (e - a) + 1e-12)).toFixed(0);
  rows.push(`${String(bar).padStart(2)} rms ${db(s).padStart(4)} pk ${(20 * Math.log10(pk + 1e-9)).toFixed(0).padStart(4)} low ${db(lo).padStart(4)} hi ${db(hi).padStart(4)}`);
}
console.log(rows.join('\n'));
