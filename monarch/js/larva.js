// Monarch egg and caterpillar (larva). The caterpillar is 13 rings + head laid along any path (leaf edge, stem, twig
// underside, the J-hang curve); a peristaltic wave runs tail -> head when it crawls; stripes, filaments, true legs and
// prolegs follow the rings. instar 1..5 sets size-independent looks (pale first instar -> bold stripes, long filaments).
const { TAU, clamp, lerp, ss, smooth, hash, noise1, rgba, mix, PAL } = require('./core');
const D = require('./draw');

const INK = '#141110';

// ---------------------------------------------------------------- paths with arc length
function polyPath(pts) {
  const acc = [0];
  for (let i = 1; i < pts.length; i++) acc.push(acc[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const len = acc[acc.length - 1];
  const at = (s) => {
    if (s <= 0) { const [a, b] = [pts[0], pts[1]], l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, tx = (b[0] - a[0]) / l, ty = (b[1] - a[1]) / l; return [a[0] + tx * s, a[1] + ty * s, tx, ty]; }
    if (s >= len) { const [a, b] = [pts[pts.length - 2], pts[pts.length - 1]], l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, tx = (b[0] - a[0]) / l, ty = (b[1] - a[1]) / l; return [b[0] + tx * (s - len), b[1] + ty * (s - len), tx, ty]; }
    let lo = 0, hi = acc.length - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (acc[m] <= s) lo = m; else hi = m; }
    const a = pts[lo], b = pts[hi], l = acc[hi] - acc[lo] || 1, u = (s - acc[lo]) / l, tx = (b[0] - a[0]) / l, ty = (b[1] - a[1]) / l;
    return [lerp(a[0], b[0], u), lerp(a[1], b[1], u), tx, ty];
  };
  return { at, len, pts };
}
// straight path starting at (x, y) (s = 0) heading along ang; negative s extrapolates backwards
const linePath = (x, y, ang, len = 3000) => polyPath([[x, y], [x + Math.cos(ang) * len, y + Math.sin(ang) * len]]);
// J-hang: hangs from (ax, ay); drop 0 = lying along the twig to the right, 1 = hanging straight down; curl bends the
// lower end round toward the ventral side (to the right) into a J
function jPath(ax, ay, L, drop, curl) {
  const pts = [], n = 60, hook = L * .42 * curl, rho = Math.max(1, hook / (Math.PI * .95));
  for (let i = 0; i <= n; i++) {
    const s = L * 1.15 * i / n; let x, y;
    if (s <= L - hook) { x = 0; y = s; }
    else { const th = Math.PI - (s - (L - hook)) / rho; x = rho + Math.cos(th) * rho; y = L - hook + Math.sin(th) * rho; }
    pts.push([x, y]);
  }
  const a = -(1 - drop) * Math.PI / 2, c = Math.cos(a), s = Math.sin(a);
  return polyPath(pts.map(([x, y]) => [ax + x * c - y * s, ay + x * s + y * c]));
}

// ---------------------------------------------------------------- egg (height h, base at x,y)
function eggProfile(v) { return .37 * Math.pow(Math.sin(Math.PI * Math.pow(clamp(v), .72)), .78) * (1 - .12 * v); }
function egg(ctx, x, y, h, o = {}) {
  const dark = o.dark ?? 0, hole = o.hole ?? 0;
  ctx.save(); ctx.translate(x, y); ctx.rotate(o.rot ?? 0);
  if (o.alpha !== undefined) ctx.globalAlpha *= o.alpha;
  const out = [];
  for (let i = 0; i <= 40; i++) { const v = i / 40; out.push([eggProfile(v) * h, -v * h]); }
  const pts = out.concat(out.slice(1, -1).reverse().map(([px, py]) => [-px, py]));
  if (!o.noShadow) { ctx.save(); ctx.scale(1, .25); D.glow(ctx, 0, 6, h * .5, '#1d3a0c', .35); ctx.restore(); }
  D.shape(ctx, pts);
  const g = ctx.createRadialGradient(-h * .12, -h * .62, h * .04, 0, -h * .45, h * .62);
  g.addColorStop(0, '#fffdf0'); g.addColorStop(.45, o.col ?? '#f6e9bf'); g.addColorStop(1, '#cdb47a');
  ctx.fillStyle = g; ctx.fill();
  ctx.save(); D.shape(ctx, pts); ctx.clip();
  if (dark > 0) { // the black head of the larva shows through the top before it hatches
    const dg = ctx.createRadialGradient(0, -h * .86, 0, 0, -h * .8, h * .42);
    dg.addColorStop(0, rgba('#1b1612', .95 * dark)); dg.addColorStop(.6, rgba('#4a4030', .55 * dark)); dg.addColorStop(1, rgba('#4a4030', 0));
    ctx.fillStyle = dg; ctx.fillRect(-h, -h * 1.3, h * 2, h);
    if (o.curled) { ctx.strokeStyle = rgba('#7a7050', .35 * dark); ctx.lineWidth = h * .06; ctx.beginPath(); ctx.arc(0, -h * .5, h * .18, -1, 3.6); ctx.stroke(); }
  }
  // longitudinal ridges and faint cross-ribs
  ctx.lineWidth = Math.max(.6, h * .018);
  for (let k = -5; k <= 5; k++) {
    const ph = k / 5.6 * Math.PI / 2, sh = Math.sin(ph);
    ctx.strokeStyle = rgba(k < 1 ? '#fffbe8' : '#b89c62', .5 - Math.abs(sh) * .25);
    ctx.beginPath(); for (let i = 0; i <= 30; i++) { const v = i / 30, px = eggProfile(v) * h * sh, py = -v * h; if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py); } ctx.stroke();
  }
  ctx.strokeStyle = rgba('#b89c62', .22); ctx.lineWidth = Math.max(.4, h * .008);
  for (let j = 1; j < 14; j++) { const v = j / 14, r = eggProfile(v) * h; ctx.beginPath(); ctx.ellipse(0, -v * h, r, r * .18, 0, 0, Math.PI); ctx.stroke(); }
  ctx.restore();
  D.glow(ctx, -h * .12, -h * .66, h * .16, '#ffffff', .7);
  ctx.strokeStyle = rgba('#a88e58', .8); ctx.lineWidth = Math.max(.7, h * .015); D.shape(ctx, pts); ctx.stroke();
  if (hole > 0) { // chewed opening at the top
    const r = eggProfile(.86) * h * hole;
    ctx.fillStyle = rgba('#1a140c'); ctx.beginPath();
    for (let i = 0; i <= 18; i++) { const a = TAU * i / 18, k = 1 + .18 * Math.sin(a * 5 + 1); ctx.lineTo(Math.cos(a) * r * k, -h * .86 + Math.sin(a) * r * .5 * k); }
    ctx.fill();
  }
  ctx.restore();
}

