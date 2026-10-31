// Motion-graphic language for the ant film: "SCAN".
//   hud():      top bar - the four life stages on a track that fills as the life progresses, plus a day counter.
//   heading():  STAGE number in mono + the stage word in heavy condensed type, printed in behind a teal scan line.
//   tag():      reticle on the subject, a leader with one elbow, title + mono sub-line on a soft backing.
//   caption():  lower fact lines wiping in word by word; *word* = amber highlight.
//   lens():     an x-ray scan lens with a honeycomb (compound-eye) rim, sweeping scan line, tether to the subject.
const { W, H, TAU, clamp, lerp, ss, out3, out5, back, io3, rgba, mix, hash } = require('./core');
const G = require('./gfx');

const CREAM = '#fff3e2', AMBER = '#ffb547', TEAL = '#5ef2e0', INK = '#120b07';
const spring = (t, d = .6, k = 1.5) => { const u = clamp(t / d); return 1 - Math.exp(-6 * u) * Math.cos(k * TAU * u * .9); };
const STAGES = ['EGG', 'LARVA', 'PUPA', 'ADULT'];

// ---------------------------------------------------------------- HUD
// prog: 0..4 (0 = at EGG node, 1 = at LARVA node ...), day: string or null
function hud(ctx, t, a, prog, day, o = {}) {
  if (a <= 0) return;
  const y = o.y ?? 214, x0 = 120, x1 = W - 120, n = 4, step = (x1 - x0) / (n - 1);
  ctx.save(); ctx.globalAlpha *= a;
  const sg = ctx.createLinearGradient(0, y - 140, 0, y + 90); sg.addColorStop(0, 'rgba(8,5,3,.55)'); sg.addColorStop(1, 'rgba(8,5,3,0)');
  ctx.fillStyle = sg; ctx.fillRect(0, y - 140, W, 230);
  // track
  ctx.lineCap = 'round';
  ctx.strokeStyle = rgba(CREAM, .22); ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke();
  const px = x0 + clamp(prog, 0, 3) * step;
  const g = ctx.createLinearGradient(x0, 0, px + 1, 0); g.addColorStop(0, rgba(AMBER, .6)); g.addColorStop(1, rgba(AMBER, 1));
  ctx.strokeStyle = g; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(px, y); ctx.stroke();
  G.glow(ctx, px, y, 34, AMBER, .55);
  for (let i = 0; i < n; i++) {
    const nx = x0 + i * step, done = prog >= i - .001, act = Math.abs(prog - i) < .5 || (i === Math.floor(prog) && prog < 3.5);
    const cur = clamp(1 - Math.abs(prog - i) * 1.4);
    ctx.fillStyle = done ? rgba(AMBER, 1) : rgba('#2a1c12', 1); ctx.strokeStyle = done ? rgba(AMBER, 1) : rgba(CREAM, .45); ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(nx, y, 9 + cur * 4, 0, TAU); ctx.fill(); ctx.stroke();
    if (cur > 0) { const r = 18 + ((t * 1.2) % 1) * 18; ctx.strokeStyle = rgba(AMBER, .7 * cur * (1 - ((t * 1.2) % 1))); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(nx, y, r, 0, TAU); ctx.stroke(); }
    G.text(ctx, STAGES[i], nx, y + 48, { font: 'CondD', size: 26, color: done ? CREAM : '#c9b59a', align: 'center', track: 4, alpha: done ? 1 : .6 });
    if (act && cur > .3) G.text(ctx, '0' + (i + 1), nx, y - 24, { font: 'Mono', size: 16, color: AMBER, align: 'center', alpha: cur });
  }
  G.text(ctx, 'LIFE CYCLE', x0 - 6, y - 52, { font: 'Mono', size: 17, color: CREAM, track: 4, alpha: .75 });
  if (day) {
    const w = G.measure(ctx, day, { font: 'Mono', size: 24, track: 2 });
    ctx.fillStyle = rgba(AMBER, .16); ctx.strokeStyle = rgba(AMBER, .7); ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.roundRect(x1 - w - 18, y - 76, w + 30, 38, 6); ctx.fill(); ctx.stroke();
    G.text(ctx, day, x1 - 3, y - 49, { font: 'Mono', size: 24, color: CREAM, align: 'right', track: 2 });
  }
  ctx.restore();
}

