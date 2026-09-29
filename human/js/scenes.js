// The human story: a timeline of scenes, each a pure function of time t (seconds).

function G_(dy) { return GROUND + dy; }
// distance travelled when velocity moves linearly between keys [[t, v], ...]
function integ(t, keys) {
  let x = 0;
  for (let i = 0; i < keys.length - 1; i++) {
    const [t0, v0] = keys[i], [t1, v1] = keys[i + 1];
    if (t <= t0) break;
    const te = Math.min(t, t1), vE = lerp(v0, v1, (te - t0) / (t1 - t0));
    x += (v0 + vE) / 2 * (te - t0);
  }
  const [tl, vl] = keys[keys.length - 1];
  if (t > tl) x += vl * (t - tl);
  return x;
}
const toWorld = (x, y, s, dir, p) => [x + p[0] * s * dir, y + p[1] * s];
function bang(x, y, size = 64, col = C.ink) { hand('!', x, y, size, col); }
function eyesTo(B, hx, hy) { return B ? { lx: clamp((B.x - hx) / 120, -1, 1), ly: clamp((B.y - hy) / 120, -1, 1) } : {}; }

// ---------- small props ----------
function flower(x, gy, s = 1, col = C.pink) {
  push(x, gy, s);
  ink('M 0 0 C 2 -14, -2 -28, 0 -40', 2.2, C.green);
  const pet = [];
  for (let k = 0; k < 5; k++) { const a = k / 5 * TAU; pet.push(circ(Math.cos(a) * 9, -44 + Math.sin(a) * 9, 7)); }
  for (const p of pet) { under(p); crayon(p, col, { gap: 3, w: 4, amp: .6 }); }
  ink(pet, 1.6); dot(0, -44, 5, C.gold);
  pop();
}
function footprint(x, y, s = 1) {
  push(x, y, s);
  const sole = circ(0, 0, 13, 5);
  crayon(sole, C.brown, { gap: 3, w: 4, alpha: .6, amp: .6 }); ink(sole, 1.6);
  for (let k = 0; k < 4; k++) dot(15, -6 + k * 4, 1.8, C.brown);
  pop();
}
function birds(x, y, t, n = 3) {
  const out = [];
  for (let k = 0; k < n; k++) {
    const bx = x + k * 42 + Math.sin(t + k) * 6, by = y + (k % 2) * 18, f = Math.sin(t * 8 + k) * 7;
    out.push(`M ${bx - 13} ${by - f} Q ${bx - 6} ${by - 6} ${bx} ${by} Q ${bx + 6} ${by - 6} ${bx + 13} ${by - f}`);
  }
  ink(out.join(' '), 2.2);
}
function pine(x, gy, h = 220) {
  ink(`M ${x} ${gy} L ${x} ${gy - 30}`, 7, C.brown);
  for (let k = 0; k < 3; k++) {
    const yb = gy - 22 - k * h * .25, w = (3 - k) * h * .13 + 10, ht = h * .42;
    const sh = `M ${x - w} ${yb} L ${x} ${yb - ht} L ${x + w} ${yb} C ${x + w * .4} ${yb + 8}, ${x - w * .4} ${yb + 8}, ${x - w} ${yb} Z`;
    under(sh); crayon(sh, C.teal, { gap: 4, w: 6 });
    const cap = `M ${x - w * .42} ${yb - ht * .58} L ${x} ${yb - ht} L ${x + w * .42} ${yb - ht * .58} Q ${x + w * .2} ${yb - ht * .5} ${x} ${yb - ht * .56} Q ${x - w * .2} ${yb - ht * .5} ${x - w * .42} ${yb - ht * .58} Z`;
    under(cap, C.white);
    ink(sh, 2.4);
  }
}
function caveHill(x, gy) {
  const hill = `M ${x - 220} ${gy} C ${x - 180} ${gy - 280}, ${x + 140} ${gy - 380}, ${x + 440} ${gy - 320} L ${x + 800} ${gy - 330} L ${x + 800} ${gy} Z`;
  under(hill); crayon(hill, C.stone, { gap: 5, w: 7, cross: true, alpha: .75 });
  crayon(`M ${x - 170} ${gy - 200} C ${x - 100} ${gy - 320}, ${x + 140} ${gy - 390}, ${x + 440} ${gy - 330} L ${x + 800} ${gy - 340} L ${x + 800} ${gy - 300} C ${x + 400} ${gy - 290}, ${x} ${gy - 300}, ${x - 170} ${gy - 200} Z`, C.white, { gap: 4, w: 7, alpha: .9 });
  ink(hill, 2.8);
  const mouth = `M ${x - 70} ${gy} C ${x - 80} ${gy - 170}, ${x + 120} ${gy - 190}, ${x + 120} ${gy} Z`;
  under(mouth, '#2a2420'); crayon(mouth, C.black, { gap: 4, w: 7, alpha: .9 }); ink(mouth, 2.6);
}
function obelisk(x, gy) {
  const sh = `M ${x - 48} ${gy + 30} L ${x - 34} ${gy - 330} L ${x} ${gy - 380} L ${x + 34} ${gy - 330} L ${x + 48} ${gy + 30} Z`;
  under(sh); crayon(sh, C.yellow, { gap: 4, w: 6 }); crayon(`M ${x} ${gy - 380} L ${x + 34} ${gy - 330} L ${x + 48} ${gy + 30} L ${x + 16} ${gy + 30} Z`, C.gold, { gap: 4, w: 5, alpha: .7 });
  ink(sh, 2.8);
  ink(`M ${x - 10} ${gy - 280} L ${x + 10} ${gy - 280} M ${x - 12} ${gy - 210} L ${x + 12} ${gy - 190} M ${x - 8} ${gy - 150} L ${x + 8} ${gy - 150} L ${x} ${gy - 130} Z M ${x - 14} ${gy - 90} Q ${x} ${gy - 110} ${x + 14} ${gy - 90}`, 2);
  ink(circ(x, gy - 245, 9), 2);
}
function phoneBox(x, gy) {
  const sh = `M ${x - 55} ${gy + 30} L ${x - 55} ${gy - 270} Q ${x} ${gy - 300} ${x + 55} ${gy - 270} L ${x + 55} ${gy + 30} Z`;
  under(sh); crayon(sh, C.red, { gap: 4, w: 7 }); ink(sh, 2.8);
  const pane = [];
  for (let r = 0; r < 4; r++) for (let c = 0; c < 2; c++) pane.push(poly([x - 36 + c * 38, gy - 210 + r * 40, x - 4 + c * 38, gy - 210 + r * 40, x - 4 + c * 38, gy - 176 + r * 40, x - 36 + c * 38, gy - 176 + r * 40], true));
  for (const p of pane) under(p, '#dfe6f2');
  ink(pane, 1.8);
  under(poly([x - 34, gy - 250, x + 34, gy - 250, x + 34, gy - 228, x - 34, gy - 228], true), C.white);
  ink(poly([x - 34, gy - 250, x + 34, gy - 250, x + 34, gy - 228, x - 34, gy - 228], true), 1.8);
}
function building(x, gy, w, h, col, seedN = 1) {
  const sh = poly([x, gy, x, gy - h, x + w, gy - h, x + w, gy], true);
  under(sh); crayon(sh, col, { gap: 5, w: 7, alpha: .7 }); ink(sh, 2.4);
  const win = [];
  for (let yy = gy - h + 24; yy < gy - 40; yy += 44) for (let xx = x + 16; xx < x + w - 24; xx += 34) if (hash(xx * 3 + yy + seedN) > .3) win.push(poly([xx, yy, xx + 18, yy, xx + 18, yy + 24, xx, yy + 24], true));
  for (const p of win) under(p, C.cream);
  ink(win, 1.6);
}
function tower(x, gy, h = 440) {
  const l = [];
  l.push(seg(x - 30, gy, x - 30, gy - h), seg(x + 30, gy, x + 30, gy - h));
  for (let y = gy; y > gy - h; y -= 50) l.push(seg(x - 30, y, x + 30, y - 50), seg(x + 30, y, x - 30, y - 50));
  for (let y = gy - 100; y > gy - h; y -= 120) l.push(seg(x - 30, y, x - 90, y));
  ink(l, 2.4, C.red);
}
function stoneIn(hx, hy, r) { const c = circ(hx, hy, r, r * .8); under(c); crayon(c, C.stone, { gap: 3, w: 4 }); ink(c, 2.2); }

