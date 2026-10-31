// Shots, bars 32-74: Moon, Mars, the loss, Chandrayaan-3, beyond.
const { W, H, BAR, BEAT, clamp, lerp, ss, smooth, easeInOut, easeOut, easeIn, hash, rng, noise2 } = require('./core');
const G = require('./gfx');
const PL = require('./planet');
const M = require('./mesh');
const { rocket, tower } = require('./rockets');
const E = require('./earthside');
const S1 = require('./shots1');
const L = require('./launch');
const { rgba, vgrad, glow, flare, stars, smokeColumn, plume, puff } = G;
const { shake, treeline } = S1;

function hud(ctx, lines, x, y, o = {}) {
  ctx.save(); ctx.font = `${o.size ?? 22}px Mono`; ctx.textAlign = o.align ?? 'left'; ctx.textBaseline = 'top';
  ctx.letterSpacing = '2px';
  lines.forEach((l, i) => { ctx.fillStyle = rgba(i === 0 ? (o.head ?? [255, 196, 120]) : [200, 235, 230], (o.alpha ?? 1) * (i === 0 ? 1 : .85)); ctx.fillText(l, x, y + i * (o.size ?? 22) * 1.5); });
  ctx.restore();
}
function engineGlow(ctx, a, b, w, al, c = [200, 220, 255]) {
  for (let i = 0; i < 8; i++) { const u = i / 7; glow(ctx, lerp(a[0], b[0], u), lerp(a[1], b[1], u), w * (1 + u * 2.2), c, al * (1 - u * .85), true, .35); }
}
// world -> camera for ground-camera meshes
function groundCam(cam, Rm, T) {
  const cy = Math.cos(cam.yaw), sy = Math.sin(cam.yaw), cp = Math.cos(cam.pitch), sp = Math.sin(cam.pitch);
  const Ci = [[cy, 0, -sy], [-sp * sy, cp, -sp * cy], [cp * sy, sp, cp * cy]];
  const R = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) for (let k = 0; k < 3; k++) R[i][j] += Ci[i][k] * Rm[k][j];
  const d = [T[0] - cam.x, T[1] - cam.h, T[2] - cam.z];
  return { R, pos: M.mv(Ci, d), f: cam.f, cx: 960, cy: 540, light: M.mv(Ci, [-Math.cos(.19), Math.sin(.19), 0]) };
}
const SUNW = [-Math.cos(.19), Math.sin(.19), 0];

// ---------------------------------------------------------------- 32-36 : Chandrayaan-1
const CH1 = M.orbiter({ segs: 1, dish: .7 });
function moon1(ctx, P, lt, d) {
  const half = BAR * 2;
  if (lt < half) {
    P.clear(0, 0, 0); P.stars(lt, { sx: -lt * 8 });
    PL.sphere(P, { cx: 1260, cy: 1300, r: 1120, kind: 'moon', lon0: 25 + lt * .8, lat0: -28, sun: [-1, .2, .3], exposure: 1.2 });
    P.put(ctx);
    const o = { R: M.rot(-.6 + lt * .05, .3, -.2), pos: [lerp(3.2, -3.6, lt / half), lerp(-.6, .2, lt / half), 11], f: 1400, light: [-1, .2, -.3], amb: .05 };
    M.render(ctx, CH1, o);
    const g = M.project([0, 1.1, 0], o); flare(ctx, g[0], g[1], .3, [255, 230, 200], .5);
  } else {
    const u = lt - half, imp = 1.8;
    P.clear(0, 0, 0); P.stars(lt, { sx: -lt * 4 });
    PL.sphere(P, { cx: 960, cy: 2350, r: 2000, kind: 'moon', lon0: 10, lat0: -78 + u * .3, sun: [-1, .06, .12], exposure: 1.5 });
    P.put(ctx);
    const k = clamp(u / imp), px = lerp(1500, 930, k), py = lerp(-40, 375, k * k * .3 + k * .7);
    if (u < imp) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
      for (const [w, a] of [[16, .08], [5, .3], [2, .8]]) { ctx.strokeStyle = rgba([200, 220, 255], a); ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(lerp(1500, 930, Math.max(0, k - .25)), lerp(-40, 375, Math.max(0, k - .25))); ctx.lineTo(px, py); ctx.stroke(); }
      ctx.restore();
      glow(ctx, px, py, 40, [220, 235, 255], .9);
    } else {
      const a = u - imp;
      glow(ctx, 930, 380, 300 * (1 + a), [255, 240, 220], Math.exp(-a * 2.2));
      flare(ctx, 930, 380, 1.1, [170, 200, 255], Math.exp(-a * 1.6));
      for (let i = 0; i < 40; i++) { const an = -Math.PI * hash(i), v = 120 + hash(i + 9) * 260; puff(ctx, 930 + Math.cos(an) * v * a, 380 + Math.sin(an) * v * a * .5 + 60 * a * a, 6 + a * 18, [170, 170, 175], .5 * Math.exp(-a * 1.2)); }
    }
    // water-ice glints in the permanently shadowed craters
    const wv = ss(imp + .3, imp + 1.4, u);
    for (let i = 0; i < 26; i++) { const x = 300 + hash(i * 3.1) * 1320, y = 420 + hash(i * 1.7) * 600, tw = .6 + .4 * Math.sin(lt * 3 + i); glow(ctx, x, y, 16 + hash(i) * 26, [110, 190, 255], .55 * wv * tw); }
  }
}

