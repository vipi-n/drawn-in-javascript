// Scenes 5: the chorus (first flight, the forest roars), the return (death feeds the forest), the epilogue (cycle ring).
const { C, W, H, TAU, clamp, lerp, inv, ss, io3, out3, back, win, rgba, mix, ramp, rng, noise, fbm, hash, cues } = require('./core');
const { EV, SCENES, BEAT } = cues;
const G = require('./gfx');
const WD = require('./world');
const Z = require('./cicada');
const CA = require('./cutaway');
const UG = require('./underground');
const T = require('./type');
const CAM = require('./cam');
const S1 = require('./s1');
const S2 = require('./s2');
const fract = (x) => x - Math.floor(x);

const C0 = SCENES[8][1], R0 = SCENES[9][1], P0 = SCENES[10][1];

function dayBG(k) {
  return G.cached('dayBG' + k, W + 400, H + 400, (c, w, h) => {
    const g = c.createLinearGradient(0, 0, 0, h);
    if (k === 0) { g.addColorStop(0, '#5ea0dc'); g.addColorStop(.4, '#b8d8e6'); g.addColorStop(.75, '#ffe0a0'); g.addColorStop(1, '#d89a50'); }
    else { g.addColorStop(0, '#2e2e6a'); g.addColorStop(.4, '#a0506e'); g.addColorStop(.72, '#ff9a60'); g.addColorStop(1, '#5a2e3a'); }
    c.fillStyle = g; c.fillRect(0, 0, w, h);
    const R = rng(70 + k);
    c.filter = 'blur(34px)';
    for (let i = 0; i < 70; i++) { const x = R() * w, y = R() * h, r = 50 + R() * 170, q = R(); const cols = k === 0 ? ['#2a6a3a', '#4a9a4a', '#a8c860', '#e8e090'] : ['#3a2a5a', '#6a3a6a', '#c8606a', '#ffa860']; c.fillStyle = rgba(cols[(q * 4) | 0], .22 + R() * .3); c.beginPath(); c.ellipse(x, y, r, r * (.5 + R() * .5), R() * 3, 0, TAU); c.fill(); }
    c.filter = 'blur(4px)'; c.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 46; i++) { const x = R() * w, y = R() * h * .8, r = 16 + R() * 54; const gg = c.createRadialGradient(x, y, r * .6, x, y, r); const col = k === 0 ? [255, 240, 176] : [255, 184, 128]; gg.addColorStop(0, `rgba(${col},.05)`); gg.addColorStop(.85, `rgba(${col},${.1 + R() * .12})`); gg.addColorStop(1, `rgba(${col},0)`); c.fillStyle = gg; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); }
  });
}
const BRANCH = [[-300, 820], [200, 760], [600, 690], [1000, 640], [1400, 610]];
const brT = (u) => lerp(96, 50, u);
function brAt(x) {
  for (let i = 0; i < BRANCH.length - 1; i++) if (x <= BRANCH[i + 1][0] || i === BRANCH.length - 2) {
    const f = clamp((x - BRANCH[i][0]) / (BRANCH[i + 1][0] - BRANCH[i][0])), u = (i + f) / (BRANCH.length - 1);
    const y = lerp(BRANCH[i][1], BRANCH[i + 1][1], f), a = Math.atan2(BRANCH[i + 1][1] - BRANCH[i][1], BRANCH[i + 1][0] - BRANCH[i][0]);
    return { y: y - brT(u) / 2 * Math.cos(a) + 3, a };
  }
}
const onBr = (x, sc) => { const b = brAt(x); return { x: x + Math.sin(b.a) * 118 * sc, y: b.y - Math.cos(b.a) * 118 * sc, a: b.a }; };