// ============ 0 - 14.8 : trees -> standing up -> savanna -> stone tools ============
const HS = 1.6;
const WALK1 = [[6.1, 0], [6.5, 80], [7.2, 90], [7.8, 190], [11.0, 190], [11.4, 0]];
function heroX1(t) {
  if (t < 4.95) return 960;
  if (t < 5.5) return lerp(960, 1040, inv(4.95, 5.5, t));
  return 1040 + integ(t, WALK1);
}
const XT = 1040 + integ(99, WALK1);
const S1 = rigFor(.25).stride * 1.5;
const SPARK = { x: XT + 170, y: GROUND - 380 };
function camX1(t) { return t < 6.1 ? 540 + 580 * ease(inv(2.6, 6.1, t)) : heroX1(t) + 80; }
function bf1(t) {
  if (t < 1.6 || t > 13.6) return null;
  if (t < 2.6) {
    const u = inv(1.6, 2.6, t), a = u * TAU * 1.2;
    return { x: lerp(1250, 640 + Math.cos(a) * 90, easeOut(Math.min(1, u * 1.8))), y: 430 + Math.sin(a * 1.4) * 70 - Math.max(0, t - 2.3) * 300 };
  }
  if (t < 3.6) { const u = inv(2.6, 3.6, t); return { x: lerp(640, 1250, ease(u)), y: lerp(340, G_(-190), ease(u)) + Math.sin(u * 9) * 30 }; }
  if (t < 5.7) return { x: 1250 + Math.sin(t * 2) * 14, y: G_(-190) + Math.sin(t * 3) * 14 };
  if (t < 11.0) {
    const lead = heroX1(t) + 290, u = ease(inv(5.7, 6.8, t));
    return { x: lerp(1250, lead, u) + Math.sin(t * 2.3) * 40 * u, y: G_(-190) - 190 * u + Math.sin(t * 3.1) * (14 + 36 * u) };
  }
  const R = { x: XT + 100, y: G_(-62) };
  if (t < 11.5) { const u = ease(inv(11.0, 11.5, t)), L = heroX1(11.0) + 290 + Math.sin(11.0 * 2.3) * 40; return { x: lerp(L, R.x, u), y: lerp(G_(-380) + Math.sin(11 * 3.1) * 50, R.y, u) - Math.sin(u * Math.PI) * 40, slow: u > .9 }; }
  if (t < 12.5) return { x: R.x, y: R.y, slow: true };
  const u = inv(12.5, 13.6, t); return { x: R.x + easeIn(u) * 700, y: R.y - easeOut(u) * 520 + Math.sin(t * 9) * 20 };
}

function hero1(t, B) {
  const base = { evo: 0, s: HS };
  if (t < 2.95) {
    let sw = Math.sin(t * 2.2) * .12;
    if (t > 2.3) sw = lerp(sw, -.45, ease(inv(2.3, 2.65, t)));
    if (t > 2.65) sw = lerp(-.45, .75, ease(inv(2.65, 2.95, t)));
    const reach = t > 1.95 && t < 2.5 ? Math.sin(inv(1.95, 2.5, t) * Math.PI) : 0;
    hominin(GRIP1.x, GRIP1.y, t, { ...base, hang: true, swing: -sw, armA: [null, lerp(.3, 2.3, reach)], ...eyesTo(B, GRIP1.x + 40, GRIP1.y + 150), mouth: reach > .5 ? 'o' : null });
    return;
  }
  if (t < 3.3) {
    const u = inv(2.95, 3.3, t);
    hominin(lerp(GRIP1.x, GRIP2.x, u), lerp(GRIP1.y, GRIP2.y, u) - Math.sin(u * Math.PI) * 70, t, { ...base, hang: true, swing: -lerp(.75, -.25, u), armA: [null, 2.6], mouth: 'open', lx: 1, ly: -.3 });
    return;
  }
  if (t < 4.0) {
    const k = t - 3.3, sw = -.25 * Math.cos(k * 7) * Math.exp(-k * 2.5);
    hominin(GRIP2.x, GRIP2.y, t, { ...base, hang: true, swing: -sw, armA: [null, lerp(.3, 1.2, ease(inv(3.6, 3.95, t)))], ...eyesTo(B, GRIP2.x + 40, GRIP2.y + 150) });
    return;
  }
  if (t < 4.4) {
    const u = inv(4.0, 4.4, t);
    hominin(lerp(GRIP2.x + 10, 960, u), lerp(GRIP2.y + 200 * HS, GROUND, easeIn(u)), t, { ...base, rot: -u * TAU, armA: [2.6 + Math.sin(t * 40) * .4, 2.3 + Math.cos(t * 40) * .4], mouth: 'o', lx: 0, ly: -1 });
    return;
  }
  if (t < 4.95) {
    const sq = t < 4.52 ? 1 - Math.sin(inv(4.4, 4.52, t) * Math.PI) * .18 : 1;
    push(960, GROUND, 1, 0, sq); push(-960, -GROUND);
    hominin(960, GROUND, t, { ...base, hipH: 14, lean: .15, feet: [[36, 0], [26, 0]], hands: [[-26, -4], [-34, -4]], lx: Math.cos(t * 14), ly: Math.sin(t * 14), mouth: 'frown' });
    pop(); pop();
    stars(1000, GROUND - 172 * HS, t * 1.3);
    return;
  }
  if (t < 5.5) {
    hominin(heroX1(t), GROUND, t, { ...base, quad: 1, walk: (t - 4.95) * 2.2, lx: .9, ly: t > 5.25 ? -.8 : 0, look: t > 5.25 ? -.15 : 0 });
    return;
  }
  if (t < 6.1) {
    const q = 1 - ease(inv(5.5, 6.0, t));
    hominin(1040, GROUND, t, { ...base, quad: q, lx: .9, ly: -.4, eyeR: t > 5.8 ? .37 : .3, mouth: t > 5.8 ? 'o' : null });
    if (t > 5.8) bang(1120, G_(-250 * HS), 76);
    return;
  }
  if (t < 11.4) {
    const x = heroX1(t), e = t < 7.8 ? lerp(0, .12, inv(6.1, 7.8, t)) : lerp(.12, .45, inv(7.8, 11.0, t));
    const ph = (x - 1040) / (2 * S1 * HS), wob = t < 7.8 ? 1 : 1 - inv(7.8, 8.3, t);
    const sw = i => -Math.cos((ph + i * .5) * TAU) * .5;
    const armA = [lerp(sw(0), 1.9 + Math.sin(t * 7) * .25, wob), lerp(sw(1), 1.6 + Math.cos(t * 7) * .25, wob)];
    hominin(x, GROUND, t, { evo: e, s: HS, walk: ph, stride: S1 / rigFor(e).stride, armA, rot: Math.sin(t * 5.5) * .07 * wob, ...eyesTo(B, x + 50, G_(-190 * HS)) });
    return;
  }
  const o = toolPose(t);
  hominin(XT, GROUND, t, o);
}
const CT = [50, -84];
function toolPose(t) {
  const e = .45, r = rigFor(e), stand = (r.thigh + r.shin) * .93;
  const o = { evo: e, s: HS, lx: .8, ly: .5 };
  if (t < 11.9) { const u = ease(inv(11.4, 11.8, t)); Object.assign(o, { hipH: lerp(stand, 40, u), lean: lerp(r.lean, .9, u), hands: [[lerp(20, 60, u), lerp(-60, -8, u)], [lerp(10, 48, u), lerp(-60, -8, u)]], ly: 1 }); }
  else if (t < 12.2) { const u = ease(inv(11.9, 12.2, t)); Object.assign(o, { hipH: lerp(40, 48, u), lean: lerp(.9, .25, u), hands: [[lerp(60, CT[0] - 4, u), lerp(-8, CT[1] - 40, u)], [lerp(48, CT[0] + 4, u), lerp(-8, CT[1] + 8, u)]] }); }
  else if (t < 13.3) { const u = ((t - 12.1) / .4) % 1; Object.assign(o, { hipH: 48, lean: .25, hands: [[CT[0] - 4, CT[1] - 6 - 46 * Math.sin(u * Math.PI)], [CT[0] + 4, CT[1] + 8]], mouth: u < .2 ? 'o' : null, brow: -1 }); }
  else if (t < 13.9) { const u = ease(inv(13.3, 13.6, t)); Object.assign(o, { hipH: lerp(48, stand, u), lean: lerp(.25, r.lean, u), armA: [lerp(1.2, 2.9, u), .1], mouth: 'open', ly: -1, lx: .6 }); }
  else { const u = inv(13.9, 14.2, t); Object.assign(o, { hipH: lerp(stand, 52, ease(Math.min(1, u * 2))), lean: lerp(r.lean, .5, u), armA: [lerp(2.9, .9, easeIn(Math.min(1, u * 1.6))), .1], ly: -.6 }); }
  o.item = (i, hx, hy) => {
    if (t > 11.9 && t < 13.3) stoneIn(hx, hy + (i ? 6 : 0), i ? 15 : 11);
    else if (i === 0 && t >= 13.3) handaxe(hx + 4, hy - 22, -.2, .9);
  };
  return o;
}

