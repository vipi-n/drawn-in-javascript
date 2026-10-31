// Scenes 3: seventeen years underground, then the awakening. One continuous world (y = 0 is the soil surface).
const { C, W, H, TAU, clamp, lerp, inv, ss, io3, out3, outElastic, win, rgba, mix, ramp, rng, noise, fbm, hash, cues } = require('./core');
const { EV, SCENES, BEAT, yearTime, moltTime } = cues;
const G = require('./gfx');
const WD = require('./world');
const Z = require('./cicada');
const UG = require('./underground');
const T = require('./type');
const CAM = require('./cam');
const fract = (x) => x - Math.floor(x);

const U0 = SCENES[4][1], A0 = SCENES[5][1];
// ------------------------------------------------------------------ world layout
const HERO_ROOT = [[-700, 1000], [0, 975], [560, 955], [1000, 975], [1700, 1030]];
const ROOTS = [
  [[790, 20], [850, 260], [820, 560], [720, 820], [640, 955]],
  [[820, 30], [1000, 300], [1250, 640], [1500, 900], [2000, 1200]],
  [[740, 40], [520, 240], [200, 420], [-200, 560], [-800, 640]],
  [[1250, 640], [1150, 900], [1100, 1250], [1180, 1600]],
  [[200, 420], [120, 760], [-60, 1200], [-120, 1700]],
  [[-60, 1200], [300, 1350], [700, 1420], [1100, 1460]],
];
const ROOT_TH = [62, 52, 48, 34, 32, 28];
const HERO = { x: 560, top: 955 - 28 };
// other nymphs in their chambers: [x, y(top surface), scale, rot, flip]
const OTH = [[180, 400, .55, .35, -1], [1180, 760, .58, -.25, 1], [-70, 1050, .6, -.6, 1], [1120, 1240, .52, .1, -1], [310, 1310, .56, .15, 1], [860, 1440, .5, -.05, -1], [-380, 590, .5, .25, 1], [1560, 960, .55, -.5, -1]];
const LEAD = [[540, 0], [552, 150], [522, 330], [566, 520], [604, 700], [580, 840], [565, 900]];
const INST = [.3, .38, .46, .55, .64];

function instar(abs) { let i = 0; EV.molts.forEach((y, k) => { if (abs >= moltTime(y) + .45) i = k + 1; }); return i; }
function nymphScale(abs) { let s = INST[0]; EV.molts.forEach((y, k) => { s = lerp(s, INST[k + 1], ss(.25, .75, (abs - moltTime(y)) / .9)); }); return s; }
function moltPhase(abs) { for (const y of EV.molts) { const p = (abs - moltTime(y)) / .9; if (p >= 0 && p < 1) return p; } return -1; }
function yearsAt(abs) { return clamp((abs - EV.year1) / EV.yearStep + 1, 0, 17); }

function catmull(pts, u) {
  const n = pts.length - 1, f = clamp(u) * n, k = Math.min(n - 1, Math.floor(f)), t = f - k;
  const p0 = pts[Math.max(0, k - 1)], p1 = pts[k], p2 = pts[k + 1], p3 = pts[Math.min(n, k + 2)];
  const cr = (a, b, c, d) => .5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t * t + (-a + 3 * b - 3 * c + d) * t * t * t);
  return [cr(p0[0], p1[0], p2[0], p3[0]), cr(p0[1], p1[1], p2[1], p3[1])];
}
function leadPos(u) { const p = catmull(LEAD, u), q = catmull(LEAD, Math.min(1, u + .02)), r = catmull(LEAD, Math.max(0, u - .02)); return { x: p[0], y: p[1], a: Math.atan2(q[1] - r[1], q[0] - r[0]) }; }
function leadTrail(u) { const out = []; for (let k = 0; k <= 30; k++) { const v = k / 30 * u; out.push(catmull(LEAD, v)); } return out; }

