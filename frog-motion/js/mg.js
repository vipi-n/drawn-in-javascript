// Motion-graphic accents in the film's waterline language (thin white lines, gold, soft shadows): call sound-waves,
// magnifier insets with connector lines, a microscope reticle, scale bars, dotted trajectories, an ECG trace,
// plus the close-ups drawn inside the insets (nuptial pad, gill filaments, tadpole mouthparts).
const { W, H, TAU, clamp, lerp, hash, rgba, mix, shade, ss, spring, out3, out5, io3, noise } = require('./core');
const G = require('./gfx');

const INK = '#ffffff', GOLD = '#f3d27a';
const shadow = (g, on, a = .45, b = 10) => { g.shadowColor = on ? `rgba(0,10,8,${a})` : 'rgba(0,0,0,0)'; g.shadowBlur = on ? b : 0; g.shadowOffsetY = on ? 2 : 0; };

// expanding arcs from a calling frog's sac: calls = start times, ang = direction, spread = half-angle
function soundWaves(g, x, y, t, calls, o = {}) {
  const life = o.life ?? .9, n = o.n ?? 3, R = o.R ?? 160, ang = o.ang ?? -.4, sp = o.spread ?? .7;
  g.save(); g.lineCap = 'round'; shadow(g, true, .35, 6);
  for (const c of calls) for (let k = 0; k < n; k++) {
    const e = t - c - k * .09;
    if (e < 0 || e > life) continue;
    const u = e / life, r = (o.r0 ?? 18) + out3(u) * R, a = (o.a ?? .8) * (1 - u) * (1 - u);
    g.strokeStyle = rgba(o.col ?? INK, a); g.lineWidth = (o.w ?? 2.4) * (1 - u * .6);
    g.beginPath(); g.arc(x, y, r, ang - sp * (1 - u * .25), ang + sp * (1 - u * .25)); g.stroke();
  }
  shadow(g, false); g.restore();
}

