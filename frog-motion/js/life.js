// Pond micro-life and tiny details: water fleas + copepods drifting in parallax, mosquito larvae under the surface,
// water striders with light dimples, whirligig beetles, damselflies, gnat swarms, fireflies, a bat, butterflies,
// floating seeds, dew drops, a spider web, a pond snail.  Everything is seeded by integer ids (no flicker).
const { W, H, TAU, clamp, lerp, hash, noise, rgba, mix, shade, ss, fract } = require('./core');
const G = require('./gfx');

// screen position of drifting particle i on parallax plane p (same scheme as water.motes)
function drift(cam, t, i, seed, p, o = {}) {
  const z = cam ? cam.z : 1, s = Math.pow(z, p), WW = W + 300, HH = H + 300;
  const h0 = hash(i * 7 + seed * 1000), h1 = hash(i * 7 + 1 + seed * 1000), h2 = hash(i * 7 + 2 + seed * 1000);
  let x = h0 * WW + t * (o.dx ?? 5) * (.5 + h2) + noise(t * .2 + i, seed) * 30 - (cam ? cam.x : 0) * p * s;
  let y = h1 * HH + t * (o.dy ?? -2) * (.5 + h1) + noise(t * .17 + i * 1.3, seed + 3) * 24 - (cam ? cam.y : 0) * p * s;
  x = ((x % WW) + WW) % WW - 150; y = ((y % HH) + HH) % HH - 150;
  return [W / 2 + (x - W / 2) * s, H / 2 + (y - H / 2) * s, s, h2];
}

// ---------------------------------------------------------------- water fleas (Daphnia) + copepods (Cyclops)
function daphnia(g, x, y, r, t, ph, col = '#e8c890', a = .7) {
  const beat = Math.max(0, Math.sin(t * 9 + ph)), f = fract(t * .9 + ph / TAU), hop = f < .12 ? f / .12 : 1 - (f - .12) / .88;
  g.save(); g.translate(x, y - hop * r * 2.2); g.rotate(-.35 + Math.sin(t * .7 + ph) * .2); g.scale(r, r); g.globalAlpha *= a;
  g.fillStyle = rgba(col, .38); g.strokeStyle = rgba(shade(col, -.55), .7); g.lineWidth = .14;
  G.ellipse(g, 0, 0, 1, .74); g.fill(); g.stroke();
  g.beginPath(); g.moveTo(-.9, .35); g.lineTo(-1.7, .75); g.stroke();
  g.strokeStyle = rgba('#5a4220', .6); g.lineWidth = .2; g.beginPath(); g.moveTo(.45, -.05); g.quadraticCurveTo(-.1, .3, -.65, .15); g.stroke();
  g.fillStyle = 'rgba(10,10,10,.9)'; G.circle(g, .66, -.18, .2); g.fill();
  g.strokeStyle = rgba(shade(col, -.4), .8); g.lineWidth = .12;
  for (const s of [-1, 1]) { const an = -1.3 + s * .25 + beat * .7; g.beginPath(); g.moveTo(.5, -.35); g.lineTo(.5 + Math.cos(an) * 1.3, -.35 + Math.sin(an) * 1.3); g.stroke(); }
  g.fillStyle = 'rgba(255,255,255,.55)'; G.ellipse(g, .15, -.42, .3, .12, -.3); g.fill();
  g.restore();
}
function copepod(g, x, y, r, t, ph, a = .7) {
  const dart = Math.pow(Math.max(0, Math.sin(t * 1.3 + ph)), 30) * 14, ang = hash(Math.floor(t * 1.3 / TAU + ph) * 13) * TAU;
  g.save(); g.translate(x + Math.cos(ang) * dart * r * .3, y + Math.sin(ang) * dart * r * .3); g.rotate(ang); g.globalAlpha *= a;
  g.fillStyle = 'rgba(230,240,220,.55)'; G.ellipse(g, 0, 0, r * 1.1, r * .5); g.fill();
  g.strokeStyle = 'rgba(230,240,220,.5)'; g.lineWidth = .7; g.beginPath(); g.moveTo(r, 0); g.lineTo(r * 1.5, -r * 1.6); g.moveTo(r, 0); g.lineTo(r * 1.5, r * 1.6); g.moveTo(-r, 0); g.lineTo(-r * 2.2, 0); g.stroke();
  g.fillStyle = 'rgba(200,40,30,.8)'; G.circle(g, r * .6, 0, r * .22); g.fill();
  g.restore();
}
// a drifting zooplankton field on three depth planes; o.front: only the near, out-of-focus plane
function plankton(g, cam, t, o = {}) {
  const k = o.k ?? 1, col = o.col ?? '#e8c890';
  const sets = o.front ? [[1.5, 5, 7.5, 31]] : [[.55, Math.round(18 * k), 3.2, 11], [.9, Math.round(14 * k), 4.4, 21]];
  for (const [p, n, r0, sd] of sets) for (let i = 0; i < n; i++) {
    const [x, y, s, h] = drift(cam, t, i, sd, p, { dx: o.dx ?? 7, dy: o.dy ?? -3 });
    const r = r0 * Math.sqrt(s) * (.7 + h * .6);
    if (i % 3 === 2) copepod(g, x, y, r * .6, t, i * 2.1, (o.a ?? .8) * (p > 1 ? .5 : 1));
    else daphnia(g, x, y, r, t, i * 1.7, col, (o.a ?? .8) * (p > 1 ? .45 : 1));
  }
}

