// The orchestra on top of the VSCO sampler: seating (pan + hall send + trim), humanised timing, legato lines,
// chord voicing with voice leading, harp gestures, mallets and percussion. Every note is metered per instrument
// and per scene. (helpers adapted from the frog film's orch.js; harmony tables rewritten for this score's keys)
const S = require('./sampler');
const { out, R, rnd, clamp, SR, SVF } = require('./mix');
const { BEAT, BAR, B, SCENES } = require('../cues');

// [pan, hall send, trim dB]
const SEAT = {
  vlnSus: [-.42, .34, -1], vlaSus: [.12, .34, -2], vcSus: [.34, .3, -1], cbSus: [.5, .26, 0],
  vlnTrem: [-.42, .34, -3], vcTrem: [.34, .3, -2],
  vlnPizz: [-.42, .3, 1], vlaPizz: [.12, .3, 1], vcPizz: [.34, .26, 2], cbPizz: [.5, .24, 3],
  vlnSpic: [-.42, .28, -1], vlaSpic: [.12, .28, -1], vcSpic: [.34, .26, 0],
  harp: [-.3, .36, 1], fluteSus: [-.08, .32, -4], fluteStac: [-.08, .3, -2], oboe: [.06, .3, -4], clarSus: [-.18, .3, -4], clarStac: [-.18, .26, -3],
  bsnSus: [.2, .28, -5], bsnStac: [.2, .24, -4], horn: [-.22, .46, -4.5], hornMute: [-.22, .42, -4],
  glock: [.28, .4, -7], marimba: [-.2, .3, -1], xylo: [.24, .3, -8], piano: [.04, .34, -3],
  timp: [0, .42, -1], timpRoll: [0, .44, -3], shaker: [.42, .2, -9], bdrum: [0, .36, -3], bdRub: [0, .36, -1], bellTree: [.34, .42, -9],
  claves: [.3, .22, -12], conga: [-.3, .22, -4], quinto: [-.38, .22, -4], tumba: [-.2, .24, -3], logHi: [.26, .24, -4], logLo: [.16, .24, -3],
  guiroFast: [.4, .2, -7], guiroHit: [.4, .2, -6], guiroM: [.4, .2, -6], guiroSlow: [.4, .2, -7], tambHit: [.4, .24, -9], tambShake: [.4, .24, -10],
  triangle: [.4, .4, -12], sleigh: [.36, .3, -13], crash: [.08, .42, -7], cymHit: [-.08, .44, -6], gong: [0, .48, -6],
  swellLong: [0, .46, -5], swellMed: [0, .46, -5], swellShort: [0, .46, -5],
};
const METER = {}, LOG = [];
const dB = (x) => Math.pow(10, x / 20);
const sceneOf = (t) => { for (let i = SCENES.length - 1; i >= 0; i--) if (t >= SCENES[i][1]) return i; return 0; };

// one note. o: {pan, rev, gain(dB), jit, atk, rel, dyn, loop, start, stop, flat, ratio, bend, hp, lp, bus, spread}
function play(key, midi, t, dur, vel, o = {}) {
  const st = SEAT[key] ?? [0, .3, 0], jit = o.jit ?? .006;
  const t0 = Math.max(0, t + (jit ? R(-jit, jit) : 0)), v = clamp(vel * (o.hv === false ? 1 : R(.94, 1.05)));
  const put0 = out((o.pan ?? st[0]) + (o.spread ? R(-o.spread, o.spread) : 0), dB(st[2] + (o.gain ?? 0)), o.rev ?? st[1], o.bus ?? 'mus');
  const m = (METER[key] = METER[key] ?? { n: 0, e: 0, sc: new Float64Array(SCENES.length) });
  m.n++;
  if (midi !== null) LOG.push([key, midi, t0, dur, v]);
  const tg = dB(st[2] + (o.gain ?? 0)) ** 2;
  let put = (i, l, r) => { const e = (l * l + r * r) * tg; m.e += e; m.sc[sceneOf(i / SR)] += e; put0(i, l, r); };
  if (o.hp || o.lp) { // per-note filters (sul-pont brightness, muffling)
    const f = [o.hp && [new SVF(o.hp, .7), new SVF(o.hp, .7)], o.lp && [new SVF(o.lp, .7), new SVF(o.lp, .7)]], p1 = put;
    put = (i, l, r) => { if (f[0]) { f[0][0].tick(l); f[0][1].tick(r); l = f[0][0].hp; r = f[0][1].hp; } if (f[1]) { l = f[1][0].tick(l); r = f[1][1].tick(r); } p1(i, l, r); };
  }
  return S.note(put, key, midi, t0, dur, v, { atk: o.atk, atkCurve: o.atkCurve, rel: o.rel, dyn: o.dyn, loop: o.loop, start: o.start, stop: o.stop, flat: o.flat, ratio: o.ratio, bend: o.bend });
}
const hit = (key, t, vel = .8, o = {}) => play(key, null, t, o.dur ?? 3, vel, { rel: o.rel ?? .6, ...o });

