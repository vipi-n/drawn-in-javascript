// HUD: chapter tags, short fact chips, day badge, clock dial, number counters, season wheel, life-span bars, scale ruler.
const { W, H, TAU, clamp, lerp, ss, hash, rgba, mix, PAL } = require('./core');
const D = require('./draw');
const M = require('./motion');
const F = require('./fx');

const screen = (ctx) => ctx.setTransform(1, 0, 0, 1, 0, 0);

// chapter tag: numbered disc + title on a pill, springs in from the left and drops away
function chapter(ctx, n, s, age, dur, o = {}) {
  if (age < 0 || age > dur + .5) return;
  screen(ctx);
  const pin = M.spring(age, 1.6, 6), pout = M.expoIn(clamp((age - dur) / .45));
  const x = (o.x ?? 46) - 600 * pout, y = o.y ?? 66;
  ctx.save(); ctx.translate(x, y); ctx.globalAlpha = clamp(age * 4) * (1 - pout);
  ctx.font = '30px AvDemi';
  const tw = ctx.measureText(s).width, w = (tw + 92) * clamp(pin, 0, 1.15);
  ctx.shadowColor = 'rgba(20,10,0,.35)'; ctx.shadowBlur = 14; ctx.shadowOffsetY = 5;
  ctx.fillStyle = rgba(o.bg ?? PAL.cream); F.rrect(ctx, 0, -28, Math.max(56, w), 56, 28); ctx.fill();
  ctx.shadowColor = 'transparent';
  const k = M.spring(age - .05, 2.2, 6);
  ctx.fillStyle = rgba(o.disc ?? '#e8701c'); ctx.beginPath(); ctx.arc(28, 0, 22 * clamp(k, 0, 1.3), 0, TAU); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.font = '26px RockB'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  if (k > .3) ctx.fillText(String(n), 28, 2);
  ctx.save(); ctx.beginPath(); ctx.rect(56, -30, Math.max(0, w - 56), 60); ctx.clip();
  ctx.fillStyle = rgba(o.fg ?? PAL.ink); ctx.font = '30px AvDemi'; ctx.textAlign = 'left';
  ctx.fillText(s, 68 + (1 - clamp(pin)) * -30, 2);
  ctx.restore();
  ctx.restore();
}

// fact chip: small dark pill with a glowing orange dot, bottom centre; types on, then lifts away
function chip(ctx, s, age, dur, o = {}) {
  if (age < 0 || age > dur + .4) return;
  screen(ctx);
  const k = M.spring(age, 2, 6.5), out = M.expoIn(clamp((age - dur) / .4));
  ctx.save();
  ctx.font = `${o.size ?? 30}px AvDemi`;
  const tw = ctx.measureText(s).width, w = tw + 74, h = 58, x = (o.x ?? W / 2) - w / 2, y = (o.y ?? H - 128) - out * 30;
  ctx.globalAlpha = clamp(age * 5) * (1 - out);
  ctx.translate(x + w / 2, y + h / 2); ctx.scale(clamp(k, 0, 1.15), clamp(k, 0, 1.15)); ctx.translate(-(x + w / 2), -(y + h / 2));
  ctx.shadowColor = 'rgba(0,0,0,.35)'; ctx.shadowBlur = 18; ctx.shadowOffsetY = 6;
  ctx.fillStyle = rgba(o.bg ?? '#1c1418', .82); F.rrect(ctx, x, y, w, h, h / 2); ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.strokeStyle = rgba(o.col ?? '#ffb347', .55); ctx.lineWidth = 1.6; F.rrect(ctx, x + 3, y + 3, w - 6, h - 6, h / 2 - 3); ctx.stroke();
  D.glow(ctx, x + 32, y + h / 2, 22, o.col ?? '#ffb347', .7); D.dot(ctx, x + 32, y + h / 2, 7, o.col ?? '#ffb347');
  const rv = clamp((age - .12) * 2.2);
  ctx.save(); ctx.beginPath(); ctx.rect(x + 46, y, (w - 46) * rv + 2, h); ctx.clip();
  ctx.fillStyle = rgba('#fff6e6'); ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
  ctx.fillText(s, x + 52, y + h / 2 + 1);
  ctx.restore();
  ctx.restore();
}

