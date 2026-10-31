// Worlds: time-of-day skies with sun/moon/stars/clouds and god rays, out-of-focus bokeh, a parallax meadow, an autumn
// landscape for the migration, misty Mexican mountains with oyamel fir trees (that can be covered in monarchs), twigs.
const { C, W, H, TAU, clamp, lerp, ss, hash, noise1, rgba, mix, rng, PAL } = require('./core');
const D = require('./draw');
const P = require('./plants');

const screen = (ctx) => ctx.setTransform(1, 0, 0, 1, 0, 0);

// ------------------------------------------------------------------ sky
const SKY = [ // tod: 0 night, .27 dawn, .5 noon, .75 sunset, 1 night
  [0, '#070b22', '#141c44', '#232c5a'],
  [.2, '#1b2462', '#5d4a96', '#e08a8c'],
  [.27, '#34489a', '#c07aaa', '#ffb487'],
  [.36, '#4f93d8', '#9dd0f2', '#ffe4b8'],
  [.5, '#3d8fdc', '#8ccaf2', '#dff4fb'],
  [.62, '#4b8fd2', '#a2cdea', '#ffe6b8'],
  [.7, '#3d5fae', '#e39a7a', '#ffc86e'],
  [.75, '#2e2f78', '#c0548a', '#ffa25a'],
  [.84, '#0d1440', '#2a2c66', '#5a3c6a'],
  [1, '#070b22', '#141c44', '#232c5a'],
];
function skyCols(tod) {
  tod = ((tod % 1) + 1) % 1;
  for (let i = 1; i < SKY.length; i++) if (tod <= SKY[i][0]) {
    const [a, ...A] = SKY[i - 1], [b, ...B] = SKY[i], u = (tod - a) / (b - a);
    return A.map((c, k) => mix(c, B[k], u));
  }
  return SKY[0].slice(1).map((c) => mix(c, c, 0));
}
const daylight = (tod) => { tod = ((tod % 1) + 1) % 1; return ss(.17, .34, tod) * (1 - ss(.7, .86, tod)); };
const warmth = (tod) => { tod = ((tod % 1) + 1) % 1; return Math.exp(-(((tod - .27) / .07) ** 2)) + Math.exp(-(((tod - .73) / .06) ** 2)); };
function tint(c, tod) { const dl = daylight(tod), wm = warmth(tod); return mix(mix(c, '#141c44', (1 - dl) * .75), '#ff9060', wm * .18); }

