// ISRO logo and a waving Indian tricolour, drawn as vectors.
const { clamp } = require('./core');
const { rgba, glow } = require('./gfx');

const ORANGE = [242, 122, 40], BLUE = [58, 142, 218];

// ISRO logo: orange launch spike with a swept fin, a two-panel satellite, and the इसरो | isro wordmark
// split by the spike. (x,y) = centre of the spike, s = spike height px
function isroLogo(ctx, x, y, s, o = {}) {
  const a = o.alpha ?? 1, words = o.words !== false;
  if (a <= 0.003) return;
  const orange = rgba(o.orange ?? ORANGE), blue = rgba(o.blue ?? BLUE);
  ctx.save(); ctx.globalAlpha = a; ctx.translate(x, y);
  if (o.glow) { ctx.shadowColor = rgba([255, 255, 255], .45 * o.glow); ctx.shadowBlur = 24; }
  // satellite: two solar-panel bars, each split in two, tilted down to the right
  ctx.fillStyle = blue;
  for (const [cx, cy] of [[-.278, -.337], [-.169, -.297], [.084, -.249], [.188, -.209]]) {
    ctx.save(); ctx.translate(cx * s, cy * s); ctx.rotate(.343); ctx.fillRect(-.046 * s, -.023 * s, .092 * s, .046 * s); ctx.restore();
  }
  ctx.fillStyle = orange;
  ctx.beginPath();
  ctx.moveTo(0, -.5 * s);
  ctx.lineTo(-.276 * s, .071 * s);
  ctx.quadraticCurveTo(-.109 * s, -.082 * s, -.016 * s, -.149 * s);
  ctx.lineTo(-.016 * s, .123 * s);
  ctx.lineTo(0, .5 * s);
  ctx.lineTo(.015 * s, .123 * s);
  ctx.lineTo(.012 * s, -.483 * s);
  ctx.closePath(); ctx.fill();
  ctx.shadowBlur = 0;
  if (words) {
    ctx.letterSpacing = '0px'; ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
    // Hindi: headline at .107s, right edge just left of the spike
    let F = .27 * s; ctx.font = `${F}px KohB`;
    let w = ctx.measureText('इसरो').width;
    const sx = .467 * s / w;
    ctx.save(); ctx.translate(-.071 * s - w * sx, .107 * s + .66 * F); ctx.scale(sx, 1); ctx.fillText('इसरो', 0, 0); ctx.restore();
    // English: letters hang from a blue bar, the dot of the i sits above it
    ctx.fillStyle = blue;
    ctx.fillRect(.033 * s, .107 * s, .469 * s, .025 * s);
    F = .235 * s; ctx.font = `${F}px AvDemi`;
    w = ctx.measureText('ısro').width;
    ctx.save(); ctx.translate(.036 * s, .25 * s); ctx.scale(.462 * s / w, 1); ctx.fillText('ısro', 0, 0); ctx.restore();
    ctx.beginPath(); ctx.arc(.059 * s, .073 * s, .016 * s, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

function flatFlag(ctx, x, y, w, h) {
  const b = h / 3;
  ctx.fillStyle = 'rgb(255,153,51)'; ctx.fillRect(x, y, w, b + 1);
  ctx.fillStyle = 'rgb(250,250,246)'; ctx.fillRect(x, y + b, w, b + 1);
  ctx.fillStyle = 'rgb(19,136,8)'; ctx.fillRect(x, y + 2 * b, w, b);
  // Ashoka Chakra, 24 spokes
  const cx = x + w / 2, cy = y + h / 2, r = b * .43;
  ctx.strokeStyle = 'rgb(0,0,128)'; ctx.fillStyle = 'rgb(0,0,128)';
  ctx.lineWidth = r * .1; ctx.beginPath(); ctx.arc(cx, cy, r * .95, 0, Math.PI * 2); ctx.stroke();
  ctx.lineWidth = r * .045; ctx.beginPath();
  for (let i = 0; i < 24; i++) { const an = i / 24 * Math.PI * 2; ctx.moveTo(cx + Math.cos(an) * r * .16, cy + Math.sin(an) * r * .16); ctx.lineTo(cx + Math.cos(an) * r * .92, cy + Math.sin(an) * r * .92); }
  ctx.stroke();
  ctx.beginPath(); ctx.arc(cx, cy, r * .17, 0, Math.PI * 2); ctx.fill();
}
// cloth waving from a pole on the left; (x,y) = top-left of the flag at the pole
function flag(ctx, x, y, w, t, o = {}) {
  const h = w * 2 / 3, N = 96, A = (o.amp ?? .07) * h, a = o.alpha ?? 1;
  if (a <= .003) return;
  const wave = (u) => A * u * Math.sin(u * 7.5 - t * 4.2) + A * .35 * u * Math.sin(u * 15 - t * 6.3 + 1);
  const slope = (u) => (wave(u + .004) - wave(u - .004)) / (.008 * w);
  ctx.save(); ctx.globalAlpha = a;
  // pole
  const pg = ctx.createLinearGradient(x - w * .03, 0, x, 0);
  pg.addColorStop(0, '#5a5a5e'); pg.addColorStop(.4, '#e8e8ea'); pg.addColorStop(1, '#6a6a70');
  ctx.fillStyle = pg; ctx.fillRect(x - w * .028, y - w * .05, w * .022, o.pole ?? h * 2.4);
  ctx.fillStyle = '#d9b44a'; ctx.beginPath(); ctx.arc(x - w * .017, y - w * .055, w * .02, 0, Math.PI * 2); ctx.fill();
  for (let i = 0; i < N; i++) {
    const u0 = i / N, u1 = (i + 1) / N, um = (u0 + u1) / 2, dy = wave(um), sx = x + u0 * w;
    // the cloth gets shorter where it folds toward or away from us
    const k = 1 - Math.min(.12, Math.abs(slope(um)) * .25);
    ctx.save();
    ctx.beginPath(); ctx.rect(sx, y - h, (u1 - u0) * w + .8, h * 3); ctx.clip();
    ctx.translate(0, y + dy + h * (1 - k) / 2); ctx.scale(1, k); ctx.translate(0, -y);
    flatFlag(ctx, x, y, w, h);
    const sl = slope(um);
    ctx.fillStyle = sl > 0 ? `rgba(0,0,0,${clamp(sl * 2.2, 0, .45)})` : `rgba(255,255,255,${clamp(-sl * 1.2, 0, .22)})`;
    ctx.fillRect(sx, y, (u1 - u0) * w + .8, h);
    ctx.restore();
  }
  ctx.restore();
}

module.exports = { isroLogo, flag, flatFlag, ORANGE, BLUE };
