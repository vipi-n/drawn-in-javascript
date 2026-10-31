// The mascot: a chubby ginger dev cat. It never sings; it reacts to every lyric with big faces and small moves,
// and hops (or poofs) to a new spot only when the shot layout changes.
const FUR = '#F4A259', FUR_D = '#D97A34', FUR_L = '#FFCB8E', CREAM = '#FFF3E2', PINK = '#FF8FAB', MOUTH = '#5E1A2A';
const DOGC = { fur: '#B98552', furD: '#86592F', furL: '#D9AA74', cream: '#F4E2C6' };

const CAT_MOODS = {
  neutral: { eye: 'dot', mouth: 'w' },
  happy: { eye: 'arc', mouth: 'smile', blush: 1, tail: 1.8 },
  manic: { eye: 'star', mouth: 'grin', blush: 0.8, fx: 'sparkle', shake: 0.25, tail: 2.6, ear: 0.3 },
  smug: { eye: 'half', lid: 0.5, mouth: 'smirk', brow: 0.35, blush: 0.5, tilt: 0.12 },
  tired: { eye: 'half', lid: 0.64, mouth: 'flat', bags: 1, ear: -0.55, tilt: -0.06, tail: 0.4 },
  sleep: { eye: 'line', mouth: 'o', ear: -0.4, fx: 'zzz', bags: 0.4, tail: 0.3 },
  shock: { eye: 'wide', pupil: 0.45, mouth: 'O', ear: 0.7, fx: 'bang', poof: 0.5, tail: 0 },
  scared: { eye: 'wide', pupil: 0.55, mouth: 'wavy', ear: -0.85, fx: 'sweat', shake: 0.3, brow: -0.6, poof: 0.3 },
  nervous: { eye: 'dot', look: 1, mouth: 'wavy', ear: -0.45, fx: 'sweat', brow: -0.5 },
  sad: { eye: 'dot', shine: 1, mouth: 'frown', ear: -1, brow: -0.8, tilt: -0.08, tail: 0.2 },
  cry: { eye: 'squeeze', mouth: 'wail', ear: -1, fx: 'tears', blush: 0.7, brow: -0.8 },
  panic: { eye: 'wide', pupil: 0.3, mouth: 'scream', ear: -0.9, fx: 'sweat', shake: 1, poof: 1, brow: -0.8, tail: 3 },
  angry: { eye: 'dot', mouth: 'fangs', ear: -0.75, brow: 1, red: 1, fx: 'steam', poof: 0.4, tail: 2.2 },
  confused: { eye: 'odd', mouth: 'side', ear: 0.2, earAsym: 1, fx: 'q', tilt: 0.16 },
  deadpan: { eye: 'half', lid: 0.52, mouth: 'flat', tail: 0.5 },
  frozen: { eye: 'wide', pupil: 0.5, mouth: 'wavy', ice: 1, shiver: 1, fx: 'ice', ear: -0.3, tail: 0 },
};
const NUMC = ['lid', 'blush', 'brow', 'tilt', 'bags', 'ear', 'earAsym', 'pupil', 'poof', 'shake', 'shiver', 'red', 'ice', 'look', 'shine', 'tail'];
const DEFC = { pupil: 1, tail: 1 };
const catMood = m => { const s = CAT_MOODS[m] || CAT_MOODS.neutral, o = { eye: s.eye, mouth: s.mouth, fx: s.fx || null }; NUMC.forEach(k => { o[k] = s[k] ?? DEFC[k] ?? 0; }); return o; };

// ---------------- head ----------------
const HRX = 122, HRY = 100;
function headPathC(poof) {
  const rx = HRX, ry = HRY, f = 1 + poof * 0.06, a = 14 + poof * 18, b = 8 + poof * 16;
  c.beginPath(); c.moveTo(0, -ry * f);
  c.bezierCurveTo(rx * 0.6, -ry * f, rx * f, -ry * 0.6, rx * f, -ry * 0.02);
  c.lineTo(rx * f + a, ry * 0.3); c.lineTo(rx * 0.93, ry * 0.42); c.lineTo(rx * 0.98 + b, ry * 0.6); c.lineTo(rx * 0.8, ry * 0.7);
  c.bezierCurveTo(rx * 0.6, ry * 0.98, rx * 0.3, ry, 0, ry);
  c.bezierCurveTo(-rx * 0.3, ry, -rx * 0.6, ry * 0.98, -rx * 0.8, ry * 0.7);
  c.lineTo(-(rx * 0.98 + b), ry * 0.6); c.lineTo(-rx * 0.93, ry * 0.42); c.lineTo(-(rx * f + a), ry * 0.3);
  c.lineTo(-rx * f, -ry * 0.02); c.bezierCurveTo(-rx * f, -ry * 0.6, -rx * 0.6, -ry * f, 0, -ry * f); c.closePath();
}
function catEar(side, p, col, t) {
  const up = Math.max(0, p.ear), dn = Math.max(0, -p.ear) + (side > 0 ? p.earAsym * 0.7 : 0);
  const tw = Math.exp(-((t + side * 1.3) % 5.3) * 9) * 0.18;
  c.save(); c.translate(side * 64, -62); c.rotate(side * (0.3 + dn * 0.8 - up * 0.12 + tw)); c.scale(1, 1 + up * 0.22 - dn * 0.18);
  c.beginPath(); c.moveTo(-42, 18); c.quadraticCurveTo(-32, -58, -6, -92); c.quadraticCurveTo(4, -100, 12, -88); c.quadraticCurveTo(40, -42, 44, 18); c.closePath();
  c.fillStyle = col; c.fill(); c.strokeStyle = INK; c.lineWidth = 7; c.lineJoin = 'round'; c.stroke();
  c.beginPath(); c.moveTo(-24, 8); c.quadraticCurveTo(-18, -44, -2, -68); c.quadraticCurveTo(22, -32, 26, 8); c.closePath(); c.fillStyle = PINK; c.fill();
  c.restore();
}
function dogEar(side, p, col, t) {
  const lift = Math.max(0, p.ear) * 0.7 - Math.max(0, -p.ear) * 0.2;
  c.save(); c.translate(side * 100, -54); c.rotate(side * (0.18 - lift * 0.9) + Math.sin(t * 2.4 + side) * 0.04);
  c.beginPath(); c.ellipse(side * 14, 54, 36, 70, side * -0.12, 0, TAU); c.fillStyle = col; c.fill(); c.strokeStyle = INK; c.lineWidth = 7; c.stroke();
  c.restore();
}

