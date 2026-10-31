/* Shared math, noise and float-buffer helpers. */
(function (Scene) {
  'use strict';

  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const mix = (a, b, t) => a + (b - a) * t;

  function smooth(a, b, x) {
    const t = clamp((x - a) / (b - a), 0, 1);
    return t * t * (3 - 2 * t);
  }

  function rng(seed) {
    let s = seed >>> 0;
    return function () {
      s = (s + 0x6d2b79f5) >>> 0;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function gauss(rand) {
    let u = 0;
    while (u === 0) u = rand();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rand());
  }

  function makeNoise(rand) {
    const perm = new Uint8Array(512);
    const base = Array.from({ length: 256 }, (_, i) => i);
    for (let i = 255; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [base[i], base[j]] = [base[j], base[i]];
    }
    for (let i = 0; i < 512; i++) perm[i] = base[i & 255];
    const gx = new Float32Array(256), gy = new Float32Array(256);
    for (let i = 0; i < 256; i++) {
      const a = rand() * Math.PI * 2;
      gx[i] = Math.cos(a);
      gy[i] = Math.sin(a);
    }
    const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);
    return function noise(x, y) {
      const xi = Math.floor(x), yi = Math.floor(y);
      const xf = x - xi, yf = y - yi;
      const X = xi & 255, Y = yi & 255;
      const h00 = perm[perm[X] + Y], h10 = perm[perm[X + 1] + Y];
      const h01 = perm[perm[X] + Y + 1], h11 = perm[perm[X + 1] + Y + 1];
      const d00 = gx[h00] * xf + gy[h00] * yf;
      const d10 = gx[h10] * (xf - 1) + gy[h10] * yf;
      const d01 = gx[h01] * xf + gy[h01] * (yf - 1);
      const d11 = gx[h11] * (xf - 1) + gy[h11] * (yf - 1);
      const u = fade(xf), v = fade(yf);
      const a = d00 + u * (d10 - d00);
      const b = d01 + u * (d11 - d01);
      return (a + v * (b - a)) * 1.4;
    };
  }

  function fbm(noise, x, y, octaves) {
    let sum = 0, amp = 0.5, freq = 1, norm = 0;
    for (let i = 0; i < octaves; i++) {
      sum += amp * noise(x * freq, y * freq);
      norm += amp;
      amp *= 0.5;
      freq *= 2.03;
    }
    return sum / norm;
  }

  // Evaluates fn(px, py) on a coarse grid of device pixels and bilinearly upsamples to W×H.
  function field(W, H, step, fn) {
    const gw = Math.ceil(W / step) + 2, gh = Math.ceil(H / step) + 2;
    const grid = new Float32Array(gw * gh);
    for (let j = 0; j < gh; j++) {
      for (let i = 0; i < gw; i++) grid[j * gw + i] = fn(i * step, j * step);
    }
    const out = new Float32Array(W * H);
    for (let y = 0; y < H; y++) {
      const gy = y / step, j0 = Math.floor(gy), fy = gy - j0;
      const r0 = j0 * gw, r1 = r0 + gw;
      for (let x = 0; x < W; x++) {
        const gxp = x / step, i0 = Math.floor(gxp), fx = gxp - i0;
        const a = grid[r0 + i0], b = grid[r0 + i0 + 1];
        const c = grid[r1 + i0], d = grid[r1 + i0 + 1];
        out[y * W + x] = (a + (b - a) * fx) * (1 - fy) + (c + (d - c) * fx) * fy;
      }
    }
    return out;
  }

  // ---- Gaussian blur on Float32 buffers (three box passes) ----

  function boxesForGauss(sigma, n) {
    const wIdeal = Math.sqrt((12 * sigma * sigma) / n + 1);
    let wl = Math.floor(wIdeal);
    if (wl % 2 === 0) wl--;
    const wu = wl + 2;
    const mIdeal = (12 * sigma * sigma - n * wl * wl - 4 * n * wl - 3 * n) / (-4 * wl - 4);
    const m = Math.round(mIdeal);
    const sizes = [];
    for (let i = 0; i < n; i++) sizes.push(i < m ? wl : wu);
    return sizes;
  }

  function boxH(src, dst, w, h, r) {
    const norm = 1 / (2 * r + 1);
    for (let y = 0; y < h; y++) {
      const row = y * w;
      let acc = 0;
      for (let k = -r; k <= r; k++) acc += src[row + clamp(k, 0, w - 1)];
      for (let x = 0; x < w; x++) {
        dst[row + x] = acc * norm;
        const add = x + r + 1, sub = x - r;
        acc += src[row + (add < w ? add : w - 1)] - src[row + (sub > 0 ? sub : 0)];
      }
    }
  }

  function boxV(src, dst, w, h, r) {
    const norm = 1 / (2 * r + 1);
    const acc = new Float32Array(w);
    for (let k = -r; k <= r; k++) {
      const row = clamp(k, 0, h - 1) * w;
      for (let x = 0; x < w; x++) acc[x] += src[row + x];
    }
    for (let y = 0; y < h; y++) {
      const row = y * w;
      const addRow = Math.min(y + r + 1, h - 1) * w;
      const subRow = Math.max(y - r, 0) * w;
      for (let x = 0; x < w; x++) {
        dst[row + x] = acc[x] * norm;
        acc[x] += src[addRow + x] - src[subRow + x];
      }
    }
  }

  function gaussFull(src, w, h, sigma) {
    let a = Float32Array.from(src);
    const b = new Float32Array(src.length);
    for (const size of boxesForGauss(sigma, 3)) {
      const r = (size - 1) >> 1;
      if (r <= 0) continue;
      boxH(a, b, w, h, r);
      boxV(b, a, w, h, r);
    }
    return a;
  }

  function downsample(src, w, h, f) {
    const dw = Math.ceil(w / f), dh = Math.ceil(h / f);
    const out = new Float32Array(dw * dh);
    const cnt = new Float32Array(dw * dh);
    for (let y = 0; y < h; y++) {
      const row = ((y / f) | 0) * dw;
      for (let x = 0; x < w; x++) {
        const k = row + ((x / f) | 0);
        out[k] += src[y * w + x];
        cnt[k]++;
      }
    }
    for (let i = 0; i < out.length; i++) out[i] /= cnt[i];
    return { data: out, dw, dh };
  }

  function upsample(src, dw, dh, f, w, h) {
    const out = new Float32Array(w * h);
    const xi = new Int32Array(w), xf = new Float32Array(w);
    for (let x = 0; x < w; x++) {
      const sx = clamp((x + 0.5) / f - 0.5, 0, dw - 1.001);
      xi[x] = Math.floor(sx);
      xf[x] = sx - xi[x];
    }
    for (let y = 0; y < h; y++) {
      const sy = clamp((y + 0.5) / f - 0.5, 0, dh - 1.001);
      const y0 = Math.floor(sy), fy = sy - y0;
      const r0 = y0 * dw, r1 = Math.min(y0 + 1, dh - 1) * dw;
      for (let x = 0; x < w; x++) {
        const i0 = xi[x], i1 = Math.min(i0 + 1, dw - 1), fx = xf[x];
        const top = src[r0 + i0] + (src[r0 + i1] - src[r0 + i0]) * fx;
        const bot = src[r1 + i0] + (src[r1 + i1] - src[r1 + i0]) * fx;
        out[y * w + x] = top + (bot - top) * fy;
      }
    }
    return out;
  }

  // Large radii are blurred at reduced resolution; the result is smooth enough that nobody can tell.
  function blur(src, w, h, sigma) {
    const f = sigma > 32 ? 8 : sigma > 16 ? 4 : sigma > 8 ? 2 : 1;
    if (f === 1) return gaussFull(src, w, h, sigma);
    const { data, dw, dh } = downsample(src, w, h, f);
    return upsample(gaussFull(data, dw, dh, sigma / f), dw, dh, f, w, h);
  }

  Object.assign(Scene, { clamp, mix, smooth, rng, gauss, makeNoise, fbm, field, blur });
})((window.Scene = window.Scene || {}));