function sceneOriginContent(t) {
  const B = bf1(t);
  let cx = camX1(t), cy = 540, z = 1;
  if (t > 14.2) { const u = easeIn(inv(14.2, 14.8, t)), v = Math.min(1, u * 1.6); z = Math.pow(14, u); cx = lerp(cx, SPARK.x, v); cy = lerp(540, SPARK.y, v); }
  camera(cx, cy, z);
  const vx = camX1(t);
  sun(vx - 540 + 880, 170, 42, { rays: easeOut(inv(6, 7.5, t)), spin: t * .15, arc: t < 6 });
  if (t > 7) { birds(vx - 540 + lerp(1200, 200, inv(7, 14, t)), 250, t); }
  // savanna, far
  if (vx > 900) {
    crayon(`M 1000 ${GROUND + 2} L 3000 ${GROUND + 2} L 3000 ${GROUND + 30} L 1000 ${GROUND + 26} Z`, C.tan, { gap: 5, w: 7, angle: -.1, alpha: .55 });
    ink(seg(1300, G_(-60), 3000, G_(-62)), 1.6);
    acacia(1560, G_(-60), .75, 2); acacia(2460, G_(-60), .6, 5);
    for (let k = 0; k < 3; k++) elephant(1580 + k * 130 + (k === 2 ? -40 : 0) + clamp(t - 7, 0, 8) * 22, G_(-60), t, { s: k === 2 ? .26 : .4, walk: t * .7 + k * .3 });
    acacia(2150, GROUND, 1.05, 9);
    const gx = 2330 - 30 * (clamp(t, 7, 11) - 7);
    giraffe(gx, GROUND - 4, t, { s: .95, dir: -1, walk: t < 11 ? t * .7 : 11 * .7 });
  }
  if (vx < 2100) jungle(t);
  groundLine(vx - 700, vx + 700);
  groundTexture(vx - 700, vx + 700);
  for (const [fx, fs] of [[330, 1], [700, .8], [1180, .9]]) flower(fx, GROUND + 4, fs, fx === 700 ? C.yellow : C.pink);
  for (const tx of [60, 260, 610, 880, 1500, 1720, 2020, 2290]) tuft(tx, GROUND + 26, 1.1);
  // footprints (the first upright steps)
  for (let k = 0; ; k++) {
    const fx = 1040 + k * S1 * HS + S1 * HS * .5;
    if (fx > Math.min(heroX1(t) - 10, XT - 40)) break;
    footprint(fx, GROUND + 14 + (k % 2 ? 6 : -2), .9);
  }
  rock(XT + 100, GROUND + 4, 36, 4); pebble(XT + 170, GROUND + 22, 12); pebble(XT - 100, GROUND + 26, 9);
  hero1(t, B);
  tallGrass(1070, 1420, GROUND, 140, 3);
  if (B) butterfly(B.x, B.y, t, { s: 1.1, speed: B.slow ? 5 : 15 });
  // knapping sparks
  for (const [k, ts] of [[1, 12.5], [2, 12.9], [3, 13.3]]) {
    const [wx, wy] = toWorld(XT, GROUND, HS, 1, [CT[0], CT[1] + 2]);
    sparks(wx, wy, inv(ts, ts + .35, t), 9, 80, k);
    if (t > ts && t < ts + .1) burst(wx, wy, 22);
  }
  if (t > 13.45 && t < 13.95) { const J = pose(toolPose(t)), [hx, hy] = toWorld(XT, GROUND, HS, 1, J.hands[0]); burst(hx + 6, hy - 40, 26 + 6 * Math.sin(t * 20)); sparks(hx + 6, hy - 40, inv(13.45, 13.95, t), 10, 90, 7); }
  if (t > 13.95) {
    const u = easeOut(inv(13.95, 14.2, t));
    const x = lerp(XT + 95, SPARK.x, u), y = lerp(G_(-70), SPARK.y, u) - Math.sin(u * Math.PI) * 60;
    const r = lerp(8, 26, u) * (1 + .15 * Math.sin(t * 30));
    burst(x, y, r, t > 14.4 ? C.orange : C.yellow);
    if (t > 14.35) crayon(circ(x, y, r * 3 * inv(14.35, 14.8, t)), C.orange, { gap: 3, w: 4, alpha: .8 });
  }
  screen();
  if (t > 14.55) crayon('M -60 -60 L 1140 -60 L 1140 1140 L -60 1140 Z', C.orange, { gap: 6, w: 10, alpha: inv(14.55, 14.8, t) * .95, base: C.yellow, baseAlpha: inv(14.6, 14.8, t) * .9 });
}