// ---------------------------------------------------------------- mosquito larvae hanging from the surface
function larvae(g, x0, x1, ys, t, o = {}) {
  const n = o.n ?? 6, s = o.s ?? 1;
  for (let i = 0; i < n; i++) {
    const x = lerp(x0, x1, hash(i * 3 + 101)), cyc = fract(t * .12 + hash(i + 7)), dive = cyc > .78 ? Math.sin((cyc - .78) / .22 * Math.PI) : 0;
    const L = 26 * s, wig = dive * 1.4, top = [x, ys + 1 + dive * 60 * s], P = [];
    for (let k = 0; k <= 8; k++) { const u = k / 8; P.push([top[0] + Math.sin(u * 5 + t * 14 + i) * wig * 8 * s * u + (hash(i) - .5) * 10 * u * s, top[1] + u * L]); }
    g.save(); g.globalAlpha *= o.a ?? .8;
    g.strokeStyle = 'rgba(40,46,36,.75)'; g.lineWidth = 2.6 * s; g.lineCap = 'round'; g.beginPath(); G.curve(g, P, false); g.stroke();
    g.strokeStyle = 'rgba(210,220,190,.35)'; g.lineWidth = 1 * s; g.beginPath(); G.curve(g, P, false); g.stroke();
    const hd = P[8]; g.fillStyle = 'rgba(30,34,26,.85)'; G.ellipse(g, hd[0], hd[1] + 2 * s, 3.2 * s, 2.6 * s); g.fill();
    g.strokeStyle = 'rgba(220,230,200,.35)'; g.lineWidth = .8; for (let k = 2; k < 8; k += 2) { const q = P[k]; g.beginPath(); g.moveTo(q[0] - 4 * s, q[1]); g.lineTo(q[0] + 4 * s, q[1]); g.stroke(); }
    if (!dive) { g.strokeStyle = 'rgba(255,255,255,.35)'; g.beginPath(); g.ellipse(top[0], ys + 1, 5 * s, 1.4 * s, 0, 0, TAU); g.stroke(); }
    g.restore();
  }
}

