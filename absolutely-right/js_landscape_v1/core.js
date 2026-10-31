// Shared timing, math, palette and scene schedule. Loaded first; every later file shares this global scope.
const W = 1920, H = 1080, FPS = TL.fps, DUR = TL.duration;
const F = { cond: '"Avenir Next Condensed"', ui: '"Avenir Next"', body: 'Avenir', mono: 'Menlo' };
const STAGE = { x0: 60, x1: 1020, y0: 250, y1: 1225, cx: 540, cy: 737 };
// scenes are authored in the 1080-wide STAGE space and pinned as a small comic card on the right; the lyric itself is the main text
const PANEL = { w: 595, h: 605, y: 120, scale: 0.62 };
const FLOOR_Y = 880;

// ---------------- math ----------------
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const lerp = (a, b, k) => a + (b - a) * k;
const smooth = k => { k = clamp(k); return k * k * (3 - 2 * k); };
const easeOut = k => 1 - Math.pow(1 - clamp(k), 3);
const easeIn = k => Math.pow(clamp(k), 3);
const easeInOut = k => { k = clamp(k); return k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; };
const expoOut = k => { k = clamp(k); return k >= 1 ? 1 : 1 - Math.pow(2, -10 * k); };
const backOut = (k, s = 1.70158) => { k = clamp(k); const c3 = s + 1; return 1 + c3 * Math.pow(k - 1, 3) + s * Math.pow(k - 1, 2); };
const elastic = k => { k = clamp(k); return k === 0 || k === 1 ? k : Math.pow(2, -10 * k) * Math.sin((k * 10 - 0.75) * 2 * Math.PI / 3) + 1; };
const hash = (a, b = 0) => { const h = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return h - Math.floor(h); };
const TAU = Math.PI * 2;

// progress helpers: 0 before t0, eased to 1 over d seconds
const ease = (t, t0, d = 0.4) => easeOut((t - t0) / d);
const pop = (t, t0, d = 0.4) => backOut((t - t0) / d);
const lin = (t, t0, d) => clamp((t - t0) / d);
const fadeIO = (t, a, b, f = 0.25) => Math.min(clamp((t - a) / f), clamp((b - t) / f));

// ---------------- lyrics timing ----------------
const LINES = TL.lines;
const LN = {};
LINES.forEach(l => { LN[l.id] = l; });
const clean = s => s.toLowerCase().replace(/[^a-z0-9'-]/g, '');
const wt = (id, i = 0) => { const ws = LN[id].words; return ws[clamp(i < 0 ? ws.length + i : i, 0, ws.length - 1)].start; };
const wr = (id, re, nth = 0) => { const ws = LN[id].words.filter(w => re.test(w.text)); return (ws[nth] || LN[id].words[0]).start; };
const wre = (id, re, nth = 0) => { const ws = LN[id].words.filter(w => re.test(w.text)); return (ws[nth] || LN[id].words[0]).end; };

// ---------------- audio features ----------------
const feat = (k, t) => { const a = TL[k]; return (a[clamp(Math.floor(t * FPS), 0, a.length - 1)] || 0) / 99; };
const band = (i, t) => { const a = TL.bands; return (a[clamp(Math.floor(t * FPS), 0, a.length - 1)][i] || 0) / 99; };
const BEAT = TL.beat, PHASE = TL.phase;
const sinceBeat = (t, every = 1) => { const p = BEAT * every, b = (t - PHASE) / p; return (b - Math.floor(b)) * p; };
const kick = (t, k = 9, every = 2) => Math.exp(-sinceBeat(t, every) * k);
const voice = t => feat('mid', t);

// ---------------- palette ----------------
const SECTIONS = {
  in: { label: 'INTRO', a: '#8B5CF6', b: '#22D3EE', bg: '#140B2E' },
  v1: { label: 'VERSE 1', a: '#22D3EE', b: '#8B5CF6', bg: '#071A2B' },
  p1: { label: 'PRE-CHORUS', a: '#F59E0B', b: '#EC4899', bg: '#2A1208' },
  c1: { label: 'CHORUS', a: '#FF3D7F', b: '#FF8A00', bg: '#2B0716' },
  v2: { label: 'VERSE 2', a: '#38BDF8', b: '#A78BFA', bg: '#0A1530' },
  p2: { label: 'PRE-CHORUS', a: '#F59E0B', b: '#EC4899', bg: '#2A1208' },
  c2: { label: 'CHORUS', a: '#FF3D7F', b: '#FF8A00', bg: '#2B0716' },
  b: { label: 'BRIDGE', a: '#60A5FA', b: '#818CF8', bg: '#060B1F' },
  x: { label: 'SYSTEM ERROR', a: '#22C55E', b: '#EF4444', bg: '#03140A' },
  c3: { label: 'FINAL CHORUS', a: '#FACC15', b: '#FF3D7F', bg: '#2A1A05' },
  o: { label: 'OUTRO', a: '#A78BFA', b: '#22D3EE', bg: '#120A26' },
};
const hex = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const rgba = (h, a = 1) => { const [r, g, b] = Array.isArray(h) ? h : hex(h); return `rgba(${r | 0},${g | 0},${b | 0},${a})`; };
const mixc = (a, b, k) => { const A = Array.isArray(a) ? a : hex(a), B = Array.isArray(b) ? b : hex(b); return A.map((v, i) => lerp(v, B[i], k)); };

const SEC_STARTS = [];
for (const l of LINES) {
  const s = l.id.split('-')[0];
  if (!SEC_STARTS.length || SEC_STARTS[SEC_STARTS.length - 1].s !== s) SEC_STARTS.push({ s, t: l.start - 0.6 });
}
SEC_STARTS[0].t = 0;
// current palette, cross-fading over 1.2 s when the section changes
function palette(t) {
  let i = 0;
  while (i + 1 < SEC_STARTS.length && SEC_STARTS[i + 1].t <= t) i++;
  const cur = SECTIONS[SEC_STARTS[i].s], prev = i ? SECTIONS[SEC_STARTS[i - 1].s] : cur;
  const k = smooth((t - SEC_STARTS[i].t) / 1.2);
  return { label: cur.label, key: SEC_STARTS[i].s, a: mixc(prev.a, cur.a, k), b: mixc(prev.b, cur.b, k), bg: mixc(prev.bg, cur.bg, k) };
}

// ---------------- scene schedule ----------------
const SCENES = [];
for (const l of LINES) {
  const last = SCENES[SCENES.length - 1];
  if (last && last.name === l.scene) last.lines.push(l);
  else SCENES.push({ name: l.scene, lines: [l], start: l.start - 0.3 });
}
SCENES.unshift({ name: 'title', lines: [], start: 0 });
SCENES.forEach((s, i) => { s.end = i + 1 < SCENES.length ? SCENES[i + 1].start : DUR + 2; s.L = s.lines; });
const OUT_T = 0.32;

// ---------------- global hits (shake + flash) ----------------
const HITS = [];
function hit(t, shake, flash, color) { HITS.push({ t, shake, flash, color }); }
