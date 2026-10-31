// Scene builders shared by several shots: parallax layer cameras, the dawn/day meadow backdrop with foreground blur,
// a macro leaf-surface backdrop, a smooth timed flight path, and butterfly flight poses.
const { W, H, TAU, clamp, lerp, ss, hash, rgba, mix, PAL, rng } = require('./core');
const D = require('./draw');
const M = require('./motion');
const F = require('./fx');
const Wd = require('./world');
const P = require('./plants');
const B = require('./butterfly');
const Cr = require('./critters');

const screen = (ctx) => ctx.setTransform(1, 0, 0, 1, 0, 0);
const SUN = { v: null };
// camera for a layer at parallax depth k (0 = locked to the screen, 1 = the world layer the camera follows, >1 nearer)
const layerCam = (c, k) => ({ x: 540 + (c.x - 540) * k, y: 540 + (c.y - 540) * k, z: Math.pow(c.z, k), r: (c.r ?? 0) * Math.min(1, k) });

// sky + sun + clouds + parallax meadow (world y 700 = horizon) + bokeh
function meadowBack(ctx, c, t, tod, o = {}) {
  const hz = F.toScreen(layerCam(c, .3), 0, 700)[1];
  Wd.sky(ctx, tod, { horizon: hz + 40, t, px: -c.x * .05 });
  if (o.sun) {
    const sp = F.toScreen(layerCam(c, .12), o.sun[0], o.sun[1]);
    Wd.rays(ctx, sp[0], sp[1], o.rays ?? .8, t, { n: 16 });
    Wd.sun(ctx, sp[0], sp[1], o.sunR ?? 52, o.sunA ?? 1);
    SUN.v = [sp[0], sp[1], (o.sunA ?? 1) * clamp(o.rays ?? .8) * (o.flare ?? 1)]; // film.js adds a lens flare on top
  }
  Wd.clouds(ctx, tod, t, { px: -c.x * .25, py: (540 - c.y) * .25, n: o.clouds ?? 5, y0: o.cloudY ?? 90 });
  if (o.flock) Cr.flock(ctx, t, o.flock);
  Wd.meadow(ctx, c, t, tod, o);
  if (o.bokeh !== false) Wd.bokeh(ctx, t, { cx: c.x, cy: c.y, n: o.bokehN ?? 14, a: o.bokehA ?? .16, cols: o.bokehCols ?? ['#fff0b8', '#ffd0e0', '#d8ffc0'] });
}
// out-of-focus foreground plants (nearer than the world layer)
function foreground(ctx, c, t, o = {}) {
  const lc = layerCam(c, o.k ?? 1.45);
  M.cam(ctx, lc);
  const r = rng(o.seed ?? 77), base = o.y ?? 1180, dof = o.dof ?? 9;
  for (let i = 0; i < (o.n ?? 7); i++) {
    const x = -300 + i * 300 + r() * 160, kind = i % 3;
    if (kind === 0) P.coneflower(ctx, x, base + 220, 2.2, { t, seed: i, dof, h: 150 + r() * 60 });
    else if (kind === 1) P.grass(ctx, x - 120, x + 120, base + 80, t, { seed: i + 3, h: 260, w: 14, gap: 26, dof, cols: ['#3f7a34', '#5a9a40'] });
    else P.leaf(ctx, { x, y: base, ang: -1.9 + r() * .6, L: 420, W: 120, dof, col: '#4f8f3c' });
  }
}
// close-up of a leaf surface stretching to a soft horizon, bokeh of the plant behind (screen space + camera drift)
function macroBack(ctx, c, t, o = {}) {
  screen(ctx);
  const hz = (o.hz ?? 560) + (540 - c.y) * .4 * c.z;
  const g = ctx.createLinearGradient(0, 0, 0, hz + 40);
  g.addColorStop(0, rgba(o.top ?? '#a8d888')); g.addColorStop(1, rgba(o.mid ?? '#e8f4c8'));
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  Wd.bokeh(ctx, t * 2, { cx: c.x * 2.5, cy: c.y * 2.5, n: 16, r0: 40, r1: 120, a: .22, par: .5, cols: o.bokehCols ?? ['#fff6c8', '#c8f0a0', '#ffffff', '#f0d0ff'], seed: 5 });
  // the leaf: a plane below the horizon with veins sweeping toward the viewer
  const lg = ctx.createLinearGradient(0, hz, 0, H);
  lg.addColorStop(0, rgba(o.far ?? '#9cc87a')); lg.addColorStop(.35, rgba(o.near ?? '#6faa4c')); lg.addColorStop(1, rgba(o.deep ?? '#3f7a2e'));
  ctx.fillStyle = lg; ctx.fillRect(0, hz, W, H - hz);
  const ox = (c.x - 540) * c.z;
  ctx.strokeStyle = rgba('#e8f8c8', .35); ctx.lineCap = 'round';
  for (let i = -6; i <= 6; i++) {
    const x0 = 540 + i * 40 - ox * .2, x1 = 540 + i * 420 - ox;
    ctx.lineWidth = 2 + Math.abs(i) * .6; D.line(ctx, x0, hz, x1, H + 40);
  }
  ctx.strokeStyle = rgba('#f4ffe0', .55); ctx.lineWidth = 10; D.line(ctx, 540 - ox * .2, hz, 540 - ox * 1.6 + 260, H + 40);
  // dew beads catching the light
  { const pts = []; for (let i = 0; i < 12; i++) { const v = .15 + hash(i + 900) * .85, y = hz + v * (H - hz); pts.push([((hash(i + 901) * 1500 - ox * (.2 + v * 1.4)) % 1500 + 1500) % 1500 - 210, y, 2 + v * 6]); } Cr.glints(ctx, pts, t, .9); }
  // fine cells and hairs, more visible nearer
  const r = rng(13);
  for (let i = 0; i < 220; i++) {
    const v = Math.pow(r(), 1.6), y = hz + v * (H - hz + 60), x = (r() * 1600 - 260 - ox * (.2 + v)) % 1400;
    ctx.strokeStyle = rgba('#f8ffe8', .25 + v * .25); ctx.lineWidth = .8 + v * 1.6;
    D.line(ctx, x, y, x + 4 + v * 10, y - 3 - v * 8);
  }
  // soft haze at the horizon
  const hg = ctx.createLinearGradient(0, hz - 30, 0, hz + 120);
  hg.addColorStop(0, rgba('#f4ffe0', 0)); hg.addColorStop(.3, rgba('#f4ffe0', .55)); hg.addColorStop(1, rgba('#f4ffe0', 0));
  ctx.fillStyle = hg; ctx.fillRect(0, hz - 30, W, 150);
  // a soft shaft of light slowly sweeping across
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  const sx = 540 + Math.sin(t * .35) * 420, lg0 = ctx.createLinearGradient(sx - 260, 0, sx + 260, 0);
  lg0.addColorStop(0, rgba('#fff8d8', 0)); lg0.addColorStop(.5, rgba('#fff8d8', .12)); lg0.addColorStop(1, rgba('#fff8d8', 0));
  ctx.fillStyle = lg0; ctx.fillRect(0, 0, W, H); ctx.restore();
  return hz;
}

