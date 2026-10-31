// The tortoise and the hare, drawn from paper pieces and posed from parameters.

const curve = (...a) => poly(bez(...a));

// ---------- tortoise ----------
// o: ph (stride cycle), mv (0 idle .. 1 walking), ext (neck stretch 0..1), up (head lift px), mood, look, blink, flip
function tortoise(x, gy, sc, o = {}) {
  const ph = o.ph || 0, mv = o.mv ?? 0, ext = o.ext || 0, up = o.up || 0, mood = o.mood || 'calm';
  const bob = mv * Math.sin(ph * TAU * 2) * 2.4 + (o.breath || 0);
  push(x, gy, o.flip ? -sc : sc, 0, sc);
  // soft ground shadow
  ctx.fillStyle = 'rgba(70,50,30,.10)'; ctx.beginPath(); ctx.ellipse(0, 3, 150, 9, 0, 0, TAU); ctx.fill();

  const legAt = (hx, off, col, colD) => {
    const u = ((ph + off) % 1 + 1) % 1;
    let fx = hx, lift = 0;
    if (mv > .01) {
      if (u < .62) fx = hx + 24 * mv - 48 * mv * (u / .62);
      else { const v = (u - .62) / .38; fx = hx - 24 * mv + 48 * mv * ease(v); lift = Math.sin(v * Math.PI) * 15 * mv; }
    }
    cut(limb([hx, -74 + bob, (hx + fx) / 2, -46 - lift * .5, fx, -24 - lift], [46, 40, 34]), col, { pat: 'dots', w: 1.6, amp: .5, shadow: .5 });
    cut(ell(fx + 8, -11 - lift, 26, 11), colD, { pat: 'scales', w: 1.6, amp: .4, shadow: .4 });
    for (let k = 0; k < 2; k++) line(seg(fx + 20 + k * 7, -17 - lift, fx + 24 + k * 7, -7 - lift), 1.2, C.line, { amp: .2 });
  };
  legAt(46, .5, C.skinD, '#6f7a3e');
  legAt(-72, 0, C.skinD, '#6f7a3e');
  // tail
  cut(poly([-128, -64 + bob, -172, -40 + bob, -132, -48 + bob], true), C.skinD, { w: 1.6, amp: .4 });
  legAt(-34, .5, C.skin, C.skinD);
  legAt(86, 0, C.skin, C.skinD);

  // neck + head
  const hx = 172 + ext * 34, hy = -84 - up + bob, tilt = -up * .006;
  cut(limb([104, -70 + bob, (104 + hx) / 2, (-70 + hy) / 2 + 8, hx - 12, hy + 6], [56, 44, 40]), C.skin, { pat: 'dots', w: 1.6, amp: .4, shadow: .5 });
  cut(ell(hx, hy, 42, 31, tilt), C.skin, { pat: 'dots', w: 1.8, amp: .4, shadow: .6 });
  const ex = hx + 15, ey = hy - 7;
  if (mood === 'joy' || o.blink) {
    line(curve(ex - 9, ey + 1, ex - 4, ey - 7, ex + 4, ey - 7, ex + 9, ey + 1), 2.2, C.black, { amp: .2 });
  } else {
    cut(circ(ex, ey, 9.5), C.white, { line: C.line, w: 1.8, shadow: false, amp: .2 });
    const lx = (o.look || 0) * 3, ly = mood === 'tired' ? 2 : 0;
    dot(ex + 2 + lx, ey + ly, 5.2, C.black); dot(ex + 4 + lx, ey - 2 + ly, 1.7, C.white);
    if (mood === 'tired') cut(dome(ex, ey + 1, 10.5, 9), C.skin, { line: C.line, w: 1.6, shadow: false, amp: .2 });
    else line(curve(ex - 8, ey - 13, ex - 2, ey - 16, ex + 6, ey - 15, ex + 11, ey - 11), 1.6, C.line, { amp: .2 });
  }
  dot(hx + 36, hy - 2, 2.2, C.line);
  if (mood === 'joy') line(curve(hx + 8, hy + 8, hx + 18, hy + 20, hx + 32, hy + 19, hx + 40, hy + 6), 2.2, C.line, { amp: .2 });
  else if (mood === 'tired') line(curve(hx + 12, hy + 15, hx + 22, hy + 13, hx + 30, hy + 14, hx + 38, hy + 12), 2, C.line, { amp: .2 });
  else line(curve(hx + 10, hy + 12, hx + 20, hy + 19, hx + 31, hy + 18, hx + 38, hy + 9), 2, C.line, { amp: .2 });
  if (mood === 'tired') {
    const dr = ((o.t || 0) * .9) % 1;
    cut(leafShape(hx - 6, hy - 40 + dr * 16, 14, 8, Math.PI / 2), C.ice, { line: '#8aa9b8', w: 1.2, shadow: false, alpha: 1 - dr * .8, amp: .1 });
  }

  // shell
  const by = -58 + bob;
  push(0, bob, 1);
  cut(dome(0, -58, 136, 112), C.rim, { line: C.line, w: 2, shadow: .9, amp: .5 });
  const inner = dome(0, -58, 122, 98);
  clipTo(inner);
  const top = [[-140, -116, -140, -180, -36, -180, -26, -116, C.olive, 'ldots'], [-26, -116, -36, -180, 36, -180, 26, -116, C.umber, 'stripe'], [26, -116, 36, -180, 140, -180, 140, -116, C.olive, 'tri']];
  for (const q of top) cut(poly(q.slice(0, 8), true), q[8], { pat: q[9], line: C.rim, w: 2.4, shadow: false, amp: .3 });
  const cols = [C.mustard, C.tan, C.ochre, C.sand, C.khaki, C.mustard], pats = ['grid', 'dots', 'net', null, 'check', 'ldots'];
  for (let r = 0; r < 2; r++) {
    const y0 = r ? -88 : -116, y1 = r ? -58 : -88;
    for (let k = 0; k < 6; k++) {
      const cx0 = -132 + k * 44 + (r ? 22 : 0);
      cut(poly([cx0, y0, cx0 + 44, y0, cx0 + 44, y1, cx0, y1], true), cols[(k + r * 2) % 6], { pat: pats[(k + r * 3) % 6], line: C.rim, w: 2, shadow: false, amp: .3 });
    }
  }
  unclip();
  line(inner, 3, C.rim, { amp: .4 });
  cut(rrect(-138, -64, 276, 15, 7), C.sand, { line: C.line, w: 1.6, amp: .4, shadow: .5 });
  pop();
  pop();
}

