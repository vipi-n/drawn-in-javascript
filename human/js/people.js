// People and animals for the human story. Local coordinates: origin at the feet, facing right.

Object.assign(C, {
  skin: '#f1c39b', fur: '#8a5a3b', hair: '#4a3326', hide: '#c99a60', belly: '#d9a878',
  night: '#262b55', ochre: '#b5452b', snow: '#e9eef5', stone: '#8f8a84', cave: '#9c7654'
});

// ---------- shape helpers ----------
// closed outline around a polyline, width tapering w0 -> w1, with round caps
function tube(pts, w0, w1 = w0) {
  const n = pts.length / 2, Ls = [], Rs = [];
  let ex = 1, ey = 0, sx = 1, sy = 0;
  for (let k = 0; k < n; k++) {
    const k0 = Math.max(0, k - 1), k1 = Math.min(n - 1, k + 1);
    let dx = pts[2 * k1] - pts[2 * k0], dy = pts[2 * k1 + 1] - pts[2 * k0 + 1];
    const d = Math.hypot(dx, dy) || 1; dx /= d; dy /= d;
    if (k === 0) { sx = dx; sy = dy; }
    if (k === n - 1) { ex = dx; ey = dy; }
    const w = lerp(w0, w1, k / (n - 1)) / 2;
    Ls.push(pts[2 * k] - dy * w, pts[2 * k + 1] + dx * w);
    Rs.push(pts[2 * k] + dy * w, pts[2 * k + 1] - dx * w);
  }
  const p = Ls.slice();
  const ae = Math.atan2(ey, ex), xe = pts[2 * n - 2], ye = pts[2 * n - 1];
  for (let j = 1; j < 6; j++) { const a = ae + Math.PI / 2 - j / 6 * Math.PI; p.push(xe + Math.cos(a) * w1 / 2, ye + Math.sin(a) * w1 / 2); }
  for (let k = n - 1; k >= 0; k--) p.push(Rs[2 * k], Rs[2 * k + 1]);
  const as = Math.atan2(sy, sx), xs = pts[0], ys = pts[1];
  for (let j = 1; j < 6; j++) { const a = as - Math.PI / 2 - j / 6 * Math.PI; p.push(xs + Math.cos(a) * w0 / 2, ys + Math.sin(a) * w0 / 2); }
  return { p, c: true };
}
// rubber-hose limb through a joint
function hose(ax, ay, kx, ky, bx, by, w0, w1 = w0) {
  const cx = 2 * kx - (ax + bx) / 2, cy = 2 * ky - (ay + by) / 2, pts = [];
  for (let k = 0; k <= 10; k++) { const u = k / 10, v = 1 - u; pts.push(v * v * ax + 2 * u * v * cx + u * u * bx, v * v * ay + 2 * u * v * cy + u * u * by); }
  return tube(pts, w0, w1);
}
// two-bone IK: returns [jointX, jointY, endX, endY]
function ik(hx, hy, fx, fy, a, b, bend) {
  const dx = fx - hx, dy = fy - hy, d = Math.max(1e-3, Math.hypot(dx, dy));
  const dm = Math.min(d, a + b - .01), ux = dx / d, uy = dy / d;
  const x = (a * a - b * b + dm * dm) / (2 * dm), h = Math.sqrt(Math.max(0, a * a - x * x));
  return [hx + ux * x - uy * h * bend, hy + uy * x + ux * h * bend, hx + ux * dm, hy + uy * dm];
}
// union of ellipses [cx,cy,rx,ry] as one outline, sampled from a point inside
function blobUnion(cx, cy, ells, n = 60) {
  const p = []; let last = 10;
  for (let k = 0; k < n; k++) {
    const a = k / n * TAU, dx = Math.cos(a), dy = Math.sin(a);
    let best = -1;
    for (const [ex, ey, rx, ry] of ells) {
      if (rx <= 0 || ry <= 0) continue;
      const ox = (cx - ex) / rx, oy = (cy - ey) / ry, vx = dx / rx, vy = dy / ry;
      const A = vx * vx + vy * vy, B = ox * vx + oy * vy, Cc = ox * ox + oy * oy - 1, disc = B * B - A * Cc;
      if (disc < 0) continue;
      const s = (-B + Math.sqrt(disc)) / A;
      if (s > best) best = s;
    }
    if (best < 0) best = last; last = best;
    p.push(cx + dx * best, cy + dy * best);
  }
  return { p, c: true };
}

