// Plants: milkweed (leaves that can be eaten, stems, pink flower umbels, seed pods that split and release silk),
// meadow flowers (coneflower, goldenrod, blazing star, daisy) and grass. Pure functions of their options.
const { TAU, clamp, lerp, ss, hash, noise1, rgba, mix, rng, PAL } = require('./core');
const D = require('./draw');
const { T } = require('./tex');

// ---------------------------------------------------------------- leaf
// half-width of the leaf at u (0 base .. 1 tip), as a fraction of W
const widthAt = (u, o = {}) => Math.pow(Math.sin(Math.PI * Math.pow(clamp(u), o.k ?? .78)), o.p ?? .85) * (1 - .1 * u);
// local frame: base at (0,0), tip at (L,0); half width W; curl bends the midrib (+ = toward -y)
function leafPts(L, W, curl = 0, n = 40, o = {}) {
  const top = [], bot = [], mid = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, x = t * L, bend = curl * L * .35 * t * t, y = -bend;
    const w = W * widthAt(t, o);
    const ang = Math.atan2(-curl * .7 * t, 1), nx = -Math.sin(ang), ny = Math.cos(ang);
    mid.push([x, y]);
    const wave = (o.wavy ?? 0) * Math.sin(t * 19 + (o.seed ?? 0)) * W * .04;
    top.push([x - nx * (w + wave), y - ny * (w + wave)]); bot.push([x + nx * (w - wave), y + ny * (w - wave)]);
  }
  return { mid, outline: top.concat(bot.reverse()) };
}
// bite: a scalloped hole shape in leaf-local coords, appended to the current path (for an evenodd clip)
function bitePath(ctx, cx, cy, r, seed = 1) {
  const n = 28;
  for (let i = 0; i <= n; i++) {
    const a = TAU * i / n, k = 1 + .09 * Math.sin(a * 7 + seed) + .05 * Math.sin(a * 13 + seed * 2);
    const x = cx + Math.cos(a) * r * k, y = cy + Math.sin(a) * r * k;
    if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
  }
  ctx.closePath();
}

