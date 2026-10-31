// Camera rig: keyframed spline moves (continuous velocity), hand-held drift, impact shakes, parallax layers.
const { W, H, TAU, clamp, lerp, noise } = require('./core');

// keys: [[t, x, y, z, r?], ...]; Hermite with Catmull-Rom tangents (non-uniform), zero velocity at the ends
function track(keys, t) {
  if (t <= keys[0][0]) return { x: keys[0][1], y: keys[0][2], z: keys[0][3], r: keys[0][4] ?? 0 };
  const n = keys.length, L = keys[n - 1];
  if (t >= L[0]) return { x: L[1], y: L[2], z: L[3], r: L[4] ?? 0 };
  let i = 0;
  while (i < n - 2 && t > keys[i + 1][0]) i++;
  const k0 = keys[i], k1 = keys[i + 1], dt = k1[0] - k0[0], u = (t - k0[0]) / dt;
  const tan = (j, c) => {
    if (j <= 0 || j >= n - 1) return 0;
    const a = keys[j - 1], b = keys[j + 1];
    return ((b[c] ?? 0) - (a[c] ?? 0)) / (b[0] - a[0]);
  };
  const h = (c) => {
    const p0 = k0[c] ?? 0, p1 = k1[c] ?? 0, m0 = tan(i, c) * dt, m1 = tan(i + 1, c) * dt;
    const u2 = u * u, u3 = u2 * u;
    return (2 * u3 - 3 * u2 + 1) * p0 + (u3 - 2 * u2 + u) * m0 + (-2 * u3 + 3 * u2) * p1 + (u3 - u2) * m1;
  };
  // zoom interpolated in log space so push-ins feel linear
  const lz = (() => { const a = keys.map((k) => [k[0], 0, 0, Math.log(k[3])]); const s = track0(a, t, i); return Math.exp(s); })();
  return { x: h(1), y: h(2), z: lz, r: h(4) };
}
function track0(keys, t, i) {
  const n = keys.length, k0 = keys[i], k1 = keys[i + 1], dt = k1[0] - k0[0], u = (t - k0[0]) / dt;
  const tan = (j) => (j <= 0 || j >= n - 1 ? 0 : (keys[j + 1][3] - keys[j - 1][3]) / (keys[j + 1][0] - keys[j - 1][0]));
  const m0 = tan(i) * dt, m1 = tan(i + 1) * dt, u2 = u * u, u3 = u2 * u;
  return (2 * u3 - 3 * u2 + 1) * k0[3] + (u3 - 2 * u2 + u) * m0 + (-2 * u3 + 3 * u2) * k1[3] + (u3 - u2) * m1;
}

// cam = rig(keys, t, {hand, seed, shakes:[[t0, amp, freq, decay]]})
function rig(keys, t, o = {}) {
  const c = track(keys, t), hand = o.hand ?? 1, s = o.seed ?? 3;
  c.x += hand * (noise(t * .31, s) * 9 + noise(t * .93, s + 5) * 2.5) / c.z;
  c.y += hand * (noise(t * .27, s + 9) * 7 + noise(t * .87, s + 13) * 2) / c.z;
  c.r += hand * noise(t * .23, s + 17) * .0045;
  c.z *= 1 + hand * noise(t * .19, s + 21) * .006;
  for (const [t0, amp, f = 9, d = 7] of o.shakes ?? []) {
    const e = t - t0;
    if (e < 0 || e > 2.5) continue;
    const k = amp * Math.exp(-d * e);
    c.x += k * Math.sin(TAU * f * e) / c.z; c.y += k * .8 * Math.sin(TAU * f * 1.31 * e + 1.3) / c.z; c.r += k * .0009 * Math.sin(TAU * f * .7 * e + 2);
  }
  return c;
}
// enter a parallax plane p (0 = infinitely far, 1 = subject plane, >1 = in front of it)
function push(g, c, p = 1) {
  g.save();
  g.translate(W / 2, H / 2);
  if (c.r) g.rotate(c.r);
  const s = Math.pow(c.z, p);
  g.scale(s, s);
  g.translate(-c.x * p, -c.y * p);
}
// screen position of a point on plane p
function toScreen(c, x, y, p = 1) {
  const s = Math.pow(c.z, p), dx = (x - c.x * p) * s, dy = (y - c.y * p) * s, cs = Math.cos(c.r), sn = Math.sin(c.r);
  return [W / 2 + dx * cs - dy * sn, H / 2 + dx * sn + dy * cs];
}
// plane-p coordinates of a screen point (inverse of toScreen)
function fromScreen(c, X, Y, p = 1) {
  const s = Math.pow(c.z, p), cs = Math.cos(-c.r), sn = Math.sin(-c.r), dx = X - W / 2, dy = Y - H / 2;
  return [(dx * cs - dy * sn) / s + c.x * p, (dx * sn + dy * cs) / s + c.y * p];
}

// musical zoom kicks from bar start t0 to t1: strong on the downbeat, softer on beat 3, a tick on 2 and 4
function pulse(t, t0, t1, amp = .014) {
  if (t < t0 || t > t1 + .6) return 0;
  const k = Math.floor((t - t0) / .6), dt = t - t0 - k * .6, w = k % 4 === 0 ? 1 : k % 4 === 2 ? .5 : .16;
  return amp * w * Math.exp(-dt * 9) * (1 - Math.exp(-dt * 60));
}

module.exports = { track, rig, push, toScreen, fromScreen, pulse };