function eye(ex, ey, p, kind, open, look, t, side) {
  const lx = look[0] * 7, ly = look[1] * 6;
  if (kind === 'arc') { c.beginPath(); c.arc(ex, ey + 10, 20, 1.12 * Math.PI, 1.88 * Math.PI); c.strokeStyle = INK; c.lineWidth = 8; c.lineCap = 'round'; c.stroke(); return; }
  if (kind === 'line' || open < 0.12) { c.beginPath(); c.arc(ex, ey - 6, 18, 0.18 * Math.PI, 0.82 * Math.PI); c.strokeStyle = INK; c.lineWidth = 7; c.lineCap = 'round'; c.stroke(); return; }
  if (kind === 'squeeze') {
    c.beginPath(); const d = side < 0 ? 1 : -1; c.moveTo(ex - d * 16, ey - 15); c.lineTo(ex + d * 12, ey); c.lineTo(ex - d * 16, ey + 15);
    c.strokeStyle = INK; c.lineWidth = 8; c.lineCap = 'round'; c.lineJoin = 'round'; c.stroke(); return;
  }
  if (kind === 'star') {
    at(ex, ey, 1, t * 1.5 * side, () => { c.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 11 : 27; c.lineTo(Math.cos(a) * r, Math.sin(a) * r); } c.closePath(); c.fillStyle = '#FFD23F'; c.fill(); c.strokeStyle = INK; c.lineWidth = 5; c.lineJoin = 'round'; c.stroke(); });
    return;
  }
  if (kind === 'wide') {
    const j = Math.sin(t * 40 + side) * 1.2;
    ellipse(ex, ey, 27, 31 * open, '#FFFFFF'); c.beginPath(); c.ellipse(ex, ey, 27, 31 * open, 0, 0, TAU); c.strokeStyle = INK; c.lineWidth = 6; c.stroke();
    circle(ex + lx * 0.6 + j, ey + ly * 0.6, 13 * p.pupil + 2, EYE_C); circle(ex + lx * 0.6 + 3 + j, ey + ly * 0.6 - 4, 3, '#fff');
    return;
  }
  const sc = kind === 'odd' ? (side < 0 ? 1.22 : 0.74) : 1, rx = 22 * sc, ry = 27 * sc * open;
  c.save(); c.beginPath(); c.ellipse(ex + lx * 0.4, ey + ly * 0.4, rx, ry, 0, 0, TAU); c.clip();
  c.fillStyle = lg(0, ey - ry, 0, ey + ry, [[0, '#2A1630'], [1, '#09040C']]); c.fillRect(ex - rx - 10, ey - ry - 10, rx * 2 + 20, ry * 2 + 20);
  ellipse(ex + lx * 0.4, ey + ry * 0.55, rx * 0.8, ry * 0.4, 'rgba(120,80,170,0.45)');
  circle(ex + lx + 7 * sc, ey + ly - 10 * sc, 8.5 * sc * (1 + p.shine * 0.25), '#fff'); circle(ex + lx - 7 * sc, ey + ly + 9 * sc, 4 * sc, '#fff');
  if (p.shine > 0.05) withAlpha(p.shine, () => ellipse(ex, ey + ry * 0.75, rx * 0.9, ry * 0.3, 'rgba(150,220,255,0.7)'));
  if (kind === 'half') { c.fillStyle = FUR; c.fillRect(ex - rx - 4, ey - ry - 4, rx * 2 + 8, 2 * ry * p.lid + 4); }
  if (p.brow > 0.3) { c.fillStyle = FUR; c.beginPath(); const d = side < 0 ? 1 : -1; c.moveTo(ex - rx - 4, ey - ry - 4); c.lineTo(ex + rx + 4, ey - ry - 4); c.lineTo(ex + d * (rx + 4), ey - ry * (1 - 0.9 * p.brow)); c.closePath(); c.fill(); }
  c.restore();
  if (kind === 'half') { c.beginPath(); c.moveTo(ex - rx - 2, ey - ry + 2 * ry * p.lid); c.lineTo(ex + rx + 2, ey - ry + 2 * ry * p.lid); c.strokeStyle = INK; c.lineWidth = 6; c.lineCap = 'round'; c.stroke(); }
}
const EYE_C = '#140A18';

