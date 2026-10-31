// Recording probe for the score: onsets (energy jumps), spectral peaks and amplitude-modulation rate.
//   node tools/music_probe.js onsets file.mp3 [thresholdDb] [from] [to]
//   node tools/music_probe.js spec file.mp3 [from] [len]
//   node tools/music_probe.js am file.mp3 [from] [len]
const { spawnSync } = require('child_process');
const [mode, file, ...rest] = process.argv.slice(2);
const SR = 48000;
const r = spawnSync('ffmpeg', ['-v', 'error', '-i', file, '-ac', '1', '-ar', String(SR), '-f', 'f32le', '-'], { maxBuffer: 1 << 30 });
const x = new Float32Array(r.stdout.buffer, r.stdout.byteOffset, r.stdout.length >> 2);
const db = (e) => 10 * Math.log10(e + 1e-12);

if (mode === 'onsets') {
  const th = +(rest[0] ?? 12), from = +(rest[1] ?? 0), to = +(rest[2] ?? x.length / SR), hop = SR / 100;
  const e = [];
  for (let s = Math.round(from * SR); s + hop <= Math.min(x.length, to * SR); s += hop) { let q = 0; for (let i = s; i < s + hop; i++) q += x[i] * x[i]; e.push(db(q / hop)); }
  const out = [];
  for (let k = 5; k < e.length; k++) {
    const bg = Math.min(...e.slice(k - 5, k));
    if (e[k] - bg > th && e[k] > -50 && (!out.length || k * .01 + from - out[out.length - 1][0] > .08)) {
      let pk = k; for (let j = k; j < Math.min(e.length, k + 20); j++) if (e[j] > e[pk]) pk = j;
      out.push([from + k * .01, e[pk]]);
    }
  }
  console.log(out.map(([t, v]) => `${t.toFixed(2)}(${v.toFixed(0)})`).join(' '));
} else if (mode === 'spec') {
  const from = +(rest[0] ?? 1), segs = +(rest[1] ?? 8), len = 8192, s0 = Math.round(from * SR), mag = new Float64Array(len / 2);
  const fft = (re, im) => {
    const n = re.length;
    for (let i = 1, j = 0; i < n; i++) { let b = n >> 1; for (; j & b; b >>= 1) j ^= b; j ^= b; if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; } }
    for (let sz = 2; sz <= n; sz <<= 1) { const a = -2 * Math.PI / sz; for (let i = 0; i < n; i += sz) for (let k = 0; k < sz / 2; k++) { const c = Math.cos(a * k), s = Math.sin(a * k), p = i + k, q = p + sz / 2, tr = re[q] * c - im[q] * s, ti = re[q] * s + im[q] * c; re[q] = re[p] - tr; im[q] = im[p] - ti; re[p] += tr; im[p] += ti; } }
  };
  for (let seg = 0; seg < segs; seg++) {
    const o = s0 + seg * len / 2, re = new Float64Array(len), im = new Float64Array(len);
    for (let i = 0; i < len; i++) re[i] = (x[o + i] || 0) * (.5 - .5 * Math.cos(2 * Math.PI * i / len));
    fft(re, im);
    for (let k = 0; k < len / 2; k++) mag[k] += re[k] * re[k] + im[k] * im[k];
  }
  const bands = [];
  for (let f = 100; f < 20000; f *= 1.26) {
    let q = 0; for (let k = Math.round(f * len / SR); k < Math.round(f * 1.26 * len / SR); k++) q += mag[k] || 0;
    bands.push(`${Math.round(f)}:${db(q).toFixed(0)}`);
  }
  let pk = 1; for (let k = 2; k < len / 2; k++) if (mag[k] > mag[pk]) pk = k;
  console.log(bands.join(' '), '| peak', Math.round(pk * SR / len), 'Hz');
} else if (mode === 'am') {
  // envelope spectrum of the rectified, smoothed signal -> tymbal pulse rate
  const from = +(rest[0] ?? 1), len = +(rest[1] ?? 2), s0 = Math.round(from * SR), n = Math.round(len * SR), env = [];
  let lp = 0; const a = Math.exp(-1 / (.0008 * SR));
  for (let i = 0; i < n; i++) { lp = a * lp + (1 - a) * Math.abs(x[s0 + i]); if (i % 24 === 0) env.push(lp); }
  const esr = SR / 24, mu = env.reduce((p, c) => p + c, 0) / env.length, res = [];
  for (let f = 20; f < 600; f += 2) { let re = 0, im = 0; env.forEach((v, i) => { re += (v - mu) * Math.cos(2 * Math.PI * f * i / esr); im += (v - mu) * Math.sin(2 * Math.PI * f * i / esr); }); res.push([f, re * re + im * im]); }
  res.sort((p, q) => q[1] - p[1]);
  console.log('AM peaks (Hz):', res.slice(0, 8).map(([f, p]) => `${f}:${db(p).toFixed(0)}`).join(' '));
}
