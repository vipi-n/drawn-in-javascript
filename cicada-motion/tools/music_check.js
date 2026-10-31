// Score verification: format, integrated loudness, true peak, continuity (3 s short-term + 400 ms momentary at the
// scene boundaries), per-scene loudness, clipping, NaN / clicks.   node tools/music_check.js [build/score.wav] [--curve]
const fs = require('fs'), path = require('path');
const { spawnSync } = require('child_process');
const { SCENES, DURATION } = require('../js/cues');

const file = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : path.join(__dirname, '..', 'build', 'score.wav');
const B = fs.readFileSync(file);
const fmt = { ch: B.readUInt16LE(22), sr: B.readUInt32LE(24), bits: B.readUInt16LE(34) };
let off = 12, dataOff = 0, dataLen = 0;
while (off < B.length - 8) { const id = B.toString('ascii', off, off + 4), len = B.readUInt32LE(off + 4); if (id === 'data') { dataOff = off + 8; dataLen = len; break; } off += 8 + len + (len & 1); }
const SR = fmt.sr, n = dataLen / (fmt.ch * fmt.bits / 8), L = new Float64Array(n), R = new Float64Array(n);
let clip = 0, nan = 0;
for (let i = 0; i < n; i++) {
  const a = B.readInt16LE(dataOff + i * 4), b = B.readInt16LE(dataOff + i * 4 + 2);
  if (Math.abs(a) >= 32767 || Math.abs(b) >= 32767) clip++;
  L[i] = a / 32768; R[i] = b / 32768; if (!Number.isFinite(L[i]) || !Number.isFinite(R[i])) nan++;
}
console.log(`format: ${fmt.ch} ch, ${SR} Hz, ${fmt.bits}-bit, ${n} samples = ${(n / SR).toFixed(4)} s (target ${DURATION} s)  clipped samples: ${clip}  NaN: ${nan}`);

// K-weighting (BS.1770, 48 kHz coefficients) -> energy per 100 ms block
const raw = (b, a) => { let x1 = 0, x2 = 0, y1 = 0, y2 = 0; return (x) => { const y = b[0] * x + b[1] * x1 + b[2] * x2 - a[0] * y1 - a[1] * y2; x2 = x1; x1 = x; y2 = y1; y1 = y; return y; }; };
const KW = () => { const a = raw([1.53512485958697, -2.69169618940638, 1.19839281085285], [-1.69065929318241, .73248077421585]), b = raw([1, -2, 1], [-1.99004745483398, .99007225036621]); return (x) => b(a(x)); };
const fl = KW(), fr = KW(), hop = SR / 10, H = Math.floor(n / hop), e = new Float64Array(H);
for (let h = 0; h < H; h++) { let q = 0; for (let i = h * hop; i < (h + 1) * hop; i++) { const a = fl(L[i]), b = fr(R[i]); q += a * a + b * b; } e[h] = q / hop; }
const LK = (m) => -.691 + 10 * Math.log10(m + 1e-12);
const win = (h, k) => { let s = 0; for (let j = h - k + 1; j <= h; j++) s += j >= 0 ? e[j] : 0; return s / k; }; // trailing window ending at block h
const ST = (t) => LK(win(Math.round(t * 10) - 1, 30)), MOM = (t) => LK(win(Math.round(t * 10) - 1, 4));
function integrated(a, b) {
  const z = []; for (let h = Math.round(a * 10) + 3; h < Math.round(b * 10); h++) z.push(win(h, 4));
  const avg = (x) => x.reduce((p, c) => p + c, 0) / Math.max(1, x.length);
  const g1 = z.filter((m) => LK(m) > -70), rel = LK(avg(g1)) - 10;
  return LK(avg(g1.filter((m) => LK(m) > rel)));
}
const ff = spawnSync('ffmpeg', ['-nostats', '-hide_banner', '-i', file, '-af', 'ebur128=peak=true', '-f', 'null', '-'], { encoding: 'utf8' }).stderr;
const ffI = (ff.match(/I:\s+(-?[\d.]+) LUFS/g) || []).pop(), ffTP = (ff.match(/Peak:\s+(-?[\d.]+) dBFS/g) || []).pop(), ffLRA = (ff.match(/LRA:\s+([\d.]+) LU/g) || []).pop();
let pk = 0; for (let i = 0; i < n; i++) pk = Math.max(pk, Math.abs(L[i]), Math.abs(R[i]));
console.log(`integrated: ${integrated(0, n / SR).toFixed(2)} LUFS (ffmpeg ${ffI})   true peak (ffmpeg): ${ffTP}   sample peak: ${(20 * Math.log10(pk)).toFixed(2)} dBFS   ${ffLRA}`);

