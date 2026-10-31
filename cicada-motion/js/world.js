// World building blocks: procedural textures (built once per process), trunks, foliage, grass, sky, soil.
const { C, W, H, S, TAU, clamp, lerp, rgba, rgb, mix, mixs, ramp, rng, noise, noise2, fbm, fbm2, hash, ss } = require('./core');
const G = require('./gfx');

const cache = {};
function tex(key, w, h, draw) {
  if (!cache[key]) { const cv = C.createCanvas(w, h), c = cv.getContext('2d'); draw(c, w, h); cache[key] = cv; }
  return cache[key];
}

// ------------------------------------------------------------------ bark
function barkTex(key = 'bark', w = 900, h = 1600, pal = ['#3b2a20', '#1d130e', '#6a4c37'], seed = 7) {
  return tex(key, w, h, (c) => {
    const R = rng(seed);
    const g = c.createLinearGradient(0, 0, w, 0);
    g.addColorStop(0, pal[1]); g.addColorStop(.25, pal[0]); g.addColorStop(.6, pal[0]); g.addColorStop(1, pal[1]);
    c.fillStyle = g; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 520; i++) {
      const x0 = R() * w, wd = 2 + R() * 14, y0 = R() * h * 1.1 - h * .05, len = 80 + R() * 520, light = R() < .42;
      c.strokeStyle = light ? rgba(pal[2], .1 + R() * .22) : rgba('#000000', .16 + R() * .3);
      c.lineWidth = wd; c.lineCap = 'round';
      c.beginPath();
      for (let k = 0; k <= 12; k++) { const yy = y0 + len * k / 12; c.lineTo(x0 + fbm2(yy * .006, x0 * .01 + i, 2) * 40 + noise(yy * .02 + i) * 6, yy); }
      c.stroke();
    }
    for (let i = 0; i < 90; i++) {
      const x0 = R() * w, y0 = R() * h, len = 100 + R() * 420;
      c.strokeStyle = rgba('#050302', .55 + R() * .3); c.lineWidth = 1.5 + R() * 4;
      c.beginPath();
      for (let k = 0; k <= 14; k++) { const yy = y0 + len * k / 14; c.lineTo(x0 + fbm2(yy * .008, x0 * .02 + i * 3, 2) * 34, yy); }
      c.stroke();
      c.strokeStyle = rgba(pal[2], .12); c.lineWidth = 1;
      c.beginPath();
      for (let k = 0; k <= 14; k++) { const yy = y0 + len * k / 14; c.lineTo(x0 + 3 + fbm2(yy * .008, x0 * .02 + i * 3, 2) * 34, yy); }
      c.stroke();
    }
    for (let i = 0; i < 240; i++) {
      c.fillStyle = rgba(R() < .6 ? '#7d8f58' : '#a9b087', .05 + R() * .1);
      c.beginPath(); c.arc(R() * w, R() * h, 3 + R() * 14, 0, TAU); c.fill();
    }
  });
}

function soilTex(key = 'soil', w = 1920, h = 2600, seed = 11) {
  return tex(key, w, h, (c) => {
    const R = rng(seed);
    const g = c.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#4a3322'); g.addColorStop(.08, '#3c2a1c'); g.addColorStop(.35, '#2f2116'); g.addColorStop(.7, '#241912'); g.addColorStop(1, '#1a120d');
    c.fillStyle = g; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 520; i++) {
      const x = R() * w, y = R() * h, r = 20 + R() * 120, dark = R() < .5;
      const gg = c.createRadialGradient(x, y, 0, x, y, r);
      gg.addColorStop(0, dark ? 'rgba(0,0,0,.22)' : 'rgba(150,100,60,.12)'); gg.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = gg; c.fillRect(x - r, y - r, r * 2, r * 2);
    }
    for (let i = 0; i < 52000; i++) {
      const x = R() * w, y = R() * h, v = R();
      c.fillStyle = v < .5 ? rgba('#000000', .1 + R() * .25) : v < .85 ? rgba('#8a6445', .05 + R() * .16) : rgba('#c9a67a', .05 + R() * .12);
      c.fillRect(x, y, 1 + R() * 3, 1 + R() * 2.4);
    }
    for (let i = 0; i < 170; i++) {
      const x = R() * w, y = 180 + R() * (h - 180), rx = 5 + R() * 20, ry = rx * (.55 + R() * .35), a = R() * TAU;
      const col = mix('#3d372f', '#6e6556', R());
      c.save(); c.translate(x, y); c.rotate(a);
      const gg = c.createRadialGradient(-rx * .3, -ry * .4, 1, 0, 0, rx);
      gg.addColorStop(0, rgba(mix(col, [255, 255, 255], .12), .85)); gg.addColorStop(.7, rgba(col, .85)); gg.addColorStop(1, rgba(mix(col, [0, 0, 0], .6), .85));
      c.fillStyle = gg; c.beginPath(); c.ellipse(0, 0, rx, ry, 0, 0, TAU); c.fill();
      c.strokeStyle = 'rgba(0,0,0,.4)'; c.lineWidth = 1.5; c.stroke();
      c.restore();
    }
    for (let i = 0; i < 26; i++) {
      const y = R() * h; c.strokeStyle = rgba(R() < .5 ? '#000000' : '#a77a4c', .05 + R() * .05); c.lineWidth = 3 + R() * 14;
      c.beginPath(); for (let x = 0; x <= w; x += 60) c.lineTo(x, y + fbm(x * .004 + i * 7, 2) * 60); c.stroke();
    }
  });
}

