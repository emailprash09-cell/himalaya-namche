"""Blender headless: convert one FBX (with its animations) to GLB.
  blender -b --factory-startup -P fbx2glb.py -- in.fbx out.glb"""
import bpy, sys
a = sys.argv[sys.argv.index('--') + 1:]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.fbx(filepath=a[0])
bpy.ops.export_scene.gltf(filepath=a[1], export_format='GLB', export_animations=True, export_image_format='JPEG')
print('ACTIONS', [x.name for x in bpy.data.actions])
for o in bpy.context.scene.objects:
    print('OBJ', o.type, o.name, tuple(round(v, 3) for v in o.dimensions))
