// Twig cut-away used by the egg-laying inset, the full-screen egg time-lapse and the hatch.
const { C, W, H, S, TAU, clamp, lerp, ss, io3, out3, back, rgba, mix, rng, noise, fbm, fbm2, hash } = require('./core');
const G = require('./gfx');
const Z = require('./cicada');

// pocket centre-line (twig-local units, y down)
const PATH = [[-352, -262], [-320, -190], [-230, -100], [-110, -62], [60, -42], [250, -28], [450, -10], [700, 8], [980, 20]];
// pre-sampled by arclength
const SAMP = (() => {
  const pts = [];
  for (let i = 0; i < PATH.length - 1; i++) {
    const p0 = PATH[Math.max(0, i - 1)], p1 = PATH[i], p2 = PATH[i + 1], p3 = PATH[Math.min(PATH.length - 1, i + 2)];
    for (let k = 0; k < 24; k++) {
      const u = k / 24;
      const cr = (a, b, c, d) => .5 * ((2 * b) + (-a + c) * u + (2 * a - 5 * b + 4 * c - d) * u * u + (-a + 3 * b - 3 * c + d) * u * u * u);
      pts.push([cr(p0[0], p1[0], p2[0], p3[0]), cr(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  pts.push(PATH[PATH.length - 1]);
  const acc = [0];
  for (let i = 1; i < pts.length; i++) acc.push(acc[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  return { pts, acc, len: acc[acc.length - 1] };
})();
function at(u) {
  const { pts, acc, len } = SAMP;
  u = clamp(u, 0, len);
  let lo = 0, hi = acc.length - 1;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (acc[m] <= u) lo = m; else hi = m; }
  const f = (u - acc[lo]) / (acc[hi] - acc[lo] || 1);
  const x = lerp(pts[lo][0], pts[hi][0], f), y = lerp(pts[lo][1], pts[hi][1], f);
  const dx = pts[hi][0] - pts[lo][0], dy = pts[hi][1] - pts[lo][1], d = Math.hypot(dx, dy) || 1;
  return { x, y, tx: dx / d, ty: dy / d, ang: Math.atan2(dy, dx) };
}
const EGG_U0 = 120, EGG_DU = 40, EGG_N = 14;
function eggSlot(n) {
  const p = at(EGG_U0 + n * EGG_DU), nx = -p.ty, ny = p.tx, off = (n % 2 ? 1 : -1) * 19;
  return { x: p.x + nx * off, y: p.y + ny * off, ang: p.ang + (n % 2 ? .06 : -.05), u: EGG_U0 + n * EGG_DU };
}

function twigTexture() {
  return G.cached('twig', 2400, 480, (c, w, h) => {
    const R = rng(31);
    const cy = h / 2;
    // layers (distances from centre)
    const layers = [[0, 205, '#2a1a10'], [0, 188, '#4a3322'], [0, 163, '#7b9a55'], [0, 148, '#c9c58b'], [0, 62, '#e6d3a1'], [0, 60, '#cfb98a']];
    c.fillStyle = '#e2cf9c'; c.fillRect(0, 0, w, h);
    // from outside in
    const band = (y0, y1, col) => { c.fillStyle = col; c.fillRect(0, cy + y0, w, y1 - y0); c.fillRect(0, cy - y1, w, y1 - y0); };
    band(188, 240, '#1c110a'); band(160, 192, '#4b3424'); band(142, 164, '#6f9650'); band(118, 146, '#cfd49a'); band(60, 122, '#dcc690');
    const pg = c.createLinearGradient(0, cy - 70, 0, cy + 70); pg.addColorStop(0, '#d8c08b'); pg.addColorStop(.5, '#efe2bb'); pg.addColorStop(1, '#d8c08b'); c.fillStyle = pg; c.fillRect(0, cy - 62, w, 124);
    // growth rings/grain lines
    for (let i = 0; i < 220; i++) {
      const y = cy + (R() - .5) * 250, side = y < cy ? -1 : 1, d = Math.abs(y - cy);
      if (d < 60 || d > 150) continue;
      c.strokeStyle = rgba('#8a6a3a', .06 + R() * .18); c.lineWidth = .6 + R() * 1.8;
      c.beginPath(); const x0 = R() * w; for (let k = 0; k <= 10; k++) { const xx = x0 + k * 100; c.lineTo(xx, y + fbm(xx * .004 + i, 2) * 6); } c.stroke();
    }
    // pith cells
    for (let i = 0; i < 1200; i++) { c.fillStyle = rgba(R() < .5 ? '#ffffff' : '#8f7140', .1 + R() * .15); c.beginPath(); c.arc(R() * w, cy + (R() - .5) * 120, 1.5 + R() * 5, 0, TAU); c.fill(); }
    // bark fibres
    for (let i = 0; i < 400; i++) { const side = R() < .5 ? -1 : 1; const y = cy + side * (170 + R() * 40); c.strokeStyle = rgba(R() < .5 ? '#000000' : '#8a6a4a', .12 + R() * .3); c.lineWidth = .8 + R() * 2.4; c.beginPath(); const x0 = R() * w; for (let k = 0; k <= 5; k++) c.lineTo(x0 + k * 40, y + fbm(x0 + k, 2) * 6); c.stroke(); }
    // lenticels
    for (let i = 0; i < 30; i++) { const side = R() < .5 ? -1 : 1; c.fillStyle = rgba('#e8d6b0', .6); c.beginPath(); c.ellipse(R() * w, cy + side * (196 + R() * 6), 10 + R() * 14, 3.2, 0, 0, TAU); c.fill(); }
    // shading across
    const sg = c.createLinearGradient(0, cy - 240, 0, cy + 240); sg.addColorStop(0, 'rgba(0,0,0,.28)'); sg.addColorStop(.25, 'rgba(0,0,0,0)'); sg.addColorStop(.75, 'rgba(0,0,0,0)'); sg.addColorStop(1, 'rgba(0,0,0,.34)'); c.fillStyle = sg; c.fillRect(0, 0, w, h);
  });
}

function stroke(ctx, upto, widthF = 1, from = 0) {
  const { pts, acc } = SAMP;
  ctx.beginPath();
  let started = false;
  for (let i = 0; i < pts.length; i++) {
    if (acc[i] < from) continue;
    if (acc[i] > upto) { const f = (upto - acc[i - 1]) / (acc[i] - acc[i - 1] || 1); ctx.lineTo(lerp(pts[i - 1][0], pts[i][0], f), lerp(pts[i - 1][1], pts[i][1], f)); break; }
    if (!started) { ctx.moveTo(pts[i][0], pts[i][1]); started = true; } else ctx.lineTo(pts[i][0], pts[i][1]);
  }
}

// o: { cx, cy, s, r (clip radius or 0), ox, oy, reveal (arclength of dug pocket), blade (tip arclength or -1), bladeShake, eggs: [{u: progress 0..1 laid, dev, hatch, th}], t, nymphs: [{u: arclength from pocket start (neg = outside), ...}], tint }
function draw(ctx, o) {
  const { cx, cy, s, r = 0, ox = 100, oy = -60, reveal = 0, blade = -1, bladeShake = 0, eggs = [], t = 0, nymphs = [], tint = null, ringA = 1, pop = null } = o;
  ctx.save();
  if (r > 0) { ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.clip(); }
  ctx.translate(cx, cy); ctx.scale(s, s); ctx.translate(-ox, -oy);
  const tx = twigTexture();
  // twig body
  const half = 1500;
  ctx.drawImage(tx, -1200, -240, 2400, 480);
  ctx.fillStyle = '#e2cf9c'; // extend plain ends
  // pocket
  if (reveal > 0) {
    ctx.save();
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    // splintered wood rim
    stroke(ctx, reveal); ctx.strokeStyle = '#8b6a3c'; ctx.lineWidth = 104; ctx.stroke();
    stroke(ctx, reveal); ctx.strokeStyle = '#c4a468'; ctx.lineWidth = 96; ctx.stroke();
    const dg = ctx.createLinearGradient(0, -120, 0, 80);
    stroke(ctx, reveal); ctx.strokeStyle = '#2a170c'; ctx.lineWidth = 84; ctx.stroke();
    stroke(ctx, reveal); ctx.strokeStyle = '#3c2413'; ctx.lineWidth = 70; ctx.stroke();
    stroke(ctx, reveal); ctx.strokeStyle = 'rgba(255,225,170,.08)'; ctx.lineWidth = 22; ctx.translate(0, -12); ctx.stroke();
    ctx.restore();
    // wood chips around entry
    const R = rng(5);
    for (let i = 0; i < 26; i++) { const u = R() * Math.min(reveal, 900), p = at(u), nx = -p.ty, ny = p.tx, off = (R() < .5 ? -1 : 1) * (40 + R() * 10); ctx.fillStyle = rgba('#d9bd82', .8); ctx.save(); ctx.translate(p.x + nx * off, p.y + ny * off); ctx.rotate(R() * 3); ctx.fillRect(-9, -2, 18 + R() * 8, 3.4); ctx.restore(); }
  }
  // eggs
  for (let n = 0; n < eggs.length; n++) {
    const e = eggs[n];
    if (!e || e.u <= 0) continue;
    const slot = eggSlot(n);
    const k = out3(e.u);
    const eu = lerp(0, slot.u, k);
    const base = at(eu), nx = -base.ty, ny = base.tx;
    let ex = lerp(base.x, slot.x, k), ey = lerp(base.y, slot.y, k), ea = lerp(base.ang, slot.ang, k);
    const hatch = e.hatch || 0;
    if (e.gone) continue;
    const sc = .74 * (e.u < 1 ? lerp(.55, 1, k) : 1);
    if (hatch > 0) {
      // husk: split at the head, collapses once the nymph is out
      const hk = ss(.45, 1, hatch);
      Z.egg(ctx, { x: ex, y: ey, sc, rot: ea, dev: 1, glowA: 1, alpha: 1 - hk * .55, crack: hatch });
      ctx.save(); ctx.translate(ex, ey); ctx.rotate(ea);
      ctx.strokeStyle = 'rgba(70,40,20,.8)'; ctx.lineWidth = 2; const cl = clamp(hatch * 3) * 22 * sc;
      ctx.beginPath(); ctx.moveTo(60 * sc, -9 * sc); ctx.lineTo(60 * sc - cl * .4, -3 * sc); ctx.lineTo(60 * sc, 2 * sc); ctx.lineTo(60 * sc - cl * .6, 7 * sc); ctx.stroke();
      ctx.restore();
    } else Z.egg(ctx, { x: ex, y: ey, sc, rot: ea, dev: e.dev == null ? 0 : e.dev, glowA: .5 + .5 * Math.sin(t * 5 + n), alpha: 1 });
    if (e.pop && e.pop > 0) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; G.glow(ctx, ex, ey, 110 * e.pop + 40, '#ffe2a0', .55 * (1 - e.pop)); ctx.restore(); }
  }
  // ovipositor blade
  if (blade >= 0) {
    const p = at(Math.max(0, blade + bladeShake)), q0 = at(0);
    // from far outside (upper-left, along entry direction) to tip
    const ox2 = q0.x - 360, oy2 = q0.y - 280;
    ctx.save();
    ctx.lineCap = 'round';
    const pts = [[ox2, oy2], [q0.x - 40, q0.y - 20]];
    ctx.beginPath(); ctx.moveTo(ox2, oy2); ctx.lineTo(q0.x, q0.y);
    const along = Math.max(0, blade + bladeShake);
    for (let u = 0; u <= along; u += 30) { const pp = at(u); ctx.lineTo(pp.x, pp.y); }
    ctx.lineTo(p.x, p.y);
    ctx.strokeStyle = '#3a1d0a'; ctx.lineWidth = 30; ctx.stroke();
    ctx.strokeStyle = '#c47a2c'; ctx.lineWidth = 22; ctx.stroke();
    ctx.strokeStyle = 'rgba(255,230,170,.7)'; ctx.lineWidth = 6; ctx.translate(-3, -5); ctx.stroke();
    ctx.restore();
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; G.glow(ctx, p.x, p.y, 70, '#ffc27a', .35); ctx.restore();
  }
  // nymphs (hatchlings)
  for (const n of nymphs) Z.nymph(ctx, n);
  ctx.restore();

  if (r > 0 && r < 700) {
    // lens ring
    ctx.save();
    ctx.strokeStyle = `rgba(255,236,200,${.9 * ringA})`; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.stroke();
    ctx.strokeStyle = `rgba(0,0,0,${.4 * ringA})`; ctx.lineWidth = 12; ctx.beginPath(); ctx.arc(cx, cy, r + 8, 0, TAU); ctx.stroke();
    const rg = ctx.createRadialGradient(cx, cy, r * .75, cx, cy, r); rg.addColorStop(0, 'rgba(0,0,0,0)'); rg.addColorStop(1, 'rgba(0,0,0,.45)');
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.fillStyle = rg; ctx.fill();
    ctx.restore();
  }
}

module.exports = { draw, at, eggSlot, SAMP, EGG_N };
