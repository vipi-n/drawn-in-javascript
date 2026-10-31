// Zebu draught bullocks and the bullock cart that carried APPLE (1981). Side view, facing right.
// Shapes are built in metres (x forward, y up) and filled as backlit silhouettes with a rim of sunlight.
const { lerp, hash, noise2 } = require('./core');
const { rgba, mixc, glow } = require('./gfx');
const { capsule, poly, oval, ik, gait, rimFill, side, Path2D } = require('./people');

// run a list of path commands through a point mapper
function trace(p, segs, M) {
  for (const sg of segs) {
    const c = sg[0];
    if (c === 'M') p.moveTo(...M(sg[1], sg[2]));
    else if (c === 'L') p.lineTo(...M(sg[1], sg[2]));
    else if (c === 'Q') p.quadraticCurveTo(...M(sg[1], sg[2]), ...M(sg[3], sg[4]));
    else if (c === 'C') p.bezierCurveTo(...M(sg[1], sg[2]), ...M(sg[3], sg[4]), ...M(sg[5], sg[6]));
    else if (c === 'Z') p.closePath();
  }
}
// tapered limb through joints [[x,y,r],...] (metres) as overlapping capsules
function limb(p, M, s, pts) { for (let i = 0; i < pts.length - 1; i++) capsule(p, M(pts[i][0], pts[i][1]), M(pts[i + 1][0], pts[i + 1][1]), pts[i][2] * s, pts[i + 1][2] * s); }

const BODY = [
  ['M', -1.03, 1.30],
  ['C', -.90, 1.41, -.62, 1.41, -.40, 1.35],
  ['C', -.20, 1.31, .05, 1.31, .22, 1.37],
  ['C', .30, 1.56, .40, 1.75, .53, 1.74],
  ['C', .63, 1.73, .67, 1.58, .73, 1.47],
  ['C', .82, 1.41, .98, 1.39, 1.10, 1.37],
  ['C', 1.16, 1.37, 1.22, 1.34, 1.27, 1.28],
  ['C', 1.36, 1.17, 1.45, 1.04, 1.52, .96],
  ['C', 1.57, .92, 1.57, .86, 1.52, .84],
  ['C', 1.47, .82, 1.40, .84, 1.33, .88],
  ['C', 1.26, .92, 1.20, .97, 1.15, 1.00],
  ['C', 1.12, .90, 1.07, .78, .97, .72],
  ['C', .89, .67, .80, .69, .74, .74],
  ['C', .68, .70, .62, .66, .52, .64],
  ['C', .30, .58, -.10, .56, -.30, .61],
  ['C', -.45, .65, -.56, .73, -.62, .84],
  ['C', -.74, .86, -.90, .86, -1.00, .92],
  ['C', -1.10, 1.00, -1.12, 1.16, -1.03, 1.30],
  ['Z'],
];
const EAR = [['M', 1.19, 1.27], ['Q', 1.08, 1.27, .97, 1.14], ['Q', 1.09, 1.14, 1.21, 1.2], ['Z']];

