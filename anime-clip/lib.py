import cv2, numpy as np, math, os
from PIL import Image, ImageDraw, ImageFont

W, H = 1920, 1080
WORK = '/tmp/an'
cv2.setNumThreads(2)

YY, XX = np.mgrid[0:H, 0:W].astype(np.float32)
CX, CY = W / 2, H / 2
R = np.sqrt((XX - CX) ** 2 + (YY - CY) ** 2) / math.sqrt(CX ** 2 + CY ** 2)
TH = np.arctan2(YY - CY, XX - CX)


def smooth(a, b, x):
    t = np.clip((x - a) / (b - a + 1e-9), 0, 1)
    return t * t * (3 - 2 * t)


def lum(img):
    return img[..., 0] * 0.114 + img[..., 1] * 0.587 + img[..., 2] * 0.299


def blur(a, s):
    return cv2.GaussianBlur(a, (0, 0), s)


def sat(img, s):
    g = lum(img)[..., None]
    return np.clip(g + (img - g) * s, 0, 1)


def gamma(img, g):
    return np.power(np.clip(img, 0, 1), g)


def scurve(img, a):
    x = np.clip(img, 0, 1)
    return x + a * (x * x * (3 - 2 * x) - x)


def split_tone(img, sh, hi, amt=1.0):
    l = lum(img)[..., None]
    off = np.array(sh, np.float32) * (1 - l) + np.array(hi, np.float32) * l
    return np.clip(img + amt * off, 0, 1)


def grade(img, g=1.0, s=1.0, c=0.0, lift=0.0, gain=1.0):
    x = np.clip(img * gain + lift, 0, 1)
    x = gamma(x, g)
    x = sat(x, s)
    return scurve(x, c) if c else x


def bloom(img, thr, s, amt, col=None):
    hi = np.clip(img - thr, 0, 1) / (1 - thr)
    b = blur(hi, s)
    if col is not None:
        b = b * np.array(col, np.float32)
    return 1 - (1 - img) * (1 - np.clip(b * amt, 0, 1))


def vignette(img, amt, a=0.35, b=1.15):
    v = 1 - amt * smooth(a, b, R)
    return img * v[..., None]


def grain(img, amt, rng, size=1, mono=True):
    if size > 1:
        n = rng.standard_normal((H // size + 1, W // size + 1)).astype(np.float32)
        n = cv2.resize(n, (W, H), interpolation=cv2.INTER_LINEAR)
    else:
        n = rng.standard_normal((H, W)).astype(np.float32)
    if mono:
        return np.clip(img + amt * n[..., None], 0, 1)
    n3 = rng.standard_normal((H, W, 3)).astype(np.float32)
    return np.clip(img + amt * n3, 0, 1)


def shift(img, dx, dy):
    M = np.float32([[1, 0, dx], [0, 1, dy]])
    return cv2.warpAffine(img, M, (W, H), borderMode=cv2.BORDER_REPLICATE)


def ca(img, px):
    out = img.copy()
    out[..., 0] = shift(img[..., 0], px, 0)
    out[..., 2] = shift(img[..., 2], -px, 0)
    return out


def zoom(img, s, cx=CX, cy=CY, rot=0.0):
    M = cv2.getRotationMatrix2D((cx, cy), rot, s)
    return cv2.warpAffine(img, M, (W, H), borderMode=cv2.BORDER_REPLICATE)


def mix(a, b, t):
    if np.ndim(t) == 2:
        t = t[..., None]
    return a * (1 - t) + b * t


def col(c):
    return np.array(c, np.float32)


def flatten(img, sp=9, sr=26, scale=0.5):
    u8 = (np.clip(img, 0, 1) * 255).astype(np.uint8)
    sm = cv2.resize(u8, None, fx=scale, fy=scale, interpolation=cv2.INTER_AREA)
    sm = cv2.pyrMeanShiftFiltering(sm, sp, sr, maxLevel=1)
    return cv2.resize(sm, (W, H), interpolation=cv2.INTER_CUBIC).astype(np.float32) / 255


def quant(img, n, soft=0.12, chroma=1.0):
    lab = cv2.cvtColor(np.clip(img, 0, 1), cv2.COLOR_BGR2Lab)
    l = lab[..., 0] / 100.0 * n
    f = np.floor(l - 0.5)
    fr = l - 0.5 - f
    t = smooth(0.5 - soft, 0.5 + soft, fr)
    lq = (f + t + 0.5) / n * 100.0
    lab[..., 0] = np.clip(lq, 0, 100)
    lab[..., 1:] = lab[..., 1:] * chroma
    return np.clip(cv2.cvtColor(lab, cv2.COLOR_Lab2BGR), 0, 1)


def ink(gray, s1=1.3, k=1.7, tau=0.97, eps=0.0, phi=18.0):
    g1 = blur(gray, s1)
    g2 = blur(gray, s1 * k)
    d = g1 - tau * g2
    e = np.where(d >= eps, 1.0, 1 + np.tanh(phi * (d - eps)))
    return np.clip(1 - e, 0, 1).astype(np.float32)


def thicken(m, r):
    if r <= 0:
        return m
    k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * r + 1, 2 * r + 1))
    return cv2.dilate(m, k)