// ---------------------------------------------------------------- stage heading
function heading(ctx, t, dur, x, y, num, word, sub, o = {}) {
  if (t < 0 || t > dur) return;
  const size = o.size ?? 168, inK = ss(0, .55, t), outK = ss(dur - .5, dur, t), a = 1 - outK;
  ctx.save();
  // soft dark backing
  const bg = ctx.createRadialGradient(x + 220, y - size * .3, 0, x + 220, y - size * .3, 520);
  bg.addColorStop(0, `rgba(8,5,3,${.5 * a * inK})`); bg.addColorStop(1, 'rgba(8,5,3,0)');
  ctx.fillStyle = bg; ctx.fillRect(x - 320, y - size - 380, 1100, 900);
  // mono line: STAGE 02 / 04 with a growing rule
  const ml = typeof num === 'string' ? num : 'STAGE ' + String(num).padStart(2, '0') + ' / 04';
  G.text(ctx, ml, x + 4, y - size * .82 - 26, { font: 'Mono', size: 24, color: AMBER, track: 5, alpha: ss(.05, .3, t) * a });
  const rw = 300 * out3(ss(.1, .6, t));
  ctx.strokeStyle = rgba(AMBER, .8 * a); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x + 4, y - size * .82 - 10); ctx.lineTo(x + 4 + rw, y - size * .82 - 10); ctx.stroke();
  // the word printed behind a scan line
  const top = y - size * .78, bot = y + 8, scan = lerp(top, bot, out3(ss(.08, .62, t)));
  const scanOut = lerp(top, bot, io3(outK));
  ctx.save(); ctx.beginPath(); ctx.rect(x - 20, Math.max(top - 10, scanOut), 1200, scan - Math.max(top - 10, scanOut)); ctx.clip();
  ctx.font = `${size}px CondH`; ctx.letterSpacing = '6px'; ctx.textBaseline = 'alphabetic';
  const g = ctx.createLinearGradient(0, top, 0, bot); g.addColorStop(0, '#fff7ea'); g.addColorStop(.6, '#ffe2b8'); g.addColorStop(1, '#ffb547');
  ctx.shadowColor = 'rgba(0,0,0,.6)'; ctx.shadowBlur = 24; ctx.fillStyle = g; ctx.fillText(word, x, y);
  ctx.letterSpacing = '0px'; ctx.restore();
  // the scan line itself
  const sl = (inK < 1 ? 1 : 0) * Math.sin(Math.PI * ss(.08, .62, t)) + Math.sin(Math.PI * outK);
  if (sl > .01) {
    const yy = inK < 1 ? scan : scanOut, ww = G.measure(ctx, word, { font: 'CondH', size, track: 6 }) + 60;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const lg = ctx.createLinearGradient(0, yy - 30, 0, yy + 4); lg.addColorStop(0, 'rgba(94,242,224,0)'); lg.addColorStop(1, rgba(TEAL, .45 * sl));
    ctx.fillStyle = lg; ctx.fillRect(x - 30, yy - 30, ww, 34);
    ctx.fillStyle = rgba('#d8fffa', .95 * sl); ctx.fillRect(x - 30, yy - 1.5, ww, 3);
    ctx.restore();
  }
  if (sub) {
    const sk = out3(ss(.55, 1.0, t));
    ctx.save(); ctx.beginPath(); ctx.rect(x - 10, y + 14, 1100 * sk, 70); ctx.clip();
    G.text(ctx, sub, x + 6, y + 64, { font: 'CondM', size: 40, color: CREAM, alpha: a, shadow: 14 });
    ctx.restore();
  }
  ctx.restore();
}

