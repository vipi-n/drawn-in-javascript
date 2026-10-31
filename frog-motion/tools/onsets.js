// Onset finder for one-shot recordings (drops, bubbles, splashes): node tools/onsets.js file.mp3 [minDb=-40] [gapMs=120]
// Prints onset time, peak dB and the length until the next onset, so clean single hits can be sliced out.
const { spawnSync } = require('child_process');
const [file, minDb = -40, gapMs = 120] = process.argv.slice(2);
const SR = 16000, w = SR / 100;
const r = spawnSync('ffmpeg', ['-v', 'error', '-i', file, '-ac', '1', '-ar', String(SR), '-f', 'f32le', '-'], { maxBuffer: 1 << 30 });
const x = new Float32Array(r.stdout.buffer, r.stdout.byteOffset, r.stdout.length >> 2);
const db = [];
for (let i = 0; i + w <= x.length; i += w) { let e = 0; for (let k = 0; k < w; k++) e += x[i + k] * x[i + k]; db.push(10 * Math.log10(e / w + 1e-12)); }
const on = [];
let floor = -90, last = -1e9;
for (let k = 1; k < db.length; k++) {
  floor = Math.min(db[k], floor * .98 + db[k] * .02);
  if (db[k] > +minDb && db[k] - db[k - 1] > 6 && db[k] - floor > 12 && (k - last) * 10 > +gapMs) {
    let pk = db[k]; for (let j = k; j < Math.min(db.length, k + 20); j++) pk = Math.max(pk, db[j]);
    on.push([k / 100, pk]); last = k;
  }
}
on.forEach(([t, pk], i) => console.log(t.toFixed(2).padStart(7), pk.toFixed(1).padStart(6), (i + 1 < on.length ? (on[i + 1][0] - t).toFixed(2) : '-').padStart(6)));
console.log(on.length, 'onsets');
