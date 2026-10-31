// Cut-paper rendering toolkit: flat colour pieces with fabric patterns, soft paper shadows,
// fine ink edges with a gentle line "boil", red pencil sketches and a paper-grain overlay.
const W = 1080, H = 1080, FPS = 24, DURATION = 60;
const HORIZON = 600, GROUND = 850, LANE = 930;

const C = {
  paper: '#f3eee3', line: '#3a2f28', white: '#fbf8f0', cream: '#f4eee2', black: '#2a2522',
  // landscape
  far: '#d3e3e6', mid: '#aecfd3', near: '#8dbfc0', strip: '#6ea7a5',
  teal: '#5f9ea0', green: '#3f7c62', forest: '#2e5b4b', navy: '#223055', ice: '#c7dde6',
  night: '#1f2a4b', nightGround: '#8e8c95',
  stone: '#bdd3c5', stoneD: '#9fb9aa', bark: '#3b2d27', wood: '#9a6b44', woodD: '#7b5234',
  // tortoise
  rim: '#5b3a24', olive: '#7c8a46', mustard: '#c89c40', tan: '#d8b66e', ochre: '#b3853f',
  khaki: '#a69a5d', umber: '#8b5b35', sand: '#dcc28a', skin: '#9ca761', skinD: '#7f8a4b',
  // hare
  fur: '#c09c7c', furD: '#9d7a5d', furL: '#f0e6d6', earIn: '#e8a8a0', nose: '#d9837a',
  // accents
  red: '#e0603f', redD: '#bf4a2f', sketch: '#df6245', gold: '#e4b33d', goldD: '#c7902e', goldL: '#f1cf6a',
  sun: '#f1dc93', moon: '#f3e6b9',
  gooseB: '#c2b59c', gooseL: '#e4dccb', gooseW: '#877a67', gooseD: '#5d544a',
  // patchwork leaves
  leaves: ['#c8463b', '#e2b446', '#5f8f4e', '#3f8a86', '#28416f', '#e9a7a4', '#9fcbe0', '#d98a3d', '#8fb35a', '#b7d6cf']
};
const PATS = ['dots', 'ldots', 'scales', 'net', 'grid', 'stripe', 'tri', 'flower', 'check', 'wave', 'cross', 'chev'];

let ctx = null;
let BOIL = 0, CALL = 0, PEN = 1;
function setCtx(c) { ctx = c; }
function beginFrame(frame) { BOIL = Math.floor(frame / 3); CALL = 0; }

// ---------- math ----------
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const inv = (a, b, v) => clamp((v - a) / (b - a));
const ease = t => (t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const easeOut = t => 1 - Math.pow(1 - t, 3);
const easeIn = t => t * t * t;
const backOut = t => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };
const TAU = Math.PI * 2;
function mix(a, b, u) {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
  const r = Math.round(lerp(pa >> 16, pb >> 16, u)), g = Math.round(lerp((pa >> 8) & 255, (pb >> 8) & 255, u)), bl = Math.round(lerp(pa & 255, pb & 255, u));
  return '#' + ((1 << 24) | (r << 16) | (g << 8) | bl).toString(16).slice(1);
}

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
// stable random for layout (does not boil)
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

