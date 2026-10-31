// Scenes 2: eggs (six weeks inside the twig, hatching) and the drop (fall, landing, ants, burrowing).
const { C, W, H, TAU, clamp, lerp, inv, ss, io3, out3, back, win, rgba, mix, rng, noise, fbm, hash, cues } = require('./core');
const { EV, SCENES } = cues;
const G = require('./gfx');
const WD = require('./world');
const Z = require('./cicada');
const CA = require('./cutaway');
const T = require('./type');
const CAM = require('./cam');
const S1 = require('./s1');
const fract = (x) => x - Math.floor(x);

// ================================================================== EGGS 20 - 30
const E0 = SCENES[2][1];
const NEGG = 12;
const HT = (() => { const ht = []; const ord = [3, 8, 1, 10, 5, 0]; ord.forEach((n, i) => { ht[n] = EV.hatch[i] - E0; }); [2, 4, 6, 7, 9, 11].forEach((n, i) => { ht[n] = EV.hatch[5] - E0 + .25 + i * .18; }); return ht; })();
const TOP = -262 - 14; // bark surface (twig-local)

function hatchling(n, lt) {
  const tau = lt - HT[n] - .25;
  if (tau < 0) return null;
  const slot = CA.eggSlot(n), grow = out3(clamp(tau / .45));
  const speed = 300, dist = speed * Math.max(0, tau - .3), u0 = slot.u + 40;
  let x, y, rot, flip = 1;
  if (dist < u0) {
    const p = CA.at(Math.max(0, u0 - dist));
    x = p.x; y = p.y;
    flip = -1; rot = Math.atan2(-p.ty, -p.tx) + Math.PI;
    if (tau < .3) { const k = tau / .3; x = slot.x + Math.cos(slot.ang) * 40 * k; y = slot.y + Math.sin(slot.ang) * 40 * k; rot = slot.ang + Math.PI; }
  } else {
    const ex = dist - u0, e0 = CA.at(0), up = clamp(ex / 90);
    x = e0.x - 6 + up * 20 + Math.max(0, ex - 90) * .8; y = lerp(e0.y, TOP - 4, up); flip = up < .6 ? -1 : 1; rot = up < .6 ? -Math.PI / 2 * up / .6 + Math.atan2(-CA.at(5).ty, -CA.at(5).tx) * 0 : 0;
    if (flip < 0) rot = Math.PI / 2 * (1 - up / .6) * 0 + -1.2;
  }
  return { x, y, sc: .2 * lerp(.4, 1, grow), rot, flip, young: 1, legsMode: 'walk', walk: tau * 2.6 + n * .17, ground: 100, t: tau, alpha: ss(0, .2, tau), rim: '#fff0c8', rimA: .5, eyes: 1.25 };
}
function reticle(ctx, t, a) {
  if (a <= 0) return;
  ctx.save(); ctx.globalAlpha *= a;
  const cx = W / 2, cy = H / 2, R = 500;
  ctx.strokeStyle = 'rgba(255,240,210,.22)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,240,210,.35)';
  for (let i = 0; i < 120; i++) { const an = i / 120 * TAU + t * .03, l = i % 10 === 0 ? 16 : 7; ctx.beginPath(); ctx.moveTo(cx + Math.cos(an) * R, cy + Math.sin(an) * R); ctx.lineTo(cx + Math.cos(an) * (R - l), cy + Math.sin(an) * (R - l)); ctx.stroke(); }
  ctx.strokeStyle = 'rgba(255,240,210,.12)'; ctx.beginPath(); ctx.moveTo(cx - 40, cy); ctx.lineTo(cx + 40, cy); ctx.moveTo(cx, cy - 40); ctx.lineTo(cx, cy + 40); ctx.stroke();
  // scale bar
  ctx.fillStyle = 'rgba(255,244,224,.85)'; ctx.fillRect(W - 230, H - 96, 120, 3); ctx.fillRect(W - 230, H - 102, 2, 15); ctx.fillRect(W - 112, H - 102, 2, 15);
  G.text(ctx, '1 mm', W - 170, H - 108, { font: 'OptB', size: 15, color: '#fff4e0', align: 'center', track: 3 });
  ctx.restore();
}
function eggs(ctx, lt, t) {
  const weeks = 1 + 6 * io3(clamp((lt - .3) / 5.6));
  const cyc = clamp((lt - .3) / 5.6) * 6;           // day/night cycles during the time-lapse
  const night = ss(.25, .75, .5 - .5 * Math.cos(cyc * TAU)) * (1 - ss(5.6, 6.2, lt));
  const c = CAM.at([[0, 540, 520, 1.0, 0], [5, 560, 540, 1.06, .006], [6.6, 470, 520, 1.12, 0], [10, 420, 500, 1.2, -.004]], lt, { hand: 2, seed: 21 });
  // the world outside: morning bokeh that flickers through day and night
  ctx.save(); CAM.apply(ctx, CAM.plane(c, .3)); ctx.drawImage(S1.morningBG(), -160, -160); ctx.restore();
  ctx.fillStyle = `rgba(10,22,58,${night * .8})`; ctx.fillRect(0, 0, W, H);
  if (night > .2) { const R = rng(4); for (let i = 0; i < 60; i++) { ctx.fillStyle = `rgba(255,255,255,${night * .7 * (.4 + .6 * Math.abs(Math.sin(t * 2 + i)))})`; ctx.fillRect(R() * W, R() * H, 2, 2); } }
  // twig cut-away, in camera space
  const dev = ss(.4, 5.4, lt), eggsA = [];
  for (let n = 0; n < NEGG; n++) eggsA.push({ u: 1, dev, gone: false });
  ctx.save(); CAM.apply(ctx, c);
  const S = 1.22, OX = -40, OY = -120;
  CA.draw(ctx, { cx: 540, cy: 540, s: S, r: 0, ox: OX, oy: OY, reveal: 760, blade: -1, eggs: eggsA.map((e, n) => (lt > HT[n] + .5 ? { ...e, u: 0 } : e)), t: lt });
  // hatched egg husks + hatchlings, in twig space
  ctx.save(); ctx.translate(540, 540); ctx.scale(S, S); ctx.translate(-OX, -OY);
  for (let n = 0; n < NEGG; n++) {
    const sl = CA.eggSlot(n), h = (lt - HT[n]) / .5, wob = Math.sin(t * 9 + n) * .04 * ss(4, 5.5, lt) * (h < 0 ? 1 : 0);
    if (h > 0) {
      // the husk splits at the head end and stays behind, empty
      Z.egg(ctx, { x: sl.x, y: sl.y, sc: .74, rot: sl.ang, dev: 0, alpha: 1 - .45 * clamp(h) });
      ctx.save(); ctx.translate(sl.x, sl.y); ctx.rotate(sl.ang); ctx.strokeStyle = 'rgba(90,60,30,.85)'; ctx.lineWidth = 2; const cl = clamp(h * 2) * 26;
      ctx.beginPath(); ctx.moveTo(44, -9); ctx.lineTo(44 - cl * .5, -2); ctx.lineTo(44, 3); ctx.lineTo(44 - cl * .7, 8); ctx.stroke(); ctx.restore();
      if (h < 1) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; G.glow(ctx, sl.x + Math.cos(sl.ang) * 40, sl.y + Math.sin(sl.ang) * 40, 40 + h * 120, '#fff0c0', .6 * (1 - h)); ctx.restore(); }
    } else if (wob) { /* developing eggs twitch near the end */ }
  }
  for (let n = 0; n < NEGG; n++) { const o = hatchling(n, lt); if (o) Z.nymph(ctx, o); }
  // eye-spot flare
  const es = win(EV.eyeSpots - E0 - .4, EV.eyeSpots - E0, EV.eyeSpots - E0 + .4, EV.eyeSpots - E0 + 1.4, lt);
  if (es > 0) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; for (let n = 0; n < NEGG; n++) { const sl = CA.eggSlot(n); G.glow(ctx, sl.x + Math.cos(sl.ang) * 42, sl.y + Math.sin(sl.ang) * 42, 46, '#ff5a3a', .4 * es); } ctx.restore(); }
  ctx.restore();
  ctx.restore();
  ctx.fillStyle = `rgba(20,40,100,${night * .2})`; ctx.fillRect(0, 0, W, H);
  // graphics
  reticle(ctx, t, ss(.2, .8, lt) * (1 - ss(9.3, 10, lt)));
  T.dial(ctx, W - 110, 120, ss(.2, .7, lt) * (1 - ss(6.2, 6.8, lt)), 'WEEK', Math.min(7, Math.floor(weeks)), Math.floor(weeks), fract(weeks), { max: 7 });
  const eS = CAM.toScreen(c, 540 + (CA.eggSlot(6).x - OX) * S + 50 * S, 540 + (CA.eggSlot(6).y - OY) * S);
  T.callout(ctx, lt - (EV.eyeSpots - E0) + .1, 2.2, eS[0], eS[1], eS[0] - 60, eS[1] + 170, 'EYE SPOTS', 'the embryos are nearly ready', { side: -1 });
  T.callout(ctx, lt - 1.0, 2.6, 540, 540, 640, 760, 'RICE-GRAIN EGGS', 'about 2 mm long');
  T.chapter(ctx, lt - 5.9, 4.1, 3, 'Hatching', 'after six to ten weeks, white nymphs crawl out');
}