// ------------------------------------------------------------------ leaves / foliage
function leaf(ctx, x, y, len, ang, color, o = {}) {
  const { vein = true, wid = .38, curl = .08, a = 1 } = o;
  ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
  const w = len * wid;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.bezierCurveTo(len * .2, -w * 1.1, len * .72, -w * (.9 + curl), len, 0);
  ctx.bezierCurveTo(len * .72, w * (.9 - curl), len * .2, w * 1.1, 0, 0);
  const g = ctx.createLinearGradient(0, -w, 0, w);
  g.addColorStop(0, rgba(mix(color, [255, 255, 200], .25), a)); g.addColorStop(.5, rgba(color, a)); g.addColorStop(1, rgba(mix(color, [0, 0, 0], .35), a));
  ctx.fillStyle = g; ctx.fill();
  if (vein) { ctx.strokeStyle = rgba(mix(color, [255, 255, 210], .35), .45 * a); ctx.lineWidth = Math.max(.6, len * .012); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(len * .95, 0); ctx.stroke(); }
  ctx.restore();
}

function foliage(ctx, cx, cy, rx, ry, n, o = {}) {
  const { colors = ['#2f4a22', '#456b2c', '#5d8a3a'], seed = 1, t = 0, sway = 1, size = 90, light = [.5, -1], rim = null, a = 1 } = o;
  const R = rng(seed);
  for (let i = 0; i < n; i++) {
    const ang = R() * TAU, rr = Math.sqrt(R());
    const x = cx + Math.cos(ang) * rx * rr, y = cy + Math.sin(ang) * ry * rr;
    const len = size * (.5 + R() * .8) * S, base = R() * TAU;
    const sw = Math.sin(t * 1.1 + i * .7 + x * .004) * .12 * sway;
    const c = colors[(R() * colors.length) | 0];
    const lit = clamp(.5 - (y - cy) / (ry * 2) + (x - cx) / (rx * 2) * light[0] * .3);
    leaf(ctx, x, y, len, base + sw, mix(c, rim || [255, 240, 150], lit * .22), { a });
  }
}

// ------------------------------------------------------------------ sky
function sky(ctx, stops, y0 = 0, y1 = H) {
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  for (const [t, c, a = 1] of stops) g.addColorStop(t, rgba(c, a));
  ctx.fillStyle = g; ctx.fillRect(0, y0, W, y1 - y0);
}

