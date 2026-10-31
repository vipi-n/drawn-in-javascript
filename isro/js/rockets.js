// Side-view launch vehicles and pad structures. Base of the vehicle at (x, y); s = pixels per metre.
const { clamp } = require('./core');
const { rgba } = require('./gfx');

const mul = (c, k, tint) => [c[0] * k * tint[0], c[1] * k * tint[1], c[2] * k * tint[2]];
function shade(ctx, x0, x1, col, o) {
  const g = ctx.createLinearGradient(x0, 0, x1, 0), t = o.tint ?? [1, 1, 1], left = (o.light ?? -1) < 0;
  // cosine-like falloff across the cylinder with a narrow specular band and sky bounce on the dark limb
  let st = [[0, .5], [.06, .72], [.16, 1.0], [.22, 1.16], [.27, 1.02], [.42, .9], [.6, .72], [.78, .5], [.92, .36], [1, .42]];
  if (!left) st = st.map(([p, k]) => [1 - p, k]).reverse();
  for (const [p, k] of st) g.addColorStop(p, rgba(mul(col, k, t).map((v) => clamp(v, 0, 255))));
  return g;
}
function seams(ctx, cx, r, yb, yt, o) {
  const s = o.s; if (!s || r < 3) return;
  ctx.save();
  for (let y = yb - 2.4 * s; y > yt + s; y -= 2.4 * s) {
    ctx.fillStyle = 'rgba(0,0,0,.07)'; ctx.fillRect(cx - r, y, 2 * r, Math.max(1, s * .05));
    ctx.fillStyle = 'rgba(255,255,255,.05)'; ctx.fillRect(cx - r, y + Math.max(1, s * .05), 2 * r, 1);
  }
  // cable raceway running up the side
  ctx.fillStyle = 'rgba(0,0,0,.1)'; ctx.fillRect(cx + r * .55, yt, Math.max(1, r * .1), yb - yt);
  ctx.fillStyle = 'rgba(255,255,255,.06)'; ctx.fillRect(cx + r * .55 - 1, yt, 1, yb - yt);
  ctx.restore();
}
function tube(ctx, cx, r, yb, yt, col, o) { ctx.fillStyle = shade(ctx, cx - r, cx + r, col, o); ctx.fillRect(cx - r, yt, 2 * r, yb - yt); if (yb - yt > 3 * (o.s ?? 99)) seams(ctx, cx, r, yb, yt, o); }
function soot(ctx, cx, r, yb, h) {
  const g = ctx.createLinearGradient(0, yb, 0, yb - h); g.addColorStop(0, 'rgba(30,24,20,.45)'); g.addColorStop(1, 'rgba(30,24,20,0)');
  ctx.fillStyle = g; ctx.fillRect(cx - r, yb - h, 2 * r, h);
}
function taper(ctx, cx, rb, rt, yb, yt, col, o) {
  ctx.fillStyle = shade(ctx, cx - Math.max(rb, rt), cx + Math.max(rb, rt), col, o);
  ctx.beginPath(); ctx.moveTo(cx - rb, yb); ctx.lineTo(cx - rt, yt); ctx.lineTo(cx + rt, yt); ctx.lineTo(cx + rb, yb); ctx.fill();
}
function ogive(ctx, cx, r, yb, h, col, o, blunt = .12) {
  ctx.fillStyle = shade(ctx, cx - r, cx + r, col, o);
  ctx.beginPath(); ctx.moveTo(cx - r, yb);
  ctx.bezierCurveTo(cx - r, yb - h * .55, cx - r * blunt * 2, yb - h * .95, cx, yb - h);
  ctx.bezierCurveTo(cx + r * blunt * 2, yb - h * .95, cx + r, yb - h * .55, cx + r, yb);
  ctx.fill();
}
function band(ctx, cx, r, y, h, col, o) { tube(ctx, cx, r * 1.001, y + h, y, col, o); }
function nozzle(ctx, cx, r0, r1, y, h, o) {
  ctx.fillStyle = shade(ctx, cx - r1, cx + r1, [70, 66, 62], o);
  ctx.beginPath(); ctx.moveTo(cx - r0, y - h); ctx.quadraticCurveTo(cx - r0, y - h * .3, cx - r1, y); ctx.lineTo(cx + r1, y); ctx.quadraticCurveTo(cx + r0, y - h * .3, cx + r0, y - h); ctx.fill();
}
function fin(ctx, cx, side, r, yb, root, span, sweep, col, o) {
  const t = o.tint ?? [1, 1, 1];
  ctx.fillStyle = rgba(mul(col, side < 0 ? .8 : .45, t).map((v) => clamp(v, 0, 255)));
  ctx.beginPath(); ctx.moveTo(cx + side * r, yb); ctx.lineTo(cx + side * (r + span), yb + sweep * .2); ctx.lineTo(cx + side * (r + span), yb - root * .45); ctx.lineTo(cx + side * r, yb - root); ctx.fill();
}
const WHITE = [232, 230, 224], GREY = [150, 150, 150], DARK = [40, 40, 44];