// ---------- hominin: evo 0 = ape ... 1 = modern human ----------
const OUTFITS = {
  fur: { body: C.fur, belly: true, furLimbs: true },
  hide: { body: C.hide, spots: true, hem: true },
  robe: { body: C.white, belt: C.gold, hem: true },
  coat: { body: C.teal, pants: C.brown, belt: C.brown, shoes: C.dark },
  modern: { body: C.yellow, pants: C.blue, shoes: C.red },
  parent: { body: C.teal, pants: C.blue, shoes: C.dark },
  kid: { body: C.yellow, shorts: C.sky }
};
function rigFor(e, kid) {
  const E = clamp(e);
  const r = {
    thigh: lerp(33, 48, E), shin: lerp(31, 46, E), torso: lerp(68, 80, E),
    upper: lerp(48, 40, E), fore: lerp(46, 38, E), R: lerp(31, 33, E),
    hipW: lerp(46, 36, E), chestW: lerp(56, 44, E), legW: lerp(21, 18, E), armW: lerp(19, 15, E),
    ape: 1 - clamp(E * 1.6), lean: lerp(.42, 0, clamp(E * 2.2)), stride: lerp(22, 40, E)
  };
  if (kid) Object.assign(r, { thigh: 21, shin: 20, torso: 46, upper: 23, fore: 21, R: 31, hipW: 36, chestW: 38, legW: 15, armW: 12, stride: 16, lean: 0, ape: 0 });
  return r;
}
function pose(o) {
  const r = rigFor(o.evo ?? 0, o.kid);
  const walk = o.walk, walking = walk != null, quad = clamp(o.quad ?? 0);
  const legLen = r.thigh + r.shin, S = r.stride * (o.stride ?? 1);
  const bob = walking ? Math.abs(Math.sin(walk * TAU)) * 3 : 0;
  const hipH = (o.hipH ?? legLen * lerp(.93, .8, quad)) + bob;
  const lean = o.lean ?? lerp(r.lean, 1.12, quad);
  const hip = [o.hipX ?? 0, -hipH];
  const td = [Math.sin(lean), -Math.cos(lean)];
  const neck = [hip[0] + td[0] * r.torso, hip[1] + td[1] * r.torso];
  const sh = [hip[0] + td[0] * r.torso * .8, hip[1] + td[1] * r.torso * .8];
  const cyc = (i, amp, lift) => {
    const u = (walk + i * .5) % 1;
    if (u < .5) return [lerp(amp / 2, -amp / 2, u / .5), 0];
    const v = (u - .5) / .5; return [lerp(-amp / 2, amp / 2, ease(v)), -Math.sin(v * Math.PI) * lift];
  };
  const feet = [0, 1].map(i => {
    if (o.feet && o.feet[i]) return o.feet[i];
    if (!walking) return [hip[0] + (i ? -8 : 8), 0];
    const [dx, dy] = cyc(i, S, 12); return [hip[0] + dx, dy];
  });
  const knees = feet.map(f => ik(hip[0], hip[1], f[0], f[1], r.thigh, r.shin, -1));
  const armL = r.upper + r.fore;
  const hands = [0, 1].map(i => {
    if (o.hands && o.hands[i]) return o.hands[i];
    if (o.hang && i === 0) return [sh[0] + 4, sh[1] - armL * .97];
    if (o.armA && o.armA[i] != null) { const a = o.armA[i]; return [sh[0] + Math.sin(a) * armL * .92, sh[1] + Math.cos(a) * armL * .92]; }
    const a = (walking ? -Math.cos((walk + i * .5) * TAU) * .5 * (o.swing ?? 1) : (i ? -.08 : .08)) + lean * .25;
    let h = [sh[0] + Math.sin(a) * armL * .92, sh[1] + Math.cos(a) * armL * .92];
    if (quad > 0) {
      const g = walking ? cyc(i + .5, S * .9, 10) : [i ? -6 : 6, 0];
      h = [lerp(h[0], sh[0] + 12 + g[0], quad), lerp(h[1], g[1], quad)];
    }
    return h;
  });
  const elbows = hands.map(h => ik(sh[0], sh[1], h[0], h[1], r.upper, r.fore, 1));
  const ln = clamp(lean / 1.12);
  const hc = [neck[0] + r.R * (.12 + .5 * ln), neck[1] - r.R * (.86 - .4 * ln)];
  return { r, hip, neck, sh, feet, knees, hands, elbows, hc, lean };
}

