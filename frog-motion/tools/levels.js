// Loudness map of a WAV: short-term LUFS per second + where peaks pile up. node frog/tools/levels.js build/score.wav
const { spawnSync } = require('child_process');
const file = process.argv[2] || 'build/score.wav';
const r = spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-i', file, '-af', 'ebur128=peak=sample', '-f', 'null', '-'], { encoding: 'utf8', maxBuffer: 1 << 28 });
const rows = [];
for (const line of r.stderr.split('\n')) {
  const m = line.match(/t:\s*([\d.]+).*?M:\s*(-?[\d.]+|-inf).*?S:\s*(-?[\d.]+|-inf)/);
  if (m) rows.push([+m[1], +m[2], +m[3]]);
}
const per = [];
for (const [t, M, S] of rows) { const k = Math.floor(t); if (!per[k] || Math.abs(t - k - .5) < .06) per[k] = [M, S]; }
let line = '';
per.forEach((v, k) => { if (!v) return; line += `${String(k).padStart(3)}:${String(v[1].toFixed(0)).padStart(4)} `; if (k % 10 === 9) { console.log(line); line = ''; } });
if (line) console.log(line);