const vehicles = {
  // Nike-Apache sounding rocket, ~8 m
  nike(ctx, x, y, s, o) {
    nozzle(ctx, x, .14 * s, .2 * s, y, .25 * s, o);
    const b0 = y - .25 * s;
    tube(ctx, x, .21 * s, b0, b0 - 3.3 * s, WHITE, o);
    for (const sd of [-1, 1]) fin(ctx, x, sd, .21 * s, b0, 1.1 * s, .55 * s, .2 * s, WHITE, o);
    taper(ctx, x, .21 * s, .1 * s, b0 - 3.3 * s, b0 - 3.6 * s, GREY, o);
    tube(ctx, x, .085 * s, b0 - 3.6 * s, b0 - 6.1 * s, WHITE, o);
    for (const sd of [-1, 1]) fin(ctx, x, sd, .085 * s, b0 - 3.65 * s, .45 * s, .22 * s, .1 * s, WHITE, o);
    band(ctx, x, .085 * s, b0 - 5.2 * s, .12 * s, DARK, o);
    ogive(ctx, x, .085 * s, b0 - 6.1 * s, 1.1 * s, [210, 210, 214], o);
  },
  slv3(ctx, x, y, s, o) {
    nozzle(ctx, x, .35 * s, .5 * s, y, .7 * s, o);
    const b = y - .7 * s;
    tube(ctx, x, .5 * s, b, b - 18.5 * s, WHITE, o);
    for (const sd of [-1, 1]) fin(ctx, x, sd, .5 * s, b, 2.4 * s, 1.0 * s, .3 * s, WHITE, o);
    for (const yy of [6.5, 12.2, 16]) band(ctx, x, .5 * s, b - yy * s, .35 * s, DARK, o);
    taper(ctx, x, .5 * s, .4 * s, b - 18.5 * s, b - 19 * s, GREY, o);
    ogive(ctx, x, .4 * s, b - 19 * s, 2.6 * s, WHITE, o);
  },
  pslv(ctx, x, y, s, o) {
    const strap = (dx, front) => {
      nozzle(ctx, x + dx, .3 * s, .42 * s, y + .2 * s, .6 * s, o);
      tube(ctx, x + dx, .5 * s, y - .4 * s, y - 11 * s, WHITE, o);
      band(ctx, x + dx, .5 * s, y - 9 * s, .3 * s, front ? [190, 70, 40] : DARK, o);
      ogive(ctx, x + dx, .5 * s, y - 11 * s, 1.9 * s, WHITE, o, .2);
    };
    strap(-1.9 * s); strap(1.9 * s);
    nozzle(ctx, x, .7 * s, 1.0 * s, y, 1.2 * s, o);
    const b = y - 1.2 * s;
    tube(ctx, x, 1.4 * s, b, b - 20 * s, WHITE, o);
    tube(ctx, x, 1.4 * s, b - 20 * s, b - 32 * s, [236, 234, 228], o);
    band(ctx, x, 1.4 * s, b - 20 * s, .4 * s, DARK, o);
    taper(ctx, x, 1.4 * s, 1.0 * s, b - 32 * s, b - 33.5 * s, GREY, o);
    tube(ctx, x, 1.0 * s, b - 33.5 * s, b - 36.5 * s, [205, 205, 210], o);
    taper(ctx, x, 1.0 * s, 1.6 * s, b - 36.5 * s, b - 37.6 * s, WHITE, o);
    tube(ctx, x, 1.6 * s, b - 37.6 * s, b - 40 * s, WHITE, o);
    ogive(ctx, x, 1.6 * s, b - 40 * s, 3.8 * s, WHITE, o, .15);
    soot(ctx, x, 1.4 * s, b, 2.5 * s);
    strap(-.85 * s, true); strap(.85 * s, true);
    this.mark(ctx, x, b - 26 * s, s, o, 'PSLV');
    this.word(ctx, x + .1 * s, b - 6 * s, s * .9, o, 'भारत  INDIA');
    this.logo(ctx, x, b - 39 * s, s * 2.6, o);
  },
  lvm3(ctx, x, y, s, o) {
    const booster = (dx) => {
      nozzle(ctx, x + dx, .9 * s, 1.35 * s, y + .3 * s, 1.6 * s, o);
      tube(ctx, x + dx, 1.6 * s, y - 1.3 * s, y - 23 * s, WHITE, o);
      band(ctx, x + dx, 1.6 * s, y - 4 * s, .5 * s, [70, 70, 74], o);
      band(ctx, x + dx, 1.6 * s, y - 18 * s, .4 * s, [70, 70, 74], o);
      taper(ctx, x + dx, 1.6 * s, .2 * s, y - 23 * s, y - 27 * s, WHITE, o);
      soot(ctx, x + dx, 1.6 * s, y - 1.3 * s, 2.2 * s);
    };
    for (const sd of [-1, 1]) nozzle(ctx, x + sd * .8 * s, .4 * s, .6 * s, y - 1 * s, 1.2 * s, o);
    tube(ctx, x, 2 * s, y - 2.2 * s, y - 24 * s, [214, 208, 196], o);
    band(ctx, x, 2 * s, y - 24 * s, .5 * s, DARK, o);
    tube(ctx, x, 2 * s, y - 24.5 * s, y - 33 * s, WHITE, o);
    taper(ctx, x, 2 * s, 2.5 * s, y - 33 * s, y - 34 * s, WHITE, o);
    tube(ctx, x, 2.5 * s, y - 34 * s, y - 38 * s, WHITE, o);
    ogive(ctx, x, 2.5 * s, y - 38 * s, 5.4 * s, WHITE, o, .15);
    booster(-3.6 * s); booster(3.6 * s);
    this.mark(ctx, x, y - 29 * s, s * 1.25, o, 'LVM3');
    this.logo(ctx, x, y - 36.4 * s, s * 3.6, o);
    for (const sd of [-1, 1]) this.word(ctx, x + sd * 3.6 * s, y - 8 * s, s * .95, o, 'भारत');
  },
  logo(ctx, x, y, size, o) {
    if (size < 6) return;
    require('./emblems').isroLogo(ctx, x, y, size, { words: false, alpha: clamp(o.markA ?? 1) * .95 });
  },
  word(ctx, x, y, s, o, str) {
    if (s < 4) return;
    ctx.save(); ctx.translate(x, y); ctx.rotate(-Math.PI / 2);
    ctx.font = `${Math.max(6, 1.05 * s)}px KohB`; ctx.letterSpacing = `${.15 * s}px`; ctx.fillStyle = rgba(mul([30, 44, 110], 1, o.tint ?? [1, 1, 1]), .85); ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
    ctx.fillText(str, 0, 0); ctx.restore();
  },
  // tricolour + lettering stripe on the body
  mark(ctx, x, y, s, o, label) {
    const t = o.tint ?? [1, 1, 1], a = clamp(o.markA ?? 1);
    const fw = 1.2 * s, fh = .8 * s;
    [[255, 153, 51], [250, 250, 250], [19, 136, 8]].forEach((c, i) => { ctx.fillStyle = rgba(mul(c, .9, t), a); ctx.fillRect(x - fw / 2 - .3 * s, y + i * fh / 3, fw, fh / 3); });
    ctx.save(); ctx.translate(x - .3 * s, y + 1.4 * s); ctx.rotate(Math.PI / 2);
    ctx.font = `${Math.max(6, .9 * s)}px AvDemi`; ctx.letterSpacing = `${.2 * s}px`; ctx.fillStyle = rgba(mul([40, 50, 120], 1, t), a); ctx.textBaseline = 'middle';
    ctx.fillText('ISRO', 0, 0); ctx.restore();
  },
};
function rocket(ctx, type, x, y, s, o = {}) { vehicles[type].call(vehicles, ctx, x, y, s, { ...o, s }); }

