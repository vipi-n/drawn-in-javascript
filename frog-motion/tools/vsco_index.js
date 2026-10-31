// Build assets/vsco/index.json: every sample's instrument key, detected pitch (YIN), velocity layer, round robin,
// onset and peak. node frog-motion/tools/vsco_index.js
const fs = require('fs'), path = require('path');
const { spawnSync } = require('child_process');
const ROOT = path.join(__dirname, '..', 'assets', 'vsco');
const SR = 48000;

const INST = {
  vlnSus: 'Strings/Violin Section/susVib', vlaSus: 'Strings/Viola Section/susvib', vcSus: 'Strings/Cello Section/susvib', cbSus: 'Strings/Solo Contrabass/SusNV',
  vlnTrem: 'Strings/Violin Section/Trem', vcTrem: 'Strings/Cello Section/trem',
  vlnPizz: 'Strings/Violin Section/Pizz', vlaPizz: 'Strings/Viola Section/pizz', vcPizz: 'Strings/Cello Section/pizzT', cbPizz: 'Strings/Solo Contrabass/Pizz',
  vlnSpic: 'Strings/Violin Section/Spic', vlaSpic: 'Strings/Viola Section/spic', vcSpic: 'Strings/Cello Section/spic',
  harp: 'Strings/Harp', fluteSus: 'Woodwinds/Flute/susvib', fluteStac: 'Woodwinds/Flute/stac', clarSus: 'Woodwinds/Clarinet/susLong', clarStac: 'Woodwinds/Clarinet/stac',
  oboe: 'Woodwinds/Oboe/Vib', bsnStac: 'Woodwinds/Bassoon/stac', bsnSus: 'Woodwinds/Bassoon/sus', horn: 'Brass/F Horn/sus', hornMute: 'Brass/F Horn/mute',
  glock: 'Percussion/Glock', marimba: 'Percussion/Marimba', xylo: 'Percussion/Xylo', timp: 'Percussion/Timpani', timpRoll: 'Percussion/Timpani/Rolls',
  piano: 'Keys/Upright Piano', shaker: "VSCO 1 Percussion/varWood/Camo's Shaker",
};
const PERC = [ // one-shot families inside Percussion/
  ['guiroHit', /^Guiro-Hit/], ['guiroFast', /^Guiro-Fast/], ['guiroM', /^Guiro-M/], ['guiroSlow', /^Guiro-Slow/], ['logHi', /^LogDrumHi/], ['logLo', /^LogDrumLo/],
  ['conga', /^Conga-HitN/], ['tumba', /^Tumba-HitN/], ['quinto', /^Quinto-HitN/], ['claves', /^Claves/], ['tambHit', /^Tamb1-Hit/], ['tambShake', /^Tamb1-Shake/],
  ['triangle', /^Triangle3-Hit_/], ['sleigh', /^Sleighbells/], ['bellTree', /^BellTree/], ['bdrum', /^BDrumNewhit/], ['crash', /^cymbal-crash1/],
  ['swellLong', /^susCymb1-cresc-Long/], ['swellMed', /^susCymb1-cresc-Median/], ['swellShort', /^susCymb1-cresc-Short/], ['cymHit', /^susCymb1-hit_/], ['gong', /^gongHit/], ['bdRub', /^bassdrum_rub/],
];
const UNPITCHED = new Set(['shaker', 'timpRoll', ...PERC.map((p) => p[0])]);
const SHORT = new Set(['vlnPizz', 'vlaPizz', 'vcPizz', 'cbPizz', 'vlnSpic', 'vlaSpic', 'vcSpic', 'harp', 'fluteStac', 'clarStac', 'bsnStac', 'glock', 'marimba', 'xylo', 'timp', 'piano']);

