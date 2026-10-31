// Motion version: every shot happens inside a full-screen illustrated world seen through a parallax camera.
// Shots in the same world are joined by camera moves; changing worlds uses a dive into a screen, a whip pan,
// a vortex spin, a paint splat, a tilt or a glitch cut.

// ---------------- camera + layers ----------------
let CAM = { x: 0, y: 0, z: 1, r: 0 };
function layer(f, fn) {
  const z = Math.pow(CAM.z, f);
  c.save(); c.translate(W / 2, H / 2); c.rotate(CAM.r * Math.min(1, f)); c.scale(z, z); c.translate(-CAM.x * f, -CAM.y * f); fn(z); c.restore();
}
const visX = f => { const z = Math.pow(CAM.z, f), h = W / 2 / z + 80; return [CAM.x * f - h, CAM.x * f + h]; };
const visY = f => { const z = Math.pow(CAM.z, f), h = H / 2 / z + 80; return [CAM.y * f - h, CAM.y * f + h]; };
const PROP_RECT = { x: 0, y: 0, w: 0, h: 0, on: false };
function markProp(x, y, w, h) {
  const m = c.getTransform(), pts = [[x, y], [x + w, y], [x, y + h], [x + w, y + h]].map(([a, b]) => [m.a * a + m.c * b + m.e, m.b * a + m.d * b + m.f]);
  const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
  PROP_RECT.x = Math.min(...xs); PROP_RECT.y = Math.min(...ys); PROP_RECT.w = Math.max(...xs) - PROP_RECT.x; PROP_RECT.h = Math.max(...ys) - PROP_RECT.y; PROP_RECT.on = true;
}

// ---------------- lyric scene content inside a prop ----------------
function sceneIn(S, t, P, w, h) {
  c.save(); c.beginPath(); c.rect(0, 0, w, h); c.clip();
  c.fillStyle = lg(0, 0, 0, h, [[0, rgba(mixc(P.bg, '#232A66', 0.45))], [1, rgba(mixc(P.bg, '#05050F', 0.35))]]); c.fillRect(0, 0, w, h);
  withAlpha(0.4, () => c.drawImage(GRID, 0, 0));
  const sc = Math.min(w / STAGE_W, h / STAGE_H);
  c.translate((w - STAGE_W * sc) / 2, (h - STAGE_H * sc) / 2); c.scale(sc, sc); c.translate(-STAGE.x0, -STAGE.y0);
  const fn = SC[S.name]; if (fn) fn(t, S, P, t - S.start);
  c.restore();
}
// screen content; when the previous shot used the same screen, the new scene scrolls in like a feed
function screenFeed(i, t, P, w, h) {
  const S = SCENES[i], pv = SCENES[i - 1], k = (t - S.start) / 0.45;
  if (pv && pv.spec.set === S.spec.set && k < 1 && k > -0.5) {
    const e = easeInOut(clamp(k));
    c.save(); c.beginPath(); c.rect(0, 0, w, h); c.clip();
    c.save(); c.translate(0, -e * h); sceneIn(pv, t, P, w, h); c.restore();
    c.save(); c.translate(0, (1 - e) * h); sceneIn(S, t, P, w, h); c.restore();
    c.restore();
  } else sceneIn(S, t, P, w, h);
}
// a floating comic card that flies in from the depth; the previous one flies past the camera
function floatProp(i, t, P, cx, cy, w, h, rot = 0) {
  const S = SCENES[i], pv = SCENES[i - 1], k = (t - S.start) / 0.6;
  const one = (s, sc, r, a) => {
    if (sc <= 0.01 || a <= 0.01) return;
    c.save(); c.globalAlpha *= a; c.translate(cx, cy); c.rotate(r); c.scale(sc, sc); c.translate(-w / 2, -h / 2);
    rr(16, 20, w, h, 22); c.fillStyle = 'rgba(18,12,28,0.55)'; c.fill();
    rr(-8, -8, w + 16, h + 16, 28); c.fillStyle = INK; c.fill();
    c.save(); rr(0, 0, w, h, 20); c.clip(); sceneIn(s, t, P, w, h); c.restore();
    rr(4, 4, w - 8, h - 8, 17); c.strokeStyle = 'rgba(255,255,255,0.22)'; c.lineWidth = 3; c.stroke();
    if (s === S && sc > 0.97) markProp(0, 0, w, h);
    c.restore();
  };
  if (pv && pv.spec.set === S.spec.set && k < 1) {
    const e = easeIn(clamp(k * 1.3)); one(pv, 1 + e * 1.8, rot + e * 0.5, 1 - e);
  }
  const b = k <= 0 && pv && pv.spec.set === S.spec.set ? 0 : (pv && pv.spec.set === S.spec.set ? backOut(clamp(k), 1.5) : 1);
  one(S, b, rot + (1 - clamp(k)) * -0.45 * (pv && pv.spec.set === S.spec.set ? 1 : 0), clamp(b * 2));
}

// ---------------- shared bits ----------------
function cloud(x, y, s, fill, ink = INK) {
  const B = [[-62, 12, 44], [-18, -20, 60], [38, -6, 50], [80, 16, 36], [0, 22, 52]];
  if (ink) { c.fillStyle = ink; c.beginPath(); B.forEach(([a, b, r]) => { c.moveTo(x + a * s + (r + 7) * s, y + b * s); c.arc(x + a * s, y + b * s, (r + 7) * s, 0, TAU); }); c.fill(); }
  c.fillStyle = fill; c.beginPath(); B.forEach(([a, b, r]) => { c.moveTo(x + a * s + r * s, y + b * s); c.arc(x + a * s, y + b * s, r * s, 0, TAU); }); c.fill();
}
function buildings(f, base, step, h0, h1, col, win, lit, seed, t, o = {}) {
  const [x0, x1] = visX(f);
  for (let i = Math.floor(x0 / step) - 1; i <= Math.ceil(x1 / step) + 1; i++) {
    const bw = step * (0.72 + 0.26 * hash(i, seed)), bh = h0 + hash(i, seed + 1) * (h1 - h0), bx = i * step + (step - bw) * hash(i, seed + 2), top = base - bh;
    c.fillStyle = col; c.fillRect(bx, top, bw, 2400);
    if (o.ink) { c.strokeStyle = INK; c.lineWidth = o.ink; c.strokeRect(bx, top, bw, 2400); }
    if (o.roof && hash(i, seed + 3) > 0.5) { c.fillStyle = col; c.fillRect(bx + bw * 0.3, top - 40, bw * 0.12, 40); }
    if (!win) continue;
    const cols = Math.max(2, Math.floor(bw / 34)), rows = Math.floor(bh / 46), cw = bw / cols;
    for (let r = 0; r < rows; r++) for (let q = 0; q < cols; q++) {
      const hv = hash(i * 31 + q, r + seed), on = hv < lit(i, r, q, hv);
      if (!on) continue;
      c.fillStyle = (hv * 7 % 1) < 0.2 ? '#FFB86B' : win; c.fillRect(bx + q * cw + cw * 0.25, top + 20 + r * 46, cw * 0.5, 20);
    }
  }
}
function stars(n, seed, t, col = '#FFF7E8') {
  for (let i = 0; i < n; i++) {
    const x = (hash(i, seed) - 0.5) * W * 1.4, y = (hash(i, seed + 1) - 0.5) * H * 1.4, tw = 0.5 + 0.5 * Math.sin(t * 3 + i);
    withAlpha(0.4 + 0.6 * tw, () => star(x, y, 3 + hash(i, seed + 2) * 6, col));
  }
}
function sun(x, y, r, col, t) {
  const g = c.createRadialGradient(x, y, r * 0.6, x, y, r * 2.4); g.addColorStop(0, rgba(col, 0.55)); g.addColorStop(1, rgba(col, 0));
  c.fillStyle = g; c.fillRect(x - r * 2.5, y - r * 2.5, r * 5, r * 5); circle(x, y, r, col);
}
const sky = (c0, c1) => { c.fillStyle = lg(0, -H / 2, 0, H / 2, [[0, c0], [1, c1]]); c.fillRect(-W, -H, W * 2, H * 2); };

