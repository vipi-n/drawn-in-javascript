// Shots, bars 0-32: Thumba 1963 -> 104 satellites.
const { W, H, BAR, BEAT, clamp, lerp, ss, smooth, easeInOut, easeOut, easeIn, hash, rng, noise2, fbm2 } = require('./core');
const G = require('./gfx');
const PL = require('./planet');
const M = require('./mesh');
const { rocket, tower } = require('./rockets');
const E = require('./earthside');
const L = require('./launch');
const CO = require('./coast');
const { rgba, vgrad, glow, flare, stars, smokeColumn, plume, puff } = G;

function shake(ctx, amt, t) { if (amt > 0) ctx.translate((noise2(t * 23, 1.3) * 2) * amt, (noise2(t * 19, 7.1) * 2) * amt); }
function birds(ctx, lt, x0, y0, n, col) {
  ctx.strokeStyle = rgba(col); ctx.lineWidth = 2;
  for (let i = 0; i < n; i++) {
    const x = x0 + lt * 40 + i * 38 + hash(i) * 30, y = y0 + Math.sin(i * 1.7) * 26 + i * 6, f = Math.sin(lt * 9 + i * 2) * 5;
    ctx.beginPath(); ctx.moveTo(x - 9, y - f); ctx.quadraticCurveTo(x - 4, y - 3, x, y); ctx.quadraticCurveTo(x + 4, y - 3, x + 9, y - f); ctx.stroke();
  }
}
function treeline(ctx, y, x0, x1, hmin, hmax, col, seed, scroll = 0, step = 70) {
  const r = rng(seed);
  for (let x = x0; x < x1; x += step * (.6 + r() * .8)) {
    const h = lerp(hmin, hmax, r());
    E.palm(ctx, ((x - scroll) % (x1 - x0 + 400) + x1 - x0 + 400) % (x1 - x0 + 400) + x0 - 200, y + 2, h, { color: col, lean: (r() - .5) * .4, seed: Math.floor(r() * 1000) });
  }
  ctx.fillStyle = rgba(col); ctx.fillRect(x0 - 200, y, x1 - x0 + 400, 6);
}

// ---------------------------------------------------------------- 0-4 : India at night from orbit
function open(ctx, P, lt, d) {
  P.clear(0, 0, 0);
  P.stars(lt, { alpha: ss(0, 3, lt), sx: -lt * 5, sy: lt * 1.5 });
  const rise = easeInOut(lt / d), cy = lerp(2520, 2160, rise);
  PL.sphere(P, { cx: 1000, cy, r: 1700, kind: 'earth', lon0: 80, lat0: -40, sun: [.15, .3, -.94], lights: 1.6, exposure: 1.3 * ss(1, 6, lt), cloudShift: lt * .4, halo: .03 });
  P.put(ctx);
  const ang = Math.atan2(.3, .15), lx = 1000 + Math.cos(ang) * 1700, ly = cy - Math.sin(ang) * 1700;
  flare(ctx, lx, ly, .9, [140, 190, 255], ss(5, 10.5, lt) * .9);
}

// ---------------------------------------------------------------- 4-8 : Thumba fishing village at dusk
function thumba(ctx, P, lt, d) { return CO.thumba(ctx, P, lt, d); }

