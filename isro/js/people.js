// Human figures built from a skeleton and filled as solid silhouettes (with optional rim light).
// side(): profile walker facing right. back(): figure seen from behind for crowds, with cheering poses.
// Both append sub-paths to a Path2D so whole groups can be filled / rim-lit in one go.
const { C, clamp, lerp, hash, noise2 } = require('./core');
const { rgba, mixc } = require('./gfx');

// capsule between two points with end radii
function capsule(p, a, b, ra, rb) {
  const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1e-3, ux = dx / L, uy = dy / L, nx = -uy, ny = ux;
  const ang = Math.atan2(uy, ux);
  p.moveTo(a[0] + nx * ra, a[1] + ny * ra);
  p.lineTo(b[0] + nx * rb, b[1] + ny * rb);
  p.arc(b[0], b[1], rb, ang + Math.PI / 2, ang - Math.PI / 2, true);
  p.lineTo(a[0] - nx * ra, a[1] - ny * ra);
  p.arc(a[0], a[1], ra, ang - Math.PI / 2, ang + Math.PI / 2, true);
  p.closePath();
}
function poly(p, pts) { pts.forEach((q, i) => (i ? p.lineTo(q[0], q[1]) : p.moveTo(q[0], q[1]))); p.closePath(); }
// ellipse as its own closed sub-path (a bare ellipse() would join to the previous point)
function oval(p, c, rx, ry, rot = 0) {
  p.moveTo(c[0] + Math.cos(rot) * rx, c[1] + Math.sin(rot) * rx);
  p.ellipse(c[0], c[1], rx, ry, rot, 0, Math.PI * 2); p.closePath();
}

function ik(a, b, l1, l2, bend) {
  const dx = b[0] - a[0], dy = b[1] - a[1], d = Math.min(l1 + l2 - 1e-4, Math.max(1e-4, Math.hypot(dx, dy)));
  const p = (l1 * l1 - l2 * l2 + d * d) / (2 * d), h = Math.sqrt(Math.max(0, l1 * l1 - p * p));
  const bx = a[0] + p * dx / d, by = a[1] + p * dy / d, px = -dy / d, py = dx / d;
  const k1 = [bx + h * px, by + h * py], k2 = [bx - h * px, by - h * py];
  return (k1[0] - k2[0]) * bend > 0 ? k1 : k2;
}
function gait(ph, duty, stride, lift) {
  ph = ((ph % 1) + 1) % 1;
  if (ph < duty) return [stride * (.5 - ph / duty), 0];
  const u = (ph - duty) / (1 - duty), e = u * u * (3 - 2 * u);
  return [stride * (-.5 + e), Math.sin(Math.PI * u) * lift];
}

