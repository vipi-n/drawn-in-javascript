// Small life that makes the world feel inhabited: a bumblebee working the flowers, a distant flock of birds, dew glints.
const { TAU, clamp, lerp, hash, noise1, rgba } = require('./core');
const D = require('./draw');

// a fuzzy bumblebee; ang = heading (screen), t drives the wing blur
function bee(ctx, x, y, s, ang, t, o = {}) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(ang); ctx.scale(s, s);
  if (o.alpha !== undefined) ctx.globalAlpha *= o.alpha;
  // wings: a translucent blur of strokes
  for (const sd of [-1, 1]) {
    const a = Math.sin(t * 190) * .6;
    ctx.save(); ctx.translate(-2, sd * 4); ctx.rotate(sd * (-.9 + a));
    ctx.fillStyle = rgba('#e8f4ff', .35); ctx.beginPath(); ctx.ellipse(10, 0, 12, 5, 0, 0, TAU); ctx.fill();
    ctx.rotate(sd * .7); ctx.fillStyle = rgba('#e8f4ff', .22); ctx.beginPath(); ctx.ellipse(9, 0, 11, 4.5, 0, 0, TAU); ctx.fill();
    ctx.restore();
  }
  // abdomen bands, thorax, head
  const bands = ['#1a1410', '#f2c230', '#1a1410', '#f2c230', '#f8f0e0'];
  ctx.save(); ctx.beginPath(); ctx.ellipse(-8, 0, 11, 8.5, 0, 0, TAU); ctx.clip();
  bands.forEach((c, i) => { ctx.fillStyle = c; ctx.fillRect(-20 + i * 4.6, -10, 4.8, 20); });
  ctx.restore();
  ctx.fillStyle = '#f2c230'; ctx.beginPath(); ctx.ellipse(3, 0, 7, 7.5, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = '#1a1410'; ctx.beginPath(); ctx.ellipse(4, 0, 4, 4.5, 0, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.ellipse(11, 0, 4, 4.2, 0, 0, TAU); ctx.fill();
  // fuzz
  ctx.strokeStyle = rgba('#f8d870', .7); ctx.lineWidth = .8;
  for (let k = 0; k < 26; k++) { const a = hash(k) * TAU, r = k < 13 ? 8.5 : 7.5, cx = k < 13 ? -8 : 3; ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * r * .9, Math.sin(a) * r * .9); ctx.lineTo(cx + Math.cos(a) * (r + 2), Math.sin(a) * (r + 2)); ctx.stroke(); }
  // legs dangling with pollen baskets
  ctx.strokeStyle = '#1a1410'; ctx.lineWidth = 1.2;
  for (const sd of [-1, 1]) { ctx.beginPath(); ctx.moveTo(0, sd * 6); ctx.lineTo(-6, sd * 12); ctx.stroke(); D.dot(ctx, -6, sd * 12, 2.4, '#ff9a2a'); }
  ctx.restore();
}
// a bee wandering from flower to flower around (cx, cy): returns [x, y, heading]
function beePath(t, cx, cy, rx, ry, seed = 0) {
  const p = (tt) => [cx + noise1(tt * .55, seed) * rx + Math.sin(tt * 3.1 + seed) * 10, cy + noise1(tt * .5, seed + 7) * ry + Math.sin(tt * 4.3) * 6];
  const [x, y] = p(t), [x2, y2] = p(t + .05);
  return [x, y, Math.atan2(y2 - y, x2 - x)];
}
// a loose flock of small birds crossing the sky (screen space)
function flock(ctx, t, o = {}) {
  const n = o.n ?? 7, u = (t - (o.t0 ?? 0)) / (o.dur ?? 8);
  if (u < 0 || u > 1) return;
  const x0 = o.x0 ?? -80, x1 = o.x1 ?? 1160, y0 = o.y ?? 200;
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.strokeStyle = rgba(o.col ?? '#3a3a4a', o.a ?? .7); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (let i = 0; i < n; i++) {
    const lag = o.v ? 0 : hash(i + 3) * .08, k = i - (n - 1) / 2, dir = Math.sign(x1 - x0);
    const vx = o.v ? -Math.abs(k) * 26 * dir : 0, vy = o.v ? k * 17 : (hash(i + 5) - .5) * 70; // V formation: leader in front
    const bx = lerp(x0, x1, u - lag), x = bx + vx + Math.sin(t * .7 + i) * 4, y = y0 + vy + Math.sin(t * 1.3 + i * 2) * 4 + (bx - 540) * (o.slope ?? -.05);
    const s = (o.s ?? 7) * (.75 + hash(i + 9) * .5), w = Math.sin(t * (9 + hash(i) * 3) + i * 2);
    ctx.lineWidth = Math.max(1, s * .28);
    ctx.beginPath(); ctx.moveTo(x - s, y - w * s * .7); ctx.quadraticCurveTo(x - s * .4, y - w * s * .2 - s * .25, x, y); ctx.quadraticCurveTo(x + s * .4, y - w * s * .2 - s * .25, x + s, y - w * s * .7); ctx.stroke();
  }
  ctx.restore();
}
// twinkling dew glints at the given points (current transform)
function glints(ctx, pts, t, a = 1) {
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  pts.forEach(([x, y, r], i) => {
    const tw = Math.pow(.5 + .5 * Math.sin(t * (2.2 + hash(i) * 2) + i * 2.3), 4) * a;
    if (tw < .02) return;
    D.glow(ctx, x, y, r * 3, '#ffffff', .5 * tw);
    ctx.strokeStyle = rgba('#ffffff', .8 * tw); ctx.lineWidth = Math.max(1, r * .18);
    D.line(ctx, x - r * 2.2 * tw, y, x + r * 2.2 * tw, y); D.line(ctx, x, y - r * 2.2 * tw, x, y + r * 2.2 * tw);
  });
  ctx.restore();
}

module.exports = { bee, beePath, flock, glints };
