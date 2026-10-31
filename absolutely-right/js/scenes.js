// One illustrated scene per lyric moment. Each gets (t, scene, palette, localTime); word times drive every event.
const SC = {};
let GLITCH = 0;
const ids = s => s.L.map(l => l.id);
const bump = (t, t0, d = 0.18) => (t >= t0 && t < t0 + d) ? 1 - (t - t0) / d : 0;
const gradText = (P, y0, y1) => lg(0, y0, 0, y1, [[0, rgba(mixc(P.a, '#ffffff', 0.25))], [1, rgba(P.b)]]);
const GRAY = 'rgba(255,255,255,0.55)', DIM = 'rgba(255,255,255,0.35)';

// ---------------- intro ----------------
SC.title = (t, s, P) => {
  const k = pop(t, 0.1, 0.7);
  robot(540, 600, 1.1 * k, { t, mood: t > 1.1 ? 'happy' : 'normal', acc: P.a });
  const k2 = ease(t, 0.45, 0.5), k3 = pop(t, 0.7, 0.5);
  withAlpha(k2, () => text("YOU'RE ABSOLUTELY", 540, 1000 + (1 - k2) * 30, { size: 104, font: F.cond, weight: '900', align: 'center' }));
  at(540, 1150, lerp(0.6, 1, k3), 0, () => withAlpha(clamp(k3 * 2), () => text('RIGHT!', 0, 0, { size: 210, font: F.cond, weight: '900', align: 'center', color: gradText(P, -180, 0), glow: rgba(P.a, 0.8), blur: 40 })));
  withAlpha(ease(t, 1.1, 0.5), () => text('a song for software engineers  •  2026', 540, 1215, { size: 30, font: F.mono, color: GRAY, align: 'center' }));
};

SC.slack = (t, s, P) => {
  const [a, b, d] = ids(s);
  const x = 70, y = 300, w = 940, h = 880;
  win(x, y, w, h, 'Slack — #engineering');
  text('# engineering', x + 44, y + 140, { size: 44 });
  text('12 members  •  1 human left', x + 44, y + 184, { size: 27, font: F.body, color: GRAY });
  fillRR(x + 30, y + 214, w - 60, 2, 1, 'rgba(255,255,255,0.1)');
  const msgs = [
    { t: wt(a, 0), title: 'Good morning team. Quick update:' },
    { t: wt(b, 0), title: 'Wrote the code', sub: '4,812 lines  •  0 humans involved', ok: true },
    { t: wt(d, 0), title: 'Reviewed the code', sub: 'Approved by: AI Agent (also the author)', ok: true },
  ];
  msgs.forEach((m, i) => {
    const k = pop(t, m.t - 0.12, 0.45); if (k <= 0) return;
    const y0 = y + 250 + i * 190 + (1 - k) * 40;
    withAlpha(clamp(k * 2), () => {
      fillRR(x + 40, y0, 84, 84, 22, rgba(P.a, 0.25));
      robot(x + 82, y0 + 46, 0.3, { t, body: false, shadow: false, mood: 'happy', acc: P.a, bob: 0 });
      text('AI Agent', x + 146, y0 + 30, { size: 32 });
      const nw = tw('AI Agent', 32);
      pill(x + 160 + nw, y0 + 20, 'APP', { size: 18, pad: 10, bg: rgba(P.a, 0.35) });
      text(`9:0${i} AM`, x + 236 + nw, y0 + 30, { size: 24, font: F.body, color: DIM });
      if (m.ok) { checkBadge(x + 166, y0 + 78, 18); text(m.title, x + 196, y0 + 90, { size: 36, font: F.body }); }
      else text(m.title, x + 146, y0 + 90, { size: 36, font: F.body });
      if (m.sub) text(m.sub, x + 146, y0 + 136, { size: 27, font: F.body, color: GRAY });
    });
  });
  // typing indicator before each message
  const typing = msgs.some(m => t > m.t - 0.75 && t < m.t - 0.1) || t < msgs[0].t - 0.1;
  if (typing) {
    for (let i = 0; i < 3; i++) circle(x + 60 + i * 22, y + h - 52 - Math.max(0, Math.sin(t * 12 - i)) * 8, 7, GRAY);
    text('AI Agent is typing…', x + 136, y + h - 42, { size: 26, font: F.body, color: GRAY });
  }
  const kr = pop(t, wre(d, /code/) + 0.2, 0.4);
  if (kr > 0) at(x + 220, y + h - 120, kr, 0, () => { pill(-74, 0, '+1  AI Agent', { size: 24, bg: rgba(P.a, 0.25), border: rgba(P.a, 0.6) }); });
};

SC.invite = (t, s, P) => {
  const a = s.L[0].id, Tc = wr(a, /interview/) + 0.1, T0 = wr(a, /would/);
  const x = 100, y = 320, w = 880, h = 840;
  card(x, y, w, h, { fill: 'rgba(20,22,36,0.94)' });
  c.save(); rr(x, y, w, h, 34); c.clip(); c.fillStyle = lg(x, 0, x + w, 0, [[0, '#EF4444'], [1, '#F97316']]); c.fillRect(x, y, w, 14); c.restore();
  fillRR(x + 50, y + 70, 130, 140, 24, '#fff');
  c.save(); rr(x + 50, y + 70, 130, 140, 24); c.clip(); c.fillStyle = '#EF4444'; c.fillRect(x + 50, y + 70, 130, 42); c.restore();
  text('OCT', x + 115, y + 102, { size: 26, font: F.cond, weight: '900', align: 'center' });
  text('8', x + 115, y + 190, { size: 76, font: F.ui, color: '#0F172A', align: 'center' });
  text('Exit Interview', x + 215, y + 135, { size: 60, color: '#fff' });
  text('Today  •  10:00 – 10:05 AM', x + 215, y + 188, { size: 30, font: F.body, color: GRAY });
  const rows = [['Organizer', 'AI Agent'], ['Guest', 'You (attendance optional)'], ['Location', 'The exit door'], ['Agenda', 'Return laptop, badge & dreams']];
  rows.forEach(([k, v], i) => {
    const kk = ease(t, s.start + 0.2 + i * 0.22, 0.4); if (kk <= 0) return;
    withAlpha(kk, () => {
      const yy = y + 300 + i * 86 + (1 - kk) * 20;
      text(k.toUpperCase(), x + 60, yy, { size: 26, font: F.cond, color: DIM });
      text(v, x + 260, yy, { size: 34, font: F.body });
      if (i === 0) robot(x + 280 + tw(v, 34, F.body) + 34, yy - 12, 0.18, { t, body: false, shadow: false, mood: 'happy', acc: P.a, bob: 0 });
    });
  });
  fillRR(x + 40, y + h - 220, w - 80, 2, 1, 'rgba(255,255,255,0.08)');
  const press = bump(t, Tc, 0.22);
  button(x + 60, y + h - 170, 370, 104, 'Accept', { bg: '#22C55E', press, glow: t > Tc ? 'rgba(34,197,94,0.8)' : null });
  withAlpha(0.35, () => button(x + 450, y + h - 170, 370, 104, 'Decline', { bg: '#475569' }));
  withAlpha(ease(t, T0, 0.4), () => text('Decline is disabled by your admin', x + 635, y + h - 32, { size: 22, font: F.body, color: DIM, align: 'center' }));
  ripple(x + 245, y + h - 118, lin(t, Tc, 0.6), '#22C55E', 200);
  const m = easeInOut(lin(t, T0, Tc - T0));
  cursorArrow(lerp(980, x + 250, m), lerp(1250, y + h - 120, m), 1.1, press);
  stamp(540, y + 470, 'SCHEDULED', '#22C55E', lin(t, Tc + 0.2, 0.35), -0.16, 110);
};

// ---------------- verse 1 ----------------
SC.morning = (t, s, P) => {
  const a = s.L[0].id, tn = wt(a, 3), tc = wt(a, 6), td = wt(a, 9);
  card(170, 290, 740, 300);
  text('ALARM', 540, 350, { size: 28, font: F.cond, color: DIM, align: 'center' });
  const fl = lin(t, tn - 0.18, 0.32), sy = Math.max(0.04, Math.abs(Math.cos(fl * Math.PI)));
  at(540, 470, 1, 0, () => { c.scale(1, sy); text(fl < 0.5 ? '8:59' : '9:00', 0, 70, { size: 190, font: F.cond, weight: '900', align: 'center', glow: rgba(P.a, 0.9), blur: 30 }); });
  text('AM', 800, 520, { size: 40, font: F.cond, color: GRAY });
  if (t > tn) ripple(540, 440, lin(t, tn, 0.7), rgba(P.a), 360);
  const km = pop(t, tc - 0.15, 0.45);
  if (km > 0) at(330, 850, km, -0.06, () => { glow(rgba(P.a, 0.5), 40); mug(0, 0, 1.15, t); noGlow(); text('FUEL', 0, 150, { size: 40, font: F.cond, weight: '900', color: GRAY, align: 'center' }); });
  const kc = pop(t, td - 0.15, 0.5);
  if (kc > 0) at(730, 800, kc, 0, () => {
    const fl = (t * 3 % 2) < 0.12;
    for (let i = 0; i < 6; i++) line(-90 + i * 36, 70, -110 + i * 36 - ((t * 180 + i * 37) % 40) * 0.3, 110 + ((t * 180 + i * 37) % 40), 'rgba(125,211,252,0.7)', 5);
    [[-90, 20, 62], [-20, -20, 82], [70, 10, 66], [0, 40, 70]].forEach(([x, y, r]) => circle(x, y, r, fl ? '#64748B' : '#334155'));
    c.beginPath(); c.moveTo(10, 60); c.lineTo(-20, 130); c.lineTo(10, 125); c.lineTo(-10, 190); c.lineTo(50, 105); c.lineTo(20, 110); c.lineTo(40, 60); c.closePath();
    glow('#FDE047', fl ? 40 : 16); c.fillStyle = '#FDE047'; c.fill(); noGlow();
    text('DREAD', 0, 30, { size: 46, font: F.cond, weight: '900', align: 'center' });
  });
  const dv = ease(t, td - 0.1, 0.55);
  card(110, 1110, 860, 110, { r: 26 });
  meter(150, 1150, 780, 'DREAD LEVEL', lerp(0.3, 1, dv), dv > 0.9 ? '#EF4444' : '#F59E0B', { valueLabel: dv > 0.9 ? 'MAXIMUM' : `${Math.round(lerp(30, 100, dv))}%` });
};

SC.prompt = (t, s, P) => {
  const a = s.L[0].id, t0 = wt(a, 0), tp = wt(a, 3), tcr = wt(a, 6);
  card(80, 300, 920, 330);
  text('What should we build today?', 130, 380, { size: 32, font: F.body, color: GRAY });
  const msg = 'build the entire app. no bugs. thx';
  const shown = typed(msg, t, t0 - 0.25, tp);
  text(shown, 130, 470, { size: 42, font: F.mono, max: 820 });
  if (shown.length < msg.length || (t * 2 | 0) % 2) fillRR(132 + tw(shown, 42, F.mono), 432, 4, 50, 2, rgba(P.a));
  const press = bump(t, tp + 0.15, 0.25);
  at(920, 560, 1 - press * 0.12, 0, () => { glow(rgba(P.a), 30); circle(0, 0, 46, rgba(P.a)); noGlow(); line(0, 18, 0, -18, '#fff', 8); line(-14, -4, 0, -18, '#fff', 8); line(14, -4, 0, -18, '#fff', 8); });
  const kw = pop(t, tp + 0.3, 0.4);
  if (kw > 0) at(540, 700, kw, 0, () => { card(-300, -48, 600, 96, { r: 48 }); spinner(-240, 0, 20, t, rgba(P.a)); text(`Agent is working…  ${Math.min(47, Math.floor((t - tp) * 30))} files`, -200, 12, { size: 30, font: F.body }); });
  const kb = pop(t, tcr - 0.2, 0.5);
  if (kb > 0) at(540, 1010, kb, 0, () => {
    fillRR(-400, -10, 800, 170, 34, '#2E2A47'); fillRR(-400, 140, 40, 70, 10, '#2E2A47'); fillRR(360, 140, 40, 70, 10, '#2E2A47');
    fillRR(-380, -40, 760, 90, 40, '#E2E8F0');
    ellipse(-250, -55, 120, 50, '#F8FAFC');
    rr(-140, -110, 520, 150, 60); c.fillStyle = lg(-140, 0, 380, 0, [[0, rgba(P.a)], [1, rgba(P.b)]]); c.fill();
    for (let i = 0; i < 3; i++) { const ph = (t * 0.7 + i / 3) % 1; withAlpha(Math.sin(ph * Math.PI), () => text('Z', -170 + ph * 150 + i * 10, -200 - ph * 170, { size: 46 + i * 14, font: F.cond, weight: '900', color: '#C4B5FD' })); }
  });
  if (kb > 0) withAlpha(kb, () => { moon(880, 820, 52, '#FDE68A'); [[160, 780], [300, 840], [780, 720]].forEach(([sx, sy], i) => star(sx, sy, 10 + 4 * Math.sin(t * 4 + i), 'rgba(253,230,138,0.85)')); });
};

