// Environments: microscopic pond-water world, pond cross-section, cracked mud (top-down), night sky, rain.
const { W, H, TAU, clamp, lerp, rng, hash, noise1, noise2, rgba, mix, sepia, PAL, ss, ease, easeOut } = require('./core');
const D = require('./draw');
const { T } = require('./tex');

const K = (c, k) => (k > 0 ? sepia(c, k) : c);
function cam(ctx, x, y, z, sx = W / 2, sy = H / 2) { ctx.setTransform(z, 0, 0, z, sx - x * z, sy - y * z); }
function screen(ctx) { ctx.setTransform(1, 0, 0, 1, 0, 0); }
function onScreen(ctx, x, y, r) {
  const m = ctx.getTransform(), sx = m.a * x + m.e, sy = m.d * y + m.f, sr = r * m.a;
  return sx + sr > -20 && sx - sr < W + 20 && sy + sr > -20 && sy - sr < H + 20;
}

// =====================================================================
// MICRO WORLD
// =====================================================================
const MICRO = (() => {
  const r = rng(42), items = [];
  const types = ['centric', 'pennate', 'desmid', 'volvox', 'bacteria', 'grain', 'pennate', 'centric', 'bubble', 'desmid', 'bacteria', 'grain', 'spiro'];
  for (let i = 0; i < 560; i++) {
    const ty = types[Math.floor(r() * types.length)];
    let x = (r() - .5) * 5200, y = (r() - .5) * 5200;
    if (Math.hypot(x - 540, y - 540) < 230 && ty !== 'bacteria') continue;
    if (ty === 'spiro' && Math.abs(y - 540) < 420) y += y > 540 ? 420 : -420;
    items.push({ ty, x, y, s: ty === 'spiro' ? 1 : ty === 'bacteria' ? 1 : 22 + r() * 34, rot: r() * TAU, dr: (r() - .5) * .12, vx: (r() - .5) * 6, vy: (r() - .5) * 6, h: r(), hue: Math.floor(r() * 4) });
  }
  const bokeh = [];
  for (let i = 0; i < 26; i++) bokeh.push({ x: r() * W, y: r() * H, r: 40 + r() * 160, a: .05 + r() * .09, par: .2 + r() * .5 });
  return { items, bokeh };
})();

const DIATOM = ['#e9b84f', '#d8a24a', '#c9b24f', '#e4c66a'];
const DESMID = ['#69b85a', '#88c95c', '#4fa66a', '#9bd16f'];
const BACT = ['#c76fa3', '#9c6ccf', '#e0789a', '#7f8be0'];