function catMouth(m, k) {
  c.strokeStyle = INK; c.lineWidth = 5; c.lineCap = 'round'; c.lineJoin = 'round';
  c.save(); c.translate(0, 30); c.scale(1, Math.max(0.05, k)); c.translate(0, -30);
  const dark = (fn) => { c.beginPath(); fn(); c.fillStyle = MOUTH; c.fill(); c.stroke(); };
  if (m === 'w') { c.beginPath(); c.moveTo(0, 28); c.quadraticCurveTo(-2, 42, -15, 39); c.moveTo(0, 28); c.quadraticCurveTo(2, 42, 15, 39); c.stroke(); }
  else if (m === 'smile') { dark(() => { c.moveTo(-24, 32); c.quadraticCurveTo(0, 76, 24, 32); c.quadraticCurveTo(0, 40, -24, 32); }); ellipse(0, 55, 10, 7, PINK); }
  else if (m === 'grin') { dark(() => { c.moveTo(-38, 30); c.quadraticCurveTo(0, 92, 38, 30); c.quadraticCurveTo(0, 40, -38, 30); }); ellipse(0, 64, 14, 9, PINK); [-20, 20].forEach(x => { c.beginPath(); c.moveTo(x - 6, 33); c.lineTo(x + 6, 33); c.lineTo(x, 45); c.closePath(); c.fillStyle = '#fff'; c.fill(); }); }
  else if (m === 'smirk') { c.beginPath(); c.moveTo(-12, 40); c.quadraticCurveTo(6, 46, 22, 28); c.stroke(); }
  else if (m === 'flat') { c.beginPath(); c.moveTo(-14, 40); c.lineTo(14, 40); c.stroke(); }
  else if (m === 'o') { dark(() => c.ellipse(0, 44, 8, 10, 0, 0, TAU)); }
  else if (m === 'O') { dark(() => c.ellipse(0, 52, 17, 22, 0, 0, TAU)); ellipse(0, 64, 9, 6, PINK); }
  else if (m === 'scream') { dark(() => c.ellipse(0, 58, 26, 32, 0, 0, TAU)); ellipse(0, 76, 14, 9, PINK); fillRR(-14, 28, 28, 7, 3, '#fff'); }
  else if (m === 'wavy') { c.beginPath(); for (let i = 0; i <= 8; i++) { const x = -20 + i * 5, y = 42 + (i % 2 ? -4 : 4); i ? c.lineTo(x, y) : c.moveTo(x, y); } c.stroke(); }
  else if (m === 'frown') { c.beginPath(); c.moveTo(-17, 48); c.quadraticCurveTo(0, 30, 17, 48); c.stroke(); }
  else if (m === 'wail') { dark(() => { c.moveTo(-30, 56); c.quadraticCurveTo(0, 18, 30, 56); c.quadraticCurveTo(0, 66, -30, 56); }); ellipse(0, 54, 11, 6, PINK); }
  else if (m === 'fangs') { dark(() => { c.moveTo(-26, 34); c.lineTo(26, 34); c.quadraticCurveTo(0, 64, -26, 34); }); [-13, 13].forEach(x => { c.beginPath(); c.moveTo(x - 7, 35); c.lineTo(x + 7, 35); c.lineTo(x, 50); c.closePath(); c.fillStyle = '#fff'; c.fill(); }); }
  else if (m === 'side') { c.beginPath(); c.moveTo(-10, 44); c.lineTo(16, 36); c.stroke(); }
  c.restore();
}

// draws the head centred at the origin; o.swap (0..1) closes eyes/mouth briefly while expressions change
function catHead(p, o = {}) {
  const t = o.t ?? 0, dog = !!o.dog, col = dog ? DOGC : { fur: FUR, furD: FUR_D, furL: FUR_L, cream: CREAM };
  const look = [o.lookX ?? 0.4, o.lookY ?? 0];
  if (!dog) { catEar(-1, p, col.fur, t); catEar(1, p, col.fur, t); }
  headPathC(p.poof); c.fillStyle = lg(0, -HRY, 0, HRY, [[0, col.furL], [0.55, col.fur], [1, col.furD]]); c.fill();
  c.save(); headPathC(p.poof); c.clip();
  if (!dog) [[-26, -HRY + 2, -0.15], [0, -HRY - 2, 0], [26, -HRY + 2, 0.15]].forEach(([x, y, r]) => at(x, y, 1, r, () => { c.beginPath(); c.moveTo(0, 0); c.lineTo(0, 30); c.strokeStyle = col.furD; c.lineWidth = 10; c.lineCap = 'round'; c.stroke(); }));
  else { ellipse(-46, -40, 16, 8, col.furD); ellipse(46, -40, 16, 8, col.furD); }
  ellipse(0, 38, dog ? 66 : 56, dog ? 46 : 38, col.cream);
  if (p.red > 0.01) { c.fillStyle = `rgba(239,48,48,${0.3 * p.red})`; c.fillRect(-200, -200, 400, 400); }
  if (p.ice > 0.01) { c.fillStyle = `rgba(140,215,255,${0.45 * p.ice})`; c.fillRect(-200, -200, 400, 400); }
  c.restore();
  headPathC(p.poof); c.strokeStyle = INK; c.lineWidth = 7; c.lineJoin = 'round'; c.stroke();
  if (dog) { dogEar(-1, p, col.furD, t); dogEar(1, p, col.furD, t); }
  if (p.blush > 0.01) [-1, 1].forEach(s => ellipse(s * 80, 30, 22, 12, `rgba(255,110,150,${0.55 * p.blush})`));
  if (p.bags > 0.01) [-1, 1].forEach(s => { c.beginPath(); c.arc(s * 46, 18, 17, 0.2 * Math.PI, 0.8 * Math.PI); c.strokeStyle = `rgba(110,40,80,${0.5 * p.bags})`; c.lineWidth = 5; c.stroke(); });
  const sw = o.swap ?? 1, blink = (((t + (o.seed || 0)) % 3.9) < 0.12) ? 0.08 : 1, open = blink * Math.max(0.08, sw);
  [-1, 1].forEach(s => eye(s * 46, -8, p, p.eye, open, look, t, s));
  if (Math.abs(p.brow) > 0.15 && p.eye !== 'dot') [-1, 1].forEach(s => {
    const inner = s * 18, outer = s * 66, yi = -46 + p.brow * 12, yo = -50 - p.brow * 6;
    withAlpha(clamp(Math.abs(p.brow) * 2), () => line(outer, yo, inner, yi, INK, 7));
  });
  if (dog) { ellipse(0, 18, 20, 14, INK); ellipse(-5, 13, 6, 3.5, 'rgba(255,255,255,0.6)'); c.beginPath(); c.moveTo(0, 30); c.lineTo(0, 36); c.strokeStyle = INK; c.lineWidth = 5; c.stroke(); }
  else { c.beginPath(); c.moveTo(-11, 16); c.quadraticCurveTo(0, 12, 11, 16); c.lineTo(0, 28); c.closePath(); c.fillStyle = PINK; c.fill(); c.strokeStyle = INK; c.lineWidth = 3.5; c.stroke(); }
  catMouth(p.mouth, sw);
  if (!dog) [-1, 1].forEach(s => { for (let i = 0; i < 3; i++) { c.beginPath(); c.moveTo(s * 62, 30 + i * 9); c.quadraticCurveTo(s * 100, 22 + i * 12, s * 136, 18 + i * 18); c.strokeStyle = 'rgba(18,12,28,0.75)'; c.lineWidth = 3; c.stroke(); } });
  if (o.headphones) { c.beginPath(); c.arc(0, -8, 124, Math.PI * 1.08, Math.PI * 1.92); c.strokeStyle = INK; c.lineWidth = 16; c.stroke(); fillRR(-142, -40, 36, 70, 14, INK); fillRR(106, -40, 36, 70, 14, INK); fillRR(-136, -30, 12, 50, 6, '#EF4444'); fillRR(124, -30, 12, 50, 6, '#EF4444'); }
}

