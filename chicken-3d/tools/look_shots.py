"""Look-dev stills for the 3D film.  blender -b -P tools/look_shots.py -- yard|nest out.png [cycles|eevee]"""
import sys, os, math
sys.path.insert(0, os.path.dirname(__file__))
import bpy
import lib3d as L

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
SHOT, OUT, ENGINE = (argv + ['yard', '/tmp/ck/shot.png', 'cycles'])[:3]
sc = L.reset()

if SHOT == 'yard':
    L.world('farm_field', .9, rot=math.radians(150))
    L.sun((66, 0, 215), 4.5, (1, .84, .64), 1.2)
    L.ground(8, 'farm_soil', scale=10, disp=.006)
    h = L.hen(loc=(-.02, .32, 0), rot=-55, action='Eating')
    sc.frame_set(18)
    L.chick('ChickA', loc=(.02, -.02, 0), rot=-20)
    L.chick('ChickB', loc=(.16, .1, 0), rot=40, seed=4, color='#f3b828')
    L.chick('ChickC', loc=(-.17, .12, 0), rot=-70, seed=7, color='#e8a52a', tip='#f9d27a')
    r = L.rooster(loc=(.45, 1.1, 0), rot=-150)
    L.scatter(L.A / 'models/grass_medium_01/grass_medium_01.blend', ['grass'], 260, (-2.5, 2.5, .35, 4), scale=(.3, .55), avoid=[(-.02, .32, .3), (.45, 1.1, .35)])
    L.scatter(L.A / 'models/dandelion_01/dandelion_01.blend', ['dandelion'], 25, (-2, 2, .5, 3), seed=9, scale=(.5, .8))
    L.camera((.12, -.95, .12), (.06, .3, .17), lens=50, fstop=4.5, focus=.95)
elif SHOT == 'nest':
    L.world('farm_field', .12)
    # coop wall of weathered planks + warm window light
    bpy.ops.mesh.primitive_plane_add(size=2, location=(0, .45, .6), rotation=(math.radians(90), 0, 0))
    wall = bpy.context.object; wall.data.materials.append(L.pbr('Planks', L.A / 'tex/brown_planks_05', 2.5))
    L.ground(4, 'farm_soil', scale=10, disp=.004)
    lt = bpy.data.lights.new('Window', 'AREA'); lt.energy = 70; lt.size = .3; lt.color = (1, .8, .55)
    lo = bpy.data.objects.new('Window', lt); L.link(lo); lo.location = (-.7, -.15, .55); lo.rotation_euler = (math.radians(65), 0, math.radians(-75))
    fill = bpy.data.lights.new('Fill', 'AREA'); fill.energy = 5; fill.size = 1.5; fill.color = (.75, .85, 1)
    fo = bpy.data.objects.new('Fill', fill); L.link(fo); fo.location = (.7, -.6, .5); fo.rotation_euler = (math.radians(60), 0, math.radians(50))
    L.nest(loc=(0, 0, 0), r=.13)
    for i, (x, y, rz, ry) in enumerate([(-.03, .02, .3, 1.45), (.035, -.02, -.4, 1.5), (.01, .05, 1.2, 1.4), (-.045, -.035, 2.1, 1.55)]):
        L.egg(f'Egg{i}', loc=(x, y, .036), rot=(0, ry, rz), seed=i * 3)
    L.camera((.0, -.42, .26), (0, .0, .04), lens=70, fstop=3.5)
L.render_settings(ENGINE, 1080, 96)
sc.render.filepath = OUT
bpy.ops.render.render(write_still=True)
print('WROTE', OUT)
