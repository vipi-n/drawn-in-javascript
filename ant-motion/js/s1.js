// Scenes 1-2: the nuptial flight (title) and the queen founding her nest.
const core = require('./core');
const { W, H, TAU, clamp, lerp, ss, io3, out3, out5, back, rgba, mix, rng, noise, hash, cues } = core;
const { B, BEAT, BAR, EV } = cues;
const G = require('./gfx');
const T = require('./type');
const ANT = require('./ant');
const WD = require('./world');

// point + heading along a polyline at fraction u
function along(pts, u) {
  const L = []; let tot = 0;
  for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); L.push(d); tot += d; }
  let d = clamp(u) * tot;
  for (let i = 0; i < L.length; i++) {
    if (d <= L[i] || i === L.length - 1) { const k = L[i] ? d / L[i] : 0, a = pts[i], b = pts[i + 1]; return [lerp(a[0], b[0], k), lerp(a[1], b[1], k), Math.atan2(b[1] - a[1], b[0] - a[0]), tot]; }
    d -= L[i];
  }
}
const gait = (dist, s, caste = 'worker') => dist / (ANT.stride(caste) / .56 * s);

// ------------------------------------------------------------------ the swarm
const R0 = rng(2024);
const FLYERS = Array.from({ length: 52 }, (_, i) => {
  const q = R0() < .34, side = R0() < .5 ? -1 : 1;
  return { q, te: .6 + Math.pow(R0(), .8) * 6.2, vx: side * (70 + R0() * 230), vy: 120 + R0() * 170, z: .22 + R0() * .55, ph: R0() * 10, wob: R0() * TAU, hx: side * (60 + R0() * 150) };
});
// world position (relative to the nest hole on the surface) of a flyer at scene time lt
function flyer(f, lt) {
  const u = lt - f.te;
  if (u < 0) return null;
  // walks out of the crater and down the mound slope, then takes off
  if (u < .8) { const k = u / .8, x = f.hx * k; return { x, y: -58 + 50 * Math.pow(Math.abs(x) / 260, 1.6) * 0 - 6 * Math.sin(k * Math.PI), rot: Math.sign(f.hx) * .25 * k - .1, fly: ss(.55, .8, u), u, walk: 1 }; }
  const v = u - .8, x = f.hx + f.vx * v + Math.sin(v * 2.3 + f.wob) * 40, y = -58 - f.vy * v - 50 * v * v;
  return { x, y, rot: -.35 + Math.sin(v * 3 + f.wob) * .15, fly: 1, u };
}
function mound(ctx, x, y) {
  ctx.save();
  const g = ctx.createRadialGradient(x - 60, y - 70, 10, x, y, 260);
  g.addColorStop(0, '#8a6440'); g.addColorStop(.6, '#5a3d24'); g.addColorStop(1, '#3a2616');
  ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x - 260, y + 2);
  for (let i = 0; i <= 40; i++) { const u = i / 40, xx = lerp(x - 260, x + 260, u), hh = Math.pow(Math.sin(Math.PI * u), 1.6) * 74 * (1 - .1 * noise(u * 9)); ctx.lineTo(xx, y - hh + (Math.abs(u - .5) < .08 ? 14 * Math.cos((u - .5) / .08 * Math.PI / 2) : 0)); }
  ctx.lineTo(x + 260, y + 2); ctx.closePath(); ctx.fill();
  const R = rng(5);
  for (let i = 0; i < 70; i++) { const u = R(), xx = lerp(x - 240, x + 240, u), hh = Math.pow(Math.sin(Math.PI * u), 1.6) * 70 * R(), r = 2 + R() * 5; ctx.fillStyle = rgba(mix('#4a321e', '#b08a5c', R()), 1); ctx.beginPath(); ctx.ellipse(xx, y - hh, r, r * .7, 0, 0, TAU); ctx.fill(); }
  // the entrance: a dark crater
  ctx.fillStyle = '#0d0805'; ctx.beginPath(); ctx.ellipse(x, y - 58, 30, 11, 0, 0, TAU); ctx.fill();
  ctx.strokeStyle = 'rgba(255,200,140,.4)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(x, y - 57, 31, 12, 0, .1, Math.PI - .1); ctx.stroke();
  ctx.restore();
}
function drawFlyer(ctx, f, p, sx, sy, lt, lod) {
  const s = f.q ? f.z * 1.05 : f.z * .82, flip = f.vx < 0;
  ANT.draw(ctx, sx, sy, s, { caste: f.q ? 'queen' : 'male', wings: 1, spread: p.fly, flap: lt * 21 + f.ph, rot: flip ? -p.rot : p.rot, flip, lod, phase: p.walk ? p.u * 2.6 : undefined, ant: lt * .5 + f.ph });
}