// ---------- generated shapes ----------
function circ(cx, cy, rx, ry = rx, a0 = 0, a1 = TAU) {
  const full = Math.abs(a1 - a0) >= TAU - 1e-6;
  const n = Math.max(14, Math.ceil(Math.abs(a1 - a0) * Math.max(rx, ry) / 7));
  const p = [];
  for (let k = 0; k <= (full ? n - 1 : n); k++) {
    const a = a0 + (a1 - a0) * k / n; p.push(cx + Math.cos(a) * rx, cy + Math.sin(a) * ry);
  }
  return { p, c: full };
}
function ell(cx, cy, rx, ry, rot = 0) {
  const e = circ(0, 0, rx, ry), c = Math.cos(rot), s = Math.sin(rot), p = e.p;
  for (let k = 0; k < p.length; k += 2) { const x = p[k], y = p[k + 1]; p[k] = cx + x * c - y * s; p[k + 1] = cy + x * s + y * c; }
  return e;
}
function dome(cx, by, rx, ry) { const d = circ(cx, by, rx, ry, Math.PI, TAU); d.c = true; return d; }
function seg(x1, y1, x2, y2) {
  const L = Math.hypot(x2 - x1, y2 - y1), n = Math.max(2, Math.ceil(L / 9)), p = [];
  for (let k = 0; k <= n; k++) p.push(x1 + (x2 - x1) * k / n, y1 + (y2 - y1) * k / n);
  return { p, c: false };
}
function poly(pts, closed = false) {
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
function rrect(x, y, w, h, r = 6) {
  r = Math.min(r, w / 2, h / 2);
  const p = [], arc = (cx, cy, a0) => { for (let k = 0; k <= 4; k++) { const a = a0 + k / 4 * Math.PI / 2; p.push(cx + Math.cos(a) * r, cy + Math.sin(a) * r); } };
  arc(x + w - r, y + r, -Math.PI / 2); arc(x + w - r, y + h - r, 0); arc(x + r, y + h - r, Math.PI / 2); arc(x + r, y + r, Math.PI);
  return poly(p, true);
}
// pointed leaf / petal / ear from (x,y) along angle
function leafShape(x, y, len, wid, ang, bulge = .45) {
  const c = Math.cos(ang), s = Math.sin(ang), p = [], n = 16;
  for (let k = 0; k <= n; k++) { const u = k / n, w = Math.pow(Math.sin(Math.PI * u), .8) * wid / 2 * (1 + (u < bulge ? 0 : -(u - bulge) * .3)); p.push(u * len, -w); }
  for (let k = n - 1; k > 0; k--) { const u = k / n, w = Math.pow(Math.sin(Math.PI * u), .8) * wid / 2 * (1 + (u < bulge ? 0 : -(u - bulge) * .3)); p.push(u * len, w); }
  for (let k = 0; k < p.length; k += 2) { const px = p[k], py = p[k + 1]; p[k] = x + px * c - py * s; p[k + 1] = y + px * s + py * c; }
  return { p, c: true };
}
// a tapered sausage around a polyline: pts flat [x,y,...], ws widths per point
function limb(pts, ws) {
  const n = pts.length / 2, L = [], R = [];
  for (let k = 0; k < n; k++) {
    const k0 = Math.max(0, k - 1), k1 = Math.min(n - 1, k + 1);
    let dx = pts[2 * k1] - pts[2 * k0], dy = pts[2 * k1 + 1] - pts[2 * k0 + 1];
    const d = Math.hypot(dx, dy) || 1; dx /= d; dy /= d;
    const w = ws[Math.min(k, ws.length - 1)] / 2;
    L.push(pts[2 * k] - dy * w, pts[2 * k + 1] + dx * w); R.push(pts[2 * k] + dy * w, pts[2 * k + 1] - dx * w);
  }
  const cap = (cx, cy, w, a0) => { const o = []; for (let j = 1; j < 6; j++) { const a = a0 - j / 6 * Math.PI; o.push(cx + Math.cos(a) * w, cy + Math.sin(a) * w); } return o; };
  const ax = pts[2 * n - 2] - pts[2 * n - 4], ay = pts[2 * n - 1] - pts[2 * n - 3], ae = Math.atan2(ay, ax);
  const bx = pts[2] - pts[0], by = pts[3] - pts[1], ab = Math.atan2(by, bx);
  const p = [...L, ...cap(pts[2 * n - 2], pts[2 * n - 1], ws[ws.length - 1] / 2, ae + Math.PI / 2)];
  for (let k = n - 1; k >= 0; k--) p.push(R[2 * k], R[2 * k + 1]);
  p.push(...cap(pts[0], pts[1], ws[0] / 2, ab - Math.PI / 2));
  return poly(p, true);
}
function bez(x0, y0, x1, y1, x2, y2, x3, y3, n = 10) {
  const o = [];
  for (let k = 0; k <= n; k++) { const t = k / n, u = 1 - t; o.push(u * u * u * x0 + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t * x3, u * u * u * y0 + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * y3); }
  return o;
}
// two-bone IK: returns elbow point
function ik(ax, ay, bx, by, l1, l2, bend = 1) {
  const dx = bx - ax, dy = by - ay, d = Math.min(Math.hypot(dx, dy), l1 + l2 - .01) || .01;
  const a = Math.acos(clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1)), base = Math.atan2(dy, dx);
  return [ax + Math.cos(base - a * bend) * l1, ay + Math.sin(base - a * bend) * l1];
}