function sky(ctx, tod, o = {}) {
  ctx.save(); screen(ctx);
  const [top, mid, low] = o.cols ?? skyCols(tod), hz = o.horizon ?? 760;
  const g = ctx.createLinearGradient(0, o.top ?? 0, 0, hz);
  g.addColorStop(0, rgba(top)); g.addColorStop(.55, rgba(mid)); g.addColorStop(1, rgba(low));
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  const night = clamp(1 - daylight(tod) * 1.25 - warmth(tod) * .7) * (o.stars ?? 1);
  if (night > 0) {
    for (let i = 0; i < 220; i++) {
      const x = ((hash(i * 3 + 1) * W + (o.px ?? 0) * (.2 + hash(i) * .2)) % W + W) % W, y = hash(i * 3 + 2) * hz * .9 + (o.py ?? 0) * .2, tw = .55 + .45 * Math.sin((o.t ?? 0) * (2 + hash(i) * 3) + i);
      const r = .6 + Math.pow(hash(i * 3 + 3), 3) * 2.2;
      D.dot(ctx, x, y, r, '#fff8e8', night * tw * (.35 + hash(i * 7) * .65));
      if (r > 2) D.glow(ctx, x, y, r * 5, '#cfe0ff', night * .25 * tw);
    }
  }
  ctx.restore();
}
function sun(ctx, x, y, r, a = 1, o = {}) {
  if (a <= 0) return;
  ctx.save(); screen(ctx);
  D.glow(ctx, x, y, r * 7, o.glow ?? '#ffcf6a', .5 * a);
  D.glow(ctx, x, y, r * 2.6, '#fff1b8', .7 * a);
  const g = ctx.createRadialGradient(x - r * .3, y - r * .3, r * .1, x, y, r);
  g.addColorStop(0, rgba('#fffbe0', a)); g.addColorStop(.6, rgba(o.col ?? '#ffe07a', a)); g.addColorStop(1, rgba(o.col2 ?? '#ffb43a', a));
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
  ctx.restore();
}
// soft beams fanning out from a light source (screen space, additive)
function rays(ctx, x, y, a, t, o = {}) {
  if (a <= 0) return;
  ctx.save(); screen(ctx); ctx.globalCompositeOperation = 'lighter';
  const n = o.n ?? 14, L = o.len ?? 1500;
  for (let i = 0; i < n; i++) {
    const ang = (o.a0 ?? 0) + (hash(i + 3) - .5) * (o.spread ?? TAU) + Math.sin(t * .2 + i) * .03, w = (.025 + hash(i + 7) * .05) * (o.w ?? 1);
    const g = ctx.createLinearGradient(x, y, x + Math.cos(ang) * L, y + Math.sin(ang) * L);
    const k = a * (.35 + .65 * (.5 + .5 * Math.sin(t * (.6 + hash(i) * .8) + i * 2)));
    g.addColorStop(0, rgba(o.col ?? '#fff0c0', .16 * k)); g.addColorStop(1, rgba(o.col ?? '#fff0c0', 0));
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(ang - w) * L, y + Math.sin(ang - w) * L); ctx.lineTo(x + Math.cos(ang + w) * L, y + Math.sin(ang + w) * L); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}
function moon(ctx, x, y, r, a = 1) {
  if (a <= 0) return;
  ctx.save(); screen(ctx);
  D.glow(ctx, x, y, r * 5, '#cfe0ff', .35 * a);
  ctx.fillStyle = rgba('#fff8e2', a); ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
  ctx.fillStyle = rgba('#e3d7bc', .6 * a);
  for (const [dx, dy, rr] of [[-.3, -.2, .22], [.25, .2, .16], [.1, -.4, .1], [-.1, .35, .12]]) { ctx.beginPath(); ctx.arc(x + dx * r, y + dy * r, rr * r, 0, TAU); ctx.fill(); }
  ctx.restore();
}
// soft shaded cloud sprites drifting across the sky; the whole layer is tinted at once (gold over rose at dawn and
// dusk, slate at night)
function clouds(ctx, tod, t, o = {}) {
  const TR = require('./trees'), CL = TR.clouds(), dl = daylight(tod), wm = warmth(tod);
  const g = layerBegin(), n = o.n ?? 6;
  for (let i = 0; i < n; i++) {
    const sp = 5 + hash(i + 70) * 9, x = ((hash(i + 71) * 1800 + t * sp + (o.px ?? 0) * (.3 + hash(i) * .3)) % 1800 + 1800) % 1800 - 360, y = (o.y0 ?? 110) + hash(i + 72) * (o.yr ?? 260) + (o.py ?? 0) * .3;
    const s = (o.s ?? 1) * (.55 + hash(i + 73) * .7);
    TR.drawSprite(g, CL[i % CL.length], x, y + 60 * s, 200 * s, { flip: i % 2 === 1 });
  }
  const night = clamp(1 - dl), w = clamp(wm * (1 - night * .6));
  if (night > .02 || w > .02) {
    const top = mix('#ffd890', '#2a3266', night), bot = mix('#ff8a9a', '#1a2050', night), a = clamp(Math.max(night * .78, w * .55));
    layerEnd(ctx, { grad: [[0, top, a * .8], [1, bot, a]], hazeTop: o.y0 ?? 110, hazeBot: (o.y0 ?? 110) + (o.yr ?? 260) + 120, alpha: o.a ?? .95 });
  } else layerEnd(ctx, { alpha: o.a ?? .95 });
}
// lens flare: ghosts strung along the line from the light through the frame centre
function flare(ctx, x, y, a, o = {}) {
  if (a <= .01) return;
  ctx.save(); screen(ctx); ctx.globalCompositeOperation = 'lighter';
  const dx = 540 - x, dy = 540 - y;
  D.glow(ctx, x, y, 260, o.col ?? '#ffd8a0', .35 * a);
  ctx.strokeStyle = rgba('#fff0d0', .25 * a); ctx.lineWidth = 2; D.line(ctx, x - 420, y, x + 420, y);
  for (const [u, r, col, al] of [[.35, 36, '#ffb070', .16], [.6, 16, '#a0d0ff', .22], [.9, 70, '#ffd080', .08], [1.25, 26, '#c0a0ff', .16], [1.6, 110, '#80c0ff', .06], [1.9, 20, '#ffe0a0', .2]]) {
    const px = x + dx * u, py = y + dy * u;
    ctx.fillStyle = rgba(col, al * a);
    ctx.beginPath(); for (let k = 0; k < 6; k++) { const an = k * TAU / 6 + .3; ctx.lineTo(px + Math.cos(an) * r, py + Math.sin(an) * r); } ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}

// out-of-focus discs of light (screen space); par = parallax against camera position
function bokeh(ctx, t, o = {}) {
  ctx.save(); screen(ctx);
  if (o.add !== false) ctx.globalCompositeOperation = 'lighter';
  const n = o.n ?? 22, cols = o.cols ?? ['#ffe9a8', '#bff0a0', '#ffffff'], cx = o.cx ?? 0, cy = o.cy ?? 0;
  for (let i = 0; i < n; i++) {
    const h1 = hash(i * 5 + (o.seed ?? 0)), h2 = hash(i * 5 + 1 + (o.seed ?? 0)), h3 = hash(i * 5 + 2 + (o.seed ?? 0));
    const r = (o.r0 ?? 18) + h3 * (o.r1 ?? 70), span = W + 400, par = (o.par ?? .3) * (.5 + h3);
    const x = ((h1 * span - cx * par + Math.sin(t * .3 + i) * 20) % span + span) % span - 200;
    const y = ((h2 * span - cy * par + Math.cos(t * .25 + i) * 16) % span + span) % span - 200;
    const a = (o.a ?? .22) * (.4 + .6 * hash(i * 5 + 3)) * (.75 + .25 * Math.sin(t * 1.3 + i));
    const col = cols[i % cols.length];
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, rgba(col, a * .55)); g.addColorStop(.82, rgba(col, a * .75)); g.addColorStop(.92, rgba(col, a)); g.addColorStop(1, rgba(col, 0));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
  }
  ctx.restore();
}
// floating pollen / dust motes catching the light
function motes(ctx, t, o = {}) {
  ctx.save(); screen(ctx); ctx.globalCompositeOperation = 'lighter';
  const n = o.n ?? 40;
  for (let i = 0; i < n; i++) {
    const x = ((hash(i * 7 + 1) * 1300 + t * (8 + hash(i) * 14) - (o.cx ?? 0) * .6) % 1300 + 1300) % 1300 - 110;
    const y = ((hash(i * 7 + 2) * 1300 - t * (6 + hash(i + 1) * 10) - (o.cy ?? 0) * .6) % 1300 + 1300) % 1300 - 110;
    const tw = .5 + .5 * Math.sin(t * 2 + i * 3);
    D.glow(ctx, x + Math.sin(t + i) * 8, y, 5 + hash(i + 3) * 7, o.col ?? '#fff3c4', (o.a ?? .5) * tw);
  }
  ctx.restore();
}