// magnifier inset: pops on a spring at (cx, cy) radius r, tethered to target [tx, ty]; inner(g, cx, cy, r) draws the close-up
function lens(g, cx, cy, r, tgt, e, d, inner, o = {}) {
  if (e < 0 || e > d) return;
  const pop = spring(e, 2.6, .5) * (1 - io3(ss(d - .35, d, e))), R = r * Math.max(0, pop);
  if (R < 2) return;
  const t = o.t ?? 0, a = clamp(e * 5) * (1 - ss(d - .25, d, e));
  // connector: tangent lines from the target ring to the lens
  if (tgt) {
    const dx = cx - tgt[0], dy = cy - tgt[1], D = Math.hypot(dx, dy), th = Math.atan2(dy, dx), rr = (o.tr ?? 16), grow = out3(clamp(e / .35));
    if (D > R + rr) {
      const al = Math.asin(clamp((R - rr) / D, -1, 1));
      g.save(); shadow(g, true, .4, 8); g.strokeStyle = rgba(INK, .75 * a); g.lineWidth = 1.3;
      for (const sg of [-1, 1]) {
        const p = th + sg * (Math.PI / 2 + al), ax = tgt[0] + Math.cos(p) * rr, ay = tgt[1] + Math.sin(p) * rr, bx = cx + Math.cos(p) * R, by = cy + Math.sin(p) * R;
        g.beginPath(); g.moveTo(ax, ay); g.lineTo(lerp(ax, bx, grow), lerp(ay, by, grow)); g.stroke();
      }
      g.setLineDash([3, 4]); G.circle(g, tgt[0], tgt[1], rr * (.6 + .4 * spring(e, 3, .45))); g.stroke(); g.setLineDash([]);
      shadow(g, false); g.restore();
    }
  }
  // the close-up
  g.save(); G.circle(g, cx, cy, R); g.clip();
  g.fillStyle = o.bg ?? '#0e2a26'; g.fillRect(cx - R, cy - R, 2 * R, 2 * R);
  g.translate(cx, cy); g.scale(R / r, R / r); g.translate(-cx, -cy);
  inner(g, cx, cy, r, t, e);
  g.restore();
  // glass: inner shade, glare, rings
  g.save();
  g.fillStyle = G.rad(g, cx, cy, R, [[.7, '#000000', 0], [1, '#000000', .35]]); G.circle(g, cx, cy, R); g.fill();
  g.fillStyle = G.lin(g, cx - R, cy - R, cx, cy, [[0, '#ffffff', .22 * a], [1, '#ffffff', 0]]);
  g.beginPath(); g.ellipse(cx - R * .25, cy - R * .45, R * .7, R * .35, -.6, 0, TAU); g.fill();
  shadow(g, true, .5, 12); g.strokeStyle = rgba(INK, .95 * a); g.lineWidth = 2.6; G.circle(g, cx, cy, R); g.stroke(); shadow(g, false);
  g.strokeStyle = rgba(GOLD, .7 * a); g.lineWidth = 1.2; g.setLineDash([2, 6]); g.lineDashOffset = -t * 20;
  G.circle(g, cx, cy, R + 7); g.stroke(); g.setLineDash([]);
  for (let k = 0; k < 4; k++) { const q = k * Math.PI / 2 + t * .3; g.strokeStyle = rgba(INK, .8 * a); g.lineWidth = 1.6; g.beginPath(); g.moveTo(cx + Math.cos(q) * (R + 3), cy + Math.sin(q) * (R + 3)); g.lineTo(cx + Math.cos(q) * (R + 12), cy + Math.sin(q) * (R + 12)); g.stroke(); }
  if (o.mag) { g.font = '17px SvM'; g.fillStyle = rgba(GOLD, .9 * a); g.textAlign = 'center'; shadow(g, true, .5, 6); g.fillText(o.mag, cx + R * .62, cy + R * .92); shadow(g, false); g.textAlign = 'left'; }
  g.restore();
}

