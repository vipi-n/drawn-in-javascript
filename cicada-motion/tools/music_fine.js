// fine RMS envelope (dB per 10 ms) of a recording segment: node tools/music_fine.js file [from] [len]
const { spawnSync } = require('child_process');
const [file, from = 0, len = 3] = process.argv.slice(2);
const r = spawnSync('ffmpeg', ['-v', 'error', '-ss', String(from), '-t', String(len), '-i', file, '-ac', '1', '-ar', '48000', '-f', 'f32le', '-'], { maxBuffer: 1 << 30 });
const x = new Float32Array(r.stdout.buffer, r.stdout.byteOffset, r.stdout.length >> 2), out = [];
for (let s = 0; s + 480 <= x.length; s += 480) { let e = 0; for (let i = s; i < s + 480; i++) e += x[i] * x[i]; out.push((10 * Math.log10(e / 480 + 1e-12)).toFixed(0)); }
console.log(out.join(' '));
