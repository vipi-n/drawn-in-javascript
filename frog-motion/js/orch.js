// The orchestra on top of the VSCO sampler: seating (pan + hall send + trim), humanised timing, legato lines,
// section voicing with voice leading, harp gestures, mallets and percussion.  Every note is metered per instrument.
const S = require('./sampler');
const { out, R, rnd, clamp, SR } = require('./mix');

const BEAT = .6, BAR = 2.4, B = (bar, beat = 0) => bar * BAR + beat * BEAT;
// [pan, hall send, trim dB]
const SEAT = {
  vlnSus: [-.45, .34, -1], vlaSus: [.14, .34, -2], vcSus: [.36, .3, -1], cbSus: [.52, .26, 0],
  vlnTrem: [-.45, .34, -3], vcTrem: [.36, .3, -2],
  vlnPizz: [-.45, .3, 1], vlaPizz: [.14, .3, 1], vcPizz: [.36, .26, 2], cbPizz: [.52, .24, 3],
  vlnSpic: [-.45, .28, -1], vlaSpic: [.14, .28, -1], vcSpic: [.36, .26, 0],
  harp: [-.3, .34, 1], fluteSus: [-.1, .32, -4], fluteStac: [-.1, .3, -2], oboe: [.06, .3, -4], clarSus: [-.2, .3, -4], clarStac: [-.2, .26, -3],
  bsnSus: [.2, .28, -5], bsnStac: [.2, .24, -4], horn: [-.24, .44, -2], hornMute: [-.24, .4, -3],
  glock: [.3, .38, -7], marimba: [-.22, .28, -1], xylo: [.26, .3, -8], piano: [0, .32, -3],
  timp: [0, .4, -1], timpRoll: [0, .42, -3], shaker: [.45, .18, -9], bdrum: [0, .34, -3], bdRub: [0, .34, -1], bellTree: [.35, .4, -9],
  claves: [.3, .2, -12], conga: [-.3, .2, -4], quinto: [-.38, .2, -4], tumba: [-.22, .2, -3], logHi: [.28, .22, -4], logLo: [.18, .22, -3],
  guiroFast: [.4, .2, -7], guiroHit: [.4, .2, -6], guiroM: [.4, .2, -6], guiroSlow: [.4, .2, -7], tambHit: [.4, .22, -9], tambShake: [.4, .22, -10],
  triangle: [.42, .36, -12], sleigh: [.38, .3, -13], crash: [.1, .4, -7], cymHit: [-.1, .42, -6], gong: [0, .45, -6],
  swellLong: [0, .45, -5], swellMed: [0, .45, -5], swellShort: [0, .45, -5],
};
const METER = {};
const db = (x) => Math.pow(10, x / 20);

// one note. o: {pan, rev, gain(dB), jit, atk, rel, dyn, loop, start, stop, flat, ratio}
function play(key, midi, t, dur, vel, o = {}) {
  const st = SEAT[key] ?? [0, .3, 0], jit = o.jit ?? .006;
  const t0 = Math.max(0, t + (jit ? R(-jit, jit) : 0)), v = clamp(vel * (o.hv === false ? 1 : R(.94, 1.05)));
  const put0 = out((o.pan ?? st[0]) + (o.spread ? R(-o.spread, o.spread) : 0), db(st[2] + (o.gain ?? 0)), o.rev ?? st[1], o.bus ?? 'mus');
  const m = (METER[key] = METER[key] ?? { n: 0, e: 0, bars: new Float64Array(60) });
  m.n++;
  const tg = db(st[2] + (o.gain ?? 0)) ** 2;
  const put = (i, l, r) => { const v = (l * l + r * r) * tg; m.e += v; m.bars[Math.min(59, (i / SR / BAR) | 0)] += v; put0(i, l, r); };
  return S.note(put, key, midi, t0, dur, v, { atk: o.atk, rel: o.rel, dyn: o.dyn, loop: o.loop, start: o.start, stop: o.stop, flat: o.flat, ratio: o.ratio });
}
const hit = (key, t, vel = .8, o = {}) => play(key, null, t, o.dur ?? 3, vel, { rel: o.rel ?? .6, ...o });

// ---------------------------------------------------------------- legato lines: [[t, midi, dur, vel]]
// sustained samples cross-faded note to note; the first note of a phrase gets a fuller attack
function line(key, notes, o = {}) {
  notes.forEach(([t, m, d, v = .7], i) => {
    const next = notes[i + 1], legato = next && next[0] - (t + d) < .05;
    play(key, m + (o.oct ?? 0), t, d + (legato ? (o.over ?? .09) : 0), v * (o.vel ?? 1), {
      atk: i && legato ? (o.atkL ?? .05) : (o.atk ?? .03), rel: legato ? (o.relL ?? .1) : (o.rel ?? .28), dyn: o.dyn, gain: o.gain, pan: o.pan, rev: o.rev,
      start: i && notes[i - 1][0] + notes[i - 1][2] > t - .05 ? (o.skip ?? .06) : 0,
    });
  });
}
// phrase in beats -> absolute line: P = [[beat, midi, durBeats, vel]]
const phrase = (P, t0, tr = 0, v = 1, sc = 1) => P.map(([b, m, d, vv = 1]) => [t0 + b * BEAT * sc, m + tr, d * BEAT * sc, v * vv]);