// ================================================================== DROP 30 - 37.5
const D0 = SCENES[3][1];
const GY = 3000; // world y of the ground surface
const FALL0 = EV.letGo - D0 + .1, FALL1 = EV.land - D0;
const HERO_X = 540;
const FALLERS = Array.from({ length: 9 }, (_, i) => ({ i, dx: i === 0 ? 0 : (hash(i * 3) - .5) * 760, delay: i === 0 ? 0 : hash(i * 5) * .35, spin: (hash(i * 9) - .5) * 9, ph: hash(i * 7) * TAU, depth: i === 0 ? 1 : .55 + hash(i * 11) * .7 }));
function heroY(lt) {
  if (lt < FALL0) return 300;
  const u = clamp((lt - FALL0) / (FALL1 - FALL0));
  return 300 + (GY - 300) * Math.pow(u, 1.7);
}
function camY(lt) {
  if (lt < FALL0) return 360;
  if (lt < FALL1) return heroY(lt) + 40 * ss(FALL0, FALL0 + .5, lt) + 60 * (1 - ss(FALL0, FALL0 + .5, lt));
  const a = GY + 40;
  if (lt < 5.2) return lerp(a, GY - 20, io3(inv(FALL1, FALL1 + .9, lt)));
  return lerp(GY - 20, GY + 330, io3(inv(5.2, 7.5, lt)));
}
function groundScenery() {
  return G.cached('groundBG2', W + 400, 900, (c, w, h) => {
    const g = c.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#f6cf8e'); g.addColorStop(.4, '#c99a5c'); g.addColorStop(.75, '#6e6a34'); g.addColorStop(1, '#2c3a1a');
    c.fillStyle = g; c.fillRect(0, 0, w, h);
    c.filter = 'blur(16px)';
    const R = rng(33);
    for (let i = 0; i < 40; i++) { const x = R() * w, wd = 26 + R() * 70; c.fillStyle = rgba(['#3a4a22', '#2a3a1a', '#55662c', '#6a5a2a'][(R() * 4) | 0], .55); c.beginPath(); c.moveTo(x - wd, h); c.lineTo(x - wd * .3, 140 + R() * 300); c.lineTo(x + wd * .3, 140 + R() * 300); c.lineTo(x + wd, h); c.fill(); }
    c.filter = 'blur(6px)';
    for (let i = 0; i < 60; i++) { const x = R() * w, y = 420 + R() * 480; c.fillStyle = rgba('#1c2a10', .5); c.beginPath(); c.ellipse(x, y, 40 + R() * 90, 20 + R() * 40, R(), 0, TAU); c.fill(); }
    c.globalCompositeOperation = 'lighter'; c.filter = 'blur(26px)';
    for (let i = 0; i < 14; i++) { c.fillStyle = rgba('#ffe2b0', .08 + R() * .1); c.beginPath(); c.arc(R() * w, R() * 500, 50 + R() * 90, 0, TAU); c.fill(); }
  });
}
function litter() {
  return G.cached('litter2', W + 400, 330, (c, w, h) => {
    const R = rng(77);
    for (let i = 0; i < 110; i++) {
      const x = R() * w, y = 90 + R() * 160, len = 60 + R() * 120, a = (R() - .5) * 1.0 + (R() < .5 ? 0 : Math.PI);
      WD.leaf(c, x, y, len, a, ['#6a4020', '#8a5a2a', '#4f3018', '#a8742f', '#5a4a22', '#7a3a1a'][(R() * 6) | 0], { wid: .3 + R() * .14, vein: true, a: .98 });
    }
    c.strokeStyle = '#2b1d12'; c.lineCap = 'round';
    for (let i = 0; i < 16; i++) { const x = R() * w, y = 150 + R() * 140; c.lineWidth = 3 + R() * 6; c.beginPath(); c.moveTo(x, y); c.lineTo(x + 80 + R() * 160, y + (R() - .5) * 40); c.stroke(); }
    c.globalCompositeOperation = 'source-atop';
    const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(.5, 'rgba(0,0,0,.05)'); g.addColorStop(1, 'rgba(0,0,0,.45)'); c.fillStyle = g; c.fillRect(0, 0, w, h);
  });
}
// draw the forest-floor split (above-ground backdrop, litter, soil) for a ground line at screen y gy; ox = horizontal parallax
function floor(ctx, gy, t, ox = 0, o = {}) {
  ctx.drawImage(groundScenery(), -200 - ox * .3, gy - 880);
  G.lightShafts(ctx, t, 200, gy - 900, 1.2, .9, 1300, '#ffd9a0', .08, 6, 9);
  const soil = WD.soilTex('soil', 1920, 2600, 11);
  ctx.drawImage(soil, -400 - ox, gy - 20);
  const dk = ctx.createLinearGradient(0, gy, 0, gy + 1400); dk.addColorStop(0, 'rgba(0,0,0,0)'); dk.addColorStop(.5, 'rgba(8,4,2,.35)'); dk.addColorStop(1, 'rgba(4,2,1,.62)');
  ctx.fillStyle = dk; ctx.fillRect(0, Math.max(0, gy), W, H);
  ctx.fillStyle = '#1e140b'; ctx.fillRect(0, gy - 3, W, 6);
  if (o.under) o.under();
  ctx.drawImage(litter(), -200 - ox, gy - 230);
}
function tunnel(ctx, pts, w) {
  ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const path = () => { ctx.beginPath(); G.curve(ctx, pts, false); };
  path(); ctx.strokeStyle = 'rgba(20,10,4,.5)'; ctx.lineWidth = w + 22; ctx.stroke();
  path(); ctx.strokeStyle = '#0b0603'; ctx.lineWidth = w + 6; ctx.stroke();
  path(); ctx.strokeStyle = '#22150c'; ctx.lineWidth = w; ctx.stroke();
  ctx.translate(0, w * .22); path(); ctx.strokeStyle = 'rgba(255,200,140,.06)'; ctx.lineWidth = w * .4; ctx.stroke();
  ctx.restore();
}

