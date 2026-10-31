/* Night sky: graded, slightly mottled darkness with sodium light pollution near the horizon, plus stars. */
(function (Scene) {
  'use strict';
  const { smooth, fbm, field } = Scene;

  // [design y, r, g, b] in 0..255
  const STOPS = [
    [0, 7, 7, 10],
    [250, 9, 9, 12],
    [470, 14, 12, 14],
    [590, 21, 18, 18],
    [660, 31, 25, 21],
    [715, 44, 34, 26],
    [1024, 46, 35, 26],
  ];

  function stopColor(y) {
    for (let i = 1; i < STOPS.length; i++) {
      if (y <= STOPS[i][0]) {
        const a = STOPS[i - 1], b = STOPS[i];
        const t = (y - a[0]) / (b[0] - a[0]);
        const s = t * t * (3 - 2 * t);
        return [a[1] + (b[1] - a[1]) * s, a[2] + (b[2] - a[2]) * s, a[3] + (b[3] - a[3]) * s];
      }
    }
    const l = STOPS[STOPS.length - 1];
    return [l[1], l[2], l[3]];
  }

  function splat(buf, W, H, x, y, r, g, b, sigma) {
    const R = Math.ceil(sigma * 3);
    const x0 = Math.max(0, Math.floor(x - R)), x1 = Math.min(W - 1, Math.ceil(x + R));
    const y0 = Math.max(0, Math.floor(y - R)), y1 = Math.min(H - 1, Math.ceil(y + R));
    const k = 1 / (2 * sigma * sigma);
    for (let py = y0; py <= y1; py++) {
      const dy = py + 0.5 - y;
      for (let px = x0; px <= x1; px++) {
        const dx = px + 0.5 - x;
        const w = Math.exp(-(dx * dx + dy * dy) * k);
        if (w < 0.002) continue;
        const i = (py * W + px) * 3;
        buf[i] += r * w;
        buf[i + 1] += g * w;
        buf[i + 2] += b * w;
      }
    }
  }

  function stars(sky, W, H, S, rand) {
    const area = (W * H) / (1638 * 2048);
    const px = S / 2;
    const tiers = [
      { n: 1700, b: () => 0.06 + 0.22 * rand() * rand(), s: () => 0.55 + 0.2 * rand() },
      { n: 560, b: () => 0.28 + 0.4 * rand(), s: () => 0.68 + 0.25 * rand() },
      { n: 80, b: () => 0.7 + 0.5 * rand(), s: () => 0.85 + 0.35 * rand() },
      { n: 9, b: () => 1.2 + 0.7 * rand(), s: () => 1.1 + 0.35 * rand(), halo: true },
    ];
    for (const tier of tiers) {
      const n = Math.round(tier.n * area);
      for (let k = 0; k < n; k++) {
        const x = rand() * W, y = rand() * 760 * S;
        const fade = 1 - 0.8 * smooth(560, 740, y / S);
        const b = tier.b() * fade;
        const t = rand();
        const c = t < 0.55 ? [1, 1, 1] : t < 0.8 ? [0.8, 0.88, 1] : [1, 0.87, 0.72];
        const sig = tier.s() * px;
        splat(sky, W, H, x, y, b * c[0], b * c[1], b * c[2], sig);
        if (tier.halo) splat(sky, W, H, x, y, 0.05 * b * c[0], 0.05 * b * c[1], 0.05 * b * c[2], sig * 5);
      }
    }
  }

  Scene.buildSky = function (W, H, S, rand, noise) {
    const sky = new Float32Array(W * H * 3);
    const mottle = field(W, H, 8, (px, py) => fbm(noise, (px / S) * 0.0045 + 21.7, (py / S) * 0.007 + 3.9, 3));
    for (let py = 0; py < H; py++) {
      const y = py / S;
      const c = stopColor(y);
      const hz = Math.exp(-Math.pow((y - 735) / 95, 2));
      for (let px = 0; px < W; px++) {
        const x = px / S, i = py * W + px;
        const m = 1 + 0.16 * mottle[i];
        const lp = hz * (0.6 + 0.4 * Math.exp(-Math.pow((x - 180) / 260, 2)) + 0.35 * Math.exp(-Math.pow((x - 760) / 120, 2)));
        sky[i * 3] = (c[0] * m + 16 * lp) / 255;
        sky[i * 3 + 1] = (c[1] * m + 10 * lp) / 255;
        sky[i * 3 + 2] = (c[2] * m + 6 * lp) / 255;
      }
    }
    stars(sky, W, H, S, rand);
    return sky;
  };
})(window.Scene);
