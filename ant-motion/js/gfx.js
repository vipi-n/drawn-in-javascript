// Drawing helpers: splines, glows, light, text, film-look post (bloom / vignette / grain / grade).
const { C, W, H, S, clamp, lerp, rgba, rgb, mix, TAU, fonts, rng, noise, hash } = require('./core');

// Catmull-Rom spline through pts as a canvas path (does not begin/stroke).
function curve(ctx, pts, closed = false, k = 1 / 6, cont = false) {
  const n = pts.length;
  if (n < 2) return;
  const P = (i) => (closed ? pts[(i + n) % n] : pts[Math.max(0, Math.min(n - 1, i))]);
  if (cont) ctx.lineTo(pts[0][0], pts[0][1]); else ctx.moveTo(pts[0][0], pts[0][1]);
  const cnt = closed ? n : n - 1;
  for (let i = 0; i < cnt; i++) {
    const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
    ctx.bezierCurveTo(p1[0] + (p2[0] - p0[0]) * k, p1[1] + (p2[1] - p0[1]) * k, p2[0] - (p3[0] - p1[0]) * k, p2[1] - (p3[1] - p1[1]) * k, p2[0], p2[1]);
  }
  if (closed) ctx.closePath();
}

function glow(ctx, x, y, r, color, a = 1, hard = 0) {
  if (!(r > .5) || !(a > .002) || !isFinite(x + y)) return;
  const g = ctx.createRadialGradient(x, y, r * hard, x, y, r);
  g.addColorStop(0, rgba(color, a)); g.addColorStop(.35, rgba(color, a * .42)); g.addColorStop(.7, rgba(color, a * .1)); g.addColorStop(1, rgba(color, 0));
  ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
}
function ellipseGlow(ctx, x, y, rx, ry, color, a = 1) {
  ctx.save(); ctx.translate(x, y); ctx.scale(1, ry / rx); glow(ctx, 0, 0, rx, color, a); ctx.restore();
}
function vgrad(ctx, y0, y1, stops, x0 = 0, x1 = W) {
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  for (const [t, c, a = 1] of stops) g.addColorStop(t, rgba(c, a));
  ctx.fillStyle = g; ctx.fillRect(x0, Math.min(y0, y1), x1 - x0, Math.abs(y1 - y0));
}

// text with tracking
function text(ctx, str, x, y, o = {}) {
  const { font = 'CondB', size = 40, color = '#fff', align = 'left', track = 0, alpha = 1, weight = '', blur = 0, shadow = 0, baseline = 'alphabetic' } = o;
  ctx.save();
  ctx.font = `${weight ? weight + ' ' : ''}${size * S}px ${font}`;
  ctx.textBaseline = baseline;
  ctx.fillStyle = rgba(color, alpha);
  if (shadow) { ctx.shadowColor = 'rgba(0,0,0,.55)'; ctx.shadowBlur = shadow * S; ctx.shadowOffsetY = 2 * S; }
  if (blur * S > .4) ctx.filter = `blur(${(blur * S).toFixed(2)}px)`;
  ctx.letterSpacing = `${track * S}px`;
  let w = ctx.measureText(str).width - track * S;
  let sx = x;
  if (align === 'center') sx = x - w / 2; else if (align === 'right') sx = x - w;
  ctx.textAlign = 'left';
  ctx.fillText(str, sx, y);
  ctx.restore();
  return w;
}
function measure(ctx, str, o = {}) {
  const { font = 'CondB', size = 40, track = 0 } = o;
  ctx.save(); ctx.font = `${size * S}px ${font}`; ctx.letterSpacing = `${track * S}px`;
  const w = ctx.measureText(str).width - track * S; ctx.restore(); return w;
}

