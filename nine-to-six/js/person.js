// The man, and the crowd around him: paper people posed from parameters.
const HERO = { skin: '#e2b189', skinD: '#c78f68', hair: '#2b2422', shirt: '#9cc3dc', shirtD: '#80aac8', pants: '#33405f', pantsD: '#283350', shoe: '#5b3a26', shoeD: '#472c1c', tie: '#c8463b', bag: '#c89c40' };
const PJ = Object.assign({}, HERO, { shirt: '#c9c6d6', shirtD: '#aeabc0', pants: '#7d8bb0', pantsD: '#6a769b' });
const curve = (...a) => poly(bez(...a));

// piecewise-linear keyframes [[t, v], ...]
function lin(keys, t) {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) if (t <= keys[i][0]) return lerp(keys[i - 1][1], keys[i][1], inv(keys[i - 1][0], keys[i][0], t));
  return keys[keys.length - 1][1];
}
// one mouthful: the hand lifts (0..1), pauses at the mouth, comes down while chewing
function bite(t, rate, off = 0) {
  const u = ((t * rate + off) % 1 + 1) % 1;
  return { lift: u < .28 ? ease(u / .28) : u < .42 ? 1 : u < .66 ? 1 - ease((u - .42) / .24) : 0, chew: u > .4 && u < .92 };
}
function mixP(a, b, u) {
  const o = {};
  for (const k in a) {
    const x = a[k], y = b[k] === undefined ? a[k] : b[k];
    if (Array.isArray(x)) o[k] = x.map((v, i) => lerp(v, y[i], u));
    else if (typeof x === 'number') o[k] = lerp(x, y, u);
    else o[k] = u > .5 ? y : x;
  }
  return o;
}

const STAND = { r1: 0, r2: 0, hy: -162, hx: 0, lean: .03, tl: 112, tilt: 0, hdx: 0, hdy: 0, f1: [-8, 0], f2: [24, 0], a1: [10, -124], a2: [-6, -120], eye: .4, mouth: 'flat', look: 0 };
const SIT = { r1: 0, r2: 0, hy: -96, hx: -6, lean: .02, tl: 112, tilt: 0, hdx: 0, hdy: 0, f1: [68, 0], f2: [88, 0], a1: [40, -84], a2: [56, -88], eye: .4, mouth: 'flat', look: 0 };

// One full stride (two steps) covers STRIDE px; callers pass ph = distance / (STRIDE * amp) so planted feet never slide.
const STRIDE = 200;
function walkPose(ph, o = {}) {
  const P = mixP(STAND, {}, 0), amp = o.amp ?? 1, lean = (o.lean ?? .07) * .75, A = 60 * amp;
  const foot = off => {
    const u = ((ph + off) % 1 + 1) % 1;
    if (u < .6) {
      const heel = Math.max(0, (u - .42) / .18);
      const rot = u < .22 ? lerp(-.3, 0, u / .22) : lerp(0, .5, heel);
      return [lerp(A, -A, u / .6), -heel * 7, rot];
    }
    const v = (u - .6) / .4, s = v * v * (3 - 2 * v);
    return [lerp(-A, A, s), -Math.sin(v * Math.PI) * 22 * Math.min(1, amp + .2), lerp(.5, -.3, s)];
  };
  const f1 = foot(0), f2 = foot(.5);
  P.f1 = [f1[0], f1[1]]; P.f2 = [f2[0], f2[1]]; P.r1 = f1[2]; P.r2 = f2[2];
  P.hx = 2.5 * Math.sin(ph * TAU);
  P.hy = -162 + 5 * Math.cos(ph * TAU * 2); P.lean = lean + .012 * Math.sin(ph * TAU * 2);
  // shoulders sit above the hip; each arm swings against its own-side leg
  const sx = Math.sin(P.lean) * 94, sy = P.hy - Math.cos(P.lean) * 94, sw = .4 * amp * Math.cos(ph * TAU);
  const hand = th => { const L = 114 - 14 * Math.max(0, th) / .4; return [sx + L * Math.sin(th), sy + L * Math.cos(th)]; };
  P.a1 = hand(-sw); P.a2 = hand(sw);
  P.tilt = lean * .4 + .015 * Math.sin(ph * TAU * 2);
  P.hdy = 1.5 * Math.cos(ph * TAU * 2);
  return P;
}

