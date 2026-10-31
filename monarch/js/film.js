// Shot table, chapter tags, fact chips and finishing (paper grain, vignette, fades, watermark).
const { C, W, H, FPS, DURATION, TAU, clamp, lerp, ss, hash, rng, rgba, mix } = require('./core');
const { SHOT, CHAPTERS, FACTS } = require('./cues');
const D = require('./draw');
const U = require('./ui');
const { T } = require('./tex');
const Wd = require('./world'), S = require('./scene'), B = require('./butterfly'), TR = require('./trees');
const SA = require('./shotsA'), SB = require('./shotsB'), SC = require('./shotsC'), SD = require('./shotsD'), SE = require('./shotsE');

const SHOTS = [
  { a: SHOT.title, b: SHOT.egg, f: SA.s1 },
  { a: SHOT.egg, b: SHOT.hatch, f: SA.s2 },
  { a: SHOT.hatch, b: SHOT.grow, f: SA.s3 },
  { a: SHOT.grow, b: SHOT.bird, f: SB.s4 },
  { a: SHOT.bird, b: SHOT.wander, f: SB.s5 },
  { a: SHOT.wander, b: SHOT.pupa, f: SB.s6 },
  { a: SHOT.pupa, b: SHOT.meta, f: SC.s7 },
  { a: SHOT.meta, b: SHOT.emerge, f: SC.s8 },
  { a: SHOT.emerge, b: SHOT.flight, f: SC.s9 },
  { a: SHOT.flight, b: SHOT.adult, f: SC.s10 },
  { a: SHOT.adult, b: SHOT.gens, f: SD.s11 },
  { a: SHOT.gens, b: SHOT.migrate, f: SD.s12 },
  { a: SHOT.migrate, b: SHOT.mexico, f: SD.s13 },
  { a: SHOT.mexico, b: SHOT.ret, f: SE.s14 },
  { a: SHOT.ret, b: SHOT.finale, f: SE.s15 },
  { a: SHOT.finale, b: DURATION, f: SE.s16 },
];

