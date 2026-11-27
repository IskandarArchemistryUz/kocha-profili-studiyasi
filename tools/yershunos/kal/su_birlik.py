# Suv tanqisligi: WRI Aqueduct 4.0 (HydroBASINS 6) → har birlik uchun aholi bo'yicha tortilgan ko'rsatkich
# bws = suv stressi (olinadigan suv / mavjud qayta tiklanadigan suv); ball 0–5; "arid and low water use" ham 5 ball oladi (Aqueduct qoidasi)
import json, sys, glob, numpy as np, rasterio, osm2geojson, geopandas as gpd
from rasterio.features import rasterize
from rasterio.merge import merge
from shapely.geometry import shape
from shapely.ops import unary_union, transform as stf
from pyproj import Transformer
K, MOS, CHIQ = sys.argv[1], sys.argv[2], sys.argv[3]
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
    r = [x for x in reg if vn(x[0]) == vn(v)][0]
    d = r[1].difference(unary_union([g for n, g, vv in co if vv == r[0]]).buffer(1e-5))
    return sorted(getattr(d, 'geoms', [d]), key=lambda p: -p.area)[0]
M = json.load(open(MOS, encoding='utf-8'))
T = Transformer.from_crs(4326, 'ESRI:54009', always_xy=True)
geoms = [stf(T.transform, unary_union([qoldiq(n) if v == '__qoldiq__' else idx[(v, n)] for v, n in x['_az']])) for x in M]
s = [rasterio.open(p) for p in sorted(glob.glob(K + '/GHS_POP1K_E2020_R*_C*.tif'))]; pop, tr = merge(s); pop = pop[0].astype('float64'); pop[pop < 0] = 0; H, W = pop.shape
lab = rasterize(((g, i + 1) for i, g in enumerate(geoms)), out_shape=(H, W), transform=tr, fill=0, dtype='int32')
b = gpd.read_parquet(K + '/aqueduct/aq_uzb_baseline_annual.parquet'); fu = gpd.read_parquet(K + '/aqueduct/aq_uzb_future_annual.parquet').drop_duplicates('pfaf_id').set_index('pfaf_id')
b = b[b.geometry.notna()].reset_index(drop=True); bm = b.geometry.to_crs('ESRI:54009')
aq = rasterize(((g, i + 1) for i, g in enumerate(bm)), out_shape=(H, W), transform=tr, fill=0, dtype='int32')
def ust(col, src=b):
    v = np.full(len(b) + 1, np.nan); a = src[col].astype('float64').values if src is b else np.array([fu[col].get(p, np.nan) if p in fu.index else np.nan for p in b['pfaf_id']], 'float64')
    a = np.where((a > 9000) | (a < -9000), np.nan, a); v[1:] = a; return v
V = {'bws': ust('bws_score'), 'bwsc': ust('bws_cat'), 'bwd': ust('bwd_score'), 'gtd': ust('gtd_score'), 'iav': ust('iav_score'), 'drr': ust('drr_score'),
     'ws50': ust('bau50_ws_x_s', fu), 'ws50c': ust('bau50_ws_x_c', fu), 'ws50p': ust('pes50_ws_x_s', fu), 'ww50': ust('bau50_ww_x_r', fu), 'ba50': ust('bau50_ba_x_r', fu)}
n = len(M) + 1; li = lab.ravel(); ai = aq.ravel(); w = pop.ravel()
def tort(v):
    x = v[ai]; ok = np.isfinite(x) & (li > 0)
    sw = np.bincount(li[ok], weights=(w * x)[ok], minlength=n); ww = np.bincount(li[ok], weights=w[ok], minlength=n)
    sa = np.bincount(li[ok], weights=x[ok], minlength=n); na = np.bincount(li[ok], minlength=n)
    return np.where(ww > 0, sw / np.maximum(ww, 1e-9), np.where(na > 0, sa / np.maximum(na, 1), np.nan))
R = {k: tort(v) for k, v in V.items()}
# aholining toifalar bo'yicha ulushi (bws_cat: -1 arid, 0..4)
cat = V['bwsc'][ai]; jam = np.bincount(li, weights=w, minlength=n)
ul = {c: np.bincount(li[cat == c], weights=w[cat == c], minlength=n) / np.maximum(jam, 1e-9) for c in (-1, 0, 1, 2, 3, 4)}
out = {}
r1 = lambda a: None if not np.isfinite(a) else round(float(a), 2)
for i, x in enumerate(M):
    j = i + 1
    out[x['rasmiy_nom']] = {'bws': r1(R['bws'][j]), 'bwd': r1(R['bwd'][j]), 'gtd': r1(R['gtd'][j]), 'iav': r1(R['iav'][j]), 'drr': r1(R['drr'][j]), 'ws50': r1(R['ws50'][j]), 'ws50p': r1(R['ws50p'][j]),
                            'juda_yuqori': round(float(ul[4][j]) * 100), 'yuqori': round(float(ul[3][j]) * 100), 'arid': round(float(ul[-1][j]) * 100)}
json.dump(out, open(CHIQ, 'w', encoding='utf-8'), ensure_ascii=False)
P = np.array([x['rasmiy_2026'] for x in M], 'float64'); pw = lambda k: float(np.nansum(np.array([out[x['rasmiy_nom']][k] or 0 for x in M]) * P) / P.sum())
print('birlik', len(out), '· bo\'sh bws:', sum(v['bws'] is None for v in out.values()))
print('aholi bo\'yicha: bws', round(pw('bws'), 2), '→ 2050', round(pw('ws50'), 2), '(pess.', round(pw('ws50p'), 2), ') · bwd', round(pw('bwd'), 2), '· gtd', round(pw('gtd'), 2))
print('"juda yuqori" stressda yashovchilar:', round(sum(out[x['rasmiy_nom']]['juda_yuqori'] * x['rasmiy_2026'] for x in M) / P.sum()), '% · "yuqori":', round(sum(out[x['rasmiy_nom']]['yuqori'] * x['rasmiy_2026'] for x in M) / P.sum()), '% · arid:', round(sum(out[x['rasmiy_nom']]['arid'] * x['rasmiy_2026'] for x in M) / P.sum()), '%')
from collections import defaultdict
vv = defaultdict(lambda: [0, 0, 0])
for x in M:
    o = out[x['rasmiy_nom']]; a = vv[x['vil']]; a[0] += (o['bws'] or 0) * x['rasmiy_2026']; a[1] += (o['ws50'] or 0) * x['rasmiy_2026']; a[2] += x['rasmiy_2026']
print('viloyat (bws → 2050):', {k: (round(a[0] / a[2], 1), round(a[1] / a[2], 1)) for k, a in vv.items()})
print('past bws:', [(k[:20], v['bws']) for k, v in sorted(out.items(), key=lambda z: z[1]['bws'] if z[1]['bws'] is not None else 9)[:8]])