// ---------------------------------------------------------------- 8-10 : parts on a bicycle
// camera dollies alongside the rider: every layer scrolls at its own depth-scaled speed
function groundBits(ctx, y0, y1, scroll, seed, col, glint, n = 90) {
  const r = rng(seed), span = W + 300;
  for (let i = 0; i < n; i++) {
    const x = ((r() * span - scroll) % span + span) % span - 150, y = y0 + r() * (y1 - y0), w = 3 + r() * 12 * (y - y0 + 20) / (y1 - y0 + 20);
    ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(x, y, w, w * .45, 0, 0, Math.PI * 2); ctx.fill();
    if (glint) { ctx.fillStyle = glint; ctx.fillRect(x - w * .3, y - w * .4, w * .6, 1.5); }
  }
}
function bicycle(ctx, P, lt, d) {
  const gy = 880, s = 175, v = 3.1, dist = 4 + lt * v, px = 840 + lt * 8;
  vgrad(ctx, [[0, [52, 60, 104]], [.45, [214, 126, 96]], [.8, [255, 186, 110]], [1, [255, 214, 140]]], 0, gy);
  const sx = 1250, sy = 720;
  glow(ctx, sx, sy, 1100, [255, 150, 70], .45); glow(ctx, sx, sy, 300, [255, 220, 150], .7);
  ctx.fillStyle = 'rgb(255,246,220)'; ctx.beginPath(); ctx.arc(sx, sy, 62, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(150,80,70,.75)'; ctx.beginPath(); ctx.moveTo(0, gy);
  for (let x = 0; x <= W; x += 16) ctx.lineTo(x, 790 + fbm2((x + dist * s * .02) * .003, 2) * 60); ctx.lineTo(W, gy); ctx.fill();
  treeline(ctx, gy - 40, -100, W + 100, 170, 300, [96, 50, 46], 6, dist * s * .1, 150);
  treeline(ctx, gy - 10, -100, W + 100, 280, 460, [52, 26, 28], 8, dist * s * .22, 260);
  // dusty road with ruts and pebbles moving at the rider's speed
  vgrad(ctx, [[0, [70, 38, 28]], [.25, [40, 22, 16]], [1, [14, 8, 6]]], gy - 8, H + 40);
  ctx.fillStyle = 'rgba(255,170,110,.12)'; ctx.fillRect(0, gy - 6, W, 10);
  for (const ry of [gy + 14, gy + 40]) { ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(0, ry, W, 5); }
  groundBits(ctx, gy - 4, gy + 70, dist * s, 3, 'rgba(10,5,4,.8)', 'rgba(255,190,130,.5)', 120);
  E.cyclist(ctx, px, gy + 8, s, dist);
  // dust from the rear tyre stays where it was kicked up while the rider moves on
  for (let i = 0; i < 26; i++) {
    const tb = Math.floor(lt * 10) / 10 - i * .1, age = lt - tb; if (tb < 0 || age > 2.6) continue;
    const wx = px - .52 * s - (age * v * s) + (hash(i + Math.floor(tb * 10)) - .5) * 20;
    puff(ctx, wx, gy + 4 - age * 30 - hash(tb * 7) * 10, 10 + age * 32, [190, 112, 76], .16 * (1 - age / 2.6), [255, 190, 130], .5);
  }
  // foreground grass rushing past, closer than the rider
  ctx.strokeStyle = 'rgb(6,3,3)'; ctx.lineWidth = 3;
  const r = rng(5), span = W + 300, fs = dist * s * 1.7;
  ctx.beginPath();
  for (let i = 0; i < 170; i++) { const x0 = r() * span, x = ((x0 - fs) % span + span) % span - 150, h = 30 + r() * 120, bend = Math.sin(lt * 2 + i) * 6; ctx.moveTo(x, H); ctx.quadraticCurveTo(x + 6, H - h * .6, x + 14 * (r() - .3) + bend, H - h); }
  ctx.stroke();
}

// ---------------------------------------------------------------- 10-12 : quote card background
function quoteBg(ctx, P, lt, d) {
  vgrad(ctx, [[0, [4, 4, 8]], [1, [14, 8, 6]]]);
  glow(ctx, 960 + Math.sin(lt * .3) * 80, 1100, 1000, [255, 140, 70], .14, true, .5);
  stars(ctx, lt, { alpha: .35, milky: false, sx: -lt * 8, scale: 1.1 });
  const r = rng(77);
  for (let i = 0; i < 70; i++) { const x = r() * W, y = ((r() * H - lt * (8 + r() * 14)) % H + H) % H; glow(ctx, x + Math.sin(lt + i) * 10, y, 3 + r() * 5, [255, 210, 160], .25 * r(), true, .5); }
}

// ---------------------------------------------------------------- 12-14.5 : first rocket on the rail
function nikePad(ctx, P, lt, d, t, o = {}) { return CO.nikePad(ctx, P, lt, d, t, o); }
// ---------------------------------------------------------------- 14.5-16 : the climb into twilight
// wide view of the smoke trail rising off the coast, then a tracking close-up of the Nike-Apache itself
function nikeTrail(ctx, P, lt, d, t = lt) {
  const cut = 1.6;
  if (lt >= cut) return L.track(ctx, lt - cut, { veh: 'nike', pal: 'dusk', s: 42, tau0: 2.2, t, cy: 560, th: .22, sb: .9, cloudFrom: 260, cloudStep: 230, trail: [255, 206, 186], horizon: 1000, wind: 30 });
  CO.nikeTrailWide(ctx, P, lt, cut);
}

// ---------------------------------------------------------------- 16-17 : 1969 card
function card1969(ctx, P, lt, d) {
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  stars(ctx, lt, { alpha: .25, milky: false, scale: 1.2, sx: lt * 20 });
  flare(ctx, lerp(300, 1600, lt / d), 540, .9, [120, 170, 255], .5 * Math.sin(Math.PI * clamp(lt / d)));
  const k = easeOut(clamp(lt / .9));
  glow(ctx, 960, 400, 420, [255, 150, 60], .18 * k);
  require('./emblems').isroLogo(ctx, 960, 380, 330 * (.92 + .08 * k), { alpha: k, glow: .4 });
}

// ---------------------------------------------------------------- 17-19 : Aryabhata
const ARY = M.aryabhata();
function aryabhata(ctx, P, lt, d) {
  P.clear(0, 0, 0); P.stars(lt, { sx: -lt * 10 });
  PL.sphere(P, { cx: 560, cy: 1620, r: 1380, kind: 'earth', lon0: 82 + lt * .6, lat0: -18, sun: [.65, .55, .55], cloudShift: lt * .5, exposure: 1.05 });
  P.put(ctx);
  const o = { R: M.rot(lt * .45 + .5, .35, .15), pos: [0, 0, 9 - lt * .35], scale: 1, f: 1500, cx: 1240 + lt * 10, cy: 400, light: [.65, .55, -.55], amb: .06 };
  M.render(ctx, ARY, o);
  const [gx, gy] = M.project([.15, .3, -.3], o);
  flare(ctx, gx, gy, .35, [255, 230, 200], .6 + .4 * Math.sin(lt * 2.5));
}

// ---------------------------------------------------------------- 19-21 : SLV-3 from Sriharikota
function slv3(ctx, P, lt, d, t = lt) {
  if (lt < BAR) return L.pad(ctx, lt, { veh: 'slv3', pal: 'day', s: 14, px: 820, gy: 900, hy: 560, ign: .3, t, sunX: 1560, sunY: 170, zoom: 1 + lt * .012, light: -1 });
  L.track(ctx, lt - BAR, { veh: 'slv3', pal: 'day', s: 16, tau0: 11, t, cy: 560 });
}

// ---------------------------------------------------------------- 21-23 : APPLE on a bullock cart
function cartShot(ctx, P, lt, d) { return require('./village').cartShot(ctx, P, lt, d); }

// ---------------------------------------------------------------- 23-25 : Rakesh Sharma's window
function porthole(ctx, P, lt, d) {
  const fx = Math.sin(lt * .4) * 18, fy = Math.cos(lt * .33) * 12;
  P.clear(0, 0, 0); P.stars(lt, { n: 900 });
  PL.sphere(P, { cx: 960 + fx * 2, cy: 640 + fy * 2, r: 820, kind: 'earth', lon0: 79 + lt * .9, lat0: 19, roll: -8 + lt * .4, sun: [-.55, .35, .75], cloudShift: lt * .6, exposure: 1.1 });
  P.put(ctx);
  const cx = 960 + fx, cy = 540 + fy, R = 450;
  ctx.save();
  ctx.beginPath(); ctx.rect(-50, -50, W + 100, H + 100); ctx.arc(cx, cy, R, 0, Math.PI * 2, true);
  const g = ctx.createRadialGradient(cx, cy, R, cx, cy, R * 2.3);
  g.addColorStop(0, '#16181c'); g.addColorStop(.12, '#0b0c0f'); g.addColorStop(1, '#030304');
  ctx.fillStyle = g; ctx.fill('evenodd');
  ctx.restore();
  // metal rim with bolts
  ctx.lineWidth = 46; const rg = ctx.createLinearGradient(cx - R, cy - R, cx + R, cy + R);
  rg.addColorStop(0, '#6c6f78'); rg.addColorStop(.3, '#25272c'); rg.addColorStop(.6, '#4a4d55'); rg.addColorStop(1, '#141518');
  ctx.strokeStyle = rg; ctx.beginPath(); ctx.arc(cx, cy, R + 22, 0, Math.PI * 2); ctx.stroke();
  ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(200,210,230,.35)'; ctx.beginPath(); ctx.arc(cx, cy, R + 2, Math.PI * 1.05, Math.PI * 1.55); ctx.stroke();
  for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2; ctx.fillStyle = '#8a8d96'; ctx.beginPath(); ctx.arc(cx + Math.cos(a) * (R + 22), cy + Math.sin(a) * (R + 22), 6, 0, Math.PI * 2); ctx.fill(); }
  // glass reflection
  ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.clip();
  const sg = ctx.createLinearGradient(cx - R, cy - R, cx + R * .2, cy + R * .2);
  sg.addColorStop(0, 'rgba(255,255,255,0)'); sg.addColorStop(.45, 'rgba(200,220,255,.07)'); sg.addColorStop(.5, 'rgba(255,255,255,0)');
  ctx.fillStyle = sg; ctx.fillRect(cx - R, cy - R, 2 * R, 2 * R);
  ctx.restore();
}

