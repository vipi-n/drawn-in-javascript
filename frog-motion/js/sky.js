// Skies and distance: gradients for night/dawn/day/storm/winter, moon, stars, sun with anamorphic streak,
// soft clouds, tree-line silhouettes and drifting mist.
const { W, H, TAU, clamp, lerp, hash, noise, fbm, rgba, mix, ramp, ss } = require('./core');
const G = require('./gfx');

const SKIES = {
  night: [[0, '#050a1c'], [.55, '#0d1d3a'], [.85, '#1f3a57'], [1, '#2f5068']],
  dawn: [[0, '#232a5c'], [.38, '#5f4f8a'], [.62, '#d98a8a'], [.82, '#ffbf8a'], [1, '#ffe2a8']],
  day: [[0, '#4f9ad8'], [.6, '#9fd0ee'], [1, '#e2f4f6']],
  golden: [[0, '#5878b0'], [.45, '#e7a780'], [.8, '#ffd08a'], [1, '#fff0c0']],
  storm: [[0, '#4a5560'], [.6, '#7d8a92'], [1, '#aab6b8']],
  winter: [[0, '#8fa4bc'], [.6, '#c9d6e2'], [1, '#eef3f6']],
  autumn: [[0, '#6f8fb8'], [.55, '#d8b48c'], [1, '#f4dcb0']],
};
// y0..y1 = screen band of the sky gradient
function sky(g, kind, y0 = 0, y1 = H, o = {}) {
  const st = o.stops ?? SKIES[kind];
  const gr = g.createLinearGradient(0, y0, 0, y1);
  for (const [k, c] of st) gr.addColorStop(k, rgba(c, 1));
  g.fillStyle = gr; g.fillRect(0, -50, W, H + 100);
}
// blend two named skies
function skyMix(g, a, b, k, y0, y1) {
  const A = SKIES[a], B = SKIES[b], n = 6, st = [];
  for (let i = 0; i <= n; i++) { const u = i / n; st.push([u, mix(ramp(A, u), ramp(B, u), k)]); }
  sky(g, null, y0, y1, { stops: st });
}

function stars(g, t, a = 1, o = {}) {
  const n = o.n ?? 220, y1 = o.y1 ?? H * .6;
  g.save();
  for (let i = 0; i < n; i++) {
    const x = hash(i) * W, y = Math.pow(hash(i + 500), 1.4) * y1, s = .5 + Math.pow(hash(i + 900), 3) * 2.2;
    const tw = .55 + .45 * Math.sin(t * (1 + hash(i + 3) * 3) + i);
    g.fillStyle = rgba('#e8f0ff', a * tw * (.35 + .65 * hash(i + 77)) * (1 - y / y1 * .6));
    g.fillRect(x + (o.dx ?? 0), y + (o.dy ?? 0), s, s);
  }
  g.restore();
}
function moon(g, x, y, r, a = 1) {
  G.glow(g, x, y, r * 9, '#9fb8e8', .22 * a, 'screen');
  G.glow(g, x, y, r * 3.2, '#dfe8ff', .35 * a, 'screen');
  g.save(); g.globalAlpha = a;
  g.fillStyle = G.rad(g, x - r * .25, y - r * .25, r * 1.2, [[0, '#fffdf2'], [.7, '#efeedd'], [1, '#c9cdd8']]);
  G.circle(g, x, y, r); g.fill();
  g.globalCompositeOperation = 'multiply';
  for (let i = 0; i < 7; i++) { const a2 = hash(i + 40) * TAU, d = Math.sqrt(hash(i + 50)) * r * .7; g.fillStyle = 'rgba(190,190,200,.5)'; G.circle(g, x + Math.cos(a2) * d, y + Math.sin(a2) * d, r * (.08 + hash(i + 60) * .17)); g.fill(); }
  g.restore();
}
// sun: hot core, wide glow and a thin horizontal anamorphic streak
function sun(g, x, y, r, a = 1, col = '#fff1c8') {
  if (a < .01) return;
  G.glow(g, x, y, r * 14, col, .25 * a, 'screen');
  G.glow(g, x, y, r * 4, '#ffffff', .55 * a, 'screen');
  g.save(); g.globalCompositeOperation = 'lighter';
  g.fillStyle = G.lin(g, x - W, y, x + W, y, [[0, col, 0], [.5, col, .5 * a], [1, col, 0]]);
  g.fillRect(x - W, y - 1.5, 2 * W, 3);
  g.fillStyle = G.lin(g, x - W * .6, y, x + W * .6, y, [[0, '#9fd8ff', 0], [.5, '#bfe6ff', .16 * a], [1, '#9fd8ff', 0]]);
  g.fillRect(x - W * .6, y - 9, 1.2 * W, 18);
  g.restore();
}

