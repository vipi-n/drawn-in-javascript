// The world: evening sky + meadow surface, the soil cross-section (cached, two screens deep), carved chambers and
// tunnels, grass, crumbs, dust.
const { C, W, H, TAU, clamp, lerp, ss, rgba, mix, rng, noise, noise2, fbm2, hash } = require('./core');
const G = require('./gfx');

const SOIL_H = 4200;
let soilCv = null;
// soil column: y = 0 is the surface. topsoil (dark humus) -> sandy loam -> deeper clay; pebbles, roots, grains.
function buildSoil() {
  if (soilCv) return soilCv;
  soilCv = C.createCanvas(W, SOIL_H);
  const c = soilCv.getContext('2d');
  // low-res noise field, upscaled smoothly
  const lw = 270, lh = Math.ceil(SOIL_H / 4), lo = C.createCanvas(lw, lh), lc = lo.getContext('2d'), id = lc.createImageData(lw, lh);
  const layer = (d) => d < 260 ? mix('#3b2617', '#4a311d', d / 260) : d < 1600 ? mix('#5a3d24', '#6b4a2b', (d - 260) / 1340) : mix('#6b4a2b', '#5a3a22', clamp((d - 1600) / 2600));
  for (let y = 0; y < lh; y++) for (let x = 0; x < lw; x++) {
    const d = y * 4, n = fbm2(x * .045, y * .045, 5), n2 = fbm2(x * .012 + 9, y * .02, 3);
    const strata = .5 + .5 * Math.sin(d * .012 + n2 * 4);
    const col = mix(layer(d), n > .1 ? '#7c5a36' : '#2e1d11', Math.abs(n) * .55 + strata * .08);
    const i = (y * lw + x) * 4; id.data[i] = col[0]; id.data[i + 1] = col[1]; id.data[i + 2] = col[2]; id.data[i + 3] = 255;
  }
  lc.putImageData(id, 0, 0);
  c.imageSmoothingEnabled = true; c.drawImage(lo, 0, 0, W, SOIL_H);
  const R = rng(4242);
  // fine grains
  for (let i = 0; i < 26000; i++) {
    const x = R() * W, y = R() * SOIL_H, r = .6 + R() * 1.6, l = R();
    c.fillStyle = l < .5 ? `rgba(20,12,6,${.25 + R() * .3})` : `rgba(230,190,140,${.08 + R() * .15})`;
    c.fillRect(x, y, r, r);
  }
  // pebbles with shading
  for (let i = 0; i < 260; i++) {
    const x = R() * W, y = 40 + R() * (SOIL_H - 40), rx = 4 + Math.pow(R(), 2.5) * 34, ry = rx * (.55 + R() * .35), an = R() * TAU;
    const base = mix('#8a6a48', '#b09070', R());
    c.save(); c.translate(x, y); c.rotate(an);
    c.fillStyle = 'rgba(15,8,4,.5)'; c.beginPath(); c.ellipse(2, 3, rx, ry, 0, 0, TAU); c.fill();
    const g = c.createRadialGradient(-rx * .3, -ry * .4, 1, 0, 0, rx);
    g.addColorStop(0, rgba(mix(base, '#fff0d8', .35), 1)); g.addColorStop(1, rgba(mix(base, '#000', .45), 1));
    c.fillStyle = g; c.beginPath(); c.ellipse(0, 0, rx, ry, 0, 0, TAU); c.fill();
    c.restore();
  }
  // roots: from the surface down, branching
  const root = (x, y, ang, len, w, depth) => {
    let px = x, py = y, a = ang;
    c.strokeStyle = 'rgba(160,120,80,.55)'; c.lineCap = 'round';
    for (let s = 0; s < len; s += 8) {
      a += (R() - .5) * .25; const nx = px + Math.cos(a) * 8, ny = py + Math.sin(a) * 8;
      c.lineWidth = Math.max(.6, w * (1 - s / len)); c.beginPath(); c.moveTo(px, py); c.lineTo(nx, ny); c.stroke();
      c.strokeStyle = 'rgba(200,160,110,.5)';
      if (depth < 3 && R() < .05) root(nx, ny, a + (R() < .5 ? -1 : 1) * (.5 + R() * .6), len * .45, w * .55, depth + 1);
      px = nx; py = ny;
    }
  };
  for (let i = 0; i < 9; i++) root(R() * W, 0, Math.PI / 2 + (R() - .5) * .6, 500 + R() * 800, 6 + R() * 6, 0);
  // top edge darkening (humus) + depth vignette
  const g = c.createLinearGradient(0, 0, 0, 90); g.addColorStop(0, 'rgba(20,12,6,.7)'); g.addColorStop(1, 'rgba(20,12,6,0)');
  c.fillStyle = g; c.fillRect(0, 0, W, 90);
  return soilCv;
}
// draw the soil so that the surface (depth 0) sits at screen y = sy; dim = overall darkness
function soil(ctx, sy, o = {}) {
  const cv = buildSoil(), top = Math.max(0, -sy), y0 = Math.max(0, sy);
  const h = Math.min(H - y0, SOIL_H - top);
  if (h > 0) ctx.drawImage(cv, 0, top, W, h, 0, y0, W, h);
  if (o.dim) { ctx.fillStyle = `rgba(8,5,3,${o.dim})`; ctx.fillRect(0, y0, W, H - y0); }
}