function centric(ctx, it, k) {
  const s = it.s;
  ctx.fillStyle = rgba(K(DIATOM[it.hue], k)); ctx.beginPath(); ctx.arc(0, 0, s, 0, TAU); ctx.fill();
  ctx.save(); ctx.clip(); D.texture(ctx, T.hatchD, .25); ctx.restore();
  ctx.strokeStyle = rgba(K('#7a4f1f', k), .8); ctx.lineWidth = 1.2;
  for (let i = 0; i < 26; i++) { const a = TAU * i / 26; D.line(ctx, Math.cos(a) * s * .38, Math.sin(a) * s * .38, Math.cos(a) * s * .9, Math.sin(a) * s * .9); }
  ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(0, 0, s * .36, 0, TAU); ctx.stroke();
  ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, s, 0, TAU); ctx.stroke();
  for (let i = 0; i < 8; i++) { const a = TAU * i / 8 + .2; D.dot(ctx, Math.cos(a) * s * .2, Math.sin(a) * s * .2, 1.6, K('#7a4f1f', k), .8); }
  ctx.strokeStyle = 'rgba(255,250,235,.6)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, s * .82, 3.6, 4.6); ctx.stroke();
}
function pennate(ctx, it, k) {
  const s = it.s, L = s * 1.6, Wd = s * .42;
  const boat = () => { ctx.beginPath(); ctx.moveTo(-L, 0); ctx.bezierCurveTo(-L * .5, -Wd * 1.3, L * .5, -Wd * 1.3, L, 0); ctx.bezierCurveTo(L * .5, Wd * 1.3, -L * .5, Wd * 1.3, -L, 0); ctx.closePath(); };
  boat(); ctx.fillStyle = rgba(K(DIATOM[(it.hue + 2) % 4], k)); ctx.fill();
  ctx.save(); boat(); ctx.clip(); D.texture(ctx, T.stipD, .25);
  ctx.strokeStyle = rgba(K('#6b4a1c', k), .55); ctx.lineWidth = 1;
  for (let x = -L; x < L; x += 5) D.line(ctx, x, -Wd, x, Wd);
  ctx.restore();
  ctx.strokeStyle = rgba(K('#6b4a1c', k)); ctx.lineWidth = 1.8; boat(); ctx.stroke();
  ctx.lineWidth = 1.4; D.line(ctx, -L * .8, 0, -L * .08, 0); D.line(ctx, L * .08, 0, L * .8, 0);
  D.dot(ctx, 0, 0, 3, K('#6b4a1c', k));
  ctx.strokeStyle = 'rgba(255,250,235,.55)'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(-L * .6, -Wd * .55); ctx.quadraticCurveTo(0, -Wd * 1.02, L * .6, -Wd * .55); ctx.stroke();
}
function desmid(ctx, it, k) {
  const s = it.s;
  const half = (dir) => {
    ctx.beginPath();
    for (let i = 0; i <= 24; i++) {
      const a = -Math.PI / 2 + Math.PI * i / 24, lob = 1 + .14 * Math.cos(a * 6);
      const x = dir * (s * .14 + Math.cos(a) * s * .9 * lob), y = Math.sin(a) * s * lob;
      if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
    }
    ctx.closePath();
  };
  for (const d of [-1, 1]) {
    half(d); ctx.fillStyle = rgba(K(DESMID[it.hue], k)); ctx.fill();
    ctx.save(); ctx.clip(); D.texture(ctx, T.stipD, .3); D.texture(ctx, T.hatchL, .3); ctx.restore();
    half(d); ctx.strokeStyle = rgba(K('#22572f', k)); ctx.lineWidth = 1.8; ctx.stroke();
    D.dot(ctx, d * s * .55, 0, s * .16, K('#e9f6c8', k), .8);
  }
}
function volvox(ctx, it, k) {
  const s = it.s * 1.15;
  const g = ctx.createRadialGradient(-s * .3, -s * .3, s * .1, 0, 0, s);
  g.addColorStop(0, rgba(K('#c8eb9a', k), .9)); g.addColorStop(1, rgba(K('#5aa64a', k), .85));
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, s, 0, TAU); ctx.fill();
  for (let i = 0; i < 46; i++) { const a = i * 2.39996, r = s * .92 * Math.sqrt((i + .5) / 46); D.dot(ctx, Math.cos(a) * r, Math.sin(a) * r, 1.5, K('#2c6a34', k), .7); }
  for (let j = 0; j < 3; j++) { const a = j * 2.1 + it.h * 5, r = s * .45; ctx.fillStyle = rgba(K('#3f8f3c', k), .9); ctx.beginPath(); ctx.arc(Math.cos(a) * r, Math.sin(a) * r, s * .2, 0, TAU); ctx.fill(); D.dot(ctx, Math.cos(a) * r - s * .05, Math.sin(a) * r - s * .05, s * .06, '#e6f7c8', .8); }
  ctx.strokeStyle = rgba(K('#2c6a34', k)); ctx.lineWidth = 1.8; ctx.beginPath(); ctx.arc(0, 0, s, 0, TAU); ctx.stroke();
}
function bacteria(ctx, it, k, t) {
  for (let i = 0; i < 7; i++) {
    const a = hash(i + it.h * 99) * TAU, d = 10 + hash(i * 3 + it.h * 77) * 40, x = Math.cos(a) * d, y = Math.sin(a) * d, ang = hash(i * 5 + it.h * 13) * TAU + t * .3;
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
    ctx.fillStyle = rgba(K(BACT[(it.hue + i) % 4], k)); ctx.strokeStyle = rgba(K('#4c2350', k), .8); ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.roundRect(-9, -3.4, 18, 6.8, 3.4); ctx.fill(); ctx.stroke();
    ctx.restore();
  }
}
function grain(ctx, it, k) {
  const s = it.s * .9, pts = [];
  for (let i = 0; i < 7; i++) { const a = TAU * i / 7, r = s * (.7 + .3 * hash(i + it.h * 31)); pts.push([Math.cos(a) * r, Math.sin(a) * r]); }
  ctx.beginPath(); pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.closePath();
  ctx.fillStyle = rgba(K(['#efe2c2', '#d9cdb8', '#e8d2a6', '#cfc6d6'][it.hue], k)); ctx.fill();
  ctx.save(); ctx.clip(); D.texture(ctx, T.hatchX, .3); D.texture(ctx, T.stipD, .2); ctx.restore();
  ctx.strokeStyle = rgba(K('#6d5a48', k), .9); ctx.lineWidth = 1.6; ctx.stroke();
}
function bubble(ctx, it) {
  const s = it.s * .7;
  ctx.fillStyle = 'rgba(240,255,255,.18)'; ctx.beginPath(); ctx.arc(0, 0, s, 0, TAU); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 2; ctx.stroke();
  ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, s * .7, 3.6, 4.5); ctx.stroke();
}
function spiro(ctx, it, k, t) {
  // filament of Spirogyra: a tube with a spiral chloroplast ribbon
  const L = 900, n = 60, w = 15, pts = [];
  for (let i = 0; i <= n; i++) { const u = i / n; pts.push([(u - .5) * L, Math.sin(u * 4 + it.h * 6) * 60 + Math.sin(t * .3 + u * 3) * 6]); }
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.strokeStyle = rgba(K('#2f6a3b', k)); ctx.lineWidth = w * 2 + 3.5; D.shape(ctx, pts, false); ctx.stroke();
  ctx.strokeStyle = rgba(K('#d6f0b8', k)); ctx.lineWidth = w * 2; D.shape(ctx, pts, false); ctx.stroke();
  ctx.strokeStyle = rgba(K('#4f9e45', k)); ctx.lineWidth = 3.5;
  ctx.beginPath();
  for (let i = 0; i <= n * 6; i++) {
    const u = i / (n * 6), j = Math.min(n - 1, Math.floor(u * n)), f = u * n - j;
    const x = lerp(pts[j][0], pts[j + 1][0], f), y = lerp(pts[j][1], pts[j + 1][1], f), s = Math.sin(u * L / 11);
    if (i) ctx.lineTo(x, y + s * w * .8); else ctx.moveTo(x, y + s * w * .8);
  }
  ctx.stroke();
  ctx.strokeStyle = rgba(K('#2f6a3b', k), .7); ctx.lineWidth = 1.5;
  for (let i = 4; i < n; i += 6) D.line(ctx, pts[i][0], pts[i][1] - w, pts[i][0], pts[i][1] + w);
}

