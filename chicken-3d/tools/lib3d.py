"""Shared Blender helpers for the 3D chicken film (scene setup, materials, assets, procedural chick)."""
import bpy, math, random
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[1]
A = ROOT / 'assets'


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    return bpy.context.scene


def link(o, coll=None):
    (coll or bpy.context.scene.collection).objects.link(o)
    return o


def mat(name, color=(.8, .8, .8), rough=.5, **kw):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*color, 1)
    b.inputs['Roughness'].default_value = rough
    for k, v in kw.items():
        key = {'sss': 'Subsurface Weight', 'sss_r': 'Subsurface Radius', 'coat': 'Coat Weight', 'sheen': 'Sheen Weight',
               'spec': 'Specular IOR Level', 'trans': 'Transmission Weight', 'ior': 'IOR', 'alpha': 'Alpha', 'emit': 'Emission Color', 'emit_s': 'Emission Strength'}.get(k, k)
        inp = b.inputs[key]
        inp.default_value = (*v, 1) if key == 'Emission Color' else v
    return m


def hexc(h):
    h = h.lstrip('#')
    srgb = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple(c / 12.92 if c <= .04045 else ((c + .055) / 1.055) ** 2.4 for c in srgb)


def pbr(name, folder, scale=1.0, disp=0.0):
    """Poly Haven texture set (Diffuse/nor_gl/Rough[/Displacement]) as a Principled material."""
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    b = nt.nodes['Principled BSDF']
    tc = nt.nodes.new('ShaderNodeTexCoord'); mp = nt.nodes.new('ShaderNodeMapping'); mp.inputs['Scale'].default_value = (scale,) * 3
    nt.links.new(tc.outputs['UV'], mp.inputs['Vector'])

    def img(file, non_color=False):
        t = nt.nodes.new('ShaderNodeTexImage'); t.image = bpy.data.images.load(str(folder / file), check_existing=True)
        if non_color: t.image.colorspace_settings.name = 'Non-Color'
        nt.links.new(mp.outputs['Vector'], t.inputs['Vector'])
        return t
    nt.links.new(img('Diffuse.jpg').outputs['Color'], b.inputs['Base Color'])
    nt.links.new(img('Rough.jpg', True).outputs['Color'], b.inputs['Roughness'])
    nm = nt.nodes.new('ShaderNodeNormalMap')
    nt.links.new(img('nor_gl.jpg', True).outputs['Color'], nm.inputs['Color'])
    nt.links.new(nm.outputs['Normal'], b.inputs['Normal'])
    if disp and (folder / 'Displacement.jpg').exists():
        d = nt.nodes.new('ShaderNodeDisplacement'); d.inputs['Scale'].default_value = disp
        nt.links.new(img('Displacement.jpg', True).outputs['Color'], d.inputs['Height'])
        nt.links.new(d.outputs['Displacement'], nt.nodes['Material Output'].inputs['Displacement'])
    return m


def world(hdri='farm_field', strength=1.0, rot=0.0):
    sc = bpy.context.scene
    w = bpy.data.worlds.new('World'); sc.world = w; w.use_nodes = True
    nt = w.node_tree
    env = nt.nodes.new('ShaderNodeTexEnvironment'); env.image = bpy.data.images.load(str(A / 'hdri' / f'{hdri}.hdr'))
    mp = nt.nodes.new('ShaderNodeMapping'); tc = nt.nodes.new('ShaderNodeTexCoord')
    mp.inputs['Rotation'].default_value = (0, 0, rot)
    nt.links.new(tc.outputs['Generated'], mp.inputs['Vector']); nt.links.new(mp.outputs['Vector'], env.inputs['Vector'])
    nt.links.new(env.outputs['Color'], nt.nodes['Background'].inputs['Color'])
    nt.nodes['Background'].inputs['Strength'].default_value = strength
    return w


def sun(rot=(50, 0, 30), energy=3.0, color=(1, .92, .8), angle=2.0):
    l = bpy.data.lights.new('Sun', 'SUN'); l.energy = energy; l.color = color; l.angle = math.radians(angle)
    o = link(bpy.data.objects.new('Sun', l)); o.rotation_euler = [math.radians(a) for a in rot]
    return o


