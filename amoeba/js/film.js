// Shot table, chapter captions and finishing (paper grain, vignette, watermark, fades).
const { C, W, H, FPS, DURATION, clamp, ss, rgba, PAL } = require('./core');
const S = require('./shots');
const D = require('./draw');
const { T } = require('./tex');

const SHOTS = [
  { a: 0, b: 5, f: S.s1 },
  { a: 5, b: 11.25, f: S.s2 },
  { a: 11.25, b: 20, f: S.s3 },
  { a: 20, b: 27.5, f: S.s4 },
  { a: 27.5, b: 32.5, f: S.s5 },
  { a: 32.5, b: 45, f: S.s6 },
  { a: 45, b: 53.75, f: S.s7 },
  { a: 53.75, b: 61.25, f: S.s8 },
  { a: 61.25, b: DURATION, f: S.s9 },
];
const CHAPTERS = [
  { a: 5.4, b: 10.6, s: 'i.  a pond, a drop, a world', c: PAL.cream },
  { a: 11.7, b: 15.0, s: 'ii.  walking on false feet', c: '#22303f' },
  { a: 20.4, b: 27.0, s: 'iii.  eating by engulfing', c: '#22303f' },
  { a: 27.9, b: 32.2, s: 'iv.  growing', c: '#22303f' },
  { a: 33.0, b: 40.0, s: 'v.  one becomes two', c: PAL.cream },
  { a: 40.6, b: 44.6, s: 'v.  two become many', c: '#22303f' },
  { a: 45.4, b: 50.6, s: 'vi.  drought: the cyst', c: '#22303f' },
  { a: 51.0, b: 53.4, s: 'vi.  waiting out the dry months', c: PAL.cream },
  { a: 56.6, b: 60.9, s: 'vii.  rain, and life again', c: '#22303f' },
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
  for (const c of CHAPTERS) {
    const a = ss(c.a, c.a + .5, t) * (1 - ss(c.b - .5, c.b, t));
    if (a > 0) D.text(ctx, c.s, 56, 994, { font: 'DidotI', size: 27, color: c.c, alpha: a * .9 });
  }
  // paper grain + gentle vignette on every frame
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