// ---------- wobble ----------
function wobble(sub, amp) {
  const p = sub.p, n = p.length / 2, out = new Array(p.length);
  if (amp <= 0) { for (let k = 0; k < p.length; k++) out[k] = p[k]; return out; }
  const a1 = amp * rr(.5, 1), a2 = amp * rr(.15, .5), f1 = rr(.012, .03), f2 = rr(.05, .1);
  const ph1 = rr(0, TAU), ph2 = rr(0, TAU), ox = rr(-.5, .5) * amp, oy = rr(-.5, .5) * amp;
  let s = 0;
  for (let k = 0; k < n; k++) {
    const x = p[2 * k], y = p[2 * k + 1];
    if (k > 0) s += Math.hypot(x - p[2 * k - 2], y - p[2 * k - 1]);
    const k0 = Math.max(0, k - 1), k1 = Math.min(n - 1, k + 1);
    let nx = -(p[2 * k1 + 1] - p[2 * k0 + 1]), ny = p[2 * k1] - p[2 * k0];
    const L = Math.hypot(nx, ny) || 1; nx /= L; ny /= L;
    const d = a1 * Math.sin(s * f1 + ph1) + a2 * Math.sin(s * f2 + ph2);
    out[2 * k] = x + nx * d + ox; out[2 * k + 1] = y + ny * d + oy;
  }
  return out;
}
function toPath(shape, amp, close) {
  const P = new Path2D();
  for (const s of subs(shape)) {
    const n = s.p.length / 2; if (n < 2) continue;
    const q = wobble(s, amp);
    P.moveTo(q[0], q[1]);
    for (let k = 1; k < n; k++) P.lineTo(q[2 * k], q[2 * k + 1]);
    if (close ?? s.c) P.closePath();
  }
  return P;
}

// ---------- fabric patterns (neutral overlays so one tile serves every colour) ----------
const _pat = {};
function pattern(name) {
  let pat = _pat[name];
  if (!pat) {
    const S = { speck: 72, check: 16, tri: 16, flower: 18, wave: 20, chev: 16 }[name] || 14;
    const g = document.createElement('canvas'); g.width = g.height = S;
    const x = g.getContext('2d'), D = 'rgba(40,25,10,.17)', L = 'rgba(255,252,240,.42)';
    x.lineCap = 'round';
    const dotAt = (px, py, r, c) => { x.fillStyle = c; x.beginPath(); x.arc(px, py, r, 0, TAU); x.fill(); };
    switch (name) {
      case 'dots': dotAt(3.5, 3.5, 1.7, D); dotAt(10.5, 10.5, 1.7, D); break;
      case 'ldots': dotAt(3.5, 3.5, 1.8, L); dotAt(10.5, 10.5, 1.8, L); break;
      case 'scales': x.strokeStyle = D; x.lineWidth = 1.3; for (const [cx, cy] of [[0, 7], [14, 7], [7, 14], [7, 0], [0, 21], [14, 21]]) { x.beginPath(); x.arc(cx, cy, 7, 0, Math.PI); x.stroke(); } break;
      case 'net': x.strokeStyle = D; x.lineWidth = 1.1; x.beginPath(); x.moveTo(0, 0); x.lineTo(14, 14); x.moveTo(14, 0); x.lineTo(0, 14); x.stroke(); break;
      case 'grid': x.strokeStyle = L; x.lineWidth = 1.4; x.beginPath(); x.moveTo(0, .7); x.lineTo(14, .7); x.moveTo(.7, 0); x.lineTo(.7, 14); x.stroke(); break;
      case 'stripe': x.strokeStyle = D; x.lineWidth = 3; x.beginPath(); for (let k = -1; k <= 1; k++) { x.moveTo(k * 14 - 2, 16); x.lineTo(k * 14 + 16, -2); } x.stroke(); break;
      case 'tri': x.fillStyle = D; x.beginPath(); x.moveTo(3, 12); x.lineTo(8, 4); x.lineTo(13, 12); x.closePath(); x.fill(); break;
      case 'flower': for (let k = 0; k < 4; k++) dotAt(9 + Math.cos(k * Math.PI / 2) * 2.6, 9 + Math.sin(k * Math.PI / 2) * 2.6, 1.8, L); break;
      case 'check': x.fillStyle = D; x.fillRect(0, 0, 8, 8); x.fillRect(8, 8, 8, 8); break;
      case 'wave': x.strokeStyle = D; x.lineWidth = 1.3; x.beginPath(); for (const oy of [5, 15]) { x.moveTo(0, oy); x.bezierCurveTo(5, oy - 4, 5, oy - 4, 10, oy); x.bezierCurveTo(15, oy + 4, 15, oy + 4, 20, oy); } x.stroke(); break;
      case 'cross': x.strokeStyle = L; x.lineWidth = 1.5; x.beginPath(); x.moveTo(7, 3.5); x.lineTo(7, 10.5); x.moveTo(3.5, 7); x.lineTo(10.5, 7); x.stroke(); break;
      case 'chev': x.strokeStyle = D; x.lineWidth = 1.4; x.beginPath(); x.moveTo(0, 11); x.lineTo(8, 5); x.lineTo(16, 11); x.stroke(); break;
      case 'speck': default:
        for (let k = 0; k < 60; k++) { x.fillStyle = k % 3 ? D : L; x.fillRect(hash(k * 3 + 1) * S, hash(k * 7 + 2) * S, 1.2 + hash(k * 11) * 1.6, 1 + hash(k * 13) * 1.2); }
    }
    pat = _pat[name] = ctx.createPattern(g, 'repeat');
  }
  return pat;
}

