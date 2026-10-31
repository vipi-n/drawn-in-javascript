// Painted sprites built once per process: broadleaf trees (several shapes x summer/spring/autumn palettes), oyamel firs
// (bare, hung with clustered monarchs, and the same clusters with wings opening), a close sagging fir branch draped
// with hundreds of real rig butterflies, and soft shaded cloud sprites. Each has a pre-blurred twin for depth of field.
const { C, TAU, clamp, lerp, hash, noise1, rgba, mix, rng } = require('./core');

const SPR = {};
const canvas = (w, h) => { const c = C.createCanvas(w, h); return [c, c.getContext('2d')]; };
function blurred(src, px) { const [c, g] = canvas(src.width, src.height); g.filter = `blur(${px}px)`; g.drawImage(src, 0, 0); return c; }

// ---------------------------------------------------------------- broadleaf trees
const PAL = {
  summer: { dark: '#1b3620', mid: '#356a31', light: '#76aa48', tex: ['#22442a', '#386f33', '#4f8a3c', '#6aa646', '#8cc45a', '#a8d86c'], bark: '#3e2c22', barkL: '#6e5442' },
  spring: { dark: '#24502a', mid: '#4a8a36', light: '#98c95a', tex: ['#2c5a2c', '#4a8a36', '#68a846', '#88c252', '#a8d868', '#c4e682'], bark: '#4a3628', barkL: '#7a5e48' },
  red: { dark: '#4e1210', mid: '#a62e1a', light: '#ee6a34', tex: ['#5a1610', '#8a2416', '#b8381c', '#dc5426', '#f27c3a', '#ffa456'], bark: '#3a2822', barkL: '#6a5040' },
  orange: { dark: '#5e2a0e', mid: '#c0601a', light: '#ffa846', tex: ['#6a3010', '#9a4a16', '#cc6a1e', '#ec8a2a', '#ffaa44', '#ffc868'], bark: '#3a2a22', barkL: '#6a5040' },
  yellow: { dark: '#5c4810', mid: '#bf9a26', light: '#ffe070', tex: ['#6a5212', '#9a7a1c', '#c9a02a', '#e8c040', '#ffdc5a', '#fff08a'], bark: '#3e3024', barkL: '#6e5a44' },
  mixed: { dark: '#36461a', mid: '#82922e', light: '#d6bc4c', tex: ['#3e5020', '#6a7c28', '#a0a434', '#d0b844', '#e88e36', '#f0b04c'], bark: '#3e2e24', barkL: '#6e5844' },
};
const SHAPE = {
  oak: { trunk: .26, spread: .52, depth: 4, shrink: .7, clump: 54, lean: .1, clear: .2 },
  tall: { trunk: .2, spread: .26, depth: 5, shrink: .74, clump: 40, lean: .04, clear: .16 },
  bush: { trunk: .1, spread: .7, depth: 3, shrink: .68, clump: 60, lean: .14, clear: .05 },
};
function leafyBlob(g, x, y, R, r, bumps = 14) { // a cloud-like clump outline with scalloped leafy edges
  const pts = [];
  for (let k = 0; k < bumps; k++) { const a = TAU * k / bumps + r() * .2, rr = R * (.84 + r() * .26); pts.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr]); }
  g.moveTo((pts[0][0] + pts[bumps - 1][0]) / 2, (pts[0][1] + pts[bumps - 1][1]) / 2);
  for (let k = 0; k < bumps; k++) {
    const p = pts[k], q = pts[(k + 1) % bumps], mx = (p[0] + q[0]) / 2, my = (p[1] + q[1]) / 2;
    const ox = (p[0] - x) * .22, oy = (p[1] - y) * .22; // bulge each scallop outward
    g.quadraticCurveTo(p[0] + ox, p[1] + oy, mx, my);
  }
  g.closePath();
}
function broadleaf(seed, palName, shapeName) {
  const pal = PAL[palName], S = SHAPE[shapeName], r = rng(seed);
  const Wc = 600, Hc = 640, [cv, g] = canvas(Wc, Hc), bx = Wc / 2, by = Hc - 8;
  const segs = [], tips = [];
  const branch = (x, y, ang, len, w, d) => {
    const x2 = x + Math.cos(ang) * len, y2 = y + Math.sin(ang) * len;
    segs.push([x, y, x2, y2, w, d]);
    if (d >= S.depth) { tips.push([x2, y2, d]); return; }
    const n = d === 0 ? 3 : (r() < .45 ? 3 : 2);
    for (let k = 0; k < n; k++) {
      let a = ang + (k - (n - 1) / 2) * S.spread * (.75 + r() * .5) + (r() - .5) * .25;
      a = lerp(a, -Math.PI / 2, .12 * d); // keep the crown reaching up
      branch(x2, y2, a, len * (S.shrink + r() * .12), w * .64, d + 1);
    }
    if (d >= 2) tips.push([lerp(x, x2, .6), lerp(y, y2, .6), d]);
  };
  branch(bx, by, -Math.PI / 2 + (r() - .5) * S.lean, Hc * S.trunk, Wc * .066, 0);
  // fit into the canvas
  let minX = 1e9, maxX = -1e9, minY = 1e9;
  for (const [x, y] of tips) { minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); }
  const pad = S.clump * 1.25, k = Math.min(1, (Wc / 2 - pad) / Math.max(bx - minX, maxX - bx), (by - pad - 10) / (by - minY));
  const T = (x, y) => [bx + (x - bx) * k, by + (y - by) * k];
  // bark: trunk and limbs (the foliage covers most of them)
  g.lineCap = 'round';
  for (const [x1, y1, x2, y2, w, d] of segs) {
    const [a, b] = T(x1, y1), [c, e] = T(x2, y2);
    g.strokeStyle = pal.bark; g.lineWidth = Math.max(1.5, w * k); g.beginPath(); g.moveTo(a, b); g.lineTo(c, e); g.stroke();
    if (d < 2) { g.strokeStyle = rgba(pal.barkL, .7); g.lineWidth = Math.max(1, w * k * .3); g.beginPath(); g.moveTo(a - w * k * .22, b); g.lineTo(c - w * k * .22, e); g.stroke(); }
  }
  // foliage clumps around the tips
  const cl = [];
  for (const [x, y, d] of tips) {
    const [px, py] = T(x, y), R = S.clump * k * (.85 + r() * .5) * (d >= S.depth ? 1.12 : .9);
    cl.push([px, py, R]);
    if (r() < .6) cl.push([px + (r() - .5) * R, py + (r() - .5) * R * .8, R * (.6 + r() * .3)]);
  }
  let cx = 0, cy = 0; for (const [x, y] of cl) { cx += x; cy += y; } cx /= cl.length; cy /= cl.length;
  // filler clumps so the crown reads as one full mass
  let sx = 0, sy = 0; for (const [x, y] of cl) { sx += (x - cx) ** 2; sy += (y - cy) ** 2; }
  const ex = Math.sqrt(sx / cl.length), ey = Math.sqrt(sy / cl.length);
  for (let i = 0; i < 7; i++) { const a = r() * TAU, d = Math.sqrt(r()) * .8; cl.push([cx + Math.cos(a) * ex * d, cy + Math.sin(a) * ey * d, S.clump * k * (1 + r() * .4)]); }
  // a full rounded skirt of foliage down to the shape's clearance, hiding the fork (no lollipop / umbrella crowns)
  let x0 = 1e9, x1 = -1e9, y1 = -1e9, top = 1e9;
  for (const [x, y, R] of cl) { x0 = Math.min(x0, x - R); x1 = Math.max(x1, x + R); y1 = Math.max(y1, y + R); top = Math.min(top, y - R); }
  const want = by - (by - top) * S.clear, hw0 = (x1 - x0) / 2 * .92, mx = (x0 + x1) / 2, R0 = S.clump * k * .8, cyc = (top + want) / 2, ry = want - cyc;
  // scatter (not rows, which read as stacked tiers) clumps through the lower half of the crown ellipse
  const need = Math.ceil(Math.PI * hw0 * ry / 2 / (R0 * R0 * 1.1));
  for (let i = 0, added = 0; i < need * 6 && added < need; i++) {
    const x = mx + (r() * 2 - 1) * hw0, y = cyc + r() * ry;
    if (((x - mx) / hw0) ** 2 + ((y - cyc) / ry) ** 2 > .8) continue;
    cl.push([x, y, R0 * (.7 + r() * .6)]); added++;
  }
  // the crown as one lit volume: light from the upper left over the whole ellipse, only a little per clump
  let X0 = 1e9, X1 = -1e9, Y0 = 1e9, Y1 = -1e9;
  for (const [x, y, R] of cl) { X0 = Math.min(X0, x - R); X1 = Math.max(X1, x + R); Y0 = Math.min(Y0, y - R); Y1 = Math.max(Y1, y + R); }
  const ccx = (X0 + X1) / 2, ccy = (Y0 + Y1) / 2, hx = (X1 - X0) / 2, hy = (Y1 - Y0) / 2;
  const glob = (x, y) => -(x - ccx) / hx * .32 - (y - ccy) / hy * .5;
  // pass 1: the whole crown in shadow colour
  g.fillStyle = pal.dark; g.beginPath(); for (const [x, y, R] of cl) leafyBlob(g, x, y, R, r); g.fill();
  // pass 2/3: mid and light clumps where the crown faces the light
  cl.sort((a, b) => b[1] - a[1]);
  for (const [x, y, R] of cl) {
    const gl = clamp(.5 + glob(x, y));
    g.fillStyle = rgba(pal.mid, .25 + .7 * gl); g.beginPath(); leafyBlob(g, x - R * .08, y - R * .12, R * .84, r, 12); g.fill();
    if (gl > .45) { g.fillStyle = rgba(pal.light, (gl - .45) * 1.3); g.beginPath(); leafyBlob(g, x - R * .26, y - R * .3, R * .5, r, 10); g.fill(); }
  }
  // leaf dabs
  for (const [x, y, R] of cl) {
    for (let j = 0; j < 46; j++) {
      const a = r() * TAU, d = Math.sqrt(r()) * R * 1.02, px = x + Math.cos(a) * d, py = y + Math.sin(a) * d;
      const lit = clamp(.5 + glob(px, py) * 1.1 - Math.cos(a) * (d / R) * .14 - Math.sin(a) * (d / R) * .18 + (r() - .5) * .35);
      g.fillStyle = rgba(pal.tex[Math.min(5, Math.floor(lit * 6))], .9);
      g.save(); g.translate(px, py); g.rotate(r() * TAU); g.beginPath(); g.ellipse(0, 0, 2.6 + r() * 3.6, 1.4 + r() * 1.8, 0, 0, TAU); g.fill(); g.restore();
    }
  }
  // a few branches showing through gaps, then soft occlusion under the crown
  g.strokeStyle = rgba(pal.bark, .3);
  for (const [x1, y1, x2, y2, w, d] of segs) if (d >= 2 && d <= 3 && r() < .14) { const [a, b] = T(x1, y1), [c, e] = T(x2, y2); g.lineWidth = Math.max(1, w * k * .8); g.beginPath(); g.moveTo(a, b); g.lineTo(lerp(a, c, .7), lerp(b, e, .7)); g.stroke(); }
  g.save(); g.globalCompositeOperation = 'source-atop';
  const og = g.createLinearGradient(0, ccy - hy * .2, 0, Y1); og.addColorStop(.6, rgba(pal.dark, .25)); og.addColorStop(0, 'rgba(0,0,0,0)'); og.addColorStop(1, rgba(pal.dark, .55));
  g.fillStyle = og; g.fillRect(0, 0, Wc, Hc);
  g.restore();
  return { cv, w: Wc, h: Hc, base: [bx, by] };
}

