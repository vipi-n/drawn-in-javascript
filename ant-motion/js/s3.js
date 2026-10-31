// Scenes 5-6: STAGE 3 the pupa, STAGE 4 the adult (emergence + anatomy).
const core = require('./core');
const { W, H, TAU, clamp, lerp, ss, io3, out3, out5, back, win, rgba, mix, rng, noise, hash, cues } = core;
const { B, BEAT, BAR, EV } = cues;
const G = require('./gfx');
const T = require('./type');
const ANT = require('./ant');
const BR = require('./brood');
const WD = require('./world');
const { nest, FLOOR } = require('./s2');
const { gait } = require('./s1');

const CX = 540, CY = FLOOR - 110;

// ------------------------------------------------------------------ PUPA
function pupa(ctx, lt) {
  const spin = ss(.4, 3.6, lt), mec = ss(EV.meconium - B(16), EV.meconium - B(16) + .5, lt);
  const zoom = io3(ss(5.2, 6.2, lt)), scan = ss(5.6, 6.4, lt);
  const xr = scan, soup = win(5.9, 6.8, 7.4, 8.4, lt), form = ss(7.2, 8.4, lt);
  const pk = ss(EV.eyes - B(16) - .4, EV.eyes - B(16) + .6, lt) * .35 + ss(EV.color - B(16) - .2, EV.color - B(16) + 1.6, lt) * .65;
  ctx.save();
  const z = lerp(1.18, 1.62, zoom), py0 = lerp(CY - 40, 1080, zoom);
  ctx.translate(CX, py0); ctx.scale(z, z); ctx.translate(-CX, -CY);
  nest(ctx, lt);
  // the brood pile nearby: other cocoons in a row
  for (let i = 0; i < 3; i++) BR.cocoon(ctx, 150 + i * 30, FLOOR - 40 - i * 70, .62, { ang: -.2 + i * .1, spin: 1 });
  BR.cocoon(ctx, 930, FLOOR - 50, .62, { ang: .15, spin: 1, mec: 1 });
  // the larva rocks while it spins (head swings in figure-eights)
  const rock = Math.sin(lt * 5.2) * .12 * (1 - ss(3.0, 3.6, lt));
  const s = 2.1;
  if (spin < .95) BR.larva(ctx, CX - 4, CY + 4, s * .95, { t: lt, ang: -.15 + rock, a: 1 - ss(.55, .95, spin), fed: .9, mouth: .5 + .5 * Math.sin(lt * 10) });
  // a bright fresh thread from the mouth to the growing wall
  if (spin > 0 && spin < 1) {
    const hx = CX + 60 + Math.sin(lt * 5.2) * 30, hy = CY + 50 + Math.cos(lt * 7) * 18, an = lt * 9;
    ctx.strokeStyle = 'rgba(255,255,245,.9)'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(hx, hy);
    ctx.quadraticCurveTo(CX + Math.cos(an) * 140, CY + Math.sin(an) * 90, CX + Math.cos(an + 1) * 170, CY + Math.sin(an + 1) * 92); ctx.stroke();
    G.glow(ctx, hx, hy, 30, '#ffffff', .4);
  }
  // cocoon (silk accumulates); then it turns see-through under the scan
  BR.cocoon(ctx, CX, CY, s, { spin, mec, xray: 0, ang: -.04 });
  if (xr > 0) {
    const sy = lerp(CY - 140, CY + 140, scan);
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, scan >= 1 ? H : sy); ctx.clip();
    ctx.save(); ctx.translate(CX, CY); ctx.rotate(-.04); ctx.beginPath(); ctx.ellipse(0, 0, 92 * s, 50 * s, 0, 0, TAU); ctx.fillStyle = '#071a1c'; ctx.fill(); ctx.restore();
    BR.cocoon(ctx, CX, CY, s, { spin: 1, mec, xray: 1, ang: -.04 });
    ctx.save(); ctx.translate(CX, CY); ctx.rotate(-.04); ctx.beginPath(); ctx.ellipse(0, 0, 88 * s, 46 * s, 0, 0, TAU); ctx.clip(); ctx.translate(-CX, -CY);
    // the larva silhouette fades as it breaks down; the pupa takes shape and pigments
    BR.larva(ctx, CX - 4, CY + 4, s * .9, { t: lt, ang: -.15, a: (1 - ss(6.4, 7.6, lt)) * .9, xray: .6, fed: .2 });
    BR.dissolve(ctx, CX, CY, s, clamp((lt - 5.9) / 2.5), lt, { a: 1 });
    if (form > 0) { ctx.save(); ctx.globalAlpha *= form; BR.pupa(ctx, CX + 14, CY + 58, 1.32, { k: pk, ang: -.04 }); ctx.restore(); }
    ctx.restore();
    ctx.restore();
    if (scan < 1) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = rgba('#dffffb', .9 * Math.sin(Math.PI * scan)); ctx.fillRect(CX - 220, sy - 2, 440, 4); ctx.restore(); }
  }
  ctx.restore();
  const P = (x, y) => [CX + (x - CX) * z, py0 + (y - CY) * z];
  T.heading(ctx, lt - .2, 3.3, 80, 660, 3, 'PUPA', 'a silk cocoon and a total rebuild');
  const [kx, ky] = P(CX + 150, CY - 80);
  T.tag(ctx, lt - 1.4, 2.0, kx, ky, 800, 900, 'SILK', 'spun from glands by the mouth', { side: -1 });
  T.caption(ctx, lt - .5, 3.1, 1620, ['It spins a *silk cocoon* around itself.', '(some species pupate without one)'], { size: 50 });
  const [mx, my] = P(CX - 82 * s, CY + 4 * s);
  T.tag(ctx, lt - 4.3, 1.4, mx, my, mx + 40, my - 300, 'MECONIUM', 'all its stored waste, out at last');
  T.caption(ctx, lt - 3.75, 1.95, 1620, ['Its gut finally opens: the waste', 'leaves as one *dark pellet*.'], { size: 50 });
  // inside the cocoon
  const [ix, iy] = P(CX, CY);
  T.tag(ctx, lt - 6.1, 1.6, ix - 80, iy, ix - 160, iy - 330, 'BREAKDOWN', 'larval tissue dissolves', { color: T.TEAL, side: 1 });
  T.tag(ctx, lt - 7.6, 1.5, ix + 30, iy + 50, ix + 100, iy + 330, 'REBUILD', 'discs grow into legs, antennae, eyes', { color: T.TEAL, side: -1, subSize: 20 });
  const [ex, ey] = P(CX + 14 + 101 * 1.32, CY + 58 - 75 * 1.32);
  T.tag(ctx, lt - 8.0, 1.5, ex, ey, ex - 60, ey - 320, 'EYES DARKEN FIRST', null, { side: -1 });
  T.tag(ctx, lt - 9.6, 2.0, ix - 120, iy - 20, ix - 200, iy - 330, 'COLOUR SPREADS', 'white → tan → dark', { side: 1 });
  T.caption(ctx, lt - 5.9, 2.8, 1620, ['Inside, the larva\'s body *breaks down*', 'and is *rebuilt* as an ant.'], { size: 50 });
  T.caption(ctx, lt - 8.9, 2.4, 1620, ['Legs, antennae and eyes form,', 'then *colour* creeps in.'], { size: 50 });
  T.caption(ctx, lt - 11.4, 1.95, 1620, ['No food. No movement.', 'About *two to three weeks*.'], { size: 52 });
}