// ---------------------------------------------------------------- 25-27 : PSLV on the pad at night
function pslvPad(ctx, P, lt, d, t = lt) {
  L.pad(ctx, lt, { veh: 'pslv', pal: 'night', s: 13, px: 860, gy: 930, hy: 600, t, zoom: 1 + lt / d * .07, light: 1, seed: 8 });
  for (let i = 0; i < 6; i++) { const y = 900 + i * 18, x = ((lt * (20 + i * 6) + i * 400) % 2400) - 300; glow(ctx, x, y, 500, [120, 130, 150], .08, false, .6); }
}
// ---------------------------------------------------------------- 27-29 : PSLV liftoff, the crowd across the lagoon, the climb
function pslvLaunch(ctx, P, lt, d, t = lt) {
  const a = BAR * .75, b = BAR * 1.5;
  if (lt < a) return L.pad(ctx, lt, { veh: 'pslv', pal: 'night', s: 13, px: 860, gy: 930, hy: 600, ign: 0, t, zoom: 1.07 + lt * .01, light: 1, seed: 8 });
  if (lt < b) return require('./crowd').gallery(ctx, P, lt - a, b - a, t, { veh: 'pslv', pal: 'night', tau0: 8 });
  L.track(ctx, lt - b, { veh: 'pslv', pal: 'night', s: 9, tau0: 15, t, cy: 600 });
}