// ---------- hare ----------
const HARE = {
  stand: { hx: -40, hy: -96, ang: -1.12, bl: 104, hdx: 26, hdy: -44, tilt: .04, ear: 0, p1x: 40, p1y: -140, p2x: 24, p2y: -132, f1x: 56, f1y: 0, f2x: 30, f2y: 0, eye: 0, mouth: 0 },
  crouch: { hx: -62, hy: -86, ang: .2, bl: 104, hdx: 42, hdy: -6, tilt: .25, ear: .55, p1x: 118, p1y: -4, p2x: 98, p2y: -3, f1x: -10, f1y: 0, f2x: -34, f2y: 0, eye: 0, mouth: 0 },
  lie: { hx: -78, hy: -44, ang: -.02, bl: 104, hdx: 56, hdy: 14, tilt: .5, ear: 1, p1x: 118, p1y: -8, p2x: 98, p2y: -6, f1x: -22, f1y: 0, f2x: -42, f2y: 0, eye: 1, mouth: 0 },
  pant: { hx: -40, hy: -92, ang: -.85, bl: 104, hdx: 44, hdy: -30, tilt: .5, ear: .9, p1x: 12, p1y: -62, p2x: -4, p2y: -58, f1x: 56, f1y: 0, f2x: 30, f2y: 0, eye: .55, mouth: .6 }
};
function mixPose(a, b, u) {
  const o = {};
  for (const k in a) o[k] = lerp(a[k], b[k], u);
  return o;
}
// gallop: ph 0..1 per stride, amp scales the bound
function hareRun(ph, amp = 1) {
  const c = ph * TAU, e = (1 + Math.cos(c)) / 2, fly = Math.max(0, Math.sin(c));
  const hy = lerp(-76, -104, e) - fly * 26 * amp, hx = -70;
  const ang = lerp(-.34, .1, e), bl = 104;
  const shx = hx + Math.cos(ang) * bl, shy = hy + Math.sin(ang) * bl;
  return {
    hx, hy, ang, bl, hdx: 42, hdy: -22 + e * 4, tilt: lerp(.02, -.1, e), ear: lerp(.55, .8, e),
    p1x: shx + lerp(22, 96, e), p1y: Math.min(-3, shy + lerp(70, 56, e) - fly * 20), p2x: shx + lerp(8, 78, e), p2y: Math.min(-3, shy + lerp(72, 46, e) - fly * 10),
    f1x: hx + lerp(24, -84, e), f1y: Math.min(0, lerp(0, -52 - fly * 10, e)), f2x: hx + lerp(4, -104, e), f2y: Math.min(0, lerp(0, -60 - fly * 6, e)),
    eye: 0, mouth: .25
  };
}

