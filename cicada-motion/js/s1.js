// Scenes 1: prologue (dusk forest + title) and the song (courtship + egg laying).
const { C, W, H, TAU, clamp, lerp, inv, ss, io3, out3, back, win, rgba, mix, rng, noise, fbm, hash, cues } = require('./core');
const { EV, BEAT } = cues;
const G = require('./gfx');
const WD = require('./world');
const Z = require('./cicada');
const CA = require('./cutaway');
const T = require('./type');
const CAM = require('./cam');

// ------------------------------------------------------------------ shared cached art
function duskSky() {
  return G.cached('duskSky', W, 1500, (c, w, h) => {
    const g = c.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#0b1230'); g.addColorStop(.25, '#2a2350'); g.addColorStop(.45, '#7a3f5e'); g.addColorStop(.6, '#d9714a'); g.addColorStop(.7, '#ffb25e'); g.addColorStop(.76, '#ffd890'); g.addColorStop(.82, '#c46a3a'); g.addColorStop(1, '#2a1410');
    c.fillStyle = g; c.fillRect(0, 0, w, h);
    const R = rng(4);
    for (let i = 0; i < 160; i++) { const x = R() * w, y = R() * h * .32, a = (1 - y / (h * .32)) * (.3 + R() * .6); c.fillStyle = `rgba(255,246,225,${a})`; c.beginPath(); c.arc(x, y, .6 + R() * 1.3, 0, TAU); c.fill(); }
    // long cloud streaks lit from below
    c.filter = 'blur(10px)';
    for (let i = 0; i < 14; i++) { const y = h * (.36 + R() * .26), x = R() * w, len = 200 + R() * 500; c.fillStyle = rgba(R() < .5 ? '#ff9a6a' : '#c45a6a', .25 + R() * .25); c.beginPath(); c.ellipse(x, y, len, 8 + R() * 14, 0, 0, TAU); c.fill(); }
  });
}
// a silhouette forest layer: trunks + canopy, colour col, with a lit fog base
function forestLayer(key, seed, col, n, wmin, wmax, top, fogCol) {
  return G.cached(key, 1700, 1300, (c, w, h) => {
    const R = rng(seed);
    c.fillStyle = col;
    for (let i = 0; i < n; i++) {
      const x = (i + R() * .8) / n * w, wd = wmin + R() * (wmax - wmin), lean = (R() - .5) * 30, yt = top + R() * 120;
      c.beginPath(); c.moveTo(x - wd * .5 - wd * .5, h); c.quadraticCurveTo(x - wd * .5, h - 120, x - wd * .45, h - 300); c.lineTo(x - wd * .4 + lean, yt); c.lineTo(x + wd * .4 + lean, yt); c.lineTo(x + wd * .45, h - 300); c.quadraticCurveTo(x + wd * .5, h - 120, x + wd, h); c.fill();
      // a couple of branches
      for (let b = 0; b < 2; b++) { const by = yt + 80 + R() * 400, s = R() < .5 ? -1 : 1; c.lineWidth = wd * .18; c.strokeStyle = col; c.beginPath(); c.moveTo(x + lean * .5, by); c.quadraticCurveTo(x + s * 60, by - 40, x + s * (120 + R() * 140), by - 90 - R() * 80); c.stroke(); }
    }
    for (let i = 0; i < 22; i++) { const x = R() * w, y = top - 40 + R() * 160, r = 90 + R() * 160; c.beginPath(); c.ellipse(x, y, r, r * .55, 0, 0, TAU); c.fill(); }
    c.fillRect(0, 0, w, top + 40);
    const fg = c.createLinearGradient(0, h - 420, 0, h); fg.addColorStop(0, rgba(fogCol, 0)); fg.addColorStop(.7, rgba(fogCol, .55)); fg.addColorStop(1, rgba(fogCol, .8));
    c.globalCompositeOperation = 'source-atop'; c.fillStyle = fg; c.fillRect(0, h - 420, w, 420);
  });
}
// blurred foreground foliage on an oversized canvas (drawn at -PAD) so camera parallax never reveals an edge
const PAD = 400;
function fgLeaves(key, seed, dark = true) {
  return G.cached(key, W + PAD * 2, H + PAD * 2, (c) => {
    c.translate(PAD, PAD);
    c.filter = 'blur(14px)';
    const cols = dark ? ['#0b130b', '#101c10', '#152616'] : ['#1f3a18', '#2c5222', '#3e6a2a'];
    WD.foliage(c, -40, -40, 300, 220, 22, { colors: cols, seed, size: 240, sway: 0 });
    WD.foliage(c, 80, H + 40, 280, 120, 12, { colors: cols, seed: seed + 3, size: 260, sway: 0 });
  });
}