// ---------------------------------------------------------------- on the surface
// water strider gliding in rowing pulses; below=true draws only its bright dimple shadows (seen from underwater)
function striders(g, x0, x1, y, t, o = {}) {
  const n = o.n ?? 3, s = o.s ?? 1, flat = o.flat ?? .3;
  for (let i = 0; i < n; i++) {
    const per = 1.1 + hash(i + 5) * .8, k = Math.floor((t + hash(i) * per) / per), u = fract((t + hash(i) * per) / per);
    const dist = (k + 1 - Math.exp(-u * 4)) * 40 * s * (hash(i + 9) > .5 ? 1 : -1), span = x1 - x0;
    const x = x0 + ((((hash(i + 3) * span + dist) % span) + span) % span), yy = y + (hash(i + 11) - .5) * (o.dy ?? 30);
    const legs = [[.35, 30], [-.35, 30], [2.8, 34], [-2.8, 34]].map(([a, L]) => [x + Math.cos(a) * L * s, yy + Math.sin(a) * L * s * flat]);
    if (o.below) { for (const [lx, ly] of legs) { G.glow(g, lx, ly + 3, 9 * s, '#ffffff', .35, 'screen'); g.fillStyle = 'rgba(0,20,20,.35)'; G.ellipse(g, lx, ly + 3, 4 * s, 2.5 * s); g.fill(); } continue; }
    g.save(); g.strokeStyle = 'rgba(30,30,24,.9)'; g.lineWidth = 1.2 * s; g.lineCap = 'round';
    for (const [lx, ly] of legs) { g.beginPath(); g.moveTo(x, yy); g.quadraticCurveTo((x + lx) / 2, (yy + ly) / 2 - 6 * s, lx, ly); g.stroke(); g.strokeStyle = 'rgba(255,255,255,.45)'; G.ellipse(g, lx, ly + 1, 3.5 * s, 1.1 * s); g.stroke(); g.strokeStyle = 'rgba(30,30,24,.9)'; }
    g.fillStyle = '#2a2a22'; G.ellipse(g, x, yy - 2 * s, 9 * s, 2.4 * s); g.fill();
    if (u < .25) for (const [lx, ly] of legs.slice(2)) { g.strokeStyle = rgba('#ffffff', .4 * (1 - u / .25)); G.ellipse(g, lx, ly + 1, (4 + u * 40) * s, (4 + u * 40) * s * flat); g.stroke(); }
    g.restore();
  }
}
// whirligig beetles spinning tight loops, leaving V-ripples
function whirligigs(g, cx, cy, t, o = {}) {
  const n = o.n ?? 5, s = o.s ?? 1, flat = o.flat ?? .3;
  for (let i = 0; i < n; i++) {
    const a = t * (2 + hash(i) * 2) * (i % 2 ? 1 : -1) + hash(i + 3) * TAU, R = (14 + hash(i + 4) * 30) * s, wx = noise(t * .3, i + 40) * 60 * s;
    const x = cx + wx + Math.cos(a) * R + (hash(i + 6) - .5) * 120 * s, y = cy + Math.sin(a) * R * flat + (hash(i + 7) - .5) * 30 * s;
    for (let k = 1; k <= 3; k++) { const b = a - k * .35 * (i % 2 ? 1 : -1); g.strokeStyle = rgba('#ffffff', .22 / k); g.lineWidth = 1; G.ellipse(g, cx + wx + Math.cos(b) * R + (hash(i + 6) - .5) * 120 * s, cy + Math.sin(b) * R * flat + (hash(i + 7) - .5) * 30 * s, (3 + k * 3) * s, (3 + k * 3) * s * flat); g.stroke(); }
    g.fillStyle = '#101010'; G.ellipse(g, x, y, 4 * s, 2.6 * s); g.fill();
    g.fillStyle = 'rgba(255,255,255,.8)'; G.circle(g, x - 1.2 * s, y - 1 * s, .9 * s); g.fill();
  }
}