// soft ground-truth blur of a drawing callback: renders fn to an offscreen layer, blurs, composites.
const layers = [];
function getLayer(i = 0) {
  if (!layers[i]) { const cv = C.createCanvas(W, H); layers[i] = { cv, ctx: cv.getContext('2d') }; }
  return layers[i];
}
function blurred(ctx, px, fn, o = {}) {
  const { alpha = 1, comp = 'source-over', li = 0 } = o;
  const L = getLayer(li);
  L.ctx.setTransform(1, 0, 0, 1, 0, 0);
  L.ctx.clearRect(0, 0, W, H);
  L.ctx.save(); fn(L.ctx); L.ctx.restore();
  ctx.save();
  ctx.globalAlpha = alpha; ctx.globalCompositeOperation = comp;
  if (px > 0.3) ctx.filter = `blur(${(px * S).toFixed(2)}px)`;
  ctx.drawImage(L.cv, 0, 0);
  ctx.restore();
}

// ------------------------------------------------------------------------ post
let grainTiles = null;
function makeGrain() {
  grainTiles = [];
  const R = rng(99);
  for (let k = 0; k < 6; k++) {
    const cv = C.createCanvas(256, 256), c = cv.getContext('2d'), id = c.createImageData(256, 256);
    for (let i = 0; i < 256 * 256; i++) { const v = (R() * 255) | 0; id.data[i * 4] = v; id.data[i * 4 + 1] = v; id.data[i * 4 + 2] = v; id.data[i * 4 + 3] = 255; }
    c.putImageData(id, 0, 0); grainTiles.push(cv);
  }
}
let bloomCv = null;
function bloom(ctx, strength = .3, thresholdBoost = 1) {
  if (!bloomCv) { bloomCv = C.createCanvas(W / 4 | 0, H / 4 | 0); }
  const b = bloomCv.getContext('2d');
  b.setTransform(1, 0, 0, 1, 0, 0);
  b.globalCompositeOperation = 'source-over';
  b.filter = 'brightness(1.0) contrast(1.6) saturate(1.2)';
  b.drawImage(ctx.canvas, 0, 0, bloomCv.width, bloomCv.height);
  b.filter = 'none';
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = strength;
  ctx.filter = `blur(${22 * S}px)`;
  ctx.drawImage(bloomCv, 0, 0, W, H);
  ctx.restore();
}
function vignette(ctx, a = .55, tight = .45) {
  const g = ctx.createRadialGradient(W / 2, H / 2, H * tight, W / 2, H / 2, H * 1.05);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(0,0,0,${a})`);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}
function grain(ctx, f, a = .06) {
  if (!grainTiles) makeGrain();
  ctx.save();
  ctx.globalAlpha = a; ctx.globalCompositeOperation = 'overlay';
  const t = grainTiles[f % grainTiles.length];
  const ox = -((hash(f) * 256) | 0), oy = -((hash(f + 77) * 256) | 0);
  for (let y = oy; y < H; y += 256) for (let x = ox; x < W; x += 256) ctx.drawImage(t, x, y);
  ctx.restore();
}

// letterbox-free film look helpers
function lightShafts(ctx, t, x0, y0, ang, spread, len, color, a = .1, n = 7, seed = 1) {
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  const R = rng(seed);
  for (let i = 0; i < n; i++) {
    const k = i / (n - 1) - .5, aa = ang + k * spread + (R() - .5) * .06 + Math.sin(t * .3 + i * 1.7) * .012;
    const wdt = (30 + R() * 90) * S, al = a * (.4 + R() * .6) * (.75 + .25 * Math.sin(t * .7 + i * 2.3));
    ctx.save(); ctx.translate(x0, y0); ctx.rotate(aa);
    const g = ctx.createLinearGradient(0, 0, len, 0);
    g.addColorStop(0, rgba(color, al)); g.addColorStop(1, rgba(color, 0));
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(0, -wdt * .12); ctx.lineTo(len, -wdt); ctx.lineTo(len, wdt); ctx.lineTo(0, wdt * .12); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}

// floating dust / pollen / firefly specks. mode: 'dust' | 'fire' | 'spore'
function motes(ctx, t, n, o = {}) {
  const { color = '#ffe6a8', seed = 3, size = 1, a = .6, speed = 1, drift = [8, -6], depth = 1, x0 = 0, y0 = 0, w = W, h = H, twinkle = 1 } = o;
  const R = rng(seed);
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < n; i++) {
    const bx = R(), by = R(), z = .3 + R() * .7, ph = R() * TAU, sp = .4 + R();
    const x = x0 + ((bx * w + (drift[0] * S * t * speed * z) + Math.sin(t * .5 * sp + ph) * 30 * S * z) % w + w) % w;
    const y = y0 + ((by * h + (drift[1] * S * t * speed * z) + Math.cos(t * .4 * sp + ph) * 22 * S * z) % h + h) % h;
    const tw = (1 - twinkle) + twinkle * (.5 + .5 * Math.sin(t * (1.5 + sp) + ph));
    const r = (1.2 + R() * 2.6) * size * z * S * depth;
    glow(ctx, x, y, r * 3.2, color, a * tw * z * .8);
  }
  ctx.restore();
}

function bokeh(ctx, t, n, o = {}) {
  const { colors = ['#ffd28a', '#ffb85c'], seed = 5, a = .18, rmin = 20, rmax = 90, drift = [6, -3], y0 = 0, y1 = H } = o;
  const R = rng(seed);
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < n; i++) {
    const r = (rmin + R() * (rmax - rmin)) * S, x0 = R() * (W + 200) - 100, y = y0 + R() * (y1 - y0), c = colors[(R() * colors.length) | 0], al = a * (.4 + R() * .6);
    const x = ((x0 + t * drift[0] * (r / 60) * S + 100) % (W + 200 * S)) - 100 + Math.sin(t * .3 + i) * 12 * S, yy = y + t * drift[1] * S + Math.sin(t * .27 + i * 1.3) * 10 * S;
    const g = ctx.createRadialGradient(x, yy, r * .65, x, yy, r);
    g.addColorStop(0, rgba(c, al * .35)); g.addColorStop(.9, rgba(c, al)); g.addColorStop(1, rgba(c, 0));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, yy, r, 0, TAU); ctx.fill();
  }
  ctx.restore();
}

// rounded segment (tapered limb) from a to b, radii ra, rb
function limb(ctx, ax, ay, bx, by, ra, rb) {
  const dx = bx - ax, dy = by - ay, d = Math.hypot(dx, dy) || 1, nx = -dy / d, ny = dx / d;
  ctx.beginPath();
  ctx.moveTo(ax + nx * ra, ay + ny * ra); ctx.lineTo(bx + nx * rb, by + ny * rb); ctx.lineTo(bx - nx * rb, by - ny * rb); ctx.lineTo(ax - nx * ra, ay - ny * ra); ctx.closePath();
  ctx.moveTo(ax + ra, ay); ctx.arc(ax, ay, ra, 0, TAU);
  ctx.moveTo(bx + rb, by); ctx.arc(bx, by, rb, 0, TAU);
}

const store = {};
// render once into an offscreen canvas and reuse every frame
function cached(key, w, h, fn) {
  if (!store[key]) { const cv = C.createCanvas(w, h), c = cv.getContext('2d'); fn(c, w, h); store[key] = cv; }
  return store[key];
}

// smooth tapered limb through points with widths (half-widths) at each point
function taper(ctx, pts, ws) {
  const n = pts.length, L = [], R = [];
  for (let i = 0; i < n; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
    const dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1, nx = -dy / d, ny = dx / d;
    L.push([pts[i][0] + nx * ws[i], pts[i][1] + ny * ws[i]]); R.push([pts[i][0] - nx * ws[i], pts[i][1] - ny * ws[i]]);
  }
  const e = pts[n - 1], pe = pts[n - 2], ed = Math.atan2(e[1] - pe[1], e[0] - pe[0]);
  ctx.beginPath();
  curve(ctx, L, false, 1 / 5);
  ctx.arc(e[0], e[1], ws[n - 1], ed + Math.PI / 2, ed - Math.PI / 2, true);
  curve(ctx, R.slice().reverse(), false, 1 / 5, true);
  const s0 = pts[0], s1 = pts[1], sd = Math.atan2(s1[1] - s0[1], s1[0] - s0[0]);
  ctx.arc(s0[0], s0[1], ws[0], sd - Math.PI / 2, sd + Math.PI / 2, true);
  ctx.closePath();
}

module.exports = { taper, cached, curve, glow, ellipseGlow, vgrad, text, measure, blurred, getLayer, bloom, vignette, grain, lightShafts, motes, bokeh, limb };
