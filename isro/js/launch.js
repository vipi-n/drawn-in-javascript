// Launches at Sriharikota: a locked-off wide shot of the pad and a long-lens tracking shot.
const { W, H, clamp, lerp, hash, rng, noise2, ss } = require('./core');
const G = require('./gfx');
const S = require('./shar');
const { rocket } = require('./rockets');
const Wt = require('./water');
const F = require('./flora');
const { rgba, mixc, glow, puff, plume } = G;

// height (m), engine list [dx m, nozzle radius m], ground-launch acceleration a0 (m/s^2) + jerk j
const VEH = {
  nike: { H: 8.4, a0: 55, j: 0, eng: [[0, .2]], tower: 0, ped: 0 },
  slv3: { H: 22.5, a0: 5.5, j: .6, eng: [[0, .5]], tower: 28, ped: 4 },
  pslv: { H: 44.4, a0: 4, j: .4, eng: [[0, 1], [-1.9, .42], [1.9, .42], [-.85, .42], [.85, .42]], tower: 52, ped: 7 },
  lvm3: { H: 43.5, a0: 3, j: .35, eng: [[-3.6, 1.35], [3.6, 1.35]], tower: 50, ped: 8 },
};
const alt = (v, t) => t > 0 ? .5 * v.a0 * t * t + v.j * t * t * t / 6 : 0;

function shake(ctx, a, t) { if (a > .01) ctx.translate(noise2(t * 21, 3.1) * 2 * a, noise2(t * 17, 8.3) * 2 * a); }

// exhaust leaving the flame-deflector ducts on both sides: fast at first, then dragged to a crawl and rising
function ductSmoke(ctx, tau, ex, gy, s, p, o = {}) {
  if (tau <= 0) return;
  const rate = o.rate ?? 42, life = 9, list = [];
  for (const side of [-1, 1]) {
    for (let i = Math.max(0, Math.ceil((tau - life) * rate)); i <= Math.floor(tau * rate); i++) {
      const tb = i / rate, age = tau - tb, h1 = hash(i * 1.31 + side), h2 = hash(i * 2.17 + side * 3), h3 = hash(i * .77 + side * 5);
      const v0 = (55 + 50 * h1) * s, k = .85, dist = v0 * k * (1 - Math.exp(-age / k));
      const x = ex + side * (dist + 2 * s) + (h2 - .5) * 6 * s * Math.min(1, age);
      const r = (1.6 + 6.5 * Math.sqrt(age) * (.7 + .6 * h3)) * s;
      const y = gy - r * .55 - (3 + 7 * h2) * s * Math.pow(age, 1.3) * .5 - (h1 - .5) * 2 * s;
      list.push([x, y, r, .5 * Math.min(1, age * 7) * (1 - age / life), age]);
    }
  }
  list.sort((a, b) => b[4] - a[4]);
  const fl = o.flame;
  for (const [x, y, r, a, age] of list) {
    const lit = fl ? clamp(1 - Math.hypot(x - fl.x, y - fl.y) / fl.r) * fl.k : 0;
    puff(ctx, x, y, r, mixc(o.color ?? [226, 222, 216], p.cloudSh, clamp(age / 9)), a, [255, 168, 80], lit);
  }
}
// steam from the water deluge around the pedestal
function steam(ctx, tau, cx, y, s, p) {
  if (tau <= -.3) return;
  const t = tau + .3;
  for (let i = 0; i < Math.min(60, Math.floor(t * 30)); i++) {
    const age = t - i / 30, h1 = hash(i * 3.3), h2 = hash(i * 1.9);
    const x = cx + (h1 - .5) * 16 * s + (h1 - .5) * age * 6 * s, yy = y - age * (2 + 4 * h2) * s;
    puff(ctx, x, yy, (1.5 + 3 * Math.sqrt(age)) * s, [236, 236, 236], .35 * clamp(1 - age / 4), p.cloud, .5);
  }
}