// ---------------------------------------------------------------- caterpillar
const NR = 13; // rings, tail (0) .. T1 (12)
const RAD = [.6, .84, .96, 1, 1, 1, 1, 1, 1, .99, .97, .93, .88];
const PROLEGS = [0, 4, 5, 6, 7], LEGS = [10, 11, 12];
const BANDS = [[.0, .27, 'Y'], [.37, .58, 'W'], [.7, .8, 'W']];

function crawlAdv(i, p, w = .32) {
  const c = Math.floor(p), f = p - c, lag = (1 - w) / (NR - 1), u = clamp((f - i * lag) / w);
  return [c + smooth(u), u > 0 && u < 1 ? Math.sin(Math.PI * u) : 0];
}

// o: path (polyPath), s0 (arc length of the tail), L (body length incl. head), R (body radius; default L*.075), up (+1 dorsal on
//    the left-hand side of the path direction, -1 the other side), instar, t, phase (crawl cycles), step (fraction of a ring
//    moved per cycle), eat (0..1 head bob), lift (raise the front, radians), toxin (x-ray glow), dull, limp, alpha, scale
function larva(ctx, o) {
  const L = o.L ?? 300, seg = L / (NR + .55), R = o.R ?? L * .085, inst = o.instar ?? 5, t = o.t ?? 0, up = o.up ?? 1;
  const path = o.path, s0 = o.s0 ?? 0, p = o.phase ?? 0, step = (o.step ?? .55) * seg;
  const stripeA = ss(1.25, 2.6, inst), full = ss(2.2, 3.6, inst), dull = o.dull ?? 0;
  // ring centres along the path
  const rings = [];
  for (let i = 0; i < NR; i++) {
    const [adv, hump] = o.phase === undefined ? [0, 0] : crawlAdv(i, p);
    const s = s0 + (i + .5) * seg + adv * step;
    const [x, y, tx, ty] = path.at(s), nx = ty * up, ny = -tx * up;
    const r = R * RAD[i] * (i >= 10 ? lerp(1.08, 1, ss(1, 2.5, inst)) : 1);
    const h = r + hump * R * .55;
    rings.push({ i, s, x: x + nx * h, y: y + ny * h, gx: x, gy: y, tx, ty, nx, ny, r, hump });
  }
  // eating / rearing: rotate the front rings about ring 9
  const bend = (o.lift ?? 0) + (o.eat ?? 0) * (.25 + .3 * (.5 + .5 * Math.sin(t * 4.2)));
  if (bend) {
    const pv = rings[8];
    for (let i = 9; i < NR; i++) {
      const k = (i - 8) / 4, a = -bend * up * k * 1.1, q = rings[i], dx = q.x - pv.x, dy = q.y - pv.y, c = Math.cos(a), sn = Math.sin(a);
      q.x = pv.x + dx * c - dy * sn; q.y = pv.y + dx * sn + dy * c;
      const tx = q.tx * c - q.ty * sn, ty = q.tx * sn + q.ty * c; q.tx = tx; q.ty = ty; q.nx = ty * up; q.ny = -tx * up;
    }
  }
  // continuous centreline in ring coordinates q (0..NR); q = i + .5 is ring i's centre
  const cl = (q) => {
    const f = clamp(q - .5, -.6, NR - 1 + .7), i = clamp(Math.floor(f), 0, NR - 2), u = f - i, a = rings[i], b = rings[i + 1];
    const nx = lerp(a.nx, b.nx, u), ny = lerp(a.ny, b.ny, u), nl = Math.hypot(nx, ny) || 1;
    return [lerp(a.x, b.x, u), lerp(a.y, b.y, u), nx / nl, ny / nl, lerp(a.r, b.r, clamp(u)) * (q < .6 ? lerp(.55, 1, clamp(q / .6)) : 1)];
  };
  const head = (() => {
    const a = rings[NR - 1], hr = R * lerp(1.05, .78, ss(1, 3, inst));
    const fx = -a.ny * up, fy = a.nx * up; // forward = tangent
    const x = a.x + fx * (a.r * .55 + hr * .62) - a.nx * hr * .28, y = a.y + fy * (a.r * .55 + hr * .62) - a.ny * hr * .28;
    return { x, y, r: hr, fx, fy, nx: a.nx, ny: a.ny };
  })();
  const discs = [];
  for (let k = 0; k <= NR * 3; k++) { const q = k / 3; const [x, y, , , r] = cl(q); discs.push([x, y, r * (k % 3 === 0 ? .96 : 1)]); }
  const silhouette = (g) => { g.beginPath(); for (const [x, y, r] of discs) { g.moveTo(x + r, y); g.arc(x, y, r, 0, TAU); } g.moveTo(head.x + head.r, head.y); g.arc(head.x, head.y, head.r, 0, TAU); };

  ctx.save();
  if (o.alpha !== undefined) ctx.globalAlpha *= o.alpha;
  if (o.shadow !== false && o.phase !== undefined) { // contact shadow on the surface
    ctx.save(); ctx.globalAlpha *= .25;
    for (const q of rings) D.glow(ctx, q.gx, q.gy, q.r * 1.3, '#0c1a05', .5);
    ctx.restore();
  }
  filaments(ctx, rings, R, inst, t, o, -1);
  appendages(ctx, rings, R, inst, o, -1, seg);
  // outline pass then body
  silhouette(ctx); ctx.lineWidth = Math.max(1.4, R * .16); ctx.strokeStyle = rgba(INK); ctx.lineJoin = 'round'; ctx.stroke();
  const pale = mix('#cdd8b4', '#9aa88a', dull);
  silhouette(ctx); ctx.fillStyle = rgba(mix(pale, INK, stripeA)); ctx.fill();
  ctx.save(); silhouette(ctx); ctx.clip();
  // stripes: quads between cross-sections, clipped to the body
  const Yc = mix(mix('#d7d9b0', PAL.larvaYellow, full), '#a8a080', dull), Wc = mix(mix('#e3e6d2', PAL.larvaWhite, full), '#b8b8a8', dull);
  for (let i = 0; i < NR; i++) {
    for (const [f0, f1, k] of BANDS) {
      const a = cl(i + f0), b = cl(i + f1), ra = a[4] * 1.4, rb = b[4] * 1.4;
      ctx.beginPath(); ctx.moveTo(a[0] - a[2] * ra, a[1] - a[3] * ra); ctx.lineTo(a[0] + a[2] * ra, a[1] + a[3] * ra); ctx.lineTo(b[0] + b[2] * rb, b[1] + b[3] * rb); ctx.lineTo(b[0] - b[2] * rb, b[1] - b[3] * rb); ctx.closePath();
      ctx.fillStyle = rgba(k === 'Y' ? Yc : Wc, stripeA); ctx.fill();
    }
  }
  if (stripeA < 1) { ctx.fillStyle = rgba(pale, (1 - stripeA) * .55); for (const [x, y, r] of discs) { ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); } }
  // lateral line of pale spots low on the side
  for (let i = 1; i < NR; i++) {
    const [x, y, nx, ny, r] = cl(i + .3);
    D.dot(ctx, x - nx * r * .55, y - ny * r * .55, r * .13, mix(Wc, PAL.larvaYellow, .4), .85 * stripeA);
  }
  // round shading: dark belly, light back, a glossy highlight line
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const offLine = (k) => { ctx.beginPath(); for (let j = 0; j <= NR * 2; j++) { const [x, y, nx, ny, r] = cl(j / 2); const px = x + nx * r * k, py = y + ny * r * k; if (j) ctx.lineTo(px, py); else ctx.moveTo(px, py); } };
  offLine(-.85); ctx.strokeStyle = rgba('#000000', .35); ctx.lineWidth = R * .7; ctx.stroke();
  offLine(.5); ctx.strokeStyle = rgba('#ffffff', .16); ctx.lineWidth = R * .5; ctx.stroke();
  offLine(.62); ctx.strokeStyle = rgba('#ffffff', .32); ctx.lineWidth = R * .12; ctx.stroke();
  if ((o.toxin ?? 0) > 0) { // milkweed poison stored in the body (x-ray)
    ctx.globalCompositeOperation = 'lighter';
    for (let k = 0; k < 70; k++) {
      const q = .3 + hash(k * 3) * (NR - .6), [x, y, nx, ny, r] = cl(q), off = (hash(k * 3 + 1) - .5) * 1.4 * r;
      const tw = .6 + .4 * Math.sin(t * 5 + k);
      D.glow(ctx, x + nx * off, y + ny * off, r * .5, '#c45cff', .5 * o.toxin * tw);
    }
    ctx.globalCompositeOperation = 'source-over';
  }
  ctx.restore();
  // ring grooves
  ctx.strokeStyle = rgba(INK, .35); ctx.lineWidth = Math.max(.6, R * .05);
  for (let i = 1; i < NR; i++) { const [x, y, nx, ny, r] = cl(i); ctx.beginPath(); ctx.moveTo(x - nx * r * .95, y - ny * r * .95); ctx.lineTo(x + nx * r * .95, y + ny * r * .95); ctx.stroke(); }
  appendages(ctx, rings, R, inst, o, 1, seg);
  headDraw(ctx, head, inst, t, o, up);
  filaments(ctx, rings, R, inst, t, o, 1);
  if ((o.eat ?? 0) > .2) { // leaf crumbs flicked out by the mandibles, tumbling away
    const mx = head.x + head.fx * head.r * .9, my = head.y + head.fy * head.r * .9;
    for (let k = 0; k < 7; k++) {
      const u = (t * 1.3 + hash(k * 5 + 1)) % 1, sd = hash(k * 5 + 2) - .5, fall = u * u * R * 7;
      const x = mx + sd * R * 2.2 * u + head.fx * R * .6 * u, y = my + fall + (hash(k * 5 + 3) - .5) * R * .3;
      ctx.save(); ctx.translate(x, y); ctx.rotate(t * 6 * sd + k);
      ctx.fillStyle = rgba(k % 3 ? '#7fbf4a' : '#b8e070', (o.eat ?? 0) * (1 - u) * .95);
      ctx.beginPath(); ctx.ellipse(0, 0, R * (.1 + hash(k) * .08), R * .06, 0, 0, TAU); ctx.fill(); ctx.restore();
    }
  }
  ctx.restore();
  return { rings, head, cl };
}

