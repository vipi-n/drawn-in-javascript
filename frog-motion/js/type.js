// Typography for the frog film (new design language): text that lives at the WATERLINE.
//  title    - letters rise out of the pond, dripping, with wave-broken reflections
//  chapter  - a stage numeral drops onto a thin surface line (ripple), the stage name surfaces letter by letter,
//             the subline floats just under the surface, wobbling
//  callout  - a ripple pin on the subject, a drawn leader that becomes an underline, the label FILLS like a glass
//  clock    - the time badge is a bubble; when time jumps the bubble pops and a new one rises
const { C, W, H, TAU, clamp, lerp, ss, spring, out3, out5, in3, hash, rgba, mix } = require('./core');
const G = require('./gfx');
const Wt = require('./water');

const GOLD = '#f3d27a', INK = '#ffffff';
const shadowOn = (g, a = .45, b = 14) => { g.shadowColor = `rgba(0,10,8,${a})`; g.shadowBlur = b; g.shadowOffsetY = 2; };
const shadowOff = (g) => { g.shadowColor = 'rgba(0,0,0,0)'; g.shadowBlur = 0; g.shadowOffsetY = 0; };

// ---------------------------------------------------------------- title (letters rise out of the water)
function title(g, e, wy, t, o = {}) {
  const word = o.word ?? 'FROG', size = o.size ?? 230, track = .05 * size;
  if (e <= 0) return;
  G.font(g, 'OptX', size);
  const widths = [...word].map((c) => g.measureText(c).width), total = widths.reduce((a, b) => a + b, 0) + track * (word.length - 1);
  const base = wy - (o.gap ?? 22), L = G.buf('title', W, H), T = G.buf('titleTint', W, H);
  let x = W / 2 - total / 2;
  const rises = [];
  [...word].forEach((c, i) => {
    const r = spring(e - i * .11, 1.25, .62), dy = (1 - r) * (size * 1.05) + in3(clamp((o.sink ?? 0) * 1.4 - i * .1)) * size * 1.1;
    rises.push([x, widths[i], r]);
    G.font(L.g, 'OptX', size); L.g.textBaseline = 'alphabetic';
    L.g.fillStyle = G.lin(L.g, 0, base - size * .75, 0, base, [[0, '#fffaf0'], [.6, '#f8e4b0'], [1, '#e2b85c']]);
    L.g.fillText(c, x, base + dy);
    x += widths[i] + track;
  });
  const fade = o.fade ?? 1;
  // tinted copy for the submerged parts
  T.g.drawImage(L.cv, 0, 0); T.g.globalCompositeOperation = 'source-atop'; T.g.fillStyle = 'rgba(40,110,100,.85)'; T.g.fillRect(0, 0, W, H);
  g.save(); g.globalAlpha = fade;
  // above water: crisp + glow
  g.save(); Wt.clipWater(g, wy, t, false);
  G.layer(g, 'titleGlow', (b) => b.drawImage(L.cv, 0, 0), { k: 2, blur: 14, comp: 'screen', alpha: .55 * fade });
  shadowOn(g, .5, 18); g.drawImage(L.cv, 0, 0); shadowOff(g);
  g.restore();
  // under water: wobbling rows
  g.save(); Wt.clipWater(g, wy, t, true);
  const y0 = Math.floor(wy) - 10, n = Math.min(H - y0, size * 1.2 + 10);
  Wt.shiftRows(g, T.cv, y0, n, (k) => [y0 + k, Math.sin((y0 + k) * .07 + t * 3.1) * 5, .45 * fade]);
  g.restore();
  // reflection of the emerged letters
  g.save(); Wt.clipWater(g, wy, t, true);
  const rn = size * 1.1;
  Wt.shiftRows(g, L.cv, wy + 4, rn, (k) => [wy - k - 3, Math.sin(k * .09 + t * 2.4) * (2 + k * .05), .28 * fade * (1 - k / rn)]);
  g.restore();
  // drips from the letter feet once they are out
  for (let i = 0; i < rises.length; i++) {
    const [lx, lw, r] = rises[i], te = e - i * .11 - .55;
    if (te < 0) continue;
    for (let k = 0; k < 3; k++) {
      const dt = te - k * .23 - hash(i * 7 + k) * .2;
      if (dt < 0 || dt > 1.6) continue;
      const px = lx + lw * (.2 + .6 * hash(i * 13 + k)), fall = Math.min(o.gap ?? 22, 900 * dt * dt), y = base + 4 + fall;
      if (fall < (o.gap ?? 22)) { g.fillStyle = rgba('#e8fff8', .85 * fade); G.ellipse(g, px, y, 2.6, 3.6); g.fill(); }
      else Wt.ripple(g, px, wy, dt - Math.sqrt((o.gap ?? 22) / 900), { speed: 46, life: .9, rings: 2, flat: .26, a: .55 * fade });
    }
  }
  g.restore();
}