// o: x, y, ang, L, W, curl, under (show the pale underside), col, light (0..1), bites [[u, v, r]] (u along 0..1, v across -1..1),
//    hole: [u, v, r] trench circle, dof (blur px), alpha, veinA
function leaf(ctx, o) {
  const L = o.L ?? 200, W = o.W ?? L * .26, curl = o.curl ?? 0;
  const { mid, outline } = leafPts(L, W, curl, 40, o);
  ctx.save();
  ctx.translate(o.x ?? 0, o.y ?? 0); ctx.rotate(o.ang ?? 0);
  if (o.flipY) ctx.scale(1, -1);
  if (o.alpha !== undefined) ctx.globalAlpha *= o.alpha;
  if (o.dof) ctx.filter = `blur(${o.dof.toFixed(1)}px)`;
  if (o.bites && o.bites.length) {
    ctx.beginPath(); ctx.rect(-L, -L * 2, L * 3, L * 4);
    for (const [u, v, r, sd] of o.bites) bitePath(ctx, u * L, -curl * L * .35 * u * u + v * W * widthAt(u, o), r * W, sd ?? 3);
    ctx.clip('evenodd');
  }
  const base = o.col ?? (o.under ? PAL.leafUnder : PAL.leaf), light = o.light ?? 1;
  if (o.shadow) { ctx.save(); ctx.translate(o.shadow[0], o.shadow[1]); D.shape(ctx, outline); ctx.fillStyle = rgba('#14300c', .22); ctx.fill(); ctx.restore(); }
  D.shape(ctx, outline);
  const g = ctx.createLinearGradient(0, -W, 0, W);
  g.addColorStop(0, rgba(mix(base, '#e9ffc0', .28 * light))); g.addColorStop(.5, rgba(base)); g.addColorStop(1, rgba(mix(base, '#173a10', .35)));
  ctx.fillStyle = g; ctx.fill();
  if (!o.dof && !o.flat) {
    ctx.save(); D.shape(ctx, outline); ctx.clip();
    // light falling across the leaf + fine cell texture in close-ups
    const lg = ctx.createLinearGradient(0, 0, L, 0);
    lg.addColorStop(0, rgba('#0c2a06', .18)); lg.addColorStop(.45, rgba('#fffbd0', .08 * light)); lg.addColorStop(1, rgba('#0c2a06', .1));
    ctx.fillStyle = lg; ctx.fillRect(0, -W * 1.2, L, W * 2.4);
    if (o.macro) { ctx.globalAlpha *= o.macro; ctx.drawImage(T.leaf, -40, -W * 1.4, L + 80, (L + 80)); ctx.globalAlpha /= o.macro; }
    // lateral veins curving toward the tip
    const vc = o.under ? '#e9f5d6' : mix(base, '#e6f7c4', .55);
    ctx.strokeStyle = rgba(vc, (o.veinA ?? .55)); ctx.lineWidth = Math.max(.8, L * .006); ctx.lineCap = 'round';
    for (let i = 1; i < 11; i++) {
      const t = i / 12, p = mid[Math.round(t * 40)], w = W * Math.sin(Math.PI * Math.pow(t, .78)) * .92;
      for (const sd of [-1, 1]) {
        ctx.beginPath(); ctx.moveTo(p[0], p[1]);
        ctx.quadraticCurveTo(p[0] + L * .06, p[1] + sd * w * .55, p[0] + L * .13, p[1] + sd * w * .9);
        ctx.stroke();
      }
    }
    ctx.restore();
  }
  // pale midrib (often blushing pink near the base on milkweed)
  ctx.strokeStyle = rgba(o.under ? '#f2f8e4' : '#e4f2c4', .9); ctx.lineWidth = Math.max(1.2, L * .016); ctx.lineCap = 'round';
  ctx.beginPath(); D.trace(ctx, mid.filter((_, i) => i % 4 === 0 || i === 40), false); ctx.stroke();
  if (!o.dof) {
    ctx.strokeStyle = rgba(mix(base, '#0f2a08', .45), .55); ctx.lineWidth = Math.max(1, L * .007);
    D.shape(ctx, outline); ctx.stroke();
    if (o.rim) { ctx.strokeStyle = rgba('#f4ffd0', o.rim); ctx.lineWidth = Math.max(1.5, L * .006); D.shape(ctx, outline); ctx.stroke(); }
  }
  if (o.hole) { // a ring trench chewed by a newly hatched caterpillar
    const [u, v, r] = o.hole;
    ctx.strokeStyle = rgba('#d8e8b0', .9); ctx.lineWidth = Math.max(1, r * W * .25);
    ctx.beginPath(); ctx.arc(u * L, v * W, r * W, 0, TAU * (o.holeP ?? 1)); ctx.stroke();
  }
  ctx.restore();
  return { mid, outline, L, W };
}
// leaf-local point -> world (v is relative to the half-width at u: -1 = top margin, 1 = bottom margin)
function leafAt(o, u, v) {
  const L = o.L ?? 200, W = o.W ?? L * .26, curl = o.curl ?? 0, x = u * L, y = -curl * L * .35 * u * u + v * W * widthAt(u, o) * (o.flipY ? -1 : 1);
  const a = o.ang ?? 0;
  return [(o.x ?? 0) + Math.cos(a) * x - Math.sin(a) * y, (o.y ?? 0) + Math.sin(a) * x + Math.cos(a) * y];
}

// ---------------------------------------------------------------- stems
function stem(ctx, pts, w0, w1, o = {}) {
  D.ribbon(ctx, pts, w0, w1, true);
  const col = o.col ?? PAL.stem;
  if (o.dof) { ctx.save(); ctx.filter = `blur(${o.dof}px)`; ctx.fillStyle = rgba(col, o.a ?? 1); ctx.fill(); ctx.restore(); return; }
  ctx.fillStyle = rgba(col, o.a ?? 1); ctx.fill();
  ctx.save(); ctx.clip();
  ctx.strokeStyle = rgba('#e8ffd0', .35 * (o.a ?? 1)); ctx.lineWidth = w0 * .25; ctx.lineCap = 'round';
  ctx.beginPath(); D.trace(ctx, pts.map(([x, y]) => [x - w0 * .18, y]), false); ctx.stroke();
  ctx.restore();
}

