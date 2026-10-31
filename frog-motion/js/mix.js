// Mixing desk for the v2 score: buses, a convolution hall (FFT overlap-add, packed stereo), filters,
// BS.1770 loudness, a look-ahead limiter and the WAV writer.
const fs = require('fs');
const { DURATION } = require('./core');

const SR = 48000, N = Math.ceil((DURATION + 2) * SR), TAU = Math.PI * 2;
const S0 = (t) => Math.round(t * SR);
const clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
let seed = 20261018;
const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
const R = (a = 0, b = 1) => a + (b - a) * rnd();
let ns = 77;
const white = () => { ns ^= ns << 13; ns ^= ns >>> 17; ns ^= ns << 5; return ((ns >>> 0) / 4294967296) * 2 - 1; };

// ---------------------------------------------------------------- buses + hall send
const BUS = {};
for (const k of ['mus', 'sfx', 'amb']) BUS[k] = { L: new Float32Array(N), R: new Float32Array(N) };
const HALL = { L: new Float32Array(N), R: new Float32Array(N) };
// returns put(i, l, r) that adds a stereo sample at absolute index i, balanced by pan, with a hall send
function out(pan = 0, gain = 1, rev = .2, bus = 'mus') {
  const a = (clamp(pan, -1, 1) + 1) * Math.PI / 4, gl = Math.cos(a) * gain * 1.414, gr = Math.sin(a) * gain * 1.414, b = BUS[bus];
  return (i, l, r = l) => {
    if (i < 0 || i >= N) return;
    const x = l * gl, y = r * gr;
    b.L[i] += x; b.R[i] += y;
    if (rev) { HALL.L[i] += x * rev; HALL.R[i] += y * rev; }
  };
}

// ---------------------------------------------------------------- filters
class SVF {
  constructor(fc = 1000, q = .7) { this.a = 0; this.b = 0; this.set(fc, q); }
  set(fc, q = this.q) { this.q = q; fc = Math.min(Math.max(fc, 15), SR * .45); const g = Math.tan(Math.PI * fc / SR), k = 1 / q; this.a1 = 1 / (1 + g * (g + k)); this.a2 = g * this.a1; this.a3 = g * this.a2; this.k = k; }
  tick(x) {
    const v3 = x - this.b, v1 = this.a1 * this.a + this.a2 * v3, v2 = this.b + this.a2 * this.a + this.a3 * v3;
    this.a = 2 * v1 - this.a; this.b = 2 * v2 - this.b; this.lp = v2; this.bp = v1; this.hp = x - this.k * v1 - v2; return v2;
  }
}
// RBJ biquad: type lowshelf | highshelf | peak | lowpass | highpass
function biquad(type, f, dB = 0, q = .707) {
  const A = Math.pow(10, dB / 40), w = TAU * f / SR, c = Math.cos(w), s = Math.sin(w), al = s / (2 * q), sq = 2 * Math.sqrt(A) * al;
  let b0, b1, b2, a0, a1, a2;
  if (type === 'lowshelf') { b0 = A * ((A + 1) - (A - 1) * c + sq); b1 = 2 * A * ((A - 1) - (A + 1) * c); b2 = A * ((A + 1) - (A - 1) * c - sq); a0 = (A + 1) + (A - 1) * c + sq; a1 = -2 * ((A - 1) + (A + 1) * c); a2 = (A + 1) + (A - 1) * c - sq; }
  else if (type === 'highshelf') { b0 = A * ((A + 1) + (A - 1) * c + sq); b1 = -2 * A * ((A - 1) + (A + 1) * c); b2 = A * ((A + 1) + (A - 1) * c - sq); a0 = (A + 1) - (A - 1) * c + sq; a1 = 2 * ((A - 1) - (A + 1) * c); a2 = (A + 1) - (A - 1) * c - sq; }
  else if (type === 'peak') { b0 = 1 + al * A; b1 = -2 * c; b2 = 1 - al * A; a0 = 1 + al / A; a1 = -2 * c; a2 = 1 - al / A; }
  else if (type === 'lowpass') { b0 = (1 - c) / 2; b1 = 1 - c; b2 = (1 - c) / 2; a0 = 1 + al; a1 = -2 * c; a2 = 1 - al; }
  else { b0 = (1 + c) / 2; b1 = -(1 + c); b2 = (1 + c) / 2; a0 = 1 + al; a1 = -2 * c; a2 = 1 - al; }
  return raw([b0 / a0, b1 / a0, b2 / a0], [a1 / a0, a2 / a0]);
}
function raw(b, a) {
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  return (x) => { const y = b[0] * x + b[1] * x1 + b[2] * x2 - a[0] * y1 - a[1] * y2; x2 = x1; x1 = x; y2 = y1; y1 = y; return y; };
}