// microscope reticle around a subject: tick ring, crosshair gaps, a slowly turning dashed ring
function reticle(g, cx, cy, R, t, a = 1) {
  if (a < .01) return;
  g.save(); g.globalAlpha *= a; shadow(g, true, .3, 6); g.strokeStyle = rgba(INK, .5); g.lineWidth = 1;
  for (let k = 0; k < 72; k++) { const q = k / 72 * TAU, L = k % 6 === 0 ? 14 : 6; g.beginPath(); g.moveTo(cx + Math.cos(q) * R, cy + Math.sin(q) * R); g.lineTo(cx + Math.cos(q) * (R + L), cy + Math.sin(q) * (R + L)); g.stroke(); }
  g.strokeStyle = rgba(INK, .35); g.lineWidth = 1.2;
  for (let k = 0; k < 4; k++) { const q = k * Math.PI / 2; g.beginPath(); g.moveTo(cx + Math.cos(q) * (R + 22), cy + Math.sin(q) * (R + 22)); g.lineTo(cx + Math.cos(q) * (R + 60), cy + Math.sin(q) * (R + 60)); g.stroke(); }
  g.strokeStyle = rgba(GOLD, .45); g.setLineDash([10, 14]); g.lineDashOffset = t * 14; G.circle(g, cx, cy, R + 34); g.stroke(); g.setLineDash([]);
  shadow(g, false); g.restore();
}
// scale bar: draws on, end ticks, label
function scaleBar(g, x, y, len, label, e, a = 1) {
  const k = out5(clamp(e / .6)) * a;
  if (k < .01) return;
  g.save(); shadow(g, true, .45, 8); g.strokeStyle = rgba(INK, .85 * a); g.lineWidth = 2; g.lineCap = 'round';
  g.beginPath(); g.moveTo(x, y); g.lineTo(x + len * k, y); g.stroke();
  g.beginPath(); g.moveTo(x, y - 7); g.lineTo(x, y + 7); g.moveTo(x + len * k, y - 7); g.lineTo(x + len * k, y + 7); g.stroke();
  for (let i = 1; i < 10; i++) { if (i / 10 > k) break; g.lineWidth = 1; g.beginPath(); g.moveTo(x + len * i / 10, y - (i === 5 ? 5 : 3)); g.lineTo(x + len * i / 10, y); g.stroke(); }
  g.font = '19px SvM'; g.fillStyle = rgba(INK, .9 * a * ss(.3, .7, e)); g.fillText(label, x, y - 14);
  shadow(g, false); g.restore();
}
// dotted ballistic arc from p0 to p1 with apex height h; travelling dashes, arrowhead at the end
function trajectory(g, p0, p1, h, e, o = {}) {
  const k = out3(clamp(e / (o.draw ?? .4))), fade = 1 - ss(o.hold ?? 1, (o.hold ?? 1) + .4, e), a = (o.a ?? .8) * fade;
  if (a < .01 || k < .01) return;
  const P = []; for (let i = 0; i <= 40 * k; i++) { const u = i / 40; P.push([lerp(p0[0], p1[0], u), lerp(p0[1], p1[1], u) - Math.sin(Math.PI * u) * h]); }
  g.save(); shadow(g, true, .35, 6); g.strokeStyle = rgba(o.col ?? INK, a); g.lineWidth = 2; g.setLineDash([2, 9]); g.lineDashOffset = -e * 40; g.lineCap = 'round';
  g.beginPath(); P.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.stroke(); g.setLineDash([]);
  const q = P[P.length - 1], pp = P[Math.max(0, P.length - 3)], an = Math.atan2(q[1] - pp[1], q[0] - pp[0]);
  if (P.length > 3) { g.fillStyle = rgba(o.col ?? INK, a); g.beginPath(); g.moveTo(q[0] + Math.cos(an) * 9, q[1] + Math.sin(an) * 9); g.lineTo(q[0] + Math.cos(an + 2.5) * 9, q[1] + Math.sin(an + 2.5) * 9); g.lineTo(q[0] + Math.cos(an - 2.5) * 9, q[1] + Math.sin(an - 2.5) * 9); g.closePath(); g.fill(); }
  shadow(g, false); g.restore();
}
// scrolling heartbeat trace: beats = list of beat times
function ecg(g, x, y, w, h, t, beats, a = 1, col = '#ff8a7a') {
  if (a < .01) return;
  const span = 2.4;
  g.save(); g.globalAlpha *= a; shadow(g, true, .4, 6); g.strokeStyle = rgba(col, .9); g.lineWidth = 2; g.lineJoin = 'round';
  g.beginPath();
  for (let i = 0; i <= 120; i++) {
    const u = i / 120, tt = t - span + u * span; let v = 0;
    for (const b of beats) { const d = tt - b; if (d > -.05 && d < .35) v += d < 0 ? -.15 * Math.sin(Math.PI * (d + .05) / .05) : d < .04 ? Math.sin(Math.PI * d / .04) : d < .1 ? -.35 * Math.sin(Math.PI * (d - .04) / .06) : .2 * Math.sin(Math.PI * (d - .1) / .25); }
    const px = x + u * w, py = y - v * h; i ? g.lineTo(px, py) : g.moveTo(px, py);
  }
  g.stroke();
  G.glow(g, x + w, y, 12, col, .5, 'screen');
  shadow(g, false); g.restore();
}

