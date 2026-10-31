// Pond critters: dragonfly nymph (with the extendable labium "mask" strike), adult dragonfly, small flies, water strider.
const { TAU, clamp, lerp, hash, rgba, mix, shade, ss, noise } = require('./core');
const G = require('./gfx');

// nymph side view, facing right; units: body length ~240. o.strike 0..1 extends the mask; o.grip = prey drawn in the palps
function nymph(g, o) {
  const s = o.s ?? 1, k = clamp(o.strike ?? 0), t = o.t ?? 0, c = o.c ?? '#5f6a3a', line = '#1f2410';
  g.save(); g.translate(o.x, o.y); g.scale(s * (o.flip ?? 1), s); g.rotate(o.rot ?? 0);
  if (o.alpha !== undefined) g.globalAlpha *= o.alpha;
  const br = Math.sin(t * 2.2) * 1.5;
  // legs (far side first, darker)
  const legs = [[-8, 18, 2.2, 1.0], [8, 20, 1.75, 1.1], [24, 20, 1.2, 1.25]];
  const leg = (bx, by, a1, a2, far) => {
    const L1 = 52, L2 = 58, kx = bx + Math.cos(a1) * L1, ky = by + Math.sin(a1) * L1 * .6 - 18, fx = kx + Math.cos(a2) * L2 * .5, fy = ky + Math.sin(a2) * L2;
    g.strokeStyle = far ? shade(c, -.45) : shade(c, -.2); g.lineWidth = far ? 3 : 4; g.lineCap = 'round'; g.lineJoin = 'round';
    g.beginPath(); g.moveTo(bx, by); g.lineTo(kx, ky); g.lineTo(fx, fy); g.stroke();
  };
  legs.forEach(([bx, by, a1, a2]) => leg(bx - 4, by - 3, a1 + .25, a2 + .2, true));
  // abdomen
  const ab = [];
  for (let i = 0; i <= 10; i++) { const u = i / 10, x = lerp(-6, -130, u), h = lerp(22, 9, u * u) * (1 + .04 * Math.sin(t * 3 + u * 6)); ab.push([x, -h + br * u, x, h * .9 + br * u]); }
  const outline = ab.map((p) => [p[0], p[1]]).concat(ab.slice().reverse().map((p) => [p[2], p[3]]));
  g.fillStyle = G.lin(g, 0, -24, 0, 22, [[0, shade(c, .25)], [.6, c], [1, shade(c, -.3)]]);
  G.blob(g, outline, .7); g.fill();
  g.save(); G.blob(g, outline, .7); g.clip();
  g.strokeStyle = rgba(line, .45); g.lineWidth = 1.6;
  for (let i = 1; i < 10; i++) { const p = ab[i]; g.beginPath(); g.moveTo(p[0], p[1] - 2); g.quadraticCurveTo(p[0] + 4, 0, p[2], p[3] + 2); g.stroke(); }
  g.fillStyle = rgba(shade(c, -.45), .5);
  for (let i = 0; i < 18; i++) { G.circle(g, -10 - hash(i + 4) * 115, (hash(i + 9) - .6) * 26, 2 + hash(i) * 3); g.fill(); }
  g.restore();
  g.strokeStyle = line; g.lineWidth = 2; G.blob(g, outline, .7); g.stroke();
  // anal spines
  g.fillStyle = shade(c, -.3); g.beginPath(); g.moveTo(-128, -6); g.lineTo(-148, -2); g.lineTo(-128, 2); g.lineTo(-146, 6); g.lineTo(-126, 8); g.closePath(); g.fill();
  // thorax + wing pads
  g.fillStyle = G.lin(g, 0, -28, 0, 22, [[0, shade(c, .3)], [1, shade(c, -.25)]]);
  G.blob(g, [[-8, -22], [14, -28], [40, -24], [48, -6], [40, 18], [10, 22], [-8, 16]]); g.fill(); g.strokeStyle = line; g.stroke();
  g.fillStyle = rgba(shade(c, .15), .9);
  for (const dy of [0, 5]) { G.blob(g, [[30, -26 + dy], [-10, -30 + dy], [-52, -24 + dy], [-48, -16 + dy], [-6, -18 + dy], [28, -18 + dy]], .8); g.fill(); g.strokeStyle = rgba(line, .7); g.lineWidth = 1.5; g.stroke(); }
  // head + compound eye
  g.fillStyle = shade(c, .1); G.blob(g, [[40, -20], [62, -26], [84, -14], [86, 6], [70, 18], [44, 14]]); g.fill(); g.strokeStyle = line; g.lineWidth = 2; g.stroke();
  g.fillStyle = G.rad(g, 60, -18, 22, [[0, '#9a9a5a'], [.6, '#5a5a2a'], [1, '#2a2a10']]); G.ellipse(g, 64, -12, 19, 16, -.2); g.fill(); g.stroke();
  g.strokeStyle = 'rgba(255,255,220,.12)'; g.lineWidth = 1;
  for (let i = -3; i <= 3; i++) { g.beginPath(); g.moveTo(50, -12 + i * 4); g.lineTo(80, -12 + i * 4); g.stroke(); g.beginPath(); g.moveTo(64 + i * 4, -26); g.lineTo(64 + i * 4, 2); g.stroke(); }
  g.fillStyle = 'rgba(255,255,255,.55)'; G.ellipse(g, 58, -20, 5, 3, -.5); g.fill();
  // labium (mask): postmentum from the base under the thorax, prementum folds back under the head; strike unfolds both
  const base = [26, 20], a1 = lerp(.25, -.08, k), L1 = 66, elbow = [base[0] + Math.cos(a1) * L1, base[1] + Math.sin(a1) * L1];
  const a2 = lerp(Math.PI - .25, -.02, ss(0, .85, k)), L2 = 96, tip = [elbow[0] + Math.cos(a2) * L2, elbow[1] + Math.sin(a2) * L2];
  if (k > .05 && k < .999) { // motion smear: ghosts of the mask along its sweep
    for (let q = 1; q <= 4; q++) {
      const kk = Math.max(0, k - q * .12), b1 = lerp(.25, -.08, kk), e2 = [base[0] + Math.cos(b1) * L1, base[1] + Math.sin(b1) * L1], b2 = lerp(Math.PI - .25, -.02, ss(0, .85, kk));
      g.strokeStyle = rgba('#e8f0d0', .16 / q); g.lineWidth = 14; g.lineCap = 'round';
      g.beginPath(); g.moveTo(e2[0], e2[1]); g.lineTo(e2[0] + Math.cos(b2) * L2, e2[1] + Math.sin(b2) * L2); g.stroke();
    }
  }
  g.strokeStyle = line; g.lineWidth = 9; g.lineCap = 'round';
  g.beginPath(); g.moveTo(base[0], base[1]); g.lineTo(elbow[0], elbow[1]); g.lineTo(tip[0], tip[1]); g.stroke();
  g.strokeStyle = shade(c, .2); g.lineWidth = 6;
  g.beginPath(); g.moveTo(base[0], base[1]); g.lineTo(elbow[0], elbow[1]); g.lineTo(tip[0], tip[1]); g.stroke();
  // palps (claws)
  const open = k > .3 && k < .92 ? 1 : .2, ta = a2;
  for (const sgn of [-1, 1]) {
    const ca = ta + sgn * (.5 * open + .15);
    g.strokeStyle = line; g.lineWidth = 4; g.beginPath(); g.moveTo(tip[0], tip[1]); g.quadraticCurveTo(tip[0] + Math.cos(ca) * 14, tip[1] + Math.sin(ca) * 14, tip[0] + Math.cos(ta) * 20, tip[1] + Math.sin(ta) * 20 + sgn * 6 * open); g.stroke();
  }
  if (o.grip) o.grip(g, tip[0] + Math.cos(ta) * 18, tip[1] + Math.sin(ta) * 18);
  // near legs
  legs.forEach(([bx, by, a1, a2]) => leg(bx, by, a1, a2, false));
  g.restore();
  return null;
}
// where the mask tip is (local -> world) for a given strike value
function nymphTip(o) {
  const s = o.s ?? 1, k = clamp(o.strike ?? 0), base = [26, 20], a1 = lerp(.25, -.08, k), elbow = [base[0] + Math.cos(a1) * 66, base[1] + Math.sin(a1) * 66];
  const a2 = lerp(Math.PI - .25, -.02, ss(0, .85, k)), tip = [elbow[0] + Math.cos(a2) * 96 + Math.cos(a2) * 18, elbow[1] + Math.sin(a2) * 96];
  const r = o.rot ?? 0, x = tip[0] * (o.flip ?? 1), y = tip[1];
  return [o.x + (x * Math.cos(r) - y * Math.sin(r)) * s, o.y + (x * Math.sin(r) + y * Math.cos(r)) * s];
}