function drop(ctx, lt, t) {
  const cy = camY(lt);
  const sy = (wy) => 540 + (wy - cy);
  const fallK = ss(FALL0 - .2, FALL0 + .4, lt) * (1 - ss(FALL1 - .3, FALL1, lt));
  // backdrop: canopy light fading into the darker understorey as we fall
  const depthK = clamp((cy - 300) / (GY - 300));
  ctx.save(); ctx.translate(0, -depthK * 300); ctx.drawImage(S1.morningBG(), -160, -160); ctx.restore();
  ctx.fillStyle = `rgba(40,30,14,${depthK * .55})`; ctx.fillRect(0, 0, W, H);
  // parallax leaves rushing past
  if (lt < FALL1 + .6) {
    const lay = (key, seed, blur, n, s0, s1, cols, a, k) => {
      const cv = G.cached(key, W, H * 2, (c) => { const R = rng(seed); c.filter = `blur(${blur}px)`; for (let i = 0; i < n; i++) WD.leaf(c, R() * W, R() * H * 2, s0 + R() * (s1 - s0), R() * TAU, cols[(R() * cols.length) | 0], { a, vein: blur < 8 }); });
      const off = fract((cy * k) / (H * 2)) * H * 2;
      ctx.globalAlpha = ss(FALL0, FALL0 + .4, lt) * (1 - ss(FALL1 - .2, FALL1 + .4, lt));
      ctx.drawImage(cv, 0, -off); ctx.drawImage(cv, 0, H * 2 - off); ctx.globalAlpha = 1;
    };
    lay('dfar', 21, 18, 40, 100, 220, ['#7fa24a', '#a8b85a', '#e0b45a'], .6, .3);
    lay('dmid', 22, 6, 30, 150, 300, ['#3f6a2a', '#5d8a34', '#2d4f22'], .9, .7);
  }
  // ground close-up: zoom in on the landing, ease back out as they dig
  const gz = 1 + .5 * ss(FALL1 - .2, FALL1 + .7, lt) - .25 * ss(5.4, 7.5, lt);
  ctx.save(); ctx.translate(540, 470); ctx.scale(gz, gz); ctx.translate(-540, -470);
  // the ground
  const gyS = sy(GY);
  if (gyS < H + 300) {
    floor(ctx, gyS, t, 0, {
      under: () => {
        // burrows
        for (const f of FALLERS) {
          const dk = f.i === 0 ? ss(5.0, 7.4, lt) : ss(5.2 + f.delay, 6.6 + f.delay, lt);
          if (dk <= 0 || f.i === 3) continue;
          const lx = landX(f), depth = f.i === 0 ? dk * 330 : dk * (90 + hash(f.i) * 80);
          tunnel(ctx, [[lx, gyS], [lx + depth * .12, gyS + depth * .6], [lx + depth * .1, gyS + depth]], 22 * f.depth);
        }
      },
    });
  }
  // the twig at the start
  const twigY = sy(300);
  if (twigY > -200) {
    ctx.save(); ctx.translate(0, twigY - 300);
    WD.branch(ctx, [[-200, 270], [300, 290], [700, 300], [1000, 312]], (u) => lerp(70, 26, u), { rimA: .6 });
    WD.leaf(ctx, 980, 312, 150, -2.5, '#6a8f34', { wid: .3 }); WD.leaf(ctx, 1000, 316, 120, -.5, '#8aa63c', { wid: .3 });
    ctx.restore();
  }
  // nymphs
  for (const f of FALLERS) {
    const rel = lt - f.delay * (f.i ? 1 : 0);
    let x, y, rot = 0, legs = 'walk', walk = lt * 3 + f.i, sc = (f.i === 0 ? .38 : .3) * (.85 + .15 * f.depth), alpha = 1, dig = 0;
    const lx = landX(f);
    if (rel < FALL0) {                    // lined up on the twig tip
      x = 560 + f.i * 46 - (f.i % 2) * 10; y = sy(300) - 30 - 100 * sc * 0 - 18; sc = .2; rot = 0;
      x = Math.min(x, 960); walk = lt * 2.4 + f.i;
      y = twigY - 20 - 100 * .2 + 8;
    } else if (rel < FALL1) {             // falling, tumbling
      const u = clamp((rel - FALL0) / (FALL1 - FALL0)), wy = 300 + (GY - 300) * Math.pow(u, 1.7);
      x = lerp(560 + f.i * 46, lx, ss(0, .6, u)) + Math.sin(lt * 2.2 + f.ph) * 30 * (1 - u);
      y = sy(wy) - (f.i ? (1 - f.depth) * 200 * Math.sin(u * 3) : 0);
      rot = (rel - FALL0) * f.spin + Math.sin(lt * 3 + f.ph) * .5; legs = 'walk'; walk = lt * 7 + f.i;
      if (f.i === 0) { // hero tumbles in close-up
        sc = lerp(.2, .42, ss(FALL0, FALL0 + .6, lt)) * (1 - ss(FALL1 - .5, FALL1, lt) * .3);
      }
    } else {                               // on the ground
      x = lx; y = gyS - 100 * sc + 4; rot = 0;
      const bounce = Math.max(0, Math.sin((lt - FALL1) * 12)) * Math.exp(-(lt - FALL1) * 6) * 18;
      y -= bounce;
      const wander = lt > FALL1 + .4 ? (lt - FALL1 - .4) : 0;
      if (f.i !== 3) x += Math.sin(wander * 1.3 + f.ph) * 14;
      walk = wander * 2.2 + f.i;
      if (f.i === 3 && lt > 5.0) { // the ant's victim, carried off in its jaws
        x = antX(lt) - 170; y = gyS - 120 + Math.sin(lt * 14) * 3; rot = -.5; walk = lt * 9; legs = 'walk';
      }
      const dk = f.i === 0 ? ss(5.0, 7.4, lt) : ss(5.2 + f.delay, 6.6 + f.delay, lt);
      if (dk > 0 && f.i !== 3) {
        const depth = f.i === 0 ? dk * 330 : dk * (90 + hash(f.i) * 80);
        x = lx + depth * .1; y = gyS + depth - 10; rot = lerp(0, 1.25, ss(0, .2, dk)); legs = 'dig'; dig = lt * 2 + f.i;
        alpha = f.i === 0 ? 1 : 1 - ss(.85, 1, dk) * .4;
      }
    }
    if (f.i === 0 && rel >= FALL0 && rel < FALL1) {
      // hero motion streak
      ctx.save(); ctx.globalAlpha = .22 * fallK; ctx.strokeStyle = '#fff3d8'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x, y - 30); ctx.lineTo(x, y - 200); ctx.stroke(); ctx.restore();
    }
    if (rel > FALL1 && rel < FALL1 + .45) { const k = (rel - FALL1) / .45; ctx.save(); ctx.fillStyle = `rgba(200,170,120,${.5 * (1 - k)})`; for (let q = 0; q < 8; q++) { const a = -Math.PI * (q / 7), r = 10 + k * 50; ctx.beginPath(); ctx.arc(lx + Math.cos(a) * r * 1.6, gyS - 6 + Math.sin(a) * r * .6, 4 * (1 - k) + 1, 0, TAU); ctx.fill(); } ctx.restore(); }
    Z.nymph(ctx, { x, y, sc, rot, flip: f.i % 2 ? -1 : 1, young: lt > 5 ? .78 : .92, legsMode: legs, walk, dig, ground: 100, rim: '#ffe8b8', rimA: .55, t: lt, alpha });
  }
  // the ant
  if (lt > 4.0 && lt < 7.5) {
    const ax = antX(lt), flip = lt > 5.0 ? -1 : 1;
    ctx.save(); ctx.translate(ax, gyS - 80); ctx.scale(flip, 1); WD.ant(ctx, 0, 0, 1.15, lt, '#140906', 0); ctx.restore();
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; G.glow(ctx, ax, gyS - 60, 200, '#ffb070', .12); ctx.restore();
  }
  // grass blades in front
  if (gyS < H + 100) WD.grass(ctx, -300, W + 300, gyS + 26, 60, { h: 150, colors: ['#1c2e12', '#2a4a1a', '#3a6a22'], t, seed: 8, sway: 1.2, rimC: '#ffd9a0' });
  ctx.restore();
  // speed lines while falling
  if (fallK > 0) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; const R = rng(5); for (let i = 0; i < 24; i++) { const x = R() * W, y0 = fract(R() + cy * .0007 * (1 + R())) * (H + 400) - 200; ctx.strokeStyle = `rgba(255,236,200,${.22 * fallK})`; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(x, y0); ctx.lineTo(x, y0 + 140 * fallK); ctx.stroke(); } ctx.restore(); }
  G.motes(ctx, t, 40, { color: '#ffecc0', seed: 6, a: .6, size: 1, drift: [10, -60 * (1 + fallK * 4)] });
  // graphics
  T.chapter(ctx, lt - .5, 3.6, 4, 'The Drop', 'newborns fall from the treetops');
  if (gyS < H) {
    const v = FALLERS[3], lx = landX(v);
    { const ax = antX(lt), p = [540 + (ax + (lt > 5 ? -60 : 60) - 540) * gz, 470 + (gyS - 90 - 470) * gz]; T.callout(ctx, lt - 4.3, 2.6, p[0], p[1], p[0] + 40, p[1] - 200, 'ANTS', 'many newborns never make it', { side: 1 }); }
    { const p = [540 + (HERO_X + 40 - 540) * gz, 470 + (gyS + 120 - 470) * gz]; T.callout(ctx, lt - 5.6, 1.9, p[0], p[1], p[0] + 110, p[1] + 150, 'DIGGING IN', 'front legs built like shovels', { side: 1 }); }
  }
}
const LANDX = [540, 150, 290, 410, 680, 810, 940, 220, 1010];
function landX(f) { return LANDX[f.i]; }
// the ant runs in from the left, seizes nymph #3 at 5.0 s, turns and hauls it away
function antX(lt) { const lx = LANDX[3]; return lt < 5.0 ? lerp(-300, lx - 150, ss(4.0, 4.95, lt)) : lerp(lx + 20, -520, ss(5.1, 7.3, lt)); }

module.exports = { eggs, drop, floor, groundScenery, litter, tunnel, GY };
