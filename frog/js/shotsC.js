// Act III: tadpole life + dragonfly-nymph ambush (S7), legs time-lapse into the metamorphosis climax (S8).
const { W, H, TAU, clamp, lerp, hash, rgba, mix, ss, io3, out3, in3, spring, noise, wobble } = require('./core');
const G = require('./gfx');
const Cm = require('./cam');
const Wt = require('./water');
const Wd = require('./world');
const Fl = require('./flora');
const Fr = require('./frog');
const Cr = require('./critters');
const AN = require('./anchors');
const { SHOT, EV, BEAT } = require('./cues');

// ---------------------------------------------------------------- S7: tadpoles + ambush
const SCHOOL = Array.from({ length: 16 }, (_, i) => ({ y: -260 + hash(i * 3) * 560, d: .55 + hash(i * 5) * .9, ph: hash(i * 7) * 9, sp: .8 + hash(i * 11) * .5, s: .32 + hash(i * 13) * .16 }));
function s7(g, e, t) {
  const threat = ss(7.0, 8.4, e) * (1 - ss(12.4, 13.8, e));
  const cam = Cm.rig([[0, 260, -40, 1.0], [2.4, 40, 40, 1.1], [3.6, -40, 140, 1.5], [4.8, -40, 140, 1.55], [6.0, -10, -200, 1.2], [7.2, 80, 60, 1.05], [8.6, 380, 60, 1.3], [10.2, 400, 70, 1.5], [12.0, 220, 40, 1.12], [14.4, 60, 20, 1.0]], e,
    { hand: .55 + threat * .3, seed: 71, shakes: [[EV.strike - SHOT.tadpole, 26, 11, 6]] });
  const se = e - (EV.strike - SHOT.tadpole);
  if (se > 0) cam.z *= 1 + .16 * Math.exp(-se * 4) * ss(0, .06, se);
  const lk = Wd.lookMix('sun', 'murk', threat);
  Wd.underSet(g, cam, t, { look: lk, surf: -560, floor: 330, seed: 7, sun: 600, rays: 1 - threat * .5 });
  // the school: crossing right -> left, scattering at the strike
  const scat = ss(EV.strike - SHOT.tadpole, EV.strike - SHOT.tadpole + .6, e);
  G.layer(g, 'school', (b) => {
    Cm.push(b, cam, .75);
    SCHOOL.forEach((q, i) => {
      if (i === 3) return;
      const x = 900 - ((e * 150 * q.sp + q.ph * 60) % 2200) + scat * (hash(i) - .5) * 900, y = q.y + Math.sin(t * 1.3 + q.ph) * 20 + scat * (hash(i + 4) - .5) * 600;
      Fr.frog(b, { x, y, s: q.s, flip: -1, tad: 1, legs: 0, arms: 0, swim: .55 + scat * .6, t: t + q.ph, freq: 2.6 + scat * 3, pitch: Math.sin(t + q.ph) * .08, wet: .4 });
    });
    b.restore();
  }, { k: 1.5, blur: 1.2 });
  // the grazing stone + the nymph's weed
  Cm.push(g, cam, 1);
  Fl.stone(g, -40, 300, 230, 120, 77, { c: '#7a7864', algae: '#8fcf6a', nAlgae: 60, t, moss: '#5f8f3a' });
  Fl.elodea(g, 560, 380, 660, t, { c: '#2c5a34', c2: '#6f9a52', cur: 6 });
  // the nymph clings to the stem, head down-left
  const nk = e - (EV.strike - SHOT.tadpole);
  const strike = nk < 0 ? 0 : nk < .09 ? out3(nk / .09) : nk < .35 ? 1 : 1 - io3((nk - .35) / .5);
  const ny = { x: 560, y: 40, s: 1.25, flip: -1, rot: -.3, strike, t, c: mix('#5f6a3a', '#4a5530', threat), alpha: ss(5, 7, e) };
  // prey tadpole swims into range, then gets snatched
  const preyT = e - 8.6;
  const caught = nk > .06;
  const tip = Cr.nymphTip({ ...ny, strike: 1 });
  if (!caught && preyT > -2.5) {
    const px = lerp(-160, tip[0] - 30, ss(-2.5, 1.9, preyT)), py = lerp(-60, tip[1] + 4, ss(-2.5, 1.9, preyT));
    Fr.frog(g, { x: px, y: py, s: .42, flip: 1, tad: 1, legs: 0, arms: 0, swim: .5, t, freq: 2.4, wet: .4 });
  }
  Cr.nymph(g, { ...ny, grip: caught && strike > .05 ? (gg, x, y) => Fr.frog(gg, { x: x - 10, y, s: .4, flip: 1, tad: 1, legs: 0, arms: 0, swim: 1, t: t * 1.5, freq: 4, wet: .4, pitch: .4 }) : null });
  g.restore();
  AN.set('nymph', Cm.toScreen(cam, 500, 20, 1), [Cm.toScreen(cam, 500, 20, 1)[0] - 330, Cm.toScreen(cam, 500, 20, 1)[1] - 200]);
  // the hero: grazes on the stone, glass peek at the gut, gulps air, flees
  const gz = ss(2.0, 2.8, e) * (1 - ss(5.6, 6.2, e));
  const up = ss(5.8, 6.8, e) * (1 - ss(7.0, 8.0, e)), flee = ss(10.3, 10.8, e);
  const hxw = lerp(-60, -150, flee) + (1 - ss(1.2, 2.6, e)) * 600 - flee * 700 * ss(10.3, 12.5, e), hyw = lerp(140, -470, up) + gz * 30 + flee * 120;
  const [hx, hy] = Cm.toScreen(cam, hxw, hyw, 1);
  const bob = Math.sin(t * 9) * gz;
  const hero = { x: hx, y: hy, s: .78 * cam.z, flip: -1, tad: 1, legs: 0, arms: 0, swim: lerp(.4, .15, gz) + flee * .9, freq: 2.4 + flee * 3, t,
    pitch: lerp(0, .55, gz) + bob * .05 - up * .7, glass: ss(4.6, 5.0, e) * (1 - ss(5.8, 6.2, e)) * .85, gut: 1, lungs: .5, wet: .5, rim: '#f0ffe0' };
  Fr.frog(g, hero);
  AN.set('beak', Fr.toWorld(hero, 96, 28), [hx - 380, hy + 190]);
  AN.set('gut', Fr.toWorld(hero, -18, 38), [hx + 140, hy + 170]);
  // gulp at the surface
  const gp = e - (EV.gulp - SHOT.tadpole);
  if (gp > -.2 && gp < 1.6) { const s = Cm.toScreen(cam, hxw - 100, -560, 1); Wt.ripple(g, s[0], s[1], gp, { speed: 90, life: 1.4, rings: 3, flat: .25, a: .6 }); Wt.stream(g, hx - 40, hy + 30, t, EV.gulp + .3, EV.gulp + .5, { rate: 10, r: 6, rise: 120, seed: 3 }); }
  // algae puffs while grazing
  if (gz > .1) for (let i = 0; i < 12; i++) { const k = ((t * 1.6 + hash(i)) % 1); const p = Fr.toWorld(hero, 100, 30); g.fillStyle = rgba('#9fd07a', .5 * gz * (1 - k)); G.circle(g, p[0] + (hash(i + 3) - .5) * 60 * k, p[1] + 20 * k - 30 * k * k, 2 + 3 * k); g.fill(); }
  // alarm chemical spreading from the strike
  const al = e - (EV.strike - SHOT.tadpole);
  if (al > 0 && al < 3.5) {
    const c = Cm.toScreen(cam, 160, 30, 1);
    G.layer(g, 'alarm', (b) => { for (let i = 0; i < 9; i++) { const a = hash(i) * TAU, r = (60 + al * 160) * (.6 + hash(i + 3) * .6); G.glow(b, c[0] + Math.cos(a) * r * .5, c[1] + Math.sin(a) * r * .4, r * .6, '#d8e8a0', .22 * (1 - al / 3.5), 'source-over'); } }, { k: 3, blur: 8 });
  }
  if (Math.abs(al) < .25) { g.fillStyle = rgba('#ffffff', .25 * (1 - Math.abs(al) / .25)); g.fillRect(0, 0, W, H); }
  // speed lines bursting from the snatch
  if (se > 0 && se < .4) {
    const c = Cm.toScreen(cam, tip[0], tip[1], 1), k = 1 - se / .4;
    g.save(); g.globalCompositeOperation = 'lighter'; g.lineCap = 'round';
    for (let i = 0; i < 34; i++) { const a = hash(i + 50) * TAU, r0 = 60 + se * 900 * (.6 + hash(i) * .6), L = 60 + hash(i + 3) * 160; g.strokeStyle = rgba('#f0ffe8', .35 * k); g.lineWidth = 1.5 + hash(i + 5) * 2.5; g.beginPath(); g.moveTo(c[0] + Math.cos(a) * r0, c[1] + Math.sin(a) * r0); g.lineTo(c[0] + Math.cos(a) * (r0 + L), c[1] + Math.sin(a) * (r0 + L)); g.stroke(); }
    g.restore();
    Wt.ripple(g, c[0], c[1], se * 2, { speed: 300, life: 1, rings: 2, flat: 1, a: .5 * k });
  }
  Wd.underFront(g, cam, t, { look: lk, n: 2, xs: [-760, 940] });
  // threat vignette
  if (threat > 0) { g.fillStyle = G.rad(g, W / 2, H / 2, W * .75, [[.4, '#000000', 0], [1, '#000000', .45 * threat]]); g.fillRect(0, 0, W, H); }
}

