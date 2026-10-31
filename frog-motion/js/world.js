// Sets: the pond underwater (layered depth, light, floor, weeds), the shore above water with mirrored reflections,
// the night pond with a moon path, and the over-under split.
const { W, H, TAU, clamp, lerp, hash, noise, rgba, mix, shade, ss } = require('./core');
const G = require('./gfx');
const Cm = require('./cam');
const Wt = require('./water');
const Fl = require('./flora');
const Sk = require('./sky');

const LOOKS = {
  dawn: { top: '#86b3a6', mid: '#2c6461', deep: '#0b2531', light: '#ffd7ae', ray: '#ffe6c8', motes: '#ffe9d6', mud: '#3a3424', mud2: '#1d1c14', weed: ['#294f36', '#7a9c5a'], far: '#1d4846' },
  sun: { top: '#a6e6c6', mid: '#2f8a6f', deep: '#0c3832', light: '#f6ffd6', ray: '#f2ffe0', motes: '#ecffec', mud: '#4d4a2e', mud2: '#26261a', weed: ['#2c6838', '#93cc6a'], far: '#22604f' },
  murk: { top: '#5f8a76', mid: '#1f4a40', deep: '#06191a', light: '#c8e8c0', ray: '#d0f0d0', motes: '#cfe8d8', mud: '#2c2a1c', mud2: '#141410', weed: ['#1f4029', '#55784a'], far: '#163a34' },
  night: { top: '#2f5476', mid: '#10304a', deep: '#030d18', light: '#a9c8ff', ray: '#b8d0ff', motes: '#c8d8ff', mud: '#1c1c1e', mud2: '#0c0c10', weed: ['#14302c', '#2e5048'], far: '#0e2a34' },
  winter: { top: '#b2cfdc', mid: '#41728a', deep: '#0f2a3a', light: '#eef8ff', ray: '#f0faff', motes: '#f4fbff', mud: '#3a3830', mud2: '#1c1c1c', weed: ['#30503e', '#6f8a6a'], far: '#2a5466' },
  gold: { top: '#c8e0a6', mid: '#4f8a5a', deep: '#123a2a', light: '#ffe6a8', ray: '#fff0c0', motes: '#fff4d8', mud: '#4d462a', mud2: '#26241a', weed: ['#30683a', '#a6cc6a'], far: '#2f6a4a' },
};
const look = (k) => (typeof k === 'string' ? LOOKS[k] : k);
function lookMix(a, b, k) { const A = look(a), B = look(b), o = {}; for (const key in A) o[key] = Array.isArray(A[key]) ? A[key].map((c, i) => mix(c, B[key][i], k)) : mix(A[key], B[key], k); return o; }

