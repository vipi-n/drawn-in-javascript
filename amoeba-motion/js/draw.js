// Drawing primitives: smooth paths, progressive strokes, glows, diagram marks, callouts, text.
const { TAU, clamp, lerp, rgba, backOut, easeOut, ss } = require('./core');
const { T, S } = require('./tex');

// Catmull-Rom through points, appended to the current path (consistent winding = union under nonzero fill)
function trace(ctx, pts, closed = true) {
  const n = pts.length;
  if (n < 2) return;
  ctx.moveTo(pts[0][0], pts[0][1]);
  if (pts.poly) { for (let i = 1; i < n; i++) ctx.lineTo(pts[i][0], pts[i][1]); if (closed) ctx.closePath(); return; }
  const last = closed ? n : n - 1;
  for (let i = 0; i < last; i++) {
    const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
    const a = closed || i > 0 ? p0 : p1, d = closed || i < n - 2 ? p3 : p2;
    ctx.bezierCurveTo(p1[0] + (p2[0] - a[0]) / 6, p1[1] + (p2[1] - a[1]) / 6, p2[0] - (d[0] - p1[0]) / 6, p2[1] - (d[1] - p1[1]) / 6, p2[0], p2[1]);
  }
  if (closed) ctx.closePath();
}
function shape(ctx, pts, closed = true) { ctx.beginPath(); trace(ctx, pts, closed); }

function polyLen(pts, closed) {
  let L = 0;
  for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  if (closed) L += Math.hypot(pts[0][0] - pts[pts.length - 1][0], pts[0][1] - pts[pts.length - 1][1]);
  return L;
}
// first fraction p of a polyline (closed -> loops back to start)
function partial(pts, p, closed = false) {
  const src = closed ? pts.concat([pts[0]]) : pts;
  if (p >= 1) return src;
  const total = polyLen(src), want = total * clamp(p), out = [src[0]];
  let acc = 0;
  for (let i = 1; i < src.length; i++) {
    const seg = Math.hypot(src[i][0] - src[i - 1][0], src[i][1] - src[i - 1][1]);
    if (acc + seg >= want) {
      const u = seg > 0 ? (want - acc) / seg : 0;
      out.push([lerp(src[i - 1][0], src[i][0], u), lerp(src[i - 1][1], src[i][1], u)]);
      return out;
    }
    acc += seg; out.push(src[i]);
  }
  return out;
}
function strokePart(ctx, pts, p, closed = false, smoothIt = true) {
  if (p <= 0) return null;
  const q = partial(pts, p, closed);
  ctx.beginPath();
  if (smoothIt) trace(ctx, q, false);
  else { ctx.moveTo(q[0][0], q[0][1]); for (let i = 1; i < q.length; i++) ctx.lineTo(q[i][0], q[i][1]); }
  ctx.stroke();
  return q[q.length - 1];
}
function line(ctx, x0, y0, x1, y1, p = 1) {
  if (p <= 0) return;
  ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(lerp(x0, x1, p), lerp(y0, y1, p)); ctx.stroke();
}
// progressive arc; returns the pen-tip position
function arcPart(ctx, x, y, r, a0, p, dir = 1) {
  if (p <= 0) return null;
  const a1 = a0 + dir * TAU * clamp(p);
  ctx.beginPath(); ctx.arc(x, y, r, a0, a1, dir < 0); ctx.stroke();
  return [x + Math.cos(a1) * r, y + Math.sin(a1) * r];
}
function circlePts(x, y, r, n = 64, a0 = 0) {
  const o = [];
  for (let i = 0; i < n; i++) { const a = a0 + TAU * i / n; o.push([x + Math.cos(a) * r, y + Math.sin(a) * r]); }
  return o;
}