// evening sky above the surface line y; t = clock; k = 0 golden -> 1 dusk
function sky(ctx, y, t, o = {}) {
  const k = o.dusk ?? 0;
  const g = ctx.createLinearGradient(0, Math.min(0, y - 1900), 0, y);
  g.addColorStop(0, rgba(mix('#1b2448', '#120f2a', k), 1)); g.addColorStop(.45, rgba(mix('#6b3f6e', '#3a2550', k), 1));
  g.addColorStop(.78, rgba(mix('#e9825a', '#b0506a', k), 1)); g.addColorStop(1, rgba(mix('#ffcf8a', '#ff9a64', k), 1));
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, Math.max(0, y));
  // sun low on the horizon
  const sx = o.sunX ?? W * .7, sy = y - (o.sunH ?? 120);
  G.glow(ctx, sx, sy, 700, '#ffb067', .5); G.glow(ctx, sx, sy, 220, '#ffe2a8', .8); G.glow(ctx, sx, sy, 70, '#fff6e0', 1);
  // thin clouds
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  const R = rng(12);
  for (let i = 0; i < 9; i++) {
    const cy = y - 300 - R() * 1100, cx = ((R() * W * 1.6 + t * (6 + R() * 10)) % (W * 1.6)) - W * .3, w = 260 + R() * 420;
    G.ellipseGlow(ctx, cx, cy, w, 18 + R() * 20, mix('#ffb88a', '#c78aa8', R()), .18);
  }
  ctx.restore();
  // distant tree line
  ctx.fillStyle = rgba(mix('#3a2132', '#24162a', k), 1);
  ctx.beginPath(); ctx.moveTo(0, y);
  for (let x = 0; x <= W; x += 12) ctx.lineTo(x, y - 60 - 40 * (.5 + .5 * noise(x * .01 + 3)) - 25 * Math.max(0, noise(x * .045 + 1)));
  ctx.lineTo(W, y); ctx.closePath(); ctx.fill();
}

// one grass blade from (x, y) upward: height h, lean, sway clock t
function blade(ctx, x, y, h, lean, t, col, w = 7) {
  const sw = Math.sin(t * 1.3 + x * .02) * .08 + lean;
  const pts = []; for (let i = 0; i <= 6; i++) { const u = i / 6; pts.push([x + Math.sin(sw * u * 2.2) * h * u * .6, y - h * u]); }
  const ws = pts.map((_, i) => w * (1 - i / 6) + .4);
  G.taper(ctx, pts, ws); ctx.fillStyle = col; ctx.fill();
  return pts[6];
}
// meadow strip: grass silhouettes along the surface line y. rim = sunlit edge strength.
function meadow(ctx, y, t, o = {}) {
  const R = rng(o.seed ?? 3), n = o.n ?? 70;
  for (let i = 0; i < n; i++) {
    const x = R() * W, h = (o.h ?? 160) * (.4 + R() * .9), lean = (R() - .5) * .5, z = R();
    blade(ctx, x, y + 4, h * (.6 + z * .6), lean, t, rgba(mix('#1c1410', '#3a2a18', z * .6), 1), 4 + z * 6);
  }
}