// P: pose, o: flip, sq (belly squash for breathing), blink
function hare(x, gy, sc, P, o = {}) {
  push(x, gy, o.flip ? -sc : sc, 0, sc);
  ctx.fillStyle = 'rgba(70,50,30,.10)'; ctx.beginPath(); ctx.ellipse(10, 3, 130 * (1 - Math.min(.35, -P.hy / 400)), 8, 0, 0, TAU); ctx.fill();
  const cs = Math.cos(P.ang), sn = Math.sin(P.ang);
  const hip = [P.hx, P.hy], sh = [P.hx + cs * P.bl, P.hy + sn * P.bl];
  const hc = [sh[0] + P.hdx, sh[1] + P.hdy];
  const F = C.fur, FD = C.furD, FL = C.furL;
  const limbPts = (a, b, l1, l2, bend) => { const k = ik(a[0], a[1], b[0], b[1], l1, l2, bend); return [a[0], a[1], k[0], k[1], b[0], b[1]]; };

  // ears (far first, behind the head)
  const earAt = (rx, ry, ang, col, inner) => {
    cut(leafShape(rx, ry, 122, 38, ang), col, { pat: 'speck', w: 1.8, amp: .5, shadow: .6 });
    cut(leafShape(rx + Math.cos(ang) * 12, ry + Math.sin(ang) * 12, 92, 17, ang), inner, { line: null, shadow: false, amp: .3 });
  };
  const eAng = k => lerp(-1.6, 2.75, k) + P.tilt;
  earAt(hc[0] - 26, hc[1] - 22, eAng(P.ear) - .3, FD, '#c98f88');
  // far limbs
  cut(limb(limbPts([sh[0] + 4, sh[1] + 30], [P.p2x, P.p2y], 48, 54, -1), [26, 22, 20]), FD, { pat: 'speck', w: 1.6, amp: .4, shadow: .5 });
  const ank2 = [P.f2x - 44, P.f2y - 10];
  cut(limb(limbPts([hip[0], hip[1] + 8], ank2, 66, 70, 1), [44, 26, 18]), FD, { pat: 'speck', w: 1.6, amp: .4, shadow: .5 });
  cut(limb([ank2[0], ank2[1], P.f2x, P.f2y - 7], [18, 15]), FD, { w: 1.6, amp: .3, shadow: .4 });
  // tail + torso
  const tx = hip[0] - cs * 44, ty = hip[1] - sn * 44 - 10;
  cut(circ(tx, ty, 21), C.white, { pat: 'ldots', w: 1.6, amp: .4, shadow: .6 });
  const mid = [(hip[0] + sh[0]) / 2, (hip[1] + sh[1]) / 2 + (o.sq || 0)];
  cut(ell(mid[0], mid[1], P.bl / 2 + 34, 46, P.ang), F, { pat: 'speck', w: 1.9, amp: .5, shadow: .8 });
  const nx = -sn, ny = cs;
  cut(ell(mid[0] + nx * 22, mid[1] + ny * 22, P.bl / 2 + 8, 16, P.ang), FL, { line: null, shadow: false, amp: .3, alpha: .95 });
  // near haunch and leg
  cut(ell(hip[0] - 4, hip[1] + 8, 54, 54, P.ang + .3), F, { pat: 'speck', w: 1.8, amp: .5, shadow: .7 });
  const ank1 = [P.f1x - 44, P.f1y - 10];
  cut(limb(limbPts([hip[0] + 6, hip[1] + 14], ank1, 66, 70, 1), [36, 24, 18]), F, { pat: 'speck', w: 1.6, amp: .4, shadow: .6 });
  cut(limb([ank1[0], ank1[1], P.f1x, P.f1y - 8], [20, 17]), F, { w: 1.6, amp: .3, shadow: .5 });
  cut(ell(P.f1x + 4, P.f1y - 8, 20, 9), FL, { w: 1.5, amp: .3, shadow: .4 });

  // head
  cut(ell(hc[0], hc[1], 44, 35, P.tilt), F, { pat: 'speck', w: 1.9, amp: .4, shadow: .8 });
  const hx2 = hc[0], hy2 = hc[1], tc = Math.cos(P.tilt), ts = Math.sin(P.tilt);
  const hp = (dx, dy) => [hx2 + dx * tc - dy * ts, hy2 + dx * ts + dy * tc];
  const mz = hp(36, 11);
  cut(ell(mz[0], mz[1], 26, 20, P.tilt), FL, { w: 1.6, amp: .3, shadow: .3 });
  const ns = hp(56, 4); cut(ell(ns[0], ns[1], 8, 6, P.tilt), C.nose, { w: 1.3, amp: .2, shadow: false });
  const ch = hp(20, 19); cut(ell(ch[0], ch[1], 11, 7), C.earIn, { line: null, shadow: false, amp: .2, alpha: .55 });
  for (const wy of [-3, 4]) { const w0 = hp(42, 10 + wy * .6), w1 = hp(84, 6 + wy * 3); line(seg(w0[0], w0[1], w1[0], w1[1]), 1.1, C.line, { amp: .2, alpha: .7 }); }
  // mouth
  const m0 = hp(48, 20), m1 = hp(28, 22);
  if (P.mouth > .35) {
    const mo = hp(38, 24 + P.mouth * 3); cut(ell(mo[0], mo[1], 14, 5 + P.mouth * 8, P.tilt), '#5a2a2a', { line: C.line, w: 1.4, shadow: false, amp: .2 });
    const tg = hp(36, 28 + P.mouth * 6); cut(ell(tg[0], tg[1], 8, 4, P.tilt), C.nose, { line: null, shadow: false, amp: .1 });
  } else line(curve(m0[0], m0[1], m0[0] - 6, m0[1] + 5, m1[0] + 6, m1[1] + 4, m1[0], m1[1]), 1.8, C.line, { amp: .2 });
  // eye
  const e = hp(17, -8);
  if (P.eye > .85 || o.blink) line(curve(e[0] - 10, e[1], e[0] - 4, e[1] + 6, e[0] + 5, e[1] + 6, e[0] + 10, e[1]), 2.2, C.black, { amp: .2 });
  else {
    const wide = P.eye < 0;
    cut(circ(e[0], e[1], wide ? 12 : 9.5), C.white, { line: C.line, w: 1.8, shadow: false, amp: .2 });
    dot(e[0] + 2.5, e[1] + 1, wide ? 4 : 5.2, C.black); dot(e[0] + 4, e[1] - 1.5, 1.6, C.white);
    if (P.eye > .1) cut(dome(e[0], e[1] + 1, 11, 11 * (1 - P.eye) + 2), F, { line: C.line, w: 1.6, shadow: false, amp: .2 });
    else line(curve(e[0] - 9, e[1] - 12, e[0] - 2, e[1] - 16, e[0] + 8, e[1] - 15, e[0] + 12, e[1] - 10), 1.7, C.line, { amp: .2 });
  }
  earAt(hc[0] - 8, hc[1] - 26, eAng(P.ear), F, C.earIn);
  // near arm
  cut(limb(limbPts([sh[0] + 10, sh[1] + 28], [P.p1x, P.p1y], 48, 54, -1), [28, 23, 21]), F, { pat: 'speck', w: 1.6, amp: .4, shadow: .7 });
  cut(ell(P.p1x + 3, P.p1y, 15, 10), FL, { w: 1.5, amp: .3, shadow: .4 });
  pop();
}
