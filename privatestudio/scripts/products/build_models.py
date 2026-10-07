"""Rebuild the three reference packages. Run with Blender --background --python.

Real revolved geometry and vector print: no baked photograph or billboard.
Blender Z-up becomes glTF Y-up; labels face glTF +Z. Units are display units.
"""
import bpy
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'public/models/private-studio'
OUT.mkdir(parents=True, exist_ok=True)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)

def material(name, color, roughness, metallic=0, transmission=0):
    m = bpy.data.materials.new(name)
    m.diffuse_color = (*color, 1)
    m.use_nodes = True
    p = m.node_tree.nodes.get('Principled BSDF')
    p.inputs['Base Color'].default_value = (*color, 1)
    p.inputs['Roughness'].default_value = roughness
    p.inputs['Metallic'].default_value = metallic
    p.inputs['Coat Weight'].default_value = .28 if not transmission else 0
    p.inputs['Coat Roughness'].default_value = .16
    p.inputs['Transmission Weight'].default_value = transmission
    p.inputs['IOR'].default_value = 1.46
    return m

black = material('Obsidian lacquer', (.012, .013, .014), .23, .12)
lid = material('Satin black lid', (.019, .020, .021), .3, .15)
pump = material('Black pump', (.009, .010, .011), .28)
ink = material('Warm white screen print', (.94, .93, .89), .65)
glass = material('Clear protective cap', (.95, .98, 1), .09, 0, 1)
rim = material('Polished clear rim', (.34, .36, .38), .18, .45)
sans = bpy.data.fonts.load('/System/Library/Fonts/Supplemental/Arial.ttf')
serif = bpy.data.fonts.load('/System/Library/Fonts/Supplemental/Times New Roman.ttf')

def lathe(name, profile, mat, n=128):
    verts = [(r*math.sin(a*2*math.pi/n), -r*math.cos(a*2*math.pi/n), z)
             for r,z in profile for a in range(n)]
    faces = []
    for j in range(len(profile)-1):
        for i in range(n):
            a=j*n+i; b=j*n+(i+1)%n
            faces.append((a,b,b+n,a+n))
    mesh=bpy.data.meshes.new(name)
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    obj=bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(mat)
    for p in mesh.polygons: p.use_smooth=True
    return obj

def cylinder(name, radius, bottom, top, mat, bevel=.025):
    b=bevel
    return lathe(name, [(0,bottom),(radius-b,bottom),(radius-.3*b,bottom+.3*b),
        (radius,bottom+b),(radius,top-b),(radius-.3*b,top-.3*b),
        (radius-b,top),(0,top)], mat)

def text(body, size, center, height, radius=None, top=None, font=sans, spacing=1.15):
    curve=bpy.data.curves.new('Print '+body,'FONT')
    curve.body=body; curve.align_x='CENTER'; curve.size=size
    curve.font=font; curve.space_character=spacing; curve.resolution_u=6
    obj=bpy.data.objects.new('Print '+body,curve)
    bpy.context.collection.objects.link(obj)
    bpy.context.view_layer.objects.active=obj
    obj.select_set(True)
    bpy.ops.object.convert(target='MESH')
    for v in obj.data.vertices:
        x=v.co.x+center; y=v.co.y
        if radius is not None:
            a=x/radius
            v.co=(radius*math.sin(a),-radius*math.cos(a),height+y)
        else:
            v.co=(x,height+y,top)
    obj.data.materials.append(ink)
    obj.select_set(False)
    return obj

def line(width, z, r):
    obj=lathe('Printed hairline',[(r,z),(r,z+.005)],ink,n=128)
    # Keep only the central arc of the print, never a white ring around the bottle.
    keep=width/r/2
    for v in obj.data.vertices:
        a=math.atan2(v.co.x,-v.co.y)
        a=max(-keep,min(keep,a))
        v.co.x=r*math.sin(a); v.co.y=-r*math.cos(a)

def monogram(height, size, radius=None, top=None):
    text('P',size,-size*.14,height,radius,top,serif,1)
    text('S',size,size*.14,height-size*.17,radius,top,serif,1)

def wax():
    cylinder('Jar',1.16,0,.76,black,.09)
    cylinder('Neck seam',1.145,.735,.81,pump,.008)
    cylinder('Lid',1.18,.80,1.08,lid,.035)
    cylinder('Inset lid face',1.145,1.076,1.087,lid,.009)
    monogram(.40,.51,top=1.091)
    text('PRIVATE STUDIO',.135,0,.18,top=1.092,spacing=1.4)
    text('— GROOMING ESSENTIALS —',.076,0,.005,top=1.092)
    text('DARK WAX',.19,0,-.26,top=1.092,spacing=1.3)
    text('100 ml',.095,0,-.54,top=1.092,spacing=1)
    text('— GROOMING ESSENTIALS —',.071,0,.48,1.163)
    text('DARK WAX',.17,0,.255,1.163,spacing=1.2)
    text('100 ml',.079,0,.105,1.163,spacing=1)
    return 1.09

