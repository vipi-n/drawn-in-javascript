// Loudness envelope of a recording: node frog/tools/env.js file.mp3 [win_ms=50] [from=0] [to=end]
// Prints one row per window: time, dB, bar. Used to pick clean call onsets out of the CC0 recordings.
const { spawnSync } = require('child_process');
const [file, winMs = 50, from = 0, to = 1e9] = process.argv.slice(2);
const SR = 16000;
const r = spawnSync('ffmpeg', ['-v', 'error', '-i', file, '-ac', '1', '-ar', String(SR), '-f', 'f32le', '-'], { maxBuffer: 1 << 30 });
const x = new Float32Array(r.stdout.buffer, r.stdout.byteOffset, r.stdout.length >> 2);
const w = Math.round(SR * winMs / 1000);
for (let i = Math.round(from * SR); i + w <= x.length && i / SR < +to; i += w) {
  let e = 0;
  for (let k = 0; k < w; k++) e += x[i + k] * x[i + k];
  const db = 10 * Math.log10(e / w + 1e-12);
  console.log((i / SR).toFixed(2).padStart(7), db.toFixed(1).padStart(6), '#'.repeat(Math.max(0, Math.round((db + 60) / 1.5))));
}