// a continuous hedgerow along a polyline (base points); h = height in px
function hedge(g, pts, palName, sd, h = 14) {
  const pal = PAL[palName], r = rng(sd), P = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, ay] = pts[i], [bx, by] = pts[i + 1], n = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) / (h * .4)));
    for (let k = 0; k < n; k++) {
      const u = k / n, x = lerp(ax, bx, u), y = lerp(ay, by, u), gap = noise1(x * .006 + y * .004, sd + 3);
      if (gap < -.38) continue; // gaps (gateways, thin stretches)
      P.push([x, y, h * (.45 + .75 * (.5 + .5 * noise1(x * .018 + y * .01, sd))) * (.8 + r() * .4) * clamp((gap + .38) * 4, .35, 1)]);
    }
  }
  g.fillStyle = rgba(pal.dark, .3);
  for (const [x, y, R] of P) { g.beginPath(); g.ellipse(x + R * .5, y + R * .1, R * 1.2, R * .32, 0, 0, TAU); g.fill(); }
  g.fillStyle = pal.dark;
  for (const [x, y, R] of P) { g.beginPath(); g.arc(x, y - R * .6, R, 0, TAU); g.fill(); }
  g.fillStyle = rgba(pal.mid, .9);
  for (const [x, y, R] of P) { g.beginPath(); g.arc(x - R * .15, y - R * .85, R * .74, 0, TAU); g.fill(); }
  for (const [x, y, R] of P) for (let j = 0; j < 4; j++) {
    const a = r() * TAU, d = Math.sqrt(r()) * R * .95, px = x + Math.cos(a) * d, py = y - R * .7 + Math.sin(a) * d * .9;
    g.fillStyle = pal.tex[Math.min(5, Math.floor(clamp(.62 - (py - y + R * 1.6) / (R * 2.2) * .9 + (r() - .5) * .4) * 6))];
    g.beginPath(); g.ellipse(px, py, 1.5 + r() * 2, .9 + r(), r() * TAU, 0, TAU); g.fill();
  }
}