// ---------- paper pieces ----------
let SHADOW = 1;
function shadowOn(k = 1) {
  const z = (ctx.getTransform ? Math.hypot(ctx.getTransform().a, ctx.getTransform().b) : 1);
  ctx.shadowColor = `rgba(70,50,30,${.2 * k * SHADOW})`;
  ctx.shadowBlur = 5 * Math.min(2, z); ctx.shadowOffsetX = 2.5 * Math.min(2, z); ctx.shadowOffsetY = 3.5 * Math.min(2, z);
}
function shadowOff() { ctx.shadowColor = 'rgba(0,0,0,0)'; ctx.shadowBlur = 0; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0; }

// o: { pat, line (null = no outline), w, amp, shadow (0..1 / false), edge (white cut rim), alpha }
function cut(shape, color, o = {}) {
  nextSeed();
  const P = toPath(shape, (o.amp ?? .6) * PEN, true);
  if (o.alpha != null) ctx.globalAlpha = o.alpha;
  if (o.edge) { ctx.strokeStyle = C.white; ctx.lineWidth = o.edge * PEN; ctx.lineJoin = 'round'; if (o.shadow !== false) shadowOn(o.shadow ?? 1); ctx.stroke(P); shadowOff(); }
  else if (o.shadow !== false) shadowOn(o.shadow ?? 1);
  ctx.fillStyle = color; ctx.fill(P);
  shadowOff();
  if (o.pat) { ctx.fillStyle = pattern(o.pat); ctx.fill(P); }
  if (o.line !== null) { ctx.strokeStyle = o.line ?? C.line; ctx.lineWidth = (o.w ?? 1.8) * PEN; ctx.lineJoin = 'round'; ctx.stroke(P); }
  ctx.globalAlpha = 1;
  return P;
}
// plain ink stroke (open unless the shape is closed)
function line(shape, w = 2, color = C.line, o = {}) {
  nextSeed();
  const P = toPath(shape, (o.amp ?? .6) * PEN);
  ctx.strokeStyle = color; ctx.lineWidth = w * PEN; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  if (o.alpha != null) ctx.globalAlpha = o.alpha;
  if (o.dash) ctx.setLineDash(o.dash.map(d => d * PEN));
  ctx.stroke(P);
  ctx.setLineDash([]); ctx.globalAlpha = 1;
}
function dot(x, y, r, color = C.black) { ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); }
function clipTo(shape) { ctx.save(); ctx.clip(toPath(shape, 0, true)); }
function unclip() { ctx.restore(); }

