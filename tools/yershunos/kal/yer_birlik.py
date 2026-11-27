# Ekin yeri va qurilish: har birlik uchun qurilgan maydon (GHS-BUILT-S 1 km, 1980/2000/2020) va yer qoplami (ESA WorldCover 2021, ~160 m ko'rinish)
# Baho: 2000–2020 da yangi qurilgan maydon × shu 1 km katakdagi qurilmagan yerning ekin ulushi (2021) = ekin yeridan olingan deb taxmin qilingan maydon
import json, sys, glob, numpy as np, rasterio, osm2geojson
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
def moz(y):
    s = [rasterio.open(p) for p in sorted(glob.glob(f'{K}/GHS_BUILT1K_E{y}_R*_C*.tif'))]; a, tr = merge(s); a = a[0].astype('float64'); a[a < 0] = 0; a[a > 1.2e6] = 0; return a, tr
B80, tr = moz(1980); B00, _ = moz(2000); B20, _ = moz(2020); H, W = B20.shape
lab = rasterize(((g, i + 1) for i, g in enumerate(geoms)), out_shape=(H, W), transform=tr, fill=0, dtype='int32')
# WorldCover → 1 km katakdagi sinf maydonlari (cos(lat) bilan tortilgan piksel soni)
SN = {'ekin': [40], 'qurilgan': [50], 'daraxt': [10], 'ot': [20, 30], 'yalang': [60], 'suv': [80, 90]}
cnt = {k: np.zeros(H * W) for k in SN}; jami = np.zeros(H * W)
for p in sorted(glob.glob(K + '/worldcover/wc2021_*_x16.tif')):
    with rasterio.open(p) as ds:
        a = ds.read(1); t = ds.transform; h, w = a.shape
    lon = t.c + (np.arange(w) + 0.5) * t.a; lat = t.f + (np.arange(h) + 0.5) * t.e
    LO, LA = np.meshgrid(lon, lat); x, y = T.transform(LO.ravel(), LA.ravel())
    c = np.floor((x - tr.c) / tr.a).astype('int64'); r = np.floor((y - tr.f) / tr.e).astype('int64'); ok = (c >= 0) & (c < W) & (r >= 0) & (r < H) & (a.ravel() > 0)
    ii = (r * W + c)[ok]; wt = np.cos(np.radians(LA.ravel()))[ok]; av = a.ravel()[ok]
    jami += np.bincount(ii, weights=wt, minlength=H * W)
    for k, cl in SN.items():
        m = np.isin(av, cl); cnt[k] += np.bincount(ii[m], weights=wt[m], minlength=H * W)
jm = np.maximum(jami, 1e-9); F = {k: (v / jm).reshape(H, W) for k, v in cnt.items()}; bor = (jami > 0).reshape(H, W)
ekin_q = np.where(1 - F['qurilgan'] > 0.02, F['ekin'] / np.maximum(1 - F['qurilgan'], 1e-9), 0)      # qurilmagan yerning ekin ulushi
dB = np.maximum(B20 - B00, 0) / 1e6; olingan = dB * np.clip(ekin_q, 0, 1)                           # km²
n = len(M) + 1; li = lab.ravel()
bc = lambda a: np.bincount(li, weights=a.ravel(), minlength=n)
S = {'b80': bc(B80 / 1e6), 'b00': bc(B00 / 1e6), 'b20': bc(B20 / 1e6), 'yangi': bc(dB), 'olingan': bc(olingan), 'ekin': bc(F['ekin'] * bor), 'kat': bc(bor.astype(float)),
     'wq': bc(F['qurilgan'] * bor), 'yalang': bc(F['yalang'] * bor), 'ot': bc(F['ot'] * bor)}
out = {}
for i, x in enumerate(M):
    j = i + 1; e = S['ekin'][j]; ol = S['olingan'][j]; yg = S['yangi'][j]
    out[x['rasmiy_nom']] = {'b80': round(S['b80'][j], 2), 'b00': round(S['b00'][j], 2), 'b20': round(S['b20'][j], 2), 'yangi': round(yg, 2), 'olingan': round(ol, 2),
        'olingan_ulush': round(ol / yg * 100) if yg > 0.05 else None, 'ekin': round(e, 1), 'ekin_ulush': round(e / max(S['kat'][j], 1) * 100, 1),
        'yoqotish': round(ol / (e + ol) * 100, 2) if e + ol > 1 else None, 'ekin_kishi': round(e * 1e6 / x['rasmiy_2026']) if x['rasmiy_2026'] else None,
        'qur_kishi': round(S['b20'][j] * 1e6 / x['rasmiy_2020']) if x['rasmiy_2020'] else None, 'wc_qurilgan': round(S['wq'][j], 1)}
json.dump(out, open(CHIQ, 'w', encoding='utf-8'), ensure_ascii=False)
tot = lambda k: sum(v[k] or 0 for v in out.values())
print('birlik', len(out), '| qurilgan km²: 1980', round(tot('b80')), '2000', round(tot('b00')), '2020', round(tot('b20')), '| WorldCover qurilgan', round(tot('wc_qurilgan')), '| ekin 2021', round(tot('ekin')), 'km²')
print('yangi qurilgan 2000–2020:', round(tot('yangi')), 'km² · shundan ekin yeridan (baho):', round(tot('olingan')), 'km² (', round(tot('olingan') / tot('yangi') * 100), '%) · ekin yerining', round(tot('olingan') / (tot('ekin') + tot('olingan')) * 100, 2), '%')
q = sorted([(k, v) for k, v in out.items() if v['yoqotish'] is not None and v['ekin'] > 20], key=lambda z: -z[1]['yoqotish'])
print('eng ko\'p yo\'qotish (%):'); [print('  ', k[:34], v['yoqotish'], '% ·', v['olingan'], 'km² · ekin', v['ekin'], '· yangi qurilgan', v['yangi']) for k, v in q[:14]]
q2 = sorted(out.items(), key=lambda z: -(z[1]['olingan'] or 0)); print('mutlaq (km²):', [(k[:22], v['olingan']) for k, v in q2[:10]])
