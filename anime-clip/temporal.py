import cv2, numpy as np, os, sys
from multiprocessing import Pool
import looks

WORK = '/tmp/an'
SW, SH = 480, 270


def small(img):
    return cv2.cvtColor(cv2.resize(img, (SW, SH), interpolation=cv2.INTER_AREA), cv2.COLOR_BGR2GRAY)


def work(i):
    k, key, ds, dc = looks.shot_info(i)
    m = looks.GAN_OF[key]
    cur = cv2.imread(f'{WORK}/gan_{m}/{i:04d}.png').astype(np.float32)
    srci = cv2.imread(f'{WORK}/src/{i:04d}.png')
    gi = small(srci)
    acc = cur * 0.5
    wsum = 0.5
    for j in (i - 1, i + 1):
        if j < 0 or j >= looks.N_FRAMES or looks.shot_info(j)[0] != k:
            continue
        sj = cv2.imread(f'{WORK}/src/{j:04d}.png')
        gj = small(sj)
        fl = cv2.calcOpticalFlowFarneback(gi, gj, None, 0.5, 4, 21, 3, 7, 1.5, 0)
        flf = cv2.resize(fl, (looks.W, looks.H), interpolation=cv2.INTER_LINEAR) * (looks.W / SW)
        mx = looks.XX + flf[..., 0]
        my = looks.YY + flf[..., 1]
        wj = cv2.remap(cv2.imread(f'{WORK}/gan_{m}/{j:04d}.png').astype(np.float32), mx, my, cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE)
        sw = cv2.remap(sj.astype(np.float32), mx, my, cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE)
        err = np.abs(sw - srci.astype(np.float32)).mean(2)
        err = cv2.GaussianBlur(err, (0, 0), 6)
        wgt = 0.25 * np.exp(-(err / 14.0) ** 2)[..., None]
        acc += wj * wgt
        wsum = wsum + wgt
    out = acc / wsum
    os.makedirs(f'{WORK}/gan_t/{m}', exist_ok=True)
    cv2.imwrite(f'{WORK}/gan_t/{m}/{i:04d}.png', np.clip(out, 0, 255).astype(np.uint8))
    return i


if __name__ == '__main__':
    with Pool(8) as p:
        for r in p.imap_unordered(work, range(looks.N_FRAMES)):
            pass
    print('done')
