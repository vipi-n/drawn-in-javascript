// The software engineer: one consistent man (beard, glasses, hoodie) drawn everywhere "you" appears,
// plus the full-body hero at his desk who acts out every lyric line with moods, poses and lip sync.
const SKIN = '#D9A27A', HAIR = '#2A1C15', HOOD = '#2E3A52';
const MOODS = {
  neutral: { brow: 0, tilt: 0, open: 1, pupil: 1, mouth: 'flat' },
  happy: { brow: -6, tilt: -0.08, open: 0.85, pupil: 1.05, mouth: 'smile', blush: 0.7 },
  manic: { brow: -14, tilt: -0.15, open: 1.3, pupil: 0.6, mouth: 'grin', blush: 0.5, fx: 'sparkle', shake: 0.35 },
  smug: { brow: -3, tilt: 0.14, asym: -10, open: 0.62, pupil: 1, mouth: 'smirk', blush: 0.2 },
  tired: { brow: 5, tilt: -0.12, open: 0.42, pupil: 1, mouth: 'flat', bags: 1 },
  sleep: { brow: 6, tilt: 0, open: 0, pupil: 1, mouth: 'o', bags: 0.6, fx: 'zzz' },
  shock: { brow: -16, tilt: -0.05, open: 1.4, pupil: 0.5, mouth: 'o', fx: 'bang' },
  scared: { brow: -10, tilt: -0.4, open: 1.25, pupil: 0.55, mouth: 'wavy', fx: 'sweat', shake: 0.3 },
  nervous: { brow: -5, tilt: -0.32, open: 1.05, pupil: 0.8, mouth: 'wavy', fx: 'sweat' },
  sad: { brow: 3, tilt: -0.45, open: 0.75, pupil: 1, mouth: 'frown' },
  cry: { brow: 2, tilt: -0.5, open: 0.32, pupil: 1, mouth: 'cry', fx: 'tears', blush: 0.4 },
  panic: { brow: -18, tilt: -0.4, open: 1.45, pupil: 0.42, mouth: 'scream', fx: 'sweat', shake: 1 },
  angry: { brow: 8, tilt: 0.5, open: 0.8, pupil: 0.8, mouth: 'teeth', red: 1, fx: 'steam' },
  confused: { brow: -4, tilt: 0.1, asym: -16, open: 1, pupil: 0.9, mouth: 'side', fx: 'q' },
  deadpan: { brow: 3, tilt: 0, open: 0.5, pupil: 1, mouth: 'flat' },
  frozen: { brow: -6, tilt: -0.2, open: 1.1, pupil: 0.6, mouth: 'wavy', ice: 1, shiver: 1, fx: 'ice' },
};
const NUMK = ['brow', 'tilt', 'asym', 'open', 'pupil', 'blush', 'bags', 'red', 'ice', 'shake', 'shiver'];
const moodP = m => { const s = MOODS[m] || MOODS.neutral, o = { mouth: s.mouth, fx: s.fx || null }; NUMK.forEach(k => { o[k] = s[k] ?? 0; }); return o; };