// the title wordmark
function title(ctx, lt, a) {
  if (a <= 0) return;
  const x = W / 2, y = 760, size = 380;
  ctx.save(); ctx.globalAlpha *= a;
  const bg = ctx.createRadialGradient(x, y - 120, 0, x, y - 120, 620); bg.addColorStop(0, 'rgba(20,10,20,.45)'); bg.addColorStop(1, 'rgba(20,10,20,0)');
  ctx.fillStyle = bg; ctx.fillRect(0, y - 760, W, 1200);
  const k = ss(0, .7, lt), top = y - size * .74, scan = lerp(top, y + 10, out3(k));
  // bracket corners (a reticle around the word)
  const bw = 330 * out5(ss(.1, .7, lt)), bh = 190;
  ctx.strokeStyle = rgba(T.TEAL, .9); ctx.lineWidth = 4;
  for (const [sx2, sy2] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    const cx = x + sx2 * bw, cy = y - size * .36 + sy2 * bh;
    ctx.beginPath(); ctx.moveTo(cx, cy - sy2 * 46); ctx.lineTo(cx, cy); ctx.lineTo(cx - sx2 * 46, cy); ctx.stroke();
  }
  ctx.save(); ctx.beginPath(); ctx.rect(0, top - 20, W, scan - top + 20); ctx.clip();
  ctx.font = `${size}px CondH`; ctx.letterSpacing = '26px';
  const tw = ctx.measureText('ANT').width - 26;
  const g = ctx.createLinearGradient(0, top, 0, y); g.addColorStop(0, '#fff8ec'); g.addColorStop(.55, '#ffd9a0'); g.addColorStop(1, '#ff9f3a');
  ctx.shadowColor = 'rgba(0,0,0,.55)'; ctx.shadowBlur = 40; ctx.shadowOffsetY = 8; ctx.fillStyle = g; ctx.fillText('ANT', x - tw / 2, y);
  ctx.letterSpacing = '0px'; ctx.restore();
  if (k < 1) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = rgba('#dffffb', Math.sin(Math.PI * k)); ctx.fillRect(x - 360, scan - 2, 720, 4); G.glow(ctx, x, scan, 300, T.TEAL, .3 * Math.sin(Math.PI * k)); ctx.restore(); }
  // sublines
  const s1 = out3(ss(.55, 1.1, lt));
  ctx.save(); ctx.beginPath(); ctx.rect(x - 400 * s1, y + 30, 800 * s1, 90); ctx.clip();
  G.text(ctx, 'THE LIFE CYCLE', x, y + 100, { font: 'CondD', size: 72, color: T.CREAM, align: 'center', track: 16, shadow: 20 });
  ctx.restore();
  G.text(ctx, 'FORMICIDAE  ·  14,000+ SPECIES', x, y - size * .74 - 54, { font: 'Mono', size: 22, color: T.AMBER, align: 'center', track: 5, alpha: ss(.7, 1.2, lt) });
  ctx.restore();
}

