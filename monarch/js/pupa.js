// The chrysalis: jade green with a gold-dotted black crown, hanging from a black cremaster hooked into a silk pad.
// Also the stages around it: the J caterpillar's skin sliding up off the new pupa, the pupa shortening into shape,
// the case turning clear to show the folded orange wings, and the split empty shell after the butterfly leaves.
const { TAU, clamp, lerp, ss, hash, noise1, rgba, mix, PAL } = require('./core');
const D = require('./draw');

const INK = '#141110';

// radius at v (0 = top of the body under the cremaster, 1 = bottom), as a fraction of height
function prof(v, el = 0) {
  v = clamp(v);
  const base = .245 * Math.pow(Math.sin(Math.PI * Math.pow(v, .82)), .5) + .018 * Math.exp(-(((v - .17) / .08) ** 2));
  return lerp(base, .17 * Math.pow(Math.sin(Math.PI * Math.pow(v, .75)), .6), el);
}
function outline(h, el = 0, wob = 0, t = 0) {
  const n = 46, L = [], R = [];
  for (let i = 0; i <= n; i++) {
    const v = i / n, r = prof(v, el) * h, y = v * h * lerp(1, 1.45, el);
    const sway = wob * Math.sin(v * 3 - t * 9) * h * .05 * v;
    L.push([-r + sway, y]); R.push([r + sway, y]);
  }
  return R.concat(L.reverse());
}

function silkPad(ctx, x, y, s) {
  ctx.save();
  for (let i = 0; i < 14; i++) {
    const a = hash(i) * TAU, r = s * (.3 + hash(i + 7) * .7);
    ctx.strokeStyle = rgba('#ffffff', .55); ctx.lineWidth = Math.max(.6, s * .08);
    ctx.beginPath(); ctx.moveTo(x - Math.cos(a) * r, y - Math.abs(Math.sin(a)) * r * .4); ctx.lineTo(x + Math.cos(a) * r, y + Math.abs(Math.sin(a)) * r * .3); ctx.stroke();
  }
  D.glow(ctx, x, y, s * 1.4, '#ffffff', .5);
  ctx.restore();
}

// o: h (body height), crem (cremaster length fraction), el (0 final shape .. 1 elongated fresh pupa), wob (wriggle),
//    gold (0..1 dots appear), clear (0..1 turns transparent showing wings), crack (0..1 split at the bottom), empty,
//    rot (swing), t, alpha, glow
function chrysalis(ctx, x, y, o = {}) {
  const h = o.h ?? 200, el = o.el ?? 0, cl = o.crem ?? .1, t = o.t ?? 0, clear = o.clear ?? 0, gold = o.gold ?? 1, crack = o.crack ?? 0;
  ctx.save(); ctx.translate(x, y); ctx.rotate(o.rot ?? 0);
  if (o.alpha !== undefined) ctx.globalAlpha *= o.alpha;
  if (o.pad !== false) silkPad(ctx, 0, 0, h * .09);
  // cremaster
  ctx.strokeStyle = rgba(INK); ctx.lineWidth = h * .035; ctx.lineCap = 'round';
  D.line(ctx, 0, 0, 0, h * cl + 2);
  ctx.translate(0, h * cl);
  const pts = outline(h, el, o.wob ?? 0, t);
  if (o.empty) { emptyShell(ctx, pts, h, o); ctx.restore(); return; }
  // body
  D.shape(ctx, pts);
  const g = ctx.createLinearGradient(-h * .3, 0, h * .3, 0);
  const jade = mix(PAL.jade, '#3e4a40', clear * .6), deep = mix(PAL.jadeDeep, '#141a16', clear * .7), light = mix(PAL.jadeLight, '#c8d0c8', clear * .5);
  g.addColorStop(0, rgba(light)); g.addColorStop(.35, rgba(jade)); g.addColorStop(1, rgba(deep));
  ctx.fillStyle = g; ctx.fill();
  ctx.save(); D.shape(ctx, pts); ctx.clip();
  if (clear > 0) insideWings(ctx, h, clear, el);
  // wing-case outline and abdomen rings, faint
  ctx.strokeStyle = rgba(mix('#e9ffe6', '#ffffff', clear), .35 * (1 - el * .5)); ctx.lineWidth = h * .008;
  ctx.beginPath(); ctx.moveTo(-h * .2, h * .32); ctx.bezierCurveTo(-h * .05, h * .5, h * .18, h * .72, h * .02, h * .95); ctx.stroke();
  for (let k = 1; k < (el > .3 ? 9 : 4); k++) { const v = k * (el > .3 ? .1 : .065), r = prof(v, el) * h, yy = v * h * lerp(1, 1.45, el); ctx.beginPath(); ctx.ellipse(0, yy, r, r * .18, 0, 0, Math.PI); ctx.stroke(); }
  // glossy highlights
  const hl = ctx.createLinearGradient(-h * .26, 0, -h * .05, 0);
  hl.addColorStop(0, rgba('#ffffff', 0)); hl.addColorStop(.5, rgba('#ffffff', .38)); hl.addColorStop(1, rgba('#ffffff', 0));
  ctx.fillStyle = hl; ctx.fillRect(-h * .26, h * .08, h * .21, h * .8);
  D.glow(ctx, -h * .08, h * .2, h * .12, '#ffffff', .45);
  ctx.restore();
  if (el < .5 && gold > 0) crown(ctx, h, gold * (1 - el * 2), t, clear);
  // crack at the bottom when the butterfly is ready
  if (crack > 0) {
    ctx.strokeStyle = rgba('#fff8e8', .85); ctx.lineWidth = h * .01; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(-h * .17 * crack, h * (.97 - .2 * crack)); ctx.lineTo(-h * .07, h * (.97 - .08 * crack)); ctx.lineTo(h * .02, h * (.98 - .14 * crack)); ctx.lineTo(h * .14 * crack, h * (.96 - .24 * crack)); ctx.stroke();
  }
  ctx.strokeStyle = rgba(mix(PAL.jadeDeep, '#000000', .3), .6); ctx.lineWidth = h * .01; D.shape(ctx, pts); ctx.stroke();
  ctx.restore();
}

