# Procedural Earth-observation satellite for tcantbenormal.github.io
# Blender convention here: +Y forward, ±X solar wings, -Z nadir (Earth), -Y rear (thrusters).
import bpy, bmesh, math
import numpy as np
from mathutils import Vector, Matrix

TEX = r"D:\Own Github Repos\tcantbenormal.github.io\assets\models\tex"
import os; os.makedirs(TEX, exist_ok=True)
rng = np.random.default_rng(7)

# ---------------------------------------------------------------- reset
for c in list(bpy.data.collections):
    if c.name == "Satellite":
        for o in list(c.objects): bpy.data.objects.remove(o, do_unlink=True)
        bpy.data.collections.remove(c)
for o in list(bpy.data.objects):
    if o.name in ("Cube",) or o.name.startswith("SAT_"):
        bpy.data.objects.remove(o, do_unlink=True)
for block in (bpy.data.meshes, bpy.data.materials, bpy.data.images):
    for b in list(block):
        if b.users == 0: block.remove(b)

col = bpy.data.collections.new("Satellite")
bpy.context.scene.collection.children.link(col)

# ---------------------------------------------------------------- textures
def save_img(name, arr, non_color=False):
    h, w = arr.shape[:2]
    if arr.shape[2] == 3: arr = np.dstack([arr, np.ones((h, w))])
    img = bpy.data.images.get(name) or bpy.data.images.new(name, w, h, alpha=False)
    if img.size[0] != w: img.scale(w, h)
    img.colorspace_settings.name = "Non-Color" if non_color else "sRGB"
    img.pixels.foreach_set(np.ascontiguousarray(arr[::-1].astype(np.float32)).ravel())
    img.update()
    img.filepath_raw = os.path.join(TEX, name + ".png"); img.file_format = "PNG"
    img.save()
    img.source = "FILE"; img.reload()
    return img

def tile_noise(n, scale, seed):
    r = np.random.default_rng(seed)
    f = np.fft.fft2(r.standard_normal((n, n)))
    ky, kx = np.meshgrid(np.fft.fftfreq(n), np.fft.fftfreq(n), indexing="ij")
    k = np.sqrt(kx**2 + ky**2) * n
    f *= np.exp(-(k / scale) ** 2)
    out = np.real(np.fft.ifft2(f)); out -= out.mean(); out /= out.std() + 1e-9
    return out

def height_to_normal(h, strength):
    dx = (np.roll(h, -1, 1) - np.roll(h, 1, 1)) * 0.5 * strength
    dy = (np.roll(h, -1, 0) - np.roll(h, 1, 0)) * 0.5 * strength
    nrm = np.dstack([-dx, dy, np.ones_like(h)])
    nrm /= np.linalg.norm(nrm, axis=2, keepdims=True)
    return nrm * 0.5 + 0.5

# Crinkled MLI foil: faceted voronoi planes + ridged creases (tileable)
N = 1024
yy, xx = np.mgrid[0:N, 0:N].astype(np.float32) / N
seeds = rng.random((80, 2)).astype(np.float32)
best = np.full((N, N), 9.0, np.float32); idx = np.zeros((N, N), np.int32)
for i, (sx, sy) in enumerate(seeds):
    dx = np.abs(xx - sx); dx = np.minimum(dx, 1 - dx)
    dy = np.abs(yy - sy); dy = np.minimum(dy, 1 - dy)
    d = dx * dx + dy * dy
    m = d < best; best[m] = d[m]; idx[m] = i
tilt = rng.normal(0, 1, (len(seeds), 2)).astype(np.float32)
ox = (xx - seeds[idx, 0] + 0.5) % 1 - 0.5
oy = (yy - seeds[idx, 1] + 0.5) % 1 - 0.5
facets = (tilt[idx, 0] * ox + tilt[idx, 1] * oy) * 3.0
creases = 1 - np.abs(tile_noise(N, 14, 3)); creases2 = 1 - np.abs(tile_noise(N, 40, 4))
height = facets + creases * 0.16 + creases2 * 0.05 + tile_noise(N, 6, 5) * 0.35
save_img("mli_normal", height_to_normal(height, 5.0), non_color=True)
rough = np.clip(0.30 + 0.10 * tile_noise(N, 24, 6) + 0.06 * creases, 0.12, 0.55)
save_img("mli_orm", np.dstack([np.ones_like(rough), rough, np.ones_like(rough)]), non_color=True)