function decodeMono(file) {
  const r = spawnSync('ffmpeg', ['-v', 'error', '-i', file, '-ac', '1', '-ar', String(SR), '-f', 'f32le', '-'], { maxBuffer: 1 << 30 });
  return new Float32Array(r.stdout.buffer, r.stdout.byteOffset, r.stdout.length >> 2);
}
function yin(x, start, W = 3000, tauMax = 2400, tauMin = 8) {
  if (start + W + tauMax >= x.length) start = Math.max(0, x.length - W - tauMax - 1);
  if (start < 0) return null;
  const d = new Float64Array(tauMax + 1);
  for (let tau = 1; tau <= tauMax; tau++) { let s = 0; for (let j = 0; j < W; j++) { const v = x[start + j] - x[start + j + tau]; s += v * v; } d[tau] = s; }
  let run = 0, best = -1;
  const cm = new Float64Array(tauMax + 1); cm[0] = 1;
  for (let tau = 1; tau <= tauMax; tau++) { run += d[tau]; cm[tau] = run > 0 ? d[tau] * tau / run : 1; }
  for (let tau = tauMin; tau < tauMax; tau++) if (cm[tau] < .12) { while (tau + 1 < tauMax && cm[tau + 1] < cm[tau]) tau++; best = tau; break; }
  if (best < 0) { let m = 1e9; for (let tau = tauMin; tau < tauMax; tau++) if (cm[tau] < m) { m = cm[tau]; best = tau; } if (m > .35) return null; }
  const a = cm[best - 1], b = cm[best], c = cm[best + 1], den = a - 2 * b + c, off = den ? .5 * (a - c) / den : 0;
  return SR / (best + off);
}
const PC = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };
function nameMidi(n) { const m = n.match(/_([A-G]#?)(-?\d)(?=[_.])/); return m ? (+m[2] + 2) * 12 + PC[m[1]] : null; }
function velOf(n) {
  const v = n.match(/_v(\d+)/i); if (v) return +v[1];
  const d = n.match(/_(ppp|pp|p|mp|mf|f|ff|fff)[_.]/); if (d) return { ppp: 1, pp: 2, p: 3, mp: 4, mf: 5, f: 6, ff: 7, fff: 8 }[d[1]];
  const dy = n.match(/dyn(\d)/); return dy ? +dy[1] : 1;
}
const rrOf = (n) => { const m = n.match(/rr(\d)/i) || n.match(/_(\d)\.wav$/); return m ? +m[1] : 1; };

const out = [];
const add = (key, dir, file) => {
  const x = decodeMono(path.join(ROOT, dir, file));
  let pk = 0; for (let i = 0; i < x.length; i++) pk = Math.max(pk, Math.abs(x[i]));
  let on = 0; while (on < x.length && Math.abs(x[on]) < pk * .02) on++;
  let pkAt = 0, e = 0, best = 0; // time of loudest 50 ms (for swells)
  const w = SR * .05;
  for (let i = 0; i + w < x.length; i += w) { e = 0; for (let k = 0; k < w; k++) e += x[i + k] * x[i + k]; if (e > best) { best = e; pkAt = i; } }
  let rms = 0; const a = on, b = Math.min(x.length, on + SR * (SHORT.has(key) ? .15 : .6)); for (let i = a; i < b; i++) rms += x[i] * x[i]; rms = Math.sqrt(rms / Math.max(1, b - a));
  const rec = { key, file: path.join(dir, file), vel: velOf(file), rr: rrOf(file), len: x.length / SR, onset: on / SR, peakAt: pkAt / SR, peak: pk, rms };
  if (!UNPITCHED.has(key)) {
    const f0 = key === 'timp' ? timpPitch(x, on) : yin(x, on + Math.round(SR * (SHORT.has(key) ? .03 : .3)));
    rec.det = f0 ? 69 + 12 * Math.log2(f0 / 440) : null; rec.named = nameMidi(file);
    const pm = file.match(/Player_dyn\d_rr\d_(\d+)\.wav$/);
    if (pm) rec.named = 21 + 2 * +pm[1];
  }
  out.push(rec);
};
// timpani: strongest spectral peak between 55 and 220 Hz (the fundamental-ish principal mode)
function timpPitch(x, on) {
  const a = on + Math.round(SR * .08), n = Math.round(SR * .35);
  let best = 0, bf = null;
  for (let f = 55; f <= 220; f *= Math.pow(2, 1 / 48)) {
    let re = 0, im = 0; const w = 2 * Math.PI * f / SR;
    for (let i = 0; i < n && a + i < x.length; i++) { const v = x[a + i] * (.5 - .5 * Math.cos(2 * Math.PI * i / n)); re += v * Math.cos(w * i); im += v * Math.sin(w * i); }
    const p = re * re + im * im; if (p > best) { best = p; bf = f; }
  }
  return bf;
}
// per instrument: pick the octave convention that most detections agree with, then trust the names
function resolve(list, force) {
  let off = 0;
  if (!force) {
    const votes = { '-12': 0, 0: 0, 12: 0 };
    for (const s of list) if (s.det !== null && s.named !== null) for (const k of [-12, 0, 12]) if (Math.abs(s.det - (s.named + k)) < .6) votes[k]++;
    off = +Object.entries(votes).sort((p, q) => q[1] - p[1])[0][0];
  }
  for (const s of list) {
    if (s.named === null) { s.midi = s.det; continue; }
    const n = s.named + off;
    s.midi = s.det !== null && Math.abs(s.det - n) < .5 ? s.det : n;
  }
}
const t0 = Date.now();
for (const [key, dir] of Object.entries(INST)) {
  const files = fs.readdirSync(path.join(ROOT, dir)).filter((f) => /\.wav$/i.test(f));
  for (const f of files) add(key, dir, f);
  if (!UNPITCHED.has(key)) resolve(out.filter((s) => s.key === key), ['glock', 'marimba', 'xylo', 'piano'].includes(key));
  console.log(key.padEnd(10), files.length, ((Date.now() - t0) / 1000).toFixed(0) + 's');
}
for (const f of fs.readdirSync(path.join(ROOT, 'Percussion')).filter((f) => /\.wav$/i.test(f))) {
  const p = PERC.find(([, re]) => re.test(f));
  if (p) add(p[0], 'Percussion', f);
}
// timpani: the lowest detection per drum is its principal mode (others caught the 3:2 overtone); rolls use the same drums
const drum = (s) => +s.file.match(/Timpani(\d)/)[1], DR = {};
for (const s of out) if (s.key === 'timp' && s.det) DR[drum(s)] = Math.min(DR[drum(s)] ?? 1e9, s.det);
for (const s of out) if (s.key === 'timp' || s.key === 'timpRoll') s.midi = DR[drum(s)];
console.log('timpani drums', Object.entries(DR).map(([k, v]) => k + ':' + v.toFixed(1)).join(' '));
fs.writeFileSync(path.join(ROOT, 'index.json'), JSON.stringify(out, null, 0));
console.log('samples', out.length, ((Date.now() - t0) / 1000).toFixed(0) + 's');
