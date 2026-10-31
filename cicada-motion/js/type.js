// Motion-graphic language for the cicada film: "sound waves + tree rings".
//   chapter(): a gold italic numeral, the stage name revealed through a buzzing waveform line that settles flat, a subline.
//   callout(): a pin that pulses rings, a leader that draws out and turns into an underline, a label.
//   lens(): a magnifier that pops on a spring, tethered to its subject by tangent lines.
//   dial(): a time badge built from growth rings (DAY / WEEK / YEAR), one ring per tick.
//   title(): the CICADA wordmark resolving out of a sound wave.
const { W, H, TAU, clamp, lerp, ss, out3, out5, back, io3, rgba, mix, hash, noise } = require('./core');
const G = require('./gfx');

const GOLD = '#f2b25c', CREAM = '#fff4e0', INK = '#1a120c';

// spring with overshoot: 0 -> 1 over d seconds
const spring = (t, d = .6, k = 1.6) => { const u = clamp(t / d); return 1 - Math.exp(-6 * u) * Math.cos(k * TAU * u * .9) * (1 - u * u * 0); };

function wave(ctx, x0, x1, y, amp, freq, phase, color, a, w = 2) {
  ctx.save(); ctx.strokeStyle = rgba(color, a); ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.beginPath();
  const n = Math.max(8, Math.round((x1 - x0) / 3));
  for (let i = 0; i <= n; i++) {
    const u = i / n, x = lerp(x0, x1, u), env = Math.sin(Math.PI * u);
    const yy = y + Math.sin(u * freq + phase) * amp * env * (.6 + .4 * Math.sin(u * freq * .23 + phase * .7));
    i ? ctx.lineTo(x, yy) : ctx.moveTo(x, yy);
  }
  ctx.stroke(); ctx.restore();
}

// chapter header at bottom-left. t = seconds since its start; dur = total on-screen time
function chapter(ctx, t, dur, num, name, sub, o = {}) {
  if (t < 0 || t > dur) return;
  const x = o.x ?? 64, y = o.y ?? (H - 140), out = ss(dur - .7, dur, t);
  const a = ss(0, .25, t) * (1 - out);
  ctx.save();
  // legibility scrim
  const sg = ctx.createRadialGradient(x + 180, y - 10, 0, x + 180, y - 10, 420);
  sg.addColorStop(0, `rgba(10,6,3,${.42 * a})`); sg.addColorStop(1, 'rgba(10,6,3,0)');
  ctx.fillStyle = sg; ctx.fillRect(x - 260, y - 420, 900, 840);
  // numeral drops in with a spring
  const nk = spring(t - .05, .7), ny = y + (1 - nk) * -40;
  G.text(ctx, String(num), x, ny + 6, { font: 'IoBI', size: 92, color: GOLD, alpha: ss(.05, .3, t) * (1 - out), shadow: 18 });
  const nw = G.measure(ctx, String(num), { font: 'IoBI', size: 92 });
  const lx = x + nw + 18;
  // waveform line: buzzes, then settles into a flat rule
  const lw = 360 * out3(ss(.15, .75, t)) * (1 - out * .4);
  const settle = ss(.5, 1.4, t), buzz = (1 - settle) * 10 + out * 9;
  wave(ctx, lx, lx + lw, y + 14, buzz, 60, t * 40, GOLD, .9 * a, 2);
  // stage name: letters surface through the line (clip above the line)
  const name2 = name.toUpperCase();
  ctx.save(); ctx.beginPath(); ctx.rect(lx - 10, y - 120, 900, 133); ctx.clip();
  let cx = lx;
  for (let i = 0; i < name2.length; i++) {
    const ch = name2[i], k = out3(ss(.3 + i * .045, .75 + i * .045, t)), dk = ss(dur - .7 + i * .02, dur - .3 + i * .02, t);
    const yy = y + (1 - k) * 46 + dk * 46;
    G.text(ctx, ch, cx, yy, { font: 'OptB', size: 40, color: CREAM, track: 0, alpha: a, shadow: 14 });
    cx += G.measure(ctx, ch, { font: 'OptB', size: 40 }) + 7;
  }
  ctx.restore();
  if (sub) G.text(ctx, sub, lx, y + 50, { font: 'IoI', size: 23, color: '#ffe2bd', alpha: ss(.9, 1.4, t) * (1 - out) * .95, shadow: 12 });
  ctx.restore();
}