// ---------------------------------------------------------------- oyamel fir (Abies religiosa)
const FIR = { dark: '#122c28', core: '#0c1f1c', mid: '#24503f', lit: '#3a6e58', light: '#5f927a', tip: '#86b49a', trunk: '#3a2a22' };
const WING_CLOSED = ['#6e3e1e', '#84481f', '#965424', '#a8622a', '#bc7232', '#cc843c'];
function needleClump(g, x, y, R, ang, r, lit) { // an irregular mass of needles with a fuzzy edge
  g.save(); g.translate(x, y); g.rotate(ang); g.scale(1.35, 1);
  g.fillStyle = FIR.dark; g.beginPath(); leafyBlob(g, 0, 0, R, r, 9); g.fill();
  g.fillStyle = lit > .7 ? FIR.lit : FIR.mid; g.beginPath(); leafyBlob(g, -R * .05, -R * .32, R * .62, r, 8); g.fill();
  g.restore();
  g.lineCap = 'round';
  for (let j = 0; j < 14; j++) { // needles sticking out of the silhouette
    const a = r() * TAU, d0 = R * (.7 + r() * .25), L = 5 + r() * 7;
    const sx = x + Math.cos(a) * d0 * 1.35 * Math.cos(ang) - Math.sin(a) * d0 * Math.sin(ang), sy = y + Math.cos(a) * d0 * 1.35 * Math.sin(ang) + Math.sin(a) * d0 * Math.cos(ang);
    const up = Math.sin(a) < 0;
    g.strokeStyle = rgba(up ? (r() < lit * .6 ? FIR.tip : FIR.light) : FIR.mid, .85); g.lineWidth = 1.5;
    g.beginPath(); g.moveTo(sx, sy); g.lineTo(sx + Math.cos(a + ang) * L, sy + Math.sin(a + ang) * L); g.stroke();
  }
}
// a hanging bunch of roosting monarchs: closed wings, dull undersides, stacked like shingles
function bunch(g, x, y, n, cr, open) {
  for (let k = 0; k < n; k++) {
    const px = x + (cr() - .5) * 7, py = y + k * 5.2 + cr() * 2, s = 5 + cr() * 1.8, rot = (cr() - .5) * .45;
    g.save(); g.translate(px, py); g.rotate(rot);
    g.fillStyle = WING_CLOSED[Math.floor(cr() * WING_CLOSED.length)];
    g.beginPath(); g.moveTo(0, -s * 1.15); g.quadraticCurveTo(s * 1.05, -s * .25, s * .45, s * .95); g.quadraticCurveTo(0, s * 1.3, -s * .45, s * .95); g.quadraticCurveTo(-s * 1.05, -s * .25, 0, -s * 1.15); g.fill();
    g.strokeStyle = 'rgba(25,12,5,.6)'; g.lineWidth = .9; g.beginPath(); g.moveTo(0, -s); g.lineTo(0, s * .85); g.moveTo(s * .1, -s * .3); g.lineTo(s * .55, s * .55); g.stroke();
    g.fillStyle = 'rgba(255,236,205,.3)'; g.beginPath(); g.ellipse(-s * .3, -s * .25, s * .28, s * .45, -.3, 0, TAU); g.fill();
    g.restore();
    if (open > 0) { // basking: orange wings spread on the outside of the bunch (own rng so layouts match across variants)
      const br = rng(Math.floor(px * 31 + py * 17) + 7);
      if (br() >= open * .3) continue;
      const os = 6.5 + br() * 3;
      g.save(); g.translate(px + (br() - .5) * 6, py - 2); g.rotate((br() - .5) * .9);
      for (const sd of [-1, 1]) {
        g.fillStyle = '#1a1210'; g.beginPath(); g.moveTo(0, 0); g.lineTo(sd * os * 1.3, -os * .75); g.lineTo(sd * os * 1.4, os * .35); g.lineTo(sd * os * .5, os * .95); g.closePath(); g.fill();
        g.fillStyle = br() < .5 ? '#f28a1d' : '#ff9a2a'; g.beginPath(); g.moveTo(sd, 0); g.lineTo(sd * os * 1.08, -os * .52); g.lineTo(sd * os * 1.12, os * .22); g.lineTo(sd * os * .52, os * .72); g.closePath(); g.fill();
      }
      g.fillStyle = '#1a1210'; g.fillRect(-.9, -os * .55, 1.8, os * 1.3);
      g.restore();
    }
  }
}
// sd = seed; cover = how heavily the clusters hang; open = fraction basking with orange wings out
function firSprite(sd, cover = 0, open = 0) {
  const r = rng(sd), Wc = 440, Hc = 1000, [cv, g] = canvas(Wc, Hc), cx = Wc / 2, H = Hc - 20;
  g.lineCap = 'round'; g.lineJoin = 'round';
  const tg = g.createLinearGradient(cx - 10, 0, cx + 10, 0); tg.addColorStop(0, '#5a4234'); tg.addColorStop(1, FIR.trunk);
  g.fillStyle = tg; g.beginPath(); g.moveTo(cx - 3, 18); g.lineTo(cx + 3, 18); g.lineTo(cx + 14, Hc); g.lineTo(cx - 14, Hc); g.closePath(); g.fill();
  // a dark core so gaps between tiers read as depth
  g.fillStyle = rgba(FIR.core, .9); g.beginPath(); g.moveTo(cx, 30); g.lineTo(cx + 120, H - 100); g.lineTo(cx - 120, H - 100); g.closePath(); g.fill();
  const tiers = 38, branches = [];
  for (let k = 0; k < tiers; k++) {
    const v = (k + .6) / tiers, y = 26 + v * (H - 110) + (r() - .5) * 10, wd = (14 + 176 * Math.pow(v, .9)) * (.78 + r() * .36);
    for (const s of [-1, 1]) branches.push({ y: y + (r() - .5) * 8, w: wd * (.8 + r() * .3), s, droop: (6 + 24 * v) * 1.7 + r() * 10, v });
  }
  const P = (b, u) => [cx + b.s * b.w * u, b.y - 5 * Math.sin(Math.PI * u * .6) + b.droop * u * u];
  for (const b of branches) {
    const [x1, y1] = P(b, 1);
    g.strokeStyle = '#2a1e18'; g.lineWidth = 2 + 3 * (1 - b.v * .5); g.beginPath(); g.moveTo(cx, b.y); g.quadraticCurveTo(cx + b.s * b.w * .5, b.y - 2, x1, y1); g.stroke();
    const m = 2 + Math.round(b.w / 34);
    for (let i = 0; i <= m; i++) {
      const u = .15 + .85 * i / m, [x, y] = P(b, u), [x2, y2] = P(b, Math.min(1, u + .05));
      needleClump(g, x, y, (10 + 9 * (1 - u)) * (.85 + r() * .35) * (.7 + b.v * .5), Math.atan2(y2 - y, x2 - x), r, b.s < 0 ? .95 : .5);
    }
  }
  if (cover > 0) {
    const cr = rng(sd * 13 + 5);
    for (const b of branches) {
      if (b.v < .14) continue;
      const nb = Math.round(b.w / 11 * cover);
      for (let j = 0; j < nb; j++) {
        const u = .1 + cr() * .8, [x, y] = P(b, u);
        bunch(g, x, y + 7, Math.max(1, Math.round((2 + 7 * (1 - u)) * cover * (.5 + cr()))), cr, open);
      }
    }
  }
  g.strokeStyle = FIR.dark; g.lineWidth = 5; g.beginPath(); g.moveTo(cx, 30); g.lineTo(cx, 6); g.stroke();
  // light from the left, shade on the right
  g.save(); g.globalCompositeOperation = 'source-atop';
  const lg = g.createLinearGradient(cx - 200, 0, cx + 200, 0); lg.addColorStop(0, 'rgba(220,245,235,.14)'); lg.addColorStop(.5, 'rgba(0,0,0,0)'); lg.addColorStop(1, 'rgba(0,10,20,.32)');
  g.fillStyle = lg; g.fillRect(0, 0, Wc, Hc);
  g.restore();
  return { cv, w: Wc, h: Hc, base: [cx, Hc] };
}