// ---------------------------------------------------------------- 29-31 : 104 satellites
const PS4 = M.ps4(), SATS = Array.from({ length: 104 }, (_, i) => {
  const r = rng(500 + i), th = r() * Math.PI * 2, ph = (r() - .5) * 1.6;
  return { f: M.cubesat(i), t0: .3 + i * .042 + r() * .05, v: [Math.cos(th) * Math.cos(ph) * (.6 + r() * .9), Math.sin(ph) * .9 + .2, Math.sin(th) * Math.cos(ph) * (.6 + r() * .9)], spin: [r() * 3, r() * 3, r() * 3] };
});
const CARTO = [...M.box([0, 0, 0], [1, 1.6, 1], M.MAT.foil), ...M.panel([1.6, 0, 0], [2.2, 0, 0], [0, 0, 1.1], { ...M.MAT.solar }), ...M.panel([-1.6, 0, 0], [2.2, 0, 0], [0, 0, 1.1], { ...M.MAT.solar })];
function deploy(ctx, P, lt, d) {
  P.clear(0, 0, 0); P.stars(lt, { sx: lt * 6 });
  PL.sphere(P, { cx: 960, cy: 2050, r: 1600, kind: 'earth', lon0: 76, lat0: -22 + lt * .3, sun: [-.5, .7, .6], cloudShift: lt * .4, exposure: 1.1 });
  P.put(ctx);
  const cam = { f: 1300, cx: 960, cy: 500, light: [-.5, .7, -.6], amb: .07 };
  const base = [0, -.6, 14 - lt * .5];
  const items = [];
  items.push({ z: base[2], draw: () => M.render(ctx, PS4, { ...cam, R: M.rot(.4 + lt * .05, .5, 0), pos: base }) });
  const ct = Math.max(0, lt - .1);
  items.push({ z: base[2] - ct * .4, draw: () => M.render(ctx, CARTO, { ...cam, R: M.rot(lt * .3, .2, .1), pos: [base[0] - ct * .9, base[1] + 1.6 + ct * .55, base[2] - ct * .4], scale: .7 }) });
  for (const s of SATS) {
    const a = lt - s.t0; if (a <= 0) continue;
    const p = [base[0] + s.v[0] * a * 2.2, base[1] + 1.2 + s.v[1] * a * 1.6, base[2] + s.v[2] * a * 2.2];
    if (p[2] < 1.2) continue;
    items.push({ z: p[2], draw: () => M.render(ctx, s.f, { ...cam, R: M.rot(s.spin[0] * a, s.spin[1] * a, s.spin[2] * a), pos: p, edges: false }) });
  }
  items.sort((a, b) => b.z - a.z).forEach((it) => it.draw());
  // separation puffs
  for (const s of SATS) { const a = lt - s.t0; if (a > 0 && a < .3) { const p = M.project([0, 0, 0], { ...cam, pos: [base[0] + s.v[0] * a * 2.2, base[1] + 1.2 + s.v[1] * a * 1.6, base[2] + s.v[2] * a * 2.2] }); glow(ctx, p[0], p[1], 30, [220, 230, 255], .6 * (1 - a / .3)); } }
  flare(ctx, 420, 210, .5, [255, 220, 180], .7);
}

// ---------------------------------------------------------------- 31-32 : word hits
function words(ctx, P, lt, d) {
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  const k = Math.floor(lt / BEAT), u = (lt % BEAT) / BEAT;
  glow(ctx, 960, 540, 900, [[255, 150, 60], [120, 170, 255], [255, 80, 60], [255, 220, 160]][k % 4], .25 * (1 - u * .7), true, .4);
  flare(ctx, 960, 540, 1.2, [140, 190, 255], (1 - u) * .5);
}

module.exports = { open, thumba, bicycle, quoteBg, nikePad, nikeTrail, card1969, aryabhata, slv3, cartShot, porthole, pslvPad, pslvLaunch, deploy, words, shake, treeline };
