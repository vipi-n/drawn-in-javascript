/*
 * The red sprite, built as an emission field E (arbitrary linear units) with a timeline.
 * createSprite records every streamer, bead and glow together with the moment it ignites;
 * renderE(t) rebuilds the field at time t (seconds) and renderE(Infinity) is the finished sprite.
 * Diffuse crown + column glows are analytic; streamers are drawn on offscreen canvases,
 * read back, bloomed in float and summed into E.
 */
(function (Scene) {
  'use strict';
  const { smooth, clamp, fbm, gauss, blur } = Scene;

  const CX = 490;

  // Sprite heads, positioned after the reference photo in 819×1024 design space.
  // up: glowing tuft above the head, len: tendril reach, spread: fan half-angle (rad),
  // fil: tendrils leaving the head, br: branchiness, hot: how white-hot the head burns.
  const COLUMNS = [
    { x: 127, y: 296, up: 0.25, len: 236, spread: 0.04, fil: 3, I: 0.55, br: 0.3, hot: 0.12 },
    { x: 139, y: 304, up: 0.15, len: 190, spread: 0.05, fil: 2, I: 0.45, br: 0.25, hot: 0.08 },
    { x: 212, y: 338, up: 0.3, len: 176, spread: 0.1, fil: 4, I: 0.55, br: 0.55, hot: 0.15 },
    { x: 223, y: 343, up: 0.45, len: 172, spread: 0.13, fil: 5, I: 0.62, br: 0.65, hot: 0.25 },
    { x: 251, y: 351, up: 0.75, len: 172, spread: 0.18, fil: 7, I: 0.75, br: 0.85, hot: 0.55 },
    { x: 304, y: 382, up: 1.0, len: 240, spread: 0.3, fil: 12, I: 0.95, br: 1.1, hot: 0.95 },
    { x: 332, y: 357, up: 0.6, len: 266, spread: 0.22, fil: 7, I: 0.8, br: 1.0, hot: 0.6 },
    { x: 357, y: 306, up: 1.0, len: 320, spread: 0.18, fil: 8, I: 0.85, br: 1.0, hot: 0.85 },
    { x: 385, y: 397, up: 1.1, len: 248, spread: 0.32, fil: 13, I: 1.0, br: 1.15, hot: 1.0 },
    { x: 432, y: 332, up: 0.55, len: 304, spread: 0.22, fil: 7, I: 0.75, br: 1.0, hot: 0.5 },
    { x: 492, y: 407, up: 0, len: 258, spread: 0.46, fil: 30, I: 1.1, br: 1.1, hot: 1.0, core: true },
    { x: 536, y: 342, up: 0.45, len: 288, spread: 0.2, fil: 6, I: 0.75, br: 0.9, hot: 0.45 },
    { x: 581, y: 291, up: 1.0, len: 290, spread: 0.07, fil: 7, I: 0.9, br: 0.7, hot: 0.85, ba: 0.5 },
    { x: 601, y: 316, up: 0.85, len: 266, spread: 0.07, fil: 6, I: 0.85, br: 0.7, hot: 0.7, ba: 0.5 },
    { x: 624, y: 322, up: 0.85, len: 262, spread: 0.07, fil: 6, I: 0.85, br: 0.7, hot: 0.7, ba: 0.5 },
    { x: 657, y: 351, up: 0.35, len: 232, spread: 0.06, fil: 5, I: 0.8, br: 0.6, hot: 0.2, red: true, ba: 0.5 },
    { x: 680, y: 333, up: 0.3, len: 204, spread: 0.06, fil: 4, I: 0.72, br: 0.5, hot: 0.18, red: true, ba: 0.5 },
    { x: 705, y: 342, up: 0.2, len: 146, spread: 0.05, fil: 3, I: 0.55, br: 0.35, hot: 0.1, red: true, ba: 0.6 },
  ];

  // Slow-motion timeline in seconds and design units per second. The halo appears right after the
  // parent lightning stroke, the central column fires first and its neighbours follow outward.
  // Fronts advance in bursts every `step` seconds, like a stepped leader.
  const TIME = { halo: 0.88, core: 1.2, vDown: 88, vUp: 75, vCore: 250, step: 0.11 };
  Scene.SPRITE_TIME = TIME;

  function layer(W, H, S) {
    const c = document.createElement('canvas');
    c.width = W;
    c.height = H;
    const ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.setTransform(S, 0, 0, S, 0, 0);
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    return ctx;
  }

  function clearLayer(ctx) {
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.restore();
  }

  function readLayer(ctx, W, H) {
    const d = ctx.getImageData(0, 0, W, H).data;
    const out = new Float32Array(W * H);
    for (let i = 0, j = 0; i < out.length; i++, j += 4) out[i] = d[j] / 255;
    return out;
  }

  function unitBlob(ctx) {
    const gr = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
    gr.addColorStop(0, 'rgba(255,255,255,1)');
    gr.addColorStop(0.35, 'rgba(255,255,255,0.5)');
    gr.addColorStop(1, 'rgba(255,255,255,0)');
    return gr;
  }

  // Brightness of something that ignited u seconds ago: a fast rise and an overshoot that settles to 1.
  const kick = (u, k, tau, rise = 0.035) => (u <= 0 ? 0 : smooth(0, rise, u) * (1 + k * Math.exp(-u / tau)));

  Scene.createSprite = function (W, H, S, rand, noise, timeRand) {
    const tr = timeRand || Scene.rng(9091);
    const g = () => gauss(rand);
    const fil = layer(W, H, S);
    const hot = layer(W, H, S);
    const blobFill = new Map([
      [fil, unitBlob(fil)],
      [hot, unitBlob(hot)],
    ]);
    const strokes = [], blobs = [], glows = [];
    let core = null;

    const times = COLUMNS.map((c) =>
      c.core ? TIME.core : TIME.core + 0.15 + Math.abs(c.x - 492) / 330 + tr() * 0.55
    );
    const lastIgnition = Math.max(...times);

    // ---------- diffuse crown ----------
    const topY = (x) => 302 - 198 * Math.exp(-Math.pow((x - CX) / (x < CX ? 290 : 262), 2));
    const botY = (x) => 340 - 26 * (1 - smooth(0, 330, x)) + 10 * noise(x * 0.012, 7.7);
    const crown = Scene.field(W, H, 3, (px, py) => {
      const x = px / S, y = py / S;
      if (y > 760) return 0;
      const t = topY(x), b = botY(x);
      const mv = smooth(t - 18, t + 48, y) * (1 - smooth(b - 45, b + 28, y));
      const hx =
        (0.3 + 0.7 * Math.exp(-Math.pow((x - CX) / (x < CX ? 290 : 205), 2))) *
        smooth(-190, 130, x) *
        (1 - smooth(690, 752, x));
      let c = 0;
      if (mv * hx > 0.001) {
        const streak = fbm(noise, x * 0.02 + 3.3, y * 0.0045 + 1.1, 4);
        const mottle = fbm(noise, x * 0.0065 - 4.1, y * 0.009 + 8.2, 3);
        c = mv * hx * clamp(0.64 + 0.65 * streak + 0.6 * mottle, 0.08, 2.2);
      }
      const amb = Math.exp(-Math.pow((x - CX + 40) / 360, 2) - Math.pow((y - 290) / 200, 2));
      const veil = smooth(300, 390, y) * (1 - smooth(540, 690, y)) * Math.exp(-Math.pow((x - 470) / 190, 2));
      return 2.6 * c + 0.16 * amb + 0.18 * veil;
    });

    // The halo descends from the top of the crown, then fills in as the columns fire.
    function crownEnv(y, t) {
      const u = t - (TIME.halo + (Math.max(0, y - 100) / 240) * 0.35);
      if (u <= 0) return 0;
      const level = 0.5 + 0.5 * smooth(TIME.core - 0.05, lastIgnition + 0.6, t);
      return smooth(0, 0.3, u) * (level + 0.7 * Math.exp(-u / 0.35));
    }

    // Diffuse upper body of a carrot sprite: a glow rising and widening above its head.
    function addGlow(hx, hy, amp, sx, L, t0) {
      const x0 = Math.max(0, Math.floor((hx - sx * 10) * S)), x1 = Math.min(W - 1, Math.ceil((hx + sx * 10) * S));
      const y0 = Math.max(0, Math.floor((hy - L * 3) * S)), y1 = Math.min(H - 1, Math.ceil((hy + 14) * S));
      const w = x1 - x0 + 1, h = y1 - y0 + 1;
      const data = new Float32Array(w * h);
      for (let py = y0; py <= y1; py++) {
        const dy = hy - py / S;
        const vp = dy > 0 ? Math.exp(-dy / L) * (1 - smooth(L * 1.2, L * 3, dy)) : Math.exp(-(dy * dy) / 50);
        const s = sx * (1 + Math.max(0, dy) / (L * 1.6));
        const k = 1 / (2 * s * s);
        for (let px = x0; px <= x1; px++) {
          const dx = px / S - hx;
          data[(py - y0) * w + (px - x0)] = amp * vp * Math.exp(-dx * dx * k);
        }
      }
      glows.push({ x0, y0, w, h, data, t0 });
    }

    function walk(x, y, a, len, jit) {
      const pts = [x, y];
      let ang = a, t = 0;
      while (t < len) {
        const st = Math.min(len - t, 2 + rand() * 2.5);
        ang += (rand() - 0.5) * jit;
        ang += (a - ang) * 0.2;
        x += Math.cos(ang) * st;
        y += Math.sin(ang) * st;
        t += st;
        pts.push(x, y);
      }
      return pts;
    }

    function arcTo(pts, j) {
      let d = 0;
      for (let i = 1; i <= j; i++) d += Math.hypot(pts[2 * i] - pts[2 * i - 2], pts[2 * i + 1] - pts[2 * i - 1]);
      return d;
    }

    // lead: brightness of the fresh channel just behind a propagating tip; tip: hot bead riding the front.
    function stroke(ctx, pts, width, I, mode, t0, v, lead = 0, tip = 0) {
      const n = pts.length >> 1;
      if (n < 2) return;
      const x0 = pts[0], y0 = pts[1], x1 = pts[2 * n - 2], y1 = pts[2 * n - 1];
      if (Math.hypot(x1 - x0, y1 - y0) < 0.5) return;
      const gr = ctx.createLinearGradient(x0, y0, x1, y1);
      const K = 11;
      for (let k = 0; k <= K; k++) {
        const t = k / K;
        let a;
        if (mode === 'down') a = (1 - Math.pow(t, 1.4)) * (0.4 + 0.6 * smooth(0, 0.08, t));
        else if (mode === 'fade') a = Math.pow(1 - t, 1.6);
        else a = 1 - 0.3 * t;
        a *= I * (0.5 + 0.9 * rand());
        gr.addColorStop(t, `rgba(255,255,255,${clamp(a, 0, 1).toFixed(4)})`);
      }
      const cum = new Float32Array(n);
      for (let i = 1; i < n; i++) cum[i] = cum[i - 1] + Math.hypot(pts[2 * i] - pts[2 * i - 2], pts[2 * i + 1] - pts[2 * i - 1]);
      strokes.push({ ctx, pts, cum, len: cum[n - 1], width, grad: gr, I, t0, v, lead, tip, phase: tr() });
    }

    function blob(ctx, x, y, rx, ry, a, t0, k = 1, tau = 0.3, halo = false) {
      blobs.push({ ctx, x, y, rx, ry, a, t0, k, tau, halo });
    }

    // A streamer: a jagged, mostly straight channel that keeps splitting into finer ones.
    function grow(x, y, a, len, w, I, depth, c, t0, v) {
      const pts = [x, y];
      let ang = a, d = 0;
      while (d < len) {
        const st = 2 + rand() * 3;
        ang += (rand() - 0.5) * 0.34;
        ang += (a - ang) * 0.16;
        x += Math.cos(ang) * st;
        y += Math.sin(ang) * st;
        d += st;
        pts.push(x, y);
        const rem = len - d;
        const here = t0 + d / v;
        if (depth < 4 && rem > 14 && rand() < (c.br * st) / 52) {
          const side = rand() < 0.5 ? -1 : 1;
          const da = (0.07 + rand() * 0.28) * (c.ba ?? 1);
          grow(x, y, ang + side * da, rem * (0.4 + rand() * 0.55), w * 0.84, I * 0.88, depth + 1, c, here, v * (0.92 + 0.08 * tr()));
          if (rand() < 0.4) blob(hot, x, y, 0.8, 0.95, I * (0.1 + rand() * 0.3), here, 1.4, 0.25);
        }
        if (rand() < 0.005 * st * (c.hot + 0.3)) blob(hot, x, y, 0.7 + rand() * 0.4, 0.85, I * (0.12 + rand() * 0.32), here, 1.4, 0.25);
      }
      stroke(fil, pts, w, I, 'down', t0, v, 1, 1);
    }

    function buildCore(cx, t0) {
      const x0 = Math.floor((cx - 125) * S), x1 = Math.ceil((cx + 125) * S);
      const y0 = Math.floor(135 * S), y1 = Math.ceil(432 * S);
      const w = x1 - x0 + 1, h = y1 - y0 + 1;
      const data = new Float32Array(w * h);
      for (let py = y0; py <= y1; py++) {
        const y = py / S;
        const prof = smooth(148, 230, y) * (1 - 0.7 * smooth(290, 385, y)) * (1 - smooth(398, 430, y));
        if (prof <= 0) continue;
        const sig = 4 + 6.5 * Math.exp(-Math.pow((y - 245) / 80, 2));
        const sway = 1.6 * noise(y * 0.012, 4.2);
        const k = 1 / (2 * sig * sig);
        for (let px = x0; px <= x1; px++) {
          const dx = px / S - cx - sway;
          const q = dx * dx * k;
          if (q > 120) continue;
          const n = 0.5 + 0.5 * noise(dx * 0.42 + 9.1, y * 0.014);
          const str = 0.3 + 1.1 * n * n;
          data[(py - y0) * w + (px - x0)] = prof * (20 * Math.exp(-q) * str + 2.4 * Math.exp(-q / 12));
        }
      }
      core = { x0, y0, w, h, data, t0, foot: 430 };

      // Sheaf of bright streamers shooting up from the column's foot.
      for (let k = 0; k < 80; k++) {
        const len = 60 + rand() * 190;
        const p = walk(cx + g() * 1.6, 404 - rand() * 14, -Math.PI / 2 + g() * (0.05 + 1.6 / len), len, 0.1);
        stroke(hot, p, 0.4 + rand() * 0.7, 0.05 + rand() * 0.16, 'fade', t0, TIME.vCore);
        stroke(fil, p, 0.8, 0.25 + rand() * 0.3, 'fade', t0, TIME.vCore, 0.5);
      }
      for (let k = 0; k < 40; k++) {
        const p = walk(cx + g() * 1.5, 406 - rand() * 20, -Math.PI / 2 + g() * 0.3, 20 + rand() * 80, 0.18);
        stroke(hot, p, 0.4 + rand() * 0.5, 0.04 + rand() * 0.1, 'fade', t0, TIME.vCore * 0.6);
        stroke(fil, p, 0.75, 0.3 + rand() * 0.35, 'fade', t0, TIME.vCore * 0.6, 0.5);
      }
      blob(fil, cx, 404, 7, 10, 0.8, t0, 1.2, 0.4);
      blob(hot, cx, 407, 3.2, 4.6, 0.95, t0, 1.6, 0.4, true);
      blob(hot, cx + 0.5, 386, 2.2, 3.4, 0.6, t0 + 0.04, 1.4, 0.3);
      blob(hot, cx - 0.4, 420, 1.6, 2, 0.6, t0 + 0.02, 1.4, 0.3);
      addGlow(cx, 395, 3.4, 13, 75, t0);
    }

    function column(c, tc) {
      const { x, y } = c;
      const vUp = TIME.vUp * (0.85 + 0.3 * tr());
      if (c.core) {
        buildCore(x, tc);
      } else {
        addGlow(x, y - 2, 0.5 + 1.3 * c.up, 3.5 + 4.5 * c.up, 26 + 40 * c.up, tc);
        // Brush-like tuft of short streamers opening upward from the head.
        const nt = Math.round(10 + 26 * c.up);
        for (let k = 0; k < nt; k++) {
          const len = (12 + rand() * 40) * (0.5 + 0.8 * c.up);
          const p = walk(x + g() * 1.4, y - 1, -Math.PI / 2 + g() * (0.13 + 0.08 * c.up), len, 0.16);
          const ts = tc + 0.03 * tr(), vs = vUp * (0.75 + 0.5 * tr());
          stroke(hot, p, 0.5 + rand() * 0.7, (0.05 + 0.12 * rand()) * c.hot, 'fade', ts, vs);
          stroke(fil, p, 0.7, (0.25 + 0.3 * rand()) * c.I, 'fade', ts, vs, 0.6);
        }
        blob(hot, x, y - 4 - 5 * c.up, 3.5 + 3.5 * c.up, 8 + 11 * c.up, 0.09 * c.hot, tc + 0.05, 1.2, 0.4);
        const nr = Math.round(2 + 6 * c.up);
        for (let k = 0; k < nr; k++) {
          const p = walk(x + g() * 2, y - 4, -Math.PI / 2 + g() * 0.12, 30 + rand() * 70, 0.15);
          stroke(fil, p, 0.9, 0.1 + 0.15 * rand(), 'fade', tc, vUp, 0.3);
        }
        blob(fil, x, y + 1, 4 + 3 * c.up, 6 + 4 * c.up, 0.55 + 0.35 * c.I, tc, 1.0, 0.4);
        if (c.red) {
          blob(fil, x, y, 3.4, 5, 0.9, tc, 1.0, 0.4);
          blob(hot, x, y, 3.2, 4.8, 0.1 + 0.05 * rand(), tc, 2.0, 0.35, true);
        } else {
          blob(hot, x, y + 1, 2.6 + 2.6 * c.hot, 4 + 5 * c.hot, 0.25 + 0.6 * c.hot, tc, 1.6, 0.35, true);
        }
      }

      const vDown = TIME.vDown * (0.85 + 0.3 * tr());
      const tl = c.core ? 14 : 5 + 6 * rand() + 18 * rand() * c.hot;
      const trunk = walk(x, y + 2, Math.PI / 2 + g() * 0.03, tl, 0.12);
      stroke(fil, trunk, 1.5, 0.95 * c.I, 'flat', tc, vDown, 1, 1);
      stroke(hot, trunk, 0.9, 0.1 * c.hot, 'fade', tc, vDown);
      const nb = 1 + Math.floor(rand() * 3.5 * c.hot);
      for (let k = 0; k < nb; k++) {
        const j = 1 + Math.floor(rand() * ((trunk.length >> 1) - 1));
        blob(hot, trunk[2 * j], trunk[2 * j + 1], 1.1, 1.4, (0.45 + 0.5 * rand()) * c.hot, tc + arcTo(trunk, j) / vDown, 1.4, 0.3);
      }
      const ex = trunk[trunk.length - 2], ey = trunk[trunk.length - 1];
      const tf = tc + arcTo(trunk, (trunk.length >> 1) - 1) / vDown;
      for (let f = 0; f < c.fil; f++) {
        grow(
          ex + g() * 0.8,
          ey + rand() * 3,
          Math.PI / 2 + g() * c.spread,
          (c.len - tl) * (0.5 + rand() * 0.45 + (rand() < 0.2 ? 0.15 : 0)),
          0.7 + rand() * 0.5,
          c.I * (0.6 + rand() * 0.45),
          0,
          c,
          tf,
          vDown * (0.9 + 0.2 * tr())
        );
      }
    }

    COLUMNS.forEach((c, i) => column(c, times[i]));

    // ---------- rendering at time t ----------

    function drawBlob(ctx, x, y, rx, ry, a) {
      if (a <= 0.002) return;
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(rx, ry);
      ctx.globalAlpha = Math.min(1, a);
      ctx.fillStyle = blobFill.get(ctx);
      ctx.beginPath();
      ctx.arc(0, 0, 1, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Position at arc length d along a stroke, and the index of the segment's end point.
    function pointAt(s, d) {
      const { cum, pts } = s;
      let i = 1;
      while (i < cum.length - 1 && cum[i] < d) i++;
      const seg = cum[i] - cum[i - 1] || 1;
      const f = clamp((d - cum[i - 1]) / seg, 0, 1);
      return [pts[2 * i - 2] + (pts[2 * i] - pts[2 * i - 2]) * f, pts[2 * i - 1] + (pts[2 * i + 1] - pts[2 * i - 1]) * f, i];
    }

    const stepped = (q) => Math.floor(q) + smooth(0, 0.4, q - Math.floor(q));

    function drawStroke(s, t) {
      const { ctx, pts } = s;
      const u = t - s.t0;
      const reach = t === Infinity ? Infinity : u <= 0 ? 0 : s.v * TIME.step * (stepped(u / TIME.step + s.phase) - stepped(s.phase));
      if (reach <= 0) return;
      const n = pts.length >> 1;
      ctx.strokeStyle = s.grad;
      ctx.lineWidth = s.width;
      ctx.beginPath();
      ctx.moveTo(pts[0], pts[1]);
      if (reach >= s.len) {
        for (let i = 1; i < n; i++) ctx.lineTo(pts[2 * i], pts[2 * i + 1]);
      } else {
        const [tx, ty, i] = pointAt(s, reach);
        for (let k = 1; k < i; k++) ctx.lineTo(pts[2 * k], pts[2 * k + 1]);
        ctx.lineTo(tx, ty);
      }
      ctx.stroke();
      if (t === Infinity || (!s.lead && !s.tip)) return;

      const tEnd = s.t0 + s.len / s.v;
      const decay = t < tEnd ? 1 : Math.exp(-(t - tEnd) / 0.18);
      if (decay < 0.02) return;
      const head = Math.min(reach, s.len);
      const [hx, hy, ih] = pointAt(s, head);
      if (s.lead) {
        const [ax, ay, ia] = pointAt(s, Math.max(0, head - 45));
        if (Math.hypot(hx - ax, hy - ay) > 0.5) {
          const gr = fil.createLinearGradient(ax, ay, hx, hy);
          gr.addColorStop(0, 'rgba(255,255,255,0)');
          gr.addColorStop(1, `rgba(255,255,255,${clamp(0.8 * s.I * s.lead * decay, 0, 1).toFixed(4)})`);
          fil.strokeStyle = gr;
          fil.lineWidth = s.width * 1.3;
          fil.beginPath();
          fil.moveTo(ax, ay);
          for (let k = ia; k < ih; k++) fil.lineTo(pts[2 * k], pts[2 * k + 1]);
          fil.lineTo(hx, hy);
          fil.stroke();
        }
      }
      if (s.tip) drawBlob(hot, hx, hy, 1.0 + 0.4 * s.width, 1.5 + 0.5 * s.width, 0.32 * s.I * s.tip * decay);
    }

    function renderE(t) {
      const E = new Float32Array(W * H);
      if (t < TIME.halo - 0.01) return E;

      if (t === Infinity) {
        E.set(crown);
      } else {
        for (let py = 0; py < H; py++) {
          const env = crownEnv(py / S, t);
          if (env <= 0) continue;
          for (let i = py * W, end = i + W; i < end; i++) E[i] = crown[i] * env;
        }
      }

      if (core) {
        const u = t - core.t0;
        if (u > 0) {
          for (let r = 0; r < core.h; r++) {
            const y = (core.y0 + r) / S;
            const env = t === Infinity ? 1 : smooth(-30, 10, u * TIME.vCore - (core.foot - y)) * (1 + 0.9 * Math.exp(-u / 0.35));
            if (env <= 0) continue;
            const src = r * core.w, dst = (core.y0 + r) * W + core.x0;
            for (let k = 0; k < core.w; k++) E[dst + k] += core.data[src + k] * env;
          }
        }
      }

      for (const gl of glows) {
        const env = t === Infinity ? 1 : kick(t - gl.t0, 0.8, 0.45, 0.12);
        if (env <= 0) continue;
        for (let r = 0; r < gl.h; r++) {
          const src = r * gl.w, dst = (gl.y0 + r) * W + gl.x0;
          for (let k = 0; k < gl.w; k++) E[dst + k] += gl.data[src + k] * env;
        }
      }

      clearLayer(fil);
      clearLayer(hot);
      for (const s of strokes) drawStroke(s, t);
      for (const b of blobs) {
        if (t === Infinity) {
          drawBlob(b.ctx, b.x, b.y, b.rx, b.ry, b.a);
          continue;
        }
        const u = t - b.t0;
        if (u <= 0) continue;
        drawBlob(b.ctx, b.x, b.y, b.rx, b.ry, b.a * kick(u, b.k, b.tau));
        if (b.halo) drawBlob(b.ctx, b.x, b.y, b.rx * 2.6, b.ry * 2.2, b.a * 0.45 * b.k * Math.exp(-u / b.tau));
      }

      const F = readLayer(fil, W, H);
      const Hh = readLayer(hot, W, H);
      const f1 = blur(F, W, H, 1.0 * S), f2 = blur(F, W, H, 5 * S), f3 = blur(F, W, H, 22 * S);
      const h1 = blur(Hh, W, H, 1.5 * S), h2 = blur(Hh, W, H, 5 * S), h3 = blur(Hh, W, H, 18 * S);
      for (let i = 0; i < E.length; i++) {
        E[i] += 3.3 * F[i] + 1.4 * f1[i] + 1.6 * f2[i] + 2.0 * f3[i] + 34 * Hh[i] + 22 * h1[i] + 44 * h2[i] + 62 * h3[i];
      }
      return E;
    }

    return { renderE, lastIgnition };
  };

  Scene.buildSprite = function (W, H, S, rand, noise) {
    return Scene.createSprite(W, H, S, rand, noise).renderE(Infinity);
  };

  // Filmic response of a red-dominated emission: saturates red first, then burns to orange and yellow-white.
  Scene.spriteColor = function (e, out) {
    out[0] = 1 - Math.exp(-0.95 * e);
    out[1] = 1 - Math.exp(-(0.05 * e + 0.0011 * e * e));
    out[2] = 1 - Math.exp(-(0.046 * e) / (1 + 0.02 * e));
    return out;
  };
})(window.Scene);