// ------------------------------------------------------------------ PROLOGUE 0 - 7.5
const TRUNK_X = 760;
const tEdge = (y) => TRUNK_X + Math.sin(y * .006) * 12 + noise(y * .01) * 9;
function prologue(ctx, lt, t) {
  const c = CAM.at([[0, 540, 380, 1.32, -.01], [2.5, 540, 530, 1.03, 0], [5, 560, 548, 1.06, .004], [7.5, 600, 560, 1.12, .006]], lt, { hand: 3, shakes: [[EV.title, 9, .7]] });
  const draw = (d, fn) => { ctx.save(); CAM.apply(ctx, CAM.plane(c, d)); fn(); ctx.restore(); };
  draw(.12, () => {
    ctx.drawImage(duskSky(), 0, -300);
    const sx = 330, sy = 780;
    G.glow(ctx, sx, sy, 900, '#ff9a50', .5); G.glow(ctx, sx, sy, 300, '#ffd590', .85); G.glow(ctx, sx, sy, 70, '#fff6de', 1, .4);
  });
  draw(.3, () => ctx.drawImage(forestLayer('pfar', 11, '#6a3a52', 13, 18, 40, 140, '#ff9a5e'), -310, -60));
  draw(.3, () => G.lightShafts(ctx, lt, 330, 780, -.25, 1.4, 1500, '#ffc78a', .07, 9, 6));
  draw(.48, () => ctx.drawImage(forestLayer('pmid', 12, '#3a2234', 10, 30, 70, 60, '#d7704a'), -310, -40));
  draw(.68, () => ctx.drawImage(forestLayer('pnear', 13, '#1a1018', 7, 60, 120, -40, '#8a3a2a'), -310, 0));
  // fireflies between the layers
  draw(.7, () => { ctx.save(); ctx.globalCompositeOperation = 'lighter'; for (let i = 0; i < 26; i++) { const x = hash(i) * 1200 - 60 + Math.sin(t * .4 + i) * 40, y = 640 + hash(i + 9) * 420 + Math.sin(t * .6 + i * 2) * 26, b = Math.max(0, Math.sin(t * 1.4 + i * 3.1)); G.glow(ctx, x, y, 16, '#d8ff8a', .85 * b); } ctx.restore(); });
  draw(1, () => {
    // the singing trunk
    const bark = WD.barkTex('barkP', 900, 1600, ['#2a1c16', '#0c0706', '#7a5844'], 7);
    ctx.save();
    ctx.beginPath(); ctx.moveTo(tEdge(-400), -400); for (let y = -400; y <= 1500; y += 30) ctx.lineTo(tEdge(y), y); ctx.lineTo(1500, 1500); ctx.lineTo(1500, -400); ctx.closePath(); ctx.clip();
    WD.tileBark(ctx, bark, TRUNK_X - 40, -400, 700, 1500);
    const rg = ctx.createLinearGradient(TRUNK_X - 10, 0, TRUNK_X + 200, 0); rg.addColorStop(0, 'rgba(255,150,80,.55)'); rg.addColorStop(.25, 'rgba(255,140,80,.12)'); rg.addColorStop(1, 'rgba(0,0,0,.35)');
    ctx.fillStyle = rg; ctx.fillRect(TRUNK_X - 20, -400, 700, 1900);
    ctx.restore();
    // cicadas clinging to the trunk edge, singing
    const chorus = 1 - ss(EV.chorusFade[0], EV.chorusFade[1], lt);
    [[90, 1, .3], [300, -1, .27], [470, 1, .33], [690, -1, .29], [880, 1, .31]].forEach(([y, dir, sc], i) => {
      const x = tEdge(y) - 4;
      const pulse = Math.max(0, Math.sin(t * 34 + i * 2)) * chorus;
      Z.adult(ctx, { x: x + 40 * sc, y, sc, rot: -Math.PI / 2, flip: dir, legs: 'cling', ground: 118, sil: .82, pulse, t, light: [-1, -.2], rim: '#ffb060', rimA: .9 });
      T.soundArcs(ctx, x - 50, y - dir * 40 * sc * 0, t + i * .13, chorus * .55, { ang: Math.PI, spread: 1.4, speed: 260, period: .2, color: '#ffd7a0' });
    });
  });
  // silhouettes crossing the sky
  draw(.55, () => { for (let i = 0; i < 4; i++) { const k = (lt * .09 + i * .27) % 1, x = lerp(-120, 900, k), y = 300 + i * 90 + Math.sin(lt * 1.3 + i) * 20, fl = Math.sin(t * 90 + i); Z.adult(ctx, { x, y, sc: .08 + i * .015, flip: 1, wingOpen: 1, flap: fl, ghost: [{ fl, a: .6 }, { fl: Math.sin(t * 90 + i + 1.6), a: .4 }], legs: 'air', sil: 1, t }); } });
  G.motes(ctx, t, 50, { color: '#ffe0a8', seed: 7, size: 1.1, a: .7, drift: [-12, -8] });
  ctx.save(); ctx.translate(-(c.x - 540) * 1.3, -(c.y - 540) * 1.3); ctx.drawImage(fgLeaves('pfg', 4), -PAD, -PAD); ctx.restore();
  // the title
  const ta = ss(EV.title - .1, EV.title + .3, lt) * (1 - ss(6.3, 7.3, lt));
  if (ta > 0) {
    const sc = ctx.createRadialGradient(470, 520, 0, 470, 520, 560); sc.addColorStop(0, `rgba(12,6,10,${.5 * ta})`); sc.addColorStop(1, 'rgba(12,6,10,0)');
    ctx.fillStyle = sc; ctx.fillRect(0, 0, W, H);
    T.title(ctx, lt - EV.title + .2, 470, 560, ta, { size: 150 });
    const k = ss(EV.title + .7, EV.title + 1.4, lt);
    G.text(ctx, 'MAGICICADA  SEPTENDECIM', 470, 382, { font: 'OptB', size: 20, color: '#ffe2b8', align: 'center', track: 12, alpha: k * ta });
    G.text(ctx, 'seventeen years in the dark  ·  four weeks in the sun', 470, 630, { font: 'IoI', size: 26, color: '#ffd7a0', align: 'center', alpha: ss(EV.title + 1.2, EV.title + 2, lt) * ta, shadow: 14 });
  }
  // dusk thins into the morning
  ctx.fillStyle = `rgba(20,10,8,${.25 * ss(5.5, 7.5, lt)})`; ctx.fillRect(0, 0, W, H);
}