def camera(loc, target, lens=85, fstop=2.8, focus=None):
    sc = bpy.context.scene
    c = bpy.data.cameras.new('Cam'); c.lens = lens; c.sensor_width = 36
    c.dof.use_dof = fstop is not None
    if fstop: c.dof.aperture_fstop = fstop
    o = link(bpy.data.objects.new('Cam', c)); sc.camera = o
    o.location = loc
    d = Vector(target) - Vector(loc)
    o.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
    c.dof.focus_distance = focus or d.length
    return o


def render_settings(engine='eevee', size=1080, samples=None):
    sc = bpy.context.scene
    sc.render.resolution_x = sc.render.resolution_y = size
    sc.view_settings.view_transform = 'Khronos PBR Neutral'
    sc.view_settings.look = 'None'
    if engine == 'cycles':
        sc.render.engine = 'CYCLES'
        sc.cycles.device = 'GPU'
        p = bpy.context.preferences.addons['cycles'].preferences
        p.compute_device_type = 'METAL'; p.get_devices()
        for d in p.devices: d.use = True
        sc.cycles.samples = samples or 128; sc.cycles.use_denoising = True
        sc.cycles.use_adaptive_sampling = True
    else:
        sc.render.engine = 'BLENDER_EEVEE'
        sc.eevee.taa_render_samples = samples or 64
        sc.eevee.use_raytracing = True
        sc.eevee.use_shadows = True
    sc.render.film_transparent = False


def ground(size=6, tex='farm_soil', scale=6, sub=7, disp=.012):
    bpy.ops.mesh.primitive_plane_add(size=size)
    g = bpy.context.object; g.name = 'Ground'
    m = pbr('Soil', A / 'tex' / tex, 1.0)
    g.data.materials.append(m)
    if disp:
        s = g.modifiers.new('sub', 'SUBSURF'); s.subdivision_type = 'SIMPLE'; s.levels = s.render_levels = sub
        t = bpy.data.textures.new('soilDisp', 'IMAGE'); t.image = bpy.data.images.load(str(A / 'tex' / tex / 'Displacement.jpg'), check_existing=True)
        t.image.colorspace_settings.name = 'Non-Color'
        d = g.modifiers.new('disp', 'DISPLACE'); d.texture = t; d.texture_coords = 'UV'; d.strength = disp; d.mid_level = .5
        g.data.uv_layers.active.data.foreach_set('uv', [c * scale for c in _uvs(g)])
    return g


def _uvs(o):
    buf = [0.0] * (len(o.data.loops) * 2)
    o.data.uv_layers.active.data.foreach_get('uv', buf)
    return buf


# ---------------------------------------------------------------- hen / rooster (CC0 base models by Cestmir Dammer)
def _append(blend, names):
    with bpy.data.libraries.load(str(blend), link=False) as (src, dst):
        want = [n for n in src.objects if n in names]
        dst.objects = list(want)
        dst.actions = list(src.actions)
    out = {}
    for n, o in zip(want, dst.objects):
        link(o); out[n] = o
    return out, {a.name: a for a in dst.actions}


def _skin(name, diffuse, normal=None, rough=.75, sheen=.35):
    m = bpy.data.materials.new(name); m.use_nodes = True
    nt = m.node_tree; b = nt.nodes['Principled BSDF']
    t = nt.nodes.new('ShaderNodeTexImage'); t.image = bpy.data.images.load(str(diffuse), check_existing=True)
    nt.links.new(t.outputs['Color'], b.inputs['Base Color'])
    b.inputs['Roughness'].default_value = rough
    b.inputs['Sheen Weight'].default_value = sheen
    b.inputs['Sheen Roughness'].default_value = .4
    if normal:
        n = nt.nodes.new('ShaderNodeTexImage'); n.image = bpy.data.images.load(str(normal), check_existing=True); n.image.colorspace_settings.name = 'Non-Color'
        nm = nt.nodes.new('ShaderNodeNormalMap'); nm.inputs['Strength'].default_value = 1.0
        nt.links.new(n.outputs['Color'], nm.inputs['Color']); nt.links.new(nm.outputs['Normal'], b.inputs['Normal'])
    # feather micro-relief so the surface is never plastic-smooth
    bump = nt.nodes.new('ShaderNodeBump'); bump.inputs['Strength'].default_value = .25; bump.inputs['Distance'].default_value = .02
    vn = nt.nodes.new('ShaderNodeTexWave'); vn.wave_type = 'BANDS'; vn.inputs['Scale'].default_value = 140; vn.inputs['Distortion'].default_value = 6
    nt.links.new(vn.outputs['Fac'], bump.inputs['Height'])
    if normal: nt.links.new(nm.outputs['Normal'], bump.inputs['Normal'])
    nt.links.new(bump.outputs['Normal'], b.inputs['Normal'])
    return m