// ============ 14.8 - 22.6 : fire ============
const FIRE_X = 540, FS = 1.5;
function heroFire(t) {
  const e = .66, r = rigFor(e), stand = (r.thigh + r.shin) * .93;
  let x = 300; const o = { evo: e, s: FS, lx: .8, ly: .4 };
  if (t < 19.1) {
    const poke = t > 16.2 && t < 16.9 ? Math.sin(inv(16.2, 16.9, t) * TAU * 2) * 8 : 0;
    Object.assign(o, { hipH: 30, lean: .12, feet: [[44, 0], [34, 0]], hands: [[58 + poke, -62], [40, -40]] });
    if (t > 18.0) Object.assign(o, { lx: 1, ly: 0, eyeR: .37, mouth: 'o' });
  } else if (t < 19.5) {
    const u = ease(inv(19.1, 19.5, t));
    Object.assign(o, { hipH: lerp(30, stand, u), lean: lerp(.12, 0, u), feet: [[lerp(44, 8, u), 0], [lerp(34, -8, u), 0]], hands: [[lerp(58, 46, u), lerp(-62, -140, u)], null], lx: 1, eyeR: .34 });
  } else if (t < 20.4) {
    const u = inv(19.5, 20.1, t);
    x = lerp(300, 420, ease(u));
    Object.assign(o, { walk: u < 1 ? u * 1.4 : null, armA: [lerp(2.4, 1.7, ease(u)) + (t > 19.9 ? Math.sin(t * 16) * .18 : 0), .3], lx: 1, brow: -1, mouth: 'open' });
  } else {
    x = 420;
    Object.assign(o, { armA: [lerp(1.7, 2.9, ease(inv(20.4, 20.8, t))), .2], mouth: 'open', lx: .8, ly: -.5 });
  }
  o.item = (i, hx, hy, J) => {
    if (i !== 0) return;
    if (t < 19.1) {
      const tip = [(FIRE_X - 30 - x) / FS, -24 / FS];
      crayonLine(seg(hx - 14, hy + 4, tip[0], tip[1]), C.brown, 7, { passes: 1 }); ink(seg(hx - 14, hy + 4, tip[0], tip[1]), 1.6);
    } else {
      const dx = hx - J.sh[0], dy = hy - J.sh[1], d = Math.hypot(dx, dy) || 1, tx = hx + dx / d * 62, ty = hy + dy / d * 62;
      crayonLine(seg(hx - dx / d * 16, hy - dy / d * 16, tx, ty), C.brown, 8, { passes: 1 }); ink(seg(hx - dx / d * 16, hy - dy / d * 16, tx, ty), 1.6);
      torchFlame(tx, ty + 6, t, 1);
    }
  };
  return { x, o };
}
function kidFire(t, heroX) {
  let x = 780, dir = -1, y = GROUND;
  const o = { kid: true, evo: 1, outfit: 'hide', s: FS, lx: .8, ly: .3, curl: true };
  if (t < 19.0) Object.assign(o, { hipH: 20, lean: .1, feet: [[30, 0], [22, 0]], hands: [[38 + Math.sin(t * 4) * 3, -54], [34, -50]], blink: t > 16.0 && t < 17.0 ? 1 : 0 });
  else if (t < 19.15) { y = GROUND - Math.sin(inv(19.0, 19.15, t) * Math.PI) * 60; Object.assign(o, { eyeR: .38, mouth: 'o', armA: [2.8, 2.6] }); }
  else if (t < 19.75) { const u = inv(19.15, 19.75, t); x = lerp(780, 200, u); y = GROUND + 36; Object.assign(o, { walk: u * 4, stride: 1.8, armA: [2.6 + Math.sin(t * 30) * .3, 2.4 - Math.sin(t * 30) * .3], mouth: 'o', eyeR: .36, lx: 1 }); }
  else if (t < 20.9) { x = 210; dir = 1; Object.assign(o, { shiver: true, lx: 1, ly: 0, eyeR: .34, mouth: 'frown' }); }
  else { const u = ease(inv(20.9, 21.3, t)); x = lerp(210, heroX - 70, u); dir = 1; Object.assign(o, { armA: [1.6, 1.4], mouth: 'open', blink: t > 21.6 && t < 22.2 ? 1 : 0 }); }
  return { x, y, dir, o };
}
function sabreFire(t) {
  if (t < 18.4 || t > 21.2) return null;
  if (t < 19.0) { const u = inv(18.4, 19.0, t); return { x: lerp(1130, 930, u), o: { s: 1.05, dir: -1, walk: u * 1.2, crouch: .5, glare: true } }; }
  if (t < 19.8) { const u = inv(19.0, 19.8, t); return { x: 930, o: { s: 1.05, dir: -1, jaw: Math.sin(u * Math.PI) * 1.1, crouch: .2, glare: true, look: -.1 }, roarU: u }; }
  if (t < 20.4) return { x: 930 + (t - 19.8) * 40, o: { s: 1.05, dir: -1, scared: true, crouch: .4, lx: -1 } };
  const u = inv(20.4, 21.2, t);
  return { x: 954 + easeIn(u) * 760, o: { s: 1.05, dir: 1, walk: u * 3.5, scared: true, lx: 1 }, flee: true };
}
function sceneFireContent(t) {
  let z = 1, cx = 540, cy = 540;
  if (t < 15.9) { const u = ease(inv(14.8, 15.9, t)); z = Math.pow(12, 1 - u); cy = lerp(GROUND - 90, 540, u); }
  OFF_X = t > 19.0 && t < 19.5 ? Math.sin(t * 90) * 7 : 0;
  camera(cx, cy, z);
  nightSky(t);
  skyStars(t, 24, 520);
  moon(170, 170, 56, { line: C.cream });
  crayon(`M -60 ${GROUND} L 1140 ${GROUND} L 1140 1140 L -60 1140 Z`, '#1b1f3f', { gap: 5, w: 8, angle: -.1, alpha: .9, base: '#1b1f3f', baseAlpha: .9 });
  ink(seg(-60, GROUND, 1140, GROUND), 3, C.cream);
  const f = Math.sin(t * 9) * 10;
  glow(FIRE_X, GROUND - 80, 390 + f, C.orange, .26);
  glow(FIRE_X, GROUND - 60, 230 + f, C.yellow, .2);
  bush(990, GROUND - 42, 72, '#2f6b45'); bush(1090, GROUND - 30, 60, '#2f6b45');
  if (t > 17.4 && t < 18.45) {
    const bl = t > 17.9 && t < 18.0;
    for (const [ex, ey] of [[975, G_(-92)], [1015, G_(-94)]]) {
      if (bl) { ink(seg(ex - 10, ey, ex + 10, ey), 2.4, C.yellow); continue; }
      const e = circ(ex, ey, 11, 7 * easeOut(inv(17.4, 17.6, t)) + .5);
      under(e, C.yellow); dot(ex - 3, ey, 3); ink(e, 2, C.gold);
    }
  }
  const log = tube([200, GROUND - 22, 400, GROUND - 24], 46, 44);
  under(log); crayon(log, C.brown, { gap: 4, w: 6 }); ink(log, 2.4); ink(circ(400, GROUND - 24, 17), 1.8);
  const H = heroFire(t), K = kidFire(t, H.x), S = sabreFire(t);
  if (S) {
    sabre(S.x, GROUND, t, S.o);
    const hx = S.x + 150 * 1.05 * S.o.dir, hy = GROUND - 160;
    if (S.roarU != null) roar(hx - 60, hy, S.roarU, -1, 4);
    if (S.flee) speedLines(S.x - 150, GROUND - 90, 5, 160, 24, -1);
    if (S.o.scared && !S.flee) shake(hx, hy - 20, 70, 7, 0, TAU, 16);
  }
  const kidBehind = t > 19.7;
  if (kidBehind) hominin(K.x, K.y, t, { ...K.o, dir: K.dir });
  hominin(H.x, GROUND, t, H.o);
  campfire(FIRE_X, GROUND, t);
  if (!kidBehind) hominin(K.x, K.y, t, { ...K.o, dir: K.dir });
  if (t > 18.05 && t < 18.6) bang(H.x + 40, G_(-300), 70, C.cream);
  if (t > 19.0 && t < 19.4) bang(K.x, G_(-250), 60, C.cream);
  if (t > 19.9 && t < 20.5) {
    const J = pose(H.o), [hx, hy] = toWorld(H.x, GROUND, FS, 1, J.hands[0]);
    sparks(hx + 50, hy - 40, inv(19.9, 20.5, t), 12, 140, 5);
  }
  if (t > 21.8) flakes(t, Math.floor(lerp(4, 60, inv(21.8, 22.6, t))), -30, 60, C.white, 2, 7);
  OFF_X = 0;
  screen();
  if (t > 22.3) crayon('M -60 -60 L 1140 -60 L 1140 1140 L -60 1140 Z', C.white, { gap: 5, w: 10, alpha: inv(22.3, 22.6, t) * .95, base: C.white, baseAlpha: inv(22.35, 22.6, t) });
}