// ------------------------------------------------------------------ SONG 7.5 - 20
function morningBG() {
  return G.cached('morningBG', 1400, 1400, (c, w, h) => {
    const g = c.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#f6c76c'); g.addColorStop(.3, '#e6b456'); g.addColorStop(.6, '#8f9a3e'); g.addColorStop(1, '#2b4220');
    c.fillStyle = g; c.fillRect(0, 0, w, h);
    const R = rng(12);
    c.filter = 'blur(34px)';
    for (let i = 0; i < 90; i++) { const x = R() * w, y = R() * h, r = 50 + R() * 170, k = R(); c.fillStyle = rgba(k < .3 ? '#ffe39a' : k < .55 ? '#b4bf4c' : k < .82 ? '#55822e' : '#22401e', .3 + R() * .4); c.beginPath(); c.ellipse(x, y, r, r * (.5 + R() * .5), R() * 3, 0, TAU); c.fill(); }
    c.filter = 'blur(3px)'; c.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 46; i++) { const x = R() * w, y = R() * h * .75, r = 14 + R() * 46; const gg = c.createRadialGradient(x, y, r * .6, x, y, r); gg.addColorStop(0, 'rgba(255,240,190,.06)'); gg.addColorStop(.85, `rgba(255,236,170,${.1 + R() * .12})`); gg.addColorStop(1, 'rgba(255,236,170,0)'); c.fillStyle = gg; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); }
  });
}
const BR = [[-260, 900], [200, 840], [620, 760], [1000, 690], [1400, 640]];
const brTh = (u) => lerp(92, 48, u);
function brAt(x) {
  for (let i = 0; i < BR.length - 1; i++) if (x <= BR[i + 1][0] || i === BR.length - 2) {
    const f = clamp((x - BR[i][0]) / (BR[i + 1][0] - BR[i][0])), u = (i + f) / (BR.length - 1);
    const y = lerp(BR[i][1], BR[i + 1][1], f), a = Math.atan2(BR[i + 1][1] - BR[i][1], BR[i + 1][0] - BR[i][0]);
    return { y: y - brTh(u) / 2 * Math.cos(a) + 3, a };
  }
}
// body origin so that an adult of scale sc stands on the branch at x
function onBranch(x, sc, lift = 0) { const b = brAt(x); return { x: x + Math.sin(b.a) * (118 * sc + lift), y: b.y - Math.cos(b.a) * (118 * sc + lift), a: b.a }; }

