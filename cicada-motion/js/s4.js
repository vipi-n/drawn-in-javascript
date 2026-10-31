// Scenes 4: the emergence (dusk, a forest floor boiling with nymphs) and the last moult (night -> dawn).
const { C, W, H, TAU, clamp, lerp, inv, ss, io3, out3, out5, back, win, rgba, mix, ramp, rng, noise, fbm, hash, cues } = require('./core');
const { EV, SCENES, BEAT } = cues;
const G = require('./gfx');
const WD = require('./world');
const Z = require('./cicada');
const T = require('./type');
const CAM = require('./cam');
const S1 = require('./s1');
const fract = (x) => x - Math.floor(x);

const E0 = SCENES[6][1], M0 = SCENES[7][1];

// ================================================================== EMERGENCE 75 - 87.5
// world: ground plane drawn in perspective rows; the trunk stands at x = 1500 (world), camera trucks right and tilts up
const TRUNK = { x0: 1360, x1: 1760 };
function duskSky() {
  return G.cached('emSky', 2600, 1600, (c, w, h) => {
    const g = c.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#1a1840'); g.addColorStop(.35, '#5a2e5e'); g.addColorStop(.6, '#c4566a'); g.addColorStop(.78, '#ff9a5e'); g.addColorStop(1, '#ffc27a');
    c.fillStyle = g; c.fillRect(0, 0, w, h);
    const R = rng(3);
    for (let i = 0; i < 80; i++) { c.fillStyle = `rgba(255,240,230,${R() * .5})`; c.beginPath(); c.arc(R() * w, R() * h * .35, .6 + R(), 0, TAU); c.fill(); }
  });
}
function hillLayer(key, seed, col, y0, amp) {
  return G.cached(key, 2600, 900, (c, w, h) => {
    const R = rng(seed); c.fillStyle = col;
    for (let i = 0; i < 26; i++) { const x = (i + R() * .7) / 26 * w, wd = 18 + R() * 40, yt = y0 - R() * amp; c.beginPath(); c.moveTo(x - wd * .9, h); c.lineTo(x - wd * .4, yt); c.lineTo(x + wd * .4, yt); c.lineTo(x + wd * .9, h); c.fill(); c.beginPath(); c.ellipse(x, yt + 20, 90 + R() * 80, 70 + R() * 60, 0, 0, TAU); c.fill(); }
    c.fillRect(0, y0 + 40, w, h);
  });
}
// a crowd of nymphs with deterministic paths
const PREY = 17;
const CROWD = Array.from({ length: 190 }, (_, i) => {
  const r = (k) => hash(i * 31 + k);
  const z = Math.pow(r(1), .8);                         // 0 far .. 1 near
  const o = { i, z, x: -200 + r(2) * 2100, t0: .05 + r(3) * 7.2 * (i < 40 ? .35 : 1), v: 40 + r(4) * 50, ph: r(5) * TAU, climbX: TRUNK.x0 + 40 + r(6) * 300 };
  if (i === PREY) { o.z = .82; o.x = 620; o.t0 = 2.6; o.v = 70; }
  return o;
});
CROWD.sort((a, b) => a.z - b.z);
const GROUND_Y = (z) => lerp(690, 1010, z); // world y of a crowd row by depth
const SCALE = (z) => lerp(.07, .3, z);