// ------------------------------------------------------------------ land
function hillLine(x0, x1, base, amp, freq, seed, step = 20) {
  const o = [];
  for (let x = x0; x <= x1; x += step) o.push([x, base - amp * (.55 + .45 * noise1(x * freq, seed)) - amp * .25 * noise1(x * freq * 3.1, seed + 5)]);
  return o;
}
function band(ctx, pts, bottom, col, a = 1) {
  ctx.beginPath(); ctx.moveTo(pts[0][0], bottom);
  for (const p of pts) ctx.lineTo(p[0], p[1]);
  ctx.lineTo(pts[pts.length - 1][0], bottom); ctx.closePath();
  ctx.fillStyle = typeof col === 'string' || Array.isArray(col) ? rgba(col, a) : col; ctx.fill();
}
// ------------------------------------------------------------------ layer compositing: each landscape layer is painted
// into an offscreen canvas, hazed toward the horizon colour (atmospheric perspective), then composited (optionally blurred)
let OFF = null;
function layerBegin() {
  if (!OFF) { const cv = C.createCanvas(W, H); OFF = [cv, cv.getContext('2d')]; }
  const g = OFF[1];
  g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1; g.filter = 'none'; g.clearRect(0, 0, W, H);
  return g;
}
function layerEnd(ctx, o = {}) {
  const [cv, g] = OFF;
  if (o.haze > 0 || o.stops || o.grad) {
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'source-atop';
    const hg = g.createLinearGradient(0, o.hazeTop ?? 300, 0, o.hazeBot ?? H);
    if (o.grad) for (const [u, col, al] of o.grad) hg.addColorStop(u, rgba(col, al));
    else if (o.stops) for (const [u, al] of o.stops) hg.addColorStop(u, rgba(o.hazeCol, al));
    else { hg.addColorStop(0, rgba(o.hazeCol, o.haze)); hg.addColorStop(1, rgba(o.hazeCol, o.haze * (o.hazeFall ?? .45))); }
    g.fillStyle = hg; g.fillRect(0, 0, W, H); g.restore();
  }
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = o.alpha ?? 1;
  if (o.blur) ctx.filter = `blur(${o.blur.toFixed(1)}px)`;
  ctx.drawImage(cv, 0, 0); ctx.restore();
}
const layerZ = (c, k) => lerp(1, c.z, k);
function layerT(g, c, k) { const z = layerZ(c, k); g.setTransform(z, 0, 0, z, W / 2 - z * (c.x * k + 540 * (1 - k)), H / 2 - z * (c.y * k + 540 * (1 - k))); }
// visible world-x range of a layer (with margin)
function layerX(c, k, m = 300) { const z = layerZ(c, k), cx = c.x * k + 540 * (1 - k); return [cx - 540 / z - m, cx + 540 / z + m]; }
const at = (pts, x) => pts[Math.max(0, Math.min(pts.length - 1, Math.round((x - pts[0][0]) / (pts[1][0] - pts[0][0]))))];
// a hill band with a vertical gradient and a sunlit crest
function hill(g, pts, colTop, colBot, rim) {
  let top = 1e9; for (const p of pts) top = Math.min(top, p[1]);
  g.beginPath(); g.moveTo(pts[0][0], 3200); for (const p of pts) g.lineTo(p[0], p[1]); g.lineTo(pts[pts.length - 1][0], 3200); g.closePath();
  const gr = g.createLinearGradient(0, top, 0, top + 460); gr.addColorStop(0, rgba(colTop)); gr.addColorStop(1, rgba(colBot));
  g.fillStyle = gr; g.fill();
  if (rim) { g.strokeStyle = rgba(rim[0], rim[1]); g.lineWidth = rim[2] ?? 3; g.lineJoin = 'round'; g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.stroke(); }
}
const HF = hillLine(-3000, 4000, 640, 110, .0015, 3), HM = hillLine(-3000, 4000, 700, 80, .0023, 7), HN = hillLine(-3000, 4000, 760, 46, .003, 11);
const SEASON = { summer: ['summer', 'summer', 'spring', 'summer'], spring: ['spring', 'spring', 'summer'], autumn: ['red', 'orange', 'yellow', 'mixed', 'orange'] };