// ---------- red pencil sketches, revealed along their length ----------
function pathLen(sub) { let L = 0; const p = sub.p; for (let k = 2; k < p.length; k += 2) L += Math.hypot(p[k] - p[k - 2], p[k + 1] - p[k - 1]); return L; }
function sketch(shape, u = 1, o = {}) {
  if (u <= 0) return;
  nextSeed();
  const all = subs(shape), lens = all.map(pathLen), total = lens.reduce((a, b) => a + b, 0);
  let budget = total * clamp(u);
  ctx.strokeStyle = o.color ?? C.sketch; ctx.lineWidth = (o.w ?? 5) * PEN; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  if (o.alpha != null) ctx.globalAlpha = o.alpha;
  if (o.dash) ctx.setLineDash([o.dash * PEN, o.dash * .9 * PEN]);
  ctx.beginPath();
  all.forEach((s, i) => {
    if (budget <= 0) return;
    const q = wobble(s, (o.amp ?? .8) * PEN), n = q.length / 2;
    ctx.moveTo(q[0], q[1]);
    for (let k = 1; k < n && budget > 0; k++) {
      const d = Math.hypot(q[2 * k] - q[2 * k - 2], q[2 * k + 1] - q[2 * k - 1]);
      if (d > budget) { const f = budget / d; ctx.lineTo(lerp(q[2 * k - 2], q[2 * k], f), lerp(q[2 * k - 1], q[2 * k + 1], f)); budget = 0; break; }
      ctx.lineTo(q[2 * k], q[2 * k + 1]); budget -= d;
    }
    if (budget > 0 && s.c) ctx.closePath();
  });
  ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;
}
// where the pencil is at progress u (for the little helper who draws the sketches)
function penAt(shape, u) {
  const all = subs(shape), lens = all.map(pathLen), total = lens.reduce((a, b) => a + b, 0);
  let d = total * clamp(u);
  for (let i = 0; i < all.length; i++) {
    const p = all[i].p;
    if (d > lens[i] && i < all.length - 1) { d -= lens[i]; continue; }
    for (let k = 2; k < p.length; k += 2) {
      const L = Math.hypot(p[k] - p[k - 2], p[k + 1] - p[k - 1]);
      if (d <= L) return [lerp(p[k - 2], p[k], d / L), lerp(p[k - 1], p[k + 1], d / L)];
      d -= L;
    }
    return [p[p.length - 2], p[p.length - 1]];
  }
  return [0, 0];
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
  PEN = 1 / Math.pow(s, .7);
}
function screen() { camera(W / 2, H / 2, 1); }
// world x of the left / right screen edge under the current camera
const viewL = () => CAM.x - (W / 2 + OFF_X) / CAM.s, viewR = () => CAM.x + (W / 2 - OFF_X) / CAM.s;

// ---------- paper ----------
let _grain = null;
function paper(color = C.paper) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = color; ctx.fillRect(0, 0, W, H);
}
// fibres and specks laid over everything, like the tooth of real paper
function grainOverlay() {
  if (!_grain) {
    const g = document.createElement('canvas'); g.width = W; g.height = H;
    const x = g.getContext('2d');
    for (let i = 0; i < 9; i++) {
      const gx = hash(i * 5) * W, gy = hash(i * 9 + 1) * H, r = 200 + hash(i * 3) * 300;
      const rg = x.createRadialGradient ? x.createRadialGradient(gx, gy, 0, gx, gy, r) : null;
      if (rg) { rg.addColorStop(0, i % 2 ? 'rgba(255,255,250,.08)' : 'rgba(150,120,80,.05)'); rg.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = rg; x.fillRect(0, 0, W, H); }
    }
    for (let i = 0; i < 20000; i++) {
      x.fillStyle = hash(i * 2) < .5 ? 'rgba(110,90,60,.045)' : 'rgba(255,255,255,.07)';
      x.fillRect(hash(i * 3 + 7) * W, hash(i * 5 + 3) * H, 1 + hash(i) * 2, 1 + hash(i + 9) * 1.5);
    }
    for (let i = 0; i < 260; i++) {
      x.strokeStyle = hash(i * 17) < .6 ? 'rgba(255,255,255,.22)' : 'rgba(120,100,70,.08)'; x.lineWidth = .8; x.beginPath();
      const px = hash(i * 7 + 1) * W, py = hash(i * 11 + 2) * H, a = hash(i * 13) * TAU, l = 6 + hash(i * 19) * 22;
      x.moveTo(px, py); x.quadraticCurveTo(px + Math.cos(a) * l, py + Math.sin(a) * l + 4, px + Math.cos(a) * l * 1.7, py + Math.sin(a) * l * 1.7); x.stroke();
    }
    for (let i = 0; i < 120; i++) { x.fillStyle = 'rgba(90,60,40,.35)'; x.beginPath(); x.arc(hash(i * 23 + 5) * W, hash(i * 29 + 8) * H, .7 + hash(i * 31) * 1.1, 0, TAU); x.fill(); }
    _grain = g;
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.drawImage(_grain, 0, 0);
}

// ---------- handwriting ----------
const HAND = '"Patrick Hand", "Noteworthy", "Chalkboard SE", "Bradley Hand", "Comic Sans MS", cursive';
function hand(text, x, y, size = 40, color = C.line, align = 'center') {
  nextSeed();
  ctx.save();
  ctx.translate(x + rr(-.6, .6), y + rr(-.6, .6)); ctx.rotate(rr(-.006, .006));
  ctx.font = `${size}px ${HAND}`; ctx.textAlign = align; ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = color; ctx.fillText(text, 0, 0);
  ctx.restore();
}
function typed(s, t, a, b) { return s.slice(0, Math.min(s.length, Math.floor(inv(a, b, t) * s.length + (t > a ? 1 : 0)))); }
function erased(s, t, a, b) { return s.slice(0, Math.ceil((1 - inv(a, b, t)) * s.length)); }
