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
  [-90, 90].forEach(ex => { c.beginPath(); c.ellipse(ex, 4, 16, 24, 0, 0, TAU); c.strokeStyle = INK; c.lineWidth = 5; c.stroke(); });
  headPath(); c.fillStyle = lg(-60, -110, 70, 110, [[0, rgba(mixc(skin, '#ffffff', 0.12))], [1, rgba(mixc(skin, '#5B2E1A', 0.18))]]); c.fill();
  headPath(); c.strokeStyle = INK; c.lineWidth = 6; c.lineJoin = 'round'; c.stroke();
  if (p.red > 0.01) { headPath(); c.fillStyle = `rgba(239,68,68,${0.28 * p.red})`; c.fill(); }
  if (p.ice > 0.01) { headPath(); c.fillStyle = `rgba(125,211,252,${0.42 * p.ice})`; c.fill(); }
  if (o.beard !== false) {
    c.beginPath(); c.moveTo(-88, -6);
    c.bezierCurveTo(-88, 50, -62, 100, 0, 108); c.bezierCurveTo(62, 100, 88, 50, 88, -6);
    c.bezierCurveTo(82, 30, 66, 44, 46, 46); c.bezierCurveTo(30, 40, 14, 35, 0, 37);
    c.bezierCurveTo(-14, 35, -30, 40, -46, 46); c.bezierCurveTo(-66, 44, -82, 30, -88, -6); c.closePath();
    c.fillStyle = rgba(hair, 0.93); c.fill(); c.strokeStyle = INK; c.lineWidth = 4; c.stroke();
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
  c.fillStyle = lg(-60, -140, 60, -40, [[0, rgba(mixc(hair, '#ffffff', 0.15))], [1, hair]]); c.fill(); c.strokeStyle = INK; c.lineWidth = 5; c.lineJoin = 'round'; c.stroke();
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
// Every lyric line sets his mood and what his body does. He never sings; he only reacts.
const ACTS = {
  'in-1': [['neutral', 'wave']], 'in-2': [['confused', 'shrug']], 'in-3': [['deadpan', 'chin']],
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

// Poses are joint targets in body space: x grows toward the scene panel (mirrored when he faces left), y is up from the floor.
// Arms are [elbowX, elbowY, handX, handY]; legs are [kneeX, kneeY, footX, footY].
const IDLE = {
  aN: [165, -390, 150, -290], aF: [-165, -390, -150, -290], lN: [72, -140, 64, 0], lF: [-72, -140, -64, 0],
  lean: 0, hd: 0, hx: 0, hy: 0, hrot: 0, sh: 0, desk: 0, flail: 0, run: 0, jump: 0, wave: 0, type: 0, stomp: 0, hN: '', hF: '',
};
const pz = o => ({ ...IDLE, ...o });
const POSES = {
  idle: pz({}),
  type: pz({ aN: [190, -380, 75, -300], aF: [-190, -380, -75, -300], desk: 1, type: 1, hy: 12 }),
  mug: pz({ aN: [215, -440, 62, -548], hN: 'mug', hy: -4 }),
  chin: pz({ aN: [150, -440, 30, -516], aF: [-95, -345, 60, -385], hrot: -0.08 }),
  headHands: pz({ aN: [220, -560, 98, -658], aF: [-220, -560, -98, -658], hy: -8 }),
  facepalm: pz({ aN: [150, -490, 8, -598], hrot: 0.12, hy: 10, hd: 8 }),
  shrug: pz({ aN: [240, -430, 275, -525], aF: [-240, -430, -275, -525], sh: 22, hrot: 0.14, hN: 'open', hF: 'open' }),
  thumbs: pz({ aN: [225, -490, 240, -615], hN: 'thumb' }),
  point: pz({ aN: [275, -482, 430, -514], hN: 'point', lean: 26 }),
  phone: pz({ aN: [150, -450, 62, -566], hN: 'phone', hy: 22, hrot: 0.06 }),
  cheer: pz({ aN: [210, -570, 245, -765], aF: [-210, -570, -245, -765], jump: 1, hN: 'open', hF: 'open' }),
  pray: pz({ aN: [112, -400, 14, -440], aF: [-112, -400, -14, -440], hd: 50, hy: 20, lN: [130, -120, 80, 0], lF: [-130, -120, -80, 0] }),
  wave: pz({ aN: [240, -545, 268, -695], wave: 1, hN: 'open' }),
  slump: pz({ aN: [160, -330, 135, -205], aF: [-160, -330, -135, -205], hd: 22, hy: 40, hrot: 0.2, sh: -14, lN: [84, -140, 62, 0], lF: [-84, -140, -62, 0] }),
  sleep: pz({ aN: [150, -340, 128, -228], aF: [-150, -340, -128, -228], hy: 34, hrot: 0.45, sh: -12 }),
  flail: pz({ aN: [225, -540, 265, -705], aF: [-225, -540, -265, -705], flail: 1, run: 0.7, hN: 'open', hF: 'open' }),
  run: pz({ aN: [190, -420, 160, -340], aF: [-190, -420, -160, -340], run: 1, lean: 30, flail: 0.25 }),
  fist: pz({ aN: [215, -555, 240, -705], aF: [-170, -390, -110, -350], hN: 'fist', hF: 'fist', stomp: 1, hy: 14 }),
  cower: pz({ aN: [150, -455, 60, -575], aF: [-150, -455, -60, -575], hd: 140, hy: 28, hrot: 0.1, lN: [150, -100, 95, 0], lF: [-150, -100, -95, 0] }),
  freeze: pz({ aN: [200, -400, 190, -322], aF: [-200, -400, -190, -322], hrot: -0.04 }),
};
const POSE_KEYS = ['aN', 'aF', 'lN', 'lF'], POSE_NUM = Object.keys(IDLE).filter(k => typeof IDLE[k] === 'number');
function blendPose(A, B, m) {
  const o = {};
  POSE_KEYS.forEach(k => { o[k] = A[k].map((v, i) => lerp(v, B[k][i], m)); });
  POSE_NUM.forEach(k => { o[k] = lerp(A[k], B[k], m); });
  o.hN = m < 0.5 ? A.hN : B.hN; o.hF = m < 0.5 ? A.hF : B.hF;
  return o;
}
let HERO_FORCE = null;
function heroState(t) {
  if (HERO_FORCE) { const m = moodP(HERO_FORCE.mood); return { p: m, m: 1, fxA: m.fx, fxB: m.fx, z: POSES[HERO_FORCE.pose], mood: HERO_FORCE.mood, pose: HERO_FORCE.pose }; }
  let i = 0; while (i + 1 < HKEYS.length && HKEYS[i + 1].t <= t) i++;
  const cur = HKEYS[i], prev = HKEYS[Math.max(0, i - 1)], m = i ? easeInOut((t - cur.t) / 0.3) : 1;
  const A = moodP(prev.mood), B = moodP(cur.mood), p = {};
  NUMK.forEach(k => { p[k] = lerp(A[k], B[k], m); });
  p.mouth = m < 0.5 ? A.mouth : B.mouth;
  return { p, m, fxA: A.fx, fxB: B.fx, z: blendPose(POSES[prev.pose], POSES[cur.pose], m), mood: cur.mood, pose: cur.pose };
}

// he stays in his spot and only takes a few calm steps to a new spot when the song section changes
const HOME = { in: 470, v1: 380, p1: 640, c1: 560, v2: 400, p2: 660, c2: 560, b: 430, x: 620, c3: 560, o: 440 };
const WALK = 200, HERO_S = 0.48, HERO_Y = 1010;
function placement(t) {
  let i = 0; while (i + 1 < SEC_STARTS.length && SEC_STARTS[i + 1].t <= t) i++;
  const x1 = HOME[SEC_STARTS[i].s], x0 = i ? HOME[SEC_STARTS[i - 1].s] : x1, d = x1 - x0, T = Math.abs(d) / WALK;
  const el = t - SEC_STARTS[i].t, k = T > 0 ? clamp(el / T) : 1, moving = k > 0 && k < 1;
  return { x: x0 + d * k, v: moving ? Math.sign(d) * WALK : 0, mv: moving ? smooth(Math.min(el, T - el) / 0.2) : 0, dir: 1, phase: Math.abs(d) * k / 45 * Math.PI };
}

function tube(S, E, H, w, col, edge) {
  const cx = 2 * E[0] - (S[0] + H[0]) / 2, cy = 2 * E[1] - (S[1] + H[1]) / 2;
  c.beginPath(); c.moveTo(S[0], S[1]); c.quadraticCurveTo(cx, cy, H[0], H[1]); c.lineCap = 'round'; c.lineJoin = 'round';
  c.strokeStyle = INK; c.lineWidth = w + 12; c.stroke(); c.strokeStyle = col; c.lineWidth = w; c.stroke();
  c.strokeStyle = rgba(mixc(col, '#ffffff', 0.12)); c.lineWidth = w * 0.35; c.stroke();
}
function handAt(x, y, kind, dir, t) {
  if (kind === 'thumb') fillRR(x - 9, y - 54, 18, 38, 9, SKIN);
  if (kind === 'point') { fillRR(Math.min(x, x + dir * 78), y - 11, 78, 22, 11, SKIN); rr(Math.min(x, x + dir * 78), y - 11, 78, 22, 11); c.strokeStyle = INK; c.lineWidth = 4; c.stroke(); }
  if (kind === 'open') for (let i = -1.5; i <= 1.5; i++) fillRR(x + i * 13 - 6, y - 52 + Math.abs(i) * 5, 12, 34, 6, SKIN);
  if (kind === 'phone') at(x + dir * 6, y - 40, 1, dir * -0.12, () => { fillRR(-26, -56, 52, 100, 10, INK); fillRR(-21, -50, 42, 88, 7, '#38BDF8'); fillRR(-21, -50, 42, 22, 7, 'rgba(255,255,255,0.35)'); });
  if (kind === 'mug') mug(x + dir * 30, y - 20, 0.4, t);
  circle(x, y, kind === 'fist' ? 31 : 27, SKIN); c.beginPath(); c.arc(x, y, kind === 'fist' ? 31 : 27, 0, TAU); c.strokeStyle = INK; c.lineWidth = 5; c.stroke();
  if (kind === 'fist') for (let i = -1; i <= 1; i++) line(x + i * 11, y - 8, x + i * 11, y + 4, INK, 3);
}

function drawDesk(bx, by, k, P, t) {
  if (k < 0.02) return;
  c.save(); c.translate(bx, by); c.globalAlpha = clamp(k * 1.5); c.translate(0, (1 - k) * 90); c.scale(1, 0.3 + 0.7 * k);
  c.save(); c.shadowColor = 'rgba(0,0,0,0.45)'; c.shadowBlur = 30; c.shadowOffsetY = 14;
  fillRR(-290, -260, 580, 262, 12, '#8A5A33'); c.restore();
  fillRR(-290, -260, 580, 262, 12, lg(0, -260, 0, 0, [[0, '#9A6A3E'], [1, '#6E4526']])); rr(-290, -260, 580, 262, 12); c.strokeStyle = INK; c.lineWidth = 6; c.stroke();
  [[-270, -240], [20, -240]].forEach(([x, y]) => { fillRR(x, y, 250, 100, 8, 'rgba(0,0,0,0.18)'); fillRR(x + 95, y + 40, 60, 14, 7, '#E8C48A'); });
  fillRR(-310, -290, 620, 34, 10, '#C99560'); rr(-310, -290, 620, 34, 10); c.strokeStyle = INK; c.lineWidth = 6; c.stroke();
  const lid = lg(0, -480, 0, -290, [[0, '#E2E8F0'], [1, '#94A3B8']]);
  c.save(); c.shadowColor = rgba(P.a, 0.5); c.shadowBlur = 40; fillRR(-190, -482, 380, 196, 16, lid); c.restore();
  rr(-190, -482, 380, 196, 16); c.strokeStyle = INK; c.lineWidth = 6; c.stroke();
  glow(rgba(P.a), 30); circle(0, -386, 30, rgba(mixc(P.a, '#ffffff', 0.35))); noGlow();
  text('</>', 0, -376, { size: 28, font: F.mono, color: INK, align: 'center' });
  at(-120, -436, 1, -0.2, () => { fillRR(-42, -15, 84, 30, 6, '#16A34A'); text('LGTM', 0, 7, { size: 20, font: F.cond, weight: '900', align: 'center' }); });
  at(128, -330, 1, 0.12, () => { circle(0, 0, 26, '#7C3AED'); text('AI?', 0, 8, { size: 22, font: F.cond, weight: '900', align: 'center' }); });
  at(-110, -326, 1, 0.08, () => { fillRR(-46, -15, 92, 30, 6, '#DC2626'); text('rm -rf', 0, 7, { size: 18, font: F.mono, align: 'center' }); });
  at(124, -444, 1, -0.1, () => { fillRR(-30, -18, 60, 36, 6, '#FACC15'); text(':wq', 0, 7, { size: 20, font: F.mono, color: '#111', align: 'center' }); });
  c.restore();
}

function hero(t, P) {
  const st = heroState(t), p = st.p, z = st.z, pl = placement(t), dir = pl.dir;
  const e = feat('energy', t), bob = kick(t, 8, 2) * 6 * e + Math.sin(t * 2.1) * 2;
  const run = Math.max(z.run, pl.mv), trav = Math.sign(pl.v || 0) * dir;
  const jy = z.jump * Math.abs(Math.sin(Math.PI * (t - PHASE) / (2 * BEAT))) * 46;
  const shk = p.shake * Math.sin(t * 42) * 5 + p.shiver * Math.sin(t * 70) * 3;
  const bx = pl.x + shk, by = HERO_Y, X = x => bx + dir * x, Y = y => by + y, Q = ([x, y]) => [X(x), Y(y)];
  const phi = pl.mv > 0.05 ? pl.phase : t * 15, step = Math.abs(Math.sin(phi)) * 12 * run;
  const lean = z.lean + trav * pl.mv * 34;
  const hip = -270 + z.hd - jy - step, shY = -490 + z.hd - z.sh - jy - step;

  c.save(); c.translate(bx, by); c.scale(HERO_S, HERO_S); c.translate(-bx, -by);
  // glow behind him so he separates from busy backgrounds
  const gl = c.createRadialGradient(bx, by - 330, 0, bx, by - 330, 480); gl.addColorStop(0, rgba(P.b, 0.28)); gl.addColorStop(1, rgba(P.b, 0));
  c.fillStyle = gl; c.fillRect(bx - 520, by - 820, 1040, 900);
  ellipse(bx, by + 4, 170 * (1 - jy / 140), 20, 'rgba(0,0,0,0.38)');

  // legs
  const leg = (base, s) => {
    let [kx, ky, fx, fy] = base; const ph = phi + s * Math.PI, sn = Math.sin(ph), lift = Math.max(0, sn);
    if (run > 0.02) { fx += sn * 42 * run * (trav || 1); kx += sn * 18 * run * (trav || 1); fy -= lift * 62 * run; ky -= lift * 84 * run; }
    if (s === 1 && z.stomp > 0.02) { const a = Math.abs(Math.sin(t * 9)); fy -= a * 55 * z.stomp; ky -= a * 70 * z.stomp; }
    return [kx, ky - jy * 0.9, fx, fy - jy];
  };
  const legs = [[leg(z.lF, 1), -58], [leg(z.lN, 0), 58]];
  legs.forEach(([[kx, ky, fx, fy], hx]) => {
    tube(Q([hx, hip + 20]), Q([kx, ky]), Q([fx, fy - 26]), 54, '#2B4C7E');
    const sx = Math.sign(fx || hx) * 14;
    ellipse(X(fx + sx), Y(fy - 14), 56, 27, INK); ellipse(X(fx + sx), Y(fy - 15), 50, 22, '#F8FAFC'); fillRR(X(fx + sx) - 52, Y(fy) - 15, 104, 9, 4, '#E11D48');
  });

  // torso
  const tl = lean * 0.5, A = Q([-128 + lean, shY + 26]), B = Q([128 + lean, shY + 26]), C = Q([112, hip + 34]), D = Q([-112, hip + 34]);
  c.beginPath(); c.moveTo(A[0], A[1]); c.quadraticCurveTo(...Q([lean, shY - 34]), B[0], B[1]);
  c.quadraticCurveTo(...Q([150 + tl, (shY + hip) / 2]), C[0], C[1]); c.quadraticCurveTo(...Q([0, hip + 72]), D[0], D[1]);
  c.quadraticCurveTo(...Q([-150 + tl, (shY + hip) / 2]), A[0], A[1]); c.closePath();
  c.fillStyle = lg(0, Y(shY), 0, Y(hip + 40), [[0, rgba(mixc(HOOD, '#ffffff', 0.12))], [1, rgba(mixc(HOOD, '#000000', 0.35))]]); c.fill();
  c.strokeStyle = INK; c.lineWidth = 7; c.lineJoin = 'round'; c.stroke();
  fillRR(X(lean * 0.8) - 24, Y(shY - 36), 48, 62, 16, rgba(mixc(SKIN, '#3B1F14', 0.2)));
  c.beginPath(); c.ellipse(X(lean * 0.8), Y(shY + 14), 78, 28, 0, 0, TAU); c.fillStyle = rgba(mixc(HOOD, '#000000', 0.3)); c.fill(); c.strokeStyle = INK; c.lineWidth = 5; c.stroke();
  c.beginPath(); c.moveTo(X(lean * 0.8) - 34, Y(shY + 4)); c.lineTo(X(lean * 0.8), Y(shY + 56)); c.lineTo(X(lean * 0.8) + 34, Y(shY + 4)); c.closePath(); c.fillStyle = '#0F172A'; c.fill();
  line(X(lean * 0.8 - 22), Y(shY + 34), X(lean * 0.8 - 26), Y(shY + 104), '#E2E8F0', 6); line(X(lean * 0.8 + 22), Y(shY + 34), X(lean * 0.8 + 26), Y(shY + 104), '#E2E8F0', 6);
  const pk = Q([tl, hip - 10]); fillRR(pk[0] - 82, pk[1] - 38, 164, 70, 22, 'rgba(0,0,0,0.2)'); rr(pk[0] - 82, pk[1] - 38, 164, 70, 22); c.strokeStyle = 'rgba(18,12,28,0.7)'; c.lineWidth = 4; c.stroke();

  // head
  const hY = -600 + z.hd + z.hy - jy - step + bob * 0.5, hX = lean * 0.8 + z.hx;
  const lookX = dir * (0.7 + Math.sin(t * 0.7) * 0.25), lookY = z.type > 0.5 ? 0.6 : 0;
  c.save(); c.translate(X(hX), Y(hY)); c.rotate(z.hrot * dir + Math.sin(t * 1.3) * 0.02 + trav * pl.mv * 0.1); c.scale(0.85, 0.85);
  drawHead(p, { t, lookX: dir > 0 ? lookX : lookX, lookY });
  drawFx(st.fxA, st.fxA === st.fxB ? 1 : 1 - st.m, t);
  if (st.fxB !== st.fxA) drawFx(st.fxB, st.m, t);
  c.restore();

  // arms: walking swings them, flailing waves them around, typing jitters the hands
  const arm = (a, s, kind) => {
    let [ex, ey, hx, hy] = a; const sgn = s ? -1 : 1, sx = sgn * 118 + lean;
    if (pl.mv > 0.05) {
      const sw = Math.sin(phi + s * Math.PI), m = pl.mv, w = [sgn * 190, -420 + hip + 270, sgn * 150 + sw * 35 * (trav || 1), -330 + hip + 270 + sw * 40];
      ex = lerp(ex, w[0], m); ey = lerp(ey, w[1], m); hx = lerp(hx, w[2], m); hy = lerp(hy, w[3], m); kind = '';
    }
    const fl = z.flail, f0 = s * 2.1;
    hx += Math.sin(t * 13 + f0) * 46 * fl + Math.sin(t * 10) * 36 * z.wave * (s ? 0 : 1); hy += Math.cos(t * 11 + f0) * 56 * fl + Math.sin(t * 30 + s * 2) * 6 * z.type;
    ex += Math.sin(t * 13 + f0) * 22 * fl + Math.sin(t * 10) * 12 * z.wave * (s ? 0 : 1); ey += Math.cos(t * 11 + f0) * 26 * fl;
    const dy = -jy * 0.5 + (hip + 270 + step) * 0.2;
    tube(Q([sx, shY + 40]), Q([ex, ey + dy]), Q([hx, hy + dy]), 48, HOOD);
    return { x: X(hx), y: Y(hy + dy), kind };
  };
  const hF = arm(z.aF, 1, z.hF), hN = arm(z.aN, 0, z.hN);
  [hF, hN].forEach(h => handAt(h.x, h.y, h.kind, dir, t));
  drawDesk(bx, by, z.desk, P, t);
  c.restore();
}
