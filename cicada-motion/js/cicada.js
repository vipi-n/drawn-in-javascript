// Cicada rigs (side view, facing +x): adult, nymph (+ exuvia), egg. Clean illustrated shapes, thin dark outlines,
// gradient form shading, rim light and specular glints. Local units: the adult is ~650 long (head to wing tip).
const { TAU, clamp, lerp, ss, rgba, mix, ramp, noise, fbm, hash } = require('./core');
const { curve, glow, taper } = require('./gfx');

const C = (c, a = 1) => rgba(c, a);
// maturity ramps: 0 = teneral (just moulted) .. 1 = hardened
const BODY = [[0, '#f3efd9'], [.18, '#e3e6c4'], [.4, '#a7a586'], [.65, '#4a4038'], [.85, '#221a17'], [1, '#141011']];
const LEG = [[0, '#f2e9cc'], [.35, '#efc98e'], [.7, '#e48a3c'], [1, '#d9692a']];
const EYE = [[0, '#f0b5ae'], [.2, '#e9746c'], [.55, '#d4302c'], [1, '#c4161a']];
const VEIN = [[0, '#dfe8c8'], [.3, '#e6cf98'], [.7, '#e59a4c'], [1, '#e3782a']];
const MEMB = [[0, [228, 246, 222]], [.5, [226, 236, 238]], [1, [214, 226, 236]]];

function ik(hx, hy, tx, ty, l1, l2, bx, by) {
  let dx = tx - hx, dy = ty - hy, d = Math.hypot(dx, dy);
  const max = (l1 + l2) * .999;
  if (d > max) { tx = hx + dx / d * max; ty = hy + dy / d * max; dx = tx - hx; dy = ty - hy; d = max; }
  if (d < 1e-3) d = 1e-3;
  const a = (l1 * l1 - l2 * l2 + d * d) / (2 * d), h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
  const mx = hx + dx / d * a, my = hy + dy / d * a;
  let kx = -dy / d, ky = dx / d;
  if (kx * bx + ky * by < 0) { kx = -kx; ky = -ky; }
  return [mx + kx * h, my + ky * h, tx, ty];
}
function formFill(ctx, y0, y1, base, o = {}) {
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  g.addColorStop(0, C(mix(base, [255, 250, 235], o.hi ?? .22)));
  g.addColorStop(.32, C(base));
  g.addColorStop(1, C(mix(base, [0, 0, 0], o.lo ?? .5)));
  return g;
}
function rimStroke(ctx, pts, closed, color, a, w, dx, dy) {
  ctx.save(); ctx.clip(); ctx.translate(dx, dy); ctx.strokeStyle = C(color, a); ctx.lineWidth = w; ctx.beginPath(); curve(ctx, pts, closed); ctx.stroke(); ctx.restore();
}
function outline(ctx, pts, closed, color, w = 1.6) { ctx.strokeStyle = C(color, .9); ctx.lineWidth = w; ctx.lineJoin = 'round'; ctx.beginPath(); curve(ctx, pts, closed); ctx.stroke(); }
function spec(ctx, x, y, rx, ry, rot, a) {
  if (a <= 0.005) return;
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(1, ry / rx);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx); g.addColorStop(0, `rgba(255,255,255,${a})`); g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, rx, 0, TAU); ctx.fill(); ctx.restore();
}

// a jointed leg: femur / tibia / tarsus with gradient fill, spines and a claw
function leg(ctx, hip, knee, foot, w, col, line, o = {}) {
  const [hx, hy] = hip, [kx, ky] = knee, [fx, fy] = foot;
  const g = ctx.createLinearGradient(hx, hy - 30, hx + 20, hy + 120);
  g.addColorStop(0, C(mix(col, [255, 236, 200], .25))); g.addColorStop(1, C(mix(col, [0, 0, 0], .35)));
  ctx.fillStyle = g; ctx.strokeStyle = C(line, .9); ctx.lineWidth = 1.4; ctx.lineJoin = 'round';
  taper(ctx, [[hx, hy], [(hx + kx) / 2, (hy + ky) / 2 - w[0] * .12], [kx, ky]], [w[0], w[0] * 1.06, w[1]]); ctx.fill(); ctx.stroke();
  const tx = lerp(kx, fx, .8), ty = lerp(ky, fy, .8);
  taper(ctx, [[kx, ky], [(kx + tx) / 2, (ky + ty) / 2], [tx, ty]], [w[1] * .9, w[2] * 1.1, w[2]]); ctx.fill(); ctx.stroke();
  const dx = fx - tx, dy = fy - ty, d = Math.hypot(dx, dy) || 1, ux = dx / d, uy = dy / d;
  ctx.fillStyle = C(mix(col, [0, 0, 0], .2));
  for (let i = 0; i < 2; i++) { const px = tx + dx * (.3 + i * .38), py = ty + dy * (.3 + i * .38); ctx.beginPath(); ctx.ellipse(px, py, w[2] * .95, w[2] * .7, Math.atan2(dy, dx), 0, TAU); ctx.fill(); ctx.stroke(); }
  ctx.strokeStyle = C(mix(line, [0, 0, 0], .2), .95); ctx.lineWidth = Math.max(1.4, w[2] * .45); ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(fx, fy); ctx.quadraticCurveTo(fx + ux * 6 - uy * 5, fy + uy * 6 + ux * 5, fx + ux * 3 - uy * 11, fy + uy * 3 + ux * 11); ctx.stroke();
  if (o.spines !== false) {
    ctx.lineWidth = 1.2; ctx.strokeStyle = C(line, .8);
    const n = o.spines || 4, sx = tx - kx, sy = ty - ky, sl = Math.hypot(sx, sy) || 1, nx = -sy / sl, ny = sx / sl, side = o.side ?? 1;
    for (let i = 1; i <= n; i++) { const u = i / (n + 1), px = kx + sx * u, py = ky + sy * u; ctx.beginPath(); ctx.moveTo(px + nx * w[2] * side, py + ny * w[2] * side); ctx.lineTo(px + nx * (w[2] + 6) * side + sx / sl * 5, py + ny * (w[2] + 6) * side + sy / sl * 5); ctx.stroke(); }
  }
  ctx.fillStyle = C(mix(col, [0, 0, 0], .45), .8); ctx.beginPath(); ctx.arc(kx, ky, w[1] * .55, 0, TAU); ctx.fill();
}