// the static far and mid meadow layers are painted once per season into wide strips (plus blurred twins for depth of
// field) so every frame can afford hundreds of trees: a continuous woodland edge along the far crest (undergrowth hides
// the trunks), and groves, lone trees and hedgerows on the mid hills
const STRIP = {};
function strip(x0, y0, w, h, blurPx, fn) {
  const cv = C.createCanvas(w, h), g = cv.getContext('2d'); g.translate(-x0, -y0); fn(g);
  const b = C.createCanvas(w, h), bg = b.getContext('2d'); bg.filter = `blur(${blurPx}px)`; bg.drawImage(cv, 0, 0);
  return { cv, blur: b, x0, y0 };
}
function meadowStrips(season) {
  if (STRIP[season]) return STRIP[season];
  const TR = require('./trees'), L = TR.leaves(), pals = SEASON[season], au = season === 'autumn' ? 1 : 0;
  const pick = (i, shapes) => L[pals[i % pals.length]][shapes[Math.floor(hash(i + 77) * shapes.length)]];
  const far = strip(-1900, 360, 4900, 640, 2.5, (g) => {
    hill(g, HF, mix('#a6bcd8', '#c8a8b0', au * .4), mix('#8ea6c8', '#a88ca0', au * .4));
    for (let i = 0; i < 300; i++) {
      const x = -1880 + i * 16 + hash(i + 300) * 12; if (noise1(x * .0025, 4) < -.62) continue;
      TR.drawSprite(g, pick(i, [0, 1, 3]), x, at(HF, x)[1] + 24 + hash(i + 303) * 16, 40 + hash(i + 301) * 52, { flip: hash(i + 302) < .5 });
    }
  });
  const mid = strip(-2700, 330, 6300, 800, 4, (g) => {
    hill(g, HM, mix('#92c472', '#d0a050', au * .9), mix('#5c9446', '#a87838', au * .9), ['#f0ffd0', .35, 3]);
    g.save(); g.beginPath(); g.moveTo(HM[0][0], 3200); for (const p of HM) g.lineTo(p[0], p[1]); g.lineTo(4000, 3200); g.closePath(); g.clip();
    for (let i = 0; i < 26; i++) {
      const x = -2600 + i * 260;
      g.fillStyle = rgba(mix(['#c8b45e', '#a8c870', '#86b464', '#b8c068'][i % 4], ['#d89a40', '#c87a30', '#e0b050', '#b88a3a'][i % 4], au), .5);
      g.beginPath(); g.moveTo(x, 600); g.lineTo(x + 230, 600); g.lineTo(x + 340, 900); g.lineTo(x + 50, 900); g.closePath(); g.fill();
    }
    g.restore();
    const hp = (i) => pals[i % pals.length], crestY = (x) => at(HM, x)[1] + 52;
    for (let i = 0; i < 26; i++) { // hedgerows running down the slope along the field edges
      const xb = -2600 + i * 260; if (hash(i + 520) < .3) continue;
      const pts = []; for (let y = at(HM, xb)[1] + 30; y < 920; y += 24) pts.push([xb + (y - 600) / 300 * 50 + (hash(i * 40 + y) - .5) * 10, y]);
      if (pts.length > 1) TR.hedge(g, pts, hp(i), i + 50, 10 + (pts[0][1] - 600) * .01);
    }
    const trees = [];
    for (let gi = 0; gi < 18; gi++) {
      const gx = -2500 + gi * 330 + hash(gi + 700) * 200, n = 1 + Math.floor(hash(gi + 701) * 7);
      for (let j = 0; j < n; j++) { const x = gx + (hash(gi * 13 + j) - .5) * 70 * (n + 1); trees.push([at(HM, x)[1] + 10 + hash(gi * 17 + j) * 44, x, gi * 10 + j]); }
    }
    trees.sort((p, q) => p[0] - q[0]);
    const tree = ([y, x, i]) => TR.drawSprite(g, pick(i + 40, [0, 1, 2, 3]), x, y, (80 + hash(i + 3) * 120) * (1 + (y - at(HM, x)[1]) / 200), { flip: hash(i + 4) < .5 });
    trees.filter(([y, x]) => y < crestY(x)).forEach(tree);
    TR.hedge(g, HM.filter((p, i) => i % 2 === 0).map(([x]) => [x, crestY(x) + (hash(x) - .5) * 6]), hp(1), 99, 15);
    trees.filter(([y, x]) => y >= crestY(x)).forEach(tree);
  });
  return (STRIP[season] = { far, mid });
}
function drawStrip(g, s, blur, filt) { if (filt) g.filter = filt; g.drawImage(blur ? s.blur : s.cv, s.x0, s.y0); g.filter = 'none'; }

