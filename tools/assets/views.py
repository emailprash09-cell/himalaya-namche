"""Blender headless: four orthographic side views of a GLB, to find its front and up.
Views are named by the glTF axis the camera sits on (glTF is y-up; Blender -Y = glTF +Z).
Usage: blender -b --factory-startup -P views.py -- out_dir file.glb ..."""
import bpy, sys, math, mathutils, pathlib
args = sys.argv[sys.argv.index('--') + 1:]
out = pathlib.Path(args[0]); out.mkdir(parents=True, exist_ok=True)
for f in args[1:]:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=f)
    sc = bpy.context.scene
    lo = mathutils.Vector((1e9,) * 3); hi = -lo
    for o in sc.objects:
        if o.type == 'MESH':
            for v in o.bound_box:
                w = o.matrix_world @ mathutils.Vector(v); lo = mathutils.Vector(map(min, lo, w)); hi = mathutils.Vector(map(max, hi, w))
    c = (lo + hi) / 2; size = max(hi - lo)
    sc.render.engine = 'BLENDER_WORKBENCH'
    sc.display.shading.light = 'STUDIO'; sc.display.shading.color_type = 'TEXTURE'
    sc.render.resolution_x = sc.render.resolution_y = 480
    sc.render.film_transparent = False
    sc.world = bpy.data.worlds.new('w') if not sc.world else sc.world
    cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam')); sc.collection.objects.link(cam); sc.camera = cam
    cam.data.type = 'ORTHO'; cam.data.ortho_scale = size * 1.15
    name = pathlib.Path(f).stem
    # glTF axis -> Blender direction of camera from centre
    for tag, d in {'+z': (0, -1, 0), '-z': (0, 1, 0), '+x': (1, 0, 0), '-x': (-1, 0, 0), 'top': (0, 0, 1)}.items():
        d = mathutils.Vector(d); cam.location = c + d * size * 3
        cam.rotation_euler = (-d).to_track_quat('-Z', 'Y').to_euler()
        sc.render.filepath = str(out / f'{name}_{tag}.png'); bpy.ops.render.render(write_still=True)
    print('VIEWS', name, 'bounds', tuple(round(v, 3) for v in lo), tuple(round(v, 3) for v in hi))
