// The ant rig: side view, facing +x, feet on y = 0 at the origin's ground line.
//   draw(ctx, x, y, s, o)  o: {caste: worker|queen|male, phase (gait cycles), callow 0..1, xray 0..1, wings 0..1,
//     spread 0..1 (folded over the back -> raised for flight), flap (wing beat phase), head (rad), gaster (rad),
//     ant (antenna sweep phase), jaw 0..1, lod 0|1|2, glow, hl (organ highlight map), flip, rot, legsUp (0..1 tuck)}
// Proportions follow a formicine worker: head with elbowed antennae, mesosoma (thorax + propodeum), a one-node
// petiole (the waist), the gaster; three pairs of legs on the mesosoma; tripod gait.
const { TAU, clamp, lerp, rgba, mix, hash, noise } = require('./core');
const G = require('./gfx');

const AMBER = '#ffb547', TEAL = '#5ef2e0';
// two-tone chitin: rust-red head + mesosoma, near-black gaster (wood / carpenter ant colouring)
const BODY = { worker: '#8c3517', queen: '#7c2e12', male: '#2e1a12' };
const GASTER = { worker: '#2a140b', queen: '#24110a', male: '#1e120c' };
const CALLOW = '#ead2aa';

// per-caste geometry (units ~ px at s = 1)
const GEO = {
  worker: {
    head: [96, -40, 29, 24, -.28], eye: [101, -45, 8.5, 7], mesoTop: [[62, -44], [50, -60], [30, -62], [14, -55], [0, -50], [-12, -45], [-18, -31]],
    mesoBot: [[-15, -21], [8, -18], [38, -22], [60, -31]], pet: [-31, -34, 9, 15], gaster: [-88, -32, 52, 37, .2],
    hips: [[48, -24], [24, -21], [2, -23]], feet: [[112, 0], [52, 0], [-62, 0]], leg: [58, 60, 26], ab: [112, -58], scape: 50, fun: 74, stride: 40, lift: 30,
  },
  queen: {
    head: [104, -48, 31, 26, -.25], eye: [110, -54, 9, 7.5], mesoTop: [[66, -52], [54, -74], [30, -84], [8, -80], [-8, -70], [-18, -58], [-24, -38]],
    mesoBot: [[-20, -24], [8, -20], [40, -25], [64, -36]], pet: [-38, -40, 10, 16], gaster: [-112, -40, 76, 50, .16],
    hips: [[52, -28], [26, -24], [0, -26]], feet: [[118, 0], [56, 0], [-72, 0]], leg: [62, 64, 28], ab: [122, -66], scape: 52, fun: 78, stride: 44, lift: 32,
    wing: [14, -84],
  },
  male: {
    head: [88, -50, 19, 17, -.1], eye: [92, -53, 9.5, 9], mesoTop: [[64, -50], [52, -70], [30, -76], [8, -70], [-6, -60], [-14, -48], [-20, -34]],
    mesoBot: [[-16, -24], [8, -20], [38, -24], [62, -38]], pet: [-30, -36, 7, 11], gaster: [-80, -36, 46, 26, .24],
    hips: [[50, -28], [24, -24], [0, -26]], feet: [[112, 0], [52, 0], [-66, 0]], leg: [60, 64, 30], ab: [100, -62], scape: 26, fun: 96, stride: 42, lift: 34,
    wing: [14, -76],
  },
};
const stride = (caste = 'worker') => GEO[caste].stride;

const rot = (x, y, a) => [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)];

// two-bone IK, knee bends to side sgn
function ik(hx, hy, fx, fy, a, b, sgn) {
  let dx = fx - hx, dy = fy - hy, d = Math.hypot(dx, dy);
  const dm = Math.min(d, a + b - .5); if (d > dm) { dx *= dm / d; dy *= dm / d; d = dm; }
  const th = Math.atan2(dy, dx), al = Math.acos(clamp((a * a + d * d - b * b) / (2 * a * d), -1, 1));
  return [hx + Math.cos(th + sgn * al) * a, hy + Math.sin(th + sgn * al) * a, hx + dx, hy + dy];
}