// o: flip, pal, bag, id, tie (default true), h1/h2 draw callbacks at the near/far hand (local coords), blink
function man(x, gy, sc, P, o = {}) {
  const pal = o.pal || HERO, tl = P.tl ?? 112, lean = P.lean ?? 0;
  push(x, gy, o.flip ? -sc : sc, 0, sc);
  ctx.fillStyle = 'rgba(70,50,30,.11)'; ctx.beginPath(); ctx.ellipse(10, 3, 74, 7, 0, 0, TAU); ctx.fill();
  const dx = Math.sin(lean), dy = -Math.cos(lean);
  const hip = [P.hx ?? 0, P.hy ?? -150], neck = [hip[0] + dx * tl, hip[1] + dy * tl], sh = [hip[0] + dx * (tl - 18), hip[1] + dy * (tl - 18)];
  const hc = [neck[0] + dx * 36 + (P.hdx || 0), neck[1] + dy * 36 + (P.hdy || 0)];
  const legPts = f => { const k = ik(hip[0], hip[1] + 6, f[0], f[1] - 12, 78, 78, 1); return [hip[0], hip[1] + 6, k[0], k[1], f[0], f[1] - 12]; };
  const armPts = h => { const k = ik(sh[0], sh[1], h[0], h[1], 62, 64, -1); return [sh[0], sh[1], k[0], k[1], h[0], h[1]]; };
  const leg = (f, col, shoe, rot = 0) => {
    cut(limb(legPts(f), [36, 30, 24]), col, { pat: 'net', w: 1.6, amp: .4, shadow: .5 });
    push(f[0], f[1] - 9, 1, rot); cut(ell(14, 0, 28, 11), shoe, { w: 1.6, amp: .3, shadow: .4 }); pop();
  };
  const arm = (h, col, hold) => {
    cut(limb(armPts(h), [26, 22, 20]), col, { pat: 'ldots', w: 1.6, amp: .4, shadow: .5 });
    if (hold) { push(h[0], h[1], 1); hold(); pop(); }
    cut(circ(h[0], h[1], 11), pal.skin, { w: 1.5, amp: .3, shadow: .3 });
    if (hold && o.holdOver) { push(h[0], h[1], 1); hold(true); pop(); }
  };
  leg(P.f2, pal.pantsD, pal.shoeD, P.r2 || 0);
  arm(P.a2, pal.shirtD, o.h2);
  if (o.bag) {
    push(hip[0] + dx * 70 - 40, hip[1] + dy * 70, 1, lean);
    cut(rrect(-30, -52, 60, 100, 16), pal.bag, { pat: 'flower', line: C.line, w: 1.8, amp: .5, shadow: .7 });
    cut(rrect(-26, -20, 44, 40, 10), '#a97f30', { pat: 'stripe', w: 1.5, amp: .4, shadow: false });
    pop();
  }
  // torso
  const mid = [(hip[0] + sh[0]) / 2 + 3, (hip[1] + sh[1]) / 2];
  cut(limb([hip[0], hip[1] + 8, mid[0], mid[1], sh[0], sh[1]], [60, 70, 62]), pal.shirt, { pat: 'ldots', w: 1.9, amp: .5, shadow: .7 });
  if (o.tie !== false) {
    push(mid[0] + 24 * Math.cos(lean), mid[1] - 8, 1, lean);
    cut(poly([-5, -26, 6, -26, 9, 8, 0, 22, -9, 8], true), pal.tie, { w: 1.4, amp: .3, shadow: .3 });
    pop();
  }
  if (o.id) { push(mid[0] + 26 * Math.cos(lean), mid[1] + 18, 1, lean); cut(rrect(-9, -8, 18, 24, 3), C.white, { w: 1.2, amp: .2, shadow: .3 }); cut(rrect(-5, -3, 10, 6, 1), '#5f9ea0', { line: null, shadow: false, amp: 0 }); pop(); }
  leg(P.f1, pal.pants, pal.shoe, P.r1 || 0);
  cut(limb([sh[0], sh[1], neck[0] + dx * 8, neck[1] + dy * 8], [28, 24]), pal.skin, { w: 1.5, amp: .3, shadow: .4 });
  arm(P.a1, pal.shirt, o.h1);

  // head: a round, friendly face with one big bright eye
  push(hc[0], hc[1], 1, P.tilt || 0);
  cut(ell(-9, 6, 8, 11), pal.skinD, { w: 1.4, amp: .3, shadow: false });
  cut(ell(0, 0, 35, 38), pal.skin, { w: 2, amp: .4, shadow: false });
  cut(dome(-5, -5, 40, 41), pal.hair, { w: 2, amp: .4, shadow: false });
  cut(poly([-41, -7, -24, -3, -25, 20, -39, 12], true), pal.hair, { w: 1.4, amp: .3, shadow: false });
  cut(leafShape(2, -38, 20, 12, -2, .4), pal.hair, { w: 1.4, amp: .3, shadow: false });
  cut(ell(21, 17, 9, 6), '#f29a9a', { line: null, amp: .3, shadow: false, alpha: .75 });
  const e = P.eye ?? .4, ex = 15 + (P.look || 0) * 2, ey = 3;
  const closed = e > .9 || o.blink || ((o.t || 0) * .31 + hash((o.t || 0) > 0 ? 7 : 3)) % 1 < .04;
  if (closed) line(curve(ex - 9, ey - 1, ex - 4, ey + 6, ex + 5, ey + 6, ex + 10, ey - 1), 2.2, C.line, { amp: .2 });
  else {
    const wide = e < 0;
    cut(circ(ex, ey, wide ? 12.5 : 10.5), C.white, { line: C.line, w: 1.8, shadow: false, amp: .2 });
    dot(ex + 2.5 + (P.look || 0) * 2.4, ey + 1, wide ? 5 : 6.4, '#1f2a5e');
    dot(ex + 4.4 + (P.look || 0) * 2.4, ey - 1.6, 2.3, C.white); dot(ex + 1, ey + 3.4, 1.2, C.white);
    if (e > .15) cut(dome(ex, ey + 1, 11, 21 * e * .3), pal.skin, { line: C.line, w: 1.5, shadow: false, amp: .2 });
  }
  line(curve(ex - 10, ey - 15 - (P.brow || 0), ex - 3, ey - 19 - (P.brow || 0), ex + 6, ey - 18, ex + 12, ey - 14 + (P.brow || 0) * .5), 2, pal.hair, { amp: .2 });
  line(curve(32, 5, 38, 10, 37, 15, 31, 16), 1.7, C.line, { amp: .15 });
  const m = P.mouth || 'flat', mo = P.mo || 0;
  if (m === 'open') cut(ell(24, 25, 8, 4 + 8 * mo), '#7a2f3a', { line: C.line, w: 1.6, shadow: false, amp: .2 });
  else if (m === 'chew') cut(ell(24, 25, 6.5, 2 + 4 * Math.abs(Math.sin((o.t || 0) * 11))), '#7a2f3a', { line: C.line, w: 1.5, shadow: false, amp: .2 });
  else if (m === 'smile') line(curve(15, 23, 20, 30, 29, 30, 34, 22), 2.2, C.line, { amp: .2 });
  else if (m === 'sad') line(curve(16, 28, 21, 24, 28, 24, 32, 28), 2.2, C.line, { amp: .2 });
  else if (m === 'sigh') cut(ell(25, 26, 5, 6), '#7a2f3a', { line: C.line, w: 1.5, shadow: false, amp: .2 });
  else line(curve(17, 25, 22, 28, 28, 28, 33, 25), 2.1, C.line, { amp: .2 });
  pop();
  pop();
}