// ============ 22.6 - 30.6 : ice age ============
const WALK3 = [[22.6, 110], [25.6, 110], [26.3, 30], [26.45, 0], [29.4, 0], [29.8, 130]];
function heroX3(t) { return 300 + integ(t, WALK3); }
const CAVE = { x: 1090, mx: 1115, my: GROUND - 70 };
function storm3(t) { return t < 25.6 ? 0 : t < 26.4 ? inv(25.6, 26.4, t) : t < 28.6 ? 1 : 1 - inv(28.6, 29.3, t); }
function fire3(t) {
  if (t < 26.7) return 0;
  if (t < 27.0) return .55 * inv(26.7, 27.0, t);
  if (t < 28.6) return lerp(.55, .16, inv(27.0, 28.2, t)) * (1 + .15 * Math.sin(t * 17));
  return lerp(.16, .65, ease(inv(28.6, 29.2, t)));
}
function sceneIceContent(t) {
  const x = heroX3(t), st = storm3(t);
  let cx = Math.min(x + 100, 800), cy = 540, z = 1;
  if (t > 29.9) { const u = easeIn(inv(29.9, 30.6, t)), v = Math.min(1, u * 1.4); z = Math.pow(8, u); cx = lerp(cx, CAVE.mx, v); cy = lerp(540, CAVE.my, v); }
  camera(cx, cy, z);
  crayon('M -400 -60 L 1600 -60 L 1600 520 L -400 520 Z', C.sky, { gap: 8, w: 8, alpha: .3, angle: -.1 });
  if (t > 28.7) sun(cx - 540 + 230, lerp(330, 190, easeOut(inv(28.7, 29.6, t))), 44, { rays: easeOut(inv(28.9, 29.6, t)), spin: t * .2 });
  snowHills(-400, 1700, G_(-70), 2);
  if (st < .8) for (let k = 0; k < 3; k++) mammoth(1060 + k * 230 - 120 * (t - 22.6), G_(-70), t, { s: k === 1 ? .36 : .5, dir: -1, walk: t * 1.1 + k * .3 });
  for (const [px, ph] of [[60, 240], [480, 190], [1000, 230], [1600, 250]]) pine(px, G_(-40), ph);
  caveHill(CAVE.x, GROUND);
  crayon(`M -400 ${GROUND} L 1700 ${GROUND} L 1700 1200 L -400 1200 Z`, C.white, { gap: 6, w: 8, alpha: .9, base: C.snow, baseAlpha: .9 });
  crayon(`M -400 ${GROUND + 30} L 1700 ${GROUND + 34} L 1700 ${GROUND + 50} L -400 ${GROUND + 46} Z`, C.sky, { gap: 5, w: 6, alpha: .4, angle: -.05 });
  groundLine(-400, 1700);
  for (let k = 0; ; k++) { const fx = 330 + k * 46; if (fx > Math.min(x - 20, 700)) break; footprint(fx, GROUND + 16 + (k % 2 ? 6 : -2), .85); }
  rock(900, GROUND + 4, 90, 6);
  if (st > 0) {
    crayon('M -400 -60 L 1700 -60 L 1700 1200 L -400 1200 Z', C.grey, { gap: 6, w: 9, alpha: .28 * st, angle: -.1 });
    crayon('M -400 -60 L 1700 -60 L 1700 1200 L -400 1200 Z', C.white, { gap: 5, w: 9, alpha: .4 * st, angle: .3, base: C.white, baseAlpha: .22 * st });
  }
  const e = .82, s = 1.4, S = rigFor(e).stride;
  const lean = t < 25.6 ? 0 : lerp(0, .3, inv(25.6, 26.0, t));
  const spear = (i, hx, hy) => { if (i !== 0) return; ink(seg(hx, hy + 70, hx + 6, hy - 120), 4, C.brown); const tip = poly([hx - 2, hy - 116, hx + 7, hy - 150, hx + 14, hy - 114], true); under(tip); crayon(tip, C.stone, { gap: 3, w: 3 }); ink(tip, 2); };
  const fs = fire3(t);
  if (t < 26.45) {
    const ph = (x - 300) / (2 * S * s), kx = x - 170;
    hominin(kx, GROUND, t, { kid: true, evo: 1, outfit: 'hide', s, walk: (kx - 160) / (2 * 16 * s * 1.3), stride: 1.3, lean, lx: 1, blink: st > .5 ? 1 : 0, curl: true });
    hominin(x, GROUND, t, { evo: e, s, walk: ph, lean, armA: [.5, null], item: spear, lx: 1, ly: -.1, blink: st > .5 ? 1 : 0 });
  } else if (t < 29.4) {
    const up = t > 28.7, shiv = fs < .35 && t > 27.3;
    campfire(790, GROUND, t, { s: .65, size: fs });
    if (fs > .05) glow(790, GROUND - 40, 190 * fs + 40, C.orange, .25);
    hominin(585, GROUND, t, { kid: true, evo: 1, outfit: 'hide', s, hipH: 14, lean: .1, feet: [[26, 0], [18, 0]], hands: [[30, -40], [26, -36]], shiver: shiv, lx: up ? .3 : .9, ly: up ? -1 : .5, mouth: up ? 'open' : 'frown', curl: true });
    hominin(690, GROUND, t, { evo: e, s, hipH: 18, lean: .15, feet: [[40, 0], [30, 0]], hands: [[50, -46], [44, -40]], shiver: shiv, lx: up ? .3 : .9, ly: up ? -1 : .5, mouth: up ? 'open' : 'frown', item: (i, hx, hy) => { if (i === 0) ink(seg(hx - 90, hy + 40, hx - 30, hy - 150), 4, C.brown); } });
  } else {
    const u = ease(inv(29.4, 29.7, t)), r = rigFor(e);
    const ph = Math.max(0, x - 681) / (2 * S * s), kx = 585 + Math.max(0, x - 700);
    hominin(kx, GROUND, t, { kid: true, evo: 1, outfit: 'hide', s, hipH: lerp(14, 38, u), walk: t > 29.7 ? (kx - 585) / 50 : null, lx: 1, curl: true });
    hominin(x, GROUND, t, { evo: e, s, hipH: lerp(18, (r.thigh + r.shin) * .93, u), walk: t > 29.7 ? ph : null, armA: [.5, null], item: spear, lx: 1, mouth: 'open' });
    campfire(790, GROUND, t, { s: .65, size: fs * (1 - inv(29.6, 30.0, t)) });
  }
  if (st > 0) crayon('M -400 -60 L 1700 -60 L 1700 1200 L -400 1200 Z', C.white, { gap: 6, w: 9, alpha: .14 * st, angle: .2 });
  flakes(t, Math.floor(40 + 150 * st), lerp(-40, -900, st), 70 + 120 * st, st > .3 ? C.grey : C.sky, 3, 6);
  screen();
  if (t < 23.0) crayon('M -60 -60 L 1140 -60 L 1140 1140 L -60 1140 Z', C.white, { gap: 5, w: 10, alpha: (1 - inv(22.6, 23.0, t)) * .95, base: C.white, baseAlpha: 1 - inv(22.6, 22.9, t) });
  if (t > 30.35) crayon('M -60 -60 L 1140 -60 L 1140 1140 L -60 1140 Z', C.black, { gap: 5, w: 10, alpha: inv(30.35, 30.6, t), base: '#2a2420', baseAlpha: inv(30.4, 30.6, t) });
}