// ------------------------------------------------------------------ ADULT
function adult(ctx, lt) {
  const tear = ss(.15, 1.3, lt), emerge = ss(1.2, 2.7, lt), dark = ss(1.4, 4.0, lt);
  const studio = ss(3.9, 4.5, lt), xr = ss(7.25, 7.9, lt);
  if (studio < 1) {
    ctx.save(); ctx.globalAlpha *= 1;
    nest(ctx, lt);
    // the cocoon, cut open, deflates once empty
    BR.cocoon(ctx, CX, CY, 1.9 * (1 - emerge * .12), { spin: 1, mec: 1, tear, ang: -.04, a: 1 - ss(2.4, 3.6, lt) * .4 });
    // the new worker: folded inside -> slides out, legs and antennae unfold, pale -> dark
    const s = 1.2, x = lerp(CX + 12, CX + 300, out3(emerge)), y = lerp(CY + 52, FLOOR, out3(emerge));
    if (emerge > 0) {
      ANT.draw(ctx, x, y, s, { caste: 'worker', legsUp: 1 - ss(.2, .9, emerge), antFold: 1 - ss(.4, 1, emerge), head: .55 * (1 - ss(.3, 1, emerge)), callow: 1 - dark, pale: .4 * (1 - dark), ant: lt * .5, phase: emerge > .5 ? lt * 1.2 : undefined, jaw: .2 });
    }
    // sisters biting the cocoon open
    const bite = Math.abs(Math.sin(lt * 9)) * (1 - ss(1.2, 1.6, lt));
    const sx1 = lerp(CX + 370, CX + 560, ss(1.4, 2.8, lt));
    ANT.draw(ctx, sx1, FLOOR, 1.25, { caste: 'worker', flip: true, head: .3 * bite, jaw: .2 + .8 * bite, ant: lt * .8, phase: lt > 1.4 ? lt * 1.4 : undefined });
    ANT.draw(ctx, CX - 330, FLOOR, 1.15, { caste: 'worker', head: .25 * bite, jaw: .2 + .8 * bite, ant: lt * .7 + 1 });
    ctx.restore();
    T.heading(ctx, lt - .2, 3.3, 80, 660, 4, 'ADULT', 'cut free by her sisters');
    T.tag(ctx, lt - 2.0, 1.9, x + 60, y - 70, x + 30, y - 360, 'CALLOW', 'a new adult: soft and pale', { side: -1 });
    T.caption(ctx, lt - 1.7, 2.3, 1620, ['Her skin *hardens and darkens* in days,', 'and she will *never grow again*.'], { size: 50 });
  }
  if (studio <= 0) return;
  // anatomy plate
  ctx.save(); ctx.globalAlpha *= studio;
  const g = ctx.createRadialGradient(540, 1060, 50, 540, 1060, 1100); g.addColorStop(0, '#3a2414'); g.addColorStop(.6, '#1a0f08'); g.addColorStop(1, '#0a0604');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  // blueprint grid + measuring marks
  ctx.strokeStyle = 'rgba(255,210,160,.05)'; ctx.lineWidth = 1;
  for (let x = 0; x <= W; x += 60) { ctx.beginPath(); ctx.moveTo(x, 300); ctx.lineTo(x, 1700); ctx.stroke(); }
  for (let y = 300; y <= 1700; y += 60) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
  G.text(ctx, 'WORKER  ·  SIDE VIEW  ·  ×40', 540, 380, { font: 'Mono', size: 22, color: T.AMBER, align: 'center', track: 5, alpha: ss(4.3, 4.8, lt) });
  G.ellipseGlow(ctx, 520, 1206, 440, 44, '#000', .6);
  const s = 2.8, ax = 520, ay = 1200;
  const scanY = lerp(500, 1300, xr);
  ANT.draw(ctx, ax, ay, s, { caste: 'worker', ant: lt * .35, jaw: .25 + .1 * Math.sin(lt * 2), phase: undefined, xray: 0 });
  if (xr > 0) {
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, xr >= 1 ? H : scanY); ctx.clip();
    const xg = ctx.createRadialGradient(540, 1100, 60, 540, 1100, 1000); xg.addColorStop(0, 'rgba(6,26,30,.9)'); xg.addColorStop(1, 'rgba(2,8,10,.96)'); ctx.fillStyle = xg; ctx.fillRect(0, 0, W, H);
    ANT.draw(ctx, ax, ay, s, { caste: 'worker', ant: lt * .35, jaw: .25 + .1 * Math.sin(lt * 2), xray: 1, cropFill: .55 + .1 * Math.sin(lt * 2), hl: { crop: win(7.9, 8.2, 9.6, 10, lt), gut: win(8.3, 8.6, 9.8, 10.2, lt), venom: win(8.7, 9, 10, 10.4, lt), brain: win(9.1, 9.4, 10.2, 10.5, lt) } });
    ctx.restore();
    if (xr < 1) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = rgba('#dffffb', .9 * Math.sin(Math.PI * xr)); ctx.fillRect(0, scanY - 2, W, 4); ctx.restore(); }
  }
  ctx.restore();
  const A = (part) => ANT.toScreen(ax, ay, s, ANT.anchor('worker', part));
  const ext = 4.4, d = 2.9;
  if (xr < 1) {
    const ea = 1 - xr;
    const [anx, any] = A('antenna'), [hx, hy] = A('head'), [ex2, ey2] = A('eye'), [jx, jy] = A('jaw'), [mx, my] = A('meso'), [px, py] = A('pet'), [gx, gy] = A('gaster'), [lx, ly] = A('legs');
    T.tag(ctx, lt - ext, d, anx, any, 700, 560, 'ANTENNAE', 'smell · touch · taste', { a: ea });
    T.tag(ctx, lt - ext - .3, d - .3, hx, hy, 640, 700, 'HEAD', 'brain + jaws', { a: ea, side: -1 });
    T.tag(ctx, lt - ext - .5, d - .5, ex2, ey2, 900, 830, 'COMPOUND EYE', 'many tiny lenses', { a: ea, side: -1 });
    T.tag(ctx, lt - ext - .7, d - .7, jx, jy, 920, 1330, 'MANDIBLES', 'carry · cut · fight', { a: ea, side: -1 });
    T.tag(ctx, lt - ext - .9, d - .9, mx, my, 420, 760, 'MESOSOMA', 'all 6 legs attach here', { a: ea, side: -1 });
    T.tag(ctx, lt - ext - 1.1, d - 1.1, px, py, 300, 1360, 'PETIOLE', 'the narrow "waist"', { a: ea });
    T.tag(ctx, lt - ext - 1.3, d - 1.3, gx, gy, 120, 830, 'GASTER', 'organs inside', { a: ea });
    T.caption(ctx, lt - 4.4, 2.8, 1620, ['*3 body parts*, *6 legs*', 'and *2 elbowed antennae*.'], { size: 54 });
  }
  if (xr > 0) {
    const [cx, cy] = A('crop'), [ux, uy] = A('gut'), [vx, vy] = A('venom'), [bx, by] = A('brain');
    T.tag(ctx, lt - 7.9, 2.75, cx, cy, 320, 820, 'CROP', 'the "social stomach": food to share', { side: 1, subSize: 20 });
    T.tag(ctx, lt - 8.3, 2.35, ux, uy, 120, 1370, 'MIDGUT', 'her own stomach', { color: '#ff9a6c' });
    T.tag(ctx, lt - 8.7, 1.95, vx, vy, 330, 1480, 'VENOM GLAND', 'acid spray or sting', { color: '#c9ff8a' });
    T.tag(ctx, lt - 9.1, 1.55, bx, by, 860, 760, 'BRAIN', null, { color: T.TEAL, side: -1 });
    T.caption(ctx, lt - 7.6, 3.05, 1620, ['Two stomachs: one for herself,', 'one to *share with the colony*.'], { size: 52 });
  }
}

module.exports = { pupa, adult };
