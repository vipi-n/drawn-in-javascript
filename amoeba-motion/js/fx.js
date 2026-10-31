// Motion-graphics layer shared by the shots: camera rigs, iris wipes, zoom-through speed lines,
// impact flashes and ring bursts, boiling motion marks, springy labels, blueprint grid.
const { W, H, TAU, clamp, lerp, easeOut, hash, rgba, PAL } = require('./core');
const D = require('./draw');
const M = require('./motion');

const screen = (ctx) => ctx.setTransform(1, 0, 0, 1, 0, 0);
function fill(ctx, col, a = 1) { if (a <= 0) return; screen(ctx); ctx.fillStyle = rgba(col, a); ctx.fillRect(0, 0, W, H); }

// keyframed camera {x,y,z,r} (zoom interpolated in log space) + hand-held drift + decaying impact shakes [[time, amount], ...]
function rig(lt, ks, o = {}) {
  const k = M.keys(lt, ks.map(([t, v, e]) => [t, { x: v.x, y: v.y, z: Math.log(v.z ?? 1), r: v.r ?? 0 }, e]), o.ez);
  let c = { x: k.x, y: k.y, z: Math.exp(k.z), r: k.r };
  if ((o.drift ?? 1) > 0) c = M.drift(c, lt + (o.seed ?? 0), o.drift ?? 1);
  for (const [t0, amt] of o.shakes || []) c = M.shake(c, lt - t0, amt);
  return c;
}
// screen position of world point under camera c
function toScreen(c, x, y) {
  const z = c.z ?? 1, r = c.r ?? 0, cs = Math.cos(r) * z, sn = Math.sin(r) * z, dx = x - c.x, dy = y - c.y;
  return [W / 2 + cs * dx - sn * dy, H / 2 + sn * dx + cs * dy];
}

// circular wipe: `inner` is drawn clipped to a screen circle, the edge marked by a bright double rim
function iris(ctx, x, y, r, inner, o = {}) {
  if (r <= .5) return;
  ctx.save(); screen(ctx);
  ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.clip();
  inner(ctx);
  ctx.restore();
  const a = o.rim ?? 1;
  if (a > 0 && r < 1700) {
    screen(ctx);
    ctx.strokeStyle = rgba(o.col ?? PAL.cream, .95 * a); ctx.lineWidth = o.w ?? 3.5; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke();
    ctx.strokeStyle = rgba(o.col2 ?? PAL.blue, .8 * a); ctx.lineWidth = 1.3; ctx.beginPath(); ctx.arc(x, y, r + 10, 0, TAU); ctx.stroke();
  }
}

// radial streaks flying out of (dir 1) or into (dir -1) a vanishing point: the feel of diving through a scale
function zoomLines(ctx, cx, cy, amt, t, o = {}) {
  if (amt <= .01) return;
  screen(ctx); ctx.lineCap = 'round';
  const n = o.n ?? 64, col = o.col ?? '#ffffff', dir = o.dir ?? 1;
  for (let i = 0; i < n; i++) {
    const a = hash(i * 3 + 11) * TAU, sp = .7 + hash(i * 3 + 12) * .8;
    let u = (t * sp * (o.speed ?? 1.8) + hash(i * 3 + 13)) % 1;
    if (dir < 0) u = 1 - u;
    const r0 = (o.r0 ?? 90) + u * u * 820, len = (30 + 320 * u) * amt;
    ctx.strokeStyle = rgba(col, (o.a ?? .5) * amt * Math.sin(Math.PI * u)); ctx.lineWidth = .8 + 2.8 * u;
    D.line(ctx, cx + Math.cos(a) * r0, cy + Math.sin(a) * r0, cx + Math.cos(a) * (r0 + len), cy + Math.sin(a) * (r0 + len));
  }
}
// parallel streaks for whip pans (angle = direction of travel on screen)
function whipLines(ctx, ang, amt, t, o = {}) {
  if (amt <= .01) return;
  screen(ctx); ctx.lineCap = 'round';
  const ux = Math.cos(ang), uy = Math.sin(ang), n = o.n ?? 40;
  for (let i = 0; i < n; i++) {
    const off = (hash(i * 5 + 1) - .5) * 1600, ph = (t * (3 + hash(i * 5 + 2) * 3) + hash(i * 5 + 3)) % 1;
    const along = (ph - .5) * 1700, len = (120 + 380 * hash(i * 5 + 4)) * amt;
    const x = 540 + ux * along - uy * off, y = 540 + uy * along + ux * off;
    ctx.strokeStyle = rgba(o.col ?? '#ffffff', (o.a ?? .35) * amt); ctx.lineWidth = 1 + hash(i) * 3;
    D.line(ctx, x, y, x - ux * len, y - uy * len);
  }
}

function flash(ctx, age, o = {}) {
  if (age < 0) return;
  const a = (o.a ?? .75) * Math.exp(-age * (o.k ?? 8));
  if (a > .01) fill(ctx, o.col ?? '#fff8ea', a);
}
// expanding double ring + dashes flying outward (a cell parting, a shell bursting, an impact)
function burst(ctx, x, y, age, o = {}) {
  const life = o.life ?? .7;
  if (age < 0 || age > life) return;
  const u = age / life, R = o.r ?? 200, col = o.col ?? '#fff6e0', e = easeOut(u);
  for (let i = 0; i < (o.n ?? 2); i++) D.ring(ctx, x, y, (o.r0 ?? 10) + e * (R + i * R * .35), col, (1 - u) * .9, (o.w ?? 3) * (1 - i * .4));
  const nr = o.rays ?? 12;
  ctx.strokeStyle = rgba(col, 1 - u); ctx.lineWidth = (o.w ?? 3) * .9; ctx.lineCap = 'round';
  for (let i = 0; i < nr; i++) {
    const a = TAU * i / nr + (o.a0 ?? 0), r0 = R * (.25 + 1.0 * e), r1 = r0 + R * .28 * (1 - u);
    D.line(ctx, x + Math.cos(a) * r0, y + Math.sin(a) * r0, x + Math.cos(a) * r1, y + Math.sin(a) * r1);
  }
}