# Solar panel: 12x10 GaAs cells with cropped corners, silver gaps, busbars
W, H = 1200, 1000
yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
cw, ch = W / 12, H / 10
cx = (xx % cw) / cw; cy = (yy % ch) / ch
ci = (xx // cw).astype(int); cj = (yy // ch).astype(int)
gap = 0.02
inside = (cx > gap) & (cx < 1 - gap) & (cy > gap) & (cy < 1 - gap)
corner = (np.minimum(cx, 1 - cx) + np.minimum(cy, 1 - cy)) < 0.1
cell = inside & ~corner
var = rng.normal(0, 1, (10, 12))[cj, ci] * 0.012
base = np.zeros((H, W, 3), np.float32)
base[..., 0] = 0.016 + var; base[..., 1] = 0.035 + var; base[..., 2] = 0.11 + var * 2
fingers = (np.abs(((cy * 28) % 1) - 0.5) < 0.04) & cell
bus = ((np.abs(cx - 0.33) < 0.008) | (np.abs(cx - 0.66) < 0.008)) & cell
base[fingers] = base[fingers] * 1.6 + 0.01
base[bus] = 0.35
base[~cell] = (0.20, 0.21, 0.24)
frame = (xx < 6) | (xx > W - 7) | (yy < 6) | (yy > H - 7)
base[frame] = 0.45
save_img("solar_base", np.clip(base, 0, 1))
r = np.where(cell, 0.08, 0.38); r[bus] = 0.3
m = np.where(cell, 0.15, 0.9)
save_img("solar_orm", np.dstack([np.ones_like(r), r, m]), non_color=True)

# Radiator with optical solar reflector tiles
N2 = 512
yy, xx = np.mgrid[0:N2, 0:N2].astype(np.float32) / N2
tx, ty = (xx * 8) % 1, (yy * 8) % 1
tile = (tx > 0.04) & (tx < 0.96) & (ty > 0.04) & (ty < 0.96)
tv = rng.normal(0, 1, (8, 8))[(yy * 8).astype(int), (xx * 8).astype(int)]
b = np.where(tile, 0.82 + tv * 0.03, 0.18)
save_img("osr_base", np.dstack([b, b, b * 1.02]).clip(0, 1))
save_img("osr_orm", np.dstack([np.ones_like(b), np.where(tile, 0.04 + tv * 0.01, 0.5).clip(0.02, 1), np.where(tile, 1.0, 0.4)]), non_color=True)

# ---------------------------------------------------------------- materials
def mat(name, color=(0.8, 0.8, 0.8), metal=0.0, rough=0.5, base_img=None, orm_img=None,
        normal_img=None, normal_strength=1.0, emission=None, uv_scale=1.0):
    mt = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    mt.use_nodes = True
    nt = mt.node_tree; nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    p = nt.nodes.new("ShaderNodeBsdfPrincipled")
    nt.links.new(p.outputs[0], out.inputs[0])
    p.inputs["Base Color"].default_value = (*color, 1)
    p.inputs["Metallic"].default_value = metal
    p.inputs["Roughness"].default_value = rough
    def tex(img):
        t = nt.nodes.new("ShaderNodeTexImage"); t.image = bpy.data.images[img]
        return t
    if base_img:
        t = tex(base_img); nt.links.new(t.outputs["Color"], p.inputs["Base Color"])
    if orm_img:
        t = tex(orm_img); s = nt.nodes.new("ShaderNodeSeparateColor")
        nt.links.new(t.outputs["Color"], s.inputs[0])
        nt.links.new(s.outputs[1], p.inputs["Roughness"])
        nt.links.new(s.outputs[2], p.inputs["Metallic"])
    if normal_img:
        t = tex(normal_img); nm = nt.nodes.new("ShaderNodeNormalMap")
        nm.inputs["Strength"].default_value = normal_strength
        nt.links.new(t.outputs["Color"], nm.inputs["Color"])
        nt.links.new(nm.outputs[0], p.inputs["Normal"])
    if emission:
        p.inputs["Emission Color"].default_value = (*emission, 1)
        p.inputs["Emission Strength"].default_value = 1.0
    return mt

M = {
    "gold":   mat("MLI_Gold",   (1.0, 0.72, 0.33), 1, 0.2, None, "mli_orm", "mli_normal", 0.8),
    "silver": mat("MLI_Silver", (0.92, 0.92, 0.94), 1, 0.2, None, "mli_orm", "mli_normal", 0.8),
    "black":  mat("MLI_Black",  (0.035, 0.035, 0.04), 0.6, 0.35, None, None, "mli_normal", 0.6),
    "solar":  mat("Solar_Cells", base_img="solar_base", orm_img="solar_orm"),
    "back":   mat("Panel_Back", (0.72, 0.72, 0.70), 0.0, 0.55),
    "white":  mat("Paint_White", (0.86, 0.86, 0.84), 0.0, 0.45),
    "alu":    mat("Aluminium", (0.80, 0.80, 0.82), 1.0, 0.32),
    "anod":   mat("Anodized_Black", (0.02, 0.02, 0.022), 0.4, 0.38),
    "osr":    mat("Radiator_OSR", base_img="osr_base", orm_img="osr_orm"),
    "glass":  mat("Lens_Glass", (0.005, 0.01, 0.02), 0.0, 0.02),
    "nozzle": mat("Nozzle", (0.14, 0.12, 0.11), 1.0, 0.38),
    "nozzle_in": mat("Nozzle_Inner", (0.05, 0.045, 0.04), 1.0, 0.5),
}

# ---------------------------------------------------------------- mesh helpers
def new_obj(name, bm, material=None, parent=None, loc=(0, 0, 0)):
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    if material:
        mats = material if isinstance(material, list) else [material]
        for m_ in mats: me.materials.append(m_)
    for poly in me.polygons: poly.use_smooth = False
    ob = bpy.data.objects.new("SAT_" + name, me); col.objects.link(ob)
    ob.location = loc
    if parent: ob.parent = parent
    return ob

def box_uv(bm, scale=1.0):
    uv = bm.loops.layers.uv.verify()
    for f in bm.faces:
        n = f.normal; ax = max(range(3), key=lambda i: abs(n[i]))
        for l in f.loops:
            c = l.vert.co
            u, v = [(c.y, c.z), (c.x, c.z), (c.x, c.y)][ax]
            l[uv].uv = (u / scale, v / scale)

def make_box(sx, sy, sz, bevel=0.0, segs=2):
    bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, vec=(sx, sy, sz), verts=bm.verts)
    if bevel:
        bmesh.ops.bevel(bm, geom=bm.edges[:], offset=bevel, segments=segs, profile=0.5, affect="EDGES")
    return bm

