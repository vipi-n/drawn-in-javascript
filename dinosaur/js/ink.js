// Hand-drawn rendering toolkit: wobbly pen lines, crayon hatching, paper grain, "boiling" jitter.
const W = 1080, H = 1080, GROUND = 850, FPS = 24, DURATION = 47.5;

const C = {
  paper: '#f3efe2', ink: '#2a3680', yellow: '#f5bd3c', gold: '#f0a531', orange: '#ec782b',
  deep: '#e8612a', teal: '#2e9a86', green: '#3e9a42', lime: '#7cc24c', pink: '#ee9aa2',
  rose: '#e47a86', red: '#df3a2e', brown: '#8a5a3b', tan: '#c99a60', grey: '#9d9a94',
  dark: '#555350', black: '#1f1e1d', cream: '#fbf1cf', white: '#fffdf6', blue: '#3b5bb5', sky: '#8fb3e0'
};

let ctx = null;
let BOIL = 0, CALL = 0;
let PEN = 1;

function setCtx(c) { ctx = c; }
function beginFrame(frame) { BOIL = Math.floor(frame / 2); CALL = 0; }

// ---------- math ----------
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const inv = (a, b, v) => clamp((v - a) / (b - a));
const ease = t => (t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const easeOut = t => 1 - Math.pow(1 - t, 3);
const easeIn = t => t * t * t;
const backOut = t => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };
const tri = t => 1 - Math.abs(((t % 1) + 1) % 1 * 2 - 1);
const TAU = Math.PI * 2;

