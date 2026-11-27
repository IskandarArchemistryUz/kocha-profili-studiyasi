# Soy bo'yi zonasi (hand_zona.tif) × GHS-POP 2020 × GHS-BUILT 1980/2000/2020 → 197 birlik
import json, sys, glob, numpy as np, rasterio, osm2geojson
from rasterio.merge import merge
from rasterio.features import rasterize
from rasterio.warp import reproject, Resampling
from shapely.geometry import shape
from shapely.ops import unary_union, transform as stf
from pyproj import Transformer
K, MOS, ZT, CHIQ = sys.argv[1:5]
def mos(pat, dt):
    s = [rasterio.open(p) for p in sorted(glob.glob(pat))]; a, tr = merge(s); return a[0].astype(dt), tr, s[0].crs
pop, tr, crs = mos(K + '/GHS_POP1K_E2020_R*_C*.tif', 'float64'); pop[pop < 0] = 0; H, W = pop.shape
B = {}
for y in (1980, 2000, 2020):
    b, _, _ = mos(K + f'/GHS_BUILT1K_E{y}_R*_C*.tif', 'float64'); b[(b > 1e6) | (b < 0)] = 0; B[y] = b / 1e6
ds = rasterio.open(ZT); zona = ds.read(1); slm = np.load(ZT.replace('.tif', '_slm.npy')).astype('float32'); ab = np.load(ZT.replace('.tif', '_ab.npy'))
def frac(mask):
    o = np.zeros((H, W), 'float32'); reproject(mask.astype('float32'), o, src_transform=ds.transform, src_crs=ds.crs, dst_transform=tr, dst_crs=crs, resampling=Resampling.average); return np.clip(np.nan_to_num(o), 0, 1)
soy = (zona == 1) | (zona == 2)
F = {'s': frac(zona == 1), 's1': frac((zona == 1) & (slm >= 1.0)), 's2': frac((zona == 1) & (slm >= 2.0)), 'kich': frac((zona == 1) & (ab <= 50)), 'd': frac(zona == 2), 'tekis': frac(slm < 0.5)}
gj = osm2geojson.json2geojson(json.load(open(K + '/osm_chegaralar_uzb.json', encoding='utf-8')))
reg, co = [], []
for f in gj['features']:
    t = f['properties'].get('tags', {})
    try: g = shape(f['geometry']).buffer(0)
    except Exception: continue
    if g.is_empty or g.geom_type not in ('Polygon', 'MultiPolygon'): continue
    (reg if t.get('admin_level') == '4' else co).append([t.get('name:uz') or t.get('name') or '?', g])
for c in co:
    p = c[1].representative_point(); c.append(next((r[0] for r in reg if r[1].contains(p)), ''))
idx = {(v, n): g for n, g, v in co}
def vn(s): return s.lower().replace('viloyati', '').replace("'", '').replace('‘', '').strip()
def qoldiq(v):
    r = [x for x in reg if vn(x[0]) == vn(v)][0]; d = r[1].difference(unary_union([g for n, g, vv in co if vv == r[0]]).buffer(1e-5)); return sorted(getattr(d, 'geoms', [d]), key=lambda p: -p.area)[0]
M = json.load(open(MOS, encoding='utf-8')); T = Transformer.from_crs(4326, 'ESRI:54009', always_xy=True)
geoms = [stf(T.transform, unary_union([qoldiq(n) if v == '__qoldiq__' else idx[(v, n)] for v, n in x['_az']])) for x in M]
lab = rasterize(((g, i + 1) for i, g in enumerate(geoms)), out_shape=(H, W), transform=tr, fill=0, dtype='int32').ravel(); n = len(M) + 1
bc = lambda w: np.bincount(lab, weights=w.ravel(), minlength=n); P0 = bc(pop); S = {k: bc(pop * F[k]) for k in F}; Q = {y: bc(B[y] * F['s']) for y in B}; QT = {y: bc(B[y]) for y in B}
out = {}; r1 = lambda v, d=1: round(float(v), d)
for i, x in enumerate(M):
    j = i + 1; p = P0[j] or 1; k26 = x['rasmiy_2026'] / p
    out[x['rasmiy_nom']] = {'a': r1(S['s'][j] / p * 100), 'a1': r1(S['s1'][j] / p * 100), 'a2': r1(S['s2'][j] / p * 100), 'ak': r1(S['kich'][j] / p * 100), 'ad': r1(S['d'][j] / p * 100), 'tekis': r1(S['tekis'][j] / p * 100, 0),
        'k': int(round(S['s'][j] * k26, -1)), 'k1': int(round(S['s1'][j] * k26, -1)), 'q80': r1(Q[1980][j], 2), 'q00': r1(Q[2000][j], 2), 'q20': r1(Q[2020][j], 2),
        'qu': r1(Q[2020][j] / QT[2020][j] * 100) if QT[2020][j] else None, 'qy': r1((Q[2020][j] - Q[2000][j]) / (QT[2020][j] - QT[2000][j]) * 100) if QT[2020][j] - QT[2000][j] > 0.05 else None}
json.dump(out, open(CHIQ, 'w', encoding='utf-8'), ensure_ascii=False)
R = np.array([x['rasmiy_2026'] for x in M], float); tot = R.sum(); g = lambda k: np.array([out[x['rasmiy_nom']][k] or 0 for x in M], float)
print('respublika: zona (tekis emas)', round((g('a') * R).sum() / tot, 1), '% =', round(g('k').sum() / 1e6, 2), 'mln · qiyalik≥1°:', round((g('a1') * R).sum() / tot, 1), '% =', round(g('k1').sum() / 1e6, 2), 'mln · ≥2°:', round((g('a2') * R).sum() / tot, 1), '% · tekislikda yashovchilar:', round((g('tekis') * R).sum() / tot), '%')
print('qurilgan maydon zonada km²:', {y: round(float(Q[y][1:].sum())) for y in B})
for nm in ('Baxmal tumani', 'Zomin tumani', "Bo'stonliq tumani", 'Urgut tumani', 'Angren shahri', 'Boysun tumani', 'Chilonzor tumani', 'Nukus shahri', 'Samarqand shahri', "Farg'ona shahri", 'Kitob tumani'): print(nm, out.get(nm))
t = sorted(out.items(), key=lambda z: -z[1]['k1']); print('eng ko\'p (≥1°):', [(k[:16], v['k1'], v['a1']) for k, v in t[:14]])