// ---------------------------------------------------------------- callout tag
function reticle(ctx, x, y, r, a, t, col = AMBER) {
  ctx.save(); ctx.strokeStyle = rgba(col, a); ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke();
  for (let k = 0; k < 4; k++) { const an = k * Math.PI / 2 + t * .8; ctx.beginPath(); ctx.moveTo(x + Math.cos(an) * (r + 4), y + Math.sin(an) * (r + 4)); ctx.lineTo(x + Math.cos(an) * (r + 11), y + Math.sin(an) * (r + 11)); ctx.stroke(); }
  ctx.fillStyle = rgba(col, a); ctx.beginPath(); ctx.arc(x, y, 3.5, 0, TAU); ctx.fill();
  ctx.restore();
}
function tag(ctx, t, dur, px, py, lx, ly, title, sub, o = {}) {
  if (t < 0 || t > dur) return;
  const out = ss(dur - .4, dur, t), a = (1 - out) * (o.a ?? 1), side = o.side ?? (lx >= px ? 1 : -1), col = o.color ?? AMBER;
  if (a <= 0) return;
  const size = o.size ?? 32, ssz = o.subSize ?? 22;
  ctx.save();
  const rk = spring(t, .45);
  reticle(ctx, px, py, 12 * rk, a, t, col);
  // leader
  const p1 = out3(ss(.08, .38, t)), tw = Math.max(G.measure(ctx, title, { font: 'CondB', size, track: 3 }), sub ? G.measure(ctx, sub, { font: 'Mono', size: ssz }) : 0) + 16;
  const p2 = out3(ss(.3, .62, t));
  const d = Math.hypot(lx - px, ly - py) || 1, sx = px + (lx - px) / d * 16, sy = py + (ly - py) / d * 16;
  ctx.strokeStyle = rgba(col, .95 * a); ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(lerp(sx, lx, p1), lerp(sy, ly, p1)); if (p2 > 0) ctx.lineTo(lx + side * tw * p2, ly); ctx.stroke();
  // backing
  const bx = side > 0 ? lx : lx - tw, bh = sub ? size + ssz + 26 : size + 16;
  const bg = ctx.createLinearGradient(bx, 0, bx + tw, 0); bg.addColorStop(side > 0 ? 0 : 1, `rgba(10,6,3,${.62 * a * p2})`); bg.addColorStop(side > 0 ? 1 : 0, `rgba(10,6,3,${.15 * a * p2})`);
  ctx.fillStyle = bg; ctx.fillRect(bx, ly - size - 12, tw, bh);
  // text rises out of the leader line
  ctx.save(); ctx.beginPath(); ctx.rect(bx - 4, ly - size - 16, tw + 8, size + 16); ctx.clip();
  const lk = out3(ss(.42, .78, t));
  G.text(ctx, title, side > 0 ? lx + 8 : lx - 8, ly - 10 + (1 - lk) * (size + 6), { font: 'CondB', size, color: CREAM, track: 3, align: side > 0 ? 'left' : 'right', alpha: a });
  ctx.restore();
  if (sub) {
    const sk = ss(.6, .95, t);
    ctx.save(); ctx.beginPath(); ctx.rect(side > 0 ? lx : lx - tw * sk, ly, tw * sk + 4, ssz + 18); ctx.clip();
    G.text(ctx, sub, side > 0 ? lx + 8 : lx - 8, ly + ssz + 6, { font: 'Mono', size: ssz, color: o.subColor ?? '#ffe2bd', align: side > 0 ? 'left' : 'right', alpha: a * .95 });
    ctx.restore();
  }
  ctx.restore();
}

// ---------------------------------------------------------------- caption (fact lines)
// lines: array of strings; *word* = amber. Each line wipes in word by word.
function caption(ctx, t, dur, y, lines, o = {}) {
  if (t < 0 || t > dur) return;
  const size = o.size ?? 50, lh = size * 1.22, out = ss(dur - .45, dur, t), a = 1 - out;
  ctx.save();
  const h = lines.length * lh + 70, gy = y - size - 30;
  const bg = ctx.createLinearGradient(0, gy - 40, 0, gy + h + 40);
  bg.addColorStop(0, 'rgba(8,5,3,0)'); bg.addColorStop(.25, `rgba(8,5,3,${.62 * a * ss(0, .3, t)})`); bg.addColorStop(.75, `rgba(8,5,3,${.62 * a * ss(0, .3, t)})`); bg.addColorStop(1, 'rgba(8,5,3,0)');
  ctx.fillStyle = bg; ctx.fillRect(0, gy - 40, W, h + 80);
  let wi = 0;
  lines.forEach((ln, li) => {
    const words = ln.split(' '), yy = y + li * lh;
    let on = false;
    const parts = words.map((w) => {
      const open = w.startsWith('*'), close = /\*[.,!?:;)]*$/.test(w) && (w.length > 1 || !open);
      const hi = on || open; if (open) on = true; if (close) on = false;
      return { w: w.replace(/\*/g, ''), hi };
    });
    const ws = parts.map((p) => G.measure(ctx, p.w, { font: 'CondD', size, track: 1 }));
    const sp = size * .26, total = ws.reduce((p, c) => p + c, 0) + sp * (parts.length - 1);
    let x = o.align === 'left' ? (o.x ?? 80) : W / 2 - total / 2;
    parts.forEach((p, i) => {
      const k = out3(ss(.12 + wi * .07, .42 + wi * .07, t)); wi++;
      if (k > 0) G.text(ctx, p.w, x, yy + (1 - k) * 22, { font: 'CondD', size, color: p.hi ? AMBER : CREAM, track: 1, alpha: a * k, shadow: 16 });
      if (p.hi && k > 0) { ctx.fillStyle = rgba(AMBER, .9 * a); ctx.fillRect(x, yy + 10, ws[i] * k, 3); }
      x += ws[i] + sp;
    });
  });
  ctx.restore();
}