// ---------- background people (lite) ----------
const FOLK_SHIRTS = ['#c8463b', '#e2b446', '#5f8f4e', '#3f8a86', '#28416f', '#e9a7a4', '#9fcbe0', '#d98a3d', '#8fb35a', '#b7d6cf', '#a08bbf', '#6f7f8f'];
const FOLK_PANTS = ['#33405f', '#4a4a52', '#5a4632', '#2f4a45', '#6b6058'];
const FOLK_SKIN = ['#e2b189', '#c58c5f', '#a86e46', '#efc7a0', '#8c5a3a'];
const FOLK_HAIR = ['#2b2422', '#4a3324', '#111111', '#8a6a3a', '#b8b0a4'];
function folk(x, gy, sc, id, o = {}) {
  const r = i => hash(id * 17 + i), pick = (a, i) => a[Math.floor(r(i) * a.length)];
  const shirt = o.shirt || pick(FOLK_SHIRTS, 1), pants = pick(FOLK_PANTS, 2), skin = pick(FOLK_SKIN, 3), hair = pick(FOLK_HAIR, 4);
  const dir = o.dir ?? (r(5) < .5 ? -1 : 1), phone = o.phone ?? r(6) < .7, style = Math.floor(r(7) * 5), tall = .92 + r(8) * .2;
  const sway = (o.sway ?? 0) * Math.sin((o.t || 0) * 2.2 + id);
  push(x, gy, dir * sc, 0, sc * tall);
  if (o.shadow !== false) { ctx.fillStyle = 'rgba(70,50,30,.10)'; ctx.beginPath(); ctx.ellipse(0, 3, 46, 6, 0, 0, TAU); ctx.fill(); }
  const gait = o.walk ? Math.sin((o.t || 0) * 8 + id) * 18 : 0;
  if (o.sit) {
    cut(limb([-4, -94, 46, -94, 50, -12], [30, 26, 22]), pants, { w: 1.5, amp: .4, shadow: .4 });
    cut(limb([10, -94, 60, -94, 64, -12], [30, 26, 22]), pants, { w: 1.5, amp: .4, shadow: .4 });
    cut(ell(58, -6, 22, 8), '#3b2a22', { w: 1.3, amp: .3, shadow: false }); cut(ell(72, -6, 22, 8), '#3b2a22', { w: 1.3, amp: .3, shadow: false });
  } else {
    cut(limb([-4, -146, -10 - gait, -12], [30, 24]), pants, { w: 1.5, amp: .4, shadow: .4 });
    cut(limb([10, -146, 14 + gait, -12], [30, 24]), pants, { w: 1.5, amp: .4, shadow: .4 });
    cut(ell(-2 - gait, -6, 22, 8), '#3b2a22', { w: 1.3, amp: .3, shadow: false }); cut(ell(22 + gait, -6, 22, 8), '#3b2a22', { w: 1.3, amp: .3, shadow: false });
  }
  push(sway, o.sit ? 50 : 0, 1);
  if (o.bag ?? r(9) < .35) cut(rrect(-42, -246, 34, 74, 10), pick(['#c89c40', '#5f8f4e', '#c8463b', '#28416f'], 10), { pat: 'flower', w: 1.4, amp: .4, shadow: .5 });
  cut(limb([0, -138, 2, -250], [62, 68]), shirt, { pat: PATS[Math.floor(r(11) * 5)], w: 1.7, amp: .5, shadow: .6 });
  const grip = !!o.grip, typing = !!o.type, pf = phone && !grip && !typing;
  const hx = 4 + (pf ? 12 : 0), hy = -296 + (pf ? 8 : 0) + (typing ? 4 : 0);
  const hand = grip ? [12, -352] : typing ? [84, -218 + Math.max(0, Math.sin((o.t || 0) * 11 + id)) * 6] : [26, pf ? -206 : -170];
  const elb = grip ? [-6, -300] : typing ? [34, -186] : [14, -206];
  cut(limb([2, -244, elb[0], elb[1], hand[0], hand[1]], [24, 20, 18]), shirt, { w: 1.4, amp: .4, shadow: .4 });
  if (pf) { cut(rrect(28, -228, 14, 26, 3), '#2a2a34', { w: 1.2, amp: .2, shadow: false }); cut(rrect(30, -226, 10, 20, 2), '#a8d4ff', { line: null, shadow: false, amp: 0 }); }
  cut(circ(hand[0], hand[1], 9), skin, { w: 1.3, amp: .3, shadow: false });
  push(hx, hy, 1, pf || typing ? .3 : 0);
  cut(ell(0, 0, 29, 33), skin, { w: 1.7, amp: .4, shadow: .6 });
  if (style === 0) cut(dome(-3, -4, 31, 34), hair, { w: 1.5, amp: .3, shadow: false });
  else if (style === 1) { cut(dome(-3, -4, 31, 34), hair, { w: 1.5, amp: .3, shadow: false }); cut(circ(-6, -38, 13), hair, { w: 1.5, amp: .3, shadow: false }); }
  else if (style === 2) { cut(dome(-3, -4, 33, 36), hair, { w: 1.5, amp: .3, shadow: false }); cut(poly([-34, -6, -14, -2, -18, 74, -40, 70], true), hair, { w: 1.4, amp: .3, shadow: false }); }
  else if (style === 3) { cut(dome(-3, -6, 32, 26), pick(FOLK_SHIRTS, 12), { w: 1.5, amp: .3, shadow: false }); cut(poly([16, -22, 52, -14, 50, -6, 14, -8], true), pick(FOLK_SHIRTS, 12), { w: 1.4, amp: .3, shadow: false }); }
  else { cut(dome(-3, -12, 30, 20), hair, { w: 1.5, amp: .3, shadow: false }); cut(circ(14, 2, 9), 'rgba(255,255,255,.4)', { line: C.line, w: 1.4, amp: .2, shadow: false }); }
  cut(circ(14, 2, 6.6), C.white, { line: C.line, w: 1.4, amp: .2, shadow: false }); dot(16, 3, 3.6, '#1f2a5e'); dot(17.4, 1.4, 1.3, C.white);
  cut(ell(16, 14, 6, 4), '#f29a9a', { line: null, amp: .2, shadow: false, alpha: .7 });
  line(curve(10, 18, 15, 23, 22, 23, 26, 17), 1.6, C.line, { amp: .2 });
  pop();
  pop();
  pop();
}