// ---------------------------------------------------------------- legato lines: [[t, midi, dur, vel]]
// sustained samples cross-faded note to note; the first note of a phrase gets a fuller attack
function line(key, notes, o = {}) {
  notes.forEach(([t, m, d, v = .7], i) => {
    const next = notes[i + 1], legato = next && next[0] - (t + d) < .05;
    play(key, m + (o.oct ?? 0), t, d + (legato ? (o.over ?? .1) : 0), v * (o.vel ?? 1), {
      atk: i && notes[i - 1][0] + notes[i - 1][2] > t - .05 ? (o.atkL ?? .06) : (o.atk ?? .04), rel: legato ? (o.relL ?? .12) : (o.rel ?? .35), dyn: o.dyn, gain: o.gain, pan: o.pan, rev: o.rev,
      start: i && notes[i - 1][0] + notes[i - 1][2] > t - .05 ? (o.skip ?? .06) : 0, jit: o.jit ?? .004, hp: o.hp, lp: o.lp, bus: o.bus,
    });
  });
}
// phrase in beats -> absolute line: P = [[beat, midi, durBeats, vel]], sc = time scale (augmentation)
const phrase = (P, t0, tr = 0, v = 1, sc = 1) => P.map(([b, m, d, vv = 1]) => [t0 + b * BEAT * sc, m + tr, d * BEAT * sc, v * vv]);