// smooth path through timed keys [[t, x, y], ...] (Catmull-Rom in time); returns [x, y, heading, speed]
function flight(keys, t) {
  const n = keys.length;
  if (t <= keys[0][0]) { const a = keys[0], b = keys[1]; return [a[1], a[2], Math.atan2(b[2] - a[2], b[1] - a[1]), 0]; }
  if (t >= keys[n - 1][0]) { const a = keys[n - 2], b = keys[n - 1]; return [b[1], b[2], Math.atan2(b[2] - a[2], b[1] - a[1]), 0]; }
  let i = 0; while (i < n - 2 && t > keys[i + 1][0]) i++;
  const p0 = keys[Math.max(0, i - 1)], p1 = keys[i], p2 = keys[i + 1], p3 = keys[Math.min(n - 1, i + 2)];
  const u = (t - p1[0]) / (p2[0] - p1[0]);
  const cr = (a, b, c, d, u) => .5 * (2 * b + (-a + c) * u + (2 * a - 5 * b + 4 * c - d) * u * u + (-a + 3 * b - 3 * c + d) * u * u * u);
  const x = cr(p0[1], p1[1], p2[1], p3[1], u), y = cr(p0[2], p1[2], p2[2], p3[2], u);
  const e = .01, u2 = Math.min(1, u + e), x2 = cr(p0[1], p1[1], p2[1], p3[1], u2), y2 = cr(p0[2], p1[2], p2[2], p3[2], u2);
  return [x, y, Math.atan2(y2 - y, x2 - x), Math.hypot(x2 - x, y2 - y) / (e * (p2[0] - p1[0]))];
}
// pose for a butterfly heading `hd` (screen angle) seen a little from above; bank tips it into turns
function flyPose(hd, bank = 0, side = .78) {
  const c = Math.cos(hd), k = clamp(c * 3, -1, 1);
  return { yaw: hd + Math.PI / 2, roll: -side * k - bank, pitch: -.15 };
}
// draw a flying butterfly along a timed path; returns its state
function flyer(ctx, keys, t, o = {}) {
  const [x, y, hd, sp] = flight(keys, t);
  const th = B.flapAt(t + (o.ph ?? 0), { f: o.f ?? 4.6, mid: .45, amp: .8, glide: o.glide ?? 0 });
  // the body rises on each downstroke and sinks as the wings lift
  B.butterfly(ctx, { x, y: y + (th - .45) * 10 * (o.s ?? 1), s: o.s ?? 1, ...flyPose(hd, o.bank ?? 0, o.side ?? .78), flap: th, sex: o.sex ?? 0, alpha: o.alpha, glow: o.glow });
  return { x, y, hd, sp, th };
}
// sparkle trail behind a moving point (world coords; call under the camera)
function trail(ctx, keys, t, n = 16, dt = .035, col = '#fff2c0', a = 1) {
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let k = 1; k <= n; k++) {
    const [x, y] = flight(keys, t - k * dt), u = k / n;
    D.glow(ctx, x + Math.sin(k * 3.1 + t * 7) * 6, y + Math.cos(k * 2.3 + t * 5) * 6, 16 * (1 - u) + 4, col, .5 * (1 - u) * a);
  }
  ctx.restore();
}

module.exports = { SUN, layerCam, meadowBack, foreground, macroBack, flight, flyPose, flyer, trail, screen };
