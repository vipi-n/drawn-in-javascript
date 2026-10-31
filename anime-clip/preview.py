import sys, time, cv2, numpy as np
import looks
out=sys.argv[1]; fr=[int(x) for x in sys.argv[2:]]
tiles=[]
for f in fr:
    t=time.time(); im=looks.render_frame(f); print(f,looks.shot_info(f)[1],round(time.time()-t,2),'s',flush=True)
    tiles.append(cv2.resize(im,(960,540),interpolation=cv2.INTER_AREA))
cols=2 if len(tiles)>1 else 1
while len(tiles)%cols: tiles.append(np.zeros_like(tiles[0]))
rows=[np.hstack(tiles[i:i+cols]) for i in range(0,len(tiles),cols)]
cv2.imwrite(out,np.vstack(rows),[cv2.IMWRITE_JPEG_QUALITY,90])