// ================================================================== CHORUS 102.5 - 115
const SINGERS = [[60, 1, .34], [330, -1, .32], [1020, -1, .33], [1250, 1, .3]];
const FLYERS = Array.from({ length: 22 }, (_, i) => ({ y: 60 + hash(i * 3) * 760, v: 140 + hash(i * 5) * 260, sc: .07 + Math.pow(hash(i * 7), 1.6) * .36, ph: hash(i * 9) * TAU, dir: hash(i * 11) < .3 ? -1 : 1, off: hash(i * 13) * 3000 }));
function flyer(ctx, x, y, sc, dir, t, ph, o = {}) {
  const fl = Math.sin(t * 120 + ph * 5);
  Z.adult(ctx, { x, y, sc, flip: dir, rot: Math.sin(t * 2 + ph) * .08 - .12, m: 1, wingOpen: 1, flap: fl, ghost: [{ fl, a: .55 }, { fl: Math.sin(t * 120 + ph * 5 + 1.6), a: .4 }, { fl: Math.sin(t * 120 + ph * 5 + 3.2), a: .28 }], legs: 'air', t, light: [-.5, -.8], rim: o.rim ?? '#ffe0a0', rimA: .7, sil: o.sil ?? 0 });
}
function chorus(ctx, lt, t) {
  const L = (e) => e - C0;
  const peak = win(L(EV.chorusPeak) - 1.2, L(EV.chorusPeak), L(EV.chorusPeak) + 4, L(EV.chorusPeak) + 6.5, lt);
  const beat = Math.exp(-fract(t / BEAT) * 6);
  const keys = [[0, 500, 560, 1.15, 0], [2.4, 560, 520, 1.0, 0], [5, 600, 540, .96, -.006], [8, 560, 520, 1.02, .006], [12.5, 520, 500, 1.1, 0]];
  const c = CAM.at(keys, lt, { hand: 3 + 3 * peak, seed: 71, shakes: [[L(EV.chorusPeak), 10, .8]] });
  c.z *= 1 + .018 * beat * ss(1.5, 2.5, lt);
  const P = (d, fn) => { ctx.save(); CAM.apply(ctx, CAM.plane(c, d)); fn(); ctx.restore(); };
  const sx = 860, sy = 240;
  P(.2, () => { ctx.drawImage(dayBG(0), -200, -200); G.glow(ctx, sx, sy, 1000, '#ffd07a', .45 + .1 * beat * peak); G.glow(ctx, sx, sy, 330, '#fff0c2', .8); ctx.fillStyle = 'rgba(255,250,232,.96)'; ctx.beginPath(); ctx.arc(sx, sy, 70, 0, TAU); ctx.fill(); });
  P(.3, () => G.lightShafts(ctx, lt, sx, sy, 2.0, 1.5, 1400, '#ffe2a0', .1 + .05 * peak, 11, 7));
  // distant swarm
  P(.4, () => { for (let i = 0; i < 40; i++) { const k0 = ss(1.5 + hash(i) * 2, 3.5 + hash(i) * 2, lt); if (k0 <= 0) continue; const x = fract(hash(i + 3) + lt * (.03 + hash(i) * .05)) * 1600 - 260, y = 120 + hash(i + 5) * 520 + Math.sin(lt * 1.3 + i) * 30; flyer(ctx, x, y, .03 + hash(i + 7) * .03, 1, t, i, { sil: .5, rim: '#ffefd0' }); } });
  ctx.save(); CAM.apply(ctx, c);
  WD.branch(ctx, BRANCH, brT, { rimA: .75 });
  for (let i = 0; i < 9; i++) { const x = -200 + i * 170 + hash(i) * 60, b = brAt(x); WD.leaf(ctx, x, b.y + 60, 140 + hash(i + 2) * 80, Math.PI * (.32 + hash(i + 4) * .3) + Math.sin(lt * 1.2 + i) * .05, ['#3a5f23', '#587f2c', '#2d4a1e'][i % 3], { wid: .3 }); }
  // sound rings from the whole branch
  const choir = ss(L(EV.chorusStart) - .8, L(EV.chorusStart) + .4, lt);
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let q = 0; q < 5; q++) { const age = fract(lt / (BEAT * 2) + q / 5), r = 60 + age * 1300; ctx.strokeStyle = rgba('#fff0c0', .09 * (1 - age) * choir * (1 + peak)); ctx.lineWidth = 3 + 10 * (1 - age) * peak; ctx.beginPath(); ctx.arc(640, 520, r, 0, TAU); ctx.stroke(); }
  ctx.restore();
  SINGERS.forEach(([x, flip, sc], i) => {
    const p = onBr(x, sc), call = choir * (.6 + .4 * Math.sin(lt * 2.6 + i));
    Z.adult(ctx, { x: p.x, y: p.y, sc, flip, rot: p.a, m: 1, legs: 'perch', pulse: call * (.5 + .5 * Math.sin(t * TAU * (19 + i))), wingOpen: call * .03, ground: 118, t, light: [-.5, -.8], rim: '#ffd890', rimA: .85, eyeGlow: .15 * call });
    if (choir > .02) T.soundArcs(ctx, p.x - flip * 40 * sc, p.y - 50 * sc, t + i * .13, choir * .55, { ang: flip > 0 ? Math.PI * 1.25 : -Math.PI * .25, spread: 1.5, speed: 300, period: .14, color: '#fff0c8', w: 2.8 });
  });
  // hero: the first flight, from the trunk at left to land on the branch
  const fT0 = L(EV.firstFlight) - .3, fT1 = L(EV.chorusStart) - .3;
  if (lt < fT1 + .1) {
    const q = clamp((lt - fT0) / (fT1 - fT0)), e = io3(q);
    const land = onBr(700, .4);
    const p0 = [-160, 340], p1 = [420, 120], p2 = [land.x, land.y];
    const hx = (1 - e) * (1 - e) * p0[0] + 2 * (1 - e) * e * p1[0] + e * e * p2[0], hy = (1 - e) * (1 - e) * p0[1] + 2 * (1 - e) * e * p1[1] + e * e * p2[1];
    const lk = ss(.85, 1, q);
    if (q > 0) { const fl = Math.sin(t * 140); Z.adult(ctx, { x: hx, y: hy, sc: lerp(.6, .4, e), flip: 1, rot: lerp(-.3, land.a, lk), m: 1, wingOpen: 1 - lk * .97, flap: fl, ghost: lk < .9 ? [{ fl, a: .6 }, { fl: Math.sin(t * 140 + 1.6), a: .45 }, { fl: Math.sin(t * 140 + 3.2), a: .3 }] : null, legs: lk > .6 ? 'perch' : 'air', ground: 118, t, light: [-.5, -.8], rim: '#fff0c0', rimA: .9 }); ctx.save(); ctx.globalCompositeOperation = 'lighter'; G.glow(ctx, hx, hy, 220, '#ffe2a0', .2 * (1 - lk)); ctx.restore(); }
  } else { const p = onBr(700, .4); Z.adult(ctx, { x: p.x, y: p.y, sc: .4, flip: 1, rot: p.a, m: 1, legs: 'perch', pulse: choir * (.5 + .5 * Math.sin(t * TAU * 20)), ground: 118, t, light: [-.5, -.8], rim: '#fff0c0', rimA: .9 }); }
  ctx.restore();
  // near flyers (parallax, blurred when close)
  for (const f of FLYERS) {
    const k0 = ss(L(EV.chorusStart) - 1.5, L(EV.chorusStart) + 1, lt); if (k0 <= 0) continue;
    const span = W + 900, x = f.dir > 0 ? fract((f.off + lt * f.v) / span) * span - 450 : W + 450 - fract((f.off + lt * f.v) / span) * span;
    const y = f.y + Math.sin(lt * 1.3 + f.ph) * 50;
    if (f.sc > .3) G.blurred(ctx, 7, (cc) => flyer(cc, x, y, f.sc, f.dir, t, f.ph), { alpha: .9 * k0 });
    else { ctx.save(); ctx.globalAlpha = k0; flyer(ctx, x, y, f.sc, f.dir, t, f.ph); ctx.restore(); }
  }
  ctx.save(); ctx.translate(-(c.x - 540) * 1.3, -(c.y - 540) * 1.3); ctx.drawImage(S1.fgLeaves('cfg', 14, false), -S1.PAD, -S1.PAD); ctx.restore();
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; G.glow(ctx, sx - (c.x - 540) * .2, sy, 420, '#ffe9b8', .2 + .12 * peak * beat); ctx.restore();
  G.motes(ctx, t, 60, { color: '#fff0c0', seed: 12, a: .8, size: 1.2, drift: [14, -10] });
  if (peak > 0) { ctx.fillStyle = `rgba(255,236,190,${.08 * peak * beat})`; ctx.fillRect(0, 0, W, H); }
  // graphics
  T.chapter(ctx, lt - .4, 3.8, 9, 'The Chorus', 'four weeks to sing, mate and lay eggs');
  const mA = win(L(EV.chorusPeak) - .6, L(EV.chorusPeak), L(EV.chorusPeak) + 4.6, L(EV.chorusPeak) + 5.4, lt);
  if (mA > 0) {
    const x0 = W - 120, y0 = 640, n = 14;
    for (let i = 0; i < n; i++) {
      const lvl = clamp(.35 + .6 * peak + .1 * Math.sin(t * 9 + i * 1.7) + beat * .12);
      const on = (i / n) < lvl * (.75 + .25 * hash(Math.floor(t * 12) + i));
      ctx.fillStyle = on ? rgba(i < 9 ? '#ffd27a' : i < 12 ? '#ff9a52' : '#ff5a3a', .95 * mA) : rgba('#ffffff', .12 * mA);
      ctx.fillRect(x0, y0 - i * 24, 50, 16);
    }
    G.text(ctx, '100 dB', x0 + 25, y0 + 50, { font: 'Didot', size: 30, color: '#fff3dc', align: 'center', alpha: mA, shadow: 10 });
    G.text(ctx, 'AS LOUD AS A', x0 + 25, y0 + 76, { font: 'OptB', size: 11, color: '#f2b25c', align: 'center', track: 3, alpha: mA });
    G.text(ctx, 'MOTORCYCLE', x0 + 25, y0 + 92, { font: 'OptB', size: 11, color: '#f2b25c', align: 'center', track: 3, alpha: mA });
  }
}

