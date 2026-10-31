// Vector drawing helpers: light, stars, type, smoke, flares.
const { W, H, clamp, lerp, hash, rng, noise2, fbm2, smooth } = require('./core');

const rgba = (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${clamp(a)})`;
const mixc = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];

function vgrad(ctx, stops, y0 = 0, y1 = H, x0 = 0, x1 = W) {
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  for (const [o, c, a] of stops) g.addColorStop(o, rgba(c, a ?? 1));
  ctx.fillStyle = g; ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
}
function glow(ctx, x, y, r, c, a = 1, add = true, falloff = .3) {
  if (a <= 0.002 || r <= 0) return;
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, rgba(c, a)); g.addColorStop(falloff, rgba(c, a * .35)); g.addColorStop(1, rgba(c, 0));
  ctx.save(); if (add) ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2); ctx.restore();
}
// anamorphic lens flare
function flare(ctx, x, y, s, c = [140, 190, 255], a = 1) {
  if (a <= 0.01) return;
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  const len = 900 * s, g = ctx.createLinearGradient(x - len, 0, x + len, 0);
  g.addColorStop(0, rgba(c, 0)); g.addColorStop(.5, rgba(c, .55 * a)); g.addColorStop(1, rgba(c, 0));
  ctx.fillStyle = g;
  ctx.fillRect(x - len, y - 2.2 * s, len * 2, 4.4 * s);
  ctx.globalAlpha = .4; ctx.fillRect(x - len * .6, y - 9 * s, len * 1.2, 18 * s);
  ctx.restore();
  glow(ctx, x, y, 160 * s, [255, 240, 220], .9 * a);
  glow(ctx, x, y, 40 * s, [255, 255, 255], a);
  // ghosts mirrored through screen centre
  const dx = W / 2 - x, dy = H / 2 - y;
  [[.5, 30, [255, 170, 90], .12], [1.3, 60, [120, 200, 255], .08], [1.7, 18, [200, 255, 200], .15], [2.1, 90, [255, 140, 200], .05]].forEach(([k, r, cc, aa]) =>
    glow(ctx, x + dx * k, y + dy * k, r * s, cc, aa * a, true, .7));
}
// deterministic star field; returns list once
const STARS = (() => {
  const r = rng(7), out = [];
  for (let i = 0; i < 2600; i++) {
    const x = r(), y = r(), m = Math.pow(r(), 6);
    // densify a diagonal Milky Way band
    out.push({ x, y, m, c: r(), tw: r() * 6.28 });
  }
  const band = rng(9);
  for (let i = 0; i < 2600; i++) {
    const u = band(), v = (band() + band() + band() - 1.5) * .09;
    out.push({ x: u, y: .2 + u * .6 + v, m: Math.pow(band(), 9) * .7, c: band(), tw: band() * 6.28 });
  }
  return out;
})();
function stars(ctx, t, o = {}) {
  const a = o.alpha ?? 1, sx = o.sx ?? 0, sy = o.sy ?? 0, sc = o.scale ?? 1, rot = o.rot ?? 0;
  if (a <= 0) return;
  const cr = Math.cos(rot), sr = Math.sin(rot);
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  if (o.milky !== false) {
    // soft milky way glow
    for (let i = 0; i < 9; i++) {
      const u = i / 8, x0 = (u - .5) * 1.4, y0 = (.2 + u * .6 - .5) * 1.4;
      const X = W / 2 + (x0 * cr - y0 * sr) * W * sc + sx, Y = H / 2 + (x0 * sr + y0 * cr) * W * sc * .5625 + sy;
      glow(ctx, X, Y, 380 * sc, [120, 120, 170], .05 * a, false, .5);
    }
  }
  for (const s of STARS) {
    if (o.limit && s.m < o.limit) continue;
    const x0 = (s.x - .5) * 1.4, y0 = (s.y - .5) * 1.4;
    let X = W / 2 + (x0 * cr - y0 * sr) * W * sc + sx, Y = H / 2 + (x0 * sr + y0 * cr) * W * sc * .5625 + sy;
    if (o.wrap) { X = ((X % (W + 20)) + W + 20) % (W + 20) - 10; Y = ((Y % (H + 20)) + H + 20) % (H + 20) - 10; }
    if (X < -4 || X > W + 4 || Y < -4 || Y > H + 4) continue;
    if (o.mask && !o.mask(X, Y)) continue;
    const tw = .75 + .25 * Math.sin(t * 2.3 + s.tw * 7);
    const b = (.15 + s.m * 1.4) * tw * a;
    const col = s.c < .2 ? [255, 210, 170] : s.c > .8 ? [170, 200, 255] : [235, 240, 255];
    if (s.m > .25) glow(ctx, X, Y, 3 + s.m * 9, col, b * .6, false, .2);
    ctx.fillStyle = rgba(col, Math.min(1, b * 1.6));
    const r = .7 + s.m * 1.1;
    ctx.fillRect(X - r / 2, Y - r / 2, r, r);
  }
  ctx.restore();
}

// ---------- typography ----------
function text(ctx, str, x, y, o = {}) {
  const a = o.alpha ?? 1;
  if (a <= 0.003) return;
  ctx.save();
  ctx.font = `${o.size ?? 48}px ${o.font ?? 'AvUL'}`;
  ctx.letterSpacing = `${o.track ?? 0}px`;
  ctx.textAlign = o.align ?? 'center';
  ctx.textBaseline = o.baseline ?? 'middle';
  const c = o.color ?? [255, 255, 255];
  if (o.glow) { ctx.shadowColor = rgba(o.glowColor ?? c, a * o.glow); ctx.shadowBlur = o.glowBlur ?? 30; }
  ctx.fillStyle = rgba(c, a);
  // letterSpacing adds trailing space after the last glyph; recentre
  const dx = (o.align ?? 'center') === 'center' ? (o.track ?? 0) / 2 : 0;
  ctx.fillText(str, x + dx, y);
  ctx.restore();
}
function measure(ctx, str, o = {}) {
  ctx.save(); ctx.font = `${o.size ?? 48}px ${o.font ?? 'AvUL'}`; ctx.letterSpacing = `${o.track ?? 0}px`;
  const w = ctx.measureText(str).width; ctx.restore(); return w;
}

// ---------- smoke / exhaust ----------
// draw a soft, lit puff
function puff(ctx, x, y, r, base, a, lit = null, litA = 0) {
  if (a <= 0.004 || r < 1) return;
  // shadowed body, then a lit cap offset toward the light: reads as volume when puffs overlap
  const sh = mixc(base, [36, 36, 46], .38);
  let g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, rgba(sh, a * .85)); g.addColorStop(.6, rgba(sh, a * .55)); g.addColorStop(1, rgba(sh, 0));
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  const top = lit ? mixc(base, lit, litA) : base, cx = x - r * .26, cy = y - r * .3, r2 = r * .74;
  g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r2);
  g.addColorStop(0, rgba(mixc(top, [255, 255, 255], .25), a)); g.addColorStop(.55, rgba(top, a * .6)); g.addColorStop(1, rgba(top, 0));
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(cx, cy, r2, 0, Math.PI * 2); ctx.fill();
}
// rocket plume pointing down from nozzle (x,y), length L, width w
function plume(ctx, x, y, L, w, t, o = {}) {
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  const fl = 1 + .08 * Math.sin(t * 61) + .05 * Math.sin(t * 97 + 1);
  const L2 = L * fl;
  const hot = o.hot ?? [255, 250, 230], mid = o.mid ?? [255, 170, 60];
  // outer flame
  let g = ctx.createLinearGradient(x, y, x, y + L2);
  g.addColorStop(0, rgba(mid, .9)); g.addColorStop(.5, rgba(mid, .45)); g.addColorStop(1, rgba([255, 80, 20], 0));
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.moveTo(x - w * .5, y);
  ctx.bezierCurveTo(x - w * 1.1, y + L2 * .3, x - w * .6, y + L2 * .8, x, y + L2);
  ctx.bezierCurveTo(x + w * .6, y + L2 * .8, x + w * 1.1, y + L2 * .3, x + w * .5, y);
  ctx.fill();
  // core
  g = ctx.createLinearGradient(x, y, x, y + L2 * .55);
  g.addColorStop(0, rgba(hot, 1)); g.addColorStop(.6, rgba(hot, .6)); g.addColorStop(1, rgba(hot, 0));
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.moveTo(x - w * .38, y);
  ctx.quadraticCurveTo(x - w * .5, y + L2 * .3, x, y + L2 * .55);
  ctx.quadraticCurveTo(x + w * .5, y + L2 * .3, x + w * .38, y);
  ctx.fill();
  // shock diamonds
  if (o.diamonds) for (let k = 1; k <= 4; k++) glow(ctx, x, y + L2 * k * .11, w * (.5 - k * .06), hot, .35 / k, false, .4);
  ctx.restore();
  glow(ctx, x, y + L2 * .1, w * 4 * (o.glow ?? 1), mid, .5, true);
  glow(ctx, x, y + L2 * .05, w * 1.4, hot, .8, true);
}
// a deterministic billowing smoke column produced by a moving source
// src(tb) -> {x,y,on} position of exhaust at birth time tb; returns nothing, draws puffs
function smokeColumn(ctx, t, src, o = {}) {
  const rate = o.rate ?? 40, life = o.life ?? 8, groundY = o.groundY ?? Infinity;
  const t0 = Math.max(o.start ?? 0, t - life);
  const i0 = Math.ceil(t0 * rate), i1 = Math.floor(t * rate);
  const base = o.color ?? [200, 196, 190];
  const fire = o.fire ?? [255, 150, 60];
  const flame = o.flame ? o.flame(t) : null; // current flame position for lighting
  const list = [];
  for (let i = i0; i <= i1; i++) {
    const tb = i / rate, age = t - tb;
    const s = src(tb);
    if (!s || !s.on) continue;
    const h1 = hash(i * 1.37 + 3), h2 = hash(i * 2.11 + 7), h3 = hash(i * .73 + 1);
    let vx = (h1 - .5) * (o.spread ?? 60), vy = (o.down ?? 120) * (.6 + h2 * .8);
    let x = s.x + vx * age * .6, y = s.y + vy * Math.min(age, 1.2) * .8;
    // spreading along the ground
    if (y > groundY) {
      const over = y - groundY;
      y = groundY - over * .25 - (o.lift ?? 25) * age;
      x += Math.sign(h1 - .5 || 1) * (o.ground ?? 220) * Math.sqrt(age) * (.5 + h3);
    } else y -= (o.lift ?? 25) * age * age * .2;
    x += (o.wind ?? 0) * age;
    const r = (o.r0 ?? 18) + (o.grow ?? 60) * Math.sqrt(age) * (.6 + h3 * .7);
    const a = (o.alpha ?? .5) * Math.min(1, age * 6) * (1 - age / life);
    list.push([x, y, r, a, age]);
  }
  for (const [x, y, r, a, age] of list) {
    let litA = 0;
    if (flame) { const d = Math.hypot(x - flame.x, y - flame.y); litA = clamp(flame.k * (1 - d / (flame.r ?? 600))) ; }
    const shade = mixc(base, o.shadow ?? [70, 70, 80], clamp(age / life * .5 + (o.dark ?? 0)));
    puff(ctx, x, y, r, shade, a, fire, litA);
  }
}

// cinematic bars, vignette
function letterbox(ctx, frac) {
  if (frac <= 0) return;
  const h = Math.round(138 * frac);
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, h); ctx.fillRect(0, H - h, W, h);
}
function scrim(ctx, a, c = [0, 0, 0]) { if (a > 0) { ctx.fillStyle = rgba(c, a); ctx.fillRect(0, 0, W, H); } }

module.exports = { rgba, mixc, vgrad, glow, flare, stars, text, measure, puff, plume, smokeColumn, letterbox, scrim };