// ---------------------------------------------------------------- FFT + convolution hall
function makeFFT(n) {
  const lg = Math.round(Math.log2(n)), rev = new Uint32Array(n), co = new Float64Array(n / 2), si = new Float64Array(n / 2);
  for (let i = 0; i < n; i++) { let r = 0; for (let b = 0; b < lg; b++) r |= ((i >> b) & 1) << (lg - 1 - b); rev[i] = r; }
  for (let i = 0; i < n / 2; i++) { co[i] = Math.cos(TAU * i / n); si[i] = Math.sin(TAU * i / n); }
  return (re, im, inv) => {
    for (let i = 0; i < n; i++) { const j = rev[i]; if (i < j) { let t = re[i]; re[i] = re[j]; re[j] = t; t = im[i]; im[i] = im[j]; im[j] = t; } }
    for (let size = 2; size <= n; size <<= 1) {
      const half = size >> 1, step = n / size;
      for (let i = 0; i < n; i += size) {
        for (let k = 0, w = 0; k < half; k++, w += step) {
          const c = co[w], s = inv ? si[w] : -si[w], a = i + k, b = a + half;
          const tr = re[b] * c - im[b] * s, ti = re[b] * s + im[b] * c;
          re[b] = re[a] - tr; im[b] = im[a] - ti; re[a] += tr; im[a] += ti;
        }
      }
    }
    if (inv) for (let i = 0; i < n; i++) { re[i] /= n; im[i] /= n; }
  };
}
// synthetic hall impulse: sparse early reflections + a diffuse tail that decays faster in the highs
function makeIR(sec = 2.4, o = {}) {
  const n = Math.round(sec * SR), pre = Math.round((o.pre ?? .018) * SR), rt = o.rt ?? [2.3, 1.8, .85];
  const mk = (sd) => {
    ns = sd;
    const h = new Float32Array(n), lp = new SVF(500, .7), hp = new SVF(3800, .7);
    for (let i = pre; i < n; i++) {
      const t = (i - pre) / SR, x = white(); lp.tick(x); hp.tick(x);
      const lo = lp.lp, hi = hp.hp, mid = x - lo - hi;
      h[i] = (lo * Math.exp(-6.9 * t / rt[0]) + mid * .85 * Math.exp(-6.9 * t / rt[1]) + hi * .55 * Math.exp(-6.9 * t / rt[2])) * (1 - Math.exp(-t / .014));
    }
    for (let k = 0; k < 14; k++) { const d = pre + Math.round((.004 + Math.pow(R(), 1.4) * .075) * SR); h[d] += (rnd() < .5 ? -1 : 1) * R(.6, 1.4) * Math.exp(-k * .12) * 2.2; }
    let e = 0; for (let i = 0; i < n; i++) e += h[i] * h[i];
    const g = 1 / Math.sqrt(e); for (let i = 0; i < n; i++) h[i] *= g;
    return h;
  };
  return [mk(1234567), mk(7654321)];
}
// y = (xL * hL, xR * hR): two real convolutions per complex FFT
function convolve(xL, xR, hL, hR) {
  const n = xL.length, M = hL.length;
  let F = 1; while (F < 2 * M) F <<= 1;
  const B = F - M + 1;
  const fft = makeFFT(F);
  const Hr = new Float64Array(F), Hi = new Float64Array(F);
  for (let i = 0; i < M; i++) { Hr[i] = hL[i]; Hi[i] = hR[i]; }
  fft(Hr, Hi, false);
  const LR = new Float64Array(F), LI = new Float64Array(F), RR = new Float64Array(F), RI = new Float64Array(F);
  for (let k = 0; k < F; k++) {
    const k2 = (F - k) % F;
    LR[k] = (Hr[k] + Hr[k2]) / 2; LI[k] = (Hi[k] - Hi[k2]) / 2;
    RR[k] = (Hi[k] + Hi[k2]) / 2; RI[k] = -(Hr[k] - Hr[k2]) / 2;
  }
  const oL = new Float32Array(n), oR = new Float32Array(n), re = new Float64Array(F), im = new Float64Array(F);
  for (let s = 0; s < n; s += B) {
    const e = Math.min(n, s + B);
    let any = false;
    re.fill(0); im.fill(0);
    for (let i = s; i < e; i++) { re[i - s] = xL[i]; im[i - s] = xR[i]; if (xL[i] !== 0 || xR[i] !== 0) any = true; }
    if (!any) continue;
    fft(re, im, false);
    for (let k = 0; k <= F / 2; k++) {
      const k2 = (F - k) % F, zr = re[k], zi = im[k], wr = re[k2], wi = im[k2];
      const Ar = (zr + wr) / 2, Ai = (zi - wi) / 2, Br = (zi + wi) / 2, Bi = -(zr - wr) / 2;
      const pr = Ar * LR[k] - Ai * LI[k], pi = Ar * LI[k] + Ai * LR[k], qr = Br * RR[k] - Bi * RI[k], qi = Br * RI[k] + Bi * RR[k];
      const p2r = Ar * LR[k2] + Ai * LI[k2], p2i = Ar * LI[k2] - Ai * LR[k2], q2r = Br * RR[k2] + Bi * RI[k2], q2i = Br * RI[k2] - Bi * RR[k2];
      re[k] = pr - qi; im[k] = pi + qr; re[k2] = p2r - q2i; im[k2] = p2i + q2r;
    }
    fft(re, im, true);
    for (let i = 0; i < F && s + i < n; i++) { oL[s + i] += re[i]; oR[s + i] += im[i]; }
  }
  return [oL, oR];
}

