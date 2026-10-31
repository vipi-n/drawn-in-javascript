// Pond plants and props: cattails, rushes, ribbon weed, elodea, lily pads (above + below), water lilies,
// stones with algae, grass, duckweed, fallen leaves.
const { W, H, TAU, clamp, lerp, hash, noise, rgba, mix, shade, rng } = require('./core');
const G = require('./gfx');

const sway = (x, t, k = 1) => (noise(t * .35 + x * .004, 11) * .7 + Math.sin(t * 1.1 + x * .02) * .3) * k;

// a single long leaf blade rising from (x,y): curls toward `bend`, width w at base
function blade(g, x, y, h, bend, w, c0, c1, o = {}) {
  const n = 7, P = [];
  for (let i = 0; i <= n; i++) {
    const u = i / n, b = bend * u * u;
    P.push([x + Math.sin(b) * h * u * .9 + (o.lean ?? 0) * u * h, y - Math.cos(b) * h * u]);
  }
  g.fillStyle = typeof c0 === 'string' && !c1 ? c0 : G.lin(g, x, y, P[n][0], P[n][1], [[0, c0], [1, c1 ?? c0]]);
  G.strand(g, P, w, .4, 5); g.fill();
  if (o.mid) { g.strokeStyle = rgba(o.mid, .35); g.lineWidth = Math.max(.6, w * .12); g.beginPath(); G.curve(g, P.slice(0, n), false); g.stroke(); }
}

// cattail (Typha): straight stem, brown spike, leaves; o.sil = silhouette colour (night)
function cattail(g, x, y, h, t, o = {}) {
  const s = sway(x, t, o.wind ?? 1) * .08, top = [x + Math.sin(s) * h, y - Math.cos(s) * h];
  const sil = o.sil, stemC = sil ?? '#6a843a', leafA = sil ?? o.leafA ?? '#5d8a3a', leafB = sil ?? o.leafB ?? '#9fbf5a';
  const r = rng(o.id !== undefined ? o.id * 7919 + 13 : Math.floor(x * 13 + h));
  for (let k = 0; k < (o.leaves ?? 3); k++) {
    const side = k % 2 ? 1 : -1, bend = side * (.18 + r() * .5) + s * 2, hh = h * (.55 + r() * .5);
    blade(g, x + side * 2, y, hh, bend, h * .028, leafA, leafB, { mid: sil ? null : '#e8f5c0' });
  }
  const P = [[x, y], [lerp(x, top[0], .5) + s * h * .05, lerp(y, top[1], .5)], top];
  g.strokeStyle = stemC; g.lineWidth = Math.max(1.2, h * .011); g.lineCap = 'round';
  g.beginPath(); G.curve(g, P, false); g.stroke();
  if (o.head !== false) {
    const u0 = .74, u1 = .9, hx0 = lerp(x, top[0], u0), hy0 = lerp(y, top[1], u0), hx1 = lerp(x, top[0], u1), hy1 = lerp(y, top[1], u1);
    g.lineWidth = h * .042;
    g.strokeStyle = sil ?? G.lin(g, hx0 - 6, hy0, hx0 + 6, hy0, [[0, '#7a4a26'], [.45, '#a8703c'], [1, '#4a2c16']]);
    g.beginPath(); g.moveTo(hx0, hy0); g.lineTo(hx1, hy1); g.stroke();
    g.lineWidth = Math.max(1, h * .006); g.strokeStyle = sil ?? '#8a7a50';
    g.beginPath(); g.moveTo(hx1, hy1); g.lineTo(lerp(x, top[0], 1.07), lerp(y, top[1], 1.07)); g.stroke();
  }
}
// clump of thin rush stems
function rushes(g, x, y, h, t, o = {}) {
  const n = o.n ?? 14, c = o.sil ?? o.leafA ?? '#5f8f3f', c2 = o.sil ?? o.leafB ?? '#a7c76a';
  const hv = (i) => (o.id !== undefined ? hash(i * 131 + o.id * 7) : hash(i + x));
  g.lineCap = 'round';
  for (let i = 0; i < n; i++) {
    const u = (i / (n - 1) - .5), hh = h * (.6 + hv(i) * .45), a = u * .5 + sway(x + i * 9, t, o.wind ?? 1) * .07;
    const tx = x + Math.sin(a) * hh, ty = y - Math.cos(a) * hh;
    g.strokeStyle = o.sil ? c : G.lin(g, x, y, tx, ty, [[0, c], [1, c2]]); g.lineWidth = Math.max(1, h * .008);
    g.beginPath(); g.moveTo(x + u * 10, y); g.quadraticCurveTo(x + u * 10 + Math.sin(a) * hh * .3, y - hh * .5, tx, ty); g.stroke();
  }
}
// reeds live in fixed world slots (spacing sp) so they hold still and parallax correctly while the camera moves;
// clumps of ~4 with gaps, varied heights
function reedBed(g, seed, x0, x1, y, h, t, o = {}) {
  const sp = o.spacing ?? 37;
  for (let k = Math.floor(x0 / sp) - 2; k <= Math.ceil(x1 / sp) + 2; k++) {
    const id = seed * 1009 + k, cl = Math.floor(k / 4);
    if (hash(seed * 31 + cl * 29) < .18) continue;
    const x = k * sp + (hash(id * 3) - .5) * sp * 1.3, hh = h * (.45 + hash(id * 5) * .7) * (.7 + hash(seed * 7 + cl * 7) * .6), yy = y + (hash(id * 9) - .5) * (o.jit ?? 10);
    const oo = o.sil ? o : { ...o, leafA: '#3f5f2c', leafB: '#86a052' };
    if (hash(id * 7) < (o.rushK ?? .4)) rushes(g, x, yy, hh * .8, t, { ...oo, id }); else cattail(g, x, yy, hh, t, { ...oo, id, head: hash(id * 13) > .35, leaves: 2 + Math.floor(hash(id) * 3) });
  }
}

