import bpy
vl = bpy.context.view_layer
col = bpy.data.collections["Satellite"]
vl.active_layer_collection = vl.layer_collection.children["Satellite"]
OUT = r"D:\Own Github Repos\tcantbenormal.github.io\assets\models\satellite.glb"
win = bpy.context.window_manager.windows[0]
with bpy.context.temp_override(window=win, area=None):
    bpy.ops.export_scene.gltf(
        filepath=OUT, export_format="GLB", use_active_collection=True,
        export_image_format="WEBP", export_image_quality=88, export_yup=True,
        export_apply=True, export_extras=True, export_cameras=False, export_lights=False,
    )
import os; print("glb bytes:", os.path.getsize(OUT))