// near/far: Path2D for the side facing the camera and the far-side legs. x,y = ground under the barrel.
function zebu(near, far, x, y, s, dist, o = {}) {
  const stride = .7, duty = .62, cyc = dist / (stride / duty) + (o.phase ?? 0);
  const bob = .014 * Math.sin(cyc * Math.PI * 4), nod = .04 * Math.sin(cyc * Math.PI * 4 + 1.3);
  const P = (px, py) => [x + px * s, y - py * s];
  const B = (px, py) => P(px, py + bob + (px > .8 ? nod * Math.min(1, (px - .8) / .6) : 0));
  // lateral-sequence walk: near hind, near fore, far hind, far fore
  const legs = [['h', 0, far, .5], ['f', 0, far, .75], ['h', 1, near, 0], ['f', 1, near, .25]];
  for (const [kind, isNear, pth, off] of legs) {
    const [fx, fl] = gait(cyc + off, duty, stride, .13), dz = isNear ? 0 : .05;
    if (kind === 'f') {
      const root = [.6 + dz, 1.25 + bob], fet = [.58 + dz + fx, .14 + fl], knee = ik(root, fet, .84, .34, 1);
      const elbow = [lerp(root[0], knee[0], .6) - .02, lerp(root[1], knee[1], .6)];
      limb(pth, B, s, [[root[0], root[1], .15], [elbow[0], elbow[1], .11], [knee[0], knee[1], .058], [fet[0], fet[1], .046]]);
      oval(pth, B(fet[0] + .005, fet[1]), .058 * s, .05 * s);
      poly(pth, [B(fet[0] - .04, fet[1]), B(fet[0] + .045, fet[1] + .01), B(fet[0] + .1, fl), B(fet[0] - .04, fl)]);
    } else {
      const root = [-.72 + dz, 1.1 + bob], fet = [-.8 + dz + fx, .14 + fl], hock = ik(root, fet, .62, .4, -1);
      const stifle = [lerp(root[0], hock[0], .42) + .12, lerp(root[1], hock[1], .42)];
      // thigh and gaskin, hock point, thin cannon
      poly(pth, [B(-1.0, 1.05), B(-.5, 1.0), B(stifle[0] + .04, stifle[1]), B(hock[0] + .05, hock[1] + .06), B(hock[0] - .07, hock[1] + .02), B(-1.02, .9)]);
      limb(pth, B, s, [[stifle[0], stifle[1], .1], [hock[0], hock[1], .06], [fet[0], fet[1], .045]]);
      oval(pth, B(hock[0] - .045, hock[1] + .01), .045 * s, .05 * s);
      oval(pth, B(fet[0] + .005, fet[1]), .056 * s, .05 * s);
      poly(pth, [B(fet[0] - .04, fet[1]), B(fet[0] + .045, fet[1] + .01), B(fet[0] + .1, fl), B(fet[0] - .04, fl)]);
    }
  }
  trace(near, BODY, B);
  trace(near, EAR, B);
  // horns sweeping up and back, the far one peeking past the poll
  for (const [bx, by, mx, my, tx, ty] of [[1.17, 1.33, 1.21, 1.47, 1.17, 1.58], [1.12, 1.33, 1.12, 1.47, 1.04, 1.57]]) limb(near, B, s, [[bx, by, .045], [mx, my, .032], [tx, ty, .012]]);
  // tail with a swinging switch
  const tw = Math.sin(cyc * Math.PI * 2 + .6) * .05 + noise2(dist * .7, 3) * .03;
  limb(near, B, s, [[-1.04, 1.27, .03], [-1.11 + tw * .4, .95, .022], [-1.1 + tw, .58, .016]]);
  oval(near, B(-1.1 + tw * 1.1, .5), .045 * s, .1 * s, tw);
  return { neck: B(.86, 1.43), eye: B(1.24, 1.2), hump: B(.52, 1.66) };
}

