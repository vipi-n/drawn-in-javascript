import cv2, numpy as np, os
from multiprocessing import Pool
import looks

DW, DH = 896, 504
SRC = '/tmp/an/src'
IN = '/tmp/an/diff'
OUT = '/tmp/an/diff_t'


def small(i):
    return cv2.cvtColor(cv2.resize(cv2.imread(f'{SRC}/{i:04d}.png'), (448, 252), interpolation=cv2.INTER_AREA), cv2.COLOR_BGR2GRAY)


XX, YY = np.meshgrid(np.arange(DW, dtype=np.float32), np.arange(DH, dtype=np.float32))


def work(j):
    k = looks.shot_info(j)[0]
    cur = cv2.imread(f'{IN}/{j:04d}.png').astype(np.float32)
    gi = small(j)
    acc = cur * 0.5
    wsum = 0.5
    for n in (j - 2, j + 2):
        if n < 0 or n >= looks.N_FRAMES or looks.shot_info(n)[0] != k or not os.path.exists(f'{IN}/{n:04d}.png'):
            continue
        gn = small(n)
        fl = cv2.calcOpticalFlowFarneback(gi, gn, None, 0.5, 4, 17, 3, 7, 1.5, 0)
        fl = cv2.resize(fl, (DW, DH), interpolation=cv2.INTER_LINEAR) * 2.0
        mx, my = XX + fl[..., 0], YY + fl[..., 1]
        wn = cv2.remap(cv2.imread(f'{IN}/{n:04d}.png').astype(np.float32), mx, my, cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE)
        sw = cv2.remap(cv2.resize(cv2.imread(f'{SRC}/{n:04d}.png'), (DW, DH)).astype(np.float32), mx, my, cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE)
        err = np.abs(sw - cv2.resize(cv2.imread(f'{SRC}/{j:04d}.png'), (DW, DH)).astype(np.float32)).mean(2)
        err = cv2.GaussianBlur(err, (0, 0), 4)
        w = 0.25 * np.exp(-(err / 16.0) ** 2)[..., None]
        acc += wn * w
        wsum = wsum + w
    os.makedirs(OUT, exist_ok=True)
    cv2.imwrite(f'{OUT}/{j:04d}.png', np.clip(acc / wsum, 0, 255).astype(np.uint8))


if __name__ == '__main__':
    with Pool(8) as p:
        p.map(work, [j for j in range(0, looks.N_FRAMES, 2) if os.path.exists(f'{IN}/{j:04d}.png')])
    print('done')
