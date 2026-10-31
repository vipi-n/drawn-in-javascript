// Find individual calls (clucks, cackles, peeps) in a recording: node tools/calls.js file.mp3 [minDb]
const { spawnSync } = require('child_process');

function decode(file, a = 0, b = null) {
  const args = ['-v', 'error', '-i', file, '-ss', String(a)];
  if (b !== null) args.push('-to', String(b));
  args.push('-ac', '1', '-ar', '48000', '-f', 'f32le', '-');
  const r = spawnSync('ffmpeg', args, { maxBuffer: 1 << 30 });
  if (r.status !== 0) throw new Error('decode failed: ' + file);
  return new Float32Array(r.stdout.buffer.slice(r.stdout.byteOffset, r.stdout.byteOffset + r.stdout.length));
}

// segments where the 10 ms envelope stays within `rel` dB of the loudest part, joined across gaps < `gap` s
function calls(x, o = {}) {
  const SR = 48000, w = SR / 100, env = [];
  for (let i = 0; i < x.length; i += w) { let e = 0; for (let j = i; j < Math.min(x.length, i + w); j++) e += x[j] * x[j]; env.push(10 * Math.log10(e / w + 1e-12)); }
  const top = [...env].sort((a, b) => b - a)[Math.floor(env.length * .02)], thr = top - (o.rel ?? 22);
  const out = [];
  let s = -1, last = -1;
  env.forEach((v, k) => {
    if (v > thr) { if (s < 0) s = k; last = k; }
    else if (s >= 0 && k - last > (o.gap ?? .06) * 100) { out.push([s, last]); s = -1; }
  });
  if (s >= 0) out.push([s, last]);
  return out.map(([a, b]) => {
    let pk = -99; for (let k = a; k <= b; k++) pk = Math.max(pk, env[k]);
    return { a: a / 100, b: (b + 1) / 100, dur: (b + 1 - a) / 100, peak: pk };
  }).filter((c) => c.dur >= (o.min ?? .04) && c.dur <= (o.max ?? 2));
}

module.exports = { decode, calls };

if (require.main === module) {
  const f = process.argv[2], rel = +(process.argv[3] || 22);
  const cs = calls(decode(f), { rel });
  console.log(f.split('/').pop(), cs.length, 'calls');
  console.log(cs.map((c) => `${c.a.toFixed(2)}+${c.dur.toFixed(2)}(${c.peak.toFixed(0)})`).join('  '));
}