// ---------------------------------------------------------------- in the air
function damselfly(g, x, y, s, t, o = {}) {
  const c = o.c ?? '#3fa0e0', h = o.h ?? 0;
  g.save(); g.translate(x, y); g.scale(s * (o.flip ?? 1), s); g.rotate(h);
  if (o.alpha !== undefined) g.globalAlpha *= o.alpha;
  for (const [wx, ph] of [[2, 0], [-3, 1.7]]) for (const sg of [-1, 1]) {
    const fl = Math.sin(t * 70 + ph + (sg > 0 ? 0 : .6));
    g.save(); g.translate(wx, -2); g.rotate(-Math.PI / 2 + sg * (.25 + .35 * fl) - .3);
    g.fillStyle = 'rgba(230,245,255,.35)'; G.ellipse(g, 15, 0, 15, 2.6); g.fill(); g.strokeStyle = 'rgba(40,60,70,.3)'; g.lineWidth = .5; g.stroke();
    g.restore();
  }
  g.strokeStyle = c; g.lineWidth = 2.2; g.lineCap = 'round';
  g.beginPath(); g.moveTo(-2, 0); g.quadraticCurveTo(-24, 1 + Math.sin(t * 2) * 1.5, -46, 3 + Math.sin(t * 2) * 2); g.stroke();
  g.strokeStyle = 'rgba(10,20,40,.6)'; g.lineWidth = .8;
  for (let i = 1; i < 9; i++) { const xx = -2 - i * 5; g.beginPath(); g.moveTo(xx, -1.2); g.lineTo(xx, 1.6); g.stroke(); }
  g.fillStyle = shade(c, -.25); G.ellipse(g, 2, 0, 6, 3.4); g.fill();
  g.fillStyle = '#1a3a5a'; G.circle(g, 9, -1.6, 2.4); g.fill(); G.circle(g, 9, 1.6, 2.4); g.fill();
  g.fillStyle = 'rgba(255,255,255,.7)'; G.circle(g, 9.6, -2.2, .8); g.fill();
  g.restore();
}
// hover-and-dart flight path around (cx, cy)
function hover(t, cx, cy, r = 80, seed = 1) {
  const k = Math.floor(t / 1.6 + hash(seed)), u = ss(0, .35, fract(t / 1.6 + hash(seed)));
  const a = [cx + (hash(k * 7 + seed) - .5) * 2 * r, cy + (hash(k * 11 + seed) - .5) * r], b = [cx + (hash((k + 1) * 7 + seed) - .5) * 2 * r, cy + (hash((k + 1) * 11 + seed) - .5) * r];
  return [lerp(a[0], b[0], u) + Math.sin(t * 6 + seed) * 2, lerp(a[1], b[1], u) + Math.sin(t * 8 + seed) * 2, Math.sign(b[0] - a[0]) || 1];
}
function gnats(g, cx, cy, t, o = {}) {
  const n = o.n ?? 26, r = o.r ?? 60, col = o.col ?? '#fff6dc';
  for (let i = 0; i < n; i++) {
    const a = t * (1.5 + hash(i) * 2.5) + hash(i + 1) * TAU, b = t * (2.1 + hash(i + 2) * 2) + hash(i + 3) * TAU;
    const x = cx + Math.sin(a) * r * (.4 + hash(i + 4) * .6) + noise(t + i, 3) * 12, y = cy + Math.sin(b) * r * .5 * (.4 + hash(i + 5) * .6) + noise(t * 1.3 + i, 4) * 10;
    const tw = .5 + .5 * Math.sin(t * 30 + i * 3);
    g.fillStyle = rgba(col, (o.a ?? .8) * (.4 + .6 * tw)); G.circle(g, x, y, (o.s ?? 1.3) * (.7 + .3 * tw)); g.fill();
  }
}
function fireflies(g, cam, t, o = {}) {
  const n = o.n ?? 16;
  for (let i = 0; i < n; i++) {
    const p = .5 + hash(i + 70) * .9, [x, y, s] = drift(cam, t, i, 61, p, { dx: 6, dy: -3 });
    if (y > (o.y1 ?? H * .8) || y < (o.y0 ?? 0)) continue;
    const cyc = fract(t / (1.8 + hash(i) * 1.6) + hash(i + 2)), on = Math.pow(Math.sin(Math.PI * clamp(cyc / .35)), 2);
    if (on < .02) continue;
    G.glow(g, x, y, 18 * s * (o.size ?? 1), '#d8ff7a', .55 * on * (o.a ?? 1), 'screen');
    g.fillStyle = rgba('#f4ffd0', .9 * on); G.circle(g, x, y, 1.6 * s); g.fill();
    if (o.water !== undefined && y < o.water) G.glow(g, x, o.water + (o.water - y) * .35, 10 * s, '#d8ff7a', .25 * on, 'screen');
  }
}
function bat(g, x, y, s, t) {
  const f = Math.sin(t * 22), up = f * .9;
  g.save(); g.translate(x, y); g.scale(s, s); g.fillStyle = '#05070c';
  for (const sg of [-1, 1]) { g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(sg * 14, -10 - up * 12, sg * 30, -4 - up * 16); g.quadraticCurveTo(sg * 24, 0, sg * 20, 2 - up * 4); g.quadraticCurveTo(sg * 14, 4, sg * 8, 2); g.closePath(); g.fill(); }
  G.ellipse(g, 0, 0, 4, 6); g.fill(); g.beginPath(); g.moveTo(-3, -5); g.lineTo(-2, -9); g.lineTo(0, -5); g.lineTo(2, -9); g.lineTo(3, -5); g.fill();
  g.restore();
}
function butterfly(g, x, y, s, t, o = {}) {
  const c = o.c ?? '#f4f0e0', c2 = o.c2 ?? '#e8a030', f = Math.abs(Math.sin(t * 13 + (o.ph ?? 0)));
  g.save(); g.translate(x, y); g.scale(s, s); g.rotate(o.h ?? 0);
  for (const sg of [-1, 1]) {
    g.save(); g.scale(sg * (.25 + .75 * f), 1);
    g.fillStyle = c; g.beginPath(); g.moveTo(0, 0); g.bezierCurveTo(8, -18, 22, -16, 18, -4); g.bezierCurveTo(16, 2, 6, 2, 0, 0); g.fill();
    g.beginPath(); g.moveTo(0, 1); g.bezierCurveTo(10, 4, 14, 14, 6, 14); g.bezierCurveTo(2, 12, 0, 6, 0, 1); g.fill();
    g.fillStyle = c2; G.circle(g, 15, -10, 3); g.fill();
    g.restore();
  }
  g.fillStyle = '#2a2420'; G.ellipse(g, 0, 2, 1.4, 7); g.fill();
  g.restore();
}
// floating seed parachutes (cattail / dandelion fluff) drifting through the light
function seeds(g, cam, t, o = {}) {
  for (let i = 0; i < (o.n ?? 14); i++) {
    const [x, y, s] = drift(cam, t, i, 77, .7 + hash(i + 40) * .8, { dx: o.dx ?? 22, dy: o.dy ?? -6 });
    const r = 5 * s * (o.size ?? 1), sp = t * .8 + i;
    g.save(); g.translate(x, y); g.rotate(Math.sin(sp) * .3); g.globalAlpha *= (o.a ?? .7);
    g.strokeStyle = 'rgba(255,255,250,.6)'; g.lineWidth = .6;
    for (let k = 0; k < 9; k++) { const a = -Math.PI / 2 + (k - 4) * .3; g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(a) * r, Math.sin(a) * r); g.stroke(); }
    g.beginPath(); g.moveTo(0, 0); g.lineTo(0, r * .9); g.stroke();
    G.glow(g, 0, -r * .4, r * 1.4, '#fffbe8', .12, 'screen');
    g.restore();
  }
}