// ---------------------------------------------------------------- soft clouds
function cloudSprite(sd) {
  const r = rng(sd), Wc = 640, Hc = 300, [cv, g] = canvas(Wc, Hc), puffs = [];
  const n = 9 + Math.floor(r() * 5);
  for (let i = 0; i < n; i++) { const u = i / (n - 1), x = 90 + u * (Wc - 180) + (r() - .5) * 40, R = (40 + 70 * Math.sin(Math.PI * u) + r() * 30) * .9; puffs.push([x, Hc - 70 - R * .55 + (r() - .5) * 20, R]); }
  for (let i = 0; i < 6; i++) { const p = puffs[1 + Math.floor(r() * (n - 2))]; puffs.push([p[0] + (r() - .5) * 60, p[1] - p[2] * .5, p[2] * .7]); }
  const draw = (col, dx, dy, k) => { g.fillStyle = col; g.beginPath(); for (const [x, y, R] of puffs) { g.moveTo(x + dx + R * k, y + dy); g.arc(x + dx, y + dy, R * k, 0, TAU); } g.fill(); };
  g.filter = 'blur(2px)';
  draw('#b9c4d8', 0, 10, 1);          // shaded base
  draw('#dfe6f0', -4, -2, .92);      // body
  draw('#ffffff', -10, -14, .7);     // lit tops
  g.filter = 'none';
  g.globalCompositeOperation = 'source-atop';
  const fg = g.createLinearGradient(0, 40, 0, Hc); fg.addColorStop(0, 'rgba(255,255,255,0)'); fg.addColorStop(1, 'rgba(120,135,170,.45)');
  g.fillStyle = fg; g.fillRect(0, 0, Wc, Hc);
  return { cv, w: Wc, h: Hc, base: [Wc / 2, Hc] };
}