// callout: pin at (px,py), label at (lx,ly). side: 1 label to the right, -1 left
function callout(ctx, t, dur, px, py, lx, ly, label, sub, o = {}) {
  if (t < 0 || t > dur) return;
  const out = ss(dur - .5, dur, t), a = 1 - out, side = o.side ?? (lx >= px ? 1 : -1), col = o.color ?? CREAM;
  ctx.save();
  // pin with sound rings
  const pk = spring(t, .5);
  ctx.fillStyle = rgba(GOLD, a); ctx.beginPath(); ctx.arc(px, py, 5.5 * pk, 0, TAU); ctx.fill();
  ctx.strokeStyle = rgba(col, .9 * a); ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(px, py, 10 * pk, 0, TAU); ctx.stroke();
  for (let k = 0; k < 2; k++) { const r = ((t * .9 + k * .5) % 1); ctx.strokeStyle = rgba(GOLD, .55 * (1 - r) * a); ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(px, py, 10 + r * 30, 0, TAU); ctx.stroke(); }
  // leader: pin -> elbow -> underline
  const lw = G.measure(ctx, label, { font: 'OptB', size: o.size ?? 22, track: 3 }) + 12;
  const p1 = ss(.15, .5, t), p2 = ss(.45, .85, t);
  const ex = lx, ey = ly + 10;
  ctx.strokeStyle = rgba(col, .85 * a); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(px, py);
  ctx.lineTo(lerp(px, ex, p1), lerp(py, ey, p1));
  if (p2 > 0) ctx.lineTo(ex + side * lw * p2, ey);
  ctx.stroke();
  // label rises out of the underline
  ctx.save(); ctx.beginPath(); ctx.rect(side > 0 ? ex - 4 : ex - lw - 4, ey - 60, lw + 8, 60); ctx.clip();
  const lk = out3(ss(.5, .95, t));
  G.text(ctx, label, side > 0 ? ex + 4 : ex - 4, ey - 9 + (1 - lk) * 34, { font: 'OptB', size: o.size ?? 22, color: col, track: 3, alpha: a, align: side > 0 ? 'left' : 'right', shadow: 10 });
  ctx.restore();
  if (sub) G.text(ctx, sub, side > 0 ? ex + 4 : ex - 4, ey + 26, { font: 'IoI', size: 19, color: GOLD, alpha: ss(.8, 1.2, t) * a, align: side > 0 ? 'left' : 'right', shadow: 10 });
  ctx.restore();
}