// ---------------- OFFICE ----------------
const OFFICE_CAT = [-400, 120, 1.05, 1];
function officeSet(S, t, P, i) {
  const v = S.spec.v, day = v === 'day', frozen = v === 'frozen';
  layer(0, () => { sky(day ? '#5EC8FF' : '#140F33', day ? '#CDEFFF' : '#3B1E5E'); if (day) sun(420, -320, 70, '#FFE27A', t); else { stars(40, 3, t); circle(380, -330, 54, '#FFF3C4'); circle(404, -346, 50, '#140F33'); } });
  layer(0.25, () => buildings(0.25, 300, 190, 260, 760, day ? '#8FB8E0' : '#231A4A', day ? null : '#FFE08A', () => 0.32, 5, t));
  layer(0.6, () => {
    c.beginPath(); c.rect(-3000, -2000, 6000, 3200); c.rect(-1150, -900, 700, 720);
    c.fillStyle = day ? '#F2C77E' : '#2E2560'; c.fill('evenodd');
    c.fillStyle = day ? 'rgba(160,90,30,0.12)' : 'rgba(0,0,0,0.18)'; for (let x = -3000; x < 3000; x += 120) c.fillRect(x, -2000, 60, 3200);
    c.strokeStyle = INK; c.lineWidth = 14; c.strokeRect(-1150, -900, 700, 720); line(-800, -900, -800, -180, INK, 10); line(-1150, -540, -450, -540, INK, 10);
    if (frozen) { c.fillStyle = 'rgba(220,240,255,0.55)'; c.fillRect(-1150, -900, 700, 720); }
    at(620, -650, 1, 0.06, () => { fillRR(-170, -230, 340, 460, 10, '#FF3D7F'); rr(-170, -230, 340, 460, 10); c.strokeStyle = INK; c.lineWidth = 10; c.stroke(); text('SHIP', 0, -40, { size: 120, font: F.cond, weight: '900', color: '#FFF7E8', align: 'center' }); text('IT', 0, 90, { size: 140, font: F.cond, weight: '900', color: '#FFD23F', align: 'center' }); text('(to prod, friday 5pm)', 0, 170, { size: 26, font: F.cond, weight: '900', color: INK, align: 'center' }); });
    at(-100, -760, 1, 0, () => { glow(rgba(P.a), 40); text('</>', 0, 40, { size: 150, font: F.cond, weight: '900', color: rgba(mixc(P.a, '#ffffff', 0.4)), align: 'center' }); noGlow(); });
    at(1180, -560, 1, 0, () => { circle(0, 0, 110, '#FFF7E8'); ring(0, 0, 110, INK, 12); const a = t * 2.4, b = t * 0.2; line(0, 0, Math.cos(a) * 80, Math.sin(a) * 80, INK, 8); line(0, 0, Math.cos(b) * 56, Math.sin(b) * 56, INK, 12); circle(0, 0, 10, INK); });
    fillRR(-1500, -260, 520, 24, 6, '#8A5A33'); [['#22D3EE', 60], ['#FF3D7F', 80], ['#FFD23F', 50], ['#A78BFA', 70], ['#4ADE80', 64]].forEach(([col, hh], j) => { fillRR(-1480 + j * 70, -260 - hh, 56, hh, 4, col); rr(-1480 + j * 70, -260 - hh, 56, hh, 4); c.strokeStyle = INK; c.lineWidth = 4; c.stroke(); });
  });
  layer(1, () => {
    c.fillStyle = day ? '#B9824E' : '#3A2A55'; c.fillRect(-3000, 330, 6000, 2000);
    c.fillStyle = 'rgba(0,0,0,0.12)'; for (let x = -3000; x < 3000; x += 160) c.fillRect(x, 330, 6, 2000);
    line(-3000, 330, 3000, 330, INK, 8);
    ellipse(0, 420, 900, 70, day ? 'rgba(255,61,127,0.35)' : 'rgba(255,61,127,0.25)');
    const robotSeat = v === 'robot';
    // chair behind whoever sits at the desk
    fillRR(-540, -170, 280, 290, 40, '#1E1B3A'); rr(-540, -170, 280, 290, 40); c.strokeStyle = INK; c.lineWidth = 8; c.stroke();
    if (robotSeat) robot(-400, -110, 0.85, { t, mood: 'happy', acc: P.a });
    const pl = catAt(i, t);
    if (!robotSeat || pl.y > 200) drawCat(t, P, pl, { noBox: true, shadow: pl.y > 200 });
    // desk
    const dk = day ? '#8A5A33' : '#5B3A2A';
    fillRR(-700, 90, 30, 250, 6, INK); fillRR(670, 90, 30, 250, 6, INK);
    fillRR(-780, 60, 1560, 50, 10, dk); rr(-780, 60, 1560, 50, 10); c.strokeStyle = INK; c.lineWidth = 8; c.stroke();
    fillRR(-760, 110, 1520, 200, 8, rgba(mixc(dk, '#000000', 0.25))); rr(-760, 110, 1520, 200, 8); c.strokeStyle = INK; c.lineWidth = 8; c.stroke();
    fillRR(-360, 30, 260, 34, 8, '#CBD5E1'); rr(-360, 30, 260, 34, 8); c.strokeStyle = INK; c.lineWidth = 5; c.stroke();
    for (let k = 0; k < 9; k++) fillRR(-348 + k * 27, 38, 20, 8, 2, '#64748B');
    mug(-610, 0, 0.42, t);
    at(-520, 40, 0.5, 0, () => { ellipse(0, 0, 50, 34, '#FFD23F'); circle(30, -40, 30, '#FFD23F'); c.beginPath(); c.moveTo(52, -42); c.lineTo(80, -34); c.lineTo(52, -26); c.closePath(); c.fillStyle = '#FF8A00'; c.fill(); circle(38, -48, 6, INK); });
    // monitor
    const g = c.createRadialGradient(250, -310, 100, 250, -310, 620); g.addColorStop(0, rgba(P.a, 0.35)); g.addColorStop(1, rgba(P.a, 0)); c.fillStyle = g; c.fillRect(-500, -1000, 1500, 1200);
    fillRR(210, -40, 80, 110, 8, '#475569'); fillRR(130, 50, 240, 22, 8, '#475569'); rr(130, 50, 240, 22, 8); c.strokeStyle = INK; c.lineWidth = 6; c.stroke();
    fillRR(-90, -630, 680, 640, 30, '#1E293B'); rr(-90, -630, 680, 640, 30); c.strokeStyle = INK; c.lineWidth = 12; c.stroke();
    c.save(); c.translate(-60, -600); c.save(); rr(0, 0, 620, 580, 14); c.clip(); screenFeed(i, t, P, 620, 580); c.restore(); markProp(0, 0, 620, 580); c.restore();
    if (frozen) { c.fillStyle = 'rgba(225,245,255,0.95)'; for (let k = 0; k < 14; k++) { const x = -90 + k * 50, L = 20 + hash(k, 9) * 40; c.beginPath(); c.moveTo(x - 10, -630); c.lineTo(x + 10, -630); c.lineTo(x, -630 + L); c.closePath(); c.fill(); } for (let k = 0; k < 26; k++) { const x = -780 + k * 60, L = 16 + hash(k, 8) * 34; c.beginPath(); c.moveTo(x - 9, 110); c.lineTo(x + 9, 110); c.lineTo(x, 110 + L); c.closePath(); c.fill(); } }
    // desk lamp
    at(700, 60, 1, 0, () => { line(0, 0, -40, -220, INK, 18); line(0, 0, -40, -220, '#334155', 10); line(-40, -220, 60, -320, INK, 18); line(-40, -220, 60, -320, '#334155', 10); c.beginPath(); c.moveTo(20, -360); c.lineTo(130, -300); c.lineTo(90, -250); c.closePath(); c.fillStyle = '#FF3D7F'; c.fill(); c.strokeStyle = INK; c.lineWidth = 6; c.stroke(); fillRR(-60, -10, 120, 20, 8, INK); });
  });
  layer(1.45, () => {
    at(-1150, 640, 1, 0.1, () => { for (let k = 0; k < 6; k++) at(0, 0, 1, -0.9 + k * 0.32, () => { c.beginPath(); c.ellipse(0, -200, 50, 200, 0, 0, TAU); c.fillStyle = '#0F3D2E'; c.fill(); c.strokeStyle = INK; c.lineWidth = 8; c.stroke(); }); });
    at(1250, 700, 1, 0, () => { fillRR(-160, -240, 320, 340, 50, '#141024'); rr(-160, -240, 320, 340, 50); c.strokeStyle = INK; c.lineWidth = 10; c.stroke(); });
  });
  if (frozen) layer(0, () => { c.fillStyle = 'rgba(150,210,255,0.22)'; c.fillRect(-W, -H, W * 2, H * 2); for (let k = 0; k < 90; k++) { const x = ((hash(k, 1) * W * 1.2 + Math.sin(t + k) * 40) % (W * 1.2)) - W * 0.6, y = ((hash(k, 2) * H + t * (40 + hash(k, 3) * 60)) % (H * 1.2)) - H * 0.6; circle(x, y, 2 + hash(k, 4) * 5, 'rgba(255,255,255,0.85)'); } });
}