// ============ 30.6 - 36.4 : cave art ============
const STN = { x: 330, y: 560, s: .45 };
const PAINT = { x: 420, y: 660, s: .88 };
const PSUN = { x: 800, y: 590, r: 34 };
const CHAR = '#2b2522';
function paintSun(u) {
  if (u <= 0) return;
  const rays = [];
  for (let k = 0; k < 9; k++) { const a = k / 9 * TAU; rays.push(seg(PSUN.x + Math.cos(a) * 42, PSUN.y + Math.sin(a) * 42, PSUN.x + Math.cos(a) * 62, PSUN.y + Math.sin(a) * 62)); }
  if (u > .4) crayon(circ(PSUN.x, PSUN.y, PSUN.r), C.ochre, { gap: 4, w: 6, alpha: .85 * inv(.4, .8, u) });
  inkReveal([circ(PSUN.x, PSUN.y, PSUN.r), ...rays], u, 6, C.ochre);
}
function sceneCaveContent(t) {
  let cx = 540, cy = 540, z = 1;
  if (t > 31.2 && t < 33.3) { const u = ease(inv(31.2, 31.7, t)) * (1 - ease(inv(32.9, 33.3, t))); z = lerp(1, 3.4, u); cx = lerp(540, STN.x + 20, u); cy = lerp(540, STN.y - 30, u); }
  if (t > 35.6) { const u = easeIn(inv(35.6, 36.4, t)), v = Math.min(1, u * 1.4); z = Math.pow(8, u); cx = lerp(540, PSUN.x, v); cy = lerp(540, PSUN.y, v); }
  camera(cx, cy, z);
  const L = t < 30.75 ? 1 : lerp(1, 560, easeOut(inv(30.75, 31.2, t)));
  caveWall(t, 470, 540, L);
  crayon(`M -60 ${GROUND} L 1140 ${GROUND} L 1140 1140 L -60 1140 Z`, '#3a2a20', { gap: 5, w: 8, alpha: .9, base: '#3a2a20', baseAlpha: .9 });
  ink(seg(-60, GROUND, 1140, GROUND), 3, C.cream);
  // wall torch
  ink(seg(110, 520, 140, 440), 7, C.brown);
  if (t > 30.7) torchFlame(142, 444, t, 1.2);
  if (t > 30.68 && t < 30.85) burst(140, 440, 24);
  // hand stencils
  stencil(STN.x, STN.y, inv(32.0, 32.6, t), STN.s, -.15, 3);
  stencil(880, 712, inv(34.3, 34.8, t), .3, .25, 7);
  // the painter's hand in close-up
  if (t > 31.45 && t < 32.95) {
    const lift = easeIn(inv(32.6, 32.95, t));
    push(lift * 90, -lift * 240);
    const hp = handPath(STN.x, STN.y, STN.s, -.15);
    for (const p of hp) under(p, C.skin);
    crayon(hp, C.skin, { gap: 3, w: 4, amp: .8 }); crayon(hp, C.belly, { gap: 5, w: 3, alpha: .3 });
    ink(hp, 1.6);
    pop();
    if (t > 32.0 && t < 32.6) {
      const u = (t * 4) % 1, out = [];
      for (let k = 0; k < 3; k++) out.push(circ(STN.x - 80 + u * 40, STN.y - 20 + k * 14 - 14, 8 + u * 8, 5 + u * 5, -1, 1));
      ink(out, 1.4, C.cream);
    }
  }
  // the painting
  const pu = inv(33.4, 34.6, t);
  push(PAINT.x, PAINT.y, PAINT.s);
  const tip = inkReveal(CAVE_MAMMOTH, pu, 8, CHAR);
  const tip2 = inkReveal(caveFigures(), inv(34.6, 35.0, t), 7, CHAR);
  pop();
  paintSun(inv(35.0, 35.4, t));
  // characters
  const e = .86, s = 1.45;
  let hx = 130, hand0 = null, walk = null, mouth = null, lx = .8, ly = 0, hdir = 1;
  if (t > 33.0 && t < 33.4) { const u = inv(33.0, 33.4, t); hx = lerp(130, 360, ease(u)); walk = u * 2.6; }
  else if (t >= 33.4 && t < 35.0) {
    hx = lerp(340, 560, ease(inv(33.4, 34.9, t)));
    const tp = t < 34.6 ? tip : tip2;
    hand0 = [(PAINT.x + tp[0] * PAINT.s - hx) / s, (PAINT.y + tp[1] * PAINT.s - GROUND) / s];
    lx = 1; ly = -.4;
  } else if (t >= 35.0 && t < 35.4) {
    hx = lerp(560, 650, ease(inv(34.9, 35.2, t)));
    const a = inv(35.0, 35.4, t) * TAU;
    hand0 = [(PSUN.x + Math.cos(a) * 30 - hx) / s, (PSUN.y + Math.sin(a) * 30 - GROUND) / s]; lx = 1; ly = -.6;
  } else if (t >= 35.4) { const u = inv(35.4, 35.9, t); hx = lerp(650, 250, ease(u)); mouth = 'open'; lx = 1; ly = -.5; walk = u < 1 ? u * 2.4 : null; hdir = u < 1 ? -1 : 1; }
  if (t > 31.9 && t < 32.6) mouth = 'o';
  hominin(hx, GROUND, t, { evo: e, s, dir: hdir, outfit: 'hide', hands: [hand0, null], walk, lx, ly, mouth, item: (i, x0, y0) => { if (i === 0 && hand0) { ink(seg(x0, y0, x0 + 8, y0 - 22), 5, CHAR); } } });
  if (t > 33.8) {
    const u = inv(33.8, 34.25, t), kx = lerp(1180, 930, ease(u));
    const reach = t > 34.25 && t < 34.9;
    hominin(kx, GROUND, t, { kid: true, evo: 1, outfit: 'hide', s, dir: -1, curl: true, walk: u < 1 ? u * 3 : null, hands: [reach ? [(880 - kx) / (s * -1), (712 - GROUND) / s] : null, null], lx: .9, ly: reach ? -.5 : -.2, mouth: t > 35.0 ? 'open' : null });
  }
  screen();
}

