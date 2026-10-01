# Satellite model

`assets/models/satellite.glb` is generated procedurally in Blender 5.2 by these scripts.

1. Open Blender with the MCP add-on enabled (it listens on `127.0.0.1:9876`).
2. `python bl.py sat_build.py` builds the satellite and its textures in the open scene.
3. `python bl.py sat_export.py` writes `assets/models/satellite.glb` with WebP textures embedded.
4. Optional: `python bl.py sat_render.py` renders a Cycles preview with space lighting.

`sat_build.py` writes intermediate PNG textures to `assets/models/tex/`, which is git-ignored.

The website relies on these node names: `SAT_Wing_L`, `SAT_Wing_R`, and `SAT_Exhaust_*` with an `exit_radius` extra.