def hen(loc=(0, 0, 0), rot=0, scale=.032, action='Idle1', frame=1):
    o, acts = _append(A / 'oga/chicken/chickenV2.blend', ['Armature', 'Chicken', 'Eyes'])
    m = _skin('HenSkin', A / 'oga/chicken/textures/UV-Texture.png', A / 'oga/chicken/textures/ChickenNorm.png')
    o['Chicken'].data.materials.clear(); o['Chicken'].data.materials.append(m)
    o['Eyes'].data.materials.clear(); o['Eyes'].data.materials.append(mat('HenEye', hexc('#c88a2a'), .08, coat=1.0))
    return _place(o, acts, loc, rot, scale, action)


def rooster(loc=(0, 0, 0), rot=0, scale=.038, action='Standing'):
    o, acts = _append(A / 'oga/rooster/rooster.blend', ['Armature', 'Rooster', 'Eyes'])
    m = _skin('RoosterSkin', A / 'oga/rooster/textures/Rooster-UV.png', None, rough=.55, sheen=.5)
    o['Rooster'].data.materials.clear(); o['Rooster'].data.materials.append(m)
    o['Eyes'].data.materials.clear(); o['Eyes'].data.materials.append(mat('RooEye', hexc('#d08a24'), .08, coat=1.0))
    return _place(o, acts, loc, rot, scale, action)


def _place(o, acts, loc, rot, scale, action):
    arm = o['Armature']
    arm.scale = (scale,) * 3; arm.location = loc; arm.rotation_euler = (0, 0, math.radians(rot))
    arm.animation_data_create()
    if action in acts: arm.animation_data.action = acts[action]
    for ob in o.values():
        if ob.type == 'MESH':
            for p in ob.data.polygons: p.use_smooth = True
            s = ob.modifiers.new('sub', 'SUBSURF'); s.levels = 1; s.render_levels = 2
    o['actions'] = acts
    return o