// underwater ribbon weed (Vallisneria-like): blades waving with a travelling wave
function ribbonWeed(g, x, y, h, t, o = {}) {
  const n = o.n ?? 5, c0 = o.c0 ?? '#2f6b3a', c1 = o.c1 ?? '#7fbf6a', a = o.a ?? .9;
  g.save(); g.globalAlpha *= a;
  for (let k = 0; k < n; k++) {
    const hh = h * (.6 + hash(x * 3 + k) * .5), ph = hash(x + k * 9) * TAU, P = [];
    for (let i = 0; i <= 9; i++) {
      const u = i / 9, wv = Math.sin(t * 1.3 - u * 3.2 + ph) * 26 * u * u + (o.cur ?? 18) * u * u + (k - n / 2) * 5 * u;
      P.push([x + (k - n / 2) * 4 + wv, y - hh * u]);
    }
    g.fillStyle = G.lin(g, x, y, x, y - hh, [[0, c0], [1, c1]]);
    G.strand(g, P, o.w ?? 11, 3, 4); g.fill();
    g.strokeStyle = rgba('#d8ffc8', .25); g.lineWidth = 1.2; g.beginPath(); G.curve(g, P, false); g.stroke();
  }
  g.restore();
}
// elodea: swaying stem with whorls of small leaves
function elodea(g, x, y, h, t, o = {}) {
  const sd = o.seed ?? x, c = o.c ?? '#3f8a3e', c2 = o.c2 ?? '#8fd07a', n = Math.floor(h / 16), ph = hash(sd) * TAU;
  const P = [];
  for (let i = 0; i <= 8; i++) { const u = i / 8; P.push([x + Math.sin(t * 1.1 + ph - u * 2.4) * 18 * u * u + (o.cur ?? 10) * u * u, y - h * u]); }
  g.strokeStyle = c; g.lineWidth = 2.2; g.beginPath(); G.curve(g, P, false); g.stroke();
  const D = G.resample(G.dense(P, false, 6), n + 1, false);
  for (let i = 1; i <= n; i++) {
    const [px, py] = D[i], s = 1 - i / (n + 6), rot = i * .9 + hash(sd + i) * .5;
    // a whorl of 4 leaves around the stem, seen from the side: back leaves first, darker
    const leaves = [0, 1, 2, 3].map((k) => { const ph = rot + k * Math.PI / 2; return { side: Math.cos(ph), depth: Math.sin(ph), k }; }).sort((a, b) => a.depth - b.depth);
    for (const { side, depth, k } of leaves) {
      const L = (17 + hash(i * 4 + k + sd) * 10) * s + 5, spread = .55 + .5 * Math.abs(side), ang = -Math.PI / 2 + Math.sign(side || 1) * spread + Math.sin(t * 1.5 + i + k) * .1;
      const len = L * (.55 + .45 * Math.abs(side));
      g.fillStyle = rgba(mix(mix(c, c2, .3 + hash(i + k) * .4), '#0a2010', depth < 0 ? .35 : 0), .92);
      g.save(); g.translate(px, py); g.rotate(ang);
      g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(len * .45, -3.6 * s - 1.4, len, -1); g.quadraticCurveTo(len * .45, 3.6 * s + 1.4, 0, 0); g.fill();
      if (depth >= 0) { g.strokeStyle = rgba('#e8ffd0', .25); g.lineWidth = .8; g.beginPath(); g.moveTo(1, 0); g.lineTo(len * .85, -.5); g.stroke(); }
      g.restore();
    }
  }
}