// ---------------- head ----------------
function headPath() {
  c.beginPath(); c.moveTo(0, -112);
  c.bezierCurveTo(60, -112, 90, -72, 88, -10); c.bezierCurveTo(88, 50, 62, 98, 0, 106);
  c.bezierCurveTo(-62, 98, -88, 50, -88, -10); c.bezierCurveTo(-90, -72, -60, -112, 0, -112); c.closePath();
}
function drawHead(p, o = {}) {
  const t = o.t ?? 0, skin = o.skin || SKIN, hair = o.hair || HAIR, dark = rgba(mixc(skin, '#3B1F14', 0.35));
  if (o.headphones) { c.beginPath(); c.arc(0, -10, 112, Math.PI * 1.06, Math.PI * 1.94); c.strokeStyle = '#111827'; c.lineWidth = 16; c.stroke(); }
  // ears
  ellipse(-90, 4, 16, 24, skin); ellipse(90, 4, 16, 24, skin);
  ellipse(-90, 4, 7, 13, dark); ellipse(90, 4, 7, 13, dark);
  headPath(); c.fillStyle = lg(-60, -110, 70, 110, [[0, rgba(mixc(skin, '#ffffff', 0.12))], [1, rgba(mixc(skin, '#5B2E1A', 0.18))]]); c.fill();
  if (p.red > 0.01) { headPath(); c.fillStyle = `rgba(239,68,68,${0.28 * p.red})`; c.fill(); }
  if (p.ice > 0.01) { headPath(); c.fillStyle = `rgba(125,211,252,${0.42 * p.ice})`; c.fill(); }
  if (o.beard !== false) {
    c.beginPath(); c.moveTo(-88, -6);
    c.bezierCurveTo(-88, 50, -62, 100, 0, 108); c.bezierCurveTo(62, 100, 88, 50, 88, -6);
    c.bezierCurveTo(82, 30, 66, 44, 46, 46); c.bezierCurveTo(30, 40, 14, 35, 0, 37);
    c.bezierCurveTo(-14, 35, -30, 40, -46, 46); c.bezierCurveTo(-66, 44, -82, 30, -88, -6); c.closePath();
    c.fillStyle = rgba(hair, 0.93); c.fill();
  }
  // blush
  if (p.blush > 0.01) { ellipse(-56, 28, 18, 10, `rgba(244,114,182,${0.35 * p.blush})`); ellipse(56, 28, 18, 10, `rgba(244,114,182,${0.35 * p.blush})`); }
  // nose
  c.beginPath(); c.moveTo(-3, -2); c.quadraticCurveTo(-13, 24, -3, 29); c.quadraticCurveTo(4, 32, 11, 27);
  c.strokeStyle = dark; c.lineWidth = 4; c.lineCap = 'round'; c.stroke();
  // eyes
  const blink = (t % 3.7) < 0.11 ? 0.1 : 1, open = p.open * blink, ey = -8;
  const lx = (o.lookX ?? 0) * 5, ly = (o.lookY ?? 0) * 4;
  [-34, 34].forEach(ex => {
    if (p.bags > 0.01) { c.beginPath(); c.arc(ex, ey + 14, 14, 0.15 * Math.PI, 0.85 * Math.PI); c.strokeStyle = `rgba(110,50,70,${0.45 * p.bags})`; c.lineWidth = 5; c.stroke(); }
    if (open < 0.14) { c.beginPath(); c.arc(ex, ey - 2, 12, 0.15 * Math.PI, 0.85 * Math.PI); c.strokeStyle = '#2A1810'; c.lineWidth = 5; c.stroke(); return; }
    const ry = 12 * open;
    ellipse(ex, ey, 16, ry, '#FFFFFF');
    c.save(); c.beginPath(); c.ellipse(ex, ey, 16, ry, 0, 0, TAU); c.clip();
    circle(ex + lx, ey + ly, 8 * p.pupil + 1, '#3B2416'); circle(ex + lx, ey + ly, 4.5 * p.pupil, '#0B0604');
    circle(ex + lx + 3, ey + ly - 3, 2.6, '#fff');
    c.restore();
    c.beginPath(); c.ellipse(ex, ey, 16, ry, 0, Math.PI * 1.05, Math.PI * 1.95); c.strokeStyle = '#2A1810'; c.lineWidth = 3.5; c.stroke();
  });
  // glasses
  if (o.glasses !== false) {
    [-34, 34].forEach(ex => {
      rr(ex - 29, ey - 22, 58, 44, 15); c.fillStyle = 'rgba(190,225,255,0.08)'; c.fill();
      c.strokeStyle = '#141414'; c.lineWidth = 6; c.stroke();
      line(ex - 16, ey - 13, ex - 6, ey - 3, 'rgba(255,255,255,0.35)', 3);
    });
    line(-5, ey - 9, 5, ey - 9, '#141414', 5); line(-63, ey - 10, -86, ey - 4, '#141414', 5); line(63, ey - 10, 86, ey - 4, '#141414', 5);
  }
  // brows
  [-34, 34].forEach((ex, i) => {
    const by = ey - 34 + p.brow + (i ? p.asym : 0), inner = i ? ex - 20 : ex + 20, outer = i ? ex + 20 : ex - 20;
    c.beginPath(); c.moveTo(outer, by - p.tilt * 15); c.quadraticCurveTo(ex, by - 5 - p.tilt * 2, inner, by + p.tilt * 15);
    c.strokeStyle = hair; c.lineWidth = 10; c.lineCap = 'round'; c.stroke();
  });
  // mouth
  const lip = '#5A1C17', my = 64;
  const talk = o.talk || 0;
  if (talk > 0.05) {
    const w = p.mouth === 'smile' || p.mouth === 'grin' ? 26 : 22, h = 5 + 22 * talk;
    c.save(); c.beginPath(); c.ellipse(0, my + 2, w, h / 2 + 3, 0, 0, TAU); c.fillStyle = lip; c.fill(); c.clip();
    c.fillStyle = '#F8FAFC'; c.fillRect(-w, my + 2 - h / 2 - 3, w * 2, 7);
    ellipse(0, my + 2 + h / 2, w * 0.6, 7, '#E06C75'); c.restore();
  } else {
    c.strokeStyle = lip; c.fillStyle = lip; c.lineWidth = 6; c.lineCap = 'round';
    const m = p.mouth;
    if (m === 'flat') line(-16, my, 16, my, lip, 6);
    else if (m === 'smile') { c.beginPath(); c.arc(0, my - 16, 22, 0.2 * Math.PI, 0.8 * Math.PI); c.stroke(); }
    else if (m === 'grin') { c.save(); c.beginPath(); c.moveTo(-28, my - 8); c.quadraticCurveTo(0, my + 34, 28, my - 8); c.closePath(); c.fill(); c.clip(); c.fillStyle = '#fff'; c.fillRect(-30, my - 10, 60, 10); c.restore(); }
    else if (m === 'frown') { c.beginPath(); c.arc(0, my + 18, 20, 1.2 * Math.PI, 1.8 * Math.PI); c.stroke(); }
    else if (m === 'o') ellipse(0, my + 2, 10, 13, lip);
    else if (m === 'scream') { c.save(); c.beginPath(); c.ellipse(0, my + 6, 22, 28, 0, 0, TAU); c.fill(); c.clip(); c.fillStyle = '#fff'; c.fillRect(-24, my - 24, 48, 9); ellipse(0, my + 28, 14, 9, '#E06C75'); c.restore(); }
    else if (m === 'wavy') { c.beginPath(); for (let i = 0; i <= 8; i++) { const x = -20 + i * 5, y = my + (i % 2 ? -4 : 4); i ? c.lineTo(x, y) : c.moveTo(x, y); } c.lineWidth = 5; c.stroke(); }
    else if (m === 'teeth') { fillRR(-24, my - 10, 48, 22, 8, '#F8FAFC'); rr(-24, my - 10, 48, 22, 8); c.lineWidth = 4; c.stroke(); for (let i = -1; i <= 1; i++) line(i * 12, my - 10, i * 12, my + 12, lip, 2); line(-24, my + 1, 24, my + 1, lip, 2); }
    else if (m === 'smirk') { c.beginPath(); c.moveTo(-16, my + 2); c.quadraticCurveTo(4, my + 8, 20, my - 8); c.stroke(); }
    else if (m === 'side') { c.beginPath(); c.moveTo(-10, my + 4); c.lineTo(18, my - 2); c.stroke(); }
    else if (m === 'cry') { c.beginPath(); c.moveTo(-22, my + 10); c.quadraticCurveTo(0, my - 16, 22, my + 10); c.quadraticCurveTo(0, my + 2, -22, my + 10); c.fill(); }
  }
  // hair
  c.beginPath(); c.moveTo(-92, 4);
  c.bezierCurveTo(-104, -60, -86, -120, -30, -130); c.bezierCurveTo(10, -150, 74, -142, 94, -100);
  c.bezierCurveTo(106, -76, 100, -40, 92, 4); c.bezierCurveTo(86, -30, 78, -50, 62, -60);
  c.bezierCurveTo(30, -66, 0, -78, -24, -68); c.bezierCurveTo(-50, -62, -76, -50, -84, -20); c.bezierCurveTo(-88, -10, -90, -4, -92, 4); c.closePath();
  c.fillStyle = lg(-60, -140, 60, -40, [[0, rgba(mixc(hair, '#ffffff', 0.15))], [1, hair]]); c.fill();
  c.beginPath(); c.moveTo(-40, -112); c.quadraticCurveTo(10, -138, 64, -112); c.strokeStyle = 'rgba(255,255,255,0.12)'; c.lineWidth = 6; c.stroke();
  if (o.headphones) { fillRR(-124, -26, 36, 66, 14, '#111827'); fillRR(88, -26, 36, 66, 14, '#111827'); fillRR(-118, -16, 12, 46, 6, '#EF4444'); fillRR(106, -16, 12, 46, 6, '#EF4444'); }
}