function glow(ctx, x, y, r, col, a = 1) {
  if (a <= 0 || r <= 0) return;
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, rgba(col, a)); g.addColorStop(.35, rgba(col, a * .35)); g.addColorStop(1, rgba(col, 0));
  ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
}
// glowing pen tip used while geometry is being constructed
function spark(ctx, pt, s = 1, a = 1, col = '#ffe6a8') {
  if (!pt || a <= 0) return;
  glow(ctx, pt[0], pt[1], 26 * s, col, .55 * a);
  ctx.fillStyle = rgba('#fffaf0', a); ctx.beginPath(); ctx.arc(pt[0], pt[1], 2.6 * s, 0, TAU); ctx.fill();
  ctx.strokeStyle = rgba('#fff4d6', .7 * a); ctx.lineWidth = 1;
  line(ctx, pt[0] - 9 * s, pt[1], pt[0] + 9 * s, pt[1]); line(ctx, pt[0], pt[1] - 9 * s, pt[0], pt[1] + 9 * s);
}
function dot(ctx, x, y, r, col, a = 1) { ctx.fillStyle = rgba(col, a); ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); }
function ring(ctx, x, y, r, col, a = 1, w = 1.5) { ctx.strokeStyle = rgba(col, a); ctx.lineWidth = w; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke(); }

// texture inside the current clip, centred on (ox,oy) so it travels with its object; tile=true covers the whole viewport
function texture(ctx, img, a, ox = 0, oy = 0, tile = false) {
  if (a <= 0 || module.exports.low) return;
  ctx.save(); ctx.globalAlpha *= a;
  if (!tile) ctx.drawImage(img, ox - S / 2, oy - S / 2);
  else {
    const m = ctx.getTransform(), det = m.a * m.d - m.b * m.c;
    const inv = (X, Y) => [(m.d * (X - m.e) - m.c * (Y - m.f)) / det, (-m.b * (X - m.e) + m.a * (Y - m.f)) / det];
    const cs = [inv(0, 0), inv(1080, 0), inv(0, 1080), inv(1080, 1080)];
    const x0 = Math.min(...cs.map((c) => c[0])), x1 = Math.max(...cs.map((c) => c[0])), y0 = Math.min(...cs.map((c) => c[1])), y1 = Math.max(...cs.map((c) => c[1]));
    const gx = ox - S / 2, gy = oy - S / 2;
    for (let x = gx + Math.floor((x0 - gx) / S) * S; x < x1; x += S) for (let y = gy + Math.floor((y0 - gy) / S) * S; y < y1; y += S) ctx.drawImage(img, x, y);
  }
  ctx.restore();
}
// fill a path builder with colour, then texture it
function fillTex(ctx, build, col, img, a, ox = 0, oy = 0, scale = 1) {
  ctx.save(); ctx.beginPath(); build(ctx);
  if (col) { ctx.fillStyle = col; ctx.fill(); }
  if (img && a > 0) {
    ctx.clip();
    ctx.translate(ox, oy); ctx.scale(scale, scale);
    ctx.globalAlpha *= a; ctx.drawImage(img, -S / 2, -S / 2);
  }
  ctx.restore();
}

