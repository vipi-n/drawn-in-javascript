// Sample playback for the score: CC0 VSCO-2-CE orchestral samples (assets/vsco, indexed by tools/vsco_index.js).
// Picks the nearest-pitched sample in the requested velocity layer with round-robin, re-pitches it with cubic
// interpolation, shapes attack / crescendo / release, loops long sustains with a crossfade, and writes to a bus.
const fs = require('fs'), path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..', 'assets', 'vsco');
const SR = 48000;
const IDX = JSON.parse(fs.readFileSync(path.join(ROOT, 'index.json'), 'utf8'));
const BYKEY = {};
for (const s of IDX) (BYKEY[s.key] = BYKEY[s.key] || []).push(s);
const CACHE = new Map(), RR = new Map();

function load(rec) {
  let d = CACHE.get(rec.file);
  if (d) return d;
  const r = spawnSync('ffmpeg', ['-v', 'error', '-i', path.join(ROOT, rec.file), '-ac', '2', '-ar', String(SR), '-f', 'f32le', '-'], { maxBuffer: 1 << 30 });
  const x = new Float32Array(r.stdout.buffer, r.stdout.byteOffset, r.stdout.length >> 2);
  const n = x.length >> 1, L = new Float32Array(n), R = new Float32Array(n);
  for (let i = 0; i < n; i++) { L[i] = x[2 * i]; R[i] = x[2 * i + 1]; }
  const on = Math.max(0, Math.round((rec.onset - .004) * SR));
  // peak-normalised so every note of an instrument sits level; capped so near-silent layers don't lift noise
  d = { L, R, n, on, norm: rec.peak > 1e-5 ? Math.min(.3 / rec.peak, 25) : 1 };
  CACHE.set(rec.file, d);
  return d;
}

// nearest pitch, then velocity layer (vel 0..1 across the layers that exist there), then round robin
function pick(key, midi, vel) {
  const list = BYKEY[key];
  if (!list) throw new Error('no instrument ' + key);
  let cand = list;
  if (midi !== null && list[0].midi !== undefined) {
    let best = 1e9;
    for (const s of list) { const d = Math.abs(s.midi - midi) + (s.midi < midi ? .3 : 0); if (d < best) best = d; }
    cand = list.filter((s) => Math.abs(s.midi - midi) + (s.midi < midi ? .3 : 0) <= best + .5);
  }
  const layers = [...new Set(cand.map((s) => s.vel))].sort((a, b) => a - b);
  const L = layers[Math.min(layers.length - 1, Math.round(Math.max(0, Math.min(1, vel)) * (layers.length - 1)))];
  const pool = cand.filter((s) => s.vel === L);
  const k = key + ':' + (pool[0].midi ?? '') + ':' + L, c = (RR.get(k) ?? 0) + 1;
  RR.set(k, c);
  return pool[c % pool.length];
}

// play one note. put(i, l, r) adds a stereo sample at absolute index i.
// o: {atk, rel, dyn(u)->gain over the held part, gain, loop, start (skip seconds), stop(abs t of hard stop),
//     flat (vel only picks the layer; level comes from gain/dyn)}
function note(put, key, midi, t0, dur, vel, o = {}) {
  const rec = pick(key, midi, vel), d = load(rec);
  const ratio = midi !== null && rec.midi !== undefined ? Math.pow(2, (midi - rec.midi) / 12) : (o.ratio ?? 1);
  const rel = o.rel ?? .3, atk = o.atk ?? .004, held = Math.max(.01, dur);
  const total = held + rel * 5, s0 = Math.round(t0 * SR), n = Math.ceil(total * SR);
  const avail = (d.n - d.on - 4) / ratio - (o.start ?? 0) * SR / ratio;
  const loop = (o.loop ?? true) && n > avail * .92 && d.n - d.on > SR * 1.5;
  const lA = d.on + Math.floor((d.n - d.on) * .35), lB = d.on + Math.floor((d.n - d.on) * .9), xf = Math.floor(SR * .25);
  const amp = d.norm * (o.gain ?? 1) * (o.flat ? 1 : .06 + .94 * Math.pow(Math.max(0, Math.min(1, vel)), 2));
  let p = d.on + (o.start ?? 0) * SR;
  for (let k = 0; k < n; k++) {
    const t = k / SR;
    let env = t < atk ? t / atk : 1;
    if (o.dyn && t < held) env *= o.dyn(t / held);
    else if (o.dyn) env *= o.dyn(1);
    if (t > held) env *= Math.exp(-(t - held) / rel);
    if (o.stop !== undefined && t0 + t > o.stop) env *= Math.max(0, 1 - (t0 + t - o.stop) / .06);
    if (env < 1e-4 && t > held) break;
    let i = Math.floor(p), f = p - i;
    if (i + 2 >= d.n) break;
    const ch = (A) => { const y0 = A[Math.max(0, i - 1)], y1 = A[i], y2 = A[i + 1], y3 = A[i + 2]; return y1 + .5 * f * (y2 - y0 + f * (2 * y0 - 5 * y1 + 4 * y2 - y3 + f * (3 * (y1 - y2) + y3 - y0))); };
    let l = ch(d.L), r = ch(d.R);
    if (loop && p > lB - xf) { // crossfade into the loop start
      const u = (p - (lB - xf)) / xf, q = lA + (p - (lB - xf)), j = Math.floor(q), g = q - j;
      const l2 = d.L[j] * (1 - g) + d.L[j + 1] * g, r2 = d.R[j] * (1 - g) + d.R[j + 1] * g;
      l = l * (1 - u) + l2 * u; r = r * (1 - u) + r2 * u;
      if (u >= 1) p = q;
    }
    put(s0 + k, l * env * amp, r * env * amp);
    p += ratio;
  }
  return rec;
}
const has = (key) => !!BYKEY[key];
const range = (key) => { const m = BYKEY[key].map((s) => s.midi); return [Math.min(...m), Math.max(...m)]; };
// time (s) from sample start to its loudest moment (to land cymbal swells on a beat)
const peakTime = (key) => { const r = BYKEY[key][0]; return r.peakAt - r.onset; };

module.exports = { note, pick, load, has, range, peakTime, BYKEY, SR };