function headDraw(ctx, h, inst, t, o, up) {
  const { x, y, r, fx, fy, nx, ny } = h;
  ctx.save();
  ctx.fillStyle = rgba(INK); ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
  const full = ss(1.6, 3, inst);
  // yellow and white face bands: arcs around the front of the head capsule
  const ang = Math.atan2(fy, fx);
  ctx.lineCap = 'round';
  ctx.strokeStyle = rgba(PAL.larvaYellow, .95 * full); ctx.lineWidth = r * .22;
  ctx.beginPath(); ctx.arc(x - fx * r * .15, y - fy * r * .15, r * .62, ang - 1.25, ang + 1.25); ctx.stroke();
  ctx.strokeStyle = rgba(PAL.larvaWhite, .9 * full); ctx.lineWidth = r * .14;
  ctx.beginPath(); ctx.arc(x - fx * r * .55, y - fy * r * .55, r * .5, ang - .9, ang + .9); ctx.stroke();
  // mandibles chewing
  const chew = o.chew !== undefined ? .5 + .5 * Math.sin(o.chew * 22) : .3;
  const mx = x + fx * r * .78 - nx * r * .55, my = y + fy * r * .78 - ny * r * .55;
  ctx.fillStyle = rgba('#5a3a22');
  for (const sd of [-1, 1]) { const a = ang + Math.PI / 2 * up + sd * (.25 + .35 * chew); ctx.beginPath(); ctx.ellipse(mx + Math.cos(a) * r * .08, my + Math.sin(a) * r * .08, r * .2, r * .09, a, 0, TAU); ctx.fill(); }
  // glossy capsule highlight + tiny eyes
  D.glow(ctx, x - fx * r * .2 + nx * r * .45, y - fy * r * .2 + ny * r * .45, r * .55, '#ffffff', .22);
  D.dot(ctx, x + fx * r * .45 - nx * r * .05, y + fy * r * .45 - ny * r * .05, Math.max(.6, r * .07), '#cfd6dc', .8);
  ctx.restore();
}