// ---------------------------------------------------------------- harmony (pitch classes; slash chords list the bass first)
const PC = {
  D: [2, 6, 9], Dm: [2, 5, 9], D5: [2, 9], Dsus2: [2, 4, 9], Dadd9: [2, 6, 9, 4], Dmaj7: [2, 6, 9, 1], Dmaj9: [2, 6, 9, 1, 4], D6: [2, 6, 9, 11],
  Dm9: [2, 5, 9, 0, 4], Dmadd9: [2, 5, 9, 4], 'D/A': [9, 2, 6], 'D/F#': [6, 9, 2], 'Dm/F': [5, 9, 2], 'Dm/A': [9, 2, 5],
  G: [7, 11, 2], Gmaj7: [7, 11, 2, 6], Gmaj9: [7, 11, 2, 6, 9], Gadd9: [7, 11, 2, 9], 'G/B': [11, 2, 7], 'G/D': [2, 7, 11], 'Gmaj7/D': [2, 7, 11, 6],
  Gm: [7, 10, 2], Gm7: [7, 10, 2, 5], Gm9: [7, 10, 2, 5, 9], 'Gm/D': [2, 7, 10], 'Gm/Bb': [10, 2, 7], Gm6: [7, 10, 2, 4],
  Em: [4, 7, 11], Em7: [4, 7, 11, 2], Em9: [4, 7, 11, 2, 6], 'Em7/G': [7, 11, 2, 4],
  A: [9, 1, 4], A7: [9, 1, 4, 7], Asus: [9, 2, 4], A7sus: [9, 2, 4, 7], Aadd9: [9, 1, 4, 11], A9sus: [9, 2, 4, 7, 11], 'A/C#': [1, 4, 9], A7b9: [9, 1, 4, 7, 10],
  'A/D': [2, 9, 1, 4], 'A7/C#': [1, 4, 7, 9], 'A7/G': [7, 9, 1, 4], A13: [9, 1, 4, 7, 6],
  Bm: [11, 2, 6], Bm7: [11, 2, 6, 9], Bm9: [11, 2, 6, 9, 1], Bmadd9: [11, 2, 6, 1], 'Bm/D': [2, 6, 11],
  Bb: [10, 2, 5], Bbmaj7: [10, 2, 5, 9], Bbadd9: [10, 2, 5, 0], 'Bb/D': [2, 5, 10], Bbmaj9: [10, 2, 5, 9, 0], 'Bbmaj7#11': [10, 2, 5, 9, 4],
  C: [0, 4, 7], Cmaj7: [0, 4, 7, 11], Cadd9: [0, 4, 7, 2], 'C/D': [2, 0, 4, 7], 'C/E': [4, 7, 0], 'Cmaj7/D': [2, 0, 4, 7, 11],
  F: [5, 9, 0], Fmaj7: [5, 9, 0, 4], 'F/A': [9, 0, 5], 'F/C': [0, 5, 9], Fadd9: [5, 9, 0, 7],
  Eb: [3, 7, 10], 'Eb/D': [2, 3, 7, 10], Ebmaj7: [3, 7, 10, 2], 'Ebmaj7/D': [2, 3, 7, 10],
  'F#m': [6, 9, 1], 'F#m7': [6, 9, 1, 4], 'F#': [6, 10, 1], 'F#7': [6, 10, 1, 4], 'F#sus': [6, 11, 1], 'Bmadd9/D': [2, 6, 11, 1], 'Edim/D': [2, 4, 7, 10], 'C#dim7': [1, 4, 7, 10],
};
const root = (c) => PC[c][0];
// voice a chord inside [lo, hi] with n voices, moving as little as possible from prev
function voice(c, lo, hi, n = 4, prev = null) {
  const pcs = PC[c];
  if (!pcs) throw new Error('chord ' + c);
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
  v.sort((a, b) => a - b);
  const ok = (k) => pcs.includes(((k % 12) + 12) % 12) && !v.includes(k);
  for (let pass = 0; pass < 3; pass++) {
    v.sort((a, b) => a - b);
    for (let i = v.length - 1; i > 0; i--) {
      if (v[i] - v[i - 1] !== 1) continue;
      let k = v[i - 1] - 1; while (k >= lo - 5 && !ok(k)) k--;
      if (k >= lo - 5) { v[i - 1] = k; continue; }
      k = v[i] + 1; while (k <= hi + 5 && !ok(k)) k++;
      if (k <= hi + 5) v[i] = k;
    }
  }
  return v.sort((a, b) => a - b);
}
// bass note of chord c (slash chords list their bass first) at or above lo
const bassOf = (c, lo = 34) => { let m = lo; while (m % 12 !== root(c)) m++; return m; };