function drawFx(fx, a, t) {
  if (!fx || a <= 0.01) return;
  withAlpha(a, () => {
    if (fx === 'zzz') for (let i = 0; i < 3; i++) { const ph = (t * 0.55 + i / 3) % 1; withAlpha(Math.sin(ph * Math.PI), () => text('Z', 90 + ph * 90 + i * 8, -110 - ph * 130, { size: 40 + i * 14, font: F.cond, weight: '900', color: '#C4B5FD' })); }
    else if (fx === 'bang') at(128, -120, 1 + 0.08 * Math.sin(t * 14), 0.12, () => { text('!', 0, 0, { size: 110, font: F.cond, weight: '900', color: '#EF4444', glow: 'rgba(239,68,68,0.8)', blur: 20 }); text('!', 38, 10, { size: 80, font: F.cond, weight: '900', color: '#F97316' }); });
    else if (fx === 'sweat') [[98, -46, 0], [-100, -36, 0.5]].forEach(([x, y, o]) => { const ph = (t * 0.9 + o) % 1; withAlpha(1 - ph, () => { const yy = y + ph * 50; c.beginPath(); c.moveTo(x, yy - 18); c.quadraticCurveTo(x + 12, yy, x, yy + 8); c.quadraticCurveTo(x - 12, yy, x, yy - 18); c.fillStyle = '#7DD3FC'; c.fill(); }); });
    else if (fx === 'tears') [-34, 34].forEach((ex, i) => {
      c.beginPath(); c.moveTo(ex, 8); c.quadraticCurveTo(ex + (i ? 10 : -10), 60, ex + (i ? 6 : -6), 118); c.strokeStyle = 'rgba(125,211,252,0.85)'; c.lineWidth = 10; c.lineCap = 'round';
      c.setLineDash([16, 10]); c.lineDashOffset = -t * 80; c.stroke(); c.setLineDash([]);
      const ph = (t * 1.6 + i * 0.4) % 1; withAlpha(1 - ph, () => circle(ex + (i ? 8 : -8), 120 + ph * 90, 7, '#7DD3FC'));
    });
    else if (fx === 'steam') for (let i = 0; i < 6; i++) { const side = i % 2 ? 1 : -1, ph = (t * 1.3 + i / 6) % 1; withAlpha((1 - ph) * 0.8, () => circle(side * (104 + ph * 40), -40 - ph * 120, 12 + ph * 22, '#E5E7EB')); }
    else if (fx === 'q') { text('?', 120, -130 + Math.sin(t * 4) * 8, { size: 96, font: F.cond, weight: '900', color: '#A78BFA', glow: 'rgba(167,139,250,0.7)' }); text('?', 176, -170 + Math.cos(t * 4) * 8, { size: 60, font: F.cond, weight: '900', color: '#C4B5FD' }); }
    else if (fx === 'sparkle') for (let i = 0; i < 6; i++) { const an = t * 2.2 + i / 6 * TAU; star(Math.cos(an) * 150, -30 + Math.sin(an) * 120, 10 + 5 * Math.sin(t * 9 + i), i % 2 ? '#FDE68A' : '#4ADE80'); }
    else if (fx === 'ice') { c.fillStyle = 'rgba(224,242,254,0.9)'; for (let i = 0; i < 7; i++) { const x = -70 + i * 23, y = -62 - Math.abs(i - 3) * 6; c.beginPath(); c.moveTo(x - 7, y); c.lineTo(x + 7, y); c.lineTo(x, y + 18 + (i % 2) * 10); c.closePath(); c.fill(); } }
  });
}

