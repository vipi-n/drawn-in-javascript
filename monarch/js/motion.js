// Motion toolkit: easings, springs, keyframed cameras (with roll), closed-form swimmers, particles,
// 3D projected rings, morphs and kinetic type. Everything is a pure function of time so frames render in any order.
const { W, H, TAU, clamp, lerp, inv, ss, hash, noise1, rgba, rng } = require('./core');

// ---------- easing ----------
const expoInOut = (t) => { t = clamp(t); return t === 0 ? 0 : t === 1 ? 1 : t < .5 ? Math.pow(2, 20 * t - 10) / 2 : (2 - Math.pow(2, -20 * t + 10)) / 2; };
const expoOut = (t) => { t = clamp(t); return t === 1 ? 1 : 1 - Math.pow(2, -10 * t); };
const expoIn = (t) => { t = clamp(t); return t === 0 ? 0 : Math.pow(2, 10 * t - 10); };
const quintInOut = (t) => { t = clamp(t); return t < .5 ? 16 * t ** 5 : 1 - Math.pow(-2 * t + 2, 5) / 2; };
const quartOut = (t) => 1 - Math.pow(1 - clamp(t), 4);
const sineInOut = (t) => -(Math.cos(Math.PI * clamp(t)) - 1) / 2;
const elasticOut = (t) => { t = clamp(t); if (t === 0 || t === 1) return t; return Math.pow(2, -10 * t) * Math.sin((t * 10 - .75) * TAU / 3) + 1; };
const backOutK = (t, k = 1.70158) => { t = clamp(t); return 1 + (k + 1) * Math.pow(t - 1, 3) + k * Math.pow(t - 1, 2); };
// damped spring step response: 0 -> 1 with overshoot, t in seconds
const spring = (t, f = 2.2, d = 5.5) => (t <= 0 ? 0 : 1 - Math.exp(-d * t) * Math.cos(TAU * f * t));
// a decaying wobble around 0 (for impacts)
const wobble = (t, f = 6, d = 6) => (t <= 0 ? 0 : Math.exp(-d * t) * Math.sin(TAU * f * t));

// ---------- keyframes ----------
function mixVal(a, b, u) {
  if (typeof a === 'number') return lerp(a, b, u);
  const o = {};
  for (const k in a) o[k] = lerp(a[k], b[k] ?? a[k], u);
  return o;
}
// ks: [[t, value, ease?], ...]  ease applies to the segment ending at that key
function keys(t, ks, ez = quintInOut) {
  if (t <= ks[0][0]) return ks[0][1];
  for (let i = 1; i < ks.length; i++) {
    if (t <= ks[i][0]) { const [t0, a] = ks[i - 1], [t1, b, e] = ks[i]; return mixVal(a, b, (e || ez)((t - t0) / (t1 - t0))); }
  }
  return ks[ks.length - 1][1];
}

// ---------- camera ----------
// c: {x,y,z,r}; world point (c.x,c.y) lands on screen (sx,sy), rotated by r
function cam(ctx, c, sx = W / 2, sy = H / 2) {
  const z = c.z ?? 1, r = c.r ?? 0, cs = Math.cos(r) * z, sn = Math.sin(r) * z;
  ctx.setTransform(cs, sn, -sn, cs, sx - (cs * c.x - sn * c.y), sy - (sn * c.x + cs * c.y));
}
// gentle hand-held drift added to any camera
function drift(c, t, amt = 1) {
  return { x: c.x + amt * 7 * noise1(t * .45, 11), y: c.y + amt * 6 * noise1(t * .4, 12), z: c.z, r: (c.r ?? 0) + amt * .006 * noise1(t * .3, 13) };
}
function shake(c, age, amt = 10) {
  if (age < 0 || age > 1.2) return c;
  const k = Math.exp(-age * 6) * amt;
  return { x: c.x + k * noise1(age * 40, 21), y: c.y + k * noise1(age * 40, 22), z: c.z, r: (c.r ?? 0) + k * .002 * noise1(age * 30, 23) };
}
function project(ctx, x, y) { const m = ctx.getTransform(); return [m.a * x + m.c * y + m.e, m.b * x + m.d * y + m.f]; }
function screen(ctx) { ctx.setTransform(1, 0, 0, 1, 0, 0); }