function bird(ctx, x, y, sc, strike, carry, t) {
  ctx.save(); ctx.translate(x, y); ctx.scale(sc, sc);
  ctx.strokeStyle = '#3a2418'; ctx.lineWidth = 5; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-10, 60); ctx.lineTo(-14, 118); ctx.moveTo(14, 60); ctx.lineTo(24, 118); ctx.stroke();
  ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(-14, 118); ctx.lineTo(-34, 124); ctx.moveTo(-14, 118); ctx.lineTo(8, 124); ctx.moveTo(24, 118); ctx.lineTo(4, 124); ctx.moveTo(24, 118); ctx.lineTo(46, 124); ctx.stroke();
  ctx.fillStyle = '#3e2c20'; ctx.beginPath(); ctx.moveTo(-60, 10); ctx.lineTo(-168, 50); ctx.lineTo(-160, 70); ctx.lineTo(-50, 40); ctx.closePath(); ctx.fill();
  const g = ctx.createLinearGradient(0, -60, 0, 80); g.addColorStop(0, '#5a4232'); g.addColorStop(.5, '#6a4e38'); g.addColorStop(1, '#9a7a5a');
  ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(0, 10, 92, 70, -.12, 0, TAU); ctx.fill();
  ctx.fillStyle = '#433022'; ctx.beginPath(); ctx.ellipse(-26, 4, 64, 36, -.25, 0, TAU); ctx.fill();
  ctx.strokeStyle = 'rgba(255,220,180,.25)'; ctx.lineWidth = 2; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(-70 + i * 14, 20 + i * 3); ctx.lineTo(-20 + i * 10, -6 + i * 4); ctx.stroke(); }
  const bg = ctx.createRadialGradient(46, 18, 6, 46, 18, 70); bg.addColorStop(0, '#ff8e3e'); bg.addColorStop(1, 'rgba(220,90,40,0)');
  ctx.fillStyle = bg; ctx.beginPath(); ctx.ellipse(46, 20, 62, 52, 0, 0, TAU); ctx.fill();
  const hx = 84 + strike * 110, hy = -40 + strike * 80 - (carry ? 18 : 0);
  ctx.strokeStyle = '#5a4232'; ctx.lineWidth = 46; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(56, -10); ctx.lineTo(hx, hy); ctx.stroke();
  ctx.fillStyle = '#5a4232'; ctx.beginPath(); ctx.arc(hx, hy, 38, 0, TAU); ctx.fill();
  ctx.fillStyle = '#e8a844'; ctx.beginPath(); ctx.moveTo(hx + 30, hy - 8); ctx.lineTo(hx + 80, hy + 4 + strike * 6); ctx.lineTo(hx + 30, hy + 14); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#0a0806'; ctx.beginPath(); ctx.arc(hx + 12, hy - 8, 6.5, 0, TAU); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(hx + 14, hy - 10, 2, 0, TAU); ctx.fill();
  ctx.strokeStyle = 'rgba(255,190,140,.5)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 10, 90, -2.4, -1.2); ctx.stroke();
  ctx.restore();
  return [x + (84 + strike * 110 + 80) * sc, y + (-40 + strike * 80 + 4) * sc];
}