// ---------------------------------------------------------------- 36-40 : Mangalyaan
const MOM = M.orbiter({ segs: 3, dish: 1.1 });
function mars(ctx, P, lt, d) {
  const half = BAR * 2;
  if (lt < half) {
    P.clear(0, 0, 0); P.stars(lt, { sx: -lt * 6 });
    PL.sphere(P, { cx: 1340, cy: 520, r: 330 + lt * 22, kind: 'mars', lon0: -70 + lt * 1.2, lat0: 12, sun: [-.85, .25, .5], exposure: 1.25 });
    P.put(ctx);
    const o = { R: M.rot(2.4 + lt * .04, -.25, .5), pos: [-1.6, -.5, 8.5 - lt * .15], f: 1350, light: [-.85, .25, -.5], amb: .05 };
    M.render(ctx, MOM, o);
    const a = M.project([0, -1.1, 0], o), b = M.project([0, -4, 0], o);
    const burn = ss(.6, 1.2, lt) * (.85 + .15 * Math.sin(lt * 40));
    engineGlow(ctx, a, b, 22, .55 * burn);
    flare(ctx, a[0], a[1], .45, [160, 200, 255], burn * .8);
  } else {
    const u = lt - half;
    P.clear(0, 0, 0); P.stars(lt);
    const cx = 960, cy = 1640, r = 1330;
    PL.sphere(P, { cx, cy, r, kind: 'mars', lon0: -55 + u * 1.5, lat0: -4, sun: [-.55, .45, .7], exposure: 1.3 });
    P.put(ctx);
    // orbit line and the craft riding it
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = rgba([255, 200, 150], .35); ctx.lineWidth = 2; ctx.beginPath();
    ctx.ellipse(cx, cy - 40, r * 1.12, r * .3, -.06, Math.PI * 1.03, Math.PI * 1.97); ctx.stroke(); ctx.restore();
    const th = Math.PI * (1.15 + u / (half) * .62), x = cx + Math.cos(th) * r * 1.12, y = cy - 40 + Math.sin(th) * r * .3;
    glow(ctx, x, y, 22, [255, 240, 220], 1); flare(ctx, x, y, .35, [255, 200, 160], .7);
  }
}

