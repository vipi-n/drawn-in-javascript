// Act 3: the 16-bit console wars (Mode 7 vs speed), then the leap into 3D (raycast corridor, PS1 wobble, N64 fog).
const { C, W, H, TAU, clamp, lerp, ss, io3, out3, out5, rgba, mix, mixs, hash, rng, noise, fbm2, cues } = require('./core');
const G = require('./gfx');
const R = require('./retro');
const T = require('./type');
const { B, BEAT, BAR, EV } = cues;

const NW = 140, NH = 112;
// ================================================================ 16-bit
function mode7(p, T0) {
  const w = 70, hz = 38, id = p.createImageData(w, NH - hz);
  const yaw = T0 * .55, cx = Math.cos(yaw), sn = Math.sin(yaw), px = Math.sin(T0 * .55) * 30, pz = Math.cos(T0 * .55) * 30;
  for (let y = 0; y < NH - hz; y++) {
    const z = 260 / (y + 2);
    for (let x = 0; x < w; x++) {
      const sx = (x - w / 2) / w * z * 1.6, u = px + cx * sx - sn * z, v = pz + sn * sx + cx * z;
      const r = Math.hypot(u, v), road = Math.abs(r - 40) < 7, kerb = Math.abs(Math.abs(r - 40) - 7.5) < 1.2, chk = ((Math.floor(u / 8) + Math.floor(v / 8)) & 1);
      let col = road ? [96, 96, 112] : kerb ? (Math.floor(Math.atan2(v, u) * 12) & 1 ? [240, 240, 240] : [232, 40, 56]) : chk ? [40, 168, 72] : [56, 196, 96];
      if (road && Math.abs(r - 40) < .6 && (Math.floor(Math.atan2(v, u) * 10) & 1)) col = [250, 230, 120];
      const fog = clamp(z / 140), i = (y * w + x) * 4;
      id.data[i] = lerp(col[0], 250, fog * .7); id.data[i + 1] = lerp(col[1], 170, fog * .7); id.data[i + 2] = lerp(col[2], 200, fog * .7); id.data[i + 3] = 255;
    }
  }
  const sky = p.createLinearGradient(0, 0, 0, hz); sky.addColorStop(0, '#2a1a7a'); sky.addColorStop(1, '#ff8ab0');
  p.fillStyle = sky; p.fillRect(0, 0, w, hz);
  p.fillStyle = '#3a2a8a'; for (let x = 0; x < w; x++) { const hh = 4 + Math.abs(Math.sin((x + yaw * 40) * .17)) * 7; p.fillRect(x, hz - hh, 1, hh); }
  p.putImageData(id, 0, hz);
  // the kart
  const k = Math.floor(T0 * 8) % 2;
  p.fillStyle = '#000'; p.fillRect(27, 94, 16, 8); p.fillStyle = '#e8283a'; p.fillRect(28, 92, 14, 6); p.fillStyle = '#ffd23f'; p.fillRect(32, 88, 6, 5); p.fillStyle = '#222'; p.fillRect(26, 97 + k, 4, 4); p.fillRect(40, 97 + k, 4, 4);
  T.pixText(p, 'MODE 7', 4, 4, 1, { color: '#fff' });
}
function speed(p, T0) {
  const x0 = 70, w = 70, sx = T0 * 220;
  p.save(); p.beginPath(); p.rect(x0, 0, w, NH); p.clip(); p.translate(x0, 0);
  const sky = p.createLinearGradient(0, 0, 0, 70); sky.addColorStop(0, '#2468ff'); sky.addColorStop(1, '#9cd8ff'); p.fillStyle = sky; p.fillRect(0, 0, w, 70);
  p.fillStyle = '#ffffff'; for (let i = 0; i < 4; i++) { const x = ((i * 40 - sx * .08) % 160 + 160) % 160 - 20; p.fillRect(x, 10 + i * 6, 18, 3); }
  p.fillStyle = '#3a8a6a'; for (let x = 0; x < w; x++) { const h = 10 + Math.abs(Math.sin((x + sx * .2) * .07)) * 14; p.fillRect(x, 70 - h, 1, h); }
  p.fillStyle = '#1e5aa8'; p.fillRect(0, 62, w, 10);
  p.fillStyle = '#8ad8ff'; for (let i = 0; i < 8; i++) p.fillRect(((i * 23 - sx * .35) % 80 + 80) % 80 - 5, 64 + (i % 3) * 3, 8, 1);
  // checkered dirt + grass edge
  for (let y = 76; y < NH; y += 6) for (let x = -((sx | 0) % 12); x < w; x += 6) { const c = ((Math.floor((x + sx) / 6) + y / 6) & 1); p.fillStyle = c ? '#c86a1a' : '#8a3a0a'; p.fillRect(x, y, 6, 6); }
  p.fillStyle = '#38c838'; p.fillRect(0, 72, w, 5); p.fillStyle = '#1a8a1a'; for (let x = -((sx | 0) % 4); x < w; x += 4) p.fillRect(x, 76, 2, 2);
  // palm
  const pxp = ((60 - sx * .9) % 160 + 160) % 160 - 40; p.fillStyle = '#7a4a1a'; p.fillRect(pxp, 44, 3, 28); p.fillStyle = '#2aa82a'; p.fillRect(pxp - 8, 42, 19, 3); p.fillRect(pxp - 5, 39, 13, 3);
  // rings stream past
  for (let i = 0; i < 6; i++) { const x = ((i * 19 - sx * .9) % 114 + 114) % 114 - 10, y = 54 + Math.sin(i * 1.3) * 6, f = Math.floor(T0 * 12 + i) % 4; p.fillStyle = '#ffd23f'; p.fillRect(x, y, f === 2 ? 2 : 5, 5); p.fillStyle = '#9a6a00'; if (f !== 2) p.fillRect(x + 1, y + 1, 3, 3); p.fillStyle = '#ffd23f'; if (f !== 2) p.fillRect(x + 2, y + 2, 1, 1); }
  // the blue spin-ball with speed lines
  const bx = 26, by = 64 + Math.abs(Math.sin(T0 * 6)) * -3, a = T0 * 40;
  p.fillStyle = 'rgba(255,255,255,.8)'; for (let i = 0; i < 5; i++) p.fillRect(bx - 14 - i * 5, by - 4 + i * 2, 10 - i, 1);
  for (let yy = -6; yy <= 6; yy++) for (let xx = -6; xx <= 6; xx++) { if (xx * xx + yy * yy > 38) continue; const ang = Math.atan2(yy, xx) + a, sp = (Math.floor(ang / (TAU / 6)) & 1); p.fillStyle = xx * xx + yy * yy < 8 ? '#ffd2a0' : sp ? '#1a3ad8' : '#3a6aff'; p.fillRect(bx + xx, by + yy, 1, 1); }
  T.pixText(p, 'SPEED', w - 34, 4, 1, { color: '#fff' });
  p.restore();
}
function bits16(ctx, t, T0) {
  R.room(ctx, t, { tint: '#8a7aff', ga: .2, seed: 61 });
  ctx.save(); R.cam(ctx, t, BAR * 2, 1.0, 1.06, 480, 440);
  const S = R.tv80(ctx, T0, (c, x, y, w, h) => {
    const L = R.lowres('b16', NW, NH); mode7(L.c, T0); speed(L.c, T0); R.blit(c, L.cv, x, y, w, h);
    c.fillStyle = '#fff'; c.fillRect(x + w / 2 - 2, y, 4, h);
  }, { body: '#8f9098', brand: 'STEREO TV' });
  // VS badge pulses on the beat
  const pulse = 1 + .08 * Math.exp(-((T0 - EV.bits16) % BEAT) * 6);
  ctx.save(); ctx.translate(S.x + S.w / 2, S.y + S.h / 2); ctx.scale(pulse, pulse);
  G.glow(ctx, 0, 0, 120, '#ffd23f', .5);
  ctx.fillStyle = '#16083a'; ctx.beginPath(); ctx.arc(0, 0, 44, 0, TAU); ctx.fill(); ctx.strokeStyle = '#ffd23f'; ctx.lineWidth = 4; ctx.stroke();
  T.pixText(ctx, 'VS', 0, -14, 4, { align: 'center', grad: ['#fff6cf', '#ffcd4a', '#ff6a2a'] });
  ctx.restore();
  ctx.restore();
}