function emergence(ctx, lt, t) {
  const keys = [[0, 540, 760, 1.7, 0], [1.5, 600, 680, 1.2, 0], [4.5, 700, 700, 1.0, .004], [6.8, 900, 640, .95, 0], [8.8, 1300, 520, .95, 0], [10.6, 1520, 220, 1.0, -.01], [12.5, 1540, 40, 1.08, 0]];
  const beat = fract(t / BEAT);
  const c = CAM.at(keys, lt, { hand: 4, seed: 51, shakes: [[0, 18, .9], [EV.birdEat - E0, 8, .5]] });
  c.z *= 1 + .016 * Math.exp(-beat * 7) * ss(.5, 1.5, lt) * (1 - ss(10.5, 12, lt));
  const night = ss(2, 12.5, lt);
  const P = (d, fn) => { ctx.save(); CAM.apply(ctx, CAM.plane(c, d)); fn(); ctx.restore(); };
  P(.1, () => { ctx.drawImage(duskSky(), -760, -500); G.glow(ctx, 200, 640, 800, '#ff9a5a', .45 * (1 - night)); });
  ctx.fillStyle = `rgba(10,12,40,${night * .45})`; ctx.fillRect(0, 0, W, H);
  P(.25, () => ctx.drawImage(hillLayer('emh1', 61, '#5a2e52', 560, 260), -760, 120));
  P(.45, () => ctx.drawImage(hillLayer('emh2', 62, '#2e1a34', 620, 320), -760, 160));
  // fireflies
  P(.6, () => { ctx.save(); ctx.globalCompositeOperation = 'lighter'; for (let i = 0; i < 30; i++) { const x = -200 + hash(i) * 2200 + Math.sin(t * .4 + i) * 40, y = 420 + hash(i + 9) * 300 + Math.sin(t * .6 + i * 2) * 24, b = Math.max(0, Math.sin(t * 1.3 + i * 3.1)); G.glow(ctx, x, y, 14, '#d8ff7a', .8 * b * (.3 + night)); } ctx.restore(); });
  ctx.save(); CAM.apply(ctx, c);
  // forest floor
  const fl = G.cached('emFloor', 2800, 900, (cc, w, h) => {
    const g = cc.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#3a2626'); g.addColorStop(.25, '#2c1c18'); g.addColorStop(1, '#140c0a'); cc.fillStyle = g; cc.fillRect(0, 0, w, h);
    const R = rng(55);
    for (let i = 0; i < 700; i++) { const y = Math.pow(R(), .7) * h, z = Math.min(1, y / 520), x = R() * w, len = lerp(14, 90, z); WD.leaf(cc, x, y, len, (R() - .5) * 1.2 + (R() < .5 ? 0 : Math.PI), ['#4a3020', '#5e3d22', '#3a2618', '#6a4a2a', '#3c3220'][(R() * 5) | 0], { wid: .3 + R() * .12, a: .95, vein: z > .4 }); }
    const m = cc.createLinearGradient(0, 0, 0, 70); m.addColorStop(0, 'rgba(0,0,0,.6)'); m.addColorStop(1, 'rgba(0,0,0,0)'); cc.fillStyle = m; cc.fillRect(0, 0, w, 70);
  });
  ctx.drawImage(fl, -600, 660);
  // the trunk
  const bark = WD.barkTex('barkE', 900, 1600, ['#3a2a30', '#120a10', '#7a5a62'], 31);
  ctx.save(); ctx.beginPath(); ctx.moveTo(TRUNK.x0 - 80, 760); ctx.quadraticCurveTo(TRUNK.x0 - 10, 640, TRUNK.x0, 400); ctx.lineTo(TRUNK.x0 + 20, -1400); ctx.lineTo(TRUNK.x1 - 10, -1400); ctx.lineTo(TRUNK.x1, 400); ctx.quadraticCurveTo(TRUNK.x1 + 20, 640, TRUNK.x1 + 100, 760); ctx.closePath(); ctx.clip();
  WD.tileBark(ctx, bark, TRUNK.x0 - 120, -1500, TRUNK.x1 - TRUNK.x0 + 240, 800);
  const rg = ctx.createLinearGradient(TRUNK.x0, 0, TRUNK.x0 + 220, 0); rg.addColorStop(0, `rgba(255,150,120,${.5 * (1 - night * .6)})`); rg.addColorStop(1, 'rgba(255,150,120,0)'); ctx.fillStyle = rg; ctx.fillRect(TRUNK.x0 - 100, -1500, 400, 2300);
  const sh = ctx.createLinearGradient(TRUNK.x0, 0, TRUNK.x1, 0); sh.addColorStop(0, 'rgba(0,0,0,0)'); sh.addColorStop(1, 'rgba(0,0,10,.6)'); ctx.fillStyle = sh; ctx.fillRect(TRUNK.x0, -1500, TRUNK.x1 - TRUNK.x0, 2300);
  ctx.restore();
  // crowd: holes, emerging, marching, climbing
  const climbers = [];
  for (const n of CROWD) {
    const k = lt - n.t0; if (k < -.1) continue;
    const gy = GROUND_Y(n.z), sc = SCALE(n.z);
    // the hole
    ctx.save(); ctx.translate(n.x, gy); ctx.scale(1, .3);
    const hr = 70 * sc * ss(-.1, .2, k);
    if (hr < .5) { ctx.restore(); continue; }
    const hg = ctx.createRadialGradient(0, 0, hr * .2, 0, 0, hr * 1.5); hg.addColorStop(0, '#050202'); hg.addColorStop(.5, '#0c0604'); hg.addColorStop(.62, '#5a4128'); hg.addColorStop(1, 'rgba(74,53,36,0)');
    ctx.fillStyle = hg; ctx.beginPath(); ctx.arc(0, 0, hr * 1.5, 0, TAU); ctx.fill(); ctx.restore();
    if (k < 0) continue;
    const up = out3(clamp(k / .8));
    let x = n.x, y, rot = -Math.PI / 2 * (1 - ss(.5, 1.0, k)), legs = 'walk', walk = k * 2.6 + n.ph;
    const march = Math.max(0, k - .9) * n.v * lerp(.5, 1.6, n.z);
    x += march;
    if (k < 1.0) {
      y = gy + (1 - up) * 90 * sc;
      ctx.save(); ctx.beginPath(); ctx.rect(n.x - 300 * sc, gy - 400 * sc, 600 * sc, 400 * sc + 2); ctx.clip();
      Z.nymph(ctx, { x, y: y - 100 * sc * up, sc, rot, flip: 1, young: 0, legsMode: 'dig', dig: k * 2, ground: 100, rim: '#ff9a7a', rimA: .5 * (1 - night * .5), t: lt, red: 1, eyes: 1.05 });
      ctx.restore();
      continue;
    }
    if (n.i === PREY && lt > EV.birdEat - E0 - .05) continue; // eaten
    if (x > n.climbX && n.z > .25) { climbers.push({ n, k, sc, gy, over: x - n.climbX }); continue; }
    y = gy - 100 * sc + Math.abs(Math.sin(walk * Math.PI)) * 2;
    if (x > 2400) continue;
    Z.nymph(ctx, { x, y, sc, rot: 0, flip: 1, young: 0, legsMode: 'walk', walk, ground: 100, rim: '#ff9a7a', rimA: .5 * (1 - night * .5), t: lt, red: 1 });
  }
  for (const cl of climbers) {
    const { n, sc, gy, over } = cl;
    const y = gy - 60 * sc - over * 1.4;
    if (y < -1500) continue;
    Z.nymph(ctx, { x: n.climbX + 30 * sc * 0 + (n.z - .5) * 60, y, sc: sc * .9, rot: -Math.PI / 2, flip: 1, young: 0, legsMode: 'climb', walk: cl.k * 1.8 + n.ph, ground: 100, rim: '#ffa080', rimA: .5, t: lt, red: 1 });
  }
  // the robin
  const bT = EV.birdEat - E0;
  if (lt > bT - 1.6 && lt < bT + 2.4) {
    const prey = CROWD.find((n) => n.i === PREY), py = GROUND_Y(prey.z), px = prey.x + Math.max(0, bT - prey.t0 - .9) * prey.v * lerp(.5, 1.6, prey.z);
    const inK = out3(clamp((lt - bT + 1.6) / .8)), outK = ss(bT + 1.0, bT + 2.4, lt);
    const strike = ss(bT - .25, bT - .02, lt) * (1 - ss(bT + .05, bT + .4, lt));
    const bx = px - 270 + lerp(-600, 0, inK) - outK * 300, by = py - 150 - outK * 900 + Math.max(0, Math.sin((lt - bT + 1.6) * 7)) * 8 * (1 - outK);
    const tip = bird(ctx, bx, by, 1.1, strike, lt > bT, lt);
    if (lt > bT) Z.nymph(ctx, { x: tip[0] - 4, y: tip[1] + 6, sc: SCALE(prey.z) * .9, rot: 1.2, young: 0, legsMode: 'walk', walk: lt * 8, ground: 100, t: lt, red: 1 });
    if (outK > 0 && outK < 1) { const fl = Math.sin(t * 40); ctx.save(); ctx.fillStyle = 'rgba(70,50,36,.9)'; ctx.translate(bx - 10, by - 10); ctx.rotate(fl * .8 - .4); ctx.beginPath(); ctx.ellipse(-30, -40, 120 * .9, 30, -.5, 0, TAU); ctx.fill(); ctx.restore(); }
  }
  ctx.restore();
  // foreground grass + dust
  WD.grass(ctx, -40, W + 40, H + 40, 40, { h: 200, colors: ['#0e140a', '#162210', '#1e3016'], t, seed: 3, sway: 1.3, a: .97 });
  G.motes(ctx, t, 34, { color: '#ffcfa8', seed: 3, a: .5, size: 1, drift: [12, -6] });
  ctx.save(); ctx.globalCompositeOperation = 'soft-light'; ctx.fillStyle = `rgba(70,40,140,${.2 + night * .3})`; ctx.fillRect(0, 0, W, H); ctx.restore();
  // graphics
  T.chapter(ctx, lt - .5, 4.0, 7, 'Emergence', 'all on the same night, at dusk');
  const cA = win(1.0, 1.6, 10.6, 11.4, lt);
  if (cA > 0) {
    const n = Math.round(lerp(0, 1500000, io3(inv(1.0, 9.5, lt))));
    G.text(ctx, n.toLocaleString('en-US'), W - 64, 120, { font: 'Didot', size: 66, color: '#fff3dc', align: 'right', alpha: cA, shadow: 20 });
    G.text(ctx, 'EMERGING ON ONE ACRE', W - 64, 156, { font: 'OptB', size: 15, color: '#f2b25c', align: 'right', track: 5, alpha: cA });
  }
  const pr = CROWD.find((n) => n.i === PREY), bS = CAM.toScreen(c, pr.x + Math.max(0, EV.birdEat - E0 - pr.t0 - .9) * pr.v * lerp(.5, 1.6, pr.z) - 120, GROUND_Y(pr.z) - 260);
  T.callout(ctx, lt - (EV.birdEat - E0) - .2, 3.2, bS[0], bS[1], bS[0] + 40, bS[1] - 160, 'SAFETY IN NUMBERS', 'too many to eat — most survive', { side: 1 });
  const tS = CAM.toScreen(c, TRUNK.x0 + 160, 120);
  T.callout(ctx, lt - 9.6, 2.6, tS[0], tS[1], tS[0] - 120, tS[1] + 220, 'CLIMB', 'to a safe spot for the final moult', { side: -1 });
}

