# IFC qavatidan "arxitektura rejasi" rasmi (PNG) va aniq javob (GT JSON) yasash.
# Devorlar: z = qavat + 1,0 m tekislik bilan kesim (qora), eshik/derazalar (kulrang konturlar), tashqi o'lcham (mm yozuvi), masshtab chizig'i.
# GT: devor o'qlari (IfcWall 'Axis' + joylashuv), qalinlik, eshik/deraza markazlari va eni — hammasi mm, Y yuqoriga (IFC).
import sys, json, math, ifcopenshell, ifcopenshell.geom, numpy as np
from shapely.geometry import LineString, Polygon, MultiPolygon, box
from shapely.ops import polygonize, unary_union
from PIL import Image, ImageDraw, ImageFont

src, storey_name, out, mmpx = sys.argv[1], sys.argv[2], sys.argv[3], float(sys.argv[4])
m = ifcopenshell.open(src)
st = [s for s in m.by_type('IfcBuildingStorey') if s.Name == storey_name][0]
els = [r for rel in st.ContainsElements for r in rel.RelatedElements]
unit = 1000.0  # m -> mm (geom settings: metres)
S = ifcopenshell.geom.settings(); S.set(S.USE_WORLD_COORDS, True)
zcut = None

def shape(e):
    try: return ifcopenshell.geom.create_shape(S, e)
    except Exception: return None

def tris(sh):
    v = np.array(sh.geometry.verts).reshape(-1, 3) * unit; f = np.array(sh.geometry.faces).reshape(-1, 3); return v, f

def section(v, f, z):
    segs = []
    for t in f:
        P = v[t]; d = P[:, 2] - z; pts = []
        for i in range(3):
            a, b = P[i], P[(i + 1) % 3]; da, db = d[i], d[(i + 1) % 3]
            if (da > 0) != (db > 0): k = da / (da - db); pts.append(a + (b - a) * k)
        if len(pts) == 2: segs.append(LineString([pts[0][:2], pts[1][:2]]))
    return segs

walls = [e for e in els if e.is_a('IfcWall')]
# kesim balandligi: qavat sathi + 1,0 m (sath geometriyadan: devorlar eng past z)
zs = []
WS = []
for w in walls:
    sh = shape(w)
    if not sh: continue
    v, f = tris(sh); WS.append((w, v, f)); zs.append(v[:, 2].min())
z0 = float(np.median(zs)); zcut = z0 + 1000
wpolys = []
for w, v, f in WS:
    segs = section(v, f, zcut)
    if not segs: continue
    pg = list(polygonize(unary_union(segs)))
    if pg: wpolys.append((w, unary_union(pg)))
allw = unary_union([p for _, p in wpolys])
ops = []
for e in els:
    if not (e.is_a('IfcDoor') or e.is_a('IfcWindow')): continue
    sh = shape(e)
    if not sh: continue
    v, f = tris(sh); hull = Polygon(np.array(v[:, :2])).convex_hull if len(v) > 2 else None
    from shapely.geometry import MultiPoint
    hull = MultiPoint([tuple(p) for p in v[:, :2]]).minimum_rotated_rectangle
    c = hull.centroid; cs = list(hull.exterior.coords)[:4]; L = sorted([math.dist(cs[i], cs[(i + 1) % 4]) for i in range(2)])
    ops.append({'kind': 'door' if e.is_a('IfcDoor') else 'window', 'c': [c.x, c.y], 'w': L[1], 'zmin': float(v[:, 2].min() - z0), 'zmax': float(v[:, 2].max() - z0), 'hull': [list(p) for p in hull.exterior.coords]})

# GT devor o'qlari
def axis(w, v):
    rep = [r for r in w.Representation.Representations if r.RepresentationIdentifier == 'Axis']
    if not rep: return None
    # o'q geometriyasini joylashuv bilan: ifcopenshell.util.placement
    import ifcopenshell.util.placement as up
    Mx = up.get_local_placement(w.ObjectPlacement)
    it = rep[0].Items[0]
    pts = []
    if it.is_a('IfcPolyline'): pts = [p.Coordinates for p in it.Points]
    elif it.is_a('IfcIndexedPolyCurve'): pts = it.Points.CoordList
    elif it.is_a('IfcTrimmedCurve'): return None
    else: return None
    out = []
    for p in pts:
        q = Mx @ np.array([p[0], p[1], 0, 1.0]); out.append([q[0], q[1]])
    return out