// ---------------------------------------------------------------- profile walker (metres, y up, facing +x)
// o: {dress:'shirt'|'dhoti'|'saree'|'kurta', head:'hair'|'turban'|'cap'|'bun', stick, carry, scale, phase, still}
function side(near, far, x, y, s, dist, o = {}) {
  const k = o.scale ?? 1, S = s * k, cyc = dist / (1.17 * k) + (o.phase ?? 0), still = o.still;
  const bob = still ? 0 : .025 * Math.cos(cyc * Math.PI * 4);
  const P = (px, py) => [x + px * S, y - py * S];
  const hip = [0, .93 + bob], sh = [.03, 1.42 + bob], neck = [.05, 1.5 + bob], head = [.08, 1.62 + bob];
  const lean = o.lean ?? .02;
  const legs = [], arms = [];
  for (const [off, pth] of [[.5, far], [0, near]]) {
    const [fx, fy] = still ? [off ? -.09 : .09, 0] : gait(cyc + off, .6, .7, .11);
    const ankle = [fx, .08 + fy], knee = ik(hip, ankle, .47, .46, 1);
    legs.push([pth, knee, ankle, fx, fy]);
    const sw = still ? (o.armRest ?? .12) : -Math.sin((cyc + off) * Math.PI * 2) * .38;
    const el = [sh[0] + Math.sin(sw) * .29, sh[1] - Math.cos(sw) * .29], hd = [el[0] + Math.sin(sw + .3) * .27, el[1] - Math.cos(sw + .3) * .27];
    arms.push([off ? near : far, el, hd]);
  }
  const dress = o.dress ?? 'shirt';
  for (const [pth, knee, ankle, fx, fy] of legs) {
    if (dress === 'saree') continue;
    capsule(pth, P(...hip), P(...knee), .085 * S, .062 * S);
    capsule(pth, P(...knee), P(...ankle), .062 * S, .042 * S);
    // foot
    poly(pth, [P(ankle[0] - .05, ankle[1] + .02), P(ankle[0] + .02, ankle[1] + .03), P(ankle[0] + .17, fy + .01), P(ankle[0] + .17, fy - .02 + .02), P(ankle[0] - .06, fy)]);
  }
  for (const [pth, el, hd] of arms) {
    if (pth !== near) { capsule(pth, P(...sh), P(...el), .052 * S, .042 * S); capsule(pth, P(...el), P(...hd), .042 * S, .034 * S); }
  }
  // torso and clothing
  const tors = [P(hip[0] - .13, hip[1] - .02), P(hip[0] - .14, hip[1] + .2), P(sh[0] - .12 - lean, sh[1] - .05), P(sh[0] - .06 - lean, sh[1] + .06), P(neck[0], neck[1] + .02), P(sh[0] + .11 - lean, sh[1] - .02), P(sh[0] + .13 - lean, sh[1] - .2), P(hip[0] + .14, hip[1] + .12), P(hip[0] + .12, hip[1] - .04)];
  poly(near, tors);
  if (dress === 'dhoti' || dress === 'kurta') {
    const a = legs[0][2], b = legs[1][2], lo = dress === 'dhoti' ? .32 : .62;
    poly(near, [P(hip[0] - .15, hip[1] + .02), P(hip[0] + .15, hip[1] + .02), P(Math.max(a[0], b[0]) * .8 + .12, lo), P(Math.min(a[0], b[0]) * .8 - .12, lo)]);
  }
  if (dress === 'saree') {
    const a = legs[0][2], b = legs[1][2];
    poly(near, [P(hip[0] - .16, hip[1] + .05), P(hip[0] + .15, hip[1] + .05), P(Math.max(a[0], b[0]) + .12, .03), P(Math.min(a[0], b[0]) - .12, .03)]);
    for (const [pth, , ankle] of legs) poly(pth, [P(ankle[0] - .04, .06), P(ankle[0] + .15, .02), P(ankle[0] - .05, 0)]);
    // pallu falling from the shoulder
    poly(near, [P(sh[0] - .1, sh[1] + .02), P(sh[0] - .3, sh[1] - .45), P(sh[0] - .22, sh[1] - .5), P(sh[0] + .04, sh[1] - .05)]);
  }
  capsule(near, P(neck[0] - .01, neck[1] - .05), P(neck[0] + .02, neck[1] + .05), .05 * S, .05 * S);
  oval(near, P(...head), .1 * S, .122 * S, -.15);
  // nose and chin profile
  poly(near, [P(head[0] + .08, head[1] + .02), P(head[0] + .125, head[1] - .03), P(head[0] + .09, head[1] - .05)]);
  const hd = o.head ?? 'hair';
  if (hd === 'turban') oval(near, P(head[0] - .01, head[1] + .09), .13 * S, .075 * S, -.1);
  else if (hd === 'cap') { poly(near, [P(head[0] - .11, head[1] + .05), P(head[0] + .1, head[1] + .07), P(head[0] + .2, head[1] + .04), P(head[0] + .1, head[1] + .13), P(head[0] - .08, head[1] + .14)]); }
  else if (hd === 'bun') oval(near, P(head[0] - .11, head[1] + .01), .06 * S, .05 * S);
  else oval(near, P(head[0] - .02, head[1] + .045), .105 * S, .085 * S, -.2);
  for (const [pth, el, hdp] of arms) if (pth === near) { capsule(pth, P(...sh), P(...el), .055 * S, .044 * S); capsule(pth, P(...el), P(...hdp), .044 * S, .034 * S); oval(pth, P(hdp[0] + .02, hdp[1] - .03), .04 * S, .05 * S); }
  if (o.stick) {
    const h0 = arms[1][2], tip = [h0[0] + .55, h0[1] + .55];
    capsule(near, P(h0[0] - .1, h0[1] - .1), P(...tip), .014 * S, .01 * S);
  }
  return { hand: P(...arms[1][2]), head: P(...head) };
}