// o: {k (sepia), dry (0..1 water receding), bright}
function micro(ctx, cx, cy, z, t, o = {}) {
  const k = o.k ?? 0;
  screen(ctx);
  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, rgba(K(o.c0 ?? '#c4eedf', k))); g.addColorStop(.55, rgba(K(o.c1 ?? '#8fd3c6', k))); g.addColorStop(1, rgba(K(o.c2 ?? '#5fb0b2', k)));
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  // soft defocused shapes, parallax
  for (const b of MICRO.bokeh) {
    const x = ((b.x - cx * b.par * z * .3) % (W + 400) + W + 400) % (W + 400) - 200, y = ((b.y - cy * b.par * z * .3) % (H + 400) + H + 400) % (H + 400) - 200;
    D.glow(ctx, x, y, b.r, K('#fbfff2', k), b.a);
  }
  D.texture(ctx, T.hatchL, .22, 0, 0, true);
  cam(ctx, cx, cy, z, o.sx, o.sy);
  D.low = z < .45;
  for (const it of MICRO.items) {
    if (o.only && !o.only.includes(it.ty)) continue;
    const x = it.x + it.vx * t, y = it.y + it.vy * t, rr = it.ty === 'spiro' ? 520 : it.s * 2.2;
    if (!onScreen(ctx, x, y, rr)) continue;
    ctx.save(); ctx.translate(x, y); ctx.rotate(it.rot + it.dr * t);
    if (it.ty === 'centric') centric(ctx, it, k);
    else if (it.ty === 'pennate') pennate(ctx, it, k);
    else if (it.ty === 'desmid') desmid(ctx, it, k);
    else if (it.ty === 'volvox') volvox(ctx, it, k);
    else if (it.ty === 'bacteria') bacteria(ctx, it, k, t);
    else if (it.ty === 'grain') grain(ctx, it, k);
    else if (it.ty === 'bubble') bubble(ctx, it);
    else if (it.ty === 'spiro') spiro(ctx, it, k, t);
    ctx.restore();
  }
  D.low = false;
}

// a free-swimming green alga (Chlamydomonas) with two flagella and a red eyespot
function alga(ctx, x, y, r, ang, t, o = {}) {
  const k = o.k ?? 0, dig = o.dig ?? 0;
  ctx.save(); ctx.translate(x, y); ctx.rotate(ang); ctx.globalAlpha *= o.a ?? 1;
  if (!o.noFlag) {
    ctx.strokeStyle = rgba(K('#2e5d33', k), .9); ctx.lineWidth = Math.max(1, r * .06); ctx.lineCap = 'round';
    for (const s of [-1, 1]) {
      ctx.beginPath(); ctx.moveTo(r * .95, 0);
      for (let i = 1; i <= 14; i++) { const u = i / 14; ctx.lineTo(r * .95 + u * r * 1.4 * Math.cos(s * .9), s * u * r * 1.2 + Math.sin(t * 14 + u * 5) * r * .18 * u); }
      ctx.stroke();
    }
  }
  const col = mix('#5fbf4a', '#a8823d', dig);
  ctx.fillStyle = rgba(K(col, k)); ctx.beginPath(); ctx.ellipse(0, 0, r, r * .78, 0, 0, TAU); ctx.fill();
  ctx.save(); ctx.clip(); D.texture(ctx, T.stipD, .35); ctx.restore();
  ctx.strokeStyle = rgba(K(mix('#245a2c', '#5a3e1a', dig), k)); ctx.lineWidth = Math.max(1, r * .08); ctx.stroke();
  D.dot(ctx, r * .45, -r * .3, r * .14, K('#e0412f', k), 1 - dig);
  D.dot(ctx, -r * .15, 0, r * .3, K(mix('#cfe9a5', '#d8c08a', dig), k), .9);
  ctx.restore();
}