// ---------------------------------------------------------------- 40-45 : 7 September 2019
function control(ctx, P, lt, d) { E.control(ctx, lt, { prog: lerp(.5, .72, lt / d), dev: 0, alt: lerp(6.2, 3.4, lt / d), zoom: 1 + lt / d * .06 }); }
const LANDER = M.lander();
function descent19(ctx, P, lt, d) {
  P.clear(0, 0, 0); P.stars(lt, { n: 1600 });
  PL.sphere(P, { cx: 960, cy: 2300, r: 2000, kind: 'moon', lon0: 22, lat0: -70 + lt * .6, sun: [-1, -.02, .25], exposure: 1.1 });
  P.put(ctx);
  const o = { R: M.rot(.6 + lt * .06, .25, .05), pos: [0, .6 - lt * .25, 9], f: 1400, light: [-1, .1, -.3], amb: .05 };
  M.render(ctx, LANDER, o);
  const fl = .8 + .2 * Math.sin(lt * 50);
  engineGlow(ctx, M.project([0, -.85, 0], o), M.project([0, -4, 0], o), 26, .5 * fl);
  hud(ctx, ['VIKRAM · POWERED DESCENT', `ALT  ${lerp(3.2, 2.35, lt / d).toFixed(2)} KM`, `VEL  ${lerp(140, 105, lt / d).toFixed(0)} M/S`], 1420, 190);
}
function graph(ctx, P, lt, d) {
  const u = clamp(lt / (d * .7));
  E.control(ctx, lt, { prog: lerp(.74, .86, u), dev: ss(.2, 1, u) * 1.2, alt: lerp(2.35, 2.1, u), zoom: 1.55, px: -240, py: 60 });
  if (lt > d * .72) { ctx.fillStyle = rgba([0, 0, 0], .3 + .2 * Math.sin(lt * 20)); ctx.fillRect(0, 0, W, H); }
}
function lost(ctx, P, lt, d) {
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  if (lt < .4) {
    const r = rng(Math.floor(lt * 60) + 3);
    for (let i = 0; i < 900; i++) { const g = Math.floor(r() * 200); ctx.fillStyle = `rgba(${g},${g},${g + 20},${.6 * (1 - lt / .4)})`; ctx.fillRect(r() * W, r() * H, 4 + r() * 60, 2 + r() * 5); }
    for (let i = 0; i < 6; i++) { ctx.fillStyle = `rgba(90,255,140,${.3 * (1 - lt / .4)})`; ctx.fillRect(0, r() * H, W, 2); }
  }
}

// ---------------------------------------------------------------- 45-48 : the orbiter still circles
const CH2 = M.orbiter({ segs: 2, dish: .9 });
function orbiter(ctx, P, lt, d) {
  const rise = ss(4.5, 7.8, lt);
  P.clear(0, 0, 0); P.stars(lt, { sx: -lt * 6 });
  PL.sphere(P, { cx: 960, cy: 1960, r: 1560, kind: 'moon', lon0: 40 + lt * .5, lat0: -55, sun: [.25, .15 + rise * .35, -1], exposure: 1.6 });
  P.put(ctx);
  flare(ctx, 1180, 1960 - Math.sqrt(1560 * 1560 - 220 * 220) + 10 - rise * 30, 1.2, [255, 210, 160], rise);
  const o = { R: M.rot(1.2 + lt * .07, .2, .1), pos: [lerp(-4.5, 4.5, lt / d), .55, 14], f: 1400, light: [.25, .5, 1], amb: .03, rim: .8 };
  M.render(ctx, CH2, o);
}

// ---------------------------------------------------------------- 48-52 : LVM3
const LVM_PAD = { veh: 'lvm3', pal: 'dawn', s: 11.5, px: 900, gy: 940, hy: 610, sunX: 1560, sunY: 600, light: 1, seed: 12 };
function lvm3Pad(ctx, P, lt, d, t = lt) {
  L.pad(ctx, lt, { ...LVM_PAD, t, zoom: 1 + lt / d * .07 });
  S1Birds(ctx, lt);
}
function S1Birds(ctx, lt) { ctx.strokeStyle = 'rgba(30,24,36,.9)'; ctx.lineWidth = 2; for (let i = 0; i < 7; i++) { const x = 200 + lt * 50 + i * 42 + hash(i) * 40, y = 300 + Math.sin(i * 1.3) * 30 + i * 8, f = Math.sin(lt * 8 + i) * 6; ctx.beginPath(); ctx.moveTo(x - 10, y - f); ctx.quadraticCurveTo(x - 4, y - 3, x, y); ctx.quadraticCurveTo(x + 4, y - 3, x + 10, y - f); ctx.stroke(); } }
function lvm3Launch(ctx, P, lt, d, t = lt) {
  const a = BAR * .75, b = BAR * 1.5;
  if (lt < a) return L.pad(ctx, lt, { ...LVM_PAD, t, ign: 0, zoom: 1.07 + lt * .01 });
  if (lt < b) return require('./crowd').gallery(ctx, P, lt - a, b - a, t, { veh: 'lvm3', pal: 'dawn', tau0: 9 });
  L.track(ctx, lt - b, { veh: 'lvm3', pal: 'dawn', s: 10, tau0: 17, t, cy: 640 });
}