function flight(ctx, lt) {
  const rise = io3(ss(3.7, 7.6, lt)) * 1650, surf = 1430 + rise, hx = W / 2, hy = surf;
  // sky + meadow + soil cross-section
  WD.sky(ctx, surf, lt, { sunX: W * .72, sunH: 150 });
  if (surf < H + 40) {
    WD.soil(ctx, surf);
    // the nest below: a tunnel from the crater down and a lit chamber with waiting winged ants
    WD.tunnel(ctx, [[hx, surf - 50], [hx + 10, surf + 80], [hx - 40, surf + 200], [hx - 10, surf + 330], [hx + 80, surf + 420]], 46);
    WD.chamber(ctx, hx + 150, surf + 430, 140, 62, { light: .75 });
    const R = rng(77);
    for (let i = 0; i < 4; i++) ANT.draw(ctx, hx + 70 + i * 62, surf + 470, .32, { caste: R() < .5 ? 'queen' : 'male', wings: 1, phase: lt * .8 + i * .3, lod: 1, flip: i % 2 === 1 });
    for (let i = 0; i < 3; i++) { const [x, y, an] = along([[hx - 10, surf + 330], [hx - 40, surf + 200], [hx + 10, surf + 80], [hx, surf - 40]], ((lt * .22 + i * .33) % 1)); ANT.draw(ctx, x, y + 10, .26, { caste: i === 1 ? 'queen' : 'male', wings: 1, rot: an, phase: lt * 3 + i, lod: 1 }); }
    WD.ground(ctx, surf);
    mound(ctx, hx, surf);
  }
  // swarm (far ones first)
  const list = FLYERS.map((f) => [f, flyer(f, lt)]).filter(([, p]) => p).sort((a, b) => a[0].z - b[0].z);
  for (const [f, p] of list) {
    const sx = hx + p.x * (p.walk ? 1 : .6 + f.z), sy = hy + (p.walk ? p.y + 52 * Math.pow(Math.abs(p.x) / 260, 1.4) : p.y * (.7 + f.z * .6));
    if (sy < -80 || sy > H + 80) continue;
    drawFlyer(ctx, f, p, sx, sy, lt, f.z > .5 ? 2 : 1);
  }
  // meadow in front (silhouette grass, sunlit rims)
  if (surf < H + 220) WD.meadow(ctx, surf + 12, lt, { n: 46, h: 220, seed: 9 });
  G.motes(ctx, lt, 40, { color: '#ffd9a0', seed: 31, a: .35, drift: [6, -10] });
  // hook + title + castes
  T.caption(ctx, lt - .3, 2.35, 1060, ['Every ant colony begins', 'with *one flight*.'], { size: 62 });
  title(ctx, lt - (EV.title - B(0)), (lt > EV.title ? 1 : 0) * (1 - ss(5.2, 5.9, lt)));
  // heroes for the caste tags (screen space, flying across)
  const qa = win(5.0, 5.4, 7.7, 8.1, lt);
  if (qa > 0) {
    const qx = 300 + (lt - 5) * 30, qy = 880 - (lt - 5) * 22, mx = 760 - (lt - 5) * 26, my = 1180 - (lt - 5) * 30;
    ctx.save(); ctx.globalAlpha *= qa;
    ANT.draw(ctx, qx, qy, .95, { caste: 'queen', wings: 1, spread: 1, flap: lt * 20, rot: -.25 });
    ANT.draw(ctx, mx, my, .8, { caste: 'male', wings: 1, spread: 1, flap: lt * 23 + 2, rot: .2, flip: true });
    ctx.restore();
    T.tag(ctx, lt - 5.5, 2.4, qx + 20, qy - 40, qx + 120, qy - 210, 'QUEEN', 'large · winged · future mother');
    T.tag(ctx, lt - 5.9, 2.0, mx - 10, my - 40, mx - 80, my + 190, 'MALE', 'small · lives only to mate', { side: -1 });
    T.caption(ctx, lt - 5.4, 2.6, 1560, ['*Winged* queens and males fly out', 'to mate: the *nuptial flight*.'], { size: 50 });
  }
  // mid-air mating close-up
  if (lt > 8.0) matingClose(ctx, lt - 8.0);
}
const win = core.win;

