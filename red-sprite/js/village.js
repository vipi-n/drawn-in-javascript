/* Hilltop village under sodium street lights, drawn in 819×1024 design space. */
(function (Scene) {
  'use strict';
  const { clamp, mix, gauss } = Scene;

  const TONES = {
    warm: { base: [44, 30, 20], lit: [232, 152, 74] },
    pale: { base: [62, 50, 38], lit: [240, 206, 152] },
    stone: { base: [38, 30, 23], lit: [192, 140, 88] },
    rose: { base: [52, 32, 26], lit: [222, 128, 92] },
  };

  const LAMPS = [
    { x: 130, y: 744, r: 34, k: 1.0 },
    { x: 141, y: 756, r: 16, k: 0.7 },
    { x: 212, y: 755, r: 22, k: 0.9 },
    { x: 178, y: 762, r: 12, k: 0.5 },
    { x: 52, y: 736, r: 14, k: 0.55 },
    { x: 255, y: 712, r: 18, k: 0.5 },
    { x: 300, y: 742, r: 12, k: 0.45 },
    { x: 384, y: 744, r: 10, k: 0.45 },
    { x: 470, y: 752, r: 9, k: 0.4 },
    { x: 512, y: 772, r: 8, k: 0.55 },
    { x: 546, y: 742, r: 8, k: 0.6 },
    { x: 584, y: 744, r: 7, k: 0.5 },
    { x: 703, y: 740, r: 16, k: 0.85 },
    { x: 742, y: 746, r: 12, k: 0.7 },
    { x: 772, y: 742, r: 20, k: 0.95 },
    { x: 800, y: 740, r: 12, k: 0.7 },
  ];

  const BACK = [
    { x: -2, y: 684, w: 47, h: 90, rh: 9, tone: 'warm', lit: 0.95, win: [5, 2], litWin: 0.12, shade: 1 },
    { x: 45, y: 699, w: 30, h: 60, rh: 6, tone: 'warm', lit: 0.8, win: [3, 2], shade: -1 },
    { x: 67, y: 681, w: 46, h: 62, rh: 6, tone: 'pale', lit: 0.95, win: [3, 3], shade: 1 },
    { x: 118, y: 683, w: 66, h: 34, rh: 8, tone: 'stone', lit: 0.55, win: [2, 4], shade: 1 },
    { x: 184, y: 686, w: 40, h: 32, rh: 6, tone: 'stone', lit: 0.5, win: [2, 2], shade: -1 },
    { x: 420, y: 687, w: 108, h: 62, rh: 7, tone: 'stone', lit: 0.72, win: [4, 7], litWin: 0.1, shade: 1 },
    { x: 528, y: 697, w: 34, h: 48, rh: 6, tone: 'warm', lit: 0.6, win: [3, 2], shade: 1 },
    { x: 655, y: 707, w: 40, h: 40, rh: 5, tone: 'warm', lit: 0.65, win: [2, 3] },
    { x: 806, y: 690, w: 16, h: 60, rh: 5, tone: 'stone', lit: 0.5 },
  ];

  const MID = [
    { x: 224, y: 690, w: 42, h: 55, rh: 6, tone: 'stone', lit: 0.62, win: [3, 2] },
    { x: 266, y: 684, w: 78, h: 64, rh: 15, tone: 'warm', lit: 0.82, win: [3, 4], shade: 1 },
    { x: 279, y: 660, w: 8, h: 10, rh: 2.5, tone: 'pale', lit: 0.9 },
    { x: 344, y: 699, w: 44, h: 44, rh: 6, tone: 'rose', lit: 0.62, win: [2, 3], roofTone: [120, 60, 44] },
    { x: 388, y: 707, w: 32, h: 34, rh: 5, tone: 'rose', lit: 0.6, win: [2, 2], roofTone: [110, 58, 46] },
    { x: 692, y: 721, w: 34, h: 28, rh: 5, tone: 'warm', lit: 0.75, win: [2, 2] },
    { x: 726, y: 716, w: 50, h: 34, rh: 6, tone: 'pale', lit: 0.92, win: [2, 4], litWin: 0.2 },
    { x: 776, y: 713, w: 34, h: 38, rh: 5, tone: 'pale', lit: 0.88, win: [2, 2] },
  ];

  const FRONT = [
    { x: 148, y: 712, w: 78, h: 60, rh: 6, tone: 'warm', lit: 1.0, win: [3, 5], litWin: 0.15 },
    { x: 288, y: 728, w: 44, h: 42, rh: 5, tone: 'warm', lit: 0.66, win: [2, 3] },
    { x: 226, y: 736, w: 40, h: 34, rh: 4, tone: 'stone', lit: 0.55, win: [2, 2] },
    { x: -2, y: 738, w: 58, h: 52, rh: 6, tone: 'warm', lit: 0.85, win: [2, 3] },
    { x: 54, y: 745, w: 40, h: 40, rh: 5, tone: 'stone', lit: 0.6, win: [2, 2] },
    { x: 96, y: 762, w: 34, h: 60, rh: 5, tone: 'stone', lit: 0.5, win: [3, 2], litWin: 0.55 },
  ];

  // Lamp-lit terrace and retaining walls on the slope below the houses.
  const WALLS = [
    { x: 232, y: 770, w: 64, h: 7, tone: 'stone', lit: 0.45, noRoof: true, lamps: 1 },
    { x: 436, y: 771, w: 74, h: 6, tone: 'stone', lit: 0.4, noRoof: true, lamps: 1 },
    { x: 596, y: 754, w: 52, h: 6, tone: 'stone', lit: 0.45, noRoof: true, lamps: 0 },
    { x: 142, y: 790, w: 62, h: 8, tone: 'warm', lit: 0.6, noRoof: true, lamps: 1 },
    { x: 690, y: 758, w: 70, h: 6, tone: 'stone', lit: 0.5, noRoof: true, lamps: 1 },
  ];

  const TREES_MID = [
    { x: 585, y: 724, rx: 31, ry: 27, lit: 0.22, lx: 560, ly: 752 },
    { x: 548, y: 744, rx: 14, ry: 10, lit: 0.45 },
    { x: 628, y: 726, rx: 22, ry: 19, lit: 0.6, lx: 640, ly: 746 },
    { x: 668, y: 744, rx: 26, ry: 12, lit: 0.6 },
    { x: 712, y: 748, rx: 18, ry: 9, lit: 0.55 },
    { x: 790, y: 754, rx: 30, ry: 10, lit: 0.45 },
    { x: 338, y: 758, rx: 20, ry: 26, lit: 0.28, ly: 790 },
    { x: 425, y: 764, rx: 42, ry: 22, lit: 0.4, ly: 745 },
    { x: 500, y: 750, rx: 30, ry: 14, lit: 0.4 },
    { x: 470, y: 744, rx: 18, ry: 10, lit: 0.35 },
    { x: 262, y: 764, rx: 22, ry: 12, lit: 0.5 },
  ];

  const rgba = (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
  const mixc = (a, b, t) => [mix(a[0], b[0], t), mix(a[1], b[1], t), mix(a[2], b[2], t)];

  function lampInfluence(x, y, scale) {
    let s = 0;
    for (const L of LAMPS) s += L.k * Math.exp(-Math.hypot(x - L.x, y - L.y) / (scale * (0.6 + L.r / 30)));
    return s;
  }

  function plaster(ctx, x, y, w, h, rand) {
    const n = Math.round(w * h * 0.14);
    for (let i = 0; i < n; i++) {
      const s = 0.4 + rand() * 1.4;
      ctx.fillStyle = rand() < 0.7 ? `rgba(25,15,8,${0.06 + rand() * 0.14})` : `rgba(255,215,160,${0.03 + rand() * 0.06})`;
      ctx.fillRect(x + rand() * w, y + rand() * h, s * (1 + rand()), s);
    }
    for (let i = 0; i < w / 10; i++) {
      ctx.fillStyle = `rgba(20,12,6,${0.05 + rand() * 0.08})`;
      ctx.fillRect(x + rand() * w, y + rand() * h * 0.5, 0.6 + rand(), 4 + rand() * h * 0.5);
    }
  }

  function windows(ctx, b, rand) {
    if (!b.win) return;
    const [rows, cols] = b.win;
    const cw = b.w / cols;
    const ww = clamp(cw * 0.27, 1.7, 3.2), wh = ww * 1.55;
    const top = b.y + 4.5, span = b.h - 8.5;
    const rh = span / rows;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (rand() < 0.22) continue;
        const wx = b.x + cw * (c + 0.5) - ww / 2 + (rand() - 0.5) * 0.6;
        const wy = top + rh * r + (rh - wh) * 0.35;
        if (wy + wh > b.y + b.h - 1) continue;
        const roll = rand();
        if (roll < (b.litWin ?? 0.08)) {
          const cx = wx + ww / 2, cy = wy + wh / 2;
          const gl = ctx.createRadialGradient(cx, cy, 0, cx, cy, ww * 2.6);
          gl.addColorStop(0, 'rgba(255,190,100,0.45)');
          gl.addColorStop(1, 'rgba(255,170,80,0)');
          ctx.fillStyle = gl;
          ctx.fillRect(wx - ww * 2, wy - wh, ww * 5, wh * 3);
          ctx.fillStyle = 'rgb(255,214,140)';
          ctx.fillRect(wx, wy, ww, wh);
          ctx.fillStyle = 'rgba(255,245,215,0.9)';
          ctx.fillRect(wx + ww * 0.25, wy + wh * 0.2, ww * 0.5, wh * 0.6);
        } else if (roll < 0.42) {
          ctx.fillStyle = 'rgba(48,36,26,0.75)';
          ctx.fillRect(wx - 0.3, wy - 0.3, ww + 0.6, wh + 0.6);
          ctx.fillStyle = `rgba(150,110,70,${0.25 * b.lit})`;
          ctx.fillRect(wx + ww / 2 - 0.15, wy, 0.3, wh);
        } else {
          ctx.fillStyle = 'rgba(22,15,11,0.92)';
          ctx.fillRect(wx, wy, ww, wh);
        }
        ctx.fillStyle = `rgba(255,225,180,${0.18 * b.lit})`;
        ctx.fillRect(wx - 0.4, wy + wh, ww + 0.8, 0.6);
      }
    }
  }

  function roof(ctx, b, rand) {
    const { x, y, w } = b, rh = b.rh ?? 6, ov = 1.2;
    if (w > 26 && rand() < 0.6) {
      const cx = x + w * (0.2 + 0.6 * rand()), ch = 3 + rand() * 3;
      ctx.fillStyle = rgba(mixc([46, 34, 26], [150, 104, 64], 0.3 * b.lit));
      ctx.fillRect(cx, y - rh - ch + 1.5, 2.6, ch);
      ctx.fillStyle = 'rgb(30,22,18)';
      ctx.fillRect(cx - 0.5, y - rh - ch + 1, 3.6, 1);
    }
    const ins = Math.min(rh * 1.6, w * 0.3);
    ctx.beginPath();
    ctx.moveTo(x - ov, y + 0.5);
    ctx.lineTo(x + ins, y - rh);
    ctx.lineTo(x + w - ins, y - rh);
    ctx.lineTo(x + w + ov, y + 0.5);
    ctx.closePath();
    const base = b.roofTone ?? [56, 42, 34];
    const gr = ctx.createLinearGradient(0, y - rh, 0, y);
    gr.addColorStop(0, rgba(mixc(base, [20, 16, 14], 0.4)));
    gr.addColorStop(1, rgba(mixc(base, [150, 100, 65], 0.25 * b.lit)));
    ctx.fillStyle = gr;
    ctx.fill();
    ctx.save();
    ctx.clip();
    ctx.strokeStyle = 'rgba(0,0,0,0.25)';
    ctx.lineWidth = 0.35;
    for (let ty = y - rh + 1.2; ty < y; ty += 1.3) {
      ctx.beginPath();
      ctx.moveTo(x - 2, ty);
      ctx.lineTo(x + w + 2, ty);
      ctx.stroke();
    }
    ctx.restore();
    ctx.fillStyle = `rgba(200,145,90,${0.55 * b.lit})`;
    ctx.fillRect(x - ov, y - 0.2, w + ov * 2, 0.9);
  }

  function house(ctx, b, rand, wallLamps) {
    const t0 = TONES[b.tone];
    const tint = [0.9 + 0.16 * rand(), 0.9 + 0.16 * rand(), 0.88 + 0.18 * rand()];
    const tone = { base: t0.base, lit: t0.lit.map((v, i) => Math.min(255, v * tint[i])) };
    const { x, y, w, h, lit } = b;

    // Wall-mounted street lamps: hot pools of sodium light with a fast falloff.
    const own = [];
    const nl = b.lamps ?? (w > 24 && rand() < 0.55 ? 1 : 0);
    for (let k = 0; k < nl; k++) {
      own.push({ x: x + w * (0.15 + 0.7 * rand()), y: y + h * (0.5 + 0.3 * rand()), r: 6 + rand() * 7, k: 0.55 + 0.4 * rand() });
    }

    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();

    const top = mixc(tone.base, tone.lit, lit * 0.22), bottom = mixc(tone.base, tone.lit, lit * 0.74);
    const gr = ctx.createLinearGradient(0, y, 0, y + h);
    gr.addColorStop(0, rgba(top));
    gr.addColorStop(0.55, rgba(mixc(top, bottom, 0.6)));
    gr.addColorStop(1, rgba(bottom));
    ctx.fillStyle = gr;
    ctx.fillRect(x, y, w, h);

    // Uneven floodlighting across the facade.
    const hx = x + w * (0.2 + 0.6 * rand());
    const hg = ctx.createRadialGradient(hx, y + h, 0, hx, y + h, Math.max(w, h) * 0.9);
    hg.addColorStop(0, rgba(tone.lit, 0.35 * lit));
    hg.addColorStop(1, rgba(tone.lit, 0));
    ctx.fillStyle = hg;
    ctx.fillRect(x, y, w, h);

    const side = b.shade ?? (rand() < 0.5 ? -1 : 1);
    const sw = Math.min(w * 0.35, 12);
    const sg = side > 0 ? ctx.createLinearGradient(x + w - sw, 0, x + w, 0) : ctx.createLinearGradient(x + sw, 0, x, 0);
    sg.addColorStop(0, 'rgba(18,10,6,0)');
    sg.addColorStop(1, 'rgba(18,10,6,0.6)');
    ctx.fillStyle = sg;
    ctx.fillRect(x, y, w, h);

    plaster(ctx, x, y, w, h, rand);

    if (b.win && h > 30) {
      const rh = (h - 8.5) / b.win[0];
      for (let r = 1; r < b.win[0]; r++) {
        if (rand() < 0.5) continue;
        const ly = y + 4.5 + rh * r - 1.2;
        ctx.fillStyle = rgba(tone.lit, 0.2 * lit);
        ctx.fillRect(x, ly, w, 0.55);
        ctx.fillStyle = 'rgba(20,12,6,0.3)';
        ctx.fillRect(x, ly + 0.55, w, 0.6);
      }
    }
    if (h > 26 && rand() < 0.7) {
      const dw = 3 + rand() * 2.5, dh = 5.5 + rand() * 3;
      const dx = x + w * (0.12 + rand() * 0.7), dy = y + h - dh;
      ctx.fillStyle = 'rgba(20,13,9,0.9)';
      ctx.beginPath();
      ctx.moveTo(dx, y + h);
      ctx.lineTo(dx, dy + dw / 2);
      ctx.arc(dx + dw / 2, dy + dw / 2, dw / 2, Math.PI, 0);
      ctx.lineTo(dx + dw, y + h);
      ctx.closePath();
      ctx.fill();
    }
    if (w > 30 && rand() < 0.5) {
      ctx.fillStyle = 'rgba(25,16,10,0.35)';
      ctx.fillRect(x + w * (0.05 + 0.9 * rand()), y + 1, 0.5, h);
    }

    ctx.globalCompositeOperation = 'screen';
    for (const L of LAMPS.concat(wallLamps, own)) {
      const R = L.r * 3.6;
      if (L.x + R < x || L.x - R > x + w || L.y + R < y || L.y - R > y + h) continue;
      const rg = ctx.createRadialGradient(L.x, L.y, 0, L.x, L.y, R);
      rg.addColorStop(0, `rgba(255,214,140,${0.95 * L.k})`);
      rg.addColorStop(0.18, `rgba(255,176,86,${0.6 * L.k})`);
      rg.addColorStop(0.5, `rgba(240,140,60,${0.18 * L.k})`);
      rg.addColorStop(1, 'rgba(230,120,50,0)');
      ctx.fillStyle = rg;
      ctx.fillRect(x, y, w, h);
    }
    ctx.globalCompositeOperation = 'source-over';

    windows(ctx, b, rand);

    ctx.fillStyle = 'rgba(15,10,6,0.4)';
    ctx.fillRect(x, y, w, 1.2);
    ctx.restore();
    if (!b.noRoof) roof(ctx, b, rand);
    for (const L of own) wallLamps.push(L);
  }

  // Baroque Corsican campanile, washed by a floodlight.
  function tower(ctx, rand) {
    const L = 233, R = 263;
    const stone = (x, y, w, h) => {
      const gr = ctx.createLinearGradient(x, 0, x + w, 0);
      gr.addColorStop(0, 'rgb(236,226,206)');
      gr.addColorStop(0.55, 'rgb(224,212,190)');
      gr.addColorStop(1, 'rgb(160,146,128)');
      ctx.fillStyle = gr;
      ctx.fillRect(x, y, w, h);
      const vg = ctx.createLinearGradient(0, y, 0, y + h);
      vg.addColorStop(0, 'rgba(40,32,26,0.16)');
      vg.addColorStop(1, 'rgba(255,190,120,0.08)');
      ctx.fillStyle = vg;
      ctx.fillRect(x, y, w, h);
      plaster(ctx, x, y, w, h, rand);
    };
    const ledge = (x, y, w, h) => {
      ctx.fillStyle = 'rgb(248,243,232)';
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = 'rgba(60,48,40,0.55)';
      ctx.fillRect(x, y + h, w, 0.7);
    };
    const arch = (x, y, w, h) => {
      ctx.fillStyle = 'rgb(40,33,30)';
      ctx.beginPath();
      ctx.moveTo(x, y + h);
      ctx.lineTo(x, y + w / 2);
      ctx.arc(x + w / 2, y + w / 2, w / 2, Math.PI, 0);
      ctx.lineTo(x + w, y + h);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(255,220,170,0.18)';
      ctx.fillRect(x, y + h - 0.8, w, 0.8);
    };

    stone(L, 655, R - L, 52);
    stone(L + 1, 621, R - L - 2, 34);
    stone(239, 601, 19, 20);
    stone(242.5, 593, 12, 8);

    ctx.fillStyle = 'rgb(214,206,192)';
    ctx.beginPath();
    ctx.moveTo(242, 593.2);
    ctx.quadraticCurveTo(248.5, 583.5, 255, 593.2);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgb(205,196,182)';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(248.5, 587);
    ctx.lineTo(248.5, 580.5);
    ctx.moveTo(246.8, 582.3);
    ctx.lineTo(250.2, 582.3);
    ctx.stroke();

    ledge(L - 1.5, 653, R - L + 3, 2.6);
    ledge(L - 0.5, 619, R - L + 1, 2.2);
    ledge(237.5, 599.4, 22, 1.8);
    ledge(241.6, 591.6, 13.8, 1.5);

    ctx.fillStyle = 'rgba(255,252,244,0.4)';
    ctx.fillRect(L + 1.2, 622, 1.4, 31);
    ctx.fillRect(247.4, 622, 1.6, 31);
    ctx.fillStyle = 'rgba(90,80,70,0.35)';
    ctx.fillRect(R - 3.2, 622, 1.4, 31);

    arch(237.2, 626, 8.4, 23);
    arch(250.6, 626, 8.4, 23);
    arch(244.6, 604, 8, 14.5);
    arch(246.4, 594.5, 4.2, 5.5);
    arch(245.5, 663, 6, 13);
    arch(245.8, 684, 5.4, 8);
  }

  function tree(ctx, t, rand, noise) {
    const { x, y, rx, ry } = t;
    const lx = t.lx ?? x, ly = t.ly ?? y + ry;
    const dark = t.dark ?? [11, 13, 8], litc = t.litc ?? [150, 126, 56];
    ctx.fillStyle = rgba(dark);
    ctx.beginPath();
    ctx.ellipse(x, y + ry * 0.08, rx * 0.82, ry * 0.82, 0, 0, Math.PI * 2);
    ctx.fill();
    const off = rand() * 100;
    const n = Math.round(rx * ry * 1.6);
    const pts = [];
    for (let i = 0; i < n; i++) {
      const a = rand() * Math.PI * 2, rr = Math.sqrt(rand());
      const px = x + Math.cos(a) * rx * rr, py = y + Math.sin(a) * ry * rr;
      const edge = 0.72 + 0.4 * (0.5 + 0.5 * noise(px * 0.18 + off, py * 0.18));
      if (rr > edge) continue;
      const dl = Math.hypot((px - lx) / rx, (py - ly) / ry);
      const L = t.lit * clamp(1.15 - dl * 0.55, 0, 1) * (0.45 + 0.75 * rand());
      pts.push([px, py, 0.55 + rand() * 1.4, L]);
    }
    pts.sort((a, b) => a[3] - b[3]);
    for (const [px, py, r, L] of pts) {
      ctx.fillStyle = rgba(mixc(dark, litc, clamp(L, 0, 1)));
      ctx.beginPath();
      ctx.arc(px, py, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function hill(ctx, noise) {
    ctx.beginPath();
    ctx.moveTo(-5, 1030);
    for (let x = -5; x <= 825; x += 5) {
      const y = 744 + 6 * Math.sin(x * 0.011) + 4 * noise(x * 0.03, 2.2) - 6 * Math.exp(-Math.pow((x - 470) / 120, 2));
      ctx.lineTo(x, y);
    }
    ctx.lineTo(825, 1030);
    ctx.closePath();
    const gr = ctx.createLinearGradient(0, 735, 0, 860);
    gr.addColorStop(0, 'rgb(38,29,20)');
    gr.addColorStop(1, 'rgb(12,10,7)');
    ctx.fillStyle = gr;
    ctx.fill();
  }

  function umbrellaPine(ctx, rand, noise) {
    ctx.strokeStyle = 'rgb(18,13,9)';
    ctx.lineCap = 'round';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(57, 845);
    ctx.quadraticCurveTo(53, 808, 50, 778);
    ctx.stroke();
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(51, 790);
    ctx.quadraticCurveTo(40, 782, 32, 774);
    ctx.moveTo(52, 786);
    ctx.quadraticCurveTo(62, 779, 70, 772);
    ctx.stroke();
    const pine = { dark: [11, 13, 8], litc: [110, 96, 48] };
    tree(ctx, { x: 36, y: 770, rx: 15, ry: 7, lit: 0.22, ly: 790, ...pine }, rand, noise);
    tree(ctx, { x: 52, y: 765, rx: 20, ry: 8, lit: 0.2, ly: 790, ...pine }, rand, noise);
    tree(ctx, { x: 70, y: 769, rx: 13, ry: 6, lit: 0.22, ly: 790, ...pine }, rand, noise);
  }

  function canopy(ctx, rand, noise) {
    const g = () => gauss(rand);
    ctx.fillStyle = 'rgb(10,10,7)';
    ctx.beginPath();
    ctx.moveTo(-5, 1030);
    for (let x = -5; x <= 825; x += 6) ctx.lineTo(x, 800 + 8 * noise(x * 0.02, 1.3));
    ctx.lineTo(825, 1030);
    ctx.closePath();
    ctx.fill();

    const top = (x) => 771 + 26 * (1 - Scene.smooth(190, 250, x)) - 4 * Math.exp(-Math.pow((x - 420) / 80, 2));
    for (let row = 0; row < 8; row++) {
      let x = -22 + rand() * 12;
      while (x < 842) {
        const yb = top(x) + row * 20;
        const rx = 12 + rand() * 22, ry = 9 + rand() * 10;
        const near = Math.min(1.2, lampInfluence(x, yb, 32));
        const lit = Math.max(0, 0.36 - row * 0.085) * (0.05 + near) * (0.4 + rand());
        const y = yb + g() * 6;
        const v = 0.7 + 0.5 * rand();
        tree(
          ctx,
          { x, y, rx, ry, lit, lx: x + g() * 6, ly: y - ry * 1.4, dark: [9 * v, 11 * v, 7 * v], litc: [132, 112, 50] },
          rand,
          noise
        );
        x += rx * (1.0 + rand() * 0.6);
      }
    }

    const gr = ctx.createLinearGradient(0, 795, 0, 1024);
    gr.addColorStop(0, 'rgba(3,3,2,0)');
    gr.addColorStop(0.3, 'rgba(3,3,2,0.55)');
    gr.addColorStop(0.62, 'rgba(3,3,2,0.92)');
    gr.addColorStop(1, 'rgba(2,2,1,0.98)');
    ctx.fillStyle = gr;
    ctx.fillRect(-5, 795, 830, 235);
  }

  function lampGlows(ctx, lamps) {
    ctx.globalCompositeOperation = 'lighter';
    for (const L of lamps) {
      const RR = L.r * 6;
      const haze = ctx.createRadialGradient(L.x, L.y, 0, L.x, L.y, RR);
      haze.addColorStop(0, `rgba(255,150,60,${0.1 * L.k})`);
      haze.addColorStop(1, 'rgba(255,130,50,0)');
      ctx.fillStyle = haze;
      ctx.fillRect(L.x - RR, L.y - RR, 2 * RR, 2 * RR);
      const R = L.r * 2.2;
      const gr = ctx.createRadialGradient(L.x, L.y, 0, L.x, L.y, R);
      gr.addColorStop(0, `rgba(255,236,190,${0.95 * L.k})`);
      gr.addColorStop(0.08, `rgba(255,205,130,${0.6 * L.k})`);
      gr.addColorStop(0.3, `rgba(255,160,70,${0.22 * L.k})`);
      gr.addColorStop(1, 'rgba(255,130,50,0)');
      ctx.fillStyle = gr;
      ctx.fillRect(L.x - R, L.y - R, 2 * R, 2 * R);
    }
    ctx.globalCompositeOperation = 'source-over';
  }

  Scene.drawLampGlows = function (ctx, S, lamps) {
    ctx.save();
    ctx.setTransform(S, 0, 0, S, 0, 0);
    lampGlows(ctx, lamps);
    ctx.restore();
  };

  // Returns the lamp list; pass { glows: false } to draw the additive lamp glows separately.
  Scene.drawVillage = function (ctx, W, H, S, rand, noise, opts = {}) {
    ctx.save();
    ctx.setTransform(S, 0, 0, S, 0, 0);
    const wallLamps = [];
    hill(ctx, noise);
    for (const b of BACK) house(ctx, b, rand, wallLamps);
    tower(ctx, rand);
    for (const b of MID) house(ctx, b, rand, wallLamps);
    for (const t of TREES_MID) tree(ctx, t, rand, noise);
    for (const b of WALLS) house(ctx, b, rand, wallLamps);
    for (const b of FRONT) house(ctx, b, rand, wallLamps);
    tree(ctx, { x: 172, y: 780, rx: 26, ry: 16, lit: 0.85, ly: 758 }, rand, noise);
    umbrellaPine(ctx, rand, noise);
    canopy(ctx, rand, noise);
    const lamps = LAMPS.concat(wallLamps.map((L) => ({ ...L, r: L.r * 0.8, k: L.k * 0.7 })));
    if (opts.glows !== false) lampGlows(ctx, lamps);
    ctx.restore();
    return lamps;
  };
})(window.Scene);
