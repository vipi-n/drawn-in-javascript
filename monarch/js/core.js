// Shared runtime: canvas binding, fonts, timing, math, noise, colour.
const fs = require('fs'), os = require('os'), path = require('path');

const C = require(path.join(os.homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas'));

const W = 1080, H = 1080, FPS = 30;
const BPM = 96, BEAT = 60 / BPM, BAR = BEAT * 4;
const BARS = 55;
const DURATION = BARS * BAR;
const FRAMES = Math.round(DURATION * FPS);

function ttcFaces(file) {
  const b = fs.readFileSync(file);
  if (b.toString('latin1', 0, 4) !== 'ttcf') return [b];
  const n = b.readUInt32BE(8), out = [];
  for (let k = 0; k < n; k++) {
    const off = b.readUInt32BE(12 + 4 * k), nt = b.readUInt16BE(off + 4), tabs = [];
    for (let i = 0; i < nt; i++) {
      const p = off + 12 + 16 * i;
      tabs.push({ tag: b.slice(p, p + 4), sum: b.readUInt32BE(p + 4), o: b.readUInt32BE(p + 8), l: b.readUInt32BE(p + 12) });
    }
    let size = 12 + 16 * nt;
    for (const t of tabs) size += (t.l + 3) & ~3;
    const o = Buffer.alloc(size);
    b.copy(o, 0, off, off + 12);
    let pos = 12 + 16 * nt;
    tabs.forEach((t, i) => {
      const p = 12 + 16 * i;
      t.tag.copy(o, p); o.writeUInt32BE(t.sum, p + 4); o.writeUInt32BE(pos, p + 8); o.writeUInt32BE(t.l, p + 12);
      b.copy(o, pos, t.o, t.o + t.l); pos += (t.l + 3) & ~3;
    });
    out.push(o);
  }
  return out;
}
let fontsDone = false;
function fonts() {
  if (fontsDone) return;
  fontsDone = true;
  const S = '/System/Library/Fonts/Supplemental/';
  const rw = ttcFaces(S + 'Rockwell.ttc');
  C.GlobalFonts.register(rw[0], 'Rock');
  C.GlobalFonts.register(rw[2], 'RockB');
  const bk = ttcFaces(S + 'Baskerville.ttc');
  C.GlobalFonts.register(bk[2], 'BaskI');
  C.GlobalFonts.register(bk[5], 'BaskSI');
  const av = ttcFaces('/System/Library/Fonts/Avenir Next.ttc');
  C.GlobalFonts.register(av[0], 'AvBold');
  C.GlobalFonts.register(av[2], 'AvDemi');
  C.GlobalFonts.register(av[5], 'AvMed');
  C.GlobalFonts.register(av[8], 'AvHeavy');
  C.GlobalFonts.register(fs.readFileSync(S + 'DIN Condensed Bold.ttf'), 'DIN');
  const fu = ttcFaces(S + 'Futura.ttc');
  C.GlobalFonts.register(fu[2], 'FutB');
  C.GlobalFonts.register(fu[4], 'FutCX');
}

// ---------- math ----------
const TAU = Math.PI * 2;
const clamp = (x, a = 0, b = 1) => x < a ? a : x > b ? b : x;
const lerp = (a, b, t) => a + (b - a) * t;
const inv = (a, b, x) => clamp((x - a) / (b - a));
const smooth = (t) => { t = clamp(t); return t * t * (3 - 2 * t); };
const ss = (a, b, x) => smooth(inv(a, b, x));
const ease = (t) => { t = clamp(t); return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
const easeOut = (t) => 1 - Math.pow(1 - clamp(t), 3);
const easeIn = (t) => Math.pow(clamp(t), 3);
const backOut = (t) => { t = clamp(t); const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };
const pulse = (a, b, x, f = .15) => ss(a, a + f, x) * (1 - ss(b - f, b, x));

function rng(seed) {
  let s = (seed >>> 0) || 1;
  return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
function hash(n) {
  let t = Math.imul((n | 0) ^ 0x5bd1e995, 0x27d4eb2d);
  t ^= t >>> 15; t = Math.imul(t, 0x85ebca6b); t ^= t >>> 13; t = Math.imul(t, 0xc2b2ae35); t ^= t >>> 16;
  return (t >>> 0) / 4294967296;
}
// smooth value noise
function noise1(x, s = 0) {
  const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f);
  return lerp(hash(i * 7 + s * 131), hash((i + 1) * 7 + s * 131), u) * 2 - 1;
}
function noise2(x, y, s = 0) {
  const i = Math.floor(x), j = Math.floor(y), fx = x - i, fy = y - j;
  const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
  const h = (a, b) => hash(a * 374761393 + b * 668265263 + s * 2147483);
  return lerp(lerp(h(i, j), h(i + 1, j), u), lerp(h(i, j + 1), h(i + 1, j + 1), u), v) * 2 - 1;
}
const fbm1 = (x, s = 0) => noise1(x, s) * .6 + noise1(x * 2.1, s + 1) * .3 + noise1(x * 4.3, s + 2) * .1;

// ---------- colour ----------
function rgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function rgba(c, a = 1) {
  const [r, g, b] = typeof c === 'string' ? rgb(c) : c;
  return `rgba(${r | 0},${g | 0},${b | 0},${clamp(a).toFixed(3)})`;
}
function mix(a, b, t) {
  const A = typeof a === 'string' ? rgb(a) : a, B = typeof b === 'string' ? rgb(b) : b;
  return [lerp(A[0], B[0], t), lerp(A[1], B[1], t), lerp(A[2], B[2], t)];
}
// desaturate toward sepia (k=1 fully sepia)
function sepia(c, k) {
  const A = typeof c === 'string' ? rgb(c) : c, l = A[0] * .3 + A[1] * .59 + A[2] * .11;
  return mix(A, [l * 1.07 + 10, l * .95 + 4, l * .78], k);
}

const PAL = {
  night: '#0d1226', ink: '#24140e', cream: '#fff4dc', paper: '#f6ecd6', white: '#fffaf0',
  bp: '#0f2346', bpDeep: '#081530', bpLine: '#2c5590', cyan: '#8fe3ff', gold: '#ffc23d', red: '#e5483a', blue: '#6d9cf0',
  // monarch
  orange: '#f28a1d', orangeDeep: '#d9601a', orangeLight: '#ffb347', wingBlack: '#1a1210', spot: '#fffaf0',
  under: '#e9b25c', underLight: '#f5d08a', body: '#1d1614',
  // larva + pupa
  larvaYellow: '#ffd23a', larvaWhite: '#fbfaf2', larvaBlack: '#141210',
  jade: '#5fc98a', jadeDeep: '#2f9b62', jadeLight: '#b4f0c4', goldDot: '#ffd34a',
  // plants
  leaf: '#6fae4a', leafDeep: '#3f7f34', leafLight: '#a9d77a', leafUnder: '#9cc489', stem: '#7aa457',
  milkPink: '#e98bb0', milkPinkDeep: '#b9527f', milkPinkLight: '#ffc6dc',
  // skies + lands
  dawnTop: '#2c3a78', dawnMid: '#9a6aae', dawnLow: '#ffa77f', dawnSun: '#ffd27a', dayTop: '#5aa9e6', dayLow: '#cfeefa',
  hillFar: '#9fb6d6', hillMid: '#8cc178', hillNear: '#5f9f4c', grass: '#7cbb50', grassDark: '#4b8a3a',
  autumn1: '#e8742a', autumn2: '#f2b13a', autumn3: '#c4432b', fir: '#2f5a4a', firDeep: '#1c3a33', mist: '#d9e6f2',
  sea: '#16466e', seaDeep: '#0b2a48', land: '#e8d9b0', landGreen: '#b9d08f',
};

module.exports = {
  C, W, H, FPS, BPM, BEAT, BAR, BARS, DURATION, FRAMES, fonts,
  TAU, clamp, lerp, inv, smooth, ss, ease, easeOut, easeIn, backOut, pulse,
  rng, hash, noise1, noise2, fbm1, rgb, rgba, mix, sepia, PAL,
};
