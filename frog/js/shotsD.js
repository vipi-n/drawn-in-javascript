// Act IV: froglet leaves the water in the rain (S9), growing up on land through summer into autumn (S10),
// hibernation under the ice (S11), spring: the cycle begins again + finale (S12).
const { W, H, TAU, clamp, lerp, hash, rgba, mix, ss, io3, out3, in3, spring, noise, wobble } = require('./core');
const G = require('./gfx');
const Cm = require('./cam');
const Wt = require('./water');
const Wd = require('./world');
const Sk = require('./sky');
const Fl = require('./flora');
const Fr = require('./frog');
const Cr = require('./critters');
const Sp = require('./spawn');
const An = require('./anim');
const T = require('./type');
const AN = require('./anchors');
const { SHOT, EV } = require('./cues');

const SUMMER = { top: '#6f8a3a', side: '#97934a', belly: '#f0e0b0', line: '#262010', leg: '#86843f' };
// a tongue strike: returns {mouth, tongue k} for a strike starting at ts, aimed at (tx,ty) in rig-local units
function strikeAt(t, ts, tx, ty) {
  const e = t - ts;
  if (e < -.05 || e > .7) return { mouth: 0, k: 0, eyeIn: 0 };
  const mouth = e < 0 ? 0 : e < .06 ? out3(e / .06) : e < .3 ? 1 : 1 - io3((e - .3) / .2);
  const k = e < .04 ? 0 : e < .14 ? out3((e - .04) / .1) : e < .2 ? 1 : 1 - io3((e - .2) / .12);
  const eyeIn = ss(.35, .45, e) * (1 - ss(.6, .7, e));
  return { mouth, k, eyeIn, tx, ty };
}