// ---------------------------------------------------------------- wings
// unit coords: u along the span (0 base .. 1 tip), v across (negative = leading edge)
const FW = { lead: [[0, -.02], [.06, -.075], [.2, -.11], [.42, -.13], [.66, -.13], [.86, -.105], [.97, -.06], [1, -.01]], trail: [[.985, .05], [.9, .1], [.74, .145], [.52, .17], [.3, .16], [.13, .1], [.03, .03]] };
const HW = { lead: [[0, -.01], [.1, -.06], [.32, -.09], [.58, -.09], [.82, -.06], [.95, -.02], [1, .01]], trail: [[.97, .06], [.84, .11], [.6, .14], [.36, .13], [.15, .08], [.03, .02]] };
// longitudinal veins: [v at base, u of the node, [u, v] where they meet the margin]
const FWV = [[-.06, .3, [.86, -.1]], [-.035, .32, [.95, -.05]], [-.01, .33, [1, .01]], [.015, .34, [.97, .06]], [.04, .36, [.9, .1]], [.07, .38, [.78, .14]], [.09, .4, [.6, .16]]];
function warp(u, v, crumple, seed) {
  if (crumple <= 0) return [u, v];
  const n = fbm(u * 6 + seed, 3), n2 = fbm(u * 9 + seed * 3, 2);
  return [u * (1 - .55 * crumple) + n * .05 * crumple, v * (1 - .45 * crumple) + n2 * .09 * crumple];
}
function drawWing(ctx, o) {
  const { L, def = FW, ang = Math.PI, wid = 1, crumple = 0, m = 1, alpha = 1, seed = 1, far = false, veins = FWV, light = 0 } = o;
  ctx.save();
  ctx.rotate(ang); ctx.scale(1, -wid);
  ctx.globalAlpha *= alpha;
  const pts = [...def.lead, ...def.trail].map(([u, v]) => { const [a, b] = warp(u, v, crumple, seed); return [a * L, b * L]; });
  const vc = ramp(VEIN, m), mem = ramp(MEMB, m);
  ctx.beginPath(); curve(ctx, pts, true);
  const g = ctx.createLinearGradient(0, 0, L, 0);
  const a0 = (far ? .2 : .28) + crumple * .45, a1 = (far ? .08 : .12) + crumple * .45;
  g.addColorStop(0, `rgba(${mem[0] | 0},${mem[1] | 0},${mem[2] | 0},${a0 + .12})`); g.addColorStop(.25, `rgba(${mem[0] | 0},${mem[1] | 0},${mem[2] | 0},${a0})`); g.addColorStop(1, `rgba(${(mem[0] - 10) | 0},${(mem[1] - 6) | 0},${mem[2] | 0},${a1})`);
  ctx.fillStyle = g; ctx.fill();
  ctx.save(); ctx.clip();
  const sh = ctx.createLinearGradient(0, -L * .14, L * .3, L * .18);
  sh.addColorStop(0, 'rgba(255,255,255,0)'); sh.addColorStop(.45, `rgba(190,225,255,${.14 + light * .1})`); sh.addColorStop(.55, `rgba(255,215,190,${.1 + light * .08})`); sh.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = sh; ctx.fillRect(0, -L * .2, L, L * .45);
  const bg = ctx.createLinearGradient(0, 0, L * .3, 0); bg.addColorStop(0, C(vc, .35 * m)); bg.addColorStop(1, C(vc, 0)); ctx.fillStyle = bg; ctx.fillRect(0, -L * .2, L * .3, L * .45);
  const P = (u, v) => { const [a, b] = warp(u, v, crumple, seed); return [a * L, b * L]; };
  ctx.strokeStyle = C(vc, far ? .55 : .9); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const ends = [];
  veins.forEach(([v0, un, [ue, ve]], i) => {
    ctx.lineWidth = i === 0 ? 2.2 : 1.5;
    const p0 = P(0, v0 * .4), p1 = P(un, v0 * 1.05), p2 = P(lerp(un, ue, .55), lerp(v0, ve, .6)), p3 = P(ue * .93, ve * .88);
    ctx.beginPath(); ctx.moveTo(p0[0], p0[1]); ctx.bezierCurveTo(p1[0], p1[1], p2[0], p2[1], p3[0], p3[1]); ctx.stroke();
    ends.push(p3);
  });
  ctx.lineWidth = 1.2; ctx.beginPath(); ends.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.stroke();
  ctx.lineWidth = 1.1; ctx.strokeStyle = C(vc, far ? .4 : .7);
  for (let i = 0; i < veins.length - 1; i++) {
    const u = .55 + (i % 2) * .06 + hash(seed * 13 + i) * .03;
    const va = lerp(veins[i][0], veins[i][2][1], ss(veins[i][1], veins[i][2][0], u)), vb = lerp(veins[i + 1][0], veins[i + 1][2][1], ss(veins[i + 1][1], veins[i + 1][2][0], u + .03));
    const a = P(u, va), b = P(u + .03, vb);
    ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
  }
  ctx.restore();
  ctx.strokeStyle = C(vc, far ? .7 : 1); ctx.lineWidth = 3; ctx.beginPath();
  curve(ctx, pts.slice(0, def.lead.length), false); ctx.stroke();
  ctx.lineWidth = 1; ctx.strokeStyle = C(mix(vc, [70, 30, 10], .45), far ? .4 : .65);
  ctx.beginPath(); curve(ctx, pts, true); ctx.stroke();
  ctx.restore();
}