// ---------------------------------------------------------------- milkweed flower umbel: a dome of little star flowers
function umbel(ctx, x, y, r, o = {}) {
  const n = o.n ?? 46, rr = rng(o.seed ?? 5), t = o.t ?? 0, col = o.col ?? PAL.milkPink, open = o.open ?? 1;
  ctx.save(); ctx.translate(x, y);
  if (o.dof) ctx.filter = `blur(${o.dof}px)`;
  if (o.alpha !== undefined) ctx.globalAlpha *= o.alpha;
  const fl = [];
  for (let i = 0; i < n; i++) {
    // points on a dome (golden-angle spiral), z toward the viewer
    const k = (i + .5) / n, el = Math.acos(1 - k * 1.25), az = i * 2.39996 + (o.seed ?? 0);
    const dx = Math.sin(el) * Math.cos(az), dz = Math.sin(el) * Math.sin(az), dy = -Math.cos(el);
    fl.push({ x: dx * r, y: dy * r * .8 + r * .25, z: dz, s: .85 + rr() * .3, w: rr() });
  }
  // pedicels from the centre
  ctx.strokeStyle = rgba('#8aa86a', .8); ctx.lineWidth = Math.max(.6, r * .025);
  for (const f of fl) if (f.z < .3) { ctx.beginPath(); ctx.moveTo(0, r * .55); ctx.lineTo(f.x * .95, f.y * .95); ctx.stroke(); }
  fl.sort((a, b) => a.z - b.z);
  for (const f of fl) {
    const fr = r * .2 * f.s * open, dark = (1 - f.z) * .5, sway = Math.sin(t * 2 + f.w * 6) * .1;
    const pc = mix(col, '#5a1f3a', dark * .6), cc = mix('#ffe6ef', '#c9809c', dark * .5);
    ctx.save(); ctx.translate(f.x, f.y); ctx.rotate(sway + f.w);
    ctx.fillStyle = rgba(pc);
    ctx.beginPath();
    for (let p = 0; p < 5; p++) { const a = p * TAU / 5; ctx.moveTo(0, 0); ctx.quadraticCurveTo(Math.cos(a - .5) * fr * .9, Math.sin(a - .5) * fr * .9, Math.cos(a) * fr, Math.sin(a) * fr); ctx.quadraticCurveTo(Math.cos(a + .5) * fr * .9, Math.sin(a + .5) * fr * .9, 0, 0); }
    ctx.fill();
    ctx.fillStyle = rgba(cc); ctx.beginPath(); ctx.arc(0, 0, fr * .42, 0, TAU); ctx.fill();
    ctx.fillStyle = rgba(mix(cc, '#ffffff', .4), .8); ctx.beginPath(); ctx.arc(-fr * .1, -fr * .12, fr * .16, 0, TAU); ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}

// ---------------------------------------------------------------- seed pod (split = 0 closed .. 1 open with silk floss)
function pod(ctx, x, y, s, ang, o = {}) {
  const split = o.split ?? 0;
  ctx.save(); ctx.translate(x, y); ctx.rotate(ang); ctx.scale(s, s);
  const pts = []; for (let i = 0; i <= 30; i++) { const t = i / 30, w = 22 * Math.sin(Math.PI * Math.pow(t, .7)); pts.push([t * 110, -w]); }
  for (let i = 30; i >= 0; i--) { const t = i / 30, w = 22 * Math.sin(Math.PI * Math.pow(t, .7)); pts.push([t * 110, w * (1 - split * .6)]); }
  D.shape(ctx, pts);
  const g = ctx.createLinearGradient(0, -22, 0, 22); g.addColorStop(0, rgba(o.col ?? '#a7c46c')); g.addColorStop(1, rgba(mix(o.col ?? '#a7c46c', '#2c4a18', .5)));
  ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = rgba('#3a5520', .7); ctx.lineWidth = 2; ctx.stroke();
  for (let i = 0; i < 18; i++) D.dot(ctx, 15 + hash(i) * 80, (hash(i + 9) - .5) * 26, 2.2, '#cfe0a0', .7);
  if (split > 0) { // white floss bulging out of the seam
    for (let i = 0; i < 12; i++) { const u = .15 + i * .065, px = u * 110, py = 8 * split; D.glow(ctx, px, py, 18 * split, '#ffffff', .8); D.dot(ctx, px, py, 7 * split, '#fdfbf2'); }
  }
  ctx.restore();
}
// milkweed seed riding its silk parachute
function seed(ctx, x, y, s, a = 1, rot = 0) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.globalAlpha *= a;
  ctx.strokeStyle = rgba('#ffffff', .75); ctx.lineWidth = .8; ctx.lineCap = 'round';
  for (let i = 0; i < 14; i++) { const ang = -Math.PI / 2 + (i / 13 - .5) * 2.4; ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(Math.cos(ang) * s * .5, Math.sin(ang) * s * .6 - s * .2, Math.cos(ang) * s, Math.sin(ang) * s); ctx.stroke(); }
  D.glow(ctx, 0, -s * .5, s * .9, '#ffffff', .25);
  ctx.fillStyle = rgba('#8a5a2e'); ctx.beginPath(); ctx.ellipse(0, s * .12, s * .12, s * .18, 0, 0, TAU); ctx.fill();
  ctx.restore();
}

