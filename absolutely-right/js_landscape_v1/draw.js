// Canvas, drawing primitives, background, characters and icons.
const canvas = createCanvas(W, H);
let c = canvas.getContext('2d');
const tmp = createCanvas(W, H), tctx = tmp.getContext('2d');

const font = (fam, size, weight = '') => `${weight} ${size.toFixed(1)}px ${fam}`.trim();
function rr(x, y, w, h, r) {
  r = Math.max(0, Math.min(r, w / 2, h / 2)); c.beginPath();
  c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
}
function fillRR(x, y, w, h, r, fill) { rr(x, y, w, h, r); c.fillStyle = fill; c.fill(); }
function circle(x, y, r, fill) { c.beginPath(); c.arc(x, y, Math.max(0, r), 0, TAU); c.fillStyle = fill; c.fill(); }
function ring(x, y, r, col, lw) { c.beginPath(); c.arc(x, y, Math.max(0, r), 0, TAU); c.strokeStyle = col; c.lineWidth = lw; c.stroke(); }
function ellipse(x, y, rx, ry, fill) { c.beginPath(); c.ellipse(x, y, Math.max(0, rx), Math.max(0, ry), 0, 0, TAU); c.fillStyle = fill; c.fill(); }
function line(x1, y1, x2, y2, col, lw, cap = 'round') { c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.strokeStyle = col; c.lineWidth = lw; c.lineCap = cap; c.stroke(); }
function lg(x0, y0, x1, y1, stops) { const g = c.createLinearGradient(x0, y0, x1, y1); stops.forEach((s, i) => g.addColorStop(s[0] ?? i / (stops.length - 1), s[1])); return g; }
function withAlpha(a, fn) { const p = c.globalAlpha; c.globalAlpha = p * clamp(a); fn(); c.globalAlpha = p; }
function at(x, y, s, rot, fn) { c.save(); c.translate(x, y); if (rot) c.rotate(rot); if (s !== 1) c.scale(s, s); fn(); c.restore(); }
function glow(col, blur) { c.shadowColor = col; c.shadowBlur = blur; c.shadowOffsetX = 0; c.shadowOffsetY = 0; }
function noGlow() { c.shadowColor = 'rgba(0,0,0,0)'; c.shadowBlur = 0; c.shadowOffsetY = 0; }

function text(s, x, y, o = {}) {
  c.font = font(o.font || F.ui, o.size || 40, o.weight || '');
  c.textAlign = o.align || 'left'; c.textBaseline = o.base || 'alphabetic';
  if (o.glow) glow(o.glow, o.blur || 24);
  if (o.stroke) { c.lineWidth = o.stroke; c.strokeStyle = o.strokeColor || '#000'; c.lineJoin = 'round'; c.strokeText(s, x, y); }
  c.fillStyle = o.color || '#fff';
  c.fillText(s, x, y, o.max);
  if (o.glow) noGlow();
}
function tw(s, size, fam = F.ui, weight = '') { c.font = font(fam, size, weight); return c.measureText(s).width; }
const typed = (str, t, t0, t1) => str.slice(0, Math.round(str.length * clamp((t - t0) / Math.max(0.01, t1 - t0))));
const num = n => Math.round(n).toLocaleString('en-US');