// ---------------------------------------------------------------- S9: froglet (over-under, summer, rain)
const PADS = [[-420, 8, 120], [300, -6, 90], [-60, -30, 70], [520, -40, 60], [-640, -50, 56]];
function s9(g, e, t) {
  const cam = Cm.rig([[0, 0, 160, 1.15], [2.4, 0, 30, 1.2], [4.8, 30, 0, 1.12], [7.2, 50, -10, 1.3], [8.6, 60, -20, 1.42], [9.6, 40, -40, 1.6]], e, { hand: .5, seed: 91 });
  const rain = ss(EV.rain - SHOT.froglet, EV.rain - SHOT.froglet + 1.4, e);
  const wy = Cm.toScreen(cam, 0, 0, 1)[1] + Math.sin(t * 1.4) * 4;
  const hy = wy - 160 * cam.z;
  const [px, py] = Cm.toScreen(cam, 40, 0, 1), padR = 150 * cam.z;
  // hero path: swim up (0-2.4), hop onto the pad (2.4-3.4), sit; strike at 108.0; hop toward the lens at the end
  const sw = An.stroke(e, 1.0);
  const climb = ss(2.4, 3.3, e), z = cam.z;
  let hx = px - 60 * z + (1 - ss(0, 2.4, e)) * -120 * z, hyy = lerp(wy + 420 * z, wy + 26 * z, io3(ss(0, 2.4, e)));
  hyy = lerp(hyy, wy - 8 * z - Fr.groundY({ sit: 1 }) * .62 * z, out3(climb)) - Math.sin(Math.PI * climb) * 60 * z;
  const st = strikeAt(t, EV.tongue1, 260, -70);
  const hopOut = ss(8.9, 9.6, e);
  const hero = {
    x: hx + hopOut * 120 * z, y: hyy - Math.sin(Math.PI * Math.min(1, hopOut * 1.4)) * 140 * z, s: .62 * z * (1 + hopOut * 1.8), flip: 1, tad: .12 * (1 - ss(4, 9, e)), tailLen: lerp(.14, .02, ss(3, 9, e)), legs: 1, arms: 1, t, swim: .05,
    pose: climb < .05 ? An.swimPose(sw.ext) : hopOut > 0 ? { leap: hopOut, crouch: 1 - hopOut } : { sit: climb, float: 1 - climb }, pitch: climb < .05 ? -.6 : hopOut * -.3,
    pal: SUMMER, young: 1, wet: 1.3, blink: An.blink(t, 21), mouth: st.mouth, tongue: { x: st.tx, y: st.ty, k: st.k }, eyeIn: st.eyeIn, throat: An.throat(t) * .4,
  };
  // little froglets climbing out all around
  const others = [[-420, 8, .4, 3.0], [300, -6, .36, 4.2], [-60, -30, .3, 5.0], [-640, -50, .28, 5.8], [520, -40, .3, 6.4]];
  Wd.overUnder(g, wy, t, (a) => {
    Wd.aboveSet(a, cam, t, {
      sky: 'day', skyMix: ['storm', rain * .75], hy, wy, clouds: 1, cloudCol: mix('#ffffff', '#c8ccd0', rain), cloudShadow: '#6a7a8a', sun: [820 - cam.x * .1, hy - 260, 30, 1 - rain * .9],
      trees: [mix('#3f6a42', '#5a6a66', rain), mix('#28502e', '#3a4a46', rain)], mist: .18 + rain * .3, mistCol: '#e8f0e8', waterDeep: '#2a4a3a', glint: '#ffffff',
    });
    Cm.push(a, cam, 1);
    for (const [x, y, r] of PADS) Fl.lilyPad(a, x, y, r, { flat: .24, rot: hash(x) * TAU, c: '#4f8f3a' });
    Fl.waterLily(a, 210, -14, .9, {});
    a.restore();
    Fl.lilyPad(a, px, wy - 4, padR, { flat: .22, rot: 2.2, c: '#5a9a40' });
    others.forEach(([x, y, s, t0], i) => {
      const k = ss(t0, t0 + .8, e); if (k <= 0) return;
      const [ox, oy] = Cm.toScreen(cam, x, y, 1);
      const fo = { x: ox, y: oy - 6 * z - Fr.groundY({ sit: 1 }) * s * z * k + (1 - k) * 30, s: s * z, pose: { sit: k, float: 1 - k }, pal: SUMMER, young: 1, tad: .1, tailLen: .1, legs: 1, arms: 1, t, wet: 1.2, blink: An.blink(t, i + 30), alpha: k };
      Fr.frog(a, fo);
    });
    if (climb > .02) Fr.frog(a, hero);
    if (rain > 0) { Wt.rainRings(a, t, hy + 10, wy, { n: 46, rate: 1.4, a: .5 * rain }); Wt.rain(a, t, { n: 220, a: .38 * rain, len: 70, ang: .1 }); }
    // the fly
    const [fx, fy] = Cr.buzz(hero.x + 230 * hero.s, hero.y - 120 * hero.s, t, 30, 4);
    if (t < EV.tongue1 + .14) Cr.fly(a, t > EV.tongue1 ? lerp(fx, Fr.toWorld(hero, 260, -70)[0], 1) : fx, fy, 1.3 * z, t);
  }, (b) => {
    Wd.underSet(b, cam, t, { look: Wd.lookMix('sun', 'dawn', rain * .5), surf: -10, floor: 520, seed: 9, sun: 620 });
    Cm.push(b, cam, 1);
    for (const [x, y, r] of PADS) Fl.lilyBelow(b, x, 0, r * .9, t, { stem: 700 });
    b.restore();
    Fl.lilyBelow(b, px, wy, padR * .95, t, { stem: 800 });
    Fr.frog(b, hero);
    if (rain > 0) for (let i = 0; i < 20; i++) Wt.stream(b, hash(i) * W, wy + 6, t, SHOT.froglet + 3.6 + hash(i + 2), SHOT.froglet + 10, { rate: 1.2, r: 2.5, rise: -40, life: .8, seed: i });
    b.fillStyle = G.lin(b, 0, wy, 0, H, [[0, '#7ac8a0', .1], [1, '#0c3832', .25]]); b.fillRect(0, wy - 20, W, H);
  });
  AN.set('stub', Fr.toWorld(hero, -100, 2), [hero.x - 330, hero.y - 220]);
  if (rain > 0) { g.fillStyle = rgba('#2a3a44', .12 * rain); g.fillRect(0, 0, W, H); }
}