// ---------- closed-form swimmers ----------
function swimmers(seed, n, opt = {}) {
  const r = rng(seed), out = [];
  const span = opt.span ?? 2600, sp = opt.speed ?? 40;
  for (let i = 0; i < n; i++) {
    const a = r() * TAU, v = sp * (.5 + r());
    out.push({
      x: (opt.cx ?? 540) + (r() - .5) * span, y: (opt.cy ?? 540) + (r() - .5) * span,
      vx: Math.cos(a) * v, vy: Math.sin(a) * v,
      ax: (opt.wig ?? 30) * (.4 + r()), ay: (opt.wig ?? 30) * (.4 + r()),
      wx: (opt.freq ?? 1.2) * (.5 + r()), wy: (opt.freq ?? 1.2) * (.5 + r()), px: r() * TAU, py: r() * TAU,
      s: r(), h: r(), k: i,
    });
  }
  return out;
}
function swimAt(s, t) {
  const x = s.x + s.vx * t + s.ax * Math.sin(s.wx * t + s.px), y = s.y + s.vy * t + s.ay * Math.sin(s.wy * t + s.py);
  const dx = s.vx + s.ax * s.wx * Math.cos(s.wx * t + s.px), dy = s.vy + s.ay * s.wy * Math.cos(s.wy * t + s.py);
  return [x, y, Math.atan2(dy, dx), Math.hypot(dx, dy)];
}
// wrap a swimmer into a window around the camera so the population never runs out
function wrapNear(x, y, cx, cy, span) {
  const wx = ((x - cx + span / 2) % span + span) % span - span / 2 + cx, wy = ((y - cy + span / 2) % span + span) % span - span / 2 + cy;
  return [wx, wy];
}
function trail(fn, t0, t1, n = 40) { const o = []; for (let i = 0; i <= n; i++) { const p = fn(lerp(t0, t1, i / n)); o.push([p[0], p[1]]); } return o; }

// ---------- particles ----------
// ballistic splash droplets: age in s, returns positions
function splashDrops(x, y, age, n, seed, opt = {}) {
  const r = rng(seed), out = [], g = opt.g ?? 1400;
  for (let i = 0; i < n; i++) {
    const a = (opt.a0 ?? -Math.PI) + (opt.spread ?? Math.PI) * r(), v = (opt.v ?? 420) * (.45 + r() * .75), life = (opt.life ?? .9) * (.6 + r() * .5);
    if (age < 0 || age > life) continue;
    const px = x + Math.cos(a) * v * age, py = y + Math.sin(a) * v * age + .5 * g * age * age;
    out.push([px, py, (opt.size ?? 5) * (.5 + r()) * (1 - age / life * .5), 1 - age / life, a]);
  }
  return out;
}
// radial burst with drag (slows down), e.g. nutrients, sparkles, fragments
function burst(age, n, seed, opt = {}) {
  const r = rng(seed), out = [], drag = opt.drag ?? 3;
  for (let i = 0; i < n; i++) {
    const a = r() * TAU, v = (opt.v ?? 300) * (.4 + r() * .8), life = (opt.life ?? 1.2) * (.6 + r() * .6);
    if (age < 0 || age > life) continue;
    const d = v * (1 - Math.exp(-drag * age)) / drag;
    out.push([Math.cos(a) * d, Math.sin(a) * d, 1 - age / life, a, r()]);
  }
  return out;
}