// ------------------------------------------------------------------ the surface world above (seasons)
function seasonCols(season) {
  const sky = ramp([[0, '#9fd2ea'], [.25, '#5aa8de'], [.5, '#e7a06c'], [.75, '#8da0c2'], [1, '#9fd2ea']], season);
  const sky2 = ramp([[0, '#e8f6ec'], [.25, '#d8eef6'], [.5, '#f8cf92'], [.75, '#e2e8f2'], [1, '#e8f6ec']], season);
  const leaf = ramp([[0, '#8fcf62'], [.2, '#3f8f34'], [.45, '#4a8a30'], [.55, '#e0882c'], [.66, '#b5502a'], [.72, '#6b5a4c'], [1, '#8fcf62']], season);
  const leafA = season > .68 && season < .97 ? .0 : season > .6 ? 1 - ss(.6, .7, season) : season < .05 ? ss(-.05, .05, season) : 1;
  const ground = ramp([[0, '#6aa040'], [.3, '#4f8a2c'], [.55, '#8a7a3a'], [.72, '#eef2f6'], [.95, '#e8eef2'], [1, '#6aa040']], season);
  return { sky, sky2, leaf, leafA, ground, snow: win(.68, .74, .92, .99, season) };
}
function canopyShapes() {
  return G.cached('canopyMask', 1400, 900, (c) => {
    const R = rng(51); c.fillStyle = '#fff';
    for (let i = 0; i < 70; i++) { const a = R() * TAU, r = Math.sqrt(R()); c.beginPath(); c.arc(700 + Math.cos(a) * 560 * r, 470 + Math.sin(a) * 300 * r, 70 + R() * 90, 0, TAU); c.fill(); }
  });
}
function above(ctx, yearF, t, a) {
  if (a <= 0) return;
  const season = fract(yearF + .15), S = seasonCols(season);
  ctx.save(); ctx.globalAlpha *= a;
  const g = ctx.createLinearGradient(0, -1700, 0, 0); g.addColorStop(0, rgba(S.sky)); g.addColorStop(1, rgba(S.sky2));
  ctx.fillStyle = g; ctx.fillRect(-1600, -1700, 4400, 1700);
  G.glow(ctx, 1500, -1200, 600, '#fff2c8', .5);
  // distant trees
  ctx.fillStyle = rgba(mix(S.leaf, S.sky2, .55)); for (let i = 0; i < 12; i++) { const x = -1500 + i * 360 + hash(i) * 100; ctx.beginPath(); ctx.ellipse(x, -40, 220, 200 + hash(i + 3) * 120, 0, Math.PI, 0); ctx.fill(); }
  // the tree
  const bark = WD.barkTex('barkU', 900, 1600, ['#4a3526', '#1d130e', '#8a6a4a'], 17);
  ctx.save(); ctx.beginPath(); ctx.moveTo(620, 10); ctx.quadraticCurveTo(690, -120, 690, -400); ctx.lineTo(700, -1400); ctx.lineTo(840, -1400); ctx.lineTo(850, -400); ctx.quadraticCurveTo(850, -120, 940, 10); ctx.closePath(); ctx.clip();
  ctx.drawImage(bark, 600, -1500, 360, 1520); ctx.restore();
  // canopy (season colour, falls away in winter)
  if (S.leafA > .01) {
    const m = canopyShapes();
    const L = G.getLayer(3); L.ctx.setTransform(1, 0, 0, 1, 0, 0); L.ctx.clearRect(0, 0, W, H); L.ctx.globalCompositeOperation = 'source-over';
    ctx.save(); ctx.globalAlpha *= S.leafA;
    ctx.drawImage(m, 70, -1880);
    ctx.globalCompositeOperation = 'source-atop';
    const cg = ctx.createLinearGradient(0, -1880, 0, -980); cg.addColorStop(0, rgba(mix(S.leaf, [255, 255, 220], .25))); cg.addColorStop(1, rgba(mix(S.leaf, [0, 0, 0], .35)));
    ctx.fillStyle = cg; ctx.fillRect(-500, -1900, 2400, 1000);
    ctx.restore();
  }
  // bare branches in winter
  ctx.strokeStyle = '#3a2a20'; ctx.lineCap = 'round';
  for (let i = 0; i < 6; i++) { ctx.lineWidth = 14 - i; const s = i % 2 ? 1 : -1; ctx.beginPath(); ctx.moveTo(770, -1200 + i * 60); ctx.quadraticCurveTo(770 + s * 160, -1320 + i * 40, 770 + s * (300 + i * 30), -1500 + i * 50); ctx.stroke(); }
  // ground strip
  ctx.fillStyle = rgba(S.ground); ctx.fillRect(-1600, -26, 4400, 30);
  WD.grass(ctx, -1500, 2700, 2, 140, { h: 60, colors: [rgba(mix(S.ground, [0, 0, 0], .2)), rgba(S.ground)], t, seed: 4, sway: .6 });
  // falling leaves / snow
  const R = rng(9);
  if (season > .5 && season < .72) for (let i = 0; i < 40; i++) { const x = -300 + R() * 2000 + Math.sin(t * 2 + i) * 30, y = -1300 + fract(R() + t * .25) * 1300; ctx.fillStyle = rgba(R() < .5 ? '#e0882c' : '#b5502a', .9); ctx.save(); ctx.translate(x, y); ctx.rotate(t * 3 + i); ctx.fillRect(-9, -4, 18, 8); ctx.restore(); }
  if (S.snow > 0) { ctx.fillStyle = `rgba(255,255,255,${.85 * S.snow})`; for (let i = 0; i < 120; i++) { const x = -800 + R() * 3000 + Math.sin(t + i) * 20, y = -1700 + fract(R() + t * .12) * 1700; ctx.beginPath(); ctx.arc(x, y, 3 + R() * 4, 0, TAU); ctx.fill(); } }
  ctx.restore();
}