// ---------------------------------------------------------------- 52-54 : the 40-day road to the Moon
const ROUTE = (() => {
  const ex = 380, ey = 640, mx = 1560, my = 360, phi = Math.atan2(my - ey, mx - ex), D = Math.hypot(mx - ex, my - ey), pts = [];
  const ell = (rp, ra, th) => { const a = (rp + ra) / 2, e = (ra - rp) / (ra + rp), r = a * (1 - e * e) / (1 + e * Math.cos(th)); return [ex + Math.cos(th + phi + Math.PI) * r, ey + Math.sin(th + phi + Math.PI) * r]; };
  for (const ra of [170, 250, 360, 520, 720]) for (let i = 0; i < 160; i++) pts.push(ell(80, ra, i / 160 * Math.PI * 2));
  for (let i = 0; i <= 200; i++) { const u = i / 200, th = u * Math.PI; const [x, y] = ell(80, D + 40, th); pts.push([x + Math.sin(u * Math.PI) * -40, y]); }
  for (const [ra, rp] of [[150, 40], [100, 34], [60, 30], [36, 28]]) for (let i = 0; i < 120; i++) { const th = i / 120 * Math.PI * 2; pts.push([mx + Math.cos(th + 2.2) * (ra + rp) / 2 + Math.cos(2.2) * (ra - rp) / 2, my + Math.sin(th + 2.2) * (ra + rp) / 2 * .8]); }
  return { pts, ex, ey, mx, my };
})();
function trajectory(ctx, P, lt, d) {
  P.clear(2, 3, 8); P.stars(lt, { n: 1400, alpha: .7 });
  PL.sphere(P, { cx: ROUTE.ex, cy: ROUTE.ey, r: 78, kind: 'earth', lon0: 80 + lt * 6, lat0: 10, sun: [-.6, .3, .7], halo: .08 });
  PL.sphere(P, { cx: ROUTE.mx, cy: ROUTE.my, r: 26, kind: 'moon', lon0: 0, lat0: 0, sun: [-.6, .3, .7] });
  P.put(ctx);
  const p = easeInOut(clamp(lt / (d * .92))), n = Math.floor(p * (ROUTE.pts.length - 1));
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineJoin = 'round';
  // full planned route faint
  ctx.strokeStyle = 'rgba(120,160,255,.12)'; ctx.lineWidth = 1.2; ctx.beginPath(); ROUTE.pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.stroke();
  for (const [w, a] of [[7, .1], [2.5, .8]]) { ctx.strokeStyle = rgba([255, 190, 110], a); ctx.lineWidth = w; ctx.beginPath(); for (let i = 0; i <= n; i++) { const [x, y] = ROUTE.pts[i]; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke(); }
  ctx.restore();
  const [hx, hy] = ROUTE.pts[n];
  glow(ctx, hx, hy, 40, [255, 230, 190], 1); flare(ctx, hx, hy, .3, [255, 200, 150], .6);
  const lab = (s, x, y, a) => G.text(ctx, s, x, y, { font: 'Mono', size: 17, track: 3, color: [170, 200, 230], alpha: a, align: 'left' });
  lab('EARTH-BOUND MANOEUVRES', 160, 840, ss(.05, .15, p));
  lab('TRANS-LUNAR INJECTION', 860, 300, ss(.55, .65, p));
  lab('LUNAR ORBIT INSERTION', 1440, 520, ss(.8, .88, p));
  const day = Math.round(p * 40);
  G.text(ctx, `DAY ${String(day).padStart(2, '0')}`, 1720, 210, { font: 'Mono', size: 30, track: 6, color: [255, 200, 130], align: 'right' });
}

// ---------------------------------------------------------------- 54-56 : over the south pole, lander separates
const PMOD = M.propModule(false);
function lunarOrbit(ctx, P, lt, d) {
  P.clear(0, 0, 0); P.stars(lt, { sx: -lt * 5 });
  PL.sphere(P, { cx: 960, cy: 1560, r: 1300, kind: 'moon', lon0: 18 + lt * .7, lat0: -74, sun: [-1, .05, .08], exposure: 1.7 });
  P.put(ctx);
  const sep = ss(2.2, 4.5, lt) * 2.6;
  const base = { f: 1400, light: [-1, .1, -.1], amb: .04, rim: .4 };
  const Rm = M.rot(.5 + lt * .04, .25, -.1);
  const pPos = [lerp(-1.2, -.6, lt / d) - sep * .3, -.4 - sep * .3, 16];
  const lPos = [pPos[0] + sep * .5, pPos[1] + 2.2 * .9 + sep, pPos[2] - sep * .3];
  M.render(ctx, PMOD, { ...base, R: Rm, pos: pPos });
  M.render(ctx, LANDER, { ...base, R: Rm, pos: lPos, scale: .85 });
  if (sep > 0 && sep < 1.8) { const p = M.project([0, -.9, 0], { ...base, R: Rm, pos: lPos, scale: .85 }); glow(ctx, p[0], p[1], 60, [220, 230, 255], .4 * (1 - sep / 1.8)); }
}

// ---------------------------------------------------------------- 56-59.5 : descent to the south pole
function descent(ctx, P, lt, d) {
  const seg = d / 4, k = Math.min(3, Math.floor(lt / seg)), u = (lt - k * seg) / seg;
  if (k === 0) {
    P.clear(0, 0, 0); P.stars(lt, { n: 1200 });
    PL.sphere(P, { cx: 960, cy: 2950, r: 2600, kind: 'moon', lon0: 32, lat0: -69 + lt * .5, sun: [-1, .05, .1], exposure: 1.7 });
    P.put(ctx);
    const o = { R: M.rot(.5 + u * .2, .15, -.08), pos: [0, .5, 7.5], f: 1400, light: [-1, .15, -.1], amb: .04, rim: .3 };
    M.render(ctx, LANDER, o);
    for (const [x, z] of [[.55, .55], [-.55, .55], [.55, -.55], [-.55, -.55]]) engineGlow(ctx, M.project([x, -.85, z], o), M.project([x * 1.4, -3.4, z * 1.4], o), 16, .32);
    hud(ctx, ['ROUGH BRAKING', `ALT  ${lerp(30, 7.4, u).toFixed(1)} KM`, `VEL  ${lerp(1680, 358, u).toFixed(0)} M/S`], 1460, 190);
    return;
  }
  // one continuous chase shot from 800 m to touchdown height
  const U = (x) => clamp((x - seg) / (d - seg)), hAt = (x) => 800 * Math.pow(2.2 / 800, Math.pow(U(x), .9));
  const uu = U(lt), hs = hAt(lt), vel = (hAt(lt) - hAt(lt + .05)) / .05;
  const low = smooth(clamp((40 - hs) / 38));
  const cam = { x: 0, z: -15, h: hs + 6, pitch: lerp(-.46, -.36, low), yaw: .3 + uu * .08, f: 1250 };
  const tile = clamp(90 * Math.sqrt(hs / 14), 60, 1600);
  P.clear(0, 0, 0); P.stars(lt, { n: 800, alpha: .6 });
  PL.ground(P, cam, { exposure: 2.1, tile });
  P.put(ctx);
  // hazard-detection grid while the lander picks its spot
  const ga = ss(.02, .12, uu) * (1 - ss(.45, .62, uu));
  if (ga > 0) {
    ctx.strokeStyle = rgba([90, 255, 160], .35 * ga); ctx.lineWidth = 1.2; ctx.beginPath();
    const span = Math.max(40, hs * .9), step = span / 8;
    for (let i = -8; i <= 8; i++) { const a = PL.groundProject(cam, i * step, 0, -span), b = PL.groundProject(cam, i * step, 0, span); if (a[2] > 0 && b[2] > 0) { ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); } const c = PL.groundProject(cam, -span, 0, i * step), e = PL.groundProject(cam, span, 0, i * step); if (c[2] > 0 && e[2] > 0) { ctx.moveTo(c[0], c[1]); ctx.lineTo(e[0], e[1]); } }
    ctx.stroke();
    const t0 = PL.groundProject(cam, 0, 0, 0);
    ctx.strokeStyle = rgba([255, 200, 120], .9 * ga); ctx.lineWidth = 2; const bs = 3000 / t0[2];
    ctx.strokeRect(t0[0] - bs, t0[1] - bs * .5, bs * 2, bs); glow(ctx, t0[0], t0[1], 30, [255, 200, 120], .5 * ga);
  }
  // the lander between camera and ground
  const ly = hs, oc = groundCam(cam, M.rot(.3, 0, 0), [0, ly, 0]);
  const shadowP = PL.groundProject(cam, ly / Math.tan(.19), 0, 0);
  if (shadowP[2] > 0) { ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.beginPath(); ctx.ellipse(shadowP[0], shadowP[1], 1600 / shadowP[2], 700 / shadowP[2], 0, 0, Math.PI * 2); ctx.fill(); }
  M.render(ctx, LANDER, { ...oc, amb: .05 });
  for (const [x, z] of [[.55, .55], [-.55, .55], [.55, -.55], [-.55, -.55]]) engineGlow(ctx, M.project([x, -.85, z], oc), M.project([x * 1.3, -3.6, z * 1.3], oc), 160 / oc.pos[2], .4);
  // regolith blown outward by the engines in the last few tens of metres
  const dust = clamp((32 - hs) / 26);
  if (dust > 0) {
    const c = PL.groundProject(cam, 0, 0, 0);
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = rgba([200, 190, 180], .12 * dust); ctx.lineWidth = 2;
    ctx.beginPath(); for (let i = 0; i < 160; i++) { const a = hash(i) * Math.PI * 2, r0 = ((hash(i + 3) + lt * 1.8) % 1) * 900; ctx.moveTo(c[0] + Math.cos(a) * r0, c[1] + Math.sin(a) * r0 * .35); ctx.lineTo(c[0] + Math.cos(a) * (r0 + 120), c[1] + Math.sin(a) * (r0 + 120) * .35); } ctx.stroke(); ctx.restore();
    glow(ctx, c[0], c[1], 900, [150, 140, 130], .35 * dust, false, .5);
  }
  const label = hs > 150 ? 'FINE BRAKING · HAZARD DETECTION' : hs > 14 ? 'VERTICAL DESCENT' : 'TERMINAL DESCENT';
  hud(ctx, [label, `ALT  ${hs.toFixed(0).padStart(4, '0')} M`, `VEL  ${vel.toFixed(1)} M/S`], 1460, 190);
}
function hush(ctx, P, lt, d) {
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  const alt = Math.max(0, 2 - lt / d * 2.4);
  G.text(ctx, `ALT  ${alt.toFixed(1)} M`, 960, 540, { font: 'Mono', size: 30, track: 8, color: [200, 235, 230], alpha: .9 });
}