// o: {veh, pal, s, px, gy, hy, ign, t, zoom, sunX, sunY, light}
// Camera: pad at distance Zp = f/s, eye height hc = (gy-hy)/s; sea ~1.4 km beyond the pad.
const PAD_WAVES = Wt.spectrum(57, .05, { swell: .9 });
const smf = (a, b, x) => { const u = clamp((x - a) / (b - a)); return u * u * (3 - 2 * u); };
function padGround(p, Zp, night, fire, dawn) {
  const fl = foliage(p), dry = mixc(p.sand, fl.leafLit, .35), scrub = mixc(fl.leaf, p.sand, .3), dark = mixc(fl.leafDark, fl.leaf, .3);
  const gravel = mixc(p.concrete, p.sand, .45), conc = p.concrete, road = mixc(p.concrete, [0, 0, 0], .45);
  const amb = night ? .35 : 1, c = [0, 0, 0];
  return (X, Z, fx, fz, out) => {
    const dz = Z - Zp, r = Math.sqrt(X * X + dz * dz * 1.2), fine = 1 - smf(.4, 2.5, fz), bushF = 1 - smf(.8, 5, fz);
    const n1 = noise2(X * .012, Z * .012), n2 = noise2(X * .05 + 3, Z * .05 - 1), n3 = fine > 0 ? noise2(X * .45, Z * .45) * fine : 0;
    const veg = clamp(.5 + n1 * .45 + n2 * .3);
    for (let k = 0; k < 3; k++) c[k] = lerp(dry[k], scrub[k], veg) * (1 + n3 * .18);
    // low bushes: resolved as clumps up close, averaged into a darker tone far away
    const nb = bushF > 0 ? noise2(X * .32 + 7, Z * .32 + 2) : 0;
    const bush = bushF * smf(.12, .34, nb + (veg - .5) * .5) + (1 - bushF) * veg * .35;
    for (let k = 0; k < 3; k++) c[k] = lerp(c[k], dark[k], bush * .85);
    // cleared, graded ground around the pad, concrete apron, roads
    const clr = 1 - smf(70, 115, r + n1 * 18);
    if (clr > 0) for (let k = 0; k < 3; k++) c[k] = lerp(c[k], gravel[k] * (1 + n2 * .08), clr);
    if (Math.abs(X) < 34 && Math.abs(dz) < 26) { const e = smf(0, 2, Math.min(34 - Math.abs(X), 26 - Math.abs(dz))); for (let k = 0; k < 3; k++) c[k] = lerp(c[k], conc[k] * (1 + n3 * .05), e); }
    const rd = Math.abs(X - 30 - dz * .05), ring = Math.abs(r - 104);
    if (dz < 20 && rd < 4.5) for (let k = 0; k < 3; k++) c[k] = lerp(c[k], road[k], smf(4.5, 3.5, rd));
    if (ring < 3.5) for (let k = 0; k < 3; k++) c[k] = lerp(c[k], road[k], smf(3.5, 2.6, ring) * .9);
    let li = amb;
    if (night) li += 3.2 * Math.exp(-r / 70);
    for (let k = 0; k < 3; k++) out[k] = c[k] * li;
    if (fire > 0) { const fk = fire * Math.exp(-r / (night ? 120 : 70)) * (night ? 1.6 : .6); out[0] += 255 * fk; out[1] += 140 * fk; out[2] += 60 * fk; }
    if (!night) { const hk = 1 - Math.exp(-Z / (dawn ? 2600 : 4200)); for (let k = 0; k < 3; k++) out[k] = lerp(out[k], p.haze[k], hk); }
  };
}
// casuarina foliage: green, warmed by the palette's light
const foliage = (p) => ({ leafDark: mixc(p.tree, [20, 40, 24], .5), leaf: mixc(mixc(p.tree, p.treeLit, .35), [46, 70, 42], .5), leafLit: mixc(p.treeLit, [110, 140, 80], .4) });
// a casuarina plantation belt at distance Z: solid canopy with individual crowns breaking its top edge
function belt(ctx, V, Z, Hm, p, o) {
  const s = V.f / Z, base = V.hy + V.hc * s, night = o.night, hk = night ? 0 : clamp(1 - Math.exp(-Z / (o.fogD ?? 3200)));
  const canopy = mixc(mixc(foliage(p).leafDark, p.tree, night ? 1 : .3), p.haze, hk);
  const gap = o.gap ?? [0, 0];
  ctx.fillStyle = rgba(canopy); ctx.beginPath(); ctx.moveTo(-10, base + 2);
  for (let x = -10; x <= W + 10; x += 3) {
    const wx = (x - V.cx) / s, inGap = wx > gap[0] && wx < gap[1];
    ctx.lineTo(x, inGap ? base + 2 : base - Hm * s * (.5 + .22 * noise2(wx / 30, o.seed) + .12 * Math.abs(noise2(wx / 6, o.seed + 3))));
  }
  ctx.lineTo(W + 10, base + 2); ctx.closePath(); ctx.fill();
  const step = Math.max(6, 7 * s), x0 = Math.floor((-60 - V.cx) / s / 7) * 7;
  const fol = foliage(p);
  const lit = night ? null : { light: o.light, leafDark: mixc(fol.leafDark, p.haze, hk), leaf: mixc(fol.leaf, p.haze, hk), leafLit: mixc(fol.leafLit, p.haze, hk), trunk: mixc([80, 70, 60], p.haze, hk), trunkLit: mixc([150, 130, 110], p.haze, hk), trunkDark: mixc([40, 34, 30], p.haze, hk) };
  for (let wx = x0; ; wx += 7) {
    const x = V.cx + wx * s + (hash(wx * .37 + o.seed) - .5) * 4 * s; if (x > W + 60) break;
    if (wx > gap[0] - 10 && wx < gap[1] + 10) continue;
    const hh = Hm * (.85 + .35 * hash(wx * 1.3 + o.seed)) * s;
    F.casuarina(ctx, x, base + 1, hh, night ? { color: canopy, seed: wx * 7 + o.seed, t: o.t } : { lit, seed: wx * 7 + o.seed, t: o.t, crownBase: .5 });
  }
}
function pad(ctx, lt, o) {
  const v = VEH[o.veh], p = S.PAL[o.pal], s = o.s, tau = lt - (o.ign ?? 1e9), night = o.pal === 'night', t = o.t;
  const px = o.px, gy = o.gy, hy = o.hy, pedH = v.ped * s, pedTop = o.veh === 'slv3' ? pedH : pedH * 1.15;
  const h = alt(v, tau), drift = -.015 * h, ry = gy - pedTop - h * s, rx = px + drift * s;
  const fire = tau > 0 ? clamp(tau * 3) : 0;
  ctx.save();
  if (o.zoom) { ctx.translate(px, gy - 200); ctx.scale(o.zoom, o.zoom); ctx.translate(-px, -(gy - 200)); }
  shake(ctx, tau > 0 ? 4 * ss(.2, 1.2, tau) : 0, lt);
  const f = 1500, Zp = f / s, V = { hy, f, hc: (gy - hy) / s, cx: px };
  const lightDir = o.pal === 'dawn' ? [.8, .4, .35] : [.55, .7, .4];
  Wt.scene(ctx, {
    hy, t, f, hc: V.hc, cx: px, waves: PAD_WAVES,
    sky: (c) => {
      S.sky(c, hy, t, p, { sunX: o.sunX, sunY: o.sunY, clouds: !night, n: 5, seed: o.seed ?? 31 });
      if (night) { G.stars(c, t, { alpha: .8, milky: true, mask: (x, y) => y < hy - 20 }); glow(c, px, hy, 900, [60, 70, 100], .25); }
      if (fire > 0) glow(c, rx, ry, 900, [255, 150, 70], (night ? .5 : .2) * fire);
    },
    deep: night ? [4, 8, 14] : mixc(p.sea, [0, 0, 0], .3), foam: p.foam, caps: night ? 0 : .3, fog: night ? 30000 : 9000,
    sun: night ? null : { x: o.sunX ?? 1500, y: o.sunY ?? 200, i: .5, col: p.sun },
    sand: p.sand, wet: mixc(p.sand, p.sea, .45),
    shore: { nx: 0, nz: 1, c0: Zp + 1400, wob: 25, surfW: 70, surfLen: 24, surfSpeed: 5, runup: 7, period: 8, beachW: 110 },
    land: padGround(p, Zp, night, fire, o.pal === 'dawn'),
  });
  // casuarina plantations: coastal belt, the belt behind the pad, clumps flanking the clearing
  belt(ctx, V, Zp + 1150, 17, p, { night, light: lightDir, seed: 3, t });
  belt(ctx, V, Zp + 420, 18, p, { night, light: lightDir, seed: 7, t, gap: [-60, 120] });
  const flank = SIDE_TREES.map((q) => ({ ...q, Z: Zp + q.Z })).filter((q) => q.Z > 30).sort((a, b) => b.Z - a.Z);
  const litF = night ? null : { light: lightDir, ...foliage(p) };
  for (const q of flank) {
    const sq = f / q.Z, x = px + q.X * sq, hk = night ? 0 : clamp(1 - Math.exp(-q.Z / 3200));
    if (x < -300 || x > W + 300) continue;
    const opt = night ? { color: mixc(p.tree, [255, 200, 140], .08 * Math.exp(-Math.hypot(q.X, q.Z - Zp) / 120)), seed: q.seed, t } : { lit: litF, haze: p.haze, hazeK: hk, seed: q.seed, t };
    if (q.kind === 'tree') F.casuarina(ctx, x, hy + V.hc * sq + 1, q.H * sq, opt);
    else F.shrub(ctx, x, hy + V.hc * sq + 1, q.H * 2.2 * sq, q.H * sq, opt);
  }
  const armK = clamp(-tau * .8);
  if (o.veh === 'slv3') {
    S.mast(ctx, px - 30 * s, gy - 8, 1.55 * v.H * s, p, t, { haze: night ? 0 : .1 });
    S.mast(ctx, px + 31 * s, gy - 8, 1.55 * v.H * s, p, t, { haze: night ? 0 : .1 });
    S.umbilical(ctx, px + 2.5 * s, gy - pedH + 2, 6 * s, v.tower * s, p, { arms: armK > 0 ? [[.42, 3.6 * s * armK], [.74, 3.6 * s * armK]] : [], armDir: -1, night, t, lightSide: o.light ?? -1 });
    S.pedestal(ctx, px, gy, 16 * s, pedH, p);
  } else {
    // Second Launch Pad: twin flood-lit lightning towers, umbilical tower with service platforms behind the vehicle
    const lh = (1.32 * v.H + v.ped) * s;
    S.lightTower(ctx, px - 33 * s, gy, lh, p, t, { night, lampSide: 1, litSide: -1 });
    S.lightTower(ctx, px + 33 * s, gy, lh, p, t + 1, { night, lampSide: -1, litSide: -1 });
    S.slpTower(ctx, px, gy - pedH * .3, s, (v.H * 1.08 + v.ped * .7) * s, p, { night, arms: armK > 0 ? [.3, .5, .66] : [] });
    S.slpPedestal(ctx, px, gy, 20 * s, pedH * 1.15, p, { night });
  }
  steam(ctx, tau, px, gy - pedH * .4, s, p);
  // exhaust: column under the vehicle, ground cloud from the ducts
  const flame = { x: rx, y: ry, k: fire, r: 40 * s };
  if (tau > 0) {
    G.smokeColumn(ctx, tau, (tb) => ({ x: px + (hash(Math.floor(tb * 60)) - .5) * 3 * s, y: gy - pedTop - alt(v, tb) * s, on: true }), { start: 0, rate: 50, life: 4, groundY: gy - pedH * .5, r0: 2 * s, grow: 4 * s, down: 18 * s, ground: 6 * s, lift: 1.5 * s, alpha: .5, color: [228, 222, 216], shadow: p.cloudSh, fire: [255, 168, 80], flame: () => flame });
    ductSmoke(ctx, tau, px, gy, s, p, { flame });
    glow(ctx, rx, gy - pedH, 70 * s, [255, 150, 60], .45 * fire);
    for (const [dx, r] of v.eng) plume(ctx, rx + dx * s, ry + .2 * s, r * s * (7 + Math.min(tau, 3) * 2), r * s * 1.6, t + dx, { glow: 1.2 });
  }
  const tint = night ? (tau > 0 ? [1.35, 1, .78] : [.78, .8, .92]) : o.pal === 'dawn' ? [1.05, .92, .86] : [1, 1, 1];
  rocket(ctx, o.veh, rx, ry, s, { light: o.light ?? -1, tint });
  // smoke in front of the pedestal once it has spread
  if (tau > 1.2) ductSmoke(ctx, tau - 1.2, px, gy + 4 * s, s * 1.1, p, { rate: 14, flame });
  if (fire > 0) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = rgba([255, 150, 70], (night ? .2 : .08) * fire); ctx.fillRect(-100, -100, W + 200, H + 200); ctx.restore(); }
  // shooting over the tops of the nearest casuarinas: out of focus, framing the bottom corners
  const fgCol = night ? mixc([6, 8, 9], [255, 140, 60], .18 * fire) : mixc(p.tree, [0, 0, 0], .45);
  ctx.save(); ctx.filter = 'blur(7px)';
  const fgo = (seed, sw) => (night ? { color: fgCol, seed, t, sway: sw, wind: .8 } : { lit: { light: lightDir, leafDark: mixc(p.tree, [0, 0, 0], .5), leaf: mixc(p.tree, [0, 0, 0], .25), leafLit: mixc(p.treeLit, [0, 0, 0], .25) }, seed, t, sway: sw, wind: .8 });
  F.casuarina(ctx, -40, H + 560, 1180, { ...fgo(101, Math.sin(t * .7)), crownBase: .55 });
  F.casuarina(ctx, W + 30, H + 620, 1250, { ...fgo(202, Math.sin(t * .6 + 1)), crownBase: .55 });
  ctx.restore();
  ctx.restore();
}
// trees and scrub flanking the cleared pad area (X lateral m, Z relative to the pad, H m)
const SIDE_TREES = (() => {
  const r = rng(808), out = [];
  for (let c = 0; c < 30; c++) {
    const sd = r() < .5 ? -1 : 1, cz = 110 + r() * 330, cxm = sd * (25 + r() * 280), n = 3 + Math.floor(r() * 7);
    for (let i = 0; i < n; i++) {
      const X = cxm + (r() - .5) * 40, Z = cz + (r() - .5) * 40;
      if (Math.hypot(X, Z * 1.1) < 112) continue;
      const tree = r() < .7;
      out.push({ X, Z, H: tree ? 13 + r() * 9 : 1.8 + r() * 2.4, kind: tree ? 'tree' : 'shrub', seed: c * 31 + i });
    }
  }
  return out;
})();