// ---------------- BEDROOM ----------------
function bedroomSet(S, t, P, i) {
  const night = S.spec.v === 'night';
  layer(0, () => { sky(night ? '#0B0A2A' : '#FF8FB1', night ? '#2B1C5E' : '#FFD27A'); if (night) { stars(50, 7, t); circle(-60, -260, 60, '#FFF3C4'); } else sun(-40, 40 - clamp((t - S.start) / 6) * 160, 90, '#FFF0A8', t); });
  layer(0.25, () => buildings(0.25, 260, 220, 120, 420, night ? '#1C1440' : '#E86A92', night ? '#FFE08A' : null, () => 0.3, 9, t));
  layer(0.6, () => {
    c.beginPath(); c.rect(-3000, -2000, 6000, 3200); c.rect(-380, -960, 620, 600); c.fillStyle = night ? '#241B4D' : '#B9A2F0'; c.fill('evenodd');
    c.fillStyle = night ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.18)'; for (let y = -2000; y < 1200; y += 90) for (let x = -3000; x < 3000; x += 90) circle(x + (y / 90 % 2) * 45, y, 10, c.fillStyle);
    c.strokeStyle = INK; c.lineWidth = 14; c.strokeRect(-380, -960, 620, 600); line(-70, -960, -70, -360, INK, 10);
    [[-470, 1], [330, -1]].forEach(([x, s]) => { c.beginPath(); c.moveTo(x, -1010); c.quadraticCurveTo(x + s * 60, -700, x + s * 10, -320); c.lineTo(x + s * 120, -320); c.quadraticCurveTo(x + s * 140, -700, x + s * 110, -1010); c.closePath(); c.fillStyle = '#FF6B9A'; c.fill(); c.strokeStyle = INK; c.lineWidth = 8; c.stroke(); });
    c.beginPath(); c.moveTo(-1500, -1080); for (let x = -1500; x <= 1500; x += 60) c.lineTo(x, -1080 + Math.sin(x / 300) * 60 + 60); c.strokeStyle = INK; c.lineWidth = 5; c.stroke();
    for (let x = -1440, k = 0; x <= 1500; x += 120, k++) { const y = -1080 + Math.sin(x / 300) * 60 + 70, on = 0.6 + 0.4 * Math.sin(t * 3 + k); glow(['#FFD23F', '#FF3D7F', '#22D3EE'][k % 3], 24 * on); circle(x, y, 14, ['#FFD23F', '#FF3D7F', '#22D3EE'][k % 3]); noGlow(); }
    at(900, -640, 1, -0.05, () => { fillRR(-200, -150, 400, 300, 10, '#FFF7E8'); rr(-200, -150, 400, 300, 10); c.strokeStyle = INK; c.lineWidth = 10; c.stroke(); text('404', 0, -10, { size: 120, font: F.cond, weight: '900', color: '#FF3D7F', align: 'center' }); text('SLEEP NOT FOUND', 0, 70, { size: 40, font: F.cond, weight: '900', color: INK, align: 'center' }); });
  });
  layer(1, () => {
    c.fillStyle = night ? '#2B1E48' : '#9C6B9E'; c.fillRect(-3000, 330, 6000, 2000); line(-3000, 330, 3000, 330, INK, 8);
    ellipse(-150, 430, 700, 60, 'rgba(255,210,63,0.3)');
    // bed
    fillRR(-800, -280, 90, 620, 20, '#8A5A33'); rr(-800, -280, 90, 620, 20); c.strokeStyle = INK; c.lineWidth = 8; c.stroke();
    fillRR(300, -40, 70, 380, 16, '#8A5A33'); rr(300, -40, 70, 380, 16); c.strokeStyle = INK; c.lineWidth = 8; c.stroke();
    fillRR(-720, 40, 1030, 150, 20, '#F8FAFC'); rr(-720, 40, 1030, 150, 20); c.strokeStyle = INK; c.lineWidth = 8; c.stroke();
    fillRR(-720, -40, 200, 90, 40, '#FFF7E8'); rr(-720, -40, 200, 90, 40); c.strokeStyle = INK; c.lineWidth = 7; c.stroke();
    const pl = catAt(i, t);
    drawCat(t, P, pl, { shadow: false });
    // blanket over the cat
    c.beginPath(); c.moveTo(-600, 200); c.lineTo(-600, 30);
    for (let x = -600; x <= 300; x += 30) c.lineTo(x, 22 + Math.sin(x / 70 + t * 1.5) * 6 + (x < -300 ? (x + 300) * -0.02 : 0));
    c.lineTo(310, 200); c.closePath(); c.fillStyle = '#4C6FFF'; c.fill(); c.strokeStyle = INK; c.lineWidth = 8; c.stroke();
    c.save(); c.clip(); for (let x = -600; x < 320; x += 110) for (let y = 30; y < 200; y += 70) star(x + (y / 70 % 2) * 55, y + 20, 14, '#FFD23F'); c.restore();
    // nightstand
    fillRR(420, 110, 260, 220, 14, '#A56A3E'); rr(420, 110, 260, 220, 14); c.strokeStyle = INK; c.lineWidth = 8; c.stroke(); line(430, 220, 670, 220, INK, 5); circle(550, 170, 8, INK); circle(550, 275, 8, INK);
    fillRR(450, 20, 190, 92, 16, INK); glow('#FF3B3B', 20); text(night ? '3:00' : '9:00', 545, 90, { size: 70, font: F.cond, weight: '900', color: '#FF3B3B', align: 'center' }); noGlow();
    // dream bubble with the lyric scene
    const bx = 60, by = -720, bw = 600, bh = 580, wob = Math.sin(t * 1.6) * 6;
    [[-330, -170, 18], [-250, -260, 28], [-150, -360, 40]].forEach(([x, y, r]) => { circle(x, y + wob * 0.5, r + 6, INK); circle(x, y + wob * 0.5, r, '#FFF7E8'); });
    c.save(); c.translate(0, wob);
    c.fillStyle = INK; c.beginPath(); for (let k = 0; k < 22; k++) { const a = k / 22 * TAU, x = bx + bw / 2 + Math.cos(a) * (bw / 2 + 30), y = by + bh / 2 + Math.sin(a) * (bh / 2 + 30); c.moveTo(x + 76, y); c.arc(x, y, 76, 0, TAU); } c.fill();
    c.fillStyle = '#FFF7E8'; c.beginPath(); for (let k = 0; k < 22; k++) { const a = k / 22 * TAU, x = bx + bw / 2 + Math.cos(a) * (bw / 2 + 30), y = by + bh / 2 + Math.sin(a) * (bh / 2 + 30); c.moveTo(x + 68, y); c.arc(x, y, 68, 0, TAU); } c.fill();
    fillRR(bx - 20, by - 20, bw + 40, bh + 40, 40, '#FFF7E8');
    c.translate(bx, by); c.save(); rr(0, 0, bw, bh, 26); c.clip(); screenFeed(i, t, P, bw, bh); c.restore(); rr(0, 0, bw, bh, 26); c.strokeStyle = INK; c.lineWidth = 6; c.stroke(); markProp(0, 0, bw, bh);
    c.restore();
  });
  layer(1.4, () => { at(1100, 660, 1, -0.2, () => { ellipse(0, 0, 160, 70, '#FF8FB1'); c.beginPath(); c.ellipse(0, 0, 160, 70, 0, 0, TAU); c.strokeStyle = INK; c.lineWidth = 8; c.stroke(); ellipse(-40, -30, 40, 20, '#FFF7E8'); }); });
}