// ---------------------------------------------------------------- 60-66 : on the Moon
const ROVER = M.rover();
function moonScene(ctx, P, lt, cam, o = {}) {
  P.clear(0, 0, 0); P.stars(lt, { n: 1500, alpha: .55 });
  const eh = PL.groundProject(cam, -9000, 1300, 30000);
  if (eh[2] > 0) PL.sphere(P, { cx: eh[0], cy: eh[1], r: o.earthR ?? 52, kind: 'earth', lon0: 80, lat0: 15, sun: [-.9, .2, .35], halo: .08 });
  PL.ground(P, cam, { exposure: 2.2, tile: 70 });
  P.put(ctx);
  if (eh[2] > 0) glow(ctx, eh[0], eh[1], (o.earthR ?? 52) * 3, [120, 170, 255], .15);
}
function landerOnGround(ctx, cam, dropY = 0) {
  const T = [0, 1.25 + dropY, 0];
  // long shadow away from the low sun
  const pts = [[-1.4, -1.4], [1.4, -1.4], [1.4, 1.4], [-1.4, 1.4]].map(([x, z]) => [x, z]);
  const L = (2.3 + dropY) / Math.tan(.19);
  ctx.fillStyle = 'rgba(0,0,0,.72)'; ctx.beginPath();
  const poly = [[-1.3, -1.3], [-1.3, 1.3], [L + 1.3, 1.1], [L + 1.3, -1.1]];
  poly.forEach(([x, z], i) => { const p = PL.groundProject(cam, x, 0, z); i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); }); ctx.fill();
  const oc = groundCam(cam, M.rot(.5, 0, 0), T);
  M.render(ctx, LANDER, { ...oc, amb: .06 });
  return oc;
}
function touchdown(ctx, P, lt, d) {
  const cam = { x: -2, z: -15 + lt * .3, h: 1.7, pitch: -.04, yaw: .2, f: 1350 };
  moonScene(ctx, P, lt, cam);
  const drop = Math.max(0, .35 - lt * .9);
  ctx.save(); shake(ctx, 6 * Math.exp(-lt * 3), lt);
  const oc = landerOnGround(ctx, cam, drop);
  // settling dust ring
  const a = Math.exp(-lt * .9);
  for (let i = 0; i < 70; i++) {
    const an = hash(i) * Math.PI * 2, r = 1.2 + (hash(i + 5) * 3 + 2) * (1 - Math.exp(-lt * 1.5)) * 2.4;
    const p = PL.groundProject(cam, Math.cos(an) * r, .25 + hash(i + 2) * .6 * a, Math.sin(an) * r);
    if (p[2] > .5) puff(ctx, p[0], p[1], (60 + hash(i) * 60) / p[2] * 10, [150, 144, 138], .3 * a);
  }
  const g = M.project([.5, -.3, 1.01], oc);
  flare(ctx, g[0], g[1], .5, [255, 230, 200], .5 + .3 * Math.sin(lt * 2));
  ctx.restore();
}
function onMoon(ctx, P, lt, d) {
  const cam = { x: -9 + lt * .5, z: -32 + lt * .6, h: 2.6, pitch: -.035, yaw: .22, f: 1500 };
  moonScene(ctx, P, lt, cam, { earthR: 70 });
  const oc = landerOnGround(ctx, cam);
  const g = M.project([.5, -.3, 1.01], oc); flare(ctx, g[0], g[1], .35, [255, 230, 200], .5);
}
function pragyan(ctx, P, lt, d) {
  const cam = { x: -.5 - lt * .3, z: -11, h: 1.5, pitch: -.1, yaw: -.25, f: 1350 };
  moonScene(ctx, P, lt, cam);
  landerOnGround(ctx, { ...cam }, 0);
  // ramp from the lander
  const rp = (x, y, z) => PL.groundProject(cam, x, y, z);
  ctx.fillStyle = 'rgba(190,190,195,.9)'; ctx.beginPath();
  [[-1.0, .62, -1.0], [-.4, .62, -1.0], [-.4, 0, -3.2], [-1.0, 0, -3.2]].forEach((p, i) => { const q = rp(...p); i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]); }); ctx.fill();
  // rover path: down the ramp, then across the soil leaving printed tracks
  const z = -3.2 - Math.max(0, lt - .6) * .55, rx = -.7;
  ctx.fillStyle = 'rgba(0,0,0,.35)';
  for (const side of [-.5, .5]) for (let s = -3.4; s > z; s -= .12) {
    const mark = Math.floor(-s / .12) % 6 < 2;
    const a = rp(rx + side - .08, 0, s), b = rp(rx + side + .08, 0, s - .09);
    if (a[2] > 0) { ctx.fillStyle = mark ? 'rgba(0,0,0,.6)' : 'rgba(0,0,0,.3)'; ctx.fillRect(Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.abs(b[0] - a[0]) + 1, Math.abs(b[1] - a[1]) + 2); }
  }
  const ry = lt < .6 ? .3 : 0, oc = groundCam(cam, M.rot(Math.PI, 0, 0), [rx, ry, z]);
  M.render(ctx, ROVER, { ...oc, amb: .06 });
}