// ================================================================== RETURN 115 - 125
function returnScene(ctx, lt, t) {
  const L = (e) => e - R0;
  // A: dusk branch, an old cicada lets go and falls (camera follows down to the litter)
  const fallT = L(EV.fall);
  const fallK = clamp((lt - fallT) / 1.6);
  const camFollow = ss(fallT, fallT + 1.8, lt);
  const keys = [[0, 560, 560, 1.12, 0], [fallT, 560, 620, 1.06, 0], [fallT + 1.8, 600, 1620, 1.0, 0], [5.4, 600, 1680, 1.08, 0], [7.6, 560, 1780, .86, 0], [10, 540, 1760, .9, 0]];
  const c = CAM.at(keys, lt, { hand: 2.5, seed: 81 });
  const P = (d, fn) => { ctx.save(); CAM.apply(ctx, CAM.plane(c, d)); fn(); ctx.restore(); };
  P(.15, () => { ctx.drawImage(dayBG(1), -200, -200); G.glow(ctx, 300, 600, 800, '#ff9a5a', .35); });
  ctx.save(); CAM.apply(ctx, c);
  const GYW = 1760;
  // forest floor far below + soil
  const gs = G.cached('groundFade', W + 400, 900, (cc, w, h) => { cc.drawImage(S2.groundScenery(), 0, 0); cc.fillStyle = 'rgba(60,30,90,.35)'; cc.fillRect(0, 0, w, h); cc.globalCompositeOperation = 'destination-out'; const m = cc.createLinearGradient(0, 0, 0, 420); m.addColorStop(0, 'rgba(0,0,0,1)'); m.addColorStop(1, 'rgba(0,0,0,0)'); cc.fillStyle = m; cc.fillRect(0, 0, w, 420); });
  ctx.drawImage(gs, -200, GYW - 880);
  const soil = WD.soilTex('soil', 1920, 2600, 11); ctx.drawImage(soil, -400, GYW - 20);
  const dk = ctx.createLinearGradient(0, GYW, 0, GYW + 1200); dk.addColorStop(0, 'rgba(0,0,0,0)'); dk.addColorStop(1, 'rgba(4,2,1,.6)'); ctx.fillStyle = dk; ctx.fillRect(-400, GYW, W + 800, 1300);
  ctx.fillStyle = '#1e140b'; ctx.fillRect(-400, GYW - 3, W + 800, 6);
  // the tree's trunk on the left: life climbs it as the nutrients arrive
  const bark = WD.barkTex('barkR', 900, 1600, ['#3a2a22', '#120a08', '#8a6a52'], 51);
  ctx.save(); ctx.beginPath(); ctx.moveTo(-120, GYW + 60); ctx.quadraticCurveTo(60, GYW - 20, 80, GYW - 300); ctx.lineTo(100, -300); ctx.lineTo(300, -300); ctx.lineTo(300, GYW - 300); ctx.quadraticCurveTo(320, GYW - 20, 520, GYW + 60); ctx.closePath(); ctx.clip();
  WD.tileBark(ctx, bark, -140, -400, 680, GYW + 80);
  const sh = ctx.createLinearGradient(80, 0, 320, 0); sh.addColorStop(0, 'rgba(255,150,110,.25)'); sh.addColorStop(1, 'rgba(0,0,0,.45)'); ctx.fillStyle = sh; ctx.fillRect(-140, -300, 680, GYW + 400);
  const nut = ss(L(EV.nutrients[0]) - .4, L(EV.nutrients[0]) + .8, lt);
  const lift = ss(L(EV.nutrients[0]) + .6, L(EV.nutrients[1]) + 1, lt), gy = GYW - lift * 1500;
  const lg = ctx.createLinearGradient(0, gy - 160, 0, GYW); lg.addColorStop(0, 'rgba(190,255,160,0)'); lg.addColorStop(.1, 'rgba(190,255,160,.5)'); lg.addColorStop(1, 'rgba(190,255,160,.1)');
  ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = lg; ctx.fillRect(-140, gy - 160, 700, GYW - gy + 200);
  ctx.restore();
  const RT = [[[260, GYW + 30], [480, GYW + 150], [720, GYW + 230], [1000, GYW + 260], [1400, GYW + 300]], [[240, GYW + 40], [380, GYW + 380], [640, GYW + 520], [1000, GYW + 600]]];
  RT.forEach((pts, i) => UG.root(ctx, pts, [48, 36][i], 0, t, { sap: nut, seed: 3 + i, glowC: '#c8ff9a' }));
  // the branch above, tired adults, a few frayed wings
  WD.branch(ctx, BRANCH, brT, { rimA: .6 });
  [[160, 1, .42], [430, -1, .4], [700, 1, .44], [980, -1, .4]].forEach(([x, flip, sc], i) => {
    if (i === 2 && lt > fallT) return;
    const p = onBr(x, sc); Z.adult(ctx, { x: p.x, y: p.y, sc, flip, rot: p.a + Math.sin(lt * .8 + i) * .01, m: 1, legs: 'perch', ground: 118, t, light: [-.5, -.8], rim: '#ff9a70', rimA: .55, stance: -6 });
  });
  ctx.drawImage(S2.litter(), -200, GYW - 230);
  // the fallen: bodies on the litter, fading into the soil
  const fade = ss(L(EV.nutrients[0]) - .2, L(EV.nutrients[1]) + .4, lt);
  [[480, .36, 1], [690, .38, -1], [900, .34, 1]].forEach(([x, sc, flip], i) => {
    if (lt < fallT + 1.2 + i * .2) return;
    Z.adult(ctx, { x, y: GYW - 46 * sc - 34 + (i % 2) * 6, sc, flip, rot: (i % 2 ? .08 : -.06), m: 1, wingOpen: .1, legs: 'dangle', dangle: 1, ground: 118, t, light: [-.5, -.8], rim: '#ffa070', rimA: .45, alpha: 1 - fade * .85 });
  });
  // the one that falls: tumbling down, wings fluttering, coming to rest
  if (lt > fallT && fade < 1) {
    const p = onBr(700, .44), restY = GYW - 70;
    const yy = p.y + 1200 * Math.pow(fallK, 1.6), y = Math.min(yy, restY), landed = yy >= restY;
    const rot = landed ? Math.PI * .97 : p.a + fallK * 3.4 + Math.sin(lt * 5) * .3;
    Z.adult(ctx, { x: lerp(p.x, 560, fallK) + Math.sin(fallK * 5) * 50, y, sc: .44, flip: 1, rot, m: 1, wingOpen: landed ? .15 : .5 + .3 * Math.sin(lt * 12), flap: landed ? 0 : Math.sin(lt * 9) * .6, legs: 'dangle', dangle: 1, ground: 118, t, light: [-.5, -.8], rim: '#ff9a70', rimA: .5, alpha: 1 - fade * .85 });
  }
  if (nut > 0) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const R = rng(88);
    for (let q = 0; q < 130; q++) {
      const x0 = 380 + R() * 640, ph = R(), sp = .1 + R() * .08, k = fract(t * sp + ph);
      const y = k < .4 ? lerp(GYW - 20, GYW + 160 + R() * 60, k / .4) : lerp(GYW + 200, GYW + 40, ss(.4, 1, k));
      const x = k < .4 ? x0 + Math.sin(k * 10 + q) * 12 : lerp(x0, 250, ss(.4, 1, k));
      G.glow(ctx, x, y, 7 + R() * 7, R() < .5 ? '#c8ff9a' : '#ffe9a0', .85 * nut * Math.sin(k * Math.PI));
    }
    ctx.restore();
  }
  // a new nymph dropping in and digging down (the cycle continues)
  const nk = ss(L(EV.nutrients[1]) - .6, L(EV.nutrients[1]) + 1.4, lt);
  if (lt > L(EV.nutrients[1]) - 1.8) {
    const k = clamp((lt - L(EV.nutrients[1]) + 1.8) / 1.2), x = 700;
    const y = k < 1 ? lerp(GYW - 700, GYW - 30, k * k) : GYW - 30 + nk * 140;
    if (nk > 0) S2.tunnel(ctx, [[x, GYW], [x + 10, GYW + nk * 140]], 22);
    Z.nymph(ctx, { x, y, sc: .26, rot: k < 1 ? lt * 6 : 1.3 * ss(0, .2, nk), young: .9, legsMode: nk > 0 ? 'dig' : 'walk', dig: lt * 2, walk: lt * 6, ground: 100, t, rim: '#ffe8b8', rimA: .5 });
  }
  ctx.restore();
  ctx.fillStyle = `rgba(20,10,40,${.15 + .2 * camFollow})`; ctx.fillRect(0, 0, W, H);
  G.motes(ctx, t, 34, { color: '#ffb890', seed: 3, a: .55, size: 1.1, drift: [6, 14] });
  T.chapter(ctx, lt - .4, 3.6, 10, 'The Return', 'after a few weeks, the adults die');
  const nS = CAM.toScreen(c, 560, GYW + 200);
  T.callout(ctx, lt - L(EV.nutrients[0]) - .3, 3.4, nS[0], nS[1], nS[0] + 60, nS[1] + 160, 'BACK TO THE SOIL', 'their bodies feed the tree that fed them', { side: 1 });
}