// lily pad seen from above at a grazing angle (flat = vertical squash)
function lilyPad(g, x, y, r, o = {}) {
  const flat = o.flat ?? .32, rot = o.rot ?? 0, notch = o.notch ?? .5, c = o.c ?? '#4f8f3a';
  g.save(); g.translate(x, y); g.scale(1, flat);
  const path = () => { g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, r, rot + notch * .5, rot + TAU - notch * .5); g.closePath(); };
  g.fillStyle = 'rgba(0,20,10,.35)'; g.save(); g.translate(0, r * .12); path(); g.fill(); g.restore();
  g.fillStyle = G.rad(g, -r * .3, -r * .3, r * 1.3, [[0, shade(c, .35)], [.6, c], [1, shade(c, -.35)]]); path(); g.fill();
  g.strokeStyle = rgba(shade(c, .5), .5); g.lineWidth = 1.5 / flat * .5;
  for (let k = 0; k < 11; k++) { const a = rot + notch * .5 + (TAU - notch) * (k + .5) / 11; g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(a) * r * .92, Math.sin(a) * r * .92); g.stroke(); }
  g.strokeStyle = rgba(shade(c, -.5), .6); g.lineWidth = 2; path(); g.stroke();
  g.fillStyle = 'rgba(255,255,255,.18)'; G.ellipse(g, -r * .35, -r * .35, r * .35, r * .2, -.4); g.fill();
  g.restore();
}
// lily pad from below: dark disc, glowing rim, stem trailing down
function lilyBelow(g, x, y, r, t, o = {}) {
  const stemL = o.stem ?? 500;
  g.save();
  g.strokeStyle = rgba('#2c5a34', .7); g.lineWidth = 4;
  g.beginPath(); g.moveTo(x, y); g.bezierCurveTo(x + 20, y + stemL * .3, x - 30 + Math.sin(t * .8 + x) * 20, y + stemL * .7, x + 10, y + stemL); g.stroke();
  g.translate(x, y); g.scale(1, o.flat ?? .22);
  g.fillStyle = G.rad(g, 0, 0, r, [[0, '#1f3f22', .95], [.85, '#2f5f2c', .9], [1, '#c8ffb0', .7]]);
  g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, r, .3, TAU - .3); g.closePath(); g.fill();
  g.restore();
}
// water lily bloom (side-ish view)
function waterLily(g, x, y, s, o = {}) {
  const c = o.c ?? '#fff4f6', c2 = o.c2 ?? '#f2a6c0', open = o.open ?? 1;
  g.save(); g.translate(x, y); g.scale(s, s);
  const petal = (a, L, w, col) => { g.save(); g.rotate(a); g.fillStyle = G.lin(g, 0, 0, 0, -L, [[0, c2], [1, col]]); g.beginPath(); g.moveTo(0, 0); g.bezierCurveTo(w, -L * .3, w * .6, -L * .9, 0, -L); g.bezierCurveTo(-w * .6, -L * .9, -w, -L * .3, 0, 0); g.fill(); g.restore(); };
  for (let k = -3; k <= 3; k++) petal(k * .42 * open, 30, 9, c);
  for (let k = -2; k <= 2; k++) petal(k * .3 * open, 24, 7, '#ffffff');
  g.fillStyle = '#ffd34a'; G.ellipse(g, 0, -6, 8, 4); g.fill();
  g.restore();
}

