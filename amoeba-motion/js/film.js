// Shot table, chapter captions (kinetic type) and finishing (paper grain, vignette, watermark, fades).
const { C, W, H, FPS, DURATION, clamp, ss, rgba, PAL } = require('./core');
const SA = require('./shotsA'), SB = require('./shotsB'), SC = require('./shotsC');
const D = require('./draw');
const M = require('./motion');
const { T } = require('./tex');

const SHOTS = [
  { a: 0, b: 5, f: SA.s1 },
  { a: 5, b: 11.25, f: SA.s2 },
  { a: 11.25, b: 20, f: SA.s3 },
  { a: 20, b: 27.5, f: SB.s4 },
  { a: 27.5, b: 32.5, f: SB.s5 },
  { a: 32.5, b: 45, f: SB.s6 },
  { a: 45, b: 53.75, f: SC.s7 },
  { a: 53.75, b: 61.25, f: SC.s8 },
  { a: 61.25, b: DURATION, f: SC.s9 },
];
const CHAPTERS = [
  { a: 5.5, b: 10.4, s: 'i.  a pond, a drop, a world', c: PAL.cream },
  { a: 11.7, b: 14.1, s: 'ii.  walking on false feet', c: '#22303f' },
  { a: 20.4, b: 27.0, s: 'iii.  eating by engulfing', c: '#22303f' },
  { a: 27.8, b: 32.0, s: 'iv.  growing', c: '#22303f' },
  { a: 33.0, b: 39.6, s: 'v.  one becomes two', c: PAL.cream },
  { a: 40.6, b: 44.0, s: 'v.  two become many', c: '#22303f' },
  { a: 45.6, b: 50.6, s: 'vi.  drought: the cyst', c: '#22303f' },
  { a: 51.0, b: 53.4, s: 'vi.  waiting out the dry months', c: PAL.cream },
  { a: 56.8, b: 60.9, s: 'vii.  rain, and life again', c: '#22303f' },
];

function frame(ctx, f) {
  const t = Math.min(DURATION - 1e-6, f / FPS);
  const sh = SHOTS.find((s) => t >= s.a && t < s.b) || SHOTS[SHOTS.length - 1];
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  ctx.save();
  sh.f(ctx, t - sh.a, t);
  ctx.restore();
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.setLineDash([]);
  // captions: letters bounce in, a rule wipes under them, letters drop away on exit
  for (const c of CHAPTERS) {
    if (t < c.a || t > c.b + .1) continue;
    const pin = clamp((t - c.a) / .9), pout = clamp((t - (c.b - .55)) / .55);
    M.kinetic(ctx, c.s, 56, 994, pin, { font: 'DidotI', size: 27, color: c.c, align: 'left', alpha: .92, out: pout, stagger: .55 });
    const w = 120 * M.expoOut(clamp((t - c.a - .2) / .6)) * (1 - M.expoIn(pout));
    if (w > 1) { ctx.strokeStyle = rgba(c.c, .6); ctx.lineWidth = 1.2; D.line(ctx, 56, 1008, 56 + w, 1008); }
  }
  ctx.drawImage(T.grain, 0, 0);
  const g = ctx.createRadialGradient(540, 540, 420, 540, 540, 820);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(20,10,20,0.28)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  const fade = Math.max(1 - clamp(t / .35), ss(DURATION - .6, DURATION - .05, t));
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