// ---------------- CITY: the camera tracks the cat walking down the street ----------------
const CITY_V = 210;
function citySet(S, t, P, i) {
  const v = S.spec.v, day = v === 'day', out = v === 'blackout';
  const tDown = out ? wr(S.L[0].id, /down/) : 1e9, dark = out ? easeOut((t - tDown) / 1.6) : 0;
  const lit = f0 => (bi, r, q, hv) => f0 * (1 - dark * clamp((hash(bi, 77) + 0.2)));
  layer(0, () => { sky(day ? '#47B5FF' : '#0D0A2E', day ? '#FFD9A0' : '#5A2A7A'); if (day) sun(500, -260, 80, '#FFE27A', t); else { stars(60, 11, t); circle(560, -300, 60, '#FFF3C4'); } });
  layer(0.12, () => buildings(0.12, 160, 160, 160, 520, day ? '#9CC9EE' : '#1F1747', day ? null : '#8E7CFF', lit(0.25), 21, t));
  layer(0.35, () => buildings(0.35, 220, 240, 260, 820, day ? '#6E9BD0' : '#2A1E5C', day ? '#DDF2FF' : '#FFE08A', lit(0.4), 31, t, { roof: true }));
  layer(0.62, () => {
    buildings(0.62, 260, 360, 420, 980, day ? '#3F6CB0' : '#3A2470', day ? '#BEE3FF' : '#FFD27A', lit(0.45), 41, t, { ink: 8, roof: true });
    const [x0, x1] = visX(0.62), ads = ['AI 10x', 'HIRING: GPUs', 'SHIP IT', 'NO HUMANS', 'LGTM', 'PROMPT ME'];
    for (let k = Math.floor(x0 / 900) - 1; k <= Math.ceil(x1 / 900) + 1; k++) {
      const x = k * 900 + 300, y = -520 + hash(k, 5) * 160, col = ['#FF3D7F', '#22D3EE', '#FFD23F', '#A78BFA'][((k % 4) + 4) % 4];
      withAlpha(1 - dark * 0.85, () => { glow(col, 30); fillRR(x - 150, y - 50, 300, 100, 14, INK); noGlow(); rr(x - 150, y - 50, 300, 100, 14); c.strokeStyle = col; c.lineWidth = 6; c.stroke(); text(ads[((k % 6) + 6) % 6], x, y + 18, { size: 50, font: F.cond, weight: '900', color: col, align: 'center' }); });
    }
  });
  layer(1, () => {
    c.fillStyle = day ? '#A8A29E' : '#3B3355'; c.fillRect(CAM.x - 3000, 260, 6000, 120); line(CAM.x - 3000, 260, CAM.x + 3000, 260, INK, 8);
    c.fillStyle = day ? '#44403C' : '#17132B'; c.fillRect(CAM.x - 3000, 380, 6000, 1400); line(CAM.x - 3000, 380, CAM.x + 3000, 380, INK, 8);
    const [x0, x1] = visX(1);
    for (let k = Math.floor(x0 / 240); k <= x1 / 240; k++) fillRR(k * 240, 520, 130, 16, 6, '#FFD23F');
    for (let k = Math.floor(x0 / 160); k <= x1 / 160; k++) line(k * 160, 262, k * 160, 378, 'rgba(0,0,0,0.25)', 4);
    for (let k = Math.floor(x0 / 700) - 1; k <= x1 / 700 + 1; k++) {
      const x = k * 700 + 200, on = out ? (t < tDown + hash(k, 3) * 1.2 ? 1 : 0) : 1;
      if (on && !day) { const g = c.createRadialGradient(x + 70, -260, 10, x + 70, 120, 420); g.addColorStop(0, 'rgba(255,230,150,0.35)'); g.addColorStop(1, 'rgba(255,230,150,0)'); c.fillStyle = g; c.beginPath(); c.moveTo(x + 40, -270); c.lineTo(x + 330, 300); c.lineTo(x - 190, 300); c.closePath(); c.fill(); }
      line(x, 270, x, -280, INK, 22); line(x, 270, x, -280, '#475569', 12); line(x, -280, x + 70, -290, INK, 16);
      ellipse(x + 76, -280, 34, 16, on ? '#FFF3C4' : '#475569');
    }
    const pl = catAt(i, t); drawCat(t, P, pl, {});
    floatPropCity(i, t, P);
  });
  layer(1.7, () => {
    const [x0, x1] = visX(1.7);
    for (let k = Math.floor(x0 / 1500) - 1; k <= x1 / 1500 + 1; k++) { const x = k * 1500 + 600; fillRR(x - 40, -900, 80, 2200, 20, '#0B0818'); rr(x - 40, -900, 80, 2200, 20); c.strokeStyle = INK; c.lineWidth = 6; c.stroke(); fillRR(x - 70, 120, 140, 60, 10, '#E11D48'); rr(x - 70, 120, 140, 60, 10); c.stroke(); }
  });
}
function floatPropCity(i, t, P) { c.save(); c.translate(CAM.x, CAM.y); floatProp(i, t, P, 330, -150 + Math.sin(t * 1.3) * 10, 560, 570, 0.025 + Math.sin(t * 0.9) * 0.012); c.restore(); }