// ---------------------------------------------------------------- S10: growing up (summer -> autumn), tongue strike
function s10(g, e, t) {
  const cam = Cm.rig([[0, -30, 175, 1.25], [1.8, 20, 180, 1.55], [3.0, 0, 170, 1.25], [5.2, -60, 165, 1.1], [7.2, -260, 170, 1.12]], e, { hand: .45, seed: 101 });
  const aut = ss(4.0, 5.6, e), lapse = ss(2.6, 3.0, e) * (1 - ss(4.6, 5.0, e));
  const tl = t + lapse * (e - 2.6) * 4;
  const gy = 330, z = cam.z;
  // sky + far pond + trees
  const hyS = Cm.toScreen(cam, 0, 40, .3)[1];
  Wd.aboveSet(g, cam, tl, {
    sky: 'day', skyMix: ['autumn', aut], hy: hyS, wy: Cm.toScreen(cam, 0, gy - 40, .6)[1], clouds: 1, sun: [760 - cam.x * .1, 200 + lapse * Math.sin(tl * 2) * 80, 30, 1],
    trees: [mix('#3f6a42', '#b0702a', aut), mix('#28502e', '#8a4a20', aut)], mist: .2, waterDeep: '#2a4a3a',
  });
  // ground: mossy bank with grass, blurred foreground
  Cm.push(g, cam, 1);
  g.fillStyle = G.lin(g, 0, gy - 30, 0, gy + 500, [[0, mix('#6f8f3a', '#a07a3a', aut)], [.2, mix('#4a6a2a', '#7a5a2a', aut)], [1, '#2a2a18']]);
  g.beginPath(); g.moveTo(-1600, gy + 900); for (let x = -1600; x <= 1600; x += 40) g.lineTo(x, gy + noise(x * .004, 3) * 20); g.lineTo(1600, gy + 900); g.closePath(); g.fill();
  Fl.grass(g, -1400, 1400, gy + 4, 70, tl, { n: 260, c0: mix('#3f7a2e', '#7a5a24', aut), c1: mix('#a6d45a', '#e0a040', aut), seed: 5 });
  Fl.stone(g, 380, gy + 10, 120, 60, 31, { c: '#8a8a78', moss: mix('#6f9a3a', '#9a7a3a', aut) });
  // falling leaves
  if (aut > 0) for (let i = 0; i < 26; i++) { const k = ((t * .12 + hash(i)) % 1), x = -900 + hash(i + 3) * 1800 + Math.sin(t * 1.2 + i) * 60, y = -700 + k * 1100; if (y < gy + 20) Fl.leaf(g, x, y, 1.6, t * 2 + i, hash(i + 5) > .5 ? '#d8782a' : '#e8b03a'); }
  // the frog grows through the time-lapse
  const grow = ss(2.8, 4.8, e), s0 = lerp(.55, 1.05, grow) * z;
  const hp = An.hop(e, 5.6, .7, -40, gy, -420, gy, 140);
  const st = strikeAt(t, EV.tongue2, 250, -90);
  const fo = { x: 0, y: 0, s: s0, pose: hp.air ? hp.pose : hp.pose, pitch: hp.pitch, pal: { ...SUMMER, top: mix(SUMMER.top, '#8a6a3a', aut * .5) }, young: 1 - grow, wet: 1, t, blink: An.blink(t, 41), throat: An.throat(t) * .5, mouth: st.mouth, tongue: { x: st.tx, y: st.ty, k: st.k }, eyeIn: st.eyeIn };
  const [sx, sy] = Cm.toScreen(cam, hp.x, hp.y, 1);
  fo.x = sx; fo.y = sy - Fr.groundY(fo.pose.sit !== undefined ? fo.pose : { sit: 1 }) * s0 * (hp.air ? 0 : 1) - (hp.air ? 60 * z : 0);
  g.restore();
  // contact shadow
  g.fillStyle = 'rgba(10,20,6,.3)'; G.ellipse(g, sx, sy + 4 * z, 110 * s0, 12 * s0); g.fill();
  Fr.frog(g, fo);
  const [fx, fy] = Cr.buzz(sx + 250 * s0, fo.y - 90 * s0, t, 36, 8);
  if (t < EV.tongue2 + .14) Cr.fly(g, fx, fy, 1.4 * z, t);
  AN.set('swallow', Fr.toWorld(fo, 66, -24), [sx + 170, fo.y - 230]);
  G.layer(g, 's10front', (b) => { Cm.push(b, cam, 1.7); Fl.grass(b, -900, 900, 640, 260, tl, { n: 70, c0: mix('#2f5a24', '#6a4a1a', aut), c1: mix('#6a9a3a', '#c08a30', aut), w: 7, seed: 9 }); b.restore(); }, { k: 3, blur: 6 });
  if (lapse > 0) { g.fillStyle = rgba('#fff4e0', .05 * lapse * (.5 + .5 * Math.sin(t * 31))); g.fillRect(0, 0, W, H); }
}