// glass card with soft shadow, sheen and hairline border
function card(x, y, w, h, o = {}) {
  const r = o.r ?? 34;
  c.save();
  c.shadowColor = o.shadow || 'rgba(0,0,0,0.55)'; c.shadowBlur = o.blur ?? 50; c.shadowOffsetY = o.dy ?? 22;
  rr(x, y, w, h, r); c.fillStyle = o.fill || 'rgba(17,19,32,0.86)'; c.fill();
  c.restore();
  if (o.glowCol) { c.save(); glow(o.glowCol, o.glowBlur || 40); rr(x, y, w, h, r); c.strokeStyle = o.glowCol; c.lineWidth = 2; c.stroke(); c.restore(); }
  rr(x, y, w, h, r); c.fillStyle = lg(0, y, 0, y + h, [[0, 'rgba(255,255,255,0.09)'], [0.35, 'rgba(255,255,255,0.025)'], [1, 'rgba(255,255,255,0.0)']]); c.fill();
  rr(x + 0.5, y + 0.5, w - 1, h - 1, r); c.strokeStyle = o.stroke || 'rgba(255,255,255,0.13)'; c.lineWidth = 2; c.stroke();
}
// macOS-style window with a title bar
function win(x, y, w, h, title, o = {}) {
  card(x, y, w, h, o);
  c.save(); rr(x, y, w, h, o.r ?? 34); c.clip();
  c.fillStyle = 'rgba(255,255,255,0.045)'; c.fillRect(x, y, w, 74);
  c.fillStyle = 'rgba(255,255,255,0.08)'; c.fillRect(x, y + 74, w, 2);
  c.restore();
  ['#FF5F57', '#FEBC2E', '#28C840'].forEach((col, i) => circle(x + 40 + i * 32, y + 37, 10, col));
  if (title) text(title, x + w / 2, y + 47, { size: 28, font: F.mono, color: 'rgba(255,255,255,0.6)', align: 'center' });
}
function pill(x, y, label, o = {}) {
  const size = o.size || 26, pad = o.pad || 22, wd = tw(label, size, o.font || F.ui, o.weight || '') + pad * 2, h = size * 1.75;
  const x0 = o.align === 'center' ? x - wd / 2 : o.align === 'right' ? x - wd : x;
  if (o.glow) glow(o.glow, 22);
  fillRR(x0, y - h / 2, wd, h, h / 2, o.bg || 'rgba(255,255,255,0.1)');
  noGlow();
  if (o.border) { rr(x0, y - h / 2, wd, h, h / 2); c.strokeStyle = o.border; c.lineWidth = 2; c.stroke(); }
  text(label, x0 + wd / 2, y + size * 0.36, { size, font: o.font || F.ui, weight: o.weight || '', color: o.color || '#fff', align: 'center' });
  return wd;
}
function button(x, y, w, h, label, o = {}) {
  const press = o.press || 0;
  at(x + w / 2, y + h / 2, 1 - press * 0.08, 0, () => {
    if (o.glow) glow(o.glow, 30 + press * 30);
    fillRR(-w / 2, -h / 2 + 8, w, h, h / 2, o.edge || 'rgba(0,0,0,0.35)');
    fillRR(-w / 2, -h / 2 + press * 6, w, h, h / 2, o.bg || '#22C55E');
    noGlow();
    fillRR(-w / 2 + 6, -h / 2 + 4 + press * 6, w - 12, h * 0.42, h / 3, 'rgba(255,255,255,0.18)');
    text(label, 0, h * 0.13 + press * 6, { size: o.size || h * 0.42, font: o.font || F.ui, color: o.color || '#fff', align: 'center' });
  });
}
function meter(x, y, w, label, val, col, o = {}) {
  text(label, x, y, { size: 30, font: F.cond, color: 'rgba(255,255,255,0.75)' });
  text(o.valueLabel ?? `${Math.round(val * 100)}%`, x + w, y, { size: 34, font: F.cond, color: col, align: 'right' });
  fillRR(x, y + 18, w, 26, 13, 'rgba(255,255,255,0.08)');
  if (val > 0.005) { glow(col, 20); fillRR(x, y + 18, Math.max(26, w * clamp(val, 0, 1)), 26, 13, col); noGlow(); }
}
function stamp(x, y, label, col, k, rot = -0.14, size = 92) {
  if (k <= 0) return;
  const s = lerp(2.4, 1, easeOut(k)), a = clamp(k * 3);
  at(x, y, s, rot, () => withAlpha(a, () => {
    const w = tw(label, size, F.cond, '900') + 70;
    rr(-w / 2, -size * 0.72, w, size * 1.32, 22); c.strokeStyle = col; c.lineWidth = 10; c.stroke();
    fillRR(-w / 2, -size * 0.72, w, size * 1.32, 22, rgba(col, 0.14));
    text(label, 0, size * 0.33, { size, font: F.cond, weight: '900', color: col, align: 'center' });
  }));
}