def bottle(oil=False):
    lathe('Bottle',[(0,0),(.37,0),(.46,.025),(.495,.08),(.50,.14),(.50,2.16),
        (.495,2.22),(.48,2.28),(.44,2.32),(.35,2.35),(.28,2.37),(.28,2.43),(0,2.43)],black)
    cylinder('Pump collar',.295,2.34,2.74,pump,.022)
    cylinder('Collar seam',.308,2.36,2.395,black,.009)
    cylinder('Pump stem',.122,2.7,3.02,pump,.008)
    if oil:
        cylinder('Dispenser head',.192,2.98,3.14,pump,.025)
        bpy.ops.mesh.primitive_cube_add(size=1,location=(0,-.18,3.07))
        obj=bpy.context.object; obj.name='Oil dispenser spout'
        obj.dimensions=(.22,.38,.12)
        bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
        mod=obj.modifiers.new('Rounded edges','BEVEL'); mod.width=.025; mod.segments=3
        bpy.ops.object.modifier_apply(modifier=mod.name)
        obj.data.materials.append(pump)
        obj.select_set(False)
    else:
        cylinder('Atomizer',.174,2.89,3.14,pump,.022)
        bpy.ops.mesh.primitive_uv_sphere_add(segments=24,ring_count=12,radius=.046,location=(0,-.173,3.045))
        obj=bpy.context.object; obj.name='Spray nozzle'; obj.scale=(1,.20,1)
        obj.data.materials.append(rim); obj.select_set(False)
        bpy.ops.mesh.primitive_uv_sphere_add(segments=16,ring_count=8,radius=.010,location=(0,-.184,3.045))
        obj=bpy.context.object; obj.name='Nozzle aperture'; obj.data.materials.append(pump); obj.select_set(False)
    lathe('Transparent cap',[(.337,2.35),(.343,2.37),(.343,3.23),(.34,3.25),(.325,3.265),
        (0,3.265),(0,3.247),(.317,3.247),(.324,3.233),(.324,2.37),(.337,2.35)],glass)
    lathe('Cap lower rim',[(.337,2.36),(.345,2.365),(.345,2.38),(.337,2.385)],rim)
    lathe('Cap upper rim',[(.333,3.24),(.342,3.245),(.34,3.254),(.332,3.257)],glass)
    r=.502
    text('MEN CARE',.071,0,1.99,r,spacing=1.45)
    if not oil: line(.57,1.9,r)
    monogram(1.48,.43,r)
    text('PRIVATE STUDIO',.069,0,1.22,r,spacing=1.2)
    text('GROOMING ESSENTIALS',.045,0,1.11,r,spacing=1.15)
    line(.28 if oil else .57,.985,r)
    text('BEARD OIL' if oil else 'SEA SALT',.087,0,.77,r,spacing=1.15)
    text('100 ml',.069,0,.22,r,spacing=1)
    return 3.265

for name,build in [('dark-wax',wax),('sea-salt',bottle),('beard-oil',lambda:bottle(True))]:
    previous=set(bpy.data.objects)
    h=build()
    objects=[o for o in bpy.data.objects if o not in previous]
    # Merge by material: crisp labels cost one draw call, not one per glyph.
    for mat in [black,lid,pump,ink,glass,rim]:
        parts=[o for o in bpy.data.objects if o not in previous and o.data.materials and o.data.materials[0]==mat]
        if not parts: continue
        bpy.ops.object.select_all(action='DESELECT')
        for o in parts: o.select_set(True)
        bpy.context.view_layer.objects.active=parts[0]
        bpy.ops.object.join()
        parts[0].name=name+' / '+mat.name
    objects=[o for o in bpy.data.objects if o not in previous]
    bpy.ops.object.select_all(action='DESELECT')
    for obj in objects:
        obj.location.z-=h/2
        obj.select_set(True)
    bpy.ops.export_scene.gltf(filepath=str(OUT/(name+'.glb')),export_format='GLB',
        use_selection=True,export_animations=False,export_cameras=False,export_lights=False)
    for obj in objects: obj.location.x += {'dark-wax':-3,'sea-salt':0,'beard-oil':3}[name]

bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'scripts/products/private-studio.blend'))
print('PRIVATE STUDIO: all three models exported.')
