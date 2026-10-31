"""Look-dev 2: chicks in front of their mother on farm soil at golden hour.  blender -b -P tools/look_chick.py -- eevee|cycles out.png"""
import sys, math
sys.path.insert(0, __import__('os').path.dirname(__file__))
import bpy
import lib3d as L

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
ENGINE, OUT = (argv + ['eevee', '/tmp/ck/look_chick.png'])[:2]

sc = L.reset()
L.world('farm_field', 1.0, rot=math.radians(140))
L.sun((62, 0, 205), 4.0, (1, .86, .68), 1.5)
L.ground(4, 'farm_soil', scale=8, disp=.006)
c1, b1 = L.chick('ChickA', loc=(0, 0, 0), rot=-25)
c2, b2 = L.chick('ChickB', loc=(.11, .09, 0), rot=35, seed=4, color='#f2bf3a')
h = L.hen(loc=(-.05, .5, 0), rot=-40)
sc.frame_set(12)
L.scatter(L.A / 'models/grass_medium_01/grass_medium_01.blend', ['grass'], 140, (-1.5, 1.5, .25, 2.2), scale=(.25, .45), avoid=[(-.05, .5, .3)])
L.camera((.05, -.42, .055), (.03, .1, .055), lens=90, fstop=4.5, focus=.39)
L.render_settings(ENGINE, 1080, 128 if ENGINE == 'cycles' else 64)
sc.render.filepath = OUT
bpy.ops.render.render(write_still=True)
print('WROTE', OUT)