function catFx(fx, a, t) {
  if (!fx || a <= 0.01) return;
  withAlpha(a, () => {
    if (fx === 'zzz') for (let i = 0; i < 3; i++) { const ph = (t * 0.55 + i / 3) % 1; withAlpha(Math.sin(ph * Math.PI), () => text('Z', 110 + ph * 90 + i * 8, -120 - ph * 130, { size: 44 + i * 14, font: F.cond, weight: '900', color: '#E9D5FF' })); }
    else if (fx === 'bang') at(150, -140, 1 + 0.08 * Math.sin(t * 14), 0.12, () => { text('!', 0, 0, { size: 120, font: F.cond, weight: '900', color: '#FF3B3B' }); text('!', 40, 10, { size: 86, font: F.cond, weight: '900', color: '#FFD23F' }); });
    else if (fx === 'sweat') [[118, -60, 0], [-122, -50, 0.5]].forEach(([x, y, o]) => { const ph = (t * 0.9 + o) % 1; withAlpha(1 - ph, () => { const yy = y + ph * 50; c.beginPath(); c.moveTo(x, yy - 22); c.quadraticCurveTo(x + 14, yy, x, yy + 10); c.quadraticCurveTo(x - 14, yy, x, yy - 22); c.fillStyle = '#7DD3FC'; c.fill(); c.strokeStyle = INK; c.lineWidth = 3; c.stroke(); }); });
    else if (fx === 'tears') [-46, 46].forEach((ex, i) => {
      c.beginPath(); c.moveTo(ex, 12); c.quadraticCurveTo(ex + (i ? 12 : -12), 60, ex + (i ? 8 : -8), 112); c.strokeStyle = 'rgba(125,211,252,0.9)'; c.lineWidth = 12; c.lineCap = 'round';
      c.setLineDash([16, 10]); c.lineDashOffset = -t * 80; c.stroke(); c.setLineDash([]);
      const ph = (t * 1.6 + i * 0.4) % 1; withAlpha(1 - ph, () => circle(ex + (i ? 10 : -10), 116 + ph * 80, 8, '#7DD3FC'));
    });
    else if (fx === 'steam') for (let i = 0; i < 6; i++) { const side = i % 2 ? 1 : -1, ph = (t * 1.3 + i / 6) % 1; withAlpha((1 - ph) * 0.85, () => circle(side * (120 + ph * 40), -60 - ph * 120, 12 + ph * 22, '#F1F5F9')); }
    else if (fx === 'q') { text('?', 140, -140 + Math.sin(t * 4) * 8, { size: 100, font: F.cond, weight: '900', color: '#C084FC' }); text('?', 196, -180 + Math.cos(t * 4) * 8, { size: 62, font: F.cond, weight: '900', color: '#E9D5FF' }); }
    else if (fx === 'sparkle') for (let i = 0; i < 6; i++) { const an = t * 2.2 + i / 6 * TAU; star(Math.cos(an) * 170, -30 + Math.sin(an) * 130, 12 + 5 * Math.sin(t * 9 + i), i % 2 ? '#FDE68A' : '#4ADE80'); }
    else if (fx === 'ice') { c.fillStyle = 'rgba(224,242,254,0.95)'; for (let i = 0; i < 7; i++) { const x = -84 + i * 28, y = -88 - Math.abs(i - 3) * 4; c.beginPath(); c.moveTo(x - 8, y); c.lineTo(x + 8, y); c.lineTo(x, y + 20 + (i % 2) * 12); c.closePath(); c.fill(); } }
  });
}

// bust used inside the scene cards wherever "you" (or another character) appears
function dev(x, y, s, o = {}) {
  const p = catMood(o.mood || 'neutral'); if (o.bags) p.bags = 1;
  const dog = !!o.dog, col = dog ? DOGC : { fur: FUR, furD: FUR_D, cream: CREAM };
  c.save(); c.translate(x, y); c.scale(s * 0.8, s * 0.8); c.rotate(o.rot || 0);
  if (o.body !== false) {
    c.beginPath(); c.moveTo(-190, 480); c.bezierCurveTo(-186, 230, -120, 110, 0, 104); c.bezierCurveTo(120, 110, 186, 230, 190, 480); c.closePath();
    c.fillStyle = lg(0, 100, 0, 480, [[0, col.fur], [1, col.furD]]); c.fill(); c.strokeStyle = INK; c.lineWidth = 7; c.stroke();
    ellipse(0, 300, 92, 170, col.cream);
    if (o.tie) { fillRR(-62, 100, 124, 40, 14, '#F8FAFC'); c.beginPath(); c.moveTo(0, 120); c.lineTo(-18, 150); c.lineTo(0, 270); c.lineTo(18, 150); c.closePath(); c.fillStyle = o.tie; c.fill(); c.strokeStyle = INK; c.lineWidth = 4; c.stroke(); }
    else if (!dog) { line(-30, 118, -8, 240, '#38BDF8', 6); line(30, 118, 8, 240, '#38BDF8', 6); at(0, 270, 1, 0.06, () => { fillRR(-34, -24, 68, 48, 8, '#fff'); text('DEV', 0, 10, { size: 22, font: F.cond, weight: '900', color: '#0F172A', align: 'center' }); }); }
  }
  catHead(p, { t: o.t, dog, lookX: o.look || 0, headphones: o.headphones });
  if (o.sweat) catFx('sweat', 1, o.t || 0);
  c.restore();
}