function songWorld(ctx, lt, t, c) {
  const draw = (d, fn) => { ctx.save(); CAM.apply(ctx, CAM.plane(c, d)); fn(); ctx.restore(); };
  draw(.25, () => ctx.drawImage(morningBG(), -160, -160));
  draw(.4, () => G.lightShafts(ctx, lt, 1100, -100, 2.15, .9, 1600, '#ffe6a8', .1, 8, 3));
  draw(.55, () => { // a soft out-of-focus twig behind
    G.blurred(ctx, 6, (cc) => { cc.lineCap = 'round'; cc.strokeStyle = '#4a3a22'; cc.lineWidth = 26; cc.beginPath(); cc.moveTo(-100, 380); cc.quadraticCurveTo(400, 300, 900, 120); cc.stroke(); WD.foliage(cc, 520, 260, 260, 90, 18, { colors: ['#4d7a2a', '#6a8f34'], seed: 21, size: 120, t: lt }); }, { alpha: .8 });
  });
}
function songBranch(ctx, lt) {
  WD.branch(ctx, BR, brTh, { rimA: .7 });
  const R = rng(41);
  for (let i = 0; i < 8; i++) {
    const x = -100 + i * 170 + R() * 60, b = brAt(x), sw = Math.sin(lt * 1.1 + i) * .05;
    WD.leaf(ctx, x, b.y + brTh(.5) * .7, 150 + R() * 80, Math.PI * (.3 + R() * .35) + sw, ['#3a5f23', '#587f2c', '#2d4a1e'][i % 3], { wid: .3 });
  }
  // a fresh twig sprouting up-right (where she will lay)
  ctx.strokeStyle = '#5a4026'; ctx.lineWidth = 16; ctx.lineCap = 'round';
}

