"""Look-dev: hen + rooster base models under real sky light.  blender -b -P tools/lookdev.py -- [eevee|cycles] out.png"""
import bpy, sys, math
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[1]
A = ROOT / 'assets'
argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
ENGINE = argv[0] if argv else 'eevee'
OUT = argv[1] if len(argv) > 1 else '/tmp/ck/lookdev.png'

bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene


def append(blend, names):
    with bpy.data.libraries.load(str(blend), link=False) as (src, dst):
        want = [n for n in src.objects if n in names]
        dst.objects = list(want)
        dst.actions = list(src.actions)
    out = {}
    for n, o in zip(want, dst.objects):
        sc.collection.objects.link(o)
        out[n] = o
    return out, dst.actions


def texmat(name, img, normal=None):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    bs = nt.nodes['Principled BSDF']
    t = nt.nodes.new('ShaderNodeTexImage'); t.image = bpy.data.images.load(str(img))
    nt.links.new(t.outputs['Color'], bs.inputs['Base Color'])
    bs.inputs['Roughness'].default_value = .7
    if normal:
        n = nt.nodes.new('ShaderNodeTexImage'); n.image = bpy.data.images.load(str(normal)); n.image.colorspace_settings.name = 'Non-Color'
        nm = nt.nodes.new('ShaderNodeNormalMap'); nm.inputs['Strength'].default_value = .8
        nt.links.new(n.outputs['Color'], nm.inputs['Color']); nt.links.new(nm.outputs['Normal'], bs.inputs['Normal'])
    return m


hen, hacts = append(A / 'oga/chicken/chickenV2.blend', ['Armature', 'Chicken', 'Eyes'])
hm = texmat('HenSkin', A / 'oga/chicken/textures/UV-Texture.png', A / 'oga/chicken/textures/ChickenNorm.png')
for o in (hen['Chicken'],):
    o.data.materials.clear(); o.data.materials.append(hm)
hen['Armature'].scale = (.032,) * 3
hen['Armature'].location = (-.25, 0, 0)
hen['Armature'].rotation_euler = (0, 0, math.radians(-35))
act = next((a for a in hacts if a.name == 'Idle1'), None)
if act:
    hen['Armature'].animation_data_create(); hen['Armature'].animation_data.action = act

roo, racts = append(A / 'oga/rooster/rooster.blend', ['Armature', 'Rooster', 'Eyes'])
rm = texmat('RoosterSkin', A / 'oga/rooster/textures/Rooster-UV.png')
roo['Rooster'].data.materials.clear(); roo['Rooster'].data.materials.append(rm)
ra = roo['Armature']
ra.scale = (.038,) * 3
ra.location = (.3, .25, 0)
ra.rotation_euler = (0, 0, math.radians(200))
act = next((a for a in racts if a.name == 'Standing'), None)
if act:
    ra.animation_data_create(); ra.animation_data.action = act

for o in list(hen.values()) + list(roo.values()):
    if o.type == 'MESH':
        for p in o.data.polygons: p.use_smooth = True
        sub = o.modifiers.new('sub', 'SUBSURF'); sub.levels = 1; sub.render_levels = 2

# ground + sky
bpy.ops.mesh.primitive_plane_add(size=20)
g = bpy.context.object
gm = bpy.data.materials.new('Ground'); gm.use_nodes = True
gm.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (.32, .24, .15, 1)
gm.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value = .95
g.data.materials.append(gm)
w = bpy.data.worlds.new('W'); sc.world = w; w.use_nodes = True
env = w.node_tree.nodes.new('ShaderNodeTexEnvironment'); env.image = bpy.data.images.load(str(A / 'hdri/farm_field.hdr'))
w.node_tree.links.new(env.outputs['Color'], w.node_tree.nodes['Background'].inputs['Color'])
w.node_tree.nodes['Background'].inputs['Strength'].default_value = 1.0

cam = bpy.data.cameras.new('cam'); cam.lens = 85; cam.dof.use_dof = True; cam.dof.aperture_fstop = 4
co = bpy.data.objects.new('cam', cam); sc.collection.objects.link(co); sc.camera = co
co.location = (0, -3.2, .55)
co.rotation_euler = (math.radians(84), 0, 0)
cam.dof.focus_distance = 3.2

sc.frame_set(10)
sc.render.resolution_x = sc.render.resolution_y = 1080
sc.render.filepath = OUT
if ENGINE == 'cycles':
    sc.render.engine = 'CYCLES'
    sc.cycles.device = 'GPU'
    prefs = bpy.context.preferences.addons['cycles'].preferences
    prefs.compute_device_type = 'METAL'; prefs.get_devices()
    for d in prefs.devices: d.use = True
    sc.cycles.samples = 96; sc.cycles.use_denoising = True
else:
    sc.render.engine = 'BLENDER_EEVEE'
    sc.eevee.taa_render_samples = 64
    sc.eevee.use_raytracing = True
sc.view_settings.view_transform = 'AgX'
bpy.ops.render.render(write_still=True)
print('WROTE', OUT)