// ---------------------------------------------------------------- still details
// a dew / rain drop sitting on a surface: lensing, dark rim, bright catchlight
function dew(g, x, y, r, a = 1) {
  g.save(); g.globalAlpha *= a;
  g.fillStyle = G.rad(g, x + r * .2, y + r * .3, r * 1.1, [[0, '#ffffff', .25], [.7, '#dff4ff', .12], [1, '#0a2a2a', .35]]); G.circle(g, x, y, r); g.fill();
  g.strokeStyle = 'rgba(10,30,30,.35)'; g.lineWidth = Math.max(.5, r * .12); g.stroke();
  g.fillStyle = 'rgba(255,255,255,.95)'; G.ellipse(g, x - r * .35, y - r * .35, r * .3, r * .2, -.6); g.fill();
  g.restore();
}
// orb web strung between (x0,y0)-(x1,y1) anchors, centre c; dew beads twinkle
function web(g, cx, cy, R, t, o = {}) {
  const sw = Math.sin(t * .8) * 3, n = 14;
  g.save(); g.translate(cx + sw, cy); g.globalAlpha *= o.a ?? .8; g.strokeStyle = 'rgba(255,255,255,.28)'; g.lineWidth = .7;
  for (let i = 0; i < n; i++) { const a = i / n * TAU; g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(a) * R, Math.sin(a) * R * .9); g.stroke(); }
  for (let k = 1; k <= 9; k++) {
    const rr = R * k / 9.5; g.beginPath();
    for (let i = 0; i <= n; i++) { const a = i / n * TAU, sag = 1 - .06 * Math.sin(i * 2.3 + k); const px = Math.cos(a) * rr * sag, py = Math.sin(a) * rr * .9 * sag; i ? g.lineTo(px, py) : g.moveTo(px, py); }
    g.stroke();
  }
  for (let i = 0; i < 40; i++) {
    const a = hash(i) * TAU, rr = R * (.15 + hash(i + 3) * .8), px = Math.cos(a) * rr, py = Math.sin(a) * rr * .9, tw = .5 + .5 * Math.sin(t * 3 + i * 2);
    g.fillStyle = rgba('#ffffff', .5 + .4 * tw); G.circle(g, px, py, .8 + hash(i + 5) * 1.6); g.fill();
    if (hash(i + 9) > .8) G.glow(g, px, py, 7, '#ffffff', .3 * tw, 'screen');
  }
  g.restore();
}
// pond snail (Lymnaea) gliding: spiral shell, translucent foot, tentacles
function snail(g, x, y, s, t, o = {}) {
  g.save(); g.translate(x, y); g.scale(s * (o.flip ?? 1), s); g.rotate(o.rot ?? 0);
  const st = Math.sin(t * 1.4) * 1.5;
  g.fillStyle = 'rgba(150,140,110,.75)'; g.beginPath(); g.moveTo(-14, 6); g.quadraticCurveTo(4, 9 + st * .3, 20 + st, 6); g.quadraticCurveTo(22, 1, 16, 0); g.lineTo(-10, 2); g.closePath(); g.fill();
  g.strokeStyle = 'rgba(150,140,110,.9)'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(17, 1); g.lineTo(24 + st, -5); g.moveTo(16, 1); g.lineTo(21 + st, -7); g.stroke();
  g.fillStyle = 'rgba(10,10,10,.85)'; G.circle(g, 18, 0, 1); g.fill();
  g.save(); g.translate(-2, -2); g.rotate(-.5);
  g.fillStyle = G.lin(g, -10, -12, 10, 8, [[0, '#c8a870'], [.5, '#8a6a3a'], [1, '#4a3420']]); G.ellipse(g, 0, -2, 11, 9); g.fill();
  g.beginPath(); g.moveTo(4, -9); g.lineTo(-2, -26); g.lineTo(-8, -6); g.closePath(); g.fill();
  g.strokeStyle = 'rgba(40,24,10,.6)'; g.lineWidth = 1; g.beginPath(); for (let i = 0; i <= 40; i++) { const a = i / 40 * TAU * 2.2, r = 9 * (1 - i / 48); i ? g.lineTo(Math.cos(a) * r, -2 + Math.sin(a) * r * .8) : g.moveTo(Math.cos(a) * r, -2 + Math.sin(a) * r * .8); } g.stroke();
  g.fillStyle = 'rgba(255,255,255,.4)'; G.ellipse(g, -3, -7, 3, 1.5, -.5); g.fill();
  g.restore(); g.restore();
}