// ---------------------------------------------------------------- loudness (ITU BS.1770 integrated, gated)
function lufs(L, Rr, from = 0, to = L.length) {
  const kw = () => { const a = raw([1.53512485958697, -2.69169618940638, 1.19839281085285], [-1.69065929318241, .73248077421585]), b = raw([1, -2, 1], [-1.99004745483398, .99007225036621]); return (x) => b(a(x)); };
  const fl = kw(), fr = kw(), hop = Math.round(.1 * SR), e = [];
  for (let s = from; s + hop <= to; s += hop) { let q = 0; for (let i = s; i < s + hop; i++) { const a = fl(L[i]), b = fr(Rr[i]); q += a * a + b * b; } e.push(q); }
  const z = []; for (let h = 0; h + 4 <= e.length; h++) z.push((e[h] + e[h + 1] + e[h + 2] + e[h + 3]) / (4 * hop));
  const LK = (m) => -.691 + 10 * Math.log10(m + 1e-12), avg = (a) => a.reduce((p, c) => p + c, 0) / Math.max(1, a.length);
  const g1 = z.filter((m) => LK(m) > -70), rel = LK(avg(g1)) - 10;
  return LK(avg(g1.filter((m) => LK(m) > rel)));
}
// look-ahead peak limiter: sliding-min of the needed gain, smoothed over the look-ahead, slow release.
// Peaks are measured between samples too (4x windowed-sinc interpolation) so the true peak stays under the ceiling.
const TPK = [.25, .5, .75].map((f) => { const c = new Float64Array(32); for (let k = -15; k <= 16; k++) { const x = k - f, w = .5 + .5 * Math.cos(Math.PI * x / 16.5); c[k + 15] = (x === 0 ? 1 : Math.sin(Math.PI * x) / (Math.PI * x)) * w; } return c; });
function limit(L, Rr, ceilDb = -1.2, look = .005, rel = .15) {
  const n = L.length, la = Math.max(1, Math.round(look * SR)), ceil = Math.pow(10, ceilDb / 20), need = new Float32Array(n);
  const tp = (X, i) => {
    let m = Math.abs(X[i]);
    if (i < 15 || i + 16 >= n) return m;
    for (const c of TPK) { let v = 0; for (let k = 0; k < 32; k++) v += X[i - 15 + k] * c[k]; if (Math.abs(v) > m) m = Math.abs(v); }
    return m;
  };
  for (let i = 0; i < n; i++) { const p = Math.max(tp(L, i), tp(Rr, i)); need[i] = p > ceil ? ceil / p : 1; }
  const m = new Float32Array(n), dq = new Int32Array(n); let h = 0, tl = 0;
  for (let i = n - 1; i >= 0; i--) {
    while (tl > h && need[dq[tl - 1]] >= need[i]) tl--;
    dq[tl++] = i;
    while (dq[h] > i + la) h++;
    m[i] = need[dq[h]];
  }
  let acc = 0, g = 1, mn = 1; const rc = 1 - Math.exp(-1 / (rel * SR)), q = new Float32Array(la), worst = [];
  for (let i = 0; i < n; i++) {
    acc += m[i] - q[i % la]; q[i % la] = m[i];
    const sm = Math.min(m[i], acc / Math.min(la, i + 1));
    g = Math.min(sm, g + (1 - g) * rc);
    L[i] *= g; Rr[i] *= g; if (g < mn) mn = g;
    if (g < .6) { const t = i / SR, w = worst[worst.length - 1]; if (w && t - w[0] < .5) { if (g < w[1]) w[1] = g; } else worst.push([t, g]); }
  }
  if (worst.length) console.log('limiter > 4.4 dB at', worst.map(([t, gg]) => `${t.toFixed(2)}s ${(20 * Math.log10(gg)).toFixed(1)}`).join(', '));
  return mn;
}
function writeWav(file, L, Rr) {
  const n = L.length, D = Buffer.alloc(44 + n * 4);
  D.write('RIFF', 0); D.writeUInt32LE(36 + n * 4, 4); D.write('WAVE', 8); D.write('fmt ', 12); D.writeUInt32LE(16, 16); D.writeUInt16LE(1, 20); D.writeUInt16LE(2, 22);
  D.writeUInt32LE(SR, 24); D.writeUInt32LE(SR * 4, 28); D.writeUInt16LE(4, 32); D.writeUInt16LE(16, 34); D.write('data', 36); D.writeUInt32LE(n * 4, 40);
  for (let i = 0; i < n; i++) {
    D.writeInt16LE(Math.max(-32767, Math.min(32767, Math.round(L[i] * 32767 + rnd() - rnd()))), 44 + i * 4);
    D.writeInt16LE(Math.max(-32767, Math.min(32767, Math.round(Rr[i] * 32767 + rnd() - rnd()))), 46 + i * 4);
  }
  fs.writeFileSync(file, D);
}