# ---------------------------------------------------------------- procedural chick (metaball body + particle down)
def chick(name='Chick', loc=(0, 0, 0), rot=0, s=1.0, color='#eba21e', tip='#ffd06a', root='#b0520a', wet=0.0, seed=1):
    sc = bpy.context.scene
    mb = bpy.data.metaballs.new(name + 'MB'); mb.resolution = .0016; mb.render_resolution = .0016; mb.threshold = .6
    mo = link(bpy.data.objects.new(name, mb))
    def el(co, r, sx=1, sy=1, sz=1, stiff=2.0):
        # visible surface of a lone element sits at ~0.575 r (threshold .6, stiffness 2); sizes are scale factors
        e = mb.elements.new(); e.type = 'ELLIPSOID'; e.co = co; e.radius = r; e.size_x = sx; e.size_y = sy; e.size_z = sz; e.stiffness = stiff
    el((0, .004, .040), .045, .92, 1.18, 1.0)      # body
    el((0, -.022, .078), .032, 1.0, 1.0, 1.0)      # head
    el((0, .036, .046), .015, .9, 1.0, .9)         # tail fluff
    for sx in (-1, 1): el((sx * .022, .006, .047), .017, .8, 1.4, 1.0)  # wing nubs
    bpy.context.view_layer.objects.active = mo; mo.select_set(True)
    bpy.ops.object.convert(target='MESH')
    body = bpy.context.object; body.name = name
    rm = body.modifiers.new('remesh', 'REMESH'); rm.mode = 'VOXEL'; rm.voxel_size = .0011
    bpy.ops.object.modifier_apply(modifier='remesh')
    for p in body.data.polygons: p.use_smooth = True
    # eyes and beak sit exactly on the head surface (ray cast from the head centre)
    head = Vector((0, -.022, .080))
    def surf(d):
        d = Vector(d).normalized(); ok, p, n, i = body.ray_cast(head, d, distance=.2)
        return (p if ok else head + d * .022), d
    eyeS = [surf((sx * .66, -.6, .32)) for sx in (-1, 1)]
    eyes = [p - d * .0016 for p, d in eyeS]
    beakP, beakD = surf((0, -1, -.28))
    dens = body.vertex_groups.new(name='density'); ln = body.vertex_groups.new(name='length')
    for v in body.data.vertices:
        p = v.co
        de = min((p - e).length for e in eyes); db = (p - beakP).length
        d = min(1.0, max(0.0, (de - .0047) / .0028)) * min(1.0, max(0.0, (db - .0055) / .004))
        dens.add([v.index], max(.02, d), 'REPLACE')
        face = min(1.0, max(0.0, (de - .004) / .012))
        ln.add([v.index], .4 + .6 * face, 'REPLACE')
    body_mat = mat(name + 'Skin', hexc('#9a6a22'), .8, sss=.1)
    body.data.materials.append(body_mat)
    down = bpy.data.materials.new(name + 'Down'); down.use_nodes = True
    nt = down.node_tree
    hb = nt.nodes['Principled BSDF']
    hi = nt.nodes.new('ShaderNodeHairInfo'); ramp = nt.nodes.new('ShaderNodeValToRGB')
    ramp.color_ramp.elements[0].color = (*hexc(root), 1); ramp.color_ramp.elements[1].color = (*hexc(tip), 1)
    mid = ramp.color_ramp.elements.new(.4); mid.color = (*hexc(color), 1)
    # per-strand brightness jitter so the down never looks like one flat colour
    jit = nt.nodes.new('ShaderNodeMath'); jit.operation = 'MULTIPLY_ADD'; jit.inputs[1].default_value = .25; jit.inputs[2].default_value = .82
    mixc = nt.nodes.new('ShaderNodeMix'); mixc.data_type = 'RGBA'; mixc.blend_type = 'MULTIPLY'; mixc.inputs['Factor'].default_value = 1.0
    nt.links.new(hi.outputs['Random'], jit.inputs[0])
    nt.links.new(hi.outputs['Intercept'], ramp.inputs['Fac'])
    nt.links.new(ramp.outputs['Color'], mixc.inputs['A'])
    comb = nt.nodes.new('ShaderNodeCombineColor'); [nt.links.new(jit.outputs[0], comb.inputs[k]) for k in range(3)]
    nt.links.new(comb.outputs['Color'], mixc.inputs['B'])
    nt.links.new(mixc.outputs['Result'], hb.inputs['Base Color'])
    hb.inputs['Roughness'].default_value = .5 - .2 * wet
    hb.inputs['Sheen Weight'].default_value = .5; hb.inputs['Sheen Tint'].default_value = (*hexc(tip), 1)
    hb.inputs['Coat Weight'].default_value = .6 * wet
    body.data.materials.append(down)
    ps_mod = body.modifiers.new('down', 'PARTICLE_SYSTEM')
    psys = body.particle_systems[0]; psys.seed = seed
    st = psys.settings
    st.type = 'HAIR'; st.use_advanced_hair = True
    st.count = 3500
    st.emit_from = 'FACE'; st.use_even_distribution = True
    # hair_length is derived from the emission velocity (4 * normal_factor), so set it last and scale the sweep with it
    L_hair = .0105 * (1 - .45 * wet)
    st.normal_factor = L_hair / 4; st.object_align_factor = (0, .3 * L_hair / 4, -.12 * L_hair / 4)
    st.hair_length = L_hair
    st.child_type = 'INTERPOLATED'; st.child_percent = 6; st.rendered_child_count = 45
    st.child_length = 1.0; st.child_length_threshold = .2
    st.clump_factor = .55 * wet - .15; st.clump_shape = .2
    st.roughness_1 = .0035 * (1 - .6 * wet); st.roughness_1_size = .6
    st.roughness_endpoint = .003 * (1 - wet); st.roughness_end_shape = 1.0
    st.roughness_2 = .006 * (1 - .7 * wet); st.roughness_2_size = .4; st.roughness_2_threshold = .3
    st.kink = 'CURL'; st.kink_amplitude = .0015; st.kink_frequency = 2.2
    st.root_radius = 1.0; st.tip_radius = .0; st.radius_scale = .00011; st.use_close_tip = True
    st.display_step = 3; st.render_step = 4
    st.material_slot = name + 'Down'
    psys.vertex_group_density = 'density'; psys.vertex_group_length = 'length'
    # eyes, beak, legs
    parts = [body]
    eye_m = mat(name + 'Eye', (.004, .004, .005), .04, coat=1.0, spec=.8)
    for e in eyes:
        bpy.ops.mesh.primitive_uv_sphere_add(radius=.0043, location=e, segments=24, ring_count=12)
        ob = bpy.context.object; ob.data.materials.append(eye_m); parts.append(ob)
        for p in ob.data.polygons: p.use_smooth = True
    beak_m = mat(name + 'Beak', hexc('#e6ad73'), .35, sss=.3)
    bpy.ops.mesh.primitive_cone_add(radius1=.0047, radius2=.0002, depth=.0095, location=beakP + beakD * .0035, vertices=24)
    bk = bpy.context.object; bk.rotation_euler = beakD.to_track_quat('Z', 'Y').to_euler(); bk.scale = (1, .78, 1)
    bk.data.materials.append(beak_m); parts.append(bk)
    for p in bk.data.polygons: p.use_smooth = True
    leg_m = mat(name + 'Leg', hexc('#eba15e'), .45, sss=.35)
    for sx in (-1, 1):
        x = sx * .011
        bpy.ops.mesh.primitive_cylinder_add(radius=.0026, depth=.026, location=(x, .002, .013), vertices=12)
        lg = bpy.context.object; lg.data.materials.append(leg_m); parts.append(lg)
        for ang, L in ((-.45, .013), (0, .015), (.45, .013), (math.pi, .006)):
            bpy.ops.mesh.primitive_cone_add(radius1=.0016, radius2=.0006, depth=L, location=(x + math.sin(ang) * L / 2, .002 - math.cos(ang) * L / 2, .0012), vertices=10)
            t = bpy.context.object; t.rotation_euler = (math.radians(90), 0, ang); t.data.materials.append(leg_m); parts.append(t)
    root = bpy.data.objects.new(name + 'Root', None); link(root)
    for p in parts: p.parent = root
    root.location = loc; root.rotation_euler = (0, 0, math.radians(rot)); root.scale = (s,) * 3
    return root, body