// ---------------------------------------------------------------- 66-68 : Aditya-L1, Gaganyaan
const ADI = M.aditya(), GAG = M.gaganyaan();
function aditya(ctx, P, lt, d) {
  P.clear(0, 0, 0); P.stars(lt, { n: 600, alpha: .4 });
  PL.sunDisc(P, { cx: 1300, cy: 540, r: 540, t: lt });
  P.put(ctx);
  glow(ctx, 1300, 540, 1300, [255, 120, 40], .35, true, .45);
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI * .9 + i * .35 + Math.sin(lt * .3 + i) * .03, r0 = 540, h = 60 + hash(i) * 90;
    const x0 = 1300 + Math.cos(a) * r0, y0 = 540 + Math.sin(a) * r0, x1 = 1300 + Math.cos(a + .08) * r0, y1 = 540 + Math.sin(a + .08) * r0;
    const cx = 1300 + Math.cos(a + .04) * (r0 + h * (1 + .1 * Math.sin(lt + i))), cy = 540 + Math.sin(a + .04) * (r0 + h);
    ctx.strokeStyle = 'rgba(255,90,40,.5)'; ctx.lineWidth = 10; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.quadraticCurveTo(cx, cy, x1, y1); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,200,140,.6)'; ctx.lineWidth = 3; ctx.stroke();
  }
  ctx.restore();
  const o = { R: M.rot(-.7 + lt * .08, .75, .1), pos: [-3.4, -.9, 10 - lt * .4], f: 1400, light: [1, 0, .4], amb: .03, rim: 1.2 };
  M.render(ctx, ADI, o);
}
function gaganyaan(ctx, P, lt, d) {
  P.clear(0, 0, 0); P.stars(lt, { sx: -lt * 8 });
  PL.sphere(P, { cx: 960, cy: 1820, r: 1400, kind: 'earth', lon0: 76, lat0: -14 + lt * .3, sun: [.75, .3, -.6], lights: 1.2, cloudShift: lt });
  P.put(ctx);
  flare(ctx, 1560, 520, 1, [255, 200, 150], ss(0, 2, lt));
  const o = { R: M.rot(.5 + lt * .1, .12, -.15), pos: [2.6, .7, 15 - lt * .5], f: 1400, light: [.75, .3, .6], amb: .05, rim: .6 };
  M.render(ctx, GAG, o);
}

