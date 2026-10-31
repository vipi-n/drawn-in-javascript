// Underground world: soil cross-section, tunnels, roots, surface "window", HUD pieces.
const { C, W, H, S, TAU, clamp, lerp, ss, io3, out3, rgba, mix, ramp, rng, noise, fbm, fbm2, hash, cues } = require('./core');
const G = require('./gfx');
const WD = require('./world');

// world y=0 is the soil surface. camY = world y shown at the screen top.
function soil(ctx, camY, o = {}) {
  const { t = 0, warm = 0, glowX = null } = o;
  const tex = WD.soilTex('soil', 1920, 2600, 11);
  const sy0 = -camY;
  for (let y = sy0; y < H; y += tex.height) if (y + tex.height > 0) ctx.drawImage(tex, 0, y);
  // depth darkening + vignette feel
  const dk = ctx.createLinearGradient(0, sy0, 0, sy0 + 1800);
  dk.addColorStop(0, 'rgba(0,0,0,0)'); dk.addColorStop(.5, 'rgba(8,4,2,.35)'); dk.addColorStop(1, 'rgba(4,2,1,.62)');
  ctx.fillStyle = dk; ctx.fillRect(0, Math.max(0, sy0), W, H);
  if (warm > 0) { const wg = ctx.createLinearGradient(0, sy0, 0, sy0 + 1500); wg.addColorStop(0, `rgba(255,140,60,${.28 * warm})`); wg.addColorStop(1, 'rgba(255,90,30,0)'); ctx.fillStyle = wg; ctx.fillRect(0, Math.max(0, sy0), W, H); }
}

function tunnel(ctx, pts, w, camY, o = {}) {
  const { alpha = 1, light = true } = o;
  ctx.save(); ctx.translate(0, -camY);
  ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.globalAlpha = alpha;
  const path = () => { ctx.beginPath(); G.curve(ctx, pts, false, 1 / 6); };
  path(); ctx.strokeStyle = 'rgba(20,10,4,.55)'; ctx.lineWidth = w + 26; ctx.stroke();
  path(); ctx.strokeStyle = '#0b0603'; ctx.lineWidth = w + 8; ctx.stroke();
  path(); ctx.strokeStyle = '#21140b'; ctx.lineWidth = w; ctx.stroke();
  path(); ctx.strokeStyle = '#2d1c10'; ctx.lineWidth = w * .6; ctx.stroke();
  if (light) { ctx.translate(0, w * .28); path(); ctx.strokeStyle = 'rgba(255,200,140,.07)'; ctx.lineWidth = w * .35; ctx.stroke(); }
  ctx.restore();
}

// a root running along pts; th = thickness; sap 0..1 shows glowing xylem flow
function root(ctx, pts, th, camY, t, o = {}) {
  const { sap = 0, hairs = true, seed = 3, col = '#9a7a52', glowC = '#9affc8' } = o;
  ctx.save(); ctx.translate(0, -camY);
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const path = () => { ctx.beginPath(); G.curve(ctx, pts, false, 1 / 6); };
  path(); ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = th + 16; ctx.stroke();
  path(); ctx.strokeStyle = rgba(mix(col, [30, 16, 6], .6), 1); ctx.lineWidth = th; ctx.stroke();
  path(); ctx.strokeStyle = rgba(mix(col, [40, 20, 8], .25), 1); ctx.lineWidth = th * .82; ctx.stroke();
  path(); ctx.strokeStyle = rgba(col, 1); ctx.lineWidth = th * .55; ctx.stroke();
  ctx.save(); ctx.translate(0, -th * .18); path(); ctx.strokeStyle = 'rgba(255,230,190,.16)'; ctx.lineWidth = th * .16; ctx.stroke(); ctx.restore();
  // bark ridges
  ctx.setLineDash([10, 22]); path(); ctx.strokeStyle = 'rgba(60,30,10,.3)'; ctx.lineWidth = 2; ctx.lineDashOffset = 0; ctx.stroke(); ctx.setLineDash([]);
  if (sap > 0) {
    // xylem channel glow + moving droplets
    path(); ctx.strokeStyle = rgba(glowC, .18 * sap); ctx.lineWidth = th * .38; ctx.stroke();
    ctx.setLineDash([2, 38]); ctx.lineDashOffset = -t * 90; path(); ctx.strokeStyle = rgba('#e6fff0', .85 * sap); ctx.lineWidth = th * .12; ctx.stroke(); ctx.setLineDash([]);
  }
  if (hairs) {
    const R = rng(seed);
    ctx.strokeStyle = rgba('#c9ad80', .38); ctx.lineWidth = 1.3;
    for (let i = 0; i < 70; i++) {
      const f = R() * (pts.length - 1), k = Math.min(pts.length - 2, Math.floor(f)), u = f - k;
      const x = lerp(pts[k][0], pts[k + 1][0], u), y = lerp(pts[k][1], pts[k + 1][1], u), a = R() * TAU, l = 20 + R() * 55;
      ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * th * .4, y + Math.sin(a) * th * .4); ctx.quadraticCurveTo(x + Math.cos(a) * l, y + Math.sin(a) * l + 8, x + Math.cos(a + R() - .5) * l * 1.3, y + Math.sin(a + R() - .5) * l * 1.3 + 14); ctx.stroke();
    }
  }
  ctx.restore();
}