// ---------- 3D ----------
function rot3(p, rx, ry, rz) {
  let [x, y, z] = p, t;
  t = y * Math.cos(rx) - z * Math.sin(rx); z = y * Math.sin(rx) + z * Math.cos(rx); y = t;
  t = x * Math.cos(ry) + z * Math.sin(ry); z = -x * Math.sin(ry) + z * Math.cos(ry); x = t;
  t = x * Math.cos(rz) - y * Math.sin(rz); y = x * Math.sin(rz) + y * Math.cos(rz); x = t;
  return [x, y, z];
}
function ring3d(cx, cy, r, rx, ry, rz, n = 96, f = 1600, a0 = 0) {
  const o = [];
  for (let i = 0; i < n; i++) {
    const a = a0 + TAU * i / n, [x, y, z] = rot3([Math.cos(a) * r, Math.sin(a) * r, 0], rx, ry, rz), s = f / (f + z);
    o.push([cx + x * s, cy + y * s, z]);
  }
  return o;
}
// teardrop (tip up) with the same point count as a circle, for circle -> droplet morphs
function teardrop(cx, cy, r, n = 96, k = 1) {
  const o = [];
  for (let i = 0; i < n; i++) {
    const u = TAU * i / n, c = Math.cos(u);
    o.push([cx + r * Math.sin(u) * Math.pow(Math.abs(Math.sin(u / 2)), k), cy - r * c * (c > 0 ? 1.6 : 1)]);
  }
  return o;
}
function morph(a, b, u) { return a.map((p, i) => [lerp(p[0], b[i][0], u), lerp(p[1], b[i][1], u)]); }

// ---------- kinetic type ----------
// letters rise in one by one with an overshoot; p 0..1 (can go to 2 for exit: letters fall away)
function kinetic(ctx, s, x, y, p, o = {}) {
  const size = o.size ?? 60, track = o.track ?? 0, font = o.font ?? 'AvDemi', n = s.length;
  ctx.save();
  ctx.font = `${size}px ${font}`; ctx.textBaseline = 'alphabetic';
  const ws = [...s].map((ch) => ctx.measureText(ch).width), tw = ws.reduce((a, b) => a + b, 0) + track * (n - 1);
  let cx = o.align === 'left' ? x : o.align === 'right' ? x - tw : x - tw / 2;
  const stag = o.stagger ?? .6;
  [...s].forEach((ch, i) => {
    const d = i / Math.max(1, n - 1) * stag, u = clamp((p - d) / (1 - stag));
    const out = clamp(((o.out ?? 0) - d) / (1 - stag));
    const k = backOutK(u, 2.2), a = clamp(u * 2) * (1 - out);
    if (a > 0) {
      ctx.save();
      ctx.translate(Math.round(cx + ws[i] / 2), Math.round(y + (1 - k) * size * .7 - out * size * .5));
      ctx.rotate((1 - k) * (i % 2 ? .25 : -.25));
      ctx.globalAlpha = a * (o.alpha ?? 1);
      ctx.fillStyle = o.color ?? '#f6ead0'; ctx.textAlign = 'center';
      ctx.fillText(ch, 0, 0);
      ctx.restore();
    }
    cx += ws[i] + track;
  });
  ctx.restore();
}

// ---------- screen-space parallax specks (out-of-focus debris in front of the lens) ----------
function specks(ctx, camx, camy, t, o = {}) {
  const n = o.n ?? 16, par = o.par ?? 1.8, col = o.col ?? '#ffffff';
  screen(ctx);
  for (let i = 0; i < n; i++) {
    const h1 = hash(i * 3 + 501), h2 = hash(i * 3 + 502), h3 = hash(i * 3 + 503);
    const r = 6 + h3 * (o.big ?? 34), span = W + 300;
    const x = ((h1 * span - camx * par * (.6 + h3) + t * (o.vx ?? 14) * (h2 - .5)) % span + span) % span - 150;
    const y = ((h2 * span - camy * par * (.6 + h3) - t * (o.vy ?? 22) * (.3 + h1)) % span + span) % span - 150;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, rgba(col, (o.a ?? .22) * (.5 + h1 * .5))); g.addColorStop(.6, rgba(col, (o.a ?? .22) * .3)); g.addColorStop(1, rgba(col, 0));
    ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
}

module.exports = {
  expoInOut, expoOut, expoIn, quintInOut, quartOut, sineInOut, elasticOut, backOutK, spring, wobble,
  keys, cam, drift, shake, project, screen, swimmers, swimAt, wrapNear, trail, splashDrops, burst,
  rot3, ring3d, teardrop, morph, kinetic, specks,
};