// ground surface line with a lit soil edge (for cross-sections under the sky)
function ground(ctx, y, o = {}) {
  ctx.fillStyle = '#2a1a0f'; ctx.fillRect(0, y - 6, W, 14);
  const g = ctx.createLinearGradient(0, y - 8, 0, y + 30); g.addColorStop(0, 'rgba(255,190,120,.35)'); g.addColorStop(1, 'rgba(255,190,120,0)');
  ctx.fillStyle = g; ctx.fillRect(0, y - 8, W, 38);
  // crumbs on top
  const R = rng(o.seed ?? 8);
  for (let i = 0; i < 90; i++) { const x = R() * W, r = 2 + R() * 6; ctx.fillStyle = rgba(mix('#5a3d24', '#9a7650', R()), 1); ctx.beginPath(); ctx.ellipse(x, y - r * .4, r, r * .6, 0, 0, TAU); ctx.fill(); }
}

// a carved chamber at (x, y): rx, ry; light = warm interior light strength
function chamber(ctx, x, y, rx, ry, o = {}) {
  const lit = o.light ?? .6;
  ctx.save();
  // compacted rim
  ctx.fillStyle = 'rgba(150,110,70,.35)'; ctx.beginPath(); ctx.ellipse(x, y, rx + 10, ry + 9, 0, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, TAU);
  const g = ctx.createRadialGradient(x, y + ry * .35, ry * .1, x, y, Math.max(rx, ry) * 1.1);
  g.addColorStop(0, rgba(mix('#3a2414', '#a8703c', lit), 1)); g.addColorStop(.7, rgba(mix('#1a0f08', '#4a2c16', lit), 1)); g.addColorStop(1, '#0c0704');
  ctx.fillStyle = g; ctx.fill();
  // inner shadow at the top, a little floor of crumbs
  ctx.save(); ctx.clip();
  const sg = ctx.createLinearGradient(0, y - ry, 0, y); sg.addColorStop(0, 'rgba(0,0,0,.6)'); sg.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = sg; ctx.fillRect(x - rx, y - ry, rx * 2, ry);
  const R = rng(o.seed ?? (x | 0));
  for (let i = 0; i < rx / 6; i++) { const px = x + (R() - .5) * rx * 1.7, py = y + ry * (.72 + R() * .25), r = 1.5 + R() * 4; ctx.fillStyle = rgba(mix('#6b4a2b', '#c49a66', R() * lit), .9); ctx.beginPath(); ctx.ellipse(px, py, r, r * .6, 0, 0, TAU); ctx.fill(); }
  if (lit > 0) G.ellipseGlow(ctx, x, y + ry * .45, rx * .9, ry * .45, '#ffb066', .25 * lit);
  ctx.restore();
  ctx.strokeStyle = `rgba(230,180,120,${.3 + .2 * lit})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, Math.PI * .05, Math.PI * .95); ctx.stroke();
  ctx.restore();
}
// tunnel along points: width w
function tunnel(ctx, pts, w, o = {}) {
  ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.strokeStyle = 'rgba(150,110,70,.3)'; ctx.lineWidth = w + 16; ctx.beginPath(); G.curve(ctx, pts); ctx.stroke();
  ctx.strokeStyle = '#120a05'; ctx.lineWidth = w; ctx.beginPath(); G.curve(ctx, pts); ctx.stroke();
  ctx.strokeStyle = `rgba(110,70,40,${o.light ?? .5})`; ctx.lineWidth = w * .45; ctx.beginPath(); G.curve(ctx, pts.map(([x, y]) => [x, y + w * .22])); ctx.stroke();
  ctx.restore();
}

// warm floating dust in the nest
function dust(ctx, t, n = 40, o = {}) { G.motes(ctx, t, n, { color: o.color ?? '#ffd8a0', seed: o.seed ?? 9, size: o.size ?? 1, a: o.a ?? .35, drift: o.drift ?? [4, -3], ...o }); }

module.exports = { buildSoil, soil, SOIL_H, sky, blade, meadow, ground, chamber, tunnel, dust };