// ---------------------------------------------------------------- S11: winter, under the ice
function s11(g, e, t) {
  const cam = Cm.rig([[0, -40, -70, 1.0, -.02], [2.4, 20, -20, 1.12, .02], [4.8, 60, 30, 1.28, 0]], e, { hand: .4, seed: 111 });
  Wd.underSet(g, cam, t, { look: 'winter', surf: -400, floor: 300, seed: 11, sun: 540, rays: .5, caus: .3, motes: .6 });
  Wt.motes(g, cam, t, { col: '#f4fbff', a: .9, dx: 5, dy: 24, sets: [{ n: 70, p: .6, r: [1.2, 2.8], a: .45, seed: 21 }, { n: 8, p: 1.6, r: [10, 24], a: .07, seed: 22, bokeh: 1 }] });
  // ice sheet: frost spreads from the edges
  const iy = Cm.toScreen(cam, 0, -400, 1)[1], fr = ss(0, 1.8, e);
  g.save();
  g.fillStyle = G.lin(g, 0, iy - 260, 0, iy + 30, [[0, '#dfeef6'], [.8, '#b8d4e2'], [1, '#e8f6ff']]); g.fillRect(0, iy - 400, W, 420);
  g.strokeStyle = rgba('#ffffff', .55); g.lineWidth = 1.4;
  for (let i = 0; i < 24; i++) {
    const x0 = hash(i) * W, L = fr * (60 + hash(i + 3) * 180); let x = x0, y = iy + 4, a = Math.PI / 2 + (hash(i + 5) - .5) * 1.2;
    g.beginPath(); g.moveTo(x, y); for (let d = 0; d < L; d += 12) { a += (hash(i * 7 + d) - .5) * .7; x += Math.cos(a) * 12; y += Math.sin(a) * 6; g.lineTo(x, y); if (d % 36 === 0) { g.moveTo(x, y); g.lineTo(x + 8, y + 5); g.moveTo(x, y); } } g.stroke();
  }
  for (let i = 0; i < 30; i++) { Wt.bubble(g, hash(i + 40) * W, iy + 6 + hash(i + 41) * 14, 3 + hash(i + 42) * 7, 0, .7, i); }
  g.restore();
  // the frog in the mud, under leaves, eyes shut, breathing through its skin
  const [sx, sy] = Cm.toScreen(cam, 20, 250, 1), s = 1.15 * cam.z;
  const fo = { x: sx, y: sy, s, pose: { crouch: 1 }, pitch: .08, pal: { top: '#5a6a4a', side: '#7a7a5a', belly: '#c8c0a0', line: '#1e2014', leg: '#6a6a48' }, sleep: 1, wet: .5, t: t * .2, throat: 0, rim: '#d8eeff', glass: .0 };
  Fr.frog(g, fo);
  // mud + leaf litter tucked over the frog
  Cm.push(g, cam, 1);
  g.fillStyle = G.lin(g, 0, 270, 0, 380, [[0, '#3a3a30', .0], [.3, '#3a3a30', .95], [1, '#1c1c1a', 1]]);
  g.beginPath(); g.moveTo(-700, 600); for (let x = -700; x <= 700; x += 30) g.lineTo(x, 292 + noise(x * .01, 4) * 12 - Math.exp(-(((x - 20) / 160) ** 2)) * 22); g.lineTo(700, 600); g.closePath(); g.fill();
  for (let i = 0; i < 40; i++) Fl.leaf(g, -600 + hash(i + 9) * 1200, 286 + hash(i + 3) * 40, 1.4 + hash(i) * .8, hash(i + 2) * TAU, mix('#6a4a24', '#4a3a24', hash(i + 4)), { flip: .45 });
  g.restore();
  // skin breathing: tiny gas exchange shimmer + a slow heartbeat glow
  const hb = Math.exp(-(((t - 120) % 1.8 + 1.8) % 1.8) * 5);
  const hp = Fr.toWorld(fo, 34, 22);
  G.glow(g, hp[0], hp[1], 40 * s, '#ff6a5a', .25 * hb);
  for (let i = 0; i < 16; i++) { const k = ((t * .25 + hash(i)) % 1), p = Fr.toWorld(fo, -80 + hash(i + 2) * 170, -30 + hash(i + 5) * 10); g.fillStyle = rgba('#e8f8ff', .45 * Math.sin(Math.PI * k)); G.circle(g, p[0] + Math.sin(t + i) * 4, p[1] - k * 40 * s, 1.8); g.fill(); }
  AN.set('skin', Fr.toWorld(fo, -10, -30), [sx + 150, sy - 260]);
  g.fillStyle = G.rad(g, W / 2, H / 2, W * .8, [[.5, '#0a1a2a', 0], [1, '#0a1a2a', .35]]); g.fillRect(0, 0, W, H);
}