function matingClose(ctx, u) {
  // deep sky, blurred far flyers, the pair big in the middle; the male lets go and falls
  const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#2a2246'); g.addColorStop(.6, '#8a4a6a'); g.addColorStop(1, '#f09a62');
  ctx.globalAlpha = ss(0, .25, u); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  G.glow(ctx, W * .78, H * .78, 700, '#ffb067', .45);
  G.bokeh(ctx, u, 22, { colors: ['#ffcf9a', '#ff9f7a', '#ffe2c0'], seed: 4, a: .16, rmin: 18, rmax: 70, drift: [14, -24] });
  const R = rng(91);
  for (let i = 0; i < 14; i++) { const x = ((R() * W + u * (30 + R() * 50)) % W), y = ((R() * H - u * (80 + R() * 120)) % H + H) % H; ANT.draw(ctx, x, y, .2 + R() * .15, { caste: R() < .4 ? 'queen' : 'male', wings: 1, spread: 1, flap: u * 20 + i, rot: -.3, lod: 0 }); }
  const cx = 470 + u * 30, cy = 980 - u * 40, drop = ss(1.4, 2.6, u);
  ANT.draw(ctx, cx, cy, 1.45, { caste: 'queen', wings: 1, spread: 1, flap: u * 19, rot: -.18 + Math.sin(u * 2) * .04 });
  const mx = cx + lerp(-10, -60, drop), my = cy - 150 + drop * drop * 900, mr = -.1 + drop * 2.4;
  ANT.draw(ctx, mx, my, 1.0, { caste: 'male', wings: 1, spread: 1 - drop * .6, flap: u * 23, rot: mr, flip: false });
  T.caption(ctx, u - .15, 2.55, 1580, ['They mate *in mid-air*. The males', '*die* soon after; the queen flies on.'], { size: 50 });
  ctx.globalAlpha = 1;
}

