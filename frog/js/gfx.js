// Drawing toolkit: smooth paths, tapered strokes, gradients, glows, offscreen layers (blur / soft focus), tracked text.
const { C, W, H, TAU, clamp, lerp, rgba, rgb, mix, hash } = require('./core');

const reset = (g) => { g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; g.filter = 'none'; g.setLineDash([]); g.lineCap = 'butt'; g.lineJoin = 'miter'; g.shadowBlur = 0; g.shadowColor = 'rgba(0,0,0,0)'; };

// Catmull-Rom through points -> cubic Beziers (t = tension, 1 = classic)
function curve(g, P, closed = false, t = 1, move = true) {
  const n = P.length;
  if (n < 2) return;
  const at = (i) => (closed ? P[(i + n) % n] : P[Math.max(0, Math.min(n - 1, i))]);
  if (move) g.moveTo(P[0][0], P[0][1]); else g.lineTo(P[0][0], P[0][1]);
  const m = closed ? n : n - 1;
  for (let i = 0; i < m; i++) {
    const p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2);
    g.bezierCurveTo(p1[0] + (p2[0] - p0[0]) * t / 6, p1[1] + (p2[1] - p0[1]) * t / 6, p2[0] - (p3[0] - p1[0]) * t / 6, p2[1] - (p3[1] - p1[1]) * t / 6, p2[0], p2[1]);
  }
  if (closed) g.closePath();
}
function blob(g, P, t = 1) { g.beginPath(); curve(g, P, true, t); }
function poly(g, P, closed = true) { g.beginPath(); g.moveTo(P[0][0], P[0][1]); for (let i = 1; i < P.length; i++) g.lineTo(P[i][0], P[i][1]); if (closed) g.closePath(); }
const circle = (g, x, y, r) => { g.beginPath(); g.arc(x, y, Math.max(0, r), 0, TAU); };
const ellipse = (g, x, y, rx, ry, rot = 0) => { g.beginPath(); g.ellipse(x, y, Math.max(0, rx), Math.max(0, ry), rot, 0, TAU); };