function hominin(x, y, t, o = {}) {
  const J = pose(o), r = J.r, e = clamp(o.evo ?? 0), s = o.s ?? 1, dir = o.dir ?? 1;
  const fit = OUTFITS[o.outfit ?? (o.kid ? 'kid' : e < .62 ? 'fur' : e < .9 ? 'hide' : 'modern')];
  const skin = C.skin, fur = C.fur, hairCol = o.hair ?? (e < .62 ? fur : C.hair);
  const limb = fit.furLimbs ? fur : skin;
  push(x, y, s * dir, 0, s);
  if (o.hang) { ctx.rotate(o.swing ?? 0); ctx.translate(-J.hands[0][0], -J.hands[0][1]); }
  else if (o.rot) { ctx.translate(0, J.hip[1]); ctx.rotate(o.rot); ctx.translate(0, -J.hip[1]); }
  if (o.shiver) ctx.translate(Math.sin(t * 60) * 1.5, 0);

  const arm = i => {
    const [ex, ey, hx, hy] = J.elbows[i];
    const sh = hose(J.sh[0], J.sh[1], ex, ey, hx, hy, r.armW, r.armW * .82);
    const sleeve = fit.pants && !fit.shorts ? fit.body : null;
    under(sh); crayon(sh, sleeve ?? limb, { gap: 4, w: 5, amp: 1.2, alpha: i ? .7 : .9 }); ink(sh, 2.4);
    if (o.item) o.item(i, hx, hy, J);
    const hr = r.armW * (fit.furLimbs ? .62 : .55), hd = circ(hx, hy, hr);
    under(hd); crayon(hd, skin, { gap: 3, w: 4, amp: .8 }); ink(hd, 2.2);
  };
  const leg = i => {
    const [kx, ky, fx, fy] = J.knees[i];
    const sh = hose(J.hip[0], J.hip[1], kx, ky, fx, fy - 4, r.legW, r.legW * .8);
    under(sh); crayon(sh, fit.pants ?? limb, { gap: 4, w: 5, amp: 1.2, alpha: i ? .7 : .9 });
    if (fit.shorts) { clipTo(circ(J.hip[0], J.hip[1], r.thigh * .75)); crayon(sh, fit.shorts, { gap: 3, w: 5, amp: 1 }); unclip(); }
    ink(sh, 2.4);
    const f = circ(fx + 7, fy - 5, fit.furLimbs ? 14 : 12, 6);
    under(f); crayon(f, fit.shoes ?? skin, { gap: 3, w: 4, amp: .8 }); ink(f, 2.2);
  };
  const torso = () => {
    const sh = tube([J.hip[0], J.hip[1] + 6, J.neck[0], J.neck[1]], r.hipW, r.chestW);
    under(sh);
    crayon(sh, fit.body, { gap: 5, w: 6, cross: !!fit.furLimbs, alpha: .9 });
    if (fit.belly) {
      const bx = lerp(J.hip[0], J.neck[0], .42) + Math.cos(J.lean) * r.hipW * .2, by = lerp(J.hip[1], J.neck[1], .42) + Math.sin(J.lean) * r.hipW * .2;
      crayon(circ(bx, by, r.hipW * .3, r.torso * .3), C.belly, { gap: 3, w: 5, amp: 1, alpha: .9 });
    }
    if (fit.spots) for (const [u, v] of [[.3, -.2], [.62, .15], [.45, .3], [.8, -.18]]) dot(lerp(J.hip[0], J.neck[0], u) + v * r.hipW, lerp(J.hip[1], J.neck[1], u), 3.2, C.brown);
    if (fit.belt) crayonLine(seg(J.hip[0] - r.hipW * .45, J.hip[1] - 8, J.hip[0] + r.hipW * .45, J.hip[1] - 8), fit.belt, 7, { passes: 1 });
    ink(sh, 2.6);
    if (fit.hem) {
      let d = `M ${J.hip[0] - r.hipW * .5} ${J.hip[1] + 10}`;
      for (let k = 1; k <= 6; k++) d += ` L ${J.hip[0] - r.hipW * .5 + k * r.hipW / 6} ${J.hip[1] + (k % 2 ? 20 : 10)}`;
      ink(d, 2);
    }
    if (fit.pants || fit.shorts) ink(`M ${J.neck[0] - 8} ${J.neck[1] + 4} Q ${J.neck[0] + 2} ${J.neck[1] + 12} ${J.neck[0] + 12} ${J.neck[1] + 4}`, 1.8);
  };

  arm(1); leg(1); torso(); leg(0);
  drawHead(J.hc[0], J.hc[1], r.R, r.ape, hairCol, o, t);
  arm(0);
  pop();
}

