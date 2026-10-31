// Sky dressing: lit stratus streaks, cumulus banks, crepuscular rays, atmospheric haze bands.
const { W, H, clamp, lerp, rng, noise2, hash } = require('./core');
const { rgba, mixc } = require('./gfx');

// soft flat cloud puff (radial falloff) squashed vertically
function flat(ctx, x, y, rx, ry, c, a) {
  if (a <= .004) return;
  ctx.save(); ctx.translate(x, y); ctx.scale(1, ry / rx);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
  g.addColorStop(0, rgba(c, a)); g.addColorStop(.5, rgba(c, a * .6)); g.addColorStop(1, rgba(c, 0));
  ctx.fillStyle = g; ctx.fillRect(-rx, -rx, 2 * rx, 2 * rx); ctx.restore();
}

// layered stratus / altocumulus streaks lit by a low sun. o: {y0,y1,n,sun:[x,y],lit,dark,glow,seed,t,drift,alpha,scale}
function streaks(ctx, o) {
  const r = rng(o.seed ?? 3), n = o.n ?? 14, t = o.t ?? 0, sun = o.sun ?? [W / 2, o.y1];
  const lit = o.lit ?? [255, 170, 120], dark = o.dark ?? [60, 50, 80], hot = o.glow ?? [255, 220, 170];
  for (let i = 0; i < n; i++) {
    const u = Math.pow(r(), 1.3), y = lerp(o.y0, o.y1, u), sc = (o.scale ?? 1) * (.35 + u * .9);
    const len = (260 + r() * 820) * sc, x0 = ((r() * (W + 1400) + t * (o.drift ?? 4) * (.5 + u)) % (W + 1400)) - 700;
    const th = (5 + r() * 14) * sc, parts = 6 + Math.floor(r() * 10), a = (o.alpha ?? .6) * (.45 + r() * .55);
    for (let j = 0; j < parts; j++) {
      const v = j / (parts - 1) - .5, px = x0 + v * len + (r() - .5) * 60 * sc, py = y + (r() - .5) * th * 1.2;
      const rx = (len / parts) * (1 + r() * .9) * (1 - Math.abs(v) * .6), ry = th * (.6 + r() * .7) * (1 - Math.abs(v) * .5);
      const near = Math.exp(-Math.hypot((px - sun[0]) * .7, (py - sun[1]) * 1.6) / (o.reach ?? 650));
      const col = mixc(mixc(dark, lit, clamp(.25 + near * .9)), hot, clamp(near * near * 1.2));
      flat(ctx, px, py + ry * .25, rx, ry, mixc(col, dark, .35), a * .8);
      flat(ctx, px, py, rx * .92, ry * .7, col, a);
      // lit underside when the sun is below the cloud
      if (sun[1] > py) flat(ctx, px, py + ry * .35, rx * .8, ry * .35, mixc(col, hot, .5), a * .6 * clamp(near * 1.5));
    }
  }
}

// crepuscular rays fanning from a light source, broken up by noise; additive
function rays(ctx, x, y, o = {}) {
  const n = o.n ?? 60, len = o.len ?? 1800, c = o.color ?? [255, 200, 140], a = o.alpha ?? .12, t = o.t ?? 0;
  const a0 = o.a0 ?? -Math.PI, a1 = o.a1 ?? 0;
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < n; i++) {
    const u = (i + .5) / n, ang = lerp(a0, a1, u), w = (lerp(a1, a0, 0) - a0) / n * .9;
    const k = clamp(noise2(i * .7, t * .08 + (o.seed ?? 0)) * 1.6 + .25);
    if (k <= .02) continue;
    const g = ctx.createRadialGradient(x, y, 0, x, y, len);
    g.addColorStop(0, rgba(c, a * k)); g.addColorStop(.35, rgba(c, a * k * .45)); g.addColorStop(1, rgba(c, 0));
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x, y);
    ctx.arc(x, y, len, ang - w * .5 * (1 + hash(i)), ang + w * .5 * (1 + hash(i + 3))); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}

// horizontal haze band (adds depth between layers)
function haze(ctx, y0, y1, c, a) {
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  g.addColorStop(0, rgba(c, 0)); g.addColorStop(.5, rgba(c, a)); g.addColorStop(1, rgba(c, 0));
  ctx.fillStyle = g; ctx.fillRect(-200, y0, W + 400, y1 - y0);
}

// drifting backlit dust motes / pollen
function motes(ctx, t, o = {}) {
  const r = rng(o.seed ?? 5), n = o.n ?? 80, c = o.color ?? [255, 220, 170];
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < n; i++) {
    const x = ((r() * (W + 200) + t * (8 + r() * 20)) % (W + 200)) - 100, y = (o.y0 ?? 0) + r() * ((o.y1 ?? H) - (o.y0 ?? 0)) + Math.sin(t * .7 + i) * 8;
    const near = o.sun ? Math.exp(-Math.hypot(x - o.sun[0], y - o.sun[1]) / (o.reach ?? 500)) : 1;
    const a = (o.alpha ?? .5) * near * (.3 + .7 * r());
    if (a < .01) continue;
    ctx.fillStyle = rgba(c, a); ctx.beginPath(); ctx.arc(x, y, .6 + r() * 1.6, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

module.exports = { flat, streaks, rays, haze, motes };