// ---------------------------------------------------------------- a close, sagging fir branch draped with roosting monarchs
// painted with the real butterfly rig (closed wings, undersides out); open = how many bask with wings spread
function clusterBranch(sd, open = 0) {
  const B = require('./butterfly');
  const r = rng(sd), Wc = 1500, Hc = 640, [cv, g] = canvas(Wc, Hc);
  const sag = (x) => 90 + Math.pow((x - 300) / 1200, 2) * 140 + 18 * Math.sin(x * .004);
  // the branch and its needles
  g.lineCap = 'round';
  g.strokeStyle = '#2e2018'; g.lineWidth = 16; g.beginPath(); for (let x = 0; x <= Wc; x += 30) { if (x) g.lineTo(x, sag(x)); else g.moveTo(x, sag(x)); } g.stroke();
  for (let x = 0; x <= Wc; x += 26) {
    const y = sag(x);
    for (const side of [-1, 1]) {
      const a = Math.atan2(sag(x + 5) - y, 5) + side * (.9 + r() * .4), L = 40 + r() * 26;
      g.strokeStyle = '#3a2a20'; g.lineWidth = 3; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * L * .4, y + Math.sin(a) * L * .4); g.stroke();
      needleClump(g, x + Math.cos(a) * L * .55, y + Math.sin(a) * L * .55, 16 + r() * 8, a, r, side < 0 ? .95 : .6);
    }
  }
  // hanging bunches: chains of butterflies gripping the one above, longer near the middle
  const shots = [];
  for (let x = 40; x < Wc - 40; x += 30 + r() * 26) {
    const n = 2 + Math.round((4 + 4 * Math.sin(Math.PI * x / Wc)) * (.6 + r() * .6));
    for (let k = 0; k < n; k++) shots.push([x + (r() - .5) * 26 + k * (r() - .5) * 6, sag(x) + 34 + k * 30 + r() * 10, r()]);
  }
  shots.sort((a, b) => a[2] - b[2]);
  for (const [x, y, q] of shots) {
    const basking = q < open * .28, sd2 = q < .5 ? -1 : 1;
    if (basking) B.butterfly(g, { x, y, s: .44, yaw: (q - .5) * .6, roll: .25 * sd2, pitch: .2, flap: .25 + q * .4, legs: 1 });
    else B.butterfly(g, { x, y, s: .4 + q * .08, yaw: (q - .5) * .5, roll: sd2 * (Math.PI / 2 - .2 - q * .3), flap: 1.42 + q * .08, legs: 1 });
  }
  return { cv, w: Wc, h: Hc, base: [Wc / 2, Hc], sag };
}