// ---------- diagram marks (red / blue) ----------
function arrow(ctx, x0, y0, x1, y1, p, col, w = 3, head = 16, a = 1) {
  if (p <= 0) return;
  const x = lerp(x0, x1, p), y = lerp(y0, y1, p), ang = Math.atan2(y1 - y0, x1 - x0);
  ctx.strokeStyle = rgba(col, a); ctx.fillStyle = rgba(col, a); ctx.lineWidth = w; ctx.lineCap = 'round';
  line(ctx, x0, y0, x - Math.cos(ang) * head * .6, y - Math.sin(ang) * head * .6);
  ctx.beginPath(); ctx.moveTo(x, y);
  ctx.lineTo(x - Math.cos(ang - .42) * head, y - Math.sin(ang - .42) * head);
  ctx.lineTo(x - Math.cos(ang + .42) * head, y - Math.sin(ang + .42) * head); ctx.closePath(); ctx.fill();
}
// path with perpendicular tick marks along it, drawn progressively
function tickPath(ctx, pts, p, col, a = 1, every = 34, tl = 9, w = 2.2, dash = false) {
  if (p <= 0) return null;
  const q = partial(pts, p);
  ctx.strokeStyle = rgba(col, a); ctx.lineWidth = w; ctx.lineCap = 'round';
  if (dash) ctx.setLineDash([10, 9]);
  ctx.beginPath(); ctx.moveTo(q[0][0], q[0][1]); for (let i = 1; i < q.length; i++) ctx.lineTo(q[i][0], q[i][1]); ctx.stroke();
  ctx.setLineDash([]);
  let acc = 0, next = every * .5;
  for (let i = 1; i < q.length; i++) {
    const dx = q[i][0] - q[i - 1][0], dy = q[i][1] - q[i - 1][1], L = Math.hypot(dx, dy);
    while (acc + L >= next) {
      const u = (next - acc) / L, x = q[i - 1][0] + dx * u, y = q[i - 1][1] + dy * u, nx = -dy / L, ny = dx / L;
      line(ctx, x - nx * tl, y - ny * tl, x + nx * tl, y + ny * tl);
      next += every;
    }
    acc += L;
  }
  return q[q.length - 1];
}
function angleArc(ctx, x, y, r, a0, a1, p, col, a = 1, w = 2) {
  if (p <= 0) return;
  ctx.strokeStyle = rgba(col, a); ctx.lineWidth = w;
  ctx.beginPath(); ctx.arc(x, y, r, a0, lerp(a0, a1, clamp(p)), a1 < a0); ctx.stroke();
}
// tally marks in groups of five; n may be fractional (last stroke being drawn)
function tally(ctx, x, y, n, col, h = 44, a = 1, w = 3.2) {
  ctx.strokeStyle = rgba(col, a); ctx.lineWidth = w; ctx.lineCap = 'round';
  const full = Math.floor(n), frac = n - full;
  for (let i = 0; i <= full && i < 400; i++) {
    const p = i < full ? 1 : frac;
    if (p <= 0) break;
    const g = Math.floor(i / 5), k = i % 5, gx = x + g * (h * 1.25);
    if (k < 4) {
      const lx = gx + k * h * .2 + Math.sin(i * 3.1) * 1.2;
      line(ctx, lx, y, lx + Math.sin(i * 1.7) * 2, y + h * easeOut(p));
    } else line(ctx, gx - h * .12, y + h * .78, lerp(gx - h * .12, gx + h * .74, easeOut(p)), lerp(y + h * .78, y + h * .18, easeOut(p)));
  }
}
// binary division tree: lv is continuous progress through levels (1.5 = level 1 grown halfway)
function divTree(ctx, x, y, lv, opt = {}) {
  const dy = opt.dy ?? 46, w = opt.w ?? 200, col = opt.col ?? '#f6ead0', node = opt.node ?? '#f2b84b', a = opt.a ?? 1, nr = opt.r ?? 6;
  if (lv <= 0 || a <= 0) return;
  ctx.lineCap = 'round';
  const rootP = clamp(lv * 3);
  for (let L = 0; L <= Math.ceil(lv) && L < 7; L++) {
    const n = 1 << L, span = w * (1 - Math.pow(.5, L)) * 2;
    for (let i = 0; i < n; i++) {
      const nx = n === 1 ? x : x - span / 2 + span * i / (n - 1), ny = y + L * dy;
      const grow = L === 0 ? rootP : clamp(lv - L);
      if (grow <= 0) continue;
      if (L > 0) {
        const pn = 1 << (L - 1), pspan = w * (1 - Math.pow(.5, L - 1)) * 2, pi = i >> 1;
        const px = pn === 1 ? x : x - pspan / 2 + pspan * pi / (pn - 1), py = y + (L - 1) * dy;
        ctx.strokeStyle = rgba(col, a * .8); ctx.lineWidth = 1.6;
        const e = easeOut(clamp(grow * 1.6));
        line(ctx, px, py, lerp(px, nx, e), lerp(py, ny, e));
      }
      const pop = backOut(clamp((grow - .45) * 2.2));
      if (pop > 0) {
        glow(ctx, nx, ny, nr * 4, node, .35 * a * pop);
        dot(ctx, nx, ny, nr * pop * (1 - L * .08), node, a);
      }
    }
  }
}