// string section chord: notes split across cb / vc / vla / vln by register
function strings(notes, t, dur, vel = .6, o = {}) {
  const sorted = notes.slice().sort((a, b) => a - b);
  sorted.forEach((m, i) => {
    const key = m < 40 ? 'cbSus' : m < 55 ? 'vcSus' : m < 65 ? 'vlaSus' : 'vlnSus';
    play(key, m, t + i * (o.roll ?? 0), dur, vel * (o.top && i === sorted.length - 1 ? 1.12 : 1), { atk: o.atk ?? .35, rel: o.rel ?? .7, dyn: o.dyn, gain: o.gain, start: o.start, hp: o.hp, lp: o.lp, atkCurve: o.atkCurve });
    if (o.cb && i === 0 && m >= 40 && m - 12 >= 26) play('cbSus', m - 12, t, dur, vel * .8, { atk: o.atk ?? .35, rel: o.rel ?? .7, dyn: o.dyn, gain: o.gain });
  });
}
const TREM = (m) => (m < 55 ? 'vcTrem' : 'vlnTrem');
function trem(notes, t, dur, vel = .5, o = {}) { for (const m of notes) play(o.key ?? TREM(m), m, t, dur, vel, { atk: o.atk ?? .3, rel: o.rel ?? .5, dyn: o.dyn, gain: o.gain, hp: o.hp, lp: o.lp, bend: o.bend, pan: o.pan }); }
const PZ = (m) => (m < 41 ? 'cbPizz' : m < 50 ? 'vcPizz' : m < 57 ? 'vlaPizz' : 'vlnPizz');
function pizz(m, t, vel = .7, o = {}) { return play(o.key ?? PZ(m), m, t, o.dur ?? .4, vel, { rel: o.rel ?? .35, jit: o.jit ?? .008, gain: o.gain, pan: o.pan, lp: o.lp }); }
const SP = (m) => (m < 50 ? 'vcSpic' : m < 60 ? 'vlaSpic' : 'vlnSpic');
function spic(m, t, vel = .7, o = {}) { return play(o.key ?? SP(m), m, t, o.dur ?? .22, vel, { rel: o.rel ?? .1, jit: o.jit ?? .006, gain: o.gain, pan: o.pan }); }

// harp: plucks, broken chords, glissandi through a scale
function harp(m, t, vel = .7, o = {}) { return play('harp', m, t, o.dur ?? 2.5, vel, { rel: o.rel ?? 1.2, jit: o.jit ?? .004, gain: o.gain, pan: o.pan, lp: o.lp }); }
const SCALE = { D: [2, 4, 6, 7, 9, 11, 1], Dm: [2, 4, 5, 7, 9, 10, 0], Dmh: [2, 4, 5, 7, 9, 10, 1], Dpent: [2, 4, 6, 9, 11], Glyd: [7, 9, 11, 1, 2, 4, 6], Bbmaj: [10, 0, 2, 3, 5, 7, 9] };
function gliss(t, dur, m0, m1, vel = .6, o = {}) {
  const sc = SCALE[o.scale ?? 'D'], notes = [];
  const dir = m1 >= m0 ? 1 : -1;
  for (let m = m0; dir > 0 ? m <= m1 : m >= m1; m += dir) if (sc.includes(((m % 12) + 12) % 12)) notes.push(m);
  notes.forEach((m, i) => { const u = i / Math.max(1, notes.length - 1); harp(m, t + dur * Math.pow(u, o.curve ?? 1), vel * (o.cresc ? .5 + .5 * u : o.dim ? 1 - .5 * u : 1), { dur: o.dur ?? 1.6, rel: o.rel ?? .9, gain: o.gain, jit: .002, pan: o.pan }); });
  return notes.length;
}
function arp(notes, t, step, vel = .6, o = {}) { notes.forEach((m, i) => (o.key ? play(o.key, m, t + i * step, o.dur ?? 2, vel * (o.decay ? Math.pow(o.decay, i) : 1), { rel: o.rel ?? .8, gain: o.gain, pan: o.pan }) : harp(m, t + i * step, vel * (o.decay ? Math.pow(o.decay, i) : 1), { gain: o.gain, dur: o.dur, pan: o.pan }))); }
const mallet = (key, m, t, vel = .6, o = {}) => play(key, m, t, o.dur ?? 2, vel, { rel: o.rel ?? .8, jit: o.jit ?? .004, gain: o.gain, pan: o.pan, rev: o.rev, lp: o.lp });

