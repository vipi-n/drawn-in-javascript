// Transitions between shots (each gets both rendered frames): dive / rise through the surface, lens zoom-through,
// giant-tail whip, bubble curtain, frog-pupil iris, ice crack. Plus finishing helpers.
const { C, W, H, TAU, clamp, lerp, hash, rgba, ss, io3, in3, out3, noise } = require('./core');
const G = require('./gfx');
const Wt = require('./water');
const Fr = require('./frog');

// waterline sweeps; dir = -1: camera sinks (line moves up, new shot below); +1: camera rises (line moves down, new shot above)
function dive(g, A, B, u, t, o = {}) {
  const dir = o.dir ?? -1, e = io3(u), y = dir < 0 ? lerp(H + 80, -80, e) : lerp(-80, H + 80, e);
  const top = dir < 0 ? A : B, bot = dir < 0 ? B : A;
  g.drawImage(top, 0, 0);
  g.save(); Wt.clipWater(g, y, t, true, 3); g.drawImage(bot, 0, 0); g.restore();
  // bubbles surge through the line
  const k = Math.sin(Math.PI * u);
  for (let i = 0; i < 46; i++) {
    const x = hash(i) * W, r = 3 + Math.pow(hash(i + 3), 2) * 30, yy = y + (hash(i + 5) - .3) * 260 - u * 300 * hash(i + 7) * (dir < 0 ? 1 : -1);
    Wt.bubble(g, x, yy, r * (.6 + k * .6), t, k * .9, i);
  }
  Wt.meniscus(g, y, t, { amp: 3 });
}
// zoom through a point of the old shot into the new one
function zoom(g, A, B, u, t, o = {}) {
  const fx = o.fx ?? W / 2, fy = o.fy ?? H / 2, e = io3(u), sA = Math.exp(e * (o.depth ?? 3.2)), sB = lerp(.3, 1, out3(clamp((u - .35) / .65)));
  const aA = 1 - ss(.35, .7, u), aB = ss(.3, .65, u);
  g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
  if (aB > 0) { g.save(); g.globalAlpha = aB; g.translate(W / 2, H / 2); g.scale(sB, sB); g.translate(-W / 2, -H / 2); g.drawImage(B, 0, 0); g.restore(); }
  if (aA > 0) { g.save(); g.globalAlpha = aA; g.translate(fx, fy); g.scale(sA, sA); g.translate(-fx, -fy); g.drawImage(A, 0, 0); g.restore(); }
  // radial speed streaks + bloom at the crossover
  const k = Math.sin(Math.PI * u);
  g.save(); g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 60; i++) {
    const a = hash(i) * TAU, r0 = 120 + hash(i + 2) * 300 + e * 500, L = 80 + hash(i + 4) * 260 * k;
    g.strokeStyle = rgba(o.col ?? '#d8fff0', .22 * k * hash(i + 9)); g.lineWidth = 1 + hash(i + 5) * 2.5;
    g.beginPath(); g.moveTo(W / 2 + Math.cos(a) * r0, H / 2 + Math.sin(a) * r0); g.lineTo(W / 2 + Math.cos(a) * (r0 + L), H / 2 + Math.sin(a) * (r0 + L)); g.stroke();
  }
  g.restore();
  G.glow(g, W / 2, H / 2, 700, o.col ?? '#d8fff0', .35 * Math.exp(-(((u - .5) / .12) ** 2)), 'screen');
}
// the macro shrinks back into its egg: B settles from a magnified view while A lives inside a shrinking circle
function zoomOut(g, A, B, u, t, o = {}) {
  const e = io3(u), fx = o.fx ?? W / 2, fy = o.fy ?? H / 2, sB = lerp(2.4, 1, e);
  g.save(); g.translate(fx, fy); g.scale(sB, sB); g.translate(-fx, -fy); g.drawImage(B, 0, 0); g.restore();
  const sA = lerp(1, .07, e), cx = lerp(W / 2, fx, e), cy = lerp(H / 2, fy, e), r = lerp(1100, 330, ss(0, .45, u)) * sA, aA = 1 - ss(.78, 1, u);
  if (aA > 0) {
    g.save(); g.globalAlpha = aA; G.circle(g, cx, cy, r); g.clip();
    g.translate(cx, cy); g.scale(sA, sA); g.translate(-W / 2, -H / 2); g.drawImage(A, 0, 0); g.restore();
    g.save(); g.globalAlpha = aA; g.strokeStyle = rgba('#e8fff8', .7); g.lineWidth = 3; G.circle(g, cx, cy, r); g.stroke(); g.restore();
    G.glow(g, cx, cy, r * 1.4, '#d8fff0', .25 * aA, 'screen');
  }
}
// a huge out-of-focus tadpole swims across the lens; the seam hides behind it
function whip(g, A, B, u, t, o = {}) {
  const dir = o.dir ?? 1, e = io3(u), x = dir > 0 ? lerp(-500, W + 500, e) : lerp(W + 500, -500, e);
  g.drawImage(A, 0, 0);
  g.save(); g.beginPath(); dir > 0 ? g.rect(-10, -10, x + 10, H + 20) : g.rect(x, -10, W - x + 10, H + 20); g.clip(); g.drawImage(B, 0, 0); g.restore();
  G.layer(g, 'whip', (b) => {
    Fr.frog(b, { x: x - dir * 120, y: H / 2 + Math.sin(u * 5) * 60, s: 3.2, flip: dir, tad: 1, legs: 0, arms: 0, swim: 1, t: t * 2.2, freq: 3, alpha: .97, tadPal: { top: '#1c160c', side: '#2c2414', belly: '#5a4a2a', line: '#0c0904' }, finCol: '#5a5a40' });
  }, { k: 3, blur: 3.5 });
}
function bubbles(g, A, B, u, t) {
  const k = Math.sin(Math.PI * u);
  g.drawImage(A, 0, 0);
  g.save(); g.globalAlpha = ss(.35, .65, u); g.drawImage(B, 0, 0); g.restore();
  for (let i = 0; i < 90; i++) {
    const x = hash(i) * W, r = 6 + Math.pow(hash(i + 2), 2.5) * 70, y = H + 100 - (u * 1.9 + hash(i + 4) * .5) * (H + 300);
    Wt.bubble(g, x + Math.sin(u * 9 + i) * 20, y, r, t, .9 * k + .1, i);
  }
}
// horizontal frog-pupil iris: closes on A, opens on B, with a golden iris rim
function pupil(g, A, B, u, t, o = {}) {
  const cx = o.cx ?? W / 2, cy = o.cy ?? H / 2, closing = u < .5, e = closing ? 1 - io3(u * 2) : io3((u - .5) * 2);
  const rx = e * 1100 + 1, ry = e * 640 + 1;
  g.fillStyle = '#050403'; g.fillRect(0, 0, W, H);
  g.save(); G.ellipse(g, cx, cy, rx, ry); g.clip(); g.drawImage(closing ? A : B, 0, 0); g.restore();
  g.save();
  g.lineWidth = 60; g.strokeStyle = G.rad(g, cx, cy, Math.max(rx, ry) + 60, [[0, '#d9a441', .0], [.85, '#d9a441', .9], [1, '#6a4a14', .9]]);
  G.ellipse(g, cx, cy, rx + 30, ry + 30); g.stroke();
  g.restore();
}
function crack(g, A, B, u, t, o = {}) {
  const cx = o.cx ?? W * .5, cy = o.cy ?? H * .3;
  if (u < .55) {
    g.drawImage(A, 0, 0);
    const k = ss(0, .5, u);
    g.save(); g.lineCap = 'round';
    for (let i = 0; i < 14; i++) {
      let x = cx, y = cy, a = i / 14 * TAU + hash(i) * .4;
      const L = k * (300 + hash(i + 3) * 500);
      g.strokeStyle = rgba('#ffffff', .9); g.lineWidth = 2.5 - i * .1;
      g.beginPath(); g.moveTo(x, y);
      for (let d = 0; d < L; d += 22) { a += (hash(i * 31 + d) - .5) * .6; x += Math.cos(a) * 22; y += Math.sin(a) * 22; g.lineTo(x, y); }
      g.stroke();
    }
    g.restore();
    G.glow(g, cx, cy, 300, '#e8f8ff', .4 * k, 'screen');
  } else {
    const e = ss(.55, 1, u);
    g.drawImage(B, 0, 0);
    g.fillStyle = rgba('#f4fbff', 1 - e); g.fillRect(0, 0, W, H);
    // falling shards
    for (let i = 0; i < 30; i++) {
      const x = hash(i) * W, y = hash(i + 3) * H * .6 + e * e * 900, s = 20 + hash(i + 5) * 70;
      g.save(); g.translate(x, y); g.rotate(hash(i + 7) * TAU + e * 3); g.fillStyle = rgba('#e8f6ff', .55 * (1 - e)); g.beginPath(); g.moveTo(0, -s); g.lineTo(s * .6, s * .3); g.lineTo(-s * .5, s * .5); g.closePath(); g.fill(); g.restore();
    }
  }
}
function flash(g, A, B, u, t, o = {}) {
  g.drawImage(u < .5 ? A : B, 0, 0);
  g.fillStyle = rgba(o.col ?? '#ffffff', Math.sin(Math.PI * u) * (o.a ?? .9)); g.fillRect(0, 0, W, H);
}
function cross(g, A, B, u) { g.drawImage(A, 0, 0); g.save(); g.globalAlpha = io3(u); g.drawImage(B, 0, 0); g.restore(); }

module.exports = { dive, zoom, zoomOut, whip, bubbles, pupil, crack, flash, cross };