// long-lens tracking shot: the vehicle pitching downrange, its trail streaming behind
function track(ctx, lt, o) {
  const v = VEH[o.veh], p = S.PAL[o.pal], s = o.s, tau = o.tau0 + lt, t = o.t, night = o.pal === 'night';
  const a = alt(v, tau), th = o.th ?? clamp((tau - 7) * .028, 0, .5);
  const cx = 960 + Math.sin(lt * .6) * 10 + noise2(lt * 3, 1) * 3, cy = o.cy ?? 600;
  const k = clamp(a / 6000);
  const top = mixc(p.top, [6, 14, 44], k), mid = mixc(p.mid, [30, 70, 140], k);
  // the camera tilts up to follow: sky gradient, stars and horizon all slide down the frame
  const tilt = (a - alt(v, o.tau0)) * .9, hzY = (o.horizon ?? 850) + tilt;
  const dark = night || o.pal === 'dusk';
  const skyFn = (c) => {
    G.vgrad(c, [[0, top], [.7, mid], [1, mixc(p.low, mid, k * .5)]], -tilt * .25 - 200, hzY + 1);
    if (dark || k > .4) G.stars(c, t, { alpha: night ? .9 : dark ? .55 : (k - .4), milky: night, sy: tilt * 1.2 + lt * 70, wrap: true, mask: (x, y) => y < hzY });
  };
  if (hzY < H + 40) {
    // distant coast falling away below
    Wt.scene(ctx, { hy: hzY, t, f: 4000, hc: 40, cx: 960, sky: skyFn, waves: PAD_WAVES, deep: night ? [4, 8, 14] : mixc(p.sea, [0, 0, 0], .3), foam: p.foam, caps: .2, fog: 12000, sun: night ? null : { x: 1500, y: hzY - 300, i: .4, col: p.sun } });
    ctx.fillStyle = rgba(mixc(p.tree, p.haze, night ? 0 : .5)); ctx.beginPath(); ctx.moveTo(-10, hzY + 1);
    for (let x = -10; x <= 1200; x += 6) ctx.lineTo(x, hzY - 4 - 3 * noise2(x * .02, 4) - (1200 - x) * .004); ctx.lineTo(1200, hzY + 3); ctx.lineTo(-10, hzY + 24); ctx.fill();
  } else skyFn(ctx);
  // cloud decks at fixed altitudes rush down past the lens; at night they glow where the exhaust lights them
  const sb = o.sb ?? 1.8, down = Math.tan(th) * a, step = o.cloudStep ?? 170;
  const cBase = night ? [34, 36, 52] : mixc(p.cloud, p.cloudSh, .3), cLit = night ? [255, 150, 70] : p.cloud;
  for (let i = 0; i < 30; i++) {
    const ca = (o.cloudFrom ?? 250) + i * step, y = cy - (ca - a) * sb;
    if (y < -320 || y > H + 320) continue;
    for (const off of [0, 1300]) {
      const x0 = ((hash(i * 4.1) * 2600 + off - down * sb * .8) % 2600 + 2600) % 2600 - 340;
      for (let j = 0; j < 9; j++) {
        const px = x0 + j * 70 - 280, py = y - Math.sin(j * 1.7 + i) * 30;
        const near = night ? clamp(1 - Math.hypot(px - cx, py - cy - 120) / 650) : .8;
        puff(ctx, px, py, 70 + hash(i + j * 3 + off) * 80, cBase, night ? .42 : .5, cLit, near);
      }
    }
  }
  {
    const spd = (v.a0 * tau + v.j * tau * tau / 2) * 3.2;
    for (let i = 0; i < 12; i++) {
      const y = ((hash(i * 7.7) * 1800 + lt * spd) % 1800) - 360, x = hash(i * 2.3) * W;
      const lit = night ? clamp(1 - Math.hypot(x - cx, y - cy) / 700) : 0;
      ctx.save(); ctx.translate(x, y); ctx.scale(1, 3.2);
      puff(ctx, 0, 0, 60 + hash(i) * 70, night ? [50, 50, 64] : mixc(p.cloud, p.haze, .2), night ? .14 : .12, [255, 160, 80], lit);
      ctx.restore();
    }
  }
  // trail of exhaust left along the flight path
  const rN = Math.max(...v.eng.map((e) => e[1])) * (v.eng.length > 2 ? 2.6 : 2.2);
  const dir = [Math.sin(th), -Math.cos(th)], list = [];
  // sample by distance so fast vehicles still leave a continuous ribbon
  for (let age = 0, n = 0; age < 2.9 && n < 1600; n++) {
    const tb = tau - age; if (tb < 0) break;
    const dist = (a - alt(v, tb)) / Math.max(.6, Math.cos(th)) * s;
    const x = cx - dir[0] * dist + age * (o.wind ?? 18) + noise2(tb * 3, 5) * 6 * age, y = cy - dir[1] * dist + noise2(tb * 3, 9) * 4 * age;
    if (y > H + 400) break;
    const r = rN * s * (1 + 2.2 * Math.sqrt(age));
    list.push([x, y, r, age]);
    const vpx = (v.a0 * tb + v.j * tb * tb / 2) * s / Math.max(.6, Math.cos(th)) + 1;
    age += Math.min(1 / 90, r * .45 / vpx);
  }
  for (let i = list.length - 1; i >= 0; i--) {
    const [x, y, r, age] = list[i];
    puff(ctx, x, y, r, night ? mixc([120, 104, 100], [46, 42, 50], clamp(age * .8)) : mixc(o.trail ?? [236, 234, 230], p.cloudSh, clamp(age * .4)), (night ? .5 : .55) * Math.exp(-age * .45), [255, 170, 90], clamp(1 - age * 1.6) * (night ? 1 : .6));
  }
  // vehicle, rotated into its pitch-over
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(th); ctx.translate(-cx, -cy);
  shake(ctx, 1.2, lt);
  for (const [dx, r] of v.eng) plume(ctx, cx + dx * s, cy + .2 * s, r * s * (14 + k * 30), r * s * (2 + k * 3), t + dx, { diamonds: true, glow: 1.3 });
  rocket(ctx, o.veh, cx, cy, s, { light: dark ? 1 : -1, tint: night ? [1.2, .9, .75] : dark ? [1.1, .82, .8] : [1, 1, 1] });
  ctx.restore();
  glow(ctx, cx, cy + 30, 400, [255, 160, 70], dark ? .35 : .15);
}

module.exports = { pad, track, VEH, alt };