function shell(ctx, pathFn, base, o, lightAng = -2.2) {
  // glossy chitin: base fill, top-left highlight, dark belly, rim light, specular
  const lod = o.lod ?? 2;
  ctx.save(); pathFn(ctx); ctx.fillStyle = rgba(base, 1); ctx.fill();
  if (lod >= 1) {
    ctx.clip();
    const bb = o._bb;
    const g = ctx.createLinearGradient(bb[0], bb[1], bb[0] + Math.cos(lightAng + Math.PI) * bb[2], bb[1] + Math.sin(lightAng + Math.PI) * bb[2]);
    g.addColorStop(0, rgba(mix(base, '#ffc08a', .4), .95)); g.addColorStop(.45, rgba(base, 0)); g.addColorStop(1, rgba('#000', .42));
    ctx.fillStyle = g; ctx.fillRect(-400, -400, 800, 800);
  }
  ctx.restore();
  if (lod >= 1) { ctx.save(); pathFn(ctx); ctx.strokeStyle = rgba(mix(base, AMBER, .6), .55); ctx.lineWidth = 1.6; ctx.stroke(); ctx.restore(); }
}

function wing(ctx, bx, by, len, wid, ang, a, o = {}) {
  // membranous wing with a pterostigma and a few veins
  if (a <= 0) return;
  ctx.save(); ctx.translate(bx, by); ctx.rotate(ang);
  ctx.beginPath(); ctx.moveTo(0, 0);
  ctx.bezierCurveTo(len * .3, -wid * .9, len * .8, -wid * 1.05, len, -wid * .35);
  ctx.bezierCurveTo(len * 1.02, wid * .2, len * .6, wid * .5, len * .25, wid * .35);
  ctx.closePath();
  const g = ctx.createLinearGradient(0, 0, len, 0);
  g.addColorStop(0, `rgba(255,236,200,${.32 * a})`); g.addColorStop(1, `rgba(220,236,255,${.12 * a})`);
  ctx.fillStyle = g; ctx.fill();
  ctx.strokeStyle = `rgba(255,230,190,${.55 * a})`; ctx.lineWidth = 1.2; ctx.stroke();
  // veins
  ctx.strokeStyle = `rgba(120,80,40,${.6 * a})`; ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.moveTo(2, -2); ctx.quadraticCurveTo(len * .35, -wid * .75, len * .62, -wid * .72); ctx.stroke();
  ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(len * .2, -wid * .3); ctx.quadraticCurveTo(len * .45, -wid * .1, len * .7, -wid * .2);
  ctx.moveTo(len * .36, -wid * .55); ctx.lineTo(len * .44, wid * .08); ctx.moveTo(len * .5, -wid * .62); ctx.lineTo(len * .58, -wid * .1); ctx.stroke();
  if (!o.hind) { ctx.fillStyle = `rgba(90,52,24,${.75 * a})`; ctx.beginPath(); ctx.ellipse(len * .63, -wid * .72, len * .045, wid * .1, 0, 0, TAU); ctx.fill(); }
  ctx.restore();
}