// ---------------------------------------------------------------- harmony
const PC = {
  F: [5, 9, 0], Fmaj7: [5, 9, 0, 4], Fadd9: [5, 9, 0, 7], F6: [5, 9, 0, 2], 'F/A': [9, 0, 5], 'F/C': [0, 5, 9], Dm: [2, 5, 9], Dm7: [2, 5, 9, 0], Dm9: [2, 5, 9, 0, 4],
  Bb: [10, 2, 5], Bbmaj7: [10, 2, 5, 9], Bbadd9: [10, 2, 5, 0], Bbm: [10, 1, 5], C: [0, 4, 7], C7: [0, 4, 7, 10], Csus: [0, 5, 7], 'C/E': [4, 7, 0], C9sus: [0, 5, 7, 10, 2],
  Gm: [7, 10, 2], Gm7: [7, 10, 2, 5], Gm9: [7, 10, 2, 5, 9], Am: [9, 0, 4], Am7: [9, 0, 4, 7], A: [9, 1, 4], A7: [9, 1, 4, 7], Asus: [9, 2, 4], Eb: [3, 7, 10], Ebmaj7: [3, 7, 10, 2],
  Db: [1, 5, 8], Dbmaj7: [1, 5, 8, 0], E7: [4, 8, 11, 2], Edim: [4, 7, 10], Bdim: [11, 2, 5], Ab: [8, 0, 3], G7: [7, 11, 2, 5], G: [7, 11, 2], D7: [2, 6, 9, 0],
};
const root = (c) => PC[c][0];
// voice a chord inside [lo, hi] with n voices, moving as little as possible from prev
function voice(c, lo, hi, n = 4, prev = null) {
  const pcs = PC[c];
  const near = (m) => { let best = null; for (let k = lo; k <= hi; k++) if (pcs.includes(((k % 12) + 12) % 12) && (best === null || Math.abs(k - m) < Math.abs(best - m))) best = k; return best; };
  let v;
  if (prev && prev.length === n) v = prev.map(near);
  else { v = []; let m = lo; for (let i = 0; i < n; i++) { let k = m; while (!pcs.includes(k % 12) || v.includes(k)) k++; v.push(k); m = k + 3; } }
  const need = pcs.slice(0, Math.min(n, pcs.length));
  for (const pc of need) {
    if (v.some((m) => m % 12 === pc)) continue;
    const cnt = {}; v.forEach((m) => { cnt[m % 12] = (cnt[m % 12] ?? 0) + 1; });
    let bi = -1, bk = 0, bd = 1e9;
    v.forEach((m, i) => {
      if (cnt[m % 12] < 2 && need.includes(m % 12)) return;
      for (let k = m - 7; k <= m + 7; k++) if (k >= lo && k <= hi && k % 12 === pc && !v.includes(k) && Math.abs(k - m) < bd) { bd = Math.abs(k - m); bi = i; bk = k; }
    });
    if (bi >= 0) v[bi] = bk;
  }
  return v.sort((a, b) => a - b);
}
// bass note of chord c (slash chords list their bass first) at or above lo
const bassOf = (c, lo = 34) => { let m = lo; while (m % 12 !== root(c)) m++; return m; };

// string section pad: notes split across cb / vc / vla / vln by register
function strings(notes, t, dur, vel = .6, o = {}) {
  const sorted = notes.slice().sort((a, b) => a - b);
  sorted.forEach((m, i) => {
    const key = m < 40 ? 'cbSus' : m < 55 ? 'vcSus' : m < 65 ? 'vlaSus' : 'vlnSus';
    play(key, m, t + i * (o.roll ?? 0), dur, vel * (o.top && i === sorted.length - 1 ? 1.12 : 1), { atk: o.atk ?? .35, rel: o.rel ?? .7, dyn: o.dyn, gain: o.gain, start: o.start });
    if (o.cb && i === 0 && m >= 40 && m - 12 >= 28) play('cbSus', m - 12, t, dur, vel * .8, { atk: o.atk ?? .35, rel: o.rel ?? .7, dyn: o.dyn, gain: o.gain });
  });
}
const TREM = (m) => (m < 55 ? 'vcTrem' : 'vlnTrem');
function trem(notes, t, dur, vel = .5, o = {}) { for (const m of notes) play(TREM(m), m, t, dur, vel, { atk: o.atk ?? .3, rel: o.rel ?? .5, dyn: o.dyn, gain: o.gain }); }
const PZ = (m) => (m < 36 ? 'cbPizz' : m < 48 ? (m < 41 ? 'cbPizz' : 'vcPizz') : m < 57 ? 'vlaPizz' : 'vlnPizz');
function pizz(m, t, vel = .7, o = {}) { return play(o.key ?? PZ(m), m, t, o.dur ?? .4, vel, { rel: o.rel ?? .35, jit: .008, gain: o.gain, pan: o.pan }); }
const SP = (m) => (m < 50 ? 'vcSpic' : m < 60 ? 'vlaSpic' : 'vlnSpic');
function spic(m, t, vel = .7, o = {}) { return play(o.key ?? SP(m), m, t, o.dur ?? .25, vel, { rel: o.rel ?? .12, jit: .006, gain: o.gain, pan: o.pan }); }