function drawHead(hx, hy, R, ape, hairCol, o, t) {
  push(hx, hy, 1, o.look ?? 0);
  const muz = [R * (.55 + .32 * ape), R * .45, R * (.34 + .2 * ape), R * (.3 + .06 * ape)];
  const ells = [[0, 0, R, R * lerp(1.02, .92, ape)], muz, [R * .25, R * .42, R * .62, R * .5]];
  const nose = [R * .97, R * .1, R * .15 * (1 - ape), R * .15 * (1 - ape)];
  if (ape < .5) ells.push(nose);
  const hs = blobUnion(R * .2, R * .1, ells);
  const eyeA = [R * lerp(.3, .42, ape), R * lerp(.26, .02, ape), R * lerp(.86, .46, ape), R * lerp(.8, .42, ape)];
  const face = blobUnion(R * .5, R * .2, ape < .5 ? [eyeA, muz, nose] : [eyeA, muz]);
  under(hs);
  clipTo(hs);
  crayon(hs, hairCol, { gap: 4, w: 6, cross: ape > .3, alpha: .95 });
  under(face, C.paper); crayon(face, C.skin, { gap: 4, w: 5, amp: 1.2 });
  ink(face, 1.8);
  unclip();
  ink(hs, 2.6);
  if (o.curl) ink(spiral(R * .1, -R * 1.08, 7, 1.4, 1), 2.2);
  const ear = circ(-R * .1, R * .12, R * (.24 + .12 * ape));
  under(ear); crayon(ear, C.skin, { gap: 3, w: 4, amp: .8 }); ink(ear, 2.2);
  ink(circ(-R * .06, R * .14, R * (.12 + .06 * ape), R * (.12 + .06 * ape), -1, 2), 1.6);
  const ex = R * lerp(.52, .46, ape), ey = R * lerp(-.04, -.05, ape), er = R * (o.eyeR ?? .3);
  blush(R * lerp(.42, .3, ape), R * .38, 7, 4);
  if ((o.blink ?? 0) > .5) ink(`M ${ex - er} ${ey} Q ${ex} ${ey + er * .6} ${ex + er} ${ey}`, 2.4);
  else eyeball(ex, ey, er, { lx: o.lx ?? .6, ly: o.ly ?? 0, pupil: o.pupil ?? .58, ring: o.ring ?? (ape > .5 ? C.brown : C.blue) });
  if (ape > .3) ink(`M ${ex - er * 1.3} ${ey - er * 1.25} Q ${ex + er * .2} ${ey - er * 1.9} ${ex + er * 1.6} ${ey - er * 1.1}`, lerp(2.4, 5, ape));
  else ink(`M ${ex - er * .9} ${ey - er * 1.5 - (o.brow ?? 0) * 5} Q ${ex + er * .2} ${ey - er * 1.9 - (o.brow ?? 0) * 6} ${ex + er * 1.2} ${ey - er * 1.4 - (o.brow ?? 0) * 5}`, 3, hairCol);
  if (ape > .3) { dot(muz[0] + muz[2] * .55, muz[1] - muz[3] * .3, 2.2); dot(muz[0] + muz[2] * .78, muz[1] - muz[3] * .2, 2.2); }
  else ink(`M ${R * .98} ${R * .2} Q ${R * .9} ${R * .26} ${R * .84} ${R * .2}`, 1.6);
  const mx = ape > .3 ? muz[0] + muz[2] * .35 : R * .74, my = ape > .3 ? muz[1] + muz[3] * .45 : R * .5;
  const m = o.mouth;
  if (m === 'o') { under(circ(mx, my, 5, 6), C.rose); ink(circ(mx, my, 5, 6), 2.2); }
  else if (m === 'open') { const sh = `M ${mx - 12} ${my - 3} Q ${mx} ${my + 16} ${mx + 12} ${my - 4} Z`; under(sh, C.rose); ink(sh, 2.2); }
  else if (m === 'frown') ink(`M ${mx - 10} ${my + 4} Q ${mx} ${my - 4} ${mx + 10} ${my + 3}`, 2.2);
  else ink(`M ${mx - 11} ${my - 2} Q ${mx} ${my + 7} ${mx + 10} ${my - 3}`, 2.2);
  pop();
}