// ================================================================== THE MOULT 87.5 - 102.5
function moltBG(night) {
  return G.cached(night ? 'mbgN' : 'mbgD', W + 300, H + 300, (c, w, h) => {
    const g = c.createLinearGradient(0, 0, 0, h);
    if (night) { g.addColorStop(0, '#040c18'); g.addColorStop(.6, '#0a1c28'); g.addColorStop(1, '#04080c'); }
    else { g.addColorStop(0, '#f6b468'); g.addColorStop(.5, '#e38a54'); g.addColorStop(1, '#6a4a3a'); }
    c.fillStyle = g; c.fillRect(0, 0, w, h);
    c.filter = 'blur(30px)';
    const R = rng(night ? 61 : 62);
    for (let i = 0; i < 60; i++) { const x = R() * w, y = R() * h, r = 40 + R() * 150; c.fillStyle = night ? rgba(['#0e2a34', '#102030', '#163c42'][(R() * 3) | 0], .6) : rgba(['#c0703c', '#f0a860', '#8a5a3a'][(R() * 3) | 0], .6); c.beginPath(); c.ellipse(x, y, r, r * (.5 + R() * .6), R() * 3, 0, TAU); c.fill(); }
    c.filter = 'blur(4px)'; c.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 40; i++) { const x = R() * w, y = R() * h, r = 12 + R() * 40; const gg = c.createRadialGradient(x, y, r * .6, x, y, r); const col = night ? (R() < .5 ? [102, 224, 192] : [143, 184, 255]) : [255, 226, 160]; gg.addColorStop(0, `rgba(${col},.05)`); gg.addColorStop(.85, `rgba(${col},${.1 + R() * .12})`); gg.addColorStop(1, `rgba(${col},0)`); c.fillStyle = gg; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); }
  });
}
const edgeX = (y) => 700 + Math.sin(y * .007) * 12 + noise(y * .012) * 14;