// ---------------- the cat's script ----------------
const ACTS = {
  'in-1': [['happy', 'wave']], 'in-2': [['confused', 'shrug']], 'in-3': [['deadpan', 'chin']],
  'in-4': [['nervous', 'idle'], ['shock', 'headHands', /exit/]],
  'v1-1': [['tired', 'mug']], 'v1-2': [['happy', 'type'], ['sleep', 'sleep', /crawled/]],
  'v1-3': [['sleep', 'sleep']], 'v1-4': [['sleep', 'sleep'], ['shock', 'headHands', /better/]],
  'v1-5': [['smug', 'chin']], 'v1-6': [['smug', 'chin'], ['confused', 'shrug', /what/]],
  'v1-7': [['sleep', 'sleep'], ['smug', 'thumbs', /green/]], 'v1-8': [['smug', 'point'], ['deadpan', 'slump', /screens/]],
  'p1-1': [['deadpan', 'idle'], ['deadpan', 'facepalm', /ten-x/]], 'p1-2': [['shock', 'headHands'], ['panic', 'flail', /work/]],
  'p1-3': [['tired', 'type']], 'p1-4': [['tired', 'type'], ['angry', 'fist', /wrong/]],
  'v2-1': [['deadpan', 'chin']], 'v2-2': [['deadpan', 'chin'], ['sad', 'shrug', /tokens/]],
  'v2-3': [['nervous', 'type']], 'v2-4': [['nervous', 'type'], ['angry', 'fist', /hire/]],
  'v2-5': [['sad', 'slump']], 'v2-6': [['confused', 'shrug']],
  'v2-7': [['tired', 'type']], 'v2-8': [['happy', 'thumbs']],
  'p2-1': [['neutral', 'idle'], ['angry', 'fist', /dead/]], 'p2-2': [['smug', 'chin'], ['happy', 'point', /head/]],
  'p2-3': [['tired', 'type']], 'p2-4': [['tired', 'type'], ['angry', 'facepalm', /wrong/]],
  'b-1': [['sad', 'chin']], 'b-2': [['nervous', 'type']],
  'b-3': [['scared', 'cower'], ['frozen', 'freeze', /froze/]], 'b-4': [['frozen', 'freeze']], 'b-5': [['confused', 'shrug']],
  'x-1': [['shock', 'headHands']], 'x-2': [['confused', 'chin']], 'x-3': [['sad', 'slump'], ['cry', 'facepalm', /career/]],
  'c3-1': [['sad', 'slump']], 'c3-2': [['sad', 'shrug']], 'c3-3': [['shock', 'headHands']], 'c3-4': [['shock', 'cower'], ['panic', 'flail', /bot/]],
  'c3-5': [['angry', 'fist']], 'c3-6': [['deadpan', 'chin']],
  'o-1': [['sleep', 'sleep'], ['shock', 'phone', /breaks/]], 'o-2': [['tired', 'phone']], 'o-3': [['deadpan', 'phone']], 'o-4': [['smug', 'thumbs']],
};
const CHORUS_TAIL = {
  7: [['sad', 'shrug']], 8: [['manic', 'type']], 9: [['manic', 'type']],
  10: [['scared', 'flail'], ['manic', 'run', /shipping/]], 11: [['happy', 'cheer'], ['nervous', 'chin', /money/]],
};
for (const ch of ['c1', 'c2']) Object.assign(ACTS, {
  [`${ch}-1`]: [['happy', 'thumbs']], [`${ch}-2`]: [['happy', 'thumbs'], ['panic', 'flail', /deleted/]],
  [`${ch}-3`]: [['panic', 'headHands']], [`${ch}-4`]: [['cry', 'pray']],
  [`${ch}-5`]: [['shock', 'cower']], [`${ch}-6`]: [['deadpan', 'slump'], ['cry', 'facepalm', /hope/i]],
});
for (const ch of ['c1', 'c2', 'c3']) for (const k in CHORUS_TAIL) ACTS[`${ch}-${k}`] = CHORUS_TAIL[k];

const HKEYS = [{ t: -1, mood: 'happy', pose: 'wave' }];
for (const l of LINES) for (const [mood, pose, re] of (ACTS[l.id] || [])) HKEYS.push({ t: re ? wr(l.id, re) - 0.08 : l.start - 0.15, mood, pose });
HKEYS.sort((a, b) => a.t - b.t);