// the black line with gold dots around the top third, plus a few gold spots lower down
function crown(ctx, h, a, t, clear) {
  const v = .3, r = prof(v) * h, y = v * h;
  ctx.save(); ctx.globalAlpha *= a;
  ctx.strokeStyle = rgba(INK, .9); ctx.lineWidth = h * .014;
  ctx.beginPath(); ctx.ellipse(0, y, r * .98, r * .22, 0, .1, Math.PI - .1); ctx.stroke();
  const dots = [];
  for (let k = 0; k < 9; k++) { const u = (k + .5) / 9, ang = Math.PI * u; dots.push([Math.cos(ang) * r * .92, y - h * .022 + Math.sin(ang) * r * .2, h * .019 * (.6 + .4 * Math.sin(ang))]); }
  dots.push([-h * .12, h * .78, h * .016], [h * .1, h * .8, h * .015], [-h * .03, h * .9, h * .012], [h * .04, h * .12, h * .012], [-h * .05, h * .1, h * .011]);
  dots.forEach(([dx, dy, rr], i) => {
    const tw = .75 + .25 * Math.sin(t * 3 + i * 1.7);
    const g = ctx.createRadialGradient(dx - rr * .3, dy - rr * .3, 0, dx, dy, rr);
    g.addColorStop(0, '#fffbd0'); g.addColorStop(.4, PAL.goldDot); g.addColorStop(1, '#a8701a');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(dx, dy, rr, 0, TAU); ctx.fill();
    D.glow(ctx, dx, dy, rr * 3.5, '#ffe9a0', .3 * tw * (1 - clear));
  });
  ctx.restore();
}

// what shows through the clearing case: folded orange wings with black veins and a white-dotted border, black body
function insideWings(ctx, h, a, el) {
  ctx.save(); ctx.globalAlpha *= ss(0, 1, a);
  ctx.fillStyle = rgba('#1b1210', .85); ctx.fillRect(-h, 0, h * 2, h * .34);
  ctx.save(); ctx.translate(-h * .02, h * .3); ctx.rotate(.1);
  const wpts = [[-h * .16, 0], [h * .2, -h * .02], [h * .22, h * .3], [h * .08, h * .62], [-h * .06, h * .66], [-h * .2, h * .3]];
  D.shape(ctx, wpts); ctx.fillStyle = rgba('#e8781e'); ctx.fill();
  ctx.save(); D.shape(ctx, wpts); ctx.clip();
  ctx.strokeStyle = rgba('#1b1210'); ctx.lineWidth = h * .022; ctx.lineCap = 'round';
  for (let k = 0; k < 6; k++) { ctx.beginPath(); ctx.moveTo(-h * .12 + k * h * .01, h * .02); ctx.quadraticCurveTo(-h * .05 + k * h * .05, h * .3, -h * .1 + k * h * .06, h * .66); ctx.stroke(); }
  ctx.lineWidth = h * .07; D.shape(ctx, wpts); ctx.stroke();
  for (let k = 0; k < 12; k++) { const u = k / 11; D.dot(ctx, lerp(h * .2, -h * .04, u) + Math.sin(u * 3) * h * .02, lerp(h * .05, h * .62, u), h * .008, '#fff6e0'); }
  ctx.restore();
  ctx.restore();
  ctx.restore();
}