// black filaments: front pair on T2 (ring 11), rear pair on A8 (ring 2); pass -1 = far one, 1 = near one
function filaments(ctx, rings, R, inst, t, o, pass) {
  const grow = ss(1.2, 3.2, inst), limp = o.limp ?? 0;
  if (grow <= .02) return;
  for (const [ri, len, fwd] of [[11, R * 3.3, 1], [2, R * 1.9, -1]]) {
    const q = rings[ri], Lf = len * grow * lerp(1, .85, limp);
    const tx = -q.ny * (o.up ?? 1), ty = q.nx * (o.up ?? 1);
    const off = pass < 0 ? -.22 : .18;
    const bx = q.x + q.nx * q.r * .8 + tx * q.r * off, by = q.y + q.ny * q.r * .8 + ty * q.r * off;
    const sw = noise1(t * 1.4 + ri + (pass < 0 ? 3 : 0), 7) * .35 + Math.sin(t * 2.3 + ri) * .12;
    const dir = [tx * fwd * .55 + q.nx * .85, ty * fwd * .55 + q.ny * .85];
    const g = [0, 1]; // gravity down on screen
    const droop = .25 + .6 * limp;
    const cx = bx + (dir[0] * .6 + tx * sw) * Lf, cy = by + (dir[1] * .6 + ty * sw) * Lf;
    const ex = bx + (dir[0] * (1 - droop) + tx * fwd * .35 + tx * sw * 1.4 + g[0] * droop) * Lf, ey = by + (dir[1] * (1 - droop) + ty * fwd * .35 + ty * sw * 1.4 + g[1] * droop) * Lf;
    const pts = D.bez([bx, by], [cx, cy], [lerp(cx, ex, .6), lerp(cy, ey, .6) - Lf * .05], [ex, ey], 12);
    D.ribbon(ctx, pts, R * .22, R * .07, true);
    ctx.fillStyle = rgba(pass < 0 ? '#2a2420' : INK); ctx.fill();
  }
}

