from lib import *
import cv2, numpy as np, math, os

FPS = 24
SRC_CUTS = [80, 111, 140, 170, 314, 403, 431, 463, 491, 521, 550, 579, 609, 638, 667, 695, 724, 753, 782, 812]
SHOTS = [(0, 'naruto1'), (80, 'bebop'), (170, 'champloo'), (403, 'aot1'), (463, 'mha'), (521, 'vinland'), (579, 'yyh'),
         (609, 'ds1'), (638, 'shield'), (667, 'jjk'), (695, 'fmab'), (724, 'ds2'), (782, 'naruto2'), (812, 'aot2')]
GAN_OF = {'naruto1': 'h', 'bebop': 'h', 'champloo': 'h', 'aot1': 'h', 'mha': 's', 'vinland': 'h', 'yyh': 's',
          'ds1': 's', 'shield': 's', 'jjk': 'h', 'fmab': 'h', 'ds2': 's', 'naruto2': 'h', 'aot2': 'h'}
N_FRAMES = 343


def src_idx(i):
    return int(round(i * 2.5))


def shot_info(i):
    s = src_idx(i)
    k = 0
    for n, (st, key) in enumerate(SHOTS):
        if s >= st:
            k = n
    st, key = SHOTS[k]
    first = next(j for j in range(N_FRAMES) if src_idx(j) >= st)
    cuts = [0] + [c for c in SRC_CUTS if c <= s]
    lastcut = max(cuts)
    firstc = next(j for j in range(N_FRAMES) if src_idx(j) >= lastcut)
    return k, key, i - first, i - firstc


class Ctx:
    pass


_cache = {}


def fbm(seed, scale=1.0, octaves=5):
    k = (seed, scale, octaves)
    if k in _cache:
        return _cache[k]
    rs = np.random.RandomState(seed)
    acc = np.zeros((H, W), np.float32)
    amp = 1.0
    tot = 0
    for o in range(octaves):
        n = max(2, int(6 * (2 ** o) / scale))
        g = rs.rand(int(n * H / W) + 2, n + 2).astype(np.float32)
        acc += amp * cv2.resize(g, (W, H), interpolation=cv2.INTER_CUBIC)
        tot += amp
        amp *= 0.5
    acc /= tot
    acc = (acc - acc.min()) / (acc.max() - acc.min())
    _cache[k] = acc
    return acc


def ease_out(x):
    x = min(1.0, max(0.0, x))
    return 1 - (1 - x) ** 3


def core(c, gw=0.3, levels=4, soft=0.12, chroma=1.1, sp=9, sr=26, ls=2.4, lk=1.6, leps=-0.02, lphi=40.0,
         lthick=1, lcol=(0.04, 0.04, 0.05), lalpha=1.0, lboil=1.2, tinted_lines=False, lblur=0.8, bands=3, ledge=0.9):
    s = c.src
    fl = flatten(s, sp, sr)
    base = mix(fl, c.gan, gw) if gw > 0 else fl
    base = quant(base, levels, soft, chroma)
    if c.diff is not None:
        base = mix(c.diff, quant(c.diff, 8, 0.2, 1.05), 0.3)
        g = lum(c.diff)
        ln = ink(g, 1.3, 1.6, 0.97, -0.035, 40.0)
        ln = blur(boil(ln, c.brng, lboil * 0.5), 0.6)
        out = base * (1 - ln[..., None] * 0.55) + col(lcol) * (ln[..., None] * 0.55)
        c.fl, c.ln, c.base = fl, ln, base
        return out
    fl2 = flatten(s, 12, 34, 0.4)
    g = lum(fl2)
    x = ink(g, ls, lk, 0.97, leps, lphi)
    gq = np.floor(blur(g, 1.5) * bands).astype(np.float32)
    e = (np.abs(cv2.Sobel(gq, cv2.CV_32F, 1, 0)) + np.abs(cv2.Sobel(gq, cv2.CV_32F, 0, 1))) > 0
    e = smooth(0.2, 0.6, blur(e.astype(np.float32), 1.6))
    ln = np.clip(np.maximum(x, e * ledge), 0, 1)
    ln = thicken(ln, lthick)
    ln = boil(ln, c.brng, lboil)
    ln = blur(ln, lblur)
    ln = np.clip(ln * 1.2, 0, 1)
    if tinted_lines:
        out = base * (1 - ln[..., None] * lalpha * 0.82)
    else:
        out = base * (1 - ln[..., None] * lalpha) + col(lcol) * (ln[..., None] * lalpha)
    c.fl, c.ln, c.base = fl, ln, base
    return out


def tag(c, text, fnt, pos, **kw):
    c.layer.stamp(text, fnt, pos, **kw)


def character_tag(c, n, colr=(255, 255, 255, 235)):
    c.layer.stamp('CHARACTER %02d / 14' % c.char, font(FJ6, 22), (W - 40, H - 36), fill=colr, stroke=3,
                  stroke_fill=(0, 0, 0, 200), anchor='rm')


def pop(c, dd=None, n=6):
    d = c.ds if dd is None else dd
    return ease_out(d / n)