// a parallax meadow: far range with a woodland edge, mid hills with groves and hedgerows, a near flowery slope with big
// framing trees; c = camera {x,y,z}; o.season summer|spring|autumn (o.autumn=1 means autumn), o.dof = depth of field
function meadow(ctx, c, t, tod, o = {}) {
  const TR = require('./trees'), L = TR.leaves();
  const season = o.season ?? (o.autumn ? 'autumn' : 'summer'), pals = SEASON[season], au = season === 'autumn' ? 1 : 0;
  const filt = TR.todFilter(daylight(tod), warmth(tod)), hazeCol = o.hazeCol ?? skyCols(tod)[2], ST = meadowStrips(season), dof = o.dof ?? 0;
  const sway = (i, a = 1) => (Math.sin(t * 1.3 + i * 1.7) * .02 + Math.sin(t * 3.1 + i) * .006) * a;
  let g = layerBegin(); layerT(g, c, .14); drawStrip(g, ST.far, dof > 0, filt);
  layerEnd(ctx, { haze: .5, hazeCol });
  g = layerBegin(); layerT(g, c, .3); drawStrip(g, ST.mid, dof > 0, filt);
  layerEnd(ctx, { haze: .2, hazeCol });
  // near slope: flowers, and big trees framing the edges
  g = layerBegin(); layerT(g, c, .5);
  hill(g, HN, tint(mix('#78b456', '#c0a24c', au * .8), tod), tint(mix('#4a8a3a', '#8a7432', au * .8), tod), [tint('#f4ffd8', tod), .3, 4]);
  const r = rng(9), [x0, x1] = layerX(c, .5);
  for (let i = 0; i < 380; i++) {
    const x = -1200 + r() * 3400, yy = at(HN, x)[1] + 8 + Math.pow(r(), 1.5) * 300, rr = 2 + r() * 3.4;
    if (x < x0 || x > x1) continue;
    D.dot(g, x + Math.sin(t * 1.6 + i) * 2, yy, rr * (1 + dof * .12), tint(au ? ['#ffcf6a', '#e8a040', '#ffffff', '#d0704a', '#f0d060'][i % 5] : ['#ff9ec4', '#fff2a8', '#ffffff', '#c39cff', '#ffb35a'][i % 5], tod), .85 / (1 + dof * .1));
  }
  for (const [x, h, i] of [[-60, 470, 1], [1170, 420, 3], [-430, 330, 2], [-760, 430, 5], [1520, 420, 4], [1830, 360, 6], [-1100, 380, 7], [2150, 400, 8]]) {
    if (x < x0 - 200 || x > x1 + 200) continue;
    TR.drawSprite(g, L[pals[i % pals.length]][[0, 3, 1][i % 3]], x, at(HN, x)[1] + 50, h, { sway: sway(i), flip: i % 2 === 0, filter: filt, blur: dof > 0 });
  }
  layerEnd(ctx, { haze: .07, hazeCol });
  if (o.mist) { screen(ctx); const mg = ctx.createLinearGradient(0, 480, 0, 820); mg.addColorStop(0, rgba('#ffffff', 0)); mg.addColorStop(.6, rgba(o.mistCol ?? '#ffe8d8', o.mist * .45)); mg.addColorStop(1, rgba('#ffffff', 0)); ctx.fillStyle = mg; ctx.fillRect(0, 0, W, H); }
}

