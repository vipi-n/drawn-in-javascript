import cv2, os, sys
from multiprocessing import Pool
import looks

OUT = '/tmp/an/out'


def work(i):
    im = looks.render_frame(i)
    cv2.imwrite(f'{OUT}/{i:04d}.png', im, [cv2.IMWRITE_PNG_COMPRESSION, 1])
    return i


if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    frames = [int(x) for x in sys.argv[1:]] or list(range(looks.N_FRAMES))
    with Pool(10) as p:
        for n, _ in enumerate(p.imap_unordered(work, frames)):
            if n % 40 == 0:
                print(n, flush=True)
    print('done')