def egg(name='Egg', loc=(0, 0, 0), rot=(0, 0, 0), L=.057, W=.044, color='#a9683a', seed=0):
    """Hen's egg (blunt end +Z) with a speckled, slightly translucent shell."""
    bpy.ops.mesh.primitive_uv_sphere_add(radius=1, segments=48, ring_count=32)
    o = bpy.context.object; o.name = name
    for v in o.data.vertices:
        x, y, z = v.co
        k = 1 + .12 * z
        v.co = (x * W / 2 * k, y * W / 2 * k, z * L / 2)
    for p in o.data.polygons: p.use_smooth = True
    m = bpy.data.materials.new(name + 'Shell'); m.use_nodes = True
    nt = m.node_tree; b = nt.nodes['Principled BSDF']
    ns = nt.nodes.new('ShaderNodeTexNoise'); ns.noise_dimensions = '4D'; ns.inputs['Scale'].default_value = 900; ns.inputs['Detail'].default_value = 2
    ns.inputs['W'].default_value = seed
    ramp = nt.nodes.new('ShaderNodeValToRGB')
    ramp.color_ramp.elements[0].position = .52; ramp.color_ramp.elements[0].color = (*hexc(color), 1)
    ramp.color_ramp.elements[1].position = .7; ramp.color_ramp.elements[1].color = (*[c * .55 for c in hexc(color)], 1)
    nt.links.new(ns.outputs['Fac'], ramp.inputs['Fac']); nt.links.new(ramp.outputs['Color'], b.inputs['Base Color'])
    b.inputs['Roughness'].default_value = .5
    b.inputs['Subsurface Weight'].default_value = .12; b.inputs['Subsurface Radius'].default_value = (.003, .0015, .0008)
    b.inputs['Subsurface Scale'].default_value = 1.0
    bump = nt.nodes.new('ShaderNodeBump'); bump.inputs['Strength'].default_value = .15; bump.inputs['Distance'].default_value = .0003
    pores = nt.nodes.new('ShaderNodeTexNoise'); pores.inputs['Scale'].default_value = 4000
    nt.links.new(pores.outputs['Fac'], bump.inputs['Height']); nt.links.new(bump.outputs['Normal'], b.inputs['Normal'])
    o.data.materials.append(m)
    o.location = loc; o.rotation_euler = rot
    return o