// APPLE: drum of solar cells with a parabolic dish, lit from behind-left by the low sun
function apple(ctx, x, y, s, sun) {
  const w = 1.3 * s, h = 1.12 * s, x0 = x - w / 2, y0 = y - h;
  // support frame
  ctx.fillStyle = 'rgb(18,11,8)'; ctx.fillRect(x0 - .1 * s, y - .12 * s, w + .2 * s, .12 * s);
  const g = ctx.createLinearGradient(x0, 0, x0 + w, 0);
  g.addColorStop(0, rgba([255, 200, 140])); g.addColorStop(.06, rgba([150, 90, 70])); g.addColorStop(.25, rgba([54, 40, 62])); g.addColorStop(.7, rgba([24, 20, 34])); g.addColorStop(1, rgba([12, 10, 16]));
  ctx.fillStyle = g; ctx.fillRect(x0, y0, w, h);
  // solar cell grid catching a little of the sky
  ctx.strokeStyle = 'rgba(150,120,160,.18)'; ctx.lineWidth = 1; ctx.beginPath();
  for (let i = 1; i < 14; i++) { const xx = x0 + w * (.5 - .5 * Math.cos(i / 14 * Math.PI)); ctx.moveTo(xx, y0 + .08 * s); ctx.lineTo(xx, y - .1 * s); }
  for (let j = 1; j < 9; j++) { const yy = y0 + .08 * s + (h - .18 * s) * j / 9; ctx.moveTo(x0, yy); ctx.lineTo(x0 + w, yy); }
  ctx.stroke();
  // gold rims top and bottom
  for (const [yy, hh] of [[y0, .08], [y - .1 * s, .1]]) {
    const gg = ctx.createLinearGradient(x0, 0, x0 + w, 0);
    gg.addColorStop(0, rgba([255, 226, 150])); gg.addColorStop(.12, rgba([200, 140, 60])); gg.addColorStop(.5, rgba([90, 60, 26])); gg.addColorStop(1, rgba([36, 24, 12]));
    ctx.fillStyle = gg; ctx.fillRect(x0, yy, w, hh * s);
  }
  ctx.fillStyle = rgba([255, 214, 150], .9); ctx.fillRect(x0, y0, 2, h);
  // mast and dish
  ctx.fillStyle = 'rgb(30,22,20)'; ctx.fillRect(x - .03 * s, y0 - .3 * s, .06 * s, .3 * s);
  ctx.save(); ctx.translate(x - .05 * s, y0 - .34 * s); ctx.rotate(-.35);
  const dg = ctx.createLinearGradient(-.5 * s, 0, .5 * s, 0);
  dg.addColorStop(0, rgba([255, 236, 210])); dg.addColorStop(.25, rgba([170, 140, 140])); dg.addColorStop(1, rgba([40, 34, 44]));
  ctx.fillStyle = dg; ctx.beginPath(); ctx.moveTo(-.48 * s, -.02 * s); ctx.quadraticCurveTo(0, .32 * s, .48 * s, -.02 * s); ctx.quadraticCurveTo(0, .1 * s, -.48 * s, -.02 * s); ctx.fill();
  ctx.strokeStyle = 'rgb(40,30,30)'; ctx.lineWidth = Math.max(1, .02 * s); ctx.beginPath(); ctx.moveTo(-.3 * s, .05 * s); ctx.lineTo(0, -.32 * s); ctx.lineTo(.3 * s, .05 * s); ctx.stroke();
  ctx.fillStyle = 'rgb(40,30,30)'; ctx.fillRect(-.03 * s, -.36 * s, .06 * s, .06 * s);
  ctx.restore();
  if (sun) glow(ctx, x0 + 2, y0 + h * .3, .5 * s, [255, 190, 120], .25);
}

// cart wheel: iron tyre, wooden felloe, 12 spokes, big hub
function wheel(p, cx, cy, r, s, ang) {
  p.ring(cx, cy, r * .84, r);
  for (let k = 0; k < 12; k++) { const a = ang + k * Math.PI / 6; capsule(p, [cx + Math.cos(a) * r * .2, cy + Math.sin(a) * r * .2], [cx + Math.cos(a) * r * .88, cy + Math.sin(a) * r * .88], .028 * s, .02 * s); }
  oval(p, [cx, cy], r * .24, r * .24); 
}

