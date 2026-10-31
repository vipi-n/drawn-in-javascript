// Edit decision list: shots on the bar grid, title cards, flashes, letterbox.
const { C, W, H, FPS, BAR, BEAT, BARS, DURATION, clamp, lerp, ss } = require('./core');
const G = require('./gfx');
const S1 = require('./shots1');
const S2 = require('./shots2');

// recap: one remembered image per beat
const RECAP = [[S1.bicycle, 2], [S1.nikeTrail, 2.5], [S1.cartShot, 3], [S1.slv3, 3], [S1.pslvLaunch, 3.5], [S2.mars, 7], [S2.lvm3Launch, 1.2], [S2.touchdown, .6]];
function recap(ctx, P, lt, d, t) {
  const k = Math.min(RECAP.length - 1, Math.floor(lt / BEAT)), [fn, at] = RECAP[k];
  fn(ctx, P, at + (lt - k * BEAT) * .6, BAR * 2, t);
}

const SHOTS = [
  { a: 0, b: 4, fn: S1.open, fin: 2.5, fout: .4 },
  { a: 4, b: 8, fn: S1.thumba, fin: .8, fout: .3 },
  { a: 8, b: 10, fn: S1.bicycle, fin: .2 },
  { a: 10, b: 12, fn: S1.quoteBg, fin: .6, fout: .5 },
  { a: 12, b: 14.5, fn: S1.nikePad, fin: .4 },
  { a: 14.5, b: 16, fn: S1.nikeTrail },
  { a: 16, b: 17, fn: S1.card1969, flash: .6, fout: .2 },
  { a: 17, b: 19, fn: S1.aryabhata, fin: .2 },
  { a: 19, b: 21, fn: S1.slv3 },
  { a: 21, b: 23, fn: S1.cartShot },
  { a: 23, b: 25, fn: S1.porthole },
  { a: 25, b: 27, fn: S1.pslvPad, fin: .2 },
  { a: 27, b: 29, fn: S1.pslvLaunch, flash: .3 },
  { a: 29, b: 31, fn: S1.deploy },
  { a: 31, b: 32, fn: S1.words, beatFlash: .25 },
  { a: 32, b: 36, fn: S2.moon1, flash: .7 },
  { a: 36, b: 40, fn: S2.mars, flash: .25 },
  { a: 40, b: 42, fn: S2.control, fin: 1.4 },
  { a: 42, b: 43, fn: S2.descent19 },
  { a: 43, b: 44, fn: S2.graph },
  { a: 44, b: 45, fn: S2.lost },
  { a: 45, b: 48, fn: S2.orbiter, fin: 1.6, fout: .3 },
  { a: 48, b: 50, fn: S2.lvm3Pad, fin: 1 },
  { a: 50, b: 52, fn: S2.lvm3Launch, flash: .6 },
  { a: 52, b: 54, fn: S2.trajectory, fin: .3 },
  { a: 54, b: 56, fn: S2.lunarOrbit },
  { a: 56, b: 59.5, fn: S2.descent },
  { a: 59.5, b: 60, fn: S2.hush },
  { a: 60, b: 62, fn: S2.touchdown, flash: 1.3 },
  { a: 62, b: 64, fn: S2.onMoon },
  { a: 64, b: 66, fn: S2.pragyan },
  { a: 66, b: 67, fn: S2.aditya, flash: .2 },
  { a: 67, b: 68, fn: S2.gaganyaan },
  { a: 68, b: 70, fn: recap, beatFlash: .3 },
  { a: 70, b: BARS + 2, fn: S2.title, flash: 1.0 },
];