// ---------------- VORTEX: falling down the rabbit hole of the AI ----------------
const DEB = Array.from({ length: 28 }, (_, i) => ({ a: hash(i, 1) * TAU, ph: hash(i, 2), sp: 0.28 + hash(i, 3) * 0.25, k: i, rs: hash(i, 4) - 0.5 }));
const SNIP = ['rm -rf /', 'git push -f', 'DROP TABLE', 'sudo !!', 'TODO: fix', '// trust me', 'npm i', 'LGTM', 'prod', 'await ai()'];
function debrisItem(kind, i, t, P) {
  if (kind === 'clock') { circle(0, 0, 70, '#FFF7E8'); ring(0, 0, 70, INK, 9); line(0, 0, Math.cos(t * 9 + i) * 50, Math.sin(t * 9 + i) * 50, INK, 6); line(0, 0, Math.cos(t * 1.4) * 34, Math.sin(t * 1.4) * 34, INK, 9); return; }
  if (kind === 'bug') { ellipse(0, 0, 40, 52, '#22C55E'); c.beginPath(); c.ellipse(0, 0, 40, 52, 0, 0, TAU); c.strokeStyle = INK; c.lineWidth = 6; c.stroke(); line(0, -50, 0, 50, INK, 5); for (let s = -1; s <= 1; s += 2) for (let j = -1; j <= 1; j++) line(s * 36, j * 24, s * 64, j * 30 + 8, INK, 6); circle(-14, -46, 7, INK); circle(14, -46, 7, INK); return; }
  if (kind === 'warn') { warn(0, 0, 1.3); return; }
  if (kind === 'mug') { mug(0, 0, 0.6, t); return; }
  const s = SNIP[i % SNIP.length]; c.font = font(F.mono, 40, '700'); const w = c.measureText(s).width + 50;
  fillRR(-w / 2, -34, w, 68, 14, i % 3 ? '#1E293B' : '#FF3D7F'); rr(-w / 2, -34, w, 68, 14); c.strokeStyle = INK; c.lineWidth = 7; c.stroke();
  text(s, 0, 14, { size: 40, font: F.mono, color: i % 3 ? '#7DD3FC' : '#FFF7E8', align: 'center' });
}
function vortexSet(S, t, P, i) {
  const clocks = S.name === 'time';
  layer(0, () => {
    c.save(); c.rotate(t * 0.5);
    const N = 30, sp = t * 1.2, fr = sp % 1, base = Math.floor(sp), c0 = clocks ? '#0C2D5E' : '#3A0B4A', c1 = clocks ? '#1FA2FF' : rgba(P.a);
    c.fillStyle = c0; c.fillRect(-W * 1.2, -W * 1.2, W * 2.4, W * 2.4);
    for (let k = N; k >= 0; k--) {
      const u = k + fr, r = Math.pow(u / N, 1.9) * 2300, sx = Math.cos(u * 0.35 - t) * u * 4, sy = Math.sin(u * 0.35 - t) * u * 3;
      c.beginPath(); for (let j = 0; j <= 40; j++) { const a = j / 40 * TAU, rr0 = r * (1 + 0.08 * Math.sin(a * 3 + u + t * 2)); c.lineTo(sx + Math.cos(a) * rr0, sy + Math.sin(a) * rr0 * 0.8); } c.closePath();
      c.fillStyle = (k + base) % 2 ? c1 : c0; c.fill();
    }
    c.restore();
    const g = c.createRadialGradient(0, 0, 0, 0, 0, 260); g.addColorStop(0, 'rgba(255,255,255,0.9)'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.fillRect(-300, -300, 600, 600);
    halftoneC('rgba(0,0,0,0.18)', 28, 11, -W / 2, H / 2, 1200);
  });
  layer(1, () => {
    const kinds = clocks ? ['clock', 'clock', 'snip', 'clock'] : ['snip', 'bug', 'warn', 'snip', 'mug', 'snip', 'bug'];
    const items = DEB.map(d => ({ d, u: (t * d.sp + d.ph) % 1 })).sort((a, b) => a.u - b.u);
    for (const { d, u } of items) {
      const z = Math.pow(u, 2.4) * 3 + 0.06, r = Math.pow(u, 1.5) * 1250, a = d.a + t * 0.7;
      at(Math.cos(a) * r, Math.sin(a) * r * 0.6, z, a + d.rs * t * 3, () => withAlpha(clamp(u * 5) * clamp((1 - u) * 5), () => debrisItem(kinds[d.k % kinds.length], d.k, t, P)));
    }
    floatProp(i, t, P, 330, -10 + Math.sin(t * 1.4) * 14, 600, 610, Math.sin(t * 0.8) * 0.06);
    const pl = catAt(i, t); drawCat(t, P, pl, { shadow: false });
    for (let k = 0; k < 14; k++) { const a = hash(k, 3) * TAU, ph = (t * 1.6 + hash(k, 4)) % 1, r0 = 200 + ph * 900; withAlpha((1 - ph) * 0.6, () => line(Math.cos(a) * r0, Math.sin(a) * r0 * 0.6, Math.cos(a) * (r0 + 160), Math.sin(a) * (r0 + 160) * 0.6, '#FFF7E8', 6)); }
  });
}
function halftoneC(col, sp, maxR, fx, fy, reach) { c.save(); c.translate(-W / 2, -H / 2); halftone(col, sp, maxR, fx + W / 2, fy + H / 2, reach); c.restore(); }

// ---------------- STAGE ----------------
function stageSet(S, t, P, i) {
  const v = S.spec.v, spot = v === 'spot', show = v === 'show';
  layer(0, () => { sky(spot ? '#05030F' : '#12051F', spot ? '#0B0820' : '#2A0B3D'); });
  layer(0.35, () => {
    for (let x = -2600; x < 2600; x += 110) { c.fillStyle = lg(x, 0, x + 110, 0, [[0, spot ? '#1A0B22' : '#5C0F2E'], [0.5, spot ? '#2A1236' : '#8E1B45'], [1, spot ? '#1A0B22' : '#5C0F2E']]); c.fillRect(x, -1500, 110, 2400); }
    fillRR(-2600, -1060, 5200, 70, 0, '#1E1B2E'); for (let x = -2600; x < 2600; x += 90) line(x, -1060, x + 45, -990, '#475569', 6);
  });
  layer(0.62, () => {
    if (spot) return;
    fillRR(-560, -730, 1120, 720, 24, '#0B0B16'); rr(-560, -730, 1120, 720, 24); c.strokeStyle = INK; c.lineWidth = 16; c.stroke();
    c.save(); c.translate(-520, -690); c.save(); rr(0, 0, 1040, 640, 12); c.clip(); screenFeed(i, t, P, 1040, 640); c.restore(); markProp(0, 0, 1040, 640); c.restore();
    c.fillStyle = 'rgba(0,0,0,0.18)'; for (let y = -690; y < -50; y += 6) c.fillRect(-520, y, 1040, 2);
    if (v === 'podcast') at(760, -640, 1, 0.05, () => { glow('#FF3B3B', 40 * (0.6 + 0.4 * Math.sin(t * 5))); fillRR(-160, -50, 320, 100, 18, '#FF3B3B'); noGlow(); text('ON AIR', 0, 22, { size: 64, font: F.cond, weight: '900', align: 'center' }); });
  });
  layer(1, () => {
    fillRR(-2400, 230, 4800, 900, 0, spot ? '#1A1426' : '#3B2416'); for (let x = -2400; x < 2400; x += 140) line(x, 230, x * 1.3, 1100, 'rgba(0,0,0,0.3)', 4);
    line(-2400, 230, 2400, 230, INK, 10);
    for (let x = -1500; x <= 1500; x += 250) { glow(spot ? '#334155' : rgba(P.b), 20); fillRR(x - 40, 236, 80, 26, 8, spot ? '#334155' : rgba(mixc(P.b, '#ffffff', 0.3))); noGlow(); }
    const pl = catAt(i, t);
    // beams
    c.save(); c.globalCompositeOperation = 'lighter';
    const beams = spot ? [[pl.x, 0]] : [[-900, 1.3], [-300, 0.9], [300, 1.1], [900, 1.5]];
    beams.forEach(([bx, sp], k) => {
      const tx = spot ? pl.x : bx + Math.sin(t * sp + k) * 500, top = spot ? -1100 : -1000;
      c.beginPath(); c.moveTo(bx - 30, top); c.lineTo(bx + 30, top); c.lineTo(tx + 260, 300); c.lineTo(tx - 260, 300); c.closePath();
      c.fillStyle = lg(0, top, 0, 300, [[0, spot ? 'rgba(255,250,220,0.55)' : rgba(k % 2 ? P.a : P.b, 0.4)], [1, 'rgba(255,255,255,0.03)']]); c.fill();
      ellipse(tx, 270, 260, 40, spot ? 'rgba(255,250,220,0.35)' : rgba(k % 2 ? P.a : P.b, 0.25));
    });
    c.restore();
    drawCat(t, P, pl, {});
    if (show && S.name === 'accept') for (let k = 0; k < 60; k++) { const ph = (t * (0.3 + hash(k, 1) * 0.3) + hash(k, 2)) % 1, x = (hash(k, 3) - 0.5) * 2400, y = -900 + ph * 1500; at(x + Math.sin(t * 3 + k) * 30, y, 1, t * 4 + k, () => fillRR(-9, -14, 18, 28, 3, ['#FFD23F', '#FF3D7F', '#22D3EE', '#4ADE80'][k % 4])); }
  });
  layer(1.5, () => {
    const [x0, x1] = visX(1.5), quiet = spot;
    for (let k = Math.floor(x0 / 130) - 1; k <= x1 / 130 + 1; k++) {
      const x = k * 130 + (hash(k, 1) - 0.5) * 50, jump = quiet ? 0 : Math.max(0, Math.sin((t - PHASE) / BEAT * Math.PI + hash(k, 2) * 6)) * 30 * (0.4 + feat('energy', t)), y = 620 - jump + hash(k, 3) * 60;
      const up = !quiet && hash(k, 4) > 0.45, wave = Math.sin(t * 6 + k) * 0.3;
      if (up) [-1, 1].forEach(s => { line(x + s * 40, y + 40, x + s * 70 + Math.sin(t * 5 + k) * 20, y - 120, '#0B0818', 26); });
      if (up && hash(k, 6) > 0.6) { glow(rgba(P.a), 20); line(x + 70 + Math.sin(t * 5 + k) * 20, y - 120, x + 90 + Math.sin(t * 5 + k) * 30, y - 190, rgba(mixc(P.a, '#ffffff', 0.5)), 10); noGlow(); }
      fillRR(x - 70, y - 50, 140, 120, 44, '#0B0818'); line(x, y - 50, x + wave * 30, y - 100, '#0B0818', 8); circle(x + wave * 30, y - 104, 12, rgba(P.a));
      fillRR(x - 46, y - 24, 92, 44, 20, '#1E1B3A'); circle(x - 18, y - 2, 8, rgba(P.b)); circle(x + 18, y - 2, 8, rgba(P.b));
      c.fillStyle = '#0B0818'; c.fillRect(x - 90, y + 60, 180, 600);
    }
  });
}

// ---------------- SKY: riding the rocket of "shipping really fast" ----------------
function skySet(S, t, P, i) {
  layer(0, () => {
    sky('#1B2A8F', '#FF8A5B'); sun(-500, 200, 120, '#FFE27A', t);
    for (let k = 0; k < 40; k++) { const y = ((hash(k, 1) * 1600 + t * 900) % 1600) - 800, x = (hash(k, 2) - 0.5) * 2000; withAlpha(0.5, () => line(x, y, x, y + 90 + hash(k, 3) * 120, '#FFF7E8', 4)); }
  });
  const clouds = (f, n, sp, sc, col, seed) => layer(f, () => { for (let k = 0; k < n; k++) { const y = ((hash(k, seed) * 2000 + t * sp) % 2000) - 1000, x = (hash(k, seed + 1) - 0.5) * 2400; cloud(x, y, sc * (0.7 + hash(k, seed + 2) * 0.6), col); } });
  clouds(0.4, 8, 220, 1.1, '#FFC0D0', 3);
  clouds(0.8, 6, 520, 1.7, '#FFE6EE', 5);
  layer(1, () => {
    floatProp(i, t, P, 430, 200 + Math.sin(t * 1.5) * 18, 500, 510, 0.04 + Math.sin(t * 1.1) * 0.02);
    const rx = -400 + Math.sin(t * 1.3) * 50, ry = 330 + Math.sin(t * 2.3) * 22, rot = -0.08 + Math.sin(t * 1.3) * 0.06;
    c.save(); c.translate(rx, ry); c.rotate(rot);
    for (let k = 0; k < 8; k++) { const ph = (t * 2.4 + k / 8) % 1; withAlpha(1 - ph, () => cloud((hash(k, 9) - 0.5) * 60, 330 + ph * 600, 0.5 + ph * 0.9, '#F1F5F9', null)); }
    const fl = 1 + 0.18 * Math.sin(t * 40);
    c.beginPath(); c.moveTo(-50, 230); c.quadraticCurveTo(0, 230 + 220 * fl, 50, 230); c.closePath(); c.fillStyle = '#FFD23F'; c.fill();
    c.beginPath(); c.moveTo(-28, 230); c.quadraticCurveTo(0, 230 + 130 * fl, 28, 230); c.closePath(); c.fillStyle = '#FFF7E8'; c.fill();
    [[-1], [1]].forEach(([s]) => { c.beginPath(); c.moveTo(s * 70, 120); c.lineTo(s * 140, 250); c.lineTo(s * 60, 220); c.closePath(); c.fillStyle = '#FF3D7F'; c.fill(); c.strokeStyle = INK; c.lineWidth = 8; c.stroke(); });
    c.beginPath(); c.moveTo(-80, 230); c.lineTo(-80, -120); c.quadraticCurveTo(-80, -300, 0, -400); c.quadraticCurveTo(80, -300, 80, -120); c.lineTo(80, 230); c.closePath();
    c.fillStyle = lg(-80, 0, 80, 0, [[0, '#E2E8F0'], [0.5, '#FFFFFF'], [1, '#94A3B8']]); c.fill(); c.strokeStyle = INK; c.lineWidth = 9; c.stroke();
    circle(0, -40, 40, '#22D3EE'); ring(0, -40, 40, INK, 8); text('v1.0', 0, 140, { size: 40, font: F.cond, weight: '900', color: INK, align: 'center' });
    c.restore();
    const pl = { x: rx + Math.sin(rot) * 330, y: ry - 330 + 40, s: 0.75, dir: 1, rot: rot };
    drawCat(t, P, pl, { shadow: false });
    for (let k = 0; k < 3; k++) { const ph = (t * 0.45 + k / 3) % 1; at(-900 + k * 300 + Math.sin(t + k) * 80, -700 + ph * 1600, 0.8, Math.sin(t * 3 + k) * 0.4, () => debrisItem('bug', k, t, P)); }
  });
  layer(1.5, () => { for (let k = 0; k < 3; k++) { const y = ((hash(k, 7) * 2000 + t * 1100) % 2000) - 1000, x = (k % 2 ? 1 : -1) * (1050 + hash(k, 8) * 300); cloud(x, y, 2.4, 'rgba(255,255,255,0.92)'); } });
}

// ---------------- MONEY: it's raining (and running out) ----------------
function moneySet(S, t, P, i) {
  const d = t - S.start;
  layer(0, () => {
    c.save(); c.rotate(t * 0.08); c.fillStyle = '#0E6B3A'; c.fillRect(-W * 1.5, -W * 1.5, W * 3, W * 3); c.fillStyle = '#16A34A';
    for (let k = 0; k < 24; k += 2) { const a0 = k / 24 * TAU, a1 = (k + 1) / 24 * TAU; c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(a0) * 3000, Math.sin(a0) * 3000); c.lineTo(Math.cos(a1) * 3000, Math.sin(a1) * 3000); c.closePath(); c.fill(); }
    c.restore(); halftoneC('rgba(0,0,0,0.2)', 28, 12, -W / 2, H / 2, 1200);
  });
  const rain = (f, n, sp, seed) => layer(f, () => { for (let k = 0; k < n; k++) { const y = ((hash(k, seed) * 1700 + t * sp * (0.7 + hash(k, seed + 3) * 0.6)) % 1700) - 850, x = (hash(k, seed + 1) - 0.5) * 2200 + Math.sin(t * 2 + k) * 40; at(x, y, f, t * 2 * (hash(k, seed + 2) - 0.5) + k, () => {
    if (k % 3) { fillRR(-60, -30, 120, 60, 6, '#4ADE80'); rr(-60, -30, 120, 60, 6); c.strokeStyle = INK; c.lineWidth = 6; c.stroke(); circle(0, 0, 18, '#15803D'); text('$', 0, 12, { size: 34, font: F.cond, weight: '900', color: '#DCFCE7', align: 'center' }); }
    else { circle(0, 0, 38, '#FFD23F'); ring(0, 0, 38, INK, 7); text('$', 0, 14, { size: 44, font: F.cond, weight: '900', color: '#B45309', align: 'center' }); }
  }); } });
  rain(0.6, 18, 260, 3);
  layer(1, () => {
    floatProp(i, t, P, 360, -60 + Math.sin(t * 1.2) * 12, 560, 570, -0.03 + Math.sin(t) * 0.015);
    const sink = easeInOut(clamp(d / 5)) * 150, py = 420 + sink;
    c.beginPath(); c.moveTo(-1100, 700); c.quadraticCurveTo(-440, py - 260, 200, 700); c.closePath(); c.fillStyle = '#F59E0B'; c.fill(); c.strokeStyle = INK; c.lineWidth = 9; c.stroke();
    c.save(); c.clip(); for (let k = 0; k < 60; k++) { const x = -1100 + hash(k, 1) * 1300, y = py - 200 + hash(k, 2) * 520; circle(x, y, 26, '#FFD23F'); ring(x, y, 26, 'rgba(120,53,15,0.8)', 5); } c.restore();
    const pl = catAt(i, t); pl.y = py - 190 + sink * 0.1; drawCat(t, P, pl, { shadow: false });
  });
  rain(1.4, 8, 520, 9);
}