// ---------------------------------------------------------------- chapter header
function chapter(g, n, name, sub, e, d, t) {
  if (e < 0 || e > d) return;
  const x0 = 72, ly = H - 128, out = ss(d - .55, d, e);
  g.save();
  // surface line draws in from the numeral, retracts at the end
  G.font(g, 'SvM', 40);
  const tw = G.tw(g, name.toUpperCase(), 40 * .14);
  const L = 110 + tw + 40, a0 = x0 + L * out5(out / 1), a1 = x0 + L * out5(clamp(e / .7));
  if (a1 > a0 + 1) {
    shadowOn(g, .35, 8);
    g.strokeStyle = rgba(INK, .75); g.lineWidth = 1.6;
    g.beginPath(); for (let x = a0; x <= a1; x += 6) { const y = ly + Math.sin(x * .05 - t * 4) * .9 * ss(.2, .8, e); x === a0 ? g.moveTo(x, y) : g.lineTo(x, y); } g.stroke();
    shadowOff(g);
    // glint travelling along the line
    const gx = lerp(a0, a1, ((e * .45) % 1));
    G.glow(g, gx, ly, 16, '#ffffff', .5 * (1 - out));
  }
  // numeral drops onto the line, ripple on landing
  const drop = spring(e - .05, 1.6, .5), na = ss(0, .2, e) * (1 - out);
  G.font(g, 'IoBI', 96);
  const ny = ly - 8 - (1 - drop) * 140 + out * 30;
  g.save(); g.globalAlpha = na; shadowOn(g, .45, 16);
  g.fillStyle = G.lin(g, 0, ny - 80, 0, ny, [[0, '#fff3c8'], [1, GOLD]]);
  g.textBaseline = 'alphabetic'; g.fillText(n, x0, ny);
  shadowOff(g); g.restore();
  const tl = e - .38;
  if (tl > 0) Wt.ripple(g, x0 + 26, ly + 2, tl, { speed: 80, life: 1.4, rings: 2, flat: .22, a: .6 * (1 - out) });
  // stage name surfaces letter by letter (clipped at the line)
  g.save(); g.beginPath(); g.rect(0, 0, W, ly - 1); g.clip();
  shadowOn(g, .45, 12);
  G.text(g, name.toUpperCase(), x0 + 76, ly - 14, {
    font: 'SvM', size: 40, track: .14, color: INK,
    per: (i) => { const r = spring(e - .22 - i * .035, 2.4, .55); return { dy: (1 - r) * 54 + in3(out) * 60, a: 1 }; },
  });
  shadowOff(g); g.restore();
  // subline just under the surface
  if (sub) {
    g.save(); shadowOn(g, .5, 10);
    G.text(g, sub, x0 + 78, ly + 34, {
      font: 'SvL', size: 23, track: .02, color: '#d6f1ea',
      per: (i) => ({ dy: Math.sin(t * 3 + i * .45) * 1.6, a: ss(.55 + i * .012, .85 + i * .012, e) * (1 - out) * .92 }),
    });
    shadowOff(g); g.restore();
  }
  g.restore();
}