function dust(ctx, t, camY, n = 70, seed = 4, a = .5) {
  const R = rng(seed);
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < n; i++) {
    const wx = R() * W, wy = R() * 3000 - 100, z = .4 + R() * .8;
    const x = (wx + Math.sin(t * .3 + i) * 20) % W, y = ((wy - camY * z) % (H + 100) + H + 100) % (H + 100) - 50 + Math.sin(t * .5 + i * 2) * 8;
    G.glow(ctx, x, y, (3 + R() * 7) * z, '#ffd29a', a * z * (.4 + .6 * Math.abs(Math.sin(t * .7 + i))));
  }
  ctx.restore();
}

function worm(ctx, x0, y0, len, t, camY, ph = 0, col = '#c07d79') {
  ctx.save(); ctx.translate(0, -camY); ctx.lineCap = 'round';
  const pts = [];
  for (let i = 0; i <= 20; i++) { const u = i / 20; pts.push([x0 + u * len, y0 + Math.sin(u * 9 - t * 3 + ph) * 22 * (.4 + u * .6) + Math.sin(u * 3 + ph) * 18]); }
  ctx.beginPath(); G.curve(ctx, pts, false); ctx.strokeStyle = 'rgba(0,0,0,.4)'; ctx.lineWidth = 34; ctx.stroke();
  ctx.strokeStyle = rgba(col, 1); ctx.lineWidth = 28; ctx.stroke();
  ctx.strokeStyle = rgba(mix(col, [255, 220, 210], .35), .55); ctx.lineWidth = 8; ctx.translate(0, -6); ctx.stroke();
  ctx.translate(0, 6);
  ctx.strokeStyle = 'rgba(80,30,30,.35)'; ctx.lineWidth = 2;
  for (let i = 1; i < 20; i++) { const p = pts[i]; ctx.beginPath(); ctx.moveTo(p[0], p[1] - 13); ctx.lineTo(p[0], p[1] + 13); ctx.stroke(); }
  ctx.restore();
}

