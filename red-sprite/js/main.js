(function () {
  'use strict';
  const Scene = window.Scene;
  const DESIGN_W = 819, DESIGN_H = 1024;

  const params = new URLSearchParams(location.search);
  const exportMode = params.has('export');

  if (params.has('anim')) {
    document.body.classList.add('export');
    let anim = null;
    window.Anim = {
      init(opts) {
        anim = Scene.createAnimation(opts);
        return { frames: anim.frames, fps: anim.fps, width: anim.width, height: anim.height };
      },
      frame: (i) => anim.frameData(i),
    };
    return;
  }
  const width = Math.max(410, Math.min(4096, parseInt(params.get('w'), 10) || 1638));
  let seed = parseInt(params.get('seed'), 10) || 7;

  const canvas = document.getElementById('art');
  const status = document.getElementById('status');
  const saveBtn = document.getElementById('save');
  const reseedBtn = document.getElementById('reseed');

  function render() {
    const t0 = performance.now();
    const S = width / DESIGN_W;
    const W = width, H = Math.round(DESIGN_H * S);
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const noise = Scene.makeNoise(Scene.rng(seed * 7919 + 13));
    const sky = Scene.buildSky(W, H, S, Scene.rng(seed + 101), noise);
    const E = Scene.buildSprite(W, H, S, Scene.rng(seed + 202), noise);
    Scene.composite(ctx, W, H, sky, E);
    Scene.drawVillage(ctx, W, H, S, Scene.rng(seed + 303), noise);
    Scene.finish(ctx, W, H, S, Scene.rng(seed + 404));
    return performance.now() - t0;
  }

  if (exportMode) {
    document.body.classList.add('export');
    const ms = render();
    document.getElementById('png').textContent = canvas.toDataURL('image/png');
    document.title = `rendered in ${Math.round(ms)} ms`;
    return;
  }

  function run() {
    status.textContent = 'Painting with light…';
    saveBtn.disabled = reseedBtn.disabled = true;
    setTimeout(() => {
      const ms = render();
      status.textContent = `Seed ${seed} · ${canvas.width}×${canvas.height} · ${(ms / 1000).toFixed(1)} s`;
      saveBtn.disabled = reseedBtn.disabled = false;
    }, 30);
  }

  saveBtn.addEventListener('click', () => {
    const a = document.createElement('a');
    a.download = `red-sprites-seed-${seed}.png`;
    a.href = canvas.toDataURL('image/png');
    a.click();
  });
  reseedBtn.addEventListener('click', () => {
    seed = Math.floor(Math.random() * 1e6);
    run();
  });
  run();
})();