// true legs (black hooks under the thorax) and prolegs (fleshy stubs with a pale band)
function appendages(ctx, rings, R, inst, o, pass, seg) {
  const up = o.up ?? 1;
  for (const i of PROLEGS) {
    const q = rings[i], lift = q.hump * R * .5, off = pass < 0 ? -.18 : .14;
    const tx = -q.ny * up, ty = q.nx * up;
    const bx = q.x - q.nx * q.r * .7 + tx * q.r * off, by = q.y - q.ny * q.r * .7 + ty * q.r * off;
    const fx = q.gx + tx * q.r * off + q.nx * lift, fy = q.gy + ty * q.r * off + q.ny * lift;
    const w = seg * .55;
    ctx.beginPath(); ctx.moveTo(bx - tx * w / 2, by - ty * w / 2); ctx.lineTo(fx - tx * w * .38, fy - ty * w * .38); ctx.lineTo(fx + tx * w * .38, fy + ty * w * .38); ctx.lineTo(bx + tx * w / 2, by + ty * w / 2); ctx.closePath();
    ctx.fillStyle = rgba(pass < 0 ? '#2b2522' : INK); ctx.fill();
    if (pass > 0 && inst > 2) { ctx.strokeStyle = rgba(PAL.larvaWhite, .8); ctx.lineWidth = R * .1; ctx.beginPath(); ctx.moveTo(lerp(bx, fx, .45) - tx * w * .42, lerp(by, fy, .45) - ty * w * .42); ctx.lineTo(lerp(bx, fx, .45) + tx * w * .42, lerp(by, fy, .45) + ty * w * .42); ctx.stroke(); }
  }
  for (const i of LEGS) {
    const q = rings[i], tx = -q.ny * up, ty = q.nx * up, off = pass < 0 ? -.2 : .16;
    const bx = q.x - q.nx * q.r * .75 + tx * q.r * off, by = q.y - q.ny * q.r * .75 + ty * q.r * off;
    const ex = bx - q.nx * q.r * .55 + tx * q.r * .3, ey = by - q.ny * q.r * .55 + ty * q.r * .3;
    ctx.strokeStyle = rgba(pass < 0 ? '#2b2522' : INK); ctx.lineWidth = R * .18; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(bx, by); ctx.quadraticCurveTo(lerp(bx, ex, .5) + tx * q.r * .2, lerp(by, ey, .5) + ty * q.r * .2, ex, ey); ctx.stroke();
  }
}