// ---------------------------------------------------------------- figure seen from behind (crowds)
// pose: { arms: [left, right] each {up:0..1 raise, wave:phase, bend}, jump (m), lean (rad), turn }
function back(path, x, y, s, pose = {}, o = {}) {
  const k = o.scale ?? 1, S = s * k, jump = pose.jump ?? 0, lean = pose.lean ?? 0;
  const P = (px, py) => { const cx = px * Math.cos(lean) + (py - .9) * Math.sin(lean), cy = (py - .9) * Math.cos(lean) - px * Math.sin(lean) + .9; return [x + cx * S, y - (cy + jump) * S]; };
  const wide = o.build ?? 1, fem = o.female;
  const shW = (fem ? .17 : .2) * wide, hipW = (fem ? .16 : .13) * wide, shY = 1.42, hipY = .93;
  // legs (hidden under a saree/dhoti when worn)
  const spread = pose.spread ?? .06, bend = jump > .02 ? .08 : 0;
  for (const sd of [-1, 1]) {
    const hp = [sd * hipW * .6, hipY], an = [sd * (hipW * .6 + spread), .07 + Math.max(0, jump > 0 ? .0 : 0)], kn = [sd * (hipW * .6 + spread * .5) + sd * bend, .5 + bend * .3];
    if (o.dress !== 'saree') { capsule(path, P(...hp), P(...kn), .085 * S * wide, .062 * S); capsule(path, P(...kn), P(...an), .062 * S, .045 * S); oval(path, P(an[0], .03), .06 * S, .04 * S); }
  }
  if (o.dress === 'saree') poly(path, [P(-hipW - .02, hipY + .05), P(hipW + .02, hipY + .05), P(hipW + .1 + spread, .02), P(-hipW - .1 - spread, .02)]);
  if (o.dress === 'dhoti') poly(path, [P(-hipW - .03, hipY + .03), P(hipW + .03, hipY + .03), P(hipW + .06 + spread, .32), P(-hipW - .06 - spread, .32)]);
  // torso
  poly(path, [P(-hipW - .02, hipY - .05), P(-hipW - .01, hipY + .25), P(-shW, shY - .1), P(-shW + .03, shY + .03), P(-.06, shY + .07), P(.06, shY + .07), P(shW - .03, shY + .03), P(shW, shY - .1), P(hipW + .01, hipY + .25), P(hipW + .02, hipY - .05)]);
  capsule(path, P(0, shY), P(0, shY + .1), .055 * S, .05 * S);
  const hy0 = 1.6 + (pose.nod ?? 0) * .02, hx0 = (pose.headTurn ?? 0) * .03;
  oval(path, P(hx0, hy0), .1 * S, .12 * S);
  if (o.head === 'bun') oval(path, P(hx0, hy0 - .04), .06 * S, .05 * S);
  if (o.head === 'braid') capsule(path, P(hx0, hy0 - .05), P(hx0 + .01, hy0 - .45), .04 * S, .025 * S);
  if (o.head === 'cap') oval(path, P(hx0, hy0 + .06), .115 * S, .06 * S);
  if (o.head === 'turban') oval(path, P(hx0, hy0 + .05), .13 * S, .08 * S);
  // arms: up = 0 hanging, 1 straight overhead; wave swings the forearm
  const hands = [];
  for (const [i, sd] of [[0, -1], [1, 1]]) {
    const A = (pose.arms ?? [])[i] ?? {}, up = A.up ?? 0, w = A.wave ?? 0;
    const shp = [sd * (shW - .03), shY - .02];
    const a0 = lerp(.12, 2.85, up) + (A.out ?? 0);                         // shoulder abduction from hanging
    const el = [shp[0] + sd * Math.sin(a0) * .29, shp[1] - Math.cos(a0) * .29];
    const a1 = a0 - (A.bend ?? (up > .3 ? .35 : .1)) * sd * sd + Math.sin(w) * .45 * up;
    const hd = [el[0] + sd * Math.sin(a1) * .27, el[1] - Math.cos(a1) * .27];
    capsule(path, P(...shp), P(...el), .056 * S * wide, .045 * S);
    capsule(path, P(...el), P(...hd), .045 * S, .036 * S);
    oval(path, P(hd[0], hd[1] + (up > .5 ? .04 : -.04)), .042 * S, .05 * S);
    hands.push(P(hd[0], hd[1] + (up > .5 ? .06 : -.06)));
  }
  return { hands, head: P(hx0, hy0), top: P(0, 1.75) };
}