// soft cloud: cluster of blurred puffs (drawn into a soft layer by caller)
function cloud(g, x, y, w, seed, col, a = 1, shadow = '#000000') {
  const n = 9;
  for (let i = 0; i < n; i++) {
    const u = i / (n - 1), px = x + (u - .5) * w, r = w * (.12 + .14 * Math.sin(u * Math.PI)) * (.75 + hash(seed * 31 + i) * .5), py = y - r * .35 + hash(seed + i) * r * .3;
    g.fillStyle = G.rad(g, px, py + r * .25, r * 1.1, [[0, shadow, .18 * a], [1, shadow, 0]]); G.circle(g, px, py + r * .25, r * 1.1); g.fill();
    g.fillStyle = G.rad(g, px - r * .2, py - r * .3, r, [[0, col, a], [.7, col, a * .85], [1, col, 0]]); G.circle(g, px, py, r); g.fill();
  }
}

// silhouette tree-line along y with bumpy crowns
function treeline(g, y, seed, col, o = {}) {
  const amp = o.amp ?? 60, sc = o.scale ?? 1, x0 = o.x0 ?? -100, x1 = o.x1 ?? W + 100;
  g.fillStyle = typeof col === 'string' && col.startsWith('rgba') ? col : rgba(col, o.a ?? 1);
  g.beginPath(); g.moveTo(x0, H + 400);
  for (let x = Math.floor(x0 / 6) * 6; x <= x1 + 6; x += 6) {
    const k = x / (90 * sc);
    const crown = Math.abs(Math.sin(k * 3.1 + seed)) * .5 + fbm(k * 1.3, seed) * .8 + Math.pow(Math.abs(noise(k * 4.5, seed + 3)), 2) * .5;
    const spire = o.firs ? Math.max(0, 1 - Math.abs(((x / (38 * sc) + hash(seed)) % 1) - .5) * 4) * (.6 + .4 * noise(x * .03, seed + 9)) : 0;
    g.lineTo(x, y - amp * (crown * .6 + spire * 1.1));
  }
  g.lineTo(x1, H + 400); g.closePath(); g.fill();
}
function mist(g, y, t, a = .5, o = {}) {
  if (a < .01) return;
  G.layer(g, 'mist', (b) => {
    for (let i = 0; i < (o.n ?? 7); i++) {
      const x = ((hash(i + 3) * 1600 + t * (o.speed ?? 12) * (.5 + hash(i))) % 1900) - 400, yy = y + (hash(i + 8) - .5) * (o.spread ?? 80), w = 380 + hash(i + 1) * 500, h = 40 + hash(i + 2) * 50;
      b.fillStyle = G.rad(b, 0, 0, 1, [[0, o.col ?? '#dfe8f0', a], [1, o.col ?? '#dfe8f0', 0]]);
      b.save(); b.translate(x, yy); b.scale(w, h); G.circle(b, 0, 0, 1); b.fill(); b.restore();
    }
  }, { k: 3, blur: 10 });
}

module.exports = { SKIES, sky, skyMix, stars, moon, sun, cloud, treeline, mist };