# ----------------------------------------------------------- looks
def look_naruto(c, arc):
    d = c.ds
    out = core(c, gw=0.35, levels=4, chroma=1.0, sp=11, sr=36, ls=2.4, lthick=1, lcol=(0.03, 0.05, 0.09))
    if arc == 1:
        out = grade(out, 0.95, 1.15, 0.3)
        out = split_tone(out, (0.04, 0.0, -0.02), (-0.03, 0.03, 0.04), 0.7)
    else:
        out = grade(out, 0.92, 1.3, 0.4)
        out = split_tone(out, (0.04, -0.02, 0.02), (-0.08, 0.0, 0.1), 1.0)
        out = out * col((0.82, 0.92, 1.12))
    out = bloom(out, 0.7, 14, 0.4, (0.5, 0.8, 1.0))
    # chakra swirl
    sw = 0.5 + 0.5 * np.cos(7 * TH + 16 * R - c.i * 0.55)
    sw = smooth(0.55, 0.95, sw) * smooth(0.55, 1.0, R)
    sc = (0.1, 0.5, 1.0) if arc == 1 else (0.1, 0.25, 1.0)
    out = np.clip(out + sw[..., None] * np.array(sc, np.float32) * 0.28, 0, 1)
    pm = draw_particles(c.i, 24, 11 + arc, (2.5, 3.5), (5, 10), None, shape='leaf', sway=60, alpha_pulse=False)
    pm = blur(pm, 1.0)
    leaf = (0.15, 0.75, 0.35) if arc == 1 else (0.1, 0.4, 0.95)
    out = mix(out, col(leaf) * 0.9, pm * 0.85)
    if c.dc < 9:
        sl = speed_lines(np.random.RandomState(c.i * 3 + 1), 160, 0.38)
        out = mix(out, col((1, 1, 1)), sl * (1 - c.dc / 9.0) * 0.9)
    L = c.layer
    if arc == 1:
        L.stamp('NARUTO', font(FI, 120), (60, 180), fill=(255, 140, 20, 255), stroke=8, stroke_fill=(10, 10, 20, 255), shear=0.12, anchor='lm')
        L.stamp('SHIPPUDEN', font(FI, 52), (64, 265), fill=(255, 255, 255, 255), stroke=5, stroke_fill=(10, 10, 20, 255), shear=0.12, anchor='lm')
    else:
        L.stamp('NARUTO', font(FI, 100), (60, 180), fill=(255, 80, 10, 255), stroke=8, stroke_fill=(10, 10, 20, 255), shear=0.12, anchor='lm')
        L.stamp('ナルト 疾風伝', font(FJ, 44), (64, 265), fill=(255, 255, 255, 255), stroke=6, stroke_fill=(10, 10, 20, 255), anchor='lm')
    L.stamp('疾風伝', font(FJ, 110), (W - 100, 340), fill=(255, 160, 20, 255), stroke=9, stroke_fill=(10, 10, 20, 255),
            vertical=True, opacity=pop(c, c.ds - 2, 5))
    if d < 14:
        sc_ = 0.6 + 0.6 * ease_out(d / 6.0)
        L.stamp('ドン!!' if arc == 1 else 'ザッ!!', font(FJ, 190), (W * 0.2, H * 0.8), fill=(255, 235, 40, 255), stroke=14,
                stroke_fill=(180, 20, 0, 255), angle=-9, scale=sc_, shadow=(10, 10, 1.0, (0, 0, 0)))
    return out


def look_bebop(c):
    rng = np.random.RandomState(c.i * 7 + 3)
    out = core(c, gw=0.2, levels=5, chroma=0.95, ls=1.0, lthick=0, lcol=(0.03, 0.06, 0.12), lalpha=0.7, lboil=1.6, soft=0.16)
    out = grade(out, 1.05, 0.8, 0.4, 0.0, 1.05)
    out = split_tone(out, (0.06, 0.03, -0.03), (-0.06, 0.0, 0.07), 1.0)
    out = bloom(out, 0.55, 16, 0.75, (0.3, 0.55, 1.0))
    out = shift(out, rng.uniform(-1.5, 1.5), rng.uniform(-1.5, 1.5))
    out = grain(out, 0.06, rng, 1)
    out = vignette(out, 0.55)
    # dust and hair
    dust = np.zeros((H, W), np.float32)
    for _ in range(rng.randint(3, 14)):
        cv2.circle(dust, (rng.randint(0, W), rng.randint(0, H)), rng.randint(1, 3), 1.0, -1, cv2.LINE_AA)
    if rng.rand() < 0.35:
        x0, y0 = rng.randint(100, W - 100), rng.randint(100, H - 100)
        pts = np.array([[x0 + int(30 * math.sin(k / 3.0 + rng.rand())), y0 + k * 4] for k in range(25)], np.int32)
        cv2.polylines(dust, [pts.reshape(-1, 1, 2)], False, 1.0, 1, cv2.LINE_AA)
    out = np.clip(out + dust[..., None] * 0.55, 0, 1)
    if rng.rand() < 0.4:
        x = rng.randint(0, W)
        out[:, x:x + 2] = np.clip(out[:, x:x + 2] + 0.18, 0, 1)
    bar = 138
    out[:bar] = 0.0
    out[H - bar:] = 0.0
    L = c.layer
    L.stamp('SESSION #01', font(FI, 62), (90, H - bar / 2), fill=(255, 190, 40, 255), anchor='lm', shear=0.2)
    L.stamp('COWBOY BEBOP', font(FI, 62), (W - 90, H - bar / 2), fill=(255, 255, 255, 255), anchor='rm', shear=0.2)
    L.stamp('カウボーイビバップ', font(FJ, 40), (90, bar / 2), fill=(255, 190, 40, 255), anchor='lm')
    L.stamp('Easy come, easy go.', font(FI, 38), (W / 2, H - bar / 2 - 2), fill=(255, 255, 255, int(255 * min(1, max(0, (c.ds - 6) / 8.0)))), anchor='mm', shear=0.2)
    return out