// magnifier: subject point (sx,sy) -> lens centre (cx,cy) radius r. draw(c) paints the lens contents in screen space.
function lens(ctx, t, dur, sx, sy, cx, cy, r, draw, o = {}) {
  if (t < 0 || t > dur) return;
  const k = t < dur - .45 ? spring(t, .65) : 1 - ss(dur - .45, dur, t);
  if (k <= .01) return;
  const R = r * k;
  ctx.save();
  // tangent tether lines from the subject ring to the lens
  const sr = (o.sr ?? 18) * Math.min(1, k * 1.5);
  const dx = cx - sx, dy = cy - sy, d = Math.hypot(dx, dy) || 1, ang = Math.atan2(dy, dx);
  const al = Math.asin(clamp((R - sr) / d, -1, 1));
  ctx.strokeStyle = rgba(CREAM, .55 * k); ctx.lineWidth = 1.2;
  for (const s of [1, -1]) {
    const a2 = ang + s * (Math.PI / 2 + al);
    ctx.beginPath(); ctx.moveTo(sx + Math.cos(a2) * sr, sy + Math.sin(a2) * sr); ctx.lineTo(cx + Math.cos(a2) * R, cy + Math.sin(a2) * R); ctx.stroke();
  }
  ctx.beginPath(); ctx.arc(sx, sy, sr, 0, TAU); ctx.stroke();
  // contents
  ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.clip();
  draw(ctx, R, k);
  const vg = ctx.createRadialGradient(cx, cy, R * .7, cx, cy, R); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.45)');
  ctx.fillStyle = vg; ctx.fillRect(cx - R, cy - R, 2 * R, 2 * R);
  // glass highlight
  const hg = ctx.createLinearGradient(cx - R, cy - R, cx, cy); hg.addColorStop(0, 'rgba(255,255,255,.16)'); hg.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = hg; ctx.beginPath(); ctx.ellipse(cx - R * .25, cy - R * .45, R * .7, R * .32, -.5, 0, TAU); ctx.fill();
  ctx.restore();
  ctx.strokeStyle = rgba(CREAM, .95 * k); ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.stroke();
  ctx.strokeStyle = rgba(GOLD, .8 * k); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(cx, cy, R + 7, -Math.PI * .8, -Math.PI * .2); ctx.stroke();
  if (o.label) G.text(ctx, o.label, cx, o.labelTop ? cy - R - 18 : cy + R + 30, { font: 'OptB', size: 16, color: CREAM, align: 'center', track: 5, alpha: k * ss(.4, .8, t) * (1 - ss(dur - .5, dur, t)) });
  ctx.restore();
}

// time dial (top-right): unit label, value, n growth rings (frac = progress of the current ring)
function dial(ctx, x, y, a, unit, value, rings, frac = 0, o = {}) {
  if (a <= 0) return;
  const R = o.r ?? 58;
  ctx.save(); ctx.globalAlpha *= a;
  ctx.fillStyle = 'rgba(14,9,5,.55)'; ctx.beginPath(); ctx.arc(x, y, R + 8, 0, TAU); ctx.fill();
  // growth rings
  const n = Math.max(0, rings | 0), max = o.max ?? 17;
  for (let i = 0; i < Math.min(n, max); i++) {
    const rr = lerp(R * .2, R * .92, (i + 1) / max);
    ctx.strokeStyle = rgba(i === n - 1 ? GOLD : '#c79a62', i === n - 1 ? .95 : .35); ctx.lineWidth = i === n - 1 ? 2 : 1;
    ctx.beginPath(); for (let k = 0; k <= 48; k++) { const an = k / 48 * TAU, w = 1 + .04 * noise(an * 3 + i * 7); k ? ctx.lineTo(x + Math.cos(an) * rr * w, y + Math.sin(an) * rr * w) : ctx.moveTo(x + Math.cos(an) * rr * w, y + Math.sin(an) * rr * w); } ctx.stroke();
  }
  // progress arc
  ctx.strokeStyle = rgba(CREAM, .9); ctx.lineWidth = 3; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.arc(x, y, R + 8, -Math.PI / 2, -Math.PI / 2 + TAU * clamp(frac), false); ctx.stroke();
  G.text(ctx, unit, x, y - 12, { font: 'OptB', size: 13, color: GOLD, align: 'center', track: 5 });
  G.text(ctx, String(value), x, y + 26, { font: 'Didot', size: o.size ?? 38, color: CREAM, align: 'center', shadow: 10 });
  ctx.restore();
}