// ============ 36.4 - 46.3 : the fast march ============
const WALK5 = [[36.9, 0], [37.2, 250], [44.0, 250], [44.4, 0]];
function heroX5(t) { return 400 + integ(t, WALK5); }
const OCC = [930, 1480, 2030];
const ROCKET_X = 2560;
function rocketLift(t) { return 2300 * easeIn(inv(45.5, 46.3, t)); }
function sceneMarchContent(t) {
  const x = heroX5(t), s = 1.4;
  let cx = x + 80, cy = 540, z = 1;
  const base = cx;
  if (t < 36.9) { const u = ease(inv(36.4, 36.9, t)); z = Math.pow(8, 1 - u); cx = lerp(base + 280, base, u); cy = lerp(200, 540, u); }
  if (t > 45.5) cy = 540 - .66 * rocketLift(t);
  camera(cx, cy, z);
  // space above (seen when the camera tilts up)
  if (t > 45.4) {
    crayon(`M ${base - 700} -2000 L ${base + 700} -2000 L ${base + 700} -250 C ${base + 300} -200, ${base - 300} -300, ${base - 700} -240 Z`, '#15172e', { gap: 5, w: 9, alpha: .92, cross: true, base: '#15172e', baseAlpha: .9 });
    const st = []; for (let i = 0; i < 30; i++) { const sx = base - 600 + hash(i * 7) * 1200, sy = -1900 + hash(i * 13) * 1500, r = 5 + 3 * Math.sin(t * 3 + i); st.push(seg(sx - r, sy, sx + r, sy), seg(sx, sy - r, sx, sy + r)); } ink(st, 2, C.cream);
  }
  sun(base - 540 + 820, 200, 50, { rays: 1, spin: t * .2 });
  birds(base - 540 + lerp(1100, 100, inv(36.4, 46, t)), 280, t, 2);
  // farm
  if (base < 1500) {
    hut(650, GROUND - 6, .9);
    for (let wx = 250; wx < 910; wx += 24) wheat(wx, GROUND + 4, 110 * easeOut(clamp((x - wx) / 140)), t, wx);
  }
  // egypt
  if (base > 500 && base < 2100) {
    crayon(`M 930 ${GROUND + 2} L 1480 ${GROUND + 2} L 1480 ${GROUND + 34} L 930 ${GROUND + 30} Z`, C.yellow, { gap: 5, w: 7, angle: -.1, alpha: .6 });
    pyramid(1140, GROUND - 2, 380, 250); pyramid(1350, GROUND - 2, 260, 170);
    palm(1020, GROUND, 230, t); palm(1260, GROUND, 180, t);
  }
  // harbour
  if (base > 1000 && base < 2700) {
    crayon(`M 1480 ${G_(-110)} L 2040 ${G_(-110)} L 2040 ${G_(-10)} L 1480 ${G_(-10)} Z`, C.blue, { gap: 6, w: 8, alpha: .5, angle: -.05 });
    waves(1480, 1990, G_(-90), t); waves(1500, 2000, G_(-40), t + 1);
    ship(1700 + 30 * (t - 40), G_(-70), t, .8);
  }
  // modern
  if (base > 1500) {
    building(2080, GROUND, 120, 300, C.sky, 1); building(2210, GROUND, 90, 220, C.pink, 2); building(2310, GROUND, 110, 360, C.gold, 3);
    crayon(`M 2030 ${GROUND + 2} L 3200 ${GROUND + 2} L 3200 ${GROUND + 40} L 2030 ${GROUND + 36} Z`, C.grey, { gap: 5, w: 7, angle: -.1, alpha: .5 });
    lamp(2150, GROUND, easeOut(inv(43.8, 44.1, t)));
    tower(ROCKET_X + 90, GROUND);
    const lift = rocketLift(t);
    if (t > 45.25) smoke(ROCKET_X, GROUND, inv(45.25, 46.2, t), 8, 3);
    rocket(ROCKET_X, GROUND - 4 - lift, t, { s: 1, flame: t > 45.3 ? lerp(.3, 1, inv(45.3, 45.6, t)) : 0 });
    if (t > 45.25 && t < 45.6) shake(ROCKET_X, GROUND - 60, 90, 8, Math.PI, TAU, 18);
    for (const [ts, n] of [[44.6, '3'], [44.85, '2'], [45.1, '1']]) if (t > ts && t < ts + .25) hand(n, ROCKET_X - 150, G_(-380), 80);
  }
  groundLine(base - 700, base + 700);
  groundTexture(base - 700, base + 700, GROUND, 9);
  for (const tx of [150, 470, 1100, 1650, 1900]) tuft(tx, GROUND + 26, 1.1);
  // dog
  const walking = t > 36.9 && t < 44.4;
  if (t > 37.3) {
    const dx = x - 175 - Math.max(0, 1 - (t - 37.3) / .8) * 700;
    dog(dx, GROUND + 8, t, { s: 1.35, walk: walking || t < 38.1 ? t * 3.2 : null, bark: t > 38.0 && t < 38.3, tongue: true });
    if (t > 38.0 && t < 38.3) hand('woof!', dx + 90, G_(-110), 36);
  }
  // hero
  const fit = x < OCC[0] ? 'hide' : x < OCC[1] ? 'robe' : x < OCC[2] ? 'coat' : 'modern';
  const e = .95, S = rigFor(e).stride * 1.6, ph = (x - 400) / (2 * S * s);
  const o = { evo: e, s, outfit: fit, walk: walking ? ph : null, stride: 1.6, lx: .8, ly: 0 };
  const cartX = x + 150;
  if (fit === 'hide') o.armA = [null, 1.2 + Math.sin(t * 8) * .45];
  if (fit === 'robe') o.hands = [[(cartX - 120 * 1.1 - x) / s, -80 * 1.1 / s], [(cartX - 116 * 1.1 - x) / s, -76 * 1.1 / s]];
  if (fit === 'coat' && t > 41.9 && t < 42.9) { o.armA = [2.6 + Math.sin(t * 14) * .3, null]; o.lx = .4; o.ly = -.3; o.mouth = 'open'; }
  if (fit === 'modern' && t > 43.9 && t < 44.4) { o.ly = -1; o.eyeR = .36; o.mouth = 'o'; }
  if (t > 44.4) { o.lx = 1; o.ly = t > 45.4 ? -1 : -.5; o.mouth = t > 45.3 ? 'open' : null; o.eyeR = t > 45.3 ? .37 : .3; }
  hominin(x, GROUND, t, o);
  if (fit === 'hide' && walking) for (let k = 0; k < 3; k++) { const u = (t * 2 + k / 3) % 1; dot(x - 36 + u * 20 + k * 8, G_(-150) + u * 140, 3.4, C.gold); }
  if (fit === 'robe') cart(cartX, GROUND, cartX / 46, 1.1);
  // curtains: the hero changes clothes behind these
  bush(OCC[0], GROUND - 90, 105, C.green); bush(OCC[0] + 70, GROUND - 40, 70, C.lime);
  obelisk(OCC[1], GROUND);
  phoneBox(OCC[2], GROUND);
  if (t > 43.9 && t < 44.9) car(lerp(1850, 2800, inv(43.9, 44.9, t)), GROUND + 60, t, 1, t * 12);
  screen();
}

// ============ 46.3 - 47.4 : one small step ============
function moonPrint(x, y) {
  push(x, y, .62, 0, .5);
  const sole = 'M -120 0 C -120 -44, 110 -50, 124 0 C 110 44, -120 44, -120 0 Z';
  crayon(sole, C.dark, { gap: 4, w: 6, alpha: .6 }); ink(sole, 2.6);
  const r = []; for (let k = -5; k <= 5; k++) r.push(seg(k * 20, -34, k * 20, 34)); ink(r, 3, C.paper);
  pop();
}
function sceneMoonContent(t) {
  camera(540, 540, 1);
  nightSky(t, '#15172e');
  skyStars(t, 40, 640);
  earth(820, 220, 76);
  moonGround(700);
  const bx = 480, down = easeOut(inv(46.35, 46.55, t)), up = easeIn(inv(46.9, 47.2, t));
  if (t > 46.55) moonPrint(bx, 800);
  if (t > 46.55) puff(bx, 800, inv(46.55, 47.0, t), 6, 26);
  boot(bx - 10, lerp(-220, 800, down) - up * 1200, 1.1);
  screen();
}

