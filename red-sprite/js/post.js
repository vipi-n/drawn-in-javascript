/* Compositing and photographic finish: highlight bloom, gentle vignette and luminance grain. */
(function (Scene) {
  'use strict';
  const { blur } = Scene;

  // Screens the tone-mapped sprite over the sky. F/flash optionally light the horizon clouds.
  Scene.composite = function (ctx, W, H, sky, E, F, flash = 0) {
    const img = ctx.createImageData(W, H);
    const d = img.data;
    const c = [0, 0, 0];
    const fr = 0.45 * flash, fg = 0.42 * flash, fb = 0.6 * flash;
    const lit = F && flash > 0;
    for (let i = 0, j = 0, k = 0; i < W * H; i++, j += 4, k += 3) {
      let sr = sky[k], sg = sky[k + 1], sb = sky[k + 2];
      if (lit) {
        const v = F[i];
        sr += fr * v;
        sg += fg * v;
        sb += fb * v;
      }
      Scene.spriteColor(E[i], c);
      d[j] = 255 * (1 - (1 - Math.min(1, sr)) * (1 - c[0]));
      d[j + 1] = 255 * (1 - (1 - Math.min(1, sg)) * (1 - c[1]));
      d[j + 2] = 255 * (1 - (1 - Math.min(1, sb)) * (1 - c[2]));
      d[j + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
  };

  Scene.bloom = function (ctx, W, H, S) {
    const img = ctx.getImageData(0, 0, W, H);
    const d = img.data;
    const N = W * H;
    const hi = [new Float32Array(N), new Float32Array(N), new Float32Array(N)];
    for (let i = 0, j = 0; i < N; i++, j += 4) {
      const r = d[j] / 255, g = d[j + 1] / 255, b = d[j + 2] / 255;
      const l = 0.3 * r + 0.59 * g + 0.11 * b;
      const k = l > 0.6 ? (l - 0.6) / l : 0;
      hi[0][i] = r * k;
      hi[1][i] = g * k;
      hi[2][i] = b * k;
    }
    const near = hi.map((c) => blur(c, W, H, 3 * S));
    const far = hi.map((c) => blur(c, W, H, 16 * S));
    for (let i = 0, j = 0; i < N; i++, j += 4) {
      d[j] += 255 * (0.28 * near[0][i] + 0.4 * far[0][i]);
      d[j + 1] += 255 * (0.28 * near[1][i] + 0.4 * far[1][i]);
      d[j + 2] += 255 * (0.28 * near[2][i] + 0.4 * far[2][i]);
    }
    ctx.putImageData(img, 0, 0);
  };

  Scene.lens = function (ctx, W, H, rand, grain = 1) {
    const img = ctx.getImageData(0, 0, W, H);
    const d = img.data;
    const cx = W / 2, cy = H * 0.46;
    for (let py = 0, i = 0; py < H; py++) {
      const vy = (py - cy) / (H * 0.62);
      for (let px = 0; px < W; px++, i++) {
        const vx = (px - cx) / (W * 0.62);
        const v = 1 - 0.24 * Math.pow(Math.min(1, vx * vx + vy * vy), 1.4);
        const j = i * 4;
        const r = d[j] / 255, g = d[j + 1] / 255, b = d[j + 2] / 255;
        const l = 0.3 * r + 0.59 * g + 0.11 * b;
        const n = (rand() + rand() - 1) * (0.012 + 0.03 * Math.sqrt(Math.min(1, l))) * grain;
        d[j] = (r * v + n) * 255;
        d[j + 1] = (g * v + n * 0.95) * 255;
        d[j + 2] = (b * v + n * 1.05) * 255;
      }
    }
    ctx.putImageData(img, 0, 0);
  };

  Scene.finish = function (ctx, W, H, S, rand) {
    Scene.bloom(ctx, W, H, S);
    Scene.lens(ctx, W, H, rand);
  };
})(window.Scene);
