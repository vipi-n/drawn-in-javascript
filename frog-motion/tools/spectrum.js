// Spectral balance per bar: node frog/tools/spectrum.js build/score.wav [barSeconds=2.4]
// prints dB energy in bands sub(<90) low(90-300) mid(300-2k) high(2k-7k) air(>7k) for every bar
const { spawnSync } = require('child_process');
const file = process.argv[2] || 'build/score.wav', barS = +(process.argv[3] || 2.4), SR = 24000, NFFT = 2048;
const r = spawnSync('ffmpeg', ['-v', 'error', '-i', file, '-ac', '1', '-ar', String(SR), '-f', 'f32le', '-'], { maxBuffer: 1 << 30 });
const x = new Float32Array(r.stdout.buffer, r.stdout.byteOffset, r.stdout.length >> 2);
function fft(re, im) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) { let bit = n >> 1; for (; j & bit; bit >>= 1) j ^= bit; j ^= bit; if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; } }
  for (let len = 2; len <= n; len <<= 1) {
    const a = -2 * Math.PI / len, wr = Math.cos(a), wi = Math.sin(a);
    for (let i = 0; i < n; i += len) { let cr = 1, ci = 0; for (let k = 0; k < len / 2; k++) { const ur = re[i + k], ui = im[i + k], vr = re[i + k + len / 2] * cr - im[i + k + len / 2] * ci, vi = re[i + k + len / 2] * ci + im[i + k + len / 2] * cr; re[i + k] = ur + vr; im[i + k] = ui + vi; re[i + k + len / 2] = ur - vr; im[i + k + len / 2] = ui - vi; const t = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = t; } }
  }
}
const edges = [0, 90, 300, 2000, 7000, 12000], names = ['sub', 'low', 'mid', 'high', 'air'];
const per = Math.round(barS * SR);
console.log('bar   t     ' + names.map((n) => n.padStart(5)).join(' '));
for (let b = 0; b * per < x.length; b++) {
  const E = new Float64Array(5);
  for (let s = b * per; s + NFFT <= Math.min(x.length, (b + 1) * per); s += NFFT) {
    const re = new Float64Array(NFFT), im = new Float64Array(NFFT);
    for (let i = 0; i < NFFT; i++) re[i] = x[s + i] * (.5 - .5 * Math.cos(2 * Math.PI * i / NFFT));
    fft(re, im);
    for (let k = 1; k < NFFT / 2; k++) { const f = k * SR / NFFT, p = re[k] * re[k] + im[k] * im[k]; for (let q = 0; q < 5; q++) if (f >= edges[q] && f < edges[q + 1]) E[q] += p; }
  }
  console.log(String(b).padStart(3), (b * barS).toFixed(1).padStart(6), [...E].map((e) => (10 * Math.log10(e + 1e-9)).toFixed(0).padStart(5)).join(' '));
}