// ---------------- icons ----------------
function check(x, y, s, col, lw = 8) { c.beginPath(); c.moveTo(x - s * 0.5, y); c.lineTo(x - s * 0.15, y + s * 0.38); c.lineTo(x + s * 0.55, y - s * 0.42); c.strokeStyle = col; c.lineWidth = lw; c.lineCap = 'round'; c.lineJoin = 'round'; c.stroke(); }
function cross(x, y, s, col, lw = 8) { line(x - s / 2, y - s / 2, x + s / 2, y + s / 2, col, lw); line(x + s / 2, y - s / 2, x - s / 2, y + s / 2, col, lw); }
function checkBadge(x, y, r, col = '#22C55E') { circle(x, y, r, col); check(x, y + 1, r * 0.9, '#fff', r * 0.24); }
function crossBadge(x, y, r, col = '#EF4444') { circle(x, y, r, col); cross(x, y, r * 0.75, '#fff', r * 0.24); }
function star(x, y, r, col) {
  c.beginPath();
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rad = i % 2 ? r * 0.45 : r; c.lineTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad); }
  c.closePath(); c.fillStyle = col; c.fill();
}
function wifi(x, y, s, col, off) {
  for (let i = 1; i <= 3; i++) { c.beginPath(); c.arc(x, y, s * i * 0.3, -Math.PI * 0.75, -Math.PI * 0.25); c.strokeStyle = col; c.lineWidth = s * 0.11; c.lineCap = 'round'; c.stroke(); }
  circle(x, y - s * 0.02, s * 0.08, col);
  if (off) { line(x - s * 0.55, y - s * 0.95, x + s * 0.45, y + s * 0.15, '#EF4444', s * 0.12); }
}
function moon(x, y, r, col) {
  c.save(); c.beginPath(); c.arc(x, y, r, 0, TAU); c.clip();
  c.beginPath(); c.rect(x - r - 2, y - r - 2, r * 2 + 4, r * 2 + 4); c.arc(x + r * 0.5, y - r * 0.3, r * 0.85, 0, TAU, true);
  glow(col, 40); c.fillStyle = col; c.fill('evenodd'); c.restore();
}
function warn(x, y, s, col = '#FACC15') {
  c.beginPath(); c.moveTo(x, y - s * 0.55); c.lineTo(x + s * 0.6, y + s * 0.48); c.lineTo(x - s * 0.6, y + s * 0.48); c.closePath();
  c.fillStyle = col; c.lineJoin = 'round'; c.strokeStyle = col; c.lineWidth = s * 0.12; c.stroke(); c.fill();
  text('!', x, y + s * 0.36, { size: s * 0.7, font: F.cond, weight: '900', color: '#111', align: 'center' });
}
function cursorArrow(x, y, s = 1, press = 0) {
  at(x, y, s * (1 - press * 0.15), 0, () => {
    c.beginPath(); c.moveTo(0, 0); c.lineTo(0, 64); c.lineTo(16, 49); c.lineTo(28, 76); c.lineTo(39, 71); c.lineTo(27, 45); c.lineTo(48, 45); c.closePath();
    c.save(); c.shadowColor = 'rgba(0,0,0,0.5)'; c.shadowBlur = 14; c.shadowOffsetY = 6; c.fillStyle = '#fff'; c.fill(); c.restore();
    c.strokeStyle = '#111'; c.lineWidth = 4; c.lineJoin = 'round'; c.stroke();
  });
}
function ripple(x, y, k, col, r = 140) { if (k <= 0 || k >= 1) return; withAlpha(1 - k, () => ring(x, y, r * easeOut(k), col, 10 * (1 - k) + 2)); }
function spinner(x, y, r, t, col) {
  for (let i = 0; i < 10; i++) { const a = i / 10 * TAU + t * 6; withAlpha(0.15 + 0.85 * (i / 10), () => circle(x + Math.cos(a) * r, y + Math.sin(a) * r, r * 0.17, col)); }
}
function mug(x, y, s, t, col = '#F8FAFC') {
  at(x, y, s, 0, () => {
    c.beginPath(); c.arc(62, 0, 30, -Math.PI / 2, Math.PI / 2); c.strokeStyle = col; c.lineWidth = 14; c.stroke();
    fillRR(-60, -60, 124, 130, 26, col);
    fillRR(-60, -60, 124, 22, 11, '#6B4226');
    text('</>', 2, 28, { size: 40, font: F.mono, color: '#7C3AED', align: 'center' });
    for (let i = 0; i < 3; i++) {
      c.beginPath();
      for (let k = 0; k <= 20; k++) { const yy = -80 - k * 5, xx = -30 + i * 30 + Math.sin(k * 0.45 - t * 4 + i) * 9; k ? c.lineTo(xx, yy) : c.moveTo(xx, yy); }
      c.strokeStyle = 'rgba(255,255,255,0.35)'; c.lineWidth = 7; c.lineCap = 'round'; c.stroke();
    }
  });
}
function rocket(x, y, s, rot, t) {
  at(x, y, s, rot, () => {
    for (let i = 0; i < 6; i++) { const fl = 40 + 30 * hash(i, Math.floor(t * 30)); ellipse(0, 70 + fl * 0.5, 22 - i * 3, fl * 0.6, i % 2 ? '#FDE047' : '#FB923C'); }
    c.beginPath(); c.moveTo(0, -95); c.bezierCurveTo(48, -55, 42, 30, 32, 60); c.lineTo(-32, 60); c.bezierCurveTo(-42, 30, -48, -55, 0, -95); c.closePath();
    c.fillStyle = lg(-40, 0, 40, 0, [[0, '#E2E8F0'], [0.5, '#FFFFFF'], [1, '#94A3B8']]); c.fill();
    circle(0, -22, 17, '#0EA5E9'); ring(0, -22, 17, '#334155', 5);
    c.beginPath(); c.moveTo(-32, 20); c.lineTo(-58, 68); c.lineTo(-30, 60); c.closePath(); c.fillStyle = '#EF4444'; c.fill();
    c.beginPath(); c.moveTo(32, 20); c.lineTo(58, 68); c.lineTo(30, 60); c.closePath(); c.fill();
  });
}
function chip(x, y, s, t, col) {
  at(x, y, s, 0, () => {
    for (let i = 0; i < 6; i++) for (const side of [-1, 1]) {
      fillRR(-96 + i * 34 + 2, side * 112 - 12, 16, 24, 4, '#CBD5E1');
      fillRR(side * 112 - 12, -96 + i * 34 + 2, 24, 16, 4, '#CBD5E1');
    }
    glow(col, 50); fillRR(-104, -104, 208, 208, 26, '#1E293B'); noGlow();
    fillRR(-80, -80, 160, 160, 18, lg(-80, -80, 80, 80, [[0, '#334155'], [1, '#0F172A']]));
    text('GPU', 0, 18, { size: 54, font: F.cond, weight: '900', color: col, align: 'center', glow: col, blur: 20 });
  });
}
function phoneIcon(x, y, s, col) {
  at(x, y, s, 0, () => {
    c.beginPath(); c.moveTo(-26, -30); c.quadraticCurveTo(-34, 10, 8, 34); c.lineTo(22, 22); c.lineTo(8, 4); c.lineTo(-2, 10); c.quadraticCurveTo(-14, 0, -14, -14); c.lineTo(-6, -22); c.lineTo(-14, -40); c.closePath();
    c.fillStyle = col; c.fill();
  });
}
function avatarCircle(x, y, r, col, initials) {
  circle(x, y, r, col);
  text(initials, x, y + r * 0.32, { size: r * 0.9, font: F.ui, color: '#fff', align: 'center' });
}