const SC = .58;
function song(ctx, lt, t) {
  const c = CAM.at([[0, 560, 600, 1.0, 0], [3, 600, 590, 1.04, -.01], [5.2, 520, 610, 1.02, 0], [7.5, 430, 640, 1.1, .01], [9.6, 250, 700, 1.5, 0], [12.5, 210, 720, 1.62, .01]], lt, { hand: 3, seed: 8 });
  ctx.fillStyle = '#2a2a14'; ctx.fillRect(0, 0, W, H);
  songWorld(ctx, lt, t, c);
  ctx.save(); CAM.apply(ctx, c);
  songBranch(ctx, lt);
  const L = (e) => e - cues.SCENES[1][1];
  const calls = EV.maleCall.map(([a, b]) => [L(a), L(b)]);
  const callA = calls.reduce((m, [a, b]) => Math.max(m, ss(a, a + .25, lt) * (1 - ss(b - .35, b, lt))), 0);
  // male: sings, walks to her, then flies off
  const walkK = ss(L(EV.walk[0]), L(EV.walk[1]), lt), mx = lerp(800, 600, walkK);
  const fly = ss(8.6, 10.2, lt);
  let p = onBranch(mx, SC);
  let mxx = p.x, myy = p.y, mrot = p.a, mlegs = walkK > 0 && walkK < 1 ? 'walk' : 'perch', mOpen = callA * .04, mflap = 0, ghost = null;
  if (lt > 8.6) {
    const fl = Math.sin(t * 140); mlegs = 'air'; mOpen = 1; mflap = fl; ghost = [{ fl, a: .6 }, { fl: Math.sin(t * 140 + 1.6), a: .45 }, { fl: Math.sin(t * 140 + 3.2), a: .3 }];
    mxx += fly * fly * 700; myy -= fly * 520 + Math.sin(fly * 3) * 20; mrot = lerp(p.a, -.5, ss(0, .3, fly));
  }
  if (fly < 1) Z.adult(ctx, { x: mxx, y: myy, sc: SC, flip: -1, rot: mrot, m: 1, pulse: callA * (.5 + .5 * Math.sin(t * TAU * 21)), wingOpen: mOpen, flap: mflap, ghost, legs: mlegs, walk: lt * 1.8, ground: 118, t, light: [-.4, -1], rim: '#ffe2a6', rimA: .65, eyeGlow: callA * .25 });
  // song arcs + oscilloscope
  if (callA > 0) {
    const hx = mxx - 250 * SC, hy = myy - 40 * SC;
    T.soundArcs(ctx, mxx - 60 * SC, myy - 40 * SC, t, callA * .7, { ang: Math.PI * 1.1, spread: 1.8, speed: 330, period: .12, color: '#fff3d0', w: 3 });
    T.soundArcs(ctx, mxx - 60 * SC, myy - 40 * SC, t * .5, callA * .4, { ang: Math.PI * 1.1, spread: 2.6, speed: 260, period: .4, n: 4, life: 2, color: '#ffd28a', w: 5 });
  }
  // female: flies in from the upper left and lands
  const land0 = L(EV.femaleLand) - 1.3, land1 = L(EV.femaleLand), fx0 = 300;
  let fx, fy, fOpen = 0, fflap = 0, flegs = 'perch', frot, fghost = null;
  const fp = onBranch(fx0, SC);
  if (lt < land0) { fx = -500; fy = -500; frot = 0; }
  else if (lt < land1) {
    const q = (lt - land0) / (land1 - land0), e = out3(q);
    fx = lerp(-200, fp.x, e); fy = lerp(220, fp.y, q * q * (3 - 2 * q)) + Math.sin(q * 7) * 26 * (1 - q);
    const fl = Math.sin(t * 150); fOpen = 1; fflap = fl; flegs = 'air'; frot = lerp(-.3, fp.a, q);
    fghost = [{ fl, a: .6 }, { fl: Math.sin(t * 150 + 1.6), a: .45 }, { fl: Math.sin(t * 150 + 3.2), a: .3 }];
  } else { fx = fp.x; fy = fp.y; frot = fp.a; }
  const flick = (e) => { const k = (lt - L(e)) / .3; return k > 0 && k < 1 ? Math.sin(k * Math.PI) : 0; };
  const fk = Math.max(flick(EV.flick[0]), flick(EV.flick[1]));
  if (lt >= land1) { fOpen = fk * .5; fflap = .3; }
  const ov = ss(L(EV.cutStart) - .2, L(EV.cutStart) + .6, lt);
  const saw = lt > L(EV.cutStart) ? Math.sin((lt - L(EV.cutStart)) * 24) : 0;
  if (lt > land0) {
    Z.adult(ctx, { x: fx, y: fy + Math.abs(saw) * 2 * ov, sc: SC, flip: 1, rot: frot + saw * ov * .01 - ov * .06, m: 1, wingOpen: fOpen, flap: fflap, ghost: fghost, legs: flegs, ground: 118, t, ovip: ov, light: [-.4, -1], rim: '#ffe2a6', rimA: .65 });
    if (fk > .05) T.soundArcs(ctx, fx + 60, fy - 60, lt, fk * .7, { ang: 0, spread: 1.6, speed: 260, period: .1, n: 3, life: .5, color: '#ffe0c8' });
  }
  // sawdust spray
  if (ov > .5 && lt < 12.4) {
    const tip = [fx - 330 * SC, fy + 60 * SC];
    ctx.save(); const R = rng(Math.floor(lt * 30)); ctx.fillStyle = 'rgba(232,200,140,.9)';
    for (let i = 0; i < 10; i++) { const a = R() * TAU, r = R() * 34; ctx.fillRect(tip[0] + Math.cos(a) * r, tip[1] + Math.sin(a) * r * .6 - R() * 10, 2.5, 2.5); }
    ctx.restore();
  }
  // pairing sparkle
  const pk = win(L(EV.pair) - .4, L(EV.pair), L(EV.pair) + .4, L(EV.pair) + 1.6, lt);
  if (pk > 0) { const px = (fx + 240 * SC + mxx - 240 * SC) / 2, py = Math.min(fy, myy) - 70; ctx.save(); ctx.globalCompositeOperation = 'lighter'; G.glow(ctx, px, py, 200, '#ffd8a0', .5 * pk); for (let i = 0; i < 12; i++) { const a = i / 12 * TAU + lt, r = 40 + (lt - L(EV.pair) + .4) * 80; G.glow(ctx, px + Math.cos(a) * r, py + Math.sin(a) * r * .6, 12, '#fff2cc', .8 * pk); } ctx.restore(); }
  ctx.restore();
  // foreground + light
  ctx.save(); ctx.translate(-(c.x - 540) * 1.25, -(c.y - 600) * 1.25); ctx.globalAlpha = .9; ctx.drawImage(fgLeaves('sfg', 9, false), -PAD, -PAD); ctx.restore();
  G.motes(ctx, t, 55, { color: '#fff0c0', seed: 5, a: .75, size: 1.2, drift: [10, -9] });
  ctx.save(); ctx.globalCompositeOperation = 'soft-light'; ctx.fillStyle = 'rgba(255,170,80,.25)'; ctx.fillRect(0, 0, W, H); ctx.restore();

  // ---- graphics
  const ms = CAM.toScreen(c, mxx - 70 * SC, myy - 20 * SC);
  T.chapter(ctx, lt - .5, 4.2, 1, 'The Song', 'males sing to call a mate');
  const sc0 = calls[0][0];
  T.scope(ctx, 64, 150, 260, 60, t, ss(sc0, calls[1][1], lt), win(sc0 - .3, sc0, calls[1][1], calls[1][1] + .6, lt), 'MALE CALL  ·  RISE – HOLD – FALL');
  T.callout(ctx, lt - 1.6, 3.4, ms[0], ms[1], ms[0] + 30, ms[1] - 170, 'TYMBALS', 'drum-like ribs click 300× a second');
  const fs = CAM.toScreen(c, fx + 40, fy - 80 * SC);
  T.callout(ctx, lt - L(EV.flick[0]) + .1, 1.9, fs[0], fs[1], fs[0] - 40, fs[1] - 150, 'WING FLICK', 'she answers: “yes”', { side: -1 });
  T.chapter(ctx, lt - 8.0, 4.4, 2, 'The Eggs', 'she saws slits in twigs · up to 600 eggs');
  // the lens: inside the twig, eggs going in
  const tipS = CAM.toScreen(c, fx - 330 * SC + 10, fy + 70 * SC);
  T.lens(ctx, lt - 8.4, 4.4, tipS[0], tipS[1], 690, 330, 230, (cc, R) => {
    CA.draw(cc, { cx: 690, cy: 330, s: .62, r: 0, ox: -60, oy: -110, ...cutState(lt), t: lt });
  }, { label: 'INSIDE THE TWIG', sr: 22, labelTop: true });
}

