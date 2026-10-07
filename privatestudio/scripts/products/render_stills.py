"""Transparent product stills for the accessible/non-WebGL presentation."""
import bpy, math
from pathlib import Path
from mathutils import Vector
root=Path(__file__).resolve().parents[2]
bpy.ops.wm.open_mainfile(filepath=str(root/'scripts/products/private-studio.blend'))
scene=bpy.context.scene
scene.render.engine='CYCLES'
scene.cycles.samples=32
scene.cycles.use_denoising=True
scene.render.resolution_x=768
scene.render.resolution_y=768
scene.render.resolution_percentage=100
scene.render.film_transparent=True
scene.render.image_settings.file_format='PNG'
scene.render.image_settings.color_mode='RGBA'
scene.world.use_nodes=True
scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.13,.13,.13,1)
scene.world.node_tree.nodes['Background'].inputs[1].default_value=.5
scene.view_settings.view_transform='AgX'
products=[o for o in scene.objects if o.type=='MESH']
for obj in products:
    obj.location.x-= {'dark-wax':-3,'sea-salt':0,'beard-oil':3}[obj.name.split(' / ')[0]]
def light(name,position,power,size,shape='DISK',size_y=None):
    data=bpy.data.lights.new(name,'AREA');data.energy=power;data.shape=shape;data.size=size
    if size_y is not None:data.size_y=size_y
    o=bpy.data.objects.new(name,data);scene.collection.objects.link(o);o.location=position
    o.rotation_euler=(Vector((0,0,0))-o.location).to_track_quat('-Z','Y').to_euler()
light('Large softbox',(-3,-4,4),500,3,'RECTANGLE',5)
light('Edge strip',(3,1,2),650,1,'RECTANGLE',4)
light('Front fill',(2,-5,1),180,2,'RECTANGLE',4)
light('Top',(0,1,5),450,3)
bpy.ops.object.camera_add()
cam=bpy.context.object;scene.camera=cam;cam.data.type='ORTHO'
for name in ['dark-wax','sea-salt','beard-oil']:
    for obj in products:obj.hide_render=not obj.name.startswith(name+' / ')
    cam.location=(.5,-7,4.2) if name=='dark-wax' else (.65,-8,1.2)
    cam.rotation_euler=(-cam.location).to_track_quat('-Z','Y').to_euler()
    cam.data.ortho_scale=3.3 if name=='dark-wax' else 3.8
    scene.render.filepath=str(root/'public/images/private-studio'/(name+'.png'))
    bpy.ops.render.render(write_still=True)
print('Transparent fallback stills complete.')