// ---------------- the AI agent ----------------
// x,y = head centre; s = scale (head is 220 px wide at s=1)
function robot(x, y, s, o = {}) {
  const t = o.t ?? 0, acc = o.acc || '#22D3EE', mood = o.mood || 'normal';
  const bob = (o.bob ?? 1) * Math.sin(t * 3.2) * 6;
  c.save(); c.translate(x, y + bob * s); c.scale(s, s); c.rotate(o.rot || 0);
  if (o.shadow !== false && o.body !== false) ellipse(0, 268 - bob, 120, 16, 'rgba(0,0,0,0.35)');
  if (o.body !== false) robotBody(o, acc, t);
  const hd = o.headOff || { dx: 0, dy: 0, rot: 0 };
  c.save(); c.translate(hd.dx, hd.dy); c.rotate(hd.rot);
  if (o.halo) { c.save(); glow('#FDE68A', 40); c.beginPath(); c.ellipse(0, -168, 92, 22, 0, 0, TAU); c.strokeStyle = '#FDE68A'; c.lineWidth = 12; c.stroke(); c.restore(); }
  line(0, -108, 0, -146, '#AEB6CC', 8);
  glow(acc, 30); circle(0, -156, 15, acc); noGlow(); circle(-4, -160, 5, 'rgba(255,255,255,0.8)');
  fillRR(-130, -34, 26, 70, 11, '#A3ACC2'); fillRR(104, -34, 26, 70, 11, '#A3ACC2');
  rr(-110, -110, 220, 200, 66); c.fillStyle = lg(0, -110, 0, 90, [[0, '#FFFFFF'], [0.55, '#E2E7F2'], [1, '#AEB7CC']]); c.fill();
  rr(-110, -110, 220, 200, 66); c.strokeStyle = 'rgba(255,255,255,0.7)'; c.lineWidth = 2; c.stroke();
  fillRR(-88, -80, 176, 130, 46, '#0A0F1F');
  rr(-88, -80, 176, 130, 46); c.fillStyle = lg(0, -80, 0, 50, [[0, rgba(acc, 0.18)], [1, 'rgba(0,0,0,0)']]); c.fill();
  robotFace(mood, acc, t, o.talk || 0);
  fillRR(-70, -74, 60, 16, 8, 'rgba(255,255,255,0.08)');
  if (o.pacifier) { circle(0, 62, 26, '#F472B6'); ring(0, 62, 34, '#F9A8D4', 8); circle(0, 62, 10, '#FBCFE8'); }
  c.restore();
  c.restore();
}
function robotBody(o, acc, t) {
  const arm = (side, ang) => at(side * 92, 130, 1, ang * side, () => { fillRR(-16, 0, 32, 96, 16, '#B5BED2'); circle(0, 102, 20, '#E2E7F2'); });
  arm(-1, o.armL ?? 0.25); arm(1, o.armR ?? 0.25);
  fillRR(-28, 84, 56, 30, 10, '#8D96AE');
  rr(-92, 104, 184, 140, 54); c.fillStyle = lg(0, 104, 0, 244, [[0, '#F1F4FA'], [1, '#9CA6BE']]); c.fill();
  glow(acc, 26); circle(0, 168, 16 + 3 * Math.sin(t * 5), acc); noGlow();
  if (o.badge) { line(-40, 110, 0, 196, '#3B82F6', 6); line(40, 110, 0, 196, '#3B82F6', 6); fillRR(-30, 186, 60, 46, 8, '#fff'); fillRR(-30, 186, 60, 12, 4, '#3B82F6'); text('YOU', 0, 224, { size: 18, font: F.cond, color: '#0F172A', align: 'center' }); }
  if (o.wheel) {
    c.save(); c.translate(0, 196); c.rotate(Math.sin(t * 2.4) * 0.5);
    ring(0, 0, 78, '#1F2937', 20); ring(0, 0, 78, '#4B5563', 6);
    line(-74, 0, 74, 0, '#1F2937', 16); line(0, 0, 0, 74, '#1F2937', 16); circle(0, 0, 24, '#374151');
    c.restore();
  }
}
function robotFace(mood, acc, t, talk) {
  const blink = (t % 3.3) < 0.12 ? 0.12 : 1;
  c.save(); glow(acc, 22); c.strokeStyle = acc; c.fillStyle = acc; c.lineCap = 'round'; c.lineJoin = 'round';
  const E = [-38, 38], ey = -22;
  if (mood === 'happy') E.forEach(ex => { c.beginPath(); c.arc(ex, ey + 10, 17, Math.PI * 1.1, Math.PI * 1.9); c.lineWidth = 10; c.stroke(); });
  else if (mood === 'wide') E.forEach(ex => { c.beginPath(); c.arc(ex, ey, 21, 0, TAU); c.fill(); });
  else if (mood === 'dead') E.forEach(ex => { cross(ex, ey, 28, acc, 9); });
  else if (mood === 'sleepy') E.forEach(ex => { line(ex - 16, ey + 4, ex + 16, ey + 4, acc, 9); });
  else if (mood === 'sorry') E.forEach((ex, i) => { c.beginPath(); c.arc(ex, ey - 4, 16, Math.PI * 0.15, Math.PI * 0.85); c.lineWidth = 9; c.stroke(); line(ex - 18, ey - 26 + (i ? -6 : 6), ex + 18, ey - 26 + (i ? 6 : -6), acc, 6); });
  else if (mood === 'evil') E.forEach((ex, i) => { c.beginPath(); c.moveTo(ex - 18, ey - 10 + (i ? -6 : 6)); c.lineTo(ex + 18, ey - 10 + (i ? 6 : -6)); c.lineTo(ex + (i ? 0 : 6), ey + 14); c.closePath(); c.fill(); });
  else E.forEach(ex => { rr(ex - 14, ey - 22 * blink, 28, 44 * blink, 14); c.fill(); });
  if (talk > 0.05) { c.beginPath(); c.ellipse(0, 28, 20, 4 + talk * 14, 0, 0, TAU); c.fill(); }
  else if (mood === 'sorry' || mood === 'dead') { c.beginPath(); c.arc(0, 40, 16, Math.PI * 1.15, Math.PI * 1.85); c.lineWidth = 7; c.stroke(); }
  else { c.beginPath(); c.arc(0, 18, 18, Math.PI * 0.15, Math.PI * 0.85); c.lineWidth = 7; c.stroke(); }
  c.restore();
}
function bubble(x, y, w, h, tail, o = {}) {
  // tail: [tx, ty] point the bubble points to
  c.save();
  c.shadowColor = 'rgba(0,0,0,0.45)'; c.shadowBlur = 40; c.shadowOffsetY = 18;
  rr(x, y, w, h, o.r ?? 40); c.fillStyle = o.fill || '#FFFFFF'; c.fill();
  if (tail) {
    const bx = clamp(tail[0], x + 60, x + w - 60), by = tail[1] > y + h ? y + h - 2 : y + 2;
    c.beginPath(); c.moveTo(bx - 30, by); c.lineTo(tail[0], tail[1]); c.lineTo(bx + 30, by); c.closePath(); c.fill();
  }
  c.restore();
}