// Poses: paw targets in body space (x toward the lyric card, y up from the feet), plus body modifiers.
const CIDLE = { pN: [60, -98], pF: [-60, -98], kN: '', kF: '', crouch: 0, lean: 0, hd: 0, tilt: 0, hop: 0, flail: 0, wave: 0, type: 0, run: 0, stomp: 0, lx: 0.4, ly: 0 };
const cz = o => ({ ...CIDLE, ...o });
const POSES = {
  idle: cz({}),
  type: cz({ pN: [150, -102], pF: [100, -98], type: 1, lean: 8, hd: 4, lx: 0.9, ly: 0.6 }),
  mug: cz({ pN: [54, -176], kN: 'mug', lx: 0.2, ly: 0.2 }),
  chin: cz({ pN: [34, -174], pF: [-54, -110], tilt: -0.1, lx: 0.8, ly: -0.5 }),
  headHands: cz({ pN: [96, -214], pF: [-96, -214], kN: 'open', kF: 'open', lx: 0, ly: 0 }),
  facepalm: cz({ pN: [40, -246], tilt: 0.12, hd: 8 }),
  shrug: cz({ pN: [118, -178], pF: [-118, -178], kN: 'open', kF: 'open', tilt: 0.14, lx: 0 }),
  thumbs: cz({ pN: [108, -198], kN: 'thumb', lx: 0.6 }),
  point: cz({ pN: [156, -172], kN: 'point', lean: 10, lx: 1 }),
  phone: cz({ pN: [74, -168], kN: 'phone', hd: 8, tilt: 0.08, lx: 0.8, ly: 0.7 }),
  cheer: cz({ pN: [104, -262], pF: [-104, -262], kN: 'open', kF: 'open', hop: 1, lx: 0 }),
  pray: cz({ pN: [12, -162], pF: [-12, -162], hd: 8, tilt: -0.05, ly: -0.6, lx: 0 }),
  wave: cz({ pN: [116, -250], kN: 'open', wave: 1, lx: 0.2 }),
  slump: cz({ pN: [58, -66], pF: [-58, -66], crouch: 0.22, hd: 22, tilt: 0.14, ly: 0.6 }),
  sleep: cz({ pN: [42, -108], pF: [-42, -108], crouch: 0.12, hd: 18, tilt: 0.32 }),
  flail: cz({ pN: [116, -262], pF: [-116, -262], kN: 'open', kF: 'open', flail: 1, hop: 0.35, lx: 0 }),
  run: cz({ pN: [84, -130], pF: [-84, -140], run: 1, lean: 12, lx: 1 }),
  fist: cz({ pN: [104, -240], kN: 'fist', pF: [-72, -140], kF: 'fist', stomp: 1 }),
  cower: cz({ pN: [52, -196], pF: [-52, -196], kN: 'open', kF: 'open', crouch: 0.34, hd: 26, lx: 0.7 }),
  freeze: cz({ pN: [70, -100], pF: [-70, -100] }),
};
const CNUM = Object.keys(CIDLE).filter(k => typeof CIDLE[k] === 'number');
function blendC(A, B, m) {
  const o = { pN: A.pN.map((v, i) => lerp(v, B.pN[i], m)), pF: A.pF.map((v, i) => lerp(v, B.pF[i], m)) };
  CNUM.forEach(k => { o[k] = lerp(A[k], B[k], m); });
  o.kN = m < 0.5 ? A.kN : B.kN; o.kF = m < 0.5 ? A.kF : B.kF;
  return o;
}
let HERO_FORCE = null;
function petState(t) {
  if (HERO_FORCE) { const m = catMood(HERO_FORCE.mood); return { p: m, m: 1, sw: 1, fxA: m.fx, fxB: m.fx, z: POSES[HERO_FORCE.pose] }; }
  let i = 0; while (i + 1 < HKEYS.length && HKEYS[i + 1].t <= t) i++;
  const cur = HKEYS[i], prev = HKEYS[Math.max(0, i - 1)], m = i ? easeInOut((t - cur.t) / 0.32) : 1;
  const A = catMood(prev.mood), B = catMood(cur.mood), p = {};
  NUMC.forEach(k => { p[k] = lerp(A[k], B[k], m); });
  const flip = A.eye !== B.eye || A.mouth !== B.mouth, raw = clamp((t - cur.t) / 0.32);
  p.eye = raw < 0.5 ? A.eye : B.eye; p.mouth = raw < 0.5 ? A.mouth : B.mouth;
  const sw = flip && i ? clamp(Math.abs(raw - 0.5) * 4) : 1;
  return { p, m, sw, fxA: A.fx, fxB: B.fx, z: blendC(POSES[prev.pose], POSES[cur.pose], m) };
}

// ---------------- where the cat is ----------------
// Each shot has a spot; when the layout changes it hops there (or poofs if it is far), otherwise it stays put.
function petPlace(t) {
  let i = 0; while (i + 1 < SCENES.length && SCENES[i + 1].start <= t) i++;
  const S = SCENES[i], sp = catSpot(S, t), pv = i ? catSpot(SCENES[i - 1], t) : sp;
  const dx = sp.x - pv.x, dy = sp.y - pv.y, dist = Math.hypot(dx, dy), t0 = S.start + 0.06;
  const out = { x: sp.x, y: sp.y, s: sp.s, dir: sp.dir, air: 0, sq: 0, vis: 1, puff: null };
  if (i === 0) { const k = clamp((t - 0.35) / 0.5); out.vis = backOut(k, 2); out.puff = k > 0 && k < 1 ? { x: sp.x, y: sp.y - 120 * sp.s, k } : null; return out; }
  if (dist < 8) { out.sq = landSquash(t - S.start - 10); return out; }
  if (dist < 1000) {
    const D = 0.48 + dist / 3200, k = (t - t0) / D;
    if (k < 0) { out.x = pv.x; out.y = pv.y; out.s = pv.s; out.dir = pv.dir; return out; }
    if (k < 1) {
      const e = easeInOut(k); out.x = lerp(pv.x, sp.x, e); out.y = lerp(pv.y, sp.y, e); out.s = lerp(pv.s, sp.s, e);
      out.air = Math.sin(Math.PI * k) * (150 + Math.abs(dy) * 0.35 + dist * 0.05); out.dir = Math.abs(dx) > 30 ? Math.sign(dx) : sp.dir;
      out.sq = k < 0.12 ? -0.6 * (1 - k / 0.12) : 0.35 * Math.sin(Math.PI * k) * -0.4;
      return out;
    }
    out.sq = landSquash(t - t0 - D); return out;
  }
  const k = (t - t0) / 0.6;
  if (k < 0.45) { const e = easeIn(clamp(k / 0.45)); out.x = pv.x; out.y = pv.y; out.s = pv.s; out.dir = pv.dir; out.vis = 1 - e; out.puff = k > 0.25 ? { x: pv.x, y: pv.y - 120 * pv.s, k: (k - 0.25) / 0.5 } : null; return out; }
  if (k < 1.2) { const e = clamp((k - 0.45) / 0.4); out.vis = backOut(e, 2.2); out.puff = { x: sp.x, y: sp.y - 120 * sp.s, k: clamp((k - 0.45) / 0.6) }; }
  return out;
}
const landSquash = d => d < 0 || d > 0.4 ? 0 : Math.exp(-d * 9) * Math.cos(d * 26) * 0.7;