// raindrop crowns: tiny splash crowns + a jumping droplet where drops hit the surface band [y0, y1]
function rainCrowns(g, t, y0, y1, o = {}) {
  const n = o.n ?? 30, rate = o.rate ?? 1.6;
  g.save(); g.lineCap = 'round';
  for (let i = 0; i < n; i++) {
    const per = 1 / rate * (.6 + hash(i + 50) * .8), ph = hash(i + 54) * per, k = Math.floor((t + ph) / per), e = (t + ph) - k * per;
    if (e > .28) continue;
    const u = hash(i * 31 + k * 7 + 5), x = hash(i * 17 + k * 13 + 5) * W, y = lerp(y0, y1, u), s = lerp(.4, 1.2, u), q = e / .28;
    g.strokeStyle = rgba('#f4fbff', (o.a ?? .7) * (1 - q)); g.lineWidth = 1.2 * s;
    for (let j = -2; j <= 2; j++) { const a = -Math.PI / 2 + j * .32, L = (5 + 7 * Math.sin(Math.PI * q)) * s; g.beginPath(); g.moveTo(x + j * 2 * s, y); g.lineTo(x + Math.cos(a) * L + j * 2 * s, y + Math.sin(a) * L); g.stroke(); }
    const jy = y - Math.sin(Math.PI * q) * 16 * s; g.fillStyle = rgba('#ffffff', (o.a ?? .7) * (1 - q * .5)); G.circle(g, x, jy, 1.4 * s); g.fill();
  }
  g.restore();
}

module.exports = { drift, daphnia, copepod, plankton, larvae, striders, whirligigs, damselfly, hover, gnats, fireflies, bat, butterfly, seeds, dew, web, snail, rainCrowns };
