/*
 * Slow-motion clip of the sprite igniting: a distant thunderstorm flashes below the horizon, the halo
 * descends, streamers crack downward from each head, and the scene settles into the still picture
 * while the camera slowly pushes in. Frames are rendered one at a time (driven by tools/video.mjs).
 */
(function (Scene) {
  'use strict';
  const { smooth, fbm } = Scene;
  const DESIGN_W = 819, DESIGN_H = 1024;

  // Flicker of the parent lightning inside the storm beyond the horizon.
  function flashAt(t) {
    const p = (c, rise, decay) => (t < c ? Math.exp(-Math.pow((t - c) / rise, 2)) : Math.exp(-(t - c) / decay));
    return (
      0.35 * p(0.5, 0.02, 0.07) + 1.0 * p(0.76, 0.025, 0.12) + 0.55 * p(0.93, 0.02, 0.08) + 0.25 * p(1.3, 0.03, 0.1) +
      0.15 * p(2.6, 0.03, 0.12) + 0.12 * p(4.1, 0.03, 0.09) + 0.08 * p(6.3, 0.03, 0.1)
    );
  }

  function makeCanvas(w, h) {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    return c;
  }

  Scene.createAnimation = function ({ width = 1080, fps = 30, duration = 9, seed = 7, zoom = 0.05, grain = 0.7 } = {}) {
    const even = (v) => 2 * Math.round(v / 2);
    const outW = even(width), outH = even((outW * DESIGN_H) / DESIGN_W);
    const Wr = Math.round(outW * (1 + zoom)), S = Wr / DESIGN_W, Hr = Math.round(DESIGN_H * S);

    const noise = Scene.makeNoise(Scene.rng(seed * 7919 + 13));
    const sky = Scene.buildSky(Wr, Hr, S, Scene.rng(seed + 101), noise);
    const sprite = Scene.createSprite(Wr, Hr, S, Scene.rng(seed + 202), noise, Scene.rng(seed + 909));

    // Storm clouds just below the horizon, only visible while the lightning inside them flashes.
    const clouds = Scene.field(Wr, Hr, 3, (px, py) => {
      const x = px / S, y = py / S;
      if (y > 800) return 0;
      const band = Math.exp(-Math.pow((x - 500) / 280, 2) - Math.pow((y - 708) / 50, 2));
      const billow = smooth(-0.15, 0.45, fbm(noise, x * 0.011 + 40.3, y * 0.028 + 7.1, 4));
      const wide = Math.exp(-Math.pow((x - 500) / 460, 2) - Math.pow((y - 650) / 150, 2));
      return band * (0.3 + 1.2 * billow) + 0.22 * wide;
    });

    const village = makeCanvas(Wr, Hr);
    const lamps = Scene.drawVillage(village.getContext('2d'), Wr, Hr, S, Scene.rng(seed + 303), noise, { glows: false });
    const glow = makeCanvas(Wr, Hr);
    const gctx = glow.getContext('2d');
    gctx.fillStyle = '#000';
    gctx.fillRect(0, 0, Wr, Hr);
    Scene.drawLampGlows(gctx, S, lamps);

    const frame = makeCanvas(Wr, Hr);
    const fctx = frame.getContext('2d', { willReadFrequently: true });
    const out = document.getElementById('art');
    out.width = outW;
    out.height = outH;
    const octx = out.getContext('2d', { willReadFrequently: true });
    const frames = Math.round(duration * fps);

    function render(i) {
      const t = i / fps;
      const E = sprite.renderE(t);
      Scene.composite(fctx, Wr, Hr, sky, E, clouds, flashAt(t));
      fctx.drawImage(village, 0, 0);
      fctx.globalCompositeOperation = 'lighter';
      fctx.drawImage(glow, 0, 0);
      fctx.globalCompositeOperation = 'source-over';
      Scene.bloom(fctx, Wr, Hr, S);

      const p = Math.min(1, t / duration);
      const e = p * p * (3 - 2 * p);
      const z = 1 + zoom * e;
      const vw = Wr / z, vh = Hr / z;
      const sx = (Wr - vw) / 2;
      const sy = Math.max(0, Math.min(Hr - vh, Hr * (0.5 - 0.022 * e) - vh / 2));
      octx.imageSmoothingEnabled = true;
      octx.imageSmoothingQuality = 'high';
      octx.drawImage(frame, sx, sy, vw, vh, 0, 0, outW, outH);
      Scene.lens(octx, outW, outH, Scene.rng(seed * 100003 + i), grain);
      return out;
    }

    return {
      frames,
      fps,
      width: outW,
      height: outH,
      render,
      frameData: (i, quality = 0.95) => render(i).toDataURL('image/jpeg', quality),
    };
  };
})(window.Scene);