// round badge: a word, a big rolling number and a ring of n ticks that fill as the count rises
function badge(ctx, x, y, val, a = 1, o = {}) {
  if (a <= 0) return;
  screen(ctx);
  const r = o.r ?? 84, n = o.n ?? 10, d = clamp(val, 0, n + .999), cur = Math.max(o.min ?? 1, Math.floor(d)), f = d - Math.floor(d);
  ctx.save(); ctx.globalAlpha = a; ctx.translate(x, y);
  const pop = 1 + .12 * Math.exp(-f * 9) * (val >= 1 ? 1 : 0);
  ctx.scale(pop * (o.k ?? 1), pop * (o.k ?? 1));
  ctx.shadowColor = 'rgba(10,5,0,.4)'; ctx.shadowBlur = 18; ctx.shadowOffsetY = 6;
  ctx.fillStyle = rgba(o.bg ?? '#fff6e2'); ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.lineCap = 'round';
  for (let i = 0; i < n; i++) {
    const an = -Math.PI / 2 + TAU * (i + .5) / n, on = d - i > 0;
    ctx.strokeStyle = rgba(on ? (o.col ?? '#e8701c') : '#dccdb0'); ctx.lineWidth = on ? 6 : 4;
    D.line(ctx, Math.cos(an) * (r - 16), Math.sin(an) * (r - 16), Math.cos(an) * (r - 6), Math.sin(an) * (r - 6));
  }
  ctx.fillStyle = rgba(PAL.ink, .75); ctx.font = `${Math.round(r * .22)}px AvDemi`; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  ctx.fillText(o.word ?? 'DAY', 0, -r * .3);
  ctx.save(); ctx.beginPath(); ctx.rect(-r, -r * .28, r * 2, r * .95); ctx.clip();
  ctx.font = `${Math.round(r * .88)}px DIN`; ctx.fillStyle = rgba(o.num ?? PAL.ink);
  const roll = M.expoOut(clamp(f * 6)), prev = cur - 1, fmt = o.fmt ?? String;
  if (f > 0 && f < .17 && prev >= (o.min ?? 1) && val >= 1) {
    ctx.fillText(fmt(prev), 0, r * .6 - roll * r * .9);
    ctx.fillText(fmt(cur), 0, r * .6 + (1 - roll) * r * .9);
  } else ctx.fillText(fmt(cur), 0, r * .6);
  ctx.restore();
  ctx.restore();
}

// clock dial: a sweeping hand races through `hours` (mod 12); label under it
function clock(ctx, x, y, r, hours, a = 1, o = {}) {
  if (a <= 0) return;
  screen(ctx);
  ctx.save(); ctx.globalAlpha = a; ctx.translate(x, y);
  ctx.shadowColor = 'rgba(0,0,0,.35)'; ctx.shadowBlur = 16;
  ctx.fillStyle = rgba(o.bg ?? '#fff6e2', .95); ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.strokeStyle = rgba(PAL.ink, .6); ctx.lineWidth = 2;
  for (let i = 0; i < 12; i++) { const an = TAU * i / 12, L = i % 3 ? 6 : 12; D.line(ctx, Math.cos(an) * (r - 8), Math.sin(an) * (r - 8), Math.cos(an) * (r - 8 - L), Math.sin(an) * (r - 8 - L)); }
  const frac = clamp(hours / (o.max ?? 24));
  ctx.strokeStyle = rgba(o.col ?? '#e8701c', .9); ctx.lineWidth = 6; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.arc(0, 0, r + 9, -Math.PI / 2, -Math.PI / 2 + TAU * frac); ctx.stroke();
  const hh = -Math.PI / 2 + TAU * (hours / 12), mm = -Math.PI / 2 + TAU * hours;
  ctx.strokeStyle = rgba(PAL.ink); ctx.lineWidth = 5; D.line(ctx, 0, 0, Math.cos(hh) * r * .5, Math.sin(hh) * r * .5);
  ctx.lineWidth = 3; D.line(ctx, 0, 0, Math.cos(mm) * r * .78, Math.sin(mm) * r * .78);
  D.dot(ctx, 0, 0, 5, o.col ?? '#e8701c');
  if (o.label) { ctx.fillStyle = rgba(o.labelCol ?? PAL.cream); ctx.font = `${Math.round(r * .42)}px DIN`; ctx.textAlign = 'center'; ctx.fillText(o.label, 0, r + 50); }
  ctx.restore();
}

// big counter with optional unit, kinetic pop on change
function counter(ctx, x, y, val, a = 1, o = {}) {
  if (a <= 0) return;
  screen(ctx);
  const s = (o.fmt ?? ((v) => Math.round(v).toLocaleString('en-US')))(val);
  ctx.save(); ctx.globalAlpha = a;
  ctx.shadowColor = 'rgba(0,0,0,.45)'; ctx.shadowBlur = 16; ctx.shadowOffsetY = 4;
  ctx.font = `${o.size ?? 96}px ${o.font ?? 'DIN'}`; ctx.fillStyle = rgba(o.col ?? PAL.cream); ctx.textAlign = o.align ?? 'center'; ctx.textBaseline = 'alphabetic';
  ctx.fillText(s, x, y);
  if (o.unit) { const w = ctx.measureText(s).width; ctx.font = `${Math.round((o.size ?? 96) * .4)}px AvDemi`; ctx.fillStyle = rgba(o.unitCol ?? '#ffcf6a'); ctx.textAlign = 'left'; ctx.fillText(o.unit, (o.align === 'left' ? x + w : x + w / 2) + 10, y); }
  ctx.restore();
}