// ---------------- background ----------------
const GRID = createCanvas(W, H);
{ const g = GRID.getContext('2d'); g.fillStyle = 'rgba(255,255,255,0.11)'; for (let y = 24; y < H; y += 48) for (let x = 24; x < W; x += 48) { g.beginPath(); g.arc(x, y, 1.6, 0, TAU); g.fill(); } }
const VIGN = createCanvas(W, H);
{ const g = VIGN.getContext('2d'), gr = g.createRadialGradient(W / 2, H * 0.45, H * 0.25, W / 2, H * 0.45, H * 0.78); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,0.7)'); g.fillStyle = gr; g.fillRect(0, 0, W, H); }
const GRAIN = [];
for (let k = 0; k < 6; k++) {
  const g = createCanvas(W / 2, H / 2), x = g.getContext('2d'), img = x.createImageData(W / 2, H / 2);
  for (let i = 0; i < img.data.length; i += 4) { const v = 128 + (hash(i * 0.37, k * 13.1) - 0.5) * 120; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255; }
  x.putImageData(img, 0, 0); GRAIN.push(g);
}
const GLYPHS = ['{ }', '</>', '=>', ';', '()', '[ ]', '&&', '!=', '0x', '//', 'git', 'npm', '++', '$_', '{}', '::'];