// shed skin: a crumpled pale shell with smudged stripes, and the little black head capsule
function exuvia(ctx, x, y, len, R, ang = 0, o = {}) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
  if (o.alpha !== undefined) ctx.globalAlpha *= o.alpha;
  ctx.fillStyle = rgba('#b9b39a', .85);
  ctx.beginPath();
  for (let i = 0; i <= 10; i++) { const u = i / 10, px = u * len, r = R * (.5 + .35 * Math.sin(Math.PI * u)) * (1 + .15 * Math.sin(i * 2.7)); ctx.moveTo(px + r, -r * .6); ctx.ellipse(px, -r * .6, r, r * .62, 0, 0, TAU); }
  ctx.fill();
  ctx.strokeStyle = rgba('#3a342c', .6); ctx.lineWidth = R * .12;
  for (let i = 1; i < 9; i++) { const px = i / 9 * len, r = R * .7; ctx.beginPath(); ctx.moveTo(px, -r * 1.05); ctx.quadraticCurveTo(px + R * .2, -r * .5, px - R * .05, 0); ctx.stroke(); }
  if (o.head !== false) { ctx.fillStyle = rgba(INK); ctx.beginPath(); ctx.arc(len + R * .7, -R * .45, R * .55, 0, TAU); ctx.fill(); }
  ctx.restore();
}

module.exports = { egg, eggProfile, larva, polyPath, linePath, jPath, exuvia, crawlAdv, NR, INK };