function puff(x, y, k, s) {
  if (k <= 0 || k >= 1) return;
  for (let i = 0; i < 9; i++) {
    const a = i / 9 * TAU + 0.3, r = 40 + easeOut(k) * 150, rr0 = (34 + hash(i, 2) * 24) * (1 - k * 0.7);
    withAlpha(1 - k, () => { circle(x + Math.cos(a) * r * s, y + Math.sin(a) * r * 0.7 * s, rr0 * s, '#FFF7E8'); ring(x + Math.cos(a) * r * s, y + Math.sin(a) * r * 0.7 * s, rr0 * s, INK, 4); });
  }
}

function limb(x0, y0, x1, y1, w, col, bend) {
  const mx = (x0 + x1) / 2, my = (y0 + y1) / 2, dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy) || 1;
  const qx = mx - dy / L * bend, qy = my + dx / L * bend;
  c.beginPath(); c.moveTo(x0, y0); c.quadraticCurveTo(qx, qy, x1, y1); c.lineCap = 'round';
  c.strokeStyle = INK; c.lineWidth = w + 11; c.stroke(); c.strokeStyle = col; c.lineWidth = w; c.stroke();
}
function paw(x, y, kind, side, t, dir) {
  if (kind === 'mug') mug(x + 36, y + 4, 0.48, t);
  if (kind === 'phone') at(x + 18, y - 30, 0.85, -0.12, () => { fillRR(-24, -46, 48, 84, 10, INK); fillRR(-19, -41, 38, 72, 7, '#38BDF8'); fillRR(-19, -41, 38, 18, 7, 'rgba(255,255,255,0.45)'); glow('rgba(56,189,248,0.9)', 24); fillRR(-19, -41, 38, 72, 7, 'rgba(56,189,248,0.2)'); noGlow(); });
  if (kind === 'thumb') { fillRR(x - 8, y - 46, 16, 32, 8, FUR); rr(x - 8, y - 46, 16, 32, 8); c.strokeStyle = INK; c.lineWidth = 5; c.stroke(); }
  if (kind === 'point') { fillRR(x + 6, y - 8, 42, 16, 8, FUR); rr(x + 6, y - 8, 42, 16, 8); c.strokeStyle = INK; c.lineWidth = 5; c.stroke(); }
  const r = kind === 'fist' ? 23 : 21;
  circle(x, y, r, FUR); ring(x, y, r, INK, 5);
  if (kind === 'open') { ellipse(x, y + 5, 8, 6, PINK); [-9, 0, 9].forEach(d => circle(x + d, y - 8 - (d ? 0 : 3), 3.8, PINK)); }
  else { line(x - 6, y - r + 3, x - 6, y - r + 10, INK, 3); line(x + 6, y - r + 3, x + 6, y - r + 10, INK, 3); }
}

function laptopBox(t, P, k, dir) {
  if (k < 0.02) return;
  c.save(); c.globalAlpha *= clamp(k * 1.6); c.translate(0, (1 - k) * 60);
  fillRR(30, -92, 230, 92, 6, '#C98E52'); rr(30, -92, 230, 92, 6); c.strokeStyle = INK; c.lineWidth = 6; c.stroke();
  line(30, -70, 260, -70, 'rgba(18,12,28,0.25)', 4); fillRR(110, -56, 70, 16, 4, 'rgba(18,12,28,0.18)');
  at(145, -16, 1, 0, () => { c.scale(dir, 1); text('FRAGILE', 0, 0, { size: 22, font: F.cond, weight: '900', color: 'rgba(120,40,20,0.7)', align: 'center' }); });
  fillRR(60, -108, 190, 18, 6, '#CBD5E1'); rr(60, -108, 190, 18, 6); c.strokeStyle = INK; c.lineWidth = 5; c.stroke();
  c.restore();
}
function laptopLid(t, P, k) {
  if (k < 0.02) return;
  c.save(); c.globalAlpha *= clamp(k * 1.6); c.translate(0, (1 - k) * 60);
  const g = c.createRadialGradient(170, -190, 0, 170, -190, 130); g.addColorStop(0, rgba(P.a, 0.3)); g.addColorStop(1, rgba(P.a, 0));
  c.fillStyle = g; c.fillRect(30, -330, 280, 280);
  c.beginPath(); c.moveTo(232, -104); c.lineTo(252, -104); c.lineTo(282, -238); c.lineTo(262, -242); c.closePath(); c.fillStyle = '#94A3B8'; c.fill(); c.strokeStyle = INK; c.lineWidth = 6; c.lineJoin = 'round'; c.stroke();
  line(236, -110, 263, -232, rgba(mixc(P.a, '#ffffff', 0.4)), 5);
  c.restore();
}