// ---------------- SPACE: lost without the stack (and the Wi-Fi) ----------------
function spaceSet(S, t, P, i) {
  layer(0, () => { sky('#05031A', '#1B0B3A'); const g = c.createRadialGradient(-300, -100, 0, -300, -100, 900); g.addColorStop(0, 'rgba(167,139,250,0.35)'); g.addColorStop(1, 'rgba(167,139,250,0)'); c.fillStyle = g; c.fillRect(-W, -H, W * 2, H * 2); stars(90, 13, t); });
  layer(0.2, () => { circle(-700, -250, 170, '#FF8A5B'); c.save(); c.beginPath(); c.arc(-700, -250, 170, 0, TAU); c.clip(); for (let k = -3; k < 4; k++) c.fillRect(-900, -250 + k * 50, 400, 18); c.restore(); c.beginPath(); c.ellipse(-700, -250, 300, 60, -0.3, 0, TAU); c.strokeStyle = '#FFD23F'; c.lineWidth = 14; c.stroke(); ring(-700, -250, 170, INK, 8); });
  layer(0.5, () => { stars(30, 17, t, '#C4B5FD'); const on = Math.sin(t * 4) > 0; at(780, -360, 1.4, 0, () => withAlpha(on ? 0.9 : 0.3, () => wifi(0, 0, 1.4, '#22D3EE', 0))); });
  layer(1, () => {
    const blocks = ['HTML', 'CSS', 'JS', 'SQL', 'GIT', 'K8S', 'C++', 'BASH'];
    blocks.forEach((b, k) => { const d = t * 0.12 + hash(k, 1) * 6, x = Math.cos(d + k) * (500 + k * 60) + 100, y = Math.sin(d * 1.3 + k) * 300; at(x, y, 0.9, t * 0.4 * (k % 2 ? 1 : -1) + k, () => { fillRR(-80, -50, 160, 100, 12, ['#FF3D7F', '#22D3EE', '#FFD23F', '#A78BFA', '#4ADE80', '#F97316'][k % 6]); rr(-80, -50, 160, 100, 12); c.strokeStyle = INK; c.lineWidth = 8; c.stroke(); text(b, 0, 18, { size: 50, font: F.cond, weight: '900', color: INK, align: 'center' }); }); });
    floatProp(i, t, P, 360, -20 + Math.sin(t * 0.9) * 20, 580, 590, Math.sin(t * 0.5) * 0.05);
    const pl = catAt(i, t); drawCat(t, P, pl, { shadow: false, helmet: true });
  });
}