// rounded stone with mottling and an algae fringe
function stone(g, x, y, rx, ry, seed, o = {}) {
  const P = [], n = 14;
  for (let i = 0; i < n; i++) { const a = i / n * TAU, k = 1 + (hash(seed * 31 + i) - .5) * .18; P.push([x + Math.cos(a) * rx * k, y + Math.sin(a) * ry * k * (Math.sin(a) > 0 ? .8 : 1)]); }
  const c = o.c ?? '#6b6a5a';
  g.fillStyle = G.rad(g, x - rx * .3, y - ry * .5, Math.max(rx, ry) * 1.5, [[0, shade(c, .35)], [.6, c], [1, shade(c, -.5)]]);
  G.blob(g, P); g.fill();
  g.save(); G.blob(g, P); g.clip();
  for (let i = 0; i < 16; i++) { g.fillStyle = rgba(hash(seed + i) > .5 ? shade(c, .25) : shade(c, -.25), .35); G.circle(g, x + (hash(seed * 7 + i) - .5) * rx * 1.8, y + (hash(seed * 9 + i) - .5) * ry * 1.8, 3 + hash(seed + i * 5) * rx * .12); g.fill(); }
  if (o.moss) { g.fillStyle = G.lin(g, 0, y - ry, 0, y, [[0, o.moss, .9], [1, o.moss, 0]]); g.fillRect(x - rx * 1.2, y - ry * 1.2, rx * 2.4, ry * 1.1); }
  g.restore();
  if (o.algae) {
    g.strokeStyle = rgba(o.algae, .75); g.lineWidth = 1.4; g.lineCap = 'round';
    for (let i = 0; i < (o.nAlgae ?? 26); i++) {
      const a = Math.PI + .25 + (i / (o.nAlgae ?? 26)) * (Math.PI - .5), px = x + Math.cos(a) * rx * .95, py = y + Math.sin(a) * ry * .95, L = 6 + hash(seed + i * 3) * 14, sw = Math.sin((o.t ?? 0) * 1.6 + i) * 4;
      g.beginPath(); g.moveTo(px, py); g.quadraticCurveTo(px + sw, py - L * .6, px + sw * 1.6, py - L); g.stroke();
    }
  }
}

// grass tufts along a ground line
function grass(g, x0, x1, y, h, t, o = {}) {
  const n = o.n ?? 120, c0 = o.c0 ?? '#3f7a2e', c1 = o.c1 ?? '#9ccc5a';
  g.lineCap = 'round';
  for (let i = 0; i < n; i++) {
    const x = lerp(x0, x1, hash(i + (o.seed ?? 0)) ), hh = h * (.4 + hash(i + 300) * .7), a = (hash(i + 77) - .5) * .7 + sway(x, t, o.wind ?? 1) * .15;
    const tx = x + Math.sin(a) * hh, ty = y - Math.cos(a) * hh;
    g.strokeStyle = G.lin(g, x, y, tx, ty, [[0, c0], [1, c1]]); g.lineWidth = o.w ?? 2.4;
    g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + Math.sin(a) * hh * .2, y - hh * .6, tx, ty); g.stroke();
  }
}
function duckweed(g, x0, x1, y, n, seed, o = {}) {
  for (let i = 0; i < n; i++) {
    const x = lerp(x0, x1, hash(seed + i)), yy = y + (hash(seed + i * 3) - .5) * (o.spread ?? 16), r = 3 + hash(seed + i * 5) * 4;
    g.fillStyle = rgba(hash(seed + i * 7) > .5 ? '#8fcf4a' : '#6fb03a', .95); G.ellipse(g, x, yy, r, r * (o.flat ?? .4)); g.fill();
  }
}
function leaf(g, x, y, s, rot, col, o = {}) {
  g.save(); g.translate(x, y); g.rotate(rot); g.scale(s, s * (o.flip ?? 1));
  g.fillStyle = G.lin(g, -10, 0, 10, 0, [[0, shade(col, -.25)], [1, shade(col, .2)]]);
  g.beginPath(); g.moveTo(-12, 0); g.bezierCurveTo(-6, -8, 6, -8, 12, 0); g.bezierCurveTo(6, 7, -6, 7, -12, 0); g.fill();
  g.strokeStyle = rgba(shade(col, -.45), .7); g.lineWidth = .8; g.beginPath(); g.moveTo(-13, 0); g.lineTo(11, 0); g.stroke();
  g.restore();
}

module.exports = { sway, blade, cattail, rushes, reedBed, ribbonWeed, elodea, lilyPad, lilyBelow, waterLily, stone, grass, duckweed, leaf };