// ------------------------------------------------------------------ the soil world
function soilBlock(ctx) {
  const tex = WD.soilTex('soil', 1920, 2600, 11);
  ctx.drawImage(tex, -900, -10);
  ctx.save(); ctx.translate(1020 + 1920, -10); ctx.scale(-1, 1); ctx.drawImage(tex, 0, 0); ctx.restore();
  const dk = ctx.createLinearGradient(0, 0, 0, 2400); dk.addColorStop(0, 'rgba(0,0,0,0)'); dk.addColorStop(.35, 'rgba(8,4,2,.3)'); dk.addColorStop(1, 'rgba(4,2,1,.7)');
  ctx.fillStyle = dk; ctx.fillRect(-900, 0, 4000, 2600);
  ctx.fillStyle = '#1e140b'; ctx.fillRect(-1600, -4, 4400, 8);
}
function chamber(ctx, x, y, rx, ry, a) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(a);
  const g = ctx.createRadialGradient(0, 0, ry * .2, 0, 0, rx);
  g.addColorStop(0, 'rgba(14,8,4,.95)'); g.addColorStop(.7, 'rgba(22,13,7,.92)'); g.addColorStop(1, 'rgba(22,13,7,0)');
  ctx.scale(1, ry / rx); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, rx, 0, TAU); ctx.fill();
  ctx.restore();
}
// all nymph poses as a function of time: {x,y,sc,rot,flip,young,red,legsMode,dig,walk}
function otherPose(o, i, abs) {
  const [x, y, sc0, rot, flip] = o;
  const grow = .55 + .45 * clamp(yearsAt(abs) / 17), sc = sc0 * grow;
  const up = ss(A0 + .6 + hash(i) * .8, A0 + 6.6 + hash(i + 3) * .6, abs);
  const turn = ss(A0 + .2 + hash(i) * .5, A0 + 1.2 + hash(i) * .5, abs);
  const r = lerp(rot, -Math.PI / 2, turn);
  const yy = lerp(y - 100 * sc, -40, up);
  return { x: x + Math.sin(i * 3 + abs) * 2 * turn, y: yy, sc, rot: r, flip: turn > .5 ? 1 : flip, young: lerp(.5, 0, clamp(yearsAt(abs) / 14)), red: ss(15, 17, yearsAt(abs)), legsMode: turn > .1 ? 'dig' : 'climb', dig: abs * 1.6 + i, walk: Math.sin(abs * .4 + i) * .05, up, y0: y };
}
function heroPose(abs) {
  const lt = abs - U0;
  if (lt < 3.75) { // descending the tunnel
    const u = lerp(.36, 1, io3(clamp(lt / 3.75)));
    const p = leadPos(u);
    return { x: p.x, y: p.y, sc: .3, rot: p.a, flip: 1, young: .78, legsMode: 'dig', dig: abs * 1.8, u };
  }
  const sc = nymphScale(abs), yr = yearsAt(abs);
  let x = HERO.x, y = HERO.top - 100 * sc, rot = -.04, legs = 'climb', dig = 0;
  const up = ss(A0 + .8, A0 + 7.3, abs), turn = ss(A0 + .1, A0 + .9, abs);
  if (turn > 0) { rot = lerp(-.04, -Math.PI / 2, turn); legs = 'dig'; dig = abs * 2.2; y = lerp(y, -60, up); x = lerp(HERO.x, 540, up); }
  return { x, y, sc, rot, flip: 1, young: lerp(.6, 0, clamp(yr / 13)), red: ss(15, 17, yr), legsMode: legs, dig, walk: Math.sin(abs * .5) * .05, up };
}