def boil(m, rng, amp=1.5, scale=40):
    nx = cv2.resize(rng.standard_normal((H // scale + 2, W // scale + 2)).astype(np.float32), (W, H), interpolation=cv2.INTER_CUBIC)
    ny = cv2.resize(rng.standard_normal((H // scale + 2, W // scale + 2)).astype(np.float32), (W, H), interpolation=cv2.INTER_CUBIC)
    return cv2.remap(m, XX + nx * amp, YY + ny * amp, cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE)


def halftone(tone, cell=12, angle=45, soft=0.07):
    a = math.radians(angle)
    u = (XX * math.cos(a) + YY * math.sin(a)) / cell
    v = (-XX * math.sin(a) + YY * math.cos(a)) / cell
    fu = u - np.round(u)
    fv = v - np.round(v)
    d = np.sqrt(fu * fu + fv * fv)
    r = np.sqrt(np.clip(tone, 0, 1)) * 0.72
    return np.clip((r - d) / soft + 0.5, 0, 1).astype(np.float32)


def hatch(tone, thr, angle=35, spacing=9, width=0.22):
    a = math.radians(angle)
    u = (XX * math.cos(a) + YY * math.sin(a)) / spacing
    line = 1 - smooth(width * 0.5, width * 0.5 + 0.08, np.abs((u % 1.0) - 0.5))
    return (line * smooth(thr, thr - 0.12, tone)).astype(np.float32)


def speed_lines(rng, n=170, inner=0.4, maxw=3, N=1800, cx=CX, cy=CY, power=1.0):
    arr = np.zeros(N, np.float32)
    for _ in range(n):
        c = rng.randint(0, N)
        w = rng.randint(1, maxw + 1)
        arr[(c + np.arange(w)) % N] = rng.uniform(0.6, 1.0)
    th = np.arctan2(YY - cy, XX - cx)
    idx = ((th + math.pi) / (2 * math.pi) * N).astype(np.int32) % N
    r = np.sqrt((XX - cx) ** 2 + (YY - cy) ** 2) / math.sqrt(CX ** 2 + CY ** 2)
    return arr[idx] * smooth(inner, inner + 0.3, r) ** power


def bolt(mask, p0, p1, rng, disp=60, depth=6, th=3, branch=0.25):
    pts = [np.array(p0, np.float32), np.array(p1, np.float32)]
    d = disp
    for _ in range(depth):
        new = [pts[0]]
        for a, b in zip(pts[:-1], pts[1:]):
            m = (a + b) / 2
            v = b - a
            nrm = np.array([-v[1], v[0]], np.float32)
            nrm /= (np.linalg.norm(nrm) + 1e-6)
            m = m + nrm * rng.uniform(-d, d)
            new += [m, b]
        pts = new
        d *= 0.55
    arr = np.array(pts, np.int32).reshape(-1, 1, 2)
    cv2.polylines(mask, [arr], False, 1.0, th, cv2.LINE_AA)
    if branch and depth > 2 and rng.rand() < 0.9:
        for _ in range(2):
            k = rng.randint(len(pts) // 4, 3 * len(pts) // 4)
            ang = rng.uniform(-0.9, 0.9)
            v = pts[-1] - pts[0]
            L = np.linalg.norm(v) * rng.uniform(0.15, 0.35)
            dirv = np.array([v[0] * math.cos(ang) - v[1] * math.sin(ang), v[0] * math.sin(ang) + v[1] * math.cos(ang)])
            dirv = dirv / (np.linalg.norm(dirv) + 1e-6) * L
            bolt(mask, pts[k], pts[k] + dirv, rng, disp * 0.4, depth - 2, max(1, th - 1), 0)


def glow_add(img, mask, color, core=1.0, s=8, amt=1.4):
    m = np.clip(mask, 0, 1)
    g = blur(m, s) * amt + blur(m, s * 0.35) * 0.8
    c = np.array(color, np.float32)
    out = img + g[..., None] * c
    out = out + (m * core)[..., None] * np.array([1, 1, 1], np.float32) * 0.9
    return np.clip(out, 0, 1)


def draw_particles(t, n, seed, vel, size, color, shape='dot', sway=30, wrap=True, alpha_pulse=True):
    rs = np.random.RandomState(seed)
    m = np.zeros((H, W), np.float32)
    px = rs.uniform(0, W, n)
    py = rs.uniform(0, H, n)
    sp = rs.uniform(0.6, 1.4, n)
    ph = rs.uniform(0, 6.28, n)
    sz = rs.uniform(size[0], size[1], n)
    for k in range(n):
        x = (px[k] + vel[0] * t * sp[k] + math.sin(t * 0.12 + ph[k]) * sway) % W
        y = (py[k] + vel[1] * t * sp[k]) % H
        a = 0.6 + 0.4 * math.sin(t * 0.3 + ph[k]) if alpha_pulse else 1.0
        if shape == 'dot':
            cv2.circle(m, (int(x), int(y)), max(1, int(sz[k])), a, -1, cv2.LINE_AA)
        elif shape == 'star':
            s = sz[k]
            pts = np.array([[x, y - s * 2], [x + s * .4, y - s * .4], [x + s * 2, y], [x + s * .4, y + s * .4], [x, y + s * 2], [x - s * .4, y + s * .4], [x - s * 2, y], [x - s * .4, y - s * .4]], np.int32)
            cv2.fillPoly(m, [pts], a, cv2.LINE_AA)
        elif shape == 'leaf':
            ang = t * 0.1 * sp[k] + ph[k]
            s = sz[k]
            cv2.ellipse(m, (int(x), int(y)), (int(s * 2.2), int(s)), math.degrees(ang), 0, 360, a, -1, cv2.LINE_AA)
    return m


# ---------- text ----------
FJ = '/System/Library/Fonts/ヒラギノ角ゴシック W8.ttc'
FJ6 = '/System/Library/Fonts/ヒラギノ角ゴシック W6.ttc'
FM = '/System/Library/Fonts/ヒラギノ明朝 ProN.ttc'
FI = '/System/Library/Fonts/Supplemental/Impact.ttf'
FB = '/System/Library/Fonts/Supplemental/Arial Black.ttf'
FRUNE = '/System/Library/Fonts/Apple Symbols.ttf'
_fc = {}


def font(path, size, idx=0):
    k = (path, size, idx)
    if k not in _fc:
        _fc[k] = ImageFont.truetype(path, size, index=idx)
    return _fc[k]


class Layer:
    def __init__(self):
        self.im = Image.new('RGBA', (W, H), (0, 0, 0, 0))

    def stamp(self, text, fnt, pos, fill=(255, 255, 255, 255), stroke=0, stroke_fill=(0, 0, 0, 255),
              angle=0.0, shear=0.0, scale=1.0, anchor='mm', vertical=False, spacing=1.0, opacity=1.0, shadow=None):
        if vertical:
            chars = list(text)
            lh = int(fnt.size * 1.08 * spacing)
            tw = fnt.size + stroke * 2 + 8
            tmp = Image.new('RGBA', (tw + 20, lh * len(chars) + 20), (0, 0, 0, 0))
            d = ImageDraw.Draw(tmp)
            for k, ch in enumerate(chars):
                d.text((tmp.width / 2, 10 + lh * k + lh / 2), ch, font=fnt, fill=fill, stroke_width=stroke, stroke_fill=stroke_fill, anchor='mm')
        else:
            bb = fnt.getbbox(text, stroke_width=stroke)
            w, h = bb[2] - bb[0] + 40, bb[3] - bb[1] + 40
            tmp = Image.new('RGBA', (w, h), (0, 0, 0, 0))
            d = ImageDraw.Draw(tmp)
            d.text((20 - bb[0], h / 2), text, font=fnt, fill=fill, stroke_width=stroke, stroke_fill=stroke_fill, anchor='lm')
        if shadow:
            sh = Image.new('RGBA', tmp.size, (0, 0, 0, 0))
            alpha = tmp.split()[3].point(lambda v: int(v * shadow[2]))
            sh.paste((*shadow[3], 255), (0, 0), alpha)
            canvas = Image.new('RGBA', tmp.size, (0, 0, 0, 0))
            canvas.alpha_composite(sh, (shadow[0], shadow[1]))
            canvas.alpha_composite(tmp)
            tmp = canvas
        if scale != 1.0:
            tmp = tmp.resize((max(1, int(tmp.width * scale)), max(1, int(tmp.height * scale))), Image.BICUBIC)
        if shear:
            w, h = tmp.size
            ext = int(abs(shear) * h)
            tmp = tmp.transform((w + ext, h), Image.AFFINE, (1, shear, -ext if shear > 0 else 0, 0, 1, 0), Image.BICUBIC)
        if angle:
            tmp = tmp.rotate(angle, expand=True, resample=Image.BICUBIC)
        if opacity < 1:
            a = tmp.split()[3].point(lambda v: int(v * opacity))
            tmp.putalpha(a)
        x, y = pos
        if anchor == 'mm':
            x -= tmp.width / 2
            y -= tmp.height / 2
        elif anchor == 'lm':
            y -= tmp.height / 2
        elif anchor == 'rm':
            x -= tmp.width
            y -= tmp.height / 2
        elif anchor == 'lb':
            y -= tmp.height
        elif anchor == 'rb':
            x -= tmp.width
            y -= tmp.height
        self._paste_clip(tmp, int(x), int(y))

    def _paste_clip(self, tmp, x, y):
        big = Image.new('RGBA', (W, H), (0, 0, 0, 0))
        big.paste(tmp, (x, y))
        self.im = Image.alpha_composite(self.im, big)

    def rect(self, xy, fill=None, outline=None, width=1, radius=0):
        d = ImageDraw.Draw(self.im)
        if radius:
            d.rounded_rectangle(xy, radius, fill=fill, outline=outline, width=width)
        else:
            d.rectangle(xy, fill=fill, outline=outline, width=width)

    def poly(self, pts, fill=None, outline=None, width=1):
        ImageDraw.Draw(self.im).polygon(pts, fill=fill, outline=outline, width=width)

    def line(self, pts, fill, width=1):
        ImageDraw.Draw(self.im).line(pts, fill=fill, width=width)

    def blend_onto(self, img):
        a = np.asarray(self.im, dtype=np.float32) / 255.0
        al = a[..., 3:4]
        rgb = a[..., [2, 1, 0]]
        return img * (1 - al) + rgb * al


def compose_text(img, layer):
    return layer.blend_onto(img)