// ---------- type ----------
const ST = {
  year: { font: 'AvDemi', size: 25, track: 14, color: [255, 178, 96] },
  head: { font: 'AvMed', size: 64, track: 10, color: [255, 255, 255] },
  big: { font: 'AvMed', size: 150, track: 36, color: [255, 255, 255] },
  sub: { font: 'AvMed', size: 24, track: 7, color: [214, 222, 234] },
  hindi: { font: 'KohB', size: 74, track: 2, color: [255, 236, 210] },
  quote: { font: 'DidotI', size: 46, track: 1, color: [255, 246, 232] },
  word: { font: 'AvDemi', size: 140, track: 46, color: [255, 255, 255] },
  title: { font: 'AvDemi', size: 200, track: 84, color: [255, 255, 255] },
};
// [startBar, endBar, y, [[style, text, dy]...], opts]
const L = 790; // lower third
const CUES = [
  [.6, 1.95, 540, [['year', '1963', -50], ['head', 'INDIA HAD NO ROCKETS.', 20]]],
  [2.0, 2.95, 540, [['head', 'NO SATELLITES.', 0]]],
  [3.0, 3.95, 540, [['head', 'NO LAUNCH PAD.', 0]]],
  [4.3, 6.0, 420, [['year', 'THUMBA · KERALA', -45], ['head', 'A FISHING VILLAGE ON THE MAGNETIC EQUATOR', 20, 40]]],
  [6.1, 7.95, 420, [['head', 'ITS CHURCH BECAME THE FIRST OFFICE.', 0, 48]]],
  [8.15, 9.95, 260, [['head', 'ROCKET PARTS ARRIVED BY BICYCLE.', 0]]],
  [10.15, 11.92, 500, [['quote', '“There are some who question the relevance of space', -80], ['quote', 'activities in a developing nation. To us, there is', -14], ['quote', 'no ambiguity of purpose.”', 52], ['sub', 'DR. VIKRAM SARABHAI  ·  FATHER OF THE INDIAN SPACE PROGRAMME', 150]]],
  [12.2, 13.45, 250, [['year', '21 NOVEMBER 1963', -45], ['head', 'THE FIRST LAUNCH', 20]]],
  [16.15, 16.95, 640, [['year', '1969', 0], ['sub', 'THE INDIAN SPACE RESEARCH ORGANISATION IS BORN', 52]]],
  [17.15, 18.9, L, [['year', '1975', -60], ['head', 'ARYABHATA', 0], ['sub', 'INDIA’S FIRST SATELLITE', 62]]],
  [19.15, 20.9, L, [['year', '1980', -60], ['head', 'SLV-3 REACHES ORBIT', 0], ['sub', 'PROJECT DIRECTOR  ·  DR. A. P. J. ABDUL KALAM', 62]]],
  [21.15, 22.9, 260, [['year', '1981', -60], ['head', 'APPLE', 0], ['sub', 'A SATELLITE, CARRIED ON A BULLOCK CART', 62]]],
  [23.1, 23.95, L, [['year', '1984', -60], ['head', 'RAKESH SHARMA', 0], ['sub', 'FIRST INDIAN IN SPACE', 62]]],
  [24.0, 24.97, 760, [['sub', 'ASKED HOW INDIA LOOKED FROM SPACE, HE SAID', -80], ['hindi', 'सारे जहाँ से अच्छा', 0], ['sub', '“BETTER THAN THE WHOLE WORLD”', 80]]],
  [25.12, 25.97, 300, [['year', '1993', -50], ['head', 'PSLV’S FIRST FLIGHT FAILS.', 15]]],
  [26.05, 26.97, 300, [['year', '1994', -50], ['head', 'IT FLIES.', 15]]],
  [29.15, 30.92, 300, [['year', '2017', -50], ['head', '104 SATELLITES. ONE ROCKET.', 15]]],
  [31.0, 31.24, 540, [['word', 'DREAM', 0]], { snap: true }],
  [31.25, 31.49, 540, [['word', 'BUILD', 0]], { snap: true }],
  [31.5, 31.74, 540, [['word', 'FAIL', 0]], { snap: true }],
  [31.75, 31.99, 540, [['word', 'RISE', 0]], { snap: true }],
  [32.2, 33.92, 280, [['year', '2008', -50], ['head', 'CHANDRAYAAN-1', 15]]],
  [34.8, 35.95, 220, [['head', 'IT FOUND WATER ON THE MOON.', 0]]],
  [36.2, 37.92, L, [['year', '2014', -50], ['head', 'MANGALYAAN', 15]]],
  [38.1, 39.85, 300, [['head', 'MARS. ON THE FIRST ATTEMPT.', 0], ['sub', 'THE FIRST ASIAN NATION TO REACH MARS ORBIT', 62]]],
  [40.45, 41.92, 540, [['year', '7 SEPTEMBER 2019', -50], ['head', 'CHANDRAYAAN-2', 15]]],
  [44.15, 44.97, 540, [['year', '2.1 KM ABOVE THE MOON', -50], ['head', 'SIGNAL LOST.', 15]]],
  [45.5, 46.45, 250, [['head', 'THE LANDER WAS LOST.', 0]]],
  [46.55, 47.92, 250, [['head', 'THE RESOLVE WAS NOT.', 0]]],
  [48.25, 49.92, 280, [['year', '14 JULY 2023', -50], ['head', 'CHANDRAYAAN-3', 15]]],
  [52.15, 53.92, 850, [['head', '40 DAYS.  384,000 KILOMETRES.', 0, 52]]],
  [54.15, 55.92, L, [['year', 'TARGET', -60], ['head', 'THE LUNAR SOUTH POLE', 0], ['sub', 'WHERE NO ONE HAD LANDED BEFORE', 62]]],
  [56.08, 56.95, L, [['year', '23 AUGUST 2023', 0]]],
  [60.3, 61.95, L, [['year', '23 · 08 · 2023', -50], ['head', '18:04 IST', 15]]],
  [62.1, 63.96, 300, [['head', 'INDIA IS ON THE MOON.', 0, 86]]],
  [64.12, 65.94, 330, [['quote', '“India, I reached', -50], ['quote', 'my destination', 6], ['quote', 'and you too!”', 62], ['sub', 'CHANDRAYAAN-3', 130]], { x: 560 }],
  [66.05, 66.96, L, [['year', '2023', -60], ['head', 'ADITYA-L1', 0], ['sub', 'INDIA TURNS TO THE SUN', 62]]],
  [67.04, 67.97, L, [['year', 'NEXT', -60], ['head', 'GAGANYAAN', 0], ['sub', 'INDIANS IN SPACE, ON AN INDIAN ROCKET', 62]]],
  [68.02, 68.97, 540, [['head', 'FROM A BICYCLE IN THUMBA', 0]]],
  [69.0, 69.97, 540, [['head', 'TO THE SOUTH POLE OF THE MOON.', 0]]],
  [70.6, 72.55, 650, [['hindi', 'भारतीय अंतरिक्ष अनुसंधान संगठन', 0, 42], ['sub', 'INDIAN SPACE RESEARCH ORGANISATION', 62]], { slow: true }],
  [72.95, 74.6, 820, [['head', 'THE JOURNEY HAS ONLY BEGUN.', 0, 44]], { slow: true }],
];