// ---------------------------------------------------------------- whole milkweed plant (side view, ground at y)
// o: s (scale), t (wind time), umbels (bool), pods (0..1 split), leaves alpha, dof, seed, eaten (0..1 leaf loss), tint
function milkweed(ctx, x, y, o = {}) {
  const s = o.s ?? 1, t = o.t ?? 0, sd = o.seed ?? 1, H = (o.h ?? 420) * s, tint = o.tint ?? null;
  const sway = (u) => Math.sin(t * 1.3 + sd) * 10 * s * u * u + noise1(t * .7 + sd, sd) * 6 * s * u * u;
  const pts = []; for (let i = 0; i <= 10; i++) { const u = i / 10; pts.push([x + sway(u) + (hash(sd) - .5) * 30 * s * u, y - H * u]); }
  const col = (c) => (tint ? mix(c, tint[0], tint[1]) : c);
  stem(ctx, pts, 9 * s, 5 * s, { col: col('#7d9e55'), dof: o.dof });
  const at = (u) => { const f = u * 10, i = Math.min(9, Math.floor(f)), r = f - i; return [lerp(pts[i][0], pts[i + 1][0], r), lerp(pts[i][1], pts[i + 1][1], r)]; };
  // opposite leaf pairs, broad and slightly drooping
  const pairs = o.pairs ?? 5;
  for (let k = 0; k < pairs; k++) {
    const u = .18 + k * (.7 / pairs), p = at(u), L = (150 - k * 12) * s * (o.leafK ?? 1);
    for (const side of [-1, 1]) {
      const id = k * 2 + (side > 0 ? 1 : 0), gone = o.eaten ? clamp(o.eaten * 1.4 - hash(id + sd * 7) * .5) : 0;
      if (gone >= 1) continue;
      const ang = (side > 0 ? -.35 : Math.PI + .35) + side * (.25 + .1 * Math.sin(t * 1.7 + id)) * (1 - u * .4);
      const bites = gone > 0 ? [[.75, side * .2, .9 * gone + .3, id], [.45, side * .7, gone * .9, id + 3]] : null;
      leaf(ctx, { x: p[0], y: p[1], ang, L: L * (1 - gone * .2), W: L * .28, curl: side * -.12, col: col(k % 2 ? '#6aa847' : '#5f9c42'), bites, dof: o.dof, alpha: o.leafA, flat: o.flat, veinA: .4 });
    }
  }
  if (o.umbels !== false) {
    const top = at(1);
    umbel(ctx, top[0], top[1] - 14 * s, 44 * s, { t, seed: sd, dof: o.dof, col: o.flowerCol });
    if (pairs > 3) { const p2 = at(.8); umbel(ctx, p2[0] + 36 * s, p2[1] - 8 * s, 30 * s, { t, seed: sd + 3, dof: o.dof, col: o.flowerCol }); }
  }
  if (o.pods) { const p3 = at(.62); pod(ctx, p3[0] + 6 * s, p3[1], .9 * s, -1.2, { split: o.pods }); }
  return { at, top: at(1) };
}

