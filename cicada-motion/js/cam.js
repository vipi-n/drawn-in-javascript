// Camera: keyframed spline moves with continuous velocity + hand-held drift + impact shakes.
const { W, H, clamp, lerp, noise, ss } = require('./core');

// keys: [[t, x, y, zoom, rot], ...] (t ascending). Catmull-Rom through the keys, eased in time per segment.
function path(keys, t) {
  if (t <= keys[0][0]) return keys[0].slice(1);
  const n = keys.length;
  if (t >= keys[n - 1][0]) return keys[n - 1].slice(1);
  let i = 0; while (i < n - 2 && keys[i + 1][0] <= t) i++;
  const k0 = keys[Math.max(0, i - 1)], k1 = keys[i], k2 = keys[i + 1], k3 = keys[Math.min(n - 1, i + 2)];
  let u = (t - k1[0]) / (k2[0] - k1[0]);
  u = u * u * (3 - 2 * u) * .5 + u * .5; // soften starts/stops without fully stopping
  const out = [];
  for (let c = 1; c < 5; c++) {
    const p0 = k0[c] ?? 0, p1 = k1[c] ?? 0, p2 = k2[c] ?? 0, p3 = k3[c] ?? 0;
    out.push(.5 * ((2 * p1) + (-p0 + p2) * u + (2 * p0 - 5 * p1 + 4 * p2 - p3) * u * u + (-p0 + 3 * p1 - 3 * p2 + p3) * u * u * u));
  }
  return out;
}
// returns {x,y,z,r}; hand = hand-held amount (px), shakes = [[t, amp], ...]
function at(keys, t, o = {}) {
  const [x, y, z = 1, r = 0] = path(keys, t);
  const hand = o.hand ?? 4, seed = o.seed ?? 3;
  let hx = noise(t * .45 + seed) * hand + noise(t * 1.3 + seed * 2) * hand * .35;
  let hy = noise(t * .4 + seed + 50) * hand + noise(t * 1.1 + seed * 3) * hand * .35;
  let hr = noise(t * .3 + seed + 90) * .004 * (hand / 4);
  for (const [ts, amp, dur = .5] of o.shakes || []) {
    const d = t - ts;
    if (d >= 0 && d < dur) { const e = Math.pow(1 - d / dur, 2) * amp; hx += Math.sin(d * 63) * e; hy += Math.cos(d * 57) * e; hr += Math.sin(d * 41) * e * .0008; }
  }
  return { x: x + hx / Math.max(.3, z), y: y + hy / Math.max(.3, z), z, r: r + hr };
}
function apply(ctx, c) {
  ctx.translate(W / 2, H / 2); ctx.rotate(c.r); ctx.scale(c.z, c.z); ctx.translate(-c.x, -c.y);
}
// world -> screen
function toScreen(c, wx, wy) {
  const dx = (wx - c.x) * c.z, dy = (wy - c.y) * c.z, cs = Math.cos(c.r), sn = Math.sin(c.r);
  return [W / 2 + dx * cs - dy * sn, H / 2 + dx * sn + dy * cs];
}
// a parallax plane: depth d (0 = at infinity, 1 = camera plane). Returns a camera for that plane.
function plane(c, d, ox = W / 2, oy = H / 2) {
  return { x: lerp(ox, c.x, d), y: lerp(oy, c.y, d), z: lerp(1, c.z, d), r: c.r * d };
}
// beat-synced zoom kick: returns extra zoom
function kick(t, beat, t0, t1, amt = .012) {
  if (t < t0 || t > t1) return 0;
  const p = ((t - t0) / beat) % 1;
  return amt * Math.exp(-p * 7);
}

module.exports = { path, at, apply, toScreen, plane, kick };
