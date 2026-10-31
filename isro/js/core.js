// Shared runtime: canvas binding, fonts, timing, math + noise.
const fs = require('fs'), os = require('os'), path = require('path');

const C = require(path.join(os.homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas'));

const W = 1920, H = 1080, FPS = 60;
const BPM = 90, BEAT = 60 / BPM, BAR = BEAT * 4;
const BARS = 74, TAIL = 3.0;
const DURATION = BARS * BAR + TAIL;
const FRAMES = Math.round(DURATION * FPS);
const bar = (b) => b * BAR;

// TTC collections register only their first face, so split them into single fonts.
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
  const av = ttcFaces('/System/Library/Fonts/Avenir Next.ttc');
  C.GlobalFonts.register(av[10], 'AvUL');
  C.GlobalFonts.register(av[7], 'AvReg');
  C.GlobalFonts.register(av[5], 'AvMed');
  C.GlobalFonts.register(av[2], 'AvDemi');
  const ko = ttcFaces('/System/Library/Fonts/Kohinoor.ttc');
  C.GlobalFonts.register(ko[4], 'KohL');
  C.GlobalFonts.register(ko[2], 'KohB');
  const di = ttcFaces('/System/Library/Fonts/Supplemental/Didot.ttc');
  C.GlobalFonts.register(di[1], 'DidotI');
  C.GlobalFonts.register(di[0], 'Didot');
  C.GlobalFonts.register(ttcFaces('/System/Library/Fonts/Menlo.ttc')[0], 'Mono');
}

// ---------- math ----------
const clamp = (x, a = 0, b = 1) => x < a ? a : x > b ? b : x;
const lerp = (a, b, t) => a + (b - a) * t;
const inv = (a, b, x) => clamp((x - a) / (b - a));
const smooth = (t) => { t = clamp(t); return t * t * (3 - 2 * t); };
const ss = (a, b, x) => smooth(inv(a, b, x));
const easeOut = (t) => 1 - Math.pow(1 - clamp(t), 3);
const easeIn = (t) => Math.pow(clamp(t), 3);
const easeInOut = (t) => { t = clamp(t); return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
const expo = (t) => t <= 0 ? 0 : t >= 1 ? 1 : 1 - Math.pow(2, -10 * t);
const fade = (t, a, b, c, d) => Math.min(inv(a, b, t), 1 - inv(c, d, t));

function hash(n) { n = Math.sin(n * 127.1 + 311.7) * 43758.5453123; return n - Math.floor(n); }
function hash2(x, y) { const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123; return n - Math.floor(n); }
function rng(seed) {
  let s = (seed * 2654435761) >>> 0 || 1;
  return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
}

// value noise (fast, smooth)
const PERM = new Uint8Array(512), GR = new Float32Array(256);
{ const r = rng(1963); const p = [...Array(256).keys()];
  for (let i = 255; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [p[i], p[j]] = [p[j], p[i]]; }
  for (let i = 0; i < 512; i++) PERM[i] = p[i & 255];
  for (let i = 0; i < 256; i++) GR[i] = r() * 2 - 1; }
function noise2(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const X = xi & 255, Y = yi & 255;
  const a = GR[PERM[PERM[X] + Y]], b = GR[PERM[PERM[X + 1] + Y]], c = GR[PERM[PERM[X] + Y + 1]], d = GR[PERM[PERM[X + 1] + Y + 1]];
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function noise3(x, y, z) {
  const zi = Math.floor(z), zf = z - zi, w = zf * zf * (3 - 2 * zf);
  const a = noise2(x + zi * 31.7, y + zi * 17.3), b = noise2(x + (zi + 1) * 31.7, y + (zi + 1) * 17.3);
  return a + (b - a) * w;
}
function fbm2(x, y, oct = 5, lac = 2, gain = .5) {
  let s = 0, a = 1, n = 0;
  for (let i = 0; i < oct; i++) { s += a * noise2(x, y); n += a; x = x * lac + 5.2; y = y * lac + 1.3; a *= gain; }
  return s / n;
}
function fbm3(x, y, z, oct = 5) {
  let s = 0, a = 1, n = 0;
  for (let i = 0; i < oct; i++) { s += a * noise3(x, y, z); n += a; x = x * 2 + 5.2; y = y * 2 + 1.3; z = z * 2 + 7.1; a *= .5; }
  return s / n;
}

module.exports = {
  C, W, H, FPS, BPM, BEAT, BAR, BARS, TAIL, DURATION, FRAMES, bar, fonts, ttcFaces,
  clamp, lerp, inv, smooth, ss, easeOut, easeIn, easeInOut, expo, fade, hash, hash2, rng, noise2, noise3, fbm2, fbm3,
};