// motion-design wipes: both shots are drawn and the new one is revealed behind a moving seam (tilted by `ang`), hidden
// under a giant out-of-focus monarch flying past the lens, a swarm, or a bank of cloud
const WIPES = [
  { at: SHOT.egg, d: .75, kind: 'wing', dir: 1, ang: .22 },
  { at: SHOT.adult, d: .75, kind: 'wing', dir: -1, ang: -.18 },
  { at: SHOT.gens, d: 1.0, kind: 'swarm', dir: 1, ang: .3 },
  { at: SHOT.migrate, d: 1.0, kind: 'swarm', dir: -1, ang: -.25, autumn: 1 },
  { at: SHOT.mexico, d: 1.2, kind: 'mist', dir: 1, ang: .12 },
];
const reset = (ctx) => { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.setLineDash([]); ctx.filter = 'none'; };
function drawShot(ctx, sh, t) {
  reset(ctx); ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  S.SUN.v = null;
  ctx.save(); sh.f(ctx, clamp(t - sh.a, 0, sh.b - sh.a - 1e-3), t); ctx.restore();
  reset(ctx);
  if (S.SUN.v) { const [x, y, a] = S.SUN.v; if (a > .02 && x > -200 && x < W + 200 && y > -200 && y < H + 200) Wd.flare(ctx, x, y, a * .8); }
}
let BUF = null, MASK = null, LO = null;
const canvas = (w, h) => { const c = C.createCanvas(w, h); return [c, c.getContext('2d')]; };
// soft (low-res, upscaled) layer for things right in front of the lens
function lens(ctx, fn, k = 3) {
  if (!LO) LO = canvas(W / k, H / k);
  const [cv, g] = LO; reset(g); g.clearRect(0, 0, W / k, H / k); g.setTransform(1 / k, 0, 0, 1 / k, 0, 0); fn(g);
  ctx.save(); reset(ctx); ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high'; ctx.drawImage(cv, 0, 0, W, H); ctx.restore();
}
const WFX = {
  wing(ctx, x, y, e, t, w) { // a monarch, inches from the lens, sweeps across
    const hd = w.dir > 0 ? w.ang : Math.PI + w.ang;
    lens(ctx, (g) => B.butterfly(g, { x, y, s: 8.5, ...S.flyPose(hd, 0, .12), pitch: .1, flap: .25 + .55 * Math.abs(Math.sin(e * 5)) }));
    lens(ctx, (g) => { g.globalCompositeOperation = 'lighter'; for (let i = 0; i < 18; i++) { const yy = y + (hash(i + 3) - .5) * 1100, L = 200 + hash(i) * 500; g.strokeStyle = rgba('#fff2d0', .18); g.lineWidth = 4 + hash(i + 1) * 8; g.beginPath(); g.moveTo(x - w.dir * (300 + hash(i + 2) * 300), yy); g.lineTo(x - w.dir * (300 + hash(i + 2) * 300 + L), yy - w.dir * L * Math.tan(w.ang)); g.stroke(); } }, 4);
  },
  swarm(ctx, x, y, e, t, w) { // a living curtain of monarchs (near ones huge and soft)
    const r = rng(41), c = Math.cos(w.ang), sn = Math.sin(w.ang);
    ctx.save(); reset(ctx);
    const gl = ctx.createLinearGradient(x - c * 260, y - sn * 260, x + c * 260, y + sn * 260);
    const col = w.autumn ? '#ffb050' : '#ffd890';
    gl.addColorStop(0, rgba(col, 0)); gl.addColorStop(.5, rgba(col, .55)); gl.addColorStop(1, rgba(col, 0));
    ctx.fillStyle = gl; ctx.fillRect(0, 0, W, H); ctx.restore();
    const put = (g, near) => {
      for (let i = 0; i < (near ? 14 : 240); i++) {
        const v = (r() - .5) * 1500, along = (r() - .5) * (near ? 520 : 440) + Math.sin(t * 2 + i) * 30, px = x + c * along - sn * v, py = y + sn * along + c * v;
        const sz = near ? 140 + r() * 160 : 18 + Math.pow(r(), 2) * 70, hd = (w.dir > 0 ? 0 : Math.PI) + w.ang + (r() - .5) * .8;
        if (!near && (px < -80 || px > W + 80 || py < -80 || py > H + 80)) continue;
        B.mini(g, px, py, sz, hd + Math.PI / 2, Math.sin(t * (16 + r() * 8) + i) * .95, { a: near ? .9 : .65 + r() * .35 });
      }
    };
    ctx.save(); reset(ctx); put(ctx, false); ctx.restore();
    lens(ctx, (g) => put(g, true));
  },
  mist(ctx, x, y, e, t, w) { // through a bank of cloud
    const CL = TR.clouds(), c = Math.cos(w.ang), sn = Math.sin(w.ang);
    ctx.save(); reset(ctx);
    const gl = ctx.createLinearGradient(x - c * 420, y - sn * 420, x + c * 420, y + sn * 420);
    gl.addColorStop(0, 'rgba(240,244,250,0)'); gl.addColorStop(.5, 'rgba(240,244,250,.92)'); gl.addColorStop(1, 'rgba(240,244,250,0)');
    ctx.fillStyle = gl; ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 9; i++) { const v = (i - 4) * 150, along = (hash(i + 8) - .5) * 300, px = x + c * along - sn * v, py = y + sn * along + c * v + 160; TR.drawSprite(ctx, CL[i % 4], px, py, 380 + hash(i + 9) * 200, { flip: i % 2 === 0, alpha: .95 }); }
    ctx.restore();
  },
};
function wipe(ctx, w, t) {
  const A = SHOTS.find((s) => s.b === w.at), Bs = SHOTS.find((s) => s.a === w.at);
  const u = clamp((t - (w.at - w.d / 2)) / w.d), e = u < .5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
  drawShot(ctx, A, t);
  if (!BUF) { BUF = canvas(W, H); MASK = canvas(W, H); }
  drawShot(BUF[1], Bs, t);
  // seam travels along the tilted direction; the new shot shows on the side it has already passed
  const c = Math.cos(w.ang), sn = Math.sin(w.ang), span = 760 + 260, s0 = -span * w.dir, s1 = span * w.dir, sp = lerp(s0, s1, e);
  const x = 540 + c * sp, y = 540 + sn * sp, mg = MASK[1];
  reset(mg); mg.clearRect(0, 0, W, H); mg.drawImage(BUF[0], 0, 0); mg.globalCompositeOperation = 'destination-in';
  const gr = mg.createLinearGradient(x - c * 70 * w.dir, y - sn * 70 * w.dir, x + c * 70 * w.dir, y + sn * 70 * w.dir);
  gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
  mg.fillStyle = gr; mg.fillRect(0, 0, W, H);
  reset(ctx); ctx.drawImage(MASK[0], 0, 0);
  WFX[w.kind](ctx, x, y, e, t, w);
}