// the reference's boiling white motion marks: wavy strokes trailing behind something moving along `dir`
function marks(ctx, x, y, dir, amt, t, o = {}) {
  if (amt <= .02) return;
  const n = o.n ?? 4, len = o.len ?? 50, spread = o.spread ?? 70, fr = Math.floor(t * 12);
  const ux = Math.cos(dir), uy = Math.sin(dir), vx = -uy, vy = ux;
  ctx.save(); ctx.strokeStyle = rgba(o.col ?? '#ffffff', .85 * amt); ctx.lineWidth = o.w ?? 2.6; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (let i = 0; i < n; i++) {
    const off = (n === 1 ? 0 : (i / (n - 1) - .5) * spread * 2) + (hash(fr * 7 + i) - .5) * 10;
    const back = (o.back ?? 80) + hash(fr * 3 + i * 11) * 24, L = len * (.6 + .6 * hash(i * 13 + 5));
    const bx = x - ux * back + vx * off, by = y - uy * back + vy * off;
    ctx.beginPath();
    for (let s = 0; s <= 8; s++) {
      const u = s / 8, w = Math.sin(u * 7 + fr * 1.7 + i) * 3.2;
      const px = bx - ux * L * u + vx * w, py = by - uy * L * u + vy * w;
      if (s) ctx.lineTo(px, py); else ctx.moveTo(px, py);
    }
    ctx.stroke();
  }
  ctx.restore();
}
// short boiling arcs either side of something vibrating or straining
function shiver(ctx, x, y, r, amt, t, o = {}) {
  if (amt <= .02) return;
  const fr = Math.floor(t * 12);
  ctx.save(); ctx.strokeStyle = rgba(o.col ?? '#ffffff', .85 * amt); ctx.lineWidth = o.w ?? 2.4; ctx.lineCap = 'round';
  for (const s of [-1, 1]) for (let j = 0; j < 2; j++) {
    const a = (o.a ?? 0) + (s < 0 ? Math.PI : 0) + (hash(fr * 5 + j + (s + 1) * 7) - .5) * .35, rr = r * (1.1 + j * .13);
    ctx.beginPath(); ctx.arc(x, y, rr, a - .3, a + .3); ctx.stroke();
  }
  ctx.restore();
}

// annotation that pings its anchor, snaps a leader line out and springs its words in (age in s)
function label(ctx, ax, ay, tx, ty, s, age, o = {}) {
  if (age <= 0) return;
  const col = o.col ?? PAL.cream, right = tx >= ax, a = o.a ?? 1;
  const pop = M.spring(age, 2.2, 6.5), q = M.expoOut(clamp(age / .45));
  ctx.save(); ctx.globalAlpha *= a; ctx.lineCap = 'round';
  D.ring(ctx, ax, ay, 5 + 30 * easeOut(clamp(age * 2.5)), col, .9 * (1 - clamp(age * 2.5)), 2);
  D.dot(ctx, ax, ay, 4.5 * clamp(pop, 0, 1.4), col);
  const ex = tx + (right ? -16 : 16), L1 = Math.hypot(ex - ax, ty - ay), L2 = Math.abs(tx - ex), f = L1 / (L1 + L2);
  ctx.strokeStyle = rgba(col, .9); ctx.lineWidth = 1.6;
  D.line(ctx, ax, ay, lerp(ax, ex, clamp(q / f)), lerp(ay, ty, clamp(q / f)));
  if (q > f) D.line(ctx, ex, ty, lerp(ex, tx, (q - f) / (1 - f)), ty);
  ctx.restore();
  if (age > .18) M.kinetic(ctx, s, tx + (right ? 10 : -10), ty + 9, clamp((age - .18) / .55), { font: 'DidotI', size: o.size ?? 28, color: col, align: right ? 'left' : 'right', alpha: a, stagger: .5 });
}

// thin blueprint grid in world space that slides and rolls with the camera (x-ray backdrop)
function blueprint(ctx, c, a, step = 90) {
  if (a <= 0) return;
  const span = 1100 / (c.z ?? 1), x0 = Math.floor((c.x - span) / step) * step, y0 = Math.floor((c.y - span) / step) * step;
  ctx.save(); ctx.lineWidth = 1 / (c.z ?? 1);
  for (let x = x0, i = 0; x < c.x + span; x += step, i++) { ctx.strokeStyle = rgba(PAL.blueDim, a * (Math.round(x / step) % 4 === 0 ? .55 : .25)); D.line(ctx, x, c.y - span, x, c.y + span); }
  for (let y = y0; y < c.y + span; y += step) { ctx.strokeStyle = rgba(PAL.blueDim, a * (Math.round(y / step) % 4 === 0 ? .55 : .25)); D.line(ctx, c.x - span, y, c.x + span, y); }
  ctx.restore();
}

// a dashed construction ring that keeps turning (dash offset runs with time)
function turningRing(ctx, x, y, r, t, o = {}) {
  ctx.save();
  ctx.strokeStyle = rgba(o.col ?? PAL.blue, o.a ?? .8); ctx.lineWidth = o.w ?? 1.4;
  ctx.setLineDash(o.dash ?? [14, 10]); ctx.lineDashOffset = -t * (o.speed ?? 40);
  ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke();
  ctx.restore();
}

module.exports = { screen, fill, rig, toScreen, iris, zoomLines, whipLines, flash, burst, marks, shiver, label, blueprint, turningRing };