// silhouette forest: layers of trunks from far to near
function forestLayers(ctx, t, o = {}) {
  const { layers = 5, base = '#0a1a1c', fog = '#e8a35a', fogA = .55, horizon = H * .74, cam = 0, seed = 4, topY = -50, density = 1, near0 = .3, onLayer = null, sun = null } = o;
  for (let L = 0; L < layers; L++) {
    const f = L / (layers - 1), R = rng(seed + L * 17);
    const par = lerp(.12, 1, f) * cam, col = mix(fog, base, lerp(near0, 1, f)), n = Math.max(4, Math.round((10 - L * .8) * density));
    const span = W * 1.5, spacing = span / n;
    ctx.fillStyle = rgba(col, 1);
    for (let i = 0; i < n; i++) {
      const x = ((i * spacing + R() * spacing * .9 - par) % span + span) % span - W * .25;
      const wd = lerp(16, 70, f) * (.55 + R() * 1.0) * S, lean = (R() - .5) * 26 * S, flare = wd * (.18 + R() * .22);
      const yb = H * (.9 + (1 - f) * .0);
      ctx.beginPath(); ctx.moveTo(x - wd / 2 - flare, H + 10); ctx.quadraticCurveTo(x - wd / 2, H * .94, x - wd * .46, H * .86); ctx.lineTo(x - wd * .4 + lean, topY); ctx.lineTo(x + wd * .4 + lean, topY); ctx.lineTo(x + wd * .46, H * .86); ctx.quadraticCurveTo(x + wd / 2, H * .94, x + wd / 2 + flare, H + 10); ctx.closePath(); ctx.fill();
    }
    // canopy masses
    for (let i = 0; i < 9; i++) {
      const x = ((i * W * 1.5 / 9 + R() * 120 - par * .8) % (W * 1.5) + W * 1.5) % (W * 1.5) - W * .25, y = topY + 20 + R() * H * .16 * (1 - f * .4);
      const r = lerp(150, 300, f) * (.7 + R() * .6) * S;
      const gg = ctx.createRadialGradient(x, y, 0, x, y, r);
      gg.addColorStop(0, rgba(col, .98)); gg.addColorStop(.65, rgba(col, .9)); gg.addColorStop(1, rgba(col, 0));
      ctx.fillStyle = gg; ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
    if (sun) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; G.glow(ctx, sun[0], sun[1], sun[2] * (1 + f * .3), sun[3], (sun[4] || .1) * (1 - f * .5)); ctx.restore(); }
    if (onLayer) onLayer(L);
  }
  const fy = horizon, fg = ctx.createLinearGradient(0, fy - 200 * S, 0, fy + 200 * S);
  fg.addColorStop(0, rgba(fog, 0)); fg.addColorStop(.5, rgba(fog, fogA * .3)); fg.addColorStop(1, rgba(fog, 0));
  ctx.fillStyle = fg; ctx.fillRect(0, fy - 200 * S, W, 400 * S);
}

function grass(ctx, x0, x1, y, n, o = {}) {
  const { h = 120, colors = ['#1b2d14', '#2b4a1c', '#3d6a26'], t = 0, seed = 2, sway = 1, wmax = 6, rimC = null, a = 1, lean = 0 } = o;
  const R = rng(seed);
  for (let i = 0; i < n; i++) {
    const x = x0 + R() * (x1 - x0), hh = h * S * (.35 + R() * .8), w = (1.5 + R() * wmax) * S, ph = R() * TAU, c = colors[(R() * colors.length) | 0];
    const bend = (Math.sin(t * .9 + ph + x * .01) * 14 + (R() - .5) * 26 + lean) * S * sway;
    ctx.fillStyle = rgba(c, a);
    ctx.beginPath(); ctx.moveTo(x - w, y); ctx.quadraticCurveTo(x - w * .4 + bend * .25, y - hh * .6, x + bend, y - hh); ctx.quadraticCurveTo(x + w * .4 + bend * .25, y - hh * .6, x + w, y); ctx.closePath(); ctx.fill();
    if (rimC) { ctx.strokeStyle = rgba(rimC, .35 * a); ctx.lineWidth = 1 * S; ctx.beginPath(); ctx.moveTo(x - w * .6, y - hh * .2); ctx.quadraticCurveTo(x - w * .2 + bend * .3, y - hh * .6, x + bend, y - hh); ctx.stroke(); }
  }
}