// dense polyline of a Catmull-Rom curve (for arc-length resampling and morphing)
function dense(P, closed = true, per = 12) {
  const n = P.length, out = [], at = (i) => (closed ? P[(i + n) % n] : P[Math.max(0, Math.min(n - 1, i))]);
  const m = closed ? n : n - 1;
  for (let i = 0; i < m; i++) {
    const p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2);
    for (let k = 0; k < per; k++) {
      const s = k / per, s2 = s * s, s3 = s2 * s;
      out.push([0, 1].map((d) => .5 * ((2 * p1[d]) + (-p0[d] + p2[d]) * s + (2 * p0[d] - 5 * p1[d] + 4 * p2[d] - p3[d]) * s2 + (-p0[d] + 3 * p1[d] - 3 * p2[d] + p3[d]) * s3)));
    }
  }
  if (!closed) out.push(P[n - 1].slice());
  return out;
}
// n points evenly spaced by arc length along a polyline
function resample(D, n, closed = true) {
  const L = [0];
  const pts = closed ? D.concat([D[0]]) : D;
  for (let i = 1; i < pts.length; i++) L.push(L[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const tot = L[L.length - 1], out = [];
  let j = 0;
  for (let k = 0; k < n; k++) {
    const s = closed ? tot * k / n : tot * k / (n - 1);
    while (j < L.length - 2 && L[j + 1] < s) j++;
    const u = (s - L[j]) / Math.max(1e-9, L[j + 1] - L[j]);
    out.push([lerp(pts[j][0], pts[j + 1][0], u), lerp(pts[j][1], pts[j + 1][1], u)]);
  }
  return out;
}

// tapered ribbon along a polyline: widths per point (number or array)
function ribbon(g, P, w, cap = true) {
  const n = P.length, L = [], R = [];
  for (let i = 0; i < n; i++) {
    const a = P[Math.max(0, i - 1)], b = P[Math.min(n - 1, i + 1)];
    let dx = b[0] - a[0], dy = b[1] - a[1];
    const d = Math.hypot(dx, dy) || 1; dx /= d; dy /= d;
    const ww = (typeof w === 'function' ? w(i / (n - 1)) : Array.isArray(w) ? w[i] : w) / 2;
    L.push([P[i][0] - dy * ww, P[i][1] + dx * ww]); R.push([P[i][0] + dy * ww, P[i][1] - dx * ww]);
  }
  g.beginPath(); g.moveTo(L[0][0], L[0][1]);
  for (let i = 1; i < n; i++) g.lineTo(L[i][0], L[i][1]);
  if (cap) { const e = P[n - 1], r = Math.hypot(L[n - 1][0] - e[0], L[n - 1][1] - e[1]); const a0 = Math.atan2(L[n - 1][1] - e[1], L[n - 1][0] - e[0]); g.arc(e[0], e[1], r, a0, a0 - Math.PI, true); }
  for (let i = n - 1; i >= 0; i--) g.lineTo(R[i][0], R[i][1]);
  if (cap) { const s = P[0], r = Math.hypot(R[0][0] - s[0], R[0][1] - s[1]); const a0 = Math.atan2(R[0][1] - s[1], R[0][0] - s[0]); g.arc(s[0], s[1], r, a0, a0 - Math.PI, true); }
  g.closePath();
}
// smooth tapered ribbon following a Catmull-Rom spine
function strand(g, P, w0, w1, per = 6) {
  const D = dense(P, false, per);
  ribbon(g, D, (u) => lerp(w0, w1, u), true);
}

function lin(g, x0, y0, x1, y1, stops) {
  const gr = g.createLinearGradient(x0, y0, x1, y1);
  for (const [o, c, a = 1] of stops) gr.addColorStop(clamp(o), rgba(c, a));
  return gr;
}
function rad(g, x, y, r, stops, x0 = x, y0 = y, r0 = 0) {
  const gr = g.createRadialGradient(x0, y0, r0, x, y, Math.max(1e-3, r));
  for (const [o, c, a = 1] of stops) gr.addColorStop(clamp(o), rgba(c, a));
  return gr;
}
function glow(g, x, y, r, c, a = 1, comp = 'lighter') {
  if (a <= .002 || r <= 0) return;
  g.save(); g.globalCompositeOperation = comp;
  g.fillStyle = rad(g, x, y, r, [[0, c, a], [.25, c, a * .45], [.6, c, a * .1], [1, c, 0]]);
  g.fillRect(x - r, y - r, 2 * r, 2 * r); g.restore();
}

// ---------------------------------------------------------------- offscreen layers
const POOL = new Map();
function buf(name, w = W, h = H) {
  let b = POOL.get(name);
  if (!b || b.w !== w || b.h !== h) { const cv = C.createCanvas(w, h); b = { cv, g: cv.getContext('2d'), w, h }; POOL.set(name, b); }
  reset(b.g); b.g.clearRect(0, 0, w, h);
  return b;
}
// draw fn into a layer, then composite with optional blur / alpha / blend; k > 1 renders at 1/k resolution (cheap softness)
function layer(g, name, fn, o = {}) {
  const k = o.k ?? 1, b = buf(name, Math.ceil(W / k), Math.ceil(H / k));
  b.g.setTransform(1 / k, 0, 0, 1 / k, 0, 0);
  fn(b.g);
  g.save(); reset(g);
  g.globalAlpha = o.alpha ?? 1;
  g.globalCompositeOperation = o.comp ?? 'source-over';
  if (o.blur > .3) g.filter = `blur(${(o.blur).toFixed(1)}px)`;
  g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
  g.drawImage(b.cv, 0, 0, W, H);
  g.restore();
  return b;
}

// ---------------------------------------------------------------- text with tracking
function font(g, f, size) { g.font = `${size}px ${f}`; }
function tw(g, s, track = 0) { let w = 0; for (const ch of s) w += g.measureText(ch).width + track; return w - (s.length ? track : 0); }
// draw string glyph by glyph; per(i, ch) may return {dx, dy, a, s} offsets for kinetic type
function text(g, s, x, y, o = {}) {
  font(g, o.font ?? 'Sv', o.size ?? 32);
  const track = (o.track ?? 0) * (o.size ?? 32);
  const total = tw(g, s, track);
  let cx = x - (o.align === 'center' ? total / 2 : o.align === 'right' ? total : 0);
  g.textBaseline = o.base ?? 'alphabetic';
  const chars = [...s];
  chars.forEach((ch, i) => {
    const w = g.measureText(ch).width;
    const p = o.per ? o.per(i, ch, chars.length) : null;
    if (!p || (p.a ?? 1) > .002) {
      g.save();
      g.globalAlpha *= p?.a ?? 1;
      g.translate(cx + w / 2 + (p?.dx ?? 0), y + (p?.dy ?? 0));
      if (p?.r) g.rotate(p.r);
      if (p?.s !== undefined) g.scale(p.s, p.sy ?? p.s);
      if (o.stroke) { g.lineJoin = 'round'; g.strokeStyle = o.stroke; g.lineWidth = o.strokeW ?? 4; g.strokeText(ch, -w / 2, 0); }
      if (o.color !== null) { g.fillStyle = o.fill ?? rgba(o.color ?? '#ffffff', 1); g.fillText(ch, -w / 2, 0); }
      g.restore();
    }
    cx += w + track;
  });
  return total;
}

// grain tiles (random per frame offset)
let GRAIN = null;
function grain() {
  if (GRAIN) return GRAIN;
  GRAIN = [];
  for (let k = 0; k < 4; k++) {
    const S = 256, cv = C.createCanvas(S, S), g = cv.getContext('2d'), im = g.createImageData(S, S);
    let s = 9 + k * 31;
    for (let i = 0; i < S * S; i++) {
      s = (s * 1103515245 + 12345) >>> 0;
      const v = (s >>> 16) & 255;
      im.data[i * 4] = im.data[i * 4 + 1] = im.data[i * 4 + 2] = v; im.data[i * 4 + 3] = 255;
    }
    g.putImageData(im, 0, 0);
    GRAIN.push(cv);
  }
  return GRAIN;
}

module.exports = { reset, curve, blob, poly, circle, ellipse, dense, resample, ribbon, strand, lin, rad, glow, buf, layer, font, tw, text, grain };