// continuity: 3 s short-term every 0.1 s from 0.6 to 133 s
let mn = 1e9, at = 0;
for (let t = .6; t <= 133.0001; t += .1) { const v = ST(t); if (v < mn) { mn = v; at = t; } }
console.log(`short-term (3 s, K-weighted, every 0.1 s, 0.6-133 s): min ${mn.toFixed(1)} LUFS at ${at.toFixed(1)} s  -> ${mn > -32 ? 'PASS' : 'FAIL'} (> -32)`);
// momentary vs short-term around each scene boundary
let worst = -1e9, bad = 0; const rows = [];
for (const [id, a] of SCENES.slice(1)) {
  let w = -1e9, wt = 0;
  for (let t = a - 1; t <= a + 1.0001; t += .1) { const d = ST(t) - MOM(t); if (d > w) { w = d; wt = t; } }
  rows.push(`${id}@${a}: ${w.toFixed(1)} dB (${wt.toFixed(1)} s)`); if (w > worst) worst = w; if (w > 14) bad++;
}
console.log(`boundary dips (short-term minus momentary, max within +-1 s): worst ${worst.toFixed(1)} dB -> ${bad ? 'FAIL' : 'PASS'} (<= 14)\n  ` + rows.join('\n  '));
// per scene
console.log('per-scene integrated loudness:');
for (const [id, a, b] of SCENES) {
  let lo = 1e9, hi = -1e9; for (let t = a + 3; t <= b + .001; t += .1) { const v = ST(t); lo = Math.min(lo, v); hi = Math.max(hi, v); }
  console.log(`  ${id.padEnd(12)} ${String(a).padStart(5)}-${String(b).padEnd(5)}  I ${integrated(a, b).toFixed(1).padStart(6)} LUFS   short-term ${lo < 1e8 ? lo.toFixed(1) : '  -  '} .. ${hi > -1e8 ? hi.toFixed(1) : '  -  '}`);
}
// clicks: a sample-to-sample jump far above the local high-frequency activity
{
  let clicks = []; const D = (X, i) => X[i] - 2 * X[i - 1] + X[i - 2];
  const W = 480; let acc = 0; const buf = new Float64Array(W);
  for (let i = 2; i < n; i++) {
    const d = Math.max(Math.abs(D(L, i)), Math.abs(D(R, i)));
    const loc = Math.sqrt(acc / W) + 1e-5;
    if (i > W + 2 && d > 12 * loc && d > .02) { const t = i / SR; if (!clicks.length || t - clicks[clicks.length - 1][0] > .05) clicks.push([t, d / loc]); }
    acc += d * d - buf[i % W]; buf[i % W] = d * d;
  }
  console.log(`click scan: ${clicks.length} suspicious transients` + (clicks.length ? ' at ' + clicks.slice(0, 30).map(([t, r]) => `${t.toFixed(3)}s(x${r.toFixed(0)})`).join(' ') : ''));
}
if (process.argv.includes('--curve')) {
  const out = []; for (let t = 1; t <= 135; t += 1) out.push(`${t}:${ST(t).toFixed(1)}`);
  console.log('short-term curve:\n' + out.join(' '));
}