// ---------------------------------------------------------------- meadow flowers
function coneflower(ctx, x, y, s, o = {}) {
  const t = o.t ?? 0, sd = o.seed ?? 0, H = (o.h ?? 300) * s, sw = Math.sin(t * 1.4 + sd) * 8 * s;
  const head = [x + sw, y - H];
  ctx.save();
  if (o.dof) ctx.filter = `blur(${o.dof}px)`;
  ctx.strokeStyle = rgba(o.stem ?? '#5f8a3e'); ctx.lineWidth = 5 * s; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x, y - H * .5, head[0], head[1]); ctx.stroke();
  const pc = o.col ?? '#d9679b';
  for (let i = 0; i < 13; i++) { // drooping rays
    const a = (i / 13) * Math.PI + Math.PI * .02, dx = Math.cos(a) * 46 * s, dy = 18 * s + Math.sin(a) * 10 * s;
    ctx.fillStyle = rgba(mix(pc, '#7a2550', (i % 2) * .15)); ctx.beginPath();
    ctx.ellipse(head[0] + dx * .55, head[1] + dy * .6, 26 * s, 7 * s, Math.atan2(dy, dx), 0, TAU); ctx.fill();
  }
  const g = ctx.createRadialGradient(head[0] - 6 * s, head[1] - 10 * s, 2, head[0], head[1], 26 * s);
  g.addColorStop(0, '#f2a43a'); g.addColorStop(.6, '#c8601c'); g.addColorStop(1, '#7a3412');
  ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(head[0], head[1], 24 * s, 20 * s, 0, 0, TAU); ctx.fill();
  ctx.restore();
  return head;
}
function goldenrod(ctx, x, y, s, o = {}) {
  const t = o.t ?? 0, sd = o.seed ?? 0, H = (o.h ?? 330) * s, r = rng(sd + 11);
  ctx.save(); if (o.dof) ctx.filter = `blur(${o.dof}px)`;
  const sw = (u) => Math.sin(t * 1.2 + sd) * 10 * s * u * u;
  ctx.strokeStyle = rgba('#6b8f3f'); ctx.lineWidth = 4 * s; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x, y - H * .6, x + sw(1), y - H); ctx.stroke();
  // arching plumes of tiny yellow flowers
  for (let b = 0; b < 6; b++) {
    const u0 = .62 + b * .06, bx = x + sw(u0), by = y - H * u0, dir = b % 2 ? 1 : -1, len = (70 - b * 7) * s;
    for (let i = 0; i < 16; i++) {
      const u = i / 15, px = bx + dir * len * u, py = by - len * .5 * Math.sin(u * 1.6) + len * .25 * u * u;
      D.dot(ctx, px + (r() - .5) * 6 * s, py + (r() - .5) * 6 * s, (4.5 - u * 2) * s, r() < .5 ? '#f6c933' : '#e2a51c', o.a ?? 1);
    }
  }
  ctx.restore();
}
function daisy(ctx, x, y, s, o = {}) {
  ctx.save(); if (o.dof) ctx.filter = `blur(${o.dof}px)`;
  const t = o.t ?? 0, H = (o.h ?? 160) * s, hx = x + Math.sin(t * 1.5 + (o.seed ?? 0)) * 6 * s;
  ctx.strokeStyle = rgba('#6a9a40'); ctx.lineWidth = 3 * s; ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x, y - H * .5, hx, y - H); ctx.stroke();
  ctx.fillStyle = rgba(o.col ?? '#fffaf0');
  for (let i = 0; i < 12; i++) { const a = i * TAU / 12; ctx.beginPath(); ctx.ellipse(hx + Math.cos(a) * 12 * s, y - H + Math.sin(a) * 9 * s, 10 * s, 3.6 * s, a, 0, TAU); ctx.fill(); }
  D.dot(ctx, hx, y - H, 6 * s, '#f2b02a');
  ctx.restore();
}
function blazingStar(ctx, x, y, s, o = {}) {
  ctx.save(); if (o.dof) ctx.filter = `blur(${o.dof}px)`;
  const t = o.t ?? 0, H = (o.h ?? 300) * s, r = rng((o.seed ?? 0) + 3), sw = Math.sin(t * 1.3 + (o.seed ?? 0)) * 8 * s;
  ctx.strokeStyle = rgba('#5d8a3a'); ctx.lineWidth = 4 * s; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + sw, y - H); ctx.stroke();
  for (let i = 0; i < 40; i++) { const u = .55 + .45 * i / 40; D.dot(ctx, x + sw * u + (r() - .5) * 14 * s, y - H * u, (6 - u * 3) * s, r() < .5 ? '#a05ac8' : '#8a3fb4', o.a ?? 1); }
  ctx.restore();
}
function grass(ctx, x0, x1, y, t, o = {}) {
  const r = rng(o.seed ?? 3), n = Math.floor((x1 - x0) / (o.gap ?? 14));
  ctx.save(); if (o.dof) ctx.filter = `blur(${o.dof}px)`;
  for (let i = 0; i < n; i++) {
    const x = x0 + (i + r()) * (o.gap ?? 14), h = (o.h ?? 34) * (.5 + r()), lean = (r() - .5) * .5 + Math.sin(t * 1.8 + x * .01) * .12 * (o.wind ?? 1);
    const c = o.cols ? o.cols[Math.floor(r() * o.cols.length)] : (r() < .5 ? PAL.grass : PAL.grassDark);
    const pts = D.bez([x, y], [x + lean * h * .2, y - h * .5], [x + lean * h * .6, y - h * .8], [x + lean * h, y - h], 6);
    D.ribbon(ctx, pts, o.w ?? 5, 1, false); ctx.fillStyle = rgba(c, o.a ?? 1); ctx.fill();
  }
  ctx.restore();
}

module.exports = { leaf, leafPts, leafAt, bitePath, stem, umbel, pod, seed, milkweed, coneflower, goldenrod, daisy, blazingStar, grass };