// bust used inside scenes (profile pics, badges, avatars)
function hoodieTorso(hood, sh = 0, tie) {
  c.beginPath(); c.moveTo(-178, 430); c.lineTo(-172, 232 - sh * 18);
  c.bezierCurveTo(-170, 168 - sh * 22, -122, 136 - sh * 10, -58, 118); c.lineTo(58, 118);
  c.bezierCurveTo(122, 136 - sh * 10, 170, 168 - sh * 22, 172, 232 - sh * 18); c.lineTo(178, 430); c.closePath();
  c.fillStyle = lg(0, 110, 0, 430, [[0, rgba(mixc(hood, '#ffffff', 0.08))], [1, rgba(mixc(hood, '#000000', 0.45))]]); c.fill();
  c.beginPath(); c.ellipse(0, 122, 78, 30, 0, 0, TAU); c.fillStyle = rgba(mixc(hood, '#000000', 0.3)); c.fill();
  fillRR(-26, 70, 52, 62, 18, rgba(mixc(SKIN, '#3B1F14', 0.2)));
  c.beginPath(); c.moveTo(-36, 120); c.lineTo(0, 170); c.lineTo(36, 120); c.closePath(); c.fillStyle = '#0F172A'; c.fill();
  if (tie) { c.beginPath(); c.moveTo(0, 124); c.lineTo(-15, 150); c.lineTo(0, 236); c.lineTo(15, 150); c.closePath(); c.fillStyle = tie; c.fill(); }
  else { line(-24, 134, -28, 204, '#E2E8F0', 5); line(24, 134, 28, 204, '#E2E8F0', 5); circle(-28, 208, 5, '#94A3B8'); circle(28, 208, 5, '#94A3B8'); }
}
const OLD_MOODS = { neutral: 'neutral', tired: 'tired', shock: 'shock', sleep: 'sleep', sad: 'sad', happy: 'happy' };
function dev(x, y, s, o = {}) {
  const p = moodP(OLD_MOODS[o.mood] || o.mood || 'neutral');
  if (o.bags) p.bags = 1;
  c.save(); c.translate(x, y); c.scale(s * 0.98, s * 0.98); c.rotate(o.rot || 0);
  if (o.body !== false) hoodieTorso(o.hood || HOOD, 0, o.tie);
  drawHead(p, { t: o.t, hair: o.hair, beard: o.beard, glasses: o.glasses, headphones: o.headphones, lookX: o.look || 0 });
  if (o.sweat) drawFx('sweat', 1, o.t || 0);
  c.restore();
}