// ---------------------------------------------------------------- callout
// a: [x, y] target on screen, b: [x, y] label anchor (underline start)
function callout(g, a, b, label, sub, e, d, t) {
  if (e < 0 || e > d || !a) return;
  const out = ss(d - .4, d, e), k = 1 - out;
  g.save();
  shadowOn(g, .4, 10);
  // pin
  const pr = 7 * spring(e, 3, .45) * k;
  g.strokeStyle = rgba(INK, .95 * k); g.lineWidth = 2.2; G.circle(g, a[0], a[1], pr); g.stroke();
  g.fillStyle = rgba(INK, k); G.circle(g, a[0], a[1], 2.4 * Math.min(1, e * 6)); g.fill();
  shadowOff(g);
  for (let r = 0; r < 2; r++) { const pe = ((e + r * .8) % 1.6) / 1.6; g.strokeStyle = rgba(INK, .5 * (1 - pe) * k); g.lineWidth = 1.5; G.circle(g, a[0], a[1], 7 + pe * 26); g.stroke(); }
  // label metrics
  G.font(g, 'SvM', 27);
  const lw = G.tw(g, label, 27 * .02);
  let dir = b[0] >= a[0] ? 1 : -1;
  b = [b[0], clamp(b[1], 70, H - 190)];
  if (dir > 0 && b[0] + lw + 16 > W - 40) { if (a[0] - (lw + 16) - 40 > 40) { dir = -1; b[0] = Math.min(b[0], a[0] - 40); } else b[0] = W - 56 - lw; }
  if (dir < 0 && b[0] - lw - 16 < 40) { if (a[0] + lw + 56 < W - 40) { dir = 1; b[0] = Math.max(b[0], a[0] + 40); } else b[0] = 56 + lw; }
  if (dir < 0) b[0] = Math.max(b[0], 56 + lw); else b[0] = Math.min(b[0], W - 56 - lw);
  const ux0 = b[0], ux1 = b[0] + dir * (lw + 16);
  // leader: curve to the underline start, then the underline
  const grow = out3(clamp((e - .08) / .45)), cx = lerp(a[0], b[0], .15), cy = b[1];
  const P = [];
  for (let i = 0; i <= 24; i++) { const u = i / 24, x = (1 - u) * (1 - u) * a[0] + 2 * u * (1 - u) * cx + u * u * b[0], y = (1 - u) * (1 - u) * a[1] + 2 * u * (1 - u) * cy + u * u * b[1]; P.push([x, y]); }
  for (let i = 1; i <= 12; i++) P.push([lerp(ux0, ux1, i / 12), b[1]]);
  const nShow = Math.floor(P.length * grow), retract = Math.floor(P.length * out5(out));
  shadowOn(g, .35, 8);
  g.strokeStyle = rgba(INK, .9); g.lineWidth = 1.7; g.lineCap = 'round';
  g.beginPath(); for (let i = retract; i < nShow; i++) i === retract ? g.moveTo(P[i][0], P[i][1]) : g.lineTo(P[i][0], P[i][1]); g.stroke();
  shadowOff(g);
  // label: outline first, then it fills from the bottom with a wavy meniscus
  const fe = clamp((e - .35) / .45), tx = dir > 0 ? ux0 + 8 : ux1 + 8, ty = b[1] - 10;
  if (e > .3) {
    g.save(); g.globalAlpha = k * ss(.3, .45, e);
    shadowOn(g, .55, 12);
    G.text(g, label, tx, ty, { font: 'SvM', size: 27, track: .02, color: null, stroke: rgba(INK, .55), strokeW: 1.2 });
    shadowOff(g);
    g.save();
    g.beginPath(); g.moveTo(tx - 10, ty + 8);
    const lvl = ty + 8 - fe * 38;
    for (let x = tx - 10; x <= tx + lw + 20; x += 6) g.lineTo(x, lvl + Math.sin(x * .12 - t * 9) * 2.4 * (1 - fe));
    g.lineTo(tx + lw + 20, ty + 8); g.closePath(); g.clip();
    G.text(g, label, tx, ty, { font: 'SvM', size: 27, track: .02, color: INK });
    g.restore();
    if (sub) { shadowOn(g, .55, 10); G.text(g, sub, tx, b[1] + 26, { font: 'IoI', size: 21, color: GOLD, per: (i) => ({ a: ss(.55 + i * .01, .8 + i * .01, e) }) }); shadowOff(g); }
    g.restore();
  }
  g.restore();
}

// ---------------------------------------------------------------- the bubble clock
function clock(g, list, t) {
  let cur = -1;
  for (let i = 0; i < list.length; i++) if (t >= list[i][0]) cur = i;
  if (cur < 0) return;
  const x = W - 112, y = 116, R = 54;
  const [t0, unit, val] = list[cur], e = t - t0;
  // previous bubble pops
  if (cur > 0 && list[cur - 1][2] && e < .45) {
    const pe = e / .45;
    g.save();
    g.strokeStyle = rgba(INK, .7 * (1 - pe)); g.lineWidth = 2.5 * (1 - pe); G.circle(g, x, y, R * (1 + pe * .5)); g.stroke();
    for (let i = 0; i < 10; i++) { const a = i / 10 * TAU + .3, d = R * (1 + pe * 1.1); g.fillStyle = rgba('#e8fff8', .8 * (1 - pe)); G.circle(g, x + Math.cos(a) * d, y + Math.sin(a) * d, 4 * (1 - pe)); g.fill(); }
    g.restore();
  }
  if (!val) return;
  const r = spring(e - .12, 2.2, .45), wob = Math.sin(t * 4.2) * .025 + Math.sin(e * 22) * .06 * Math.exp(-e * 4);
  const by = y + (1 - r) * 120, a = ss(.1, .3, e);
  const nxt = list[cur + 1], fadeOut = nxt && !nxt[2] ? 0 : 0;
  g.save(); g.globalAlpha = a * (1 - fadeOut);
  g.translate(x, by); g.scale(1 + wob, 1 - wob);
  g.fillStyle = G.rad(g, 0, 0, R, [[0, '#0e3a34', .32], [.75, '#1d5a50', .3], [.94, '#e6fff8', .4], [1, '#ffffff', .75]]);
  G.circle(g, 0, 0, R); g.fill();
  g.strokeStyle = rgba(INK, .55); g.lineWidth = 1.5; g.stroke();
  g.fillStyle = 'rgba(255,255,255,.7)'; G.ellipse(g, -R * .66, -R * .3, R * .13, R * .06, -1.1); g.fill();
  shadowOn(g, .35, 6);
  G.text(g, unit, 0, -16, { font: 'SvM', size: 14, track: .32, color: '#d6f1ea', align: 'center' });
  G.text(g, val, 0, 26, { font: 'OptB', size: val.length > 1 ? 40 : 46, color: INK, align: 'center' });
  shadowOff(g);
  g.restore();
}

// X logo badge + handle, bottom-left
const X_LOGO = 'M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z';
let xLogo = null;
function watermark(ctx) {
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

module.exports = { title, chapter, callout, clock, watermark, shadowOn, shadowOff, GOLD };