// collects sub-shapes as separate Path2Ds (so overlaps never cancel under the winding rule) and tracks bounds
class Shapes {
  constructor() { this.list = []; this.cur = null; this.b = [1e9, 1e9, -1e9, -1e9]; }
  _p(x, y, r = 0) { const b = this.b; if (x - r < b[0]) b[0] = x - r; if (y - r < b[1]) b[1] = y - r; if (x + r > b[2]) b[2] = x + r; if (y + r > b[3]) b[3] = y + r; }
  moveTo(x, y) { this.cur = new C.Path2D(); this.list.push(this.cur); this.cur.moveTo(x, y); this._p(x, y); }
  lineTo(x, y) { this.cur.lineTo(x, y); this._p(x, y); }
  quadraticCurveTo(a, b, x, y) { this.cur.quadraticCurveTo(a, b, x, y); this._p(a, b); this._p(x, y); }
  bezierCurveTo(a, b, c, d, x, y) { this.cur.bezierCurveTo(a, b, c, d, x, y); this._p(a, b); this._p(c, d); this._p(x, y); }
  arc(x, y, r, a0, a1, ccw) { this.cur.arc(x, y, r, a0, a1, ccw); this._p(x, y, r); }
  ellipse(x, y, rx, ry, rot, a0, a1, ccw) { this.cur.ellipse(x, y, rx, ry, rot, a0, a1, ccw); this._p(x, y, Math.max(rx, ry)); }
  closePath() { this.cur.closePath(); }
  ring(x, y, r0, r1) { this.moveTo(x + r1, y); this.cur.arc(x, y, r1, 0, Math.PI * 2); this.cur.moveTo(x + r0, y); this.cur.arc(x, y, r0, 0, Math.PI * 2, true); this._p(x, y, r1); }
  fill(c) { for (const p of this.list) c.fill(p); }
}
let MASK = null;
// fill shapes as a dark silhouette with a light-catching rim on the side facing (lx, ly)
function rimFill(ctx, sh, o) {
  if (!sh.list.length) return;
  const body = o.body, rim = o.rim, w = o.rimW ?? 2.2, lx = o.lx ?? -1, ly = o.ly ?? -.4, n = Math.hypot(lx, ly) || 1;
  if (!rim || (o.rimA ?? 1) <= 0) { ctx.fillStyle = rgba(body); sh.fill(ctx); return; }
  if (!MASK) { const cv = C.createCanvas(1920, 1080); MASK = { cv, c: cv.getContext('2d') }; }
  const m = MASK.c, pad = Math.ceil(w * 3 + 4);
  const x0 = Math.max(0, Math.floor(sh.b[0] - pad)), y0 = Math.max(0, Math.floor(sh.b[1] - pad));
  const x1 = Math.min(1920, Math.ceil(sh.b[2] + pad)), y1 = Math.min(1080, Math.ceil(sh.b[3] + pad));
  if (x1 <= x0 || y1 <= y0) return;
  m.setTransform(1, 0, 0, 1, 0, 0); m.globalCompositeOperation = 'source-over'; m.clearRect(x0, y0, x1 - x0, y1 - y0);
  m.save(); m.beginPath(); m.rect(x0, y0, x1 - x0, y1 - y0); m.clip();
  m.fillStyle = rgba(mixc(body, rim, Math.min(1, o.rimA ?? 1))); sh.fill(m);
  m.globalCompositeOperation = 'source-atop';
  if (o.soft) { m.fillStyle = rgba(mixc(body, rim, .4)); m.translate(-lx / n * w * .45, -ly / n * w * .45); sh.fill(m); m.setTransform(1, 0, 0, 1, 0, 0); }
  m.translate(-lx / n * w, -ly / n * w);
  if (o.grad) { const g = m.createLinearGradient(0, o.grad[0], 0, o.grad[1]); g.addColorStop(0, rgba(o.top ?? body)); g.addColorStop(1, rgba(body)); m.fillStyle = g; }
  else m.fillStyle = rgba(body);
  sh.fill(m);
  m.restore();
  ctx.drawImage(MASK.cv, x0, y0, x1 - x0, y1 - y0, x0, y0, x1 - x0, y1 - y0);
}

module.exports = { side, back, rimFill, capsule, poly, oval, ik, gait, Shapes, Path2D: Shapes };
