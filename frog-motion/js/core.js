// Runtime shared by every module: canvas binding, fonts, film clock, math, easing, springs, noise, colour.
const fs = require('fs'), os = require('os'), path = require('path');
const C = require(path.join(os.homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas'));
const { faces } = require('../tools/faces');

const W = 1080, H = 1080, FPS = 60;
const BPM = 100, BEAT = 60 / BPM, BAR = BEAT * 4, BARS = 56;
const DURATION = BARS * BAR;
const FRAMES = Math.round(DURATION * FPS);

let fontsDone = false;
function fonts() {
  if (fontsDone) return;
  fontsDone = true;
  const S = '/System/Library/Fonts/Supplemental/';
  const op = faces('/System/Library/Fonts/Optima.ttc');
  C.GlobalFonts.register(op[0], 'Opt');
  C.GlobalFonts.register(op[1], 'OptB');
  C.GlobalFonts.register(op[4], 'OptX');
  const sv = faces(S + 'Seravek.ttc');
  C.GlobalFonts.register(sv[0], 'Sv');
  C.GlobalFonts.register(sv[3], 'SvM');
  C.GlobalFonts.register(sv[5], 'SvL');
  C.GlobalFonts.register(sv[7], 'SvXL');
  C.GlobalFonts.register(sv[9], 'SvB');
  const io = faces(S + 'Iowan Old Style.ttc');
  C.GlobalFonts.register(io[2], 'IoI');
  C.GlobalFonts.register(io[5], 'IoBI');
}

// ---------------------------------------------------------------- math
const TAU = Math.PI * 2;
const clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
const lerp = (a, b, t) => a + (b - a) * t;
const inv = (a, b, x) => clamp((x - a) / (b - a));
const smooth = (t) => { t = clamp(t); return t * t * (3 - 2 * t); };
const ss = (a, b, x) => smooth(inv(a, b, x));
const io3 = (t) => { t = clamp(t); return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
const io5 = (t) => { t = clamp(t); return t < .5 ? 16 * t ** 5 : 1 - Math.pow(-2 * t + 2, 5) / 2; };
const out3 = (t) => 1 - Math.pow(1 - clamp(t), 3);
const out5 = (t) => 1 - Math.pow(1 - clamp(t), 5);
const in3 = (t) => Math.pow(clamp(t), 3);
const outExpo = (t) => (t = clamp(t), t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));
const inExpo = (t) => (t = clamp(t), t <= 0 ? 0 : Math.pow(2, 10 * t - 10));
const back = (t, s = 1.7) => { t = clamp(t) - 1; return 1 + (s + 1) * t * t * t + s * t * t; };
// damped spring step response: 0 -> 1 with overshoot; k = stiffness (Hz-ish), z = damping ratio
function spring(t, k = 4, z = .45) {
  if (t <= 0) return 0;
  const w = TAU * k, wd = w * Math.sqrt(1 - z * z);
  return 1 - Math.exp(-z * w * t) * (Math.cos(wd * t) + (z * w / wd) * Math.sin(wd * t));
}
// decaying wobble kicked at t=0 (for impacts and squash): 0 at rest
const wobble = (t, f = 3, d = 4) => (t < 0 ? 0 : Math.sin(TAU * f * t) * Math.exp(-d * t));
// window: 0 -> 1 over [a, a+fi], 1 -> 0 over [b-fo, b]
const win = (x, a, b, fi = .3, fo = fi) => ss(a, a + fi, x) * (1 - ss(b - fo, b, x));
const fract = (x) => x - Math.floor(x);

function rng(seed) {
  let s = (seed >>> 0) || 1;
  return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
function hash(n) {
  let t = Math.imul((n | 0) ^ 0x2545F491, 0x9E3779B1);
  t ^= t >>> 16; t = Math.imul(t, 0x85ebca6b); t ^= t >>> 13; t = Math.imul(t, 0xc2b2ae35); t ^= t >>> 16;
  return (t >>> 0) / 4294967296;
}
const h2 = (a, b) => hash(Math.imul(a | 0, 73856093) ^ Math.imul(b | 0, 19349663));
function noise(x, s = 0) {
  const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f);
  return lerp(hash(i * 13 + s * 977), hash((i + 1) * 13 + s * 977), u) * 2 - 1;
}
function noise2(x, y, s = 0) {
  const i = Math.floor(x), j = Math.floor(y), fx = x - i, fy = y - j;
  const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy), o = s * 7919;
  return lerp(lerp(h2(i + o, j), h2(i + 1 + o, j), u), lerp(h2(i + o, j + 1), h2(i + 1 + o, j + 1), u), v) * 2 - 1;
}
const fbm = (x, s = 0) => noise(x, s) * .55 + noise(x * 2.13, s + 1) * .3 + noise(x * 4.37, s + 2) * .15;
const fbm2 = (x, y, s = 0) => noise2(x, y, s) * .55 + noise2(x * 2.1, y * 2.1, s + 1) * .3 + noise2(x * 4.3, y * 4.3, s + 2) * .15;

// ---------------------------------------------------------------- colour
const cache = new Map();
function rgb(hex) {
  if (typeof hex !== 'string') return hex;
  let v = cache.get(hex);
  if (!v) { const n = parseInt(hex.slice(1), 16); v = [(n >> 16) & 255, (n >> 8) & 255, n & 255]; cache.set(hex, v); }
  return v;
}
function rgba(c, a = 1) {
  const [r, g, b] = rgb(c);
  return `rgba(${r | 0},${g | 0},${b | 0},${clamp(a).toFixed(3)})`;
}
function mix(a, b, t) {
  const A = rgb(a), B = rgb(b);
  return [lerp(A[0], B[0], t), lerp(A[1], B[1], t), lerp(A[2], B[2], t)];
}
const shade = (c, k) => (k >= 0 ? mix(c, [255, 255, 255], k) : mix(c, [0, 0, 0], -k));
// multi-stop colour ramp: stops = [[t, colour], ...]
function ramp(stops, t) {
  if (t <= stops[0][0]) return rgb(stops[0][1]);
  for (let i = 1; i < stops.length; i++) if (t <= stops[i][0]) return mix(stops[i - 1][1], stops[i][1], inv(stops[i - 1][0], stops[i][0], t));
  return rgb(stops[stops.length - 1][1]);
}

module.exports = {
  C, W, H, FPS, BPM, BEAT, BAR, BARS, DURATION, FRAMES, fonts,
  TAU, clamp, lerp, inv, smooth, ss, io3, io5, out3, out5, in3, outExpo, inExpo, back, spring, wobble, win, fract,
  rng, hash, h2, noise, noise2, fbm, fbm2, rgb, rgba, mix, shade, ramp,
};