// harp: plucks, broken chords, glissandi through a scale
function harp(m, t, vel = .7, o = {}) { return play('harp', m, t, o.dur ?? 2.5, vel, { rel: o.rel ?? 1.2, jit: .004, gain: o.gain, pan: o.pan }); }
const SCALE = { F: [5, 7, 9, 10, 0, 2, 4], Dm: [2, 4, 5, 7, 9, 10, 1], Fpent: [5, 7, 9, 0, 2], Dmh: [2, 4, 5, 7, 9, 10, 1] };
function gliss(t, dur, m0, m1, vel = .6, o = {}) {
  const sc = SCALE[o.scale ?? 'F'], notes = [];
  const dir = m1 >= m0 ? 1 : -1;
  for (let m = m0; dir > 0 ? m <= m1 : m >= m1; m += dir) if (sc.includes(((m % 12) + 12) % 12)) notes.push(m);
  notes.forEach((m, i) => { const u = i / Math.max(1, notes.length - 1); harp(m, t + dur * Math.pow(u, o.curve ?? 1), vel * (o.cresc ? .55 + .45 * u : 1), { dur: 1.6, rel: .9, gain: o.gain }); });
  return notes.length;
}
function arp(notes, t, step, vel = .6, o = {}) { notes.forEach((m, i) => (o.key ? play(o.key, m, t + i * step, o.dur ?? 2, vel * (o.decay ? Math.pow(o.decay, i) : 1), { rel: o.rel ?? .8, gain: o.gain }) : harp(m, t + i * step, vel, { gain: o.gain }))); }
const mallet = (key, m, t, vel = .6, o = {}) => play(key, m, t, o.dur ?? 2, vel, { rel: o.rel ?? .8, jit: .004, gain: o.gain, pan: o.pan });

// ---------------------------------------------------------------- percussion helpers
function swell(key, tPeak, vel = .7, o = {}) { const pk = S.peakTime(key); return play(key, null, tPeak - pk, pk + (o.tail ?? .4), vel, { rel: o.rel ?? .5, gain: o.gain, jit: 0, flat: true }); }
function timp(m, t, vel = .7, o = {}) { return play('timp', m, t, o.dur ?? 2.5, vel, { rel: o.rel ?? 1, gain: o.gain, jit: .003 }); }
function roll(m, t, dur, vel = .6, o = {}) { return play('timpRoll', m, t, dur, vel, { atk: o.atk ?? .4, rel: o.rel ?? .5, dyn: o.dyn, gain: o.gain }); }

function report() {
  const rows = Object.entries(METER).map(([k, m]) => [k, m.n, 10 * Math.log10(m.e + 1e-12)]).sort((a, b) => b[2] - a[2]);
  const SEC = [[0, 5, 'night'], [5, 7.5, 'call'], [7.5, 10, 'amplexus'], [10, 14, 'spawn'], [14, 17, 'cells'], [17, 22, 'embryo'], [22, 26, 'hatch'], [26, 29, 'tadpole'], [29, 32, 'danger'], [32, 36, 'legs'], [36, 41, 'meta'], [41, 42, 'reveal'], [42, 46, 'froglet'], [46, 49, 'grow'], [49, 51, 'winter'], [51, 54, 'spring'], [54, 56, 'finale']];
  const sec = SEC.map(([a, b, name]) => {
    const e = Object.entries(METER).map(([k, m]) => { let s = 0; for (let i = Math.floor(a); i < Math.ceil(b); i++) s += m.bars[i]; return [k, 10 * Math.log10(s + 1e-12)]; }).filter((r) => r[1] > -60).sort((p, q) => q[1] - p[1]);
    return `${name.padEnd(9)} ` + e.slice(0, 7).map(([k, v]) => `${k} ${(v - e[0][1]).toFixed(0)}`).join(' | ');
  });
  return rows.map(([k, n, e]) => `${k.padEnd(11)} ${String(n).padStart(4)} notes  ${e.toFixed(1).padStart(6)} dB`).join('\n') + '\n' + sec.join('\n');
}

module.exports = { BEAT, BAR, B, SEAT, play, hit, line, phrase, PC, root, voice, bassOf, strings, trem, pizz, spic, harp, gliss, arp, mallet, swell, timp, roll, report, METER, rnd, R };