function emptyShell(ctx, pts, h, o) {
  ctx.save(); ctx.scale(.94, .86);
  const sh = pts.map(([x, y], i) => [x * (1 + .06 * Math.sin(i * 1.7)), y]);
  D.shape(ctx, sh);
  ctx.fillStyle = rgba('#e3eee6', .3); ctx.fill();
  ctx.strokeStyle = rgba('#ffffff', .65); ctx.lineWidth = h * .01; ctx.stroke();
  ctx.strokeStyle = rgba('#ffffff', .3); ctx.lineWidth = h * .006;
  for (let k = 0; k < 5; k++) { ctx.beginPath(); ctx.moveTo(-h * .15 + k * h * .07, h * .35); ctx.quadraticCurveTo(-h * .1 + k * h * .05, h * .6, -h * .12 + k * h * .06, h * .85); ctx.stroke(); }
  // the split flaps curling open at the bottom
  ctx.fillStyle = rgba('#d8e6dc', .4); ctx.strokeStyle = rgba('#ffffff', .6); ctx.lineWidth = h * .008;
  for (const sd of [-1, 1]) { ctx.beginPath(); ctx.moveTo(sd * h * .2, h * .78); ctx.quadraticCurveTo(sd * h * .27, h * .93, sd * h * .15, h * 1.0); ctx.quadraticCurveTo(sd * h * .08, h * .92, sd * h * .05, h * .84); ctx.closePath(); ctx.fill(); ctx.stroke(); }
  D.glow(ctx, -h * .06, h * .25, h * .12, '#ffffff', .3);
  ctx.restore();
}

// the striped larval skin bunched on top of a fresh pupa: from the cremaster down to `low` (fraction of h)
function skinSleeve(ctx, x, y, h, low, o = {}) {
  if (low <= .01) return;
  const t = o.t ?? 0, len = h * low;
  ctx.save(); ctx.translate(x, y); ctx.rotate(o.rot ?? 0);
  if (o.alpha !== undefined) ctx.globalAlpha *= o.alpha;
  const w = h * .125;
  const pts = []; for (let i = 0; i <= 16; i++) { const v = i / 16; pts.push([w * lerp(.55, 1.05, v) * (1 + .14 * Math.sin(i * 2.3 + t * 6)) * (v < .1 ? lerp(.6, 1, v / .1) : 1), v * len]); }
  const all = pts.concat(pts.slice().reverse().map(([px, py]) => [-px * (1 + .05 * Math.sin(py)), py]));
  D.shape(ctx, all); ctx.fillStyle = rgba(INK); ctx.fill();
  ctx.save(); D.shape(ctx, all); ctx.clip();
  const bands = Math.max(3, Math.round(13 * low * 1.4)), bh = len / bands;
  for (let k = 0; k < bands; k++) {
    const y0 = k * bh;
    ctx.fillStyle = rgba(PAL.larvaYellow, .85); ctx.fillRect(-w * 1.2, y0, w * 2.4, bh * .27);
    ctx.fillStyle = rgba(PAL.larvaWhite, .85); ctx.fillRect(-w * 1.2, y0 + bh * .38, w * 2.4, bh * .2);
  }
  ctx.fillStyle = rgba('#000000', .25); ctx.fillRect(w * .3, 0, w, len);
  ctx.restore();
  // limp filaments on the bunched skin
  ctx.strokeStyle = rgba(INK); ctx.lineWidth = h * .012; ctx.lineCap = 'round';
  for (const sd of [-1, 1]) { ctx.beginPath(); ctx.moveTo(sd * w * .7, len * .4); ctx.quadraticCurveTo(sd * w * 1.25, len * .55, sd * w * 1.1, len * .5 + h * .09); ctx.stroke(); }
  ctx.restore();
}

module.exports = { chrysalis, skinSleeve, silkPad, prof };