// ---------------------------------------------------------------- close-ups
// nuptial pad: thumb skin with a dark, rough keratin pad
function padCloseup(g, cx, cy, r, t) {
  g.fillStyle = G.lin(g, cx - r, cy - r, cx + r, cy + r, [[0, '#b8b070'], [1, '#6a6a34']]); g.fillRect(cx - r, cy - r, 2 * r, 2 * r);
  g.save(); g.translate(cx, cy); g.rotate(-.5 + Math.sin(t * 2) * .03);
  g.fillStyle = G.lin(g, 0, -r * .5, 0, r * .5, [[0, '#d8cc8a'], [1, '#8a8448']]); G.ellipse(g, 0, 0, r * 1.1, r * .55); g.fill();
  g.strokeStyle = '#3a3416'; g.lineWidth = 3; g.stroke();
  for (let i = 0; i < 70; i++) { const a = hash(i) * TAU, d = Math.sqrt(hash(i + 3)) * r * .45, px = -r * .25 + Math.cos(a) * d * 1.4, py = Math.sin(a) * d * .7; g.fillStyle = rgba(mix('#2a1d10', '#4a3420', hash(i + 5)), .95); G.circle(g, px, py, 3 + hash(i + 7) * 4); g.fill(); g.fillStyle = 'rgba(255,240,200,.35)'; G.circle(g, px - 1.2, py - 1.4, 1.2); g.fill(); }
  g.restore();
}
// external gills: three feathery tufts from the side of the head; blood runs out along one edge and back along the other
function gillCloseup(g, cx, cy, r, t) {
  g.fillStyle = G.rad(g, cx - r * .3, cy, r * 1.4, [[0, '#2f6a5e'], [1, '#0a221e']]); g.fillRect(cx - r, cy - r, 2 * r, 2 * r);
  for (let i = 0; i < 14; i++) G.glow(g, cx + (hash(i + 1) - .5) * 2 * r, cy + (hash(i + 2) - .5) * 2 * r, 6 + hash(i + 3) * 14, '#bff0dc', .12, 'screen');
  g.fillStyle = G.lin(g, cx - r, cy, cx - r * .55, cy, [[0, '#5b4c2a'], [1, '#3c3222']]);
  G.ellipse(g, cx - r * 1.05, cy + r * .45, r * .5, r * .8); g.fill();
  const base = [cx - r * .62, cy + r * .42];
  for (let k = 0; k < 3; k++) {
    const a0 = -.25 - k * .42, L = r * (1.45 - k * .2), P = [];
    for (let i = 0; i <= 8; i++) { const u = i / 8, a = a0 - u * .35 + Math.sin(t * 2.2 + k + u * 2) * .06 * u; P.push([base[0] + Math.cos(a) * L * u + k * 6, base[1] + Math.sin(a) * L * u - k * 4]); }
    const D = G.resample(G.dense(P, false, 6), 48, false);
    // side filaments, alternating, shorter toward the tip
    for (let i = 3; i < 46; i += 3) {
      const p = D[i], q = D[Math.min(47, i + 1)], an = Math.atan2(q[1] - p[1], q[0] - p[0]), sg = (i / 3) % 2 ? 1 : -1, fl = (30 - i * .45) * (.8 + .4 * hash(i + k * 50)), sw = Math.sin(t * 3 + i * .4 + k) * .12;
      const ba = an + sg * (1.05 + sw), e1 = [p[0] + Math.cos(ba) * fl * .55, p[1] + Math.sin(ba) * fl * .55], e2 = [p[0] + Math.cos(ba + sg * .35) * fl, p[1] + Math.sin(ba + sg * .35) * fl];
      g.strokeStyle = '#c84a42'; g.lineWidth = 6.5 - i * .08; g.lineCap = 'round';
      g.beginPath(); g.moveTo(p[0], p[1]); g.quadraticCurveTo(e1[0], e1[1], e2[0], e2[1]); g.stroke();
      g.strokeStyle = 'rgba(255,170,155,.75)'; g.lineWidth = 2; g.beginPath(); g.moveTo(p[0], p[1]); g.quadraticCurveTo(e1[0], e1[1], e2[0], e2[1]); g.stroke();
    }
    g.fillStyle = G.lin(g, P[0][0], P[0][1], P[8][0], P[8][1], [[0, '#a8322c'], [1, '#e0645a']]);
    G.strand(g, P, 17, 6, 5); g.fill();
    g.strokeStyle = 'rgba(255,190,175,.6)'; g.lineWidth = 2.2; g.beginPath(); G.curve(g, P, false); g.stroke();
    // two lanes of blood cells: out along the top edge, back along the bottom
    for (let j = 0; j < 9; j++) for (const lane of [-1, 1]) {
      const u = (((lane > 0 ? t : -t) * .45 + j / 9 + k * .21) % 1 + 1) % 1, q = D[Math.min(47, Math.floor(u * 47))], q2 = D[Math.min(47, Math.floor(u * 47) + 1)], an = Math.atan2(q2[1] - q[1], q2[0] - q[0]) + Math.PI / 2, w = 4.5 * (1 - u * .6) * lane;
      g.fillStyle = lane > 0 ? '#ff2a1c' : '#9a1a20'; G.ellipse(g, q[0] + Math.cos(an) * w, q[1] + Math.sin(an) * w, 3.4, 2.3, an); g.fill();
    }
  }
}
// tadpole mouthparts: oral disc with papillae, labial tooth rows, black keratin jaws that scrape
function mouthCloseup(g, cx, cy, r, t) {
  g.fillStyle = '#3a3220'; g.fillRect(cx - r, cy - r, 2 * r, 2 * r);
  const sc = Math.max(0, Math.sin(t * 9)), op = .35 + .65 * sc;
  g.fillStyle = G.rad(g, cx, cy, r * .9, [[0, '#c8b890'], [1, '#8a7a58']]); G.ellipse(g, cx, cy, r * .86, r * .72); g.fill();
  for (let i = 0; i < 44; i++) { const a = i / 44 * TAU; g.fillStyle = '#d8c8a0'; G.circle(g, cx + Math.cos(a) * r * .86, cy + Math.sin(a) * r * .72, 4.5); g.fill(); g.strokeStyle = 'rgba(60,40,20,.5)'; g.lineWidth = 1; g.stroke(); }
  const row = (y, w) => { g.strokeStyle = '#1a120a'; g.lineWidth = 3; g.beginPath(); g.moveTo(cx - w, y); g.quadraticCurveTo(cx, y + (y < cy ? -6 : 6), cx + w, y); g.stroke(); for (let x = -w; x <= w; x += 6) { g.fillStyle = '#0c0804'; g.fillRect(cx + x - 1, y - 3, 2.4, 6); } };
  row(cy - r * .52, r * .5); row(cy - r * .38, r * .58); row(cy + r * .4, r * .6); row(cy + r * .52, r * .5); row(cy + r * .62, r * .36);
  g.fillStyle = '#100a06';
  g.beginPath(); g.moveTo(cx - r * .38, cy - 4 * op); g.quadraticCurveTo(cx, cy - r * .3 - 4 * op, cx + r * .38, cy - 4 * op); g.quadraticCurveTo(cx, cy - r * .12 - 4 * op, cx - r * .38, cy - 4 * op); g.fill();
  g.beginPath(); g.moveTo(cx - r * .34, cy + 4 * op); g.quadraticCurveTo(cx, cy + r * .26 + 4 * op, cx + r * .34, cy + 4 * op); g.quadraticCurveTo(cx, cy + r * .1 + 4 * op, cx - r * .34, cy + 4 * op); g.fill();
  for (let i = 0; i < 6; i++) { const k = ((t * 1.4 + i / 6) % 1); g.fillStyle = rgba('#9fd07a', .7 * (1 - k)); G.circle(g, cx + (hash(i) - .5) * r * .5, cy - k * r * .6, 3 + k * 4); g.fill(); }
}

module.exports = { soundWaves, lens, reticle, scaleBar, trajectory, ecg, padCloseup, gillCloseup, mouthCloseup };
