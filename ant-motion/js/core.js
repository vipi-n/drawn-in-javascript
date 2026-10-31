// Shared runtime: canvas binding, fonts, math, easing, noise, colour.
const os = require('os'), path = require('path');
const C = require(path.join(os.homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas'));
const cues = require('./cues');

const W = +(process.env.CW || 1080), H = +(process.env.CH || 1920), FPS = +(process.env.CFPS || 30);
const DURATION = cues.DURATION, FRAMES = Math.round(DURATION * FPS);
const S = W / 1080; // every shot is authored in a 1080 x 1920 space

let fontsDone = false;
function fonts() {
  if (fontsDone) return; fontsDone = true;
  const F = '/System/Library/Fonts/', sup = F + 'Supplemental/';
  const { faces } = require('./faces');
  const reg = (file, idx, name) => { try { const b = faces(file); C.GlobalFonts.register(b[Math.min(idx, b.length - 1)], name); } catch (e) { console.error('font', name, e.message); } };
  const AVC = F + 'Avenir Next Condensed.ttc';
  reg(AVC, 8, 'CondH'); reg(AVC, 0, 'CondB'); reg(AVC, 2, 'CondD'); reg(AVC, 5, 'CondM'); reg(AVC, 6, 'CondMI'); reg(AVC, 10, 'CondL');
  reg(sup + 'Futura.ttc', 4, 'FutX'); reg(sup + 'Futura.ttc', 0, 'Fut');
  reg(F + 'SFNSMono.ttf', 0, 'Mono');
}

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
const in3 = (t) => clamp(t) ** 3;
const outExpo = (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * clamp(t)));
const back = (t, s = 1.70158) => { t = clamp(t) - 1; return t * t * ((s + 1) * t + s) + 1; };
// window: 0 -> 1 over [a,b], hold, 1 -> 0 over [c,d]
const win = (a, b, c, d, x) => ss(a, b, x) * (1 - ss(c, d, x));
const fract = (x) => x - Math.floor(x);

function rngSeed(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const hash = (n) => { n = Math.imul((n | 0) ^ 0x9e3779b9, 0x85ebca6b); n ^= n >>> 13; n = Math.imul(n, 0xc2b2ae35); n ^= n >>> 16; return (n >>> 0) / 4294967296; };
const h2 = (x, y) => hash(Math.imul(x | 0, 73856093) ^ Math.imul(y | 0, 19349663));
const noise = (x) => { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return lerp(hash(i), hash(i + 1), u) * 2 - 1; };
const noise2 = (x, y) => {
  const i = Math.floor(x), j = Math.floor(y), fx = x - i, fy = y - j, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
  return lerp(lerp(h2(i, j), h2(i + 1, j), u), lerp(h2(i, j + 1), h2(i + 1, j + 1), u), v) * 2 - 1;
};
const fbm = (x, o = 4) => { let s = 0, a = .5, f = 1; for (let i = 0; i < o; i++) { s += a * noise(x * f + i * 17.3); a *= .5; f *= 2; } return s; };
const fbm2 = (x, y, o = 4) => { let s = 0, a = .5, f = 1; for (let i = 0; i < o; i++) { s += a * noise2(x * f + i * 17.3, y * f - i * 9.1); a *= .5; f *= 2; } return s; };

const cache = new Map();
function rgb(c) {
  if (typeof c !== 'string') return c;
  let v = cache.get(c);
  if (!v) { let h = c.slice(1); if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]; const n = parseInt(h, 16); v = [(n >> 16) & 255, (n >> 8) & 255, n & 255]; cache.set(c, v); }
  return v;
}
const rgba = (c, a = 1) => { const [r, g, b] = rgb(c); return `rgba(${r | 0},${g | 0},${b | 0},${clamp(a).toFixed(3)})`; };
const mix = (a, b, t) => { const A = rgb(a), B = rgb(b); return [lerp(A[0], B[0], t), lerp(A[1], B[1], t), lerp(A[2], B[2], t)]; };
const mixs = (a, b, t) => rgba(mix(a, b, t), 1);
const shade = (c, k) => (k >= 0 ? mix(c, [255, 255, 255], k) : mix(c, [0, 0, 0], -k));
function ramp(stops, t) {
  if (t <= stops[0][0]) return rgb(stops[0][1]);
  for (let i = 1; i < stops.length; i++) if (t <= stops[i][0]) return mix(stops[i - 1][1], stops[i][1], inv(stops[i - 1][0], stops[i][0], t));
  return rgb(stops[stops.length - 1][1]);
}

module.exports = { C, W, H, FPS, S, DURATION, FRAMES, fonts, cues, TAU, clamp, lerp, inv, smooth, ss, io3, io5, out3, out5, in3, outExpo, back, win, fract, rng: rngSeed, hash, h2, noise, noise2, fbm, fbm2, rgb, rgba, mix, mixs, shade, ramp };