// ---------- butterfly (curiosity) ----------
function butterfly(x, y, t, o = {}) {
  const s = o.s ?? 1, k = Math.round((.2 + .8 * Math.abs(Math.sin(t * (o.speed ?? 15)))) * 20) / 20;
  push(x, y, s, o.rot ?? 0, s);
  for (const sd of [-1, 1]) {
    const q = v => (v * k * sd).toFixed(1);
    const up = `M 0 -2 C ${q(6)} -30, ${q(34)} -42, ${q(42)} -24 C ${q(46)} -8, ${q(26)} 2, 0 -2 Z`;
    const lo = `M 0 1 C ${q(4)} 18, ${q(24)} 32, ${q(30)} 20 C ${q(34)} 8, ${q(16)} 1, 0 1 Z`;
    under(up); crayon(up, o.color ?? C.orange, { gap: 3, w: 4, amp: .7 }); ink(up, 2);
    under(lo); crayon(lo, C.yellow, { gap: 3, w: 4, amp: .7 }); ink(lo, 2);
    if (k > .5) dot(28 * k * sd, -22, 3.2);
  }
  ink('M 0 -12 L 0 14', 4.5);
  ink('M 0 -12 C -3 -22, -7 -27, -12 -29 M 0 -12 C 3 -22, 7 -27, 12 -29', 1.6);
  pop();
}

// ---------- sabre-tooth cat ----------
function sabre(x, y, t, o = {}) {
  const s = o.s ?? 1, dir = o.dir ?? 1, ph = o.walk, walking = ph != null;
  push(x, y, s * dir, 0, s);
  const bob = walking ? -Math.abs(Math.sin(ph * TAU)) * 8 : 0, cr = o.crouch ?? 0;
  const top = -118 + cr * 30 + bob;
  const legAt = (lx, off, far) => {
    const a = walking ? Math.sin((ph + off) * TAU) : 0;
    const fx = lx + a * 34, fy = walking ? -Math.max(0, Math.cos((ph + off) * TAU)) * 14 : 0;
    const [kx, ky] = ik(lx, top + 40, fx, fy, 50, 48 - cr * 10, lx > 0 ? 1 : -1);
    const sh = hose(lx, top + 30, kx, ky, fx, fy - 6, 30, 20);
    under(sh); crayon(sh, C.tan, { gap: 4, w: 6, amp: 1.2, alpha: far ? .6 : .9 }); ink(sh, 2.6);
    const paw = circ(fx + 8, fy - 7, 15, 8); under(paw); crayon(paw, C.tan, { gap: 3, w: 4 }); ink(paw, 2.2);
  };
  legAt(-70, .5, true); legAt(80, 0, true);
  push(0, top);
  const tail = 'M -118 10 C -150 0, -160 -30, -150 -50 C -140 -30, -130 -14, -110 -4 Z';
  under(tail); crayon(tail, C.tan, { gap: 4, w: 5 }); ink(tail, 2.4);
  const body = 'M -120 16 C -126 -30, -60 -50, 20 -46 C 90 -44, 136 -28, 136 12 C 136 50, 100 60, 40 60 L -60 60 C -110 60, -118 40, -120 16 Z';
  under(body); crayon(body, C.tan, { gap: 5, w: 7 });
  crayonLine('M -80 -36 L -70 -6 M -40 -44 L -34 -12 M 0 -46 L 4 -14 M 40 -44 L 40 -14', C.brown, 10, { passes: 1, alpha: .8 });
  crayon('M -80 50 C -40 60, 60 62, 100 48 C 60 34, -40 34, -80 50 Z', C.cream, { gap: 3, w: 5, alpha: .8 });
  ink(body, 2.8);
  if (o.scared) { const f = []; for (let k = 0; k < 9; k++) { const fx = -100 + k * 26; f.push(seg(fx, -40 + Math.abs(k - 4) * 2, fx + 4, -64 + Math.abs(k - 4) * 3)); } ink(f, 2.4); }
  pop();
  legAt(-40, 0, false); legAt(110, .5, false);
  // head
  push(150, top - 10, 1, o.look ?? 0);
  const jaw = clamp(o.jaw ?? 0);
  push(10, 20, 1, jaw * .6);
  const low = 'M -20 0 C 0 24, 50 30, 70 12 L 60 0 Z';
  under(low); crayon(low, C.tan, { gap: 3, w: 5 }); ink(low, 2.4);
  pop();
  const ears = [circ(-12, -44, 14), circ(18, -50, 13)];
  for (const e of ears) { under(e); crayon(e, C.tan, { gap: 3, w: 4 }); ink(e, 2.2); }
  const hd = 'M -40 10 C -50 -40, 10 -60, 50 -40 C 80 -30, 94 -6, 88 14 C 80 30, 40 34, 10 30 C -20 30, -36 24, -40 10 Z';
  under(hd); crayon(hd, C.tan, { gap: 4, w: 6 });
  if (jaw > .05) crayon('M 30 22 C 50 30, 70 26, 82 16 L 60 14 Z', C.rose, { gap: 3, w: 4 });
  ink(hd, 2.6);
  const fang = 'M 50 24 C 52 50, 56 66, 62 74 C 64 58, 64 40, 62 24 Z';
  const fang2 = 'M 68 22 C 70 44, 74 58, 78 64 C 80 50, 79 36, 77 22 Z';
  under(fang, C.white); ink(fang, 2); under(fang2, C.white); ink(fang2, 2);
  dot(86, 4, 4);
  const er = o.scared ? 13 : 10;
  if (o.glare) {
    under(circ(38, -12, 11), C.yellow); dot(38 + (o.lx ?? 0) * 3, -12, 3.2); ink(circ(38, -12, 11), 2.4);
    ink('M 22 -30 L 52 -20', 3.4);
  } else eyeball(38, -12, er, { lx: o.lx ?? .5, ly: o.ly ?? 0, pupil: o.scared ? .3 : .55, ring: C.gold });
  ink('M 70 18 L 104 12 M 70 22 L 102 24 M 66 26 L 96 36', 1.4);
  pop();
  pop();
}