// ================================================================== EPILOGUE 125 - 135
const STAGES = [['EGG', '6–10 weeks', 'egg'], ['NYMPH', 'drops to the ground', 'drop'], ['UNDERGROUND', '17 years', 'root'], ['EMERGENCE', 'one night', 'turret'], ['LAST MOULT', 'a few hours', 'molt'], ['ADULT', '4–6 weeks', 'adult']];
function icon(ctx, kind, x, y, r, t) {
  ctx.save(); ctx.translate(x, y);
  ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.clip();
  const g = ctx.createRadialGradient(0, -r * .4, 4, 0, 0, r); g.addColorStop(0, '#30403c'); g.addColorStop(1, '#0c1214'); ctx.fillStyle = g; ctx.fillRect(-r, -r, 2 * r, 2 * r);
  if (kind === 'egg') { for (let i = 0; i < 3; i++) Z.egg(ctx, { x: -4 + i * 3, y: -18 + i * 18, sc: .62, rot: -.25 + i * .1, dev: .8 }); }
  else if (kind === 'drop') { Z.nymph(ctx, { x: 6, y: -6, sc: .14, rot: .9 + Math.sin(t * 2) * .2, young: 1, legsMode: 'walk', walk: t * 2, t, ground: 100 }); ctx.fillStyle = 'rgba(255,255,255,.2)'; ctx.fillRect(-r * .5, -r * .8, 2, 26); ctx.fillRect(r * .3, -r * .6, 2, 30); }
  else if (kind === 'root') { ctx.strokeStyle = '#9a7a52'; ctx.lineWidth = 10; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-r, r * .5); ctx.quadraticCurveTo(0, r * .3, r, r * .55); ctx.stroke(); Z.nymph(ctx, { x: 0, y: -2, sc: .16, rot: 0, young: 0, legsMode: 'climb', t, ground: 100 }); }
  else if (kind === 'turret') { ctx.fillStyle = '#4a3322'; ctx.beginPath(); ctx.moveTo(-30, r); ctx.lineTo(-16, 8); ctx.lineTo(16, 8); ctx.lineTo(30, r); ctx.fill(); Z.nymph(ctx, { x: 0, y: -10, sc: .12, rot: -Math.PI / 2, t, legsMode: 'climb', ground: 100, red: 1 }); }
  else if (kind === 'molt') { Z.nymph(ctx, { x: 10, y: 10, sc: .13, rot: -Math.PI / 2, exuvia: 1, t, legsMode: 'grip', ground: 100 }); Z.adult(ctx, { x: -6, y: -22, sc: .12, rot: -Math.PI / 2, m: .15, wingSize: .9, crumple: .2, legs: 'cling', t }); }
  else if (kind === 'adult') { const fl = Math.sin(t * 10); Z.adult(ctx, { x: 4, y: 8, sc: .15, flip: 1, rot: -.15, m: 1, wingOpen: 1, flap: fl, legs: 'air', t, ghost: [{ fl, a: .6 }, { fl: Math.sin(t * 10 + 1.6), a: .4 }] }); }
  ctx.restore();
}
function epilogue(ctx, lt, t) {
  const ringIn = ss(2.2, 3.2, lt);
  // a: the new eggs glowing in the twig (lens over the branch)
  if (ringIn < 1) {
    const c = CAM.at([[0, 560, 600, 1.0, 0], [3, 540, 560, 1.12, 0]], lt, { hand: 2, seed: 91 });
    ctx.fillStyle = '#10100a'; ctx.fillRect(0, 0, W, H);
    S1.songWorld(ctx, lt, t, c);
    ctx.save(); CAM.apply(ctx, c); S1.songBranch(ctx, lt);
    ctx.strokeStyle = 'rgba(255,230,170,.9)'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    for (let i = 0; i < 5; i++) { const x = 300 + i * 60, b = S1.brAt(x); ctx.beginPath(); ctx.moveTo(x, b.y + 12); ctx.lineTo(x + 30, b.y + 16); ctx.stroke(); }
    ctx.restore();
    ctx.fillStyle = `rgba(6,10,14,${.45 * ss(.4, 1.6, lt)})`; ctx.fillRect(0, 0, W, H);
    const eggsA = []; for (let n = 0; n < 12; n++) eggsA.push({ u: 1, dev: .9 });
    T.lens(ctx, lt - .2, 2.8, CAM.toScreen(c, 420, S1.brAt(420).y + 14)[0], CAM.toScreen(c, 420, S1.brAt(420).y + 14)[1], 560, 380, 250, (cc) => CA.draw(cc, { cx: 560, cy: 380, s: .6, r: 0, ox: 60, oy: -100, reveal: 760, eggs: eggsA, t: lt }), { label: 'A NEW BROOD', labelTop: true });
    if (ringIn > 0) { ctx.fillStyle = `rgba(4,8,10,${ringIn})`; ctx.fillRect(0, 0, W, H); }
  }
  if (ringIn <= 0) return;
  ctx.save(); ctx.globalAlpha = ringIn;
  const g = ctx.createRadialGradient(W / 2, H * .48, 60, W / 2, H * .48, H * .8); g.addColorStop(0, '#13221f'); g.addColorStop(.6, '#0a1214'); g.addColorStop(1, '#04070a');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  G.bokeh(ctx, t, 10, { colors: ['#4fd0b0', '#ffb070'], a: .05, seed: 15 });
  const cx = W / 2, cy = H / 2 - 30, R = 300, a0 = -Math.PI / 2;
  const prog = ss(2.8, 7.0, lt);
  ctx.strokeStyle = 'rgba(255,240,215,.14)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.stroke();
  // growth-ring texture inside
  for (let k = 0; k < 9; k++) { ctx.strokeStyle = `rgba(242,178,92,${.04 + .02 * (k % 2)})`; ctx.lineWidth = 1; ctx.beginPath(); for (let q = 0; q <= 60; q++) { const an = q / 60 * TAU, rr = (60 + k * 24) * (1 + .03 * noise(an * 3 + k * 5)); q ? ctx.lineTo(cx + Math.cos(an) * rr, cy + Math.sin(an) * rr) : ctx.moveTo(cx + Math.cos(an) * rr, cy + Math.sin(an) * rr); } ctx.stroke(); }
  ctx.save(); ctx.lineCap = 'round'; ctx.shadowColor = '#f2b25c'; ctx.shadowBlur = 22;
  const gr = ctx.createLinearGradient(cx - R, cy, cx + R, cy); gr.addColorStop(0, '#ffb070'); gr.addColorStop(1, '#78e0c0');
  ctx.strokeStyle = gr; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(cx, cy, R, a0, a0 + prog * TAU); ctx.stroke(); ctx.restore();
  // a travelling spark
  if (prog > 0 && prog < 1) { const an = a0 + prog * TAU; ctx.save(); ctx.globalCompositeOperation = 'lighter'; G.glow(ctx, cx + Math.cos(an) * R, cy + Math.sin(an) * R, 40, '#fff2cc', .9); ctx.restore(); }
  STAGES.forEach(([a, b, kind], i) => {
    const an = a0 + i / 6 * TAU, x = cx + Math.cos(an) * R, y = cy + Math.sin(an) * R;
    const k = ss(i / 6 * .95 - .02, i / 6 * .95 + .1, prog) * (lt > 2.8 ? 1 : 0);
    if (k <= 0) return;
    const r = 58 * back(clamp(k));
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; G.glow(ctx, x, y, 120, '#ffb070', .25 * k * (1 - clamp((prog - i / 6) * 3))); ctx.restore();
    icon(ctx, kind, x, y, r, t);
    ctx.strokeStyle = rgba('#ffe2b8', .9 * k); ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke();
    const cs = Math.cos(an), sn = Math.sin(an);
    const lx = x + cs * (r + 22), ly = y + sn * (r + 22);
    const al = cs > .3 ? 'left' : cs < -.3 ? 'right' : 'center';
    const ty = sn > .6 ? ly + 30 : sn < -.6 ? ly - 30 : ly + 4;
    G.text(ctx, a, lx, ty, { font: 'OptB', size: 19, color: '#fff3dc', align: al, track: 4, alpha: k });
    G.text(ctx, b, lx, ty + 24, { font: 'IoI', size: 18, color: '#f2b25c', align: al, alpha: k * .95 });
  });
  const cA = ss(3.0, 4.2, lt);
  T.title(ctx, lt - 3.0, cx, cy + 34, cA, { size: 76 });
  G.text(ctx, 'THE LIFE CYCLE', cx, cy + 74, { font: 'OptB', size: 16, color: '#f2b25c', align: 'center', track: 10, alpha: cA });
  G.text(ctx, '17 years below  ·  four weeks above', cx, H - 92, { font: 'IoI', size: 30, color: '#ffe9c8', align: 'center', alpha: ss(7.0, 7.8, lt), shadow: 10 });
  G.text(ctx, 'AND THEN IT BEGINS AGAIN', cx, H - 52, { font: 'OptB', size: 15, color: '#f2b25c', align: 'center', track: 8, alpha: ss(7.8, 8.5, lt) });
  ctx.restore();
}

module.exports = { chorus, return: returnScene, epilogue };