// ---------- rng ----------
let _s = 1;
function seed(n) { _s = (Math.imul(n | 0, 2654435761) ^ 0x9e3779b9) >>> 0 || 1; }
function rand() {
  _s = (_s + 0x6D2B79F5) >>> 0; let t = _s;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const rr = (a, b) => a + (b - a) * rand();
function nextSeed() { seed(BOIL * 7919 + (++CALL) * 104729); }
// stable random for layout (does not boil, does not disturb the rng stream)
function hash(n) {
  let t = Math.imul((n | 0) ^ 0x5bd1e995, 0x27d4eb2d);
  t ^= t >>> 15; t = Math.imul(t, 0x85ebca6b); t ^= t >>> 13; t = Math.imul(t, 0xc2b2ae35); t ^= t >>> 16;
  return (t >>> 0) / 4294967296;
}

// ---------- path parsing (SVG subset: M L H V C S Q Z, abs + rel) ----------
const _paths = new Map();
function parsePath(d) {
  let hit = _paths.get(d); if (hit) return hit;
  const toks = d.match(/[a-zA-Z]|-?\d*\.?\d+(?:e[-+]?\d+)?/g) || [];
  const subs = []; let cur = null;
  let x = 0, y = 0, sx = 0, sy = 0, cmd = '', prev = '', lcx = 0, lcy = 0, i = 0;
  const num = () => parseFloat(toks[i++]);
  const start = (nx, ny) => { cur = { p: [nx, ny], c: false }; subs.push(cur); };
  const lineTo = (nx, ny) => {
    if (!cur) start(x, y);
    const L = Math.hypot(nx - x, ny - y), n = Math.max(1, Math.ceil(L / 9));
    for (let k = 1; k <= n; k++) cur.p.push(x + (nx - x) * k / n, y + (ny - y) * k / n);
  };
  const cubic = (x1, y1, x2, y2, x3, y3) => {
    if (!cur) start(x, y);
    const len = Math.hypot(x1 - x, y1 - y) + Math.hypot(x2 - x1, y2 - y1) + Math.hypot(x3 - x2, y3 - y2);
    const n = Math.max(3, Math.ceil(len / 7));
    for (let k = 1; k <= n; k++) {
      const t = k / n, u = 1 - t;
      cur.p.push(u * u * u * x + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t * x3,
        u * u * u * y + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * y3);
    }
  };
  while (i < toks.length) {
    if (/[a-zA-Z]/.test(toks[i])) {
      cmd = toks[i++];
      if (cmd === 'z' || cmd === 'Z') { if (cur) { cur.c = true; cur = null; } x = sx; y = sy; prev = cmd; continue; }
    }
    const rel = cmd === cmd.toLowerCase(), ox = rel ? x : 0, oy = rel ? y : 0;
    switch (cmd.toUpperCase()) {
      case 'M': x = ox + num(); y = oy + num(); sx = x; sy = y; start(x, y); cmd = rel ? 'l' : 'L'; break;
      case 'L': { const nx = ox + num(), ny = oy + num(); lineTo(nx, ny); x = nx; y = ny; break; }
      case 'H': { const nx = ox + num(); lineTo(nx, y); x = nx; break; }
      case 'V': { const ny = oy + num(); lineTo(x, ny); y = ny; break; }
      case 'C': {
        const x1 = ox + num(), y1 = oy + num(), x2 = ox + num(), y2 = oy + num(), x3 = ox + num(), y3 = oy + num();
        cubic(x1, y1, x2, y2, x3, y3); lcx = x2; lcy = y2; x = x3; y = y3; break;
      }
      case 'S': {
        let x1 = x, y1 = y; if (/[CcSs]/.test(prev)) { x1 = 2 * x - lcx; y1 = 2 * y - lcy; }
        const x2 = ox + num(), y2 = oy + num(), x3 = ox + num(), y3 = oy + num();
        cubic(x1, y1, x2, y2, x3, y3); lcx = x2; lcy = y2; x = x3; y = y3; break;
      }
      case 'Q': {
        const qx = ox + num(), qy = oy + num(), x3 = ox + num(), y3 = oy + num();
        cubic(x + 2 / 3 * (qx - x), y + 2 / 3 * (qy - y), x3 + 2 / 3 * (qx - x3), y3 + 2 / 3 * (qy - y3), x3, y3);
        x = x3; y = y3; break;
      }
      default: i++;
    }
    prev = cmd;
  }
  if (_paths.size > 4000) _paths.clear();
  _paths.set(d, subs);
  return subs;
}

function subs(shape) {
  if (typeof shape === 'string') return parsePath(shape);
  if (Array.isArray(shape)) return shape;
  return [shape];
}

// ---------- generated shapes (return subpath objects) ----------
function circ(cx, cy, rx, ry = rx, a0 = 0, a1 = TAU) {
  const full = Math.abs(a1 - a0) >= TAU - 1e-6;
  const n = Math.max(12, Math.ceil(Math.abs(a1 - a0) * Math.max(rx, ry) / 7));
  const p = [];
  for (let k = 0; k <= (full ? n - 1 : n); k++) {
    const a = a0 + (a1 - a0) * k / n; p.push(cx + Math.cos(a) * rx, cy + Math.sin(a) * ry);
  }
  return { p, c: full };
}
function spiral(cx, cy, r, turns = 3, r0 = 2) {
  const p = [], n = Math.ceil(turns * 40);
  for (let k = 0; k <= n; k++) {
    const t = k / n, a = t * turns * TAU, rad = r0 + (r - r0) * t;
    p.push(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad);
  }
  return { p, c: false };
}
function seg(x1, y1, x2, y2) {
  const L = Math.hypot(x2 - x1, y2 - y1), n = Math.max(2, Math.ceil(L / 9)), p = [];
  for (let k = 0; k <= n; k++) p.push(x1 + (x2 - x1) * k / n, y1 + (y2 - y1) * k / n);
  return { p, c: false };
}
function poly(pts, closed = false) {
  // pts: flat [x,y,...]; densify straight segments
  const p = [pts[0], pts[1]];
  const m = pts.length / 2 + (closed ? 1 : 0);
  for (let k = 1; k < m; k++) {
    const i = k % (pts.length / 2);
    const x0 = p[p.length - 2], y0 = p[p.length - 1], x1 = pts[2 * i], y1 = pts[2 * i + 1];
    const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 9));
    for (let j = 1; j <= n; j++) p.push(x0 + (x1 - x0) * j / n, y0 + (y1 - y0) * j / n);
  }
  if (closed) { p.pop(); p.pop(); }
  return { p, c: closed };
}

// ---------- wobble ----------
function wobble(sub, amp) {
  const p = sub.p, n = p.length / 2, out = new Array(p.length);
  const a1 = amp * rr(.5, 1), a2 = amp * rr(.15, .5), f1 = rr(.012, .03), f2 = rr(.05, .1);
  const ph1 = rr(0, TAU), ph2 = rr(0, TAU), ox = rr(-.7, .7) * amp, oy = rr(-.7, .7) * amp;
  let s = 0;
  for (let k = 0; k < n; k++) {
    const x = p[2 * k], y = p[2 * k + 1];
    if (k > 0) s += Math.hypot(x - p[2 * k - 2], y - p[2 * k - 1]);
    const k0 = Math.max(0, k - 1), k1 = Math.min(n - 1, k + 1);
    let nx = -(p[2 * k1 + 1] - p[2 * k0 + 1]), ny = p[2 * k1] - p[2 * k0];
    const L = Math.hypot(nx, ny) || 1; nx /= L; ny /= L;
    const d = a1 * Math.sin(s * f1 / PEN + ph1) + a2 * Math.sin(s * f2 / PEN + ph2);
    out[2 * k] = x + nx * d + ox; out[2 * k + 1] = y + ny * d + oy;
  }
  return out;
}