// ------------------------------------------------------------------ autumn countryside from high above (migration)
// a ground plane in perspective: depth d (1 = bottom of frame .. 14 = horizon); features live at (X, d)
function autumnLand(ctx, c, t, o = {}) {
  const TR = require('./trees'), L = TR.leaves();
  const tod = o.tod ?? .62, filt = TR.todFilter(daylight(tod), warmth(tod)), hazeCol = skyCols(tod)[2];
  const pals = ['red', 'orange', 'yellow', 'mixed', 'orange', 'summer', 'red'];
  const hz = o.horizon ?? 330, K = 780, camX = c.x * 1.3;
  const Y = (d) => hz + K / d, S = (d) => 1.4 / d, SX = (X, d) => 540 + (X - camX) * S(d);
  const riverX = (d) => 260 * Math.sin(d * .55 + 1.2) + 120 * Math.sin(d * 1.3) + 900;
  const g = layerBegin();
  // patchwork fields: rows of plots, each row's plot boundaries offset so they never line up
  for (let d = 16, row = 0; d > .85; row++) {
    const len = d > 6 ? 1 : .5, d2 = Math.max(.85, d - len), y1 = Y(d), y2 = Y(d2), s1 = S(d), s2 = S(d2);
    const step = 380 + hash(row * 7 + 1) * 160, off = hash(row * 7 + 2) * step, X0 = camX - 540 / s2 - step, X1 = camX + 540 / s2 + step;
    for (let k = Math.floor((X0 - off) / step); k * step + off < X1; k++) {
      const B = (m) => m * step + off + (hash(row * 31 + m) - .5) * 120, Xa = B(k), Xb = B(k + 1) + 2, q = hash(k * 131 + row * 977);
      const col = ['#e2b85a', '#c98a3c', '#b8a050', '#9ab060', '#d8763a', '#e8c878', '#a87a40', '#c8a868'][Math.floor(q * 8)];
      const xa1 = 540 + (Xa - camX) * s1, xb1 = 540 + (Xb - camX) * s1, xa2 = 540 + (Xa - camX) * s2, xb2 = 540 + (Xb - camX) * s2;
      g.fillStyle = rgba(tint(col, tod)); g.beginPath(); g.moveTo(xa1, y1); g.lineTo(xb1, y1); g.lineTo(xb2, y2 + 1); g.lineTo(xa2, y2 + 1); g.closePath(); g.fill();
      if (d2 < 7) { // furrows: some plots ploughed toward the horizon, others across
        g.strokeStyle = rgba(tint(mix(col, '#4a2e12', .3), tod), .35); g.lineWidth = Math.max(.6, s2 * 2.5); g.beginPath();
        if (q < .5) for (let m = 1; m < 6; m++) { const u = m / 6; g.moveTo(lerp(xa1, xb1, u), y1); g.lineTo(lerp(xa2, xb2, u), y2); }
        else for (let m = 1; m < 4; m++) { const dd = lerp(d, d2, m / 4), yy = Y(dd), ss2 = S(dd); g.moveTo(540 + (Xa - camX) * ss2, yy); g.lineTo(540 + (Xb - camX) * ss2, yy); }
        g.stroke();
      }
      g.strokeStyle = rgba(tint('#6a5a2a', tod), .45); g.lineWidth = Math.max(.6, s2 * 5); g.beginPath(); g.moveTo(xa1, y1); g.lineTo(xa2, y2); g.stroke();
      // a farmstead now and then
      if (q > .93 && d2 < 9) {
        const dm = (d + d2) / 2, bx = 540 + (Xa + step * .3 - camX) * S(dm), by = Y(dm), u = S(dm) * 30;
        g.fillStyle = rgba(tint('#b03a2e', tod)); g.fillRect(bx - u * 1.2, by - u * 1.1, u * 2.4, u * 1.1);
        g.fillStyle = rgba(tint('#5a3a30', tod)); g.beginPath(); g.moveTo(bx - u * 1.4, by - u * 1.05); g.lineTo(bx, by - u * 1.9); g.lineTo(bx + u * 1.4, by - u * 1.05); g.closePath(); g.fill();
        g.fillStyle = rgba(tint('#e8e0d0', tod)); g.fillRect(bx + u * 1.6, by - u * 2.2, u * .6, u * 2.2);
        g.fillStyle = rgba(tint('#8a8a90', tod)); g.beginPath(); g.ellipse(bx + u * 1.9, by - u * 2.2, u * .3, u * .14, 0, 0, TAU); g.fill();
      }
    }
    d = d2;
  }
  // a country road running away from us, and the river winding toward us
  g.strokeStyle = rgba(tint('#d8ccb0', tod), .9);
  for (let d = 16; d > .85; d -= .1) { const d2 = d - .1; g.lineWidth = 26 * S(d2); g.beginPath(); g.moveTo(SX(200, d), Y(d)); g.lineTo(SX(200, d2), Y(d2)); g.stroke(); }
  g.lineCap = 'round'; g.lineJoin = 'round';
  for (const [w, col, a] of [[80, '#5a7a4a', .85], [56, '#7cbce6', 1], [10, '#ffffff', .4]]) {
    g.strokeStyle = rgba(tint(col, tod), a); g.beginPath();
    for (let d = 16; d > .85; d -= .08) { const d2 = d - .08; g.lineWidth = w * S(d2); g.beginPath(); g.moveTo(SX(riverX(d), d), Y(d)); g.lineTo(SX(riverX(d2), d2), Y(d2)); g.stroke(); }
  }
  // the sun glinting on the water
  for (let i = 0; i < 6; i++) { const d = 2 + i * 1.6 + Math.sin(t + i) * .1; D.glow(g, SX(riverX(d), d), Y(d), 26 * S(d) * 3, '#fff6d8', .35 + .25 * Math.sin(t * 3 + i * 2)); }
  // woods: clumps of fall-coloured trees, drawn far to near
  const items = [];
  for (let w = 0; w < 90; w++) {
    const d = 1 + hash(w + 900) * 14, X = 900 + (hash(w + 901) - .5) * 1500 * d;
    if (Math.abs(X - riverX(d)) < 160) continue;
    const n = 6 + Math.floor(hash(w + 902) * 14);
    for (let i = 0; i < n; i++) { const a = hash(w * 37 + i) * TAU, rr = Math.sqrt(hash(w * 37 + i + 5)) * 240; items.push([d + Math.sin(a) * rr * .002 * d, X + Math.cos(a) * rr, w * 7 + i]); }
  }
  for (let i = 0; i < 70; i++) { const d = 1 + hash(i + 1300) * 10; items.push([d, 900 + (hash(i + 1301) - .5) * 1600 * d, i + 5000]); } // lone trees in the fields
  items.sort((p, q) => q[0] - p[0]);
  for (const [d, X, i] of items) {
    const sx = SX(X, d); if (sx < -160 || sx > 1240 || d < .9) continue;
    TR.drawSprite(g, L[pals[i % pals.length]][[0, 2, 3, 2][Math.floor(hash(i + 3) * 4)]], sx, Y(d) + 4, 190 * S(d) * (.8 + hash(i + 4) * .4), { filter: filt, flip: i % 2 === 0, blur: d > 7, sway: Math.sin(t * 1.5 + i) * .015 });
  }
  layerEnd(ctx, { stops: [[0, .62], [.18, .3], [.5, .08], [1, 0]], hazeCol, hazeTop: hz, hazeBot: H });
  // cloud shadows drifting across the land
  screen(ctx); ctx.save(); ctx.globalCompositeOperation = 'multiply';
  for (let i = 0; i < 4; i++) { const x = ((hash(i + 3) * 1800 + t * 40 - c.x * .6) % 1900 + 1900) % 1900 - 400, y = hz + 220 + hash(i + 5) * 420; ctx.save(); ctx.translate(x, y); ctx.scale(2.4, .6); D.glow(ctx, 0, 0, 200, '#8a80a0', .35); ctx.restore(); }
  ctx.restore();
}