// =====================================================================
// POND CROSS-SECTION (world = 1080 frame at z=1)
// =====================================================================
const BASIN = [[-300, 548], [120, 548], [190, 640], [260, 760], [360, 880], [470, 950], [600, 965], [730, 930], [840, 820], [905, 680], [950, 560], [1400, 548]];
const POND = (() => {
  const r = rng(9), hills = [], trees = [], flowers = [], reeds = [], grass = [], pebbles = [], plants = [];
  for (let L = 0; L < 3; L++) {
    const pts = []; const base = 470 + L * 28, amp = 70 - L * 18;
    for (let x = -400; x <= 1500; x += 20) pts.push([x, base - amp * (.55 + .45 * Math.sin(x / (170 - L * 30) + L * 2)) - 18 * Math.sin(x / 53 + L)]);
    hills.push(pts);
    for (let i = 0; i < 14; i++) { const x = -300 + r() * 1700; trees.push({ L, x, s: .6 + r() * .5 - L * .08, h: r() }); }
  }
  for (let i = 0; i < 160; i++) { const left = r() < .5; flowers.push({ x: left ? -300 + r() * 470 : 920 + r() * 450, y: 552 + r() * 60, c: ['#f0a2b5', '#a98fd6', '#f2b84b', '#ffffff', '#e0412f'][Math.floor(r() * 5)], s: 2 + r() * 3.5 }); }
  for (let i = 0; i < 26; i++) { const left = i % 2 === 0; reeds.push({ x: left ? 120 + r() * 120 : 860 + r() * 110, h: 120 + r() * 150, b: r() < .5, ph: r() * TAU }); }
  for (let i = 0; i < 700; i++) { const left = r() < .5; grass.push({ x: left ? -300 + r() * 440 : 930 + r() * 470, y: 549 + r() * 10, h: 6 + r() * 14, a: (r() - .5) * .6 }); }
  for (let i = 0; i < 90; i++) { const u = r(); const j = Math.floor(2 + u * 7); const p0 = BASIN[j], p1 = BASIN[j + 1]; const f = r(); pebbles.push({ x: lerp(p0[0], p1[0], f), y: lerp(p0[1], p1[1], f) - r() * 18, s: 3 + r() * 9, c: ['#a7957f', '#8b7a69', '#c2ad8f', '#7d8a86'][Math.floor(r() * 4)] }); }
  for (let i = 0; i < 9; i++) plants.push({ x: 240 + r() * 600, h: 90 + r() * 170, ph: r() * TAU });
  return { hills, trees, flowers, reeds, grass, pebbles, plants };
})();
function basinY(x) {
  for (let i = 1; i < BASIN.length; i++) if (x <= BASIN[i][0]) { const a = BASIN[i - 1], b = BASIN[i], u = (x - a[0]) / (b[0] - a[0]); return lerp(a[1], b[1], u); }
  return 548;
}
function basinPath(ctx) { D.trace(ctx, BASIN, false); ctx.lineTo(1400, 547); ctx.lineTo(-300, 547); ctx.closePath(); }

function cloud(ctx, x, y, s, col) {
  ctx.fillStyle = col; ctx.beginPath();
  ctx.arc(x, y, 34 * s, Math.PI, 0); ctx.arc(x + 46 * s, y - 14 * s, 44 * s, Math.PI, 0); ctx.arc(x + 100 * s, y, 30 * s, Math.PI, 0);
  ctx.lineTo(x + 130 * s, y); ctx.lineTo(x - 34 * s, y); ctx.closePath(); ctx.fill();
}
function sun(ctx, x, y, r, t, col, rays = 18, rayLen = 1) {
  ctx.save();
  D.glow(ctx, x, y, r * 4, col, .35);
  ctx.strokeStyle = rgba(col, .85); ctx.lineWidth = 2; ctx.lineCap = 'round';
  for (let i = 0; i < rays; i++) { const a = TAU * i / rays + t * .1, l = (i % 2 ? .55 : 1) * r * .9 * rayLen; D.line(ctx, x + Math.cos(a) * r * 1.35, y + Math.sin(a) * r * 1.35, x + Math.cos(a) * (r * 1.35 + l), y + Math.sin(a) * (r * 1.35 + l)); }
  ctx.fillStyle = rgba(col); ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
  ctx.save(); ctx.clip(); D.texture(ctx, T.hatchL, .35, x, y); ctx.restore();
  ctx.restore();
}
function tree(ctx, x, y, s, c1, c2) {
  ctx.fillStyle = c2; ctx.fillRect(x - 2 * s, y - 16 * s, 4 * s, 18 * s);
  ctx.fillStyle = c1; ctx.beginPath(); ctx.ellipse(x, y - 30 * s, 15 * s, 20 * s, 0, 0, TAU); ctx.fill();
}
function lilyPad(ctx, x, y, s, col, edge) {
  ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(x, y, 46 * s, 9 * s, 0, .25, TAU - .25); ctx.lineTo(x, y); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = edge; ctx.lineWidth = 1.5; ctx.stroke();
}
function lily(ctx, x, y, s, open, k) {
  for (let i = 0; i < 7; i++) {
    const a = -Math.PI / 2 + (i - 3) * .32 * (0.5 + open * .7), l = 30 * s * (i === 3 ? 1 : .85);
    ctx.save(); ctx.translate(x, y); ctx.rotate(a + Math.PI / 2);
    ctx.fillStyle = rgba(K(i % 2 ? '#f6c3d0' : '#ee93ac', k)); ctx.beginPath(); ctx.ellipse(0, -l * .5, 7 * s, l * .55, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = rgba(K('#b8566f', k)); ctx.lineWidth = 1.2; ctx.stroke();
    ctx.restore();
  }
  D.dot(ctx, x, y - 6 * s, 6 * s, K('#f2b84b', k));
}
function leafDecay(ctx, x, y, s, k) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(-.12); ctx.scale(s, s);
  ctx.fillStyle = rgba(K('#c46a32', k)); ctx.beginPath(); ctx.moveTo(-60, 0); ctx.bezierCurveTo(-30, -22, 30, -24, 62, -2); ctx.bezierCurveTo(30, 14, -30, 16, -60, 0); ctx.fill();
  ctx.save(); ctx.clip(); D.texture(ctx, T.hatchD, .4); D.texture(ctx, T.stipD, .35); ctx.restore();
  ctx.strokeStyle = rgba(K('#6f3417', k)); ctx.lineWidth = 2; ctx.stroke();
  ctx.lineWidth = 1.4; D.line(ctx, -60, 0, 62, -2);
  for (let i = -3; i <= 3; i++) { D.line(ctx, i * 14, -.3, i * 14 + 14, -14); D.line(ctx, i * 14, -.3, i * 14 + 14, 12); }
  ctx.restore();
}
function fish(ctx, x, y, s, dir, t, col) {
  ctx.save(); ctx.translate(x, y); ctx.scale(dir * s, s);
  const w = Math.sin(t * 9) * .25;
  ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(0, 0, 26, 11, 0, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-22, 0); ctx.lineTo(-40, -11 + w * 10); ctx.lineTo(-40, 11 + w * 10); ctx.closePath(); ctx.fill();
  D.dot(ctx, 15, -3, 2.4, '#1d1620');
  ctx.strokeStyle = 'rgba(255,240,220,.6)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(2, 0, 9, -1.2, 1.2); ctx.stroke();
  ctx.restore();
}

