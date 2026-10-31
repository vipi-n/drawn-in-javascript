// Pre-rendered textures (built once per process, deterministic): paper grain, hatching, stipple, wing scales, leaf cells.
const { C, W, H, rng, TAU } = require('./core');

const T = {};
const S = 1200; // hatch tiles a bit larger than the frame so they can be offset

function canvas(w, h) { const c = C.createCanvas(w, h); return [c, c.getContext('2d')]; }

function grain() {
  const [cv, g] = canvas(W, H), r = rng(7);
  const img = g.createImageData(W, H), d = img.data;
  for (let i = 0; i < W * H; i++) {
    const v = r(), p = i * 4;
    if (v < .5) { d[p] = 40; d[p + 1] = 28; d[p + 2] = 20; d[p + 3] = (.5 - v) * 46; }
    else { d[p] = 255; d[p + 1] = 248; d[p + 2] = 232; d[p + 3] = (v - .5) * 34; }
  }
  g.putImageData(img, 0, 0);
  // soft mottling, the paper's uneven tooth
  for (let k = 0; k < 160; k++) {
    const x = r() * W, y = r() * H, rad = 30 + r() * 140, dark = r() < .5;
    const gr = g.createRadialGradient(x, y, 0, x, y, rad);
    gr.addColorStop(0, dark ? 'rgba(60,40,20,0.035)' : 'rgba(255,250,235,0.035)');
    gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
  // fibres
  g.lineCap = 'round';
  for (let k = 0; k < 900; k++) {
    const x = r() * W, y = r() * H, a = r() * TAU, l = 3 + r() * 10;
    g.strokeStyle = r() < .5 ? 'rgba(50,35,25,0.07)' : 'rgba(255,250,240,0.07)';
    g.lineWidth = .7;
    g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + Math.cos(a + 1) * l * .5, y + Math.sin(a + 1) * l * .5, x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke();
  }
  return cv;
}

// pencil hatching: angled strokes made of broken segments of varying pressure
function hatch(angle, gap, color, seed, cross = false) {
  const [cv, g] = canvas(S, S), r = rng(seed);
  g.lineCap = 'round';
  const pass = (ang) => {
    g.save(); g.translate(S / 2, S / 2); g.rotate(ang);
    const L = S * .75;
    for (let y = -L; y < L; y += gap * (.75 + r() * .5)) {
      let x = -L + r() * 40;
      while (x < L) {
        const len = 30 + r() * 150, a = .25 + r() * .55;
        g.strokeStyle = color.replace('A', a.toFixed(2));
        g.lineWidth = .6 + r() * .9;
        const wob = (r() - .5) * 2.2;
        g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + len / 2, y + wob, x + len, y + (r() - .5) * 1.4); g.stroke();
        x += len + 4 + r() * 26;
      }
    }
    g.restore();
  };
  pass(angle);
  if (cross) pass(angle + Math.PI / 2.6);
  return cv;
}

function stipple(color, seed, n = 26000) {
  const [cv, g] = canvas(S, S), r = rng(seed);
  for (let k = 0; k < n; k++) {
    const x = r() * S, y = r() * S, rad = .5 + Math.pow(r(), 3) * 2.2;
    g.fillStyle = color.replace('A', (.25 + r() * .6).toFixed(2));
    g.beginPath(); g.arc(x, y, rad, 0, TAU); g.fill();
  }
  return cv;
}

// butterfly wing scales: tiny overlapping round-tipped tiles in rows (seen only in macro close-ups)
function scales(seed = 51) {
  const N = 600, [cv, g] = canvas(N, N), r = rng(seed);
  const sw = 9, sh = 7;
  for (let j = 0, y = -sh; y < N + sh; y += sh * .62, j++) {
    for (let x = -sw + (j % 2) * sw * .5; x < N + sw; x += sw) {
      const cx = x + (r() - .5) * 1.4, cy = y + (r() - .5) * 1.2, tone = r();
      g.beginPath(); g.moveTo(cx - sw * .46, cy - sh * .5); g.lineTo(cx - sw * .46, cy + sh * .15);
      g.quadraticCurveTo(cx, cy + sh * .75, cx + sw * .46, cy + sh * .15); g.lineTo(cx + sw * .46, cy - sh * .5); g.closePath();
      g.fillStyle = tone < .5 ? `rgba(255,240,210,${(.05 + tone * .12).toFixed(3)})` : `rgba(40,15,0,${(.04 + (tone - .5) * .14).toFixed(3)})`;
      g.fill();
      g.strokeStyle = 'rgba(30,10,0,0.10)'; g.lineWidth = .6; g.beginPath(); g.moveTo(cx - sw * .46, cy + sh * .15); g.quadraticCurveTo(cx, cy + sh * .75, cx + sw * .46, cy + sh * .15); g.stroke();
    }
  }
  return cv;
}

// leaf surface: fine cell mottling and tiny hairs for macro shots
function leafCells(seed = 61) {
  const N = 700, [cv, g] = canvas(N, N), r = rng(seed);
  for (let k = 0; k < 2600; k++) {
    const x = r() * N, y = r() * N, rad = 3 + r() * 9;
    g.fillStyle = r() < .5 ? `rgba(255,255,220,${(.03 + r() * .05).toFixed(3)})` : `rgba(10,40,0,${(.03 + r() * .05).toFixed(3)})`;
    g.beginPath(); g.arc(x, y, rad, 0, TAU); g.fill();
  }
  g.lineCap = 'round';
  for (let k = 0; k < 1800; k++) {
    const x = r() * N, y = r() * N, a = -.6 + (r() - .5) * .8, l = 3 + r() * 6;
    g.strokeStyle = `rgba(250,255,235,${(.08 + r() * .14).toFixed(3)})`; g.lineWidth = .5 + r() * .5;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke();
  }
  return cv;
}

function build() {
  if (T.grain) return T;
  T.grain = grain();
  T.scales = scales();
  T.leaf = leafCells();
  T.hatchD = hatch(-.7, 6, 'rgba(40,24,30,A)', 11);
  T.hatchD2 = hatch(.45, 7, 'rgba(40,24,30,A)', 12);
  T.hatchL = hatch(-.7, 6, 'rgba(255,246,226,A)', 14);
  T.stipD = stipple('rgba(70,30,40,A)', 21);
  T.stipL = stipple('rgba(255,248,230,A)', 22, 16000);
  return T;
}

module.exports = { build, T, S };