// ---------------------------------------------------------------- ADULT
// o: x,y,sc,rot,flip, m maturity, wingOpen (0 folded .. 1 spread), flap (-1..1), ghost [{fl,a}], wingSize, crumple,
//    pulse (tymbal buzz 0..1), legs 'perch'|'cling'|'air'|'walk'|'dangle', walk, ground (feet y), stance, legReach [[x,y]x3],
//    light [lx,ly], rim, rimA, alpha, sil (silhouette 0..1), eyeGlow, ovip (0..1), t, dangle (0..1 legs folding up)
function adult(ctx, o = {}) {
  const { x = 0, y = 0, sc = 1, rot = 0, flip = 1, m = 1, flap = 0, wingOpen = 0, wingSize = 1, crumple = 0, pulse = 0, walk = 0, stance = 0, light = [-.35, -1],
    rim = '#ffd9a0', rimA = .55, alpha = 1, sil = 0, legs = 'perch', eyeGlow = 0, t = 0, ground = 118, ovip = 0, dangle = 0, legReach = null, hideWings = false } = o;
  ctx.save();
  ctx.translate(x, y); ctx.rotate(rot); ctx.scale(sc * flip, sc);
  ctx.globalAlpha *= alpha;
  const lx = light[0] * flip, ly = light[1];
  const silC = [12, 10, 14];
  const S = (c) => (sil > 0 ? mix(c, silC, sil) : c);
  const body = S(ramp(BODY, m)), legC = S(ramp(LEG, m)), eyeC = sil > 0 ? mix(ramp(EYE, m), [90, 14, 14], sil * .6) : ramp(EYE, m);
  const lineC = mix(body, [0, 0, 0], .65);
  const rA = rimA * (1 - sil * .1);
  const breathe = 1 + pulse * .04;

  const root = [40, -72];
  const spread = wingOpen;
  const angFor = (fl) => { const up = (fl > 0 ? fl * 1.15 : fl * .7) + .5; return [Math.PI - .2 + spread * (up + .22), Math.PI - .24 + spread * (up + .02)]; };
  const wingList = o.ghost || [{ fl: flap, a: 1 }];
  const drawWings = (far) => {
    if (wingSize <= .01 || hideWings) return;
    for (const gh of wingList) {
      const [fa, ha] = angFor(gh.fl);
      ctx.save(); ctx.translate(root[0] + (far ? -8 : 0), root[1] + (far ? -5 : 0));
      const off = far ? -.04 + .24 * spread * (1 + Math.abs(gh.fl) * .4) : 0;
      const wid = (far ? .9 : 1) * (spread > 0 ? lerp(1, .75, Math.abs(gh.fl) * spread) : 1);
      drawWing(ctx, { L: 330 * wingSize, def: HW, veins: FWV.slice(0, 5), ang: ha + off - .05, wid: wid * .95, crumple, m, alpha: (far ? .5 : .75) * gh.a, seed: 3 + far, far, light: .5 });
      drawWing(ctx, { L: 470 * wingSize, def: FW, ang: fa + off, wid, crumple, m, alpha: (far ? .55 : .95) * gh.a, seed: 1 + far, far, light: .5 });
      ctx.restore();
    }
  };
  if (spread > .02) drawWings(true);

  const LS = [
    { hip: [92, 48], l1: 70, l2: 76, b: [1, -.3], tx: 150, w: [10, 8, 4.2], sp: 3 },
    { hip: [26, 58], l1: 66, l2: 78, b: [.2, -1], tx: 44, w: [8.5, 6.5, 3.6], sp: 3 },
    { hip: [-38, 58], l1: 84, l2: 98, b: [-1, -.35], tx: -92, w: [9, 6.8, 3.6], sp: 5 },
  ];
  const footFor = (Lg, i, far) => {
    let tx = Lg.tx + stance, ty = ground;
    if (legs === 'air') { tx = Lg.hip[0] + [70, -14, -88][i]; ty = Lg.hip[1] + [70, 92, 80][i] + Math.sin(t * 5 + i) * 6; }
    else if (legs === 'dangle') { tx = Lg.hip[0] + [40, 0, -40][i] * (1 - dangle) + Math.sin(t * 2.2 + i * 1.3) * 6; ty = Lg.hip[1] + 128 - dangle * 30 + Math.cos(t * 1.7 + i) * 5; }
    else if (legs === 'cling') ty = ground + [0, 4, 8][i];
    else if (legs === 'walk') { const ph = walk * TAU + (i % 2 ? Math.PI : 0) + (far ? Math.PI : 0); tx += Math.cos(ph) * 30; ty -= Math.max(0, Math.sin(ph)) * 26; }
    if (legReach && legReach[i]) { tx = legReach[i][0]; ty = legReach[i][1]; }
    if (far) tx += 14;
    return [tx, ty];
  };
  const drawLegs = (far) => {
    LS.forEach((Lg, i) => {
      const [tx, ty] = footFor(Lg, i, far);
      const k = ik(Lg.hip[0], Lg.hip[1], tx, ty, Lg.l1, Lg.l2, Lg.b[0], Lg.b[1]);
      const col = far ? mix(legC, [0, 0, 0], .35) : legC;
      leg(ctx, Lg.hip, [k[0], k[1]], [k[2], k[3]], Lg.w, col, mix(col, [0, 0, 0], .6), { spines: Lg.sp, side: i === 2 ? -1 : 1 });
    });
  };
  ctx.save(); ctx.translate(-10, -7); ctx.globalAlpha *= .85; drawLegs(true); ctx.restore();

  // abdomen
  ctx.save(); ctx.scale(1, breathe);
  const ab = [[-56, -64], [-120, -66], [-190, -60], [-252, -46], [-302, -26], [-330, -4], [-326, 16], [-292, 34], [-236, 52], [-168, 62], [-104, 66], [-56, 62]];
  ctx.beginPath(); curve(ctx, ab, true); ctx.fillStyle = formFill(ctx, -70, 70, body); ctx.fill();
  ctx.save(); ctx.clip();
  for (let i = 0; i < 8; i++) {
    const sx = -80 - i * 30 - i * i * .4;
    const og = ctx.createLinearGradient(0, -10, 0, 70); og.addColorStop(0, C(legC, 0)); og.addColorStop(1, C(legC, .85 * (.25 + .75 * m)));
    ctx.fillStyle = og; ctx.beginPath(); ctx.moveTo(sx + 8, -80); ctx.bezierCurveTo(sx, -30, sx + 6, 30, sx - 3, 90); ctx.lineTo(sx - 9, 90); ctx.bezierCurveTo(sx, 30, sx - 6, -30, sx + 2, -80); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = C(lineC, .4); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(sx + 3, -80); ctx.bezierCurveTo(sx - 5, -30, sx + 3, 30, sx - 7, 90); ctx.stroke();
  }
  if (pulse > 0) { ctx.fillStyle = `rgba(255,214,150,${pulse * .14})`; ctx.fillRect(-140, -70, 90, 140); }
  rimStroke(ctx, ab, true, rim, rA, 7, -lx * 4, -ly * 4);
  ctx.restore();
  outline(ctx, ab, true, lineC, 1.5);
  if (ovip > 0) {
    const ol = 110 * ovip;
    ctx.fillStyle = C(mix(legC, [60, 20, 5], .35)); ctx.strokeStyle = C([40, 18, 8], .9); ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(-318, 14); ctx.lineTo(-318 - ol * .55, 16 + ol); ctx.lineTo(-322 - ol * .55, 18 + ol); ctx.lineTo(-300, 30); ctx.closePath(); ctx.fill(); ctx.stroke();
  }
  ctx.restore();

  // thorax
  const th = [[124, -46], [104, -78], [60, -100], [4, -104], [-46, -88], [-72, -54], [-70, -6], [-60, 40], [-26, 62], [40, 68], [96, 58], [124, 30], [130, -10]];
  ctx.beginPath(); curve(ctx, th, true); ctx.fillStyle = formFill(ctx, -105, 70, body, { hi: .28 }); ctx.fill();
  ctx.save(); ctx.clip();
  const pr = ctx.createLinearGradient(132, 0, 84, 0); pr.addColorStop(0, C(mix(legC, body, .35), .95)); pr.addColorStop(.4, C(mix(legC, body, .55), .5)); pr.addColorStop(1, C(legC, 0));
  ctx.fillStyle = pr; ctx.beginPath(); ctx.moveTo(140, -90); ctx.lineTo(100, -90); ctx.quadraticCurveTo(82, -20, 104, 80); ctx.lineTo(140, 80); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = C(lineC, .55); ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(80, -92); ctx.quadraticCurveTo(66, -30, 82, 64); ctx.stroke();
  ctx.strokeStyle = C(legC, .75 * (.25 + .75 * m)); ctx.lineWidth = 5; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-40, -92); ctx.quadraticCurveTo(-28, -80, -14, -96); ctx.moveTo(-50, -80); ctx.quadraticCurveTo(-30, -88, -10, -78); ctx.stroke();
  spec(ctx, 20, -86, 60, 16, -.05, .28 * (1 - sil));
  rimStroke(ctx, th, true, rim, rA, 8, -lx * 4, -ly * 4);
  ctx.restore();
  outline(ctx, th, true, lineC, 1.5);

  // head
  const hd = [[122, -44], [148, -60], [186, -56], [214, -32], [228, 0], [224, 30], [202, 50], [160, 50], [132, 34], [120, 6]];
  ctx.beginPath(); curve(ctx, hd, true); ctx.fillStyle = formFill(ctx, -60, 55, body, { hi: .25 }); ctx.fill();
  ctx.save(); ctx.clip();
  ctx.strokeStyle = C(mix(body, [255, 240, 220], .12), .5); ctx.lineWidth = 2;
  for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.moveTo(196 + i * 4, 18 + i * 3); ctx.quadraticCurveTo(214 + i * 2, 24 + i * 3, 226, 14 + i * 5); ctx.stroke(); }
  rimStroke(ctx, hd, true, rim, rA * .9, 7, -lx * 3, -ly * 3);
  ctx.restore();
  outline(ctx, hd, true, lineC, 1.4);
  {
    const ex = 176, ey = -16, er = 36;
    const g = ctx.createRadialGradient(ex - 12, ey - 14, 2, ex, ey, er);
    g.addColorStop(0, C(mix(eyeC, [255, 236, 210], .55))); g.addColorStop(.3, C(mix(eyeC, [255, 120, 90], .12))); g.addColorStop(.8, C(eyeC)); g.addColorStop(1, C(mix(eyeC, [0, 0, 0], .65)));
    ctx.beginPath(); ctx.ellipse(ex, ey, er, er * 1.06, -.25, 0, TAU); ctx.fillStyle = g; ctx.fill();
    ctx.save(); ctx.clip();
    ctx.strokeStyle = 'rgba(0,0,0,.09)'; ctx.lineWidth = .9;
    for (let i = -7; i <= 7; i++) { ctx.beginPath(); ctx.moveTo(ex + i * 6 - 40, ey - 50); ctx.lineTo(ex + i * 6 + 40, ey + 50); ctx.stroke(); ctx.beginPath(); ctx.moveTo(ex + i * 6 + 40, ey - 50); ctx.lineTo(ex + i * 6 - 40, ey + 50); ctx.stroke(); }
    ctx.restore();
    ctx.strokeStyle = 'rgba(40,0,0,.75)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.ellipse(ex, ey, er, er * 1.06, -.25, 0, TAU); ctx.stroke();
    const tw = .75 + .25 * Math.sin(t * 2.3);
    ctx.fillStyle = `rgba(255,255,255,${.85 * tw})`; ctx.beginPath(); ctx.ellipse(ex - 13, ey - 17, 7.5, 4.4, -.6, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.beginPath(); ctx.arc(ex + 13, ey + 17, 3, 0, TAU); ctx.fill();
    if (eyeGlow > 0) { ctx.globalCompositeOperation = 'lighter'; glow(ctx, ex, ey, 80, '#ff5a3a', eyeGlow * .5); ctx.globalCompositeOperation = 'source-over'; }
    ctx.fillStyle = C(mix(eyeC, [255, 210, 170], .3), .95);
    ctx.beginPath(); ctx.arc(160, -56, 4, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.arc(186, -54, 3.6, 0, TAU); ctx.fill();
  }
  ctx.strokeStyle = C(mix(body, [0, 0, 0], .2), .9); ctx.lineWidth = 2.2; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(214, -4); ctx.quadraticCurveTo(236, -10, 246 + Math.sin(t * 3) * 2, -26); ctx.stroke();
  ctx.lineWidth = 6; ctx.strokeStyle = C(mix(body, [40, 20, 10], .35)); ctx.beginPath(); ctx.moveTo(204, 44); ctx.quadraticCurveTo(190, 70, 140, 92); ctx.stroke();

  drawLegs(false);
  drawWings(false);
  ctx.restore();
}

// ---------------------------------------------------------------- NYMPH
// o: x,y,sc,rot,flip, young (0 mature brown .. 1 pale hatchling), legsMode 'walk'|'dig'|'climb'|'grip', walk, dig,
//    ground, eyes, exuvia (empty shell), crack (0..1 back split), light, rim, rimA, alpha, t, red (0..1 red eyes), sil, wet
function nymph(ctx, o = {}) {
  const { x = 0, y = 0, sc = 1, rot = 0, flip = 1, young = 0, dig = 0, walk = 0, alpha = 1, light = [-.3, -1], rim = '#ffd7a0', rimA = .5, t = 0, ground = 100, eyes = 1,
    exuvia = 0, crack = 0, stance = 0, legsMode = 'walk', red = 0, sil = 0, wet = 0 } = o;
  ctx.save();
  ctx.translate(x, y); ctx.rotate(rot); ctx.scale(sc * flip, sc); ctx.globalAlpha *= alpha;
  const lx = light[0] * flip, ly = light[1];
  let body = exuvia ? [184, 132, 66] : mix([150, 96, 46], [243, 234, 208], young);
  if (sil > 0) body = mix(body, [14, 10, 8], sil);
  const pad = mix(exuvia ? [150, 98, 44] : mix([88, 52, 24], [214, 196, 160], young), [14, 10, 8], sil);
  const lineC = mix(body, [20, 8, 0], .7);
  if (exuvia) ctx.globalAlpha *= .85;

  const fore = (far) => {
    const ph = dig * TAU + (far ? .9 : 0);
    let tx, ty;
    if (legsMode === 'dig') { tx = 196 + Math.sin(ph) * 30; ty = 52 + Math.cos(ph) * 30; }
    else if (legsMode === 'climb' || legsMode === 'grip') { tx = 202 + (legsMode === 'climb' ? Math.sin(walk * TAU + (far ? Math.PI : 0)) * 14 : 0); ty = ground - 18 + (legsMode === 'climb' ? Math.cos(walk * TAU) * 10 : 0); }
    else { const p = walk * TAU + (far ? Math.PI : 0); tx = 186 + Math.cos(p) * 30; ty = ground - Math.max(0, Math.sin(p)) * 24; }
    const hip = [92 - (far ? 6 : 0), 36];
    const k = ik(hip[0], hip[1], tx, ty, 74, 70, .9, -1);
    const col = far ? mix(body, [0, 0, 0], .35) : mix(body, [255, 230, 180], .05);
    const g = ctx.createLinearGradient(hip[0], hip[1] - 20, hip[0], hip[1] + 60); g.addColorStop(0, C(mix(col, [255, 240, 210], .25))); g.addColorStop(1, C(mix(col, [0, 0, 0], .3)));
    ctx.fillStyle = g; ctx.strokeStyle = C(lineC, .95); ctx.lineWidth = 1.5;
    taper(ctx, [[hip[0], hip[1]], [(hip[0] + k[0]) / 2, (hip[1] + k[1]) / 2 - 6], [k[0], k[1]]], [15, 19, 12]); ctx.fill(); ctx.stroke();
    const fx = k[0] - hip[0], fy = k[1] - hip[1], fl = Math.hypot(fx, fy) || 1, nx = -fy / fl, ny = fx / fl, s = ny > 0 ? 1 : -1;
    ctx.fillStyle = C(mix(col, [40, 15, 0], .55));
    for (let i = 0; i < 3; i++) { const u = .45 + i * .17, px = hip[0] + fx * u, py = hip[1] + fy * u; ctx.beginPath(); ctx.moveTo(px - fx / fl * 6 + nx * 14 * s, py - fy / fl * 6 + ny * 14 * s); ctx.lineTo(px + nx * (28 + i * 3) * s, py + ny * (28 + i * 3) * s); ctx.lineTo(px + fx / fl * 6 + nx * 14 * s, py + fy / fl * 6 + ny * 14 * s); ctx.closePath(); ctx.fill(); }
    ctx.fillStyle = g;
    taper(ctx, [[k[0], k[1]], [(k[0] + k[2]) / 2 + 4, (k[1] + k[3]) / 2 - 4], [k[2], k[3]]], [10, 9, 6]); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = C(mix(col, [0, 0, 0], .7)); ctx.lineWidth = 3.2; ctx.lineCap = 'round';
    const dx = k[2] - k[0], dy = k[3] - k[1], d = Math.hypot(dx, dy) || 1;
    for (let i = 0; i < 3; i++) { const bx = k[2] - dx / d * i * 7, by = k[3] - dy / d * i * 7; ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx + dx / d * 10 - dy / d * 8, by + dy / d * 10 + dx / d * 8); ctx.stroke(); }
  };
  const rear = (i, far) => {
    const hips = [[24, 52], [-32, 56]], L1 = [58, 74], L2 = [64, 82], bend = [[.3, -1], [-1, -.4]], base = [52, -86];
    const ph = walk * TAU + (i ? Math.PI : 0) + (far ? Math.PI : 0);
    let tx = base[i] + stance, ty = ground;
    if (legsMode === 'walk') { tx += Math.cos(ph) * 26; ty -= Math.max(0, Math.sin(ph)) * 22; }
    else if (legsMode === 'climb') { tx += Math.cos(ph) * 18; ty += Math.sin(ph) * 6; }
    else if (legsMode === 'dig') tx += Math.sin(dig * TAU * .5 + i) * 10;
    if (far) tx += 12;
    const h = hips[i], k = ik(h[0], h[1], tx, ty, L1[i], L2[i], bend[i][0], bend[i][1]);
    const col = far ? mix(body, [0, 0, 0], .4) : mix(body, [0, 0, 0], .08);
    leg(ctx, h, [k[0], k[1]], [k[2], k[3]], [8, 6, 3.4], col, lineC, { spines: 3, side: i ? -1 : 1 });
  };
  ctx.save(); ctx.translate(-8, -6); ctx.globalAlpha *= .8; fore(true); rear(0, true); rear(1, true); ctx.restore();

  // abdomen
  const ab = [[-40, -62], [-96, -70], [-156, -64], [-210, -46], [-248, -18], [-262, 12], [-246, 40], [-200, 60], [-140, 70], [-80, 68], [-40, 60]];
  ctx.beginPath(); curve(ctx, ab, true); ctx.fillStyle = formFill(ctx, -72, 72, body, { hi: .28, lo: .48 }); ctx.fill();
  ctx.save(); ctx.clip();
  for (let i = 0; i < 8; i++) {
    const sx = -58 - i * 26 - i * i * .5;
    ctx.strokeStyle = C(mix(body, [0, 0, 0], .45), .55); ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(sx + 6, -80); ctx.bezierCurveTo(sx - 6, -30, sx + 6, 30, sx - 6, 90); ctx.stroke();
    ctx.strokeStyle = C(mix(body, [255, 240, 210], .35), .35); ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(sx + 10, -80); ctx.bezierCurveTo(sx - 2, -30, sx + 10, 30, sx - 2, 90); ctx.stroke();
  }
  ctx.strokeStyle = C(mix(body, [255, 240, 210], .4), .35); ctx.lineWidth = .9;
  for (let i = 0; i < 26; i++) { const u = hash(i * 7) * 200 + 50, a = hash(i * 3) * .6; ctx.beginPath(); ctx.moveTo(-u, -66 + u * .1 - 2); ctx.lineTo(-u - 6, -74 + u * .1 - 6 * a); ctx.stroke(); }
  ctx.fillStyle = C(mix(body, [0, 0, 0], .4), .25); for (let i = 0; i < 40; i++) { ctx.beginPath(); ctx.arc(-50 - hash(i + 40) * 200, -50 + hash(i + 90) * 100, 1.5 + hash(i) * 2, 0, TAU); ctx.fill(); }
  spec(ctx, -120, -54, 70, 12, -.05, .25 * (1 - sil) + wet * .3);
  rimStroke(ctx, ab, true, rim, rimA, 7, -lx * 4, -ly * 4);
  ctx.restore();
  outline(ctx, ab, true, lineC, 1.6);

  // thorax
  const th = [[104, -38], [86, -74], [40, -98], [-10, -96], [-44, -70], [-48, -20], [-40, 34], [-8, 58], [52, 62], [96, 44], [112, 8]];
  ctx.beginPath(); curve(ctx, th, true); ctx.fillStyle = formFill(ctx, -100, 64, body, { hi: .3 }); ctx.fill();
  ctx.save(); ctx.clip();
  ctx.strokeStyle = C(mix(body, [255, 240, 210], .3), .5); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(84, -76); ctx.quadraticCurveTo(30, -100, -40, -74); ctx.stroke();
  ctx.strokeStyle = C(lineC, .45); ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(60, -92); ctx.quadraticCurveTo(46, -30, 64, 56); ctx.stroke();
  spec(ctx, 30, -82, 54, 14, -.15, .3 * (1 - sil) + wet * .3);
  rimStroke(ctx, th, true, rim, rimA, 8, -lx * 4, -ly * 4);
  ctx.restore();
  outline(ctx, th, true, lineC, 1.6);
  // wing pads
  const wp = [[40, -76], [6, -84], [-40, -70], [-104, -34], [-132, 6], [-110, 26], [-60, 18], [-10, 4], [30, -24]];
  ctx.beginPath(); curve(ctx, wp, true);
  const pg = ctx.createLinearGradient(0, -90, 0, 30); pg.addColorStop(0, C(mix(pad, [255, 230, 190], .3))); pg.addColorStop(.5, C(pad)); pg.addColorStop(1, C(mix(pad, [0, 0, 0], .45)));
  ctx.fillStyle = pg; ctx.fill();
  ctx.save(); ctx.clip();
  ctx.strokeStyle = C(mix(pad, [255, 230, 190], .35), .4); ctx.lineWidth = 1.4;
  for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(30 - i * 4, -70 + i * 12); ctx.quadraticCurveTo(-40 - i * 6, -50 + i * 14, -112 + i * 6, 8 + i * 3); ctx.stroke(); }
  spec(ctx, -30, -56, 50, 10, .45, .35 * (1 - sil) + wet * .3);
  ctx.restore();
  outline(ctx, wp, true, lineC, 1.4);
  if (crack > 0) {
    // the back splits along the midline: a pale glowing gap
    const cw = crack * 24;
    ctx.save();
    ctx.fillStyle = 'rgba(244,252,232,.96)';
    ctx.beginPath(); ctx.moveTo(90, -72); ctx.quadraticCurveTo(30, -100 - cw * .25, -46, -70); ctx.quadraticCurveTo(30, -96 + cw, 90, -72); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = C(lineC, .8); ctx.lineWidth = 1.4; ctx.stroke();
    ctx.globalCompositeOperation = 'lighter'; glow(ctx, 24, -86, 40 + cw * 5, '#eaffcc', .6 * crack);
    ctx.restore();
  }

  // head
  const hd = [[96, -36], [122, -58], [156, -54], [180, -28], [186, 6], [172, 34], [140, 44], [110, 32], [94, 4]];
  ctx.beginPath(); curve(ctx, hd, true); ctx.fillStyle = formFill(ctx, -60, 46, body, { hi: .28 }); ctx.fill();
  ctx.save(); ctx.clip();
  ctx.strokeStyle = C(mix(body, [255, 235, 205], .2), .45); ctx.lineWidth = 1.6;
  for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(160 + i * 3, 4 + i * 5); ctx.quadraticCurveTo(178, 10 + i * 5, 188, 2 + i * 6); ctx.stroke(); }
  rimStroke(ctx, hd, true, rim, rimA * .9, 7, -lx * 3, -ly * 3);
  ctx.restore();
  outline(ctx, hd, true, lineC, 1.5);
  {
    const e0 = exuvia ? [206, 168, 116] : mix(mix([94, 46, 24], [235, 225, 205], young), [200, 30, 30], red);
    const ex = 140, ey = -26, r = 21 * eyes;
    const g = ctx.createRadialGradient(ex - 6, ey - 7, 1, ex, ey, r);
    g.addColorStop(0, C(mix(e0, [255, 236, 210], .5))); g.addColorStop(.6, C(e0)); g.addColorStop(1, C(mix(e0, [0, 0, 0], .6)));
    ctx.beginPath(); ctx.ellipse(ex, ey, r, r * 1.08, -.2, 0, TAU); ctx.fillStyle = g; ctx.fill();
    ctx.strokeStyle = C(lineC, .8); ctx.lineWidth = 1.2; ctx.stroke();
    if (!exuvia) { ctx.fillStyle = 'rgba(255,255,255,.8)'; ctx.beginPath(); ctx.ellipse(ex - 7, ey - 9, 5, 3, -.6, 0, TAU); ctx.fill(); }
  }
  ctx.strokeStyle = C(lineC, .9); ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(178, -18); ctx.quadraticCurveTo(196, -26, 204, -40); ctx.stroke();
  ctx.lineWidth = 5; ctx.strokeStyle = C(mix(body, [30, 12, 0], .45)); ctx.beginPath(); ctx.moveTo(174, 34); ctx.quadraticCurveTo(160, 58, 118, 70); ctx.stroke();

  rear(0, false); rear(1, false); fore(false);
  ctx.restore();
}