// o: {dry 0..1, level (water surface y), k sepia, sunX, sunY, dragon}
function pond(ctx, cx, cy, z, t, o = {}) {
  const dry = o.dry ?? 0, k = o.k ?? 0, level = o.level ?? 556;
  screen(ctx);
  // sky bands
  const sky = dry > 0 ? [mix('#8fc0e2', '#f09a54', dry), mix('#bfdcec', '#f6be7d', dry), mix('#f3e3c6', '#fbe0b0', dry)] : ['#8fc0e2', '#bfdcec', '#f3e3c6'];
  cam(ctx, cx, cy, z);
  const g = ctx.createLinearGradient(0, -400, 0, 560);
  g.addColorStop(0, rgba(K(sky[0], k))); g.addColorStop(.6, rgba(K(sky[1], k))); g.addColorStop(1, rgba(K(sky[2], k)));
  ctx.fillStyle = g; ctx.fillRect(-600, -600, 2400, 1200);
  ctx.save(); ctx.beginPath(); ctx.rect(-600, -600, 2400, 1200); ctx.clip(); D.texture(ctx, T.hatchL, .25, 0, 0, true); ctx.restore();
  sun(ctx, o.sunX ?? 820, o.sunY ?? 170, lerp(44, 70, dry), t, K(mix('#f7d36a', '#ffb347', dry), k), 22, lerp(1, 1.8, dry));
  for (let i = 0; i < 5; i++) { const x = ((i * 290 + t * (8 + i * 3)) % 1700) - 400; cloud(ctx, x, 120 + i * 47 % 140, .7 + (i % 3) * .25, rgba(K('#fff8ea', k), .9 * (1 - dry * .7))); }
  // hills + little trees
  const hc = [['#9cc9a4', '#7fb48f', '#5f9a73'], ['#e2b46d', '#cf9a52', '#b77f3f']];
  POND.hills.forEach((pts, L) => {
    const col = mix(hc[0][L], hc[1][L], dry);
    ctx.fillStyle = rgba(K(col, k)); ctx.beginPath(); D.trace(ctx, pts, false); ctx.lineTo(1500, 700); ctx.lineTo(-400, 700); ctx.closePath(); ctx.fill();
    ctx.save(); ctx.clip(); D.texture(ctx, T.hatchD, .14, 0, L * 40, true); ctx.restore();
    for (const tr of POND.trees) if (tr.L === L) {
      const i = Math.max(0, Math.min(pts.length - 1, Math.round((tr.x + 400) / 20)));
      tree(ctx, tr.x, pts[i][1] + 6, tr.s, rgba(K(mix(['#4f8d5a', '#3f7a52', '#2f6a4a'][L], '#a8743a', dry), k)), rgba(K('#5a3a2a', k)));
    }
  });
  // soil cross-section under the banks, topped with a strip of turf
  ctx.save(); ctx.beginPath(); ctx.rect(-600, 548, 2400, 900); ctx.clip();
  ctx.fillStyle = rgba(K(mix('#8a5c3c', '#a67446', dry), k)); ctx.fillRect(-600, 548, 2400, 900);
  D.texture(ctx, T.stipD, .4, 0, 0, true); D.texture(ctx, T.hatchD, .25, 0, 0, true);
  ctx.strokeStyle = rgba(K('#5a3a26', k), .5); ctx.lineWidth = 1.5;
  for (let i = 0; i < 5; i++) { ctx.beginPath(); for (let x = -600; x <= 1800; x += 40) { const y = 610 + i * 90 + Math.sin(x / 90 + i) * 10; if (x === -600) ctx.moveTo(x, y); else ctx.lineTo(x, y); } ctx.stroke(); }
  const groundCol = mix('#7fb25a', '#c9a35e', dry);
  ctx.fillStyle = rgba(K(groundCol, k)); ctx.fillRect(-600, 546, 2400, 18);
  ctx.restore();
  ctx.strokeStyle = rgba(K(mix('#4f8a3c', '#9b7a3c', dry), k)); ctx.lineWidth = 1.4; ctx.lineCap = 'round';
  for (const gr of POND.grass) D.line(ctx, gr.x, gr.y, gr.x + gr.a * gr.h + Math.sin(t * 2 + gr.x) * 1.5, gr.y - gr.h * (1 - dry * .4));
  for (const f of POND.flowers) D.dot(ctx, f.x, f.y, f.s * (1 - dry * .6), K(f.c, k), 1 - dry * .5);
  // basin interior (water or exposed mud)
  ctx.save(); ctx.beginPath(); basinPath(ctx); ctx.clip();
  const bg = ctx.createLinearGradient(0, 540, 0, 980);
  bg.addColorStop(0, rgba(K('#6fc7c2', k))); bg.addColorStop(.5, rgba(K('#3f9fa8', k))); bg.addColorStop(1, rgba(K('#23707f', k)));
  // far wall of the basin, exposed above the water line
  ctx.fillStyle = rgba(K(mix('#a87a52', '#c99a62', dry), k)); ctx.fillRect(-600, 548, 2400, 1200);
  D.texture(ctx, T.hatchX, .25, 0, 0, true);
  if (dry > .05) {
    ctx.strokeStyle = rgba(K('#4a2f22', k), clamp(dry * 1.5) * .8); ctx.lineWidth = 2;
    for (let i = 0; i < 60; i++) { const x = 160 + hash(i) * 760, y = basinY(x) - 6 - hash(i + 9) * 30; if (y < level - 6) { D.line(ctx, x, y, x + 14 * (hash(i + 3) - .5), y + 10); D.line(ctx, x, y, x - 10, y - 6 * hash(i + 5)); } }
  }
  ctx.fillStyle = bg; ctx.fillRect(-600, level, 2400, 1200);
  // light shafts
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 6; i++) { const x = 180 + i * 130 + Math.sin(t * .5 + i) * 20; ctx.fillStyle = 'rgba(200,255,240,0.05)'; ctx.beginPath(); ctx.moveTo(x, level); ctx.lineTo(x + 50, level); ctx.lineTo(x - 80, 1000); ctx.lineTo(x - 160, 1000); ctx.closePath(); ctx.fill(); }
  ctx.restore();
  ctx.save(); ctx.beginPath(); ctx.rect(-600, level, 2400, 1200); ctx.clip(); D.texture(ctx, T.hatchL, .2, 0, 0, true); ctx.restore();
  // water plants
  for (const p of POND.plants) {
    const by = basinY(p.x), h = Math.min(p.h, by - level - 10) * (1 - dry * .3);
    if (h < 20) continue;
    ctx.strokeStyle = rgba(K('#2f7a43', k)); ctx.lineWidth = 2.5;
    const sw = (u) => Math.sin(t * 1.3 + p.ph + u * 3) * 10 * u;
    ctx.beginPath(); for (let i = 0; i <= 12; i++) { const u = i / 12; const x = p.x + sw(u), y = by - u * h; if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); } ctx.stroke();
    ctx.fillStyle = rgba(K('#4fa65a', k));
    for (let i = 1; i < 12; i++) { const u = i / 12, x = p.x + sw(u), y = by - u * h; for (const s of [-1, 1]) { ctx.beginPath(); ctx.ellipse(x + s * 8, y - 3, 9, 3, s * -.5, 0, TAU); ctx.fill(); } }
  }
  // fish & bubbles
  if (dry < .4) {
    fish(ctx, ((t * 40) % 900) + 100, 700 + Math.sin(t) * 20, .9, 1, t, rgba(K('#f08a4b', k), 1 - dry * 2));
    fish(ctx, 900 - ((t * 28 + 300) % 800), 800 + Math.sin(t * .8) * 14, .7, -1, t, rgba(K('#f2b84b', k), 1 - dry * 2));
  }
  for (let i = 0; i < 18; i++) { const x = 250 + hash(i) * 600, sp = 30 + hash(i + 4) * 30, y = 950 - ((t * sp + hash(i + 7) * 400) % 400); if (y > level + 8 && y < basinY(x)) D.ring(ctx, x + Math.sin(t * 2 + i) * 4, y, 2 + hash(i + 2) * 4, '#e9fffb', .7, 1.4); }
  // bottom: pebbles + the decaying leaf where the amoebae live
  for (const p of POND.pebbles) { ctx.fillStyle = rgba(K(p.c, k)); ctx.beginPath(); ctx.ellipse(p.x, p.y, p.s, p.s * .65, 0, 0, TAU); ctx.fill(); ctx.strokeStyle = rgba(K('#4a3a2e', k), .6); ctx.lineWidth = 1; ctx.stroke(); }
  leafDecay(ctx, 430, 922, .9, k);
  ctx.restore();
  // basin outline + water surface line
  ctx.strokeStyle = rgba(K('#4a2f22', k), .8); ctx.lineWidth = 2.5; D.shape(ctx, BASIN, false); ctx.stroke();
  const x0 = BASIN.reduce((m, p, i) => (i && p[1] > level && BASIN[i - 1][1] <= level ? lerp(BASIN[i - 1][0], p[0], (level - BASIN[i - 1][1]) / (p[1] - BASIN[i - 1][1])) : m), 140);
  let x1 = 940; for (let i = BASIN.length - 1; i > 0; i--) { const a = BASIN[i - 1], b = BASIN[i]; if (a[1] >= level && b[1] < level) { x1 = lerp(a[0], b[0], (a[1] - level) / (a[1] - b[1])); break; } }
  ctx.strokeStyle = rgba(K('#e8fbff', k), .9); ctx.lineWidth = 2.5; ctx.beginPath();
  for (let x = x0; x <= x1; x += 8) { const y = level + Math.sin(x / 30 + t * 2) * 1.6; if (x === x0) ctx.moveTo(x, y); else ctx.lineTo(x, y); } ctx.stroke();
  // lily pads + flower ride the surface
  if (dry < .95) {
    const pads = [[330, .9], [470, 1.1], [690, .8], [600, .6]];
    for (const [px, s] of pads) {
      const xx = clamp(px, x0 + 40, x1 - 40), yy = Math.min(level, basinY(xx) - 4) + Math.sin(t + px) * 1.2;
      lilyPad(ctx, xx, yy, s * (1 - dry * .3), rgba(K(mix('#4f9e4a', '#9a7a3a', dry), k)), rgba(K('#2c5f30', k)));
    }
    if (dry < .5) lily(ctx, clamp(480, x0 + 40, x1 - 40), Math.min(level, basinY(480)) - 4, 1, .6 + .4 * Math.sin(t * .4) ** 2, k);
  }
  // reeds and cattails along both banks
  for (const rd of POND.reeds) {
    const by = basinY(rd.x) + 4, sway = Math.sin(t * 1.4 + rd.ph) * 6;
    const col = rgba(K(mix('#3f7d3a', '#b89a4a', dry), k));
    ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(rd.x, by); ctx.quadraticCurveTo(rd.x + sway * .3, by - rd.h * .5, rd.x + sway + dry * 30 * (rd.x < 500 ? -1 : 1), by - rd.h * (1 - dry * .25)); ctx.stroke();
    if (rd.b) { ctx.fillStyle = rgba(K('#7a4a2a', k)); ctx.beginPath(); ctx.ellipse(rd.x + sway * .92 + dry * 26 * (rd.x < 500 ? -1 : 1), by - rd.h * (1 - dry * .25) + 16, 6, 18, 0, 0, TAU); ctx.fill(); }
    ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(rd.x + 2, by); ctx.quadraticCurveTo(rd.x + 20, by - rd.h * .3, rd.x + 34 + sway, by - rd.h * .45); ctx.stroke();
  }
  // dragonfly
  if (o.dragon) {
    const dx = 300 + Math.sin(t * .7) * 220, dy = 470 + Math.sin(t * 1.9) * 30;
    ctx.save(); ctx.translate(dx, dy);
    ctx.fillStyle = 'rgba(220,240,255,.6)'; const f = Math.sin(t * 40) * .3;
    for (const [ax, ay] of [[-6, -1], [6, -1]]) { ctx.beginPath(); ctx.ellipse(ax * 2, -8, 20, 5, ay * (.4 + f), 0, TAU); ctx.fill(); }
    ctx.strokeStyle = '#2f5bb5'; ctx.lineWidth = 4; ctx.lineCap = 'round'; D.line(ctx, -30, 0, 14, 0);
    D.dot(ctx, 16, 0, 5, '#2f5bb5');
    ctx.restore();
  }
}