function pet(t, P) {
  const st = petState(t), p = st.p, z = st.z, pl = petPlace(t);
  if (pl.puff) puff(pl.puff.x, pl.puff.y, pl.puff.k, pl.s);
  if (pl.vis <= 0.01) return;
  const e = feat('energy', t), dir = pl.dir;
  const hopY = z.hop * Math.abs(Math.sin(Math.PI * (t - PHASE) / (2 * BEAT))) * 46;
  const shk = p.shake * Math.sin(t * 42) * 4 + p.shiver * Math.sin(t * 70) * 3;
  const crouch = z.crouch, bh = 170 * (1 - crouch * 0.5) * (1 + Math.sin(t * 2.6) * 0.012);
  const bob = kick(t, 8, 2) * 4 * e;
  const sqY = 1 - pl.sq * 0.2, sqX = 1 + pl.sq * 0.14;
  c.save(); c.translate(pl.x + shk, pl.y - pl.air);
  ellipse(0, 4 + pl.air, 96 * pl.s * clamp(1 - pl.air / 500, 0.3, 1), 15 * pl.s, `rgba(18,12,28,${0.35 * clamp(1 - pl.air / 500, 0.2, 1)})`);
  c.scale(pl.s * pl.vis * sqX, pl.s * pl.vis * sqY); c.translate(0, -hopY); c.scale(dir, 1);
  const halo = c.createRadialGradient(0, -230, 0, 0, -230, 300); halo.addColorStop(0, 'rgba(255,248,230,0.3)'); halo.addColorStop(1, 'rgba(255,248,230,0)');
  c.fillStyle = halo; c.fillRect(-320, -540, 640, 560);

  // tail
  const ts = Math.sin(t * (2 + p.tail * 2.2)) * (0.35 + p.tail * 0.25), tw = 26 + p.poof * 14;
  c.beginPath(); c.moveTo(-52, -36); c.bezierCurveTo(-150, -30 + ts * 20, -150 + ts * 30, -150, -110 + ts * 60, -196);
  c.lineCap = 'round'; c.strokeStyle = INK; c.lineWidth = tw + 12; c.stroke(); c.strokeStyle = FUR; c.lineWidth = tw; c.stroke();
  c.beginPath(); c.moveTo(-148 + ts * 48, -168); c.lineTo(-110 + ts * 60, -196); c.strokeStyle = FUR_D; c.lineWidth = tw * 0.8; c.stroke();

  // feet
  const runPh = t * 16;
  [-1, 1].forEach(s => {
    let fx = s * 38, fy = -6;
    if (z.run > 0.02) { const sn = Math.sin(runPh + (s > 0 ? 0 : Math.PI)); fx += sn * 26 * z.run; fy -= Math.max(0, sn) * 34 * z.run; }
    if (s > 0 && z.stomp > 0.02) fy -= Math.abs(Math.sin(t * 9)) * 30 * z.stomp;
    ellipse(fx + s * 6, fy, 34, 18, INK); ellipse(fx + s * 6, fy - 1, 29, 14, FUR); line(fx + s * 6 - 6, fy - 8, fx + s * 6 - 6, fy - 2, INK, 3); line(fx + s * 6 + 6, fy - 8, fx + s * 6 + 6, fy - 2, INK, 3);
  });

  // body
  const ln = z.lean;
  c.save(); c.translate(0, 0); c.transform(1, 0, -ln / 300, 1, 0, 0);
  c.beginPath(); c.moveTo(-60, -8); c.bezierCurveTo(-90, -50, -76, -bh + 14, -38, -bh); c.quadraticCurveTo(0, -bh - 12, 38, -bh);
  c.bezierCurveTo(76, -bh + 14, 90, -50, 60, -8); c.quadraticCurveTo(0, 6, -60, -8); c.closePath();
  c.fillStyle = lg(0, -bh, 0, 0, [[0, FUR_L], [1, FUR_D]]); c.fill(); c.strokeStyle = INK; c.lineWidth = 7; c.lineJoin = 'round'; c.stroke();
  ellipse(0, -bh * 0.42, 40, bh * 0.3, CREAM);
  line(-22, -bh + 6, -6, -bh * 0.5, '#38BDF8', 5); line(22, -bh + 6, 6, -bh * 0.5, '#38BDF8', 5);
  at(0, -bh * 0.42, 1, 0.08 + Math.sin(t * 2) * 0.05, () => { fillRR(-24, -16, 48, 34, 6, '#fff'); rr(-24, -16, 48, 34, 6); c.strokeStyle = INK; c.lineWidth = 3; c.stroke(); c.scale(dir, 1); text('DEV', 0, 8, { size: 17, font: F.cond, weight: '900', color: '#0F172A', align: 'center' }); });
  c.restore();

  // head
  const hx = ln * 0.6, hy = -bh - 76 + z.hd + bob;
  const tilt = z.tilt + p.tilt + Math.sin(t * 1.3) * 0.03;
  c.save(); c.translate(hx, hy); c.rotate(tilt);
  catHead(p, { t, lookX: z.lx, lookY: z.ly, swap: st.sw, seed: 0.7 });
  c.scale(dir, 1); catFx(st.fxA, st.fxA === st.fxB ? 1 : 1 - st.m, t); if (st.fxB !== st.fxA) catFx(st.fxB, st.m, t);
  c.restore();

  laptopBox(t, P, z.type, dir);
  // arms
  [[z.pN, z.kN, 1], [z.pF, z.kF, -1]].forEach(([pp, kind, s]) => {
    let [x, y] = pp; y += 170 - bh;
    const f0 = s > 0 ? 0 : 2.1;
    x += Math.sin(t * 13 + f0) * 26 * z.flail + (s > 0 ? Math.sin(t * 10) * 22 * z.wave : 0);
    y += Math.cos(t * 11 + f0) * 30 * z.flail + Math.sin(t * 30 + s * 2) * 6 * z.type - Math.abs(Math.sin(t * 15 + s)) * 8 * z.type;
    if (z.run > 0.02) { const sn = Math.sin(runPh + (s > 0 ? Math.PI : 0)); x += sn * 24 * z.run; y += sn * 10 * z.run; }
    const sx = s * 46 + ln * 0.35, sy = -bh + 24;
    limb(sx, sy, x, y, 28, FUR, s * 10);
    paw(x, y, kind, s, t, dir);
  });
  laptopLid(t, P, z.type);
  c.restore();
}
