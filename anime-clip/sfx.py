import numpy as np, wave, sys
from scipy import signal
import looks

SR = 44100
DUR = 14.4
rng = np.random.RandomState(7)
out = np.zeros((int(SR * DUR), 2), np.float32)


def band(x, lo, hi):
    b, a = signal.butter(2, [lo / (SR / 2), hi / (SR / 2)], 'band')
    return signal.lfilter(b, a, x)


def add(t0, sig, pan=0.0):
    i0 = int(t0 * SR)
    if i0 < 0:
        sig = sig[-i0:]
        i0 = 0
    n = min(len(sig), len(out) - i0)
    if n <= 0:
        return
    out[i0:i0 + n, 0] += sig[:n] * (1 - pan) * 0.5 * 2
    out[i0:i0 + n, 1] += sig[:n] * (1 + pan) * 0.5 * 2


def whoosh(length=0.22):
    n = int(SR * length)
    x = rng.randn(n)
    t = np.linspace(0, 1, n)
    hi = band(x, 1800, 7000) * (t ** 2.2)
    lo = band(x, 250, 900) * (np.sin(np.pi * t) ** 1.5)
    s = (hi * 0.8 + lo * 1.0) * 0.18
    return s.astype(np.float32)


def hit(big=True):
    n = int(SR * (0.45 if big else 0.16))
    t = np.arange(n) / SR
    f = 46 + 90 * np.exp(-t * 30)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * (7 if big else 22))
    tick = band(rng.randn(n), 900, 5000) * np.exp(-t * 60) * 0.5
    return ((body * (0.55 if big else 0.25) + tick * (0.5 if big else 0.4))).astype(np.float32)


starts = []
prev_key = None
for i in range(looks.N_FRAMES):
    k, key, ds, dc = looks.shot_info(i)
    if dc == 0 and i > 0:
        starts.append((i / looks.FPS, ds == 0))
for t, big in starts:
    add(t - 0.2, whoosh(0.2 if big else 0.14) * (1.0 if big else 0.7), pan=rng.uniform(-0.3, 0.3))
    add(t, hit(big))

pk = np.abs(out).max()
print('sfx peak', pk, 'cuts', len(starts))
out = np.clip(out / max(pk, 1e-6) * 0.9, -1, 1)
with wave.open('/tmp/an/sfx.wav', 'wb') as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes((out * 32767).astype(np.int16).tobytes())