// adult dragonfly, 3/4 top view flying; o.h = heading (rad)
function dragonfly(g, o) {
  const s = o.s ?? 1, t = o.t ?? 0, c = o.c ?? '#3fa8d8';
  g.save(); g.translate(o.x, o.y); g.rotate(o.h ?? 0); g.scale(s, s);
  if (o.alpha !== undefined) g.globalAlpha *= o.alpha;
  // wings: blurred flicker
  for (const [wx, wy, L, ph] of [[8, 0, 62, 0], [-6, 0, 56, 1.4]]) for (const sgn of [-1, 1]) {
    const fl = Math.sin(t * 90 + ph + (sgn > 0 ? 0 : .5)), sw = .25 + .3 * fl;
    g.save(); g.translate(wx, wy); g.rotate(sgn * (Math.PI / 2 - sw));
    g.fillStyle = G.lin(g, 0, 0, L, 0, [[0, '#e8f6ff', .45], [1, '#e8f6ff', .15]]);
    G.ellipse(g, L / 2, 0, L / 2, 8); g.fill();
    g.strokeStyle = 'rgba(40,60,70,.35)'; g.lineWidth = .8; g.stroke();
    g.restore();
  }
  // abdomen + thorax + head
  g.strokeStyle = c; g.lineWidth = 6; g.lineCap = 'round';
  g.beginPath(); g.moveTo(-6, 0); g.lineTo(-86, Math.sin(t * 3) * 3); g.stroke();
  g.strokeStyle = rgba('#0a2030', .5); g.lineWidth = 1;
  for (let i = 1; i < 9; i++) { g.beginPath(); g.moveTo(-6 - i * 9, -3); g.lineTo(-6 - i * 9, 3); g.stroke(); }
  g.fillStyle = shade(c, -.2); G.ellipse(g, 6, 0, 14, 8); g.fill();
  g.fillStyle = G.rad(g, 22, -3, 10, [[0, '#9fe0ff'], [1, '#1a5a7a']]); G.circle(g, 22, -5, 7); g.fill(); G.circle(g, 22, 5, 7); g.fill();
  g.restore();
}

