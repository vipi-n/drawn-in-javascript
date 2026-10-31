// Monarch butterfly rig. Each wing is drawn flat in its own (u, v) plane (u = out from the body, v = toward the tail)
// and mapped onto the screen by an affine derived from a 3D pose, so flapping, banking and turning foreshorten the real
// pattern. Whichever face of a wing points at the camera decides dorsal (bright orange, black veins) or ventral (pale
// buff, white-edged veins). Body-local 3D axes: X = right, Y = toward the tail, Z = dorsal (up out of the back).
//   pose: x, y (thorax centre, world units), s (scale), yaw (screen rotation, 0 = head up), roll (about the body axis,
//   0 = back to camera), pitch (head toward camera +), flap (wing angle, 0 = spread flat, ~1.45 = closed above the back),
//   flapH (hindwing angle, defaults to flap lagging slightly), sex (0 female, 1 male), open (0 crumpled .. 1 expanded),
//   abd (abdomen swelling), legs (0 tucked .. 1 standing), feet ([[x,y]..] world targets), prob (0 coiled .. 1 out),
//   probTo ([x,y]), glow (backlit), alpha.
const { TAU, clamp, lerp, ss, hash, rgba, mix, noise1, PAL } = require('./core');
const D = require('./draw');
const { T } = require('./tex');

const INK = '#170f0c';
const CLOCK = { t: 0 }; // film time, set per frame (drives idle antenna motion)

// ---------------------------------------------------------------- outlines (right wings)
const FW = [[3, -6], [18, -14], [40, -24], [64, -34], [86, -42], [100, -46], [107, -42], [109, -34], [106, -20], [100, -6], [93, 8], [86, 20], [79, 28], [66, 30], [48, 26], [30, 20], [16, 13], [6, 8]];
const HW = [[3, 4], [20, 4], [40, 6], [58, 10], [70, 16], [77, 26], [79, 38], [76, 51], [69, 63], [58, 73], [45, 80], [32, 83], [22, 81], [15, 74], [10, 60], [6, 44], [3, 28], [2, 14]];

// dense samples of the same Catmull-Rom curve D.trace draws (k points per segment)
function sampleCR(pts, k = 10) {
  const n = pts.length, out = [];
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6], c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    for (let j = 0; j < k; j++) {
      const t = j / k, u = 1 - t, a = u * u * u, b = 3 * u * u * t, c = 3 * u * t * t, d = t * t * t;
      out.push([a * p1[0] + b * c1[0] + c * c2[0] + d * p2[0], a * p1[1] + b * c1[1] + c * c2[1] + d * p2[1]]);
    }
  }
  return out;
}
const K = 10;
const FWd = sampleCR(FW, K), HWd = sampleCR(HW, K);
const span = (dense, a, b) => dense.slice(a * K, b * K + 1);
const FW_COSTA = span(FWd, 0, 5), FW_TERMEN = span(FWd, 6, 12), FW_INNER = span(FWd, 12, 17).concat([FWd[0]]);
const HW_MARGIN = span(HWd, 4, 13), HW_INNER = span(HWd, 13, 17).concat([HWd[0]]);

// ---------------------------------------------------------------- veins (polylines, smoothed when stroked)
const FV = {
  cellR: [[6, -5], [24, -12], [44, -19], [58, -25]], cellCu: [[8, 4], [26, 0], [46, -6], [60, -12]], cellEnd: [[58, -25], [59, -20], [60, -12]],
  R1: [[44, -19], [64, -30], [84, -40]], R2: [[52, -22], [74, -34], [95, -44]],
  R3: [[58, -25], [80, -34], [102, -45]], R4: [[70, -29], [90, -33], [108, -37]], R5: [[72, -28], [92, -27], [108, -26]],
  M1: [[59, -21], [84, -20], [106, -17]], M2: [[60, -16], [82, -11], [101, -5]], M3: [[60, -12], [78, -4], [95, 4]],
  Cu1: [[46, -6], [68, 3], [88, 15]], Cu2: [[30, 0], [56, 12], [80, 27]], A: [[8, 6], [40, 21], [70, 29]],
};
const HV = {
  cellR: [[6, 10], [24, 20], [40, 30]], cellCu: [[7, 14], [22, 36], [36, 44]], cellEnd: [[40, 30], [41, 35], [39, 40], [36, 44]],
  Sc: [[5, 6], [36, 8], [64, 14]], Rs: [[40, 30], [60, 27], [78, 31]], M1: [[41, 34], [62, 39], [79, 45]],
  M2: [[40, 38], [58, 48], [74, 58]], M3: [[37, 43], [52, 56], [64, 70]], Cu1: [[32, 44], [42, 62], [50, 80]],
  Cu2: [[24, 42], [30, 62], [36, 83]], A2: [[6, 18], [14, 50], [22, 81]], A3: [[4, 22], [7, 46], [11, 70]],
};