// ---------------------------------------------------------------- EGG (rice-grain shaped, ~2 mm)
function egg(ctx, o = {}) {
  const { x = 0, y = 0, sc = 1, rot = 0, dev = 0, glowA = 0, alpha = 1, wob = 0 } = o;
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot + wob); ctx.scale(sc, sc); ctx.globalAlpha *= alpha;
  const L = 60, Wd = 13;
  const pts = [[-L, 2], [-L * .78, -Wd * .92], [-L * .1, -Wd * 1.05], [L * .52, -Wd * .86], [L, -1], [L * .6, Wd * .9], [0, Wd * 1.05], [-L * .62, Wd * .9]];
  ctx.beginPath(); curve(ctx, pts, true);
  const g = ctx.createLinearGradient(0, -Wd, 0, Wd);
  const dc = mix('#fbf7ea', '#f0e2bf', dev);
  g.addColorStop(0, C(mix(dc, [255, 255, 255], .6))); g.addColorStop(.45, C(dc)); g.addColorStop(1, C(mix(dc, [150, 115, 70], .5)));
  ctx.fillStyle = g; ctx.fill();
  ctx.save(); ctx.clip();
  if (dev > .05) {
    ctx.fillStyle = `rgba(200,160,100,${.22 * dev})`; ctx.beginPath(); ctx.ellipse(-2, 1, L * .82, Wd * .6, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = `rgba(150,105,55,${.4 * dev})`; ctx.lineWidth = 1;
    for (let i = 0; i < 10; i++) { const u = -L * .66 + i * (L * 1.15 / 10); ctx.beginPath(); ctx.moveTo(u, -Wd * .5); ctx.quadraticCurveTo(u + 3, 0, u, Wd * .55); ctx.stroke(); }
    ctx.strokeStyle = `rgba(150,105,55,${.35 * ss(.4, .8, dev)})`; ctx.lineWidth = 1.4;
    for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(L * .2 - i * 12, Wd * .45); ctx.lineTo(L * .32 - i * 12, Wd * .2); ctx.stroke(); }
  }
  const gl = ctx.createLinearGradient(0, -Wd, 0, 0); gl.addColorStop(0, 'rgba(255,255,255,.75)'); gl.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gl; ctx.fillRect(-L, -Wd, L * 2, Wd * .9);
  ctx.restore();
  ctx.strokeStyle = 'rgba(120,92,58,.6)'; ctx.lineWidth = 1; ctx.beginPath(); curve(ctx, pts, true); ctx.stroke();
  const es = clamp((dev - .6) / .3);
  if (es > 0) {
    ctx.fillStyle = `rgba(214,36,36,${es})`; ctx.beginPath(); ctx.arc(L * .7, -4, 3.6, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.arc(L * .7, 4.5, 3.2, 0, TAU); ctx.fill();
    ctx.globalCompositeOperation = 'lighter'; glow(ctx, L * .7, 0, 18, '#ff4a3a', .45 * es * (glowA + .4)); ctx.globalCompositeOperation = 'source-over';
  }
  ctx.restore();
}

module.exports = { adult, nymph, egg, ik, drawWing, leg, BODY, LEG, EYE, FW, HW };