function drawCues(ctx, t) {
  for (const [a, b, y, lines, o = {}] of CUES) {
    const t0 = a * BAR, t1 = b * BAR;
    if (t < t0 || t > t1) continue;
    const lt = t - t0, fi = o.snap ? .02 : o.slow ? 1.2 : .45, fo = o.snap ? .12 : .4;
    const al = Math.min(clamp(lt / fi), clamp((t1 - t) / fo));
    lines.forEach(([st, str, dy, size], i) => {
      const s = { ...ST[st] };
      if (size) s.size = size;
      const delay = o.snap ? 0 : i * .12, a2 = al * clamp((lt - delay) / fi);
      let sz = s.size;
      const w = G.measure(ctx, str, { ...s, size: sz });
      if (w > 1500) sz *= 1500 / w;
      // titles stay put: sub-pixel drift and animated tracking make hinted glyphs shimmer
      G.text(ctx, str, Math.round(o.x ?? 960), Math.round(y + dy), { ...s, size: sz, alpha: a2, glow: st === 'title' ? .5 : .75, glowBlur: st === 'title' ? 40 : 22, glowColor: st === 'title' ? [255, 210, 160] : [0, 0, 0] });
    });
  }
}

function shotAt(t) { const b = t / BAR; return SHOTS.find((s) => b >= s.a && b < s.b) || SHOTS[SHOTS.length - 1]; }

function frame(ctx, P, f) {
  const t = f / FPS, s = shotAt(t), lt = t - s.a * BAR, d = (s.b - s.a) * BAR;
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  ctx.save(); s.fn(ctx, P, lt, d, t); ctx.restore();
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.filter = 'none';
  let blk = 0;
  if (s.fin) blk = Math.max(blk, 1 - lt / s.fin);
  if (s.fout) blk = Math.max(blk, 1 - (d - lt) / s.fout);
  G.scrim(ctx, clamp(blk));
  let fl = 0;
  if (s.flash) fl = Math.max(fl, Math.exp(-lt / s.flash * 3.5) * clamp(s.flash * 1.4));
  if (s.beatFlash) fl = Math.max(fl, Math.exp(-((lt % BEAT) / s.beatFlash) * 3.5) * .8);
  if (fl > .003) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = `rgba(255,248,235,${clamp(fl)})`; ctx.fillRect(0, 0, W, H); ctx.restore(); }
  drawCues(ctx, t);
  const b = t / BAR, lb = b < 60 ? 1 : b < 70 ? 1 - ss(60, 60.8, b) : ss(69.9, 70.05, b);
  G.letterbox(ctx, lb);
  // closing fade
  G.scrim(ctx, ss(DURATION - 2.6, DURATION - .3, t));
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