function molt(ctx, lt, t) {
  const abs = t, L = (e) => e - M0;
  const dawn = ss(L(EV.sunrise) - 1.6, L(EV.sunrise) + .8, lt);
  const keys = [[0, 560, 640, 1.0, 0], [2.0, 560, 560, 1.18, 0], [L(EV.split), 545, 450, 1.32, -.01], [L(EV.hang[1]), 535, 520, 1.12, 0], [L(EV.wingsExpand[0]), 560, 420, 1.0, .006], [L(EV.sunrise), 540, 450, .96, 0], [15, 560, 470, 1.04, 0]];
  const c = CAM.at(keys, lt, { hand: 2.5, seed: 61, shakes: [[L(EV.split), 6, .5]] });
  const P = (d, fn) => { ctx.save(); CAM.apply(ctx, CAM.plane(c, d)); fn(); ctx.restore(); };
  P(.25, () => { ctx.drawImage(moltBG(true), -150, -150); if (dawn > 0) { ctx.globalAlpha = dawn; ctx.drawImage(moltBG(false), -150, -150); ctx.globalAlpha = 1; } });
  P(.3, () => { G.glow(ctx, 160, 140, 500, '#bcd8ff', .2 * (1 - dawn)); G.glow(ctx, 160, 140, 50, '#eaf2ff', .9 * (1 - dawn)); if (dawn > 0) G.lightShafts(ctx, lt, -100, 260, .35, .8, 1700, '#ffd49a', .14 * dawn, 9, 4); });
  ctx.save(); CAM.apply(ctx, c);
  // trunk
  const bark = WD.barkTex('barkM', 900, 1600, ['#3a2c22', '#100906', '#8a6a52'], 5);
  ctx.save(); ctx.beginPath(); ctx.moveTo(edgeX(-400), -400); for (let y = -400; y <= 1500; y += 30) ctx.lineTo(edgeX(y), y); ctx.lineTo(1600, 1500); ctx.lineTo(1600, -400); ctx.closePath(); ctx.clip();
  WD.tileBark(ctx, bark, 640, -500, 800, 1600);
  const rimC = mix('#7fd8ff', '#ffb870', dawn);
  const rg = ctx.createLinearGradient(690, 0, 960, 0); rg.addColorStop(0, rgba(rimC, .45 + .2 * dawn)); rg.addColorStop(1, rgba(rimC, 0)); ctx.fillStyle = rg; ctx.fillRect(640, -500, 400, 2000);
  const tg = ctx.createLinearGradient(700, 0, 1300, 0); tg.addColorStop(0, 'rgba(0,0,0,0)'); tg.addColorStop(1, 'rgba(0,0,0,.65)'); ctx.fillStyle = tg; ctx.fillRect(700, -500, 900, 2000);
  ctx.restore();
  // a few other moulters in the dark further up the trunk
  [[790, 120, .45], [880, 920, .5]].forEach(([x, y, s], i) => { Z.nymph(ctx, { x, y, sc: s * .6, rot: -Math.PI / 2, exuvia: 1, t: abs, legsMode: 'grip', ground: 100, rim: rgba(rimC), rimA: .4, alpha: .7 }); if (i === 0) Z.adult(ctx, { x: x - 60, y: y - 120, sc: s * .55, rot: -Math.PI / 2, m: lerp(.15, .9, dawn), wingSize: lerp(.6, 1, dawn), legs: 'cling', ground: 118, t: abs, alpha: .75, rim: rgba(rimC), rimA: .4 }); });
  // ---- the hero moult
  // the shell grips the bark facing up; head at the top. Shell origin (nymph space) = N, scale SN
  const N = [600, 640], SN = .95;
  const climb = 1 - out3(clamp((lt + .2) / 1.4));
  const shellY = N[1] + climb * 520;
  const crack = ss(L(EV.split) - .35, L(EV.split) + .5, lt);
  // the adult pose: emerges headfirst from the split, arches back to hang, then curls up to grab the shell, then sits above it
  const emerge = ss(L(EV.split), L(EV.hang[0]), lt);       // body sliding out of the split
  const hang = ss(L(EV.hang[0]) - .5, L(EV.hang[0]) + .6, lt) * (1 - ss(L(EV.curlUp) - .4, L(EV.curlUp) + .7, lt));
  const free = ss(L(EV.curlUp) - .2, L(EV.curlUp) + 1.3, lt);
  const m = ss(L(EV.wingsExpand[1]) - 2, L(EV.harden[1]), lt) * .97 + .03 * ss(L(EV.harden[1]) - .5, L(EV.harden[1]) + 2, lt);
  const wings = ss(L(EV.wingsExpand[0]), L(EV.wingsExpand[1]), lt);
  const SA = .74;
  // pivot = the split on the shell's back (in world coords; shell faces up so its back faces left (-x))
  const piv = [N[0] - 70 * SN, N[1] - 30 * SN];
  let rot = -Math.PI / 2 - .2, ox, oy;
  // emerging: slides upward out of the split, then arches backwards (rotates toward -PI .. -3.6) hanging head-down
  const archAng = lerp(-Math.PI / 2 - .1, -3.75, hang);
  const freeAng = -Math.PI / 2 - .04;
  rot = lerp(archAng, freeAng, free);
  const along = lerp(lerp(-120, 40, emerge), 40, free);
  ox = piv[0] + Math.cos(rot) * along * SA * 2.2 + lerp(0, 46, free);
  oy = piv[1] + Math.sin(rot) * along * SA * 2.2 + lerp(0, -330, free);
  if (lt > L(EV.split) - .1) {
    // clip: until fully out, the adult only exists outside the shell
    ctx.save();
    if (emerge < 1 && free < .5) { ctx.beginPath(); ctx.rect(-400, -600, 2000, 2400); ctx.moveTo(piv[0] + 40, piv[1] + 120); ctx.ellipse(N[0] + 5, N[1] + 60, 70 * SN, 170 * SN, 0, 0, TAU); ctx.clip('evenodd'); }
    ctx.globalCompositeOperation = 'lighter'; G.glow(ctx, ox, oy, 260 * SA, '#e8ffd8', .18 * (1 - m)); ctx.globalCompositeOperation = 'source-over';
    Z.adult(ctx, { x: ox, y: oy, sc: SA, rot, flip: 1, m, wingSize: lerp(.16, 1, io3(wings)), crumple: 1 - ss(.0, 1, wings) * .98, wingOpen: lerp(.3, 0, ss(.6, 1, wings)) * (1 - hang * .7), legs: hang > .5 ? 'dangle' : 'cling', dangle: 1 - hang, ground: 118, t: abs, light: dawn > .5 ? [-.7, -.3] : [.4, -.6], rim: rgba(rimC), rimA: .6, eyeGlow: .1 * (1 - m) });
    ctx.restore();
  }
  // the shell (exuvia once vacated)
  Z.nymph(ctx, { x: N[0], y: shellY, sc: SN, rot: -Math.PI / 2, young: 0, red: 1, exuvia: emerge > .9 ? 1 : 0, legsMode: lt < 1.2 ? 'climb' : 'grip', walk: lt * 1.4, ground: 100, crack, t: abs, rim: rgba(rimC), rimA: .5, light: [.3, -1], alpha: lerp(1, .9, emerge) });
  if (crack > 0 && emerge < 1) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; G.glow(ctx, piv[0] + 10, piv[1], 300 * crack, '#e8ffcc', .3 * crack * (1 - emerge * .6)); ctx.restore(); }
  // dew glints on the new skin
  if (lt > L(EV.curlUp)) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; for (let q = 0; q < 10; q++) { const a = hash(q) * TAU, r = 40 + hash(q + 3) * 200, k = Math.max(0, Math.sin(t * 2 + q * 1.7)); G.glow(ctx, ox - 60 + Math.cos(a) * r * .4, oy + 60 + Math.sin(a) * r, 9, '#ffffff', .6 * k); } ctx.restore(); }
  ctx.restore();
  // sunrise flare + foreground leaf
  const flare = win(L(EV.sunrise) - 1, L(EV.sunrise) + .2, L(EV.sunrise) + .8, L(EV.sunrise) + 2.4, lt);
  if (flare > 0) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; G.glow(ctx, 80, 300, 1100, '#ffd08a', .55 * flare); G.glow(ctx, 80, 300, 220, '#fff4d8', .9 * flare); ctx.restore(); }
  ctx.save(); ctx.translate(-(c.x - 540) * 1.4, -(c.y - 540) * 1.4); G.blurred(ctx, 16, (cc) => { WD.leaf(cc, -140, 980, 600, -.5, dawn > .5 ? '#3a4a1a' : '#06141a', { vein: false, wid: .32 }); WD.leaf(cc, 320, 1200, 520, -1.2, dawn > .5 ? '#3a4a1a' : '#06141a', { vein: false, wid: .3 }); }, { alpha: .9 }); ctx.restore();
  G.motes(ctx, t, 30, { color: dawn > .5 ? '#ffe2b0' : '#bfe6ff', seed: 4, a: .6, size: 1, drift: [4, -10] });
  // graphics
  T.chapter(ctx, lt - .6, 4.2, 8, 'The Last Moult', 'one final skin to shed — at night');
  const sS = CAM.toScreen(c, piv[0], piv[1]);
  T.callout(ctx, lt - L(EV.split) - .2, 2.4, sS[0], sS[1], sS[0] - 150, sS[1] - 160, 'THE BACK SPLITS', 'the adult pulls itself out', { side: -1 });
  const aS = CAM.toScreen(c, ox - 120, oy - 40);
  T.callout(ctx, lt - L(EV.wingsExpand[0]) - .3, 3.4, aS[0], aS[1], 140, 380, 'WINGS INFLATE', 'blood is pumped into the veins', { side: 1 });
  T.callout(ctx, lt - L(EV.harden[0]) - .5, 3.0, aS[0] + 30, aS[1] + 120, 140, 760, 'HARDENING', 'from soft white to black in hours', { side: 1 });
}

module.exports = { emergence, molt, bird };