function draw(ctx, x, y, s, o = {}) {
  const caste = o.caste ?? 'worker', Gm = GEO[caste], lod = o.lod ?? 2;
  const xr = clamp(o.xray ?? 0), cal = clamp(o.callow ?? 0);
  const pale = clamp(o.pale ?? 0), PALE = '#f6eee0';
  const base = mix(mix(BODY[caste], CALLOW, cal), PALE, pale), gbase = mix(mix(GASTER[caste], mix(CALLOW, '#000', .06), cal), PALE, pale);
  const dark = mix(base, '#000', .3), far = mix(base, '#000', .55);
  const ph = o.phase ?? 0, tuck = clamp(o.legsUp ?? 0);
  ctx.save();
  ctx.translate(x, y); if (o.rot) ctx.rotate(o.rot); ctx.scale(s * (o.flip ? -1 : 1), s);
  const bodyA = 1 - xr * .72;
  const bob = o.phase === undefined ? 0 : Math.sin(ph * TAU * 2) * 1.2, LIFT = (o.lift ?? Gm.lift) * (1 - tuck);
  ctx.translate(0, -LIFT + bob);

  // ---- legs (far side first) : leg i = pair j, side 0 far / 1 near
  const [fa, fb, ft] = Gm.leg, st = Gm.stride;
  const legPos = (j, side) => {
    const grp = (j + side) % 2, u = ((ph + grp * .5) % 1 + 1) % 1, duty = .56;
    let dx, lift;
    if (u < duty) { dx = lerp(st / 2, -st / 2, u / duty); lift = 0; } else { const v = (u - duty) / (1 - duty); dx = lerp(-st / 2, st / 2, v); lift = Math.sin(v * Math.PI) * 16; }
    if (o.phase === undefined) { dx = 0; lift = 0; }
    let [fx, fy] = Gm.feet[j]; fx += dx; fy = fy + LIFT - bob - lift;
    if (side === 0) { fx += 7; fy -= 3; }
    // tucked (pupa / held) legs fold toward the body
    if (tuck > 0) { const [hx, hy] = Gm.hips[j]; fx = lerp(fx, hx + [26, 6, -22][j], tuck); fy = lerp(fy, hy + 14, tuck); }
    return [fx, fy];
  };
  const drawLeg = (j, side) => {
    const [hx0, hy0] = Gm.hips[j], hx = hx0 + (side ? 0 : 6), hy = hy0 - (side ? 0 : 3);
    const [fx, fy] = legPos(j, side), sg = j === 2 ? 1 : -1;
    const cx = hx + (j === 0 ? 6 : j === 1 ? 0 : -6), cy = hy + 10;
    const [kx, ky, ex, ey] = ik(cx, cy, fx - (j === 0 ? ft * .5 : j === 2 ? -ft * .5 : 0) * (1 - tuck), fy, fa, fb, sg);
    const col = side ? dark : far, a = side ? bodyA : bodyA * .9;
    ctx.save(); ctx.globalAlpha *= a; ctx.fillStyle = rgba(col, 1);
    G.limb(ctx, hx, hy, cx, cy, 6.5, 5.5); ctx.fill();                    // coxa
    G.limb(ctx, cx, cy, kx, ky, 5.2, 4); ctx.fill();                      // femur
    G.limb(ctx, kx, ky, ex, ey, 3.8, 2.4); ctx.fill();                    // tibia
    // tarsus: 4 little segments along the ground, pointing away from the body
    const dir = j === 0 ? 1 : j === 2 ? -1 : (side ? .6 : -.6), tl = ft * (1 - tuck * .6);
    ctx.lineWidth = 2.2; ctx.strokeStyle = rgba(col, 1); ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(ex + dir * tl * .5, ey + 2); ctx.lineTo(ex + dir * tl, ey + 1.5 - tuck * 4); ctx.stroke();
    if (lod >= 2) { ctx.fillStyle = rgba(mix(col, AMBER, .2), 1); for (let k = 1; k <= 3; k++) { ctx.beginPath(); ctx.arc(ex + dir * tl * k / 3.2, ey + 1.8, 1.4, 0, TAU); ctx.fill(); } }
    // tibial spur + rim highlight
    if (lod >= 2 && side) { ctx.strokeStyle = rgba(AMBER, .35 * a); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(kx, ky); ctx.lineTo(ex, ey); ctx.stroke(); }
    ctx.restore();
  };
  for (let j = 0; j < 3; j++) drawLeg(j, 0);

  // ---- antennae
  const [hx, hy, hrx, hry, hro0] = Gm.head, hro = hro0 + (o.head ?? 0);
  const headPt = (px, py) => { const [rx, ry] = rot(px - hx, py - hy, o.head ?? 0); return [hx + rx, hy + ry]; };
  const antenna = (side) => {
    const sw = Math.sin((o.ant ?? 0) * TAU + side * 1.7) * .22 + (side ? 0 : .12);
    const [ax, ay] = headPt(Gm.ab[0] - (side ? 0 : 6), Gm.ab[1] + (side ? 0 : 2));
    const fold = clamp(o.antFold ?? 0);
    const sa = lerp((caste === 'male' ? -.9 : -1.95) + sw * .4, 1.25, fold) + (o.head ?? 0);
    const exx = ax + Math.cos(sa) * Gm.scape, eyy = ay + Math.sin(sa) * Gm.scape;
    const n = 11, pts = [[ax, ay], [exx, eyy]];
    let a2 = lerp((caste === 'male' ? -.4 : -.35) + sw, 2.55, fold) + (o.head ?? 0), px = exx, py = eyy;
    for (let k = 0; k < n; k++) { a2 += (.07 + .02 * Math.sin((o.ant ?? 0) * TAU * 1.3 + k * .5 + side)) * (1 - fold * .8); px += Math.cos(a2) * Gm.fun / n; py += Math.sin(a2) * Gm.fun / n; pts.push([px, py]); }
    const col = side ? dark : far;
    ctx.save(); ctx.globalAlpha *= bodyA; ctx.strokeStyle = rgba(col, 1); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(exx, eyy); ctx.stroke();
    ctx.lineWidth = 2.8; ctx.beginPath(); ctx.moveTo(exx, eyy); for (let k = 2; k < pts.length; k++) ctx.lineTo(pts[k][0], pts[k][1]); ctx.stroke();
    if (lod >= 2) { ctx.fillStyle = rgba(col, 1); for (let k = 2; k < pts.length; k++) { ctx.beginPath(); ctx.arc(pts[k][0], pts[k][1], k > pts.length - 4 ? 2.6 : 1.8, 0, TAU); ctx.fill(); } }
    ctx.restore();
    return pts;
  };
  const antFar = antenna(0);

  // ---- wings folded (behind body when folded, above when spread)
  const wingA = clamp(o.wings ?? 0), spread = clamp(o.spread ?? 0);
  const wings = (layer) => {
    if (!Gm.wing || wingA <= 0) return;
    const [wx, wy] = Gm.wing, L = caste === 'queen' ? 230 : 200;
    if (spread > .02) {
      // flight: wings beat through an arc -> drawn as a few ghosted copies (motion blur)
      const beat = o.flap ?? 0, n = lod >= 2 ? 5 : 3;
      for (let k = 0; k < n; k++) {
        const ang = lerp(-2.95, -2.05, .5 + .5 * Math.sin((beat + k * .035) * TAU)), aa = wingA * (k === 0 ? .9 : .32);
        const angF = lerp(Math.PI - .12, ang, spread);
        if (layer === 0) wing(ctx, wx - 4, wy + 2, L * .72, L * .14, angF + .18, aa * .8, { hind: true });
        else wing(ctx, wx, wy, L, L * .17, angF, aa);
      }
    } else {
      if (layer === 0) wing(ctx, wx - 6, wy + 4, L * .74, L * .13, Math.PI - .05, wingA * .7, { hind: true });
      else wing(ctx, wx, wy, L, L * .16, Math.PI - .1, wingA);
    }
  };
  if (spread <= .02) wings(0);

  // ---- body: gaster, petiole, mesosoma, head
  const [gx, gy, grx, gry, gr0] = Gm.gaster, grt = gr0 + (o.gaster ?? 0);
  const gasterPath = (c) => { c.beginPath(); c.save(); c.translate(gx + 30, gy + 4); c.rotate(o.gaster ?? 0); c.translate(-30, -4); c.ellipse(0, 0, grx, gry, gr0, 0, TAU); c.restore(); };
  const [px, py, prx, pry] = Gm.pet;
  const petPath = (c) => { c.beginPath(); c.moveTo(px + 11, py + 10); c.quadraticCurveTo(px + 6, py - pry * 1.3, px - 1, py - pry * 1.05); c.quadraticCurveTo(px - prx * 1.1, py - pry * .4, px - prx, py + 10); c.closePath(); };
  const mesoPath = (c) => { c.beginPath(); G.curve(c, [...Gm.mesoTop, ...Gm.mesoBot], true, 1 / 6); };
  const headPath = (c) => { c.beginPath(); const [cx2, cy2] = headPt(hx, hy); c.ellipse(cx2, cy2, hrx, hry, hro, 0, TAU); };

  ctx.save(); ctx.globalAlpha *= bodyA;
  o._bb = [gx, gy - gry, grx * 2]; shell(ctx, gasterPath, gbase, o);
  if (lod >= 2) { // glossy specular on the gaster
    ctx.save(); gasterPath(ctx); ctx.clip();
    G.ellipseGlow(ctx, gx + grx * .15, gy - gry * .55, grx * .55, gry * .22, '#ffe6c8', .32);
    ctx.restore();
  }
  // gaster tergite bands + hairs
  if (lod >= 1) {
    ctx.save(); gasterPath(ctx); ctx.clip();
    ctx.strokeStyle = rgba(mix(base, '#000', .5), .7); ctx.lineWidth = 2;
    for (let k = 1; k <= 3; k++) { const bx = gx + grx * .75 - k * grx * .42; ctx.beginPath(); ctx.ellipse(bx + grx * .2, gy, grx * .28, gry * 1.1, gr0, -1.9, 1.9); ctx.stroke(); }
    ctx.restore();
    if (lod >= 2) {
      ctx.strokeStyle = rgba(mix(base, '#ffe0b0', .45), .5); ctx.lineWidth = .9;
      for (let k = 0; k < 26; k++) { const an = -2.7 + k * .13, r1 = 1.0, ex = gx + Math.cos(an) * grx * r1, ey = gy + Math.sin(an) * gry * r1; ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(ex + Math.cos(an - .5) * 7, ey + Math.sin(an - .5) * 7); ctx.stroke(); }
    }
  }
  o._bb = [px, py - pry, 30]; shell(ctx, petPath, base, o);
  o._bb = [30, -62, 90]; shell(ctx, mesoPath, base, o);
  if (lod >= 2) { // sutures on the mesosoma
    ctx.strokeStyle = rgba(mix(base, '#000', .55), .8); ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(Gm.mesoTop[2][0] + 4, Gm.mesoTop[2][1] + 2); ctx.quadraticCurveTo(Gm.mesoTop[2][0] + 10, Gm.mesoTop[2][1] + 22, Gm.mesoTop[2][0] + 2, Gm.mesoBot[2][1] - 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(Gm.mesoTop[4][0], Gm.mesoTop[4][1] + 2); ctx.quadraticCurveTo(Gm.mesoTop[4][0] + 6, Gm.mesoTop[4][1] + 18, Gm.mesoTop[4][0] - 2, Gm.mesoBot[1][1] - 2); ctx.stroke();
    ctx.fillStyle = rgba('#000', .5); ctx.beginPath(); ctx.arc(Gm.mesoTop[5][0] + 4, Gm.mesoTop[5][1] + 10, 2.2, 0, TAU); ctx.fill(); // spiracle
  }
  o._bb = [hx, hy - hry, hrx * 2]; shell(ctx, headPath, base, o);
  // mandibles
  const jaw = clamp(o.jaw ?? .15);
  const mand = (open, near) => {
    const [mx, my] = headPt(hx + hrx * .9, hy + hry * .45);
    ctx.save(); ctx.translate(mx, my); ctx.rotate(hro + .35 - open * .55 * (near ? 1 : -.4));
    ctx.beginPath(); ctx.moveTo(-4, -5); ctx.quadraticCurveTo(14, -9, 24, -1); ctx.lineTo(20, 2); ctx.lineTo(16, -1); ctx.lineTo(13, 3); ctx.lineTo(9, 0); ctx.lineTo(6, 4); ctx.quadraticCurveTo(0, 5, -4, 4); ctx.closePath();
    ctx.fillStyle = rgba(near ? mix(base, '#5a2a10', .4) : far, 1); ctx.fill();
    if (lod >= 2) { ctx.strokeStyle = rgba(AMBER, .4); ctx.lineWidth = 1; ctx.stroke(); }
    ctx.restore();
  };
  mand(jaw, false); mand(jaw, true);
  // compound eye
  const [ex0, ey0, erx, ery] = Gm.eye, [ex, ey] = headPt(ex0, ey0);
  ctx.fillStyle = rgba(mix(mix('#120a06', CALLOW, cal * .25), PALE, pale * (1 - clamp(o.eyeK ?? 0))), 1); ctx.beginPath(); ctx.ellipse(ex, ey, erx, ery, hro, 0, TAU); ctx.fill();
  if (lod >= 2) {
    ctx.save(); ctx.beginPath(); ctx.ellipse(ex, ey, erx, ery, hro, 0, TAU); ctx.clip();
    ctx.strokeStyle = 'rgba(255,210,150,.16)'; ctx.lineWidth = .7;
    for (let i = -3; i <= 3; i++) for (let j = -3; j <= 3; j++) { const cx = ex + i * 3 + (j % 2) * 1.5, cy = ey + j * 2.6; ctx.beginPath(); ctx.arc(cx, cy, 1.4, 0, TAU); ctx.stroke(); }
    ctx.restore();
    ctx.fillStyle = 'rgba(255,240,220,.8)'; ctx.beginPath(); ctx.ellipse(ex - erx * .35, ey - ery * .4, erx * .28, ery * .2, -.5, 0, TAU); ctx.fill();
  }
  ctx.restore();

  // ---- x-ray overlay: outlines + organs
  if (xr > 0) organs(ctx, caste, Gm, xr, o, { gasterPath, petPath, mesoPath, headPath, headPt });

  if (spread > .02) wings(0);
  wings(1);
  // near legs + near antenna on top
  for (let j = 0; j < 3; j++) drawLeg(j, 1);
  const antNear = antenna(1);
  ctx.restore();
  return { antTip: antNear[antNear.length - 1] };
}

// internal anatomy in the x-ray lens: digestive tract (crop = social stomach), brain, nerve cord, glands;
// queens show ovaries + spermatheca. hl = {crop:1, brain:1, ...} brightens one organ.
function organs(ctx, caste, Gm, k, o, P) {
  const hl = o.hl ?? {};
  const T = (a) => rgba(TEAL, a * k), A = (a) => rgba(AMBER, a * k);
  ctx.save();
  // outlines of the body parts
  ctx.lineWidth = 2; ctx.strokeStyle = T(.9);
  for (const p of [P.gasterPath, P.petPath, P.mesoPath, P.headPath]) { p(ctx); ctx.stroke(); }
  const [gx, gy, grx, gry] = Gm.gaster, [hx, hy] = Gm.head;
  const glow = (x, y, r, c, a) => G.glow(ctx, x, y, r, c, a * k);
  // brain + nerve cord
  const [bx, by] = P.headPt(hx - 4, hy - 6);
  ctx.fillStyle = rgba(TEAL, (.25 + .5 * (hl.brain ?? 0)) * k); ctx.strokeStyle = T(.95);
  ctx.beginPath(); ctx.ellipse(bx, by, 13, 10, 0, 0, TAU); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.ellipse(bx + 6, by - 4, 6, 5, 0, 0, TAU); ctx.stroke();
  ctx.setLineDash([3, 4]); ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(bx - 4, by + 8);
  ctx.bezierCurveTo(50, -26, 10, -24, Gm.pet[0], Gm.pet[1] + 6); ctx.lineTo(gx + grx * .4, gy + gry * .4); ctx.stroke(); ctx.setLineDash([]);
  // gut: mouth -> oesophagus -> crop -> proventriculus -> midgut -> hindgut -> anus
  const [mx, my] = P.headPt(hx + 26, hy + 8);
  const cx = gx + grx * .42, cy = gy - gry * .05, cr = grx * .36, crY = gry * .5;
  ctx.lineWidth = 3; ctx.strokeStyle = A(.95); ctx.beginPath(); ctx.moveTo(mx, my);
  ctx.bezierCurveTo(hx - 10, hy + 4, 40, -40, 10, -36); ctx.lineTo(Gm.pet[0], Gm.pet[1] - 2); ctx.lineTo(cx + cr, cy); ctx.stroke();
  // crop (social stomach): filled with shared liquid food
  const cropL = clamp(o.cropFill ?? .7);
  ctx.save(); ctx.beginPath(); ctx.ellipse(cx, cy, cr, crY, 0, 0, TAU); ctx.clip();
  ctx.fillStyle = rgba(AMBER, (.35 + .4 * (hl.crop ?? 0)) * k); ctx.fillRect(cx - cr, cy + crY - crY * 2 * cropL, cr * 2, crY * 2);
  ctx.restore();
  ctx.strokeStyle = A(1); ctx.lineWidth = 2.2; ctx.beginPath(); ctx.ellipse(cx, cy, cr, crY, 0, 0, TAU); ctx.stroke();
  if (hl.crop) glow(cx, cy, cr * 1.8, AMBER, .35 * hl.crop);
  // proventriculus valve, midgut, hindgut
  const pvx = cx - cr - 5, mgx = gx - grx * .2;
  ctx.fillStyle = A(.9); ctx.beginPath(); ctx.arc(pvx, cy, 4.5, 0, TAU); ctx.fill();
  ctx.fillStyle = rgba('#ff8a5c', (.3 + .4 * (hl.gut ?? 0)) * k); ctx.strokeStyle = rgba('#ff9a6c', .9 * k); ctx.lineWidth = 1.8;
  ctx.beginPath(); ctx.ellipse(mgx, cy + 3, grx * .2, gry * .3, .1, 0, TAU); ctx.fill(); ctx.stroke();
  ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(mgx - grx * .2, cy + 4); ctx.bezierCurveTo(gx - grx * .55, cy + 12, gx - grx * .7, gy + gry * .1, gx - grx * .97, gy + gry * .18); ctx.stroke();
  // poison gland + sting (workers / queens)
  if (caste !== 'male') {
    const vx = gx - grx * .62, vy = gy + gry * .42;
    ctx.fillStyle = rgba('#b7ff6a', (.25 + .45 * (hl.venom ?? 0)) * k); ctx.strokeStyle = rgba('#c9ff8a', .9 * k); ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.ellipse(vx, vy, grx * .14, gry * .17, .3, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(vx - grx * .12, vy); ctx.lineTo(gx - grx * 1.04, gy + gry * .3); ctx.stroke();
  }
  // queen: ovaries (strings of eggs) and the spermatheca (sperm stored for life)
  if (caste === 'queen') {
    for (let s2 = 0; s2 < 2; s2++) for (let e = 0; e < 6; e++) {
      const u = e / 5, ox = lerp(gx + grx * .25, gx - grx * .45, u), oy = gy + gry * (.05 + s2 * .26) + Math.sin(u * 3) * 4;
      ctx.fillStyle = rgba('#fff4e0', (.4 + .4 * (hl.ovary ?? 0)) * k); ctx.beginPath(); ctx.ellipse(ox, oy, 4 + u * 4, 3 + u * 2.5, 0, 0, TAU); ctx.fill();
    }
    const sx = gx - grx * .58, sy = gy + gry * .02, sp = hl.sperm ?? 0;
    glow(sx, sy, 30 + 20 * sp, TEAL, .4 + .5 * sp);
    ctx.fillStyle = rgba(TEAL, (.5 + .4 * sp) * k); ctx.beginPath(); ctx.arc(sx, sy, 9, 0, TAU); ctx.fill();
    ctx.strokeStyle = rgba('#e8fffb', .9 * k); ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(sx, sy, 9, 0, TAU); ctx.stroke();
  }
  ctx.restore();
}

// organ anchor points (in ant units) for callouts: returns [x, y] before the draw transform
function anchor(caste, part) {
  const Gm = GEO[caste], [gx, gy, grx, gry] = Gm.gaster, [hx, hy, hrx, hry] = Gm.head;
  const cx = gx + grx * .42, cy = gy - gry * .05;
  const p = {
    head: [hx, hy - hry * .6], eye: [Gm.eye[0], Gm.eye[1]], antenna: [Gm.ab[0] - 30, Gm.ab[1] - Gm.scape * .85], jaw: [hx + hrx * 1.3, hy + hry * .5],
    meso: [30, -58], pet: [Gm.pet[0], Gm.pet[1] - Gm.pet[3]], gaster: [gx - grx * .2, gy - gry * .9], legs: [Gm.feet[1][0], -14],
    brain: [hx - 4, hy - 6], crop: [cx, cy], gut: [gx - grx * .2, cy + 3], venom: [gx - grx * .62, gy + gry * .42], sting: [gx - grx * 1.02, gy + gry * .3],
    sperm: [gx - grx * .58, gy + gry * .02], ovary: [gx, gy + gry * .15], wing: Gm.wing ? [Gm.wing[0] - 120, Gm.wing[1] - 20] : [0, -70],
  }[part];
  return [p[0], p[1] - Gm.lift];
}
// ant-space point -> screen, matching draw(ctx, x, y, s, {flip})
const toScreen = (x, y, s, pt, flip = false) => [x + pt[0] * s * (flip ? -1 : 1), y + pt[1] * s];

module.exports = { draw, wing, anchor, toScreen, stride, GEO, AMBER, TEAL, BODY, GASTER, CALLOW };