// ---------------------------------------------------------------- S8: legs (time-lapse) -> metamorphosis (dark stage)
function s8(g, e, t) {
  const tt = t;
  const meta = ss(9.4, 10.6, e);                      // pond -> dark stage
  const reveal = ss(EV.reveal - SHOT.legs - .2, EV.reveal - SHOT.legs + .5, e);
  const popE = e - (EV.pop - SHOT.legs);
  const cam = Cm.rig([[0, 80, -30, 1.15], [3, 40, 0, 1.4], [6.6, -20, 30, 1.6], [9.6, -40, 10, 1.25, -.04], [12, 60, -20, 1.5, .05], [14.4, -50, 30, 1.38, -.045], [16.8, 50, -10, 1.56, .04], [19.2, -30, 20, 1.42, -.03], [21.6, 0, -10, 1.66, 0], [24, 30, -160, 1.3]], e,
    { hand: .5, seed: 81, shakes: [[EV.pop - SHOT.legs, 22, 10, 6], [EV.reveal - SHOT.legs, 16, 8, 5]] });
  const climax = ss(EV.pop - SHOT.legs, EV.pop - SHOT.legs + .3, e) * (1 - ss(EV.reveal - SHOT.legs - .2, EV.reveal - SHOT.legs + .4, e));
  if (climax > 0) { const bt = ((t - EV.pop) % BEAT + BEAT) % BEAT; cam.z *= 1 + .022 * climax * Math.exp(-bt * 7); }
  // ---- backdrop: calm golden pond fading to a dark stage with a spotlight
  if (meta < 1) {
    Wd.underSet(g, cam, t, { look: 'gold', surf: -600, floor: 360, seed: 8, sun: 560 });
  }
  if (meta > 0) {
    g.save(); g.globalAlpha = meta * (1 - reveal * .55);
    g.fillStyle = G.rad(g, W / 2, H * .45, W * .7, [[0, '#123a3a'], [.5, '#071a1c'], [1, '#010506']]); g.fillRect(0, 0, W, H);
    Wt.motes(g, cam, t, { col: climax > .1 ? '#ffe6a8' : '#9fe8d0', a: .6 + climax * .5, dx: 10, dy: -14 - climax * 60, sets: [{ n: 80, p: .4, r: [1, 2.2], a: .38, seed: 12 }, { n: 10, p: 1.5, r: [14, 32], a: .06, seed: 13, bokeh: 1 }] });
    // a slow sweeping key light circling the subject
    const la = t * .9, lc = Cm.toScreen(cam, 40, 20, 1);
    G.glow(g, lc[0] + Math.cos(la) * 300, lc[1] + Math.sin(la) * 180, 520, '#3fbfa8', .1 + climax * .08, 'screen');
    g.restore();
    if (reveal > 0) { g.save(); g.globalAlpha = reveal * meta; Wt.rays(g, { t, n: 7, rays: .9, sy: -80, sx: W / 2, rayCol: '#fff4d0', lean: .05 }); g.restore(); }
  }
  // ---- the hero: legs grow, arms pop, the tail is absorbed, the body becomes a froglet
  const legs = ss(EV.bud - SHOT.legs, EV.kick - SHOT.legs, e);
  const bulge = .32 * ss(EV.kick - SHOT.legs + .4, EV.kick - SHOT.legs + 1.2, e);
  const arms = popE >= 0 ? Math.min(1, lerp(.32, 1, out3(clamp(popE / .22)))) : bulge;
  const tadK = 1 - ss(EV.tail - SHOT.legs, EV.reveal - SHOT.legs, e) * .88;
  const tailLen = lerp(1, .14, io3(ss(EV.tail - SHOT.legs, EV.colour - SHOT.legs + 1, e)));
  const kick = Math.max(0, Math.sin((e - (EV.kick - SHOT.legs)) * 7)) * ss(EV.kick - SHOT.legs, EV.kick - SHOT.legs + .1, e) * (1 - ss(EV.kick - SHOT.legs + 1.3, EV.kick - SHOT.legs + 1.8, e));
  const glass = ss(10.0, 10.8, e) * (1 - ss(EV.reveal - SHOT.legs - .4, EV.reveal - SHOT.legs, e)) * .72 + (ss(7.6, 8.0, e) * (1 - ss(8.6, 9.0, e))) * .7;
  const [hx, hy] = Cm.toScreen(cam, 40 + Math.sin(t * .6) * 12, 20 + Math.sin(t * .8) * 10 - ss(22.6, 24, e) * 500, 1);
  const thy = (EV.thyroid - SHOT.legs <= e) ? (.6 + .4 * Math.sin((e - (EV.thyroid - SHOT.legs)) * 6)) * (1 - ss(EV.lungs - SHOT.legs, EV.reveal - SHOT.legs, e)) : 0;
  const ext = kick;
  const hero = {
    x: hx, y: hy, s: 1.15 * cam.z, flip: -1, tad: tadK, legs, arms, tailLen, t, freq: 2.2, swim: lerp(.22, .08, 1 - tadK) * (1 - reveal * .6),
    pose: tadK > .5 ? { tad: 1 - ext, swimOut: ext } : { tad: Math.max(0, tadK - .12) * 2, hang: 1 - reveal, float: reveal * .5, swimOut: ext },
    pitch: Math.sin(t * .7) * .04 - ss(22.6, 24, e) * .5 + cam.r + climax * (Math.sin(t * 4.2) * .07 + Math.sin(t * 1.3) * .05), glass, gut: lerp(1, .15, ss(EV.lungs - SHOT.legs + 1, EV.colour - SHOT.legs, e)), lungs: lerp(.25, 1, ss(EV.lungs - SHOT.legs, EV.lungs - SHOT.legs + 1.2, e)),
    igills: 1 - ss(EV.lungs - SHOT.legs, EV.lungs - SHOT.legs + 1.2, e), thyroid: thy, wet: 1, rim: meta > .5 ? '#bff8e8' : '#fff0c0', young: 1,
  };
  // golden hormone waves from the throat
  if (thy > 0) {
    const th = Fr.toWorld(hero, 64, 26);
    for (let k = 0; k < 3; k++) { const pe = ((e * .8 + k / 3) % 1); g.strokeStyle = rgba('#ffd36a', .45 * (1 - pe) * Math.min(1, thy * 2)); g.lineWidth = 3; G.circle(g, th[0], th[1], 20 + pe * 300 * cam.z); g.stroke(); }
  }
  // nutrients flow from the shrinking tail into the body
  const tf = ss(EV.tail - SHOT.legs, EV.tail - SHOT.legs + .5, e) * (1 - ss(EV.colour - SHOT.legs, EV.colour - SHOT.legs + 1, e));
  if (tf > 0) {
    g.save(); g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 40; i++) { const u = ((t * .7 + hash(i)) % 1), a = Fr.toWorld(hero, -90 - 300 * tailLen * (1 - u), (hash(i + 3) - .5) * 20), b = Fr.toWorld(hero, -20, 10); g.fillStyle = rgba('#ffd98a', .6 * tf * Math.sin(Math.PI * u)); G.circle(g, lerp(a[0], b[0], u * u), lerp(a[1], b[1], u * u), 3); g.fill(); }
    g.restore();
  }
  Fr.frog(g, hero);
  if (popE > 0 && popE < .5) { const sp = Fr.toWorld(hero, 22, 40); G.glow(g, sp[0], sp[1], 160 * cam.z, '#fff2c0', .8 * (1 - popE / .5)); }
  // anchors
  AN.set('hidden', Fr.toWorld(hero, 22, 40), [hx + 160, hy + 200]);
  AN.set('thyroid', Fr.toWorld(hero, 64, 26), [hx - 360, hy - 210]);
  AN.set('pop', Fr.joint(hero, 'hand'), [hx - 400, hy + 220]);
  AN.set('tailfood', Fr.toWorld(hero, -150, 0), [hx + 180, hy - 230]);
  AN.set('mouthW', Fr.toWorld(hero, 80, 8), [hx - 420, hy - 190]);
  AN.set('lungs', Fr.toWorld(hero, -4, 2), [hx + 170, hy - 220]);
  AN.set('gutS', Fr.toWorld(hero, -30, 20), [hx + 160, hy + 210]);
  // reveal flash
  const rf = e - (EV.reveal - SHOT.legs);
  if (rf > 0 && rf < .6) { g.fillStyle = rgba('#fff8e0', .35 * (1 - rf / .6)); g.fillRect(0, 0, W, H); }
  if (meta < .5) Wd.underFront(g, cam, t, { look: 'gold', n: 2, xs: [-820, 900], a: 1 - meta * 2 });
}

module.exports = { s7, s8 };