// lattice umbilical tower
function tower(ctx, x, y, w, h, o = {}) {
  const c = o.color ?? [30, 32, 38], lit = o.lit ?? [255, 190, 120], la = o.litA ?? .4;
  ctx.save();
  ctx.strokeStyle = rgba(c); ctx.lineWidth = Math.max(1, w * .05);
  ctx.beginPath();
  ctx.moveTo(x, y); ctx.lineTo(x, y - h); ctx.moveTo(x + w, y); ctx.lineTo(x + w, y - h);
  const n = Math.max(4, Math.round(h / w));
  for (let i = 0; i <= n; i++) { const yy = y - h * i / n; ctx.moveTo(x, yy); ctx.lineTo(x + w, yy); if (i < n) { ctx.moveTo(x, yy); ctx.lineTo(x + w, yy - h / n); ctx.moveTo(x + w, yy); ctx.lineTo(x, yy - h / n); } }
  ctx.stroke();
  ctx.lineWidth = Math.max(1, w * .03);
  ctx.strokeStyle = rgba(lit, la);
  ctx.beginPath(); ctx.moveTo(x + w, y); ctx.lineTo(x + w, y - h); ctx.stroke();
  // service arms
  ctx.fillStyle = rgba(c);
  for (const k of o.arms ?? []) ctx.fillRect(o.armDir > 0 ? x + w : x - k[1], y - h * k[0], k[1], w * .18);
  ctx.restore();
}

module.exports = { rocket, tower };