// ---------- pen ----------
function ink(shape, w = 3, color = C.ink, amp = 1.6) {
  nextSeed();
  const A = amp * PEN;
  ctx.strokeStyle = color; ctx.lineWidth = w * PEN; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (const sub of subs(shape)) {
    const n = sub.p.length / 2; if (n < 2) continue;
    const q = wobble(sub, A);
    ctx.beginPath(); ctx.moveTo(q[0], q[1]);
    for (let k = 1; k < n; k++) ctx.lineTo(q[2 * k], q[2 * k + 1]);
    if (sub.c) {
      const extra = Math.min(n - 1, 1 + ((rand() * 3) | 0));
      for (let k = 0; k <= extra; k++) ctx.lineTo(q[2 * k] + rr(-1, 1) * A, q[2 * k + 1] + rr(-1, 1) * A);
    }
    ctx.stroke();
  }
}

// solid (non-crayon) fill, e.g. pupils
function blot(shape, color = C.ink, amp = 1) {
  nextSeed();
  ctx.fillStyle = color; ctx.beginPath();
  for (const sub of subs(shape)) {
    const q = wobble(sub, amp * PEN); ctx.moveTo(q[0], q[1]);
    for (let k = 1; k < q.length / 2; k++) ctx.lineTo(q[2 * k], q[2 * k + 1]);
    ctx.closePath();
  }
  ctx.fill();
}
function dot(x, y, r, color = C.ink) { blot(circ(x, y, r), color, .4); }

// ---------- crayon ----------
let _mask = null; const _grain = {};
function grainMask() {
  if (_mask) return _mask;
  const S = 192, g = document.createElement('canvas'); g.width = g.height = S;
  const x = g.getContext('2d');
  x.fillStyle = 'rgba(0,0,0,.62)'; x.fillRect(0, 0, S, S);
  for (let i = 0; i < 5200; i++) {
    x.fillStyle = `rgba(0,0,0,${.3 + Math.random() * .7})`;
    const r = .5 + Math.random() * 1.3; x.fillRect(Math.random() * S, Math.random() * S, r * 2.2, r);
  }
  x.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 2600; i++) {
    x.fillStyle = `rgba(0,0,0,${.5 + Math.random() * .5})`;
    const r = .5 + Math.random() * 1.4; x.fillRect(Math.random() * S, Math.random() * S, r * 2.4, r);
  }
  _mask = g; return g;
}
function grain(color) {
  let pat = _grain[color];
  if (!pat) {
    const m = grainMask(), g = document.createElement('canvas'); g.width = m.width; g.height = m.height;
    const x = g.getContext('2d');
    x.fillStyle = color; x.fillRect(0, 0, g.width, g.height);
    x.globalCompositeOperation = 'destination-in'; x.drawImage(m, 0, 0);
    pat = _grain[color] = ctx.createPattern(g, 'repeat');
  }
  // keep the paper tooth at screen scale, regardless of zoom
  if (pat.setTransform && ctx.getTransform) pat.setTransform(ctx.getTransform().invertSelf());
  return pat;
}

// scanline hatching inside polygons -> crayon strokes with ragged ends
function hatch(polys, ang, gap, w, ragged) {
  const ca = Math.cos(ang), sa = Math.sin(ang), edges = [];
  let vmin = 1e9, vmax = -1e9;
  for (const q of polys) {
    const n = q.length / 2;
    for (let k = 0; k < n; k++) {
      const j = (k + 1) % n;
      const u1 = q[2 * k] * ca + q[2 * k + 1] * sa, v1 = -q[2 * k] * sa + q[2 * k + 1] * ca;
      const u2 = q[2 * j] * ca + q[2 * j + 1] * sa, v2 = -q[2 * j] * sa + q[2 * j + 1] * ca;
      edges.push(u1, v1, u2, v2); vmin = Math.min(vmin, v1); vmax = Math.max(vmax, v1);
    }
  }
  ctx.lineWidth = w; ctx.beginPath();
  const xs = [];
  for (let v = vmin + gap * .5; v < vmax; v += gap * rr(.75, 1.25)) {
    xs.length = 0;
    for (let e = 0; e < edges.length; e += 4) {
      const v1 = edges[e + 1], v2 = edges[e + 3];
      if ((v1 <= v) !== (v2 <= v)) xs.push(edges[e] + (v - v1) / (v2 - v1) * (edges[e + 2] - edges[e]));
    }
    xs.sort((a, b) => a - b);
    for (let i = 0; i + 1 < xs.length; i += 2) {
      const a = xs[i] + rr(-.3, 1) * ragged + w * .4, b = xs[i + 1] - rr(-.3, 1) * ragged - w * .4;
      if (b <= a) continue;
      const dv = rr(-1, 1) * gap * .35;
      ctx.moveTo(a * ca - v * sa, a * sa + v * ca);
      ctx.lineTo(b * ca - (v + dv) * sa, b * sa + (v + dv) * ca);
    }
  }
  ctx.stroke();
}