// eggs pushed into the slit two at a time, one pair per beat
function cutState(lt) {
  const L = (e) => e - cues.SCENES[1][1];
  const cutT = L(EV.cutStart) + .3;
  const reveal = clamp((lt - cutT) / 1.0) * 760;
  const eggs = [];
  const lay = EV.eggLay.map(L);
  for (let n = 0; n < 12; n++) { const t0 = lay[(n / 2) | 0] + (n % 2) * .2; eggs.push({ u: clamp((lt - t0) / .5), dev: 0 }); }
  let blade = -1, shake = 0;
  if (lt > cutT - .3) {
    if (lt < cutT + 1.1) { blade = lerp(0, 760, clamp((lt - cutT) / 1.0)); shake = Math.sin(lt * 34) * 22; }
    else { let q = 0; for (const l of lay) { const d = lt - l; if (d > -.3 && d < .45) q = Math.max(q, Math.sin(clamp((d + .3) / .75) * Math.PI)); } blade = 20 + q * 120; }
  }
  return { reveal: lt > cutT ? reveal : 0, blade, bladeShake: shake, eggs };
}

module.exports = { PAD, prologue, song, morningBG, fgLeaves, cutState, brAt, onBranch, BR, brTh, songWorld, songBranch, forestLayer, duskSky };