// circle callout: small ring at src, connector tangents, big framed circle at dst whose contents come from inner()
function callout(ctx, src, dst, p, inner, opt = {}) {
  if (p <= 0) return;
  const col = opt.col ?? '#fff6e0', w = opt.w ?? 2.4, a = opt.a ?? 1;
  const pr = easeOut(clamp(p * 3)), pl = clamp(p * 3 - .6), pc = backOut(clamp(p * 2.2 - 1.1));
  ctx.save();
  ctx.strokeStyle = rgba(col, a); ctx.lineWidth = w;
  arcPart(ctx, src.x, src.y, src.r, -Math.PI / 2, pr);
  const R = dst.r * pc;
  if (pl > 0) {
    const dx = dst.x - src.x, dy = dst.y - src.y, d = Math.hypot(dx, dy), th = Math.atan2(dy, dx);
    const ph = Math.acos(clamp((src.r - dst.r) / d, -1, 1));
    for (const s of [1, -1]) {
      const an = th + s * ph;
      const x0 = src.x + Math.cos(an) * src.r, y0 = src.y + Math.sin(an) * src.r;
      const x1 = dst.x + Math.cos(an) * dst.r, y1 = dst.y + Math.sin(an) * dst.r;
      ctx.lineWidth = w * .7; line(ctx, x0, y0, x1, y1, easeOut(pl));
    }
  }
  if (R > 1) {
    ctx.save();
    ctx.shadowColor = 'rgba(20,10,10,0.35)'; ctx.shadowBlur = 24; ctx.shadowOffsetY = 8;
    ctx.fillStyle = opt.bg ?? '#000'; ctx.beginPath(); ctx.arc(dst.x, dst.y, R, 0, TAU); ctx.fill();
    ctx.restore();
    ctx.save(); ctx.beginPath(); ctx.arc(dst.x, dst.y, R, 0, TAU); ctx.clip();
    inner(ctx, R / dst.r);
    ctx.restore();
    ctx.strokeStyle = rgba(col, a); ctx.lineWidth = w * 2; ctx.beginPath(); ctx.arc(dst.x, dst.y, R, 0, TAU); ctx.stroke();
    ctx.lineWidth = 1; ctx.strokeStyle = rgba(col, a * .5); ctx.beginPath(); ctx.arc(dst.x, dst.y, R + 9, 0, TAU); ctx.stroke();
  }
  ctx.restore();
}

// ---------- text ----------
function text(ctx, s, x, y, o = {}) {
  const size = o.size ?? 30, track = o.track ?? 0;
  ctx.save();
  ctx.font = `${size}px ${o.font ?? 'Didot'}`;
  ctx.fillStyle = rgba(o.color ?? '#f6ead0', o.alpha ?? 1);
  ctx.textBaseline = 'alphabetic';
  if (!track) { ctx.textAlign = o.align ?? 'left'; ctx.fillText(s, x, y); ctx.restore(); return; }
  const ws = [...s].map((ch) => ctx.measureText(ch).width), tw = ws.reduce((a, b) => a + b, 0) + track * (s.length - 1);
  let cx = o.align === 'center' ? x - tw / 2 : o.align === 'right' ? x - tw : x;
  const reveal = o.reveal ?? 1;
  [...s].forEach((ch, i) => {
    const k = clamp(reveal * (s.length + 4) - i, 0, 1);
    if (k > 0) { ctx.globalAlpha = k; ctx.fillText(ch, Math.round(cx), Math.round(y + (1 - k) * 8)); }
    cx += ws[i] + track;
  });
  ctx.restore();
}

module.exports = {
  trace, shape, polyLen, partial, strokePart, line, arcPart, circlePts, glow, spark, dot, ring,
  texture, fillTex, arrow, tickPath, angleArc, tally, divTree, callout, text,
};