// horn section: each line doubled by a second player (detuned a few cents, a hair late, seated beside)
function horns(notes, t, dur, vel = .6, o = {}) {
  for (const m of notes) {
    play(o.key ?? 'horn', m, t, dur, vel, { atk: o.atk ?? .12, rel: o.rel ?? .6, dyn: o.dyn, gain: o.gain, pan: (o.pan ?? -.22) - .06 });
    if (o.solo) continue;
    play(o.key ?? 'horn', m + .07, t + .018, dur, vel * .9, { atk: (o.atk ?? .12) * 1.2, rel: o.rel ?? .6, dyn: o.dyn, gain: (o.gain ?? 0) - 3, pan: (o.pan ?? -.22) + .08 });
  }
}
// horn melody (legato) with a doubling player
function hornLine(notes, o = {}) {
  line(o.key ?? 'horn', notes, { ...o, pan: (o.pan ?? -.22) - .05 });
  if (!o.solo) line(o.key ?? 'horn', notes.map(([t, m, d, v]) => [t + .02, m + .06, d, v * .9]), { ...o, gain: (o.gain ?? 0) - 3.5, pan: (o.pan ?? -.22) + .09 });
}

// ---------------------------------------------------------------- percussion helpers
// suspended-cymbal crescendo whose loudest moment lands on tPeak (skips into the sample if needed)
function swell(key, tPeak, vel = .7, o = {}) {
  const pk = S.peakTime(key); let t = tPeak - pk, start = 0;
  if (t < .02) { start = .02 - t; t = .02; }
  return play(key, null, t, pk - start + (o.tail ?? .4), vel, { rel: o.rel ?? .5, gain: o.gain, jit: 0, flat: true, start, atk: start ? .3 : .004 });
}
function timp(m, t, vel = .7, o = {}) { return play('timp', m, t, o.dur ?? 2.5, vel, { rel: o.rel ?? 1, gain: o.gain, jit: .003 }); }
function roll(m, t, dur, vel = .6, o = {}) { return play('timpRoll', m, t, dur, vel, { atk: o.atk ?? .4, rel: o.rel ?? .5, dyn: o.dyn, gain: o.gain }); }

function report() {
  const rows = Object.entries(METER).map(([k, m]) => [k, m.n, 10 * Math.log10(m.e + 1e-12)]).sort((a, b) => b[2] - a[2]);
  const sec = SCENES.map(([name], si) => {
    const e = Object.entries(METER).map(([k, m]) => [k, 10 * Math.log10(m.sc[si] + 1e-12)]).filter((r) => r[1] > -60).sort((p, q) => q[1] - p[1]);
    return `${name.padEnd(12)} ` + e.slice(0, 8).map(([k, v]) => `${k} ${(v - e[0][1]).toFixed(0)}`).join(' | ');
  });
  return rows.map(([k, n, e]) => `${k.padEnd(11)} ${String(n).padStart(4)} notes  ${e.toFixed(1).padStart(6)} dB`).join('\n') + '\n' + sec.join('\n');
}

// score lint: sustained notes sounding together a semitone (or minor ninth) apart, longer than `minOv` seconds
function lint(minOv = .3, from = 0, to = 1e9) {
  const S = LOG.filter(([k, m, t, d, v]) => d >= .3 && v > .12 && !/Pizz|Spic|Stac|harp|glock|marimba|xylo|piano|timp/.test(k) && t < to && t + d > from).sort((a, b) => a[2] - b[2]), out = [];
  for (let i = 0; i < S.length; i++) for (let j = i + 1; j < S.length && S[j][2] < S[i][2] + S[i][3]; j++) {
    const [ka, ma, ta, da] = S[i], [kb, mb, tb, db] = S[j], ov = Math.min(ta + da, tb + db) - Math.max(ta, tb), iv = Math.abs(Math.round(ma) - Math.round(mb));
    if (ov >= minOv && (iv === 1 || iv === 13)) out.push(`${Math.max(ta, tb).toFixed(2)}s ${ka}:${Math.round(ma)} x ${kb}:${Math.round(mb)} (${ov.toFixed(2)}s)`);
  }
  return out;
}
module.exports = { lint, LOG, BEAT, BAR, B, SEAT, play, hit, line, phrase, PC, root, voice, bassOf, strings, trem, pizz, spic, harp, gliss, arp, mallet, horns, hornLine, swell, timp, roll, report, METER, rnd, R, SCALE };