// ------------------------------------------------------------------ Mexico: layered ridges clothed in oyamel fir, drifting mist
const RIDGES = [[500, 160, .0016, 41, .06], [600, 140, .0021, 43, .14], [700, 120, .0026, 45, .24], [800, 90, .003, 47, .36]];
const RIDGE_PTS = RIDGES.map(([base, amp, f, sd]) => { const pts = []; for (let x = -3000; x <= 4000; x += 18) { const n = Math.abs(noise1(x * f, sd)); pts.push([x, base - amp * (.4 + .6 * (1 - n)) - amp * .3 * noise1(x * f * 3, sd + 1)]); } return pts; });
function mountains(ctx, c, t, o = {}) {
  const TR = require('./trees'), FR = TR.firs();
  const cols = o.cols ?? [['#b6c4e2', '#98aacc'], ['#90a4cc', '#7088b6'], ['#64799f', '#4c6288'], ['#3e5878', '#2c4260']];
  const mistCol = o.mistCol ?? '#e8eef8', warm = o.warm ?? 0;
  const filt = `brightness(${(1 + warm * .15).toFixed(2)}) sepia(${(warm * .25).toFixed(2)})`;
  RIDGES.forEach(([, , , , k], i) => {
    const g = layerBegin(); layerT(g, c, k);
    const pts = RIDGE_PTS[i];
    hill(g, pts, cols[i][0], cols[i][1]);
    // the slopes are a forest of firs: rows of small sprites following the ridge
    const [x0, x1] = layerX(c, k), hgt = [16, 26, 40, 62][i];
    for (let row = 0; row < 3; row++) for (let j = 0; j < pts.length; j += (3 - i >= 1 ? 2 : 1)) {
      const [x, y] = pts[j]; if (x < x0 || x > x1) continue;
      const q = hash(j * 7 + i * 101 + row * 13), f = FR[Math.floor(q * 3)];
      TR.drawSprite(g, i < 3 ? f.bare : (q < (o.cover ?? 0) ? f.cover : f.bare), x + (q - .5) * 14, y + 8 + row * hgt * .5, hgt * (.8 + q * .5), { blur: i < 2, filter: filt, flip: q < .5 });
    }
    layerEnd(ctx, { haze: [.62, .48, .32, .16][i], hazeCol: mistCol, hazeTop: 200, hazeFall: .7 });
    // drifting mist between ridges
    screen(ctx);
    for (let m = 0; m < 5; m++) {
      const y = 360 + i * 120 + Math.sin(t * .2 + m) * 12, x = ((hash(m + i * 9) * 1600 + t * (12 + i * 6)) % 1600) - 300;
      ctx.save(); ctx.translate(x, y); ctx.scale(3.2, .5); D.glow(ctx, 0, 0, 220, mistCol, (o.mist ?? .35) * (1 - i * .18)); ctx.restore();
    }
  });
}

function twig(ctx, x0, y0, x1, y1, w, o = {}) {
  const pts = D.bez([x0, y0], [lerp(x0, x1, .3), y0 - (o.bend ?? 10)], [lerp(x0, x1, .7), y1 + (o.bend ?? 10) * .5], [x1, y1], 20);
  D.ribbon(ctx, pts, w, w * .7, true);
  const g = ctx.createLinearGradient(0, y0 - w, 0, y0 + w);
  g.addColorStop(0, rgba(o.light ?? '#9a7350')); g.addColorStop(1, rgba(o.col ?? '#5a3c26'));
  ctx.fillStyle = g; ctx.fill();
  ctx.strokeStyle = rgba('#2a1a10', .35); ctx.lineWidth = Math.max(1, w * .08); ctx.stroke();
}

module.exports = { sky, skyCols, daylight, warmth, tint, sun, rays, moon, clouds, bokeh, motes, hillLine, band, hill, layerBegin, layerEnd, layerT, layerX, meadow, autumnLand, mountains, twig, flare, screen };