function frame(ctx, f) {
  const t = Math.min(DURATION - 1e-6, f / FPS);
  B.CLOCK.t = t;
  const sh = SHOTS.find((s) => t >= s.a && t < s.b) || SHOTS[SHOTS.length - 1];
  const w = WIPES.find((q) => Math.abs(t - q.at) < q.d / 2);
  if (w) wipe(ctx, w, t); else drawShot(ctx, sh, t);
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.setLineDash([]); ctx.filter = 'none';
  for (const c of CHAPTERS) U.chapter(ctx, c.n, c.s, t - c.a, c.d);
  for (const [a, d, s] of FACTS) U.chip(ctx, s, t - a, d);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = .7; ctx.drawImage(T.grain, 0, 0); ctx.globalAlpha = 1;
  const g = ctx.createRadialGradient(540, 540, 420, 540, 540, 820);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(12,6,20,0.32)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  const fade = Math.max(1 - clamp(t / .9), ss(DURATION - 1.2, DURATION - .05, t));
  if (fade > 0) { ctx.fillStyle = rgba('#000000', fade); ctx.fillRect(0, 0, W, H); }
  xmark(ctx);
}

// X logo badge + handle, bottom-left
const X_LOGO = 'M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z';
let xLogo = null;
function xmark(ctx) {
  if (!xLogo) { C.GlobalFonts.registerFromPath('/System/Library/Fonts/SFNS.ttf', 'XMark'); xLogo = new C.Path2D(X_LOGO); }
  const s = Math.min(W, H) / 1080, b = 27 * s, x = 30 * s, y = H - 22 * s - b, g = 16 * s;
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.filter = 'none';
  ctx.shadowColor = 'rgba(0,0,0,.35)'; ctx.shadowBlur = 7 * s; ctx.shadowOffsetY = 2 * s;
  ctx.fillStyle = 'rgba(0,0,0,.94)'; ctx.beginPath(); ctx.roundRect(x, y, b, b, 7 * s); ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.save(); ctx.translate(x + (b - g) / 2, y + (b - g) / 2); ctx.scale(g / 24, g / 24); ctx.fillStyle = '#fff'; ctx.fill(xLogo); ctx.restore();
  ctx.font = `600 ${20 * s}px XMark`; ctx.letterSpacing = `${.8 * s}px`; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0,20,30,.8)'; ctx.shadowBlur = 9 * s; ctx.shadowOffsetY = 2 * s;
  ctx.fillStyle = 'rgba(255,255,255,.94)'; ctx.fillText('@vipinxtwt', x + b + 11 * s, y + b / 2 + s);
  ctx.letterSpacing = '0px';
  ctx.restore();
}

module.exports = { frame, SHOTS };