// =====================================================================
// CRACKED MUD (top-down)
// =====================================================================
const MUD = (() => {
  const s = 74, plates = [], key = (x, y) => `${Math.round(x)},${Math.round(y)}`, jit = new Map();
  const J = (x, y) => { const kk = key(x, y); if (!jit.has(kk)) { const h1 = hash(Math.round(x) * 73856093 ^ Math.round(y) * 19349663), h2 = hash(Math.round(x) * 83492791 ^ Math.round(y) * 2971215); jit.set(kk, [x + (h1 - .5) * s * .55, y + (h2 - .5) * s * .55]); } return jit.get(kk); };
  for (let r = -10; r <= 24; r++) for (let q = -16; q <= 22; q++) {
    const cx = s * Math.sqrt(3) * (q + r / 2), cy = s * 1.5 * r;
    if (cx < -900 || cx > 2000 || cy < -900 || cy > 2000) continue;
    const pts = [];
    for (let i = 0; i < 6; i++) { const a = Math.PI / 6 + Math.PI / 3 * i; pts.push(J(cx + Math.cos(a) * s, cy + Math.sin(a) * s)); }
    const mx = pts.reduce((a, p) => a + p[0], 0) / 6, my = pts.reduce((a, p) => a + p[1], 0) / 6;
    plates.push({ pts, mx, my, h: hash(q * 131 + r * 7) });
  }
  return { plates };
})();
// o: {wet 0..1 cracks fill, flood 0..1 surface covered, k}
function mud(ctx, cx, cy, z, t, o = {}) {
  const k = o.k ?? 0, wet = o.wet ?? 0, flood = o.flood ?? 0, night = o.night ?? 0;
  cam(ctx, cx, cy, z);
  ctx.fillStyle = rgba(K(mix(mix('#4a2f22', '#2e6f8a', wet), '#1c2546', night * .6), k)); ctx.fillRect(-1000, -1000, 3200, 3200);
  for (const p of MUD.plates) {
    if (!onScreen(ctx, p.mx, p.my, 120)) continue;
    const gap = lerp(.86, .9, wet);
    const pts = p.pts.map(([x, y]) => [lerp(p.mx, x, gap), lerp(p.my, y, gap)]);
    const base = mix(mix('#d9a96b', '#c48a52', p.h), '#8a5a3a', wet * .7);
    ctx.fillStyle = rgba(K(mix(base, '#3a3f6a', night * .55), k));
    ctx.beginPath(); pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.closePath(); ctx.fill();
    ctx.save(); ctx.clip(); D.texture(ctx, T.hatchD, .3, p.mx, p.my); D.texture(ctx, T.stipD, .25, p.mx + 300, p.my); ctx.restore();
    ctx.strokeStyle = rgba(K('#fbe3b8', k), .45 * (1 - night * .6)); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(pts[3][0], pts[3][1]); ctx.lineTo(pts[4][0], pts[4][1]); ctx.lineTo(pts[5][0], pts[5][1]); ctx.stroke();
  }
  if (flood > 0) {
    screen(ctx);
    const g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, rgba(K('#8fd3e0', k), .85 * flood)); g.addColorStop(1, rgba(K('#3f8fb0', k), .9 * flood));
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.save(); ctx.globalAlpha = flood; D.texture(ctx, T.hatchL2, .35, t * 6, 0, true); ctx.restore();
    cam(ctx, cx, cy, z);
  }
}
// rain impacts: expanding rings at deterministic places/times
function ripples(ctx, t, rate, t0 = 0, o = {}) {
  if (rate <= 0) return;
  screen(ctx);
  const n = Math.floor((t - t0) * rate);
  ctx.lineWidth = 2;
  for (let i = Math.max(0, n - Math.ceil(rate * 1.2)); i <= n; i++) {
    const age = t - t0 - i / rate; if (age < 0) continue;
    const x = hash(i * 2 + 1) * W, y = hash(i * 2 + 2) * H, r = age * 90;
    const a = Math.max(0, 1 - age / 1.1);
    D.ring(ctx, x, y, r, o.col ?? '#e6f8ff', a * .8, 2); D.ring(ctx, x, y, r * .6, o.col ?? '#e6f8ff', a * .5, 1.5);
    if (age < .12) D.dot(ctx, x, y, 4, '#ffffff', 1 - age / .12);
  }
}
function rain(ctx, t, amt, o = {}) {
  if (amt <= 0) return;
  screen(ctx);
  ctx.strokeStyle = rgba(o.col ?? '#dff3ff', .55 * amt); ctx.lineWidth = 1.6; ctx.lineCap = 'round';
  const n = Math.floor(160 * amt);
  for (let i = 0; i < n; i++) {
    const sp = 900 + hash(i) * 500, x = (hash(i + 7) * (W + 200) + t * 120) % (W + 200) - 100, y = ((hash(i + 3) * H + t * sp) % (H + 120)) - 60;
    D.line(ctx, x, y, x - 10, y + 34);
  }
}