// ---------------------------------------------------------------- x-ray lens
function hexRim(ctx, cx, cy, R, band, k, t, col) {
  const cell = band * .5, n = Math.floor(TAU * R / (cell * 1.75));
  ctx.save(); ctx.lineWidth = 1.3;
  for (let ring = 0; ring < 2; ring++) {
    const rr = R + cell * .9 + ring * cell * 1.5, nn = n + ring * 6;
    for (let i = 0; i < nn; i++) {
      const u = i / nn, pop = ss(u * .6, u * .6 + .4, k);
      if (pop <= 0) continue;
      const an = u * TAU + ring * (Math.PI / nn) + t * .05, x = cx + Math.cos(an) * rr, y = cy + Math.sin(an) * rr;
      const flick = .5 + .5 * Math.sin(t * 3 + i * 1.7 + ring);
      ctx.strokeStyle = rgba(col, (.55 - ring * .25) * pop * (.6 + .4 * flick)); ctx.beginPath();
      for (let v = 0; v < 6; v++) { const a2 = an + v * Math.PI / 3, r2 = cell * .78 * pop; v ? ctx.lineTo(x + Math.cos(a2) * r2, y + Math.sin(a2) * r2) : ctx.moveTo(x + Math.cos(a2) * r2, y + Math.sin(a2) * r2); }
      ctx.closePath(); ctx.stroke();
    }
  }
  ctx.restore();
}
function lens(ctx, t, dur, sx, sy, cx, cy, r, draw, o = {}) {
  if (t < 0 || t > dur) return;
  const k = t < dur - .45 ? spring(t, .7, 1.2) : 1 - io3(ss(dur - .45, dur, t));
  if (k <= .01) return;
  const R = r * clamp(k, 0, 1.15), col = o.color ?? TEAL;
  ctx.save();
  // tether
  if (o.tether !== false && sx !== null) {
    const sr = (o.sr ?? 24) * Math.min(1, k * 1.5), dx = cx - sx, dy = cy - sy, d = Math.hypot(dx, dy) || 1, ang = Math.atan2(dy, dx);
    if (d > R + sr) {
      const al = Math.asin(clamp((R - sr) / d, -1, 1));
      ctx.strokeStyle = rgba(col, .5 * k); ctx.lineWidth = 1.5; ctx.setLineDash([6, 6]);
      for (const s2 of [1, -1]) { const a2 = ang + s2 * (Math.PI / 2 + al); ctx.beginPath(); ctx.moveTo(sx + Math.cos(a2) * sr, sy + Math.sin(a2) * sr); ctx.lineTo(cx + Math.cos(a2) * R, cy + Math.sin(a2) * R); ctx.stroke(); }
      ctx.setLineDash([]); ctx.beginPath(); ctx.arc(sx, sy, sr, 0, TAU); ctx.stroke();
    }
  }
  // contents
  ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.clip();
  ctx.fillStyle = o.bg ?? '#061416'; ctx.fillRect(cx - R, cy - R, 2 * R, 2 * R);
  // blueprint grid
  ctx.strokeStyle = rgba(col, .08); ctx.lineWidth = 1;
  for (let gx = -R; gx <= R; gx += 40) { ctx.beginPath(); ctx.moveTo(cx + gx, cy - R); ctx.lineTo(cx + gx, cy + R); ctx.stroke(); ctx.beginPath(); ctx.moveTo(cx - R, cy + gx); ctx.lineTo(cx + R, cy + gx); ctx.stroke(); }
  draw(ctx, R, k);
  // scan sweep
  const sw = ((t * .45) % 1), syy = cy - R + sw * 2 * R;
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  const lg = ctx.createLinearGradient(0, syy - 60, 0, syy); lg.addColorStop(0, 'rgba(94,242,224,0)'); lg.addColorStop(1, rgba(col, .14));
  ctx.fillStyle = lg; ctx.fillRect(cx - R, syy - 60, 2 * R, 60); ctx.fillStyle = rgba(col, .35); ctx.fillRect(cx - R, syy - 1, 2 * R, 2);
  ctx.restore();
  const vg = ctx.createRadialGradient(cx, cy, R * .72, cx, cy, R); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.55)');
  ctx.fillStyle = vg; ctx.fillRect(cx - R, cy - R, 2 * R, 2 * R);
  ctx.restore();
  // rim
  ctx.strokeStyle = rgba(col, .95 * Math.min(1, k)); ctx.lineWidth = 3.5; ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.stroke();
  hexRim(ctx, cx, cy, R, 30, Math.min(1, t / .9) * (1 - ss(dur - .45, dur, t)), t, col);
  // rotating tick arc
  ctx.strokeStyle = rgba(CREAM, .7 * Math.min(1, k)); ctx.lineWidth = 2;
  for (let i = 0; i < 24; i++) { const an = -Math.PI * .85 + i * .03 + t * .2; if (i % 6) continue; ctx.beginPath(); ctx.moveTo(cx + Math.cos(an) * (R + 6), cy + Math.sin(an) * (R + 6)); ctx.lineTo(cx + Math.cos(an) * (R + 16), cy + Math.sin(an) * (R + 16)); ctx.stroke(); }
  if (o.label) {
    const la = ss(.35, .75, t) * (1 - ss(dur - .45, dur, t)), ly = o.labelBelow ? cy + R + 66 : cy - R - 46;
    const w = G.measure(ctx, o.label, { font: 'Mono', size: 22, track: 3 }) + 28;
    ctx.fillStyle = rgba('#061416', .85 * la); ctx.strokeStyle = rgba(col, .9 * la); ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.roundRect(cx - w / 2, ly - 27, w, 38, 19); ctx.fill(); ctx.stroke();
    G.text(ctx, o.label, cx, ly, { font: 'Mono', size: 22, color: col, align: 'center', track: 3, alpha: la });
  }
  ctx.restore();
}