// ------------------------------------------------------------------ founding
const QX = 560;
function found(ctx, lt) {
  const pan = io3(ss(5.2, 7.0, lt)), gy = lerp(1320, 560, pan);
  // blurred evening meadow behind the ground
  const g = ctx.createLinearGradient(0, gy - 1400, 0, gy); g.addColorStop(0, '#3a2a4a'); g.addColorStop(.6, '#b0605a'); g.addColorStop(1, '#ffbf7a');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, gy);
  G.glow(ctx, W * .2, gy - 200, 600, '#ffcf8a', .5);
  G.bokeh(ctx, lt, 18, { colors: ['#ffd8a0', '#ffb070'], seed: 7, a: .2, rmin: 30, rmax: 110, y0: gy - 900, y1: gy - 60 });
  G.blurred(ctx, 10, (c) => { WD.meadow(c, gy - 30, lt, { n: 60, h: 330, seed: 14 }); }, { alpha: .9 });
  WD.soil(ctx, gy);
  // the dug tunnel + chamber (appear as she digs)
  const dig = ss(5.5, 7.2, lt), seal = ss(EV.seal - B(4) - .3, EV.seal - B(4) + .4, lt);
  const tp = [[QX + 120, gy + 4], [QX + 150, gy + 150], [QX + 60, gy + 300], [QX - 20, gy + 460], [QX + 20, gy + 600]];
  const ch = [QX + 30, gy + 690];
  if (dig > 0) {
    const n = 2 + Math.floor(dig * (tp.length - 2) + .999), part = tp.slice(0, n);
    WD.tunnel(ctx, part, 54, { light: .6 });
    if (dig > .85) WD.chamber(ctx, ch[0], ch[1], 170 * ss(.85, 1, dig), 92 * ss(.85, 1, dig), { light: .7 });
    // seal: soil pellets plug the top of the tunnel
    if (seal > 0) { const R = rng(13); for (let i = 0; i < 14; i++) { const k = ss(i / 14 * .7, i / 14 * .7 + .3, seal), px = QX + 120 + (R() - .5) * 40, py = gy + 20 + R() * 90; if (k > 0) { ctx.fillStyle = rgba(mix('#6a4a2a', '#a8804e', R()), 1); ctx.beginPath(); ctx.arc(px, py, (8 + R() * 6) * k, 0, TAU); ctx.fill(); } } }
  }
  WD.ground(ctx, gy, { seed: 4 });
  // the queen: lands, folds wings, sheds them, digs down
  const land = ss(-.2, EV.landing - B(4), lt), qs = lerp(1.5, .62, pan);
  let qx = QX, qy = gy, rot = 0, phase, flip = false;
  if (lt < EV.landing - B(4)) { qy = lerp(-200, gy, out3(land)); qx = lerp(QX - 260, QX, out3(land)); rot = lerp(.5, 0, land); }
  const walkA = ss(4.9, 5.6, lt);
  if (walkA > 0 && lt < 5.6) { qx = lerp(QX, QX + 80, walkA); phase = walkA * 3; }
  if (lt >= 5.6) {
    const u = ss(5.6, 7.3, lt), [x, y, an, tot] = along(tp, u * .999);
    qx = x; qy = y + 6; rot = an; phase = gait(u * tot, qs, 'queen');
    if (u >= 1) { const v = ss(7.3, 7.8, lt); qx = lerp(x, ch[0] - 30, v); qy = lerp(y, ch[1] + 70, v); rot = lerp(an, 0, v); phase = 0; }
  }
  const snaps = EV.wingSnap.map((t) => t - B(4));
  const wingsOn = lt < snaps[1] ? 1 : 0, shake = snaps.reduce((p, s) => p + Math.exp(-Math.max(0, lt - s) * 9) * (lt > s ? 1 : 0), 0);
  ANT.draw(ctx, qx, qy, qs, { caste: 'queen', wings: lt < EV.landing - B(4) + .1 ? 1 : wingsOn, spread: 1 - ss(EV.landing - B(4) - .1, EV.landing - B(4) + .4, lt), flap: lt * 20, phase, rot: rot + shake * .05, gaster: shake * .1, jaw: .2 + shake * .5, ant: lt * .4, flip });
  // detached wings tumble away
  snaps.forEach((s, i) => {
    const u = lt - s; if (u < 0 || u > 2.2) return;
    const [wx, wy] = ANT.toScreen(qx, qy, qs, [ANT.GEO.queen.wing[0], ANT.GEO.queen.wing[1] - ANT.GEO.queen.lift], false);
    const dir = i % 2 ? 1 : -1, x = wx + dir * (90 + i * 30) * u - 80, y = wy - 220 * u + 520 * u * u, a = 1 - ss(1.4, 2.2, u);
    ANT.wing(ctx, x, y, (i < 2 ? 230 : 170) * qs * .9, (i < 2 ? 38 : 26) * qs, Math.PI - .1 + u * dir * 3.5, a, { hind: i >= 2 });
  });
  // lens: inside the queen - the spermatheca
  T.lens(ctx, lt - 1.0, 2.2, qx - 90 * qs, qy - 60 * qs, 540, 660, 310, (c, R) => {
    const s = 1.3, ax = 540 + 112 * s + 30, ay = 660 + 72 * s;
    ANT.draw(c, ax, ay, s, { caste: 'queen', xray: 1, hl: { sperm: 1 + .3 * Math.sin(lt * 6), ovary: .5 } });
    const [sx, sy] = ANT.toScreen(ax, ay, s, ANT.anchor('queen', 'sperm'));
    T.tag(c, lt - 1.55, 1.65, sx, sy, sx + 10, sy + 150, 'SPERMATHECA', 'sperm stored for life', { color: T.TEAL, size: 30, subSize: 20, side: -1 });
    const [ox, oy] = ANT.toScreen(ax, ay, s, ANT.anchor('queen', 'ovary'));
    T.tag(c, lt - 1.8, 1.4, ox, oy, ox + 20, oy - 160, 'OVARIES', 'eggs in waiting', { size: 26, subSize: 18 });
  }, { label: 'X-RAY · INSIDE THE QUEEN', sr: 40 });
  T.caption(ctx, lt - .9, 2.2, 1560 - pan * 0, ['She keeps the sperm in a tiny sac,', 'enough for *her whole life*.'], { size: 50 });
  T.caption(ctx, lt - 3.25, 2.0, 1560, ['Then she *breaks off her own wings*.'], { size: 54 });
  T.caption(ctx, lt - 5.5, 2.5, 1560, ['She digs a *sealed chamber* and lives', 'on her *flight muscles* and fat.'], { size: 50 });
  if (lt > 6.2) T.tag(ctx, lt - 7.4, 1.0, ch[0] + 90, ch[1] - 40, ch[0] + 260, ch[1] - 200, 'FOUNDING CHAMBER', 'sealed · no food for weeks');
}

module.exports = { flight, found, along, gait, FLYERS, flyer, drawFlyer, mound, title };