// ----------------------------------------------------------- seasons "window" (the world above while years pass underground)
function surfaceWindow(ctx, x, y, w, h, yearF, t) {
  // yearF = years elapsed (continuous). Tree grows over 17 years; seasons cycle once per year.
  ctx.save();
  ctx.beginPath(); ctx.roundRect(x, y, w, h, 18); ctx.clip();
  const season = yearF % 1; // 0 spring ..1
  const sp = Math.sin(season * TAU), ca = Math.cos(season * TAU);
  const sCol = (k) => ramp([[0, '#9bd0e8'], [.25, '#5fb0e0'], [.5, '#d9965a'], [.75, '#7f93b8'], [1, '#9bd0e8']], k);
  const skyTop = ramp([[0, '#8fcbea'], [.25, '#4f9fd8'], [.5, '#e2a072'], [.75, '#7d90b8'], [1, '#8fcbea']], season);
  const skyBot = ramp([[0, '#dff2f2'], [.25, '#d6ecf5'], [.5, '#f6c88b'], [.75, '#d7dfee'], [1, '#dff2f2']], season);
  const g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, rgba(skyTop)); g.addColorStop(1, rgba(skyBot)); ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
  // sun
  const sa = season * TAU * 2;
  G.glow(ctx, x + w * .78, y + h * .22 + Math.sin(sa) * 6, h * .5, '#fff1c0', .5);
  // ground
  const gnd = ramp([[0, '#5f9a3c'], [.25, '#4a8a2c'], [.5, '#8a7a3a'], [.75, '#e8eef2'], [1, '#6f9f46']], season);
  const gy = y + h * .78;
  ctx.fillStyle = rgba(gnd); ctx.beginPath(); ctx.moveTo(x, gy + 6); ctx.quadraticCurveTo(x + w * .5, gy - 14, x + w, gy + 4); ctx.lineTo(x + w, y + h); ctx.lineTo(x, y + h); ctx.fill();
  // tree grows
  const gr = clamp(yearF / 17), tH = lerp(.09, .6, Math.pow(gr, .8)) * h, tW = lerp(3, 16, gr) * (w / 360);
  const tx = x + w * .42;
  ctx.fillStyle = '#4a3322'; ctx.beginPath(); ctx.moveTo(tx - tW, gy + 4); ctx.lineTo(tx - tW * .5, gy - tH); ctx.lineTo(tx + tW * .5, gy - tH); ctx.lineTo(tx + tW, gy + 4); ctx.fill();
  const cr = lerp(.05, .34, Math.pow(gr, .75)) * h;
  const leafC = ramp([[0, '#8fcf6a'], [.25, '#3f9a3a'], [.5, '#d9772c'], [.75, '#6b5a4c'], [1, '#8fcf6a']], season);
  const leafAmt = season > .62 ? 1 - ss(.62, .78, season) : season < .12 ? ss(0, .12, season) * .5 + .5 * 0 + .15 : 1;
  const la = season > .66 && season < .96 ? .18 : 1;
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * TAU + .3, rr = cr * (.5 + .5 * hash(i + 4)) ;
    const cx2 = tx + Math.cos(a) * rr * 1.1, cy2 = gy - tH - cr * .15 + Math.sin(a) * rr * .8;
    ctx.fillStyle = rgba(mix(leafC, [255, 255, 255], .05 * (i % 3)), clamp(la * (season > .5 ? 1 : 1)) * .95);
    ctx.beginPath(); ctx.arc(cx2, cy2, cr * (.42 + .1 * hash(i)), 0, TAU); ctx.fill();
  }
  if (season > .7 && season < .98) { // snow caps
    ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.beginPath(); ctx.ellipse(tx, gy - tH - cr * .5, cr * .9, cr * .12, 0, 0, TAU); ctx.fill();
    for (let i = 0; i < 20; i++) { const sx = x + (hash(i) * w + t * 16) % w, sy = y + ((hash(i + 9) * h + t * 70) % h); ctx.fillStyle = 'rgba(255,255,255,.8)'; ctx.fillRect(sx, sy, 2, 2); }
  }
  if (season > .5 && season < .75) for (let i = 0; i < 8; i++) { const lx = x + (hash(i + 30) * w * .6 + w * .15) + Math.sin(t * 2 + i) * 10, ly = y + h * .35 + ((t * 40 + i * 37) % (gy - y - h * .35)); ctx.fillStyle = rgba('#e0782c', .9); ctx.fillRect(lx, ly, 4, 3); }
  ctx.restore();
  ctx.strokeStyle = 'rgba(255,240,215,.7)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect(x, y, w, h, 18); ctx.stroke();
}