def look_champloo(c):
    rng = np.random.RandomState(c.i * 5 + 1)
    out = core(c, gw=0.3, levels=5, chroma=0.9, ls=1.7, lthick=1, lcol=(0.05, 0.08, 0.12), lalpha=0.95, lboil=2.4)
    nz = smooth(0.25, 0.75, cv2.resize(rng.rand(H // 5 + 2, W // 5 + 2).astype(np.float32), (W, H), interpolation=cv2.INTER_CUBIC))
    out = mix(out, col((0.04, 0.07, 0.11)), np.clip(c.ln * nz * 0.5, 0, 1))
    out = grade(out, 1.0, 0.72, 0.3, 0.02, 1.05)
    out = split_tone(out, (-0.02, 0.01, 0.01), (-0.09, 0.0, 0.08), 1.0)
    paper = fbm(5, 1.0, 5) * 0.5 + fbm(6, 6.0, 3) * 0.5
    out = out * (0.86 + 0.22 * paper[..., None])
    out = grain(out, 0.05, rng, 1)
    blot = fbm(9, 0.7, 4)
    out = out * (1 - 0.5 * smooth(0.45, 1.2, R + (blot - 0.5) * 0.5))[..., None] * col((0.95, 1.0, 1.05))
    # beat pulse
    beat = (c.i % 12)
    pz = 1.0 + 0.035 * math.exp(-beat / 2.2)
    out = zoom(out, pz)
    # record scratch glitch
    if rng.rand() < 0.07:
        y0 = rng.randint(100, H - 300)
        hh = rng.randint(60, 220)
        out[y0:y0 + hh] = np.roll(out[y0:y0 + hh], rng.randint(-70, 70), axis=1)
        out[y0:y0 + 2] = 1.0
    L = c.layer
    L.stamp('SAMURAI CHAMPLOO', font(FB, 74), (110, 100), fill=(240, 200, 80, 255), stroke=6, stroke_fill=(30, 18, 10, 255), anchor='lm', angle=3)
    L.stamp('サムライチャンプルー', font(FJ, 80), (W - 90, 520), fill=(245, 235, 210, 255), stroke=7, stroke_fill=(30, 18, 10, 255), vertical=True,
            opacity=pop(c, c.ds - 2, 6))
    return out


def look_aot(c, arc):
    rng = np.random.RandomState(c.i * 11 + 2)
    out = core(c, gw=0.25, levels=4, chroma=0.85, ls=1.5, leps=-0.012, lthick=1, lcol=(0.03, 0.04, 0.06), lboil=2.0)
    out = grade(out, 0.85, 0.62, 0.5, 0.08, 1.12)
    out = split_tone(out, (0.05, 0.01, -0.03), (-0.02, 0.02, 0.06), 1.0)
    if arc == 2:
        out = out * col((0.8, 0.82, 1.1))
        out = split_tone(out, (0.0, -0.02, 0.1), (0.0, 0.0, 0.04), 1.0)
    tone = 1 - lum(c.fl)
    h1 = hatch(tone, 0.5, angle=-38, spacing=7, width=0.32)
    h2 = hatch(tone, 0.68, angle=38, spacing=7, width=0.32)
    hh = np.clip(h1 + h2, 0, 1)
    out = out * (1 - 0.62 * hh[..., None])
    sm = fbm(21, 1.0, 5)
    smk = cv2.warpAffine(sm, np.float32([[1, 0, c.i * 3.0], [0, 1, -c.i * 6.0]]), (W, H), borderMode=cv2.BORDER_REFLECT)
    out = np.clip(out + (smooth(0.5, 0.85, smk) * 0.22)[..., None] * col((0.9, 0.95, 1.0)), 0, 1)
    out = grain(out, 0.04, rng, 1)
    out = vignette(out, 0.7, 0.3, 1.1)
    shake = 7 * math.exp(-c.dc / 5.0) + 1.5
    out = shift(out, rng.uniform(-shake, shake), rng.uniform(-shake, shake))
    L = c.layer
    L.stamp('進撃の巨人', font(FM, 130, 1), (W - 100, 400), fill=(240, 230, 210, 255), stroke=7, stroke_fill=(8, 8, 8, 255), vertical=True,
            opacity=pop(c, c.ds - 2, 6))
    L.stamp('ATTACK ON TITAN' if arc == 1 else 'THE FINAL SEASON', font(FM, 44, 1), (110, 160), fill=(235, 225, 200, 255), stroke=4,
            stroke_fill=(8, 8, 8, 255), anchor='lm')
    if c.ds < 22:
        sx = rng.uniform(-3, 3) * (c.ds < 22)
        L.stamp('ゴゴゴゴゴ', font(FJ, 130), (W * 0.3 + sx, H * 0.86), fill=(200, 25, 25, 255), stroke=10, stroke_fill=(8, 8, 8, 255),
                scale=0.8 + 0.25 * ease_out(c.ds / 10.0), opacity=min(1, c.ds / 3.0) * (1 - max(0, (c.ds - 16) / 6.0)))
    return out


def look_mha(c):
    rng = np.random.RandomState(c.i * 13 + 5)
    out = core(c, gw=0.2, levels=3, chroma=1.6, ls=1.6, lthick=2, lcol=(0, 0, 0), lboil=1.4, soft=0.1)
    out = grade(out, 0.85, 1.75, 0.5, 0.01, 1.05)
    out = split_tone(out, (0.06, -0.01, 0.0), (-0.05, 0.02, 0.06), 0.8)
    tone = smooth(0.58, 0.18, lum(c.fl))
    ht = halftone(tone, 10, 45)
    out = out * (1 - 0.42 * ht[..., None] * col((0.9, 0.7, 0.2)))
    out = bloom(out, 0.75, 12, 0.35)
    L = c.layer
    d = c.ds
    if c.dc < 14:
        sl = speed_lines(np.random.RandomState(c.i + 100), 200, 0.3, maxw=3)
        out = mix(out, col((1, 1, 1)), sl * (1 - c.dc / 14.0) * 0.85)
    if d < 18:
        cx, cy = W * 0.62, 150
        rr = np.sqrt(((XX - cx) / 1.6) ** 2 + (YY - cy) ** 2)
        wedge = (np.sin(np.arctan2(YY - cy, XX - cx) * 11 + d * 0.5) > 0).astype(np.float32)
        burst = mix(np.ones((H, W, 3), np.float32) * col((0.1, 0.12, 0.95)), np.ones((H, W, 3), np.float32) * col((0.1, 0.85, 1.0)), wedge)
        a = smooth(215 + 15, 215 - 15, rr) * min(1, d / 3.0) * (1 - max(0, (d - 14) / 4.0))
        out = mix(out, burst, a * 0.95)
        L.stamp('PLUS ULTRA!!', font(FI, 150), (cx, cy), fill=(255, 235, 20, 255), stroke=12, stroke_fill=(10, 10, 10, 255), shear=0.18,
                angle=-4, scale=0.5 + 0.5 * ease_out(d / 5.0), shadow=(8, 8, 1.0, (200, 20, 20)),
                opacity=min(1, d / 3.0) * (1 - max(0, (d - 14) / 4.0)))
    L.stamp('僕のヒーローアカデミア', font(FJ, 46), (110, 160), fill=(255, 255, 255, 255), stroke=6, stroke_fill=(10, 10, 10, 255), anchor='lm')
    L.stamp('MY HERO ACADEMIA', font(FI, 40), (110, 205), fill=(255, 230, 20, 255), stroke=5, stroke_fill=(10, 10, 10, 255), anchor='lm', shear=0.15)
    return out


def look_vinland(c):
    rng = np.random.RandomState(c.i * 3 + 9)
    out = core(c, gw=0.6, levels=6, soft=0.22, chroma=0.9, ls=1.1, lthick=0, lcol=(0.2, 0.22, 0.26), lalpha=0.62, lboil=1.0)
    out = grade(out, 1.02, 0.6, 0.3, 0.0, 1.05)
    out = split_tone(out, (0.04, 0.02, -0.02), (-0.01, 0.01, 0.03), 1.0)
    out = mix(out, blur(out, 2.2), 0.35)
    paper = fbm(31, 1.0, 5) * 0.5 + fbm(32, 7.0, 3) * 0.5
    out = out * (0.9 + 0.16 * paper[..., None])
    out = bloom(out, 0.7, 20, 0.3)
    out = vignette(out, 0.5)
    out = grain(out, 0.02, rng, 1)
    pm = blur(draw_particles(c.i, 40, 77, (-5, 2.5), (1, 3), None, 'dot', sway=40), 0.8)
    out = mix(out, col((0.85, 0.88, 0.9)), pm * 0.55)
    L = c.layer
    L.stamp('ヴィンランド・サガ', font(FM, 76, 1), (W - 110, 360), fill=(245, 240, 230, 255), stroke=5, stroke_fill=(20, 20, 24, 230), vertical=True,
            opacity=pop(c, c.ds - 2, 8))
    L.stamp('VINLAND SAGA', font(FM, 40, 1), (110, 160), fill=(235, 230, 220, 255), stroke=3, stroke_fill=(20, 20, 24, 200), anchor='lm')
    L.stamp('ᚠᚢᚦᚨᚱᚲ  ᚹᛁᚾᛚᚨᚾᛞ', font(FRUNE, 44), (110, H - 90), fill=(225, 215, 195, 220), anchor='lm', opacity=pop(c, c.ds - 3, 10))
    return out


def look_yyh(c):
    rng = np.random.RandomState(c.i * 17 + 4)
    out = core(c, gw=0.15, levels=3, chroma=1.2, ls=1.5, lthick=2, lcol=(0.02, 0.02, 0.03), lboil=1.8)
    out = grade(out, 1.0, 1.2, 0.5)
    out = split_tone(out, (0.06, 0.05, -0.03), (-0.03, 0.0, 0.05), 1.0)
    out = bloom(out, 0.55, 18, 0.9, (1.0, 0.85, 0.25))
    out = grain(out, 0.04, rng, 1)
    out = vignette(out, 0.4)
    # spirit aura rings
    ph = (c.dc / 14.0)
    ring = np.exp(-(((R - (0.1 + ph * 1.1)) / 0.035) ** 2)) * (1 - min(1, ph))
    ring2 = np.exp(-(((R - (0.02 + ph * 0.9)) / 0.02) ** 2)) * (1 - min(1, ph))
    out = np.clip(out + ((ring + ring2 * 0.6)[..., None] * col((1.0, 0.9, 0.3)) * 0.9), 0, 1)
    # film scratches
    for _ in range(rng.randint(0, 4)):
        x = rng.randint(0, W)
        out[:, x:x + 1] = np.clip(out[:, x:x + 1] + 0.25, 0, 1)
    out = ca(out, 2.5)
    L = c.layer
    L.stamp('幽☆遊☆白書', font(FJ, 96), (W - 100, 380), fill=(240, 255, 255, 255), stroke=9, stroke_fill=(10, 60, 90, 255), vertical=True,
            opacity=pop(c, c.ds - 1, 4))
    L.stamp('YU YU HAKUSHO', font(FI, 46), (110, 160), fill=(90, 230, 255, 255), stroke=5, stroke_fill=(5, 20, 40, 255), anchor='lm', shear=0.15)
    if c.ds < 12:
        sh = rng.uniform(-6, 6)
        L.stamp('霊丸!!', font(FJ, 210), (W * 0.22 + sh, H * 0.8), fill=(110, 240, 255, 255), stroke=16, stroke_fill=(5, 30, 70, 255),
                angle=7, scale=0.6 + 0.5 * ease_out(c.ds / 5.0), shadow=(12, 12, 1.0, (0, 0, 0)))
    return out


def look_ds(c, arc):
    rng = np.random.RandomState(c.i * 19 + 6)
    out = core(c, gw=0.3, levels=4, chroma=1.4, ls=1.1, lthick=1, lalpha=0.9, lboil=1.0, tinted_lines=True, soft=0.14)
    out = grade(out, 0.88, 1.5, 0.45)
    out = split_tone(out, (0.06, 0.03, -0.04), (-0.04, 0.02, 0.06), 0.9)
    out = bloom(out, 0.62, 16, 0.55, (1.0, 0.8, 0.5))
    # water breathing ribbons
    acc = np.zeros((H, W), np.float32)
    foam = np.zeros((H, W), np.float32)
    nrib = 6 if arc == 1 else 9
    xs = np.linspace(-100, W + 100, 160).astype(np.float32)
    t = c.i * 0.28
    rs = np.random.RandomState(40 + arc)
    for k in range(nrib):
        y0 = rs.uniform(0.15, 0.9) * H
        A = rs.uniform(60, 190)
        wl = rs.uniform(240, 520)
        ph = rs.uniform(0, 6.28)
        sp = rs.uniform(0.7, 1.5) * (1 if k % 2 else -1)
        th = rs.uniform(14, 40)
        yc = y0 + A * np.sin(xs / wl * 2 * math.pi * 0.5 + ph + t * sp) + 0.4 * A * np.sin(xs / wl * 3.1 + t * sp * 1.7)
        w_ = th * (0.55 + 0.9 * np.abs(np.sin(xs / (wl * 1.4) + ph)))
        top = np.stack([xs, yc - w_], 1)
        bot = np.stack([xs[::-1], (yc + w_)[::-1]], 1)
        poly = np.concatenate([top, bot]).astype(np.int32)
        cv2.fillPoly(acc, [poly], 1.0, cv2.LINE_AA)
        cv2.polylines(foam, [top.astype(np.int32).reshape(-1, 1, 2)], False, 1.0, 3, cv2.LINE_AA)
    inten = 0.6 if arc == 2 else 0.4
    out = mix(out, col((1.0, 0.72, 0.15)), blur(acc, 1.2) * inten * 0.65)
    out = np.clip(out + blur(foam, 1.0)[..., None] * 0.7 + blur(foam, 7)[..., None] * col((1.0, 0.8, 0.4)) * 0.6, 0, 1)
    # sparkles
    sm = blur(draw_particles(c.i, 30, 55 + arc, (1, -2.5), (2, 5), None, 'star', sway=25), 0.9)
    out = np.clip(out + sm[..., None] * col((1.0, 0.95, 0.8)) * 0.9, 0, 1)
    out = vignette(out, 0.35)
    # hanafuda checker wipe
    if c.dc < 7:
        sq = 90
        chk = (((XX // sq) + (YY // sq)) % 2).astype(np.float32)
        cc = mix(np.ones((H, W, 3), np.float32) * col((0.12, 0.12, 0.1)), np.ones((H, W, 3), np.float32) * col((0.35, 0.65, 0.1)), chk)
        prog = (c.dc / 6.0)
        a = 1 - smooth(prog * (W + 300) - 300, prog * (W + 300), XX)
        a = a * (1 - prog) ** 0.5
        out = mix(out, cc, a)
    L = c.layer
    L.stamp('鬼滅の刃', font(FM, 140, 1), (W - 105, 410), fill=(250, 250, 245, 255), stroke=8, stroke_fill=(10, 30, 70, 255), vertical=True,
            opacity=pop(c, c.ds - 2, 6))
    L.stamp('KIMETSU NO YAIBA', font(FM, 38, 1), (110, 160), fill=(250, 250, 245, 255), stroke=4, stroke_fill=(10, 30, 70, 255), anchor='lm')
    if c.ds < 16:
        L.stamp('水の呼吸', font(FM, 150, 1), (W * 0.4, H * 0.8), fill=(120, 220, 255, 255), stroke=9, stroke_fill=(10, 40, 100, 255),
                scale=0.7 + 0.3 * ease_out(c.ds / 6.0), opacity=min(1, c.ds / 3.0) * (1 - max(0, (c.ds - 11) / 5.0)), angle=3)
    return out


def look_shield(c):
    rng = np.random.RandomState(c.i * 23 + 8)
    out = core(c, gw=0.45, levels=5, chroma=1.25, ls=1.0, lthick=0, lcol=(0.35, 0.28, 0.12), lalpha=0.55, lboil=0.8, soft=0.2)
    out = grade(out, 0.82, 1.25, 0.15, 0.04, 1.0)
    out = split_tone(out, (0.07, 0.03, -0.03), (-0.06, 0.03, 0.08), 0.9)
    out = bloom(out, 0.5, 24, 0.85, (1.0, 0.9, 0.7))
    out = vignette(out, 0.2)
    sm = blur(draw_particles(c.i, 40, 88, (0.5, -2.2), (2, 4), None, 'star', sway=35), 1.0)
    out = np.clip(out + sm[..., None] * col((0.5, 0.9, 1.0)) * 0.9, 0, 1)
    L = c.layer
    k = pop(c, c.ds - 1, 5)
    L.rect((W - 560, 150, W - 60, 420), fill=(10, 40, 90, int(160 * k)), outline=(150, 220, 255, int(255 * k)), width=3, radius=12)
    f = font(FJ6, 34)
    for n_, t_ in enumerate(['STATUS', 'LV  40', 'HP  9999 / 9999', 'DEF  ∞']):
        L.stamp(t_, f, (W - 520, 190 + n_ * 58), fill=(235, 250, 255, int(255 * k)), anchor='lm')
    sh = [(140, 800), (280, 800), (280, 900), (210, 985), (140, 900)]
    L.poly(sh, fill=(30, 90, 170, int(235 * k)), outline=(255, 215, 90, int(255 * k)), width=7)
    L.line([(210, 812), (210, 965)], fill=(255, 215, 90, int(255 * k)), width=8)
    L.line([(152, 858), (268, 858)], fill=(255, 215, 90, int(255 * k)), width=8)
    L.stamp('盾の勇者の成り上がり', font(FJ6, 56), (W / 2, H - 70), fill=(255, 245, 215, 255), stroke=5, stroke_fill=(10, 50, 100, 255),
            opacity=pop(c, c.ds - 2, 6))
    L.stamp('THE RISING OF THE SHIELD HERO', font(FJ6, 26), (110, 160), fill=(255, 245, 215, 255), stroke=3, stroke_fill=(10, 50, 100, 255), anchor='lm')
    return out


def look_jjk(c):
    rng = np.random.RandomState(c.i * 29 + 3)
    out = core(c, gw=0.1, levels=3, chroma=1.15, ls=1.4, leps=-0.012, lthick=2, lcol=(0.0, 0.0, 0.0), lboil=1.6, soft=0.08)
    out = grade(out, 1.45, 1.05, 0.7)
    out = split_tone(out, (0.1, -0.02, 0.03), (0.02, 0.02, -0.02), 1.0)
    out = out * col((1.0, 0.8, 0.95))
    out = ca(out, 4.0)
    out = bloom(out, 0.55, 16, 0.9, (1.0, 0.35, 0.65))
    out = vignette(out, 0.55)
    out = grain(out, 0.03, rng, 1)
    # cursed energy bolts
    m = np.zeros((H, W), np.float32)
    nb = 2 + int(c.dc < 8) * 3
    for _ in range(nb):
        p0 = (rng.uniform(0, W), rng.uniform(0, H))
        ang = rng.uniform(0, 6.28)
        L_ = rng.uniform(300, 800)
        p1 = (p0[0] + math.cos(ang) * L_, p0[1] + math.sin(ang) * L_)
        bolt(m, p0, p1, rng, 70, 6, 3)
    out = glow_add(out, m, (1.0, 0.3, 0.7), 1.0, 9, 1.4)
    if c.dc < 4:
        mk = np.zeros((H, W), np.float32)
        for _ in range(3):
            bolt(mk, (W * rng.uniform(0.3, 0.7), H * rng.uniform(0.3, 0.7)), (rng.uniform(0, W), rng.uniform(0, H)), rng, 90, 6, 5)
        out = np.clip(out * (1 - blur(mk, 4)[..., None] * 0.9) + blur(mk, 6)[..., None] * col((0.1, 0.1, 1.0)), 0, 1)
    L = c.layer
    off = 5
    for dx, dy, cc in [(-off, 0, (255, 40, 120, 255)), (off, 0, (40, 220, 255, 255))]:
        L.stamp('呪術廻戦', font(FJ, 140), (W - 130 + dx, 380 + dy), fill=cc, stroke=0, vertical=True, opacity=0.8 * pop(c, c.ds - 1, 4))
    L.stamp('呪術廻戦', font(FJ, 140), (W - 130, 380), fill=(255, 255, 255, 255), stroke=4, stroke_fill=(10, 0, 30, 255), vertical=True, opacity=pop(c, c.ds - 1, 4))
    L.stamp('JUJUTSU KAISEN', font(FI, 50), (110, 160), fill=(255, 255, 255, 255), stroke=5, stroke_fill=(20, 0, 60, 255), anchor='lm', shear=0.15)
    if c.ds < 12:
        L.stamp('黒閃', font(FJ, 230), (W * 0.2 + rng.uniform(-6, 6), H * 0.78), fill=(10, 10, 10, 255), stroke=12, stroke_fill=(230, 20, 40, 255),
                scale=0.6 + 0.5 * ease_out(c.ds / 5.0), opacity=min(1, c.ds / 2.0) * (1 - max(0, (c.ds - 8) / 4.0)))
    return out


def alchemy_circle(c, rot, prog, rad):
    m = np.zeros((H, W), np.float32)
    cx, cy = int(W * 0.5), int(H * 0.52)
    A = int(360 * prog)
    cv2.ellipse(m, (cx, cy), (rad, rad), 0, 0, A, 1.0, 7, cv2.LINE_AA)
    cv2.ellipse(m, (cx, cy), (int(rad * 0.9), int(rad * 0.9)), 0, 0, A, 1.0, 3, cv2.LINE_AA)
    cv2.ellipse(m, (cx, cy), (int(rad * 0.45), int(rad * 0.45)), 0, 0, A, 1.0, 4, cv2.LINE_AA)
    for tri in (0, 60):
        pts = np.array([[cx + rad * 0.88 * math.cos(math.radians(rot + tri + k * 120 - 90)), cy + rad * 0.88 * math.sin(math.radians(rot + tri + k * 120 - 90))] for k in range(3)], np.int32)
        if prog > 0.6:
            cv2.polylines(m, [pts.reshape(-1, 1, 2)], True, 1.0, 4, cv2.LINE_AA)
    for k in range(36):
        a = math.radians(rot * 0.5 + k * 10)
        r0, r1 = rad * 0.9, rad * 0.99
        if k * 10 < A:
            cv2.line(m, (int(cx + r0 * math.cos(a)), int(cy + r0 * math.sin(a))), (int(cx + r1 * math.cos(a)), int(cy + r1 * math.sin(a))), 1.0, 2, cv2.LINE_AA)
    for k in range(6):
        a = math.radians(rot + k * 60)
        cv2.circle(m, (int(cx + rad * 0.45 * math.cos(a)), int(cy + rad * 0.45 * math.sin(a))), int(rad * 0.1), 1.0, 3, cv2.LINE_AA)
    return m


def look_fmab(c):
    rng = np.random.RandomState(c.i * 31 + 7)
    out = core(c, gw=0.3, levels=4, chroma=1.2, ls=1.3, lthick=1, lcol=(0.05, 0.08, 0.14), lalpha=0.9, lboil=1.2)
    out = grade(out, 0.95, 1.15, 0.35)
    out = split_tone(out, (-0.03, 0.01, 0.05), (-0.08, 0.03, 0.1), 1.0)
    out = bloom(out, 0.6, 22, 0.85, (0.5, 0.8, 1.0))
    out = vignette(out, 0.35)
    prog = min(1.0, (c.dc + 1) / 6.0)
    mk = alchemy_circle(c, c.i * 1.6, prog, 380)
    out = glow_add(out, mk * 0.75, (0.15, 0.5, 1.0), 0.0, 10, 1.6)
    out = np.clip(out + mk[..., None] * col((0.35, 0.75, 1.0)) * 0.5, 0, 1)
    m = np.zeros((H, W), np.float32)
    for _ in range(3):
        a = rng.uniform(0, 6.28)
        r0 = 380
        bolt(m, (W * 0.5 + r0 * math.cos(a), H * 0.52 + r0 * math.sin(a)), (W * 0.5 + (r0 + rng.uniform(150, 350)) * math.cos(a + 0.3), H * 0.52 + (r0 + rng.uniform(150, 350)) * math.sin(a + 0.3)), rng, 50, 5, 3)
    out = glow_add(out, m, (0.1, 0.35, 1.0), 0.8, 7, 1.2)
    sm = blur(draw_particles(c.i, 30, 99, (1, -3), (2, 4), None, 'dot', sway=30), 0.9)
    out = np.clip(out + sm[..., None] * col((0.4, 0.8, 1.0)) * 0.8, 0, 1)
    L = c.layer
    L.stamp('鋼の錬金術師', font(FM, 108, 1), (W - 105, 440), fill=(255, 215, 110, 255), stroke=7, stroke_fill=(50, 10, 0, 255), vertical=True,
            opacity=pop(c, c.ds - 2, 6))
    L.stamp('FULLMETAL ALCHEMIST', font(FM, 44, 1), (110, 160), fill=(255, 215, 110, 255), stroke=4, stroke_fill=(50, 10, 0, 255), anchor='lm')
    L.stamp('BROTHERHOOD', font(FM, 30, 1), (112, 204), fill=(255, 240, 200, 255), stroke=3, stroke_fill=(50, 10, 0, 255), anchor='lm')
    if c.ds < 12:
        L.stamp('バチバチ!!', font(FJ, 170), (W * 0.35, H * 0.82), fill=(255, 70, 30, 255), stroke=12, stroke_fill=(40, 5, 0, 255), angle=-5,
                scale=0.6 + 0.4 * ease_out(c.ds / 5.0), opacity=min(1, c.ds / 2.0) * (1 - max(0, (c.ds - 8) / 4.0)))
    return out


LOOKS = {
    'naruto1': lambda c: look_naruto(c, 1), 'naruto2': lambda c: look_naruto(c, 2), 'bebop': look_bebop,
    'champloo': look_champloo, 'aot1': lambda c: look_aot(c, 1), 'aot2': lambda c: look_aot(c, 2), 'mha': look_mha,
    'vinland': look_vinland, 'yyh': look_yyh, 'ds1': lambda c: look_ds(c, 1), 'ds2': lambda c: look_ds(c, 2),
    'shield': look_shield, 'jjk': look_jjk, 'fmab': look_fmab,
}
ACTION = {'naruto1', 'naruto2', 'aot1', 'aot2', 'mha', 'yyh', 'ds1', 'ds2', 'jjk', 'fmab'}


def impact(c, out):
    # impact frame: pure ink drawing with speed lines, negative on the strike frame
    fl = c.fl
    bw = smooth(0.40, 0.48, lum(fl))
    inkm = np.clip((1 - bw) * 0.9 + c.ln, 0, 1)
    sl = speed_lines(np.random.RandomState(c.i + 500), 220, 0.28, maxw=3)
    inkm = np.clip(inkm + sl * 0.9, 0, 1)
    img = np.repeat((1 - inkm)[..., None], 3, 2)
    return 1 - img


def finish(c, out):
    key = c.key
    d = c.dc
    if d == 0:
        if c.ds == 0 and key in ACTION:
            return np.clip(impact(c, out), 0, 1)
        if c.ds == 0:
            out = mix(out, col((1, 1, 1)), 0.55)
        else:
            out = mix(out, col((1, 1, 1)), 0.35)
    elif d == 1:
        out = mix(out, col((1, 1, 1)), 0.18)
    k = 1 + 0.05 * math.exp(-d / 2.6)
    if k > 1.002:
        out = zoom(out, k)
    return out


def render_frame(i, gan_dir=None):
    k, key, ds, dc = shot_info(i)
    c = Ctx()
    c.i, c.ds, c.dc, c.key, c.char = i, ds, dc, key, k + 1
    c.src = cv2.imread(f'{WORK}/src/{i:04d}.png').astype(np.float32) / 255
    c.gan = None
    gd = f'{WORK}/gan_{GAN_OF[key]}'
    p = f'{WORK}/gan_t/{GAN_OF[key]}/{i:04d}.png'
    if not os.path.exists(p):
        p = f'{gd}/{i:04d}.png'
    c.gan = cv2.imread(p).astype(np.float32) / 255
    c.brng = np.random.RandomState(i // 2 + 999)
    c.diff = None
    if os.environ.get('USE_DIFF', '1') == '1':
        j = i - (i % 2)
        if j < 0 or shot_info(j)[0] != k:
            j = i + 1
        pd = f'{WORK}/diff_t/{j:04d}.png'
        if not os.path.exists(pd):
            pd = f'{WORK}/diff/{j:04d}.png'
        if os.path.exists(pd):
            c.diff = cv2.resize(cv2.imread(pd), (W, H), interpolation=cv2.INTER_LANCZOS4).astype(np.float32) / 255
    c.layer = Layer()
    out = LOOKS[key](c)
    out = np.clip(out, 0, 1)
    out = c.layer.blend_onto(out)
    out = finish(c, out)
    return (np.clip(out, 0, 1) * 255).astype(np.uint8)