// ---------- dog ----------
function dog(x, y, t, o = {}) {
  const s = o.s ?? 1, dir = o.dir ?? 1, ph = o.walk, walking = ph != null;
  push(x, y, s * dir, 0, s);
  const bob = walking ? -Math.abs(Math.sin(ph * TAU)) * 4 : 0;
  const legs = [[-34, .5], [30, 0], [-22, 0], [42, .5]];
  const L = k => { const [lx, off] = legs[k]; push(lx, -34 + bob, 1, walking ? Math.sin((ph + off) * TAU) * .5 : 0); const sh = tube([0, 0, 0, 30], 11, 9); under(sh); crayon(sh, C.gold, { gap: 3, w: 4, alpha: k < 2 ? .6 : .9 }); ink(sh, 2.2); pop(); };
  L(0); L(1);
  push(0, bob);
  const wag = Math.sin(t * 22) * .5;
  push(-44, -48, 1, -.6 + wag); const tl = tube([0, 0, -26, -10], 9, 5); under(tl); crayon(tl, C.gold, { gap: 3, w: 4 }); ink(tl, 2.2); pop();
  const body = tube([-44, -44, 36, -46], 34, 32);
  under(body); crayon(body, C.gold, { gap: 4, w: 6 }); ink(body, 2.4);
  push(46, -64, 1, o.look ?? 0);
  const hd = blobUnion(4, 0, [[0, 0, 20, 18], [20, 6, 16, 11]]);
  under(hd); crayon(hd, C.gold, { gap: 4, w: 5 }); ink(hd, 2.4);
  dot(36, 2, 4);
  eyeball(8, -4, 6, { lx: .7, pupil: .65 });
  const ear = 'M -12 -12 C -20 -4, -22 12, -14 20 C -6 12, -4 0, -4 -14 Z';
  under(ear); crayon(ear, C.brown, { gap: 3, w: 4 }); ink(ear, 2);
  if (o.bark) ink('M 22 14 Q 30 22 38 14', 2);
  else if (o.tongue) { const tg = 'M 24 12 C 24 24, 32 26, 32 12 Z'; under(tg, C.pink); ink(tg, 1.8); }
  pop();
  pop();
  L(2); L(3);
  pop();
}