const KW = /\b(export|async|function|const|await|return|import|from|describe|it|expect|new)\b/;
function code(str, x, y, size) {
  c.font = font(F.mono, size); c.textAlign = 'left'; c.textBaseline = 'alphabetic';
  if (/^\s*(\/\/|#)/.test(str)) { c.fillStyle = str.trim().startsWith('#') ? '#F472B6' : '#64748B'; c.fillText(str, x, y); return; }
  const parts = str.split(/('[^']*'?|\b[A-Za-z_]+\b|\d+|\s+|.)/).filter(Boolean);
  let xx = x;
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i];
    c.fillStyle = p.startsWith("'") ? '#86EFAC' : KW.test(p) && /^[a-z]+$/.test(p) ? '#C084FC' : /^\d+$/.test(p) ? '#FDBA74' : /^[A-Za-z_]+$/.test(p) && parts[i + 1] === '(' ? '#60A5FA' : /^[A-Z]/.test(p) ? '#FDE68A' : '#E2E8F0';
    c.fillText(p, xx, y); xx += c.measureText(p).width;
  }
}
const IDE_TABS = [
  ['feature.ts', ['export async function shipFeature() {', "  const plan = await ai.think('hard');", '  const code = await ai.write(plan);', '  await ai.review(code); // lgtm', '  await ai.deploy(code);', "  return 'done in 4 min';", '}']],
  ['feature.test.ts', ["describe('shipFeature', () => {", "  it('works', async () => {", '    expect(await shipFeature())', "      .toBe('done in 4 min');", '  });', "  it('never fails', () => {", '    expect(ai).toBeRight();', '  });', '});']],
  ['README.md', ['# shipFeature()', '', 'Written by:   AI Agent', 'Tested by:    AI Agent', 'Reviewed by:  AI Agent', 'Human:        asleep', '', '## Quality']],
];
SC.ide = (t, s, P) => {
  const [a, b] = ids(s), T = [s.start, wt(a, 9) - 0.15, wt(b, 4) - 0.15];
  const tab = t >= T[2] ? 2 : t >= T[1] ? 1 : 0, t0 = T[tab];
  const x = 60, y = 290, w = 960, h = 930;
  win(x, y, w, h, 'agent — ~/startup', { fill: 'rgba(13,15,24,0.94)' });
  c.save(); rr(x, y, w, h, 34); c.clip();
  c.fillStyle = 'rgba(0,0,0,0.25)'; c.fillRect(x, y + 76, 250, h);
  c.restore();
  text('EXPLORER', x + 30, y + 126, { size: 22, font: F.cond, color: DIM });
  text('src', x + 30, y + 176, { size: 26, font: F.mono, color: GRAY });
  IDE_TABS.forEach(([name], i) => {
    const yy = y + 226 + i * 50;
    if (i === tab) fillRR(x + 14, yy - 34, 222, 46, 10, rgba(P.a, 0.22));
    fillRR(x + 44, yy - 22, 16, 20, 3, ['#3B82F6', '#22C55E', '#F472B6'][i]);
    text(name, x + 70, yy - 4, { size: 22, font: F.mono, color: i === tab ? '#fff' : GRAY });
  });
  IDE_TABS.forEach(([name], i) => {
    const tx = x + 260 + i * 236;
    fillRR(tx, y + 86, 228, 54, 12, i === tab ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.02)');
    if (i === tab) { glow(rgba(P.a), 14); fillRR(tx + 12, y + 86, 204, 4, 2, rgba(P.a)); noGlow(); }
    text(name, tx + 114, y + 122, { size: 21, font: F.mono, color: i === tab ? '#fff' : DIM, align: 'center' });
  });
  const lines = IDE_TABS[tab][1];
  let budget = Math.max(0, (t - t0 - 0.05) * 75);
  lines.forEach((ln, i) => {
    const yy = y + 210 + i * 54;
    text(String(i + 1), x + 300, yy, { size: 24, font: F.mono, color: 'rgba(255,255,255,0.22)', align: 'right' });
    const n = Math.min(ln.length, Math.floor(budget)); budget -= ln.length + 4;
    if (n > 0) code(ln.slice(0, n), x + 330, yy, 26);
    if (n > 0 && n < ln.length) fillRR(x + 332 + tw(ln.slice(0, n), 26, F.mono), yy - 24, 3, 30, 1, rgba(P.a));
  });
  if (tab === 1) {
    const k = pop(t, t0 + 1.0, 0.4);
    if (k > 0) at(x + 610, y + 770, k, 0, () => { fillRR(-300, -50, 600, 100, 24, 'rgba(34,197,94,0.16)'); rr(-300, -50, 600, 100, 24); c.strokeStyle = 'rgba(34,197,94,0.6)'; c.lineWidth = 2; c.stroke(); checkBadge(-240, 0, 26); text('128 passed  •  0 failed', -196, 12, { size: 34, font: F.mono, color: '#86EFAC' }); });
  }
  if (tab === 2) {
    const tb = wt(b, 7);
    for (let i = 0; i < 5; i++) { const k = pop(t, tb - 0.15 + i * 0.08, 0.35); if (k > 0) at(x + 400 + i * 86, y + 700, k, 0, () => { glow('rgba(250,204,21,0.9)', 26); star(0, 0, 38, '#FACC15'); noGlow(); }); }
    withAlpha(ease(t, tb + 0.3, 0.4), () => text('"Better than yours."  — the README', x + 330, y + 800, { size: 32, font: F.body, color: '#FDE68A' }));
  }
  robot(x + w - 120, y + h - 120, 0.46, { t, mood: 'happy', acc: P.a, armL: 1.2 + Math.sin(t * 20) * 0.2, armR: 1.2 + Math.cos(t * 20) * 0.2 });
};

SC.time = (t, s, P) => {
  const [a, b] = ids(s);
  text('TIME TO SHIP ONE FEATURE', 540, 350, { size: 40, font: F.cond, color: GRAY, align: 'center' });
  const rows = [
    { y: 400, year: '2022', ty: s.start + 0.1, tb: wt(a, 3) - 0.1, frac: 1, label: '2 WEEKS', col: '#F59E0B' },
    { y: 720, year: '2026', ty: wt(b, 0) - 0.2, tb: wt(b, 3) - 0.1, frac: 0.03, label: '4 MINUTES', col: rgba(P.a) },
  ];
  rows.forEach(r => {
    const ky = ease(t, r.ty, 0.45); if (ky <= 0) return;
    withAlpha(ky, () => {
      card(80, r.y, 920, 280);
      text(r.year, 130, r.y + 110, { size: 84, font: F.cond, weight: '900', color: r.col });
      const kb = expoOut(lin(t, r.tb, 0.9)), bw = 820 * r.frac * kb;
      fillRR(130, r.y + 160, 820, 70, 35, 'rgba(255,255,255,0.06)');
      if (bw > 1) { glow(r.col, 24); fillRR(130, r.y + 160, Math.max(70 * kb, bw), 70, 35, r.col); noGlow(); }
      withAlpha(kb, () => text(r.label, r.frac > 0.5 ? 130 + bw - 30 : 130 + Math.max(70, bw) + 30, r.y + 210, { size: 44, font: F.cond, weight: '900', color: r.frac > 0.5 ? '#111' : '#fff', align: r.frac > 0.5 ? 'right' : 'left' }));
    });
  });
  const kd = pop(t, wt(b, 3) + 0.3, 0.4);
  if (kd > 0) at(820, 820, kd, -0.08, () => pill(0, 0, '-99.98%', { size: 40, bg: 'rgba(34,197,94,0.2)', border: '#22C55E', color: '#86EFAC', align: 'center' }));
  const kq = pop(t, wt(b, 5) - 0.1, 0.45);
  if (kq > 0) {
    ['?', '?', '?'].forEach((q, i) => withAlpha(kq, () => text(q, 360 + i * 180, 1130 - Math.abs(Math.sin(t * 5 + i)) * 24 - (i === 1 ? 50 : 0), { size: i === 1 ? 140 : 100, font: F.cond, weight: '900', color: rgba(i === 1 ? P.b : P.a), align: 'center', glow: rgba(P.a, 0.6) })));
  }
};

SC.status = (t, s, P) => {
  const [a, b] = ids(s), tOff = wt(a, 1), tE = wt(a, 4), tK = wt(a, 7), tS = wt(b, 2), tW = wt(b, 8);
  card(110, 290, 860, 935);
  c.save(); c.beginPath(); c.arc(540, 520, 165, 0, TAU); c.clip();
  c.fillStyle = lg(0, 355, 0, 685, [[0, rgba(P.a, 0.5)], [1, rgba(P.b, 0.3)]]); c.fillRect(370, 350, 340, 340);
  dev(540, 520, 0.95, { t, mood: t > tOff ? 'sleep' : 'neutral', hood: '#0E7490' });
  c.restore();
  ring(540, 520, 165, 'rgba(255,255,255,0.25)', 4);
  const pulse = (t * 1.2) % 1;
  withAlpha(1 - pulse, () => ring(660, 640, 34 + pulse * 40, '#22C55E', 6));
  circle(660, 640, 38, '#111320'); glow('#22C55E', 30); circle(660, 640, 28, '#22C55E'); noGlow();
  if (t > tOff) for (let i = 0; i < 3; i++) { const ph = (t * 0.6 + i / 3) % 1; withAlpha(Math.sin(ph * Math.PI), () => text('z', 650 + ph * 90, 400 - ph * 120, { size: 40 + i * 12, font: F.cond, weight: '900', color: '#C4B5FD' })); }
  text('You', 540, 770, { size: 58, align: 'center' });
  const strike = ease(t, tW - 0.1, 0.3), kNew = pop(t, tW + 0.1, 0.45);
  const title = t > tS ? 'Senior Software Engineer' : 'Software Engineer';
  withAlpha(1 - kNew * 0.5, () => {
    text(title, 540, 830, { size: 36, font: F.body, color: GRAY, align: 'center' });
    if (strike > 0) { const tw2 = tw(title, 36, F.body); line(540 - tw2 / 2 - 10, 818, 540 - tw2 / 2 - 10 + (tw2 + 20) * strike, 818, '#EF4444', 6); }
  });
  if (kNew > 0) at(540, 900, kNew, -0.04, () => pill(0, 0, 'SENIOR SCREEN WATCHER', { size: 40, font: F.cond, weight: '900', bg: rgba(P.a, 0.25), border: rgba(P.a), align: 'center', glow: rgba(P.a, 0.6) }));
  const k1 = ease(t, tE - 0.1, 0.4);
  withAlpha(k1, () => {
    fillRR(170, 980, 740, 2, 1, 'rgba(255,255,255,0.08)');
    circle(200, 1030, 12, '#22C55E');
    text('Active', 226, 1042, { size: 34, color: '#86EFAC' });
    text('(actually asleep since 11:00 AM)', 350, 1042, { size: 30, font: F.body, color: GRAY });
  });
  const k2 = ease(t, tK - 0.1, 0.4);
  withAlpha(k2, () => {
    at(220, 1130, 1, Math.sin(t * 30) * 0.12, () => { fillRR(-24, -36, 48, 72, 24, '#E2E8F0'); line(0, -36, 0, -10, '#94A3B8', 3); });
    text('Mouse jiggler:', 270, 1142, { size: 34, font: F.body, color: GRAY });
    pill(500, 1130, 'ON', { size: 30, bg: 'rgba(34,197,94,0.25)', border: '#22C55E', color: '#86EFAC' });
  });
};

// ---------------- pre-chorus ----------------
SC.linkedin = (t, s, P) => {
  const a = s.L[0].id, tx = wr(a, /ten-x/);
  const x = 80, y = 300, w = 920, h = 900;
  card(x, y, w, h, { fill: '#F8FAFC', stroke: 'rgba(0,0,0,0.05)', r: 30 });
  c.save(); c.beginPath(); c.arc(x + 100, y + 100, 56, 0, TAU); c.clip(); c.fillStyle = '#CBD5E1'; c.fillRect(x + 40, y + 40, 120, 120);
  dev(x + 100, y + 112, 0.42, { t, mood: 'happy', hair: '#B45309', hood: '#111827', tie: '#DC2626', glasses: false, beard: false, dog: true }); c.restore();
  text('Chad Visionary', x + 180, y + 92, { size: 38, color: '#0F172A' });
  text('CEO @ AgentCorp  •  Thought Leader  •  1m', x + 180, y + 134, { size: 24, font: F.body, color: '#64748B' });
  fillRR(x + w - 110, y + 50, 64, 64, 12, '#0A66C2'); text('in', x + w - 78, y + 98, { size: 44, font: F.ui, color: '#fff', align: 'center' });
  text('Thrilled to announce that we are now', x + 60, y + 250, { size: 36, font: F.body, color: '#0F172A' });
  const k = pop(t, tx - 0.05, 0.5);
  if (k > 0) at(x + w / 2, y + 470, lerp(0.3, 1, k), Math.sin(t * 9) * 0.02 * k, () => text('10x', 0, 0, { size: 300, font: F.cond, weight: '900', align: 'center', color: lg(-200, -250, 200, 0, [[0, '#0A66C2'], [1, '#7C3AED']]) }));
  withAlpha(ease(t, tx + 0.25, 0.4), () => {
    text('more productive with AI.', x + 60, y + 560, { size: 36, font: F.body, color: '#0F172A' });
    text('#AI  #Agents  #Efficiency  #Layoffs', x + 60, y + 620, { size: 32, font: F.body, color: '#0A66C2' });
  });
  fillRR(x + 40, y + 690, w - 80, 2, 1, '#E2E8F0');
  [['#0A66C2', 0], ['#DF704D', 1], ['#44712E', 2]].forEach(([col, i]) => { circle(x + 80 + i * 34, y + 760, 24, col); ring(x + 80 + i * 34, y + 760, 24, '#F8FAFC', 4); });
  text(num(48213 * easeOut(lin(t, s.start + 0.3, 2.8))), x + 200, y + 772, { size: 34, color: '#334155' });
  text('2,394 comments  •  "Agree?"', x + w - 60, y + 772, { size: 28, font: F.body, color: '#64748B', align: 'right' });
  text('Like        Comment        Repost        Send', x + w / 2, y + 860, { size: 28, color: '#64748B', align: 'center' });
  for (let i = 0; i < 8; i++) {
    const ph = (t - tx) * 0.9 - i * 0.12; if (ph < 0 || ph > 1) continue;
    withAlpha(1 - ph, () => circle(x + w - 100 - 40 * Math.sin(i * 2), y + 760 - ph * 500, 20 + 6 * hash(i), ['#0A66C2', '#DF704D', '#44712E'][i % 3]));
  }
};

SC.fired = (t, s, P) => {
  const a = s.L[0].id, tf = wr(a, /fired/), twk = wr(a, /work/) - 0.2;
  text('THE TEAM', 540, 350, { size: 40, font: F.cond, color: GRAY, align: 'center' });
  const names = ['AK', 'MS', 'JL', 'PR', 'TS', 'NV', 'RG', 'DB'], cols = ['#F97316', '#10B981', '#6366F1', '#EC4899', '#0EA5E9', '#EAB308', '#8B5CF6', '#14B8A6'];
  const fired = [0, 2, 5, 7];
  names.forEach((n, i) => {
    const gx = 195 + (i % 4) * 230, gy = 500 + Math.floor(i / 4) * 230;
    const fi = fired.indexOf(i);
    if (fi < 0) { withAlpha(t > twk ? 0.35 : 1, () => avatarCircle(gx, gy, 82, cols[i], n)); return; }
    const kx = pop(t, tf + fi * 0.1, 0.3), kf = easeIn(lin(t, tf + 0.45 + fi * 0.1, 0.7));
    withAlpha(1 - kf, () => at(gx, gy + kf * 600, 1, kf * (fi % 2 ? 1.4 : -1.4), () => {
      avatarCircle(0, 0, 82, cols[i], n);
      if (kx > 0) at(56, -56, kx, 0, () => crossBadge(0, 0, 30));
    }));
  });
  withAlpha(ease(t, tf + 0.5, 0.4), () => pill(540, 790, 'LAID OFF: 50%  •  "RIGHTSIZED"', { size: 30, bg: 'rgba(239,68,68,0.2)', border: '#EF4444', color: '#FCA5A5', align: 'center' }));
  // the survivor receives everyone's tickets
  const ky = pop(t, tf + 0.6, 0.45);
  if (ky > 0) at(540, 1050, ky, 0, () => {
    glow(rgba(P.a), 40); circle(0, 0, 112, rgba(P.a)); noGlow();
    c.save(); c.beginPath(); c.arc(0, 0, 104, 0, TAU); c.clip(); c.fillStyle = '#1E293B'; c.fillRect(-110, -110, 220, 220);
    dev(0, 20, 0.62, { t, mood: t > twk + 0.4 ? 'shock' : 'neutral' }); c.restore();
    text('YOU', 0, 150, { size: 34, font: F.cond, weight: '900', align: 'center' });
  });
  let arrived = 0;
  for (let i = 0; i < 16; i++) {
    const src = fired[i % 4], gx = 195 + (src % 4) * 230, gy = 500 + Math.floor(src / 4) * 230;
    const k = easeInOut(lin(t, twk + i * 0.07, 0.6)); if (k <= 0) continue;
    if (k >= 1) { arrived++; continue; }
    const px = lerp(gx, 540, k), py = lerp(gy, 1050, k) - Math.sin(k * Math.PI) * 200;
    at(px, py, 1, (k - 0.5) * 2, () => { fillRR(-60, -30, 120, 60, 10, '#fff'); fillRR(-60, -30, 12, 60, 6, '#2563EB'); text(`JIRA-${120 + i}`, 6, 8, { size: 18, font: F.mono, color: '#1E293B', align: 'center' }); });
  }
  if (arrived > 0) at(650, 960, 1 + bump(t, twk + 0.6 + arrived * 0.07, 0.15) * 0.2, 0, () => { circle(0, 0, 44, '#EF4444'); text(String(arrived * 3), 0, 14, { size: 38, font: F.cond, weight: '900', align: 'center' }); });
};

function babysit(t, s, P, two) {
  const [a, b] = ids(s), tc = wr(b, /confident/), tp = wr(b, /polite/), tw2 = wr(b, /wrong/);
  pill(540, 330, two ? 'NEW ROLE: BOT DRIVER' : 'NEW ROLE: BOT BABYSITTER', { size: 34, font: F.cond, weight: '900', bg: rgba(P.a, 0.22), border: rgba(P.a), align: 'center' });
  robot(540, 590, 0.95, { t, mood: t > tw2 ? 'happy' : 'normal', acc: P.a, pacifier: !two, wheel: two, armL: two ? 1.2 : 0.3, armR: two ? 1.2 : 0.3 });
  if (!two) {
    for (let i = 0; i < 10; i++) fillRR(310 + i * 50, 700, 14, 190, 7, 'rgba(255,255,255,0.85)');
    fillRR(290, 690, 500, 22, 11, '#F9A8D4'); fillRR(290, 880, 500, 22, 11, '#F9A8D4');
    const k = ease(t, wt(a, 5) - 0.1, 0.4);
    withAlpha(k, () => at(820, 520, 1, Math.sin(t * 8) * 0.3, () => { line(0, 0, 0, 90, '#FDE68A', 10); circle(0, 0, 30, '#F472B6'); circle(0, 0, 14, '#FDE68A'); }));
  } else {
    const k = ease(t, wr(a, /steering/) - 0.1, 0.4);
    withAlpha(k, () => { text('AUTOPILOT', 540, 905, { size: 30, font: F.cond, color: '#FCA5A5', align: 'center' }); pill(540, 945, 'NO BRAKES', { size: 22, bg: 'rgba(239,68,68,0.25)', align: 'center' }); });
  }
  card(100, 970, 880, 250);
  meter(150, 1030, 780, 'CONFIDENCE', ease(t, tc - 0.1, 0.6), '#22C55E');
  meter(150, 1100, 780, 'POLITENESS', ease(t, tp - 0.1, 0.6), '#38BDF8');
  meter(150, 1170, 780, 'ACCURACY', ease(t, tw2 - 0.1, 0.6) * 0.12, '#EF4444', { valueLabel: t > tw2 ? '12%' : '—' });
}
SC.babysit = (t, s, P) => babysit(t, s, P, false);
SC.babysit2 = (t, s, P) => babysit(t, s, P, true);

// ---------------- chorus ----------------
function yarBubble(t, P, x, y, t0, sc = 1, tailTo = null) {
  const k = pop(t, t0 - 0.1, 0.45); if (k <= 0) return;
  at(x, y, k * sc, Math.sin(t * 3) * 0.01, () => {
    bubble(-330, -125, 660, 230, tailTo);
    text("You're absolutely", 0, -30, { size: 56, color: '#0F172A', align: 'center' });
    text('RIGHT!', 0, 70, { size: 104, font: F.cond, weight: '900', align: 'center', color: lg(0, -10, 0, 80, [[0, rgba(P.a)], [1, rgba(P.b)]]) });
  });
}
SC.prod = (t, s, P) => {
  const [a, b] = ids(s), tY = wt(a, 0), tDel = wr(b, /deleted/), tProd = wr(b, /prod/);
  const talk = t > tY && t < wre(a, /right/) ? voice(t) : 0;
  robot(210, 470, 0.72, { t, mood: 'happy', acc: P.a, talk });
  yarBubble(t, P, 680, 430, tY, 0.85, [-420, 40]);
  const red = t > tProd ? 0.5 + 0.5 * Math.sin(t * 14) : 0;
  win(70, 700, 940, 520, 'zsh — production', { fill: 'rgba(8,10,16,0.96)', glowCol: red ? `rgba(239,68,68,${0.4 + 0.5 * red})` : null });
  const L = [
    ['$ agent "fix the flaky login test"', '#E2E8F0', s.start + 0.15, tY - 0.1],
    ['> Sure! Cleaning up unused stuff...', '#94A3B8', tY + 0.4, tDel - 0.5],
    ['> DROP DATABASE production;', '#F87171', tDel - 0.35, tDel + 0.1],
    ['ERROR: 0 rows. 0 tables. 0 hope.', '#EF4444', tProd, tProd + 0.15],
    ['> Done! Anything else? :)', rgba(P.a), tProd + 0.7, tProd + 1.1],
  ];
  L.forEach(([str, col, t0, t1], i) => { const sh = typed(str, t, t0, t1); if (sh) text(sh, 110, 840 + i * 64, { size: 31, font: F.mono, color: col }); });
  if (t > tProd) {
    withAlpha(0.18 * red, () => fillRR(70, 700, 940, 520, 34, '#EF4444'));
    stamp(540, 1110, 'PROD DELETED', '#EF4444', lin(t, tProd, 0.3), -0.08, 96);
  }
};
SC.sorry = (t, s, P) => {
  const [a, b] = ids(s), tY = wt(a, 0), tA = wr(b, /apolog/), tG = wr(b, /god/i);
  const kr = ease(t, tA - 0.3, 0.9);
  if (kr > 0) withAlpha(kr, () => at(540, 240, 1, t * 0.08, () => {
    const g = c.createRadialGradient(0, 0, 0, 0, 0, 1300); g.addColorStop(0, 'rgba(253,230,138,0.5)'); g.addColorStop(1, 'rgba(253,230,138,0)');
    c.fillStyle = g;
    for (let i = 0; i < 16; i++) { const an = i / 16 * TAU; c.beginPath(); c.moveTo(0, 0); c.arc(0, 0, 1300, an, an + 0.13); c.closePath(); c.fill(); }
  }));
  const talk = t > tY && t < wre(a, /right/) ? voice(t) : 0;
  robot(540, 600, 1.05, { t, mood: 'sorry', acc: t > tA ? '#FDE68A' : P.a, halo: t > tA - 0.1, talk, armL: t > tA ? 2.6 : 0.25, armR: t > tA ? 2.6 : 0.25 });
  if (t > tG) for (let i = 0; i < 9; i++) { const an = i / 9 * TAU + t, r = 260 + 30 * Math.sin(t * 3 + i); withAlpha(ease(t, tG, 0.3), () => star(540 + Math.cos(an) * r, 520 + Math.sin(an) * r * 0.6, 12 + 6 * Math.sin(t * 6 + i), '#FDE68A')); }
  const kb = pop(t, tY - 0.1, 0.45);
  if (kb > 0) at(540, 1060, kb, 0, () => {
    bubble(-420, -120, 840, 240, [0, -200]);
    text("You're absolutely right!", 0, -36, { size: 52, color: '#0F172A', align: 'center' });
    withAlpha(ease(t, tA - 0.1, 0.4), () => {
      text('I sincerely apologize for', 0, 26, { size: 36, font: F.body, color: '#334155', align: 'center' });
      text('deleting production.', 0, 76, { size: 36, font: F.body, color: '#334155', align: 'center' });
    });
  });
};
SC.diff = (t, s, P) => {
  const [a, b] = ids(s), tw1 = wr(a, /rewrote/), tth = wt(b, 0), tH = wr(b, /hope/i), tGo = wr(b, /go/);
  card(70, 290, 940, 935);
  circle(130, 368, 26, '#22C55E'); line(122, 352, 122, 384, '#fff', 5); circle(122, 352, 6, '#fff'); circle(138, 360, 6, '#fff');
  text('fix: one tiny bug', 176, 384, { size: 46 });
  text('#4021', 176 + tw('fix: one tiny bug', 46) + 20, 384, { size: 40, font: F.body, color: DIM });
  text('AI Agent wants to merge 1 commit into main', 110, 444, { size: 28, font: F.body, color: GRAY });
  const files = t < tw1 ? 1 : 1 + 1283 * easeOut(lin(t, tw1, 1.4));
  text('FILES CHANGED', 110, 520, { size: 28, font: F.cond, color: DIM });
  text(num(files), 110, 620, { size: 110, font: F.cond, weight: '900', color: files > 2 ? '#FDE68A' : '#fff' });
  const kk = easeOut(lin(t, tth - 0.1, 0.9));
  text('+' + num(10000 * kk), 640, 560, { size: 64, font: F.cond, weight: '900', color: '#4ADE80', align: 'left' });
  text('–' + num(9998 * kk), 640, 630, { size: 64, font: F.cond, weight: '900', color: '#F87171', align: 'left' });
  const p = lin(t, tw1, 2.6), cols = 17, rows = 7, N = cols * rows;
  for (let i = 0; i < N; i++) {
    const cx = 110 + (i % cols) * 50, cy = 670 + Math.floor(i / cols) * 50, on = p > i / N;
    const h = hash(i, 7);
    fillRR(cx, cy, 40, 40, 8, on ? (h > 0.45 ? `rgba(74,222,128,${0.35 + 0.6 * h})` : `rgba(248,113,113,${0.4 + 0.5 * h})`) : 'rgba(255,255,255,0.05)');
  }
  const kc = pop(t, tH - 0.15, 0.4);
  if (kc > 0) at(540, 1105, kc, 0, () => {
    fillRR(-430, -70, 860, 140, 30, 'rgba(255,255,255,0.06)');
    fillRR(-405, -44, 88, 88, 22, rgba(P.a, 0.25));
    robot(-361, -2, 0.3, { t, body: false, shadow: false, mood: 'happy', acc: P.a, bob: 0 });
    text('Hope this helps! Let\'s go!', -290, 14, { size: 44 });
  });
  const kr = lin(t, tGo - 0.1, 1.1);
  if (kr > 0 && kr < 1) {
    const rx = lerp(900, 1000, kr), ry = lerp(1100, 200, easeIn(kr));
    for (let i = 0; i < 14; i++) withAlpha((1 - i / 14) * 0.5, () => circle(rx - i * 4, ry + 90 + i * 30, 18 - i, '#FB923C'));
    rocket(rx, ry, 0.85, 0.1, t);
  }
};
SC.badge = (t, s, P) => {
  const a = s.L[0].id, tp = wr(a, /prompt/), tf = wr(a, /formerly/), td = wr(a, /dev/);
  const lt = t - s.start, sw = Math.sin(lt * 2.4) * 0.09 * Math.exp(-lt * 0.5) + 0.025 * Math.sin(t * 1.4) + bump(t, tp, 0.5) * 0.06;
  at(540, 230, 1, sw, () => {
    c.beginPath(); c.moveTo(-170, 0); c.lineTo(-24, 240); c.moveTo(170, 0); c.lineTo(24, 240); c.strokeStyle = rgba(P.a); c.lineWidth = 22; c.stroke();
    fillRR(-34, 226, 68, 50, 10, '#94A3B8');
    c.save(); c.shadowColor = 'rgba(0,0,0,0.5)'; c.shadowBlur = 50; c.shadowOffsetY = 24; fillRR(-280, 260, 560, 730, 40, '#F8FAFC'); c.restore();
    c.save(); rr(-280, 260, 560, 730, 40); c.clip();
    c.fillStyle = lg(-280, 0, 280, 0, [[0, rgba(P.a)], [1, rgba(P.b)]]); c.fillRect(-280, 260, 560, 150);
    c.restore();
    fillRR(-40, 290, 80, 20, 10, 'rgba(0,0,0,0.25)');
    text('AGENTCORP', 0, 375, { size: 46, font: F.cond, weight: '900', align: 'center' });
    c.save(); rr(-110, 440, 220, 230, 26); c.clip(); c.fillStyle = '#CBD5E1'; c.fillRect(-110, 440, 220, 230); dev(0, 560, 0.78, { t, mood: t > td ? 'sad' : 'neutral' }); c.restore();
    text('YOU', 0, 750, { size: 80, font: F.cond, weight: '900', color: '#0F172A', align: 'center' });
    const kp = pop(t, tp - 0.05, 0.45);
    withAlpha(1 - clamp(kp * 2), () => text('SOFTWARE DEVELOPER', 0, 820, { size: 40, font: F.cond, color: '#475569', align: 'center' }));
    if (kp > 0) at(0, 812, lerp(1.8, 1, easeOut(kp)), -0.03, () => withAlpha(clamp(kp * 2), () => {
      fillRR(-240, -46, 480, 70, 14, rgba(P.a)); text('PROMPT ENGINEER', 0, 10, { size: 46, font: F.cond, weight: '900', align: 'center' });
    }));
    const kf = ease(t, tf - 0.05, 0.35);
    withAlpha(kf, () => {
      text('formerly known as:', 0, 892, { size: 28, font: F.body, color: '#64748B', align: 'center' });
      text('Developer', 0, 942, { size: 38, color: '#334155', align: 'center' });
      const ks = ease(t, td, 0.25); if (ks > 0) line(-100, 930, -100 + 200 * ks, 930, '#EF4444', 6);
    });
  });
};
SC.accept = (t, s, P) => {
  const a = s.L[0].id, tTab = wr(a, /^tab$/i);
  const acc = []; s.L.forEach(l => l.words.forEach(w => { if (/accept/i.test(w.text)) acc.push(w.start); }));
  const n = acc.filter(x => t >= x - 0.02).length, last = acc[n - 1] ?? -9;
  const COUNTS = [0, 1, 10, 100, 1000, 10000, 99999];
  text('SUGGESTIONS ACCEPTED', 540, 350, { size: 36, font: F.cond, color: GRAY, align: 'center' });
  at(540, 470, 1 + bump(t, last, 0.2) * 0.25, 0, () => text(num(COUNTS[Math.min(n, 6)]) + (n >= 6 ? '+' : ''), 0, 50, { size: 150, font: F.cond, weight: '900', align: 'center', color: '#4ADE80', glow: 'rgba(74,222,128,0.7)', blur: 30 }));
  // keycap
  const kt = bump(t, tTab, 0.22);
  at(300, 690, 1, 0, () => {
    fillRR(-150, -70 + 16, 300, 140, 26, '#475569');
    fillRR(-150, -70 + kt * 14, 300, 140, 26, lg(0, -70, 0, 70, [[0, '#F1F5F9'], [1, '#CBD5E1']]));
    text('TAB', -100, 20 + kt * 14, { size: 54, font: F.cond, weight: '900', color: '#334155' });
    line(40, 0 + kt * 14, 100, 0 + kt * 14, '#334155', 8); line(80, -18 + kt * 14, 100, 0 + kt * 14, '#334155', 8); line(80, 18 + kt * 14, 100, 0 + kt * 14, '#334155', 8); line(108, -24 + kt * 14, 108, 24 + kt * 14, '#334155', 8);
  });
  withAlpha(ease(t, tTab, 0.3), () => text('+', 540, 714, { size: 90, font: F.cond, weight: '900', color: GRAY, align: 'center' }));
  at(780, 690, 1, 0, () => {
    fillRR(-150, -70 + 16, 300, 140, 26, '#475569');
    fillRR(-150, -70, 300, 140, 26, lg(0, -70, 0, 70, [[0, '#F1F5F9'], [1, '#CBD5E1']]));
    text('ENTER', 0, 20, { size: 54, font: F.cond, weight: '900', color: '#334155', align: 'center' });
  });
  const press = Math.max(0, ...acc.map(x => bump(t, x - 0.02, 0.2)));
  button(140, 860, 800, 220, 'ACCEPT', { bg: '#16A34A', edge: '#14532D', press, size: 110, font: F.cond, glow: `rgba(74,222,128,${0.4 + press * 0.6})` });
  acc.forEach((x, i) => {
    ripple(540, 970, lin(t, x, 0.6), '#4ADE80', 520);
    const k = lin(t, x, 1.1); if (k <= 0 || k >= 1) return;
    withAlpha(1 - k, () => at(540 + (i % 2 ? 1 : -1) * (120 + 80 * hash(i)), 860 - easeOut(k) * 420, 1, (i % 2 ? 0.1 : -0.1), () => {
      fillRR(-170, -36, 340, 72, 18, 'rgba(22,163,74,0.9)'); text(`+${num(800 + hash(i, 3) * 4000)} lines`, 0, 14, { size: 36, font: F.mono, align: 'center' });
    }));
  });
  cursorArrow(640, 1000, 1.1, press);
};
SC.ship = (t, s, P) => {
  const a = s.L[0].id, tS = wt(a, 0), tSh = wr(a, /shipping/), tF = wr(a, /fast/);
  card(80, 290, 920, 480);
  text('JOB SECURITY INDEX', 130, 360, { size: 34, font: F.cond, color: GRAY });
  const p = easeInOut(lin(t, tS - 0.1, 1.8)), pts = [];
  for (let i = 0; i <= 40; i++) { const u = i / 40, v = 0.15 + 0.7 * Math.pow(u, 1.6) + 0.06 * Math.sin(i * 1.7) * (1 - u); pts.push([130 + u * 820, 410 + v * 300]); }
  const nShow = Math.max(1, Math.floor(p * 40));
  c.beginPath(); c.moveTo(pts[0][0], 720); for (let i = 0; i <= nShow; i++) c.lineTo(pts[i][0], pts[i][1]); c.lineTo(pts[nShow][0], 720); c.closePath();
  c.fillStyle = lg(0, 400, 0, 720, [[0, 'rgba(239,68,68,0.35)'], [1, 'rgba(239,68,68,0)']]); c.fill();
  c.beginPath(); for (let i = 0; i <= nShow; i++) i ? c.lineTo(pts[i][0], pts[i][1]) : c.moveTo(pts[i][0], pts[i][1]);
  glow('rgba(239,68,68,0.8)', 20); c.strokeStyle = '#EF4444'; c.lineWidth = 8; c.lineJoin = 'round'; c.stroke(); noGlow();
  circle(pts[nShow][0], pts[nShow][1], 14, '#EF4444');
  if (p > 0.95) pill(pts[40][0] - 10, pts[40][1] - 60, '-87%', { size: 36, bg: '#EF4444', align: 'right' });
  card(80, 800, 920, 400);
  for (let i = 0; i < 12; i++) { const yy = 850 + hash(i, 9) * 320, len = 80 + hash(i, 8) * 200, xx = 1000 - ((t * (900 + hash(i) * 600) + hash(i, 2) * 900) % 1100); withAlpha(ease(t, tSh - 0.2, 0.3) * 0.4, () => line(xx, yy, xx + len, yy, rgba(P.a), 4)); }
  text('DEPLOYS TODAY', 130, 870, { size: 34, font: F.cond, color: GRAY });
  text(num(lerp(3, 147, easeOut(lin(t, tSh - 0.1, 1.3)))), 130, 1030, { size: 170, font: F.cond, weight: '900', color: '#4ADE80', glow: 'rgba(74,222,128,0.6)', blur: 30 });
  text('tests: vibes', 130, 1110, { size: 32, font: F.mono, color: GRAY });
  const kr = lin(t, tF - 0.3, 1.0);
  if (kr > 0 && kr < 1) rocket(lerp(-120, 1200, easeIn(kr)), 1020 - kr * 120, 0.9, Math.PI / 2 - 0.15, t);
};
SC.money = (t, s, P) => {
  const a = s.L[0].id, tE = wr(a, /end/), tL = wr(a, /lasts/);
  const word = 'VIBE CODING';
  c.font = font(F.cond, 140, '900'); const total = c.measureText(word).width;
  let xx = 540 - total / 2;
  for (let i = 0; i < word.length; i++) {
    const ch = word[i], wch = c.measureText(ch).width, k = pop(t, s.start + 0.1 + i * 0.04, 0.4);
    if (k > 0) at(xx + wch / 2, 430 + Math.sin(t * 6 + i * 0.7) * 16, k, Math.sin(t * 4 + i) * 0.06, () => text(ch, 0, 0, { size: 140, font: F.cond, weight: '900', align: 'center', color: rgba(i % 2 ? P.a : P.b), glow: rgba(i % 2 ? P.a : P.b, 0.6), blur: 26 }));
    xx += wch;
  }
  const k = easeInOut(lin(t, tE - 0.2, tL - tE + 0.6)), bal = lerp(48210, 312, k);
  at(540, 760, 1, -0.04 + Math.sin(t * 1.5) * 0.015, () => {
    c.save(); c.shadowColor = 'rgba(0,0,0,0.6)'; c.shadowBlur = 60; c.shadowOffsetY = 30;
    fillRR(-390, -230, 780, 460, 40, lg(-390, -230, 390, 230, [[0, '#312E81'], [0.5, '#6D28D9'], [1, '#DB2777']])); c.restore();
    fillRR(-390, -230, 780, 460, 40, lg(0, -230, 0, 230, [[0, 'rgba(255,255,255,0.18)'], [0.5, 'rgba(255,255,255,0)']]));
    fillRR(-320, -150, 100, 76, 14, lg(-320, -150, -220, -74, [[0, '#FDE68A'], [1, '#CA8A04']]));
    text('SAVINGS', 320, -110, { size: 34, font: F.cond, color: 'rgba(255,255,255,0.75)', align: 'right' });
    text('$' + num(bal), -320, 70, { size: 130, font: F.cond, weight: '900', color: bal < 5000 ? '#FCA5A5' : '#fff' });
    text('••••  ••••  ••••  2026', -320, 170, { size: 36, font: F.mono, color: 'rgba(255,255,255,0.8)' });
  });
  for (let i = 0; i < 10; i++) { const ph = (t - tE) * 0.8 - i * 0.15; if (ph < 0 || ph > 1) continue; withAlpha(1 - ph, () => text('$', 260 + hash(i) * 560, 1000 + ph * 200, { size: 56, font: F.cond, weight: '900', color: '#4ADE80', align: 'center' })); }
  card(110, 1080, 860, 130, { r: 30 });
  text('API BILL', 160, 1160, { size: 36, font: F.cond, color: GRAY });
  text('$' + num(lerp(120, 9840, k)), 920, 1165, { size: 66, font: F.cond, weight: '900', color: '#F87171', align: 'right' });
};

// ---------------- verse 2 ----------------
SC.standup = (t, s, P) => {
  const [a, b] = ids(s);
  win(70, 290, 940, 935, 'Daily Standup — 9:30 AM');
  const people = ['#F97316', '#10B981', '#6366F1', '#EC4899'];
  people.forEach((col, i) => withAlpha(0.35, () => circle(150 + i * 70, 430, 30, col)));
  fillRR(440, 395, 74, 74, 20, rgba(P.a, 0.3)); robot(477, 434, 0.26, { t, body: false, shadow: false, mood: 'happy', acc: P.a, bob: 0 });
  text('AI Agent (host)', 530, 444, { size: 28, font: F.body, color: GRAY });
  const rows = [
    ['YESTERDAY', 'AI did some stuff.', wr(a, /yesterday/i), wre(a, /stuff/), '#fff'],
    ['TODAY', "AI's doing more stuff.", wt(b, 0), wre(b, /more/), '#fff'],
    ['BLOCKERS', 'Out of tokens.', wr(b, /blocker/), wre(b, /enough/), '#F87171'],
  ];
  rows.forEach(([lab, val, t0, t1, col], i) => {
    const y = 520 + i * 210, k = ease(t, t0 - 0.3, 0.4);
    withAlpha(0.3 + 0.7 * k, () => {
      fillRR(110, y, 860, 180, 26, 'rgba(255,255,255,0.04)');
      fillRR(110, y, 10, 180, 5, i === 2 ? '#EF4444' : rgba(P.a));
      text(lab, 150, y + 60, { size: 32, font: F.cond, color: DIM });
      const sh = typed(val, t, t0, t1);
      text(sh, 150, y + 135, { size: 54, color: col });
      if (sh.length && sh.length < val.length) fillRR(154 + tw(sh, 54), y + 92, 4, 56, 2, rgba(P.a));
    });
  });
  const kt = ease(t, wr(b, /tokens/) - 0.1, 0.4);
  if (kt > 0) withAlpha(kt, () => {
    fillRR(150, 1160, 780, 22, 11, 'rgba(255,255,255,0.08)');
    if ((t * 4 | 0) % 2) fillRR(150, 1160, 18, 22, 9, '#EF4444');
    text('0 / 1,000,000 tokens left', 930, 1145, { size: 26, font: F.mono, color: '#FCA5A5', align: 'right' });
  });
};
SC.leetcode = (t, s, P) => {
  const [a, b] = ids(s), ti = wr(a, /invert/), tr = wr(b, /robot/), th = wr(b, /hire/);
  card(70, 290, 940, 935);
  text('226. Invert Binary Tree', 110, 380, { size: 46 });
  pill(970, 368, 'Medium', { size: 26, bg: 'rgba(245,158,11,0.2)', color: '#FBBF24', align: 'right' });
  text('Interview round 7 of 9  •  45:00', 110, 430, { size: 28, font: F.body, color: GRAY });
  const N = [[540, 560, 4], [330, 730, 2], [750, 730, 7], [220, 900, 1], [440, 900, 3], [640, 900, 6], [860, 900, 9]];
  const k = easeInOut(lin(t, ti - 0.1, 1.1));
  const pos = N.map(([x, y, v]) => [lerp(x, 1080 - x, k), y - Math.sin(k * Math.PI) * 50 * (y > 600 ? 1 : 0.4), v]);
  [[0, 1], [0, 2], [1, 3], [1, 4], [2, 5], [2, 6]].forEach(([p, q]) => line(pos[p][0], pos[p][1], pos[q][0], pos[q][1], 'rgba(255,255,255,0.3)', 6));
  pos.forEach(([x, y, v], i) => {
    const kk = pop(t, s.start + 0.1 + i * 0.07, 0.4); if (kk <= 0) return;
    at(x, y, kk, 0, () => { glow(rgba(P.a, 0.7), 26); circle(0, 0, 58, lg(0, -58, 0, 58, [[0, rgba(P.a)], [1, rgba(P.b)]])); noGlow(); text(String(v), 0, 22, { size: 60, font: F.cond, weight: '900', align: 'center' }); });
  });
  const kr = pop(t, tr - 0.1, 0.4);
  if (kr > 0) at(540, 1110, kr, 0, () => {
    fillRR(-380, -60, 760, 120, 30, 'rgba(255,255,255,0.06)');
    fillRR(-360, -44, 88, 88, 22, rgba(P.a, 0.25)); robot(-316, -2, 0.3, { t, body: false, shadow: false, mood: 'happy', acc: P.a, bob: 0 });
    text('AI Agent: solved in 0.003s', -250, 14, { size: 38, font: F.body });
  });
  stamp(540, 740, 'NOT HIRED', '#EF4444', lin(t, th, 0.32), -0.14, 120);
};
SC.juniors = (t, s, P) => {
  const [a, b] = ids(s), tj = wr(a, /juniors/), tg = wr(a, /gpu/i), tB = wt(b, 0) - 0.1;
  const kA = 1 - ease(t, tB, 0.4), kB = ease(t, tB, 0.5);
  card(90, 290, 900, 330);
  text('Junior Software Engineer', 140, 380, { size: 48 });
  text('AgentCorp  •  Remote  •  Posted 400 days ago', 140, 430, { size: 27, font: F.body, color: GRAY });
  text('• 10+ years of AI agent experience', 140, 500, { size: 30, font: F.body, color: '#E2E8F0' });
  text('• Must work for tokens', 140, 550, { size: 30, font: F.body, color: '#E2E8F0' });
  const kj = pop(t, tj, 0.4);
  if (kj > 0) at(830, 520, kj, -0.1, () => pill(0, 0, '0 OPENINGS', { size: 34, font: F.cond, weight: '900', bg: '#EF4444', align: 'center', glow: 'rgba(239,68,68,0.6)' }));
  if (kA > 0) withAlpha(kA, () => {
    const kg = pop(t, tg - 0.25, 0.45); if (kg <= 0) return;
    chip(540, 860, kg, t, rgba(P.a));
    at(720, 990, kg, 0.12 + Math.sin(t * 2) * 0.04, () => { line(0, -60, -60, -150, '#3B82F6', 8); fillRR(-90, -60, 180, 110, 16, '#fff'); fillRR(-90, -60, 180, 30, 10, '#3B82F6'); text('INTERN', 0, 28, { size: 40, font: F.cond, weight: '900', color: '#0F172A', align: 'center' }); });
  });
  if (kB > 0) withAlpha(kB, () => {
    c.setLineDash([16, 14]);
    c.beginPath(); c.arc(540, 790, 90, 0, TAU); c.strokeStyle = 'rgba(255,255,255,0.6)'; c.lineWidth = 6; c.stroke();
    rr(400, 890, 280, 200, 100); c.stroke(); c.setLineDash([]);
    for (let i = 0; i < 6; i++) { const an = t * 1.4 + i / 6 * TAU; text('?', 540 + Math.cos(an) * 250, 860 + Math.sin(an) * 120, { size: 70, font: F.cond, weight: '900', color: rgba(i % 2 ? P.a : P.b), align: 'center' }); }
    text('SENIOR DEVS (2036)', 540, 1150, { size: 44, font: F.cond, weight: '900', align: 'center' });
    pill(540, 1195, '404: NOT FOUND', { size: 24, font: F.mono, bg: 'rgba(239,68,68,0.25)', color: '#FCA5A5', align: 'center' });
  });
};
const FILES = ['agent/brain.ts', 'agent/ego.ts', 'core/everything.ts', 'utils/whatever.js', 'db/migrate_prod.sql', 'auth/trust_me.ts', 'api/v7_final_final.ts', 'ui/Button2.tsx', 'tests/skip.test.ts', 'config/yolo.yaml'];
SC.review = (t, s, P) => {
  const [a, b] = ids(s), t3 = wr(a, /3/), tf = wr(a, /forty/i), tL = wt(b, 0);
  moon(900, 345, 52, '#FDE68A');
  [[700, 330], [620, 380], [780, 400]].forEach(([x, y], i) => star(x, y, 7 + 3 * Math.sin(t * 5 + i), 'rgba(253,230,138,0.8)'));
  const kc = pop(t, t3 - 0.1, 0.4);
  if (kc > 0) at(220, 350, kc, 0, () => pill(0, 0, '3:00 AM', { size: 44, font: F.cond, weight: '900', bg: rgba(P.a, 0.25), border: rgba(P.a), align: 'center' }));
  win(70, 430, 940, 640, 'PR #4022 — Files changed (40)');
  c.save(); c.beginPath(); c.rect(70, 506, 940, 560); c.clip();
  const off = easeInOut(lin(t, tf - 0.3, 2.6)) * (40 * 62 - 520);
  for (let i = 0; i < 40; i++) {
    const y = 560 + i * 62 - off; if (y < 470 || y > 1110) continue;
    fillRR(110, y - 30, 22, 28, 4, i % 3 ? '#3B82F6' : '#F59E0B');
    text('src/' + FILES[i % FILES.length], 150, y - 6, { size: 28, font: F.mono, color: '#E2E8F0' });
    text('+' + Math.round(100 + hash(i) * 900), 860, y - 6, { size: 28, font: F.mono, color: '#4ADE80', align: 'right' });
    text('−' + Math.round(hash(i, 2) * 400), 970, y - 6, { size: 28, font: F.mono, color: '#F87171', align: 'right' });
  }
  c.restore();
  stamp(540, 790, 'LGTM', '#22C55E', lin(t, tL - 0.05, 0.3), -0.12, 150);
  const kd = ease(t, s.start + 0.3, 0.4);
  withAlpha(kd, () => text('eyes: 4% open', 130, 1180, { size: 30, font: F.mono, color: GRAY }));
  const kr = pop(t, wr(b, /trust/) - 0.1, 0.4);
  if (kr > 0) at(800, 1160, kr, 0, () => pill(0, 0, 'reviewed in 4 sec', { size: 28, bg: 'rgba(34,197,94,0.2)', border: '#22C55E', color: '#86EFAC', align: 'center' }));
};

SC.podcast = (t, s, P) => {
  const a = s.L[0].id, td = wr(a, /coding/i);
  card(70, 290, 940, 760, { fill: '#0B0B12' });
  c.save(); rr(70, 290, 940, 760, 34); c.clip();
  c.fillStyle = lg(0, 290, 0, 1050, [[0, '#3B1D0F'], [1, '#0B0B12']]); c.fillRect(70, 290, 940, 760);
  for (let i = 0; i < 5; i++) circle(160 + i * 200, 420, 40, `rgba(251,146,60,${0.08 + 0.05 * Math.sin(t * 2 + i)})`);
  dev(470, 640, 1.05, { t, mood: 'happy', hair: '#A16207', hood: '#111827', headphones: true, glasses: false, beard: false, dog: true });
  line(760, 1060, 760, 820, '#1F2937', 14); line(760, 820, 690, 760, '#1F2937', 12);
  fillRR(640, 690, 90, 130, 45, '#374151'); for (let i = 0; i < 5; i++) line(652, 710 + i * 20, 718, 710 + i * 20, '#6B7280', 3);
  const kl = pop(t, td - 0.1, 0.45);
  if (kl > 0) at(540, 960, kl, 0, () => {
    fillRR(-440, -70, 880, 140, 18, lg(-440, 0, 440, 0, [[0, rgba(P.a)], [1, rgba(P.b)]]));
    text('FOUNDER, AGENTCORP', -400, -24, { size: 26, font: F.cond, color: 'rgba(255,255,255,0.85)' });
    text('"CODING IS DEAD."', -400, 46, { size: 72, font: F.cond, weight: '900' });
  });
  c.restore();
  pill(110, 340, 'LIVE', { size: 28, font: F.cond, weight: '900', bg: '#EF4444' });
  text('12.4K watching', 970, 352, { size: 28, font: F.body, color: GRAY, align: 'right' });
  card(70, 1080, 940, 140, { r: 30 });
  for (let i = 0; i < 24; i++) { const v = band(i, t), hgt = 10 + v * 90; fillRR(110 + i * 36, 1150 - hgt / 2, 22, hgt, 11, rgba(mixc(P.a, P.b, i / 23))); }
};
SC.outage = (t, s, P) => {
  const a = s.L[0].id, tD = wr(a, /down/), tS = wr(a, /six/), tH = wr(a, /hours/), tLo = wr(a, /lost/), tHd = wr(a, /head/);
  card(70, 290, 940, 610);
  text('status.agentcorp.ai', 110, 360, { size: 28, font: F.mono, color: GRAY });
  const kb = pop(t, tD - 0.1, 0.35);
  if (kb > 0) at(540, 430, kb, 0, () => { fillRR(-430, -40, 860, 80, 20, '#DC2626'); warn(-380, 0, 44, '#FDE68A'); text('MAJOR OUTAGE', -330, 16, { size: 46, font: F.cond, weight: '900' }); });
  const svc = ['API', 'Web app', 'Database', 'Login', 'The AI agent'];
  svc.forEach((n, i) => {
    const y = 530 + i * 64, down = t > tD + 0.1 + i * 0.12;
    text(n, 120, y, { size: 34, font: F.body });
    if (i === 4) { if (down) pill(960, y - 12, 'thinking…', { size: 24, bg: 'rgba(250,204,21,0.25)', color: '#FDE68A', align: 'right' }); }
    else pill(960, y - 12, down ? 'Down' : 'Operational', { size: 24, bg: down ? 'rgba(239,68,68,0.25)' : 'rgba(34,197,94,0.2)', color: down ? '#FCA5A5' : '#86EFAC', align: 'right' });
  });
  const secs = 6 * 3600 * easeInOut(lin(t, tD, tH - tD + 0.3));
  const hh = Math.floor(secs / 3600), mm = Math.floor(secs / 60) % 60, ss = Math.floor(secs) % 60;
  text(`DOWN FOR ${hh}h ${String(mm).padStart(2, '0')}m ${String(ss).padStart(2, '0')}s`, 540, 870, { size: 44, font: F.cond, weight: '900', color: '#FCA5A5', align: 'center' });
  const kh = lin(t, tHd - 0.25, 0.9);
  const off = { dx: Math.sin(kh * 9) * 60 * kh, dy: -easeOut(kh) * 330, rot: kh * 3.2 };
  robot(540, 1010, 0.62, { t, mood: t > tLo ? 'dead' : 'normal', acc: P.a, headOff: off, bob: 0.4 });
  if (kh > 0 && kh < 0.6) for (let i = 0; i < 8; i++) { const an = i / 8 * TAU, r = 40 + kh * 200; withAlpha(1 - kh / 0.6, () => line(540 + Math.cos(an) * r * 0.5, 970 + Math.sin(an) * r * 0.5, 540 + Math.cos(an) * r, 970 + Math.sin(an) * r, '#FDE68A', 6)); }
};

// ---------------- bridge ----------------
SC.craft = (t, s, P) => {
  const a = s.L[0].id, tEnd = wre(a, /stack/), tS = s.start + 0.3;
  text('MY STACK', 540, 350, { size: 52, font: F.cond, weight: '900', align: 'center', color: '#FCD34D' });
  text('hand-crafted  •  artisanal  •  zero AI', 540, 400, { size: 28, font: F.mono, color: GRAY, align: 'center' });
  const blocks = ['Git (mostly)', 'Linux', 'SQL', 'JavaScript', 'CSS', 'HTML'];
  const fade = ease(t, tEnd + 0.2, 0.8);
  blocks.forEach((n, i) => {
    const t0 = lerp(tS, tEnd - 0.4, i / (blocks.length - 1)), k = lin(t, t0, 0.5); if (k <= 0) return;
    const bw = 620 - i * 50 + (i % 2) * 30, y = 1130 - i * 112, yy = lerp(y - 400, y, easeOut(k)) - Math.sin(clamp(k * 1.3) * Math.PI) * 0 ;
    withAlpha(clamp(k * 3) * (1 - fade * 0.6), () => at(540, yy, 1, (hash(i) - 0.5) * 0.05 + fade * (hash(i, 4) - 0.5) * 0.2, () => {
      glow('rgba(245,158,11,0.35)', 30);
      fillRR(-bw / 2, -48, bw, 96, 20, lg(0, -48, 0, 48, [[0, '#F59E0B'], [1, '#92400E']])); noGlow();
      fillRR(-bw / 2 + 8, -42, bw - 16, 24, 12, 'rgba(255,255,255,0.18)');
      text(n, 0, 16, { size: 48, font: F.cond, weight: '900', color: '#1C1917', align: 'center' });
    }));
  });
  if (fade > 0) withAlpha(fade, () => text('(deprecated)', 540, 470, { size: 40, font: F.mono, color: '#F87171', align: 'center' }));
};
SC.wifi = (t, s, P) => {
  const a = s.L[0].id, tFL = wr(a, /for-loop/), tW = wr(a, /wi-fi/i);
  win(70, 290, 940, 560, 'loop.js — offline');
  text('1', 130, 430, { size: 30, font: F.mono, color: 'rgba(255,255,255,0.25)', align: 'right' });
  code('// write a for loop. by hand. like 2019.', 160, 430, 30);
  text('2', 130, 500, { size: 30, font: F.mono, color: 'rgba(255,255,255,0.25)', align: 'right' });
  const K = [[0, ''], [0.3, 'f'], [0.45, 'fr'], [0.6, 'fro'], [0.8, 'fro ('], [1.2, 'fro'], [1.35, 'fr'], [1.5, 'f'], [1.7, 'fo'], [1.85, 'for'], [2.1, 'for (i'], [2.4, 'for (i in'], [2.9, 'for (i'], [3.2, 'for (let i = 0;'], [3.8, 'for (let i = 0; i <']];
  let str = ''; for (const [dt, v] of K) if (t >= s.start + dt) str = v;
  code(str, 160, 500, 30);
  if ((t * 2.5 | 0) % 2) fillRR(162 + tw(str, 30, F.mono), 474, 4, 34, 2, rgba(P.a));
  if (str.length > 3) { c.beginPath(); for (let x = 0; x < tw(str, 30, F.mono); x += 8) c.lineTo(160 + x, 512 + (x / 8 % 2 ? 5 : 0)); c.strokeStyle = '#EF4444'; c.lineWidth = 3; c.stroke(); }
  const kt = pop(t, tFL, 0.4);
  if (kt > 0) at(560, 640, kt, 0, () => { fillRR(-380, -60, 760, 120, 22, '#1E1B2E'); rr(-380, -60, 760, 120, 22); c.strokeStyle = 'rgba(255,255,255,0.12)'; c.lineWidth = 2; c.stroke(); text('Copilot: offline. You are on your own.', -350, 12, { size: 32, font: F.body, color: GRAY }); });
  const kw = pop(t, tW - 0.15, 0.45);
  if (kw > 0) at(540, 1040, kw, 0, () => {
    wifi(0, 60, 260, 'rgba(255,255,255,0.8)', t > tW);
    text('No Internet Connection', 0, 140, { size: 44, align: 'center' });
    spinner(-200, 185, 16, t, rgba(P.a)); text('Reconnecting… (developer is useless)', -170, 196, { size: 28, font: F.body, color: GRAY });
  });
};
SC.freeze = (t, s, P) => {
  const [a, b] = ids(s), tD = wr(a, /down/), tFr = wr(a, /froze/), tF = wt(b, 0);
  for (let j = 0; j < 3; j++) for (let i = 0; i < 3; i++) {
    const x = 90 + i * 310, y = 300 + j * 240, off = t > tD + (i + j) * 0.08;
    fillRR(x, y, 280, 180, 18, '#0F172A'); rr(x, y, 280, 180, 18); c.strokeStyle = '#334155'; c.lineWidth = 6; c.stroke();
    fillRR(x + 120, y + 180, 40, 30, 4, '#334155');
    if (!off) for (let k = 0; k < 5; k++) fillRR(x + 24 + (k % 2) * 20, y + 26 + k * 28, 80 + hash(i + j * 3, k) * 140, 12, 6, ['#60A5FA', '#C084FC', '#4ADE80'][k % 3]);
    else { wifi(x + 140, y + 100, 90, '#64748B', true); text('NO INTERNET', x + 140, y + 150, { size: 22, font: F.cond, color: '#64748B', align: 'center' }); }
  }
  for (let i = 0; i < 7; i++) { const x = 140 + i * 133, y = 1080 + (i % 2) * 20; circle(x, y, 52, '#0B1120'); fillRR(x - 80, y + 40, 160, 120, 60, '#0B1120'); }
  const kf = ease(t, tFr - 0.1, 1.4);
  if (kf > 0) withAlpha(kf, () => {
    for (const [x0, y0, x1, y1] of [[0, 0, 0, 260], [0, H, 0, 0]]) { }
    const g1 = c.createLinearGradient(0, 250, 0, 450); g1.addColorStop(0, 'rgba(186,230,253,0.55)'); g1.addColorStop(1, 'rgba(186,230,253,0)'); c.fillStyle = g1; c.fillRect(40, 250, 1000, 200);
    const g2 = c.createLinearGradient(0, 1225, 0, 1000); g2.addColorStop(0, 'rgba(186,230,253,0.55)'); g2.addColorStop(1, 'rgba(186,230,253,0)'); c.fillStyle = g2; c.fillRect(40, 1000, 1000, 225);
    c.strokeStyle = 'rgba(224,242,254,0.8)'; c.lineWidth = 3;
    for (let i = 0; i < 26; i++) {
      const top = i % 2 === 0, x = 60 + hash(i, 1) * 960, y = top ? 260 : 1215, len = (60 + hash(i, 2) * 140) * kf, dir = top ? 1 : -1;
      c.beginPath(); c.moveTo(x, y); c.lineTo(x + (hash(i, 3) - 0.5) * 40, y + dir * len); c.stroke();
      for (let k = 1; k < 4; k++) { const bx = x + (hash(i, 3) - 0.5) * 40 * k / 4, by = y + dir * len * k / 4; c.beginPath(); c.moveTo(bx, by); c.lineTo(bx + 22, by + dir * 22); c.moveTo(bx, by); c.lineTo(bx - 22, by + dir * 22); c.stroke(); }
    }
  });
  const kc = pop(t, tF - 0.1, 0.4);
  if (kc > 0) at(540, 1010, kc, 0, () => pill(0, 0, '50 ENGINEERS  •  0 COMMITS', { size: 40, font: F.cond, weight: '900', bg: 'rgba(15,23,42,0.9)', border: '#7DD3FC', color: '#E0F2FE', align: 'center' }));
};
SC.js = (t, s, P) => {
  const a = s.L[0].id, tA = wr(a, /anybody/), tK = wr(a, /know/), tE = wre(a, /here/);
  withAlpha(0.55, () => fillRR(40, 250, 1000, 975, 30, '#000'));
  c.beginPath(); c.moveTo(470, 250); c.lineTo(610, 250); c.lineTo(900, 1120); c.lineTo(180, 1120); c.closePath();
  c.fillStyle = lg(0, 250, 0, 1120, [[0, 'rgba(255,248,220,0.35)'], [1, 'rgba(255,248,220,0.06)']]); c.fill();
  ellipse(540, 1120, 360, 50, 'rgba(255,248,220,0.12)');
  for (let i = 0; i < 26; i++) { const ph = (t * 0.05 + hash(i)) % 1, x = 300 + hash(i, 2) * 480 + Math.sin(t + i) * 20, y = 300 + ((hash(i, 3) * 800 + t * 20 * (0.5 + hash(i, 4))) % 800); withAlpha(0.5 * Math.sin(ph * Math.PI), () => circle(x, y, 2 + hash(i, 5) * 3, '#FFF8DC')); }
  at(540, 860, 1 + Math.sin(t * 1.5) * 0.01, -0.06, () => {
    c.save(); c.shadowColor = 'rgba(0,0,0,0.6)'; c.shadowBlur = 40; c.shadowOffsetY = 20;
    fillRR(-170, -230, 360, 440, 18, '#A16207'); c.restore();
    fillRR(-150, -230, 330, 440, 14, '#F7DF1E');
    fillRR(-170, -230, 40, 440, 10, '#CA8A04');
    text('JS', 15, -20, { size: 170, font: F.cond, weight: '900', color: '#111', align: 'center' });
    text('JavaScript', 15, 70, { size: 46, font: F.cond, weight: '900', color: '#111', align: 'center' });
    text('THE ANCIENT SCROLLS', 15, 120, { size: 24, font: F.cond, color: '#422006', align: 'center' });
    for (let i = 0; i < 6; i++) withAlpha(0.25, () => circle(-100 + hash(i) * 260, -200 + hash(i, 1) * 400, 6 + hash(i, 2) * 14, '#78716C'));
  });
  const kw = lin(t, tA - 0.3, tE - tA + 1.0);
  if (kw > 0 && kw < 1) at(lerp(-120, 1200, kw), 1150 - Math.abs(Math.sin(kw * 18)) * 50, 1, kw * 30, () => {
    c.strokeStyle = '#A8A29E'; c.lineWidth = 4;
    for (let i = 0; i < 9; i++) { c.beginPath(); c.arc(0, 0, 30 + i * 5, i, i + 4); c.stroke(); }
  });
  withAlpha(ease(t, tK, 0.5) * (0.6 + 0.4 * Math.sin(t * 9)), () => text('*crickets*', 860, 420, { size: 38, font: F.mono, color: GRAY, align: 'center' }));
};
SC.context = (t, s, P) => {
  const [a, b, d] = ids(s), tA = wt(a, 0), tChat = wr(b, /chat/), tCar = wr(d, /career/);
  for (const x of [tA, wt(b, 0), wt(d, 0), tCar]) GLITCH = Math.max(GLITCH, bump(t, x - 0.05, 0.35));
  GLITCH = Math.max(GLITCH, hash(Math.floor(t * 8)) > 0.92 ? 0.5 : 0);
  card(100, 330, 880, 860, { fill: 'rgba(12,14,22,0.96)', glowCol: 'rgba(239,68,68,0.7)' });
  warn(540, 470, 120, '#EF4444');
  const kt = pop(t, tA - 0.1, 0.4);
  if (kt > 0) at(540, 620, kt, 0, () => text('Context window exceeded', 0, 0, { size: 56, align: 'center' }));
  withAlpha(ease(t, tA + 0.3, 0.4), () => {
    text('128,000 / 128,000 tokens', 540, 690, { size: 30, font: F.mono, color: '#FCA5A5', align: 'center' });
    fillRR(170, 720, 740, 26, 13, 'rgba(255,255,255,0.08)');
    glow('#EF4444', 20); fillRR(170, 720, 740 + Math.sin(t * 30) * 6 + 30, 26, 13, '#EF4444'); noGlow();
    text('Your memories of this project have been compressed.', 540, 800, { size: 28, font: F.body, color: GRAY, align: 'center' });
  });
  const kc = pop(t, wt(b, 0) - 0.15, 0.4), pc = bump(t, tChat + 0.1, 0.22);
  if (kc > 0) at(540, 910, kc, 0, () => button(-330, -55, 660, 110, 'Start new chat', { bg: '#334155', press: pc, size: 44 }));
  const kn = pop(t, tCar - 0.35, 0.45), pn = bump(t, tCar + 0.35, 0.25);
  if (kn > 0) at(540, 1060, kn, 0, () => button(-330, -55, 660, 110, 'Start new career', { bg: '#DC2626', press: pn, size: 44, glow: 'rgba(239,68,68,0.7)' }));
  const tgt = t < tCar - 0.3 ? [540, 930] : [600, 1080], st = t < tCar - 0.3 ? wt(b, 0) : tCar - 0.3;
  const m = easeInOut(lin(t, st, 0.5));
  if (kc > 0) cursorArrow(lerp(t < tCar - 0.3 ? 940 : 560, tgt[0], m), lerp(t < tCar - 0.3 ? 1200 : 930, tgt[1], m), 1.1, Math.max(pc, pn));
  for (let y = 340; y < 1180; y += 6) withAlpha(0.05, () => c.fillRect(110, y, 860, 2));
};

// ---------------- final chorus ----------------
SC.parking = (t, s, P) => {
  const [a, b] = ids(s), tY = wt(a, 0), tP = wr(b, /parking/), tS = wr(b, /spot/);
  card(70, 290, 940, 935, { fill: '#1C1E25' });
  for (let i = 0; i < 4; i++) fillRR(90 + i * 300, 560, 10, 640, 5, 'rgba(255,255,255,0.75)');
  withAlpha(0.7, () => at(540, 1150, 1, 0, () => text('RESERVED', 0, 0, { size: 60, font: F.cond, weight: '900', color: '#FDE68A', align: 'center' })));
  yarBubble(t, P, 540, 410, tY, 0.7, null);
  at(880, 640, 1, 0, () => {
    fillRR(-8, 0, 16, 200, 6, '#94A3B8');
    fillRR(-110, -140, 220, 160, 16, '#1D4ED8'); rr(-110, -140, 220, 160, 16); c.strokeStyle = '#fff'; c.lineWidth = 5; c.stroke();
    text('RESERVED', 0, -96, { size: 30, font: F.cond, weight: '900', align: 'center' });
    const kx = ease(t, tY + 0.3, 0.3);
    text('YOU', 0, -38, { size: 44, font: F.cond, weight: '900', align: 'center', color: kx > 0 ? 'rgba(255,255,255,0.4)' : '#fff' });
    if (kx > 0) line(-50, -52, -50 + 100 * kx, -52, '#EF4444', 6);
    withAlpha(ease(t, tP - 0.2, 0.3), () => at(0, 0, 1, -0.08, () => { fillRR(-90, -26, 180, 40, 8, '#FDE68A'); text('AI AGENT', 0, 4, { size: 28, font: F.cond, weight: '900', color: '#111', align: 'center' }); }));
  });
  const k = easeOut(lin(t, tP - 0.6, tS - tP + 0.9)), cy = lerp(1500, 860, k);
  c.save(); rr(70, 290, 940, 935, 34); c.clip();
  at(500, cy, 1, 0, () => {
    c.save(); c.shadowColor = 'rgba(0,0,0,0.6)'; c.shadowBlur = 40; c.shadowOffsetY = 20;
    fillRR(-120, -220, 240, 440, 80, lg(-120, 0, 120, 0, [[0, rgba(P.b)], [0.5, rgba(mixc(P.b, '#ffffff', 0.3))], [1, rgba(P.b)]])); c.restore();
    fillRR(-96, -150, 192, 90, 30, '#0F172A'); fillRR(-96, 90, 192, 70, 26, '#0F172A');
    robot(0, 10, 0.32, { t, body: false, shadow: false, mood: 'happy', acc: P.a, bob: 0 });
    ellipse(-90, -190, 22, 12, '#FEF9C3'); ellipse(90, -190, 22, 12, '#FEF9C3');
  });
  c.restore();
};
SC.seat = (t, s, P) => {
  const [a, b] = ids(s), tY = wt(a, 0), tSn = wr(b, /senior/), tB = wr(b, /bot/);
  yarBubble(t, P, 540, 400, tY, 0.7, null);
  [[250, 'JUNIOR', 'a GPU'], [830, 'QA', 'also AI']].forEach(([x, r, n]) => { card(x - 150, 640, 300, 160, { r: 26 }); text(r, x, 700, { size: 30, font: F.cond, color: DIM, align: 'center' }); text(n, x, 760, { size: 40, align: 'center' }); });
  card(330, 600, 420, 610, { glowCol: rgba(P.a, 0.8) });
  text('SENIOR DEVELOPER', 540, 670, { size: 40, font: F.cond, weight: '900', align: 'center', color: rgba(P.a) });
  c.save(); rr(350, 690, 380, 400, 26); c.clip();
  const ko = easeIn(lin(t, tSn, 0.6));
  if (ko < 1) dev(540 + ko * 60, 860 + ko * 500, 0.9, { t, mood: t > tSn ? 'shock' : 'neutral', rot: ko * 0.8 });
  const ki = lin(t, tB - 0.35, 0.55);
  if (ki > 0) robot(540, lerp(400, 850, backOut(ki, 2.2)), 0.85, { t, mood: 'happy', acc: P.a, badge: true });
  c.restore();
  text(t > tB ? 'AI Agent' : 'You', 540, 1150, { size: 48, align: 'center' });
  if (t > tB) for (let i = 0; i < 6; i++) { const an = i / 6 * TAU + t * 2; withAlpha(1 - lin(t, tB, 1.2), () => star(540 + Math.cos(an) * 230, 880 + Math.sin(an) * 230, 16, '#FDE68A')); }
};
SC.desk = (t, s, P) => {
  const [a, b] = ids(s), tSd = wr(a, /standing/), tBd = wr(a, /badge/), tL = wr(a, /lunch/), tG = wr(b, /great/i);
  fillRR(110, 720, 560, 34, 12, '#78716C'); fillRR(140, 754, 26, 200, 8, '#57534E'); fillRR(614, 754, 26, 200, 8, '#57534E');
  fillRR(300, 560, 240, 150, 14, '#0F172A'); fillRR(400, 710, 40, 14, 4, '#334155');
  for (let k = 0; k < 4; k++) fillRR(320, 585 + k * 28, 80 + hash(k) * 100, 12, 6, ['#60A5FA', '#C084FC', '#4ADE80', '#FDE68A'][k]);
  robot(250, 560, 0.62, { t, mood: 'happy', acc: P.a, badge: t > tBd, armR: t > tL ? 2.2 : 0.4, shadow: false });
  if (t > tL) at(250 + 70, 480, pop(t, tL, 0.35), 0, () => { fillRR(-40, -14, 80, 28, 12, '#FDE68A'); fillRR(-36, -4, 72, 10, 4, '#4ADE80'); fillRR(-40, 6, 80, 14, 7, '#D97706'); });
  card(700, 330, 320, 400, { r: 28 });
  text('MY STUFF', 860, 390, { size: 32, font: F.cond, color: DIM, align: 'center' });
  [['Standing desk', tSd], ['Badge', tBd], ['Free lunch', tL]].forEach(([n, tt], i) => {
    const y = 470 + i * 90; fillRR(730, y - 30, 44, 44, 10, 'rgba(255,255,255,0.1)');
    const k = pop(t, tt, 0.35); if (k > 0) at(752, y - 8, k, 0, () => check(0, 0, 30, '#4ADE80', 7));
    text(n, 790, y + 2, { size: 30, font: F.body });
  });
  withAlpha(ease(t, tL + 0.4, 0.4), () => pill(860, 690, 'now: AI Agent', { size: 24, bg: rgba(P.a, 0.3), align: 'center' }));
  const kd = ease(t, wt(b, 0) - 0.3, 0.4);
  if (kd > 0) withAlpha(kd, () => {
    card(90, 970, 900, 250, { r: 30 });
    text('DM  →  Manager', 130, 1025, { size: 28, font: F.cond, color: DIM });
    for (let i = 0; i < 3; i++) { const k = pop(t, tG - 0.1 + i * 0.28, 0.35); if (k > 0) at(260 + i * 260, 1120, k, (i - 1) * 0.05, () => { fillRR(-120, -40, 240, 80, 30, rgba(P.a, 0.85)); text('Great question!', 0, 10, { size: 30, align: 'center' }); }); }
  });
};

// ---------------- outro ----------------
SC.pager = (t, s, P) => {
  const [a, b] = ids(s), tBr = wr(a, /breaks/), tG = wt(b, 0);
  const ring_ = t > tBr ? 1 : 0, shake = ring_ * Math.sin(t * 70) * 6 * (0.5 + 0.5 * Math.sin(t * 3) > 0.3 ? 1 : 0);
  if (ring_) for (let i = 0; i < 3; i++) { const ph = (t * 0.8 + i / 3) % 1; withAlpha(1 - ph, () => { rr(540 - 250 - ph * 120, 760 - 460 - ph * 120, 500 + ph * 240, 920 + ph * 240, 80 + ph * 60); c.strokeStyle = 'rgba(239,68,68,0.6)'; c.lineWidth = 6; c.stroke(); }); }
  at(540 + shake, 760, 1, shake * 0.003, () => {
    c.save(); c.shadowColor = 'rgba(0,0,0,0.7)'; c.shadowBlur = 60; c.shadowOffsetY = 30; fillRR(-240, -450, 480, 900, 76, '#0A0A0A'); c.restore();
    fillRR(-222, -432, 444, 864, 62, ring_ ? lg(0, -432, 0, 432, [[0, '#450A0A'], [1, '#0A0A0A']]) : lg(0, -432, 0, 432, [[0, '#1E1B4B'], [1, '#0A0A0A']]));
    fillRR(-70, -418, 140, 34, 17, '#000');
    text('3:00', 0, -250, { size: 130, font: F.ui, align: 'center' });
    text('Sunday, October 11', 0, -195, { size: 30, font: F.body, color: GRAY, align: 'center' });
    if (ring_) {
      const k = pop(t, tBr, 0.4);
      at(0, -40, k, 0, () => { glow('#EF4444', 40 + 20 * Math.sin(t * 10)); circle(0, 0, 70, '#DC2626'); noGlow(); warn(0, 4, 70, '#FDE68A'); });
      text('PagerDuty', 0, 80, { size: 46, align: 'center' });
      text('CRITICAL: PROD IS DOWN', 0, 130, { size: 30, font: F.cond, weight: '900', color: '#FCA5A5', align: 'center' });
      text(t > tG ? 'Escalating to: THE HUMAN' : 'Caused by: AI Agent', 0, 175, { size: 28, font: F.body, color: t > tG ? '#FDE68A' : GRAY, align: 'center' });
      if (t > tG) at(0, 270, pop(t, tG, 0.4), 0, () => { c.save(); c.beginPath(); c.arc(0, 0, 56, 0, TAU); c.clip(); c.fillStyle = '#334155'; c.fillRect(-60, -60, 120, 120); dev(0, 18, 0.42, { t, mood: 'shock' }); c.restore(); text('(that\'s you)', 0, 90, { size: 24, font: F.body, color: GRAY, align: 'center' }); });
      circle(-120, 370, 46, '#EF4444'); circle(120, 370, 46 + 4 * Math.sin(t * 8), '#22C55E');
      at(-120, 370, 1, 2.3, () => phoneIcon(0, 0, 0.9, '#fff')); phoneIcon(120, 370, 0.9, '#fff');
    }
  });
};
SC.final = (t, s, P) => {
  const [a, b] = ids(s), tY = wt(a, 0), tEnd = wre(a, /right/) + 0.8, tY2 = wt(b, 0);
  const kEnd = easeInOut(lin(t, tEnd, 1.0));
  const talk = (t > tY && t < wre(a, /right/)) || (t > tY2 && t < wre(b, /right/)) ? voice(t) : 0;
  robot(540, lerp(560, 420, kEnd), lerp(1.05, 0.62, kEnd), { t, mood: t > wre(b, /right/) + 0.3 ? 'sleepy' : 'happy', acc: P.a, talk });
  const kb = pop(t, tY - 0.1, 0.45) * (1 - kEnd);
  if (kb > 0) at(540, 1050, kb, 0, () => { bubble(-400, -100, 800, 200, [0, -170]); text("You're absolutely right.", 0, 20, { size: 54, color: '#0F172A', align: 'center' }); });
  if (kEnd > 0) withAlpha(kEnd, () => {
    text("YOU'RE ABSOLUTELY", 540, 800 + (1 - kEnd) * 40, { size: 104, font: F.cond, weight: '900', align: 'center' });
    at(540, 990, lerp(0.7, 1, backOut(kEnd)), 0, () => text('RIGHT!', 0, 0, { size: 230, font: F.cond, weight: '900', align: 'center', color: gradText(P, -200, 0), glow: rgba(P.a, 0.8), blur: 40 }));
    text('a song for every software engineer in 2026', 540, 1080, { size: 32, font: F.body, color: GRAY, align: 'center' });
    text('lyrics by a human. probably.', 540, 1140, { size: 28, font: F.mono, color: DIM, align: 'center' });
  });
  const k2 = pop(t, tY2 - 0.1, 0.4);
  if (k2 > 0 && t < wre(b, /right/) + 1.2) at(820, 300, k2 * (1 - lin(t, wre(b, /right/) + 0.8, 0.4)), 0.04, () => { bubble(-190, -50, 380, 100, [-170, 90]); text('You\'re absolutely right.', 0, 12, { size: 30, color: '#0F172A', align: 'center' }); });
};

// ---------------- event hits ----------------
for (const s of SCENES) {
  const id0 = s.L[0] && s.L[0].id, id1 = s.L[1] && s.L[1].id;
  if (s.name === 'prod') hit(wr(id1, /prod/), 28, 0.5, '#EF4444');
  if (s.name === 'invite') hit(wr(id0, /interview/) + 0.1, 8, 0.12, '#22C55E');
  if (s.name === 'accept') s.L.forEach(l => l.words.forEach(w => { if (/accept/i.test(w.text)) hit(w.start, 10, 0.14, '#4ADE80'); }));
  if (s.name === 'leetcode') hit(wr(id1, /hire/), 16, 0.2, '#EF4444');
  if (s.name === 'review') hit(wt(id1, 0), 12, 0.2, '#22C55E');
  if (s.name === 'sorry') hit(wr(id1, /god/i), 0, 0.35, '#FDE68A');
  if (s.name === 'linkedin') hit(wr(id0, /ten-x/), 14, 0.15, '#7C3AED');
  if (s.name === 'outage') hit(wr(id0, /head/), 14, 0.2, '#FDE68A');
  if (s.name === 'context') hit(wt(id0, 0), 12, 0.2, '#EF4444');
}