// expanding sound arcs from a singer (direction ang, spread)
function soundArcs(ctx, x, y, t, a, o = {}) {
  if (a <= 0) return;
  const { period = .22, n = 6, life = 1.3, speed = 240, ang = 0, spread = 1.2, color = '#fff0cc', w = 2.6 } = o;
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
  for (let i = 0; i < n; i++) {
    const age = (((t / period) % n) + n - i) % n * period;
    if (age > life) continue;
    const k = age / life, r = 18 + age * speed;
    ctx.strokeStyle = rgba(color, a * (1 - k) * (1 - k) * Math.min(1, k * 12)); ctx.lineWidth = w * (1 - k * .5);
    ctx.beginPath(); ctx.arc(x, y, r, ang - spread / 2, ang + spread / 2); ctx.stroke();
  }
  ctx.restore();
}

// the call shape graphic: a mini oscilloscope with a rise-hold-fall envelope being traced
function scope(ctx, x, y, w, h, t, prog, a, label) {
  if (a <= 0) return;
  ctx.save(); ctx.globalAlpha *= a;
  ctx.fillStyle = 'rgba(14,9,5,.5)'; ctx.beginPath(); ctx.roundRect(x - 12, y - h / 2 - 30, w + 24, h + 52, 12); ctx.fill();
  ctx.strokeStyle = 'rgba(255,240,210,.18)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w, y); ctx.stroke();
  const env = (u) => (u < .12 ? u / .12 : u < .72 ? 1 : 1 - ss(.72, 1, u) * .9) * (1 - .3 * ss(.72, 1, u));
  ctx.strokeStyle = rgba(GOLD, .95); ctx.lineWidth = 1.2; ctx.beginPath();
  const n = Math.round(w * 1.4 * clamp(prog));
  for (let i = 0; i <= n; i++) { const u = i / (w * 1.4), xx = x + u * w, v = Math.sin(i * 1.9 + t * 30) * env(u) * h * .45 * (.7 + .3 * Math.sin(i * .21)); i ? ctx.lineTo(xx, y + v) : ctx.moveTo(xx, y + v); }
  ctx.stroke();
  if (label) G.text(ctx, label, x, y - h / 2 - 10, { font: 'OptB', size: 13, color: CREAM, track: 4 });
  ctx.restore();
}

// title wordmark: letters resolve out of a horizontal sound wave
function title(ctx, t, x, y, a, o = {}) {
  if (a <= 0) return;
  const word = 'CICADA', size = o.size ?? 168, track = 22;
  const total = G.measure(ctx, word, { font: 'OptX', size, track });
  let cx = x - total / 2;
  ctx.save();
  // wave that collapses as the letters form
  const settle = ss(.0, 1.1, t);
  wave(ctx, x - total / 2 - 40, x + total / 2 + 40, y - size * .36, (1 - settle) * 70 + 2, 26, t * 22, GOLD, a * (1 - settle * .85), 3);
  for (let i = 0; i < word.length; i++) {
    const ch = word[i], k = out5(ss(.12 + i * .07, .7 + i * .07, t)), w = G.measure(ctx, ch, { font: 'OptX', size });
    const yy = y + Math.sin(i * 1.7 + t * 9) * (1 - k) * 60;
    ctx.save(); ctx.translate(cx + w / 2, yy - size * .36); ctx.scale(1, lerp(.05, 1, k)); ctx.translate(-(cx + w / 2), -(yy - size * .36));
    // gold gradient fill
    const g = ctx.createLinearGradient(0, yy - size * .75, 0, yy + 6);
    g.addColorStop(0, '#fff2c8'); g.addColorStop(.45, '#f6c46a'); g.addColorStop(.75, '#d0862c'); g.addColorStop(1, '#8a4a14');
    ctx.font = `${size}px OptX`; ctx.fillStyle = g; ctx.globalAlpha = a * k; ctx.shadowColor = 'rgba(0,0,0,.6)'; ctx.shadowBlur = 30; ctx.shadowOffsetY = 6;
    ctx.fillText(ch, cx, yy);
    ctx.shadowColor = 'transparent';
    ctx.restore();
    cx += w + track;
  }
  ctx.restore();
}

module.exports = { chapter, callout, lens, dial, soundArcs, scope, title, wave, spring, GOLD, CREAM, INK };
