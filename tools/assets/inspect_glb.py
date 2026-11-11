"""Blender headless: print what is inside each GLB (objects, triangles, bounds, materials, images).
Usage: blender -b --factory-startup -P inspect_glb.py -- file.glb ..."""
import bpy, sys, mathutils
args = sys.argv[sys.argv.index('--') + 1:]
for f in args:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=f)
    print('=====', f)
    lo = mathutils.Vector((1e9,) * 3); hi = -lo
    for o in bpy.context.scene.objects:
        line = f'  {o.type:6} {o.name!r} parent={o.parent.name if o.parent else None} loc={tuple(round(v,3) for v in o.location)} rot={tuple(round(v,3) for v in o.rotation_euler)} scale={tuple(round(v,3) for v in o.scale)}'
        if o.type == 'MESH':
            me = o.data; tris = sum(len(p.vertices) - 2 for p in me.polygons)
            line += f' verts={len(me.vertices)} tris={tris} uvs={[u.name for u in me.uv_layers]} mats={[m.name for m in me.materials if m]}'
            for v in o.bound_box:
                w = o.matrix_world @ mathutils.Vector(v); lo = mathutils.Vector(map(min, lo, w)); hi = mathutils.Vector(map(max, hi, w))
        print(line)
    print('  world bounds (blender z-up):', tuple(round(v, 3) for v in lo), tuple(round(v, 3) for v in hi), 'size', tuple(round(b - a, 3) for a, b in zip(lo, hi)))
    for m in bpy.data.materials:
        links = []
        if m.use_nodes:
            for n in m.node_tree.nodes:
                if n.type == 'TEX_IMAGE' and n.image:
                    to = [l.to_socket.name + '@' + l.to_node.name for l in n.outputs[0].links]
                    links.append(f'{n.image.name} {tuple(n.image.size)} -> {to}')
            bs = m.node_tree.nodes.get('Principled BSDF')
            if bs: links.append(f'base={tuple(round(x,2) for x in bs.inputs["Base Color"].default_value)} metal={bs.inputs["Metallic"].default_value:.2f} rough={bs.inputs["Roughness"].default_value:.2f}')
        print('  material', m.name, links)
