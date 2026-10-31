import cv2, numpy as np, looks
from lib import *
tiles=[]
def contour(fl, s1=2.0, eps=-0.012, bands=4, bw=1.6):
    g=lum(fl)
    x=ink(g,s1,1.6,0.97,eps,40)
    gq=np.floor(blur(g,1.5)*bands).astype(np.float32)
    e=(np.abs(cv2.Sobel(gq,cv2.CV_32F,1,0))+np.abs(cv2.Sobel(gq,cv2.CV_32F,0,1)))>0
    e=blur(e.astype(np.float32),bw)
    e=smooth(0.2,0.6,e)
    return np.clip(np.maximum(x,e*0.9),0,1)
for f in (4,36):
    s=cv2.imread(f'/tmp/an/src/{f:04d}.png').astype(np.float32)/255
    fl=flatten(s,12,34,0.4)
    for (s1,eps,b) in [(2.0,-0.012,4),(2.4,-0.02,3),(1.6,-0.01,5)]:
        ln=contour(fl,s1,eps,b)
        ln=thicken(ln,1)
        print(f,s1,eps,ln.mean())
        tiles.append(cv2.resize((255*(1-ln)).astype(np.uint8),(640,360),interpolation=cv2.INTER_AREA))
rows=[np.hstack(tiles[:3]),np.hstack(tiles[3:])]
cv2.imwrite('/tmp/an/dbg.jpg',np.vstack(rows))