// ---------------- GLITCH: context window exceeded ----------------
function glitchSet(S, t, P, i) {
  layer(0, () => {
    sky('#0A0A0F', '#1A0610');
    c.save(); c.translate(-W, -H); const off = (t * 60) % 120;
    for (let y = -120; y < H * 2 + 120; y += 120) for (let x = 0; x < W * 2; x += 300) withAlpha(0.08, () => text('ERROR', x + ((y / 120) % 2) * 150, y + off, { size: 70, font: F.cond, weight: '900', color: '#FF3B5C' }));
    c.restore();
    c.fillStyle = 'rgba(255,255,255,0.03)'; for (let y = -H; y < H; y += 6) c.fillRect(-W, y, W * 2, 2);
  });
  layer(1, () => {
    const j = Math.floor(t * 12), sh = (hash(j, 1) - 0.5) * 14;
    floatProp(i, t, P, 300 + sh, -10, 680, 690, Math.sin(t * 0.6) * 0.03);
    const pl = catAt(i, t); drawCat(t, P, pl, {});
  });
  GLITCH = Math.max(GLITCH, 0.35 + 0.3 * Math.max(0, Math.sin(t * 3)));
}

const SETS = { office: officeSet, bedroom: bedroomSet, city: citySet, vortex: vortexSet, stage: stageSet, sky: skySet, money: moneySet, space: spaceSet, glitch: glitchSet };