def nest(name='Nest', loc=(0, 0, 0), r=.13, seed=2, n=1400):
    """Straw nest: round stalks woven in arcs around a shallow bowl, a raised rim and a few loose ends."""
    rnd = random.Random(seed)
    cu = bpy.data.curves.new(name, 'CURVE'); cu.dimensions = '3D'
    cu.bevel_depth = .0013; cu.bevel_resolution = 2; cu.use_fill_caps = True
    cx, cy, cz = loc
    def profile(rr):  # bowl floor rising into a rim mound at r, falling away outside
        if rr < r * .78: return .012 + .03 * (rr / (r * .78)) ** 2
        return .012 + .03 + .02 * math.exp(-((rr - r) / (r * .18)) ** 2) - max(0, rr - r) * .25
    for i in range(n):
        r0 = r * (.05 + 1.25 * math.sqrt(rnd.random()))
        L = rnd.uniform(.05, .13); dth = L / max(r0, .02) * rnd.choice((-1, 1))
        th0 = rnd.uniform(0, math.tau); k = 9
        sp = cu.splines.new('POLY'); sp.points.add(k - 1)
        layer = rnd.uniform(-.004, .008)
        w0 = rnd.uniform(.5, 1.5)
        for j in range(k):
            u = j / (k - 1); th = th0 + dth * u
            rr = r0 * (1 + .18 * math.sin(u * 3 + i)) + rnd.uniform(-.004, .004)
            z = profile(rr) + layer + .006 * math.sin(u * 5 + i * .7) + rnd.uniform(-.002, .002)
            sp.points[j].co = (cx + math.cos(th) * rr, cy + math.sin(th) * rr, cz + z, 1)
            sp.points[j].radius = w0 * (1 - .3 * u)
        sp.material_index = rnd.randrange(5)
    for i in range(70):  # loose stalks poking out of the rim
        th = rnd.uniform(0, math.tau); rr = r * rnd.uniform(.85, 1.15); L = rnd.uniform(.04, .09)
        sp = cu.splines.new('POLY'); sp.points.add(3)
        dx, dy = -math.sin(th + rnd.uniform(-.8, .8)), math.cos(th + rnd.uniform(-.8, .8))
        for j in range(4):
            u = j / 3
            sp.points[j].co = (cx + math.cos(th) * rr + dx * L * u + math.cos(th) * L * .3 * u, cy + math.sin(th) * rr + dy * L * u + math.sin(th) * L * .3 * u, cz + profile(rr) + .01 * u + rnd.uniform(-.004, .004), 1)
        sp.material_index = rnd.randrange(5)
    o = link(bpy.data.objects.new(name, cu))
    for col in ('#c79a45', '#a8782f', '#ddb860', '#8c6a2e', '#cfae6c'):
        m = mat(name + col, hexc(col), .38, sss=.1, spec=.7)
        cu.materials.append(m)
    # dark packed straw underneath so no ground shows through the floor
    bpy.ops.mesh.primitive_cylinder_add(radius=r * 1.05, depth=.012, location=(cx, cy, cz + .007), vertices=48)
    bpy.context.object.data.materials.append(mat(name + 'Bed', hexc('#7a5626'), .9))
    return o


def scatter(src_blend, obj_names, count, area, seed=3, scale=(.6, 1.0), z=0.0, avoid=()):
    """Instance Poly Haven plant variants around the ground (one hidden collection per variant)."""
    with bpy.data.libraries.load(str(src_blend), link=False) as (src, dst):
        dst.objects = [n for n in src.objects if any(k in n for k in obj_names)]
    variants = []
    for o in dst.objects:
        if o.type != 'MESH': continue
        coll = bpy.data.collections.new('src_' + o.name)
        o.location = (0, 0, 0); coll.objects.link(o); variants.append(coll)
    r = random.Random(seed); out = []
    x0, x1, y0, y1 = area
    for i in range(count):
        x, y = r.uniform(x0, x1), r.uniform(y0, y1)
        if any((Vector((x, y)) - Vector(a[:2])).length < a[2] for a in avoid): continue
        inst = bpy.data.objects.new(f'plant_{i}', None); inst.instance_type = 'COLLECTION'; inst.instance_collection = r.choice(variants)
        inst.location = (x, y, z); inst.rotation_euler = (0, 0, r.uniform(0, math.tau)); inst.scale = (r.uniform(*scale),) * 3
        link(inst); out.append(inst)
    return out