// the back-filled burrow a digging nymph leaves behind: a soft darker channel in the soil
function digTrail(ctx, x, y0, y1, w) {
  if (y1 <= y0) return;
  ctx.save();
  const g = ctx.createLinearGradient(x - w, 0, x + w, 0);
  g.addColorStop(0, 'rgba(14,8,4,0)'); g.addColorStop(.3, 'rgba(14,8,4,.55)'); g.addColorStop(.5, 'rgba(10,6,3,.7)'); g.addColorStop(.7, 'rgba(14,8,4,.55)'); g.addColorStop(1, 'rgba(14,8,4,0)');
  ctx.fillStyle = g; ctx.fillRect(x - w, y0, w * 2, y1 - y0);
  ctx.strokeStyle = 'rgba(255,200,140,.06)'; ctx.lineWidth = 2; for (let k = 0; k < 6; k++) { const yy = y0 + (y1 - y0) * (k + .5) / 6; ctx.beginPath(); ctx.moveTo(x - w * .5, yy); ctx.quadraticCurveTo(x, yy + 10, x + w * .5, yy); ctx.stroke(); }
  ctx.restore();
}
function world(ctx, abs, c, o = {}) {
  const yearF = yearsAt(abs);
  const warm = o.warm ?? 0;
  above(ctx, Math.max(0, yearF - 1) * 1, abs, o.aboveA ?? 1);
  soilBlock(ctx);
  if (warm > 0) { const wg = ctx.createLinearGradient(0, 0, 0, 1700); wg.addColorStop(0, `rgba(255,130,50,${.32 * warm})`); wg.addColorStop(1, `rgba(255,90,30,${.08 * warm})`); ctx.fillStyle = wg; ctx.fillRect(-900, 0, 4000, 2600); }
  const feed = ss(EV.rootFind - .6, EV.rootFind + .3, abs) * (1 - ss(A0, A0 + 1, abs));
  // roots
  ROOTS.forEach((pts, i) => UG.root(ctx, pts, ROOT_TH[i] * lerp(.7, 1, clamp(yearF / 17)), 0, abs, { sap: feed * .6, seed: 5 + i, glowC: '#b8ffcf' }));
  UG.root(ctx, HERO_ROOT, 58 * lerp(.8, 1, clamp(yearF / 17)), 0, abs, { sap: feed, seed: 3, glowC: '#b8ffcf' });
  // worms
  const lt = abs - U0;
  if (lt > 8 && lt < 17) UG.worm(ctx, lerp(-600, 1700, (lt - 8) / 9), 700, 380, abs, 0, 0);
  if (lt > 19 && lt < 27) UG.worm(ctx, lerp(2000, -800, (lt - 19) / 8), 1180, 420, abs, 0, 2, '#b86f6c');
  // other nymphs
  OTH.forEach((o2, i) => {
    const p = otherPose(o2, i, abs);
    chamber(ctx, o2[0], o2[1] - 50 * o2[2], 190 * p.sc, 130 * p.sc, o2[3]);
    if (p.up > 0) digTrail(ctx, o2[0], p.y + 40 * p.sc, o2[1] - 40, 150 * p.sc);
    Z.nymph(ctx, { ...p, ground: 100, rim: '#ffc890', rimA: .35, t: abs });
  });
  // the hero's tunnel + chamber
  const hp = heroPose(abs);
  const trailU = hp.u ?? 1;
  UG.tunnel(ctx, leadTrail(trailU), 30, 0);
  if (hp.u == null) chamber(ctx, HERO.x - 10, HERO.top - 46 * hp.sc, 230 * hp.sc, 120 * hp.sc, -.04);
  if (hp.up > 0) digTrail(ctx, hp.x, hp.y + 40 * hp.sc, HERO.top - 40, 150 * hp.sc);
  // cast skins
  EV.molts.forEach((y, k) => {
    const mt = moltTime(y) + .5; if (abs < mt) return;
    const sh = clamp((abs - mt) / .8);
    const sx = HERO.x - 190 - k * 120, sy = HERO.top + 6 - 100 * INST[k] * .9 + (1 - out3(sh)) * -40;
    Z.nymph(ctx, { x: sx, y: sy, sc: INST[k] * .9, rot: [-.12, .1, -.05, .14][k], flip: 1, exuvia: 1, alpha: .8 * ss(0, .3, sh), t: abs, legsMode: 'grip', ground: 100 });
  });
  // moult: inner glow, shake, shards
  const mp = moltPhase(abs);
  const shake = mp >= 0 ? Math.sin(mp * 90) * 4 * Math.sin(mp * Math.PI) : 0;
  if (mp >= 0) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; G.glow(ctx, hp.x, hp.y, 380 * hp.sc, '#fff1c0', .7 * Math.sin(mp * Math.PI)); ctx.restore(); }
  let young = hp.young; EV.molts.forEach((y) => { const s = abs - moltTime(y) - .45; if (s > 0 && s < 2.2) young = Math.max(young, .9 * (1 - s / 2.2)); });
  Z.nymph(ctx, { ...hp, young, x: hp.x + shake, crack: mp >= 0 ? ss(.1, .45, mp) * (1 - ss(.5, .7, mp)) : 0, ground: 100, rim: '#ffcc90', rimA: .42, t: abs, light: [-.2, -1], wet: mp >= .5 ? 1 - ss(.5, 1, mp) : 0 });
  // sap drops into the beak
  if (feed > .3 && hp.u == null) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const bx = hp.x + 128 * hp.sc, by = hp.y + 68 * hp.sc;
    for (let q = 0; q < 6; q++) { const k = fract(abs * .9 + q / 6); G.glow(ctx, bx + Math.sin(k * 6 + q) * 3, lerp(HERO.top + 18, by, k), 10, '#c8ffe0', .9 * Math.sin(k * Math.PI) * feed); }
    ctx.restore();
  }
  return hp;
}