// slow loudness rider: K-weighted 3 s (causal) short-term loudness pulled halfway toward target, limited boost/cut
function level(L, Rr, target = -20, o = {}) {
  const kw = () => { const a = raw([1.53512485958697, -2.69169618940638, 1.19839281085285], [-1.69065929318241, .73248077421585]), b = raw([1, -2, 1], [-1.99004745483398, .99007225036621]); return (x) => b(a(x)); };
  const fl = kw(), fr = kw(), hop = Math.round(.05 * SR), n = L.length, H = Math.ceil(n / hop), e = new Float64Array(H);
  for (let h = 0; h < H; h++) { let q = 0; for (let i = h * hop; i < Math.min(n, (h + 1) * hop); i++) { const a = fl(L[i]), b = fr(Rr[i]); q += a * a + b * b; } e[h] = q / hop; }
  const win = Math.round(3 / .05), gdb = new Float32Array(H);
  let acc = 0, sm = 0;
  for (let h = 0; h < H; h++) {
    acc += e[h] - (h >= win ? e[h - win] : 0);
    const st = -.691 + 10 * Math.log10(acc / Math.min(win, h + 1) + 1e-12);
    const want = st < (o.gate ?? -42) ? 0 : clamp((target - st) * (o.k ?? .5), -(o.cut ?? 2.5), o.boost ?? 4);
    sm += (want - sm) * (1 - Math.exp(-.05 / (o.tc ?? .8)));
    gdb[h] = sm;
  }
  for (let i = 0; i < n; i++) { const u = i / hop - .5, h = Math.max(0, Math.min(H - 2, Math.floor(u))), f = clamp(u - h); const g = Math.pow(10, (gdb[h] * (1 - f) + gdb[h + 1] * f) / 20); L[i] *= g; Rr[i] *= g; }
  return gdb;
}

module.exports = { SR, N, TAU, S0, clamp, rnd, R, white, BUS, HALL, out, SVF, biquad, raw, makeFFT, makeIR, convolve, lufs, level, limit, writeWav };