def lathe(profile, segs=48):
    """profile: list of (r, z). Revolved around Z."""
    bm = bmesh.new()
    verts = [bm.verts.new((r, 0, z)) for r, z in profile]
    edges = [bm.edges.new((verts[i], verts[i + 1])) for i in range(len(verts) - 1)]
    bmesh.ops.spin(bm, geom=verts + edges, cent=(0, 0, 0), axis=(0, 0, 1),
                   angle=math.tau, steps=segs, use_merge=True)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return bm

def cyl(r, depth, segs=32, r2=None):
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, segments=segs, radius1=r, radius2=r2 if r2 is not None else r, depth=depth)
    return bm

def rod(a, b, r=0.012, material=None, parent=None, name="Strut"):
    a, b = Vector(a), Vector(b); d = b - a
    bm = cyl(r, d.length, 10)
    rot = d.to_track_quat("Z", "Y").to_matrix().to_4x4()
    bmesh.ops.transform(bm, matrix=Matrix.Translation((a + b) / 2) @ rot, verts=bm.verts)
    return new_obj(name, bm, material or M["alu"], parent)

def xform(bm, loc=(0, 0, 0), rot=None):
    m = Matrix.Translation(loc)
    if rot: m = m @ rot
    bmesh.ops.transform(bm, matrix=m, verts=bm.verts)
    return bm

# ---------------------------------------------------------------- root
root = bpy.data.objects.new("SAT_Root", None); col.objects.link(root)
root.empty_display_size = 0.5

BX, BY, BZ = 1.05, 1.55, 1.05   # bus dimensions

# Bus: gold foil sides, silver rear, black panels
bm = make_box(BX, BY, BZ, bevel=0.035, segs=3)
box_uv(bm, 1.6)
mi = {"gold": 0, "silver": 1, "black": 2}
for f in bm.faces:
    n = f.normal
    f.material_index = 1 if n.y < -0.9 else (2 if n.z < -0.9 else 0)