// ---------------------------------------------------------------- 70-74 : title
function title(ctx, P, lt, d) {
  const push = lt / d;
  P.clear(0, 0, 0); P.stars(lt, { sx: -lt * 4, alpha: .8 });
  PL.sphere(P, { cx: 960, cy: 1860 - push * 60, r: 1250 + push * 60, kind: 'earth', lon0: 80, lat0: -36, sun: [.05, .7, -.71], lights: 2.4, cloudShift: lt * .3, exposure: 1.2, halo: .035 });
  P.put(ctx);
  flare(ctx, 1000, 1860 - push * 60 - 1250 - push * 60 + 4, 1.3, [150, 190, 255], ss(0, 3, lt));
  const EM = require('./emblems');
  // the ISRO mark rises over the sunrise, then hands over to the tricolour
  const la = ss(.3, 1.6, lt) * (1 - ss(6.4, 7.1, lt));
  EM.isroLogo(ctx, 960, 340 - ss(.3, 2, lt) * 10, 330, { alpha: la, glow: .5 });
  const fa = ss(6.9, 7.8, lt);
  if (fa > 0) {
    G.scrim(ctx, .55 * fa);
    glow(ctx, 960, 470, 700, [255, 170, 90], .22 * fa);
    EM.flag(ctx, 690, 290, 560, lt, { alpha: fa, pole: 520 });
    EM.isroLogo(ctx, 1480, 700, 130, { alpha: fa * .95 });
  }
}

module.exports = { moon1, mars, control, descent19, graph, lost, orbiter, lvm3Pad, lvm3Launch, trajectory, lunarOrbit, descent, hush, touchdown, onMoon, pragyan, aditya, gaganyaan, title };