// the whole convoy: far bullock, cart with APPLE, near bullock, drover and engineers
function cart(ctx, x, y, s, dist, o = {}) {
  const sun = o.sun ?? [-1, -.25], body = o.body ?? [16, 10, 9], rim = o.rim ?? [255, 196, 120];
  const farBody = mixc(body, o.haze ?? [120, 70, 50], .1);
  const bx = x + 2.85 * s, wr = .7 * s, wa = dist / .7;
  const lit = (pth, col, rk = 1) => rimFill(ctx, pth, { body: col, rim, rimA: .95 * rk, rimW: Math.max(1.5, s * .022), lx: sun[0], ly: sun[1], soft: true });
  // far bullock (other side of the pole, a little ahead)
  { const nr = new Path2D(), fr = new Path2D(); const r = zebu(nr, fr, bx + .22 * s, y - .06 * s, s * .97, dist, { phase: .5 }); lit(fr, mixc(farBody, [0, 0, 0], .2), .6); lit(nr, farBody, .8); o._farNeck = r.neck; }
  // far wheel, bed, rails, satellite
  { const p = new Path2D(); wheel(p, x + .05 * s, y - wr + .02 * s, wr * .98, s, wa + .2); lit(p, farBody, .5); }
  const bedY = y - 1.08 * s;
  apple(ctx, x - .25 * s, bedY - .1 * s, s, true);
  {
    const p = new Path2D();
    poly(p, [[x - 1.45 * s, bedY], [x + 1.0 * s, bedY], [x + 1.0 * s, bedY + .12 * s], [x - 1.45 * s, bedY + .12 * s]]);
    // pole to the yoke
    capsule(p, [x + .9 * s, bedY + .05 * s], [bx + .9 * s, y - 1.38 * s], .05 * s, .04 * s);
    // stakes and top rail
    for (let i = 0; i < 7; i++) capsule(p, [x + (-1.4 + i * .4) * s, bedY + .02 * s], [x + (-1.4 + i * .4) * s, bedY - .42 * s], .018 * s, .014 * s);
    capsule(p, [x - 1.42 * s, bedY - .42 * s], [x + .98 * s, bedY - .4 * s], .02 * s, .02 * s);
    // axle block and the rear prop
    poly(p, [[x - .3 * s, bedY + .1 * s], [x + .3 * s, bedY + .1 * s], [x + .2 * s, y - wr + .05 * s], [x - .2 * s, y - wr + .05 * s]]);
    capsule(p, [x - 1.35 * s, bedY + .1 * s], [x - 1.5 * s, y - .35 * s], .02 * s, .018 * s);
    lit(p, body);
  }
  // near bullock
  let neck;
  { const nr = new Path2D(), fr = new Path2D(); const r = zebu(nr, fr, bx, y, s, dist); lit(fr, mixc(body, [0, 0, 0], .1), .5); lit(nr, body); neck = r.neck; ctx.fillStyle = rgba([255, 200, 140], .5); ctx.beginPath(); ctx.arc(r.eye[0], r.eye[1], Math.max(1, .012 * s), 0, Math.PI * 2); ctx.fill(); }
  // yoke across both necks
  { const p = new Path2D(); capsule(p, [o._farNeck[0] + .1 * s, o._farNeck[1] - .03 * s], [neck[0] - .02 * s, neck[1] + .02 * s], .05 * s, .05 * s); oval(p, [neck[0] - .02 * s, neck[1] + .02 * s], .07 * s, .05 * s); lit(p, body); }
  // near wheel
  { const p = new Path2D(); wheel(p, x, y - wr, wr, s, wa); lit(p, body); }
  // people walking with it: drover by the near bullock's shoulder, engineers behind the cart
  {
    const p = new Path2D(), f = new Path2D();
    side(p, f, x + 1.45 * s, y + .12 * s, s * 1.05, dist, { dress: 'dhoti', head: 'turban', stick: true, phase: .3 });
    lit(f, mixc(body, [0, 0, 0], .1), .6); lit(p, body);
    const q = new Path2D(), g = new Path2D();
    side(q, g, x - 2.35 * s, y + .05 * s, s, dist, { dress: 'shirt', head: 'hair', phase: .65 });
    side(q, g, x - 3.3 * s, y - .02 * s, s * .97, dist, { dress: 'shirt', head: 'hair', phase: .1 });
    lit(g, mixc(body, [0, 0, 0], .1), .6); lit(q, body);
  }
}

module.exports = { zebu, cart, apple, wheel, trace, limb };