// ---------------- the hero's script ----------------
const CHORUS_TAIL = {
  7: [['sad', 'shrug']], 8: [['manic', 'type']], 9: [['manic', 'type']],
  10: [['scared', 'type'], ['manic', 'type', /shipping/]], 11: [['happy', 'cheer'], ['nervous', 'chin', /money/]],
};
const ACTS = {
  'in-1': [['neutral', 'type']], 'in-2': [['confused', 'chin']], 'in-3': [['deadpan', 'chin']],
  'in-4': [['nervous', 'type'], ['shock', 'headHands', /exit/]],
  'v1-1': [['tired', 'mug']], 'v1-2': [['happy', 'type'], ['sleep', 'rest', /crawled/]],
  'v1-3': [['sleep', 'rest']], 'v1-4': [['sleep', 'rest'], ['shock', 'type', /better/]],
  'v1-5': [['smug', 'chin']], 'v1-6': [['smug', 'chin'], ['confused', 'shrug', /what/]],
  'v1-7': [['sleep', 'rest'], ['smug', 'thumbs', /green/]], 'v1-8': [['smug', 'point'], ['deadpan', 'chin', /screens/]],
  'p1-1': [['deadpan', 'type'], ['deadpan', 'facepalm', /ten-x/]], 'p1-2': [['shock', 'type'], ['panic', 'headHands', /work/]],
  'p1-3': [['tired', 'type']], 'p1-4': [['tired', 'type'], ['angry', 'facepalm', /wrong/]],
  'v2-1': [['deadpan', 'chin']], 'v2-2': [['deadpan', 'chin'], ['sad', 'shrug', /tokens/]],
  'v2-3': [['nervous', 'type']], 'v2-4': [['nervous', 'type'], ['angry', 'facepalm', /hire/]],
  'v2-5': [['sad', 'chin']], 'v2-6': [['confused', 'shrug']],
  'v2-7': [['tired', 'type']], 'v2-8': [['happy', 'thumbs']],
  'p2-1': [['neutral', 'type'], ['angry', 'type', /dead/]], 'p2-2': [['smug', 'chin'], ['happy', 'point', /head/]],
  'p2-3': [['tired', 'type']], 'p2-4': [['tired', 'type'], ['angry', 'facepalm', /wrong/]],
  'b-1': [['sad', 'chin']], 'b-2': [['nervous', 'type']],
  'b-3': [['scared', 'type'], ['frozen', 'type', /froze/]], 'b-4': [['frozen', 'type']], 'b-5': [['confused', 'shrug']],
  'x-1': [['shock', 'headHands']], 'x-2': [['confused', 'chin']], 'x-3': [['sad', 'chin'], ['cry', 'facepalm', /career/]],
  'c3-1': [['sad', 'type']], 'c3-2': [['sad', 'shrug']], 'c3-3': [['shock', 'type']], 'c3-4': [['shock', 'type'], ['panic', 'headHands', /bot/]],
  'c3-5': [['angry', 'type']], 'c3-6': [['deadpan', 'chin']],
  'o-1': [['sleep', 'rest'], ['shock', 'phone', /breaks/]], 'o-2': [['tired', 'phone']], 'o-3': [['deadpan', 'phone']], 'o-4': [['smug', 'thumbs']],
};
for (const ch of ['c1', 'c2']) Object.assign(ACTS, {
  [`${ch}-1`]: [['happy', 'thumbs']], [`${ch}-2`]: [['happy', 'thumbs'], ['panic', 'headHands', /deleted/]],
  [`${ch}-3`]: [['panic', 'headHands']], [`${ch}-4`]: [['cry', 'pray']],
  [`${ch}-5`]: [['shock', 'type']], [`${ch}-6`]: [['deadpan', 'type'], ['cry', 'facepalm', /hope/i]],
});
for (const ch of ['c1', 'c2', 'c3']) for (const k in CHORUS_TAIL) ACTS[`${ch}-${k}`] = CHORUS_TAIL[k];

