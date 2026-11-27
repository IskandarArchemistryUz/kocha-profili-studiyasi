# Daryo toshqini ta'siri: JRC CEMS-GloFAS v2.1 (~90 m; RP 10/100/500 yil) × GHS-POP 2020 × GHS-BUILT-S 1980/2000/2020 → 197 birlik
# Doimiy suv (ESA WorldCover 2021, 80-sinf) chiqarib tashlanadi. 1 km katak ichida aholi va qurilish bir tekis taqsimlangan deb olinadi.
import json, sys, glob, numpy as np, rasterio, osm2geojson
from rasterio.merge import merge
from rasterio.features import rasterize
from rasterio.warp import reproject, Resampling
from shapely.geometry import shape
from shapely.ops import unary_union, transform as stf
from pyproj import Transformer
K, MOS, CHIQ = sys.argv[1], sys.argv[2], sys.argv[3]
def mos(pat, dt):
    s = [rasterio.open(p) for p in sorted(glob.glob(pat))]; a, tr = merge(s); a = a[0].astype(dt); return a, tr, s[0].crs
pop, tr, crs = mos(K + '/GHS_POP1K_E2020_R*_C*.tif', 'float64'); pop[pop < 0] = 0; H, W = pop.shape
B = {}
for y in (1980, 2000, 2020):
    b, tb, _ = mos(K + f'/GHS_BUILT1K_E{y}_R*_C*.tif', 'float64'); assert b.shape == pop.shape and tb == tr; b[(b > 1e6) | (b < 0)] = 0; B[y] = b / 1e6   # km²
wc, wtr, wcrs = mos(K + '/worldcover/wc2021_*_x16.tif', 'uint8')
F = {}
for rp in (10, 100, 500):
    for d0, nom in ((1, ''), (5, '_05'), (10, '_1')):          # chuqurlik chegarasi: har qanday; ≥0,5 m; ≥1 m
        if nom and rp != 100: continue
        acc = np.zeros((H, W), 'float32')
        for p in sorted(glob.glob(K + f'/jrc/uzb_RP{rp}_*.tif')):
            with rasterio.open(p) as ds:
                a = ds.read(1); w = np.zeros(a.shape, 'uint8'); reproject(wc, w, src_transform=wtr, src_crs=wcrs, dst_transform=ds.transform, dst_crs=ds.crs, resampling=Resampling.nearest)
                f = ((a >= d0) & (w != 80)).astype('float32'); o = np.zeros((H, W), 'float32')
                reproject(f, o, src_transform=ds.transform, src_crs=ds.crs, dst_transform=tr, dst_crs=crs, resampling=Resampling.average, src_nodata=None, dst_nodata=None)
                acc = np.maximum(acc, np.nan_to_num(o))
        F[f'{rp}{nom}'] = np.clip(acc, 0, 1); print('RP', rp, nom, 'toshqin zonasi (to\'r bo\'yicha), km²:', round(float(F[f"{rp}{nom}"].sum())), flush=True)
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
bc = lambda w: np.bincount(lab, weights=w.ravel(), minlength=n)
P0 = bc(pop); A0 = np.bincount(lab, minlength=n).astype(float); out = {}
S = {k: bc(pop * F[k]) for k in F}; Z = {k: bc(F[k]) for k in ('10', '100', '500')}; Q = {y: bc(B[y] * F['100']) for y in B}; QT = {y: bc(B[y]) for y in B}
r1 = lambda v, d=1: round(float(v), d)
for i, x in enumerate(M):
    j = i + 1; p = P0[j] or 1; k26 = x['rasmiy_2026'] / p
    out[x['rasmiy_nom']] = {'a10': r1(S['10'][j] / p * 100), 'a100': r1(S['100'][j] / p * 100), 'a500': r1(S['500'][j] / p * 100), 'a100_05': r1(S['100_05'][j] / p * 100), 'a100_1': r1(S['100_1'][j] / p * 100),
        'k100': int(round(S['100'][j] * k26, -1)), 'k100_05': int(round(S['100_05'][j] * k26, -1)), 'z100': r1(Z['100'][j] / A0[j] * 100), 'zk100': r1(Z['100'][j], 0),
        'q80': r1(Q[1980][j], 2), 'q00': r1(Q[2000][j], 2), 'q20': r1(Q[2020][j], 2), 'qu': r1(Q[2020][j] / QT[2020][j] * 100) if QT[2020][j] else None,
        'qy': r1((Q[2020][j] - Q[2000][j]) / (QT[2020][j] - QT[2000][j]) * 100) if QT[2020][j] - QT[2000][j] > 0.05 else None}
json.dump(out, open(CHIQ, 'w', encoding='utf-8'), ensure_ascii=False)
R = np.array([x['rasmiy_2026'] for x in M], float); tot = R.sum(); g = lambda k: np.array([out[x['rasmiy_nom']][k] or 0 for x in M], float)
print('respublika: RP10', round((g('a10') * R).sum() / tot, 1), '% · RP100', round((g('a100') * R).sum() / tot, 1), '% =', round(g('k100').sum() / 1e6, 2), 'mln · ≥0,5 m', round(g('k100_05').sum() / 1e6, 2), 'mln · RP500', round((g('a500') * R).sum() / tot, 1), '%')
print('qurilgan maydon RP100 zonasida, km²:', {y: round(float(Q[y][1:].sum()), 1) for y in B}, '· jami qurilgan:', {y: round(float(QT[y][1:].sum())) for y in B})
t = sorted(out.items(), key=lambda z: -z[1]['k100']); print('eng ko\'p kishi:', [(k[:18], v['k100'], v['a100']) for k, v in t[:14]])
t = sorted(out.items(), key=lambda z: -z[1]['a100']); print('eng katta ulush:', [(k[:18], v['a100'], v['k100']) for k, v in t[:14]])
print('Baxmal:', out['Baxmal tumani'])