// white spots: one inner dot and two outer dots in every cell between neighbouring vein ends along a margin
function nearestIdx(pl, p) { let b = 0, bd = 1e9; pl.forEach((q, i) => { const d = (q[0] - p[0]) ** 2 + (q[1] - p[1]) ** 2; if (d < bd) { bd = d; b = i; } }); return b; }
function inward(pl, i) {
  const a = pl[Math.max(0, i - 1)], b = pl[Math.min(pl.length - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1;
  return [-dy / l, dx / l];
}
function marginSpots(pl, ends, rows) {
  const idx = ends.map((p) => nearestIdx(pl, p)).sort((a, b) => a - b), out = [];
  for (let k = 0; k < idx.length - 1; k++) {
    const i0 = idx[k], i1 = idx[k + 1], gap = i1 - i0;
    if (gap < 4) continue;
    for (const [off, fr, r] of rows) {
      const i = Math.round(i0 + gap * fr), p = pl[i], n = inward(pl, i);
      out.push([p[0] + n[0] * off, p[1] + n[1] * off, r * Math.min(1, gap / 14)]);
    }
  }
  return out;
}
const FW_SPOTS = marginSpots(FW_TERMEN, [FW_TERMEN[0], FV.R5[2], FV.M1[2], FV.M2[2], FV.M3[2], FV.Cu1[2], FV.Cu2[2], FW_TERMEN[FW_TERMEN.length - 1]],
  [[3.1, .3, 1.35], [3.1, .7, 1.35], [7.6, .5, 1.6]]);
const HW_SPOTS = marginSpots(HW_MARGIN, [HV.Rs[2], HV.M1[2], HV.M2[2], HV.M3[2], HV.Cu1[2], HV.Cu2[2], HV.A2[2], HW_MARGIN[HW_MARGIN.length - 1]],
  [[3.0, .3, 1.3], [3.0, .7, 1.3], [7.4, .5, 1.55]]);
// apex: orange subapical bar of spots and a few white ones near the costa
const APEX = [[56, -32], [80, -42], [98, -48], [107, -44], [111, -36], [109, -20], [105, -9], [99, -11], [91, -15], [82, -19], [72, -23], [62, -27]];
const SUBAPICAL = [[86.5, -36.2, 5.2, 2.5, -.2], [92.5, -30.2, 5.0, 2.4, -.08], [95.5, -22.8, 4.6, 2.3, .02], [77.5, -34.6, 3.6, 2.0, -.3]];
const APEX_WHITE = [[72, -38.5, 1.5], [80, -41.6, 1.6], [88, -44.2, 1.5], [96, -46, 1.3], [103, -43.2, 1.2], [106.5, -36, 1.3], [104.5, -15.5, 1.3]];

// ---------------------------------------------------------------- pose
function frame(o) {
  const yaw = o.yaw ?? 0, roll = o.roll ?? 0, pitch = o.pitch ?? 0;
  const cy = Math.cos(yaw), sy = Math.sin(yaw), cr = Math.cos(roll), sr = Math.sin(roll), cp = Math.cos(pitch), sp = Math.sin(pitch);
  const R = (x, y, z) => { // Rz(yaw) . Rx(pitch) . Ry(roll)
    const X = x * cr + z * sr, Z0 = -x * sr + z * cr;
    const Y = y * cp - Z0 * sp, Z = y * sp + Z0 * cp;
    return [X * cy - Y * sy, X * sy + Y * cy, Z];
  };
  const s = o.s ?? 1, ox = o.x ?? 0, oy = o.y ?? 0;
  return { R, s, P: (x, y, z) => { const p = R(x, y, z); return [ox + s * p[0], oy + s * p[1], s * p[2]]; } };
}

// affine for one wing: side +1 right / -1 left, th = wing angle, hinge = body-local origin of the wing plane
function wingAffine(F, side, th, hinge, k = [1, 1]) {
  const u = F.R(side * Math.cos(th) * k[0], 0, Math.sin(th) * k[0]), v = F.R(0, k[1], 0), o = F.P(hinge[0] * side, hinge[1], hinge[2]);
  const n = F.R(-side * Math.sin(th), 0, Math.cos(th)); // dorsal normal
  return { a: F.s * u[0], b: F.s * u[1], c: F.s * v[0], d: F.s * v[1], e: o[0], f: o[1], z: o[2], dorsal: n[2] >= 0, nz: n[2], n };
}

// ---------------------------------------------------------------- painting (inside wing coordinates)
const LIGHT = [-.45, -.65, .6];
function shadeOverlay(ctx, outline, aff, o) {
  const n = aff.n, sgn = aff.dorsal ? 1 : -1, d = (n[0] * LIGHT[0] + n[1] * LIGHT[1] + n[2] * LIGHT[2]) * sgn;
  ctx.save(); D.shape(ctx, outline); ctx.clip();
  if (d > 0) { ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = rgba('#ffe7c0', .1 * d); }
  else { ctx.fillStyle = rgba('#200800', .28 * -d); }
  ctx.fillRect(-20, -70, 150, 170);
  ctx.restore();
}
function veins(ctx, set, w, col, a = 1, skip = []) {
  ctx.strokeStyle = rgba(col, a); ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (const k in set) { if (skip.includes(k)) continue; ctx.beginPath(); D.trace(ctx, set[k], false); ctx.stroke(); }
}
function polyStroke(ctx, pl, w, col, a = 1) {
  ctx.strokeStyle = rgba(col, a); ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(pl[0][0], pl[0][1]); for (let i = 1; i < pl.length; i++) ctx.lineTo(pl[i][0], pl[i][1]); ctx.stroke();
}
function spots(ctx, list, col, k = 1) { ctx.fillStyle = rgba(col); for (const [x, y, r] of list) { ctx.beginPath(); ctx.arc(x, y, r * k, 0, TAU); ctx.fill(); } }

// wing-scale texture laid as small tiles in wing units (only worth it in macro shots)
function scaleTex(ctx, a, x0, y0, x1, y1) {
  const k = .11, sz = 600 * k;
  ctx.save(); ctx.globalAlpha *= a * .55;
  for (let x = x0; x < x1; x += sz) for (let y = y0; y < y1; y += sz) ctx.drawImage(T.scales, x, y, sz, sz);
  ctx.restore();
}

function forewing(ctx, o, dorsal) {
  const male = (o.sex ?? 0) > .5, vw = male ? 2.0 : 2.75, glow = o.glow ?? 0;
  ctx.save(); D.shape(ctx, FW); ctx.clip();
  const g = ctx.createRadialGradient(4, 4, 4, 30, -6, 115);
  if (dorsal) { g.addColorStop(0, rgba(mix('#a8380e', '#d8500c', glow))); g.addColorStop(.3, rgba(mix('#e0681a', '#ff7212', glow))); g.addColorStop(.7, rgba(mix('#f3901f', '#ff8c22', glow))); g.addColorStop(1, rgba(mix('#f7a43a', '#ffa236', glow))); }
  else { g.addColorStop(0, '#c9601e'); g.addColorStop(.35, '#ec8f36'); g.addColorStop(.75, '#f3b45c'); g.addColorStop(1, '#efc87e'); }
  ctx.fillStyle = g; ctx.fillRect(-10, -60, 130, 100);
  if (glow > 0) { // light shining through the orange cells (before the black is painted on)
    ctx.globalCompositeOperation = 'lighter';
    for (const [gx, gy, gr] of [[40, -12, 34], [70, -12, 26], [82, 6, 20], [24, 4, 22]]) {
      const lg = ctx.createRadialGradient(gx, gy, 2, gx, gy, gr);
      lg.addColorStop(0, rgba('#ffb040', .55 * glow)); lg.addColorStop(1, rgba('#ff7a10', 0));
      ctx.fillStyle = lg; ctx.fillRect(gx - gr, gy - gr, gr * 2, gr * 2);
    }
    ctx.globalCompositeOperation = 'source-over';
  }
  if (o.macro) scaleTex(ctx, o.macro, -10, -60, 120, 40);
  // apex: black with orange spots above, buff with white spots below
  D.shape(ctx, APEX); ctx.fillStyle = rgba(dorsal ? INK : '#e5bf78'); ctx.fill();
  if (!dorsal) { veins(ctx, { R3: FV.R3, R4: FV.R4, R5: FV.R5, M1: FV.M1 }, vw + 2.4, '#fff1d0', .7); }
  for (const [x, y, rx, ry, a] of SUBAPICAL) { ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.fillStyle = rgba(dorsal ? mix('#f6a32e', '#ffd36a', glow) : '#fff6e2'); ctx.beginPath(); ctx.ellipse(0, 0, rx, ry, 0, 0, TAU); ctx.fill(); ctx.restore(); }
  // dark scales at the wing base
  const bg = ctx.createRadialGradient(0, 4, 0, 0, 4, dorsal ? 30 : 20);
  bg.addColorStop(0, rgba(INK, dorsal ? .95 : .7)); bg.addColorStop(1, rgba(INK, 0));
  ctx.fillStyle = bg; ctx.fillRect(-10, -30, 50, 60);
  // margins and veins
  polyStroke(ctx, FW_TERMEN, 19, INK); polyStroke(ctx, FW_COSTA, dorsal ? 9 : 6.5, INK); polyStroke(ctx, FW_INNER, dorsal ? 6.5 : 4.5, INK);
  veins(ctx, FV, vw, INK, 1, ['R3', 'R4', 'R5']);
  veins(ctx, { R3: FV.R3, R4: FV.R4, R5: FV.R5 }, vw * .9, dorsal ? '#2a1c16' : INK);
  spots(ctx, FW_SPOTS, PAL.spot, dorsal ? 1 : 1.25);
  spots(ctx, APEX_WHITE, PAL.spot, dorsal ? 1 : 1.3);
  ctx.restore();
}

function hindwing(ctx, o, dorsal) {
  const male = (o.sex ?? 0) > .5, vw = male ? 1.9 : 2.65, glow = o.glow ?? 0;
  ctx.save(); D.shape(ctx, HW); ctx.clip();
  const g = ctx.createRadialGradient(6, 12, 4, 26, 30, 80);
  if (dorsal) { g.addColorStop(0, rgba(mix('#a8380e', '#d8500c', glow))); g.addColorStop(.35, rgba(mix('#e66f1b', '#ff7a16', glow))); g.addColorStop(1, rgba(mix('#f6a238', '#ffa036', glow))); }
  else { g.addColorStop(0, '#c97a32'); g.addColorStop(.4, '#e3a654'); g.addColorStop(1, '#efbf72'); }
  ctx.fillStyle = g; ctx.fillRect(-10, -10, 100, 100);
  if (glow > 0) {
    ctx.globalCompositeOperation = 'lighter';
    for (const [gx, gy, gr] of [[38, 40, 30], [56, 58, 22], [24, 62, 18]]) {
      const lg = ctx.createRadialGradient(gx, gy, 2, gx, gy, gr);
      lg.addColorStop(0, rgba('#ffb040', .5 * glow)); lg.addColorStop(1, rgba('#ff7a10', 0));
      ctx.fillStyle = lg; ctx.fillRect(gx - gr, gy - gr, gr * 2, gr * 2);
    }
    ctx.globalCompositeOperation = 'source-over';
  }
  if (o.macro) scaleTex(ctx, o.macro, -10, -10, 90, 95);
  const bg = ctx.createRadialGradient(2, 14, 0, 2, 14, dorsal ? 26 : 16);
  bg.addColorStop(0, rgba(INK, dorsal ? .95 : .6)); bg.addColorStop(1, rgba(INK, 0));
  ctx.fillStyle = bg; ctx.fillRect(-10, -10, 50, 60);
  if (!dorsal) veins(ctx, HV, vw + 2.8, '#fff2d2', .85, ['cellEnd']); // pale edging along every vein underneath
  polyStroke(ctx, HW_MARGIN, 17, INK); polyStroke(ctx, HW_INNER, dorsal ? 9 : 5, INK);
  veins(ctx, HV, vw, INK);
  if (male && dorsal) { // the male's scent patch on vein Cu2
    ctx.save(); ctx.translate(30.6, 62); ctx.rotate(1.28); ctx.fillStyle = rgba(INK); ctx.beginPath(); ctx.ellipse(0, 0, 6.2, 3.6, 0, 0, TAU); ctx.fill(); ctx.restore();
  }
  spots(ctx, HW_SPOTS, PAL.spot, dorsal ? 1 : 1.3);
  ctx.restore();
}

// crumpled wing (just emerged): creases across the wing that fade as it expands
function creases(ctx, outline, e, seed) {
  if (e >= .98) return;
  ctx.save(); D.shape(ctx, outline); ctx.clip();
  for (let i = 0; i < 9; i++) {
    const y0 = -50 + i * 15 + hash(seed + i) * 6, a = (1 - e) * .5;
    ctx.strokeStyle = rgba(i % 2 ? '#fff0d0' : '#1a0800', a); ctx.lineWidth = 3.5;
    ctx.beginPath();
    for (let x = -5; x <= 115; x += 10) { const y = y0 + x * .25 + Math.sin(x * .19 + i * 2.1 + seed) * 4; if (x < 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); }
    ctx.stroke();
  }
  ctx.restore();
}

function crumple(pts, e, seed) {
  if (e >= .99) return pts;
  return pts.map(([u, v], i) => [u + noise1(i * .9, seed) * 6 * (1 - e), v + noise1(i * .9 + 40, seed) * 5 * (1 - e)]);
}

function drawWing(ctx, which, aff, o) {
  const det = aff.a * aff.d - aff.b * aff.c;
  if (Math.abs(det) < .0004 * (o.s ?? 1) ** 2) return;
  const e = clamp(o.open ?? 1), k = [lerp(.42, 1, ss(0, 1, e)), lerp(.5, 1, ss(0, 1, e))];
  ctx.save();
  ctx.transform(aff.a, aff.b, aff.c, aff.d, aff.e, aff.f);
  ctx.scale(k[0], k[1]);
  const outline = crumple(which === 'F' ? FW : HW, e, which === 'F' ? 3 : 7);
  ctx.save();
  if (o.worn) { // an old traveller: chips out of the wing margins
    ctx.beginPath(); ctx.rect(-40, -90, 200, 200);
    const nicks = which === 'F' ? [[104, -30, 6], [92, 6, 5], [70, 30, 4]] : [[76, 52, 7], [50, 80, 6], [26, 84, 4]];
    for (const [nx, ny, nr] of nicks) { const r = nr * o.worn; ctx.moveTo(nx + r, ny); ctx.arc(nx, ny, r, 0, TAU); }
    ctx.clip('evenodd');
  }
  ctx.save(); D.shape(ctx, outline); ctx.clip();
  if (which === 'F') forewing(ctx, o, aff.dorsal); else hindwing(ctx, o, aff.dorsal);
  if (o.worn) { ctx.fillStyle = rgba('#f4e6c8', .28 * o.worn); ctx.fillRect(-20, -70, 150, 170); }
  ctx.restore();
  if (e < 1) creases(ctx, outline, e, which === 'F' ? 11 : 17);
  shadeOverlay(ctx, outline, aff, o);
  ctx.strokeStyle = rgba(INK, .9); ctx.lineWidth = 1.6 / Math.sqrt(Math.max(.05, Math.abs(det) / (o.s ?? 1) ** 2)) * .6 + .9; ctx.lineJoin = 'round';
  D.shape(ctx, outline); ctx.stroke();
  ctx.restore();
  ctx.restore();
}

// ---------------------------------------------------------------- body
const BODY = [[-24, 2.6], [-21.5, 5.6], [-17, 6.6], [-13, 5.6], [-10.5, 7.2], [-4, 9], [4, 8.8], [10.5, 7.2], [13.5, 5.4], [20, 6.6], [30, 6.9], [40, 6.4], [49, 5.1], [56, 3.4], [60, 1.6]];
function bodyPts(o) {
  const ab = o.abd ?? 1, out = [];
  for (let i = 0; i < BODY.length - 1; i++) for (let j = 0; j < 3; j++) {
    const u = j / 3, y = lerp(BODY[i][0], BODY[i + 1][0], u), r = lerp(BODY[i][1], BODY[i + 1][1], u);
    const isAb = y > 13.5, yy = isAb ? 13.5 + (y - 13.5) * (1 + (ab - 1) * .45) : y;
    out.push([yy, isAb ? r * (1 + (ab - 1) * (1 - Math.abs((y - 32) / 30))) : r]);
  }
  out.push([BODY[BODY.length - 1][0] * (1 + (ab - 1) * .3), BODY[BODY.length - 1][1]]);
  return out;
}
function body(ctx, F, o) {
  const curl = o.abdCurl ?? 0;
  // abdomen bends toward the belly (egg laying): rotate (y, z) about the waist, more toward the tip
  const bendP = (y, z) => {
    if (curl === 0 || y <= 13.5) return [y, z];
    const u = (y - 13.5) / 46, a = curl * u * 1.6, dy = y - 13.5;
    return [13.5 + dy * Math.cos(a * .6) - 0, z - dy * Math.sin(a * .6)];
  };
  const pts = bodyPts(o).map(([y, r]) => { const [yy, zz] = bendP(y, y > 13 ? 0 : 1.5); const p = F.P(0, yy, zz); return [p[0], p[1], r * F.s]; });
  body.tip = pts[pts.length - 1];
  // legs behind the body
  legs(ctx, F, o, -1);
  ctx.save();
  ctx.beginPath();
  for (const [x, y, r] of pts) { ctx.moveTo(x + r, y); ctx.arc(x, y, r, 0, TAU); }
  ctx.fillStyle = rgba(PAL.body); ctx.fill();
  ctx.clip();
  // soft highlight along the side facing the light
  const hd = F.R(0, 0, 1), lx = -hd[0] * .0 - .45, ly = -.65;
  for (let i = 2; i < pts.length; i += 2) { const [x, y, r] = pts[i]; D.glow(ctx, x + lx * r * .5, y + ly * r * .5, r * 1.1, '#6a5a52', .35); }
  // abdomen segment rings
  ctx.strokeStyle = rgba('#3c302b', .8); ctx.lineWidth = Math.max(.6, F.s * .9);
  for (let y = 22; y < 56; y += 6) { const [yy, zz] = bendP(y, 2); const a = F.P(-6, yy, zz), b = F.P(6, yy, zz); D.line(ctx, a[0], a[1], b[0], b[1]); }
  ctx.restore();
  // white dots on head and thorax, only where that surface faces us
  const DOTS = [[-3.4, -9, 6.5], [3.4, -9, 6.5], [-6.5, -3, 4.5], [6.5, -3, 4.5], [-6.8, 4, 3.5], [6.8, 4, 3.5], [-2.2, -20, 5.6], [2.2, -20, 5.6], [-4.8, 25, -3], [4.8, 25, -3], [-4.5, 33, -3.4], [4.5, 33, -3.4]];
  for (const [x, y, z] of DOTS) {
    const nz = F.R(x * .12, 0, z * .15)[2];
    if (nz <= .05 || (curl && y > 13)) continue;
    const p = F.P(x, y, z);
    D.dot(ctx, p[0], p[1], Math.max(.5, 1.25 * F.s), '#fffaf0', clamp(nz * 3));
  }
  // compound eyes
  for (const sd of [-1, 1]) {
    const p = F.P(sd * 4.6, -19.5, 1.5), nz = F.R(sd, -.4, .3)[2];
    D.dot(ctx, p[0], p[1], 3.2 * F.s, '#2a1d17');
    if (nz > -.3) D.dot(ctx, p[0] - .9 * F.s, p[1] - 1 * F.s, 1 * F.s, '#cfc2b8', .7);
  }
  legs(ctx, F, o, 1);
  proboscis(ctx, F, o);
  antennae(ctx, F, o);
}
function antennae(ctx, F, o) {
  ctx.lineCap = 'round';
  const ct = CLOCK.t, sdd = (o.x ?? 0) * .013 + (o.y ?? 0) * .007;
  for (const sd of [-1, 1]) {
    // idle life: a slow independent sway, and now and then a quick twitch
    const sw = Math.sin(ct * 2.3 + sdd * 7 + sd * 1.3) * 2.4 + Math.max(0, Math.sin(ct * .9 + sdd * 3) - .9) * 30 * Math.sin(ct * 21 + sd);
    const a = F.P(sd * 2.2, -22.5, 3.2), droop = o.droop ?? 0;
    const b = F.P(sd * (14 + 6 * droop + sw * .35), -60 + 20 * droop, 13 - 22 * droop + (o.antZ ?? 0) + sw), m = F.P(sd * 7, -42 + 10 * droop, 10 - 8 * droop + sw * .4);
    ctx.strokeStyle = rgba(INK); ctx.lineWidth = Math.max(.7, 1.5 * F.s);
    ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.quadraticCurveTo(m[0], m[1], b[0], b[1]); ctx.stroke();
    const dx = b[0] - m[0], dy = b[1] - m[1], l = Math.hypot(dx, dy) || 1;
    ctx.fillStyle = rgba(INK); ctx.beginPath(); ctx.ellipse(b[0] - dx / l * 2 * F.s, b[1] - dy / l * 2 * F.s, 3.2 * F.s, 1.7 * F.s, Math.atan2(dy, dx), 0, TAU); ctx.fill();
  }
}
// the two visible leg pairs (the small front pair stays folded); far legs go behind the body (pass -1), near in front
function legs(ctx, F, o, pass) {
  const L = o.legs ?? 0;
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  [[-1, -3], [-1, 4], [1, -3], [1, 4]].forEach(([sd, y], i) => {
    const hip = F.P(sd * 4, y, -5), near = hip[2] >= F.P(0, y, -5)[2];
    if ((pass > 0) !== near) return;
    let knee, foot;
    if (o.feet && o.feet[i]) {
      foot = o.feet[i];
      const mx = (hip[0] + foot[0]) / 2, my = (hip[1] + foot[1]) / 2, dx = foot[0] - hip[0], dy = foot[1] - hip[1], l = Math.hypot(dx, dy) || 1;
      knee = [mx - dy / l * 10 * F.s * sd, my + dx / l * 10 * F.s * sd];
    } else {
      knee = F.P(sd * lerp(8, 16, L), y + lerp(8, -4, L) + (y > 0 ? 6 : 0), lerp(-10, -16, L));
      foot = F.P(sd * lerp(6, 20, L), y + lerp(18, 6, L) + (y > 0 ? 12 : 0), lerp(-14, -30, L));
    }
    ctx.strokeStyle = rgba(INK); ctx.lineWidth = Math.max(.6, 1.5 * F.s);
    ctx.beginPath(); ctx.moveTo(hip[0], hip[1]); ctx.lineTo(knee[0], knee[1]); ctx.lineTo(foot[0], foot[1]); ctx.stroke();
  });
}
function proboscis(ctx, F, o) {
  const p = o.prob ?? 0, base = F.P(0, -24.5, -2.5);
  ctx.strokeStyle = rgba('#2b1d18'); ctx.lineWidth = Math.max(.6, 1.2 * F.s); ctx.lineCap = 'round';
  if (p <= .02 || !o.probTo) { // a neat watch-spring coil under the head
    const c = F.P(0, -26, -5.5);
    ctx.beginPath();
    for (let i = 0; i <= 30; i++) { const a = i / 30 * TAU * 2.2, r = (3.4 - i / 30 * 2.6) * F.s; const x = c[0] + Math.cos(a) * r, y = c[1] + Math.sin(a) * r; if (i) ctx.lineTo(x, y); else ctx.moveTo(base[0], base[1]); }
    ctx.stroke();
    return;
  }
  const tip = [lerp(base[0], o.probTo[0], p), lerp(base[1], o.probTo[1], p)];
  const mid = [lerp(base[0], tip[0], .5) + 6 * F.s * (1 - p), lerp(base[1], tip[1], .5) - 4 * F.s];
  ctx.beginPath(); ctx.moveTo(base[0], base[1]); ctx.quadraticCurveTo(mid[0], mid[1], tip[0], tip[1]);
  if (p < 1) { const r = 3 * F.s * (1 - p); ctx.arc(tip[0] - r, tip[1], r, 0, TAU * .8 * (1 - p)); }
  ctx.stroke();
}

// ---------------------------------------------------------------- whole butterfly
const HINGE_F = [1.5, -4, 2.5], HINGE_H = [1.5, 5, 2];
function butterfly(ctx, o) {
  const F = frame(o), th = o.flap ?? 0, thH = o.flapH ?? th * .92 + .03;
  const op = o.open ?? 1, fold = 1;
  const wings = [];
  for (const side of [1, -1]) {
    const tf = side > 0 ? th : (o.flapL ?? th), thh = side > 0 ? thH : (o.flapHL ?? thH);
    wings.push({ side, which: 'H', aff: wingAffine(F, side, thh, HINGE_H) });
    wings.push({ side, which: 'F', aff: wingAffine(F, side, tf, HINGE_F) });
  }
  // depth of each side from a point in the middle of its forewing
  const zc = (side, tf) => F.P(side * 50 * Math.cos(tf), 6, 50 * Math.sin(tf) + 2)[2];
  const zR = zc(1, th), zL = zc(-1, o.flapL ?? th), zB = F.P(0, 0, 3)[2];
  const near = zR >= zL ? 1 : -1;
  ctx.save();
  if (o.alpha !== undefined) ctx.globalAlpha *= o.alpha;
  const drawSide = (side) => {
    const ws = wings.filter((w) => w.side === side);
    // dorsal side up: forewing overlaps hindwing; seen from below the hindwing is in front
    const order = ws[1].aff.dorsal ? ['H', 'F'] : ['F', 'H'];
    for (const wch of order) { const w = ws.find((q) => q.which === wch); drawWing(ctx, wch, w.aff, o); }
  };
  const flat = Math.abs(zR - zL) < 14 * F.s && Math.min(zR, zL) <= zB + 30 * F.s;
  if (flat) { drawSide(-near); drawSide(near); body(ctx, F, o); }
  else if (Math.max(zR, zL) < zB) { drawSide(-near); drawSide(near); body(ctx, F, o); }
  else { drawSide(-near); body(ctx, F, o); drawSide(near); }
  ctx.restore();
  return F;
}

// flap angle through flap / glide phases; t in seconds
function flapAt(t, o = {}) {
  const f = o.f ?? 4.2, mid = o.mid ?? .5, amp = o.amp ?? .78;
  const env = o.glide ? 1 - o.glide * ss(.15, .45, ((t * (o.gf ?? .6)) % 1)) * (1 - ss(.75, .95, ((t * (o.gf ?? .6)) % 1))) : 1;
  return mid + amp * env * Math.sin(TAU * f * t) - (1 - env) * .3;
}

// ---------------------------------------------------------------- tiny butterflies for swarms and maps
// heading ang (screen, 0 = flying right), th = flap angle, s = size (forewing length px), tilt = how much we see the back
function mini(ctx, x, y, s, ang, th, o = {}) {
  const c = Math.cos(th), k = s / 100, tilt = o.tilt ?? 1;
  ctx.save(); ctx.translate(x, y); ctx.rotate(ang + Math.PI / 2); ctx.scale(k, k);
  const top = c * tilt >= -.05, wc = top ? (o.col ?? '#f28a1d') : '#e7b766', a = o.a ?? 1;
  ctx.lineJoin = 'round';
  for (const sd of [-1, 1]) {
    const sx = sd * Math.max(.08, Math.abs(c));
    ctx.save(); ctx.scale(sx, 1);
    const fw = () => { ctx.beginPath(); ctx.moveTo(2, -8); ctx.quadraticCurveTo(50, -40, 100, -48); ctx.quadraticCurveTo(112, -30, 98, 8); ctx.quadraticCurveTo(60, 26, 8, 12); ctx.closePath(); };
    const hw = () => { ctx.beginPath(); ctx.moveTo(4, 6); ctx.quadraticCurveTo(70, 8, 76, 40); ctx.quadraticCurveTo(70, 78, 30, 84); ctx.quadraticCurveTo(8, 60, 4, 6); ctx.closePath(); };
    for (const f of [hw, fw]) {
      f(); ctx.fillStyle = rgba(INK, a); ctx.fill();
      ctx.save(); f(); ctx.clip(); ctx.translate(f === fw ? -6 : -5, f === fw ? 2 : -4); ctx.scale(.86, .86); f(); ctx.fillStyle = rgba(wc, a); ctx.fill(); ctx.restore();
      if (s > 18) { ctx.strokeStyle = rgba(INK, .8 * a); ctx.lineWidth = 5; ctx.beginPath(); if (f === fw) { ctx.moveTo(10, 0); ctx.lineTo(90, -26); ctx.moveTo(12, 6); ctx.lineTo(80, 4); } else { ctx.moveTo(8, 12); ctx.lineTo(56, 60); ctx.moveTo(8, 12); ctx.lineTo(66, 36); } ctx.stroke(); }
    }
    ctx.restore();
  }
  ctx.fillStyle = rgba(INK, a); ctx.beginPath(); ctx.ellipse(0, 14, 7, 34, 0, 0, TAU); ctx.fill();
  ctx.restore();
}

module.exports = { butterfly, frame, flapAt, mini, FW, HW, FV, HV, INK, wingAffine, CLOCK };