const HKEYS = [{ t: -1, mood: 'happy', pose: 'wave' }];
for (const l of LINES) for (const [mood, pose, re] of (ACTS[l.id] || [])) {
  HKEYS.push({ t: re ? wr(l.id, re) - 0.08 : l.start - 0.15, mood, pose });
}
HKEYS.sort((a, b) => a.t - b.t);

// arms: [elbowX, elbowY, handX, handY] for the viewer's left and right arm; head-centre coordinates
const DOWN_L = [-185, 300, -90, 330], DOWN_R = [185, 300, 90, 330];
const POSES = {
  type: { L: DOWN_L, R: DOWN_R },
  rest: { L: [-178, 292, -44, 258], R: [178, 292, 44, 258], headY: 36, headRot: 0.3 },
  mug: { L: DOWN_L, R: [175, 252, 74, 84], hR: 'mug' },
  chin: { L: DOWN_L, R: [138, 292, 30, 126], headRot: -0.06 },
  headHands: { L: [-218, 112, -102, -26], R: [218, 112, 102, -26] },
  facepalm: { L: DOWN_L, R: [150, 222, 8, -28], headRot: 0.12, headY: 8 },
  shrug: { L: [-238, 250, -268, 136], R: [238, 250, 268, 136], sh: 1, headRot: 0.12 },
  thumbs: { L: DOWN_L, R: [238, 212, 226, 70], hR: 'thumb' },
  point: { L: DOWN_L, R: [232, 190, 252, 26], hR: 'point' },
  phone: { L: [-202, 200, -98, 22], R: DOWN_R, hL: 'phone' },
  cheer: { L: [-232, 92, -252, -70], R: [232, 92, 252, -70] },
  pray: { L: [-152, 272, -14, 148], R: [152, 272, 14, 148] },
  wave: { L: DOWN_L, R: [236, 200, 246, 40], hR: 'open' },
};
function heroState(t) {
  let i = 0; while (i + 1 < HKEYS.length && HKEYS[i + 1].t <= t) i++;
  const cur = HKEYS[i], prev = HKEYS[Math.max(0, i - 1)], m = i ? easeInOut((t - cur.t) / 0.28) : 1;
  const A = moodP(prev.mood), B = moodP(cur.mood), p = {};
  NUMK.forEach(k => { p[k] = lerp(A[k], B[k], m); });
  p.mouth = m < 0.5 ? A.mouth : B.mouth;
  const PA = POSES[prev.pose], PB = POSES[cur.pose], arm = (a, b) => a.map((v, k) => lerp(v, b[k], m));
  return { p, m, fxA: A.fx, fxB: B.fx, L: arm(PA.L, PB.L), R: arm(PA.R, PB.R), sh: lerp(PA.sh || 0, PB.sh || 0, m),
    headY: lerp(PA.headY || 0, PB.headY || 0, m), headRot: lerp(PA.headRot || 0, PB.headRot || 0, m),
    hL: m < 0.5 ? PA.hL : PB.hL, hR: m < 0.5 ? PA.hR : PB.hR, pose: cur.pose, mood: cur.mood, typing: lerp(prev.pose === 'type' ? 1 : 0, cur.pose === 'type' ? 1 : 0, m) };
}
// he sings his own lines; the AI's quotes, the intro memo and the robotic break are not his
function heroTalk(t, st) {
  if (st.mood === 'sleep' || st.pose === 'rest') return 0;
  for (const l of LINES) {
    if (t < l.start - 0.05 || t > l.end + 0.1) continue;
    if (/^(in|x)-/.test(l.id) || /^"You're absolutely/.test(l.text)) return 0;
    for (const w of l.words) if (t >= w.start - 0.03 && t <= w.end + 0.04) {
      const d = Math.max(0.1, w.end - w.start), ph = clamp((t - w.start + 0.03) / (d + 0.07));
      return Math.pow(Math.sin(Math.PI * ph), 0.6) * (0.35 + 0.65 * clamp(voice(t) * 1.3)) * (d > 0.3 ? 0.75 + 0.25 * Math.cos((t - w.start) * 34) : 1);
    }
    return 0;
  }
  return 0;
}

function drawArm(sx, sy, a, hand, t, typing) {
  let [ex, ey, hx, hy] = a;
  if (typing > 0.5) hy += Math.sin(t * 30 + sx) * 5;
  c.beginPath(); c.moveTo(sx, sy); c.quadraticCurveTo(ex, ey, hx, hy);
  c.strokeStyle = rgba(mixc(HOOD, '#000000', 0.12)); c.lineWidth = 50; c.lineCap = 'round'; c.lineJoin = 'round'; c.stroke();
  c.strokeStyle = rgba(mixc(HOOD, '#ffffff', 0.06)); c.lineWidth = 34; c.stroke();
  const dx = hx - ex, dy = hy - ey, d = Math.hypot(dx, dy) || 1, ux = dx / d, uy = dy / d;
  line(hx - ux * 26, hy - uy * 26, hx - ux * 14, hy - uy * 14, rgba(mixc(HOOD, '#000000', 0.35)), 46, 'butt');
  if (hand === 'phone') { at(hx, hy - 8, 1, -0.25, () => { fillRR(-22, -52, 44, 86, 9, '#0F172A'); fillRR(-18, -46, 36, 72, 6, '#1E3A8A'); }); }
  if (hand === 'mug') mug(hx + 26, hy - 6, 0.42, t);
  circle(hx, hy, 24, SKIN);
  c.beginPath(); c.arc(hx, hy, 24, 0, TAU); c.strokeStyle = rgba(mixc(SKIN, '#3B1F14', 0.3)); c.lineWidth = 2.5; c.stroke();
  if (hand === 'thumb') fillRR(hx - 8, hy - 50, 16, 32, 8, SKIN);
  if (hand === 'point') fillRR(hx - 7, hy - 56, 14, 38, 7, SKIN);
  if (hand === 'open') for (let i = -1; i <= 2; i++) fillRR(hx - 6 + i * 11 - 5, hy - 48, 11, 30, 5, SKIN);
}

const HERO = { x: 540, y: 1122, s: 0.88, desk: 1466 };
function hero(t, P) {
  const st = heroState(t), p = st.p;
  // soft spotlight so he separates from the background
  const g = c.createRadialGradient(HERO.x, HERO.y + 80, 0, HERO.x, HERO.y + 80, 520);
  g.addColorStop(0, rgba(P.a, 0.22)); g.addColorStop(1, rgba(P.a, 0)); c.fillStyle = g; c.fillRect(0, HERO.y - 440, W, 900);
  const e = feat('energy', t), bob = kick(t, 8, 2) * 5 * e + Math.sin(t * 2.1) * 2.5;
  const shake = p.shake * Math.sin(t * 42) * 5 + p.shiver * Math.sin(t * 70) * 3;
  c.save(); c.translate(HERO.x + shake, HERO.y); c.scale(HERO.s, HERO.s);
  const breathe = 1 + Math.sin(t * 2.4) * 0.008;
  c.save(); c.translate(0, 120); c.scale(breathe, breathe); c.translate(0, -120); hoodieTorso(HOOD, st.sh); c.restore();
  c.save(); c.translate(0, st.headY + bob - st.sh * 10); c.rotate(st.headRot + Math.sin(t * 1.3) * 0.02);
  const lookY = st.typing > 0.5 ? 0.6 : 0, lookX = Math.sin(t * 0.7) * 0.35 + (st.pose === 'chin' ? 0.6 : 0);
  drawHead(p, { t, talk: heroTalk(t, st), lookX, lookY });
  drawFx(st.fxA, st.fxA === st.fxB ? 1 : 1 - st.m, t);
  if (st.fxB !== st.fxA) drawFx(st.fxB, st.m, t);
  c.restore();
  const sy = 182 - st.sh * 24;
  drawArm(-150, sy, st.L, st.hL, t, st.typing);
  drawArm(150, sy, st.R, st.hR, t, st.typing);
  // laptop seen from behind, covered in stickers
  if (st.typing > 0.05) { c.globalCompositeOperation = 'lighter'; const lg2 = c.createRadialGradient(0, 210, 0, 0, 210, 260); lg2.addColorStop(0, rgba(P.a, 0.22 * st.typing)); lg2.addColorStop(1, rgba(P.a, 0)); c.fillStyle = lg2; c.fillRect(-300, -60, 600, 300); c.globalCompositeOperation = 'source-over'; }
  c.save(); c.shadowColor = 'rgba(0,0,0,0.5)'; c.shadowBlur = 30; c.shadowOffsetY = 10;
  fillRR(-218, 210, 436, 174, 20, lg(0, 210, 0, 384, [[0, '#D5DCE6'], [1, '#8F9AAB']])); c.restore();
  fillRR(-218, 210, 436, 6, 3, rgba(P.a, 0.8));
  glow(rgba(P.a), 30); circle(0, 296, 30, rgba(mixc(P.a, '#ffffff', 0.3))); noGlow();
  text('</>', 0, 307, { size: 28, font: F.mono, color: '#0F172A', align: 'center' });
  at(-140, 262, 1, -0.2, () => pill(0, 0, 'LGTM', { size: 20, font: F.cond, weight: '900', bg: '#16A34A', align: 'center', pad: 12 }));
  at(146, 338, 1, 0.15, () => { circle(0, 0, 26, '#7C3AED'); text('AI?', 0, 9, { size: 24, font: F.cond, weight: '900', align: 'center' }); });
  at(-120, 344, 1, 0.08, () => { fillRR(-46, -16, 92, 32, 6, '#DC2626'); text('rm -rf', 0, 8, { size: 18, font: F.mono, align: 'center' }); });
  at(122, 252, 1, -0.1, () => { fillRR(-30, -20, 60, 40, 6, '#FACC15'); text(':wq', 0, 8, { size: 20, font: F.mono, color: '#111', align: 'center' }); });
  fillRR(-240, 380, 480, 18, 9, '#64748B');
  c.restore();
  // desk
  const D = HERO.desk;
  c.fillStyle = lg(0, D, 0, D + 70, [[0, '#4A3426'], [1, '#22170F']]); c.fillRect(0, D, W, 70);
  c.fillStyle = 'rgba(255,255,255,0.12)'; c.fillRect(0, D, W, 3);
  c.fillStyle = lg(0, D + 70, 0, D + 150, [[0, 'rgba(0,0,0,0.45)'], [1, 'rgba(0,0,0,0)']]); c.fillRect(0, D + 70, W, 80);
  if (st.hR !== 'mug') mug(810, D - 34, 0.42, t);
  const db = kick(t, 10, 1) * 6 * e;
  at(258, D - 26 - db, 1, Math.sin(t * 3) * 0.05, () => {
    ellipse(0, 0, 46, 28, '#FACC15'); circle(26, -32, 22, '#FDE047');
    c.beginPath(); c.moveTo(44, -32); c.lineTo(66, -26); c.lineTo(44, -22); c.closePath(); c.fillStyle = '#F97316'; c.fill();
    circle(32, -38, 4, '#111'); ellipse(-6, -4, 22, 12, '#EAB308');
  });
}