// =====================================================================
// NIGHT SKY with time-lapse star trails
// =====================================================================
const STARS = (() => { const r = rng(77), s = []; for (let i = 0; i < 220; i++) s.push({ a: r() * TAU, d: 40 + Math.pow(r(), .7) * 900, b: .3 + r() * .7, tw: r() * TAU }); return s; })();
function nightSky(ctx, t, o = {}) {
  const trail = o.trail ?? 0, px = o.px ?? 540, py = o.py ?? 120, k = o.k ?? 0, rot = o.rot ?? 0;
  screen(ctx);
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, rgba(K('#141a3f', k))); g.addColorStop(.6, rgba(K('#28306a', k))); g.addColorStop(1, rgba(K('#4a3f7a', k)));
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  D.texture(ctx, T.hatchL, .08, 0, 0, true);
  ctx.lineCap = 'round';
  for (const s of STARS) {
    const a = s.a + rot, x = px + Math.cos(a) * s.d, y = py + Math.sin(a) * s.d;
    if (trail > 0) { ctx.strokeStyle = rgba('#e9ecff', .35 * s.b); ctx.lineWidth = 1.3; ctx.beginPath(); ctx.arc(px, py, s.d, a - trail, a); ctx.stroke(); }
    if (y > H || y < -10 || x < -10 || x > W + 10) continue;
    D.dot(ctx, x, y, 1.2 + s.b * 1.2, '#fffbea', s.b * (.6 + .4 * Math.sin(t * 3 + s.tw)));
  }
}

module.exports = { cam, screen, micro, alga, pond, basinY, mud, ripples, rain, nightSky, sun, MICRO };