// tiny fly / gnat with buzzing wings
function fly(g, x, y, s = 1, t = 0, o = {}) {
  g.save(); g.translate(x, y); g.scale(s * (o.flip ?? 1), s);
  if (o.alpha !== undefined) g.globalAlpha *= o.alpha;
  const fl = Math.sin(t * 120);
  g.fillStyle = 'rgba(230,240,255,.55)';
  G.ellipse(g, -2, -5 - fl * 2, 8, 3.5, -.6 + fl * .3); g.fill(); G.ellipse(g, 2, -5 + fl * 2, 8, 3.5, .5 - fl * .3); g.fill();
  g.fillStyle = '#1c1c22'; G.ellipse(g, 0, 0, 7, 4); g.fill();
  g.fillStyle = '#7a1c18'; G.circle(g, 6, -1, 2.6); g.fill();
  g.strokeStyle = '#1c1c22'; g.lineWidth = .9;
  for (let i = -1; i <= 1; i++) { g.beginPath(); g.moveTo(i * 3, 2); g.lineTo(i * 4 - 1, 7); g.stroke(); }
  g.restore();
}
// buzzing path around a centre
const buzz = (cx, cy, t, r = 40, seed = 1) => [cx + noise(t * 1.3, seed) * r + Math.sin(t * 7 + seed) * 4, cy + noise(t * 1.1, seed + 9) * r * .6 + Math.cos(t * 9 + seed) * 3];

function strider(g, x, y, s = 1, t = 0) {
  g.save(); g.translate(x, y); g.scale(s, s);
  g.strokeStyle = '#2a2a24'; g.lineWidth = 1.4;
  for (const [a, L] of [[.35, 30], [-.35, 30], [2.8, 34], [-2.8, 34], [1.4, 14], [-1.4, 14]]) { g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(a) * L, Math.sin(a) * L * .35); g.stroke(); g.strokeStyle = 'rgba(255,255,255,.4)'; g.beginPath(); g.ellipse(Math.cos(a) * L, Math.sin(a) * L * .35 + 1.5, 3, 1, 0, 0, TAU); g.stroke(); g.strokeStyle = '#2a2a24'; }
  g.fillStyle = '#2a2a24'; G.ellipse(g, 0, 0, 9, 2.5); g.fill();
  g.restore();
}

module.exports = { nymph, nymphTip, dragonfly, fly, buzz, strider };