function underground(ctx, lt, t) {
  const abs = t, hp = heroPose(abs);
  const yr = yearsAt(abs);
  const follow = ss(0, 3.75, lt);
  const keys = [[0, hp.x, 330, 1.25, 0], [3.75, 560, 860, 1.5, 0], [8, 575, 870, 1.66, .01], [14.6, 590, 875, 1.78, -.005], [19.5, 560, 560, .5, 0], [24, 560, 600, .54, .006], [30, 560, 640, .58, 0]];
  let c = CAM.at(keys, lt, { hand: 3, seed: 31, shakes: EV.molts.map((y) => [moltTime(y) - U0 + .4, 6, .6]) });
  if (lt < 3.75) { c.x = lerp(c.x, hp.x, .8); c.y = hp.y; }
  const warm = ss(EV.warm - .5, EV.warm18, abs);
  ctx.fillStyle = '#1a120c'; ctx.fillRect(0, 0, W, H);
  ctx.save(); CAM.apply(ctx, c);
  world(ctx, abs, c, { warm, aboveA: 1 });
  ctx.restore();
  UG.dust(ctx, t, c.y * .3, 50, 3, .45);
  const dk = ctx.createRadialGradient(W / 2, H * .55, H * .3, W / 2, H * .55, H * .85); dk.addColorStop(0, 'rgba(0,0,0,0)'); dk.addColorStop(1, 'rgba(0,0,0,.5)'); ctx.fillStyle = dk; ctx.fillRect(0, 0, W, H);
  // graphics
  T.chapter(ctx, lt - .4, 4.2, 5, 'Underground', 'seventeen years in the dark');
  const n = Math.floor(yr + 1e-6), frac = fract(yr);
  T.dial(ctx, W - 110, 120, ss(EV.year1 - U0 - .6, EV.year1 - U0, lt), 'YEAR', String(Math.max(1, n)).padStart(2, '0'), n, n >= 17 ? 1 : frac, { max: 17 });
  const ins = instar(abs);
  G.text(ctx, `INSTAR ${['I', 'II', 'III', 'IV', 'V'][ins]}`, W - 110, 222, { font: 'OptB', size: 14, color: '#f2b25c', align: 'center', track: 5, alpha: ss(EV.year1 - U0 - .6, EV.year1 - U0, lt) });
  const bS = CAM.toScreen(c, hp.x + 128 * hp.sc, hp.y + 74 * hp.sc);
  T.callout(ctx, lt - 4.6, 3.6, bS[0], bS[1], bS[0] + 60, bS[1] + 190, 'XYLEM SAP', 'sipped from the roots, drop by drop', { side: 1 });
  EV.molts.forEach((y, k) => { const mt = moltTime(y) - U0, p = CAM.toScreen(c, hp.x - 40 * hp.sc, hp.y - 80 * hp.sc); if (k < 3) T.callout(ctx, lt - mt - .1, 1.8, p[0], p[1], p[0] - 50, p[1] - 170, 'MOULT', ['shedding a tight skin', 'growing bigger', 'four times underground'][k], { side: -1 }); });
  const oS = CAM.toScreen(c, OTH[1][0], OTH[1][1] - 60);
  T.callout(ctx, lt - 20.2, 3.6, oS[0], oS[1], oS[0] - 40, oS[1] - 200, 'A HIDDEN BROOD', 'millions waiting under one forest', { side: -1 });
  T.chapter(ctx, lt - 26.6, 4.2, 6, 'Year Seventeen', 'the soil warms — they all wake together');
  const thA = ss(EV.warm - U0 + .2, EV.warm - U0 + .8, lt);
  if (thA > 0) { const temp = lerp(9, 18, io3(inv(EV.warm - U0, EV.warm18 - U0, lt))); UG.thermometer(ctx, 96, 330, 300, temp, t, thA); G.text(ctx, `${temp.toFixed(1)} °C`, 96, 280, { font: 'Didot', size: 38, color: '#fff3dc', align: 'center', alpha: thA }); }
}