bus = new_obj("Bus", bm, [M["gold"], M["silver"], M["black"]], root)

# Frame rails along bus edges (aluminium), make the foil read as wrapped panels
for sx in (-1, 1):
    for sz in (-1, 1):
        rod((sx * BX / 2, -BY / 2 + 0.02, sz * BZ / 2), (sx * BX / 2, BY / 2 - 0.02, sz * BZ / 2), 0.022, M["alu"], root, "Rail")

# Zenith radiator (+Z) with OSR tiles
bm = make_box(BX * 0.86, BY * 0.86, 0.025, bevel=0.006, segs=1)
uv = bm.loops.layers.uv.verify()
for f in bm.faces:
    for l in f.loops:
        c = l.vert.co; l[uv].uv = (c.x / (BX * 0.86) + 0.5, c.y / (BY * 0.86) * 1.5 + 0.5)
new_obj("Radiator", bm, M["osr"], root, (0, 0, BZ / 2 + 0.012))

# ---------------------------------------------------------------- solar wings
PW, PH, PT, GAP = 1.25, 1.0, 0.03, 0.05
def build_wing(side):
    s = 1 if side == "R" else -1
    pivot = bpy.data.objects.new(f"SAT_Wing_{side}", None); col.objects.link(pivot)
    pivot.parent = root; pivot.location = (s * (BX / 2 + 0.02), 0, 0)
    pivot.empty_display_size = 0.3
    # Drive shaft + yoke
    rod((0, 0, 0), (s * 0.28, 0, 0), 0.035, M["alu"], pivot, "Shaft")
    x0 = 0.42
    for dy in (-PH / 2 + 0.06, PH / 2 - 0.06):
        rod((s * 0.28, 0, 0), (s * x0, dy, 0), 0.016, M["alu"], pivot, "Yoke")
    rod((s * x0, -PH / 2 + 0.06, 0), (s * x0, PH / 2 - 0.06, 0), 0.016, M["alu"], pivot, "Yoke")
    for i in range(2):
        cx = s * (x0 + 0.03 + PW / 2 + i * (PW + GAP))
        bm = make_box(PW, PH, PT)
        uvl = bm.loops.layers.uv.verify()
        for f in bm.faces:
            f.material_index = 0 if f.normal.z > 0.9 else 1
            for l in f.loops:
                c = l.vert.co
                l[uvl].uv = (c.x / PW + 0.5, c.y / PH + 0.5)
        new_obj(f"Panel_{side}{i}", bm, [M["solar"], M["back"]], pivot, (cx, 0, 0))
        if i == 0: continue
        # hinge brackets between panels
        hx = s * (x0 + 0.03 + i * (PW + GAP) - GAP / 2)
        for dy in (-0.32, 0.32):
            bm = make_box(GAP + 0.04, 0.07, 0.045, 0.006, 1)
            new_obj("Hinge", bm, M["alu"], pivot, (hx, dy, 0))
    return pivot
build_wing("R"); build_wing("L")

# ---------------------------------------------------------------- high gain antenna (front, top)
mast_base = Vector((0.0, BY / 2 - 0.15, BZ / 2 + 0.03))
mast_top = Vector((0.0, BY / 2 + 0.35, BZ / 2 + 0.55))
rod(mast_base, mast_top, 0.03, M["alu"], root, "Mast")
f = 0.28
prof = [(r, r * r / (4 * f)) for r in np.linspace(0.0, 0.46, 14)]
bm = lathe(prof, 48)
bmesh.ops.solidify(bm, geom=bm.faces[:], thickness=0.015)
dish_rot = Vector((0, 0.55, 1)).normalized().to_track_quat("Z", "Y").to_matrix().to_4x4()
xform(bm, mast_top, dish_rot)
new_obj("Dish", bm, M["white"], root)
focus = mast_top + (dish_rot.to_3x3() @ Vector((0, 0, f)))
bm = cyl(0.035, 0.12, 16); xform(bm, focus, dish_rot)
new_obj("Feed", bm, M["anod"], root)
for k in range(3):
    a = k * math.tau / 3
    rim = mast_top + dish_rot.to_3x3() @ Vector((math.cos(a) * 0.44, math.sin(a) * 0.44, 0.44 ** 2 / (4 * f)))
    rod(rim, focus, 0.007, M["white"], root, "FeedStrut")