// ============ 47.4 - 54.8 : today ============
const WALK6 = [[47.7, 0], [48.0, 55], [49.4, 55], [49.55, 0]];
function kidX6(t) { return 420 + integ(t, WALK6); }
const KS = 1.6;
function kidPose6(t) {
  const r = rigFor(1, true), stand = (r.thigh + r.shin) * .93;
  const o = { kid: true, evo: 1, s: KS, curl: true, lx: .8, ly: 0 };
  if (t < 47.7) { const u = inv(47.4, 47.65, t); Object.assign(o, { feet: [[lerp(-8, 12, u), -Math.sin(u * Math.PI) * 14], null], armA: [1.7, 1.9], mouth: 'o', ly: .6 }); }
  else if (t < 49.55) { Object.assign(o, { walk: (kidX6(t) - 420) / (2 * r.stride * KS * .9), stride: .9, armA: [1.7 + Math.sin(t * 6) * .25, 1.9 + Math.cos(t * 6) * .25], rot: Math.sin(t * 6) * .08, mouth: 'open', lx: 1 }); }
  else if (t < 49.75) { const u = ease(inv(49.55, 49.72, t)); Object.assign(o, { hipH: lerp(stand, 12, u), lean: .1 * u, feet: [[lerp(8, 26, u), 0], [lerp(-8, 18, u), 0]], armA: [2.2, 2.4], mouth: 'o' }); }
  else if (t < 50.9) { Object.assign(o, { hipH: 12, lean: .1, feet: [[26, 0], [18, 0]], hands: [[-14, -4], [-20, -4]], mouth: t < 50.35 ? 'open' : 'o', blink: t > 49.9 && t < 50.3 ? 1 : 0 }); }
  else if (t < 51.45) { const u = ease(inv(50.9, 51.4, t)); Object.assign(o, { hipH: lerp(12, stand, u), quad: Math.sin(u * Math.PI) * .6, feet: [[lerp(26, 8, u), 0], [lerp(18, -8, u), 0]], ly: -.6 }); }
  else if (t < 53.3) { Object.assign(o, { armA: [lerp(0, 2.75, ease(inv(51.45, 51.8, t))), .3], eyeR: t > 52.0 ? .37 : .32, mouth: 'open', ly: -1, lx: .6 }); }
  else Object.assign(o, { armA: [2.5 + Math.sin(t * 9) * .3, .3], mouth: 'open', lx: -.6, ly: -1 });
  return o;
}
function bf6(t, KH) {
  if (t < 50.2 || t > 55.8) return null;
  if (t < 51.4) { const u = inv(50.2, 51.4, t); return { x: lerp(-60, 600, easeOut(u)) + Math.sin(t * 5) * 20, y: lerp(420, G_(-380), u) + Math.sin(t * 7) * 25 }; }
  if (t < 52.05) { const u = ease(inv(51.4, 52.05, t)); return { x: lerp(600 + Math.sin(51.4 * 5) * 20, KH[0], u), y: lerp(G_(-380) + Math.sin(51.4 * 7) * 25, KH[1] - 14, u) - Math.sin(u * Math.PI) * 30 }; }
  if (t < 53.3) return { x: KH[0], y: KH[1] - 14, slow: true };
  const u = inv(53.3, 55.8, t);
  return { x: lerp(KH[0], 120, u) + Math.sin(t * 4) * 40 * u, y: lerp(KH[1] - 14, -160, easeIn(u)) + Math.sin(t * 6) * 20 * u };
}
function sceneTodayContent(t) {
  let cx = 540, cy = 540, z = 1;
  if (t < 48.5) { const u = ease(inv(47.7, 48.5, t)); z = lerp(2.6, 1, u); cx = lerp(463, 540, u); cy = lerp(750, 540, u); }
  camera(cx, cy, z);
  sun(870, 170, 46, { rays: 1, spin: t * .2 });
  trunk(150, GROUND, 150, 96, 6);
  bough(180, 350, 660, 330, 30);
  foliage(160, 150, 330, 170, 3);
  foliage(620, 110, 260, 140, 8, mix(C.green, C.teal, .3));
  groundLine(-200, 1300);
  groundTexture(-200, 1300, GROUND, 4);
  for (const tx of [60, 330, 700, 980, 1060]) tuft(tx, GROUND + 26, 1.1);
  for (const [fx, fs, fc] of [[260, 1, C.pink], [300, .8, C.yellow], [960, .9, C.pink], [1010, 1.1, C.yellow]]) flower(fx, GROUND + 4, fs, fc);
  bush(1040, GROUND - 30, 50, C.green);
  // parent
  const clap = t > 49.8 && t < 50.4, gap = Math.abs(Math.sin(t * 18)) * 12;
  hominin(850, GROUND, t, { evo: 1, s: 1.5, dir: -1, outfit: 'parent', hipH: 52, lean: .1, feet: [[36, 0], [-36, 0]], armA: clap ? null : [1.45, 1.8], hands: clap ? [[56 - gap, -106], [56 + gap, -104]] : null, mouth: t > 49.7 && t < 50.5 ? 'open' : null, lx: .9, ly: t > 51.5 ? -.8 : .3 });
  // toddler
  const kx = kidX6(t), ko = kidPose6(t);
  hominin(kx, GROUND, t, ko);
  const J = pose(ko), KH = toWorld(kx, GROUND, KS, 1, J.hands[0]);
  const B = bf6(t, KH);
  if (B) butterfly(B.x, B.y, t, { s: 1.1, speed: B.slow ? 4 : 15 });
  if (t > 49.72 && t < 49.95) puff(kx, GROUND, inv(49.72, 49.95, t), 4, 16);
  if (t > 52.05 && t < 52.5) hand('!', kx + 70, G_(-330), 60);
  screen();
}
function sceneEnd(t) {
  paper();
  const u = ease(inv(54.8, 55.6, t));
  if (u < 1) { OFF_Y = -u * 1080; sceneTodayContent(t); }
  OFF_Y = (1 - u) * 1080; sceneOriginContent(t - 56);
  OFF_Y = 0; screen();
}

// ============ captions ============
const YEARS = [
  [0, 7e6], [6.3, 7e6], [6.8, 4.4e6], [8.4, 4.4e6], [8.9, 3.2e6], [11.7, 3.2e6], [12.1, 2.6e6], [15.0, 2.6e6], [15.6, 1e6],
  [22.0, 1e6], [22.8, 3e5], [26.8, 3e5], [27.3, 7e4], [30.6, 7e4], [31.2, 4e4], [36.5, 4e4], [37.0, 12000], [39.1, 12000],
  [39.5, 5000], [41.3, 5000], [41.7, 500], [43.5, 500], [43.8, 150], [44.5, 150], [44.9, 57], [99, 57]
];
function yearsAt(t) {
  for (let i = 0; i < YEARS.length - 1; i++) {
    const [t0, v0] = YEARS[i], [t1, v1] = YEARS[i + 1];
    if (t >= t0 && t < t1) return Math.exp(lerp(Math.log(v0), Math.log(v1), (t - t0) / (t1 - t0)));
  }
  return 57;
}
function fmtYears(v) {
  if (v >= 999500) { const m = Math.round(v / 1e5) / 10; return `${m} million years ago`; }
  if (v >= 1000) { const d = Math.pow(10, Math.floor(Math.log10(v)) - 1); return `${(Math.round(v / d) * d).toLocaleString('en-US')} years ago`; }
  return `${Math.round(v)} years ago`;
}
function captionColor(t) {
  return (t > 14.75 && t < 22.45) || (t > 30.5 && t < 36.2) || (t > 45.9 && t < 47.4) ? C.cream : C.ink;
}
function typed(s, t, a, b) { return s.slice(0, Math.min(s.length, Math.floor(inv(a, b, t) * s.length + (t > a ? 1 : 0)))); }
function erased(s, t, a, b) { return s.slice(0, Math.ceil((1 - inv(a, b, t)) * s.length)); }
function drawCaption(t) {
  screen();
  const y = 1000, col = captionColor(t);
  if (t < .7) return;
  if (t < 47.55) {
    let s = fmtYears(yearsAt(t));
    if (t < 1.6) s = typed(s, t, .7, 1.6);
    if (t > 47.2) s = erased(s, t, 47.2, 47.5);
    if (s) hand(s, 540, y, 44, col);
    return;
  }
  if (t < 50.85) {
    let s = typed('today', t, 47.6, 47.95);
    if (t > 50.5) s = erased('today', t, 50.5, 50.8);
    if (s) hand(s, 540, y, 44, col);
    return;
  }
  let s = typed('still curious.', t, 51.0, 51.8);
  if (t > 55.4) s = erased('still curious.', t, 55.4, 55.95);
  if (s) hand(s, 540, y + 6, 72, col);
}

// ============ timeline ============
const SCENES = [
  [0, 14.8, t => { paper(); sceneOriginContent(t); }],
  [14.8, 22.6, t => { paper(); sceneFireContent(t); }],
  [22.6, 30.6, t => { paper(); sceneIceContent(t); }],
  [30.6, 36.4, t => { paper(); sceneCaveContent(t); }],
  [36.4, 46.3, t => { paper(); sceneMarchContent(t); }],
  [46.3, 47.4, t => { paper(); sceneMoonContent(t); }],
  [47.4, 54.8, t => { paper(); sceneTodayContent(t); }],
  [54.8, 56, sceneEnd]
];
function renderFilm(t) {
  t = clamp(t, 0, DURATION - 1e-4);
  for (const [a, b, fn] of SCENES) if (t >= a && t < b) { fn(t); break; }
  drawCaption(t);
}
