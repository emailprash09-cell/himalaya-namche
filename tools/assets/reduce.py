"""Blender headless: reduce one generated GLB to a web-sized one at its real size.

Method from the monk trial (docs/FABLE_EXPORT.md): weld duplicate vertices first, then a plain
collapse decimate. Then scale to the real size, put the origin at the base centre on y = 0, shrink
the texture and export a GLB (JPEG textures; gltf-transform compresses it afterwards).

  blender -b --factory-startup -P reduce.py -- in.glb out.glb TRIS FIT SIZE TEX [SPIRE]
    FIT   height | footprint   (SIZE is the real height, or the longest horizontal side, in metres)
    TEX   texture edge in pixels (2048)
    SPIRE optional real total height: everything above the narrow spire start is squashed to fit
Prints one JSON line starting with RESULT.
"""
import bpy, bmesh, sys, json, math, mathutils

a = sys.argv[sys.argv.index('--') + 1:]
src, dst, tris, fit, size, tex = a[0], a[1], int(a[2]), a[3], float(a[4]), int(a[5])
spire = float(a[6].split('@')[0]) if len(a) > 6 else None
spireFrom = float(a[6].split('@')[1]) if len(a) > 6 and '@' in a[6] else None  # fraction of height

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=src)
meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH']
bpy.ops.object.select_all(action='DESELECT')
for o in meshes:
    o.select_set(True)
bpy.context.view_layer.objects.active = meshes[0]
if len(meshes) > 1:
    bpy.ops.object.join()
ob = bpy.context.view_layer.objects.active
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
me = ob.data
before = sum(len(p.vertices) - 2 for p in me.polygons)

# Weld: generated meshes store split vertices along UV seams; decimating them unwelded tears the mesh.
bm = bmesh.new(); bm.from_mesh(me)
bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5)
bm.to_mesh(me); bm.free()

mod = ob.modifiers.new('dec', 'DECIMATE')
mod.decimate_type = 'COLLAPSE'
mod.ratio = min(1.0, tris / max(1, before))
mod.use_collapse_triangulate = True
bpy.ops.object.modifier_apply(modifier='dec')

# Blender is z-up after import (glTF y-up becomes Blender z-up).
def bounds():
    vs = [ob.matrix_world @ v.co for v in me.vertices]
    lo = mathutils.Vector((min(v.x for v in vs), min(v.y for v in vs), min(v.z for v in vs)))
    hi = mathutils.Vector((max(v.x for v in vs), max(v.y for v in vs), max(v.z for v in vs)))
    return lo, hi

lo, hi = bounds()
ext = hi - lo
k = size / (ext.z if fit == 'height' else max(ext.x, ext.y))
for v in me.vertices:
    v.co = (v.co - mathutils.Vector(((lo.x + hi.x) / 2, (lo.y + hi.y) / 2, lo.z))) * k

if spire:
    # Find where the spire starts: the lowest height above mid-height where the radius drops under 22 %
    # of the base radius, then squash everything above it so the total height is `spire`.
    lo, hi = bounds(); H = hi.z; R = max(hi.x - lo.x, hi.y - lo.y) / 2
    bins = 60; rad = [0.0] * bins
    for v in me.vertices:
        i = min(bins - 1, int(v.co.z / H * bins)); rad[i] = max(rad[i], math.hypot(v.co.x, v.co.y))
    z0 = spireFrom * H if spireFrom else None
    for i in ([] if z0 else range(bins // 3, bins)):
        if rad[i] < 0.22 * R:
            z0 = i / bins * H; break
    if z0 and spire < H:
        f = (spire - z0) / (H - z0)
        for v in me.vertices:
            if v.co.z > z0:
                v.co.z = z0 + (v.co.z - z0) * f
    print('SPIRE start', z0, 'height', H, '->', spire)

for img in bpy.data.images:
    if img.size[0] > tex:
        img.scale(tex, tex)

lo, hi = bounds()
after = sum(len(p.vertices) - 2 for p in me.polygons)
bpy.ops.export_scene.gltf(filepath=dst, export_format='GLB', export_image_format='JPEG',
                          export_jpeg_quality=88, use_selection=False)
print('RESULT ' + json.dumps({'src': src, 'dst': dst, 'trisBefore': before, 'tris': after,
      'sizeM': [round(hi.x - lo.x, 3), round(hi.z - lo.z, 3), round(hi.y - lo.y, 3)]}))