GT = []
lu = 1.0
# loyiha uzunlik birligi (mm yoki m)
for u in m.by_type('IfcSIUnit'):
    if u.UnitType == 'LENGTHUNIT': lu = 1.0 if u.Prefix == 'MILLI' else 1000.0
for w, p in wpolys:
    ax = axis(w, None)
    if not ax: continue
    pg0 = p; kk = min([1, 0.001, 1000], key=lambda k: pg0.distance(__import__("shapely.geometry", fromlist=["Point"]).Point(ax[0][0] * k, ax[0][1] * k))); ax = [[a[0] * kk, a[1] * kk] for a in ax]
    t = p.area / max(1, LineString(ax).length)
    GT.append({'id': w.GlobalId, 'name': w.Name, 'a': ax[0], 'b': ax[-1], 'pts': ax, 't': round(t), 'cut': [list(map(list, g.exterior.coords)) for g in (p.geoms if hasattr(p, 'geoms') else [p])]})

# rasm
x0, y0, x1, y1 = allw.bounds; pad = 3000
W = int((x1 - x0 + 2 * pad) / mmpx); H = int((y1 - y0 + 2 * pad) / mmpx)
X = lambda x: (x - x0 + pad) / mmpx; Y = lambda y: (y1 + pad - y) / mmpx
img = Image.new('RGB', (W, H), 'white'); d = ImageDraw.Draw(img)
try: fnt = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', max(11, int(260 / mmpx)))
except Exception: fnt = ImageFont.load_default()
for o in ops:
    d.polygon([(X(p[0]), Y(p[1])) for p in o['hull']], outline=(90, 90, 90), fill=(235, 235, 235))
for g in (allw.geoms if hasattr(allw, 'geoms') else [allw]):
    d.polygon([(X(p[0]), Y(p[1])) for p in g.exterior.coords], fill=(20, 20, 20))
    for h in g.interiors: d.polygon([(X(p[0]), Y(p[1])) for p in h.coords], fill='white')
# eshik ochilish yoyi (taxminiy: chorak aylana eshik eni bo'yicha)
for o in ops:
    if o['kind'] != 'door': continue
    cx, cy = X(o['c'][0]), Y(o['c'][1]); r = o['w'] / mmpx
    d.arc([cx - r / 2, cy - r / 2, cx + r / 2, cy + r / 2], 0, 90, fill=(120, 120, 120))
# tashqi o'lchamlar
yb = Y(y0) + 1200 / mmpx; d.line([X(x0), yb, X(x1), yb], fill='black'); [d.line([X(x), yb - 6, X(x), yb + 6], fill='black') for x in (x0, x1)]
d.text(((X(x0) + X(x1)) / 2 - 30, yb - 8 - fnt.size), str(round(x1 - x0)), fill='black', font=fnt)
xb = X(x1) + 1200 / mmpx; d.line([xb, Y(y0), xb, Y(y1)], fill='black'); [d.line([xb - 6, Y(y), xb + 6, Y(y)], fill='black') for y in (y0, y1)]
d.text((xb + 6, (Y(y0) + Y(y1)) / 2), str(round(y1 - y0)), fill='black', font=fnt)
# masshtab chizig'i 0–5 m
sx = X(x0); sy = H - 30; d.line([sx, sy, sx + 5000 / mmpx, sy], fill='black', width=3); d.text((sx, sy - 6 - fnt.size), '0      5 m', fill='black', font=fnt)
img.save(out + '.png')
json.dump({'src': src.split('/')[-1], 'storey': storey_name, 'mmpx': mmpx, 'img': [W, H], 'tf': {'x0': x0 - pad, 'y1': y1 + pad}, 'walls': GT, 'openings': [{k: o[k] for k in ('kind', 'c', 'w')} for o in ops], 'openings_full': ops, 'n_wall_polys': len(wpolys)}, open(out + '.json', 'w'))
print(out, W, H, 'walls', len(GT), '/', len(wpolys), 'ops', len(ops), 'bbox', round(x1 - x0), round(y1 - y0))