// season wheel: four coloured quarters, a hand pointing at the month (0 = Jan .. 12)
function season(ctx, x, y, r, month, a = 1) {
  if (a <= 0) return;
  screen(ctx);
  ctx.save(); ctx.globalAlpha = a; ctx.translate(x, y);
  ctx.shadowColor = 'rgba(0,0,0,.35)'; ctx.shadowBlur = 14;
  ctx.fillStyle = rgba('#fff6e2'); ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill();
  ctx.shadowColor = 'transparent';
  const Q = [['#9fd8ff', 11], ['#9be07a', 2], ['#ffd34a', 5], ['#ff9a3c', 8]]; // winter, spring, summer, autumn (start month)
  for (const [col, m0] of Q) { const a0 = -Math.PI / 2 + TAU * m0 / 12, a1 = a0 + TAU / 4; ctx.fillStyle = rgba(col, .9); ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, r - 8, a0, a1); ctx.closePath(); ctx.fill(); }
  ctx.strokeStyle = rgba('#fff6e2'); ctx.lineWidth = 3;
  for (let i = 0; i < 12; i++) { const an = -Math.PI / 2 + TAU * i / 12; D.line(ctx, Math.cos(an) * r * .55, Math.sin(an) * r * .55, Math.cos(an) * (r - 8), Math.sin(an) * (r - 8)); }
  const an = -Math.PI / 2 + TAU * month / 12;
  ctx.strokeStyle = rgba(PAL.ink); ctx.lineWidth = 5; ctx.lineCap = 'round'; D.line(ctx, 0, 0, Math.cos(an) * (r - 14), Math.sin(an) * (r - 14));
  D.dot(ctx, 0, 0, 7, PAL.ink);
  const MON = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  ctx.fillStyle = rgba(PAL.cream); ctx.font = `${Math.round(r * .4)}px DIN`; ctx.textAlign = 'center';
  ctx.fillText(MON[Math.floor(((month % 12) + 12) % 12)], 0, r + 46);
  ctx.restore();
}

// scale bar: a ruler of `mm` millimetres that is `px` long on screen
function ruler(ctx, x, y, px, mm, a = 1, o = {}) {
  if (a <= 0) return;
  screen(ctx);
  ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = rgba(o.col ?? PAL.cream); ctx.fillStyle = rgba(o.col ?? PAL.cream); ctx.lineWidth = 3; ctx.lineCap = 'round';
  D.line(ctx, x, y, x + px, y); D.line(ctx, x, y - 10, x, y + 10); D.line(ctx, x + px, y - 10, x + px, y + 10);
  ctx.font = '30px DIN'; ctx.textAlign = 'center'; ctx.fillText(o.label ?? `${mm} mm`, x + px / 2, y - 18);
  ctx.restore();
}

// ♂ / ♀ symbols drawn with strokes
function sexSymbol(ctx, x, y, r, male, a = 1, col = PAL.cream) {
  if (a <= 0) return;
  ctx.save(); ctx.globalAlpha *= a; ctx.strokeStyle = rgba(col); ctx.lineWidth = r * .22; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke();
  if (male) { const a0 = -Math.PI / 4, ex = x + Math.cos(a0) * r * 2.1, ey = y + Math.sin(a0) * r * 2.1; D.line(ctx, x + Math.cos(a0) * r, y + Math.sin(a0) * r, ex, ey); D.line(ctx, ex, ey, ex - r * .8, ey); D.line(ctx, ex, ey, ex, ey + r * .8); }
  else { D.line(ctx, x, y + r, x, y + r * 2.2); D.line(ctx, x - r * .6, y + r * 1.65, x + r * .6, y + r * 1.65); }
  ctx.restore();
}

// expanding sound / ripple arcs
function arcs(ctx, x, y, dir, age, o = {}) {
  const n = o.n ?? 3, life = o.life ?? 1.2;
  if (age < 0 || age > life + .5) return;
  ctx.save(); ctx.lineCap = 'round';
  for (let i = 0; i < n; i++) {
    const u = (age - i * (o.gap ?? .12)) / life;
    if (u <= 0 || u >= 1) continue;
    const r = (o.r0 ?? 20) + u * (o.r ?? 160);
    ctx.strokeStyle = rgba(o.col ?? '#ffffff', (1 - u) * .9); ctx.lineWidth = (o.w ?? 5) * (1 - u * .5);
    ctx.beginPath(); ctx.arc(x, y, r, dir - (o.spread ?? .5), dir + (o.spread ?? .5)); ctx.stroke();
  }
  ctx.restore();
}

module.exports = { chapter, chip, badge, clock, counter, season, ruler, sexSymbol, arcs };