function awakening(ctx, lt, t) {
  const abs = t, hp = heroPose(abs);
  const keys = [[0, 560, 640, .58, 0], [1.5, 560, 600, .62, 0], [4, 560, 360, .78, 0], [6.6, 545, 130, 1.25, 0], [7.5, 540, 40, 1.7, 0]];
  const beat = (abs / BEAT) % 1;
  const c = CAM.at(keys, lt, { hand: 4 + lt, seed: 41, shakes: [[5.0, 5], [6.2, 8], [7.1, 12]] });
  c.z *= 1 + .02 * Math.exp(-beat * 6) * ss(1, 3, lt);
  ctx.fillStyle = '#1a120c'; ctx.fillRect(0, 0, W, H);
  ctx.save(); CAM.apply(ctx, c);
  world(ctx, abs, c, { warm: 1, aboveA: 1 });
  // mud turrets at the surface
  const tk = ss(EV.turret - A0 - .4, EV.turret - A0 + 2.4, lt);
  if (tk > 0) [540, ...OTH.map((o) => o[0])].forEach((x, i) => {
    const th = tk * (60 + hash(i) * 20), tw = 40;
    ctx.save(); ctx.translate(x, 2);
    const g = ctx.createLinearGradient(-tw, 0, tw, 0); g.addColorStop(0, '#2c1b10'); g.addColorStop(.4, '#6a4a2e'); g.addColorStop(1, '#2a190e');
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(-tw * 1.3, 0); ctx.quadraticCurveTo(-tw * .8, -th * .5, -tw * .5, -th); ctx.lineTo(tw * .5, -th); ctx.quadraticCurveTo(tw * .8, -th * .5, tw * 1.3, 0); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#0d0704'; ctx.beginPath(); ctx.ellipse(0, -th, tw * .45, 6, 0, 0, TAU); ctx.fill();
    ctx.restore();
  });
  // dirt crumbs falling from the diggers
  ctx.save(); const R = rng(17);
  for (const p of [hp, ...OTH.map((o, i) => otherPose(o, i, abs))]) { if (!(p.up > 0 && p.up < 1)) continue; for (let q = 0; q < 10; q++) { const k = fract(abs * 1.5 + R()); ctx.fillStyle = rgba('#7a5636', (1 - k) * .9); ctx.fillRect(p.x - 40 * p.sc + R() * 80 * p.sc, p.y + 120 * p.sc + k * 160 * p.sc, 5, 5); } }
  ctx.restore();
  ctx.restore();
  // heartbeat pulse
  const hb = Math.pow(Math.max(0, Math.sin(Math.PI * fract(abs / BEAT))), 8) * ss(0, 2, lt);
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; G.glow(ctx, W / 2, H * .6, H * .9, '#ff6a2a', .08 * hb); ctx.restore();
  const dk = ctx.createRadialGradient(W / 2, H * .55, H * .3, W / 2, H * .55, H * .85); dk.addColorStop(0, 'rgba(0,0,0,0)'); dk.addColorStop(1, 'rgba(0,0,0,.5)'); ctx.fillStyle = dk; ctx.fillRect(0, 0, W, H);
  const thA = 1 - ss(.6, 1.4, lt);
  if (thA > 0) { UG.thermometer(ctx, 96, 330, 300, 18, t, thA); G.text(ctx, '18.0 °C', 96, 280, { font: 'Didot', size: 38, color: '#fff3dc', align: 'center', alpha: thA }); }
  const cA = win(2.0, 2.6, 6.4, 7.0, lt);
  if (cA > 0) {
    const n = Math.round(lerp(0, 1500000, io3(inv(2.0, 6.2, lt))));
    G.text(ctx, n.toLocaleString('en-US'), 64, H - 150, { font: 'Didot', size: 66, color: '#fff3dc', alpha: cA, shadow: 20 });
    G.text(ctx, 'NYMPHS PER ACRE · DIGGING UP', 66, H - 112, { font: 'OptB', size: 15, color: '#f2b25c', track: 5, alpha: cA });
  }
  const tS = CAM.toScreen(c, 540, -40);
  T.callout(ctx, lt - 4.0, 2.6, tS[0], tS[1], tS[0] + 80, tS[1] - 150, 'MUD TURRETS', 'chimneys built while they wait', { side: 1 });
}

module.exports = { underground, awakening };