// ---------------------------------------------------------------- underwater
// o: {look, surf (world y of the surface on plane 1), floor (world y of the floor on plane .9), seed, weeds, rays, caus, sun}
function underSet(g, cam, t, o = {}) {
  const L = look(o.look ?? 'sun'), seed = o.seed ?? 1;
  const sy = Cm.toScreen(cam, 0, o.surf ?? -900, .55)[1];
  Wt.under(g, { top: L.top, mid: L.mid, deep: L.deep, sy, sun: o.sun ?? W * .62, rays: o.rays ?? 1, t, light: L.light, rayCol: L.ray, glow: o.glow ?? 1, lean: o.lean ?? .2 });
  // far silhouettes of weed beds (soft)
  G.layer(g, 'farweed', (b) => {
    Cm.push(b, cam, .35);
    b.globalAlpha = .55;
    for (let i = 0; i < 16; i++) {
      const x = -1500 + i * 190 + hash(seed + i) * 120, h = 260 + hash(seed + i * 3) * 380;
      Fl.ribbonWeed(b, x, (o.floor ?? 420) * .7 + 140, h, t, { n: 4, c0: L.far, c1: mix(L.far, L.mid, .5), w: 14, cur: 14, a: 1 });
    }
    b.restore();
  }, { k: 2, blur: 5, alpha: .9 });
  // depth haze
  g.fillStyle = G.lin(g, 0, 0, 0, H, [[0, L.mid, .0], [1, L.deep, .25]]); g.fillRect(0, 0, W, H);
  // floor
  if (o.floor !== null) floor(g, cam, t, { ...o, L });
  // the surface from below
  if (sy > -60) {
    g.save(); g.globalAlpha = ss(-60, 40, sy);
    Wt.surfaceBelow(g, sy, t, { top: -60, col: mix(L.top, '#ffffff', .4), far: L.top });
    g.restore();
  }
  if ((o.caus ?? 1) > 0 && sy > -300) Wt.caustics(g, 0, sy, W, 260, t, .18 * (o.caus ?? 1), { size: 360, sy: .5, ox: cam.x * .5 });
  // mid weeds
  if (o.weeds !== false) {
    Cm.push(g, cam, .8);
    for (let i = 0; i < 9; i++) {
      const x = -1100 + i * 280 + hash(seed * 7 + i) * 160, fy = (o.floor ?? 420) + 20;
      if (hash(seed + i * 11) > .5) Fl.elodea(g, x, fy, 300 + hash(seed + i) * 260, t, { c: L.weed[0], c2: L.weed[1], cur: 12 });
      else Fl.ribbonWeed(g, x, fy, 380 + hash(seed + i * 5) * 300, t, { n: 4, c0: L.weed[0], c1: L.weed[1], w: 12, a: .85 });
    }
    g.restore();
  }
  Wt.motes(g, cam, t, { col: L.motes, a: o.motes ?? 1 });
}
function floor(g, cam, t, o) {
  const L = o.L, fy = o.floor ?? 420, seed = o.seed ?? 1;
  Cm.push(g, cam, .9);
  g.fillStyle = G.lin(g, 0, fy - 30, 0, fy + 600, [[0, L.mud], [.3, mix(L.mud, L.mud2, .6)], [1, L.mud2]]);
  g.beginPath(); g.moveTo(-2400, fy + 2000);
  for (let x = -2400; x <= 2400; x += 40) g.lineTo(x, fy + noise(x * .004, seed) * 26 + noise(x * .02, seed + 3) * 6);
  g.lineTo(2400, fy + 2000); g.closePath(); g.fill();
  for (let i = 0; i < 26; i++) {
    const x = -2200 + hash(seed * 3 + i) * 4400, y = fy + 14 + hash(seed * 5 + i) * 90, r = 20 + hash(seed + i * 9) * 60;
    Fl.stone(g, x, y, r, r * .55, seed * 100 + i, { c: mix(L.mud, '#8a8a78', .45), algae: L.weed[1], nAlgae: 18, t });
  }
  for (let i = 0; i < 60; i++) {
    const x = -2200 + hash(seed * 13 + i) * 4400, y = fy + 6 + hash(seed * 17 + i) * 110;
    Fl.leaf(g, x, y, .8 + hash(i) * .9, hash(i + 3) * TAU, mix('#6a4a24', L.mud, .5), { flip: .45 });
  }
  g.restore();
  // caustics dancing on the floor
  const top = Cm.toScreen(cam, 0, fy, .9)[1];
  if (top < H && (o.caus ?? 1) > 0) Wt.caustics(g, 0, top - 10, W, H - top + 10, t, .3 * (o.caus ?? 1), { size: 300, sy: .45, ox: cam.x * .9 });
}
// big blurred weeds right in front of the lens
function underFront(g, cam, t, o = {}) {
  const L = look(o.look ?? 'sun'), seed = o.seed ?? 4;
  G.layer(g, 'frontweed', (b) => {
    Cm.push(b, cam, 1.6);
    for (let i = 0; i < (o.n ?? 3); i++) {
      const x = (o.xs ?? [-700, 520, 980])[i] + hash(seed + i) * 80;
      Fl.ribbonWeed(b, x, 900, 1100 + hash(seed + i * 3) * 300, t, { n: 3, c0: shade(L.weed[0], -.4), c1: L.weed[0], w: 34, cur: 30, a: 1 });
    }
    b.restore();
  }, { k: 3, blur: 7, alpha: o.a ?? .9 });
}