function background(t, P) {
  c.fillStyle = rgba(mixc(P.bg, '#000000', 0.55)); c.fillRect(0, 0, W, H);
  const e = feat('energy', t), k = kick(t, 7, 2) * (0.4 + e);
  const blobs = [
    [0.22 + 0.08 * Math.sin(t * 0.21), 0.2 + 0.06 * Math.cos(t * 0.17), 900, P.a, 0.42],
    [0.82 + 0.07 * Math.cos(t * 0.19), 0.45 + 0.08 * Math.sin(t * 0.13), 1000, P.b, 0.36],
    [0.45 + 0.1 * Math.sin(t * 0.11 + 2), 0.9 + 0.05 * Math.cos(t * 0.23), 950, P.a, 0.3],
  ];
  c.globalCompositeOperation = 'lighter';
  for (const [bx, by, r, col, a] of blobs) {
    const R = r * (1 + 0.06 * k), g = c.createRadialGradient(bx * W, by * H, 0, bx * W, by * H, R);
    g.addColorStop(0, rgba(col, a * (0.55 + 0.45 * e) + 0.08 * k)); g.addColorStop(1, rgba(col, 0));
    c.fillStyle = g; c.fillRect(0, 0, W, H);
  }
  c.globalCompositeOperation = 'source-over';
  withAlpha(0.55, () => c.drawImage(GRID, 0, -(t * 12) % 48));
  // drifting code glyphs
  c.font = font(F.mono, 30); c.textAlign = 'center';
  for (let i = 0; i < 22; i++) {
    const sp = 18 + hash(i, 2) * 30, y = (hash(i, 3) * (H + 200) - t * sp) % (H + 200);
    const yy = y < -100 ? y + H + 200 : y, x = hash(i, 4) * W + Math.sin(t * 0.4 + i) * 20;
    c.fillStyle = rgba(i % 2 ? P.a : P.b, 0.10 + 0.08 * hash(i, 5));
    c.fillText(GLYPHS[i % GLYPHS.length], x, yy);
  }
}
function finish(t) {
  c.drawImage(VIGN, 0, 0);
  c.globalCompositeOperation = 'overlay'; c.globalAlpha = 0.1;
  c.drawImage(GRAIN[Math.floor(t * FPS) % GRAIN.length], 0, 0, W, H);
  c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1;
}
