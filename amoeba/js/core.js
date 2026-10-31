// Shared runtime: canvas binding, fonts, timing, math, noise, colour.
const fs = require('fs'), os = require('os'), path = require('path');

const C = require(path.join(os.homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas'));

const W = 1080, H = 1080, FPS = 24;
const BPM = 96, BEAT = 60 / BPM, BAR = BEAT * 4;
const BARS = 27;
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
  const di = ttcFaces('/System/Library/Fonts/Supplemental/Didot.ttc');
  C.GlobalFonts.register(di[0], 'Didot');
  C.GlobalFonts.register(di[1], 'DidotI');
  const av = ttcFaces('/System/Library/Fonts/Avenir Next.ttc');
  C.GlobalFonts.register(av[5], 'AvMed');
  C.GlobalFonts.register(av[7], 'AvReg');
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
  night: '#130f17', ink: '#1d1620', blue: '#6d8ff0', blueDim: '#3e5199', gold: '#f2b84b', cream: '#f6ead0',
  red: '#e0412f', paper: '#f1e6cc',
  body: '#f2b39a', bodyDeep: '#e48f78', rim: '#fbe3cf', edge: '#a34a3c', gran: '#c4675a',
  nucleus: '#7b3f78', nucLight: '#b86aa3', vac: '#7fd0ef', vacDeep: '#3d9fcf',
  aqua: '#a9e2d3', aquaDeep: '#5fb3ad', aquaDark: '#2f7f86',
  leaf: '#5d9a49', leafDark: '#2f6a3b', lime: '#b7d86b', moss: '#7fae4f',
  ochre: '#d99a3e', terra: '#c9673d', mud: '#9b6b45', mudDark: '#4a2f22', sand: '#e9cf9c',
  sky: '#bfdcec', skyTop: '#8fc0e2', peach: '#f6c9a4', pink: '#f0a2b5', lilac: '#a98fd6', navy: '#1d2350',
};

module.exports = {
  C, W, H, FPS, BPM, BEAT, BAR, BARS, DURATION, FRAMES, fonts,
  TAU, clamp, lerp, inv, smooth, ss, ease, easeOut, easeIn, backOut, pulse,
  rng, hash, noise1, noise2, fbm1, rgb, rgba, mix, sepia, PAL,
};
