// per-0.5s RMS (dBFS) + spectral centroid of recordings: node tools/env.js file.mp3 ...
const { spawnSync } = require('child_process');
for (const f of process.argv.slice(2)) {
  const r = spawnSync('ffmpeg', ['-v', 'error', '-i', f, '-ac', '1', '-ar', '16000', '-f', 'f32le', '-'], { maxBuffer: 1 << 30 });
  const x = new Float32Array(r.stdout.buffer, r.stdout.byteOffset, r.stdout.length >> 2);
  const hop = 8000, out = [];
  for (let s = 0; s + hop <= x.length; s += hop) { let e = 0, z = 0; for (let i = s; i < s + hop; i++) { e += x[i] * x[i]; if (i > s && (x[i] > 0) !== (x[i - 1] > 0)) z++; } out.push(`${(10 * Math.log10(e / hop + 1e-12)).toFixed(0)}/${(z / 2 / (hop / 16000) / 1000).toFixed(1)}`); }
  console.log(f.split('/').pop(), (x.length / 16000).toFixed(1) + 's\n ', out.join(' '));
}