// small ant (side view, facing +x)
function ant(ctx, x, y, sc, t, col = '#1b1008', rot = 0) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(sc, sc);
  const ph = t * 14;
  ctx.strokeStyle = rgba(col, 1); ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (let i = 0; i < 3; i++) for (const side of [-1, 1]) {
    const hx = -14 + i * 20, ps = ph + i * 2 + (side > 0 ? Math.PI : 0), s = Math.sin(ps), c = Math.cos(ps);
    ctx.globalAlpha = side > 0 ? 1 : .6;
    ctx.beginPath(); ctx.moveTo(hx, 8); ctx.lineTo(hx + 14 + s * 8, 24 - Math.max(0, c) * 8); ctx.lineTo(hx + 22 + s * 18, 50 - Math.max(0, c) * 10); ctx.stroke();
  }
  ctx.globalAlpha = 1;
  const g = ctx.createLinearGradient(0, -20, 0, 30); g.addColorStop(0, rgba(mix(col, [255, 200, 140], .3), 1)); g.addColorStop(1, rgba(col, 1));
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.ellipse(-52, 8, 40, 26, -.1, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.ellipse(8, 8, 18, 14, 0, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.ellipse(52, 4, 22, 18, 0, 0, TAU); ctx.fill();
  ctx.strokeStyle = rgba(col, 1); ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(68, -6); ctx.quadraticCurveTo(92, -34, 114, -18); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(68, 6); ctx.quadraticCurveTo(96, -2, 108, 22); ctx.stroke();
  ctx.fillStyle = 'rgba(255,230,200,.45)'; ctx.beginPath(); ctx.ellipse(-56, -6, 20, 6, -.1, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.ellipse(50, -6, 9, 4, 0, 0, TAU); ctx.fill();
  ctx.strokeStyle = 'rgba(255,190,120,.5)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(-52, 8, 40, 26, -.1, Math.PI * 1.1, Math.PI * 1.8); ctx.stroke();
  ctx.restore();
}

// A thick textured branch along a centre-line spline; th(u) gives thickness (px) at u in 0..1.
function branch(ctx, pts, th, o = {}) {
  const { tex = barkTex('barkB', 900, 1600, ['#4a3526', '#21160f', '#9a7552'], 21), light = [-.3, -1], rim = '#ffd9a0', rimA = .55, seg = 40 } = o;
  const n = pts.length;
  const sp = [];
  for (let i = 0; i <= seg; i++) {
    const f = i / seg * (n - 1), k = Math.min(n - 2, Math.floor(f)), u = f - k;
    const p0 = pts[Math.max(0, k - 1)], p1 = pts[k], p2 = pts[k + 1], p3 = pts[Math.min(n - 1, k + 2)];
    const cr = (a, b, c, d) => .5 * ((2 * b) + (-a + c) * u + (2 * a - 5 * b + 4 * c - d) * u * u + (-a + 3 * b - 3 * c + d) * u * u * u);
    sp.push([cr(p0[0], p1[0], p2[0], p3[0]), cr(p0[1], p1[1], p2[1], p3[1])]);
  }
  const top = [], bot = [];
  for (let i = 0; i <= seg; i++) {
    const a = sp[Math.max(0, i - 1)], b = sp[Math.min(seg, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1, nx = -dy / d, ny = dx / d, w = th(i / seg) / 2;
    top.push([sp[i][0] + nx * w, sp[i][1] + ny * w]); bot.push([sp[i][0] - nx * w, sp[i][1] - ny * w]);
  }
  const outline = () => { ctx.beginPath(); ctx.moveTo(top[0][0], top[0][1]); for (const p of top) ctx.lineTo(p[0], p[1]); for (let i = seg; i >= 0; i--) ctx.lineTo(bot[i][0], bot[i][1]); ctx.closePath(); };
  ctx.save();
  outline(); ctx.clip();
  const a0 = sp[0], a1 = sp[seg], ang = Math.atan2(a1[1] - a0[1], a1[0] - a0[0]), cx = (a0[0] + a1[0]) / 2, cy = (a0[1] + a1[1]) / 2;
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(ang - Math.PI / 2);
  const len = Math.hypot(a1[0] - a0[0], a1[1] - a0[1]) + 200;
  ctx.drawImage(tex, -tex.width * .4, -len / 2, tex.width * .8 * Math.max(1, 300 / (tex.width * .8)) , len);
  ctx.restore();
  // form shading across the branch (assumes mostly horizontal)
  const bb = { y0: Math.min(...top.map((p) => p[1]), ...bot.map((p) => p[1])), y1: Math.max(...top.map((p) => p[1]), ...bot.map((p) => p[1])) };
  const g = ctx.createLinearGradient(0, bb.y0, 0, bb.y1);
  g.addColorStop(0, 'rgba(255,210,150,.34)'); g.addColorStop(.22, 'rgba(255,190,120,.06)'); g.addColorStop(.6, 'rgba(0,0,0,.12)'); g.addColorStop(1, 'rgba(0,0,0,.62)');
  ctx.fillStyle = g; ctx.fillRect(-100, bb.y0 - 10, W + 200, bb.y1 - bb.y0 + 20);
  ctx.restore();
  ctx.save(); outline(); ctx.strokeStyle = 'rgba(0,0,0,.65)'; ctx.lineWidth = 2; ctx.stroke(); ctx.restore();
  return { top, bot, sp };
}

// tile a bark texture over [x, x+w] x [y0, y1] with mirrored repeats so seams vanish
function tileBark(ctx, tex, x, y0, w, y1) {
  const th = w * tex.height / tex.width * .8, tw = w;
  let k = 0;
  for (let y = y0; y < y1; y += th, k++) {
    ctx.save();
    if (k % 2) { ctx.translate(0, y + th); ctx.scale(1, -1); ctx.drawImage(tex, x, 0, tw, th); }
    else ctx.drawImage(tex, x, y, tw, th);
    ctx.restore();
  }
}

module.exports = { tileBark, branch, tex, barkTex, soilTex, leaf, foliage, sky, forestLayers, grass, ant };