function thermometer(ctx, x, y, h, temp, t, a = 1) {
  // temp in C, range 0..22 ; target mark 18
  ctx.save(); ctx.globalAlpha = a;
  const w = 34, r = 30, top = y, bot = y + h;
  ctx.fillStyle = 'rgba(20,12,8,.75)'; ctx.strokeStyle = 'rgba(255,236,200,.9)'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.roundRect(x - w / 2, top, w, h, w / 2); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.arc(x, bot + r * .6, r, 0, TAU); ctx.fill(); ctx.stroke();
  const k = clamp(temp / 22), fillTop = lerp(bot, top + 12, k);
  const col = ramp([[0, '#5fb4ff'], [.5, '#ffd25f'], [1, '#ff5a3a']], k);
  ctx.fillStyle = rgba(col); ctx.beginPath(); ctx.arc(x, bot + r * .6, r - 6, 0, TAU); ctx.fill();
  ctx.fillRect(x - 7, fillTop, 14, bot + 6 - fillTop);
  ctx.globalCompositeOperation = 'lighter'; G.glow(ctx, x, bot + r * .6, r * 3, col, .4 * k); ctx.globalCompositeOperation = 'source-over';
  // ticks
  for (let i = 0; i <= 22; i += 2) { const yy = lerp(bot, top + 12, i / 22); ctx.fillStyle = 'rgba(255,236,200,.8)'; ctx.fillRect(x + w / 2 + 6, yy - 1, i % 10 === 0 ? 20 : 10, 2); if (i % 10 === 0 || i === 18) G.text(ctx, i + '°', x + w / 2 + 34, yy + 7, { font: 'OptB', size: 20, color: '#ffe9c8' }); }
  const ty = lerp(bot, top + 12, 18 / 22);
  ctx.strokeStyle = '#ff8a3d'; ctx.lineWidth = 3; ctx.setLineDash([8, 6]); ctx.beginPath(); ctx.moveTo(x - 90, ty); ctx.lineTo(x + w / 2 + 6, ty); ctx.stroke(); ctx.setLineDash([]);
  ctx.restore();
}

module.exports = { soil, tunnel, root, dust, worm, surfaceWindow, thermometer };

// The lead nymph's route from the surface to the root (world coords, y down from the surface)
const LEAD = [[960, 0], [975, 120], [940, 260], [990, 420], [1020, 560], [980, 700], [960, 830], [990, 930], [1000, 1010]];
const LEAD_SAMP = (() => {
  const pts = [];
  for (let i = 0; i < LEAD.length - 1; i++) {
    const p0 = LEAD[Math.max(0, i - 1)], p1 = LEAD[i], p2 = LEAD[i + 1], p3 = LEAD[Math.min(LEAD.length - 1, i + 2)];
    for (let k = 0; k < 20; k++) { const u = k / 20; const cr = (a, b, c, d) => .5 * ((2 * b) + (-a + c) * u + (2 * a - 5 * b + 4 * c - d) * u * u + (-a + 3 * b - 3 * c + d) * u * u * u); pts.push([cr(p0[0], p1[0], p2[0], p3[0]), cr(p0[1], p1[1], p2[1], p3[1])]); }
  }
  pts.push(LEAD[LEAD.length - 1]);
  return pts;
})();
// position along the route by depth y (monotone), returns {x,y,ang}
function leadAt(y) {
  const P = LEAD_SAMP;
  y = clamp(y, 0, P[P.length - 1][1]);
  let i = 0; while (i < P.length - 2 && P[i + 1][1] < y) i++;
  const f = (y - P[i][1]) / ((P[i + 1][1] - P[i][1]) || 1);
  const x = lerp(P[i][0], P[i + 1][0], f), dx = P[i + 1][0] - P[i][0], dy = P[i + 1][1] - P[i][1];
  return { x, y, ang: Math.atan2(dy, dx) };
}
function leadTrail(y) { const out = []; for (const p of LEAD_SAMP) { if (p[1] <= y) out.push(p); else break; } out.push([leadAt(y).x, y]); return out; }
// depth of the lead nymph over time (seconds since the dig started at EV.dig)
function leadDepth(abs) {
  const EV = cues.EV;
  return 1010 * ss(EV.dig, EV.rootFind - .2, abs);
}
module.exports.LEAD = LEAD; module.exports.leadAt = leadAt; module.exports.leadTrail = leadTrail; module.exports.leadDepth = leadDepth;