// ---------------------------------------------------------------- lazily built sprite sets
const lazy = (k, fn) => () => SPR[k] || (SPR[k] = fn());
const leaves = lazy('leaf', () => { const o = {}; let sd = 11; for (const p of Object.keys(PAL)) o[p] = ['oak', 'tall', 'bush', 'oak'].map((sh) => { const s = broadleaf(sd++ * 97, p, sh); s.blur = blurred(s.cv, 3); return s; }); return o; });
const firs = lazy('fir', () => [1, 2, 3].map((k) => { const f = { bare: firSprite(k * 31), cover: firSprite(k * 31, 1), open: firSprite(k * 31, 1, 1) }; for (const v of ['bare', 'cover', 'open']) f[v].blur = blurred(f[v].cv, 3); return f; }));
const clouds = lazy('cloud', () => [3, 7, 13, 21].map(cloudSprite));
const clusters = lazy('cluster', () => [0, 1].map((o) => { const s = clusterBranch(77, o); s.blur = blurred(s.cv, 5); return s; }));
function build() { leaves(); clouds(); return SPR; }

// draw a sprite with its base at (x, y), h tall (px in current transform); sway skews the top; filter tints
function drawSprite(ctx, s, x, y, h, o = {}) {
  const k = h / s.h, img = o.blur && s.blur ? s.blur : s.cv;
  ctx.save();
  ctx.translate(x, y);
  if (o.sway) ctx.transform(1, 0, o.sway, 1, 0, 0);
  ctx.scale(k * (o.flip ? -1 : 1), k);
  if (o.alpha !== undefined) ctx.globalAlpha *= o.alpha;
  if (o.filter) ctx.filter = o.filter;
  ctx.drawImage(img, -s.base[0], -s.base[1]);
  ctx.restore();
}
// colour filter for a time of day: darker and bluer at night, warmer at dawn/dusk
function todFilter(dl, wm, extra = '') {
  const b = lerp(.32, 1, dl), sat = lerp(.55, 1, dl), sep = clamp(wm * .35);
  if (b > .995 && sep < .005 && !extra) return undefined;
  return `brightness(${b.toFixed(3)}) saturate(${sat.toFixed(3)}) sepia(${sep.toFixed(3)}) ${extra}`.trim();
}

module.exports = { build, SPR, leaves, firs, clouds, clusters, drawSprite, todFilter, broadleaf, firSprite, cloudSprite, hedge, PAL };