// ================================================================ 3D helpers
// camera {x,y,z,yaw,pitch,f}; returns [sx, sy, depth] or null
function proj(cam, x, y, z, w, h) {
  let dx = x - cam.x, dy = y - cam.y, dz = z - cam.z;
  const cy = Math.cos(cam.yaw), sy = Math.sin(cam.yaw);
  const rx = dx * cy - dz * sy, rz = dx * sy + dz * cy;
  const cp = Math.cos(cam.pitch), sp = Math.sin(cam.pitch);
  const ry = dy * cp - rz * sp, rz2 = dy * sp + rz * cp;
  if (rz2 < .1) return null;
  return [w / 2 + rx / rz2 * cam.f, h / 2 - ry / rz2 * cam.f, rz2];
}
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], crs = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const nrm = (v) => { const l = Math.hypot(...v) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
const LIGHT = nrm([.5, .8, .3]);
// tris: [[p0,p1,p2], colour]; draws flat-shaded with painter sort, optional fog + vertex snapping
function drawTris(p, cam, tris, w, h, o = {}) {
  const out = [];
  for (const [vs, col, emit] of tris) {
    const P = vs.map((v) => proj(cam, v[0], v[1], v[2], w, h)); if (P.some((q) => !q)) continue;
    const n = nrm(crs(sub(vs[1], vs[0]), sub(vs[2], vs[0])));
    const d = (P[0][2] + P[1][2] + P[2][2]) / 3;
    const lit = emit ? 1 : .35 + .65 * Math.max(0, n[0] * LIGHT[0] + n[1] * LIGHT[1] + n[2] * LIGHT[2]);
    out.push([d, P, col, lit]);
  }
  out.sort((a, b) => b[0] - a[0]);
  for (const [d, P, col, lit] of out) {
    let c = mix(col, [0, 0, 0], 1 - lit);
    if (o.fog) c = mix(c, o.fog, clamp((d - o.fog0) / (o.fog1 - o.fog0)));
    p.fillStyle = rgba(c, 1);
    const sn = o.snap ? (v) => Math.round(v) : (v) => v;
    p.beginPath(); p.moveTo(sn(P[0][0]), sn(P[0][1])); p.lineTo(sn(P[1][0]), sn(P[1][1])); p.lineTo(sn(P[2][0]), sn(P[2][1])); p.closePath(); p.fill();
    if (o.seams) { p.strokeStyle = p.fillStyle; p.lineWidth = .6; p.stroke(); }
  }
}
function box(tris, x, y, z, sx, sy, sz, col) {
  const v = (a, b, c) => [x + a * sx, y + b * sy, z + c * sz];
  const q = (a, b, c, d) => { tris.push([[a, b, c], col]); tris.push([[a, c, d], col]); };
  q(v(-1, 0, -1), v(-1, 1, -1), v(1, 1, -1), v(1, 0, -1)); q(v(1, 0, 1), v(1, 1, 1), v(-1, 1, 1), v(-1, 0, 1));
  q(v(-1, 0, 1), v(-1, 1, 1), v(-1, 1, -1), v(-1, 0, -1)); q(v(1, 0, -1), v(1, 1, -1), v(1, 1, 1), v(1, 0, 1));
  q(v(-1, 1, -1), v(-1, 1, 1), v(1, 1, 1), v(1, 1, -1));
}
function cone(tris, x, y, z, r, h, col, n = 6) {
  for (let i = 0; i < n; i++) { const a0 = i / n * TAU, a1 = (i + 1) / n * TAU; tris.push([[[x + Math.cos(a1) * r, y, z + Math.sin(a1) * r], [x, y + h, z], [x + Math.cos(a0) * r, y, z + Math.sin(a0) * r]], col]); }
}

// ================================================================ DOOM-like raycast corridor (160 x 100)
const MAP = ['################', '#..............#', '#.####..####.#.#', '#.#........#.#.#', '#.#..##....#...#', '#....##.......##', '#.#........#.#.#', '#.####..####.#.#', '#..............#', '################'];
const wall = (x, y) => { const r = MAP[y | 0]; return !r || r[x | 0] === '#'; };
function texel(u, v, kind) {
  if (kind) { const panel = (Math.floor(v * 8) % 4 === 1) && (Math.floor(u * 8) % 3 !== 0); const lit = panel && hash(Math.floor(u * 8) * 7 + Math.floor(v * 8)) > .5; return lit ? [40, 220, 90] : panel ? [40, 60, 50] : [96, 100, 108]; }
  const row = Math.floor(v * 8), off = row % 2 ? .5 : 0, mortar = (v * 8) % 1 < .12 || ((u * 4 + off) % 1) < .06;
  const n = hash(Math.floor(u * 16) * 31 + Math.floor(v * 16)) * .25;
  return mortar ? [54, 40, 30] : [132 + n * 60, 82 + n * 30, 52 + n * 20];
}
function doomScreen(p, T0) {
  const w = 160, h = 100, vh = 80, id = p.createImageData(w, vh);
  const age = T0 - EV.doom + .5, px = 1.6 + age * 1.25, py = 1.5 + Math.sin(age * .9) * .12, ang = Math.sin(age * .7) * .35 + (age > 3.2 ? (age - 3.2) * .8 : 0);
  const bob = Math.sin(age * 9) * 1.2;
  for (let x = 0; x < w; x++) {
    const ra = ang + (x / w - .5) * 1.1, dx = Math.cos(ra), dy = Math.sin(ra);
    let mx = px | 0, my = py | 0, side = 0;
    const ddx = Math.abs(1 / dx), ddy = Math.abs(1 / dy), stx = dx < 0 ? -1 : 1, sty = dy < 0 ? -1 : 1;
    let sdx = (dx < 0 ? px - mx : mx + 1 - px) * ddx, sdy = (dy < 0 ? py - my : my + 1 - py) * ddy;
    for (let k = 0; k < 64; k++) { if (sdx < sdy) { sdx += ddx; mx += stx; side = 0; } else { sdy += ddy; my += sty; side = 1; } if (wall(mx, my)) break; }
    const dist = (side ? sdy - ddy : sdx - ddx) * Math.cos(ra - ang), lh = vh / Math.max(.2, dist);
    const hit = side ? px + dist / Math.cos(ra - ang) * dx : py + dist / Math.cos(ra - ang) * dy, u = hit - Math.floor(hit), kind = (mx * 7 + my * 3) % 5 === 0 ? 1 : 0;
    const y0 = vh / 2 - lh / 2 + bob, shadeK = clamp(1.25 - dist * .14) * (side ? .78 : 1);
    for (let y = 0; y < vh; y++) {
      let c;
      if (y < y0) { const k = y / (vh / 2); c = [52 + 30 * k, 52 + 28 * k, 56 + 30 * k]; }
      else if (y > y0 + lh) { const k = (y - vh / 2) / (vh / 2); c = [40 + 50 * k, 30 + 30 * k, 24 + 18 * k]; }
      else { const tc = texel(u, (y - y0) / lh, kind); c = [tc[0] * shadeK, tc[1] * shadeK, tc[2] * shadeK]; }
      const i = (y * w + x) * 4; id.data[i] = c[0]; id.data[i + 1] = c[1]; id.data[i + 2] = c[2]; id.data[i + 3] = 255;
    }
  }
  p.putImageData(id, 0, 0);
  // the pistol, kicking on every beat, with muzzle flash
  const sinceBeat = ((T0 - EV.doom) % BEAT + BEAT) % BEAT, fire = T0 > EV.doom + BEAT * .9 && Math.floor((T0 - EV.doom) / BEAT) % 2 === 1 && sinceBeat < .12;
  const kick = fire ? 4 : 0, gx = 80 + Math.sin(age * 4.5) * 2, gy = 58 + Math.abs(Math.sin(age * 4.5)) * 2 + kick;
  p.save(); p.translate(gx, gy + 22); p.scale(1.6, 1.6); p.translate(-gx, -(gy + 22));
  if (fire) { p.fillStyle = "#fff2a0"; p.fillRect(gx - 5, gy - 10, 10, 8); p.fillStyle = "#ff9a2a"; p.fillRect(gx - 7, gy - 8, 14, 5); }
  p.fillStyle = "#2a2a2e"; p.fillRect(gx - 3, gy - 3, 6, 14); p.fillStyle = "#56565e"; p.fillRect(gx - 2, gy - 3, 2, 12);
  p.fillStyle = "#d89a6a"; p.fillRect(gx - 6, gy + 8, 12, 14); p.fillStyle = "#a86a3a"; p.fillRect(gx - 6, gy + 14, 12, 2);
  p.restore();
  // status bar
  p.fillStyle = '#5a5a5a'; p.fillRect(0, vh, w, h - vh); p.fillStyle = '#7a7a7a'; p.fillRect(0, vh, w, 1);
  p.fillStyle = '#3a3a3a'; for (const bx of [36, 76, 116]) p.fillRect(bx, vh + 1, 1, 19);
  const ammo = 50 - Math.max(0, Math.floor((T0 - EV.doom - BEAT) / (BEAT * 2)));
  T.pixText(p, String(ammo), 6, vh + 4, 1, { color: '#e8282a' }); T.pixText(p, '100%', 44, vh + 4, 1, { color: '#e8282a' }); T.pixText(p, '0%', 92, vh + 4, 1, { color: '#e8282a' });
  T.pixText(p, 'AMMO', 6, vh + 12, 1, { color: '#cfcfcf', gap: 0 }); T.pixText(p, 'HEALTH', 40, vh + 12, 1, { color: '#cfcfcf', gap: 0 }); T.pixText(p, 'ARMOR', 84, vh + 12, 1, { color: '#cfcfcf', gap: 0 });
  p.fillStyle = '#e8b06a'; p.fillRect(130, vh + 3, 16, 15); p.fillStyle = '#5a3a1a'; p.fillRect(133, vh + 8, 3, 2); p.fillRect(140, vh + 8, 3, 2); p.fillRect(135, vh + 13, 6, 1);
}

// ================================================================ PS1 (wobble) and N64 (fog + blur)
function ps1Screen(p, T0) {
  const w = 160, h = 120;
  const sky = p.createLinearGradient(0, 0, 0, h); sky.addColorStop(0, '#0a0620'); sky.addColorStop(.6, '#3a1a5a'); sky.addColorStop(1, '#ff7a5a'); p.fillStyle = sky; p.fillRect(0, 0, w, h);
  const age = T0 - EV.ps1, cam = { x: Math.sin(age * .4) * 6, y: 4.2, z: -9 + age * .5, yaw: Math.sin(age * .4) * -.45, pitch: -.22, f: 130 };
  const tris = [];
  // checker floor (affine-style: big quads, so the texture "swims")
  for (let i = -6; i < 6; i++) for (let j = -2; j < 14; j++) { const c = (i + j) & 1 ? '#2a2a6a' : '#e8e0d0'; const y = 0; tris.push([[[i * 2, y, j * 2], [i * 2, y, j * 2 + 2], [i * 2 + 2, y, j * 2 + 2]], c, 1]); tris.push([[[i * 2, y, j * 2], [i * 2 + 2, y, j * 2 + 2], [i * 2 + 2, y, j * 2]], c, 1]); }
  // floating crystal (octahedron, faceted), spinning
  const cy = 3 + Math.sin(age * 2) * .3, ra = age * 1.4, r = 1.6, pts = [[0, cy + 2.2, 5]];
  for (let k = 0; k < 6; k++) pts.push([Math.cos(ra + k / 6 * TAU) * r, cy, 5 + Math.sin(ra + k / 6 * TAU) * r]);
  pts.push([0, cy - 2.2, 5]);
  const cols = ['#ff3a6a', '#ffd23f', '#3ad8ff', '#7aff5a', '#b85aff', '#ff8a2a'];
  for (let k = 0; k < 6; k++) { const a = pts[1 + k], b = pts[1 + (k + 1) % 6]; tris.push([[pts[0], b, a], cols[k]]); tris.push([[pts[7], a, b], cols[(k + 3) % 6]]); }
  // pillars
  for (const [x, z] of [[-6, 8], [6, 8], [-6, 16], [6, 16]]) box(tris, x, 0, z, .8, 4, .8, '#b8a8d8');
  drawTris(p, cam, tris, w, h, { snap: true, fog: [255, 122, 90], fog0: 12, fog1: 34 });
  T.pixText(p, 'POLYGONS!', 4, 4, 1, { color: '#fff' });
}
function terrainH(x, z) { return Math.max(0, fbm2(x * .08 + 3, z * .08 + 1, 3) * 7 + 1.5) + (Math.hypot(x, z - 10) < 4 ? 0 : 0); }
function n64Screen(p, T0) {
  const w = 160, h = 120;
  const sky = p.createLinearGradient(0, 0, 0, h * .6); sky.addColorStop(0, '#3a7aff'); sky.addColorStop(1, '#b8e0ff'); p.fillStyle = sky; p.fillRect(0, 0, w, h);
  const age = T0 - EV.n64, oa = age * .35 + .5, cam = { x: Math.sin(oa) * 15, y: 9, z: 10 - Math.cos(oa) * 15, yaw: -oa, pitch: -.38, f: 120 };
  const tris = [], N = 16, S = 2.2;
  for (let i = -N / 2; i < N / 2; i++) for (let j = -N / 2 + 5; j < N / 2 + 5; j++) {
    const x0 = i * S, z0 = j * S, a = [x0, terrainH(x0, z0), z0], b = [x0, terrainH(x0, z0 + S), z0 + S], c = [x0 + S, terrainH(x0 + S, z0 + S), z0 + S], d = [x0 + S, terrainH(x0 + S, z0), z0];
    const flat = Math.hypot(x0, z0 - 10) < 5;
    if (flat) { a[1] = b[1] = c[1] = d[1] = 1.5; }
    const col = flat ? '#d8c890' : (i + j) & 1 ? '#3ab83a' : '#46c846';
    tris.push([[a, b, c], col]); tris.push([[a, c, d], col]);
  }
  // castle on the plateau
  box(tris, 0, 1.5, 12, 2.2, 3, 1.6, '#e8e0d8'); for (const [x, z] of [[-2.4, 10.6], [2.4, 10.6], [-2.4, 13.4], [2.4, 13.4]]) { box(tris, x, 1.5, z, .6, 4.2, .6, '#d8d0c8'); cone(tris, x, 5.7, z, .9, 1.6, '#e83a3a'); }
  cone(tris, 0, 4.5, 12, 1.6, 2.2, '#e83a3a', 8);
  // the little hero runs a circle on the lawn
  const ha = age * 2.2, hx = Math.cos(ha) * 3.6, hz = 7.5 + Math.sin(ha) * 2;
  box(tris, hx, 1.5, hz, .35, .7, .35, '#2a4ae8'); box(tris, hx, 2.2, hz, .38, .5, .38, '#e8382a'); box(tris, hx, 2.7, hz, .3, .35, .3, '#ffc89a');
  // trees
  for (const [x, z] of [[-9, 4], [8, 2], [-7, 16], [10, 15], [-11, 11]]) { box(tris, x, terrainH(x, z), z, .25, 1.2, .25, '#7a4a1a'); cone(tris, x, terrainH(x, z) + 1.2, z, 1.1, 2.4, '#1a8a2a', 6); }
  drawTris(p, cam, tris, w, h, { fog: [200, 228, 255], fog0: 16, fog1: 36, seams: true });
  // a coin-star icon + counter, N64-style HUD
  T.pixText(p, '\u2665 x 4', 6, 6, 1, { color: '#ffe23f' }); T.pixText(p, 'STARS 12', 106, 6, 1, { color: '#ffe23f' });
}
function disc(ctx, x, y, r, T0) {
  ctx.save(); ctx.translate(x, y);
  ctx.shadowColor = 'rgba(0,0,0,.7)'; ctx.shadowBlur = 30; ctx.shadowOffsetY = 14;
  ctx.fillStyle = '#070709'; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill(); ctx.shadowColor = 'transparent';
  // iridescent sheen sweeping as it spins
  const a = T0 * 4;
  for (let k = 0; k < 36; k++) {
    const a0 = a + k / 36 * TAU, a1 = a0 + TAU / 36, c = mix('#ff3a8a', '#3ad8ff', .5 + .5 * Math.sin(k / 36 * TAU * 2 + a * .3));
    ctx.fillStyle = rgba(c, .42 * (.3 + .6 * Math.pow(Math.abs(Math.sin(k / 36 * Math.PI * 2)), 3)));
    ctx.beginPath(); ctx.moveTo(Math.cos(a0) * r * .3, Math.sin(a0) * r * .3); ctx.arc(0, 0, r * .98, a0, a1); ctx.closePath(); ctx.fill();
  }
  ctx.fillStyle = '#2a2a30'; ctx.beginPath(); ctx.arc(0, 0, r * .3, 0, TAU); ctx.fill();
  ctx.fillStyle = '#c8ccd4'; ctx.beginPath(); ctx.arc(0, 0, r * .22, 0, TAU); ctx.fill();
  ctx.fillStyle = '#0b0b0e'; ctx.beginPath(); ctx.arc(0, 0, r * .08, 0, TAU); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, r - 1, 0, TAU); ctx.stroke();
  ctx.restore();
}
function threed(ctx, t, T0) {
  const which = T0 < EV.ps1 ? 0 : T0 < EV.n64 ? 1 : 2, since = T0 - [EV.doom, EV.ps1, EV.n64][which];
  if (which === 0) {
    R.room(ctx, t, { tint: '#ff7a3a', ga: .16, seed: 71, flicker: .9 + .1 * Math.sin(T0 * 30) });
    ctx.save(); R.cam(ctx, since, 4, 1.0, 1.06, 540, 420);
    R.monitor(ctx, T0, (c, x, y, w, h) => { const L = R.lowres('doom', 160, 100); doomScreen(L.c, T0); R.blit(c, L.cv, x, y, w, h); });
    ctx.restore();
  } else if (which === 1) {
    R.room(ctx, t, { tint: '#b85aff', ga: .2, seed: 72 });
    ctx.save(); R.cam(ctx, since, 3.4, 1.0, 1.05, 500, 430);
    R.tv80(ctx, T0, (c, x, y, w, h) => { const L = R.lowres('ps1', 160, 120); ps1Screen(L.c, T0); R.blit(c, L.cv, x, y, w, h); }, { body: '#a4a6ad', brand: 'TRINITRON' });
    disc(ctx, 880, 640, 120, T0);
    ctx.restore();
  } else {
    R.room(ctx, t, { tint: '#7ac8ff', ga: .2, seed: 73 });
    ctx.save(); R.cam(ctx, since, 3.4, 1.0, 1.05, 540, 440);
    R.tv80(ctx, T0, (c, x, y, w, h) => { const L = R.lowres('n64', 160, 120); n64Screen(L.c, T0); c.save(); c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high'; c.drawImage(L.cv, x, y, w, h); c.restore(); }, { body: '#2b2d31', scr: { pitch: 3, scan: .22 } });
    ctx.restore();
  }
  if (since < .25 && T0 > EV.doom + .3) { ctx.fillStyle = `rgba(255,255,255,${.35 * (1 - since / .25)})`; ctx.fillRect(0, 0, W, H); }
}

module.exports = { bits16, threed, proj, drawTris, box, cone, LIGHT };
