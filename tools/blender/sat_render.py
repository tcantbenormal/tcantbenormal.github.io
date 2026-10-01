import bpy, math
from mathutils import Vector
sc = bpy.context.scene
OUT = "//blender_preview.png"  # Blender-relative path

for n in ("Light", "SAT_Sun", "SAT_Earthshine", "SAT_Cam"):
    o = bpy.data.objects.get(n)
    if o: bpy.data.objects.remove(o, do_unlink=True)

def light(name, kind, energy, color, rot, angle=None):
    ld = bpy.data.lights.new(name, kind); ld.energy = energy; ld.color = color
    if angle is not None: ld.angle = angle
    ob = bpy.data.objects.new(name, ld); sc.collection.objects.link(ob)
    ob.rotation_euler = rot
    return ob

# Sun: hard, slightly warm, from upper-left-front. Earthshine: weak, blue, from below.
sun = light("SAT_Sun", "SUN", 9.0, (1.0, 0.96, 0.9), (0, 0, 0), angle=math.radians(0.53))
sun.rotation_euler = Vector((1.0, -0.35, 0.8)).to_track_quat("Z", "Y").to_euler()
light("SAT_Earthshine", "SUN", 0.35, (0.45, 0.65, 1.0), (math.radians(180 - 20), 0, math.radians(20)), angle=math.radians(40))

w = sc.world or bpy.data.worlds.new("World"); sc.world = w
w.use_nodes = True
nt = w.node_tree; nt.nodes.clear()
out = nt.nodes.new("ShaderNodeOutputWorld"); bg = nt.nodes.new("ShaderNodeBackground")
tc = nt.nodes.new("ShaderNodeTexCoord"); sep = nt.nodes.new("ShaderNodeSeparateXYZ")
ramp = nt.nodes.new("ShaderNodeValToRGB")
nt.links.new(tc.outputs["Generated"], sep.inputs[0])
nt.links.new(sep.outputs["Z"], ramp.inputs["Fac"])
# Generated coords in world are direction*0.5+0.5: Z=0 straight down (Earth), 0.5 horizon, 1 zenith
cr = ramp.color_ramp; cr.interpolation = "EASE"
cr.elements[0].position = 0.0;  cr.elements[0].color = (0.06, 0.13, 0.26, 1)
cr.elements[1].position = 0.40; cr.elements[1].color = (0.16, 0.28, 0.50, 1)
e = cr.elements.new(0.46); e.color = (0.0, 0.0, 0.0, 1)
e2 = cr.elements.new(1.0); e2.color = (0.0, 0.0, 0.0, 1)
nt.links.new(ramp.outputs["Color"], bg.inputs["Color"]); bg.inputs["Strength"].default_value = 0.45
nt.links.new(bg.outputs[0], out.inputs[0])
sc.render.film_transparent = True

cam_d = bpy.data.cameras.new("SAT_Cam"); cam_d.lens = 50
cam = bpy.data.objects.new("SAT_Cam", cam_d); sc.collection.objects.link(cam)
cam.location = (7.5, -6.5, 3.2)
d = Vector((0, 0, -0.1)) - cam.location
cam.rotation_euler = d.to_track_quat("-Z", "Y").to_euler()
sc.camera = cam

sc.render.engine = "CYCLES"
sc.cycles.samples = 96
sc.cycles.use_denoising = True
try:
    prefs = bpy.context.preferences.addons["cycles"].preferences
    prefs.refresh_devices()
    for t in ("OPTIX", "CUDA", "HIP", "ONEAPI"):
        if any(dv.type == t for dv in prefs.devices):
            prefs.compute_device_type = t
            for dv in prefs.devices: dv.use = True
            sc.cycles.device = "GPU"; break
except Exception as e:
    print("gpu:", e)
sc.render.resolution_x, sc.render.resolution_y = 1400, 900
sc.render.resolution_percentage = 100
sc.view_settings.view_transform = "AgX"
sc.view_settings.look = "AgX - Medium High Contrast"
sc.render.filepath = OUT
bpy.ops.render.render(write_still=True)
print("device:", sc.cycles.device, "->", OUT)