// ---------------------------------------------------------------- above water (shore at horizon hy, waterline wy)
// returns nothing; draws sky, trees, reeds, and the receding water surface with reflections between hy and wy
function aboveSet(g, cam, t, o = {}) {
  const sky = o.sky ?? 'dawn', hy = o.hy ?? 430, wy = o.wy ?? H;
  const SRC = G.buf('aboveSrc', W, H), b = SRC.g;
  if (o.skyMix) Sk.skyMix(b, sky, o.skyMix[0], o.skyMix[1], -100, hy + 20); else Sk.sky(b, sky, -100, hy + 20);
  if (o.stars) Sk.stars(b, t, o.stars, { y1: hy });
  if (o.moon) Sk.moon(b, o.moon[0], o.moon[1], o.moon[2], 1);
  if (o.sun) Sk.sun(b, o.sun[0], o.sun[1], o.sun[2], o.sun[3] ?? 1, o.sunCol);
  if (o.clouds) G.layer(b, 'clouds', (c) => { for (let i = 0; i < 6; i++) Sk.cloud(c, ((hash(i) * 1400 + t * 8 - cam.x * .05) % 1500) - 200, 120 + hash(i + 4) * 200, 260 + hash(i + 2) * 200, i, o.cloudCol ?? '#fff4ea', .8, o.cloudShadow ?? '#5a4a6a'); }, { k: 2, blur: 6 });
  const tc = o.trees ?? ['#33405a', '#22303c'];
  const plane = (p, fn) => { const [xl0, yl] = Cm.fromScreen(cam, -300, hy, p), [xl1] = Cm.fromScreen(cam, W + 300, hy, p); Cm.push(b, cam, p); fn(xl0, xl1, yl); b.restore(); };
  plane(.12, (x0, x1, y) => Sk.treeline(b, y - 6, 3, tc[0], { amp: 70, scale: 1.4, x0, x1, firs: o.firs }));
  Sk.mist(b, hy - 30, t, o.mist ?? .4, { col: o.mistCol ?? '#ffe6dc' });
  plane(.25, (x0, x1, y) => Sk.treeline(b, y + 4, 9, tc[1], { amp: 46, scale: 1, x0, x1 }));
  if (o.reeds !== false) plane(.5, (x0, x1, y) => Fl.reedBed(b, 11, x0, x1, y + 10, 120, t, { spacing: 37, sil: o.reedSil, wind: .6 }));
  g.drawImage(SRC.cv, 0, 0);
  // receding water surface reflecting the shore
  if (wy > hy) {
    g.save(); g.beginPath(); g.rect(0, hy + 6, W, wy - hy - 6 + 400); g.clip();
    const sk = Sk.SKIES[sky];
    g.fillStyle = G.lin(g, 0, hy, 0, wy, [[0, sk[sk.length - 2][1]], [1, mix(sk[1][1], o.waterDeep ?? '#1d3a44', .55)]]); g.fillRect(0, hy, W, wy - hy + 400);
    Wt.reflect(g, SRC.cv, hy + 8, t, { a: .6, amp: 5, depth: Math.min(H - hy, 620) });
    g.fillStyle = G.lin(g, 0, hy, 0, wy, [[0, '#ffffff', .05], [1, o.waterDeep ?? '#1d3a44', .35]]); g.fillRect(0, hy, W, wy - hy + 400);
    // sparkle ripples on the surface
    g.globalCompositeOperation = 'screen';
    for (let i = 0; i < 70; i++) {
      const u = hash(i * 3 + 1), y = lerp(hy + 10, wy, Math.pow(u, 1.6)), x = ((hash(i) * W * 1.4 + t * 14 * (1 + u)) % (W * 1.4)) - W * .2, w = lerp(8, 60, u);
      g.strokeStyle = rgba(o.glint ?? '#fff2e0', .25 * (.5 + .5 * Math.sin(t * 2 + i))); g.lineWidth = lerp(.8, 2.2, u);
      g.beginPath(); g.moveTo(x - w / 2, y); g.lineTo(x + w / 2, y); g.stroke();
    }
    g.restore();
  }
}

// over-under: below() drawn under the wavy waterline at screen wy, above() over it, meniscus on top
function overUnder(g, wy, t, above, below, o = {}) {
  g.save(); Wt.clipWater(g, wy, t, true, o.amp ?? 1); below(g); g.restore();
  g.save(); Wt.clipWater(g, wy, t, false, o.amp ?? 1); above(g); g.restore();
  Wt.meniscus(g, wy, t, { amp: o.amp ?? 1, under: o.under ?? '#c9fff0' });
}

// moon path glitter on a dark surface
function glitter(g, x, y0, y1, t, a = 1, col = '#e8f0ff') {
  g.save(); g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 120; i++) {
    const u = hash(i + 7), y = lerp(y0, y1, Math.pow(u, 1.3)), sp = lerp(10, 90, u), xx = x + (hash(i + 3) - .5) * sp * 2 + Math.sin(t * 1.5 + i) * 6;
    const fl = .5 + .5 * Math.sin(t * (2 + hash(i) * 4) + i * 2), w = lerp(4, 40, u) * (.5 + fl * .5);
    g.strokeStyle = rgba(col, a * fl * lerp(.4, .9, u)); g.lineWidth = lerp(1, 2.6, u);
    g.beginPath(); g.moveTo(xx - w / 2, y); g.lineTo(xx + w / 2, y); g.stroke();
  }
  g.restore();
}

module.exports = { LOOKS, look, lookMix, underSet, floor, underFront, aboveSet, overUnder, glitter };