// small labelled readout: LABEL over VALUE (mono)
function readout(ctx, x, y, label, value, a, o = {}) {
  if (a <= 0) return;
  G.text(ctx, label, x, y, { font: 'Mono', size: o.ls ?? 18, color: o.lc ?? AMBER, track: 4, alpha: a, align: o.align ?? 'left' });
  G.text(ctx, value, x, y + (o.vs ?? 54) + 6, { font: o.vf ?? 'CondH', size: o.vs ?? 54, color: CREAM, alpha: a, align: o.align ?? 'left', shadow: 14, track: 1 });
}
// scale bar
function ruler(ctx, x, y, len, label, a, o = {}) {
  if (a <= 0) return;
  ctx.save(); ctx.globalAlpha *= a; ctx.strokeStyle = rgba(CREAM, .9); ctx.lineWidth = 2;
  const L = len * out3(clamp(o.k ?? 1));
  ctx.beginPath(); ctx.moveTo(x, y - 10); ctx.lineTo(x, y + 10); ctx.moveTo(x, y); ctx.lineTo(x + L, y); ctx.moveTo(x + L, y - 10); ctx.lineTo(x + L, y + 10); ctx.stroke();
  for (let i = 1; i < 5; i++) { ctx.beginPath(); ctx.moveTo(x + L * i / 5, y - 5); ctx.lineTo(x + L * i / 5, y + 5); ctx.stroke(); }
  G.text(ctx, label, x + L / 2, y - 18, { font: 'Mono', size: 22, color: CREAM, align: 'center', track: 2 });
  ctx.restore();
}
// glowing arrow (for diagrams)
function arrow(ctx, x0, y0, x1, y1, k, col = AMBER, o = {}) {
  if (k <= 0) return;
  const x = lerp(x0, x1, k), y = lerp(y0, y1, k), an = Math.atan2(y1 - y0, x1 - x0);
  ctx.save(); ctx.strokeStyle = rgba(col, o.a ?? 1); ctx.fillStyle = rgba(col, o.a ?? 1); ctx.lineWidth = o.w ?? 3; ctx.lineCap = 'round';
  if (o.dash) ctx.setLineDash(o.dash);
  ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x, y); ctx.stroke(); ctx.setLineDash([]);
  const h = o.head ?? 14; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - Math.cos(an - .45) * h, y - Math.sin(an - .45) * h); ctx.lineTo(x - Math.cos(an + .45) * h, y - Math.sin(an + .45) * h); ctx.closePath(); ctx.fill();
  ctx.restore();
}

module.exports = { hud, heading, tag, caption, lens, readout, ruler, arrow, reticle, spring, CREAM, AMBER, TEAL, INK, STAGES };