// ---------------------------------------------------------------- S12: spring, the call, new spawn, panorama + end title
function s12(g, e, t) {
  const up = ss(1.2, 3.4, e);
  const pull = io3(ss(7.2, 9.6, e));
  const cam = Cm.rig([[0, 0, 360, 1.1], [1.2, 0, 300, 1.15], [3.4, 20, 40, 1.2], [6.6, 40, 20, 1.28], [7.2, 40, 20, 1.28], [9.6, 0, 60, .62], [12, 0, 70, .6]], e, { hand: .45, seed: 121 });
  const z = cam.z, wy = Cm.toScreen(cam, 0, 0, 1)[1] + Math.sin(t * 1.3) * 4 * z;
  const hy = wy - 150 * z;
  // the hero swims up, floats, calls; a female joins; new spawn appears
  const sw = An.stroke(e, 1.0);
  const surf = ss(2.2, 3.4, e);
  const [hx0] = Cm.toScreen(cam, 0, 0, 1);
  const hero = { x: hx0, y: lerp(Cm.toScreen(cam, 0, 300, 1)[1], wy + 6 * z, io3(surf)), s: 1.0 * z, pose: surf < .9 ? An.swimPose(sw.ext) : { float: 1 }, pitch: lerp(-.5, -.06, surf), male: 1, wet: 1.3, t,
    blink: e < .5 ? 1 - ss(.2, .5, e) : An.blink(t, 51), sac: An.sac(t, [...EV.croak1, EV.lastCroak], { h: .26 }), pal: DAWN2, rim: '#ffe0b8' };
  const femK = ss(5.0, 6.6, e);
  const fem = { x: Cm.toScreen(cam, lerp(-700, -130, femK), 0, 1)[0], y: Cm.toScreen(cam, 0, lerp(380, 120, femK), 1)[1], s: 1.1 * z, pose: An.swimPose(An.stroke(e, 1.1, .4).ext * (1 - ss(6.2, 6.8, e))), pitch: -.15, plump: 1, wet: .7, t, alpha: ss(4.6, 5.4, e) };
  const spawnK = ss(EV.spawn2 - SHOT.spring, EV.spawn2 - SHOT.spring + 1.4, e);
  Wd.overUnder(g, wy, t, (a) => {
    Wd.aboveSet(a, cam, t, { sky: 'golden', hy, wy, sun: [700 - cam.x * .1, hy - 120 * z, 34, 1], sunCol: '#fff0c8', clouds: 1, cloudCol: '#fff0e0', cloudShadow: '#a07a6a', trees: ['#7a6a5a', '#4f4a3a'], mist: .5, mistCol: '#ffe8cc', waterDeep: '#5a5a4a', glint: '#fff0d0', reedSil: '#5a5a32' });
    if (pull > 0) {
      Cm.push(a, cam, 1);
      // panorama: froglets on pads, distant callers
      for (const [x, y, r] of [[700, -10, 110], [880, -40, 80], [-900, -30, 90]]) Fl.lilyPad(a, x, y, r, { flat: .24, c: '#5a9a40' });
      for (const [x, y, s, ph] of [[700, -10, .34, 0], [880, -40, .26, 1]]) Fr.frog(a, { x, y: y - Fr.groundY({ sit: 1 }) * s - 6, s, pose: { sit: 1 }, pal: SUMMER, young: 1, wet: 1, t, blink: An.blink(t, 60 + ph), alpha: pull });
      for (const [x, ph] of [[-560, .3], [-980, .8], [420, .5]]) { const fo = { x, y: 4, s: .5, pose: { float: 1 }, sac: An.sac(t, [126.6 + ph, 127.8 + ph, 129 + ph, 130.2 + ph, 131.4 + ph, 132.6 + ph], { h: .2 }), pal: DAWN2, t, noLegs: true, alpha: pull }; a.save(); a.beginPath(); a.rect(-3000, -3000, 6000, 3000); a.clip(); Fr.frog(a, fo); a.restore(); }
      a.restore();
    }
    Fr.frog(a, hero);
    for (const c of [...EV.croak1, EV.lastCroak]) Wt.ripple(a, hero.x + 50 * hero.s, wy + 1, t - c, { speed: 170, life: 1.8, rings: 3, flat: .2, a: .6 });
  }, (b) => {
    Wd.underSet(b, cam, t, { look: 'gold', surf: -10, floor: 560, seed: 12, sun: 620 });
    // melting ice crumbs drifting at the surface early on
    if (e < 3) for (let i = 0; i < 14; i++) { const x = hash(i) * W, y = Cm.toScreen(cam, 0, 0, 1)[1] + 8 + hash(i + 2) * 30; b.fillStyle = rgba('#eef8ff', .5 * (1 - e / 3)); G.ellipse(b, x, y, 30 + hash(i + 3) * 50, 8); b.fill(); }
    Cm.push(b, cam, 1);
    if (spawnK > 0) {
      Fl.elodea(b, -360, 560, 520, t, { c: '#2c6a3a', c2: '#8fc96a' });
      Sp.clump(b, -360, 150, { n: 110, size: 150, swell: lerp(.3, 1, spawnK), seed: 31, t, a: spawnK });
      G.glow(b, -360, 150, 260, '#fff6d0', .25 * spawnK * (1 - pull * .5), 'screen');
    }
    if (pull > 0) {
      Sp.clump(b, -760, 260, { n: 80, size: 120, swell: 1, seed: 32, t, a: pull, stage: 1.4 });
      for (let i = 0; i < 9; i++) { const x = 360 + ((t * 60 + hash(i) * 900) % 900), y = 160 + hash(i + 3) * 260; Fr.frog(b, { x, y, s: .3, flip: -1, tad: 1, legs: i % 3 === 0 ? .7 : 0, arms: 0, swim: .5, t: t + i, freq: 2.6, wet: .4, alpha: pull }); }
    }
    b.restore();
    Fr.frog(b, fem);
    Fr.frog(b, hero);
    b.fillStyle = G.lin(b, 0, wy, 0, H, [[0, '#8ac8a0', .1], [1, '#123a2a', .25]]); b.fillRect(0, wy - 20, W, H);
  });
  // the loop of light through the stages (panorama)
  if (pull > .3) {
    const P = [[-360, 150], [560, 260], [790, -60], [0, -30], [-360, 150]].map(([x, y]) => Cm.toScreen(cam, x, y, 1));
    const lk = ss(.3, 1, pull) * (1 - ss(9.0, 9.6, e));
    const D = G.dense(P.slice(0, 4), true, 30);
    const head = ((e - 7.6) * .55) % 1;
    g.save(); g.lineCap = 'round';
    G.layer(g, 'loopglow', (b) => { b.strokeStyle = rgba('#fff2c8', .5 * lk); b.lineWidth = 10; b.beginPath(); G.curve(b, P.slice(0, 4), true); b.stroke(); }, { k: 2, blur: 8, comp: 'screen' });
    for (let i = 0; i < D.length; i++) {
      const u = i / D.length, dd = ((u - head) % 1 + 1) % 1, a = (i % 6 < 3 ? .6 : 0) * lk + Math.exp(-((1 - dd) * 7)) * lk;
      if (a < .02) continue;
      const q = D[(i + 1) % D.length];
      g.strokeStyle = rgba('#fff2c8', a); g.lineWidth = 3 + 4 * Math.exp(-((1 - dd) * 9));
      g.beginPath(); g.moveTo(D[i][0], D[i][1]); g.lineTo(q[0], q[1]); g.stroke();
    }
    g.restore();
    const labels = [['eggs', P[0], 7.8], ['tadpoles', P[1], 8.1], ['froglet', P[2], 8.4], ['frog', P[3], 8.7]];
    T.shadowOn(g, .6, 10);
    for (const [s, p, t0] of labels) { const a = ss(t0, t0 + .35, e) * (1 - ss(8.8, 9.2, e)); if (a > 0) G.text(g, s.toUpperCase(), clamp(p[0], 110, W - 110), p[1] + (s === 'frog' ? -80 : 74), { font: 'SvM', size: 21, track: .3, color: '#fff6e0', align: 'center', per: () => ({ a }) }); }
    T.shadowOff(g);
  }
  // end title: rises from the waterline over a softly dimmed band
  const te = e - (EV.endTitle - SHOT.spring);
  if (te > -.6) {
    const dk = ss(-.6, .4, te) * (1 - ss(11.3, 11.95, e));
    g.fillStyle = G.lin(g, 0, wy - 300, 0, wy + 220, [[0, '#08121a', 0], [.45, '#08121a', .55 * dk], [.7, '#08121a', .5 * dk], [1, '#08121a', 0]]); g.fillRect(0, wy - 300, W, 520);
  }
  if (te > 0) {
    T.title(g, te, wy, t, { size: 170, gap: 18, fade: 1 - ss(11.3, 11.95, e) });
    const a = ss(.9, 1.6, te) * (1 - ss(11.3, 11.9, e));
    T.shadowOn(g, .6, 14);
    G.text(g, 'the cycle begins again', W / 2, wy + 80, { font: 'IoI', size: 36, color: T.GOLD, align: 'center', per: (i) => ({ a: a * ss(.9 + i * .02, 1.3 + i * .02, te) }) });
    G.text(g, 'RANA TEMPORARIA · THE COMMON FROG', W / 2, wy + 124, { font: 'SvM', size: 17, track: .32, color: '#f0f6ff', align: 'center', per: (i) => ({ a: a * .85 * ss(1.4 + i * .012, 1.8 + i * .012, te) }) });
    T.shadowOff(g);
  }
}
const DAWN2 = { top: '#7a8a40', side: '#a39552', belly: '#f0dcae', line: '#2a2210', leg: '#8a8444' };

module.exports = { s9, s10, s11, s12 };