// ---------------- the shot plan ----------------
const TB = {
  tl: { x: 90, w: 860, cy: 250, h: 340 }, tlw: { x: 90, w: 1100, cy: 220, h: 300 }, tc: { x: 960, w: 1500, cy: 190, h: 260, align: 'center' },
  tr: { x: 1010, w: 830, cy: 250, h: 340 }, big: { x: 960, w: 1400, cy: 300, h: 420, align: 'center', base: 160, rot: -0.02 },
  ml: { x: 80, w: 600, cy: 330, h: 480 }, bl: { x: 90, w: 1000, cy: 860, h: 260 },
};
const OCAM = { wide: [0, -180, 0.82], mon: [120, -310, 1.25], cat: [-380, -130, 1.5], mid: [-60, -230, 1.02] };
// set, variant, camera [x, y, zoom, rot], camera drift per second, cat spot [x, feetY, scale, facing], text box, transition in
const PLAN = [
  ['office', 'night', OCAM.wide, [0, 0, 0.012], OFFICE_CAT, 'big', null],
  ['office', 'night', OCAM.mid, [20, -6, 0.02], OFFICE_CAT, 'tl', null],
  ['office', 'night', OCAM.mon, [10, 0, 0.015], OFFICE_CAT, 'ml', null],
  ['bedroom', 'dawn', [0, -200, 0.85], [18, 0, 0.01], [-480, 120, 1.0, 1], 'tl', 'dive'],
  ['bedroom', 'dawn', [-120, -260, 1.12], [10, 0, 0.012], [-480, 120, 1.0, 1], 'tl', null],
  ['bedroom', 'dawn', [200, -380, 1.1], [-10, 0, 0.012], [-480, 120, 1.0, 1], 'ml', null],
  ['vortex', '', [0, 0, 1], [0, 0, 0.01, 0.02], [-470, 260, 1.0, 1], 'tl', 'spin'],
  ['office', 'night', OCAM.mid, [-20, 0, 0.018], OFFICE_CAT, 'tl', 'splat'],
  ['city', 'night', [0, -120, 1], [0, 0, 0.004], [-420, 260, 1.0, 1], 'tl', 'whip'],
  ['city', 'night', [0, -150, 1.06], [0, 0, 0.004], [-420, 260, 1.0, 1], 'tl', null],
  ['office', 'day', OCAM.mon, [-10, 0, 0.012], OFFICE_CAT, 'ml', 'whip'],
  ['vortex', '', [0, 0, 1], [0, 0, 0.012, -0.02], [-470, 260, 1.0, 1], 'tl', 'spin'],
  ['vortex', '', [0, 0, 1.05], [0, 0, 0.01, 0.03], [-470, 260, 1.0, 1], 'tl', null],
  ['vortex', '', [0, 0, 1.0], [0, 0, 0.01, -0.03], [-470, 260, 1.0, 1], 'tl', null],
  ['stage', 'show', [0, -170, 0.9], [15, 0, 0.012], [-560, 250, 1.1, 1], 'tl', 'splat'],
  ['stage', 'show', [-400, -90, 1.3], [10, 0, 0.015], [-560, 250, 1.1, 1], 'tc', null],
  ['sky', '', [0, 0, 1], [0, 0, 0.01, 0.01], null, 'tr', 'tilt'],
  ['money', '', [0, 0, 1], [0, -10, 0.012], [-440, 400, 1.0, 1], 'tl', 'whip'],
  ['office', 'day', OCAM.mid, [20, 0, 0.015], OFFICE_CAT, 'tl', 'dive'],
  ['city', 'day', [0, -120, 1], [0, 0, 0.004], [-420, 260, 1.0, 1], 'tl', 'whip'],
  ['city', 'day', [0, -160, 1.08], [0, 0, 0.004], [-420, 260, 1.0, 1], 'tl', null],
  ['office', 'night', OCAM.mon, [10, 0, 0.012], OFFICE_CAT, 'ml', 'whip'],
  ['stage', 'podcast', [0, -200, 0.95], [10, 0, 0.012], [-560, 250, 1.1, 1], 'tl', 'dive'],
  ['city', 'blackout', [0, -140, 1.02], [0, 0, 0.004], [-420, 260, 1.0, 1], 'tl', 'whip'],
  ['office', 'night', OCAM.mid, [-15, 0, 0.018], OFFICE_CAT, 'tl', 'splat'],
  ['vortex', '', [0, 0, 1], [0, 0, 0.012, 0.02], [-470, 260, 1.0, 1], 'tl', 'spin'],
  ['vortex', '', [0, 0, 1.05], [0, 0, 0.01, -0.03], [-470, 260, 1.0, 1], 'tl', null],
  ['vortex', '', [0, 0, 1.0], [0, 0, 0.01, 0.03], [-470, 260, 1.0, 1], 'tl', null],
  ['stage', 'show', [0, -170, 0.9], [-15, 0, 0.012], [-560, 250, 1.1, 1], 'tl', 'splat'],
  ['stage', 'show', [-400, -90, 1.3], [10, 0, 0.015], [-560, 250, 1.1, 1], 'tc', null],
  ['sky', '', [0, 0, 1], [0, 0, 0.01, -0.01], null, 'tr', 'tilt'],
  ['money', '', [0, 0, 1], [0, -10, 0.012], [-440, 400, 1.0, 1], 'tl', 'whip'],
  ['space', '', [0, 0, 1], [8, 4, 0.01], [-470, 300, 0.95, 1], 'tl', 'spin'],
  ['space', '', [80, 30, 1.08], [8, 4, 0.01], [-420, 260, 0.95, 1], 'tl', null],
  ['office', 'frozen', OCAM.wide, [10, 0, 0.012], OFFICE_CAT, 'tl', 'splat'],
  ['stage', 'spot', [0, -150, 1.0], [0, 0, 0.02], [0, 250, 1.15, 1], 'tc', 'whip'],
  ['glitch', '', [0, 0, 1], [0, 0, 0.015], [-500, 330, 1.05, 1], 'tl', 'cut'],
  ['city', 'night', [0, -120, 1], [0, 0, 0.004], [-420, 260, 1.0, 1], 'tl', 'whip'],
  ['office', 'robot', OCAM.wide, [10, 0, 0.012], [-880, 330, 0.95, 1], 'tl', 'whip'],
  ['office', 'robot', [-260, -200, 0.98], [-10, 0, 0.012], [-880, 330, 0.95, 1], 'tl', null],
  ['stage', 'show', [0, -170, 0.9], [15, 0, 0.012], [-560, 250, 1.1, 1], 'tl', 'splat'],
  ['stage', 'show', [-400, -90, 1.3], [-10, 0, 0.015], [-560, 250, 1.1, 1], 'tc', null],
  ['sky', '', [0, 0, 1], [0, 0, 0.01, 0.01], null, 'tr', 'tilt'],
  ['money', '', [0, 0, 1], [0, -10, 0.012], [-440, 400, 1.0, 1], 'tl', 'whip'],
  ['bedroom', 'night', [-120, -280, 0.95], [12, 0, 0.012], [-480, 120, 1.0, 1], 'tl', 'dive'],
  ['office', 'night', OCAM.wide, [0, 0, -0.01], OFFICE_CAT, 'big', 'dive'],
];
if (PLAN.length !== SCENES.length) throw new Error(`plan has ${PLAN.length} shots, scenes ${SCENES.length}`);
SCENES.forEach((S, i) => {
  const [set, v, cam, drift, cat, tb, tin] = PLAN[i];
  S.spec = { set, v, cam, drift, cat, tin };
  S.lay = { text: TB[tb] };
});
const TDUR = { dive: 0.8, whip: 0.5, spin: 0.7, splat: 0.75, tilt: 0.55, cut: 0.3 };

function shotCam(i, t) {
  const S = SCENES[i], sp = S.spec, d = t - S.start, dr = sp.drift;
  const cam = { x: sp.cam[0] + dr[0] * d, y: sp.cam[1] + dr[1] * d, z: sp.cam[2] + dr[2] * d, r: (sp.cam[3] || 0) + (dr[3] || 0) * d };
  if (sp.set === 'city') cam.x = CITY_V * t;
  const pv = SCENES[i - 1];
  if (pv && pv.spec.set === sp.set) {
    const m = easeInOut((t - S.start) / 1.1);
    if (m < 1) { const pc = shotCam(i - 1, S.start); ['x', 'y', 'z', 'r'].forEach(k => { if (!(k === 'x' && sp.set === 'city')) cam[k] = lerp(pc[k], cam[k], m); }); }
  }
  cam.z *= 1 + Math.sin(t * 0.45) * 0.006; cam.r += Math.sin(t * 0.33) * 0.004;
  return cam;
}

// where the cat is in shot i's world; it hops when the spot changes inside the same world
function catAt(i, t) {
  const S = SCENES[i], sp = S.spec;
  let [x, y, s, dir] = sp.cat || [0, 0, 1, 1];
  const o = { x, y, s, dir, rot: 0, air: 0, sq: 0, vis: 1, walk: 0 };
  if (sp.set === 'city') { o.x = CAM.x + x; o.walk = 1; }
  if (sp.set === 'vortex') { o.x += Math.sin(t * 0.8) * 50; o.y += Math.cos(t * 1.1) * 36; o.rot = Math.sin(t * 0.9) * 0.45; }
  if (sp.set === 'space') { o.x += Math.sin(t * 0.5) * 40; o.y += Math.sin(t * 0.7) * 30; o.rot = Math.sin(t * 0.4) * 0.3; }
  const pv = SCENES[i - 1];
  if (pv && pv.spec.set === sp.set && pv.spec.cat && sp.set !== 'city') {
    const [px, py, ps] = pv.spec.cat, dist = Math.hypot(x - px, y - py);
    if (dist > 10) {
      const D = 0.5 + dist / 2400, k = (t - S.start - 0.05) / D;
      if (k < 0) { o.x = px; o.y = py; o.s = ps; }
      else if (k < 1) { const e = easeInOut(k); o.x = lerp(px, x, e); o.y = lerp(py, y, e); o.s = lerp(ps, s, e); o.air = Math.sin(Math.PI * k) * (170 + dist * 0.08); o.dir = Math.sign(x - px) || dir; }
      else o.sq = landSquash(t - S.start - 0.05 - D);
    }
  }
  return o;
}

function renderShot(i, t, P) {
  const S = SCENES[i];
  CAM = shotCam(i, t); PROP_RECT.on = false; GLITCH = 0;
  SETS[S.spec.set](S, t, P, i);
  if (GLITCH > 0.02 && PROP_RECT.on) glitch(t, GLITCH, PROP_RECT);
}
