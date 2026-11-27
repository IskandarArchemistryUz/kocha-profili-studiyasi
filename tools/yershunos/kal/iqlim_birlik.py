# CCKP (CMIP6 0,25°, ansambl medianasi) → har birlik uchun aholi bo'yicha tortilgan iqlim ko'rsatkichlari
# Tortish: GHS-POP 2020 1 km kataklari (odam yashaydigan joy iqlimi; cho'l va tog' tumanlarida maydon o'rtachasidan farq qiladi)
import json, sys, glob, os, numpy as np, netCDF4, rasterio, osm2geojson
from rasterio.features import rasterize
from rasterio.merge import merge
from shapely.geometry import shape
from shapely.ops import unary_union, transform as stf
from pyproj import Transformer
K, MOS, CHIQ = sys.argv[1], sys.argv[2], sys.argv[3]
VARS = ['hd35', 'hd40', 'tr', 'cdd', 'spei12', 'rx5day', 'pr', 'tas']; SEN = ['historical_1995-2014', 'ssp245_2040-2059', 'ssp585_2040-2059']
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
def vnorm(s): return s.lower().replace('viloyati', '').replace("'", '').replace('‘', '').strip()
def qoldiq(v):
    r = [x for x in reg if vnorm(x[0]) == vnorm(v)][0]
    d = r[1].difference(unary_union([g for n, g, vv in co if vv == r[0]]).buffer(1e-5))
    return sorted(getattr(d, 'geoms', [d]), key=lambda p: -p.area)[0]
M = json.load(open(MOS, encoding='utf-8'))
T = Transformer.from_crs(4326, 'ESRI:54009', always_xy=True).transform; TI = Transformer.from_crs('ESRI:54009', 4326, always_xy=True)
geoms = [stf(T, unary_union([qoldiq(n) if v == '__qoldiq__' else idx[(v, n)] for v, n in x['_az']])) for x in M]
srcs = [rasterio.open(p) for p in sorted(glob.glob(K + '/GHS_POP1K_E2020_R*_C*.tif'))]
pop, tr = merge(srcs); pop = pop[0].astype('float64'); pop[pop < 0] = 0
lab = rasterize(((g, i + 1) for i, g in enumerate(geoms)), out_shape=pop.shape, transform=tr, fill=0, dtype='int32')
rr, cc = np.nonzero(lab); xs, ys = rasterio.transform.xy(tr, rr, cc); lon, lat = TI.transform(np.array(xs), np.array(ys))
li = lab[rr, cc]; w = pop[rr, cc]; n = len(M) + 1
G = {}
for v in VARS:
    for s in SEN:
        d = netCDF4.Dataset(f'{K}/cckp/{v}_{s}.nc'); a = np.ma.filled(np.squeeze(d.variables[f'climatology-{v}-annual-mean'][:]).astype('float64'), np.nan)
        la, lo = d.variables['lat'][:], d.variables['lon'][:]
        ii = np.clip(np.rint((lat - la[0]) / (la[1] - la[0])).astype(int), 0, len(la) - 1); jj = np.clip(np.rint((lon - lo[0]) / (lo[1] - lo[0])).astype(int), 0, len(lo) - 1)
        val = a[ii, jj]; ok = np.isfinite(val)
        sw = np.bincount(li[ok], weights=(w * val)[ok], minlength=n); ww = np.bincount(li[ok], weights=w[ok], minlength=n)
        sa = np.bincount(li[ok], weights=val[ok], minlength=n); na = np.bincount(li[ok], minlength=n)
        G[(v, s)] = np.where(ww > 0, sw / np.maximum(ww, 1e-9), sa / np.maximum(na, 1))
        G[(v, s, 'maydon')] = sa / np.maximum(na, 1)
out = {}
for i, x in enumerate(M):
    out[x['rasmiy_nom']] = {v: [round(float(G[(v, s)][i + 1]), 2 if v in ('spei12', 'tas') else 1) for s in SEN] for v in VARS}
    out[x['rasmiy_nom']]['_maydon_hd35'] = round(float(G[('hd35', SEN[0], 'maydon')][i + 1]), 1)
json.dump(out, open(CHIQ, 'w', encoding='utf-8'), ensure_ascii=False)
print('birlik:', len(out), 'katak:', len(li))
for nm in ['Angren shahri', 'Chilonzor tumani', 'Termiz tumani + Termiz shahri', 'Nukus shahri', "Mo'ynoq tumani", 'Buxoro shahri', "Bo'stonliq tumani", "Farg'ona shahri"]:
    if nm in out: print(nm, {k: out[nm][k] for k in ('hd35', 'tr', 'cdd', 'spei12', 'pr', 'tas')}, 'maydon hd35', out[nm]['_maydon_hd35'])