# ---------------------------------------------------------------- Earth-observation telescope (nadir)
tz = -BZ / 2
bm = make_box(0.62, 0.62, 0.06, 0.01, 1); new_obj("InstrMount", bm, M["alu"], root, (0, 0.12, tz - 0.03))
bm = cyl(0.25, 0.5, 48); new_obj("Telescope", bm, M["anod"], root, (0, 0.12, tz - 0.31))
bm = cyl(0.275, 0.05, 48); new_obj("TelRing", bm, M["alu"], root, (0, 0.12, tz - 0.545))
bm = cyl(0.2, 0.012, 48); new_obj("Lens", bm, M["glass"], root, (0, 0.12, tz - 0.565))
# side sunshade
bm = make_box(0.62, 0.02, 0.45, 0.005, 1); new_obj("Sunshade", bm, M["white"], root, (0, 0.12 + 0.33, tz - 0.27))
# secondary sensor
bm = cyl(0.09, 0.22, 32); new_obj("Sensor2", bm, M["anod"], root, (0.32, -0.45, tz - 0.11))
bm = cyl(0.07, 0.01, 32); new_obj("Sensor2Lens", bm, M["glass"], root, (0.32, -0.45, tz - 0.225))

# ---------------------------------------------------------------- star trackers (front face, angled)
for sx in (-1, 1):
    rot = Vector((sx * 0.6, 1, 0.5)).normalized().to_track_quat("Z", "Y").to_matrix().to_4x4()
    base = Vector((sx * 0.3, BY / 2, 0.15))
    bm = cyl(0.07, 0.2, 24); xform(bm, base + rot.to_3x3() @ Vector((0, 0, 0.1)), rot)
    new_obj("StarTracker", bm, M["anod"], root)
    bm = cyl(0.11, 0.14, 24, r2=0.08); xform(bm, base + rot.to_3x3() @ Vector((0, 0, 0.26)), rot)
    new_obj("StarBaffle", bm, M["alu"], root)

# ---------------------------------------------------------------- thrusters (rear, -Y)
def bell(exit_r, length, throat_r):
    prof = []
    for t in np.linspace(0, 1, 16):
        r = throat_r + (exit_r - throat_r) * (t ** 0.6)
        prof.append((r, -t * length))
    return prof

ry = -BY / 2
down = Matrix.Rotation(math.radians(-90), 4, "X")  # local -Z -> world -Y
exhausts = []
def thruster(name, pos, exit_r, length):
    prof = bell(exit_r, length, exit_r * 0.38)
    bm = lathe(prof, 40)
    bmesh.ops.solidify(bm, geom=bm.faces[:], thickness=0.012)
    for fc in bm.faces: fc.material_index = 0
    xform(bm, pos, down)
    ob = new_obj(name, bm, [M["nozzle"]], root)
    bm = cyl(exit_r * 0.6, 0.06, 24); xform(bm, Vector(pos) + Vector((0, 0.03, 0)), down)  # housing
    new_obj(name + "Housing", bm, M["nozzle_in"], root)
    e = bpy.data.objects.new("SAT_Exhaust_" + name, None); col.objects.link(e)
    e.parent = root; e.location = Vector(pos) + Vector((0, -length, 0)); e.empty_display_size = exit_r
    e["exit_radius"] = exit_r
    exhausts.append(e)

bm = make_box(0.5, 0.06, 0.5, 0.01, 1); new_obj("EngineMount", bm, M["alu"], root, (0, ry - 0.03, 0))
thruster("Main", (0, ry - 0.06, 0), 0.2, 0.42)
for i, (sx, sz) in enumerate(((-1, -1), (-1, 1), (1, -1), (1, 1))):
    thruster(f"RCS{i}", (sx * 0.4, ry - 0.01, sz * 0.4), 0.055, 0.12)

# ---------------------------------------------------------------- whip antennas + misc
for sx in (-1, 1):
    rod((sx * 0.4, -0.5, -BZ / 2), (sx * 0.55, -0.62, -BZ / 2 - 0.7), 0.008, M["alu"], root, "Whip")
bm = make_box(0.3, 0.3, 0.05, 0.008, 1); new_obj("Box_Avionics", bm, M["white"], root, (-0.25, -0.4, BZ / 2 + 0.03))

print("objects:", len(col.objects), "tris:", sum(len(o.data.loop_triangles) if o.type == 'MESH' and (o.data.calc_loop_triangles() or True) else 0 for o in col.objects))