// fill a shape with crayon strokes
function crayon(shape, color, o = {}) {
  nextSeed();
  const gap = (o.gap ?? 6) * PEN, w = (o.w ?? 7) * PEN, amp = (o.amp ?? 3) * PEN;
  const ang = (o.angle ?? -0.75) + rr(-.12, .12);
  const polys = subs(shape).map(s => wobble(s, amp));
  if (o.base) {
    ctx.fillStyle = o.base; ctx.globalAlpha = o.baseAlpha ?? .85; ctx.beginPath();
    for (const q of polys) { ctx.moveTo(q[0], q[1]); for (let k = 1; k < q.length / 2; k++) ctx.lineTo(q[2 * k], q[2 * k + 1]); ctx.closePath(); }
    ctx.fill();
  }
  ctx.strokeStyle = grain(color); ctx.lineCap = 'round'; ctx.globalAlpha = o.alpha ?? .92;
  hatch(polys, ang, gap, w, (o.ragged ?? 4) * PEN);
  if (o.cross) { ctx.globalAlpha = (o.alpha ?? .92) * .6; hatch(polys, ang + rr(.4, .8), gap * 1.4, w * .8, (o.ragged ?? 4) * PEN); }
  ctx.globalAlpha = 1;
}

// thick textured crayon stroke along a path
function crayonLine(shape, color, w = 10, o = {}) {
  nextSeed();
  ctx.strokeStyle = grain(color); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.globalAlpha = o.alpha ?? .9;
  const passes = o.passes ?? 2;
  for (let p = 0; p < passes; p++) {
    ctx.lineWidth = w * PEN * (p ? rr(.5, .8) : 1);
    for (const sub of subs(shape)) {
      const q = wobble(sub, (o.amp ?? 2) * PEN * (p ? 1.6 : 1));
      ctx.beginPath(); ctx.moveTo(q[0], q[1]);
      for (let k = 1; k < q.length / 2; k++) ctx.lineTo(q[2 * k], q[2 * k + 1]);
      if (sub.c) ctx.closePath();
      ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;
}

// ---------- transforms / camera ----------
function push(x = 0, y = 0, s = 1, r = 0, sy = s) {
  ctx.save(); ctx.translate(x, y); if (r) ctx.rotate(r); ctx.scale(s, sy);
}
function pop() { ctx.restore(); }
let CAM = { x: W / 2, y: H / 2, s: 1 };
let OFF_X = 0, OFF_Y = 0;
function camera(x, y, s = 1) {
  CAM = { x, y, s };
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.translate(W / 2 + OFF_X, H / 2 + OFF_Y); ctx.scale(s, s); ctx.translate(-x, -y);
  PEN = 1 / Math.pow(s, .8);
}
function screen() { camera(W / 2, H / 2, 1); }

// ---------- paper ----------
let _paper = null;
function paper(color = C.paper) {
  if (!_paper) {
    const g = document.createElement('canvas'); g.width = W; g.height = H;
    const x = g.getContext('2d');
    for (let i = 0; i < 26000; i++) {
      x.fillStyle = Math.random() < .5 ? 'rgba(120,100,70,.05)' : 'rgba(255,255,255,.09)';
      x.fillRect(Math.random() * W, Math.random() * H, 1 + Math.random() * 2, 1 + Math.random() * 1.5);
    }
    for (let i = 0; i < 160; i++) {
      x.strokeStyle = 'rgba(150,130,100,.05)'; x.lineWidth = .8; x.beginPath();
      const px = Math.random() * W, py = Math.random() * H, a = Math.random() * TAU, l = 6 + Math.random() * 16;
      x.moveTo(px, py); x.quadraticCurveTo(px + Math.cos(a) * l, py + Math.sin(a) * l + 3, px + Math.cos(a) * l * 1.8, py + Math.sin(a) * l * 1.8); x.stroke();
    }
    _paper = g;
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = color; ctx.fillRect(0, 0, W, H);
  ctx.drawImage(_paper, 0, 0);
}

// ---------- handwriting ----------
const HAND = '"Patrick Hand", "Noteworthy", "Chalkboard SE", "Bradley Hand", "Comic Sans MS", cursive';
function hand(text, x, y, size = 40, color = C.ink, align = 'center') {
  nextSeed();
  ctx.save();
  ctx.translate(x + rr(-.8, .8), y + rr(-.8, .8)); ctx.rotate(rr(-.008, .008));
  ctx.font = `${size}px ${HAND}`; ctx.textAlign = align; ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = color; ctx.fillText(text, 0, 0);
  ctx.restore();
}
